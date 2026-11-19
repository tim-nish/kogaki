// paragraph-plan/view — the view: per Leg each Segment with what is bound to it and its Edges (kogaki#1865,
// kogaki#1876). Cut from src/paragraph-plan.mjs along its headed sections (kogaki#1792).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseYaml } from "../yaml.mjs";
import { paragraphPlanPathFor, readParagraphPlanBeside } from "../compose.mjs";
import { REPO, relFromRepo } from "../workflow/run-record.mjs";
import { readReaderPathJob } from "../workflow/detached-job.mjs";
import { readAdoptedBrief } from "./brief.mjs";
import { legSentences } from "./senses.mjs";
import { START_FILE } from "./stage.mjs";
import { unitIdFor } from "./units.mjs";

// ---------------------------------------------------------------------------
// THE VIEW (kogaki#1650, kogaki#1876): per Leg, its text; per Segment, the Leg's sentence bound to it and its Edges;
// with a run, the refusals the Leg met. A rendering that writes nothing; the plan is read through /draft's own
// reader, so a moved Brief is refused alike.
export const escapeRe = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const oneLineText = (v) =>
  String(v)
    .replace(/\s*\n\s*/g, " ")
    .trim();
const cell = (v) => oneLineText(v ?? "").replace(/\|/g, "\\|");
const edgesText = (edges) =>
  (edges || []).map((e) => `${e.sense === null ? "(none)" : e.sense} to ${e.to.join(", ")}`).join("; ") || "(none)";

function viewRun(runDir, briefSha) {
  let start;
  try {
    start = JSON.parse(readFileSync(join(runDir, START_FILE), "utf8"));
  } catch (e) {
    return { error: `the run at ${relFromRepo(runDir)} has no start record a reader can read (${e.message})` };
  }
  if (start.brief_sha256 !== briefSha) {
    return {
      error:
        `the run at ${relFromRepo(runDir)} was made from a different Brief: its start record names sha256 ` +
        `${start.brief_sha256}, and the plan names sha256 ${briefSha}`,
    };
  }
  const job = readReaderPathJob(runDir);
  if (!job) return { error: `the run at ${relFromRepo(runDir)} has no job record` };
  return { start, job };
}

// The refusals of one Leg's unit, each with the paragraphs it names (none: the whole Leg) and the ids of `axisIds`
// it names. A refusal names its site as `Leg <id>, paragraph <n>` or opens with `paragraph <n>:`.
const REFUSAL_SITE = /(?:^|Leg [^,\s]+, )paragraph (\d+)/gi;
export function legRefusals(job, unitId, axisIds = []) {
  const u = (job.units || []).find((x) => x.id === unitId);
  return ((u && u.refusals) || [])
    .map((r) => String(r))
    .map((text) => ({
      text: oneLineText(text),
      paragraphs: [...new Set([...text.matchAll(REFUSAL_SITE)].map((m) => Number(m[1])))],
      axes: axisIds.filter((a) => new RegExp(`\\b${escapeRe(a)}\\b`).test(text)),
    }));
}

// The Leg's sentences, read from the Brief's `structure` at the Leg's relation; none where it carries none.
function sentencesOf(brief, leg) {
  const st = brief.record.structure;
  try {
    return st
      ? legSentences(
          { roles: st.roles || [], relations: st.relations || [], higher_order: st.higher_order || [] },
          leg.relation,
        )
      : [];
  } catch {
    return [];
  }
}

export function paragraphPlanView(planPath, { runDir = null } = {}) {
  let record;
  try {
    record = parseYaml(readFileSync(planPath, "utf8"), planPath);
  } catch (e) {
    return { error: `the ParagraphPlan file at ${planPath} cannot be read (${e.message})` };
  }
  const named = record && record.brief && record.brief.path;
  if (typeof named !== "string" || named === "")
    return { error: `the ParagraphPlan file at ${planPath} names no Brief` };
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
  const lines = [
    `# ParagraphPlan view: ${relFromRepo(resolve(planPath))}`,
    "",
    `Brief: \`${plan.record.brief.path}\` (sha256 \`${plan.record.brief.sha256}\`). ` +
      `Run: ${run ? `\`${relFromRepo(resolve(runDir))}\`` : "none given"}.`,
  ];
  for (const [li, leg] of brief.legs.entries()) {
    const entry = plan.record.legs[li];
    lines.push("", `## Leg ${leg.leg_id}`, "", `- **Text:** ${oneLineText(leg.text)}`);
    if (!entry.segments) lines.push("- **Segments:** none");
    else {
      const sentences = sentencesOf(brief, leg);
      lines.push("", "| Segment | Bound | Edges |", "|---|---|---|");
      for (const [k, g] of entry.segments.entries()) {
        const s = g.bind === null ? null : sentences[g.bind - 1];
        const bound = g.bind === null ? "Neither" : s ? `${g.bind}. ${s.sentence}` : `sentence ${g.bind}`;
        lines.push(`| ${k + 1} | ${cell(bound)} | ${cell(edgesText(g.edges))} |`);
      }
    }
    if (run) {
      const met = legRefusals(run.job, unitIdFor(li));
      lines.push("", `- **Refusals in this run:** ${met.length ? "" : "none"}`, ...met.map((r) => `  - ${r.text}`));
    }
  }
  return { lines };
}
