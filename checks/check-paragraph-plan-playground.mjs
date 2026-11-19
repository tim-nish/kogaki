#!/usr/bin/env node
// check-paragraph-plan-playground — the ParagraphPlanPlayground (kogaki#1762, kogaki#1884) renders one Candidate of a
// Brief compose run from the run directory alone, one Round per Submission. Its cases (r), (s) and (z) are the
// `paragraph-plan-playground` entry's contract in checks/registry.json.
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const fails = [];
const ok = (cond, msg) => {
  if (!cond) fails.push(msg);
};
const repo = fileURLToPath(new URL("..", import.meta.url));
process.chdir(repo);
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const { writeCallRecord } = await imp("src/workflow/call-record.mjs");
const { renderCandidate, CANDIDATE_ROUND_BLOCKS, NO_RECORD } = await imp("src/paragraph-plan-playground/sheet.mjs");
const root = mkdtempSync(join(tmpdir(), "paragraph-plan-playground-"));

const M1 = "derive_a_universal_tendency_from_an_absent_protector";
const M2 = "carry_a_worked_case_onto_the_wider_scale";
const STOPPED = "the compose call ran past the 900s per-call limit";
const block = (r, name) => (r.split(`<h4 class="th">${name}</h4>`)[1] || "").split('<h4 class="th">')[0];
const count = (hay, needle) => hay.split(needle).length - 1;

const corpus = join(root, "corpus");
mkdirSync(join(corpus, "batch", "legs"), { recursive: true });
mkdirSync(join(corpus, "batch", "runs", "leg-run-x", "extract", "extractor-run-x"), { recursive: true });
writeFileSync(
  join(corpus, "batch", "legs", "fixture-passage.md"),
  "# A fixture passage\n\n## Passage\n\nThe first paragraph.\n\nThe second paragraph,\nover two lines.\n\nThe third paragraph.\n",
);
writeFileSync(
  join(corpus, "batch", "runs", "leg-run-x", "extract", "extractor-run-x", "extractions.json"),
  JSON.stringify({
    leg: join(corpus, "batch", "runs", "leg-run-x", "leg.md"),
    passage: "fixture-passage",
    written: ["open_a_case.yaml", `${M1}.yaml`, "close_a_case.yaml"],
  }),
);
const listing = (d) => readdirSync(d, { recursive: true }).sort().join("\n");
const corpusBefore = listing(corpus);
const movesBefore = listing(join(repo, "moves"));

