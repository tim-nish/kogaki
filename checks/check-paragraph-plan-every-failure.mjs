#!/usr/bin/env node
// check-paragraph-plan-every-failure — a ParagraphPlan refusal names every failure the program
// finds over the paragraph, not the first (kogaki#1813). Over one fixture paragraph carrying both
// a `join` on the first paragraph and a Role id in a point, under a grounded Mapping Table:
//   (a) `validateParagraphPlanUnit` refuses naming both, one line each, each naming paragraph 1,
//       and carries both in `failures` with paragraph 1 as the one site;
//   (b) the site call's `refused_here`, built from that refusal, carries both;
//   (c) a site answer carrying both again is refused naming both;
//   (e) the page renders each failure as its own `why:` line of the Round's Comment;
//   (f) one defect is one line: a paragraph carrying `move`, or a retired key, is refused once for it;
//   (g) a paragraph carrying `journeys` is refused once by name, and (h) no `legschema().<key>` names an undeclared key (kogaki#1818).
// Its (d), the missing expressions, went with the program's substring match (kogaki#1811).
// Declared limit: whether a live planner repairs every failure it is handed is the model's.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { validateParagraphPlanUnit, boundMoveContract } from "../src/paragraph-plan.mjs";
import { paragraphPlanSiteInput, validateParagraphPlanSite } from "../src/paragraph-plan/site-retry.mjs";
import { commentHtml } from "../src/flp/sheet.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const fails = [];
let cases = 0;
const ok = (cond, label) => {
  cases += 1;
  if (!cond) fails.push(label);
};

// The Move is the check's own fixture copy (kogaki#1625), as in check-paragraph-plan-axes.sh.
const moveId = "apply_a_definition_to_one_everyday_instance";
const root = mkdtempSync(join(tmpdir(), "paragraph-plan-every-failure-"));
const lib = join(root, "moves");
mkdirSync(lib);
writeFileSync(join(lib, "ROLES.json"), readFileSync(join(repo, "moves", "ROLES.json")));
writeFileSync(join(lib, `${moveId}.yaml`), readFileSync(join(repo, "checks", "fixtures", "moves", `${moveId}.yaml`)));
const segments = boundMoveContract(moveId, lib).segments.length;

// The Leg's grounded Mapping Table, where the Mapper writes it (kogaki#1734).
const table = {
  move: moveId,
  base: { domain: "a night shift" },
  correspondences: [{ role: "sentry", expression: "the night watchman" }],
};
mkdirSync(join(root, "mapping"));
writeFileSync(join(root, "mapping", "leg-1.json"), JSON.stringify({ table }));
const inputs = {
  movesDir: lib,
  bound: 2,
  mapping: true,
  runDir: root,
  legs: [{ leg_id: "v1", text: "A relation holds.", claims: [{ strand: "L1", proposition: "A claim." }] }],
};

// Paragraph 1 carries a `join`, and its first point the Role id "sentry".
const pws = Array.from({ length: segments }, (_, i) => ({
  point:
    i === 0 ? "The night watchman walks the round the sentry keeps." : `The night watchman goes on, part ${i + 1}.`,
  serves: ["L1"],
  cast: {},
}));
const paragraph = {
  paragraph: 1,
  materials: ["L1"],
  purpose: "brings the reader to the point.",
  depends_on: [],
  rationale: "the Move carries this point",
  introduces: [],
  "re-activate": [],
  join: "elaboration",
  paragraph_waypoints: pws,
};
const record = {
  version: "1",
  leg_id: "v1",
  move: moveId,
  rationale: "the Move carries the relation",
  paragraphs: [paragraph],
};
const JOIN = "Leg v1, paragraph 1 carries `join`";
const ROLE = 'Leg v1, paragraph 1: Paragraph 1\'s point 1 carries the Role id "sentry"';

// (a) the Leg call's validator names both.
const unit = validateParagraphPlanUnit(record, inputs, "leg-1");
const lines = String(unit.error || "").split("\n");
ok(
  lines.some((l) => l.startsWith(JOIN)) && lines.some((l) => l.startsWith(ROLE)),
  `(a) the unit refusal does not name both the join and the Role id, one line each: ${unit.error || "no refusal"}`,
);
ok(
  Array.isArray(unit.failures) && unit.failures.length === 2 && JSON.stringify(unit.sites) === "[1]",
  `(a) the unit refusal does not carry both failures at paragraph 1: ${JSON.stringify({ failures: unit.failures, sites: unit.sites })}`,
);

