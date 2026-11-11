// paragraph-plan/selection-input — the selection input record: the values each plan call and site call was handed. Cut from src/paragraph-plan.mjs along its headed
// sections (kogaki#1792); the design and its rulings are stated at the entry and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { writeJson } from "./stage.mjs";

// ---------------------------------------------------------------------------
// THE SELECTION INPUT RECORD (kogaki#1650, owner decision 2026-11-01): one file per Leg in the
// run directory, holding the values the plan call and each site call were handed, so a reader
// addresses them without reading a prompt. The prompt string is unchanged.
export const PARAGRAPH_PLAN_INPUT_PREFIX = "paragraph-plan-input-";
export const paragraphPlanInputPath = (dir, unitId) => join(dir, `${PARAGRAPH_PLAN_INPUT_PREFIX}${unitId}.json`);
const moveIdsOf = (moves) => moves.map((m) => m.id);

// The plan call's row: the Leg's text, Claims and what the reader has been told, the bound and the Moves.
export function planCallInputRow(input) {
  const leg = input.leg_you_must_plan;
  return {
    text: leg.text,
    claims: leg.claims,
    the_reader_has_been_told: leg.the_reader_has_been_told,
    paragraphs_at_most: input.paragraphs_at_most,
    terms_this_leg_introduces: input.terms_this_leg_introduces,
    paragraph_moves_you_may_bind: moveIdsOf(input.paragraph_moves_you_may_bind),
  };
}

export function siteCallInputRow(input, ctx) {
  const p = input.paragraph_you_must_plan;
  return {
    paragraph: p.paragraph,
    retry: ctx.retry,
    text: p.text,
    the_reader_has_been_told: p.the_reader_has_been_told,
    bound_move: input.bound_move.id,
    terms_this_paragraph_introduces: input.terms_this_paragraph_introduces,
    refused_here: input.refused_here,
  };
}

export function appendSiteCallInput(dir, unitId, row) {
  const path = paragraphPlanInputPath(dir, unitId);
  let doc;
  try {
    doc = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    doc = { unit: unitId, plan_call: null, site_calls: [] };
  }
  doc.site_calls = [...(doc.site_calls || []), row];
  writeJson(path, doc);
}
