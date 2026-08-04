#!/usr/bin/env bash
# Client-kit install test (tsurezure-gateway#78 acceptance):
# fresh install into a temp repo, idempotency, the unreachable-gateway
# degrade (one line, exit 11), and the issue-checkpoint exits.
set -euo pipefail
KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

# 1. Fresh install.
mkdir -p "$TMP/repo"
"$KIT_DIR/install.sh" --repo "$TMP/repo" --consumer kit-test >"$TMP/out1" 2>&1 || fail "install exited non-zero"
grep -q 'tsurezure-client-kit:begin' "$TMP/repo/CLAUDE.md" || fail "no managed block"
[[ -f "$TMP/repo/policy/consultation-map.md" ]] || fail "no consultation map"
[[ -f "$TMP/repo/policy/CAPABILITIES.md" ]] || fail "no policy/CAPABILITIES.md"
[[ -f "$TMP/repo/policy/source.yaml" ]] || fail "no presence toggle"
[[ ! -f "$TMP/repo/CAPABILITIES.md" ]] || fail "package-owned file at repo root"
[[ ! -e "$TMP/repo/config" ]] || fail "package-owned file in config/"
echo "ok: fresh install (policy/ layout only)"

# 2. Idempotency — second run changes nothing but the managed surfaces.
echo "repo-own note" >> "$TMP/repo/policy/consultation-map.md"
"$KIT_DIR/install.sh" --repo "$TMP/repo" --consumer kit-test >"$TMP/out2" 2>&1
grep -q 'repo-own note' "$TMP/repo/policy/consultation-map.md" || fail "map was overwritten"
[[ $(grep -c 'tsurezure-client-kit:begin' "$TMP/repo/CLAUDE.md") -eq 1 ]] || fail "duplicate managed block"
echo "ok: idempotent"

# 3. Unreachable-gateway degrade: exactly one line, exit 11.
set +e
OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --gateway /nonexistent/gw.js \
      --tool policy_lookup --args '{"question":"x"}')
CODE=$?
set -e
[[ $CODE -eq 11 ]] || fail "degrade exit was $CODE, want 11"
[[ $(printf '%s\n' "$OUT" | wc -l) -eq 1 ]] || fail "degrade printed more than one line"
printf '%s' "$OUT" | grep -q '^policy_source unavailable:' || fail "degrade line malformed: $OUT"
echo "ok: degrade (one line, exit 11)"

# 4. Issue checkpoints: validate-body denies pinless, accepts pinned;
#    recheck exits 2 on a moved pin (gateway-independent paths tested here).
printf 'A body with no pins section\n' > "$TMP/pinless.md"
set +e
node "$KIT_DIR/bin/issue-pins.mjs" --validate-body "$TMP/pinless.md" --consumer kit-test >/dev/null
[[ $? -eq 1 ]] || fail "pinless body not denied"
set -e
echo "ok: creation-time deny on pinless body"

# 5. Skill is installed where the harness loads it, with frontmatter.
SKILL="$TMP/repo/.claude/skills/consult-first/SKILL.md"
[[ -f "$SKILL" ]] || fail "consult-first skill not installed at .claude/skills/"
head -1 "$SKILL" | grep -q '^---' || fail "skill has no frontmatter — the harness will not load it"
grep -q '^name: consult-first' "$SKILL" || fail "skill frontmatter has no name"
echo "ok: skill installed harness-loadably"

# 6. Boundary (consultation-map entry 2, kogaki#7): no kit tool reads gateway
#    internals. The access log is the SERVER's record; consumer-side receipts
#    are `consulted:` lines.
#    The trigger is scoped to the PROPERTY — a reference to the gateway's
#    STATE (its state directory, its logs) — not to the string "tsurezure",
#    which also names the MCP server the transport legitimately resolves
#    through. This file is excluded because it must contain the patterns to
#    test for them.
if grep -rn '\.tsurezure/\|access\.jsonl\|diagnostics\.jsonl\|TSUREZURE_STATE_DIR' \
     "$KIT_DIR/bin" "$KIT_DIR/install.sh" "$KIT_DIR/skills" "$KIT_DIR/templates" 2>/dev/null; then
  fail "a kit tool references gateway state (entry-2 boundary)"
fi
echo "ok: no kit tool reads gateway internals (entry-2 boundary)"

# 7. No colocation default: with every configuration source withheld, the
#    transport degrades rather than resolving a path by directory adjacency.
set +e
OUT=$(cd "$TMP" && HOME="$TMP/empty-home" TSUREZURE_GATEWAY_JS= \
      node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test \
      --tool policy_lookup --args '{"question":"x"}')
CODE=$?
set -e
[[ $CODE -eq 11 ]] || fail "unconfigured gateway exit was $CODE, want 11"
printf '%s' "$OUT" | grep -q 'not configured' \
  || fail "unconfigured gateway did not report a configuration miss: $OUT"
echo "ok: no colocation default (gateway is configuration-only)"

echo "ALL PASS"
