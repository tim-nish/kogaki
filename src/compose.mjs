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
// MOVE BINDING CHANGES THE TYPE OF NOTHING (§4): `move` is REQUIRED on every
// Step (§4.1 v18, kogaki#642 — the Move is a Step's State component, and this
// file is the carrier the spec names for it), and the binding is still a
// recorded field, never a generator: this runtime reads the rationale
// before it reads the move name only in the trivial sense that it validates
// rationale presence; the order invariant itself is invisible in the
// artifact and is carried by the §4.5 grounds test, judged at review.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { laneDir } from "./runs.mjs";

function fail(msg) {
  process.stderr.write(`compose: ${msg}\n`);
  process.exit(1);
}

// ---- per-block Brief snapshots (kogaki#523) ----
// Machine-local debugging trace with the run's lifetime, NEVER owner state:
// each command that lands a block in the Brief snapshots the FULL document
// into the run workspace (runs/brief/<slug>/snapshots/, kogaki#750) before and
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
    const dir = join(laneDir("brief"), slug, "snapshots");
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
    // §4.13's `introduces` (kogaki#751) — OPTIONAL, and validated here for
    // the same reason `bridges` is: the accumulation the Packet derives from
    // it is rendered at an owner-facing surface, so an unvalidated entry
    // renders as a blank term or as `undefined` in a reader-knowledge ledger.
    // SHAPE ONLY. Whether a term is genuinely introduced HERE, whether the
    // anchor explains it, and whether the Step's grounds already carry it are
    // judgments — §4.6 clause 3 stands and nothing below reads meaning.
    if (s.introduces !== undefined) {
      const bad = introducesRefusal(s.introduces, at);
      if (bad) return { error: bad };
    }
    // §4.15's `opens_section` (kogaki#822) — shape only here; the four grouping
    // rules are a property of the whole path and run after this loop.
    if (s.opens_section !== undefined) {
      const bad = opensSectionRefusal(s.opens_section, at);
      if (bad) return { error: bad };
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
  // §4.15's grouping rules (kogaki#822) run over the WHOLE path, after every
  // Step is known to be well formed — each rule is a statement about a Step's
  // relation to its neighbours, so none of them is decidable inside the loop.
  const grouping = sectionGroupingRefusal(steps);
  if (grouping) return { error: grouping };
  return { steps };
}

// ---- rendering (SQ1: fenced blocks; §4.1 fixes the fields, not the markup;
// this function IS the recorded serialization, exercised by the check's
// fixture) ----
// ---------------------------------------------------------------------------
// THE STEP↔MOVE INSTANTIATION CONTRACT (§4.12, kogaki#747; owner rulings
// 2026-09-01). A Step INSTANTIATES a Move: `move` names a record in the Move
// library, and the Step's reader_state_before/after are the instance forms of
// that Move's `requires`/`effect`, specialized to this reader and these
// Strands. The relationship has two halves and they are carried by DIFFERENT
// machinery on purpose:
//
//   MECHANICAL — does the id resolve? A set membership test over the store.
//                Refused here.
//   JUDGED     — are the instantiated states consistent specializations of
//                the Move's contract? An LLM judgment, recorded in a typed
//                record this file VALIDATES AND NEVER COMPOSES.
//
// Why the second is not a lint, restated because the temptation is real:
// §4.6 clause 3 holds that no MUST of the composition design becomes a lint
// "even where deterministic processing is possible", and §7.5's rider keeps
// requires/effect matching judgment-class. Nothing below renders a verdict on
// a specialization; the mechanism owns the record's SHAPE and the refusal.

// The Move library, read as a SET OF IDS and nothing more. Reading only the
// ids is deliberate: resolving the id is this half's whole job, and a reader
// that parsed `requires`/`effect` would be one edit away from comparing them,
// which is the lint §4.6 forbids.
export function loadMoveIds(movesDir = "moves") {
  let names;
  try { names = readdirSync(movesDir); }
  catch (e) {
    // A STORE THAT CANNOT BE READ IS NOT AN EMPTY STORE. Returning an empty
    // set here would turn an unreadable directory into "every move id is
    // dangling", and a caller would render a refusal naming the Steps rather
    // than the missing store — a true refusal for a false reason.
    return { error: `the Move library at ${movesDir} cannot be read (${e.message}) — `
      + `a Step binds a Move by id (§4.1 v18) and the ids resolve against this store (§4.12); `
      + `pass --moves-dir if the library is not at the default path` };
  }
  const ids = new Set();
  for (const n of names) {
    if (!n.endsWith(".md")) continue;
    const id = n.slice(0, -3);
    if (id === "INDEX") continue; // the regenerated view, never a record (§6.9.1a)
    ids.add(id);
  }
  if (ids.size === 0) {
    return { error: `the Move library at ${movesDir} holds no Move records — `
      + `every Step's move id would dangle, which is a store problem and not a composition one (§4.12)` };
  }
  return { ids };
}

