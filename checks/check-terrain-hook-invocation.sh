#!/usr/bin/env bash
# The Terrain executor's invocation boundary (kogaki#1027).
#
# WHAT THIS CHECKS THAT NOTHING ELSE CAN. `src/terrain.mjs self-test` drives the
# executor end to end — the payload refusal, the attribution on every
# transition, the deleted flags refused by name, the start act's own executor
# kind — so the RUNTIME's half is covered there, beside the code it belongs to.
# What that pass cannot reach is the other half of the same instrument, which
# does not live in the runtime at all:
#
#   1. THE DENY. The start act attributes its own transitions to the skill
#      expansion with no hook payload behind them, so the field is only worth
#      reading because a model cannot type `terrain.mjs start` in Bash and mint
#      a start-attributed record at will. The prohibition is a Python
#      PreToolUse hook; a JavaScript fixture pass cannot exercise it.
#   2. THE REMOVAL TEST (acceptance item 4). The claim is that the executor's
#      behaviour is carried by the executor and the hooks rather than by the
#      prose around them — so the same run, performed with the skill file
#      reduced to its one `!` line and `specs/spec-terrain/` absent from the
#      tree, must produce byte-equal artifacts. That is a claim about the TREE,
#      and no pass running inside the tree can make it.
#
# ITS REGISTRATION IS NOT ASSERTED, on `check-gate-capture-hook.sh`'s own
# ground: hook wiring is machine-local and never committed, so a check
# asserting it would fail on every fresh clone and would be asserting a fact
# about a machine rather than about this repository.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO=$PWD

fail=0
cases=0
note() { printf '%s\n' "$*"; }
bad() { printf 'FAIL — %s\n' "$*"; fail=1; }
pass() { cases=$((cases + 1)); }

DENY=.claude/hooks/gate-terrain-executor.py
ADVANCE=.claude/hooks/advance-terrain.py
SKILL=.claude/skills/terrain/SKILL.md

# ---- INSTALLABILITY. The facts a reader would otherwise take on trust.
for f in "$DENY" "$ADVANCE"; do
  if [ ! -f "$f" ]; then
    bad "$f is missing — the executor's invocation boundary has no carrier"
    continue
  fi
  if python3 -c "import ast,sys;ast.parse(open('$f').read())" 2>/dev/null; then
    pass
  else
    bad "$f does not parse as Python — a hook that cannot load enforces nothing, and PreToolUse load failures are silent to the model"
  fi
done

# ---- THE SKILL FILE CARRIES EXACTLY ONE `!` LINE (acceptance item 1's shape).
# More than one and the harness runs an act nobody declared; none and the run is
# started by whatever the model decides to type, which is the defect.
bangs=$(grep -c '^!' "$SKILL" 2>/dev/null || echo 0)
if [ "$bangs" = "1" ]; then pass; else
  bad "$SKILL carries $bangs '!' line(s); exactly one is owed, running the start act"
fi
if grep -q '^! node src/terrain.mjs start$' "$SKILL" 2>/dev/null; then pass; else
  bad "$SKILL's '!' line does not run \`node src/terrain.mjs start\` — the start act is the harness's, and the skill file is where it is declared"
fi

# ---- ACCEPTANCE 3. THE DENY FIRES, AND ADMITS `--status`.
# Driven over synthesized PreToolUse payloads, which is the shape the dispatcher
# hands it in a real call.
deny_verdict() {
  python3 "$DENY" <<PY 2>/dev/null
{"tool_name": "Bash", "tool_input": {"command": $(python3 -c "import json,sys;print(json.dumps(sys.argv[1]))" "$1")}}
PY
}
assert_denied() {
  local label=$1 cmd=$2 out
  out=$(deny_verdict "$cmd")
  if printf '%s' "$out" | grep -q '"permissionDecision": "deny"'; then pass; else
    bad "the deny does not fire on $label: \`$cmd\` — a model-typed route into the executor makes the start attribution unfalsifiable"
  fi
}
assert_admitted() {
  local label=$1 cmd=$2 out
  out=$(deny_verdict "$cmd")
  if [ -z "$out" ]; then pass; else
    bad "the deny fires on $label: \`$cmd\` — $ADMITTED_NOTE"
  fi
}
ADMITTED_NOTE="--status is read-only and is the one route by which a stuck run can be inspected"

