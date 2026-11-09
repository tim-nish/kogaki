#!/usr/bin/env bash
# check-call-replay -- `node src/workflow/replay.mjs` over Call Records written by the short Trial's `retriedCall` with a stub binary (kogaki#1718):
#   (a) `--mode judge` on a refused `smp_bind_move` Call reports `same` and writes refusal.json under `replays/<timestamp>/`.
#   (b) `--mode render` on Call 1 reports `same` against Call 2's prompt.md, and on a detached job's record re-renders
#       through `readerPathUnitRetryPrompt`, reporting `same`.
#   (c) `--mode model --prompt <edited>` sends the edited prompt to the stub, writes answer.raw, answer.json and refusal.json
#       beside the record, and leaves the record's own files unchanged.
#   (d) a record whose binary's sha256 no longer matches is refused in `--mode model` naming both hashes.
#   (e) the job report lists each unit's Calls with the refusal's group and reach and each replay.
#   (f) a run written under the retired names (kogaki#1760) is listed by the job report and re-rendered by replay.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync, appendFileSync, rmSync, cpSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const repo = resolve(".");
const load = (p) => import(pathToFileURL(join(repo, p)).href);
const { retriedCall } = await load("src/mapping-playground/short.mjs");
const { writeCallRecord } = await load("src/workflow/call-record.mjs");
const { readerPathUnitRetryPrompt } = await load("src/workflow/detached-job.mjs");
const { jobCallsReport } = await load("src/workflow/job-report.mjs");
const root = mkdtempSync(join(tmpdir(), "check-call-replay-"));
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");

// THE STUB: answers each call with the next record of its answers file, in the `json` envelope, and keeps each stdin.
const stub = join(root, "stub.mjs");
writeFileSync(stub, `#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
const dir = process.env.STUB_DIR;
const stdin = readFileSync(0, "utf8");
appendFileSync(dir + "/seen.txt", JSON.stringify(stdin) + "\\n");
const n = existsSync(dir + "/n") ? Number(readFileSync(dir + "/n", "utf8")) : 0;
writeFileSync(dir + "/n", String(n + 1));
const answers = JSON.parse(readFileSync(dir + "/answers.json", "utf8"));
process.stdout.write(JSON.stringify({ result: JSON.stringify(answers[Math.min(n, answers.length - 1)]) }));
`);
chmodSync(stub, 0o755);
const env = { ...process.env, KOGAKI_JUDGE_CLI: stub, STUB_DIR: root };
delete env.KOGAKI_PROOF_SHEET_REAL_CLI;
const NOWHERE = { base_move: "nowhere", case: "own", inference_move: null };
const FOUND = { base_move: "m-plain", case: "own", inference_move: null };
writeFileSync(join(root, "answers.json"), JSON.stringify([NOWHERE, FOUND]));

const table = JSON.parse(readFileSync(join(repo, "src/mapping-playground/playground-workflow.json"), "utf8"));
const row = { id: "smp_bind_move", ...table.smp_bind_move };
const input = { structure: { roles: [] }, persona: { reader: "a reader", prior_knowledge: "none" },
  moves: [{ id: "m-plain", description: null, segments: [], takes: [], leaves: [] }] };
const dir = join(root, "bind");
const r = retriedCall({ dir, env, row, input, validator: "bindMoveRefusal",
  refusalOf: (answer) => (answer.base_move === "m-plain" ? null : { group: "library", text: `base_move ${JSON.stringify(answer.base_move)} names no Move of the library` }) });
ok(r.answer && r.answer.base_move === "m-plain", `the fixture's second call did not pass: ${JSON.stringify(r)}`);
const at = (n) => join(dir, "calls", "smp_bind_move", String(n));
const replay = (d, ...args) => spawnSync(process.execPath, ["src/workflow/replay.mjs", d, ...args], { encoding: "utf8", env });
const resultOf = (res) => {
  const m = /written: (.+)$/m.exec(res.stdout);
  return m && existsSync(join(m[1], "result.json")) ? { dir: m[1], ...JSON.parse(readFileSync(join(m[1], "result.json"), "utf8")) } : null;
};
const recordFiles = (d) => Object.fromEntries(readdirSync(d).filter((f) => f !== "replays").map((f) => [f, sha(join(d, f))]));
const before = recordFiles(at(1));

// (a) judge
const ja = replay(at(1), "--mode", "judge");
const jr = resultOf(ja);
ok(ja.status === 0 && /^judge: same$/m.test(ja.stdout) && jr && jr.verdict === "same" && existsSync(join(jr.dir, "refusal.json"))
  && JSON.parse(readFileSync(join(jr.dir, "refusal.json"), "utf8")).text === JSON.parse(readFileSync(join(at(1), "refusal.json"), "utf8")).text,
  `(a) the judge replay of a recorded refusal did not report same: ${ja.status} ${ja.stdout}${ja.stderr}`);