// THE MECHANICAL HALF. Refuse the FIRST Step whose move id resolves to no
// record, naming the Step and the id — the refusal shape ruling 1 names.
// `steps` here are Step RECORDS (composition side) or the parsed step blocks
// of an existing Brief (draft side); both carry `step_id` and `move`, which
// is the whole of what this reads, so one function serves both occasions
// rather than two that can disagree about what dangling means.
export function resolveMoveIds(steps, movesDir = "moves") {
  const store = loadMoveIds(movesDir);
  if (store.error) return store;
  for (const s of steps) {
    const id = s.move;
    if (typeof id !== "string" || id === "") {
      // Shape, not resolution — validateSteps owns this on the composition
      // side. Reached on the draft side, where the input is a parsed document.
      return { error: `step ${s.step_id}: no move is bound — a Step binds a Move library entry by id (§4.1 v18), `
        + `because the Move is the State component of a Step` };
    }
    if (!store.ids.has(id)) {
      return { error: `step ${s.step_id}: move "${id}" resolves to no record in the Move library `
        + `(${movesDir}/${id}.md does not exist) — a Step INSTANTIATES a Move, so a Move that is not there `
        + `leaves the Step with no reader-state transition type to be the instance of (§4.12). `
        + `Bind an admitted Move, or admit this one to the library first — the library grows by an `
        + `admission act, never by a Brief naming an id (§7)` };
    }
  }
  return { ok: true, checked: steps.length, store_size: store.ids.size };
}

// THE JUDGED HALF's carrier contract, read from the schema rather than
// restated here — the same single-carrier arrangement record-schema.json and
// gate-schema.json use, so the vocabulary is amended in one place.
let SPECIALIZATION_SCHEMA = null;
export function specializationSchema() {
  if (SPECIALIZATION_SCHEMA) return SPECIALIZATION_SCHEMA;
  const p = join(dirname(fileURLToPath(import.meta.url)), "specialization-schema.json");
  SPECIALIZATION_SCHEMA = JSON.parse(readFileSync(p, "utf8"));
  return SPECIALIZATION_SCHEMA;
}

// The gate carrier's two artifacts, read rather than restated — the same
// single-carrier arrangement `specializationSchema` above uses. §4.12.3's gate
// is declared in the registry like every other gate this repository raises,
// and the capture's filename suffix is a JOIN KEY the check resolves by, so a
// second copy of either would let a rename pass silently.
let GATE_SCHEMA = null;
export function gateSchema() {
  if (GATE_SCHEMA) return GATE_SCHEMA;
  const p = join(dirname(fileURLToPath(import.meta.url)), "gate-schema.json");
  GATE_SCHEMA = JSON.parse(readFileSync(p, "utf8"));
  return GATE_SCHEMA;
}
let GATE_REGISTRY = null;
export function gateRegistry() {
  if (GATE_REGISTRY) return GATE_REGISTRY;
  const p = join(dirname(fileURLToPath(import.meta.url)), "gate-registry.json");
  GATE_REGISTRY = JSON.parse(readFileSync(p, "utf8"));
  return GATE_REGISTRY;
}

