// The values checks/prompt-files-cases.mjs renders each saved prompt from (kogaki#1855).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HERE = join("checks", "fixtures", "prompt-files");
export const AUDIENCE = join(HERE, "audience.yaml");
export const TERMS = join(HERE, "terms.yml");

const SEGMENTS = [
  { segment: 1, operation: "name the case the reader already meets", relation: "", manner: "" },
  { segment: 2, operation: "state what the case shows", relation: "follows from the case", manner: "terse" },
];
const MOVE = {
  id: "show_a_case_then_state_it",
  description: null,
  segments: SEGMENTS,
  takes: "a question",
  leaves: "an answer",
};
const LEG = {
  leg_id: "s2",
  text: "The installer writes into the consumer's tree, and the next run overwrites any edit to the copy.",
  claims: [{ strand: "L1", proposition: "the installer copies the kit into the consumer's tree." }],
};
export const PLAN_INPUT = {
  leg_you_must_plan: LEG,
  paragraphs_at_most: 2,
  paragraph_moves_you_may_bind: [MOVE],
  persona: { reader: "An ordinary person with no specialized knowledge", prior_knowledge: "(none declared)" },
};
const ANSWER = {
  version: "1",
  leg_id: "s2",
  move: MOVE.id,
  rationale: "The Leg shows one case and states it.",
  paragraphs: [
    {
      paragraph: 1,
      materials: ["L1"],
      paragraph_waypoints: [{ point: "The installer copies the kit.", serves: ["L1"] }],
    },
  ],
};
export const PLAN_HISTORY = {
  part: [{ answer: ANSWER, refusal: "paragraph 1: the Waypoint states no point of Segment 2", reach: "part" }],
  record: [{ answer: ANSWER, refusal: "the record binds a Move whose takes the Leg does not hold", reach: "record" }],
};
// The Points call under a Move table (kogaki#1858): one Leg's Arguments and CentralClaim, and per Segment what is bound
// to it and its Sense.
export const POINTS_INPUT = {
  leg: {
    leg_id: "s2",
    arguments: [
      { id: "c_1", sentence: "The installer writes the copy." },
      { id: "c_2", sentence: "The copy overwrites any edit." },
    ],
    central_claim: { id: "h_1", sentence: "The copy is the installer's." },
  },
  segments: [
    { segment: 1, bound: { kind: "Argument", id: "c_1" }, sense: null },
    { segment: 2, bound: null, sense: { sense: "Concession", to: [1] } },
    { segment: 3, bound: { kind: "CentralClaim", id: "h_1" }, sense: { sense: "Cause", to: [2] } },
  ],
};
export const PLAYGROUND_TABLE = { paired: "smp_paired_plan", table: "smp_table_plan" };

export const JUDGE_INPUT = { leg_you_must_judge: LEG, paragraphs: ANSWER.paragraphs, move: MOVE };
export const JUDGE_HISTORY = [
  {
    answer: { version: "1", leg_id: "s2", verdicts: [] },
    refusal: "a record carrying no verdict for paragraph 1",
    reach: "part",
  },
];

const STRANDS = [
  { id: "L1", slug: "first-strand", cite: `coding::lesson/first-strand@${"0".repeat(64)}` },
  {
    id: "L2",
    slug: "second-strand",
    cite: `coding::lesson/second-strand@${"1".repeat(64)}`,
    journey_cite: `coding::journey/second-strand@${"2".repeat(64)}`,
  },
];
const claim = (strand, proposition) => ({ strand, proposition });
const point = (text, serves, extra = {}) => ({ point: text, serves, cast: {}, ...extra });
const paragraph = (n, materials, waypoints, join = null) => ({
  materials,
  purpose: `PURPOSE-${n} brings the reader to the point.`,
  depends_on: n > 1 ? [n - 1] : [],
  rationale: `RATIONALE-${n} its before holds the state the paragraph before leaves.`,
  "re-activate": [],
  ...(join ? { join } : {}),
  paragraph_waypoints: waypoints,
});