assert_denied "the run verb"          "node src/terrain.mjs run --run-dir /tmp/x"
assert_denied "the start verb"        "node src/terrain.mjs start"
assert_denied "an absolute path"      "node $REPO/src/terrain.mjs run"
assert_denied "a chained command"     "cd /tmp && node ./src/terrain.mjs report --all-groups"
assert_denied "a bare invocation"     "node src/terrain.mjs"
assert_admitted "the status verb"     "node src/terrain.mjs run --run-dir /tmp/x --status"
assert_admitted "an unrelated command" "node src/draft.mjs run"
# `--status-key` must not admit: a flag that merely STARTS with the admitted one
# is not the admitted one, and this is the shape a prefix match gets wrong.
assert_denied "a flag resembling --status" "node src/terrain.mjs run --status-key in_review"

# THE ADMISSION IS PER SEGMENT, NOT PER COMMAND (PR #1034 round 1, finding 2).
# A whole-string read admits every segment on one segment's `--status`, so an
# inspection command chained to a start act rides through and mints a
# skill-expansion-attributed record from Bash — the one route the executor's
# self-declared kind is only trustworthy because it is closed.
assert_denied "a status read chained to a start"   "node src/terrain.mjs run --status; node src/terrain.mjs start"
assert_denied "a status read &&-chained to a run"  "node src/terrain.mjs run --status && node src/terrain.mjs run"
assert_denied "a start piped from a status read"   "node src/terrain.mjs run --status | node src/terrain.mjs start"
# ...and the inspection route survives the split: two status reads in one
# command are still two status reads.
assert_admitted "two chained status reads" "node src/terrain.mjs run --status; node src/terrain.mjs run --run-dir /tmp/y --status"

# THE HOOK'S CHILD BOUND FIRES BEFORE THE HARNESS'S OWN (PR #1034 round 1,
# finding 3). A bound set AT the default can never fire first, which is a
# declared bound that does nothing; the relay message it exists to make
# reachable is only reachable below it.
if python3 -c 'import re,sys; src=open(".claude/hooks/advance-terrain.py",encoding="utf-8").read(); m=re.search(r"^ADVANCE_TIMEOUT_S = (\d+)$", src, re.M); sys.exit(0 if m and int(m.group(1)) < 600 else 1)'; then
  pass
else
  bad "advance-terrain.py's ADVANCE_TIMEOUT_S is not below the harness's 600s hook default — a child bound at or above it cannot fire first, so the timeout relay it exists for is unreachable"
fi

# THE ADVANCE HOOK SPENDS NOTHING ON A QUESTION THAT IS NOT A TERRAIN GATE
# (PR #1034 round 1, finding 1). With no open run there is nothing to advance,
# and the first cut spawned the executor anyway — minting a workspace and
# pruning the lane on every unrelated question answered in this repository.
if [ -e runs/terrain/open-run ]; then
  note "skipped: a Terrain run is open in this tree, so the no-open-run precondition cannot be staged here"
else
  noise=$(printf '%s' '{"tool_name":"AskUserQuestion","tool_use_id":"toolu_x","tool_response":{"answers":{"q":"a"}}}' | python3 .claude/hooks/advance-terrain.py 2>&1)
  if [ -z "$noise" ] && [ ! -e runs/terrain/open-run ]; then pass; else
    bad "advance-terrain.py acted on a question with no open Terrain run: ${noise:-(silent, but a workspace pointer appeared)}"
  fi
fi

