#!/usr/bin/env bash
# The capture hook's seam (kogaki#890).
#
# WHAT THIS CHECKS THAT NOTHING ELSE CAN. `src/terrain.mjs`'s own `self-test`
# drives the hook end to end — it writes a row, it refuses to choose between
# two outstanding raisings, and the executor refuses the three removed flags by
# name — so the BEHAVIOUR is covered there, beside the code it belongs to.
# What that pass cannot show is the one thing this file exists for: the
# option-set digest is computed TWICE, once in Python inside the hook and once
# in JavaScript inside the runtime, because the two sit on opposite sides of a
# harness seam with no module to share. Two implementations of one value is a
# divergence waiting to happen, and a self-test that drives both at once would
# agree with itself even if both were wrong together — so this computes each
# one independently and compares them.
#
# The second half asserts the hook's INSTALLABILITY facts, which are the ones a
# reader would otherwise have to take on trust: the file exists, it parses, and
# the executor names it in the refusal an unanswered gate raises. Its
# REGISTRATION is deliberately not asserted — that wiring is machine-local and
# never committed, so a check asserting it would fail on every fresh clone and
# would be asserting a fact about a machine rather than about this repository.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
note() { printf '%s\n' "$*"; }
bad() { printf 'FAIL — %s\n' "$*"; fail=1; }

HOOK=.claude/hooks/write-gate-capture.py

[ -f "$HOOK" ] || { bad "$HOOK is missing — the owner's answer at a Terrain gate has no writer, and every declared gate refuses"; }
if [ -f "$HOOK" ]; then
  python3 -c "import ast,sys;ast.parse(open('$HOOK').read())" 2>/dev/null \
    || bad "$HOOK does not parse as Python — a hook that cannot load writes no row, and PostToolUse failures are silent to the model"
fi

# ---- THE DIGEST, COMPUTED ON BOTH SIDES OF THE SEAM.
# Deliberately over several shapes, including an empty option set and one whose
# ids need JSON escaping: the canonical form is a two-element array and the way
# two implementations drift is separator and escaping conventions, not the
# happy path.
for case in 'terrain-tag-selection|other-method' \
            'terrain-strand-selection|strand:a,strand:b,no-strand' \
            'terrain-id-selection|enter-no-groups' \
            'brief-thesis-adoption|' \
            'x"y|a b,c/d'; do
  gate=${case%%|*}
  ids=${case#*|}
  py=$(GATE="$gate" IDS="$ids" python3 - <<'PY'
import os, sys
sys.path.insert(0, ".claude/hooks")
import importlib.util
spec = importlib.util.spec_from_file_location("wgc", ".claude/hooks/write-gate-capture.py")
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
ids = [i for i in os.environ["IDS"].split(",") if i]
print(m.option_set_digest(os.environ["GATE"], ids))
PY
) || { bad "the hook's digest could not be computed for $gate"; continue; }
  js=$(GATE="$gate" IDS="$ids" node --input-type=module -e '
import { ownerGateDigest } from "./src/terrain.mjs";
const ids = process.env.IDS.split(",").filter(Boolean);
console.log(ownerGateDigest(process.env.GATE, ids));
' 2>/dev/null) || { bad "the runtime's digest could not be computed for $gate"; continue; }
  if [ "$py" != "$js" ]; then
    bad "the option-set digest DIVERGES across the harness seam for gate '$gate' with ids '$ids': hook=$py runtime=$js — a capture the hook writes would be refused by the runtime that reads it, on every gate, forever"
  fi
done

# ---- THE REFUSAL NAMES ITS CARRIER.
# A gate that refuses without naming the hook sends the owner round the
# render-the-question loop forever on a machine where the hook was never
# installed, which is the one state re-rendering cannot fix.
grep -q 'write-gate-capture\.py' src/terrain.mjs \
  || bad "src/terrain.mjs never names $HOOK — an unanswered gate's refusal must name the carrier that would answer it, because the un-installed machine is exactly the case re-rendering does not resolve"

for dead in capture-option capture-free-text tool-use-id; do
  grep -q "\"$dead\"" src/terrain.mjs \
    || bad "src/terrain.mjs no longer mentions --$dead — it must REFUSE it by name, not merely ignore it: an ignored flag is a session quietly getting a different act than it asked for"
done

if [ "$fail" -eq 0 ]; then
  note "ok: capture-hook seam enforced — one option-set digest across two implementations (5 shapes), the hook present and parsing, the removed flags refused by name, and the unanswered-gate refusal naming its carrier (kogaki#890)"
  note "not asserted here: that the hook is REGISTERED on this machine. That wiring is machine-local and never committed, so asserting it would fail on every fresh clone and would be a claim about a machine rather than about this repository — the executor's own refusal is what surfaces an uninstalled hook, at the moment it matters."
fi
exit "$fail"
