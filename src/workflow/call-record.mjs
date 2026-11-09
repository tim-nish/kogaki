// The Call Record (kogaki#1717): one directory per judged model call, holding what the
// model received and what it returned. Its files are named in specs/spec-draft-pipeline/SPEC.md.
// `writeCallRecord` is the one writer, called by the short Trial, the detached job
// supervisor and the synchronous judge; `readCallRecord` reads one back.
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { REPO, relFromRepo } from "./run-record.mjs";

export const CALLS_DIR = "calls";
export const CALL_FILES = {
  prompt: "prompt.md", argv: "argv.json", cli: "cli.json", input: "input.json", row: "row.json",
  raw: "answer.raw", answer: "answer.json", refusal: "refusal.json",
};

// A unit id is a path under `calls/`: one segment, or, for a call inside a unit, `<unit>/<stage>/<n>`
// (kogaki#1734). No segment is empty or a dot.
const unitSegment = (unit) => String(unit).split(/[\\/]+/).filter((p) => p && p !== "." && p !== "..").join("/") || "-";

// THE NAMES A RUN WRITTEN BEFORE kogaki#1760 CARRIES: read where the new name is absent, never written.
export const RETIRED_NAMES = Object.freeze({ dir: "attempts", records: "attempt_records", firstCallS: "attempt_1_s", unitBound: "unit_attempts", count: "attempts", roundsFile: "attempts.json" });

// A writer's directory is always `calls/`; a reader's is `calls/` where it exists and the retired name where only that does.
export function callsRoot(runDir) {
  const now = join(runDir, CALLS_DIR);
  const old = join(runDir, RETIRED_NAMES.dir);
  return !existsSync(now) && existsSync(old) ? old : now;
}
export function callDir(runDir, unit, n) { return join(runDir, CALLS_DIR, unitSegment(unit), String(n)); }

// A job record's unit row, or a stage record, read under either name.
export const callRecordsOf = (row) => (row ? row.call_records ?? row[RETIRED_NAMES.records] : undefined);
export const firstCallSecondsOf = (row) => (row ? row.call_1_s ?? row[RETIRED_NAMES.firstCallS] : undefined);
export const roundsOf = (row) => (row ? row.rounds ?? row[RETIRED_NAMES.count] : undefined);
// A stage directory's Rounds file: `rounds.json`, or the retired name where only that exists.
export function roundsFileIn(dir) {
  const now = join(dir, "rounds.json");
  return !existsSync(now) && existsSync(join(dir, RETIRED_NAMES.roundsFile)) ? join(dir, RETIRED_NAMES.roundsFile) : now;
}

// Keyed by path, size and mtime: the judge binary is replaced under a run (kogaki#1717).
const SHA_CACHE = new Map();
function fileSha256(path) {
  let st;
  try { st = statSync(path); } catch { return null; }
  const key = `${path}\0${st.size}\0${st.mtimeMs}`;
  if (!SHA_CACHE.has(key)) SHA_CACHE.set(key, createHash("sha256").update(readFileSync(path)).digest("hex"));
  return SHA_CACHE.get(key);
}

export function cliRecord(path, version = null) {
  return { path: path ? String(path) : null, sha256: path ? fileSha256(String(path)) : null, version: version ?? null };
}

export function tableRecord(path) {
  const abs = resolve(REPO, String(path));
  if (!existsSync(abs)) throw new Error(`call record: the table ${relFromRepo(abs)} does not exist, so row.json would name a file nobody read`);
  return { path: relFromRepo(abs), sha256: fileSha256(abs) };
}

export function refusalRecord({ group = null, reach = null, text, validator = null, sites = null }) {
  return { group, reach, text: String(text), validator, sites: Array.isArray(sites) && sites.length ? sites : null };
}

const json = (v) => JSON.stringify(v ?? null, null, 2) + "\n";

