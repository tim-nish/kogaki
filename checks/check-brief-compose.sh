#!/usr/bin/env bash
# check-brief-compose — the composition-side refusals kogaki#1225 added,
# asserted over the pure validator and by absence over the carriers (owner
# decision 2026-09-29). A LIGHT member: pure calls and text reads, no model
# run, no runtime spawn. It is not the end-to-end member kogaki#1194 removed.
#   (a)-(c) `validateLegs` refuses a Reader start carrying a term a Leg lists
#           under `introduces:`, naming term and Leg; whole-word, any case.
#   (d)     `openingQuestionOf` is gone from src/compose.mjs and src/compose/.
#   (e)     the carriers derive nothing from why the reader opened the post.
# The rest of the Brief composition cases moved to the check-brief-closure,
# -packet, -mint, -compose-job and -path-rules members (kogaki#1460); each
# member's registry row in checks/registry.json states what its cases assert.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, readdirSync } from "node:fs";
import * as compose from "./src/compose.mjs";
import { READER_START } from "./checks/fixtures/brief-compose/fixtures.mjs";
const { validateLegs, introducedTermInReaderStart } = compose;
const fails = [];

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
  // The library is the entry and every module under src/compose/ (kogaki#1465);
  // an absence read over the entry alone could no longer fail.
  const files = ["src/compose.mjs", ...readdirSync("src/compose").filter((f) => f.endsWith(".mjs")).sort().map((f) => `src/compose/${f}`)];
  for (const f of files) {
    if (/function\s+openingQuestionOf\b/.test(readFileSync(f, "utf8"))) fails.push(`(d) ${f} still defines openingQuestionOf`);
  }
}

// (e) the carriers derive nothing from why the reader opened the post.
{
  const persona = readFileSync("audiences/dev-to-zenn.md", "utf8");
  if (/to fix or avoid/.test(persona)) fails.push("(e) audiences/dev-to-zenn.md's `persona.reader` field still carries the purpose clause");
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
console.log("ok: check-brief-compose — the introduced-term refusal (named term and Leg; not fired without the term or without a Reader start; whole-word and case-insensitive; the anchor is not the term), openingQuestionOf's absence, and the carriers deriving nothing from why the reader opened the post (kogaki#1225).");
JS
