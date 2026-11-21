// The cases of checks/check-structure-mapping-playground-senses.sh (kogaki#1847), each stated in that member's
// `contract` in checks/registry.json, over one invented paragraph of three sentences and fixture Moves:
//   (a) a run to the end: five reading calls, one joining call, the run record, the counts and the sheet;
//   (b) each refusal before any model call, by name, with nothing written; (c) `rankRefusal` and `joinRefusal`;
//   (d) a reading refused twice stops the run with no counts and no sheet; (e) the opposite part word rewritten;
//   (f) the order of a pair's answers and the Sense kept; (g) the Edges, an earlier Segment carrying one, a tie
//   and a Segment given two, each named on the sheet; (h) the sheet's tables; (i) moves/ and the plan table unchanged.
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  chmodSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const repo = resolve(".");
const fails = [];
// Each assertion is one case; the member compares the count with its `case_floor` (kogaki#661).
let cases = 0;
const ok = (cond, msg) => {
  cases++;
  if (!cond) fails.push(msg);
};
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const { stringifyYaml } = await imp("src/yaml.mjs");
const S = await imp("src/structure-mapping-playground/move-senses.mjs");
const { renderSensesSheet } = await imp("src/structure-mapping-playground/senses-sheet.mjs");
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const root = mkdtempSync(join(tmpdir(), "structure-mapping-playground-senses-"));
const trials = join(repo, "runs", "structure-mapping-playground");
mkdirSync(trials, { recursive: true });
const PLAN_TABLE = "src/paragraph-plan-workflow.json";
const planTableSha = sha(PLAN_TABLE);
const snapshot = () => {
  const rows = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else rows.push(`${p} ${s.size} ${s.mtimeMs}`);
    }
  };
  walk(join(repo, "moves"));
  return rows.sort().join("\n");
};
const before = snapshot();

// ---- the library: a Move of three Segments and a Move of one ----
const library = join(root, "moves");
mkdirSync(library);
writeFileSync(join(library, "ROLES.json"), readFileSync("moves/ROLES.json"));
const moveFile = (id, n) =>
  writeFileSync(
    join(library, `${id}.yaml`),
    stringifyYaml({
      id,
      description: "a fixture Move.",
      takes: [],
      leaves: [],
      breaks: ["breaks if the point is dropped."],
      segments: Array.from({ length: n }, () => ({})),
    }),
  );
moveFile("m3", 3);
moveFile("m1", 1);
const SENTENCES = [
  "The rule says every guard must report each night.",
  "But no one reads the reports.",
  "So the guards stop writing them.",
];
const source = join(root, "source.txt");
writeFileSync(source, `${SENTENCES.join(" ")}\n\nA second paragraph. It has two sentences.\n\nOne sentence alone.\n`);

// ---- the readings: pair (2, 3) answered as Cause.Reason by 2 in readings 4 and 5 ----
const sense = (s, by, holds = false) => ({ sense: s, played_by: by, holds });
const reading = (k) => ({
  pairs: [
    {
      pair: [1, 2],
      senses: [sense("Concession.Denier", 2, true), sense("Contrast", null), sense("Conjunction", null)],
    },
    {
      pair: [2, 3],
      senses: [
        k >= 4 ? sense("Cause.Reason", 2, true) : sense("Cause.Result", 3, true),
        sense("Cause+Belief.Result", 3),
        k === 5 ? sense("Asynchronous.Precedence", 2) : sense("Conjunction", null),
      ],
    },
  ],
});
const READINGS = [1, 2, 3, 4, 5].map(reading);
const answers = (name, list) => {
  const f = join(root, `${name}.json`);
  writeFileSync(f, JSON.stringify(list));
  return f;
};

