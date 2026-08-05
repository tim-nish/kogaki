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

    # Prefer the PR number straight from the creation output; fall back to
    # the branch, which the sweep resolves. A push to master (a merge) is
    # not a review substrate change and spawns nothing.
    args = ["--spawn"]
    m = re.search(r"/pull/(\d+)", json.dumps(data.get("tool_response") or {}))
    if m:
        args += ["--pr", m.group(1)]
    else:
        try:
            branch = subprocess.run(
                ["git", "-C", repo, "rev-parse", "--abbrev-ref", "HEAD"],
                capture_output=True, text=True, timeout=5).stdout.strip()
        except Exception:
            return
        if branch in ("", "HEAD", "master", "main"):
            return
        args += ["--branch", branch]

    state_dir = os.path.expanduser("~/.kogaki")
    os.makedirs(state_dir, exist_ok=True)
    log = open(os.path.join(state_dir, "review-trigger.log"), "a")
    log.write(f"--- trigger: {' '.join(args)}\n")
    log.flush()
    # Detached: the author's session returns immediately; the sweep's own
    # fail-closed discipline and the presence gate carry observability.
    subprocess.Popen(["bash", sweep] + args, cwd=repo,
                     stdout=log, stderr=log, start_new_session=True)
    print(f"review-trigger: spawned review sweep ({' '.join(args)}), detached "
          "— log at ~/.kogaki/review-trigger.log")


if __name__ == "__main__":
    main()
