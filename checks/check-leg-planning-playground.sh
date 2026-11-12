#!/usr/bin/env bash
# check-leg-planning-playground -- the Leg-Planning Playground's Trial (kogaki#1764), driven through `node src/leg-planning-playground/trial.mjs run`
# with ONE fake model binary. Since kogaki#1775 the Trial's Legs are derived with no Call, one per relation and
# higher-order relation the apex reaches, each saying its relation's `holds`; it asks no Waypoint Call and no GROUNDED judge.
#   (a) a claims file of a thesis and three claims, with a valid structure answer, writes structure.yaml, legs.yaml,
#       trial.json and sheet.html, its one Call under calls/sme_read_set/1/, trial.json carrying each file's sha256; no
#       `lpp_waypoints`, `lpp_grounded`, `lpp_legs` or `reader_path_fit_unit` Call is made, and the paragraph-plan stage
#       runs /paragraph-plan over the five Legs, one unit each, one Move bound per Leg, and is recorded done with each
#       Leg's paragraph passed (kogaki#1777).
#   (b) a `proposition:` line is refused naming `claim`, a second `thesis:` and a `cite:` with no `claim:` naming the line,
#       and nothing is written.

#   (c) validateReadSet refuses a non-apex higher-order relation with no `from` or a `from` naming no claim, a Role in no
#       relation, a higher-order relation relating one relation, one relating itself through another, a written `reach` and
#       a missing `attains_thesis`, naming each; the apex with no `from` and a higher-order relation relating a
#       higher-order relation pass; a refused first answer is handed back and the second is read. The ids are minted
#       (kogaki#1772): an answer writing an `id` is refused, every element carries its `name` and the id `r_<n>`, `c_<n>`
#       or `h_<n>` in order of appearance, an element with no `name` or an id out of that order is refused naming it, an
#       apex carrying `from` is refused naming the apex, and `withReach` over the apex with no `from` is the same reach.

#   (d) legs.yaml holds five Legs in post-order -- each higher-order relation after what it relates -- each `text` its
#       relation's `holds` with the Role names substituted, the apex's Leg alone marked `reaches_target`.
#   (f) legs.yaml reads as a Brief's `reader_path` under the structure, carries `composed_by: leg-planning` and no
#       `waypoints`, `move`, purpose, rationale, introduces or opens_section.
#   (g) the sheet's parts stand in order under listed headings, each Leg's relation by name and its text under the Legs
#       part with no bare minted id, and a `--brief` run renders that Brief's Legs beside the Trial's.

#   (h) the repository's moves/ and theses/ are unchanged.
#   (j) a claims file of four claims whose fourth is the `from` of a relation the apex does not reach writes
#       structure.yaml with that relation and claim under `unreached`, trial.json carries `reach` and `unreached` under the
#       structure stage, the sheet marks the unreached rows under Structure and lists the claim under Claims, and no Leg
#       serves the unreached relation.
#   (k) the Brief sheet (kogaki#1776): `sheet.mjs brief` over a Brief of that structure and its Legs renders with no model
#       call, the graph first labelled by name, the Legs last, no retired word, every table under a <thead> of one
#       heading per column, the Claims table id, claim and reached with no cite, and the apex's `from` empty.

#   (l) the Brief sheet's owner act (kogaki#1788): `sheet.mjs show` over the Brief of (k) writes
#       <root>/runs/brief-plan-playground/<slug>/sheet.html beside brief.sha256 and prints its file:// URL, the skill
#       .claude/skills/brief-sheet/SKILL.md runs that command, and a Leg carrying `waypoints`, `move` or no `text` is
#       refused naming the Leg and the key, with nothing written.
#   (m) the connections the Brief's read weighed (kogaki#1817): under `considered: true` a read carrying a `considered` row
#       per weighed connection passes with its names minted to ids, and a missing `considered`, a higher-order relation
#       with no `connected` row, a relation in no row, a `connected` row no higher-order relation relates, a
#       `not_connected` row one does, a verdict outside the two and a criterion naming no claim are refused naming each;
#       the Brief sheet renders each connected row's why beside its higher-order relation and a "Not connected" table
#       naming the relations, the claims read and the why, and a Brief carrying no `considered` renders neither. Its
#       cases are checks/leg-planning-playground-considered-cases.mjs.
# Cases (e) and (i), the GROUNDED re-ask and the no-fit stop, went with the Waypoint Call (kogaki#1775).
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync, statSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const repo = resolve(".");
const load = (p) => import(pathToFileURL(join(repo, p)).href);
const { parseYaml, stringifyYaml } = await load("src/yaml.mjs");
const { readerPathRefusal } = await load("src/leg-planning-playground/read-set.mjs");
const { mintStructure, validateReadSet, withReach } = await load("src/compose/structure.mjs");
const { LPP_PARTS, LPP_HEADINGS } = await load("src/brief-plan-playground/sheet.mjs");
const { briefLegs } = await load("src/compose/record.mjs");
const root = mkdtempSync(join(tmpdir(), "leg-planning-playground-"));
// THE MAPPER IS OFF IN THIS MEMBER: the fake answers ParagraphPlan's plan and judge calls alone, as
// checks/check-structure-mapping-playground.sh does; checks/check-paragraph-plan.sh case (z) runs the Mapper.
process.env.KOGAKI_JOB_HEARTBEAT_MS = "100";
const noMapper = JSON.parse(readFileSync("kogaki.settings.json", "utf8"));
noMapper.paragraph_plan.mapper = false;
process.env.KOGAKI_SETTINGS = join(root, "settings-no-mapper.json");
writeFileSync(process.env.KOGAKI_SETTINGS, JSON.stringify(noMapper));
const trials = join(repo, "runs", "leg-planning-playground");
mkdirSync(trials, { recursive: true });
const outDir = mkdtempSync(join(trials, "check-"));
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

