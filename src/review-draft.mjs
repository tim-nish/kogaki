#!/usr/bin/env node
// review-draft — the ReviewDraft Harness: the round-trip review of a
// CanonicalDraft against the Packets that produced it (kogaki#869 tracking,
// kogaki#870 this artifact).
//
// THE INPUTS ARE CLOSED, AND THAT IS THE WHOLE OF THE DESIGN. This command
// reads three things: `theses/<slug>/draft.md`; its frontmatter trace, which
// after kogaki#868 carries each Step's line range and its Packet's path and
// sha; and the Packet files those entries name. It reads no Brief, no Move
// file, no Strand. The owner's 2026-09-04 ruling is why:
//
//   "The Packet was specifically designed to be the only source required to
//    generate the Draft without reading the Step or Move files separately.
//    Therefore, ReviewDraft should compare the Draft against the Packet. If
//    ReviewDraft later turns out to require Move information or any other
//    separate file, that should be treated as evidence that the Packet is
//    missing information, and that information should be added to the Packet
//    instead."
//
// So a check that needs anything else is a PACKET GAP and is filed against
// `src/packet-template.md`. It is never satisfied by a side read, and the
// absence of any such read here is the mechanical half of that ruling: there
// is no code path in this file that opens a Brief, a Move or a Strand, which
// is a stronger statement than a rule saying not to.
//
// THE HARNESS OWNS THE ORDERING (the same ruling `.claude/skills/draft/SKILL.md`
// records for /draft): `recover` refuses a Step whose recovery input it did not
// render, `compare` refuses while any Step or Section entry is missing, `check`
// refuses before `compare`, and `close` is reachable from `compare` with zero
// fails or from `check` in every state. A session does not sequence these acts
// and cannot get the sequence wrong.
//
// COMPLETION: the command runs to completion — it ends when `review.md` exists.
// Two passes at most (owner ruling 2026-09-04). It finishes with residue rather
// than reaching for a third pass, because the residue is the useful output:
// what survives two passes is information about ReviewDraft itself or about the
// Packet, and the owner classifies which.
//
// WHAT THIS ARTIFACT DOES NOT OWN, stated so a reader can tell a boundary from
// a hole. The recovery input's record schema is kogaki#871; the item classes,
// the three-valued verdict and the mechanical checks are kogaki#872; the cold
// reader's pairing rules are kogaki#873; `correct` and the bounded second pass
// are kogaki#874. Each is registered in the dispatcher below and refuses by
// naming its issue, so the surface this file declares is the surface a later
// child fills rather than one it has to discover.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, resolve, dirname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { enterRun } from "./runs.mjs";

function fail(msg) {
  process.stderr.write(`review-draft: ${msg}\n`);
  process.exit(1);
}

function sha256(s) {
  return createHash("sha256").update(s).digest("hex");
}

// The omitted-value guard draft.mjs carries, inherited unchanged: a bare
// `--draft` parses as boolean true and String(true) reaches readFileSync as a
// filename.
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
// Reading the Draft. The trace is the join key between prose and Packet, and
// every refusal below names the Step rather than the file: a reviewer holding
// a Step id can act, and one holding "the trace is malformed" cannot.

// THE FRONTMATTER IS READ, NEVER PARSED AS GENERAL YAML. `emit` writes each
// trace entry as exactly one `  - {json}` line (src/draft.mjs cmdEmit), so the
// reader that matches that write is a line scan — and a general parser would be
// a second grammar that can disagree with the writer about what was written.
function readDraft(draftPath) {
  if (!existsSync(draftPath)) fail(`no Draft at ${draftPath}`);
  const text = readFileSync(draftPath, "utf8");
  const lines = text.split("\n");
  if (lines[0] !== "---") {
    fail(`${draftPath} opens with no frontmatter — a CanonicalDraft carries its record half in `
      + "frontmatter (SPEC-draft-command §5), and without it there is no trace to review against");
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") { end = i; break; }
  }
  if (end === -1) fail(`${draftPath} has an unterminated frontmatter block`);

  const trace = [];
  let inTrace = false;
  for (let i = 1; i < end; i++) {
    const l = lines[i];
    if (l === "trace:") { inTrace = true; continue; }
    if (inTrace) {
      const m = l.match(/^ {2}- (\{.*\})\s*$/);
      if (m) {
        try { trace.push(JSON.parse(m[1])); }
        catch (e) { fail(`trace entry ${trace.length + 1} in ${draftPath} is not readable JSON (${e.message})`); }
        continue;
      }
      // A non-entry line ends the block: `emit` writes the trace last, so
      // anything else at this indent is a different key.
      if (!l.startsWith("  ")) inTrace = false;
    }
  }
  if (!trace.length) {
    fail(`${draftPath} carries no trace entries — ReviewDraft reviews the Draft against the `
      + "Packets its trace names, and a Draft with no trace names none");
  }

  // The body is everything after the closing `---` and the blank line the
  // `\n\n` join leaves. Line numbers in the trace are 1-based over the FILE,
  // frontmatter included, which is what an editor shows.
  //
  // THE FINAL EMPTY ELEMENT IS DROPPED, AND THAT IS WHAT MAKES `body_sha` THE
  // SAME NUMBER ON BOTH SIDES (PR #882 round 1, finding 2). `emit` writes
  // `fm + "\n\n" + body + "\n"` and records `sha256(body)`; splitting that file
  // on newlines leaves a trailing "" that the naive slice re-joins as a final
  // "\n", so this hashed `body + "\n"` and an owner comparing
  // `runs/draft/<slug>/last-emit.json` against the `**Body sha.**` line in
  // `review.md` saw two different hexes for an unedited Draft. Nothing broke —
  // `requireCurrent` only ever compared this value against itself — which is
  // exactly why it could ship: the divergence is invisible to every reader
  // except the owner, who is the one it misleads.
  const bodyLines = lines.slice(end + 2);
  if (bodyLines.length && bodyLines[bodyLines.length - 1] === "") bodyLines.pop();
  const body = bodyLines.join("\n");
  return { path: draftPath, text, lines, frontmatterEnd: end, body, body_sha: sha256(body), trace };
}