// ---- the one fake model binary: the ranked readings from a list, the joining call from its own input ----
const judge = join(root, "fake-model.mjs");
writeFileSync(
  judge,
  `#!/usr/bin/env node
import { appendFileSync, writeSync, readFileSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-model 1.0"); process.exit(0); }
const dir = process.env.SMP_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const out = (r, stage) => {
    appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, prompt }) + "\\n");
    writeSync(1, JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0);
  };
  const marker = "----- INPUT (JSON) -----";
  const input = JSON.parse(prompt.slice(prompt.lastIndexOf(marker) + marker.length));
  const row = (id) => prompt.includes("\\\`" + id + "\\\` judgment point");
  if (row("smp_rank_senses")) {
    const list = JSON.parse(readFileSync(process.env.SMP_RANK_ANSWERS, "utf8"));
    let n = 0; try { n = readFileSync(dir + "/seen.jsonl", "utf8").split("\\n").filter(Boolean).filter((l) => JSON.parse(l).stage === "rank").length; } catch {}
    return out(list[Math.min(n, list.length - 1)], "rank");
  }
  if (row("smp_join_senses"))
    return out({ rows: input.rows.map((r) => ({ ...r, word: "JOIN-" + r.sense, second: input.sentences[r.pair[1] - 1].sentence })) }, "join");
  return out({}, "other");
});
`,
);
chmodSync(judge, 0o755);

const outRoot = mkdtempSync(join(trials, "check-senses-"));
const run = (name, args, extraEnv = {}) => {
  const dir = join(root, `run-${name}`);
  mkdirSync(dir, { recursive: true });
  const o = join(outRoot, name);
  const res = spawnSync(
    process.execPath,
    ["src/structure-mapping-playground/move-senses.mjs", "read", ...args.map((a) => (a === "@out" ? o : a))],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        KOGAKI_JUDGE_CLI: judge,
        SMP_FIXTURE_DIR: dir,
        SMP_RANK_ANSWERS: answers(`rank-${name}`, READINGS),
        ...extraEnv,
      },
      timeout: 300000,
    },
  );
  const at = (f) => join(o, f);
  const json = (f) => (existsSync(at(f)) ? JSON.parse(readFileSync(at(f), "utf8")) : null);
  const seen = existsSync(join(dir, "seen.jsonl"))
    ? readFileSync(join(dir, "seen.jsonl"), "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l))
    : [];
  return { res, o, at, json, seen, said: `${res.stdout}${res.stderr}` };
};
const ARGS = ["--move", "m3", "--source", source, "--paragraph", "1", "--out", "@out", "--library", library];

// (a) a run to the end
const a = run("main", ARGS);
const rec = a.json(S.RUN_FILE) || {};
const counts = a.json(S.COUNTS_FILE) || {};
ok(a.res.status === 0, `(a) the run exited ${a.res.status}: ${a.said}`);
ok(
  JSON.stringify(a.seen.map((x) => x.stage)) === JSON.stringify(["rank", "rank", "rank", "rank", "rank", "join"]),
  `(a) the calls are not five readings and one joining call: ${a.seen.map((x) => x.stage)}`,
);
ok(rec.state === "finished" && rec.stopped === null, `(a) the run record does not say the run finished: ${rec.state}`);
ok(
  rec.move && rec.move.id === "m3" && rec.move.sha256 === sha(join(library, "m3.yaml")),
  `(a) the run record does not name the Move file and its digest: ${JSON.stringify(rec.move)}`,
);
ok(rec.source && rec.source.sha256 === sha(source), "(a) the run record does not carry the source file's digest");
ok(
  rec.paragraph === 1 && JSON.stringify(rec.sentences) === JSON.stringify(SENTENCES),
  `(a) the run record's paragraph or sentences are not the cut: ${JSON.stringify(rec.sentences)}`,
);
ok(
  [1, 2, 3, 4, 5].every((k) => existsSync(a.at(`reading-${k}/calls/smp_rank_senses/1/prompt.md`))) &&
    existsSync(a.at("join/calls/smp_join_senses/1/prompt.md")),
  `(a) a Call Record is missing: ${existsSync(a.at("reading-1/calls")) ? readdirSync(a.at("reading-1/calls")) : "no calls dir"}`,
);
ok(existsSync(a.at(S.SHEET_FILE)) && rec.sheet, "(a) sheet.html is missing");
const firstPrompt = a.seen[0] ? a.seen[0].prompt : "";
ok(
  firstPrompt.includes("Concession.Denier: a causal relation expected") &&
    firstPrompt.includes("1. read the sentences") === false &&
    firstPrompt.includes('"sentence": "But no one reads the reports."'),
  "(a) the reading call is not handed the numbered sentences and the list of Senses",
);
const join1 = a.seen[5] ? a.seen[5].prompt : "";
ok(
  join1.includes('"rows"') && join1.includes("smp_join_senses"),
  "(a) the joining call is not the smp_join_senses row handed `rows`",
);

