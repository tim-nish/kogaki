// paragraph-plan/site-retry — the site retry: the one-paragraph repair a refusal naming a paragraph asks for, and the suffix call. Cut from src/paragraph-plan.mjs along its headed
// sections (kogaki#1792); the design and its rulings are stated at the entry and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { loadMoveContracts, undeclaredKey } from "../compose.mjs";
import { JUDGE_INPUT_MARKER, judgeRefusalBlock } from "../workflow/judge.mjs";
import { withAnalogy } from "../paragraph-plan-analogy.mjs";
import {
  UNIT_KEYS,
  UNIT_PARAGRAPH_KEYS,
  boundMoveContract,
  boundOf,
  readMappingState,
  validateParagraphPlanUnit,
} from "./axes.mjs";
import {
  MODEL_ARMS,
  MODEL_WIDENING,
  refusalFindings,
  repairOf,
  shapeFindings,
  withoutShape,
  writeRepair,
} from "./findings.mjs";
import { appendSiteCallInput, siteCallInputRow } from "./selection-input.mjs";
import { legForUnit, segmentsForPlanCall } from "./units.mjs";

// ---------------------------------------------------------------------------
// THE SITE RETRY (kogaki#1642, owner decision 2026-10-31). A refusal that names a paragraph is
// repaired at that paragraph alone: the site call is handed that one paragraph, the Leg's bound
// Move, the paragraphs beside it and its refusals, and answers one paragraph. The Move is the
// Leg's and is held at every site (kogaki#1777); a refusal of the binding reopens the whole Leg
// through the suffix call from paragraph 1, which may bind another Move. The supervisor runs the
// loop (src/workflow/site-retry.mjs); what follows builds the calls' prompts and reads back their
// answers.
export const siteRepeatRefusal = (n) =>
  `the answer repeats the refused paragraph ${n}; the refusal asked for a change at that paragraph`;

const canonical = (v) =>
  JSON.stringify(v ?? null, (k, x) =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(
          Object.keys(x)
            .sort()
            .map((key) => [key, x[key]]),
        )
      : x,
  );
const isMap = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
export const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// AN ANSWER THAT DOES NOT ACT ON ITS REFUSAL: after a judge's refusal, the same Waypoints and
// join; after a validator's, the same paragraph whole, since the field it named may be any of them.
export function repeatsRefusedEntry(answer, refused, byJudge) {
  if (!isMap(answer) || !isMap(refused)) return false;
  if (!byJudge) return canonical(answer) === canonical(refused);
  return (
    canonical(answer.paragraph_waypoints) === canonical(refused.paragraph_waypoints) &&
    canonical(answer.join) === canonical(refused.join)
  );
}

// THE TEXT OF A PARAGRAPH'S WAYPOINTS, IN ORDER (kogaki#1651): each one's `point` or
// `performs`, or the first sentence it carries under any other key, so a restatement under a
// changed shape still reads as the same text.
export function paragraphPointsText(entry) {
  const pws = isMap(entry) && Array.isArray(entry.paragraph_waypoints) ? entry.paragraph_waypoints : [];
  return pws.map((pw) => {
    if (!isMap(pw)) return String(pw ?? "").trim();
    const text = [pw.point, pw.performs, ...Object.values(pw)].find((v) => typeof v === "string" && v.trim() !== "");
    return text ? text.trim() : "";
  });
}

// AN ANSWER THAT RESTATES A REFUSED ROUND (kogaki#1651): its Waypoints' text equals a
// refused paragraph's, in order, whatever else the record changed. Returns the unchanged points.
export function restatedPoints(answer, history) {
  const mine = paragraphPointsText(answer);
  if (!mine.length) return null;
  for (const h of history || []) {
    const theirs = paragraphPointsText(h.entry);
    if (theirs.length === mine.length && theirs.every((t, i) => t === mine[i])) return mine;
  }
  return null;
}
export const siteRestatementRefusal = (n, points) =>
  `the answer restates the refused round's Waypoints at paragraph ${n} unchanged — ` +
  `${points.map((t) => JSON.stringify(t)).join(", ")}; the refusal asked for a change to what they say`;

// THE PARAGRAPHS BESIDE A SITE (kogaki#1651): the previous and next paragraphs' Waypoints, each by number.
export function paragraphsBeside(entries, n) {
  return [n - 1, n + 1]
    .filter((m) => m >= 1 && isMap(entries[m - 1]))
    .map((m) => ({ paragraph: m, paragraph_waypoints: entries[m - 1].paragraph_waypoints || [] }));
}

