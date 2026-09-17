#!/usr/bin/env bash
# Consultation-map pinned quotes, RE-RESOLVED at the served pin (kogaki#1142).
#
# WHAT THIS IS FOR. `policy/consultation-map.md`'s own contract says an entry
# quotes the served line at its pin and that "on divergence the served surface
# wins and the entry is repaired". Until this member existed nothing in the
# suite read a pinned quote, so the divergence was invisible: the hub retired
# its `topics/` directory at product-lab#326 (2026-09-07), the entries' read
# prescriptions were repaired to `surface_names`, and 23 references to
# `topics/*.md` paths sat in the file for ten days with nothing that could
# notice. A pinned quote is a receipt — a claim about content at a hash — and a
# receipt nothing re-resolves is the third carrier of hub fact the 2026-09-17
# consult failure exposed, beside the gateway's legacy matcher and the kit's
# unchecked arguments.
#
# WHAT IT READS, AND THE GRAMMAR IS NARROW ON PURPOSE.
#
#   · A UnitID ADDRESS token — `<package>::<kind>/<local-name>@<64-hex>` —
#     ANYWHERE in the file, indented or not, inside backticks or not. The token
#     is unambiguous, so no keyword is needed to introduce it and an entry's pin
#     can stay inside the list structure it belongs to.
#   · A LEGACY address on a COLUMN-0, UNWRAPPED `consulted:` line — a
#     `gloss_sha=` join key or a `<file>:<line>` position. Reported as
#     unresolvable IN THAT FORM rather than resolved, so the entry gets
#     repointed to an address instead of this checker learning the old grammar.
#     Refusing to learn it is the ruling kogaki#603 already made: "No
#     reconciliation, re-pinning, relocation, or drift-compensation mechanism
#     may be introduced."
#   · A column-0 `frozen:` line is PROVENANCE and is counted, never resolved.
#     kogaki#603's owner ruling keeps a reference frozen at its pin — read only
#     ever at that revision — legitimate in its frozen form, and this member
#     would otherwise report every historical citation in the file's own
#     drift-repair record as a finding.
#
# THE COLUMN-0 RULE ON THE LEGACY SCAN IS INHERITED, not invented here. It is
# the use-vs-mention boundary `parseCites` already draws and kogaki#274 arm 2
# ratified for this very file: an unindented, unwrapped `consulted:` line is an
# EMISSION, and the same text in prose or backticks is a MENTION. This file is
# mostly prose ABOUT consulted lines, and a scanner without that rule reports
# its own documentation.
#
# THE REACH, and it is narrower than "the quote is verified" — see the
# unconditional disclosure at the end of this file, which prints on a pass too.
set -uo pipefail
# Repo root resolved by git from THE SCRIPT's location, never by depth and
# never from the caller's CWD — the idiom check-owner-surface-pins.sh states in
# full (kogaki#724).
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" || {
  echo "FAIL: cannot resolve the repository root from this script's location"
  exit 1
}

MAP="policy/consultation-map.md"
FIXTURE="policy/kit/checks/fixtures/map-pins/map-one-of-each.md"

echo "== consultation-map pinned quotes, re-resolved at the served pin"

# ---------------------------------------------------------------------------
# THE SERVED MANIFEST, fetched ONCE for the whole run. `element_survey` with no
# kind filter returns every unit's `unit_id` and `content_hash` in one call, so
# both the fixture pass and the real pass resolve against one fetch and this
# member costs one gateway round trip rather than one per pin.
# Written to a file rather than held in a variable: the manifest is ~850 KB and
# passing it to python3 through the environment exceeds the argument-list limit,
# which fails as "Argument list too long" AFTER the gateway call was already
# spent — a degradation that looks nothing like one.
SURVEY_FILE=$(mktemp)
trap 'rm -f "$SURVEY_FILE"' EXIT
node policy/kit/bin/gateway-query.mjs --consumer kogaki --tool element_survey --args '{}' > "$SURVEY_FILE" 2>&1
SURVEY_RC=$?
if [[ $SURVEY_RC -ne 0 ]] || grep -q '^policy_source unavailable:' "$SURVEY_FILE"; then
  # DEGRADED IS NOT GREEN (kogaki#1142 acceptance 4), on the kit's one degrade
  # contract — and it is not RED either. `tools/run-registered-checks.sh` grades
  # exit 11 `degrade`: the member is named on the run's own `degraded:` line, the
  # head's full-pass verdict is withheld from the cache so the next run executes
  # instead of reusing a verdict this member did not answer for, and the suite
  # does not fail. With no configured gateway this member therefore reports that
  # it DID NOT RUN, which is the whole point: "the seam was not there" and "the
  # seam answered correctly" are the two states this member exists to tell apart,
  # and a silent exit 0 would merge them.
  grep '^policy_source unavailable:' "$SURVEY_FILE" ||
    echo "policy_source unavailable: the served manifest could not be read (element_survey exited $SURVEY_RC)"
  echo "FAIL: no served surface to re-resolve against — a pin this member could not resolve is NOT a pin it verified"
  exit 11
