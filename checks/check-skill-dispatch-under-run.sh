#!/usr/bin/env bash
# The self-gating dispatch deny, exercised over synthesized hook payloads
# (kogaki#1154).
#
# WHAT THIS CATCHES. `.claude/hooks/gate-skill-dispatch-under-run.py` is the
# only guard standing between a `/ship-cycle` run and the deadlock session
# 54a9804a hit on 2026-09-19: dispatching `/terrain` inside a run opened a gate
# the run's own gate-set check refused, while `gate-open-terrain-gate.py`
# admitted nothing else -- no act either hook admitted, and the only recovery
# was moving the pointer out of `~/.claude/kogaki-open-gates/` by hand. The
# hook is reachable only by a harness `PreToolUse` payload for the `Skill`
# tool, so no runtime self-test can drive it and this is the only place its
# decisions are exercised.
#
# THE RUN MARKER IS SYNTHESIZED AND SO IS ITS DIRECTORY. The hook's default
# store is machine-local and outside this repository; a member that wrote there
# would leave artifacts in a directory live runs read, and a `SIGKILL`ed suite
# would leave them for good. So the hook reads `KOGAKI_RUN_MARK_DIR` and every
# case below points it at a scratch root this member mints and removes -- the
# sibling convention `GATE_DECLARATION_SIDECAR_DIR` and
# `KOGAKI_QUESTION_SHAPE_CMD` already carry here (PR #1157 round 1). What is
# asserted is still the hook's own slug derivation, over a session id this
# member controls end to end.
set -uo pipefail
cd "$(dirname "$0")/.."

HOOK=.claude/hooks/gate-skill-dispatch-under-run.py
MARK_DIR="$(mktemp -d)"
export KOGAKI_RUN_MARK_DIR="$MARK_DIR"

fail=0
cases=0
bad() { printf 'FAIL — %s\n' "$*"; fail=1; }
pass() { cases=$((cases + 1)); }

if [[ ! -f "$HOOK" ]]; then
  bad "$HOOK is missing — the deny this member exists to test has no subject"
  echo "check-skill-dispatch-under-run: 0 case(s), 1 failure(s)"
  exit 1
fi

started=$(date +%s%N)

SESSION="kogaki-1154-check-$$-$RANDOM"
MARK_FILE="$MARK_DIR/runmark__${SESSION}.json"
cleanup() { rm -rf "$MARK_DIR"; }
trap cleanup EXIT

verdict() {  # <tool_name> <skill> <session-or-empty> [transcript] -> payload
  local tool="$1" skill="$2" sid="$3" tpath="${4:-}"
  python3 - "$tool" "$skill" "$sid" "$tpath" <<'PY' 2>&1
import json, sys
tool, skill, sid, tpath = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
payload = {"tool_name": tool, "tool_input": {"skill": skill}}
if sid:
    payload["session_id"] = sid
if tpath:
    payload["transcript_path"] = tpath
print(json.dumps(payload))
PY
}

run_hook() {  # feeds the payload built by verdict() into the hook
  python3 "$HOOK"
}

denied() { grep -q '"permissionDecision": "deny"' <<<"$1"; }

# ---- 1. NO RUN MARKER: a standalone /terrain dispatch is unaffected
# (acceptance item 3).
out=$(verdict "Skill" "terrain" "$SESSION" | run_hook)
if [[ -z "$out" ]]; then pass; else
  bad "a self-gating dispatch with NO run marker was denied: $out — a session that never ran a preflight must be exactly as unconstrained as before"
fi

# ---- 2. A RUN MARKER FOR THIS SESSION: /terrain is refused before any gate
# opens (acceptance item 1), and the refusal names the fresh-session route.
echo '{"root": "/tmp/nonexistent-kogaki-check"}' > "$MARK_FILE"
out=$(verdict "Skill" "terrain" "$SESSION" | run_hook)
if denied "$out"; then pass; else
  bad "a self-gating dispatch WITH a run marker was not denied: ${out:-<empty>}"
fi
if grep -q 'own session' <<<"$out"; then pass; else
  bad "the deny does not name the fresh-session route: $out"
fi

# ---- 3. brief IS ALSO SELF-GATING, over the same marker.
out=$(verdict "Skill" "brief" "$SESSION" | run_hook)
if denied "$out"; then pass; else
  bad "dispatching brief under a run marker was not denied: ${out:-<empty>}"
fi

