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

# 2i. THE OWNER-REGISTER RENDERING (kogaki#320, story 1.50 AC1-AC4, AC7;
#     contract specs/spec-client-kit/SPEC.md §8). The properties are decidable
#     without a reachable gateway, which is why they are here.
node "$KIT_DIR/bin/gateway-query.mjs" --self-test | grep -q 'owner-register cases' \
  || fail "the owner-register fixture pass did not run"
# SEPARABILITY (AC2) is asserted where transportArgv lives, with the rest of the
# entry point's argv cases — the module is not import-safe (its top level parses
# argv and exits), so a `node -e` import cannot reach the function. Sited rather
# than duplicated, and named here so the coverage is findable from this file.
node "$KIT_DIR/bin/consult.mjs" --self-test | grep -q 'entry-point cases' \
  || fail "the entry point's fixture pass (which holds the owner-render separability cases) did not run"
# The RELAY RULE points at the emission, not at the receipt (AC3, AC4).
grep -q 'owner-render' "$TMP/repo/.claude/skills/consult-first/SKILL.md" \
  || fail "the relay rule does not point at the kit's emission"
grep -q 'compose the Conclusion yourself' "$TMP/repo/.claude/skills/consult-first/SKILL.md" \
  || fail "the relay rule does not assign the Conclusion to the agent"
echo "ok: owner register — fixtures, separable from the receipt in the composed argv, relayed by the skill"

# 2j. A DEGRADED consult emits NEITHER register (AC6). A rendering of an answer
#     that was never served is the same fabrication the no-receipt-on-degrade
#     rule already forbids, so the owner half owes the same silence.
set +e
OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --gateway /nonexistent/gw.js \
      --owner-render --tool policy_lookup --args '{"question":"q"}' 2>&1)
CODE=$?
set -e
[[ $CODE -eq 11 ]] || fail "the degraded owner-render run exited $CODE, want 11"
printf '%s\n' "$OUT" | grep -q '^Question: ' && fail "a degraded consult emitted an owner block over an answer that was never served"
printf '%s\n' "$OUT" | grep -q '^policy_source unavailable:' || fail "the degrade line is missing: $OUT"
echo "ok: a degraded consult emits neither register"

# 2k. THE DELTA STEP (kogaki#334, story 1.51 AC1/AC2/AC4/AC5/AC7; contract
#     specs/spec-client-kit/SPEC.md §3.4). Four properties, and every one of
#     them is asserted on EMITTED TEXT rather than on the source: what an owner
#     reads is the artifact this criterion is about.
#
#     A STUB GATEWAY is stood up here, which no earlier case needed. Cases 2c/2d
#     could establish the shape read's properties from a degrade and a pure
#     fixture pass, because they are properties of the RENDERING. The delta's are
#     properties of a COMPARISON against a live regeneration — a vendored pin
#     that differs from a served one — and there is no state in which an
#     unreachable gateway produces that. The stub speaks the same stdio JSON-RPC
#     the transport speaks and serves fixed payloads; it is a test double for the
#     WIRE, and it asserts nothing about the real gateway's content.
cat > "$TMP/stub-gw.js" <<'STUB'
const PIN = process.env.STUB_PIN || "product-lab@1111111111111111111111111111111111111111";
const SHA = PIN.split("@")[1];
const send = (o) => process.stdout.write(JSON.stringify(o) + "\n");
const payload = (name) => {
  if (name === "gloss_index")
    return JSON.stringify({ pin: PIN, request_id: "stub", lines: [{ cite: `LESSONS.md:1@${SHA}`, text: "projects: kit-test — a served headline" }] });
  if (name === "surface_names")
    return JSON.stringify({ pin: PIN, request_id: "stub", lines: [{ cite: `GLOSSARY.md:1@${SHA}`, text: "Zarvox" }] });
  // A body the composer cannot parse — the per-term drop, on the wire. This is
  // the case §3.1's denominator clause binds and the one `if (e.soft) continue;`
  // used to erase.
  if (name === "glossary_entry") return "<html>not a served body</html>";
  if (name === "policy_lookup")
    return JSON.stringify({ pin: PIN, request_id: "stub", lines: [{ cite: `topics/x.md:1@${SHA}`, text: "kit-test owes a role-assigned obligation" }] });
  return JSON.stringify({ pin: PIN, lines: [] });
};
let buf = "";
process.stdin.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (m.method === "initialize") send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: "2024-11-05", capabilities: {}, serverInfo: { name: "stub", version: "0" } } });
    else if (m.method === "tools/call") send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: payload(m.params && m.params.name) }] } });
    else if (m.id !== undefined) send({ jsonrpc: "2.0", id: m.id, result: {} });
  }
});
STUB
# The dropped term has to be IN SCOPE, or the composer never reads it: scoping is
# "the consumer's own tree mentions it" (§3.2's bounding).
printf 'Zarvox\n' >> "$TMP/repo/policy/consultation-map.md"
# A vendored digest whose pin the stub will not match — the stale-pin state.
{ echo '# Policy shape — kit-test'; echo; \
  echo 'pin: product-lab@0000000000000000000000000000000000000000'; \
  echo 'generated: 2026-01-01'; echo; \
  echo '## 1. Tier-1 headlines carrying this consumer'; echo; echo '**None.** stale'; echo; \
  echo '## 2. Glossary state lines for terms in scope'; echo; echo '**None.** stale'; echo; \
  echo '## 3. Role-assigned obligations'; echo; echo '**None found.** stale'; echo; \
  echo '## 4. Consultation-map boundaries'; echo; echo '**None declared.** stale'; } \
  > "$TMP/repo/policy/shape.md"

