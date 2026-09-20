#!/usr/bin/env node
// lint-ja — the Japanese-realization Lint (kogaki#1158).
//
// THE OWNER'S MODEL (2026-09-19/20, kogaki#1158): a Japanese Draft is a
// second realization of the same Brief Steps, generated from the Packet with
// one added language block, never a translation of the reviewed English
// Draft — translating from the reviewed Draft would make the later Reverse
// Outlining evaluation target expand implicitly to cover two transformations
// (the English generation and the translation) at once, which the owner
// wanted to avoid. Three evaluation classes exist, each with its own judge:
// Round Trip (src/review-draft.mjs, unchanged machinery), Lint (this file,
// deterministic, no model), and a Fluency read
// (theses/<slug>/fluency-notes.md, no model evaluator — nothing here or
// anywhere scores naturalness).
//
// LINT RUNS BEFORE ROUND TRIP, and the ground for the ordering is recorded
// with the Terminology List Decision below: a term-list deviation is a
// surface-form defect a mechanical pass catches cheaply, and running the
// Round Trip's model judgment over prose that Lint would have refused
// anyway spends a judgment call on a defect this file already names for
// free.
//
// THE TERMINOLOGY LIST DECISION: terms/prh.yml is the ONE repository-wide
// term carrier — for each concept, the prescribed Japanese form, its
// forbidden variants (leaked English, katakana variant, notation variant)
// and a note. It is used TWICE: rendered into the Packet's language block at
// generation (src/draft.mjs `--lang ja`), and run as this Lint after. A
// term-list change is a CORRECTION, never a regeneration — the owner does
// not require the Draft to be uniquely reproducible, so re-deriving a Draft
// from a moved list is not owed; only the Steps the Lint names are corrected.
//
// THE VERSIONING RULE: conformance is decided by the Lint against the
// CURRENT list, never by what constrained generation. `terms_sha_at_lint`
// is what src/review-draft.mjs's precondition reads; `terms_sha_at_generation`
// is a birth record only, and this Lint recomputes conformance against
// terms/prh.yml as it stands at lint time regardless of what the Draft was
// generated against.
//
// NO MODEL IS EVER INVOKED HERE. Every check in this file is a deterministic
// function of its inputs: the same Draft and the same term list produce the
// same output on every run (Removal Test, acceptance item 6). textlint,
// textlint-rule-preset-ja-technical-writing and textlint-rule-prh ARE
// dependencies of this repository (kogaki#1162, discharging kogaki#1158
// acceptance item 2): term/prh conformance and the technical-writing
// preset's register rules both run through textlint, over `.textlintrc.json`
// at the repository root, against the Draft body text — textlint's Markdown
// parser checks text nodes only, so code fences, inline code and link
// targets are outside the term scan BY CONSTRUCTION rather than by a scope
// this file has to carve out itself (kogaki#1161's ja-lint-scan-scope
// finding, on PR #1159's native matcher, cannot recur). The structure-
// identity check and the Latin-script language-confusion detector are still
// implemented natively here — neither is a textlint rule's job, and no
// package covers them.
//
// EVERY DEVIATION IS NAMED WITH ITS STEP, never a line number alone: a
// deviation's Step id is read off the Draft's own frontmatter trace (the
// same `step_id`/`lines` shape src/draft.mjs `emit` writes), so a correction
// pass can act on named Steps without re-deriving which one a line belongs
// to.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

// textlint, its kernel and the markdown/prh packages are LOADED LAZILY, by
// dynamic import inside the functions that need them, rather than statically
// at module top: src/draft.mjs imports THIS module for parseTermsYaml/
// renderLanguageBlock/sha256/DEFAULT_TERMS_PATH alone, and src/review-draft.mjs
// imports src/draft.mjs in turn — so a static top-level import here would put
// three npm packages on the load path of every review-draft.mjs invocation,
// including the `soloWithout` self-test fixtures that run a COPY of `src/`
// from a temp directory with no `node_modules` beside it (kogaki#1162 PR
// round 1: those fixtures never call the Lint, but a static import fails at
// module load regardless of whether the function is ever called).
let textlintModulesPromise = null;
function loadTextlintModules() {
  if (!textlintModulesPromise) {
    textlintModulesPromise = Promise.all([
      import("textlint"),
      import("@textlint/kernel"),
      import("@textlint/textlint-plugin-markdown"),
      import("textlint-rule-prh"),
    ]).then(([textlint, kernel, markdownPluginModule, prhRuleModule]) => ({
      createLinter: textlint.createLinter,
      loadTextlintrc: textlint.loadTextlintrc,
      TextlintKernel: kernel.TextlintKernel,
      // Both packages ship as CJS with an `__esModule`-less `module.exports`,
      // so a dynamic ESM import lands the WHOLE exports object (carrying a
      // `default` key) rather than unwrapping it — `.default` recovers the
      // actual plugin/rule module textlint's kernel expects (a
      // `{ linter, fixer }` shape), verified against this exact package pair.
      markdownPlugin: markdownPluginModule.default?.default ?? markdownPluginModule.default ?? markdownPluginModule,
      prhRule: prhRuleModule.default?.default ?? prhRuleModule.default ?? prhRuleModule,
    }));
  }
  return textlintModulesPromise;
}

function fail(msg) {
  process.stderr.write(`lint-ja: ${msg}\n`);
  process.exit(1);
}

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// The term list is resolved BESIDE THE RUNTIME (this file's own directory,
// which is `src/`), never against the working directory a command happens to
// be invoked from — `terms/prh.yml` sits at the repository root, one level
// up from `src/`, and every caller (this file, src/draft.mjs,
// src/review-draft.mjs) reads the same constant rather than each hand-rolling
// its own cwd-relative default.
export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_TERMS_PATH = join(REPO_ROOT, "terms", "prh.yml");