// (b) each refusal before any model call, with nothing written
const refusedRun = (name, args, want) => {
  const r = run(name, args);
  ok(
    r.res.status === 1 && r.said.includes(want) && r.said.includes("no model call was made"),
    `(b) ${name}: not refused naming ${JSON.stringify(want)}: ${r.said}`,
  );
  ok(!r.seen.length && !existsSync(r.o), `(b) ${name}: a model call was made or something was written`);
};
const without = (flag) => {
  const i = ARGS.indexOf(`--${flag}`);
  return [...ARGS.slice(0, i), ...ARGS.slice(i + 2)];
};
for (const f of S.FLAGS) refusedRun(`no-${f}`, without(f), `\`--${f}\` is required`);
refusedRun("no-value", [...without("paragraph"), "--paragraph"], "`--paragraph` is required and takes a value");
refusedRun(
  "unknown-move",
  ARGS.map((x) => (x === "m3" ? "nope" : x)),
  "names no Move of the library",
);
refusedRun(
  "no-source",
  ARGS.map((x) => (x === source ? join(root, "absent.txt") : x)),
  "names no file",
);
refusedRun(
  "paragraph-0",
  ARGS.map((x, i) => (ARGS[i - 1] === "--paragraph" ? "0" : x)),
  "not a whole number from 1 to 3",
);
refusedRun(
  "paragraph-9",
  ARGS.map((x, i) => (ARGS[i - 1] === "--paragraph" ? "9" : x)),
  "--paragraph 9 is not a whole number from 1 to 3",
);
refusedRun(
  "paragraph-text",
  ARGS.map((x, i) => (ARGS[i - 1] === "--paragraph" ? "two" : x)),
  "--paragraph two is not",
);
refusedRun(
  "count",
  ARGS.map((x, i) => (ARGS[i - 1] === "--paragraph" ? "2" : x)),
  "paragraph 2 has 2 sentences, and the Move m3 has 3 Segments",
);
refusedRun(
  "one-segment",
  ARGS.map((x, i) => (ARGS[i - 1] === "--paragraph" ? "3" : x === "m3" ? "m1" : x)),
  "has one Segment",
);
const outside = run(
  "outside",
  ARGS.map((x) => (x === "@out" ? join(root, "elsewhere") : x)),
);
ok(
  outside.res.status === 1 && outside.said.includes("is not a directory under runs/structure-mapping-playground/"),
  `(b) an --out outside the Playground's runs is not refused: ${outside.said}`,
);
ok(!outside.seen.length && !existsSync(join(root, "elsewhere")), "(b) an --out outside the runs was written");
const again = spawnSync(
  process.execPath,
  ["src/structure-mapping-playground/move-senses.mjs", "read", ...ARGS.map((x) => (x === "@out" ? a.o : x))],
  {
    encoding: "utf8",
    env: { ...process.env, KOGAKI_JUDGE_CLI: join(root, "absent-binary") },
  },
);
ok(
  again.status === 1 && `${again.stderr}`.includes("already holds a run"),
  `(b) an --out holding a run is not refused: ${again.stderr}`,
);