set +e
OUT=$(node "$KIT_DIR/bin/shape.mjs" --delta --consumer kit-test --repo "$TMP/repo" --gateway "$TMP/stub-gw.js" 2>&1)
CODE=$?
set -e
# AC4 — a stale pin REPORTS and never gates. A non-zero exit here is the
# enhancer becoming a dependency, which §3.5 forbids in terms.
[[ $CODE -eq 0 ]] || fail "the delta pre-step gated the sitting on a stale pin: exited $CODE, want 0. $OUT"
# AC1 — the comparison actually happened and found the move.
printf '%s\n' "$OUT" | grep -q 'HAS MOVED' || fail "a stale vendored pin was not reported as moved: $OUT"
printf '%s\n' "$OUT" | grep -q 'section(s) differ' || fail "the delta reported no per-section result: $OUT"
# AC2 — the delta renders through the OWNER-REGISTER path (§8): no receipt
# grammar and no pin. Asserted on the live text, not only in the fixture pass,
# because the fixture composes its own inputs and this one carries a real pin
# through the whole composer.
if printf '%s\n' "$OUT" | grep -q 'consulted:'; then fail "the delta emitted a receipt token on an owner surface: $OUT"; fi
if printf '%s\n' "$OUT" | grep -q 'request_id:'; then fail "the delta emitted a request_id on an owner surface: $OUT"; fi
if printf '%s\n' "$OUT" | grep -Eq '@[0-9a-f]{7,}'; then fail "the delta emitted a pin on an owner surface: $OUT"; fi
# AC1 — the refresh half: the vendored digest is regenerated, not merely read.
grep -q 'product-lab@1111111111111111111111111111111111111111' "$TMP/repo/policy/shape.md" \
  || fail "the delta step did not refresh the vendored digest"
# AC5 — the PER-TERM denominator, end to end. `Zarvox`'s own read came back
# unparseable; it must be counted and NAMED, never skipped.
grep -q 'Zarvox' "$TMP/repo/policy/shape.md" \
  || fail "a term whose own read could not be parsed was dropped in silence (§3.1's per-term case)"
grep -q 'could not be established' "$TMP/repo/policy/shape.md" \
  || fail "the dropped term is not rendered as unestablished"
echo "ok: delta step — reports a stale pin without gating, pin-free on the owner surface, refreshes the digest, names the dropped term"

