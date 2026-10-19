// review-draft/correction — the correction path and the figure correction.
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
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { verbatimWindow } from "./declared-side.mjs";
import { fail, sha256, readDraft, resolveInputs } from "./draft-reader.mjs";
import { writeRun, passPathAt, passReadPath } from "./workspace.mjs";

// ---------------------------------------------------------------------------
// THE CORRECTION PATH (kogaki#874): what a corrected Leg receives, the bounded
// second pass, and the drift measure.
// A CORRECTED LEG IS REALIZED FROM A FRESHLY RENDERED PACKET, never from the
// Packet that produced the failing prose (owner concern 2026-09-04): the
// Packet's "article so far" block is the continuity mechanism, and the current
// article is what the corrected Leg must sit in.
// THE REALIZATION LANE IS ENTERED AS A SUBPROCESS, never imported: `draft.mjs`
// wrote the Packets, and a second writer of the Draft would disagree with it
// about the trace. See `readDraft`'s `brief:` read for why the closed-input
// ruling binds the reviewer's reading and not this call.
function briefOf(draft) {
  if (!draft.brief) {
    fail(`${draft.path} names no Brief in its frontmatter, and the correction path re-enters the `
      + "realization lane to render a fresh Packet. Re-emit the Draft "
      + "(`node src/draft.mjs emit --brief <brief.yaml>`), which writes the field.");
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
  const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "draft.mjs");
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
// replacement: `failingSides` below is the sole computer of what sends a Leg
// to correction. Best-effort fails never do — they ride along when the Leg is
// re-realized anyway, which is what the item table's class means here as at
// `close`. The localized Section-fail arm of kogaki#873 is gone with its
// reader (kogaki#1133).

// ---------------------------------------------------------------------------
// THE FIGURE CORRECTION (kogaki#880). A failing PRESERVED figure item sends
// its Leg to correction as a failing prose item does, but what is re-realized
// is the RECORD, through `draft.mjs figure`, which re-validates it against
// src/figure-schema.json. TWO CORRECTIONS, NOT ONE WIDENED ONE: composing them
// would make one act whose input depends on which item failed.
// PROSE FIRST WHERE A LEG OWES BOTH: the record's caption is stated in what
// the reader holds after reading THIS passage, so a record corrected against
// prose about to change is corrected against nothing.

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

// THE (Leg, seat) PAIRS STILL OWED A CORRECTION, in path order, prose first,
// each figure entry marked with the flag that reaches it. ONE definition for
// three readers (kogaki#945): the two `correct` reports and `check`'s
// UNCORRECTED line, which keyed on the Leg alone until this and dropped a Leg
// that owed both seats and received one — PR #906 round 1 finding 1's silence
// at the seat kogaki#880 introduced.
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

// THE SECOND PASS'S BOUND. Three arms, item ids from the table (`pass_two`):
//   - a corrected Leg, on its own failed items and its held preserved items;
//   - the Leg immediately AFTER each corrected Leg, on the continuity items
//     the table names — the correction moved the prose it continues from;
//   - every mechanical item, over the whole Draft.
// Nothing else is re-judged: pass two answers what the correction changed, and
// a second reading beside a recorded one has nothing to distinguish them.
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

export { withReplyFile, draftLane, readJoin, figureItemIds, failingSides, correctionOwedProse, figureCorrectionOwed, seatsStillOwed, correctionEvidence, renderCorrectionBlock, driftOf, driftBlocks, correctionInputPath, correctFigure, passTwoBound };
