// The cases of checks/check-brief-structure-job.sh (kogaki#1833): `read_structure` as a
// Detached Job of `brief.structure_readings` units, driven by `job await` from `enter` to the
// Thesis question against a fake model binary, and the adoption over the readings it wrote.
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { JUDGE_INPUT_MARKER } from "../../../src/workflow/judge.mjs";
import { bindFlow, loadWorkflowTable } from "../../../src/workflow/run-record.mjs";
import { BRIEF_FLOW } from "../../../src/brief/job-verbs.mjs";
import { cmdAdopt, cmdMint } from "../../../src/brief/candidates.mjs";
import { parseBriefRecord } from "../../../src/compose/record.mjs";
import { JOB_UNIT_NO_TOOLS_SENTENCE, root, runRecordPath } from "../brief-reader-path-job/fixtures.mjs";

bindFlow(BRIEF_FLOW);
const fails = [];
const base = mkdtempSync(join(tmpdir(), "kogaki-1833-"));

// THE READINGS, as the model answers them: names and no ids (kogaki#1772).
const role = (name, claims) => ({ name, context: `A ${name.replace(/_/g, " ")} in a check.`, attributes: [], claims });
const rel = (name, between, from) => ({ name, between, holds: `{${between[0]}} ${name} {${between[1]}}.`, from });
const ho = (name, relates, from, holds) => ({ name, relates, from, holds });
const row = (relations, criterion) => ({ relations, criterion, verdict: "connected", why: "the claims state it." });
// A1 reaches L1 and L2, pattern (L1, L2), depth 1.
const A1 = {
  roles: [role("guard", ["L1"]), role("input", ["L1", "L2"]), role("feeder", ["L2"])],
  relations: [rel("reads", ["guard", "input"], "L1"), rel("stops", ["input", "feeder"], "L2")],
  higher_order: [ho("fails_open", ["reads", "stops"], ["L1", "L2"], "{guard} fails when {feeder} is gone.")],
  considered: [row(["reads", "stops"], ["L1", "L2"])],
};
// A2 reaches L1 and L2 under another pattern, ((L1, L2), L2), depth 2.
const A2 = {
  roles: A1.roles,
  relations: [...A1.relations, rel("waits", ["guard", "feeder"], "L2")],
  higher_order: [
    ...A1.higher_order,
    ho("waits_open", ["fails_open", "waits"], ["L2"], "{guard} waits on {feeder} and fails open."),
  ],
  considered: [...A1.considered, row(["fails_open", "waits"], ["L2"])],
};
// B reaches L1, L2 and L3, pattern (L1, L2, L3), depth 1.
const B = {
  roles: [role("guard", ["L1", "L3"]), role("input", ["L1", "L2"]), role("feeder", ["L2"])],
  relations: [...A1.relations, rel("opens", ["input", "guard"], "L3")],
  higher_order: [ho("opens_up", ["reads", "stops", "opens"], ["L1", "L2", "L3"], "{guard} opens once {feeder} stops.")],
  considered: [row(["reads", "stops", "opens"], ["L1", "L2", "L3"])],
};
// Y reaches L3 and L4 over Roles of its own; X+Y is one reading with two parts.
const Y = {
  roles: [role("gate", ["L3"]), role("key", ["L3", "L4"]), role("owner", ["L4"])],
  relations: [rel("locks", ["gate", "key"], "L3"), rel("holds_key", ["key", "owner"], "L4")],
  higher_order: [ho("owned_gate", ["locks", "holds_key"], ["L3", "L4"], "{gate} is held by {owner}.")],
  considered: [row(["locks", "holds_key"], ["L3", "L4"])],
};
const XY = Object.fromEntries(Object.keys(A1).map((k) => [k, [...A1[k], ...Y[k]]]));
// W reaches L1 to L4 at depth 2.
const W = {
  roles: [role("guard", ["L1", "L3"]), role("input", ["L1", "L2", "L4"]), role("feeder", ["L2"])],
  relations: [...B.relations, rel("lasts", ["input", "feeder"], "L4")],
  higher_order: [
    ...A1.higher_order,
    ho("whole", ["fails_open", "opens", "lasts"], ["L3", "L4"], "{guard} opens and stays open while {feeder} is gone."),
  ],
  considered: [...A1.considered, row(["fails_open", "opens", "lasts"], ["L3", "L4"])],
};
// A record the validator refuses: no `considered`.
const REFUSED = { roles: A1.roles, relations: A1.relations, higher_order: A1.higher_order };

