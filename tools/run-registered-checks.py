#!/usr/bin/env python3
import concurrent.futures, json, os, pathlib, subprocess, sys, tempfile, time

WORKFLOW = "checks.yml"

# The kit's ratified degrade exit (policy/kit/, kogaki#1141). Named here
# rather than spelled inline at the grading site, so the one number this
# file borrows from the kit's contract has one site.
KIT_DEGRADE_EXIT = 11

registry = json.loads(pathlib.Path("checks/registry.json").read_text())
entries = registry["checks"]
if not entries:
    print("ok: no registered checks (registry empty)")
    sys.exit(0)

# READ AND POPPED HERE, BEFORE ANY MEMBER RUNS (PR #1192 round 1 finding 2).
# `checks/check-ci-shape.sh` runs this runner nested inside a sandbox, and an
# inherited COMPARE_BASE would put that nested run into comparison mode the
# caller never asked it for. Read into a local now, for the comparison block
# far below to use, and removed from the environment before the first member
# — pool or serial — executes, so no child process ever sees it.
compare_base = os.environ.pop("COMPARE_BASE", "") or None
# READ AND POPPED HERE FOR THE SAME REASON AS COMPARE_BASE ABOVE (kogaki#1353):
# checks/check-ci-shape.sh and checks/check-runner-only.sh both run this
# runner nested inside a sandbox, and an inherited ONLY_IDS_JOINED would
# filter that nested run to the outer run's own `--only` selection.
only_ids = [x for x in os.environ.pop("ONLY_IDS_JOINED", "").splitlines() if x]
if only_ids:
    unknown = [oid for oid in only_ids if oid not in {e["id"] for e in entries}]
    if unknown:
        print(f"run-registered-checks.sh: --only names unknown check id(s) "
              f"not in checks/registry.json: {', '.join(unknown)}", file=sys.stderr)
        sys.exit(2)
    # REGISTRY ORDER, not --only's own order (the issue's own wording): the
    # filter walks `entries` in the order the registry already has them,
    # never the order a caller happened to repeat --only in.
    wanted = set(only_ids)
    entries = [e for e in entries if e["id"] in wanted]

def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True)


def head_key():
    """The head SHA, or None when the tree does not match it."""
    sha = git("rev-parse", "HEAD").stdout.strip()
    if not sha:
        return None
    if git("diff", "--quiet", "HEAD").returncode != 0:
        return None
    if git("diff", "--cached", "--quiet", "HEAD").returncode != 0:
        return None
    return sha


def repo_slug():
    url = git("remote", "get-url", "origin").stdout.strip()
    tail = url.rstrip("/").split("/")[-1] if url else ""
    if tail.endswith(".git"):      # not str.removesuffix: /usr/bin/python3 may predate 3.9
        tail = tail[:-4]
    return tail or pathlib.Path.cwd().name


def store_dir():
    base = os.environ.get("CHECKS_RESULT_DIR")
    if not base:
        xdg = os.environ.get("XDG_CACHE_HOME") or str(pathlib.Path.home() / ".cache")
        base = str(pathlib.Path(xdg) / "kogaki-checks" / repo_slug())
    return pathlib.Path(base)


def verdict_key(sha):
    """The store filename stem for this run's shape.

    THE SHAPE IS PART OF THE KEY (kogaki#1182 item 3, `--ci-shape`). A
    full-tool run and a `--ci-shape` run at the same head answer different
    questions -- one about this machine's own tools and gateway, one about
    the restricted set `.github/workflows/checks.yml` actually provides -- so
    a verdict recorded by one must never be read as covering the other. The
    plain `{sha}.json` name is unchanged for a full-tool run so every verdict
    ever recorded before this issue keeps resolving.
    """
    return f"{sha}-ci-shape" if os.environ.get("CI_SHAPE") == "1" else sha


def local_verdict(sha):
    path = store_dir() / f"{verdict_key(sha)}.json"
    if not path.exists():
        return None
    try:
        rec = json.loads(path.read_text())
    except (OSError, ValueError):
        return None
    if rec.get("outcome") != "pass" or rec.get("head") != sha:
        return None
    return f"local store {path} (recorded {rec.get('recorded_at', '?')}, " \
           f"{rec.get('checks', '?')} checks)"


