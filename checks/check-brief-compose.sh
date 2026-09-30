#!/usr/bin/env bash
# check-brief-compose — the composition-side refusals kogaki#1225 added, and
# the derivations it retired, asserted over the pure validator and by
# absence over the carriers (owner decision 2026-09-29).
#
# HISTORY. A member of this name ran the compose → review → assemble → adopt
# sitting end to end and was removed under the 2026-09-25 retention rule
# (kogaki#1194). This file is NOT that member returning: it is a LIGHT
# member — pure validator calls and text reads, no model run, no runtime
# spawn — that carries exactly the assertions kogaki#1225 registers and
# nothing of the removed member's coverage.
#
# WHAT THIS COVERS.
#   (a) `validateLegs` (src/compose.mjs) refuses a path whose Reader start
#       contains a term a Leg lists under `introduces:`, naming the term and
#       the Leg — the one deterministic refusal in Reader start's content:
#       whether the reader "already knows" a term is judgment, but a Leg's
#       own `introduces:` entry is the composer's declaration that they do
#       not, and a declaration can be read.
#   (b) the same path with the term absent from Reader start is NOT refused
#       on that ground — whatever else the minimal fixture is refused for is
#       a different refusal, and the assertion is on the ground, not on a
#       pass: the fixture Leg is deliberately minimal so the introduced-term
#       clause, which runs before the per-Leg shape loop, is the only clause
#       that can name `introduces`.
#   (c) the match is WHOLE-WORD and case-insensitive: "check" is not found in
#       "checks", "Check" is found in "a check ran", a one-character term
#       matches only standing alone, and the anchor after the `—` separator
#       is not part of the term.
#   (d) `openingQuestionOf` is no longer exported from src/compose.mjs — no
#       Opening question is read off the first Leg any more.
#   (e) by absence over the carriers: `readers/dev-to-zenn.md`'s `reader`
#       field carries no purpose clause ("to fix or avoid"), and
#       `src/differentiation-schema.json`'s `question:` line derives nothing
#       from why the reader opened the post.
#
# WHAT THIS DOES NOT COVER, stated rather than left to look covered: whether
# a Reader start is a GOOD cold read of the Thesis as a title, and whether
# its `question:` line is this reader's reaction to the wording they saw,
# are judgments read by the owner against the Brief and linted nowhere
# (Every MUST is judgment). The retired `reader_target` derivation and the
# removed `Opening question` heading are covered by
# check-brief-differentiation.sh's kogaki#1225 half, not here.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync } from "node:fs";
import * as compose from "./src/compose.mjs";

const { validateLegs, introducedTermInReaderStart } = compose;
const fails = [];

const READER_START = "knowledge: can read code and has used a CI system\nquestion: holds: none\ntrust: the default a peer's post gets";

// (a) a Reader start carrying an introduced term is refused naming the term and the Leg.
{
  const legs = [
    { leg_id: "s1", introduces: ["pipeline"] },
    { leg_id: "s2", introduces: ["CI — the system that runs the checks"] },
  ];
  const r = validateLegs(legs, READER_START);
  if (!r.error) fails.push("(a) a Reader start carrying a term a Leg introduces was not refused");
  else {
    if (!/"CI"/.test(r.error)) fails.push(`(a) the refusal did not name the term: ${r.error}`);
    if (!/leg 2 \(s2\)/.test(r.error)) fails.push(`(a) the refusal did not name the Leg: ${r.error}`);
    if (!/lists under introduces/.test(r.error)) fails.push(`(a) the refusal did not name the introduces ground: ${r.error}`);
  }
}

// (b) the same path with the term absent from Reader start is not refused on that ground.
{
  const legs = [
    { leg_id: "s1", introduces: ["pipeline"] },
    { leg_id: "s2", introduces: ["invariant — a condition that must always hold"] },
  ];
  const r = validateLegs(legs, READER_START);
  if (r.error && /lists under introduces/.test(r.error)) fails.push(`(b) a Reader start carrying no introduced term was refused on the introduced-term ground: ${r.error}`);
  const none = validateLegs(legs, "");
  if (none.error && /lists under introduces/.test(none.error)) fails.push(`(b) with no Reader start to hand, the introduced-term clause still fired: ${none.error}`);
}

// (c) whole-word, case-insensitive matching.
{
  if (typeof introducedTermInReaderStart !== "function") fails.push("(c) src/compose.mjs exports no introducedTermInReaderStart");
  else {
    const cases = [
      ["check", "question: why did my checks pass", false, "a term inside a longer word"],
      ["Check", "knowledge: a check ran", true, "a term differing only in case"],
      ["x", "knowledge: x marks it", true, "a one-character term standing alone"],
      ["x", "knowledge: an xylophone", false, "a one-character term inside a word"],
      ["CI", "knowledge: has used a CI system", true, "a term at a word boundary"],
      ["fail-closed", "orientation: expects fail-closed checks", true, "a hyphenated term"],
      // The dimension LABELS are never matchable text (PR #1228 round 1).
      ["trust", "knowledge: one claim\ntrust: a peer's default", false, "a term equal to a dimension label, absent from the values"],
      ["question", "question: holds: none\ntrust: a peer's default", false, "the question label with no question in the values"],
      ["trust", "knowledge: one claim\norientation: trust is the issue", true, "a term equal to a dimension label, present in a value"],
    ];
    for (const [term, start, want, why] of cases) {
      const got = introducedTermInReaderStart(term, start);
      if (got !== want) fails.push(`(c) ${why}: introducedTermInReaderStart(${JSON.stringify(term)}, ${JSON.stringify(start)}) = ${got}, want ${want}`);
    }
    const anchored = validateLegs([{ leg_id: "s1", introduces: ["gate — the default a peer's post gets"] }], READER_START);
    if (anchored.error && /lists under introduces/.test(anchored.error)) fails.push(`(c) the anchor after the separator was read as part of the term: ${anchored.error}`);
  }
}

// (d) no Opening question is read off the first Leg any more.
{
  if ("openingQuestionOf" in compose) fails.push("(d) src/compose.mjs still exports openingQuestionOf");
  const src = readFileSync("src/compose.mjs", "utf8");
  if (/export function openingQuestionOf/.test(src)) fails.push("(d) src/compose.mjs still defines openingQuestionOf");
}

// (e) the carriers derive nothing from why the reader opened the post.
{
  const persona = readFileSync("readers/dev-to-zenn.md", "utf8");
  if (/to fix or avoid/.test(persona)) fails.push("(e) readers/dev-to-zenn.md's `reader` field still carries the purpose clause");
  const schema = JSON.parse(readFileSync("src/differentiation-schema.json", "utf8"));
  const q = schema.record.reader_start.lines.question;
  if (typeof q !== "string" || /opened the post/.test(q)) fails.push(`(e) src/differentiation-schema.json's question line still derives from why the reader opened the post: ${JSON.stringify(q)}`);
  if (!/holds: none/.test(q) || !/reaction to the wording/.test(q)) fails.push(`(e) src/differentiation-schema.json's question line does not state the pinned stimulus rule: ${JSON.stringify(q)}`);
  const workflow = readFileSync("src/brief-workflow.json", "utf8");
  if (/and why they opened it\)/.test(workflow)) fails.push("(e) src/brief-workflow.json's Persona note still lists why they opened it as a `reader` field clause");
}

if (fails.length > 0) {
  console.log("FAIL check-brief-compose");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-compose — the introduced-term refusal (named term and Leg; not fired without the term or without a Reader start; whole-word and case-insensitive; the anchor is not the term), openingQuestionOf's absence, and the carriers deriving nothing from why the reader opened the post");
JS