// (s) THE CANDIDATE SHEET over a Brief compose run: a unit refused then passed, and a unit of per-call-limit stops.
{
  const brief = join(root, "brief");
  mkdirSync(brief, { recursive: true });
  const bleg = (id, move) => ({
    leg_id: id,
    move,
    purpose: `The purpose of ${id}.`,
    claims: [],
  });
  const cand = (move2) => ({ candidate_id: "B", legs: [bleg("leg1", M1), bleg("leg2", move2)] });
  const fit = (v2) => ({
    version: "1",
    verdicts: [
      { leg_id: "leg1", move: M1, verdict: "consistent", why: "Leg 1 fits." },
      { leg_id: "leg2", move: M2, verdict: v2, why: `Leg 2 is ${v2}.` },
    ],
  });
  const rec = (unit, n, phase, answer, refusal = null) =>
    writeCallRecord(brief, unit, n, {
      prompt: "p",
      argv: [],
      cli: null,
      input: null,
      row: { phase },
      raw: "",
      answer,
      refusal,
    });
  rec("candidate-2", 1, "compose", cand(M2));
  rec("candidate-2", 2, "fit", fit("contradicts"), { text: "THE MOVE FIT WAS JUDGED" });
  rec("candidate-2", 3, "compose", cand(M2));
  rec("candidate-2", 4, "fit", fit("consistent"));
  for (const n of [1, 2, 3]) rec("candidate-1", n, "compose", undefined, { text: STOPPED });
  writeFileSync(
    join(brief, "reader-path-job.json"),
    JSON.stringify({
      state: "done",
      supervisor_pid: 0,
      units: [
        {
          id: "candidate-1",
          status: "refused",
          rounds: 3,
          call_1_s: 900,
          failure: { class: "call time limit", stderr_tail: STOPPED },
        },
        { id: "candidate-2", status: "done", rounds: 4, call_1_s: 700 },
        { id: "candidate-3", status: "done", rounds: 0 },
      ],
    }),
  );
  const candCli = (unit) =>
    spawnSync(
      process.execPath,
      ["src/paragraph-plan-playground/sheet.mjs", "candidate", "--run", brief, "--unit", unit],
      {
        encoding: "utf8",
      },
    );
  const c2 = candCli("candidate-2");
  const c2rounds = c2.stdout.split('id="calls"')[0].split('<h3 class="round">').slice(1);
  ok(
    c2.status === 0 && c2rounds.length === 2,
    `(s) candidate-2 does not render two Rounds: exit ${c2.status}, ${c2rounds.length}, ${c2.stderr}`,
  );
  ok(
    /<tr class="named"><td>leg2<\/td>/.test(block(c2rounds[0] || "", "Submission")) &&
      /<td>leg2<\/td><td>contradicts<\/td>/.test(block(c2rounds[0] || "", "Comment")),
    "(s) candidate-2's Round 1 does not carry `contradicts` on the refused Leg, highlighted in its Submission",
  );
  ok(
    count(block(c2rounds[1] || "", "Comment"), "<td>consistent</td>") === 2 &&
      !(c2rounds[1] || "").includes('class="named"'),
    "(s) candidate-2's Round 2 is not `consistent` on every Leg",
  );
  ok(
    block(c2rounds[0] || "", "Submission").includes(
      "<thead><tr><th>Leg</th><th>Move</th><th>Purpose</th></tr></thead>",
    ) && block(c2rounds[0] || "", "Submission").includes(`moves/${M1}.yaml"`),
    "(s) the Candidate's Submission is not the Leg, Move, Purpose table with the Move linked",
  );
  for (const r of c2rounds) {
    const blocks = [...r.matchAll(/<h4 class="th">([^<]*)<\/h4>/g)].map((m) => m[1]);
    ok(
      JSON.stringify(blocks) === JSON.stringify(CANDIDATE_ROUND_BLOCKS),
      `(s) a Candidate Round holds the blocks ${JSON.stringify(blocks)}`,
    );
  }
  const c1 = candCli("candidate-1").stdout;
  ok(
    count(c1, `no Submission: ${STOPPED}`) === 3 && count(c1, "not judged: ") === 3,
    "(s) candidate-1 does not render three stopped Rounds, each not judged",
  );
  const c9 = candCli("candidate-9");
  ok(
    c9.status === 1 && /candidate-1, candidate-2, candidate-3/.test(c9.stderr),
    `(s) an unknown unit is not refused naming the units: ${c9.stderr.trim()}`,
  );
  const noJob = spawnSync(
    process.execPath,
    ["src/paragraph-plan-playground/sheet.mjs", "candidate", "--run", join(root, "empty"), "--unit", "candidate-1"],
    { encoding: "utf8" },
  );
  ok(
    noJob.status === 1 && /reader-path-job\.json/.test(noJob.stderr),
    `(s) a directory with no job record is not refused naming the file: ${noJob.stderr.trim()}`,
  );
  // (r) THE MOVE'S CORPUS PASSAGE, read from the extraction records and written nowhere.
  const withCorpus = renderCandidate({ runDir: brief, unitId: "candidate-2", outDir: root, corpusDir: corpus });
  ok(
    !withCorpus.error &&
      withCorpus.html.includes(`moves/${M1}.yaml"`) &&
      withCorpus.html.includes("fixture-passage.md:7<") &&
      withCorpus.html.includes("lines 7–8"),
    `(r) the Move line does not link its file and its passage paragraph: ${withCorpus.error || ""}`,
  );
  const bare = renderCandidate({
    runDir: brief,
    unitId: "candidate-2",
    outDir: root,
    corpusDir: join(root, "no-corpus"),
  });
  ok(
    !bare.error && bare.html.includes(NO_RECORD) && !bare.html.includes("fixture-passage"),
    "(r) with no corpus/ the sheet does not render with the no-record line",
  );
  ok(
    listing(corpus) === corpusBefore && listing(join(repo, "moves")) === movesBefore,
    "(r) a file under corpus/ or moves/ was written",
  );
}

// (z) THE LEG SHEET IS REMOVED (kogaki#1884): `leg` prints the usage line, which names `candidate` alone, and exits 2.
{
  const leg = spawnSync(
    process.execPath,
    ["src/paragraph-plan-playground/sheet.mjs", "leg", "--run", root, "--leg", "leg1"],
    { encoding: "utf8" },
  );
  ok(
    leg.status === 2 &&
      /^usage: node src\/paragraph-plan-playground\/sheet\.mjs candidate /.test(leg.stderr) &&
      !/\bleg --run\b/.test(leg.stderr),
    `(z) \`leg\` does not print the usage line naming \`candidate\` alone and exit 2: exit ${leg.status}, ${leg.stderr.trim()}`,
  );
}

rmSync(root, { recursive: true, force: true });
if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log(
  "paragraph-plan-playground: 3 cases pass, the Candidate sheet of a Brief compose run (kogaki#1762, kogaki#1884)",
);
