#!/usr/bin/env node
// The job report (kogaki#1718): a detached job's Call Records, per unit, one line per Call — the Brief's and the
// ParagraphPlan's jobs alike, since both write under `<job dir>/calls/<unit>/<n>/`.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Call Record
//       specs/spec-draft-pipeline/SPEC.md
//
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { callRows, callsRoot } from "./call-record.mjs";
import { relFromRepo } from "./run-record.mjs";

// The report's lines: a heading per unit, then each Call's number, group, reach, refusal, files and replays.
export function jobCallsReport(jobDir) {
  const rows = callRows(callsRoot(jobDir));
  if (!rows.length) return [`${relFromRepo(jobDir)}: no Call Record was written.`];
  const lines = [`Calls at ${relFromRepo(jobDir)}:`];
  let unit = null;
  for (const r of rows) {
    if (r.unit !== unit) {
      unit = r.unit;
      lines.push(`  unit ${unit}:`);
    }
    const judged = r.refusal === null ? "passed" : `${r.group ?? "-"}, ${r.reach ?? "-"}: ${r.refusal}`;
    lines.push(`    call ${r.n} — ${judged}`);
    lines.push(`      files: ${relFromRepo(r.dir)}/{${r.files.join(",")}}`);
    for (const x of r.replays)
      lines.push(`      replay ${x.mode}: ${x.verdict} — ${relFromRepo(join(x.dir, "result.json"))}`);
  }
  return lines;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2];
  if (!dir || process.argv.length > 3 || !existsSync(resolve(dir))) {
    console.error("usage: node src/workflow/job-report.mjs <job dir>");
    process.exit(2);
  }
  for (const line of jobCallsReport(resolve(dir))) console.log(line);
}