// ---- the fixture claims file and the answers ----
const CLAIMS = ["A rule set applies automatically only to the files its walker visits.",
  "A file the walker skips is never checked by any rule.",
  "A team reads a green run as covering every file."];
const THESIS = "A green automatic run says nothing about the files its walker never visited.";
const claimsFile = join(root, "claims.md");
writeFileSync(claimsFile, `thesis: ${THESIS}\n\n` + CLAIMS.map((c, i) => `cite: coding::lesson/fixture-${i + 1}@0123456789abcdef\nclaim: ${c}\n`).join("\n"));
const fixtureClaims = CLAIMS.map((claim, i) => ({ id: `c${i + 1}`, claim }));
// THE STRUCTURE ANSWER: every element by its `name`, the references by name; MINTED is it with the runner's ids.
const STRUCTURE = {
  roles: [{ name: "rules", context: "A set of checks that runs without anyone choosing what it reads.", attributes: ["automatic"], claims: ["c1", "c2"] },
    { name: "walk", context: "The list of files a tool visits when it runs.", attributes: [], claims: ["c1", "c2"] },
    { name: "file", context: "One file in a repository.", attributes: ["skipped"], claims: ["c2", "c3"] },
    { name: "team", context: "The people who read the result of a run.", attributes: [], claims: ["c3"] }],
  relations: [{ name: "p1", between: ["rules", "walk"], holds: "{rules} applies only to what {walk} visits.", from: "c1" },
    { name: "p2", between: ["walk", "file"], holds: "{file} left off {walk} is never checked.", from: "c2" },
    { name: "p3", between: ["team", "rules"], holds: "{team} reads a pass of {rules} as covering every file.", from: "c3" }],
  higher_order: [{ name: "h1", relates: ["p1", "p2"], holds: "Because {rules} reads only {walk}, {file} off it is unchecked.", from: ["c2"] },
    { name: "h2", relates: ["h1", "p3"], holds: "{team} trusts a pass that never reached {file}." }],
  attains_thesis: "h2",
};
const MINTED = mintStructure(STRUCTURE).structure;
const readSet = (s, claims) => { const m = mintStructure(s); return m.text ? m : validateReadSet(m.structure, claims); };
// THE FIVE LEGS the structure derives, in post-order: [leg_id, relation, text].
const WANT = [["L1", "c_1", "rules applies only to what walk visits."], ["L2", "c_2", "file left off walk is never checked."],
  ["L3", "h_1", "Because rules reads only walk, file off it is unchecked."], ["L4", "c_3", "team reads a pass of rules as covering every file."],
  ["L5", "h_2", "team trusts a pass that never reached file."]];
const answers = (name, list) => { const f = join(root, `${name}.json`); writeFileSync(f, JSON.stringify(list)); return f; };

