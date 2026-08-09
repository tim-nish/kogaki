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

# 2b. THE SHAPE READ's install-time properties (kogaki#325, story 1.48 AC7;
#     contract specs/spec-client-kit/SPEC.md §3). Four assertions, and the
#     gitignore one is the load-bearing member: §3.3 makes repo-VISIBLE and
#     COMMITTED two separate decisions, and the kit's default answers only the
#     first. A regression that dropped the ignore line would make every consumer
#     start committing a digest derived from hub owner-realm material — a
#     declassification the spec grants no grounds for, and one that is
#     irreversible the moment a public repo is pushed.
grep -qx 'policy/shape.md' "$TMP/repo/.gitignore" || fail "the shape read is not gitignored — visibility and publication were decided by one act"
[[ $(grep -cx 'policy/shape.md' "$TMP/repo/.gitignore") -eq 1 ]] || fail "duplicate shape-read gitignore entry across two installs (not idempotent)"
grep -q 'policy/shape.md' "$TMP/repo/CLAUDE.md" || fail "the managed block does not reference the shape read — a digest nothing loads grounds nothing"
grep -q 'never substitution' "$TMP/repo/CLAUDE.md" || fail "the managed block omits the awareness-never-substitution clause (§3.5)"
echo "ok: shape read — gitignored (once, across two installs), referenced from the managed block"

# 2c. The shape read's DEGRADE, on the same contract as every other kit tool:
#     one line, exit 11. Asserted on the emitted text rather than trusted to the
#     source, and asserted here because the install above calls it — an install
#     that hard-failed on an unreachable gateway would break the ratified
#     "a degraded install is a valid install" promise for every consumer.
set +e
OUT=$(node "$KIT_DIR/bin/shape.mjs" --consumer kit-test --repo "$TMP/repo" --gateway /nonexistent/gw.js 2>&1)
CODE=$?
set -e
[[ $CODE -eq 11 ]] || fail "the degraded shape read exited $CODE, want 11"
[[ $(printf '%s\n' "$OUT" | grep -c .) -eq 1 ]] || fail "the degraded shape read printed more than one line: $OUT"
printf '%s\n' "$OUT" | grep -q '^policy_source unavailable:' || fail "the shape read's degrade line is missing: $OUT"
echo "ok: shape read degrades in one line with exit 11"

# 2d. The rendering fixture pass, sited with the code it covers — the same
#     arrangement as 4e, 8e and 9i. Pure functions of a served response, so it
#     runs with NO gateway; the wire is exercised by 2c's degrade path.
node "$KIT_DIR/bin/shape.mjs" --self-test || fail "shape read fixtures failed"
echo "ok: shape read fixture pass (story 1.48 AC2)"

# 2e. THE EMISSION DUTY's install-time properties (kogaki#326, story 1.49 AC7;
#     contract specs/spec-client-kit/SPEC.md §4). The gitignore assertion here is
#     the INVERSE of 2b's and that is the whole point: the two artifacts answer
#     the same axis oppositely because the discriminator is SOURCE SENSITIVITY
#     rather than file kind. Asserting only one of them would leave a later
#     change free to "make them consistent" and destroy the distinction.
[[ -f "$TMP/repo/policy/emissions/README.md" ]] || fail "no policy/emissions/ directory"
if [[ -f "$TMP/repo/.gitignore" ]]; then
  grep -q 'policy/emissions' "$TMP/repo/.gitignore" && fail "emissions must NOT be gitignored — they are consumer-authored and declassify nothing"
fi
grep -q 'policy/kit/bin/emit.mjs' "$TMP/repo/CLAUDE.md" || fail "the managed block does not state the emission duty"
grep -q 'promotion is untouched' "$TMP/repo/CLAUDE.md" || fail "the managed block omits the emission/promotion boundary (§4.2)"
echo "ok: emission duty — committed directory, stated in the managed block, promotion boundary carried"

# 2f. The writer produces a CONFORMANT five-field emission, and writes NOTHING
#     ELSE. The second half is the load-bearing one: this file's entire standing
#     rests on emission not being promotion, so the test asserts that the act
#     touches only the consumer's own tree.
node "$KIT_DIR/bin/emit.mjs" --repo "$TMP/repo" --date 2026-01-01 \
  --title 'a test finding' --trigger 'the fixture ran' \
  --learning 'the writer produces the five fields' --grain lesson >"$TMP/emit-out" 2>&1 \
  || fail "the emission writer exited non-zero"
