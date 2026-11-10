#!/usr/bin/env bash
# check-leg-planning -- the Leg-Planning Playground's Trial (kogaki#1764), driven through `node src/leg-planning/trial.mjs run`
# with ONE fake model binary:
#   (a) a claims file of a thesis and three claims, with valid answers at every row, exits 0 and writes structure.yaml,
#       waypoints.yaml, legs.yaml, trial.json and sheet.html, every Call under calls/<row>/<n>/, trial.json carrying each
#       file's sha256; no `lpp_legs` or `reader_path_fit_unit` Call is made, and `/paragraph-plan` runs over the Legs,
#       trial.json carrying the plan's path and sha256 and, per Leg Waypoint, the bound Move id and the verdict.
#   (b) a `proposition:` line is refused naming `claim`, a second `thesis:` and a `cite:` with no `claim:` naming the line,
#       and nothing is written.
#   (c) validateReadSet refuses a non-apex higher-order relation with no `from` or a `from` naming no claim, a Role in no
#       relation, a higher-order relation relating one relation, one relating itself through another, a written `reach` and
#       a missing `attains_thesis`, naming each; the apex with `from: []` and a higher-order relation relating a
#       higher-order relation pass; a refused first answer is handed back and the second is read.

#   (d) the lpp_waypoints stdin carries the structure, the thesis and the Persona and no claim text; an unknown id, a
#       reached relation carried by none, a Waypoint carrying an unreached id, a last Waypoint not carrying
#       `attains_thesis` and a written `serves` are refused naming the Waypoint or the relation; `serves` is the `from` ids
#       of the relations at the bottom of each carried id's closure.
#   (e) a GROUNDED `does-not-fit` naming Waypoint 2 re-asks Waypoint 2 alone with the judge's text verbatim, and the sheet
#       highlights row 2 with the phrase.

#   (f) legs.yaml holds one Leg per higher-order relation, every Waypoint in exactly one Leg, no `move`, the apex Leg last
#       with `reaches_target`; it reads as a Brief's `reader_path`, carries `composed_by: leg-planning` and no purpose,
#       rationale, introduces or opens_section, and a Leg with no `move` is read as leaving nothing; a Waypoint carrying
#       no higher-order relation's relation is in the Leg of the next placed Waypoint.
#   (g) the sheet's parts stand in order under listed headings, each Waypoint's bound paragraph Move and Paragraph
#       Waypoints under its Leg's higher-order relation, no Move-Segment table and no fit verdict, and a `--brief` run
#       renders that Brief's Legs beside the Trial's.

