#!/usr/bin/env node
// The judge bench — an ablation over the ParagraphPlan judge's axes (kogaki#1533, owner
// decision 2026-10-23). For one axis, or `all`, it runs the production judge over the axis's
// fixtures from src/paragraph-plan-axes.json twice: with the row as rendered, and with that
// axis's one line taken out. Each arm is `--draws` calls per fixture record, made with the
// model, argv and row the ParagraphPlan job uses. A defect is refused where its own Leg
// Waypoint is judged `does-not-fit`; a clean record passes where every Leg Waypoint `fits`.
//
// It writes `<run>/bench.json` -- per axis the four rates and whether the registry's
// retention rule keeps it -- and every call to `<run>/calls.jsonl`. `--record` writes each
// kept axis's `justified_by` into the registry and removes an axis the rule does not keep,
// with the records no other axis names; `--record-from <run>/bench.json` does so for a run
// already made. Runs live under the ignored run tree.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, relFromRepo, bindFlow } from "../workflow/run-record.mjs";
import { resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { PARAGRAPH_PLAN_TABLE, PARAGRAPH_PLAN_AXES, readAxes, axisRecord, axesFailures,
  renderRowHead } from "../paragraph-plan.mjs";

export const BENCH_FILE = "bench.json";
const CALLS_FILE = "calls.jsonl";
const RUN_ROOT = join(REPO, "runs", "judge-bench");
// The ParagraphPlan job's own argv (src/workflow/detached-job.mjs), so a bench call is that call.
const ARGV = (model) => ["-p", "--model", model, "--output-format", "stream-json", "--verbose",
  "--include-partial-messages", "--tools", "", "--disable-slash-commands", "--strict-mcp-config",
  "--setting-sources", "", "--no-session-persistence"];
const READ_TRIES = 3;

function fail(msg) {
  process.stderr.write(`judge-bench: ${msg}\n`);
  process.exit(1);
}

const sha = (s) => createHash("sha256").update(s).digest("hex");

// The row's prompt head with every axis of the registry benched, and with one axis's line taken out.
export function benchHeads(axis, registryPath = PARAGRAPH_PLAN_AXES) {
  const table = JSON.parse(readFileSync(PARAGRAPH_PLAN_TABLE, "utf8"));
  const row = { id: "paragraph_plan_judge_unit", ...table.paragraph_plan_judge_unit, axes_file: registryPath };
  const held = bindFlow({ lane: "paragraph-plan", label: "ParagraphPlan" });
  let withAxis;
  try { withAxis = renderRowHead(row); } finally { bindFlow(held); }
  const line = `- ${axis.id}: ${axis.sentence}\n`;
  if (withAxis.split(line).length !== 2) throw new Error(`the rendered judge row does not carry the axis ${axis.id} once`);
  return { with: withAxis, without: withAxis.replace(line, "") };
}

// The verdict record from a stream-json transcript: the `result` of its last result line.
export function verdictOf(stdout) {
  const lines = String(stdout || "").split("\n").filter((l) => l.trim());
  for (let i = lines.length - 1; i >= 0; i--) {
    let o;
    try { o = JSON.parse(lines[i]); } catch { continue; }
    if (!o || o.type !== "result") continue;
    let r = o.result;
    if (typeof r === "string") {
      const a = r.indexOf("{");
      const b = r.lastIndexOf("}");
      try { r = JSON.parse(r.slice(a, b + 1)); } catch { return null; }
    }
    return r && Array.isArray(r.verdicts) ? r : null;
  }
  return null;
}

function callOnce(binary, model, prompt, limitS) {
  return new Promise((done) => {
    const child = spawn(binary, ARGV(model), { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1" } });
    let out = "";
    child.stdout.on("data", (b) => { out += b; });
    child.stderr.on("data", () => {});
    const timer = setTimeout(() => child.kill("SIGKILL"), limitS * 1000);
    child.on("close", () => { clearTimeout(timer); done(out); });
    child.stdin.on("error", () => {});
    child.stdin.end(prompt);
  });
}

// One fixture record judged once: `refused` and `passed` read from its verdicts, or
// `unread` where no try in `READ_TRIES` gave a verdict record.
async function judgeOnce(ctx, prompt) {
  for (let t = 1; t <= READ_TRIES; t++) {
    const out = await callOnce(ctx.binary, ctx.model, prompt, ctx.limitS);
    const v = verdictOf(out);
    if (v) return v;
  }
  return null;
}

async function pool(jobs, width) {
  const results = new Array(jobs.length);
  let next = 0;
  const worker = async () => { while (next < jobs.length) { const i = next++; results[i] = await jobs[i](); } };
  await Promise.all(Array.from({ length: Math.max(1, width) }, worker));
  return results;
}

const rate = (hits, n) => (n ? Math.round((hits / n) * 1000) / 1000 : null);

// The registry's retention rule over one axis's rates.
export function keeps(retention, r, draws) {
  return draws >= retention.draws_min
    && r.defect_refused_with !== null && r.defect_refused_with >= retention.defect_refused_with_min
    && r.defect_refused_without !== null && r.defect_refused_without <= retention.defect_refused_without_max
    && r.clean_passed_with !== null && r.clean_passed_with >= retention.clean_passed_with_min;
}

export async function bench({ axisIds, draws, out, parallel, registryPath }) {
  const registry = readAxes(registryPath);
  const table = JSON.parse(readFileSync(PARAGRAPH_PLAN_TABLE, "utf8"));
  const ctx = {
    binary: resolveJudgeBinary(String(process.env.KOGAKI_JUDGE_CLI || table.judge.command), process.env.PATH).path,
    model: String(settingValue(table.judge.model)),
    limitS: Number(settingValue(table.job.call_limit_s)),
  };
  mkdirSync(out, { recursive: true });
  const memo = new Map();
  const judged = (prompt, draw) => {
    const key = `${sha(prompt)}:${draw}`;
    if (!memo.has(key)) memo.set(key, judgeOnce(ctx, prompt));
    return memo.get(key);
  };
  const report = { date: new Date().toISOString(), run: relFromRepo(out), model: ctx.model, draws, axes: {} };
  const jobs = [];
  const tallies = new Map();
  for (const id of axisIds) {
    const axis = registry.axes.find((a) => a.id === id);
    if (!axis) throw new Error(`src/paragraph-plan-axes.json declares no axis ${JSON.stringify(id)}`);
    const heads = benchHeads(axis, registryPath);
    const tally = { with: { defect: [], clean: [] }, without: { defect: [], clean: [] } };
    tallies.set(id, tally);
    for (const arm of ["with", "without"]) {
      for (const kind of ["defect", "clean"]) {
        for (const name of axis.fixtures[kind]) {
          const input = axisRecord(registry, name);
          const at = registry.records[name].at_waypoint;
          const prompt = `${heads[arm]}${JSON.stringify(input, null, 2)}`;
          for (let d = 1; d <= draws; d++) {
            jobs.push(async () => {
              const v = await judged(prompt, d);
              const verdicts = v ? v.verdicts : null;
              const hit = !verdicts ? null : kind === "defect"
                ? (verdicts[at - 1] || {}).verdict === "does-not-fit"
                : verdicts.every((x) => x.verdict === "fits");
              appendFileSync(join(out, CALLS_FILE), `${JSON.stringify({ axis: id, arm, kind, record: name, draw: d, prompt_sha256: sha(prompt), verdict: v })}\n`);
              tally[arm][kind].push(hit);
            });
          }
        }
      }
    }
  }
  // Every axis's calls share one pool, so the width holds across the whole run.
  await pool(jobs, parallel);
  const read = (xs) => xs.filter((x) => x !== null);
  const share = (xs) => rate(read(xs).filter(Boolean).length, read(xs).length);
  for (const [id, tally] of tallies) {
    const r = {
      defect_refused_with: share(tally.with.defect),
      defect_refused_without: share(tally.without.defect),
      clean_passed_with: share(tally.with.clean),
      clean_passed_without: share(tally.without.clean),
    };
    const unread = Object.values(tally).flatMap((k) => Object.values(k)).flat().filter((x) => x === null).length;
    // An unread call leaves the axis unmeasured, which is never a reason to remove it.
    report.axes[id] = { rates: r, unread, measured: unread === 0, kept: unread === 0 && keeps(registry.retention, r, draws) };
  }
  writeJson(join(out, BENCH_FILE), report);
  return report;
}

function writeJson(path, doc) {
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);
}

// `--record`: a kept axis gets its `justified_by`; a measured axis the rule does not keep leaves
// the registry with every record no remaining axis reaches; an unmeasured axis is left as it was.
// A record that would leave no axis is refused, since `start` refuses an empty registry.
export function recordBench(report, registryPath) {
  const registry = readAxes(registryPath);
  const removed = [];
  for (const [id, a] of Object.entries(report.axes)) {
    const axis = registry.axes.find((x) => x.id === id);
    if (!axis || a.measured === false || a.unread > 0) continue;
    if (a.kept) axis.justified_by = { date: report.date.slice(0, 10), run: report.run, draws: report.draws, rates: a.rates };
    else { registry.axes = registry.axes.filter((x) => x.id !== id); removed.push(id); }
  }
  if (!registry.axes.length) throw new Error(`recording ${report.run} would remove every axis (${removed.join(", ")}); nothing was recorded`);
  const reached = new Set();
  const reach = (n) => { if (!n || reached.has(n)) return; reached.add(n); reach((registry.records[n] || {}).from); };
  for (const a of registry.axes) for (const n of [...a.fixtures.defect, ...a.fixtures.clean]) reach(n);
  for (const n of Object.keys(registry.records)) if (!reached.has(n)) delete registry.records[n];
  writeJson(registryPath, registry);
  return removed;
}

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith("--")) fail(`unexpected argument ${JSON.stringify(k)}`);
    const name = k.slice(2);
    if (name === "record") { a.record = true; continue; }
    a[name] = argv[++i];
  }
  return a;
}