EMITTED="$TMP/repo/policy/emissions/2026-01-01-a-test-finding.md"
[[ -f "$EMITTED" ]] || fail "the emission was not written at its dated, slugged path"
grep -q "$EMITTED" "$TMP/emit-out" || fail "the writer does not print the path as an in-session receipt"
for FIELD in 'date: 2026-01-01' 'repo: ' 'grain: lesson' 'the fixture ran' 'the writer produces the five fields'; do
  grep -q "$FIELD" "$EMITTED" || fail "the emission is missing field: $FIELD"
done
grep -q 'sole promotion path' "$EMITTED" || fail "the emission does not state that it is a candidate rather than a promotion"
node "$KIT_DIR/bin/emit.mjs" --repo "$TMP/repo" --trigger x --learning y --grain nonsense >/dev/null 2>&1 \
  && fail "an undeclared grain must be refused — the set is closed"
echo "ok: emission writer — five fields, dated path, in-session receipt, closed grain set, promotion boundary stated"

# 2g. The plain-register note REPORTS and never refuses (§4.4). A channel that
#     rejects your words is a channel you stop using, so the exit code must stay
#     0 while the note is printed.
node "$KIT_DIR/bin/emit.mjs" --repo "$TMP/repo" --date 2026-01-02 --title 'register case' \
  --trigger 'we reached the distill gate' --learning 'a plain sentence' --grain lesson >"$TMP/reg-out" 2>&1 \
  || fail "the plain-register note must not fail the write"
grep -q 'plain-register note' "$TMP/reg-out" || fail "hub-internal vocabulary was not reported"
grep -q 'Reported, not refused' "$TMP/reg-out" || fail "the note does not state that it is a report"
echo "ok: plain-register note reports without refusing"

# 2h. The writer's fixture pass, sited with the code it covers.
node "$KIT_DIR/bin/emit.mjs" --self-test || fail "emission writer fixtures failed"
echo "ok: emission writer fixture pass (story 1.49)"

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

# 4d. THE THIRD ENTRY POINT owes the same promise (kogaki#188). `--emit-pin-quotes`
#     is the WRITER for the stored quote hash, and it reaches the gateway through
#     the same helper — so an unreachable seam must degrade there too, in one
#     line, rather than emitting a partial hash list that would read as a
#     complete one. A writer that quietly produces fewer hashes than there are
#     cites is how a content check ends up merged, correctly placed and dead.
printf 'consulted: product-lab@0123abcdef01 topics/articles.md:79\n' > "$TMP/emit.md"
set +e
OUT=$(TSUREZURE_GATEWAY_JS=/nonexistent/gw.js \
      node "$KIT_DIR/bin/issue-pins.mjs" --emit-pin-quotes "$TMP/emit.md" \
      --consumer kit-test --gateway /nonexistent/gw.js 2>&1)
CODE=$?
set -e
[[ $CODE -eq 11 ]] || fail "emit-pin-quotes with an unreachable gateway exited $CODE, want 11"
[[ $(printf '%s\n' "$OUT" | wc -l) -eq 1 ]] || fail "emit-pin-quotes degrade printed more than one line: $OUT"
printf '%s' "$OUT" | grep -q '^policy_source unavailable:' \
  || fail "emit-pin-quotes exited 11 without the promised degrade line: $OUT"
echo "ok: emit-pin-quotes degrade (one line, exit 11)"

