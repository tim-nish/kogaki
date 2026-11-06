#!/usr/bin/env bash
# check-mapping-playground-short -- the short Trial (kogaki#1669), driven through `node src/mapping-playground/short.mjs run` with ONE fake model binary:
#   (a) the owner-authored route exits 0 with two calls recorded, and its files and trial.json fields are written; the placeholder's
#       rbs.yaml is one correspondence per Role, `expression: null`, `role` the Role's id, `base: { domain: null }` with no `kind`,
#       and `placeholder: true` (kogaki#1688, kogaki#1693); the one bind call's
#       stdin carries two Leg Waypoints, the second's `point` the proposition, `bind.yaml`'s `paragraphs` has two entries, and the
#       sheet carries two Segments tables and two Binding tables (kogaki#1689).
#   (b) `--mapper sme_map_roles` records three calls and `structure.author: sme`, and its placeholder's correspondences name the
#       mapper's Roles by `role` (kogaki#1693).
#   (c) a `--rbs` naming no `rbs_<variant>` row is refused naming the rows the table declares.
#   (d) a binding answer of `move: null` on the second Leg Waypoint stops at `bind` naming Waypoint 2, and the record shows it (kogaki#1689).

#   (e) the writer's recorded stdin equals the Packet byte for byte, and the Packet's first numbered line is each `holds` in order with
#       every `{<Role id>}` replaced by its correspondence's `expression` and no Role id (kogaki#1688, kogaki#1693); the fake binding
#       sets `cast: { terse: true }` on the first Paragraph Waypoint alone, and the Packet carries `*Cast:* terse` on the line beneath
#       it and no other `*Cast:*` line (kogaki#1695).
#   (f) the sheet (kogaki#1673, kogaki#1675), over a structure whose one higher-order relation is a list of one (kogaki#1678): its
#       parts in order with no `strand` part, no `Writer input` and no `cols` div, and a `bindings` part after `segments` holding
#       `Binding 1` and `Binding 2` of five labelled rows (kogaki#1682, kogaki#1687), and no `WBS` text (kogaki#1685); the Mapping
#       part carries `Base: <domain>` above a table headed `Abstract`, `Attribute`, `Correspondence`, the fixture's attribute word
#       in its Role's `Attribute` cell, and no kind word (kogaki#1693); and the Segments table's point cell carries its true cast
#       keys in a `meta` span, on the one Paragraph Waypoint whose cast sets one (kogaki#1695).

#   (g) an `expression` carrying a content word of the `proposition:` is refused naming the word and `correspondences[i].expression`,
#       in a table and in the owner's file; a null `expression` passes only on a placeholder table; a `role` naming no Role is refused
#       naming the id, on a placeholder table too, and a Role with other than one correspondence is refused naming the Role
#       (kogaki#1688, kogaki#1693).
#   (h) the repository's `moves/` and `theses/` are unchanged.
#   (i) checks/check-mapping-playground.sh still passes.

#   (j) the `--rbs-file` route with `move`, `waypoints` and `projection`, giving each Role id the expression `the crew's list`, exits 0 with
#       one call, `bind.state: supplied`, `rbs.variant: owner-authored` (kogaki#1671, kogaki#1688); a file without `projection` is
#       refused naming `projection` (kogaki#1689).
#   (k) `--rbs-file` with `--rbs` is refused naming both flags.
#   (l) a `base` carrying `kind` or without `domain`, a table carrying `pairs`, an unknown `move`, a wrong-length `waypoints` and a
#       `point` carrying a claim word are each refused naming the field (kogaki#1693).
#   (m) a Role without `attributes`, or with a non-list one, is refused naming the Role, and a root `attributes` is refused as an
#       undeclared key (kogaki#1693).
#   (n) `binding_rationale` in the rbs file reaches bind.yaml and the `Rationale` row of `Binding 1`, the model route's bind.yaml carries
#       `binding_rationale: null`, a non-text one is refused naming the field, and `grounds` is refused naming
#       `binding_rationale` (kogaki#1675, kogaki#1678, kogaki#1682, kogaki#1687).

#   (o) a `projection` map and a list of one each exit 0 with one writer call, `bind.yaml`'s `paragraphs` has two entries, and
#       the writer's stdin carries two numbered lines with their points indented, one claim line equal to the proposition,
#       the first line the structure's `holds` in the base's objects with no `{` left, and no article-so-far prose; a list of two
#       writes three Segments tables (kogaki#1681, kogaki#1688).
#   (p) a projecting point carrying a claim word passes, and `attribute_hits` and `Attribute words` appear in no file of the run.
#   (q) a `projection` entry with a wrong-length `waypoints` or an unknown `move` is refused naming its index, and
#       `projection` without the first binding is refused naming both.

#   (r) a writer stop leaves no `paragraph.md`.
#   (s) the one-map `higher_order` and a list of one pass and render as `h1`; a two-entry list is refused naming the count, and a
#       list entry with a duplicate id or an unknown relation is refused naming its index (kogaki#1678, kogaki#1685).
#   (t) a proposition file with text below its two lines is refused naming that text, a line above them is refused naming that
#       line, a second `proposition:` line is refused, a `claim:` line is refused naming
#       `proposition`, `--strand` is refused naming `--proposition`, and the Mapper's recorded stdin carries no rendering (kogaki#1685).

