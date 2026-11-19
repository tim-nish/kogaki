#!/usr/bin/env node
// The Structure-Mapping Playground's Trial (kogaki#1664): a Strand and a RelationalStructure, owner-authored
// or read by the Mapper (kogaki#1665), into a Trial record; the Trial ends after its structure is read (kogaki#1883).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Structure-Mapping Playground
//       specs/spec-draft-pipeline/SPEC.md
//   The Mapper's structure reading
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, basename, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { readerPersona } from "../compose.mjs";
import { judgePrompt, resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo, bindFlow, readRowTable } from "../workflow/run-record.mjs";
import { startDetachedJobSupervisor, READER_PATH_JOB_STALL_S, jobHeartbeatMs } from "../workflow/detached-job.mjs";
import { EXTRACTION_TABLE, awaitJob, lastRefusal, writeJson } from "../move-extraction-playground/extract.mjs";
import { installRecorder, stageEnv, declaredCommand, CALLS_FILE } from "../move-extraction-playground/leg-run.mjs";
import { parseYaml, stringifyYaml } from "../yaml.mjs";
import { parseProposition, validateStructure } from "./structure.mjs";
import { mapperRow, mapperInput, MAPPER_CALLS } from "./sme.mjs";

export const PLAYGROUND_TABLE = "src/structure-mapping-playground/playground-workflow.json";
export const TRIALS_DIR = join("runs", "structure-mapping-playground");
export const TRIAL_FILE = "trial.json";
export const READING_FILE = "reading.md";
export const STRUCTURE_FILE = "structure.yaml";
const FLOW = { lane: "brief", label: "Structure-Mapping Playground" };
const USAGE =
  "usage: node src/structure-mapping-playground/trial.mjs run --strand <file> (--structure <file> | --mapper <sme_map_<variant>>) " +
  "--out <dir under runs/structure-mapping-playground/> [--audience <audiences/<name>.md>]";

function fail(msg) {
  process.stderr.write(`trial: ${msg}\n`);
  process.exit(1);
}

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

// The proposition file (kogaki#1685) and the structure, read and validated; a refusal ends the process before
// anything is written.
function readStrand(strandFile) {
  let strandText;
  try {
    strandText = readFileSync(strandFile, "utf8");
  } catch (e) {
    fail(`the proposition file cannot be read (${e.message}). Nothing was started.`);
  }
  const strand = parseProposition(strandText);
  if (strand.error) fail(`${strand.error}. Nothing was started.`);
  return strand;
}

function readInputs(strandFile, structureFile) {
  const strand = readStrand(strandFile);
  let structure;
  try {
    structure = parseYaml(readFileSync(structureFile, "utf8"), structureFile);
  } catch (e) {
    fail(`the structure cannot be read (${e.message}). Nothing was started.`);
  }
  const v = validateStructure(structure, strand);
  if (v.error) fail(`${v.error}. Nothing was started.`);
  return { strand, structure };
}

// ---------------------------------------------------------------------------
// THE MAPPER'S ROW, one job on the shared supervisor.

function positiveSetting(job, key) {
  const n = Number(settingValue(job && job[key]));
  return Number.isInteger(n) && n > 0
    ? n
    : fail(
        `src/move-extraction-playground/extraction-workflow.json's \`job\` declares no positive \`${key}\`. Nothing was started.`,
      );
}

function runRow({ dir, unitId, row, input, recordArray, validator, bounds }) {
  mkdirSync(dir, { recursive: true });
  const held = bindFlow(FLOW);
  let prompt;
  try {
    prompt = judgePrompt(row, JSON.stringify(input, null, 2), input, null);
  } finally {
    bindFlow(held);
  }
  writeFileSync(join(dir, "prompt.md"), prompt);
  startDetachedJobSupervisor(dir, { units: [{ id: unitId, prompt }], ...bounds, recordArray, validator });
  const job = awaitJob(dir, bounds.heartbeatMs);
  const u = (job.units || [])[0] || {};
  writeJson(join(dir, "rounds.json"), {
    row: row.id,
    state: job.state,
    status: u.status || null,
    rounds: u.rounds || 1,
    refusals: u.refusals || [],
    ...(u.refusal_reach ? { refusal_reach: u.refusal_reach } : {}),
    ...(u.timed_out ? { timed_out: u.timed_out } : {}),
  });
  if (job.state !== "done" || u.status !== "done" || !u.candidate) {
    // A refusal of reach `stop` names its group, and whether the row declares it (kogaki#1708).
    const f = u.failure || {};
    const reach =
      f.reach === "stop"
        ? `the refusal of group ${JSON.stringify(f.group)} ${f.undeclared ? "names a group the row does not declare" : "has reach stop"}: `
        : "";
    return {
      stopped:
        `the Mapper stopped at \`${row.id}\`: the job ended ${job.state} after ${u.rounds || 1} round(s) — ` +
        reach +
        String(lastRefusal(job)).split("\n").join(" "),
    };
  }
  writeJson(join(dir, "answer.json"), u.candidate);
  return { record: u.candidate };
}

