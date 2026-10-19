// review-draft/regression — the regression guard, and the two passes side by side.
// Cut from src/review-draft.mjs at its named section (kogaki#1458); the
// design and its rulings are stated at the entry and in the Issues each
// block below names.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   the figure record
//       SPEC-draft-pipeline "The figure record — the form's instance, filled after the prose"
//
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { withReplyFile, draftLane } from "./correction.mjs";
import { fail, readDraft, resolveInputs } from "./draft-reader.mjs";
import { verdictKey } from "./join.mjs";
import { passReadPath } from "./workspace.mjs";

// ---------------------------------------------------------------------------
// THE REGRESSION GUARD, AND THE TWO PASSES SIDE BY SIDE (kogaki#1135).
//
// WHAT WAS OBSERVED. In the first full review run, a corrected Leg FAILED in
// pass two an item it had HELD in pass one. The Harness recorded that as
// residue, indistinguishable from an item that failed in both passes, and
// nothing put the Leg's pass-one prose back — so the run's product was an
// article the review had made worse on a dimension the review itself measured,
// reported as an item for the owner to classify.
//
// THE OWNER'S RULING (2026-09-17): `check` REFUSES A REGRESSION. The Leg is
// restored to the prose it carried in pass one, through the realization lane
// that wrote it, and the item the correction was made for returns to residue as
// still failing — which is the true report: the correction was attempted, it
// broke something that held, and the state the run ends in is the state it
// started from with the original finding intact.
//
// ONLY THE REGRESSED LEG IS RESTORED, and later corrected Legs are neither
// restored nor marked. Continuity between Legs was settled at Reader Path
// design and holds while a Leg is unchanged; ReviewDraft is not responsible for
// Leg-to-Leg continuity, so a restore that reached forward would be this
// Harness answering a question the Reader Path owns.
//
// THE CORRECTION INPUT IS UNCHANGED. The owner weighed an explicit
// edit-instruction stage and withdrew it: it would make some role responsible
// for repair advice whose quality nothing guarantees. A failure reason from the
// round trip is external feedback and stays what the corrector is handed.

// PASS ONE'S ANSWER PER (Leg, item, pair), read off the pass-one join record
// rather than recomputed. A row with `pairs` answers per pair; a row the
// Harness decided carries its answer on the row itself and has none.
function passOneVerdicts(priorJoin) {
  const m = new Map();
  for (const r of priorJoin.results || []) {
    if (Array.isArray(r.pairs) && r.pairs.length) {
      for (const p of r.pairs) {
        m.set(verdictKey(r.leg_id, r.item, p.pair), { ...p, class: r.class, item: r.item, leg_id: r.leg_id });
      }
    } else {
      m.set(verdictKey(r.leg_id, r.item, r.pair === undefined ? null : r.pair), r);
    }
  }
  return m;
}

// THE PAIRS A CORRECTED LEG LOST. Computed from the two records rather than
// from the correction's own `held_preserved` list, which names ITEMS and is
// per seat: the unit the restore turns on is the pair, and the two records are
// where a pair's two readings sit. The class rule is the one that decides every
// other consequence in this Harness — a PRESERVED item's fail is what sends a
// Leg to correction and what becomes residue, so it is what a regression is
// measured on. A best-effort item that stops holding rides along exactly as its
// fail does.
function regressedPairs(run, priorJoin, results) {
  const corrected = new Set((run.corrections || []).map((c) => c.leg_id));
  const one = passOneVerdicts(priorJoin);
  const out = [];
  for (const r of results) {
    if (r.carried || r.owed || !corrected.has(r.leg_id) || r.class !== "preserved") continue;
    const pairs = Array.isArray(r.pairs) && r.pairs.length
      ? r.pairs
      : [{ pair: r.pair === undefined ? null : r.pair, verdict: r.verdict, reason: r.reason }];
    for (const p of pairs) {
      const key = verdictKey(r.leg_id, r.item, p.pair);
      const before = one.get(key);
      if (!before || before.verdict !== "holds" || p.verdict !== "fails") continue;
      out.push({ key, leg_id: r.leg_id, item: r.item, pair: p.pair === undefined ? null : p.pair,
        pass_1: "holds", pass_2: "fails", reason: p.reason });
    }
  }
  return out;
}

