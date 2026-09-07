// The deterministic figure renderer (kogaki#879).
// [see: SPEC-draft-pipeline "The renderer and the anchor — markup from the
// record, at the Step"]//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
// already drifted into eight variants, which is what kogaki#982 collapsed.
//
// ONE RECORD IN, ONE STRING OUT, NO MODEL CALL. The figure record — the
// form's instance, filled after the prose — is the
// instance of the Move's form and stops there; this maps that record to the
// markup a reader meets. The two halves are separate on purpose: the record is
// a DESIGN, judged at kogaki#880's round trip, and the markup is a
// TRANSCRIPTION of it — so a Mermaid syntax defect is a defect of this file,
// fixed once, rather than of the sitting that happened to produce the record.
//
// THE MODEL NEVER WRITES MERMAID. That is the whole point of the seat: prose
// that draws its own diagram is a second author on the figure, refused at
// `section` exactly as a second heading author is (kogaki#823)
// [see: SPEC-draft-pipeline "The Section — a grouping of Steps, declared on
// `opens_section`"]. What
// makes the refusal fair is that this file exists — a seat is only closed to
// one author if another actually fills it.
//
// SAME RECORD, SAME BYTES. Every branch below is a pure function of the
// record and src/figure-kinds.json: no clock, no path, no map iteration order
// that is not the kind's own declared `roles` order. The trace pins the
// record's sha downstream, and a renderer whose output moved under a fixed sha
// would make that pin answer for nothing.
//
// PLAIN MERMAID DEFAULTS. No `classDef`, no `style`, no theme directive — a
// portfolio theme is the tracking issue's (kogaki#875) and out of scope here.
// Emphasis is therefore carried by SHAPE rather than by colour: the emphasised
// node renders in the subroutine form `[[…]]`, which every Mermaid renderer
// draws distinctly with no stylesheet at all.
import { figureKinds } from "./compose.mjs";

// The fence language, and the diagram header this file emits. Named once
// because `checkMermaid` below reads them back: a grammar check that carried
// its own copy of the header would pass a renderer that had drifted from it.
export const MERMAID_FENCE = "mermaid";
const HEADER = "flowchart LR";

// The kinds that render as Mermaid; everything else in the closed set renders
// as Markdown. Derived from this table rather than from the kind set, so a
// kind admitted to src/figure-kinds.json without a seat here is REFUSED by
// name instead of rendering as an empty diagram.
//
// `edges` is the kind's fixed shape over its own roles, by role NAME rather
// than by index — an index would silently re-point if a kind's `roles` order
// were ever edited, and a figure pointing at the wrong element is exactly the
// defect that has no visible signature.
const SHAPES = {
  axis:      { edges: [["endpoint_a", "criterion"], ["criterion", "endpoint_b"]], stadium: ["criterion"] },
  chain:     { edges: [["stages", "bottlenecks"]], stadium: [] },
  tree:      { edges: [["root", "branches"]], stadium: [] },
  threshold: { edges: [["successes", "line"], ["line", "failures"]], stadium: ["line"] },
};
const TABLE_KINDS = new Set(["matrix"]);

