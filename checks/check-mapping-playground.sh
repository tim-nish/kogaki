#!/usr/bin/env bash
# check-mapping-playground -- one command runs a Trial of the Structure-Mapping Playground, end to end through `node src/mapping-playground/trial.mjs run` with ONE fake model binary (`KOGAKI_JUDGE_CLI`) answering every stage (kogaki#1664, kogaki#1665):
#   (a) the run exits 0 with every stage `done`, and each model stage's `calls.jsonl` holds the calls the binary saw.
#   (b) a structure whose `context` shares a word with the `proposition:` ("rule") is accepted, and the main run is over it (kogaki#1707).
#   (c) a Leg `point` sharing such a word ("rule") is accepted on the first attempt (kogaki#1707).
#   (d) the Writer's recorded stdin equals the Packet file byte for byte.
#   (e) the repository's `moves/` and `theses/` are unchanged.
#   (f) `trial.json` carries the Trial record's fields, and `reading.md` exists and is empty under its header.
#   (g) a run without `--structure` refuses naming the flag.
#   (h) a `--mapper sme_map_roles` Trial over a valid answer exits 0, writes `structure.yaml`, and records the variant.
#   (i) a Mapper answering a `context` that shares a word with the proposition is accepted, and the Trial runs on (kogaki#1707).
#   (j) `--structure` with `--mapper` is refused naming both.
#   (k) the composed `brief.yaml` carries one Leg with no `introduces`, an empty `defined_terms`, no `reader_start`, `reader_target`, `obligations` or Leg reader state; the Leg call is handed `persona_prior_knowledge`, and no Reader start call is made (kogaki#1699).

#   (l) a `context` carrying a listed word as a word ("The reader must hold...", "you", ...) is refused naming the Role and the word, in group `context` (kogaki#1720).
#   (m) a relation's `holds` missing `{<id>}` for a Role its `between` names is refused naming the relation and the Role, and a `higher_order` `holds` carrying none of its Roles is refused (kogaki#1720).
#   (n) a `context` carrying a listed word only inside a longer word ("youths", "readers'", "typewriter") is accepted (kogaki#1720).
#   (o) a Mapping Record `table.yaml`, `{ move, case, base, correspondences }`, is accepted by `validateCorrespondenceTable`, and an empty `case` is refused (kogaki#1733).
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
const { spliceConstraints } = await import(pathToFileURL(join(repo, "src/proof-sheet/extract.mjs")).href);
const { validateStructure, parseProposition } = await import(pathToFileURL(join(repo, "src/mapping-playground/structure.mjs")).href);
const { validateCorrespondenceTable } = await import(pathToFileURL(join(repo, "src/mapping-playground/rbs.mjs")).href);
const root = mkdtempSync(join(tmpdir(), "mapping-playground-"));
const trials = join(repo, "runs", "mapping-playground");
mkdirSync(trials, { recursive: true });
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