#   (u) `--rbs rbs_base` with a valid answer exits 0 with the base, bind and writer calls recorded, `rbs.yaml` carrying `base.domain`
#       with no `kind` and one correspondence per Role, and `rbs.variant: rbs_base`; the base call's stdin carries no kinds; a first
#       answer carrying a proposition word in an expression is refused naming the word and `correspondences[i].expression`, the second
#       attempt's stdin carries that refusal, each attempt's prompt and answer are kept, and a second refusal stops at `rbs`
#       (kogaki#1688, kogaki#1693).
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
  roles: [{ id: "crew", context: "A cleaning crew arrives at a house with a written list of rooms.", attributes: ["automatic"] },
    { id: "list", context: "The written list names the rooms the crew was told about at the door.", attributes: [] },
    { id: "room", context: "A room nobody wrote down stays dusty, even when it is next door.", attributes: [] }],
  relations: [{ id: "cleans", between: ["crew", "list"], holds: "{crew} cleans each place {list} names." },
    { id: "missed", between: ["list", "room"], holds: "{room} missing from {list} is never reached." }],
  higher_order: { relates: ["cleans", "missed"], holds: "Because {crew} follows {list}, what {list} leaves out stays dusty." } };
const structure = join(root, "structure.yaml");
writeFileSync(structure, stringifyYaml(mapped));
const ROLE_IDS = mapped.roles.map((r) => r.id);
// The first Leg Waypoint's point (kogaki#1688).
const pointOf = (holds, base) => holds.map((h) => h.replace(/\{([^{}\s]+)\}/g, (_, id) => base(id))).map((h) => h[0].toUpperCase() + h.slice(1)).join(" ");

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
  if (prompt.includes("\\\`rbs_base\\\` judgment point")) {
    const answers = JSON.parse(readFileSync(process.env.SMP_RBS_ANSWERS, "utf8"));
    let n = 0; try { n = readFileSync(dir + "/seen.jsonl", "utf8").split("\\n").filter((l) => l.includes('"stage":"rbs"')).length; } catch {}
    return out(answers[Math.min(n, answers.length - 1)], "rbs");
  }
  if (prompt.includes("\\\`smp_bind_unit\\\` judgment point")) {
    const { leg_you_must_plan: leg, paragraph_moves_you_may_bind: bindable } = body("leg_you_must_plan");
    const m = bindable[0];
    return out({ version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w, i) => (process.env.SMP_BIND_NULL && i === 1
      ? { waypoint: 2, move: null, rationale: "no Move's before holds the reader's knowledge here." }
      : { waypoint: i + 1, move: m.id, materials: [...w.serves], ...(i > 0 ? { join: "consequence" } : {}),
      purpose: "brings the reader to the list as the bound of the crew.", reader_state_after: { knowledge: "holds that the list bounds the crew." },
      depends_on: [], introduces: [], "re-activate": [], rationale: "it is paragraph " + (i + 1) + " of the Trial.",
      paragraph_waypoints: Array.from({ length: m.segments.length }, (_, n) => ({ point: "PW-" + (i + 1) + "-" + (n + 1) + " the paragraph makes its point.", serves: [...w.serves], cast: i === 0 && n === 0 ? { terse: true } : {} })) })) }, "bind");
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
ok(rbs.placeholder === true && Array.isArray(rbs.correspondences) && rbs.correspondences.length === ROLE_IDS.length
  && rbs.correspondences.every((c, i) => c.expression === null && c.role === ROLE_IDS[i]) && JSON.stringify(rbs.base) === JSON.stringify({ domain: null })
  && !Object.hasOwn(rbs, "pairs"),
  `(a) rbs.yaml is not one correspondence per Role, expression null, role the Role's id, base { domain: null }, placeholder true: ${JSON.stringify(rbs)}`);
ok(rec.bind && typeof rec.bind.move === "string" && fileOk(rec.bind), `(a) trial.json's bind does not carry the Move and its file: ${JSON.stringify(rec.bind)}`);
ok(rec.paragraph && fileOk(rec.paragraph) && readFileSync(join(repo, rec.paragraph.path), "utf8").startsWith("WRITTEN"),
  "(a) trial.json's paragraph does not name paragraph.md with its sha256");
ok(rec.sheet && existsSync(join(repo, rec.sheet)), "(a) trial.json names no sheet that exists");
ok(rec.reading && readFileSync(join(repo, rec.reading), "utf8") === `# Reading of Trial ${rec.trial}\n`, "(a) reading.md is not empty under its header");
ok(rec.stages && rec.stages.every((s) => s.calls === null || existsSync(join(repo, s.calls))), "(a) a stage names a calls.jsonl that does not exist");
const legOf = (stdin) => { const at = stdin.lastIndexOf('"leg_you_must_plan"'); try { return JSON.parse(stdin.slice(stdin.lastIndexOf("{", at))).leg_you_must_plan; } catch { return null; } };
const aBindCalls = a.calls("bind");
const aLeg = aBindCalls.length === 1 ? legOf(aBindCalls[0].stdin) : null;
ok(aLeg && aLeg.waypoints.length === 2 && aLeg.waypoints[1].point === PROPOSITION && aLeg.waypoints[0].next_point === PROPOSITION,
  `(a) the one bind call's stdin does not carry two Leg Waypoints, the second's point the proposition: ${aBindCalls.length} ${JSON.stringify(aLeg && aLeg.waypoints)}`);
