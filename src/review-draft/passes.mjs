// review-draft/passes — the pass commands: `compare`, `correct`, `check` and `close`, the pass-one
// comparison, its corrections, pass two and the close. Cut from src/review-draft.mjs along its headed
// sections (kogaki#1792); the design and its rulings are stated at the entry and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { chosenJudged, evidenceLines, findingEvidencePaths, forcedParagraphLines } from "./close.mjs";
import {
  correctFigure,
  correctionEvidence,
  correctionInputPath,
  correctionOwedProse,
  draftLane,
  driftBlocks,
  driftOf,
  failingSides,
  figureCorrectionOwed,
  figureItemIds,
  passTwoBound,
  readJoin,
  renderCorrectionBlock,
  seatsStillOwed,
  withReplyFile,
} from "./correction.mjs";
import { declaredFor, readItems } from "./declared-side.mjs";
import { argString, fail, readDraft, readReply, resolveInputs, sha256 } from "./draft-reader.mjs";
import { buildJoin, comparisonLine, judgedByLine, recordVerdicts, verdictKey } from "./join.mjs";
import { PASS_OUTCOMES, buildPasses, regressedPairs, restoreRegressedLeg } from "./regression.mjs";
import { renderReverseOutlineInput } from "./reverse-outline.mjs";
import {
  REVIEWED_BASENAME,
  currentPass,
  passPath,
  passPathAt,
  passReadPath,
  readRun,
  requireCurrent,
  slugOf,
  workspaceFor,
  writeRun,
} from "./workspace.mjs";

// What `compare` is missing, computed once and rendered as the refusal's whole
// content: a reviewer told "something is missing" has to go looking, and the
// looking is the part the Harness can do.
//
// THE LEG OUTLINES ARE THE WHOLE OF WHAT IT CAN BE MISSING (kogaki#1133). The
// Section ledger and the cold reader's final claim were two further kinds of
// missing until that issue removed the reader that wrote them. The return stays
// a record rather than becoming a bare array, because a caller reading `.legs`
// says what it is asking about.
export function missingFor(run) {
  const legs = run.legs.map((s) => s.leg_id).filter((id) => !run.outlineFields[id]);
  return { legs };
}

// ---------------------------------------------------------------------------
// THE PER-LEG COMPARISON FILES ARE GONE (kogaki#1134, owner 2026-09-17),
// reversing kogaki#1097 by name: `join.json` carries `class`, `verdict`,
// `reason`, `model` and `span` on every row, so `comparison/<leg>.md` was a
// legend restating it. The EMITTED comparison line stays — it is the pass's
// own report to the person running it, and `comparisonLine` is the whole of it.

