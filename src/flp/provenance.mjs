// A Move's Corpus passage, read from the extraction records on this machine and written nowhere (kogaki#1762).
// A Move file carries no source; the extractor's `extractions.json` names the passage, the leg copy it was read
// from and, as `written`, the Move files in paragraph order. This module reads those records and nothing else: it
// never reads a Move file, never writes, and answers `null` where no record names the Move.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Feedback-Loop Playground, Binding, Move
//       specs/spec-draft-pipeline/SPEC.md
//
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { REPO } from "../workflow/run-record.mjs";

export const RECORD_FILE = "extractions.json";
export const NO_RECORD = "no extraction record on this machine names this Move";
// The passage file the record's `passage` names, beside the batch's runs.
export const LEGS_DIR = join("batch", "legs");
// The heading under which a passage file holds the passage; a file with none is the passage in full.
export const PASSAGE_HEADING = "## Passage";

const cache = new Map();

// Every record under `corpusDir`: `extractions.json` under an `extract/<run>/` or an `extractor-run-*/` directory.
function recordPaths(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) recordPaths(p, out);
    else if (e.name === RECORD_FILE && (/^extractor-run-/.test(basename(dir)) || basename(dirname(dir)) === "extract")) out.push(p);
  }
  return out;
}

const moveIdOf = (written) => basename(String(written)).replace(/\.(yaml|yml|md)$/, "");

// The records one file holds, each as { passage, leg, written }. A multi-leg record (`legs`, each with its
// `paragraphs` count) is split along `written` in order, one record per leg.
function recordsIn(path) {
  let doc;
  try { doc = JSON.parse(readFileSync(path, "utf8")); } catch { return []; }
  const written = Array.isArray(doc && doc.written) ? doc.written : [];
  if (doc && typeof doc.passage === "string") return [{ passage: doc.passage, leg: doc.leg ?? null, written }];
  if (!doc || !Array.isArray(doc.legs)) return [];
  const out = [];
  let at = 0;
  for (const l of doc.legs) {
    if (!l || typeof l.passage !== "string") continue;
    const n = Number.isInteger(l.paragraphs) && l.paragraphs > 0 ? l.paragraphs : written.length - at;
    out.push({ passage: l.passage, leg: l.leg ?? null, written: written.slice(at, at + n) });
    at += n;
  }
  return out;
}

// EVERY MOVE AN EXTRACTION RECORD NAMES, by id: the passage, the leg copy's path, the record's path and the Move's
// 1-based paragraph index in the passage. Read once per corpus directory.
export function readExtractionRecords(corpusDir = resolve(REPO, "corpus")) {
  const key = resolve(corpusDir);
  if (cache.has(key)) return cache.get(key);
  const byMove = new Map();
  if (existsSync(key) && statSync(key).isDirectory()) {
    for (const path of recordPaths(key).sort()) {
      for (const rec of recordsIn(path)) {
        rec.written.forEach((w, i) => {
          const id = moveIdOf(w);
          if (!byMove.has(id)) byMove.set(id, []);
          byMove.get(id).push({ passage: rec.passage, leg: rec.leg, paragraph: i + 1, record: path });
        });
      }
    }
  }
  cache.set(key, byMove);
  return byMove;
}

// The passage's paragraphs — blank-line separated, under the passage heading where the file has one — each as
// its 1-based first and last line.
export function passageParagraphs(text) {
  const lines = String(text).split("\n");
  let from = lines.findIndex((l) => l.trim() === PASSAGE_HEADING);
  let to = lines.length;
  if (from >= 0) {
    const next = lines.findIndex((l, i) => i > from && /^##? /.test(l));
    if (next >= 0) to = next;
    from += 1;
  } else from = 0;
  const spans = [];
  let open = null;
  for (let i = from; i < to; i++) {
    if (lines[i].trim() === "") { if (open) { spans.push(open); open = null; } continue; }
    if (!open) open = { first: i + 1, last: i + 1 }; else open.last = i + 1;
  }
  if (open) spans.push(open);
  return spans;
}

// WHERE A MOVE'S PASSAGE IS: the passage file (`corpus/batch/legs/<passage>.md`, else the record's leg copy), the
// first line of the Move's paragraph and its span; `null` where no record names the Move. `file: null` where a
// record names it but neither file is on this machine.
export function movePassage(moveId, { corpusDir = resolve(REPO, "corpus") } = {}) {
  const hits = readExtractionRecords(corpusDir).get(String(moveId));
  if (!hits || !hits.length) return null;
  const hit = hits[0];
  const legsFile = join(resolve(corpusDir), LEGS_DIR, `${hit.passage}.md`);
  const file = existsSync(legsFile) ? legsFile : hit.leg && existsSync(hit.leg) ? hit.leg : null;
  if (!file) return { passage: hit.passage, paragraph: hit.paragraph, record: hit.record, file: null, line: null, span: null };
  const spans = passageParagraphs(readFileSync(file, "utf8"));
  const span = spans[hit.paragraph - 1] || null;
  return { passage: hit.passage, paragraph: hit.paragraph, record: hit.record, file, line: span ? span.first : null, span };
}
