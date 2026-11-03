#!/usr/bin/env bash
# check-mapping-playground -- one command runs a Trial of the Structure-Mapping Playground (kogaki#1664).
# Driven end to end through `node src/mapping-playground/trial.mjs run` with ONE fake model binary
# (`KOGAKI_JUDGE_CLI`) answering every stage, never the actual `claude` CLI:
#   (a) the run exits 0 with every stage `done`, and each model stage's `calls.jsonl` holds the calls the binary saw.
#   (b) a structure whose `context` carries a content word of the `claim:` is refused naming the word and the field.
#   (c) a `point` carrying such a word refuses the Leg attempt naming the word.
#   (d) the Writer's recorded stdin equals the Packet file byte for byte.
#   (e) the repository's `moves/` and `theses/` are unchanged.
#   (f) `trial.json` carries the Trial record's fields, and `reading.md` exists and is empty under its header.
#   (g) a run without `--structure` refuses naming the flag.
#   (h) a `--mapper sme_map_roles` Trial over a valid answer exits 0, writes `structure.yaml`, and records the variant (kogaki#1665).
#   (i) a Mapper answering a claim word twice stops the Trial at the SME stage, naming the word.
#   (j) `--structure` with `--mapper` is refused naming both.
#   (k) the composed `brief.yaml` carries one Leg with no `introduces` and an empty `defined_terms`.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

process.env.KOGAKI_JOB_HEARTBEAT_MS = "100";
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const repo = resolve(".");
const { parseYaml } = await import(pathToFileURL(join(repo, "src/yaml.mjs")).href);
const root = mkdtempSync(join(tmpdir(), "mapping-playground-"));
const trials = join(repo, "runs", "mapping-playground");
mkdirSync(trials, { recursive: true });
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

// ---- the fixture strand file and RelationalStructure ----
const CITE = "coding::lesson/a-fixture-strand@0123456789abcdef";
const strand = join(root, "strand.md");
writeFileSync(strand, `cite: ${CITE}\nclaim: A rule set applies automatically only to the files the walker sees.\n\n`
  + "The walker lists the files; the rule set applies to that list and to nothing else.\n");
const structureText = (crewContext) => [
  `strand: "${CITE}"`,
  "roles:",
  `  - id: crew`,
  `    context: "${crewContext}"`,
  "  - id: list",
  `    context: "The written list names the rooms the crew was told about at the door."`,
  "  - id: room",
  `    context: "A room nobody wrote down stays dusty, even when it is next door."`,
  "relations:",
  "  - id: cleans",
  "    between: [crew, list]",
  `    holds: "The crew cleans each room the list names."`,
  "  - id: missed",
  "    between: [list, room]",
  `    holds: "A room missing from the list is never reached."`,
  "higher_order:",
  "  relates: [cleans, missed]",
  `  holds: "Because the crew follows the list, what the list leaves out stays dusty."`,
  "",
].join("\n");
const structure = join(root, "structure.yaml");
writeFileSync(structure, structureText("A cleaning crew arrives at a house with a written list of rooms."));
const badStructure = join(root, "structure-bad.yaml");
writeFileSync(badStructure, structureText("A cleaning crew arrives with a rule about which rooms to clean."));

