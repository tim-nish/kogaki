// The values checks/prompt-files-cases.mjs renders each saved prompt from (kogaki#1855).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HERE = join("checks", "fixtures", "prompt-files");
export const AUDIENCE = join(HERE, "audience.yaml");
export const TERMS = join(HERE, "terms.yml");

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
const point = (text, extra = {}) => ({ point: text, cast: {}, ...extra });
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
      paragraphs: [paragraph(1, ["L1"], [point("The installer copies the kit into the tree.")])],
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
      paragraphs: [paragraph(1, ["L2"], [point("The next run overwrites the edit.")])],
      journeys: [
        { strand: "L2", resolvedText: "A maintainer edited the copy on Monday and lost the edit on Tuesday." },
      ],
      "re-activate": ["s1 claim L1 as The installer puts a copy of the kit in the tree."],
    },
    prior: [{ leg_id: "s1", text: "The installer puts a copy of the kit in your tree." }],
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
    extra: { paragraphs: [paragraph(1, ["L1"], [point("The kit is edited at its source.")])] },
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
    extra: { paragraphs: [paragraph(1, ["L1"], [point("The installer copies the kit.")])] },
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
    extra: { paragraphs: [paragraph(1, ["L1"], [point("The installer copies the kit.")])] },
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
    extra: { paragraphs: [paragraph(1, ["L1"], [point("The installer copies the kit.")])] },
    prior: [],
  },
  "write-leg-japanese": {
    legs: [
      { leg_id: "s1", text: "The installer copies the kit.", claims: [claim("L1", "the installer copies the kit.")] },
    ],
    leg: "s1",
    extra: { paragraphs: [paragraph(1, ["L1"], [point("The installer copies the kit.")])] },
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

// The twenty-seven workflow-table rows whose instruction is a file under prompts/ (kogaki#1862): each rendered from
// ROW_INPUT and ROW_HISTORY and compared with the text saved before the move, `rows/<folder>/<file>.txt`.
const TABLE_FOLDERS = {
  "src/brief-workflow.json": "brief",
  "src/paragraph-plan-workflow.json": "paragraph-plan",
  "src/terrain-workflow.json": "terrain",
  "src/structure-mapping-playground/playground-workflow.json": "structure-mapping-playground",
  "src/move-extraction-playground/extraction-workflow.json": "move-extraction-playground",
  "src/leg-planning-playground/workflow.json": "leg-planning-playground",
};
const TABLE_ROWS = {
  "src/brief-workflow.json": [
    "read_structure",
    "apex",
    "compose_path",
    "review_path",
    "leg_sections",
    "review_path_unit",
    "defined_terms_unit",
    "thesis_bound_unit",
    "renderings_unit",
  ],
  "src/paragraph-plan-workflow.json": ["paragraph_plan_name_senses"],
  "src/terrain-workflow.json": ["J2_subdivision", "thesis_candidates", "J3_neighborhood"],
  "src/structure-mapping-playground/playground-workflow.json": [
    "sme_map_roles",
    "smp_bind_move",
    "smp_correspondence",
    "smp_read_move",
    "smp_pair_roles",
    "smp_rank_senses",
    "smp_join_senses",
  ],
  "src/move-extraction-playground/extraction-workflow.json": [
    "extraction_unit",
    "content_bound_unit",
    "constraints_unit",
    "leg_path_unit",
  ],
  "src/leg-planning-playground/workflow.json": ["sme_read_set"],
};
export const ROWS = Object.entries(TABLE_ROWS).flatMap(([table, ids]) =>
  ids.map((id) => ({ table, id, file: `${TABLE_FOLDERS[table]}/${id.toLowerCase().replace(/_/g, "-")}` })),
);
export const ROW_INPUT = { groups: [{ name: "g1" }, { name: "g2" }], fixture: "prompt-files" };
export const ROW_HISTORY = [{ answer: { version: "1" }, refusal: "the record names no group", reach: "part" }];
export const ROW_FLOW = { lane: "brief", label: "Prompt-file fixture" };
export const savedRow = (file) => readFileSync(join(HERE, "rows", `${file}.txt`), "utf8");
// A row's render with each schema text it shows verbatim cut to one line naming the file, so a schema edit leaves the
// saved text standing.
export function withoutSchemaText(text, row) {
  const files = Array.isArray(row.schema_file) ? row.schema_file : row.schema_file ? [row.schema_file] : [];
  let out = text;
  for (const f of files) {
    const whole = readFileSync(f, "utf8");
    const shown = Array.isArray(row.schema_blocks)
      ? JSON.stringify(Object.fromEntries(row.schema_blocks.map((b) => [b, JSON.parse(whole)[b]])), null, 2)
      : whole;
    out = out.split(shown).join(`<the text of ${f}>`);
  }
  return out;
}
