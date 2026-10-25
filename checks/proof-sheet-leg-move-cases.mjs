// checks/proof-sheet-leg-move-cases.mjs — case (y) of checks/check-proof-sheet-leg-run.sh, the
// Leg Move (kogaki#1597), kept beside the member because the member is at its line bound.
//
// WHAT IT COVERS, over the member's own runs and fake model binary, each assertion read from the
// stage's own records before the sheet (the consult receipt on the Issue: a plan names the gate,
// not the outputs):
//   (y1) the one-Leg main run's record carries a `leg-move` stage, done, naming one nested run;
//        `leg-move/<leg_id>.md` cuts into the Brief's Claims, one sentence each, in order.
//   (y2) the nested run carries its own record -- the five stages done and no `leg-move`, the
//        passage `<leg_id>-leg-move`, the run's Audience, no library -- its calls went through its
//        own recorder and are exactly the calls the binary saw for it, its one Move carries one
//        Segment per Claim, and the run's own `moves/` still holds its three Moves alone.
//   (y3) the sheet: on the one-Leg run one `Leg Move of Leg 1 of 1` block after the Run record
//        card, holding the comparison table over the Claims paragraph and the Extraction, Move,
//        ParagraphPlan, Packet and Draft cards and no Brief card; on the three-Leg run one block
//        per Leg, in order, after the last Leg block and none before.
//   (y4) a run whose nested Writer call fails stops at the stage naming the Leg, and `--resume`
//        re-enters the stage: the nested run resumes at its draft, no Extractor call is made
//        again, the main run makes no call, and every stage ends done.
import { readFileSync, writeFileSync, existsSync, readdirSync, chmodSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const LANGUAGE_LINE = "**Language.** Write this Leg in ";
const readOr = (p, dflt) => (existsSync(p) ? readFileSync(p, "utf8") : dflt);
const jsonl = (p) => readOr(p, "").split("\n").filter(Boolean).map((l) => JSON.parse(l));

export async function legMoveCases({ repo, root, map, judge, runDir, sRunDir }) {
  const fails = [];
  const ok = (cond, msg) => { if (!cond) fails.push(msg); };
  const imp = (p) => import(pathToFileURL(join(repo, p)).href);
  const { parseYaml } = await imp("src/yaml.mjs");
  const { sentencesOf } = await imp("src/proof-sheet/extract.mjs");
  const S = await imp("src/proof-sheet/leg-sheet.mjs");
  const run = JSON.parse(readOr(join(runDir, "run.json"), '{"stages":[]}'));
  const stage = (r, name) => (r.stages || []).find((st) => st.stage === name) || {};
  const claimsOf = (dir) => (parseYaml(readOr(join(dir, "brief", "brief.yaml"), "reader_path: []\n"), "brief").reader_path || [])
    .map((l) => ({ leg_id: l.leg_id, claims: (l.claims || []).map((c) => c.proposition) }));

  // (y1) the stage and its Claims file
  const lm = stage(run, "leg-move");
  const [leg] = claimsOf(runDir);
  ok(lm.state === "done" && Array.isArray(lm.runs) && lm.runs.length === 1 && leg && lm.runs[0].leg_id === leg.leg_id,
    `(y1) the main run's record carries no done leg-move stage naming its one Leg: ${JSON.stringify(lm)}`);
  const claimsText = leg ? readOr(join(runDir, "leg-move", `${leg.leg_id}.md`), "") : "";
  ok(leg && leg.claims.length === 3 && JSON.stringify(sentencesOf(claimsText)) === JSON.stringify(leg.claims) && claimsText.trim().split("\n").length === 1,
    `(y1) leg-move/<leg_id>.md is not one paragraph of the Brief's Claims, one sentence each, in order: ${JSON.stringify(claimsText)}`);

  // (y2) the nested run's own record, calls and Move
  const nested = leg ? join(runDir, "leg-move", leg.leg_id) : "";
  const nrun = JSON.parse(readOr(join(nested, "run.json"), '{"stages":[]}'));
  ok(nrun.stages.map((st) => `${st.stage}:${st.state}`).join(",") === "extract:done,ingest:done,brief:done,paragraph-plan:done,draft:done"
    && leg && nrun.passage === `${leg.leg_id}-leg-move` && nrun.audience === run.audience && nrun.library === null,
    `(y2) the nested run's record is not its own five-stage run under the run's Audience with no library: ${JSON.stringify(nrun.stages.map((st) => [st.stage, st.state, st.stopped]))} ${nrun.passage}`);
  const nestedCalls = ["extract", "brief", "paragraph-plan", "draft"].flatMap((st) => jsonl(join(nested, st, "calls.jsonl")));
  const seenNested = jsonl(join(root, "seen-leg-move.jsonl"));
  ok(nestedCalls.length >= 5 && nestedCalls.length === seenNested.length && nestedCalls.every((c) => seenNested.some((x) => x.prompt === c.stdin)),
    `(y2) the nested run's recorded calls (${nestedCalls.length}) are not the calls the binary saw for it (${seenNested.length})`);
  const isMove = (f) => f.endsWith(".yaml");
  const nestedMoves = existsSync(join(nested, "moves")) ? readdirSync(join(nested, "moves")).filter(isMove) : [];
  const move = nestedMoves.length === 1 ? parseYaml(readFileSync(join(nested, "moves", nestedMoves[0]), "utf8"), "move") : null;
  ok(move && Array.isArray(move.segments) && leg && move.segments.length === leg.claims.length,
    `(y2) the nested run's moves/ does not hold one Move with one Segment per Claim: ${JSON.stringify(nestedMoves)}`);
  const ownMoves = readdirSync(join(runDir, "moves")).filter(isMove).sort();
  ok(JSON.stringify(ownMoves) === JSON.stringify([1, 2, 3].map((n) => `name_an_act_then_its_cost_${n}.yaml`)),
    `(y2) the run's own moves/ holds something besides its three Moves: ${JSON.stringify(ownMoves)}`);

  // (y3) the sheet's blocks, on the one-Leg run and on the three-Leg run
  const html = readOr(join(runDir, "sheet.html"), "");
  const blocks = html.split('<section class="leg-block leg-move"').slice(1);
  const first = html.indexOf('<section class="leg-block leg-move"');
  ok(blocks.length === 1 && leg && blocks[0].includes(`<h3>${S.LEG_MOVE_HEADING} 1 of 1 — ${leg.leg_id}`) && first > html.indexOf('id="card-0-runRecord"'),
    `(y3) the one-Leg sheet does not carry one Leg Move block after the Run record card: ${blocks.length} block(s)`);
  const b = blocks[0] || "";
  const pairStart = b.indexOf('<table class="pair" id="comparison-0-m1"');
  const row = pairStart >= 0 ? b.slice(pairStart, b.indexOf("</table>", pairStart)).split("<tr><th>").slice(2) : [];
  // The fixture's Writer writes three paragraphs whatever it is handed, so rows 2 and 3 hold no original.
  ok(row.length >= 1 && row[0].includes(`<td>${claimsText.trim()}</td>`) && row.slice(1).every((x) => /^\d+<\/th><td><\/td>/.test(x)) && b.includes(S.LEG_MOVE_NOTE),
    "(y3) the Leg Move block's comparison table does not set the Claims paragraph as its Original Leg, said in one line");
  ok(["extraction", "move", "paragraphPlan", "packet", "draft"].every((k) => b.includes(`id="card-0-m1-${k}"`)) && !b.includes('id="card-0-m1-brief"')
    && !b.includes('href="#card-0-m1-brief"'), "(y3) the Leg Move block does not hold the Extraction, Move, ParagraphPlan, Packet and Draft cards alone");
  const sHtml = sRunDir ? readOr(join(sRunDir, "sheet.html"), "") : "";
  const sIds = claimsOf(sRunDir || root).map((l) => l.leg_id);
  const at = sIds.map((id, k) => sHtml.indexOf(`<h3>${S.LEG_MOVE_HEADING} ${k + 1} of 3 — ${id}`));
  ok(sIds.length === 3 && at.every((p, k) => p >= 0 && (k === 0 || p > at[k - 1])) && sHtml.split('<section class="leg-block leg-move"').length === 4
    && sHtml.indexOf('<section class="leg-block leg-move"') > sHtml.indexOf('<section class="leg-block" id="leg-0-3"'),
    `(y3) the three-Leg sheet does not carry one Leg Move block per Leg, in order, after the last Leg block: ${JSON.stringify(at)}`);

  // (y4) a stop inside the stage, and --resume re-entering it
  const xRoot = join(root, "leg-move-resume");
  mkdirSync(xRoot, { recursive: true });
  const wrapper = join(xRoot, "fail-nested-writer.mjs");
  writeFileSync(wrapper, `#!/usr/bin/env node
import { readFileSync, writeSync } from "node:fs";
import { spawnSync } from "node:child_process";
const stdin = process.argv.includes("--version") ? "" : readFileSync(0, "utf8");
if (process.env.PSR_LM_FAIL && String(process.env.KOGAKI_PROOF_SHEET_CALLS).includes("/leg-move/") && stdin.includes(${JSON.stringify(LANGUAGE_LINE)})) {
  writeSync(2, "LM-FAIL the nested Writer call failed\\n"); process.exit(3);
}
const r = spawnSync(${JSON.stringify(judge)}, process.argv.slice(2), { input: stdin, maxBuffer: 64 * 1024 * 1024 });
writeSync(1, r.stdout || ""); writeSync(2, r.stderr || ""); process.exit(r.status === null ? 1 : r.status);
`);
  chmodSync(wrapper, 0o755);
  const env = (extra) => ({ ...process.env, KOGAKI_JUDGE_CLI: wrapper, PSR_FIXTURE_DIR: xRoot, ...extra });
  const x1 = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--leg", join(root, "leg-fixture.md"), "--out", join(xRoot, "out"), "--provenance", map],
    { cwd: repo, encoding: "utf8", env: env({ PSR_LM_FAIL: "1" }), timeout: 600000 });
  const xDir = (x1.stdout.match(/^run directory: (.+)$/m) || [])[1];
  const xRun = xDir ? JSON.parse(readOr(join(xDir, "run.json"), '{"stages":[]}')) : { stages: [] };
  ok(x1.status === 1 && xLegStopped(xRun, leg), `(y4) the run whose nested Writer fails did not stop at the leg-move stage naming the Leg: ${x1.status} ${xRun.stopped}`);
  if (xDir) {
    const mainSeen = jsonl(join(xRoot, "seen.jsonl")).length;
    const nestedExtract = jsonl(join(xRoot, "seen-leg-move.jsonl")).filter((x) => x.stage === "extract").length;
    const x2 = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--resume", xDir, "--provenance", map],
      { cwd: repo, encoding: "utf8", env: env({}), timeout: 600000 });
    const rRun = JSON.parse(readOr(join(xDir, "run.json"), '{"stages":[]}'));
    const nRun = leg ? JSON.parse(readOr(join(xDir, "leg-move", leg.leg_id, "run.json"), '{"stages":[]}')) : { stages: [] };
    ok(x2.status === 0 && rRun.stages.every((st) => st.state === "done") && stage(rRun, "leg-move").state === "done"
      && nRun.stages.every((st) => st.state === "done") && nRun.stages.length === 5,
      `(y4) --resume did not finish the leg-move stage: ${x2.status} ${JSON.stringify(rRun.stages.map((st) => [st.stage, st.state]))} ${x2.stdout}${x2.stderr}`);
    ok(jsonl(join(xRoot, "seen.jsonl")).length === mainSeen
      && jsonl(join(xRoot, "seen-leg-move.jsonl")).filter((x) => x.stage === "extract").length === nestedExtract,
      "(y4) --resume made a call for the main run, or extracted the nested run's paragraph again");
    ok(leg && jsonl(join(xDir, "leg-move", leg.leg_id, "draft", "calls.jsonl")).filter((c) => c.exit === 0).length === 1,
      "(y4) the resumed nested run did not write its Leg through one Writer call");
  }
  return fails;
}

// The stop line names the stage and the Leg: `leg-move: Leg <leg_id>: draft: ...`.
function xLegStopped(record, leg) {
  return !!(leg && typeof record.stopped === "string" && record.stopped.startsWith(`leg-move: Leg ${leg.leg_id}: draft:`)
    && (record.stages.find((st) => st.stage === "leg-move") || {}).state === "stopped");
}