// ---- the fixture proposition file and RelationalStructure ----
const CITE = "coding::lesson/a-fixture-strand@0123456789abcdef";
const strand = join(root, "strand.md");
writeFileSync(strand, `cite: ${CITE}\nproposition: A rule set applies automatically only to the files the walker sees.\n`);
const structureText = (crewContext) => [
  `strand: "${CITE}"`,
  "roles:",
  `  - id: crew`,
  `    context: "${crewContext}"`,
  "    attributes: []",
  "  - id: list",
  `    context: "The written list names the rooms the crew was told about at the door."`,
  "    attributes: []",
  "  - id: room",
  `    context: "A room nobody wrote down stays dusty, even when it is next door."`,
  "    attributes: []",
  "relations:",
  "  - id: cleans",
  "    between: [crew, list]",
  `    holds: "{crew} cleans each room {list} names."`,
  "  - id: missed",
  "    between: [list, room]",
  `    holds: "{room} missing from {list} is never reached."`,
  "higher_order:",
  "  relates: [cleans, missed]",
  `  holds: "Because {crew} follows {list}, what {list} leaves out stays dusty."`,
  "",
].join("\n");
const structure = join(root, "structure.yaml");
writeFileSync(structure, structureText("A cleaning crew arrives at a house with a written list of rooms."));
const ruleStructure = join(root, "structure-rule.yaml");
writeFileSync(ruleStructure, structureText("A cleaning crew arrives with a rule about which rooms to clean."));

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
    return out(JSON.parse(readFileSync(process.env.SMP_MAPPER_ANSWER, "utf8")), "reading");
  }
  if (prompt.includes("\\\`smp_leg_unit\\\` judgment point")) {
    const x = input();
    // (c) the first Leg answer's point 1 carries "rule", a word of the proposition and of the crew's context.
    return out({ legs: [{ leg_id: "crew-leg", purpose: "Bring the reader to the list as the bound of the crew's work.",
      rationale: "It is the only Leg.",
      claims: x.claims.map((g) => ({ type: "strand", strand: g.claim_strand, proposition: g.holds })),
      waypoints: x.claims.map((g, i) => ({ point: g.holds + (i === 0 && !retried ? " The crew arrives with a rule." : ""), serves: [g.claim_strand] })) }] }, "brief");
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
      depends_on: w.waypoint > 1 ? [w.waypoint - 1] : [], introduces: [], "re-activate": [], rationale: "its before holds the state and its after reaches the next point.",
      ...(w.waypoint > 1 ? { join: "consequence" } : {}),
      paragraph_waypoints: Array.from({ length: m.segments.length }, (_, n) => ({ point: "PW-" + w.waypoint + "-" + (n + 1) + " the paragraph makes its point.", serves: [...w.serves], cast: {} })) })) }, "plan");
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
// THE LIBRARY THE TRIAL READS (kogaki#1698): `moves/` itself once the owner's
// `rejudge --constraints --write` run has given its records `takes` and `leaves`; until then a
// copy under the Trials directory in which each record carrying no `takes` carries both lists
// empty and no retired `obligation` (kogaki#1701), so the Trial reads every other field of the
// library as written.
const library = (() => {
  const names = readdirSync(join(repo, "moves"));
  if (names.some((n) => n.endsWith(".yaml") && /^takes:/m.test(readFileSync(join(repo, "moves", n), "utf8")))) return "moves";
  mkdirSync(trials, { recursive: true });
  const dir = mkdtempSync(join(trials, "check-library-"));
  for (const n of names.filter((x) => x.endsWith(".yaml") || x === "ROLES.json")) {
    const text = readFileSync(join(repo, "moves", n), "utf8");
    // The owner's own write (`rejudge --constraints --write --retire-obligation`, kogaki#1701): both
    // lists empty, and the retired `obligation` cut where a record still carries it.
    writeFileSync(join(dir, n), n.endsWith(".yaml") ? spliceConstraints(text, { takes: [], leaves: [] }, { retireObligation: true }) : text);
  }
  return dir;
})();
const env = { ...process.env, KOGAKI_JUDGE_CLI: judge, SMP_FIXTURE_DIR: root };
const trial = (args) => spawnSync(process.execPath, ["src/mapping-playground/trial.mjs", "run", "--library", library, ...args], { encoding: "utf8", env, timeout: 600000 });
const outDir = mkdtempSync(join(trials, "check-"));
const out = join(outDir, "trial");