#   (h) the repository's moves/ and theses/ are unchanged.
#   (i) a `no_paragraph_move_fits` refusal stops the Trial at the paragraph-plan stage naming the Leg and the Waypoint,
#       the Waypoints and the Legs standing.
#   (j) a claims file of four claims whose fourth is the `from` of a relation the apex does not reach writes
#       structure.yaml with that relation and claim under `unreached`, trial.json carries `reach` and `unreached` under the
#       structure stage, and the sheet marks the unreached rows under Structure and lists the claim under Claims.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const repo = resolve(".");
const load = (p) => import(pathToFileURL(join(repo, p)).href);
const { parseYaml, stringifyYaml } = await load("src/yaml.mjs");
const { validateReadSet, validateWaypoints, readerPathRefusal, withReach, derivedLegs } = await load("src/leg-planning/read-set.mjs");
const { LPP_PARTS, LPP_HEADINGS } = await load("src/leg-planning/sheet.mjs");
const { briefLegs } = await load("src/compose/record.mjs");
const { loadMoveContracts, readerPersona, personaPriorKnowledgeLine } = await load("src/compose.mjs");
const { planLegOptions } = await load("src/paragraph-plan.mjs");
const root = mkdtempSync(join(tmpdir(), "leg-planning-"));
// THE MAPPER IS OFF IN THIS MEMBER: the fake answers ParagraphPlan's plan and judge calls alone, as
// checks/check-mapping-playground.sh does; checks/check-paragraph-plan.sh case (z) runs the Mapper.
process.env.KOGAKI_JOB_HEARTBEAT_MS = "100";
const noMapper = JSON.parse(readFileSync("kogaki.settings.json", "utf8"));
noMapper.paragraph_plan.mapper = false;
process.env.KOGAKI_SETTINGS = join(root, "settings-no-mapper.json");
writeFileSync(process.env.KOGAKI_SETTINGS, JSON.stringify(noMapper));
const trials = join(repo, "runs", "leg-planning");
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
const STRUCTURE = {
  roles: [{ id: "rules", context: "A set of checks that runs without anyone choosing what it reads.", attributes: ["automatic"], claims: ["c1", "c2"] },
    { id: "walk", context: "The list of files a tool visits when it runs.", attributes: [], claims: ["c1", "c2"] },
    { id: "file", context: "One file in a repository.", attributes: ["skipped"], claims: ["c2", "c3"] },
    { id: "team", context: "The people who read the result of a run.", attributes: [], claims: ["c3"] }],
  relations: [{ id: "p1", between: ["rules", "walk"], holds: "{rules} applies only to what {walk} visits.", from: "c1" },
    { id: "p2", between: ["walk", "file"], holds: "{file} left off {walk} is never checked.", from: "c2" },
    { id: "p3", between: ["team", "rules"], holds: "{team} reads a pass of {rules} as covering every file.", from: "c3" }],
  higher_order: [{ id: "h1", relates: ["p1", "p2"], holds: "Because {rules} reads only {walk}, {file} off it is unchecked.", from: ["c2"] },
    { id: "h2", relates: ["h1", "p3"], holds: "{team} trusts a pass that never reached {file}.", from: [] }],
  attains_thesis: "h2",
};
const WAYPOINTS = { waypoints: [
  { point: "An automatic rule set applies only to the files its walker visits.", carries: ["p1"] },
  { point: "A file the walker skips is never checked, because the rules read only the walk.", carries: ["p2", "h1"] },
  { point: "A team that reads a pass as covering every file trusts a pass that never reached the skipped file.", carries: ["p3", "h2"] }] };
