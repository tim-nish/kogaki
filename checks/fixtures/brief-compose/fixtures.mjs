// Shared fixtures of the Brief composition members (kogaki#1460): the record
// builder, the fixture Brief reader, the Reader start text, the kogaki#1260
// path and the kogaki#1276 Candidates. Moved from checks/check-brief-compose.sh.
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { composeBrief } from "../../../src/brief.mjs";
import { legRecord, briefRecordText } from "../../../src/compose.mjs";
import { readBrief } from "../../../src/draft.mjs";

// A FIXTURE BRIEF IS A RECORD (kogaki#1328): its Legs written by `legRecord`,
// the file's text by `briefRecordText`, and read back by `readBrief` -- the
// one reader the Draft uses -- so a fixture exercises the round trip rather
// than an in-memory shortcut. `keys` overrides any top-level key.
export const recordOf = (legs, keys = {}) => ({
  slug: "fixture",
  compose_path: "audiences/dev-to-zenn.md",
  strands: [{ id: "L1", slug: "first-strand", cite: "coding::lesson/first-strand@" + "0".repeat(64) }],
  thesis: "The fixture claim.",
  structure: structureOf(legs),
  reader_path: legs.map(legRecord),
  strand_coverage: [],
  journey_coverage: [],
  tradeoffs: {},
  bridged: {},
  ...keys,
});
// A FIXTURE LEG IS ONE RELATION OF THE FIXTURE STRUCTURE (kogaki#1775, kogaki#1885): it names the
// relation `c_<leg_id>` and says it in `text`. `structureOf` builds the structure those Legs name, one
// relation for each Leg between the two fixture Roles, and marks the last Leg's relation as the apex.
export const fixtureLeg = (leg_id, extra = {}) => ({
  leg_id,
  relation: `c_${leg_id}`,
  text: `The paragraph establishes what ${leg_id} claims.`,
  claims: [{ type: "strand", strand: "L1", proposition: `claim of ${leg_id}` }],
  ...extra,
});
export const structureOf = (legs) => ({
  roles: [
    { id: "r_1", name: "claim", context: "What the fixture claims.", attributes: [], claims: ["L1"] },
    { id: "r_2", name: "ground", context: "What the fixture claim stands on.", attributes: [], claims: ["L1"] },
  ],
  relations: (legs || [])
    .filter((l) => l && typeof l.relation === "string")
    .map((l) => ({ id: l.relation, name: l.relation, between: ["r_1", "r_2"], holds: l.text, from: "L1" })),
  higher_order: [],
  attains_thesis: ((legs || []).findLast((l) => l && typeof l.relation === "string") || {}).relation,
});
export const briefOfRecord = (record, path = "fixture.yaml") => readBrief(briefRecordText(record), path);

export const READER_START =
  "knowledge: can read code and has used a CI system\nquestion: holds: none\ntrust: the default a peer's post gets";

// THE FOUR kogaki#1260 FIXTURES share one minimal path: s1 opens the Section, s2
// follows, s3 reaches the Reader target -- the last Leg, since kogaki#1768. Each fixture varies one field and asserts
// on the ground named, never on a bare pass. A Leg binds no Move and introduces
// no term (kogaki#1768), so it carries its id, relation, text, claims and placement.
export const PATH_1260 = (s1extra = {}, s2extra = {}) => {
  const legs = [
    fixtureLeg("s1", { opens_section: "A Section", ...s1extra }),
    fixtureLeg("s2", s2extra),
    fixtureLeg("s3", { reaches_target: true }),
  ];
  return legs;
};

// ---- kogaki#1276 fixtures: Candidates whose Legs bind no Move (kogaki#1768).
export const START_1276 = "knowledge: before\nquestion: holds: none";
// A Leg binds no Move (kogaki#1768): the fixture Leg carries its id, relation, text and claims.
export const leg1276 = (legId, extra) => fixtureLeg(legId, extra);
// One Reader Path (kogaki#1768): no `characteristic` or `reader_experience`, which are retired.
export const cand1276 = (id, leg2Extra = {}) => ({
  candidate_id: id,
  reasoning: { leg_validity: "x" },
  legs: [leg1276("s1", { opens_section: "Intro" }), leg1276("s2", { reaches_target: true, ...leg2Extra })],
});

// ---- kogaki#1494 fixture: the renderings record, asked at the start of the
// `compose_path` state (kogaki#1768, where `differentiation` asked it before),
// run over a minted Brief whose settled set carries two source terms, "bamboo
// shoots" (L1) and "zebra" (L2), and whose Thesis carries "zebra". The
// renderings record is SUPPLIED by flag, so no judge runs. The state is driven
// in a child `node` over a run record carrying no resolved judge binary, so a
// record the state admits stops at the job's judge settings, before any job
// starts; a refused one stops earlier, at the renderings refusal. Returns the child's
// status and stderr, and whether the record was admitted.
export const THESIS_1494 = "A zebra crossing decides the defense.";
export const CLAIMS_1494 = {
  L1: "Bamboo shoots raise the cost of every attack.",
  L2: "A zebra crossing slows the defense only where the cost is high.",
};
export const STRUCTURE_1494 = {
  roles: [{ id: "cost", context: "What an attack costs.", attributes: [], claims: ["L1"] }],
  relations: [{ id: "r1", between: ["cost"], holds: "{cost} rises.", claims: ["L1"] }],
  higher_order: [],
  attains_thesis: "r1",
};
export function runRenderings({ renderings }) {
  const dir = mkdtempSync(join(tmpdir(), "kogaki-1494-renderings-"));
  const strands = [
    { display_id: "L1", slug: "bamboo", cite: "fixture" },
    { display_id: "L2", slug: "zebra", cite: "fixture" },
  ];
  const briefPath = join(dir, "brief.yaml");
  writeFileSync(
    briefPath,
    composeBrief({
      slug: "fixture",
      strands,
      thesis: THESIS_1494,
      composePath: "audiences/dev-to-zenn.md",
      structure: STRUCTURE_1494,
    }),
  );
  const runState = join(dir, "run.json");
  writeFileSync(
    runState,
    JSON.stringify({
      stage: "minted",
      strands,
      strand_renderings: { bamboo: { headline: CLAIMS_1494.L1 }, zebra: { headline: CLAIMS_1494.L2 } },
    }),
  );
  const renderingsPath = join(dir, "renderings.json");
  writeFileSync(renderingsPath, JSON.stringify({ version: "1", renderings }));
  const driver = `
    import { readFileSync } from "node:fs";
    import { STATE_WORK } from "./src/brief/renderers.mjs";
    const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
    const st = table.states.find((s) => s.id === "compose_path");
    const rec = { _dir: ${JSON.stringify(dir)}, brief_run_state: ${JSON.stringify(runState)}, judgments: {},
      artifacts_written: [{ state: "mint", path: ${JSON.stringify(briefPath)} }] };
    await STATE_WORK.compose_path(rec, st, { renderings: ${JSON.stringify(renderingsPath)} }, table);
  `;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", driver], { encoding: "utf8", timeout: 60000 });
  const stderr = `${r.stderr || ""}${r.error ? r.error.message : ""}`;
  return { status: r.status, stderr, admitted: /carries no resolved judge binary/.test(stderr) };
}