// (b) the site call is handed both.
const ctx = { site: 1, standing: record, history: [{ entry: paragraph, refusal: unit.error, by_judge: false }] };
const handed = paragraphPlanSiteInput(ctx, inputs, "leg-1")
  .refused_here.map((h) => h.refusal)
  .join("\n");
ok(handed.includes(JOIN) && handed.includes(ROLE), `(b) the site call's refused_here does not carry both: ${handed}`);

// (c) a site answer carrying both again, under a changed purpose so it is no repeat, is refused naming both.
const site = validateParagraphPlanSite(
  { ...paragraph, purpose: "brings the reader to the watch." },
  ctx,
  inputs,
  "leg-1",
);
ok(
  String(site.error || "").includes(JOIN) && String(site.error || "").includes(ROLE),
  `(c) the site refusal does not name both: ${site.error || "no refusal"}`,
);

// (f) one defect is one line: a paragraph carrying `move`, or a retired key, is refused once for it.
for (const [key, value] of [
  ["move", moveId],
  ["obligations", []],
]) {
  const clean = { ...paragraph, paragraph_waypoints: pws.map((p) => ({ ...p, point: "The night watchman goes on." })) };
  delete clean.join;
  const once = validateParagraphPlanUnit({ ...record, paragraphs: [{ ...clean, [key]: value }] }, inputs, "leg-1");
  ok(
    Array.isArray(once.failures) && once.failures.length === 1 && once.failures[0].text.includes(`\`${key}\``),
    `(f) a paragraph carrying \`${key}\` is not refused in one line: ${once.error || "no refusal"}`,
  );
}

// (g) `journeys`, a key src/leg-schema.json no longer declares, is refused once by name and never read (kogaki#1818).
let journeys;
try {
  const clean = { ...paragraph, paragraph_waypoints: pws.map((p) => ({ ...p, point: "The night watchman goes on." })) };
  delete clean.join;
  const carrying = { ...clean, journeys: [{ strand: "L1", use: "illustrate", meaning: "a scene." }] };
  journeys = validateParagraphPlanUnit({ ...record, paragraphs: [carrying] }, inputs, "leg-1");
} catch (e) {
  journeys = { error: `threw: ${e.message}` };
}
ok(
  Array.isArray(journeys.failures) &&
    journeys.failures.length === 1 &&
    journeys.failures[0].text.includes("carries `journeys`, a key src/leg-schema.json no longer declares"),
  `(g) a paragraph carrying \`journeys\` is not refused once by name: ${journeys.error || "no refusal"}`,
);

// (h) no reader of the Leg schema names a key the schema does not declare.
const declared = new Set(Object.keys(JSON.parse(readFileSync(join(repo, "src", "leg-schema.json"), "utf8"))));
const named = [
  ...readFileSync(join(repo, "src", "compose", "leg-schema.mjs"), "utf8").matchAll(
    /legschema\(\)\.([A-Za-z_$][\w$]*)/g,
  ),
].map((m) => m[1]);
const undeclared = [...new Set(named.filter((k) => !declared.has(k)))];
ok(
  named.length > 0 && undeclared.length === 0,
  `(h) src/compose/leg-schema.mjs reads ${named.length ? `legschema().${undeclared.join(", legschema().")}` : "no legschema() key"}, which src/leg-schema.json does not declare`,
);

// (e) the Comment renders one `why:` line per failure.
const html = commentHtml(
  { kind: "refused" },
  { text: unit.error || "", source: "validateParagraphPlanUnit" },
  {
    waypoints: [],
    segments: [],
  },
);
const whys = html.match(/<p class="line refusal">why: /g) || [];
ok(whys.length === 2, `(e) the Comment does not render each failure as its own line: ${html}`);

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log(
  `ok: check-paragraph-plan-every-failure — ${cases} cases: a refusal names every failure over the paragraph, the site call is handed all of them, and the page renders each as its own Comment line (kogaki#1813); a paragraph carrying journeys is refused once by name, and no Leg schema reader names an undeclared key (kogaki#1818)`,
);
