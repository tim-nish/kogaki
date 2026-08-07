#!/usr/bin/env python3
"""Review trigger — the event adapter (kogaki#47).

Fires on the acts that change the review substrate — `gh pr create` and
`git push` — and hands the decision to `tools/review-sweep.sh` in
single-target mode, DETACHED, so the authoring session never waits. The
timer design is rejected (owner ruling 2026-08-05: a mechanism whose
internal rules force the user to wait is incorrectly designed; a trigger
binds to an act that already happens, never a periodic reader —
consulted: product-lab@ed47fbd3 topics/archive/articles.md:29,
topics/knowledge-architecture.md:9).

This file decides NOTHING about reviews: the sweep's state machine
(spawn-round-N / author-owes / park / done) is the single decision
function, and this adapter only converts an event into one invocation of
it. Project-scoped via .claude/settings.json, so the trigger travels with
the repository rather than being machine wiring; the log is machine-local
state (~/.kogaki/review-trigger.log), never committed.
"""
import json
import os
import re
import subprocess
import sys


def pr_numbers(tool_response):
    """Every PR number the tool response names, in order, de-duplicated.

    Extracted as its own function so it can be EXERCISED (kogaki#65). The
    defect this replaces lived in an inline `re.search` — first match only —
    and nothing could reach it to test it.
    """
    out = []
    for num in re.findall(r"/pull/(\d+)", json.dumps(tool_response or {})):
        if num not in out:
            out.append(num)
    return out


def self_test():
    """Fixture pass over pr_numbers, run by checks/check-review-trigger.sh.

    The specimen is the held run: PRs #63 and #64 created in ONE Bash call,
    one hook firing, #64 never swept. A fix recorded only in a comment is the
    shape this repository keeps filing issues about, so the contract gets a
    standing exercise instead.
    """
    cases = [
        ("two PRs in one response -> both fire (the kogaki#65 specimen)",
         {"stdout": "https://x/pull/63\nhttps://x/pull/64\n"}, ["63", "64"]),
        ("one PR -> unchanged behaviour",
         {"stdout": "https://x/pull/62\n"}, ["62"]),
        ("the same PR twice -> fired once",
         {"stdout": "https://x/pull/70\nhttps://x/pull/70\n"}, ["70"]),
        ("three PRs -> all three, in order",
         {"stdout": "/pull/1\n/pull/2\n/pull/3\n"}, ["1", "2", "3"]),
        ("no PR url -> empty, so the branch fallback runs",
         {"stdout": "Everything up-to-date"}, []),
        ("empty response -> empty, never a crash", None, []),
    ]
    failures = 0
    for name, resp, want in cases:
        got = pr_numbers(resp)
        if got != want:
            print(f"FAIL {name}: got {got}, want {want}")
            failures += 1
    # kogaki#211 — the branch fallback's OPERAND, exercised apart from the
    # resolution it feeds. Every case here fails against the pre-fix code,
    # which read CLAUDE_PROJECT_DIR and never looked at the payload at all.
    origin_cases = [
        ("payload cwd is the pushing tree",
         {"cwd": "/tmp/wt", "tool_input": {"command": "git push"}}, "/tmp/wt"),
        ("an explicit -C wins over cwd — the push names its own tree",
         {"cwd": "/repo", "tool_input": {"command": "git -C /tmp/wt push"}}, "/tmp/wt"),
        ("a quoted -C path is unquoted",
         {"cwd": "/repo", "tool_input": {"command": "git -C '/tmp/w t' push"}}, "/tmp/w t"),
        ("no cwd and no -C -> None, so the caller keeps the old fallback",
         {"tool_input": {"command": "git push"}}, None),
        ("blank cwd is absent, never a directory",
         {"cwd": "   ", "tool_input": {"command": "git push"}}, None),
        ("a bare push from the project root still resolves there",
         {"cwd": "/repo", "tool_input": {"command": "git push -u origin HEAD"}}, "/repo"),
    ]
    for name, payload, want in origin_cases:
        got = push_origin_dir(payload)
        if got != want:
            print(f"FAIL origin {name}: got {got!r}, want {want!r}")
            failures += 1

    # The default-branch early return is UNCHANGED and must stay so: the fix
    # reaches the right tree without loosening which branches spawn.
    branch_cases = [("feature branch spawns", "spec/199-x", True),
                    ("master never spawns (a push there is a merge)", "master", False),
                    ("main never spawns", "main", False),
                    ("detached HEAD never spawns", "HEAD", False),
                    ("unresolvable branch never spawns", "", False)]
    for name, branch, want in branch_cases:
        got = spawns_for_branch(branch)
        if got != want:
            print(f"FAIL branch {name}: got {got}, want {want}")
            failures += 1

    if failures:
        return 1
    print(f"trigger pass: {len(cases)}/{len(cases)} pr-extraction cases "
          "(multi-PR / single / duplicate / ordered / none / empty); "
          f"{len(origin_cases)}/{len(origin_cases)} push-origin cases "
          "(cwd / explicit -C / quoted path / absent / blank / project root); "
          f"{len(branch_cases)}/{len(branch_cases)} branch-guard cases "
          "(feature / master / main / detached / unresolvable)")
    return 0