async function main() {
  const usage = "usage: node src/proof-sheet/judge-bench.mjs --axis <id|all> --draws <N> [--out <dir>] [--parallel <k>] [--record] [--registry <file>], or --record-from <run>/bench.json [--registry <file>]";
  const a = parseArgs(process.argv.slice(2));
  if (a["record-from"]) {
    const registryPath = a.registry ? resolve(a.registry) : PARAGRAPH_PLAN_AXES;
    const removed = recordBench(JSON.parse(readFileSync(resolve(a["record-from"]), "utf8")), registryPath);
    console.log(`recorded into ${relFromRepo(registryPath)}${removed.length ? `; removed ${removed.join(", ")}` : ""}`);
    return;
  }
  if (!a.axis || !a.draws) fail(usage);
  const draws = Number(a.draws);
  if (!Number.isInteger(draws) || draws <= 0) fail(`--draws takes a positive integer. ${usage}`);
  const registryPath = a.registry ? resolve(a.registry) : PARAGRAPH_PLAN_AXES;
  const registry = readAxes(registryPath);
  const shape = axesFailures(registry).filter((f) => !/justified_by/.test(f));
  if (shape.length) fail(`the registry is malformed: ${shape.join("; ")}`);
  const axisIds = a.axis === "all" ? registry.axes.map((x) => x.id) : [a.axis];
  const out = a.out ? resolve(a.out) : join(RUN_ROOT, new Date().toISOString().replace(/[:.]/g, "-"));
  const report = await bench({ axisIds, draws, out, parallel: Number(a.parallel) || 6, registryPath });
  for (const [id, x] of Object.entries(report.axes)) {
    const r = x.rates;
    console.log(`${id}: defect refused ${r.defect_refused_with} with / ${r.defect_refused_without} without; `
      + `clean passed ${r.clean_passed_with} with / ${r.clean_passed_without} without; unread ${x.unread} -- ${x.kept ? "kept" : x.measured ? "not kept" : "not measured"}`);
  }
  console.log(`bench: ${relFromRepo(join(out, BENCH_FILE))}`);
  if (a.record) {
    const removed = recordBench(report, registryPath);
    console.log(`recorded into ${relFromRepo(registryPath)}${removed.length ? `; removed ${removed.join(", ")}` : ""}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((e) => fail(e.message));
}
