#!/usr/bin/env node
// compose — the Step-record runtime over the Brief's settled materials
// (SPEC-draft-pipeline §§4.1, 4.4, 5.1-5.2; kogaki#489, story 1.73).
//
// Machine-side blocks 1-2 of §4.3's five: path composition → Move binding.
// THIS RUNTIME RECORDS; IT NEVER JUDGES AND NEVER COMPOSES. The composing
// producer is the sitting that authors the Step records toward the adopted
// Thesis; this runtime validates their SHAPE (§4.1's fields — a schema
// question), fills the Brief's typed unfilled slots (§5.1 sequence,
// strand_coverage; §5.2 ledger), and takes the Strand placement count AFTER
// composition, in placements, disclosing an unplaced selected Strand rather
// than dropping it (§3's completeness rider; §5.2). Every MUST of the
// composition design is JUDGMENT-CLASS and is judged at path review (§4.6,
// story 1.74) — nothing here is a lint over a judgment: a missing field is
// refused, a weak rationale is not.
//
// THE GROUNDS ARE RECORDED FOR REVIEW, NOT VERDICT-ED (story 1.73 SQ2): a
// Step carries typed grounds (§4.4: a Strand proposition / a named earlier
// Step's effect / a declared reader assumption) and, where a proposition is
// not explicit in the material, the `entailed` flag WITH its entailment
// reasoning — recorded here so path review and the human gate can judge
// them. No grounds-test verdict is produced anywhere in this file.
//
// MOVE BINDING CHANGES THE TYPE OF NOTHING (§4): `move` is optional on
// every Step — a step need not bind a Move at all — and the binding is a
// recorded field, never a generator: this runtime reads the rationale
// before it reads the move name only in the trivial sense that it validates
// rationale presence; the order invariant itself is invisible in the
// artifact and is carried by the §4.5 grounds test, judged at review.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function fail(msg) {
  process.stderr.write(`compose: ${msg}\n`);
  process.exit(1);
}

const GROUND_TYPES = new Set(["strand", "step_effect", "reader_assumption"]);
const SLOT = "*(awaiting composition)*";

// ---- shape validation (§4.1 — the fields, not the markup) ----
// Returns { error } or { steps }. Pure; exported for the check.
export function validateSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return { error: "a composed path is a non-empty array of Step records (§4.1)" };
  }
  const seen = new Set();
  for (const [i, s] of steps.entries()) {
    const at = `step ${i + 1}${s && s.step_id ? ` (${s.step_id})` : ""}`;
    const need = (field, ok) => ok ? null
      : `${at}: ${field} is required by §4.1 — a Step record without it is not a Step record`;
    const errs = [
      need("step_id", typeof s.step_id === "string" && s.step_id !== ""),
      need("materials (non-empty array)", Array.isArray(s.materials) && s.materials.length > 0),
      need("purpose", typeof s.purpose === "string" && s.purpose !== ""),
      need("reader_state_before", typeof s.reader_state_before === "string" && s.reader_state_before !== ""),
      need("reader_state_after", typeof s.reader_state_after === "string" && s.reader_state_after !== ""),
      need("depends_on (array)", Array.isArray(s.depends_on)),
      need("rationale", typeof s.rationale === "string" && s.rationale !== ""),
    ].filter(Boolean);
    if (errs.length) return { error: errs[0] };
    if (seen.has(s.step_id)) return { error: `${at}: duplicate step_id` };
    if (s.move !== undefined && (typeof s.move !== "string" || s.move === "")) {
      return { error: `${at}: move, when present, is a binding to a Move library entry by id — or absent (a step need not bind a Move, §4.1/§7.5)` };
    }
    for (const d of s.depends_on) {
      if (!seen.has(d)) return { error: `${at}: depends_on names "${d}", which is not an EARLIER step — §4.1's depends_on is the earlier steps whose conclusions this step stands on` };
    }
    if (!Array.isArray(s.grounds) || s.grounds.length === 0) {
      return { error: `${at}: grounds are required — specific propositions, each a Strand proposition, a named earlier Step's effect, or a declared reader assumption (§4.4)` };
    }
    for (const g of s.grounds) {
      if (!GROUND_TYPES.has(g.type)) {
        return { error: `${at}: ground type ${JSON.stringify(g.type)} — §4.4's list is closed: strand | step_effect | reader_assumption` };
      }
      if (typeof g.proposition !== "string" || g.proposition === "") {
        return { error: `${at}: a ground is a specific PROPOSITION, stated (§4.4) — an untyped pointer is not a ground` };
      }
      if (g.type === "step_effect" && (typeof g.step !== "string" || !seen.has(g.step))) {
        return { error: `${at}: a step_effect ground names WHICH effect of WHICH earlier step (§4.4) — "${g.step ?? ""}" is not an earlier step_id` };
      }
      if (g.type === "strand" && (typeof g.strand !== "string" || g.strand === "")) {
        return { error: `${at}: a strand ground names its Strand (L<n>)` };
      }
    }
    // A proposition not explicit in the material is flagged `entailed` WITH
    // its reasoning, exposed at the human gate (§4.4). The flag is the
    // composer's judgment; the runtime refuses only a flag with no reasoning
    // to expose — an entailed step whose reasoning is absent has nothing for
    // the gate to judge.
    if (s.entailed === true && (typeof s.entailment_reasoning !== "string" || s.entailment_reasoning === "")) {
      return { error: `${at}: flagged entailed with no entailment_reasoning — entailment is interpretation, judged rather than silently trusted (§4.4)` };
    }
    seen.add(s.step_id);
  }
  return { steps };
}

