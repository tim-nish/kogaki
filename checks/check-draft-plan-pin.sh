#!/usr/bin/env bash
# check-draft-plan-pin — a Packet is a rendering of the ParagraphPlan at a hash (kogaki#1645).
# Driven through `node src/draft.mjs resolve|section|emit` over a fixture Brief, its plan
# and a stub writer (`KOGAKI_JUDGE_CLI`): (a) run.json names the plan and each Packet entry
# its plan_sha256, and the Draft carries plan_pin and each trace row plan_sha; (b) an
# unchanged plan carries the Packets, renders nothing and refuses nothing; (c) with every
# Leg realized and the plan rewritten under the same Brief, `section --leg G1` before
# `resolve` is refused naming both hashes; (d) `resolve` then says the plan moved, drops the
# carried entries and renders G1's Packet, `section` renders the next Leg's, and the emitted
# Draft is written from the new plan alone; (e) an entry without plan_sha256 is refused as
# unrecorded; (f) a plan's Mapping Record digest rides into run.json and each Packet entry, and
# an edited, added or removed record file is refused naming it; (g) `sheet.mjs leg` renders it.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, existsSync, chmodSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const fails = [];
const repo = resolve(".");
const { legRecord, briefRecordText, readerStateMap, paragraphPlanRecord, paragraphPlanRecordText, writeMappingRecord } =
  await import(pathToFileURL(join(repo, "src", "compose.mjs")).href);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const root = mkdtempSync(join(tmpdir(), "draft-plan-pin-"));

// The stub writer answers with the plan marker the Packet carries, so the Draft says which plan.
const writer = join(root, "stub-writer.mjs");
writeFileSync(writer, `#!/usr/bin/env node
if (process.argv.includes("--version")) { console.log("stub-writer 1.0"); process.exit(0); }
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const m = Buffer.concat(c).toString("utf8").match(/PLANMARK-(\\w+)/);
  process.stdout.write("This paragraph was written from planmark " + (m ? m[1] : "missing") + ".\\n");
});
`);
chmodSync(writer, 0o755);

// A Leg says its relation's `holds` as its `text` and carries no Brief Waypoint (kogaki#1775).
const leg = (id) => ({ leg_id: id, text: `The relation ${id} says holds.`,
  claims: [{ strand: "L1", proposition: `the claim ${id} carries.` }] });
const legs = [leg("G1"), leg("G2")];
const briefText = briefRecordText({
  slug: "plan-pin", compose_path: "audiences/dev-to-zenn.md",
  strands: [{ id: "L1", slug: "first-strand", cite: `coding::lesson/first-strand@${"0".repeat(64)}` }],
  thesis: "The fixture claim.", reader_path: legs.map(legRecord),
  strand_coverage: [], journey_coverage: [], tradeoffs: {}, bridged: {},
});
const dir = join(root, "theses", "plan-pin");
mkdirSync(dir, { recursive: true });
const briefPath = join(dir, "brief.yaml");
writeFileSync(briefPath, briefText);
const planPath = join(dir, "paragraph-plan.yaml");
// The Leg binds one Move for its paragraphs (kogaki#1777).
const MOVE = "answer_a_posed_question_then_win_two_easy_assents_before_ranking_the_distinction_first";
const entry = (id) => ({ materials: ["L1"], purpose: `purpose of ${id}'s paragraph.`,
  depends_on: [], rationale: `rationale for ${id}'s paragraph.`, introduces: [], "re-activate": [] });
const planText = (mark, mapping = null) => paragraphPlanRecordText(paragraphPlanRecord({ briefPath, briefText, mapping,
  legs: legs.map((l) => ({ leg_id: l.leg_id, move: MOVE, paragraphs: [{ ...entry(l.leg_id),
    paragraph_waypoints: [{ point: `PLANMARK-${mark} the paragraph ${l.leg_id} plans.`, serves: ["L1"], cast: {} }] }] })) }));

const wsRoot = join(root, "ws");
const ws = join(wsRoot, "plan-pin");
const env = { ...process.env, KOGAKI_JUDGE_CLI: writer };
const draft = (...a) => spawnSync(process.execPath, ["src/draft.mjs", ...a, "--brief", briefPath, "--workspace", wsRoot],
  { encoding: "utf8", env, timeout: 120000 });
const said = (r) => `${r.stdout || ""}${r.stderr || ""}`.slice(0, 600);
const runJson = () => JSON.parse(readFileSync(join(ws, "run.json"), "utf8"));
const packet = (id) => readFileSync(join(ws, "packets", `${id}.md`), "utf8");
const draftText = () => readFileSync(join(dir, "draft.md"), "utf8");
const traceRows = (t) => t.split("\n").filter((l) => l.startsWith("  - {\"leg_id\"")).map((l) => JSON.parse(l.slice(4)));
const ok = (label, r) => { if (r.status !== 0) fails.push(`${label} exited ${r.status}: ${said(r)}`); return r.status === 0; };

