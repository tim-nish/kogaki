import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
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
const programs = srcFiles.filter((s) => /\.(mjs|json)$/.test(s.path));
const snake = (n) => n.replace(/-/g, "_");
for (const f of files) {
  cases++;
  const byProgram = programs.some((s) => s.text.includes(`"${f.name}"`) || s.text.includes(`"prompts/${f.name}"`));
  const byPrompt = f.passage !== null && files.some((o) => o.text.includes(`{{> ${f.passage}}}`));
  const folder = f.name.slice(0, f.name.lastIndexOf("/") + 1);
  const leaf = f.passage === null ? "" : f.passage.slice(folder.length);
  const byRow =
    f.passage !== null &&
    programs.some(
      (s) =>
        s.text.includes(`"shared_text_file": "prompts/${folder.replace(/\/$/, "")}"`) &&
        s.text.includes(`{{shared:${snake(leaf)}}}`),
    );
  if (!byProgram && !byPrompt && !byRow) fails.push(`(b) ${f.path} is named by no row, no prompt file and no program`);
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
same("plan-leg-under-a-move-table", () =>
  judgePrompt(
    pairedPlanRow(plan, "structure-mapping-playground/plan-leg-under-a-move-table"),
    inputText,
    C.PLAN_INPUT,
    null,
  ),
);

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
  `prompt-files: ${cases} case(s) pass, over ${files.length} prompt files and ${Object.keys(C.WRITER_CASES).length + 6} saved cases`,
);