// Mermaid label escaping. A label is always quoted, so the only character that
// can end it early is the quote itself; `#quot;` is Mermaid's own entity form.
// Newlines collapse to a space rather than to `<br/>`: a line break is a
// LAYOUT decision and this renderer makes none, so a record whose text spans
// lines renders as the one line it means.
function label(text) {
  return String(text).replace(/"/g, "#quot;").replace(/\s*\n\s*/g, " ").trim();
}

// Markdown table-cell escaping: a literal pipe would end the cell.
function cell(text) {
  return String(text).replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();
}

// The node id for a role. Stable, derived from the role name, and never from
// the element's text — an id that moved with the wording would make two
// renders of one record differ whenever a caption was reworded.
function nodeId(role) {
  return `n_${role.replace(/[^A-Za-z0-9_]/g, "_")}`;
}

function nodeDecl(role, text, { stadium, emphasised }) {
  const l = `"${label(text)}"`;
  if (emphasised) return `${nodeId(role)}[[${l}]]`;
  if (stadium) return `${nodeId(role)}([${l}])`;
  return `${nodeId(role)}[${l}]`;
}

// THE RELATIONS ARE THE EDGE LABELS, and the surplus rule is stated rather
// than left to the reader. `relations` is a non-empty list (the figure
// record's mechanical
// half, clause 6) and each kind's shape has a fixed edge count, so the two do
// not line up in general. Relations are attached to edges in order; anything
// past the last edge JOINS the last edge's label with `; ` rather than being
// dropped. Dropping is what a renderer must never do — the record is the
// owner's design, and a figure that silently rendered three of five relations
// would be the drop-with-no-report shape this repository refuses everywhere.
function edgeLabels(relations, edgeCount) {
  const out = [];
  for (let i = 0; i < edgeCount; i++) out.push(relations[i] === undefined ? null : String(relations[i]));
  const surplus = relations.slice(edgeCount);
  if (surplus.length) {
    const last = edgeCount - 1;
    out[last] = [out[last], ...surplus].filter((x) => x !== null && x !== undefined).map(String).join("; ");
  }
  return out;
}

// A MINIMAL GRAMMAR CHECK, and its bound is stated rather than implied
// (acceptance 1). It is NOT a Mermaid parser and does not claim to be: it
// asserts that what this renderer emitted is well-formed in the small subset
// this renderer emits — the header line, then node-and-edge statements whose
// brackets and quotes balance. That is exactly what an external tool would be
// carried for, and carrying one would put a network dependency and a version
// pin inside a fixture pass that is seam-free by construction.
//
// WHAT IT CANNOT SEE, so the pass is not read as more: a diagram that parses
// and says the wrong thing. That judgment is kogaki#880's round trip, against
// the RENDERED figure, and it is deliberately not attempted here.
export function checkMermaid(src) {
  const lines = String(src).split("\n");
  if (lines[0] !== HEADER) {
    return `the first line is ${JSON.stringify(lines[0] ?? null)} and a Mermaid block this renderer emits opens with ${JSON.stringify(HEADER)} — a diagram with no declared type is not a diagram`;
  }
  if (lines.length < 2) return "the block declares a diagram type and carries no statement — an empty diagram is a fence, not a figure";
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === "") continue;
    if (!/^ {2}\S/.test(raw)) {
      return `line ${i + 1} (${JSON.stringify(raw)}) is not indented by exactly two spaces — every statement under the header is, and an unindented one is text that landed in the block`;
    }
    const line = raw.trim();
    // Quotes balance, and a label's inner quote must already have been escaped
    // to `#quot;` by `label` above — an odd count means one got through.
    if ((line.match(/"/g) || []).length % 2 !== 0) {
      return `line ${i + 1} carries an odd number of quotes (${JSON.stringify(line)}) — a label opened and never closed swallows the rest of the diagram`;
    }
    // THE BALANCE TEST RUNS OUTSIDE QUOTED SPANS (PR #939 round 1, finding 1).
    // It used to run over the whole line, so a bracket or paren in an element's
    // own wording — `cost per unit (amortised)`, a citation, an aside — was
    // counted as node syntax. Mermaid's quoted labels carry those characters
    // fine, so the record was valid, the diagram would have rendered, and the
    // run died at `emit` — the LAST act — with a message saying "this is a
    // renderer defect, fixed here and not in the record", pointing the owner
    // away from the text that actually caused it.
    //
    // ESCAPING THE BRACKETS WAS THE DECLINED ALTERNATIVE, and the ground is
    // that `label` writes READER-FACING wording: escaping there would put
    // `#40;` in front of a reader to satisfy a check about syntax the reader
    // never sees. The defect is the check reading text as syntax, so the check
    // is what changes.
    const outside = line.replace(/"[^"]*"/g, '""');
    for (const [open, close] of [["[", "]"], ["(", ")"]]) {
      const o = (outside.match(new RegExp(`\\${open}`, "g")) || []).length;
      const c = (outside.match(new RegExp(`\\${close}`, "g")) || []).length;
      if (o !== c) {
        return `line ${i + 1} has ${o} ${JSON.stringify(open)} against ${c} ${JSON.stringify(close)} outside its quoted label(s) (${JSON.stringify(line)}) — an unbalanced node shape is the syntax defect this check exists to catch. Characters inside a label are not counted, so this is node syntax and not an element's wording`;
      }
    }
    // A statement is either a node declaration or an edge. Both begin with an
    // id; an edge carries one of the two connectors this renderer emits.
    if (!/^n_[A-Za-z0-9_]+(\[\[|\(\[|\[)/.test(line) && !/(-->|---)/.test(line)) {
      return `line ${i + 1} (${JSON.stringify(line)}) is neither a node declaration nor an edge — this renderer emits only those two forms, so a third is drift between the emitter and this check`;
    }
  }
  return null;
}

// THE RENDER. Returns `{ markup }` or `{ error }` — the same two-shape return
// `figureFormFor` and `renderFigureInput` already use in src/draft.mjs, so a
// caller handles one convention and not two.
//
// THE RECORD IS ASSUMED VALIDATED. `figureRecordRefusal` is what says
// a record is well-formed, and re-deciding that here would be a second
// validator that agrees with the first until one is edited. What this DOES
// refuse is the one thing that validator cannot see: a kind with no seat in
// this file.
export function renderFigure(record) {
  const kinds = figureKinds().kinds || {};
  const kind = record && record.kind;
  const spec = kinds[kind];
  if (!spec) {
    return { error: `the figure record's kind ${JSON.stringify(kind ?? null)} is not in the closed set (${Object.keys(kinds).sort().join(", ")}) — src/figure-kinds.json is what admits a kind` };
  }
  if (!SHAPES[kind] && !TABLE_KINDS.has(kind)) {
    return { error: `the kind "${kind}" is in src/figure-kinds.json and has no seat in src/render-figure.mjs — a kind admitted to the closed set owes a rendering here, and an unrendered kind is refused by name rather than emitted as an empty block` };
  }
  const roles = spec.roles;
  const elements = record.elements || {};
  const relations = Array.isArray(record.relations) ? record.relations : [];
  const emphasis = typeof record.emphasis === "string" ? record.emphasis : null;

  const block = TABLE_KINDS.has(kind)
    ? renderTable(roles, elements, relations, emphasis)
    : renderMermaid(kind, roles, elements, relations, emphasis);
  if (block.error) return block;

  // THE CAPTION IS THE LINE AFTER THE BLOCK (kogaki#879), separated by the
  // one blank line every other block boundary in the body uses. A record with
  // an empty caption cannot reach here — the figure record's own validation
  // refuses it — so no
  // "or nothing" branch is written for a state the validator forecloses.
  return { markup: `${block.markup}\n\n${cell(record.caption)}` };
}

function renderMermaid(kind, roles, elements, relations, emphasis) {
  const shape = SHAPES[kind];
  const stadium = new Set(shape.stadium);
  const lines = [HEADER];
  // NODES IN THE KIND'S DECLARED ROLE ORDER, never in the record's key order.
  // `elements` is a JSON object and its key order is whatever the record's
  // author typed, so ordering by it would make two records with identical
  // content render different bytes — the determinism acceptance 1 asserts.
  for (const role of roles) {
    const el = elements[role];
    if (!el || typeof el.text !== "string") {
      return { error: `the figure record carries no element for role "${role}" of kind ${kind} — every role of the kind must be present, so a record reaching the renderer without one was not validated` };
    }
    lines.push(`  ${nodeDecl(role, el.text, { stadium: stadium.has(role), emphasised: role === emphasis })}`);
  }
  const labels = edgeLabels(relations, shape.edges.length);
  shape.edges.forEach(([a, b], i) => {
    const l = labels[i];
    lines.push(l === null
      ? `  ${nodeId(a)} --- ${nodeId(b)}`
      : `  ${nodeId(a)} -- "${label(l)}" --- ${nodeId(b)}`);
  });
  const src = lines.join("\n");
  // THE EMITTER CHECKS ITS OWN OUTPUT, at the render rather than only in the
  // fixture pass. A malformed diagram that reached a CanonicalDraft would be
  // found by a reader looking at a broken block, which is the latest possible
  // moment and the one with no recovery.
  const bad = checkMermaid(src);
  if (bad) return { error: `the renderer produced Mermaid this runtime's own grammar check rejects: ${bad} — this is a renderer defect, fixed here and not in the record` };
  return { markup: "```" + MERMAID_FENCE + "\n" + src + "\n```" };
}

// MATRIX IS A TABLE AND NOT A DIAGRAM, per the issue's own split and the hub's
// 2026-08-01 D10: a kind whose content is "one relation held by every case" is
// read by scanning rows, and drawing it as a graph would be the quantitative-
// degrades-to-a-drawing move that ruling forecloses.
//
// The two role texts are the column headers and each relation is a row, which
// is what the kind's own `relation` line says the figure holds. The emphasised
// role's header is bolded — Markdown emphasis, which is presentation and
// carries no colour, so the no-theme rule above is untouched.
function renderTable(roles, elements, relations, emphasis) {
  const heads = [];
  for (const role of roles) {
    const el = elements[role];
    if (!el || typeof el.text !== "string") {
      return { error: `the figure record carries no element for role "${role}" of kind matrix — every role of the kind must be present, so a record reaching the renderer without one was not validated` };
    }
    heads.push(role === emphasis ? `**${cell(el.text)}**` : cell(el.text));
  }
  // A row is index, then the relation, then one empty cell per role beyond the
  // second — so a table kind admitted later with three roles renders a
  // well-formed table rather than a ragged one. `matrix` has exactly two today.
  const pad = Math.max(0, roles.length - 2);
  const rows = relations.map((r, i) => `| ${[i + 1, cell(r), ...Array(pad).fill("")].join(" | ")} |`);
  return {
    markup: [
      `| ${heads.join(" | ")} |`,
      `| ${roles.map(() => "---").join(" | ")} |`,
      ...rows,
    ].join("\n"),
  };
}