export function cmdCompare(args) {
  const draftPath = argString(
    args,
    "draft",
    "usage: review-draft compare --draft <draft.md>   (verdicts on standard input record them)",
  );
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
    fail(
      `this run has ${run.corrections.length} correction(s) recorded, so pass one is over: ` +
        "`compare` would re-render pass one's join inputs from the corrected article, over the " +
        "inputs its verdicts were given on, and pass one's reading of the original would be lost.\n" +
        "The pass over a corrected Draft is `check`:\n" +
        `  node src/review-draft.mjs check --draft ${relative(process.cwd(), draft.path) || draft.path}`,
    );
  }

  // EVERY MISSING INPUT IS NAMED IN ONE REFUSAL, BY LEG. A reviewer sent back
  // for "a missing outline" has to work out which; the Harness already knows.
  const missing = missingFor(run);
  if (missing.legs.length) {
    fail(
      `the join has inputs missing, so it would compare a partial review against a whole Draft ` +
        `and report the gaps as agreement.\n  leg outline` +
        `${missing.legs.length === 1 ? "" : "s"}: ${missing.legs.join(", ")}`,
    );
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
  run.join_state = complete ? null : `${owed.length} pair(s) await a verdict — the join is unfilled, not clean`;
  run.findings = complete ? results.filter((r) => r.verdict !== "holds") : [];
  writeRun(ws, run);

  // PASS ONE'S RECORD, AND THE PASS IS NAMED RATHER THAN INHERITED. `compare`
  // IS pass one — `check` is the door pass two answers through, precisely so
  // this unbounded join is never rebuilt over a corrected Draft — so the
  // record lands in `pass-1/` whatever pass the run has since reached.
  const joinPath = passPathAt(ws, run, 1, "join.json");
  writeFileSync(
    joinPath,
    JSON.stringify(
      {
        draft: run.draft,
        body_sha: run.body_sha,
        compared_at: run.compared_at,
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
      },
      null,
      2,
    ) + "\n",
  );

  if (recorded) process.stdout.write(`recorded: ${recorded} verdict(s)\n`);

  if (!complete) {
    // NO COMPARISON LINE IS EMITTED WHILE ANY PAIR IS UNANSWERED. There is no
    // fourth token for "not asked yet", and writing `cannot-decide` here would
    // round an absence into an answer — the one rounding the three-valued
    // verdict exists to refuse.
    process.stdout.write(
      `compare: every input present — ${run.legs.length} outlined Leg(s).\n` +
        `${mechanicalLog.length} pair(s) decided mechanically, no model call.\n` +
        judgedByLine(modelCalls) +
        `${owed.length} pair(s) await a verdict — one join Packet each, under ${passReadPath(ws, 1, "join")}:\n` +
        owed.map((o) => `  ${o.key}  ${o.packet}`).join("\n") +
        "\n" +
        "Answer each with one of holds / fails / cannot-decide plus one sentence, then\n" +
        `  <verdicts.json> | node src/review-draft.mjs compare --draft ${relative(process.cwd(), draft.path) || draft.path}\n` +
        `join record: ${joinPath}\n`,
    );
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
    results.map(comparisonLine).join("\n") +
      "\n\n" +
      `compare: ${results.length} (Leg, item) pair(s) joined, ` +
      `${mechanicalLog.length} decided mechanically and ${modelCalls.length} judged.\n` +
      judgedByLine(modelCalls) +
      (preserved.length
        ? `Legs sent to correction — a preserved item fails: ${[...new Set(preserved.map((r) => r.leg_id))].join(", ")}\n`
        : "No preserved item fails, so no Leg is sent to correction.\n") +
      (undecided.length
        ? "cannot-decide, listed with its pair and never rounded: " +
          undecided.map((r) => `${r.leg_id}/${r.item}`).join(", ") +
          "\n"
        : "") +
      `join record: ${joinPath}\n` +
      (fails.length
        ? "`check --draft <draft.md>` is pass two.\n"
        : "`close --draft <draft.md>` writes the owner record.\n"),
  );
}