// RESTORE ONE LEG, THROUGH THE REALIZATION LANE. The same door `correct` used
// to move the prose is the door that moves it back — a restore that wrote the
// Draft here would be a second writer of the trace, which is the reason
// `correct` enters the lane as a subprocess in the first place.
//
// EVERY SEAT THE LEG WAS CORRECTED IN GOES BACK, prose before figure, in the
// order `correct` itself enforces and for its reason: the record's caption is
// stated in what the reader holds after reading the passage. A Leg corrected
// in one seat restores one.
//
// PASS ONE'S READING COMES BACK WITH THE PROSE. The Reverse Outline pointer
// returns to pass one's file and pass one's judged answers are written back
// into the run's verdicts, because the prose those answers were given on is the
// prose the Draft now carries again. Leaving pass two's answers beside restored
// prose would be the defect this Harness exists to refuse — a recorded reading
// about text that is gone — with the two halves swapped.
function restoreRegressedLeg(args, { draft, draftPath, ws, run, legId, regressed, passTwoRows, priorJoin }) {
  const inputs = run.correction_inputs || {};
  const seats = (run.corrections || []).filter((c) => c.leg_id === legId)
    .map((c) => c.seat || "prose");
  const ordered = [...new Set(["prose", "figure"].filter((s) => seats.includes(s)))];
  const snapDir = join(ws, "snapshots");
  mkdirSync(snapDir, { recursive: true });
  const seq = String((run.restores || []).length + 1).padStart(2, "0");
  const before = join(snapDir, `r${seq}-before-restore-${legId}.md`);
  writeFileSync(before, draft.text);

  for (const seat of ordered) {
    if (seat === "prose") {
      const rec = inputs[legId];
      // A REFUSAL, NEVER A SILENT SKIP. `correct` phase A reads the previous
      // prose out while the Draft is still consistent and records it; a run
      // whose record does not carry it cannot be put back, and continuing
      // would leave the regressed prose in the article under a record saying
      // it was restored.
      if (!rec || typeof rec.prose !== "string") {
        fail(`leg ${legId} failed in pass two an item it held in pass one, and this run's record `
          + "carries no copy of the prose it held that item on, so there is nothing to restore it "
          + "to. `correct` records the previous realization when it renders the correction input; a "
          + "run whose record predates that cannot be restored, and re-opening the review on the "
          + "current article is what starts one that can.");
      }
      withReplyFile(rec.prose.endsWith("\n") ? rec.prose : rec.prose + "\n", `${legId}.prose.md`,
        (p) => draftLane("section", draft, args, ["--leg", legId, "--file", p]));
    } else {
      const rec = inputs[`${legId}#figure`];
      if (!rec || typeof rec.record_text !== "string") {
        fail(`leg ${legId}'s FIGURE was corrected and regressed in pass two, and this run's `
          + "record carries no copy of the figure record the reader met, so there is nothing to "
          + "restore it to. Re-open the review on the current article.");
      }
      withReplyFile(rec.record_text, `${legId}.figure.json`,
        (p) => draftLane("figure", draft, args, ["--leg", legId, "--file", p]));
    }
  }
  draftLane("emit", draft, args, []);

  const after = readDraft(draftPath);
  const afterLegs = resolveInputs(after).legs;
  const restored = afterLegs.find((s) => s.leg_id === legId);
  if (!restored) fail(`leg ${legId} is absent from the re-emitted Draft's trace after its restore`);
  // THE RESTORE IS CHECKED RATHER THAN CLAIMED. The lane re-assembles the body,
  // and prose that came back different from the prose handed in would leave the
  // run reporting a restore it did not make — the one failure this act cannot
  // be allowed to make quietly, since everything downstream now reads pass
  // one's verdicts against it.
  if (ordered.includes("prose") && restored.prose.trim() !== String(inputs[legId].prose).trim()) {
    fail(`leg ${legId} was handed its pass-one prose and the re-emitted Draft carries something `
      + "else, so the restore did not land. Nothing further is recorded: pass one's verdicts would "
      + "otherwise be read against prose they were not given on.");
  }
  writeFileSync(join(snapDir, `r${seq}-after-restore-${legId}.md`), after.text);

  run.body_sha = after.body_sha;
  run.legs = afterLegs.map((s) => ({
    leg_id: s.leg_id, section: s.section, section_title: s.section_title,
    lines: s.lines, packet: s.packet, packet_sha: s.packet_sha,
  }));
  run.outlineFields[legId] = passReadPath(ws, 1, "outline", `${legId}.json`);
  if ((run.figureOutlineFields || {})[legId]) {
    run.figureOutlineFields[legId] = passReadPath(ws, 1, "outline", `${legId}.figure.json`);
  }
  const one = passOneVerdicts(priorJoin);
  run.verdicts = run.verdicts || {};
  let reinstated = 0;
  for (const [key, v] of one) {
    if (v.leg_id !== undefined && v.leg_id !== legId) continue;
    if (!key.startsWith(`${legId}/`)) continue;
    // ONLY A JUDGED ANSWER IS WRITTEN BACK. A mechanical item, a stated absence
    // and an empty reverse side are COMPUTED from the Draft on every build, so
    // recording one as a verdict would replace a fact with a copy of itself
    // taken at another time — which `recordVerdicts` refuses by name when a
    // session tries it.
    if (v.judged !== true) continue;
    run.verdicts[key] = { key, leg_id: legId, item: v.item, pair: v.pair === undefined ? null : v.pair,
      verdict: v.verdict, reason: v.reason, model: v.model ?? null };
    reinstated++;
  }

  run.restores = run.restores || [];
  run.restores.push({
    leg_id: legId,
    seats: ordered,
    pass: 2,
    what: `restored to the prose this Leg carried in pass one, through the realization lane, `
      + `because pass two failed ${regressed.length} item pair(s) it had held`,
    regressed: regressed.map((r) => ({ item: r.item, pair: r.pair, pass_1: r.pass_1,
      pass_2: r.pass_2, reason: r.reason })),
    // PASS TWO'S OWN ANSWERS FOR THIS LEG, KEPT. They are not the run's
    // reading any more — the prose they were given on is gone — and they are
    // the evidence that the restore happened at all, which is what `passes.json`
    // renders in its `pass_2` column for these rows.
    pass_two_rows: passTwoRows,
    verdicts_reinstated: reinstated,
    snapshot_before: before,
    snapshot_after: join(snapDir, `r${seq}-after-restore-${legId}.md`),
    restored_at: new Date().toISOString(),
  });
  return after;
}