// VALIDATE, NEVER COMPOSE. Every branch below is a refusal or a pass; none
// writes a verdict, fills a default, or infers one from a Step's fields. A
// record that is absent is refused by the CALLER (the occasion is mandatory,
// §4.12), because "no record" is a fact about the act rather than about the
// record's shape.
export function validateSpecialization(record, steps, candidateId) {
  const sch = specializationSchema();
  const at = "the specialization record";
  for (const k of sch.record.required) {
    if (record?.[k] === undefined) {
      return { error: `${at}: ${k} is required (§4.12) — the record is the judgment's carrier, and a carrier missing a required field records nothing` };
    }
  }
  if (String(record.version) !== sch.record.version_must_be) {
    return { error: `${at}: version ${JSON.stringify(record.version)} — this runtime reads version ${sch.record.version_must_be} (src/specialization-schema.json)` };
  }
  if (record.candidate_id !== candidateId) {
    return { error: `${at}: judges candidate ${JSON.stringify(record.candidate_id)} but ${JSON.stringify(candidateId)} is being adopted — `
      + `a record composed against one Candidate cannot certify another (§4.12). Judge the Candidate you are adopting.` };
  }
  if (!Array.isArray(record.verdicts)) {
    return { error: `${at}: verdicts is an array, one entry per Step of the adopted path (§4.12)` };
  }
  const vocab = new Set(sch.vocabulary.values);
  const passing = new Set(sch.vocabulary.passing);
  const byStep = new Map();
  for (const v of record.verdicts) {
    for (const k of sch.verdict.required) {
      if (typeof v?.[k] !== "string" || v[k] === "") {
        return { error: `${at}: a verdict is missing ${k} — §4.12's verdict names the Step, the Move it instantiates, the verdict, and one sentence of why` };
      }
    }
    if (byStep.has(v.step_id)) {
      return { error: `${at}: two verdicts for step ${v.step_id} — one per Step, exactly (§4.12)` };
    }
    byStep.set(v.step_id, v);
  }
  // A verdict for a Step outside the adopted path means the record was
  // composed against a different path than the one being adopted.
  for (const v of record.verdicts) {
    if (!steps.some((s) => s.step_id === v.step_id)) {
      return { error: `${at}: verdict for step ${v.step_id}, which is not in the adopted path `
        + `(${steps.map((s) => s.step_id).join(", ")}) — the record judges the path being adopted and no other (§4.12)` };
    }
  }
  // ONE PER STEP, EXACTLY — the other direction, and it is the FIRST branch of
  // the loop below rather than a pass of its own. That siting is deliberate:
  // as a separate preceding loop it was a completeness check that the per-Step
  // loop then silently DEPENDED on, so removing it did not make this function
  // refuse — it made it throw on `v.move` several lines later. One guard, in
  // the loop that needs the value, keeps the function total: every path out of
  // it is a refusal or a pass, and there is no ordering between two guards for
  // a later edit to break.
  for (const s of steps) {
    const v = byStep.get(s.step_id);
    if (v === undefined) {
      return { error: `${at}: step ${s.step_id} carries no verdict — the specialization judgment is per Step and cannot be skipped for one (§4.12)` };
    }
    if (v.move !== s.move) {
      return { error: `${at}: step ${s.step_id}'s verdict judges move "${v.move}" but the Step binds "${s.move}" — `
        + `the judgment is about THIS Step instantiating THIS Move, so a record naming another one certifies nothing (§4.12)` };
    }
    if (!vocab.has(v.verdict)) {
      return { error: `${at}: step ${s.step_id}: verdict ${JSON.stringify(v.verdict)} — §4.12's vocabulary is closed: `
        + `${sch.vocabulary.values.join(" | ")}` };
    }
    if (v.why.trim().split(/\s+/).length < sch.verdict.why_min_words) {
      return { error: `${at}: step ${s.step_id}: why is ${v.why.trim().split(/\s+/).length} word(s) — `
        + `the record carries one sentence of why, which is what a reader of a refusal is handed (§4.12)` };
    }
  }
  // THE REFUSAL, deterministic and in the path's own order: the FIRST Step
  // that does not pass, named, with its own sentence quoted back rather than
  // paraphrased.
  for (const s of steps) {
    const v = byStep.get(s.step_id);
    if (!passing.has(v.verdict)) {
      const why = v.verdict === "cannot-determine"
        ? `the judgment could not be reached against that Move's contract`
        : `the instantiated reader states contradict that Move's requires/effect`;
      return { error: `step ${s.step_id}: ${v.verdict} — ${why}. The judging sitting wrote: `
        + `"${v.why.trim()}" — a Step whose instantiation does not hold is not adopted into a Brief (§4.12). `
        + `Nothing was written.` };
    }
  }
  return { ok: true, judged: steps.length };
}

// ---------------------------------------------------------------------------
// THE OWNER RATIFICATION GATE (§4.12.3, kogaki#893; owner selection
// 2026-09-05).
//
// Everything above is the record's SHAPE and the refusal, and none of it
// reaches the thing that actually unlocks the write: a record whose every
// verdict reads `consistent`. That verdict is the composing sitting's own,
// and a shape-valid record of judgment-free `consistent` verdicts adopted a
// Candidate with no refusal — the right act with the guard silently
// disabled.
//
// WHAT THIS IS NOT. It renders no verdict on a specialization, reads no
// Move's `requires`/`effect`, and compares nothing to anything. §4.6 clause 3
// and §7.5 are untouched: the record is carried to the owner AS GATE EVIDENCE,
// which is exactly what §7.5 already says happens to requires/effect matching,
// and the owner approves a result, which is where §4.6 clause 2 already sites
// the human gate. The declined arm — a string-match anchor over the Move
// contract — is the one that owed those sections an amendment.

