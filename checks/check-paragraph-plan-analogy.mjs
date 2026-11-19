#!/usr/bin/env node
// check-paragraph-plan-analogy — the Analogy Mapping's module, src/paragraph-plan-analogy.mjs, which the Structure-
// Mapping Playground's short Trial and the ParagraphPlanPlayground still read (kogaki#1778, kogaki#1812). Since
// kogaki#1865 /paragraph-plan makes no analogy call and its plan file carries no `analogy`, so the cases that drove
// the stage's opening step, (a) to (e) and (g), are retired; (f) calls the validator, `analogyOf`, the plan reader
// and the projection directly, and is stated in this member's `contract` in checks/registry.json.
import { join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const fails = [];
const repo = resolve(".");
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const { paragraphPlanShapeRefusal } = await imp("src/paragraph-plan.mjs");
const { validateAnalogyMapping, analogyOf, legTable } = await imp("src/paragraph-plan-analogy.mjs");

const STRUCTURE = {
  roles: [
    { id: "r_1", name: "installer", context: "the program that copies the kit.", attributes: [], claims: ["L1"] },
    { id: "r_2", name: "copy", context: "the files it writes.", attributes: [], claims: ["L1"] },
    { id: "r_3", name: "edit", context: "a change the consumer makes.", attributes: [], claims: ["L2"] },
  ],
  relations: [
    { id: "c_1", name: "writes", between: ["r_1", "r_2"], holds: "The {r_1} writes the {r_2}.", from: "L1" },
    { id: "c_2", name: "overwrites", between: ["r_2", "r_3"], holds: "The {r_2} overwrites any {r_3}.", from: "L2" },
  ],
  higher_order: [
    {
      id: "h_1",
      name: "ownership",
      relates: ["c_1", "c_2"],
      holds: "The {r_2} is the {r_1}'s, not the consumer's.",
      from: ["L1", "L2"],
    },
  ],
  attains_thesis: "h_1",
  reach: ["c_1", "c_2", "h_1"],
  unreached: { relations: [], higher_order: [], claims: [] },
};
const MAPPING = {
  version: "1",
  base_domain: { name: "a lending library", description: "A library lends its books and takes them back." },
  roles: [
    { role: "r_1", counterpart: "the librarian" },
    { role: "r_2", counterpart: "the lent book" },
    { role: "r_3", counterpart: "a reader's margin note" },
  ],
  relations: [
    { relation: "c_1", counterpart: "the librarian lends the book" },
    { relation: "c_2", counterpart: "the returned book is wiped of notes" },
    { relation: "h_1", counterpart: "the book is the library's, not the reader's" },
  ],
};

// (f) the validator, the plan reader and the projection.
{
  const v = (rec) => validateAnalogyMapping(rec, { structure: STRUCTURE }).error || null;
  if (v(MAPPING)) fails.push(`(f) the whole mapping is refused: ${v(MAPPING)}`);
  const cut = (k, id) => ({ ...MAPPING, [k]: MAPPING[k].filter((x) => x[k === "roles" ? "role" : "relation"] !== id) });
  const want = [
    [cut("roles", "r_2"), "the Role r_2 without a counterpart"],
    [cut("relations", "c_2"), "the reached relation c_2 without a counterpart"],
    [cut("relations", "h_1"), "the apex h_1 without a counterpart"],
    [{ ...MAPPING, roles: [...MAPPING.roles, { role: "r_9", counterpart: "x" }] }, "r_9"],
    [{ version: "1", none: "" }, "no reason"],
    [{ ...MAPPING, none: "no domain fits." }, "`none` carries its reason and nothing else"],
  ];
  for (const [rec, says] of want)
    if (!String(v(rec)).includes(says)) fails.push(`(f) refusal ${JSON.stringify(says)} not given: ${v(rec)}`);
  if (v({ version: "1", none: "no domain the reader holds carries the system." }))
    fails.push("(f) a reasoned none is refused");
  if (analogyOf({ none: "x." }) || analogyOf(MAPPING) !== MAPPING)
    fails.push("(f) a mapping recorded none is handed to a Leg, or a mapping is not");
  // The plan file carries no analogy since kogaki#1865: the reader refuses one by name, however well formed.
  const plan = { version: "2", brief: { path: "b", sha256: "s" }, analogy: MAPPING, legs: [] };
  if (!String(paragraphPlanShapeRefusal(plan, "p", [])).includes("carries `analogy`"))
    fails.push("(f) the plan reader does not refuse a plan carrying an analogy by name");
  const t = legTable("pa", [{ id: "r_3" }, { id: "r_1" }, { id: "r_9" }], MAPPING);
  if (
    JSON.stringify(t) !==
    JSON.stringify({
      move: "pa",
      base: { domain: "a lending library" },
      correspondences: [
        { role: "r_3", expression: "a reader's margin note" },
        { role: "r_1", expression: "the librarian" },
      ],
    })
  ) {
    fails.push(
      `(f) legTable is not the mapping's counterparts for the Leg's Roles under its Move: ${JSON.stringify(t)}`,
    );
  }
  if (legTable("pa", [{ id: "r_1" }], { none: "x." }) || legTable("pa", [{ id: "r_9" }], MAPPING))
    fails.push("(f) legTable writes a table from a none mapping or from no Role it names");
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log(
  "ok: check-paragraph-plan-analogy — an Analogy Mapping is one counterpart per Role and per reached relation, or none with its reason, refused by name otherwise (kogaki#1778); a none mapping is handed to no Leg; a Leg's table is the mapping's projection onto its Roles (kogaki#1812); and a plan file carrying `analogy` is refused by name (kogaki#1865).",
);