// ---- the one fake model binary ----
const judge = join(root, "fake-model.mjs");
writeFileSync(judge, `#!/usr/bin/env node
import { appendFileSync, writeSync, readFileSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-model 1.0"); process.exit(0); }
const dir = process.env.LPP_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const at = (row) => prompt.includes("\\\`" + row + "\\\` judgment point");
  // THE TRIAL ASKS THE STRUCTURE (kogaki#1775), and /paragraph-plan its Analogy Mapping (kogaki#1778), plan and
  // judge Calls (kogaki#1777): every other row is logged and exits 5.
  const stage = at("analogy_mapping") ? "analogy" : at("sme_read_set") ? "structure" : at("lpp_waypoints") ? "waypoints" : at("lpp_grounded") ? "grounded"
    : at("lpp_legs") ? "legs" : at("reader_path_fit_unit") ? "fit"
    : prompt.includes('"leg_you_must_judge"') ? "judge" : prompt.includes('"leg_you_must_plan"') ? "plan" : "unknown";
  const input = () => { const m = "----- INPUT (JSON) -----"; return JSON.parse(prompt.slice(prompt.lastIndexOf(m) + m.length)); };
  if (stage === "analogy") {
    appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, prompt }) + "\\n");
    writeSync(1, JSON.stringify({ type: "result", result: JSON.stringify({ version: "1", none: "no base domain the fixture reader holds carries the system." }) }) + "\\n"); process.exit(0);
  }
  if (stage === "plan" || stage === "judge") {
    appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, prompt }) + "\\n");
    const x = input();
    const r = stage === "judge"
      ? { version: "1", leg_id: x.leg_you_must_judge.leg_id, verdicts: x.leg_you_must_judge.paragraphs.map((p) => ({ paragraph: p.paragraph, verdict: "fits", why: "its Waypoints carry the relation." })) }
      : (() => {
        const leg = x.leg_you_must_plan;
        const m = x.paragraph_moves_you_may_bind[0];
        const serves = (leg.claims || []).map((g) => g.strand);
        return { version: "1", leg_id: leg.leg_id, move: m.id, rationale: "its Segments carry the Leg's relation.",
          paragraphs: [{ paragraph: 1, materials: serves, purpose: "PURPOSE brings the reader to the relation.", depends_on: [], introduces: [], "re-activate": [],
            rationale: "one paragraph carries the relation.", paragraph_waypoints: (m.segments.length ? m.segments : [0]).map((_, n) => ({ point: "PW-" + leg.leg_id + "-" + (n + 1) + " the step toward the relation.", serves, cast: {} })) }] };
      })();
    writeSync(1, JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0);
  }
  if (stage !== "structure") { appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, prompt }) + "\\n"); process.exit(5); }
  let n = 0; try { n = readFileSync(dir + "/seen.jsonl", "utf8").split("\\n").filter(Boolean).filter((l) => JSON.parse(l).stage === stage).length; } catch {}
  const list = JSON.parse(readFileSync(process.env["LPP_" + stage.toUpperCase()], "utf8"));
  const r = list[Math.min(n, list.length - 1)];
  appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, prompt }) + "\\n");
  writeSync(1, JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0);
});
`);
chmodSync(judge, 0o755);
const DEFAULT = { LPP_STRUCTURE: answers("structure", [STRUCTURE]) };
const snapshot = () => {
  const rows = [];
  for (const top of ["moves", "theses"]) {
    const walk = (d) => { if (!existsSync(d)) return; for (const f of readdirSync(d)) { const p = join(d, f); const s = statSync(p); if (s.isDirectory()) walk(p); else rows.push(`${p} ${s.size} ${s.mtimeMs}`); } };
    walk(join(repo, top));
  }
  return rows.sort().join("\n");
};
const before = snapshot();
const run = (name, env = {}, extra = [], claims = claimsFile) => {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  const o = join(outDir, name);
  const r = spawnSync(process.execPath, ["src/leg-planning-playground/trial.mjs", "run", "--claims", claims, "--out", o, ...extra],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, LPP_FIXTURE_DIR: dir, ...DEFAULT, ...env }, timeout: 600000 });
  const seen = existsSync(join(dir, "seen.jsonl")) ? readFileSync(join(dir, "seen.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  return { ...r, o, seen, said: `${r.stdout}${r.stderr}` };
};
const readTrial = (o) => (existsSync(join(o, "trial.json")) ? JSON.parse(readFileSync(join(o, "trial.json"), "utf8")) : null);
const prompt = (o, call) => readFileSync(join(o, "calls", call, "prompt.md"), "utf8");

// (a) the main run
const a = run("main");
const ta = readTrial(a.o) || { stages: [] };
ok(a.status === 0 && !ta.stopped, `(a) the Trial did not run /paragraph-plan over the Legs to the end (kogaki#1777): ${ta.stopped} ${a.said.slice(-400)}`);
for (const f of ["structure.yaml", "legs.yaml", "trial.json", "sheet.html"]) ok(existsSync(join(a.o, f)), `(a) ${f} was not written`);
ok(!existsSync(join(a.o, "waypoints.yaml")), "(a) the Trial still writes waypoints.yaml");
ok(existsSync(join(a.o, "calls", "sme_read_set", "1", "prompt.md")) && existsSync(join(a.o, "calls", "sme_read_set", "1", "answer.json")), "(a) no Call Record at calls/sme_read_set/1/");
ok(JSON.stringify(existsSync(join(a.o, "calls")) ? readdirSync(join(a.o, "calls")) : []) === '["sme_read_set"]', `(a) the Trial made a Call other than sme_read_set: ${existsSync(join(a.o, "calls")) ? readdirSync(join(a.o, "calls")) : []}`);
ok(a.seen.every((x) => ["structure", "analogy", "plan", "judge"].includes(x.stage)), `(a) the fake model was asked a row the Trial no longer asks: ${JSON.stringify([...new Set(a.seen.map((x) => x.stage))])}`);
ok(a.seen.filter((x) => x.stage === "plan").length === 5, `(a) /paragraph-plan did not make one plan Call per Leg: ${a.seen.filter((x) => x.stage === "plan").length}`);
ok(ta.claims && ta.claims.sha256 === sha(claimsFile), "(a) trial.json does not carry the claims file's sha256");
ok(ta.library && /^[0-9a-f]{64}$/.test(ta.library.sha256 || ""), "(a) trial.json does not carry the library's sha256");
ok(JSON.stringify(ta.stages.map((x) => x.stage)) === '["structure","legs","paragraph-plan"]', `(a) trial.json's stages are not structure, legs, paragraph-plan: ${JSON.stringify(ta.stages.map((x) => x.stage))}`);
for (const [stage, f] of [["structure", "structure.yaml"], ["legs", "legs.yaml"]]) {
  const st = ta.stages.find((x) => x.stage === stage);
  ok(st && st.state === "done" && st.file && st.file.sha256 === sha(join(a.o, f)), `(a) trial.json's ${stage} stage does not carry ${f} at its sha256: ${JSON.stringify(st)}`);
}
ok(ta.sheet && ta.sheet.sha256 === sha(join(a.o, "sheet.html")), "(a) trial.json does not carry the sheet's sha256");
{
  const pp = ta.stages.find((x) => x.stage === "paragraph-plan") || {};
  const rows = pp.paragraphs || [];
  ok(pp.state === "done" && pp.plan && existsSync(join(repo, pp.plan.path || "")), `(a) the paragraph-plan stage is not recorded done with its plan file: ${JSON.stringify(pp).slice(0, 400)}`);
  ok(JSON.stringify(rows.map((x) => `${x.leg_id}:${x.paragraph}`)) === JSON.stringify(WANT.map(([id]) => `${id}:1`)) && rows.every((x) => typeof x.move === "string" && /^passed in Round 1$/.test(x.verdict)),
    `(a) the stage does not record each Leg's one paragraph passed under its Move: ${JSON.stringify(rows.map((x) => [x.leg_id, x.paragraph, x.move, x.verdict]))}`);
}

// (b) the claims file's refusals: nothing is written
for (const [name, text, want] of [
  ["proposition", `thesis: ${THESIS}\ncite: coding::lesson/fixture-1@0123456789abcdef\nproposition: ${CLAIMS[0]}\n`, "`claim:`"],
  ["two-theses", `thesis: ${THESIS}\nthesis: ${THESIS}\ncite: coding::lesson/fixture-1@0123456789abcdef\nclaim: ${CLAIMS[0]}\n`, "line 2"],
  ["no-claim", `thesis: ${THESIS}\ncite: coding::lesson/fixture-1@0123456789abcdef\ncite: coding::lesson/fixture-2@0123456789abcdef\nclaim: ${CLAIMS[1]}\n`, "line 2"]]) {
  const f = join(root, `${name}.md`);
  writeFileSync(f, text);
  const r = run(`b-${name}`, {}, [], f);
  ok(r.status !== 0 && r.stderr.includes(want) && !existsSync(r.o), `(b) the ${name} claims file was not refused naming ${want}, with nothing written: ${r.said}`);
}

// (c) the structure's refusals, and the retry
const without = (f) => { const s = JSON.parse(JSON.stringify(STRUCTURE)); f(s); return s; };
const refusals = [
  ["a non-apex higher-order relation with no from", without((s) => { s.higher_order[0].from = []; }), "\"h1\""],
  ["a from naming no claim", without((s) => { s.higher_order[0].from = ["c9"]; }), "\"h1\""],
  ["a higher-order relation relating itself through another", without((s) => { s.higher_order[0].relates = ["p1", "h2"]; }), "\"h1\""],
  ["a written reach", without((s) => { s.reach = ["h2"]; }), "reach"],
  ["a Role in no relation", without((s) => { s.roles.push({ name: "idle", context: "A thing nothing relates.", attributes: [], claims: ["c1"] }); }), "\"idle\""],
  ["a higher-order relation relating one relation", without((s) => { s.higher_order[0].relates = ["p1"]; }), "\"h1\""],
  ["a missing attains_thesis", without((s) => { delete s.attains_thesis; }), "attains_thesis"],
  ["an answer writing an id", without((s) => { s.relations[1].id = "c_2"; }), "relations[1]"],
  ["an apex carrying from", without((s) => { s.higher_order[1].from = []; }), "the apex, higher_order[1]"]];
for (const [what, s, word] of refusals) {
  const v = readSet(s, fixtureClaims);
  ok(v.text && v.text.includes(word), `(c) ${what} was not refused naming ${word}: ${JSON.stringify(v)}`);
}
const minted = (f) => { const s = JSON.parse(JSON.stringify(MINTED)); f(s); return s; };
for (const [what, s, word] of [
  ["a Role with no name", minted((s) => { delete s.roles[2].name; }), "roles[2]"],
  ["a relation id out of order", minted((s) => { s.relations[1].id = "c_7"; }), "relations[1]"],
  ["a higher-order relation id of another kind", minted((s) => { s.higher_order[0].id = "r_1"; }), "higher_order[0]"]]) {
  const v = validateReadSet(s, fixtureClaims);
  ok(v.text && v.text.includes(word), `(c) ${what} was not refused naming ${word}: ${JSON.stringify(v)}`);
}
ok(JSON.stringify([MINTED.roles.map((r) => [r.id, r.name]), MINTED.relations.map((r) => [r.id, r.name, r.between]), MINTED.higher_order.map((h) => [h.id, h.name, h.relates]), MINTED.attains_thesis])
  === JSON.stringify([[["r_1", "rules"], ["r_2", "walk"], ["r_3", "file"], ["r_4", "team"]],
    [["c_1", "p1", ["r_1", "r_2"]], ["c_2", "p2", ["r_2", "r_3"]], ["c_3", "p3", ["r_4", "r_1"]]], [["h_1", "h1", ["c_1", "c_2"]], ["h_2", "h2", ["h_1", "c_3"]]], "h_2"])
  && MINTED.relations[0].holds === "{r_1} applies only to what {r_2} visits." && !Object.hasOwn(MINTED.higher_order[1], "from"),
  `(c) the runner did not mint r_/c_/h_ ids in order of appearance over the names: ${JSON.stringify(MINTED)}`);
ok(!readSet(STRUCTURE, fixtureClaims).text, "(c) the valid structure, its apex with no `from` and h2 relating h1, was refused");
ok(JSON.stringify(withReach(MINTED, fixtureClaims).reach) === JSON.stringify(withReach(minted((s) => { s.higher_order[1].from = []; }), fixtureClaims).reach),
  "(c) withReach over the apex with no `from` is not the reach of the apex with `from: []`");
ok(!readSet(without((s) => { s.relations[2].from = "c2"; }), fixtureClaims).text, "(c) a claim no relation is from was refused rather than reported");
const c = run("retry", { LPP_STRUCTURE: answers("structure-retry", [refusals[0][1], STRUCTURE]) });
ok(((readTrial(c.o) || { stages: [] }).stages.find((x) => x.stage === "structure") || {}).state === "done" && existsSync(join(c.o, "calls", "sme_read_set", "2", "answer.json")),
  `(c) the second structure answer was not read: ${c.said}`);
ok(existsSync(join(c.o, "calls", "sme_read_set", "2")) && prompt(c.o, "sme_read_set/2").includes(readSet(refusals[0][1], fixtureClaims).text),
  "(c) the second structure Call's stdin does not carry the first refusal verbatim");

// (d) legs.yaml's five Legs, derived with no Call
const legsFile = existsSync(join(a.o, "legs.yaml")) ? parseYaml(readFileSync(join(a.o, "legs.yaml"), "utf8"), "legs.yaml") : {};
const legs = legsFile.reader_path ? briefLegs(legsFile) : [];
ok(JSON.stringify(legs.map((l) => [l.leg_id, l.relation, l.text])) === JSON.stringify(WANT),
  `(d) legs.yaml does not hold the five Legs in post-order, each saying its relation's holds: ${JSON.stringify(legs.map((l) => [l.leg_id, l.relation, l.text]))}`);
ok(legs.map((l) => l.reaches_target === true).join(",") === "false,false,false,false,true", "(d) the apex's Leg is not alone marked `reaches_target`");
ok(JSON.stringify(legs[2] && legs[2].claims.map((g) => g.strand)) === '["c2"]', "(d) a higher-order relation's Leg does not carry the claims its `from` names");

// (f) legs.yaml as a Brief's reader_path
ok(legsFile.composed_by === "leg-planning", "(f) legs.yaml carries no `composed_by: leg-planning`");
ok(!readerPathRefusal(legsFile, MINTED).error, `(f) legs.yaml does not read as a reader_path: ${JSON.stringify(readerPathRefusal(legsFile, MINTED))}`);
for (const k of ["waypoints", "move", "purpose", "rationale", "introduces", "opens_section"]) {
  ok((legsFile.reader_path || []).every((l) => !Object.hasOwn(l, k)), `(f) a Leg of legs.yaml carries \`${k}\``);
}
ok(/carries `waypoints`/.test(readerPathRefusal({ ...legsFile, reader_path: legsFile.reader_path.map((l, i) => (i ? l : { ...l, waypoints: [{ point: "x" }] })) }, MINTED).error || ""),
  "(f) a Leg carrying waypoints was not refused by name");

// (g) the sheet
const sheet = existsSync(join(a.o, "sheet.html")) ? readFileSync(join(a.o, "sheet.html"), "utf8") : "";
const h2 = [...sheet.matchAll(/<h2>([^<]*)<\/h2>/g)].map((m) => m[1]);
ok(JSON.stringify(h2) === JSON.stringify(LPP_PARTS.slice(0, 4)), `(g) the sheet's parts are not in order: ${JSON.stringify(h2)}`);
const listed = (t) => LPP_HEADINGS.some((h) => (h.includes("<") || h === "Round n" ? new RegExp(`^${h.replace(/<[^>]+>|\bn$/, ".+")}$`).test(t) : h === t));
const stray = [...sheet.matchAll(/<h[2-4]>([^<]*)<\/h[2-4]>/g)].map((m) => m[1].replace(/&#39;|&apos;/g, "'")).find((t) => !listed(t));
ok(stray === undefined, `(g) the sheet carries the unlisted heading ${JSON.stringify(stray)}`);
ok(!/Waypoint/.test(h2.join(" ")), "(g) the sheet still carries a Waypoints part");
const legsPart = sheet.slice(sheet.indexOf("<h2>Legs</h2>"), sheet.indexOf("<h2>Rounds</h2>"));
ok(legsPart.includes("serves p1 (c1)") && legsPart.includes("serves h1 (c2)") && legsPart.includes("serves h2 (c1, c2, c3) (reaches the target)")
  && WANT.every(([, , text]) => legsPart.includes(text)), "(g) the Legs part does not show each Leg's relation by name and its text");
const structureHtml = sheet.slice(sheet.indexOf("<h2>Structure</h2>"), sheet.indexOf("<h2>Legs</h2>"));
ok(structureHtml.includes("<td>rules (c1, c2)</td>") && structureHtml.includes("<td>p1 (c1)</td>") && structureHtml.includes("<td>h2 (c1, c2, c3)</td>")
  && structureHtml.includes("rules applies only to what walk visits."),
  "(g) the sheet does not print each element as `<name> (<claim ids>)` with its Roles' names in `holds`");
ok(!/\b[rch]_\d+\b/.test(structureHtml + legsPart) && !/\d+ Roles?,/.test(sheet), "(g) the sheet prints a bare minted id or a counts line");
const briefFile = join(root, "brief.yaml");
writeFileSync(briefFile, stringifyYaml({ reader_path: [{ leg_id: "G1", relation: "c_1", text: "THE BRIEF'S OWN TEXT on the alarm.",
  claims: [{ type: "strand", strand: "L1", proposition: "x" }] }] }));
const g = run("brief", {}, ["--brief", briefFile]);
const gSheet = existsSync(join(g.o, "sheet.html")) ? readFileSync(join(g.o, "sheet.html"), "utf8") : "";
const gPart = gSheet.slice(gSheet.indexOf("<h2>The Brief&#39;s Legs</h2>") >= 0 ? gSheet.indexOf("<h2>The Brief&#39;s Legs</h2>") : gSheet.indexOf("<h2>The Brief's Legs</h2>"));
ok(gPart.includes("THE BRIEF") && gPart.includes(WANT[0][2]), `(g) the --brief sheet does not render the Brief's Legs beside the Trial's: ${g.said.slice(-400)}`);
ok((readTrial(g.o) || {}).brief && readTrial(g.o).brief.sha256 === sha(briefFile), "(g) trial.json does not carry the Brief's sha256");

// (j) a fourth claim the apex does not reach
const CLAIM4 = "A team keeps the run's log for ninety days.";
const claims4 = join(root, "claims4.md");
writeFileSync(claims4, readFileSync(claimsFile, "utf8") + `\ncite: coding::lesson/fixture-4@0123456789abcdef\nclaim: ${CLAIM4}\n`);
const claims4Ids = [...fixtureClaims, { id: "c4", claim: CLAIM4 }];
const S4 = without((s) => {
  s.roles.push({ name: "log", context: "The record a run leaves behind.", attributes: [], claims: ["c4"] });
  s.relations.push({ name: "p4", between: ["team", "log"], holds: "{team} keeps {log} for ninety days.", from: "c4" });
  s.higher_order.push({ name: "h3", relates: ["p4", "p3"], holds: "{team} keeps {log} of a pass of {rules}.", from: ["c4"] });
});
ok(!readSet(S4, claims4Ids).text, `(j) the four-claim structure was refused: ${JSON.stringify(readSet(S4, claims4Ids))}`);
const i4 = run("unreached", { LPP_STRUCTURE: answers("structure-4", [S4]) }, [], claims4);
const t4 = readTrial(i4.o) || { stages: [] };
ok(["structure", "legs"].every((st) => (t4.stages.find((x) => x.stage === st) || {}).state === "done"), `(j) the four-claim Trial did not derive its Legs: ${t4.stopped} ${i4.said.slice(-400)}`);
const l4 = existsSync(join(i4.o, "legs.yaml")) ? parseYaml(readFileSync(join(i4.o, "legs.yaml"), "utf8"), "legs.yaml").reader_path : [];
ok(JSON.stringify(l4.map((l) => l.relation)) === '["c_1","c_2","h_1","c_3","h_2"]', `(j) a Leg serves a relation the apex does not reach: ${JSON.stringify(l4.map((l) => l.relation))}`);
const sy = existsSync(join(i4.o, "structure.yaml")) ? parseYaml(readFileSync(join(i4.o, "structure.yaml"), "utf8"), "structure.yaml") : {};
const un = sy.unreached || { relations: [], higher_order: [], claims: [] };
ok(JSON.stringify(un.relations) === JSON.stringify([{ id: "c_4", reached_by: ["h_3"] }])
  && JSON.stringify(un.higher_order) === JSON.stringify([{ id: "h_3", reached_by: [] }])
  && JSON.stringify(un.claims) === JSON.stringify([{ id: "c4", reached_by: ["c_4", "h_3"] }]),
  `(j) structure.yaml does not carry p4, h3 and c4 under unreached: ${JSON.stringify(sy.unreached)}`);
ok(JSON.stringify(sy.reach) === JSON.stringify(["c_1", "c_2", "c_3", "h_1", "h_2"]), `(j) structure.yaml's reach is not the apex's closure: ${JSON.stringify(sy.reach)}`);
const st4 = ((readTrial(i4.o) || { stages: [] }).stages).find((x) => x.stage === "structure") || {};
ok(JSON.stringify(st4.reach) === JSON.stringify(sy.reach) && JSON.stringify(st4.unreached) === JSON.stringify(sy.unreached),
  `(j) trial.json's structure stage does not carry reach and unreached: ${JSON.stringify(st4)}`);
const iSheet = existsSync(join(i4.o, "sheet.html")) ? readFileSync(join(i4.o, "sheet.html"), "utf8") : "";
const iStructure = iSheet.slice(iSheet.indexOf("<h2>Structure</h2>"), iSheet.indexOf("<h2>Legs</h2>"));
ok(/<tr class="unreached"><td>p4 \(c4\)<\/td>/.test(iStructure) && /<tr class="unreached"><td>h3 \(c4\)<\/td>/.test(iStructure) && !/<tr class="unreached"><td>p1 \(c1\)<\/td>/.test(iStructure),
  "(j) the sheet does not mark p4 and h3, and only them, unreached under Structure");
const iClaims = iSheet.slice(iSheet.indexOf("<h2>Claims</h2>"), iSheet.indexOf("<h2>Structure</h2>"));
const iLeft = iClaims.slice(iClaims.indexOf("<h3>Unreached claims</h3>"));
ok(iClaims.includes("<h3>Unreached claims</h3>") && iLeft.includes("coding::lesson/fixture-4@0123456789abcdef") && iLeft.includes(CLAIM4) && !iLeft.includes(CLAIMS[0]),
  "(j) the sheet does not list c4 with its cite under Claims' Unreached claims");

// (k) the Brief sheet: a Brief over the Trial's structure and Legs, rendered with no model call
const { BRIEF_PARTS, BRIEF_RETIRED_WORDS } = await load("src/brief-plan-playground/sheet.mjs");
const kRoot = join(root, "brief-sheet");
mkdirSync(join(kRoot, "theses", "fixture"), { recursive: true });
const kBrief = join(kRoot, "theses", "fixture", "brief.yaml");
writeFileSync(kBrief, stringifyYaml({ slug: "fixture", thesis: THESIS, strands: claims4Ids.map((c) => ({ id: c.id, slug: c.id })),
  structure: parseYaml(readFileSync(join(i4.o, "structure.yaml"), "utf8"), "structure.yaml"),
  reader_path: l4.map((l, i) => (i ? l : { ...l, claims: [{ strand: "c1", proposition: CLAIMS[0] }] })) }));
const k = spawnSync(process.execPath, ["src/brief-plan-playground/sheet.mjs", "brief", "--brief", kBrief, "--out", join(kRoot, "out")],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: join(root, "no-model") }, timeout: 60000 });
const kSheet = existsSync(join(kRoot, "out", "sheet.html")) ? readFileSync(join(kRoot, "out", "sheet.html"), "utf8") : "";
ok(k.status === 0 && kSheet, `(k) the brief command did not render a sheet: ${k.stderr}`);
const kH2 = [...kSheet.matchAll(/<h2>([^<]*)<\/h2>/g)].map((m) => m[1]);
ok(JSON.stringify(kH2) === JSON.stringify(BRIEF_PARTS) && JSON.stringify(BRIEF_PARTS) === JSON.stringify(["Thesis", "Claims", "Structure Mapping", "Legs"]), `(k) the Brief sheet's parts are not Thesis, Claims, Structure Mapping and Legs: ${JSON.stringify(kH2)}`);
const kMap = kSheet.slice(kSheet.indexOf("<h2>Structure Mapping</h2>"), kSheet.indexOf("<h2>Legs</h2>")), kH3 = (s) => [...s.matchAll(/<h3>([^<]*)<\/h3>/g)].map((m) => m[1]), kGraph = kMap.slice(0, kMap.indexOf("<h3>Roles</h3>"));
ok(JSON.stringify(kH3(kMap)) === JSON.stringify(["Roles", "Relations", "Higher-order relations"]) && kH3(kSheet.replace(kMap, "")).length === 0, `(k) the Roles, Relations and Higher-order relations tables do not stand under Structure Mapping and nowhere else: ${JSON.stringify(kH3(kSheet))}`);
ok(kGraph.includes('class="mermaid"') && kGraph.includes("rules (c1, c2)") && kGraph.includes("h_2 ==&gt; h_1")
  && kGraph.includes("class h_2 apex") && /class [^\n]*c_4[^\n]* unreached/.test(kGraph) && !/\d+ Roles?,/.test(kSheet),
  "(k) the graph does not label nodes by name, draw higher-order edges thick, the apex blue and the unreached red, with no counts line");
const kWord = BRIEF_RETIRED_WORDS.find((w) => new RegExp(`\\b${w}`).test(kSheet));
ok(kWord === undefined, `(k) the Brief sheet prints the retired word ${JSON.stringify(kWord)}`);
const kTables = [...kSheet.matchAll(/<table>([\s\S]*?)<\/table>/g)].map((m) => m[1]);
ok(kTables.length === 5 && kTables.every((t) => {
  const head = /^<thead><tr>((?:<th>[^<]+<\/th>)+)<\/tr><\/thead>/.exec(t);
  const cols = head ? head[1].split("<th>").length - 1 : 0;
  return head && [...t.matchAll(/<tr[^>]*>((?:<td>[\s\S]*?<\/td>)+)<\/tr>/g)].every((r) => r[1].split("<td>").length - 1 === cols);
}), "(k) a table of the Brief sheet carries no <thead> with one heading per column");
const kClaims = kSheet.slice(kSheet.indexOf("<h2>Claims</h2>"), kSheet.indexOf("<h2>Structure Mapping</h2>"));
ok(kClaims.includes("<thead><tr><th>id</th><th>claim</th><th>reached</th></tr></thead>") && !kClaims.includes("cite")
  && kClaims.includes(CLAIMS[0]) && /<tr class="unreached"><td>c4<\/td>/.test(kClaims),
  "(k) the Claims table is not id, claim and reached with the unreached claim marked");
const kHigher = kMap.slice(kMap.indexOf("<h3>Higher-order relations</h3>"));
ok(/<tr><td>h_2<\/td><td>h2<\/td><td>[^<]*<\/td><td><\/td><\/tr>/.test(kHigher), "(k) the apex's from column is not empty");
const kLegs = kSheet.slice(kSheet.indexOf("<h2>Legs</h2>"));
ok(kLegs.includes("<th>id</th><th>relation</th><th>text</th>") && WANT.every(([id, , text]) => kLegs.includes(`<td>${id}</td>`) && kLegs.includes(text)),
  "(k) the Legs part does not list the five Legs with id, relation and text");

// (l) the Brief sheet's owner act: `show` writes the sheet at the home read from the Brief's path; a retired Leg is refused
const lHome = join(kRoot, "runs", "brief-plan-playground", "fixture");
const sheetCmd = (args) => spawnSync(process.execPath, ["src/brief-plan-playground/sheet.mjs", ...args],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: join(root, "no-model") }, timeout: 60000 });
const l = sheetCmd(["show", "--brief", kBrief]);
const lSheet = existsSync(join(lHome, "sheet.html")) ? readFileSync(join(lHome, "sheet.html"), "utf8") : "";
const lSha = existsSync(join(lHome, "brief.sha256")) ? readFileSync(join(lHome, "brief.sha256"), "utf8") : "";
ok(l.status === 0 && l.stdout === `${pathToFileURL(join(lHome, "sheet.html")).href}\n`,
  `(l) show did not print the sheet's file:// URL as its one line: ${l.status} ${l.stdout} ${l.stderr}`);
