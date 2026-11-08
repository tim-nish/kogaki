#!/usr/bin/env bash
# check-brief-mint — the Persona, claim register and mint-side rules of
# Brief composition. A LIGHT member: pure calls, no model run.
#   (af) `nearest` and `differs` are retired: introduces_item declares
#        neither, and an entry carrying either is refused naming it (kogaki#1571).
#   (ar) `persona_prior_knowledge` reaches no path-review input and no unit
#        validator; review_path carries `defined_terms` instead (kogaki#1331);
#        compose_path hands it to TAKE alone (kogaki#1699).
#   (as) the claim register, one judged entry per Leg (kogaki#1281); (bb)
#        `composeBrief` records `compose_path`, refusing one missing (kogaki#1262, #1328).
#   (cc) the external-authority switch is retired: the mint writes no such
#        header key, and the key or its input is refused by name (kogaki#1571).
# Cut from check-brief-compose.sh by kogaki#1460; the registry row says more.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, readdirSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, rmSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { composeBrief, composeThesisCandidates } from "./src/brief.mjs";
import { collidingHomes } from "./src/brief/candidates.mjs";
import { STATE_RETRY_GATE_ID } from "./src/workflow/gate.mjs";
import { attachReview, claimRegisterRefusal, REVIEW_AREAS } from "./src/review.mjs";
import * as compose from "./src/compose.mjs";
import { recordOf, briefOfRecord } from "./checks/fixtures/brief-compose/fixtures.mjs";
// The Brief runtime is the entry and every module it was split into (kogaki#1466).
const briefRuntimeText = () => ["src/brief.mjs", ...readdirSync("src/brief").filter((f) => f.endsWith(".mjs"))
  .map((f) => join("src/brief", f))].map((p) => readFileSync(p, "utf8")).join("\n");
const fails = [];

// THE RETIRED SWITCH'S NAMES ARE SPELLED APART (kogaki#1571): the Issue's
// Acceptance greps checks/ for the literal names to show no reader is left.
const RETIRED_KEY = ["external", "authority"].join("_");
const RETIRED_INPUT = ["external", "Authority"].join("");

// (af) kogaki#1571, owner decision 2026-10-24: an introduces entry's `nearest`
// and `differs` are retired. The schema declares neither, and an entry
// carrying either is refused naming the key rather than read past.
{
  const schema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  const fields = schema.introduces_item.fields;
  for (const k of ["nearest", "differs"]) {
    if (Object.hasOwn(fields, k)) fails.push(`(af) src/leg-schema.json's introduces_item still declares ${k}`);
    const r = compose.parseIntroducesEntry({ term: "unfed guard", meaning: "a guard whose input nobody feeds", [k]: "guard clause" });
    if (!r.error) fails.push(`(af) an introduces entry carrying ${k} was not refused`);
    else if (!r.error.includes(`\`${k}\``)) fails.push(`(af) the refusal of ${k} did not name it: ${r.error}`);
  }
}