const MOVE_A = "answer_a_posed_question_then_win_two_easy_assents_before_ranking_the_distinction_first";
const FITS = { verdict: "fits", sites: [] };
const PHRASE = "because the rules read only the walk";
const WHY = "No carried relation states why the file goes unchecked in those words.";
const NOT_FIT = { verdict: "does-not-fit", sites: [{ waypoint: 2, phrase: PHRASE, why: WHY }] };
const SITE = { waypoint: 2, point: "A file the walker skips is never checked by the rules that read the walk.", carries: ["p2", "h1"] };
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
  const body = (key) => { const k = prompt.lastIndexOf('"' + key + '"'); return JSON.parse(prompt.slice(prompt.lastIndexOf("{", k))); };
  const say = (stage, r) => { appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, prompt }) + "\\n");
    writeSync(1, JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0); };
  if (prompt.includes('"leg_you_must_judge"')) {
    const leg = body("leg_you_must_judge").leg_you_must_judge;
    return say("plan-judge", { version: "1", leg_id: leg.leg_id, verdicts: leg.waypoints.map((w) => ({ waypoint: w.waypoint, verdict: "fits", why: "it begins at before and ends at after." })) });
  }
  if (prompt.includes('"leg_waypoint_you_must_plan"')) {
    const refused = body("leg_waypoint_you_must_plan").refused_here.map((h) => h.entry).filter(Boolean);
    return say("plan-site", refused[refused.length - 1]);
  }
  if (prompt.includes('"leg_you_must_plan"')) {
    const { leg_you_must_plan: leg, paragraph_moves_you_may_bind: bindable } = body("leg_you_must_plan");
    const m = bindable.find((x) => x.id === process.env.LPP_PLAN_MOVE) || bindable[0];
    if (leg.leg_id === process.env.LPP_NOFIT) {
      return say("plan", { version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w) => ({ waypoint: w.waypoint, move: null,
        rationale: "no Move's takes are met by what stands here." })) });
    }
    return say("plan", { version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w) => ({ waypoint: w.waypoint, move: m.id,
      materials: [...w.serves], purpose: "PURPOSE-" + w.waypoint + " brings the reader to the point.",
      depends_on: w.waypoint > 1 ? [w.waypoint - 1] : [], introduces: [], "re-activate": [], rationale: "its before holds the state and its after reaches the next point.",
      ...(w.waypoint > 1 ? { join: "consequence" } : {}),
      paragraph_waypoints: Array.from({ length: m.segments.length }, (_, n) => ({ point: "PW-" + leg.leg_id + "-" + w.waypoint + "-" + (n + 1) + " the paragraph makes its point.", serves: [...w.serves], cast: {} })) })) });
  }
  const stage = at("sme_read_set") ? "structure" : at("lpp_waypoints") ? (prompt.includes('"waypoint_you_must_rewrite":') ? "site" : "waypoints")
    : at("lpp_grounded") ? "grounded" : at("lpp_legs") ? "legs" : at("reader_path_fit_unit") ? "fit" : "unknown";
  let n = 0; try { n = readFileSync(dir + "/seen.jsonl", "utf8").split("\\n").filter(Boolean).filter((l) => JSON.parse(l).stage === stage).length; } catch {}
  const list = JSON.parse(readFileSync(process.env["LPP_" + stage.toUpperCase()], "utf8"));
  const r = list[Math.min(n, list.length - 1)];
  appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, prompt }) + "\\n");
  writeSync(1, JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0);
});
`);
chmodSync(judge, 0o755);
const DEFAULT = { LPP_STRUCTURE: answers("structure", [STRUCTURE]), LPP_WAYPOINTS: answers("waypoints", [WAYPOINTS]),
  LPP_GROUNDED: answers("grounded", [FITS]), LPP_SITE: answers("site", [SITE]), LPP_PLAN_MOVE: MOVE_A };
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
  const r = spawnSync(process.execPath, ["src/leg-planning/trial.mjs", "run", "--claims", claims, "--out", o, ...extra],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, LPP_FIXTURE_DIR: dir, ...DEFAULT, ...env }, timeout: 600000 });
  const seen = existsSync(join(dir, "seen.jsonl")) ? readFileSync(join(dir, "seen.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  return { ...r, o, seen, said: `${r.stdout}${r.stderr}` };
};
const readTrial = (o) => (existsSync(join(o, "trial.json")) ? JSON.parse(readFileSync(join(o, "trial.json"), "utf8")) : null);
const prompt = (o, call) => readFileSync(join(o, "calls", call, "prompt.md"), "utf8");

// (a) the main run
const a = run("main");
ok(a.status === 0, `(a) the Trial did not exit 0: ${a.said}`);
for (const f of ["structure.yaml", "waypoints.yaml", "legs.yaml", "trial.json", "sheet.html"]) ok(existsSync(join(a.o, f)), `(a) ${f} was not written`);
for (const c of ["sme_read_set/1", "lpp_waypoints/1", "lpp_grounded/1"]) {
  ok(existsSync(join(a.o, "calls", c, "prompt.md")) && existsSync(join(a.o, "calls", c, "answer.json")), `(a) no Call Record at calls/${c}/`);
}
for (const row of ["lpp_legs", "reader_path_fit_unit"]) ok(!existsSync(join(a.o, "calls", row)), `(a) the Trial made a \`${row}\` Call`);
ok(!a.seen.some((x) => ["legs", "fit", "unknown"].includes(x.stage)), `(a) the fake model was asked a row the Trial no longer asks: ${JSON.stringify([...new Set(a.seen.map((x) => x.stage))])}`);
const ta = readTrial(a.o) || { stages: [] };
ok(ta.claims && ta.claims.sha256 === sha(claimsFile), "(a) trial.json does not carry the claims file's sha256");
ok(ta.library && /^[0-9a-f]{64}$/.test(ta.library.sha256 || ""), "(a) trial.json does not carry the library's sha256");
for (const [stage, f] of [["structure", "structure.yaml"], ["waypoints", "waypoints.yaml"], ["legs", "legs.yaml"]]) {
  const st = ta.stages.find((s) => s.stage === stage);
  ok(st && st.state === "done" && st.file && st.file.sha256 === sha(join(a.o, f)), `(a) trial.json's ${stage} stage does not carry ${f} at its sha256: ${JSON.stringify(st)}`);
}
ok(ta.sheet && ta.sheet.sha256 === sha(join(a.o, "sheet.html")), "(a) trial.json does not carry the sheet's sha256");
const pa = ta.stages.find((s) => s.stage === "paragraph-plan") || {};
const planPath = join(a.o, "paragraph-plan", "paragraph-plan.yaml");
ok(pa.state === "done" && pa.plan && existsSync(planPath) && pa.plan.sha256 === sha(planPath) && pa.plan.path.endsWith("paragraph-plan/paragraph-plan.yaml"),
  `(a) trial.json's paragraph-plan stage does not carry the plan's path and sha256: ${JSON.stringify(pa).slice(0, 600)}`);