// (a) a first run over plan alpha records the plan everywhere it is owed.
const alpha = planText("alpha");
writeFileSync(planPath, alpha);
const A = sha(alpha);
if (ok("(a) resolve", draft("resolve")) && ok("(a) section G1", draft("section", "--leg", "G1"))
  && ok("(a) section G2", draft("section", "--leg", "G2")) && ok("(a) emit", draft("emit"))) {
  const rec = runJson();
  if (rec.plan?.path !== planPath || rec.plan?.sha256 !== A) fails.push(`(a) run.json does not carry plan {path, sha256} for the plan as read: ${JSON.stringify(rec.plan)}`);
  for (const id of ["G1", "G2"]) if (rec.packets?.[id]?.plan_sha256 !== A) fails.push(`(a) packets.${id} does not carry the plan's plan_sha256: ${JSON.stringify(rec.packets?.[id])}`);
  const t = draftText();
  if (!t.includes(`\nplan_pin: sha256:${A}\n`)) fails.push("(a) the Draft's frontmatter does not carry plan_pin equal to the plan file's hash");
  const rows = traceRows(t);
  if (rows.length !== 2 || rows.some((r) => r.plan_sha !== A)) fails.push(`(a) a trace row does not carry plan_sha: ${JSON.stringify(rows)}`);
}

// (b) an unchanged plan behaves as before: carried Packets, nothing rendered, no refusal.
{
  const before = runJson().packets;
  const r = draft("resolve");
  if (ok("(b) resolve", r)) {
    if (/ParagraphPlan moved/.test(said(r)) || /packet G\d:/.test(r.stderr)) fails.push(`(b) resolve over an unchanged plan re-rendered or reported a move: ${said(r)}`);
    if (JSON.stringify(runJson().packets) !== JSON.stringify(before)) fails.push("(b) resolve over an unchanged plan did not carry the Packet entries");
    const s = draft("section", "--leg", "G1");
    if (ok("(b) section G1", s) && /next:/.test(s.stdout)) fails.push(`(b) section over an unchanged plan rendered a realized Leg's Packet: ${said(s)}`);
  }
}

// (c) the plan is rewritten under the same Brief; section before resolve is refused.
const beta = planText("beta");
writeFileSync(planPath, beta);
const B = sha(beta);
{
  const r = draft("section", "--leg", "G1");
  if (r.status === 0 || !r.stderr.includes("rendered from a ParagraphPlan that has since changed")
    || !r.stderr.includes(`recorded ${A.slice(0, 12)}, now ${B.slice(0, 12)}`)) {
    fails.push(`(c) section --leg G1 over a moved plan was not refused naming both hashes: ${said(r)}`);
  }
}

// (d) resolve drops the carried entries and walks the path again from G1.
{
  const r = draft("resolve");
  if (ok("(d) resolve", r)) {
    if (!r.stdout.includes(`the ParagraphPlan moved since the last run (recorded ${A.slice(0, 12)}, now ${B.slice(0, 12)}): every Packet is rendered again`)) {
      fails.push(`(d) resolve did not say the plan moved: ${said(r)}`);
    }
    const rec = runJson();
    if (rec.plan?.sha256 !== B) fails.push("(d) run.json does not name the new plan");
    if (Object.keys(rec.packets || {}).join(",") !== "G1" || rec.packets.G1.plan_sha256 !== B) fails.push(`(d) resolve did not drop the carried entries and render G1 alone: ${JSON.stringify(rec.packets)}`);
    if (!packet("G1").includes("PLANMARK-beta")) fails.push("(d) G1's Packet was not rendered from the new plan");
    const s1 = draft("section", "--leg", "G1");
    if (ok("(d) section G1", s1) && !s1.stdout.includes("next: G2")) fails.push(`(d) section G1 did not render the next Leg's Packet: ${said(s1)}`);
    if (!packet("G2").includes("PLANMARK-beta")) fails.push("(d) G2's Packet was not rendered from the new plan");
    if (ok("(d) section G2", draft("section", "--leg", "G2")) && ok("(d) emit", draft("emit"))) {
      const t = draftText();
      if ((t.match(/planmark beta/g) || []).length !== 2 || t.includes("planmark alpha")) fails.push(`(d) the emitted Draft's paragraphs are not the new plan's: ${t.split("---\n").pop()}`);
      if (!t.includes(`\nplan_pin: sha256:${B}\n`) || traceRows(t).some((row) => row.plan_sha !== B)) fails.push("(d) the emitted Draft does not name the new plan");
    }
  }
}

