import { readFileSync, readdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const REPO = process.cwd();
const imp = (p) => import(pathToFileURL(join(REPO, p)).href);
const fails = [];
let cases = 0;
const walk = (dir, keep) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name), keep) : keep(e.name) ? [join(dir, e.name)] : [],
  );
const posix = (p) => p.split(sep).join("/");

const { renderPromptFile } = await imp("src/prompt-file.mjs");
const files = walk(join(REPO, "prompts"), (n) => n.endsWith(".prompt")).map((f) => {
  const rel = posix(relative(join(REPO, "prompts"), f)).slice(0, -".prompt".length);
  const at = rel.lastIndexOf("/") + 1;
  const passage = rel[at] === "_" ? rel.slice(0, at) + rel.slice(at + 1) : null;
  return { path: `prompts/${rel}.prompt`, name: rel, passage, text: readFileSync(f, "utf8") };
});
if (!files.length) fails.push("prompts/ holds no prompt file");

for (const f of files) {
  cases++;
  try {
    renderPromptFile(f.name, {});
  } catch (e) {
    const parsedAndMarked = e.message.startsWith(`${f.path}: `);
    if (!parsedAndMarked) fails.push(`(a) ${f.path} does not render with the six marks: ${e.message}`);
  }
}

const srcFiles = walk(join(REPO, "src"), () => true).map((f) => ({
  path: posix(relative(REPO, f)),
  text: readFileSync(f, "utf8"),
}));
// A Python tool names its prompt file as a program does (kogaki#1863), and a question of the Draft review is named by
// the id of an item src/review-items.json does not answer by the Harness (`mode: mechanical`), since only the other items
// reach the judge.
const programs = [
  ...srcFiles.filter((s) => /\.(mjs|json)$/.test(s.path)),
  ...walk(join(REPO, "tools"), (n) => n.endsWith(".py")).map((f) => ({ text: readFileSync(f, "utf8") })),
];
const itemIds = JSON.parse(readFileSync("src/review-items.json", "utf8"))
  .items.filter((i) => i.mode !== "mechanical")
  .map((i) => i.id);
for (const f of files) {
  cases++;
  const byProgram = programs.some((s) => s.text.includes(`"${f.name}"`) || s.text.includes(`"prompts/${f.name}"`));
  const byPrompt = f.passage !== null && files.some((o) => o.text.includes(`{{> ${f.passage}}}`));
  const byItem = itemIds.some((id) => f.name === `review-draft/_question-${id}`);
  if (!byProgram && !byPrompt && !byItem) fails.push(`(b) ${f.path} is named by no row, no prompt file and no program`);
}

const MIN_LINE = 40;
for (const f of files) {
  cases++;
  const lines = f.text
    .replace(/\{\{!--[\s\S]*?--\}\}/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= MIN_LINE);
  for (const line of new Set(lines)) {
    const at = srcFiles.find((s) => s.text.includes(line));
    if (at) fails.push(`(c) a line of ${f.path} also stands in ${at.path}: ${JSON.stringify(line.slice(0, 100))}`);
  }
}

const C = await imp("checks/fixtures/prompt-files/cases.mjs");
const { judgePrompt } = await imp("src/workflow/judge.mjs");
const { bindFlow } = await imp("src/workflow/run-record.mjs");
const { FLOW } = await imp("src/paragraph-plan/stage.mjs");
const { pairedPlanRow } = await imp("src/structure-mapping-playground/short.mjs");
const { briefRecordText, legRecord } = await imp("src/compose.mjs");
const { readBrief, renderPacket, sectionsOf, sectionOfLeg } = await imp("src/draft.mjs");
const { renderAndStorePacket } = await imp("src/draft/render-packet.mjs");
const same = (name, render) => {
  cases++;
  let got;
  try {
    got = render();
  } catch (e) {
    fails.push(`(d) the ${name} prompt did not render: ${e.message}`);
    return;
  }
  const want = C.savedPrompt(name);
  if (got === want) return;
  let i = 0;
  while (got[i] === want[i]) i++;
  fails.push(
    `(d) the ${name} prompt differs from its saved text at byte ${i}: saved ${JSON.stringify(want.slice(i, i + 60))}, rendered ${JSON.stringify(String(got).slice(i, i + 60))}`,
  );
};

