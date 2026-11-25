// compose/satellites — the structures read from Decisions or Lessons by themselves, kept in `satellites.yaml` beside
// a Brief's three files (kogaki#1963): each entry a Satellite of the Brief's structure, joined to it by one of three
// RST relations and standing before one Leg of `reader-path.yaml`. The one reader of the file, its one writer, and the
// whole Reader Path derived from the Brief and the file. The file is outside the Brief's hash.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here. This module names no spec content.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { parseYaml, stringifyYaml } from "../yaml.mjs";
import { relFromRepo } from "../workflow/run-record.mjs";
import { readerPathFileRefusal, structureFileRefusal } from "./brief-files.mjs";
import { readHolds } from "./structure.mjs";

export const SATELLITES_FILE = "satellites.yaml";
// Mann and Thompson's definitions, the RST web site's relation definitions page (kogaki#1963).
export const RST_RELATIONS = Object.freeze(["Background", "Circumstance", "Solutionhood"]);
const WIDTH = 120;
const HEADER =
  "Structures read from Decisions or Lessons by themselves, each a Satellite of the Brief's structure: " +
  "`rst_relation` joins it to the Brief's, and its Legs stand before the Leg `before` names. Edited by hand; " +
  "`node src/satellite.mjs add` appends an entry and changes none already here.";
const SATELLITE_ID = /^s_([1-9][0-9]*)$/;

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);

export const satellitesPathFor = (briefPath) => join(dirname(resolve(briefPath)), SATELLITES_FILE);

// THE REFUSALS OF THE FILE (kogaki#1963), the first one met, or null. `record` is the Brief as `readBriefFiles` read
// it; an entry's `structure` and `reader_path` meet the refusals of structure.yaml and reader-path.yaml.
export function satellitesRefusal(file, record, at) {
  if (!isMap(file) || Object.keys(file).some((k) => k !== "satellites")) {
    return `${at} carries one key, \`satellites\`, and nothing beside it`;
  }
  if (!Array.isArray(file.satellites)) return `${at}: \`satellites\` is not a list`;
  const legIds = new Set(record.reader_path.map((l) => l.leg_id));
  const seen = new Set();
  for (const [i, e] of file.satellites.entries()) {
    const id = isMap(e) ? e.id : undefined;
    if (typeof id !== "string" || !SATELLITE_ID.test(id)) {
      return `${at}, entry ${i + 1}: its \`id\` ${JSON.stringify(id ?? null)} is not s_<n>`;
    }
    if (seen.has(id)) return `${at}: two entries share the id ${JSON.stringify(id)}`;
    seen.add(id);
    const entry = `${at}, ${id}`;
    if (!RST_RELATIONS.includes(e.rst_relation)) {
      return `${entry}: its \`rst_relation\` ${JSON.stringify(e.rst_relation ?? null)} is not one of ${RST_RELATIONS.join(", ")}`;
    }
    if (!legIds.has(e.before)) {
      return `${entry}: its \`before\` ${JSON.stringify(e.before ?? null)} names no Leg of reader-path.yaml`;
    }
    const structureAt = `${entry}'s \`structure\``;
    const bad =
      structureFileRefusal(e.structure, structureAt) ||
      readerPathFileRefusal(e.reader_path, e.structure, `${entry}'s \`reader_path\``, structureAt);
    if (bad) return bad;
  }
  return null;
}

// THE ONE READER (kogaki#1963): `{ absent: true, path }` where there is no file, `{ record, text, path }`, or
// `{ error }` naming the file and what it refuses.
export function readSatellites(briefPath, record) {
  const path = satellitesPathFor(briefPath);
  if (!existsSync(path)) return { absent: true, path };
  const at = relFromRepo(path);
  let text;
  let file;
  try {
    text = readFileSync(path, "utf8");
    file = parseYaml(text, at);
  } catch (e) {
    return { error: `${at} cannot be read (${e.message})` };
  }
  const refusal = satellitesRefusal(file, record, at);
  return refusal ? { error: refusal } : { record: file, text, path };
}

// The next free id after every `s_<n>` the file holds.
export function nextSatelliteId(file) {
  const top = Math.max(
    0,
    ...((file && file.satellites) || []).map((e) => Number((SATELLITE_ID.exec(e && e.id) || [])[1] || 0)),
  );
  return `s_${top + 1}`;
}

// The file as it would read with `entry` appended: its text where that text reads back as the file's entries followed
// by the new one, a comment written by hand kept; otherwise the file written whole from the record.
export function appendedSatellitesText(current, entry) {
  const file = current && current.record ? current.record : { satellites: [] };
  const want = { ...file, satellites: [...file.satellites, entry] };
  if (current && typeof current.text === "string") {
    const item = stringifyYaml({ satellites: [entry] }, { width: WIDTH }).replace(/^satellites:\n/, "");
    const text = `${current.text.replace(/\n*$/, "\n")}${item}`;
    let back;
    try {
      back = parseYaml(text, "satellites.yaml");
    } catch {
      back = null;
    }
    if (isDeepStrictEqual(back, want)) return { text, file: want };
  }
  return { text: stringifyYaml(want, { width: WIDTH, header: HEADER }), file: want };
}

export function writeSatellitesText(path, text) {
  writeFileSync(path, text);
}

// THE WHOLE READER PATH (kogaki#1963), derived and never stored: the Legs of reader-path.yaml in order, and before the
// Leg an entry's `before` names, that entry's Legs in order, entries naming one Leg in the order of the file. Each Leg
// is `{ leg_id, relation, text, satellite, rst_relation }`, the last two null on a Leg of the Brief. `satellites` is
// what `readSatellites` returned, or the file's record; absent or null gives the Brief's Legs alone.
export function wholeReaderPath(record, satellites) {
  const file = satellites && satellites.record ? satellites.record : satellites;
  const entries = (file && Array.isArray(file.satellites) && file.satellites) || [];
  const legOf = (structure, l, e) => {
    const relation = structure.relations.find((r) => r.id === l.relation);
    return {
      leg_id: l.leg_id,
      relation: l.relation,
      text: readHolds(structure, relation && relation.holds),
      satellite: e ? e.id : null,
      rst_relation: e ? e.rst_relation : null,
    };
  };
  return record.reader_path.flatMap((l) => [
    ...entries.filter((e) => e.before === l.leg_id).flatMap((e) => e.reader_path.map((s) => legOf(e.structure, s, e))),
    legOf(record.structure, l, null),
  ]);
}