// Verify the trace's inputs and hand back the Steps and Sections. Three
// refusals, each naming its Step: no line range, a Packet that is absent, and
// a Packet whose sha differs from the trace's — the last one meaning the Draft
// was not produced from this Packet, which is the condition that makes every
// later comparison meaningless rather than merely wrong.
function resolveInputs(draft) {
  const dir = dirname(draft.path);
  const steps = [];
  for (const t of draft.trace) {
    const id = typeof t.step_id === "string" ? t.step_id : "(unnamed)";
    if (!Array.isArray(t.lines) || t.lines.length !== 2
        || !Number.isInteger(t.lines[0]) || !Number.isInteger(t.lines[1])) {
      fail(`step ${id} carries no line range in the trace — ReviewDraft locates each Step's prose `
        + "by the range kogaki#868 writes, and a Draft emitted before that lands must be re-emitted "
        + "(node src/draft.mjs emit --brief <brief.md>)");
    }
    if (typeof t.packet !== "string" || typeof t.packet_sha !== "string") {
      fail(`step ${id} names no Packet in the trace — the Packet is the only source ReviewDraft `
        + "compares against, so a Step without one cannot be reviewed; re-emit the Draft after "
        + "rendering its Packets");
    }
    const packetPath = resolve(dir, t.packet);
    if (!existsSync(packetPath)) {
      fail(`step ${id}: the Packet the trace names is absent — ${packetPath}. The run workspace is `
        + "machine state and is pruned (DESIGN.md §6); re-render it with "
        + "`node src/draft.mjs packet --brief <brief.md> --step " + id + "`");
    }
    const actual = sha256(readFileSync(packetPath, "utf8"));
    if (actual !== t.packet_sha) {
      fail(`step ${id}: the Packet's sha differs from the trace's — the Draft was not produced from `
        + `this Packet.\n  trace  ${t.packet_sha}\n  file   ${actual}\n  at     ${packetPath}\n`
        + "Reviewing prose against an input that did not produce it compares two unrelated things, "
        + "so this refuses rather than reporting findings nobody can act on.");
    }
    // The range is 1-based over the file; slice is 0-based and end-exclusive.
    const prose = draft.lines.slice(t.lines[0] - 1, t.lines[1]).join("\n");
    steps.push({
      step_id: id,
      section: t.section,
      section_title: t.section_title,
      lines: t.lines,
      packet: t.packet,
      packet_path: packetPath,
      packet_sha: t.packet_sha,
      prose,
    });
  }
  // Sections come from the trace's own grouping, never from a heading scan of
  // the body: `emit` maps each Step to its Section (kogaki#823), and re-deriving
  // it here would be a second answer to a question the trace already answers.
  const sections = [];
  for (const s of steps) {
    let sec = sections.find((x) => x.index === s.section);
    if (!sec) { sec = { index: s.section, title: s.section_title, steps: [] }; sections.push(sec); }
    sec.steps.push(s.step_id);
  }
  sections.sort((a, b) => a.index - b.index);
  return { steps, sections };
}

// ---------------------------------------------------------------------------
// The workspace. Machine state under `runs/review/<slug>/`, the same lifetime
// rule every other lane's workspace has (DESIGN.md §6): disposable, pruned to
// the last K, never the artifact.

function slugOf(draftPath) {
  return basename(dirname(resolve(draftPath)));
}

// `--workspace` IS A BASE AND THE SLUG IS JOINED ONTO IT — the same reading
// `src/draft.mjs`'s own `workspaceFor` gives the flag (PR #882 round 1,
// finding 3). Returning the flag verbatim made two Drafts driven under one
// `--workspace` share a single `run.json`, so the second `open` overwrote the
// first run's rendered inputs and recoveries with no error and no trace. Two
// commands whose flag has the same name and different arity is the homonym
// defect; the sibling's reading is the one that was already load-bearing.
function workspaceFor(args, slug) {
  if (typeof args.workspace === "string" && args.workspace !== "") {
    const dest = join(args.workspace, slug);
    mkdirSync(dest, { recursive: true });
    return dest;
  }
  return enterRun("review", slug);
}

function runRecordPath(ws) { return join(ws, "run.json"); }

function readRun(ws) {
  const p = runRecordPath(ws);
  if (!existsSync(p)) {
    fail(`no run record at ${p} — the run has not been opened; run `
      + "`node src/review-draft.mjs open --draft <draft.md>` first");
  }
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { fail(`the run record at ${p} is not readable (${e.message})`); }
}

function writeRun(ws, run) {
  writeFileSync(runRecordPath(ws), JSON.stringify(run, null, 2) + "\n");
}

// THE RUN RECORD IS BOUND TO THE DRAFT IT WAS OPENED ON. A Draft edited between
// `open` and a later act is a different document, and continuing against the
// old record would judge prose nobody rendered an input for. This is the same
// staleness the Packet-sha check refuses at `open`, one layer over.
function requireCurrent(run, draft) {
  if (run.body_sha !== draft.body_sha) {
    fail(`the Draft has changed since this run was opened.\n  opened on  ${run.body_sha}\n`
      + `  now        ${draft.body_sha}\n`
      + "Re-open the run (`open --draft <draft.md>`) — the recovery inputs already rendered were "
      + "rendered from prose that is no longer there.");
  }
}

// ---------------------------------------------------------------------------
// Rendering a recovery input. The reviewer is BLIND: it sees the prose and
// never the Packet, which is what makes the recovered record evidence about the
// prose rather than a re-reading of the input.
//
// The RECORD's schema is kogaki#871's and is deliberately not fixed here — this
// artifact renders the input and records what comes back. The line below names
// that boundary in the rendered file itself, so a reviewer reading an input
// before #871 lands can see which half is missing rather than inventing one.
function renderRecoveryInput(ws, draft, step) {
  const dir = join(ws, "recovery");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${step.step_id}.md`);
  const text = [
    `# Recover the Step record — ${step.step_id}`,
    "",
    "You have not seen the input that produced this prose, and you must not look",
    "for it. Read the passage below and write down the Step record you believe it",
    "realizes: what the reader is assumed to know coming in, what they know going",
    "out, what the passage asserts, and what it restates from earlier prose.",
    "",
    "Your record is evidence about THIS PROSE. Do not reason about what a Packet",
    "probably said — a recovered record that agrees with the input because it",
    "guessed at the input measures nothing.",
    "",
    `## The passage (draft lines ${step.lines[0]}–${step.lines[1]})`,
    "",
    step.prose,
    "",
    "## The record to write",
    "",
    "The recovered record's field set is kogaki#871's and is not declared by this",
    "Harness. Until it lands, write the four items named above as plain labelled",
    "lines and hand the file back with:",
    "",
    `    node src/review-draft.mjs recover --draft ${relative(process.cwd(), draft.path) || draft.path} --step ${step.step_id} --file <recovered>`,
    "",
  ].join("\n");
  writeFileSync(out, text + "\n");
  return out;
}

// The next Step with no recovery yet, in the path's recorded order. `open`
// renders the first; `recover` renders the next, which is what makes the flow
// self-driving rather than a sequence a session has to remember.
function nextUnrecovered(run) {
  return run.steps.find((s) => !run.recovered[s.step_id]);
}

// ---------------------------------------------------------------------------
// The commands.