// THE FAKE MODEL: units share one prompt, so each call claims the next slot by an atomic mkdir
// and answers the record the case names for that slot.
const judgeFor = (name, slots) => {
  const dir = join(base, `${name}-slots`);
  mkdirSync(dir);
  const file = join(base, `${name}-judge.mjs`);
  writeFileSync(
    file,
    `#!/usr/bin/env node
import { mkdirSync } from "node:fs";
const argv = process.argv.slice(2);
if (argv.includes("--version")) { process.stdout.write("fixture judge\\n"); process.exit(0); }
const format = argv[argv.indexOf("--output-format") + 1];
const NO_TOOLS = ${JSON.stringify(JOB_UNIT_NO_TOOLS_SENTENCE)};
const SLOTS = ${JSON.stringify(slots)};
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const sent = Buffer.concat(c).toString("utf8");
  const prompt = sent.startsWith(NO_TOOLS) ? sent.slice(NO_TOOLS.length).replace(/^\\s+/, "") : sent;
  if (!prompt.includes(${JSON.stringify(JUDGE_INPUT_MARKER)})) { process.stderr.write("no input\\n"); process.exit(5); }
  let n = 0;
  for (;;) { try { mkdirSync(${JSON.stringify(dir)} + "/" + n); break; } catch { n++; } }
  const record = SLOTS[Math.min(n, SLOTS.length - 1)];
  process.stdout.write((format === "stream-json" ? JSON.stringify({ type: "result", result: JSON.stringify(record) }) : JSON.stringify(record)) + "\\n");
});
`,
  );
  chmodSync(file, 0o755);
  return file;
};

const CLAIM_TEXT = {
  L1: "Guards read their inputs.",
  L2: "Inputs stop when nobody feeds them.",
  L3: "A stopped input opens the guard.",
  L4: "An owner keeps the key.",
};
const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
const settings = JSON.parse(readFileSync("kogaki.settings.json", "utf8"));
// A run standing after `enter`, over the Strands `ids` name.
const mkRun = (name, ids, readings) => {
  const dir = join(base, name);
  mkdirSync(dir);
  const strands = ids.map((id) => ({
    display_id: id,
    slug: `strand-${id}`,
    address: `coding::lesson/strand-${id}`,
    cite: `c-${id}`,
  }));
  const runState = join(dir, "run.json");
  writeFileSync(
    runState,
    JSON.stringify({
      stage: "entered",
      strands,
      strand_renderings: Object.fromEntries(
        strands.map((s) => [s.slug, { found: true, headline: CLAIM_TEXT[s.display_id], cite: s.cite }]),
      ),
    }) + "\n",
  );
  writeFileSync(
    runRecordPath(dir),
    JSON.stringify({
      workflow: { path: "src/brief-workflow.json", version: table.version },
      judge_binary: null,
      survey_record: null,
      completed: ["enter"],
      waits_reached: [],
      conditional_entered: [],
      conditional_skipped: [],
      awaiting: null,
      owner_input: {},
      artifacts_written: [],
      judgments: {},
      gate_declarations_owed: [],
      transitions: [],
      done: false,
      brief_run_state: runState,
      settled_set: { addresses: strands.map((s) => s.address), via: "supplied on the command line" },
    }) + "\n",
  );
  const settingsFile = join(dir, "settings.json");
  writeFileSync(
    settingsFile,
    JSON.stringify({
      ...settings,
      brief: { ...settings.brief, structure_readings: readings, unit_rounds: 2, call_limit_s: 60 },
    }) + "\n",
  );
  return { dir, runState, settingsFile, thesesDir: join(dir, "theses") };
};
const env = (f, judge) => ({
  ...process.env,
  KOGAKI_BRIEF_RUN_DIR: f.dir,
  KOGAKI_BRIEF_OPEN_RUN: join(f.dir, "open-run-pointer.json"),
  KOGAKI_JUDGE_CLI: judge,
  KOGAKI_SETTINGS: f.settingsFile,
});
const recOf = (f) => JSON.parse(readFileSync(runRecordPath(f.dir), "utf8"));
const drive = (f, judge) => {
  const args = ["src/brief.mjs", "run", "--theses-dir", f.thesesDir];
  const opts = { cwd: root, timeout: 120000, encoding: "utf8", env: env(f, judge) };
  const outputs = [
    spawnSync(process.execPath, args, {
      ...opts,
      input: JSON.stringify({ hook_event_name: "PostToolUse", session_id: "s-1833", tool_use_id: "toolu_1833_0" }),
    }),
  ];
  for (let i = 0; i < 20 && recOf(f).awaiting !== "THESIS_ADOPTION" && !recOf(f).done; i++)
    outputs.push(spawnSync(process.execPath, [...args, "--status", "--job", "await"], opts));
  const seen = outputs
    .map((o) => `${o.status} ${(o.stdout || "").slice(-300)} ${(o.stderr || "").slice(-300)}`)
    .join(" | ");
  return { state: JSON.parse(readFileSync(f.runState, "utf8")), rec: recOf(f), seen };
};
const labels = (state) => state.gate.options.filter((o) => o.id !== "back-to-terrain").map((o) => o.label);
const at = (f, what, d) =>
  recOf(f).awaiting === "THESIS_ADOPTION" ||
  fails.push(`${what}: the run did not reach the Thesis question: ${d.seen}`);