def push_origin_dir(data):
    """The directory the push was actually made FROM, or None (kogaki#211).

    THE MISSING OPERAND. The branch fallback used to resolve at
    `CLAUDE_PROJECT_DIR`, which is the main checkout — so a push issued from a
    git worktree resolved the WRONG tree's branch, found `master` there, and
    returned early. Under worktree work, which the lane commands prescribe, the
    fallback's guard is effectively constant-false, and enumeration cannot see
    that: the check exercises a pure function and the defect is in the
    resolution the impure half performs.

    Two sources, in order, both facts about THIS invocation rather than about
    the session's configuration:

      1. an explicit `git -C <path>` in the command — the push names its own
         tree, so nothing needs to be inferred;
      2. the payload's `cwd` — the shell the command ran in.

    Returns None when neither is present, and the caller then falls back to
    CLAUDE_PROJECT_DIR exactly as before. A missing operand degrades to the old
    behaviour rather than to a refusal: the trigger's job is to fire, and a
    fallback that declined on absence would trade under-firing for more of it.
    """
    cmd = (data.get("tool_input") or {}).get("command", "") or ""
    # `-C` only, and quoted forms first so a path containing a space is not
    # truncated at its first space — the alternation order is the fix, since a
    # bare `\S+` matches the quoted case too and would win if it came first.
    m = re.search(r"\bgit\b[^|;&\n]*?\s-C\s+('[^']*'|\"[^\"]*\"|\S+)", cmd)
    if m:
        return m.group(1).strip("'\"")
    cwd = data.get("cwd")
    return cwd.strip() if isinstance(cwd, str) and cwd.strip() else None


def spawns_for_branch(branch):
    """Does a push on this branch warrant a review spawn?

    UNCHANGED BY kogaki#211, and deliberately so: a push to the default branch
    is a MERGE, not a review-substrate change, and the fix must reach the right
    tree without loosening this. Kept as a pure function so the check can
    exercise it apart from the resolution that feeds it — which is the half
    that was wrong.
    """
    return branch not in ("", "HEAD", "master", "main")


def _git(d, *args):
    return subprocess.run(["git", "-C", d, *args],
                          capture_output=True, text=True, timeout=5).stdout.strip()


