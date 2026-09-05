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
// THE COMPARISON IS FIXED IN THE HARNESS (kogaki#872). `src/review-items.json`
// decides which Packet information must be recoverable per item class, which
// items are preserved and which best-effort, and which are decided from string
// facts rather than put to a reader. The judging model sees ONE pair and ONE
// question and answers with one of three tokens — it never assigns severity,
// never ranks, and never sees two pairs at once, because the table already
// holds every consequence a verdict has.
//
// COMPLETION: the command runs to completion — it ends when `review.md` exists.
// Two passes at most (owner ruling 2026-09-04). It finishes with residue rather
// than reaching for a third pass, because the residue is the useful output:
// what survives two passes is information about ReviewDraft itself or about the
// Packet, and the owner classifies which.
//
// WHAT THIS ARTIFACT DOES NOT OWN, stated so a reader can tell a boundary from
// a hole. The cold reader's pairing rules are kogaki#873; `correct` and the
// bounded second pass are kogaki#874. Each is registered in the dispatcher below
// and refuses by naming its issue, so the surface this file declares is the
// surface a later child fills rather than one it has to discover. The recovery
// input's record schema (kogaki#871) and the item classes, the three-valued
// verdict and the mechanical checks (kogaki#872) are FILLED — named here as
// landed rather than dropped from the list, because a boundary that quietly
// stops being one cannot be told from a boundary a reader misremembered.
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
// THE ARTICLE BEFORE THIS PASSAGE, re-derived from the CURRENT Draft rather
// than read from the Packet that produced the prose (kogaki#871). Two reasons,
// and only the second is about blindness: the Packet's own "article so far"
// block was true when the Step was written and a later correction may have
// moved it, so the current Draft is the article the reader actually meets; and
// reading the Packet for it would put Packet bytes into a reviewer whose
// ignorance is the instrument.
//
// Grouped under the Section headings the trace declares, never by scanning the
// body for `##` lines — the trace already maps each Step to its Section
// (kogaki#823), and a heading scan would be a second answer to a question the
// trace answers.
function articleBefore(steps, stepId) {
  const idx = steps.findIndex((s) => s.step_id === stepId);
  if (idx <= 0) {
    return "(nothing yet — this is the article's first passage, so nothing precedes it.)";
  }
  const out = [];
  let openSection = null;
  for (const s of steps.slice(0, idx)) {
    if (s.section !== openSection) {
      if (out.length) out.push("");
      out.push(`## ${s.section_title ?? `Section ${s.section}`}`, "");
      openSection = s.section;
    }
    out.push(s.prose, "");
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  return out.join("\n");
}

// The passage, one line per line, each carrying its DRAFT line number so the
// reviewer's spans and the trace's ranges are in one coordinate system. A
// reviewer counting lines itself would be inventing the join key.
function numberedProse(step) {
  const width = String(step.lines[1]).length;
  return step.prose.split("\n")
    .map((l, i) => `${String(step.lines[0] + i).padStart(width, " ")} | ${l}`)
    .join("\n");
}

// THE WORDING LIVES IN A FILE A PERSON CAN EDIT, the same arrangement
// `src/draft.mjs` has with `src/packet-template.md`. The template is resolved
// from THIS MODULE's location, never from the cwd a command happens to be
// invoked in.
function renderRecoveryInput(ws, draft, step, steps) {
  const tplPath = join(dirname(fileURLToPath(import.meta.url)), "recovery-template.md");
  if (!existsSync(tplPath)) {
    fail(`the recovery template is absent — ${tplPath}. It is the reviewer's entire input, so a `
      + "missing template is a hole the reviewer fills by invention; this refuses rather than "
      + "rendering prose with no instruction.");
  }
  let out = readFileSync(tplPath, "utf8");
  // The HTML comment is authoring guidance for the template's maintainer and is
  // NOT part of the reviewer's input — stripped so the rendered file is exactly
  // what the reviewer reads and nothing more. Inherited from the Packet render.
  out = out.replace(/^<!--[\s\S]*?-->\n*/, "");
  const fields = {
    step_id: step.step_id,
    article_so_far: articleBefore(steps, step.step_id),
    step_lines: `${step.lines[0]}–${step.lines[1]}`,
    step_prose: numberedProse(step),
    recover_command: `node src/review-draft.mjs recover --draft ${relative(process.cwd(), draft.path) || draft.path} --step ${step.step_id} --file <recovered.json>`,
  };
  for (const [k, v] of Object.entries(fields)) out = out.split(`{{${k}}}`).join(v);
  const left = out.match(/\{\{(\w+)\}\}/);
  if (left) {
    fail(`the recovery template's slot {{${left[1]}}} was not filled — the renderer and the `
      + "template disagree about the slot set, which is the round trip failing silently");
  }
  const dir = join(ws, "recovery");
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, `${step.step_id}.md`);
  writeFileSync(dest, out.endsWith("\n") ? out : out + "\n");
  return dest;
}

// ---------------------------------------------------------------------------
// Validating the recovered record. THE CONTRACT IS `src/recovered-schema.json`
// AND THIS FUNCTION READS IT (kogaki#871) — the field list is not restated
// here, so amending the record's shape is one edit to that file and never a
// two-copy divergence. Same arrangement `src/record-schema.json` has with
// `checks/check-proposal-contract.sh`.
//
// EVERY REFUSAL NAMES WHAT IT SAW. A record handed back by a reviewer is the
// one artifact in this flow a person wrote by hand, so "invalid" without the
// field is a refusal that costs another read of the schema to act on.
function readSchema() {
  const p = join(dirname(fileURLToPath(import.meta.url)), "recovered-schema.json");
  if (!existsSync(p)) {
    fail(`the recovered-record schema is absent — ${p}. It is the contract a recovery is `
      + "validated against, so this refuses rather than accepting an unvalidated record.");
  }
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { fail(`the recovered-record schema at ${p} is not readable JSON (${e.message})`); }
}

