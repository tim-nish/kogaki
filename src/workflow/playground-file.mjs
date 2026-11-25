// The BriefPlanPlayground's page, written by a command that has just written a Brief's file (kogaki#1967).
// The page's own command runs as a separate process, so nothing here imports from src/brief-plan-playground/
// (kogaki#1776).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here. This module names no spec content.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SHEET = fileURLToPath(new URL("../brief-plan-playground/sheet.mjs", import.meta.url));

// `{ line }` naming the page's URL, or `{ warning }` naming why the page was not written.
export function briefPlanPlaygroundLine(briefPath) {
  const r = spawnSync(process.execPath, [SHEET, "show", "--brief", briefPath], { encoding: "utf8" });
  if (r.status === 0 && r.stdout.trim() !== "") return { line: `BriefPlanPlayground: ${r.stdout.trim()}` };
  const why = (r.stderr || "").trim() || (r.error ? r.error.message : `exit ${r.status}`);
  return { warning: `BriefPlanPlayground not written: ${why}` };
}

// Prints the line on standard output, or the warning on the error stream; the caller's exit is unchanged.
export function printBriefPlanPlayground(briefPath) {
  const r = briefPlanPlaygroundLine(briefPath);
  if (r.line) process.stdout.write(`${r.line}\n`);
  else process.stderr.write(`${r.warning}\n`);
}
