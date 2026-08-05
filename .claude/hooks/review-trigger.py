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
    if failures:
        return 1
    print(f"trigger pass: {len(cases)}/{len(cases)} pr-extraction cases "
          "(multi-PR / single / duplicate / ordered / none / empty)")
    return 0


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
    prs = pr_numbers(data.get("tool_response"))
    if prs:
        invocations = [["--spawn", "--pr", num] for num in prs]
    else:
        try:
            branch = subprocess.run(
                ["git", "-C", repo, "rev-parse", "--abbrev-ref", "HEAD"],
                capture_output=True, text=True, timeout=5).stdout.strip()
        except Exception:
            return
        if branch in ("", "HEAD", "master", "main"):
            return
        invocations = [["--spawn", "--branch", branch]]

    state_dir = os.path.expanduser("~/.kogaki")
    os.makedirs(state_dir, exist_ok=True)
    log = open(os.path.join(state_dir, "review-trigger.log"), "a")
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
