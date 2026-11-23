// paragraph-plan/brief — the adopted Brief this stage reads and the Audience path it names. Cut from src/paragraph-plan.mjs along its headed
// sections (kogaki#1792); the design and its rulings are stated at the entry and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { resolve } from "node:path";
import { briefLegs, readBriefFiles, unfilledSlots, undeclaredLegKeyRefusal } from "../compose.mjs";
import { settingValue } from "../workflow/judge.mjs";
import { REPO } from "../workflow/run-record.mjs";

// ---------------------------------------------------------------------------
// THE BRIEF THIS STAGE READS. An adopted Brief — no slot awaiting composition — read from its three files, each Leg
// given its relation's `holds` as `text` (kogaki#1775, kogaki#1955).
// Returns `{ text, record, legs, renamed }` or `{ error }`, `renamed` the ids `briefAsOneList` renamed.
export function readAdoptedBrief(briefPath) {
  const parsed = readBriefFiles(briefPath);
  if (parsed.error) return { error: parsed.error };
  const { text, renamed } = parsed;
  const open = unfilledSlots(parsed.record);
  if (open.length) {
    return {
      error:
        `the Brief at ${briefPath} is not adopted: the field "${open[0]}" still awaits composition — ` +
        "/paragraph-plan runs on an adopted Brief (kogaki#1375)",
    };
  }
  const legs = briefLegs(parsed.record);
  if (!legs.length)
    return { error: `the Brief at ${briefPath} carries no Reader Path legs — there is nothing to plan` };
  // A KEY THE LEG SCHEMA DOES NOT DECLARE IS REFUSED NAMING IT (kogaki#1885).
  for (const [i, raw] of (parsed.record.reader_path || []).entries()) {
    const bad = undeclaredLegKeyRefusal(raw, `the Brief at ${briefPath}, leg ${raw?.leg_id ?? i + 1}`);
    if (bad) return { error: bad };
  }
  return { text, record: parsed.record, legs, renamed };
}

// The Audience the Brief was composed for: the Brief's own `compose_path`, or the one
// `brief.audience_file` names for a Brief minted before that line existed — the read
// `packetPersonaPath` in src/draft.mjs makes. This stage reads its `persona`.
export function audiencePathOf(record) {
  const named = record && record.compose_path;
  if (typeof named === "string" && named !== "") return resolve(REPO, named);
  return resolve(REPO, String(settingValue({ setting: "brief.audience_file" })));
}