const aBindYaml = existsSync(join(a.o, "bind.yaml")) ? parseYaml(readFileSync(join(a.o, "bind.yaml"), "utf8"), "bind") : {};
ok(Array.isArray(aBindYaml.paragraphs) && aBindYaml.paragraphs.length === 2 && JSON.stringify(rec.bind.paragraphs) === JSON.stringify(aBindYaml.paragraphs)
  && aBindYaml.paragraphs.every((e) => typeof e.move === "string" && e.binding_rationale === null && e.paragraph_waypoints.length > 0),
  `(a) bind.yaml's paragraphs is not two entries of { move, binding_rationale: null, paragraph_waypoints }: ${JSON.stringify(aBindYaml.paragraphs)}`);

// (e) the writer's stdin is the Packet
const w = a.calls("write");
const packet = existsSync(join(a.o, "write", "packet.md")) ? readFileSync(join(a.o, "write", "packet.md"), "utf8") : null;
ok(packet !== null && w.length === 1 && w[0].stdin === packet, "(e) the writer's recorded stdin is not the Packet byte for byte");
const pLines = (packet || "").split("\n");
const castAt = pLines.findIndex((l) => l.includes("PW-1-1 the paragraph makes its point."));
ok(castAt !== -1 && pLines[castAt + 1] === "      *Cast:* terse" && pLines.filter((l) => l.includes("*Cast:*")).length === 1,
  `(e) the Packet does not carry \`*Cast:* terse\` beneath the first Paragraph Waypoint alone: ${JSON.stringify(pLines.slice(castAt, castAt + 2))}`);

// (b) the Mapper route
writeFileSync(join(root, "answer.json"), JSON.stringify(mapped));
const b = run("mapped", ["--mapper", "sme_map_roles"], { SMP_MAPPER_ANSWER: join(root, "answer.json") });
const bCalls = [...b.calls("sme"), ...b.calls("bind"), ...b.calls("write")];
ok(b.res.status === 0 && stagesOf(b.rec) === "sme:done,rbs:done,bind:done,write:done" && bCalls.length === 3
  && b.rec.structure.author === "sme" && b.rec.mapper.variant === "sme_map_roles",
  `(b) the --mapper run did not record three calls with structure.author: sme: ${b.res.status} ${stagesOf(b.rec)} ${bCalls.length} ${b.res.stderr}`);
const bRbs = existsSync(join(b.o, "rbs.yaml")) ? parseYaml(readFileSync(join(b.o, "rbs.yaml"), "utf8"), "rbs") : {};
ok(JSON.stringify((bRbs.correspondences || []).map((c) => [c.role, c.expression])) === JSON.stringify(ROLE_IDS.map((id) => [id, null])),
  `(b) the mapper route's placeholder does not name the mapper's Roles by role: ${JSON.stringify(bRbs.correspondences)}`);

// (c) an unknown --rbs is refused naming the declared rows, before anything is written
const c = run("unknown-rbs", ["--structure", structure, "--rbs", "rbs_nothing"]);
ok(c.res.status !== 0 && c.res.stderr.includes("rbs_nothing") && c.res.stderr.includes("it declares rbs_placeholder") && !existsSync(c.o),
  `(c) --rbs rbs_nothing was not refused naming the rows: ${c.res.status} ${c.res.stderr}`);

// (d) move: null stops at bind
const d = run("no-move", ["--structure", structure], { SMP_BIND_NULL: "1" });
ok(d.res.status !== 0 && stagesOf(d.rec) === "rbs:done,bind:stopped,write:not run" && /^bind: /.test(String(d.rec.stopped))
  && String(d.rec.stopped).includes("no_paragraph_move_fits") && String(d.rec.stopped).includes("Waypoint 2") && !String(d.rec.stopped).includes("Waypoint 1")
  && !existsSync(join(d.o, "paragraph.md")) && existsSync(join(d.o, "sheet.html")),
  `(d) a move: null answer on Waypoint 2 did not stop the Trial at bind naming it: ${d.res.status} ${stagesOf(d.rec)} ${JSON.stringify(d.rec && d.rec.stopped)}`);
