#!/usr/bin/env bash
# The Move ingestion carrier's fixture pass (kogaki#876).
#
# A THIN INVOKER over `python3 tools/move_ingest.py --self-test`, on the
# arrangement check-terrain-runtime.sh and check-draft-runtime.sh already use:
# the cases are functions of the module's own grammar, parser, validator and
# renderer and drive them end to end, so they live with the module. Seam-free
# by construction — every case builds its own text or a temporary directory,
# and the pass reaches no gateway and no network.
#
# WHY THIS MEMBER EXISTS, and the half that is not about kogaki#876 at all:
# `tools/move_ingest.py` carried a full self-test and NO REGISTERED CHECK
# INVOKED IT. The suite runs only what checks/registry.json names (founding
# spec §4), so §6.9.0's four admission conditions, the whole-file-collapse
# refusal, the count instrument, the id-collision atomicity and the §6.9.2
# verdict-token construction constraint were every one of them unenforced —
# a future edit re-broke any of them with no CI signal. That is the same shape
# as the defect check-terrain-runtime.sh was admitted for: an assertion present,
# correct, and observed by nothing.
#
# WHAT THE PASS ASSERTS is not restated here (kogaki#661) — the count is
# `case_floor` in the registry and the pass prints its own. By property: the
# four §6.9.0 conditions with their offending lines named; the parsed-record
# count rendered first and unconditionally; §6.9.1a's round trip and filename
# derivation; INDEX regenerated whole with every column read off a file;
# §6.9.2's verdict token unrenderable on a row; and, from kogaki#876, the
# closed kind set's own two malformations, a formless record left byte-
# identical through the round trip, a conforming form admitted and rendered in
# the KIND's role order, the three refusals a form owes plus the no-kind and
# empty-role cases, condition 3 still refusing a ninth key and a seventh, the
# nesting admitted by NAME rather than by shape, and the shipped axis record
# admitted at its committed bytes.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== move ingestion fixture pass (kogaki#876)"

OUT=$(python3 tools/move_ingest.py --self-test 2>&1); RC=$?
printf '%s\n' "$OUT"
if [[ $RC -ne 0 ]] || ! grep -q "move_ingest self-test:" <<<"$OUT"; then
  echo "FAIL: the ingestion fixture pass did not run clean — the cases live with the module and this member only invokes them"
  exit 1
fi

# THE FLOOR IS READ FROM THE REGISTRY, never hardcoded here (kogaki#661).
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'move-ingest'))
") || { echo "FAIL: could not read case_floor for move-ingest from checks/registry.json"; exit 1; }
N=$(sed -n 's/^move_ingest self-test: \([0-9][0-9]*\) checks, .*/\1/p' <<<"$OUT")
if [[ -z "$N" ]]; then
  echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"
  exit 1
fi
if (( N < FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST rather than broken, and this member would otherwise report their absence as evidence (kogaki#661)"
  exit 1
fi

# THE ONE ASSERTION THIS MEMBER HOLDS ITSELF, and it is here rather than in the
# pass because its subject is the TREE rather than the module: every record in
# `moves/` is validated against the LIVE closed set. The pass's shipped-record
# case covers the one record kogaki#876 names; this covers record N+1, which is
# exactly the one a later admission act adds and no fixture knows about.
LIVE=$(python3 -c "
import os, sys
sys.path.insert(0, 'tools')
import move_ingest as m
bad = []
for name in sorted(os.listdir('moves')):
    if not name.endswith('.md') or name == 'INDEX.md':
        continue
    path = os.path.join('moves', name)
    try:
        mapping = m.read_saved(path)
        m.check_field_set(mapping, 1)
        m.check_visual_form(mapping, 1)
    except Exception as exc:
        bad.append('%s: %s' % (path, exc))
        continue
    if m.render_move(mapping) != open(path).read():
        bad.append('%s: does not round-trip through the renderer' % path)
for line in bad:
    print(line)
print('COUNTED %d' % len([n for n in os.listdir('moves') if n.endswith('.md') and n != 'INDEX.md']))
" 2>&1) || { echo "FAIL: the live read over moves/ could not run"; printf '%s\n' "$LIVE"; exit 1; }
printf '%s\n' "$LIVE" | grep -v '^COUNTED ' || true
if grep -qv '^COUNTED ' <<<"$LIVE"; then
  echo "FAIL: a record in moves/ does not satisfy §6.9.0 condition 3 or §6.9.3 against the live kind set"
  exit 1
fi
COUNT=$(sed -n 's/^COUNTED \([0-9][0-9]*\)$/\1/p' <<<"$LIVE")
if [[ -z "$COUNT" || "$COUNT" -lt 1 ]]; then
  echo "FAIL: no record was read from moves/ — a pass over an empty set is a check that never looked"
  exit 1
fi

echo "ok: ingestion fixture pass ran ${N} case(s) clean at or above its floor of ${FLOOR}; ${COUNT} shipped record(s) validate against the live kind set"
exit 0
