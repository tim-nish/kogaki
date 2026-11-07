#!/usr/bin/env bash
# check-mapping-playground-short -- the short Trial (kogaki#1669), driven through `node src/mapping-playground/short.mjs run` with ONE fake model binary:
#   (a) the composed route (kogaki#1700), over a base Move leaving a `carry` and an inference Move taking one, exits 0 with the bind,
#       correspondence, waypoints and writer calls recorded, and its files and trial.json fields are written; `rbs.yaml` carries
#       `variant: composed`, `base.domain`, one correspondence per Role and the two bindings; the waypoints call's stdin carries two
#       Leg Waypoints, each with the Move `bind` bound, the second's `point` the proposition, and the `correspondences`;
#       `bind.yaml`'s `paragraphs` has two entries, and the sheet carries two Segments tables and two Binding tables. A base Move
#       leaving no `carry` writes one paragraph, one Leg Waypoint and one binding.
#   (b) `--mapper sme_map_roles --compose` records five calls and `structure.author: sme`.
#   (c) `--rbs` is refused naming `--compose` and `--rbs-file`, and a run with neither is refused naming both, with nothing written.

#   (d) the `smp_bind_move` row's refusals by name: an id not in the library, an `inference_move` null where the base Move leaves a
#       `carry` (naming the entry), one given where it leaves none, and an inference Move whose `takes` holds no `carry`; a first
#       refusal reaches the second attempt's stdin, and a second stops at `bind`. A waypoints answer binding another Move stops at
#       `waypoints` naming the Waypoint, and one whose Base Paragraph points carry no expression of a Role stops naming the Role.

#   (e) the writer's recorded stdin equals the Packet byte for byte, and the Packet's first numbered line is each `holds` in order with
#       every `{<Role id>}` replaced by its correspondence's `expression` and no Role id (kogaki#1688, kogaki#1693); the fake
#       waypoints answer sets `cast: { terse: true }` on the first Paragraph Waypoint alone, and the Packet carries `*Cast:* terse`
#       on the line beneath it and no other `*Cast:*` line (kogaki#1695).
#   (f) the sheet (kogaki#1673, kogaki#1675), over a structure whose one higher-order relation is a list of one (kogaki#1678): its
#       parts in order with no `strand` part, no `Writer input` and no `cols` div, and a `bindings` part after `segments` holding
#       `Binding 1` and `Binding 2` of five labelled rows, `Takes` and `Leaves` one sub-row per entry as `<kind>: <what>`
#       (kogaki#1682, kogaki#1687, kogaki#1700, kogaki#1699), and no `WBS` text (kogaki#1685); the Mapping part carries `Base: <domain>`
#       above a table headed `Abstract`, `Attribute`, `Correspondence`, the fixture's attribute word in its Role's `Attribute`
#       cell, and no kind word (kogaki#1693); and the Segments table's point cell carries its true cast keys in a `meta` span,
#       on the one Paragraph Waypoint whose cast sets one (kogaki#1695).

#   (g) an `expression` or a `role` sharing a word with the `proposition:` is accepted, in a table and in the owner's file, and
#       against the guard-reach proposition "the openings the panel has been set to sound on" is accepted while Base Paragraph
#       points carrying no expression of one Role are still refused naming the Role (kogaki#1707); a null `expression` is
#       refused on every table; a `role` naming no Role is refused
#       naming the id, and a Role with other than one correspondence is refused naming the Role (kogaki#1688, kogaki#1693).
#   (h) the repository's `moves/` and `theses/` are unchanged.
#   (i) checks/check-mapping-playground.sh still passes.

#   (j) the `--rbs-file` route with `move`, `waypoints` and `projection`, giving each Role id the expression `the crew's list`, exits 0 with
#       one call, `bind.state: supplied`, `rbs.variant: owner-authored` and `rbs.source` the file (kogaki#1671, kogaki#1700); a file
#       without `projection` is refused naming `projection` (kogaki#1689).
#   (k) `--rbs-file` with `--compose` is refused naming both flags.
#   (l) a `base` carrying `kind` or without `domain`, a table carrying `pairs`, an unknown `move` and a wrong-length `waypoints`
#       are each refused naming the field (kogaki#1693), and a supplied `point` carrying a claim word is accepted (kogaki#1707).
#   (m) a Role without `attributes`, or with a non-list one, is refused naming the Role, and a root `attributes` is refused as an
#       undeclared key (kogaki#1693); a `context` carrying "rules" is accepted (kogaki#1707).
#   (n) `binding_rationale` in the rbs file reaches bind.yaml and the `Rationale` row of `Binding 1`, the composed route's bind.yaml
#       carries the `bind` call's `rationale`, a non-text one is refused naming the field, and `grounds` is refused naming
#       `binding_rationale` (kogaki#1675, kogaki#1678, kogaki#1682, kogaki#1687, kogaki#1700).

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

