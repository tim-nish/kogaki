// review-draft/close — the owner record's evidence, read for `close`.
// Cut from src/review-draft.mjs at its named section (kogaki#1458); the
// design and its rulings are stated at the entry and in the Issues each
// block below names.
//
import { join, relative } from "node:path";
import { PASS_OUTCOMES } from "./regression.mjs";
import { currentPass } from "./workspace.mjs";

// ---------------------------------------------------------------------------
// `close` — the owner record. `theses/<slug>/review.md`, one per Draft,
// overwritten on re-run, headed by the Draft's body sha and the Packet shas.
// EVERY RESIDUE LINE CARRIES AN EMPTY `classified:` FIELD AND THE TOOL NEVER
// FILLS IT — what the residue is evidence about is the owner's judgment.
// The pass-directory pointers (kogaki#994 item 4) are rendered from the passes
// the run actually made. BOTH HALVES OF A POINTER ARE READ OFF THE ROW, NEVER
// OFF THE SECTION (PR #1004 round 2, findings 5 and 6): which pass read a row
// (a carried row is pass one's), and whether a join Packet exists for it (a
// Harness-decided line never had one, per the row's `judged` key). THE OUTLINE
// RECORD IS THE ONE THE RUN READ, from `run.outlineFields`, never composed
// from the pass.
function evidencePass(run, f) {
  return f.carried ? 1 : (run.checked_at ? 2 : 1);
}
// THE CHOSEN PAIR'S `judged` IS READ BEFORE THE ROW'S, and the order is the
// whole of this function (kogaki#1134). Since `decided_by` became `judged` a
// join row carries the key too, and the row's is a fact about ALL its pairs —
// any one judged makes it true — while this read is about the ONE pair the row
// renders. On a hybrid row the two disagree, so a row-first read would report a
// Packet pointer for a line the Harness decided. A residue row has no `pairs`
// and its own `judged` IS the chosen pair's, written by `check` from this very
// read, so it falls through correctly.
function chosenJudged(f) {
  if (Array.isArray(f.pairs)) {
    const sub = f.pairs.find((p) => p.pair === f.pair);
    return sub ? sub.judged === true : false;
  }
  return f.judged === true;
}
// THE POINTER FOLLOWS THE ROW'S OWN SIDE, NEVER THE LEG ALONE (PR #1024 round
// 1). A figure row's reverse side is the FIGURE's Reverse Outline —
// `outline/<leg>.figure.json`, written in the record's field names — and the
// passage's `outline/<leg>.json` carries none of the reading such a verdict was
// given on. Composing one pointer per Leg sent the owner to the wrong artifact
// for every `figure_only` row, which is the class PR #1004 round 2 repaired for
// the other rows. `figureIds` is read from the item table rather than spelled
// here, for the reason `figureItemIds` already states about itself.
function findingEvidencePaths(ws, run, f, figureIds = new Set(), recordDir) {
  if (!f.leg_id) return [];
  const pass = evidencePass(run, f);
  const rel = (...a) => relative(recordDir, join(ws, `pass-${pass}`, ...a))
    || join(ws, `pass-${pass}`, ...a);
  const isFigure = figureIds.has(f.item);
  const base = isFigure ? `${f.leg_id}.figure.json` : `${f.leg_id}.json`;
  const recorded = isFigure ? (run.figureOutlineFields || {}) : (run.outlineFields || {});
  const outlineFile = f.carried
    ? join(ws, "pass-1", "outline", base)
    : (recorded[f.leg_id] || join(ws, `pass-${pass}`, "outline", base));
  const label = isFigure ? "the figure's Reverse Outline" : "Reverse Outline";
  const out = [`  - ${label}: \`${relative(recordDir, outlineFile) || outlineFile}\``];
  if (chosenJudged(f)) {
    const name = f.pair === null || f.pair === undefined
      ? `${f.leg_id}.${f.item}.md` : `${f.leg_id}.${f.item}.${f.pair}.md`;
    out.push(`  - the pair the judge saw: \`${rel("join", name)}\``);
  } else {
    out.push("  - the pair the judge saw: none — this line was not a judge's answer to a rendered "
      + `Packet; \`${rel(pass === 1 ? "join.json" : "check.json")}\` records how it was decided`);
  }
  return out;
}

function evidenceLines(ws, run, recordDir) {
  const rel = (...a) => relative(recordDir, join(ws, ...a)) || join(ws, ...a);
  const out = [
    `- **Pass 1 — \`compare\`.** \`${rel("pass-1")}/\``,
    `  - \`outline-input/<leg>.md\` — what the blind reviewer was handed`,
    `  - \`outline/<leg>.json\` — what they wrote back`,
    `  - \`join/<leg>.<item>[.<pair>].md\` — the pair each verdict was given on`,
    `  - \`corrections/<leg>.md\` — the input each correction was written from`,
    // THE ONE RECORD A READER DEBUGGING MID-RUN REACHES FOR (kogaki#1134). The
    // `comparison/<leg>.md` files that stood beside it until kogaki#1134 were a
    // legend plus one line per pair restating this record; the class, the
    // verdict, the reason, the model and the span are all on the row here.
    `  - \`join.json\` — pass one's verdicts with each row's class, model and span,`,
    `    and which pairs were decided mechanically`,
  ];
  if (run.checked_at || currentPass(run) > 1) {
    out.push(
      `- **Pass 2 — \`check\`.** \`${rel("pass-2")}/\``,
      `  - \`outline-input/<leg>.md\` and \`outline/<leg>.json\` — the corrected Legs, re-read blind`,
      `  - \`join/<leg>.<item>[.<pair>].md\` — the pairs inside the second pass's bound`,
      `  - \`check.json\` — pass two's verdicts, the bound it applied, and what it carried`,
      "",
      "A pair pass two carried rather than re-judged has its verdict in `pass-1/join.json`",
      "and its input under `pass-1/join/`; the bound in `check.json` says which.");
  } else {
    out.push("- **Pass 2 — `check`.** Did not run, so there is no `pass-2/`.");
  }
  out.push("",
    `- **Snapshots.** \`${rel("snapshots")}/\` — the article before and after each correction,`,
    "  and, where pass two undid one, before and after each **restore**.",
    `- **Run record.** \`${rel("run.json")}\` — every path above, per Leg, as it was written.`);
  // THE ONE RECORD ABOUT BOTH PASSES (kogaki#1135). Named only where `check`
  // ran, by the same rule the `pass-2/` block above follows: a legend line
  // pointing at a file nothing wrote sends the owner to an absence.
  if (run.checked_at) {
    out.push(
      `- **Both passes.** \`${rel("passes.json")}\` — one row per Leg, item and pair, carrying`,
      `  pass one's verdict, pass two's, and one outcome word: ${PASS_OUTCOMES.join(", ")}.`,
      "  Comparing the passes meant reading the two join records side by side by hand;",
      "  `regressed` is the word neither of them carries.");
  }
  return out;
}

export { chosenJudged, findingEvidencePaths };
