// review-draft/draft-reader — reading the Draft and resolving its inputs: the frontmatter trace, the Packets it names, the reply on standard input and the Japanese-Draft precondition.
// Cut from src/review-draft.mjs at its named section (kogaki#1458); the
// design and its rulings are stated at the entry and in the Issues each
// block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   the figure record
//       SPEC-draft-pipeline "The figure record — the form's instance, filled after the prose"
//   the renderer
//       SPEC-draft-pipeline "The renderer and the anchor — markup from the record, at the Leg"
//
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

// THE REVERSE OUTLINE'S OWN READER (kogaki#1328). The outline is a fenced
// `leg` block a blind reader writes in the Brief Leg's field names, and until
// the Brief became one YAML record it was read by the Brief's own Leg-block
// parser (kogaki#1014). The Brief has no line grammar any more, so the outline
// is read here, by the module that asks for it — over the outline's text, which
// is the reader's writing and never the Brief's. The field names it may carry
// are still the Brief Leg's, closed by `validateReverseOutline` below.
function parseLegBlock(text, path = "<reverse-outline>") {
  const m = /^```leg\n([\s\S]*?)\n```/m.exec(text);
  if (!m) {
    return { refusal: `${path} carries no fenced \`leg\` block — a Reverse Outline is written in the Brief `
      + "Leg's own field names, so there is nothing here to compare against the Forward Artifact" };
  }
  const rest = text.slice(m.index + m[0].length);
  if (/^```leg\n/m.test(rest)) {
    return { refusal: `${path} carries more than one fenced \`leg\` block — a Reverse Outline is the reading of ONE passage, `
      + "and two blocks leave the Harness to pick which one the reader meant" };
  }
  const body = m[1];
  const idM = body.match(/^leg_id:\s*(\S+)\s*$/m);
  if (!idM) return { refusal: `${path} carries a leg block with no leg_id` };
  return { leg: { leg_id: idM[1], body } };
}

// One field of an outline block: the value after `<field>:`, with any
// two-space-indented continuation lines rejoined by a newline.
function legField(body, field) {
  const m = body.match(new RegExp(`^${field}:[ \\t]*(.*)\\n((?:  .*(?:\\n|$))*)`, "m"));
  if (!m) {
    const inline = body.match(new RegExp(`^${field}:[ \\t]*(.*)$`, "m"));
    return inline ? inline[1].trim() : null;
  }
  const rest = m[2].split("\n").filter((l) => l !== "").map((l) => l.slice(2));
  return [m[1].trim(), ...rest].join("\n");
}

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

// THE REPLY REACHES THE HARNESS ON STANDARD INPUT (kogaki#1100); `--file` and
// `--verdicts` are gone with it, because a reply the session names a file for
// is a write with no owner and a duplicate of what `runs/` already holds.
// AN ABSENT REPLY IS THE EMPTY STRING, NEVER A BLOCKED READ: `isTTY` tells an
// absent reply from one still arriving, read here rather than at each call
// site so the five acts cannot disagree about what absent means.
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
  // THE `brief:` LINE IS READ AND NOTHING ELSE IS DONE WITH IT HERE: it is the
  // one frontmatter field `correct` needs to re-enter the realization lane,
  // read by the same line scan as the trace because `emit` writes it as one
  // line. THIS IS NOT THE CLOSED-INPUT ALLOWLIST BREAKING (owner ruling
  // 2026-09-04): the ruling binds what the REVIEWER reads, and the path is
  // handed to `src/draft.mjs` as a subprocess argument, never read here.
  let brief = null;
  for (let i = 1; i < end; i++) {
    const m = lines[i].match(/^brief: (.+?)\s*$/);
    if (m) { brief = m[1]; break; }
  }
  // THE LANGUAGE THE DRAFT WAS REALIZED AT (kogaki#1160): `draft.mjs emit`
  // writes `lang:` only for a non-English realization, so no `lang:` is
  // English, never a refusal. Read by the same line scan as `brief:`.
  // THE VALUE IS FORM-CHECKED AT THE READ (PR #1164 round 1): it lands in
  // `draft.mjs` as a path segment, a run.json key and inside the emit name, so
  // a separator or `..` would write outside the track it names. The form is
  // the BCP-47-ish one `emit` writes, and a bad value is a REFUSAL rather than
  // a fallback to `en`, which would be the cross-track write itself.
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
          + "Re-emit the Draft (`node src/draft.mjs emit --brief <brief.yaml> --lang <tag>`), which "
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
  // `\n\n` join leaves; trace line numbers are 1-based over the FILE.
  // THE FINAL EMPTY ELEMENT IS DROPPED, AND THAT IS WHAT MAKES `body_sha` THE
  // SAME NUMBER ON BOTH SIDES (PR #882 round 1, finding 2): `emit` records
  // `sha256(body)` of `fm + "\n\n" + body + "\n"`, and a naive slice re-joined
  // the trailing "" as a final "\n", so the owner saw two hexes for an
  // unedited Draft.
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
        + "(node src/draft.mjs emit --brief <brief.yaml>)");
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
        + "`node src/draft.mjs packet --brief <brief.yaml> --leg " + id + "`");
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
          + "has no block to quote; re-emit the Draft (node src/draft.mjs emit --brief <brief.yaml>)");
      }
      if (typeof f.record !== "string" || typeof f.record_sha !== "string") {
        fail(`leg ${id}: its trace entry carries a figure naming no record — the record is the `
          + "declared side of every figure item, so a figure without one cannot be reviewed");
      }
      const recordPath = resolve(dir, f.record);
      if (!existsSync(recordPath)) {
        fail(`leg ${id}: the figure record the trace names is absent — ${recordPath}. The run `
          + "workspace is machine state and is pruned; re-record it with "
          + `\`node src/draft.mjs figure --brief <brief.yaml> --leg ${id} --file <record.json>\``);
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
// THE JAPANESE-DRAFT PRECONDITION (kogaki#1158, the Terminology List
// Decision, the versioning rule). A `theses/<slug>/draft.ja.md` must pass
// `node src/lint-ja.mjs lint` before ReviewDraft runs against it: this reads
// `terms_sha_at_lint` (never `terms_sha_at_generation`) against
// sha256(terms/prh.yml) as it stands NOW, and refuses naming BOTH hashes when
// they disagree or the field is absent. A raw line scan, run before
// `readDraft` so the precondition is reported ahead of any other refusal;
// scoped to `.ja.md` only. RESOLVED BESIDE THE RUNTIME, never against the
// working directory — the same `terms/prh.yml` src/lint-ja.mjs and
// src/draft.mjs default to — and computed locally, because the closed-input
// allowlist forbids importing a reader the Round Trip may not see.
const TERMS_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "terms", "prh.yml");

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

export { parseLegBlock, legField, fail, sha256, argString, STDIN_LABEL, readReply, requireReply, readDraft, resolveInputs, checkJaTermsFreshness };
