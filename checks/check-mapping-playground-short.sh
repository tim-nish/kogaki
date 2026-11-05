#!/usr/bin/env bash
# check-mapping-playground-short -- the short Trial (kogaki#1669), driven through `node src/mapping-playground/short.mjs run` with ONE fake model binary:
#   (a) the owner-authored route exits 0 with two calls recorded, and its files and trial.json fields are written.
#   (b) `--mapper sme_map_roles` records three calls and `structure.author: sme`.
#   (c) a `--rbs` naming no `rbs_<variant>` row is refused naming the rows the table declares.
#   (d) a binding answer of `move: null` stops at `bind`, and the record shows it.
#   (e) the writer's recorded stdin equals the Packet byte for byte.
#   (f) the sheet (kogaki#1673, kogaki#1675), over a structure whose one higher-order relation is a list of one (kogaki#1678), with its
#       Binding table of five labelled rows and its Writer input table (kogaki#1682), its `Strand` part carrying the cite line and
#       its `Proposition and Paragraph` part, and no `WBS` text (kogaki#1685).
#   (g) a `target` carrying a content word of the `proposition:` is refused naming the word and `proposition`.
#   (h) the repository's `moves/` and `theses/` are unchanged.
#   (i) checks/check-mapping-playground.sh still passes.

#   (j) the `--rbs-file` route with `move` and `waypoints` exits 0 with one call, `bind.state: supplied`, `rbs.variant: owner-authored` (kogaki#1671).
#   (k) `--rbs-file` with `--rbs` is refused naming both flags.
#   (l) a bad `base.kind`, an unknown `move`, a wrong-length `waypoints` and a `point` carrying a claim word are each refused naming the field.
#   (m) a structure carrying `attributes` is refused naming `attributes` (kogaki#1685).
#   (n) `binding_rationale` in the rbs file reaches bind.yaml and the Binding table's `Rationale` row, the model route's bind.yaml carries
#       `binding_rationale: null`, a non-text one is refused naming the field, and `grounds` is refused naming
#       `binding_rationale` (kogaki#1675, kogaki#1678, kogaki#1682).

#   (o) a `projection` map and a list of one each exit 0 with one writer call, `bind.yaml`'s `paragraphs` has two entries, and
#       the writer's stdin carries two numbered lines with their points indented, one claim line equal to the proposition,
#       no `holds` of the structure and no article-so-far prose; a list of two writes three Segments tables (kogaki#1681).
#   (p) a projecting point carrying a claim word passes, and `attribute_hits` and `Attribute words` appear in no file of the run.
#   (q) a `projection` entry with a wrong-length `waypoints` or an unknown `move` is refused naming its index, and
#       `projection` without the first binding is refused naming both.
#   (r) a writer stop leaves no `paragraph.md`.
#   (s) the one-map `higher_order` and a list of one pass and render as `h1`; a two-entry list is refused naming the count, and a
#       list entry with a duplicate id or an unknown relation is refused naming its index (kogaki#1678, kogaki#1685).
#   (t) a proposition file with text below its two lines is refused naming that text, a line above them is refused naming that
#       line, a second `proposition:` line is refused, a `claim:` line is refused naming
#       `proposition`, `--strand` is refused naming `--proposition`, and the Mapper's recorded stdin carries no rendering (kogaki#1685).
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
const { validateRbsTable } = await import(pathToFileURL(join(repo, "src/mapping-playground/rbs.mjs")).href);
const { validateStructure } = await import(pathToFileURL(join(repo, "src/mapping-playground/structure.mjs")).href);
const { moveContract } = await import(pathToFileURL(join(repo, "src/compose.mjs")).href);
const root = mkdtempSync(join(tmpdir(), "mapping-playground-short-"));
const trials = join(repo, "runs", "mapping-playground");
mkdirSync(trials, { recursive: true });
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