// (c) the two validators, each refusal by name
const names = S.senseNames(S.loadSenses());
const good = () => JSON.parse(JSON.stringify(READINGS[0]));
const rank = (mutate) => {
  const r = good();
  mutate(r);
  return S.rankRefusal(r, 3, names);
};
const rankCases = [
  ["an undeclared key", (r) => (r.extra = 1), "carries `extra`"],
  ["a missing key", (r) => delete r.pairs, "carries no `pairs`"],
  ["a pairs count", (r) => r.pairs.pop(), "`pairs` carries 1 entries"],
  ["a pair out of order", (r) => (r.pairs[1].pair = [1, 3]), "pairs[1].pair is [1,3]"],
  ["two Senses", (r) => r.pairs[0].senses.pop(), "pairs[0].senses carries 2 Senses"],
  ["an undeclared Sense key", (r) => (r.pairs[0].senses[0].why = "x"), "pairs[0].senses[0] carries `why`"],
  ["an unknown Sense", (r) => (r.pairs[0].senses[1].sense = "Surprise"), 'pairs[0].senses[1].sense is "Surprise"'],
  [
    "a Sense without its part word",
    (r) => (r.pairs[0].senses[0].sense = "Concession"),
    'is "Concession", which is no name',
  ],
  [
    "a part played by no sentence of the pair",
    (r) => (r.pairs[1].senses[0].played_by = 1),
    "pairs[1].senses[0].played_by is 1",
  ],
  ["a played_by where no part", (r) => (r.pairs[0].senses[1].played_by = 1), "Contrast has no part word"],
  ["a holds not true or false", (r) => (r.pairs[0].senses[0].holds = "yes"), 'pairs[0].senses[0].holds is "yes"'],
  [
    "the same answer after the rewriting",
    (r) => (r.pairs[1].senses[1] = sense("Cause.Reason", 2)),
    "pairs[1].senses[1] says the same of the pair as pairs[1].senses[0]",
  ],
];
for (const [what, mutate, want] of rankCases) {
  const r = rank(mutate);
  ok(
    r && r.text.includes(want),
    `(c) rankRefusal: ${what} is not refused naming ${JSON.stringify(want)}: ${r && r.text}`,
  );
}
ok(S.rankRefusal(good(), 3, names) === null, "(c) rankRefusal refuses a good reading");
const rows = S.joinRows(S.countPairs(READINGS, 3, names));
const goodJoin = () => ({ rows: rows.map((r) => ({ ...r, word: "so", second: "it ends." })) });
const joined = (mutate) => {
  const j = goodJoin();
  mutate(j);
  return S.joinRefusal(j, rows);
};
const joinCases = [
  ["an undeclared key", (j) => (j.note = 1), "carries `note`"],
  ["a missing key", (j) => delete j.rows[0].word, "rows[0] carries no `word`"],
  ["a rows count", (j) => j.rows.pop(), `\`rows\` carries ${rows.length - 1} entries`],
  ["a row not repeating its Sense", (j) => (j.rows[1].sense = "Similarity"), 'rows[1].sense is "Similarity"'],
  ["a row not repeating its pair", (j) => (j.rows[0].pair = [2, 3]), "rows[0].pair is [2,3]"],
  ["an empty word", (j) => (j.rows[2].word = " "), "rows[2].word is empty"],
  ["an empty second", (j) => (j.rows[3].second = ""), "rows[3].second is empty"],
];
for (const [what, mutate, want] of joinCases) {
  const r = joined(mutate);
  ok(
    r && r.text.includes(want),
    `(c) joinRefusal: ${what} is not refused naming ${JSON.stringify(want)}: ${r && r.text}`,
  );
}
ok(S.joinRefusal(goodJoin(), rows) === null, "(c) joinRefusal refuses a good answer");

// (d) a reading refused twice stops the run
const bad = { pairs: [] };
const d = run("refused", ARGS, { SMP_RANK_ANSWERS: answers("extra-refused", [READINGS[0], READINGS[1], bad, bad]) });
const drec = d.json(S.RUN_FILE) || {};
ok(d.res.status === 1, `(d) a reading refused twice did not stop the run: ${d.said}`);
ok(
  drec.state === "stopped" && /^reading-3: /.test(drec.stopped || ""),
  `(d) the run record does not name reading 3 as the stop: ${drec.stopped}`,
);
ok(
  !existsSync(d.at(S.SHEET_FILE)) && !existsSync(d.at(S.COUNTS_FILE)) && !d.seen.some((x) => x.stage === "join"),
  "(d) a stopped run counted, joined or wrote a sheet",
);
ok(
  d.seen[3] && d.seen[3].prompt.includes("`pairs` carries 0 entries"),
  "(d) the retried reading does not carry the first refusal",
);

