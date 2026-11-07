// The Attempt Record (kogaki#1717): one directory per judged model call, holding what the
// model received and what it returned. Its files are named in specs/spec-draft-pipeline/SPEC.md.
// `writeAttemptRecord` is the one writer, called by the short Trial, the detached job
// supervisor and the synchronous judge; `readAttemptRecord` reads one back.
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { REPO, relFromRepo } from "./run-record.mjs";

export const ATTEMPTS_DIR = "attempts";
export const ATTEMPT_FILES = {
  prompt: "prompt.md", argv: "argv.json", cli: "cli.json", input: "input.json", row: "row.json",
  raw: "answer.raw", answer: "answer.json", refusal: "refusal.json",
};

// A unit id is one path segment under `attempts/`.
const unitSegment = (unit) => String(unit).replace(/[\\/]+/g, "-");

export function attemptsRoot(runDir) { return join(runDir, ATTEMPTS_DIR); }
export function attemptDir(runDir, unit, n) { return join(attemptsRoot(runDir), unitSegment(unit), String(n)); }

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
  if (!existsSync(abs)) throw new Error(`attempt record: the table ${relFromRepo(abs)} does not exist, so row.json would name a file nobody read`);
  return { path: relFromRepo(abs), sha256: fileSha256(abs) };
}

export function refusalRecord({ group = null, reach = null, text, validator = null, sites = null }) {
  return { group, reach, text: String(text), validator, sites: Array.isArray(sites) && sites.length ? sites : null };
}

const json = (v) => JSON.stringify(v ?? null, null, 2) + "\n";

// `answer` undefined writes no answer.json: the answer did not parse.
export function writeAttemptRecord(runDir, unit, n, { prompt, argv, cli, input, row, raw, answer, refusal }) {
  const dir = attemptDir(runDir, unit, n);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, ATTEMPT_FILES.prompt), String(prompt ?? ""));
  writeFileSync(join(dir, ATTEMPT_FILES.argv), json(argv));
  writeFileSync(join(dir, ATTEMPT_FILES.cli), json(cli));
  writeFileSync(join(dir, ATTEMPT_FILES.input), json(input));
  writeFileSync(join(dir, ATTEMPT_FILES.row), json(row));
  writeFileSync(join(dir, ATTEMPT_FILES.raw), raw == null ? "" : raw);
  if (answer !== undefined) writeFileSync(join(dir, ATTEMPT_FILES.answer), json(answer));
  writeFileSync(join(dir, ATTEMPT_FILES.refusal), json(refusal ? refusalRecord(refusal) : null));
  return dir;
}

export function readAttemptRecord(dir) {
  const at = (k) => join(dir, ATTEMPT_FILES[k]);
  if (!existsSync(at("prompt"))) return { error: `${dir} holds no ${ATTEMPT_FILES.prompt}: it is not an Attempt Record` };
  const parsed = (k) => (existsSync(at(k)) ? JSON.parse(readFileSync(at(k), "utf8")) : undefined);
  return {
    dir, prompt: readFileSync(at("prompt"), "utf8"), argv: parsed("argv"), cli: parsed("cli"), input: parsed("input"),
    row: parsed("row"), raw: existsSync(at("raw")) ? readFileSync(at("raw"), "utf8") : null,
    answer: parsed("answer"), refusal: parsed("refusal") ?? null,
  };
}