// THE DIGEST the capture binds to. Over the verdicts AS JUDGED, in the adopted
// path's order rather than the record's, so a record whose verdicts are merely
// reordered digests identically and a record whose judgment changed does not.
// Any edit to any verdict — including the `why`, which is the sentence the
// owner ratified — invalidates every capture taken against it.
export function specializationDigest(record, steps) {
  const byStep = new Map((record.verdicts || []).map((v) => [v.step_id, v]));
  const rows = steps.map((s) => {
    const v = byStep.get(s.step_id) || {};
    return [v.step_id, v.move, v.verdict, typeof v.why === "string" ? v.why.trim() : v.why];
  });
  const canonical = JSON.stringify([String(record.version), record.candidate_id, rows]);
  return createHash(specializationSchema().ratification.digest.algorithm).update(canonical).digest("hex");
}

// THE VALIDATION. A capture is a `*.gate-capture.json` document in the shape
// SPEC-gate-carrier binds (`rows`, each with `stop_id`, `gate_id`, `evidence`
// and `payload`); this reads the one row for THIS gate and refuses on every
// axis that could let a capture certify something it did not judge.
//
// ABSENCE IS REFUSED BY THE CALLER, for the same reason the record's absence
// is: "no ratification" is a fact about an act that did not happen, not about
// a capture's shape.
export function validateRatification(capture, candidateId, digest) {
  const sch = specializationSchema().ratification;
  const at = "the ratification capture";
  const rows = capture?.rows;
  if (!Array.isArray(rows)) {
    return { error: `${at}: rows is an array of captured gate answers (SPEC-gate-carrier §4) — this document carries none, so it records no owner act` };
  }
  const mine = rows.filter((r) => r?.gate_id === sch.gate_id);
  if (mine.length === 0) {
    return { error: `${at}: no row for gate ${sch.gate_id} — the document carries `
      + `${rows.length} row(s) and none of them is this gate's, so nothing here ratifies the specialization record (§4.12.3)` };
  }
  // THE LAST ROW, and stated rather than left to a reader: a gate can be
  // re-raised after a declined answer, and the answer that governs is the one
  // the owner gave last. An earlier `not-ratified` beside a later `ratify` is
  // an owner who changed their mind, which is what re-raising a gate is for.
  const row = mine[mine.length - 1];
  const ev = row.evidence;
  if (ev?.tool !== "AskUserQuestion") {
    return { error: `${at}: evidence.tool is ${JSON.stringify(ev?.tool)} — a ratification is an OWNER act at the question UI, `
      + `and SPEC-gate-carrier binds this repository's gate medium to AskUserQuestion. A row recording any other tool records a session's own act (§4.12.3)` };
  }
  if (typeof ev.tool_use_id !== "string" || ev.tool_use_id === "") {
    return { error: `${at}: evidence.tool_use_id is missing — it is the one field tying this row to a question the harness actually asked, `
      + `and without it the row is indistinguishable from one a session composed (§4.12.3)` };
  }
  const answer = row.payload?.answer;
  const chosen = answer?.option;
  if (chosen === undefined) {
    return { error: `${at}: the answer carries no option — a free-text answer is not a ratification. `
      + `The gate offers ${JSON.stringify(sch.affirmative_option)} and ${JSON.stringify(sch.declining_option)}, and the write is unlocked by the first of those and by nothing else (§4.12.3)` };
  }
  if (chosen !== sch.affirmative_option) {
    return { error: `${at}: the owner answered ${JSON.stringify(chosen)} — the specialization record was rendered and NOT ratified, `
      + `so the path is not adopted into the Brief (§4.12.3). Nothing was written. Re-judge the Steps the owner disagreed with, or adopt another Candidate.` };
  }
  // THE TWO-AXIS BINDING, and both axes are the record's own. Without the
  // candidate axis an owner ratifies one Candidate and a sitting adopts
  // another; without the digest axis the record is editable after
  // ratification and adopts under a capture that judged different verdicts.
  const bound = row[sch.capture_binding_key];
  for (const k of sch.binding_required) {
    if (bound?.[k] === undefined) {
      return { error: `${at}: ${sch.capture_binding_key}.${k} is required — a capture that does not name WHAT it ratifies `
        + `certifies whatever it is presented beside (§4.12.3)` };
    }
  }
  if (bound.candidate_id !== candidateId) {
    return { error: `${at}: ratifies candidate ${JSON.stringify(bound.candidate_id)} but ${JSON.stringify(candidateId)} is being adopted — `
      + `an owner who ratified one Candidate did not ratify another (§4.12.3)` };
  }
  if (bound.record_digest !== digest) {
    return { error: `${at}: ratifies a specialization record digesting ${JSON.stringify(bound.record_digest)}, `
      + `but the record being adopted digests ${JSON.stringify(digest)} — the record CHANGED after it was ratified, so the owner `
      + `approved verdicts other than these. Re-render the record and re-raise the gate (§4.12.3). Nothing was written.` };
  }
  return { ok: true, tool_use_id: ev.tool_use_id, stop_id: row.stop_id };
}

