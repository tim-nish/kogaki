// paragraph-plan/brief — the adopted Brief this stage reads and the Audience path it names. Cut from src/paragraph-plan.mjs along its headed
// sections (kogaki#1792); the design and its rulings are stated at the entry and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { briefLegs, briefStructureRefusal, parseBriefRecord, unfilledSlots } from "../compose.mjs";
import { settingValue } from "../workflow/judge.mjs";
import { REPO } from "../workflow/run-record.mjs";

// ---------------------------------------------------------------------------
// THE BRIEF THIS STAGE READS. An adopted Brief — no slot awaiting composition — whose Legs each
// carry their relation's `holds` as `text` and no Brief Waypoint (kogaki#1775, kogaki#1777).
// Returns `{ text, record, legs }` or `{ error }`.
export function readAdoptedBrief(briefPath) {
  let text;
  try { text = readFileSync(briefPath, "utf8"); }
  catch (e) { return { error: `the Brief at ${briefPath} cannot be read (${e.message})` }; }
  const parsed = parseBriefRecord(text, briefPath);
  if (parsed.error) return { error: parsed.error };
  const open = unfilledSlots(parsed.record);
  if (open.length) {
    return { error: `the Brief at ${briefPath} is not adopted: the field "${open[0]}" still awaits composition — `
      + "/paragraph-plan runs on an adopted Brief (kogaki#1375)" };
  }
  const legs = briefLegs(parsed.record);
  if (!legs.length) return { error: `the Brief at ${briefPath} carries no Reader Path legs — there is nothing to plan` };
  // THE LEG IS THE UNIT (kogaki#1777): a Leg is read by its `text` and never by a Brief Waypoint.
  for (const leg of legs) {
    const at = `the Brief at ${briefPath}, leg ${leg.leg_id}`;
    if (Array.isArray(leg.waypoints) && (leg.waypoints.length || typeof leg.text === "string")) {
      return { error: `${at} carries \`waypoints\` — /paragraph-plan takes the Leg as its unit and reads its \`text\`, never a `
        + "Brief Waypoint (kogaki#1777); compose the Brief again with /brief, whose Legs end at their relation's `holds` (kogaki#1775)" };
    }
    if (typeof leg.text !== "string" || leg.text.trim() === "") {
      return { error: `${at} carries no \`text\` — a Leg says its relation's \`holds\` in its \`text\`, which this stage plans (kogaki#1775, kogaki#1777)` };
    }
  }
  // `relation` BINDS ONLY WHERE THE BRIEF CARRIES A `structure` (kogaki#1768).
  const unbound = briefStructureRefusal(legs, parsed.record.structure, `the Brief at ${briefPath}`);
  if (unbound) return { error: unbound };
  return { text, record: parsed.record, legs };
}

// The Audience the Brief was composed for: the Brief's own `compose_path`, or the one
// `brief.audience_file` names for a Brief minted before that line existed — the read
// `packetPersonaPath` in src/draft.mjs makes. This stage reads its `persona`.
export function audiencePathOf(record) {
  const named = record && record.compose_path;
  if (typeof named === "string" && named !== "") return resolve(REPO, named);
  return resolve(REPO, String(settingValue({ setting: "brief.audience_file" })));
}
