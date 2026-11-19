// The cases of checks/check-paragraph-plan-job.sh: a ParagraphPlan job keeps every finished Leg (kogaki#1641, owner
// decision 2026-10-31), each Leg's two steps run as one unit (kogaki#1865, kogaki#1876). Driven end to end through
// `node src/paragraph-plan.mjs start|await` over the shared fixture, checks/fixtures/paragraph-plan/stage.mjs:
// (a) one Leg's call dies, its sibling finishes and is kept; (b) one Leg's reading is refused twice, its sibling is
// kept; (c) a run handed (b) as its prior run plans the refused Leg alone and writes the plan file whole; (d) a run
// over a changed Brief, and (d2) one after a written plan, carry nothing; (f) the job report lists each Leg's five
// reading Call Records and no sixth; (g) a fresh job writes the current record names only.
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const repo = resolve(".");
process.env.KOGAKI_JOB_HEARTBEAT_MS = "100";
const fails = [];
let cases = 0;
const ok = (cond, msg) => {
  cases++;
  if (!cond) fails.push(msg);
};
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const { readReaderPathJob } = await imp("src/workflow/detached-job.mjs");
const { RETIRED_NAMES } = await imp("src/workflow/call-record.mjs");
const F = await imp("checks/fixtures/paragraph-plan/stage.mjs");
const root = mkdtempSync(join(tmpdir(), "paragraph-plan-job-"));
const { runStage, newBrief } = F.makeFixture(root);
const table = JSON.parse(readFileSync("src/paragraph-plan-workflow.json", "utf8"));
ok(table.job.unit_isolation === true, "the ParagraphPlan job table does not set `unit_isolation: true`");
const unit = (job, id) => ((job && job.units) || []).find((u) => u.id === id);
const jobOf = (r) => readReaderPathJob(r.dir) || {};

// (a) ONE LEG DIES; ITS SIBLING FINISHES AND IS KEPT.
const a = runStage("die:s2");
{
  const j = jobOf(a);
  ok(a.wait.status !== 0 && !a.plan, `(a) the stage was not stopped, or a plan file was written: ${a.out}`);
  ok(j.state === "died", `(a) the job did not end died: ${j.state}`);
  ok(
    (unit(j, "leg-2") || {}).status === "died",
    `(a) the dying Leg's unit is not died: ${JSON.stringify(unit(j, "leg-2"))}`,
  );
  const u1 = unit(j, "leg-1") || {};
  ok(
    u1.status === "done" && u1.candidate_file && existsSync(u1.candidate_file),
    `(a) the sibling is not done and kept: ${JSON.stringify(u1)}`,
  );
  ok(!(j.units || []).some((u) => u.status === "killed"), "(a) a unit was killed on the tick the job ended died");
  ok(
    /Kept: Leg s1 finished and is kept in the run directory/.test(a.out),
    `(a) the stop lines do not name the kept Leg: ${a.out}`,
  );
  ok(/Leg s2: died/.test(a.out), `(a) the stop lines do not name the died Leg: ${a.out}`);
  ok(
    /Next: run \/paragraph-plan on the same Brief again; it plans Leg s2 only and carries the kept Legs/.test(a.out),
    `(a) the stop lines do not say the next run plans s2 only: ${a.out}`,
  );
}

// (b) ONE LEG'S READING IS REFUSED TWICE; ITS SIBLING IS KEPT.
const b = runStage("refuse-twice:s2");
{
  const j = jobOf(b);
  ok(b.wait.status !== 0 && !b.plan, `(b) the stage was not stopped, or a plan file was written: ${b.out}`);
  ok(j.state === "refused", `(b) the job did not end refused: ${j.state}`);
  ok(
    (unit(j, "leg-2") || {}).status === "refused",
    `(b) the refused Leg's unit is not refused: ${JSON.stringify(unit(j, "leg-2"))}`,
  );
  const u1 = unit(j, "leg-1") || {};
  ok(
    u1.status === "done" && u1.candidate_file && existsSync(u1.candidate_file),
    `(b) the sibling is not done and kept: ${JSON.stringify(u1)}`,
  );
  ok(
    /Leg s2: refused/.test(b.out) && /refused 2 times/.test(b.out),
    `(b) the stop lines do not name the refused Leg: ${b.out}`,
  );
}