// ---------------------------------------------------------------------------
// THE OWNER-ANSWER CAPTURE (kogaki#891, owner selection 2026-09-05).
//
// §4.12.3's ratification gate above is ONE gate. These two functions are the
// same discipline made reusable for the two gates that carry the owner's own
// DECISION rather than their ratification of a machine record: the
// thesis-determination gate (§5.3) and the Candidate-selection gate (§6).
// Both answers used to reach the runtime as arguments the model composed —
// `adopt --thesis`, `adopt-candidate --candidate` — with no evidence field of
// any kind, so the Harness's most consequential write in this pipeline was
// authorised by the model's account of what the owner chose.
//
// WHY A DIGEST OVER THE OPTION SET, and not over the answer. A capture
// certifies an answer GIVEN A SET OF OPTIONS: the same option id offered
// beside different alternatives is a different question. Binding to the
// offered set is what stops a capture taken at one rendering certifying a
// choice at another — the one-axis analogue of §4.12.3's two-axis binding,
// and the axis that matters here because the answer IS the option id rather
// than a ratification of something the id points at.
//
// THE FREE-TEXT CHANNEL RIDES THE CAPTURE, which is acceptance item 3 of
// kogaki#891. A free-form Thesis is the owner's own words, so it is exactly
// the value that must not arrive as a model-composed argument; it reaches the
// run state through `answer.free_text` on a captured row or it does not reach
// it at all.
export function ownerGateDigest(gateId, optionIds) {
  const canonical = JSON.stringify([gateId, [...optionIds]]);
  return createHash(gateSchema().capture.digest_algorithm || "sha256").update(canonical).digest("hex");
}

// Reads the one row for THIS gate and refuses on every axis that could let a
// capture certify an answer it does not record. Absence is refused by the
// CALLER, for the reason §4.12.3 already states: "no answer" is a fact about
// an act that did not happen, not about a capture's shape.
export function validateOwnerAnswer(capture, gateId, digest) {
  const at = `the ${gateId} capture`;
  const rows = capture?.rows;
  if (!Array.isArray(rows)) {
    return { error: `${at}: rows is an array of captured gate answers (SPEC-gate-carrier §4) — this document carries none, so it records no owner act` };
  }
  const mine = rows.filter((r) => r?.gate_id === gateId);
  if (mine.length === 0) {
    return { error: `${at}: no row for gate ${gateId} — the document carries ${rows.length} row(s) and none of them is this gate's, so nothing here records the owner's answer` };
  }
  // THE LAST ROW, for the reason validateRatification states: a gate can be
  // re-raised, and the answer that governs is the one the owner gave last.
  const row = mine[mine.length - 1];
  const ev = row.evidence;
  if (ev?.tool !== "AskUserQuestion") {
    return { error: `${at}: evidence.tool is ${JSON.stringify(ev?.tool)} — this is an OWNER act at the question UI, and SPEC-gate-carrier binds this repository's gate medium to AskUserQuestion. A row recording any other tool records a session's own act` };
  }
  if (typeof ev.tool_use_id !== "string" || ev.tool_use_id === "") {
    return { error: `${at}: evidence.tool_use_id is missing — it is the one field tying this row to a question the harness actually asked, and without it the row is indistinguishable from one a session composed` };
  }
  const bound = row.answers_over;
  if (bound?.option_set_digest === undefined) {
    return { error: `${at}: answers_over.option_set_digest is required — a capture that does not name WHICH OPTION SET it answered certifies whatever it is presented beside` };
  }
  if (bound.option_set_digest !== digest) {
    return { error: `${at}: answers the option set digesting ${JSON.stringify(bound.option_set_digest)}, but the options now offered digest ${JSON.stringify(digest)} — the option set CHANGED after the gate was raised, so the owner chose among alternatives other than these. Re-raise the gate. Nothing was written.` };
  }
  const answer = row.payload?.answer;
  if (answer === undefined || typeof answer !== "object") {
    return { error: `${at}: the row carries no payload.answer — the capture records that a question was asked and not what was answered` };
  }
  const option = answer.option;
  const freeText = answer.free_text;
  const hasOption = typeof option === "string" && option !== "";
  const hasFreeText = typeof freeText === "string" && freeText.trim() !== "";
  if (!hasOption && !hasFreeText) {
    return { error: `${at}: the answer carries neither an option nor free text — an empty answer is not an answer` };
  }
  return { ok: true, option: hasOption ? option : undefined,
    free_text: hasFreeText ? freeText : undefined,
    slug: typeof answer.slug === "string" && answer.slug !== "" ? answer.slug : undefined,
    tool_use_id: ev.tool_use_id, stop_id: row.stop_id };
}