ok(JSON.stringify((pa.waypoints || []).map((w) => [w.leg_id, w.waypoint, w.move, w.verdict]))
  === JSON.stringify([["L1", 1, MOVE_A, "passed in Round 1"], ["L1", 2, MOVE_A, "passed in Round 1"], ["L2", 1, MOVE_A, "passed in Round 1"]]),
  `(a) trial.json does not carry each Leg Waypoint's bound Move and verdict: ${JSON.stringify(pa.waypoints)}`);
const planRec = existsSync(planPath) ? parseYaml(readFileSync(planPath, "utf8"), "plan") : { legs: [] };
ok(planRec.legs.map((l) => l.waypoints.length).join(",") === "2,1" && planRec.legs.every((l) => l.waypoints.every((w) => w.move === MOVE_A)),
  "(a) the plan does not bind one Move per Leg Waypoint as one paragraph");

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
  ["a Role in no relation", without((s) => { s.roles.push({ id: "idle", context: "A thing nothing relates.", attributes: [], claims: ["c1"] }); }), "\"idle\""],
  ["a higher-order relation relating one relation", without((s) => { s.higher_order[0].relates = ["p1"]; }), "\"h1\""],
  ["a missing attains_thesis", without((s) => { delete s.attains_thesis; }), "attains_thesis"]];
for (const [what, s, word] of refusals) {
  const v = validateReadSet(s, fixtureClaims);
  ok(v.text && v.text.includes(word), `(c) ${what} was not refused naming ${word}: ${JSON.stringify(v)}`);
}
ok(!validateReadSet(STRUCTURE, fixtureClaims).text, "(c) the valid structure, its apex `from: []` and h2 relating h1, was refused");
ok(!validateReadSet(without((s) => { s.relations[2].from = "c2"; }), fixtureClaims).text, "(c) a claim no relation is from was refused rather than reported");
const c = run("retry", { LPP_STRUCTURE: answers("structure-retry", [refusals[0][1], STRUCTURE]) });
ok(c.status === 0 && existsSync(join(c.o, "calls", "sme_read_set", "2", "answer.json")), `(c) the second structure answer was not read: ${c.said}`);
ok(existsSync(join(c.o, "calls", "sme_read_set", "2")) && prompt(c.o, "sme_read_set/2").includes(validateReadSet(refusals[0][1], fixtureClaims).text),
  "(c) the second structure Call's stdin does not carry the first refusal verbatim");