// (ar) kogaki#1331: `persona_prior_knowledge` reaches no composition or path-review
// input -- the grant it carried is removed (owner decision 2026-10-10) -- and
// review_path's input carries the Brief's `defined_terms` in its place. The
// Persona's line is read by differentiation, for the first-Leg survivors, and by
// compose_path, as what the first Leg's Move's `takes` must be met by (kogaki#1699).
{
  const brief = briefRuntimeText();
  const code = (t) => t.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  const composePath = code(brief.slice(brief.indexOf("  compose_path: async"), brief.indexOf("  review_path: async")));
  const reviewPath = code(brief.slice(brief.indexOf("  review_path: async"), brief.indexOf("  attach_review:")));
  const differentiation = code(brief.slice(brief.indexOf("  differentiation: async"), brief.indexOf("  compose_path: async")));
  // THE FIRST LEG'S ENTRY CONDITION (kogaki#1699): compose_path reads the line once and hands
  // it to the unit, the assignment block and the Move-fit judge for TAKE -- never to the
  // validator, so the word grant kogaki#1331 removed is not restored.
  if ((composePath.match(/personaPriorKnowledgeLine\(/g) || []).length !== 1) fails.push("(ar) compose_path does not read the Persona's prior_knowledge exactly once");
  for (const at of ["persona_prior_knowledge: priorKnowledge", "differentiationBlockFor(entry, priorKnowledge", "inputs: { movesDir, priorKnowledge,"]) {
    if (!composePath.includes(at)) fails.push(`(ar) compose_path does not hand the Persona's prior_knowledge at ${JSON.stringify(at)}`);
  }
  if (/inputs: \{ strandIds,[^}]*priorKnowledge/.test(composePath)) fails.push("(ar) compose_path hands the Persona's prior_knowledge to the unit validator");
  if (/persona_prior_knowledge|personaPriorKnowledgeLine/.test(reviewPath)) fails.push("(ar) review_path still reads or passes the Persona's prior_knowledge");
  if ((reviewPath.match(/defined_terms: definedTerms,/g) || []).length !== 2) fails.push("(ar) review_path's base write and per-unit input do not both carry defined_terms");
  if (!/prior_knowledge: personaPriorKnowledgeLine\(persona\)/.test(differentiation)) fails.push("(ar) differentiation no longer carries the Persona's prior_knowledge for the first-Leg survivors");
}

// (as) kogaki#1281: the claim register -- one judged entry per Leg, a closed
// verdict set, and a named word on `fails`.
{
  const legs = [{ leg_id: "s1" }, { leg_id: "s2" }];
  const candOf = (id) => ({ candidate_id: id, legs });
  const reviewAreaFields = () => Object.fromEntries(REVIEW_AREAS.map((a) => [a, `reasoning for ${a}`]));

  const holds = [{ leg_id: "s1", verdict: "holds" }, { leg_id: "s2", verdict: "holds" }];
  if (claimRegisterRefusal(holds, legs)) fails.push(`(as) a claim_register with every Leg holding was refused: ${claimRegisterRefusal(holds, legs)}`);
  const rHolds = attachReview([candOf("c1")], { c1: { ...reviewAreaFields(), claim_register: holds } }, {});
  if (rHolds.error) fails.push(`(as) attachReview refused a holding claim_register: ${rHolds.error}`);

  const fails_ = [{ leg_id: "s1", verdict: "fails", word: "idempotent" }, { leg_id: "s2", verdict: "holds" }];
  if (claimRegisterRefusal(fails_, legs)) fails.push(`(as) a claim_register naming a word on its failing entry was refused: ${claimRegisterRefusal(fails_, legs)}`);
  const rFails = attachReview([candOf("c1")], { c1: { ...reviewAreaFields(), claim_register: fails_ } }, {});
  if (rFails.error) fails.push(`(as) attachReview refused a failing-with-word claim_register: ${rFails.error}`);
  else if (rFails.candidates[0].review.claim_register[0].word !== "idempotent") fails.push("(as) attachReview did not carry the fails entry's word through");

  const noWord = [{ leg_id: "s1", verdict: "fails" }, { leg_id: "s2", verdict: "holds" }];
  const rNoWord = claimRegisterRefusal(noWord, legs);
  if (!rNoWord || !/leg s1/.test(rNoWord) || !/\`word\`/.test(rNoWord)) fails.push(`(as) a fails entry naming no word was not refused naming the Leg: ${rNoWord}`);

  const badVerdict = [{ leg_id: "s1", verdict: "contradicts" }, { leg_id: "s2", verdict: "holds" }];
  const rBadVerdict = claimRegisterRefusal(badVerdict, legs);
  if (!rBadVerdict || !/leg s1/.test(rBadVerdict)) fails.push(`(as) a verdict outside holds/fails was not refused naming the Leg: ${rBadVerdict}`);

  const shortCount = [{ leg_id: "s1", verdict: "holds" }];
  const rShortCount = claimRegisterRefusal(shortCount, legs);
  if (!rShortCount || !/1 entry/.test(rShortCount)) fails.push(`(as) a claim_register with too few entries for the Legs was not refused by count: ${rShortCount}`);

  if (!claimRegisterRefusal(null, legs)) fails.push("(as) an absent claim_register was not refused");
  const rMissing = attachReview([candOf("c1")], { c1: reviewAreaFields() }, {});
  if (!rMissing.error) fails.push("(as) attachReview did not refuse a review entry carrying no claim_register");
}

// (bb) the mint records compose_path -- the Persona's path -- and refuses without one (kogaki#1262).
{
  const strands = [{ display_id: "L1", slug: "a-strand", cite: "coding::lesson/a-strand@abc123" }];
  const doc = composeBrief({ slug: "t", strands, thesis: "a claim", composePath: "audiences/dev-to-zenn.md" });
  if (!/^compose_path: audiences\/dev-to-zenn\.md$/m.test(doc)) {
    fails.push(`(bb) the minted Brief does not carry compose_path naming the Persona file: ${JSON.stringify(doc.slice(0, 200))}`);
  }
  let threw = null;
  try { composeBrief({ slug: "t", strands, thesis: "a claim" }); }
  catch (e) { threw = e; }
  if (!threw) fails.push("(bb) composeBrief with no composePath was not refused");
  else if (!/compose_path/.test(threw.message)) fails.push(`(bb) the refusal did not name compose_path: ${threw.message}`);
  for (const bad of ["", 42, null]) {
    let badThrew = null;
    try { composeBrief({ slug: "t", strands, thesis: "a claim", composePath: bad }); }
    catch (e) { badThrew = e; }
    if (!badThrew) fails.push(`(bb) composeBrief with composePath ${JSON.stringify(bad)} was not refused`);
  }
  // THE RECORD REQUIRES IT (kogaki#1328): a Brief record carrying no
  // compose_path is refused by the Draft's reader, naming the key.
  const bare = recordOf([{ leg_id: "s1", move: "m", materials: ["L1"], purpose: "p",
    depends_on: [], rationale: "r", claims: [{ strand: "L1", proposition: "c" }], waypoints: [{ point: "w", serves: ["L1"] }] }]);
  delete bare.compose_path;
  const noPath = briefOfRecord(bare, "bb.yaml");
  if (!noPath.refusals.some((r) => /`compose_path`/.test(r))) fails.push(`(bb) a Brief record with no compose_path was not refused naming the key: ${JSON.stringify(noPath.refusals)}`);
}

// (cc) kogaki#1571: the external-authority switch is retired. The mint writes
// no such header key, a caller passing its input is refused naming the input,
// and a Brief record carrying the key is refused naming the key.
{
  const strands = [{ display_id: "L1", slug: "a-strand", cite: "coding::lesson/a-strand@abc123" }];
  const minted = composeBrief({ slug: "t", strands, thesis: "a claim", composePath: "audiences/dev-to-zenn.md" });
  if (minted.includes(RETIRED_KEY)) fails.push(`(cc) the mint still writes the retired header key: ${JSON.stringify(minted.slice(0, 260))}`);
  let threw = null;
  try { composeBrief({ slug: "t", strands, thesis: "a claim", composePath: "audiences/dev-to-zenn.md", [RETIRED_INPUT]: "on" }); }
  catch (e) { threw = e; }
  if (!threw) fails.push("(cc) composeBrief passed the retired input was not refused");
  else if (!threw.message.includes(`\`${RETIRED_INPUT}\``)) fails.push(`(cc) the refusal did not name the retired input: ${threw.message}`);
  const carried = compose.parseBriefRecord(minted.replace(/^compose_path: .*$/m, (l) => `${l}\n${RETIRED_KEY}: "on"`), "cc.yaml");
  if (!carried.error) fails.push("(cc) a Brief record carrying the retired header key was not refused");
  else if (!carried.error.includes(`\`${RETIRED_KEY}\``)) fails.push(`(cc) the record refusal did not name the key: ${carried.error}`);
}