// ---------------------------------------------------------------------------
// THE MOVE EXEMPLAR PREDICATE (§4.13.1, kogaki#751; owner rulings 2026-09-01
// and 2026-09-02).
//
// `specs/move-extraction-contract.md` is the schema authority for Move
// records: `excerpt` carries the author's own few-line account of the reader
// movement they observed when they identified the Move — the passage or
// transition they focused on, in their words. It is NOT a verbatim quotation
// of the source (owner ruling 2026-09-02): a Move derived at a meta level from
// a 10,000-character article is not served by 10,000 characters pasted into
// the record, and a verbatim requirement would lower the excerpt's value
// rather than raise it. What a later writer imitates is the movement, and the
// author's account of it is the exemplar.
//
// THE FIELD WAS RENAMED, NOT REPLACED. The records' former `sources` text was
// already this account — the cleanup at kogaki#548 stripped the ingestion
// routing that had contaminated the field, and what it left was the excerpt
// under the wrong name. No separate "source document" slot exists in a record;
// the article's title inside the excerpt's prose is the whole of its
// provenance, and git holds the rest.
//
// The predicate is therefore: a record whose `excerpt` carries text is an
// exemplar; one whose `excerpt` is empty CANNOT SERVE AS A PACKET EXEMPLAR,
// and the Packet renders a STATED ABSENCE rather than substituting anything.
// Every one of this repository's 22 records carries an excerpt today.

// Reads a Move record's `excerpt` text. Returns the excerpt, or the reason
// there is none — never a substitute, and never an empty string standing in
// for an account.
export function moveExcerpt(excerptText) {
  const t = typeof excerptText === "string" ? excerptText : "";
  // Folded-scalar indentation is presentation, not content: the field is
  // authored as `excerpt: >-` with its lines indented two spaces, and a reader
  // comparing the excerpt to what the author wrote should see the author's
  // words, not the file's margin.
  const body = t.split("\n").map((l) => l.replace(/^[ \t]+/, "")).join("\n").trim();
  if (body === "") {
    return {
      excerpt: null,
      absence: `this record's excerpt is empty — it holds no account of the reader movement the author observed, so it cannot serve as an exemplar (§4.13.1). Author one through specs/move-extraction-contract.md: a few lines, in your own words, naming the movement that led you to the Move.`,
    };
  }
  return { excerpt: body, absence: null };
}

// Can this record stand as the exemplar a writer imitates?
export function isExemplar(excerptText) {
  return moveExcerpt(excerptText).excerpt !== null;
}

// The Packet's excerpt block, rendered. A STATED ABSENCE is a rendering and
// never an error: the assembler that meets an empty excerpt says so in the
// block where the account would have gone, so a reader knows they are looking
// at a gap rather than at a short exemplar.
export function renderExcerptBlock(moveId, excerptText) {
  const r = moveExcerpt(excerptText);
  if (r.excerpt === null) {
    return `exemplar (${moveId}): NONE — ${r.absence}`;
  }
  return `exemplar (${moveId}):\n${r.excerpt}`;
}