ok(lSheet === kSheet, "(l) show's sheet is not the sheet the brief command renders over the same Brief");
ok(lSha === `${createHash("sha256").update(readFileSync(kBrief)).digest("hex")}  theses/fixture/brief.yaml\n`,
  `(l) brief.sha256 does not name the Brief it rendered: ${JSON.stringify(lSha)}`);
const lSkill = existsSync(".claude/skills/brief-sheet/SKILL.md") ? readFileSync(".claude/skills/brief-sheet/SKILL.md", "utf8") : "";
ok(/^name: brief-sheet$/m.test(lSkill) && lSkill.includes("BriefPlanPlayground")
  && lSkill.includes("!`node src/brief-plan-playground/sheet.mjs show --brief $ARGUMENTS`"),
  "(l) .claude/skills/brief-sheet/SKILL.md does not run `sheet.mjs show` over its argument");
const kParsed = parseYaml(readFileSync(kBrief, "utf8"), "brief.yaml");
for (const [key, retire] of [["waypoints", (g) => ({ ...g, waypoints: [] })], ["move", (g) => ({ ...g, move: "m" })],
  ["text", ({ text, ...g }) => g]]) {
  const rRoot = join(root, `retired-${key}`);
  const rBrief = join(rRoot, "theses", "old", "brief.yaml");
  mkdirSync(dirname(rBrief), { recursive: true });
  writeFileSync(rBrief, stringifyYaml({ ...kParsed, slug: "old", reader_path: kParsed.reader_path.map((g, i) => (i === 1 ? retire(g) : g)) }));
  const leg = kParsed.reader_path[1].leg_id;
  for (const args of [["show", "--brief", rBrief], ["brief", "--brief", rBrief, "--out", join(rRoot, "out")]]) {
    const r = sheetCmd(args);
    ok(r.status === 1 && r.stderr.includes(`Leg ${leg} `) && r.stderr.includes(`\`${key}\``) && r.stderr.includes("kogaki#1775"),
      `(l) ${args[0]} over a Leg retired by \`${key}\` is not refused naming ${leg} and the key: ${r.status} ${r.stderr}`);
  }
  ok(!existsSync(join(rRoot, "runs")) && !existsSync(join(rRoot, "out")), `(l) a Brief retired by \`${key}\` wrote a sheet`);
}

