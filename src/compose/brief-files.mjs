// compose/brief-files — an adopted Brief as its three files (kogaki#1955): `brief.yaml`, and beside it
// `structure.yaml`, its RelationalStructure, and `reader-path.yaml`, its Legs, the two an owner may edit by hand.
// The one reader of the three, the one writer, and the one hash every record of a Brief names.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here. This module names no spec content.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { parseYaml, stringifyYaml } from "../yaml.mjs";
import { relFromRepo } from "../workflow/run-record.mjs";
import { briefAsOneList, briefRecordRefusal, briefRecordText } from "./record.mjs";
import { readHolds } from "./structure.mjs";

export const BRIEF_STRUCTURE_FILE = "structure.yaml";
export const BRIEF_READER_PATH_FILE = "reader-path.yaml";
const SPLIT_KEYS = ["structure", "reader_path"];
const WIDTH = 120;
const STRUCTURE_HEADER =
  "The Brief's RelationalStructure: its Roles, its relations, and the relation `attains_thesis` names. " +
  "Edited by hand; a Leg's sentence is the `holds` of the relation it names.";
const READER_PATH_HEADER =
  "The Brief's Reader Path: the Legs in order, each naming one relation of structure.yaml. " +
  "Edited by hand; a Leg carries no sentence of its own.";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";

// The three paths, `brief.yaml` the one every command is handed.
export function briefFilePaths(briefPath) {
  const dir = dirname(resolve(briefPath));
  return {
    brief: resolve(briefPath),
    structure: join(dir, BRIEF_STRUCTURE_FILE),
    readerPath: join(dir, BRIEF_READER_PATH_FILE),
  };
}

// THE ONE HASH (kogaki#1955): sha256 over the texts of brief.yaml, structure.yaml and reader-path.yaml, in that order.
export const briefFilesText = (texts) => texts.brief + texts.structure + texts.readerPath;
export const briefFilesSha = (texts) => createHash("sha256").update(briefFilesText(texts)).digest("hex");

// A record of one Brief as the three texts its files hold, no Leg carrying `text`.
export function briefFileTexts(record) {
  const rest = Object.fromEntries(Object.entries(record).filter(([k]) => !SPLIT_KEYS.includes(k)));
  const legs = (Array.isArray(record.reader_path) ? record.reader_path : []).map((l) =>
    isMap(l) ? Object.fromEntries(Object.entries(l).filter(([k]) => k !== "text")) : l,
  );
  return {
    brief: briefRecordText(rest),
    structure: stringifyYaml(record.structure ?? null, { width: WIDTH, header: STRUCTURE_HEADER }),
    readerPath: stringifyYaml({ reader_path: legs }, { width: WIDTH, header: READER_PATH_HEADER }),
  };
}

export function writeBriefFiles(briefPath, record) {
  const texts = briefFileTexts(record);
  const p = briefFilePaths(briefPath);
  writeFileSync(p.brief, texts.brief);
  writeFileSync(p.structure, texts.structure);
  writeFileSync(p.readerPath, texts.readerPath);
  return texts;
}

const dupe = (list) => {
  const seen = new Set();
  for (const x of list) {
    if (isMap(x) && seen.has(x.id ?? x.leg_id)) return x.id ?? x.leg_id;
    if (isMap(x)) seen.add(x.id ?? x.leg_id);
  }
  return null;
};

// THE REFUSALS A HAND EDIT OF structure.yaml MEETS (kogaki#1955): an id that names nothing, and nothing else.
// `structure` is read as one list. Returns an error string or null.
export function structureFileRefusal(structure, at) {
  if (!isMap(structure)) return `${at} is not a map of \`roles\` and \`relations\``;
  const roles = Array.isArray(structure.roles) ? structure.roles : [];
  const relations = Array.isArray(structure.relations) ? structure.relations : [];
  const d = dupe(roles) ?? dupe(relations);
  if (d !== null) return `${at}: two elements share the id ${JSON.stringify(d)}`;
  const roleIds = new Set(roles.map((r) => r && r.id));
  const relationIds = new Set(relations.map((r) => r && r.id));
  for (const r of roles) {
    if (!isMap(r) || !isText(r.name)) return `${at}: the Role ${JSON.stringify(r && r.id)} carries no \`name\``;
  }
  for (const r of relations) {
    const id = JSON.stringify(r && r.id);
    if (!isMap(r) || !isText(r.holds)) return `${at}: the relation ${id} carries no \`holds\``;
    const between = Object.hasOwn(r, "between");
    if (between === Object.hasOwn(r, "relates")) {
      return `${at}: the relation ${id} carries ${between ? "both `between` and `relates`" : "neither `between` nor `relates`"} — it carries one`;
    }
    for (const e of (between ? r.between : r.relates) || []) {
      if (between && !roleIds.has(e))
        return `${at}: the relation ${id}'s \`between\` names ${JSON.stringify(e)}, which is no Role's id`;
      if (!between && (!relationIds.has(e) || e === r.id)) {
        return `${at}: the relation ${id}'s \`relates\` names ${JSON.stringify(e)}, which is ${e === r.id ? "the relation itself" : "no relation's id"}`;
      }
    }
    const stray = [...r.holds.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).find((n) => !roleIds.has(n));
    if (stray !== undefined) return `${at}: the relation ${id}'s \`holds\` carries {${stray}}, which names no Role`;
  }
  if (!relationIds.has(structure.attains_thesis)) {
    return `${at}: \`attains_thesis\` ${JSON.stringify(structure.attains_thesis)} names no relation`;
  }
  return null;
}

