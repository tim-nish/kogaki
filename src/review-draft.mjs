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
// records for /draft): `outline` refuses a Step whose Reverse Outline input it did not
// render, `compare` refuses while any Step is still unoutlined, `check`
// refuses before `compare`, and `close` is reachable from `compare` with zero
// fails or from `check` in every state. A session does not sequence these acts
// and cannot get the sequence wrong.
//
// THE COMPARISON IS FIXED IN THE HARNESS (kogaki#872). `src/review-items.json`
// decides which Packet information must be reconstructible per item class, which
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
// a hole. EVERY DECLARED BOUNDARY IS NOW FILLED, and each is named here as
// landed rather than dropped from the list, because a boundary that quietly
// stops being one cannot be told from a boundary a reader misremembered: the
// Reverse Outline input's record schema (kogaki#871); the item classes, the
// three-valued verdict and the mechanical checks (kogaki#872); and the
// correction path with its bounded second pass (kogaki#874).
//
// THE COLD READER IS GONE, AND ITS ABSENCE IS A RULING RATHER THAN A TRIM
// (owner, 2026-09-17; kogaki#1133). kogaki#873 added a second reader of the
// whole body, a Section ledger and five Section pairs. Reverse Outlining
// reconstructs the elements of a STEP, and the thesis is not a Step element: of
// those five pairs the heading was preserved trivially by the Harness that
// renders it, the three belief pairs duplicated the reader-state items one level
// up, and the thesis pair -- the one check no Step item makes -- had no act here
// at all, because corrections are Step-level and a thesis fail could only ever
// become residue saying the Packets lack something. That is a Brief-time
// finding. So there is no Section ledger, no Section pair and no thesis check in
// this file.
//
// THE REOPEN TRIGGER IS NAMED, so a later reader can tell a ruling from an
// omission: a Draft whose every Step holds the round trip and whose thesis the
// owner cannot find on reading it. If that happens the check is designed at
// BRIEF COMPOSITION, where the chain of `reader_state_after` values should reach
// the thesis, as an operation outside the Reverse Outlining item set -- and
// never as a sixth pair here.
//
// FIGURES REMAIN OUT OF SCOPE for this batch (kogaki#869) — they change the
// Step schema and the Packet, so they are a later batch and not a hole here.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
// already drifted into eight variants, which is what kogaki#982 collapsed.
//
// This file's own stronger property, established by kogaki#953's sweep and
// kept at the site because the carrier states only the general rule: NO
// OWNER-FACING STRING BELOW NAMES A SPEC AT ALL, not merely no spec section.
//
// The quoted heading beside a name is the spec content that name stands for.
// THE NAMES THIS FILE USES, and the spec each one names:
//   the figure decision
//       SPEC-draft-pipeline "The figure decision — `figure:` and `figure_roles` on a Step"
//   the figure record
//       SPEC-draft-pipeline "The figure record — the form's instance, filled after the prose"
//   the renderer
//       SPEC-draft-pipeline "The renderer and the anchor — markup from the record, at the Step"
//   the lifetimes rule
//       specs/spec-brief-draft-design/DESIGN.md "Lifetimes: what is owner state and what is machine state"
//   the frontmatter trace
//       SPEC-draft-command "The three-layer boundary"
//
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join, resolve, dirname, basename, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
// A NODE BUILTIN, so the closed-input allowlist below is satisfied as it is
// WORDED ("only node builtins and ./runs.mjs") rather than widened past its
// own property. It is here for exactly one act: `correct` re-enters the
// realization lane as a subprocess, because a corrected Step must be realized
// by the same renderer that wrote the Packets. Nothing here reads a Brief, a
// Move or a Strand — the reviewer's blindness is a property of what this
// module READS, and it reads none of them.
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { enterRun } from "./runs.mjs";
// ONE PARSER FOR A `step` BLOCK, and it is the Brief's (kogaki#1014). The
// Reverse Outline is a Brief Step block, so it is read by the function
// `parseBrief` calls per fenced block rather than by a second reader here.
import { parseStepBlock, stepField } from "./draft.mjs";

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

// THE REPLY REACHES THE HARNESS ON STANDARD INPUT (kogaki#1100), and the
// `--file` and `--verdicts` arguments are gone with it. `runs/` is machine
// state and holds what the Harness wrote; a reply the SESSION names a file for
// is a write with no owner, and after each act the Harness already holds the
// same bytes under its own name — so the file the session composed was a
// duplicate sitting inside the Harness's own layout. Piping is also what the
// acts are actually for: a spawn's output goes straight into the recording act
// with nothing written in between.
//
// AN ABSENT REPLY IS THE EMPTY STRING, NEVER A BLOCKED READ. A terminal leaves
// fd 0 open on a tty, so a two-phase act typed by hand would wait forever on a
// reply nobody is piping; `isTTY` is what tells an absent reply from one still
// arriving, and it is read here rather than at each call site so the five acts
// cannot disagree about what absent means.
const STDIN_LABEL = "standard input";

function readReply() {
  if (process.stdin.isTTY) return "";
  try { return readFileSync(0, "utf8"); }
  catch (e) {
    if (e.code === "EOF") return "";
    if (e.code === "EAGAIN") {
      fail("standard input could not be read (EAGAIN) — the reply is piped into this act, and a "
        + "non-blocking stream with nothing on it yet is not an absent reply. Pipe the reply in, or "
        + "run the act with standard input closed to mean there is none.");
    }
    throw e;
  }
}

// A reply an act REQUIRES. `outline` and `read` record a reading and have no
// second phase to fall back to, so an empty stream is the usage refusal rather
// than a recorded blank.
function requireReply(usage) {
  const text = readReply();
  if (text.trim() === "") {
    fail(`nothing arrived on standard input, and this act records a reply — pipe it in.\n${usage}`);
  }
  return text;
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
      + "frontmatter, and without it there is no trace to review against");
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") { end = i; break; }
  }
  if (end === -1) fail(`${draftPath} has an unterminated frontmatter block`);

  const trace = [];
  let inTrace = false;
  // THE `brief:` LINE IS READ AND NOTHING ELSE IS DONE WITH IT HERE. It is the
  // one frontmatter field `correct` needs — the correction path goes back
  // through the realization lane, and that lane is entered by its Brief — and
  // it is read by the same line scan the trace is, for the same reason: `emit`
  // writes it as one line and a general YAML parser would be a second grammar
  // that can disagree with the writer.
  //
  // THIS IS NOT THE CLOSED-INPUT ALLOWLIST BREAKING (the owner's 2026-09-04
  // ruling). The ruling binds what the REVIEWER reads: a comparison that needs
  // the Brief, a Move or a Strand is a Packet gap. Nothing here reads the
  // Brief's content — the path is handed to `src/draft.mjs`, the renderer that
  // wrote the Packets in the first place, as an argument to a subprocess. The
  // reviewer's blindness is untouched, and this module still imports only node
  // builtins and ./runs.mjs.
  let brief = null;
  for (let i = 1; i < end; i++) {
    const m = lines[i].match(/^brief: (.+?)\s*$/);
    if (m) { brief = m[1]; break; }
  }
  // THE LANGUAGE THE DRAFT WAS REALIZED AT (kogaki#1160). `draft.mjs emit`
  // writes `lang: <lang>` only for a non-English realization (`langOf`'s own
  // "at `en` every path resolves to exactly the string it always did"
  // convention) — so a Draft carrying no `lang:` field is English, never a
  // Draft this reader refuses. Read by the same line scan as `brief:`, for the
  // same reason: `emit` writes it as one line and a general YAML parser would
  // be a second grammar that can disagree with the writer.
  let lang = "en";
  for (let i = 1; i < end; i++) {
    const m = lines[i].match(/^lang: (.+?)\s*$/);
    if (m) { lang = m[1]; break; }
  }
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
  return { path: draftPath, text, lines, frontmatterEnd: end, body, body_sha: sha256(body), trace, brief, lang };
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
        + "machine state and is pruned; re-render it with "
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
    // THE FIGURE IS RESOLVED ON THE SAME TERMS THE PACKET IS (kogaki#880).
    // The renderer rule gives a figure-carrying Step a `figure` entry naming the validated
    // record, its sha and its own line range, and a Step declaring none carries
    // NO `figure` KEY AT ALL — an absent field rather than a null one — so the
    // presence test below is the same fact the spec writes.
    //
    // THREE REFUSALS, EACH THE FIGURE'S COUNTERPART OF A REFUSAL ABOVE, and
    // they are here rather than at the first item that reads the record because
    // a Draft whose figure record moved is one whose whole figure half is
    // meaningless — the same reason the Packet's sha is checked before any item
    // is computed rather than at the item that first needs a block.
    let figure = null;
    if (t.figure !== undefined && t.figure !== null) {
      const f = t.figure;
      if (!Array.isArray(f.lines) || f.lines.length !== 2
          || !Number.isInteger(f.lines[0]) || !Number.isInteger(f.lines[1])) {
        fail(`step ${id}: its trace entry carries a figure with no line range — the renderer records the `
          + "figure's own range beside the Step's prose range, and without it Reverse Outlining "
          + "has no block to quote; re-emit the Draft (node src/draft.mjs emit --brief <brief.md>)");
      }
      if (typeof f.record !== "string" || typeof f.record_sha !== "string") {
        fail(`step ${id}: its trace entry carries a figure naming no record — the record is the `
          + "declared side of every figure item, so a figure without one cannot be reviewed");
      }
      const recordPath = resolve(dir, f.record);
      if (!existsSync(recordPath)) {
        fail(`step ${id}: the figure record the trace names is absent — ${recordPath}. The run `
          + "workspace is machine state and is pruned; re-record it with "
          + `\`node src/draft.mjs figure --brief <brief.md> --step ${id} --file <record.json>\``);
      }
      const recordText = readFileSync(recordPath, "utf8");
      const recordActual = sha256(recordText);
      if (recordActual !== f.record_sha) {
        fail(`step ${id}: the figure record's sha differs from the trace's — the Draft was not `
          + `emitted from this record.\n  trace  ${f.record_sha}\n  file   ${recordActual}\n`
          + `  at     ${recordPath}\n`
          + "The rendered block the reader met came from the record as it stood at emit; comparing "
          + "it against a record edited since compares two unrelated things.");
      }
      let record;
      try { record = JSON.parse(recordText); }
      catch (e) {
        fail(`step ${id}: the figure record at ${recordPath} is not readable JSON (${e.message}) `
          + "— it was written by `draft.mjs figure` and validated then, so a record unreadable now "
          + "was edited outside the Harness");
      }
      figure = {
        position: f.position,
        record: f.record,
        record_path: recordPath,
        record_sha: f.record_sha,
        lines: f.lines,
        rendered: draft.lines.slice(f.lines[0] - 1, f.lines[1]).join("\n"),
        record_json: record,
      };
    }
    steps.push({
      step_id: id,
      section: t.section,
      section_title: t.section_title,
      lines: t.lines,
      packet: t.packet,
      packet_path: packetPath,
      packet_sha: t.packet_sha,
      prose,
      figure,
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
// rule every other lane's workspace has: disposable, pruned to
// the last K, never the artifact.

function slugOf(draftPath) {
  return basename(dirname(resolve(draftPath)));
}

// `--workspace` IS A BASE AND THE SLUG IS JOINED ONTO IT — the same reading
// `src/draft.mjs`'s own `workspaceFor` gives the flag (PR #882 round 1,
// finding 3). Returning the flag verbatim made two Drafts driven under one
// `--workspace` share a single `run.json`, so the second `open` overwrote the
// first run's rendered inputs and outlines with no error and no trace. Two
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

// ---------------------------------------------------------------------------
// THE WORKSPACE IS SPLIT BY PASS, AND THE SPLIT IS THE CONTRACT (kogaki#994).
//
// Until this, pass two wrote `outline-input/<step>.md`, `outline/<step>.json` and
// `join/<step>.<item>.md` at the paths pass one had used, so the corrected
// Steps' first-pass evidence was overwritten in place. `runs/` is gitignored,
// so nothing else held a copy: pass one's blind reading of the ORIGINAL Draft,
// and every pair input judged against it, were gone — and the surviving
// verdicts in `join.json` indexed into Reverse Outlines that no longer
// existed. A rule saying "do not overwrite" would be prose where a refusal
// belongs, so the layout is the Harness's:
//
//   runs/review/<slug>/pass-1/{outline-input,outline,join,corrections,join.json}
//   runs/review/<slug>/pass-2/{outline-input,outline,join,check.json}
//   runs/review/<slug>/snapshots/     — before/after per corrected Step
//   runs/review/<slug>/run.json
//
// A later third pass is `pass-3/` and NOTHING ELSE MOVES: the pass number is a
// run-record field, so a pass gains a directory rather than the layout gaining
// a rule. `snapshots/` and `run.json` stay at the workspace root deliberately —
// a snapshot pair spans the correction that separates two passes, and the run
// record is the one file every pass writes.

// The pass the run is ON. Absent on a record written before this split, which
// reads as pass one — the pass such a record's evidence was in fact written by.
//
// WHAT THAT DEFAULT DOES NOT DO IS RESOLVE THE OLD PATHS (PR #1004 round 1,
// finding 4). A pre-split run's evidence sits at the workspace ROOT, not under
// `pass-1/`, so a run open across this change meets `readJoin` refusing at
// `pass-1/join.json` and is repaired by re-opening it — `runs/` is machine
// state, pruned by design, and re-opening is the repair the workspace's own
// lifetime rule already assumes. The default is about the pass a record BELONGS
// to, never about where its files are.
function currentPass(run) {
  const p = run.pass;
  if (p === undefined || p === null) return 1;
  if (!Number.isInteger(p) || p < 1) {
    fail(`the run record carries an unreadable pass number (${JSON.stringify(p)}). The pass is what `
      + "names the directory this act's evidence belongs in, so there is nowhere to write until it "
      + "is a whole number of at least 1.");
  }
  return p;
}

function passDirFor(ws, pass) { return join(ws, `pass-${pass}`); }

// A pass a CALLER named, checked rather than trusted. Both join builders take
// one, and a missing or malformed value is a wiring defect in this file rather
// than a state a run can reach, so it refuses by naming the site.
function requirePass(pass, site) {
  if (!Number.isInteger(pass) || pass < 1) {
    fail(`${site} was called without the pass it is building for `
      + `(${JSON.stringify(pass)}). The pass is the caller's — \`compare\` is one and \`check\` is `
      + "two — and there is no default, because a wrong default files a pass's pair inputs under "
      + "another pass's directory.");
  }
  return pass;
}

// THE REVIEWED DRAFT HAS ITS OWN FILENAME, AND `draft.md` STAYS THE DRAFT THAT
// WAS REVIEWED (kogaki#994). `correct` re-realizes a Step through the draft
// lane, and that lane emits to `theses/<slug>/draft.md` — so during a run the
// article at that path IS the correction in progress, which is what makes each
// later correction's "article so far" block current. What was wrong was leaving
// it there: the only signal a review had happened was a modified working tree,
// and the Draft that was actually reviewed was reachable only through git or
// through the first snapshot. `close` ends the run by writing the corrected
// article beside the original under this name and restoring `draft.md` from the
// snapshot the first correction took, so a reader has both documents and the
// diff between them is the review.
const REVIEWED_BASENAME = "draft.reviewed.md";

// The workspace-relative key a path is registered under. Relative so the ledger
// survives a workspace that moves, and posix-separated so the key a run records
// on one platform is the key it reads back on another.
function passKey(ws, dest) {
  return relative(resolve(ws), resolve(dest)).split(sep).join("/");
}

// COMPOSE A PATH UNDER THE PASS THE RUN IS ON, AND REGISTER IT. Two refusals,
// and they are different mistakes:
//
//   - the composed path leaves this pass's directory — a segment escaped, so
//     the write would land where no pass owns it;
//   - the path was written by ANOTHER pass — the overwrite this issue exists to
//     make impossible, refused by name and naming both passes.
//
// The registration rides the run record the caller already persists, so the
// ledger is written by the same `writeRun` the act's other state is.
function passPath(ws, run, ...segments) {
  return passPathAt(ws, run, currentPass(run), ...segments);
}

// The same act with the pass NAMED rather than read off the record. One caller:
// `compare`, which IS pass one whatever pass the run has since reached.
function passPathAt(ws, run, pass, ...segments) {
  const dir = passDirFor(ws, pass);
  const dest = resolve(join(dir, ...segments));
  const root = resolve(dir) + sep;
  if (!dest.startsWith(root)) {
    fail(`pass ${pass} composed a path outside its own directory — ${dest}. Every pass writes only `
      + `under ${dir}, so a segment that escapes it is refused rather than written somewhere no `
      + "pass owns.");
  }
  const key = passKey(ws, dest);
  run.pass_files = run.pass_files || {};
  const owner = run.pass_files[key];
  if (owner !== undefined && owner !== pass) {
    fail(`refused: pass ${pass} would write over a file pass ${owner} wrote — ${dest}. Each pass's `
      + "evidence is its own record of what a reviewer read and judged, and pass "
      + `${owner}'s reading is not retrievable once this write lands. Pass ${pass}'s copy belongs `
      + `under ${dir}.`);
  }
  run.pass_files[key] = pass;
  mkdirSync(dirname(dest), { recursive: true });
  return dest;
}

// A path REGISTERED to a pass, read back. `check` reads pass one's join record
// from the directory pass one wrote it in, which is a read across the boundary
// and is not what the refusal above is about: carrying pass one's verdicts
// forward is the whole design of the bounded second pass.
function passReadPath(ws, pass, ...segments) {
  return join(passDirFor(ws, pass), ...segments);
}

// THE RUN RECORD IS BOUND TO THE DRAFT IT WAS OPENED ON. A Draft edited between
// `open` and a later act is a different document, and continuing against the
// old record would judge prose nobody rendered an input for. This is the same
// staleness the Packet-sha check refuses at `open`, one layer over.
function requireCurrent(run, draft, allowCorrecting = null) {
  if (run.body_sha !== draft.body_sha) {
    fail(`the Draft has changed since this run was opened.\n  opened on  ${run.body_sha}\n`
      + `  now        ${draft.body_sha}\n`
      + "Re-open the run (`open --draft <draft.md>`) — the Reverse Outline inputs already rendered were "
      + "rendered from prose that is no longer there.");
  }
  // THE MID-CORRECTION STATE IS NAMED RATHER THAN MET AS A SHA MISMATCH
  // (kogaki#874). Rendering a correction input re-renders that Step's Packet —
  // it must, since the whole point is a Packet carrying the article as it NOW
  // stands — so between the render and the recording the trace names a Packet
  // the prose was not produced from, which is TRUE and is exactly what
  // `resolveInputs` refuses on. That refusal is right in general and useless
  // here: it sends a reviewer to re-emit the Draft, which would discard the
  // correction they are in the middle of. So the state is recorded when it
  // opens and reported by name while it is open.
  const c = run.correcting;
  if (c && c.step_id !== allowCorrecting) {
    fail(`this run is mid-correction on step ${c.step_id} — its Packet has been re-rendered against `
      + "the current article and its prose has not been re-realized yet, so the Draft's trace names "
      + `a Packet that did not produce the prose beside it.\n  input  ${c.input}\n`
      + "Realize the Step from that input and record it with\n"
      + `  <the corrected prose> | node src/review-draft.mjs correct --draft <draft.md> --step ${c.step_id}\n`
      + "Re-emitting the Draft would discard the correction instead of completing it.");
  }
}

// ---------------------------------------------------------------------------
// Rendering a Reverse Outline input. The reviewer is BLIND: it sees the prose and
// never the Packet, which is what makes the Reverse Outline evidence about the
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
  return numberedRange(step.prose, step.lines);
}

// The same rendering for any contiguous draft range, so the figure block and
// the prose are numbered by ONE function rather than by two that agree until
// one is edited. The width comes from the range's own last line, which is what
// keeps a Step's own listing aligned with itself.
function numberedRange(text, lines) {
  const width = String(lines[1]).length;
  return text.split("\n")
    .map((l, i) => `${String(lines[0] + i).padStart(width, " ")} | ${l}`)
    .join("\n");
}

// THE INSTRUCTION NAMES NO SIDE (PR #946 round 1). It read "where it sits
// relative to the passage BELOW", which was true while the block was always
// rendered above the passage and became false for half the cases the moment
// kogaki#945 made the placement faithful — handing a blind reviewer a sentence
// asserting the opposite arrangement to the one on their page, which is the
// inverted-order reading `figure-position` exists to prevent, reintroduced in
// prose one line from the fix. The placement cases assert by slot index and
// cannot see a wrong word, so a case asserts the absence directly.
//
// THE FIGURE AS THE READER MET IT (kogaki#880) — the Draft's own bytes over the
// range the renderer records, numbered in the same coordinate the prose is, and
// NOTHING from the record. Two facts reach the blind reviewer from this and
// they are both facts about the article: what the block says, and where in the
// Draft it sits relative to the passage. The record's roles, claim addresses,
// relations, kind and position word reach it nowhere, which is what makes the
// element-to-claim join downstream a comparison rather than a restatement.
function numberedFigure(step) {
  return numberedRange(step.figure.rendered, step.figure.lines);
}

// WHERE THE READER MET THE FIGURE, read from the DRAFT'S OWN LINE NUMBERS and
// never from the record's `position` field. The distinction is the whole reason
// this is a function rather than a read of the record (kogaki#945): `position`
// is the DECLARED side, and the Reverse Outline input below must carry nothing
// from the record — arranging that input by `position` would show a blind
// reviewer the very value the `figure-position` item exists to join against
// their independent reading. Line numbers are already on the reviewer's page,
// so ordering by them discloses nothing they were not given.
function figureBeforePassage(step) {
  return step.figure.lines[0] < step.lines[0];
}

// The passage a JUDGING reader is shown: the prose, with the figure quoted
// beside it in draft-line order where the Step has one. The judging reader is
// not blind — it already sees the declared side — so withholding the block from
// it would leave three of the five figure items asking about something they
// cannot see.
function quotedPassage(step) {
  if (!step.figure) return numberedProse(step);
  const parts = figureBeforePassage(step)
    ? [numberedFigure(step), numberedProse(step)]
    : [numberedProse(step), numberedFigure(step)];
  return parts.join("\n\n");
}

// The number of fields the Blind Reader is asked to fill, COUNTED FROM THE
// DECLARATION rather than spelled in the instruction — so a disposition table
// gaining a field cannot leave the sentence the reader reads saying the old
// count.
//
// IT TAKES NO STEP (PR #1022 round 1, finding 5). It took one while the count
// was per Step — a Step carrying a figure owed an eighth field — and the figure
// half left under the decline recorded in `src/review-items.json`. A parameter
// nothing reads says the count still varies by Step, which is the form a
// reader would trust and a later edit would build on.
function reverseOutlineFieldCount() {
  return RECONSTRUCTIBLE_FIELDS.length;
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve"];

// A COUNT WRITTEN AS A WORD, because it lands in the reviewer's instruction and
// this Harness's own rule is that a review carries no digit but a line number.
// Past the table it falls back to the numeral rather than refusing: the
// instruction is the reviewer's and a refusal here would withhold the whole
// input over a number nobody reads as a score.
function numberWord(n) {
  return NUMBER_WORDS[n] ?? String(n);
}

// The figure section of the Reverse Outline input. THE HEADING SAYS WHERE THE
// READER MET IT WITHOUT SAYING THE RECORD'S WORD: the draft line numbers on the
// block and on the passage below already carry the placement, and they are the
// article's own facts rather than the record's declaration of intent — which is
// exactly the pair `figure-position` exists to lay against each other.
function renderFigurePassage(step) {
  return ["## The figure the reader met with this passage",
    "",
    "It is rendered in the Draft, not written by the passage's author. Read it as",
    "the reader does — the numbers are its lines in the Draft, and this section",
    "sits on the side of the passage the reader met it on.",
    "",
    numberedFigure(step),
    "",
    ""].join("\n");
}

// THE BLIND READER'S INPUT IS THE BRIEF STEP SCHEMA AND THE PROSE (kogaki#1014).
//
// Reverse Outlining: read the passage, then write the outline entry the passage
// would have been written from — in the SAME FORM as the forward outline. So
// the input carries the Brief's own field list with the Brief's own
// definitions, and nothing else. There is no template file, because there is no
// second artifact to describe: the reader fills a `step` block.
//
// WHAT IS WITHHELD IS WITHHELD DELIBERATELY. The Forward Artifact is not shown —
// that is what makes the comparison worth making — and neither is the Move, its
// candidates, or any of the not-reconstructible fields. Supplying the Move
// would make the outcome ride on supplied information; its effect is carried by
// the reader states, which ARE compared.
//
// THE ARTICLE'S OWN TEXT GOES IN LAST. `article_so_far`, `step_prose` and the
// figure passage are the Draft's own bytes, and an article about this pipeline
// can quote a field name or a fenced block as its own subject matter — so
// nothing below substitutes into them.
function renderReverseOutlineInput(ws, run, draft, step, steps) {
  const figureBlock = step.figure ? renderFigurePassage(step) : "";
  const figureFirst = step.figure ? figureBeforePassage(step) : false;
  const fieldLines = RECONSTRUCTIBLE_FIELDS.map((f) => `- \`${f.name}\` — ${f.definition}`);

  // THE FIGURE'S ASK RIDES THE SAME INPUT AND IS OWED ONLY WHERE THE READER MET
  // ONE. A figureless Step is not asked for a figure block and is refused one:
  // a reader inventing a reading of a block that was never rendered is not
  // annotating harmlessly, it is a reading of nothing reaching the comparison.
  const figureFieldLines = step.figure
    ? FIGURE_RECONSTRUCTIBLE_FIELDS.map((f) => `- \`${f.name}\` — ${f.definition}`)
    : [];
  const figureAsk = step.figure
    ? ["## The figure you met, in its own terms",
      "",
      "This passage was rendered with a block beside it, and that block was written from a record",
      "of its own. Read it as you read the passage — from what is on the page — and answer in the",
      "record's own fields:",
      "",
      ...figureFieldLines,
      "",
      "Reply with a SECOND fenced block, after the `step` block:",
      "",
      "````",
      "```figure",
      "element: …",
      "caption: …",
      `position: <${figurePositions().join("|")}>`,
      "```",
      "",
      "One `element:` line per element you can see, in the order they read. The example shows the",
      "FORM of the block and not an answer: how many elements there are, and which side the block",
      "sits on, are what you are being asked.",
      "````",
      ""].join("\n")
    : "";

  const head = [
    `# Reverse Outline — ${step.step_id}`,
    "",
    "You are reading one passage of an article, and the article that came before it. You have",
    "not seen the outline the article was written from, and you must not go looking for it:",
    "your reading is the other half of a comparison, and it is worth nothing if it was told the",
    "answer.",
    "",
    "Write the outline entry this passage would have been written from — what it is FOR, what a",
    "reader holds arriving at it and leaving it, and what it asks the reader to accept. Write it",
    `in the form below. Answer from the passage alone; where the passage does not settle a field,`,
    "say what the passage does say rather than what would make it come out well.",
    "",
    "Your outline is evidence about **this prose**. Do not reason about what the",
    "author was probably told — an outline that guessed at what produced the passage measures",
    "nothing.",
    "",
    "Write no verdicts and no advice. Nothing here asks whether the passage is good.",
    "",
    `## The ${numberWord(reverseOutlineFieldCount())} fields`,
    "",
    ...fieldLines,
    "",
    "`introduces` is legitimately absent — a passage that introduces nothing carries no such",
    "line. `claims` is not: every passage asserts something.",
    "",
    "## The form",
    "",
    "Reply with ONE fenced `step` block and nothing else:",
    "",
    "````",
    "```step",
    `step_id: ${step.step_id}`,
    "purpose: …",
    "reader_state_before: …",
    "reader_state_after: …",
    "claim …",
    "claim …",
    "introduces: <term>",
    "introduces: <term> — <where the passage anchors it, only if it does>",
    "```",
    "````",
    "",
    figureAsk,
    "## The article before this passage",
    "",
    "Everything already written, in order, under the Section headings it was written into. It",
    "ends with this passage's own Section so far — the prose immediately above where the passage",
    "begins. Read it as the reader arriving at the passage has read it: it is what they already",
    "know.",
    "",
  ].join("\n");

  // THE ARTICLE'S OWN TEXT GOES IN LAST, and the passage comes after the
  // article that precedes it — the order the reader meets them in, and the
  // order the section prose above describes.
  //
  // THE FIGURE SITS ON THE SIDE OF THE PASSAGE THE READER MET IT ON, and a
  // figure met ABOVE the prose goes above the passage's own HEADING rather
  // than under it: a block the reader met first, rendered below the heading
  // that announces the passage, is the inverted arrangement kogaki#945 removed,
  // one line further down the page.
  const parts = [head, articleBefore(steps, step.step_id), ""];
  if (figureFirst && figureBlock) parts.push(figureBlock, "");
  parts.push(
    `## The passage — ${step.step_id}, draft lines ${step.lines[0]}–${step.lines[1]}`,
    "",
    "Every line is numbered with its line number in the Draft.",
    "",
    numberedProse(step), "");
  if (!figureFirst && figureBlock) parts.push(figureBlock, "");

  const dest = passPath(ws, run, "outline-input", `${step.step_id}.md`);
  const out = parts.join("\n");
  writeFileSync(dest, out.endsWith("\n") ? out : out + "\n");
  return dest;
}

// ---------------------------------------------------------------------------
// THE REVERSE OUTLINE, AND THE FIELDS IT IS WRITTEN IN (kogaki#1013/#1014).
//
// Reverse Outlining is the method: after drafting, write an outline of what the
// prose actually says, in the same form as the forward outline, and compare
// entry by entry. So the Reverse Outline is a BRIEF STEP BLOCK — every field is
// a Brief field under the Brief's own name and definition — and there is no
// second schema for the same information. `src/outlined-schema.json` and
// `src/outline-template.md` were that second schema and are deleted with this.
//
// THE DISPOSITIONS ARE DECLARED ONCE, HERE, PER BRIEF STEP FIELD, and the table
// below is that declaration. A field the Blind Reader is asked for is one a
// reader of the prose alone can write; a field they are refused is one whose
// answer is not in the passage, and asking would get an invention back that the
// Round Trip would then dutifully compare.
//
// `claims` IS THE `claim ` LINES, not a `claims:` field — the Brief's own
// grammar, read by the same `claimLines` the realization side reads, because
// "in the Brief's form" is the whole claim.
//
// THE FIELDS ARE FIVE, AND TWO LEFT TOGETHER (owner 2026-09-17; kogaki#1132).
// `concession` was the one field here that was not a Brief field at all — it
// entered through kogaki#871's body with no design-table row — and
// `opens_section` is a Brief field whose Round Trip row asked a realization
// lint of the class removed on 2026-09-09. Both rows left the item table, so
// neither field has a reader; a field asked for and compared by nothing is a
// reading the Blind Reader is charged for and nobody looks at. `opens_section`
// moves to the refused list below, because it IS a Brief Step field and the
// closed line set would otherwise admit it silently; `concession` is refused by
// that closed set itself, which names it and says it is not a Brief Step field.
export const RECONSTRUCTIBLE_FIELDS = [
  { name: "purpose", kind: "line",
    definition: "what this passage is for — what it does for the reader, in your words." },
  { name: "reader_state_before", kind: "line",
    definition: "what a reader knows and believes as they arrive at this passage." },
  { name: "reader_state_after", kind: "line",
    definition: "what a reader knows and believes once they have read it." },
  { name: "claims", kind: "claim-lines",
    definition: "one `claim ` line per thing the passage ASSERTS — what it asks the reader to accept." },
  // BOTH ARMS, and the bare one first (PR #1022 round 1, finding 3). This read
  // `introduces: <term> — <anchor>`, which is only half of what
  // `parseIntroducesEntry` accepts: a term may be written BARE, and only a
  // separator with nothing after it is refused. A reader who took the anchor
  // for mandatory would supply one for a term the passage anchors nowhere —
  // an invention reaching the comparison through the one field the blind half
  // exists to keep clean.
  { name: "introduces", kind: "repeated-line",
    definition: "one `introduces: <term>` line per term this passage introduces to the reader. "
      + "There are two forms and both are accepted: write the term BARE, or — where the passage "
      + "also says what the term MEANS — write `introduces: <term> — <anchor>` and let the anchor "
      + "be that meaning, in the passage's own words. Where the passage anchors nothing, write the "
      + "term bare rather than inventing an anchor. A passage that introduces nothing carries no line." },
];

// Declared NOT reconstructible, and REFUSED in a Reverse Outline rather than
// merely unasked. The two differ: an unasked field a reader supplies anyway is
// an invention that reaches the comparison, and the whole point of the blind
// half is that what comes back was read rather than inferred.
export const NOT_RECONSTRUCTIBLE_FIELDS = [
  { name: "move", why: "the Move is the Brief's name for the reader-state transition type, and a reader cannot "
      + "infer which library entry produced a passage; the Move's effect is carried by the reader states, which ARE compared" },
  { name: "materials", why: "which Strands licensed the passage is a fact about the Brief, not about the prose" },
  { name: "rationale", why: "why the Step was placed where it was is the composer's reasoning, not the reader's" },
  { name: "depends_on", why: "which earlier Steps this one stands on is the path's structure, not the passage's content" },
  { name: "bridges", why: "whether this Step was inserted between two others is a fact about how the Brief was revised" },
  { name: "figure", why: "the figure's own round trip is a separate comparison against the figure record's own fields" },
  { name: "opens_section", why: "whether a Step opens its Section or continues one is rendered by the Harness out "
      + "of the trace, so it is never information the prose has to carry; the row that compared it left the item table "
      + "at kogaki#1132 and a line nothing reads is a reading the Blind Reader is charged for and nobody looks at" },
];

// ---------------------------------------------------------------------------
// THE FIGURE'S OWN ROUND TRIP (kogaki#880, restated against the record's own
// fields at kogaki#1018).
//
// ONE LEVEL DOWN, UNDER THE SAME RULE. A passage is written from a Brief Step,
// so its Reverse Outline is a Brief Step block. A figure is written from its
// RECORD, so the figure's Reverse Outline is a block in the FIGURE RECORD's own
// field names — `src/figure-schema.json`'s, which is where they are declared and
// where they stay. There is no second schema at either level, which is the
// property kogaki#1014 landed for the passage and this is the same property for
// the figure.
//
// WHY IT IS ITS OWN BLOCK RATHER THAN A FIELD OF THE STEP'S. `figure` IS a Brief
// Step field and it is declared NOT reconstructible above — a reader cannot read
// the Brief's figure decision off a rendered block — so a `figure:` line inside
// the Reverse Outline is refused there and stays refused. What a reader CAN do
// is say what they met, and that answer is about a different artifact with a
// different field list. Filing it as its own fence and its own file is what
// keeps the Step reading's key set closed against the Brief's names.
//
// THE DISPOSITION RULE IS THE SAME RULE. Reconstructible is "a reader who met
// the rendered block could say this"; everything else is REFUSED rather than
// merely unasked, for the reason the Brief half gives — an unasked field a
// reader supplies anyway is an inference that reaches the comparison.
export const FIGURE_RECONSTRUCTIBLE_FIELDS = [
  { name: "element", kind: "repeated-line",
    definition: "one `element: <what it is>` line per thing you can name in the block, in your own "
      + "words. At least one. You are naming what is THERE, never judging how well it is put." },
  { name: "caption", kind: "line",
    definition: "what you hold after looking at the block, in your own words — one line." },
  { name: "position", kind: "line",
    definition: "`before` where you met the block above this passage, `after` where you met it below." },
];

// Declared NOT reconstructible, and refused in a figure's Reverse Outline.
export const FIGURE_NOT_RECONSTRUCTIBLE_FIELDS = [
  { name: "kind", why: "the record's kind is the Move FORM's, and a reader cannot infer the form a "
      + "structure was produced from — the same ruling that keeps `move` out of the passage's outline" },
  { name: "relations", why: "the relation a form holds between its roles belongs to the form and is "
      + "read out of src/figure-kinds.json; a reader naming one would be naming the source rather "
      + "than the block" },
  { name: "emphasis", why: "which element the figure leans on is a decision recorded beside the block, "
      + "and a rendering does not ask its reader to separate that out" },
];

// The record's `position` vocabulary, and it is the RECORD's rather than a
// second copy: `src/figure-schema.json` declares the closed pair, so a third
// value entering there is refused here without this file being edited.
function figurePositions() {
  const p = join(dirname(fileURLToPath(import.meta.url)), "figure-schema.json");
  if (!existsSync(p)) {
    fail(`the figure record's contract is absent — ${p}. The figure Round Trip reads its field `
      + "vocabulary from that file rather than carrying a copy, so this refuses rather than "
      + "validating against a vocabulary it invented.");
  }
  let schema;
  try { schema = JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { fail(`the figure schema at ${p} is not readable JSON (${e.message})`); }
  const one = schema.fields?.position?.one_of;
  if (!Array.isArray(one) || one.length === 0) {
    fail(`the figure schema at ${p} declares no closed set for \`position\`, and the Round Trip `
      + "reads that set from the record's own contract rather than restating it");
  }
  return one;
}

// The fenced form, the Step block's grammar one artifact over.
function parseFigureBlock(text, path) {
  const m = /^```figure\n([\s\S]*?)\n```/m.exec(text);
  if (!m) {
    return { refusal: `${path} carries no fenced \`figure\` block — this Step's reader met a figure, so `
      + "the Round Trip owes a reading of it in the figure record's own field names" };
  }
  if (/^```figure\n/m.test(text.slice(m.index + m[0].length))) {
    return { refusal: `${path} carries more than one fenced \`figure\` block — a Step renders one figure, `
      + "and two blocks leave the Harness to pick which one the reader meant" };
  }
  return { body: m[1] };
}

// The figure's Reverse Outline, validated and projected into the record's own
// field names. EVERY REFUSAL NAMES WHAT IT SAW, for the reason the passage half
// gives: this is the one artifact in the flow a person wrote by hand.
function validateFigureOutline(text, step, file) {
  const parsed = parseFigureBlock(text, file);
  if (parsed.refusal) fail(parsed.refusal);
  const body = parsed.body;
  const problems = [];

  const caption = stepField(body, "caption");
  if (caption === null) problems.push("carries no `caption:` line — " + FIGURE_RECONSTRUCTIBLE_FIELDS[1].definition);
  else if (caption === "") problems.push("`caption:` is blank — " + FIGURE_RECONSTRUCTIBLE_FIELDS[1].definition);

  const position = stepField(body, "position");
  const positions = figurePositions();
  if (position === null) problems.push("carries no `position:` line — " + FIGURE_RECONSTRUCTIBLE_FIELDS[2].definition);
  else if (!positions.includes(position)) {
    problems.push(`\`position:\` reads \`${position}\`, and the record's position is one of `
      + `${positions.map((x) => `\`${x}\``).join(" or ")} — a third value is a placement the article has no seat for`);
  }

  const elements = repeatedLines(body, "element");
  if (elements.length === 0) {
    problems.push("carries no `element:` line — a figure a reader can name nothing in is a figure "
      + "that showed them nothing, and that is the finding rather than a blank side");
  }

  // THE LINE SET IS CLOSED, exactly as the Step block's is: a name nobody
  // declared carries a judgment the Harness never reads, and admit-by-default is
  // how that arrives with no trace.
  const declared = new Set([...FIGURE_RECONSTRUCTIBLE_FIELDS.map((f) => f.name),
    ...FIGURE_NOT_RECONSTRUCTIBLE_FIELDS.map((f) => f.name)]);
  const refused = new Set(FIGURE_NOT_RECONSTRUCTIBLE_FIELDS.map((f) => f.name));
  for (const ln of body.split("\n")) {
    if (ln.trim() === "") continue;
    const m = /^([a-z_][a-z0-9_]*):/.exec(ln);
    if (!m) continue;
    if (refused.has(m[1])) {
      const why = FIGURE_NOT_RECONSTRUCTIBLE_FIELDS.find((f) => f.name === m[1]).why;
      problems.push(`carries \`${m[1]}:\`, which is declared not reconstructible — ${why}`);
    } else if (!declared.has(m[1])) {
      problems.push(`carries \`${m[1]}:\`, which is not a figure record field — a field in a figure's `
        + "Reverse Outline that the record does not declare needs its own ruling, so it is refused rather than read");
    }
  }

  if (problems.length) {
    fail(`the figure's Reverse Outline for ${step.step_id} (${file}) is not a block this Round Trip can read:\n  - `
      + problems.join("\n  - "));
  }

  return {
    step_id: step.step_id,
    element: elements.map((t) => ({ text: t })),
    caption,
    position,
  };
}

const RECONSTRUCTIBLE_NAMES = new Set(RECONSTRUCTIBLE_FIELDS.map((f) => f.name));

// The Reverse Outline's own claim lines, read with the Brief's grammar.
function outlineClaims(body) {
  return String(body).split("\n").filter((l) => l.startsWith("claim "));
}

function repeatedLines(body, field) {
  return [...String(body).matchAll(new RegExp(`^${field}:[ \\t]*(.*)$`, "gm"))].map((x) => x[1].trim());
}

// VALIDATED BY THE BRIEF PARSER, which is the acceptance rather than a way of
// meeting it: `parseStepBlock` is the function `parseBrief` calls per fenced
// block, so a Reverse Outline the Brief could not carry is refused by the same
// code that would refuse it inside a Brief.
//
// EVERY REFUSAL NAMES WHAT IT SAW. A Reverse Outline is the one artifact in
// this flow a person wrote by hand, so "invalid" without the field is a refusal
// that costs another read to act on.
function validateReverseOutline(text, step, file) {
  const parsed = parseStepBlock(text, file);
  if (parsed.refusal) fail(parsed.refusal);
  const outline = parsed.step;
  const body = outline.body;
  const problems = [];

  if (outline.step_id !== step.step_id) {
    problems.push(`its \`step_id\` is \`${outline.step_id}\` and this pass is reading ${step.step_id} — `
      + "a Reverse Outline is the reading of ONE passage and is filed against it");
  }

  for (const f of RECONSTRUCTIBLE_FIELDS) {
    if (f.kind === "line") {
      const v = stepField(body, f.name);
      if (v === null) problems.push(`carries no \`${f.name}:\` line — ${f.definition}`);
      else if (v === "") problems.push(`\`${f.name}:\` is blank — ${f.definition}`);
      continue;
    }
    if (f.kind === "claim-lines") {
      // AN EMPTY ANSWER IS AN ANSWER AND AN ABSENT ONE IS NOT — but a passage
      // that asserts nothing is not a passage, so `claims` is the one
      // reconstructible field with a floor. `introduces` is legitimately absent.
      if (outlineClaims(body).length === 0) {
        problems.push("carries no `claim ` line — every passage asserts something, and the claims are "
          + "what the Round Trip judges against what the Forward Artifact licenses");
      }
      continue;
    }
    if (f.kind === "repeated-line") {
      for (const [i, v] of repeatedLines(body, f.name).entries()) {
        if (v === "") problems.push(`\`${f.name}:\` entry ${i + 1} is blank — ${f.definition}`);
      }
      continue;
    }
  }

  // THE REVIEWER WRITES NO VERDICTS AND NO ADVICE, and a field they could not
  // have read is REFUSED rather than dropped: an ignored field still steered the
  // reading that produced the rest of the outline, so accepting it and
  // discarding the key would keep exactly the contamination the blind half
  // exists to prevent.
  for (const f of NOT_RECONSTRUCTIBLE_FIELDS) {
    if (stepField(body, f.name) !== null) {
      problems.push(`carries \`${f.name}:\`, which is declared NOT reconstructible — ${f.why}`);
    }
  }

  // The top-level line set is closed for the same reason the record's key set
  // was: a name nobody declared carries a judgment the Harness never reads, and
  // admit-by-default is how that arrives with no trace.
  const declared = new Set([...RECONSTRUCTIBLE_NAMES, ...NOT_RECONSTRUCTIBLE_FIELDS.map((f) => f.name), "step_id"]);
  for (const ln of body.split("\n")) {
    if (ln.startsWith("claim ") || ln.trim() === "") continue;
    const m = /^([a-z_][a-z0-9_]*):/.exec(ln);
    if (m && !declared.has(m[1])) {
      problems.push(`carries \`${m[1]}:\`, which is not a Brief Step field — a field in the Reverse Outline `
        + "that is not a Brief Step field needs its own ruling, so it is refused rather than read");
    }
  }

  if (problems.length) {
    fail(`the Reverse Outline for ${step.step_id} (${file}) is not a Brief Step block this Round Trip can read:\n  - `
      + problems.join("\n  - "));
  }

  // THE READING, UNDER THE BRIEF'S OWN NAMES. There is no translation left to
  // do: `field` in the Round Trip table names a Brief Step field, and this
  // returns that field. What used to sit here was a projection into a second
  // schema's key names, and the column that read it is gone with the schema.
  return {
    step_id: outline.step_id,
    purpose: stepField(body, "purpose"),
    reader_state_before: stepField(body, "reader_state_before"),
    reader_state_after: stepField(body, "reader_state_after"),
    claims: outlineClaims(body).map((l) => ({ text: l.replace(/^claim[ \t]+/, "").trim() })),
    introduces: repeatedLines(body, "introduces").map((t) => ({ text: t })),
  };
}

// The next Step with no outline yet, in the path's recorded order. `open`
// renders the first; `outline` renders the next, which is what makes the flow
// self-driving rather than a sequence a session has to remember.
function nextOutlineOwed(run) {
  return run.steps.find((s) => !run.outlineFields[s.step_id]);
}

// ---------------------------------------------------------------------------
// THE JAPANESE-DRAFT PRECONDITION (kogaki#1158, the Terminology List
// Decision, the versioning rule). A Japanese Draft — a Draft named
// `theses/<slug>/draft.ja.md`, on the reserved-name reconciliation
// src/draft.mjs `emit --lang ja` produces — must pass `node src/lint-ja.mjs
// lint` before ReviewDraft may run against it: Lint runs BEFORE the Round
// Trip, so a term-list deviation is caught by the cheap deterministic pass
// rather than spending a Round Trip judgment on it. Conformance is decided
// by the Lint against the CURRENT term list, never by what constrained
// generation (the versioning rule) — so this reads `terms_sha_at_lint`
// (never `terms_sha_at_generation`) against sha256(terms/prh.yml) as it
// stands NOW, and refuses naming BOTH hashes when they disagree or when the
// field is absent.
//
// READ AS A RAW LINE SCAN, before `readDraft` — the same convention
// `readDraft`'s own frontmatter reads use, and it runs first so a Draft
// that is ALSO short a trace or frontmatter is told about the term-list
// precondition rather than an unrelated refusal about the Draft's own well-formedness.
//
// SCOPED TO `.ja.md` ONLY: an English CanonicalDraft carries no
// `terms_sha_at_lint` field and none is owed — this precondition changes
// nothing about `theses/<slug>/draft.md`.
const TERMS_PATH = "terms/prh.yml";

function checkJaTermsFreshness(draftPath) {
  if (!draftPath.endsWith(".ja.md")) return;
  let text;
  try { text = readFileSync(draftPath, "utf8"); }
  catch { return; } // the ordinary "no Draft" refusal is readDraft's, next
  let currentSha;
  try { currentSha = sha256(readFileSync(TERMS_PATH, "utf8")); }
  catch (e) {
    fail(`the term list at ${TERMS_PATH} cannot be read (${e.message}) — a Japanese Draft's terms_sha_at_lint cannot be checked for staleness without it`);
  }
  const m = text.match(/^terms_sha_at_lint:\s*(\S+)\s*$/m);
  const recorded = m ? m[1] : "(absent)";
  if (!m || m[1] !== currentSha) {
    fail(`${draftPath} refuses to start: terms_sha_at_lint is ${recorded} and the current term list's hash is ${currentSha} (${TERMS_PATH}) — `
      + `Lint runs before the Round Trip on a Japanese Draft (the Terminology List Decision), so run \`node src/lint-ja.mjs lint --draft ${draftPath}\` first. `
      + `A term-list change is a correction, never a whole-Draft re-derivation: only the Steps Lint names are corrected, and ReviewDraft is re-entered from there`);
  }
}

// ---------------------------------------------------------------------------
// The commands.

function cmdOpen(args) {
  const draftPath = argString(args, "draft", "usage: review-draft open --draft <draft.md>");
  checkJaTermsFreshness(draftPath);
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
    // THE PASS THE RUN IS ON, AND THE LEDGER OF WHAT EACH PASS WROTE
    // (kogaki#994). `pass_files` maps a workspace-relative path to the pass
    // that wrote it, and `passPath` refuses a write that would land on another
    // pass's file. The split by directory already makes the collision
    // impossible; the ledger is what makes it REFUSED rather than merely
    // unreachable, so a later site composing a path by hand cannot reintroduce
    // the overwrite silently.
    pass: 1,
    pass_files: {},
    rendered: {},
    outlineFields: {},
    correction_inputs: {},
    findings: [],
    corrections: [],
    residue: [],
    compared_at: null,
    checked_at: null,
    closed_at: null,
  };

  const first = steps[0];
  const input = renderReverseOutlineInput(ws, run, draft, first, steps);
  run.rendered[first.step_id] = input;
  writeRun(ws, run);

  process.stdout.write(
    `ReviewDraft opened: ${slug}\n`
    + `  draft     ${resolve(draftPath)} (body sha ${draft.body_sha.slice(0, 16)})\n`
    + `  steps     ${steps.length} — ${steps.map((s) => s.step_id).join(", ")}\n`
    + `  sections  ${sections.length} — ${sections.map((s) => `${s.index}. ${s.title ?? "(untitled)"}`).join(" | ")}\n`
    + `  packets   ${steps.length} verified against the trace's shas\n`
    + `  workspace ${ws}\n`
    + `\nfirst Reverse Outline input: ${input}\n`);
}

function cmdOutline(args) {
  const usage = "usage: <reverse outline> | review-draft outline --draft <draft.md> --step <id>";
  const draftPath = argString(args, "draft", usage);
  const stepId = argString(args, "step", usage);
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);

  const known = run.steps.map((s) => s.step_id);
  if (!known.includes(stepId)) {
    fail(`unknown step \`${stepId}\` — this Draft's Steps are ${known.join(", ")}`);
  }
  // THE RENDERED-INPUT GUARD IS WHAT MAKES REVERSE OUTLINING BLIND. A record handed
  // back for a Step whose input was never rendered was written against
  // something else — the Packet, the Brief, or the reviewer's memory of the
  // article — and there is no way to tell which afterwards. So the refusal is
  // here, at the only moment the distinction is still observable.
  if (!run.rendered[stepId]) {
    fail(`step ${stepId} has no rendered Reverse Outline input, so this record was not written against one.\n`
      + "The Harness renders inputs in the path's recorded order — `open` renders the first and each "
      + `\`outline\` renders the next. The Step now owed is ${nextOutlineOwed(run)?.step_id ?? "(none)"}.`);
  }
  // READ AFTER THE GUARDS, not before them. The reply arrives on standard input
  // and the refusals above are about the Step rather than about the reading, so
  // consuming the stream first would make an unknown Step's refusal depend on a
  // reply nobody needed to write.
  //
  // VALIDATED BEFORE IT IS RECORDED (kogaki#871). A record written to the
  // workspace and validated later would leave `compare` to discover the defect,
  // by which point the reviewer who could fix it has finished reading.
  const content = requireReply(usage);
  // THE STEP COMES FROM THE DRAFT, NOT FROM THE RUN RECORD (kogaki#880). The
  // run record carries the Step's identity and its ranges; whether the Step has
  // a figure — and where its block sits — is resolved from the trace, which is
  // the same read the Reverse Outline input was rendered from. Validating against the
  // run record's copy would let the conditional eighth field be owed at render
  // and unowed at validation, which is the two-answers-to-one-question pattern
  // this Harness refuses everywhere else.
  const { steps } = resolveInputs(draft);
  const step = steps.find((x) => x.step_id === stepId);
  const projected = validateReverseOutline(content, step, STDIN_LABEL);

  // THE FIGURE'S HALF, VALIDATED IN THE SAME ACT (kogaki#1018). Owed where the
  // trace says the reader met a block, and REFUSED where it says they did not —
  // the two refusals are the figure's counterpart of the Step block's own, and
  // they are here rather than at `compare` for the reason the Step's are: the
  // reviewer who could fix it has finished reading by then.
  let figureProjected = null;
  const hasFigureBlock = /^```figure\n/m.test(content);
  if (step.figure) {
    figureProjected = validateFigureOutline(content, step, STDIN_LABEL);
  } else if (hasFigureBlock) {
    fail(`the Reverse Outline for ${stepId} (${STDIN_LABEL}) carries a fenced \`figure\` block, and this Step `
      + "renders no figure. A reading of a block the reader never met is an invention, and the "
      + "comparison downstream would treat it as evidence, so it is refused rather than dropped.");
  }

  // BOTH ARE KEPT, AND THE OUTLINE IS THE EVIDENCE. The `.md` is the Reverse
  // Outline exactly as it was written — the artifact a later reader checks the
  // Round Trip against — and the `.json` is the reading the Harness compares,
  // under the Brief's own field names. Writing only the second would leave the
  // run's own record unable to show what the Blind Reader actually said.
  const outlinePath = passPath(ws, run, "outline", `${stepId}.md`);
  writeFileSync(outlinePath, content.endsWith("\n") ? content : content + "\n");
  const out = passPath(ws, run, "outline", `${stepId}.json`);
  writeFileSync(out, JSON.stringify(projected, null, 2) + "\n");
  run.outlineFields[stepId] = out;
  run.outlines = run.outlines || {};
  run.outlines[stepId] = outlinePath;

  // THE FIGURE'S READING IS ITS OWN FILE, for the reason it is its own fence:
  // it is written in the FIGURE RECORD's field names, and the Step's reading is
  // written in the BRIEF's. One file per vocabulary is what keeps either from
  // acquiring a key belonging to the other.
  run.figureOutlineFields = run.figureOutlineFields || {};
  if (figureProjected) {
    const fout = passPath(ws, run, "outline", `${stepId}.figure.json`);
    writeFileSync(fout, JSON.stringify(figureProjected, null, 2) + "\n");
    run.figureOutlineFields[stepId] = fout;
  }

  const next = nextOutlineOwed(run);
  let nextInput = null;
  if (next) {
    const full = steps.find((s) => s.step_id === next.step_id);
    nextInput = renderReverseOutlineInput(ws, run, draft, full, steps);
    run.rendered[next.step_id] = nextInput;
  }
  writeRun(ws, run);

  process.stdout.write(`recorded: ${stepId} -> ${out}\n`);
  if (nextInput) process.stdout.write(`next Reverse Outline input: ${nextInput}\n`);
  else process.stdout.write("every Step is outlined. `compare --draft <draft.md>` is the join.\n");
}

// What `compare` is missing, computed once and rendered as the refusal's whole
// content: a reviewer told "something is missing" has to go looking, and the
// looking is the part the Harness can do.
//
// THE STEP OUTLINES ARE THE WHOLE OF WHAT IT CAN BE MISSING (kogaki#1133). The
// Section ledger and the cold reader's final claim were two further kinds of
// missing until that issue removed the reader that wrote them. The return stays
// a record rather than becoming a bare array, because a caller reading `.steps`
// says what it is asking about.
function missingFor(run) {
  const steps = run.steps.map((s) => s.step_id).filter((id) => !run.outlineFields[id]);
  return { steps };
}

// ---------------------------------------------------------------------------
// THE COMPARISON (kogaki#872). The join between what a Packet DECLARED and what
// the Blind Reader read out of the prose it produced.
//
// THE ITEM TABLE IS FIXED IN THE HARNESS AND READ FROM `src/review-items.json`
// — which item classes exist, which are preserved and which are best-effort,
// which are decided mechanically and which are put to a model. The runtime does
// not restate it, the same arrangement `src/packet-template.md` has with
// `src/draft.mjs`: amending the table is one edit.
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
// `claims`, `purpose` and `reader_state_after` are each a Packet label AND an
// item id AND (for two of them) a Reverse Outline field, and a runtime
// spelling them out cannot be told apart from one restating the table or the
// schema.
const PACKET_READERS = {
  // THE CLAIMS ARE A BLOCK BELOW THEIR BULLET, NOT THE BULLET'S VALUE (PR #895
  // round 1, finding 2). The template's `- **claims.** ...` line is fixed
  // INSTRUCTION prose — "These are what this Step may assert" — and the rendered
  // value, `(none recorded)` included, goes into the separate block under it. A
  // reader testing the bullet's text for a stated absence could never match, so
  // a Step whose Brief declares no claims refused the WHOLE run as a false
  // Packet gap and sent the reviewer to file against a template that was not
  // broken. The bullet locates the region; the region carries the value.
  claim_lines: (t, spec) => {
    const lines = t.split("\n");
    const at = lines.findIndex((l) => new RegExp(`^- \\*\\*${spec.bullet_label}\\.\\*\\*`).test(l));
    if (at === -1) return null;
    let end = lines.length;
    for (let i = at + 1; i < lines.length; i++) { if (/^#+\s+\S/.test(lines[i])) { end = i; break; } }
    const region = lines.slice(at + 1, end);
    const re = new RegExp(`^${spec.prefix}\\s`);
    const g = region.filter((l) => re.test(l)).map((l) => l.trim());
    if (g.length) return g;
    // A stated absence in the region is an ANSWER — this Step declares none. It
    // is only a hole when the bullet, and so the region, is absent altogether.
    if (region.some((l) => PACKET_ABSENCE.test(l.trim()))) return [];
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

// ONE BLOCK, OUT OF ONE PACKET, refusing BY NAME on a block the Packet does not
// carry. Every item reads its declared side through here, so a Packet gap is one
// refusal with one wording however it was reached, and a second reader cannot
// grow beside this one and disagree with it about what the Packet's layout is.
function readPacketBlock(text, name, items, step, wantedBy) {
  const spec = (items.packet_blocks || {})[name];
  const reader = spec && PACKET_READERS[spec.kind];
  if (!reader) {
    fail(`the item table names the Packet block \`${name}\`, which this Harness has no reader for `
      + "— the table and the runtime disagree about the Packet's layout, and a comparison run "
      + "against a block nobody reads would report agreement it never checked");
  }
  const v = reader(text, spec);
  if (v === null) {
    fail(`step ${step.step_id}: its Packet carries no \`${name}\` block, which the item(s) `
      + `${wantedBy.join(", ")} compare against.\n  packet  ${step.packet_path}\n`
      + "A block the comparison needs and the Packet does not carry is a PACKET GAP: file it "
      + "against src/packet-template.md. It is never satisfied by reading the Brief, the Move "
      + "or the Strand — the owner's 2026-09-04 ruling is that a need for those is evidence "
      + "the Packet is missing information.");
  }
  return v;
}

// The declared side for one Step, read once and refusing BY NAME on the first
// block an item needs and the Packet does not carry.
function declaredFor(step, items) {
  const text = readFileSync(step.packet_path, "utf8");
  const need = new Set();
  for (const it of items.items) {
    // A ROW THIS STEP DOES NOT RUN ASKS FOR NO BLOCK (kogaki#880). Collecting a
    // figure row's Packet blocks on a figureless Step would refuse that Step as
    // a Packet gap for a block no item on it ever reads — a refusal naming a
    // repair nobody owes.
    if (it.figure_only && !step.figure) continue;
    if (it.declared_block) need.add(it.declared_block);
    for (const b of it.also_declared_blocks || []) need.add(b);
  }
  const out = {};
  for (const name of need) {
    const wanted = items.items.filter((i) => i.declared_block === name
      || (i.also_declared_blocks || []).includes(name)).map((i) => i.id);
    out[name] = readPacketBlock(text, name, items, step, wanted);
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
// import forms, and a stopword list is not an import. THE FORM IS NOT SPELLED
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

// THE CLAIM MATCHER IS GONE, AND ITS ABSENCE IS THE RULING (owner 2026-09-17;
// kogaki#1132). `pairClaims` assigned each outlined claim to the declared claim
// it shared the most content words with, above a containment floor, and both
// rows that read the assignment have left the table. Whether a reader recovered
// a declared claim is the Judge's answer in words: a faithful realization can
// share no vocabulary at all with the line it realizes, and a shared-word count
// cannot tell that from a loss. `contentWords` stays — the figure's
// element-to-claim row is containment against a claim ADDRESS the record names,
// which is a different question and still the Harness's.

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

// ONE IMPLEMENTATION PER MECHANICAL ITEM, keyed by the item's own id. Each
// returns `{verdict, reason, span}` and never a score. The ids here are
// BINDINGS to the table's `mode: mechanical` rows — a table row whose id has no
// implementation is refused below rather than silently skipped, which is the
// half that keeps the two from drifting apart.
const MECHANICAL = {
  // THE HYGIENE ITEMS ARE GONE, AND THEIR ABSENCE IS A RULING RATHER THAN A
  // TRIM (owner 2026-09-09; kogaki#1013 item 3). `term-before-introduction`,
  // `restates-earlier-step` and `packet-wording` each asked whether the prose
  // betrayed the material it was produced from. Prose hygiene is not part of
  // Reverse Outlining: a reader cannot infer the source a structure was
  // produced from, and being able to would be abnormal. Whether any of them
  // survives as a realization-time lint in `draft` is a separate question for
  // the owner, not this rebuild. Their rows left `src/review-items.json` in the
  // same act, and the binding check below is what makes a row with no
  // implementation refuse rather than silently skip — so the two cannot drift.

  // AND `claims-unused` LEFT WITH THE MATCHER IT READ (kogaki#1132). It was the
  // best-effort row reporting a declared claim no outlined claim matched, and it
  // held on every Step of the first full run while the preserved row failed on
  // every Step: the item with a consequence detected surplus, and the item that
  // detected a lost claim had none. Both halves are now the one preserved
  // `claims` row, asked once per DECLARED claim, so a lost claim is named to the
  // correction with its own text instead of being reported beside it.
  //
  // THE MAP IS EMPTY AT THIS HEAD AND THE KEY STAYS. A prose Step's rows are
  // all judged now; the figure's element-to-claim row is mechanical and lives
  // in `MECHANICAL_FIGURE`. The dispatch below reads both, and a table row with
  // no implementation still refuses by name rather than silently skipping.
};

// ---------------------------------------------------------------------------
// Rendering one join Packet, and recording the verdict that comes back.

// ---------------------------------------------------------------------------
// THE FIGURE'S DECLARED SIDE (kogaki#880). Read from the validated record the
// trace pins, never from the Packet: the record IS the declaration for a figure
// — the Brief bound each role to a claim and the record worded it — and the
// Packet carries no figure block at all (the figure record keeps the figure input behind
// its own marker, outside the Packet the reviewer's items read).
//
// A ROW NAMING BOTH SIDES IS REFUSED. Two declared carriers on one row is two
// questions, and this table holds one per row; a runtime that picked one
// silently would make which carrier answered a fact about the reading order.
function figureDeclared(step, item) {
  if (item.declared_block && item.record_field) {
    fail(`the item table declares \`${item.id}\` with both a Packet block and a figure record `
      + "field. One row asks one question of one declared side; a row with two would be answered "
      + "against whichever the runtime happened to read first");
  }
  const rec = step.figure.record_json;
  const v = rec[item.record_field];
  if (v === undefined) {
    fail(`step ${step.step_id}: item \`${item.id}\` reads the figure record's `
      + `\`${item.record_field}\`, and the record at ${step.figure.record_path} carries no such `
      + "field. The record was validated against src/figure-schema.json when it was written, so a "
      + "field absent now means the schema and the item table disagree about the record's field list");
  }
  return v;
}

// The record's elements as a reader-facing list: the role and the wording, and
// NEVER the claim address. The claim is what the element is judged against
// and appears on its own side of the mechanical check below; rendering it here
// would put the answer into the question.
function renderElements(elements) {
  return Object.entries(elements)
    .map(([role, el]) => `- **${role}.** ${el && el.text}`).join("\n");
}

// The one figure row the Harness decides alone. EVERY ELEMENT'S TEXT IS
// ENTAILED BY ITS BOUND CLAIM, and the instrument is containment against the
// claim the record's address POINTS AT — the same containment `claims` uses
// on the prose side, with its own declared floor, so the two halves of the
// round trip measure entailment the same way.
//
// THE BINDING ITSELF IS NOT WHAT THIS CHECKS, and saying so is the point.
// The figure record already refuses a record that moves a role to a claim the Brief did
// not bind it to, at the act that validates the record — so re-deciding it here
// would be a second validator agreeing with the first until one is edited. What
// no act before this one can ask is whether the WORDING the element finally got
// is carried by the material it was licensed from, because the wording is
// written after the prose and judged against nothing until the round trip.
//
// STRING CONTAINMENT FIRST, JUDGED SECOND. What is mechanical here is the
// verdict: containment above the floor holds, below it fails, and no model is
// asked either way — which is what the mode declares and what makes a
// mechanical fail cheap enough to run on every Step of every pass. The judgment
// comes second and elsewhere: a fail on this preserved row is what sends the
// Step to `correct --figure`, where a reader is shown the element beside the
// claim it was worded from.
//
// THE ADDRESS IS `g<n>` OVER THE STEP'S OWN CLAIMS, 1-based, which is the
// figure decision's
// grammar. An address outside the Step's claim count is refused by name rather
// than scored against whatever happens to sit at that index — the figure
// decision's own
// grammar refuses one at composition, so a record carrying one now was written
// against a Brief this Draft was not emitted from.
function claimAt(address, claims) {
  const m = /^g(\d+)$/.exec(String(address ?? ""));
  if (!m) return { error: `is bound to ${renderSide(address ?? null)}, which is not a claim `
    + "address — a role binds to `g<n>` over the Step's own claims" };
  const i = Number(m[1]);
  if (i < 1 || i > claims.length) {
    return { error: `is bound to ${address} and this Step declares `
      + `${claims.length} claim${claims.length === 1 ? "" : "s"} — the address points past them` };
  }
  return { claim: claims[i - 1] };
}

const MECHANICAL_FIGURE = {
  "figure-element-claim": ({ step, declared, items, item }) => {
    const floor = items.thresholds.figure_element_claim_containment;
    if (typeof floor !== "number") {
      fail("the item table declares no `thresholds.figure_element_claim_containment`, and the "
        + "element-to-claim check is containment against a floor. With none every element would "
        + "pass, which is the silent `holds` this comparison exists to refuse");
    }
    const claims = declared.claims || [];
    const elements = figureDeclared(step, item);
    for (const [role, el] of Object.entries(elements)) {
      const r = claimAt(el && el.claim, claims);
      if (r.error) {
        return {
          verdict: "fails",
          reason: "an element's claim address does not resolve against this Step's claims",
          evidence: [`${role} ${r.error}`],
          span: step.figure.lines,
        };
      }
      const cw = contentWords(el && el.text);
      const gs = new Set(contentWords(r.claim));
      const share = cw.length ? cw.filter((w) => gs.has(w)).length / cw.length : 0;
      if (share < floor) {
        return {
          verdict: "fails",
          reason: "an element is worded in terms its bound claim does not carry",
          evidence: [`${role} — ${renderSide(el && el.text)}`, `its claim — ${r.claim}`],
          span: step.figure.lines,
        };
      }
    }
    return {
      verdict: "holds",
      reason: "every element is worded in the terms of the claim it is bound to",
      span: step.figure.lines,
    };
  },
};

// THE PASS IS THE CALLER'S, NOT THE RUN RECORD'S (PR #1004 round 1, finding 1).
// `compare` IS pass one whatever pass the run has since reached — the record it
// writes is named `pass-1/join.json` for exactly that reason — so the pair
// inputs that record indexes must land beside it. Reading the pass off the run
// record here put a `compare` run made after `check` into `pass-2/join/`, over
// the inputs pass two was judging, and the ledger could not refuse it because
// the writing pass read as the owning one.
function renderJoinPacket(ws, run, pass, draft, step, item, pair, declaredText, outlineText) {
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
    reverse: outlineText,
    span: `${step.lines[0]}–${step.lines[1]}`,
    // THE JUDGING READER IS TOLD WHICH CARRIER DECLARED THE LINE. It is not the
    // blind reader — it sees both sides by design — and a figure record's line
    // rendered under a heading saying `Packet` would name the wrong artifact in
    // every finding a reader of the join record goes on to repair.
    declared_source: item.declared_source ?? "Packet",
    quoted: quotedPassage(step),
    question: item.question,
    record_command: `<verdicts.json> | node src/review-draft.mjs compare --draft ${relative(process.cwd(), draft.path) || draft.path}`,
  };
  for (const [k, v] of Object.entries(fields)) out = out.split(`{{${k}}}`).join(v);
  const left = out.match(/\{\{(\w+)\}\}/);
  if (left) {
    fail(`the join template's slot {{${left[1]}}} was not filled — the renderer and the template `
      + "disagree about the slot set, which is the round trip failing silently");
  }
  const name = pair === null ? `${step.step_id}.${item.id}.md` : `${step.step_id}.${item.id}.${pair}.md`;
  const dest = passPathAt(ws, run, pass, "join", name);
  writeFileSync(dest, out.endsWith("\n") ? out : out + "\n");
  return dest;
}

const verdictKey = (step_id, item, pair) => (pair === null || pair === undefined
  ? `${step_id}/${item}` : `${step_id}/${item}#${pair}`);

// WHAT JUDGED THIS PASS, READ BACK FROM THE RECORDED VERDICTS (kogaki#997).
// ReviewDraft pins a different model per role, and the Harness invokes none of
// them, so this line is a RENDERING OF A DECLARATION and says so — the same
// form terrain took for its judge pin, where naming it as an observation
// claimed a check nobody performed.
//
// SEVERAL IDS RENDER AS SEVERAL, never as one summary. A pass whose pair
// judgments ran on the pinned Haiku and whose corrections ran on the
// stronger model is the intended split; a pass showing a THIRD id, or the
// interactive default, is a pin that slipped, and that is exactly the reading
// this line exists to make possible.
const judgedByLine = (...callSets) => {
  const ids = [...new Set(callSets.flat().map((c) => c && c.model).filter(Boolean))].sort();
  return ids.length
    ? `judged by DECLARED model(s) — ${ids.join(", ")}; the Harness invoked no model and verified none.\n`
    : "";
};

// THE VERDICT FILE IS VALIDATED AGAINST WHAT THE RUN ACTUALLY OWES, and every
// refusal names what it saw. Three refusals matter and each is its own mistake:
// a pair nobody was asked about, a token outside the closed three, and a reason
// carrying a digit.
//
// A DIGIT IN THE REASON IS REFUSED, which is the one rule here that looks like
// fussiness and is not. The item table holds no severity and the verdict set has
// no order; a number in the sentence is where a score comes back in — "three of
// five claims", "eighty percent" — and once one is written a later reader
// compares them. Line numbers are the Harness's and are already rendered in the
// span; every other number in a review is a score by another name.
// THE VERDICTS ARRIVE AS TEXT, not as a path (kogaki#1100). The caller has
// already taken the reply off standard input, so this validates what it was
// handed and names the stream in every refusal.
function recordVerdicts(run, text, owed, items) {
  let doc;
  try { doc = JSON.parse(text); }
  catch (e) {
    fail(`the verdicts on ${STDIN_LABEL} are not readable JSON (${e.message}) — a verdicts reply is `
      + `one JSON object carrying \`verdicts\`: [{step_id, item, pair?, verdict, reason, model}]`);
  }
  const list = doc && !Array.isArray(doc) && Array.isArray(doc.verdicts) ? doc.verdicts : null;
  if (!list) {
    fail(`the reply on ${STDIN_LABEL} carries no \`verdicts\` array — it is one JSON object of the form `
      + `{"verdicts": [{"step_id": ..., "item": ..., "verdict": ..., "reason": ..., "model": ...}]}`);
  }
  // A PAIR ALREADY ANSWERED IS STILL ANSWERABLE (PR #895 round 1, finding 5).
  // `owed` shrinks as verdicts land, so validating against it alone refused a
  // re-submitted file — and a reviewer correcting an answer they got wrong met
  // "which this run did not ask about", which is false: the run did ask, and was
  // answered. A revision overwrites; only a pair the run never asked about, and
  // a mechanical item, are refused.
  const askable = new Map(owed.map((o) => [o.key, o]));
  for (const k of Object.keys(run.verdicts || {})) if (!askable.has(k)) askable.set(k, { key: k });
  const owedBy = askable;
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
          + `${owed.length ? owed.map((o) => o.key).join(", ") : "(none)"}`
          + `${Object.keys(run.verdicts || {}).length
            ? `, and the pairs it has already answered, which a revision may overwrite, are `
              + `${Object.keys(run.verdicts).join(", ")}` : ""}`);
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
    // THE MODEL THAT PRODUCED THE VERDICT IS PART OF THE VERDICT (kogaki#997).
    // ReviewDraft pins a different model per role — a pair judgment is one
    // fixed question with a three-token answer, the outlines and the
    // corrections write evidence and prose —
    // and a record that does not say which one answered cannot be read back to
    // check that the pin held. The 2026-09-07 run is the case: a hundred and
    // more model calls, and nothing in `join.json` says what ran any of them.
    if (typeof v.model !== "string" || v.model.trim() === "") {
      problems.push(`${at} carries no \`model\` — the id of the model that produced this verdict, `
        + "as passed to `--model` at the spawn. It is a DECLARATION: the Harness invokes no judge and "
        + "verifies nothing about it, which is exactly why it must be written down rather than inferred");
      return;
    }
    if (/\s/.test(v.model.trim())) {
      problems.push(`${at}'s \`model\` carries whitespace — it is one model id, the value \`--model\` `
        + `took, and \`${v.model.trim()}\` is not one`);
      return;
    }
    accepted.push({ key, step_id: v.step_id, item: v.item, pair: v.pair === undefined ? null : v.pair,
      verdict: v.verdict, reason: v.reason.trim(), model: v.model.trim() });
  });
  if (problems.length) {
    fail(`the verdicts on ${STDIN_LABEL} were not recorded:\n  - ${problems.join("\n  - ")}`);
  }
  run.verdicts = run.verdicts || {};
  for (const a of accepted) run.verdicts[a.key] = a;
  return accepted.length;
}

// ---------------------------------------------------------------------------
// The join itself.

// The declared and reverse sides as the judging model reads them. An array
// renders as a list, an object as its own labelled lines, and a NULL outlined
// field means the reverse side IS THE PROSE — the negative items, which ask
// whether something is absent from the passage rather than whether two lines
// agree.
// A REVERSE SIDE IS ONE BRIEF STEP FIELD, AND THE PATH IS FLAT (kogaki#1014).
// The dotted one-level reach this function used to allow existed for
// `figure_reading`, the deleted record's one object field; a Brief Step field
// is a line, so there is nothing left to reach into. A dotted path is refused
// by name rather than resolved to `undefined`, which is how a table naming a
// field nobody computes would otherwise read as a side that simply was not
// outlined.
function outlineField(rec, path) {
  if (String(path).includes(".")) {
    fail(`the item table names the reverse field \`${path}\`, and a reverse side is ONE `
      + "Brief Step field, which is a line rather than an object. A dotted path would be a query "
      + "over a second schema beside the Brief's, which is what src/review-items.json's own note "
      + "records as declined");
  }
  return rec[path];
}

// The REVERSE side of one judged row, rendered. A row names its side on exactly
// one of two artifacts — `field` reads the passage's Reverse Outline in the
// Brief's names, `figure_field` reads the figure's in the RECORD's names — and a
// row naming neither is asking whether something is ABSENT from the prose, whose
// side is the prose itself.
//
// A ROW NAMING BOTH IS REFUSED. The two readings are separate artifacts written
// in separate vocabularies, and a row reading one line out of each would be the
// translation column kogaki#1014 deleted, arriving back as a pair of keys.
function reverseSide(item, rec, figRec) {
  if (item.field && item.figure_field) {
    fail(`the item table declares \`${item.id}\` with both \`field\` and \`figure_field\` — a row reads `
      + "ONE reading, and a row spanning both would be a translation between the Brief's field names "
      + "and the figure record's");
  }
  if (item.figure_field) {
    if (!figRec) {
      fail(`the item table declares \`${item.id}\` against the figure's reading, and this Step has none `
        + "— a figure row is evaluated only on a Step whose trace carries a figure");
    }
    return renderSide(outlineField(figRec, item.figure_field));
  }
  if (item.field) return renderSide(outlineField(rec, item.field));
  return "(the passage itself, quoted below — this item asks whether something is ABSENT from it)";
}

// The declared side of one judged row, rendered. THREE CARRIERS, and the row
// says which — the Packet block, the figure record's field, or the passage
// itself. `elements` is rendered by its own function because a bare object
// dump would carry each element's claim address into the question, and the
// claim is what the mechanical row already answers.
function declaredSide(step, item, declared, items) {
  if (item.record_field) {
    const v = figureDeclared(step, item);
    if (item.record_field === "elements") return renderElements(v);
    const also = (item.also_declared_blocks || [])
      .map((b) => `- **the Step's ${b}.** ${renderSide(declared[b])}`);
    return also.length
      ? [`- **the record's ${item.record_field}.** ${renderSide(v)}`, ...also].join("\n")
      : renderSide(v);
  }
  if (item.declared_block) return renderSide(declared[item.declared_block]);
  if (item.declared_source === "passage") {
    return "(the passage and the figure beside it, quoted below — both sides of this pair were "
      + "read from them)";
  }
  return renderSide(null);
}

// AN ENTRY OF A REVERSE OUTLINE LIST IS AN OBJECT CARRYING ITS OWN WORDS.
// `claims`, `introduces` and `concession` each read back as `{ text }` — the
// Brief's own line, verbatim. There is no span: a span was the outlined
// record's coordinate, and a Brief Step field does not carry one, so an entry
// renders as what it says. `renderEntry` below still honours a `text`/`span`
// pair where one exists, because the figure half still writes them.
const ENTRY_KEY_PAIRS = [["text", "span"], ["claim", "span"], ["of", "span"]];
function entryKeyPairs() { return ENTRY_KEY_PAIRS; }

// ONE ENTRY OF A RENDERED LIST (kogaki#995). Interpolating the entry directly
// put `[object Object]` in front of the judging model, which answered
// `cannot-decide` — correctly, since it was shown nothing — and the run recorded
// that as a judgment about the article rather than as a defect in the tool. An
// entry renders as its own words AND the draft lines it was read from,
// because the span is the coordinate every other side of the join already cites.
function renderEntry(x) {
  if (x === null || x === undefined) return "(none)";
  if (typeof x !== "object") return String(x);
  for (const [textKey, spanKey] of entryKeyPairs()) {
    const span = x[spanKey];
    if (typeof x[textKey] !== "string") continue;
    if (Array.isArray(span) && span.length === 2) {
      return `${x[textKey]} (lines ${span[0]}\u2013${span[1]})`;
    }
    // NO SPAN IS THE ORDINARY CASE NOW (kogaki#1014). A Reverse Outline is a
    // Brief Step block and a Brief field carries no draft coordinate, so the
    // entry renders as its own words rather than falling through to the
    // key-by-key dump, which is what put `[object Object]` noise in
    // front of the judging model before.
    return x[textKey];
  }
  // A form the schema does not declare still reads as its own keys and values.
  // Falling back to the stringification is what produced the defect above.
  return Object.entries(x).map(([k, v]) => `**${k}.** ${v}`).join("; ");
}

function renderSide(v) {
  if (v === null || v === undefined) return "(none)";
  if (Array.isArray(v)) {
    return v.length ? v.map((x) => `- ${renderEntry(x)}`).join("\n") : "(none)";
  }
  if (typeof v === "object") return Object.entries(v).map(([k, x]) => `- **${k}.** ${x}`).join("\n");
  return String(v);
}

// EVERY (Step, item) PAIR, computed fresh. Mechanical items are decided here;
// judged items are rendered as join Packets and answered from the run record.
// Nothing is cached across a call, because a recorded verdict is exactly what
// changes the answer.
// `opts.bound` and `opts.carry` ARE THE SECOND PASS'S WHOLE MECHANISM
// (kogaki#874). With no bound this is pass one, unchanged: every pair is
// computed. With one, a pair outside it is CARRIED from the record `opts.carry`
// holds and is neither rendered as a join Packet nor logged — which is what
// makes the bound checkable in `check.json` rather than merely stated, since a
// filter applied after the log was written would count work it did not do.
// `opts.pass` is REQUIRED and is the pass the CALLING COMMAND is — `compare`
// passes 1 and `check` passes 2. It is not defaulted: a default here would be a
// second answer to the question the caller already answers, and the wrong one is
// exactly the defect this parameter exists to close.
function buildJoin(draft, run, items, ws, opts = {}) {
  const pass = requirePass(opts.pass, "buildJoin");
  const { steps } = resolveInputs(draft);
  const bound = typeof opts.bound === "function" ? opts.bound : null;
  const carry = opts.carry || [];
  const results = [];
  const owed = [];
  const modelCalls = [];
  const mechanicalLog = [];
  const verdicts = run.verdicts || {};

  steps.forEach((step, si) => {
    const declared = declaredFor(step, items);
    let rec;
    try { rec = JSON.parse(readFileSync(run.outlineFields[step.step_id], "utf8")); }
    catch (e) { fail(`the Reverse Outline for ${step.step_id} is not readable (${e.message})`); }
    // THE FIGURE'S READING, WHERE THE READER MET ONE. Absent on a figureless
    // Step, and the figure rows are not evaluated there at all — never as a
    // vacuous `holds`, which would put a figure line in a figureless Draft's log.
    let figRec = null;
    if (step.figure) {
      const fp = (run.figureOutlineFields || {})[step.step_id];
      if (!fp || !existsSync(fp)) {
        fail(`step ${step.step_id} renders a figure and its Reverse Outline carries no reading of it — `
          + "re-file the Step's outline with its `figure` block, which `outline` validates and records "
          + "in the same act");
      }
      try { figRec = JSON.parse(readFileSync(fp, "utf8")); }
      catch (e) { fail(`the figure's Reverse Outline for ${step.step_id} is not readable (${e.message})`); }
    }
    const earlier = steps.slice(0, si);

    for (const item of items.items) {
      // A FIGURE ROW ON A FIGURELESS STEP IS NOT EVALUATED, NOT RENDERED AND
      // NOT LOGGED (kogaki#880), and the skip is FIRST — before the bound, so
      // pass two neither carries it nor demands a pass-one answer for it. A
      // vacuous `holds` would be the cheaper implementation and the wrong one:
      // it puts an answer about nothing beside answers about something, and it
      // makes the mechanical arm of the second pass's bound report coverage of
      // Steps that have no figure to cover.
      if (item.figure_only && !step.figure) continue;
      // OUT OF BOUND: CARRIED, AND THE CHECK IS FIRST. Placed before the
      // mechanical dispatch and before any join Packet is rendered, so an
      // out-of-bound pair costs no model call and appears in neither log. A
      // carried row keeps pass one's verdict, class, reason and span and is
      // marked `carried` — a reader of the pass-two record can tell a re-judged
      // answer from a preserved one, which an unmarked copy would not allow.
      if (bound && !bound(step.step_id, item.id)) {
        const prev = carry.find((r) => r.step_id === step.step_id && r.item === item.id);
        if (!prev) {
          fail(`the bounded second pass carries ${step.step_id}/${item.id} from pass one and pass `
            + "one recorded no answer for it. A carried pair with nothing to carry would render as "
            + "a verdict this run never reached; re-run `compare --draft <draft.md>` so the pair is "
            + "answered before it is carried.");
        }
        // THE SPAN IS RE-ANCHORED TO THE STEP'S CURRENT RANGE (PR #906 round 1,
        // finding 2). A carried row keeps pass one's verdict, class and reason
        // — those are readings of prose that has not moved — but NOT its
        // coordinates: a correction changes the Draft's line count, so a
        // pre-correction range rendered under the post-correction body sha
        // names whatever now sits at those numbers. That is the drifting-range
        // defect this Harness's own outline cases are built to catch, one
        // layer out. A step-level range is coarser than the pair-level one it
        // replaces and it is TRUE, which is the trade: a true coarse
        // coordinate beats a false precise one. Pass one's own is kept beside
        // it, named as pass one's, so nothing is lost — only re-labelled.
        const reanchored = { ...prev, span: step.lines, pass_one_span: prev.span, carried: true };
        if (Array.isArray(prev.pairs)) {
          reanchored.pairs = prev.pairs.map((x) => ({ ...x, span: step.lines, pass_one_span: x.span }));
        }
        results.push(reanchored);
        continue;
      }
      const ctx = { declared, rec, step, draft, earlier, items, item };

      if (item.mode === "mechanical") {
        const impl = MECHANICAL[item.id] || MECHANICAL_FIGURE[item.id];
        if (!impl) {
          fail(`the item table declares \`${item.id}\` mechanical and this Harness has no `
            + "implementation for it — a mechanical item with no check would report `holds` for "
            + "every Draft, which is the silent pass this whole comparison exists to refuse");
        }
        const r = impl(ctx);
        results.push({ step_id: step.step_id, item: item.id, class: item.class,
          judged: false, ...r });
        mechanicalLog.push({ step_id: step.step_id, item: item.id });
        continue;
      }

      // A declared side the Packet renders as a stated absence can leave an
      // item with nothing to ask about: a negative item goes vacuous (there is
      // no exemplar, so nothing of one can leak) and a positive one quantifies
      // over an empty list (`claims`, and since kogaki#1016 `introduces`).
      // Either way the answer is a FACT about the declared side, so the table
      // says so per item and NO Packet is rendered — the runtime never decides
      // it, and never pays a judge for a question about nothing.
      const dv = item.declared_block ? declared[item.declared_block] : null;
      if (item.when_declared_absent
          && (dv === "" || (Array.isArray(dv) && dv.length === 0))) {
        results.push({ step_id: step.step_id, item: item.id, class: item.class,
          judged: false, verdict: item.when_declared_absent.verdict,
          reason: item.when_declared_absent.sentence, span: step.lines });
        mechanicalLog.push({ step_id: step.step_id, item: item.id });
        continue;
      }

      const subs = [];
      if (item.mode === "per-declared") {
        // ONE PACKET PER DECLARED ENTRY, AND THE QUESTION IS RECOVERY
        // (kogaki#1132). The pair index is the DECLARED side's — `claims`'s kth
        // pair is the Step's kth declared claim — and the reverse side is
        // everything the reader wrote for the field, whole. Surplus is not
        // judged: the Packet tells the writer to retell material it asserts
        // nothing about, so a correctly realized passage asserts MORE than its
        // declared claim by design, and the item that asked the other way round
        // failed on every Step of the first full run.
        //
        // EACH ENTRY CARRIES THE DECLARED TEXT IT WAS ASKED ABOUT. That is what
        // lets the correction name the claim that was lost, in its own words,
        // rather than reporting that the row failed and leaving the corrector
        // to work out which of several declared claims went missing.
        const declaredEntries = declared[item.declared_block] || [];
        const reverseWhole = renderSide(rec[item.field] || []);
        declaredEntries.forEach((declaredText, i) => {
          const key = verdictKey(step.step_id, item.id, i);
          const file = renderJoinPacket(ws, run, pass, draft, step, item, i,
            renderSide(declaredText), reverseWhole);
          // THE VERDICT IS READ BEFORE THE CALL IS LOGGED, so the log can name
          // the model that answered it. An unanswered call carries `model:
          // null` — owed, not judged by nobody.
          const v = verdicts[key];
          modelCalls.push({ step_id: step.step_id, item: item.id, pair: i, packet: file,
            model: v ? v.model ?? null : null });
          subs.push(v
            ? { pair: i, declared: declaredText, verdict: v.verdict, reason: v.reason,
                model: v.model ?? null, span: step.lines, judged: true }
            // AN UNANSWERED PAIR IS `judged: false` AND CARRIES NO `model`: a
            // Packet was rendered for it, and nothing has come back. `judged`
            // says a Judge ANSWERED, never that one was owed a question — an
            // owed pair that read `true` would be a claim about a call that has
            // not happened, which is the claim the missing `model` key already
            // refuses one field over.
            : { pair: i, declared: declaredText, owed: true, judged: false,
                key, packet: file, span: step.lines });
          if (!v) owed.push({ key, step_id: step.step_id, item: item.id, pair: i, packet: file });
        });
      } else {
        const key = verdictKey(step.step_id, item.id, null);
        const file = renderJoinPacket(ws, run, pass, draft, step, item, null,
          declaredSide(step, item, declared, items),
          reverseSide(item, rec, figRec));
        const v = verdicts[key];
        modelCalls.push({ step_id: step.step_id, item: item.id, pair: null, packet: file,
          model: v ? v.model ?? null : null });
        subs.push(v
          ? { pair: null, verdict: v.verdict, reason: v.reason, model: v.model ?? null,
              span: step.lines, judged: true }
          : { pair: null, owed: true, judged: false, key, packet: file, span: step.lines });
        if (!v) owed.push({ key, step_id: step.step_id, item: item.id, pair: null, packet: file });
      }

      if (!subs.length) {
        results.push({ step_id: step.step_id, item: item.id, class: item.class, judged: false,
          verdict: "holds", reason: "the reverse side carries nothing for this item to disagree with",
          span: step.lines });
        mechanicalLog.push({ step_id: step.step_id, item: item.id });
        continue;
      }
      if (subs.some((s) => s.owed)) {
        results.push({ step_id: step.step_id, item: item.id, class: item.class, owed: true,
          judged: false, span: step.lines });
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
      const rowJudged = subs.some((s) => s.judged);
      // THE ROW'S EVIDENCE IS THE DECLARED TEXT OF EVERY ENTRY THAT DID NOT HOLD
      // (kogaki#1132). The comparison line carries one pair's reason and no
      // quoted material — that is the no-numbers rule, and a declared claim can
      // carry a digit — so the quoted side goes where quoted material already
      // goes: the finding's evidence, which the owner record and the correction
      // input both render in full. `cannot-decide` is included and never
      // rounded: a declared claim the reader could not settle is exactly what a
      // person is being asked to look at.
      const lost = subs.filter((s) => s.declared !== undefined && s.verdict && s.verdict !== "holds")
        .map((s) => s.declared);
      results.push({ step_id: step.step_id, item: item.id, class: item.class,
        judged: rowJudged,
        // THE CHOSEN PAIR IS NAMED ON THE ROW (PR #1004 round 2, finding 5). The
        // row's verdict, reason and span are one pair's, and the owner record's
        // pointer to the Packet that pair was judged on cannot be composed from a
        // row that does not say which — `pairs` holds every pair, and the
        // selection is what this line is.
        pair: chosen.pair,
        verdict: chosen.verdict, reason: chosen.reason,
        // THE KEY IS PRESENT EXACTLY WHERE `judged` IS TRUE, and its VALUE is
        // the chosen pair's — the pair whose verdict, reason and span this row
        // renders (PR #1001 round 1).
        //
        // `judged` REPLACED `decided_by` AT kogaki#1134, and the two keys said
        // one thing twice: `decided_by: "model"` beside `model: <id>` read as
        // the same fact spelled two ways. The boolean says whether a Judge was
        // asked at all and `model` says which, which is the split that was
        // there all along.
        //
        // The two facts come apart on a HYBRID item — a row some of whose pairs
        // the Harness decides and some of whose pairs a model answers. `judged`
        // is a fact about the row's pairs — any one judged makes it true —
        // while every other field here is the CHOSEN pair's, so the chosen one
        // can be the Harness's out of a row a model also answered. Keying
        // presence on the chosen pair, as this first did, then produced a row
        // saying it was judged and carrying no `model` — the one case the
        // absence was supposed to rule out. NO ROW IN THE SHIPPED TABLE IS
        // HYBRID SINCE kogaki#1132 removed the one hybrid mode; the rule is
        // live code with no current specimen, kept rather than retired.
        //
        // So presence answers "was a model asked here at all", which is exactly
        // what `judged` says, and `null` answers "not for the line you are
        // reading" — a Harness-decided pair won the selection. A row with no
        // key is a row where nothing was asked; the truth per pair is in
        // `pairs`, and it always was.
        ...(rowJudged ? { model: chosen.model ?? null } : {}),
        ...(lost.length ? { evidence: lost } : {}),
        span: chosen.span, pairs: subs });
    }
  });

  return { results, owed, modelCalls, mechanicalLog, steps };
}

// THE NO-NUMBERS RULE, IN ONE PLACE (kogaki#1097). One rendering holds it since
// kogaki#1134 took the written comparison file away, and it stays a named
// function rather than an inline regex: a rule carried by copies of a regex is a
// rule that holds in one of them after the first repair, and the second
// rendering is one issue away at any time. The guard is scoped to the REASON, as
// it always was: the span is a coordinate, and a pinned model id or a pair index is
// the name of a thing rather than a reading that could be compared.
function refuseNumericReason(r, where) {
  if (/[0-9]/.test(r.reason)) {
    fail(`the comparison line for ${where} carries a digit in its reason `
      + `(${JSON.stringify(r.reason)}). A comparison line renders line numbers and nothing else `
      + "numeric — every other number in a review is a score by another name, and quoted material "
      + "belongs in the finding's evidence rather than in the line.");
  }
}

// ONE LINE PER (Step, item), AND NO NUMBER IN IT THAT IS NOT A LINE NUMBER —
// ENFORCED HERE RATHER THAN PROMISED. The span is the only numeric field the
// line carries, and a reason carrying a digit refuses the whole emission by
// name.
//
// THE RULE IS ENFORCED BECAUSE THE FIRST LIVE DRIVE BROKE IT. Quoting the
// offending material into the reason read as helpful and was the leak: the live
// Draft's claims are labelled by the Strands they came from, so
// `claims-unused` rendered `claim (strand L97)` into a comparison line and put
// a number in front of a reader that was not a line number and could be
// compared. So quoted material is EVIDENCE — it goes to the join record and to
// the owner record, where a reader can see it in full — and never into the line
// whose whole claim is that the only numbers in it are coordinates.
function comparisonLine(r) {
  refuseNumericReason(r, `${r.step_id}/${r.item}`);
  const w = (s, n) => String(s).padEnd(n, " ");
  return `${w(r.step_id, 8)}${w(r.item, 26)}${w(r.verdict, 14)}`
    + `${w(`[${r.span[0]}-${r.span[1]}]`, 14)}${r.reason}`;
}

// ---------------------------------------------------------------------------
// THE PER-STEP COMPARISON FILES ARE GONE (kogaki#1134, owner 2026-09-17), AND
// THIS REVERSES kogaki#1097 BY NAME.
//
// #1097 wrote `comparison/<step>.md` because the surface a person debugged from
// mid-run was then the verdicts file the session had handed in, which carried
// the model's answer and nothing about what the answer meant — not the item's
// class, not whether the fail sent the Step to correction. kogaki#1100 removed
// those session-written files the same day, and `join.json` now carries
// `class`, `verdict`, `reason`, `model` and `span` on every row. Read against
// that record the comparison files were a legend plus one line per pair
// restating it, and harder to read than the record they rendered. Their one
// addition — the consequence word — is derivable from the row's class and
// verdict by the same rule `consequenceOf` held, so nothing is lost with them.
//
// The EMITTED comparison line stays: it is the pass's own report to the person
// running it, not a file in the run directory, and `comparisonLine` above is
// the whole of it.

function cmdCompare(args) {
  const draftPath = argString(args, "draft", "usage: review-draft compare --draft <draft.md>   (verdicts on standard input record them)");
  // BOTH PHASES ARE ONE COMMAND, AND THE STREAM IS WHAT SELECTS ONE
  // (kogaki#1100). With nothing piped in, `compare` renders what it owes; with
  // a verdicts reply piped in, it records. The flag that used to say which is
  // gone, so the reply itself is read once, here, before any refusal consumes
  // the stream.
  const reply = readReply();
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);

  // `compare` IS PASS ONE, AND PASS ONE ENDS AT THE FIRST CORRECTION (PR #1004
  // round 2 successor). `correct` moves `body_sha` with the article, so
  // `requireCurrent` admits a `compare` over the corrected Draft — and that
  // `compare` would re-render every pass-one join Packet from the CORRECTED
  // prose, over the inputs pass one's verdicts were actually given on, and
  // reset the pass-one record to an unbounded join. That is the loss
  // kogaki#994 was filed for, one pass over, and the pass ledger cannot catch
  // it: pass one writing over its own files is a permitted write. The pass over
  // a corrected Draft is `check`, and the refusal names it.
  if ((run.corrections || []).length) {
    fail(`this run has ${run.corrections.length} correction(s) recorded, so pass one is over: `
      + "`compare` would re-render pass one's join inputs from the corrected article, over the "
      + "inputs its verdicts were given on, and pass one's reading of the original would be lost.\n"
      + "The pass over a corrected Draft is `check`:\n"
      + `  node src/review-draft.mjs check --draft ${relative(process.cwd(), draft.path) || draft.path}`);
  }

  // EVERY MISSING INPUT IS NAMED IN ONE REFUSAL, BY STEP. A reviewer sent back
  // for "a missing outline" has to work out which; the Harness already knows.
  const missing = missingFor(run);
  if (missing.steps.length) {
    fail(`the join has inputs missing, so it would compare a partial review against a whole Draft `
      + `and report the gaps as agreement.\n  step outline`
      + `${missing.steps.length === 1 ? "" : "s"}: ${missing.steps.join(", ")}`);
  }

  const items = readItems();

  // THE OWED SET IS COMPUTED BEFORE ANY VERDICT IS RECORDED, and that ordering
  // is what the file is validated against: what a run asks about is a property
  // of the Draft, the Packets and the item table, never of the answers it has
  // already been given.
  let pass = buildJoin(draft, run, items, ws, { pass: 1 });
  let recorded = 0;
  if (reply.trim() !== "") {
    recorded = recordVerdicts(run, reply, pass.owed, items);
    pass = buildJoin(draft, run, items, ws, { pass: 1 });
  }

  const { results, owed, modelCalls, mechanicalLog } = pass;
  const complete = owed.length === 0;
  run.join_complete = complete;
  run.compared_at = complete ? new Date().toISOString() : null;
  run.join_state = complete ? null
    : `${owed.length} pair(s) await a verdict — the join is unfilled, not clean`;
  run.findings = complete ? results.filter((r) => r.verdict !== "holds") : [];
  writeRun(ws, run);

  // PASS ONE'S RECORD, AND THE PASS IS NAMED RATHER THAN INHERITED. `compare`
  // IS pass one — `check` is the door pass two answers through, precisely so
  // this unbounded join is never rebuilt over a corrected Draft — so the
  // record lands in `pass-1/` whatever pass the run has since reached.
  const joinPath = passPathAt(ws, run, 1, "join.json");
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
      `compare: every input present — ${run.steps.length} outlined Step(s).\n`
      + `${mechanicalLog.length} pair(s) decided mechanically, no model call.\n`
      + judgedByLine(modelCalls)
      + `${owed.length} pair(s) await a verdict — one join Packet each, under ${passReadPath(ws, 1, "join")}:\n`
      + owed.map((o) => `  ${o.key}  ${o.packet}`).join("\n") + "\n"
      + "Answer each with one of holds / fails / cannot-decide plus one sentence, then\n"
      + `  <verdicts.json> | node src/review-draft.mjs compare --draft ${relative(process.cwd(), draft.path) || draft.path}\n`
      + `join record: ${joinPath}\n`);
    return;
  }

  // THE PASS LEDGER IS PERSISTED AFTER THE RECORD IS WRITTEN. `passPathAt`
  // registers each path it composes in `run.pass_files`, and that register is
  // what makes a second pass writing over this one refuse by name; a run that
  // composed `join.json`'s path and never wrote the record back would leave the
  // refusal unarmed for the one file this pass ends on.
  writeRun(ws, run);

  const fails = results.filter((r) => r.verdict === "fails");
  const preserved = fails.filter((r) => r.class === "preserved");
  const undecided = results.filter((r) => r.verdict === "cannot-decide");
  process.stdout.write(
    results.map(comparisonLine).join("\n") + "\n\n"
    + `compare: ${results.length} (Step, item) pair(s) joined, `
    + `${mechanicalLog.length} decided mechanically and ${modelCalls.length} judged.\n`
    + judgedByLine(modelCalls)
    + (preserved.length
      ? `Steps sent to correction — a preserved item fails: ${[...new Set(preserved.map((r) => r.step_id))].join(", ")}\n`
      : "No preserved item fails, so no Step is sent to correction.\n")
    + (undecided.length
      ? "cannot-decide, listed with its pair and never rounded: "
        + undecided.map((r) => `${r.step_id}/${r.item}`).join(", ") + "\n"
      : "")
    + `join record: ${joinPath}\n`
    + (fails.length
      ? "`check --draft <draft.md>` is pass two.\n"
      : "`close --draft <draft.md>` writes the owner record.\n"));
}

// ---------------------------------------------------------------------------
// THE CORRECTION PATH (kogaki#874). What a corrected Step receives, the bounded
// second pass, and the drift measure.
//
// A CORRECTED STEP IS REALIZED FROM A FRESHLY RENDERED PACKET, never from the
// Packet that produced the failing prose. That is the whole answer to the
// owner's 2026-09-04 concern: the Packet's "article so far" block is the
// continuity mechanism, and a Step corrected against its ORIGINAL Packet would
// be re-realized against prose that has since moved — so each correction would
// carry the Step a little further from the article it actually sits in, which
// is exactly the drift the concern names. Rendering fresh makes the corrected
// Step's input the current article, including Steps corrected earlier in the
// same pass.
//
// THE REALIZATION LANE IS ENTERED AS A SUBPROCESS, never imported. `draft.mjs`
// is the renderer that wrote the Packets this review compares against, so a
// Step re-realized through it is realized by the same code path the original
// was; re-implementing `packet`, `section` or `emit` here would be a second
// writer of the Draft, and the two would disagree about the trace. The
// closed-input allowlist is untouched — see the note at `readDraft`'s `brief:`
// read for why the ruling binds the reviewer's reading and not this call.
function briefOf(draft) {
  if (!draft.brief) {
    fail(`${draft.path} names no Brief in its frontmatter, and the correction path re-enters the `
      + "realization lane to render a fresh Packet. Re-emit the Draft "
      + "(`node src/draft.mjs emit --brief <brief.md>`), which writes the field.");
  }
  const p = resolve(dirname(draft.path), draft.brief);
  if (!existsSync(p)) {
    fail(`the Brief this Draft names is absent — ${p}. A correction is realized from a Packet `
      + "rendered against the CURRENT Draft, and the Packet renderer is entered by its Brief.");
  }
  return p;
}

// THE REPLY REACHES THE REALIZATION LANE AS A FILE, AND THE FILE IS THE
// HARNESS'S OWN (kogaki#1100). `draft.mjs` takes its prose and its figure
// record as a path, and that interface is not this issue's to move; what this
// issue removes is a reply file the SESSION names, and a run directory holding
// one. So the reply is spilled to a Harness-named temporary file OUTSIDE the
// workspace, handed to the lane, and removed when the lane returns — `runs/`
// gains nothing, and the lane's own argument is untouched.
function withReplyFile(text, name, fn) {
  const dir = mkdtempSync(join(tmpdir(), "review-draft-reply-"));
  const p = join(dir, name);
  writeFileSync(p, text);
  try { return fn(p); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

function draftLane(sub, draft, args, extra) {
  const cli = join(dirname(fileURLToPath(import.meta.url)), "draft.mjs");
  // THE LANE IS RE-ENTERED AT THE DRAFT'S OWN LANGUAGE (kogaki#1160), never at
  // the lane's default. `draft.mjs` defaults `--lang` to `en`, and a Japanese
  // Draft handed to it with no `--lang` re-enters the English track: `packet`
  // and `section` overwrite the English Packets and Sections, and `emit`
  // targets `draft.md` rather than `draft.ja.md`. Passing `draft.lang`
  // explicitly on every sub-invocation is what keeps a correction on
  // `draft.ja.md` inside the Japanese track it was opened on.
  const argv = [cli, sub, "--brief", briefOf(draft), "--lang", draft.lang, ...extra];
  // BOTH PASSTHROUGHS ARE OPTIONAL AND NEITHER IS DEFAULTED HERE. `draft.mjs`
  // already defaults its workspace (by slug, so it resolves to the one the
  // Draft was emitted from) and its Move store; defaulting them again here
  // would put a second answer beside the one the lane already gives, and the
  // store default is a literal this module is asserted not to carry.
  for (const k of ["draft-workspace", "moves-dir"]) {
    const v = args[k];
    if (typeof v === "string" && v !== "") argv.push(k === "draft-workspace" ? "--workspace" : `--${k}`, v);
  }
  const r = spawnSync(process.execPath, argv, { encoding: "utf8" });
  if (r.status !== 0) {
    fail(`the realization lane refused \`draft.mjs ${sub}\` for this correction, so nothing was `
      + `changed. Its refusal, verbatim:\n${(r.stderr || r.stdout || "(no output)").trim()}`);
  }
  return r;
}

// The pass-one join record. Read rather than recomputed: `compare` wrote which
// pairs held and which failed, and re-deriving them here would be a second
// answer to a question the record already answers — and one computed against a
// Draft the corrections have since moved.
function readJoin(ws) {
  const p = passReadPath(ws, 1, "join.json");
  if (!existsSync(p)) {
    fail(`no join record at ${p} — \`compare\` writes it, and the correction path is bounded by `
      + "what pass one found. Run `compare --draft <draft.md>` first.");
  }
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { fail(`the join record at ${p} is not readable (${e.message})`); }
}

// THE SEAT-BLIND `correctionOwed` IS DELETED (kogaki#945), not left beside its
// replacement. Its last reader was `check`'s UNCORRECTED line, which is now
// per seat; keeping an unreferenced Step-granular owed-set would leave the next
// reader a choice between two answers to one question, and the seat-blind one
// is the answer that was wrong.
//
// What it carried that still binds, restated where the computation now lives:
// best-effort fails never send a Step to correction — they ride along when the
// Step is re-realized anyway, which is what the item table's class means at
// this act exactly as it means it at `close`. `failingSides` below is now the
// sole computer of it.
//
// A LOCALIZED SECTION FAIL USED TO ADD ITS TARGET STEP HERE (kogaki#873), and
// that arm is gone with the reader that produced it (kogaki#1133): the failing
// preserved items of the Step itself are now the whole of what sends it to
// correction.

// ---------------------------------------------------------------------------
// THE FIGURE CORRECTION (kogaki#880). A failing PRESERVED figure item sends its
// Step to correction exactly as a failing prose item does — same class rule,
// same consequence — but what is re-realized is the RECORD, not the passage.
//
// TWO CORRECTIONS, NOT ONE WIDENED ONE, and the split is the design rather than
// an implementation convenience. The prose correction hands back prose and goes
// through `draft.mjs section`; the figure correction hands back a JSON record
// and goes through `draft.mjs figure`, which re-validates it against
// src/figure-schema.json and the Move's own form. Composing them would mean one
// act whose input depends on which item failed, and a session would have
// to know which before it could answer.
//
// PROSE FIRST WHERE A STEP OWES BOTH. The figure record's whole claim for filling the
// record after the text is that the caption is stated in what the reader holds
// after reading THIS passage — so a record corrected against prose that is
// about to change is a record corrected against nothing.

// The figure rows of the table, read from it rather than spelled here: a
// runtime naming figure item ids could not be told from one restating the
// table, the same rule `pass_two` already states about the second pass's arms.
function figureItemIds(items) {
  return new Set(items.items.filter((i) => i.figure_only).map((i) => i.id));
}

// Which of a Step's failing preserved items are the figure's, and which are the
// passage's.
function failingSides(run, items, stepId) {
  const fig = figureItemIds(items);
  const rows = (run.findings || [])
    .filter((f) => f.step_id === stepId && f.verdict === "fails" && f.class === "preserved");
  return {
    prose: rows.filter((f) => !fig.has(f.item)).map((f) => f.item),
    figure: rows.filter((f) => fig.has(f.item)).map((f) => f.item),
  };
}

// The Steps owed a PASSAGE correction, in path order. A Step whose only failing
// preserved items are the figure's is not here — its re-realization is the
// record, and `correct` without `--figure` would hand it the wrong input.
function correctionOwedProse(run, items) {
  return run.steps.map((s) => s.step_id).filter((id) => failingSides(run, items, id).prose.length);
}

// The Steps owed a figure correction, in path order — the same order and the
// same enforcement the prose corrections run under.
function figureCorrectionOwed(run, items) {
  return run.steps.map((s) => s.step_id).filter((id) => failingSides(run, items, id).figure.length);
}

// THE (Step, seat) PAIRS STILL OWED A CORRECTION, in path order, prose first
// and each figure entry marked with the flag that reaches it. ONE definition
// for three readers (kogaki#945): the two `correct` reports and `check`'s
// UNCORRECTED line.
//
// THE UNCORRECTED LINE KEYED ON THE STEP ALONE until this, and that is the
// defect. `bound.corrected` is the set of Steps carrying ANY recorded
// correction, so a Step that owed BOTH seats and received one was in it — and
// `correctionOwed(run).filter((id) => !bound.corrected.has(id))` therefore
// dropped it, reporting no UNCORRECTED line for a Step still owing its other
// seat. That is the same silence PR #906 round 1's finding 1 repaired at the
// single-seat level, reappearing at the seat kogaki#880 introduced.
//
// The two `correct` reports already computed exactly this, twice, inline. They
// now read it from here, so a third seat cannot be added to one reader and
// missed by the others.
function seatsStillOwed(run, items) {
  const done = (seat) => new Set((run.corrections || [])
    .filter((c) => (c.seat || "prose") === seat).map((c) => c.step_id));
  const proseDone = done("prose");
  const figureDone = done("figure");
  return [
    ...correctionOwedProse(run, items).filter((id) => !proseDone.has(id)),
    ...figureCorrectionOwed(run, items).filter((id) => !figureDone.has(id)).map((id) => `${id} (--figure)`),
  ];
}

// The evidence a figure Correction block carries: this Step's rows, split the
// way the block renders them, restricted to the figure's own items. The held
// side is restricted the same way — what a figure correction must not break is
// the figure's other preserved items, and listing the passage's would ask the
// author of a JSON record not to break prose they are not editing.
function figureCorrectionEvidence(joinRec, items, stepId) {
  const fig = figureItemIds(items);
  const rows = (joinRec.results || []).filter((r) => r.step_id === stepId && fig.has(r.item));
  return {
    failed: rows.filter((r) => r.verdict === "fails"),
    held: rows.filter((r) => r.verdict === "holds" && r.class === "preserved"),
    undecided: rows.filter((r) => r.verdict === "cannot-decide"),
  };
}

// ONE LINE PER NON-HOLDING PAIR, NAMING THE DECLARED THING RATHER THAN ITS
// INDEX (kogaki#1132). A `per-declared` row's pairs are the DECLARED entries, so
// the corrector is owed the entry's own text: "the claims item failed" does not
// say which of a Step's claims went missing, and on a Step declaring two it is
// half the instruction. A row whose pairs carry no declared text — every judged
// row, and the figure's — reads as it always did.
function pairLines(f) {
  return (f.pairs || [])
    .filter((p) => p.verdict && p.verdict !== "holds")
    .map((p) => (p.declared !== undefined
      ? `  - the declared \`${f.item}\` entry \`${p.declared}\` was not recovered — `
        + `${p.verdict}: ${p.reason}`
      : `  - pair ${p.pair === null ? "(whole item)" : p.pair} — ${p.verdict}: ${p.reason}`));
}

function renderFigureCorrectionBlock(step, evidence, packet) {
  const out = [];
  out.push("# Correct the figure record — " + step.step_id, "",
    "This Step's figure has already been designed once. What you hand back is a",
    "RECORD, not prose: one JSON object, the instance of this Step's Move form,",
    "validated against `src/figure-schema.json` by the same act that validated",
    "the first one. The passage itself is not yours to change here.", "");
  out.push("## The Step this figure belongs to", "",
    "The Packet below is this Step's, re-rendered as it now stands. The record's",
    "elements are worded from the claims it declares, and its caption is stated",
    "in what the Step says its reader holds afterwards.", "", packet.trim(), "");
  out.push("## The passage, as it now stands", "",
    ...numberedProse(step).split("\n").map((l) => `    ${l}`), "");
  out.push("## The figure as the reader currently meets it", "",
    ...numberedFigure(step).split("\n").map((l) => `    ${l}`), "",
    "Rendered by the Harness from the record below. You do not write this markup",
    "and nothing you hand back may contain any: the renderer re-runs on the",
    "record you return, which is what makes the transcription the same function",
    "every time.", "");
  out.push("## The previous record, verbatim", "",
    "```json",
    JSON.stringify(step.figure.record_json, null, 2),
    "```", "");
  out.push("## What failed", "");
  if (!evidence.failed.length) {
    out.push("_No figure item failed on this Step._", "");
  } else {
    for (const f of evidence.failed) {
      out.push(`- **${f.item}** (${f.class}) — ${f.reason}`);
      out.push(`  - span: lines ${f.span[0]}–${f.span[1]} of the Draft as it stood`);
      for (const e of [].concat(f.evidence ?? [])) out.push(`  - evidence: ${e}`);
      out.push(...pairLines(f));
    }
    out.push("");
  }
  out.push("## What held, and must go on holding", "");
  out.push(evidence.held.length
    ? evidence.held.map((h) => `- **${h.item}** — ${h.reason}`).join("\n")
    : "_No preserved figure item holds on this Step, so this correction breaks nothing by leaving it._");
  out.push("");
  if (evidence.undecided.length) {
    out.push("## What the reader could not settle", "",
      "Listed and never rounded. These are not instructions.", "",
      ...evidence.undecided.map((u) => `- **${u.item}** — ${u.reason}`), "");
  }
  out.push("## The instruction", "",
    "Change what the findings above name and nothing else. Keep the record's",
    "`kind` — it is the Move form's and not a choice made here — and keep every",
    "role the form declares. An element's `claim` names the claim the Brief",
    "bound its role to; reword the element, never the binding, unless a finding",
    "says the binding itself is wrong.", "");
  return out.join("\n");
}

// The two sides of the Correction block's evidence, from the pass-one record:
// what failed on this Step, and what HELD on it as a preserved item. The second
// is not decoration — it is what the correction must not break, and a
// correction instruction that named only the failures would be asking for a
// rewrite rather than a repair.
// THE FIGURE'S ROWS ARE NOT IN THE PROSE BLOCK (kogaki#880). What failed on the
// record is repaired by editing the record, and listing it here would ask the
// author of a passage to fix something the passage cannot reach — and put it
// under a heading saying "change what the findings above name".
function correctionEvidence(joinRec, stepId, items) {
  const fig = items ? figureItemIds(items) : new Set();
  const rows = (joinRec.results || []).filter((r) => r.step_id === stepId && !fig.has(r.item));
  return {
    failed: rows.filter((r) => r.verdict === "fails"),
    held: rows.filter((r) => r.verdict === "holds" && r.class === "preserved"),
    undecided: rows.filter((r) => r.verdict === "cannot-decide"),
  };
}

function renderCorrectionBlock(step, evidence) {
  const out = [];
  out.push("", "---", "",
    "## The Correction — what this Step must change, and what it must not", "",
    "This Step has already been realized once. Everything above is the CURRENT",
    "Packet, re-rendered against the article as it now stands, so the \"article so",
    "far\" block above holds the preceding prose including any Step corrected",
    "before this one in the same pass. Write from it, not from what you remember.",
    "");
  out.push("### The previous realization, verbatim", "",
    ...step.prose.split("\n").map((l) => `> ${l}`), "");
  out.push("### What failed", "");
  if (!evidence.failed.length) {
    out.push("_Nothing failed on this Step._", "");
  } else {
    for (const f of evidence.failed) {
      out.push(`- **${f.item}** (${f.class}) — ${f.reason}`);
      out.push(`  - span: lines ${f.span[0]}–${f.span[1]} of the Draft as it stood`);
      for (const e of [].concat(f.evidence ?? [])) out.push(`  - evidence: ${e}`);
      out.push(...pairLines(f));
    }
    out.push("");
  }
  out.push("### What held, and must go on holding", "");
  out.push(evidence.held.length
    ? evidence.held.map((h) => `- **${h.item}** — ${h.reason}`).join("\n")
    : "_No preserved item holds on this Step, so this correction breaks nothing by leaving it._");
  out.push("");
  if (evidence.undecided.length) {
    out.push("### What the reader could not settle", "",
      "Listed and never rounded. These are not instructions.", "",
      ...evidence.undecided.map((u) => `- **${u.item}** — ${u.reason}`), "");
  }
  out.push("### The instruction", "",
    "Change what the findings above name and nothing else. Do not restate the",
    "Packet's wording. The preceding prose is the same reader you already had:",
    "continue from it exactly as the write instruction above says, and do not",
    "re-open what the earlier passages settled.", "");
  return out.join("\n");
}

// DRIFT IS MEASURED AND REPORTED, NEVER GATED. Both figures answer the owner's
// concern in the form it was raised — "the more a Step is corrected
// independently, the farther it may drift" — and neither withholds anything: a
// high change share is what the owner reads as the Step becoming self-contained,
// and that reading is the owner's.
function sentencesOf(text) {
  return String(text).split(/(?<=[.!?])[\s]+/).map((s) => s.trim()).filter(Boolean);
}

function driftOf(before, after, packetLines, n) {
  const prior = new Set(sentencesOf(before));
  const now = sentencesOf(after);
  const changed = now.filter((s) => !prior.has(s)).length;
  const lines = after.split("\n").filter((l) => l.trim());
  const hits = lines.filter((l) => verbatimWindow(l, packetLines, n)).length;
  return {
    change_share: `${changed} of ${now.length} sentence(s) differ from the previous realization`,
    packet_overlap: `${hits} of ${lines.length} line(s) repeat a run of the Packet's claim or state wording`,
  };
}

function driftBlocks(declared, items) {
  const names = (items.pass_two || {}).drift_blocks;
  if (!Array.isArray(names) || !names.length) {
    fail("the item table declares no `pass_two.drift_blocks`, and the drift measure reports "
      + "verbatim overlap against the Packet's claim and state lines. A measure with no blocks "
      + "to read would report zero overlap for every correction, which is a clean number about "
      + "nothing.");
  }
  return names.flatMap((b) => (Array.isArray(declared[b]) ? declared[b] : [declared[b]]))
    .filter((x) => typeof x === "string" && x !== "");
}

// THE CORRECTION INPUTS BELONG TO THE PASS WHOSE VERDICTS PRODUCED THEM, and
// that is always PASS ONE — `correct` refuses a Step that pass one's join did
// not send to correction, and pass two turns a still-failing item into residue
// rather than into another correction. So the directory is `pass-1/corrections/`
// even when a `check` has already run, which is what lets a reader go from a
// pass-one finding to the input its corrector was handed. A pass number read
// off the run record here would file the same act in two places depending on
// whether `check` happened to have been run first.
function correctionInputPath(ws, run, stepId) {
  return passPathAt(ws, run, 1, "corrections", `${stepId}.md`);
}

// THE FIGURE CORRECTION'S TWO PHASES (kogaki#880), the same two phases the prose
// correction has: render the input, then record what came back. Between them
// the run is MID-CORRECTION on this Step and every other act refuses by name,
// which is `requireCurrent`'s existing guard and is not re-implemented here.
function correctFigure(args, { draft, draftPath, ws, run, items, joinRec, stepId, reply }) {
  const step = resolveInputs(draft).steps.find((x) => x.step_id === stepId);
  if (!step.figure) {
    fail(`step ${stepId} carries no figure in the Draft's trace, so there is no record to `
      + "correct. A figure enters at composition, on the Brief, and never here");
  }

  // --- phase A: render the correction input ------------------------------
  if (reply.trim() === "") {
    // THE PACKET IS RE-RENDERED FOR THE SAME REASON THE PROSE CORRECTION
    // RE-RENDERS IT: the record's elements are worded from the Step's claims
    // and its caption from the state the Step leaves its reader in, and both
    // are the Packet's. A record corrected against the Packet that produced the
    // failing figure would be corrected against the input already found wanting.
    const r = draftLane("packet", draft, args, ["--step", stepId]);
    const prefix = `packet ${stepId}: `;
    const line = (r.stderr || "").split("\n").find((l) => l.startsWith(prefix));
    if (!line) {
      fail("the realization lane rendered a Packet and did not say where it stored it, so this "
        + "cannot show a reviewer the input the correction is written from. Its output, "
        + `verbatim:\n${(r.stderr || r.stdout || "(no output)").trim()}`);
    }
    const freshPath = line.slice(prefix.length).trim();
    if (!existsSync(freshPath)) fail(`the realization lane named a Packet at ${freshPath} and no file is there`);
    const fresh = readFileSync(freshPath, "utf8");
    const dest = passPathAt(ws, run, 1, "corrections", `${stepId}.figure.md`);
    writeFileSync(dest, renderFigureCorrectionBlock(
      step, figureCorrectionEvidence(joinRec, items, stepId), fresh) + "\n");
    run.correction_inputs = run.correction_inputs || {};
    run.correction_inputs[`${stepId}#figure`] = {
      path: dest, packet: freshPath, packet_sha: sha256(fresh),
      record: step.figure.record_path, record_sha: step.figure.record_sha,
      // THE RECORD'S OWN BYTES, NOT ONLY ITS PATH AND SHA (kogaki#1135). The
      // file at that path is overwritten by `draft.mjs figure` when the
      // correction is recorded, so the sha afterwards names a document nothing
      // holds — and a Step whose figure regressed in pass two is restored to
      // the record the reader met, which is these bytes. The prose seat keeps
      // its previous realization for the same reason, one field over.
      record_text: readFileSync(step.figure.record_path, "utf8"),
      rendered: step.figure.rendered, rendered_at: new Date().toISOString(),
    };
    run.correcting = { step_id: stepId, seat: "figure", input: dest, since: new Date().toISOString() };
    writeRun(ws, run);
    process.stdout.write(
      `figure correction input: ${dest}\n`
      + "  It carries this Step's Packet re-rendered as it now stands, the passage, the figure as\n"
      + "  the reader currently meets it, the previous record verbatim, what failed and what must\n"
      + "  go on holding.\n"
      + "Design the record again from it, then record with\n"
      + `  <record.json> | node src/review-draft.mjs correct --draft ${relative(process.cwd(), draft.path) || draft.path} --step ${stepId} --figure\n`
      + "You write no markup: `draft.mjs figure` re-validates the record and `emit` re-renders the\n"
      + "block from it, so the transcription is the same function it was the first time.\n");
    return;
  }

  // --- phase B: record the corrected record ------------------------------
  const input = (run.correction_inputs || {})[`${stepId}#figure`];
  if (!input) {
    fail(`step ${stepId} has no rendered FIGURE correction input, so this record was not written `
      + `against one. Render it first:\n  node src/review-draft.mjs correct --draft `
      + `${relative(process.cwd(), draft.path) || draft.path} --step ${stepId} --figure`);
  }

  const snapDir = join(ws, "snapshots");
  mkdirSync(snapDir, { recursive: true });
  const seq = String((run.corrections || []).length + 1).padStart(2, "0");
  writeFileSync(join(snapDir, `${seq}-before-${stepId}.figure.md`), draft.text);

  // THE RENDERER RE-RUNS BY CONSTRUCTION. `figure` re-validates the record
  // against src/figure-schema.json and the Move's own form — every role
  // present, no extra role, the kind the form's, a position from the closed
  // pair — and `emit` renders the block from it. Nothing here transcribes
  // anything, which is why a syntax defect in a corrected figure stays a defect
  // of src/render-figure.mjs rather than of the sitting that corrected it.
  withReplyFile(reply, `${stepId}.figure.json`, (p) =>
    draftLane("figure", draft, args, ["--step", stepId, "--file", p]));
  draftLane("emit", draft, args, []);

  const after = readDraft(draftPath);
  const afterSteps = resolveInputs(after).steps;
  const corrected = afterSteps.find((s) => s.step_id === stepId);
  if (!corrected) fail(`step ${stepId} is absent from the re-emitted Draft's trace`);
  if (!corrected.figure) {
    fail(`step ${stepId} carries no figure in the re-emitted Draft — the correction was recorded `
      + "and the block did not come back, which is the drop-with-no-report case the renderer refuses");
  }
  writeFileSync(join(snapDir, `${seq}-after-${stepId}.figure.md`), after.text);

  const ev = figureCorrectionEvidence(joinRec, items, stepId);
  run.corrections = run.corrections || [];
  run.corrections.push({
    step_id: stepId,
    seat: "figure",
    pass: 1,
    what: "the figure record re-designed from a Packet re-rendered against the article as it "
      + `stood, with a Correction block carrying ${ev.failed.length} failed figure item(s) and `
      + `${ev.held.length} held preserved figure item(s); re-validated by \`draft.mjs figure\` and `
      + "re-rendered by `emit`",
    failed_items: ev.failed.map((f) => f.item),
    held_preserved: ev.held.map((h) => h.item),
    input: input.path,
    packet_sha: input.packet_sha,
    record_sha_before: input.record_sha,
    record_sha_after: corrected.figure.record_sha,
    // DRIFT IS REPORTED FOR THE FIGURE TOO, and it is the one figure a reader
    // can check: whether the rendered block moved at all. A correction that
    // re-validated a record and produced identical bytes changed nothing the
    // reader meets, which is information the owner reads rather than a refusal.
    block_changed: corrected.figure.rendered !== input.rendered
      ? "the rendered block differs from the one the reader met"
      : "the rendered block is byte-identical to the one the reader met",
    snapshot_before: join(snapDir, `${seq}-before-${stepId}.figure.md`),
    snapshot_after: join(snapDir, `${seq}-after-${stepId}.figure.md`),
    corrected_at: new Date().toISOString(),
  });

  run.body_sha = after.body_sha;
  delete run.correcting;
  delete run.pass_open_at;
  delete run.pass_cleared;
  run.steps = afterSteps.map((s) => ({
    step_id: s.step_id, section: s.section, section_title: s.section_title,
    lines: s.lines, packet: s.packet, packet_sha: s.packet_sha,
  }));
  // THE REVERSE OUTLINE IS DISCARDED for the same reason a prose correction discards
  // it: the blind reviewer read a figure that no longer exists, and keeping the
  // record would let pass two judge a new block against an old reading.
  delete run.outlineFields[stepId];
  delete run.rendered[stepId];
  writeRun(ws, run);

  const stillOwed = seatsStillOwed(run, items);
  process.stdout.write(
    `corrected: ${stepId} (figure)\n`
    + `  record  ${input.record_sha}\n`
    + `       -> ${corrected.figure.record_sha}\n`
    + `  ${run.corrections[run.corrections.length - 1].block_changed}\n`
    + "  reported, never gated — what an unchanged block means is the owner's reading\n"
    + `  snapshots ${join(snapDir, `${seq}-before-${stepId}.figure.md`)}\n`
    + `            ${join(snapDir, `${seq}-after-${stepId}.figure.md`)}\n`
    + (stillOwed.length
      ? `still owed a correction, in path order: ${stillOwed.join(", ")}\n`
      : "every Step pass one sent to correction has been corrected. `check --draft <draft.md>` is pass two.\n"));
}

function cmdCorrect(args) {
  const usage = "usage: review-draft correct --draft <draft.md> --step <id> [--figure]\n"
    + "       (the corrected prose, or the corrected figure record, on standard input records it)";
  const draftPath = argString(args, "draft", usage);
  const stepId = argString(args, "step", usage);
  // THE STREAM SELECTS THE PHASE, as it does in `compare` and `check`
  // (kogaki#1100), and it is read once here so both seats see the same answer.
  const reply = readReply();
  // THE FLAG SAYS WHICH SEAT IS BEING CORRECTED, and it is a flag rather than a
  // fact derived from what failed (kogaki#880). A Step can owe both a prose and
  // a figure correction, and the two take different inputs — prose in one and a
  // JSON record in the other — so a runtime that inferred the seat would decide
  // what form the session's file had to be in after the session wrote it.
  const figureMode = args.figure === true;
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft, stepId);

  if (!run.compared_at) {
    fail("`correct` is what pass one sends a Step to, and pass one has not completed — run "
      + "`compare --draft <draft.md>` first. A correction composed before the join has answered "
      + "would be a rewrite against findings nobody recorded.");
  }
  const known = run.steps.map((s) => s.step_id);
  if (!known.includes(stepId)) fail(`unknown step \`${stepId}\` — this Draft's Steps are ${known.join(", ")}`);

  const items = readItems();
  const owed = figureMode ? figureCorrectionOwed(run, items) : correctionOwedProse(run, items);
  if (!owed.includes(stepId)) {
    const sides = failingSides(run, items, stepId);
    // THE REFUSAL NAMES THE OTHER SEAT WHERE THAT IS WHY IT REFUSED. A Step
    // owing a figure correction and asked for a prose one is not a Step with
    // nothing owed, and reporting it as one would send a session looking for a
    // finding that is recorded and readable.
    if (!figureMode && sides.figure.length) {
      fail(`step ${stepId} carries no failing PRESERVED item of the PASSAGE, and it does carry one `
        + `of the FIGURE (${sides.figure.join(", ")}). What is re-realized there is the figure `
        + `record, not the prose:\n  node src/review-draft.mjs correct --draft `
        + `${relative(process.cwd(), draft.path) || draft.path} --step ${stepId} --figure`);
    }
    if (figureMode && sides.prose.length) {
      fail(`step ${stepId} carries no failing PRESERVED FIGURE item, and it does carry one of the `
        + `passage (${sides.prose.join(", ")}). Drop --figure to correct the prose.`);
    }
    fail(`step ${stepId} carries no failing PRESERVED ${figureMode ? "figure " : ""}item, so pass `
      + "one did not send it to correction. A best-effort fail rides along when its Step is "
      + `re-realized anyway and never sends one here.\n  owed: ${owed.length ? owed.join(", ") : "(none — no Step is owed a correction)"}`);
  }
  // PATH ORDER IS ENFORCED, not requested. Corrections run in path order so
  // each later one sees the earlier ones in its own "article so far" block —
  // which is the mechanism the whole correction path rests on, and a session
  // correcting out of order would silently get the opposite: a Step realized
  // against prose that is about to change under it.
  //
  // ORDER IS TRACKED PER SEAT (kogaki#880): a Step's recorded figure correction
  // does not discharge the prose correction owed on an earlier Step, and the
  // seat a record carries is what says which it discharged.
  const seat = figureMode ? "figure" : "prose";
  const already = new Set((run.corrections || [])
    .filter((c) => (c.seat || "prose") === seat).map((c) => c.step_id));
  const earlier = owed.slice(0, owed.indexOf(stepId)).filter((id) => !already.has(id));
  if (earlier.length) {
    fail(`corrections run in path order and step ${stepId} is not next — ${earlier.join(", ")} `
      + `${earlier.length === 1 ? "is" : "are"} owed a ${seat} correction first. Each correction `
      + "re-renders the next Step's Packet against the article as it then stands, so correcting out "
      + "of order realizes a Step against prose that is about to move under it.");
  }
  // THE PASSAGE IS CORRECTED BEFORE THE FIGURE IT CARRIES, and this is the
  // figure record's
  // own ordering rather than a convention chosen here: the record's caption is
  // stated in what the reader holds after reading THIS passage, and its
  // elements are worded against prose that must already exist. A record
  // corrected against prose that is about to change is corrected against
  // nothing.
  if (figureMode) {
    const proseOwed = correctionOwedProse(run, items).includes(stepId);
    const proseDone = (run.corrections || []).some((c) => c.step_id === stepId && (c.seat || "prose") === "prose");
    if (proseOwed && !proseDone) {
      fail(`step ${stepId} owes a correction on its PASSAGE as well, and the passage is corrected `
        + "first: the record's caption is stated in what the reader holds after reading this "
        + "passage, and its elements are worded from prose that must already exist.\n"
        + `  node src/review-draft.mjs correct --draft ${relative(process.cwd(), draft.path) || draft.path} --step ${stepId}`);
    }
  }

  const joinRec = readJoin(ws);
  if (figureMode) { correctFigure(args, { draft, draftPath, ws, run, items, joinRec, stepId, reply }); return; }

  // --- phase A: render the correction input ------------------------------
  if (reply.trim() === "") {
    // RESOLVED BEFORE THE LANE IS ENTERED, and only here. Phase A still holds a
    // consistent Draft — the trace and every Packet agree — and re-rendering
    // this Step's Packet is what ends that agreement, so the previous prose is
    // read out first and recorded. Phase B reads it back from that record
    // rather than resolving a Draft it knows is mid-correction.
    const step = resolveInputs(draft).steps.find((x) => x.step_id === stepId);
    const r = draftLane("packet", draft, args, ["--step", stepId]);
    // THE LANE IS ASKED WHERE IT STORED THE PACKET, never guessed at from the
    // workspace layout. A path composed here would be a second answer to a
    // question the renderer already answers, and the two would diverge the
    // moment the draft lane's workspace rule changed.
    const prefix = `packet ${stepId}: `;
    const line = (r.stderr || "").split("\n").find((l) => l.startsWith(prefix));
    if (!line) {
      fail("the realization lane rendered a Packet and did not say where it stored it, so this "
        + "cannot show a reviewer the input the correction is written from. Its output, "
        + `verbatim:\n${(r.stderr || r.stdout || "(no output)").trim()}`);
    }
    const freshPath = line.slice(prefix.length).trim();
    if (!existsSync(freshPath)) fail(`the realization lane named a Packet at ${freshPath} and no file is there`);
    const fresh = readFileSync(freshPath, "utf8");
    const block = renderCorrectionBlock(step, correctionEvidence(joinRec, stepId, items));
    const dest = correctionInputPath(ws, run, stepId);
    writeFileSync(dest, (fresh.endsWith("\n") ? fresh : fresh + "\n") + block);
    run.correction_inputs = run.correction_inputs || {};
    run.correction_inputs[stepId] = {
      path: dest, packet: freshPath, packet_sha: sha256(fresh),
      prose: step.prose, rendered_at: new Date().toISOString(),
    };
    run.correcting = { step_id: stepId, input: dest, since: new Date().toISOString() };
    writeRun(ws, run);
    process.stdout.write(
      `correction input: ${dest}\n`
      + "  It is the Packet re-rendered against the article AS IT NOW STANDS — the \"article so\n"
      + "  far\" block holds the current preceding prose, corrections included — with one\n"
      + "  Correction block appended carrying the previous realization, what failed, and what\n"
      + "  must go on holding.\n"
      + `Realize the Step from it, then record with\n`
      + `  <the corrected prose> | node src/review-draft.mjs correct --draft ${relative(process.cwd(), draft.path) || draft.path} --step ${stepId}\n`
      + "Until then this run is MID-CORRECTION on this Step: its Packet is the freshly rendered\n"
      + "one and its prose is still the old realization, so every other act refuses by name\n"
      + "rather than reporting a comparison between prose and an input that did not produce it.\n");
    return;
  }

  // --- phase B: record the corrected realization -------------------------
  const input = (run.correction_inputs || {})[stepId];
  // THE RENDERED-INPUT GUARD, the same one `outline` has and for the same
  // reason. Prose handed back for a Step whose correction input was never
  // rendered was written against something else — the old Packet, or the
  // finding text alone — and afterwards there is no way to tell which.
  if (!input) {
    fail(`step ${stepId} has no rendered correction input, so this prose was not written against `
      + `one. Render it first:\n  node src/review-draft.mjs correct --draft `
      + `${relative(process.cwd(), draft.path) || draft.path} --step ${stepId}`);
  }

  // THE PREVIOUS PROSE AND THE FRESH PACKET COME FROM THE PHASE-A RECORD, not
  // from the Draft. The Draft is mid-correction by construction here — its
  // trace names the re-rendered Packet beside prose the old one produced — so
  // resolving it would refuse on a state this act exists to end.
  const before = input.prose;
  const declared = declaredFor({ step_id: stepId, packet_path: input.packet }, items);
  const packetLines = driftBlocks(declared, items);

  // SNAPSHOTS LAND IN THE REVIEW WORKSPACE, before and after each correction —
  // the Draft is the artifact and this is the only record of what a correction
  // moved. Written before the lane is entered, so a correction the lane refuses
  // still leaves the before-state.
  const snapDir = join(ws, "snapshots");
  mkdirSync(snapDir, { recursive: true });
  const seq = String((run.corrections || []).length + 1).padStart(2, "0");
  writeFileSync(join(snapDir, `${seq}-before-${stepId}.md`), draft.text);

  withReplyFile(reply, `${stepId}.prose.md`, (p) =>
    draftLane("section", draft, args, ["--step", stepId, "--file", p]));
  draftLane("emit", draft, args, []);

  // The Draft is a different document now: new prose, new line ranges, and a
  // new body sha. Re-read it rather than patching the record — the trace is the
  // join key and `emit` is what writes it.
  const after = readDraft(draftPath);
  const afterSteps = resolveInputs(after).steps;
  const corrected = afterSteps.find((s) => s.step_id === stepId);
  if (!corrected) fail(`step ${stepId} is absent from the re-emitted Draft's trace`);
  writeFileSync(join(snapDir, `${seq}-after-${stepId}.md`), after.text);

  const drift = driftOf(before, corrected.prose, packetLines, items.thresholds.verbatim_overlap_words);
  const ev = correctionEvidence(joinRec, stepId, items);
  run.corrections = run.corrections || [];
  run.corrections.push({
    step_id: stepId,
    seat: "prose",
    // PASS ONE, AND IT IS THE PASS WHOSE VERDICTS SENT THE STEP HERE rather
    // than whichever pass the run has reached — the same reading
    // `correctionInputPath` files the input under.
    pass: 1,
    what: `re-realized from a Packet re-rendered against the article as it stood, with a Correction `
      + `block carrying ${ev.failed.length} failed item(s) and ${ev.held.length} held preserved item(s)`,
    failed_items: ev.failed.map((f) => f.item),
    held_preserved: ev.held.map((h) => h.item),
    input: input.path,
    packet_sha: input.packet_sha,
    snapshot_before: join(snapDir, `${seq}-before-${stepId}.md`),
    snapshot_after: join(snapDir, `${seq}-after-${stepId}.md`),
    corrected_at: new Date().toISOString(),
    ...drift,
  });

  // The run record follows the Draft. And the corrected Step's Reverse Outline is
  // discarded: the blind reviewer read prose that no longer exists, so keeping
  // the record would let pass two re-judge new prose against an old reading —
  // which is the failure mode this whole Harness is about, one layer in.
  run.body_sha = after.body_sha;
  delete run.correcting;
  // A CORRECTION RE-OPENS THE NEXT PASS. Its bound gains this Step and this
  // Step's successor, and the answers already given for pairs the widened bound
  // now covers were given about prose that has since moved.
  delete run.pass_open_at;
  delete run.pass_cleared;
  run.steps = afterSteps.map((s) => ({
    step_id: s.step_id, section: s.section, section_title: s.section_title,
    lines: s.lines, packet: s.packet, packet_sha: s.packet_sha,
  }));
  delete run.outlineFields[stepId];
  delete run.rendered[stepId];
  writeRun(ws, run);

  const stillOwed = seatsStillOwed(run, items);
  process.stdout.write(
    `corrected: ${stepId}\n`
    + `  drift   ${drift.change_share}\n`
    + `          ${drift.packet_overlap}\n`
    + `  reported, never gated — what a high share means is the owner's reading\n`
    + `  snapshots ${join(snapDir, `${seq}-before-${stepId}.md`)}\n`
    + `            ${join(snapDir, `${seq}-after-${stepId}.md`)}\n`
    + (stillOwed.length
      ? `still owed a correction, in path order: ${stillOwed.join(", ")}\n`
      : "every Step pass one sent to correction has been corrected. `check --draft <draft.md>` is pass two.\n"));
}

// THE SECOND PASS'S BOUND. Three arms, and the item ids come from the table
// rather than from this file (see `pass_two` there):
//
//   - a corrected Step, on its own failed items and its held preserved items;
//   - the Step immediately AFTER each corrected Step, on the continuity items
//     the table names — the correction moved the prose that Step continues
//     from;
//   - every mechanical item, over the whole Draft.
//
// Nothing else is re-judged, and "nothing else" is the point rather than a
// saving: pass two exists to answer what the correction changed, and re-judging
// an untouched pair would put a second reading beside a recorded one with
// nothing to distinguish them.
function passTwoBound(run, items) {
  // THE ARM MUST BE NON-EMPTY, AND ITS SIZE IS THE TABLE'S (kogaki#1014). This
  // read for a pair of exactly two, which was the runtime restating a layout the
  // table owns: when `restates-earlier-step` left under the hygiene decline the
  // count went to one, and a run whose bound was correct refused on the number.
  // What the refusal is actually for is an EMPTY arm — pass two over the
  // corrections alone, reporting continuity it never looked at — so that is
  // what it now says.
  const declaredSuccessor = (items.pass_two || {}).successor_items;
  if (!Array.isArray(declaredSuccessor) || declaredSuccessor.length === 0) {
    fail("the item table declares no `pass_two.successor_items`, and the bounded second pass "
      + "re-checks each corrected Step's successor on the continuity items it names. A bound with "
      + "no successor arm would pass two over the corrections alone and report continuity it never "
      + "looked at.");
  }
  const known = new Set(items.items.map((i) => i.id));
  const missing = declaredSuccessor.filter((id) => !known.has(id));
  if (missing.length) {
    fail(`the item table's \`pass_two.successor_items\` names ${missing.join(", ")}, which the table `
      + "declares no item for — the bound and the item set disagree, and a successor arm keyed on "
      + "an item nobody computes re-checks nothing while reporting that it did.");
  }
  const mechanical = new Set(items.items.filter((i) => i.mode === "mechanical").map((i) => i.id));
  const order = run.steps.map((s) => s.step_id);
  const corrected = new Set((run.corrections || []).map((c) => c.step_id));
  const successors = new Set();
  for (const id of corrected) {
    const i = order.indexOf(id);
    if (i !== -1 && i + 1 < order.length) successors.add(order[i + 1]);
  }
  const own = new Map();
  for (const c of run.corrections || []) {
    const set = own.get(c.step_id) || new Set();
    for (const it of [...(c.failed_items || []), ...(c.held_preserved || [])]) set.add(it);
    own.set(c.step_id, set);
  }
  const inBound = (stepId, itemId) => mechanical.has(itemId)
    || (own.has(stepId) && own.get(stepId).has(itemId))
    || (successors.has(stepId) && declaredSuccessor.includes(itemId));
  return { inBound, corrected, successors, mechanical, successorItems: declaredSuccessor };
}

// ---------------------------------------------------------------------------
// THE REGRESSION GUARD, AND THE TWO PASSES SIDE BY SIDE (kogaki#1135).
//
// WHAT WAS OBSERVED. In the first full review run, a corrected Step FAILED in
// pass two an item it had HELD in pass one. The Harness recorded that as
// residue, indistinguishable from an item that failed in both passes, and
// nothing put the Step's pass-one prose back — so the run's product was an
// article the review had made worse on a dimension the review itself measured,
// reported as an item for the owner to classify.
//
// THE OWNER'S RULING (2026-09-17): `check` REFUSES A REGRESSION. The Step is
// restored to the prose it carried in pass one, through the realization lane
// that wrote it, and the item the correction was made for returns to residue as
// still failing — which is the true report: the correction was attempted, it
// broke something that held, and the state the run ends in is the state it
// started from with the original finding intact.
//
// ONLY THE REGRESSED STEP IS RESTORED, and later corrected Steps are neither
// restored nor marked. Continuity between Steps was settled at Reader Path
// design and holds while a Step is unchanged; ReviewDraft is not responsible for
// Step-to-Step continuity, so a restore that reached forward would be this
// Harness answering a question the Reader Path owns.
//
// THE CORRECTION INPUT IS UNCHANGED. The owner weighed an explicit
// edit-instruction stage and withdrew it: it would make some role responsible
// for repair advice whose quality nothing guarantees. A failure reason from the
// round trip is external feedback and stays what the corrector is handed.

// PASS ONE'S ANSWER PER (Step, item, pair), read off the pass-one join record
// rather than recomputed. A row with `pairs` answers per pair; a row the
// Harness decided carries its answer on the row itself and has none.
function passOneVerdicts(priorJoin) {
  const m = new Map();
  for (const r of priorJoin.results || []) {
    if (Array.isArray(r.pairs) && r.pairs.length) {
      for (const p of r.pairs) {
        m.set(verdictKey(r.step_id, r.item, p.pair), { ...p, class: r.class, item: r.item, step_id: r.step_id });
      }
    } else {
      m.set(verdictKey(r.step_id, r.item, r.pair === undefined ? null : r.pair), r);
    }
  }
  return m;
}

// THE PAIRS A CORRECTED STEP LOST. Computed from the two records rather than
// from the correction's own `held_preserved` list, which names ITEMS and is
// per seat: the unit the restore turns on is the pair, and the two records are
// where a pair's two readings sit. The class rule is the one that decides every
// other consequence in this Harness — a PRESERVED item's fail is what sends a
// Step to correction and what becomes residue, so it is what a regression is
// measured on. A best-effort item that stops holding rides along exactly as its
// fail does.
function regressedPairs(run, priorJoin, results) {
  const corrected = new Set((run.corrections || []).map((c) => c.step_id));
  const one = passOneVerdicts(priorJoin);
  const out = [];
  for (const r of results) {
    if (r.carried || r.owed || !corrected.has(r.step_id) || r.class !== "preserved") continue;
    const pairs = Array.isArray(r.pairs) && r.pairs.length
      ? r.pairs
      : [{ pair: r.pair === undefined ? null : r.pair, verdict: r.verdict, reason: r.reason }];
    for (const p of pairs) {
      const key = verdictKey(r.step_id, r.item, p.pair);
      const before = one.get(key);
      if (!before || before.verdict !== "holds" || p.verdict !== "fails") continue;
      out.push({ key, step_id: r.step_id, item: r.item, pair: p.pair === undefined ? null : p.pair,
        pass_1: "holds", pass_2: "fails", reason: p.reason });
    }
  }
  return out;
}

// RESTORE ONE STEP, THROUGH THE REALIZATION LANE. The same door `correct` used
// to move the prose is the door that moves it back — a restore that wrote the
// Draft here would be a second writer of the trace, which is the reason
// `correct` enters the lane as a subprocess in the first place.
//
// EVERY SEAT THE STEP WAS CORRECTED IN GOES BACK, prose before figure, in the
// order `correct` itself enforces and for its reason: the record's caption is
// stated in what the reader holds after reading the passage. A Step corrected
// in one seat restores one.
//
// PASS ONE'S READING COMES BACK WITH THE PROSE. The Reverse Outline pointer
// returns to pass one's file and pass one's judged answers are written back
// into the run's verdicts, because the prose those answers were given on is the
// prose the Draft now carries again. Leaving pass two's answers beside restored
// prose would be the defect this Harness exists to refuse — a recorded reading
// about text that is gone — with the two halves swapped.
function restoreRegressedStep(args, { draft, draftPath, ws, run, stepId, regressed, passTwoRows, priorJoin }) {
  const inputs = run.correction_inputs || {};
  const seats = (run.corrections || []).filter((c) => c.step_id === stepId)
    .map((c) => c.seat || "prose");
  const ordered = [...new Set(["prose", "figure"].filter((s) => seats.includes(s)))];
  const snapDir = join(ws, "snapshots");
  mkdirSync(snapDir, { recursive: true });
  const seq = String((run.restores || []).length + 1).padStart(2, "0");
  const before = join(snapDir, `r${seq}-before-restore-${stepId}.md`);
  writeFileSync(before, draft.text);

  for (const seat of ordered) {
    if (seat === "prose") {
      const rec = inputs[stepId];
      // A REFUSAL, NEVER A SILENT SKIP. `correct` phase A reads the previous
      // prose out while the Draft is still consistent and records it; a run
      // whose record does not carry it cannot be put back, and continuing
      // would leave the regressed prose in the article under a record saying
      // it was restored.
      if (!rec || typeof rec.prose !== "string") {
        fail(`step ${stepId} failed in pass two an item it held in pass one, and this run's record `
          + "carries no copy of the prose it held that item on, so there is nothing to restore it "
          + "to. `correct` records the previous realization when it renders the correction input; a "
          + "run whose record predates that cannot be restored, and re-opening the review on the "
          + "current article is what starts one that can.");
      }
      withReplyFile(rec.prose.endsWith("\n") ? rec.prose : rec.prose + "\n", `${stepId}.prose.md`,
        (p) => draftLane("section", draft, args, ["--step", stepId, "--file", p]));
    } else {
      const rec = inputs[`${stepId}#figure`];
      if (!rec || typeof rec.record_text !== "string") {
        fail(`step ${stepId}'s FIGURE was corrected and regressed in pass two, and this run's `
          + "record carries no copy of the figure record the reader met, so there is nothing to "
          + "restore it to. Re-open the review on the current article.");
      }
      withReplyFile(rec.record_text, `${stepId}.figure.json`,
        (p) => draftLane("figure", draft, args, ["--step", stepId, "--file", p]));
    }
  }
  draftLane("emit", draft, args, []);

  const after = readDraft(draftPath);
  const afterSteps = resolveInputs(after).steps;
  const restored = afterSteps.find((s) => s.step_id === stepId);
  if (!restored) fail(`step ${stepId} is absent from the re-emitted Draft's trace after its restore`);
  // THE RESTORE IS CHECKED RATHER THAN CLAIMED. The lane re-assembles the body,
  // and prose that came back different from the prose handed in would leave the
  // run reporting a restore it did not make — the one failure this act cannot
  // be allowed to make quietly, since everything downstream now reads pass
  // one's verdicts against it.
  if (ordered.includes("prose") && restored.prose.trim() !== String(inputs[stepId].prose).trim()) {
    fail(`step ${stepId} was handed its pass-one prose and the re-emitted Draft carries something `
      + "else, so the restore did not land. Nothing further is recorded: pass one's verdicts would "
      + "otherwise be read against prose they were not given on.");
  }
  writeFileSync(join(snapDir, `r${seq}-after-restore-${stepId}.md`), after.text);

  run.body_sha = after.body_sha;
  run.steps = afterSteps.map((s) => ({
    step_id: s.step_id, section: s.section, section_title: s.section_title,
    lines: s.lines, packet: s.packet, packet_sha: s.packet_sha,
  }));
  run.outlineFields[stepId] = passReadPath(ws, 1, "outline", `${stepId}.json`);
  if ((run.figureOutlineFields || {})[stepId]) {
    run.figureOutlineFields[stepId] = passReadPath(ws, 1, "outline", `${stepId}.figure.json`);
  }
  const one = passOneVerdicts(priorJoin);
  run.verdicts = run.verdicts || {};
  let reinstated = 0;
  for (const [key, v] of one) {
    if (v.step_id !== undefined && v.step_id !== stepId) continue;
    if (!key.startsWith(`${stepId}/`)) continue;
    // ONLY A JUDGED ANSWER IS WRITTEN BACK. A mechanical item, a stated absence
    // and an empty reverse side are COMPUTED from the Draft on every build, so
    // recording one as a verdict would replace a fact with a copy of itself
    // taken at another time — which `recordVerdicts` refuses by name when a
    // session tries it.
    if (v.judged !== true) continue;
    run.verdicts[key] = { key, step_id: stepId, item: v.item, pair: v.pair === undefined ? null : v.pair,
      verdict: v.verdict, reason: v.reason, model: v.model ?? null };
    reinstated++;
  }

  run.restores = run.restores || [];
  run.restores.push({
    step_id: stepId,
    seats: ordered,
    pass: 2,
    what: `restored to the prose this Step carried in pass one, through the realization lane, `
      + `because pass two failed ${regressed.length} item pair(s) it had held`,
    regressed: regressed.map((r) => ({ item: r.item, pair: r.pair, pass_1: r.pass_1,
      pass_2: r.pass_2, reason: r.reason })),
    // PASS TWO'S OWN ANSWERS FOR THIS STEP, KEPT. They are not the run's
    // reading any more — the prose they were given on is gone — and they are
    // the evidence that the restore happened at all, which is what `passes.json`
    // renders in its `pass_2` column for these rows.
    pass_two_rows: passTwoRows,
    verdicts_reinstated: reinstated,
    snapshot_before: before,
    snapshot_after: join(snapDir, `r${seq}-after-restore-${stepId}.md`),
    restored_at: new Date().toISOString(),
  });
  return after;
}

// THE TWO PASSES SIDE BY SIDE, ONE ROW PER (Step, item, pair) — `passes.json`
// at the run root (kogaki#1135). Comparing the passes meant reading
// `pass-1/join.json` and `pass-2/check.json` side by side by hand, and the
// question a reader actually has of them — what did this pass DO to this pair —
// is one word that neither record carries.
//
// JSON, NOT MARKDOWN, by the owner's ruling: it is a derived record for reading
// against the two it is derived from, and the prose surface a person reads is
// `review.md`.
//
// THE ROWS ARE PASS ONE'S KEYS. Pass one is the unbounded join over every Step,
// item and pair, so it is the complete index; a key pass two produced that pass
// one never answered is reported in `pass_two_only` rather than given an
// outcome word, because none of the five is true of a pair with one reading.
const PASS_OUTCOMES = ["held", "fixed", "still-failing", "regressed", "carried"];
function buildPasses(run, priorJoin, results) {
  const one = passOneVerdicts(priorJoin);
  const two = new Map();
  const carried = new Set();
  const rowsOf = (rs) => {
    const out = [];
    for (const r of rs) {
      if (Array.isArray(r.pairs) && r.pairs.length) {
        for (const p of r.pairs) out.push([verdictKey(r.step_id, r.item, p.pair), p, r]);
      } else {
        out.push([verdictKey(r.step_id, r.item, r.pair === undefined ? null : r.pair), r, r]);
      }
    }
    return out;
  };
  for (const [key, p, r] of rowsOf(results)) {
    two.set(key, p);
    if (r.carried) carried.add(key);
  }
  // A RESTORED STEP'S `pass_2` IS THE ANSWER PASS TWO GAVE, not the pass-one
  // answer the restore put back in its place. The restore is what this file has
  // to be able to show, and showing `holds`/`holds` for a pair that regressed
  // would erase the very event the guard fired on.
  for (const rec of run.restores || []) {
    for (const [key, p] of rowsOf(rec.pass_two_rows || [])) { two.set(key, p); carried.delete(key); }
  }

  const rows = [];
  const counts = Object.fromEntries(PASS_OUTCOMES.map((w) => [w, 0]));
  for (const [key, before] of one) {
    const after = two.get(key);
    const p1 = before.verdict ?? null;
    const reJudged = after !== undefined && !carried.has(key) && after.verdict !== undefined;
    const p2 = reJudged ? after.verdict : null;
    const outcome = !reJudged
      ? "carried"
      : (p1 === "holds"
        ? (p2 === "holds" ? "held" : "regressed")
        : (p2 === "holds" ? "fixed" : "still-failing"));
    counts[outcome]++;
    rows.push({ step_id: before.step_id ?? key.split("/")[0], item: before.item,
      pair: before.pair === undefined ? null : before.pair,
      class: before.class ?? null, pass_1: p1, pass_2: p2, outcome });
  }
  const passTwoOnly = [...two.keys()].filter((k) => !one.has(k));
  return { rows, counts, pass_two_only: passTwoOnly };
}

function cmdCheck(args) {
  const draftPath = argString(args, "draft", "usage: review-draft check --draft <draft.md>   (verdicts on standard input record them)");
  // The same two-phase selection `compare` makes, and read at the same point
  // and for the same reason (kogaki#1100).
  const reply = readReply();
  // `let`, BECAUSE THE RESTORE RE-READS IT (kogaki#1135). A regressed Step is
  // put back through the realization lane, which re-emits the article — so from
  // that point on the Draft this act holds is a different document, and the
  // join is rebuilt against the one on disk rather than against the one this
  // line read.
  let draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);
  // The ordering refusal is THIS artifact's and lands now, because it is a
  // property of the flow rather than of the second pass: pass two re-checks
  // what pass one found, and there is nothing to re-check before `compare`.
  if (!run.compared_at) {
    fail("`check` is pass two and there is no pass one — run `compare --draft <draft.md>` first. "
      + "Pass two re-runs outline and the join only for the corrected Steps, their successors' "
      + "continuity items and the mechanical items, so it has nothing to narrow to until the join has run.");
  }

  const items = readItems();
  const bound = passTwoBound(run, items);
  const priorJoin = readJoin(ws);

  // A RE-JUDGED PAIR'S PASS-ONE ANSWER IS DISCARDED WHEN THE PASS OPENS, AND
  // EXACTLY ONCE. `buildJoin` reads recorded verdicts, so leaving them would
  // make every in-bound judged pair answer itself with pass one's reading and
  // report a second pass that asked nothing — and clearing them on EVERY
  // invocation would delete pass two's own answers as fast as they were
  // recorded, which is the same silence one turn later. `correct` clears the
  // marker, so a correction landing after the pass opened re-opens it.
  //
  // AND THE PASS NUMBER MOVES HERE, BEFORE ANY EVIDENCE IS WRITTEN (kogaki#994).
  // The Reverse Outlining below is THIS pass's reading, so it belongs in this
  // pass's directory; setting the number after it would file pass two's re-read
  // under pass one and overwrite exactly the record the split exists to keep.
  //
  // THE NUMBER IS THE PASS THIS COMMAND IS, NOT A COUNTER. `check` IS pass two,
  // and a correction landing after it re-OPENS pass two — a widened bound and
  // cleared verdicts over the same corrected Steps — rather than starting a
  // third. So a re-entry sets 2 again, and its re-rendered inputs land beside
  // the ones it is replacing, which is within-pass and is what `correct`
  // discarding the Reverse Outline already means. A genuine third pass would
  // be a third act, and it gets `pass-3/` with nothing else moving.
  if (!run.pass_open_at) {
    const verdicts = run.verdicts || {};
    let cleared = 0;
    for (const key of Object.keys(verdicts)) {
      const call = (priorJoin.model_calls || []).find((c) => verdictKey(c.step_id, c.item, c.pair) === key);
      if (call && bound.inBound(call.step_id, call.item)) { delete verdicts[key]; cleared++; }
    }
    run.verdicts = verdicts;
    run.pass = 2;
    run.pass_open_at = new Date().toISOString();
    run.pass_cleared = cleared;
    writeRun(ws, run);
  }

  // REVERSE OUTLINING IS RE-RUN FOR THE CORRECTED STEPS AND FOR NO OTHERS. `correct`
  // discarded each corrected Step's Reverse Outline because the reviewer read
  // prose that no longer exists; this renders the input again and refuses until
  // it comes back, which is the same blind round trip pass one made and not a
  // cheaper stand-in for it.
  const steps = resolveInputs(draft).steps;
  const owedOutline = [...bound.corrected].filter((id) => !run.outlineFields[id]);
  if (owedOutline.length) {
    const order = run.steps.map((s) => s.step_id);
    owedOutline.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const id of owedOutline) {
      if (run.rendered[id]) continue;
      run.rendered[id] = renderReverseOutlineInput(ws, run, draft, steps.find((s) => s.step_id === id), steps);
    }
    writeRun(ws, run);
    fail(`pass two re-runs Reverse Outlining for every corrected Step, and `
      + `${owedOutline.length} ${owedOutline.length === 1 ? "is" : "are"} outstanding. The prose `
      + "these Steps carry now is not the prose the first Reverse Outline read, so the recorded reading is "
      + `about text that is gone.\n`
      + owedOutline.map((id) => `  ${id}  ${run.rendered[id]}`).join("\n") + "\n"
      + "Read each blind and record it with `<reverse outline> | outline --draft <draft.md> --step <id>`, "
      + "then run `check` again.");
  }

  // PASS TWO ANSWERS ITS OWN OWED SET, through `check`'s own stream and never
  // through `compare`'s. Routing them through `compare` would rebuild the
  // UNBOUNDED join against the corrected Draft — re-rendering a join Packet for
  // every pair, overwriting the pass-one record this pass carries from, and
  // resetting `compared_at` to a comparison nobody made. The two passes have
  // different owed sets by construction, so they need different doors.
  let pass = buildJoin(draft, run, items, ws,
    { pass: currentPass(run), bound: bound.inBound, carry: priorJoin.results || [] });
  let recorded = 0;
  if (reply.trim() !== "") {
    recorded = recordVerdicts(run, reply, pass.owed, items);
    pass = buildJoin(draft, run, items, ws,
      { pass: currentPass(run), bound: bound.inBound, carry: priorJoin.results || [] });
  }
  // --- THE REGRESSION GUARD (kogaki#1135) ---------------------------------
  // It fires only on a COMPLETE pass: a pair still owed has no pass-two answer,
  // and a Step restored on a partial reading would be put back for a regression
  // the rest of the pass might not have found — and the restore is not an act
  // that can be taken twice.
  //
  // A STEP ALREADY RESTORED IS NOT RESTORED AGAIN. Verdicts are revisable by
  // design, so a later answer can fail the same pair a second time; the prose
  // is already pass one's by then, and a second restore would write a second
  // record of one event.
  const restoredAlready = new Set((run.restores || []).map((r) => r.step_id));
  let restoredNow = [];
  if (pass.owed.length === 0) {
    const regressed = regressedPairs(run, priorJoin, pass.results)
      .filter((r) => !restoredAlready.has(r.step_id));
    // IN PATH ORDER, the order every act that moves prose runs in.
    const order = run.steps.map((s) => s.step_id);
    const steps = [...new Set(regressed.map((r) => r.step_id))]
      .sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const stepId of steps) {
      draft = restoreRegressedStep(args, {
        draft, draftPath, ws, run, stepId, priorJoin,
        regressed: regressed.filter((r) => r.step_id === stepId),
        passTwoRows: pass.results.filter((r) => r.step_id === stepId),
      });
      restoredNow.push(stepId);
    }
    if (restoredNow.length) {
      writeRun(ws, run);
      // THE JOIN IS REBUILT AGAINST THE RESTORED ARTICLE, and this is what
      // makes the rest of this command true rather than a report about a Draft
      // that no longer exists: the pair inputs are re-rendered from the prose
      // the reader now meets, and the verdicts they carry are the ones pass one
      // gave on exactly that prose.
      pass = buildJoin(draft, run, items, ws,
        { pass: currentPass(run), bound: bound.inBound, carry: priorJoin.results || [] });
    }
  }
  const restoredSteps = new Set((run.restores || []).map((r) => r.step_id));
  // A ROW ON A RESTORED STEP SAYS SO. Its verdict is pass one's and its prose
  // is pass one's, and a reader who could not tell it from a pair pass two
  // re-judged and found holding would read the regression as never having
  // happened.
  for (const r of pass.results) if (restoredSteps.has(r.step_id)) r.restored = true;

  const { results, owed, modelCalls, mechanicalLog } = pass;
  const complete = owed.length === 0;
  const cleared = run.pass_cleared || 0;
  if (recorded) process.stdout.write(`recorded: ${recorded} verdict(s)\n`);

  const joinPath = passPath(ws, run, "check.json");
  writeFileSync(joinPath, JSON.stringify({
    draft: run.draft, body_sha: run.body_sha,
    checked_at: complete ? new Date().toISOString() : null,
    item_table_version: items.version,
    complete,
    // THE BOUND IS RECORDED, not only applied. A reader of this file can see
    // which Steps and items pass two actually re-judged, which is what makes
    // "bounded" checkable rather than claimed — the same move the pass-one
    // record makes for "decided mechanically".
    bound: {
      corrected: [...bound.corrected],
      successors: [...bound.successors],
      successor_items: bound.successorItems,
      mechanical_items: [...bound.mechanical],
      verdicts_cleared: cleared,
    },
    // WHAT PASS TWO PUT BACK (kogaki#1135), on the pass's own record rather
    // than only in `run.json`: a reader of this file sees rows carrying pass
    // one's verdicts on a corrected Step, and without this line the only
    // reading of that is a second pass that agreed with the first.
    restores: (run.restores || []).map((r) => ({
      step_id: r.step_id, seats: r.seats, regressed: r.regressed,
      snapshot_before: r.snapshot_before, snapshot_after: r.snapshot_after,
      restored_at: r.restored_at,
    })),
    results,
    owed,
    model_calls: modelCalls,
    mechanical: mechanicalLog,
  }, null, 2) + "\n");

  if (!complete) {
    process.stdout.write(
      `check: pass two, bounded — ${bound.corrected.size} corrected Step(s), `
      + `${bound.successors.size} successor(s), ${bound.mechanical.size} mechanical item(s) over the whole Draft.\n`
      + `${mechanicalLog.length} pair(s) decided mechanically, no model call.\n`
      + `${owed.length} pair(s) await a verdict — one join Packet each:\n`
      + owed.map((o) => `  ${o.key}  ${o.packet}`).join("\n") + "\n"
      + "Answer each with one of holds / fails / cannot-decide plus one sentence, then\n"
      + `  <verdicts.json> | node src/review-draft.mjs check --draft ${relative(process.cwd(), draft.path) || draft.path}\n`
      + `check record: ${joinPath}\n`
      + "The regression guard and `passes.json` land when the pass is complete: a pair with no\n"
      + "answer yet has no pass-two verdict to compare against pass one's.\n");
    // THE RUN RECORD IS WRITTEN ON THIS EXIT TOO (PR #1004 round 1, finding 3).
    // `buildJoin` registered pass two's join inputs in `run.pass_files` and
    // `recordVerdicts` may have taken answers into `run.verdicts`; a return
    // that dropped both would keep the pass ledger true only on the completing
    // call and hand a partially-answered pass back to the reviewer to answer
    // again.
    writeRun(ws, run);
    return;
  }

  run.findings = results.filter((r) => r.verdict !== "holds");
  // RESIDUE IS WHAT SURVIVED TWO PASSES, and only a PRESERVED item's fail is
  // residue — the same class rule that decides what withholds `close`.
  //
  // EVERY LINE STATES WHICH IT IS (PR #906 round 1, finding 1). Declining to
  // correct is a legitimate route — `close` is reachable from `check` in every
  // state, by the owner's two-pass ruling — but a run that took it was writing
  // "still failing after pass two" onto pairs pass two never re-judged, which
  // is a provenance claim the run did not earn, handed to the owner as the
  // basis for classifying the item `packet` or `reviewdraft`. The route stays
  // open and the claim is now true either way: a re-judged fail says it
  // survived, a carried one says its Step was never corrected so nothing
  // re-read it.
  run.residue = run.findings
    .filter((f) => f.verdict === "fails" && f.class === "preserved")
    .map((f) => ({
      step_id: f.step_id, item: f.item,
      // WHAT THE OWNER RECORD'S POINTERS ARE COMPOSED FROM, kept on the row: the
      // pass that read it (a carried row is pass one's whatever pass the run
      // reached) and whether a judge was handed a Packet for the chosen pair.
      pair: f.pair, carried: Boolean(f.carried), judged: chosenJudged(f),
      // A RESTORED STEP'S RESIDUE SAYS WHICH PROSE IT IS ABOUT (kogaki#1135).
      // Its Step was corrected and the correction was UNDONE, so "still failing
      // after pass two" is true of the item and silent about the article: the
      // prose the owner will open is pass one's, and the correction that was
      // meant to fix this item is not in it.
      ...(f.restored ? { restored: true } : {}),
      why: f.carried
        ? `${f.reason} — carried from pass one and NOT re-judged: this Step was not corrected, `
          + "so nothing in pass two read it again"
        : (f.restored
          ? `${f.reason} — still failing, and the correction made for it was UNDONE: pass two `
            + "failed an item this Step had held, so the Step was restored to its pass-one prose "
            + "and this is that prose's own finding, unchanged"
          : `${f.reason} — still failing after pass two`),
    }));
  run.checked_at = new Date().toISOString();

  // `passes.json` AT THE RUN ROOT (kogaki#1135). Written once the pass is
  // COMPLETE and not before: a row whose `pass_2` is "not answered yet" would
  // need a sixth outcome word for a state that is not an outcome, and the two
  // records this one is derived from are already on disk for anyone reading a
  // pass mid-flight.
  //
  // AT THE ROOT rather than under a pass, and that is the layout's own rule
  // rather than an exception to it: it is the one record that is about BOTH
  // passes, like `run.json` and `snapshots/`, so it belongs where they are. A
  // copy under `pass-2/` would be pass two writing a claim about pass one's
  // reading in pass one's own vocabulary.
  const passesPath = join(ws, "passes.json");
  const passes = buildPasses(run, priorJoin, results);
  writeFileSync(passesPath, JSON.stringify({
    draft: run.draft, body_sha: run.body_sha, written_at: run.checked_at,
    outcomes: passes.counts,
    // A key pass two produced that pass one never answered. Empty on every run
    // this Harness can currently produce, and named rather than dropped: the
    // five outcome words are all about a pair with two readings, and a pair
    // with one is a disagreement between the passes about what exists.
    pass_two_only: passes.pass_two_only,
    rows: passes.rows,
  }, null, 2) + "\n");
  run.passes_file = passesPath;

  writeRun(ws, run);

  const judged = modelCalls.length;
  // NAMED IN THE RUN'S OWN OUTPUT, not only in the record. A pass two that
  // completed because nothing was corrected and a pass two that completed
  // because every correction was made produce the same exit, and telling them
  // apart is exactly what "stopping early and finishing produce the same
  // silence" warns about.
  // PER SEAT, NOT PER STEP (kogaki#945). `bound.corrected` holds every Step
  // carrying ANY correction, so keying this line on it reported nothing for a
  // Step that owed both seats and received one — the seat still owed went
  // unnamed while its preserved fails were carried as residue.
  const uncorrected = seatsStillOwed(run, items);
  process.stdout.write(
    results.filter((r) => !r.carried).map(comparisonLine).join("\n") + "\n\n"
    + `check: pass two over ${results.filter((r) => !r.carried).length} re-judged (Step, item) pair(s); `
    + `${results.filter((r) => r.carried).length} carried unchanged from pass one.\n`
    + `  corrected Steps      ${[...bound.corrected].join(", ") || "(none)"}\n`
    + `  successors re-checked ${[...bound.successors].join(", ") || "(none)"} on ${bound.successorItems.join(", ")}\n`
    + `  mechanical items      re-run over every Step\n`
    + `${mechanicalLog.length} pair(s) decided mechanically and ${judged} judged.\n`
    + judgedByLine(modelCalls)
    + (uncorrected.length
      ? `UNCORRECTED — pass one sent these to correction and they are still owed: ${uncorrected.join(", ")}.\n`
        + "  An entry marked `(--figure)` is the figure seat; the rest are the passage. A Step can\n"
        + "  appear on both, and a Step that received one seat still appears for the other.\n"
        + "  Their preserved fails are residue CARRIED from pass one, not re-judged by this pass;\n"
        + "  the owner record says so per line. `correct --step <id> [--figure]` is the act that changes that.\n"
      : "")
    + (restoredNow.length
      ? `RESTORED — pass two failed an item these Steps had HELD in pass one, so each is back at `
        + `its pass-one prose: ${restoredNow.join(", ")}.\n`
        + "  The correction was undone, not adjusted, and the item it was made for is residue\n"
        + "  again. Only the regressed Step moved: a later corrected Step keeps its corrected\n"
        + "  prose and carries no mark, because Step-to-Step continuity is the Reader Path's and\n"
        + "  not this Harness's.\n"
        + (run.restores || []).filter((r) => restoredNow.includes(r.step_id))
          .map((r) => `  ${r.step_id}  held then failed: `
            + `${r.regressed.map((x) => x.item).join(", ")}\n`
            + `          snapshots ${r.snapshot_before}\n`
            + `                    ${r.snapshot_after}\n`).join("")
      : "")
    + (run.residue.length
      ? `residue — preserved item(s) reaching the owner to classify: `
        + `${run.residue.map((r) => `${r.step_id}/${r.item}`).join(", ")}\n`
      : "no preserved item fails after pass two, so the residue is empty.\n")
    + `check record: ${joinPath}\n`
    + `both passes:  ${passesPath} — one row per Step, item and pair, with each pass's\n`
    + "              verdict and one outcome word: "
    + `${PASS_OUTCOMES.join(", ")}.\n`
    + "`close --draft <draft.md>` writes the owner record.\n");
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
// The pass-directory pointers item 4 of kogaki#994 asks for, rendered from the
// passes the run actually made rather than from the layout constant — a run that
// never reached `check` has no `pass-2/`, and naming one would send a reader to
// a directory nothing wrote.
// The outline record and the join input a single verdict rests on. Rendered
// from the same rule the writers compose their paths with, so a reader following
// one lands on the file the judge was actually handed.
//
// BOTH HALVES ARE READ OFF THE ROW, NEVER OFF THE SECTION IT RENDERS IN (PR
// #1004 round 2, findings 5 and 6). Which pass read a row: a carried row was
// read by pass one whatever pass the run has reached, and every other row by
// the last pass that ran. Whether a Packet exists for it: a Harness-decided
// line — a mechanical item, a stated absence, an empty reverse side, or a
// row whose chosen pair the Harness decided — never had a join Packet
// rendered, so no pointer to one is composed; the pass's join record says how
// it was decided, on the row's own `judged` key. Composing `pass-2/` for a carried row, or a Packet name for a
// mechanical row, pointed the owner at files nothing ever wrote.
//
// THE OUTLINE RECORD IS THE ONE THE RUN READ, taken from the run record's
// own map rather than composed from the pass: pass two re-reads only the
// corrected Steps, so a successor Step's continuity item is judged in pass two
// against pass ONE's Reverse Outline, and `run.outlineFields` is the map every
// join reads from. A carried row's is pass one's by definition.
function evidencePass(run, f) {
  return f.carried ? 1 : (run.checked_at ? 2 : 1);
}
// THE CHOSEN PAIR'S `judged` IS READ BEFORE THE ROW'S, and the order is the
// whole of this function (kogaki#1134). Since `decided_by` became `judged` a
// join row carries the key too, and the row's is a fact about ALL its pairs —
// any one judged makes it true — while this read is about the ONE pair the row
// renders. On a hybrid row the two disagree, so a row-first read would report a
// Packet pointer for a line the Harness decided. A residue row has no `pairs`
// and its own `judged` IS the chosen pair's, written by `check` from this very
// read, so it falls through correctly.
function chosenJudged(f) {
  if (Array.isArray(f.pairs)) {
    const sub = f.pairs.find((p) => p.pair === f.pair);
    return sub ? sub.judged === true : false;
  }
  return f.judged === true;
}
// THE POINTER FOLLOWS THE ROW'S OWN SIDE, NEVER THE STEP ALONE (PR #1024 round
// 1). A figure row's reverse side is the FIGURE's Reverse Outline —
// `outline/<step>.figure.json`, written in the record's field names — and the
// passage's `outline/<step>.json` carries none of the reading such a verdict was
// given on. Composing one pointer per Step sent the owner to the wrong artifact
// for every `figure_only` row, which is the class PR #1004 round 2 repaired for
// the other rows. `figureIds` is read from the item table rather than spelled
// here, for the reason `figureItemIds` already states about itself.
function findingEvidencePaths(ws, run, f, figureIds = new Set()) {
  if (!f.step_id) return [];
  const pass = evidencePass(run, f);
  const rel = (...a) => relative(process.cwd(), join(ws, `pass-${pass}`, ...a))
    || join(ws, `pass-${pass}`, ...a);
  const isFigure = figureIds.has(f.item);
  const base = isFigure ? `${f.step_id}.figure.json` : `${f.step_id}.json`;
  const recorded = isFigure ? (run.figureOutlineFields || {}) : (run.outlineFields || {});
  const outlineFile = f.carried
    ? join(ws, "pass-1", "outline", base)
    : (recorded[f.step_id] || join(ws, `pass-${pass}`, "outline", base));
  const label = isFigure ? "the figure's Reverse Outline" : "Reverse Outline";
  const out = [`  - ${label}: \`${relative(process.cwd(), outlineFile) || outlineFile}\``];
  if (chosenJudged(f)) {
    const name = f.pair === null || f.pair === undefined
      ? `${f.step_id}.${f.item}.md` : `${f.step_id}.${f.item}.${f.pair}.md`;
    out.push(`  - the pair the judge saw: \`${rel("join", name)}\``);
  } else {
    out.push("  - the pair the judge saw: none — this line was not a judge's answer to a rendered "
      + `Packet; \`${rel(pass === 1 ? "join.json" : "check.json")}\` records how it was decided`);
  }
  return out;
}

function evidenceLines(ws, run) {
  const rel = (...a) => relative(process.cwd(), join(ws, ...a)) || join(ws, ...a);
  const out = [
    `- **Pass 1 — \`compare\`.** \`${rel("pass-1")}/\``,
    `  - \`outline-input/<step>.md\` — what the blind reviewer was handed`,
    `  - \`outline/<step>.json\` — what they wrote back`,
    `  - \`join/<step>.<item>[.<pair>].md\` — the pair each verdict was given on`,
    `  - \`corrections/<step>.md\` — the input each correction was written from`,
    // THE ONE RECORD A READER DEBUGGING MID-RUN REACHES FOR (kogaki#1134). The
    // `comparison/<step>.md` files that stood beside it until kogaki#1134 were a
    // legend plus one line per pair restating this record; the class, the
    // verdict, the reason, the model and the span are all on the row here.
    `  - \`join.json\` — pass one's verdicts with each row's class, model and span,`,
    `    and which pairs were decided mechanically`,
  ];
  if (run.checked_at || currentPass(run) > 1) {
    out.push(
      `- **Pass 2 — \`check\`.** \`${rel("pass-2")}/\``,
      `  - \`outline-input/<step>.md\` and \`outline/<step>.json\` — the corrected Steps, re-read blind`,
      `  - \`join/<step>.<item>[.<pair>].md\` — the pairs inside the second pass's bound`,
      `  - \`check.json\` — pass two's verdicts, the bound it applied, and what it carried`,
      "",
      "A pair pass two carried rather than re-judged has its verdict in `pass-1/join.json`",
      "and its input under `pass-1/join/`; the bound in `check.json` says which.");
  } else {
    out.push("- **Pass 2 — `check`.** Did not run, so there is no `pass-2/`.");
  }
  out.push("",
    `- **Snapshots.** \`${rel("snapshots")}/\` — the article before and after each correction,`,
    "  and, where pass two undid one, before and after each **restore**.",
    `- **Run record.** \`${rel("run.json")}\` — every path above, per Step, as it was written.`);
  // THE ONE RECORD ABOUT BOTH PASSES (kogaki#1135). Named only where `check`
  // ran, by the same rule the `pass-2/` block above follows: a legend line
  // pointing at a file nothing wrote sends the owner to an absence.
  if (run.checked_at) {
    out.push(
      `- **Both passes.** \`${rel("passes.json")}\` — one row per Step, item and pair, carrying`,
      `  pass one's verdict, pass two's, and one outcome word: ${PASS_OUTCOMES.join(", ")}.`,
      "  Comparing the passes meant reading the two join records side by side by hand;",
      "  `regressed` is the word neither of them carries.");
  }
  return out;
}

function cmdClose(args) {
  const draftPath = argString(args, "draft", "usage: review-draft close --draft <draft.md>");
  const ws = workspaceFor(args, slugOf(draftPath));
  const run0 = readRun(ws);
  // Read once for the whole record: every evidence pointer below needs to know
  // whether its row's reverse side is the passage's Reverse Outline or the
  // figure's, and that is a fact about the item table.
  const figureIds = figureItemIds(readItems());
  // THE RE-RUN REFUSAL COMES FIRST, BEFORE THE DRAFT IS READ (kogaki#994), AND
  // IT IS KEYED ON THE RESTORE RATHER THAN ON THE CLOSE. A close that restored
  // has put `draft.md` back to the Draft it reviewed, so `requireCurrent` would
  // meet the restored original and report it as a Draft edited under the run —
  // true of the bytes and false about what happened; and a second `close` that
  // got past it would copy that original over the reviewed Draft, which is the
  // loss this issue exists to end, one file over.
  //
  // A close that restored NOTHING is a different act and stays re-runnable: no
  // correction was made, `draft.md` never moved, and the record is one per Draft
  // and overwritten on re-run, which is a contract this refusal must not take
  // away to buy a guard against a write that cannot happen.
  if (run0.restored_from) {
    fail(`this run is closed. The reviewed Draft was written to ${run0.reviewed_draft}, and `
      + `${resolve(draftPath)} was restored to the Draft that was reviewed. Running \`close\` again `
      + "would copy that restored original over the reviewed Draft.\n"
      + `  record  ${join(dirname(resolve(draftPath)), "review.md")}\n`
      + "To review the corrected article, `open` a new run on it.");
  }
  const draft = readDraft(draftPath);
  const run = run0;
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
        + "directory and record them with `<verdicts.json> | compare --draft <draft.md>`.");
    }
    fail("`close` is reachable from `compare` with zero fails, or from `check` in every state — "
      + "and neither has run. Run `compare --draft <draft.md>` first.");
  }
  // ONLY A **PRESERVED** ITEM'S FAIL WITHHOLDS `close` (kogaki#872). The item
  // table makes the class the CONSEQUENCE: a preserved fail sends its Step to
  // correction, and a best-effort fail rides along only when that Step is
  // re-realized anyway. A guard counting every fail would send a Step to pass
  // two for a best-effort finding, which is the opposite of riding along — and
  // it would make `close` unreachable on a Draft whose only findings are ones
  // the design says to carry rather than to act on. Found on the first live
  // drive, where a best-effort item fired on every Step.
  // A LOCALIZED SECTION FAIL WITHHELD IT THE SAME WAY (kogaki#873) UNTIL THE
  // READER THAT PRODUCED ONE WAS REMOVED (kogaki#1133). A failing preserved
  // STEP item is now the whole of what withholds this record.
  const fails = (run.findings || []).filter((f) => f.verdict === "fails" && f.class === "preserved");
  if (fails.length && !run.checked_at) {
    fail(`the join found ${fails.length} failing PRESERVED item(s), so \`close\` is reachable only `
      + "through `check` — pass two is what turns a failing preserved item into a correction or into "
      + `residue. A best-effort fail does not withhold the record; it rides along. Failing: `
      + `${fails.map((f) => `${f.step_id}/${f.item}`).join(", ")}`);
  }

  const out = join(dirname(resolve(draftPath)), "review.md");
  const reviewedPath = join(dirname(resolve(draftPath)), REVIEWED_BASENAME);
  // THE DRAFT THAT WAS REVIEWED is the article as the first correction found
  // it — the snapshot that correction took before entering the realization
  // lane. With no correction, nothing moved and the reviewed Draft is the
  // Draft: both files are written and both are the same bytes, which is the
  // true report rather than a missing file the reader has to interpret.
  const firstSnapshot = (run.corrections || [])[0]?.snapshot_before ?? null;
  if (firstSnapshot && !existsSync(firstSnapshot)) {
    fail(`the first correction's snapshot is gone — ${firstSnapshot}. It is the Draft this run `
      + `reviewed, and \`close\` restores ${resolve(draftPath)} from it. Without it the reviewed `
      + "article and the reviewed Draft cannot both be produced, so this refuses rather than "
      + "leaving the corrected article at the path the record calls the original.");
  }
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
    // BOTH FILES ARE NAMED (kogaki#994). The record's reader is looking for
    // the review's product, and a record naming only the path it restored
    // would send them to the article the review started from.
    `- **Draft reviewed.** \`${relative(dirname(out), resolve(draftPath)) || basename(draftPath)}\``
      + " — restored to the article this run read, byte for byte.",
    `- **Reviewed Draft.** \`${relative(dirname(out), reviewedPath) || REVIEWED_BASENAME}\``
      + (firstSnapshot
        ? ` — the article with this run's ${run.corrections.length} correction(s) in it`
          // A RESTORED STEP'S CORRECTION IS NOT IN IT (kogaki#1135), and the
          // count above is of corrections MADE. Saying only the count would
          // describe a document that does not exist.
          + ((run.restores || []).length
            ? `, less the ${run.restores.length} undone by pass two `
              + `(${run.restores.map((r) => r.step_id).join(", ")}).`
            : ".")
        : " — no correction was made, so it is byte-identical to the Draft above."),
    `- **Body sha.** \`${run.body_sha}\``,
    `- **Opened.** ${run.opened_at}`,
    `- **Closed.** ${now}`,
    `- **Passes.** ${run.checked_at ? "two (compare, check)" : "one (compare)"}`,
    "",
    "### The Packets it was reviewed against",
    "",
    ...run.steps.map((s) => `- \`${s.step_id}\` — \`${s.packet}\` sha \`${s.packet_sha}\``),
    "",
    // ITEM 4 OF kogaki#994. A finding names a Step and an item; the two
    // artefacts that make it checkable — the input the judge was handed and
    // the record the blind reviewer wrote — live in the pass directory, and
    // until this the record pointed at neither. `runs/` is machine state and is
    // pruned, so the paths are named as the form they have rather than
    // promised to be there: a reader whose workspace has been pruned learns
    // what was pruned rather than that nothing was written.
    "### Where this run's evidence is",
    "",
    `The workspace is \`${ws}\` — machine state, gitignored and pruned to the last few`,
    "runs. Each pass wrote only under its own directory:",
    "",
    ...evidenceLines(ws, run),
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
      if (f.reverse) lines.push(`  - reverse: ${f.reverse}`);
      if (f.span) lines.push(`  - span: ${JSON.stringify(f.span)}`);
      // THE TWO ARTEFACTS BEHIND THE VERDICT (kogaki#994 item 4). `run.findings`
      // is pass two's once `check` has run and pass one's before, and a carried
      // row is pass one's either way — the row says which, and the pointer
      // follows the row.
      for (const l of findingEvidencePaths(ws, run, f, figureIds)) lines.push(l);
    }
    lines.push("");
  }

  lines.push("## Corrections", "");
  if (!run.corrections.length) {
    lines.push(run.checked_at
      ? "_None made — pass two ran over the mechanical items and carried the rest._"
      : "_None — `correct` is the act that makes one, and it has not run._", "");
  } else {
    for (const c of run.corrections) {
      lines.push(`- **${c.step_id}** (pass ${c.pass}) — ${c.what}`);
      if (c.change_share !== undefined) lines.push(`  - change share: ${c.change_share}`);
      if (c.packet_overlap !== undefined) lines.push(`  - packet overlap: ${c.packet_overlap}`);
      // THE RESTORE IS RECORDED UNDER THE STEP IT UNDID (kogaki#1135), beside
      // the correction rather than in a list of its own: what the owner is
      // reading here is what happened to this Step, and a correction whose
      // effect was removed is not a correction the article carries.
      for (const r of (run.restores || []).filter((x) => x.step_id === c.step_id)) {
        lines.push(`  - **RESTORED in pass two.** ${r.what}. The corrected prose is not in the `
          + "article; this Step carries the prose it carried in pass one.");
        for (const g of r.regressed) {
          lines.push(`    - \`${g.item}\`${g.pair === null || g.pair === undefined ? "" : ` pair ${g.pair}`}`
            + ` — held in pass one, failed in pass two: ${g.reason}`);
        }
        lines.push(`    - before: \`${relative(dirname(out), r.snapshot_before) || r.snapshot_before}\``,
          `    - after: \`${relative(dirname(out), r.snapshot_after) || r.snapshot_after}\``);
      }
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
      // A RESIDUE LINE PASS TWO RE-JUDGED POINTS AT PASS TWO; ONE IT CARRIED
      // POINTS AT PASS ONE, which is the only pass that read it. The row carries
      // the distinction its own `why` was written from.
      for (const l of findingEvidencePaths(ws, run, r, figureIds)) lines.push(l);
      lines.push("  classified:");
    }
    lines.push("");
  }

  // A trailing newline, like every other write in this file: `review.md` is
  // repo-visible and committed, so without one it lands as a no-final-newline
  // file in every diff that touches it (PR #882 round 1, finding 6).
  writeFileSync(out, lines.join("\n") + "\n");

  // THE TWO ARTICLE WRITES ARE THE LAST ACTS, AND THEIR ORDER IS NOT A
  // PREFERENCE. The reviewed Draft is written first, so a failure between the
  // two leaves the corrections on disk under BOTH names rather than under
  // neither; restoring first and failing second would lose them outright.
  writeFileSync(reviewedPath, draft.text);
  if (firstSnapshot) writeFileSync(resolve(draftPath), readFileSync(firstSnapshot, "utf8"));

  run.reviewed_draft = reviewedPath;
  run.reviewed_at = now;
  run.restored_from = firstSnapshot;
  run.closed_at = now;
  writeRun(ws, run);
  process.stdout.write(
    `review record:  ${out}\n`
    + `reviewed Draft: ${reviewedPath}\n`
    + (firstSnapshot
      ? `restored:       ${resolve(draftPath)} — the Draft this run reviewed, from ${firstSnapshot}\n`
      : `unchanged:      ${resolve(draftPath)} — no correction was made\n`));
}

// ---------------------------------------------------------------------------

const COMMANDS = {
  open: cmdOpen,
  outline: cmdOutline,
  compare: cmdCompare,
  correct: cmdCorrect,
  check: cmdCheck,
  close: cmdClose,
};

const USAGE = `review-draft — the round-trip review of a CanonicalDraft against its Packets

                        node src/review-draft.mjs open    --draft <draft.md>
  <reverse outline>   | node src/review-draft.mjs outline --draft <draft.md> --step <id>
  [<verdicts.json>]   | node src/review-draft.mjs compare --draft <draft.md>
  [<corrected prose>] | node src/review-draft.mjs correct --draft <draft.md> --step <id>
  [<record.json>]     | node src/review-draft.mjs correct --draft <draft.md> --step <id> --figure
  [<verdicts.json>]   | node src/review-draft.mjs check   --draft <draft.md>
                        node src/review-draft.mjs close   --draft <draft.md>

The Harness owns the ordering: \`outline\` refuses a Step whose Reverse Outline input it
did not render, \`compare\` refuses while any Step outline is missing,
\`check\` refuses before \`compare\`, and \`close\` is reachable from \`compare\` with
zero fails or from \`check\` in every state.

THE WORKSPACE IS SPLIT BY PASS, and the layout is this command's contract rather
than a convention:

  runs/review/<slug>/pass-1/{outline-input,outline,join,corrections,join.json}
  runs/review/<slug>/pass-2/{outline-input,outline,join,check.json}
  runs/review/<slug>/snapshots/    before/after per corrected Step, and per restore
  runs/review/<slug>/passes.json   both passes side by side, one row per pair
  runs/review/<slug>/run.json

Every pass writes only under its own directory, and a write that would land on a
file another pass wrote is REFUSED BY NAME. A later third pass is \`pass-3/\` and
nothing else moves. \`snapshots/\`, \`passes.json\` and \`run.json\` stay at the
root: a snapshot pair spans the correction that separates two passes,
\`passes.json\` is the one record ABOUT both passes, and the run record is the
one file every pass writes. \`corrections/\` is PASS ONE'S ONLY — \`correct\`
discharges a verdict pass one recorded, and pass two turns a still-failing item
into residue rather than into another correction — so pass two has none.

\`join.json\` and \`check.json\` are the pass's whole reading and the surface to
debug a run from: every row carries the item, its class, the verdict, the reason,
the span, \`judged\` — whether a Judge was asked at all — and the model that
answered where one was. A \`comparison/\` directory rendering those rows as prose
stood beside them until kogaki#1134 and was harder to read than the record it
rendered; the consequence word it added is the class and the verdict together —
a \`preserved\` fail is what sends its Step to correction and a \`best-effort\` one
rides along.

EVERY REPLY REACHES THIS HARNESS ON STANDARD INPUT, and no act takes a path to
one. \`runs/\` holds what the Harness wrote and nothing else: the Reverse
Outline lands at \`outline/<step>.md\`, the verdicts in \`join.json\` and
\`check.json\`, and a correction in
the Draft itself with its before-and-after pair under \`snapshots/\` — one copy
each, under the Harness's own name. A reply the session wrote to a file of its
own naming was a duplicate of that copy, and a write into machine state with no
owner.

\`close\` writes the corrected article to \`theses/<slug>/draft.reviewed.md\` and
RESTORES \`theses/<slug>/draft.md\` to the Draft the run reviewed, so the Draft is
byte-identical before and after a run and the diff between the two files is the
review. \`review.md\` names both. A second \`close\` on a closed run refuses.

\`correct\` runs in TWO PHASES like \`compare\`, and STANDARD INPUT selects the
phase: with nothing piped in it renders the
correction input — the Step's Packet RE-RENDERED against the article as it now
stands, so the "article so far" block carries the current preceding prose
including Steps corrected earlier in the same pass, with one Correction block
appended holding the previous realization, what failed, and what held and must
go on holding. With the corrected prose piped in it records it through the
realization lane and reports the drift: the share of sentences changed and the
verbatim overlap with the Packet's claim and state lines. Both are REPORTED and
neither gates. Corrections run in path order, and a Step out of order refuses.

\`--figure\` corrects the Step's FIGURE RECORD instead of its passage, and it is
the seat a failing preserved figure item sends the Step to. Phase A renders the
Packet as it now stands, the passage, the block as the reader currently meets
it, the previous record verbatim, and what failed and held; phase B takes the
re-designed record and hands it to \`draft.mjs figure\`, which re-validates it,
and \`emit\`, which re-renders the block from it. You write no markup. A Step
owing both corrections takes the passage first: the record's caption is stated
in what the reader holds after reading that passage.

\`check\` is pass two and is BOUNDED: it re-runs Reverse Outlining for the
corrected Steps, then re-judges their own failed and held preserved items, the
continuity item on each corrected Step's successor, and every mechanical
item over the whole Draft. Every other pair is CARRIED from pass one, marked as
carried, at no model call. A preserved item still failing after pass two is
residue, and \`close\` hands it to the owner with an empty \`classified:\` field.

\`check\` REFUSES A REGRESSION. A corrected Step that FAILS in pass two a
preserved item it HELD in pass one is RESTORED to its pass-one prose, through
the realization lane that wrote it, and the item the correction was made for
returns to residue as still failing. Only the regressed Step moves: a later
corrected Step keeps its corrected prose and carries no mark, because
Step-to-Step continuity was settled at Reader Path design and is not this
Harness's. The restore is recorded in \`run.json\`, in \`check.json\`, and in
\`review.md\` under the Step it undid, with a snapshot pair of its own.

A completed \`check\` also writes \`passes.json\` at the run root: one row per
Step, item and pair, carrying pass one's verdict, pass two's, and one outcome
word — held, fixed, still-failing, regressed, carried. Comparing the two passes
meant reading \`pass-1/join.json\` and \`pass-2/check.json\` side by side by hand,
and \`regressed\` is the word neither of them carries.

\`compare\` decides the mechanical items itself and renders one join Packet per
judged pair; a verdicts reply piped in records the answers. It emits one line per (Step,
item) once every pair is answered, and never before: there is no fourth token
for "not asked yet", and \`cannot-decide\` is a real answer rather than a place
to round one.

EVERY VERDICT NAMES THE MODEL THAT PRODUCED IT — \`{step_id, item, pair?,
verdict, reason, model}\`, and a verdict with no \`model\` is refused. The id
rides the verdict, the \`model_calls\` log and the emitted \`judged by DECLARED
model(s)\` line. It is a DECLARATION: the Harness invokes no judge, pins no
model and verifies nothing about the value, which is why the record must carry
what the spawn was pinned to rather than leaving it to be inferred from a run
that no longer exists.

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
  // THE REPLY IS PIPED, AND THE CASES SAY SO AT ONE SITE (kogaki#1100). The
  // acts take their reply on standard input now, so every driver below goes
  // through here: a `--file`/`--verdicts` argument a case still writes is the
  // FIXTURE naming its own file, and this turns it into the stream the act
  // reads rather than an argument the act no longer has.
  //
  // A PATH THAT IS NOT THERE THROWS, AND IS NEVER AN EMPTY STREAM (PR #1105
  // round 1, finding 2). An empty stream is a REFUSAL only for `outline` and
  // `read`; for `compare`, `check` and `correct` it is phase A, which renders
  // an input and exits 0 — so a case that mistyped its reply path would pass
  // vacuously on exactly the three acts where a vacuous pass is hardest to
  // see. A case that means "no reply" passes no argument at all.
  const selfRun = (argv) => {
    const a = [];
    let input;
    for (let i = 0; i < argv.length; i++) {
      if ((argv[i] === "--file" || argv[i] === "--verdicts")
          && typeof argv[i + 1] === "string" && !argv[i + 1].startsWith("--")) {
        const p = argv[++i];
        if (!existsSync(p)) {
          throw new Error(`the fixture named a reply at ${p} and no file is there — a case that `
            + "means an absent reply passes no argument at all, because an empty stream is phase A "
            + "for `compare`, `check` and `correct` rather than a refusal");
        }
        input = readFileSync(p, "utf8");
        continue;
      }
      a.push(argv[i]);
    }
    return spawnSync(process.execPath, a,
      { encoding: "utf8", ...(input === undefined ? {} : { input }) });
  };
  const root = mkdtempSync(join(tmpdir(), "review-draft-selftest-"));
  // THE FIXTURE'S DECLARED JUDGE (kogaki#997). Every verdict a case records
  // names the model that produced it, because the surface refuses one that does
  // not; this is a stand-in id and never a pin — the pins live in
  // `.claude/skills/review-draft/SKILL.md`, and the Harness names no model of
  // its own anywhere.
  const JUDGE_MODEL = "a-judging-model";
  let passed = 0; const failures = [];
  // `detail` RENDERS (kogaki#883, finding 3). Case 23 always passed its
  // offending-import list as a third argument, and the two-parameter form
  // dropped it — so a future allowlist failure would have named the case and
  // never the import that broke it, the one fact a repair needs. Same case as
  // the sibling `ok` in src/runs.mjs.
  const ok = (name, cond, detail = "") => {
    if (cond) passed++; else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  };
  // A CASE MUST FAIL, NEVER THROW. A mutation that stops `close` writing its
  // record used to take the whole pass down with an ENOENT from the next case,
  // and a crash reports no case count at all — which is the form
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

  // THE FIGURE'S MARKUP COMES FROM THE REAL RENDERER (kogaki#880), reached by
  // SPAWNING it rather than importing it: this pass asserts a closed input
  // allowlist that forbids importing anything but node builtins and ./runs.mjs,
  // and a hand-written block would be this fixture's belief about what the renderer
  // emits — the same belief PR #895 found wrong twice about the Packet
  // template. Spawning costs one process per figure and buys the property that
  // matters: what the blind reviewer is shown here is what a reader meets.
  function renderFigureMarkup(record) {
    const src = "import(process.argv[1]).then(m => {"
      + " const r = m.renderFigure(JSON.parse(process.argv[2]));"
      + " if (r.error) { process.stderr.write(r.error); process.exit(1); }"
      + " process.stdout.write(r.markup); });";
    const r = spawnSync(process.execPath,
      ["-e", src, join(dirname(self), "render-figure.mjs"), JSON.stringify(record)],
      { encoding: "utf8" });
    if (r.status !== 0) {
      throw new Error(`the fixture could not render a figure through src/render-figure.mjs: `
        + `${(r.stderr || "(no output)").trim()}`);
    }
    return r.stdout;
  }

  function buildDraft(dir, { packetDir, mutate = (t) => t, omitLines = null, omitPacket = null,
    prose = PROSE, figures = null } = {}) {
    mkdirSync(dir, { recursive: true });
    // The figure records are written first: the body needs their markup and the
    // trace needs their shas, and both are the record AS STORED.
    const figureFiles = {};
    for (const [id, f] of Object.entries(figures || {})) {
      const fp = join(dir, `figure-${id}.json`);
      writeFileSync(fp, JSON.stringify(f.record, null, 2) + "\n");
      figureFiles[id] = { path: fp, sha: sha256(readFileSync(fp, "utf8")),
        markup: renderFigureMarkup(f.record), position: f.record.position };
    }
    // Body first, recording each Step's 1-based body range. The figure is
    // pushed before or after the prose per its record's `position`, which is
    // exactly what `src/draft.mjs assembleBody` does — and its range is
    // recorded separately, because the renderer's whole point is that the Step's own
    // range spans the prose alone.
    const body = []; const ranges = {}; const figureRanges = {};
    const pushBlock = (markup) => {
      const start = body.length + 1;
      body.push(...markup.replace(/\n+$/, "").split("\n"));
      const span = [start, body.length];
      body.push("");
      return span;
    };
    for (const sec of SECTIONS) {
      body.push(`## ${sec.title}`, "");
      for (const id of sec.steps) {
        const f = figureFiles[id];
        if (f && f.position === "before") figureRanges[id] = pushBlock(f.markup);
        const start = body.length + 1;
        body.push(...prose[id]);
        ranges[id] = [start, body.length];
        body.push("");
        if (f && f.position === "after") figureRanges[id] = pushBlock(f.markup);
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
      const f = figureFiles[t.step_id];
      if (f) {
        const fr = figureRanges[t.step_id];
        t.figure = { position: f.position, record: relative(dir, f.path), record_sha: f.sha,
          lines: [fr[0] + bodyOffset, fr[1] + bodyOffset] };
      }
    }
    const fm = [...head, ...trace.map((t) => `  - ${JSON.stringify(t)}`), "---"].join("\n");
    const text = mutate(fm + "\n\n" + body.join("\n") + "\n");
    const out = join(dir, "draft.md");
    writeFileSync(out, text);
    return { path: out, ranges, bodyOffset, figureRanges, figureFiles };
  }

  // THE FIXTURE PACKETS ARE RENDERED IN THE TEMPLATE'S OWN FORM (kogaki#872),
  // not stubbed: `compare` reads the DECLARED side back out of a Packet block by
  // block, and a stub carrying two lines would make every join case assert
  // against a refusal rather than against the comparison. They are hand-written
  // rather than produced by `src/draft.mjs`, because importing the Draft lane
  // here would break the closed-input allowlist this pass also asserts.
  //
  // Packets carry text that appears NOWHERE in the prose, so the blindness case
  // below can assert on a string only the Packet has. They carry NO DIGIT
  // either — the comparison lines quote Packet material, and a digit in a claim
  // would land in one and make the no-numbers-but-line-numbers case assert
  // against the fixture's own wording rather than against the format.
  const CLAIMS = {
    a1: ["claim: alpha — the harness renders the Reverse Outline input before any record is accepted.",
      "claim: beta — the reviewer never reads the packet that produced the prose."],
    a2: ["claim: gamma — an ordering owned by the harness cannot be got wrong by a session."],
    a3: ["claim: delta — a residue line is classified by the owner and never by the tool."],
  };
  const PACKET_FIELDS = {
    a1: { after: "The reader knows which act renders the input.", purpose: "To open the claim.",
      introduces: ["harness"], knows: [], opens: true, excerpt: "PACKETONLYTOKEN a passage about tides and harbours." },
    a2: { after: "The reader knows an owned ordering cannot be got wrong.", purpose: "To carry the claim further.",
      introduces: [], knows: ["harness"], opens: false, excerpt: "PACKETONLYTOKEN a second passage about weather." },
    a3: { after: "The reader knows who classifies residue.", purpose: "To open the second question.",
      introduces: [], knows: ["harness"], opens: true, excerpt: null },
  };
  // THE FIXTURE PACKET IS THE REAL TEMPLATE WITH ITS SLOTS FILLED (PR #895
  // round 1, findings 2 and 3). It used to be written out by hand in the form
  // the author believed the template had, and BOTH of those findings are that
  // belief being wrong: the claims reader tested a bullet whose value lives in
  // a block below it, and the Section anchor stopped a sentence short of its
  // paragraph's end. Neither was visible to a fixture whose Packets ended
  // exactly where the reader expected them to.
  //
  // So the fixture reads `src/packet-template.md` and fills the slots itself —
  // the same slot set `src/draft.mjs renderPacket` fills, without importing it,
  // because the closed-input allowlist this pass also asserts forbids that
  // import. The fixed instruction prose around every slot is therefore the
  // TEMPLATE'S, not a copy, so a template edit reaches these cases instead of
  // sliding past them.
  // THE FIGURE BLOCK IS NOT PART OF A PACKET (kogaki#878). The template file
  // carries the Packet and, behind a marker, the figure input block that
  // `draft.mjs section` appends for a Step declaring `figure:` — so a fixture
  // reading the whole file would render a Packet these cases never receive.
  // The marker is spelled here rather than imported because this pass asserts
  // a closed input allowlist that forbids importing `src/draft.mjs`; the guard
  // below is what keeps that second spelling loud instead of silent — a
  // template whose marker moved fails HERE, naming the drift, rather than
  // reappearing three cases later as an unfilled slot.
  const TEMPLATE_MARKER = "<!-- FIGURE-INPUT -->";
  const TEMPLATE_FILE = readFileSync(join(dirname(self), "packet-template.md"), "utf8");
  if (!TEMPLATE_FILE.includes(TEMPLATE_MARKER)) {
    throw new Error(`the Packet template carries no ${TEMPLATE_MARKER} marker — this fixture splits the Packet from the figure block there, and a template that moved it would put the block into every fixture Packet`);
  }
  const TEMPLATE = TEMPLATE_FILE.slice(0, TEMPLATE_FILE.indexOf(TEMPLATE_MARKER))
    .replace(/^<!--[\s\S]*?-->\n*/, "").trimEnd() + "\n";
  // `introduces` is overridable for the same reason `claims` is: a Step whose
  // Brief declares none is an ORDINARY Step, and the only way to exercise the
  // stated absence the renderer writes into that slot is to render a Packet
  // that carries it.
  function writePacket(dir, id, { claims = CLAIMS[id], introduces = PACKET_FIELDS[id].introduces } = {}) {
    const f = PACKET_FIELDS[id];
    const bullets = (xs, empty) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : empty);
    const slots = {
      thesis: "PACKETONLYTOKEN the thesis.",
      reader_start: "PACKETONLYTOKEN where the reader starts.",
      reader_target: "PACKETONLYTOKEN where the reader lands.",
      opening_question: "PACKETONLYTOKEN the opening question.",
      move_id: "name-the-mechanism",
      move_intent: "Name the mechanism before naming its consequence.",
      move_constraints: "Name the mechanism first; never announce the consequence before the reader can check it.",
      move_failure_modes: "Announcing a conclusion the reader has no way to check yet.",
      move_excerpt: f.excerpt === null
        ? "(none — this Move record carries no excerpt, so it cannot serve as an exemplar. Perform the Move from its contract above.)"
        : f.excerpt,
      step_id: id,
      purpose: f.purpose,
      reader_state_before: "PACKETONLYTOKEN the state before.",
      reader_state_after: f.after,
      // THE STATED ABSENCE THE RENDERER WRITES, verbatim (src/draft.mjs's
      // `claims || "(none recorded)"`), so the claimless case exercises the
      // string a real Packet actually carries.
      claims: claims.length ? claims.join("\n") : "(none recorded)",
      section_placement: f.opens
        ? "- **This Step OPENS a Section.** Its heading is **\"A heading\"**, rendered by the Harness immediately above your prose.\n"
          + "- **Your prose is what the heading promises.** This Step is the whole Section."
        : "- **This Step CONTINUES the Section headed \"A heading\".** That heading is already on the page, above prose you are writing further into.\n"
          + "- **No new heading is rendered here.** Develop what the Section has established; a new subject belongs to a Step that opens its own.",
      reader_already_knows: bullets(f.knows,
        "(nothing — this is the first Step to introduce anything, or the path introduces no terms)"),
      introduces: bullets(introduces, "(nothing new)"),
      // CLOSURE (kogaki#1151). These fixture Steps carry no Closure row — the
      // Round Trip's subject is unaffected by it — so every Packet renders the
      // stated absence `src/draft.mjs renderPacket` writes for a Step with none.
      closure_rows: "(nothing — this Step carries no Closure row)",
      // the Journey a Step draws on (kogaki#1111). THE FIXTURE FILLS IT WITH THE STATED
      // ABSENCE, which is what the renderer writes for a Step declaring no
      // Journey — these cases are about the Reverse Outline, and a Journey
      // asserts nothing, so the Reverse Outline carries no Journey field and
      // the block's presence here is the template's rather than a case's
      // subject.
      journeys: "(none — this Step draws on no Journey material, and nothing here asks for any.)",
      prior_sections: "PACKETONLYTOKEN the article so far.",
    };
    let out = TEMPLATE;
    for (const [k, v] of Object.entries(slots)) out = out.split(`{{${k}}}`).join(v);
    const left = out.match(/\{\{(\w+)\}\}/);
    if (left) {
      // A slot the fixture does not fill is a template block these cases would
      // review with `{{name}}` sitting where its value belongs — reported here
      // rather than discovered as a strange refusal three cases later.
      throw new Error(`the fixture does not fill the Packet template's slot {{${left[1]}}}`);
    }
    writeFileSync(join(dir, `${id}.md`), out);
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
  const drive = (cmd, ...extra) => selfRun(
    [self, cmd, "--draft", draft.path, "--workspace", wsBase, ...extra]);

  // A REVERSE OUTLINE for one Step, in the Brief's own Step form (kogaki#1014).
  // The fixture's outlines are REAL `step` blocks from here on — a plain-text
  // stand-in is refused by the Brief parser, and the ordering cases below must
  // fail on the ORDERING rather than on the block's form.
  //
  // THE OUTLINED CLAIMS READ THE FIXTURE PACKETS' CLAIMS BACK (kogaki#872,
  // re-grounded at kogaki#1132). The Round Trip asks, once per DECLARED claim,
  // whether the reader recovered it, so what these have to be is plausible
  // recoveries of the Packet's own lines — a judge is what decides that, and
  // every case here supplies the judge's answer. Nothing mechanical reads the
  // wording any more. And no field carries a digit: the comparison lines quote
  // what was read, and the no-numbers-but-line-numbers case must fail on the
  // FORMAT rather than on this outline's wording.
  //
  // NO SPANS. A Reverse Outline is a Brief Step block and a Brief field carries
  // no draft coordinate — the span was the deleted record's own invention, and
  // the cases that asserted one lie inside the passage went with it.
  const OUTLINE = {
    a1: { claims: ["the harness renders the reverse outline input before any outline is accepted",
      "the reviewer never reads the packet that produced the prose"],
      after: "The reader knows which act renders the input.", purpose: "To open the claim." },
    a2: { claims: ["an ordering owned by the harness cannot be got wrong by a session"],
      after: "The reader knows an owned ordering cannot be got wrong.", purpose: "To carry the claim further." },
    a3: { claims: ["a residue line is classified by the owner and never by the tool"],
      after: "The reader knows who classifies residue.", purpose: "To open the second question." },
  };
  // The block itself. `mutate` takes the field object so a case can widen a
  // claim, blank a field or add one the dispositions refuse.
  const outlineFor = (id) => ({
    step_id: id,
    purpose: OUTLINE[id].purpose,
    reader_state_before: "The reader arrives holding what came before.",
    reader_state_after: OUTLINE[id].after,
    claims: OUTLINE[id].claims.slice(),
    introduces: [],
  });
  const renderOutline = (o) => {
    const L = ["```step", `step_id: ${o.step_id}`];
    if (o.purpose !== null) L.push(`purpose: ${o.purpose}`);
    if (o.reader_state_before !== null) L.push(`reader_state_before: ${o.reader_state_before}`);
    if (o.reader_state_after !== null) L.push(`reader_state_after: ${o.reader_state_after}`);
    for (const g of o.claims) L.push(`claim ${g}`);
    for (const x of o.introduces) L.push(`introduces: ${x}`);
    for (const [k, v] of Object.entries(o.extra || {})) L.push(`${k}: ${v}`);
    L.push("```");
    return L.join("\n") + "\n";
  };
  const writeRecord = (id, mutate = (o) => o) => {
    const f = join(root, `rec-${id}.md`);
    writeFileSync(f, renderOutline(mutate(outlineFor(id))));
    return f;
  };

  // The same outline, against ANY fixture Draft — the kogaki#872 cases build
  // their own Drafts (a Packet with a claim removed, a Draft using a term
  // before the Step that introduces it). With no spans to place, the outline no
  // longer depends on the Draft's ranges; the parameter stays so the call sites
  // and their reasons read unchanged.
  const writeRecordFor = (d, id, tag) => {
    const p = join(root, `rec-${tag}-${id}.md`);
    writeFileSync(p, renderOutline(outlineFor(id)));
    return p;
  };

  // ANSWER EVERY PAIR THE RUN SAYS IT OWES, read from the run's OWN join record
  // rather than from a list transcribed here. That is not convenience: it is the
  // property the fixture is asserting — the Harness tells the judging model
  // exactly which pairs it is asking about, so a transcribed list would pass
  // while the Harness asked for something else.
  // `override` lets ONE pair carry a different answer from the rest (kogaki#996).
  // Since `claims` became a judged item, a case that needs a preserved fail has
  // to SAY the judge failed it — there is no longer a Packet mutation that
  // produces one mechanically, which is the whole point of the change.
  const answerOwed = (jsonPath, tag, verdict = "holds",
    reason = "the declared line and the outlined one agree", override = null) => {
    // AN ABSENT JOIN RECORD ANSWERS NOTHING RATHER THAN THROWING. A mutation
    // that makes `compare` refuse leaves no record, and reading it directly took
    // the whole pass down with an ENOENT — which reports no case count at all,
    // the form the member reads as "the pass did not run" rather than as "these
    // cases failed".
    const rec0 = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, "utf8")) : {};
    const owed = rec0.owed || [];
    const f = join(root, `verdicts-${tag}.json`);
    writeFileSync(f, JSON.stringify({
      verdicts: owed.map((o) => ({
        step_id: o.step_id, item: o.item,
        ...(o.pair === null ? {} : { pair: o.pair }),
        // `override` is spread BEFORE `model`, so a case can restate the verdict
        // and its reason and CANNOT name the model — which is the run's, never a
        // case's (kogaki#997). Spread after, the comment would be the only thing
        // enforcing it (PR #1003 round 1).
        verdict, reason, ...(override ? override(o) || {} : {}), model: JUDGE_MODEL,
      })),
    }, null, 2) + "\n");
    return f;
  };

  // A COPY OF `src/` WITH ONE FILE TAKEN OUT, which is how the
  // absent-companion cases are driven. THE WHOLE DIRECTORY IS COPIED rather
  // than an enumerated list (kogaki#1014): the runtime imports the Brief parser
  // now, and that module has imports of its own, so a list is a second
  // dependency graph beside the real one — it went stale the moment
  // `./draft.mjs` joined, and every case here failed on module resolution
  // instead of on the absence it names.
  const soloWithout = (name, missing) => {
    const dir = join(root, name);
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(dirname(self))) {
      if (f === missing) continue;
      writeFileSync(join(dir, f), readFileSync(join(dirname(self), f)));
    }
    return join(dir, "review-draft.mjs");
  };

  // open -> outline x3 -> compare -> answer -> compare. The whole flow, driven
  // through the real entry points, for a fixture Draft of this form.
  const driveToCompletedJoin = (d, wsBase, tag, override = null) => {
    const slug = basename(dirname(resolve(d.path)));
    const D = (...a) => selfRun(
      [self, ...a, "--draft", d.path, "--workspace", wsBase]);
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("outline", "--step", id, "--file", writeRecordFor(d, id, tag));
    const first = D("compare");
    const jsonPath = join(wsBase, slug, "pass-1", "join.json");
    const second = D("compare", "--verdicts",
      answerOwed(jsonPath, tag, "holds", "the declared line and the outlined one agree", override));
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
  // (the lifetimes rule), so this is an ordinary state and the refusal says how to
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
  ok("open renders the FIRST Reverse Outline input", /first Reverse Outline input: .*outline-input[\/\\]a1\.md/.test(rOpen.stdout));
  ok("open writes a run record", existsSync(join(WS, "run.json")));

  // THE PLAN'S VOCABULARY IS A DATA LIST, NOT A HAND SWEEP (kogaki#1099 acceptance 1).
  // The Blind Reader is handed the passage, the article before it, the seven
  // fields, its role and constraints, and the answer form. Every term below
  // names something a reader who has only read the article cannot have heard
  // of, so one appearing in the rendered input is a boundary failure rather
  // than a wording quibble — and because the set is written down, the leak is
  // mechanically detectable. A term coined for the plan joins this list in the
  // act that coins it, which is what keeps the check from being a grep someone
  // ran once. The list is a CHEAP FIRST PASS and not the criterion: it catches
  // coined identifiers and cannot catch a sentence that is internal in meaning
  // while made of ordinary words.
  //
  // AND IT IS SCANNED OVER THE HARNESS'S HALF OF THE FILE, NEVER THE WHOLE OF
  // IT. The rendered input is the Harness's own text followed by the article's,
  // and an article about this pipeline quotes the pipeline's words as its own
  // subject matter — this fixture's first passage says "in the path's recorded
  // order" — so a scan over the whole file would refuse the Draft for what the
  // Draft is about. The split is at the heading that opens the quoted half, so
  // everything the Harness wrote about the ask is scanned and nothing the
  // author wrote is.
  const PLAN_VOCABULARY = [
    [/\bBriefs?\b/i, "Brief"],
    [/\bMoves?\b/i, "Move"],
    [/\bStrands?\b/i, "Strand"],
    [/\bcomposer\b/i, "composer"],
    [/\blibrary entry\b/i, "library entry"],
    [/\bpaths?\b/i, "path"],
  ];
  // The bound is stated rather than left to be discovered: what follows the
  // split is the article, the passage and the passage's own two-line heading,
  // so a term coined into THAT heading is outside this scan. It is the price of
  // not refusing a Draft for its subject matter, and the Harness text it gives
  // up is two lines long.
  const harnessHalf = (text) => text.split("## The article before this passage")[0];
  const planLeaks = (text) =>
    PLAN_VOCABULARY.filter(([re]) => re.test(harnessHalf(text))).map(([, n]) => n);
  // THE SCAN IS EXERCISED BOTH WAYS. An absence catcher that never fires is
  // indistinguishable from one that has nothing to catch, and every assertion
  // it carries below is an absence — so a leak is planted here and must be
  // named, and the article's own half must NOT be.
  ok("#1099: the plan-vocabulary scan names a leak planted in the Harness's half",
    planLeaks("the Brief's own Move\n## The article before this passage\nclean")
      .join(",") === "Brief,Move");
  ok("#1099: and reads none of the article's own half, which may quote the pipeline",
    planLeaks("clean\n## The article before this passage\nthe Brief named a Move on the path").length === 0);

  // 8 — THE REVERSE OUTLINE INPUT IS BLIND, and this is the case that binds it. The input
  // carries the prose and nothing from the Packet; a token only the Packet has
  // must not appear.
  {
    const input = readFileSync(join(WS, "pass-1", "outline-input", "a1.md"), "utf8");
    ok("the Reverse Outline input carries the Step's prose", input.includes("The first passage opens the claim"));
    ok("the Reverse Outline input carries NOTHING from the Packet", !input.includes("PACKETONLYTOKEN"));
    // kogaki#1099 ACCEPTANCE 1 — three absences over the same rendered file.
    ok("#1099: the rendered input carries no withheld-field section",
      !/NOT asked for/.test(input));
    ok("#1099: nor the filing command, which is an instruction to the session and not to the reader",
      !/node src\/review-draft\.mjs outline/.test(input) && !/Then file it/.test(input));
    ok("#1099: nor any of the plan's vocabulary", planLeaks(input).length === 0, planLeaks(input).join(", "));
    ok("the Reverse Outline input names the draft line range it quoted", /draft lines \d+–\d+/.test(input));
    // kogaki#1099 ACCEPTANCE 3 — `introduces` states BOTH line forms in its own
    // terms. The bare form is what a reader supplies for a term the passage
    // anchors nowhere, and naming only the anchored form would have them invent
    // one; the definition used to reach for the Brief's grammar to say it.
    ok("#1099: the `introduces` definition states the bare form and the anchored one",
      /write the term BARE/.test(input) && /introduces: <term> — <anchor>/.test(input));
    ok("the Reverse Outline input tells the reviewer not to reason about the input",
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
    const block = input.split(`## The passage — a1, draft lines ${s}–${e}`)[1] || "";
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
    const r = drive("outline", "--step", "zz", "--file", bad);
    ok("an unknown step_id refuses naming both sides",
      r.status === 1 && /unknown step `zz`/.test(r.stderr) && /a1, a2, a3/.test(r.stderr));
  }

  // 10 — THE ORDERING GUARD. A record handed back for a Step whose input was
  // never rendered was written against something else, and afterwards there is
  // no way to tell what.
  {
    const rec = writeRecord("a3");
    const r = drive("outline", "--step", "a3", "--file", rec);
    ok("a Step whose Reverse Outline input was never rendered refuses",
      r.status === 1 && /step a3 has no rendered Reverse Outline input/.test(r.stderr));
    ok("and the refusal names the Step actually owed", /The Step now owed is a1/.test(r.stderr));
  }

  // 11 — recording one outline renders the next.
  {
    const rec = writeRecord("a1");
    const r = drive("outline", "--step", "a1", "--file", rec);
    ok("a Reverse Outline is recorded", r.status === 0 && /recorded: a1/.test(r.stdout));
    ok("and the NEXT Reverse Outline input is rendered", /next Reverse Outline input: .*a2\.md/.test(r.stdout));
    ok("the Reverse Outline lands in the workspace", existsSync(join(WS, "pass-1", "outline", "a1.json")));
  }

  // 12 — ACCEPTANCE 2: compare before every outline refuses, naming what is
  // missing. EVERY unoutlined Step is named, not only the first one found.
  {
    const r = drive("compare");
    ok("compare with outlines outstanding refuses", r.status === 1);
    ok("and names the missing Steps", /step outlines: a2, a3/.test(r.stderr));
    ok("#1133: and nothing else — the Section ledger it also named is gone with the cold reader",
      !/ledger|section|cold reader/i.test(r.stderr));
    ok("and says why a partial join is worse than none",
      /report the gaps as agreement/.test(r.stderr));
  }

  // 13 — finish the outlines. The LAST one hands over to `compare` rather than
  // rendering a next input, which is what makes the flow self-driving all the
  // way there instead of stopping silently.
  let lastOutline = null;
  for (const id of ["a2", "a3"]) {
    const rec = writeRecord(id);
    lastOutline = drive("outline", "--step", id, "--file", rec);
    ok(`Reverse Outline ${id} is recorded`, lastOutline.status === 0);
  }
  ok("the last Reverse Outline renders no next input",
    !/next Reverse Outline input/.test(lastOutline.stdout));
  ok("#1133: and hands over to `compare`, which is now what it owes",
    /every Step is outlined/.test(lastOutline.stdout)
    && /compare --draft/.test(lastOutline.stdout)
    && !/ledger|Section entr/.test(lastOutline.stdout));

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
    ok("and reports the counts it joined over", /3 outlined Step\(s\)\./.test(r.stdout));
    ok("a join record lands in the workspace", existsSync(join(WS, "pass-1", "join.json")));

    const rec = JSON.parse(readFileSync(join(WS, "pass-1", "join.json"), "utf8"));
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
    const jp = rec.owed.length ? readFileSync(rec.owed[0].packet, "utf8") : "";
    ok("a join Packet carries the declared side, the reverse side and the quoted prose",
      /### What the Packet DECLARED/.test(jp) && /### What the REVERSE OUTLINE says/.test(jp)
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

  // 16b — THE REPLY ARRIVES ON STANDARD INPUT, AND THE OLD ARGUMENTS ARE GONE
  // (kogaki#1100). Two halves, and the second is the load-bearing one: an
  // argument that is merely unread is an argument that silently does nothing,
  // and a call still passing `--file` would be handed phase A — a rendered
  // input — while reading as a recording that ran.
  {
    // RAW, not through `selfRun`: the driver turns a `--file` into the stream,
    // which is the whole point of it, so a case about the argument itself has
    // to spawn past it.
    const raw = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", draft.path, "--workspace", wsBase], { encoding: "utf8" });

    const rFile = raw("outline", "--step", "a1", "--file", join(root, "rec-a1.md"));
    ok("#1100: `--file` is refused BY NAME rather than ignored, and the refusal names the pipe",
      rFile.status === 1 && /`--file` is gone/.test(rFile.stderr)
      && /\| node src\/review-draft\.mjs outline/.test(rFile.stderr));

    const rVerd = raw("compare", "--verdicts", join(root, "verdicts-main.json"));
    ok("#1100: and `--verdicts` is refused by the same clause",
      rVerd.status === 1 && /`--verdicts` is gone/.test(rVerd.stderr));

    // AN ABSENT REPLY IS THE USAGE REFUSAL, never a recorded blank. `outline`
    // has no second phase to fall back to, so an empty stream is a mistake
    // rather than a phase. `read` was the second act asserted here and is gone
    // with the cold reader (kogaki#1133); `outline` is now the only recording
    // act with no second phase, and the case is narrowed to it rather than left
    // naming two.
    const rNoOutline = drive("outline", "--step", "a1");
    ok("#1100: an `outline` with nothing piped in refuses, naming standard input",
      rNoOutline.status === 1 && /nothing arrived on standard input/.test(rNoOutline.stderr)
      && /\| review-draft outline/.test(rNoOutline.stderr));
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
    // THE ONE MECHANICAL ROW LEFT IS THE FIGURE'S (kogaki#1132). The refusal is
    // keyed on the item's MODE in the table and never on the Step, so naming it
    // over a figureless Step is the same refusal the fixture used to drive
    // through `claims-unused`.
    bad("a verdict for a MECHANICAL item is refused, saying it would replace a computed fact",
      [{ step_id: "a1", item: "figure-element-claim", verdict: "holds", reason: "it reads fine" }],
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
      [{ step_id: "a1", item: "purpose", verdict: "holds", reason: "3 of the claims are carried" }],
      "every other number in a review is a score by another name");
    bad("a verdicts file that is not one object carrying `verdicts` is refused",
      undefined, "carries no `verdicts` array");
    // kogaki#997 — A VERDICT THAT DOES NOT SAY WHAT PRODUCED IT IS REFUSED.
    // The 2026-09-07 run made a hundred and more model calls and its record
    // says what ran none of them, so a reader cannot check that the per-role
    // pins held. The refusal is what makes the omission unreachable rather
    // than merely discouraged.
    bad("a verdict carrying no `model` is refused, naming it as the id of what produced it",
      [{ step_id: "a1", item: "purpose", verdict: "holds", reason: "it reads fine" }],
      "carries no `model`");
    bad("and an empty `model` is refused by the same clause, not accepted as a value",
      [{ step_id: "a1", item: "purpose", verdict: "holds", reason: "it reads fine", model: "   " }],
      "carries no `model`");
    // ONE ID, NOT A SENTENCE ABOUT ONE. `--model` takes a single token, and a
    // value with a space in it is a description of the spawn rather than the
    // thing the spawn was pinned to.
    bad("a `model` carrying whitespace is refused — it is the one id `--model` took",
      [{ step_id: "a1", item: "purpose", verdict: "holds", reason: "it reads fine",
        model: "haiku but the strong one for corrections" }],
      "carries whitespace");
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
      JSON.parse(readFileSync(join(WS, "pass-1", "join.json"), "utf8")).complete === false);
  }

  // 17c — ACCEPTANCE 1: the completed join emits ONE LINE PER (Step, item),
  // each carrying a verdict from the closed three and a quoted span, and NO
  // NUMBER THAT IS NOT A LINE NUMBER.
  let baseLines = null;
  // The completed join's own output and record, captured HERE and read by the
  // kogaki#873 cases at the end: later cases correct this Draft, and a Section
  // assertion re-reading the workspace then would be reading pass two's state
  // under pass one's name.
  let baseStdout = null;
  let baseRecord = null;
  {
    const r = drive("compare", "--verdicts", answerOwed(join(WS, "pass-1", "join.json"), "main"));
    baseStdout = r.stdout;
    baseRecord = existsSync(join(WS, "pass-1", "join.json"))
      ? JSON.parse(readFileSync(join(WS, "pass-1", "join.json"), "utf8")) : {};
    ok("recording the verdicts completes the join", r.status === 0 && /recorded: \d+ verdict/.test(r.stdout));
    const rec = JSON.parse(readFileSync(join(WS, "pass-1", "join.json"), "utf8"));
    ok("and the join record says so", rec.complete === true);

    // kogaki#997 — WHAT JUDGED EACH PAIR IS READABLE FROM THE RECORD.
    // Asserted over EVERY model-decided row and EVERY call in the log rather
    // than over a sample: the defect the Issue reports is that a hundred and
    // more calls carried step, item, pair and packet and nothing else, and a
    // case that checked one row would pass on a record that lost the rest.
    {
      const stepCalls = rec.model_calls || [];
      ok("#997: every model call in the Step log names the model that answered it",
        stepCalls.length > 0 && stepCalls.every((c) => c.model === JUDGE_MODEL),
        `${stepCalls.filter((c) => c.model !== JUDGE_MODEL).length} without it, of ${stepCalls.length}`);
      // PER PAIR, not only per item: an item whose pairs were answered by
      // different models is what a slipped pin looks like, and the per-pair
      // record is the only place that is visible.
      const pairs = (rec.results || []).flatMap((r) => r.pairs || [])
        .filter((sub) => sub.judged === true);
      ok("#997: every model-decided PAIR carries the model beside its verdict",
        pairs.length > 0 && pairs.every((sub) => sub.model === JUDGE_MODEL));
      // THE ABSENCE IS THE RECORD ON A HARNESS ROW. A mechanical item was
      // decided from string facts and no model was asked, so writing one there
      // would be a claim about a call that never happened — and a reader could
      // no longer tell a judged row from a decided one by its own fields.
      const harnessRows = (rec.results || []).filter((x) => x.judged === false);
      ok("#997: a harness-decided row carries NO model key — no call was made to name",
        harnessRows.length > 0 && harnessRows.every((x) => !("model" in x)));
      // AND THE RUN SAYS IT OUT LOUD, as a DECLARATION rather than as an
      // observation: the Harness invoked no judge, which is the same reading
      // terrain's judge pin was corrected to at kogaki#892.
      ok("#997: the emission names the declared judge and says nothing verified it",
        new RegExp(`judged by DECLARED model\\(s\\) — ${JUDGE_MODEL}; `
          + "the Harness invoked no model and verified none\\.").test(r.stdout),
        r.stdout.split("\n").filter((l) => /DECLARED/.test(l)).join(" | ") || "(no such line)");
    }

    const ITEMS = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    baseLines = linesOf(r.stdout);
    // THE ROWS THAT APPLY TO THIS DRAFT, computed from the table rather than
    // counted here (kogaki#880). This fixture's Steps carry no figure, so the
    // figure rows are not evaluated on them — and the count is derived from
    // `figure_only` so a table gaining a sixth figure row moves this number
    // without anyone editing it, while a table gaining an ordinary row still
    // fails here if the runtime does not compute it.
    const PROSE_ITEMS = ITEMS.items.filter((i) => !i.figure_only);
    ok("one comparison line per (Step, item), over the whole item table",
      baseLines.size === 3 * PROSE_ITEMS.length);
    ok("every Step and every item the table declares has a line",
      ["a1", "a2", "a3"].every((s) => PROSE_ITEMS.every((i) => baseLines.has(`${s}/${i.id}`))));
    // kogaki#880 AC3, RESTORED AT kogaki#1018: a figureless Draft carries no
    // figure item in its log. The rows are back in the table, so the property is
    // conditional again and this is the figureless half of it — the Steps of
    // this fixture carry no figure, and a figure row appearing here would be the
    // vacuous `holds` the design refuses. The figure-carrying half is the
    // kogaki#880 block further down.
    ok("the table declares its figure rows, every one of them figure-only",
      ITEMS.items.filter((i) => /^figure-/.test(i.id)).length === 5
      && ITEMS.items.filter((i) => /^figure-/.test(i.id)).every((i) => i.figure_only === true));
    ok("and no run over a FIGURELESS Draft logs one, mechanically or as a model call",
      ![...baseLines.keys()].some((k) => /\/figure-/.test(k))
      && !(rec.mechanical || []).some((c) => /^figure-/.test(c.item))
      && !(rec.model_calls || []).some((c) => /^figure-/.test(c.item)));

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

  // 18 — kogaki#874: `correct` REFUSES A STEP PASS ONE DID NOT SEND IT, and the
  // refusal carries the owed set. This run's join is clean, so nothing is owed
  // — which is the case that binds the CLASS rule at this act: a best-effort
  // fail rides along and never sends a Step here, and a Harness that accepted
  // any Step would let a reviewer re-realize prose no finding asked about.
  //
  // THIS BLOCK RUNS NO `check`, deliberately. Pass two would set `checked_at`
  // on this run and case 19 asserts the record says ONE pass — the clean base
  // run is what that assertion is about, and the two-pass drive has its own
  // Draft below rather than borrowing this one.
  {
    const r = drive("correct", "--step", "a1");
    ok("correct refuses a Step carrying no failing preserved item",
      r.status === 1 && /carries no failing PRESERVED item/.test(r.stderr));
    ok("and names the owed set rather than leaving the reviewer to look",
      /owed: \(none/.test(r.stderr));
    ok("and says a best-effort fail never sends a Step here",
      /rides along/.test(r.stderr));
    const u = drive("correct", "--step", "zz");
    ok("correct refuses an unknown Step naming this Draft's Steps",
      u.status === 1 && /unknown step `zz`/.test(u.stderr) && /a1, a2, a3/.test(u.stderr));
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
      { step_id: "a1", item: "reader_state_after", why: "the outlined state still differs after pass two" },
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
    // `node:child_process` joins the set at kogaki#874, and the property is
    // UNCHANGED rather than widened: the clause this case mechanizes is "only
    // node builtins and ./runs.mjs", and a builtin is what it is. It is here
    // for one act — `correct` re-enters the realization lane as a subprocess,
    // because a corrected Step must be realized by the renderer that wrote the
    // Packets rather than by a second one written here. The ruling it protects
    // is about what the REVIEWER reads, and the two store literals asserted
    // below are what would catch a Move or Strand read composed at runtime.
    // `./draft.mjs` joins the set at kogaki#1014, and it too is a NARROWING
    // read rather than a widening of what the reviewer may see: the Reverse
    // Outline is a Brief Step block, so it is parsed by `parseStepBlock` —
    // the function `parseBrief` calls per fenced block — instead of by a
    // second reader written here. A second parser is the two-copy divergence
    // this whole act removes, and `draft.mjs` is already re-entered as a
    // subprocess by `correct`, so no store this case guards becomes reachable.
    // `node:os` JOINED THE LIST AT kogaki#1100, and it is a builtin the
    // BLINDNESS does not touch: the reply arrives on standard input now, and
    // handing it to `draft.mjs` — which takes a path — needs a temporary
    // directory outside the workspace. It reads no material the reviewer is
    // blind to; what the list refuses is a reader, and `tmpdir` is not one.
    const ALLOWED = new Set(["node:fs", "node:path", "node:url", "node:crypto",
      "node:child_process", "node:os", "./runs.mjs", "./draft.mjs"]);
    // BOTH IMPORT FORMS (kogaki#883, finding 1). The first scan matched static
    // `from "…"` only, so a production-side `await import("./strand.mjs")` —
    // the exact form this very function uses for its own builtins — was
    // invisible to it. One scanner, used on the Harness and on the fixture
    // below, so the fixture exercises the scan the case runs rather than a
    // copy of it.
    // THREE FORMS AND ONE QUOTE CLASS (PR #943 round 1). `from '…'` and a bare
    // side-effect `import "…"` were each matched by neither half — the same
    // admit-by-default fallback this case exists to invert, one form over.
    const importsOf = (text) => [
      ...[...text.matchAll(/\bfrom\s*["']([^"']+)["']/g)].map((m) => m[1]),
      ...[...text.matchAll(/^\s*import\s+["']([^"']+)["']/gm)].map((m) => m[1]),
      ...[...text.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]),
    ];
    const imports = importsOf(code);
    const foreign = imports.filter((m) => !ALLOWED.has(m));
    ok("the Harness imports ONLY node builtins, ./runs.mjs and the Brief parser — an allowlist, so an unanticipated reader is refused by default",
      imports.length > 0 && foreign.length === 0, foreign.join(", "));
    // The scan's own reach, asserted on a fixture rather than trusted: a
    // dynamic import of a disallowed module must be CAUGHT, and a dynamic
    // import of an allowed one must not be.
    // THE SECOND DISALLOWED NAME MOVED WHEN THE LIST DID (kogaki#1100). It was
    // `node:os`, which the list now admits, and a fixture whose second example
    // became allowed would have gone on passing while asserting one name where
    // it says two. `node:https` is the replacement and a truer example besides:
    // a builtin that reads something the reviewer is blind to.
    const dyn = 'import { x } from "node:fs";\nconst s = await import("./strand.mjs");\nconst o = await import("node:https");';
    const dynForeign = importsOf(dyn).filter((m) => !ALLOWED.has(m));
    ok("and the scan sees a dynamic import — a fixture importing ./strand.mjs at runtime is refused by name",
      dynForeign.length === 2 && dynForeign.includes("./strand.mjs") && dynForeign.includes("node:https"),
      dynForeign.join(", "));
    ok("while a dynamic import of an allowed module passes the same scan",
      importsOf('const { x } = await import("node:child_process");').filter((m) => !ALLOWED.has(m)).length === 0);
    // And the two forms round 1 named: a single-quoted static import and a
    // bare side-effect import, each refused by name through the same scanner.
    const quoted = importsOf("import { y } from './strand.mjs';\nimport './moves.mjs';\nimport 'node:fs';")
      .filter((m) => !ALLOWED.has(m));
    ok("and a single-quoted `from '…'` and a bare side-effect `import '…'` are both seen",
      quoted.length === 2 && quoted.includes("./strand.mjs") && quoted.includes("./moves.mjs"),
      quoted.join(", "));
    // The two store literals stay asserted beside it: a Move or Strand reached
    // by a path composed at runtime imports nothing, so the allowlist alone
    // cannot see it. Neither case subsumes the other.
    //
    // AND THE CLAUSE IS NARROW ON PURPOSE. `brief.md` is deliberately NOT in
    // this list, though the ruling covers Briefs too: the refusals at
    // `resolveInputs` name `draft.mjs emit --brief <brief.md>` as the act that
    // repairs a stale trace, and a literal test cannot tell that MENTION from a
    // READ. Widening it would have failed on a correct refusal message, which
    // is the guard-that-fires-on-correct-behaviour case. The Brief is covered
    // by the allowlist above, where the distinction is decidable.
    ok("and reads no moves/ or gloss/ store literal",
      !/moves\//.test(code) && !/ELEMENTS\.jsonl/.test(code));
  }

  // 23a — FINDING 2: `body_sha` is the SAME number on both sides. `emit` writes
  // `fm + "\n\n" + body + "\n"` and records `sha256(body)`; the fixture Draft is
  // built in exactly that form, so the two can be compared directly. The
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
  // AC1 — the Reverse Outline input for a CONTINUING Step carries the article before
  // it and none of its own Packet. The fixture's Packets hold PACKETONLYTOKEN,
  // and case 8 already asserts its absence for a1; a2 is the case that matters
  // for the article-so-far block, because a1's block is the empty one.
  {
    const input = readFileSync(join(WS, "pass-1", "outline-input", "a2.md"), "utf8");
    ok("a continuing Step's Reverse Outline input carries the PRECEDING Step's prose",
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
    const first = readFileSync(join(WS, "pass-1", "outline-input", "a1.md"), "utf8");
    ok("the article's FIRST passage says nothing precedes it rather than rendering an empty block",
      /nothing yet — this is the article's first passage/.test(first));
    // a3 opens the SECOND Section, so its block carries both headings.
    const third = readFileSync(join(WS, "pass-1", "outline-input", "a3.md"), "utf8");
    ok("a Step opening a later Section carries every earlier Section's heading",
      third.includes(`## ${SECTIONS[0].title}`) && !third.includes(`## ${SECTIONS[1].title}`));
  }

  // THE REVERSE OUTLINE IS VALIDATED BY THE BRIEF PARSER, and every refusal
  // NAMES what it saw (kogaki#1014). An outline is the one artifact in this flow
  // a person writes by hand, so a bare "invalid" costs another read to act on.
  //
  // THERE IS NO TEMPLATE FILE ANY MORE, so the absent-template case above is
  // gone with it: the input is rendered from the field declaration, and a
  // declaration that lost a field is caught by the count case below rather than
  // by a file's absence.
  {
    const ws3 = join(root, "ws3");
    const D = (...a) => selfRun(
      [self, ...a, "--draft", draft.path, "--workspace", ws3]);
    ok("a third run opens", D("open").status === 0);

    // `expect` is a substring or a regex. The refusals quote field names in
    // backticks, which read far more clearly as substrings than as patterns
    // escaped through two layers.
    const bad = (name, mutate, expect) => {
      const f = writeRecord("a1", mutate);
      const r = D("outline", "--step", "a1", "--file", f);
      const hit = typeof expect === "string" ? r.stderr.includes(expect) : expect.test(r.stderr);
      ok(name, r.status === 1 && hit);
    };

    // ITERATED FROM THE DECLARATION, never transcribed — the same discipline PR
    // #884 round 1 finding 3 imposed on the deleted schema. A field added to
    // RECONSTRUCTIBLE_FIELDS gains its refusal case here without an edit.
    for (const f of RECONSTRUCTIBLE_FIELDS.filter((x) => x.kind === "line")) {
      bad(`an outline missing \`${f.name}\` is refused BY NAME`,
        (o) => { o[f.name] = null; return o; },
        `carries no \`${f.name}:\` line`);
      bad(`a blank \`${f.name}\` is refused, and is a different refusal from an absent one`,
        (o) => { o[f.name] = ""; return o; },
        `\`${f.name}:\` is blank`);
    }

    // AN ABSENT OPTIONAL FIELD IS AN ANSWER. `introduces` is legitimately
    // absent — a passage that introduces nothing carries no line — and this is
    // the case that makes the refusals above mean something.
    {
      const f = writeRecord("a1");
      const r = D("outline", "--step", "a1", "--file", f);
      ok("while an outline with no introduces is accepted", r.status === 0);
    }

    // #1132 ACCEPTANCE 5: THE FIELDS ARE FIVE, AND THE TWO THAT LEFT ARE
    // REFUSED BY NAME. `opens_section` is a Brief Step field, so it is refused
    // through the not-reconstructible list the loop above iterates;
    // `concession` was never a Brief field at all, so the closed line set is
    // what names it. The two refusals read differently on purpose — a reader
    // repairing an outline is told which kind of mistake they made.
    ok("#1132 AC5: the Blind Reader is asked for five fields",
      reverseOutlineFieldCount() === 5
      && RECONSTRUCTIBLE_FIELDS.map((f) => f.name).join(",")
        === "purpose,reader_state_before,reader_state_after,claims,introduces",
      RECONSTRUCTIBLE_FIELDS.map((f) => f.name).join(","));
    bad("#1132 AC5: an outline carrying `concession` is refused, naming the field",
      (o) => { o.extra = { ...(o.extra || {}), concession: "a loss the passage owns" }; return o; },
      "carries `concession:`, which is not a Brief Step field");
    {
      const inp = readOrEmpty(join(ws3, "fixture", "pass-1", "outline-input", "a1.md"));
      ok("#1132 AC5: and the rendered input asks for five fields, naming neither",
        /## The five fields/.test(inp)
        && !/opens_section/.test(inp) && !/concession/.test(inp),
        inp.split("\n").filter((l) => /fields|opens_section|concession/.test(l)).join(" | "));
    }

    // `claims` IS THE ONE RECONSTRUCTIBLE FIELD WITH A FLOOR, because a
    // passage that asserts nothing is not a passage.
    bad("an outline carrying no claim line is refused, with its own reason",
      (o) => { o.claims = []; return o; },
      /carries no `claim ` line/);

    // THE NOT-RECONSTRUCTIBLE FIELDS ARE REFUSED, NOT DROPPED. A field the
    // reader could not have read off the passage is an inference, and dropping
    // it silently would leave the inference having steered the rest of the
    // outline with no trace. Iterated from the declaration for the same reason.
    //
    // `figure` IS REFUSED ONE READER EARLIER, and that is asserted rather than
    // exempted (kogaki#1014): a bare `figure:` line is not a Brief Step field
    // the Brief itself would accept, so `parseStepBlock` refuses it before the
    // disposition list is consulted. Every field is still refused — which is
    // the property — and this one is refused by the Brief's own grammar, which
    // is the acceptance the single-parser change was for.
    for (const f of NOT_RECONSTRUCTIBLE_FIELDS) {
      if (f.name === "figure") {
        bad("an outline carrying `figure` is refused by the Brief parser before the disposition list",
          (o) => { o.extra = { ...(o.extra || {}), figure: "something" }; return o; },
          /figure: is declared with no figure_roles/);
        continue;
      }
      bad(`an outline carrying \`${f.name}\` is refused — it is declared not reconstructible`,
        (o) => { o.extra = { ...(o.extra || {}), [f.name]: "something" }; return o; },
        `carries \`${f.name}:\`, which is declared NOT reconstructible`);
    }

    // THE LINE SET IS CLOSED. A name nobody declared carries a judgment the
    // Harness never reads, and admit-by-default is how that arrives with no
    // trace — the same reason the deleted record's key set was closed
    // (kogaki#885). `impression` is the specimen precisely because nobody would
    // have thought to forbid it.
    bad("an undeclared line is refused — the set is closed, not forbidden-list-only",
      (o) => { o.extra = { impression: "the passage reads well" }; return o; },
      "carries `impression:`, which is not a Brief Step field");
    bad("and a verdict is refused by the same rule",
      (o) => { o.extra = { verdict: "holds" }; return o; },
      "carries `verdict:`, which is not a Brief Step field");
    bad("and so is advice",
      (o) => { o.extra = { advice: "tighten the second paragraph" }; return o; },
      "carries `advice:`, which is not a Brief Step field");

    // THE OUTLINE IS FILED AGAINST THE PASSAGE IT READ. A block whose step_id
    // names another Step is a reading of something else.
    bad("an outline whose step_id names a different Step is refused, naming both",
      (o) => { o.step_id = "a2"; return o; },
      "is `a2` and this pass is reading a1");

    // The refusal collects EVERY problem rather than the first, so a reader
    // repairing an outline does not discover them one run at a time.
    {
      const f = writeRecord("a1", (o) => { o.purpose = null; o.reader_state_after = null; o.extra = { score: "3" }; return o; });
      const r = D("outline", "--step", "a1", "--file", f);
      ok("every problem is named in one refusal, never the first one found",
        r.status === 1 && /carries no `purpose:` line/.test(r.stderr)
        && /carries no `reader_state_after:` line/.test(r.stderr)
        && /carries `score:`, which is not a Brief Step field/.test(r.stderr));
    }

    // NOT A STEP BLOCK AT ALL, and TWO of them, are separate refusals because
    // they are separate mistakes. Both come from the Brief's own fence grammar.
    {
      const f = join(root, "notblock.md"); writeFileSync(f, "outlined a1, in prose\n");
      const r = D("outline", "--step", "a1", "--file", f);
      ok("an outline that is not a fenced step block is refused, saying what one is",
        r.status === 1 && /carries no fenced `step` block/.test(r.stderr));
      const g = join(root, "twoblocks.md");
      writeFileSync(g, readFileSync(writeRecord("a1"), "utf8") + "\n" + readFileSync(writeRecord("a2"), "utf8"));
      const r2 = D("outline", "--step", "a1", "--file", g);
      ok("two step blocks are refused — an outline is the reading of ONE passage",
        r2.status === 1 && /carries more than one fenced `step` block/.test(r2.stderr));
    }

    // A BLOCK THE BRIEF ITSELF COULD NOT CARRY IS REFUSED BY THE BRIEF'S OWN
    // REFUSAL, which is the acceptance rather than a way of meeting it: the
    // grammar below is `introducesRefusal`'s, reached through `parseStepBlock`.
    // A BARE TERM IS VALID — the grammar is "term, or term — anchor" — so the
    // malformed entry is the SEPARATOR WITH NOTHING AFTER IT, which is the one
    // form `parseIntroducesEntry` names in its own words.
    bad("a malformed introduces entry is refused by the Brief parser's own grammar",
      (o) => { o.introduces = ["opacity —"]; return o; },
      /introduces/);

    // THE VALIDATION HAPPENS BEFORE THE OUTLINE IS WRITTEN. One validated
    // afterwards would leave `compare` to discover the defect, by which point
    // the reader who could fix it has finished reading.
    {
      // A FRESH workspace: `ws3` already holds a successful a1 outline from the
      // accepted case above, and asserting absence there would pass or fail on
      // that history rather than on this refusal.
      const ws4 = join(root, "ws4");
      spawnSync(process.execPath, [self, "open", "--draft", draft.path, "--workspace", ws4], { encoding: "utf8" });
      const f = writeRecord("a1", (o) => { o.purpose = null; return o; });
      const r = selfRun(
        [self, "outline", "--step", "a1", "--file", f, "--draft", draft.path, "--workspace", ws4]);
      ok("a refused outline is not written to the workspace",
        r.status === 1 && !existsSync(join(ws4, "fixture", "pass-1", "outline", "a1.json"))
        && !existsSync(join(ws4, "fixture", "pass-1", "outline", "a1.md")));
    }

    // BOTH HALVES ARE KEPT, and this is what makes the run's own record able to
    // show what the Blind Reader said rather than only what the Harness read
    // out of it.
    {
      const f = writeRecord("a2");
      const r = D("outline", "--step", "a2", "--file", f);
      ok("an accepted outline lands as BOTH the block it was written as and the reading",
        r.status === 0
        && existsSync(join(ws3, "fixture", "pass-1", "outline", "a2.md"))
        && existsSync(join(ws3, "fixture", "pass-1", "outline", "a2.json")));
      const rec = JSON.parse(readFileSync(join(ws3, "fixture", "pass-1", "outline", "a2.json"), "utf8"));
      // ASSERTED AS A SUBSET, NEVER AS A BLACKLIST (kogaki#1018). This used to
      // name three keys of the deleted second schema and check they were
      // absent, which passes for a fourth key nobody thought to list — and the
      // second schema arrived one field at a time, so the key nobody listed is
      // exactly the one that would arrive. The reading's key set is closed
      // against the Brief's own field list instead, so ANY foreign key fails
      // here, listed or not.
      const briefNames = new Set([...RECONSTRUCTIBLE_FIELDS.map((f) => f.name), "step_id"]);
      const foreign = Object.keys(rec).filter((k) => !briefNames.has(k));
      ok("and the reading carries the BRIEF's field names and no other schema's",
        Object.prototype.hasOwnProperty.call(rec, "claims")
        && Object.prototype.hasOwnProperty.call(rec, "introduces")
        && foreign.length === 0);
    }
  }


  // ---- kogaki#872 -------------------------------------------------------
  // ACCEPTANCE 2: one failing pair yields exactly one new failing item on that
  // Step, and no change elsewhere.
  //
  // DRIVEN AS TWO WHOLE RUNS OVER TWO WHOLE DRAFTS, because the Packet's sha is
  // in the trace: editing a Packet under a live Draft is refused by `open`, by
  // design, so "a Packet copy" is a second Draft emitted against it. The two
  // Drafts differ in exactly one claim, and every line range is identical
  // because `buildDraft` computes them from the same body.
  {
    const full = join(root, "packets-full"); mkdirSync(full, { recursive: true });
    const short = join(root, "packets-short"); mkdirSync(short, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) {
      writePacket(full, id);
      // a1 keeps only its FIRST claim, so the two runs put a different number
      // of questions to the judge on that Step and the same number everywhere
      // else — which is what makes "no change elsewhere" worth asserting.
      writePacket(short, id, id === "a1" ? { claims: [CLAIMS.a1[0]] } : {});
    }
    const dFull = buildDraft(join(root, "theses", "full"), { packetDir: full });
    const dShort = buildDraft(join(root, "theses", "short"), { packetDir: short });
    const rFull = driveToCompletedJoin(dFull, join(root, "ws-full"), "full");
    // THE FAIL IS THE JUDGE'S, NOT THE MATCHER'S (kogaki#996, and the pair is
    // the DECLARED claim's since kogaki#1132). Before the ruling of 2026-09-07
    // this case needed no override: the Harness failed an unpaired claim as
    // `widened` with no model call. `claims` now asks the judge, once per
    // declared claim, whether the reader recovered it — so a fail is a READING
    // and a case that wants one has to say the judge gave it. What the case
    // still measures is unchanged: ONE pair failing moves exactly one line and
    // sends exactly that Step to correction.
    const rShort = driveToCompletedJoin(dShort, join(root, "ws-short"), "short",
      (o) => (o.step_id === "a1" && o.item === "claims" && o.pair === 0
        ? { verdict: "fails", reason: "no claim the reader wrote carries this declared claim" }
        : null));
    ok("both runs reach a completed join", rFull.second.status === 0 && rShort.second.status === 0);

    const L1 = linesOf(rFull.second.stdout);
    const L2 = linesOf(rShort.second.stdout);
    const failing = (m) => [...m.entries()].filter(([, l]) => /\sfails\s/.test(l)).map(([k]) => k);
    ok("the unmutated run has no failing item", failing(L1).length === 0);
    ok("one failed pair yields EXACTLY ONE failing item", failing(L2).length === 1);
    ok("and it is on the Step whose Packet lost the claim, on the claims item",
      failing(L2)[0] === "a1/claims");
    ok("and the line carries the judge's own reason rather than a pairing fact",
      /no claim the reader wrote carries this declared claim/.test(L2.get("a1/claims")));
    // NO CHANGE ELSEWHERE, asserted as line-for-line identity over every OTHER
    // pair rather than as a count: a count would pass while two items swapped
    // verdicts.
    const changed = [...L1.keys()].filter((k) => k !== "a1/claims" && L1.get(k) !== L2.get(k));
    ok("and nothing else changes — every other (Step, item) line is identical",
      L1.size === L2.size && changed.length === 0, changed.join(", "));
    // EVERY DECLARED CLAIM IS ASKED ABOUT AND NONE IS DECIDED BY THE HARNESS.
    // This is the inverse of what the case asserted before kogaki#996, and
    // kogaki#1132 moved the unit it is counted in: the questions are the
    // DECLARED claims', so the Step that kept one claim costs one call.
    const recShort = JSON.parse(readFileSync(rShort.jsonPath, "utf8"));
    ok("the declared claim is asked about, not decided by the Harness",
      recShort.model_calls.some((c) => c.step_id === "a1" && c.item === "claims" && c.pair === 0)
      && !recShort.mechanical.some((c) => c.item === "claims"));
    // #1132 ACCEPTANCE 3: `join.json` records ONE entry in `pairs` per declared
    // claim, each carrying that claim's own text — which is what lets the
    // correction name the claim that was lost rather than the row that failed.
    {
      const recFull = JSON.parse(readFileSync(rFull.jsonPath, "utf8"));
      const fRow = (recFull.results || []).find((r) => r.step_id === "a1" && r.item === "claims");
      ok("#1132 AC3: the claims row carries one pair per DECLARED claim, each with its text",
        !!fRow && (fRow.pairs || []).length === CLAIMS.a1.length
        && CLAIMS.a1.every((g, k) => fRow.pairs[k].declared === g),
        fRow ? JSON.stringify((fRow.pairs || []).map((x) => x.declared)) : "no row");
      const sRow = (recShort.results || []).find((r) => r.step_id === "a1" && r.item === "claims");
      ok("#1132 AC3: and the row fails when any one of those entries fails",
        !!sRow && sRow.verdict === "fails" && (sRow.pairs || []).length === 1
        && sRow.pairs[0].declared === CLAIMS.a1[0]);
      ok("#1132: while the row's evidence quotes the declared claim the line refused to carry",
        !!sRow && (sRow.evidence || []).includes(CLAIMS.a1[0]),
        sRow ? JSON.stringify(sRow.evidence || null) : "no row");
    }
    // kogaki#997, PR #1001 round 1 — THE ROW-LEVEL `model` KEY, AND THE VEHICLE
    // THIS CASE LOST TO kogaki#996.
    //
    // #997's defect was the HYBRID ROW: `claims` used to carry a Harness-decided
    // `widened` fail beside pairs a model answered, `fails` won the selection,
    // and the row read `judged: true` while the line it rendered came
    // from the Harness — a row claiming a judge and naming none. The fix keys
    // the key's PRESENCE on the row and its VALUE on the chosen pair, and that
    // fix is untouched here (the selection at `rowDecidedBy`).
    //
    // WHAT CHANGED IS THAT THE SHIPPED TABLE CAN NO LONGER BUILD ONE. `claims`
    // was the only `paired` item, and kogaki#1132 removed that mode outright:
    // every pair of a `per-declared` row is put to a model, so no row mixes the
    // two deciders. The selection rule that keeps the row's decider and the
    // line's apart is still live code — it is what `deciderOf` and
    // `consequenceOf` share — and the item table is FIXED in the Harness by
    // design (`readItems`), so this case has no fixture that can reach it. It is
    // recorded here rather than deleted: the guarantee is live code with no
    // current specimen, not a retired rule.
    //
    // WHAT IS ASSERTED INSTEAD IS VEHICLE-INDEPENDENT and stronger for it —
    // stated over EVERY row the run produced rather than over one built row.
    {
      const row = (recShort.results || [])
        .find((r) => r.step_id === "a1" && r.item === "claims");
      ok("#997: the judged row reads `judged: true` — some pair was judged",
        row && row.judged === true && row.verdict === "fails");
      ok("#997: and it CARRIES the model key, because presence answers `was a model asked here`",
        row && "model" in row);
      // AND THE TRUTH PER PAIR IS STILL THERE, which is what makes a null at the
      // row safe to render rather than a loss.
      ok("#997: while the judged pairs inside it still name what answered them",
        row && (row.pairs || []).some((sub) => sub.judged === true && sub.model === JUDGE_MODEL));
      // THE INVARIANT THE HYBRID CASE WAS PROTECTING, over every row in the run:
      // presence tracks `was a model asked`, and nothing names a model it did
      // not consult. A hybrid row would satisfy both of these too — which is
      // why these hold whether or not the table can build one.
      const allRows = recShort.results || [];
      ok("#997: every model-decided row carries the model key, across the whole run",
        allRows.filter((r) => r.judged === true).every((r) => "model" in r),
        `${allRows.filter((r) => r.judged === true && !("model" in r)).length} without it`);
      ok("#997: and no Harness-decided row names a model it never consulted",
        allRows.filter((r) => r.judged === false).every((r) => !("model" in r)));
      ok("#997: while every pair naming a model was answered by one",
        allRows.flatMap((r) => r.pairs || [])
          .every((sub) => (sub.model == null) || sub.judged === true));
    }
    // A PRESERVED item failing is what sends a Step to correction, and the run
    // says which — the class is the consequence, never a severity.
    ok("a preserved item failing sends its Step to correction, and the run names it",
      /Steps sent to correction[^\n]*a1/.test(rShort.second.stdout));
  }

  // THE HYGIENE AND MOVE ROWS ARE GONE, AND THIS IS THE RECORDED DECLINE
  // (kogaki#1013 item 3, owner 2026-09-09). What stood here was ACCEPTANCE 3's
  // `term-before-introduction` case — a term used one Step before the Step
  // whose Packet says to introduce it, caught mechanically with the earlier
  // occurrence as its span. Prose hygiene is not part of Reverse Outlining: a
  // reader cannot infer the source a structure was produced from, and being
  // able to would be abnormal. So the row left the table and its implementation
  // left `MECHANICAL` — and this case asserts the removal rather than being
  // deleted with them, because a behaviour leaves under a recorded decline and
  // never silently. Whether any of the five survives as a realization-time lint
  // in `draft` is a separate question for the owner, not this rebuild.
  //
  // WHAT SURVIVES HERE IS THE BINDING BETWEEN THE TABLE AND THE CODE, which is
  // the half that would let a row come back with no implementation behind it.
  {
    const ITEMS = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    const ids = ITEMS.items.map((i) => i.id);
    for (const gone of ["term-before-introduction", "restates-earlier-step", "packet-wording",
      "exemplar-leak", "move-contract"]) {
      ok(`the Round Trip table carries no \`${gone}\` row`, !ids.includes(gone));
    }
    ok("and no row keeps a translation column — every row names a Brief Step field",
      ITEMS.items.every((i) => !Object.prototype.hasOwnProperty.call(i, "outlined_field")));

    const r = driveToCompletedJoin(draft, join(root, "ws-mech"), "mech");
    ok("a run still reaches a completed join with those rows gone", r.second.status === 0);
    const rec = JSON.parse(readFileSync(r.jsonPath, "utf8"));
    const mech = ITEMS.items.filter((i) => i.mode === "mechanical").map((i) => i.id);
    ok("every item the table calls mechanical costs no model call on any Step",
      mech.length > 0 && !rec.model_calls.some((c) => mech.includes(c.item)));
    ok("and every judged item DOES cost one",
      ITEMS.items.filter((i) => i.mode === "judged" && !i.figure_only)
        .every((i) => rec.model_calls.some((c) => c.item === i.id)));
  }

  // ROUND 1, FINDING 2: a Step whose Brief declares NO claims is an ordinary
  // Step, not a Packet gap. The renderer writes `(none recorded)` into the
  // claims BLOCK, below a bullet whose own text is fixed instruction prose, so
  // a reader testing the bullet could never match and refused the whole run.
  {
    const pd = join(root, "packets-claimless"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(pd, id, id === "a2" ? { claims: [] } : {});
    ok("the fixture's claimless Packet carries the stated absence the renderer writes",
      /\(none recorded\)/.test(readFileSync(join(pd, "a2.md"), "utf8")));
    const d = buildDraft(join(root, "theses", "claimless"), { packetDir: pd });
    const r = driveToCompletedJoin(d, join(root, "ws-claimless"), "claimless");
    ok("a Step declaring no claims does not refuse the run as a Packet gap",
      r.second.status === 0 && !/carries no `claims` block/.test(r.first.stderr + r.second.stderr));
    const L = linesOf(r.second.stdout);
    // `claims` IS DECIDED BY THE TABLE, NOT ASKED OVER AN EMPTY LIST (PR #1003
    // successor). The item declares its answer for a stated absence, so no
    // Packet is rendered and no model is asked — and since kogaki#1132 the
    // arithmetic is direct: the questions ARE the declared claims, so a Step
    // declaring none has none to ask.
    {
      const grec = JSON.parse(readOrEmpty(r.jsonPath) || "{}");
      const row = (grec.results || []).find((x) => x.step_id === "a2" && x.item === "claims");
      ok("a Step declaring no claims has `claims` decided by the item's declared-absence arm",
        !!row && row.judged === false && row.verdict === "holds"
        && /declares no claim/.test(row.reason || ""), row ? JSON.stringify(row).slice(0, 200) : "no row");
      ok("and no join Packet is rendered for it",
        !(grec.model_calls || []).some((c) => c.step_id === "a2" && c.item === "claims")
        && (grec.mechanical || []).some((m) => m.step_id === "a2" && m.item === "claims"));
    }
    // The other Steps are untouched: the absence is this Step's, not the run's.
    ok("while a Step that DOES declare claims is still asked about every one of them",
      /\sholds\s/.test(L.get("a1/claims") || "")
      && (JSON.parse(readOrEmpty(r.jsonPath) || "{}").model_calls || [])
        .filter((c) => c.step_id === "a1" && c.item === "claims").length === CLAIMS.a1.length);
  }

  // kogaki#1016 — A STEP WHOSE PACKET DECLARES NO `introduces` IS DECIDED BY THE
  // HARNESS, and this case COUNTS the calls rather than reading a line. The
  // 2026-09-08 run spent ten model calls asking whether every term in an EMPTY
  // list was introduced — a question quantifying over nothing, answered `holds`
  // ten times at a judge's price. The short circuit is the arm `claims` already
  // declares (`when_declared_absent`), reached through the same runtime branch,
  // so this is one table entry and no second mechanism.
  //
  // THE CASE'S OWN ADMISSION, declared here because a check owes it at birth
  // rather than at its first review:
  //   - LOOP POSITION: `pre-push`, the tier check-review-draft-runtime.sh
  //     already sits at. It adds one drive of the fixture flow — no gateway, no
  //     network, no newly spawned artifact — so nothing here argues the member
  //     earlier or later in the loop.
  //   - BUDGET: inside the member's declared `runtime_ms`, re-measured at this
  //     admission act and recorded in its `runtime_ms_note`. A measurement, not
  //     an assertion: nothing fails on the number.
  //   - REMOVAL SIGNAL: the `introduces` row leaves the item table, or its
  //     declared side stops being able to be empty — at which point there is no
  //     empty declared side for a call to be spent on. It is NOT retired by a
  //     successor that merely renders fewer Packets: the property is that ZERO
  //     calls are made for this field, and a pass that never counts them cannot
  //     witness it, which is the further condition this member's own
  //     `removal_signal` already states of its siblings.
  {
    const pd = join(root, "packets-termless"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(pd, id, { introduces: [] });
    ok("the fixture's termless Packet carries the stated absence the renderer writes",
      /\(nothing new\)/.test(readFileSync(join(pd, "a1.md"), "utf8")));
    const d = buildDraft(join(root, "theses", "termless"), { packetDir: pd });
    const r = driveToCompletedJoin(d, join(root, "ws-termless"), "termless");
    ok("a Brief whose Steps introduce no term reaches a completed join",
      r.second.status === 0, (r.second.stderr || "").slice(0, 200));
    const rec = JSON.parse(readOrEmpty(r.jsonPath) || "{}");
    // THE COUNT, AND IT IS ZERO. Asserted as a count over the WHOLE run rather
    // than as one Step's row: a case reading a single row would pass on a run
    // that still spent a call on the other two Steps.
    const calls = (rec.model_calls || []).filter((c) => c.item === "introduces");
    ok("a Brief with no `introduces` line costs ZERO model calls for that field",
      calls.length === 0, `${calls.length} call(s) on ${calls.map((c) => c.step_id).join(", ")}`);
    ok("and every Step records the field as decided by the Harness",
      ["a1", "a2", "a3"].every((s) =>
        (rec.mechanical || []).some((m) => m.step_id === s && m.item === "introduces")));
    // THE ANSWER IS THE TABLE'S, IN THE TABLE'S OWN WORDS — read from
    // review-items.json rather than transcribed here, so an amended sentence
    // reaches this case instead of sliding past it.
    const armItems = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    const arm = armItems.items.find((i) => i.id === "introduces").when_declared_absent;
    const row = (rec.results || []).find((x) => x.step_id === "a2" && x.item === "introduces");
    ok("the row is the item's declared-absence arm, verdict and sentence both",
      !!row && row.judged === false && row.verdict === arm.verdict
      && row.reason === arm.sentence, row ? JSON.stringify(row).slice(0, 220) : "no row");
    ok("and it still renders a comparison line like any other row",
      /\sholds\s/.test(linesOf(r.second.stdout).get("a2/introduces") || ""));

    // THE NON-EMPTY PATH KEEPS FOUR BEHAVIOURS, each named with the case that
    // fails if it stops holding. They are asserted against the DEFAULT fixture,
    // whose `a1` declares a term while `a2` and `a3` do not, so one run
    // witnesses both sides of the branch:
    //   1. a declared term still costs exactly one model call;
    //   2. that call's declared side still carries the term rather than the
    //      stated absence;
    //   3. the empty-declared Steps of the SAME run are still short-circuited,
    //      so the branch is per Step and never per run;
    //   4. the OTHER mechanical rows still answer on every Step, empty declared
    //      side included — the short-circuit is per ITEM, never per Step.
    //
    // CASE 4 HAS OUTLIVED TWO VEHICLES AND IS NOW STATED WITHOUT ONE.
    // kogaki#1016 wrote it against `term-before-introduction`; kogaki#1014
    // removed that row and it was retargeted at `claims-unused`; kogaki#1132
    // removed that one too, and no mechanical row answers on a prose Step any
    // more. The property was never about a particular row — it is that the
    // short circuit is per ITEM and not per Step — so it is asserted directly:
    // a Step the Harness settled `introduces` on still costs its other items
    // their calls.
    ok("1: a Step that DOES declare a term still costs one model call for it",
      (baseRecord.model_calls || [])
        .filter((c) => c.item === "introduces" && c.step_id === "a1").length === 1);
    const dcall = (baseRecord.model_calls || [])
      .find((c) => c.item === "introduces" && c.step_id === "a1");
    const djp = dcall && existsSync(dcall.packet) ? readFileSync(dcall.packet, "utf8") : "";
    const dside = (djp.split("### What the Packet DECLARED")[1] || "").split("###")[0];
    ok("2: and its declared side carries the term, not the stated absence",
      /harness/.test(dside) && !/nothing new/.test(dside), dside.trim().slice(0, 140));
    ok("3: while the same run's term-less Steps are decided by the Harness",
      ["a2", "a3"].every((s) => (baseRecord.mechanical || [])
        .some((m) => m.step_id === s && m.item === "introduces"))
      && !(baseRecord.model_calls || [])
        .some((c) => c.item === "introduces" && c.step_id !== "a1"));
    ok("4: while the short-circuited Steps still cost their OTHER items a call each",
      ["a2", "a3"].every((s) => (baseRecord.model_calls || [])
        .some((c) => c.step_id === s && c.item !== "introduces")));
  }

  // kogaki#1098 — `register-tests` LEFT THE ITEM TABLE, and the id is UNKNOWN
  // rather than merely unlisted. It was the last prose lint standing: its
  // declared side was the Packet's write-instruction paragraph and its reverse
  // side the passage itself, so no Reverse Outline field was involved at all,
  // and in the first full run it failed on seven of eight Steps — every time on
  // "one relation per sentence" — and sent nothing to correction. The table
  // entry was the whole carrier, so these assertions run against the surfaces a
  // CALLER meets: the rendered comparison, the run record, and `compare
  // --verdicts`. A case reading only the JSON would pass on a runtime that
  // still knew the id from somewhere else.
  {
    const t1098 = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    ok("#1098: `register-tests` is absent from the item table",
      !t1098.items.some((i) => i.id === "register-tests"));
    ok("#1098: and its Packet block is absent from `packet_blocks`",
      !Object.prototype.hasOwnProperty.call(t1098.packet_blocks, "register_tests"));
    ok("#1098: the run renders no join Packet for it, and records no row",
      !(baseRecord.model_calls || []).some((c) => c.item === "register-tests")
      && !(baseRecord.results || []).some((x) => x.item === "register-tests")
      && !(baseRecord.mechanical || []).some((m) => m.item === "register-tests"));
    ok("#1098: and no comparison line names it",
      ![...baseLines.keys()].some((k) => k.endsWith("/register-tests")));
    // THE UNKNOWN-ID ASSERTION IS AT THE SURFACE. A recorded verdict naming it
    // is refused as a pair the run never asked about — which is what "unknown"
    // means to a caller, and is a stronger statement than an absence this case
    // could read out of a file either way.
    const f1098 = join(root, "verdicts-register-tests.json");
    writeFileSync(f1098, JSON.stringify({ verdicts: [{ step_id: "a1", item: "register-tests",
      verdict: "holds", reason: "the passage reads plainly", model: JUDGE_MODEL }] }) + "\n");
    const r1098 = drive("compare", "--verdicts", f1098);
    ok("#1098: and a verdict naming it is refused as a pair the run never asked about",
      r1098.status === 1
      && /`a1\/register-tests`, which this run did not ask about/.test(r1098.stderr),
      (r1098.stderr || "").split("\n").slice(0, 2).join(" | "));
  }

  // kogaki#1098 — `already-knows` ON AN EMPTY DECLARED SIDE IS THE HARNESS'S.
  // The Packet's `already knows` list is empty for the FIRST Step of every
  // article by construction, and the pair was rendered anyway: the model was
  // asked whether the passage re-introduced a term the reader already knew,
  // over a list of no terms, and on the first full run it answered `fails` with
  // a reason stating the opposite — that the passage introduces both terms for
  // the first time. The arm is the one `claims` and `introduces` already
  // declare, reached through the same runtime branch, so this is one table
  // entry and no second mechanism.
  //
  // THE CASE'S OWN ADMISSION, in the form its #1016 sibling declares:
  //   - LOOP POSITION: `pre-push`, the tier check-review-draft-runtime.sh
  //     already sits at. It adds no drive of its own — every assertion reads the
  //     base run captured above — so nothing here argues the member earlier or
  //     later in the loop.
  //   - BUDGET: no new spawn, so the member's declared `runtime_ms` is unmoved.
  //   - REMOVAL SIGNAL: the `already-knows` row leaves the item table, or its
  //     declared side stops being able to be empty. It is NOT retired by a
  //     successor that merely renders fewer Packets: the property is that ZERO
  //     calls are made for this field on such a Step, and a pass that never
  //     counts them cannot witness it.
  {
    const armT = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    const arm = armT.items.find((i) => i.id === "already-knows").when_declared_absent;
    ok("#1098: `already-knows` declares a when_declared_absent arm with verdict `holds`",
      !!arm && arm.verdict === "holds"
      && typeof arm.sentence === "string" && /lists no term/.test(arm.sentence),
      JSON.stringify(arm || null));
    // THE COUNT IS ZERO FOR THE STEP WHOSE LIST IS EMPTY AND ONE FOR EACH STEP
    // WHOSE LIST IS NOT, asserted over the whole run: a case reading only a1's
    // row would pass on a run that had stopped asking about a2 and a3 as well,
    // which is a different defect wearing the same green.
    const aCalls = (baseRecord.model_calls || []).filter((c) => c.item === "already-knows");
    ok("#1098: the first Step, whose `already knows` list is empty, costs ZERO model calls",
      !aCalls.some((c) => c.step_id === "a1"), aCalls.map((c) => c.step_id).join(", "));
    ok("#1098: while the Steps that DO declare a known term still cost one each",
      ["a2", "a3"].every((s) => aCalls.filter((c) => c.step_id === s).length === 1),
      aCalls.map((c) => c.step_id).join(", "));
    // THE ANSWER IS THE TABLE'S, IN THE TABLE'S OWN WORDS — read from
    // review-items.json rather than transcribed here, so an amended sentence
    // reaches this case instead of sliding past it.
    const aRow = (baseRecord.results || [])
      .find((x) => x.step_id === "a1" && x.item === "already-knows");
    ok("#1098: and a1's row is the declared-absence arm, verdict and sentence both",
      !!aRow && aRow.judged === false && aRow.verdict === arm.verdict
      && aRow.reason === arm.sentence, aRow ? JSON.stringify(aRow).slice(0, 220) : "no row");
    ok("#1098: it still renders a comparison line like any other row",
      /\sholds\s/.test(baseLines.get("a1/already-knows") || ""),
      baseLines.get("a1/already-knows") || "(no line)");
    ok("#1098: and the run never asks a model about the row the table decided",
      !(baseRecord.model_calls || [])
        .some((c) => c.step_id === "a1" && c.item === "already-knows"));
  }

  // ROUND 1, FINDING 3: a `block` reader's declared side is the RENDERED VALUE,
  // never the template's instruction prose. The anchor used to stop one sentence
  // short of its paragraph, so the sentence after it was prepended to what the
  // judging model reads — the exact failure the reader's own comment names,
  // reached by an incomplete anchor rather than by a rewrap.
  //
  // THE VEHICLE CHANGED AND THE RULE DID NOT (kogaki#1132). The case was driven
  // through the `section-continues` join Packet, and that row left the table
  // with `section_placement`, its Packet block. `move_excerpt` is the `block`
  // declaration that survives, so the reader is asked directly rather than
  // through a join Packet no row renders any more — which is the whole of what
  // the drive was standing in for: what `packetBlock` hands back.
  {
    const bt = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    const blocks = Object.entries(bt.packet_blocks)
      .filter(([k, s]) => k !== "note" && s && s.kind === "block");
    const pkt = readFileSync(join(packetDir, "a1.md"), "utf8");
    ok("the item table still declares a `block` reader for this case to stand at",
      blocks.length > 0, blocks.map(([k]) => k).join(", "));
    const values = blocks.map(([, s]) =>
      packetBlock(pkt, s.heading, { after: wordSequence(s.after_words) }));
    ok("a `block` reader hands back the rendered value, not the instruction paragraph",
      values.every((v) => v !== null && v !== "")
      && values.some((v) => v.includes(PACKET_FIELDS.a1.excerpt)),
      JSON.stringify(values).slice(0, 200));
    // ASSERTED AGAINST THE TEMPLATE'S OWN SENTENCES rather than a transcribed
    // pair, so a paragraph the template gains is covered by the derivation.
    const bad = [];
    for (const [name, s] of blocks) {
      const v = (packetBlock(pkt, s.heading, { after: wordSequence(s.after_words) }) || "")
        .replace(/\s+/g, " ");
      const para = TEMPLATE.split(s.heading)[1].split("{{")[0];
      for (const sent of para.split(/(?<=\.)\s+/).map((x) => x.replace(/\s+/g, " ").trim())
        .filter((x) => x.length > 30)) {
        if (v.includes(sent)) bad.push(`${name}: ${sent}`);
      }
    }
    ok("and none of the template's instruction sentences survives into it",
      bad.length === 0, bad.join(" | "));
  }

  // ROUND 1, FINDING 5: a recorded verdict can be REVISED. `owed` shrinks as
  // answers land, so validating against it alone refused a re-submitted file and
  // told a reviewer correcting a wrong answer that the run never asked — which
  // is false, and named no repair.
  {
    const f = join(root, "revise.json");
    writeFileSync(f, JSON.stringify({ verdicts: [{ step_id: "a1", item: "purpose",
      verdict: "fails", reason: "the passage is doing a different job from the declared one",
      model: JUDGE_MODEL }] }) + "\n");
    const r = drive("compare", "--verdicts", f);
    ok("an answered pair can be answered again", r.status === 0 && /recorded: 1 verdict/.test(r.stdout));
    ok("and the revision is what the comparison line now renders",
      /\sfails\s/.test(linesOf(r.stdout).get("a1/purpose")));
    // Put it back, so the cases after this one see the run they expect.
    const g = join(root, "revise-back.json");
    writeFileSync(g, JSON.stringify({ verdicts: [{ step_id: "a1", item: "purpose",
      verdict: "holds", reason: "the declared line and the outlined one agree",
      model: JUDGE_MODEL }] }) + "\n");
    const back = drive("compare", "--verdicts", g);
    ok("and a revision is not one-way", /\sholds\s/.test(linesOf(back.stdout).get("a1/purpose")));
    // A pair the run never asked about is STILL refused, and the refusal now
    // names the answered set as revisable rather than claiming nothing is.
    const bad = join(root, "revise-bad.json");
    writeFileSync(bad, JSON.stringify({ verdicts: [{ step_id: "a1", item: "purpose", pair: 7,
      verdict: "holds", reason: "it reads fine" }] }) + "\n");
    const b = drive("compare", "--verdicts", bad);
    ok("while a pair nobody asked about is still refused, naming the revisable set",
      b.status === 1 && /already answered, which a revision may overwrite/.test(b.stderr));
  }

  // A TERM THE FRONTMATTER HAPPENS TO CARRY IS NOT MET BY THE READER THERE. The
  // record half holds the trace, the Brief pin and every cite, so a Step
  // introducing a word the trace contains would otherwise fail on a line no
  // reader ever sees, with the finding pointing at JSON as the place the reader
  // first met the term.
  {
    const pd = join(root, "packets-fm"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) {
      writePacket(pd, id);
      if (id === "a3") {
        const p = join(pd, "a3.md");
        writeFileSync(p, readFileSync(p, "utf8").replace("- **introduce here.** (nothing new)",
          "- **introduce here.** - packet"));
      }
    }
    const d = buildDraft(join(root, "theses", "fm"), { packetDir: pd });
    const fmText = readFileSync(d.path, "utf8").split("\n").slice(0, 8).join("\n");
    ok("the fixture's own frontmatter carries the term, so the case can witness the defect",
      /packet/.test(fmText));
    const r = driveToCompletedJoin(d, join(root, "ws-fm"), "fm");
    ok("the run completes", r.second.status === 0);
    // THE ASSERTION THIS DRIVE CARRIED LEFT WITH ITS ROW (kogaki#1014). It read
    // `a3/term-before-introduction` and that row went with the hygiene items,
    // whose removal is the ruling recorded in `src/review-items.json`: a reader
    // cannot infer the source a structure was produced from. The frontmatter
    // defect was a property of THAT row's mechanical haystack — it scanned the
    // whole file — and no surviving row scans anything, `introduces` being
    // judged from the passage. So what is asserted now is the property the
    // removal makes available: no row reaches outside the passage at all.
    ok("no surviving row can fail a Step on a term the frontmatter alone carries",
      [...linesOf(r.second.stdout).keys()].every((k) => !/term-before-introduction/.test(k)));
  }

  // kogaki#995 — A LIST ENTRY REACHES THE JUDGING MODEL AS ITS OWN WORDS. A
  // reverse side that is a list of OBJECTS was interpolated directly, so the
  // join input read `- [object Object]`. Every judgment given on that input in
  // the 2026-09-07 ReviewDraft run came back `cannot-decide`, which is the right
  // answer to an unreadable pair and the wrong thing for the record to carry as
  // a judgment.
  // ASSERTED ON THE JOIN PACKET THE RUN WROTE, never on the renderer: what the
  // defect was about is what reached the reader, and a unit assertion on
  // `renderSide` would pass while the Packet still carried the placeholder.
  //
  // THE VEHICLE CHANGED AND THE RULE DID NOT (kogaki#1132). The case rode the
  // `concessions` row, and that row left the table with the `concession` field
  // it read. The two reverse sides that are still lists of objects are `claims`
  // and `introduces`, and BOTH are asserted here — `claims` is the whole
  // outlined list on every `per-declared` Packet, which is the side this defect
  // would now land on, and `introduces` carries the stated-absence arm.
  {
    const pd = join(root, "packets-entries"); mkdirSync(pd, { recursive: true });
    // Every Step declares a term, so `introduces` is judged on all three rather
    // than short-circuited by its declared-absence arm — the case needs the
    // Packet to exist before it can assert what is in it.
    for (const id of ["a1", "a2", "a3"]) writePacket(pd, id, { introduces: ["harness"] });
    const d = buildDraft(join(root, "theses", "entries"), { packetDir: pd });
    const wsBase = join(root, "ws-entries");
    const D = (...a) => selfRun(
      [self, ...a, "--draft", d.path, "--workspace", wsBase]);
    D("open");
    const INTRODUCED = "harness — the thing that renders the input and reads the answer back";
    // ONE STEP INTRODUCES A TERM AND THE OTHERS DO NOT, so the case witnesses
    // the rendering rather than a constant: an absence still renders `(none)`
    // beside it.
    //
    // THE SPAN HALF OF THIS CASE LEFT WITH THE RECORD (kogaki#1014). It used to
    // assert the entry rendered as `<text> (lines lo–hi)`, and a Brief Step
    // field carries no draft coordinate — the span was the deleted record's own
    // invention. What the case was FOR survives whole: the entry must reach the
    // judging model as its own words.
    for (const id of ["a1", "a2", "a3"]) {
      const p2 = join(root, `rec-entries-${id}.md`);
      writeFileSync(p2, renderOutline({ ...outlineFor(id),
        introduces: id === "a3" ? [INTRODUCED] : [] }));
      D("outline", "--step", id, "--file", p2);
    }
    const cmp = D("compare");
    ok("#995: the run reaches a join over a record carrying a list of entries", cmp.status === 0);
    const introduced = readOrEmpty(join(wsBase, "entries", "pass-1", "join", "a3.introduces.md"));
    ok("#995: the introduces Packet carries the entry's own words",
      introduced.includes(INTRODUCED), introduced.slice(0, 400));
    ok("#995: and never the stringified object the entry used to render as",
      introduced !== "" && !introduced.includes("[object Object]"));
    ok("#995: and the entry is rendered as a list entry rather than run together",
      /^\s*[-*] .*the thing that renders the input/m.test(introduced), introduced.slice(0, 400));
    // The Step that introduces nothing still renders the stated absence, so the
    // case above is bound to the entry and not to the field being present.
    const nothingIntroduced = readOrEmpty(join(wsBase, "entries", "pass-1", "join", "a1.introduces.md"));
    ok("#995: while a Step introducing nothing renders the absence",
      /\(none\)/.test(nothingIntroduced) && !nothingIntroduced.includes("[object Object]"));
    // AND THE SIDE THIS DEFECT WOULD LAND ON NOW: every `per-declared` Packet
    // renders the reader's WHOLE outlined list on its reverse side, so each one
    // is a list of objects reaching a judge.
    const perDeclared = readOrEmpty(join(wsBase, "entries", "pass-1", "join", "a1.claims.0.md"));
    ok("#995: and the per-declared Packet's reverse side carries every outlined claim as its own words",
      OUTLINE.a1.claims.every((g) => perDeclared.includes(g))
      && !perDeclared.includes("[object Object]"), perDeclared.slice(0, 400));
  }

  // A TERM CARRYING A DIGIT STILL YIELDS A DIGIT-FREE COMPARISON LINE. This is
  // the case the first live drive earned: the live Draft's claims are labelled
  // by the Strands they came from, so quoting the offending material into the
  // reason put a number in front of a reader that was not a line number. The
  // line refuses to carry a quote; the evidence holds it in full.
  //
  // THE VEHICLE CHANGED TWICE AND THE RULE DID NOT (kogaki#1014, kogaki#1132).
  // This case rode `term-before-introduction`, then `claims-unused`, and both
  // rows left the table; the rule it binds — a comparison line quotes nothing,
  // and the evidence holds the quoted material whole — is unchanged, so the
  // case is retargeted rather than deleted. `claims` is where quoted material
  // lives now: a declared claim the reader did not recover is carried in the
  // row's evidence, and the fixture's claim names a Strand, which is exactly
  // the case that put a non-line-number digit in front of a reader on the first
  // live drive.
  {
    const pd = join(root, "packets-digit"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) {
      // a2 declares a second claim the reader will be judged not to have
      // recovered, and it carries a digit in its own text.
      writePacket(pd, id, id === "a2"
        ? { claims: [CLAIMS.a2[0], "claim: the pinned survey at strand L97 settles the boundary"] }
        : {});
    }
    const d = buildDraft(join(root, "theses", "digit"), { packetDir: pd });
    const r = driveToCompletedJoin(d, join(root, "ws-digit"), "digit",
      (o) => (o.step_id === "a2" && o.item === "claims" && o.pair === 1
        ? { verdict: "fails", reason: "no claim the reader wrote carries this declared claim" }
        : null));
    ok("a run whose Packet declares a claim carrying a digit still completes", r.second.status === 0);
    // EVERY comparison line, not one chosen line: the rule is a property of the
    // format, so asserting it over the whole run is what a chosen vehicle was
    // only ever standing in for.
    const L = linesOf(r.second.stdout);
    ok("no comparison line carries a digit outside its span, anywhere in the run",
      [...L.values()].every((ln) => !/\d/.test(ln.replace(/^\S+\s+/, "").replace(/\[\d+-\d+\]/, ""))));
    // AND THE EVIDENCE HOLDS THE QUOTED MATERIAL WHOLE, digit included — the
    // other half of the same rule, asserted wherever the run produced evidence.
    const withEvidence = JSON.parse(readFileSync(r.jsonPath, "utf8")).results
      .filter((x) => x.evidence !== undefined && x.evidence !== null);
    ok("and every finding that quotes material holds it in its evidence rather than in its line",
      withEvidence.length > 0 && withEvidence.every((x) => x.evidence !== ""));
    ok("and the declared claim carrying the digit is in that evidence, whole",
      withEvidence.some((x) => (x.evidence || [])
        .some((e) => /the pinned survey at strand L97 settles the boundary/.test(e))),
      JSON.stringify(withEvidence.map((x) => x.evidence)).slice(0, 300));
  }

  // `cannot-decide` IS A THIRD ANSWER AND IS NEVER ROUNDED. It is listed with
  // its pair, and it is not a fail — it sends no Step to correction.
  {
    const pd = join(root, "packets-undecided"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(pd, id);
    const d = buildDraft(join(root, "theses", "undecided"), { packetDir: pd });
    const wsb = join(root, "ws-undecided");
    const D = (...a) => selfRun(
      [self, ...a, "--draft", d.path, "--workspace", wsb]);
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("outline", "--step", id, "--file", writeRecordFor(d, id, "und"));
    D("compare");
    const jp = join(wsb, "undecided", "pass-1", "join.json");
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
    // THE EVIDENCE IS WHERE THE QUOTED MATERIAL LIVES, and this is the other
    // half of the comparison line's no-numbers rule: the line refuses to carry a
    // quote, so the record is where a finding becomes actionable rather than
    // merely located. A declared claim the reader could not be said to have
    // recovered is quoted material, and `cannot-decide` is not rounded on the
    // way there (kogaki#1132).
    ok("and the quoted material the comparison line refused to carry",
      /^ {2}- evidence: \S/m.test(rev), rev.split("\n").filter((l) => /evidence/.test(l)).join(" | "));
  }

  // A BEST-EFFORT FAIL RIDES ALONG: it reaches the owner record with its class
  // and its EVIDENCE, and it does NOT withhold `close`. A guard counting every
  // fail would send a Step to pass two for a finding the design says to carry
  // rather than to act on — and on the first live drive a best-effort item fired
  // on every Step, so `close` would have been unreachable for that Draft.
  {
    const pd = join(root, "packets-riding"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(pd, id);
    // THE VEHICLE CHANGED TWICE AND THE RULE DID NOT (kogaki#1014,
    // kogaki#1132). This case rode `restates-earlier-step`, then
    // `claims-unused`, and both rows left the table. NO mechanical row answers
    // on a prose Step any more, so the best-effort fail is now the judge's:
    // `purpose` is the surviving best-effort row on the passage side, and the
    // override says the judge failed it. What the case measures is unchanged —
    // a best-effort fail reaches the owner record with its class and does not
    // withhold `close`.
    const d = buildDraft(join(root, "theses", "riding"), { packetDir: pd });
    const wsb = join(root, "ws-riding");
    const r = driveToCompletedJoin(d, wsb, "riding",
      (o) => (o.step_id === "a2" && o.item === "purpose"
        ? { verdict: "fails", reason: "the passage is doing a different job from the declared one" }
        : null));
    ok("the run completes", r.second.status === 0);
    const L = linesOf(r.second.stdout);
    ok("the best-effort item fails", /\sfails\s/.test(L.get("a2/purpose")));
    ok("and no Step is sent to correction, because no PRESERVED item failed",
      /no Step is sent to correction/.test(r.second.stdout));
    const D = (...a) => selfRun(
      [self, ...a, "--draft", d.path, "--workspace", wsb]);
    const c = D("close");
    ok("close is reachable with a best-effort fail outstanding", c.status === 0);
    const rev = readOrEmpty(join(root, "theses", "riding", "review.md"));
    ok("and the owner record carries the finding with its class",
      /a2 \/ purpose\*\* — fails \(best-effort\)/.test(rev));

    // A PRESERVED fail still withholds it, and the refusal says which kind.
    const short = join(root, "packets-riding-short"); mkdirSync(short, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(short, id, id === "a1" ? { claims: [CLAIMS.a1[0]] } : {});
    const d2 = buildDraft(join(root, "theses", "riding-short"), { packetDir: short });
    const wsb2 = join(root, "ws-riding-short");
    // The PRESERVED fail is the judge's, for the reason kogaki#996 gives at the
    // sibling case above: removing the claim no longer fails the item by itself.
    driveToCompletedJoin(d2, wsb2, "ridingshort",
      (o) => (o.step_id === "a1" && o.item === "claims" && o.pair === 0
        ? { verdict: "fails", reason: "no claim the reader wrote carries this declared claim" }
        : null));
    const c2 = selfRun(
      [self, "close", "--draft", d2.path, "--workspace", wsb2]);
    ok("while a PRESERVED fail still withholds the record, naming the class",
      c2.status === 1 && /failing PRESERVED item/.test(c2.stderr)
      && /A best-effort fail does not withhold the record/.test(c2.stderr));
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
    const D = (...a) => selfRun(
      [self, ...a, "--draft", d.path, "--workspace", wsb]);
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("outline", "--step", id, "--file", writeRecordFor(d, id, "gap"));
    const r = D("compare");
    ok("a Packet missing a block the comparison needs refuses BY NAME, naming the Step",
      r.status === 1 && /step a2: its Packet carries no `purpose` block/.test(r.stderr));
    ok("and names the item that compares against it", /purpose/.test(r.stderr));
    ok("and files it as a PACKET GAP against the template, not as a side read",
      /PACKET GAP/.test(r.stderr) && /src\/packet-template\.md/.test(r.stderr));
  }

  // THE TABLE DECIDES A VACUOUS ANSWER, NOT THE RUNTIME — and the vehicle
  // changed while the rule did not (kogaki#1014). This case used to ride
  // `exemplar-leak`: a Move record with no exemplar made the negative item
  // vacuous, and the table said so per item. That row left the table with the
  // Move itself, because the Move is not in the Reverse Outline at all —
  // supplying the candidates would make the outcome ride on supplied
  // information, and its effect is carried by the reader states, which are
  // compared. The rule's surviving carrier is `when_declared_absent`, which is
  // the same declaration under the name the table already gave it.
  {
    const ITEMS = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    ok("no row asks about the Move or its exemplar",
      !ITEMS.items.some((i) => /move/.test(i.id) || i.declared_block === "move_excerpt"
        || i.declared_block === "move_contract"));
    ok("while the vacuous-answer declaration survives, on the rows that own one",
      ITEMS.items.some((i) => i.when_declared_absent && i.when_declared_absent.verdict
        && i.when_declared_absent.sentence));
    const rec = JSON.parse(readFileSync(join(WS, "pass-1", "join.json"), "utf8"));
    ok("and no run asks a model about an item the table decided",
      rec.results.filter((x) => x.judged === false)
        .every((x) => !rec.model_calls.some((c) => c.step_id === x.step_id && c.item === x.item)));
  }

  // THE ITEM TABLE IS READ, NEVER RESTATED — the same arrangement the outlined
  // record's schema has. The item ids that DO occur in the runtime are the keys
  // of the mechanical implementations and of the Packet-block readers, which is
  // the binding the table's `mode` and `declared_block` fields name; every other
  // use iterates `items`.
  {
    const table = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    const code = readFileSync(self, "utf8");
    const prod = code.slice(0, code.indexOf("async function runSelfTest"));
    // THE PROPERTY IS RE-CUT RATHER THAN RELAXED (kogaki#1014). One row per
    // Brief Step field means three item ids — `claims`, `introduces`,
    // `purpose` — are now spelled exactly like the Brief FIELDS they read, and
    // the runtime declares those fields because it renders them to the Blind
    // Reader. So the string occurring proves nothing about those three, and the
    // case says so instead of passing on a coincidence: every id that is NOT a
    // declared field name must still be absent, and the three that are get
    // their own assertion below.
    const fieldNames = new Set([...RECONSTRUCTIBLE_FIELDS, ...NOT_RECONSTRUCTIBLE_FIELDS]
      .map((f) => f.name));
    const judged = table.items.filter((i) => i.mode !== "mechanical").map((i) => i.id);
    const judgedNotFields = judged.filter((id) => !fieldNames.has(id));
    ok("no JUDGED item's id occurs in the runtime — the table is the only carrier",
      judgedNotFields.length > 0 && !judgedNotFields.some((id) => prod.includes(`"${id}"`)),
      judgedNotFields.filter((id) => prod.includes(`"${id}"`)).join(", "));
    // AND THE THREE THAT SHARE A FIELD'S SPELLING ARE NEVER COMPARED AGAINST AS
    // ITEMS. A `item === "claims"` anywhere in the runtime would be the table
    // bypass this case exists to catch, wearing a field name as cover.
    const asItem = judged.filter((id) => fieldNames.has(id))
      .filter((id) => new RegExp(`item(?:\\.id)?\\s*===\\s*"${id}"`).test(prod)
        || new RegExp(`\\bit\\.id\\s*===\\s*"${id}"`).test(prod));
    ok("and an id spelled like a Brief field is never compared against as an item id",
      asItem.length === 0, asItem.join(", "));
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
    // READ FROM THE TABLE'S OWN KEYS rather than from one named threshold
    // (kogaki#1132 removed `outlined_claim_containment` with the matcher that
    // read it, and a case naming a key is a case that stops asserting when the
    // key goes).
    {
      const nums = Object.entries(table.thresholds).filter(([k]) => k !== "note")
        .map(([, v]) => String(v));
      // The span is a COORDINATE and is stripped before the comparison: an
      // integer threshold would otherwise read as a hit on every line number
      // that happened to contain it.
      const leaked = [...baseLines.values()].map((l) => l.replace(/\[\d+-\d+\]/, ""))
        .filter((l) => nums.some((n) => l.includes(n)));
      ok("and every threshold is an INPUT: no emitted line renders one",
        nums.length > 0 && leaked.length === 0, leaked.join(" | "));
    }
  }

  // AN ABSENT JOIN TEMPLATE IS A HOLE THE MODEL FILLS BY INVENTION, so the
  // Harness refuses rather than asking a question with no form. Driven against a
  // copy of the module with the template removed from beside it.
  {
    const soloCli = soloWithout("solo-join", "join-template.md");
    const d = buildDraft(join(root, "theses", "nojointpl"), { packetDir });
    const wsb = join(root, "ws-nojointpl");
    const D = (...a) => selfRun(
      [soloCli, ...a, "--draft", d.path, "--workspace", wsb]);
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("outline", "--step", id, "--file", writeRecordFor(d, id, "njt"));
    const r = D("compare");
    ok("an absent join template refuses rather than asking a question with no form",
      r.status === 1 && /join template is absent/.test(r.stderr));
  }

  // AND AN ABSENT ITEM TABLE REFUSES, for the reason the table exists: the
  // comparison would otherwise join against a table it invented.
  //
  // IT REFUSED AT `open` FROM kogaki#873 TO kogaki#1133, AND IS BACK AT
  // `compare`. `open` rendered the cold reader's input, whose entry form was the
  // table's `sections.ledger_fields`, so the table was load-bearing one act
  // earlier than it had been; with that reader gone, `open` reads no table and
  // asserting there would assert against a run that opened cleanly. The act that
  // needs the table is the join, and that is where the refusal is asserted.
  {
    const soloCli = soloWithout("solo-items", "review-items.json");
    const d = buildDraft(join(root, "theses", "noitems"), { packetDir });
    const wsb = join(root, "ws-noitems");
    const D = (...a) => selfRun(
      [soloCli, ...a, "--draft", d.path, "--workspace", wsb]);
    ok("#1133: `open` no longer reads the item table, so a run without one opens",
      D("open").status === 0);
    for (const id of ["a1", "a2", "a3"]) D("outline", "--step", id, "--file", writeRecordFor(d, id, "noitems"));
    const r = D("compare");
    ok("an absent item table refuses rather than joining against a table it invented",
      r.status === 1 && /item table is absent/.test(r.stderr));
  }

  // ONE DECLARATION OF THE FIELD LIST, AND ONE PARSER FOR THE BLOCK (kogaki#1014).
  // The property the deleted `src/outlined-schema.json` used to carry — the runtime holds
  // no second copy of the record's field list — survives its carrier's deletion,
  // re-cut onto what replaced it. There is no second schema to disagree with,
  // so the case asserts the two things that would REINTRODUCE one: a second
  // spelling of the field list, and a second reader for the block.
  {
    const code = readFileSync(self, "utf8");
    const prod = code.slice(0, code.indexOf("async function runSelfTest"));
    ok("the Blind Reader's field list is declared exactly once",
      (prod.match(/^export const RECONSTRUCTIBLE_FIELDS = \[/gm) || []).length === 1
      && (prod.match(/^export const NOT_RECONSTRUCTIBLE_FIELDS = \[/gm) || []).length === 1);
    // THE COUNT THE READER IS TOLD IS COMPUTED, never spelled — a field joining
    // the declaration cannot leave the instruction saying the old number.
    ok("and the count in the reader's instruction is computed from that declaration",
      /RECONSTRUCTIBLE_FIELDS\.length/.test(prod)
      && /numberWord\(reverseOutlineFieldCount\(\)\)/.test(prod));
    // THE BLOCK IS PARSED BY THE BRIEF'S OWN FUNCTION. A `parseStepBlock`
    // DEFINED here rather than imported is the second parser this act removed,
    // and it would read exactly like the first until one of them was edited.
    ok("and the step block is read by the Brief parser rather than by a second one here",
      /import \{ parseStepBlock, stepField \} from "\.\/draft\.mjs";/.test(prod)
      && !/function parseStepBlock\b/.test(prod));
  }

  // 24 — usage with no command, and an unknown command.
  {
    const u = spawnSync(process.execPath, [self], { encoding: "utf8" });
    ok("bare invocation prints usage and exits 0", u.status === 0 && /review-draft —/.test(u.stdout));
    ok("usage names every entry point the design declares",
      ["open", "outline", "compare", "correct", "check", "close"].every((c) => u.stdout.includes(`review-draft.mjs ${c}`))
      && !/review-draft\.mjs read/.test(u.stdout));
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


  // ==========================================================================
  // kogaki#874 — THE CORRECTION PATH, DRIVEN END TO END OVER A REAL DRAFT.
  //
  // WHY THIS BLOCK BUILDS ITS OWN DRAFT THROUGH `src/draft.mjs` INSTEAD OF
  // `buildDraft` ABOVE. Every case up to here reviews a hand-assembled Draft,
  // which is right for them: they assert what THIS Harness does with a trace, a
  // Packet and a record, and hand-assembly is what lets a case construct a
  // malformed one. `correct` is different in kind — it RE-ENTERS the
  // realization lane, so the property under test is that a corrected Step is
  // realized from a Packet the renderer produced against the article as it now
  // stands. A hand-written stand-in for that Packet would be this pass checking
  // that it can read its own guess, and the "article so far" block — the whole
  // continuity mechanism the owner's 2026-09-04 concern is about — is exactly
  // the part a stand-in would have to invent.
  //
  // It stays seam-free: a Brief, a Move store and a workspace under the same
  // temp root, no network, no gateway, and no read of this repository's own
  // `theses/` or `runs/`.
  {
    const draftCli = join(dirname(self), "draft.mjs");
    const cRoot = join(root, "correction");
    const cBrief = join(cRoot, "theses", "correction-fixture");
    const cMoves = join(cRoot, "moves");
    const cWs = join(cRoot, "ws-draft");
    mkdirSync(cBrief, { recursive: true });
    mkdirSync(cMoves, { recursive: true });
    for (const id of ["open_the_claim", "carry_the_claim"]) {
      writeFileSync(join(cMoves, `${id}.md`), [
        `id: ${id}`, "status: observed",
        "intent: >-", `  what ${id} does to the reader.`,
        "requires: >-", "  the state this move depends on.",
        "effect: >-", "  the state this move produces.",
        "constraints: >-", "  what a correct performance must not do.",
        "failure_modes: >-", "  how it goes wrong when imitated badly.",
        "excerpt: >-", "  the author's account of the movement they observed.",
      ].join("\n") + "\n");
    }
    // FOUR STEPS AND TWO SECTIONS, so that correcting s2 and s3 leaves s4 as a
    // successor that is NOT itself corrected. That is what makes the successor
    // arm of the bound assertable on its own: a successor that had also been
    // corrected would be in the bound twice and the case could not tell which
    // arm put it there.
    //
    // AND s1 INTRODUCES A TERM (kogaki#1098), so the Steps after it arrive
    // KNOWING one. `already-knows` is the successor arm's one item and this
    // drive's best-effort vehicle, and it now declares a `when_declared_absent`
    // arm: a Brief introducing nothing leaves every Step's `already knows` list
    // empty, the Harness decides all four rows with no model call, and both
    // properties would go on reporting green over a pass that had stopped
    // asking. The term is declared once, on the Step no correction touches.
    const STEPS = [
      { id: "s1", move: "open_the_claim", opens: "The first heading",
        introduces: "tide table — a record of measurements somebody took on days somebody chose" },
      { id: "s2", move: "carry_the_claim", opens: null },
      { id: "s3", move: "open_the_claim", opens: "The second heading" },
      { id: "s4", move: "carry_the_claim", opens: null },
    ];
    const briefText = [
      "# Brief — correction-fixture", "",
      "*Survey pin:* `product-lab@0000000000000000000000000000000000000000`", "",
      "## Strands", "",
      "### L1 — first-strand", "",
      "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
      "## Thesis", "", "The fixture claim.", "",
      "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
      "## Reader target", "", "The reader can say why the fixture claim is not obvious.", "",
      "## Opening question", "", "What makes the fixture claim worth stating?", "",
      "## Sequence", "",
      ...STEPS.flatMap((s) => ["```step", `step_id: ${s.id}`, `move: ${s.move}`,
        ...(s.opens ? [`opens_section: ${s.opens}`] : []),
        ...(s.introduces ? [`introduces: ${s.introduces}`] : []),
        `purpose: the job ${s.id} does.`,
        `reader_state_before: the reader arrives at ${s.id} holding what came before.`,
        `reader_state_after: the reader leaves ${s.id} able to say what it settled.`,
        "materials: L1",
        `rationale: ${s.id} sits here because the path put it here.`,
        `claim (strand L1): the material supports what ${s.id} asserts.`, "```", ""]),
    ].join("\n");
    writeFileSync(join(cBrief, "brief.md"), briefText);

    const dl = (cmd, ...extra) => spawnSync(process.execPath,
      [draftCli, cmd, "--brief", join(cBrief, "brief.md"), "--workspace", cWs, "--moves-dir", cMoves, ...extra],
      { encoding: "utf8" });

    // The realized prose. Deliberately unlike the Packet's own wording: the
    // Round Trip judges the prose against what the Packet licenses, and prose
    // that merely echoed the Packet's own wording would make every case below
    // assert against the fixture's phrasing rather than against the correction
    // path it names.
    const REAL = {
      s1: "Two harbours keep different hours and a boat leaving one arrives at the other on a tide nobody planned.",
      s2: "The harbourmaster writes the hours down each spring, and the writing is what makes them argue rather than what settles them.",
      s3: "A tide table is not a promise about water; it is a record of what somebody measured, on days somebody chose.",
      s4: "So a skipper reading it is reading a measurement, and the question worth asking is who was standing there and when.",
    };
    const proseFile = (id, text) => {
      const f = join(cRoot, `prose-${id}.md`);
      writeFileSync(f, text + "\n");
      return f;
    };

    const r0 = dl("resolve");
    let built = r0.status === 0;
    for (const s of STEPS) {
      const r = dl("section", "--step", s.id, "--file", proseFile(s.id, REAL[s.id]));
      if (r.status !== 0) built = false;
    }
    const rEmit = dl("emit");
    built = built && rEmit.status === 0;
    const cDraft = join(cBrief, "draft.md");
    ok("the realization lane produces a real Draft for the correction drive to review",
      built && existsSync(cDraft));

    // --- the review, up to a completed join with two preserved fails --------
    const cwsBase = join(cRoot, "ws-review");
    const cWsRun = join(cwsBase, "correction-fixture");
    const RD = (...a) => selfRun(
      [self, ...a, "--draft", cDraft, "--workspace", cwsBase,
        "--draft-workspace", cWs, "--moves-dir", cMoves]);

    // A REVERSE OUTLINE IN THE BRIEF'S OWN STEP FORM. It needs no line
    // arithmetic at all now: a Brief Step field carries no draft coordinate, so
    // the drifting-range defect this fixture used to guard against has no site
    // left to occur at.
    const recFor = (id, tag) => {
      const f = join(cRoot, `rec-${tag}-${id}.md`);
      writeFileSync(f, [
        "```step",
        `step_id: ${id}`,
        `purpose: the job ${id} does`,
        `reader_state_before: the reader arrives at ${id} holding what came before`,
        `reader_state_after: the reader leaves ${id} able to say what it settled`,
        `claim the material supports what ${id} asserts, as the passage has it`,
        "```",
      ].join("\n") + "\n");
      return f;
    };
    // Answer every owed pair, failing exactly the pairs named. A `fails` on a
    // PRESERVED item is what sends a Step to correction, so this is where the
    // drive decides which Steps the correction path will be exercised on.
    const answer = (recordPath, tag, failKeys) => {
      // BOTH BRANCHES OF THE RECORD, for the reason `answerOwed` gives above:
      // answering only the Step half leaves every Section pair owed and the
      // join never completes, so every case below would assert against an
      // unfilled join rather than against the correction path it names.
      const rec0 = existsSync(recordPath) ? JSON.parse(readFileSync(recordPath, "utf8")) : {};
      const owed = rec0.owed || [];
      const f = join(cRoot, `verdicts-${tag}.json`);
      writeFileSync(f, JSON.stringify({
        verdicts: owed.map((o) => {
          const failing = failKeys.includes(`${o.step_id}/${o.item}`);
          return {
            step_id: o.step_id, item: o.item,
            ...(o.pair === null ? {} : { pair: o.pair }),
            verdict: failing ? "fails" : "holds",
            reason: failing
              ? "the outlined reader would not be the declared one"
              : "the declared line and the outlined one agree",
            model: JUDGE_MODEL,
          };
        }),
      }, null, 2) + "\n");
      return f;
    };

    RD("open");
    for (const s of STEPS) RD("outline", "--step", s.id, "--file", recFor(s.id, "p1"));
    RD("compare");
    const joinPath = join(cWsRun, "pass-1", "join.json");
    // A PRESERVED FAIL AND A BEST-EFFORT ONE, deliberately (kogaki#1097). The two
    // classes are the whole reason the comparison files exist: a preserved fail
    // sends its Step to correction and a best-effort fail rides along, and the
    // verdicts file a reviewer hands in says neither. `purpose` is best-effort
    // and judged, so failing it exercises the consequence word that was
    // unreadable without changing which Steps this drive corrects — the
    // correction targets are the preserved fails and they are unmoved.
    const FAILS = ["s2/reader-state-after", "s3/reader-state-after", "s1/purpose"];
    const p1 = RD("compare", "--verdicts", answer(joinPath, "p1", FAILS));
    ok("pass one completes and sends the two preserved-failing Steps to correction",
      p1.status === 0 && /Steps sent to correction[^\n]*s2, s3/.test(p1.stdout));

    // --- kogaki#1134 AC1: THE COMPARISON FILES ARE GONE, pass one ----------
    // ASSERTED OVER A PRODUCED RUN DIRECTORY rather than over the source: this
    // drive is the one that reaches every corner of the layout, and the whole
    // claim is that nothing under it is named `comparison`. A grep of the
    // Harness would prove only that this file stopped saying the word.
    //
    // THE ABSENCE IS READ AT EVERY DEPTH, because `comparison/` was a DIRECTORY
    // and a top-level read of `pass-1/` would pass on a stray file one level
    // down — the same descent kogaki#1100's own layout guard had to learn.
    {
      const under = (d) => (existsSync(d) ? readdirSync(d, { withFileTypes: true })
        .flatMap((e) => [join(d, e.name)].concat(e.isDirectory() ? under(join(d, e.name)) : [])) : []);
      const named = under(cWsRun).filter((e) => /comparison/.test(basename(e)));
      ok("#1134 AC1: `compare` writes no `comparison/` anywhere in the run directory",
        named.length === 0, named.join(", "));
      ok("#1134 AC1: and its own output names no comparison file for a reader to open",
        !/comparison — one file per Step/.test(p1.stdout) && !/comparison\//.test(p1.stdout),
        p1.stdout.split("\n").filter((l) => /comparison/.test(l)).join(" | ") || "(none)");
      // DISCRIMINATION: the record the comparison files rendered IS there, and
      // carries the two fields their lines added — the class, from which the
      // consequence follows, and the model that answered where one was asked.
      // An absence beside a missing record would be a broken run passing.
      const rec1 = JSON.parse(readOrEmpty(joinPath) || "{}");
      const rsa = (rec1.results || []).find((r) => r.step_id === "s2" && r.item === "reader-state-after");
      ok("#1134 AC1 DISCRIMINATION: the join record still carries the whole of what a line said",
        !!rsa && rsa.class === "preserved" && rsa.verdict === "fails"
        && rsa.model === JUDGE_MODEL && Array.isArray(rsa.span)
        && rsa.reason === "the outlined reader would not be the declared one",
        JSON.stringify(rsa || null));

      // --- kogaki#1134 AC2: `judged`, AND NO `decided_by` ANYWHERE ----------
      // OVER EVERY ROW AND EVERY PAIR, not one built row: the rename is a
      // property of the record, and a case that read one row would pass on a
      // pass that renamed the key it happened to look at.
      const rows1 = rec1.results || [];
      const pairs1 = rows1.flatMap((r) => r.pairs || []);
      ok("#1134 AC2: every row carries `judged` as a boolean",
        rows1.length > 0 && rows1.every((r) => typeof r.judged === "boolean"),
        `${rows1.filter((r) => typeof r.judged !== "boolean").length} without it, of ${rows1.length}`);
      ok("#1134 AC2: and every entry of `pairs` carries it too",
        pairs1.length > 0 && pairs1.every((x) => typeof x.judged === "boolean"),
        `${pairs1.filter((x) => typeof x.judged !== "boolean").length} without it, of ${pairs1.length}`);
      ok("#1134 AC2: and NOTHING in the record carries `decided_by`",
        !/"decided_by"/.test(readOrEmpty(joinPath)));
      // THE TWO KEYS THE RENAME SEPARATES, still separated: `judged` says a
      // Judge was asked and `model` says which, so a row that was not judged
      // names no model at all.
      ok("#1134 AC2: a row with `judged: false` carries no `model` key",
        rows1.filter((r) => r.judged === false).length > 0
        && rows1.filter((r) => r.judged === false).every((r) => !("model" in r)),
        rows1.filter((r) => r.judged === false && "model" in r).map((r) => `${r.step_id}/${r.item}`).join(", "));
      ok("#1134 AC2: while a judged row names the model that answered it",
        rows1.filter((r) => r.judged === true).length > 0
        && rows1.filter((r) => r.judged === true).every((r) => "model" in r));
      ok("#1134 AC2: and the same holds per pair — no unjudged pair names a model",
        pairs1.filter((x) => x.judged === false).every((x) => x.model == null));
    }

    // --- FINDING 1 (PR #906 round 1): `check` with NOTHING corrected --------
    // Declining to correct is a legitimate route — `close` is reachable from
    // `check` in every state — and the defect was the CLAIM the route produced:
    // a pass-one fail reaching the owner record as "still failing after pass
    // two", on a pair pass two never re-judged, as the basis for classifying it
    // `packet` or `reviewdraft`. Driven BEFORE any correction, which is the
    // only point in this run where the state exists.
    {
      const r = RD("check");
      // THE HEADLINE'S CLAIM CHANGED AT PR #946 round 1 AND THIS CASE'S DOES
      // NOT: it asserts the Steps are NAMED, which is PR #906 round 1's finding
      // and is untouched. What moved is the sentence around them — it read "and
      // no correction was made", which the per-seat line made false for a Step
      // that received one seat and still owes the other.
      ok("check with nothing corrected NAMES the Steps pass one sent to correction",
        r.status === 0 && /UNCORRECTED — pass one sent these to correction and they are still owed: s2, s3/.test(r.stdout));
      ok("and says their fails are carried rather than re-judged",
        /not re-judged by this pass/.test(r.stdout));
      const rc = RD("close");
      const rv = readOrEmpty(join(cBrief, "review.md"));
      const res = rv.slice(rv.indexOf("## Residue"));
      ok("the owner record does not claim a carried fail survived pass two",
        rc.status === 0 && !/still failing after pass two/.test(res));
      ok("and says per line that the Step was not corrected, so nothing re-read it",
        /NOT re-judged: this Step was not corrected/.test(res));
      ok("while the residue line still carries its EMPTY classified: field",
        (res.match(/^ {2}classified:$/gm) || []).length === 2
        && !/^ {2}classified:[^\n]*\S/m.test(res));
    }

    // --- ORDER: a later Step refuses while an earlier one is owed -----------
    {
      const r = RD("correct", "--step", "s3");
      ok("correct refuses a Step out of path order, naming what is owed first",
        r.status === 1 && /not next/.test(r.stderr) && /s2/.test(r.stderr));
      ok("and says why the order matters — a Step realized against prose about to move",
        /about to move under it/.test(r.stderr));
    }

    // THE ARTICLE AS THIS RUN FOUND IT, read before any correction moves it.
    // The kogaki#994 cases below assert `close` puts it back byte for byte, and
    // a comparison against the run's own snapshot would only prove the restore
    // matched the file it copied.
    const cArticleAsReviewed = readFileSync(cDraft, "utf8");

    // --- ACCEPTANCE 1: the correction input is a FRESH Packet + a Correction
    //     block. The "article so far" holds s1 as it stands in the Draft at
    //     this moment; the Correction block holds s2's previous prose and the
    //     pair that failed.
    const rA = RD("correct", "--step", "s2");
    const inputPath = join(cWsRun, "pass-1", "corrections", "s2.md");
    ok("correct renders a correction input for the Step pass one sent it",
      rA.status === 0 && existsSync(inputPath));
    const inA = readOrEmpty(inputPath);
    ok("AC1: the input's article-so-far carries the preceding Step's prose as the Draft has it",
      inA.includes("## The article so far") && inA.includes(REAL.s1));
    ok("AC1: and one Correction block carrying the Step's PREVIOUS realization verbatim",
      inA.includes("## The Correction") && inA.includes(`> ${REAL.s2}`));
    ok("AC1: and the failed item with its pair and quoted span",
      /### What failed/.test(inA) && inA.includes("reader-state-after")
      && /span: lines \d+–\d+/.test(inA));
    ok("AC1: and the items that HELD, as what the correction must not break",
      /### What held, and must go on holding/.test(inA));
    ok("AC1: and the instruction to change what the findings name and nothing else",
      /Change what the findings above name and nothing else/.test(inA)
      && /Do not restate the/.test(inA) && /Packet's wording/.test(inA));
    // The blindness of the Reverse Outline input is not the blindness of the CORRECTION: a
    // corrected Step is realized from its Packet by design, which is the whole
    // of what "a freshly rendered Packet" means. Asserted so the two are not
    // read as one property — this input SHOULD carry Packet material.
    ok("the correction input carries the Packet's own blocks, which the Reverse Outline input never does",
      /## What this Step must do/.test(inA) || /## Write/.test(inA));

    // --- record s2's correction ---------------------------------------------
    // THE FIRST CORRECTION IS TWO LINES WHERE THE PREVIOUS REALIZATION WAS ONE
    // (PR #906 round 1, finding 2). The Draft's line count has to MOVE for a
    // stale carried span to be observable at all; a same-length correction
    // leaves every later Step at the numbers it already had, and the case would
    // pass against a defect that was simply not expressed.
    const CORRECTED = {
      s2: "The harbourmaster writes the hours down each spring, and a skipper who trusts the writing has trusted a person.\n\nThat is a different kind of trust from the one a table seems to offer, and the difference is the whole point.",
      s3: "A tide table records what somebody measured, on days somebody chose, and it promises nothing about the water tomorrow.",
    };
    const rB = RD("correct", "--step", "s2", "--file", proseFile("s2-corrected", CORRECTED.s2));
    ok("correct records the corrected Step through the realization lane", rB.status === 0);
    ok("and reports drift as a change share and a Packet overlap",
      /sentence\(s\) differ from the previous realization/.test(rB.stdout)
      && /repeat a run of the Packet's claim or state wording/.test(rB.stdout));
    ok("and says the drift is reported rather than gated",
      /reported, never gated/.test(rB.stdout));
    ok("the corrected prose is in the Draft and the previous realization is not",
      readOrEmpty(cDraft).includes(CORRECTED.s2) && !readOrEmpty(cDraft).includes(REAL.s2));
    ok("snapshots before and after the correction land in the review workspace",
      existsSync(join(cWsRun, "snapshots", "01-before-s2.md"))
      && existsSync(join(cWsRun, "snapshots", "01-after-s2.md")));
    ok("and the before-snapshot holds the prose the correction replaced",
      readOrEmpty(join(cWsRun, "snapshots", "01-before-s2.md")).includes(REAL.s2));

    // --- the rendered-input guard, the same one `outline` has. Placed HERE, after s2 is
    // recorded, because the ORDER refusal above runs first and would answer for
    // s3 while s2 was still owed — a case asserting the input guard against a
    // refusal about ordering would pass on the wrong refusal.
    {
      const stray = join(cRoot, "stray.md");
      writeFileSync(stray, "prose written against nothing\n");
      const r = RD("correct", "--step", "s3", "--file", stray);
      ok("correct refuses prose for a Step whose correction input it did not render",
        r.status === 1 && /no rendered correction input/.test(r.stderr));
    }

    // --- ACCEPTANCE 2: correcting s2 then s3 in one pass — s3's Packet
    //     carries the CORRECTED s2.
    const rC = RD("correct", "--step", "s3");
    const inputS3 = readOrEmpty(join(cWsRun, "pass-1", "corrections", "s3.md"));
    ok("AC2: the next correction's input renders against the article as it now stands",
      rC.status === 0 && inputS3.includes(CORRECTED.s2));
    ok("AC2: and does not carry the prose that correction replaced",
      !inputS3.includes(REAL.s2));
    const rD = RD("correct", "--step", "s3", "--file", proseFile("s3-corrected", CORRECTED.s3));
    ok("the second correction records", rD.status === 0);
    ok("and reports that every Step pass one sent to correction has been corrected",
      /every Step pass one sent to correction has been corrected/.test(rD.stdout));

    // --- pass two re-runs Reverse Outlining for the corrected Steps --------
    const rE = RD("check");
    ok("check re-runs Reverse Outlining for the corrected Steps and refuses until it comes back",
      rE.status === 1 && /re-runs Reverse Outlining/.test(rE.stderr)
      && /s2/.test(rE.stderr) && /s3/.test(rE.stderr));
    ok("and says why — the recorded reading is about text that is gone",
      /about text that is gone/.test(rE.stderr));
    ok("and it re-runs outline for the CORRECTED Steps only",
      !/\ss1\s{2}/.test(rE.stderr) && !/\ss4\s{2}/.test(rE.stderr));
    for (const id of ["s2", "s3"]) RD("outline", "--step", id, "--file", recFor(id, "p2"));

    // --- ACCEPTANCE 3: the bound. `check` judges ONLY the corrected Steps'
    //     own items, the successors' continuity item, and the mechanical
    //     items over the whole Draft.
    const rF = RD("check");
    const checkPath = join(cWsRun, "pass-2", "check.json");
    ok("check writes its own record beside pass one's rather than overwriting it",
      existsSync(checkPath) && existsSync(joinPath));
    const chk = JSON.parse(readOrEmpty(checkPath) || "{}");
    const items = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    const mech = new Set(items.items.filter((i) => i.mode === "mechanical").map((i) => i.id));
    const FIGURE_ITEM_IDS = new Set(items.items.filter((i) => i.figure_only).map((i) => i.id));
    const succItems = items.pass_two.successor_items;
    const p1rec = JSON.parse(readOrEmpty(joinPath) || "{}");
    const ownOf = (id) => {
      const rows = (p1rec.results || []).filter((r) => r.step_id === id);
      return new Set([...rows.filter((r) => r.verdict === "fails").map((r) => r.item),
        ...rows.filter((r) => r.verdict === "holds" && r.class === "preserved").map((r) => r.item)]);
    };
    const inBound = (stepId, item) => mech.has(item)
      || (["s2", "s3"].includes(stepId) && ownOf(stepId).has(item))
      || (["s3", "s4"].includes(stepId) && succItems.includes(item));
    // THE UNIT IS THE SET OF JUDGED ITEMS ACROSS ONE RUN, never a single pair.
    // "re-judges only the named set" is a property no one output can display —
    // it is about what the run did NOT do — so the assertion reads the run's own
    // log of model calls as a whole and compares it against the bound computed
    // from pass one's record and the item table.
    // consulted: product-lab@a3b1382c69acc3f57add6576e25ea113d3aa3f2c
    //   gloss/lessons/testing.md:267 (match-the-detectors-unit-to-the-propertys-unit)
    const calls = chk.model_calls || [];
    ok("AC3: every judged item in pass two is inside the bound",
      calls.length > 0 && calls.every((c) => inBound(c.step_id, c.item)));
    ok("AC3: and no judged item is outside it — the count matches the bound exactly",
      calls.filter((c) => !inBound(c.step_id, c.item)).length === 0);
    // The mechanical arm covers every Step, and `mech` is narrowed to the rows
    // this Draft actually runs: a figure row is mechanical and applies to no
    // Step here, so demanding it over every Step would assert coverage of a
    // figure the fixture does not have.
    const proseMech = [...mech].filter((m) => !FIGURE_ITEM_IDS.has(m));
    ok("AC3: every mechanical item is re-run over EVERY Step",
      STEPS.every((s) => proseMech.every((m) =>
        (chk.mechanical || []).some((x) => x.step_id === s.id && x.item === m))));
    ok("AC3: the untouched Step's judged items are CARRIED, not re-judged",
      !calls.some((c) => c.step_id === "s1" && !mech.has(c.item))
      && (chk.results || []).some((r) => r.step_id === "s1" && r.carried));
    ok("AC3: and the successor that was not itself corrected is re-checked on the continuity item only",
      succItems.every((i) => (chk.results || []).some((r) => r.step_id === "s4" && r.item === i && !r.carried))
      && (chk.results || []).filter((r) => r.step_id === "s4" && !r.carried)
        .every((r) => succItems.includes(r.item) || mech.has(r.item)));
    // A CASE MUST FAIL, NEVER THROW (the readOrEmpty rule above, applied to a
    // record rather than to a file): an absent `bound` is a failing case here,
    // and reading through it would take the whole pass down with a TypeError —
    // which reports no case count at all, the form the member reads as "the
    // pass did not run".
    const bnd = chk.bound || { corrected: [], successors: [], verdicts_cleared: 0 };
    // FINDING 2 (PR #906 round 1): a carried row's span is the Step's CURRENT
    // range, never pass one's. The correction above added a line, so every
    // later Step moved; a carried row keeping its old range would name the
    // neighbouring lines under a body sha that is no longer the one it was
    // computed against.
    {
      const now = JSON.parse(readOrEmpty(join(cWsRun, "run.json")) || "{}");
      const cur = new Map((now.steps || []).map((x) => [x.step_id, x.lines]));
      const carriedRows = (chk.results || []).filter((r) => r.carried);
      ok("FINDING 2: every carried row's span is the Step's CURRENT line range",
        carriedRows.length > 0 && carriedRows.every((r) =>
          JSON.stringify(r.span) === JSON.stringify(cur.get(r.step_id))));
      const moved = carriedRows.filter((r) =>
        JSON.stringify(r.pass_one_span) !== JSON.stringify(r.span));
      ok("and the correction actually moved a Step, so the case is expressed rather than vacuous",
        moved.length > 0);
      ok("and pass one's own range is kept beside it, labelled as pass one's",
        carriedRows.every((r) => Array.isArray(r.pass_one_span)));
    }

    ok("AC3: the bound itself is RECORDED, so a reader can check it rather than take it",
      Boolean(chk.bound) && bnd.corrected.join(",") === "s2,s3"
      && bnd.successors.includes("s4"));
    ok("pass one's own answers for the re-judged pairs are discarded before pass two builds",
      bnd.verdicts_cleared > 0);

    // Answer pass two's owed pairs and complete it.
    // PASS TWO ANSWERS THROUGH `check --verdicts`, NEVER `compare`'s. Asserted
    // as its own case because the wrong door is the plausible one: `compare`
    // accepts the file, and would rebuild the UNBOUNDED join against the
    // corrected Draft — overwriting the pass-one record this pass carries from.
    const p2 = RD("check", "--verdicts", answer(checkPath, "p2", []));
    ok("pass two's owed pairs are answered through check's own verdicts route", p2.status === 0);
    ok("and the pass-one record is not rebuilt by it",
      JSON.parse(readOrEmpty(joinPath) || "{}").compared_at === p1rec.compared_at);
    const rG = RD("check");
    ok("check completes and names what it re-judged and what it carried",
      rG.status === 0 && /carried unchanged from pass one/.test(rG.stdout));
    ok("and reports an empty residue where nothing preserved still fails",
      /no preserved item fails after pass two/.test(rG.stdout));

    // --- kogaki#1134 AC1: AND NONE UNDER PASS TWO EITHER --------------------
    // The word pass two's files added was `carried from pass one`, and it is on
    // the row: `check.json` marks a carried row `carried: true`, which is where
    // the consequence line read it from in the first place.
    {
      const under = (d) => (existsSync(d) ? readdirSync(d, { withFileTypes: true })
        .flatMap((e) => [join(d, e.name)].concat(e.isDirectory() ? under(join(d, e.name)) : [])) : []);
      const named = under(cWsRun).filter((e) => /comparison/.test(basename(e)));
      ok("#1134 AC1: `check` writes no `comparison/` under pass two, and pass one's is still absent",
        named.length === 0, named.join(", "));
      ok("#1134 AC1: and `check` names no comparison file in its own output",
        !/comparison — one file per Step/.test(rG.stdout) && !/comparison\//.test(rG.stdout),
        rG.stdout.split("\n").filter((l) => /comparison/.test(l)).join(" | ") || "(none)");

      const chkRec = JSON.parse(readOrEmpty(checkPath) || "{}");
      const rowOf = (step, item) => (chkRec.results || [])
        .find((r) => r.step_id === step && r.item === item);
      // s1 was corrected by nothing and is no corrected Step's successor, so
      // every judged row on it is out of pass two's bound and carried.
      ok("#1134 AC1 DISCRIMINATION: a row pass two did not re-judge says so on the row itself",
        rowOf("s1", "reader-state-after")?.carried === true);
      ok("#1134 AC1 DISCRIMINATION: while a row inside the bound is not marked carried",
        rowOf("s2", "reader-state-after")
        && !rowOf("s2", "reader-state-after").carried);

      // --- kogaki#1134 AC2: THE SECOND PASS'S RECORD CARRIES THE SAME KEY ----
      // Including the rows it CARRIED: a carried row is copied forward whole,
      // so a rename that touched only the writing path would leave pass two's
      // record half in the old vocabulary.
      const rows2 = chkRec.results || [];
      ok("#1134 AC2: every row of check.json carries `judged` as a boolean",
        rows2.length > 0 && rows2.every((r) => typeof r.judged === "boolean"),
        `${rows2.filter((r) => typeof r.judged !== "boolean").length} without it, of ${rows2.length}`);
      ok("#1134 AC2: including the carried rows, which are copied forward whole",
        rows2.filter((r) => r.carried).length > 0
        && rows2.filter((r) => r.carried).every((r) => typeof r.judged === "boolean"));
      ok("#1134 AC2: and every entry of `pairs` under check.json carries it",
        rows2.flatMap((r) => r.pairs || []).every((x) => typeof x.judged === "boolean"));
      ok("#1134 AC2: and nothing in check.json carries `decided_by`",
        !/"decided_by"/.test(readOrEmpty(checkPath)));

      // --- PR #1102 round 1, finding 2: ONE READ OF WHO ANSWERED THE LINE ----
      // A row's `judged` is a fact about ALL its pairs — any one judged makes it
      // true — while its `model`, verdict, reason and span are the CHOSEN pair's.
      // The two come apart on a hybrid row, and the defect the finding named was
      // a row claiming a judge for a line the Harness in fact decided. WHAT THIS
      // WITNESSES IS THE INVARIANT, NOT THE DEFECT: the shipped table declares no
      // hybrid item since kogaki#1132, so no row here can construct the
      // disagreement, and the case holds over the rows this drive does produce.
      // It fires the moment such an item is admitted.
      //
      // Carried over from the comparison-file line it used to be read off
      // (kogaki#1134): the files are gone and the record is where the pair of
      // facts now sits side by side.
      const allRows = [...rows2, ...(JSON.parse(readOrEmpty(joinPath) || "{}").results || [])];
      const claimsAJudgeItNeverHad = allRows.filter((r) =>
        r.model != null && !(r.pairs || []).some((x) => x.pair === (r.pair ?? null) && x.judged));
      ok("#1102: no row names a model for a line no model answered",
        allRows.length > 0 && claimsAJudgeItNeverHad.length === 0,
        claimsAJudgeItNeverHad.map((r) => `${r.step_id}/${r.item}`).join(", "));
    }

    // RESIDUE: a PRESERVED item still failing after pass two, and only a
    // preserved one. Driven by re-answering one pair — verdicts are revisable
    // by design (PR #895 round 1, finding 5) — rather than by a second whole
    // drive, so the residue is computed by the same `check` over the same run
    // the cases above just watched complete.
    {
      // A REVISION IS ANSWERED AGAINST THE PAIRS PASS TWO ACTUALLY PUT, which
      // is its `model_calls` log. `owed` is empty once the pass completes, so a
      // revision built from it would revise nothing and the case would pass on
      // an empty file.
      const revise = (tag, failKeys) => {
        const rec = JSON.parse(readOrEmpty(checkPath) || "{}");
        const f = join(cRoot, `verdicts-${tag}.json`);
        writeFileSync(f, JSON.stringify({
          verdicts: (rec.model_calls || []).map((c) => {
            const failing = failKeys.includes(`${c.step_id}/${c.item}`);
            return {
              step_id: c.step_id, item: c.item,
              ...(c.pair === null ? {} : { pair: c.pair }),
              verdict: failing ? "fails" : "holds",
              reason: failing
                ? "the outlined reader would not be the declared one"
                : "the declared line and the outlined one agree",
              model: JUDGE_MODEL,
            };
          }),
        }, null, 2) + "\n");
        return f;
      };
      const back = RD("check", "--verdicts",
        revise("p2-fail", ["s2/reader-state-after", "s4/already-knows"]));
      ok("a revised answer re-opens the same bounded pass", back.status === 0);
      const chk2 = JSON.parse(readOrEmpty(checkPath) || "{}");
      const failed = (chk2.results || []).filter((r) => r.verdict === "fails" && !r.carried);
      ok("a preserved item still failing after pass two becomes residue",
        /residue — preserved item\(s\) reaching the owner/.test(back.stdout)
        && /s2\/reader-state-after/.test(back.stdout)
        && !/UNCORRECTED/.test(back.stdout));
      // The best-effort fail is in the SAME answer file and must NOT be
      // residue: the class is the consequence here exactly as it is at `close`,
      // and a residue list counting every fail would hand the owner a question
      // the design already answered.
      //
      // ITS VEHICLE IS WHY THE FIXTURE'S BRIEF INTRODUCES A TERM (kogaki#1098).
      // The row is `already-knows`, which is also the successor arm's one item,
      // and that row now declares a `when_declared_absent` arm. The Brief used
      // to declare no `introduces:` at all, so every Step's `already knows`
      // list was empty and the Harness would decide all four rows with no model
      // call — taking this case's vehicle AND the successor arm's only judged
      // pair with it, silently, while both cases went on reporting green
      // against a pass that had stopped asking. s1 introduces one term instead,
      // so s2 through s4 arrive knowing it and the pair is judged.
      ok("and a BEST-EFFORT item failing in the same pass does not",
        failed.some((r) => r.item === "already-knows")
        && !/s4\/already-knows/.test(back.stdout.slice(back.stdout.indexOf("residue —"))));
      const rClose = RD("close");
      const revR = readOrEmpty(join(cBrief, "review.md"));
      const residue = revR.slice(revR.indexOf("## Residue"));
      ok("close hands the residue to the owner with an empty classified: field",
        rClose.status === 0
        && (residue.match(/^ {2}classified:$/gm) || []).length === 1
        && !/^ {2}classified:[^\n]*\S/m.test(residue));
      ok("and the residue line says the item survived pass two",
        /still failing after pass two/.test(residue));
      // EVERY POINTER THE RECORD RENDERS RESOLVES (PR #1004 round 2, finding 5).
      // The legend above asserts the template text; this asserts the paths
      // composed for the run's actual findings and residue — which used to
      // name `<step>.<item>.md` for a paired item whose inputs are
      // `<step>.<item>.<n>.md`, a Packet for a Harness-decided row that never
      // had one, and `pass-2/` for a row pass two never read.
      {
        const pointers = [...revR.matchAll(/^ {2}- (?:Reverse Outline|the pair the judge saw): `([^`]+)`/gm)]
          .map((m) => m[1]);
        const none = (revR.match(/^ {2}- the pair the judge saw: none — /gm) || []).length;
        ok("#1004/5: the record composes pointers for its findings and residue",
          pointers.length > 0, `pointers: ${pointers.length}`);
        const dead = pointers.filter((f) => !existsSync(resolve(process.cwd(), f)));
        ok("#1004/5: and every pointer names a file this run wrote",
          dead.length === 0, dead.join(", "));
        // A ROW THE HARNESS DECIDED SAYS SO, AND POINTS AT THE RECORD THAT
        // DECIDED IT rather than at a Packet nothing rendered. This run's
        // findings include mechanically-decided rows, so the arm is expressed.
        const rr = JSON.parse(readFileSync(join(cWsRun, "run.json"), "utf8"));
        // COUNTED OVER BOTH SECTIONS THE LINE IS RENDERED IN (PR #1007 round 1,
        // finding 1): a preserved fail is a finding AND a residue row, so its
        // none-line renders twice, and a count over `findings` alone would
        // fail the equality on correct output.
        const harnessRows = (rr.findings || []).filter((f) => !chosenJudged(f)).length
          + (rr.residue || []).filter((r) => !chosenJudged(r)).length;
        // This fixture's findings are all judged, so the equality is the
        // whole of what it can express here; the arm with a Harness-decided
        // row is asserted nowhere at this head, and the reason is recorded at
        // the #1132 fixture below: no row in the shipped table can produce a
        // Harness-decided FAIL on a prose Step.
        ok("#1004/5: a Harness-decided line renders no Packet pointer, and only such a line does",
          none === harnessRows
          && (harnessRows === 0 || /the pair the judge saw: none — [^\n]*(join|check)\.json/.test(revR)),
          `harness-decided rows: ${harnessRows}, none-lines: ${none}`);
        // A CARRIED RESIDUE LINE POINTS AT PASS ONE even though `check` ran.
        const carriedResidue = (rr.residue || []).filter((r) => r.carried);
        const residueText = revR.slice(revR.indexOf("## Residue"));
        ok("#1004/5: a carried residue line points at pass one, the only pass that read it",
          carriedResidue.every((r) => new RegExp(
            `\\*\\*${r.step_id} / ${r.item}\\*\\*[^]*?Reverse Outline: \`[^\`]*pass-1/outlined/${r.step_id}\\.json\``)
            .test(residueText)),
          `carried residue rows: ${carriedResidue.length}`);
      }
      // AND THE CLOSE IS UNDONE TOO (kogaki#994). `close` now ends a run: it
      // writes the reviewed Draft, restores `draft.md` to the article the run
      // read, and refuses a second close that would copy that original back
      // over the reviewed one. This block closes to INSPECT the record and then
      // carries on, so it puts the tree and the run record back exactly as the
      // close found them — the same undo the line below performs for the
      // verdicts, one artifact over.
      {
        const reviewedFile = join(cBrief, REVIEWED_BASENAME);
        if (existsSync(reviewedFile)) {
          writeFileSync(cDraft, readFileSync(reviewedFile, "utf8"));
          rmSync(reviewedFile, { force: true });
        }
        const rr = JSON.parse(readFileSync(join(cWsRun, "run.json"), "utf8"));
        delete rr.reviewed_at; delete rr.reviewed_draft; delete rr.restored_from;
        delete rr.closed_at;
        writeFileSync(join(cWsRun, "run.json"), JSON.stringify(rr, null, 2) + "\n");
      }
      // Put the run back where the rest of the block found it, so the record
      // the AC4 cases read is the completed two-pass one rather than this
      // deliberately-failed variant.
      RD("check", "--verdicts", revise("p2-restore", []));
    }

    // --- ACCEPTANCE 4: the owner record carries the drift, per corrected Step
    const rH = RD("close");
    const rev = readOrEmpty(join(cBrief, "review.md"));
    ok("close is reachable from check and writes the owner record", rH.status === 0 && rev.length > 0);
    ok("the record states that two passes ran", /\*\*Passes\.\*\* two \(compare, check\)/.test(rev));
    ok("AC4: the record carries a change share for every corrected Step",
      (rev.match(/^ {2}- change share: /gm) || []).length === 2);
    ok("AC4: and a Packet overlap for every corrected Step",
      (rev.match(/^ {2}- packet overlap: /gm) || []).length === 2);
    ok("AC4: and names each corrected Step with the pass it was corrected in",
      /- \*\*s2\*\* \(pass 1\)/.test(rev) && /- \*\*s3\*\* \(pass 1\)/.test(rev));

    // --- kogaki#1134 AC1: THE OWNER RECORD'S LAYOUT LEGEND NAMES NO ----------
    //     `comparison/`, and names the record that replaced it.
    // The legend in `review.md` is a reader's map of the run directory, so a
    // line pointing at a directory nothing writes sends the owner to an absence
    // — the same defect kogaki#994 repaired for `pass-2/` on a run that never
    // reached `check`.
    ok("#1134 AC1: the owner record's layout names no comparison file",
      !/comparison/.test(rev), (rev.split("\n").find((l) => /comparison/.test(l)) || ""));
    ok("#1134 AC1: and names `join.json` as the record a reader debugging the run opens",
      /`join\.json` — pass one's verdicts with each row's class, model and span/.test(rev));

    // --- kogaki#994: THE WORKSPACE IS SPLIT BY PASS AND EVERY PASS'S EVIDENCE
    //     SURVIVES. This run corrected two Steps and ran `check`, so pass two
    //     re-read exactly those Steps blind — which is the write that used to
    //     land on pass one's file and destroy the reading it recorded.
    const P1 = (...a) => join(cWsRun, "pass-1", ...a);
    const P2 = (...a) => join(cWsRun, "pass-2", ...a);
    ok("#994: pass one's own directory holds the whole of its evidence",
      ["outline-input", "outline", "join", "corrections"].every((d) => existsSync(P1(d)))
      && existsSync(P1("join.json")));
    ok("#1133: and nothing the cold reader used to write",
      !existsSync(P1("ledger")) && !existsSync(P1("cold-reader.md")));
    ok("#994: and pass two's holds its own, in its own directory",
      existsSync(P2("check.json")) && existsSync(P2("outline-input")) && existsSync(P2("outline")));
    ok("#1134 AC1: and neither pass has a `comparison/` directory",
      !existsSync(P1("comparison")) && !existsSync(P2("comparison")));
    ok("#994: the run record and the snapshots stay at the workspace root",
      existsSync(join(cWsRun, "run.json")) && existsSync(join(cWsRun, "snapshots"))
      && !existsSync(P1("run.json")) && !existsSync(P2("run.json")));

    // #1100 AC3 — THE RUN DIRECTORY HOLDS ONLY WHAT THE LAYOUT LEGEND NAMES.
    // This fixture is the one that reaches every corner of the layout — two
    // passes, corrections and snapshots — so it is where the whole directory is
    // answerable rather than a subset of it.
    //
    // THE LEGEND IS PARSED FROM `USAGE`, NEVER RESTATED HERE. A list written
    // out in this case would be a second legend: the layout could grow an
    // entry, both copies could be updated, and the case would still be
    // asserting against itself. Parsed, a directory the legend does not name
    // fails here, and so does a legend nobody kept current.
    const legend = (() => {
      const m = new Map();
      const flat = USAGE.replace(/\n\s+/g, " ");
      for (const g of flat.matchAll(/runs\/review\/<slug>\/([A-Za-z0-9_.-]+)\/?(?:\{([^}]*)\})?/g)) {
        if (!m.has(g[1]) || g[2]) {
          m.set(g[1], g[2] ? g[2].split(",").map((x) => x.trim()).filter(Boolean) : null);
        }
      }
      return m;
    })();
    ok("#1100 AC3: the layout legend is readable from the command's own usage",
      legend.has("pass-1") && legend.has("pass-2") && legend.has("snapshots")
      && legend.has("run.json") && (legend.get("pass-1") || []).includes("join.json"),
      [...legend.keys()].join(", "));
    const strayRoot = readdirSync(cWsRun).filter((e) => !legend.has(e));
    ok("#1100 AC3: a run directory holds only the entries the layout legend names",
      strayRoot.length === 0, strayRoot.join(", "));
    for (const p of ["pass-1", "pass-2"]) {
      const allowed = legend.get(p) || [];
      const stray = readdirSync(join(cWsRun, p)).filter((e) => !allowed.includes(e));
      ok(`#1100 AC3: and ${p} holds only what the legend names for it`,
        allowed.length > 0 && stray.length === 0, stray.join(", "));
    }

    // AND THE READ DESCENDS, because the class has an instance ONE LEVEL DOWN
    // (PR #1105 round 1, finding 1). The session's correction reply landed at
    // `pass-1/corrections/<step>.prose.md` — inside a directory the legend
    // names, where a top-level read never looks — so a guard that stopped at
    // the legend caught four of the five strays #1100 enumerates and missed
    // the fifth.
    //
    // BELOW A PASS DIRECTORY THE LEGEND HAS NOTHING TO SAY: the entries there
    // are per Step and per Section, and enumerating them here would be the
    // restated second legend this case already refuses. The authority is the
    // run record's OWN register instead — `passPathAt` records every path it
    // composes under `run.pass_files` — so a file beneath a pass directory
    // that is not registered there is a file this Harness did not write.
    const filesUnder = (dir) => readdirSync(dir, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]));
    const runRec = JSON.parse(readOrEmpty(join(cWsRun, "run.json")) || "{}");
    const registered = new Set(Object.keys(runRec.pass_files || {}));
    const unregistered = [];
    for (const p of ["pass-1", "pass-2"]) {
      for (const f of filesUnder(join(cWsRun, p))) {
        const key = relative(cWsRun, f).split(sep).join("/");
        if (!registered.has(key)) unregistered.push(key);
      }
    }
    ok("#1100 AC3: and every file BENEATH a pass directory is one the run record says the Harness wrote",
      registered.size > 0 && unregistered.length === 0, unregistered.join(", "));

    // THE TWO READINGS BOTH EXIST, AND THEY DIFFER. Presence alone would pass
    // on a pass-two file that was a copy of pass one's; the point is that the
    // corrected Step was read twice, against two different articles.
    for (const id of ["s2", "s3"]) {
      const r1 = readOrEmpty(P1("outline-input", `${id}.md`));
      const r2 = readOrEmpty(P2("outline-input", `${id}.md`));
      ok(`#994: ${id}'s pass-one Reverse Outline input survives pass two re-reading it`,
        r1.length > 0 && r2.length > 0 && r1 !== r2);
      ok(`#994: and both passes' Reverse Outlines for ${id} are on disk`,
        existsSync(P1("outline", `${id}.json`)) && existsSync(P2("outline", `${id}.json`)));
    }
    ok("#994: pass one's join record and pass two's are separate files",
      existsSync(P1("join.json")) && existsSync(P2("check.json"))
      && readOrEmpty(P1("join.json")) !== readOrEmpty(P2("check.json")));
    ok("#994: and the correction inputs are filed with the verdicts that asked for them",
      existsSync(P1("corrections", "s2.md")) && existsSync(P1("corrections", "s3.md"))
      && !existsSync(P2("corrections")));

    // --- kogaki#994: THE REVIEWED DRAFT HAS ITS OWN FILENAME AND `draft.md` IS
    //     THE DRAFT THAT WAS REVIEWED.
    const cReviewed = join(cBrief, REVIEWED_BASENAME);
    ok("#994: the reviewed Draft lands beside the Draft under its own name",
      existsSync(cReviewed));
    ok("#994: `draft.md` is byte-identical to the article this run reviewed",
      readFileSync(cDraft, "utf8") === cArticleAsReviewed);
    ok("#994: and the reviewed Draft is the corrected article, not a copy of it",
      readOrEmpty(cReviewed) !== cArticleAsReviewed);
    ok("#994: the owner record names both files",
      /\*\*Draft reviewed\.\*\*/.test(rev) && rev.includes(REVIEWED_BASENAME));

    // A SECOND `close` WOULD COPY THE RESTORED ORIGINAL OVER THE REVIEWED
    // DRAFT, and is refused by name rather than performed.
    {
      const again = RD("close");
      ok("#994: a second close over a restored run refuses",
        again.status === 1 && /this run is closed/.test(again.stderr));
      ok("#994: and the reviewed Draft is untouched by the refusal",
        readOrEmpty(cReviewed) !== cArticleAsReviewed);
    }

    // --- PR #1004 round 1, finding 1, and its successor's finding 4: `compare`
    //     IS PASS ONE, AND PASS ONE ENDS AT THE FIRST CORRECTION. Driven by
    //     running `compare` again with the run on pass two, which is the door
    //     `check`'s own comment names as the plausible wrong one. Round 1 found
    //     the Packets landing in `pass-2/join/`; the successor review found
    //     that, with that fixed, the re-run still re-rendered pass ONE's
    //     Packets from the corrected prose over the inputs its verdicts were
    //     given on. So the act is refused, and both directories are asserted
    //     byte-for-byte untouched.
    {
      writeFileSync(cDraft, readOrEmpty(join(cBrief, REVIEWED_BASENAME)));
      const rr = JSON.parse(readFileSync(join(cWsRun, "run.json"), "utf8"));
      delete rr.reviewed_at; delete rr.restored_from; delete rr.closed_at;
      writeFileSync(join(cWsRun, "run.json"), JSON.stringify(rr, null, 2) + "\n");
      const p2JoinBefore = existsSync(P2("join"))
        ? readdirSync(P2("join")).sort().join(",") : "";
      // THE CASE IS ONLY EXPRESSED IF PASS TWO HAS PAIR INPUTS TO LOSE. An
      // empty pass-2 `join/` would make the comparison below vacuously true,
      // which is the form this whole Harness exists to refuse.
      ok("#1004/1: pass two has pair inputs of its own for the case to be about",
        p2JoinBefore.length > 0);
      const dirBytes = (d) => readdirSync(d).sort()
        .map((n) => `${n}:${readFileSync(join(d, n), "utf8")}`).join("\u0000");
      ok("#1004/1: and pass one has pair inputs of its own for the case to be about",
        existsSync(P1("join")) && readdirSync(P1("join")).length > 0);
      const p1JoinBefore = dirBytes(P1("join"));
      const p1RecordBefore = readOrEmpty(P1("join.json"));
      const rCmp = RD("compare");
      ok("#1004/1: compare over a run with corrections is refused by name",
        rCmp.status === 1 && /pass one is over/.test(rCmp.stderr)
        && /over the inputs its verdicts were given on/.test(rCmp.stderr));
      ok("#1004/1: and the refusal names `check` as the pass over a corrected Draft",
        /review-draft\.mjs check --draft/.test(rCmp.stderr));
      const p2JoinAfter = existsSync(P2("join"))
        ? readdirSync(P2("join")).sort().join(",") : "";
      ok("#1004/1: pass two's pair inputs are untouched",
        p2JoinAfter === p2JoinBefore);
      ok("#1004/1: and pass one's pair inputs are byte-for-byte the ones its verdicts were given on",
        dirBytes(P1("join")) === p1JoinBefore);
      ok("#1004/1: and pass one's record is unchanged",
        readOrEmpty(P1("join.json")) === p1RecordBefore);
      // THE COLD READER'S ENTRIES WERE PASS ONE'S TOO (PR #1007 round 1, finding
      // 2), and `read` was refused over a corrected run for the same reason.
      // That entry point is gone with the reader (kogaki#1133), so there is no
      // ledger under either pass to hold untouched — asserted as an ABSENCE
      // here rather than dropped, because the case above it is still about what
      // a corrected run may not overwrite.
      ok("#1133: no ledger is written under either pass",
        !existsSync(P1("ledger")) && !existsSync(P2("ledger")));
    }

    // --- PR #1004 round 1, finding 3: kogaki#994 item 4 — the owner record
    //     points at the pass directories, so a finding leads to the input the
    //     judge saw and the record the blind reviewer wrote.
    {
      const rC = RD("close");
      const rv = readOrEmpty(join(cBrief, "review.md"));
      ok("#1004/3: close succeeds and the record names where the evidence is",
        rC.status === 0 && /^### Where this run's evidence is$/m.test(rv));
      ok("#1004/3: it names both passes' directories",
        /\*\*Pass 1 — `compare`\.\*\*/.test(rv) && /\*\*Pass 2 — `check`\.\*\*/.test(rv)
        && rv.includes("pass-1") && rv.includes("pass-2"));
      ok("#1004/3: and the artefacts a reader goes from a finding to",
        /outline\/<step>\.json/.test(rv) && /join\/<step>\.<item>/.test(rv));
      ok("#1004/3: the snapshots and the run record are named at the root",
        /\*\*Snapshots\.\*\*/.test(rv) && /\*\*Run record\.\*\*/.test(rv));
      // Undo the close again — the pass-collision case below needs a live run.
      writeFileSync(cDraft, readOrEmpty(join(cBrief, REVIEWED_BASENAME)));
      const rr = JSON.parse(readFileSync(join(cWsRun, "run.json"), "utf8"));
      delete rr.reviewed_at; delete rr.restored_from; delete rr.closed_at;
      writeFileSync(join(cWsRun, "run.json"), JSON.stringify(rr, null, 2) + "\n");
    }

    // --- kogaki#994: A WRITE THAT WOULD LAND ON ANOTHER PASS'S FILE IS REFUSED
    //     BY NAME. Driven by putting the run back on pass one with pass two's
    //     ledger intact, which is the state a site composing a path by hand
    //     would produce — the directory split alone makes it unreachable, and
    //     the refusal is what keeps it unreachable when the split is edited.
    {
      // The close restored `draft.md`, so the corrected article goes back first:
      // `requireCurrent` guards every act and would refuse on the restore before
      // the pass ledger was ever consulted.
      writeFileSync(cDraft, readOrEmpty(cReviewed));
      const rr = JSON.parse(readFileSync(join(cWsRun, "run.json"), "utf8"));
      rr.pass = 1;
      rr.pass_files[["pass-1", "outline", "s2.json"].join("/")] = 2;
      delete rr.reviewed_at; delete rr.restored_from;
      delete rr.outlineFields.s2;
      writeFileSync(join(cWsRun, "run.json"), JSON.stringify(rr, null, 2) + "\n");
      // THE FILE HANDED BACK IS THE OUTLINE BLOCK, not the reading of it: since
      // kogaki#1014 `outline` takes a Brief `step` block, and a JSON record is
      // now refused on its form before the pass ledger is ever consulted —
      // which would make this case pass on the wrong refusal.
      const r = RD("outline", "--step", "s2", "--file", P2("outline", "s2.md"));
      ok("#994: a pass writing over a file another pass wrote is refused by name",
        r.status === 1 && /would write over a file pass 2 wrote/.test(r.stderr));
      ok("#994: and the refusal says why the other pass's reading is not retrievable",
        /not retrievable once this write lands/.test(r.stderr));
    }
  }


  // -- kogaki#873's COLD READER, REMOVED (owner, 2026-09-17; kogaki#1133) -----
  //
  // Its cases stood here: the input's blindness, the entry set `compare`
  // required, and where a Section fail went. They are gone with the reader, and
  // what stands in their place is the ABSENCE, asserted rather than left to be
  // inferred from deleted cases -- a removal whose only evidence is missing
  // cases cannot be told from a removal that half happened.
  //
  // THE REOPEN TRIGGER IS NOT A CASE HERE, deliberately. It is a Draft whose
  // every Step holds the round trip and whose thesis the owner cannot find on
  // reading it, and the check it triggers is designed at BRIEF COMPOSITION --
  // outside this artifact, so there is nothing here to assert it against.
  {
    // ACCEPTANCE 1 — the template is gone and the table names none of its keys.
    ok("#1133 AC1: src/cold-reader-template.md no longer exists",
      !existsSync(join(dirname(self), "cold-reader-template.md")));
    const TABLE = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    ok("#1133 AC1: the item table carries no `sections` block, no `ledger_fields` and no `final_claim_field`",
      !("sections" in TABLE) && !("ledger_fields" in TABLE) && !("final_claim_field" in TABLE));
    ok("#1133 AC1: and no item declares a Section's declared or reverse side",
      TABLE.items.every((i) => !("declared" in i) && !("reverse" in i) && !("vacuous_when" in i)));
    // AND NO ITEM READS A DECLARED SIDE THAT IS NOT A STEP'S PACKET BLOCK, which
    // is what took `thesis` and `opening_question` out of `packet_blocks`: they
    // were fixed points of the whole article, read by the Section pairs alone.
    ok("#1133 AC1: `packet_blocks` carries no article-level block, its only readers gone",
      !("thesis" in TABLE.packet_blocks) && !("opening_question" in TABLE.packet_blocks));

    // ACCEPTANCE 2 — no `read`, and the run directory carries none of its output.
    const rRead = spawnSync(process.execPath,
      [self, "read", "--draft", draft.path, "--section", "1", "--workspace", wsBase],
      { encoding: "utf8", input: "{}\n" });
    ok("#1133 AC2: `read` is not an entry point — it refuses with the usage",
      rRead.status === 1 && /review-draft —/.test(rRead.stdout)
      && !/nothing arrived on standard input/.test(rRead.stderr));
    const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]).concat(e.isDirectory() ? [join(d, e.name)] : []));
    const entries = walk(WS);
    ok("#1133 AC2: the run directory carries no cold-reader.md and no ledger/",
      entries.every((e) => !/cold-reader\.md$/.test(e) && !/[\\/]ledger$/.test(e)),
      entries.filter((e) => /cold-reader|ledger/.test(e)).join(", "));
    // AND NO `comparison/` AT ALL (kogaki#1134). #1133 asserted the absence of
    // `comparison/sections.md` alone, the one file the cold reader's departure
    // took with it; the directory it stood in went at kogaki#1134, so the
    // absence is stated over the whole name rather than over that one entry.
    ok("#1134 AC1: and nothing named comparison, in this run directory either",
      entries.every((e) => !/comparison/.test(basename(e))),
      entries.filter((e) => /comparison/.test(basename(e))).join(", "));
    ok("#1133 AC2 DISCRIMINATION: while the pass's own evidence IS there, so the absence is not vacuous",
      entries.some((e) => /join\.json$/.test(e))
      && entries.some((e) => /outline[\\/]a1\.json$/.test(e)));

    // ACCEPTANCE 3 — the join record and the owner record.
    const jrec = JSON.parse(readFileSync(join(WS, "pass-1", "join.json"), "utf8"));
    ok("#1133 AC3: join.json carries no `sections` key", !("sections" in jrec));
    const rev = readOrEmpty(join(thesis, "review.md"));
    ok("#1133 AC3: review.md renders no Section routing",
      rev.length > 0 && !/Section findings/.test(rev) && !/cold reader/i.test(rev)
      && !/upstream: brief/.test(rev) && !/Where each Section fail was routed/.test(rev));
  }

  // ---- kogaki#880, RESTATED AGAINST THE RECORD'S OWN FIELDS (kogaki#1018) ----
  // THE FIGURE'S ROUND TRIP: the blind reading of the block, the element-to-
  // claim join, the caption against the declared reader state, and the seat a
  // figure fail routes to. Driven on its OWN Draft rather than by adding a
  // figure to the fixture above — every case above asserts a count or an absence
  // over that Draft, and a figure appearing in it would move those numbers for a
  // reason unrelated to what they measure.
  //
  // WHAT CHANGED SINCE #880, and it is the whole of what changed: the reading
  // used to arrive as one object field of the second schema kogaki#1014 deleted.
  // It now arrives as a SECOND FENCED BLOCK in the figure record's own field
  // names, so neither reading carries a key belonging to the other artifact.
  // The cases below drive the new grammar; the properties they
  // assert are #880's own.
  {
    const fdir = join(root, "fig");
    const fPacketDir = join(fdir, "packets");
    mkdirSync(fPacketDir, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(fPacketDir, id);

    // The record is an INSTANCE of the `axis` form. Each element's `claim` is
    // the figure decision's ADDRESS over this Step's own claims, 1-based — `g1`
    // and `g2` are the two `CLAIMS.a1` lines. The binding itself is the figure
    // record's to refuse; what `figure-element-claim` asks is whether each
    // element's WORDING is carried by the line its address points at.
    const FIG_RECORD = {
      kind: "axis",
      elements: {
        endpoint_a: { text: "the harness renders the reverse outline input", claim: "g1" },
        endpoint_b: { text: "the reviewer never reads the packet that produced the prose",
          claim: "g2" },
        criterion: { text: "the reverse outline input is rendered before any outline is accepted",
          claim: "g1" },
      },
      relations: ["the two endpoints sit on the criterion"],
      emphasis: "endpoint_a",
      caption: "The reader knows which act renders the input.",
      position: "after",
    };
    const fdraft = buildDraft(fdir, { packetDir: fPacketDir, figures: { a1: { record: FIG_RECORD } } });
    // `--workspace` IS A BASE AND THE SLUG IS JOINED ONTO IT, which is the
    // reading `workspaceFor` gives the flag; the run directory is therefore the
    // base plus this Draft's own slug, and reading the base would read a
    // directory nothing writes.
    const FWS_BASE = join(root, "fws");
    const FWS = join(FWS_BASE, "fig");
    const fdrive = (...a) => selfRun(
      [self, a[0], "--draft", fdraft.path, "--workspace", FWS_BASE, ...a.slice(1)]);

    const o = fdrive("open");
    ok("#880: a Draft carrying a figure opens", o.status === 0);
    const input = readOrEmpty(join(FWS, "pass-1", "outline-input", "a1.md"));

    // AC1 — THE BLIND READER'S INPUT SHOWS THE FENCE AND THE CAPTION.
    ok("#880 AC1: the Reverse Outline input carries the figure's fence",
      input.includes("```mermaid") && input.includes("flowchart LR"));
    ok("#880 AC1: and its caption", input.includes(FIG_RECORD.caption));
    ok("#880 AC1: with its own draft line numbers, so the reader can see where it sits",
      new RegExp(`^\\s*${fdraft.figureRanges.a1[0] + fdraft.bodyOffset} \\| \`\`\`mermaid$`, "m").test(input));

    // AC1 — AND NO STRING THAT OCCURS ONLY IN THE RECORD FILE. The element→
    // claim BINDING is that string: it is the whole of what the record adds
    // over the rendering, and a reviewer shown it would name the elements the
    // record names — which would make `figure-element-claim` a check of the
    // record against itself.
    //
    // THE POSITION WORD IS DELIBERATELY NOT ASSERTED ABSENT, and saying so is
    // the point: `before`/`after` are the record's own field vocabulary and the
    // reader is now ASKED for it, so an absence case on them would assert the
    // opposite of the design. What the reader may not see is the BINDING.
    ok("#880 AC1: and no element's claim binding reaches the Blind Reader",
      !/claim: g\d/.test(input) && !/"claim"/.test(input));
    // THE RELATIONS ARE NOT AMONG THEM, and that is the renderer rather than an
    // oversight: every relation reaches the output as an edge label, so a
    // relation string is the ARTICLE'S and not the record's. What the record
    // has and the rendering does not is the JSON itself.
    ok("#880 AC1: nor does the record's own JSON reach it",
      !input.includes('"claim"') && !input.includes('"elements"')
      && !input.includes('"relations"') && !input.includes('"emphasis"'));

    // THE ASK IS CONDITIONAL IN BOTH DIRECTIONS (kogaki#1018). A figure Step is
    // asked for the figure block in the RECORD's field names; a figureless Step
    // is asked for nothing of the sort.
    ok("#1018: the input asks for the figure in the record's own fields",
      /```figure/.test(input) && /`element` —/.test(input)
      && /`caption` —/.test(input) && /`position` —/.test(input));
    // THE REFUSED FIELDS ARE NO LONGER NAMED HERE, AND THIS CASE IS THE #1018
    // ONE INVERTED (kogaki#1099, owner 2026-09-11). #1018 rendered the figure's
    // withheld list "rather than merely omitted"; the later ruling is that a
    // reader who has never heard of a field cannot supply it, so the list
    // creates the knowledge it withholds — and the refusal it announced is the
    // parser's, which works without the announcement. The declaration stays as
    // that refusal list and is asserted below at `outline`; what goes is the
    // rendering, exactly as acceptance 2 keeps NOT_RECONSTRUCTIBLE_FIELDS.
    ok("#1099: and names none of the record fields it refuses — the announcement created the knowledge it withheld",
      !/`kind` —/.test(input) && !/`relations` —/.test(input) && !/`emphasis` —/.test(input)
      && !/NOT asked for/.test(input));
    ok("#1099: so a figure Step's input carries none of the plan's vocabulary either",
      planLeaks(input).length === 0, planLeaks(input).join(", "));
    ok("#1018: while a figureless Step's input asks for no figure block at all",
      !readOrEmpty(join(WS, "pass-1", "outline-input", "a1.md")).includes("```figure"));

    // The figure's Reverse Outline, in the record's own field names.
    const FIG_BLOCK = ["```figure",
      "element: the harness rendering the reverse outline input",
      "element: the reviewer not reading the packet",
      "element: the criterion they sit on",
      "caption: The reader knows which act renders the input.",
      "position: after",
      "```"].join("\n");
    const outlineWith = (id, figure = null, mutate = (o) => o) => {
      const f = join(root, `fig-outline-${id}.md`);
      writeFileSync(f, renderOutline(mutate(outlineFor(id))) + (figure ? `\n${figure}\n` : ""));
      return f;
    };

    const rNo = fdrive("outline", "--step", "a1", "--file", outlineWith("a1"));
    ok("#1018: a figure Step's outline with no `figure` block refuses, naming what is owed",
      rNo.status === 1 && /carries no fenced `figure` block/.test(rNo.stderr));

    const rEmpty = fdrive("outline", "--step", "a1", "--file",
      outlineWith("a1", ["```figure", "caption: c", "position: after", "```"].join("\n")));
    ok("#1018: a figure block naming no element refuses — a reader who named nothing did not look",
      rEmpty.status === 1 && /carries no `element:` line/.test(rEmpty.stderr));

    const rWithheld = fdrive("outline", "--step", "a1", "--file",
      outlineWith("a1", FIG_BLOCK.replace(/```$/, "kind: axis\n```")));
    ok("#1018: a field the record declares NOT reconstructible is refused, with its reason",
      rWithheld.status === 1 && /carries `kind:`, which is declared not reconstructible/.test(rWithheld.stderr));

    const rUnknown = fdrive("outline", "--step", "a1", "--file",
      outlineWith("a1", FIG_BLOCK.replace(/```$/, "confidence: high\n```")));
    ok("#1018: and a field the record does not declare at all is refused by name",
      rUnknown.status === 1 && /carries `confidence:`, which is not a figure record field/.test(rUnknown.stderr));

    const rPos = fdrive("outline", "--step", "a1", "--file",
      outlineWith("a1", FIG_BLOCK.replace("position: after", "position: beside")));
    ok("#1018: a position outside the record's closed pair refuses, naming the pair",
      rPos.status === 1 && /`position:` reads `beside`/.test(rPos.stderr)
      && /`before` or `after`/.test(rPos.stderr));

    const rOk = fdrive("outline", "--step", "a1", "--file", outlineWith("a1", FIG_BLOCK));
    ok("#1018: and the outline carrying a reading of the figure is recorded", rOk.status === 0);
    ok("#1018: the figure's reading lands as its OWN file, beside the passage's",
      existsSync(join(FWS, "pass-1", "outline", "a1.figure.json"))
      && existsSync(join(FWS, "pass-1", "outline", "a1.json")));
    {
      // NEITHER READING CARRIES A KEY OF THE OTHER'S ARTIFACT. That is the whole
      // reason the figure's reading is a second file rather than a field of the
      // first, so it is asserted rather than described.
      const stepRec = JSON.parse(readOrEmpty(join(FWS, "pass-1", "outline", "a1.json")) || "{}");
      const figRec = JSON.parse(readOrEmpty(join(FWS, "pass-1", "outline", "a1.figure.json")) || "{}");
      const briefNames = new Set([...RECONSTRUCTIBLE_FIELDS.map((f) => f.name), "step_id"]);
      const recordNames = new Set([...FIGURE_RECONSTRUCTIBLE_FIELDS.map((f) => f.name), "step_id"]);
      ok("#1018: the passage's reading carries Brief field names only",
        Object.keys(stepRec).every((k) => briefNames.has(k)));
      ok("#1018: and the figure's carries the RECORD's field names only",
        Object.keys(figRec).every((k) => recordNames.has(k))
        && Array.isArray(figRec.element) && figRec.element.length === 3);
    }

    // A figure block on a Step that met no figure is refused, and the refusal
    // says WHY rather than reporting it as an unnamed key: an invented reading
    // and a stray annotation are different mistakes.
    const rUnowed = fdrive("outline", "--step", "a2", "--file", outlineWith("a2", FIG_BLOCK));
    ok("#1018: a figure block on a Step that met no figure refuses, saying it is an invention",
      rUnowed.status === 1 && /this Step renders no figure/.test(rUnowed.stderr)
      && /is an invention/.test(rUnowed.stderr));

    ok("#880: a2 outlines without one", fdrive("outline", "--step", "a2", "--file", outlineWith("a2")).status === 0);
    ok("#880: a3 outlines without one", fdrive("outline", "--step", "a3", "--file", outlineWith("a3")).status === 0);


    const c = fdrive("compare");
    ok("#880: the comparison runs over the figure Draft", c.status === 0, (c.stderr || "").trim());
    const frec = JSON.parse(readOrEmpty(join(FWS, "pass-1", "join.json")) || "{}");
    const ITEMS_ALL = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    const FIG_IDS = new Set(ITEMS_ALL.items.filter((i) => i.figure_only).map((i) => i.id));

    // The figure rows exist on the Step that has a figure and NOWHERE ELSE —
    // AC3 asserted from the other side, on a Draft that does have one.
    const figRows = (frec.results || []).filter((r) => FIG_IDS.has(r.item));
    ok("#880: every figure item is computed on the Step that carries a figure",
      [...FIG_IDS].every((id) => figRows.some((r) => r.step_id === "a1" && r.item === id)));
    ok("#880 AC3: and on no other Step, even in a Draft that has one",
      figRows.length > 0 && figRows.every((r) => r.step_id === "a1"));

    // The mechanical row costs no model call and the judged ones do — the same
    // property the prose half asserts, over the figure's own rows.
    ok("#880: the element-to-claim row is decided by the Harness alone",
      (frec.mechanical || []).some((m) => m.step_id === "a1" && m.item === "figure-element-claim")
      && !(frec.model_calls || []).some((m) => m.item === "figure-element-claim"));
    ok("#880: and every judged figure row renders one join Packet",
      ITEMS_ALL.items.filter((i) => i.figure_only && i.mode === "judged")
        .every((i) => (frec.model_calls || []).some((m) => m.step_id === "a1" && m.item === i.id)));

    // The join Packet names the RECORD as the carrier the declared line came
    // from, never the Packet — the finding a reader repairs is in the record.
    const fp = (frec.owed || []).find((x) => x.item === "figure-elements");
    const fpText = fp ? readOrEmpty(fp.packet) : "";
    ok("#880: a figure join Packet says its declared side came from the figure record",
      /### What the figure record DECLARED/.test(fpText));
    ok("#880: and quotes the figure beside the prose, so the judged pair can see it",
      fpText.includes("```mermaid"));
    ok("#1018: and its reverse side is the reader's own figure block, not the passage's outline",
      fpText.includes("the criterion they sit on"));

    ok("#880: the element-to-claim row holds when every element is worded from its claim",
      (figRows.find((r) => r.item === "figure-element-claim") || {}).verdict === "holds");

    // THE EVIDENCE POINTER FOLLOWS THE ROW'S OWN SIDE (PR #1024 round 1). A
    // figure finding's reverse side is the FIGURE's Reverse Outline, and the
    // passage's carries none of the reading the verdict was given on — so a
    // pointer composed from the Step alone sends the owner to the wrong file.
    // Driven end to end, because the pointer is only composed at `close`.
    {
      const vf = join(root, "fig-verdicts.json");
      const owed = frec.owed || [];
      writeFileSync(vf, JSON.stringify({
        verdicts: owed.map((o) => ({
          step_id: o.step_id, item: o.item,
          ...(o.pair === null || o.pair === undefined ? {} : { pair: o.pair }),
          ...(o.section === undefined ? {} : { section: o.section }),
          // A BEST-EFFORT figure row, deliberately: a failing PRESERVED item
          // routes to `check` and never reaches `close`, so a preserved fail
          // would assert the pointer against a record this arm never writes.
          verdict: o.item === "figure-position" ? "fails" : "holds",
          reason: o.item === "figure-position"
            ? "the reader met the block after a passage that had already done its work"
            : "it agrees",
          model: JUDGE_MODEL,
        })),
      }, null, 2) + "\n");
      ok("#1024: the figure Draft's join fills once every pair is answered",
        fdrive("compare", "--verdicts", vf).status === 0);
      const rc = fdrive("close");
      const rv = readOrEmpty(join(dirname(fdraft.path), "review.md"));
      ok("#1024: it closes with the figure finding standing", rc.status === 0, (rc.stderr || "").trim());
      ok("#1024: and a figure finding points at the FIGURE's Reverse Outline, not the passage's",
        /the figure's Reverse Outline: `[^`]*a1\.figure\.json`/.test(rv),
        (rv.split("\n").filter((l) => /Reverse Outline:/.test(l)).join(" | ") || "(no pointer line)"));
    }
  }

  // ---- kogaki#945 -----------------------------------------------------------
  // THE SEAT-BLIND UNCORRECTED REPORT, AND THE BLIND INPUT'S FIGURE PLACEMENT.
  // Two findings carried out of PR #944 round 1, asserted here rather than left
  // as the comments they were reported against.
  //
  // ITS OWN BRIEF, for the reason the #880 drive states about its own: the
  // drives above turn on which preserved item fails, and adding a second
  // failing seat to one of them would move cases that measure something else.
  // This one is built so that f1 owes BOTH seats — a mechanical
  // `figure-element-claim` fail from a record worded off its bound claim, and
  // a `reader-state-after` fail supplied as a verdict — which is the form the
  // report could not see.
  {
    const draftCli = join(dirname(self), "draft.mjs");
    const sRoot = join(root, "seat-report");
    const sBrief = join(sRoot, "theses", "seat-fixture");
    const sMoves = join(sRoot, "moves");
    const sWs = join(sRoot, "ws-draft");
    mkdirSync(sBrief, { recursive: true });
    mkdirSync(sMoves, { recursive: true });
    writeFileSync(join(sMoves, "axis_move.md"), [
      "id: axis_move", "status: observed",
      "intent: >-", "  establish a distinction between two endpoints.",
      "requires: >-", "  the reader has no stable distinction yet.",
      "effect: >-", "  the reader can orient later cases on the axis.",
      "constraints: >-", "  the endpoints must clarify the same axis.",
      "failure_modes: >-", "  pairing cases that differ along unrelated dimensions.",
      "excerpt: >-", "  the author's account of the movement they observed.",
      "visual_form:", "  kind: axis",
      "  endpoint_a: the first endpoint the Move presents",
      "  endpoint_b: the opposing endpoint",
      "  criterion: the one axis both endpoints clarify",
    ].join("\n") + "\n");
    writeFileSync(join(sMoves, "plain_move.md"), [
      "id: plain_move", "status: observed",
      "intent: >-", "  carry the claim one step further.",
      "requires: >-", "  the reader holds what the previous passage settled.",
      "effect: >-", "  the reader holds one more consequence.",
      "constraints: >-", "  never re-open what the earlier passage settled.",
      "failure_modes: >-", "  restating the previous passage in new words.",
      "excerpt: >-", "  the author's account of the movement they observed.",
    ].join("\n") + "\n");
    writeFileSync(join(sBrief, "brief.md"), [
      "# Brief — seat-fixture", "",
      "*Survey pin:* `product-lab@0000000000000000000000000000000000000000`", "",
      "## Strands", "",
      "### L1 — first-strand", "",
      "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
      "## Thesis", "", "The fixture claim.", "",
      "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
      "## Reader target", "", "The reader can say why the fixture claim is not obvious.", "",
      "## Opening question", "", "What makes the fixture claim worth stating?", "",
      "## Sequence", "",
      "```step", "step_id: f1", "move: axis_move", "opens_section: The only heading",
      "purpose: the job f1 does.",
      "reader_state_before: the reader arrives at f1 holding nothing in particular.",
      "reader_state_after: the reader leaves f1 able to say what separates the two harbours.",
      "materials: L1",
      "rationale: f1 sits here because the path put it here.",
      "figure: it lets the reader hold both harbours against the one tide that separates them",
      "figure_roles: endpoint_a=g1, endpoint_b=g2, criterion=g3",
      "claim (strand L1): the first harbour keeps its own hours.",
      "claim (strand L1): the second harbour keeps different hours.",
      "claim (strand L1): the tide is the one measure both harbours are read against.",
      "```", "",
      "```step", "step_id: f2", "move: plain_move",
      "purpose: the job f2 does.",
      "reader_state_before: the reader arrives at f2 holding what f1 settled.",
      "reader_state_after: the reader leaves f2 able to say who did the measuring.",
      "materials: L1",
      "rationale: f2 sits here because the path put it here.",
      "claim (strand L1): a table records what somebody measured on days somebody chose.",
      "```", "",
    ].join("\n"));

    const sdl = (cmd, ...extra) => spawnSync(process.execPath,
      [draftCli, cmd, "--brief", join(sBrief, "brief.md"), "--workspace", sWs, "--moves-dir", sMoves, ...extra],
      { encoding: "utf8" });
    const sFile = (name, text) => {
      const f = join(sRoot, name);
      writeFileSync(f, text + "\n");
      return f;
    };
    // `position: after` — the figure sits BELOW the prose in the Draft, which is
    // the placement finding's whole subject.
    const S_RECORD = {
      kind: "axis",
      elements: {
        endpoint_a: { text: "the first harbour keeps its own hours", claim: "g1" },
        endpoint_b: { text: "a table records what somebody measured on chosen days", claim: "g2" },
        criterion: { text: "the tide both harbours are read against", claim: "g3" },
      },
      relations: ["the two harbours sit on the tide"],
      caption: "The reader knows what separates the two harbours.",
      position: "after",
    };
    let sReady = sdl("resolve").status === 0;
    sReady = sReady && sdl("section", "--step", "f1", "--file", sFile("s-prose-f1.md",
      "One harbour keeps its own hours and the next keeps others, and the water they are both "
      + "read against is the same water.")).status === 0;
    sReady = sReady && sdl("figure", "--step", "f1", "--file",
      sFile("s-record-f1.json", JSON.stringify(S_RECORD, null, 2))).status === 0;
    sReady = sReady && sdl("section", "--step", "f2", "--file", sFile("s-prose-f2.md",
      "A skipper reading either set of hours is reading a measurement, and the question worth "
      + "asking is who was standing there.")).status === 0;
    sReady = sReady && sdl("emit").status === 0;
    const sDraft = join(sBrief, "draft.md");
    ok("#945: the fixture Draft realizes with a figure below its Step's prose", sReady && existsSync(sDraft));

    const swsBase = join(sRoot, "ws-review");
    const sWsRun = join(swsBase, "seat-fixture");
    const SD = (...a) => selfRun(
      [self, ...a, "--draft", sDraft, "--workspace", swsBase,
        "--draft-workspace", sWs, "--moves-dir", sMoves]);
    ok("#945: ReviewDraft opens it", SD("open").status === 0);

    // FINDING 3 — THE BLIND INPUT PLACES THE FIGURE WHERE THE READER MET IT.
    // The Draft puts the block below the prose, so the input must too. Asserted
    // by ORDER rather than by presence: the block was always present, and it was
    // always above, which is exactly the defect a presence case cannot see.
    const sInput = readOrEmpty(join(sWsRun, "pass-1", "outline-input", "f1.md"));
    const iFig = sInput.indexOf("## The figure the reader met with this passage");
    const iPass = sInput.indexOf("## The passage — ");
    ok("#945: the Reverse Outline input still carries the figure block",
      iFig !== -1 && sInput.includes("```mermaid"));
    ok("#945: and renders it BELOW the passage, the side the reader met it on",
      iFig !== -1 && iPass !== -1 && iFig > iPass,
      `figure at ${iFig}, passage at ${iPass}`);
    // THE SIDE IS READ FROM THE DRAFT, NOT FROM THE RECORD, and this is the case
    // that says so: the input must still leak nothing the record alone carries,
    // so a repair that arranged the page by reading `position` would fail here.
    // AND THE INSTRUCTION NAMES NO SIDE (PR #946 round 1, finding 1). The five
    // cases around this one assert by slot index, so every one of them stays
    // green while the prose beside the block tells the reviewer the passage is
    // on the other side of it. This asserts the words.
    ok("#947: and the figure section's instruction claims no arrangement of its own",
      iFig !== -1 && !/passage below/.test(sInput) && !/below\.\s*$/m.test(sInput.slice(iFig, iFig + 400)),
      sInput.slice(iFig, iFig + 260).replace(/\n/g, " / "));
    ok("#945: while leaking nothing the record alone holds",
      !/"claim"/.test(sInput) && !/"elements"/.test(sInput)
      && !/"position"/.test(sInput) && !/claim: g\d/.test(sInput));

    // The control: the same record placed BEFORE renders above the passage, so
    // the case above is bound to the placement and not to a constant.
    {
      const bRoot = join(sRoot, "before");
      const bBrief = join(bRoot, "theses", "seat-fixture");
      mkdirSync(bBrief, { recursive: true });
      writeFileSync(join(bBrief, "brief.md"), readFileSync(join(sBrief, "brief.md"), "utf8"));
      const bWs = join(bRoot, "ws-draft");
      const bdl = (cmd, ...extra) => spawnSync(process.execPath,
        [draftCli, cmd, "--brief", join(bBrief, "brief.md"), "--workspace", bWs, "--moves-dir", sMoves, ...extra],
        { encoding: "utf8" });
      const bFile = (name, text) => { const f = join(bRoot, name); writeFileSync(f, text + "\n"); return f; };
      mkdirSync(bRoot, { recursive: true });
      let bReady = bdl("resolve").status === 0;
      bReady = bReady && bdl("section", "--step", "f1", "--file", bFile("b-prose-f1.md",
        "One harbour keeps its own hours and the next keeps others, and the water they are both "
        + "read against is the same water.")).status === 0;
      bReady = bReady && bdl("figure", "--step", "f1", "--file",
        bFile("b-record-f1.json", JSON.stringify({ ...S_RECORD, position: "before" }, null, 2))).status === 0;
      bReady = bReady && bdl("section", "--step", "f2", "--file", bFile("b-prose-f2.md",
        "A skipper reading either set of hours is reading a measurement, and the question worth "
        + "asking is who was standing there.")).status === 0;
      bReady = bReady && bdl("emit").status === 0;
      const bDraft = join(bBrief, "draft.md");
      const bwsBase = join(bRoot, "ws-review");
      const bOpen = spawnSync(process.execPath,
        [self, "open", "--draft", bDraft, "--workspace", bwsBase,
          "--draft-workspace", bWs, "--moves-dir", sMoves], { encoding: "utf8" });
      const bInput = readOrEmpty(join(bwsBase, "seat-fixture", "pass-1", "outline-input", "f1.md"));
      const bFig = bInput.indexOf("## The figure the reader met with this passage");
      const bPass = bInput.indexOf("## The passage — ");
      ok("#945 control: a figure the reader met ABOVE the prose renders above it",
        bReady && bOpen.status === 0 && bFig !== -1 && bPass !== -1 && bFig < bPass,
        `figure at ${bFig}, passage at ${bPass}`);
    }

  }

  // ---- kogaki#1132, ACCEPTANCE 4 ----------------------------------------
  // THE CORRECTION IS TOLD WHICH DECLARED CLAIM WAS LOST, IN ITS OWN WORDS.
  // "`claims` failed" does not say which of a Step's claims went missing, and
  // on a Step declaring two it is half the instruction — the corrector has to
  // guess, and the first full run's corrections were written against exactly
  // that gap.
  //
  // ITS OWN BRIEF, for the reason the #880 and #945 drives state about theirs:
  // the correction drive above turns on which preserved item fails on which
  // Step, and adding a second failing item to one of its Steps would move cases
  // that measure something else. This one is built for one property — x1
  // declares TWO claims, the reader recovers the first alone — so the
  // discrimination the acceptance names (B's text and reason are rendered, A's
  // are not) is expressible on one Step of one Draft.
  {
    const draftCli = join(dirname(self), "draft.mjs");
    const xRoot = join(root, "lost-claim");
    const xBrief = join(xRoot, "theses", "lost-claim-fixture");
    const xMoves = join(xRoot, "moves");
    const xWs = join(xRoot, "ws-draft");
    mkdirSync(xBrief, { recursive: true });
    mkdirSync(xMoves, { recursive: true });
    for (const id of ["open_the_claim", "carry_the_claim"]) {
      writeFileSync(join(xMoves, `${id}.md`), [
        `id: ${id}`, "status: observed",
        "intent: >-", `  what ${id} does to the reader.`,
        "requires: >-", "  the state this move depends on.",
        "effect: >-", "  the state this move produces.",
        "constraints: >-", "  what a correct performance must not do.",
        "failure_modes: >-", "  how it goes wrong when imitated badly.",
        "excerpt: >-", "  the author's account of the movement they observed.",
      ].join("\n") + "\n");
    }
    // THE TWO DECLARED CLAIMS ARE WORDED WELL APART, so the assertion that one
    // is rendered and the other is not cannot pass on a shared substring.
    const CLAIM_A = "claim (strand L1): the hours a harbour keeps are its own and nobody else's.";
    const CLAIM_B = "claim (strand L1): a printed table is a record of measurement rather than a promise about water.";
    writeFileSync(join(xBrief, "brief.md"), [
      "# Brief — lost-claim-fixture", "",
      "*Survey pin:* `product-lab@0000000000000000000000000000000000000000`", "",
      "## Strands", "",
      "### L1 — first-strand", "",
      "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
      "## Thesis", "", "The fixture claim.", "",
      "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
      "## Reader target", "", "The reader can say why the fixture claim is not obvious.", "",
      "## Opening question", "", "What makes the fixture claim worth stating?", "",
      "## Sequence", "",
      "```step", "step_id: x1", "move: open_the_claim", "opens_section: The first heading",
      "purpose: the job x1 does.",
      "reader_state_before: the reader arrives at x1 holding nothing in particular.",
      "reader_state_after: the reader leaves x1 able to say what a table is.",
      "materials: L1",
      "rationale: x1 sits here because the path put it here.",
      CLAIM_A, CLAIM_B, "```", "",
      "```step", "step_id: x2", "move: carry_the_claim", "opens_section: The second heading",
      "purpose: the job x2 does.",
      "reader_state_before: the reader arrives at x2 holding what x1 settled.",
      "reader_state_after: the reader leaves x2 able to say who did the measuring.",
      "materials: L1",
      "rationale: x2 sits here because the path put it here.",
      "claim (strand L1): somebody stood on the quay and wrote a number down.", "```", "",
    ].join("\n"));

    const xdl = (cmd, ...extra) => spawnSync(process.execPath,
      [draftCli, cmd, "--brief", join(xBrief, "brief.md"), "--workspace", xWs, "--moves-dir", xMoves, ...extra],
      { encoding: "utf8" });
    const xProse = {
      x1: "Two harbours keep different hours, and a boat leaving one arrives at the other on a tide nobody planned.",
      x2: "A skipper reading the hours is reading a measurement, and the question worth asking is who was standing there.",
    };
    const xProseFile = (id) => {
      const f = join(xRoot, `prose-${id}.md`);
      writeFileSync(f, xProse[id] + "\n");
      return f;
    };
    let xBuilt = xdl("resolve").status === 0;
    for (const id of ["x1", "x2"]) xBuilt = xdl("section", "--step", id, "--file", xProseFile(id)).status === 0 && xBuilt;
    xBuilt = xdl("emit").status === 0 && xBuilt;
    const xDraft = join(xBrief, "draft.md");
    ok("#1132 AC4: the realization lane produces a Draft whose first Step declares two claims",
      xBuilt && existsSync(xDraft), (xdl("emit").stderr || "").slice(0, 200));

    const xwsBase = join(xRoot, "ws-review");
    const xWsRun = join(xwsBase, "lost-claim-fixture");
    const XD = (...a) => selfRun(
      [self, ...a, "--draft", xDraft, "--workspace", xwsBase,
        "--draft-workspace", xWs, "--moves-dir", xMoves]);
    XD("open");
    for (const id of ["x1", "x2"]) {
      const f = join(xRoot, `rec-${id}.md`);
      writeFileSync(f, [
        "```step", `step_id: ${id}`,
        `purpose: the job ${id} does`,
        `reader_state_before: the reader arrives at ${id} holding what came before`,
        `reader_state_after: the reader leaves ${id} able to say what it settled`,
        `claim the passage of ${id} says what it says, as this reader has it`,
        "```",
      ].join("\n") + "\n");
      XD("outline", "--step", id, "--file", f);
    }
    XD("compare");
    const xJoin = join(xWsRun, "pass-1", "join.json");

    // THE READER RECOVERED A AND NOT B. Exactly one pair of one item fails, so
    // the discrimination below is the renderer's and not the fixture's.
    const LOST_REASON = "no claim this reader wrote carries the second declared claim";
    {
      const rec0 = JSON.parse(readOrEmpty(xJoin) || "{}");
      const owed = rec0.owed || [];
      const vf = join(xRoot, "verdicts.json");
      writeFileSync(vf, JSON.stringify({
        verdicts: owed.map((o) => {
          const lost = o.step_id === "x1" && o.item === "claims" && o.pair === 1;
          return {
            step_id: o.step_id, item: o.item,
            ...(o.pair === null || o.pair === undefined ? {} : { pair: o.pair }),
            verdict: lost ? "fails" : "holds",
            reason: lost ? LOST_REASON : "the reader recovered what the Step declares",
            model: JUDGE_MODEL,
          };
        }),
      }, null, 2) + "\n");
      const xc = XD("compare", "--verdicts", vf);
      ok("#1132 AC4: one declared claim failing sends its Step to correction",
        xc.status === 0 && /Steps sent to correction[^\n]*x1/.test(xc.stdout),
        (xc.stderr || "").slice(0, 200));
    }

    const xr = XD("correct", "--step", "x1");
    const xIn = readOrEmpty(join(xWsRun, "pass-1", "corrections", "x1.md"));
    ok("#1132 AC4: correct renders the input for the Step the lost claim sent it",
      xr.status === 0 && xIn.length > 0, (xr.stderr || "").slice(0, 200));
    const xFailed = xIn.slice(xIn.indexOf("### What failed"));
    const xFailedBlock = xFailed.slice(0, xFailed.indexOf("### What held"));
    const bare = (s) => s.replace(/^claim \(strand L1\): /, "");
    ok("#1132 AC4: `What failed` names the LOST declared claim in its own words",
      xFailedBlock.includes(bare(CLAIM_B)), xFailedBlock.slice(0, 500));
    ok("#1132 AC4: and the Judge's reason for it",
      xFailedBlock.includes(LOST_REASON), xFailedBlock.slice(0, 500));
    ok("#1132 AC4 DISCRIMINATION: and NOT the claim the reader did recover",
      !xFailedBlock.includes(bare(CLAIM_A)), xFailedBlock.slice(0, 500));
    ok("#1132 AC4: the line says the declared claim was not recovered, rather than naming a pair index",
      /the declared `claims` entry `[^`]+` was not recovered/.test(xFailedBlock),
      xFailedBlock.split("\n").filter((l) => /^ {2}- /.test(l)).join(" | "));
  }

  // ---- kogaki#996, carried to kogaki#1132 -------------------------------
  // A STEP WHOSE PROSE FAITHFULLY REALIZES A TWO-CLAIM PACKET, ASSERTING THAT
  // `claims` HOLDS. `CLAIMS.a1` is the two-claim Packet; the claims below are
  // faithful realizations of its two lines in WHOLLY DIFFERENT VOCABULARY,
  // sharing no content word with either.
  //
  // UNDER THE OLD FALLBACK THIS STEP FAILED BY CONSTRUCTION: an unpaired claim
  // was failed by the Harness as `widened` with no model call, so `claims`
  // failed however faithful the prose was. kogaki#996 made the reading the
  // judge's; kogaki#1132 removed the matcher entirely, and this fixture is
  // exactly why — whether a paraphrase recovers a declared claim is an answer in
  // words, and a shared-word count cannot tell one from a loss. Driven on its
  // own Draft: the cases above assert counts over the shared fixture, and a
  // record whose claims read like this would move them.
  {
    const gdir = join(root, "claims996");
    const gPacketDir = join(gdir, "packets");
    mkdirSync(gPacketDir, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(gPacketDir, id);
    const gdraft = buildDraft(gdir, { packetDir: gPacketDir });
    const GWS_BASE = join(root, "gws996");
    const GWS = join(GWS_BASE, "claims996");
    const gdrive = (...a) => selfRun(
      [self, a[0], "--draft", gdraft.path, "--workspace", GWS_BASE, ...a.slice(1)]);

    // No claim below shares a content word with the claim it realizes, and each
    // is a faithful reading of one of them.
    const UNPAIRED = {
      a1: ["no submission is admitted until the tool has already drawn up its blind questionnaire",
        "whoever judges the writing is kept from seeing the brief behind it"],
      a2: ["a sequence the machinery owns cannot be mistaken by whoever sits at it"],
      a3: ["leftover text is sorted by the person in charge and never by the program"],
    };
    // THE READ CLAIMS ARE THE UNPAIRED ONES, and nothing else about the outline
    // is special: `outlineFor` supplies the fields every Step owes so this
    // fixture says only what it is for.
    gdrive("open");
    for (const id of ["a1", "a2", "a3"]) {
      const f = join(gdir, `rec-${id}.md`);
      writeFileSync(f, renderOutline({ ...outlineFor(id), claims: UNPAIRED[id].slice() }));
      gdrive("outline", "--step", id, "--file", f);
    }
    const gled = join(gdir, "led.json");
    writeFileSync(gled, JSON.stringify({ opening_question: "which act renders the input", reader_target: "the harness does" }) + "\n");
    const gclm = join(gdir, "claim.json");
    writeFileSync(gclm, JSON.stringify({ thesis: "the harness owns the ordering" }) + "\n");

    const gc = gdrive("compare");
    ok("#996: the comparison runs over a Draft whose claims pair with no claim", gc.status === 0,
      `status ${gc.status}: ${(gc.stderr || "").split("\n")[0]}`);
    const grec = JSON.parse(readOrEmpty(join(GWS, "pass-1", "join.json")) || "{}");

    // THE PREMISE IS ASSERTED, NOT ONLY STATED (PR #1003 round 1). Every
    // assertion below passes whether or not the outlined claims read like the
    // declared ones, so without this the case would stay green while silently
    // ceasing to exercise the paraphrase it exists for. The old form read the
    // premise off `claims-unused`; with the matcher gone it is asserted
    // DIRECTLY, over the same content words the matcher used to count.
    {
      const shared = UNPAIRED.a1.filter((c) => {
        const cw = new Set(contentWords(c));
        return CLAIMS.a1.some((g) => contentWords(g).some((w) => cw.has(w)));
      });
      ok("#1132 PREMISE: neither claim on a1 shares a content word with any declared claim",
        shared.length === 0, shared.join(" | "));
    }

    ok("#996: no `claims` pair is decided by the Harness",
      !(grec.mechanical || []).some((m) => m.item === "claims"));
    // AND EVERY DECLARED CLAIM IS ASKED ABOUT — #1132 ACCEPTANCE 2. The count is
    // the DECLARED claims', which is the unit the question is now put in: a
    // Step declaring N claims costs N Judge calls for this item.
    ok("#1132 AC2: a Step declaring two claims renders exactly two join Packets for the item",
      (grec.model_calls || []).filter((m) => m.step_id === "a1" && m.item === "claims").length
        === CLAIMS.a1.length);
    ok("#1132 AC2: and one per declared claim on the Steps that declare one",
      ["a2", "a3"].every((s) => (grec.model_calls || [])
        .filter((m) => m.step_id === s && m.item === "claims").length === 1));

    // #1132 ACCEPTANCE 2: the Packet carries THAT declared claim, every claim
    // the reader outlined, the passage, and the one recovery question.
    const gowed = (grec.owed || []).find((o) => o.step_id === "a1" && o.item === "claims" && o.pair === 0);
    const gpk = gowed ? readOrEmpty(gowed.packet) : "";
    ok("#1132 AC2: the Packet is named for its declared claim's index",
      !!gowed && /a1\.claims\.0\.md$/.test(gowed.packet), gowed ? gowed.packet : "(none)");
    ok("#1132 AC2: its declared side carries THAT claim and not the Step's other one",
      gpk.includes(CLAIMS.a1[0]) && !gpk.includes(CLAIMS.a1[1]), gpk.slice(0, 300));
    ok("#1132 AC2: its reverse side carries every claim the reader outlined",
      UNPAIRED.a1.every((c) => gpk.includes(c)));
    ok("#1132 AC2: it quotes the passage, and asks the one recovery question",
      /### The prose itself — draft lines/.test(gpk) && /Is that declared claim among them\?/.test(gpk)
      && /surplus is expected/.test(gpk), gpk.slice(0, 200));

    // THE ACCEPTANCE ITSELF: with the prose judged faithful, the item HOLDS.
    const gv = join(gdir, "verdicts.json");
    writeFileSync(gv, JSON.stringify({
      verdicts: (grec.owed || []).map((o) => ({
        step_id: o.step_id, item: o.item,
        ...(o.pair === null || o.pair === undefined ? {} : { pair: o.pair }),
        // ONE BEST-EFFORT FAIL, so the record below has a finding to compose a
        // pointer for. It is `purpose` rather than `claims`: a preserved fail
        // withholds `close`, and the acceptance this fixture exists for is that
        // `claims` HOLDS here.
        ...(o.step_id === "a1" && o.item === "purpose"
          ? { verdict: "fails", reason: "the passage is doing a different job from the declared one" }
          : { verdict: "holds", reason: "the reader recovered the claim the Step declares" }),
        model: JUDGE_MODEL,
      })),
    }, null, 2) + "\n");
    const gc2 = gdrive("compare", "--verdicts", gv);
    ok("#996: the filled join completes", gc2.status === 0,
      `status ${gc2.status}: ${(gc2.stderr || "").split("\n")[0]}`);
    const grec2 = JSON.parse(readOrEmpty(join(GWS, "pass-1", "join.json")) || "{}");
    const grow = (grec2.results || []).find((r) => r.step_id === "a1" && r.item === "claims");
    ok("#996 ACCEPTANCE: `claims` HOLDS on a Step that faithfully realizes a two-claim Packet",
      !!grow && grow.verdict === "holds", grow ? `verdict ${grow.verdict}` : "no claims row");
    ok("#996: and every one of its pairs was decided by the model",
      !!grow && (grow.pairs || []).every((x) => x.judged === true));

    // #1132 ACCEPTANCE 1: the table carries ONE `claims` row, class `preserved`,
    // and the three rows the ruling removed are UNKNOWN rather than merely
    // unlisted — asserted at the surface a caller meets, the way kogaki#1098
    // asserted it for `register-tests`: a recorded verdict naming one is refused
    // as a pair the run never asked about.
    const gitems = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    ok("#1132 AC1: exactly one `claims` row, class preserved, judged per declared claim",
      gitems.items.filter((i) => i.id === "claims").length === 1
      && gitems.items.find((i) => i.id === "claims").class === "preserved"
      && gitems.items.find((i) => i.id === "claims").mode === "per-declared");
    ok("#1132 AC1: and no row keeps the matcher's own keys",
      gitems.items.every((i) => !("unpaired" in i) && !("pair_text_key" in i))
      && !("outlined_claim_containment" in gitems.thresholds)
      && !gitems.modes.includes("paired"));
    for (const gone of ["claims-unused", "concessions", "section-continues"]) {
      ok(`#1132 AC1: the Round Trip table carries no \`${gone}\` row`,
        !gitems.items.some((i) => i.id === gone));
      ok(`#1132 AC1: and the run records no row, no Packet and no comparison line for \`${gone}\``,
        !(grec.model_calls || []).some((c) => c.item === gone)
        && !(grec.results || []).some((x) => x.item === gone)
        && !(grec.mechanical || []).some((m) => m.item === gone));
      const gf = join(gdir, `verdicts-${gone}.json`);
      writeFileSync(gf, JSON.stringify({ verdicts: [{ step_id: "a1", item: gone,
        verdict: "holds", reason: "it reads fine", model: JUDGE_MODEL }] }) + "\n");
      const gr = gdrive("compare", "--verdicts", gf);
      ok(`#1132 AC1: and a verdict naming \`${gone}\` is refused as a pair nobody asked about`,
        gr.status === 1 && /which this run did not ask about/.test(gr.stderr),
        (gr.stderr || "").split("\n")[0]);
    }
    ok("#1132 AC1: `section_placement` leaves `packet_blocks` with its one reader",
      !Object.prototype.hasOwnProperty.call(gitems.packet_blocks, "section_placement"));

    // THE OWNER RECORD'S POINTERS (PR #1004 successor, #1006), AND THE ARM THIS
    // FIXTURE CAN NO LONGER EXPRESS.
    //
    // #1006's defect was the "none" arm: a finding the HARNESS decided must
    // render no Packet pointer and name the join record instead, because no
    // Packet was rendered for it. This fixture used to build one out of
    // `a1/claims-unused`, a mechanical row that failed by construction.
    //
    // NO ROW IN THE SHIPPED TABLE CAN BUILD ONE ANY MORE, and that is worth
    // writing down rather than discovering. Every Harness-decided row on a
    // prose Step is now a `when_declared_absent` arm, and every such arm
    // answers `holds` — so it is never a finding. The one mechanical row left
    // is the figure's element-to-claim row, which is PRESERVED, so a run that
    // fails it is withheld from `close` altogether. The else branch in
    // `findingEvidencePaths` is live code with no current specimen.
    //
    // WHAT IS ASSERTED INSTEAD IS THE INVARIANT ITSELF, over every finding the
    // record renders rather than over one built row: a Packet pointer is
    // composed exactly where the chosen pair was judged. That holds whether or
    // not a Harness-decided finding exists, and it fires the moment one does.
    // `close` is reachable here: the only fail is best-effort, and nothing was
    // corrected.
    {
      const gcl = gdrive("close");
      const grv = readOrEmpty(join(gdir, "review.md"));
      ok("#1006: close writes the owner record over the run",
        gcl.status === 0 && grv.length > 0, `status ${gcl.status}: ${(gcl.stderr || "").split("\n")[0]}`);
      const grun = JSON.parse(readOrEmpty(join(GWS, "run.json")) || "{}");
      const gfind = [...(grun.findings || []), ...(grun.residue || [])];
      const gnone = (grv.match(/^ {2}- the pair the judge saw: none — /gm) || []).length;
      ok("#1006: a Packet pointer is composed exactly where the chosen pair was judged",
        gnone === gfind.filter((f) => !chosenJudged(f)).length,
        `none-lines ${gnone}, harness-decided findings ${gfind.filter((f) => !chosenJudged(f)).length}`);
      const gptrs = [...grv.matchAll(/^ {2}- (?:Reverse Outline|the pair the judge saw): `([^`]+)`/gm)].map((m) => m[1]);
      ok("#1006: and every pointer the record composes resolves",
        gptrs.length > 0 && gptrs.every((f) => existsSync(resolve(process.cwd(), f))),
        gptrs.filter((f) => !existsSync(resolve(process.cwd(), f))).join(", "));
    }
  }

  // ---- kogaki#1135 ------------------------------------------------------
  // A CORRECTION THAT BREAKS WHAT HELD IS UNDONE, AND THE TWO PASSES ARE LAID
  // SIDE BY SIDE.
  //
  // WHAT WAS OBSERVED, in the first full review run: a corrected Step failed in
  // pass two an item it had HELD in pass one, and the Harness recorded that as
  // residue — indistinguishable from an item that failed in both passes — while
  // leaving the regressed prose in the article. The run's product was an article
  // the review had made worse on a dimension the review itself measured.
  //
  // ITS OWN BRIEF, for the reason the #880, #945 and #1132 drives state about
  // theirs: the correction drive above turns on which preserved item fails on
  // which Step, and a regression added to it would move cases that measure
  // something else. This one is built for one arrangement — c1 regresses and
  // c2's correction holds — because that is what acceptance 2 names, and it is
  // also what produces one row of every outcome word for acceptance 3.
  {
    const draftCli = join(dirname(self), "draft.mjs");
    const gRoot = join(root, "regression");
    const gBrief = join(gRoot, "theses", "regression-fixture");
    const gMoves = join(gRoot, "moves");
    const gWs = join(gRoot, "ws-draft");
    mkdirSync(gBrief, { recursive: true });
    mkdirSync(gMoves, { recursive: true });
    writeFileSync(join(gMoves, "plain_move.md"), [
      "id: plain_move", "status: observed",
      "intent: >-", "  carry the claim one step further.",
      "requires: >-", "  the reader holds what the previous passage settled.",
      "effect: >-", "  the reader holds one more consequence.",
      "constraints: >-", "  never re-open what the earlier passage settled.",
      "failure_modes: >-", "  restating the previous passage in new words.",
      "excerpt: >-", "  the author's account of the movement they observed.",
    ].join("\n") + "\n");
    // c1 INTRODUCES A TERM, for the reason the correction drive's Brief does:
    // `already-knows` is the successor arm's one item and carries a
    // `when_declared_absent` arm, so a Brief introducing nothing would leave
    // every `already knows` list empty, the Harness would decide all three rows
    // with no model call, and the `carried` outcome this fixture asserts would
    // have no judged pair to ride on.
    writeFileSync(join(gBrief, "brief.md"), [
      "# Brief — regression-fixture", "",
      "*Survey pin:* `product-lab@0000000000000000000000000000000000000000`", "",
      "## Strands", "",
      "### L1 — first-strand", "",
      "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
      "## Thesis", "", "The fixture claim.", "",
      "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
      "## Reader target", "", "The reader can say why the fixture claim is not obvious.", "",
      "## Opening question", "", "What makes the fixture claim worth stating?", "",
      "## Sequence", "",
      "```step", "step_id: c1", "move: plain_move", "opens_section: The only heading",
      "purpose: the job c1 does.",
      "reader_state_before: the reader arrives at c1 holding nothing in particular.",
      "reader_state_after: the reader leaves c1 able to say what separates the two harbours.",
      "materials: L1",
      "introduces: harbour",
      "rationale: c1 sits here because the path put it here.",
      "claim (strand L1): the first harbour keeps its own hours.",
      "```", "",
      "```step", "step_id: c2", "move: plain_move",
      "purpose: the job c2 does.",
      "reader_state_before: the reader arrives at c2 holding what c1 settled.",
      "reader_state_after: the reader leaves c2 able to say who did the measuring.",
      "materials: L1",
      "rationale: c2 sits here because the path put it here.",
      "claim (strand L1): a table records what somebody measured on days somebody chose.",
      "```", "",
      "```step", "step_id: c3", "move: plain_move",
      "purpose: the job c3 does.",
      "reader_state_before: the reader arrives at c3 holding what c2 settled.",
      "reader_state_after: the reader leaves c3 able to say what the measurement is worth.",
      "materials: L1",
      "rationale: c3 sits here because the path put it here.",
      "claim (strand L1): a skipper reading the table is reading a person's chosen days.",
      "```", "",
    ].join("\n"));

    const gdl = (cmd, ...extra) => spawnSync(process.execPath,
      [draftCli, cmd, "--brief", join(gBrief, "brief.md"), "--workspace", gWs, "--moves-dir", gMoves, ...extra],
      { encoding: "utf8" });
    const gFile = (name, text) => { const f = join(gRoot, name); writeFileSync(f, text + "\n"); return f; };
    const ORIGINAL = {
      c1: "One harbour keeps its own hours and the next keeps others, and the water they are both read against is the same water.",
      c2: "The hours are written down each spring, and the writing is what makes them argue rather than what settles them.",
      c3: "A skipper reading either set of hours is reading a measurement, and the question worth asking is who was standing there.",
    };
    let gBuilt = gdl("resolve").status === 0;
    for (const id of ["c1", "c2", "c3"]) {
      gBuilt = gBuilt && gdl("section", "--step", id, "--file", gFile(`g-${id}.md`, ORIGINAL[id])).status === 0;
    }
    gBuilt = gBuilt && gdl("emit").status === 0;
    const gDraft = join(gBrief, "draft.md");
    ok("#1135: the realization lane produces a real Draft for the regression drive",
      gBuilt && existsSync(gDraft));

    const gwsBase = join(gRoot, "ws-review");
    const gWsRun = join(gwsBase, "regression-fixture");
    const GD = (...a) => selfRun(
      [self, ...a, "--draft", gDraft, "--workspace", gwsBase,
        "--draft-workspace", gWs, "--moves-dir", gMoves]);
    const gRec = (id, tag) => {
      const f = join(gRoot, `rec-${tag}-${id}.md`);
      writeFileSync(f, [
        "```step", `step_id: ${id}`,
        `purpose: the job ${id} does`,
        `reader_state_before: the reader arrives at ${id} holding what came before`,
        `reader_state_after: the reader leaves ${id} able to say what it settled`,
        `claim the material supports what ${id} asserts, as the passage has it`,
        "```",
      ].join("\n") + "\n");
      return f;
    };
    // Answer every pair the record says was asked, failing exactly the named
    // (Step, item)s. Driven off the record's OWN list rather than a transcribed
    // one, for the reason `answerOwed` gives: a transcript would pass while the
    // Harness asked about something else.
    const gAnswer = (recordPath, tag, failKeys, from = "owed") => {
      const rec0 = existsSync(recordPath) ? JSON.parse(readFileSync(recordPath, "utf8")) : {};
      const asked = from === "owed" ? (rec0.owed || []) : (rec0.model_calls || []);
      const f = join(gRoot, `verdicts-${tag}.json`);
      writeFileSync(f, JSON.stringify({
        verdicts: asked.map((o) => {
          const failing = failKeys.includes(`${o.step_id}/${o.item}`);
          return {
            step_id: o.step_id, item: o.item,
            ...(o.pair === null || o.pair === undefined ? {} : { pair: o.pair }),
            verdict: failing ? "fails" : "holds",
            reason: failing
              ? "the outlined reader would not be the declared one"
              : "the declared line and the outlined one agree",
            model: JUDGE_MODEL,
          };
        }),
      }, null, 2) + "\n");
      return f;
    };

    GD("open");
    for (const id of ["c1", "c2", "c3"]) GD("outline", "--step", id, "--file", gRec(id, "p1"));
    GD("compare");
    const gJoin = join(gWsRun, "pass-1", "join.json");
    // PASS ONE: c1 fails one preserved item, c2 fails two. Both go to
    // correction; c3 is corrected by nothing and is c2's successor.
    const gP1 = GD("compare", "--verdicts", gAnswer(gJoin, "p1",
      ["c1/reader-state-after", "c2/reader-state-before", "c2/claims"]));
    ok("#1135: pass one sends both failing Steps to correction",
      gP1.status === 0 && /Steps sent to correction[^\n]*c1, c2/.test(gP1.stdout),
      (gP1.stderr || "").slice(0, 200));

    const CORRECTED = {
      c1: "One harbour keeps hours of its own and the next keeps hours of its own, and the tide beneath them is one tide.\n\nThat is what the reader is asked to hold, and holding it is the whole of what this passage is for.",
      c2: "The hours are set down each spring by a person, and a skipper who trusts the setting-down has trusted that person rather than the water.",
    };
    GD("correct", "--step", "c1");
    const gC1 = GD("correct", "--step", "c1", "--file", gFile("g-c1-corrected.md", CORRECTED.c1));
    GD("correct", "--step", "c2");
    const gC2 = GD("correct", "--step", "c2", "--file", gFile("g-c2-corrected.md", CORRECTED.c2));
    ok("#1135: both corrections record through the realization lane",
      gC1.status === 0 && gC2.status === 0,
      `${(gC1.stderr || "").slice(0, 120)} | ${(gC2.stderr || "").slice(0, 120)}`);
    ok("#1135: and the corrected prose is what the article carries going into pass two",
      readOrEmpty(gDraft).includes(CORRECTED.c1) && readOrEmpty(gDraft).includes(CORRECTED.c2)
      && !readOrEmpty(gDraft).includes(ORIGINAL.c1));

    GD("check");
    for (const id of ["c1", "c2"]) GD("outline", "--step", id, "--file", gRec(id, "p2"));
    const gCheckPath = join(gWsRun, "pass-2", "check.json");
    GD("check");
    // PASS TWO. c1 FAILS `reader-state-before`, which it HELD in pass one — the
    // regression. c2's own failed `reader-state-before` now holds and its
    // `claims` still fails, so c2 carries a `fixed` and a `still-failing` and is
    // not restored.
    const gP2 = GD("check", "--verdicts", gAnswer(gCheckPath, "p2",
      ["c1/reader-state-before", "c2/claims"]));
    ok("#1135 AC1: `check` completes over the regressed pass and does not refuse it",
      gP2.status === 0, `status ${gP2.status}: ${(gP2.stderr || "").split("\n")[0]}`);

    // --- ACCEPTANCE 1: the Step is restored, the restore is recorded, and the
    //     correction's own failed item is residue.
    ok("#1135 AC1: the regressed Step is RESTORED to the prose it carried in pass one",
      readOrEmpty(gDraft).includes(ORIGINAL.c1) && !readOrEmpty(gDraft).includes(CORRECTED.c1),
      readOrEmpty(gDraft).includes(CORRECTED.c1) ? "the corrected prose is still there" : "c1's pass-one prose is absent");
    ok("#1135 AC1: and `check` says so, naming the Step and what it held then failed",
      /RESTORED — pass two failed an item these Steps had HELD/.test(gP2.stdout)
      && /c1 {2}held then failed: reader-state-before/.test(gP2.stdout),
      gP2.stdout.split("\n").filter((l) => /RESTORED|held then failed/.test(l)).join(" | ") || "(no line)");
    const gRun = JSON.parse(readOrEmpty(join(gWsRun, "run.json")) || "{}");
    ok("#1135 AC1: the restore is recorded in run.json, on the Step it undid",
      (gRun.restores || []).length === 1 && gRun.restores[0].step_id === "c1"
      && (gRun.restores[0].regressed || []).some((x) => x.item === "reader-state-before"
        && x.pass_1 === "holds" && x.pass_2 === "fails"),
      JSON.stringify((gRun.restores || []).map((r) => r.step_id)));
    ok("#1135 AC1: with a snapshot pair of its own, before and after",
      (gRun.restores || []).length === 1
      && existsSync(gRun.restores[0].snapshot_before) && existsSync(gRun.restores[0].snapshot_after)
      && readOrEmpty(gRun.restores[0].snapshot_before).includes(CORRECTED.c1)
      && readOrEmpty(gRun.restores[0].snapshot_after).includes(ORIGINAL.c1));
    ok("#1135 AC1: the correction's own failed item is residue again, as still failing",
      (gRun.residue || []).some((r) => r.step_id === "c1" && r.item === "reader-state-after"),
      (gRun.residue || []).map((r) => `${r.step_id}/${r.item}`).join(", ") || "(empty)");
    ok("#1135 AC1: and its line says the correction made for it was UNDONE",
      (gRun.residue || []).some((r) => r.step_id === "c1" && r.item === "reader-state-after"
        && /UNDONE/.test(r.why) && /restored to its pass-one prose/.test(r.why)),
      ((gRun.residue || []).find((r) => r.step_id === "c1") || {}).why || "(no line)");
    // DISCRIMINATION: a residue line on a Step that was NOT restored still reads
    // as it always did. Without this the case above would pass on a run that
    // wrote the restore sentence onto every residue line.
    ok("#1135 AC1 DISCRIMINATION: a residue line on an unrestored Step reads unchanged",
      (gRun.residue || []).some((r) => r.step_id === "c2" && r.item === "claims"
        && /still failing after pass two/.test(r.why) && !/UNDONE/.test(r.why)),
      ((gRun.residue || []).find((r) => r.step_id === "c2") || {}).why || "(no line)");
    // AND PASS ONE'S READING CAME BACK WITH THE PROSE. The rows for a restored
    // Step carry pass one's verdicts, because the prose they were given on is
    // the prose the Draft carries again — a pass-two verdict left standing
    // beside restored prose would be a recorded reading about text that is gone,
    // which is the defect this whole Harness is about.
    {
      const gChk = JSON.parse(readOrEmpty(gCheckPath) || "{}");
      const rowOf = (s, i) => (gChk.results || []).find((r) => r.step_id === s && r.item === i);
      ok("#1135 AC1: a restored Step's rows carry pass one's verdict and say they are restored",
        rowOf("c1", "reader-state-before")?.verdict === "holds"
        && rowOf("c1", "reader-state-before")?.restored === true
        && rowOf("c1", "reader-state-after")?.verdict === "fails",
        JSON.stringify((gChk.results || []).filter((r) => r.step_id === "c1")
          .map((r) => `${r.item}:${r.verdict}`)));
      ok("#1135 AC1: and the pass's own record names the restore",
        (gChk.restores || []).length === 1 && gChk.restores[0].step_id === "c1");
    }

    // --- ACCEPTANCE 2: restoring a Step touches no other Step --------------
    ok("#1135 AC2: the later corrected Step keeps its corrected prose",
      readOrEmpty(gDraft).includes(CORRECTED.c2) && !readOrEmpty(gDraft).includes(ORIGINAL.c2));
    ok("#1135 AC2: and carries no continuity mark — no restore record, no marked row",
      !(gRun.restores || []).some((r) => r.step_id === "c2")
      && !(JSON.parse(readOrEmpty(gCheckPath) || "{}").results || [])
        .some((r) => r.step_id !== "c1" && r.restored));
    ok("#1135 AC2: and the Step neither corrected nor restored is untouched too",
      readOrEmpty(gDraft).includes(ORIGINAL.c3));

    // --- ACCEPTANCE 3: `passes.json`, one row per outcome word -------------
    const gPasses = JSON.parse(readOrEmpty(join(gWsRun, "passes.json")) || "{}");
    ok("#1135 AC3: `passes.json` is written at the RUN ROOT, beside run.json",
      existsSync(join(gWsRun, "passes.json"))
      && !existsSync(join(gWsRun, "pass-2", "passes.json")));
    ok("#1135 AC3: every row is keyed by Step, item and pair and carries both passes",
      (gPasses.rows || []).length > 0
      && gPasses.rows.every((r) => typeof r.step_id === "string" && typeof r.item === "string"
        && "pair" in r && "pass_1" in r && "pass_2" in r && "outcome" in r),
      `${(gPasses.rows || []).length} row(s)`);
    // THE ACCEPTANCE ITSELF: one row per outcome word, on this fixture. Each
    // word is asserted with the pair it is true of, not merely counted — a
    // count alone would pass on five rows all labelled the same way if the
    // labelling were wrong in a compensating direction.
    const gRow = (s, i) => (gPasses.rows || []).find((r) => r.step_id === s && r.item === i);
    for (const w of ["held", "fixed", "still-failing", "regressed", "carried"]) {
      ok(`#1135 AC3: at least one row carries the outcome \`${w}\``,
        (gPasses.rows || []).some((r) => r.outcome === w),
        JSON.stringify(gPasses.outcomes || {}));
    }
    ok("#1135 AC3: `regressed` is the pair that held in pass one and failed in pass two",
      gRow("c1", "reader-state-before")?.outcome === "regressed"
      && gRow("c1", "reader-state-before")?.pass_1 === "holds"
      && gRow("c1", "reader-state-before")?.pass_2 === "fails",
      JSON.stringify(gRow("c1", "reader-state-before") || null));
    ok("#1135 AC3: and the restore does not erase it — pass_2 is the answer pass two gave",
      gRow("c1", "reader-state-before")?.pass_2 === "fails");
    ok("#1135 AC3: `fixed` is the pair that failed in pass one and holds in pass two",
      gRow("c2", "reader-state-before")?.outcome === "fixed",
      JSON.stringify(gRow("c2", "reader-state-before") || null));
    ok("#1135 AC3: `still-failing` is the pair that failed in both",
      gRow("c2", "claims")?.outcome === "still-failing",
      JSON.stringify(gRow("c2", "claims") || null));
    ok("#1135 AC3: `held` is a re-judged pair that held in both",
      gRow("c2", "reader-state-after")?.outcome === "held",
      JSON.stringify(gRow("c2", "reader-state-after") || null));
    ok("#1135 AC3: `carried` is a pair pass two never re-judged, and its pass_2 is empty",
      gRow("c3", "reader-state-after")?.outcome === "carried"
      && gRow("c3", "reader-state-after")?.pass_2 === null,
      JSON.stringify(gRow("c3", "reader-state-after") || null));
    ok("#1135 AC3: and the counts render the same reading as the rows",
      ["held", "fixed", "still-failing", "regressed", "carried"]
        .every((w) => (gPasses.outcomes || {})[w] === gPasses.rows.filter((r) => r.outcome === w).length),
      JSON.stringify(gPasses.outcomes || {}));
    ok("#1135 AC3: and no pair of pass two is missing from pass one's index",
      Array.isArray(gPasses.pass_two_only) && gPasses.pass_two_only.length === 0,
      (gPasses.pass_two_only || []).join(", "));

    // --- ACCEPTANCE 4: the owner record names the restore and passes.json ---
    const gCl = GD("close");
    const gRev = readOrEmpty(join(gBrief, "review.md"));
    ok("#1135 AC4: close writes the owner record over a run that restored",
      gCl.status === 0 && gRev.length > 0, (gCl.stderr || "").split("\n")[0]);
    ok("#1135 AC4: and records the restore UNDER the Step it undid",
      /- \*\*c1\*\* \(pass 1\)[^]*?- \*\*RESTORED in pass two\.\*\*/.test(gRev),
      (gRev.split("\n").filter((l) => /RESTORED/.test(l)).join(" | ") || "(no line)"));
    ok("#1135 AC4: naming the item that held then failed, with the reason",
      /held in pass one, failed in pass two: /.test(gRev));
    ok("#1135 AC4 DISCRIMINATION: and writes no such line under the Step that was not restored",
      !/- \*\*c2\*\*[^]*?RESTORED in pass two/.test(gRev.slice(gRev.indexOf("## Corrections"),
        gRev.indexOf("## Residue"))));
    ok("#1135 AC4: the layout legend names `passes.json` and what its rows carry",
      /\*\*Both passes\.\*\* `[^`]*passes\.json`/.test(gRev)
      && /held, fixed, still-failing, regressed, carried/.test(gRev),
      (gRev.split("\n").find((l) => /passes\.json/.test(l)) || "(no line)"));
    ok("#1135 AC4: and the reviewed Draft's line says which corrections pass two undid",
      /less the one undone by pass two \(c1\)|less the 1 undone by pass two \(c1\)/.test(gRev),
      (gRev.split("\n").find((l) => /Reviewed Draft/.test(l)) || "(no line)"));
    ok("#1135 AC4: every pointer the record composes still resolves over a restored run",
      (() => {
        const p = [...gRev.matchAll(/^ {2,4}- (?:Reverse Outline|the pair the judge saw|before|after): `([^`]+)`/gm)]
          .map((m) => m[1]);
        return p.length > 0 && p.every((f) => existsSync(resolve(dirname(join(gBrief, "review.md")), f)));
      })());

    // THE HARNESS'S OWN USAGE NAMES IT (acceptance 4's other half). The skill's
    // half is asserted in checks/check-review-draft-runtime.sh, where the
    // skill's other text-level properties already are: this pass reads nothing
    // of this repository outside `src/`, and a fixture reaching up the tree for
    // `.claude/` would be the first read that does.
    {
      const gu = selfRun([self]);
      ok("#1135 AC4: the Harness's usage names `passes.json` and the regression refusal",
        /passes\.json/.test(gu.stdout) && /REFUSES A REGRESSION/.test(gu.stdout));
    }
  }

  // ---------------------------------------------------------------------
  // kogaki#1160: the correction lane threads `--lang`, so a correction on a
  // Japanese Draft stays inside the Japanese track.
  //
  // ACCEPTANCE 4 FIRST, AND IT NEEDS NO SUBPROCESS AT ALL — the Removal Test.
  // `draftLane` derives the language it passes through from `readDraft`'s own
  // `lang` field, so the defect and its fix both live entirely in that one
  // read; a case that drove the whole correction lane to exercise it would be
  // asserting a pure line-scan through a spawn.
  {
    const uDir = join(root, "lang-unit");
    mkdirSync(uDir, { recursive: true });
    const fm = (extra) => [
      "---", "brief: brief.md", "brief_pin: sha256:0000", ...extra, "trace:",
      `  - {"step_id":"u1","lines":[99,99],"packet":"packet.md","packet_sha":"${sha256("x")}"}`,
      "---", "", "x", "",
    ].join("\n");
    const jaPath = join(uDir, "draft.ja.md");
    writeFileSync(jaPath, fm(["lang: ja", "terms_sha_at_generation: 0000"]));
    const enPath = join(uDir, "draft.md");
    writeFileSync(enPath, fm([]));
    ok("#1160 Removal Test: readDraft reads `lang: ja` off a Japanese Draft's frontmatter",
      readDraft(jaPath).lang === "ja");
    ok("#1160 Removal Test: and a Draft with no `lang:` field is treated as English",
      readDraft(enPath).lang === "en");
  }

  // ACCEPTANCE 1-3: a real correction, driven through the real realization
  // lane exactly as `draftLane` reaches it (SPAWNED, never imported — the
  // same closed-input reason the English correction fixture above is
  // spawned), on a Japanese Draft built the same way `/draft --lang ja`
  // builds one. NO MODEL IS INVOKED on the compare side either — the
  // Reverse Outline record below is written to match the Packet's own
  // (Brief-authored, English) declared fields directly, the same convention
  // the English correction fixture uses, because the Round Trip's join
  // compares the Packet's declared fields against a reverse-outlined record
  // and never reads the realized prose to build either side of that pair.
  {
    const draftCli = join(dirname(self), "draft.mjs");
    const lintCli = join(dirname(self), "lint-ja.mjs");
    const lRoot = join(root, "lang-correction");
    const lBrief = join(lRoot, "theses", "lang-fixture");
    const lMoves = join(lRoot, "moves");
    const lWs = join(lRoot, "ws-draft");
    // `draft.mjs` JOINS THE SLUG ONTO THE `--workspace` BASE ITSELF
    // (`workspaceFor`), so the run's real workspace is one level under `lWs`.
    const dws = join(lWs, "lang-fixture");
    mkdirSync(lBrief, { recursive: true });
    mkdirSync(lMoves, { recursive: true });
    for (const id of ["open_the_claim", "carry_the_claim"]) {
      writeFileSync(join(lMoves, `${id}.md`), [
        `id: ${id}`, "status: observed",
        "intent: >-", `  what ${id} does to the reader.`,
        "requires: >-", "  the state this move depends on.",
        "effect: >-", "  the state this move produces.",
        "constraints: >-", "  what a correct performance must not do.",
        "failure_modes: >-", "  how it goes wrong when imitated badly.",
        "excerpt: >-", "  the author's account of the movement they observed.",
      ].join("\n") + "\n");
    }
    const STEPS = [
      { id: "l1", move: "open_the_claim", opens: "はじめに" },
      { id: "l2", move: "carry_the_claim", opens: null },
    ];
    const briefText = [
      "# Brief — lang-fixture", "",
      "*Survey pin:* `product-lab@0000000000000000000000000000000000000000`", "",
      "## Strands", "",
      "### L1 — first-strand", "",
      "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
      "## Thesis", "", "The fixture claim.", "",
      "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
      "## Reader target", "", "The reader can say why the fixture claim is not obvious.", "",
      "## Opening question", "", "What makes the fixture claim worth stating?", "",
      "## Sequence", "",
      ...STEPS.flatMap((s) => ["```step", `step_id: ${s.id}`, `move: ${s.move}`,
        ...(s.opens ? [`opens_section: ${s.opens}`] : []),
        `purpose: the job ${s.id} does.`,
        `reader_state_before: the reader arrives at ${s.id} holding what came before.`,
        `reader_state_after: the reader leaves ${s.id} able to say what it settled.`,
        "materials: L1",
        `rationale: ${s.id} sits here because the path put it here.`,
        `claim (strand L1): the material supports what ${s.id} asserts.`, "```", ""]),
    ].join("\n");
    writeFileSync(join(lBrief, "brief.md"), briefText);
    // THE FLUENCY NOTES (acceptance item 2): present before any Japanese
    // Packet is rendered, so both the first render and the correction's
    // fresh re-render pick it up the same way.
    writeFileSync(join(lBrief, "fluency-notes.md"),
      "常体で統一し、体言止めは避ける。読み手に語りかける調子にしない。\n");

    const dl = (lang, cmd, ...extra) => spawnSync(process.execPath,
      [draftCli, cmd, "--brief", join(lBrief, "brief.md"), "--workspace", lWs,
        "--moves-dir", lMoves, ...(lang ? ["--lang", lang] : []), ...extra],
      { encoding: "utf8" });
    const proseFile = (tag, id, text) => {
      const f = join(lRoot, `prose-${tag}-${id}.md`);
      writeFileSync(f, text + "\n");
      return f;
    };

    // The English track, built first — this run's own "before" snapshot.
    const EN = {
      l1: "The tide keeps its own hours, and a boat that ignores them arrives on the wrong one.",
      l2: "So the table on the harbour wall is a record of what someone measured, not a promise.",
    };
    let built = dl(null, "resolve").status === 0;
    for (const s of STEPS) built = dl(null, "section", "--step", s.id, "--file", proseFile("en", s.id, EN[s.id])).status === 0 && built;
    built = dl(null, "emit").status === 0 && built;
    const enDraftPath = join(lBrief, "draft.md");
    ok("#1160: the English track builds first, from the same Brief the Japanese track will realize",
      built && existsSync(enDraftPath));
    const enBefore = {
      draft: readOrEmpty(enDraftPath),
      packets: Object.fromEntries(STEPS.map((s) => [s.id, readOrEmpty(join(dws, "packets", `${s.id}.md`))])),
      sections: Object.fromEntries(STEPS.map((s) => [s.id, readOrEmpty(join(dws, "sections", `${s.id}.md`))])),
    };

    // The Japanese track, over the SAME Brief and the SAME draft.mjs
    // workspace — `packetsDir`/`sectionsDir`'s own `ja` subdirectory is what
    // is supposed to keep the two tracks apart.
    const JA = {
      l1: "潮には潮自身の時刻があり、それを無視した船は違う時刻に着く。",
      l2: "だから岸壁の表は誰かが測った記録であり、約束ではない。",
    };
    let builtJa = dl("ja", "resolve").status === 0;
    for (const s of STEPS) builtJa = dl("ja", "section", "--step", s.id, "--file", proseFile("ja", s.id, JA[s.id])).status === 0 && builtJa;
    builtJa = dl("ja", "emit").status === 0 && builtJa;
    const jaDraftPath = join(lBrief, "draft.ja.md");
    ok("#1160: the Japanese track realizes to `draft.ja.md`, sibling to (never over) `draft.md`",
      builtJa && existsSync(jaDraftPath) && readOrEmpty(enDraftPath) === enBefore.draft);

    const lintR = spawnSync(process.execPath, [lintCli, "lint", "--draft", jaDraftPath], { encoding: "utf8" });
    ok("#1160: the fixture's Japanese Draft passes Lint clean, so ReviewDraft's precondition is met",
      lintR.status === 0, (lintR.stderr || lintR.stdout || "").trim());

    const lwsBase = join(lRoot, "ws-review");
    const lWsRun = join(lwsBase, "lang-fixture");
    const RD = (...a) => selfRun(
      [self, ...a, "--draft", jaDraftPath, "--workspace", lwsBase,
        "--draft-workspace", lWs, "--moves-dir", lMoves]);
    const recFor = (id) => {
      const f = join(lRoot, `rec-${id}.md`);
      writeFileSync(f, [
        "```step",
        `step_id: ${id}`,
        `purpose: the job ${id} does`,
        `reader_state_before: the reader arrives at ${id} holding what came before`,
        `reader_state_after: the reader leaves ${id} able to say what it settled`,
        `claim the material supports what ${id} asserts, as the passage has it`,
        "```",
      ].join("\n") + "\n");
      return f;
    };
    const answer = (recordPath, failKeys) => {
      const rec0 = existsSync(recordPath) ? JSON.parse(readFileSync(recordPath, "utf8")) : {};
      const owed = rec0.owed || [];
      const f = join(lRoot, "verdicts.json");
      writeFileSync(f, JSON.stringify({
        verdicts: owed.map((o) => {
          const failing = failKeys.includes(`${o.step_id}/${o.item}`);
          return {
            step_id: o.step_id, item: o.item,
            ...(o.pair === null ? {} : { pair: o.pair }),
            verdict: failing ? "fails" : "holds",
            reason: failing
              ? "the outlined reader would not be the declared one"
              : "the declared line and the outlined one agree",
            model: JUDGE_MODEL,
          };
        }),
      }, null, 2) + "\n");
      return f;
    };

    const rOpen = RD("open");
    ok("#1160: `open` accepts the Japanese Draft — Lint already ran and its `terms_sha_at_lint` is current",
      rOpen.status === 0, (rOpen.stderr || "").split("\n")[0]);
    for (const s of STEPS) RD("outline", "--step", s.id, "--file", recFor(s.id));
    RD("compare");
    const joinPath = join(lWsRun, "pass-1", "join.json");
    const p1 = RD("compare", "--verdicts", answer(joinPath, ["l1/reader-state-after"]));
    ok("#1160: pass one sends the Japanese Draft's failing Step to correction",
      p1.status === 0 && /Steps sent to correction[^\n]*l1/.test(p1.stdout), p1.stdout);

    // --- ACCEPTANCE 2: the fresh Packet carries the language block and the
    //     fluency notes, on the correction path exactly as at generation.
    const rA = RD("correct", "--step", "l1");
    const inputPath = join(lWsRun, "pass-1", "corrections", "l1.md");
    ok("#1160 AC2: correct's phase A renders a correction input for the Japanese Step",
      rA.status === 0 && existsSync(inputPath), (rA.stderr || "").split("\n")[0]);
    const inA = readOrEmpty(inputPath);
    ok("#1160 AC2: the fresh Packet in the correction input carries the language block",
      /## Language block \(lang: ja\)/.test(inA));
    ok("#1160 AC2: and the fluency notes, read in exactly as at generation",
      /Fluency notes \(read-only reference/.test(inA) && inA.includes("体言止めは避ける"));

    // --- ACCEPTANCE 1: phase B writes only the Japanese track. The English
    //     Packets, Sections and Draft this run built first are untouched.
    const rB = RD("correct", "--step", "l1", "--file", proseFile("ja-corrected", "l1",
      "潮の時刻は港ごとに違い、それを見誤った船だけが違う時刻に着く。"));
    ok("#1160 AC1: correct's phase B records the corrected Japanese realization",
      rB.status === 0, (rB.stderr || "").split("\n")[0]);
    ok("#1160 AC1: `draft.md` (English) is byte-identical to before the correction",
      readOrEmpty(enDraftPath) === enBefore.draft);
    ok("#1160 AC1: every English Packet is byte-identical to before the correction",
      STEPS.every((s) => readOrEmpty(join(dws, "packets", `${s.id}.md`)) === enBefore.packets[s.id]));
    ok("#1160 AC1: every English Section is byte-identical to before the correction",
      STEPS.every((s) => readOrEmpty(join(dws, "sections", `${s.id}.md`)) === enBefore.sections[s.id]));
    ok("#1160 AC1 DISCRIMINATION: the Japanese Draft DID move — the correction landed somewhere",
      readOrEmpty(jaDraftPath) !== "" && /潮の時刻は港ごとに違い/.test(readOrEmpty(jaDraftPath)));
    ok("#1160: the corrected Step's Section is written under `sections/ja/`, never `sections/`",
      /潮の時刻は港ごとに違い/.test(readOrEmpty(join(dws, "sections", "ja", "l1.md"))));
    ok("#1160: and its re-rendered Packet is written under `packets/ja/`, never `packets/`",
      existsSync(join(dws, "packets", "ja", "l1.md")));
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
  // THE RETIRED ARGUMENTS ARE REFUSED BY NAME, NEVER IGNORED (kogaki#1100). A
  // call still carrying `--file` or `--verdicts` was written against the old
  // interface and is piping nothing, so silently dropping the argument would
  // give it phase A — a rendered input where it asked to record — and the
  // session would read that as the act having run. The refusal names the pipe.
  for (const k of ["file", "verdicts"]) {
    if (args[k] !== undefined) {
      fail(`\`--${k}\` is gone: a reply reaches this Harness on standard input, so that it can be `
        + "piped straight from the spawn that produced it and `runs/` holds no file the Harness did "
        + `not write.\n  <the reply> | node src/review-draft.mjs ${cmd} …`);
    }
  }
  COMMANDS[cmd](args);
}

main();

export { readDraft, resolveInputs, slugOf, missingFor, sha256 };