// ---- the one fake model binary, answering every stage ----
const judge = join(root, "fake-model.mjs");
writeFileSync(judge, `#!/usr/bin/env node
import { appendFileSync, writeSync, existsSync, readFileSync, writeFileSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-model 1.0"); process.exit(0); }
const dir = process.env.SMP_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const out = (r, stage) => {
    const answer = stage === "writer" ? r : JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n";
    appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, prompt, answer }) + "\\n");
    writeSync(1, answer); process.exit(0);
  };
  const input = () => JSON.parse(prompt.slice(prompt.lastIndexOf("----- INPUT (JSON) -----") + "----- INPUT (JSON) -----".length));
  const body = (key) => { const at = prompt.lastIndexOf('"' + key + '"'); const open = prompt.lastIndexOf("{", at); return JSON.parse(prompt.slice(open)); };
  const retried = prompt.includes("----- YOUR PREVIOUS ANSWER (attempt ");
  if (prompt.includes("\\\`sme_map_roles\\\` judgment point")) {
    return out(JSON.parse(readFileSync(process.env.SMP_MAPPER_ANSWER, "utf8")), "sme");
  }
  if (prompt.includes("\\\`leg_reader_start_unit\\\` judgment point")) {
    return out({ version: "1", reader_start: ["knowledge: holds that a house has many rooms", "question: holds: none", "trust: extends a peer's ordinary good faith"] }, "brief");
  }
  if (prompt.includes("\\\`smp_leg_unit\\\` judgment point")) {
    const x = input();
    // (c) the first Leg answer's point 1 carries "walker", a content word of the claim.
    return out({ legs: [{ leg_id: "crew-leg", purpose: "Bring the reader to the list as the bound of the crew's work.",
      rationale: "It is the only Leg.", reader_state_after: "knowledge: holds that the crew cleans the rooms its list names",
      claims: x.claims.map((g) => ({ type: "strand", strand: g.claim_strand, proposition: g.holds })),
      waypoints: x.claims.map((g, i) => ({ point: g.holds + (i === 0 && !retried ? " The walker." : ""), serves: [g.claim_strand] })) }] }, "brief");
  }
  if (prompt.includes('"leg_you_must_judge"')) {
    const leg = body("leg_you_must_judge").leg_you_must_judge;
    return out({ version: "1", leg_id: leg.leg_id, verdicts: leg.waypoints.map((w) => ({ waypoint: w.waypoint, verdict: "fits", why: "they begin at before and end at after." })) }, "plan");
  }
  if (prompt.includes('"leg_waypoint_you_must_plan"')) {
    const refused = body("leg_waypoint_you_must_plan").refused_here.map((h) => h.entry).filter(Boolean);
    return out(refused[refused.length - 1], "plan");
  }
  if (prompt.includes('"leg_you_must_plan"')) {
    const { leg_you_must_plan: leg, paragraph_moves_you_may_bind: bindable } = body("leg_you_must_plan");
    const m = bindable[0];
    return out({ version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w) => ({ waypoint: w.waypoint, move: m.id,
      materials: [...w.serves], purpose: "PURPOSE-" + w.waypoint + " brings the reader to the point.",
      reader_state_after: w.waypoint === leg.waypoints.length ? leg.reader_state_after : { knowledge: "STATE-" + w.waypoint + " after this paragraph." },
      depends_on: w.waypoint > 1 ? [w.waypoint - 1] : [], introduces: [], "re-activate": [], rationale: "its before holds the state and its after reaches the next point.",
      ...(w.waypoint > 1 ? { join: "consequence" } : {}),
      paragraph_waypoints: Array.from({ length: m.segments.length }, (_, n) => ({ point: "PW-" + w.waypoint + "-" + (n + 1) + " the paragraph makes its point.", serves: [...w.serves] })) })) }, "plan");
  }
  return out(["WRITTEN-1 the crew and its list.", "WRITTEN-2 the room left off.", "WRITTEN-3 what stays dusty."].join("\\n\\n"), "writer");
});
`);
chmodSync(judge, 0o755);

const snapshot = () => {
  const rows = [];
  for (const top of ["moves", "theses"]) {
    const walk = (d) => { if (!existsSync(d)) return; for (const f of readdirSync(d)) { const p = join(d, f); const s = statSync(p); if (s.isDirectory()) walk(p); else rows.push(`${p} ${s.size} ${s.mtimeMs}`); } };
    walk(join(repo, top));
  }
  return rows.sort().join("\n");
};
const before = snapshot();
const env = { ...process.env, KOGAKI_JUDGE_CLI: judge, SMP_FIXTURE_DIR: root };
const trial = (args) => spawnSync(process.execPath, ["src/mapping-playground/trial.mjs", "run", ...args], { encoding: "utf8", env, timeout: 600000 });
const outDir = mkdtempSync(join(trials, "check-"));
const out = join(outDir, "trial");

