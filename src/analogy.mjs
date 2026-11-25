// analogy — the one verb that proposes a Brief's Bases (kogaki#1957): `propose` makes one model call per Leg of the
// Reader Path, or for the one named, asking for two Bases, and appends the Bases an answer gives to `analogy.yaml`
// beside the Brief under the next free ids, changing no Base already there. The file's reader and writer are
// src/compose/analogy.mjs; the instruction is prompts/analogy/propose-bases.prompt.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here. This module names no spec content.
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readBriefFiles } from "./compose.mjs";
import { analogyPathFor, appendBases, nextBaseIds, readAnalogy, relationReach } from "./compose/analogy.mjs";
import { renderPromptFile } from "./prompt-file.mjs";
import { resolveJudgeBinary, settingValue } from "./workflow/judge.mjs";
import { REPO, relFromRepo } from "./workflow/run-record.mjs";

export const PROMPT_NAME = "analogy/propose-bases";
// A refused answer is asked again; the third refusal stops the command naming the Leg.
export const PROPOSE_CALLS = 3;
export const BASES_PER_LEG = 2;
const MODEL = { setting: "brief.judge_model" };
const CALL_LIMIT_S = { setting: "brief.call_limit_s" };
// `KOGAKI_ANALOGY_RUNS` replaces runs/analogy/ FOR FIXTURES ONLY.
const runsRoot = () => process.env.KOGAKI_ANALOGY_RUNS || join(REPO, "runs", "analogy");
const USAGE = "usage: node src/analogy.mjs propose --brief <theses/<slug>/brief.yaml> [--leg <Leg id>]";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";

// THE STEP a call is handed: the Leg's Roles with their `context` and its Relations with their `holds`.
export function legStep(structure, relationId) {
  const reach = relationReach(structure, relationId);
  return {
    roles: reach.roles.map((r) => ({ id: r.id, context: r.context })),
    relations: reach.relations.map((r) => ({ id: r.id, holds: r.holds })),
  };
}

export const proposePrompt = (step) => `${renderPromptFile(PROMPT_NAME, {})}\n${JSON.stringify(step, null, 2)}\n`;

// THE REFUSAL OF AN ANSWER: not exactly two Bases; a Base with no name or description; a Role or a relation of the step
// with no thing or no sentence; an id the step does not hold, or one given twice. Returns a string or null.
export function answerRefusal(record, step) {
  if (!isMap(record) || !Array.isArray(record.bases)) return "the answer holds no `bases` list";
  if (record.bases.length !== BASES_PER_LEG) {
    return `the answer holds ${record.bases.length} Base(s), and exactly ${BASES_PER_LEG} are asked for`;
  }
  const lists = [
    ["roles", "role", "thing", step.roles],
    ["relations", "relation", "sentence", step.relations],
  ];
  for (const [i, base] of record.bases.entries()) {
    const at = `Base ${i + 1}`;
    if (!isMap(base)) return `${at} is not a record`;
    if (!isText(base.name)) return `${at} has no name`;
    if (!isText(base.description)) return `${at} has no description`;
    for (const [key, idKey, textKey, held] of lists) {
      if (!Array.isArray(base[key])) return `${at} has no \`${key}\` list`;
      const given = new Set();
      for (const e of base[key]) {
        const id = isMap(e) ? e[idKey] : undefined;
        if (!held.some((h) => h.id === id))
          return `${at}: its \`${key}\` names ${JSON.stringify(id)}, which the step does not hold`;
        if (given.has(id)) return `${at}: its \`${key}\` names ${id} twice`;
        if (!isText(e[textKey])) return `${at}: its \`${key}\` gives no ${textKey} for ${id}`;
        given.add(id);
      }
      const missing = held.find((h) => !given.has(h.id));
      if (missing) return `${at} gives no ${textKey} for ${missing.id}`;
    }
  }
  return null;
}

// An accepted answer's Bases as the file holds them, under `ids`.
export const basesOf = (record, ids) =>
  record.bases.map((b, k) => ({
    id: ids[k],
    name: b.name.trim(),
    description: b.description.trim(),
    roles: Object.fromEntries(b.roles.map((e) => [e.role, e.thing.trim()])),
    relations: Object.fromEntries(b.relations.map((e) => [e.relation, e.sentence.trim()])),
  }));

function answerText(stdout) {
  const env = JSON.parse(stdout);
  if (typeof env === "string") return env;
  if (env && typeof env.result === "string") return env.result;
  throw new Error("the call's json answer carries no string `result`");
}