// (h) nothing under the repository's moves/ or theses/ changed
ok(snapshot() === before, "(h) the run changed the repository's moves/ or theses/");

rmSync(root, { recursive: true, force: true });
if (!fails.length) rmSync(outDir, { recursive: true, force: true });
if (fails.length) { for (const f of fails) console.log(`FAIL: ${f}`); console.log(`kept: ${outDir}`); process.exit(1); }
console.log("check-leg-planning-playground: ok");
JS
main=$?
# Case (m)'s pass is held to this member's `case_floor` in checks/registry.json, in both directions (kogaki#661, kogaki#970).
FLOOR=$(node -e 'const r = require("./checks/registry.json"); console.log(r.checks.find((t) => t.id === "leg-planning-playground").admission.case_floor)')
out=$(node checks/leg-planning-playground-considered-cases.mjs) || { echo "$out"; exit 1; }
echo "$out"
n=$(printf '%s\n' "$out" | sed -n 's/^check-leg-planning-playground (m): ok, \([0-9][0-9]*\) case(s)$/\1/p')
if [ -z "$n" ] || (( n < FLOOR )); then echo "FAIL: (m) ran ${n:-no} case(s), below its case_floor of $FLOOR — cases were lost"; exit 1; fi
if (( n > FLOOR )); then echo "FAIL: (m) ran $n case(s), above its case_floor of $FLOOR — set case_floor to $n in checks/registry.json"; exit 1; fi
exit "$main"
