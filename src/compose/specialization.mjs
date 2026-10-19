// compose/specialization — the specialization record, the gate schema and the owner answer
// (cut from src/compose.mjs at its named section, kogaki#1465; the entry
// re-exports every name src/compose.mjs exported before the cut).

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the Leg-Move instantiation contract;
//       the owner gate over a passing specialization record;
//       the reader-knowledge ledger; the Move exemplar predicate;
//       the judgment rule; the constraints that survive
//   SPEC-gate-carrier: payload and answer capture
//
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

// THE JUDGED HALF's carrier contract, read from the schema rather than
// restated here — the same single-carrier arrangement record-schema.json and
// gate-schema.json use, so the vocabulary is amended in one place.
let SPECIALIZATION_SCHEMA = null;
export function specializationSchema() {
  if (SPECIALIZATION_SCHEMA) return SPECIALIZATION_SCHEMA;
  const p = join(dirname(fileURLToPath(import.meta.url)), "..", "specialization-schema.json");
  SPECIALIZATION_SCHEMA = JSON.parse(readFileSync(p, "utf8"));
  return SPECIALIZATION_SCHEMA;
}

// The gate carrier's two artifacts, read rather than restated — the same
// single-carrier arrangement `specializationSchema` above uses. the owner gate over a passing specialization record's gate
// is declared in the registry like every other gate this repository raises,
// and the capture's filename suffix is a JOIN KEY the check resolves by, so a
// second copy of either would let a rename pass silently.
let GATE_SCHEMA = null;
export function gateSchema() {
  if (GATE_SCHEMA) return GATE_SCHEMA;
  const p = join(dirname(fileURLToPath(import.meta.url)), "..", "gate-schema.json");
  GATE_SCHEMA = JSON.parse(readFileSync(p, "utf8"));
  return GATE_SCHEMA;
}
let GATE_REGISTRY = null;
export function gateRegistry() {
  if (GATE_REGISTRY) return GATE_REGISTRY;
  const p = join(dirname(fileURLToPath(import.meta.url)), "..", "gate-registry.json");
  GATE_REGISTRY = JSON.parse(readFileSync(p, "utf8"));
  return GATE_REGISTRY;
}