# AC4 — NO VENDORED DIGEST AT ALL is the third state, and it must not gate
# either. Distinct from the stale case: there is nothing to compare, which is a
# different sentence from "nothing changed".
rm -f "$TMP/repo/policy/shape.md"
set +e
OUT=$(node "$KIT_DIR/bin/shape.mjs" --delta --consumer kit-test --repo "$TMP/repo" --gateway "$TMP/stub-gw.js" 2>&1)
CODE=$?
set -e
[[ $CODE -eq 0 ]] || fail "the delta pre-step gated the sitting with no vendored digest: exited $CODE, want 0. $OUT"
printf '%s\n' "$OUT" | grep -q 'No vendored digest was found' || fail "an absent vendored digest was not stated: $OUT"
if printf '%s\n' "$OUT" | grep -Eq '@[0-9a-f]{7,}'; then fail "the absent-digest delta emitted a pin: $OUT"; fi
echo "ok: delta step — an absent vendored digest is stated, and does not gate"

# AC7 — and the delta owes the SAME one-line exit-11 degrade every other kit
# tool owes. The host reads 11 as non-gating; what the tool owes is that the
# failure is legible in one line rather than a stack trace.
set +e
OUT=$(node "$KIT_DIR/bin/shape.mjs" --delta --consumer kit-test --repo "$TMP/repo" --gateway /nonexistent/gw.js 2>&1)
CODE=$?
set -e
[[ $CODE -eq 11 ]] || fail "the degraded delta step exited $CODE, want 11"
[[ $(printf '%s\n' "$OUT" | grep -c .) -eq 1 ]] || fail "the degraded delta step printed more than one line: $OUT"
printf '%s\n' "$OUT" | grep -q '^policy_source unavailable:' || fail "the delta step's degrade line is missing: $OUT"
echo "ok: delta step degrades in one line with exit 11"

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

# ---------------------------------------------------------------------------
# 10. The ADDRESS FORM is checked on the QUERY path, not only when a receipt is
#     composed (kogaki#368). The guard existed and was wired into
#     `composeReceipt`, so `terrain survey` sent an undeclared `kinds` key,
#     received the miss shape, and wrote a survey with zero candidates at exit
#     zero. Both branches are exercised here, on the CLI, because the defect
#     was not that the check was wrong — it was that the check was somewhere
#     else, and only a run on this path can tell those apart.
# ---------------------------------------------------------------------------
cat > "$TMP/stub-catalogue.js" <<'STUB'
// A stub that DOES serve tools/list, so the form check has a catalogue.
const send = (o) => process.stdout.write(JSON.stringify(o) + "\n");
let buf = "";
process.stdin.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (m.method === "initialize")
      send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: "2024-11-05", capabilities: {}, serverInfo: { name: "stub", version: "0" } } });
    else if (m.method === "tools/list")
      send({ jsonrpc: "2.0", id: m.id, result: { tools: [
        { name: "element_survey", inputSchema: { properties: { kind: {}, tag: {} } } },
      ] } });
    else if (m.method === "tools/call")
      // A payload a RECEIPT can be composed from: request_id, a served
      // `consulted:` line, a pin, and the echoed address gw#88 puts on every
      // envelope. Without these the receipt cases below would fail on the
      // stub's poverty rather than on the behaviour they test.
      send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: JSON.stringify({
        pin: "product-lab@0000000000000000000000000000000000000000",
        request_id: "stub-req",
        consulted: "consulted: product-lab@0000000000000000000000000000000000000000 LESSONS.md:1",
        tool: m.params && m.params.name,
        request: (m.params && m.params.arguments) || {},
        lines: [{ cite: "LESSONS.md:1@0000000000000000000000000000000000000000", text: "a served line" }],
      }) }] } });
    else if (m.id !== undefined) send({ jsonrpc: "2.0", id: m.id, result: {} });
  }
});
STUB