export function cmdCorrect(args) {
  const usage =
    "usage: review-draft correct --draft <draft.md> --leg <id> [--figure]\n" +
    "       (the corrected prose, or the corrected figure record, on standard input records it)";
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
    fail(
      "`correct` is what pass one sends a Leg to, and pass one has not completed — run " +
        "`compare --draft <draft.md>` first. A correction composed before the join has answered " +
        "would be a rewrite against findings nobody recorded.",
    );
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
      fail(
        `leg ${legId} carries no failing PRESERVED item of the PASSAGE, and it does carry one ` +
          `of the FIGURE (${sides.figure.join(", ")}). What is re-realized there is the figure ` +
          `record, not the prose:\n  node src/review-draft.mjs correct --draft ` +
          `${relative(process.cwd(), draft.path) || draft.path} --leg ${legId} --figure`,
      );
    }
    if (figureMode && sides.prose.length) {
      fail(
        `leg ${legId} carries no failing PRESERVED FIGURE item, and it does carry one of the ` +
          `passage (${sides.prose.join(", ")}). Drop --figure to correct the prose.`,
      );
    }
    fail(
      `leg ${legId} carries no failing PRESERVED ${figureMode ? "figure " : ""}item, so pass ` +
        "one did not send it to correction. A best-effort fail rides along when its Leg is " +
        `re-realized anyway and never sends one here.\n  owed: ${owed.length ? owed.join(", ") : "(none — no Leg is owed a correction)"}`,
    );
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
  const already = new Set((run.corrections || []).filter((c) => (c.seat || "prose") === seat).map((c) => c.leg_id));
  const earlier = owed.slice(0, owed.indexOf(legId)).filter((id) => !already.has(id));
  if (earlier.length) {
    fail(
      `corrections run in path order and leg ${legId} is not next — ${earlier.join(", ")} ` +
        `${earlier.length === 1 ? "is" : "are"} owed a ${seat} correction first. Each correction ` +
        "re-renders the next Leg's Packet against the article as it then stands, so correcting out " +
        "of order realizes a Leg against prose that is about to move under it.",
    );
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
      fail(
        `leg ${legId} owes a correction on its PASSAGE as well, and the passage is corrected ` +
          "first: the record's caption is stated in what the reader holds after reading this " +
          "passage, and its elements are worded from prose that must already exist.\n" +
          `  node src/review-draft.mjs correct --draft ${relative(process.cwd(), draft.path) || draft.path} --leg ${legId}`,
      );
    }
  }

  const joinRec = readJoin(ws);
  if (figureMode) {
    correctFigure(args, { draft, draftPath, ws, run, items, joinRec, legId, reply });
    return;
  }

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
      fail(
        "the realization lane rendered a Packet and did not say where it stored it, so this " +
          "cannot show a reviewer the input the correction is written from. Its output, " +
          `verbatim:\n${(r.stderr || r.stdout || "(no output)").trim()}`,
      );
    }
    const freshPath = line.slice(prefix.length).trim();
    if (!existsSync(freshPath)) fail(`the realization lane named a Packet at ${freshPath} and no file is there`);
    const fresh = readFileSync(freshPath, "utf8");
    const block = renderCorrectionBlock(leg, correctionEvidence(joinRec, legId, items));
    const dest = correctionInputPath(ws, run, legId);
    writeFileSync(dest, (fresh.endsWith("\n") ? fresh : fresh + "\n") + block);
    run.correction_inputs = run.correction_inputs || {};
    run.correction_inputs[legId] = {
      path: dest,
      packet: freshPath,
      packet_sha: sha256(fresh),
      prose: leg.prose,
      rendered_at: new Date().toISOString(),
    };
    run.correcting = { leg_id: legId, input: dest, since: new Date().toISOString() };
    writeRun(ws, run);
    process.stdout.write(
      `correction input: ${dest}\n` +
        '  It is the Packet re-rendered against the article AS IT NOW STANDS — the "article so\n' +
        '  far" block holds the current preceding prose, corrections included — with one\n' +
        "  Correction block appended carrying the previous realization, what failed, and what\n" +
        "  must go on holding.\n" +
        `Realize the Leg from it, then record with\n` +
        `  <the corrected prose> | node src/review-draft.mjs correct --draft ${relative(process.cwd(), draft.path) || draft.path} --leg ${legId}\n` +
        "Until then this run is MID-CORRECTION on this Leg: its Packet is the freshly rendered\n" +
        "one and its prose is still the old realization, so every other act refuses by name\n" +
        "rather than reporting a comparison between prose and an input that did not produce it.\n",
    );
    return;
  }

  // --- phase B: record the corrected realization -------------------------
  const input = (run.correction_inputs || {})[legId];
  // THE RENDERED-INPUT GUARD, the same one `outline` has and for the same
  // reason. Prose handed back for a Leg whose correction input was never
  // rendered was written against something else — the old Packet, or the
  // finding text alone — and afterwards there is no way to tell which.
  if (!input) {
    fail(
      `leg ${legId} has no rendered correction input, so this prose was not written against ` +
        `one. Render it first:\n  node src/review-draft.mjs correct --draft ` +
        `${relative(process.cwd(), draft.path) || draft.path} --leg ${legId}`,
    );
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

  withReplyFile(reply, `${legId}.prose.md`, (p) => draftLane("section", draft, args, ["--leg", legId, "--file", p]));
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
    what:
      `re-realized from a Packet re-rendered against the article as it stood, with a Correction ` +
      `block carrying ${ev.failed.length} failed item(s) and ${ev.held.length} held preserved item(s)`,
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
    leg_id: s.leg_id,
    section: s.section,
    section_title: s.section_title,
    lines: s.lines,
    packet: s.packet,
    packet_sha: s.packet_sha,
  }));
  delete run.outlineFields[legId];
  delete run.rendered[legId];
  writeRun(ws, run);

  const stillOwed = seatsStillOwed(run, items);
  process.stdout.write(
    `corrected: ${legId}\n` +
      `  drift   ${drift.change_share}\n` +
      `          ${drift.packet_overlap}\n` +
      `  reported, never gated — what a high share means is the owner's reading\n` +
      `  snapshots ${join(snapDir, `${seq}-before-${legId}.md`)}\n` +
      `            ${join(snapDir, `${seq}-after-${legId}.md`)}\n` +
      (stillOwed.length
        ? `still owed a correction, in path order: ${stillOwed.join(", ")}\n`
        : "every Leg pass one sent to correction has been corrected. `check --draft <draft.md>` is pass two.\n"),
  );
}

