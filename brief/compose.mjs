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
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

function fail(msg) {
  process.stderr.write(`compose: ${msg}\n`);
  process.exit(1);
}

// ---- per-block Brief snapshots (kogaki#523) ----
// Machine-local debugging trace with the run's lifetime, NEVER owner state:
// each command that lands a block in the Brief snapshots the FULL document
// into the run workspace (~/.kogaki/brief-runs/<slug>/snapshots/) before and
// after its landing write, so a later sitting can inspect what a block
// changed and trace a defect backward. FULL snapshots rather than per-block
// diffs: a diff is derivable from two adjacent snapshots, while
// reconstructing a document from diffs needs a base that would itself be a
// snapshot. The helper lives HERE because this module is the shared import
// of both surviving write sites (brief.mjs mint, assemble.mjs
// adopt-candidate — the `fill` CLI was retired at §5.3 v17 and its composer
// `fillBrief` writes nothing itself).
//
// A snapshot failure WARNS AND CONTINUES — the trace never gates the write
// it traces. Returns the sequence number used, so a `before` call's seq can
// be handed to its paired `after`; on failure it returns the seq it was
// given (null when none), still harmlessly.
export function snapshotBrief(briefPath, stage, phase, content, seq = null) {
  try {
    const slug = basename(dirname(resolve(briefPath)));
    const dir = join(homedir(), ".kogaki", "brief-runs", slug, "snapshots");
    mkdirSync(dir, { recursive: true });
    if (seq === null) {
      let max = 0;
      for (const f of readdirSync(dir)) {
        const m = /^([0-9]{3})-/.exec(f);
        if (m) max = Math.max(max, Number(m[1]));
      }
      seq = max + 1;
    }
    writeFileSync(join(dir, `${String(seq).padStart(3, "0")}-${stage}-${phase}.md`), content);
    return seq;
  } catch (e) {
    process.stderr.write(`compose: Brief snapshot ${stage}/${phase} skipped `
      + `(${e && e.message ? e.message : e}) — the trace never blocks the write it traces (kogaki#523)\n`);
    return seq;
  }
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
    // §4.1 v18 (kogaki#642) — `Step = Input + State`, and the Move IS the
    // State, so a Move-less Step is not a Step. This is the seat the spec
    // names as the carrier: the requirement binds at composition, which is
    // what makes such a Step unwritable rather than discouraged. §7.5's
    // no-mandatory-Moves rider is superseded there by name.
    if (typeof s.move !== "string" || s.move === "") {
      return { error: `${at}: move is required by §4.1 — a Step binds a Move library entry by id (§7), because the Move is the State component of a Step and a Step without one has no defined reader-state transition type` };
    }
    for (const d of s.depends_on) {
      if (!seen.has(d)) return { error: `${at}: depends_on names "${d}", which is not an EARLIER step — §4.1's depends_on is the earlier steps whose conclusions this step stands on` };
    }
    // §4.11's `bridges` — optional, and when present it names the ADJACENT
    // PAIR this Step was inserted between. Validated here because the
    // selection gate's disclosure is computed from it: an unvalidated marking
    // renders `between :` or `between true:` at an owner surface.
    if (s.bridges !== undefined) {
      if (!Array.isArray(s.bridges) || s.bridges.length !== 2 || s.bridges.some((b) => typeof b !== "string" || b === "")) {
        return { error: `${at}: bridges, when present, names the two adjacent steps this Step was inserted between (§4.11) — an array of exactly two step ids` };
      }
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
  if (s.bridges) L.push(`bridges: ${s.bridges.join(", ")}`);
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

// The JOURNEY-BEARING members of the closed set, read from the Brief's own
// Strands section: the mint renders a `- journey cite:` line under exactly
// those Strands whose served record carried Journey material (brief.mjs).
// Read from the document for the same reason selectedStrands is — the Brief
// is the closed set's carrier, and a second source would be a Brief fetch.
export function journeyBearingStrands(doc) {
  const out = [];
  const secs = [...doc.matchAll(/^### (L[0-9]+) — [^\n]*\n([\s\S]*?)(?=^### |^## )/gm)];
  for (const m of secs) {
    if (/^- journey cite:/m.test(m[2])) out.push(m[1]);
  }
  return out;
}

// Journey placement, the §6.1 MUST 1 half of the completeness rider: a
// Journey is a DISTINCT material (§4.1 — "which Strands, which Journeys"),
// carried in a step's materials as `<L-id>.journey`. Derived from the
// composed steps for the same reason placements() is, and the reason is
// load-bearing here rather than inherited: a Strand can be placed while the
// journey material it carries is dropped, so a per-Strand count cannot see
// this omission at all and a declared cover would hide it by construction.
export function journeyPlacements(steps, journeyIds) {
  const used = new Map(journeyIds.map((id) => [id, []]));
  for (const s of steps) {
    for (const m of s.materials) {
      const j = /^(L[0-9]+)\.journey$/.exec(m);
      if (j && used.has(j[1])) used.get(j[1]).push(s.step_id);
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
  // A REPLACER FUNCTION, NEVER A REPLACEMENT STRING (kogaki#539). `String
  // .prototype.replace` reads `$&`, `` $` ``, `$'` and `$<name>` in its second
  // argument as SUBSTITUTION PATTERNS, so a composed body containing any of
  // them was expanded instead of written: `costs $& twice` reached the Brief as
  // `costs ## Reader start`. A function form takes no patterns at all.
  //
  // NOT AN ESCAPE OF `$` IN THE BODY, deliberately. Escaping is a denial list
  // over a syntax that can grow — `$<name>` was added to the language after the
  // others — and it leaves the next pattern unhandled. The function removes the
  // possibility rather than enumerating what to catch.
  //
  // `$1` survived the old form only because this regex has no capture groups,
  // which is a property of the pattern rather than a guarantee, and is exactly
  // the kind of incidental safety that stops holding when the pattern changes.
  return { doc: doc.replace(re, () => `## ${heading}\n\n${body}`) };
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
  const journeyIds = journeyBearingStrands(doc);
  for (const s of steps) {
    for (const m of s.materials) {
      if (/^L[0-9]+$/.test(m) && !strandIds.includes(m)) {
        return { error: `step ${s.step_id}: material ${m} is outside the Brief's closed Strand set `
          + `(${strandIds.join(", ")}) — growing the set routes back through Terrain, never a Brief fetch (§5.3)` };
      }
      // A Journey material (§4.1) is checkable twice: against the closed set,
      // and against that Strand ACTUALLY carrying Journey material. The second
      // check is what stops a composer inventing journey material for a Strand
      // whose served record has none — unsupported completion (§4.4), in the
      // one place the bare-L<n> check cannot see.
      const j = /^(L[0-9]+)\.journey$/.exec(m);
      if (j) {
        if (!strandIds.includes(j[1])) {
          return { error: `step ${s.step_id}: material ${m} names a Strand outside the Brief's closed set `
            + `(${strandIds.join(", ")}) — never a Brief fetch (§5.3)` };
        }
        if (!journeyIds.includes(j[1])) {
          return { error: `step ${s.step_id}: material ${m} claims Journey material for ${j[1]}, whose served `
            + `record carries none (the Brief renders no journey cite for it) — a Journey the material does not `
            + `have is unsupported completion (§4.4), never a composition choice` };
        }
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
  // The owner-facing heading is the ratified name (kogaki#574); the §5.1 record
  // field this fills is still `sequence`, and only the rendering moved.
  let r = replaceSlot(out, "Reader Path", seq);
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
  // §6.1 MUST 1 — journey material is PLACED OR ITS OMISSION IS DISCLOSED,
  // per Journey-bearing member. Vacuous rather than violated where the
  // selected set carries no Journey material (§6.1's contingency), and the
  // empty case renders its own line rather than being omitted.
  covL.push("");
  if (journeyIds.length === 0) {
    covL.push("*Journey coverage: no selected Strand carries Journey material — §6.1's MUSTs are vacuous here, not unmet.*");
  } else {
    const jplace = journeyPlacements(steps, journeyIds);
    const jplaced = journeyIds.filter((id) => jplace.get(id).length > 0);
    covL.push("*Journey coverage (§6.1 MUST 1 — placed, or the omission disclosed):*");
    for (const id of journeyIds) {
      const uses = jplace.get(id);
      if (uses.length > 0) {
        covL.push(`- **${id}** journey — placed by: ${uses.join(", ")}`);
      } else {
        covL.push(`- **${id}** journey — **OMITTED, disclosed**: ${unused[`${id}.journey`] ?? "the Journey material is left unplaced (§4.4's third move — omit the Step, revise the path, or leave the material unused; never invention)"}`);
      }
    }
    covL.push(`*Journey placement count, taken AFTER composition: ${jplaced.length} of ${journeyIds.length} Journey-bearing Strand(s) placed.*`);
  }
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

// `cmdFill` IS GONE with its route (kogaki#551, PR #557 round 1). The first
// cut left the function defined and uncalled — a retired route whose body
// survives reads as a route that could be switched back on, which is the
// demotion-not-a-retirement shape this change exists to end. `fillBrief`,
// the composer it called, is exported and untouched.


const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  switch (args._cmd) {
    // `fill` IS RETIRED (§5.3 v17, kogaki#551). It wrote a Brief's sequence
    // from one composed path, bypassing assembly and §6's Candidate-selection
    // gate — so its output was a path nobody chose and nobody could decline,
    // and §6's premise-negation option ("none of these — the Thesis or the
    // settled set is what should change") was unreachable on that route.
    //
    // It is REMOVED rather than left demoted, because a demotion is not a
    // retirement: "the constrain half landed and the retire half never ran …
    // the growth curve does not stop when the diagnosis is corrected; it stops
    // when something removes members"
    // (product-lab@8906f20 topics/knowledge-architecture.md:174).
    //
    // `fillBrief` — the composer this subcommand called — is UNTOUCHED and
    // still exported: it is how `adopt-candidate` and the checks fill a
    // sequence. What is retired is the ungated CLI entry point, never the
    // composition itself.
    case "fill":
      fail("`fill` no longer exists — a Brief's sequence is filled by adopting "
        + "a Candidate at the selection gate (SPEC-draft-pipeline §6; retired "
        + "at §5.3 v17, kogaki#551). Run `assemble.mjs assemble` to build the "
        + "selection payload, raise the gate, then `assemble.mjs "
        + "adopt-candidate --brief <path> --reviewed <json> --candidate <id>`.");
      break;
    default: fail("usage: compose.mjs — no subcommand; `fillBrief` is exported for the composition path, and the retired `fill` subcommand is replaced by assemble.mjs adopt-candidate (§6, kogaki#551)");
  }
}
