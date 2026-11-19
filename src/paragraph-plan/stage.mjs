// paragraph-plan/stage — the stage's own names: its tables, its run-directory files, its flow binding, its refusal and its JSON writer. Cut from src/paragraph-plan.mjs along its headed
// sections (kogaki#1792); the design and its rulings are stated at the entry and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "../workflow/run-record.mjs";

export const PARAGRAPH_PLAN_TABLE = join(REPO, "src", "paragraph-plan-workflow.json");
// The run directory's own files, beside the supervisor's. THE BINDINGS RECORD IS RETIRED
// (kogaki#1639): the plan file carries each paragraph's bound Move id and `rationale`, so the
// run directory holds no `paragraph-plan-bindings.json`.
export const START_FILE = "paragraph-plan-start.json";
// THE LEG JOB, held while the Analogy Mapping runs (kogaki#1778): the supervisor's options, started once it is resolved.
export const LEG_JOB_FILE = "paragraph-plan-leg-job.json";
export const DONE_FILE = "paragraph-plan-done.json";
// THE AWAIT'S OWN BOUND, the Brief's (kogaki#1271): `await` returns after at most this
// long with the status lines, and the skill runs it again.
export const PARAGRAPH_PLAN_AWAIT_S = 30;
export const PARAGRAPH_PLAN_STILL_RUNNING_LINE = "paragraph-plan job still running — call await again";

export const FLOW = { lane: "paragraph-plan", label: "ParagraphPlan" };

export function fail(msg) {
  process.stderr.write(`paragraph-plan: ${msg}\n`);
  process.exit(1);
}

export function writeJson(path, doc) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}\n`);
  renameSync(tmp, path);
}