# 4e. The content-liveness fixture pass (kogaki#188), sited with the code it
#     covers — the same arrangement as 8e and 9i below. Every case is a pure
#     function of a body and an already-fetched surface, so the whole pass runs
#     with NO gateway; the wire itself is exercised by 4b/4c/4d's degrade paths.
#     The regression pin inside it is the live drift this issue was filed for:
#     `topics/articles.md:79` still RESOLVES while holding different content,
#     which is the form no resolution check can catch.
node "$KIT_DIR/bin/issue-pins.mjs" --self-test || fail "issue-pins content-liveness fixtures failed"
echo "ok: issue-pins content-liveness fixture pass (kogaki#188)"

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
#     `deferred-slot: consult-outcome-token-assignment` is FILLED (owner
#     decision 2026-08-06 on kogaki#66): the OPERATOR supplies the token, so a
#     default here would reinstate the guess the fill declined (A1). The
#     message must still name the slot — that is how the caller finds who owns
#     the token rather than reading the exit as a syntax mistake. This comment
#     said "is open" until the fill's prose was reconciled; the assertion below
#     is unchanged, because the behaviour never was.
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
      --tool policy_lookup --args '{"question":"x"}' --question 'x' \
      --receipt --outcome discriminating 2>&1)
CODE=$?
set -e
[[ $CODE -eq 11 ]] || fail "degraded receipt-mode run exited $CODE, want 11"
[[ $(printf '%s\n' "$OUT" | wc -l) -eq 1 ]] || fail "degraded receipt-mode run printed more than one line: $OUT"
printf '%s' "$OUT" | grep -q '^policy_source unavailable:' || fail "degrade line malformed: $OUT"
if printf '%s' "$OUT" | grep -q 'consult-receipt:'; then fail "a degraded run emitted a receipt block"; fi
echo "ok: a degraded run emits no receipt (AC 3)"

# 8b-i. kogaki#160 finding 4 — receipt mode refuses without one `--question`
#     per `--args`, and refuses BEFORE the wire. Sited beside 8a because it is
#     the same class of refusal for the same reason: an invocation that cannot
#     produce a truthful `query:` line is malformed whether or not the gateway
#     answers, and reaching out first would spend a real consult on a call that
#     was always going to refuse. The exit-2-not-11 assertion IS the ordering
#     assertion — this gateway path does not exist, so an 11 here would mean
#     the check ran after the reachability probe.
set +e
OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --gateway /nonexistent/gw.js \
      --tool gloss_index --args '{"tag":"lessons/testing"}' \
      --receipt --outcome discriminating 2>&1)
CODE=$?
set -e
[[ $CODE -eq 2 ]] || fail "receipt mode without --question exited $CODE, want 2"
printf '%s' "$OUT" | grep -q 'THE QUESTION' \
  || fail "the refusal does not name what the query field holds: $OUT"
if printf '%s' "$OUT" | grep -q 'consult-receipt:'; then fail "a refusal emitted a receipt block"; fi
echo "ok: receipt mode refuses without a per-call --question, ahead of the wire (kogaki#160)"

# 8b-ii. The disagreement case. A `--question` that contradicts the framing's
#     own `question` argument means one of the two is not what ran, and the
#     transport asserts only what it observed rather than choosing between them.
set +e
OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --gateway /nonexistent/gw.js \
      --tool policy_lookup --args '{"question":"what was sent"}' --question 'what was recorded' \
      --receipt --outcome discriminating 2>&1)
CODE=$?
set -e
[[ $CODE -eq 2 ]] || fail "a disagreeing --question exited $CODE, want 2"
printf '%s' "$OUT" | grep -q 'disagrees' || fail "the refusal does not name the disagreement: $OUT"
echo "ok: a --question disagreeing with the args is refused, never reconciled (kogaki#160)"

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

# 9. The consult ENTRY POINT (kogaki#94, story 1.21): the query discipline as
#    an affordance rather than prose. Same arrangement as case 8 — every
#    property here is decidable without a reachable gateway, because everything
#    the entry point adds is a property of the INVOCATION rather than of the
#    wire. What no case here covers is a live consult through the entry point;
#    stated rather than left to look covered, as 4b and 8 state their own.
#
# 9a. AC 1 — ONE receipt composer. The entry point delegates to the transport
#     and composes nothing: a second composer is the transcription surface the
#     whole clause exists to remove, so its absence is asserted rather than
#     trusted to review. The entry point may MENTION the grammar (its degraded
#     statement quotes a hand-composed template); what it may not do is build a
#     `consulted:` line or a `request_id:` continuation of its own.
ENTRY="$KIT_DIR/bin/consult.mjs"
[[ -f "$ENTRY" ]] || fail "no consult entry point at bin/consult.mjs"
if grep -n 'consulted: \${\|request_id: \${\|consult-receipt: tool-emitted' "$ENTRY"; then
  fail "the entry point composes a receipt of its own (AC 1: one path, no second composer)"