#   (u) the `smp_correspondence` row: its stdin carries the structure, the prior-knowledge line and the bound base Move's
#       `segments`, and no kinds; a first answer with a null expression is refused naming
#       `correspondences[i].expression`, the second attempt's stdin carries that refusal, each attempt's prompt and answer are kept,
#       and a second refusal stops at `correspondence` (kogaki#1693, kogaki#1700).
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
const { bindMoveRefusal } = await import(pathToFileURL(join(repo, "src/mapping-playground/short.mjs")).href);
const { correspondenceVocabularyRefusal } = await import(pathToFileURL(join(repo, "src/mapping-playground/rbs.mjs")).href);
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
  const nth = (stage, file) => {
    const answers = JSON.parse(readFileSync(file, "utf8"));
    let n = 0; try { n = readFileSync(dir + "/seen.jsonl", "utf8").split("\\n").filter(Boolean).filter((l) => JSON.parse(l).stage === stage).length; } catch {}
    return answers[Math.min(n, answers.length - 1)];
  };
  if (prompt.includes("\\\`smp_bind_move\\\` judgment point")) return out(nth("bind", process.env.SMP_BIND_ANSWERS), "bind");
  if (prompt.includes("\\\`smp_correspondence\\\` judgment point")) return out(nth("correspondence", process.env.SMP_CORR_ANSWERS), "correspondence");
  if (prompt.includes("\\\`smp_waypoints_unit\\\` judgment point")) {
    const { leg_you_must_plan: leg, paragraph_moves_you_may_bind: bindable, correspondences } = body("leg_you_must_plan");
    const exprs = correspondences.filter((c) => c.role !== process.env.SMP_DROP_ROLE).map((c) => c.expression);
    return out({ version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w, i) => {
      const m = bindable.find((x) => x.id === w.move);
      return { waypoint: i + 1, move: process.env.SMP_WRONG_MOVE && i === 0 ? process.env.SMP_WRONG_MOVE : w.move, materials: [...w.serves],
        ...(i > 0 ? { join: "consequence" } : {}),
        purpose: "brings the reader to the chart as the bound of the gardener.",
        depends_on: [], introduces: [], "re-activate": [], rationale: "it is paragraph " + (i + 1) + " of the Trial.",
        paragraph_waypoints: Array.from({ length: m.segments.length }, (_, n) => ({
          point: i === 0 && n === 0 ? "PW-1-1 " + exprs.join(" and ") + " hold together." : "PW-" + (i + 1) + "-" + (n + 1) + " the paragraph makes its point.",
          serves: [...w.serves], cast: i === 0 && n === 0 ? { terse: true } : {} })) };
    }) }, "waypoints");
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
// THE LIBRARY THE TRIAL READS (kogaki#1698, kogaki#1700): a copy of `moves/` under the Trials directory in which every record
// carries the `takes` and `leaves` this check sets: MOVE leaves a `carry`, INFER takes one, PLAIN leaves none, and every other
// record carries both lists empty, and no record the retired `obligation` (kogaki#1701), so the Trial reads every
// other field of the library as written.
const MOVE = "answer_a_posed_question_then_win_two_easy_assents_before_ranking_the_distinction_first";
const INFER = "build_the_familiar_side_of_a_contrast_up_to_its_principle";
const PLAIN = "build_the_omitted_level_into_an_ordering_then_turn_it_on_the_accounts";
const CARRY_WHAT = "the structure the paragraph gave in a base of the reader's";
const INFER_TAKES = "a structure given in a base, carried onto the subject";
const library = (() => {
  const dir = mkdtempSync(join(trials, "check-library-"));
  for (const n of readdirSync(join(repo, "moves")).filter((x) => x.endsWith(".yaml") || x === "ROLES.json")) {
    const text = readFileSync(join(repo, "moves", n), "utf8");
    if (!n.endsWith(".yaml")) { writeFileSync(join(dir, n), text); continue; }
    const r = parseYaml(text, n);
    const id = n.replace(/\.yaml$/, "");
    r.takes = id === INFER ? [{ kind: "carry", what: INFER_TAKES }] : [];
    r.leaves = id === MOVE ? [{ kind: "carry", what: CARRY_WHAT, segment: r.segments.length }] : [];
    // The retired `obligation` (kogaki#1701) is cut, as the owner's `--retire-obligation` run cuts it.
    delete r.obligation; delete r.obligation_triggers;
    writeFileSync(join(dir, n), stringifyYaml(r));
  }
  return dir;
})();
const GARDEN = { base: { domain: "a gardener tending a plot" },
  correspondences: [{ role: "crew", expression: "the gardener" }, { role: "list", expression: "the planting chart" }, { role: "room", expression: "a flower bed" }] };