fi

# ---------------------------------------------------------------------------
# One resolution pass over one map file. Prints one line per pin and exits
# non-zero on any `moved` or `stale`.
resolve_map() {
  MAP_PATH="$1" SURVEY_FILE="$SURVEY_FILE" python3 - <<'PY'
import json, os, re, sys

path = os.environ["MAP_PATH"]
survey = json.load(open(os.environ["SURVEY_FILE"], encoding="utf-8"))

# unit_id -> content_hash, from the served manifest.
served = {}
for line in survey.get("lines", []):
    rec = json.loads(line["text"])
    served[rec["unit_id"]] = rec["content_hash"]
if not served:
    print("FAIL: the served manifest returned no units — a trial that did not run is not a trial that passed")
    sys.exit(11)

UNIT = re.compile(r"([a-z0-9-]+::[a-z]+/[a-z0-9./-]+)@([0-9a-f]{64})")
GLOSS_SHA = re.compile(r"gloss_sha=([0-9a-f]{64})")
# `,` and `=` are in the path class because a served rendering's own filename
# carries the cell's `axis=value` pairs (`views/lessons/tag=agents,window=2026-08.md`),
# and a class that stopped at the comma reported the tail as the whole path.
POSITION = re.compile(r"([\w./,=-]+\.md):(\d+(?:-\d+)?)")

lines = open(path, encoding="utf-8").read().split("\n")

# THE ENTRY LABEL is the nearest preceding heading, so a report line names the
# entry rather than only a line number — "entry 1" is what a reader repairs,
# and a bare line number moves with every edit above it.
heading = "(preamble)"
headings = []
for text in lines:
    m = re.match(r"^#{1,4}\s+(.*)$", text)
    if m:
        heading = re.sub(r"\s+", " ", m.group(1)).strip()
        if len(heading) > 62:
            heading = heading[:59] + "..."
    headings.append(heading)

findings = []   # (status, label)
frozen = 0

for i, text in enumerate(lines):
    label_at = lambda: "%s:%d  %s" % (path, i + 1, headings[i])

    if text.startswith("frozen:"):
        frozen += 1
        continue

    for unit_id, pinned in UNIT.findall(text):
        current = served.get(unit_id)
        if current is None:
            findings.append(("stale", "%s\n    %s — resolves to nothing at the served pin" % (label_at(), unit_id)))
        elif current != pinned:
            findings.append(("moved", "%s\n    %s\n    moved %s to %s" % (label_at(), unit_id, pinned[:12], current[:12])))
        else:
            findings.append(("resolved", "%s\n    %s@%s" % (label_at(), unit_id, pinned[:12])))

    # The legacy scan, COLUMN 0 and unwrapped only — the emission-vs-mention
    # boundary this file's own kogaki#274 arm 2 ratified.
    if text.startswith("consulted:") and not UNIT.search(text):
        m = GLOSS_SHA.search(text)
        if m:
            findings.append(("stale", "%s\n    gloss_sha=%s — a LEGACY join key, not an address; unresolvable in that form"
                             % (label_at(), m.group(1)[:12])))
            continue
        m = POSITION.search(text)
        if m:
            findings.append(("stale", "%s\n    %s:%s — a LEGACY <file>:<line> position, not an address; unresolvable in that form"
                             % (label_at(), m.group(1), m.group(2))))
            continue
        m = re.search(r"slug=([a-z0-9-]+)\s+kind=(lesson|journey)", text)
        if m:
            findings.append(("stale", "%s\n    slug=%s kind=%s — a LEGACY file-scoped form, not an address; unresolvable in that form"
                             % (label_at(), m.group(1), m.group(2))))
            continue
        findings.append(("stale", "%s\n    a consulted: emission carrying no resolvable address" % label_at()))

for status, label in findings:
    print("  %-8s %s" % (status, label))

counts = {"resolved": 0, "moved": 0, "stale": 0}
for status, _ in findings:
    counts[status] += 1
print("  pins: %d resolved, %d moved, %d stale; %d frozen reference(s) not resolved"
      % (counts["resolved"], counts["moved"], counts["stale"], frozen))
sys.exit(1 if counts["moved"] or counts["stale"] else 0)
PY
}

