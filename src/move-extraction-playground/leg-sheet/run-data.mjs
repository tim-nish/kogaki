// move-extraction-playground/leg-sheet/run-data — the run directory's data: the provenance rows, the run and
// its Legs. Cut from src/move-extraction-playground/leg-sheet.mjs along its headed
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
  return {
    runDir,
    run,
    stage,
    legText,
    paragraphs: legParagraphs(legText),
    extractorRun: ex.extractor_run || null,
    extractions: ex.extractions || [],
    extractCalls: readCalls(join(runDir, "extract", "calls.jsonl")),
    ingest: readJson(join(runDir, "ingest", "ingest.json")),
  };
}

// ONE LEG OF SEVERAL (kogaki#1532): the run's data narrowed to Leg `k` — its text, paragraphs,
// Extractions and ingest entries. `offset` is the count of the earlier Legs' paragraphs, which
// number the Extractor's `p<N>`.
export function legView(r, k) {
  const legs = r.run.legs;
  const offset = legs.slice(0, k).reduce((a, l) => a + l.paragraphs, 0);
  const n = legs[k].paragraphs;
  const legText = read(join(r.runDir, legs[k].copy)) || "";
  return {
    ...r,
    legText,
    legCopy: legs[k].copy,
    paragraphs: legParagraphs(legText),
    offset,
    extractions: r.extractions.slice(offset, offset + n),
    ingest: r.ingest ? { ...r.ingest, entries: (r.ingest.entries || []).slice(offset, offset + n) } : r.ingest,
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