const RATIONALE = "RATIONALE-M the Segments carry the cleaning and the missing in order.";
const answers = (name, list) => { const f = join(root, `${name}.json`); writeFileSync(f, JSON.stringify(list)); return f; };
const CARRYING = { base_move: MOVE, inference_move: INFER, rationale: RATIONALE };
const ALONE = { base_move: PLAIN, inference_move: null, rationale: RATIONALE };
const DEFAULT_ENV = { SMP_BIND_ANSWERS: answers("bind-default", [CARRYING]), SMP_CORR_ANSWERS: answers("corr-default", [GARDEN]) };
const outDir = mkdtempSync(join(trials, "check-short-"));
const run = (name, args, extraEnv = {}) => {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  const o = join(outDir, name);
  const res = spawnSync(process.execPath, ["src/mapping-playground/short.mjs", "run", "--library", library, ...(args.includes("--strand") ? [] : ["--proposition", proposition]), "--out", o, ...args],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, SMP_FIXTURE_DIR: dir, ...DEFAULT_ENV, ...extraEnv }, timeout: 600000 });
  const rec = existsSync(join(o, "trial.json")) ? JSON.parse(readFileSync(join(o, "trial.json"), "utf8")) : null;
  const seen = existsSync(join(dir, "seen.jsonl")) ? readFileSync(join(dir, "seen.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  const calls = (stage) => { const p = join(o, stage, "calls.jsonl"); return existsSync(p) ? readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };
  return { res, o, rec, seen, calls };
};
const stagesOf = (rec) => (rec ? rec.stages.map((s) => `${s.stage}:${s.state}`).join(",") : "no record");
const fileOk = (f) => f && typeof f.path === "string" && existsSync(join(repo, f.path)) && f.sha256 === sha(join(repo, f.path));

// (a) the composed route: bind, correspondence, waypoints and write
const STAGES = "bind:done,correspondence:done,waypoints:done,write:done";
const a = run("composed", ["--structure", structure, "--compose"]);
ok(a.res.status === 0, `(a) the run exited ${a.res.status}: ${a.res.stdout}${a.res.stderr}`);
const rec = a.rec || {};
ok(stagesOf(a.rec) === STAGES, `(a) the stages are not all done: ${JSON.stringify(rec.stages)}`);
const recorded = ["bind", "correspondence", "waypoints", "write"].flatMap((st) => a.calls(st));
ok(recorded.length === 4 && a.seen.length === 4 && recorded.every((c, i) => c.stdin === a.seen[i].prompt && c.stdout === a.seen[i].answer)
  && JSON.stringify(a.seen.map((x) => x.stage)) === JSON.stringify(["bind", "correspondence", "waypoints", "writer"]),
  `(a) the run did not record the bind, correspondence, waypoints and writer calls the binary saw: ${recorded.length} recorded, ${a.seen.map((x) => x.stage)}`);
ok(rec.proposition && rec.proposition.cite === CITE && rec.proposition.proposition === PROPOSITION && rec.proposition.sha256 === sha(proposition)
  && !Object.hasOwn(rec, "strand"), `(a) trial.json's proposition is not the file's cite, sentence and sha256, or a strand key remains: ${JSON.stringify(rec.proposition)}`);
ok(rec.structure && rec.structure.author === "owner" && rec.structure.sha256 === sha(structure) && rec.mapper === "owner-authored",
  "(a) trial.json's structure and mapper are not the owner-authored ones");
ok(rec.rbs && rec.rbs.variant === "composed" && !Object.hasOwn(rec.rbs, "placeholder") && fileOk(rec.rbs), `(a) trial.json's rbs is not the composed table's file: ${JSON.stringify(rec.rbs)}`);
const rbs = existsSync(join(a.o, "rbs.yaml")) ? parseYaml(readFileSync(join(a.o, "rbs.yaml"), "utf8"), "rbs") : {};
ok(rbs.variant === "composed" && JSON.stringify(rbs.base) === JSON.stringify(GARDEN.base) && JSON.stringify(rbs.correspondences) === JSON.stringify(GARDEN.correspondences)
  && Array.isArray(rbs.bindings) && rbs.bindings.length === 2 && rbs.bindings[0].move === MOVE && rbs.bindings[1].move === INFER
  && rbs.bindings.every((x) => x.paragraph_waypoints.length > 0) && !Object.hasOwn(rbs, "pairs") && !Object.hasOwn(rbs, "placeholder"),
  `(a) rbs.yaml is not variant composed with base.domain, the correspondences and the two bindings: ${JSON.stringify(rbs)}`);
ok(rec.bind && rec.bind.author === "smp_bind_move" && rec.bind.base_move === MOVE && rec.bind.inference_move === INFER && rec.bind.move === MOVE && fileOk(rec.bind),
  `(a) trial.json's bind does not carry the bound Moves and its file: ${JSON.stringify(rec.bind)}`);
ok(rec.paragraph && fileOk(rec.paragraph) && readFileSync(join(repo, rec.paragraph.path), "utf8").startsWith("WRITTEN"),
  "(a) trial.json's paragraph does not name paragraph.md with its sha256");
ok(rec.sheet && existsSync(join(repo, rec.sheet)), "(a) trial.json names no sheet that exists");
ok(rec.reading && readFileSync(join(repo, rec.reading), "utf8") === `# Reading of Trial ${rec.trial}\n`, "(a) reading.md is not empty under its header");
ok(rec.stages && rec.stages.every((s) => s.calls === null || existsSync(join(repo, s.calls))), "(a) a stage names a calls.jsonl that does not exist");
const inputOf = (stdin, key) => { const at = stdin.lastIndexOf(`"${key}"`); try { return JSON.parse(stdin.slice(stdin.lastIndexOf("{", at))); } catch { return null; } };
const aWp = a.calls("waypoints");
const aIn = aWp.length === 1 ? inputOf(aWp[0].stdin, "leg_you_must_plan") : null;
const aLeg = aIn && aIn.leg_you_must_plan;
ok(aLeg && aLeg.waypoints.length === 2 && aLeg.waypoints[1].point === PROPOSITION && aLeg.waypoints[0].next_point === PROPOSITION
  && aLeg.waypoints[0].move === MOVE && aLeg.waypoints[1].move === INFER
  && JSON.stringify(aIn.correspondences) === JSON.stringify(GARDEN.correspondences)
  && JSON.stringify(aIn.paragraph_moves_you_may_bind.map((m) => m.id)) === JSON.stringify([MOVE, INFER]),
  `(a) the waypoints call's stdin does not carry two Leg Waypoints with their bound Moves, the second's point the proposition, and the correspondences: ${JSON.stringify(aLeg && aLeg.waypoints)}`);
const aBindIn = a.calls("bind").length ? inputOf(a.calls("bind")[0].stdin, "structure") : null;
const aMoveIn = aBindIn && (aBindIn.moves || []).find((m) => m.id === MOVE);
ok(aBindIn && aBindIn.persona && aBindIn.persona.prior_knowledge && aMoveIn && typeof aMoveIn.description === "string"
  && JSON.stringify(Object.keys(aMoveIn)) === JSON.stringify(["id", "description", "segments", "takes", "leaves"]) && aMoveIn.leaves[0].kind === "carry",
  `(a) the bind call's stdin does not carry the structure, the Persona's line and each Move as { id, description, segments, takes, leaves }: ${JSON.stringify(aMoveIn)}`);
const aBindYaml = existsSync(join(a.o, "bind.yaml")) ? parseYaml(readFileSync(join(a.o, "bind.yaml"), "utf8"), "bind") : {};
ok(Array.isArray(aBindYaml.paragraphs) && aBindYaml.paragraphs.length === 2 && JSON.stringify(rec.bind.paragraphs) === JSON.stringify(aBindYaml.paragraphs)
  && aBindYaml.paragraphs.every((e) => typeof e.move === "string" && e.binding_rationale === RATIONALE && e.paragraph_waypoints.length > 0),
  `(a) bind.yaml's paragraphs is not two entries of { move, binding_rationale, paragraph_waypoints }: ${JSON.stringify(aBindYaml.paragraphs)}`);
// a base Move leaving no carry: one paragraph, one Leg Waypoint, one binding
const a1 = run("composed-alone", ["--structure", structure, "--compose"], { SMP_BIND_ANSWERS: answers("bind-alone", [ALONE]) });
const a1Leg = a1.calls("waypoints").length ? (inputOf(a1.calls("waypoints")[0].stdin, "leg_you_must_plan") || {}).leg_you_must_plan : null;
const a1Rbs = existsSync(join(a1.o, "rbs.yaml")) ? parseYaml(readFileSync(join(a1.o, "rbs.yaml"), "utf8"), "rbs") : {};
const a1Sheet = existsSync(join(a1.o, "sheet.html")) ? readFileSync(join(a1.o, "sheet.html"), "utf8") : "";
ok(a1.res.status === 0 && stagesOf(a1.rec) === STAGES && a1Leg && a1Leg.waypoints.length === 1 && a1Leg.waypoints[0].move === PLAIN
  && a1.rec.bind.inference_move === null && a1.rec.bind.paragraphs.length === 1 && (a1Rbs.bindings || []).length === 1
  && (a1Sheet.match(/<caption>Paragraph \d+ /g) || []).length === 1 && (a1Sheet.match(/<caption>Binding \d+<\/caption>/g) || []).length === 1,
  `(a) a base Move leaving no carry did not write one paragraph, one Leg Waypoint and one binding: ${a1.res.status} ${stagesOf(a1.rec)} ${JSON.stringify(a1Leg && a1Leg.waypoints)} ${a1.res.stderr}`);

// (e) the writer's stdin is the Packet; its first numbered line is the structure in the Correspondence expressions
const w = a.calls("write");
const packet = existsSync(join(a.o, "write", "packet.md")) ? readFileSync(join(a.o, "write", "packet.md"), "utf8") : null;
ok(packet !== null && w.length === 1 && w[0].stdin === packet, "(e) the writer's recorded stdin is not the Packet byte for byte");
const pLines = (packet || "").split("\n");
const castAt = pLines.findIndex((l) => l.includes("PW-1-1 the gardener and the planting chart and a flower bed hold together."));
ok(castAt !== -1 && pLines[castAt + 1] === "      *Cast:* terse" && pLines.filter((l) => l.includes("*Cast:*")).length === 1,
  `(e) the Packet does not carry \`*Cast:* terse\` beneath the first Paragraph Waypoint alone: ${JSON.stringify(pLines.slice(castAt, castAt + 2))}`);
const aTop = pLines.find((l) => /^1\. .* \*Serves:\* /.test(l)) || "";
const byBase = new Map(GARDEN.correspondences.map((c) => [c.role, c.expression]));
const WANT = pointOf([...mapped.relations.map((x) => x.holds), mapped.higher_order.holds], (id) => byBase.get(id));
ok(aTop === `1. ${WANT} *Serves:* ${PROPOSITION}` && !ROLE_IDS.some((id) => new RegExp(`\\b${id}\\b`, "i").test(aTop.split(" *Serves:* ")[0])),
  `(e) the Packet's first numbered line is not the holds with the Correspondence expressions substituted and no Role id: ${JSON.stringify(aTop)}`);

// (b) the Mapper route
writeFileSync(join(root, "answer.json"), JSON.stringify(mapped));
const b = run("mapped", ["--mapper", "sme_map_roles", "--compose"], { SMP_MAPPER_ANSWER: join(root, "answer.json") });
const bCalls = ["sme", "bind", "correspondence", "waypoints", "write"].flatMap((st) => b.calls(st));
ok(b.res.status === 0 && stagesOf(b.rec) === `sme:done,${STAGES}` && bCalls.length === 5
  && b.rec.structure.author === "sme" && b.rec.mapper.variant === "sme_map_roles",
  `(b) the --mapper run did not record five calls with structure.author: sme: ${b.res.status} ${stagesOf(b.rec)} ${bCalls.length} ${b.res.stderr}`);

// (c) `--rbs` is retired, and a Trial's route is exactly one of `--compose` and `--rbs-file`
const c = run("retired-rbs", ["--structure", structure, "--rbs", "rbs_base"]);
ok(c.res.status !== 0 && c.res.stderr.includes("`--rbs`") && c.res.stderr.includes("`--compose`") && c.res.stderr.includes("`--rbs-file`") && !existsSync(c.o),
  `(c) --rbs was not refused naming --compose and --rbs-file: ${c.res.status} ${c.res.stderr}`);
const c2 = run("no-route", ["--mapper", "sme_map_roles"]);
ok(c2.res.status !== 0 && c2.res.stderr.includes("neither `--compose` nor `--rbs-file`") && !existsSync(c2.o),
  `(c) a run with neither --compose nor --rbs-file was not refused naming both: ${c2.res.status} ${c2.res.stderr}`);

// (d) the smp_bind_move row's refusals by name, its retry and its stop
const { moves: CONTRACTS } = (await import(pathToFileURL(join(repo, "src/compose.mjs")).href)).loadMoveContracts(library);
const byMove = new Map(CONTRACTS.map((m) => [m.id, m]));
const d1 = bindMoveRefusal({ ...CARRYING, base_move: "no_such_move" }, byMove);
ok(d1 && d1.startsWith('base_move "no_such_move" names no Move'), `(d) an unknown base_move was not refused naming it: ${d1}`);
const d2 = bindMoveRefusal({ ...CARRYING, inference_move: null }, byMove);
ok(d2 && d2.startsWith("inference_move is null") && d2.includes(`carry: ${CARRY_WHAT}`), `(d) a null inference_move under a carry was not refused naming the entry: ${d2}`);
const d3 = bindMoveRefusal({ ...ALONE, inference_move: INFER }, byMove);
ok(d3 && d3.startsWith("inference_move is given") && d3.includes(PLAIN), `(d) an inference_move under no carry was not refused: ${d3}`);
const d4 = bindMoveRefusal({ ...CARRYING, inference_move: PLAIN }, byMove);
ok(d4 && d4.includes(`the inference Move "${PLAIN}" takes no \`carry\``), `(d) an inference Move taking no carry was not refused naming it: ${d4}`);
const d5 = bindMoveRefusal({ ...CARRYING, inference_move: "no_such_move" }, byMove);
ok(d5 && d5.startsWith('inference_move "no_such_move" names no Move'), `(d) an unknown inference_move was not refused naming it: ${d5}`);
ok(bindMoveRefusal(CARRYING, byMove) === null && bindMoveRefusal(ALONE, byMove) === null, "(d) a well-formed bind answer was refused");
const d = run("bind-retry", ["--structure", structure, "--compose"], { SMP_BIND_ANSWERS: answers("bind-retry", [{ ...CARRYING, inference_move: null }, CARRYING]) });
const dCalls = d.calls("bind");
ok(d.res.status === 0 && dCalls.length === 2 && dCalls[1].stdin.includes("inference_move is null") && !dCalls[0].stdin.includes("inference_move is null")
  && [1, 2].every((n) => existsSync(join(d.o, "bind", `prompt-${n}.md`)) && existsSync(join(d.o, "bind", `answer-${n}.json`))),
  `(d) a first refused bind answer did not reach the second attempt's stdin: ${d.res.status} ${dCalls.length} ${d.res.stderr}`);
const dStop = run("bind-stop", ["--structure", structure, "--compose"], { SMP_BIND_ANSWERS: answers("bind-stop", [{ ...CARRYING, base_move: "no_such_move" }]) });
ok(dStop.res.status !== 0 && stagesOf(dStop.rec) === "bind:stopped,correspondence:not run,waypoints:not run,write:not run" && dStop.calls("bind").length === 2
  && /^bind: /.test(String(dStop.rec.stopped)) && String(dStop.rec.stopped).includes('base_move "no_such_move"')
  && !existsSync(join(dStop.o, "rbs.yaml")) && existsSync(join(dStop.o, "sheet.html")),
  `(d) a second refused bind answer did not stop the Trial at bind: ${dStop.res.status} ${stagesOf(dStop.rec)} ${JSON.stringify(dStop.rec && dStop.rec.stopped)}`);
const dSheet = existsSync(join(dStop.o, "sheet.html")) ? readFileSync(join(dStop.o, "sheet.html"), "utf8") : "";
const dParagraph = (/<section class="card" id="proposition-paragraph">([\s\S]*?)<\/section>/.exec(dSheet) || [])[1] || "";
ok(dStop.rec && dParagraph.includes(`stopped — ${dStop.rec.stopped}`.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")),
  `(d) the stopped Trial's Proposition and Paragraph part does not carry the stop reason: ${dParagraph}`);
const dWrong = run("waypoints-wrong-move", ["--structure", structure, "--compose"], { SMP_WRONG_MOVE: PLAIN });
ok(dWrong.res.status !== 0 && stagesOf(dWrong.rec) === "bind:done,correspondence:done,waypoints:stopped,write:not run"
  && String(dWrong.rec.stopped).startsWith(`waypoints: Waypoint 1: the answer binds "${PLAIN}", and the Move bound to it at \`bind\` is "${MOVE}"`),
  `(d) a waypoints answer binding another Move was not refused naming the Waypoint: ${dWrong.res.status} ${stagesOf(dWrong.rec)} ${JSON.stringify(dWrong.rec && dWrong.rec.stopped)}`);
const dDrop = run("waypoints-drop-role", ["--structure", structure, "--compose"], { SMP_DROP_ROLE: "list" });
ok(dDrop.res.status !== 0 && stagesOf(dDrop.rec) === "bind:done,correspondence:done,waypoints:stopped,write:not run"
  && String(dDrop.rec.stopped).includes('the Correspondence expression of the Role "list"') && !existsSync(join(dDrop.o, "paragraph.md")),
  `(d) a Base Paragraph whose points carry no expression of one Role was not refused naming the Role: ${dDrop.res.status} ${stagesOf(dDrop.rec)} ${JSON.stringify(dDrop.rec && dDrop.rec.stopped)}`);
const dId = correspondenceVocabularyRefusal([{ point: "The gardener and a flower bed follow the planting chart." }, { point: "The crew goes on." }], GARDEN);
ok(dId && dId.includes('point 2 carries the Role id "crew"'), `(d) a Base Paragraph point carrying a Role id was not refused naming the point: ${dId}`);
ok(correspondenceVocabularyRefusal([{ performs: "asks the reader" }, { point: "The gardener tends a flower bed by the planting chart." }], GARDEN) === null,
  "(d) Base Paragraph points carrying every expression and no Role id were refused");

// (g) an expression sharing a word with the proposition is accepted (kogaki#1707); the Role rules hold on every table
const BASES = { base: { domain: "a garden" }, correspondences: [{ role: "crew", expression: "the gardener" }, { role: "list", expression: "the chart the walker keeps" }, { role: "room", expression: "a bed" }] };
const gv = (t) => validateRbsTable(t, PROPOSITION, { structure: mapped });
const g = gv(BASES);
ok(!g.error, `(g) an expression carrying "walker" was refused: ${JSON.stringify(g)}`);
const gRole = validateRbsTable({ base: { domain: "a garden" }, correspondences: [{ role: "The walker sees a room.", expression: "a bed" }] }, PROPOSITION);
ok(!gRole.error, `(g) a role carrying "walker" was refused with no structure given: ${JSON.stringify(gRole)}`);
const GUARD = "A set of automatic rules only sees the kinds of action it was registered against.";
const GUARD_TABLE = { base: { domain: "a household alarm panel and the door and window openings it has been set to sound on" },
  correspondences: [{ role: "watcher", expression: "the sensors wired to the household alarm panel" },
    { role: "list", expression: "the openings the panel has been set to sound on" }, { role: "happening", expression: "a back door being opened" }] };
const gGuard = validateRbsTable(GUARD_TABLE, GUARD);
ok(!gGuard.error, `(g) "the openings the panel has been set to sound on" was refused against the guard-reach proposition: ${JSON.stringify(gGuard)}`);
const gVocab = correspondenceVocabularyRefusal([{ point: "The sensors wired to the household alarm panel cover the openings the panel has been set to sound on." }], GUARD_TABLE);
ok(gVocab && gVocab.includes('the Correspondence expression of the Role "happening"'),
  `(g) Base Paragraph points carrying no expression of the Role "happening" were not refused naming it: ${gVocab}`);
const gNull = gv({ ...BASES, correspondences: BASES.correspondences.map((c, i) => (i === 0 ? { ...c, expression: null } : { ...c, expression: "a bed" })) });
ok(gNull.error && gNull.error.startsWith("correspondences[0].expression "),
  `(g) a null expression was not refused naming correspondences[0].expression: ${JSON.stringify(gNull)}`);
const PLACE = GARDEN;
ok(!gv(PLACE).error, `(g) a table giving every Role one expression was refused: ${JSON.stringify(gv(PLACE))}`);
ok(gv({ ...PLACE, placeholder: true, correspondences: PLACE.correspondences.map((x) => ({ ...x, expression: null })) }).error,
  "(g) a table declaring itself a placeholder passed a null expression");
const gStray = gv({ ...PLACE, correspondences: [...PLACE.correspondences.slice(0, 2), { role: "porch", expression: "a porch" }] });
ok(gStray.error && gStray.error.startsWith('correspondences[2].role "porch" names no Role'),
  `(g) a correspondence naming no Role was not refused naming the id: ${JSON.stringify(gStray)}`);
const gTwice = gv({ ...PLACE, correspondences: [...PLACE.correspondences, { role: "crew", expression: "a hoe" }] });
ok(gTwice.error && gTwice.error.includes('the Role "crew" has 2 correspondences'), `(g) a Role with two correspondences was not refused naming the Role: ${JSON.stringify(gTwice)}`);
const gMissing = gv({ ...PLACE, correspondences: PLACE.correspondences.slice(1) });
ok(gMissing.error && gMissing.error.includes('the Role "crew" has 0 correspondences'), `(g) a Role with no correspondence was not refused naming the Role: ${JSON.stringify(gMissing)}`);
const gFile = join(root, "rbs-walker.yaml");
writeFileSync(gFile, stringifyYaml(BASES));
const gRun = run("owner-walker", ["--structure", structure, "--rbs-file", gFile]);
ok(gRun.res.status !== 0 && gRun.res.stderr.includes("`projection`") && !gRun.res.stderr.includes("walker") && !existsSync(gRun.o),
  `(g) the owner's file with an expression carrying "walker" was refused on the word rather than for its missing projection: ${gRun.res.status} ${gRun.res.stderr}`);
const gClaimed = join(root, "rbs-null-expression.yaml");
writeFileSync(gClaimed, stringifyYaml({ ...PLACE, placeholder: true, correspondences: PLACE.correspondences.map((x) => ({ ...x, expression: null })) }));
const gcRun = run("owner-null-expression", ["--structure", structure, "--rbs-file", gClaimed]);
ok(gcRun.res.status !== 0 && gcRun.res.stderr.includes("correspondences[0].expression ") && !existsSync(gcRun.o),
  `(g) an owner's file with a null expression was not refused: ${gcRun.res.status} ${gcRun.res.stderr}`);

// (j) the owner-authored table with a supplied binding: one writer call, no binding call
const SEGMENTS = moveContract(MOVE, resolve(repo, library)).segments.length;
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
const jCalls = ["bind", "correspondence", "waypoints", "write"].flatMap((st) => j.calls(st));
ok(j.res.status === 0 && stagesOf(j.rec) === STAGES && jCalls.length === 1 && j.seen.length === 1
  && j.rec.bind.state === "supplied" && j.rec.bind.author === "owner" && j.rec.bind.move === MOVE
  && j.rec.rbs.variant === "owner-authored" && fileOk(j.rec.rbs) && j.rec.rbs.source && j.rec.rbs.source.sha256 === sha(ownedFile),
  `(j) the --rbs-file run did not make one call with bind.state supplied: ${j.res.status} ${stagesOf(j.rec)} ${jCalls.length} ${JSON.stringify(j.rec && j.rec.bind)} ${j.res.stderr}`);
const jPacket = existsSync(join(j.o, "write", "packet.md")) ? readFileSync(join(j.o, "write", "packet.md"), "utf8") : "";
ok(jPacket.includes("OWNED-1 the crew") && jPacket.includes(`OWNED-${SEGMENTS} the crew`), "(j) the Packet does not carry the supplied points as its Paragraph Waypoints");
const jNo = run("owned-unprojected", ["--structure", wide, "--rbs-file", unprojectedFile]);
ok(jNo.res.status !== 0 && jNo.res.stderr.includes("`projection`") && jNo.seen.length === 0 && !existsSync(jNo.o),
  `(j) an owner's file without projection was not refused naming projection: ${jNo.res.status} ${jNo.res.stderr}`);

// (k) --rbs-file with --compose is refused naming both flags
const k = run("both-routes", ["--structure", structure, "--compose", "--rbs-file", ownedFile]);
ok(k.res.status !== 0 && k.res.stderr.includes("`--compose` and `--rbs-file` are given together") && !existsSync(k.o),
  `(k) --compose with --rbs-file was not refused naming both: ${k.res.status} ${k.res.stderr}`);

// (l) each bad field of the table is refused naming it
const lv = (edit) => validateRbsTable({ ...owned, ...edit }, PROPOSITION, { movesDir: resolve(repo, library) });
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
ok(!l4.error, `(l) a supplied point carrying a claim word was refused: ${JSON.stringify(l4)}`);

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
const m4 = validateStructure(withRole(1, { ...mapped.roles[1], context: "The rules a household keeps about which doors stay locked." }), propositionRec);
ok(!m4.error, `(m) a context carrying "rules" was refused: ${JSON.stringify(m4)}`);

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
const segs = moveContract(MOVE, resolve(repo, library)).segments;
const segTables = [...section(jSheet, "segments").matchAll(/<table><caption>Paragraph \d+ [\s\S]*?<\/table>/g)].map((x) => x[0]);
const segRows = [...(segTables[0] || "").matchAll(/<tr><td>(\d+)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)];
ok(segRows.length === segs.length && segs.every((sg, n) => segRows[n][1] === String(n + 1) && segRows[n][2] === esc(sg.operation)
  && segRows[n][3] === esc(sg.relation || "") && segRows[n][4] === esc(sg.manner || "") && segRows[n][5] === esc(owned.waypoints[n].point)),
  `(f) the Segments table is not one row per Segment with its operation, relation, manner and point: ${segRows.length} rows for ${segs.length} segments`);
ok(!sheet.includes("serves L") && !jSheet.includes("serves L"), "(f) a sheet still carries `serves L`");
ok(section(sheet, "segments").includes('<td>PW-1-1 the gardener and the planting chart and a flower bed hold together. <span class="meta">terse</span></td>')
  && (section(sheet, "segments").match(/class="meta">terse</g) || []).length === 1,
  "(f) the Segments table's point cell of the Paragraph Waypoint whose cast sets `terse` does not carry it in a meta span, alone (kogaki#1695)");
const tableOf = (html, caption) => [...html.matchAll(new RegExp(`<table><caption>${caption}</caption>([\\s\\S]*?)</table>`, "g"))].map((x) => x[1]);
const rowOf = (table, label) => (new RegExp(`<th rowspan="\\d+">${label}</th>([\\s\\S]*?)(?=<tr><th |</tbody>)`).exec(table) || [])[1] || "";
const labelsOf = (table) => [...table.matchAll(/<th rowspan="\d+">([\s\S]*?)<\/th>/g)].map((x) => x[1]);
// THE MOVE'S CONSTRAINTS (kogaki#1699): the Binding table renders the Move's `takes` and `leaves`, one
// `kind: what` cell per entry, "none" for an empty list; its `before` and `after` are retired.
const MC = moveContract(MOVE, resolve(repo, library));
const listCells = (xs) => ((xs || []).length ? xs.map((x) => `<td>${esc(`${x.kind}: ${x.what}`)}</td>`) : ["<td>none</td>"]);
const TAKES = listCells(MC.takes), LEAVES = listCells(MC.leaves);
ok(section(jSheet, "segments").includes(`<caption>Paragraph 1 <span class="meta">${MOVE}</span></caption>`) && !section(jSheet, "segments").includes("<caption>Binding"),
  "(f) the Segments table is not captioned `Paragraph 1` with its Move, or a Binding table remains inside Segments");
const [jBinding] = tableOf(section(jSheet, "bindings"), "Binding 1");
const LABELS = ["Move", "Bound by", "Takes", "Leaves", "Rationale"];
ok(jBinding && JSON.stringify(labelsOf(jBinding)) === JSON.stringify(LABELS)
  && rowOf(jBinding, "Move").includes(`<td>${MOVE}</td>`) && rowOf(jBinding, "Bound by").includes("<td>owner</td>")
  && TAKES.every((c) => rowOf(jBinding, "Takes").includes(c)) && LEAVES.every((c) => rowOf(jBinding, "Leaves").includes(c))
  && !/<th rowspan="\d+">(Before|After)<\/th>/.test(jBinding),
  `(f) the Binding table is not the five labelled rows with the Move's takes and leaves (kogaki#1699): ${jBinding}`);
const [aBinding] = tableOf(section(sheet, "bindings"), "Binding 1");
const segCaps = (html) => [...section(html, "segments").matchAll(/<caption>(Paragraph \d+) /g)].map((x) => x[1]);
ok(JSON.stringify(segCaps(sheet)) === JSON.stringify(["Paragraph 1", "Paragraph 2"]) && tableOf(section(sheet, "bindings"), "Binding \\d+").length === 2,
  `(a) the model route's sheet does not carry two Segments tables and two Binding tables: ${JSON.stringify(segCaps(sheet))}`);
const aBinding2 = tableOf(section(sheet, "bindings"), "Binding 2")[0] || "";
ok(aBinding && rowOf(aBinding, "Bound by").includes("<td>smp_bind_move</td>") && rowOf(aBinding, "Rationale").includes(`<td>${esc(RATIONALE)}</td>`),
  `(f) the composed route's Binding table does not carry its row name and the bind call's rationale: ${aBinding}`);
ok(aBinding && JSON.stringify(labelsOf(aBinding)) === JSON.stringify(LABELS) && rowOf(aBinding, "Takes") === "<td>none</td></tr>"
  && rowOf(aBinding, "Leaves") === `<td>${esc(`carry: ${CARRY_WHAT}`)}</td></tr>` && rowOf(aBinding2, "Takes") === `<td>${esc(`carry: ${INFER_TAKES}`)}</td></tr>`
  && rowOf(aBinding2, "Leaves") === "<td>none</td></tr>",
  `(f) the Binding tables do not carry Takes and Leaves, one sub-row per entry as <kind>: <what>: ${rowOf(aBinding || "", "Takes")} / ${rowOf(aBinding || "", "Leaves")}`);
ok(![...section(jSheet, "segments").matchAll(/<caption>([\s\S]*?)<\/caption>/g)].some((x) => x[1].includes("—")),
  "(f) a — caption line still precedes a Segments table");
const HEADS = ["Abstract", "Attribute", "Correspondence"];
const ths = [...section(jSheet, "mapping").matchAll(/<th>([\s\S]*?)<\/th>/g)].map((x) => x[1]);
ok(JSON.stringify(ths) === JSON.stringify(HEADS) && section(jSheet, "mapping").startsWith(`<h2>Mapping</h2><p class="meta">Base: ${esc(owned.base.domain)}</p><table>`),
  `(f) the Mapping part is not the Base line above a table headed Abstract, Attribute and Correspondence: ${JSON.stringify(ths)}`);
const pHeads = [...section(sheet, "mapping").matchAll(/<th>([\s\S]*?)<\/th>/g)].map((x) => x[1]);
ok(JSON.stringify(pHeads) === JSON.stringify(HEADS) && section(sheet, "mapping").includes(`<p class="meta">Base: ${esc(GARDEN.base.domain)}</p>`)
  && section(sheet, "mapping").includes("<caption>composed</caption>"),
  `(f) the composed route's Mapping part is not its Base line above the three fixed headers, captioned composed: ${JSON.stringify(pHeads)}`);
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
ok(sheet.includes(String(rec.bind && rec.bind.move)) && sheet.includes(INFER) && sheet.includes("WRITTEN the crew") && sheet.includes(PROPOSITION), "(f) sheet.html does not carry the Moves, the paragraph and the proposition");

const jBind = existsSync(join(j.o, "bind.yaml")) ? parseYaml(readFileSync(join(j.o, "bind.yaml"), "utf8"), "bind") : {};
const rationaleRow = rowOf(jBinding || "", "Rationale");
ok(jBind.binding_rationale === owned.binding_rationale && j.rec.bind.binding_rationale === owned.binding_rationale
  && rationaleRow === `<td>${esc(owned.binding_rationale)}</td></tr>` && !Object.hasOwn(jBind, "grounds"),
  `(n) the supplied binding_rationale did not reach bind.yaml, the record and the Rationale row of Binding 1: ${JSON.stringify(jBind)} / ${rationaleRow}`);
const aBind = existsSync(join(a.o, "bind.yaml")) ? parseYaml(readFileSync(join(a.o, "bind.yaml"), "utf8"), "bind") : {};
ok(aBind.binding_rationale === RATIONALE && rec.bind.binding_rationale === RATIONALE,
  `(n) the composed route's bind.yaml does not carry the bind call's rationale: ${JSON.stringify(aBind)}`);
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
  const oCalls = ["bind", "correspondence", "waypoints", "write"].flatMap((st) => o.calls(st));
  ok(o.res.status === 0 && stagesOf(o.rec) === STAGES && oCalls.length === 1 && o.seen.length === 1,
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
    && oBindings.every((t) => JSON.stringify(labelsOf(t)) === JSON.stringify(LABELS))
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
ok(!validateRbsTable({ ...owned, projection: [PROJ] }, PROPOSITION, { movesDir: resolve(repo, library) }).error, "(p) a projecting point carrying a claim word was refused");

// (q) a projecting binding's fields are refused naming its index
const qv = (projection, base = owned) => validateRbsTable({ ...base, projection }, PROPOSITION, { movesDir: resolve(repo, library) });
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
ok(r.res.status !== 0 && stagesOf(r.rec) === "bind:done,correspondence:done,waypoints:done,write:stopped" && /^write: /.test(String(r.rec.stopped))
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
  const res = spawnSync(process.execPath, ["src/mapping-playground/short.mjs", "run", "--library", library, "--proposition", f, "--structure", structure, "--compose", "--out", o, ...args],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, SMP_FIXTURE_DIR: root, ...DEFAULT_ENV } });
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
const t3 = run("strand-flag", ["--strand", proposition, "--structure", structure, "--compose"]);
ok(t3.res.status !== 0 && t3.res.stderr.includes("`--strand`") && t3.res.stderr.includes("`--proposition <file>`") && !existsSync(t3.o),
  `(t) --strand was not refused naming --proposition: ${t3.res.status} ${t3.res.stderr}`);
const smeStdin = b.calls("sme").map((x) => x.stdin).join("\n");
ok(smeStdin.includes(`"proposition": ${JSON.stringify(PROPOSITION)}`) && !smeStdin.includes('"rendering"') && !smeStdin.includes("`rendering`"),
  `(t) the Mapper's recorded stdin does not carry the proposition alone: ${smeStdin.slice(0, 400)}`);

// (u) the smp_correspondence row: under the bound base Move's Segments, validated as the owner's file is, under one retry
const NULLED = { ...GARDEN, correspondences: GARDEN.correspondences.map((x, i) => (i === 0 ? { ...x, expression: null } : x)) };
const uIn = a.calls("correspondence").length ? inputOf(a.calls("correspondence")[0].stdin, "structure") : null;
ok(uIn && uIn.persona && uIn.persona.prior_knowledge && uIn.structure && JSON.stringify(uIn.segments.map((x) => x.operation)) === JSON.stringify(segs.map((x) => String(x.operation).trim()))
  && JSON.stringify(Object.keys(uIn)) === JSON.stringify(["structure", "persona", "segments"]) && !a.calls("correspondence")[0].stdin.includes('"kinds"'),
  "(u) the correspondence call's stdin does not carry the structure, the prior-knowledge line and the base Move's segments, or carries kinds");
const u2 = run("corr-retry", ["--structure", structure, "--compose"], { SMP_CORR_ANSWERS: answers("corr-retry", [NULLED, GARDEN]) });
const u2Calls = u2.calls("correspondence");
ok(u2.res.status === 0 && u2Calls.length === 2
  && u2Calls[1].stdin.includes("correspondences[0].expression is not one base text") && !u2Calls[0].stdin.includes("correspondences[0].expression is not"),
  `(u) a first answer with a null expression was not refused into the second attempt's stdin: ${u2.res.status} ${u2Calls.length} ${u2.res.stderr}`);
ok([1, 2].every((n) => existsSync(join(u2.o, "correspondence", `prompt-${n}.md`)) && existsSync(join(u2.o, "correspondence", `answer-${n}.json`)))
  && JSON.parse(readFileSync(join(u2.o, "correspondence", "answer-1.json"), "utf8")).correspondences[0].expression === null,
  "(u) the retried correspondence stage does not keep each attempt's prompt and answer");
const u3 = run("corr-stop", ["--structure", structure, "--compose"], { SMP_CORR_ANSWERS: answers("corr-stop", [NULLED]) });
ok(u3.res.status !== 0 && stagesOf(u3.rec) === "bind:done,correspondence:stopped,waypoints:not run,write:not run" && u3.calls("correspondence").length === 2
  && /^correspondence: /.test(String(u3.rec.stopped)) && String(u3.rec.stopped).includes("correspondences[0].expression is not one base text") && !existsSync(join(u3.o, "rbs.yaml")),
  `(u) a second refusal did not stop the Trial at correspondence: ${u3.res.status} ${stagesOf(u3.rec)} ${JSON.stringify(u3.rec && u3.rec.stopped)}`);

// (h) nothing under the repository's moves/ or theses/ changed
ok(snapshot() === before, "(h) the run changed the repository's moves/ or theses/");

// (i) the full-pipeline Trial's check still passes
const i = spawnSync("bash", ["checks/check-mapping-playground.sh"], { encoding: "utf8", timeout: 600000 });
ok(i.status === 0, `(i) checks/check-mapping-playground.sh failed: ${i.stdout}${i.stderr}`);

rmSync(root, { recursive: true, force: true });
if (!fails.length) rmSync(outDir, { recursive: true, force: true });
rmSync(library, { recursive: true, force: true });
if (fails.length) { for (const f of fails) console.log(`FAIL: ${f}`); console.log(`kept: ${outDir}`); process.exit(1); }
console.log("check-mapping-playground-short: ok");
JS