const r = trial(["--strand", strand, "--structure", structure, "--out", out]);
ok(r.status === 0, `(a) the run exited ${r.status}: ${r.stdout}${r.stderr}`);
const record = existsSync(join(out, "trial.json")) ? JSON.parse(readFileSync(join(out, "trial.json"), "utf8")) : null;
const seen = existsSync(join(root, "seen.jsonl")) ? readFileSync(join(root, "seen.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
const calls = (stage) => { const p = join(out, stage, "calls.jsonl"); return existsSync(p) ? readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };
if (!record) fails.push("(f) the run wrote no trial.json");
else {
  // (a) every stage done, every call through the recorder
  ok(record.stages.map((s) => `${s.stage}:${s.state}`).join(",") === "brief:done,paragraph-plan:done,draft:done",
    `(a) the stages are not all done: ${JSON.stringify(record.stages.map((s) => [s.stage, s.state, s.stopped]))}`);
  for (const [stage, kind, n] of [["brief", "brief", 3], ["paragraph-plan", "plan", null], ["draft", "writer", 1]]) {
    const cs = calls(stage);
    const fake = seen.filter((s) => s.stage === kind);
    ok(n === null ? cs.length >= 2 : cs.length === n, `(a) ${stage}/calls.jsonl records ${cs.length} call(s)`);
    ok(cs.length === fake.length && cs.every((c, i) => c.stdin === fake[i].prompt && c.stdout === fake[i].answer),
      `(a) ${stage}'s recorded calls are not the calls the model binary saw`);
  }
  // (c) the Leg attempt carrying a claim word was refused naming it, and the next attempt passed
  const att = existsSync(join(out, "brief", "leg", "attempts.json")) ? JSON.parse(readFileSync(join(out, "brief", "leg", "attempts.json"), "utf8")) : {};
  ok(att.attempts === 2 && (att.refusals || []).length === 1 && /waypoints\[0\]\.point carries "walker"/.test(att.refusals[0]),
    `(c) the Leg attempt carrying "walker" was not refused naming it: ${JSON.stringify(att)}`);
  // (d) the Writer's prompt is the Packet
  const draftStage = record.stages.find((s) => s.stage === "draft") || {};
  const packet = draftStage.packet && existsSync(join(repo, draftStage.packet)) ? readFileSync(join(repo, draftStage.packet), "utf8") : null;
  const w = calls("draft");
  ok(packet !== null && w.length === 1 && w[0].stdin === packet, "(d) the Writer's recorded stdin is not the Packet byte for byte");
  // (f) the Trial record and the owner's reading file
  ok(record.strand && record.strand.cite === CITE && record.strand.sha256 === sha(strand), "(f) trial.json's strand is not the strand file's cite and sha256");
  ok(record.structure && record.structure.sha256 === sha(structure) && record.structure.author === "owner" && typeof record.structure.path === "string",
    "(f) trial.json's structure does not carry its path, sha256 and author: owner");
  ok(record.mapper === "owner-authored", "(f) trial.json's mapper is not owner-authored");
  for (const k of ["brief", "plan", "draft"]) {
    const f = record[k];
    ok(f && existsSync(join(repo, f.path)) && f.sha256 === sha(join(repo, f.path)), `(f) trial.json's ${k} does not name a file with its sha256`);
  }
  ok(record.stages.every((s) => s.calls === null || existsSync(join(repo, s.calls))) && record.stages.every((s) => typeof s.state === "string"),
    "(f) a stage carries no state or names a calls.jsonl that does not exist");
  ok(record.reading && readFileSync(join(repo, record.reading), "utf8") === `# Reading of Trial ${record.trial}\n`,
    "(f) reading.md is not empty under its header naming the Trial");
  // (k) the composed Brief
  const brief = record.brief ? parseYaml(readFileSync(join(repo, record.brief.path), "utf8"), "brief") : {};
  ok(Array.isArray(brief.reader_path) && brief.reader_path.length === 1 && !("introduces" in brief.reader_path[0])
    && Array.isArray(brief.defined_terms) && brief.defined_terms.length === 0,
    "(k) brief.yaml does not carry one Leg with no introduces and an empty defined_terms");
}

// (h) the Mapper's valid answer becomes the Trial's structure, and the record names the variant
const mapped = (crewContext) => ({ strand: CITE,
  roles: [{ id: "crew", context: crewContext },
    { id: "list", context: "The written list names the rooms the crew was told about at the door." },
    { id: "room", context: "A room nobody wrote down stays dusty, even when it is next door." }],
  relations: [{ id: "cleans", between: ["crew", "list"], holds: "The crew cleans each room the list names." },
    { id: "missed", between: ["list", "room"], holds: "A room missing from the list is never reached." }],
  higher_order: { relates: ["cleans", "missed"], holds: "Because the crew follows the list, what the list leaves out stays dusty." } });
const mapperTrial = (name, answer, extra = []) => {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "answer.json"), JSON.stringify(answer));
  const o = join(outDir, name);
  const res = spawnSync(process.execPath, ["src/mapping-playground/trial.mjs", "run", "--strand", strand, "--mapper", "sme_map_roles", "--out", o, ...extra],
    { encoding: "utf8", env: { ...env, SMP_FIXTURE_DIR: dir, SMP_MAPPER_ANSWER: join(dir, "answer.json") }, timeout: 600000 });
  const rec = existsSync(join(o, "trial.json")) ? JSON.parse(readFileSync(join(o, "trial.json"), "utf8")) : null;
  return { res, o, rec };
};
const h = mapperTrial("mapped", mapped("A cleaning crew arrives at a house with a written list of rooms."));
ok(h.res.status === 0, `(h) the --mapper run exited ${h.res.status}: ${h.res.stdout}${h.res.stderr}`);
ok(existsSync(join(h.o, "structure.yaml")), "(h) the --mapper run wrote no structure.yaml");
ok(h.rec && h.rec.mapper && h.rec.mapper.variant === "sme_map_roles" && /^[0-9a-f]{64}$/.test(String(h.rec.mapper.prompt_sha256))
  && existsSync(join(h.o, "sme", "job", "prompt.md")) && h.rec.mapper.prompt_sha256 === sha(join(h.o, "sme", "job", "prompt.md")),
  `(h) trial.json's mapper does not carry the variant and its prompt's sha256: ${JSON.stringify(h.rec && h.rec.mapper)}`);