// (e) the opposite part word rewritten, (f) the order and the Sense kept
const p2 = (counts.pairs || [])[1] || { answers: [] };
const cause = p2.answers.filter((x) => x.sense.startsWith("Cause."));
ok(
  cause.length === 1 && cause[0].sense === "Cause.Result" && cause[0].played_by === 3 && cause[0].among === 5,
  `(e) Cause.Reason by 2 and Cause.Result by 3 are not counted as one answer: ${JSON.stringify(cause)}`,
);
ok(
  JSON.stringify(p2.answers.map((x) => x.sense)) ===
    JSON.stringify(["Cause.Result", "Cause+Belief.Result", "Conjunction", "Asynchronous.Succession"]),
  `(f) the pair (2, 3)'s answers are not in order: ${p2.answers.map((x) => x.sense)}`,
);
ok(
  JSON.stringify(p2.answers[0].places) === "[5,0,0]" && p2.answers[0].held === 5 && p2.answers[2].among === 4,
  `(f) the counts are not the readings': ${JSON.stringify(p2.answers.slice(0, 3))}`,
);
const ordered = S.countPairs(
  [
    {
      pairs: [
        { pair: [1, 2], senses: [sense("Contrast", null), sense("Similarity", null), sense("Conjunction", null)] },
      ],
    },
    {
      pairs: [
        { pair: [1, 2], senses: [sense("Similarity", null), sense("Conjunction", null), sense("Contrast", null)] },
      ],
    },
  ],
  2,
  names,
)[0];
ok(
  JSON.stringify(ordered.answers.map((x) => x.sense)) === JSON.stringify(["Similarity", "Contrast", "Conjunction"]),
  `(f) answers in as many readings are not ordered by the sum of places, then the list: ${ordered.answers.map((x) => x.sense)}`,
);
ok(ordered.kept === null && ordered.tie.length === 2, "(f) a tie for the most first places kept a Sense");
ok(
  JSON.stringify((counts.pairs || []).map((p) => p.kept)) ===
    JSON.stringify([
      { sense: "Concession.Denier", played_by: 2 },
      { sense: "Cause.Result", played_by: 3 },
    ]),
  `(f) the Senses kept are not the ones most often first: ${JSON.stringify((counts.pairs || []).map((p) => p.kept))}`,
);

