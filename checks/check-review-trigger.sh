#!/usr/bin/env bash
# The review trigger's event-adapter contract (kogaki#65 defect 4).
#
# WHAT THIS CATCHES, NAMED RATHER THAN GENERAL. The hook converts one tool
# event into sweep invocations. It used to extract the PR number with
# `re.search(r"/pull/(\d+)", ...)` — FIRST MATCH ONLY — so a single Bash call
# creating two pull requests fired the sweep once, for the first, and the
# second was never reviewed. That happened: PRs #63 and #64 were created in
# one invocation, `~/.kogaki/review-trigger.log` holds `--pr 62` and `--pr 63`
# and no `--pr 64` line at any position, and #64 reached the presence gate
# unreviewed.
#
# WHY IT IS A CHECK AND NOT A COMMENT. The defect was invisible for exactly as
# long as its contract lived in prose, and the same repository has now filed
# that shape twice in one week (kogaki#54's swallowed degrade line, and this).
# A hook fires on every Bash call, so the fixture cannot run inside it without
# paying latency on every tool use — it runs behind `--self-test` and this
# check is what invokes it. A test nothing invokes is the orphan-guard shape
# kogaki#6 was filed to end.
#
# WHAT IT DOES NOT VERIFY, STATED RATHER THAN LEFT TO LOOK COVERED: that the
# hook is REGISTERED in .claude/settings.json, that the harness actually fires
# it, and that the sweep it spawns does anything useful. Those are the
# occasions rather than the logic, and no fixture over a pure function can
# reach them — the presence gate remains the backstop that does.
set -euo pipefail
cd "$(dirname "$0")/.."

HOOK=".claude/hooks/review-trigger.py"
REPO_ROOT="$(pwd -P)"
HOOK_ABS="$REPO_ROOT/$HOOK"

if [[ ! -f "$HOOK" ]]; then
  echo "FAIL: $HOOK does not exist — the trigger this check covers is absent,"
  echo "  which is a stronger failure than a fixture mismatch, not a skip."
  exit 1
fi

# The extraction must be reachable and exercised. A regression that inlined it
# back into main() would make the self-test pass over dead code, so assert the
# call site too — the fixture proves the FUNCTION, this proves it is the one
# main() uses.
grep -q 'prs = pr_numbers(data.get("tool_response"))' "$HOOK" || {
  echo "FAIL: main() does not extract PR numbers through pr_numbers()."
  echo "  The fixture below would then be exercising a function nothing calls."
  exit 1
}

# The stdin closure is the other half of the same issue (defect 2): the
# spawned sessions' prompts were contaminated by an inherited descriptor.
grep -q 'stdin=subprocess.DEVNULL' "$HOOK" || {
  echo "FAIL: the hook's Popen does not close stdin (kogaki#65 defect 2)."
  echo "  An inherited descriptor is what carried this repository's own driver"
  echo "  source into the spawned reviewers' prompts."
  exit 1
}

# kogaki#211 — the branch fallback must resolve at the tree the push came
# from. The call site is asserted for the same reason the one above is: a
# regression that reverted main() to CLAUDE_PROJECT_DIR would leave the pure
# fixtures green over a resolution nothing uses.
grep -q 'origin = push_origin_dir(data)' "$HOOK" || {
  echo "FAIL: main() does not resolve the pushing tree through push_origin_dir()."
  echo "  The branch fallback would be back to CLAUDE_PROJECT_DIR, which is the"
  echo "  main checkout — so every push from a worktree resolves master and"
  echo "  returns early, silently unreviewed (kogaki#211)."
  exit 1
}

python3 "$HOOK" --self-test

# THE REAL-RUN EXPECTATION, not a pure fixture (kogaki#211).
#
# The defect this guards was a guard that had a call site and was still dead:
# under worktree work its condition was effectively constant-false, and no
# scan of the code can see that. The served position is explicit that this is
# the ONLY thing separating a dead guard from a deliberately-disabled one —
# "a written-down expectation that this feature produces this visible result
# on a real run" — so the expectation is written here and exercised, against a
# real linked worktree rather than a simulated payload.
#
# consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e gloss/lessons/testing.md:137
#   request_id: 8577573e-ee2e-459d-b5eb-9bfb50e77dae
#   outcome: discriminating
#   query: consultation-map entry 1 survey before modifying the review-trigger hook — what distinguishes a guard that is dead from one deliberately switched off
#
# It also refuses `--path-format=absolute`, which git only learned in 2.31:
# on 2.25.1 it is echoed back as an argument, and a raw string comparison then
# reports a worktree and its own main checkout as different repositories —
# the exact false negative that would leave the defect in place while every
# pure fixture stayed green.
WT="$(mktemp -d)/wt"
if git -C "$REPO_ROOT" worktree add -q -b check-rt-worktree-probe "$WT" 2>/dev/null; then
  probe="$(REPO="$REPO_ROOT" WT="$WT" HOOK="$HOOK_ABS" python3 - <<'PROBE'
import importlib.util, os
spec = importlib.util.spec_from_file_location("rt", os.environ["HOOK"])
rt = importlib.util.module_from_spec(spec); spec.loader.exec_module(rt)
repo, wt = os.environ["REPO"], os.environ["WT"]
ok = []
ok.append(("worktree shares the repository", rt.same_repository(wt, repo) is True))
ok.append(("an unrelated dir does not", rt.same_repository("/tmp", repo) is False))
b_wt = rt._git(wt, "rev-parse", "--abbrev-ref", "HEAD")
ok.append(("the worktree's own branch resolves", b_wt == "check-rt-worktree-probe"))
ok.append(("and it spawns", rt.spawns_for_branch(b_wt) is True))
bad = [n for n, good in ok if not good]
print("FAIL " + "; ".join(bad) if bad else f"OK {len(ok)}")
PROBE
)"
  git -C "$REPO_ROOT" worktree remove --force "$WT" >/dev/null 2>&1
  git -C "$REPO_ROOT" branch -D check-rt-worktree-probe >/dev/null 2>&1
  case "$probe" in
    OK*) echo "worktree pass: ${probe#OK } real-run cases (shared repo / unrelated dir refused / worktree branch resolves / spawns)" ;;
    *)   echo "FAIL: $probe"; exit 1 ;;
  esac
else
  echo "CANNOT-DETERMINE: a linked worktree could not be created here, so the"
  echo "  kogaki#211 real-run expectation did not execute. This is neither a"
  echo "  pass nor a failure of the diff (absence-verification-counts-exercised-trials)."
fi

echo "ok: review trigger fires once per created PR, closes stdin, and resolves the pushing worktree"