# ---- 4. A SKILL THAT DOES NOT OPEN ITS OWN GATE INTERVAL RIDES THROUGH, even
# under a live run marker — this hook's whole scope is the two self-gating
# lanes, not every skill.
out=$(verdict "Skill" "review-draft" "$SESSION" | run_hook)
if [[ -z "$out" ]]; then pass; else
  bad "a non-self-gating skill was denied under a run marker: $out"
fi

# ---- 5. A DIFFERENT TOOL NAMED Skill IN TEXT ONLY (wrong tool_name) IS NOT
# THE MATCH — the hook reads tool_name, not the skill argument alone.
out=$(python3 -c 'import json; print(json.dumps({"tool_name": "Bash", "tool_input": {"skill": "terrain"}, "session_id": "'"$SESSION"'"}))' | run_hook)
if [[ -z "$out" ]]; then pass; else
  bad "a non-Skill tool_name was denied on a coincidental skill field: $out"
fi

# ---- 6. A FOREIGN SESSION'S RUN MARKER DOES NOT GATE THIS ONE — the same
# session-scoping `gate-open-terrain-gate.py` and `lint-gate-declaration.py`
# both hold, asserted here rather than assumed carried over by naming.
out=$(verdict "Skill" "terrain" "not-${SESSION}" | run_hook)
if [[ -z "$out" ]]; then pass; else
  bad "a run marker belonging to a DIFFERENT session gated this one: $out"
fi

# ---- 7. AN UNREADABLE PAYLOAD FAILS CLOSED, the opposite polarity of
# `gate-open-terrain-gate.py` and the same one as `gate-terrain-executor.py`,
# for the reason both docstrings state: the failure this guards is a session
# wedged past self-recovery, which is more expensive to reproduce than one
# denied dispatch.
out=$(printf 'not json' | run_hook)
if denied "$out"; then pass; else
  bad "an unreadable payload was not denied — this hook's docstring commits to failing CLOSED here"
fi

# ---- 8. NO tool_input.skill AT ALL (a malformed or unrelated Skill call)
# RIDES THROUGH rather than being denied on an absent field.
out=$(python3 -c 'import json; print(json.dumps({"tool_name": "Skill", "tool_input": {}, "session_id": "'"$SESSION"'"}))' | run_hook)
if [[ -z "$out" ]]; then pass; else
  bad "a Skill call with no skill field was denied: $out"
fi

# ---- 9. THE TRANSCRIPT-PATH KEY IS THE FALLBACK SPELLING, and it is the arm
# that fires exactly when the `session_id` key does not match the marker's --
# the case the redundancy exists for. Without a reader it was a fallback
# nobody had run (PR #1157 round 1).
TSESSION="kogaki-1154-transcript-$$-$RANDOM"
TMARK="$MARK_DIR/runmark__${TSESSION}.json"
echo '{"root": "/tmp/nonexistent-kogaki-check"}' > "$TMARK"
out=$(verdict "Skill" "terrain" "" "/tmp/transcripts/${TSESSION}.jsonl" | run_hook)
if denied "$out"; then pass; else
  bad "a run marker keyed to the TRANSCRIPT stem did not gate the dispatch: ${out:-<empty>}"
fi
rm -f "$TMARK"

# ---- 10. A MARKER THAT EXISTS AND DOES NOT PARSE FAILS CLOSED. Existence is
# the property the hook reads -- nothing in the body is used -- so a truncated
# or half-written marker is a run it cannot rule out, and reading it as
# absence admitted exactly the dispatch this hook exists to refuse (PR #1157
# round 1).
printf '{"root": "/tmp/nonexist' > "$MARK_FILE"
out=$(verdict "Skill" "terrain" "$SESSION" | run_hook)
if denied "$out"; then pass; else
  bad "an UNREADABLE run marker was read as no-run and the dispatch was admitted: ${out:-<empty>}"
fi
if grep -q 'could not be read' <<<"$out"; then pass; else
  bad "the unreadable-marker deny does not name the unreadable run state: $out"
fi

# THE ELAPSED TIME IS REPORTED, NEVER ASSERTED. A wall-clock bound inside a
# contended suite reds intermittently and reads as a real defect, which is a
# finding about this member rather than about the hook (PR #1157 round 1).
elapsed_ms=$(( ($(date +%s%N) - started) / 1000000 ))

if [ "$fail" -eq 0 ]; then
  echo "ok: $cases case(s) pass in ${elapsed_ms}ms — a self-gating skill is denied under a run marker naming the fresh-session route, rides through with none, a foreign session's marker does not gate this one, and an unreadable payload fails closed (kogaki#1154)"
fi
echo "check-skill-dispatch-under-run: $cases case(s) pass, $fail failure(s)"
exit "$fail"
