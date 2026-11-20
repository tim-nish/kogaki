// The text each program hands a model, rendered from one fixed input per case (kogaki#1863); checks/prompt-files-cases.mjs
// compares each against its saved file under programs/.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { withoutSchemaText } from "./cases.mjs";

export const PROGRAMS_DIR = join("checks", "fixtures", "prompt-files", "programs");
export const savedProgram = (name) => readFileSync(join(PROGRAMS_DIR, `${name}.txt`), "utf8");

const PROSE = ["The installer copies the kit into the tree.", "", "The next run overwrites any edit to the copy."].join(
  "\n",
);
const FIGURE = {
  rendered: "```\ninstaller -> tree\n```",
  lines: [9, 11],
  record_json: {
    kind: "chain",
    elements: { source: { text: "the installer", claim: "L1" } },
    caption: "the copy is the installer's",
    position: "before",
  },
  record_path: "theses/fixture/figure-s2.json",
};
const legAt = (figure) => ({
  leg_id: "s2",
  section: 1,
  section_title: "Where the copy lives",
  lines: [13, 15],
  prose: PROSE,
  ...(figure ? { figure } : {}),
});
const LEGS = (leg) => [
  {
    leg_id: "s1",
    section: 1,
    section_title: "Where the copy lives",
    lines: [5, 5],
    prose: "The kit ships in one tree.",
  },
  leg,
];
const EVIDENCE = {
  failed: [
    {
      item: "claims",
      class: "preserved",
      reason: "the passage asserts no claim about the copy",
      span: [13, 15],
      evidence: ["line thirteen names the tree only"],
      pairs: [
        { pair: 0, declared: "the next run overwrites the copy", verdict: "fails", reason: "it is not stated" },
        { pair: null, verdict: "cannot-decide", reason: "the passage is ambiguous" },
        { pair: 1, verdict: "holds", reason: "stated" },
      ],
    },
  ],
  held: [{ item: "introduces", reason: "the term is introduced" }],
  undecided: [{ item: "prose-style", reason: "the reader could not tell" }],
};
const EMPTY = { failed: [], held: [], undecided: [] };
const DECLARED = {
  claims: ["the copy is the installer's."],
  crosses_here: ["the copy"],
  journey: ["a lost edit"],
  reader_own_world: ["a tree"],
};
const OUTLINED = { claims: ["the copy is kept"], introduces: ["copy"] };
const FIGURE_OUTLINED = { element: ["the installer"], caption: "a copy", position: "before" };
// The items the judge is asked a question about, each rendered as the one pair it is handed.
export const QUESTIONED_ITEMS = [
  "claims",
  "introduces",
  "already-knows",
  "figure-elements",
  "figure-caption",
  "figure-reading-prose",
  "figure-position",
  "prose-style",
  "referents",
  "unsupported-sentence",
];