def ci_verdict(sha):
    """A completed, successful `checks` workflow run that CHECKED OUT this
    exact commit.

    PUSH EVENTS ONLY, and that restriction is the whole soundness of this
    lookup (PR #797 round 1). A workflow run's `head_sha` is the PR HEAD for a
    `pull_request` run, so `gh run list --commit <pr head>` matches it — but
    that run checked out `refs/pull/N/merge`, the merge of the PR head into
    the base, which is a DIFFERENT TREE whenever the base has moved. Trusting
    it would let a local run at the PR head skip the suite on evidence from a
    tree that included commits the PR head does not have, breaking the premise
    the whole key rests on: that the SHA describes the tree being checked.
    On a `push` run the checkout IS the keyed commit, so the key and the tree
    agree by construction.

    The cost is stated rather than discovered: a PR head can never reuse a CI
    verdict, only a local one. That is the sound half of what #769 measured —
    the duplication it targets is the review lane and repeated local runs
    sharing the local store, and #769's own body already records that CI-side
    reuse is bounded at the ~1% of runs that are same-SHA reruns, which live
    on the push path where this lookup still hits.

    `gh` absent, unauthenticated or offline degrades to None — a full run —
    and says nothing, because a lookup that cannot be made is not evidence
    either way.
    """
    try:
        out = subprocess.run(
            ["gh", "run", "list", "--workflow", WORKFLOW, "--commit", sha,
             "--event", "push", "--status", "success", "--limit", "1",
             "--json", "databaseId,url,createdAt"],
            capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.TimeoutExpired):
        return None
    if out.returncode != 0:
        return None
    try:
        runs = json.loads(out.stdout or "[]")
    except ValueError:
        return None
    if not runs:
        return None
    r = runs[0]
    return f"CI run {r.get('databaseId')} {r.get('url', '')} (created {r.get('createdAt', '?')})"


def member_path(entry):
    # A `file` carrying a separator is REPO-ROOT-RELATIVE; a bare name
    # resolves under checks/ as it always has (kogaki#724).
    return (pathlib.Path(entry["file"]) if "/" in entry["file"]
            else pathlib.Path("checks") / entry["file"])


# A member runs by its extension (kogaki#1790).
MEMBER_INTERPRETERS = {".sh": "bash", ".mjs": "node", ".py": "python3"}


def member_argv(entry):
    path = member_path(entry)
    return [MEMBER_INTERPRETERS[path.suffix], str(path)]


unrunnable = [member_path(e).as_posix() for e in registry["checks"]
              if member_path(e).suffix not in MEMBER_INTERPRETERS]
if unrunnable:
    print("run-registered-checks.sh: a registered member must be a .sh, "
          ".mjs or .py file; refused: " + ", ".join(unrunnable),
          file=sys.stderr)
    sys.exit(2)

# A tier names where a member runs, and each value has a reader (kogaki#1794).
TIERS = ("fast", "pre-push")
untiered = [f"{e['id']} ({(e.get('admission') or {}).get('tier')!r})"
            for e in registry["checks"]
            if (e.get("admission") or {}).get("tier") not in TIERS]
if untiered:
    print("run-registered-checks.sh: a member's tier is `fast` or "
          "`pre-push`; refused: " + ", ".join(untiered), file=sys.stderr)
    sys.exit(2)