fi
grep -q 'gateway-query.mjs' "$ENTRY" || fail "the entry point does not route through the transport"
echo "ok: the entry point routes to the transport and composes no receipt (AC 1)"

# 9b. AC 2 — a verdict-shaped input is corrected AT THE POINT OF USE and not
#     forwarded. The gateway path is deliberately a nonexistent one: if the
#     correction ever stopped preceding the call, this case would exit 11
#     instead of 3, which is what makes it evidence rather than decoration.
set +e
OUT=$(node "$ENTRY" --consumer kit-test --gateway /nonexistent/gw.js \
      --claim 'were there any problems with this PR?' --outcome discriminating 2>&1)
CODE=$?
set -e
[[ $CODE -eq 3 ]] || fail "a verdict-shaped input exited $CODE, want 3"
printf '%s' "$OUT" | grep -q 'the seam serves positions, not verdicts; state the claim the decision turns on' \
  || fail "the fixed correction was not returned: $OUT"
printf '%s' "$OUT" | grep -q 'restate' || fail "the correction is a denial, not an affordance: $OUT"
if printf '%s' "$OUT" | grep -q 'policy_source unavailable'; then
  fail "the verdict-shaped question was forwarded to the gateway"
fi
echo "ok: a verdict-shaped input is corrected at the point of use, re-submittably (AC 2)"

# 9c. AC 2 — the affordance closes: the corrected claim is re-submittable in
#     the SAME act. With the restatement supplied the run proceeds to the wire
#     (and degrades there, this gateway being nonexistent), which is the only
#     observable that distinguishes an affordance from a nicer denial.
set +e
OUT=$(node "$ENTRY" --consumer kit-test --gateway /nonexistent/gw.js \
      --claim 'were there any problems with this PR?' \
      --restate 'a review report names the head it reviewed' --outcome discriminating 2>&1)
CODE=$?
set -e
[[ $CODE -eq 11 ]] || fail "a restated claim exited $CODE, want 11 (it should reach the wire)"
echo "ok: the corrected claim is re-submittable in the same act (AC 2)"

# 9d. AC 3 — the token is the CALLER's. `deferred-slot:
#     consult-outcome-token-assignment` is FILLED (owner decision 2026-08-06,
#     specs/SPEC.md §4): the operator supplies the token and the tool fails
#     rather than guessing. Asserted on the entry point as well as on the
#     transport because the entry point is the surface a session touches, and a
#     default here would reinstate the guess the fill declined (A1).
set +e
OUT=$(node "$ENTRY" --consumer kit-test --gateway /nonexistent/gw.js --claim 'a claim' 2>&1)
CODE=$?
set -e
[[ $CODE -eq 2 ]] || fail "a missing --outcome exited $CODE, want 2"
printf '%s' "$OUT" | grep -q 'OPERATOR' || fail "the refusal does not name who assigns the token: $OUT"
echo "ok: a missing --outcome fails rather than guessing (AC 3)"

# 9e. AC 3 — the two-framings floor, carried at the call rather than
#     remembered. A non-discriminating outcome with one framing is refused with
#     what the re-framing owes; the same invocation with the second framing
#     proceeds. Both directions, because a floor that refused everything would
#     pass a one-directional test.
set +e
OUT=$(node "$ENTRY" --consumer kit-test --gateway /nonexistent/gw.js \
      --claim 'a claim' --outcome covered-after-reframing 2>&1)
CODE=$?
set -e
[[ $CODE -eq 4 ]] || fail "a non-discriminating outcome with one framing exited $CODE, want 4"
printf '%s' "$OUT" | grep -q 'DIFFERENT AXIS' || fail "the floor refusal does not say what the re-framing owes: $OUT"
set +e
node "$ENTRY" --consumer kit-test --gateway /nonexistent/gw.js \
  --claim 'axis one' --claim 'axis two' --outcome covered-after-reframing >/dev/null 2>&1
CODE=$?
set -e
[[ $CODE -eq 11 ]] || fail "two framings exited $CODE, want 11 (the floor is met; it should reach the wire)"
echo "ok: the two-framings floor prompts for exactly one re-framing (AC 3)"

