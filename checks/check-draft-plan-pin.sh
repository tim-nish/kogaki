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
# unrecorded.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, existsSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const fails = [];
const repo = resolve(".");
const { legRecord, briefRecordText, readerStateMap, paragraphPlanRecord, paragraphPlanRecordText } =
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

const leg = (id, deps) => ({
  leg_id: id, move: "a_leg_move", purpose: `purpose of ${id}`, reader_state_after: `knowledge: after ${id}.`,
  materials: ["L1"], depends_on: deps, rationale: `rationale for ${id}.`,
  claims: [{ strand: "L1", proposition: `the claim ${id} carries.` }],
  waypoints: [{ point: `The waypoint ${id} reaches.`, serves: ["L1"] }],
});
const legs = [leg("G1", []), leg("G2", ["G1"])];
const briefText = briefRecordText({
  slug: "plan-pin", compose_path: "audiences/dev-to-zenn.md",
  strands: [{ id: "L1", slug: "first-strand", cite: `coding::lesson/first-strand@${"0".repeat(64)}` }],
  thesis: "The fixture claim.", reader_start: readerStateMap("knowledge: The reader believes the fixture claim is obvious."),
  reader_target: "G2", reader_path: legs.map(legRecord),
  strand_coverage: [], journey_coverage: [], obligations: [], tradeoffs: {}, bridged: {},
});
const dir = join(root, "theses", "plan-pin");
mkdirSync(dir, { recursive: true });
const briefPath = join(dir, "brief.yaml");
writeFileSync(briefPath, briefText);
const planPath = join(dir, "paragraph-plan.yaml");
const entry = (id) => ({ move: "answer_a_posed_question_then_win_two_easy_assents_before_ranking_the_distinction_first",
  materials: ["L1"], purpose: `purpose of ${id}'s paragraph.`, reader_state_after: `knowledge: after ${id}.`,
  depends_on: [], rationale: `rationale for ${id}'s paragraph.`, introduces: [], "re-activate": [] });
const planText = (mark) => paragraphPlanRecordText(paragraphPlanRecord({ briefPath, briefText,
  legs: legs.map((l) => ({ leg_id: l.leg_id, waypoints: [[{ point: `PLANMARK-${mark} the paragraph ${l.leg_id} plans.`, serves: ["L1"] }]],
    entries: [entry(l.leg_id)], joins: [null] })) }));

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

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-draft-plan-pin — run.json names the ParagraphPlan and each Packet entry the plan it was rendered from, and the Draft carries plan_pin and each trace row plan_sha; an unchanged plan carries the Packets and refuses nothing; a plan rewritten under the same Brief is refused at section naming both hashes, and resolve then says so, drops the carried entries and walks the path again so the Draft is written from the new plan; an entry without plan_sha256 is refused as unrecorded (kogaki#1645).");
JS