# 10a. THE REFUSAL. An undeclared key, no --receipt: refused before it is sent.
set +e
OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --tool element_survey   --args '{"kinds":["lesson"]}' --gateway "$TMP/stub-catalogue.js" 2>&1)
CODE=$?
set -e
[[ $CODE -eq 13 ]] || fail "an undeclared key on the QUERY path exited $CODE, want 13 — this is the shipped defect: it used to exit 0 with a miss shape. $OUT"
printf '%s
' "$OUT" | grep -q 'address refused:' || fail "the query-path refusal is missing its marker: $OUT"
printf '%s
' "$OUT" | grep -q '`kinds`' || fail "the refusal does not name the offending key: $OUT"
printf '%s
' "$OUT" | grep -q 'it declares `kind`, `tag`' || fail "the refusal does not name the declared set: $OUT"
echo "ok: an undeclared argument key is refused on the query path, naming the key and the declared set (kogaki#368 AC1)"

# 10a-ii. THE REFUSAL IS ON STDERR, AND STDOUT IS EMPTY. The streams are
#         separated here deliberately: 10a captures `2>&1` and so cannot tell
#         them apart, which left the routing untested. It is not cosmetic —
#         Kogaki's `gatewayQuery` captures stdout to a temp file it reads only
#         on success and unlinks otherwise, so a refusal on stdout is deleted
#         unread and the operator sees an empty diagnostic (round-1 finding on
#         PR #372).
set +e
ERR=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --tool element_survey   --args '{"kinds":["lesson"]}' --gateway "$TMP/stub-catalogue.js" 2>&1 >/dev/null)
OUTONLY=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --tool element_survey   --args '{"kinds":["lesson"]}' --gateway "$TMP/stub-catalogue.js" 2>/dev/null)
set -e
printf '%s
' "$ERR" | grep -q 'address refused:'   || fail "the refusal is not on stderr, so a caller capturing stdout separately loses it: $ERR"
[[ -z "$(printf '%s' "$OUTONLY" | tr -d '[:space:]')" ]]   || fail "the refusal was written to stdout, which is the TOOL RESULT stream a caller parses: $OUTONLY"
echo "ok: the refusal is a diagnostic on stderr and stdout stays empty (kogaki#368)"

# 10b. THE DECLARED CALL IS UNTOUCHED. The guard must not cost a working call.
set +e
OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --tool element_survey   --args '{"kind":"lesson"}' --gateway "$TMP/stub-catalogue.js" 2>&1)
CODE=$?
set -e
[[ $CODE -eq 0 ]] || fail "a DECLARED key on the query path exited $CODE, want 0 — the guard is refusing a conforming call. $OUT"
echo "ok: a declared argument key still serves at exit 0 (kogaki#368 AC1)"

# 10c. NO CATALOGUE -> UNCHECKED AND SAID SO, never a refusal and never a
#      degrade. The kit is an enhancer, never a dependency: a gateway serving
#      no `tools/list` answered every non-receipt call before this change, and
#      breaking those to enforce a check that cannot run would be a worse
#      defect than the one being fixed. The residue is announced rather than
#      silent, and on stderr rather than in the tool result.
set +e
OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --tool element_survey   --args '{"kinds":["lesson"]}' --gateway "$TMP/stub-gw.js" 2>&1)
CODE=$?
set -e
[[ $CODE -eq 0 ]] || fail "a catalogue-less gateway made the query path exit $CODE, want 0 — the transport has become a dependency. $OUT"
printf '%s
' "$OUT" | grep -q 'address form unchecked:'   || fail "the unchecked branch did not announce itself, so the residue is silent: $OUT"
echo "ok: no served catalogue leaves the form unchecked, announced and not refused (kogaki#368)"

