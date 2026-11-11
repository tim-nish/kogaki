// workflow/judge/settings — the owner's settings file and the judge settings read from it. Cut from
// src/workflow/judge.mjs along its headed sections (kogaki#1800); the design and its rulings are
// stated at the entry and in the Issues each block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { REPO, fail } from "../run-record.mjs";

// THE OWNER'S SETTINGS FILE (kogaki#1307): `kogaki.settings.json` at the repository
// root, the one human-facing place for values changed during non-coding operation.
// A table row that would restate one of them names it instead, as `{"setting":
// "<dotted key>"}`, and `settingValue` resolves the row. A missing file or key is a
// refusal naming the key: a value a run needs is never defaulted.
// `KOGAKI_SETTINGS` points at another file FOR FIXTURES ONLY.
const SETTINGS_FILE = "kogaki.settings.json";
// A settings file still carrying a renamed key is refused naming both names, as a missing key is.
export const RENAMED_SETTINGS = { "brief.unit_attempts": "brief.unit_rounds", "paragraph_plan.leg_attempts": "paragraph_plan.leg_revisions" };

function settingsPath() {
  return process.env.KOGAKI_SETTINGS ? resolve(process.env.KOGAKI_SETTINGS) : join(REPO, SETTINGS_FILE);
}

function kogakiSetting(key) {
  const p = settingsPath();
  if (!existsSync(p)) fail(`the setting \`${key}\` is needed and ${p} does not exist — ${SETTINGS_FILE} carries the values an owner changes without coding (kogaki#1307).`);
  let doc;
  try { doc = JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { fail(`the setting \`${key}\` is needed and ${p} is not JSON (${e.message}).`); }
  for (const [old, now] of Object.entries(RENAMED_SETTINGS)) {
    const [group, name] = old.split(".");
    if (doc && doc[group] && typeof doc[group] === "object" && Object.prototype.hasOwnProperty.call(doc[group], name)) {
      fail(`${p} carries the setting \`${old}\`, renamed \`${now}\` (kogaki#1758) — rename it there; nothing reads the old name.`);
    }
  }
  let v = doc;
  for (const part of String(key).split(".")) {
    v = v && typeof v === "object" && !Array.isArray(v) && Object.prototype.hasOwnProperty.call(v, part) ? v[part] : undefined;
  }
  if (v === undefined || v === null || v === "") fail(`${p} carries no setting \`${key}\` — add it there; nothing defaults it (kogaki#1307).`);
  return v;
}

// A table value that names a setting is read from the settings file; any other value is the
// table's own literal.
export function settingValue(v) {
  return v && typeof v === "object" && !Array.isArray(v) && typeof v.setting === "string" ? kogakiSetting(v.setting) : v;
}

// EXPORTED FOR THE DETACHED JOB (kogaki#1193): `compose_path`'s own STATE_WORK
// resolves the same command/model/timeout the synchronous judge path reads,
// because the unit prompts it composes are handed to the SAME binary at the
// SAME pin -- there is no second judge configuration for a detached call.
export function judgeSettings(table, rec) {
  const j = (table && table.judge) || fail(
    "the workflow table declares no `judge` block, so a judgment state has no model to invoke. "
    + "field_semantics: the block names the command, THE PINNED MODEL and the output format, and the "
    + "model is never inherited from the session (kogaki#1030).");
  // THE RECORDED ABSOLUTE PATH, NEVER THE BARE WORD (kogaki#1076 item 2). The
  // table's `command` is what was RESOLVED; what is RUN is what the resolution
  // found and verified, so an advance fired from a session whose `PATH` differs
  // runs the run's own binary.
  const binary = (rec && rec.judge_binary) || null;
  return {
    command: binary ? String(binary.path) : fail(
      "this run's record carries no resolved judge binary, so a judgment call would spawn whatever the "
      + "firing session's PATH offers first -- which is the defect kogaki#1076 closed. The binary is "
      + "resolved and verified by the session that STARTS the run and written onto the run record; a "
      + "record carrying none is one this act never opened."),
    // THE PIN'S BINARY COMPONENT (kogaki#1076 item 3). What `--version` said,
    // taken from the executable the run actually resolved.
    binaryVersion: binary ? (binary.version || null) : null,
    model: String(settingValue(j.model) || fail("the workflow table's `judge` block pins no `model`")),
    outputFormat: String(j.output_format || "json"),
    // PER CALL, IN SECONDS IN THE TABLE AND MILLISECONDS HERE. Required rather
    // than defaulted: a bound that a table can silently omit is not a bound.
    timeoutMs: 1000 * (Number.isFinite(j.timeout_s) ? j.timeout_s : fail(
      "the workflow table's `judge` block declares no numeric `timeout_s`. A judgment call inside a "
      + "PostToolUse hook is bounded by that hook, and an unbounded child can exhaust the hook's own "
      + "timeout mid-span (kogaki#1030, PR #1044 round 1).")),
    // HOW MANY BOUNDED CALLS RUN AT ONCE (kogaki#1073; kogaki#1062). Concurrency keeps
    // a per-group state's wall time near the LONGEST call, not the sum.
    // REQUIRED AND POSITIVE, like `timeout_s`; a cap of 1 is the sequential behaviour.
    concurrency: Number.isInteger(j.concurrency) && j.concurrency > 0 ? j.concurrency : fail(
      "the workflow table's `judge` block declares no positive integer `concurrency`. It is the number "
      + "of judge calls a per-group judgment state runs at once; the per-call bound `timeout_s` and the "
      + "advance's own bound both hold unchanged, and this is what keeps their SUM from being what the "
      + "advance is measured against (kogaki#1073)."),
    // READ FROM THE RESOLUTION, not from this act's environment: the run's
    // binary was chosen once, and whether it was the fixture seam's is a fact
    // about that choice rather than about whoever is advancing the run now.
    stubbed: binary ? !!binary.stubbed : !!process.env.KOGAKI_JUDGE_CLI,
  };
}
