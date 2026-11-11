// paragraph-plan/view — the view: per Leg its text, its bound Move's takes and leaves, and its paragraphs' Waypoints beside their Segments. Cut from src/paragraph-plan.mjs along its headed
// sections (kogaki#1792); the design and its rulings are stated at the entry and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseYaml } from "../yaml.mjs";
import { loadMoveContracts, paragraphPlanPathFor, readParagraphPlanBeside } from "../compose.mjs";
import { REPO, relFromRepo } from "../workflow/run-record.mjs";
import { readReaderPathJob } from "../workflow/detached-job.mjs";
import { readAxes } from "./axes.mjs";
import { readAdoptedBrief } from "./brief.mjs";
import { escapeRe } from "./site-retry.mjs";
import { START_FILE } from "./stage.mjs";
import { unitIdFor } from "./units.mjs";

// ---------------------------------------------------------------------------
// THE VIEW (kogaki#1650): per Leg, its text and the bound Move's takes and leaves; per paragraph, the
// Move's Segments with each Waypoint beside its Segment (kogaki#1701); with a run, the refusals the Leg
// and each paragraph met and the axes they name. A rendering that writes nothing; the plan is read
// through /draft's own reader, so a moved Brief is refused alike.
const constraintsText = (list) => (Array.isArray(list) && list.length
  ? list.map((x) => `${x.kind}: ${oneLineText(x.what)}`).join("; ") : "(none)");
const oneLineText = (v) => String(v).replace(/\s*\n\s*/g, " ").trim();
const cell = (v) => oneLineText(v ?? "").replace(/\|/g, "\\|");
const paragraphWaypointText = (p) => (!p ? "" : Object.hasOwn(p, "performs") ? `performs: ${p.performs}`
  : `${p.point} (serves ${(p.serves || []).join(", ")})`);

function viewRun(runDir, briefSha) {
  let start;
  try { start = JSON.parse(readFileSync(join(runDir, START_FILE), "utf8")); }
  catch (e) { return { error: `the run at ${relFromRepo(runDir)} has no start record a reader can read (${e.message})` }; }
  if (start.brief_sha256 !== briefSha) {
    return { error: `the run at ${relFromRepo(runDir)} was made from a different Brief: its start record names sha256 `
      + `${start.brief_sha256}, and the plan names sha256 ${briefSha}` };
  }
  const job = readReaderPathJob(runDir);
  if (!job) return { error: `the run at ${relFromRepo(runDir)} has no job record` };
  return { start, job };
}

// The refusals of one Leg's unit, each with the paragraphs it names (none: the whole Leg) and the
// judge axes it names. A refusal names its site as `Leg <id>, paragraph <n>` or opens with
// `paragraph <n>:`.
const REFUSAL_SITE = /(?:^|Leg [^,\s]+, )paragraph (\d+)/gi;
export function legRefusals(job, unitId, axisIds) {
  const u = (job.units || []).find((x) => x.id === unitId);
  return ((u && u.refusals) || []).map((r) => String(r)).map((text) => ({ text: oneLineText(text),
    paragraphs: [...new Set([...text.matchAll(REFUSAL_SITE)].map((m) => Number(m[1])))],
    axes: axisIds.filter((a) => new RegExp(`\\b${escapeRe(a)}\\b`).test(text)) }));
}
const refusalLine = (r) => `  - ${r.text} — axes: ${r.axes.length ? r.axes.join(", ") : "none named"}`;

export function paragraphPlanView(planPath, { runDir = null, movesDir = null } = {}) {
  let record;
  try { record = parseYaml(readFileSync(planPath, "utf8"), planPath); }
  catch (e) { return { error: `the ParagraphPlan file at ${planPath} cannot be read (${e.message})` }; }
  const named = record && record.brief && record.brief.path;
  if (typeof named !== "string" || named === "") return { error: `the ParagraphPlan file at ${planPath} names no Brief` };
  const briefPath = resolve(REPO, named);
  if (paragraphPlanPathFor(briefPath) !== resolve(planPath)) {
    return { error: `the ParagraphPlan file at ${planPath} is not beside the Brief it names (${named})` };
  }
  const brief = readAdoptedBrief(briefPath);
  if (brief.error) return { error: brief.error };
  const plan = readParagraphPlanBeside(briefPath, brief.text, brief.legs);
  if (plan.error) return { error: plan.error };
  const run = runDir ? viewRun(runDir, plan.record.brief.sha256) : null;
  if (run && run.error) return { error: run.error };
  const dirOfMoves = movesDir || (run && run.start.moves_dir) || "moves";
  const library = loadMoveContracts(dirOfMoves);
  if (library.error) return { error: library.error };
  const moves = new Map(library.moves.map((m) => [m.id, m]));
  const axisIds = (readAxes().axes || []).map((a) => a.id);
  const lines = [`# ParagraphPlan view: ${relFromRepo(resolve(planPath))}`, "",
    `Brief: \`${plan.record.brief.path}\` (sha256 \`${plan.record.brief.sha256}\`). Move library: \`${dirOfMoves}\`. `
    + `Run: ${run ? `\`${relFromRepo(resolve(runDir))}\`` : "none given"}.`];
  for (const [li, leg] of brief.legs.entries()) {
    const entry = plan.record.legs[li];
    const move = moves.get(entry.move);
    const segments = (move && move.segments) || [];
    const refusals = run ? legRefusals(run.job, unitIdFor(li), axisIds) : [];
    lines.push("", `## Leg ${leg.leg_id}`, "", `- **Text:** ${oneLineText(leg.text)}`,
      `- **Move:** \`${entry.move}\`${move ? "" : ` — not in the Move library at ${dirOfMoves}`}`,
      `- **Move takes:** ${move ? constraintsText(move.takes) : "(not read)"}`,
      `- **Move leaves:** ${move ? constraintsText(move.leaves) : "(not read)"}`);
    const legWide = refusals.filter((r) => !r.paragraphs.length);
    if (legWide.length) lines.push("", "Refusals in this run naming no paragraph:", ...legWide.map(refusalLine));
    for (const [i, e] of entry.paragraphs.entries()) {
      const pws = e.paragraph_waypoints || [];
      lines.push("", `### Paragraph ${i + 1}`, "", "| Segment | Operation | Relation | Manner | Waypoint |", "|---|---|---|---|---|");
      for (let k = 0; k < Math.max(segments.length, pws.length); k++) {
        const g = segments[k] || {};
        lines.push(`| ${k < segments.length ? k + 1 : "—"} | ${cell(g.operation)} | ${cell(g.relation)} | ${cell(g.manner)} | ${cell(paragraphWaypointText(pws[k]))} |`);
      }
      if (run) {
        const met = refusals.filter((r) => r.paragraphs.includes(i + 1));
        lines.push("", `- **Refusals in this run:** ${met.length ? "" : "none"}`, ...met.map(refusalLine));
      }
    }
  }
  return { lines };
}