// (g) the Edges
ok(
  JSON.stringify(counts.segments) ===
    JSON.stringify([
      { segment: 1, discourse_relation: null },
      { segment: 2, discourse_relation: { sense: "Concession.Denier", rel_type: null, to: [1] } },
      { segment: 3, discourse_relation: { sense: "Cause.Result", rel_type: null, to: [2] } },
    ]),
  `(g) the Segments' Edges are not the kept Senses': ${JSON.stringify(counts.segments)}`,
);
const edges = (counts.segments || []).map((s) => s.discourse_relation).filter(Boolean);
ok(
  edges.length &&
    edges.every((e) => JSON.stringify(Object.keys(e).sort()) === '["rel_type","sense","to"]' && e.rel_type === null),
  `(g) an Edge does not carry exactly sense, rel_type and to with rel_type null: ${JSON.stringify(edges)}`,
);
const earlier = S.edgesOf(
  [
    { pair: [1, 2], kept: { sense: "Instantiation.Instance", played_by: 1 }, tie: null },
    { pair: [2, 3], kept: { sense: "Conjunction", played_by: null }, tie: null },
  ],
  3,
);
ok(
  earlier.segments &&
    JSON.stringify(earlier.segments[0].discourse_relation) ===
      JSON.stringify({ sense: "Instantiation.Instance", rel_type: null, to: [2] }) &&
    earlier.segments[2].discourse_relation.to[0] === 2,
  `(g) an Edge played by the earlier Segment is not carried by it: ${JSON.stringify(earlier.segments)}`,
);
const sheetOf = (pairs) => {
  const e = S.edgesOf(pairs, 3);
  return {
    e,
    html: renderSensesSheet({
      moveId: "m3",
      paragraph: 1,
      sentences: SENTENCES,
      counts: { pairs, segments: e.segments, none: e.none },
      joins: [],
      readings: [],
      prompts: [null, null],
      names,
      readingCount: 5,
    }),
  };
};
const tieRun = run("tie", ARGS, {
  SMP_RANK_ANSWERS: answers("extra-tie", [
    READINGS[0],
    READINGS[0],
    {
      pairs: [
        { pair: [1, 2], senses: [sense("Contrast", null), sense("Concession.Denier", 2), sense("Conjunction", null)] },
        READINGS[0].pairs[1],
      ],
    },
    {
      pairs: [
        { pair: [1, 2], senses: [sense("Contrast", null), sense("Concession.Denier", 2), sense("Conjunction", null)] },
        READINGS[0].pairs[1],
      ],
    },
    {
      pairs: [
        { pair: [1, 2], senses: [sense("Conjunction", null), sense("Concession.Denier", 2), sense("Contrast", null)] },
        READINGS[0].pairs[1],
      ],
    },
  ]),
});
const tieCounts = tieRun.json(S.COUNTS_FILE) || {};
const tieSheet = existsSync(tieRun.at(S.SHEET_FILE)) ? readFileSync(tieRun.at(S.SHEET_FILE), "utf8") : "";
ok(
  tieRun.res.status === 0 && tieCounts.segments === null && /pair \(1, 2\)/.test(tieCounts.none || ""),
  `(g) a tie wrote Edges or did not name the pair: ${tieCounts.none}`,
);
ok(
  tieSheet.includes("no Edges are written: in the pair (1, 2)") &&
    (tieSheet.match(/<caption>Segments /g) || []).length === 2,
  "(g) the sheet does not name the tied pair, or does not show its tables all the same",
);
const twice = sheetOf([
  { pair: [1, 2], answers: [], kept: { sense: "Cause.Result", played_by: 2 }, tie: null },
  { pair: [2, 3], answers: [], kept: { sense: "Cause.Reason", played_by: 2 }, tie: null },
]);
ok(
  twice.e.segments === null && twice.html.includes("Segment 2 would carry two Edges"),
  `(g) one Segment given two Edges is not named on the sheet: ${twice.e.none}`,
);

// (h) the sheet's tables
const sheet = existsSync(a.at(S.SHEET_FILE)) ? readFileSync(a.at(S.SHEET_FILE), "utf8") : "";
const tables = sheet.split("<caption>Segments ").slice(1);
ok(tables.length === 2, `(h) the sheet has ${tables.length} pair tables, and three Segments have two pairs`);
ok(
  tables.every((t) => ((t.split("<tbody>")[1] || "").split("</tbody>")[0].match(/<tr/g) || []).length === 3),
  "(h) a pair table holds other than three rows, though the pair (2, 3) has four answers",
);
ok(
  sheet.includes(
    'Cause+Belief.Result<span class="meaning">evidence is provided to cause the hearer to believe a claim.</span>',
  ),
  "(h) a Sense is not shown with its meaning in the same cell",
);
ok(
  sheet.includes(`${SENTENCES[1]} <b>JOIN-Cause.Result</b> ${SENTENCES[2]}`),
  "(h) the joined sentences are not the first sentence, the word in bold and `second`",
);
ok(
  sheet.includes("which of each pair's three Senses fits the Move best") && sheet.includes("<svg"),
  "(h) the sheet's opening line or its picture is missing",
);
ok(
  sheet.includes("&quot;Cause.Reason&quot;") && sheet.includes("instruction of the joining call"),
  "(h) the folded part does not hold every answer as given and the two instructions",
);

// (i) moves/ and the plan table unchanged
ok(snapshot() === before, "(i) a file under moves/ changed");
ok(sha(PLAN_TABLE) === planTableSha, "(i) src/paragraph-plan-workflow.json changed");

if (fails.length) {
  console.log(fails.map((f) => `FAIL ${f}`).join("\n"));
  process.exit(1);
}
console.log(`structure-mapping-playground-senses: ${cases} case(s) pass`);