// THE REFUSALS A HAND EDIT OF reader-path.yaml MEETS (kogaki#1955). Returns an error string or null.
export function readerPathFileRefusal(legs, structure, at, structureAt) {
  if (!Array.isArray(legs)) return `${at} carries no \`reader_path\` list`;
  const d = dupe(legs);
  if (d !== null) return `${at}: two Legs share the id ${JSON.stringify(d)}`;
  const ids = new Set(structure.relations.map((r) => r && r.id));
  for (const [i, l] of legs.entries()) {
    const leg = `${at}, leg ${(isMap(l) && l.leg_id) || i + 1}`;
    if (!isMap(l)) return `${leg} is not a map`;
    if (Object.hasOwn(l, "text")) {
      return `${leg} carries \`text\` — a Leg's sentence is its relation's \`holds\` in ${structureAt}, and the Leg carries none (kogaki#1955)`;
    }
    if (!Object.hasOwn(l, "relation")) return `${leg} carries no \`relation\` — every Leg names one relation`;
    if (!ids.has(l.relation))
      return `${leg}: its \`relation\` ${JSON.stringify(l.relation)} names no relation of ${structureAt}`;
  }
  if (!legs.some((l) => l.relation === structure.attains_thesis)) {
    return `${at}: no Leg names the relation ${JSON.stringify(structure.attains_thesis)}, which \`attains_thesis\` in ${structureAt} names`;
  }
  return null;
}

const yamlOf = (text, at, what) => {
  try {
    return { value: parseYaml(text, at) };
  } catch (e) {
    return { error: `the ${what} at ${at} is not a YAML record this reader can read: ${e.message}` };
  }
};

// THE ONE READER OF AN ADOPTED BRIEF (kogaki#1955): the three files read as the one record `parseBriefRecord` returned
// for a Brief of one file, each Leg given its relation's `holds` as `text` by `readHolds`. Returns
// `{ text, sha256, record, renamed }` — `text` the three texts in order, the one hash's input — or `{ error }`, naming
// the file.
export function readBriefFiles(briefPath) {
  const p = briefFilePaths(briefPath);
  const texts = {};
  for (const [k, what] of [
    ["brief", "Brief"],
    ["structure", "RelationalStructure"],
    ["readerPath", "Reader Path"],
  ]) {
    if (k !== "brief" && !existsSync(p[k])) {
      const held = readBriefTexts({ brief: texts.brief, structure: "", readerPath: "" }, briefPath, { held: true });
      if (held.error) return held;
      return {
        error: `the Brief at ${relFromRepo(p.brief)} has no ${basename(p[k])} beside it (${relFromRepo(p[k])})`,
      };
    }
    try {
      texts[k] = readFileSync(p[k], "utf8");
    } catch (e) {
      return { error: `the ${what} at ${relFromRepo(p[k])} cannot be read (${e.message})` };
    }
  }
  return readBriefTexts(texts, briefPath);
}

// The same read over the three texts in hand, before any is written (`split`). `opts.held` stops after the one
// refusal of a Brief that still holds `structure` or `reader_path`.
export function readBriefTexts(texts, briefPath, opts = {}) {
  const p = briefFilePaths(briefPath);
  const at = {
    brief: relFromRepo(p.brief),
    structure: relFromRepo(p.structure),
    readerPath: relFromRepo(p.readerPath),
  };
  const brief = yamlOf(texts.brief, at.brief, "Brief");
  if (brief.error) return brief;
  const held = isMap(brief.value) ? SPLIT_KEYS.find((k) => Object.hasOwn(brief.value, k)) : undefined;
  if (held) {
    return {
      error:
        `the Brief at ${at.brief} carries \`${held}\`, which an adopted Brief keeps in ${BRIEF_STRUCTURE_FILE} and ` +
        `${BRIEF_READER_PATH_FILE} beside it — run \`node src/brief-files.mjs split --brief ${at.brief}\` once (kogaki#1955)`,
    };
  }
  if (opts.held) return {};
  const structure = yamlOf(texts.structure, at.structure, "RelationalStructure");
  if (structure.error) return structure;
  const path = yamlOf(texts.readerPath, at.readerPath, "Reader Path");
  if (path.error) return path;
  if (!isMap(path.value) || Object.keys(path.value).some((k) => k !== "reader_path")) {
    return { error: `${at.readerPath} carries one key, \`reader_path\`, and nothing beside it` };
  }
  if (!isMap(brief.value)) return { error: briefRecordRefusal(brief.value, at.brief) };
  const merged = { ...brief.value, structure: structure.value, reader_path: path.value.reader_path };
  const shape = briefRecordRefusal(merged, at.brief);
  if (shape) return { error: shape };
  // A STRUCTURE STORED UNDER `relations` AND `higher_order` IS READ AS ONE LIST (kogaki#1937), and not written back.
  const { record, renamed } = briefAsOneList(merged);
  const bad =
    structureFileRefusal(record.structure, at.structure) ||
    readerPathFileRefusal(record.reader_path, record.structure, at.readerPath, at.structure);
  if (bad) return { error: bad };
  const holds = new Map(record.structure.relations.map((r) => [r.id, r.holds]));
  record.reader_path = record.reader_path.map(({ leg_id, relation, ...rest }) => ({
    leg_id,
    relation,
    text: readHolds(record.structure, holds.get(relation)),
    ...rest,
  }));
  return { text: briefFilesText(texts), sha256: briefFilesSha(texts), record, renamed };
}