// PROSE THAT DESCRIBES THE REPAIR RATHER THAN THE PARAGRAPH (kogaki#1651): a word of the refusal or
// the Round, an Issue reference, or a field of the record named in backticks.
const SITE_PROSE_FIELDS = ["purpose", "rationale"];
const RECORD_FIELD_NAMES = new Set([
  ...UNIT_KEYS,
  ...UNIT_PARAGRAPH_KEYS,
  "point",
  "serves",
  "performs",
  "paragraph_you_must_plan",
  "bound_move",
  "paragraphs_beside",
  "refused_here",
  "the_reader_has_been_told",
  "leaves_for_next_leg",
  "re_activations_this_paragraph_carries",
  "takes",
  "leaves",
  "segments",
  "operation",
]);
export function repairProse(answer) {
  for (const field of SITE_PROSE_FIELDS) {
    const text = typeof answer[field] === "string" ? answer[field] : "";
    const word = (/\w*refus\w*/i.exec(text) || /\w*attempt\w*/i.exec(text) || /kogaki#\d*/i.exec(text) || [])[0];
    const named = [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim()).find((k) => RECORD_FIELD_NAMES.has(k));
    if (word) return { field, said: JSON.stringify(word) };
    if (named) return { field, said: `\`${named}\`` };
  }
  return null;
}

function bindableMoves(movesDir) {
  const library = loadMoveContracts(movesDir);
  if (library.error) throw new Error(library.error);
  return library.moves.map((m) => ({ ...m, segments: segmentsForPlanCall(m.segments) }));
}

// kogaki#1649: the passing record, each Waypoint that differs from the first refused Round at its paragraph
// marked with the axes the judge's refusals named. A refusal of the Leg whole (kogaki#1777), kept at
// site 0, marks each Waypoint that differs from the refused Leg's same paragraph, and a Move it rebound.
export function paragraphPlanForcedMark(record, history, inputs) {
  const axes = (inputs && inputs.axes) || [];
  const named = (text) => axes.filter((id) => new RegExp(`\\b${escapeRe(id)}\\b`).test(String(text)));
  const forcedBy = (refusals) => axes.filter((id) => refusals.some((h) => named(h.refusal).includes(id)));
  const whole = ((history && history.get(0)) || []).filter((h) => h.by_judge);
  const wholeForced = forcedBy(whole);
  const wholeRefused = whole.length && isMap(whole[0].entry) ? whole[0].entry : {};
  const paragraphs = record.paragraphs.map((e, i) => {
    if (!isMap(e)) return e;
    const refusals = ((history && history.get(i + 1)) || []).filter((h) => h.by_judge);
    const marks = [
      [forcedBy(refusals), refusals.length && isMap(refusals[0].entry) ? refusals[0].entry : {}],
      [wholeForced, (Array.isArray(wholeRefused.paragraphs) && wholeRefused.paragraphs[i]) || {}],
    ].filter(([f]) => f.length);
    if (!marks.length) return e;
    const pws = (e.paragraph_waypoints || []).map((p) => {
      const forced = axes.filter((id) =>
        marks.some(
          ([f, refused]) =>
            f.includes(id) &&
            !(Array.isArray(refused.paragraph_waypoints) ? refused.paragraph_waypoints : [])
              .map(canonical)
              .includes(canonical(p)),
        ),
      );
      return forced.length ? { ...p, forced_by: forced } : p;
    });
    return { ...e, paragraph_waypoints: pws };
  });
  const rebound = wholeForced.length && wholeRefused.move !== undefined && wholeRefused.move !== record.move;
  return { ...record, ...(rebound ? { move_forced_by: wholeForced } : {}), paragraphs };
}

// kogaki#1649: one row per axis with the paragraphs it forced across the plan's Legs, and the total.
export function paragraphPlanCollisions(legs, axes) {
  const rows = axes.map((axis) => ({ axis, entries: 0 }));
  for (const l of legs) {
    for (const e of l.paragraphs || []) {
      const hit = new Set([
        ...(l.move_forced_by || []),
        ...(e.paragraph_waypoints || []).flatMap((p) => p.forced_by || []),
      ]);
      for (const r of rows) if (hit.has(r.axis)) r.entries += 1;
    }
  }
  return { rows, total: rows.reduce((n, r) => n + r.entries, 0) };
}

// THE REPAIR BEFORE A RETRY (kogaki#1815): the refusal's Findings, with every shape Finding the program reads from the
// refused paragraph itself, and the Arm they fix, written to the run before the retry. Only shape Findings: the program
// answers the site with the paragraph less the keys they name, and no call is made. A Leg reopened whole changes its Move.
export function paragraphPlanSiteRepair(ctx, inputs, unitId) {
  const axes = (inputs && inputs.axes) || [];
  if (!ctx.site) {
    // THE LEG REFUSED WHOLE IS COMPOSED AGAIN FROM PARAGRAPH 1, AND ITS MOVE MAY CHANGE: the act is change_move
    // whatever each Finding's class, which stays the class of what failed.
    const findings = refusalFindings(ctx.refusal, { axes });
    const read = repairOf(findings);
    const repair = {
      ...read,
      arm: "change_move",
      grounds: `the Leg was refused whole, so it is composed again from paragraph 1 and may bind another Move; ${read.grounds}`,
    };
    writeRepair(inputs.runDir, unitId, { from: ctx.from, refusal: ctx.refusal, chosen_by: "program", ...repair });
    return { repair };
  }
  const n = ctx.site;
  const base = refusedBase(ctx);
  const read = refusalFindings(ctx.refusal, { paragraph: n, axes });
  const findings = [...read, ...shapeFindings(base, n).filter((f) => !read.some((r) => r.key === f.key))];
  const repair = repairOf(findings);
  writeRepair(inputs.runDir, unitId, { site: n, refusal: ctx.refusal, chosen_by: "program", ...repair });
  if (repair.arm === "keep_points" && isMap(base)) return { repair, answer: withoutShape(base, findings) };
  return { repair };
}

// The paragraph a retry repairs: the last one refused at the site, else the standing record's.
function refusedBase(ctx) {
  const h = (ctx.history || []).filter((x) => isMap(x.entry));
  if (h.length) return h[h.length - 1].entry;
  const entries = (ctx.standing && ctx.standing.paragraphs) || [];
  return entries[ctx.site - 1];
}

// THE SITE CALL'S INPUT. `ctx` is `{ standing, site, retry, history }`: the Leg's standing
// record, the paragraph's number, the site retry this is (1 for the first), and every
// refused paragraph at the site beside its refusal, oldest first.
export function paragraphPlanSiteInput(ctx, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const n = ctx.site;
  const entries = ctx.standing.paragraphs;
  const entry = isMap(entries[n - 1]) ? entries[n - 1] : {};
  const c = boundMoveContract(ctx.standing.move, inputs.movesDir);
  return {
    paragraph_you_must_plan: {
      leg_id: leg.leg_id,
      paragraph: n,
      paragraphs_in_leg: entries.length,
      text: leg.text,
      claims: leg.claims,
      prior_knowledge: leg.prior_knowledge || "",
      the_reader_has_been_told: leg.the_reader_has_been_told || [],
      ...siteMapping(inputs, unitId),
    },
    leaves_for_next_leg: leg.leaves_for_next_leg || [],
    bound_move: withAnalogy(
      {
        id: ctx.standing.move,
        takes: c.takes,
        leaves: c.leaves,
        segments: segmentsForPlanCall(c.segments),
        breaks: c.breaks,
      },
      inputs.analogy,
    ),
    paragraphs_beside: paragraphsBeside(entries, n),
    persona: inputs.persona,
    re_activations_this_paragraph_carries: entry["re-activate"] || [],
    refused_here: (ctx.history || []).map((h) => ({ entry: h.entry ?? null, refusal: h.refusal })),
    ...(ctx.repair ? siteRepairInput(ctx) : {}),
  };
}

// The Repair the call is made under, and the paragraph as it stands with the program's shape repair applied.
function siteRepairInput(ctx) {
  const { arm, waypoints, grounds, findings } = ctx.repair;
  return {
    repair: { arm, ...(waypoints ? { waypoints } : {}), grounds, findings },
    paragraph_as_it_stands: withoutShape(refusedBase(ctx), findings),
  };
}

// UNDER `modify_points` ONLY THE NAMED WAYPOINTS CHANGE (kogaki#1815): the numbers of the others the answer changed.
function unnamedChanged(answer, ctx, waypoints) {
  const was = (isMap(refusedBase(ctx)) && refusedBase(ctx).paragraph_waypoints) || [];
  const now = Array.isArray(answer.paragraph_waypoints) ? answer.paragraph_waypoints : [];
  const keep = new Set(waypoints);
  return was.map((p, i) => i + 1).filter((k) => !keep.has(k) && canonical(now[k - 1]) !== canonical(was[k - 1]));
}

// The Leg's structure and Mapping Table, once the unit is grounded (kogaki#1734).
function siteMapping(inputs, unitId) {
  const state = inputs.mapping ? readMappingState(inputs.runDir, unitId) : null;
  const s = state && state.structure;
  const t = state && state.table;
  return {
    ...(s ? { structure: { roles: s.roles, relations: s.relations, higher_order: s.higher_order } } : {}),
    ...(t ? { table: { base: t.base, correspondences: t.correspondences } } : {}),
  };
}

export function paragraphPlanSitePrompt(ctx, inputs, unitId) {
  const input = paragraphPlanSiteInput(ctx, inputs, unitId);
  if (inputs.runDir) appendSiteCallInput(inputs.runDir, unitId, siteCallInputRow(input, ctx));
  return `${inputs.siteHead}${JSON.stringify(input, null, 2)}`;
}

// THE SITE CALL'S ANSWER, READ BACK. Returns `{ error }`, a refusal at the site that spends its
// Round, or `{ record, changed, sites? }`: the standing record with the paragraph in place, the
// paragraphs to judge again, and later sites an unvalidated standing record still fails.
export function validateParagraphPlanSite(given, ctx, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const n = ctx.site;
  const at = `Leg ${leg.leg_id}, paragraph ${n}`;
  if (!isMap(given)) return { error: `${at}: the site answer is not one paragraph` };
  const chosen = chosenArm(given, ctx, inputs, unitId, at);
  if (chosen.error) return chosen;
  const answer = chosen.answer;
  const arm = chosen.arm;
  if (answer.paragraph !== n)
    return {
      error: `${at}: the site answer is numbered ${JSON.stringify(answer.paragraph)} — it is paragraph ${n} alone`,
    };
  // THE PROGRAM'S keep_points ANSWER KEEPS THE POINTS BY DESIGN; the judge reads it again.
  const kept = arm === "keep_points";
  if (!kept && (ctx.history || []).some((h) => repeatsRefusedEntry(answer, h.entry, h.by_judge)))
    return { error: `${at}: ${siteRepeatRefusal(n)}` };
  // EVERY FAILURE AT THE SITE (kogaki#1813): the site's own rules and the Leg call's over the paragraph.
  const failures = [];
  if (Object.hasOwn(answer, "move"))
    failures.push(
      `${at}: the answer carries \`move\` — the Leg's Move ${JSON.stringify(ctx.standing.move)} is held at every paragraph, and a paragraph names none (kogaki#1777)`,
    );
  const restated = kept ? null : restatedPoints(answer, ctx.history);
  if (restated) failures.push(`${at}: ${siteRestatementRefusal(n, restated)}`);
  // UNDER `modify_points` ONLY THE NAMED WAYPOINTS CHANGE (kogaki#1815).
  if (arm === "modify_points") {
    const changed = unnamedChanged(answer, ctx, ctx.repair.waypoints || []);
    if (changed.length)
      failures.push(
        `${at}: the answer changes Waypoint ${changed.join(", ")} — the Repair is modify_points and names Waypoint ${(ctx.repair.waypoints || []).join(", ")} alone, so every other point is kept as it stands`,
      );
  }
  const prose = repairProse(answer);
  if (prose)
    failures.push(
      `${at}: the answer's \`${prose.field}\` carries ${prose.said} — it describes the paragraph and its reader, and carries no word of the refusal, the attempt, the shape of the record or any rule by name`,
    );
  const entry = Object.fromEntries(Object.entries(answer).filter(([k]) => k !== "move"));
  const standing = ctx.standing.paragraphs;
  const merged = { ...ctx.standing, paragraphs: standing.map((e, i) => (i === n - 1 ? entry : e)) };
  const r = validateParagraphPlanUnit(merged, inputs, unitId);
  // A refusal naming only later paragraphs leaves the site taken and those paragraphs as sites.
  const here = r.failures ? r.failures.filter((f) => f.site <= n).map((f) => f.text) : r.error ? [r.error] : [];
  const later = r.failures ? r.failures.filter((f) => f.site > n) : [];
  const all = [...failures, ...here];
  if (all.length) return { error: all.join("\n") };
  if (!later.length) return { record: merged, changed: [n] };
  const why = later.map((f) => f.text).join("\n");
  return { record: merged, changed: [n], sites: [...new Set(later.map((f) => f.site))].map((m) => ({ site: m, why })) };
}

// THE ARM A SITE ANSWER NAMES FOR ITSELF (kogaki#1815): where the Repair took `modify_points` or `rewrite_all_points`,
// the answer may carry `arm`, one of those two, and the choice is written to the run before the answer is applied.
function chosenArm(given, ctx, inputs, unitId, at) {
  const governing = ctx.repair ? ctx.repair.arm : null;
  if (!Object.hasOwn(given, "arm")) return { answer: given, arm: governing };
  const { arm, ...answer } = given;
  if (!MODEL_ARMS.includes(governing) || (arm !== governing && MODEL_WIDENING[governing] !== arm)) {
    return {
      error: `${at}: the answer names the arm ${JSON.stringify(arm)} — an answer may name rewrite_all_points only where the Repair took modify_points, and this one took ${JSON.stringify(governing)}`,
    };
  }
  if (arm !== governing) {
    const rest = Object.fromEntries(Object.entries(ctx.repair).filter(([k]) => k !== "waypoints"));
    const grounds = `the answer chose ${arm} over ${governing}; the program's grounds were: ${ctx.repair.grounds}`;
    writeRepair(inputs.runDir, unitId, {
      site: ctx.site,
      refusal: ctx.refusal,
      chosen_by: "model",
      ...rest,
      arm,
      grounds,
    });
  }
  return { answer, arm };
}

// THE SUFFIX CALL'S INPUT: the Leg call's own input, with the paragraphs before `ctx.from` standing
// beside it; from paragraph 1, after a refusal of the binding, the whole Leg is planned again and its
// Move may change.
export function paragraphPlanSuffixInput(ctx, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const stand = ctx.from > 1 ? ctx.standing.paragraphs.slice(0, ctx.from - 1) : [];
  return {
    leg_you_must_plan: leg,
    paragraphs_at_most: boundOf(inputs),
    ...(ctx.from > 1 ? { move: ctx.standing.move, paragraphs_that_stand: stand } : {}),
    paragraph_moves_you_may_bind: bindableMoves(inputs.movesDir),
    persona: inputs.persona,
  };
}

// The Leg call's row over the suffix input, every refused suffix answer spliced in before the
// input marker by the Leg call's own retry block.
export function paragraphPlanSuffixPrompt(ctx, inputs, unitId) {
  const head = (ctx.history || []).length
    ? inputs.planHead.replace(
        new RegExp(`\\n${escapeRe(JUDGE_INPUT_MARKER)}\\n$`),
        `${judgeRefusalBlock(ctx.history)}\n\n${JUDGE_INPUT_MARKER}\n`,
      )
    : inputs.planHead;
  return `${head}${JSON.stringify(paragraphPlanSuffixInput(ctx, inputs, unitId), null, 2)}`;
}

// THE SUFFIX CALL'S ANSWER, READ BACK: a plan record whose `paragraphs` run from `ctx.from` on, joined
// to the paragraphs that stand and read by the Leg call's own validator. From paragraph 2 on it keeps
// the standing Move. `{ error }` refuses the answer and asks the suffix call again; `{ record, changed }` takes it.
export function validateParagraphPlanSuffix(answer, ctx, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const a = answer || {};
  const at = `Leg ${leg.leg_id}, paragraph ${ctx.from}`;
  const extra = undeclaredKey(a, UNIT_KEYS);
  if (extra) return { error: `${at}: the answer carries \`${extra}\`, which it does not declare` };
  if (a.leg_id !== leg.leg_id)
    return { error: `${at}: the answer names leg ${JSON.stringify(a.leg_id)}, not ${leg.leg_id}` };
  if (!Array.isArray(a.paragraphs)) return { error: `${at}: the answer carries no \`paragraphs\` list` };
  if (ctx.from > 1 && a.move !== ctx.standing.move) {
    return {
      error: `${at}: the answer binds ${JSON.stringify(a.move)} — the paragraphs before ${ctx.from} stand under ${JSON.stringify(ctx.standing.move)}, which the Leg keeps`,
    };
  }
  const stand = ctx.from > 1 ? ctx.standing.paragraphs.slice(0, ctx.from - 1) : [];
  const merged = {
    version: "1",
    leg_id: leg.leg_id,
    move: a.move,
    rationale: a.rationale ?? ctx.standing.rationale,
    paragraphs: [...stand, ...a.paragraphs],
  };
  const r = validateParagraphPlanUnit(merged, inputs, unitId);
  if (r.error) return { error: r.error };
  return { record: merged, changed: merged.paragraphs.map((e, i) => i + 1).filter((m) => m >= ctx.from) };
}
