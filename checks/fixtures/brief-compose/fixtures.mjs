// Shared fixtures of the Brief composition members (kogaki#1460): the record
// builder, the fixture Brief reader, the Reader start text, the kogaki#1260
// path and the kogaki#1276 Move library. Moved verbatim from
// checks/check-brief-compose.sh; the Move library is now written on first use.
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { composeBrief } from "../../../src/brief.mjs";
import { legRecord, briefRecordText, readerStateMap } from "../../../src/compose.mjs";
import { stringifyYaml } from "../../../src/yaml.mjs";
import { readBrief } from "../../../src/draft.mjs";

// A FIXTURE BRIEF IS A RECORD (kogaki#1328): its Legs written by `legRecord`,
// the file's text by `briefRecordText`, and read back by `readBrief` -- the
// one reader the Draft uses -- so a fixture exercises the round trip rather
// than an in-memory shortcut. `keys` overrides any top-level key.
export const recordOf = (legs, keys = {}) => ({
  slug: "fixture", compose_path: "audiences/dev-to-zenn.md", external_authority: "on",
  strands: [{ id: "L1", slug: "first-strand", cite: "coding::lesson/first-strand@" + "0".repeat(64) }],
  thesis: "The fixture claim.",
  reader_start: readerStateMap(`orientation: before ${legs[0].leg_id}\nknowledge: before ${legs[0].leg_id}`),
  reader_target: (legs.find((s) => s.reaches_target === true) || legs[legs.length - 1]).leg_id,
  reader_path: legs.map(legRecord),
  strand_coverage: [], journey_coverage: [], obligations: [], tradeoffs: {}, bridged: {},
  ...keys,
});
export const briefOfRecord = (record, path = "fixture.yaml") => readBrief(briefRecordText(record), path);

export const READER_START = "knowledge: can read code and has used a CI system\nquestion: holds: none\ntrust: the default a peer's post gets";

// THE FOUR kogaki#1260 FIXTURES share one minimal path: s1 opens the Section and
// introduces two terms, s2 reaches the Reader target, s3 closes. Each fixture
// varies one field and asserts on the ground named, never on a bare pass.
export const PATH_1260 = (s1extra = {}, s2extra = {}) => {
  const legOf = (leg_id, extra = {}) => ({
    leg_id, move: "open_the_claim", materials: ["L1", "L2"], purpose: `purpose of ${leg_id}`,
    reader_state_after: `orientation: after ${leg_id}\nknowledge: after ${leg_id}`,
    depends_on: [], rationale: `why ${leg_id}`, claims: [{ type: "strand", strand: "L1", proposition: `claim of ${leg_id}` }], waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"] }],
    ...extra,
  });
  const legs = [legOf("s1", { opens_section: "A Section", introduces: ["unfed guard — a guard whose input nobody feeds", "pipeline"], ...s1extra }),
    legOf("s2", { depends_on: ["s1"], reaches_target: true, ...s2extra }),
    legOf("s3", { depends_on: ["s2"] })];
  legs[2].reader_state_after = legs[1].reader_state_after;
  return legs;
};

// ---- kogaki#1276 fixtures: a Move library whose segments and breaks are
// distinctive, and Candidates whose Legs bind it. Every Move carries its
// `segments` -- the Adapter refuses one without them (kogaki#1412).
export const FIT_MOVE = {
  m_open: { breaks: ["breaks if the uncovered case is never named."],
    segments: [{ operation: "states the claim." }, { operation: "names the one case it does not cover.", relation: "limits the claim it follows." }] },
  m_turn: { breaks: ["breaks if only one party acts."],
    segments: [{ operation: "states the first party's claim." }, { operation: "answers the claim in kind.", relation: "answers the opening." }] },
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
    const rec = { id, description: `the fixture Move ${id}.`, before: { knowledge: `before ${id}.` }, after: { knowledge: `after ${id}.` }, breaks: f.breaks, segments: f.segments };
    writeFileSync(join(fitMoves, `${id}.yaml`), stringifyYaml(rec));
  }
  // A FIXTURE LIBRARY IS A LIBRARY (kogaki#1349): the adapter in
  // `src/compose.mjs` reads `<movesDir>/ROLES.json` with no fallback to the
  // repository's own, so this temporary library carries its own copy.
  writeFileSync(join(fitMoves, "ROLES.json"), readFileSync("moves/ROLES.json"));
  return fitMoves;
}
export const START_1276 = "knowledge: before\nquestion: holds: none";
export const leg1276 = (legId, extra) => ({
  leg_id: legId, move: "m_open", materials: ["L1"], purpose: `what ${legId} is for`,
  reader_state_after: "knowledge: after\nquestion: holds: none",
  depends_on: [], rationale: `why ${legId} sits here`,
  claims: [{ type: "strand", strand: "L1", proposition: `claim of ${legId}` }], waypoints: [{ point: `the paragraph establishes what ${legId} claims`, serves: ["L1"] }],
  ...extra,
});
export const cand1276 = (id, leg2Extra = {}) => ({
  candidate_id: id, characteristic: `path ${id}`, reader_experience: `experience ${id}`,
  reader_start: START_1276, reasoning: { leg_validity: "x" },
  legs: [leg1276("s1", { opens_section: "Intro" }), leg1276("s2", { move: "m_turn", depends_on: ["s1"], reaches_target: true, ...leg2Extra })],
});