// THE TWO PASSES SIDE BY SIDE, ONE ROW PER (Leg, item, pair) — `passes.json`
// at the run root (kogaki#1135). Comparing the passes meant reading
// `pass-1/join.json` and `pass-2/check.json` side by side by hand, and the
// question a reader actually has of them — what did this pass DO to this pair —
// is one word that neither record carries.
//
// JSON, NOT MARKDOWN, by the owner's ruling: it is a derived record for reading
// against the two it is derived from, and the prose surface a person reads is
// `review.md`.
//
// THE ROWS ARE PASS ONE'S KEYS. Pass one is the unbounded join over every Leg,
// item and pair, so it is the complete index; a key pass two produced that pass
// one never answered is reported in `pass_two_only` rather than given an
// outcome word, because none of the five is true of a pair with one reading.
const PASS_OUTCOMES = ["held", "fixed", "still-failing", "regressed", "carried"];
function buildPasses(run, priorJoin, results) {
  const one = passOneVerdicts(priorJoin);
  const two = new Map();
  const carried = new Set();
  const rowsOf = (rs) => {
    const out = [];
    for (const r of rs) {
      if (Array.isArray(r.pairs) && r.pairs.length) {
        for (const p of r.pairs) out.push([verdictKey(r.leg_id, r.item, p.pair), p, r]);
      } else {
        out.push([verdictKey(r.leg_id, r.item, r.pair === undefined ? null : r.pair), r, r]);
      }
    }
    return out;
  };
  for (const [key, p, r] of rowsOf(results)) {
    two.set(key, p);
    if (r.carried) carried.add(key);
  }
  // A RESTORED LEG'S `pass_2` IS THE ANSWER PASS TWO GAVE, not the pass-one
  // answer the restore put back in its place. The restore is what this file has
  // to be able to show, and showing `holds`/`holds` for a pair that regressed
  // would erase the very event the guard fired on.
  for (const rec of run.restores || []) {
    for (const [key, p] of rowsOf(rec.pass_two_rows || [])) { two.set(key, p); carried.delete(key); }
  }

  const rows = [];
  const counts = Object.fromEntries(PASS_OUTCOMES.map((w) => [w, 0]));
  for (const [key, before] of one) {
    const after = two.get(key);
    const p1 = before.verdict ?? null;
    const reJudged = after !== undefined && !carried.has(key) && after.verdict !== undefined;
    const p2 = reJudged ? after.verdict : null;
    const outcome = !reJudged
      ? "carried"
      : (p1 === "holds"
        ? (p2 === "holds" ? "held" : "regressed")
        : (p2 === "holds" ? "fixed" : "still-failing"));
    counts[outcome]++;
    rows.push({ leg_id: before.leg_id ?? key.split("/")[0], item: before.item,
      pair: before.pair === undefined ? null : before.pair,
      class: before.class ?? null, pass_1: p1, pass_2: p2, outcome });
  }
  const passTwoOnly = [...two.keys()].filter((k) => !one.has(k));
  return { rows, counts, pass_two_only: passTwoOnly };
}

export { regressedPairs, restoreRegressedLeg, PASS_OUTCOMES, buildPasses };
