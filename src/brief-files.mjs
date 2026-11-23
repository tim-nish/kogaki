// brief-files — the two verbs over an adopted Brief's three files (kogaki#1955), neither making a model call:
// `check` reads them through their one reader after a hand edit, and `split` turns a Brief of one file into the
// three, once. The reader and the writer are src/compose/brief-files.mjs.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here. This module names no spec content.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  briefAsOneList,
  briefFilePaths,
  briefFileTexts,
  parseBriefRecord,
  readBriefFiles,
  readBriefTexts,
} from "./compose.mjs";
import { readHolds } from "./compose/structure.mjs";
import { relFromRepo } from "./workflow/run-record.mjs";

const USAGE = "usage: node src/brief-files.mjs check|split --brief <theses/<slug>/brief.yaml>";
const oneLine = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();

// CHECK: the first refusal, or one line per Leg — its id, its relation's id and its sentence. Returns
// `{ lines }` or `{ error }`.
export function checkBrief(briefPath) {
  const r = readBriefFiles(briefPath);
  if (r.error) return { error: r.error };
  return { lines: r.record.reader_path.map((l) => `${l.leg_id}\t${l.relation}\t${oneLine(l.text)}`) };
}

// SPLIT: a Brief of one file into its three, each Leg's `text` dropped after it is found equal to what `readHolds`
// gives for its relation. Writes nothing on a refusal. Returns `{ written }` or `{ error }`.
export function splitBrief(briefPath) {
  const p = briefFilePaths(briefPath);
  const rel = relFromRepo(p.brief);
  for (const f of [p.structure, p.readerPath]) {
    if (existsSync(f)) return { error: `the Brief at ${rel} is already split: ${relFromRepo(f)} stands beside it` };
  }
  let text;
  try {
    text = readFileSync(p.brief, "utf8");
  } catch (e) {
    return { error: `the Brief at ${rel} cannot be read (${e.message})` };
  }
  const parsed = parseBriefRecord(text, rel);
  if (parsed.error) return { error: parsed.error };
  const record = parsed.record;
  if (!record.structure || !Array.isArray(record.reader_path)) {
    return { error: `the Brief at ${rel} carries no \`structure\` or no \`reader_path\` — there is nothing to split` };
  }
  const one = briefAsOneList(record).record;
  const holds = new Map((one.structure.relations || []).map((x) => [x && x.id, x && x.holds]));
  for (const [i, leg] of one.reader_path.entries()) {
    const id = (leg && leg.leg_id) || i + 1;
    if (!leg || !holds.has(leg.relation)) {
      return { error: `the Brief at ${rel}, leg ${id}: its \`relation\` names no relation of its \`structure\`` };
    }
    const want = readHolds(one.structure, holds.get(leg.relation));
    if (oneLine(leg.text) !== oneLine(want)) {
      return {
        error:
          `the Brief at ${rel}, leg ${id}: its \`text\` is not its relation ${leg.relation}'s \`holds\` — it reads ` +
          `${JSON.stringify(oneLine(leg.text))}, and the relation reads ${JSON.stringify(oneLine(want))}. Nothing was written`,
      };
    }
  }
  const texts = briefFileTexts(record);
  const read = readBriefTexts(texts, p.brief);
  if (read.error) return { error: `${read.error}. Nothing was written` };
  writeFileSync(p.brief, texts.brief);
  writeFileSync(p.structure, texts.structure);
  writeFileSync(p.readerPath, texts.readerPath);
  return { written: [p.brief, p.structure, p.readerPath].map((f) => relFromRepo(f)) };
}

function main(argv) {
  const cmd = argv[0];
  const i = argv.indexOf("--brief");
  const briefPath = i >= 0 ? argv[i + 1] : undefined;
  if (!["check", "split"].includes(cmd) || typeof briefPath !== "string" || briefPath === "") {
    process.stderr.write(`${USAGE}\n`);
    process.exit(2);
  }
  const r = cmd === "check" ? checkBrief(resolve(briefPath)) : splitBrief(resolve(briefPath));
  if (r.error) {
    process.stderr.write(`brief-files: ${r.error}\n`);
    process.exit(1);
  }
  process.stdout.write(`${(r.lines || r.written.map((f) => `wrote ${f}`)).join("\n")}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
