#!/usr/bin/env node
// review-draft — the ReviewDraft Harness: the round-trip review of a
// CanonicalDraft against the Packets that produced it (kogaki#869 tracking,
// kogaki#870 this artifact).
//
// THE INPUTS ARE CLOSED, AND THAT IS THE WHOLE OF THE DESIGN. This command
// reads three things: `theses/<slug>/draft.md`; its frontmatter trace, which
// after kogaki#868 carries each Leg's line range and its Packet's path and
// sha; and the Packet files those entries name. It reads no Brief, no Move
// file, no Strand. The owner's 2026-09-04 ruling is why:
//
//   "The Packet was specifically designed to be the only source required to
//    generate the Draft without reading the Leg or Move files separately.
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
// records for /draft): `outline` refuses a Leg whose Reverse Outline input it did not
// render, `compare` refuses while any Leg is still unoutlined, `check`
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
// reconstructs the elements of a LEG, and the thesis is not a Leg element: of
// those five pairs the heading was preserved trivially by the Harness that
// renders it, the three belief pairs duplicated the reader-state items one level
// up, and the thesis pair -- the one check no Leg item makes -- had no act here
// at all, because corrections are Leg-level and a thesis fail could only ever
// become residue saying the Packets lack something. That is a Brief-time
// finding. So there is no Section ledger, no Section pair and no thesis check in
// this file.
//
// THE REOPEN TRIGGER IS NAMED, so a later reader can tell a ruling from an
// omission: a Draft whose every Leg holds the round trip and whose thesis the
// owner cannot find on reading it. If that happens the check is designed at
// BRIEF COMPOSITION, where the chain of `reader_state_after` values should reach
// the thesis, as an operation outside the Reverse Outlining item set -- and
// never as a sixth pair here.
//
// FIGURES REMAIN OUT OF SCOPE for this batch (kogaki#869) — they change the
// Leg schema and the Packet, so they are a later batch and not a hole here.
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
//       SPEC-draft-pipeline "The figure decision — `figure:` and `figure_roles` on a Leg"
//   the figure record
//       SPEC-draft-pipeline "The figure record — the form's instance, filled after the prose"
//   the renderer
//       SPEC-draft-pipeline "The renderer and the anchor — markup from the record, at the Leg"
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
// realization lane as a subprocess, because a corrected Leg must be realized
// by the same renderer that wrote the Packets. Nothing here reads a Brief, a
// Move or a Strand — the reviewer's blindness is a property of what this
// module READS, and it reads none of them.
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { enterRun } from "./runs.mjs";
// ONE PARSER FOR A `leg` BLOCK, and it is the Brief's (kogaki#1014). The
// Reverse Outline is a Brief Leg block, so it is read by the function
// `parseBrief` calls per fenced block rather than by a second reader here.
import { parseLegBlock, legField } from "./draft.mjs";

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
// every refusal below names the Leg rather than the file: a reviewer holding
// a Leg id can act, and one holding "the trace is malformed" cannot.

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
  //
  // THE VALUE IS FORM-CHECKED AT THE READ, and that is what the field's own
  // comment above would otherwise only promise (PR #1164 round 1). Before this
  // field existed the language reached `draft.mjs` from a `--lang` flag a
  // person typed; it now arrives from FILE CONTENT, and it lands there as a
  // path segment (`sectionsDir`, `packetsDir`), as a run.json key
  // (`packetsRecordKey`) and inside the `draft.<lang>.md` emit name. So a
  // Draft whose frontmatter carried a separator or a `..` would write outside
  // the track it names. The form checked is the BCP-47-ish one `emit` writes —
  // a primary subtag and an optional subtag — and it is a REFUSAL rather than
  // a fallback to `en`, because silently reading an unreadable language as
  // English is the cross-track write this issue exists to stop.
  const LANG_FORM = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
  let lang = "en";
  for (let i = 1; i < end; i++) {
    const m = lines[i].match(/^lang: (.+?)\s*$/);
    if (m) {
      if (!LANG_FORM.test(m[1])) {
        fail(`${draftPath} carries \`lang: ${m[1]}\`, which is not a language tag — the value is `
          + "threaded to the realization lane as `--lang`, where it becomes a directory segment, a "
          + "run-record key and part of the emitted Draft's filename, so a value outside "
          + "`aa`/`aaa` with optional `-subtag` parts would write outside the track it names. "
          + "Re-emit the Draft (`node src/draft.mjs emit --brief <brief.md> --lang <tag>`), which "
          + "writes the field.");
      }
      lang = m[1];
      break;
    }
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

// Verify the trace's inputs and hand back the Legs and Sections. Three
// refusals, each naming its Leg: no line range, a Packet that is absent, and
// a Packet whose sha differs from the trace's — the last one meaning the Draft
// was not produced from this Packet, which is the condition that makes every
// later comparison meaningless rather than merely wrong.
function resolveInputs(draft) {
  const dir = dirname(draft.path);
  const legs = [];
  for (const t of draft.trace) {
    const id = typeof t.leg_id === "string" ? t.leg_id : "(unnamed)";
    if (!Array.isArray(t.lines) || t.lines.length !== 2
        || !Number.isInteger(t.lines[0]) || !Number.isInteger(t.lines[1])) {
      fail(`leg ${id} carries no line range in the trace — ReviewDraft locates each Leg's prose `
        + "by the range kogaki#868 writes, and a Draft emitted before that lands must be re-emitted "
        + "(node src/draft.mjs emit --brief <brief.md>)");
    }
    if (typeof t.packet !== "string" || typeof t.packet_sha !== "string") {
      fail(`leg ${id} names no Packet in the trace — the Packet is the only source ReviewDraft `
        + "compares against, so a Leg without one cannot be reviewed; re-emit the Draft after "
        + "rendering its Packets");
    }
    const packetPath = resolve(dir, t.packet);
    if (!existsSync(packetPath)) {
      fail(`leg ${id}: the Packet the trace names is absent — ${packetPath}. The run workspace is `
        + "machine state and is pruned; re-render it with "
        + "`node src/draft.mjs packet --brief <brief.md> --leg " + id + "`");
    }
    const actual = sha256(readFileSync(packetPath, "utf8"));
    if (actual !== t.packet_sha) {
      fail(`leg ${id}: the Packet's sha differs from the trace's — the Draft was not produced from `
        + `this Packet.\n  trace  ${t.packet_sha}\n  file   ${actual}\n  at     ${packetPath}\n`
        + "Reviewing prose against an input that did not produce it compares two unrelated things, "
        + "so this refuses rather than reporting findings nobody can act on.");
    }
    // The range is 1-based over the file; slice is 0-based and end-exclusive.
    const prose = draft.lines.slice(t.lines[0] - 1, t.lines[1]).join("\n");
    // THE FIGURE IS RESOLVED ON THE SAME TERMS THE PACKET IS (kogaki#880).
    // The renderer rule gives a figure-carrying Leg a `figure` entry naming the validated
    // record, its sha and its own line range, and a Leg declaring none carries
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
        fail(`leg ${id}: its trace entry carries a figure with no line range — the renderer records the `
          + "figure's own range beside the Leg's prose range, and without it Reverse Outlining "
          + "has no block to quote; re-emit the Draft (node src/draft.mjs emit --brief <brief.md>)");
      }
      if (typeof f.record !== "string" || typeof f.record_sha !== "string") {
        fail(`leg ${id}: its trace entry carries a figure naming no record — the record is the `
          + "declared side of every figure item, so a figure without one cannot be reviewed");
      }
      const recordPath = resolve(dir, f.record);
      if (!existsSync(recordPath)) {
        fail(`leg ${id}: the figure record the trace names is absent — ${recordPath}. The run `
          + "workspace is machine state and is pruned; re-record it with "
          + `\`node src/draft.mjs figure --brief <brief.md> --leg ${id} --file <record.json>\``);
      }
      const recordText = readFileSync(recordPath, "utf8");
      const recordActual = sha256(recordText);
      if (recordActual !== f.record_sha) {
        fail(`leg ${id}: the figure record's sha differs from the trace's — the Draft was not `
          + `emitted from this record.\n  trace  ${f.record_sha}\n  file   ${recordActual}\n`
          + `  at     ${recordPath}\n`
          + "The rendered block the reader met came from the record as it stood at emit; comparing "
          + "it against a record edited since compares two unrelated things.");
      }
      let record;
      try { record = JSON.parse(recordText); }
      catch (e) {
        fail(`leg ${id}: the figure record at ${recordPath} is not readable JSON (${e.message}) `
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
    legs.push({
      leg_id: id,
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
  // the body: `emit` maps each Leg to its Section (kogaki#823), and re-deriving
  // it here would be a second answer to a question the trace already answers.
  const sections = [];
  for (const s of legs) {
    let sec = sections.find((x) => x.index === s.section);
    if (!sec) { sec = { index: s.section, title: s.section_title, legs: [] }; sections.push(sec); }
    sec.legs.push(s.leg_id);
  }
  sections.sort((a, b) => a.index - b.index);
  return { legs, sections };
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
// Until this, pass two wrote `outline-input/<leg>.md`, `outline/<leg>.json` and
// `join/<leg>.<item>.md` at the paths pass one had used, so the corrected
// Legs' first-pass evidence was overwritten in place. `runs/` is gitignored,
// so nothing else held a copy: pass one's blind reading of the ORIGINAL Draft,
// and every pair input judged against it, were gone — and the surviving
// verdicts in `join.json` indexed into Reverse Outlines that no longer
// existed. A rule saying "do not overwrite" would be prose where a refusal
// belongs, so the layout is the Harness's:
//
//   runs/review/<slug>/pass-1/{outline-input,outline,join,corrections,join.json}
//   runs/review/<slug>/pass-2/{outline-input,outline,join,check.json}
//   runs/review/<slug>/snapshots/     — before/after per corrected Leg
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
// WAS REVIEWED (kogaki#994). `correct` re-realizes a Leg through the draft
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
  // (kogaki#874). Rendering a correction input re-renders that Leg's Packet —
  // it must, since the whole point is a Packet carrying the article as it NOW
  // stands — so between the render and the recording the trace names a Packet
  // the prose was not produced from, which is TRUE and is exactly what
  // `resolveInputs` refuses on. That refusal is right in general and useless
  // here: it sends a reviewer to re-emit the Draft, which would discard the
  // correction they are in the middle of. So the state is recorded when it
  // opens and reported by name while it is open.
  const c = run.correcting;
  if (c && c.leg_id !== allowCorrecting) {
    fail(`this run is mid-correction on leg ${c.leg_id} — its Packet has been re-rendered against `
      + "the current article and its prose has not been re-realized yet, so the Draft's trace names "
      + `a Packet that did not produce the prose beside it.\n  input  ${c.input}\n`
      + "Realize the Leg from that input and record it with\n"
      + `  <the corrected prose> | node src/review-draft.mjs correct --draft <draft.md> --leg ${c.leg_id}\n`
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
// block was true when the Leg was written and a later correction may have
// moved it, so the current Draft is the article the reader actually meets; and
// reading the Packet for it would put Packet bytes into a reviewer whose
// ignorance is the instrument.
//
// Grouped under the Section headings the trace declares, never by scanning the
// body for `##` lines — the trace already maps each Leg to its Section
// (kogaki#823), and a heading scan would be a second answer to a question the
// trace answers.
function articleBefore(legs, legId) {
  const idx = legs.findIndex((s) => s.leg_id === legId);
  if (idx <= 0) {
    return "(nothing yet — this is the article's first passage, so nothing precedes it.)";
  }
  const out = [];
  let openSection = null;
  for (const s of legs.slice(0, idx)) {
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
function numberedProse(leg) {
  return numberedRange(leg.prose, leg.lines);
}

// The same rendering for any contiguous draft range, so the figure block and
// the prose are numbered by ONE function rather than by two that agree until
// one is edited. The width comes from the range's own last line, which is what
// keeps a Leg's own listing aligned with itself.
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
function numberedFigure(leg) {
  return numberedRange(leg.figure.rendered, leg.figure.lines);
}

// WHERE THE READER MET THE FIGURE, read from the DRAFT'S OWN LINE NUMBERS and
// never from the record's `position` field. The distinction is the whole reason
// this is a function rather than a read of the record (kogaki#945): `position`
// is the DECLARED side, and the Reverse Outline input below must carry nothing
// from the record — arranging that input by `position` would show a blind
// reviewer the very value the `figure-position` item exists to join against
// their independent reading. Line numbers are already on the reviewer's page,
// so ordering by them discloses nothing they were not given.
function figureBeforePassage(leg) {
  return leg.figure.lines[0] < leg.lines[0];
}

// The passage a JUDGING reader is shown: the prose, with the figure quoted
// beside it in draft-line order where the Leg has one. The judging reader is
// not blind — it already sees the declared side — so withholding the block from
// it would leave three of the five figure items asking about something they
// cannot see.
function quotedPassage(leg) {
  if (!leg.figure) return numberedProse(leg);
  const parts = figureBeforePassage(leg)
    ? [numberedFigure(leg), numberedProse(leg)]
    : [numberedProse(leg), numberedFigure(leg)];
  return parts.join("\n\n");
}

// The number of fields the Blind Reader is asked to fill, COUNTED FROM THE
// DECLARATION rather than spelled in the instruction — so a disposition table
// gaining a field cannot leave the sentence the reader reads saying the old
// count.
//
// IT TAKES NO LEG (PR #1022 round 1, finding 5). It took one while the count
// was per Leg — a Leg carrying a figure owed an eighth field — and the figure
// half left under the decline recorded in `src/review-items.json`. A parameter
// nothing reads says the count still varies by Leg, which is the form a
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
function renderFigurePassage(leg) {
  return ["## The figure the reader met with this passage",
    "",
    "It is rendered in the Draft, not written by the passage's author. Read it as",
    "the reader does — the numbers are its lines in the Draft, and this section",
    "sits on the side of the passage the reader met it on.",
    "",
    numberedFigure(leg),
    "",
    ""].join("\n");
}

// THE BLIND READER'S INPUT IS THE BRIEF LEG SCHEMA AND THE PROSE (kogaki#1014).
//
// Reverse Outlining: read the passage, then write the outline entry the passage
// would have been written from — in the SAME FORM as the forward outline. So
// the input carries the Brief's own field list with the Brief's own
// definitions, and nothing else. There is no template file, because there is no
// second artifact to describe: the reader fills a `leg` block.
//
// WHAT IS WITHHELD IS WITHHELD DELIBERATELY. The Forward Artifact is not shown —
// that is what makes the comparison worth making — and neither is the Move, its
// candidates, or any of the not-reconstructible fields. Supplying the Move
// would make the outcome ride on supplied information; its effect is carried by
// the reader states, which ARE compared.
//
// THE ARTICLE'S OWN TEXT GOES IN LAST. `article_so_far`, `leg_prose` and the
// figure passage are the Draft's own bytes, and an article about this pipeline
// can quote a field name or a fenced block as its own subject matter — so
// nothing below substitutes into them.
function renderReverseOutlineInput(ws, run, draft, leg, legs) {
  const figureBlock = leg.figure ? renderFigurePassage(leg) : "";
  const figureFirst = leg.figure ? figureBeforePassage(leg) : false;
  const fieldLines = RECONSTRUCTIBLE_FIELDS.map((f) => `- \`${f.name}\` — ${f.definition}`);

  // THE FIGURE'S ASK RIDES THE SAME INPUT AND IS OWED ONLY WHERE THE READER MET
  // ONE. A figureless Leg is not asked for a figure block and is refused one:
  // a reader inventing a reading of a block that was never rendered is not
  // annotating harmlessly, it is a reading of nothing reaching the comparison.
  const figureFieldLines = leg.figure
    ? FIGURE_RECONSTRUCTIBLE_FIELDS.map((f) => `- \`${f.name}\` — ${f.definition}`)
    : [];
  const figureAsk = leg.figure
    ? ["## The figure you met, in its own terms",
      "",
      "This passage was rendered with a block beside it, and that block was written from a record",
      "of its own. Read it as you read the passage — from what is on the page — and answer in the",
      "record's own fields:",
      "",
      ...figureFieldLines,
      "",
      "Reply with a SECOND fenced block, after the `leg` block:",
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
    `# Reverse Outline — ${leg.leg_id}`,
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
    "Reply with ONE fenced `leg` block and nothing else:",
    "",
    "````",
    "```leg",
    `leg_id: ${leg.leg_id}`,
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
  const parts = [head, articleBefore(legs, leg.leg_id), ""];
  if (figureFirst && figureBlock) parts.push(figureBlock, "");
  parts.push(
    `## The passage — ${leg.leg_id}, draft lines ${leg.lines[0]}–${leg.lines[1]}`,
    "",
    "Every line is numbered with its line number in the Draft.",
    "",
    numberedProse(leg), "");
  if (!figureFirst && figureBlock) parts.push(figureBlock, "");

  const dest = passPath(ws, run, "outline-input", `${leg.leg_id}.md`);
  const out = parts.join("\n");
  writeFileSync(dest, out.endsWith("\n") ? out : out + "\n");
  return dest;
}

// ---------------------------------------------------------------------------
// THE REVERSE OUTLINE, AND THE FIELDS IT IS WRITTEN IN (kogaki#1013/#1014).
//
// Reverse Outlining is the method: after drafting, write an outline of what the
// prose actually says, in the same form as the forward outline, and compare
// entry by entry. So the Reverse Outline is a BRIEF LEG BLOCK — every field is
// a Brief field under the Brief's own name and definition — and there is no
// second schema for the same information. `src/outlined-schema.json` and
// `src/outline-template.md` were that second schema and are deleted with this.
//
// THE DISPOSITIONS ARE DECLARED ONCE, HERE, PER BRIEF LEG FIELD, and the table
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
// moves to the refused list below, because it IS a Brief Leg field and the
// closed line set would otherwise admit it silently; `concession` is refused by
// that closed set itself, which names it and says it is not a Brief Leg field.
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
  { name: "rationale", why: "why the Leg was placed where it was is the composer's reasoning, not the reader's" },
  { name: "depends_on", why: "which earlier Legs this one stands on is the path's structure, not the passage's content" },
  { name: "bridges", why: "whether this Leg was inserted between two others is a fact about how the Brief was revised" },
  { name: "figure", why: "the figure's own round trip is a separate comparison against the figure record's own fields" },
  { name: "opens_section", why: "whether a Leg opens its Section or continues one is rendered by the Harness out "
      + "of the trace, so it is never information the prose has to carry; the row that compared it left the item table "
      + "at kogaki#1132 and a line nothing reads is a reading the Blind Reader is charged for and nobody looks at" },
];

// ---------------------------------------------------------------------------
// THE FIGURE'S OWN ROUND TRIP (kogaki#880, restated against the record's own
// fields at kogaki#1018).
//
// ONE LEVEL DOWN, UNDER THE SAME RULE. A passage is written from a Brief Leg,
// so its Reverse Outline is a Brief Leg block. A figure is written from its
// RECORD, so the figure's Reverse Outline is a block in the FIGURE RECORD's own
// field names — `src/figure-schema.json`'s, which is where they are declared and
// where they stay. There is no second schema at either level, which is the
// property kogaki#1014 landed for the passage and this is the same property for
// the figure.
//
// WHY IT IS ITS OWN BLOCK RATHER THAN A FIELD OF THE LEG'S. `figure` IS a Brief
// Leg field and it is declared NOT reconstructible above — a reader cannot read
// the Brief's figure decision off a rendered block — so a `figure:` line inside
// the Reverse Outline is refused there and stays refused. What a reader CAN do
// is say what they met, and that answer is about a different artifact with a
// different field list. Filing it as its own fence and its own file is what
// keeps the Leg reading's key set closed against the Brief's names.
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

// The fenced form, the Leg block's grammar one artifact over.
function parseFigureBlock(text, path) {
  const m = /^```figure\n([\s\S]*?)\n```/m.exec(text);
  if (!m) {
    return { refusal: `${path} carries no fenced \`figure\` block — this Leg's reader met a figure, so `
      + "the Round Trip owes a reading of it in the figure record's own field names" };
  }
  if (/^```figure\n/m.test(text.slice(m.index + m[0].length))) {
    return { refusal: `${path} carries more than one fenced \`figure\` block — a Leg renders one figure, `
      + "and two blocks leave the Harness to pick which one the reader meant" };
  }
  return { body: m[1] };
}

// The figure's Reverse Outline, validated and projected into the record's own
// field names. EVERY REFUSAL NAMES WHAT IT SAW, for the reason the passage half
// gives: this is the one artifact in the flow a person wrote by hand.
function validateFigureOutline(text, leg, file) {
  const parsed = parseFigureBlock(text, file);
  if (parsed.refusal) fail(parsed.refusal);
  const body = parsed.body;
  const problems = [];

  const caption = legField(body, "caption");
  if (caption === null) problems.push("carries no `caption:` line — " + FIGURE_RECONSTRUCTIBLE_FIELDS[1].definition);
  else if (caption === "") problems.push("`caption:` is blank — " + FIGURE_RECONSTRUCTIBLE_FIELDS[1].definition);

  const position = legField(body, "position");
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

  // THE LINE SET IS CLOSED, exactly as the Leg block's is: a name nobody
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
    fail(`the figure's Reverse Outline for ${leg.leg_id} (${file}) is not a block this Round Trip can read:\n  - `
      + problems.join("\n  - "));
  }

  return {
    leg_id: leg.leg_id,
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
// meeting it: `parseLegBlock` is the function `parseBrief` calls per fenced
// block, so a Reverse Outline the Brief could not carry is refused by the same
// code that would refuse it inside a Brief.
//
// EVERY REFUSAL NAMES WHAT IT SAW. A Reverse Outline is the one artifact in
// this flow a person wrote by hand, so "invalid" without the field is a refusal
// that costs another read to act on.
function validateReverseOutline(text, leg, file) {
  const parsed = parseLegBlock(text, file);
  if (parsed.refusal) fail(parsed.refusal);
  const outline = parsed.leg;
  const body = outline.body;
  const problems = [];

  if (outline.leg_id !== leg.leg_id) {
    problems.push(`its \`leg_id\` is \`${outline.leg_id}\` and this pass is reading ${leg.leg_id} — `
      + "a Reverse Outline is the reading of ONE passage and is filed against it");
  }

  for (const f of RECONSTRUCTIBLE_FIELDS) {
    if (f.kind === "line") {
      const v = legField(body, f.name);
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
    if (legField(body, f.name) !== null) {
      problems.push(`carries \`${f.name}:\`, which is declared NOT reconstructible — ${f.why}`);
    }
  }

  // The top-level line set is closed for the same reason the record's key set
  // was: a name nobody declared carries a judgment the Harness never reads, and
  // admit-by-default is how that arrives with no trace.
  const declared = new Set([...RECONSTRUCTIBLE_NAMES, ...NOT_RECONSTRUCTIBLE_FIELDS.map((f) => f.name), "leg_id"]);
  for (const ln of body.split("\n")) {
    if (ln.startsWith("claim ") || ln.trim() === "") continue;
    const m = /^([a-z_][a-z0-9_]*):/.exec(ln);
    if (m && !declared.has(m[1])) {
      problems.push(`carries \`${m[1]}:\`, which is not a Brief Leg field — a field in the Reverse Outline `
        + "that is not a Brief Leg field needs its own ruling, so it is refused rather than read");
    }
  }

  if (problems.length) {
    fail(`the Reverse Outline for ${leg.leg_id} (${file}) is not a Brief Leg block this Round Trip can read:\n  - `
      + problems.join("\n  - "));
  }

  // THE READING, UNDER THE BRIEF'S OWN NAMES. There is no translation left to
  // do: `field` in the Round Trip table names a Brief Leg field, and this
  // returns that field. What used to sit here was a projection into a second
  // schema's key names, and the column that read it is gone with the schema.
  return {
    leg_id: outline.leg_id,
    purpose: legField(body, "purpose"),
    reader_state_before: legField(body, "reader_state_before"),
    reader_state_after: legField(body, "reader_state_after"),
    claims: outlineClaims(body).map((l) => ({ text: l.replace(/^claim[ \t]+/, "").trim() })),
    introduces: repeatedLines(body, "introduces").map((t) => ({ text: t })),
  };
}

// The next Leg with no outline yet, in the path's recorded order. `open`
// renders the first; `outline` renders the next, which is what makes the flow
// self-driving rather than a sequence a session has to remember.
function nextOutlineOwed(run) {
  return run.legs.find((s) => !run.outlineFields[s.leg_id]);
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
//
// RESOLVED BESIDE THE RUNTIME, NEVER AGAINST THE WORKING DIRECTORY: the same
// `terms/prh.yml`, one level up from this file's own directory, that
// src/lint-ja.mjs's DEFAULT_TERMS_PATH and src/draft.mjs's `--terms-path`
// default resolve — so `open` finds the term list whatever directory it is
// invoked from. Computed locally (never imported from ./lint-ja.mjs) because
// this Harness's own closed-input allowlist (below) forbids importing a
// reader the Round Trip is not licensed to see; the path constant is not a
// reader and duplicating a two-line join is what keeps it that way.
const TERMS_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "terms", "prh.yml");

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
      + "A term-list change is a correction, never a whole-Draft re-derivation: run "
      + `\`node src/lint-ja.mjs correct-terms --draft ${draftPath}\` to name the Legs still owed after the `
      + `mechanical fix, then re-enter ReviewDraft with \`open --draft ${draftPath} --only-legs <those Legs>\``);
  }
}

// ---------------------------------------------------------------------------
// The commands.

// THE TERM-LIST CHANGE PATH'S RE-ENTRY (kogaki#1165, discharging kogaki#1160
// acceptance item 3): `--only-legs` scopes the WHOLE run — outline, compare,
// correct, check and close all read `run.legs` and nothing else to decide
// which Legs this run reviews, so filtering it here is the whole of the
// scoping and no other command needs to know a scoped run exists. A Leg
// left out is never re-outlined and never re-compared, because there is no
// code path here that reaches a Leg `run.legs` does not name.
//
// `checkJaTermsFreshness` IS SKIPPED FOR A SCOPED OPEN, on purpose: the whole
// reason this path exists is that a term-list change leaves
// `terms_sha_at_lint` stale until the named Legs are corrected and the Draft
// is Linted again, and the ordinary freshness gate would refuse to let that
// correction start. `src/lint-ja.mjs correct-terms` is what names the Legs
// this flag takes.
function scopeToOnlyLegs(legs, sections, onlyLegsArg) {
  const onlyLegs = onlyLegsArg.split(",").map((s) => s.trim()).filter(Boolean);
  const known = new Set(legs.map((s) => s.leg_id));
  const unknown = onlyLegs.filter((id) => !known.has(id));
  if (unknown.length) {
    fail(`--only-legs names leg id(s) not in this Draft's trace: ${unknown.join(", ")} — known Legs are ${[...known].join(", ")}`);
  }
  if (!onlyLegs.length) {
    fail("--only-legs names no Leg — a term-list change path with nothing to correct has nothing to "
      + "open. Run `node src/lint-ja.mjs correct-terms --draft <draft.ja.md>` to see which Legs (if any) "
      + "Lint still names after the mechanical fix.");
  }
  const onlySet = new Set(onlyLegs);
  const scopedLegs = legs.filter((s) => onlySet.has(s.leg_id));
  const scopedSections = sections
    .map((sec) => ({ ...sec, legs: sec.legs.filter((id) => onlySet.has(id)) }))
    .filter((sec) => sec.legs.length > 0);
  return { legs: scopedLegs, sections: scopedSections, onlyLegs };
}

function cmdOpen(args) {
  const draftPath = argString(args, "draft",
    "usage: review-draft open --draft <draft.md> [--only-legs <id[,id...]>]");
  // retired-vocab-ok — `regenerat` is on checks/check-review-draft-retired-
  // vocabulary.sh's list (kogaki#1013 retired it with the deleted act it
  // named), and every use in this block is a MUST-NOT-APPEAR TRIPWIRE rather
  // than a lapse: `--regenerate` exists so a session reaching for a
  // whole-Draft re-derivation is told BY NAME that ReviewDraft does not do
  // that, citing src/lint-ja.mjs's Terminology List Decision. It names the
  // retired act to refuse it, never to perform it.
  if (args.regenerate) {
    fail("open refuses --regenerate: the Terminology List Decision (src/lint-ja.mjs) states a term-list "
      + "change is a CORRECTION, never a whole-Draft re-derivation — the owner does not require the Draft "
      + "to be uniquely reproducible, so re-deriving it from a moved term list is not owed. Only the Legs "
      + "`node src/lint-ja.mjs correct-terms` names are corrected; open with `--only-legs` naming them.");
  }
  const onlyLegsArg = typeof args["only-legs"] === "string" && args["only-legs"] !== "" ? args["only-legs"] : null;
  if (!onlyLegsArg) checkJaTermsFreshness(draftPath);
  const draft = readDraft(draftPath);
  // THE FULL TRACE IS KEPT BESIDE THE SCOPED SET, and the two are not
  // interchangeable (PR #1169 round 1). `run.legs` answers *which Legs this
  // run reviews* and is scoped; the article a Blind Reader is shown before a
  // passage answers *what the reader has read by then* and is NEVER scoped —
  // it is a property of the Draft, not of this run's scope. Handing the scoped
  // array to the renderer made the first named Leg read as the article's
  // first passage and withheld the prose actually preceding it, and it
  // disagreed with `cmdOutline` and pass two's re-render, which both build the
  // same block from the full trace.
  const resolved = resolveInputs(draft);
  const allLegs = resolved.legs;
  let { legs, sections } = resolved;
  let onlyLegs = null;
  if (onlyLegsArg) {
    ({ legs, sections, onlyLegs } = scopeToOnlyLegs(legs, sections, onlyLegsArg));
  }
  const slug = slugOf(draftPath);
  const ws = workspaceFor(args, slug);

  const run = {
    draft: resolve(draftPath),
    slug,
    body_sha: draft.body_sha,
    opened_at: new Date().toISOString(),
    only_legs: onlyLegs,
    legs: legs.map((s) => ({
      leg_id: s.leg_id, section: s.section, section_title: s.section_title,
      lines: s.lines, packet: s.packet, packet_sha: s.packet_sha,
    })),
    sections: sections.map((s) => ({ index: s.index, title: s.title, legs: s.legs })),
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

  const first = legs[0];
  const input = renderReverseOutlineInput(ws, run, draft, first, allLegs);
  run.rendered[first.leg_id] = input;
  writeRun(ws, run);

  process.stdout.write(
    `ReviewDraft opened: ${slug}\n`
    + (onlyLegs ? `  scope     term-list change path — only ${onlyLegs.join(", ")} (no other Leg is re-outlined, re-compared or re-realized)\n` : "")
    + `  draft     ${resolve(draftPath)} (body sha ${draft.body_sha.slice(0, 16)})\n`
    + `  legs     ${legs.length} — ${legs.map((s) => s.leg_id).join(", ")}\n`
    + `  sections  ${sections.length} — ${sections.map((s) => `${s.index}. ${s.title ?? "(untitled)"}`).join(" | ")}\n`
    + `  packets   ${legs.length} verified against the trace's shas\n`
    + `  workspace ${ws}\n`
    + `\nfirst Reverse Outline input: ${input}\n`);
}

function cmdOutline(args) {
  const usage = "usage: <reverse outline> | review-draft outline --draft <draft.md> --leg <id>";
  const draftPath = argString(args, "draft", usage);
  const legId = argString(args, "leg", usage);
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);

  const known = run.legs.map((s) => s.leg_id);
  if (!known.includes(legId)) {
    fail(`unknown leg \`${legId}\` — this Draft's Legs are ${known.join(", ")}`);
  }
  // THE RENDERED-INPUT GUARD IS WHAT MAKES REVERSE OUTLINING BLIND. A record handed
  // back for a Leg whose input was never rendered was written against
  // something else — the Packet, the Brief, or the reviewer's memory of the
  // article — and there is no way to tell which afterwards. So the refusal is
  // here, at the only moment the distinction is still observable.
  if (!run.rendered[legId]) {
    fail(`leg ${legId} has no rendered Reverse Outline input, so this record was not written against one.\n`
      + "The Harness renders inputs in the path's recorded order — `open` renders the first and each "
      + `\`outline\` renders the next. The Leg now owed is ${nextOutlineOwed(run)?.leg_id ?? "(none)"}.`);
  }
  // READ AFTER THE GUARDS, not before them. The reply arrives on standard input
  // and the refusals above are about the Leg rather than about the reading, so
  // consuming the stream first would make an unknown Leg's refusal depend on a
  // reply nobody needed to write.
  //
  // VALIDATED BEFORE IT IS RECORDED (kogaki#871). A record written to the
  // workspace and validated later would leave `compare` to discover the defect,
  // by which point the reviewer who could fix it has finished reading.
  const content = requireReply(usage);
  // THE LEG COMES FROM THE DRAFT, NOT FROM THE RUN RECORD (kogaki#880). The
  // run record carries the Leg's identity and its ranges; whether the Leg has
  // a figure — and where its block sits — is resolved from the trace, which is
  // the same read the Reverse Outline input was rendered from. Validating against the
  // run record's copy would let the conditional eighth field be owed at render
  // and unowed at validation, which is the two-answers-to-one-question pattern
  // this Harness refuses everywhere else.
  const { legs } = resolveInputs(draft);
  const leg = legs.find((x) => x.leg_id === legId);
  const projected = validateReverseOutline(content, leg, STDIN_LABEL);

  // THE FIGURE'S HALF, VALIDATED IN THE SAME ACT (kogaki#1018). Owed where the
  // trace says the reader met a block, and REFUSED where it says they did not —
  // the two refusals are the figure's counterpart of the Leg block's own, and
  // they are here rather than at `compare` for the reason the Leg's are: the
  // reviewer who could fix it has finished reading by then.
  let figureProjected = null;
  const hasFigureBlock = /^```figure\n/m.test(content);
  if (leg.figure) {
    figureProjected = validateFigureOutline(content, leg, STDIN_LABEL);
  } else if (hasFigureBlock) {
    fail(`the Reverse Outline for ${legId} (${STDIN_LABEL}) carries a fenced \`figure\` block, and this Leg `
      + "renders no figure. A reading of a block the reader never met is an invention, and the "
      + "comparison downstream would treat it as evidence, so it is refused rather than dropped.");
  }

  // BOTH ARE KEPT, AND THE OUTLINE IS THE EVIDENCE. The `.md` is the Reverse
  // Outline exactly as it was written — the artifact a later reader checks the
  // Round Trip against — and the `.json` is the reading the Harness compares,
  // under the Brief's own field names. Writing only the second would leave the
  // run's own record unable to show what the Blind Reader actually said.
  const outlinePath = passPath(ws, run, "outline", `${legId}.md`);
  writeFileSync(outlinePath, content.endsWith("\n") ? content : content + "\n");
  const out = passPath(ws, run, "outline", `${legId}.json`);
  writeFileSync(out, JSON.stringify(projected, null, 2) + "\n");
  run.outlineFields[legId] = out;
  run.outlines = run.outlines || {};
  run.outlines[legId] = outlinePath;

  // THE FIGURE'S READING IS ITS OWN FILE, for the reason it is its own fence:
  // it is written in the FIGURE RECORD's field names, and the Leg's reading is
  // written in the BRIEF's. One file per vocabulary is what keeps either from
  // acquiring a key belonging to the other.
  run.figureOutlineFields = run.figureOutlineFields || {};
  if (figureProjected) {
    const fout = passPath(ws, run, "outline", `${legId}.figure.json`);
    writeFileSync(fout, JSON.stringify(figureProjected, null, 2) + "\n");
    run.figureOutlineFields[legId] = fout;
  }

  const next = nextOutlineOwed(run);
  let nextInput = null;
  if (next) {
    const full = legs.find((s) => s.leg_id === next.leg_id);
    nextInput = renderReverseOutlineInput(ws, run, draft, full, legs);
    run.rendered[next.leg_id] = nextInput;
  }
  writeRun(ws, run);

  process.stdout.write(`recorded: ${legId} -> ${out}\n`);
  if (nextInput) process.stdout.write(`next Reverse Outline input: ${nextInput}\n`);
  else process.stdout.write("every Leg is outlined. `compare --draft <draft.md>` is the join.\n");
}

// What `compare` is missing, computed once and rendered as the refusal's whole
// content: a reviewer told "something is missing" has to go looking, and the
// looking is the part the Harness can do.
//
// THE LEG OUTLINES ARE THE WHOLE OF WHAT IT CAN BE MISSING (kogaki#1133). The
// Section ledger and the cold reader's final claim were two further kinds of
// missing until that issue removed the reader that wrote them. The return stays
// a record rather than becoming a bare array, because a caller reading `.legs`
// says what it is asking about.
function missingFor(run) {
  const legs = run.legs.map((s) => s.leg_id).filter((id) => !run.outlineFields[id]);
  return { legs };
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
// `fails` COSTS is the table's: a preserved item's fail sends the Leg to
// correction, a best-effort item's rides along if that Leg is re-realized
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
// `term — anchor (introduced at <leg>)`; only the term is the join key, and the
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
  // A LIST UNDER ITS OWN HEADING (kogaki#1215 decision 3). The claims, the
  // `already knows` terms and the `introduce here` terms each render as a flat
  // `- ` list in a block of their own, in the Packet's one list convention, so
  // no list sits under a bulleted field label and no item carries a `key:`
  // prefix. The region runs from the heading to the next one; its fixed
  // instruction prose carries no `- ` line, so only the items are read.
  //
  // A STATED ABSENCE IN THE REGION IS AN ANSWER — this Leg declares none (PR
  // #895 round 1, finding 2): it is only a hole when the heading, and so the
  // region, is absent altogether, or when the region carries neither an item
  // nor an absence.
  heading_list: (t, spec) => {
    const block = packetBlock(t, spec.heading);
    if (block === null) return null;
    const items = bulletList(block, { termOnly: !!spec.term_only });
    if (items.length) return items;
    if (block.split("\n").some((l) => PACKET_ABSENCE.test(l.trim()))) return [];
    return null;
  },
  bullet: (t, spec) => packetBullet(t, spec.label),
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
function readPacketBlock(text, name, items, leg, wantedBy) {
  const spec = (items.packet_blocks || {})[name];
  const reader = spec && PACKET_READERS[spec.kind];
  if (!reader) {
    fail(`the item table names the Packet block \`${name}\`, which this Harness has no reader for `
      + "— the table and the runtime disagree about the Packet's layout, and a comparison run "
      + "against a block nobody reads would report agreement it never checked");
  }
  const v = reader(text, spec);
  if (v === null) {
    fail(`leg ${leg.leg_id}: its Packet carries no \`${name}\` block, which the item(s) `
      + `${wantedBy.join(", ")} compare against.\n  packet  ${leg.packet_path}\n`
      + "A block the comparison needs and the Packet does not carry is a PACKET GAP: file it "
      + "against src/packet-template.md. It is never satisfied by reading the Brief, the Move "
      + "or the Strand — the owner's 2026-09-04 ruling is that a need for those is evidence "
      + "the Packet is missing information.");
  }
  return v;
}

// The declared side for one Leg, read once and refusing BY NAME on the first
// block an item needs and the Packet does not carry.
function declaredFor(leg, items) {
  const text = readFileSync(leg.packet_path, "utf8");
  const need = new Set();
  for (const it of items.items) {
    // A ROW THIS LEG DOES NOT RUN ASKS FOR NO BLOCK (kogaki#880). Collecting a
    // figure row's Packet blocks on a figureless Leg would refuse that Leg as
    // a Packet gap for a block no item on it ever reads — a refusal naming a
    // repair nobody owes.
    if (it.figure_only && !leg.figure) continue;
    if (it.declared_block) need.add(it.declared_block);
    for (const b of it.also_declared_blocks || []) need.add(b);
  }
  const out = {};
  for (const name of need) {
    const wanted = items.items.filter((i) => i.declared_block === name
      || (i.also_declared_blocks || []).includes(name)).map((i) => i.id);
    out[name] = readPacketBlock(text, name, items, leg, wanted);
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

// THE DRAFT'S OWN PARAGRAPHS, each a run of non-blank lines, tracked by its
// 1-based line range OVER THE FILE (frontmatter included, matching the trace's
// own convention) rather than over the body alone — so a span this reads back
// lines up with the one `comparisonLine` renders for every other item.
function paragraphsOf(draft) {
  const bodyStart = draft.frontmatterEnd + 2; // 0-based index of the body's first line
  const paras = [];
  let start = null;
  for (let i = bodyStart; i < draft.lines.length; i++) {
    if (draft.lines[i].trim() === "") {
      if (start !== null) { paras.push({ startLine: start + 1, endLine: i }); start = null; }
      continue;
    }
    if (start === null) start = i;
  }
  if (start !== null) paras.push({ startLine: start + 1, endLine: draft.lines.length });
  return paras;
}

// "DEMONSTRATIVE REFERENCE" IS THE SETTLED TERM for an expression such as "the
// first" or "the last one" — an ordinal or positional noun phrase that points
// at an earlier enumeration rather than naming its antecedent again. The list
// is curated rather than a general pronoun scan, because a general scan over
// "this"/"that" would fire on every use of either word, and most carry no
// antecedent to recover at all.
const DEMONSTRATIVE_REFERENCE = /\bthe (first|second|third|last|former|latter|previous|next|other|same)( one)?\b/gi;

// THE ANTECEDENT'S OWN FORM, MECHANICALLY: an enumeration is a run of items
// joined by a comma or by "and"/"or" — the form a list of candidates takes on
// the page, read as a string fact rather than as which candidate is meant.
const LIST_CANDIDATE = /,\s|\s(?:and|or)\s/i;

// ONE IMPLEMENTATION PER MECHANICAL ITEM, keyed by the item's own id. Each
// returns `{verdict, reason, span}` and never a score. The ids here are
// BINDINGS to the table's `mode: mechanical` rows — a table row whose id has no
// implementation is refused below rather than silently skipped, which is the
// half that keeps the two from drifting apart.
const MECHANICAL = {
  // THE HYGIENE ITEMS ARE GONE, AND THEIR ABSENCE IS A RULING RATHER THAN A
  // TRIM (owner 2026-09-09; kogaki#1013 item 3). `term-before-introduction`,
  // `restates-earlier-leg` and `packet-wording` each asked whether the prose
  // betrayed the material it was produced from. Prose hygiene is not part of
  // Reverse Outlining: a reader cannot infer the source a structure was
  // produced from, and being able to would be abnormal. Whether any of them
  // survives as a realization-time lint in `draft` is a separate question for
  // the owner, not this rebuild. Their rows left `src/review-items.json` in the
  // same act, and the binding check below is what makes a row with no
  // implementation refuse rather than silently skip — so the two cannot drift.

  // AND `claims-unused` LEFT WITH THE MATCHER IT READ (kogaki#1132). It was the
  // best-effort row reporting a declared claim no outlined claim matched, and it
  // held on every Leg of the first full run while the preserved row failed on
  // every Leg: the item with a consequence detected surplus, and the item that
  // detected a lost claim had none. Both halves are now the one preserved
  // `claims` row, asked once per DECLARED claim, so a lost claim is named to the
  // correction with its own text instead of being reported beside it.
  //
  // READ FROM THE DRAFT ALONE (kogaki#1255 cell 4). `demonstrative-reference`
  // declares no Packet block and no figure field — a Packet does not carry
  // the prose's referring expressions, so the only side this item has is the
  // passage itself. The antecedent it asks about is read mechanically as a
  // STRING FACT — an enumeration's form, a comma or an "and"/"or" run — never
  // as which candidate is the right one, which is a reading no string fact
  // settles and this item never asks.
  //
  // THE WINDOW IS ONE PARAGRAPH BACK, named so a later reader can tell the
  // bound from an oversight: a reader who just read the paragraph before the
  // one carrying the reference still holds it; a reader three paragraphs past
  // it does not, which is the fixture `checks/check-brief-review.sh` carries.
  // So the enumeration must sit in the reference's OWN paragraph (before the
  // reference) or the one immediately before it — never further back.
  "demonstrative-reference": ({ leg, draft }) => {
    const paras = paragraphsOf(draft);
    for (let pi = 0; pi < paras.length; pi++) {
      const p = paras[pi];
      if (p.startLine < leg.lines[0] || p.endLine > leg.lines[1]) continue;
      const text = draft.lines.slice(p.startLine - 1, p.endLine).join("\n");
      const re = new RegExp(DEMONSTRATIVE_REFERENCE);
      let m;
      while ((m = re.exec(text))) {
        const lineNo = p.startLine + text.slice(0, m.index).split("\n").length - 1;
        const prev = pi > 0 ? paras[pi - 1] : null;
        const prevText = prev ? draft.lines.slice(prev.startLine - 1, prev.endLine).join("\n") : "";
        const recoverable = LIST_CANDIDATE.test(text.slice(0, m.index)) || LIST_CANDIDATE.test(prevText);
        if (!recoverable) {
          return {
            verdict: "fails",
            reason: "a demonstrative reference's antecedent is not recoverable within the paragraph "
              + "it appears in or the one immediately before it",
            evidence: [`The antecedent of the demonstrative reference '${m[0]}' on line ${lineNo} `
              + "is not recoverable"],
            span: leg.lines,
          };
        }
      }
    }
    return {
      verdict: "holds",
      reason: "every demonstrative reference's antecedent is recoverable within the paragraph it "
        + "appears in or the one immediately before it",
      span: leg.lines,
    };
  },

  // THE MAP WAS EMPTY AT kogaki#1013 AND NOW CARRIES ONE ROW. A prose Leg's
  // other rows are all judged; the figure's element-to-claim row is mechanical
  // and lives in `MECHANICAL_FIGURE`. The dispatch below reads both, and a
  // table row with no implementation still refuses by name rather than
  // silently skipping.
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
function figureDeclared(leg, item) {
  if (item.declared_block && item.record_field) {
    fail(`the item table declares \`${item.id}\` with both a Packet block and a figure record `
      + "field. One row asks one question of one declared side; a row with two would be answered "
      + "against whichever the runtime happened to read first");
  }
  const rec = leg.figure.record_json;
  const v = rec[item.record_field];
  if (v === undefined) {
    fail(`leg ${leg.leg_id}: item \`${item.id}\` reads the figure record's `
      + `\`${item.record_field}\`, and the record at ${leg.figure.record_path} carries no such `
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
// claim the record's address POINTS AT, with its own declared floor — the
// only containment reading left on either side of the round trip, now that
// the prose side's `claims` is judged rather than measured by shared words.
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
// mechanical fail cheap enough to run on every Leg of every pass. The judgment
// comes second and elsewhere: a fail on this preserved row is what sends the
// Leg to `correct --figure`, where a reader is shown the element beside the
// claim it was worded from.
//
// THE ADDRESS IS `g<n>` OVER THE LEG'S OWN CLAIMS, 1-based, which is the
// figure decision's
// grammar. An address outside the Leg's claim count is refused by name rather
// than scored against whatever happens to sit at that index — the figure
// decision's own
// grammar refuses one at composition, so a record carrying one now was written
// against a Brief this Draft was not emitted from.
function claimAt(address, claims) {
  const m = /^g(\d+)$/.exec(String(address ?? ""));
  if (!m) return { error: `is bound to ${renderSide(address ?? null)}, which is not a claim `
    + "address — a role binds to `g<n>` over the Leg's own claims" };
  const i = Number(m[1]);
  if (i < 1 || i > claims.length) {
    return { error: `is bound to ${address} and this Leg declares `
      + `${claims.length} claim${claims.length === 1 ? "" : "s"} — the address points past them` };
  }
  return { claim: claims[i - 1] };
}

const MECHANICAL_FIGURE = {
  "figure-element-claim": ({ leg, declared, items, item }) => {
    const floor = items.thresholds.figure_element_claim_containment;
    if (typeof floor !== "number") {
      fail("the item table declares no `thresholds.figure_element_claim_containment`, and the "
        + "element-to-claim check is containment against a floor. With none every element would "
        + "pass, which is the silent `holds` this comparison exists to refuse");
    }
    const claims = declared.claims || [];
    const elements = figureDeclared(leg, item);
    for (const [role, el] of Object.entries(elements)) {
      const r = claimAt(el && el.claim, claims);
      if (r.error) {
        return {
          verdict: "fails",
          reason: "an element's claim address does not resolve against this Leg's claims",
          evidence: [`${role} ${r.error}`],
          span: leg.figure.lines,
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
          span: leg.figure.lines,
        };
      }
    }
    return {
      verdict: "holds",
      reason: "every element is worded in the terms of the claim it is bound to",
      span: leg.figure.lines,
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
function renderJoinPacket(ws, run, pass, draft, leg, item, pair, declaredText, outlineText) {
  const tplPath = join(dirname(fileURLToPath(import.meta.url)), "join-template.md");
  if (!existsSync(tplPath)) {
    fail(`the join template is absent — ${tplPath}. It is the judging model's entire input, so a `
      + "missing template is a hole the model fills by invention; this refuses rather than asking "
      + "a question with no form.");
  }
  let out = readFileSync(tplPath, "utf8").replace(/^<!--[\s\S]*?-->\n*/, "");
  const fields = {
    leg_id: leg.leg_id,
    item: item.id,
    item_class: item.class,
    declared: declaredText,
    reverse: outlineText,
    span: `${leg.lines[0]}–${leg.lines[1]}`,
    // THE JUDGING READER IS TOLD WHICH CARRIER DECLARED THE LINE. It is not the
    // blind reader — it sees both sides by design — and a figure record's line
    // rendered under a heading saying `Packet` would name the wrong artifact in
    // every finding a reader of the join record goes on to repair.
    declared_source: item.declared_source ?? "Packet",
    quoted: quotedPassage(leg),
    question: item.question,
    record_command: `<verdicts.json> | node src/review-draft.mjs compare --draft ${relative(process.cwd(), draft.path) || draft.path}`,
  };
  for (const [k, v] of Object.entries(fields)) out = out.split(`{{${k}}}`).join(v);
  const left = out.match(/\{\{(\w+)\}\}/);
  if (left) {
    fail(`the join template's slot {{${left[1]}}} was not filled — the renderer and the template `
      + "disagree about the slot set, which is the round trip failing silently");
  }
  const name = pair === null ? `${leg.leg_id}.${item.id}.md` : `${leg.leg_id}.${item.id}.${pair}.md`;
  const dest = passPathAt(ws, run, pass, "join", name);
  writeFileSync(dest, out.endsWith("\n") ? out : out + "\n");
  return dest;
}

const verdictKey = (leg_id, item, pair) => (pair === null || pair === undefined
  ? `${leg_id}/${item}` : `${leg_id}/${item}#${pair}`);

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
      + `one JSON object carrying \`verdicts\`: [{leg_id, item, pair?, verdict, reason, model}]`);
  }
  const list = doc && !Array.isArray(doc) && Array.isArray(doc.verdicts) ? doc.verdicts : null;
  if (!list) {
    fail(`the reply on ${STDIN_LABEL} carries no \`verdicts\` array — it is one JSON object of the form `
      + `{"verdicts": [{"leg_id": ..., "item": ..., "verdict": ..., "reason": ..., "model": ...}]}`);
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
    const key = verdictKey(v.leg_id, v.item, v.pair === undefined ? null : v.pair);
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
    accepted.push({ key, leg_id: v.leg_id, item: v.item, pair: v.pair === undefined ? null : v.pair,
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
// A REVERSE SIDE IS ONE BRIEF LEG FIELD, AND THE PATH IS FLAT (kogaki#1014).
// The dotted one-level reach this function used to allow existed for
// `figure_reading`, the deleted record's one object field; a Brief Leg field
// is a line, so there is nothing left to reach into. A dotted path is refused
// by name rather than resolved to `undefined`, which is how a table naming a
// field nobody computes would otherwise read as a side that simply was not
// outlined.
function outlineField(rec, path) {
  if (String(path).includes(".")) {
    fail(`the item table names the reverse field \`${path}\`, and a reverse side is ONE `
      + "Brief Leg field, which is a line rather than an object. A dotted path would be a query "
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
      fail(`the item table declares \`${item.id}\` against the figure's reading, and this Leg has none `
        + "— a figure row is evaluated only on a Leg whose trace carries a figure");
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
function declaredSide(leg, item, declared, items) {
  if (item.record_field) {
    const v = figureDeclared(leg, item);
    if (item.record_field === "elements") return renderElements(v);
    const also = (item.also_declared_blocks || [])
      .map((b) => `- **the Leg's ${b}.** ${renderSide(declared[b])}`);
    return also.length
      ? [`- **the record's ${item.record_field}.** ${renderSide(v)}`, ...also].join("\n")
      : renderSide(v);
  }
  if (item.declared_block) {
    // A BLOCK ROW MAY CARRY COMPANION BLOCKS (kogaki#1237). `already-knows`
    // judges reliance on held material while re-introducing re-activated
    // material is allowed, so the judge needs BOTH lists: each renders under
    // its own name, the row's own block first.
    const also = (item.also_declared_blocks || [])
      .map((b) => `- **the Leg's ${b}.** ${renderSide(declared[b])}`);
    return also.length
      ? [`- **the Leg's ${item.declared_block}.** ${renderSide(declared[item.declared_block])}`, ...also].join("\n")
      : renderSide(declared[item.declared_block]);
  }
  if (item.declared_source === "passage") {
    return "(the passage and the figure beside it, quoted below — both sides of this pair were "
      + "read from them)";
  }
  return renderSide(null);
}

// AN ENTRY OF A REVERSE OUTLINE LIST IS AN OBJECT CARRYING ITS OWN WORDS.
// `claims`, `introduces` and `concession` each read back as `{ text }` — the
// Brief's own line, verbatim. There is no span: a span was the outlined
// record's coordinate, and a Brief Leg field does not carry one, so an entry
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
    // Brief Leg block and a Brief field carries no draft coordinate, so the
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

// EVERY (Leg, item) PAIR, computed fresh. Mechanical items are decided here;
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
  // SCOPED TO `run.legs`, NEVER TO THE WHOLE TRACE (kogaki#1165). An
  // ordinary run's `run.legs` already names every Leg `open` found, so this
  // filter is a no-op there; a term-list change path's run names only the
  // Legs Lint named, and this is the one site that used to re-derive the
  // whole Draft's Leg set straight from the trace and silently widen a
  // scoped run back out to every Leg at the join.
  const { legs: allLegs } = resolveInputs(draft);
  const scopedIds = new Set(run.legs.map((s) => s.leg_id));
  const legs = allLegs.filter((s) => scopedIds.has(s.leg_id));
  const bound = typeof opts.bound === "function" ? opts.bound : null;
  const carry = opts.carry || [];
  const results = [];
  const owed = [];
  const modelCalls = [];
  const mechanicalLog = [];
  const verdicts = run.verdicts || {};

  legs.forEach((leg, si) => {
    const declared = declaredFor(leg, items);
    let rec;
    try { rec = JSON.parse(readFileSync(run.outlineFields[leg.leg_id], "utf8")); }
    catch (e) { fail(`the Reverse Outline for ${leg.leg_id} is not readable (${e.message})`); }
    // THE FIGURE'S READING, WHERE THE READER MET ONE. Absent on a figureless
    // Leg, and the figure rows are not evaluated there at all — never as a
    // vacuous `holds`, which would put a figure line in a figureless Draft's log.
    let figRec = null;
    if (leg.figure) {
      const fp = (run.figureOutlineFields || {})[leg.leg_id];
      if (!fp || !existsSync(fp)) {
        fail(`leg ${leg.leg_id} renders a figure and its Reverse Outline carries no reading of it — `
          + "re-file the Leg's outline with its `figure` block, which `outline` validates and records "
          + "in the same act");
      }
      try { figRec = JSON.parse(readFileSync(fp, "utf8")); }
      catch (e) { fail(`the figure's Reverse Outline for ${leg.leg_id} is not readable (${e.message})`); }
    }
    const earlier = legs.slice(0, si);

    for (const item of items.items) {
      // A FIGURE ROW ON A FIGURELESS LEG IS NOT EVALUATED, NOT RENDERED AND
      // NOT LOGGED (kogaki#880), and the skip is FIRST — before the bound, so
      // pass two neither carries it nor demands a pass-one answer for it. A
      // vacuous `holds` would be the cheaper implementation and the wrong one:
      // it puts an answer about nothing beside answers about something, and it
      // makes the mechanical arm of the second pass's bound report coverage of
      // Legs that have no figure to cover.
      if (item.figure_only && !leg.figure) continue;
      // OUT OF BOUND: CARRIED, AND THE CHECK IS FIRST. Placed before the
      // mechanical dispatch and before any join Packet is rendered, so an
      // out-of-bound pair costs no model call and appears in neither log. A
      // carried row keeps pass one's verdict, class, reason and span and is
      // marked `carried` — a reader of the pass-two record can tell a re-judged
      // answer from a preserved one, which an unmarked copy would not allow.
      if (bound && !bound(leg.leg_id, item.id)) {
        const prev = carry.find((r) => r.leg_id === leg.leg_id && r.item === item.id);
        if (!prev) {
          fail(`the bounded second pass carries ${leg.leg_id}/${item.id} from pass one and pass `
            + "one recorded no answer for it. A carried pair with nothing to carry would render as "
            + "a verdict this run never reached; re-run `compare --draft <draft.md>` so the pair is "
            + "answered before it is carried.");
        }
        // THE SPAN IS RE-ANCHORED TO THE LEG'S CURRENT RANGE (PR #906 round 1,
        // finding 2). A carried row keeps pass one's verdict, class and reason
        // — those are readings of prose that has not moved — but NOT its
        // coordinates: a correction changes the Draft's line count, so a
        // pre-correction range rendered under the post-correction body sha
        // names whatever now sits at those numbers. That is the drifting-range
        // defect this Harness's own outline cases are built to catch, one
        // layer out. A leg-level range is coarser than the pair-level one it
        // replaces and it is TRUE, which is the trade: a true coarse
        // coordinate beats a false precise one. Pass one's own is kept beside
        // it, named as pass one's, so nothing is lost — only re-labelled.
        const reanchored = { ...prev, span: leg.lines, pass_one_span: prev.span, carried: true };
        if (Array.isArray(prev.pairs)) {
          reanchored.pairs = prev.pairs.map((x) => ({ ...x, span: leg.lines, pass_one_span: x.span }));
        }
        results.push(reanchored);
        continue;
      }
      const ctx = { declared, rec, leg, draft, earlier, items, item };

      if (item.mode === "mechanical") {
        const impl = MECHANICAL[item.id] || MECHANICAL_FIGURE[item.id];
        if (!impl) {
          fail(`the item table declares \`${item.id}\` mechanical and this Harness has no `
            + "implementation for it — a mechanical item with no check would report `holds` for "
            + "every Draft, which is the silent pass this whole comparison exists to refuse");
        }
        const r = impl(ctx);
        results.push({ leg_id: leg.leg_id, item: item.id, class: item.class,
          judged: false, ...r });
        mechanicalLog.push({ leg_id: leg.leg_id, item: item.id });
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
        results.push({ leg_id: leg.leg_id, item: item.id, class: item.class,
          judged: false, verdict: item.when_declared_absent.verdict,
          reason: item.when_declared_absent.sentence, span: leg.lines });
        mechanicalLog.push({ leg_id: leg.leg_id, item: item.id });
        continue;
      }

      const subs = [];
      if (item.mode === "per-declared") {
        // ONE PACKET PER DECLARED ENTRY, AND THE QUESTION IS RECOVERY
        // (kogaki#1132). The pair index is the DECLARED side's — `claims`'s kth
        // pair is the Leg's kth declared claim — and the reverse side is
        // everything the reader wrote for the field, whole. Surplus is not
        // judged: the Packet tells the writer to retell material it asserts
        // nothing about, so a correctly realized passage asserts MORE than its
        // declared claim by design, and the item that asked the other way round
        // failed on every Leg of the first full run.
        //
        // EACH ENTRY CARRIES THE DECLARED TEXT IT WAS ASKED ABOUT. That is what
        // lets the correction name the claim that was lost, in its own words,
        // rather than reporting that the row failed and leaving the corrector
        // to work out which of several declared claims went missing.
        const declaredEntries = declared[item.declared_block] || [];
        const reverseWhole = renderSide(rec[item.field] || []);
        declaredEntries.forEach((declaredText, i) => {
          const key = verdictKey(leg.leg_id, item.id, i);
          const file = renderJoinPacket(ws, run, pass, draft, leg, item, i,
            renderSide(declaredText), reverseWhole);
          // THE VERDICT IS READ BEFORE THE CALL IS LOGGED, so the log can name
          // the model that answered it. An unanswered call carries `model:
          // null` — owed, not judged by nobody.
          const v = verdicts[key];
          modelCalls.push({ leg_id: leg.leg_id, item: item.id, pair: i, packet: file,
            model: v ? v.model ?? null : null });
          subs.push(v
            ? { pair: i, declared: declaredText, verdict: v.verdict, reason: v.reason,
                model: v.model ?? null, span: leg.lines, judged: true }
            // AN UNANSWERED PAIR IS `judged: false` AND CARRIES NO `model`: a
            // Packet was rendered for it, and nothing has come back. `judged`
            // says a Judge ANSWERED, never that one was owed a question — an
            // owed pair that read `true` would be a claim about a call that has
            // not happened, which is the claim the missing `model` key already
            // refuses one field over.
            : { pair: i, declared: declaredText, owed: true, judged: false,
                key, packet: file, span: leg.lines });
          if (!v) owed.push({ key, leg_id: leg.leg_id, item: item.id, pair: i, packet: file });
        });
      } else {
        const key = verdictKey(leg.leg_id, item.id, null);
        const file = renderJoinPacket(ws, run, pass, draft, leg, item, null,
          declaredSide(leg, item, declared, items),
          reverseSide(item, rec, figRec));
        const v = verdicts[key];
        modelCalls.push({ leg_id: leg.leg_id, item: item.id, pair: null, packet: file,
          model: v ? v.model ?? null : null });
        subs.push(v
          ? { pair: null, verdict: v.verdict, reason: v.reason, model: v.model ?? null,
              span: leg.lines, judged: true }
          : { pair: null, owed: true, judged: false, key, packet: file, span: leg.lines });
        if (!v) owed.push({ key, leg_id: leg.leg_id, item: item.id, pair: null, packet: file });
      }

      if (!subs.length) {
        results.push({ leg_id: leg.leg_id, item: item.id, class: item.class, judged: false,
          verdict: "holds", reason: "the reverse side carries nothing for this item to disagree with",
          span: leg.lines });
        mechanicalLog.push({ leg_id: leg.leg_id, item: item.id });
        continue;
      }
      if (subs.some((s) => s.owed)) {
        results.push({ leg_id: leg.leg_id, item: item.id, class: item.class, owed: true,
          judged: false, span: leg.lines });
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
      results.push({ leg_id: leg.leg_id, item: item.id, class: item.class,
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

  return { results, owed, modelCalls, mechanicalLog, legs };
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

// ONE LINE PER (Leg, item), AND NO NUMBER IN IT THAT IS NOT A LINE NUMBER —
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
  refuseNumericReason(r, `${r.leg_id}/${r.item}`);
  const w = (s, n) => String(s).padEnd(n, " ");
  return `${w(r.leg_id, 8)}${w(r.item, 26)}${w(r.verdict, 14)}`
    + `${w(`[${r.span[0]}-${r.span[1]}]`, 14)}${r.reason}`;
}

// ---------------------------------------------------------------------------
// THE PER-LEG COMPARISON FILES ARE GONE (kogaki#1134, owner 2026-09-17), AND
// THIS REVERSES kogaki#1097 BY NAME.
//
// #1097 wrote `comparison/<leg>.md` because the surface a person debugged from
// mid-run was then the verdicts file the session had handed in, which carried
// the model's answer and nothing about what the answer meant — not the item's
// class, not whether the fail sent the Leg to correction. kogaki#1100 removed
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

  // EVERY MISSING INPUT IS NAMED IN ONE REFUSAL, BY LEG. A reviewer sent back
  // for "a missing outline" has to work out which; the Harness already knows.
  const missing = missingFor(run);
  if (missing.legs.length) {
    fail(`the join has inputs missing, so it would compare a partial review against a whole Draft `
      + `and report the gaps as agreement.\n  leg outline`
      + `${missing.legs.length === 1 ? "" : "s"}: ${missing.legs.join(", ")}`);
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
    // for every Leg.
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
      `compare: every input present — ${run.legs.length} outlined Leg(s).\n`
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
    + `compare: ${results.length} (Leg, item) pair(s) joined, `
    + `${mechanicalLog.length} decided mechanically and ${modelCalls.length} judged.\n`
    + judgedByLine(modelCalls)
    + (preserved.length
      ? `Legs sent to correction — a preserved item fails: ${[...new Set(preserved.map((r) => r.leg_id))].join(", ")}\n`
      : "No preserved item fails, so no Leg is sent to correction.\n")
    + (undecided.length
      ? "cannot-decide, listed with its pair and never rounded: "
        + undecided.map((r) => `${r.leg_id}/${r.item}`).join(", ") + "\n"
      : "")
    + `join record: ${joinPath}\n`
    + (fails.length
      ? "`check --draft <draft.md>` is pass two.\n"
      : "`close --draft <draft.md>` writes the owner record.\n"));
}

// ---------------------------------------------------------------------------
// THE CORRECTION PATH (kogaki#874). What a corrected Leg receives, the bounded
// second pass, and the drift measure.
//
// A CORRECTED LEG IS REALIZED FROM A FRESHLY RENDERED PACKET, never from the
// Packet that produced the failing prose. That is the whole answer to the
// owner's 2026-09-04 concern: the Packet's "article so far" block is the
// continuity mechanism, and a Leg corrected against its ORIGINAL Packet would
// be re-realized against prose that has since moved — so each correction would
// carry the Leg a little further from the article it actually sits in, which
// is exactly the drift the concern names. Rendering fresh makes the corrected
// Leg's input the current article, including Legs corrected earlier in the
// same pass.
//
// THE REALIZATION LANE IS ENTERED AS A SUBPROCESS, never imported. `draft.mjs`
// is the renderer that wrote the Packets this review compares against, so a
// Leg re-realized through it is realized by the same code path the original
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
// per seat; keeping an unreferenced Leg-granular owed-set would leave the next
// reader a choice between two answers to one question, and the seat-blind one
// is the answer that was wrong.
//
// What it carried that still binds, restated where the computation now lives:
// best-effort fails never send a Leg to correction — they ride along when the
// Leg is re-realized anyway, which is what the item table's class means at
// this act exactly as it means it at `close`. `failingSides` below is now the
// sole computer of it.
//
// A LOCALIZED SECTION FAIL USED TO ADD ITS TARGET LEG HERE (kogaki#873), and
// that arm is gone with the reader that produced it (kogaki#1133): the failing
// preserved items of the Leg itself are now the whole of what sends it to
// correction.

// ---------------------------------------------------------------------------
// THE FIGURE CORRECTION (kogaki#880). A failing PRESERVED figure item sends its
// Leg to correction exactly as a failing prose item does — same class rule,
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
// PROSE FIRST WHERE A LEG OWES BOTH. The figure record's whole claim for filling the
// record after the text is that the caption is stated in what the reader holds
// after reading THIS passage — so a record corrected against prose that is
// about to change is a record corrected against nothing.

// The figure rows of the table, read from it rather than spelled here: a
// runtime naming figure item ids could not be told from one restating the
// table, the same rule `pass_two` already states about the second pass's arms.
function figureItemIds(items) {
  return new Set(items.items.filter((i) => i.figure_only).map((i) => i.id));
}

// Which of a Leg's failing preserved items are the figure's, and which are the
// passage's.
function failingSides(run, items, legId) {
  const fig = figureItemIds(items);
  const rows = (run.findings || [])
    .filter((f) => f.leg_id === legId && f.verdict === "fails" && f.class === "preserved");
  return {
    prose: rows.filter((f) => !fig.has(f.item)).map((f) => f.item),
    figure: rows.filter((f) => fig.has(f.item)).map((f) => f.item),
  };
}

// The Legs owed a PASSAGE correction, in path order. A Leg whose only failing
// preserved items are the figure's is not here — its re-realization is the
// record, and `correct` without `--figure` would hand it the wrong input.
function correctionOwedProse(run, items) {
  return run.legs.map((s) => s.leg_id).filter((id) => failingSides(run, items, id).prose.length);
}

// The Legs owed a figure correction, in path order — the same order and the
// same enforcement the prose corrections run under.
function figureCorrectionOwed(run, items) {
  return run.legs.map((s) => s.leg_id).filter((id) => failingSides(run, items, id).figure.length);
}

// THE (Leg, seat) PAIRS STILL OWED A CORRECTION, in path order, prose first
// and each figure entry marked with the flag that reaches it. ONE definition
// for three readers (kogaki#945): the two `correct` reports and `check`'s
// UNCORRECTED line.
//
// THE UNCORRECTED LINE KEYED ON THE LEG ALONE until this, and that is the
// defect. `bound.corrected` is the set of Legs carrying ANY recorded
// correction, so a Leg that owed BOTH seats and received one was in it — and
// `correctionOwed(run).filter((id) => !bound.corrected.has(id))` therefore
// dropped it, reporting no UNCORRECTED line for a Leg still owing its other
// seat. That is the same silence PR #906 round 1's finding 1 repaired at the
// single-seat level, reappearing at the seat kogaki#880 introduced.
//
// The two `correct` reports already computed exactly this, twice, inline. They
// now read it from here, so a third seat cannot be added to one reader and
// missed by the others.
function seatsStillOwed(run, items) {
  const done = (seat) => new Set((run.corrections || [])
    .filter((c) => (c.seat || "prose") === seat).map((c) => c.leg_id));
  const proseDone = done("prose");
  const figureDone = done("figure");
  return [
    ...correctionOwedProse(run, items).filter((id) => !proseDone.has(id)),
    ...figureCorrectionOwed(run, items).filter((id) => !figureDone.has(id)).map((id) => `${id} (--figure)`),
  ];
}

// The evidence a figure Correction block carries: this Leg's rows, split the
// way the block renders them, restricted to the figure's own items. The held
// side is restricted the same way — what a figure correction must not break is
// the figure's other preserved items, and listing the passage's would ask the
// author of a JSON record not to break prose they are not editing.
function figureCorrectionEvidence(joinRec, items, legId) {
  const fig = figureItemIds(items);
  const rows = (joinRec.results || []).filter((r) => r.leg_id === legId && fig.has(r.item));
  return {
    failed: rows.filter((r) => r.verdict === "fails"),
    held: rows.filter((r) => r.verdict === "holds" && r.class === "preserved"),
    undecided: rows.filter((r) => r.verdict === "cannot-decide"),
  };
}

// ONE LINE PER NON-HOLDING PAIR, NAMING THE DECLARED THING RATHER THAN ITS
// INDEX (kogaki#1132). A `per-declared` row's pairs are the DECLARED entries, so
// the corrector is owed the entry's own text: "the claims item failed" does not
// say which of a Leg's claims went missing, and on a Leg declaring two it is
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

function renderFigureCorrectionBlock(leg, evidence, packet) {
  const out = [];
  out.push("# Correct the figure record — " + leg.leg_id, "",
    "This Leg's figure has already been designed once. What you hand back is a",
    "RECORD, not prose: one JSON object, the instance of this Leg's Move form,",
    "validated against `src/figure-schema.json` by the same act that validated",
    "the first one. The passage itself is not yours to change here.", "");
  out.push("## The Leg this figure belongs to", "",
    "The Packet below is this Leg's, re-rendered as it now stands. The record's",
    "elements are worded from the claims it declares, and its caption is stated",
    "in what the Leg says its reader holds afterwards.", "", packet.trim(), "");
  out.push("## The passage, as it now stands", "",
    ...numberedProse(leg).split("\n").map((l) => `    ${l}`), "");
  out.push("## The figure as the reader currently meets it", "",
    ...numberedFigure(leg).split("\n").map((l) => `    ${l}`), "",
    "Rendered by the Harness from the record below. You do not write this markup",
    "and nothing you hand back may contain any: the renderer re-runs on the",
    "record you return, which is what makes the transcription the same function",
    "every time.", "");
  out.push("## The previous record, verbatim", "",
    "```json",
    JSON.stringify(leg.figure.record_json, null, 2),
    "```", "");
  out.push("## What failed", "");
  if (!evidence.failed.length) {
    out.push("_No figure item failed on this Leg._", "");
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
    : "_No preserved figure item holds on this Leg, so this correction breaks nothing by leaving it._");
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
// what failed on this Leg, and what HELD on it as a preserved item. The second
// is not decoration — it is what the correction must not break, and a
// correction instruction that named only the failures would be asking for a
// rewrite rather than a repair.
// THE FIGURE'S ROWS ARE NOT IN THE PROSE BLOCK (kogaki#880). What failed on the
// record is repaired by editing the record, and listing it here would ask the
// author of a passage to fix something the passage cannot reach — and put it
// under a heading saying "change what the findings above name".
function correctionEvidence(joinRec, legId, items) {
  const fig = items ? figureItemIds(items) : new Set();
  const rows = (joinRec.results || []).filter((r) => r.leg_id === legId && !fig.has(r.item));
  return {
    failed: rows.filter((r) => r.verdict === "fails"),
    held: rows.filter((r) => r.verdict === "holds" && r.class === "preserved"),
    undecided: rows.filter((r) => r.verdict === "cannot-decide"),
  };
}

function renderCorrectionBlock(leg, evidence) {
  const out = [];
  out.push("", "---", "",
    "## The Correction — what this Leg must change, and what it must not", "",
    "This Leg has already been realized once. Everything above is the CURRENT",
    "Packet, re-rendered against the article as it now stands, so the \"article so",
    "far\" block above holds the preceding prose including any Leg corrected",
    "before this one in the same pass. Write from it, not from what you remember.",
    "");
  out.push("### The previous realization, verbatim", "",
    ...leg.prose.split("\n").map((l) => `> ${l}`), "");
  out.push("### What failed", "");
  if (!evidence.failed.length) {
    out.push("_Nothing failed on this Leg._", "");
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
    : "_No preserved item holds on this Leg, so this correction breaks nothing by leaving it._");
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
// concern in the form it was raised — "the more a Leg is corrected
// independently, the farther it may drift" — and neither withholds anything: a
// high change share is what the owner reads as the Leg becoming self-contained,
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
// that is always PASS ONE — `correct` refuses a Leg that pass one's join did
// not send to correction, and pass two turns a still-failing item into residue
// rather than into another correction. So the directory is `pass-1/corrections/`
// even when a `check` has already run, which is what lets a reader go from a
// pass-one finding to the input its corrector was handed. A pass number read
// off the run record here would file the same act in two places depending on
// whether `check` happened to have been run first.
function correctionInputPath(ws, run, legId) {
  return passPathAt(ws, run, 1, "corrections", `${legId}.md`);
}

// THE FIGURE CORRECTION'S TWO PHASES (kogaki#880), the same two phases the prose
// correction has: render the input, then record what came back. Between them
// the run is MID-CORRECTION on this Leg and every other act refuses by name,
// which is `requireCurrent`'s existing guard and is not re-implemented here.
function correctFigure(args, { draft, draftPath, ws, run, items, joinRec, legId, reply }) {
  const leg = resolveInputs(draft).legs.find((x) => x.leg_id === legId);
  if (!leg.figure) {
    fail(`leg ${legId} carries no figure in the Draft's trace, so there is no record to `
      + "correct. A figure enters at composition, on the Brief, and never here");
  }

  // --- phase A: render the correction input ------------------------------
  if (reply.trim() === "") {
    // THE PACKET IS RE-RENDERED FOR THE SAME REASON THE PROSE CORRECTION
    // RE-RENDERS IT: the record's elements are worded from the Leg's claims
    // and its caption from the state the Leg leaves its reader in, and both
    // are the Packet's. A record corrected against the Packet that produced the
    // failing figure would be corrected against the input already found wanting.
    const r = draftLane("packet", draft, args, ["--leg", legId]);
    const prefix = `packet ${legId}: `;
    const line = (r.stderr || "").split("\n").find((l) => l.startsWith(prefix));
    if (!line) {
      fail("the realization lane rendered a Packet and did not say where it stored it, so this "
        + "cannot show a reviewer the input the correction is written from. Its output, "
        + `verbatim:\n${(r.stderr || r.stdout || "(no output)").trim()}`);
    }
    const freshPath = line.slice(prefix.length).trim();
    if (!existsSync(freshPath)) fail(`the realization lane named a Packet at ${freshPath} and no file is there`);
    const fresh = readFileSync(freshPath, "utf8");
    const dest = passPathAt(ws, run, 1, "corrections", `${legId}.figure.md`);
    writeFileSync(dest, renderFigureCorrectionBlock(
      leg, figureCorrectionEvidence(joinRec, items, legId), fresh) + "\n");
    run.correction_inputs = run.correction_inputs || {};
    run.correction_inputs[`${legId}#figure`] = {
      path: dest, packet: freshPath, packet_sha: sha256(fresh),
      record: leg.figure.record_path, record_sha: leg.figure.record_sha,
      // THE RECORD'S OWN BYTES, NOT ONLY ITS PATH AND SHA (kogaki#1135). The
      // file at that path is overwritten by `draft.mjs figure` when the
      // correction is recorded, so the sha afterwards names a document nothing
      // holds — and a Leg whose figure regressed in pass two is restored to
      // the record the reader met, which is these bytes. The prose seat keeps
      // its previous realization for the same reason, one field over.
      record_text: readFileSync(leg.figure.record_path, "utf8"),
      rendered: leg.figure.rendered, rendered_at: new Date().toISOString(),
    };
    run.correcting = { leg_id: legId, seat: "figure", input: dest, since: new Date().toISOString() };
    writeRun(ws, run);
    process.stdout.write(
      `figure correction input: ${dest}\n`
      + "  It carries this Leg's Packet re-rendered as it now stands, the passage, the figure as\n"
      + "  the reader currently meets it, the previous record verbatim, what failed and what must\n"
      + "  go on holding.\n"
      + "Design the record again from it, then record with\n"
      + `  <record.json> | node src/review-draft.mjs correct --draft ${relative(process.cwd(), draft.path) || draft.path} --leg ${legId} --figure\n`
      + "You write no markup: `draft.mjs figure` re-validates the record and `emit` re-renders the\n"
      + "block from it, so the transcription is the same function it was the first time.\n");
    return;
  }

  // --- phase B: record the corrected record ------------------------------
  const input = (run.correction_inputs || {})[`${legId}#figure`];
  if (!input) {
    fail(`leg ${legId} has no rendered FIGURE correction input, so this record was not written `
      + `against one. Render it first:\n  node src/review-draft.mjs correct --draft `
      + `${relative(process.cwd(), draft.path) || draft.path} --leg ${legId} --figure`);
  }

  const snapDir = join(ws, "snapshots");
  mkdirSync(snapDir, { recursive: true });
  const seq = String((run.corrections || []).length + 1).padStart(2, "0");
  writeFileSync(join(snapDir, `${seq}-before-${legId}.figure.md`), draft.text);

  // THE RENDERER RE-RUNS BY CONSTRUCTION. `figure` re-validates the record
  // against src/figure-schema.json and the Move's own form — every role
  // present, no extra role, the kind the form's, a position from the closed
  // pair — and `emit` renders the block from it. Nothing here transcribes
  // anything, which is why a syntax defect in a corrected figure stays a defect
  // of src/render-figure.mjs rather than of the sitting that corrected it.
  withReplyFile(reply, `${legId}.figure.json`, (p) =>
    draftLane("figure", draft, args, ["--leg", legId, "--file", p]));
  draftLane("emit", draft, args, []);

  const after = readDraft(draftPath);
  const afterLegs = resolveInputs(after).legs;
  const corrected = afterLegs.find((s) => s.leg_id === legId);
  if (!corrected) fail(`leg ${legId} is absent from the re-emitted Draft's trace`);
  if (!corrected.figure) {
    fail(`leg ${legId} carries no figure in the re-emitted Draft — the correction was recorded `
      + "and the block did not come back, which is the drop-with-no-report case the renderer refuses");
  }
  writeFileSync(join(snapDir, `${seq}-after-${legId}.figure.md`), after.text);

  const ev = figureCorrectionEvidence(joinRec, items, legId);
  run.corrections = run.corrections || [];
  run.corrections.push({
    leg_id: legId,
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
    snapshot_before: join(snapDir, `${seq}-before-${legId}.figure.md`),
    snapshot_after: join(snapDir, `${seq}-after-${legId}.figure.md`),
    corrected_at: new Date().toISOString(),
  });

  run.body_sha = after.body_sha;
  delete run.correcting;
  delete run.pass_open_at;
  delete run.pass_cleared;
  run.legs = afterLegs.map((s) => ({
    leg_id: s.leg_id, section: s.section, section_title: s.section_title,
    lines: s.lines, packet: s.packet, packet_sha: s.packet_sha,
  }));
  // THE REVERSE OUTLINE IS DISCARDED for the same reason a prose correction discards
  // it: the blind reviewer read a figure that no longer exists, and keeping the
  // record would let pass two judge a new block against an old reading.
  delete run.outlineFields[legId];
  delete run.rendered[legId];
  writeRun(ws, run);

  const stillOwed = seatsStillOwed(run, items);
  process.stdout.write(
    `corrected: ${legId} (figure)\n`
    + `  record  ${input.record_sha}\n`
    + `       -> ${corrected.figure.record_sha}\n`
    + `  ${run.corrections[run.corrections.length - 1].block_changed}\n`
    + "  reported, never gated — what an unchanged block means is the owner's reading\n"
    + `  snapshots ${join(snapDir, `${seq}-before-${legId}.figure.md`)}\n`
    + `            ${join(snapDir, `${seq}-after-${legId}.figure.md`)}\n`
    + (stillOwed.length
      ? `still owed a correction, in path order: ${stillOwed.join(", ")}\n`
      : "every Leg pass one sent to correction has been corrected. `check --draft <draft.md>` is pass two.\n"));
}

function cmdCorrect(args) {
  const usage = "usage: review-draft correct --draft <draft.md> --leg <id> [--figure]\n"
    + "       (the corrected prose, or the corrected figure record, on standard input records it)";
  const draftPath = argString(args, "draft", usage);
  const legId = argString(args, "leg", usage);
  // THE STREAM SELECTS THE PHASE, as it does in `compare` and `check`
  // (kogaki#1100), and it is read once here so both seats see the same answer.
  const reply = readReply();
  // THE FLAG SAYS WHICH SEAT IS BEING CORRECTED, and it is a flag rather than a
  // fact derived from what failed (kogaki#880). A Leg can owe both a prose and
  // a figure correction, and the two take different inputs — prose in one and a
  // JSON record in the other — so a runtime that inferred the seat would decide
  // what form the session's file had to be in after the session wrote it.
  const figureMode = args.figure === true;
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft, legId);

  if (!run.compared_at) {
    fail("`correct` is what pass one sends a Leg to, and pass one has not completed — run "
      + "`compare --draft <draft.md>` first. A correction composed before the join has answered "
      + "would be a rewrite against findings nobody recorded.");
  }
  const known = run.legs.map((s) => s.leg_id);
  if (!known.includes(legId)) fail(`unknown leg \`${legId}\` — this Draft's Legs are ${known.join(", ")}`);

  const items = readItems();
  const owed = figureMode ? figureCorrectionOwed(run, items) : correctionOwedProse(run, items);
  if (!owed.includes(legId)) {
    const sides = failingSides(run, items, legId);
    // THE REFUSAL NAMES THE OTHER SEAT WHERE THAT IS WHY IT REFUSED. A Leg
    // owing a figure correction and asked for a prose one is not a Leg with
    // nothing owed, and reporting it as one would send a session looking for a
    // finding that is recorded and readable.
    if (!figureMode && sides.figure.length) {
      fail(`leg ${legId} carries no failing PRESERVED item of the PASSAGE, and it does carry one `
        + `of the FIGURE (${sides.figure.join(", ")}). What is re-realized there is the figure `
        + `record, not the prose:\n  node src/review-draft.mjs correct --draft `
        + `${relative(process.cwd(), draft.path) || draft.path} --leg ${legId} --figure`);
    }
    if (figureMode && sides.prose.length) {
      fail(`leg ${legId} carries no failing PRESERVED FIGURE item, and it does carry one of the `
        + `passage (${sides.prose.join(", ")}). Drop --figure to correct the prose.`);
    }
    fail(`leg ${legId} carries no failing PRESERVED ${figureMode ? "figure " : ""}item, so pass `
      + "one did not send it to correction. A best-effort fail rides along when its Leg is "
      + `re-realized anyway and never sends one here.\n  owed: ${owed.length ? owed.join(", ") : "(none — no Leg is owed a correction)"}`);
  }
  // PATH ORDER IS ENFORCED, not requested. Corrections run in path order so
  // each later one sees the earlier ones in its own "article so far" block —
  // which is the mechanism the whole correction path rests on, and a session
  // correcting out of order would silently get the opposite: a Leg realized
  // against prose that is about to change under it.
  //
  // ORDER IS TRACKED PER SEAT (kogaki#880): a Leg's recorded figure correction
  // does not discharge the prose correction owed on an earlier Leg, and the
  // seat a record carries is what says which it discharged.
  const seat = figureMode ? "figure" : "prose";
  const already = new Set((run.corrections || [])
    .filter((c) => (c.seat || "prose") === seat).map((c) => c.leg_id));
  const earlier = owed.slice(0, owed.indexOf(legId)).filter((id) => !already.has(id));
  if (earlier.length) {
    fail(`corrections run in path order and leg ${legId} is not next — ${earlier.join(", ")} `
      + `${earlier.length === 1 ? "is" : "are"} owed a ${seat} correction first. Each correction `
      + "re-renders the next Leg's Packet against the article as it then stands, so correcting out "
      + "of order realizes a Leg against prose that is about to move under it.");
  }
  // THE PASSAGE IS CORRECTED BEFORE THE FIGURE IT CARRIES, and this is the
  // figure record's
  // own ordering rather than a convention chosen here: the record's caption is
  // stated in what the reader holds after reading THIS passage, and its
  // elements are worded against prose that must already exist. A record
  // corrected against prose that is about to change is corrected against
  // nothing.
  if (figureMode) {
    const proseOwed = correctionOwedProse(run, items).includes(legId);
    const proseDone = (run.corrections || []).some((c) => c.leg_id === legId && (c.seat || "prose") === "prose");
    if (proseOwed && !proseDone) {
      fail(`leg ${legId} owes a correction on its PASSAGE as well, and the passage is corrected `
        + "first: the record's caption is stated in what the reader holds after reading this "
        + "passage, and its elements are worded from prose that must already exist.\n"
        + `  node src/review-draft.mjs correct --draft ${relative(process.cwd(), draft.path) || draft.path} --leg ${legId}`);
    }
  }

  const joinRec = readJoin(ws);
  if (figureMode) { correctFigure(args, { draft, draftPath, ws, run, items, joinRec, legId, reply }); return; }

  // --- phase A: render the correction input ------------------------------
  if (reply.trim() === "") {
    // RESOLVED BEFORE THE LANE IS ENTERED, and only here. Phase A still holds a
    // consistent Draft — the trace and every Packet agree — and re-rendering
    // this Leg's Packet is what ends that agreement, so the previous prose is
    // read out first and recorded. Phase B reads it back from that record
    // rather than resolving a Draft it knows is mid-correction.
    const leg = resolveInputs(draft).legs.find((x) => x.leg_id === legId);
    const r = draftLane("packet", draft, args, ["--leg", legId]);
    // THE LANE IS ASKED WHERE IT STORED THE PACKET, never guessed at from the
    // workspace layout. A path composed here would be a second answer to a
    // question the renderer already answers, and the two would diverge the
    // moment the draft lane's workspace rule changed.
    const prefix = `packet ${legId}: `;
    const line = (r.stderr || "").split("\n").find((l) => l.startsWith(prefix));
    if (!line) {
      fail("the realization lane rendered a Packet and did not say where it stored it, so this "
        + "cannot show a reviewer the input the correction is written from. Its output, "
        + `verbatim:\n${(r.stderr || r.stdout || "(no output)").trim()}`);
    }
    const freshPath = line.slice(prefix.length).trim();
    if (!existsSync(freshPath)) fail(`the realization lane named a Packet at ${freshPath} and no file is there`);
    const fresh = readFileSync(freshPath, "utf8");
    const block = renderCorrectionBlock(leg, correctionEvidence(joinRec, legId, items));
    const dest = correctionInputPath(ws, run, legId);
    writeFileSync(dest, (fresh.endsWith("\n") ? fresh : fresh + "\n") + block);
    run.correction_inputs = run.correction_inputs || {};
    run.correction_inputs[legId] = {
      path: dest, packet: freshPath, packet_sha: sha256(fresh),
      prose: leg.prose, rendered_at: new Date().toISOString(),
    };
    run.correcting = { leg_id: legId, input: dest, since: new Date().toISOString() };
    writeRun(ws, run);
    process.stdout.write(
      `correction input: ${dest}\n`
      + "  It is the Packet re-rendered against the article AS IT NOW STANDS — the \"article so\n"
      + "  far\" block holds the current preceding prose, corrections included — with one\n"
      + "  Correction block appended carrying the previous realization, what failed, and what\n"
      + "  must go on holding.\n"
      + `Realize the Leg from it, then record with\n`
      + `  <the corrected prose> | node src/review-draft.mjs correct --draft ${relative(process.cwd(), draft.path) || draft.path} --leg ${legId}\n`
      + "Until then this run is MID-CORRECTION on this Leg: its Packet is the freshly rendered\n"
      + "one and its prose is still the old realization, so every other act refuses by name\n"
      + "rather than reporting a comparison between prose and an input that did not produce it.\n");
    return;
  }

  // --- phase B: record the corrected realization -------------------------
  const input = (run.correction_inputs || {})[legId];
  // THE RENDERED-INPUT GUARD, the same one `outline` has and for the same
  // reason. Prose handed back for a Leg whose correction input was never
  // rendered was written against something else — the old Packet, or the
  // finding text alone — and afterwards there is no way to tell which.
  if (!input) {
    fail(`leg ${legId} has no rendered correction input, so this prose was not written against `
      + `one. Render it first:\n  node src/review-draft.mjs correct --draft `
      + `${relative(process.cwd(), draft.path) || draft.path} --leg ${legId}`);
  }

  // THE PREVIOUS PROSE AND THE FRESH PACKET COME FROM THE PHASE-A RECORD, not
  // from the Draft. The Draft is mid-correction by construction here — its
  // trace names the re-rendered Packet beside prose the old one produced — so
  // resolving it would refuse on a state this act exists to end.
  const before = input.prose;
  const declared = declaredFor({ leg_id: legId, packet_path: input.packet }, items);
  const packetLines = driftBlocks(declared, items);

  // SNAPSHOTS LAND IN THE REVIEW WORKSPACE, before and after each correction —
  // the Draft is the artifact and this is the only record of what a correction
  // moved. Written before the lane is entered, so a correction the lane refuses
  // still leaves the before-state.
  const snapDir = join(ws, "snapshots");
  mkdirSync(snapDir, { recursive: true });
  const seq = String((run.corrections || []).length + 1).padStart(2, "0");
  writeFileSync(join(snapDir, `${seq}-before-${legId}.md`), draft.text);

  withReplyFile(reply, `${legId}.prose.md`, (p) =>
    draftLane("section", draft, args, ["--leg", legId, "--file", p]));
  draftLane("emit", draft, args, []);

  // The Draft is a different document now: new prose, new line ranges, and a
  // new body sha. Re-read it rather than patching the record — the trace is the
  // join key and `emit` is what writes it.
  const after = readDraft(draftPath);
  const afterLegs = resolveInputs(after).legs;
  const corrected = afterLegs.find((s) => s.leg_id === legId);
  if (!corrected) fail(`leg ${legId} is absent from the re-emitted Draft's trace`);
  writeFileSync(join(snapDir, `${seq}-after-${legId}.md`), after.text);

  const drift = driftOf(before, corrected.prose, packetLines, items.thresholds.verbatim_overlap_words);
  const ev = correctionEvidence(joinRec, legId, items);
  run.corrections = run.corrections || [];
  run.corrections.push({
    leg_id: legId,
    seat: "prose",
    // PASS ONE, AND IT IS THE PASS WHOSE VERDICTS SENT THE LEG HERE rather
    // than whichever pass the run has reached — the same reading
    // `correctionInputPath` files the input under.
    pass: 1,
    what: `re-realized from a Packet re-rendered against the article as it stood, with a Correction `
      + `block carrying ${ev.failed.length} failed item(s) and ${ev.held.length} held preserved item(s)`,
    failed_items: ev.failed.map((f) => f.item),
    held_preserved: ev.held.map((h) => h.item),
    input: input.path,
    packet_sha: input.packet_sha,
    snapshot_before: join(snapDir, `${seq}-before-${legId}.md`),
    snapshot_after: join(snapDir, `${seq}-after-${legId}.md`),
    corrected_at: new Date().toISOString(),
    ...drift,
  });

  // The run record follows the Draft. And the corrected Leg's Reverse Outline is
  // discarded: the blind reviewer read prose that no longer exists, so keeping
  // the record would let pass two re-judge new prose against an old reading —
  // which is the failure mode this whole Harness is about, one layer in.
  run.body_sha = after.body_sha;
  delete run.correcting;
  // A CORRECTION RE-OPENS THE NEXT PASS. Its bound gains this Leg and this
  // Leg's successor, and the answers already given for pairs the widened bound
  // now covers were given about prose that has since moved.
  delete run.pass_open_at;
  delete run.pass_cleared;
  run.legs = afterLegs.map((s) => ({
    leg_id: s.leg_id, section: s.section, section_title: s.section_title,
    lines: s.lines, packet: s.packet, packet_sha: s.packet_sha,
  }));
  delete run.outlineFields[legId];
  delete run.rendered[legId];
  writeRun(ws, run);

  const stillOwed = seatsStillOwed(run, items);
  process.stdout.write(
    `corrected: ${legId}\n`
    + `  drift   ${drift.change_share}\n`
    + `          ${drift.packet_overlap}\n`
    + `  reported, never gated — what a high share means is the owner's reading\n`
    + `  snapshots ${join(snapDir, `${seq}-before-${legId}.md`)}\n`
    + `            ${join(snapDir, `${seq}-after-${legId}.md`)}\n`
    + (stillOwed.length
      ? `still owed a correction, in path order: ${stillOwed.join(", ")}\n`
      : "every Leg pass one sent to correction has been corrected. `check --draft <draft.md>` is pass two.\n"));
}

// THE SECOND PASS'S BOUND. Three arms, and the item ids come from the table
// rather than from this file (see `pass_two` there):
//
//   - a corrected Leg, on its own failed items and its held preserved items;
//   - the Leg immediately AFTER each corrected Leg, on the continuity items
//     the table names — the correction moved the prose that Leg continues
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
  // table owns: when `restates-earlier-leg` left under the hygiene decline the
  // count went to one, and a run whose bound was correct refused on the number.
  // What the refusal is actually for is an EMPTY arm — pass two over the
  // corrections alone, reporting continuity it never looked at — so that is
  // what it now says.
  const declaredSuccessor = (items.pass_two || {}).successor_items;
  if (!Array.isArray(declaredSuccessor) || declaredSuccessor.length === 0) {
    fail("the item table declares no `pass_two.successor_items`, and the bounded second pass "
      + "re-checks each corrected Leg's successor on the continuity items it names. A bound with "
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
  const order = run.legs.map((s) => s.leg_id);
  const corrected = new Set((run.corrections || []).map((c) => c.leg_id));
  const successors = new Set();
  for (const id of corrected) {
    const i = order.indexOf(id);
    if (i !== -1 && i + 1 < order.length) successors.add(order[i + 1]);
  }
  const own = new Map();
  for (const c of run.corrections || []) {
    const set = own.get(c.leg_id) || new Set();
    for (const it of [...(c.failed_items || []), ...(c.held_preserved || [])]) set.add(it);
    own.set(c.leg_id, set);
  }
  const inBound = (legId, itemId) => mechanical.has(itemId)
    || (own.has(legId) && own.get(legId).has(itemId))
    || (successors.has(legId) && declaredSuccessor.includes(itemId));
  return { inBound, corrected, successors, mechanical, successorItems: declaredSuccessor };
}

// ---------------------------------------------------------------------------
// THE REGRESSION GUARD, AND THE TWO PASSES SIDE BY SIDE (kogaki#1135).
//
// WHAT WAS OBSERVED. In the first full review run, a corrected Leg FAILED in
// pass two an item it had HELD in pass one. The Harness recorded that as
// residue, indistinguishable from an item that failed in both passes, and
// nothing put the Leg's pass-one prose back — so the run's product was an
// article the review had made worse on a dimension the review itself measured,
// reported as an item for the owner to classify.
//
// THE OWNER'S RULING (2026-09-17): `check` REFUSES A REGRESSION. The Leg is
// restored to the prose it carried in pass one, through the realization lane
// that wrote it, and the item the correction was made for returns to residue as
// still failing — which is the true report: the correction was attempted, it
// broke something that held, and the state the run ends in is the state it
// started from with the original finding intact.
//
// ONLY THE REGRESSED LEG IS RESTORED, and later corrected Legs are neither
// restored nor marked. Continuity between Legs was settled at Reader Path
// design and holds while a Leg is unchanged; ReviewDraft is not responsible for
// Leg-to-Leg continuity, so a restore that reached forward would be this
// Harness answering a question the Reader Path owns.
//
// THE CORRECTION INPUT IS UNCHANGED. The owner weighed an explicit
// edit-instruction stage and withdrew it: it would make some role responsible
// for repair advice whose quality nothing guarantees. A failure reason from the
// round trip is external feedback and stays what the corrector is handed.

// PASS ONE'S ANSWER PER (Leg, item, pair), read off the pass-one join record
// rather than recomputed. A row with `pairs` answers per pair; a row the
// Harness decided carries its answer on the row itself and has none.
function passOneVerdicts(priorJoin) {
  const m = new Map();
  for (const r of priorJoin.results || []) {
    if (Array.isArray(r.pairs) && r.pairs.length) {
      for (const p of r.pairs) {
        m.set(verdictKey(r.leg_id, r.item, p.pair), { ...p, class: r.class, item: r.item, leg_id: r.leg_id });
      }
    } else {
      m.set(verdictKey(r.leg_id, r.item, r.pair === undefined ? null : r.pair), r);
    }
  }
  return m;
}

// THE PAIRS A CORRECTED LEG LOST. Computed from the two records rather than
// from the correction's own `held_preserved` list, which names ITEMS and is
// per seat: the unit the restore turns on is the pair, and the two records are
// where a pair's two readings sit. The class rule is the one that decides every
// other consequence in this Harness — a PRESERVED item's fail is what sends a
// Leg to correction and what becomes residue, so it is what a regression is
// measured on. A best-effort item that stops holding rides along exactly as its
// fail does.
function regressedPairs(run, priorJoin, results) {
  const corrected = new Set((run.corrections || []).map((c) => c.leg_id));
  const one = passOneVerdicts(priorJoin);
  const out = [];
  for (const r of results) {
    if (r.carried || r.owed || !corrected.has(r.leg_id) || r.class !== "preserved") continue;
    const pairs = Array.isArray(r.pairs) && r.pairs.length
      ? r.pairs
      : [{ pair: r.pair === undefined ? null : r.pair, verdict: r.verdict, reason: r.reason }];
    for (const p of pairs) {
      const key = verdictKey(r.leg_id, r.item, p.pair);
      const before = one.get(key);
      if (!before || before.verdict !== "holds" || p.verdict !== "fails") continue;
      out.push({ key, leg_id: r.leg_id, item: r.item, pair: p.pair === undefined ? null : p.pair,
        pass_1: "holds", pass_2: "fails", reason: p.reason });
    }
  }
  return out;
}

// RESTORE ONE LEG, THROUGH THE REALIZATION LANE. The same door `correct` used
// to move the prose is the door that moves it back — a restore that wrote the
// Draft here would be a second writer of the trace, which is the reason
// `correct` enters the lane as a subprocess in the first place.
//
// EVERY SEAT THE LEG WAS CORRECTED IN GOES BACK, prose before figure, in the
// order `correct` itself enforces and for its reason: the record's caption is
// stated in what the reader holds after reading the passage. A Leg corrected
// in one seat restores one.
//
// PASS ONE'S READING COMES BACK WITH THE PROSE. The Reverse Outline pointer
// returns to pass one's file and pass one's judged answers are written back
// into the run's verdicts, because the prose those answers were given on is the
// prose the Draft now carries again. Leaving pass two's answers beside restored
// prose would be the defect this Harness exists to refuse — a recorded reading
// about text that is gone — with the two halves swapped.
function restoreRegressedLeg(args, { draft, draftPath, ws, run, legId, regressed, passTwoRows, priorJoin }) {
  const inputs = run.correction_inputs || {};
  const seats = (run.corrections || []).filter((c) => c.leg_id === legId)
    .map((c) => c.seat || "prose");
  const ordered = [...new Set(["prose", "figure"].filter((s) => seats.includes(s)))];
  const snapDir = join(ws, "snapshots");
  mkdirSync(snapDir, { recursive: true });
  const seq = String((run.restores || []).length + 1).padStart(2, "0");
  const before = join(snapDir, `r${seq}-before-restore-${legId}.md`);
  writeFileSync(before, draft.text);

  for (const seat of ordered) {
    if (seat === "prose") {
      const rec = inputs[legId];
      // A REFUSAL, NEVER A SILENT SKIP. `correct` phase A reads the previous
      // prose out while the Draft is still consistent and records it; a run
      // whose record does not carry it cannot be put back, and continuing
      // would leave the regressed prose in the article under a record saying
      // it was restored.
      if (!rec || typeof rec.prose !== "string") {
        fail(`leg ${legId} failed in pass two an item it held in pass one, and this run's record `
          + "carries no copy of the prose it held that item on, so there is nothing to restore it "
          + "to. `correct` records the previous realization when it renders the correction input; a "
          + "run whose record predates that cannot be restored, and re-opening the review on the "
          + "current article is what starts one that can.");
      }
      withReplyFile(rec.prose.endsWith("\n") ? rec.prose : rec.prose + "\n", `${legId}.prose.md`,
        (p) => draftLane("section", draft, args, ["--leg", legId, "--file", p]));
    } else {
      const rec = inputs[`${legId}#figure`];
      if (!rec || typeof rec.record_text !== "string") {
        fail(`leg ${legId}'s FIGURE was corrected and regressed in pass two, and this run's `
          + "record carries no copy of the figure record the reader met, so there is nothing to "
          + "restore it to. Re-open the review on the current article.");
      }
      withReplyFile(rec.record_text, `${legId}.figure.json`,
        (p) => draftLane("figure", draft, args, ["--leg", legId, "--file", p]));
    }
  }
  draftLane("emit", draft, args, []);

  const after = readDraft(draftPath);
  const afterLegs = resolveInputs(after).legs;
  const restored = afterLegs.find((s) => s.leg_id === legId);
  if (!restored) fail(`leg ${legId} is absent from the re-emitted Draft's trace after its restore`);
  // THE RESTORE IS CHECKED RATHER THAN CLAIMED. The lane re-assembles the body,
  // and prose that came back different from the prose handed in would leave the
  // run reporting a restore it did not make — the one failure this act cannot
  // be allowed to make quietly, since everything downstream now reads pass
  // one's verdicts against it.
  if (ordered.includes("prose") && restored.prose.trim() !== String(inputs[legId].prose).trim()) {
    fail(`leg ${legId} was handed its pass-one prose and the re-emitted Draft carries something `
      + "else, so the restore did not land. Nothing further is recorded: pass one's verdicts would "
      + "otherwise be read against prose they were not given on.");
  }
  writeFileSync(join(snapDir, `r${seq}-after-restore-${legId}.md`), after.text);

  run.body_sha = after.body_sha;
  run.legs = afterLegs.map((s) => ({
    leg_id: s.leg_id, section: s.section, section_title: s.section_title,
    lines: s.lines, packet: s.packet, packet_sha: s.packet_sha,
  }));
  run.outlineFields[legId] = passReadPath(ws, 1, "outline", `${legId}.json`);
  if ((run.figureOutlineFields || {})[legId]) {
    run.figureOutlineFields[legId] = passReadPath(ws, 1, "outline", `${legId}.figure.json`);
  }
  const one = passOneVerdicts(priorJoin);
  run.verdicts = run.verdicts || {};
  let reinstated = 0;
  for (const [key, v] of one) {
    if (v.leg_id !== undefined && v.leg_id !== legId) continue;
    if (!key.startsWith(`${legId}/`)) continue;
    // ONLY A JUDGED ANSWER IS WRITTEN BACK. A mechanical item, a stated absence
    // and an empty reverse side are COMPUTED from the Draft on every build, so
    // recording one as a verdict would replace a fact with a copy of itself
    // taken at another time — which `recordVerdicts` refuses by name when a
    // session tries it.
    if (v.judged !== true) continue;
    run.verdicts[key] = { key, leg_id: legId, item: v.item, pair: v.pair === undefined ? null : v.pair,
      verdict: v.verdict, reason: v.reason, model: v.model ?? null };
    reinstated++;
  }

  run.restores = run.restores || [];
  run.restores.push({
    leg_id: legId,
    seats: ordered,
    pass: 2,
    what: `restored to the prose this Leg carried in pass one, through the realization lane, `
      + `because pass two failed ${regressed.length} item pair(s) it had held`,
    regressed: regressed.map((r) => ({ item: r.item, pair: r.pair, pass_1: r.pass_1,
      pass_2: r.pass_2, reason: r.reason })),
    // PASS TWO'S OWN ANSWERS FOR THIS LEG, KEPT. They are not the run's
    // reading any more — the prose they were given on is gone — and they are
    // the evidence that the restore happened at all, which is what `passes.json`
    // renders in its `pass_2` column for these rows.
    pass_two_rows: passTwoRows,
    verdicts_reinstated: reinstated,
    snapshot_before: before,
    snapshot_after: join(snapDir, `r${seq}-after-restore-${legId}.md`),
    restored_at: new Date().toISOString(),
  });
  return after;
}

// THE TWO PASSES SIDE BY SIDE, ONE ROW PER (Leg, item, pair) — `passes.json`
// at the run root (kogaki#1135). Comparing the passes meant reading
// `pass-1/join.json` and `pass-2/check.json` side by side by hand, and the
// question a reader actually has of them — what did this pass DO to this pair —
// is one word that neither record carries.
//
// JSON, NOT MARKDOWN, by the owner's ruling: it is a derived record for reading
// against the two it is derived from, and the prose surface a person reads is
// `review.md`.
//
// THE ROWS ARE PASS ONE'S KEYS. Pass one is the unbounded join over every Leg,
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
        for (const p of r.pairs) out.push([verdictKey(r.leg_id, r.item, p.pair), p, r]);
      } else {
        out.push([verdictKey(r.leg_id, r.item, r.pair === undefined ? null : r.pair), r, r]);
      }
    }
    return out;
  };
  for (const [key, p, r] of rowsOf(results)) {
    two.set(key, p);
    if (r.carried) carried.add(key);
  }
  // A RESTORED LEG'S `pass_2` IS THE ANSWER PASS TWO GAVE, not the pass-one
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
    rows.push({ leg_id: before.leg_id ?? key.split("/")[0], item: before.item,
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
  // `let`, BECAUSE THE RESTORE RE-READS IT (kogaki#1135). A regressed Leg is
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
      + "Pass two re-runs outline and the join only for the corrected Legs, their successors' "
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
  // cleared verdicts over the same corrected Legs — rather than starting a
  // third. So a re-entry sets 2 again, and its re-rendered inputs land beside
  // the ones it is replacing, which is within-pass and is what `correct`
  // discarding the Reverse Outline already means. A genuine third pass would
  // be a third act, and it gets `pass-3/` with nothing else moving.
  if (!run.pass_open_at) {
    const verdicts = run.verdicts || {};
    let cleared = 0;
    for (const key of Object.keys(verdicts)) {
      const call = (priorJoin.model_calls || []).find((c) => verdictKey(c.leg_id, c.item, c.pair) === key);
      if (call && bound.inBound(call.leg_id, call.item)) { delete verdicts[key]; cleared++; }
    }
    run.verdicts = verdicts;
    run.pass = 2;
    run.pass_open_at = new Date().toISOString();
    run.pass_cleared = cleared;
    writeRun(ws, run);
  }

  // REVERSE OUTLINING IS RE-RUN FOR THE CORRECTED LEGS AND FOR NO OTHERS. `correct`
  // discarded each corrected Leg's Reverse Outline because the reviewer read
  // prose that no longer exists; this renders the input again and refuses until
  // it comes back, which is the same blind round trip pass one made and not a
  // cheaper stand-in for it.
  const legs = resolveInputs(draft).legs;
  const owedOutline = [...bound.corrected].filter((id) => !run.outlineFields[id]);
  if (owedOutline.length) {
    const order = run.legs.map((s) => s.leg_id);
    owedOutline.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const id of owedOutline) {
      if (run.rendered[id]) continue;
      run.rendered[id] = renderReverseOutlineInput(ws, run, draft, legs.find((s) => s.leg_id === id), legs);
    }
    writeRun(ws, run);
    fail(`pass two re-runs Reverse Outlining for every corrected Leg, and `
      + `${owedOutline.length} ${owedOutline.length === 1 ? "is" : "are"} outstanding. The prose `
      + "these Legs carry now is not the prose the first Reverse Outline read, so the recorded reading is "
      + `about text that is gone.\n`
      + owedOutline.map((id) => `  ${id}  ${run.rendered[id]}`).join("\n") + "\n"
      + "Read each blind and record it with `<reverse outline> | outline --draft <draft.md> --leg <id>`, "
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
  // and a Leg restored on a partial reading would be put back for a regression
  // the rest of the pass might not have found — and the restore is not an act
  // that can be taken twice.
  //
  // A LEG ALREADY RESTORED IS NOT RESTORED AGAIN. Verdicts are revisable by
  // design, so a later answer can fail the same pair a second time; the prose
  // is already pass one's by then, and a second restore would write a second
  // record of one event.
  const restoredAlready = new Set((run.restores || []).map((r) => r.leg_id));
  let restoredNow = [];
  if (pass.owed.length === 0) {
    const regressed = regressedPairs(run, priorJoin, pass.results)
      .filter((r) => !restoredAlready.has(r.leg_id));
    // IN PATH ORDER, the order every act that moves prose runs in.
    const order = run.legs.map((s) => s.leg_id);
    const legs = [...new Set(regressed.map((r) => r.leg_id))]
      .sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const legId of legs) {
      draft = restoreRegressedLeg(args, {
        draft, draftPath, ws, run, legId, priorJoin,
        regressed: regressed.filter((r) => r.leg_id === legId),
        passTwoRows: pass.results.filter((r) => r.leg_id === legId),
      });
      restoredNow.push(legId);
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
  const restoredLegs = new Set((run.restores || []).map((r) => r.leg_id));
  // A ROW ON A RESTORED LEG SAYS SO. Its verdict is pass one's and its prose
  // is pass one's, and a reader who could not tell it from a pair pass two
  // re-judged and found holding would read the regression as never having
  // happened.
  for (const r of pass.results) if (restoredLegs.has(r.leg_id)) r.restored = true;

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
    // which Legs and items pass two actually re-judged, which is what makes
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
    // one's verdicts on a corrected Leg, and without this line the only
    // reading of that is a second pass that agreed with the first.
    restores: (run.restores || []).map((r) => ({
      leg_id: r.leg_id, seats: r.seats, regressed: r.regressed,
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
      `check: pass two, bounded — ${bound.corrected.size} corrected Leg(s), `
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
  // survived, a carried one says its Leg was never corrected so nothing
  // re-read it.
  run.residue = run.findings
    .filter((f) => f.verdict === "fails" && f.class === "preserved")
    .map((f) => ({
      leg_id: f.leg_id, item: f.item,
      // WHAT THE OWNER RECORD'S POINTERS ARE COMPOSED FROM, kept on the row: the
      // pass that read it (a carried row is pass one's whatever pass the run
      // reached) and whether a judge was handed a Packet for the chosen pair.
      pair: f.pair, carried: Boolean(f.carried), judged: chosenJudged(f),
      // A RESTORED LEG'S RESIDUE SAYS WHICH PROSE IT IS ABOUT (kogaki#1135).
      // Its Leg was corrected and the correction was UNDONE, so "still failing
      // after pass two" is true of the item and silent about the article: the
      // prose the owner will open is pass one's, and the correction that was
      // meant to fix this item is not in it.
      ...(f.restored ? { restored: true } : {}),
      why: f.carried
        ? `${f.reason} — carried from pass one and NOT re-judged: this Leg was not corrected, `
          + "so nothing in pass two read it again"
        : (f.restored
          ? `${f.reason} — still failing, and the correction made for it was UNDONE: pass two `
            + "failed an item this Leg had held, so the Leg was restored to its pass-one prose "
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
  // PER SEAT, NOT PER LEG (kogaki#945). `bound.corrected` holds every Leg
  // carrying ANY correction, so keying this line on it reported nothing for a
  // Leg that owed both seats and received one — the seat still owed went
  // unnamed while its preserved fails were carried as residue.
  const uncorrected = seatsStillOwed(run, items);
  process.stdout.write(
    results.filter((r) => !r.carried).map(comparisonLine).join("\n") + "\n\n"
    + `check: pass two over ${results.filter((r) => !r.carried).length} re-judged (Leg, item) pair(s); `
    + `${results.filter((r) => r.carried).length} carried unchanged from pass one.\n`
    + `  corrected Legs      ${[...bound.corrected].join(", ") || "(none)"}\n`
    + `  successors re-checked ${[...bound.successors].join(", ") || "(none)"} on ${bound.successorItems.join(", ")}\n`
    + `  mechanical items      re-run over every Leg\n`
    + `${mechanicalLog.length} pair(s) decided mechanically and ${judged} judged.\n`
    + judgedByLine(modelCalls)
    + (uncorrected.length
      ? `UNCORRECTED — pass one sent these to correction and they are still owed: ${uncorrected.join(", ")}.\n`
        + "  An entry marked `(--figure)` is the figure seat; the rest are the passage. A Leg can\n"
        + "  appear on both, and a Leg that received one seat still appears for the other.\n"
        + "  Their preserved fails are residue CARRIED from pass one, not re-judged by this pass;\n"
        + "  the owner record says so per line. `correct --leg <id> [--figure]` is the act that changes that.\n"
      : "")
    + (restoredNow.length
      ? `RESTORED — pass two failed an item these Legs had HELD in pass one, so each is back at `
        + `its pass-one prose: ${restoredNow.join(", ")}.\n`
        + "  The correction was undone, not adjusted, and the item it was made for is residue\n"
        + "  again. Only the regressed Leg moved: a later corrected Leg keeps its corrected\n"
        + "  prose and carries no mark, because Leg-to-Leg continuity is the Reader Path's and\n"
        + "  not this Harness's.\n"
        + (run.restores || []).filter((r) => restoredNow.includes(r.leg_id))
          .map((r) => `  ${r.leg_id}  held then failed: `
            + `${r.regressed.map((x) => x.item).join(", ")}\n`
            + `          snapshots ${r.snapshot_before}\n`
            + `                    ${r.snapshot_after}\n`).join("")
      : "")
    + (run.residue.length
      ? `residue — preserved item(s) reaching the owner to classify: `
        + `${run.residue.map((r) => `${r.leg_id}/${r.item}`).join(", ")}\n`
      : "no preserved item fails after pass two, so the residue is empty.\n")
    + `check record: ${joinPath}\n`
    + `both passes:  ${passesPath} — one row per Leg, item and pair, with each pass's\n`
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
// corrected Legs, so a successor Leg's continuity item is judged in pass two
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
// THE POINTER FOLLOWS THE ROW'S OWN SIDE, NEVER THE LEG ALONE (PR #1024 round
// 1). A figure row's reverse side is the FIGURE's Reverse Outline —
// `outline/<leg>.figure.json`, written in the record's field names — and the
// passage's `outline/<leg>.json` carries none of the reading such a verdict was
// given on. Composing one pointer per Leg sent the owner to the wrong artifact
// for every `figure_only` row, which is the class PR #1004 round 2 repaired for
// the other rows. `figureIds` is read from the item table rather than spelled
// here, for the reason `figureItemIds` already states about itself.
function findingEvidencePaths(ws, run, f, figureIds = new Set(), recordDir) {
  if (!f.leg_id) return [];
  const pass = evidencePass(run, f);
  const rel = (...a) => relative(recordDir, join(ws, `pass-${pass}`, ...a))
    || join(ws, `pass-${pass}`, ...a);
  const isFigure = figureIds.has(f.item);
  const base = isFigure ? `${f.leg_id}.figure.json` : `${f.leg_id}.json`;
  const recorded = isFigure ? (run.figureOutlineFields || {}) : (run.outlineFields || {});
  const outlineFile = f.carried
    ? join(ws, "pass-1", "outline", base)
    : (recorded[f.leg_id] || join(ws, `pass-${pass}`, "outline", base));
  const label = isFigure ? "the figure's Reverse Outline" : "Reverse Outline";
  const out = [`  - ${label}: \`${relative(recordDir, outlineFile) || outlineFile}\``];
  if (chosenJudged(f)) {
    const name = f.pair === null || f.pair === undefined
      ? `${f.leg_id}.${f.item}.md` : `${f.leg_id}.${f.item}.${f.pair}.md`;
    out.push(`  - the pair the judge saw: \`${rel("join", name)}\``);
  } else {
    out.push("  - the pair the judge saw: none — this line was not a judge's answer to a rendered "
      + `Packet; \`${rel(pass === 1 ? "join.json" : "check.json")}\` records how it was decided`);
  }
  return out;
}

function evidenceLines(ws, run, recordDir) {
  const rel = (...a) => relative(recordDir, join(ws, ...a)) || join(ws, ...a);
  const out = [
    `- **Pass 1 — \`compare\`.** \`${rel("pass-1")}/\``,
    `  - \`outline-input/<leg>.md\` — what the blind reviewer was handed`,
    `  - \`outline/<leg>.json\` — what they wrote back`,
    `  - \`join/<leg>.<item>[.<pair>].md\` — the pair each verdict was given on`,
    `  - \`corrections/<leg>.md\` — the input each correction was written from`,
    // THE ONE RECORD A READER DEBUGGING MID-RUN REACHES FOR (kogaki#1134). The
    // `comparison/<leg>.md` files that stood beside it until kogaki#1134 were a
    // legend plus one line per pair restating this record; the class, the
    // verdict, the reason, the model and the span are all on the row here.
    `  - \`join.json\` — pass one's verdicts with each row's class, model and span,`,
    `    and which pairs were decided mechanically`,
  ];
  if (run.checked_at || currentPass(run) > 1) {
    out.push(
      `- **Pass 2 — \`check\`.** \`${rel("pass-2")}/\``,
      `  - \`outline-input/<leg>.md\` and \`outline/<leg>.json\` — the corrected Legs, re-read blind`,
      `  - \`join/<leg>.<item>[.<pair>].md\` — the pairs inside the second pass's bound`,
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
    `- **Run record.** \`${rel("run.json")}\` — every path above, per Leg, as it was written.`);
  // THE ONE RECORD ABOUT BOTH PASSES (kogaki#1135). Named only where `check`
  // ran, by the same rule the `pass-2/` block above follows: a legend line
  // pointing at a file nothing wrote sends the owner to an absence.
  if (run.checked_at) {
    out.push(
      `- **Both passes.** \`${rel("passes.json")}\` — one row per Leg, item and pair, carrying`,
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
  // table makes the class the CONSEQUENCE: a preserved fail sends its Leg to
  // correction, and a best-effort fail rides along only when that Leg is
  // re-realized anyway. A guard counting every fail would send a Leg to pass
  // two for a best-effort finding, which is the opposite of riding along — and
  // it would make `close` unreachable on a Draft whose only findings are ones
  // the design says to carry rather than to act on. Found on the first live
  // drive, where a best-effort item fired on every Leg.
  // A LOCALIZED SECTION FAIL WITHHELD IT THE SAME WAY (kogaki#873) UNTIL THE
  // READER THAT PRODUCED ONE WAS REMOVED (kogaki#1133). A failing preserved
  // LEG item is now the whole of what withholds this record.
  const fails = (run.findings || []).filter((f) => f.verdict === "fails" && f.class === "preserved");
  if (fails.length && !run.checked_at) {
    fail(`the join found ${fails.length} failing PRESERVED item(s), so \`close\` is reachable only `
      + "through `check` — pass two is what turns a failing preserved item into a correction or into "
      + `residue. A best-effort fail does not withhold the record; it rides along. Failing: `
      + `${fails.map((f) => `${f.leg_id}/${f.item}`).join(", ")}`);
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
          // A RESTORED LEG'S CORRECTION IS NOT IN IT (kogaki#1135), and the
          // count above is of corrections MADE. Saying only the count would
          // describe a document that does not exist.
          + ((run.restores || []).length
            ? `, less the ${run.restores.length} undone by pass two `
              + `(${run.restores.map((r) => r.leg_id).join(", ")}).`
            : ".")
        : " — no correction was made, so it is byte-identical to the Draft above."),
    `- **Body sha.** \`${run.body_sha}\``,
    `- **Opened.** ${run.opened_at}`,
    `- **Closed.** ${now}`,
    `- **Passes.** ${run.checked_at ? "two (compare, check)" : "one (compare)"}`,
    "",
    "### The Packets it was reviewed against",
    "",
    ...run.legs.map((s) => `- \`${s.leg_id}\` — \`${s.packet}\` sha \`${s.packet_sha}\``),
    "",
    // ITEM 4 OF kogaki#994. A finding names a Leg and an item; the two
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
    ...evidenceLines(ws, run, dirname(out)),
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
    // a preserved item's `fails` sends the Leg to correction and a
    // best-effort one's rides along if that Leg is re-realized anyway. A
    // findings list that rendered the verdict alone would leave the owner to
    // look the consequence up.
    for (const f of run.findings) {
      lines.push(`- **${f.leg_id} / ${f.item}** — ${f.verdict} (${f.class ?? "unclassed"})`);
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
      for (const l of findingEvidencePaths(ws, run, f, figureIds, dirname(out))) lines.push(l);
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
      lines.push(`- **${c.leg_id}** (pass ${c.pass}) — ${c.what}`);
      if (c.change_share !== undefined) lines.push(`  - change share: ${c.change_share}`);
      if (c.packet_overlap !== undefined) lines.push(`  - packet overlap: ${c.packet_overlap}`);
      // THE RESTORE IS RECORDED UNDER THE LEG IT UNDID (kogaki#1135), beside
      // the correction rather than in a list of its own: what the owner is
      // reading here is what happened to this Leg, and a correction whose
      // effect was removed is not a correction the article carries.
      for (const r of (run.restores || []).filter((x) => x.leg_id === c.leg_id)) {
        lines.push(`  - **RESTORED in pass two.** ${r.what}. The corrected prose is not in the `
          + "article; this Leg carries the prose it carried in pass one.");
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
      lines.push(`- **${r.leg_id} / ${r.item}** — ${r.why}`);
      // A RESIDUE LINE PASS TWO RE-JUDGED POINTS AT PASS TWO; ONE IT CARRIED
      // POINTS AT PASS ONE, which is the only pass that read it. The row carries
      // the distinction its own `why` was written from.
      for (const l of findingEvidencePaths(ws, run, r, figureIds, dirname(out))) lines.push(l);
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
  <reverse outline>   | node src/review-draft.mjs outline --draft <draft.md> --leg <id>
  [<verdicts.json>]   | node src/review-draft.mjs compare --draft <draft.md>
  [<corrected prose>] | node src/review-draft.mjs correct --draft <draft.md> --leg <id>
  [<record.json>]     | node src/review-draft.mjs correct --draft <draft.md> --leg <id> --figure
  [<verdicts.json>]   | node src/review-draft.mjs check   --draft <draft.md>
                        node src/review-draft.mjs close   --draft <draft.md>

The Harness owns the ordering: \`outline\` refuses a Leg whose Reverse Outline input it
did not render, \`compare\` refuses while any Leg outline is missing,
\`check\` refuses before \`compare\`, and \`close\` is reachable from \`compare\` with
zero fails or from \`check\` in every state.

THE WORKSPACE IS SPLIT BY PASS, and the layout is this command's contract rather
than a convention:

  runs/review/<slug>/pass-1/{outline-input,outline,join,corrections,join.json}
  runs/review/<slug>/pass-2/{outline-input,outline,join,check.json}
  runs/review/<slug>/snapshots/    before/after per corrected Leg, and per restore
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
a \`preserved\` fail is what sends its Leg to correction and a \`best-effort\` one
rides along.

EVERY REPLY REACHES THIS HARNESS ON STANDARD INPUT, and no act takes a path to
one. \`runs/\` holds what the Harness wrote and nothing else: the Reverse
Outline lands at \`outline/<leg>.md\`, the verdicts in \`join.json\` and
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
correction input — the Leg's Packet RE-RENDERED against the article as it now
stands, so the "article so far" block carries the current preceding prose
including Legs corrected earlier in the same pass, with one Correction block
appended holding the previous realization, what failed, and what held and must
go on holding. With the corrected prose piped in it records it through the
realization lane and reports the drift: the share of sentences changed and the
verbatim overlap with the Packet's claim and state lines. Both are REPORTED and
neither gates. Corrections run in path order, and a Leg out of order refuses.

\`--figure\` corrects the Leg's FIGURE RECORD instead of its passage, and it is
the seat a failing preserved figure item sends the Leg to. Phase A renders the
Packet as it now stands, the passage, the block as the reader currently meets
it, the previous record verbatim, and what failed and held; phase B takes the
re-designed record and hands it to \`draft.mjs figure\`, which re-validates it,
and \`emit\`, which re-renders the block from it. You write no markup. A Leg
owing both corrections takes the passage first: the record's caption is stated
in what the reader holds after reading that passage.

\`check\` is pass two and is BOUNDED: it re-runs Reverse Outlining for the
corrected Legs, then re-judges their own failed and held preserved items, the
continuity item on each corrected Leg's successor, and every mechanical
item over the whole Draft. Every other pair is CARRIED from pass one, marked as
carried, at no model call. A preserved item still failing after pass two is
residue, and \`close\` hands it to the owner with an empty \`classified:\` field.

\`check\` REFUSES A REGRESSION. A corrected Leg that FAILS in pass two a
preserved item it HELD in pass one is RESTORED to its pass-one prose, through
the realization lane that wrote it, and the item the correction was made for
returns to residue as still failing. Only the regressed Leg moves: a later
corrected Leg keeps its corrected prose and carries no mark, because
Leg-to-Leg continuity was settled at Reader Path design and is not this
Harness's. The restore is recorded in \`run.json\`, in \`check.json\`, and in
\`review.md\` under the Leg it undid, with a snapshot pair of its own.

A completed \`check\` also writes \`passes.json\` at the run root: one row per
Leg, item and pair, carrying pass one's verdict, pass two's, and one outcome
word — held, fixed, still-failing, regressed, carried. Comparing the two passes
meant reading \`pass-1/join.json\` and \`pass-2/check.json\` side by side by hand,
and \`regressed\` is the word neither of them carries.

\`compare\` decides the mechanical items itself and renders one join Packet per
judged pair; a verdicts reply piped in records the answers. It emits one line per (Leg,
item) once every pair is answered, and never before: there is no fourth token
for "not asked yet", and \`cannot-decide\` is a real answer rather than a place
to round one.

EVERY VERDICT NAMES THE MODEL THAT PRODUCED IT — \`{leg_id, item, pair?,
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
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
