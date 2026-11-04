#!/usr/bin/env bash
# check-mapping-playground-short -- the short Trial (kogaki#1669), driven through `node src/mapping-playground/short.mjs run` with ONE fake model binary:
#   (a) the owner-authored route exits 0 with two calls recorded, and its files and trial.json fields are written.
#   (b) `--mapper sme_map_roles` records three calls and `structure.author: sme`.
#   (c) a `--rbs` naming no `rbs_<variant>` row is refused naming the rows the table declares.
#   (d) a binding answer of `move: null` stops at `bind`, and the record shows it.
#   (e) the writer's recorded stdin equals the Packet byte for byte.
#   (f) sheet.html is dark at its root and carries its parts in order, one table row per pair.
#   (g) a `target` carrying a content word of the `claim:` is refused naming the word.
#   (h) the repository's `moves/` and `theses/` are unchanged.
#   (i) checks/check-mapping-playground.sh still passes.
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
const { parseYaml, stringifyYaml } = await import(pathToFileURL(join(repo, "src/yaml.mjs")).href);
const { validateRbsTable } = await import(pathToFileURL(join(repo, "src/mapping-playground/short.mjs")).href);
const root = mkdtempSync(join(tmpdir(), "mapping-playground-short-"));
const trials = join(repo, "runs", "mapping-playground");
mkdirSync(trials, { recursive: true });
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

// ---- the fixture strand file and RelationalStructure ----
const CITE = "coding::lesson/a-fixture-strand@0123456789abcdef";
const CLAIM = "A rule set applies automatically only to the files the walker sees.";
const strand = join(root, "strand.md");
writeFileSync(strand, `cite: ${CITE}\nclaim: ${CLAIM}\n\nThe walker lists the files; the rule set applies to that list and to nothing else.\n`);
const mapped = { strand: CITE,
  roles: [{ id: "crew", context: "A cleaning crew arrives at a house with a written list of rooms." },
    { id: "list", context: "The written list names the rooms the crew was told about at the door." },
    { id: "room", context: "A room nobody wrote down stays dusty, even when it is next door." }],
  relations: [{ id: "cleans", between: ["crew", "list"], holds: "The crew cleans each room the list names." },
    { id: "missed", between: ["list", "room"], holds: "A room missing from the list is never reached." }],
  higher_order: { relates: ["cleans", "missed"], holds: "Because the crew follows the list, what the list leaves out stays dusty." } };
const structure = join(root, "structure.yaml");
writeFileSync(structure, stringifyYaml(mapped));
const PAIRS = mapped.roles.length + mapped.relations.length + 1;