# 9f. AC 3/AC 4 — the framing COUNT is emitted as a transport fact, and a token
#     contradicting it is refused rather than repaired. Repairing it would be
#     the tool assigning the token by the back door, which is A1 declined.
set +e
OUT=$(node "$ENTRY" --consumer kit-test --gateway /nonexistent/gw.js \
      --claim 'axis one' --claim 'axis two' --outcome uncovered-after-2-framings 2>&1)
set -e
printf '%s' "$OUT" | grep -q '^framings: 2 (observed)' || fail "the framing count was not emitted: $OUT"
set +e
OUT=$(node "$ENTRY" --consumer kit-test --gateway /nonexistent/gw.js \
      --claim 'axis one' --claim 'axis two' --outcome uncovered-after-7-framings 2>&1)
CODE=$?
set -e
[[ $CODE -eq 2 ]] || fail "an N contradicting the observed count exited $CODE, want 2"
printf '%s' "$OUT" | grep -q 'N names the queries' || fail "the refusal does not name the contradiction: $OUT"
echo "ok: the framing count is emitted; a token contradicting it is refused (AC 3, AC 4)"

# 9g. AC 4 — one `--args` per framing reaches the transport, so every framing
#     actually run gets its own `query:` line, under a FIXED BOUND of one
#     re-framing. The query lines themselves are the transport's and are
#     covered by its own fixtures (8e); what is asserted here is the bound,
#     which is the half that makes it "never a search loop".
set +e
OUT=$(node "$ENTRY" --consumer kit-test --gateway /nonexistent/gw.js \
      --claim a --claim b --claim c --outcome uncovered-after-3-framings 2>&1)
CODE=$?
set -e
[[ $CODE -eq 2 ]] || fail "three framings exited $CODE, want 2 (the bound is one re-framing)"
printf '%s' "$OUT" | grep -q 'never a search loop' || fail "the bound refusal does not name the failure it prevents: $OUT"
echo "ok: the framing bound holds — one axis, one re-framing, no search loop (AC 4)"

# 9h. AC 5 — the degraded path is STATED, and its receipt example is in the
#     shape `check-consult-receipts.sh` actually accepts. The marker must be
#     UNINDENTED and ABOVE line one: the checker recognises only
#     request_id/outcome/query as continuation keys, so an unrecognised
#     INDENTED key above them ends the continuation scan and the receipt parses
#     as a field-less v1 line — silently, and passing. A wrong example is a
#     wrong receipt in every PR that follows it, which is why this is asserted
#     on the emitted text rather than trusted to the source.
set +e
OUT=$(node "$ENTRY" --consumer kit-test --gateway /nonexistent/gw.js \
      --claim 'a claim' --outcome discriminating 2>&1)
CODE=$?
set -e
[[ $CODE -eq 11 ]] || fail "the degraded entry-point run exited $CODE, want 11"
printf '%s\n' "$OUT" | grep -q '^policy_source unavailable:' || fail "the transport's degrade line is missing: $OUT"
printf '%s\n' "$OUT" | grep -q '^consult-receipt: hand-composed — ' \
  || fail "the degraded statement's marker is absent or indented: $OUT"
printf '%s\n' "$OUT" | grep -q 'mcp__tsurezure__policy_lookup' \
  || fail "the degraded path does not name the existing direct route: $OUT"
printf '%s\n' "$OUT" | grep -q 'does not degrade to nothing' \
  || fail "the degraded path is not stated as a discipline: $OUT"
# The marker sits directly above line one, and the continuations under it.
printf '%s\n' "$OUT" | grep -A 1 '^consult-receipt: hand-composed' | grep -q '^consulted: ' \
  || fail "the marker is not directly above line one of the example: $OUT"
echo "ok: the degraded path is stated, with a correctly shaped marked receipt (AC 5)"

# 9i. AC 1–5 — the entry point's own fixture pass, sited with the code it
#     covers, the same arrangement as 8e.
node "$ENTRY" --self-test || fail "consult entry-point fixtures failed"
echo "ok: consult entry-point fixture pass (AC 1–5)"

echo "ALL PASS"