# 10d. THE RECEIPT PATH'S REFUSAL SHAPE, asserted. Round-1 finding on PR #372:
#      AC2a declared a behaviour change on this path and offered "the 48-case
#      self-test passes unmodified" as evidence — which evidences nothing,
#      because no case ever exercised the receipt path's refusal for an
#      undeclared key. A coverage claim attached to a path with no
#      discriminating case is the kogaki#230 shape one surface over.
set +e
OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --tool element_survey   --args '{"kinds":["lesson"]}' --receipt --question "q" --outcome discriminating   --gateway "$TMP/stub-catalogue.js" 2>&1)
CODE=$?
set -e
[[ $CODE -eq 13 ]] || fail "an undeclared key on the RECEIPT path exited $CODE, want 13. $OUT"
printf '%s
' "$OUT" | grep -q 'address refused:' || fail "the receipt path's refusal is not the pre-send one: $OUT"
printf '%s
' "$OUT" | grep -q 'receipt not composable:'   && fail "the receipt path still refuses AFTER sending — the pre-send check did not reach it: $OUT"
echo "ok: the receipt path refuses an undeclared key BEFORE sending, at exit 13 (kogaki#368 AC2a, stated change)"

# 10e. A VALID RECEIPT STILL COMPOSES. The other half of AC2a, and the half
#      that must not have moved at all.
set +e
OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --tool element_survey   --args '{"kind":"lesson"}' --receipt --question "q" --outcome discriminating   --gateway "$TMP/stub-catalogue.js" 2>&1)
CODE=$?
set -e
[[ $CODE -eq 0 ]] || fail "a DECLARED key on the receipt path exited $CODE, want 0 — the guard is refusing a conforming receipt. $OUT"
printf '%s
' "$OUT" | grep -q '^consulted: ' || fail "the receipt block is missing on a conforming call: $OUT"
echo "ok: a conforming receipt still composes at exit 0 (kogaki#368 AC2a, the half that must not move)"

# 10f. A TOOL ABSENT FROM A CATALOGUE THAT WAS READ is the THIRD cause, and it
#      REFUSES. Round-1 finding on PR #372: the first split named two causes
#      and this lands in neither. MCP requires a server to list what it serves,
#      so a tool missing from a read catalogue is one this gateway does not
#      serve and the call was never going to reach it.
set +e
OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --tool gloss_index   --args '{"tag":"lessons/testing"}' --gateway "$TMP/stub-catalogue.js" 2>&1)
CODE=$?
set -e
[[ $CODE -eq 13 ]] || fail "a tool absent from a READ catalogue exited $CODE, want 13. $OUT"
printf '%s
' "$OUT" | grep -q 'does not carry `gloss_index`'   || fail "the refusal does not name the unserved tool, so it reads as an undeclared-key refusal: $OUT"
echo "ok: a tool absent from a served catalogue is refused, naming which cause (kogaki#368)"

# 10g. AN ERRORING `tools/list` LEAVES THE QUERY PATH WORKING. Round-1 finding
#      on PR #372: before this change the query path never asked, so turning
#      that error into a degrade would stop calls that used to work.
cat > "$TMP/stub-listerr.js" <<'STUB'
const send = (o) => process.stdout.write(JSON.stringify(o) + "\n");
let buf = "";
process.stdin.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (m.method === "initialize")
      send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: "2024-11-05", capabilities: {}, serverInfo: { name: "stub", version: "0" } } });
    else if (m.method === "tools/list")
      send({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "no such method" } });
    else if (m.method === "tools/call")
      send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: JSON.stringify({ pin: "p@0", request_id: "stub", lines: [] }) }] } });
    else if (m.id !== undefined) send({ jsonrpc: "2.0", id: m.id, result: {} });
  }
});
STUB
set +e
OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer kit-test --tool element_survey   --args '{"kind":"lesson"}' --gateway "$TMP/stub-listerr.js" 2>&1)
CODE=$?
set -e
[[ $CODE -eq 0 ]] || fail "an erroring tools/list made the query path exit $CODE, want 0 — a call that used to work has stopped. $OUT"
printf '%s
' "$OUT" | grep -q 'address form unchecked:'   || fail "the erroring-catalogue path did not announce that the form went unchecked: $OUT"
echo "ok: an erroring tools/list leaves the query path serving, form unchecked and announced (kogaki#368)"

echo "ALL PASS"
