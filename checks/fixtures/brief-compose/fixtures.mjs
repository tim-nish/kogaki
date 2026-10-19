// Shared fixtures of the Brief composition members (kogaki#1460): the record
// builder, the fixture Brief reader, the Reader start text, the kogaki#1260
// path and the kogaki#1276 Move library. Moved verbatim from
// checks/check-brief-compose.sh; the Move library is now written on first use.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  strand_coverage: [], journey_coverage: [], closure: [], tradeoffs: {}, bridged: {},
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
    segments: [{ does: "states the claim." }, { does: "names the one case it does not cover.", relation: "limits the claim it follows." }] },
  m_turn: { breaks: ["breaks if only one party acts."],
    segments: [{ does: "states the first party's claim." }, { does: "answers the claim in kind.", relation: "answers the opening." }] },
};
export const segmentText = (f) => f.segments.map((x) => x.does);
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