// (d) the Waypoints' input and refusals
const wp = prompt(a.o, "lpp_waypoints/1");
const input = wp.slice(wp.lastIndexOf("----- INPUT (JSON) -----"));
ok(input.includes(STRUCTURE.relations[0].holds) && input.includes(THESIS) && input.includes("prior_knowledge"), "(d) the lpp_waypoints stdin does not carry the structure, the thesis and the Persona");
ok(CLAIMS.every((t) => !wp.includes(t)), "(d) the lpp_waypoints stdin carries claim text");
const wset = (f) => { const w = JSON.parse(JSON.stringify(WAYPOINTS)); f(w.waypoints); return w; };
for (const [what, w, word] of [
  ["an unknown id", wset((ws) => { ws[1].carries.push("p9"); }), "Waypoint 2"],
  ["a reached relation carried by none", wset((ws) => { ws[0].carries = ["h1"]; ws[1].carries = ["p2"]; }), "\"p1\""],
  ["a last Waypoint not carrying attains_thesis", wset((ws) => { ws[2].carries = ["p3"]; ws[1].carries.push("h2"); }), "Waypoint 3"],
  ["a written serves", wset((ws) => { ws[0].serves = ["c1"]; }), "Waypoint 1"]]) {
  const v = validateWaypoints(w, STRUCTURE);
  ok(v.text && v.text.includes(word), `(d) ${what} was not refused naming ${word}: ${JSON.stringify(v)}`);
}
const wy = existsSync(join(a.o, "waypoints.yaml")) ? parseYaml(readFileSync(join(a.o, "waypoints.yaml"), "utf8"), "waypoints.yaml") : { waypoints: [] };
ok(JSON.stringify(wy.waypoints.map((w) => w.serves)) === JSON.stringify([["c1"], ["c1", "c2"], ["c1", "c2", "c3"]]),
  `(d) serves is not the from ids of each Waypoint's carried relations: ${JSON.stringify(wy.waypoints.map((w) => w.serves))}`);

// (e) a GROUNDED refusal at Waypoint 2
const e = run("grounded", { LPP_GROUNDED: answers("grounded-retry", [NOT_FIT, FITS]) });
ok(e.status === 0, `(e) the grounded retry did not finish: ${e.said}`);
const site = existsSync(join(e.o, "calls", "lpp_waypoints", "2")) ? prompt(e.o, "lpp_waypoints/2") : "";
const siteInput = site.slice(site.lastIndexOf("----- INPUT (JSON) -----"));
ok(siteInput.includes('"waypoint_you_must_rewrite": {\n    "waypoint": 2') && site.includes(PHRASE) && site.includes(WHY),
  "(e) the second lpp_waypoints Call is not Waypoint 2 alone with the judge's phrase and text");
ok(e.seen.filter((s) => s.stage === "site").length === 1 && e.seen.filter((s) => s.stage === "waypoints").length === 1, "(e) the rewrite was not one Call for Waypoint 2 alone");
const eSheet = existsSync(join(e.o, "sheet.html")) ? readFileSync(join(e.o, "sheet.html"), "utf8") : "";
const named = /<tr class="named"><td>(\d+)<\/td><td>([^]*?)<\/td>/.exec(eSheet);
ok(named && named[1] === "2" && named[2].includes(PHRASE), `(e) the sheet does not highlight row 2 with the phrase: ${named && named[0]}`);
const eWy = existsSync(join(e.o, "waypoints.yaml")) ? parseYaml(readFileSync(join(e.o, "waypoints.yaml"), "utf8"), "w").waypoints : [];
ok(eWy[1] && eWy[1].point === SITE.point && eWy[0].point === WAYPOINTS.waypoints[0].point, "(e) the passed set does not carry the rewrite of Waypoint 2 alone");

