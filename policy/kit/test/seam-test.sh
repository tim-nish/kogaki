#!/usr/bin/env bash
# The client kit's response-validation guarantee, driven over the REAL wire
# (kogaki#1186 Act 3, as revised 2026-09-25 and corrected 2026-09-28).
# `test/install-test.sh` covers `classifyToolResult` as a pure fixture and the
# wiring between it and a STUBBED response; neither proves the real Gateway
# build publishes an `outputSchema` this transport can read, or that a real
# `isError: true` answer is shaped the way the stubs assume. Only a run against
# the real Gateway, over its real transport, against a real (if minimal) Hub,
# can tell those apart.
#
# The read this test protects is the one Admission sends: `rules_lookup` with
# an admit situation. That is the read that, on 2026-09-22, arrived at a
# consumer as "the hub holds no Rule" while the Hub held two that applied.
# `rules_lookup` is a denominator answer and never reports a miss — a
# situation no Rule addresses, and even a Hub holding no Rule at all, answer
# `hit` with the count in the lines (found 2026-09-28 against the real build)
# — so the NoData arm is driven through `glossary_entry`, the one served tool
# a fixture Hub can answer `nodata` on from a single copied surface row.
#
# TWO MACHINE-LOCAL INPUTS, NEITHER COMMITTED (kogaki#9's own polarity,
# applied to a second seam): `$TSUREZURE_GATEWAY_JS` names the built Gateway
# entry point, `$TSUREZURE_HUB_PATH` names a real Hub checkout this test
# copies FROM to build a small, throwaway fixture Hub. EITHER UNSET FAILS,
# NAMING THE VARIABLE, rather than degrading or skipping: a seam test that
# quietly passed with nothing to test against would be the exact silent-pass
# shape this Issue removes. This file is NOT a registered suite member: CI
# carries neither variable (kogaki#1194's retention standard declined the
# stub-driven member on 2026-09-25, and a member red by construction on every
# CI run is not a check). The orchestrating session runs it before merge.
set -euo pipefail

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

[[ -n "${TSUREZURE_GATEWAY_JS:-}" ]] \
  || fail "\$TSUREZURE_GATEWAY_JS is unset — this seam test starts the real Gateway build it names and has nothing to start without it"
[[ -f "$TSUREZURE_GATEWAY_JS" ]] \
  || fail "\$TSUREZURE_GATEWAY_JS names $TSUREZURE_GATEWAY_JS, which is not a readable file"

[[ -n "${TSUREZURE_HUB_PATH:-}" ]] \
  || fail "\$TSUREZURE_HUB_PATH is unset — the fixture Hub this seam test drives the Gateway against is built by copying from it"
[[ -d "$TSUREZURE_HUB_PATH" ]] \
  || fail "\$TSUREZURE_HUB_PATH names $TSUREZURE_HUB_PATH, which is not a readable directory"

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QUERY="$KIT_DIR/bin/gateway-query.mjs"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# ---------------------------------------------------------------- the fixture Hub
# `scripts/`, `PACKAGE-MANIFEST.json` and exactly one Rule file, copied from
# the real checkout rather than invented here: this test asserts against the
# real Hub's own shape, never a shape this file guesses at. The Rule source
# glob and the consumer the fixture is driven as are both READ OFF THE COPIED
# MANIFEST, so a Hub that moves its Rules or its visibility grants moves this
# test with it.
FIXTURE_HUB="$TMP/hub"
mkdir -p "$FIXTURE_HUB"

[[ -d "$TSUREZURE_HUB_PATH/scripts" ]] \
  || fail "\$TSUREZURE_HUB_PATH ($TSUREZURE_HUB_PATH) carries no scripts/ directory to copy"
cp -r "$TSUREZURE_HUB_PATH/scripts" "$FIXTURE_HUB/scripts"

[[ -f "$TSUREZURE_HUB_PATH/PACKAGE-MANIFEST.json" ]] \
  || fail "\$TSUREZURE_HUB_PATH ($TSUREZURE_HUB_PATH) carries no PACKAGE-MANIFEST.json to copy"
cp "$TSUREZURE_HUB_PATH/PACKAGE-MANIFEST.json" "$FIXTURE_HUB/PACKAGE-MANIFEST.json"

# The `where` axis resolves repository slugs from the Hub's project view at
# match time (scope_vocabulary's own note), so that view travels with the
# fixture when the Hub carries one; without it `where=<consumer>` could not
# match and the Hit arm would read as NoData for a reason that is not the
# wire's.
if [[ -f "$TSUREZURE_HUB_PATH/views/PROJECTS.jsonl" ]]; then
  mkdir -p "$FIXTURE_HUB/views"
  cp "$TSUREZURE_HUB_PATH/views/PROJECTS.jsonl" "$FIXTURE_HUB/views/PROJECTS.jsonl"