function cmdOpen(args) {
  const draftPath = argString(args, "draft", "usage: review-draft open --draft <draft.md>");
  const draft = readDraft(draftPath);
  const { steps, sections } = resolveInputs(draft);
  const slug = slugOf(draftPath);
  const ws = workspaceFor(args, slug);

  const run = {
    draft: resolve(draftPath),
    slug,
    body_sha: draft.body_sha,
    opened_at: new Date().toISOString(),
    steps: steps.map((s) => ({
      step_id: s.step_id, section: s.section, section_title: s.section_title,
      lines: s.lines, packet: s.packet, packet_sha: s.packet_sha,
    })),
    sections: sections.map((s) => ({ index: s.index, title: s.title, steps: s.steps })),
    rendered: {},
    recovered: {},
    ledger: {},
    findings: [],
    corrections: [],
    residue: [],
    compared_at: null,
    checked_at: null,
    closed_at: null,
  };

  const first = steps[0];
  const input = renderRecoveryInput(ws, draft, first);
  run.rendered[first.step_id] = input;
  writeRun(ws, run);

  process.stdout.write(
    `ReviewDraft opened: ${slug}\n`
    + `  draft     ${resolve(draftPath)} (body sha ${draft.body_sha.slice(0, 16)})\n`
    + `  steps     ${steps.length} — ${steps.map((s) => s.step_id).join(", ")}\n`
    + `  sections  ${sections.length} — ${sections.map((s) => `${s.index}. ${s.title ?? "(untitled)"}`).join(" | ")}\n`
    + `  packets   ${steps.length} verified against the trace's shas\n`
    + `  workspace ${ws}\n`
    + `\nfirst recovery input: ${input}\n`);
}

function cmdRecover(args) {
  const draftPath = argString(args, "draft", "usage: review-draft recover --draft <draft.md> --step <id> --file <recovered>");
  const stepId = argString(args, "step", "usage: review-draft recover --draft <draft.md> --step <id> --file <recovered>");
  const file = argString(args, "file", "usage: review-draft recover --draft <draft.md> --step <id> --file <recovered>");
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);

  const known = run.steps.map((s) => s.step_id);
  if (!known.includes(stepId)) {
    fail(`unknown step \`${stepId}\` — this Draft's Steps are ${known.join(", ")}`);
  }
  // THE RENDERED-INPUT GUARD IS WHAT MAKES THE RECOVERY BLIND. A record handed
  // back for a Step whose input was never rendered was written against
  // something else — the Packet, the Brief, or the reviewer's memory of the
  // article — and there is no way to tell which afterwards. So the refusal is
  // here, at the only moment the distinction is still observable.
  if (!run.rendered[stepId]) {
    fail(`step ${stepId} has no rendered recovery input, so this record was not written against one.\n`
      + "The Harness renders inputs in the path's recorded order — `open` renders the first and each "
      + `\`recover\` renders the next. The Step now owed is ${nextUnrecovered(run)?.step_id ?? "(none)"}.`);
  }
  if (!existsSync(file)) fail(`no recovered record at ${file}`);

  const dir = join(ws, "recovered");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${stepId}${file.endsWith(".json") ? ".json" : ".md"}`);
  const content = readFileSync(file, "utf8");
  writeFileSync(out, content);
  run.recovered[stepId] = out;

  const next = nextUnrecovered(run);
  let nextInput = null;
  if (next) {
    const { steps } = resolveInputs(draft);
    const full = steps.find((s) => s.step_id === next.step_id);
    nextInput = renderRecoveryInput(ws, draft, full);
    run.rendered[next.step_id] = nextInput;
  }
  writeRun(ws, run);

  process.stdout.write(`recorded: ${stepId} -> ${out}\n`);
  if (nextInput) process.stdout.write(`next recovery input: ${nextInput}\n`);
  else process.stdout.write("every Step is recovered. The Section ledger is what `compare` still owes — "
    + `${run.sections.length} entr${run.sections.length === 1 ? "y" : "ies"}, `
    + `\`read --section <n> --file <ledger>\`.\n`);
}

function cmdRead(args) {
  const draftPath = argString(args, "draft", "usage: review-draft read --draft <draft.md> --section <n> --file <ledger>");
  const file = argString(args, "file", "usage: review-draft read --draft <draft.md> --section <n> --file <ledger>");
  const raw = args.section;
  const n = typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isInteger(n)) fail("usage: review-draft read --draft <draft.md> --section <n> --file <ledger> (n is the Section's index)");
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);

  const known = run.sections.map((s) => s.index);
  if (!known.includes(n)) {
    fail(`unknown section ${n} — this Draft's Sections are ${known.join(", ")}`);
  }
  if (!existsSync(file)) fail(`no Section ledger entry at ${file}`);

  const dir = join(ws, "ledger");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `section-${n}${file.endsWith(".json") ? ".json" : ".md"}`);
  writeFileSync(out, readFileSync(file, "utf8"));
  run.ledger[String(n)] = out;
  writeRun(ws, run);

  const owed = known.filter((i) => !run.ledger[String(i)]);
  process.stdout.write(`recorded: section ${n} -> ${out}\n`
    + (owed.length ? `sections still owed: ${owed.join(", ")}\n` : "every Section entry is recorded.\n"));
}

// What `compare` is missing, computed once and rendered as the refusal's whole
// content: a reviewer told "something is missing" has to go looking, and the
// looking is the part the Harness can do.
function missingFor(run) {
  const steps = run.steps.map((s) => s.step_id).filter((id) => !run.recovered[id]);
  const sections = run.sections.map((s) => s.index).filter((i) => !run.ledger[String(i)]);
  return { steps, sections };
}

function cmdCompare(args) {
  const draftPath = argString(args, "draft", "usage: review-draft compare --draft <draft.md>");
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);

  const missing = missingFor(run);
  if (missing.steps.length || missing.sections.length) {
    const parts = [];
    if (missing.steps.length) parts.push(`step recover${missing.steps.length === 1 ? "y" : "ies"}: ${missing.steps.join(", ")}`);
    if (missing.sections.length) parts.push(`section ledger entr${missing.sections.length === 1 ? "y" : "ies"}: ${missing.sections.join(", ")}`);
    fail(`the join has inputs missing, so it would compare a partial review against a whole Draft `
      + `and report the gaps as agreement.\n  ${parts.join("\n  ")}`);
  }

  // THE JOIN'S ITEM TABLE IS kogaki#872's, NOT THIS ARTIFACT'S. What lands here
  // is the act and its precondition; what fills it is the fixed item-class
  // table, the three-valued verdict and the mechanical checks. The record says
  // so rather than writing an empty findings list that reads like a clean
  // review — an unfilled join and a join that found nothing are the same file
  // to a later reader unless one of them says which it is.
  run.compared_at = new Date().toISOString();
  run.join_state = "item classes not yet built (kogaki#872)";
  run.findings = [];
  writeRun(ws, run);
  writeFileSync(join(ws, "join.json"), JSON.stringify({
    draft: run.draft, body_sha: run.body_sha, compared_at: run.compared_at,
    steps: run.steps.map((s) => s.step_id),
    sections: run.sections.map((s) => s.index),
    findings: [],
    note: "the item classes, the three-valued verdict and the mechanical checks are kogaki#872; "
      + "this file records that the join RAN with every input present, and carries no verdicts yet",
  }, null, 2) + "\n");

  process.stdout.write(`compare: every input present — ${run.steps.length} recovered Step(s), `
    + `${run.sections.length} Section entr${run.sections.length === 1 ? "y" : "ies"}.\n`
    + "findings: none — the item classes and the three-valued verdict are kogaki#872 and are not "
    + "built yet, so this is an unfilled join rather than a clean review.\n"
    + `join record: ${join(ws, "join.json")}\n`
    + "`close --draft <draft.md>` writes the owner record.\n");
}