// `answer` undefined writes no answer.json: the answer did not parse.
export function writeCallRecord(runDir, unit, n, { prompt, argv, cli, input, row, raw, answer, refusal }) {
  const dir = callDir(runDir, unit, n);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, CALL_FILES.prompt), String(prompt ?? ""));
  writeFileSync(join(dir, CALL_FILES.argv), json(argv));
  writeFileSync(join(dir, CALL_FILES.cli), json(cli));
  writeFileSync(join(dir, CALL_FILES.input), json(input));
  writeFileSync(join(dir, CALL_FILES.row), json(row));
  writeFileSync(join(dir, CALL_FILES.raw), raw == null ? "" : raw);
  if (answer !== undefined) writeFileSync(join(dir, CALL_FILES.answer), json(answer));
  writeFileSync(join(dir, CALL_FILES.refusal), json(refusal ? refusalRecord(refusal) : null));
  return dir;
}

// A refusal raised after the call's record was written, as the site loop's are (kogaki#1756): it fills a record that
// holds none, and never replaces one the call already carries.
export function pinCallRefusal(runDir, unit, n, refusal) {
  const path = join(callDir(runDir, unit, n), CALL_FILES.refusal);
  if (!existsSync(path) || JSON.parse(readFileSync(path, "utf8")) !== null) return false;
  writeFileSync(path, json(refusalRecord(refusal)));
  return true;
}

export function readCallRecord(dir) {
  const at = (k) => join(dir, CALL_FILES[k]);
  if (!existsSync(at("prompt"))) return { error: `${dir} holds no ${CALL_FILES.prompt}: it is not a Call Record` };
  const parsed = (k) => (existsSync(at(k)) ? JSON.parse(readFileSync(at(k), "utf8")) : undefined);
  return {
    dir, prompt: readFileSync(at("prompt"), "utf8"), argv: parsed("argv"), cli: parsed("cli"), input: parsed("input"),
    row: parsed("row"), raw: existsSync(at("raw")) ? readFileSync(at("raw"), "utf8") : null,
    answer: parsed("answer"), refusal: parsed("refusal") ?? null,
  };
}

// A replay's results sit under the record it re-ran (kogaki#1718, src/workflow/replay.mjs).
export const REPLAYS_DIR = "replays";
export const REPLAY_RESULT = "result.json";

// The replays a record holds, oldest first: each one's directory and result.
export function replaysOf(dir) {
  const root = join(dir, REPLAYS_DIR);
  if (!existsSync(root)) return [];
  return readdirSync(root).sort().map((n) => join(root, n)).filter((d) => existsSync(join(d, REPLAY_RESULT)))
    .map((d) => ({ dir: d, ...JSON.parse(readFileSync(join(d, REPLAY_RESULT), "utf8")) }));
}

// THE CALLS UNDER ONE `calls/` DIRECTORY (kogaki#1718), unit by unit and Call by Call: the number, the
// refusal's group, reach and first line, the record's files and each replay. The sheet and the job report render these.
export function callRows(root) {
  if (!existsSync(root)) return [];
  const numbered = (d) => readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
    .map((e) => Number(e.name)).sort((a, b) => a - b);
  // A unit's directory holds its numbered Calls and, nested, the units of the calls inside it (kogaki#1734).
  const units = (rel) => readdirSync(join(root, rel), { withFileTypes: true })
    .filter((e) => e.isDirectory() && !/^\d+$/.test(e.name)).map((e) => (rel ? `${rel}/${e.name}` : e.name)).sort()
    .flatMap((u) => [u, ...units(u)]);
  return units("").flatMap((unit) =>
    numbered(join(root, unit)).map((n) => {
      const dir = join(root, unit, String(n));
      const refusal = existsSync(join(dir, CALL_FILES.refusal)) ? JSON.parse(readFileSync(join(dir, CALL_FILES.refusal), "utf8")) : null;
      return { unit, n, dir, group: refusal ? refusal.group ?? null : null, reach: refusal ? refusal.reach ?? null : null,
        refusal: refusal ? String(refusal.text).split("\n")[0] : null,
        files: Object.values(CALL_FILES).filter((f) => existsSync(join(dir, f))), replays: replaysOf(dir) };
    }));
}