const plan = JSON.parse(readFileSync("src/paragraph-plan-workflow.json", "utf8"));
const inputText = JSON.stringify(C.PLAN_INPUT, null, 2);
const planRow = { id: "paragraph_plan_unit", ...plan.paragraph_plan_unit };
bindFlow(FLOW);
same("plan-leg-first-ask", () => judgePrompt(planRow, inputText, C.PLAN_INPUT, null));
same("plan-leg-reask-part", () => judgePrompt(planRow, inputText, C.PLAN_INPUT, C.PLAN_HISTORY.part));
same("plan-leg-reask-record", () => judgePrompt(planRow, inputText, C.PLAN_INPUT, C.PLAN_HISTORY.record));
same("judge-unit-reask", () =>
  judgePrompt(
    { id: "paragraph_plan_judge_unit", ...plan.paragraph_plan_judge_unit },
    JSON.stringify(C.JUDGE_INPUT, null, 2),
    C.JUDGE_INPUT,
    C.JUDGE_HISTORY,
  ),
);
bindFlow({ lane: "brief", label: "Structure-Mapping Playground" });
same("plan-leg-paired", () => judgePrompt(pairedPlanRow(plan), inputText, C.PLAN_INPUT, null));

// (d) EVERY TABLE ROW RENDERS AS SAVED BEFORE ITS MOVE (kogaki#1862), its schema text cut as the save cut it.
bindFlow(C.ROW_FLOW);
for (const r of C.ROWS) {
  const t = JSON.parse(readFileSync(r.table, "utf8"));
  const row = (t.states || []).find((s) => s && s.id === r.id) || { id: r.id, ...t[r.id] };
  cases++;
  let got;
  try {
    got = C.withoutSchemaText(judgePrompt(row, JSON.stringify(C.ROW_INPUT, null, 2), C.ROW_INPUT, C.ROW_HISTORY), row);
  } catch (e) {
    fails.push(`(d) the ${r.file} row did not render: ${e.message}`);
    continue;
  }
  const want = C.savedRow(r.file);
  if (got === want) continue;
  let i = 0;
  while (got[i] === want[i]) i++;
  fails.push(
    `(d) the ${r.file} row differs from its saved text at byte ${i}: saved ${JSON.stringify(want.slice(i, i + 60))}, rendered ${JSON.stringify(got.slice(i, i + 60))}`,
  );
}

// (h) EVERY PROGRAM'S CALL TEXT RENDERS AS SAVED BEFORE ITS SENTENCES MOVED (kogaki#1863): four programs, the Draft
// review and the two Python tools, from the fixed inputs of checks/fixtures/prompt-files/programs.mjs.
const P = await imp("checks/fixtures/prompt-files/programs.mjs");
const programTexts = await P.programTexts(imp);
{
  const texts = programTexts;
  const saved = readdirSync(P.PROGRAMS_DIR).filter((n) => n.endsWith(".txt"));
  if (saved.length !== texts.size)
    fails.push(`(h) ${saved.length} saved program text(s) for ${texts.size} case(s) -- each case has one saved file`);
  for (const [name, got] of texts) {
    cases++;
    let want;
    try {
      want = P.savedProgram(name);
    } catch {
      fails.push(`(h) the ${name} case has no saved text under ${P.PROGRAMS_DIR}`);
      continue;
    }
    if (got === want) continue;
    let i = 0;
    while (got[i] === want[i]) i++;
    fails.push(
      `(h) the ${name} text differs from its saved text at byte ${i}: saved ${JSON.stringify(want.slice(i, i + 60))}, rendered ${JSON.stringify(String(got).slice(i, i + 60))}`,
    );
  }
}

// (f) A TABLE WHOSE ROW CARRIES ITS INSTRUCTION IS REFUSED WHEN READ (kogaki#1862), naming the row and the key; the six
// tables as they stand are read clean.
const { instructionKeyRefusal } = await imp("src/workflow/run-record.mjs");
for (const table of [...new Set(C.ROWS.map((r) => r.table))]) {
  cases++;
  const t = JSON.parse(readFileSync(table, "utf8"));
  const clean = instructionKeyRefusal(t, table);
  if (clean) fails.push(`(f) ${table} is refused as it stands: ${clean}`);
  const r = C.ROWS.find((x) => x.table === table);
  const row = (t.states || []).find((s) => s && s.id === r.id) || t[r.id];
  for (const key of ["judgment_point", "input_shape", "refusal"]) {
    cases++;
    const why =
      instructionKeyRefusal(
        {
          ...t,
          ...(t.states ? {} : { [r.id]: { ...row, [key]: "x" } }),
          ...(t.states ? { states: t.states.map((s) => (s === row ? { ...s, [key]: "x" } : s)) } : {}),
        },
        table,
      ) || "";
    if (!why.includes(`\`${r.id}\``) || !why.includes(`\`${key}\``))
      fails.push(
        `(f) ${table} with \`${key}\` added to \`${r.id}\` is not refused naming both: ${why || "no refusal"}`,
      );
  }
}