// ---- the one fake model binary ----
const judge = join(root, "fake-model.mjs");
writeFileSync(judge, `#!/usr/bin/env node
import { appendFileSync, writeSync, readFileSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-model 1.0"); process.exit(0); }
const dir = process.env.SMP_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const out = (r, stage) => {
    const answer = stage === "writer" ? r : JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n";
    appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, prompt, answer }) + "\\n");
    writeSync(1, answer); process.exit(0);
  };
  const body = (key) => { const at = prompt.lastIndexOf('"' + key + '"'); const open = prompt.lastIndexOf("{", at); return JSON.parse(prompt.slice(open)); };
  if (prompt.includes("\\\`sme_map_roles\\\` judgment point")) return out(JSON.parse(readFileSync(process.env.SMP_MAPPER_ANSWER, "utf8")), "sme");
  if (prompt.includes("\\\`smp_bind_unit\\\` judgment point")) {
    const { leg_you_must_plan: leg, paragraph_moves_you_may_bind: bindable } = body("leg_you_must_plan");
    const m = bindable[0];
    const w = leg.waypoints[0];
    if (process.env.SMP_BIND_NULL) return out({ version: "1", leg_id: leg.leg_id, waypoints: [{ waypoint: 1, move: null,
      rationale: "no Move's before holds the reader's knowledge here." }] }, "bind");
    return out({ version: "1", leg_id: leg.leg_id, waypoints: [{ waypoint: 1, move: m.id, materials: [...w.serves],
      purpose: "brings the reader to the list as the bound of the crew.", reader_state_after: { knowledge: "holds that the list bounds the crew." },
      depends_on: [], introduces: [], "re-activate": [], rationale: "it is the only paragraph of the Trial.",
      paragraph_waypoints: Array.from({ length: m.segments.length }, (_, n) => ({ point: "PW-" + (n + 1) + " the paragraph makes its point.", serves: [...w.serves] })) }] }, "bind");
  }
  return out("WRITTEN the crew, its list and the room left off.", "writer");
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
const outDir = mkdtempSync(join(trials, "check-short-"));
const run = (name, args, extraEnv = {}) => {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  const o = join(outDir, name);
  const res = spawnSync(process.execPath, ["src/mapping-playground/short.mjs", "run", "--strand", strand, "--out", o, ...args],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, SMP_FIXTURE_DIR: dir, ...extraEnv }, timeout: 600000 });
  const rec = existsSync(join(o, "trial.json")) ? JSON.parse(readFileSync(join(o, "trial.json"), "utf8")) : null;
  const seen = existsSync(join(dir, "seen.jsonl")) ? readFileSync(join(dir, "seen.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  const calls = (stage) => { const p = join(o, stage, "calls.jsonl"); return existsSync(p) ? readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };
  return { res, o, rec, seen, calls };
};
const stagesOf = (rec) => (rec ? rec.stages.map((s) => `${s.stage}:${s.state}`).join(",") : "no record");
const fileOk = (f) => f && typeof f.path === "string" && existsSync(join(repo, f.path)) && f.sha256 === sha(join(repo, f.path));

// (a) the owner-authored route
const a = run("owner", ["--structure", structure]);
ok(a.res.status === 0, `(a) the run exited ${a.res.status}: ${a.res.stdout}${a.res.stderr}`);
const rec = a.rec || {};
ok(stagesOf(a.rec) === "rbs:done,bind:done,write:done", `(a) the stages are not all done: ${JSON.stringify(rec.stages)}`);
const recorded = [...a.calls("bind"), ...a.calls("write")];
ok(recorded.length === 2 && a.seen.length === 2 && recorded.every((c, i) => c.stdin === a.seen[i].prompt && c.stdout === a.seen[i].answer),
  `(a) the run did not record exactly the two calls the binary saw: ${recorded.length} recorded, ${a.seen.length} seen`);
ok(rec.strand && rec.strand.cite === CITE && rec.strand.sha256 === sha(strand), "(a) trial.json's strand is not the strand file's cite and sha256");
ok(rec.structure && rec.structure.author === "owner" && rec.structure.sha256 === sha(structure) && rec.mapper === "owner-authored",
  "(a) trial.json's structure and mapper are not the owner-authored ones");
ok(rec.rbs && rec.rbs.variant === "rbs_placeholder" && rec.rbs.placeholder === true && fileOk(rec.rbs), `(a) trial.json's rbs is not the placeholder's file: ${JSON.stringify(rec.rbs)}`);
const rbs = existsSync(join(a.o, "rbs.yaml")) ? parseYaml(readFileSync(join(a.o, "rbs.yaml"), "utf8"), "rbs") : {};
const wantTargets = [...mapped.roles.map((r) => r.context), ...mapped.relations.map((r) => r.holds), mapped.higher_order.holds];
ok(Array.isArray(rbs.pairs) && rbs.pairs.length === PAIRS && rbs.pairs.every((p, i) => p.base === null && p.target === wantTargets[i]),
  "(a) rbs.yaml is not one pair per structure element, base null, target the element's sentence");
ok(rec.bind && typeof rec.bind.move === "string" && fileOk(rec.bind), `(a) trial.json's bind does not carry the Move and its file: ${JSON.stringify(rec.bind)}`);
ok(rec.paragraph && fileOk(rec.paragraph) && readFileSync(join(repo, rec.paragraph.path), "utf8").startsWith("WRITTEN"),
  "(a) trial.json's paragraph does not name paragraph.md with its sha256");
ok(rec.sheet && existsSync(join(repo, rec.sheet)), "(a) trial.json names no sheet that exists");
ok(rec.reading && readFileSync(join(repo, rec.reading), "utf8") === `# Reading of Trial ${rec.trial}\n`, "(a) reading.md is not empty under its header");
ok(rec.stages && rec.stages.every((s) => s.calls === null || existsSync(join(repo, s.calls))), "(a) a stage names a calls.jsonl that does not exist");

// (e) the writer's stdin is the Packet
const w = a.calls("write");
const packet = existsSync(join(a.o, "write", "packet.md")) ? readFileSync(join(a.o, "write", "packet.md"), "utf8") : null;
ok(packet !== null && w.length === 1 && w[0].stdin === packet, "(e) the writer's recorded stdin is not the Packet byte for byte");

// (f) the sheet: dark at its root, its parts in order, one table row per pair
const sheet = rec.sheet && existsSync(join(repo, rec.sheet)) ? readFileSync(join(repo, rec.sheet), "utf8") : "";
ok(/^<!doctype html><html data-theme="dark">/.test(sheet), "(f) sheet.html does not carry data-theme=\"dark\" on its root");
const at = ["wbs-rbs", "table", "structure", "binding", "paragraph", "calls"].map((id) => sheet.indexOf(`id="${id}"`));
ok(at.every((x) => x >= 0) && at.every((x, i) => i === 0 || x > at[i - 1]), `(f) sheet.html does not carry its parts in order: ${at.join(",")}`);
const tbody = (/<section class="card" id="table">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/.exec(sheet) || [])[1] || "";
ok((tbody.match(/<tr>/g) || []).length === PAIRS, "(f) the correspondence table is not one row per pair");
ok(sheet.includes(String(rec.bind && rec.bind.move)) && sheet.includes("WRITTEN the crew") && sheet.includes(CLAIM), "(f) sheet.html does not carry the Move, the paragraph and the WBS");

// (b) the Mapper route
writeFileSync(join(root, "answer.json"), JSON.stringify(mapped));
const b = run("mapped", ["--mapper", "sme_map_roles"], { SMP_MAPPER_ANSWER: join(root, "answer.json") });
const bCalls = [...b.calls("sme"), ...b.calls("bind"), ...b.calls("write")];
ok(b.res.status === 0 && stagesOf(b.rec) === "sme:done,rbs:done,bind:done,write:done" && bCalls.length === 3
  && b.rec.structure.author === "sme" && b.rec.mapper.variant === "sme_map_roles",
  `(b) the --mapper run did not record three calls with structure.author: sme: ${b.res.status} ${stagesOf(b.rec)} ${bCalls.length} ${b.res.stderr}`);

// (c) an unknown --rbs is refused naming the declared rows, before anything is written
const c = run("unknown-rbs", ["--structure", structure, "--rbs", "rbs_nothing"]);
ok(c.res.status !== 0 && c.res.stderr.includes("rbs_nothing") && c.res.stderr.includes("it declares rbs_placeholder") && !existsSync(c.o),
  `(c) --rbs rbs_nothing was not refused naming the rows: ${c.res.status} ${c.res.stderr}`);

// (d) move: null stops at bind
const d = run("no-move", ["--structure", structure], { SMP_BIND_NULL: "1" });
ok(d.res.status !== 0 && stagesOf(d.rec) === "rbs:done,bind:stopped,write:not run" && /^bind: /.test(String(d.rec.stopped))
  && String(d.rec.stopped).includes("no_paragraph_move_fits") && !existsSync(join(d.o, "paragraph.md")) && existsSync(join(d.o, "sheet.html")),
  `(d) a move: null answer did not stop the Trial at bind: ${d.res.status} ${stagesOf(d.rec)} ${JSON.stringify(d.rec && d.rec.stopped)}`);

// (g) a target carrying a claim word is refused naming it
const g = validateRbsTable({ variant: "rbs_x", pairs: [{ base: null, target: "The crew follows its list." }, { base: "walker", target: { step: "The walker sees a room." } }] }, CLAIM);
ok(g.error && g.error.includes('pairs[1].target carries "walker"'), `(g) a target carrying "walker" was not refused naming it: ${JSON.stringify(g)}`);

// (h) nothing under the repository's moves/ or theses/ changed
ok(snapshot() === before, "(h) the run changed the repository's moves/ or theses/");

// (i) the full-pipeline Trial's check still passes
const i = spawnSync("bash", ["checks/check-mapping-playground.sh"], { encoding: "utf8", timeout: 600000 });
ok(i.status === 0, `(i) checks/check-mapping-playground.sh failed: ${i.stdout}${i.stderr}`);

rmSync(root, { recursive: true, force: true });
if (!fails.length) rmSync(outDir, { recursive: true, force: true });
if (fails.length) { for (const f of fails) console.log(`FAIL: ${f}`); console.log(`kept: ${outDir}`); process.exit(1); }
console.log("check-mapping-playground-short: ok");
JS