function judgeBounds(extraction) {
  return {
    command: resolveJudgeBinary(String(process.env.KOGAKI_JUDGE_CLI || extraction.judge.command), process.env.PATH)
      .path,
    model: String(settingValue(extraction.judge.model)),
    outputFormat: String(extraction.judge.output_format || "json"),
    callLimitS: positiveSetting(extraction.job, "call_limit_s"),
    unitRounds: positiveSetting(extraction.job, "unit_rounds"),
    stallS: Number(extraction.job.stall_s) || READER_PATH_JOB_STALL_S,
    heartbeatMs: jobHeartbeatMs(extraction.job.heartbeat_ms),
  };
}

function audienceOf(audience) {
  const audiencePath = resolve(REPO, audience || String(settingValue({ setting: "brief.audience_file" })));
  const persona = readerPersona(audiencePath);
  if (persona.error) fail(persona.error);
  return { audiencePath, persona };
}

// THE MAPPER (kogaki#1665): the variant's row, one job under the one-retry bound, its answer
// written as the Trial's structure file.
export function mapStructure({ strandFile, mapper, out, structureOut, audience }) {
  const strand = readStrand(strandFile);
  const playground = readRowTable(PLAYGROUND_TABLE);
  const m = mapperRow(playground, mapper);
  if (m.error) fail(`${m.error}. Nothing was started.`);
  const { persona } = audienceOf(audience);
  const extraction = readRowTable(EXTRACTION_TABLE);
  const dir = resolve(out);
  const r = runRow({
    dir,
    unitId: "map",
    row: m.row,
    recordArray: "roles",
    input: mapperInput(strand, persona),
    validator: {
      module: "src/structure-mapping-playground/sme.mjs",
      export: "validateMapperAnswer",
      inputs: { cite: strand.cite, proposition: strand.proposition },
      ...(m.row.refusal_reach ? { refusal_reach: m.row.refusal_reach } : {}),
    },
    bounds: { ...judgeBounds(extraction), unitRounds: MAPPER_CALLS },
  });
  if (r.stopped) return r;
  writeFileSync(resolve(structureOut), stringifyYaml(r.record));
  return { structure: resolve(structureOut), prompt: join(dir, "prompt.md") };
}

// ---------------------------------------------------------------------------
// THE TRIAL.