const r = trial(["--strand", strand, "--structure", ruleStructure, "--out", out]);
ok(r.status === 0, `(a) the run exited ${r.status}: ${r.stdout}${r.stderr}`);
const record = existsSync(join(out, "trial.json")) ? JSON.parse(readFileSync(join(out, "trial.json"), "utf8")) : null;
const seen = existsSync(join(root, "seen.jsonl")) ? readFileSync(join(root, "seen.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
const calls = (stage) => { const p = join(out, stage, "calls.jsonl"); return existsSync(p) ? readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };
if (!record) fails.push("(f) the run wrote no trial.json");
else {
  // (a) every stage done, every call through the recorder
  ok(record.stages.map((s) => `${s.stage}:${s.state}`).join(",") === "brief:done,paragraph-plan:done,draft:done",
    `(a) the stages are not all done: ${JSON.stringify(record.stages.map((s) => [s.stage, s.state, s.stopped]))}`);
  for (const [stage, kind, n] of [["brief", "brief", 1], ["paragraph-plan", "plan", null], ["draft", "writer", 1]]) {
    const cs = calls(stage);
    const fake = seen.filter((s) => s.stage === kind);
    ok(n === null ? cs.length >= 2 : cs.length === n, `(a) ${stage}/calls.jsonl records ${cs.length} call(s)`);
    ok(cs.length === fake.length && cs.every((c, i) => c.stdin === fake[i].prompt && c.stdout === fake[i].answer),
      `(a) ${stage}'s recorded calls are not the calls the model binary saw`);
  }
  // (c) the Leg attempt carrying a word of the proposition passed on the first attempt
  const att = existsSync(join(out, "brief", "leg", "attempts.json")) ? JSON.parse(readFileSync(join(out, "brief", "leg", "attempts.json"), "utf8")) : {};
  ok(att.attempts === 1 && !(att.refusals || []).length && calls("brief").some((c) => c.stdout.includes("The crew arrives with a rule.")),
    `(c) the Leg attempt carrying "rule" was not accepted on the first attempt: ${JSON.stringify(att)}`);
  // (d) the Writer's prompt is the Packet
  const draftStage = record.stages.find((s) => s.stage === "draft") || {};
  const packet = draftStage.packet && existsSync(join(repo, draftStage.packet)) ? readFileSync(join(repo, draftStage.packet), "utf8") : null;
  const w = calls("draft");
  ok(packet !== null && w.length === 1 && w[0].stdin === packet, "(d) the Writer's recorded stdin is not the Packet byte for byte");
  // (f) the Trial record and the owner's reading file
  ok(record.strand && record.strand.cite === CITE && record.strand.sha256 === sha(strand), "(f) trial.json's strand is not the strand file's cite and sha256");
  ok(record.structure && record.structure.sha256 === sha(ruleStructure) && record.structure.author === "owner" && typeof record.structure.path === "string",
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
  // (k) READER START IS RETIRED (kogaki#1699): no Reader start call, and no retired key in the Brief
  ok(!existsSync(join(out, "brief", "reader-start")) && ["reader_start", "reader_target", "obligations"].every((k) => !(k in brief))
    && (brief.reader_path || []).every((l) => !("reader_state_after" in l) && !("reader_state_before" in l)),
    "(k) the Trial made a Reader start call, or brief.yaml carries a retired Reader start, Reader target, obligations or reader state");
  const legCall = calls("brief").find((c) => c.stdin.includes("`smp_leg_unit` judgment point"));
  const IN = "----- INPUT (JSON) -----";
  let legIn = {};
  try { legIn = JSON.parse(legCall.stdin.slice(legCall.stdin.lastIndexOf(IN) + IN.length)); } catch { /* reported below */ }
  ok(typeof legIn.persona_prior_knowledge === "string" && !("reader_start" in legIn),
    "(k) the Leg call is not handed the Persona's prior knowledge in place of a Reader start");
}

// (h) the Mapper's valid answer becomes the Trial's structure, and the record names the variant
const mapped = (crewContext) => ({ strand: CITE,
  roles: [{ id: "crew", context: crewContext, attributes: [] },
    { id: "list", context: "The written list names the rooms the crew was told about at the door.", attributes: [] },
    { id: "room", context: "A room nobody wrote down stays dusty, even when it is next door.", attributes: [] }],
  relations: [{ id: "cleans", between: ["crew", "list"], holds: "{crew} cleans each room {list} names." },
    { id: "missed", between: ["list", "room"], holds: "{room} missing from {list} is never reached." }],
  higher_order: { relates: ["cleans", "missed"], holds: "Because {crew} follows {list}, what {list} leaves out stays dusty." } });
const mapperTrial = (name, answer, extra = []) => {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "answer.json"), JSON.stringify(answer));
  const o = join(outDir, name);
  const res = spawnSync(process.execPath, ["src/mapping-playground/trial.mjs", "run", "--library", library, "--strand", strand, "--mapper", "sme_map_roles", "--out", o, ...extra],
    { encoding: "utf8", env: { ...env, SMP_FIXTURE_DIR: dir, SMP_MAPPER_ANSWER: join(dir, "answer.json") }, timeout: 600000 });
  const rec = existsSync(join(o, "trial.json")) ? JSON.parse(readFileSync(join(o, "trial.json"), "utf8")) : null;
  return { res, o, rec };
};
const h = mapperTrial("mapped", mapped("A cleaning crew arrives at a house with a written list of rooms."));
ok(h.res.status === 0, `(h) the --mapper run exited ${h.res.status}: ${h.res.stdout}${h.res.stderr}`);
ok(existsSync(join(h.o, "structure.yaml")), "(h) the --mapper run wrote no structure.yaml");
ok(h.rec && h.rec.mapper && h.rec.mapper.variant === "sme_map_roles" && /^[0-9a-f]{64}$/.test(String(h.rec.mapper.prompt_sha256))
  && existsSync(join(h.o, "reading", "job", "prompt.md")) && h.rec.mapper.prompt_sha256 === sha(join(h.o, "reading", "job", "prompt.md")),
  `(h) trial.json's mapper does not carry the variant and its prompt's sha256: ${JSON.stringify(h.rec && h.rec.mapper)}`);
ok(h.rec && h.rec.structure && h.rec.structure.author === "mapper" && existsSync(join(h.o, "structure.yaml")) && h.rec.structure.sha256 === sha(join(h.o, "structure.yaml")),
  `(h) trial.json's structure is not the mapped file with author: mapper: ${JSON.stringify(h.rec && h.rec.structure)}`);
ok(h.rec && h.rec.stages.map((x) => `${x.stage}:${x.state}`).join(",") === "reading:done,brief:done,paragraph-plan:done,draft:done",
  `(h) the --mapper run's stages are not all done: ${JSON.stringify(h.rec && h.rec.stages.map((x) => [x.stage, x.state, x.stopped]))}`);

// (i) an answer whose context shares a word with the proposition is accepted at the reading stage, and the Trial runs on
const i = mapperTrial("mapped-rule", mapped("A cleaning crew arrives with a rule about which rooms to clean."));
const iAtt = existsSync(join(i.o, "reading", "job", "attempts.json")) ? JSON.parse(readFileSync(join(i.o, "reading", "job", "attempts.json"), "utf8")) : {};
ok(i.res.status === 0 && i.rec && i.rec.stages.map((x) => `${x.stage}:${x.state}`).join(",") === "reading:done,brief:done,paragraph-plan:done,draft:done"
  && iAtt.attempts === 1 && existsSync(join(i.o, "structure.yaml")),
  `(i) the Mapper answering "rule" was not accepted at the reading stage: ${i.res.status} ${JSON.stringify(i.rec && i.rec.stopped)} ${JSON.stringify(iAtt)}`);

// (j) --structure with --mapper is refused naming both
const jOut = join(outDir, "both");
const j = trial(["--strand", strand, "--structure", structure, "--mapper", "sme_map_roles", "--out", jOut]);
ok(j.status !== 0 && j.stderr.includes("`--structure` and `--mapper`") && !existsSync(jOut), `(j) --structure with --mapper was not refused naming both: ${j.status} ${j.stderr}`);

// (b) a structure whose context carries "rule", a word of the proposition, is accepted
const b = validateStructure(parseYaml(readFileSync(ruleStructure, "utf8")), parseProposition(readFileSync(strand, "utf8")));
ok(!b.error, `(b) the structure carrying "rule" was refused: ${JSON.stringify(b)}`);

// (l) a context addressed to the reader is refused naming the Role and the word
const propRec = parseProposition(readFileSync(strand, "utf8"));
const base = mapped("A cleaning crew arrives at a house with a written list of rooms.");
const l = validateStructure({ ...base, roles: [{ ...base.roles[0], context: "The reader must hold that a crew works from a list." }, ...base.roles.slice(1)] }, propRec);
ok(l.group === "context" && /the Role "crew"/.test(l.error || "") && /"reader"/.test(l.error || ""),
  `(l) a context reading "The reader must hold" was not refused naming the Role and the word: ${JSON.stringify(l)}`);
// every word of the refused family, not only the one the Trial met
const withContext = (context) => validateStructure({ ...base, roles: [{ ...base.roles[0], context }, ...base.roles.slice(1)] }, propRec);
for (const [word, context] of [["you", "A crew you hire to clean a house."], ["must hold", "A crew that must hold to a list."],
  ["must come to", "A crew one must come to see as bound by a list."], ["Persona", "A crew the persona knows from home."],
  ["writer", "A crew the writer names first."]]) {
  const v = withContext(context);
  ok(v.group === "context" && v.error.includes(JSON.stringify(word)), `(l) a context carrying "${word}" was not refused naming the word: ${JSON.stringify(v)}`);
}

// (n) a listed word inside a longer word is no listed word
const lw = withContext("A crew of youths and readers' helpers with a typewriter.");
ok(!lw.error, `(n) a context carrying a listed word only inside a longer word was refused: ${JSON.stringify(lw)}`);

// (m) a holds missing a related Role's placeholder is refused naming the relation and the Role
const m1 = validateStructure({ ...base, relations: [{ ...base.relations[0], holds: "{crew} cleans each room the list names." }, base.relations[1]] }, propRec);
ok(m1.group === "shape" && /the relation "cleans"/.test(m1.error || "") && /\{list\}/.test(m1.error || ""),
  `(m) a holds missing {list} was not refused naming the relation and the Role: ${JSON.stringify(m1)}`);
const m2 = validateStructure({ ...base, higher_order: { ...base.higher_order, holds: "What is left out stays dusty." } }, propRec);
ok(m2.group === "shape" && /higher_order/.test(m2.error || "") && /\{crew\}/.test(m2.error || ""),
  `(m) a higher_order holds carrying no Role was not refused: ${JSON.stringify(m2)}`);

// (o) a Mapping Record table carries its move and case beside the correspondence table (kogaki#1733)
const recTable = { move: "a_move", case: "apart", base: { domain: "a crew" }, correspondences: [{ role: "crew", expression: "the crew" }] };
const o1 = validateCorrespondenceTable(recTable);
ok(!o1.error, `(o) a table.yaml carrying case was refused: ${JSON.stringify(o1)}`);
const o2 = validateCorrespondenceTable({ ...recTable, case: "" });
ok(o2.group === "shape" && /`case`/.test(o2.error || ""), `(o) a table.yaml carrying an empty case was not refused naming it: ${JSON.stringify(o2)}`);

// (g) a run without --structure refuses naming the flag
const gOut = join(outDir, "no-structure");
const g = trial(["--strand", strand, "--out", gOut]);
ok(g.status !== 0 && g.stderr.includes("`--structure` is required") && !existsSync(gOut), `(g) a run without --structure was not refused naming the flag: ${g.status} ${g.stderr}`);

// (e) nothing under the repository's moves/ or theses/ changed
ok(snapshot() === before, "(e) the run changed the repository's moves/ or theses/");

rmSync(root, { recursive: true, force: true });
if (!fails.length) rmSync(outDir, { recursive: true, force: true });
if (library !== "moves") rmSync(library, { recursive: true, force: true });
if (fails.length) { for (const f of fails) console.log(`FAIL: ${f}`); console.log(`kept: ${outDir}`); process.exit(1); }
console.log("check-mapping-playground: ok");
JS