// ---- rendering (SQ1: fenced blocks; §4.1 fixes the fields, not the markup;
// this function IS the recorded serialization, exercised by the check's
// fixture) ----
export function renderStep(s) {
  const L = [];
  L.push("```step");
  L.push(`step_id: ${s.step_id}`);
  if (s.move) L.push(`move: ${s.move}`);
  L.push(`materials: ${s.materials.join(", ")}`);
  L.push(`purpose: ${s.purpose}`);
  L.push(`reader_state_before: ${s.reader_state_before}`);
  L.push(`reader_state_after: ${s.reader_state_after}`);
  L.push(`depends_on: ${s.depends_on.join(", ") || "(none)"}`);
  L.push(`rationale: ${s.rationale}`);
  for (const g of s.grounds) {
    L.push(`ground (${g.type}${g.strand ? ` ${g.strand}` : ""}${g.step ? ` ${g.step}` : ""}): ${g.proposition}`);
  }
  if (s.entailed === true) {
    L.push(`entailed: true`);
    L.push(`entailment_reasoning: ${s.entailment_reasoning}`);
  }
  L.push("```");
  return L.join("\n");
}

// The selected Strands are read from the Brief's own Strands section —
// the closed set the mint wrote (§5.3's closed-set invariant: composition
// may use exactly this set).
export function selectedStrands(doc) {
  return [...doc.matchAll(/^### (L[0-9]+) — /gm)].map((m) => m[1]);
}

// The placement count, taken AFTER composition and COUNTED IN PLACEMENTS
// (§5.2; §3's completeness rider): a placement is a step whose materials
// carry the Strand. Derived from the composed steps themselves, never from
// a declaration — a composer that cannot omit in principle can still omit
// in fact, and a declared cover would hide exactly that.
export function placements(steps, strandIds) {
  const used = new Map(strandIds.map((id) => [id, []]));
  for (const s of steps) {
    for (const m of s.materials) {
      if (used.has(m)) used.get(m).push(s.step_id);
    }
  }
  return used;
}

// Exported for the adoption writer (story 1.75): thesis_closure and
// tradeoffs fill through the same one slot-replacer, so a filled field
// refuses overwrite everywhere for the same reason.
export function replaceSlot(doc, heading, body) {
  const re = new RegExp(`## ${heading}\\n\\n\\*\\(awaiting composition\\)\\*`);
  if (!re.test(doc)) {
    return { error: `the Brief's "${heading}" section is not a typed unfilled slot — `
      + `either it was already filled (composition resumes by judgment, not by overwrite) `
      + `or this is not a minted Brief (§5.3)` };
  }
  return { doc: doc.replace(re, `## ${heading}\n\n${body}`) };
}

// ---- the fill: sequence, strand_coverage, obligations ledger ----
// Pure over strings; exported for the check.
export function fillBrief(doc, { steps, coverage = {}, obligations = [], unused = {} }) {
  const v = validateSteps(steps);
  if (v.error) return { error: v.error };
  const strandIds = selectedStrands(doc);
  if (strandIds.length === 0) return { error: "the Brief carries no Strands section — not a minted Brief" };
  // materials may reference only the closed set's Strands (plus the Thesis,
  // reader assumptions, earlier steps' conclusions, constructed material —
  // §4.1's many-to-many list; only L<n> tokens are checkable against the
  // closed set, and a foreign L<n> is a Brief fetch by the §5.3 invariant).
  for (const s of steps) {
    for (const m of s.materials) {
      if (/^L[0-9]+$/.test(m) && !strandIds.includes(m)) {
        return { error: `step ${s.step_id}: material ${m} is outside the Brief's closed Strand set `
          + `(${strandIds.join(", ")}) — growing the set routes back through Terrain, never a Brief fetch (§5.3)` };
      }
    }
    for (const g of s.grounds) {
      if (g.type === "strand" && !strandIds.includes(g.strand)) {
        return { error: `step ${s.step_id}: strand ground ${g.strand} is outside the closed set (${strandIds.join(", ")})` };
      }
    }
  }

  let out = doc;
  const seq = steps.map(renderStep).join("\n\n");
  let r = replaceSlot(out, "Sequence", seq);
  if (r.error) return r;
  out = r.doc;

  // Strand coverage: used_by_steps DERIVED from the composed steps; an
  // unplaced selected Strand DISCLOSES rather than silently drops (§5.2).
  const place = placements(steps, strandIds);
  const placed = strandIds.filter((id) => place.get(id).length > 0);
  const covL = [];
  for (const id of strandIds) {
    const uses = place.get(id);
    if (uses.length > 0) {
      covL.push(`- **${id}** — used_by_steps: ${uses.join(", ")}; role_in_thesis: ${coverage[id]?.role_in_thesis ?? "(not stated by the composer)"}`);
    } else {
      covL.push(`- **${id}** — **UNPLACED, disclosed**: ${unused[id] ?? "left unused (§4.4's third move — omit the Step, revise the path, or leave the Strand unused; never invention)"}`);
    }
  }
  covL.push("");
  covL.push(`*Strand placement count, taken AFTER composition, counted in placements: ${placed.length} of ${strandIds.length} selected Strand(s) placed.*`);
  r = replaceSlot(out, "Strand coverage", covL.join("\n"));
  if (r.error) return r;
  out = r.doc;

  // The §5.2 obligations ledger: authored judgments, each entry carrying
  // introduced_by / discharged_by; an undischarged obligation RENDERS AS
  // UNDISCHARGED — a disclosure, never a refusal.
  const stepIds = new Set(steps.map((s) => s.step_id));
  const oblL = [];
  for (const [i, o] of obligations.entries()) {
    if (typeof o.text !== "string" || o.text === "" || typeof o.introduced_by !== "string") {
      return { error: `obligation ${i + 1}: each ledger entry carries its text and introduced_by (§5.2)` };
    }
    if (!stepIds.has(o.introduced_by)) {
      return { error: `obligation ${i + 1}: introduced_by "${o.introduced_by}" is not a step in this sequence` };
    }
    if (o.discharged_by !== undefined && !stepIds.has(o.discharged_by)) {
      return { error: `obligation ${i + 1}: discharged_by "${o.discharged_by}" is not a step in this sequence` };
    }
    oblL.push(o.discharged_by
      ? `- ${o.text} — introduced_by: ${o.introduced_by}; discharged_by: ${o.discharged_by}`
      : `- ${o.text} — introduced_by: ${o.introduced_by}; **UNDISCHARGED** (a disclosure, never a refusal — §5.2)`);
  }
  if (oblL.length === 0) oblL.push("*(no obligations entered by the composer — an empty ledger is a statement, not an omission)*");
  r = replaceSlot(out, "Unresolved obligations", oblL.join("\n"));
  if (r.error) return r;
  return { doc: r.doc, placed: placed.length, total: strandIds.length };
}

function argString(args, key, usage) {
  const v = args[key];
  if (typeof v !== "string" || v === "") fail(usage);
  return v;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else { args[key] = next; i++; }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

function cmdFill(args) {
  const briefPath = argString(args, "brief", "fill needs --brief <briefs/<slug>/brief.md>");
  const pathFile = argString(args, "path", "fill needs --path <composed-path.json> — the Step records the composition sitting authored (§4.1)");
  const doc = readFileSync(briefPath, "utf8");
  const input = JSON.parse(readFileSync(pathFile, "utf8"));
  const r = fillBrief(doc, input);
  if (r.error) fail(r.error);
  writeFileSync(briefPath, r.doc);
  console.log(`Brief filled — READ THIS ONE (owner document): ${briefPath}`);
  console.log(`Sequence: ${input.steps.length} step(s); Strand placement: ${r.placed} of ${r.total} placed (counted in placements, after composition${r.placed < r.total ? "; the unplaced are DISCLOSED in Strand coverage" : ""}).`);
}

const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  switch (args._cmd) {
    case "fill": cmdFill(args); break;
    default: fail("usage: compose.mjs fill --brief <briefs/<slug>/brief.md> --path <composed-path.json>");
  }
}
