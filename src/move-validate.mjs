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