// (f) legs.yaml as a Brief's reader_path
const legsFile = existsSync(join(a.o, "legs.yaml")) ? parseYaml(readFileSync(join(a.o, "legs.yaml"), "utf8"), "legs.yaml") : {};
ok(legsFile.composed_by === "leg-planning", "(f) legs.yaml carries no `composed_by: leg-planning`");
ok(!readerPathRefusal(legsFile).error, `(f) legs.yaml does not read as a reader_path: ${JSON.stringify(readerPathRefusal(legsFile))}`);
const legs = briefLegs(legsFile);
const library = loadMoveContracts(join(repo, "moves"));
const persona = readerPersona(join(repo, "audiences", "dev-to-zenn.md"));
const options = planLegOptions(legs, library.moves || [], personaPriorKnowledgeLine(persona));
ok(legs.length === 2 && options.every((x) => !x.error), `(f) /paragraph-plan's Leg reader refuses legs.yaml: ${JSON.stringify(options.find((x) => x.error))}`);
ok(options.every((x) => x.leaves.length === 0 && x.previousLeaves.length === 0), "(f) a Leg with no `move` is not read as leaving nothing");
ok(legs.every((l) => !Object.hasOwn(l, "move")), "(f) a Leg of legs.yaml carries `move`");
ok(JSON.stringify(legs.map((l) => l.waypoints.map((w) => w.point))) === JSON.stringify([[WAYPOINTS.waypoints[0].point, WAYPOINTS.waypoints[1].point], [WAYPOINTS.waypoints[2].point]]),
  "(f) the Legs are not one per higher-order relation, h1's Waypoints then the apex's");
ok(legs.map((l) => l.reaches_target === true).join(",") === "false,true", "(f) the apex Leg is not last and alone marked `reaches_target`");
const la = (ta.stages.find((s) => s.stage === "legs") || {}).partition || [];
ok(JSON.stringify(la) === JSON.stringify([{ leg_id: "L1", relation: "h1", waypoints: [1, 2] }, { leg_id: "L2", relation: "h2", waypoints: [3] }]),
  `(f) trial.json's legs stage does not carry the partition by higher-order relation: ${JSON.stringify(la)}`);
const loose = derivedLegs([{ point: "x", carries: ["p9"], serves: ["c1"] }, { point: "y", carries: ["p1"], serves: ["c1"] }, { point: "z", carries: ["h2"], serves: ["c2"] }],
  STRUCTURE, fixtureClaims).partition;
ok(JSON.stringify(loose.map((p) => p.waypoints)) === JSON.stringify([[1, 2], [3]]), `(f) a Waypoint carrying no related relation is not in the next placed Waypoint's Leg: ${JSON.stringify(loose)}`);
for (const k of ["purpose", "rationale", "introduces", "opens_section"]) ok(legs.every((l) => !Object.hasOwn(l, k)), `(f) a Leg of legs.yaml carries \`${k}\``);
ok(JSON.stringify(legs.map((l) => l.claims.map((g) => g.strand))) === JSON.stringify([["c1", "c2"], ["c1", "c2", "c3"]]), "(f) a Leg's claims are not its Waypoints' serves");

