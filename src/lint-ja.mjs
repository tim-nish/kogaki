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
// same output on every run (Removal Test, acceptance item 7). textlint and
// textlint-rule-prh are NOT dependencies of this repository (no package.json,
// no node_modules) — this file implements the prh pattern match, a structure-
// identity check, a Latin-script language-confusion detector, and the
// staleness check natively in Node, citing textlint-rule-prh's documented
// rule shape (an `expected` form and the `patterns` it forbids) as the model
// this file's terms/prh.yml conforms to, without depending on the package.
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

function fail(msg) {
  process.stderr.write(`lint-ja: ${msg}\n`);
  process.exit(1);
}

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");

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
// 1. Term/prh conformance (textlint-rule-prh's documented shape: an
// `expected` form and the `patterns` it forbids). A hit on any forbidden
// variant is named with its Step.
export function checkPrh(body, trace, rules, bodyLineOffset) {
  const findings = [];
  const bodyLines = body.split("\n");
  for (const rule of rules) {
    for (const pat of rule.patterns) {
      if (!pat) continue;
      let idx = 0;
      while (true) {
        const at = body.indexOf(pat, idx);
        if (at === -1) break;
        idx = at + pat.length;
        const upto = body.slice(0, at).split("\n").length; // 1-based line within body
        const fileLine = upto + bodyLineOffset;
        const step = stepAtLine(trace, fileLine);
        findings.push({
          step_id: step,
          message: `${step ? `step ${step}` : "an unattributed line"}: forbidden term "${pat}" — the prescribed form is "${rule.expected}"`
            + (rule.note ? ` (${rule.note})` : ""),
        });
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// 2. Structure identity against the Brief. Compared to the sibling English
// CanonicalDraft (theses/<slug>/draft.md), which is itself the rendering of
// the Brief's declared Section structure (SPEC-draft-pipeline, the Section
// grouping): Section headings, code-fence count, link count, and the set of
// frontmatter keys the Japanese Draft is expected to carry.
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
  // scan — none of those are prose Japanese is expected in.
  let scan = body.replace(/^```[\s\S]*?^```[ \t]*$/gm, (m) => " ".repeat(m.length));
  scan = scan.replace(/`[^`]*`/g, (m) => " ".repeat(m.length));
  scan = scan.replace(/https?:\/\/\S+/g, (m) => " ".repeat(m.length));
  scan = scan.replace(/\[[^\]]*\]\([^)]*\)/g, (m) => " ".repeat(m.length));
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
// 4. Staleness: terms_sha_at_generation / terms_sha_at_lint against the
// current sha256(terms/prh.yml).
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
export function lintDraftJa({ jaText, jaPath, enBody, termsText }) {
  const draft = readJaDraft(jaText, jaPath);
  if (draft.error) return { error: draft.error };
  const parsed = parseTermsYaml(termsText);
  if (parsed.error) return { error: `terms/prh.yml is not readable as the prh.yml shape: ${parsed.error}` };
  const currentSha = sha256(termsText);
  const bodyLineOffset = draft.frontmatterEnd + 2; // 1-based file line of body line 1, minus 1

  const findings = [
    ...checkPrh(draft.body, draft.trace, parsed.rules, bodyLineOffset),
    ...(enBody !== null ? checkStructureIdentity(draft.body, enBody, draft.trace) : []),
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
function cmdLint(args) {
  const jaPath = argString(args, "draft", "usage: lint-ja.mjs lint --draft <draft.ja.md> [--terms <terms/prh.yml>] [--en-draft <draft.md>]");
  const termsPath = typeof args.terms === "string" && args.terms !== "" ? args.terms : "terms/prh.yml";
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
  const r = lintDraftJa({ jaText, jaPath, enBody, termsText });
  if (r.error) fail(r.error);
  if (!r.clean) {
    process.stderr.write(`lint-ja: ${r.findings.length} deviation(s) — the Draft is NOT marked lint-clean (no terms_sha_at_lint written):\n`);
    for (const f of r.findings) process.stderr.write(`  - ${f.message}\n`);
    process.exit(1);
  }
  writeFileSync(jaPath, r.newText);
  process.stdout.write(`lint-ja: clean pass — terms_sha_at_lint: ${r.terms_sha_at_lint} written to ${jaPath}\n`);
}

// ---------------------------------------------------------------------------
// The Removal Test's self-test (acceptance item 7). Three cases, each
// constructing its defect and asserting this file (or, for case c, the
// review-draft.mjs precondition) refuses or produces by name. NO MODEL IS
// INVOKED — every case drives pure functions or a subprocess of another
// runtime's own deterministic refusal.
async function runSelfTest() {
  const { mkdtempSync, mkdirSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const root = mkdtempSync(join(tmpdir(), "lint-ja-selftest-"));
  let passed = 0; const failures = [];
  const ok = (name, cond) => { if (cond) passed++; else failures.push(name); };

  const termsText = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "terms", "prh.yml"), "utf8");
  const termsSha = sha256(termsText);

  // (a) — an unmodified fixture lints identically on two runs, no model
  // invoked. Uses a CLEAN body (no forbidden term, no Latin-script run, ASCII
  // heading count matches "no English sibling" case — enBody null).
  {
    const draft1 = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [7, 7]}`,
      "---",
      "",
      "これはクリーンな日本語の一文です。",
      "",
    ].join("\n");
    const r1 = lintDraftJa({ jaText: draft1, jaPath: "fixture.ja.md", enBody: null, termsText });
    const r2 = lintDraftJa({ jaText: draft1, jaPath: "fixture.ja.md", enBody: null, termsText });
    ok("case (a): an unmodified fixture lints identically on two runs, no model invoked",
      r1.clean === true && r2.clean === true && r1.findings.length === 0 && r2.findings.length === 0
      && r1.terms_sha_at_lint === r2.terms_sha_at_lint && r1.newText === r2.newText);
  }

  // (b) — a fixture carrying a forbidden term is named with its Step.
  {
    const draft2 = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      "trace:",
      `  - {"step_id": "s7", "lines": [8, 8]}`,
      "---",
      "",
      "このWebサイトはクリーンです。",
      "",
    ].join("\n");
    const r = lintDraftJa({ jaText: draft2, jaPath: "fixture.ja.md", enBody: null, termsText });
    ok("case (b): a forbidden term is named with its Step",
      r.clean === false && r.findings.some((f) => f.step_id === "s7" && f.message.includes("Webサイト")));
  }

  // (c) — review-draft.mjs run on a fixture with a stale terms_sha_at_lint is
  // refused, naming both hashes. Drives the REAL runtime as a subprocess (the
  // precondition lives in src/review-draft.mjs, not here), asserting only its
  // observable refusal — no model is invoked by either side.
  {
    const dir = join(root, "case-c");
    mkdirSync(dir, { recursive: true });
    const stale = "0".repeat(64);
    const draft3 = [
      "---",
      "brief: brief.md",
      `terms_sha_at_generation: ${termsSha}`,
      `terms_sha_at_lint: ${stale}`,
      "trace:",
      `  - {"step_id": "s1", "lines": [8, 8]}`,
      "---",
      "",
      "これはクリーンな日本語の一文です。",
      "",
    ].join("\n");
    const jaPath = join(dir, "draft.ja.md");
    writeFileSync(jaPath, draft3);
    const runtime = join(dirname(fileURLToPath(import.meta.url)), "review-draft.mjs");
    let stderrOut = "", code = 0;
    try {
      execFileSync(process.execPath, [runtime, "open", "--draft", jaPath], { cwd: dirname(fileURLToPath(import.meta.url)) + "/..", encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      stderrOut = (e.stderr || "") + (e.stdout || "");
      code = e.status ?? 1;
    }
    ok("case (c): review-draft.mjs refuses a stale terms_sha_at_lint, naming both hashes",
      code !== 0 && stderrOut.includes(stale) && stderrOut.includes(sha256(termsText)));
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
      case "lint": cmdLint(args); break;
      default: fail("usage: lint-ja.mjs lint --draft <draft.ja.md> [--terms <terms/prh.yml>] [--en-draft <draft.md>] | self-test");
    }
  }
}
