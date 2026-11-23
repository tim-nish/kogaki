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

const { renderPromptFile, sentenceRefusal } = await imp("src/prompt-file.mjs");
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
const { briefRecordText, legRecord } = await imp("src/compose.mjs");
const { readBriefText, renderPacket, sectionsOf, sectionOfLeg } = await imp("src/draft.mjs");
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

// (h) EVERY PROGRAM'S CALL TEXT RENDERS AS SAVED BEFORE ITS SENTENCES MOVED (kogaki#1863): three programs, the Draft
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

// (f) A TABLE WHOSE ROW CARRIES ITS INSTRUCTION IS REFUSED WHEN READ (kogaki#1862), naming the row and the key; the five
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

// (e) ONE SENTENCE, ONE JOB (kogaki#1858): every sentence line of each listed prompt file passes `sentenceRefusal` (src/prompt-file.mjs).
// A file joins the list when an Issue rewrites it, and the list is empty since kogaki#1876.
const ONE_SENTENCE_FILES = [];
const LABEL = /^(JUDGMENT POINT|REQUIRED RECORD SHAPE|WHAT IS REFUSED): /;
for (const path of ONE_SENTENCE_FILES) {
  cases++;
  const lines = readFileSync(path, "utf8").split("\n");
  const end = lines.findIndex((l) => l.startsWith("----- INPUT"));
  for (const [i, raw] of lines.slice(0, end < 0 ? lines.length : end).entries()) {
    const line = raw.trim();
    const mark = /^\{\{[^{}]*\}\}$/.test(line);
    const heading = /^[A-Z ]+$/.test(line);
    if (!line || mark || heading) continue;
    const why = sentenceRefusal(line.replace(LABEL, ""));
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
  const brief = readBriefText(text, briefPath);
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

// (i) AN EMPTY BLOCK IS ABSENT (kogaki#1911): a Leg with no claim, no Journey, no Section title, no earlier prose and
// no budget, under audiences/dev-to-zenn.md, renders none of those blocks or labels, nor the crossing heading, no
// bracketed text saying a block is empty, and no two blank lines together.
{
  cases++;
  const c = C.WRITER_CASES["write-leg-opens-the-one-section"];
  const r = C.writerBriefRecord(c);
  const text = briefRecordText({
    slug: r.slug,
    compose_path: "audiences/dev-to-zenn.md",
    strands: r.strands,
    thesis: r.thesis,
    reader_path: r.legs.map(legRecord),
    strand_coverage: [],
    journey_coverage: [],
    tradeoffs: {},
    bridged: {},
  });
  const brief = readBriefText(text, briefPath);
  brief.path = briefPath;
  const leg = { ...brief.legs[0], claims: [], journeys: [], paragraphs: c.extra.paragraphs };
  delete leg.budget;
  const res = renderPacket({
    brief,
    leg,
    priorSections: [],
    section: sectionOfLeg(brief.legs).get(leg.leg_id),
    sections: sectionsOf(brief.legs),
  });
  const ABSENT = [
    "## The claims this Leg asserts",
    "## The Journey material this Leg edits",
    "## The Section this Leg sits in",
    "## The article so far, up to this Leg:",
    "**The reader's own world.**",
    "**Budget.**",
    "What crosses into this Leg",
  ];
  if (res.error) fails.push(`(i) the Packet of an empty Leg did not render: ${res.error}`);
  else {
    for (const h of ABSENT)
      if (res.packet.includes(h)) fails.push(`(i) the Packet of an empty Leg carries ${JSON.stringify(h)}`);
    const said = res.packet.match(/^\((none|nothing|no )[^)]*\)/m);
    if (said) fails.push(`(i) the Packet of an empty Leg says a block is empty: ${JSON.stringify(said[0])}`);
    if (res.packet.includes("\n\n\n")) fails.push("(i) the Packet of an empty Leg carries two blank lines together");
  }
}

// (j) THE WRITER'S INPUT SAYS WHAT TO DO: under audiences/dev-to-zenn.md, the input of a Leg whose plan block holds the
// table and the parts carries none of twelve strings that say what to leave out or quote a sample word.
{
  const c = C.WRITER_CASES["write-leg-opens-the-one-section"];
  const r = C.writerBriefRecord(c);
  const read = readBriefText(
    briefRecordText({
      slug: r.slug,
      compose_path: "audiences/dev-to-zenn.md",
      strands: r.strands,
      thesis: r.thesis,
      reader_path: r.legs.map(legRecord),
      strand_coverage: [],
      journey_coverage: [],
      tradeoffs: {},
      bridged: {},
    }),
    briefPath,
  );
  const brief = { ...read, record: { ...read.record, structure: C.PLAN_STRUCTURE }, path: briefPath };
  const leg = { ...brief.legs[0], ...c.extra, relation: "writes", segments: C.PLAN_PARTS };
  const res = renderPacket({
    brief,
    leg,
    priorSections: [],
    section: sectionOfLeg(brief.legs).get(leg.leg_id),
    sections: sectionsOf(brief.legs),
  });
  const flat = (res.packet || "").replace(/\n/g, " ");
  const planned = flat.includes("| {writes} |") && flat.includes("### The parts of the paragraph, in order");
  cases++;
  if (res.error) fails.push(`(j) the Writer's input of a planned Leg did not render: ${res.error}`);
  else if (!planned) fails.push("(j) the Writer's input of the fixture Leg holds no table and no parts");
  else
    for (const s of C.NOT_SAID) if (flat.includes(s)) fails.push(`(j) the Writer's input carries ${JSON.stringify(s)}`);
}

if (fails.length) {
  for (const f of fails) console.error(`FAIL ${f}`);
  process.exit(1);
}
console.log(
  `prompt-files: ${cases} case(s) pass, over ${files.length} prompt files and ${Object.keys(C.WRITER_CASES).length + C.ROWS.length + programTexts.size} saved cases`,
);