// ---------------------------------------------------------------------------
// THE READER-KNOWLEDGE LEDGER (§4.13, kogaki#751; owner ruling 2026-09-01).
//
// A Step may declare `introduces` — the terms or concepts it puts in front of
// the reader for the first time, each bare or carrying a one-line meaning
// anchor where the Step's own grounds do not supply it. The harness then
// DERIVES what a reader already knows at Step N as the union of Steps 1..N-1's
// entries.
//
// ACCUMULATION IS ALWAYS COMPUTED, NEVER STORED. `reader_already_knows` is not
// a field, is not written into a Brief, and is not carried in a run record —
// it is a function of the path, recomputed wherever it is needed. A stored
// copy would be a second answer to a question the path already answers, and it
// would go stale the moment a Step moved.
//
// What the field buys, stated because it is the whole point: an unintroduced
// term becomes ADDRESSABLE. Responsibility traces to the first Step carrying
// the term, or to the Brief when no Step does — which is a fact about the path
// rather than a judgment about the prose.

// The entry grammar, in one place because two readers consume it: the
// composition side validates records, and `draft.mjs parseBrief` parses the
// serialized form back. A `term` alone, or `term — anchor`, on one line.
const INTRODUCES_SEP = "—";

export function parseIntroducesEntry(raw) {
  const line = String(raw).trim();
  if (line === "") return { error: "an empty entry" };
  const i = line.indexOf(INTRODUCES_SEP);
  if (i === -1) return { term: line, anchor: null };
  const term = line.slice(0, i).trim();
  const anchor = line.slice(i + INTRODUCES_SEP.length).trim();
  if (term === "") return { error: `an entry with no term before the ${INTRODUCES_SEP}` };
  if (anchor === "") return { error: `"${term}" carries a ${INTRODUCES_SEP} with no meaning anchor after it — write the term bare, or anchor it` };
  return { term, anchor };
}

// §4.15's `opens_section` (kogaki#822) — OPTIONAL, and shape-validated here for
// the reason `introduces` is: the title reaches an owner-facing heading, so an
// unvalidated value renders as a blank or as `undefined` above a Section.
export function opensSectionRefusal(value, at) {
  if (typeof value !== "string" || value.trim() === "") {
    return `${at}: opens_section, when present, is the Section's title — a non-empty string (§4.15). Its PRESENCE marks the opening and its VALUE carries the title, which is why an empty one has no meaning rather than meaning "opens with no title"`;
  }
  return null;
}

// §4.15's four grouping rules, validated over the WHOLE path rather than per
// Step, because every one of them is a statement about a Step's relation to its
// NEIGHBOURS. Returns the first refusal or null.
//
// WHICH RULES ARE MECHANICAL, stated because the answer is not uniform and a
// reader owes an account of the ones that are not:
//
//   rule 1  the POSITIVE case (a Step opens when it changes the reader's
//           question). Its `purpose` half is judgment — §4.6 clause 3 keeps
//           every MUST un-linted — and its violation is exactly rule 2's
//           refusal, so nothing separate is checked here.
//   rule 2  MECHANICAL and checked: a Step whose `depends_on` is exactly the
//           immediately preceding Step AND whose `materials` overlap that
//           Step's is DEVELOPING it, so it continues and may not open.
//   rule 3  MECHANICAL and checked: the first Step always opens.
//   rule 4  SPLIT (§4.15). The Step-count clause is checked here — two
//           consecutive Sections holding exactly one Step each refuse with the
//           request-to-merge. The prose-length clause measures realized prose,
//           which no Brief contains, and is a named deferred slot in §4.15.
export function sectionGroupingRefusal(steps) {
  const at = (i) => `step ${i + 1} (${steps[i].step_id})`;

  // rule 3 — the first Step always opens.
  if (steps[0].opens_section === undefined) {
    return `${at(0)}: §4.15 rule 3 — the FIRST Step always opens a Section, and this path opens none. A Brief whose Reader Path declares no opens_section anywhere renders as one unbroken run of prose, which is the second of the two drafts the 2026-09-03 ruling rejected`;
  }

  // rule 2 — a Step that develops its predecessor continues, so it may not open.
  for (let i = 1; i < steps.length; i++) {
    const s = steps[i], prev = steps[i - 1];
    if (s.opens_section === undefined) continue;
    const dependsOnlyOnPrev = s.depends_on.length === 1 && s.depends_on[0] === prev.step_id;
    const overlaps = s.materials.some((m) => prev.materials.includes(m));
    if (dependsOnlyOnPrev && overlaps) {
      return `${at(i)}: §4.15 rule 2 — this Step DEVELOPS ${prev.step_id} (its depends_on is exactly that Step, and its materials overlap it), so it continues that Section and may not open a new one. Remove its opens_section, or change what the Step stands on if the reader's question really does change here`;
    }
  }

  // rule 4, Step-count clause — two consecutive one-Step Sections.
  const opens = steps.map((s, i) => (s.opens_section === undefined ? -1 : i)).filter((i) => i >= 0);
  for (let k = 0; k + 2 < opens.length + 1; k++) {
    const start = opens[k];
    const next = k + 1 < opens.length ? opens[k + 1] : steps.length;
    const after = k + 2 < opens.length ? opens[k + 2] : steps.length;
    if (next - start === 1 && after - next === 1) {
      return `${at(start)}: §4.15 rule 4 — this Section and the one opening at ${steps[next].step_id} each hold exactly one Step. Two consecutive one-Step Sections are refused with a request to MERGE them, because a heading every Step is the first of the two drafts the ruling rejected. Length enters as a bound on the grouping, never as its reason`;
    }
  }
  return null;
}