// (b) render, the short Trial's and a job's
const ra = replay(at(1), "--mode", "render");
const rr = resultOf(ra);
ok(ra.status === 0 && /^render: same$/m.test(ra.stdout) && rr && readFileSync(join(rr.dir, "prompt.md"), "utf8") === readFileSync(join(at(2), "prompt.md"), "utf8"),
  `(b) the render replay of call 1 did not report same against call 2's prompt: ${ra.status} ${ra.stdout}${ra.stderr}`);
const job = join(root, "job");
const FIRST = "You are running with no tools.\n\nCompose the record.\n";
const REFUSAL = "legs[0].waypoints is empty";
const jobRecord = (n, prompt, refusal) => writeCallRecord(job, "u1", n, { prompt, argv: { argv: [], output_format: "stream-json" }, cli: null,
  input: null, row: { phase: "compose", row: null, tables: [] }, raw: "", answer: { legs: [] }, refusal });
jobRecord(1, FIRST, { group: null, reach: null, text: REFUSAL, validator: "validateReaderPathUnit" });
jobRecord(2, readerPathUnitRetryPrompt(FIRST, [{ answer: { legs: [] }, refusal: REFUSAL }]), null);
const jra = replay(join(job, "calls", "u1", "1"), "--mode", "render");
ok(jra.status === 0 && /^render: same$/m.test(jra.stdout), `(b) the render replay of a job record did not report same: ${jra.status} ${jra.stdout}${jra.stderr}`);

// (f) A RUN WRITTEN UNDER THE RETIRED NAMES (kogaki#1760): the job's records under the retired directory, beside a job
// record whose unit carries the retired fields, are listed by the job report and re-rendered by replay as the new ones are.
{
  const { RETIRED_NAMES, callsRoot, callRecordsOf, firstCallSecondsOf } = await load("src/workflow/call-record.mjs");
  const old = join(root, "job-old");
  cpSync(join(job, "calls"), join(old, RETIRED_NAMES.dir), { recursive: true });
  const unit = { id: "u1", [RETIRED_NAMES.records]: join(old, RETIRED_NAMES.dir, "u1"), [RETIRED_NAMES.firstCallS]: 7 };
  writeFileSync(join(old, "reader-path-job.json"), JSON.stringify({ state: "done", units: [unit] }));
  ok(callsRoot(old) === join(old, RETIRED_NAMES.dir) && callsRoot(job) === join(job, "calls"),
    `(f) callsRoot did not fall back to the retired directory only where calls/ is absent: ${callsRoot(old)} ${callsRoot(job)}`);
  ok(callRecordsOf(unit) === unit[RETIRED_NAMES.records] && firstCallSecondsOf(unit) === 7,
    `(f) a unit row under the retired fields was not read: ${JSON.stringify(unit)}`);
  const oldReport = jobCallsReport(old).join("\n");
  ok(/unit u1:\n {4}call 1 — /.test(oldReport) && /call 2 — passed/.test(oldReport),
    `(f) the job report does not list the Calls of a run written under the retired names: ${oldReport}`);
  const ora = replay(join(old, RETIRED_NAMES.dir, "u1", "1"), "--mode", "render");
  ok(ora.status === 0 && /^render: same$/m.test(ora.stdout),
    `(f) the render replay of a record under the retired directory did not report same: ${ora.status} ${ora.stdout}${ora.stderr}`);
}

// (c) model, with an edited prompt
const edited = join(root, "edited.md");
writeFileSync(edited, "EDITED ARM\n" + readFileSync(join(at(1), "prompt.md"), "utf8"));
writeFileSync(join(root, "n"), "0");
const ma = replay(at(1), "--mode", "model", "--prompt", edited);
const mr = resultOf(ma);
const seen = readFileSync(join(root, "seen.txt"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
ok(ma.status === 0 && mr && ["answer.raw", "answer.json", "refusal.json"].every((f) => existsSync(join(mr.dir, f)))
  && seen[seen.length - 1].startsWith("EDITED ARM") && mr.verdict === "refused"
  && JSON.parse(readFileSync(join(mr.dir, "refusal.json"), "utf8")).group === "library",
  `(c) the model replay did not send the edited prompt and write the three files: ${ma.status} ${ma.stdout}${ma.stderr}`);
ok(JSON.stringify(recordFiles(at(1))) === JSON.stringify(before), "(c) a replay changed the record's own files");

// (e) the job report: the record's Calls and its replays
const report = jobCallsReport(dir).join("\n");
ok(/unit smp_bind_move:\n {4}call 1 — library, record: base_move "nowhere" names no Move of the library/.test(report)
  && /call 2 — passed/.test(report) && /replay judge: same/.test(report) && /replay model: refused/.test(report),
  `(e) the job report does not list the calls with their group, reach and replays: ${report}`);

// (d) the binary changed under the record
const old = sha(stub);
appendFileSync(stub, "// changed\n");
const da = replay(at(1), "--mode", "model");
ok(da.status === 2 && da.stderr.includes(old) && da.stderr.includes(sha(stub)),
  `(d) a model replay against a changed binary was not refused naming both hashes: ${da.status} ${da.stderr}`);

rmSync(root, { recursive: true, force: true });
if (fails.length) { for (const f of fails) console.log(`FAIL: ${f}`); process.exit(1); }
console.log("check-call-replay: ok");
JS