// ---- kogaki#1494 fixture: the `differentiation` state run over a minted Brief
// whose settled set carries two source terms, "bamboo shoots" (L1) and "zebra"
// (L2), and whose Thesis carries "zebra". Both judged records are SUPPLIED by
// flag -- the renderings record as given, the Differentiation record a fixed
// valid one -- so no judge runs. The state's renderer is driven in a child
// `node`, because a refusal ends its process. Returns the child's status, its
// stderr, the renderings record the run carries, and whether the Differentiation
// record was reached.
export const THESIS_1494 = "A zebra crossing decides the defense.";
export const CLAIMS_1494 = {
  L1: "Bamboo shoots raise the cost of every attack.",
  L2: "A zebra crossing slows the defense only where the cost is high.",
};
export function runDifferentiation({ renderings }) {
  const dir = mkdtempSync(join(tmpdir(), "kogaki-1494-diff-"));
  const strands = [{ display_id: "L1", slug: "bamboo", cite: "fixture" }, { display_id: "L2", slug: "zebra", cite: "fixture" }];
  const briefPath = join(dir, "brief.yaml");
  writeFileSync(briefPath, composeBrief({ slug: "fixture", strands, thesis: THESIS_1494, composePath: "audiences/dev-to-zenn.md" }));
  const runState = join(dir, "run.json");
  writeFileSync(runState, JSON.stringify({ stage: "minted", strands,
    strand_renderings: { bamboo: { headline: CLAIMS_1494.L1 }, zebra: { headline: CLAIMS_1494.L2 } } }));
  const renderingsPath = join(dir, "renderings.json");
  writeFileSync(renderingsPath, JSON.stringify({ version: "1", renderings }));
  const diffPath = join(dir, "differentiation.json");
  writeFileSync(diffPath, JSON.stringify({ version: "1", reader_start: START_1276, leg1_survivors: ["m_open"],
    entries: [1, 2, 3].map((n) => ({ unit_number: n, dimension: ["knowledge", "question", "trust"][n - 1], opening_move: "m_open", reader_experience: `exp ${n}` })) }));
  const out = join(dir, "rec.json");
  const driver = `
    import { readFileSync, writeFileSync } from "node:fs";
    import { STATE_WORK } from "./src/brief/renderers.mjs";
    const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
    const st = table.states.find((s) => s.id === "differentiation");
    const rec = { _dir: ${JSON.stringify(dir)}, brief_run_state: ${JSON.stringify(runState)}, judgments: {},
      artifacts_written: [{ state: "mint", path: ${JSON.stringify(briefPath)} }] };
    await STATE_WORK.differentiation(rec, st, { "moves-dir": ${JSON.stringify(fitMoveLibrary())},
      renderings: ${JSON.stringify(renderingsPath)}, differentiation: ${JSON.stringify(diffPath)} }, table);
    writeFileSync(${JSON.stringify(out)}, JSON.stringify(rec));
  `;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", driver], { encoding: "utf8", timeout: 60000 });
  const rec = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};
  return {
    status: r.status, stderr: `${r.stderr || ""}${r.error ? r.error.message : ""}`,
    renderings: rec.brief_renderings ? JSON.parse(readFileSync(rec.brief_renderings, "utf8")) : null,
    differentiationRan: rec.brief_differentiation === diffPath,
  };
}