function validateRecovered(text, step, file) {
  const schema = readSchema();
  let rec;
  try { rec = JSON.parse(text); }
  catch (e) {
    fail(`${file} is not readable JSON (${e.message}) — a recovered record is one JSON object, `
      + `validated against src/recovered-schema.json`);
  }
  if (rec === null || typeof rec !== "object" || Array.isArray(rec)) {
    fail(`${file} is not a JSON object — a recovered record is one object carrying the fields `
      + `${schema.required.join(", ")}`);
  }
  const problems = [];

  // THE REVIEWER WRITES NO VERDICTS AND NO ADVICE, and a forbidden key is
  // REFUSED rather than dropped: an ignored field still shaped the reading that
  // produced the rest of the record, so accepting the record and discarding the
  // key would keep exactly the contamination the blindness exists to prevent.
  // CHECKED AT EVERY DEPTH, not only at the top level (PR #884 round 1,
  // finding 2). The schema's own reason for refusing rather than dropping — an
  // ignored field still shaped the reading that produced the rest of the record
  // — applies unchanged to a verdict written one level down, and a reviewer
  // smuggling a judgment into a claim object is at least as likely as one
  // adding an eighth sibling field.
  const forbidden = new Set(schema.forbidden_keys || []);
  const walk = (node, path) => {
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
    if (node === null || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      const at = path ? `${path}.${k}` : `\`${k}\``;
      if (forbidden.has(k)) {
        problems.push(`carries the forbidden key ${at} — the reviewer recovers what the prose `
          + "says and writes no verdicts and no advice; a record carrying one is refused rather "
          + "than accepted with the key ignored");
      }
      walk(v, path ? `${path}.${k}` : `\`${k}\``);
    }
  };
  walk(rec, "");

  const inStep = (span) => Array.isArray(span) && span.length === 2
    && Number.isInteger(span[0]) && Number.isInteger(span[1])
    && span[0] <= span[1] && span[0] >= step.lines[0] && span[1] <= step.lines[1];

  for (const key of schema.required) {
    if (!Object.prototype.hasOwnProperty.call(rec, key)) {
      problems.push(`is missing the required field \`${key}\``);
      continue;
    }
    const spec = (schema.fields || {})[key] || {};
    const v = rec[key];
    if (spec.type === "string") {
      if (typeof v !== "string" || v.trim() === "") {
        problems.push(`\`${key}\` must be a non-empty string`);
      }
      continue;
    }
    if (spec.type !== "array") continue;
    if (!Array.isArray(v)) { problems.push(`\`${key}\` must be an array`); continue; }
    if (spec.min !== undefined && v.length < spec.min) {
      problems.push(`\`${key}\` carries ${v.length} entr${v.length === 1 ? "y" : "ies"} and needs at `
        + `least ${spec.min}${spec.why_min ? ` — ${spec.why_min}` : ""}`);
    }
    v.forEach((item, i) => {
      const at = `\`${key}\`[${i}]`;
      if (spec.of === "string") {
        if (typeof item !== "string" || item.trim() === "") problems.push(`${at} must be a non-empty string`);
        return;
      }
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        problems.push(`${at} must be an object`); return;
      }
      for (const req of spec.item_required || []) {
        if (!Object.prototype.hasOwnProperty.call(item, req)) problems.push(`${at} is missing \`${req}\``);
      }
      if (spec.text_key && typeof item[spec.text_key] === "string" && item[spec.text_key].trim() === "") {
        problems.push(`${at}.${spec.text_key} is empty`);
      }
      if (schema.spans_lie_inside_the_step && spec.span_key
          && Object.prototype.hasOwnProperty.call(item, spec.span_key)
          && !inStep(item[spec.span_key])) {
        problems.push(`${at}.${spec.span_key} is ${JSON.stringify(item[spec.span_key])}, which does not lie `
          + `inside ${step.step_id}'s draft line range [${step.lines[0]}, ${step.lines[1]}] — a record `
          + "pointing outside the passage is not evidence about it");
      }
    });
  }

  if (problems.length) {
    fail(`the recovered record for ${step.step_id} (${file}) does not satisfy `
      + `src/recovered-schema.json:\n  - ${problems.join("\n  - ")}`);
  }
  return rec;
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
  const input = renderRecoveryInput(ws, draft, first, steps);
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

  // VALIDATED BEFORE IT IS RECORDED (kogaki#871). A record written to the
  // workspace and validated later would leave `compare` to discover the defect,
  // by which point the reviewer who could fix it has finished reading.
  const content = readFileSync(file, "utf8");
  const step = run.steps.find((x) => x.step_id === stepId);
  validateRecovered(content, step, file);

  const dir = join(ws, "recovered");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${stepId}.json`);
  writeFileSync(out, content);
  run.recovered[stepId] = out;

  const next = nextUnrecovered(run);
  let nextInput = null;
  if (next) {
    const { steps } = resolveInputs(draft);
    const full = steps.find((s) => s.step_id === next.step_id);
    nextInput = renderRecoveryInput(ws, draft, full, steps);
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

// ---------------------------------------------------------------------------
// THE COMPARISON (kogaki#872). The join between what a Packet DECLARED and what
// the blind reviewer RECOVERED from the prose it produced.
//
// THE ITEM TABLE IS FIXED IN THE HARNESS AND READ FROM `src/review-items.json`
// — which item classes exist, which are preserved and which are best-effort,
// which are decided mechanically and which are put to a model. The runtime does
// not restate it, the same arrangement `src/recovered-schema.json` already has
// with the recovery half: amending the table is one edit.
//
// THE MODEL NEVER ASSIGNS SEVERITY, and that is the whole reason the table is
// here rather than in a prompt. A judging model sees ONE pair, answers ONE
// question, and returns one of three tokens with one sentence. It cannot rank,
// weigh or aggregate, because it is never shown two pairs at once. What a
// `fails` COSTS is the table's: a preserved item's fail sends the Step to
// correction, a best-effort item's rides along if that Step is re-realized
// anyway.
//
// `cannot-decide` IS NEVER ROUNDED. It is a third answer, not a weak `holds`,
// and it is listed with its pair so a person can look at what the reader could
// not settle.

function readItems() {
  const p = join(dirname(fileURLToPath(import.meta.url)), "review-items.json");
  if (!existsSync(p)) {
    fail(`the item table is absent — ${p}. It is the whole of what the comparison compares, so `
      + "this refuses rather than joining against a table it invented.");
  }
  let t;
  try { t = JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { fail(`the item table at ${p} is not readable JSON (${e.message})`); }
  if (!Array.isArray(t.items) || !t.items.length) fail(`the item table at ${p} declares no items`);
  return t;
}

// ---------------------------------------------------------------------------
// Reading the DECLARED side back out of a rendered Packet.
//
// THE PACKET IS PARSED AS THE TEMPLATE WRITES IT, never as general markdown —
// the same reading `readDraft` gives the trace, and for the same reason: a
// second grammar can disagree with the writer about what was written. Every
// block below is a form `src/packet-template.md` renders, and a block that is
// absent is a PACKET GAP rather than something to work around, per the owner's
// 2026-09-04 closed-input ruling. The refusal names the block, the item that
// needed it, and the file the gap is filed against.

// The stated-absence forms the Packet renderer writes where a value is empty.
// They are ANSWERS and not holes: a Packet saying "(nothing new)" has told the
// comparison there is nothing to compare, which is different from a Packet that
// never rendered the block at all.
const PACKET_ABSENCE = /^\((none|nothing)\b/i;

// A `- **label.** value` line, plus any continuation lines the renderer wrapped
// under it. The renderer puts multi-entry values (a term list, a knows list) on
// the lines below the label, so a reader that took only the label line would
// silently see the first entry and no others.
function packetBullet(text, label) {
  const lines = text.split("\n");
  const head = new RegExp(`^- \\*\\*${label}\\.\\*\\*\\s?(.*)$`);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(head);
    if (!m) continue;
    const out = m[1] === "" ? [] : [m[1]];
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (l.trim() === "" || l.startsWith("#") || /^- \*\*/.test(l)) break;
      out.push(l);
    }
    return out.join("\n").trim();
  }
  return null;
}

// A `- item` list read out of a bullet value, with the stated-absence forms
// answering as the empty list. `already knows` renders each entry as
// `term — anchor (introduced at <step>)`; only the term is the join key, and the
// anchor is what the Packet carries FOR THE WRITER rather than for this reader.
function bulletList(value, { termOnly = false } = {}) {
  if (value === null) return null;
  if (PACKET_ABSENCE.test(value)) return [];
  const out = [];
  for (const l of value.split("\n")) {
    const m = l.match(/^\s*-\s+(.*\S)\s*$/);
    if (!m) continue;
    let t = m[1];
    if (termOnly) {
      t = t.split(" — ")[0].replace(/\s*\(introduced at [^)]*\)\s*$/, "").trim();
    }
    if (t) out.push(t);
  }
  return out;
}

// The block between a heading and the next one, with the template's own fixed
// instruction paragraph dropped — what is left is the rendered VALUE. Matched
// on the heading's text rather than its level, because the level is the
// template's business and the block's identity is its name.
function packetBlock(text, heading, { after = null } = {}) {
  const lines = text.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#+\s+(.*\S)\s*$/);
    if (m && m[1] === heading) { start = i + 1; break; }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (/^#+\s+\S/.test(lines[i])) { end = i; break; }
  }
  let body = lines.slice(start, end).join("\n");
  // THE FIXED INSTRUCTION PARAGRAPH IS MATCHED AS A WORD SEQUENCE, never as a
  // literal: the template wraps its prose, and a literal that carried the
  // template's own line breaks would stop matching the moment somebody rewrapped
  // a paragraph — which changes nothing and would silently hand the whole
  // instruction paragraph back as the block's VALUE.
  if (after) {
    const m = body.match(after);
    if (m) body = body.slice(m.index + m[0].length);
  }
  return body.trim();
}

// ONE READER PER BLOCK KIND, and every label, heading and fixed sentence it
// keys on comes from `packet_blocks` in the item table. The runtime therefore
// carries no literal that happens to equal a field name somewhere else —
// `grounds`, `purpose` and `reader_state_after` are each a Packet label AND an
// item id AND (for two of them) a recovered-record field, and a runtime
// spelling them out cannot be told apart from one restating the table or the
// schema.
const PACKET_READERS = {
  ground_lines: (t, spec) => {
    const re = new RegExp(`^${spec.prefix}\\s`);
    const g = t.split("\n").filter((l) => re.test(l)).map((l) => l.trim());
    if (g.length) return g;
    // The renderer writes a stated absence where a Step declares none, and that
    // is an answer. It is only a hole when the block is absent altogether.
    const bullet = packetBullet(t, spec.bullet_label);
    if (bullet !== null && PACKET_ABSENCE.test(bullet)) return [];
    return null;
  },
  bullet: (t, spec) => packetBullet(t, spec.label),
  bullet_list: (t, spec) => bulletList(packetBullet(t, spec.label), { termOnly: !!spec.term_only }),
  bullets: (t, spec) => {
    const out = {};
    for (const label of spec.labels) {
      const v = packetBullet(t, label);
      if (v === null) return null;
      out[label] = v;
    }
    return out;
  },
  block: (t, spec) => {
    const b = packetBlock(t, spec.heading, { after: wordSequence(spec.after_words) });
    if (b === null) return null;
    return PACKET_ABSENCE.test(b) ? "" : b;
  },
  paragraph: (t, spec) => {
    const i = t.indexOf(spec.opens_with);
    if (i === -1) return null;
    const rest = t.slice(i);
    const end = rest.indexOf("\n\n");
    return (end === -1 ? rest : rest.slice(0, end)).trim();
  },
};

// A fixed sentence from the template, as a pattern that ignores how it was
// wrapped. Every character is escaped and every run of whitespace becomes one
// `\s+`, so the pattern matches the sentence and never anything else.
function wordSequence(s) {
  return new RegExp(String(s).trim().split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"));
}

// The declared side for one Step, read once and refusing BY NAME on the first
// block an item needs and the Packet does not carry.
function declaredFor(step, items) {
  const text = readFileSync(step.packet_path, "utf8");
  const need = new Set();
  for (const it of items.items) {
    if (it.declared_block) need.add(it.declared_block);
    for (const b of it.also_declared_blocks || []) need.add(b);
  }
  const out = {};
  for (const name of need) {
    const spec = (items.packet_blocks || {})[name];
    const reader = spec && PACKET_READERS[spec.kind];
    if (!reader) {
      fail(`the item table names the Packet block \`${name}\`, which this Harness has no reader for `
        + "— the table and the runtime disagree about the Packet's shape, and a comparison run "
        + "against a block nobody reads would report agreement it never checked");
    }
    const v = reader(text, spec);
    if (v === null) {
      const wanted = items.items.filter((i) => i.declared_block === name
        || (i.also_declared_blocks || []).includes(name)).map((i) => i.id);
      fail(`step ${step.step_id}: its Packet carries no \`${name}\` block, which the item(s) `
        + `${wanted.join(", ")} compare against.\n  packet  ${step.packet_path}\n`
        + "A block the comparison needs and the Packet does not carry is a PACKET GAP: file it "
        + "against src/packet-template.md. It is never satisfied by reading the Brief, the Move "
        + "or the Strand — the owner's 2026-09-04 ruling is that a need for those is evidence "
        + "the Packet is missing information.");
    }
    out[name] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The mechanical half. Every check below is a STRING FACT about the Draft and
// its Packet — no model call is made for any of them, and the join record says
// so per item, which is what makes "decided mechanically" checkable rather than
// claimed.

// The literal below is wrapped so that no line ends on the preposition an
// import statement uses. The closed-input case reads this file's own text for
// import shapes, and a stopword list is not an import. THE SHAPE IS NOT SPELLED
// OUT HERE, deliberately: a comment that writes the pattern it exists to avoid
// becomes the first hit of the reader looking for it, which is the use-versus-
// mention defect src/packet-template.md's own header records.
const STOPWORDS = new Set(("a an and are as at be been being but by can could did do does "
  + "for had has have how in into is it its may might must not of on or should so than the "
  + "that their from these they this those to was were what when which who will with would you your "
  + "them then there")
  .split(" "));