def run_member(entry):
    """Run one member, returning its captured output, status and cost.

    Captures rather than streams, and merges stderr into stdout so the
    member's own interleaving survives. Nothing is printed here: printing is
    the caller's, in registry order, so the log does not depend on the order
    members happen to finish in.
    """
    started = time.monotonic()
    result = subprocess.run(member_argv(entry),
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return {
        "entry": entry,
        # RAW BYTES, never decoded. Streaming passed a member's output to fd 1
        # untouched, and decoding it here would silently rewrite any non-UTF-8
        # byte a member emits into U+FFFD — a log difference this change has no
        # licence to make. No member emits such output today; that is why it
        # stays bytes rather than why it would be safe to decode (PR #794
        # round 1).
        "output": result.stdout,
        "returncode": result.returncode,
        "elapsed_ms": round((time.monotonic() - started) * 1000),
    }


def resolve_jobs():
    """Pool size: CHECKS_JOBS if it names a positive integer, else CPUs capped.

    A malformed or non-positive CHECKS_JOBS is a typo, and the safe reading of
    a typo here is the OLD behaviour: fall back to serial and say so, rather
    than silently running the default width the operator was trying to change.
    """
    raw = os.environ.get("CHECKS_JOBS")
    if raw is not None:
        try:
            n = int(raw)
        except ValueError:
            n = 0
        if n < 1:
            print(f"note: CHECKS_JOBS={raw!r} is not a positive integer — "
                  "running serially", flush=True)
            return 1
        return n
    return min(os.cpu_count() or 4, 8)


sha = head_key()
forced = os.environ.get("CHECKS_FORCE", "") == "1"
# A `--only` RUN IS NOT A FULL PASS AND NEVER CONSULTS OR PRODUCES THE
# ONCE-PER-HEAD VERDICT (kogaki#1353): the store's whole premise is that the
# recorded run executed every registered member, which a one-member run by
# construction did not, so it skips the lookup here and the write far below.
if only_ids:
    print(f"note: --only {' '.join(only_ids)}; skipping the full-pass "
          f"verdict lookup and the recorded write ({len(entries)} of the "
          f"registry's check(s) selected)", flush=True)
elif sha and not forced:
    source = local_verdict(sha) or ci_verdict(sha)
    if source:
        print(f"reused: full-pass suite verdict for head {sha} from {source}; "
              f"{len(entries)} registered check(s) not executed "
              f"(CHECKS_FORCE=1 to execute)")
        sys.exit(0)
elif sha is None:
    print("note: tracked files differ from HEAD; no verdict is reused or "
          "recorded for this run", flush=True)
elif forced:
    print("note: CHECKS_FORCE=1; executing every member", flush=True)

jobs = resolve_jobs()
serial_entries = [e for e in entries if e.get("serial") is True]
pool_entries = [e for e in entries if e.get("serial") is not True]
if jobs == 1:
    serial_entries, pool_entries = entries, []

results = {}
wall_started = time.monotonic()
# Serial members run FIRST and ALONE — the whole point of the declaration is
# that nothing else is touching the tree while they do.
for entry in serial_entries:
    results[entry["id"]] = run_member(entry)
if pool_entries:
    with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as pool:
        for result in pool.map(run_member, pool_entries):
            results[result["entry"]["id"]] = result
wall_ms = round((time.monotonic() - wall_started) * 1000)

failed = []
# Members that could not answer because their seam was absent — the kit's
# ratified exit 11. Reported, never counted as failures; see the grading
# block below for why the two are not the same thing.
degraded = []
serial_sum_ms = 0
# REGISTRY ORDER, always — the printed log is what CI, a reviewer and
# `tools/digest-check-catches.sh` all read, and it must not vary with timing.
for entry in entries:
    result = results[entry["id"]]
    print(f"== {entry['id']} ({member_path(entry)})", flush=True)
    # Through the binary buffer, so the member's bytes reach the log exactly as
    # they left it. The print above is flushed, so ordering holds.
    sys.stdout.buffer.write(result["output"])
    sys.stdout.buffer.flush()
    serial_sum_ms += result["elapsed_ms"]
    # The catch ledger, its `ms=` field and the `degrade` grade: tools/run-registered-checks.sh's header.
    if result["returncode"] == 0:
        outcome = "pass"
    elif result["returncode"] == KIT_DEGRADE_EXIT:
        outcome = "degrade"
    else:
        outcome = "fail"
    print(f"catch: {entry['id']} outcome={outcome} "
          f"ms={result['elapsed_ms']}",
          flush=True)
    if outcome == "fail":
        failed.append(entry["id"])
        # THE SUPERVISOR READS THIS EXACT LINE, right after its `catch:` line
        # (kogaki#1188): one `FAIL <member path> (exit N)` per failing
        # member, so a reader of the log — human or the supervisor parsing
        # it — finds the member and its exit code beside the catch that
        # named it, rather than only in the summary line below.
        print(f"FAIL {member_path(entry)} (exit {result['returncode']})",
              flush=True)
    elif outcome == "degrade":
        degraded.append(entry["id"])

# Wall BESIDE the summed member cost (kogaki#789 acceptance 1). No target is
# asserted and none is checked: this is a cap that REPORTS, never a target that
# PULLS.
#
# IT IS CALLED "member sum" AND NOT "serial sum", because under concurrency it
# is neither (PR #794 round 1). The figure is the sum of the per-member `ms=`
# values actually recorded, and those are contention-inflated — measured ~28%
# above what the same members total when run serially. Labelling it "serial
# sum" would have made the one line added to expose the wall/serial gap
# overstate the very side it was quoting, and the qualifier belongs in the
# PRINTED log rather than only in this file's comments, since the log is what a
# reader and CI actually see.
mode = (f"{jobs} job(s)" if pool_entries else "serial")
inflated = " (contention-inflated; not a serial baseline)" if pool_entries else ""
print(f"suite: wall {wall_ms/1000:.2f}s; member sum {serial_sum_ms/1000:.2f}s"
      f"{inflated} over {len(entries)} member(s); {mode}"
      + (f", {len(serial_entries)} declared serial" if serial_entries and pool_entries else ""))

# BEFORE the failure verdict, so a run that both failed and degraded says both
# — a degrade hidden behind a FAIL is how the second one gets rediscovered.
if degraded:
    print(f"degraded: {len(degraded)} of {len(entries)} registered check(s) "
          f"could not answer (seam absent, exit {KIT_DEGRADE_EXIT}): "
          + ", ".join(degraded)
          + " -- not a failure and not a pass: the check did not run")

if failed:
    if compare_base:
        # --compare-base <ref> (kogaki#1188): a failing member may be a
        # PRE-EXISTING failure — already red at the comparison base, and
        # therefore not this change's to fix — or a failure this change
        # introduces. The distinction is made by RUNNING THE SAME FAILING
        # MEMBERS AGAIN at the merge-base commit, in a throwaway detached
        # worktree, rather than by inspecting git history: the tree at the
        # base is what the member actually sees, and that is the only
        # honest way to ask what it would have reported there.
        merge_base = git("merge-base", compare_base, "HEAD").stdout.strip()
        by_id = {e["id"]: e for e in entries}
        pre_existing, new_failures = [], []
        if not merge_base:
            print(f"run-suite: cannot resolve a merge-base with "
                  f"{compare_base}; treating every failure as new", flush=True)
            new_failures = list(failed)
        else:
            print(f"run-suite: comparing against base {compare_base} "
                  f"(merge base {merge_base})", flush=True)
            with tempfile.TemporaryDirectory() as wt_parent:
                wt_dir = pathlib.Path(wt_parent) / "compare-base"
                added = git("worktree", "add", "--detach", str(wt_dir),
                            merge_base)
                if added.returncode != 0:
                    print(f"run-suite: could not create a comparison "
                          f"worktree at {merge_base} "
                          f"({added.stderr.strip()}); treating every "
                          f"failure as new", flush=True)
                    new_failures = list(failed)
                else:
                    try:
                        # THE HEAD'S node_modules, SYMLINKED IN — a fresh
                        # worktree does not get one (git does not populate
                        # ignored paths), and installing it again would
                        # make the comparison measure npm's reachability
                        # rather than the member's own verdict at the base.
                        head_node_modules = pathlib.Path("node_modules")
                        if head_node_modules.is_dir():
                            os.symlink(head_node_modules.resolve(),
                                       wt_dir / "node_modules")
                        # A MEMBER ABSENT AT THE BASE IS A NEW FAILURE, NEVER
                        # PRE-EXISTING (PR #1192 round 1 finding 1). Classifying
                        # on the return code alone reads a member the change
                        # ADDED — unregistered or missing on disk at the base,
                        # where bash exits 127 for a missing file — as "also red
                        # at base" and lets the runner exit 0 on a check the
                        # change itself introduced and broke. So a member is
                        # eligible for the base re-run only when the base's OWN
                        # registry.json names it AND its file exists there;
                        # otherwise it is new by name, no re-run needed.
                        base_registry_path = wt_dir / "checks" / "registry.json"
                        base_ids = set()
                        if base_registry_path.exists():
                            try:
                                base_ids = {e["id"] for e in
                                            json.loads(base_registry_path.read_text())["checks"]}
                            except (OSError, ValueError, KeyError):
                                base_ids = set()
                        for check_id in failed:
                            entry = by_id[check_id]
                            base_path = wt_dir / member_path(entry)
                            if check_id not in base_ids or not base_path.exists():
                                new_failures.append(check_id)
                                continue
                            base_result = subprocess.run(
                                member_argv(entry),
                                cwd=wt_dir, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT)
                            # THE KIT'S DEGRADE EXIT AT THE BASE IS ALSO A NEW
                            # FAILURE. A member that could not answer at the
                            # base (seam absent, exit 11) did not already fail
                            # there -- "pre-existing" would claim a failure
                            # that was never observed.
                            if base_result.returncode in (0, KIT_DEGRADE_EXIT):
                                new_failures.append(check_id)
                            else:
                                pre_existing.append((check_id, base_result.returncode))
                    finally:
                        removed = git("worktree", "remove", "--force",
                                      str(wt_dir))
                        if removed.returncode != 0:
                            git("worktree", "prune")
        if pre_existing:
            print(f"run-suite: pre-existing failure(s) also red at base "
                  f"{compare_base}: "
                  + ", ".join(f"{c} (exit {rc} at base)"
                              for c, rc in sorted(pre_existing)))
        if new_failures:
            print("run-suite: new failure(s) vs base " + compare_base
                  + ": " + ", ".join(member_path(by_id[c]).as_posix()
                                      for c in sorted(new_failures)))
            print(f"FAIL: {len(new_failures)} of {len(entries)} registered "
                  f"check(s) fail on this change (vs base {compare_base}): "
                  + ", ".join(sorted(new_failures)))
            sys.exit(1)
        print(f"ok: {len(failed)} of {len(entries)} registered check(s) "
              f"fail, all pre-existing at base {compare_base} — no new "
              f"failure(s); no verdict recorded (not a full pass at HEAD)")
        sys.exit(0)
    print(f"FAIL: {len(failed)} of {len(entries)} registered check(s) failed: "
          + ", ".join(failed))
    sys.exit(1)

# A DEGRADED RUN RECORDS NO VERDICT, and this is the one place the third
# grade is not merely cosmetic (kogaki#1141). The once-per-head store exists
# so a later run at the same SHA may SKIP execution; a run where some member
# never executed has not established what that record would claim, and
# storing it would make the degrade permanent for that head instead of
# transient. So the verdict is written on a FULL pass — every member green —
# and a degraded run leaves the next one to execute again, which is exactly
# what a machine that does have the seam should do.
if sha and not degraded and not only_ids:
    # Written only on a full pass, only for a clean head, only outside the
    # tree (kogaki#769), and only when every registered member ran
    # (kogaki#1353: never on a `--only` run). A write failure is reported
    # and is not a suite failure: the verdict is true whether or not it was
    # stored.
    try:
        d = store_dir()
        d.mkdir(parents=True, exist_ok=True)
        key = verdict_key(sha)
        (d / f"{key}.json").write_text(json.dumps({
            "head": sha, "outcome": "pass", "checks": len(entries),
            "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }, indent=2) + "\n")
        print(f"recorded: full-pass verdict for head {sha} at {d / f'{key}.json'}")
    except OSError as e:
        print(f"note: verdict not recorded ({e}); the next run executes again")
if degraded:
    print(f"ok: {len(entries) - len(degraded)} of {len(entries)} registered check(s) pass; {len(degraded)} could not run")
else:
    print(f"ok: {len(entries)} registered check(s) pass")
