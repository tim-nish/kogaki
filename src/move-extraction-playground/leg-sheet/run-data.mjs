// move-extraction-playground/leg-sheet/run-data — the run directory's data: the provenance rows, the run, its
// Legs, its plan and its written Legs. Cut from src/move-extraction-playground/leg-sheet.mjs along its headed
// sections (kogaki#1800); the design and its rulings are stated at the entry's header and in the
// Issues each block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { join } from "node:path";
import { createHash } from "node:crypto";
import { parseYaml } from "../../yaml.mjs";
import { JUDGE_INPUT_MARKER } from "../../workflow/judge.mjs";
import { roundsFileIn } from "../../workflow/call-record.mjs";
import { legParagraphs, extractionMarkdown } from "../extract.mjs";
import { read, readCalls, readJson } from "./frame.mjs";

export const PROVENANCE_SECTION = "## Cells of the Leg card";
// The provenance map's row for each card, by the name the map's first column carries. These
// are the gate's keys, one distinct row per card, and are never displayed (kogaki#1400).
export const SHEET_CELLS = {
  extraction: "Extraction",
  move: "Move",
  brief: "Brief",
  paragraphPlan: "ParagraphPlan",
  packet: "Packet",
  draft: "Draft",
  runRecord: "Run record",
};

export function contentHash(text) {
  return text === null || text === undefined
    ? "none"
    : createHash("sha256").update(String(text)).digest("hex").slice(0, 12);
}

// The map's Leg card table: cell name -> the row, as written.
export function provenanceRows(mapText) {
  const lines = String(mapText).split("\n");
  const at = lines.findIndex((l) => l.startsWith(PROVENANCE_SECTION));
  const rows = new Map();
  if (at < 0) return rows;
  for (const l of lines.slice(at + 1)) {
    if (l.startsWith("## ")) break;
    if (!l.startsWith("|") || /^\|[\s|:-]+\|$/.test(l.trim())) continue;
    const cols = l
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cols[0] && cols[0] !== "cell") rows.set(cols[0].replace(/\*/g, ""), l.trim());
  }
  return rows;
}

// THE CARD'S DATA, read from one run directory and nothing else.
export function readRun(runDir) {
  const run = readJson(join(runDir, "run.json")) || { stages: [] };
  const stage = (n) => run.stages.find((s) => s.stage === n) || { stage: n, state: "not run" };
  const legText = read(join(runDir, "leg.md")) || "";
  const ex = stage("extract");
  const brief = stage("brief");
  const draft = stage("draft");
  const briefPath = join(runDir, "brief", "brief.yaml");
  const briefText = read(briefPath);
  let briefRecord = null;
  try {
    briefRecord = briefText ? parseYaml(briefText, briefPath) : null;
  } catch {
    briefRecord = null;
  }
  const ingest = readJson(join(runDir, "ingest", "ingest.json"));
  const jobDir = join(runDir, "paragraph-plan", "job");
  const ws = draft.workspace || join(runDir, "draft", run.passage || "");
  const legIds = ((briefRecord && briefRecord.reader_path) || []).map((l) => l && l.leg_id).filter(Boolean);
  const legId = legIds[0] || null;
  return {
    runDir,
    run,
    stage,
    legText,
    paragraphs: legParagraphs(legText),
    extractorRun: ex.extractor_run || null,
    extractions: ex.extractions || [],
    extractCalls: readCalls(join(runDir, "extract", "calls.jsonl")),
    ingest,
    briefPath,
    briefText,
    briefRecord,
    legBriefRun: brief.leg_brief_run || null,
    briefCalls: readCalls(join(runDir, "brief", "calls.jsonl")),
    jobDir,
    planCalls: readCalls(join(runDir, "paragraph-plan", "calls.jsonl")),
    planPath: join(runDir, "brief", "paragraph-plan.yaml"),
    ws,
    legId,
    legIds,
    draftCalls: legIds.flatMap((id) => readCalls(join(runDir, "draft", `calls-${id}.jsonl`))),
  };
}

// ONE LEG OF SEVERAL (kogaki#1532): the run's data narrowed to Leg `k` — its text, paragraphs,
// Extractions and ingest entries, its leg id from the Brief, its plan calls and its Writer calls.
// `offset` is the count of the earlier Legs' paragraphs, which number the Extractor's `p<N>`.
export function legView(r, k) {
  const legs = r.run.legs;
  const offset = legs.slice(0, k).reduce((a, l) => a + l.paragraphs, 0);
  const n = legs[k].paragraphs;
  const legText = read(join(r.runDir, legs[k].copy)) || "";
  const legIds = r.legIds.slice(offset, offset + n);
  const ids = new Set(legIds);
  return {
    ...r,
    legText,
    legCopy: legs[k].copy,
    paragraphs: legParagraphs(legText),
    offset,
    legId: legIds[0] || null,
    legIds,
    extractions: r.extractions.slice(offset, offset + n),
    ingest: r.ingest ? { ...r.ingest, entries: (r.ingest.entries || []).slice(offset, offset + n) } : r.ingest,
    planCalls: r.planCalls.filter((c) => ids.has(planLegId(String(c.stdin)))),
    draftCalls: legIds.flatMap((id) => readCalls(join(r.runDir, "draft", `calls-${id}.jsonl`))),
  };
}