export function cmdCheck(args) {
  const draftPath = argString(
    args,
    "draft",
    "usage: review-draft check --draft <draft.md>   (verdicts on standard input record them)",
  );
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
    fail(
      "`check` is pass two and there is no pass one — run `compare --draft <draft.md>` first. " +
        "Pass two re-runs outline and the join only for the corrected Legs, their successors' " +
        "continuity items and the mechanical items, so it has nothing to narrow to until the join has run.",
    );
  }

  const items = readItems();
  const bound = passTwoBound(run, items);
  const priorJoin = readJoin(ws);

  // A RE-JUDGED PAIR'S PASS-ONE ANSWER IS DISCARDED WHEN THE PASS OPENS, AND
  // EXACTLY ONCE: `buildJoin` reads recorded verdicts, and clearing on every
  // invocation would delete pass two's own answers. `correct` clears the
  // marker, so a correction landing after the pass opened re-opens it.
  // THE PASS NUMBER MOVES HERE, BEFORE ANY EVIDENCE IS WRITTEN (kogaki#994),
  // so this pass's Reverse Outlining lands in this pass's directory.
  // THE NUMBER IS THE PASS THIS COMMAND IS, NOT A COUNTER: `check` IS pass
  // two, and a re-entry sets 2 again; a genuine third pass is a third act.
  if (!run.pass_open_at) {
    const verdicts = run.verdicts || {};
    let cleared = 0;
    for (const key of Object.keys(verdicts)) {
      const call = (priorJoin.model_calls || []).find((c) => verdictKey(c.leg_id, c.item, c.pair) === key);
      if (call && bound.inBound(call.leg_id, call.item)) {
        delete verdicts[key];
        cleared++;
      }
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
      run.rendered[id] = renderReverseOutlineInput(
        ws,
        run,
        draft,
        legs.find((s) => s.leg_id === id),
        legs,
      );
    }
    writeRun(ws, run);
    fail(
      `pass two re-runs Reverse Outlining for every corrected Leg, and ` +
        `${owedOutline.length} ${owedOutline.length === 1 ? "is" : "are"} outstanding. The prose ` +
        "these Legs carry now is not the prose the first Reverse Outline read, so the recorded reading is " +
        `about text that is gone.\n` +
        owedOutline.map((id) => `  ${id}  ${run.rendered[id]}`).join("\n") +
        "\n" +
        "Read each blind and record it with `<reverse outline> | outline --draft <draft.md> --leg <id>`, " +
        "then run `check` again.",
    );
  }

  // PASS TWO ANSWERS ITS OWN OWED SET, through `check`'s own stream and never
  // through `compare`'s. Routing them through `compare` would rebuild the
  // UNBOUNDED join against the corrected Draft — re-rendering a join Packet for
  // every pair, overwriting the pass-one record this pass carries from, and
  // resetting `compared_at` to a comparison nobody made. The two passes have
  // different owed sets by construction, so they need different doors.
  let pass = buildJoin(draft, run, items, ws, {
    pass: currentPass(run),
    bound: bound.inBound,
    carry: priorJoin.results || [],
  });
  let recorded = 0;
  if (reply.trim() !== "") {
    recorded = recordVerdicts(run, reply, pass.owed, items);
    pass = buildJoin(draft, run, items, ws, {
      pass: currentPass(run),
      bound: bound.inBound,
      carry: priorJoin.results || [],
    });
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
    const regressed = regressedPairs(run, priorJoin, pass.results).filter((r) => !restoredAlready.has(r.leg_id));
    // IN PATH ORDER, the order every act that moves prose runs in.
    const order = run.legs.map((s) => s.leg_id);
    const legs = [...new Set(regressed.map((r) => r.leg_id))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const legId of legs) {
      draft = restoreRegressedLeg(args, {
        draft,
        draftPath,
        ws,
        run,
        legId,
        priorJoin,
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
      pass = buildJoin(draft, run, items, ws, {
        pass: currentPass(run),
        bound: bound.inBound,
        carry: priorJoin.results || [],
      });
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
  writeFileSync(
    joinPath,
    JSON.stringify(
      {
        draft: run.draft,
        body_sha: run.body_sha,
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
          leg_id: r.leg_id,
          seats: r.seats,
          regressed: r.regressed,
          snapshot_before: r.snapshot_before,
          snapshot_after: r.snapshot_after,
          restored_at: r.restored_at,
        })),
        results,
        owed,
        model_calls: modelCalls,
        mechanical: mechanicalLog,
      },
      null,
      2,
    ) + "\n",
  );

  if (!complete) {
    process.stdout.write(
      `check: pass two, bounded — ${bound.corrected.size} corrected Leg(s), ` +
        `${bound.successors.size} successor(s), ${bound.mechanical.size} mechanical item(s) over the whole Draft.\n` +
        `${mechanicalLog.length} pair(s) decided mechanically, no model call.\n` +
        `${owed.length} pair(s) await a verdict — one join Packet each:\n` +
        owed.map((o) => `  ${o.key}  ${o.packet}`).join("\n") +
        "\n" +
        "Answer each with one of holds / fails / cannot-decide plus one sentence, then\n" +
        `  <verdicts.json> | node src/review-draft.mjs check --draft ${relative(process.cwd(), draft.path) || draft.path}\n` +
        `check record: ${joinPath}\n` +
        "The regression guard and `passes.json` land when the pass is complete: a pair with no\n" +
        "answer yet has no pass-two verdict to compare against pass one's.\n",
    );
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
      leg_id: f.leg_id,
      item: f.item,
      // WHAT THE OWNER RECORD'S POINTERS ARE COMPOSED FROM, kept on the row: the
      // pass that read it (a carried row is pass one's whatever pass the run
      // reached) and whether a judge was handed a Packet for the chosen pair.
      pair: f.pair,
      carried: Boolean(f.carried),
      judged: chosenJudged(f),
      // A RESTORED LEG'S RESIDUE SAYS WHICH PROSE IT IS ABOUT (kogaki#1135).
      // Its Leg was corrected and the correction was UNDONE, so "still failing
      // after pass two" is true of the item and silent about the article: the
      // prose the owner will open is pass one's, and the correction that was
      // meant to fix this item is not in it.
      ...(f.restored ? { restored: true } : {}),
      why: f.carried
        ? `${f.reason} — carried from pass one and NOT re-judged: this Leg was not corrected, ` +
          "so nothing in pass two read it again"
        : f.restored
          ? `${f.reason} — still failing, and the correction made for it was UNDONE: pass two ` +
            "failed an item this Leg had held, so the Leg was restored to its pass-one prose " +
            "and this is that prose's own finding, unchanged"
          : `${f.reason} — still failing after pass two`,
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
  writeFileSync(
    passesPath,
    JSON.stringify(
      {
        draft: run.draft,
        body_sha: run.body_sha,
        written_at: run.checked_at,
        outcomes: passes.counts,
        // A key pass two produced that pass one never answered. Empty on every run
        // this Harness can currently produce, and named rather than dropped: the
        // five outcome words are all about a pair with two readings, and a pair
        // with one is a disagreement between the passes about what exists.
        pass_two_only: passes.pass_two_only,
        rows: passes.rows,
      },
      null,
      2,
    ) + "\n",
  );
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
    results
      .filter((r) => !r.carried)
      .map(comparisonLine)
      .join("\n") +
      "\n\n" +
      `check: pass two over ${results.filter((r) => !r.carried).length} re-judged (Leg, item) pair(s); ` +
      `${results.filter((r) => r.carried).length} carried unchanged from pass one.\n` +
      `  corrected Legs      ${[...bound.corrected].join(", ") || "(none)"}\n` +
      `  successors re-checked ${[...bound.successors].join(", ") || "(none)"} on ${bound.successorItems.join(", ")}\n` +
      `  mechanical items      re-run over every Leg\n` +
      `${mechanicalLog.length} pair(s) decided mechanically and ${judged} judged.\n` +
      judgedByLine(modelCalls) +
      (uncorrected.length
        ? `UNCORRECTED — pass one sent these to correction and they are still owed: ${uncorrected.join(", ")}.\n` +
          "  An entry marked `(--figure)` is the figure seat; the rest are the passage. A Leg can\n" +
          "  appear on both, and a Leg that received one seat still appears for the other.\n" +
          "  Their preserved fails are residue CARRIED from pass one, not re-judged by this pass;\n" +
          "  the owner record says so per line. `correct --leg <id> [--figure]` is the act that changes that.\n"
        : "") +
      (restoredNow.length
        ? `RESTORED — pass two failed an item these Legs had HELD in pass one, so each is back at ` +
          `its pass-one prose: ${restoredNow.join(", ")}.\n` +
          "  The correction was undone, not adjusted, and the item it was made for is residue\n" +
          "  again. Only the regressed Leg moved: a later corrected Leg keeps its corrected\n" +
          "  prose and carries no mark, because Leg-to-Leg continuity is the Reader Path's and\n" +
          "  not this Harness's.\n" +
          (run.restores || [])
            .filter((r) => restoredNow.includes(r.leg_id))
            .map(
              (r) =>
                `  ${r.leg_id}  held then failed: ` +
                `${r.regressed.map((x) => x.item).join(", ")}\n` +
                `          snapshots ${r.snapshot_before}\n` +
                `                    ${r.snapshot_after}\n`,
            )
            .join("")
        : "") +
      (run.residue.length
        ? `residue — preserved item(s) reaching the owner to classify: ` +
          `${run.residue.map((r) => `${r.leg_id}/${r.item}`).join(", ")}\n`
        : "no preserved item fails after pass two, so the residue is empty.\n") +
      `check record: ${joinPath}\n` +
      `both passes:  ${passesPath} — one row per Leg, item and pair, with each pass's\n` +
      "              verdict and one outcome word: " +
      `${PASS_OUTCOMES.join(", ")}.\n` +
      "`close --draft <draft.md>` writes the owner record.\n",
  );
}