def same_repository(a, b):
    """Do two directories belong to ONE repository, worktrees included?

    `--git-common-dir` is the discriminator kogaki#211 names: a linked worktree
    has its own `--git-dir` and SHARES `--git-common-dir` with the main
    checkout, so this is true across worktrees of one repo and false across
    unrelated repos.

    This is a SAFETY bound rather than a convenience. Once the branch may be
    resolved at a directory the payload supplies, an unrelated repository's
    push could otherwise resolve a non-default branch and spawn THIS repo's
    sweep against it. An empty result on either side returns False: a
    cannot-determine is not a match.

    THE RESULT IS RESOLVED AGAINST ITS OWN DIRECTORY, and that is required
    rather than tidy. `--git-common-dir` answers RELATIVE from a main checkout
    (`.git`) and ABSOLUTE from a linked worktree, so comparing the raw strings
    reports a worktree and its own main checkout as different repositories —
    which is exactly the false answer that would leave kogaki#211's defect in
    place while looking fixed. `--path-format=absolute` would normalise this
    and is NOT used: it arrived in git 2.31 and is silently echoed back as an
    argument by older gits (measured on 2.25.1), so it would reintroduce the
    same false negative on the machines most likely to be running it.
    """
    def common(d):
        try:
            out = _git(d, "rev-parse", "--git-common-dir")
        except Exception:
            return ""
        if not out:
            return ""
        return os.path.realpath(out if os.path.isabs(out) else os.path.join(d, out))
    ca, cb = common(a), common(b)
    return bool(ca) and bool(cb) and ca == cb


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return
    cmd = (data.get("tool_input") or {}).get("command", "") or ""
    if not re.search(r"\bgh\s+pr\s+create\b", cmd) and not re.search(r"\bgit\s+push\b", cmd):
        return

    repo = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    sweep = os.path.join(repo, "tools", "review-sweep.sh")
    if not os.path.exists(sweep):
        return  # not a repo this trigger serves

    # Prefer the PR numbers straight from the creation output; fall back to
    # the branch, which the sweep resolves. A push to master (a merge) is
    # not a review substrate change and spawns nothing.
    #
    # findall, NOT search (kogaki#65 defect 4). One tool call may create more
    # than one pull request, and `re.search` returns the FIRST match only —
    # so a Bash invocation that created PRs #63 and #64 fired this hook once,
    # for #63, and #64 was never swept. The trigger log is the evidence:
    # three PRs across two invocations produced exactly two firings, and no
    # `--pr 64` line exists at any position.
    #
    # This is the carrier-binds-occasions shape one level down — the hook was
    # installed on the right occasion and bound to ONE INSTANCE of it. The
    # remedy is to fire per instance, so a caller batching its creations
    # cannot silently drop the ones after the first.
    state_dir = os.path.expanduser("~/.kogaki")
    os.makedirs(state_dir, exist_ok=True)
    log = open(os.path.join(state_dir, "review-trigger.log"), "a")

    prs = pr_numbers(data.get("tool_response"))
    if prs:
        invocations = [["--spawn", "--pr", num] for num in prs]
    else:
        # RESOLVE WHERE THE PUSH HAPPENED, NOT WHERE THE PROJECT ROOT IS
        # (kogaki#211). `origin` is the pushing tree when the payload supplies
        # one and it belongs to this repository; otherwise the project root,
        # unchanged.
        origin = push_origin_dir(data)
        if origin and os.path.isdir(origin) and same_repository(origin, repo):
            resolved_at, elsewhere = origin, os.path.realpath(origin) != os.path.realpath(repo)
        else:
            resolved_at, elsewhere = repo, False
        try:
            branch = _git(resolved_at, "rev-parse", "--abbrev-ref", "HEAD")
        except Exception:
            return
        if not spawns_for_branch(branch):
            # A SILENT DECLINE IS WHAT LET THIS RUN TWICE UNNOTICED, so the
            # decline states where it resolved and whether that was the tree
            # the push came from. This is an OBLIGATION — an absence generates
            # no event to hook — so it is discharged by making the absence
            # observable, never by a gate.
            log.write(
                f"--- decline: branch {branch!r} resolved at {resolved_at}"
                f"{' (the pushing tree)' if elsewhere else ''}"
                f"{'' if elsewhere else ' (project root)'}"
                f" — no spawn; a push to the default branch is a merge\n")
            log.flush()
            return
        invocations = [["--spawn", "--branch", branch]]
        if elsewhere:
            log.write(f"--- resolved at the pushing worktree {resolved_at} "
                      f"(project root {repo} would have resolved a different "
                      f"branch)\n")
            log.flush()
    for args in invocations:
        log.write(f"--- trigger: {' '.join(args)}\n")
        log.flush()
        # Detached: the author's session returns immediately; the sweep's own
        # fail-closed discipline and the presence gate carry observability.
        #
        # stdin=DEVNULL (kogaki#65 defect 2): the spawned reviewers reported
        # their prompts contaminated with this repository's own driver source,
        # reaching them through an inherited descriptor. Closed here as well as
        # in the sweep's own spawn() — both are spawn boundaries, and fixing
        # only the inner one leaves the outer path live.
        subprocess.Popen(["bash", sweep] + args, cwd=repo,
                         stdin=subprocess.DEVNULL,
                         stdout=log, stderr=log, start_new_session=True)
    fired = "; ".join(" ".join(a) for a in invocations)
    print(f"review-trigger: spawned review sweep ({fired}), detached "
          "— log at ~/.kogaki/review-trigger.log")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    main()