function argString(args, key, usage) {
  const v = args[key];
  if (typeof v !== "string" || v === "") fail(usage);
  return v;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else { args[key] = next; i++; }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

// ---------------------------------------------------------------------------
// The term list. A DELIBERATELY RESTRICTED YAML SUBSET — real, parseable
// YAML (a top-level `rules:` sequence of mappings with `expected`, `patterns`
// and an optional `note`), hand-parsed because this repository carries no
// YAML library. Any file outside this shape refuses by name rather than
// being silently misread; nothing here attempts a general YAML grammar.
export function parseTermsYaml(text) {
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].match(/^rules:\s*$/) === null) {
    if (lines[i].trim() !== "" && !lines[i].trim().startsWith("#")) {
      // Non-comment, non-blank content before `rules:` that is not the key
      // itself is outside the shape this parser reads.
    }
    i++;
  }
  if (i >= lines.length) return { error: "carries no top-level `rules:` key — the prh.yml shape is a `rules:` sequence" };
  i++;
  const rules = [];
  let cur = null;
  const stripQuotes = (s) => {
    const t = s.trim();
    const m = /^"(.*)"$/.exec(t) || /^'(.*)'$/.exec(t);
    return m ? m[1] : t;
  };
  for (; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === "" || raw.trim().startsWith("#")) continue;
    const itemM = /^ {2}- expected:\s*(.+)$/.exec(raw);
    if (itemM) {
      cur = { expected: stripQuotes(itemM[1]), patterns: [], note: null };
      rules.push(cur);
      continue;
    }
    const patternsHdrM = /^ {4}patterns:\s*$/.exec(raw);
    if (patternsHdrM) { continue; }
    const patternItemM = /^ {6}- (.+)$/.exec(raw);
    if (patternItemM && cur) { cur.patterns.push(stripQuotes(patternItemM[1])); continue; }
    const noteM = /^ {4}note:\s*(.+)$/.exec(raw);
    if (noteM && cur) { cur.note = stripQuotes(noteM[1]); continue; }
    return { error: `line ${i + 1} ("${raw.trim().slice(0, 60)}") is outside the parsed shape (a \`- expected:\` item, its \`patterns:\` list, or its \`note:\`)` };
  }
  if (!rules.length) return { error: "the `rules:` sequence is empty — the term list must seed at least one entry" };
  for (const r of rules) {
    if (!r.expected) return { error: "a rule carries no `expected` form" };
  }
  return { rules };
}

// The language block's own register statement — nothing but the term list
// and the register, until a Round Trip failure names what is missing (the
// owner's 2026-09-19 ruling).
const REGISTER_NOTE = "Plain, formal technical-writing register: declarative sentences, no colloquial contraction, "
  + "and the term list below is prescriptive — every concept it covers is written in its `expected` form and never "
  + "in a listed forbidden variant.";