// (e) an entry with no plan_sha256 is refused as unrecorded.
{
  const rec = runJson();
  delete rec.packets.G1.plan_sha256;
  writeFileSync(join(ws, "run.json"), JSON.stringify(rec, null, 2) + "\n");
  const r = draft("section", "--leg", "G1");
  if (r.status === 0 || !r.stderr.includes("that no run record accounts for")) fails.push(`(e) a Packet entry without plan_sha256 was not refused as unrecorded: ${said(r)}`);
}

// (f) the plan names a Mapping Record; its digest rides into run.json and each Packet entry, and an edited file is refused.
const mappingDir = join(dir, "mapping");
const FIXTURE_STRUCTURE = { roles: [{ id: "gate", context: "A fixed check that admits some things.", attributes: [] }],
  relations: [{ id: "admits", between: ["gate"], holds: "{gate} admits what it was set for." }],
  higher_order: { relates: ["admits"], holds: "{gate} admits nothing else." } };
const fixtureRecord = (id) => ({ leg_id: id, structure: FIXTURE_STRUCTURE,
  table: { move: MOVE, case: id === "G1" ? "apart" : "own", base: { domain: "a turnstile" }, correspondences: [{ role: "gate", expression: "the turnstile" }] } });
const mapping = writeMappingRecord(mappingDir, legs.map((l) => fixtureRecord(l.leg_id)));
const tablePath = join(mappingDir, "G1", "table.yaml");
writeFileSync(planPath, planText("gamma", mapping));
{
  const r = draft("resolve");
  if (ok("(f) resolve", r)) {
    const rec = runJson();
    if (rec.plan?.mapping_sha256 !== mapping.sha256) fails.push(`(f) run.json does not carry the Mapping Record's digest: ${JSON.stringify(rec.plan)}`);
    if (rec.packets?.G1?.mapping_sha256 !== mapping.sha256) fails.push(`(f) packets.G1 does not carry mapping_sha256: ${JSON.stringify(rec.packets?.G1)}`);
  }
  const table = readFileSync(tablePath, "utf8");
  writeFileSync(tablePath, table.replace("a turnstile", "a toll gate"));
  const e = draft("resolve");
  if (e.status === 0 || !e.stderr.includes("mapping/G1/table.yaml has changed since the ParagraphPlan file")) {
    fails.push(`(f) resolve over an edited Mapping Record file was not refused naming the file: ${said(e)}`);
  }
  writeFileSync(tablePath, table);
  // The whole family the refusal promises, not only the edit that prompted it: an added file and a gone one.
  const stray = join(mappingDir, "G3", "table.yaml");
  mkdirSync(join(stray, ".."), { recursive: true });
  writeFileSync(stray, table);
  const a = draft("resolve");
  if (a.status === 0 || !a.stderr.includes("mapping/G3/table.yaml is not one the ParagraphPlan file")) fails.push(`(f) resolve over an added record file was not refused naming it: ${said(a)}`);
  rmSync(join(mappingDir, "G3"), { recursive: true });
  const structurePath = join(mappingDir, "G1", "structure.yaml");
  const structure = readFileSync(structurePath, "utf8");
  rmSync(structurePath);
  const g = draft("resolve");
  if (g.status === 0 || !g.stderr.includes("mapping/G1/structure.yaml, which the ParagraphPlan file")) fails.push(`(f) resolve over a removed record file was not refused naming it: ${said(g)}`);
  writeFileSync(structurePath, structure);
}

// (g) the sheet's `leg` mode renders the Leg's structure, Mapping Table, binding with case and Waypoints.
{
  const r = spawnSync(process.execPath, ["src/structure-mapping-playground/sheet.mjs", "leg", "--plan", planPath, "--leg", "G1"], { encoding: "utf8" });
  const want = ["Mapping Record — Leg G1", "<caption>Paragraph 1", "the turnstile", "a turnstile", "apart", "PLANMARK-gamma"];
  const missing = want.filter((w) => !(r.stdout || "").includes(w));
  if (r.status !== 0 || missing.length) fails.push(`(g) sheet.mjs leg did not render the Leg's record (missing ${missing.join(", ")}): ${said(r)}`);
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-draft-plan-pin — run.json names the ParagraphPlan and each Packet entry the plan it was rendered from, and the Draft carries plan_pin and each trace row plan_sha; an unchanged plan carries the Packets and refuses nothing; a plan rewritten under the same Brief is refused at section naming both hashes, and resolve then says so, drops the carried entries and walks the path again so the Draft is written from the new plan; an entry without plan_sha256 is refused as unrecorded (kogaki#1645); a plan naming a Mapping Record records its digest and an edited, added or removed record file is refused naming the file, and the sheet's leg mode renders the Leg's record (kogaki#1733).");
JS