fi

MANIFEST_READ=$(python3 - "$FIXTURE_HUB/PACKAGE-MANIFEST.json" <<'PY'
import json, sys
m = json.load(open(sys.argv[1], encoding="utf-8"))
src = (m.get("kinds") or {}).get("rule", {}).get("source")
vis = m.get("visibility") or {}
consumers = [k for k in vis if not k.startswith("_") and "rule" in (vis[k] or [])]
elements = ((m.get("serving_mechanisms") or {}).get("element-manifest") or {}).get("reads")
if not src or not consumers or not elements:
    sys.exit("manifest declares no rule source, no consumer granted the rule Kind, or no element-manifest surface")
print(json.dumps({"source": src, "consumer": sorted(consumers)[0], "elements": elements}))
PY
) || fail "the copied manifest does not declare what this test needs: $MANIFEST_READ"
RULE_GLOB=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["source"])' "$MANIFEST_READ")
CONSUMER=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["consumer"])' "$MANIFEST_READ")
ELEMENTS_REL=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["elements"])' "$MANIFEST_READ")

# ONE ROW of the element manifest, for the NoData arm: `glossary_entry`
# resolves a name against this surface, and a surface the fixture does not
# carry answers `surface-unreadable` (an Error), not `nodata`. One real row
# makes it a readable surface that holds no row by the name the arm asks for.
[[ -f "$TSUREZURE_HUB_PATH/$ELEMENTS_REL" ]] \
  || fail "\$TSUREZURE_HUB_PATH ($TSUREZURE_HUB_PATH) carries no $ELEMENTS_REL, which the manifest declares as the element-manifest surface"
mkdir -p "$FIXTURE_HUB/$(dirname "$ELEMENTS_REL")"
head -n1 "$TSUREZURE_HUB_PATH/$ELEMENTS_REL" > "$FIXTURE_HUB/$ELEMENTS_REL"

# ONE Rule file: the first by name under the declared source glob, for a
# reproducible pick across runs. Its Scope is read off its own frontmatter so
# the Hit situation is the one THIS Rule is addressed to, never a guess.
RULE_FILE="$(cd "$TSUREZURE_HUB_PATH" && ls $RULE_GLOB 2>/dev/null | sort | head -n1)"
[[ -n "$RULE_FILE" ]] \
  || fail "no Rule file matches the manifest's rule source ($RULE_GLOB) under \$TSUREZURE_HUB_PATH ($TSUREZURE_HUB_PATH)"
mkdir -p "$FIXTURE_HUB/$(dirname "$RULE_FILE")"
cp "$TSUREZURE_HUB_PATH/$RULE_FILE" "$FIXTURE_HUB/$RULE_FILE"

SCOPE_READ=$(python3 - "$FIXTURE_HUB/$RULE_FILE" "$CONSUMER" <<'PY'
import re, sys
text = open(sys.argv[1], encoding="utf-8").read()
consumer = sys.argv[2]
fm = text.split("---", 2)[1] if text.startswith("---") else ""
axes = {}
for axis in ("artifact", "act", "actor", "where"):
    m = re.search(r"^\s*%s:\s*\[([^\]]*)\]" % axis, fm, re.M)
    if not m:
        sys.exit("the copied Rule declares no `%s` axis in its scope" % axis)
    axes[axis] = [v.strip() for v in m.group(1).split(",") if v.strip()]
def pick(axis, fallback):
    vals = axes[axis]
    return fallback if vals == ["any"] or vals == ["all"] else vals[0]
hit = "artifact=%s,act=%s,actor=%s,where=%s" % (
    pick("artifact", "issue"), pick("act", "admit"), pick("actor", "harness"), consumer)
print(hit)
PY
) || fail "could not read the copied Rule's scope: $SCOPE_READ"
HIT_SITUATION="$SCOPE_READ"
ABSENT_NAME="kogaki-seam-test-absent-9f3c2a1"

# The Gateway pins every answer to the Hub's HEAD and refuses to start on a
# directory that has none, so the fixture is committed once, as itself.
git -C "$FIXTURE_HUB" init -q \
  || fail "could not initialise the fixture Hub as a git repository"
git -C "$FIXTURE_HUB" -c user.name=seam-test -c user.email=seam-test@kogaki add -A
git -C "$FIXTURE_HUB" -c user.name=seam-test -c user.email=seam-test@kogaki commit -q -m "seam-test fixture Hub" \
  || fail "could not commit the fixture Hub"

