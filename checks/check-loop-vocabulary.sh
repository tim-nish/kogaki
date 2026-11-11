#!/usr/bin/env bash
# check-loop-vocabulary -- the feedback loop's retired word stays out of the code, the checks and the draft-pipeline
# spec (kogaki#1760). The loop is named Round, Submission, Verdict, Comment, Binding and Call (specs/spec-draft-pipeline/
# SPEC.md §4.19.4); the word it replaced is refused as a word or inside an identifier, in any case, under src/, checks/,
# specs/spec-draft-pipeline/SPEC.md and the judge-loop paragraphs of specs/spec-terrain/SPEC.md. ALLOWED lists, by file
# and text, the uses that are not the loop's: the ordinary English verb and noun, the names a run written before
# kogaki#1760 carries (read, never written), and the word a validator refuses in a model's prose.
#   (a) the tree passes;
#   (b) a line declaring the word as an identifier, added to src/workflow/detached-job.mjs, fails naming the file and line;
#   (c) the retired module name written into specs/spec-draft-pipeline/SPEC.md fails naming the file and line.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const WORD = new RegExp(["at", "tempt"].join(""), "i");
const SELF = "checks/check-loop-vocabulary.sh";
// The judge-loop paragraphs of the Terrain spec, each named by the sentence it opens on; the rest of that spec is
// Terrain's own vocabulary and is not read.
const TERRAIN_SPEC = "specs/spec-terrain/SPEC.md";
const TERRAIN_PARAGRAPHS = ["**A refused response is RE-ASKED", "**The judgment provenance state `observed` now has a producer**",
  "**A timeout is not re-asked.**"];
// [file, text]: a line of `file` holding `text` is read with `text` removed.
const ALLOWED = [
  // The ordinary English verb and noun.
  ["src/workflow/strands.mjs", "`not-attempted`"],
  ["src/workflow/strands.mjs", '"not-attempted"'],
  ["src/render-figure.mjs", "deliberately not attempted here"],
  ["src/lint-ja.mjs", "nothing here attempts a general YAML grammar"],
  ["src/deps-registry.json", "BEFORE the regex attempt"],
  ["src/workflow/gate.mjs", "one per attempt,"],
  ["checks/check-terrain-hook-invocation.sh", "A resumption attempt"],
  ["checks/check-terrain-hook-invocation.sh", "a resumption attempt carried"],
  ["checks/check-terrain-hook-invocation.sh", "attempt visible instead of silently dropped"],
  // Quoted historical notes.
  ["src/leg-schema.json", "a refusal that had already spent an attempt"],
  ["src/leg-schema.json", "its three attempts. Two runs on 2026-09-18"],
  // The names a run or a settings file written before the rename carries, read where the new name is absent.
  ["src/workflow/call-record.mjs", 'dir: "attempts"'], ["src/workflow/call-record.mjs", 'records: "attempt_records"'], ["src/workflow/call-record.mjs", 'firstCallS: "attempt_1_s"'], ["src/workflow/call-record.mjs", 'unitBound: "unit_attempts"'], ["src/workflow/call-record.mjs", 'count: "attempts"'], ["src/workflow/call-record.mjs", 'roundsFile: "attempts.json"'],
  ["src/workflow/judge.mjs", '"brief.unit_attempts": "brief.unit_rounds"'], ["src/workflow/judge.mjs", '"paragraph_plan.leg_attempts": "paragraph_plan.leg_revisions"'],
  // The word the ParagraphPlan's prose validator refuses in a model's answer, and the instruction naming it.
  ["src/paragraph-plan/site-retry.mjs", "/\\w*attempt\\w*/i"],
  ["src/paragraph-plan/site-retry.mjs", "carries no word of the refusal, the attempt,"],
  ["src/paragraph-plan-workflow.json", "carrying `refus`, `attempt`, `kogaki#`"],
  ["src/paragraph-plan-workflow.json", "carry no word of the refusal, the attempt, the shape"],
  // The run history quoted in Terrain's judge note: the attempts of runs, never the loop's own names.
  ["src/terrain-workflow.json", "two of three attempts exceeded it"],
  ["src/terrain-workflow.json", "a first-attempt-clean advance cost"],
  ["src/terrain-workflow.json", "all three licensed attempts"],
  ["src/terrain-workflow.json", "three exhausted attempts"],
];