// `correct` and `check` are DECLARED HERE AND BUILT BY kogaki#874. Registering
// them in the dispatcher rather than leaving them out is what makes the entry
// point set the one #870's body declares: a reviewer who reaches for `correct`
// gets the issue that owns it, not "unknown command".
function cmdCorrect() {
  fail("`correct` is declared by this Harness and built by kogaki#874 — the correction path "
    + "(a re-rendered Packet carrying a Correction block, corrections in path order, drift reported). "
    + "It is not available yet.");
}

function cmdCheck(args) {
  const draftPath = argString(args, "draft", "usage: review-draft check --draft <draft.md>");
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);
  // The ordering refusal is THIS artifact's and lands now, because it is a
  // property of the flow rather than of the second pass: pass two re-checks
  // what pass one found, and there is nothing to re-check before `compare`.
  if (!run.compared_at) {
    fail("`check` is pass two and there is no pass one — run `compare --draft <draft.md>` first. "
      + "Pass two re-runs recovery and the join only for the corrected Steps, their successors' "
      + "continuity items and the mechanical items, so it has nothing to narrow to until the join has run.");
  }
  fail("`check`'s second pass is declared by this Harness and built by kogaki#874 — the bounded "
    + "re-run over the corrected Steps, their successors and the mechanical items. It is not "
    + "available yet; `close --draft <draft.md>` is reachable from `compare` with zero fails.");
}

// ---------------------------------------------------------------------------
// `close` — the owner record. `theses/<slug>/review.md`, one per Draft,
// overwritten on re-run, headed by the Draft's body sha and the Packet shas it
// was reviewed against.
//
// EVERY RESIDUE LINE CARRIES AN EMPTY `classified:` FIELD AND THE TOOL NEVER
// FILLS IT. The residue is what survived two passes, and what it is evidence
// ABOUT — the Packet, or ReviewDraft itself — is exactly the judgment the owner
// holds. A tool that guessed would be answering the one question the whole
// two-pass bound exists to put in front of a person.
function cmdClose(args) {
  const draftPath = argString(args, "draft", "usage: review-draft close --draft <draft.md>");
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);

  if (!run.compared_at) {
    fail("`close` is reachable from `compare` with zero fails, or from `check` in every state — "
      + "and neither has run. Run `compare --draft <draft.md>` first.");
  }
  const fails = (run.findings || []).filter((f) => f.verdict === "fails");
  if (fails.length && !run.checked_at) {
    fail(`the join found ${fails.length} failing item(s), so \`close\` is reachable only through `
      + "`check` — pass two is what turns a failing item into a correction or into residue. "
      + `Failing: ${fails.map((f) => `${f.step_id}/${f.item}`).join(", ")}`);
  }

  const out = join(dirname(resolve(draftPath)), "review.md");
  const now = new Date().toISOString();
  const lines = [
    `# Review — ${run.slug}`,
    "",
    "This record is the owner's. The residue at the end carries one empty",
    "`classified:` field per line, and this tool never fills it: what a surviving",
    "item is evidence about — the Packet, or ReviewDraft itself — is the judgment",
    "the two-pass bound exists to hand over.",
    "",
    "## What was reviewed",
    "",
    `- **Draft.** \`${relative(dirname(out), resolve(draftPath)) || basename(draftPath)}\``,
    `- **Body sha.** \`${run.body_sha}\``,
    `- **Opened.** ${run.opened_at}`,
    `- **Closed.** ${now}`,
    `- **Passes.** ${run.checked_at ? "two (compare, check)" : "one (compare)"}`,
    "",
    "### The Packets it was reviewed against",
    "",
    ...run.steps.map((s) => `- \`${s.step_id}\` — \`${s.packet}\` sha \`${s.packet_sha}\``),
    "",
    "## Findings",
    "",
  ];
  if (!run.findings.length) {
    lines.push(run.join_state
      ? `_None recorded — ${run.join_state}. This is an unfilled join, not a clean review._`
      : "_None._", "");
  } else {
    for (const f of run.findings) {
      lines.push(`- **${f.step_id} / ${f.item}** — ${f.verdict}`);
      if (f.declared) lines.push(`  - declared: ${f.declared}`);
      if (f.recovered) lines.push(`  - recovered: ${f.recovered}`);
      if (f.span) lines.push(`  - span: ${JSON.stringify(f.span)}`);
    }
    lines.push("");
  }

  lines.push("## Corrections", "");
  if (!run.corrections.length) {
    lines.push(run.checked_at ? "_None made._" : "_None — the correction path is kogaki#874._", "");
  } else {
    for (const c of run.corrections) {
      lines.push(`- **${c.step_id}** (pass ${c.pass}) — ${c.what}`);
      if (c.change_share !== undefined) lines.push(`  - change share: ${c.change_share}`);
      if (c.packet_overlap !== undefined) lines.push(`  - packet overlap: ${c.packet_overlap}`);
    }
    lines.push("");
  }

  lines.push("## Residue", "",
    "Each line is an item that survived every pass this run made. Fill",
    "`classified:` with `packet` or `reviewdraft`.", "");
  if (!run.residue.length) {
    lines.push("_None._", "");
  } else {
    for (const r of run.residue) {
      lines.push(`- **${r.step_id} / ${r.item}** — ${r.why}`);
      lines.push("  classified:");
    }
    lines.push("");
  }

  // A trailing newline, like every other write in this file: `review.md` is
  // repo-visible and committed, so without one it lands as a no-final-newline
  // file in every diff that touches it (PR #882 round 1, finding 6).
  writeFileSync(out, lines.join("\n") + "\n");
  run.closed_at = now;
  writeRun(ws, run);
  process.stdout.write(`review record: ${out}\n`);
}

// ---------------------------------------------------------------------------

const COMMANDS = {
  open: cmdOpen,
  recover: cmdRecover,
  read: cmdRead,
  compare: cmdCompare,
  correct: cmdCorrect,
  check: cmdCheck,
  close: cmdClose,
};