// (s1) five readings, three reaching L1 and L2 (two of them one pattern) and two reaching L1 to L3.
const main = mkRun("main", ["L1", "L2", "L3"], 5);
const m = drive(main, judgeFor("main", [A1, A2, A1, B, B]));
if (at(main, "(s1)", m) === true) {
  const l = labels(m.state);
  if (l.length !== 2) fails.push(`(s1) the question offers ${l.length} candidates, not 2: ${JSON.stringify(l)}`);
  if (!/; leaves L3; 3 of 5 readings — Brief: /.test(l[0] || ""))
    fails.push(`(s1) the first candidate is not the L1 and L2 one labelled 3 of 5 readings: ${l[0]}`);
  if (!/depth 1, 2 relations over 2 Strands/.test(l[0] || ""))
    fails.push(`(s1) the standing part is not the most common pattern (depth 1, 2 relations): ${l[0]}`);
  if (!/; leaves none; 2 of 5 readings — Brief: /.test(l[1] || ""))
    fails.push(`(s1) the second candidate is not the L1 to L3 one labelled 2 of 5 readings: ${l[1]}`);
  if ((m.state.reading_lines || []).some((x) => /readings were asked for/.test(x)))
    fails.push("(s1) a line says a reading failed where every unit was read");
}

// (s2) the setting at 1: what one reading yields, labelled 1 of 1 readings.
const one = mkRun("one", ["L1", "L2", "L3"], 1);
const o = drive(one, judgeFor("one", [B]));
if (at(one, "(s2)", o) === true) {
  const l = labels(o.state);
  if (l.length !== 1 || !l.every((x) => x.includes("; 1 of 1 readings — ")))
    fails.push(`(s2) one reading does not offer one candidate labelled 1 of 1 readings: ${JSON.stringify(l)}`);
}

// (s3) a unit refused in both its Rounds yields no reading: two of three are read, and the line says so.
const failed = mkRun("failed", ["L1", "L2", "L3"], 3);
const fr = drive(failed, judgeFor("failed", [A1, A1, REFUSED]));
if (at(failed, "(s3)", fr) === true) {
  const l = labels(fr.state);
  if (!(l.length === 1 && l[0].includes("; 2 of 2 readings — ")))
    fails.push(`(s3) the candidate is not labelled 2 of 2 readings: ${JSON.stringify(l)}`);
  const lines = fr.state.reading_lines || [];
  if (!lines.includes("3 readings were asked for and 2 were read."))
    fails.push(`(s3) no line says 3 readings were asked for and 2 were read: ${JSON.stringify(lines)}`);
  if (!lines.some((x) => x.startsWith("Not offered: L3 — ")))
    fails.push(`(s3) L3, which no candidate reaches, is not named: ${JSON.stringify(lines)}`);
  const decl = readFileSync(join(failed.dir, "brief-thesis-adoption.run-declaration.json"), "utf8");
  if (!decl.includes("3 readings were asked for and 2 were read."))
    fails.push("(s3) the line is not above the Thesis question in its declaration");
}