/** Every case's rendered text, by name. @param {(p: string) => Promise<any>} imp @returns {Promise<Map<string, string>>} */
export async function programTexts(imp) {
  const out = new Map();
  const { withNoToolsSentence } = await imp("src/workflow/detached-job/units.mjs");
  out.set("job-unit-no-tools", withNoToolsSentence("THE UNIT'S OWN PROMPT."));

  const X = await imp("src/move-extraction-playground/extract.mjs");
  const table = JSON.parse(readFileSync(X.EXTRACTION_TABLE, "utf8"));
  const row = { id: "extraction_unit", ...table.extraction_unit };
  const input = X.extractionUnitInput({
    passage: "the-passage",
    paragraphs: ["The installer copies the kit. It writes every file.", "The next run overwrites the copy."],
    index: 1,
    namesTaken: ["show_a_case"],
    persona: { reader: "An ordinary person", prior_knowledge: [] },
  });
  out.set("record-skeleton", withoutSchemaText(X.extractionUnitPrompt(row, input), row));

  const J = await imp("src/review-draft/join.mjs");
  const items = JSON.parse(readFileSync("src/review-items.json", "utf8")).items;
  const QUESTIONED = items.filter((i) => QUESTIONED_ITEMS.includes(i.id));
  const ws = mkdtempSync(join(tmpdir(), "prompt-files-programs-"));
  try {
    const draft = { path: "theses/fixture/draft.md" };
    for (const [n, item] of QUESTIONED.entries()) {
      const leg = legAt(item.figure_field || item.declared_source ? FIGURE : null);
      const declared = J.declaredSide(leg, item, DECLARED, items);
      const reverse = J.reverseSide(item, OUTLINED, FIGURE_OUTLINED);
      const dest = J.renderJoinPacket(ws, {}, 1, draft, leg, item, n === 0 ? 0 : null, declared, reverse);
      out.set(`judge-pair-${item.id}`, readFileSync(dest, "utf8"));
    }
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }

  const R = await imp("src/review-draft/reverse-outline.mjs");
  for (const [name, figure] of [
    ["outline-passage", null],
    ["outline-passage-figure-before", FIGURE],
    ["outline-passage-figure-after", { ...FIGURE, lines: [17, 19] }],
  ]) {
    const ows = mkdtempSync(join(tmpdir(), "prompt-files-outline-"));
    try {
      const leg = legAt(figure);
      out.set(name, readFileSync(R.renderReverseOutlineInput(ows, {}, {}, leg, LEGS(leg)), "utf8"));
    } finally {
      rmSync(ows, { recursive: true, force: true });
    }
  }
  const first = mkdtempSync(join(tmpdir(), "prompt-files-outline-"));
  try {
    const leg = { ...legAt(null), leg_id: "s1" };
    out.set("outline-passage-first", readFileSync(R.renderReverseOutlineInput(first, {}, {}, leg, [leg]), "utf8"));
  } finally {
    rmSync(first, { recursive: true, force: true });
  }

  const K = await imp("src/review-draft/correction.mjs");
  out.set("correction", K.renderCorrectionBlock(legAt(null), EVIDENCE));
  out.set("correction-empty", K.renderCorrectionBlock(legAt(null), EMPTY));
  out.set("figure-correction", K.renderFigureCorrectionBlock(legAt(FIGURE), EVIDENCE, "  THE PACKET.\n"));
  out.set("figure-correction-empty", K.renderFigureCorrectionBlock(legAt(FIGURE), EMPTY, "THE PACKET."));

  const py = (code) => execFileSync("python3", ["-c", code], { encoding: "utf8", cwd: "tools" });
  out.set(
    "read-passage",
    py(
      "import sys; from move_ingest_modules.passage import build_passage_prompt as b; " +
        "sys.stdout.write(b('  THE CONTRACT.\\n', '\\nTHE PASSAGE.\\n', '- one_move\\n'))",
    ),
  );
  out.set(
    "read-passage-empty-library",
    py(
      "import sys; from move_ingest_modules.passage import build_passage_prompt as b; " +
        "sys.stdout.write(b('THE CONTRACT.', 'THE PASSAGE.', '  \\n'))",
    ),
  );
  out.set(
    "derive-schema",
    py(
      "import sys; from derive_schema import assemble_prompt as a; " +
        "sys.stdout.write(a('THE DERIVATION.', [('first-slug', 'FIRST TEXT.'), ('second-slug', 'SECOND TEXT.')]))",
    ),
  );

  // The short Trial's readback (kogaki#1882), over the plan block cut from a fixed Writer input.
  const RB = await imp("src/structure-mapping-playground/readback.mjs");
  const cut = RB.planBlock(
    "# Write one Leg\n\n## The plan of this paragraph\n\nTHE PLAN.\n\n1. Argument 1. Pointed to by part 2.\n2. Neither. To part 1: both describe the same situation, from different perspectives.\n\n## The reader\n",
  );
  out.set("read-back-parts", RB.readbackPrompt(cut.block));
  return out;
}