function wordsOf(s) { return (String(s).toLowerCase().match(/[a-z0-9']+/g) || []); }
function contentWords(s) { return wordsOf(s).filter((w) => !STOPWORDS.has(w)); }

// CONTAINMENT, not similarity: the question is whether the CLAIM is covered by
// a ground, so the denominator is the claim's own content words. A symmetric
// score would let a long ground pair with anything and a short one with
// nothing, which is the wrong shape for "may this passage assert this".
function pairClaims(grounds, claims, textKey, floor) {
  const gsets = grounds.map((g) => new Set(contentWords(g)));
  return claims.map((c, i) => {
    const cw = contentWords(c && c[textKey]);
    let best = -1; let score = 0;
    if (cw.length) {
      gsets.forEach((gs, j) => {
        const hit = cw.filter((w) => gs.has(w)).length / cw.length;
        if (hit > score) { score = hit; best = j; }
      });
    }
    return { claim_index: i, ground_index: score >= floor ? best : -1 };
  });
}

// Every draft line of this Step, paired with its own draft line number — the
// coordinate the trace, the recovered spans and every finding below share.
function numberedLines(step) {
  return step.prose.split("\n").map((text, i) => ({ n: step.lines[0] + i, text }));
}

// The first N-word window of `line` that occurs verbatim in `haystack`.
// Normalized to a word sequence on both sides, so a wrap, a double space or a
// comma is not what decides it — the words are.
function verbatimWindow(line, haystacks, n) {
  const w = wordsOf(line);
  if (w.length < n) return null;
  const hays = haystacks.map((h) => " " + wordsOf(h).join(" ") + " ");
  for (let i = 0; i + n <= w.length; i++) {
    const win = w.slice(i, i + n).join(" ");
    if (hays.some((h) => h.includes(" " + win + " "))) return win;
  }
  return null;
}

// The earliest draft line on which `term` occurs as a word sequence, over the
// WHOLE Draft body rather than over one Step: `term-before-introduction` asks
// where the reader first meets a word, and the reader reads the article.
function firstOccurrence(draft, term) {
  const t = wordsOf(term);
  if (!t.length) return null;
  const needle = " " + t.join(" ") + " ";
  for (let i = 0; i < draft.lines.length; i++) {
    if ((" " + wordsOf(draft.lines[i]).join(" ") + " ").includes(needle)) return i + 1;
  }
  return null;
}

// ONE IMPLEMENTATION PER MECHANICAL ITEM, keyed by the item's own id. Each
// returns `{verdict, reason, span}` and never a score. The ids here are
// BINDINGS to the table's `mode: mechanical` rows — a table row whose id has no
// implementation is refused below rather than silently skipped, which is the
// half that keeps the two from drifting apart.
const MECHANICAL = {
  "term-before-introduction": ({ declared, step, draft, item }) => {
    const terms = declared[item.declared_block];
    for (const term of terms) {
      const at = firstOccurrence(draft, term);
      if (at !== null && at < step.lines[0]) {
        return {
          verdict: "fails",
          reason: "a term this Step introduces is used before it",
          evidence: term,
          span: [at, at],
        };
      }
    }
    return {
      verdict: "holds",
      reason: terms.length
        ? "no term this Step introduces occurs before it"
        : "this Step introduces no term",
      span: step.lines,
    };
  },

  "grounds-unused": ({ declared, pairs, step, item }) => {
    const grounds = declared[item.declared_block];
    const used = new Set(pairs.filter((p) => p.ground_index !== -1).map((p) => p.ground_index));
    const unused = grounds.map((g, i) => [g, i]).filter(([, i]) => !used.has(i));
    if (!unused.length) {
      return {
        verdict: "holds",
        reason: grounds.length ? "every ground is carried by a recovered claim"
          : "this Step declares no grounds",
        span: step.lines,
      };
    }
    return {
      verdict: "fails",
      reason: "a ground no recovered claim rests on",
      evidence: unused.map(([g]) => g),
      span: step.lines,
    };
  },

  "restates-earlier-step": ({ step, earlier, items }) => {
    const n = items.thresholds.verbatim_overlap_words;
    const haystack = earlier.map((s) => s.prose);
    if (haystack.length) {
      for (const { n: ln, text } of numberedLines(step)) {
        const win = verbatimWindow(text, haystack, n);
        if (win) {
          return { verdict: "fails", reason: "this line repeats an earlier Step verbatim",
            evidence: win, span: [ln, ln] };
        }
      }
    }
    return {
      verdict: "holds",
      reason: haystack.length ? "no run of words here repeats an earlier Step verbatim"
        : "nothing precedes this Step, so there is nothing to repeat",
      span: step.lines,
    };
  },

  "packet-wording": ({ step, declared, items, item }) => {
    const n = items.thresholds.verbatim_overlap_words;
    const haystack = [item.declared_block, ...(item.also_declared_blocks || [])]
      .flatMap((b) => (Array.isArray(declared[b]) ? declared[b] : [declared[b]]));
    for (const { n: ln, text } of numberedLines(step)) {
      const win = verbatimWindow(text, haystack, n);
      if (win) {
        return {
          verdict: "fails",
          reason: "this line quotes the Packet rather than writing from it",
          evidence: win,
          span: [ln, ln],
        };
      }
    }
    return { verdict: "holds", reason: "no run of words here repeats the Packet's own wording", span: step.lines };
  },
};

// ---------------------------------------------------------------------------
// Rendering one join Packet, and recording the verdict that comes back.

function renderJoinPacket(ws, draft, step, item, pair, declaredText, recoveredText) {
  const tplPath = join(dirname(fileURLToPath(import.meta.url)), "join-template.md");
  if (!existsSync(tplPath)) {
    fail(`the join template is absent — ${tplPath}. It is the judging model's entire input, so a `
      + "missing template is a hole the model fills by invention; this refuses rather than asking "
      + "a question with no form.");
  }
  let out = readFileSync(tplPath, "utf8").replace(/^<!--[\s\S]*?-->\n*/, "");
  const fields = {
    step_id: step.step_id,
    item: item.id,
    item_class: item.class,
    declared: declaredText,
    recovered: recoveredText,
    span: `${step.lines[0]}–${step.lines[1]}`,
    quoted: numberedProse(step),
    question: item.question,
    record_command: `node src/review-draft.mjs compare --draft ${relative(process.cwd(), draft.path) || draft.path} --verdicts <verdicts.json>`,
  };
  for (const [k, v] of Object.entries(fields)) out = out.split(`{{${k}}}`).join(v);
  const left = out.match(/\{\{(\w+)\}\}/);
  if (left) {
    fail(`the join template's slot {{${left[1]}}} was not filled — the renderer and the template `
      + "disagree about the slot set, which is the round trip failing silently");
  }
  const dir = join(ws, "join");
  mkdirSync(dir, { recursive: true });
  const name = pair === null ? `${step.step_id}.${item.id}.md` : `${step.step_id}.${item.id}.${pair}.md`;
  const dest = join(dir, name);
  writeFileSync(dest, out.endsWith("\n") ? out : out + "\n");
  return dest;
}

const verdictKey = (step_id, item, pair) => (pair === null || pair === undefined
  ? `${step_id}/${item}` : `${step_id}/${item}#${pair}`);

// THE VERDICT FILE IS VALIDATED AGAINST WHAT THE RUN ACTUALLY OWES, and every
// refusal names what it saw. Three refusals matter and each is its own mistake:
// a pair nobody was asked about, a token outside the closed three, and a reason
// carrying a digit.
//
// A DIGIT IN THE REASON IS REFUSED, which is the one rule here that looks like
// fussiness and is not. The item table holds no severity and the verdict set has
// no order; a number in the sentence is where a score comes back in — "three of
// five grounds", "eighty percent" — and once one is written a later reader
// compares them. Line numbers are the Harness's and are already rendered in the
// span; every other number in a review is a score by another name.
function recordVerdicts(run, file, owed, items) {
  if (!existsSync(file)) fail(`no verdicts file at ${file}`);
  let doc;
  try { doc = JSON.parse(readFileSync(file, "utf8")); }
  catch (e) {
    fail(`${file} is not readable JSON (${e.message}) — a verdicts file is one JSON object `
      + `carrying \`verdicts\`: [{step_id, item, pair?, verdict, reason}]`);
  }
  const list = doc && !Array.isArray(doc) && Array.isArray(doc.verdicts) ? doc.verdicts : null;
  if (!list) {
    fail(`${file} carries no \`verdicts\` array — it is one JSON object of the form `
      + `{"verdicts": [{"step_id": ..., "item": ..., "verdict": ..., "reason": ...}]}`);
  }
  const owedBy = new Map(owed.map((o) => [o.key, o]));
  const problems = [];
  const accepted = [];
  list.forEach((v, i) => {
    const at = `\`verdicts\`[${i}]`;
    if (v === null || typeof v !== "object" || Array.isArray(v)) { problems.push(`${at} must be an object`); return; }
    const key = verdictKey(v.step_id, v.item, v.pair === undefined ? null : v.pair);
    if (!owedBy.has(key)) {
      const mech = items.items.find((it) => it.id === v.item && it.mode === "mechanical");
      problems.push(mech
        ? `${at} answers \`${key}\`, which is a MECHANICAL item — the Harness decides it `
          + "from string facts about the Draft and the Packet, and a recorded judgment over one would "
          + "silently replace a computed fact"
        : `${at} answers \`${key}\`, which this run did not ask about — the pairs it owes are `
          + `${owed.length ? owed.map((o) => o.key).join(", ") : "(none)"}`);
      return;
    }
    if (!items.verdicts.includes(v.verdict)) {
      problems.push(`${at} carries the verdict \`${v.verdict}\` — the closed set is `
        + `${items.verdicts.join(", ")}, and there is no fourth answer`);
      return;
    }
    if (typeof v.reason !== "string" || v.reason.trim() === "") {
      problems.push(`${at} carries no \`reason\` — one sentence saying what does or does not agree`);
      return;
    }
    if (/[0-9]/.test(v.reason)) {
      problems.push(`${at}'s reason carries a digit — line numbers are rendered in the span and `
        + "every other number in a review is a score by another name; write it as a word");
      return;
    }
    accepted.push({ key, step_id: v.step_id, item: v.item, pair: v.pair === undefined ? null : v.pair,
      verdict: v.verdict, reason: v.reason.trim() });
  });
  if (problems.length) {
    fail(`the verdicts in ${file} were not recorded:\n  - ${problems.join("\n  - ")}`);
  }
  run.verdicts = run.verdicts || {};
  for (const a of accepted) run.verdicts[a.key] = a;
  return accepted.length;
}

// ---------------------------------------------------------------------------
// The join itself.

// The declared and recovered sides as the judging model reads them. An array
// renders as a list, an object as its own labelled lines, and a NULL recovered
// field means the recovered side IS THE PROSE — the negative items, which ask
// whether something is absent from the passage rather than whether two lines
// agree.
function renderSide(v) {
  if (v === null || v === undefined) return "(none)";
  if (Array.isArray(v)) return v.length ? v.map((x) => `- ${x}`).join("\n") : "(none)";
  if (typeof v === "object") return Object.entries(v).map(([k, x]) => `- **${k}.** ${x}`).join("\n");
  return String(v);
}

// EVERY (Step, item) PAIR, computed fresh. Mechanical items are decided here;
// judged items are rendered as join Packets and answered from the run record.
// Nothing is cached across a call, because a recorded verdict is exactly what
// changes the answer.
function buildJoin(draft, run, items, ws) {
  const { steps } = resolveInputs(draft);
  const floor = items.thresholds.claim_ground_containment;
  const results = [];
  const owed = [];
  const modelCalls = [];
  const mechanicalLog = [];
  const verdicts = run.verdicts || {};

  steps.forEach((step, si) => {
    const declared = declaredFor(step, items);
    let rec;
    try { rec = JSON.parse(readFileSync(run.recovered[step.step_id], "utf8")); }
    catch (e) { fail(`the recovered record for ${step.step_id} is not readable (${e.message})`); }
    const earlier = steps.slice(0, si);

    // THE PAIRING IS COMPUTED ONCE AND TWO ITEMS READ IT. `grounds` asks what a
    // claim rests on and `grounds-unused` asks what no claim rests on; they are
    // the two halves of one assignment, and computing it twice would let them
    // disagree about the same Step.
    const pairedItem = items.items.find((it) => it.mode === "paired");
    const pairs = pairedItem
      ? pairClaims(declared[pairedItem.declared_block], rec[pairedItem.recovered_field] || [],
        pairedItem.pair_text_key, floor)
      : [];

    for (const item of items.items) {
      const ctx = { declared, rec, step, draft, earlier, items, pairs, item };

      if (item.mode === "mechanical") {
        const impl = MECHANICAL[item.id];
        if (!impl) {
          fail(`the item table declares \`${item.id}\` mechanical and this Harness has no `
            + "implementation for it — a mechanical item with no check would report `holds` for "
            + "every Draft, which is the silent pass this whole comparison exists to refuse");
        }
        const r = impl(ctx);
        results.push({ step_id: step.step_id, item: item.id, class: item.class,
          decided_by: "harness", ...r });
        mechanicalLog.push({ step_id: step.step_id, item: item.id });
        continue;
      }

      // A declared side the Packet renders as a stated absence can make a
      // negative item vacuous — there is no exemplar, so nothing of one can
      // leak. The table says so per item rather than the runtime deciding it.
      const dv = item.declared_block ? declared[item.declared_block] : null;
      if (item.when_declared_absent
          && (dv === "" || (Array.isArray(dv) && dv.length === 0))) {
        results.push({ step_id: step.step_id, item: item.id, class: item.class,
          decided_by: "harness", verdict: item.when_declared_absent.verdict,
          reason: item.when_declared_absent.sentence, span: step.lines });
        mechanicalLog.push({ step_id: step.step_id, item: item.id });
        continue;
      }

      const subs = [];
      if (item.mode === "paired") {
        const entries = rec[item.recovered_field] || [];
        entries.forEach((entry, i) => {
          const p = pairs[i];
          if (!p || p.ground_index === -1) {
            // DECIDED HERE, BY NAME, WITH NO MODEL CALL. An entry that pairs
            // with nothing has no counterpart to put a question about, and
            // `widened` is a fact about the pairing rather than a reading of it.
            subs.push({ pair: i, verdict: "fails", reason: item.unpaired_sentence,
              span: entry.span || step.lines, decided_by: "harness" });
            mechanicalLog.push({ step_id: step.step_id, item: item.id, pair: i });
            return;
          }
          const key = verdictKey(step.step_id, item.id, i);
          const file = renderJoinPacket(ws, draft, step, item, i,
            declared[item.declared_block][p.ground_index],
            renderSide(entry[item.pair_text_key]));
          modelCalls.push({ step_id: step.step_id, item: item.id, pair: i, packet: file });
          const v = verdicts[key];
          subs.push(v
            ? { pair: i, verdict: v.verdict, reason: v.reason, span: entry.span || step.lines, decided_by: "model" }
            : { pair: i, owed: true, key, packet: file, span: entry.span || step.lines });
          if (!v) owed.push({ key, step_id: step.step_id, item: item.id, pair: i, packet: file });
        });
      } else {
        const key = verdictKey(step.step_id, item.id, null);
        const file = renderJoinPacket(ws, draft, step, item, null,
          renderSide(item.declared_block ? declared[item.declared_block] : null),
          item.recovered_field ? renderSide(rec[item.recovered_field])
            : "(the passage itself, quoted below — this item asks whether something is ABSENT from it)");
        modelCalls.push({ step_id: step.step_id, item: item.id, pair: null, packet: file });
        const v = verdicts[key];
        subs.push(v
          ? { pair: null, verdict: v.verdict, reason: v.reason, span: step.lines, decided_by: "model" }
          : { pair: null, owed: true, key, packet: file, span: step.lines });
        if (!v) owed.push({ key, step_id: step.step_id, item: item.id, pair: null, packet: file });
      }

      if (!subs.length) {
        results.push({ step_id: step.step_id, item: item.id, class: item.class, decided_by: "harness",
          verdict: "holds", reason: "the recovered side carries nothing for this item to disagree with",
          span: step.lines });
        mechanicalLog.push({ step_id: step.step_id, item: item.id });
        continue;
      }
      if (subs.some((s) => s.owed)) {
        results.push({ step_id: step.step_id, item: item.id, class: item.class, owed: true,
          span: step.lines });
        continue;
      }
      // THE ITEM'S LINE RENDERS THE STRONGEST NON-`holds` ANSWER AMONG ITS
      // PAIRS AND NAMES IT — a SELECTION, never an aggregate. Every pair's own
      // verdict is written to the join record, so nothing is summed, averaged
      // or scored on the way to one line; `fails` wins over `cannot-decide`
      // because a fail is the answer that has a consequence, and neither is
      // rounded into `holds`.
      const chosen = subs.find((s) => s.verdict === "fails")
        || subs.find((s) => s.verdict === "cannot-decide") || subs[0];
      results.push({ step_id: step.step_id, item: item.id, class: item.class,
        decided_by: subs.every((s) => s.decided_by === "harness") ? "harness" : "model",
        verdict: chosen.verdict, reason: chosen.reason, span: chosen.span, pairs: subs });
    }
  });

  return { results, owed, modelCalls, mechanicalLog, steps };
}

// ONE LINE PER (Step, item), AND NO NUMBER IN IT THAT IS NOT A LINE NUMBER —
// ENFORCED HERE RATHER THAN PROMISED. The span is the only numeric field the
// line carries, and a reason carrying a digit refuses the whole emission by
// name.
//
// THE RULE IS ENFORCED BECAUSE THE FIRST LIVE DRIVE BROKE IT. Quoting the
// offending material into the reason read as helpful and was the leak: the live
// Draft's grounds are labelled by the Strands they came from, so
// `grounds-unused` rendered `ground (strand L97)` into a comparison line and put
// a number in front of a reader that was not a line number and could be
// compared. So quoted material is EVIDENCE — it goes to the join record and to
// the owner record, where a reader can see it in full — and never into the line
// whose whole claim is that the only numbers in it are coordinates.
function comparisonLine(r) {
  if (/[0-9]/.test(r.reason)) {
    fail(`the comparison line for ${r.step_id}/${r.item} carries a digit in its reason `
      + `(${JSON.stringify(r.reason)}). A comparison line renders line numbers and nothing else `
      + "numeric — every other number in a review is a score by another name, and quoted material "
      + "belongs in the finding's evidence rather than in the line.");
  }
  const w = (s, n) => String(s).padEnd(n, " ");
  return `${w(r.step_id, 8)}${w(r.item, 26)}${w(r.verdict, 14)}`
    + `${w(`[${r.span[0]}-${r.span[1]}]`, 14)}${r.reason}`;
}

function cmdCompare(args) {
  const draftPath = argString(args, "draft", "usage: review-draft compare --draft <draft.md> [--verdicts <verdicts.json>]");
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

  const items = readItems();

  // THE OWED SET IS COMPUTED BEFORE ANY VERDICT IS RECORDED, and that ordering
  // is what the file is validated against: what a run asks about is a property
  // of the Draft, the Packets and the item table, never of the answers it has
  // already been given.
  let pass = buildJoin(draft, run, items, ws);
  let recorded = 0;
  if (args.verdicts !== undefined) {
    const file = argString(args, "verdicts", "usage: review-draft compare --draft <draft.md> --verdicts <verdicts.json>");
    recorded = recordVerdicts(run, file, pass.owed, items);
    pass = buildJoin(draft, run, items, ws);
  }

  const { results, owed, modelCalls, mechanicalLog } = pass;
  const complete = owed.length === 0;
  run.join_complete = complete;
  run.compared_at = complete ? new Date().toISOString() : null;
  run.join_state = complete ? null
    : `${owed.length} pair(s) await a verdict — the join is unfilled, not clean`;
  run.findings = complete ? results.filter((r) => r.verdict !== "holds") : [];
  writeRun(ws, run);

  const joinPath = join(ws, "join.json");
  writeFileSync(joinPath, JSON.stringify({
    draft: run.draft, body_sha: run.body_sha, compared_at: run.compared_at,
    item_table_version: items.version,
    complete,
    results,
    owed,
    // WHICH ITEMS COST A MODEL CALL AND WHICH DID NOT, per pair. This is the
    // record that makes "decided mechanically" checkable rather than claimed —
    // a mechanical item appears in `mechanical` and in no `model_calls` entry,
    // for every Step.
    model_calls: modelCalls,
    mechanical: mechanicalLog,
  }, null, 2) + "\n");

  if (recorded) process.stdout.write(`recorded: ${recorded} verdict(s)\n`);

  if (!complete) {
    // NO COMPARISON LINE IS EMITTED WHILE ANY PAIR IS UNANSWERED. There is no
    // fourth token for "not asked yet", and writing `cannot-decide` here would
    // round an absence into an answer — the one rounding the three-valued
    // verdict exists to refuse.
    process.stdout.write(
      `compare: every input present — ${run.steps.length} recovered Step(s), `
      + `${run.sections.length} Section entr${run.sections.length === 1 ? "y" : "ies"}.\n`
      + `${mechanicalLog.length} pair(s) decided mechanically, no model call.\n`
      + `${owed.length} pair(s) await a verdict — one join Packet each, under ${join(ws, "join")}:\n`
      + owed.map((o) => `  ${o.key}  ${o.packet}`).join("\n") + "\n"
      + "Answer each with one of holds / fails / cannot-decide plus one sentence, then\n"
      + `  node src/review-draft.mjs compare --draft ${relative(process.cwd(), draft.path) || draft.path} --verdicts <verdicts.json>\n`
      + `join record: ${joinPath}\n`);
    return;
  }

  const fails = results.filter((r) => r.verdict === "fails");
  const preserved = fails.filter((r) => r.class === "preserved");
  const undecided = results.filter((r) => r.verdict === "cannot-decide");
  process.stdout.write(
    results.map(comparisonLine).join("\n") + "\n\n"
    + `compare: ${results.length} (Step, item) pair(s) joined, `
    + `${mechanicalLog.length} decided mechanically and ${modelCalls.length} judged.\n`
    + (preserved.length
      ? `Steps sent to correction — a preserved item fails: ${[...new Set(preserved.map((r) => r.step_id))].join(", ")}\n`
      : "No preserved item fails, so no Step is sent to correction.\n")
    + (undecided.length
      ? `cannot-decide, listed with its pair and never rounded: ${undecided.map((r) => `${r.step_id}/${r.item}`).join(", ")}\n`
      : "")
    + `join record: ${joinPath}\n`
    + (fails.length
      ? "`check --draft <draft.md>` is pass two.\n"
      : "`close --draft <draft.md>` writes the owner record.\n"));
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
    // AN UNFILLED JOIN AND AN UNRUN ONE ARE DIFFERENT REFUSALS, because they
    // have different repairs: one needs `compare` run, the other needs the
    // verdicts it is still waiting on. Reporting both as "compare has not run"
    // would send a reviewer who has already compared back to the act they just
    // performed.
    if (run.join_state) {
      fail(`the join has run and is UNFILLED — ${run.join_state}. \`close\` writes the owner `
        + "record, and a record written over unanswered pairs would render them as no findings, "
        + "which reads as a clean review. Answer the join Packets under the workspace's `join/` "
        + "directory and record them with `compare --draft <draft.md> --verdicts <verdicts.json>`.");
    }
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
    // EVERY FINDING CARRIES ITS CLASS, because the class is the consequence:
    // a preserved item's `fails` sends the Step to correction and a
    // best-effort one's rides along if that Step is re-realized anyway. A
    // findings list that rendered the verdict alone would leave the owner to
    // look the consequence up.
    for (const f of run.findings) {
      lines.push(`- **${f.step_id} / ${f.item}** — ${f.verdict} (${f.class ?? "unclassed"})`);
      if (f.reason) lines.push(`  - ${f.reason}`);
      // THE QUOTED MATERIAL LIVES HERE, and this is the other half of the
      // comparison line's no-numbers rule: the line refuses to carry a quote,
      // so the owner record is where a finding becomes actionable rather than
      // merely located.
      for (const e of [].concat(f.evidence ?? [])) lines.push(`  - evidence: ${e}`);
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
  node src/review-draft.mjs compare --draft <draft.md> [--verdicts <verdicts.json>]
  node src/review-draft.mjs correct --draft <draft.md> --step <id> --file <prose>   [kogaki#874]
  node src/review-draft.mjs check   --draft <draft.md>                              [kogaki#874]
  node src/review-draft.mjs close   --draft <draft.md>

The Harness owns the ordering: \`recover\` refuses a Step whose recovery input it
did not render, \`compare\` refuses while any Step or Section entry is missing,
\`check\` refuses before \`compare\`, and \`close\` is reachable from \`compare\` with
zero fails or from \`check\` in every state.

\`compare\` decides the mechanical items itself and renders one join Packet per
judged pair; \`--verdicts\` records the answers. It emits one line per (Step,
item) once every pair is answered, and never before: there is no fourth token
for "not asked yet", and \`cannot-decide\` is a real answer rather than a place
to round one.

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
  // A CASE MUST FAIL, NEVER THROW. A mutation that stops `close` writing its
  // record used to take the whole pass down with an ENOENT from the next case,
  // and a crash reports no case count at all — which is the shape
  // checks/check-review-draft-runtime.sh reads as "the pass did not run" rather
  // than as "these cases failed". Every later read of a written artifact goes
  // through this.
  const readOrEmpty = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

  // -- the fixture Draft, built the way `emit` builds one -------------------
  // Line ranges are computed rather than transcribed: a transcribed range that
  // drifts from the body would make every prose-quoting case assert against the
  // wrong text while still passing, which is this Harness's own subject matter.
  const PROSE = {
    a1: ["The first passage opens the claim and says what the reader is about to be shown.",
      "",
      "It runs two paragraphs so a range covering more than one line is exercised.",
      "The harness renders each input in the path's recorded order."],
    a2: ["The second passage continues under the same heading and does not restate it."],
    a3: ["The third passage opens the second Section with a question of its own."],
  };
  const SECTIONS = [
    { index: 1, title: "The first heading", steps: ["a1", "a2"] },
    { index: 2, title: "The second heading", steps: ["a3"] },
  ];

  function buildDraft(dir, { packetDir, mutate = (t) => t, omitLines = null, omitPacket = null,
    prose = PROSE } = {}) {
    mkdirSync(dir, { recursive: true });
    // Body first, recording each Step's 1-based body range.
    const body = []; const ranges = {};
    for (const sec of SECTIONS) {
      body.push(`## ${sec.title}`, "");
      for (const id of sec.steps) {
        const start = body.length + 1;
        body.push(...prose[id]);
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

  // THE FIXTURE PACKETS ARE RENDERED IN THE TEMPLATE'S OWN SHAPE (kogaki#872),
  // not stubbed: `compare` reads the DECLARED side back out of a Packet block by
  // block, and a stub carrying two lines would make every join case assert
  // against a refusal rather than against the comparison. They are hand-written
  // rather than produced by `src/draft.mjs`, because importing the Draft lane
  // here would break the closed-input allowlist this pass also asserts.
  //
  // Packets carry text that appears NOWHERE in the prose, so the blindness case
  // below can assert on a string only the Packet has. They carry NO DIGIT
  // either — the comparison lines quote Packet material, and a digit in a ground
  // would land in one and make the no-numbers-but-line-numbers case assert
  // against the fixture's own wording rather than against the format.
  const GROUNDS = {
    a1: ["ground alpha — the harness renders the recovery input before any record is accepted.",
      "ground beta — the reviewer never reads the packet that produced the prose."],
    a2: ["ground gamma — an ordering owned by the harness cannot be got wrong by a session."],
    a3: ["ground delta — a residue line is classified by the owner and never by the tool."],
  };
  const PACKET_FIELDS = {
    a1: { after: "The reader knows which act renders the input.", purpose: "To open the claim.",
      introduces: ["harness"], knows: [], opens: true, excerpt: "PACKETONLYTOKEN a passage about tides and harbours." },
    a2: { after: "The reader knows an owned ordering cannot be got wrong.", purpose: "To carry the claim further.",
      introduces: [], knows: ["harness"], opens: false, excerpt: "PACKETONLYTOKEN a second passage about weather." },
    a3: { after: "The reader knows who classifies residue.", purpose: "To open the second question.",
      introduces: [], knows: ["harness"], opens: true, excerpt: null },
  };
  function writePacket(dir, id, { grounds = GROUNDS[id] } = {}) {
    const f = PACKET_FIELDS[id];
    const bullets = (xs, empty) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : empty);
    writeFileSync(join(dir, `${id}.md`), [
      "# Write one Step", "",
      "## What the article is doing — hold these fixed", "",
      "- **Thesis.** PACKETONLYTOKEN the thesis.",
      "- **Reader start.** PACKETONLYTOKEN where the reader starts.",
      "- **Reader target.** PACKETONLYTOKEN where the reader lands.",
      "- **Opening question.** PACKETONLYTOKEN the opening question.", "",
      "## The Move this Step performs — its contract", "",
      "- **Move.** name-the-mechanism",
      "- **intent.** Name the mechanism before naming its consequence.",
      "- **constraints.** Name the mechanism first; never announce the consequence before the reader can check it.",
      "- **failure_modes.** Announcing a conclusion the reader has no way to check yet.", "",
      "### An exemplar of this Move — FORM ONLY", "",
      "The passage below demonstrates how this Move is realized. **Do not reuse its",
      "subject matter, facts, entities, terminology, or claims.** Read it for the",
      "shape of the movement and nothing else.", "",
      f.excerpt === null
        ? "(none — this Move record carries no excerpt, so it cannot serve as an exemplar. Perform the Move from its contract above.)"
        : f.excerpt, "",
      "## This Step", "",
      `- **Step.** ${id}`,
      `- **purpose.** ${f.purpose}`,
      "- **reader_state_before.** PACKETONLYTOKEN the state before.",
      `- **reader_state_after.** ${f.after}`,
      "- **materials.** (none)",
      "- **rationale.** PACKETONLYTOKEN why this Step sits here.",
      "- **grounds.** These are what this Step may assert. Assert nothing else.", "",
      grounds.join("\n"), "",
      "## The Section this Step sits in", "",
      "A Section is a grouping of Steps under one heading — one promise to the reader",
      "that the question changes here. This Step either opens a Section or continues",
      "one, and the line below says which.", "",
      f.opens
        ? "- **This Step OPENS a Section.** Its heading is rendered by the Harness immediately above your prose."
        : "- **This Step CONTINUES the Section.** That heading is already on the page, above prose you are writing further into.", "",
      "## What the reader already knows, and what you introduce here", "",
      `- **already knows.** ${bullets(f.knows, "(nothing — this is the first Step to introduce anything, or the path introduces no terms)")}`,
      `- **introduce here.** ${bullets(f.introduces, "(nothing new)")}`, "",
      "## The article so far — verbatim", "",
      "PACKETONLYTOKEN the article so far.", "",
      "## Write", "",
      "Write the prose for this Step and nothing else.", "",
      "**Plain register, operationally:** no unexplained term of art; one relation per",
      "sentence; a concrete subject acting.", "",
    ].join("\n"));
  }
  const packetDir = join(root, "packets");
  mkdirSync(packetDir, { recursive: true });
  for (const id of ["a1", "a2", "a3"]) writePacket(packetDir, id);

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

  // A schema-valid recovered record for one Step, built from that Step's own
  // draft line range so its spans lie inside the passage. The fixture's records
  // are REAL records from here on (kogaki#871) — a plain-text stand-in would
  // now be refused by the validator, and the ordering cases below must fail on
  // the ORDERING rather than on the record's shape.
  //
  // THE CLAIMS PAIR WITH THE FIXTURE PACKETS' GROUNDS (kogaki#872). The
  // comparison assigns each recovered claim to the ground it rests on by
  // containment, so a record whose claims share no words with any ground would
  // make EVERY Step fail `widened` and the join cases would assert against the
  // fixture rather than against the pairing. And no field carries a digit: the
  // comparison lines quote recovered material, and the no-numbers-but-line-
  // numbers case must fail on the FORMAT rather than on this record's wording.
  const RECOVERED = {
    a1: { claims: ["the harness renders the recovery input before any record is accepted",
      "the reviewer never reads the packet that produced the prose"],
      after: "The reader knows which act renders the input.", purpose: "To open the claim." },
    a2: { claims: ["an ordering owned by the harness cannot be got wrong by a session"],
      after: "The reader knows an owned ordering cannot be got wrong.", purpose: "To carry the claim further." },
    a3: { claims: ["a residue line is classified by the owner and never by the tool"],
      after: "The reader knows who classifies residue.", purpose: "To open the second question." },
  };
  const recordFor = (id) => {
    const r = draft.ranges[id];
    const [lo, hi] = [r[0] + draft.bodyOffset, r[1] + draft.bodyOffset];
    const f = RECOVERED[id];
    return {
      claims: f.claims.map((claim) => ({ claim, span: [lo, hi] })),
      reader_state_after: f.after,
      purpose: f.purpose,
      terms_introduced: [],
      shape: "It states a thing and moves on.",
      concessions: [],
      restates: [],
    };
  };
  const writeRecord = (id, mutate = (r) => r) => {
    const f = join(root, `rec-${id}.json`);
    writeFileSync(f, JSON.stringify(mutate(recordFor(id)), null, 2) + "\n");
    return f;
  };

  // The same record, against ANY fixture Draft's ranges — the kogaki#872 cases
  // build their own Drafts (a Packet with a ground removed, a Draft using a term
  // before the Step that introduces it) and each needs records whose spans lie
  // inside ITS passages.
  const writeRecordFor = (d, id, tag) => {
    const r = d.ranges[id];
    const [lo, hi] = [r[0] + d.bodyOffset, r[1] + d.bodyOffset];
    const f = RECOVERED[id];
    const p = join(root, `rec-${tag}-${id}.json`);
    writeFileSync(p, JSON.stringify({
      claims: f.claims.map((claim) => ({ claim, span: [lo, hi] })),
      reader_state_after: f.after,
      purpose: f.purpose,
      terms_introduced: [],
      shape: "It states a thing and moves on.",
      concessions: [],
      restates: [],
    }, null, 2) + "\n");
    return p;
  };

  const ledgerFile = join(root, "ledger-entry.md");
  writeFileSync(ledgerFile, "the question I answered, and what I now believe\n");

  // ANSWER EVERY PAIR THE RUN SAYS IT OWES, read from the run's OWN join record
  // rather than from a list transcribed here. That is not convenience: it is the
  // property the fixture is asserting — the Harness tells the judging model
  // exactly which pairs it is asking about, so a transcribed list would pass
  // while the Harness asked for something else.
  const answerOwed = (jsonPath, tag, verdict = "holds",
    reason = "the declared line and the recovered one agree") => {
    const owed = JSON.parse(readFileSync(jsonPath, "utf8")).owed;
    const f = join(root, `verdicts-${tag}.json`);
    writeFileSync(f, JSON.stringify({
      verdicts: owed.map((o) => ({
        step_id: o.step_id, item: o.item,
        ...(o.pair === null ? {} : { pair: o.pair }),
        verdict, reason,
      })),
    }, null, 2) + "\n");
    return f;
  };

  // open -> recover x3 -> read x2 -> compare -> answer -> compare. The whole
  // flow, driven through the real entry points, for a fixture Draft of this
  // shape.
  const driveToCompletedJoin = (d, wsBase, tag) => {
    const slug = basename(dirname(resolve(d.path)));
    const D = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", d.path, "--workspace", wsBase], { encoding: "utf8" });
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("recover", "--step", id, "--file", writeRecordFor(d, id, tag));
    for (const n of ["1", "2"]) D("read", "--section", n, "--file", ledgerFile);
    const first = D("compare");
    const jsonPath = join(wsBase, slug, "join.json");
    const second = D("compare", "--verdicts", answerOwed(jsonPath, tag));
    return { first, second, jsonPath, ws: join(wsBase, slug) };
  };

  // The comparison lines, as a map from `<step>/<item>` to the whole line.
  const linesOf = (stdout) => {
    const m = new Map();
    for (const l of stdout.split("\n")) {
      const f = l.match(/^(\S+)\s+(\S+)\s+(holds|fails|cannot-decide)\s+\[(\d+)-(\d+)\]\s+(.*)$/);
      if (f) m.set(`${f[1]}/${f[2]}`, l);
    }
    return m;
  };

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
      /Do not reason about what the\s+author was probably told/.test(input));
    ok("and forbids verdicts and advice outright (kogaki#871)",
      /Write no verdicts and no advice/.test(input));
    // THE QUOTED PASSAGE IS EXACTLY THE FILE LINES THE TRACE NAMES, asserted
    // through the NUMBERING rather than as a substring (kogaki#871): each line
    // is rendered `<n> | <text>`, so the case reconstructs the file from the
    // input and compares. An off-by-one in either the range or the numbering
    // would review the wrong passage silently, and only comparing BOTH the
    // numbers and the text catches both.
    const fileLines = readFileSync(draft.path, "utf8").split("\n");
    const [s, e] = [draft.ranges.a1[0] + draft.bodyOffset, draft.ranges.a1[1] + draft.bodyOffset];
    const block = input.split(`## The passage — draft lines ${s}–${e}`)[1] || "";
    const numbered = block.split("\n").filter((l) => /^\s*\d+ \| /.test(l));
    const reconstructed = numbered.map((l) => l.replace(/^\s*\d+ \| /, ""));
    const numbers = numbered.map((l) => Number(l.match(/^\s*(\d+) \| /)[1]));
    ok("the quoted passage is exactly the file lines the trace names",
      reconstructed.join("\n") === fileLines.slice(s - 1, e).join("\n"));
    ok("and every line carries its own DRAFT line number, so spans and the trace share one coordinate",
      numbers.length === e - s + 1 && numbers[0] === s && numbers[numbers.length - 1] === e);
  }

  // 9 — an unknown Step names BOTH sides.
  {
    const bad = writeRecord("a1");
    const r = drive("recover", "--step", "zz", "--file", bad);
    ok("an unknown step_id refuses naming both sides",
      r.status === 1 && /unknown step `zz`/.test(r.stderr) && /a1, a2, a3/.test(r.stderr));
  }

  // 10 — THE ORDERING GUARD. A record handed back for a Step whose input was
  // never rendered was written against something else, and afterwards there is
  // no way to tell what.
  {
    const rec = writeRecord("a3");
    const r = drive("recover", "--step", "a3", "--file", rec);
    ok("a Step whose recovery input was never rendered refuses",
      r.status === 1 && /step a3 has no rendered recovery input/.test(r.stderr));
    ok("and the refusal names the Step actually owed", /The Step now owed is a1/.test(r.stderr));
  }

  // 11 — recording one recovery renders the next.
  {
    const rec = writeRecord("a1");
    const r = drive("recover", "--step", "a1", "--file", rec);
    ok("a recovery is recorded", r.status === 0 && /recorded: a1/.test(r.stdout));
    ok("and the NEXT recovery input is rendered", /next recovery input: .*a2\.md/.test(r.stdout));
    ok("the recovered record lands in the workspace", existsSync(join(WS, "recovered", "a1.json")));
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
    const rec = writeRecord(id);
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

  // 17 — THE JOIN, IN ITS TWO PHASES (kogaki#872). Phase one decides the
  // mechanical items and renders one join Packet per judged pair; phase two
  // records the verdicts and emits the comparison.
  let owedFirst = null;
  {
    const r = drive("compare");
    ok("compare succeeds once every input is present", r.status === 0);
    ok("and reports the counts it joined over", /3 recovered Step\(s\), 2 Section entries/.test(r.stdout));
    ok("a join record lands in the workspace", existsSync(join(WS, "join.json")));

    const rec = JSON.parse(readFileSync(join(WS, "join.json"), "utf8"));
    owedFirst = rec.owed;
    ok("the unfilled join says so rather than rendering an empty findings list",
      rec.complete === false && /await a verdict/.test(r.stdout));
    // NO COMPARISON LINE IS EMITTED WHILE A PAIR IS UNANSWERED. There is no
    // fourth token for "not asked yet", and rendering `cannot-decide` for one
    // would round an absence into an answer.
    ok("and emits NO comparison line while any pair is unanswered", linesOf(r.stdout).size === 0);
    ok("it names every pair it owes, with the join Packet rendered for each",
      rec.owed.length > 0 && rec.owed.every((o) => existsSync(o.packet))
      && rec.owed.every((o) => r.stdout.includes(o.key)));
    ok("and the run record refuses to call an unfilled join compared",
      JSON.parse(readFileSync(join(WS, "run.json"), "utf8")).compared_at === null);

    // A join Packet is ONE pair and ONE question, and it names the three tokens
    // it will accept. The judging model cannot rank, because it is never shown
    // two pairs at once.
    const jp = readFileSync(rec.owed[0].packet, "utf8");
    ok("a join Packet carries the declared side, the recovered side and the quoted prose",
      /### What the Packet DECLARED/.test(jp) && /### What was RECOVERED from the prose/.test(jp)
      && /### The prose itself — draft lines/.test(jp));
    ok("and exactly one question", (jp.match(/^## The question$/gm) || []).length === 1);
    ok("and the closed three-token answer set", /holds.*fails.*cannot-decide/.test(jp));
    ok("and the template's authoring comment is stripped from it", !jp.startsWith("<!--"));
  }

  // 17a — `close` refuses over an UNFILLED join, and refuses DIFFERENTLY from
  // one where compare never ran: the two have different repairs.
  {
    const c = drive("close");
    ok("close over an unfilled join refuses, naming the pairs it still waits on",
      c.status === 1 && /the join has run and is UNFILLED/.test(c.stderr));
    ok("and says what a record written over them would read as",
      /reads as a clean review/.test(c.stderr));
  }

  // 17b — the verdicts file is validated against WHAT THE RUN OWES, and each
  // refusal is its own mistake.
  {
    const bad = (name, verdicts, expect) => {
      const f = join(root, "bad-verdicts.json");
      writeFileSync(f, JSON.stringify({ verdicts }) + "\n");
      const r = drive("compare", "--verdicts", f);
      const hit = typeof expect === "string" ? r.stderr.includes(expect) : expect.test(r.stderr);
      ok(name, r.status === 1 && hit);
    };
    bad("a verdict for a MECHANICAL item is refused, saying it would replace a computed fact",
      [{ step_id: "a1", item: "term-before-introduction", verdict: "holds", reason: "it reads fine" }],
      "which is a MECHANICAL item");
    bad("a verdict for a pair this run never asked about is refused, naming the pairs it owes",
      [{ step_id: "a1", item: "purpose", pair: 4, verdict: "holds", reason: "it reads fine" }],
      "which this run did not ask about");
    bad("a fourth verdict token is refused, naming the closed three",
      [{ step_id: "a1", item: "purpose", verdict: "mostly-holds", reason: "it reads fine" }],
      "there is no fourth answer");
    bad("a verdict with no reason is refused",
      [{ step_id: "a1", item: "purpose", verdict: "holds" }],
      "carries no `reason`");
    // A DIGIT IN THE REASON IS WHERE A SCORE COMES BACK IN. The item table holds
    // no severity and the verdict set has no order; once one number is written
    // into a review a later reader compares them.
    bad("a reason carrying a digit is refused, because that is where a score comes back in",
      [{ step_id: "a1", item: "purpose", verdict: "holds", reason: "3 of the grounds are carried" }],
      "every other number in a review is a score by another name");
    bad("a verdicts file that is not one object carrying `verdicts` is refused",
      undefined, "carries no `verdicts` array");
    // EVERY problem in one refusal, never the first found.
    {
      const f = join(root, "bad-verdicts-many.json");
      writeFileSync(f, JSON.stringify({ verdicts: [
        { step_id: "a1", item: "purpose", verdict: "nope", reason: "one" },
        { step_id: "a2", item: "purpose", verdict: "holds", reason: "there are 2 of them" },
      ] }) + "\n");
      const r = drive("compare", "--verdicts", f);
      ok("every verdict problem is named in one refusal, never the first found",
        r.status === 1 && /no fourth answer/.test(r.stderr) && /score by another name/.test(r.stderr));
    }
    ok("and a refused verdicts file leaves the join unfilled",
      JSON.parse(readFileSync(join(WS, "join.json"), "utf8")).complete === false);
  }

  // 17c — ACCEPTANCE 1: the completed join emits ONE LINE PER (Step, item),
  // each carrying a verdict from the closed three and a quoted span, and NO
  // NUMBER THAT IS NOT A LINE NUMBER.
  let baseLines = null;
  {
    const r = drive("compare", "--verdicts", answerOwed(join(WS, "join.json"), "main"));
    ok("recording the verdicts completes the join", r.status === 0 && /recorded: \d+ verdict/.test(r.stdout));
    const rec = JSON.parse(readFileSync(join(WS, "join.json"), "utf8"));
    ok("and the join record says so", rec.complete === true);

    const ITEMS = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    baseLines = linesOf(r.stdout);
    ok("one comparison line per (Step, item), over the whole item table",
      baseLines.size === 3 * ITEMS.items.length);
    ok("every Step and every item the table declares has a line",
      ["a1", "a2", "a3"].every((s) => ITEMS.items.every((i) => baseLines.has(`${s}/${i.id}`))));

    // THE NO-NUMBERS PROPERTY, asserted over what the HARNESS composes: the
    // step id and the span are the line's only numeric fields, and stripping
    // them must leave no digit. Quoted Draft and Packet material is rendered as
    // it stands — the fixture carries no digit in either, so a digit surviving
    // the strip is the FORMAT having invented a number rather than the corpus
    // having contained one.
    const stripped = [...baseLines.values()].map((l) => l.replace(/^\S+\s+/, "").replace(/\[\d+-\d+\]/, ""));
    ok("no number appears in a comparison line that is not a line number",
      stripped.every((l) => !/\d/.test(l)));
    ok("every verdict is one of the closed three",
      [...baseLines.values()].every((l) => /\s(holds|fails|cannot-decide)\s/.test(l)));
    // The span is a DRAFT line range, so it must lie inside the file.
    const total = readFileSync(draft.path, "utf8").split("\n").length;
    ok("and every span is a draft line range inside the file",
      [...baseLines.values()].every((l) => {
        const m = l.match(/\[(\d+)-(\d+)\]/);
        return Number(m[1]) >= 1 && Number(m[2]) <= total && Number(m[1]) <= Number(m[2]);
      }));

    ok("the run reports which pairs cost a model call and which did not",
      /decided mechanically and \d+ judged/.test(r.stdout));
    ok("and says whether any Step is sent to correction — a PRESERVED item failing",
      /no Step is sent to correction/.test(r.stdout));
  }

  // 18 — the two entry points this artifact DECLARES and kogaki#874 builds.
  // Registered rather than absent: a reviewer reaching for `correct` gets the
  // issue that owns it instead of "unknown command".
  {
    const r = drive("correct", "--step", "a1", "--file", writeRecord("a1"));
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
    const text = readOrEmpty(out);
    ok("the record is headed by the Draft's body sha", text.includes(sha256(readDraft(draft.path).body)));
    ok("the record names every Packet it was reviewed against with its sha",
      ["a1", "a2", "a3"].every((id) => text.includes(`\`${id}\``))
      && (text.match(/sha `[0-9a-f]{64}`/g) || []).length === 3);
    ok("the record carries the Findings list", /^## Findings$/m.test(text));
    ok("the record carries the Corrections list", /^## Corrections$/m.test(text));
    ok("the record carries the Residue list", /^## Residue$/m.test(text));
    ok("a COMPLETED join with no failing item renders its findings list as none",
      /^## Findings\n\n_None\._$/m.test(text));
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
    const text = readOrEmpty(join(thesis, "review.md"));
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
    const text = readOrEmpty(join(thesis, "review.md"));
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
    const text = readOrEmpty(join(thesis, "review.md"));
    ok("the owner record ends with a newline", text.endsWith("\n"));
  }

  // ---- kogaki#871 -------------------------------------------------------
  // AC1 — the recovery input for a CONTINUING Step carries the article before
  // it and none of its own Packet. The fixture's Packets hold PACKETONLYTOKEN,
  // and case 8 already asserts its absence for a1; a2 is the case that matters
  // for the article-so-far block, because a1's block is the empty one.
  {
    const input = readFileSync(join(WS, "recovery", "a2.md"), "utf8");
    ok("a continuing Step's recovery input carries the PRECEDING Step's prose",
      input.includes(PROSE.a1[0]));
    ok("and its own prose", input.includes(PROSE.a2[0]));
    ok("and none of the strings that appear only in its Packet",
      !input.includes("PACKETONLYTOKEN"));
    ok("and it groups the article before it under the Section heading the TRACE declares",
      input.includes(`## ${SECTIONS[0].title}`));
    // The heading comes from the trace, never from a scan of the body — so a
    // Section whose heading text the body does not carry still renders.
    ok("the article-so-far block ends where the passage begins",
      input.indexOf(PROSE.a1[0]) < input.indexOf("## The passage"));
    // a1 opens the article, so its own block says so rather than rendering empty.
    const first = readFileSync(join(WS, "recovery", "a1.md"), "utf8");
    ok("the article's FIRST passage says nothing precedes it rather than rendering an empty block",
      /nothing yet — this is the article's first passage/.test(first));
    // a3 opens the SECOND Section, so its block carries both headings.
    const third = readFileSync(join(WS, "recovery", "a3.md"), "utf8");
    ok("a Step opening a later Section carries every earlier Section's heading",
      third.includes(`## ${SECTIONS[0].title}`) && !third.includes(`## ${SECTIONS[1].title}`));
  }

  // The template is the reviewer's ENTIRE input, so its absence is a hole the
  // reviewer fills by invention. Driven against a copy of the module with no
  // template beside it.
  {
    const solo = join(root, "solo"); mkdirSync(solo, { recursive: true });
    writeFileSync(join(solo, "review-draft.mjs"), readFileSync(self, "utf8"));
    writeFileSync(join(solo, "runs.mjs"), readFileSync(join(dirname(self), "runs.mjs"), "utf8"));
    writeFileSync(join(solo, "runs.json"), readFileSync(join(dirname(self), "runs.json"), "utf8"));
    const r = spawnSync(process.execPath,
      [join(solo, "review-draft.mjs"), "open", "--draft", draft.path, "--workspace", join(root, "ws-solo")],
      { encoding: "utf8" });
    ok("an absent recovery template refuses rather than rendering prose with no instruction",
      r.status === 1 && /recovery template is absent/.test(r.stderr));
  }

  // AC2 — the recovered record is validated against src/recovered-schema.json,
  // and every refusal NAMES what it saw. A record is the one artifact in this
  // flow a person writes by hand, so a bare "invalid" costs another read of the
  // schema to act on.
  {
    const ws3 = join(root, "ws3");
    const D = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", draft.path, "--workspace", ws3], { encoding: "utf8" });
    ok("a third run opens", D("open").status === 0);

    // `expect` is a substring or a regex. The refusals quote field names in
    // backticks, which read far more clearly as substrings than as patterns
    // escaped through two layers.
    const bad = (name, mutate, expect) => {
      const f = writeRecord("a1", mutate);
      const r = D("recover", "--step", "a1", "--file", f);
      const hit = typeof expect === "string" ? r.stderr.includes(expect) : expect.test(r.stderr);
      ok(name, r.status === 1 && hit);
    };

    // ITERATED FROM THE SCHEMA, never transcribed (PR #884 round 1, finding 3).
    // This was the one place in the change that restated the list it exists to
    // prove is read, so a field added to the schema gained no refusal case.
    const SCHEMA = JSON.parse(readFileSync(join(dirname(self), "recovered-schema.json"), "utf8"));
    for (const field of SCHEMA.required) {
      bad(`a record missing \`${field}\` is refused BY NAME`,
        (r) => { delete r[field]; return r; },
        `missing the required field \`${field}\``);
    }

    // AN EMPTY ARRAY IS AN ANSWER AND AN ABSENT KEY IS NOT — the pair that
    // makes the previous three cases mean something.
    {
      const f = writeRecord("a1");
      const r = D("recover", "--step", "a1", "--file", f);
      ok("while an EMPTY terms_introduced/concessions/restates is accepted", r.status === 0);
    }

    const [lo, hi] = [draft.ranges.a1[0] + draft.bodyOffset, draft.ranges.a1[1] + draft.bodyOffset];
    bad("a span BEFORE the Step's range is refused, naming the range",
      (r) => { r.claims[0].span = [lo - 1, hi]; return r; },
      `does not lie inside a1's draft line range [${lo}, ${hi}]`);
    bad("a span AFTER the Step's range is refused",
      (r) => { r.claims[0].span = [lo, hi + 1]; return r; },
      /does not lie inside/);
    bad("an inverted span is refused",
      (r) => { r.claims[0].span = [hi, lo]; return r; },
      /does not lie inside/);
    bad("a span that is not a pair of integers is refused",
      (r) => { r.claims[0].span = ["a", "b"]; return r; },
      /does not lie inside/);
    bad("a restates span outside the range is refused too — every span_key is checked, not only claims'",
      (r) => { r.restates = [{ span: [lo - 5, lo - 4], of: "something earlier" }]; return r; },
      "`restates`[0].span");
    bad("a claims entry missing its span is refused",
      (r) => { delete r.claims[0].span; return r; },
      "`claims`[0] is missing `span`");
    bad("an empty claims list is refused, with the schema's own reason",
      (r) => { r.claims = []; return r; },
      /needs at least 1 — a passage asserting nothing is not a Step/);
    bad("an empty string field is refused",
      (r) => { r.purpose = "   "; return r; },
      "`purpose` must be a non-empty string");
    bad("a non-array where the schema says array is refused",
      (r) => { r.terms_introduced = "opacity"; return r; },
      "`terms_introduced` must be an array");
    bad("a non-string inside terms_introduced is refused",
      (r) => { r.terms_introduced = [42]; return r; },
      "`terms_introduced`[0] must be a non-empty string");

    // THE REVIEWER WRITES NO VERDICTS AND NO ADVICE, and the key is REFUSED
    // rather than dropped: an ignored field still shaped the reading that
    // produced the rest of the record.
    bad("a record carrying a verdict is refused rather than accepted with the key ignored",
      (r) => { r.verdict = "holds"; return r; },
      "forbidden key `verdict`");
    bad("and so is one carrying advice",
      (r) => { r.advice = "tighten the second paragraph"; return r; },
      "forbidden key `advice`");
    // NESTED, which is where a judgment is most likely to be smuggled in (PR
    // #884 round 1, finding 2): a top-level-only check accepted this silently.
    bad("a verdict smuggled INSIDE a claim object is refused, naming its path",
      (r) => { r.claims[0].verdict = "holds"; return r; },
      "forbidden key `claims`[0].verdict");
    bad("and one nested inside concessions is refused too",
      (r) => { r.concessions = [{ text: "a concession", span: [lo, lo], score: 2 }]; return r; },
      "forbidden key `concessions`[0].score");

    // The refusal collects EVERY problem rather than the first, so a reviewer
    // repairing a record does not discover them one run at a time.
    {
      const f = writeRecord("a1", (r) => { delete r.purpose; delete r.shape; r.score = 3; return r; });
      const r = D("recover", "--step", "a1", "--file", f);
      ok("every problem is named in one refusal, never the first one found",
        r.status === 1 && /missing the required field `purpose`/.test(r.stderr)
        && /missing the required field `shape`/.test(r.stderr)
        && /forbidden key `score`/.test(r.stderr));
    }

    // Not-JSON and not-an-object are separate refusals, because they are
    // separate mistakes.
    {
      const f = join(root, "notjson.json"); writeFileSync(f, "recovered a1, in prose\n");
      const r = D("recover", "--step", "a1", "--file", f);
      ok("a record that is not JSON is refused, naming the parse error",
        r.status === 1 && /is not readable JSON/.test(r.stderr));
      const g = join(root, "notobj.json"); writeFileSync(g, "[1,2,3]\n");
      const r2 = D("recover", "--step", "a1", "--file", g);
      ok("a JSON array is refused, naming the fields a record carries",
        r2.status === 1 && /is not a JSON object/.test(r2.stderr));
    }

    // THE VALIDATION HAPPENS BEFORE THE RECORD IS WRITTEN. A record validated
    // afterwards would leave `compare` to discover the defect, by which point
    // the reviewer who could fix it has finished reading.
    {
      // A FRESH workspace: `ws3` already holds a successful a1 recovery from the
      // empty-arrays case above, and asserting absence there would pass or fail
      // on that history rather than on this refusal.
      const ws4 = join(root, "ws4");
      spawnSync(process.execPath, [self, "open", "--draft", draft.path, "--workspace", ws4], { encoding: "utf8" });
      const f = writeRecord("a1", (r) => { delete r.shape; return r; });
      const r = spawnSync(process.execPath,
        [self, "recover", "--step", "a1", "--file", f, "--draft", draft.path, "--workspace", ws4], { encoding: "utf8" });
      ok("a refused record is not written to the workspace",
        r.status === 1 && !existsSync(join(ws4, "fixture", "recovered", "a1.json")));
    }
  }


  // ---- kogaki#872 -------------------------------------------------------
  // ACCEPTANCE 2: removing ONE ground from a Packet copy yields exactly one new
  // `widened` fail on that Step, and no change elsewhere.
  //
  // DRIVEN AS TWO WHOLE RUNS OVER TWO WHOLE DRAFTS, because the Packet's sha is
  // in the trace: editing a Packet under a live Draft is refused by `open`, by
  // design, so "a Packet copy" is a second Draft emitted against it. The two
  // Drafts differ in exactly one ground, and every line range is identical
  // because `buildDraft` computes them from the same body.
  {
    const full = join(root, "packets-full"); mkdirSync(full, { recursive: true });
    const short = join(root, "packets-short"); mkdirSync(short, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) {
      writePacket(full, id);
      // a1 keeps only its FIRST ground; the second recovered claim now rests on
      // nothing the Packet declares.
      writePacket(short, id, id === "a1" ? { grounds: [GROUNDS.a1[0]] } : {});
    }
    const dFull = buildDraft(join(root, "theses", "full"), { packetDir: full });
    const dShort = buildDraft(join(root, "theses", "short"), { packetDir: short });
    const rFull = driveToCompletedJoin(dFull, join(root, "ws-full"), "full");
    const rShort = driveToCompletedJoin(dShort, join(root, "ws-short"), "short");
    ok("both runs reach a completed join", rFull.second.status === 0 && rShort.second.status === 0);

    const L1 = linesOf(rFull.second.stdout);
    const L2 = linesOf(rShort.second.stdout);
    const failing = (m) => [...m.entries()].filter(([, l]) => /\sfails\s/.test(l)).map(([k]) => k);
    ok("the unmutated run has no failing item", failing(L1).length === 0);
    ok("removing one ground yields EXACTLY ONE new fail", failing(L2).length === 1);
    ok("and it is on the Step whose Packet lost the ground, on the grounds item",
      failing(L2)[0] === "a1/grounds");
    ok("and it is named `widened` — the claim rests on no ground the Packet declares",
      /widened/.test(L2.get("a1/grounds")));
    // NO CHANGE ELSEWHERE, asserted as line-for-line identity over every OTHER
    // pair rather than as a count: a count would pass while two items swapped
    // verdicts.
    const changed = [...L1.keys()].filter((k) => k !== "a1/grounds" && L1.get(k) !== L2.get(k));
    ok("and nothing else changes — every other (Step, item) line is identical",
      L1.size === L2.size && changed.length === 0, changed.join(", "));
    // THE WIDENED PAIR COSTS NO MODEL CALL. A claim that pairs with nothing has
    // no counterpart to put a question about, so the fail is a fact about the
    // pairing rather than a reading of it.
    const recShort = JSON.parse(readFileSync(rShort.jsonPath, "utf8"));
    ok("the widened claim is decided by the Harness, with no join Packet rendered for it",
      !recShort.model_calls.some((c) => c.step_id === "a1" && c.item === "grounds" && c.pair === 1)
      && recShort.mechanical.some((c) => c.step_id === "a1" && c.item === "grounds" && c.pair === 1));
    // The other half of the same pairing: the ground the claim used to rest on
    // is gone, so `grounds-unused` still holds — the two items read ONE
    // assignment and cannot disagree about the same Step.
    ok("and the unused-grounds item, which reads the same pairing, still holds",
      /\sholds\s/.test(L2.get("a1/grounds-unused")));
    // A PRESERVED item failing is what sends a Step to correction, and the run
    // says which — the class is the consequence, never a severity.
    ok("a preserved item failing sends its Step to correction, and the run names it",
      /Steps sent to correction[^\n]*a1/.test(rShort.second.stdout));
  }

  // ACCEPTANCE 3: a Draft using a term one Step BEFORE the Step whose Packet
  // says to introduce it is caught MECHANICALLY — no model call for that item.
  {
    const pd = join(root, "packets-early"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) {
      writePacket(pd, id);
      if (id === "a3") {
        // a3's Packet declares the term; a1's prose already used it.
        const p = join(pd, "a3.md");
        writeFileSync(p, readFileSync(p, "utf8").replace("- **introduce here.** (nothing new)",
          "- **introduce here.** - opacity"));
      }
    }
    const earlyProse = {
      a1: ["The first passage opens the claim and reaches for opacity as if it were settled.", "",
        "It runs two paragraphs so a range covering more than one line is exercised.",
        "The harness renders each input in the path's recorded order."],
      a2: PROSE.a2,
      a3: PROSE.a3,
    };
    const d = buildDraft(join(root, "theses", "early"), { packetDir: pd, prose: earlyProse });
    const r = driveToCompletedJoin(d, join(root, "ws-early"), "early");
    ok("the run reaches a completed join", r.second.status === 0);
    const L = linesOf(r.second.stdout);
    const line = L.get("a3/term-before-introduction");
    ok("a term used before the Step that introduces it FAILS on that Step", /\sfails\s/.test(line));
    // THE TERM IS EVIDENCE, NOT PART OF THE LINE. Quoted material is where a
    // number gets into a comparison line — the live drive's own grounds are
    // labelled by the Strands they came from — so the line refuses to carry it
    // and the join record holds it in full.
    ok("and the line itself quotes nothing", !/opacity/.test(line));
    ok("while the finding's evidence names the term",
      JSON.parse(readFileSync(r.jsonPath, "utf8")).results
        .find((x) => x.step_id === "a3" && x.item === "term-before-introduction").evidence === "opacity");
    // THE SPAN IS THE EARLIER OCCURRENCE, not the Step's own range: the finding
    // points at where the reader actually met the word.
    const early = readFileSync(d.path, "utf8").split("\n")
      .findIndex((l) => /reaches for opacity/.test(l)) + 1;
    ok("and the span points at the line where the reader first meets it",
      line.includes(`[${early}-${early}]`));

    // NO MODEL CALL IN THE LOG FOR THAT ITEM, for any Step — which is what
    // makes "decided mechanically" checkable rather than claimed.
    const rec = JSON.parse(readFileSync(r.jsonPath, "utf8"));
    ok("no join Packet is rendered for a mechanical item, on any Step",
      !rec.model_calls.some((c) => c.item === "term-before-introduction"));
    ok("and every Step records it as decided by the Harness",
      ["a1", "a2", "a3"].every((s) =>
        rec.mechanical.some((c) => c.step_id === s && c.item === "term-before-introduction")));
    // The whole mechanical set, asserted from the TABLE rather than from a list
    // written here: a table row that gained `mode: mechanical` and no
    // implementation would otherwise report `holds` for every Draft.
    const ITEMS = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    const mech = ITEMS.items.filter((i) => i.mode === "mechanical").map((i) => i.id);
    ok("every item the table calls mechanical costs no model call on any Step",
      mech.length > 0 && !rec.model_calls.some((c) => mech.includes(c.item)));
    ok("and every judged item DOES cost one",
      ITEMS.items.filter((i) => i.mode === "judged")
        .every((i) => rec.model_calls.some((c) => c.item === i.id)));
  }

  // A TERM CARRYING A DIGIT STILL YIELDS A DIGIT-FREE COMPARISON LINE. This is
  // the case the first live drive earned: the live Draft's grounds are labelled
  // by the Strands they came from, so quoting the offending material into the
  // reason put a number in front of a reader that was not a line number. The
  // line refuses to carry a quote; the evidence holds it in full.
  {
    const pd = join(root, "packets-digit"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) {
      writePacket(pd, id);
      if (id === "a3") {
        const p = join(pd, "a3.md");
        writeFileSync(p, readFileSync(p, "utf8").replace("- **introduce here.** (nothing new)",
          "- **introduce here.** - strand L97"));
      }
    }
    const digitProse = {
      a1: ["The first passage opens the claim and cites strand L97 as if it were settled.", "",
        "It runs two paragraphs so a range covering more than one line is exercised.",
        "The harness renders each input in the path's recorded order."],
      a2: PROSE.a2,
      a3: PROSE.a3,
    };
    const d = buildDraft(join(root, "theses", "digit"), { packetDir: pd, prose: digitProse });
    const r = driveToCompletedJoin(d, join(root, "ws-digit"), "digit");
    ok("a run whose Packet names a term carrying a digit still completes", r.second.status === 0);
    const line = linesOf(r.second.stdout).get("a3/term-before-introduction");
    ok("it fails on the Step that introduces the term", /\sfails\s/.test(line));
    ok("and the comparison line carries no digit outside its span",
      !/\d/.test(line.replace(/^\S+\s+/, "").replace(/\[\d+-\d+\]/, "")));
    ok("while the evidence carries the term whole, digit included",
      JSON.parse(readFileSync(r.jsonPath, "utf8")).results
        .find((x) => x.step_id === "a3" && x.item === "term-before-introduction").evidence === "strand L97");
  }

  // `cannot-decide` IS A THIRD ANSWER AND IS NEVER ROUNDED. It is listed with
  // its pair, and it is not a fail — it sends no Step to correction.
  {
    const pd = join(root, "packets-undecided"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(pd, id);
    const d = buildDraft(join(root, "theses", "undecided"), { packetDir: pd });
    const wsb = join(root, "ws-undecided");
    const D = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", d.path, "--workspace", wsb], { encoding: "utf8" });
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("recover", "--step", id, "--file", writeRecordFor(d, id, "und"));
    for (const n of ["1", "2"]) D("read", "--section", n, "--file", ledgerFile);
    D("compare");
    const jp = join(wsb, "undecided", "join.json");
    const f = answerOwed(jp, "und", "cannot-decide", "the passage does not say either way");
    const r = D("compare", "--verdicts", f);
    ok("a run answered entirely `cannot-decide` completes", r.status === 0);
    const L = linesOf(r.second === undefined ? r.stdout : r.stdout);
    ok("every judged pair renders `cannot-decide` rather than being rounded",
      [...L.values()].some((l) => /\scannot-decide\s/.test(l)));
    ok("and it is listed with its pair", /cannot-decide, listed with its pair and never rounded/.test(r.stdout));
    ok("and it sends no Step to correction — it is not a fail",
      /no Step is sent to correction/.test(r.stdout));
    // A cannot-decide is still a FINDING: it is what the owner record must
    // carry so a person can look at what the reader could not settle.
    const c = D("close");
    ok("close is reachable with cannot-decide and zero fails", c.status === 0);
    const rev = readOrEmpty(join(root, "theses", "undecided", "review.md"));
    ok("and the owner record lists every undecided pair with its class",
      /cannot-decide \((preserved|best-effort)\)/.test(rev));
  }

  // A PACKET MISSING A BLOCK THE COMPARISON NEEDS IS A PACKET GAP, refused BY
  // NAME and filed against the template — never satisfied by reading the Brief,
  // the Move or the Strand.
  {
    const pd = join(root, "packets-gapped"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(pd, id);
    const p = join(pd, "a2.md");
    writeFileSync(p, readFileSync(p, "utf8")
      .split("\n").filter((l) => !/^- \*\*purpose\.\*\*/.test(l)).join("\n"));
    const d = buildDraft(join(root, "theses", "gapped"), { packetDir: pd });
    const wsb = join(root, "ws-gapped");
    const D = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", d.path, "--workspace", wsb], { encoding: "utf8" });
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("recover", "--step", id, "--file", writeRecordFor(d, id, "gap"));
    for (const n of ["1", "2"]) D("read", "--section", n, "--file", ledgerFile);
    const r = D("compare");
    ok("a Packet missing a block the comparison needs refuses BY NAME, naming the Step",
      r.status === 1 && /step a2: its Packet carries no `purpose` block/.test(r.stderr));
    ok("and names the item that compares against it", /purpose/.test(r.stderr));
    ok("and files it as a PACKET GAP against the template, not as a side read",
      /PACKET GAP/.test(r.stderr) && /src\/packet-template\.md/.test(r.stderr));
  }

  // A MOVE RECORD WITH NO EXEMPLAR MAKES THE NEGATIVE ITEM VACUOUS, and the
  // table says so per item rather than the runtime deciding it: there is no
  // exemplar, so no subject matter can leak from one.
  {
    const rec = JSON.parse(readFileSync(join(WS, "join.json"), "utf8"));
    const a3 = rec.results.find((x) => x.step_id === "a3" && x.item === "exemplar-leak");
    const a1 = rec.results.find((x) => x.step_id === "a1" && x.item === "exemplar-leak");
    ok("a Step whose Move carries no exemplar is decided by the Harness, with no model call",
      a3.decided_by === "harness" && /no exemplar/.test(a3.reason)
      && !rec.model_calls.some((c) => c.step_id === "a3" && c.item === "exemplar-leak"));
    ok("while a Step whose Move DOES carry one is judged",
      a1.decided_by === "model"
      && rec.model_calls.some((c) => c.step_id === "a1" && c.item === "exemplar-leak"));
  }

  // THE ITEM TABLE IS READ, NEVER RESTATED — the same arrangement the recovered
  // record's schema has. The item ids that DO occur in the runtime are the keys
  // of the mechanical implementations and of the Packet-block readers, which is
  // the binding the table's `mode` and `declared_block` fields name; every other
  // use iterates `items`.
  {
    const table = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    const code = readFileSync(self, "utf8");
    const prod = code.slice(0, code.indexOf("async function runSelfTest"));
    const judged = table.items.filter((i) => i.mode !== "mechanical").map((i) => i.id);
    ok("no JUDGED item's id occurs in the runtime — the table is the only carrier",
      judged.length > 0 && !judged.some((id) => prod.includes(`"${id}"`)));
    ok("every MECHANICAL item the table declares has an implementation keyed by its id",
      table.items.filter((i) => i.mode === "mechanical").every((i) => prod.includes(`"${i.id}"`)));
    // The runtime enumerates no verdict set of its own — it VALIDATES against
    // the table's. The one token it names is in the selection rule, which needs
    // to know that a fail outranks an undecided pair when an item's line has to
    // pick one of its pairs to render; that is an ordering the table does not
    // carry and the runtime owns.
    ok("the closed verdict set is validated from the table, not from a list here",
      table.verdicts.length === 3 && prod.includes("items.verdicts.includes")
      && !/"holds"\s*,\s*"fails"/.test(prod));
    ok("and every threshold is an INPUT: no emitted line renders one",
      Object.keys(table.thresholds).filter((k) => k !== "note").length > 0
      && [...baseLines.values()].every((l) =>
        !String(table.thresholds.claim_ground_containment).includes(".") || !l.includes("0.")));
  }

  // AN ABSENT JOIN TEMPLATE IS A HOLE THE MODEL FILLS BY INVENTION, so the
  // Harness refuses rather than asking a question with no form. Driven against a
  // copy of the module with the template removed from beside it.
  {
    const solo = join(root, "solo-join"); mkdirSync(solo, { recursive: true });
    for (const f of ["review-draft.mjs", "runs.mjs", "runs.json", "recovery-template.md",
      "recovered-schema.json", "review-items.json"]) {
      writeFileSync(join(solo, f), readFileSync(join(dirname(self), f)));
    }
    const d = buildDraft(join(root, "theses", "nojointpl"), { packetDir });
    const wsb = join(root, "ws-nojointpl");
    const D = (...a) => spawnSync(process.execPath,
      [join(solo, "review-draft.mjs"), ...a, "--draft", d.path, "--workspace", wsb], { encoding: "utf8" });
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("recover", "--step", id, "--file", writeRecordFor(d, id, "njt"));
    for (const n of ["1", "2"]) D("read", "--section", n, "--file", ledgerFile);
    const r = D("compare");
    ok("an absent join template refuses rather than asking a question with no form",
      r.status === 1 && /join template is absent/.test(r.stderr));
  }

  // AND AN ABSENT ITEM TABLE REFUSES, for the reason the table exists: the
  // comparison would otherwise join against a table it invented.
  {
    const solo = join(root, "solo-items"); mkdirSync(solo, { recursive: true });
    for (const f of ["review-draft.mjs", "runs.mjs", "runs.json", "recovery-template.md",
      "recovered-schema.json", "join-template.md"]) {
      writeFileSync(join(solo, f), readFileSync(join(dirname(self), f)));
    }
    const d = buildDraft(join(root, "theses", "noitems"), { packetDir });
    const wsb = join(root, "ws-noitems");
    const D = (...a) => spawnSync(process.execPath,
      [join(solo, "review-draft.mjs"), ...a, "--draft", d.path, "--workspace", wsb], { encoding: "utf8" });
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("recover", "--step", id, "--file", writeRecordFor(d, id, "nit"));
    for (const n of ["1", "2"]) D("read", "--section", n, "--file", ledgerFile);
    const r = D("compare");
    ok("an absent item table refuses rather than joining against a table it invented",
      r.status === 1 && /item table is absent/.test(r.stderr));
  }

  // THE SCHEMA IS READ, NEVER RESTATED. The runtime must not carry its own copy
  // of the field list, or amending the record's shape becomes two edits that
  // can disagree.
  {
    const schema = JSON.parse(readFileSync(join(dirname(self), "recovered-schema.json"), "utf8"));
    const code = readFileSync(self, "utf8");
    const prod = code.slice(0, code.indexOf("async function runSelfTest"));
    ok("the schema declares the seven fields the issue names",
      schema.required.length === 7 && schema.required.includes("terms_introduced"));
    // `!some` and NOT `!every` (PR #884 round 1, finding 3): the `every` form
    // passed as soon as ONE of the seven names was absent from production code,
    // so a runtime restating six of seven read clean. `!some` is the property
    // this case's own name claims.
    ok("and the runtime does not restate the field list",
      !schema.required.some((f) => prod.includes(`"${f}"`)));
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