// VALIDATE, NEVER COMPOSE. Every branch below is a refusal or a pass; none
// writes a verdict, fills a default, or infers one from a Leg's fields. A
// record that is absent is refused by the CALLER (the occasion is mandatory,
// the Leg-Move instantiation contract), because "no record" is a fact about the act rather than about the
// record's shape.
export function validateSpecialization(record, legs, candidateId, { refuseFailing = true } = {}) {
  const sch = specializationSchema();
  const at = "the specialization record";
  for (const k of sch.record.required) {
    if (record?.[k] === undefined) {
      return { error: `${at}: ${k} is required (the Leg-Move instantiation contract) — the record is the judgment's carrier, and a carrier missing a required field records nothing` };
    }
  }
  if (String(record.version) !== sch.record.version_must_be) {
    return { error: `${at}: version ${JSON.stringify(record.version)} — this runtime reads version ${sch.record.version_must_be} (src/specialization-schema.json)` };
  }
  if (record.candidate_id !== candidateId) {
    return { error: `${at}: judges candidate ${JSON.stringify(record.candidate_id)} but ${JSON.stringify(candidateId)} is being adopted — `
      + `a record composed against one Candidate cannot certify another (the Leg-Move instantiation contract). Judge the Candidate you are adopting.` };
  }
  if (!Array.isArray(record.verdicts)) {
    return { error: `${at}: verdicts is an array, one entry per Leg of the adopted path (the Leg-Move instantiation contract)` };
  }
  const vocab = new Set(sch.vocabulary.values);
  const passing = new Set(sch.vocabulary.passing);
  const byLeg = new Map();
  for (const v of record.verdicts) {
    for (const k of sch.verdict.required) {
      if (typeof v?.[k] !== "string" || v[k] === "") {
        return { error: `${at}: a verdict is missing ${k} — the Leg-Move instantiation contract's verdict names the Leg, the Move it instantiates, the verdict, and one sentence of why` };
      }
    }
    if (byLeg.has(v.leg_id)) {
      return { error: `${at}: two verdicts for leg ${v.leg_id} — one per Leg, exactly (the Leg-Move instantiation contract)` };
    }
    byLeg.set(v.leg_id, v);
  }
  // A verdict for a Leg outside the adopted path means the record was
  // composed against a different path than the one being adopted.
  for (const v of record.verdicts) {
    if (!legs.some((s) => s.leg_id === v.leg_id)) {
      return { error: `${at}: verdict for leg ${v.leg_id}, which is not in the adopted path `
        + `(${legs.map((s) => s.leg_id).join(", ")}) — the record judges the path being adopted and no other (the Leg-Move instantiation contract)` };
    }
  }
  // ONE PER LEG, EXACTLY — the other direction, and it is the FIRST branch of
  // the loop below rather than a pass of its own. That siting is deliberate:
  // as a separate preceding loop it was a completeness check that the per-Leg
  // loop then silently DEPENDED on, so removing it did not make this function
  // refuse — it made it throw on `v.move` several lines later. One guard, in
  // the loop that needs the value, keeps the function total: every path out of
  // it is a refusal or a pass, and there is no ordering between two guards for
  // a later edit to break.
  for (const s of legs) {
    const v = byLeg.get(s.leg_id);
    if (v === undefined) {
      return { error: `${at}: leg ${s.leg_id} carries no verdict — the specialization judgment is per Leg and cannot be skipped for one (the Leg-Move instantiation contract)` };
    }
    if (v.move !== s.move) {
      return { error: `${at}: leg ${s.leg_id}'s verdict judges move "${v.move}" but the Leg binds "${s.move}" — `
        + `the judgment is about THIS Leg instantiating THIS Move, so a record naming another one certifies nothing (the Leg-Move instantiation contract)` };
    }
    if (!vocab.has(v.verdict)) {
      return { error: `${at}: leg ${s.leg_id}: verdict ${JSON.stringify(v.verdict)} — the Leg-Move instantiation contract's vocabulary is closed: `
        + `${sch.vocabulary.values.join(" | ")}` };
    }
    if (v.why.trim().split(/\s+/).length < sch.verdict.why_min_words) {
      return { error: `${at}: leg ${s.leg_id}: why is ${v.why.trim().split(/\s+/).length} word(s) — `
        + `the record carries one sentence of why, which is what a reader of a refusal is handed (the Leg-Move instantiation contract)` };
    }
  }
  if (!refuseFailing) return { ok: true, judged: legs.length };
  // THE REFUSAL, deterministic and in the path's own order: the FIRST Leg
  // that does not pass, named, with its own sentence quoted back rather than
  // paraphrased.
  for (const s of legs) {
    const v = byLeg.get(s.leg_id);
    if (!passing.has(v.verdict)) {
      const why = v.verdict === "cannot-determine"
        ? `the judgment could not be reached against that Move's contract`
        : `the instantiated reader states contradict that Move's before/after`;
      return { error: `leg ${s.leg_id}: ${v.verdict} — ${why}. The judging sitting wrote: `
        + `"${v.why.trim()}" — a Leg whose instantiation does not hold is not adopted into a Brief (the Leg-Move instantiation contract). `
        + `Nothing was written.` };
    }
  }
  return { ok: true, judged: legs.length };
}

// EVERY LEG WHOSE VERDICT DOES NOT PASS, in path order, each with the judge's
// own sentence (kogaki#1276). Read over a record `validateSpecialization`
// already admitted, so every Leg carries exactly one verdict.
export function specializationFailures(record, legs) {
  const passing = new Set(specializationSchema().vocabulary.passing);
  const byLeg = new Map((record.verdicts || []).map((v) => [v.leg_id, v]));
  return legs
    .map((s) => byLeg.get(s.leg_id))
    .filter((v) => v && !passing.has(v.verdict))
    .map((v) => ({ leg_id: v.leg_id, move: v.move, verdict: v.verdict, why: v.why.trim() }));
}