// (c) THE RESUME PLANS THE REFUSED LEG ONLY, CARRIES THE OTHER, AND WRITES THE FILE WHOLE.
const c = runStage("ok", { brief: b.brief, priorRun: b.dir });
{
  const j = jobOf(c);
  ok(c.wait.status === 0 && c.plan, `(c) the resume did not finish: ${c.out}`);
  ok(
    c.calls.length === 5 && c.calls.every((x) => x.leg === "s2"),
    `(c) the resume did not plan the unfinished Leg alone: ${JSON.stringify(c.calls)}`,
  );
  const u1 = unit(j, "leg-1") || {};
  ok(
    u1.status === "done" && u1.carried_from && resolve(u1.carried_from) === resolve(b.dir),
    `(c) Leg s1 is not carried from the earlier run: ${JSON.stringify(u1)}`,
  );
  ok(
    u1.candidate_file && u1.candidate_file.startsWith(c.dir) && existsSync(u1.candidate_file),
    "(c) the carried candidate file was not copied",
  );
  const start = JSON.parse(readFileSync(join(c.dir, "paragraph-plan-start.json"), "utf8"));
  ok(
    JSON.stringify((start.carried || []).map((x) => `${x.unit}:${x.leg_id}`)) === '["leg-1:s1"]',
    `(c) the start record does not name the carried Leg: ${JSON.stringify(start.carried)}`,
  );
  ok(
    c.plan &&
      c.plan.legs.map((l) => l.leg_id).join() === "s1,s2" &&
      c.plan.legs.every((l) => Object.keys(l).sort().join() === "leg_id,segments"),
    `(c) the plan file does not carry every Leg whole: ${JSON.stringify(c.plan)}`,
  );
}

// (d) A DIFFERENT BRIEF CARRIES NOTHING; (d2) NOR DOES A PRIOR RUN WHOSE PLAN FILE WAS WRITTEN.
{
  const other = newBrief();
  writeFileSync(
    other,
    readFileSync(other, "utf8").replace(
      "What the rule starts stops the request.\n",
      "What the rule starts stops the request, edited.\n",
    ),
  );
  const d = runStage("ok", { brief: other, priorRun: b.dir });
  ok(d.calls.length === 10, `(d) a run over a changed Brief did not plan every Leg: ${d.calls.length} calls, ${d.out}`);
  ok(!(jobOf(d).units || []).some((u) => u.carried_from), "(d) a run over a changed Brief carried a Leg");
  const d2 = runStage("ok", { brief: c.brief, priorRun: c.dir });
  ok(d2.calls.length === 10, `(d2) a run after a written plan did not plan every Leg: ${d2.calls.length} calls`);
  ok(!(jobOf(d2).units || []).some((u) => u.carried_from), "(d2) a run after a written plan carried a Leg");
}

// (f) THE JOB REPORT LISTS EACH LEG'S CALL RECORDS: five readings and no sixth call, under the Leg's unit; the unit
// ends once the Move is fitted, its record carrying the Move, its fit and the Segments.
{
  const out = spawnSync(process.execPath, ["src/workflow/job-report.mjs", c.dir], { encoding: "utf8" }).stdout || "";
  const want = [1, 2, 3, 4, 5].map((k) => `unit leg-2/reading-${k}:`);
  const missing = want.filter((w) => !out.includes(w));
  ok(
    !missing.length && (out.match(/call \d+ —/g) || []).length === 5,
    `(f) the job report does not list the Leg's five Call Records and no other (missing ${missing.join(", ")}): ${out}`,
  );
  const recorded = readdirSync(join(c.dir, "calls", "leg-2"))
    .sort()
    .join();
  ok(
    recorded === "reading-1,reading-2,reading-3,reading-4,reading-5",
    `(f) the Leg's unit wrote a Call Record beside its five readings: ${recorded}`,
  );
  const ended = (unit(jobOf(c), "leg-2") || {}).candidate || {};
  ok(
    Object.keys(ended).sort().join() === "fit,leg_id,move,segments",
    `(f) the unit's record is not the Leg's id, the Move, its fit and the Segments: ${JSON.stringify(ended)}`,
  );
  const refused =
    spawnSync(process.execPath, ["src/workflow/job-report.mjs", b.dir], { encoding: "utf8" }).stdout || "";
  ok(
    /unit leg-2\/reading-1:[\s\S]*pairs[^\n]*: /.test(refused),
    `(f) the report does not show the refused reading's refusal: ${refused}`,
  );
}

// (g) A FRESH JOB WRITES THE CURRENT NAMES ONLY (kogaki#1760): `calls/<unit>/`, `unit_rounds`, and per unit `rounds`
// and `call_records`, with no retired name anywhere on the record.
{
  const j = jobOf(c);
  const retired = Object.values(RETIRED_NAMES);
  ok(
    !existsSync(join(c.dir, RETIRED_NAMES.dir)) &&
      existsSync(join(c.dir, "calls", "leg-2", "reading-5", "1")) &&
      Number.isInteger(j.unit_rounds) &&
      [j, ...(j.units || [])].every((o) => !Object.keys(o).some((k) => retired.includes(k))),
    `(g) a fresh ParagraphPlan job wrote a retired name, or not calls/ and unit_rounds: ${JSON.stringify(j).slice(0, 800)}`,
  );
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log(`paragraph-plan-job: ${cases} case(s) pass`);