// (g) the sheet
const sheet = existsSync(join(a.o, "sheet.html")) ? readFileSync(join(a.o, "sheet.html"), "utf8") : "";
const h2 = [...sheet.matchAll(/<h2>([^<]*)<\/h2>/g)].map((m) => m[1]);
ok(JSON.stringify(h2) === JSON.stringify(LPP_PARTS.slice(0, 5)), `(g) the sheet's parts are not in order: ${JSON.stringify(h2)}`);
const listed = (t) => LPP_HEADINGS.some((h) => (h.includes("<") || h === "Round n" ? new RegExp(`^${h.replace(/<[^>]+>|\bn$/, ".+")}$`).test(t) : h === t));
const stray = [...sheet.matchAll(/<h[2-4]>([^<]*)<\/h[2-4]>/g)].map((m) => m[1].replace(/&#39;|&apos;/g, "'")).find((t) => !listed(t));
ok(stray === undefined, `(g) the sheet carries the unlisted heading ${JSON.stringify(stray)}`);
const legsPart = sheet.slice(sheet.indexOf("<h2>Legs</h2>"), sheet.indexOf("<h2>Rounds</h2>"));
ok(legsPart.includes("serves h1 — ") && legsPart.includes("serves h2 — ") && legsPart.includes(`${MOVE_A}.yaml`) && legsPart.includes("PW-L1-2-1")
  && legsPart.includes("passed in Round 1"), "(g) the Legs part does not show each Waypoint's bound Move and Paragraph Waypoints under its Leg's higher-order relation");
ok(!legsPart.includes("<th>operation</th>") && !legsPart.includes("fit:"), "(g) the Legs part still carries a Move-Segment table or a fit verdict");
const roundsHtml = sheet.slice(sheet.indexOf("<h2>Rounds</h2>"));
ok(roundsHtml.includes("<h3>Stage paragraph-plan</h3>") && /<h4>Round L1 Waypoint 1, 1<\/h4>/.test(roundsHtml), "(g) the Rounds part carries no `Stage paragraph-plan` from the plan's run");
const briefFile = join(root, "brief.yaml");
writeFileSync(briefFile, stringifyYaml({ reader_path: [{ leg_id: "G1", move: MOVE_A, claims: [{ strand: "L1", proposition: "x" }],
  waypoints: [{ point: "THE BRIEF'S OWN POINT on the alarm.", serves: ["L1"], case: "own" }] }] }));
const g = run("brief", {}, ["--brief", briefFile]);
const gSheet = existsSync(join(g.o, "sheet.html")) ? readFileSync(join(g.o, "sheet.html"), "utf8") : "";
const gPart = gSheet.slice(gSheet.indexOf("<h2>The Brief&#39;s Legs</h2>") >= 0 ? gSheet.indexOf("<h2>The Brief&#39;s Legs</h2>") : gSheet.indexOf("<h2>The Brief's Legs</h2>"));
ok(g.status === 0 && gPart.includes("THE BRIEF") && gPart.includes(WAYPOINTS.waypoints[0].point), `(g) the --brief sheet does not render the Brief's Legs beside the Trial's: ${g.said}`);
ok((readTrial(g.o) || {}).brief && readTrial(g.o).brief.sha256 === sha(briefFile), "(g) trial.json does not carry the Brief's sha256");

// (i) a no_paragraph_move_fits refusal at Leg L2
const nf = run("nofit", { LPP_NOFIT: "L2" });
const ti = readTrial(nf.o) || { stages: [] };
const pi = ti.stages.find((s) => s.stage === "paragraph-plan") || {};
ok(nf.status !== 0 && pi.state === "stopped" && String(ti.stopped).startsWith("paragraph-plan: no_paragraph_move_fits at Leg L2, Waypoint 1"),
  `(i) the refusal did not stop the Trial naming the Leg and the Waypoint: ${ti.stopped} ${nf.said.slice(-400)}`);
ok(["waypoints", "legs"].every((st) => (ti.stages.find((s) => s.stage === st) || {}).state === "done") && existsSync(join(nf.o, "legs.yaml")),
  "(i) the refusal was read as a refusal of the Waypoints or the Legs");

// (j) a fourth claim the apex does not reach
const CLAIM4 = "A team keeps the run's log for ninety days.";
const claims4 = join(root, "claims4.md");
writeFileSync(claims4, readFileSync(claimsFile, "utf8") + `\ncite: coding::lesson/fixture-4@0123456789abcdef\nclaim: ${CLAIM4}\n`);
const claims4Ids = [...fixtureClaims, { id: "c4", claim: CLAIM4 }];
const S4 = without((s) => {
  s.roles.push({ id: "log", context: "The record a run leaves behind.", attributes: [], claims: ["c4"] });
  s.relations.push({ id: "p4", between: ["team", "log"], holds: "{team} keeps {log} for ninety days.", from: "c4" });
  s.higher_order.push({ id: "h3", relates: ["p4", "p3"], holds: "{team} keeps {log} of a pass of {rules}.", from: ["c4"] });
});
ok(!validateReadSet(S4, claims4Ids).text, `(j) the four-claim structure was refused: ${JSON.stringify(validateReadSet(S4, claims4Ids))}`);
const R4 = withReach(S4, claims4Ids);
const wsOver4 = (f) => { const w = JSON.parse(JSON.stringify(WAYPOINTS)); f(w.waypoints); return w; };
const v4 = validateWaypoints(wsOver4((ws) => { ws[0].carries.push("p4"); }), R4);
ok(v4.text && v4.text.includes("Waypoint 1") && v4.text.includes("\"p4\""), `(j) a Waypoint carrying an unreached relation was not refused naming the Waypoint and the id: ${JSON.stringify(v4)}`);
ok(!validateWaypoints(WAYPOINTS, R4).text, "(j) the set carrying exactly the reached ids with the apex last was refused");
const i4 = run("unreached", { LPP_STRUCTURE: answers("structure-4", [S4]) }, [], claims4);
ok(i4.status === 0, `(j) the four-claim Trial did not exit 0: ${i4.said}`);
const sy = existsSync(join(i4.o, "structure.yaml")) ? parseYaml(readFileSync(join(i4.o, "structure.yaml"), "utf8"), "structure.yaml") : {};
const un = sy.unreached || { relations: [], higher_order: [], claims: [] };
ok(JSON.stringify(un.relations) === JSON.stringify([{ id: "p4", reached_by: ["h3"] }])
  && JSON.stringify(un.higher_order) === JSON.stringify([{ id: "h3", reached_by: [] }])
  && JSON.stringify(un.claims) === JSON.stringify([{ id: "c4", reached_by: ["p4", "h3"] }]),
  `(j) structure.yaml does not carry p4, h3 and c4 under unreached: ${JSON.stringify(sy.unreached)}`);
ok(JSON.stringify(sy.reach) === JSON.stringify(["p1", "p2", "p3", "h1", "h2"]), `(j) structure.yaml's reach is not the apex's closure: ${JSON.stringify(sy.reach)}`);
const st4 = ((readTrial(i4.o) || { stages: [] }).stages).find((x) => x.stage === "structure") || {};
ok(JSON.stringify(st4.reach) === JSON.stringify(sy.reach) && JSON.stringify(st4.unreached) === JSON.stringify(sy.unreached),
  `(j) trial.json's structure stage does not carry reach and unreached: ${JSON.stringify(st4)}`);
const iSheet = existsSync(join(i4.o, "sheet.html")) ? readFileSync(join(i4.o, "sheet.html"), "utf8") : "";
const iStructure = iSheet.slice(iSheet.indexOf("<h2>Structure</h2>"), iSheet.indexOf("<h2>Leg Waypoints</h2>"));
ok(/<tr class="unreached"><td>p4<\/td>/.test(iStructure) && /<tr class="unreached"><td>h3<\/td>/.test(iStructure) && !/<tr class="unreached"><td>p1<\/td>/.test(iStructure),
  "(j) the sheet does not mark p4 and h3, and only them, unreached under Structure");
const iClaims = iSheet.slice(iSheet.indexOf("<h2>Claims</h2>"), iSheet.indexOf("<h2>Structure</h2>"));
const iLeft = iClaims.slice(iClaims.indexOf("<h3>Unreached claims</h3>"));
ok(iClaims.includes("<h3>Unreached claims</h3>") && iLeft.includes("coding::lesson/fixture-4@0123456789abcdef") && iLeft.includes(CLAIM4) && !iLeft.includes(CLAIMS[0]),
  "(j) the sheet does not list c4 with its cite under Claims' Unreached claims");

// (h) nothing under the repository's moves/ or theses/ changed
ok(snapshot() === before, "(h) the run changed the repository's moves/ or theses/");

rmSync(root, { recursive: true, force: true });
if (!fails.length) rmSync(outDir, { recursive: true, force: true });
if (fails.length) { for (const f of fails) console.log(`FAIL: ${f}`); console.log(`kept: ${outDir}`); process.exit(1); }
console.log("check-leg-planning: ok");
JS
