// compose/mapping-record — the Mapping Record beside the ParagraphPlan (kogaki#1733): one
// `structure.yaml` per Leg whose structure was read and one `table.yaml` per Leg's bound Move,
// under `theses/<slug>/mapping/<leg_id>/` (kogaki#1777), named by the plan by path and digest.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Mapping Record
//       specs/spec-draft-pipeline/SPEC.md
//
import { existsSync, readdirSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { stringifyYaml } from "../yaml.mjs";
import { relFromRepo } from "../workflow/run-record.mjs";

export const MAPPING_DIR = "mapping";
export const STRUCTURE_FILE = "structure.yaml";
export const TABLE_FILE = "table.yaml";
const MAPPING_KEYS = ["path", "sha256", "files"];
const FILE_KEYS = ["path", "sha256"];

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);

// The record's directory: beside the ParagraphPlan file, which sits beside the Brief.
export const mappingDirFor = (planPath) => join(dirname(resolve(planPath)), MAPPING_DIR);

// Every file under the record, `/`-separated and relative to it, in path order. An absent
// directory is the empty record: git keeps no empty directory, so a fresh clone holds none.
export function mappingRecordFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(relative(dir, p).split("\\").join("/"));
    }
  };
  walk(dir);
  return out.sort();
}

// The digest over the record's files in path order: one `<sha256>  <path>` line per file.
// The record of nothing has the digest of the empty text.
export function mappingRecordEntries(dir) {
  return mappingRecordFiles(dir).map((p) => ({ path: p, sha256: sha256(readFileSync(join(dir, p))) }));
}
export const mappingDigest = (files) => sha256(files.map((f) => `${f.sha256}  ${f.path}\n`).join(""));

// What the plan carries: `{ path, sha256, files }`, `files` holding each file's own hash so a
// changed record is refused naming the file.
export function mappingRecordOf(dir) {
  const files = mappingRecordEntries(dir);
  return { path: relFromRepo(dir), sha256: mappingDigest(files), files };
}

// WRITE THE RECORD (the stage's own output, replaced whole): `entries` holds one
// `{ leg_id, structure?, table? }` per Leg whose record was settled.
export function writeMappingRecord(dir, entries = []) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const e of entries) {
    const at = join(dir, String(e.leg_id));
    if (e.structure === undefined && e.table === undefined) continue;
    mkdirSync(at, { recursive: true });
    if (e.structure !== undefined) writeFileSync(join(at, STRUCTURE_FILE), stringifyYaml(e.structure, { width: 120 }));
    if (e.table !== undefined) writeFileSync(join(at, TABLE_FILE), stringifyYaml(e.table, { width: 120 }));
  }
  return mappingRecordOf(dir);
}

// THE SHAPE OF `mapping` ON THE PLAN, refused or null.
export function mappingShapeRefusal(m, rel) {
  if (!isMap(m)) return `the ParagraphPlan file ${rel} carries \`mapping\` that is not a \`{ path, sha256, files }\` map (kogaki#1733)`;
  const extra = Object.keys(m).find((k) => !MAPPING_KEYS.includes(k));
  if (extra) return `the ParagraphPlan file ${rel} carries \`mapping.${extra}\`, which a ParagraphPlan record does not declare`;
  if (typeof m.path !== "string" || typeof m.sha256 !== "string" || !Array.isArray(m.files)) {
    return `the ParagraphPlan file ${rel} carries \`mapping\` without its \`path\`, \`sha256\` and \`files\` (kogaki#1733)`;
  }
  for (const [i, f] of m.files.entries()) {
    if (!isMap(f) || typeof f.path !== "string" || typeof f.sha256 !== "string" || Object.keys(f).some((k) => !FILE_KEYS.includes(k))) {
      return `the ParagraphPlan file ${rel} carries \`mapping.files[${i}]\` that is not a \`{ path, sha256 }\` map`;
    }
  }
  if (mappingDigest(m.files) !== m.sha256) {
    return `the ParagraphPlan file ${rel} carries \`mapping.sha256\` ${m.sha256}, which is not the digest of its own \`mapping.files\` (kogaki#1733)`;
  }
  return null;
}

// THE READ /draft MAKES (kogaki#1733): the record on disk against the one the plan names.
// Returns `{ sha256 }`, or `{ error }` naming the file that differs.
export function mappingRecordRefusal(m, planPath, rel) {
  const dir = mappingDirFor(planPath);
  const where = relFromRepo(dir);
  if (m.path !== where) {
    return { error: `the ParagraphPlan file ${rel} names its Mapping Record at ${m.path}, and the record beside it is ${where} (kogaki#1733)` };
  }
  const named = new Map(m.files.map((f) => [f.path, f.sha256]));
  const onDisk = mappingRecordEntries(dir);
  const seen = new Set(onDisk.map((f) => f.path));
  const rerun = "run /paragraph-plan on this Brief again, which writes the record and the plan together";
  for (const f of onDisk) {
    if (!named.has(f.path)) return { error: `the Mapping Record file ${where}/${f.path} is not one the ParagraphPlan file ${rel} names — ${rerun} (kogaki#1733)` };
    if (named.get(f.path) !== f.sha256) {
      return { error: `the Mapping Record file ${where}/${f.path} has changed since the ParagraphPlan file ${rel} named it: recorded `
        + `sha256 ${named.get(f.path).slice(0, 12)}, now ${f.sha256.slice(0, 12)} — ${rerun} (kogaki#1733)` };
    }
  }
  const missing = m.files.find((f) => !seen.has(f.path));
  if (missing) return { error: `the Mapping Record file ${where}/${missing.path}, which the ParagraphPlan file ${rel} names, is gone — ${rerun} (kogaki#1733)` };
  return { sha256: m.sha256 };
}