// Each Writer case: the Brief's record, the Leg rendered, what is laid on that Leg, the Legs realized before it.
export const WRITER_CASES = {
  "write-leg-opens-the-one-section": {
    legs: [
      { leg_id: "s1", text: "The installer copies the kit.", claims: [claim("L1", "the installer copies the kit.")] },
    ],
    leg: "s1",
    extra: {
      paragraphs: [paragraph(1, ["L1"], [point("The installer copies the kit into the tree.", ["L1"])])],
      budget: 120,
    },
    prior: [],
  },
  "write-leg-continues-a-headed-section": {
    legs: [
      {
        leg_id: "s1",
        text: "The installer copies the kit.",
        claims: [claim("L1", "the installer copies the kit.")],
        opens_section: "Where the copy lives",
      },
      {
        leg_id: "s2",
        text: "An edit to the copy is lost on the next run.",
        claims: [claim("L2", "the next run overwrites an edit to the copy.")],
        reaches_target: true,
      },
      {
        leg_id: "s3",
        text: "The kit is edited at its source.",
        claims: [claim("L1", "the kit is edited at its source.")],
      },
    ],
    leg: "s2",
    extra: {
      paragraphs: [paragraph(1, ["L2"], [point("The next run overwrites the edit.", ["L2"])])],
      journeys: [
        { strand: "L2", resolvedText: "A maintainer edited the copy on Monday and lost the edit on Tuesday." },
      ],
      "re-activate": ["s1 claim L1 as The installer puts a copy of the kit in the tree."],
    },
    prior: [{ leg_id: "s1", text: "The installer puts a copy of the kit in your tree." }],
  },
  "write-leg-join-cast-operation": {
    legs: [
      { leg_id: "s1", text: "The installer copies the kit.", claims: [claim("L1", "the installer copies the kit.")] },
    ],
    leg: "s1",
    extra: {
      paragraphs: [
        paragraph(1, ["L1"], [point("The installer copies the kit.", ["L1"], { cast: { terse: true, dated: true } })]),
        paragraph(
          2,
          ["L1"],
          [
            { performs: "the reader is asked to recall the first run" },
            point("The copy is the consumer's own file.", ["L1"], { forced_by: ["TAKEN"] }),
          ],
          "consequence",
        ),
      ],
    },
    prior: [],
  },
  "write-leg-follows-the-reader-target": {
    legs: [
      {
        leg_id: "s1",
        text: "The installer copies the kit.",
        claims: [claim("L1", "the installer copies the kit.")],
        reaches_target: true,
      },
      {
        leg_id: "s2",
        text: "The kit is edited at its source.",
        claims: [claim("L1", "the kit is edited at its source.")],
      },
    ],
    leg: "s2",
    extra: { paragraphs: [paragraph(1, ["L1"], [point("The kit is edited at its source.", ["L1"])])] },
    prior: [],
  },
  "write-leg-opens-a-headed-section-alone": {
    legs: [
      {
        leg_id: "s1",
        text: "The installer copies the kit.",
        claims: [claim("L1", "the installer copies the kit.")],
        opens_section: "Where the copy lives",
      },
      {
        leg_id: "s2",
        text: "The kit is edited at its source.",
        claims: [claim("L1", "the kit is edited at its source.")],
        opens_section: "Where the kit is edited",
      },
    ],
    leg: "s1",
    extra: { paragraphs: [paragraph(1, ["L1"], [point("The installer copies the kit.", ["L1"])])] },
    prior: [],
  },
  "write-leg-opens-a-headed-section-before-one-more": {
    legs: [
      {
        leg_id: "s1",
        text: "The installer copies the kit.",
        claims: [claim("L1", "the installer copies the kit.")],
        opens_section: "Where the copy lives",
      },
      {
        leg_id: "s2",
        text: "The kit is edited at its source.",
        claims: [claim("L1", "the kit is edited at its source.")],
      },
    ],
    leg: "s1",
    extra: { paragraphs: [paragraph(1, ["L1"], [point("The installer copies the kit.", ["L1"])])] },
    prior: [],
  },
  "write-leg-opens-a-headed-section-before-two-more": {
    legs: [
      {
        leg_id: "s1",
        text: "The installer copies the kit.",
        claims: [claim("L1", "the installer copies the kit.")],
        opens_section: "Where the copy lives",
      },
      {
        leg_id: "s2",
        text: "The kit is edited at its source.",
        claims: [claim("L1", "the kit is edited at its source.")],
      },
      {
        leg_id: "s3",
        text: "The next run leaves the source alone.",
        claims: [claim("L1", "the next run leaves the source alone.")],
      },
    ],
    leg: "s1",
    extra: { paragraphs: [paragraph(1, ["L1"], [point("The installer copies the kit.", ["L1"])])] },
    prior: [],
  },
  "write-leg-japanese": {
    legs: [
      { leg_id: "s1", text: "The installer copies the kit.", claims: [claim("L1", "the installer copies the kit.")] },
    ],
    leg: "s1",
    extra: { paragraphs: [paragraph(1, ["L1"], [point("The installer copies the kit.", ["L1"])])] },
    prior: [],
    lang: "ja",
  },
};

export function writerBriefRecord(c) {
  return {
    slug: "prompt-files",
    compose_path: AUDIENCE,
    strands: STRANDS,
    thesis: "The fixture claim.",
    legs: c.legs,
  };
}

export const savedPrompt = (name) => readFileSync(join(HERE, `${name}.txt`), "utf8");