# ---- ACCEPTANCE 4. THE REMOVAL TEST.
# The same start act, run once in this tree and once in a tree holding only the
# runtime and the hooks — the skill file reduced to its `!` line, and
# `specs/spec-terrain/` absent entirely. Byte-equal artifacts are the claim.
#
# TIMESTAMPS AND ABSOLUTE PATHS ARE NORMALISED, and that is not a weakening of
# "byte-equal": a wall clock and a temp directory differ between any two runs of
# anything, so comparing them would assert that the test harness is
# deterministic rather than that the runtime is prose-independent.
tmp=$(mktemp -d) || { bad "no temp directory — the removal test could not run, which is CANNOT-DETERMINE and never a pass"; }
if [ -n "${tmp:-}" ] && [ -d "$tmp" ]; then
  trap 'rm -rf "$tmp"' EXIT

  cat > "$tmp/table.json" <<'JSON'
{"version": 1, "states": [
  {"id": "a", "kind": "compute"},
  {"id": "W", "kind": "wait", "owner_supplies": "something"},
  {"id": "done", "kind": "terminal"}
]}
JSON

  normalise() {
    python3 - "$1" <<'PY'
import json, re, sys
rec = json.load(open(sys.argv[1]))
rec["workflow"]["path"] = "<table>"
for t in rec.get("transitions", []):
    t["at"] = "<at>"
print(json.dumps(rec, indent=2, sort_keys=True))
PY
  }

  # The golden run, in this tree.
  mkdir -p "$tmp/gold"
  if node src/terrain.mjs start --run-dir "$tmp/gold" --workflow "$tmp/table.json" >/dev/null 2>"$tmp/gold.err"; then
    pass
  else
    bad "the golden start act failed in this tree: $(head -1 "$tmp/gold.err")"
  fi

  # The reduced tree: the runtime and the hooks, and nothing else this lane
  # writes prose into.
  mkdir -p "$tmp/red/src" "$tmp/red/.claude/hooks" "$tmp/red/.claude/skills/terrain"
  cp -r src/. "$tmp/red/src/"
  cp .claude/hooks/*.py "$tmp/red/.claude/hooks/"
  printf '! node src/terrain.mjs start\n' > "$tmp/red/.claude/skills/terrain/SKILL.md"
  if [ -e "$tmp/red/specs" ]; then
    bad "the reduced tree carries specs/ — the removal test asserts the runtime works with the spec absent, so a copy of it defeats the test"
  else
    pass
  fi

  mkdir -p "$tmp/redrun"
  if node "$tmp/red/src/terrain.mjs" start --run-dir "$tmp/redrun" --workflow "$tmp/table.json" >/dev/null 2>"$tmp/red.err"; then
    pass
  else
    bad "the start act failed with the spec absent and the skill file reduced to its '!' line: $(head -2 "$tmp/red.err" | tr '\n' ' ')"
  fi

  if [ -f "$tmp/gold/run-record.json" ] && [ -f "$tmp/redrun/run-record.json" ]; then
    if diff -u <(normalise "$tmp/gold/run-record.json") <(normalise "$tmp/redrun/run-record.json") > "$tmp/diff" 2>&1; then
      pass
    else
      bad "the reduced tree's artifacts are NOT byte-equal to the golden run's — something the executor does is carried by the prose rather than by the code:
$(head -30 "$tmp/diff")"
    fi
  else
    bad "one of the two runs wrote no run record, so byte-equality could not be established — CANNOT-DETERMINE, never a pass"
  fi

  # THE DENY RIDES THE REMOVAL TEST (owner constraint, 2026-09-09). The
  # self-declared start attribution is only trustworthy because the Bash route
  # is denied, so a reduced tree in which the deny no longer fires has not
  # reproduced the golden run's guarantees however equal its artifacts are.
  redout=$(python3 "$tmp/red/.claude/hooks/gate-terrain-executor.py" <<'PY' 2>/dev/null
{"tool_name": "Bash", "tool_input": {"command": "node src/terrain.mjs start"}}
PY
)
  if printf '%s' "$redout" | grep -q '"permissionDecision": "deny"'; then pass; else
    bad "the deny does not fire in the reduced tree — the start act's self-declared executor kind is unguarded there, so the artifacts being equal proves less than it appears to"
  fi
fi

if [ "$fail" -eq 0 ]; then
  note "ok: $cases case(s) pass — the executor's Bash route denied with --status admitted, the skill file's single start line, and the removal test's byte-equal artifacts with the spec absent and the deny still firing (kogaki#1027)"
  note "not asserted here: that either hook is REGISTERED on this machine. That wiring is machine-local and never committed, so asserting it would fail on every fresh clone and would be a claim about a machine rather than about this repository."
fi
exit "$fail"