// ---- the fixture proposition file and RelationalStructure ----
const CITE = "coding::lesson/a-fixture-strand@0123456789abcdef";
const PROPOSITION = "A rule set applies automatically only to the files the walker sees.";
const proposition = join(root, "proposition.md");
writeFileSync(proposition, `cite: ${CITE}\nproposition: ${PROPOSITION}\n`);
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
  if (process.env.SMP_WRITE_REFUSE) return out("refusal: the first paragraph cannot be written.", "writer");
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
  const res = spawnSync(process.execPath, ["src/mapping-playground/short.mjs", "run", ...(args.includes("--strand") ? [] : ["--proposition", proposition]), "--out", o, ...args],
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
ok(rec.proposition && rec.proposition.cite === CITE && rec.proposition.proposition === PROPOSITION && rec.proposition.sha256 === sha(proposition)
  && !Object.hasOwn(rec, "strand"), `(a) trial.json's proposition is not the file's cite, sentence and sha256, or a strand key remains: ${JSON.stringify(rec.proposition)}`);
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
const dSheet = existsSync(join(d.o, "sheet.html")) ? readFileSync(join(d.o, "sheet.html"), "utf8") : "";
const dParagraph = (/<div><h3>Paragraph<\/h3>([\s\S]*?)<\/div><\/div><\/section>/.exec(dSheet) || [])[1] || "";
ok(d.rec && dParagraph.includes(`stopped — ${d.rec.stopped}`.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")),
  `(d) the stopped Trial's Paragraph column does not carry the stop reason: ${dParagraph}`);

// (g) a target carrying a claim word is refused naming it
const g = validateRbsTable({ variant: "rbs_x", base: { domain: null, kind: null }, pairs: [{ base: null, target: "The crew follows its list." }, { base: "walker", target: { step: "The walker sees a room." } }] }, PROPOSITION);
ok(g.error && g.error.includes('pairs[1].target carries "walker", a content word of the proposition'), `(g) a target carrying "walker" was not refused naming it and the proposition: ${JSON.stringify(g)}`);

// (j) the owner-authored table with a supplied binding: one writer call, no binding call
const MOVE = "answer_a_posed_question_then_win_two_easy_assents_before_ranking_the_distinction_first";
const SEGMENTS = moveContract(MOVE, join(repo, "moves")).segments.length;
const owned = { base: { domain: "a cleaning crew working through a house", kind: "analogy" },
  pairs: wantTargets.map((t) => ({ base: "the crew's list", target: t })), move: MOVE,
  binding_rationale: "RATIONALE the Move asks and answers, as the crew asks which room comes first.",
  waypoints: Array.from({ length: SEGMENTS }, (_, n) => ({ segment: n + 1, point: `OWNED-${n + 1} the crew keeps to its list.` })) };
const ownedFile = join(root, "rbs-owned.yaml");
writeFileSync(ownedFile, stringifyYaml(owned));
const wide = join(root, "structure-wide.yaml");
const LONE = { id: "porch", context: "A porch light glows by the gate." };
const PASSED = { id: "passed", between: ["crew", "room"], holds: "The crew goes past a room nobody wrote down." };
const HIGHER = [{ id: "h1", relates: ["cleans", "missed", "passed"], holds: "Because the crew follows the list, it goes past what the list leaves out." }];
writeFileSync(wide, stringifyYaml({ ...mapped, roles: [...mapped.roles, LONE], relations: [...mapped.relations, PASSED], higher_order: HIGHER }));
const j = run("owned", ["--structure", wide, "--rbs-file", ownedFile]);
const jCalls = [...j.calls("bind"), ...j.calls("write")];
ok(j.res.status === 0 && stagesOf(j.rec) === "rbs:done,bind:done,write:done" && jCalls.length === 1 && j.seen.length === 1
  && j.rec.bind.state === "supplied" && j.rec.bind.author === "owner" && j.rec.bind.move === MOVE
  && j.rec.rbs.variant === "owner-authored" && j.rec.rbs.placeholder === false && j.rec.rbs.sha256 === sha(ownedFile),
  `(j) the --rbs-file run did not make one call with bind.state supplied: ${j.res.status} ${stagesOf(j.rec)} ${jCalls.length} ${JSON.stringify(j.rec && j.rec.bind)} ${j.res.stderr}`);
const jPacket = existsSync(join(j.o, "write", "packet.md")) ? readFileSync(join(j.o, "write", "packet.md"), "utf8") : "";
ok(jPacket.includes("OWNED-1 the crew") && jPacket.includes(`OWNED-${SEGMENTS} the crew`), "(j) the Packet does not carry the supplied points as its Paragraph Waypoints");

// (k) --rbs-file with --rbs is refused naming both flags
const k = run("both-rbs", ["--structure", structure, "--rbs", "rbs_placeholder", "--rbs-file", ownedFile]);
ok(k.res.status !== 0 && k.res.stderr.includes("`--rbs`") && k.res.stderr.includes("`--rbs-file`") && !existsSync(k.o),
  `(k) --rbs with --rbs-file was not refused naming both: ${k.res.status} ${k.res.stderr}`);

// (l) each bad field of the table is refused naming it
const lv = (edit) => validateRbsTable({ ...owned, ...edit }, PROPOSITION, { movesDir: join(repo, "moves") });
const l0 = validateRbsTable({ pairs: owned.pairs }, PROPOSITION);
ok(l0.error && l0.error.includes("`base`"), `(l) a table with no base was not refused naming base: ${JSON.stringify(l0)}`);
const l1 = lv({ base: { domain: "a house", kind: "metaphor" } });
ok(l1.error && l1.error.includes("base.kind"), `(l) a kind outside the four was not refused naming base.kind: ${JSON.stringify(l1)}`);
const l2 = lv({ move: "no_such_move" });
ok(l2.error && l2.error.startsWith("move "), `(l) a move naming no Move was not refused naming move: ${JSON.stringify(l2)}`);
const l3 = lv({ waypoints: owned.waypoints.slice(1) });
ok(l3.error && l3.error.startsWith("waypoints "), `(l) a waypoints list of the wrong length was not refused naming waypoints: ${JSON.stringify(l3)}`);
const l4 = lv({ waypoints: owned.waypoints.map((w, n) => (n === 2 ? { ...w, point: "The walker sees a room." } : w)) });
ok(l4.error && l4.error.includes('waypoints[2].point carries "walker"'), `(l) a point carrying a claim word was not refused naming the field: ${JSON.stringify(l4)}`);

// (m) attributes is refused by name
const propositionRec = { cite: CITE, proposition: PROPOSITION };
const m1 = validateStructure({ ...mapped, attributes: [{ role: "room", words: ["dusty"] }] }, propositionRec);
ok(m1.error && m1.error.includes("`attributes`"), `(m) a structure carrying attributes was not refused naming it: ${JSON.stringify(m1)}`);

// (f) the sheet: dark, its six sections in order, the cite line, the proposition beside the Paragraph, Segments, Mapping and Structure
const SECTIONS = ["Strand", "Proposition and Paragraph", "Segments", "Mapping", "Structure", "Model calls"];
const sheet = rec.sheet && existsSync(join(repo, rec.sheet)) ? readFileSync(join(repo, rec.sheet), "utf8") : "";
ok(/^<!doctype html><html data-theme="dark">/.test(sheet), "(f) sheet.html does not carry data-theme=\"dark\" on its root");
const jSheet = existsSync(join(j.o, "sheet.html")) ? readFileSync(join(j.o, "sheet.html"), "utf8") : "";
const h2s = [...jSheet.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((x) => x[1]);
ok(JSON.stringify(h2s) === JSON.stringify(SECTIONS), `(f) sheet.html's h2s are not the six sections in order: ${JSON.stringify(h2s)}`);
const cols = (/<div class="cols">([\s\S]*?)<\/div><\/div><\/section>/.exec(jSheet) || [])[1] || "";
const leftCol = (/<div><h3>Proposition<\/h3>([\s\S]*?)<\/div>/.exec(cols) || [])[1];
ok(leftCol === `<p>${PROPOSITION}</p>` && cols.includes("WRITTEN the crew"), `(f) the proposition alone and the Paragraph do not sit in one .cols block: ${cols}`);
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const section = (html, id) => (new RegExp(`<section class="card" id="${id}">([\\s\\S]*?)<\\/section>`).exec(html) || [])[1] || "";
ok(section(jSheet, "strand") === `<h2>Strand</h2><p><b>cite:</b> ${esc(CITE)}</p>`, `(f) the Strand part is not the cite line alone: ${section(jSheet, "strand")}`);
ok(!sheet.includes("WBS") && !jSheet.includes("WBS"), "(f) a sheet still carries `WBS`");
const segs = moveContract(MOVE, join(repo, "moves")).segments;
const segRows = [...section(jSheet, "segments").matchAll(/<tr><td>(\d+)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)];
ok(segRows.length === segs.length && segs.every((sg, n) => segRows[n][1] === String(n + 1) && segRows[n][2] === esc(sg.operation)
  && segRows[n][3] === esc(sg.relation || "") && segRows[n][4] === esc(sg.manner || "") && segRows[n][5] === esc(owned.waypoints[n].point)),
  `(f) the Segments table is not one row per Segment with its operation, relation, manner and point: ${segRows.length} rows for ${segs.length} segments`);
ok(!sheet.includes("serves L") && !jSheet.includes("serves L"), "(f) a sheet still carries `serves L`");
const tableOf = (html, caption) => [...html.matchAll(new RegExp(`<table><caption>${caption}</caption>([\\s\\S]*?)</table>`, "g"))].map((x) => x[1]);
const rowOf = (table, label) => (new RegExp(`<th rowspan="\\d+">${label}</th>([\\s\\S]*?)(?=<tr><th |</tbody>)`).exec(table) || [])[1] || "";
const labelsOf = (table) => [...table.matchAll(/<th rowspan="\d+">([\s\S]*?)<\/th>/g)].map((x) => x[1]);
const KNOWLEDGE = (moveContract(MOVE, join(repo, "moves")).before.split("\n").find((l) => l.startsWith("knowledge: ")) || "knowledge: ?");
const [jBinding] = tableOf(section(jSheet, "segments"), "Binding");
ok(jBinding && JSON.stringify(labelsOf(jBinding)) === JSON.stringify(["Move", "Bound by", "Before", "After", "Rationale"])
  && rowOf(jBinding, "Move").includes(`<td>${MOVE}</td>`) && rowOf(jBinding, "Bound by").includes("<td>owner</td>")
  && rowOf(jBinding, "Before").includes(`<td>${esc(KNOWLEDGE)}</td>`) && rowOf(jBinding, "After").includes("<td>knowledge: "),
  `(f) the Binding table is not the five labelled rows with the Move's before.knowledge: ${jBinding}`);
const jWriter = tableOf(section(jSheet, "segments"), "Writer input");
ok(jWriter.length === 1 && rowOf(jWriter[0], "Asserts") === `<td>${esc(PROPOSITION)}</td></tr>` && jWriter[0].includes('<a href="write/packet.md">')
  && section(jSheet, "segments").lastIndexOf("<table><caption>Writer input") > section(jSheet, "segments").lastIndexOf("<th>operation</th>"),
  `(f) the Writer input table does not follow the Segments tables carrying the proposition and a link to write/packet.md: ${jWriter}`);
const [aBinding] = tableOf(section(sheet, "segments"), "Binding");
ok(aBinding && rowOf(aBinding, "Bound by").includes("<td>smp_bind_unit</td>") && rowOf(aBinding, "Rationale").includes("<td>none</td>"),
  `(f) the model route's Binding table does not carry its row name and a Rationale of none: ${aBinding}`);
ok(![...section(jSheet, "segments").matchAll(/<caption>([\s\S]*?)<\/caption>/g)].some((x) => x[1].includes("—")),
  "(f) a — caption line still precedes a Segments table");
const ths = [...section(jSheet, "mapping").matchAll(/<th>([\s\S]*?)<\/th>/g)].map((x) => x[1]);
ok(JSON.stringify(ths) === JSON.stringify(["Role", "Abstraction", `Analogy: ${owned.base.domain}`]),
  `(f) the Mapping headers are not Role, Abstraction and Analogy: <domain>: ${JSON.stringify(ths)}`);
const pHeads = [...section(sheet, "mapping").matchAll(/<th>([\s\S]*?)<\/th>/g)].map((x) => x[1]);
ok(pHeads[2] === "Base: null", `(f) the placeholder's base header is not \`Base: null\`: ${JSON.stringify(pHeads)}`);
const mapRows = [...section(jSheet, "mapping").matchAll(/<tr><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)];
ok(mapped.roles.every((r) => mapRows.filter((x) => x[1] === r.id && x[2] === r.context && x[3] === "the crew's list").length === 1),
  `(f) the mapping table is not one row per Role carrying its context and its base object: ${mapRows.map((x) => x.slice(1).join("|")).join(" / ")}`);
const struct = section(jSheet, "structure");
const elRows = [...struct.matchAll(/<tr><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)];
const wantEls = [...mapped.roles.map((r) => [r.id, "Role"]), [LONE.id, "Role unreached"], ...[...mapped.relations, PASSED].map((r) => [r.id, "relation"]),
  ["h1", "higher-order"]];
const category = (c) => c.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
ok(elRows.length === wantEls.length && wantEls.every(([id, cat]) => elRows.some((x) => x[1] === id && category(x[2]) === cat)),
  `(f) the Structure table is not one row per element with its category, the lone Role unreached and h1's relations reached: ${elRows.map((x) => `${x[1]}:${category(x[2])}`).join(" / ")}`);
const graph = (/<div class="mermaid">([\s\S]*?)<\/div>/.exec(struct) || [])[1] || "";
const INIT = esc('%%{init: {"flowchart": {"curve": "linear"}}}%%');
const subAt = ["Higher-order relations", "Relations", "Roles"].map((t) => graph.indexOf(`[&quot;${t}&quot;]`));
ok(graph.startsWith(`${INIT}\ngraph BT\n`) && subAt.every((n, x) => n >= 0 && (x === 0 || n > subAt[x - 1])) && jSheet.includes("mermaid.initialize"),
  `(f) the Structure section carries no Mermaid graph BT with the linear init line and the three subgraphs top to bottom: ${graph.slice(0, 300)}`);
const higherBlock = (/subgraph higher\[&quot;Higher-order relations&quot;\]\n([\s\S]*?)\n  end/.exec(graph) || [])[1] || "";
ok(JSON.stringify(higherBlock.split("\n").map((l) => l.trim())) === JSON.stringify(["h1[&quot;h1&quot;]"])
  && graph.includes("  passed --&gt; h1") && !/\b[HL]0\b/.test(graph),
  `(f) the Higher-order subgraph is not the one node h1, with its relations edged to it: ${higherBlock}`);
ok(struct.includes("<details") && struct.indexOf("<details") > struct.indexOf('class="mermaid"'), "(f) the folded YAML does not follow the graph");
ok(!sheet.includes("base (WBS)") && !sheet.includes("target (RBS)") && !jSheet.includes("base (WBS)") && !jSheet.includes("target (RBS)"),
  "(f) a sheet still carries `base (WBS)` or `target (RBS)`");
ok(sheet.includes(String(rec.bind && rec.bind.move)) && sheet.includes("WRITTEN the crew") && sheet.includes(PROPOSITION), "(f) sheet.html does not carry the Move, the paragraph and the proposition");

const jBind = existsSync(join(j.o, "bind.yaml")) ? parseYaml(readFileSync(join(j.o, "bind.yaml"), "utf8"), "bind") : {};
const rationaleRow = rowOf(jBinding || "", "Rationale");
ok(jBind.binding_rationale === owned.binding_rationale && j.rec.bind.binding_rationale === owned.binding_rationale
  && rationaleRow === `<td>${esc(owned.binding_rationale)}</td></tr>` && !Object.hasOwn(jBind, "grounds"),
  `(n) the supplied binding_rationale did not reach bind.yaml, the record and the Rationale row: ${JSON.stringify(jBind)} / ${rationaleRow}`);
const aBind = existsSync(join(a.o, "bind.yaml")) ? parseYaml(readFileSync(join(a.o, "bind.yaml"), "utf8"), "bind") : {};
ok(Object.hasOwn(aBind, "binding_rationale") && aBind.binding_rationale === null && rec.bind.binding_rationale === null,
  `(n) the model route's bind.yaml does not carry binding_rationale: null: ${JSON.stringify(aBind)}`);
const n1 = lv({ binding_rationale: ["a list"] });
ok(n1.error && n1.error.startsWith("binding_rationale "), `(n) a non-text binding_rationale was not refused naming it: ${JSON.stringify(n1)}`);
const n2 = lv({ grounds: "the old field" });
ok(n2.error && n2.error.startsWith("grounds ") && n2.error.includes("`binding_rationale`"), `(n) grounds was not refused naming binding_rationale: ${JSON.stringify(n2)}`);

// (o) the projecting bindings: one Leg, one Packet, one writer call
const PROJ = { move: MOVE, binding_rationale: "RATIONALE2 the Move carries the crew's list over to the walker.",
  waypoints: Array.from({ length: SEGMENTS }, (_, n) => ({ segment: n + 1,
    point: n === 0 ? "PROJ-1 the walker sees the files." : n === 1 ? "PROJ-2 a dusty file is never reached." : `PROJ-${n + 1} the rule set keeps to its list.` })) };
// Pairs naming the Roles by id, as an owner's file does, so no `holds` reaches a Leg Waypoint's point.
const byId = { ...owned, pairs: mapped.roles.map((x) => ({ base: "the crew's list", target: x.id })) };
const projFile = join(root, "rbs-projected.yaml");
writeFileSync(projFile, stringifyYaml({ ...byId, projection: PROJ }));
const listFile = join(root, "rbs-projected-list.yaml");
writeFileSync(listFile, stringifyYaml({ ...byId, projection: [PROJ] }));
const blockOf = (packet, heading) => { const at = packet.indexOf(heading); if (at < 0) return null; const rest = packet.slice(at + heading.length); const nx = rest.indexOf("\n## "); return nx < 0 ? rest : rest.slice(0, nx); };
const HOLDS = [...mapped.relations, PASSED, ...HIGHER].map((x) => x.holds);
const SO_FAR = "## The article so far, up to this Leg:";
for (const [name, file] of [["projected", projFile], ["projected-list", listFile]]) {
  const o = run(name, ["--structure", wide, "--rbs-file", file]);
  const oCalls = [...o.calls("bind"), ...o.calls("write")];
  ok(o.res.status === 0 && stagesOf(o.rec) === "rbs:done,bind:done,write:done" && oCalls.length === 1 && o.seen.length === 1,
    `(o) ${name}: the projecting run did not exit 0 with one writer call: ${o.res.status} ${stagesOf(o.rec)} ${oCalls.length} ${o.res.stderr}`);
  const oBind = existsSync(join(o.o, "bind.yaml")) ? parseYaml(readFileSync(join(o.o, "bind.yaml"), "utf8"), "bind") : {};
  ok(Array.isArray(oBind.paragraphs) && oBind.paragraphs.length === 2 && oBind.move === MOVE && oBind.binding_rationale === owned.binding_rationale
    && oBind.paragraphs[1].move === MOVE && oBind.paragraphs[1].binding_rationale === PROJ.binding_rationale
    && oBind.paragraphs[1].paragraph_waypoints[0].point === PROJ.waypoints[0].point
    && JSON.stringify(o.rec && o.rec.bind.paragraphs) === JSON.stringify(oBind.paragraphs),
    `(o) ${name}: bind.yaml's paragraphs is not the two bindings in order: ${JSON.stringify(oBind.paragraphs)}`);
  const pk = existsSync(join(o.o, "write", "packet.md")) ? readFileSync(join(o.o, "write", "packet.md"), "utf8") : "";
  const w1 = o.calls("write");
  ok(w1.length === 1 && w1[0].stdin === pk, `(o) ${name}: the writer's stdin is not the Packet`);
  const tops = pk.split("\n").filter((l) => /^\d+\. .* \*Serves:\* /.test(l));
  ok(tops.length === 2 && tops[0].startsWith("1. ") && tops[1] === `2. ${PROPOSITION} *Serves:* ${PROPOSITION}`
    && pk.includes(`\n   1. ${owned.waypoints[0].point} *Serves:* ${PROPOSITION}\n`) && pk.includes(`\n   1. ${PROJ.waypoints[0].point} *Serves:* ${PROPOSITION}\n`)
    && pk.indexOf(owned.waypoints[0].point) < pk.indexOf(tops[1]) && pk.indexOf(tops[1]) < pk.indexOf(PROJ.waypoints[0].point),
    `(o) ${name}: the Packet does not carry two numbered lines with their points indented: ${JSON.stringify(tops)}`);
  const claimLines = (blockOf(pk, "## The claims this Leg asserts") || "").split("\n").filter((l) => l.startsWith("- "));
  ok(JSON.stringify(claimLines) === JSON.stringify([`- ${PROPOSITION}`]), `(o) ${name}: the claims block is not the proposition alone: ${JSON.stringify(claimLines)}`);
  ok(HOLDS.every((h) => !pk.includes(h)), `(o) ${name}: the Packet carries a \`holds\` of the structure`);
  const soFar = blockOf(pk, SO_FAR);
  ok(soFar !== null && soFar === blockOf(jPacket, SO_FAR) && !soFar.includes("WRITTEN"), `(o) ${name}: the Packet carries article-so-far prose: ${soFar}`);
  ok(readFileSync(join(o.o, "paragraph.md"), "utf8").startsWith("WRITTEN") && !existsSync(join(o.o, "bind2.yaml")) && !existsSync(join(o.o, "paragraph2.md")),
    `(o) ${name}: paragraph.md is not the whole answer, or bind2.yaml or paragraph2.md was written`);
  const oSheet = existsSync(join(o.o, "sheet.html")) ? readFileSync(join(o.o, "sheet.html"), "utf8") : "";
  const oBindings = tableOf(section(oSheet, "segments"), "Binding");
  const oWriter = tableOf(section(oSheet, "segments"), "Writer input");
  ok(oBindings.length === 2 && rowOf(oBindings[0], "Rationale").includes(esc(owned.binding_rationale))
    && rowOf(oBindings[1], "Rationale").includes(esc(PROJ.binding_rationale))
    && oBindings.every((t) => JSON.stringify(labelsOf(t)) === JSON.stringify(["Move", "Bound by", "Before", "After", "Rationale"]) && rowOf(t, "Before").includes(esc(KNOWLEDGE)))
    && oWriter.length === 1 && rowOf(oWriter[0], "Asserts") === `<td>${esc(PROPOSITION)}</td></tr>`
    && !oSheet.includes("Reader state:"), `(o) ${name}: the sheet does not carry two Binding tables, one Writer input table and no reader state: ${oBindings.length} ${oWriter.length}`);
  // (p) no attribute test anywhere in the run
  const files = [];
  const walk = (dd) => { for (const f of readdirSync(dd)) { const pth = join(dd, f); if (statSync(pth).isDirectory()) walk(pth); else files.push(pth); } };
  walk(o.o);
  ok(files.every((f) => { const t = readFileSync(f, "utf8"); return !t.includes("attribute_hits") && !t.includes("Attribute words"); }),
    `(p) ${name}: a file of the run carries attribute_hits or Attribute words`);
}
const twoFile = join(root, "rbs-projected-two.yaml");
writeFileSync(twoFile, stringifyYaml({ ...byId, projection: [PROJ, { ...PROJ, binding_rationale: "RATIONALE3 a third paragraph." }] }));
const o3 = run("projected-two", ["--structure", wide, "--rbs-file", twoFile]);
const o3Sheet = existsSync(join(o3.o, "sheet.html")) ? readFileSync(join(o3.o, "sheet.html"), "utf8") : "";
const o3Caps = tableOf(section(o3Sheet, "segments"), "Binding");
ok(o3.res.status === 0 && o3.seen.length === 1 && o3Caps.length === 3, `(o) a projection list of two did not exit 0 with three Binding tables: ${o3.res.status} ${o3Caps.length} ${o3.res.stderr}`);

// (p) a projecting point carrying a claim word passes ("walker" in PROJ-1)
ok(!validateRbsTable({ ...owned, projection: [PROJ] }, PROPOSITION, { movesDir: join(repo, "moves") }).error, "(p) a projecting point carrying a claim word was refused");

// (q) a projecting binding's fields are refused naming its index
const qv = (projection, base = owned) => validateRbsTable({ ...base, projection }, PROPOSITION, { movesDir: join(repo, "moves") });
const q1 = qv([PROJ, { ...PROJ, waypoints: PROJ.waypoints.slice(1) }]);
ok(q1.error && q1.error.startsWith("projection[1].waypoints "), `(q) a wrong-length projection[1].waypoints was not refused naming it: ${JSON.stringify(q1)}`);
const q2 = qv([PROJ, { ...PROJ, move: "no_such_move" }]);
ok(q2.error && q2.error.startsWith("projection[1].move "), `(q) an unknown projection[1].move was not refused naming it: ${JSON.stringify(q2)}`);
const q2m = qv({ ...PROJ, move: "no_such_move" });
ok(q2m.error && q2m.error.startsWith("projection[0].move "), `(q) an unknown move in a projection map was not refused naming index 0: ${JSON.stringify(q2m)}`);
const { move: _m, waypoints: _w, ...unbound } = owned;
const q3 = qv(PROJ, unbound);
ok(q3.error && q3.error.includes("`projection`") && q3.error.includes("`move`") && q3.error.includes("`waypoints`"),
  `(q) projection without the first binding was not refused naming both: ${JSON.stringify(q3)}`);

// (r) a writer stop leaves no paragraph.md
const r = run("write-refused", ["--structure", wide, "--rbs-file", projFile], { SMP_WRITE_REFUSE: "1" });
ok(r.res.status !== 0 && stagesOf(r.rec) === "rbs:done,bind:done,write:stopped" && /^write: /.test(String(r.rec.stopped))
  && !existsSync(join(r.o, "paragraph.md")) && existsSync(join(r.o, "sheet.html")),
  `(r) a writer refusal did not stop at write with no paragraph.md: ${r.res.status} ${stagesOf(r.rec)} ${JSON.stringify(r.rec && r.rec.stopped)}`);

// (s) the one-map higher_order and a list of one are read as h1; two entries are refused naming the count; a list entry is refused naming its index
ok(!validateStructure(mapped, propositionRec).error, "(s) the one-map higher_order was refused");
const aRows = [...section(sheet, "structure").matchAll(/<tr><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td>/g)].filter((x) => category(x[2]) === "higher-order");
ok(aRows.length === 1 && aRows[0][1] === "h1", `(s) the one-map higher_order does not render as the one row h1: ${aRows.map((x) => x[1]).join(", ")}`);
const listed = (higher) => validateStructure({ ...mapped, relations: [...mapped.relations, PASSED], higher_order: higher }, propositionRec);
ok(!listed(HIGHER).error, `(s) the higher_order list of one was refused: ${JSON.stringify(listed(HIGHER))}`);
const TWO = [HIGHER[0], { id: "h2", relates: ["missed", "passed"], holds: "Because nobody wrote that room down, the crew goes past it as if it were not there." }];
const s0 = listed(TWO);
ok(s0.error && s0.error.includes("carries 2 entries") && s0.error.includes("a proposition has one higher-order relation"),
  `(s) a two-entry higher_order was not refused naming the count: ${JSON.stringify(s0)}`);
const s1 = listed([{ ...HIGHER[0], id: "cleans" }]);
ok(s1.error && s1.error.startsWith("higher_order[0]'s `id`"), `(s) a duplicate higher-order id was not refused naming its index: ${JSON.stringify(s1)}`);
const s2 = listed([{ ...HIGHER[0], relates: ["missed", "nowhere"] }]);
ok(s2.error && s2.error.startsWith("higher_order[0]'s `relates`") && s2.error.includes('"nowhere"'),
  `(s) an unknown relation in a higher-order entry was not refused naming its index: ${JSON.stringify(s2)}`);

// (t) the proposition file carries its two lines and nothing else, and no stage reads a rendering
const RENDERING = "The walker lists the files; the rule set applies to that list and to nothing else.";
const tRun = (name, text, args = []) => { const f = join(root, `${name}.md`); writeFileSync(f, text);
  const o = join(outDir, name);
  const res = spawnSync(process.execPath, ["src/mapping-playground/short.mjs", "run", "--proposition", f, "--structure", structure, "--out", o, ...args],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, SMP_FIXTURE_DIR: root } });
  return { res, o }; };
const t1 = tRun("rendered", `cite: ${CITE}\nproposition: ${PROPOSITION}\n\n${RENDERING}\n`);
ok(t1.res.status !== 0 && t1.res.stderr.includes("the proposition file carries text below its two lines; a Strand's rendering is not an input of the Playground")
  && !existsSync(t1.o), `(t) a proposition file with a rendering below its lines was not refused: ${t1.res.status} ${t1.res.stderr}`);
const t2 = tRun("claimed", `cite: ${CITE}\nclaim: ${PROPOSITION}\n`);
ok(t2.res.status !== 0 && t2.res.stderr.includes("`claim:`") && t2.res.stderr.includes("`proposition:`") && !existsSync(t2.o),
  `(t) a claim: line was not refused naming proposition: ${t2.res.status} ${t2.res.stderr}`);
const t4 = tRun("titled", `# a title\ncite: ${CITE}\nproposition: ${PROPOSITION}\n`);
ok(t4.res.status !== 0 && t4.res.stderr.includes('"# a title" beside its two lines') && !t4.res.stderr.includes("below its two lines") && !existsSync(t4.o),
  `(t) a line above the two lines was not refused naming that line: ${t4.res.status} ${t4.res.stderr}`);
const t5 = tRun("twice", `cite: ${CITE}\nproposition: an earlier draft.\nproposition: ${PROPOSITION}\n`);
ok(t5.res.status !== 0 && t5.res.stderr.includes("more than one `proposition:` line") && !existsSync(t5.o),
  `(t) a second proposition: line was not refused: ${t5.res.status} ${t5.res.stderr}`);
const t3 = run("strand-flag", ["--strand", proposition, "--structure", structure]);
ok(t3.res.status !== 0 && t3.res.stderr.includes("`--strand`") && t3.res.stderr.includes("`--proposition <file>`") && !existsSync(t3.o),
  `(t) --strand was not refused naming --proposition: ${t3.res.status} ${t3.res.stderr}`);
const smeStdin = b.calls("sme").map((x) => x.stdin).join("\n");
ok(smeStdin.includes(`"proposition": ${JSON.stringify(PROPOSITION)}`) && !smeStdin.includes('"rendering"') && !smeStdin.includes("`rendering`"),
  `(t) the Mapper's recorded stdin does not carry the proposition alone: ${smeStdin.slice(0, 400)}`);

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