function runCommand(stageDir, name, argv, env, log) {
  const r = spawnSync(argv[0], argv.slice(1), { cwd: REPO, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const rec = {
    name,
    argv: argv.map((a) => (a.startsWith(REPO + sep) ? a.slice(REPO.length + 1) : a)),
    exit: r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
    ...(r.error ? { error: String(r.error.message) } : {}),
  };
  log.push(rec);
  writeJson(join(stageDir, "command.json"), log);
  return rec;
}

function stopLine(rec) {
  const said = `${rec.stdout}\n${rec.stderr}`
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return `\`${rec.name}\` exited ${rec.exit === null ? "on a signal" : rec.exit}: ${said.slice(-3).join(" ") || rec.error || "(no output)"}`;
}

function trialSlug(out) {
  return (
    basename(out)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "trial"
  );
}

export function runTrial({
  strand: strandFile,
  structure: givenStructure = null,
  mapper = null,
  out,
  audience = null,
}) {
  const outDir = resolve(out);
  const trials = resolve(REPO, TRIALS_DIR);
  const rel = relative(trials, outDir);
  if (rel === "" || rel.startsWith("..") || rel.startsWith(sep))
    fail(`--out ${out} is not a directory under ${TRIALS_DIR}/. Nothing was started.`);
  if (existsSync(join(outDir, TRIAL_FILE)))
    fail(`a Trial already exists at ${outDir}, and nothing was written over it. Nothing was started.`);
  let strand;
  if (mapper) {
    strand = readStrand(strandFile);
    const m = mapperRow(readRowTable(PLAYGROUND_TABLE), mapper);
    if (m.error) fail(`${m.error}. Nothing was started.`);
  } else ({ strand } = readInputs(strandFile, givenStructure));
  const structureFile = mapper ? join(outDir, STRUCTURE_FILE) : resolve(givenStructure);
  const audiencePath = audience || String(settingValue({ setting: "brief.audience_file" }));
  const realPath = resolveJudgeBinary(String(declaredCommand()), process.env.PATH).path;
  const slug = trialSlug(outDir);
  mkdirSync(outDir, { recursive: true });
  installRecorder(outDir);
  const reading = join(outDir, READING_FILE);
  writeFileSync(reading, `# Reading of Trial ${slug}\n`);
  const record = {
    trial: slug,
    strand: { cite: strand.cite, path: relFromRepo(resolve(strandFile)), sha256: sha256(strandFile) },
    structure: mapper
      ? { path: relFromRepo(structureFile), sha256: null, author: "mapper" }
      : { path: relFromRepo(structureFile), sha256: sha256(structureFile), author: "owner" },
    mapper: mapper ? { variant: mapper, prompt_sha256: null } : "owner-authored",
    audience: audiencePath,
    model_command: realPath,
    started_at: new Date().toISOString(),
    stages: [],
    reading: relFromRepo(reading),
  };
  const save = () => writeJson(join(outDir, TRIAL_FILE), record);
  const stage = (name, body) => {
    if (record.stopped) {
      record.stages.push({ stage: name, state: "not run" });
      save();
      return null;
    }
    const d = join(outDir, name);
    mkdirSync(d, { recursive: true });
    let r;
    try {
      r = body(d, stageEnv(outDir, d, realPath), []);
    } catch (e) {
      r = { stopped: `the stage threw: ${String((e && e.message) || e).split("\n")[0]}` };
    }
    const calls = join(d, CALLS_FILE);
    record.stages.push({
      stage: name,
      state: r.stopped ? "stopped" : "done",
      calls: existsSync(calls) ? relFromRepo(calls) : null,
      ...r,
    });
    if (r.stopped) record.stopped = `${name}: ${r.stopped}`;
    save();
    return r;
  };
  save();
  if (mapper) {
    stage("reading", (d, env, log) => {
      const job = join(d, "job");
      const c = runCommand(
        d,
        "map",
        [
          process.execPath,
          "src/structure-mapping-playground/trial.mjs",
          "map",
          "--strand",
          resolve(strandFile),
          "--mapper",
          mapper,
          "--out",
          job,
          "--structure-out",
          structureFile,
          "--audience",
          audiencePath,
        ],
        env,
        log,
      );
      const prompt = join(job, "prompt.md");
      if (existsSync(prompt)) record.mapper.prompt_sha256 = sha256(prompt);
      if (c.exit !== 0 || !existsSync(structureFile)) return { stopped: stopLine(c) };
      record.structure.sha256 = sha256(structureFile);
      return {};
    });
  }
  record.finished_at = new Date().toISOString();
  save();
  return { outDir, stopped: record.stopped || null };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else {
        args[key] = next;
        i++;
      }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const str = (k) => (typeof args[k] === "string" ? args[k] : null);
  const need = (keys) => {
    for (const k of keys) if (!str(k)) fail(`\`--${k}\` is required. ${USAGE}`);
  };
  if (args._cmd === "run") {
    if (str("structure") && str("mapper"))
      fail(
        `\`--structure\` and \`--mapper\` are given together: a Trial's structure is owner-authored or mapped, never both. Nothing was started. ${USAGE}`,
      );
    need(["strand", ...(str("mapper") ? [] : ["structure"]), "out"]);
    const r = runTrial({
      strand: str("strand"),
      structure: str("structure"),
      mapper: str("mapper"),
      out: str("out"),
      audience: str("audience"),
    });
    console.log(`trial directory: ${r.outDir}`);
    if (r.stopped) {
      console.log(r.stopped);
      process.exitCode = 1;
    }
  } else if (args._cmd === "map") {
    need(["strand", "mapper", "out", "structure-out", "audience"]);
    const r = mapStructure({
      strandFile: str("strand"),
      mapper: str("mapper"),
      out: str("out"),
      structureOut: str("structure-out"),
      audience: str("audience"),
    });
    if (r.stopped) {
      console.log(r.stopped);
      process.exitCode = 1;
    } else console.log(`structure written: ${r.structure}`);
  } else {
    fail(USAGE);
  }
}