ok(h.rec && h.rec.structure && h.rec.structure.author === "sme" && existsSync(join(h.o, "structure.yaml")) && h.rec.structure.sha256 === sha(join(h.o, "structure.yaml")),
  `(h) trial.json's structure is not the mapped file with author: sme: ${JSON.stringify(h.rec && h.rec.structure)}`);
ok(h.rec && h.rec.stages.map((x) => `${x.stage}:${x.state}`).join(",") === "sme:done,brief:done,paragraph-plan:done,draft:done",
  `(h) the --mapper run's stages are not all done: ${JSON.stringify(h.rec && h.rec.stages.map((x) => [x.stage, x.state, x.stopped]))}`);

// (i) an answer carrying a claim word, twice, stops the Trial at the SME stage naming the word
const i = mapperTrial("mapped-bad", mapped("A cleaning crew arrives with a rule about which rooms to clean."));
const iAtt = existsSync(join(i.o, "sme", "job", "attempts.json")) ? JSON.parse(readFileSync(join(i.o, "sme", "job", "attempts.json"), "utf8")) : {};
ok(i.res.status !== 0 && i.rec && /^sme: /.test(String(i.rec.stopped)) && String(i.rec.stopped).includes('roles[0].context carries "rule"')
  && i.rec.stages.map((x) => `${x.stage}:${x.state}`).join(",") === "sme:stopped,brief:not run,paragraph-plan:not run,draft:not run"
  && iAtt.attempts === 2 && !existsSync(join(i.o, "structure.yaml")),
  `(i) the Mapper answering "rule" twice did not stop the Trial at the SME stage naming the word: ${i.res.status} ${JSON.stringify(i.rec && i.rec.stopped)} ${JSON.stringify(iAtt)}`);

// (j) --structure with --mapper is refused naming both
const jOut = join(outDir, "both");
const j = trial(["--strand", strand, "--structure", structure, "--mapper", "sme_map_roles", "--out", jOut]);
ok(j.status !== 0 && j.stderr.includes("`--structure` and `--mapper`") && !existsSync(jOut), `(j) --structure with --mapper was not refused naming both: ${j.status} ${j.stderr}`);

// (b) a structure carrying a claim word is refused naming it and the field, before anything is written
const bOut = join(outDir, "bad");
const b = trial(["--strand", strand, "--structure", badStructure, "--out", bOut]);
ok(b.status !== 0 && b.stderr.includes('roles[0].context carries "rule"') && !existsSync(join(bOut, "trial.json")),
  `(b) the structure carrying "rule" was not refused naming the word and the field: ${b.status} ${b.stderr}`);

// (g) a run without --structure refuses naming the flag
const gOut = join(outDir, "no-structure");
const g = trial(["--strand", strand, "--out", gOut]);
ok(g.status !== 0 && g.stderr.includes("`--structure` is required") && !existsSync(gOut), `(g) a run without --structure was not refused naming the flag: ${g.status} ${g.stderr}`);

// (e) nothing under the repository's moves/ or theses/ changed
ok(snapshot() === before, "(e) the run changed the repository's moves/ or theses/");

rmSync(root, { recursive: true, force: true });
if (!fails.length) rmSync(outDir, { recursive: true, force: true });
if (fails.length) { for (const f of fails) console.log(`FAIL: ${f}`); console.log(`kept: ${outDir}`); process.exit(1); }
console.log("check-mapping-playground: ok");
JS