export function cmdClose(args) {
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
    fail(
      `this run is closed. The reviewed Draft was written to ${run0.reviewed_draft}, and ` +
        `${resolve(draftPath)} was restored to the Draft that was reviewed. Running \`close\` again ` +
        "would copy that restored original over the reviewed Draft.\n" +
        `  record  ${join(dirname(resolve(draftPath)), "review.md")}\n` +
        "To review the corrected article, `open` a new run on it.",
    );
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
      fail(
        `the join has run and is UNFILLED — ${run.join_state}. \`close\` writes the owner ` +
          "record, and a record written over unanswered pairs would render them as no findings, " +
          "which reads as a clean review. Answer the join Packets under the workspace's `join/` " +
          "directory and record them with `<verdicts.json> | compare --draft <draft.md>`.",
      );
    }
    fail(
      "`close` is reachable from `compare` with zero fails, or from `check` in every state — " +
        "and neither has run. Run `compare --draft <draft.md>` first.",
    );
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
    fail(
      `the join found ${fails.length} failing PRESERVED item(s), so \`close\` is reachable only ` +
        "through `check` — pass two is what turns a failing preserved item into a correction or into " +
        `residue. A best-effort fail does not withhold the record; it rides along. Failing: ` +
        `${fails.map((f) => `${f.leg_id}/${f.item}`).join(", ")}`,
    );
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
    fail(
      `the first correction's snapshot is gone — ${firstSnapshot}. It is the Draft this run ` +
        `reviewed, and \`close\` restores ${resolve(draftPath)} from it. Without it the reviewed ` +
        "article and the reviewed Draft cannot both be produced, so this refuses rather than " +
        "leaving the corrected article at the path the record calls the original.",
    );
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
    `- **Draft reviewed.** \`${relative(dirname(out), resolve(draftPath)) || basename(draftPath)}\`` +
      " — restored to the article this run read, byte for byte.",
    `- **Reviewed Draft.** \`${relative(dirname(out), reviewedPath) || REVIEWED_BASENAME}\`` +
      (firstSnapshot
        ? ` — the article with this run's ${run.corrections.length} correction(s) in it` +
          // A RESTORED LEG'S CORRECTION IS NOT IN IT (kogaki#1135), and the
          // count above is of corrections MADE. Saying only the count would
          // describe a document that does not exist.
          ((run.restores || []).length
            ? `, less the ${run.restores.length} undone by pass two ` +
              `(${run.restores.map((r) => r.leg_id).join(", ")}).`
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
    lines.push(
      run.join_state ? `_None recorded — ${run.join_state}. This is an unfilled join, not a clean review._` : "_None._",
      "",
    );
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
    lines.push(
      run.checked_at
        ? "_None made — pass two ran over the mechanical items and carried the rest._"
        : "_None — `correct` is the act that makes one, and it has not run._",
      "",
    );
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
        lines.push(
          `  - **RESTORED in pass two.** ${r.what}. The corrected prose is not in the ` +
            "article; this Leg carries the prose it carried in pass one.",
        );
        for (const g of r.regressed) {
          lines.push(
            `    - \`${g.item}\`${g.pair === null || g.pair === undefined ? "" : ` pair ${g.pair}`}` +
              ` — held in pass one, failed in pass two: ${g.reason}`,
          );
        }
        lines.push(
          `    - before: \`${relative(dirname(out), r.snapshot_before) || r.snapshot_before}\``,
          `    - after: \`${relative(dirname(out), r.snapshot_after) || r.snapshot_after}\``,
        );
      }
    }
    lines.push("");
  }

  lines.push(
    "## Residue",
    "",
    "Each line is an item that survived every pass this run made. Fill",
    "`classified:` with `packet` or `reviewdraft`.",
    "",
  );
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
  lines.push(...forcedParagraphLines(run.legs, dirname(resolve(draftPath))));

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
    `review record:  ${out}\n` +
      `reviewed Draft: ${reviewedPath}\n` +
      (firstSnapshot
        ? `restored:       ${resolve(draftPath)} — the Draft this run reviewed, from ${firstSnapshot}\n`
        : `unchanged:      ${resolve(draftPath)} — no correction was made\n`),
  );
}