# A THROWAWAY OPERATOR CONFIG points the real Gateway build at the fixture
# Hub rather than at any real, machine-configured one — the Gateway resolves
# its Hub from operator config, never from a CLI flag this kit passes
# (kogaki#9: machine-local configuration, never directory adjacency).
CONFIG="$TMP/gateway.json"
HUB_JSON=$(node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$FIXTURE_HUB")
printf '{"hubPath": %s}\n' "$HUB_JSON" > "$CONFIG"

call() {
  TSUREZURE_CONFIG="$CONFIG" node "$QUERY" --consumer "$1" --tool "$2" \
    --args "$3" --gateway "$TSUREZURE_GATEWAY_JS" 2>&1
}
situation_args() {
  python3 -c 'import json,sys; print(json.dumps({"situation": sys.argv[1]}))' "$1"
}
outcome_of() {
  # The FIRST line of stdout is the re-serialised structuredContent (one per
  # framing); the outcome token is read off it as JSON, never grepped, so a
  # token that moved case or key would fail here by name.
  printf '%s\n' "$1" | python3 -c 'import json,sys; print(json.loads(sys.stdin.readline()).get("outcome"))' 2>/dev/null || echo "<unparseable>"
}

# ---------------------------------------------------------------- the three outcomes

# 1. HIT — the situation the copied Rule is addressed to, as the consumer the
#    manifest grants sight of the rule Kind. Exit 0, `outcome: hit`, and the
#    Rule's own content in the lines.
set +e
OUT=$(call "$CONSUMER" rules_lookup "$(situation_args "$HIT_SITUATION")")
CODE=$?
set -e
[[ $CODE -eq 0 ]] || fail "the Hit call over the real wire exited $CODE, want 0. situation=$HIT_SITUATION output: $OUT"
[[ "$(outcome_of "$OUT")" == "hit" ]] \
  || fail "the real Gateway did not answer outcome: hit for the one Rule the fixture Hub carries. situation=$HIT_SITUATION output: $OUT"
printf '%s\n' "$OUT" | head -n1 | grep -q '"build"' \
  || fail "the printed result is not the structuredContent: it carries no \`build\` field. output: $OUT"
printf '%s\n' "$OUT" | head -n1 | grep -q 'scope-match: applies' \
  || fail "the Hit did not carry the copied Rule's own scope-match: applies line. output: $OUT"
echo "ok: a real rules_lookup call in the copied Rule's own situation exits 0 and carries outcome: hit"

# 2. NoData — a name the fixture's one element-manifest row does not carry,
#    same consumer. Exit 0 and `outcome: nodata`; the caller branches on it
#    and never mistakes it for a stopped act.
set +e
OUT=$(call "$CONSUMER" glossary_entry "$(python3 -c 'import json,sys; print(json.dumps({"name": sys.argv[1]}))' "$ABSENT_NAME")")
CODE=$?
set -e
[[ $CODE -eq 0 ]] || fail "the NoData call over the real wire exited $CODE, want 0. name=$ABSENT_NAME output: $OUT"
[[ "$(outcome_of "$OUT")" == "nodata" ]] \
  || fail "the real Gateway did not answer outcome: nodata for a name the fixture Hub's element manifest does not hold. name=$ABSENT_NAME output: $OUT"
echo "ok: a real glossary_entry call for a name the fixture Hub does not hold exits 0 and carries outcome: nodata"

# 3. Error — a call as a consumer the copied manifest's visibility block does
#    NOT list. The Gateway answers `isError: true` with `not-permitted`; the
#    transport must stop the calling act at exit 14 with nothing on stdout.
#    (An undeclared argument cannot be this arm: the transport refuses it
#    locally at exit 13 and the call never reaches the wire.)
UNLISTED="kit-seam-test-unlisted-consumer"
set +e
OUT=$(call "$UNLISTED" rules_lookup "$(situation_args "$HIT_SITUATION")")
CODE=$?
set -e
[[ $CODE -eq 14 ]] \
  || fail "a rules_lookup call as an unlisted consumer exited $CODE, want 14 (gateway error) — the calling act must stop rather than continue as if it had read an empty source. output: $OUT"
printf '%s\n' "$OUT" | grep -q '^gateway error: not-permitted:' \
  || fail "the exit-14 refusal does not carry the Gateway's own code on its marker line: $OUT"
[[ "$(printf '%s\n' "$OUT" | grep -vc '^gateway error:')" -eq 0 ]] \
  || fail "the exit-14 refusal printed more than its one stderr line: $OUT"
echo "ok: a real rules_lookup call as an unlisted consumer stops the calling act at exit 14, naming not-permitted, and prints nothing else"

echo "seam-test: real Gateway, real fixture Hub, all three outcomes (hit, nodata, error) driven through gateway-query.mjs as consumer $CONSUMER (kogaki#1186)"
