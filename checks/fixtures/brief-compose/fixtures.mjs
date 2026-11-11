// Shared fixtures of the Brief composition members (kogaki#1460): the record
// builder, the fixture Brief reader, the Reader start text, the kogaki#1260
// path and the kogaki#1276 Move library. Moved verbatim from
// checks/check-brief-compose.sh; the Move library is now written on first use.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { composeBrief } from "../../../src/brief.mjs";
import { legRecord, briefRecordText } from "../../../src/compose.mjs";
import { stringifyYaml } from "../../../src/yaml.mjs";
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
  reader_path: legs.map(legRecord),
  strand_coverage: [],
  journey_coverage: [],
  tradeoffs: {},
  bridged: {},
  ...keys,
});
// THE DRAFT READS A LEG BY ITS TEXT (kogaki#1775, kogaki#1777): the compose-side fixtures below keep the
// legacy Waypoint form `validateLegs` still admits without a structure, and a record handed to readBrief
// is read with each Leg's first point as its text, the form the Draft's reader admits.
export const legacyLegsToText = (legs) =>
  (legs || []).map(({ waypoints, ...l }) => (l.text != null || !waypoints ? l : { ...l, text: waypoints[0].point }));
export const briefOfRecord = (record, path = "fixture.yaml") =>
  readBrief(briefRecordText({ ...record, reader_path: legacyLegsToText(record.reader_path) }), path);

export const READER_START =
  "knowledge: can read code and has used a CI system\nquestion: holds: none\ntrust: the default a peer's post gets";

// THE FOUR kogaki#1260 FIXTURES share one minimal path: s1 opens the Section, s2
// follows, s3 reaches the Reader target -- the last Leg, since kogaki#1768. Each fixture varies one field and asserts
// on the ground named, never on a bare pass. A Leg binds no Move and introduces
// no term (kogaki#1768), so it carries its id, claims, waypoints and placement.
export const PATH_1260 = (s1extra = {}, s2extra = {}) => {
  const legOf = (leg_id, extra = {}) => ({
    leg_id,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${leg_id}` }],
    waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"], case: "own" }],
    ...extra,
  });
  const legs = [
    legOf("s1", { opens_section: "A Section", ...s1extra }),
    legOf("s2", s2extra),
    legOf("s3", { reaches_target: true }),
  ];
  return legs;
};

// ---- kogaki#1276 fixtures: a Move library whose segments and breaks are
// distinctive, and Candidates whose Legs bind it. Every Move carries its
// `segments` -- the Adapter refuses one without them (kogaki#1412).
export const FIT_MOVE = {
  m_open: {
    breaks: ["breaks if the uncovered case is never named."],
    segments: [
      { operation: "states the claim." },
      { operation: "names the one case it does not cover.", relation: "limits the claim it follows." },
    ],
  },
  m_turn: {
    breaks: ["breaks if only one party acts."],
    segments: [
      { operation: "states the first party's claim." },
      { operation: "answers the claim in kind.", relation: "answers the opening." },
    ],
  },
};
export const segmentText = (f) => f.segments.map((x) => x.operation);
let fitMoves = null;
// The library's directory, written once per process; `moves/` is read from
// the repository root, the working directory every member runs in.
export function fitMoveLibrary() {
  if (fitMoves) return fitMoves;
  fitMoves = mkdtempSync(join(tmpdir(), "kogaki-1276-moves-"));
  // A Move record is YAML read by the Brief's own reader (kogaki#1413), so the
  // fixture is written by its writer, with `before` and `after` maps.
  for (const [id, f] of Object.entries(FIT_MOVE)) {
    const rec = {
      id,
      description: `the fixture Move ${id}.`,
      before: { knowledge: `before ${id}.` },
      after: { knowledge: `after ${id}.` },
      breaks: f.breaks,
      segments: f.segments,
      takes: [],
      leaves: [],
    };
    writeFileSync(join(fitMoves, `${id}.yaml`), stringifyYaml(rec));
  }
  // A FIXTURE LIBRARY IS A LIBRARY (kogaki#1349): the adapter in
  // `src/compose.mjs` reads `<movesDir>/ROLES.json` with no fallback to the
  // repository's own, so this temporary library carries its own copy.
  writeFileSync(join(fitMoves, "ROLES.json"), readFileSync("moves/ROLES.json"));
  return fitMoves;
}
export const START_1276 = "knowledge: before\nquestion: holds: none";
// A Leg binds no Move (kogaki#1768): the fixture Leg carries its id, claims and waypoints.
export const leg1276 = (legId, extra) => ({
  leg_id: legId,
  claims: [{ type: "strand", strand: "L1", proposition: `claim of ${legId}` }],
  waypoints: [{ point: `the paragraph establishes what ${legId} claims`, serves: ["L1"], case: "own" }],
  ...extra,
});
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