export function renderLanguageBlock(rules, terms_sha, lang) {
  const lines = [
    `## Language block (lang: ${lang})`,
    "",
    "This Step is realized in Japanese. The term list below is the ONLY term carrier (terms/prh.yml) — ",
    "for each concept, the prescribed Japanese form and the variants that are forbidden in this Draft.",
    "",
    `_terms_sha: ${terms_sha}_`,
    "",
    REGISTER_NOTE,
    "",
    "| expected | forbidden variants |",
    "|---|---|",
    ...rules.map((r) => `| ${r.expected} | ${r.patterns.join(", ") || "(none recorded)"} |`),
  ];
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Reading a Japanese Draft — the SAME frontmatter shape src/draft.mjs `emit`
// writes (a `---`-delimited head, a `trace:` array of one-JSON-object-per-line
// entries carrying `step_id` and `lines`), read the same way
// src/review-draft.mjs's `readDraft` reads it: a line scan matching the
// writer, never a general YAML parser.
export function readJaDraft(text, path) {
  const lines = text.split("\n");
  if (lines[0] !== "---") return { error: `${path} opens with no frontmatter — a Japanese Draft carries its record half (terms_sha_at_generation, trace) in frontmatter` };
  let end = -1;
  for (let i = 1; i < lines.length; i++) { if (lines[i] === "---") { end = i; break; } }
  if (end === -1) return { error: `${path} has an unterminated frontmatter block` };
  const fmText = lines.slice(0, end + 1).join("\n");
  const trace = [];
  let inTrace = false;
  for (let i = 1; i < end; i++) {
    const l = lines[i];
    if (l === "trace:") { inTrace = true; continue; }
    if (inTrace) {
      const m = l.match(/^ {2}- (\{.*\})\s*$/);
      if (m) { try { trace.push(JSON.parse(m[1])); } catch { /* malformed entry — trace stays without it */ } continue; }
      if (!l.startsWith("  ")) inTrace = false;
    }
  }
  const genM = fmText.match(/^terms_sha_at_generation:\s*(\S+)\s*$/m);
  const lintM = fmText.match(/^terms_sha_at_lint:\s*(\S+)\s*$/m);
  const bodyLines = lines.slice(end + 2);
  if (bodyLines.length && bodyLines[bodyLines.length - 1] === "") bodyLines.pop();
  const body = bodyLines.join("\n");
  return { path, text, lines, frontmatterEnd: end, fmText, body, trace, terms_sha_at_generation: genM ? genM[1] : null, terms_sha_at_lint: lintM ? lintM[1] : null };
}

// The Step a body line belongs to, from the trace's recorded `lines` spans
// (1-based, over the whole file, frontmatter included — the same convention
// `emit` writes). A line outside every span names none, and the caller
// states that rather than guessing.
export function stepAtLine(trace, fileLine) {
  for (const t of trace) {
    if (Array.isArray(t.lines) && fileLine >= t.lines[0] && fileLine <= t.lines[1]) return t.step_id;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1. textlint: term/prh conformance against terms/prh.yml AND the
// technical-writing preset's register rules, both run in one pass over
// `.textlintrc.json` at the repository root (kogaki#1162). A single linter
// is loaded once per process and reused — textlint's own config load is not
// a function of the Draft, and re-loading it per call would make every
// finding pay a fixed cost the Removal Test's identical-bytes claim does not
// need paid twice.
let cachedLinter = null;
function getTextlintLinter() {
  if (!cachedLinter) {
    cachedLinter = loadTextlintModules()
      .then(({ createLinter, loadTextlintrc }) => loadTextlintrc({ configFilePath: join(REPO_ROOT, ".textlintrc.json") })
        .then((descriptor) => createLinter({ descriptor })));
  }
  return cachedLinter;
}

// Every textlint finding — prh's and the preset's alike — is named with its
// Step AND its rule id (acceptance item 4), read the same way every other
// check here reads a Step: off the trace, by the file line the finding's
// own (1-based, body-relative) line number resolves to.
export async function checkTextlint(body, trace, bodyLineOffset) {
  const linter = await getTextlintLinter();
  const result = await linter.lintText(body, "draft.ja.md");
  return result.messages.map((m) => {
    const fileLine = m.line + bodyLineOffset;
    const step = stepAtLine(trace, fileLine);
    const message = m.message.replace(/\s*\n\s*/g, " ").trim();
    return {
      step_id: step,
      message: `${step ? `step ${step}` : "an unattributed line"}: [${m.ruleId}] ${message}`,
    };
  });
}

// ---------------------------------------------------------------------------
// The fix mode (acceptance item 5): `textlint --fix` with ONLY the prh rule
// wired in — never the preset, whose findings a mechanical fix cannot safely
// apply. Built directly against @textlint/kernel rather than a second
// `.textlintrc*` file, because the ONLY config this repository owns
// (`.textlintrc.json`, kogaki#1162's licensed file) is the full preset+prh
// pairing the Lint reads, and a second committed config carrying a narrowed
// rule set would be a second, undeclared contract to keep in sync with it.
export async function fixPrhOnly(body, termsPath) {
  const { TextlintKernel, markdownPlugin, prhRule } = await loadTextlintModules();
  const kernel = new TextlintKernel();
  const result = await kernel.fixText(body, {
    ext: ".md",
    filePath: "draft.ja.md",
    plugins: [{ pluginId: "markdown", plugin: markdownPlugin }],
    rules: [{ ruleId: "prh", rule: prhRule, options: { rulePaths: [termsPath] } }],
  });
  return result.output;
}

// ---------------------------------------------------------------------------
// 2. Structure identity against the Brief. Compared to the sibling English
// CanonicalDraft (theses/<slug>/draft.md), which is itself the rendering of
// the Brief's declared Section structure (SPEC-draft-pipeline, the Section
// grouping): Section heading count (and position-wise emptiness), code-fence
// count, and link count. RUNS ONLY WHEN THE SIBLING IS PRESENT — its absence
// is itself named as a finding by the caller (lintDraftJa), never a silent
// skip, so a Japanese Draft with no English sibling cannot pass this Lint by
// having nothing to compare against.
function headingsOf(body) {
  const unfenced = body.replace(/^```[\s\S]*?^```[ \t]*$/gm, "");
  return [...unfenced.matchAll(/^(#{1,6})\s+(.+?)\s*$/gm)].map((m) => m[2].trim());
}
function fencesOf(body) {
  return (body.match(/^```/gm) || []).length / 2;
}
function linksOf(body) {
  const unfenced = body.replace(/^```[\s\S]*?^```[ \t]*$/gm, "");
  return (unfenced.match(/\[[^\]]*\]\([^)]*\)/g) || []).length;
}

export function checkStructureIdentity(jaBody, enBody, trace) {
  const findings = [];
  const jaH = headingsOf(jaBody), enH = headingsOf(enBody);
  if (jaH.length !== enH.length) {
    findings.push({ step_id: null, message: `structure identity: the Japanese Draft renders ${jaH.length} Section heading(s) against the English Draft's ${enH.length} — both realize the same Brief Steps and the same Section grouping, so the counts must match` });
  } else {
    for (let i = 0; i < jaH.length; i++) {
      // A heading is compared by POSITION only, never by text — the two are
      // different languages by design. A missing heading (empty string) at a
      // position the English side carries one is what is named.
      if (jaH[i].trim() === "") {
        findings.push({ step_id: null, message: `structure identity: Section heading ${i + 1} is empty in the Japanese Draft where the English Draft carries "${enH[i]}"` });
      }
    }
  }
  const jaFences = fencesOf(jaBody), enFences = fencesOf(enBody);
  if (jaFences !== enFences) {
    findings.push({ step_id: null, message: `structure identity: the Japanese Draft carries ${jaFences} code fence(s) against the English Draft's ${enFences}` });
  }
  const jaLinks = linksOf(jaBody), enLinks = linksOf(enBody);
  if (jaLinks !== enLinks) {
    findings.push({ step_id: null, message: `structure identity: the Japanese Draft carries ${jaLinks} link(s) against the English Draft's ${enLinks}` });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// 3. Language-confusion detector: a run of Latin-script text where Japanese
// prose is expected, outside code fences, inline code, and URLs. A short run
// (an acronym, a product name) is not flagged — the threshold is a run of 8
// or more consecutive Latin-script/space/digit characters, long enough to be
// a stray English sentence fragment rather than a term.
const LATIN_RUN = /[A-Za-z][A-Za-z0-9 ,.'"!?;:()-]{7,}[A-Za-z0-9)"'.]/g;

export function checkLanguageConfusion(body, trace, bodyLineOffset) {
  const findings = [];
  // Strip fenced code blocks, inline code, and bare/markdown URLs before the
  // scan — none of those are prose Japanese is expected in. BLANKING
  // PRESERVES NEWLINES: replacing a whole multi-line match with a single run
  // of spaces (its total length) collapses every line the match spans into
  // one line once the scan is split on "\n", which drifts every later line's
  // attribution. Replacing character-by-character (newlines kept as
  // newlines, everything else turned to a space) keeps the line count, and
  // so the line-index-based Step attribution below, intact.
  const blank = (m) => m.replace(/[^\n]/g, " ");
  let scan = body.replace(/^```[\s\S]*?^```[ \t]*$/gm, blank);
  scan = scan.replace(/`[^`]*`/g, blank);
  scan = scan.replace(/https?:\/\/\S+/g, blank);
  scan = scan.replace(/\[[^\]]*\]\([^)]*\)/g, blank);
  const bodyLines = scan.split("\n");
  let offset = 0;
  for (let ln = 0; ln < bodyLines.length; ln++) {
    const line = bodyLines[ln];
    for (const m of line.matchAll(LATIN_RUN)) {
      const fileLine = ln + 1 + bodyLineOffset;
      const step = stepAtLine(trace, fileLine);
      findings.push({
        step_id: step,
        message: `${step ? `step ${step}` : "an unattributed line"}: a Latin-script run outside code/inline-code/URLs — "${m[0].trim()}" — where Japanese prose is expected`,
      });
    }
    offset += line.length + 1;
  }
  return findings;
}

// ---------------------------------------------------------------------------
// 4. Staleness: names the ABSENCE of terms_sha_at_generation only, never a
// mismatch. The versioning rule (top of file) is why: conformance is decided
// by term/prh conformance against the CURRENT list directly (checkPrh,
// above), never by comparing a birth-record hash to the current one — a
// Draft corrected after the term list moved must be able to pass without its
// fixed-at-generation terms_sha_at_generation ever catching up, and
// terms_sha_at_lint is this same Lint's own output, recomputed fresh below on
// every run rather than read back and compared. What this check reports is
// narrower: that the Draft carries a birth record at all.
export function checkStaleness(draft, currentSha) {
  const findings = [];
  if (!draft.terms_sha_at_generation) {
    findings.push({ step_id: null, message: "staleness: the Draft carries no terms_sha_at_generation — it was not generated by src/draft.mjs --lang ja against a recorded term list" });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// The aggregate Lint. NEVER INVOKES A MODEL: every check above is a pure
// function of the Draft text, the trace, the term list and (for structure
// identity) the sibling English Draft. On a clean pass, writes
// terms_sha_at_lint into the frontmatter — ON A CLEAN PASS ONLY, so a
// stale/failing Draft never reads as freshly linted.
export async function lintDraftJa({ jaText, jaPath, enBody, enPath, termsText }) {
  const draft = readJaDraft(jaText, jaPath);
  if (draft.error) return { error: draft.error };
  const parsed = parseTermsYaml(termsText);
  if (parsed.error) return { error: `terms/prh.yml is not readable as the prh.yml shape: ${parsed.error}` };
  const currentSha = sha256(termsText);
  const bodyLineOffset = draft.frontmatterEnd + 2; // 1-based file line of body line 1, minus 1

  // AN ABSENT ENGLISH SIBLING IS A NAMED FINDING, NEVER A SILENT SKIP: a
  // Japanese Draft with no sibling to check structure identity against has
  // had that check SKIPPED, not PASSED, and reading a skip as a pass is
  // exactly the fail-open this repository refuses elsewhere. So the absence
  // itself is reported, and (since findings.length is then nonzero) no
  // terms_sha_at_lint is written for it.
  const findings = [
    ...await checkTextlint(draft.body, draft.trace, bodyLineOffset),
    ...(enBody !== null
      ? checkStructureIdentity(draft.body, enBody, draft.trace)
      : [{ step_id: null, message: `structure identity: no sibling English Draft found at ${enPath ?? "(unspecified)"} — the Japanese Draft's Section, fence and link structure cannot be checked against the Brief's declared structure without it` }]),
    ...checkLanguageConfusion(draft.body, draft.trace, bodyLineOffset),
    ...checkStaleness(draft, currentSha),
  ];

  if (findings.length) {
    return { findings, clean: false };
  }

  // CLEAN PASS: write terms_sha_at_lint, and terms_sha_at_lint only. No other
  // frontmatter field is touched — a Lint pass is a record of conformance,
  // never a second writer of the Draft's realization record.
  let newText;
  if (draft.terms_sha_at_lint !== null) {
    newText = draft.text.replace(/^terms_sha_at_lint:\s*\S+\s*$/m, `terms_sha_at_lint: ${currentSha}`);
  } else if (draft.terms_sha_at_generation !== null) {
    newText = draft.text.replace(/^(terms_sha_at_generation:.*)$/m, `$1\nterms_sha_at_lint: ${currentSha}`);
  } else {
    // No generation record at all — still writable; the field is added right
    // after the opening `---`.
    newText = draft.text.replace(/^---\s*$/m, `---\nterms_sha_at_lint: ${currentSha}`);
  }
  return { findings: [], clean: true, terms_sha_at_lint: currentSha, newText };
}

// ---------------------------------------------------------------------------
async function cmdLint(args) {
  const jaPath = argString(args, "draft", "usage: lint-ja.mjs lint --draft <draft.ja.md> [--terms <terms/prh.yml>] [--en-draft <draft.md>]");
  const termsPath = typeof args.terms === "string" && args.terms !== "" ? args.terms : DEFAULT_TERMS_PATH;
  let jaText, termsText;
  try { jaText = readFileSync(jaPath, "utf8"); } catch (e) { fail(`the Draft at ${jaPath} cannot be read (${e.message})`); }
  try { termsText = readFileSync(termsPath, "utf8"); } catch (e) { fail(`the term list at ${termsPath} cannot be read (${e.message})`); }
  let enBody = null;
  const enPath = typeof args["en-draft"] === "string" && args["en-draft"] !== ""
    ? args["en-draft"]
    : jaPath.replace(/\.ja\.md$/, ".md");
  if (existsSync(enPath)) {
    const enText = readFileSync(enPath, "utf8");
    const lines = enText.split("\n");
    let end = -1;
    for (let i = 1; i < lines.length; i++) { if (lines[i] === "---") { end = i; break; } }
    if (end !== -1) {
      const bodyLines = lines.slice(end + 2);
      if (bodyLines.length && bodyLines[bodyLines.length - 1] === "") bodyLines.pop();
      enBody = bodyLines.join("\n");
    }
  }
  const r = await lintDraftJa({ jaText, jaPath, enBody, enPath, termsText });
  if (r.error) fail(r.error);
  if (!r.clean) {
    process.stderr.write(`lint-ja: ${r.findings.length} deviation(s) — the Draft is NOT marked lint-clean (no terms_sha_at_lint written):\n`);
    for (const f of r.findings) process.stderr.write(`  - ${f.message}\n`);
    process.exit(1);
  }
  writeFileSync(jaPath, r.newText);
  process.stdout.write(`lint-ja: clean pass — terms_sha_at_lint: ${r.terms_sha_at_lint} written to ${jaPath}\n`);
}

// Rebuilds the full Draft file from its own frontmatter (lines 0..frontmatterEnd+1,
// the closing `---` plus the blank line after it, UNTOUCHED) and a new body —
// the same line-array reconstruction readJaDraft's own split performed in
// reverse, so a fix that changes no body byte changes no file byte either.
function withBody(draft, newBody) {
  const head = draft.lines.slice(0, draft.frontmatterEnd + 2);
  const newBodyLines = newBody.split("\n");
  const hadTrailingNewline = draft.text.endsWith("\n");
  const allLines = [...head, ...newBodyLines, ...(hadTrailingNewline ? [""] : [])];
  return allLines.join("\n");
}

// ---------------------------------------------------------------------------
// The fix subcommand (acceptance item 5): runs textlint's fixer with ONLY
// the prh rule against the Draft's body, and writes back the file only when
// a byte changed — a no-op fix (nothing prh-fixable found) is not itself an
// error, so it prints and exits clean rather than failing.
async function cmdFix(args) {
  const jaPath = argString(args, "draft", "usage: lint-ja.mjs fix --draft <draft.ja.md> [--terms <terms/prh.yml>]");
  const termsPath = typeof args.terms === "string" && args.terms !== "" ? args.terms : DEFAULT_TERMS_PATH;
  let jaText;
  try { jaText = readFileSync(jaPath, "utf8"); } catch (e) { fail(`the Draft at ${jaPath} cannot be read (${e.message})`); }
  const draft = readJaDraft(jaText, jaPath);
  if (draft.error) fail(draft.error);
  const fixedBody = await fixPrhOnly(draft.body, termsPath);
  if (fixedBody === draft.body) {
    process.stdout.write(`lint-ja: fix — no prh replacement applied to ${jaPath}\n`);
    return;
  }
  writeFileSync(jaPath, withBody(draft, fixedBody));
  process.stdout.write(`lint-ja: fix — prh replacement(s) applied to ${jaPath}\n`);
}

// The sibling English CanonicalDraft's body, read the same way `cmdLint`
// reads it — a raw line scan for the frontmatter close, never a general
// parser. Shared here because `correct-terms` runs the same Lint `cmdLint`
// does and needs the same sibling to check structure identity against.
function readEnBody(enPath) {
  if (!existsSync(enPath)) return null;
  const enText = readFileSync(enPath, "utf8");
  const lines = enText.split("\n");
  let end = -1;
  for (let i = 1; i < lines.length; i++) { if (lines[i] === "---") { end = i; break; } }
  if (end === -1) return null;
  const bodyLines = lines.slice(end + 2);
  if (bodyLines.length && bodyLines[bodyLines.length - 1] === "") bodyLines.pop();
  return bodyLines.join("\n");
}

// ---------------------------------------------------------------------------
// THE TERM-LIST CHANGE PATH (kogaki#1165, discharging kogaki#1160 acceptance
// item 3). THE TERMINOLOGY LIST DECISION (top of this file) states it and
// this is the act that keeps the statement true: a term-list change is a
// CORRECTION, never a whole-Draft re-derivation.
//
// THE ORDER IS THE MECHANICAL FIX FIRST (acceptance item 4, kogaki#1162 item
// 4): `fixPrhOnly` runs before this function ever asks the Lint which Steps
// still carry a deviation, so a deviation textlint's fixer can rewrite is
// never spent on a model correction — it is simply gone by the time the
// Steps are named.
//
// WHAT THIS FUNCTION DOES NOT DO: it never invokes a model, and it never
// touches a Step this pass did not name. Once the mechanical fix has run, the
// Steps a subsequent Lint pass still names are exactly the Steps a model
// correction is owed for, and correcting THOSE is `src/review-draft.mjs
// open --only-steps`'s job — a separate act, over the Round Trip's own
// closed inputs, that this function only reports the way into.
export async function correctTerms({ jaText, jaPath, enBody, enPath, termsText, termsPath }) {
  const before = readJaDraft(jaText, jaPath);
  if (before.error) return { error: before.error };
  const fixedBody = await fixPrhOnly(before.body, termsPath);
  const fixApplied = fixedBody !== before.body;
  const afterFixText = fixApplied ? withBody(before, fixedBody) : jaText;
  const lintResult = await lintDraftJa({ jaText: afterFixText, jaPath, enBody, enPath, termsText });
  if (lintResult.error) return { error: lintResult.error };
  // UNIQUE, SORTED, NON-NULL — a Step named twice (once per deviation) is
  // corrected once, an unattributed finding (structure identity, a missing
  // sibling) names no Step and corrects nothing, and the order is stable so
  // two runs over the same fixture report the same Steps in the same order.
  const namedSteps = [...new Set(
    (lintResult.findings || []).map((f) => f.step_id).filter((id) => id !== null),
  )].sort();
  return {
    fixApplied,
    newText: afterFixText,
    clean: lintResult.clean,
    findings: lintResult.findings || [],
    namedSteps,
  };
}

async function cmdCorrectTerms(args) {
  const usage = "usage: lint-ja.mjs correct-terms --draft <draft.ja.md> [--terms <terms/prh.yml>] [--en-draft <draft.md>]";
  // ACCEPTANCE ITEM 3, THE REFUSAL ITSELF: no flag on this path offers a
  // whole-Draft re-derivation, and `--regenerate` is kept as a NAMED refusal
  // rather than left as an ordinary unknown flag, so a session that reaches
  // for the obvious wrong tool is told why rather than left to guess.
  if (args.regenerate) {
    fail("correct-terms refuses --regenerate: the Terminology List Decision (top of this file) states a "
      + "term-list change is a CORRECTION, never a whole-Draft re-derivation — the owner does not require "
      + "the Draft to be uniquely reproducible, so re-deriving it from a moved term list is not owed. "
      + "Only the Steps this pass names below are corrected.");
  }
  const jaPath = argString(args, "draft", usage);
  const termsPath = typeof args.terms === "string" && args.terms !== "" ? args.terms : DEFAULT_TERMS_PATH;
  let jaText, termsText;
  try { jaText = readFileSync(jaPath, "utf8"); } catch (e) { fail(`the Draft at ${jaPath} cannot be read (${e.message})`); }
  try { termsText = readFileSync(termsPath, "utf8"); } catch (e) { fail(`the term list at ${termsPath} cannot be read (${e.message})`); }
  const enPath = typeof args["en-draft"] === "string" && args["en-draft"] !== ""
    ? args["en-draft"]
    : jaPath.replace(/\.ja\.md$/, ".md");
  const enBody = readEnBody(enPath);

  const r = await correctTerms({ jaText, jaPath, enBody, enPath, termsText, termsPath });
  if (r.error) fail(r.error);

  if (r.fixApplied) {
    writeFileSync(jaPath, r.newText);
    process.stdout.write(`lint-ja: correct-terms — the mechanical fix (kogaki#1162) rewrote ${jaPath} first, before the bounded correction\n`);
  }

  if (r.namedSteps.length === 0) {
    process.stdout.write(`lint-ja: correct-terms — nothing to correct: after the mechanical fix, Lint names no Step`
      + `${r.clean ? " (a clean pass)" : " (every remaining finding is unattributed)"}. `
      + "No model is invoked and the Round Trip is not re-entered.\n");
    for (const f of r.findings) process.stdout.write(`  - ${f.message}\n`);
    return;
  }

  process.stdout.write(`lint-ja: correct-terms — Lint names ${r.namedSteps.length} Step(s) after the mechanical fix: ${r.namedSteps.join(", ")}.\n`
    + "Re-enter the Round Trip scoped to exactly those Steps — no other Step is re-outlined, re-compared or re-realized, "
    + "and no whole-Draft regeneration is offered on this path (the Terminology List Decision):\n"
    + `  node src/review-draft.mjs open --draft ${jaPath} --only-steps ${r.namedSteps.join(",")}\n`);
}

// ---------------------------------------------------------------------------
// The Removal Test's self-test (acceptance item 5). Six cases: five construct
// a defect and assert this file (or, for cases d and e, the review-draft.mjs
// precondition) refuses or produces by name, and case (f) is the CONTROL ARM —
// the clean pass those five never reach, without which every refusal could be
// correct while the pass itself was broken. NO MODEL IS INVOKED — every case
// drives pure functions or a subprocess of another runtime's own
// deterministic refusal.
async function runSelfTest() {
  const { mkdtempSync, mkdirSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const root = mkdtempSync(join(tmpdir(), "lint-ja-selftest-"));
  let passed = 0; const failures = [];
  const ok = (name, cond) => { if (cond) passed++; else failures.push(name); };

  const termsText = readFileSync(DEFAULT_TERMS_PATH, "utf8");
  const termsSha = sha256(termsText);

  // (a) — idempotency AND Step attribution in one case: a fixture carrying a
  // forbidden term lints identically on two runs (no model invoked), and its
  // one finding is attributed to the Step whose trace span covers the body
  // line it sits on. The span is [8, 8] — the fixture's frontmatter is 6
  // lines (```` --- ```` through the closing ```` --- ````) plus one blank
  // line, so the body's first (and only) line is file line 8; a span of
  // [7, 7] (the prior shape of this fixture) covers the blank line instead
  // and asserts nothing about attribution.
  {
    const draft1 = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [8, 8]}`,
      "---",
      "",
      "このWebサイトはクリーンです。",
    ].join("\n");
    const enBody1 = "This site is clean.";
    const r1 = await lintDraftJa({ jaText: draft1, jaPath: "fixture.ja.md", enBody: enBody1, termsText });
    const r2 = await lintDraftJa({ jaText: draft1, jaPath: "fixture.ja.md", enBody: enBody1, termsText });
    ok("case (a): a fixture lints identically on two runs, and its finding is attributed to the Step whose trace span covers the body line",
      r1.clean === false && r2.clean === false
      && r1.findings.length === r2.findings.length && r1.findings.length > 0
      && r1.findings.every((f) => f.step_id === "s1") && r2.findings.every((f) => f.step_id === "s1")
      && r1.findings.some((f) => f.message.includes("Webサイト")));
  }

  // (b) — acceptance item 2: a three-line code fence, then a forbidden
  // Latin-script run, reports that run with the Step whose trace covers the
  // line AFTER the fence — the line-attribution-after-a-fence defect (blanking
  // that collapsed the fence's newlines before checkLanguageConfusion split
  // on them).
  {
    const draft2 = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [9, 11]}`,
      `  - {"step_id": "s2", "lines": [12, 12]}`,
      "---",
      "",
      "```",
      "code",
      "```",
      "This is a long English sentence for testing purposes.",
    ].join("\n");
    const r = await lintDraftJa({ jaText: draft2, jaPath: "fixture.ja.md", enBody: null, enPath: "theses/fixture/draft.md", termsText });
    ok("case (b): a Latin-script run after a three-line code fence is attributed to the Step whose trace covers the line after the fence",
      r.findings.some((f) => f.step_id === "s2" && f.message.includes("English sentence")));
  }

  // (c) — acceptance item 1: a Japanese Draft with no English sibling is
  // refused with a finding naming the missing sibling, and no
  // terms_sha_at_lint is written (a skipped structure check is not a clean
  // pass).
  {
    const draft3 = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [8, 8]}`,
      "---",
      "",
      "これはクリーンな日本語の一文です。",
    ].join("\n");
    const enPath = "theses/fixture/draft.md";
    const r = await lintDraftJa({ jaText: draft3, jaPath: "fixture.ja.md", enBody: null, enPath, termsText });
    ok("case (c): a Japanese Draft with no English sibling is refused, naming the missing sibling, with no terms_sha_at_lint written",
      r.clean === false && r.terms_sha_at_lint === undefined
      && r.findings.some((f) => f.message.includes(enPath)));
  }

  // (d) — acceptance item 4: src/review-draft.mjs `open`, run from a
  // directory other than the repository root, still reads the term list —
  // the freshness check's refusal names the CORRECTLY COMPUTED current hash
  // (proving the list was read) rather than "cannot be read" (which is what
  // a cwd-relative default produces once the invoking directory moves).
  {
    const dir = join(root, "case-d");
    mkdirSync(dir, { recursive: true });
    const draft4 = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [7, 7]}`,
      "---",
      "",
      "これはクリーンな日本語の一文です。",
    ].join("\n");
    const jaPath = join(dir, "draft.ja.md");
    writeFileSync(jaPath, draft4);
    const runtime = join(dirname(fileURLToPath(import.meta.url)), "review-draft.mjs");
    let out = "", code = 0;
    try {
      execFileSync(process.execPath, [runtime, "open", "--draft", jaPath], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      out = (e.stderr || "") + (e.stdout || "");
      code = e.status ?? 1;
    }
    ok("case (d): review-draft.mjs open reads the term list when run from a directory other than the repository root",
      code !== 0 && out.includes(termsSha) && !out.includes("cannot be read"));
  }

  // (e) — review-draft.mjs run on a fixture with a stale terms_sha_at_lint is
  // refused, naming both hashes. Drives the REAL runtime as a subprocess (the
  // precondition lives in src/review-draft.mjs, not here), asserting only its
  // observable refusal — no model is invoked by either side.
  {
    const dir = join(root, "case-e");
    mkdirSync(dir, { recursive: true });
    const stale = "0".repeat(64);
    const draft5 = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      `terms_sha_at_lint: ${stale}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [9, 9]}`,
      "---",
      "",
      "これはクリーンな日本語の一文です。",
    ].join("\n");
    const jaPath = join(dir, "draft.ja.md");
    writeFileSync(jaPath, draft5);
    const runtime = join(dirname(fileURLToPath(import.meta.url)), "review-draft.mjs");
    let stderrOut = "", code = 0;
    try {
      execFileSync(process.execPath, [runtime, "open", "--draft", jaPath], { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      stderrOut = (e.stderr || "") + (e.stdout || "");
      code = e.status ?? 1;
    }
    ok("case (e): review-draft.mjs refuses a stale terms_sha_at_lint, naming both hashes",
      code !== 0 && stderrOut.includes(stale) && stderrOut.includes(termsSha));
  }

  // (f) — THE CLEAN PASS ITSELF, which is the behaviour src/review-draft.mjs
  // trusts: a Draft with no deviation lints clean, is WRITTEN
  // terms_sha_at_lint, and produces byte-identical output on two runs. Cases
  // (a) to (e) all drive a REFUSAL path, so without this one a Lint that
  // stopped writing the field, or wrote it non-deterministically, would pass
  // every other case here while review-draft's precondition quietly stopped
  // being satisfiable (PR #1166 round 1). The two-run comparison is on
  // `newText` and not only on the field, because a clean pass rewrites the
  // Draft and the Removal Test's "lints identically on two runs" is a claim
  // about those bytes.
  {
    const draft6 = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [8, 8]}`,
      "---",
      "",
      "これはクリーンな日本語の一文です。",
    ].join("\n");
    const enBody6 = "This is a clean Japanese sentence.";
    const r1 = await lintDraftJa({ jaText: draft6, jaPath: "fixture.ja.md", enBody: enBody6, termsText });
    const r2 = await lintDraftJa({ jaText: draft6, jaPath: "fixture.ja.md", enBody: enBody6, termsText });
    ok("case (f): a clean Draft passes, is written terms_sha_at_lint, and rewrites identical bytes on two runs",
      r1.clean === true && r2.clean === true
      && (r1.findings || []).length === 0 && (r2.findings || []).length === 0
      && r1.terms_sha_at_lint === termsSha && r2.terms_sha_at_lint === termsSha
      && typeof r1.newText === "string" && r1.newText === r2.newText
      && r1.newText.includes(`terms_sha_at_lint: ${termsSha}`));
  }

  // (g) — acceptance item 3: a fixture written entirely in the prescribed
  // forms, including "サーバー" and "アプリケーション", lints clean — the
  // boundary-pattern fix (kogaki#1162, ja-term-list-substring) for exactly
  // the two forms whose forbidden short variant is a prefix of the
  // prescribed one. Regression form: the pre-fix plain-substring patterns
  // ("サーバ", "アプリ") would each fire on their own prescribed long form.
  {
    const draft7 = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [8, 8]}`,
      "---",
      "",
      "サーバーとアプリケーションを設定し、リポジトリへ実装した。",
    ].join("\n");
    const enBody7 = "Configured the server and application, and implemented it into the repository.";
    const r = await lintDraftJa({ jaText: draft7, jaPath: "fixture.ja.md", enBody: enBody7, termsText });
    ok("case (g): a fixture written entirely in the prescribed forms (including サーバー and アプリケーション) lints clean",
      r.clean === true && (r.findings || []).length === 0);
  }

  // (h) — acceptance item 4: a sentence over the preset's length bound (100
  // characters) is named with its Step AND its rule id
  // (ja-technical-writing/sentence-length) — proof that the technical-
  // writing preset, and not only prh, is wired into the Lint.
  {
    const longSentence = "これは長い日本語の一文です".repeat(8) + "。"; // 105 characters
    const draft8 = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [8, 8]}`,
      "---",
      "",
      longSentence,
    ].join("\n");
    const enBody8 = "This is a long Japanese sentence, repeated past the preset's length bound.";
    const r = await lintDraftJa({ jaText: draft8, jaPath: "fixture.ja.md", enBody: enBody8, termsText });
    ok("case (h): a sentence over the preset's length bound is named with its Step and its rule id",
      r.clean === false
      && r.findings.some((f) => f.step_id === "s1" && f.message.includes("ja-technical-writing/sentence-length")));
  }

  // (i) — acceptance item 5: `fix` runs textlint's fixer with ONLY the prh
  // rule wired in. A fixture carrying "レポジトリ" (prh-fixable) alongside a
  // preset finding (the same over-length sentence as case (h), which prh's
  // fixer cannot touch) is fixed once: the prh term is rewritten, every
  // other byte — including the untouched preset finding — is unchanged.
  {
    const prhLine = "レポジトリの操作について説明します。";
    const longSentence = "これは長い日本語の一文です".repeat(8) + "。";
    const body9 = `${prhLine}\n${longSentence}`;
    const fixedBody = await fixPrhOnly(body9, DEFAULT_TERMS_PATH);
    const expectedBody = `リポジトリの操作について説明します。\n${longSentence}`;
    const findingsAfter = await checkTextlint(fixedBody, [{ step_id: "s1", lines: [1, 2] }], 0);
    ok("case (i): fix rewrites the prh-fixable term and changes no other byte; the preset finding in the same fixture is untouched",
      fixedBody === expectedBody
      && findingsAfter.some((f) => f.message.includes("ja-technical-writing/sentence-length"))
      && !findingsAfter.some((f) => f.message.includes("prh")));
  }

  // (j) — acceptance item 2: a fixture whose only forbidden term sits inside
  // a code fence lints clean (textlint's Markdown parser checks text nodes
  // only, so a CodeBlock is outside the term scan by construction); the same
  // term in prose, in a sibling fixture, is named with its Step. Regression
  // form: PR #1159's native matcher scanned raw body text and could never
  // clear a fixture whose code sample happened to carry a forbidden term
  // (ja-lint-scan-scope).
  {
    const draft10a = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [9, 11]}`,
      "---",
      "",
      "```",
      "server",
      "```",
    ].join("\n");
    const enBody10a = ["```", "server", "```"].join("\n");
    const r10a = await lintDraftJa({ jaText: draft10a, jaPath: "fixture.ja.md", enBody: enBody10a, termsText });

    const draft10b = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [8, 8]}`,
      "---",
      "",
      "serverを設定した。",
    ].join("\n");
    const enBody10b = "Configured the server.";
    const r10b = await lintDraftJa({ jaText: draft10b, jaPath: "fixture.ja.md", enBody: enBody10b, termsText });

    ok("case (j): a forbidden term inside a code fence lints clean, and the same term in prose is named with its Step",
      r10a.clean === true && (r10a.findings || []).length === 0
      && r10b.clean === false
      && r10b.findings.some((f) => f.step_id === "s1" && f.message.includes("server")));
  }

  // (k) — THE `fix` SUBCOMMAND'S OWN FILE PATH (PR #1167 round 1). Case (i)
  // stops at `fixPrhOnly` on an in-memory body, so `cmdFix` and `withBody` —
  // the frontmatter head slice at `frontmatterEnd + 2`, the trailing-newline
  // restoration, and the write-back — were reached by no case. This is the
  // one new surface that rewrites a tracked file's bytes, and the
  // reconstruction it does is exactly the off-by-one the Removal Test exists
  // to hold. Driven as a real subprocess so the CLI's own argument handling
  // is in the path too. Regression form: dropping or adding a line in the
  // head slice, or losing the trailing newline, changes bytes this case
  // compares whole.
  {
    const dir = join(root, "case-k");
    mkdirSync(dir, { recursive: true });
    const head11 = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [8, 8]}`,
      "---",
      "",
    ];
    const before11 = [...head11, "レポジトリの操作について説明します。", ""].join("\n");
    const expected11 = [...head11, "リポジトリの操作について説明します。", ""].join("\n");
    const jaPath11 = join(dir, "draft.ja.md");
    writeFileSync(jaPath11, before11);
    const self11 = fileURLToPath(import.meta.url);
    let out11 = "", code11 = 0;
    try {
      out11 = execFileSync(process.execPath, [self11, "fix", "--draft", jaPath11], { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) { out11 = (e.stdout || "") + (e.stderr || ""); code11 = e.status ?? 1; }
    const after11 = readFileSync(jaPath11, "utf8");
    // The SECOND run is the no-op arm: nothing prh-fixable remains, so the
    // subcommand must leave the file byte-identical and still exit clean.
    let code11b = 0;
    try {
      execFileSync(process.execPath, [self11, "fix", "--draft", jaPath11], { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) { code11b = e.status ?? 1; }
    ok("case (k): the `fix` subcommand rewrites the file, preserves frontmatter and the trailing newline byte for byte, and its second run is a clean no-op",
      code11 === 0 && code11b === 0
      && after11 === expected11
      && readFileSync(jaPath11, "utf8") === expected11
      && out11.includes("prh replacement"));
  }

  // (l) — THE cwd-RELATIVE TERM-LIST CLASS, held open across the migration
  // (PR #1167 round 1). kogaki#1161 fixed exactly this defect once: a term
  // list resolved against the process's working directory rather than the
  // repository. The Lint now reads its term list through `.textlintrc.json`'s
  // `"rulePaths": ["./terms/prh.yml"]` instead of through
  // `DEFAULT_TERMS_PATH`, which is a NEW resolution path for the same class,
  // and case (d) covers src/review-draft.mjs's hash read rather than this
  // one. So: drive `lint` as a subprocess from a directory that is not the
  // repository root and assert the prh rule still fires. Regression form:
  // passing `.textlintrc.json` by a relative path, or dropping the absolute
  // `configFilePath`, leaves every other case green and fails this one.
  {
    const dir = join(root, "case-l");
    mkdirSync(dir, { recursive: true });
    const draft12 = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [8, 8]}`,
      "---",
      "",
      "レポジトリを設定した。",
    ].join("\n");
    const jaPath12 = join(dir, "draft.ja.md");
    writeFileSync(jaPath12, draft12);
    writeFileSync(join(dir, "draft.md"), "Configured the repository.\n");
    const self12 = fileURLToPath(import.meta.url);
    let out12 = "", code12 = 0;
    try {
      out12 = execFileSync(process.execPath, [self12, "lint", "--draft", jaPath12], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) { out12 = (e.stdout || "") + (e.stderr || ""); code12 = e.status ?? 1; }
    ok("case (l): `lint` run from a directory other than the repository root still resolves the term list and names the prh finding with its Step",
      code12 !== 0 && out12.includes("レポジトリ") && out12.includes("s1"));
  }

  // (m) — kogaki#1165 acceptance item 4 (the Removal Test): a fixture whose
  // Lint names ZERO Steps — here, a clean Draft with nothing prh-fixable
  // either — leaves the Draft BYTE-IDENTICAL and `correctTerms` reports it had
  // nothing to correct. NO MODEL IS INVOKED: `correctTerms` is a pure function
  // of its inputs, the same as `lintDraftJa` and `fixPrhOnly` it composes.
  {
    const draftM = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [8, 8]}`,
      "---",
      "",
      "これはクリーンな日本語の一文です。",
    ].join("\n");
    const enBodyM = "This is a clean Japanese sentence.";
    const r = await correctTerms({ jaText: draftM, jaPath: "fixture.ja.md", enBody: enBodyM, enPath: "theses/fixture/draft.md", termsText, termsPath: DEFAULT_TERMS_PATH });
    ok("case (m): a fixture whose Lint names zero Steps leaves the Draft byte-identical, with nothing to correct and no model invoked",
      r.fixApplied === false && r.namedSteps.length === 0 && r.newText === draftM);
  }

  // (n) — kogaki#1165 acceptance items 1 and 2: a three-Step fixture whose
  // Lint names exactly two Steps (a Latin-script run on s1 and s2, neither
  // prh-fixable) corrects those two and no other — `correctTerms` names s1
  // and s2 and nothing about s3. The Round Trip half of item 2 (that a Step
  // NOT named is never re-outlined or re-compared) is asserted where the
  // Round Trip lives, at src/review-draft.mjs `open --only-steps`.
  {
    const draftN = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [10, 10]}`,
      `  - {"step_id": "s2", "lines": [11, 11]}`,
      `  - {"step_id": "s3", "lines": [12, 12]}`,
      "---",
      "",
      "This is a long English sentence for testing purposes.",
      "Another long English sentence sits here for testing too.",
      "これはクリーンな日本語の一文です。",
    ].join("\n");
    const enBodyN = ["English sentence one.", "English sentence two.", "English sentence three."].join("\n");
    const r = await correctTerms({ jaText: draftN, jaPath: "fixture.ja.md", enBody: enBodyN, enPath: "theses/fixture/draft.md", termsText, termsPath: DEFAULT_TERMS_PATH });
    ok("case (n): a fixture whose Lint names two Steps corrects those two Steps and no other",
      r.fixApplied === false && r.namedSteps.join(",") === "s1,s2");
  }

  // (o) — kogaki#1165 acceptance item 4 (the ordering): the mechanical fix
  // (kogaki#1162) runs BEFORE the bounded correction, so a deviation textlint
  // can rewrite is never spent on it. s1 carries a prh-fixable deviation
  // (「レポジトリ」) and s2 carries a Latin-script run the fixer cannot touch —
  // after `correctTerms`, s1 has been rewritten mechanically and is not named;
  // only s2, which the mechanical fix could not clear, is.
  {
    const draftO = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [9, 9]}`,
      `  - {"step_id": "s2", "lines": [10, 10]}`,
      "---",
      "",
      "レポジトリの操作について説明します。",
      "This is a long English sentence for testing purposes.",
    ].join("\n");
    const enBodyO = ["A sentence about repository operations.", "English sentence two."].join("\n");
    const r = await correctTerms({ jaText: draftO, jaPath: "fixture.ja.md", enBody: enBodyO, enPath: "theses/fixture/draft.md", termsText, termsPath: DEFAULT_TERMS_PATH });
    ok("case (o): the mechanical fix rewrites the prh-fixable Step first, so only the Step it could not clear is named",
      r.fixApplied === true && r.newText.includes("リポジトリの操作について説明します。")
      && !r.newText.includes("レポジトリの操作について説明します。")
      && r.namedSteps.join(",") === "s2");
  }

  // (p) — kogaki#1165 acceptance item 3: `correct-terms --regenerate` refuses
  // BY NAME, naming the Terminology List Decision as its ground, rather than
  // offering a whole-Draft re-derivation. Driven as a real subprocess so the
  // CLI's own flag handling is in the path, the same way case (k) drives `fix`.
  {
    const dir = join(root, "case-p");
    mkdirSync(dir, { recursive: true });
    const draftP = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [8, 8]}`,
      "---",
      "",
      "これはクリーンな日本語の一文です。",
    ].join("\n");
    const jaPathP = join(dir, "draft.ja.md");
    writeFileSync(jaPathP, draftP);
    const selfP = fileURLToPath(import.meta.url);
    let outP = "", codeP = 0;
    try {
      outP = execFileSync(process.execPath, [selfP, "correct-terms", "--draft", jaPathP, "--regenerate"], { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) { outP = (e.stdout || "") + (e.stderr || ""); codeP = e.status ?? 1; }
    ok("case (p): `correct-terms --regenerate` refuses, naming the Terminology List Decision, and touches no file",
      codeP !== 0 && outP.includes("Terminology List Decision") && outP.includes("never a whole-Draft re-derivation")
      && readFileSync(jaPathP, "utf8") === draftP);
  }

  rmSync(root, { recursive: true, force: true });
  process.stdout.write(`lint-ja self-test: ${passed} case(s) pass${failures.length ? `, FAILURES: ${failures.join(" | ")}` : ""}\n`);
  if (failures.length) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (args._cmd === "self-test" || args["self-test"]) {
    await runSelfTest();
  } else {
    switch (args._cmd) {
      case "lint": await cmdLint(args); break;
      case "fix": await cmdFix(args); break;
      case "correct-terms": await cmdCorrectTerms(args); break;
      default: fail("usage: lint-ja.mjs lint --draft <draft.ja.md> [--terms <terms/prh.yml>] [--en-draft <draft.md>] | fix --draft <draft.ja.md> [--terms <terms/prh.yml>] | correct-terms --draft <draft.ja.md> [--terms <terms/prh.yml>] [--en-draft <draft.md>] | self-test");
    }
  }
}