// (g) AN AXIS'S SENTENCE IS ITS LINE OF THE JUDGE'S PROMPT FILE (kogaki#1862): a registry carrying one is refused when
// read, naming the axis.
{
  cases++;
  const { readAxes } = await imp("src/paragraph-plan/axes.mjs");
  const held = JSON.parse(readFileSync("src/paragraph-plan-axes.json", "utf8"));
  held.axes[0].sentence = "The run holds.";
  const dir = mkdtempSync(join(tmpdir(), "prompt-files-axes-"));
  writeFileSync(join(dir, "axes.json"), JSON.stringify(held));
  let why = "";
  try {
    readAxes(join(dir, "axes.json"));
  } catch (e) {
    why = e.message;
  }
  rmSync(dir, { recursive: true, force: true });
  if (!why.includes(`axis ${held.axes[0].id} carries \`sentence\``))
    fails.push(`(g) a registry carrying a sentence is not refused naming the axis: ${why || "no refusal"}`);
}

// (e) ONE SENTENCE, ONE JOB (kogaki#1858): every sentence line of each listed prompt file passes `axisSentenceRefusal`.
// A file joins the list when an Issue rewrites it, and the list is empty since kogaki#1876.
const ONE_SENTENCE_FILES = [];
const LABEL = /^(JUDGMENT POINT|REQUIRED RECORD SHAPE|WHAT IS REFUSED): /;
const { axisSentenceRefusal } = await imp("src/paragraph-plan/axes.mjs");
for (const path of ONE_SENTENCE_FILES) {
  cases++;
  const lines = readFileSync(path, "utf8").split("\n");
  const end = lines.findIndex((l) => l.startsWith("----- INPUT"));
  for (const [i, raw] of lines.slice(0, end < 0 ? lines.length : end).entries()) {
    const line = raw.trim();
    const mark = /^\{\{[^{}]*\}\}$/.test(line);
    const heading = /^[A-Z ]+$/.test(line);
    if (!line || mark || heading) continue;
    const why = axisSentenceRefusal(line.replace(LABEL, ""));
    if (why) fails.push(`(e) ${path} line ${i + 1} ${why}: ${JSON.stringify(line)}`);
  }
}

const briefPath = join(REPO, "checks", "fixtures", "prompt-files", "brief.yaml");
const scratch = mkdtempSync(join(tmpdir(), "prompt-files-"));
for (const [name, c] of Object.entries(C.WRITER_CASES)) {
  const r = C.writerBriefRecord(c);
  const text = briefRecordText({
    slug: r.slug,
    compose_path: r.compose_path,
    strands: r.strands,
    thesis: r.thesis,
    reader_path: r.legs.map(legRecord),
    strand_coverage: [],
    journey_coverage: [],
    tradeoffs: {},
    bridged: {},
  });
  const brief = readBrief(text, briefPath);
  brief.legs = brief.legs.map((l) =>
    l.leg_id === c.leg ? { ...l, ...c.extra } : { ...l, paragraphs: c.extra.paragraphs },
  );
  brief.path = briefPath;
  brief.slug = r.slug;
  const leg = brief.legs.find((l) => l.leg_id === c.leg);
  same(name, () => {
    const res = c.lang
      ? renderAndStorePacket(brief, c.leg, { lang: c.lang, "terms-path": C.TERMS }, scratch)
      : renderPacket({
          brief,
          leg,
          priorSections: c.prior,
          section: sectionOfLeg(brief.legs).get(c.leg),
          sections: sectionsOf(brief.legs),
        });
    if (res.error) throw new Error(res.error);
    return res.packet;
  });
}
rmSync(scratch, { recursive: true, force: true });

if (fails.length) {
  for (const f of fails) console.error(`FAIL ${f}`);
  process.exit(1);
}
console.log(
  `prompt-files: ${cases} case(s) pass, over ${files.length} prompt files and ${Object.keys(C.WRITER_CASES).length + 5 + C.ROWS.length + programTexts.size} saved cases`,
);