FAIL=0

# ---------------------------------------------------------------------------
# THE FIXTURE PASS — one resolved, one moved, one stale, exercising all three
# arms every run (acceptance 2). It runs FIRST: a member whose discrimination
# is unproven has nothing to say about the real file, and a green real pass
# with a dead fixture is exactly the silence this member was admitted against.
echo "-- fixture pass ($FIXTURE)"
FIX_OUT=$(resolve_map "$FIXTURE")
FIX_RC=$?
printf '%s\n' "$FIX_OUT" | sed 's/^/  /'
if [[ $FIX_RC -eq 0 ]]; then
  echo "FAIL: the fixture carries a moved pin and a stale pin and the pass exited 0 — the refusal arms are dead"
  FAIL=1
fi
FIX_TALLY=$(printf '%s\n' "$FIX_OUT" | sed -n 's/.*pins: \([0-9]*\) resolved, \([0-9]*\) moved, \([0-9]*\) stale.*/\1 \2 \3/p' | head -1)
if [[ "$FIX_TALLY" != "1 1 1" ]]; then
  echo "FAIL: the fixture pass reported '${FIX_TALLY:-<unreadable>}' where '1 1 1' (one resolved, one moved, one stale) is what exercises all three arms"
  FAIL=1
else
  echo "  ok: the fixture discriminated one resolved, one moved and one stale pin"
fi

# ---------------------------------------------------------------------------
# THE REAL PASS.
echo "-- $MAP"
MAP_OUT=$(resolve_map "$MAP")
MAP_RC=$?
printf '%s\n' "$MAP_OUT" | sed 's/^/  /'
if [[ $MAP_RC -eq 11 ]]; then
  echo "FAIL: the served manifest held no units — degraded, never green"
  exit 11
fi
if [[ $MAP_RC -ne 0 ]]; then
  echo "FAIL: a pinned quote in $MAP no longer resolves at the served pin. The map's own contract is that on divergence the SERVED SURFACE WINS and the entry is repaired — repoint the entry to the address printed above, or, where the reference is historical and read only at its own revision, restate it as a column-0 'frozen:' line per kogaki#603."
  FAIL=1
else
  echo "  ok: every pinned quote in $MAP resolves at the served pin, at the content hash it carries"
fi

# UNCONDITIONAL — the reach is declared on a pass as well as a failure, because
# a member that announced its limit only when it fired would be silent in
# exactly the state that misleads (the rule check-owner-surface-pins.sh states
# for story 1.50 AC5, applied here for the same reason).
cat <<'EOF'
reach of this check, stated rather than implied: it resolves an ADDRESS. A
`resolved` line means the served surface still carries that unit at that content
hash — it does NOT mean the text quoted beside the address in the map is what
the surface serves there. The hub re-renders its units in plain register, so a
quote cut from a retired raw line can sit beside an address that resolves
perfectly. Re-cutting the map's quotes to the served text at their new addresses
is its own act and is named in the map rather than performed here.
not carried here: any legacy `gloss_sha=` or `<file>:<line>` form sitting in
INDENTED or backticked prose. The legacy scan runs at column 0 on unwrapped
`consulted:` lines only — the emission-vs-mention boundary kogaki#274 arm 2
ratified for this file — so a legacy pin buried in a paragraph is invisible
here. That is why kogaki#1142 repointed the entries in the same change as
landing this member: the check is green at landing because the file was
repaired, not because the file was scanned exhaustively.
also not carried here: whether an entry SHOULD cite the unit it cites. That is
judgment, and it stays with the admission act.
EOF
exit $FAIL
