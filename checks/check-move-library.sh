#!/usr/bin/env bash
# The committed Move library holds only records the Adapter admits, and its
# INDEX is the regeneration of the records on disk (kogaki#1434).
#
# WHAT THIS CARRIES. `moves/` is the Move library every Brief, Move-fit
# judgment and ParagraphPlan run reads, and `moves/ROLES.json` says what a
# record in it is: a `.yaml` file whose `before` and `after` are maps keyed by
# dimension (kogaki#1413), carrying `segments` and `description` and no
# `technique` (kogaki#1412, kogaki#1414). The ingest (`tools/move_ingest.py`)
# refuses a record outside that shape at the moment of writing, through the
# Adapter's own validator (`src/move-validate.mjs`, kogaki#1418). Nothing ran
# the same predicate over the records already on disk: four schema Issues
# landed on 2026-10-17 and the 21 committed Leg Moves were left in a shape the
# Adapter refuses at every read, with no check red about it. That is the named
# defect -- the library's contract was held by the writer alone, and a record
# written before the writer's rule changed was invisible to it.
#
# WHAT IT ASSERTS, over `moves/` and over fixture libraries on every run:
#   (a) every `moves/*.yaml` parses as the Brief's YAML reader reads it and is
#       admitted by the Adapter's validator against `moves/ROLES.json`, and its
#       `id` is its file stem (the ingest derives the path from the id);
#   (b) `moves/INDEX.md` is byte-for-byte what `tools/move_ingest.py`'s own
#       `write_index` regenerates from the records on disk -- the ingest's
#       writer, run over a copy, so the two cannot drift into disagreeing.
#   (d) no record in the retired `.md` form remains under `moves/` -- every
#       `.md` file there but `INDEX.md` is refused (kogaki#1522). A `.md`
#       record is refused at every read and listed nowhere, so one left behind
#       is dead text no other assertion here would see.
#
# THE FIXTURE PASS RUNS ON EVERY INVOCATION, not behind a flag: a predicate
# that silently stopped discriminating would otherwise report a clean library,
# and a clean library is exactly what this member reports when it is working.
# The cases are the defect's own shapes: a record carrying `technique` and no
# `segments` (the 21 Leg Moves' shape), a `before` written as one joined line,
# an `id` disagreeing with its file name, a stale INDEX, a `.md` record beside
# an otherwise clean library -- and one admitted record with a fresh INDEX as
# the control that stops the deny passing vacuously.
#
# WHAT IT DOES NOT VERIFY, stated rather than left to look covered: whether a
# record's prose is any good is the owner's reading at the ingest's selection
# screen, never linted here.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, copyFileSync, rmSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const repo = resolve(".");
const { parseYaml, stringifyYaml } = await import(pathToFileURL(join(repo, "src", "yaml.mjs")).href);
const { validateMoveRecord } = await import(pathToFileURL(join(repo, "src", "compose.mjs")).href);

// The ingest's own INDEX writer, run over a directory named `moves` so the
// header line it writes names the same path the committed INDEX names.
const WRITE_INDEX = [
  "import sys, os",
  "sys.path.insert(0, os.path.join(sys.argv[1], 'tools'))",
  "import move_ingest as m",
  "os.chdir(sys.argv[2])",
  "m.write_index('moves')",
].join("\n");

// ONE PREDICATE FOR THE TREE AND THE FIXTURES. `dir` holds a `moves/`
// library; the result is the list of failure lines, each prefixed `tag`.
function libraryFailures(dir, tag) {
  const out = [];
  const lib = join(dir, "moves");
  const records = readdirSync(lib).filter((n) => n.endsWith(".yaml")).sort();
  // (d) the retired `.md` record form is gone; INDEX.md is the one `.md` file.
  for (const name of readdirSync(lib).filter((n) => n.endsWith(".md") && n !== "INDEX.md").sort()) {
    out.push(`${tag} ${name}: is a record in the retired \`.md\` form`);
  }
  for (const name of records) {
    const path = join(lib, name);
    let record;
    try { record = parseYaml(readFileSync(path, "utf8"), path); }
    catch (e) { out.push(`${tag} ${name}: does not parse as a Move record: ${e.message}`); continue; }
    const stem = basename(name, ".yaml");
    if (record === null || typeof record !== "object" || Array.isArray(record)) {
      out.push(`${tag} ${name}: is not a map of fields`); continue;
    }
    if (record.id !== stem) out.push(`${tag} ${name}: carries id ${JSON.stringify(record.id)}, not its file stem`);
    const r = validateMoveRecord(record, lib, name);
    if (r.error) out.push(`${tag} ${name}: the Adapter refuses it: ${r.error}`);
  }
  // (b) the INDEX is the regeneration of the records on disk.
  const scratch = mkdtempSync(join(tmpdir(), "move-library-index-"));
  mkdirSync(join(scratch, "moves"));
  for (const name of readdirSync(lib)) {
    if (name.endsWith(".yaml") || name === "ROLES.json") copyFileSync(join(lib, name), join(scratch, "moves", name));
  }
  const py = spawnSync("python3", ["-c", WRITE_INDEX, repo, scratch], { encoding: "utf8" });
  if (py.status !== 0) {
    out.push(`${tag} the ingest's write_index could not run over a copy of the library: ${(py.stderr || "").trim()}`);
  } else {
    const fresh = readFileSync(join(scratch, "moves", "INDEX.md"), "utf8");
    const committed = existsSync(join(lib, "INDEX.md")) ? readFileSync(join(lib, "INDEX.md"), "utf8") : null;
    if (committed === null) out.push(`${tag} INDEX.md is missing`);
    else if (committed !== fresh) out.push(`${tag} INDEX.md is not the regeneration of the records on disk (${records.length} record(s))`);
  }
  rmSync(scratch, { recursive: true, force: true });
  return out;
}