const paragraphs = (text, openers) => text.split(/\n\s*\n/).filter((p) => openers.some((o) => p.trimStart().startsWith(o)));

// Every match under `root`, as `file:line: text`. `files` are repository-relative.
function scan(root, files) {
  const found = [];
  for (const f of files) {
    if (f === SELF) continue;
    const text = readFileSync(join(root, f), "utf8");
    const lines = text.split("\n");
    const allowed = ALLOWED.filter(([af]) => af === f).map(([, t]) => t);
    const inScope = f === TERRAIN_SPEC
      ? new Set(paragraphs(text, TERRAIN_PARAGRAPHS).flatMap((p) => { const at = text.indexOf(p); const first = text.slice(0, at).split("\n").length; return p.split("\n").map((_, i) => first + i); }))
      : null;
    lines.forEach((line, i) => {
      if (inScope && !inScope.has(i + 1)) return;
      const rest = allowed.reduce((l, t) => l.split(t).join(""), line);
      if (WORD.test(rest)) found.push(`${f}:${i + 1}: ${line.trim().slice(0, 160)}`);
    });
  }
  return found;
}

const tracked = execFileSync("git", ["ls-files", "--", "src", "checks", "specs/spec-draft-pipeline/SPEC.md", TERRAIN_SPEC], { encoding: "utf8" })
  .split("\n").filter((f) => f && existsSync(f));
const fails = [];

// (a) the tree
const tree = scan(".", tracked);
if (tree.length) fails.push(`(a) the retired loop word is still used:\n  ${tree.join("\n  ")}`);
for (const p of TERRAIN_PARAGRAPHS) {
  if (!paragraphs(readFileSync(TERRAIN_SPEC, "utf8"), [p]).length) fails.push(`(a) ${TERRAIN_SPEC} has no paragraph opening on ${p}: the judge-loop paragraphs were not read`);
}

// (b), (c) the same scan over a copy carrying one added line each
const tmp = mkdtempSync(join(tmpdir(), "loop-vocabulary-"));
const copy = (f, add) => { mkdirSync(join(tmp, dirname(f)), { recursive: true }); writeFileSync(join(tmp, f), readFileSync(f, "utf8") + add); };
const ENGINE = "src/workflow/detached-job.mjs";
const SPEC = "specs/spec-draft-pipeline/SPEC.md";
copy(ENGINE, `const ${["at", "tempts"].join("")} = 1;\n`);
copy(SPEC, `${["at", "tempt"].join("")}-record\n`);
const engineLine = readFileSync(join(tmp, ENGINE), "utf8").split("\n").length - 1;
const specLine = readFileSync(join(tmp, SPEC), "utf8").split("\n").length - 1;
const mutated = scan(tmp, [ENGINE, SPEC]);
if (!mutated.some((m) => m.startsWith(`${ENGINE}:${engineLine}: `))) fails.push(`(b) an identifier added to ${ENGINE} was not refused naming ${ENGINE}:${engineLine}: ${JSON.stringify(mutated)}`);
if (!mutated.some((m) => m.startsWith(`${SPEC}:${specLine}: `))) fails.push(`(c) the retired module name written into ${SPEC} was not refused naming ${SPEC}:${specLine}: ${JSON.stringify(mutated)}`);
rmSync(tmp, { recursive: true, force: true });

if (fails.length) { for (const f of fails) console.log(`FAIL: ${f}`); process.exit(1); }
console.log(`ok: check-loop-vocabulary -- ${tracked.length} files read, the retired loop word appears only where ALLOWED lists it`);
JS