const USAGE = `review-draft — the round-trip review of a CanonicalDraft against its Packets

  node src/review-draft.mjs open    --draft <draft.md>
  node src/review-draft.mjs recover --draft <draft.md> --step <id> --file <recovered>
  node src/review-draft.mjs read    --draft <draft.md> --section <n> --file <ledger>
  node src/review-draft.mjs compare --draft <draft.md>
  node src/review-draft.mjs correct --draft <draft.md> --step <id> --file <prose>   [kogaki#874]
  node src/review-draft.mjs check   --draft <draft.md>                              [kogaki#874]
  node src/review-draft.mjs close   --draft <draft.md>

The Harness owns the ordering: \`recover\` refuses a Step whose recovery input it
did not render, \`compare\` refuses while any Step or Section entry is missing,
\`check\` refuses before \`compare\`, and \`close\` is reachable from \`compare\` with
zero fails or from \`check\` in every state.

It reads the Draft, its trace and the Packets that trace names — no Brief, no
Move file, no Strand. A check that needs anything else is a Packet gap and is
filed against src/packet-template.md.
`;

// ---------------------------------------------------------------------------
// The fixture pass — seam-free, filesystem under a temp dir only, driven
// END TO END through the real entry points rather than against the functions.
// The same arrangement `src/draft.mjs --self-test` uses, and for the reason its
// own record gives: the defects this Harness exists to refuse are properties of
// the refusal surfaces a caller meets, and an assertion against an internal
// function passes while the surface is wrong.
//
// Each case CONSTRUCTS its defect and asserts the refusal BY NAME. A case that
// only asserted a non-zero exit would pass on any refusal, including one about
// a different Step.
async function runSelfTest() {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { spawnSync } = await import("node:child_process");
  const self = fileURLToPath(import.meta.url);
  const root = mkdtempSync(join(tmpdir(), "review-draft-selftest-"));
  let passed = 0; const failures = [];
  const ok = (name, cond) => { if (cond) passed++; else failures.push(name); };

  // -- the fixture Draft, built the way `emit` builds one -------------------
  // Line ranges are computed rather than transcribed: a transcribed range that
  // drifts from the body would make every prose-quoting case assert against the
  // wrong text while still passing, which is this Harness's own subject matter.
  const PROSE = {
    a1: ["The first passage opens the claim and says what the reader is about to be shown.",
      "",
      "It runs two paragraphs so a range covering more than one line is exercised."],
    a2: ["The second passage continues under the same heading and does not restate it."],
    a3: ["The third passage opens the second Section with a question of its own."],
  };
  const SECTIONS = [
    { index: 1, title: "The first heading", steps: ["a1", "a2"] },
    { index: 2, title: "The second heading", steps: ["a3"] },
  ];

  function buildDraft(dir, { packetDir, mutate = (t) => t, omitLines = null, omitPacket = null } = {}) {
    mkdirSync(dir, { recursive: true });
    // Body first, recording each Step's 1-based body range.
    const body = []; const ranges = {};
    for (const sec of SECTIONS) {
      body.push(`## ${sec.title}`, "");
      for (const id of sec.steps) {
        const start = body.length + 1;
        body.push(...PROSE[id]);
        ranges[id] = [start, body.length];
        body.push("");
      }
    }
    while (body.length && body[body.length - 1] === "") body.pop();

    const trace = [];
    for (const sec of SECTIONS) {
      for (const id of sec.steps) {
        const rec = { step_id: id, section: sec.index, section_title: sec.title };
        trace.push(rec);
      }
    }
    const head = ["---", "brief: brief.md", "brief_pin: sha256:0000", "trace:"];
    const bodyOffset = head.length + trace.length + 2;
    for (const t of trace) {
      const r = ranges[t.step_id];
      if (omitLines !== t.step_id) t.lines = [r[0] + bodyOffset, r[1] + bodyOffset];
      if (omitPacket !== t.step_id) {
        const p = join(packetDir, `${t.step_id}.md`);
        t.packet = relative(dir, p);
        t.packet_sha = sha256(readFileSync(p, "utf8"));
      }
    }
    const fm = [...head, ...trace.map((t) => `  - ${JSON.stringify(t)}`), "---"].join("\n");
    const text = mutate(fm + "\n\n" + body.join("\n") + "\n");
    const out = join(dir, "draft.md");
    writeFileSync(out, text);
    return { path: out, ranges, bodyOffset };
  }

  // Packets carry text that appears NOWHERE in the prose, so the blindness case
  // below can assert on a string only the Packet has.
  const packetDir = join(root, "packets");
  mkdirSync(packetDir, { recursive: true });
  for (const id of ["a1", "a2", "a3"]) {
    writeFileSync(join(packetDir, `${id}.md`), [
      `# Write one Step`, "",
      `- **Step.** ${id}`,
      "- **reader_state_before.** PACKETONLYTOKEN the state before.",
      "- **reader_state_after.** the state after.",
      "",
    ].join("\n"));
  }

  const thesis = join(root, "theses", "fixture");
  const draft = buildDraft(thesis, { packetDir });
  // `--workspace` is a BASE; the run lands at base/<slug>, which is what the
  // sibling's flag has always meant. `WS` is where this Draft's run record and
  // rendered inputs actually sit, and the cases read it rather than the base —
  // reading the base would pass under the pre-fix behaviour too.
  const wsBase = join(root, "ws");
  const WS = join(wsBase, "fixture");
  const drive = (cmd, ...extra) => spawnSync(process.execPath,
    [self, cmd, "--draft", draft.path, "--workspace", wsBase, ...extra], { encoding: "utf8" });

  // 1 — a file with no frontmatter carries no trace to review against.
  {
    const d = join(root, "theses", "nofm"); mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "draft.md"), "## Just prose\n\nno record half.\n");
    const r = spawnSync(process.execPath, [self, "open", "--draft", join(d, "draft.md"), "--workspace", join(root, "ws-nofm")], { encoding: "utf8" });
    ok("a Draft with no frontmatter refuses, naming the record half",
      r.status === 1 && /opens with no frontmatter/.test(r.stderr));
  }

  // 2 — frontmatter present, trace empty.
  {
    const d = join(root, "theses", "notrace"); mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "draft.md"), "---\nbrief: brief.md\n---\n\n## Prose\n\nbody.\n");
    const r = spawnSync(process.execPath, [self, "open", "--draft", join(d, "draft.md"), "--workspace", join(root, "ws-notrace")], { encoding: "utf8" });
    ok("a Draft carrying no trace entries refuses", r.status === 1 && /carries no trace entries/.test(r.stderr));
  }

  // 3 — the kogaki#868 precondition: a Step with no line range. The refusal
  // names the Step AND the act that repairs it, because a Draft emitted before
  // #868 landed is repaired by re-emitting rather than by editing.
  {
    const d = join(root, "theses", "norange");
    buildDraft(d, { packetDir, omitLines: "a2" });
    const r = spawnSync(process.execPath, [self, "open", "--draft", join(d, "draft.md"), "--workspace", join(root, "ws-norange")], { encoding: "utf8" });
    ok("a Step with no line range refuses BY NAME",
      r.status === 1 && /step a2 carries no line range/.test(r.stderr));
    ok("and the refusal names re-emission as the repair", /draft\.mjs emit/.test(r.stderr));
  }

  // 4 — a Step naming no Packet.
  {
    const d = join(root, "theses", "nopacket");
    buildDraft(d, { packetDir, omitPacket: "a3" });
    const r = spawnSync(process.execPath, [self, "open", "--draft", join(d, "draft.md"), "--workspace", join(root, "ws-nopacket")], { encoding: "utf8" });
    ok("a Step naming no Packet refuses BY NAME",
      r.status === 1 && /step a3 names no Packet/.test(r.stderr));
  }

  // 5 — the Packet the trace names is gone. The workspace is pruned by design
  // (DESIGN.md §6), so this is an ordinary state and the refusal says how to
  // get out of it.
  {
    const pd = join(root, "packets-gone"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writeFileSync(join(pd, `${id}.md`), `packet ${id}\n`);
    const d = join(root, "theses", "gonepacket");
    buildDraft(d, { packetDir: pd });
    rmSync(join(pd, "a2.md"));
    const r = spawnSync(process.execPath, [self, "open", "--draft", join(d, "draft.md"), "--workspace", join(root, "ws-gone")], { encoding: "utf8" });
    ok("an absent Packet refuses BY NAME", r.status === 1 && /step a2: the Packet the trace names is absent/.test(r.stderr));
    ok("and names the re-render that repairs it", /draft\.mjs packet .*--step a2/.test(r.stderr));
  }

  // 6 — ACCEPTANCE 1's second half: a Packet whose sha differs from the
  // trace's. The Draft was not produced from this Packet, and every later
  // comparison would be against an input that produced nothing on the page.
  {
    const pd = join(root, "packets-drift"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writeFileSync(join(pd, `${id}.md`), `packet ${id}\n`);
    const d = join(root, "theses", "driftpacket");
    buildDraft(d, { packetDir: pd });
    writeFileSync(join(pd, "a1.md"), "packet a1 — edited after the Draft was emitted\n");
    const r = spawnSync(process.execPath, [self, "open", "--draft", join(d, "draft.md"), "--workspace", join(root, "ws-drift")], { encoding: "utf8" });
    ok("a Packet sha differing from the trace's refuses BY NAME",
      r.status === 1 && /step a1: the Packet's sha differs/.test(r.stderr));
    ok("and says what the difference MEANS, not only that it exists",
      /was not produced from this Packet/.test(r.stderr));
    ok("and renders both shas so the reader can tell which moved",
      /trace\s+[0-9a-f]{64}/.test(r.stderr) && /file\s+[0-9a-f]{64}/.test(r.stderr));
  }

  // 7 — ACCEPTANCE 1's first half: `open` succeeds on a well-formed Draft.
  const rOpen = drive("open");
  ok("open succeeds on a well-formed Draft", rOpen.status === 0);
  ok("open names the Steps it found", rOpen.stdout.includes("a1, a2, a3"));
  ok("open names the Sections it found", /sections\s+2 —/.test(rOpen.stdout));
  ok("open reports the Packets as verified against the trace", /packets\s+3 verified/.test(rOpen.stdout));
  ok("open renders the FIRST recovery input", /first recovery input: .*recovery[\/\\]a1\.md/.test(rOpen.stdout));
  ok("open writes a run record", existsSync(join(WS, "run.json")));

  // 8 — THE RECOVERY IS BLIND, and this is the case that binds it. The input
  // carries the prose and nothing from the Packet; a token only the Packet has
  // must not appear.
  {
    const input = readFileSync(join(WS, "recovery", "a1.md"), "utf8");
    ok("the recovery input carries the Step's prose", input.includes("The first passage opens the claim"));
    ok("the recovery input carries NOTHING from the Packet", !input.includes("PACKETONLYTOKEN"));
    ok("the recovery input names the draft line range it quoted", /draft lines \d+–\d+/.test(input));
    ok("the recovery input tells the reviewer not to reason about the input",
      /Do not reason about what a Packet/.test(input));
    // The prose the input quotes must be the prose at that range in the file —
    // an off-by-one here would review the wrong passage silently.
    const fileLines = readFileSync(draft.path, "utf8").split("\n");
    const [s, e] = [draft.ranges.a1[0] + draft.bodyOffset, draft.ranges.a1[1] + draft.bodyOffset];
    ok("the quoted passage is exactly the file lines the trace names",
      input.includes(fileLines.slice(s - 1, e).join("\n")));
  }

  // 9 — an unknown Step names BOTH sides.
  {
    const bad = join(root, "rec-bad.md"); writeFileSync(bad, "recovered\n");
    const r = drive("recover", "--step", "zz", "--file", bad);
    ok("an unknown step_id refuses naming both sides",
      r.status === 1 && /unknown step `zz`/.test(r.stderr) && /a1, a2, a3/.test(r.stderr));
  }

  // 10 — THE ORDERING GUARD. A record handed back for a Step whose input was
  // never rendered was written against something else, and afterwards there is
  // no way to tell what.
  {
    const rec = join(root, "rec-a3.md"); writeFileSync(rec, "recovered a3\n");
    const r = drive("recover", "--step", "a3", "--file", rec);
    ok("a Step whose recovery input was never rendered refuses",
      r.status === 1 && /step a3 has no rendered recovery input/.test(r.stderr));
    ok("and the refusal names the Step actually owed", /The Step now owed is a1/.test(r.stderr));
  }

  // 11 — recording one recovery renders the next.
  {
    const rec = join(root, "rec-a1.md"); writeFileSync(rec, "recovered a1\n");
    const r = drive("recover", "--step", "a1", "--file", rec);
    ok("a recovery is recorded", r.status === 0 && /recorded: a1/.test(r.stdout));
    ok("and the NEXT recovery input is rendered", /next recovery input: .*a2\.md/.test(r.stdout));
    ok("the recovered record lands in the workspace", existsSync(join(WS, "recovered", "a1.md")));
  }

  // 12 — ACCEPTANCE 2: compare before every recovery refuses, naming what is
  // missing. Both halves are named, not only the first one found.
  {
    const r = drive("compare");
    ok("compare with recoveries outstanding refuses", r.status === 1);
    ok("and names the missing Steps", /step recoveries: a2, a3/.test(r.stderr));
    ok("and names the missing Section entries in the SAME refusal",
      /section ledger entries: 1, 2/.test(r.stderr));
    ok("and says why a partial join is worse than none",
      /report the gaps as agreement/.test(r.stderr));
  }

  // 13 — finish the recoveries. The LAST one hands over to the Section ledger
  // rather than rendering a next input, which is what makes the flow
  // self-driving all the way to `compare` instead of stopping silently.
  let lastRecover = null;
  for (const id of ["a2", "a3"]) {
    const rec = join(root, `rec-${id}.md`); writeFileSync(rec, `recovered ${id}\n`);
    lastRecover = drive("recover", "--step", id, "--file", rec);
    ok(`recovery ${id} is recorded`, lastRecover.status === 0);
  }
  ok("the last recovery renders no next input",
    !/next recovery input/.test(lastRecover.stdout));
  ok("and hands over to the Section ledger, naming how many entries it owes",
    /every Step is recovered/.test(lastRecover.stdout)
    && /2 entries/.test(lastRecover.stdout));

  // 14 — compare now names ONLY the Section entries.
  {
    const r = drive("compare");
    ok("compare with only Section entries outstanding refuses on those alone",
      r.status === 1 && /section ledger entries: 1, 2/.test(r.stderr) && !/step recover/.test(r.stderr));
  }

  // 15 — an unknown Section refuses; a known one records.
  {
    const led = join(root, "led.md"); writeFileSync(led, "the question I answered\n");
    const bad = drive("read", "--section", "9", "--file", led);
    ok("an unknown Section refuses naming the Sections that exist",
      bad.status === 1 && /unknown section 9/.test(bad.stderr) && /1, 2/.test(bad.stderr));
    const r1 = drive("read", "--section", "1", "--file", led);
    ok("a Section entry is recorded", r1.status === 0 && /recorded: section 1/.test(r1.stdout));
    ok("and the ones still owed are named", /sections still owed: 2/.test(r1.stdout));
    const r2 = drive("read", "--section", "2", "--file", led);
    ok("the last Section entry says every entry is recorded", /every Section entry is recorded/.test(r2.stdout));
  }

  // 16 — `check` before `compare` refuses. Asserted on a SECOND workspace,
  // because this run has already compared by the time the later cases need it.
  {
    const ws2 = join(root, "ws2");
    const d2 = spawnSync(process.execPath, [self, "open", "--draft", draft.path, "--workspace", ws2], { encoding: "utf8" });
    ok("a second run opens independently", d2.status === 0);
    const r = spawnSync(process.execPath, [self, "check", "--draft", draft.path, "--workspace", ws2], { encoding: "utf8" });
    ok("check before compare refuses", r.status === 1 && /pass two and there is no pass one/.test(r.stderr));
    const c = spawnSync(process.execPath, [self, "close", "--draft", draft.path, "--workspace", ws2], { encoding: "utf8" });
    ok("close before compare refuses, naming both routes in",
      c.status === 1 && /reachable from `compare` with zero fails, or from `check`/.test(c.stderr));
  }

  // 17 — the join runs with every input present, and SAYS it is unfilled
  // rather than rendering an empty findings list that reads like a clean pass.
  {
    const r = drive("compare");
    ok("compare succeeds once every input is present", r.status === 0);
    ok("and reports the counts it joined over", /3 recovered Step\(s\), 2 Section entries/.test(r.stdout));
    ok("and distinguishes an UNFILLED join from a clean review",
      /unfilled join rather than a clean review/.test(r.stdout));
    ok("and names the issue that fills it", /kogaki#872/.test(r.stdout));
    ok("a join record lands in the workspace", existsSync(join(WS, "join.json")));
  }

  // 18 — the two entry points this artifact DECLARES and kogaki#874 builds.
  // Registered rather than absent: a reviewer reaching for `correct` gets the
  // issue that owns it instead of "unknown command".
  {
    const r = drive("correct", "--step", "a1", "--file", join(root, "rec-a1.md"));
    ok("correct is declared and names the issue that builds it",
      r.status === 1 && /kogaki#874/.test(r.stderr) && !/unknown/.test(r.stderr));
    const c = drive("check");
    ok("check after compare names the issue that builds pass two",
      c.status === 1 && /kogaki#874/.test(c.stderr));
  }

  // 19 — ACCEPTANCE 3: close writes the owner record with its three lists.
  {
    const r = drive("close");
    ok("close succeeds from compare with zero fails", r.status === 0);
    const out = join(thesis, "review.md");
    ok("close writes review.md beside the Draft", existsSync(out));
    const text = readFileSync(out, "utf8");
    ok("the record is headed by the Draft's body sha", text.includes(sha256(readDraft(draft.path).body)));
    ok("the record names every Packet it was reviewed against with its sha",
      ["a1", "a2", "a3"].every((id) => text.includes(`\`${id}\``))
      && (text.match(/sha `[0-9a-f]{64}`/g) || []).length === 3);
    ok("the record carries the Findings list", /^## Findings$/m.test(text));
    ok("the record carries the Corrections list", /^## Corrections$/m.test(text));
    ok("the record carries the Residue list", /^## Residue$/m.test(text));
    ok("an unfilled join is stated as such in the record rather than as no findings",
      /unfilled join, not a clean review/.test(text));
    ok("the record states how many passes ran", /\*\*Passes\.\*\* one \(compare\)/.test(text));
    ok("the record tells the owner what to fill classified: with",
      /`packet` or `reviewdraft`/.test(text));
  }

  // 20 — ACCEPTANCE 3's binding half: EVERY residue line carries an empty
  // `classified:` field, and the tool never fills it. Driven by writing residue
  // into the run record, because the correction path that produces residue is
  // kogaki#874 and this artifact still owes the rendering.
  {
    const run = JSON.parse(readFileSync(join(WS, "run.json"), "utf8"));
    run.residue = [
      { step_id: "a1", item: "reader_state_after", why: "the recovered state still differs after pass two" },
      { step_id: "a3", item: "restates", why: "the passage restates the Packet's wording" },
    ];
    writeFileSync(join(WS, "run.json"), JSON.stringify(run, null, 2) + "\n");
    const r = drive("close");
    ok("close renders residue", r.status === 0);
    const text = readFileSync(join(thesis, "review.md"), "utf8");
    const residue = text.slice(text.indexOf("## Residue"));
    const items = (residue.match(/^- \*\*/gm) || []).length;
    const fields = (residue.match(/^ {2}classified:$/gm) || []).length;
    ok("every residue line carries a classified: field", items === 2 && fields === 2);
    ok("and the tool leaves every one of them EMPTY",
      !/^ {2}classified:[^\n]*\S/m.test(residue));
  }

  // 21 — the record is ONE per Draft, overwritten on re-run. A second file
  // would leave two records disagreeing about the same Draft.
  {
    const before = readdirSync(thesis).filter((f) => f.startsWith("review")).length;
    drive("close");
    const after = readdirSync(thesis).filter((f) => f.startsWith("review")).length;
    ok("close overwrites its record rather than minting a second", before === 1 && after === 1);
  }

  // 22 — a Draft edited under a live run is a different document, and the run
  // record says so rather than judging prose nobody rendered an input for.
  {
    const original = readFileSync(draft.path, "utf8");
    writeFileSync(draft.path, original + "\nA paragraph added after the run opened.\n");
    const r = drive("compare");
    ok("a Draft edited since `open` refuses", r.status === 1 && /has changed since this run was opened/.test(r.stderr));
    ok("and names re-opening as the repair", /Re-open the run/.test(r.stderr));
    writeFileSync(draft.path, original);
  }

  // 23 — THE CLOSED INPUT SET, asserted structurally rather than promised. The
  // owner's ruling is that a need for a Brief, a Move or a Strand is a PACKET
  // GAP; the mechanical half is that no such read exists in this file.
  // AN ALLOWLIST, NOT A DENYLIST (PR #882 round 1, finding 5). The first form
  // named the modules it refused, so a future `./strand.mjs` would have passed
  // it while breaking the ruling it exists to mechanize — the enumerated
  // prohibition whose load-bearing half is its non-member fallback, and whose
  // fallback there was ADMIT. Enumerating what the Harness MAY import inverts
  // that: an import nobody anticipated is refused by default, which is what
  // makes the registry's claim ("a property rather than a promise") hold
  // against edits nobody anticipated either.
  {
    const src = readFileSync(self, "utf8");
    const code = src.slice(0, src.indexOf("async function runSelfTest"));
    const ALLOWED = new Set(["node:fs", "node:path", "node:url", "node:crypto", "./runs.mjs"]);
    const imports = [...code.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
    const foreign = imports.filter((m) => !ALLOWED.has(m));
    ok("the Harness imports ONLY node builtins and ./runs.mjs — an allowlist, so an unanticipated reader is refused by default",
      imports.length > 0 && foreign.length === 0, foreign.join(", "));
    // The two store literals stay asserted beside it: a Move or Strand reached
    // by a path composed at runtime imports nothing, so the allowlist alone
    // cannot see it. Neither case subsumes the other.
    //
    // AND THE CLAUSE IS NARROW ON PURPOSE. `brief.md` is deliberately NOT in
    // this list, though the ruling covers Briefs too: the refusals at
    // `resolveInputs` name `draft.mjs emit --brief <brief.md>` as the act that
    // repairs a stale trace, and a literal test cannot tell that MENTION from a
    // READ. Widening it would have failed on a correct refusal message, which
    // is the guard-that-fires-on-correct-behaviour shape. The Brief is covered
    // by the allowlist above, where the distinction is decidable.
    ok("and reads no moves/ or gloss/ store literal",
      !/moves\//.test(code) && !/ELEMENTS\.jsonl/.test(code));
  }

  // 23a — FINDING 2: `body_sha` is the SAME number on both sides. `emit` writes
  // `fm + "\n\n" + body + "\n"` and records `sha256(body)`; the fixture Draft is
  // built in exactly that shape, so the two can be compared directly. The
  // pre-fix reader hashed `body + "\n"` and no case could witness it, because
  // every assertion went through this module's own reader.
  {
    const raw = readFileSync(draft.path, "utf8");
    const fmEnd = raw.indexOf("\n---\n", 3) + "\n---\n".length;
    const emitted = raw.slice(fmEnd + 1);            // past the blank line
    const emitBody = emitted.replace(/\n$/, "");      // what `emit` hashed
    ok("readDraft's body is exactly the string `emit` hashes",
      readDraft(draft.path).body === emitBody);
    const text = readFileSync(join(thesis, "review.md"), "utf8");
    ok("and the body sha in the owner record matches it",
      text.includes(sha256(emitBody)));
  }

  // 23b — FINDING 3: `--workspace` is a BASE and the slug is joined onto it, so
  // two Drafts driven under one base do not share a run record. Before the fix
  // the second `open` silently overwrote the first's rendered inputs.
  {
    const other = join(root, "theses", "second");
    const d2 = buildDraft(other, { packetDir });
    const base = join(root, "shared-base");
    const o1 = spawnSync(process.execPath, [self, "open", "--draft", draft.path, "--workspace", base], { encoding: "utf8" });
    const o2 = spawnSync(process.execPath, [self, "open", "--draft", d2.path, "--workspace", base], { encoding: "utf8" });
    ok("two Drafts open under one --workspace base", o1.status === 0 && o2.status === 0);
    ok("and each gets its own run record under its own slug",
      existsSync(join(base, "fixture", "run.json")) && existsSync(join(base, "second", "run.json")));
    const r1 = JSON.parse(readFileSync(join(base, "fixture", "run.json"), "utf8"));
    ok("so the first run's record still names the first Draft",
      r1.draft === resolve(draft.path) && r1.slug === "fixture");
  }

  // 23c — FINDING 6: the owner record ends with a newline, like every other
  // write here. It is repo-visible and committed, so without one it lands as a
  // no-final-newline file in every diff that touches it.
  {
    const text = readFileSync(join(thesis, "review.md"), "utf8");
    ok("the owner record ends with a newline", text.endsWith("\n"));
  }

  // 24 — usage with no command, and an unknown command.
  {
    const u = spawnSync(process.execPath, [self], { encoding: "utf8" });
    ok("bare invocation prints usage and exits 0", u.status === 0 && /review-draft —/.test(u.stdout));
    ok("usage names every entry point the design declares",
      ["open", "recover", "read", "compare", "correct", "check", "close"].every((c) => u.stdout.includes(`review-draft.mjs ${c}`)));
    const b = spawnSync(process.execPath, [self, "nonsense"], { encoding: "utf8" });
    ok("an unknown command exits 1 with the usage", b.status === 1);
  }

  // 25 — the omitted-value guard, inherited from draft.mjs: a bare `--draft`
  // parses as boolean true and String(true) would reach readFileSync.
  {
    const r = spawnSync(process.execPath, [self, "open", "--draft"], { encoding: "utf8" });
    ok("a bare --draft refuses with usage rather than reading a file named `true`",
      r.status === 1 && /usage: review-draft open/.test(r.stderr));
  }

  rmSync(root, { recursive: true, force: true });
  process.stdout.write(`review-draft self-test: ${passed} case(s) pass, ${failures.length} fail\n`);
  for (const f of failures) process.stdout.write(`  FAIL: ${f}\n`);
  process.exit(failures.length ? 1 : 0);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args["self-test"]) return runSelfTest();
  const cmd = args._cmd;
  if (!cmd || !COMMANDS[cmd]) {
    process.stdout.write(USAGE);
    process.exit(cmd ? 1 : 0);
  }
  COMMANDS[cmd](args);
}

main();

export { readDraft, resolveInputs, slugOf, missingFor, sha256 };