// ---- the fixture pass ----
const root = mkdtempSync(join(tmpdir(), "move-library-"));
const fixture = (name) => {
  const dir = join(root, name);
  mkdirSync(join(dir, "moves"), { recursive: true });
  copyFileSync(join(repo, "moves", "ROLES.json"), join(dir, "moves", "ROLES.json"));
  return dir;
};
const writeRecord = (dir, file, rec) => writeFileSync(join(dir, "moves", file), stringifyYaml(rec));
const reindex = (dir) => {
  const py = spawnSync("python3", ["-c", WRITE_INDEX, repo, dir], { encoding: "utf8" });
  if (py.status !== 0) fails.push(`(fixture) write_index failed: ${(py.stderr || "").trim()}`);
};
const WHOLE = {
  id: "p1", description: "a fixture Move.",
  before: { knowledge: "before.", question: "holds: none." }, after: { knowledge: "after." },
  breaks: ["breaks if the point is dropped."],
  segments: [{ operation: "states the point once, plainly." }],
};

// (c1) the 21 Leg Moves' shape: `technique`, no `segments`, states as one joined line.
{
  const d = fixture("retired-shape");
  writeRecord(d, "p1.yaml", { id: "p1", description: "a fixture Move.",
    before: "knowledge: before. question: holds: none.", after: "knowledge: after.",
    technique: "Define a variable, then simplify it.", breaks: ["breaks if the point is dropped."] });
  reindex(d);
  const f = libraryFailures(d, "(c1)");
  ok(f.some((l) => /refuses it/.test(l)), "(c1) a record carrying `technique` and no `segments` is refused");
}
// (c2) a joined-line state on an otherwise whole record.
{
  const d = fixture("joined-state");
  writeRecord(d, "p1.yaml", { ...WHOLE, before: "knowledge: before. question: holds: none." });
  reindex(d);
  const f = libraryFailures(d, "(c2)");
  ok(f.some((l) => /refuses it/.test(l)), "(c2) a `before` written as one joined line is refused");
}
// (c3) an id that is not the file stem.
{
  const d = fixture("wrong-stem");
  writeRecord(d, "p2.yaml", WHOLE);
  reindex(d);
  const f = libraryFailures(d, "(c3)");
  ok(f.some((l) => /not its file stem/.test(l)), "(c3) a record whose id is not its file stem is refused");
}
// (c4) a stale INDEX: the record is admitted, the INDEX predates it.
{
  const d = fixture("stale-index");
  reindex(d);
  writeRecord(d, "p1.yaml", WHOLE);
  const f = libraryFailures(d, "(c4)");
  ok(f.some((l) => /not the regeneration/.test(l)), "(c4) an INDEX.md that is not the regeneration of the records is refused");
}
// (c6) a retired `.md` record beside an admitted record and a fresh INDEX.
{
  const d = fixture("retired-md");
  writeRecord(d, "p1.yaml", WHOLE);
  writeFileSync(join(d, "moves", "p0.md"), "# p0\n\nTechnique: define a variable, then simplify it.\n");
  reindex(d);
  const f = libraryFailures(d, "(c6)");
  ok(f.some((l) => /retired `\.md` form/.test(l)), "(c6) a record in the retired `.md` form is refused");
}
// (c5) the control: one admitted record, fresh INDEX, nothing fails.
{
  const d = fixture("control");
  writeRecord(d, "p1.yaml", WHOLE);
  reindex(d);
  const f = libraryFailures(d, "(c5)");
  ok(f.length === 0, `(c5) an admitted record with a fresh INDEX passes: ${f.join(" | ")}`);
}
rmSync(root, { recursive: true, force: true });
console.log("fixture cases run: 6");

// ---- the committed library ----
const real = libraryFailures(repo, "(a/b)");
fails.push(...real);
const count = readdirSync(join(repo, "moves")).filter((n) => n.endsWith(".yaml")).length;
console.log(`moves/: ${count} record(s) read, INDEX.md compared`);

if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log("check-move-library: PASS");
JS