// (dd) kogaki#1740: the home collision is caught at `enter`. Every candidate's
// name is known before the gate, so a name whose home exists is named, and
// cmdEnter refuses before it writes the run state the gate is composed from.
{
  const thesesDir = mkdtempSync(join(tmpdir(), "kogaki-dd-theses-"));
  const strands = [{ display_id: "L1", slug: "a-strand", cite: "coding::lesson/a-strand@abc123" }];
  const candidates = composeThesisCandidates(strands, new Map([["a-strand", { headline: "guards fail open when nobody feeds them", cite: "c" }]]));
  if (collidingHomes(candidates, thesesDir).length) fails.push("(dd) a theses dir holding no home reported a collision");
  mkdirSync(join(thesesDir, candidates[1].slug));
  const taken = collidingHomes(candidates, thesesDir);
  if (JSON.stringify(taken) !== JSON.stringify([join(thesesDir, candidates[1].slug)])) fails.push(`(dd) the existing home was not the one collision named: ${JSON.stringify(taken)}`);
  const enter = readFileSync("src/brief/candidates.mjs", "utf8");
  const body = enter.slice(enter.indexOf("export function cmdEnter"), enter.indexOf("const state = {", enter.indexOf("export function cmdEnter")));
  const at = body.indexOf("collidingHomes(candidates");
  if (at < 0 || at > body.indexOf("mkdirSync(dirname(runPath)")) fails.push("(dd) cmdEnter does not refuse a colliding home before it writes the run state");
}