// ---------------------------------------------------------------------------
// THE OWNER RATIFICATION GATE (the owner gate over a passing specialization
// record, kogaki#893; owner selection 2026-09-05). A shape-valid record of
// judgment-free `consistent` verdicts used to adopt a Candidate with no
// refusal. This renders no verdict, reads no Move `before`/`after` and
// compares nothing: the record reaches the owner AS GATE EVIDENCE (the
// constraints that survive; the judgment rule clause 2).

// THE DIGEST THE DISCLOSURE SENTENCE NAMES. Over the verdicts AS JUDGED, in
// the adopted path's order, so a reordered record digests identically and a
// changed judgment does not. IT BINDS NO CAPTURE ANY MORE (kogaki#1108): it
// names the record in adoption's closing summary, so two adoptions of one
// path under different judgments stay distinguishable.
export function specializationDigest(record, legs) {
  const byLeg = new Map((record.verdicts || []).map((v) => [v.leg_id, v]));
  const rows = legs.map((s) => {
    const v = byLeg.get(s.leg_id) || {};
    return [v.leg_id, v.move, v.verdict, typeof v.why === "string" ? v.why.trim() : v.why];
  });
  const canonical = JSON.stringify([String(record.version), record.candidate_id, rows]);
  return createHash(specializationSchema().disclosure.digest.algorithm).update(canonical).digest("hex");
}

// `validateRatification` IS DELETED, NOT DEPRECATED (kogaki#1108): no gate
// writes a ratification capture, and a leftover import fails at load.
//
// ---------------------------------------------------------------------------
// THE OWNER-ANSWER CAPTURE (kogaki#891, owner selection 2026-09-05), for the
// thesis-determination and Candidate-selection gates, whose answers used to
// arrive as model-composed arguments. THE DIGEST IS OVER THE OPTION SET, not
// the answer: the same option id beside different alternatives is a
// different question. A free-form Thesis reaches run state only through
// `answer.free_text` on a captured row (kogaki#891 item 3).
export function ownerGateDigest(gateId, optionIds) {
  const canonical = JSON.stringify([gateId, [...optionIds]]);
  return createHash(gateSchema().capture.digest_algorithm || "sha256").update(canonical).digest("hex");
}

// Reads the one row for THIS gate and refuses on every axis that could let a
// capture certify an answer it does not record. Absence is refused by the
// CALLER, for the reason the owner gate over a passing specialization record already states: "no answer" is a fact about
// an act that did not happen, not about a capture's shape.
export function validateOwnerAnswer(capture, gateId, digest) {
  const at = `the ${gateId} capture`;
  const rows = capture?.rows;
  if (!Array.isArray(rows)) {
    return { error: `${at}: rows is an array of captured gate answers (SPEC-gate-carrier, payload and answer capture) — this document carries none, so it records no owner act` };
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
// THE MOVE EXEMPLAR PREDICATE — RETIRED (SPEC-draft-pipeline, kogaki#1175).
// A Move's `excerpt` used to be the Packet's exemplar (`moveExcerpt`,
// `isExemplar`, `renderExcerptBlock`); it is retired, and `evidence` does
// NOT inherit the role (owner ruling 7, kogaki#1173). The Leg Packet's Move
// block is `technique`, `question`, `draws_on`, `breaks`.

// ---------------------------------------------------------------------------
// THE READER-KNOWLEDGE LEDGER (kogaki#751; owner ruling 2026-09-01). A Leg
// may declare `introduces` — terms it puts before the reader first, bare or
// with a one-line meaning anchor. What a reader knows at Leg N is DERIVED
// as the union of Legs 1..N-1's entries: ALWAYS COMPUTED, NEVER STORED, so
// it cannot go stale. An unintroduced term becomes ADDRESSABLE: it traces to
// the first Leg carrying it, or to the Brief.

// The entry grammar, in one place because two readers consume it: the
// composition side validates records, and `draft.mjs parseBrief` parses the
// serialized form back. A `term` alone, or `term — anchor`, on one line.
export const INTRODUCES_SEP = "—";