// Shape refusal over a whole `introduces` value. Returns a string to refuse
// with, or null. `at` is the caller's own way of naming the Step, so one
// grammar serves the record side and the document side without either
// inventing wording the other does not use.
export function introducesRefusal(value, at) {
  if (!Array.isArray(value)) {
    return `${at}: introduces, when present, is an array of entries — a term the Step puts in front of the reader for the first time, bare or with a one-line meaning anchor (§4.13)`;
  }
  const seen = new Set();
  for (const raw of value) {
    if (typeof raw !== "string") {
      return `${at}: introduces carries a non-string entry — each entry is one line, "term" or "term ${INTRODUCES_SEP} anchor" (§4.13)`;
    }
    const e = parseIntroducesEntry(raw);
    if (e.error) return `${at}: introduces carries ${e.error} (§4.13)`;
    const key = e.term.toLowerCase();
    if (seen.has(key)) {
      return `${at}: introduces names "${e.term}" twice — a term is introduced once, and a Step claiming it twice makes the ledger's own count wrong (§4.13)`;
    }
    seen.add(key);
  }
  return null;
}

// THE DERIVATION. For each Step in path order, what the reader already knows
// arriving at it: the union of every EARLIER Step's entries, first-introducer
// kept. Pure over the path — no store, no file, no I/O.
//
// FIRST INTRODUCER WINS, and that is the addressability property rather than a
// tie-break: where two Steps declare the same term, the reader met it at the
// earlier one, so that is the Step a later question about the term resolves
// to. The second declaration is not an error — a composer may legitimately
// re-state a term — and it is not silently dropped either: it simply does not
// move the responsibility.
export function readerKnowledgeLedger(steps) {
  const known = new Map(); // term (lowercased) -> { term, anchor, introduced_by }
  const rows = [];
  for (const s of steps) {
    // The snapshot is taken BEFORE this Step's own entries are folded in: a
    // Step does not already know what it is itself introducing.
    rows.push({
      step_id: s.step_id,
      reader_already_knows: [...known.values()].map((v) => ({ ...v })),
    });
    for (const raw of s.introduces || []) {
      const e = parseIntroducesEntry(raw);
      if (e.error) continue; // validated upstream; a bad entry never reaches here
      const key = e.term.toLowerCase();
      if (!known.has(key)) {
        known.set(key, { term: e.term, anchor: e.anchor, introduced_by: s.step_id });
      }
    }
  }
  return rows;
}

// Where responsibility for a term lies: the FIRST Step that introduces it, or
// `null` — meaning the Brief itself — when no Step does. The null case is the
// point of the function and not an error path: an article may legitimately
// rely on a term its path never introduces, and the ledger's job is to say
// SO, addressably, rather than to refuse.
export function introducerOf(term, steps) {
  const key = String(term).trim().toLowerCase();
  for (const s of steps) {
    for (const raw of s.introduces || []) {
      const e = parseIntroducesEntry(raw);
      if (!e.error && e.term.toLowerCase() === key) return s.step_id;
    }
  }
  return null;
}

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
  // §4.13 (kogaki#751): one LINE per entry, never a comma-joined list. A term
  // may legitimately contain a comma, and its anchor almost always does, so a
  // joined field could not be parsed back — the serialization and
  // `parseBrief`'s reader are one round trip and this is the half that makes
  // it possible.
  for (const e of s.introduces || []) L.push(`introduces: ${e}`);
  if (s.opens_section !== undefined) L.push(`opens_section: ${s.opens_section}`);
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