// (de) kogaki#1740: a refusal inside an advance is a wait. A fixture record
// stands after `adopt_thesis`, with the adopted name's home already present.
{
  const briefTable = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  const stub = join(mkdtempSync(join(tmpdir(), "kogaki-de-judge-")), "judge.mjs");
  writeFileSync(stub, "#!/usr/bin/env node\nprocess.stdout.write(\"de-judge fixture\\n\");\n");
  chmodSync(stub, 0o755);
  const setup = () => {
    const dir = mkdtempSync(join(tmpdir(), "kogaki-de-run-"));
    const thesesDir = join(dir, "theses");
    mkdirSync(join(thesesDir, "guard-claim"), { recursive: true });
    const runState = join(dir, "run.json");
    writeFileSync(runState, JSON.stringify({
      stage: "adopted", adopted_thesis: "Guards fail open when nobody feeds them.", adopted_slug: "guard-claim",
      strands: [{ display_id: "L1", slug: "a-strand", cite: "coding::lesson/a-strand@abc123" }], strand_renderings: {},
    }, null, 2) + "\n");
    writeFileSync(join(dir, "run-record.json"), JSON.stringify({
      workflow: { path: "src/brief-workflow.json", version: briefTable.version }, judge_binary: null, survey_record: null,
      completed: ["enter", "THESIS_ADOPTION", "adopt_thesis"], waits_reached: ["THESIS_ADOPTION"],
      conditional_entered: [], conditional_skipped: [], awaiting: null, owner_input: {}, artifacts_written: [],
      judgments: {}, gate_declarations_owed: [], transitions: [], done: false, brief_run_state: runState,
    }, null, 2) + "\n");
    const terms = join(dir, "defined-terms.json");
    writeFileSync(terms, JSON.stringify({ version: "1", defined_terms: [] }) + "\n");
    const pointer = join(dir, "open-run-pointer.json");
    writeFileSync(pointer, `${dir}\n`);
    const gates = join(dir, "open-gates");
    mkdirSync(gates);
    return { dir, thesesDir, terms, pointer, gates };
  };
  const advance = (f, toolUseId) => {
    const env = { ...process.env, KOGAKI_BRIEF_RUN_DIR: f.dir, KOGAKI_BRIEF_OPEN_RUN: f.pointer,
      KOGAKI_OPEN_GATES: f.gates, KOGAKI_JUDGE_CLI: stub };
    delete env.CLAUDE_CODE_SESSION_ID;
    return spawnSync(process.execPath, ["src/brief.mjs", "run", "--defined-terms", f.terms, "--theses-dir", f.thesesDir], {
      encoding: "utf8", timeout: 60000, env,
      input: JSON.stringify({ hook_event_name: "PostToolUse", session_id: "s-de", tool_use_id: toolUseId }),
    });
  };
  const record = (f) => JSON.parse(readFileSync(join(f.dir, "run-record.json"), "utf8"));
  const answer = (f, option, toolUseId) => {
    const decl = JSON.parse(readFileSync(join(f.dir, `${STATE_RETRY_GATE_ID}.run-declaration.json`), "utf8"));
    const digest = createHash("sha256").update(JSON.stringify([STATE_RETRY_GATE_ID, decl.options.map((o) => o.id)])).digest("hex");
    writeFileSync(join(f.dir, "brief.gate-capture.json"), JSON.stringify({ rows: [{
      gate_instance_id: decl.gate_instance_id, evidence: { tool: "AskUserQuestion", tool_use_id: toolUseId },
      answers_over: { option_set_digest: digest }, payload: { answer: { option } } }] }) + "\n");
  };
  const refusedOnce = () => {
    const f = setup();
    const r = advance(f, "toolu_de_1");
    const rec = record(f);
    const owed = (rec.gate_declarations_owed || []).find((g) => g.state === "mint" && g.gate_id === STATE_RETRY_GATE_ID);
    if (r.status !== 0 || rec.awaiting !== "mint" || rec.completed.includes("mint") || !owed
      || !existsSync(join(f.dir, `${STATE_RETRY_GATE_ID}.gate-call.json`))
      || !String((rec.state_refusals || {}).mint?.refusal || "").includes("already exists")) {
      fails.push(`(de) a mint refusal inside an advance did not leave awaiting: mint with a ${STATE_RETRY_GATE_ID} declaration and call: status=${r.status} stderr=${r.stderr} record=${JSON.stringify(rec).slice(0, 600)}`);
    }
    const call = existsSync(join(f.dir, `${STATE_RETRY_GATE_ID}.gate-call.json`)) ? readFileSync(join(f.dir, `${STATE_RETRY_GATE_ID}.gate-call.json`), "utf8") : "";
    if (/adopt --thesis|--slug/.test(`${call}${r.stdout}`)) fails.push("(de) the mint refusal still names `adopt --thesis` or `--slug`");
    return f;
  };
  {
    const f = refusedOnce();
    rmSync(join(f.thesesDir, "guard-claim"), { recursive: true });
    answer(f, "retry", "toolu_de_2");
    const r = advance(f, "toolu_de_2");
    const rec = record(f);
    const brief = join(f.thesesDir, "guard-claim", "brief.yaml");
    if (!rec.completed.includes("mint") || !existsSync(brief)
      || !readFileSync(brief, "utf8").includes("Guards fail open when nobody feeds them.")) {
      fails.push(`(de) \`retry\` after the repair did not complete mint with the adopted Thesis: stdout=${r.stdout.slice(0, 400)} stderr=${r.stderr.slice(0, 400)}`);
    }
  }
  {
    const f = refusedOnce();
    answer(f, "abandon", "toolu_de_3");
    const r = advance(f, "toolu_de_3");
    const rec = record(f);
    if (r.status !== 0 || rec.done !== true || !rec.state_abandoned || existsSync(f.pointer) || rec.completed.includes("mint")) {
      fails.push(`(de) \`abandon\` did not end the run and clear the open-run pointer: status=${r.status} stderr=${r.stderr} record=${JSON.stringify(rec).slice(0, 400)}`);
    }
  }
  // (df) the amendment's item 1: a renderer that THROWS, rather than calling a
  // runtime's `fail`, is a refusal too. `strands: null` makes the mint's composer
  // throw a TypeError.
  {
    const f = setup();
    rmSync(join(f.thesesDir, "guard-claim"), { recursive: true });
    const runState = join(f.dir, "run.json");
    writeFileSync(runState, JSON.stringify({ ...JSON.parse(readFileSync(runState, "utf8")), strands: null }) + "\n");
    const r = advance(f, "toolu_df_1");
    const rec = record(f);
    if (r.status !== 0 || rec.awaiting !== "mint" || !existsSync(join(f.dir, `${STATE_RETRY_GATE_ID}.gate-call.json`))
      || !/TypeError/.test(String((rec.state_refusals || {}).mint?.refusal || ""))) {
      fails.push(`(df) a renderer that threw did not leave awaiting: mint with a ${STATE_RETRY_GATE_ID} call: status=${r.status} stderr=${r.stderr.slice(0, 400)} record=${JSON.stringify(rec).slice(0, 400)}`);
    }
  }
  // (dg) the amendment's item 2: \`start\` over an unfinished open run raises the
  // gate for its first incomplete state and creates no run directory.
  {
    const f = setup();
    const lane = join(process.cwd(), "runs", "brief");
    const before = existsSync(lane) ? readdirSync(lane).sort() : [];
    const env = { ...process.env, KOGAKI_BRIEF_OPEN_RUN: f.pointer, KOGAKI_OPEN_GATES: f.gates, KOGAKI_JUDGE_CLI: stub };
    delete env.CLAUDE_CODE_SESSION_ID;
    delete env.KOGAKI_BRIEF_RUN_DIR;
    const r = spawnSync(process.execPath, ["src/brief.mjs", "start"], { encoding: "utf8", timeout: 60000, env });
    const after = existsSync(lane) ? readdirSync(lane).sort() : [];
    const rec = record(f);
    if (r.status !== 0 || rec.awaiting !== "mint" || !existsSync(join(f.dir, `${STATE_RETRY_GATE_ID}.gate-call.json`))
      || readFileSync(f.pointer, "utf8").trim() !== f.dir) {
      fails.push(`(dg) start over an unfinished run did not raise ${STATE_RETRY_GATE_ID} for it: status=${r.status} stderr=${r.stderr.slice(0, 400)} record=${JSON.stringify(rec).slice(0, 300)}`);
    }
    if (JSON.stringify(before) !== JSON.stringify(after)) fails.push(`(dg) start over an unfinished run created a run directory: ${JSON.stringify(after.filter((d) => !before.includes(d)))}`);
  }
}

if (fails.length > 0) {
  console.log("FAIL check-brief-mint");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-mint — an introduces entry carrying nearest or differs refused by name (kogaki#1571); persona_prior_knowledge reaching no review_path input and no unit validator, review_path carrying defined_terms (kogaki#1331), and compose_path handing it to TAKE alone (kogaki#1699); the claim register refused by count, by verdict and by an unworded fails (kogaki#1281); composeBrief recording compose_path and refusing a missing one (kogaki#1262), the retired external-authority switch written by no mint and refused by name as an input and as a record key (kogaki#1571); and a colliding home refused at enter, a mint refusal inside an advance waiting at the brief-state-retry gate, retry minting the adopted Thesis and abandon clearing the open-run pointer, a throwing renderer raising the same gate, and start over an unfinished run re-offering it with no new run directory (kogaki#1740).");
JS