const dSheet = existsSync(join(d.o, "sheet.html")) ? readFileSync(join(d.o, "sheet.html"), "utf8") : "";
const dParagraph = (/<section class="card" id="proposition-paragraph">([\s\S]*?)<\/section>/.exec(dSheet) || [])[1] || "";
ok(d.rec && dParagraph.includes(`stopped — ${d.rec.stopped}`.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")),
  `(d) the stopped Trial's Proposition and Paragraph part does not carry the stop reason: ${dParagraph}`);

// (g) an expression carrying a claim word is refused naming it; the Role rules hold on every table
const BASES = { base: { domain: "a garden" }, correspondences: [{ role: "crew", expression: "the gardener" }, { role: "list", expression: "the chart the walker keeps" }, { role: "room", expression: "a bed" }] };
const gv = (t) => validateRbsTable(t, PROPOSITION, { structure: mapped });
const g = gv(BASES);
ok(g.error && g.error.includes('correspondences[1].expression carries "walker", a content word of the proposition'),
  `(g) an expression carrying "walker" was not refused naming it and correspondences[1].expression: ${JSON.stringify(g)}`);
const gRole = validateRbsTable({ placeholder: true, base: { domain: null }, correspondences: [{ role: "The walker sees a room.", expression: null }] }, PROPOSITION);
ok(gRole.error && gRole.error.includes('correspondences[0].role carries "walker", a content word of the proposition'),
  `(g) a target carrying "walker" was not refused naming it and correspondences[0].role: ${JSON.stringify(gRole)}`);
const gNull = gv({ ...BASES, correspondences: BASES.correspondences.map((c, i) => (i === 0 ? { ...c, expression: null } : { ...c, expression: "a bed" })) });
ok(gNull.error && gNull.error.startsWith("correspondences[0].expression "),
  `(g) a null expression on a table that is not a placeholder was not refused naming correspondences[0].expression: ${JSON.stringify(gNull)}`);
const PLACE = { placeholder: true, base: { domain: null }, correspondences: ROLE_IDS.map((id) => ({ role: id, expression: null })) };
ok(!gv(PLACE).error, `(g) a placeholder table giving every Role null was refused: ${JSON.stringify(gv(PLACE))}`);
const gStray = gv({ ...PLACE, correspondences: [...PLACE.correspondences.slice(0, 2), { role: "porch", expression: null }] });
ok(gStray.error && gStray.error.startsWith('correspondences[2].role "porch" names no Role'),
  `(g) a placeholder correspondence naming no Role was not refused naming the id: ${JSON.stringify(gStray)}`);
const gTwice = gv({ ...PLACE, correspondences: [...PLACE.correspondences, { role: "crew", expression: null }] });
ok(gTwice.error && gTwice.error.includes('the Role "crew" has 2 correspondences'), `(g) a Role with two correspondences was not refused naming the Role: ${JSON.stringify(gTwice)}`);
const gMissing = gv({ ...PLACE, correspondences: PLACE.correspondences.slice(1) });
ok(gMissing.error && gMissing.error.includes('the Role "crew" has 0 correspondences'), `(g) a Role with no correspondence was not refused naming the Role: ${JSON.stringify(gMissing)}`);
const gFile = join(root, "rbs-walker.yaml");
writeFileSync(gFile, stringifyYaml(BASES));
const gRun = run("owner-walker", ["--structure", structure, "--rbs-file", gFile]);
ok(gRun.res.status !== 0 && gRun.res.stderr.includes('correspondences[1].expression carries "walker"') && !existsSync(gRun.o),
  `(g) the owner's file with an expression carrying "walker" was not refused naming it: ${gRun.res.status} ${gRun.res.stderr}`);
const gClaimed = join(root, "rbs-claims-placeholder.yaml");
writeFileSync(gClaimed, stringifyYaml(PLACE));
const gcRun = run("owner-claims-placeholder", ["--structure", structure, "--rbs-file", gClaimed]);
ok(gcRun.res.status !== 0 && gcRun.res.stderr.includes("correspondences[0].expression ") && !existsSync(gcRun.o),
  `(g) an owner's file declaring itself a placeholder passed a null expression: ${gcRun.res.status} ${gcRun.res.stderr}`);

// (j) the owner-authored table with a supplied binding: one writer call, no binding call
const MOVE = "answer_a_posed_question_then_win_two_easy_assents_before_ranking_the_distinction_first";
const SEGMENTS = moveContract(MOVE, join(repo, "moves")).segments.length;
const LONE = { id: "porch", context: "A porch light glows by the gate.", attributes: [] };
const owned = { base: { domain: "a cleaning crew working through a house" },
  correspondences: [...ROLE_IDS, LONE.id].map((id) => ({ role: id, expression: "the crew's list" })), move: MOVE,
  binding_rationale: "RATIONALE the Move asks and answers, as the crew asks which room comes first.",
  waypoints: Array.from({ length: SEGMENTS }, (_, n) => ({ segment: n + 1, point: `OWNED-${n + 1} the crew keeps to its list.` })) };
const PROJ = { move: MOVE, binding_rationale: "RATIONALE2 the Move carries the crew's list over to the walker.",
  waypoints: Array.from({ length: SEGMENTS }, (_, n) => ({ segment: n + 1,
    point: n === 0 ? "PROJ-1 the walker sees the files." : n === 1 ? "PROJ-2 a dusty file is never reached." : `PROJ-${n + 1} the rule set keeps to its list.` })) };
const ownedFile = join(root, "rbs-owned.yaml");
writeFileSync(ownedFile, stringifyYaml({ ...owned, projection: PROJ }));
const unprojectedFile = join(root, "rbs-unprojected.yaml");
writeFileSync(unprojectedFile, stringifyYaml(owned));
const wide = join(root, "structure-wide.yaml");
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
const jNo = run("owned-unprojected", ["--structure", wide, "--rbs-file", unprojectedFile]);
ok(jNo.res.status !== 0 && jNo.res.stderr.includes("`projection`") && jNo.seen.length === 0 && !existsSync(jNo.o),
  `(j) an owner's file without projection was not refused naming projection: ${jNo.res.status} ${jNo.res.stderr}`);

// (k) --rbs-file with --rbs is refused naming both flags
const k = run("both-rbs", ["--structure", structure, "--rbs", "rbs_placeholder", "--rbs-file", ownedFile]);
ok(k.res.status !== 0 && k.res.stderr.includes("`--rbs`") && k.res.stderr.includes("`--rbs-file`") && !existsSync(k.o),
  `(k) --rbs with --rbs-file was not refused naming both: ${k.res.status} ${k.res.stderr}`);

// (l) each bad field of the table is refused naming it
const lv = (edit) => validateRbsTable({ ...owned, ...edit }, PROPOSITION, { movesDir: join(repo, "moves") });
const l0 = validateRbsTable({ correspondences: owned.correspondences }, PROPOSITION);
ok(l0.error && l0.error.includes("`base`"), `(l) a table with no base was not refused naming base: ${JSON.stringify(l0)}`);
const l1 = lv({ base: { domain: "a house", kind: "analogy" } });
ok(l1.error && l1.error.includes("`kind`"), `(l) a base carrying kind was not refused naming kind: ${JSON.stringify(l1)}`);
const l1d = lv({ base: {} });
ok(l1d.error && l1d.error.includes("`domain`"), `(l) a base without domain was not refused naming domain: ${JSON.stringify(l1d)}`);
const l1p = lv({ pairs: owned.correspondences.map((c) => ({ base: c.expression, target: c.role })) });
ok(l1p.error && l1p.error.includes("`pairs`"), `(l) a table carrying pairs was not refused naming pairs: ${JSON.stringify(l1p)}`);
const l2 = lv({ move: "no_such_move" });
ok(l2.error && l2.error.startsWith("move "), `(l) a move naming no Move was not refused naming move: ${JSON.stringify(l2)}`);
const l3 = lv({ waypoints: owned.waypoints.slice(1) });
ok(l3.error && l3.error.startsWith("waypoints "), `(l) a waypoints list of the wrong length was not refused naming waypoints: ${JSON.stringify(l3)}`);
const l4 = lv({ waypoints: owned.waypoints.map((w, n) => (n === 2 ? { ...w, point: "The walker sees a room." } : w)) });
ok(l4.error && l4.error.includes('waypoints[2].point carries "walker"'), `(l) a point carrying a claim word was not refused naming the field: ${JSON.stringify(l4)}`);

// (m) every Role carries its attributes; a root attributes is an undeclared key
const propositionRec = { cite: CITE, proposition: PROPOSITION };
const withRole = (i, role) => ({ ...mapped, roles: mapped.roles.map((r, n) => (n === i ? role : r)) });
const { attributes: _a, ...bare } = mapped.roles[1];
const m1 = validateStructure(withRole(1, bare), propositionRec);
ok(m1.error && m1.error.includes("`attributes`") && m1.error.includes('"list"'), `(m) a Role without attributes was not refused naming the Role: ${JSON.stringify(m1)}`);
const m2 = validateStructure(withRole(1, { ...mapped.roles[1], attributes: "written" }), propositionRec);
ok(m2.error && m2.error.includes("`attributes`") && m2.error.includes('"list"'), `(m) a non-list attributes was not refused naming the Role: ${JSON.stringify(m2)}`);
const m3 = validateStructure({ ...mapped, attributes: [{ role: "room", words: ["dusty"] }] }, propositionRec);
ok(m3.error && m3.error.includes("carries `attributes`, which it does not declare"), `(m) a root attributes was not refused as an undeclared key: ${JSON.stringify(m3)}`);

// (f) the sheet: dark, its six sections in order, the proposition and cite line above the Paragraph, Segments, Bindings, Mapping and Structure
const SECTIONS = ["Proposition and Paragraph", "Segments", "Bindings", "Mapping", "Structure", "Model calls"];
const PART_IDS = ["proposition-paragraph", "segments", "bindings", "mapping", "structure", "calls"];
const partIds = (html) => [...html.matchAll(/<section class="card" id="([^"]+)">/g)].map((x) => x[1]);
const sheet = rec.sheet && existsSync(join(repo, rec.sheet)) ? readFileSync(join(repo, rec.sheet), "utf8") : "";
ok(/^<!doctype html><html data-theme="dark">/.test(sheet), "(f) sheet.html does not carry data-theme=\"dark\" on its root");
const jSheet = existsSync(join(j.o, "sheet.html")) ? readFileSync(join(j.o, "sheet.html"), "utf8") : "";
const h2s = [...jSheet.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((x) => x[1]);
ok(JSON.stringify(h2s) === JSON.stringify(SECTIONS), `(f) sheet.html's h2s are not the six sections in order: ${JSON.stringify(h2s)}`);
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const section = (html, id) => (new RegExp(`<section class="card" id="${id}">([\\s\\S]*?)<\\/section>`).exec(html) || [])[1] || "";
ok(JSON.stringify(partIds(jSheet)) === JSON.stringify(PART_IDS) && !jSheet.includes("Writer input"),
  `(f) sheet.html's parts are not the six ids in order with no strand part and no Writer input: ${JSON.stringify(partIds(jSheet))}`);
const pp = section(jSheet, "proposition-paragraph");
ok(!pp.includes('class="cols"') && pp.startsWith(`<h2>Proposition and Paragraph</h2><p>${esc(PROPOSITION)}</p><p class="meta">cite: ${esc(CITE)}</p><div class="prose">WRITTEN the crew`),
  `(f) the proposition and its cite line do not stand above the full-width Paragraph with no cols div: ${pp}`);
ok(!sheet.includes("WBS") && !jSheet.includes("WBS"), "(f) a sheet still carries `WBS`");
const segs = moveContract(MOVE, join(repo, "moves")).segments;
const segTables = [...section(jSheet, "segments").matchAll(/<table><caption>Paragraph \d+ [\s\S]*?<\/table>/g)].map((x) => x[0]);
const segRows = [...(segTables[0] || "").matchAll(/<tr><td>(\d+)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)];
ok(segRows.length === segs.length && segs.every((sg, n) => segRows[n][1] === String(n + 1) && segRows[n][2] === esc(sg.operation)
  && segRows[n][3] === esc(sg.relation || "") && segRows[n][4] === esc(sg.manner || "") && segRows[n][5] === esc(owned.waypoints[n].point)),
  `(f) the Segments table is not one row per Segment with its operation, relation, manner and point: ${segRows.length} rows for ${segs.length} segments`);
ok(!sheet.includes("serves L") && !jSheet.includes("serves L"), "(f) a sheet still carries `serves L`");
ok(section(sheet, "segments").includes('<td>PW-1-1 the paragraph makes its point. <span class="meta">terse</span></td>')
  && (section(sheet, "segments").match(/class="meta">terse</g) || []).length === 1,
  "(f) the Segments table's point cell of the Paragraph Waypoint whose cast sets `terse` does not carry it in a meta span, alone (kogaki#1695)");
const tableOf = (html, caption) => [...html.matchAll(new RegExp(`<table><caption>${caption}</caption>([\\s\\S]*?)</table>`, "g"))].map((x) => x[1]);
const rowOf = (table, label) => (new RegExp(`<th rowspan="\\d+">${label}</th>([\\s\\S]*?)(?=<tr><th |</tbody>)`).exec(table) || [])[1] || "";
const labelsOf = (table) => [...table.matchAll(/<th rowspan="\d+">([\s\S]*?)<\/th>/g)].map((x) => x[1]);
const KNOWLEDGE = (moveContract(MOVE, join(repo, "moves")).before.split("\n").find((l) => l.startsWith("knowledge: ")) || "knowledge: ?");
ok(section(jSheet, "segments").includes(`<caption>Paragraph 1 <span class="meta">${MOVE}</span></caption>`) && !section(jSheet, "segments").includes("<caption>Binding"),
  "(f) the Segments table is not captioned `Paragraph 1` with its Move, or a Binding table remains inside Segments");
const [jBinding] = tableOf(section(jSheet, "bindings"), "Binding 1");
ok(jBinding && JSON.stringify(labelsOf(jBinding)) === JSON.stringify(["Move", "Bound by", "Before", "After", "Rationale"])
  && rowOf(jBinding, "Move").includes(`<td>${MOVE}</td>`) && rowOf(jBinding, "Bound by").includes("<td>owner</td>")
  && rowOf(jBinding, "Before").includes(`<td>${esc(KNOWLEDGE)}</td>`) && rowOf(jBinding, "After").includes("<td>knowledge: "),
  `(f) the Binding table is not the five labelled rows with the Move's before.knowledge: ${jBinding}`);
const [aBinding] = tableOf(section(sheet, "bindings"), "Binding 1");
const segCaps = (html) => [...section(html, "segments").matchAll(/<caption>(Paragraph \d+) /g)].map((x) => x[1]);
ok(JSON.stringify(segCaps(sheet)) === JSON.stringify(["Paragraph 1", "Paragraph 2"]) && tableOf(section(sheet, "bindings"), "Binding \\d+").length === 2,
  `(a) the model route's sheet does not carry two Segments tables and two Binding tables: ${JSON.stringify(segCaps(sheet))}`);
ok(aBinding && rowOf(aBinding, "Bound by").includes("<td>smp_bind_unit</td>") && rowOf(aBinding, "Rationale").includes("<td>none</td>"),
  `(f) the model route's Binding table does not carry its row name and a Rationale of none: ${aBinding}`);
ok(![...section(jSheet, "segments").matchAll(/<caption>([\s\S]*?)<\/caption>/g)].some((x) => x[1].includes("—")),
  "(f) a — caption line still precedes a Segments table");
const HEADS = ["Abstract", "Attribute", "Correspondence"];
const ths = [...section(jSheet, "mapping").matchAll(/<th>([\s\S]*?)<\/th>/g)].map((x) => x[1]);
ok(JSON.stringify(ths) === JSON.stringify(HEADS) && section(jSheet, "mapping").startsWith(`<h2>Mapping</h2><p class="meta">Base: ${esc(owned.base.domain)}</p><table>`),
  `(f) the Mapping part is not the Base line above a table headed Abstract, Attribute and Correspondence: ${JSON.stringify(ths)}`);
const pHeads = [...section(sheet, "mapping").matchAll(/<th>([\s\S]*?)<\/th>/g)].map((x) => x[1]);
ok(JSON.stringify(pHeads) === JSON.stringify(HEADS) && section(sheet, "mapping").includes('<p class="meta">Base: none</p>'),
  `(f) the placeholder's Mapping part is not \`Base: none\` above the three fixed headers: ${JSON.stringify(pHeads)}`);
const KIND_WORDS = /\b(analogy|abstraction|literal-similarity|mere-appearance|kind)\b/i;
ok(![sheet, jSheet].some((h) => KIND_WORDS.test(section(h, "mapping"))), "(f) a Mapping part carries a kind word");
const mapRows = [...section(jSheet, "mapping").matchAll(/<tr><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)];
ok(mapped.roles.every((r) => mapRows.filter((x) => x[1] === `<span class="meta">${r.id}</span> ${esc(r.context)}` && x[2] === r.attributes.join(", ")
  && x[3] === esc("the crew's list")).length === 1) && mapRows.some((x) => x[1].startsWith('<span class="meta">crew</span>') && x[2] === "automatic"),
  `(f) the mapping table is not one row per Role carrying its id and context, its attributes and its expression: ${mapRows.map((x) => x.slice(1).join("|")).join(" / ")}`);
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
  `(n) the supplied binding_rationale did not reach bind.yaml, the record and the Rationale row of Binding 1: ${JSON.stringify(jBind)} / ${rationaleRow}`);
const aBind = existsSync(join(a.o, "bind.yaml")) ? parseYaml(readFileSync(join(a.o, "bind.yaml"), "utf8"), "bind") : {};
ok(Object.hasOwn(aBind, "binding_rationale") && aBind.binding_rationale === null && rec.bind.binding_rationale === null,
  `(n) the model route's bind.yaml does not carry binding_rationale: null: ${JSON.stringify(aBind)}`);
const n1 = lv({ binding_rationale: ["a list"] });
ok(n1.error && n1.error.startsWith("binding_rationale "), `(n) a non-text binding_rationale was not refused naming it: ${JSON.stringify(n1)}`);
const n2 = lv({ grounds: "the old field" });
ok(n2.error && n2.error.startsWith("grounds ") && n2.error.includes("`binding_rationale`"), `(n) grounds was not refused naming binding_rationale: ${JSON.stringify(n2)}`);

// (o) the projecting bindings: one Leg, one Packet, one writer call
// The owner's file names the Roles by id (kogaki#1688).
const byId = owned;
const projFile = join(root, "rbs-projected.yaml");
writeFileSync(projFile, stringifyYaml({ ...byId, projection: PROJ }));
const listFile = join(root, "rbs-projected-list.yaml");
writeFileSync(listFile, stringifyYaml({ ...byId, projection: [PROJ] }));
const blockOf = (packet, heading) => { const at = packet.indexOf(heading); if (at < 0) return null; const rest = packet.slice(at + heading.length); const nx = rest.indexOf("\n## "); return nx < 0 ? rest : rest.slice(0, nx); };
const FIRST = pointOf([...mapped.relations, PASSED, ...HIGHER].map((x) => x.holds), () => "the crew's list");
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
  ok(tops[0] === `1. ${FIRST} *Serves:* ${PROPOSITION}` && !pk.includes("{"), `(o) ${name}: the first numbered line is not the structure in the base's objects: ${JSON.stringify(tops[0])}`);
  const soFar = blockOf(pk, SO_FAR);
  ok(soFar !== null && soFar === blockOf(jPacket, SO_FAR) && !soFar.includes("WRITTEN"), `(o) ${name}: the Packet carries article-so-far prose: ${soFar}`);
  ok(readFileSync(join(o.o, "paragraph.md"), "utf8").startsWith("WRITTEN") && !existsSync(join(o.o, "bind2.yaml")) && !existsSync(join(o.o, "paragraph2.md")),
    `(o) ${name}: paragraph.md is not the whole answer, or bind2.yaml or paragraph2.md was written`);
  const oSheet = existsSync(join(o.o, "sheet.html")) ? readFileSync(join(o.o, "sheet.html"), "utf8") : "";
  const oBindings = tableOf(section(oSheet, "bindings"), "Binding \\d+");
  const oCaps = [...section(oSheet, "bindings").matchAll(/<caption>([\s\S]*?)<\/caption>/g)].map((x) => x[1]);
  ok(JSON.stringify(partIds(oSheet)) === JSON.stringify(PART_IDS) && JSON.stringify(oCaps) === JSON.stringify(["Binding 1", "Binding 2"])
    && !oSheet.includes("Writer input") && !section(oSheet, "segments").includes("<caption>Binding"),
    `(f) ${name}: the bindings part does not follow segments carrying Binding 1 and Binding 2, or a Writer input remains: ${JSON.stringify(partIds(oSheet))} ${JSON.stringify(oCaps)}`);
  ok(oBindings.length === 2 && rowOf(oBindings[0], "Rationale").includes(esc(owned.binding_rationale))
    && rowOf(oBindings[1], "Rationale").includes(esc(PROJ.binding_rationale))
    && oBindings.every((t) => JSON.stringify(labelsOf(t)) === JSON.stringify(["Move", "Bound by", "Before", "After", "Rationale"]) && rowOf(t, "Before").includes(esc(KNOWLEDGE)))
    && !oSheet.includes("Reader state:"), `(o) ${name}: the sheet does not carry two Binding tables and no reader state: ${oBindings.length}`);
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
const o3Caps = tableOf(section(o3Sheet, "bindings"), "Binding \\d+");
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

// (u) the rbs_base row: one call chooses the base, validated as the owner's file is, under one retry
const GARDEN = { base: { domain: "a gardener tending a plot" },
  correspondences: [{ role: "crew", expression: "the gardener" }, { role: "list", expression: "the planting chart" }, { role: "room", expression: "a flower bed" }] };
const WALKED = { ...GARDEN, correspondences: GARDEN.correspondences.map((c, i) => (i === 0 ? { ...c, expression: "the walker" } : c)) };
const answers = (name, list) => { const f = join(root, `${name}.json`); writeFileSync(f, JSON.stringify(list)); return { SMP_RBS_ANSWERS: f }; };
const u = run("rbs-base", ["--structure", structure, "--rbs", "rbs_base"], answers("rbs-base", [GARDEN]));
const uCalls = [u.calls("rbs"), u.calls("bind"), u.calls("write")];
const uRbs = existsSync(join(u.o, "rbs.yaml")) ? parseYaml(readFileSync(join(u.o, "rbs.yaml"), "utf8"), "rbs") : {};
ok(u.res.status === 0 && stagesOf(u.rec) === "rbs:done,bind:done,write:done" && uCalls.every((x) => x.length === 1) && u.seen.length === 3
  && u.rec.rbs.variant === "rbs_base" && u.rec.rbs.placeholder === false && fileOk(u.rec.rbs),
  `(u) --rbs rbs_base did not exit 0 with the base, bind and writer calls recorded: ${u.res.status} ${stagesOf(u.rec)} ${uCalls.map((x) => x.length)} ${u.res.stderr}`);
ok(uRbs.variant === "rbs_base" && JSON.stringify(uRbs.base) === JSON.stringify({ domain: GARDEN.base.domain })
  && JSON.stringify(uRbs.correspondences) === JSON.stringify(GARDEN.correspondences) && !validateRbsTable(uRbs, PROPOSITION, { structure: mapped }).error,
  `(u) rbs.yaml does not carry the answer's base.domain with no kind and one correspondence per Role: ${JSON.stringify(uRbs)}`);
const uIn = uCalls[0].length ? uCalls[0][0].stdin : "";
ok(uIn.includes('"prior_knowledge"') && uIn.includes('"structure"') && !uIn.includes('"kinds"') && !uIn.includes('"kind"'),
  "(u) the base call's stdin does not carry the structure and the prior-knowledge line, or still carries kinds");
// (e) the first numbered line is the structure in the base's objects, and no Role id
const uPk = existsSync(join(u.o, "write", "packet.md")) ? readFileSync(join(u.o, "write", "packet.md"), "utf8") : "";
const uTop = uPk.split("\n").find((l) => /^1\. .* \*Serves:\* /.test(l)) || "";
const byBase = new Map(GARDEN.correspondences.map((c) => [c.role, c.expression]));
const WANT = pointOf([...mapped.relations.map((x) => x.holds), mapped.higher_order.holds], (id) => byBase.get(id));
ok(uTop === `1. ${WANT} *Serves:* ${PROPOSITION}` && !ROLE_IDS.some((id) => new RegExp(`\\b${id}\\b`, "i").test(uTop.split(" *Serves:* ")[0])),
  `(e) the Packet's first numbered line is not the holds with the base texts substituted and no Role id: ${JSON.stringify(uTop)}`);
const u2 = run("rbs-base-retry", ["--structure", structure, "--rbs", "rbs_base"], answers("rbs-base-retry", [WALKED, GARDEN]));
const u2Calls = u2.calls("rbs");
ok(u2.res.status === 0 && u2Calls.length === 2
  && u2Calls[1].stdin.includes('correspondences[0].expression carries "walker"') && !u2Calls[0].stdin.includes("correspondences[0].expression carries"),
  `(u) a first answer carrying "walker" was not refused into the second attempt's stdin: ${u2.res.status} ${u2Calls.length} ${u2.res.stderr}`);
ok([1, 2].every((n) => existsSync(join(u2.o, "rbs", `prompt-${n}.md`)) && existsSync(join(u2.o, "rbs", `answer-${n}.json`)))
  && JSON.parse(readFileSync(join(u2.o, "rbs", "answer-1.json"), "utf8")).correspondences[0].expression === "the walker",
  "(u) the retried rbs stage does not keep each attempt's prompt and answer");
const u3 = run("rbs-base-stop", ["--structure", structure, "--rbs", "rbs_base"], answers("rbs-base-stop", [WALKED]));
ok(u3.res.status !== 0 && stagesOf(u3.rec) === "rbs:stopped,bind:not run,write:not run" && u3.calls("rbs").length === 2
  && /^rbs: /.test(String(u3.rec.stopped)) && String(u3.rec.stopped).includes('correspondences[0].expression carries "walker"') && !existsSync(join(u3.o, "rbs.yaml")),
  `(u) a second refusal did not stop the Trial at rbs: ${u3.res.status} ${stagesOf(u3.rec)} ${JSON.stringify(u3.rec && u3.rec.stopped)}`);

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
