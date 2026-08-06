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

# 4b. The deferred-consult refusal (kogaki#29, story 1.11) must NOT become a
#     gateway dependency. `--recheck` enforces two obligations now — a moved
#     pin and an undischarged `consult: deferred-to-pickup` — and the second is
#     decidable from the body alone, which makes it tempting to refuse before
#     the gateway is consulted. That would convert the ratified degrade ("an
#     unreachable gateway never blocks filing or pickup", exit 11) into a block,
#     so the pin lookup stays first and this asserts the resulting order: with
#     the gateway down, an undischarged deferral still exits 11, never 2.
#     The four-way discrimination of the refusal itself (marker+receipt,
#     marker alone, no marker, fenced mention) needs a reachable gateway and is
#     therefore not exercised here — stated rather than left to look covered.
printf 'Policy pins: product-lab@0123abcdef01\n\nconsult: deferred-to-pickup\n' \
  > "$TMP/deferred.md"
set +e
OUT=$(TSUREZURE_GATEWAY_JS=/nonexistent/gw.js \
      node "$KIT_DIR/bin/issue-pins.mjs" --recheck "$TMP/deferred.md" \
      --consumer kit-test --gateway /nonexistent/gw.js 2>&1)
CODE=$?
set -e
[[ $CODE -eq 11 ]] || fail "unreachable gateway on a deferred body exited $CODE, want 11 (degrade must not become a block)"
[[ $(printf '%s\n' "$OUT" | wc -l) -eq 1 ]] || fail "recheck degrade printed more than one line: $OUT"
printf '%s' "$OUT" | grep -q '^policy_source unavailable:' \
  || fail "recheck exited 11 without the promised degrade line: $OUT"
echo "ok: deferred-consult refusal never overrides the gateway degrade (one line, exit 11)"

# 4c. The SAME assertion on the other entry point (kogaki#54). Both paths reach
#     the gateway through one helper, so both owe the header's promise ("11
#     gateway unavailable — one line printed"). This case exists because the
#     defect it guards was invisible for exactly as long as the contract lived
#     in a comment: `issue-pins.mjs` captured the child's stdout through
#     execFileSync's `encoding` and exited 11 having printed nothing, so a
#     consumer could not tell an honest degrade from a silent crash. A standing
#     exercise on both paths is what makes that a regression rather than a
#     rediscovery.
printf 'Policy pins: product-lab@0123abcdef01\n' > "$TMP/pinned.md"
set +e
OUT=$(TSUREZURE_GATEWAY_JS=/nonexistent/gw.js \
      node "$KIT_DIR/bin/issue-pins.mjs" --validate-body "$TMP/pinned.md" \
      --consumer kit-test --gateway /nonexistent/gw.js 2>&1)
CODE=$?
set -e
[[ $CODE -eq 11 ]] || fail "validate-body with an unreachable gateway exited $CODE, want 11"
[[ $(printf '%s\n' "$OUT" | wc -l) -eq 1 ]] || fail "validate-body degrade printed more than one line: $OUT"
printf '%s' "$OUT" | grep -q '^policy_source unavailable:' \
  || fail "validate-body exited 11 without the promised degrade line: $OUT"
echo "ok: validate-body degrade (one line, exit 11)"

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

# 8. Receipt mode (kogaki#66, story 1.20). Every property below is decidable
#    WITHOUT a reachable gateway — the wire behaviour by the degrade paths, the
#    composition by the emitter's own fixture pass (8e), which runs over
#    synthetic responses shaped like the gateway's. What no case here covers is
#    a composition against a LIVE response; that is stated rather than left to
#    look covered, the same way case 4b states its own limit.
#
# 8a. AC 4 — the transport REFUSES rather than assigning the outcome token.
#     `deferred-slot: consult-outcome-token-assignment` is open on kogaki#66,
#     so a default here would be code embedding an undecided choice. The
#     message must name the slot: a bare usage error would send the caller
#     looking for a syntax mistake instead of a pending decision.
set +e
OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --gateway /nonexistent/gw.js \
      --tool policy_lookup --args '{"question":"x"}' --receipt 2>&1)
CODE=$?
set -e
[[ $CODE -eq 2 ]] || fail "receipt mode without --outcome exited $CODE, want 2"
printf '%s' "$OUT" | grep -q 'consult-outcome-token-assignment' \
  || fail "the refusal does not name the deferred slot: $OUT"
if printf '%s' "$OUT" | grep -q '^consult'; then fail "a refusal emitted a receipt line: $OUT"; fi
echo "ok: receipt mode refuses rather than assigning the outcome token (AC 4)"

# 8b. AC 3 — a degraded run emits NO receipt block. A receipt for a consult
#     that did not happen is the fabrication the clause exists to prevent, so
#     the one-line/exit-11 contract must survive receipt mode unchanged.
set +e
OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --gateway /nonexistent/gw.js \
      --tool policy_lookup --args '{"question":"x"}' --receipt --outcome discriminating 2>&1)
CODE=$?
set -e
[[ $CODE -eq 11 ]] || fail "degraded receipt-mode run exited $CODE, want 11"
[[ $(printf '%s\n' "$OUT" | wc -l) -eq 1 ]] || fail "degraded receipt-mode run printed more than one line: $OUT"
printf '%s' "$OUT" | grep -q '^policy_source unavailable:' || fail "degrade line malformed: $OUT"
if printf '%s' "$OUT" | grep -q 'consult-receipt:'; then fail "a degraded run emitted a receipt block"; fi
echo "ok: a degraded run emits no receipt (AC 3)"

# 8c. AC 3/AC 1 — the pre-1.20 invocation is byte-for-byte unaffected. Receipt
#     mode is opt-in, and a transport that started appending a block to every
#     caller's stdout would break every consumer parsing the tool result.
set +e
OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --gateway /nonexistent/gw.js \
      --tool policy_lookup --args '{"question":"x"}' 2>&1)
CODE=$?
set -e
[[ $CODE -eq 11 ]] || fail "non-receipt invocation changed: exited $CODE, want 11"
if printf '%s' "$OUT" | grep -q 'consult-receipt:'; then fail "non-receipt mode emitted a receipt block"; fi
echo "ok: receipt mode is opt-in; the pre-1.20 invocation is unchanged"

# 8d. AC 5 — the marked-exception token is UNINDENTED, and that is a
#     correctness constraint rather than a style one. `check-consult-receipts.sh`
#     recognises only request_id/outcome/query as continuation keys, so an
#     unrecognised INDENTED key above them ends the continuation scan and the
#     receipt parses as a field-less v1 line — silently, and passing. This
#     asserts the emitter never indents its marker, which is the half a doc
#     sentence cannot hold.
grep -q '^ *"consult-receipt: tool-emitted",' "$KIT_DIR/bin/gateway-query.mjs" \
  || fail "the emitted marker is not the fixed unindented \`consult-receipt:\` token"
echo "ok: the receipt marker is the fixed unindented token (AC 5)"

# 8e. AC 1/AC 2 — the composition itself, over synthetic responses. Run here
#     rather than duplicated here: the emitter carries its own fixtures, so a
#     change to the composition and the evidence for it stay in one file.
node "$KIT_DIR/bin/gateway-query.mjs" --self-test \
  || fail "receipt-composition fixtures failed"
echo "ok: receipt-composition fixture pass (AC 1, AC 2)"

echo "ALL PASS"
