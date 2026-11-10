#!/usr/bin/env bash
# check-brief-compose — the composition-side refusals kogaki#1225 added, over
# the pure validator and by absence over the carriers. A LIGHT member: no model
# run; (f) alone spawns `node` over a state renderer with its records supplied.
#   (a)-(c) Reader start is retired (kogaki#1699): no introduced-term refusal over
#           it, and a Leg carrying `reader_state_after` is refused naming the field.
#   (d)     `openingQuestionOf` is gone from src/compose.mjs and src/compose/.
#   (e)     nothing derives why the reader opened the post, and
#           src/differentiation-schema.json is gone with its state (kogaki#1768).
#   (f)     the renderings record at the start of `compose_path` (kogaki#1494,
#           kogaki#1768), one entry per term the Thesis does not keep.
# The other cases live in the members kogaki#1460 cut out; see checks/registry.json.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, readdirSync } from "node:fs";
import * as compose from "./src/compose.mjs";
import { existsSync } from "node:fs";
import { runRenderings } from "./checks/fixtures/brief-compose/fixtures.mjs";
const { validateLegs } = compose;
const fails = [];

// (a)-(c) READER START IS RETIRED (kogaki#1699). The introduced-term refusal over Reader start
// (kogaki#1225) went with it: no record carries a Reader start for a term to appear in.
{
  if ("introducedTermInReaderStart" in compose) fails.push("(a) src/compose.mjs still exports introducedTermInReaderStart");
  if ("readerStartThesisRefusal" in compose) fails.push("(a) src/compose.mjs still exports readerStartThesisRefusal");
  const legs = [
    { leg_id: "s1", introduces: ["pipeline"] },
    { leg_id: "s2", introduces: ["CI — the system that runs the checks"] },
  ];
  const r = validateLegs(legs);
  if (r.error && /lists under introduces/.test(r.error)) fails.push(`(b) a path was refused on the retired Reader start ground: ${r.error}`);
  const stated = validateLegs([{ leg_id: "s1", reader_state_after: "knowledge: k" }]);
  if (!stated.error || !/carries `reader_state_after`/.test(stated.error) || !/kogaki#1699/.test(stated.error)) {
    fails.push(`(c) a Leg carrying reader_state_after was not refused naming the field and kogaki#1699: ${stated.error}`);
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
  // THE DIFFERENTIATION STATE IS RETIRED (kogaki#1768): one Reader Path is composed from the
  // structure, so no record differentiates Candidates and its schema is gone.
  if (existsSync("src/differentiation-schema.json")) fails.push("(e) src/differentiation-schema.json is still on disk, though no state reads it (kogaki#1768)");
  if (/differentiation/.test(JSON.stringify(JSON.parse(readFileSync("src/brief-workflow.json", "utf8")).states.map((s) => s.id)))) fails.push("(e) src/brief-workflow.json still declares a differentiation state (kogaki#1768)");
  const workflow = readFileSync("src/brief-workflow.json", "utf8");
  if (/and why they opened it\)/.test(workflow)) fails.push("(e) src/brief-workflow.json's Persona note still lists why they opened it as a `reader` field clause");
}

// (f) kogaki#1494 — the renderings record, composed at the start of `compose_path`
// (kogaki#1768). The settled set carries two source terms, "bamboo shoots" and
// "zebra"; the Thesis carries "zebra", so the article keeps it and the record
// holds one entry. The record is supplied as the judge's answer and run through
// the state's own validator, so what is asserted is what the state admits; an
// admitted record runs on to the job's judge settings, which the fixture's run record lacks.
{
  const kept = runRenderings({ renderings: [{ term: "bamboo shoots", as: "existing technology" }] });
  if (!kept.admitted) fails.push(`(f) compose_path refused a renderings record with one entry per term the Thesis does not keep: ${kept.stderr}`);
  const thesisTerm = runRenderings({ renderings: [{ term: "bamboo shoots", as: "existing technology" }, { term: "zebra", as: "a striped animal" }] });
  if (thesisTerm.status === 0 || thesisTerm.admitted) fails.push("(f) a renderings record rendering a term the Thesis carries was not refused");
  else if (!/renderings entry 2 lists "zebra", which the Thesis carries/.test(thesisTerm.stderr)) fails.push(`(f) the refusal of the Thesis's own term did not name the entry and the term: ${thesisTerm.stderr}`);
  const extra = runRenderings({ renderings: [{ term: "bamboo shoots", as: "existing technology", why: "plainer" }] });
  if (extra.status === 0 || extra.admitted) fails.push("(f) a renderings entry carrying a third key was not refused");
  else if (!/renderings entry 1 carries `why`/.test(extra.stderr)) fails.push(`(f) the malformed entry was not refused by name: ${extra.stderr}`);
  const absent = runRenderings({ renderings: [{ term: "registers", as: "records" }] });
  if (absent.status === 0 || absent.admitted) fails.push("(f) a renderings entry whose term is in no Strand claim was not refused");
  else if (!/"registers", which occurs whole-word in no Strand's claim/.test(absent.stderr)) fails.push(`(f) the refusal of a term in no claim did not name it: ${absent.stderr}`);
}

if (fails.length > 0) {
  console.log("FAIL check-brief-compose");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-compose — Reader start retired with its introduced-term refusal and a Leg carrying reader_state_after refused by name (kogaki#1699), openingQuestionOf's absence, and the carriers deriving nothing from why the reader opened the post (kogaki#1225); the differentiation schema gone with its state (kogaki#1768); the renderings record composed at compose_path with one entry per term the Thesis does not keep, and a record rendering the Thesis's term, carrying a third key or naming a term in no claim refused by name (kogaki#1494).");
JS