// ONE MODEL CALL: `{ record }`, `{ refusal }` for an answer that is not one JSON record, or `{ died }`. src/satellite.mjs
// makes its calls through it (kogaki#1963).
export function oneCall(judge, prompt) {
  const argv = [
    "-p",
    "--model",
    String(settingValue(MODEL)),
    "--output-format",
    "json",
    "--tools",
    "",
    "--disable-slash-commands",
    "--strict-mcp-config",
    "--setting-sources",
    "",
    "--no-session-persistence",
  ];
  const r = spawnSync(judge, argv, {
    input: prompt,
    encoding: "utf8",
    timeout: 1000 * Number(settingValue(CALL_LIMIT_S)),
    maxBuffer: 64 * 1024 * 1024,
  });
  const raw = String(r.stdout ?? "");
  if (r.error) {
    const code = /** @type {NodeJS.ErrnoException} */ (r.error).code;
    return { raw, died: `the call could not finish (${code || "spawn failed"}: ${r.error.message})` };
  }
  if (r.status !== 0) {
    const said =
      String(r.stderr || "")
        .trim()
        .split("\n")[0] || "(no stderr)";
    return { raw, died: `the call exited ${r.status === null ? `on ${r.signal}` : r.status}: ${said}` };
  }
  try {
    const text = answerText(raw)
      .trim()
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/, "");
    return { raw, record: JSON.parse(text) };
  } catch (e) {
    return { raw, refusal: `the answer is not one JSON record (${e.message})` };
  }
}

// THE CALLS OF ONE LEG, each kept under `dir`: `{ record }` or `{ stopped }`.
function proposeForLeg(judge, leg, step, dir) {
  const prompt = proposePrompt(step);
  let last = null;
  for (let n = 1; n <= PROPOSE_CALLS; n++) {
    const d = join(dir, `call-${n}`);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "input.json"), `${JSON.stringify(step, null, 2)}\n`);
    writeFileSync(join(d, "prompt.txt"), prompt);
    const out = oneCall(judge, prompt);
    writeFileSync(join(d, "answer.txt"), out.raw);
    if (out.died) return { stopped: `Leg ${leg.leg_id}: the call died: ${out.died}` };
    last = out.refusal ?? answerRefusal(out.record, step);
    if (!last) return { record: out.record };
    writeFileSync(join(d, "refusal.txt"), `${last}\n`);
  }
  return {
    stopped: `Leg ${leg.leg_id}: its answer was refused ${PROPOSE_CALLS} times, and no Base was written for it; the last refusal: ${last}`,
  };
}

// PROPOSE: `{ lines }` naming the Bases written per Leg, or `{ error, lines }` where it stopped.
export function propose(briefPath, { leg = null } = {}) {
  const r = readBriefFiles(briefPath);
  if (r.error) return { error: r.error, lines: [] };
  const { structure, reader_path: legs } = r.record;
  const chosen = leg === null ? legs : legs.filter((l) => l.leg_id === leg);
  if (!chosen.length) return { error: `the Brief has no Leg ${leg}`, lines: [] };
  const path = analogyPathFor(briefPath);
  const held = readAnalogy(briefPath, structure);
  if (held.error) return { error: `${held.error}. Nothing was written`, lines: [] };
  const judge = resolveJudgeBinary(process.env.KOGAKI_JUDGE_CLI || "claude", process.env.PATH).path;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = join(runsRoot(), basename(dirname(resolve(briefPath))), stamp);
  const lines = [];
  for (const l of chosen) {
    const step = legStep(structure, l.relation);
    const got = proposeForLeg(judge, l, step, join(runDir, String(l.leg_id)));
    if (got.stopped) return { error: got.stopped, lines };
    const current = readAnalogy(briefPath, structure);
    const bases = basesOf(got.record, nextBaseIds(current.record, BASES_PER_LEG));
    appendBases(path, current.absent ? null : current, bases);
    lines.push(`Leg ${l.leg_id}: wrote ${bases.map((b) => b.id).join(", ")} to ${relFromRepo(path)}`);
  }
  return { lines };
}

function main(argv) {
  const flag = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const briefPath = flag("brief");
  const leg = flag("leg");
  if (argv[0] !== "propose" || !isText(briefPath) || (argv.includes("--leg") && !isText(leg))) {
    process.stderr.write(`${USAGE}\n`);
    process.exit(2);
  }
  const r = propose(resolve(briefPath), { leg: leg ?? null });
  if (r.lines.length) process.stdout.write(`${r.lines.join("\n")}\n`);
  if (r.error) {
    process.stderr.write(`analogy: ${r.error}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
