#!/usr/bin/env node
// THE MOVE VALIDATE ENTRY (kogaki#1418). The ingest, `tools/move_ingest.py`,
// is Kogaki's admission gate for Moves, and it validates each candidate
// through the Adapter's own contract and nothing of its own: this entry wraps
// `validateMoveRecord` in src/compose.mjs, the function `moveContract` reads
// every saved Move through, so a record the ingest admits is a record the
// composer, the Move-fit judgment and the ParagraphPlan stage read, and a
// record the Adapter refuses is refused at the ingest in the Adapter's words.
//
//   node src/move-validate.mjs [movesDir] < record.json
//
// `movesDir` is the library whose `ROLES.json` the record is read against
// (default `moves`). Exit 0 prints nothing; a refusal is the Adapter's own
// sentence on stdout, exit 1; a usage or input fault is on stderr, exit 2.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { validateMoveRecord } from "./compose.mjs";

// THE CONSTRAINT KINDS A MOVE'S `takes` AND `leaves` NAME (kogaki#1698, owner ruling
// 2026-11-06): a closed set, each kind with its one-sentence definition, rendered into every
// row that reads the two fields.
export const MOVE_CONSTRAINT_KINDS = Object.freeze({
  answer: "a question raised, to be answered",
  explain: "a term or item named, to be explained",
  carry: "a structure given in a base, to be carried onto the subject",
  apply: "a principle, division or general statement given, to be put to work on a case or shown in an instance",
});

// `takes` and `leaves`, read back (kogaki#1698): each a list, possibly empty, of `{ kind, what }`,
// a `leaves` entry also carrying `segment`, the Segment that leaves it, one of the Move's
// `segmentCount`. Returns the first refusal, naming the field and the entry, or null.
export function moveConstraintsRefusal(record, segmentCount, at) {
  const kinds = Object.keys(MOVE_CONSTRAINT_KINDS);
  const oneLine = (s) => typeof s === "string" && s.trim() !== "" && !/[\r\n]/.test(s.trim());
  for (const field of ["takes", "leaves"]) {
    const v = record[field];
    if (v === undefined || v === null) {
      return `${at} carries no \`${field}\` — a Move carries \`takes\` and \`leaves\`, each a list, possibly empty, of \`{ kind, what }\` (kogaki#1698)`;
    }
    if (!Array.isArray(v)) return `${at}: \`${field}\` is not a list of \`{ kind, what }\` entries (kogaki#1698)`;
    const seen = new Set();
    for (const [i, x] of v.entries()) {
      const atE = `${at}: \`${field}\` entry ${i + 1}`;
      if (!x || typeof x !== "object" || Array.isArray(x)) return `${atE} is not a map of \`kind\` and \`what\` (kogaki#1698)`;
      const keys = field === "leaves" ? ["kind", "what", "segment"] : ["kind", "what"];
      if (field === "takes" && Object.hasOwn(x, "segment")) {
        return `${atE} carries \`segment\` — a \`takes\` entry is what Segment 1 takes up, and only a \`leaves\` entry names its Segment (kogaki#1698)`;
      }
      const extra = Object.keys(x).find((k) => !keys.includes(k));
      if (extra) return `${atE} carries \`${extra}\` — an entry carries ${keys.map((k) => `\`${k}\``).join(", ")} only (kogaki#1698)`;
      for (const k of ["kind", "what"]) {
        if (x[k] === undefined || x[k] === null) return `${atE} carries no \`${k}\` (kogaki#1698)`;
      }
      if (!kinds.includes(String(x.kind).trim())) {
        return `${atE} names the kind \`${String(x.kind).trim()}\`, outside the closed set ${kinds.map((k) => `\`${k}\``).join(", ")} (kogaki#1698)`;
      }
      if (!oneLine(x.what)) return `${atE}: \`what\` is not one non-empty line (kogaki#1698)`;
      if (field === "leaves") {
        if (x.segment === undefined || x.segment === null || String(x.segment).trim() === "") {
          return `${atE} carries no \`segment\` — a \`leaves\` entry names the Segment that leaves it (kogaki#1698)`;
        }
        const s = String(x.segment).trim();
        if (!/^\d+$/.test(s) || Number(s) < 1 || Number(s) > segmentCount) {
          return `${atE}: \`segment\` names Segment ${JSON.stringify(s)}, and the Move has Segments 1 to ${segmentCount} (kogaki#1698)`;
        }
      }
      const key = `${String(x.kind).trim()}\u0000${x.what.trim()}`;
      if (seen.has(key)) return `${atE} repeats an earlier entry's \`kind\` and \`what\` — no two entries of one list are alike in both (kogaki#1698)`;
      seen.add(key);
    }
  }
  return null;
}

export function validateMoveText(text, movesDir = "moves") {
  let record;
  try { record = JSON.parse(text); }
  catch (e) { return { fault: `the candidate is not a JSON record (${e.message})` }; }
  const r = validateMoveRecord(record, movesDir);
  return r.error ? { error: r.error } : { ok: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length > 1) {
    process.stderr.write("usage: node src/move-validate.mjs [movesDir] < record.json\n");
    process.exitCode = 2;
  } else {
    const r = validateMoveText(readFileSync(0, "utf8"), args[0] || "moves");
    if (r.fault) { process.stderr.write(`${r.fault}\n`); process.exitCode = 2; }
    else if (r.error) { process.stdout.write(`${r.error}\n`); process.exitCode = 1; }
  }
}