// The plan file's text and this view's entries in it, one per original paragraph (kogaki#1784):
// entry k is the plan's Leg `legIds[k-1]`, its bound Move, `rationale` and Waypoints across its
// paragraphs, and its paragraphs' `rationale`. `pl` is null where the file is unreadable.
export function planLeg(r) {
  const planText = read(r.planPath);
  let plan = null;
  if (planText) {
    try {
      plan = parseYaml(planText, r.planPath);
    } catch {
      plan = null;
    }
  }
  if (!plan || !Array.isArray(plan.legs)) return { planText, pl: null };
  const waypoints = (r.legIds || [])
    .map((id, i) => {
      const l = plan.legs.find((x) => x && x.leg_id === id);
      return l
        ? {
            waypoint: i + 1,
            leg_id: id,
            move: l.move,
            rationale: (l.paragraphs || [])
              .map((p) => p && p.rationale)
              .filter((x) => typeof x === "string")
              .join(" "),
            paragraph_waypoints: (l.paragraphs || []).flatMap((p) => (p && p.paragraph_waypoints) || []),
          }
        : null;
    })
    .filter(Boolean);
  return { planText, pl: { waypoints } };
}

// THE BINDINGS ARE READ FROM THE PLAN FILE (kogaki#1639): each Leg entry carries the bound Move's
// id and its paragraphs carry their `rationale`, so the run directory keeps no bindings record. One row per Leg of this
// view, `{ leg_id, waypoint, move, rationale }`, `waypoint` its original paragraph's number.
export function planBindings(r) {
  const { pl } = planLeg(r);
  return pl
    ? pl.waypoints.map((w) => ({ leg_id: w.leg_id, waypoint: w.waypoint, move: w.move, rationale: w.rationale }))
    : [];
}

// EACH LEG'S PACKET AND SECTION (kogaki#1784), one per original paragraph, in order.
export const packetPathOf = (r, id) => join(r.ws, "packets", `${id}.md`);
export function writtenLegs(r) {
  const sectionPaths = (r.legIds || []).map((id) => join(r.ws, "sections", `${id}.md`));
  const texts = sectionPaths.map((p) => read(p));
  const writtenParas = texts.map((t) => (t === null ? "" : t.trim()));
  const written = texts.every((t) => t === null) ? null : writtenParas.join("\n\n");
  return {
    sectionPath: r.legIds && r.legIds.length ? join(r.ws, "sections") : null,
    sectionPaths,
    written,
    writtenParas,
  };
}
export function extractionParagraphs(r) {
  const n = r.paragraphs.length;
  const per = [];
  for (let i = 0; i < n; i++) {
    const name = r.extractions[i];
    const file = name ? join(r.runDir, "extract", name) : null;
    const text = file ? read(file) : null;
    const pdir = r.extractorRun ? join(r.extractorRun, `p${(r.offset || 0) + i + 1}`) : null;
    const promptText = pdir ? read(join(pdir, "prompt.md")) : null;
    const answer = pdir ? readJson(join(pdir, "answer.json")) : null;
    const rounds = pdir ? readJson(roundsFileIn(pdir)) : null;
    const inputAt = promptText ? promptText.indexOf(JUDGE_INPUT_MARKER) : -1;
    const key = inputAt >= 0 ? promptText.slice(inputAt) : null;
    const calls = key ? r.extractCalls.filter((c) => String(c.stdin).includes(key)) : [];
    // THE RECORD, RENDERED (kogaki#1413): the Extraction file is a YAML record, shown here as
    // the Markdown `extractionMarkdown` renders, folded after the Segments table (kogaki#1479).
    // The Segments come off the record file, which is what the Moves were ingested from and
    // what the owner edits (kogaki#1512); the Extractor's answer stands in where it is unreadable.
    let rendered = null;
    let rec = null;
    if (text) {
      try {
        rec = parseYaml(text, file);
        rendered = extractionMarkdown(rec);
      } catch {
        rendered = null;
      }
    }
    const segs =
      rec && Array.isArray(rec.segments)
        ? rec.segments
        : answer && Array.isArray(answer.segments)
          ? answer.segments
          : [];
    per.push({ i, file, text, rendered, promptText, calls, rounds, segs, rec });
  }
  return per;
}

// The owner's edits the run record names for paragraph `n`: Segment number -> edited fields.
export function editedSegments(r, n) {
  const m = new Map();
  for (const e of (r.run.reuse && r.run.reuse.edits) || []) {
    if (e.paragraph === n + (r.offset || 0)) m.set(e.segment, [...(m.get(e.segment) || []), e.field]);
  }
  return m;
}

// A planning call's kind, read off its prompt (kogaki#1642, kogaki#1784): a Leg call, or a site
// retry asking one paragraph of a Leg, each naming its Leg's id. `null` for any other call.
const PLAN_KEYS = ["leg_you_must_plan", "paragraph_you_must_plan", "leg_you_must_judge"];
export function planLegId(text) {
  for (const key of PLAN_KEYS) {
    const at = text.lastIndexOf(`"${key}": {`);
    if (at >= 0) return (text.slice(at).match(/"leg_id": "([^"]*)"/) || [])[1] || null;
  }
  return null;
}