// (s4) four groups: three are offered and the fourth is named above the question.
const four = mkRun("four", ["L1", "L2", "L3", "L4"], 4);
const fo = drive(four, judgeFor("four", [XY, B, W, A1]));
if (at(four, "(s4)", fo) === true) {
  const l = labels(fo.state);
  if (l.length !== 3) fails.push(`(s4) the question offers ${l.length} candidates, not 3: ${JSON.stringify(l)}`);
  if (!/; leaves L3, L4; 2 of 4 readings — /.test(l[0] || ""))
    fails.push(`(s4) the first is not L1 and L2 at 2 of 4: ${l[0]}`);
  if (!/^.* — depth 2, .*; leaves none; 1 of 4 readings — /.test(l[1] || ""))
    fails.push(`(s4) the second is not the deeper L1 to L4 part: ${l[1]}`);
  const further = (fo.state.reading_lines || []).filter((x) =>
    /^Not offered: a Thesis over .* — 1 of 4 readings/.test(x),
  );
  if (further.length !== 1)
    fails.push(`(s4) the fourth group is not named once above the question: ${JSON.stringify(fo.state.reading_lines)}`);
}

// (s5) adopting the second candidate of (s1) mints a Brief whose `structure` is its standing part's
// reading and whose `structure_agreement` lists every part of every group with its pattern.
if (m.state.gate) {
  const pick = m.state.thesis_candidates[1];
  const decl = JSON.parse(readFileSync(join(main.dir, "brief-thesis-adoption.run-declaration.json"), "utf8"));
  const gateId = "brief-thesis-adoption";
  const digest = createHash("sha256")
    .update(JSON.stringify([gateId, m.state.gate.options.map((x) => x.id)]))
    .digest("hex");
  const capture = join(main.dir, "brief.gate-capture.json");
  writeFileSync(
    capture,
    JSON.stringify({
      rows: [
        {
          gate_id: gateId,
          gate_instance_id: decl.gate_instance_id,
          evidence: { tool: "AskUserQuestion", tool_use_id: "toolu_1833_pick" },
          answers_over: { option_set_digest: digest },
          payload: { answer: { option: pick.id } },
        },
      ],
    }) + "\n",
  );
  const terms = join(main.dir, "terms.json");
  writeFileSync(terms, JSON.stringify({ version: "1", defined_terms: [] }) + "\n");
  const log = console.log;
  console.log = () => {};
  let briefPath;
  try {
    cmdAdopt({ "run-state": main.runState, capture });
    briefPath = cmdMint({ "run-state": main.runState, "theses-dir": main.thesesDir, "defined-terms": terms });
  } finally {
    console.log = log;
  }
  const parsed = parseBriefRecord(readFileSync(briefPath, "utf8"), briefPath);
  const r = parsed.record || {};
  const st = JSON.parse(readFileSync(main.runState, "utf8"));
  const reading = st.readings[pick.reading - 1];
  if (parsed.error) fails.push(`(s5) the minted Brief does not parse: ${parsed.error}`);
  if (
    !r.structure ||
    r.structure.relations.length !== 3 ||
    JSON.stringify(r.structure.roles) !== JSON.stringify(reading.roles)
  )
    fails.push(
      `(s5) the Brief's structure is not the reading its standing part comes from: ${JSON.stringify(r.structure)}`,
    );
  const a = r.structure_agreement || {};
  const parts = (a.groups || []).flatMap((g) => g.parts || []);
  if (a.asked !== 5 || a.read !== 5 || (a.groups || []).length !== 2 || parts.length !== 5)
    fails.push(`(s5) structure_agreement does not hold 5 asked, 5 read, 2 groups and 5 parts: ${JSON.stringify(a)}`);
  if (!parts.every((p) => typeof p.pattern === "string" && Number.isInteger(p.reading) && Number.isInteger(p.depth)))
    fails.push(`(s5) a part carries no pattern, reading or depth: ${JSON.stringify(parts)}`);
  const patterns = parts.map((p) => p.pattern).sort();
  if (
    JSON.stringify(patterns) !==
    JSON.stringify(["((L1, L2), L2)", "(L1, L2)", "(L1, L2)", "(L1, L2, L3)", "(L1, L2, L3)"])
  )
    fails.push(`(s5) the patterns are not the five readings' own: ${JSON.stringify(patterns)}`);
  if (!(a.groups || [])[1] || a.groups[1].adopted !== true || a.groups[0].adopted !== false)
    fails.push(`(s5) the adopted group is not marked: ${JSON.stringify(a.groups)}`);
}

// (s6) the table is accepted: no advance sums past `advance_timeout_s`.
try {
  loadWorkflowTable("src/brief-workflow.json");
} catch (e) {
  fails.push(`(s6) the workflow table is refused: ${e.message}`);
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log("check-brief-structure-job: ok (s1)-(s6)");
