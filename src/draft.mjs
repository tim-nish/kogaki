#!/usr/bin/env node
// draft — the /draft runtime and the CanonicalDraft it writes
// (SPEC-draft-command v1, kogaki#573; story 1.80, kogaki#587).
//
// THE THREE-LAYER BOUNDARY IS THE FILE'S OWN STRUCTURE: this is the HARNESS
// and the SCHEMA half. It resolves the adopted Brief, establishes the closed
// reference set, iterates the Reader Path's Legs in order, keeps snapshots
// machine-local, and writes the CanonicalDraft with its record half. The prose
// realizing each Leg arrives through `section` and is judged nowhere here.
// The stage modules under src/draft/ are cut at this file's former named
// sections (kogaki#1461); this entry keeps the commands and the dispatch.

// Six commands, one per harness act: `resolve` (parse the Brief, refuse a
// template by field name, write the run record), `material` (one settled
// Strand's material; a Strand outside the closed set refuses by name),
// `section` (one Leg's prose, from the writer), `packet` (the Leg Packet,
// kogaki#749), `figure` (one Leg's figure record, kogaki#878) and `emit` (the
// CanonicalDraft at theses/<slug>/draft.md, one per Brief, overwritten on
// re-run). `emit` refuses while any Leg lacks its section, naming the Legs
// owed: a run ends when the CanonicalDraft exists (the completion contract
// lives in the flow). NO MOVE IS OPENED HERE (kogaki#1311, owner decision
// 2026-10-09); `--moves-dir` is refused by name.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-command: the closed reference set; the three-layer boundary
//   SPEC-draft-pipeline: the read-not-invented rule; the reader-knowledge
//       ledger; the Leg Packet; the Section grouping; the figure decision;
//       the figure record; the renderer and the anchor
//
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readerKnowledgeLedger, figureLegs } from "./compose.mjs";
import { sha256 as sha256Terms, DEFAULT_TERMS_PATH } from "./lint-ja.mjs";
import { fail, argString, sha256, readBrief, REACHES_TARGET_LINE, CLOSING_LEG_LINE, readerTargetLine, foreignStrandRefusal } from "./draft/brief-reader.mjs";
import { journeyIdentityKey, journeyTextFromSurvey, journeyResolutionRefusal, journeyProseFromShardLines } from "./draft/journeys.mjs";
import { splitPacketTemplate, figureFormFor, renderFigureInput, figureRecordRefusal } from "./draft/packet.mjs";
import { READER_OWN_WORLD_ABSENT, OPENS_FROM_LABEL, waypointLines, renderPacket, renderAndStorePacket } from "./draft/render-packet.mjs";
import { workspaceFor, enterWorkspace, langOf, sectionsDir, packetsDir, packetsRecordKey, snapshotDraft, loadBrief, sectionsOf, sectionOfLeg, assembleBody } from "./draft/workspace.mjs";
import { writerSettings, callWriter, writerRefusal, sectionProseRefusal, parseWriterRecord } from "./draft/writer.mjs";

// THE NAMES A FILE OUTSIDE src/draft/ IMPORTS FROM THIS ENTRY (kogaki#1461),
// re-exported so no importer and no check changes when the modules move.
export {
  readBrief, readerTargetLine, REACHES_TARGET_LINE, CLOSING_LEG_LINE,
  sectionsOf, sectionOfLeg, writerRefusal,
  splitPacketTemplate, journeyIdentityKey, journeyTextFromSurvey,
  journeyResolutionRefusal, journeyProseFromShardLines, READER_OWN_WORLD_ABSENT,
  OPENS_FROM_LABEL, waypointLines, renderPacket,
};

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
// Commands.

function cmdResolve(args) {
  const brief = loadBrief(args);
  const ws = enterWorkspace(args, brief.slug);
  mkdirSync(join(ws, "sections"), { recursive: true });
  // Machine identity: run record in the workspace, never in the artifact.
  // A RE-RESOLVE PRESERVES THE PACKET RECORDS WHEN THE BRIEF HAS NOT MOVED.
  // This write is a full overwrite by design — the run record is the run's
  // identity — but `packet` now records path+sha here, and an overwrite would
  // orphan Packet files that are still on disk and still current: the exact
  // unrecorded-artifact defect the recording exists to close, re-created by
  // the other half of the same file. Where the Brief HAS moved, the old
  // entries are correctly dropped: they describe Packets rendered from a
  // Brief that no longer exists.
  const prevRun = join(ws, "run.json");
  let carried;
  try {
    const prev = JSON.parse(readFileSync(prevRun, "utf8"));
    if (prev.brief_sha === sha256(brief.text) && prev.packets) carried = prev.packets;
  } catch { /* no prior record, or unreadable — nothing to carry */ }

  writeFileSync(join(ws, "run.json"), JSON.stringify({
    ...(carried ? { packets: carried } : {}),
    brief: brief.path,
    brief_sha: sha256(brief.text),
    survey_pin: brief.surveyPin,
    strands: brief.strands.map((s) => s.id),
    legs: brief.legs.map((s) => s.leg_id),
    resolved_at: new Date().toISOString(),
  }, null, 2) + "\n");
  process.stdout.write(`brief: ${brief.path}\n`);
  process.stdout.write(`survey pin: ${brief.surveyPin}\n`);
  driveNextPacket(brief, args, ws);
  process.stdout.write(`closed set: ${brief.strands.map((s) => s.id).join(", ")} — the Brief's own text plus these Strands' served renderings at the pin; nothing else is reachable\n`);
  process.stdout.write(`reader path: ${brief.legs.map((s) => s.leg_id).join(" → ")} (recorded order; realized in this order and no other)\n`);
  // the reader-knowledge ledger's ledger is DERIVED here and rendered, never stored: no field is
  // written to the Brief and no key is added to the run record above. A Brief
  // whose path introduces nothing renders the empty ledger AS an empty ledger
  // — that is a true reading of the path, not a failure to compute one.
  // COUNTED FROM THE DERIVATION, never by adding the last Leg's RAW entries
  // to the deduped union before it (PR #775 round 1). The first form
  // double-counted a term a later Leg re-declares — and cross-Leg
  // re-declaration is exactly what the reader-knowledge ledger legalizes, so the wrong case was the
  // one the field explicitly permits. Appending a terminal sentinel makes the
  // final row's snapshot the whole path's union, so the count comes from the
  // same function everything else reads and cannot disagree with it. This
  // line is the ONLY owner-facing rendering of the ledger, which is why a
  // wrong number here is the one a reader has no way to check.
  const ledger = readerKnowledgeLedger([...brief.legs, { leg_id: "(end)" }]);
  const introduced = ledger[ledger.length - 1].reader_already_knows.length;
  process.stdout.write(`reader-knowledge ledger: ${introduced} term(s) introduced across ${brief.legs.length} leg(s), derived from the path at read time and stored nowhere (the reader-knowledge ledger)${introduced === 0 ? " — this path introduces no terms, which is a reading of it and not an error" : ""}\n`);
  process.stdout.write(`waypoints: ${brief.legs.reduce((n, l) => n + l.waypoints.length, 0)} across ${brief.legs.length} leg(s), each serving a claim of its Leg — the route was written and judged at composition, and no Move is opened here (kogaki#1311)\n`);
  process.stdout.write(`workspace: ${ws} (machine-local; snapshots and run identity live here, never in the artifact)\n`);
}

function cmdMaterial(args) {
  const brief = loadBrief(args);
  const id = argString(args, "strand", "material needs --strand <L-id>");
  const strand = brief.strands.find((s) => s.id === id);
  if (!strand) fail(foreignStrandRefusal(id, brief.strands));
  process.stdout.write(`${strand.id} — ${strand.slug}\n`);
  for (const c of strand.cites) process.stdout.write(`${c.kind}: ${c.cite}\n`);
  // The Brief's own record is the material: every claim naming this Strand,
  // in the Reader Path's order, quoted as the Brief carries it.
  for (const leg of brief.legs) {
    for (const g of leg.claims) if (g.strand === id) process.stdout.write(`claim: ${g.proposition}\n`);
  }
}

function cmdPacket(args) {
  const brief = loadBrief(args);
  const id = argString(args, "leg", "packet needs --leg <leg_id>");
  const ws = workspaceFor(args, brief.slug);
  const r = renderAndStorePacket(brief, id, args, ws);
  if (r.error) fail(r.error);
  const { out, sha } = r;

  process.stdout.write(r.packet);
  process.stderr.write(`\npacket ${id}: ${out}\n`);
  process.stderr.write(`packet sha256: ${sha}\n`);
  process.stderr.write(`stored exactly as served — the file above is byte-identical to what was printed (the Leg Packet)\n`);
  // The owed-path line is GONE rather than reworded (kogaki#750). It announced
  // a debt on every render, and the debt is paid: the workspace default IS
  // `runs/draft/<slug>/`. A line that keeps naming a discharged obligation is
  // the same defect as one that never named it — both leave a reader unable to
  // tell the current state from the state when the line was written.
}

// THE HARNESS HANDS THE NEXT LEG'S INPUT FORWARD (kogaki#811, DESIGN.md, "The Packet architecture").
// `resolve` calls this at run start and `section` after recording a Leg, so a
// Packet exists for the Leg about to be realized WITHOUT the session running
// a command. That is the render-within arm: it makes the Packet architecture's "one Leg, one
// input" true by construction rather than by a session remembering.
//
// It never fails the act it rides on. A Packet that cannot be rendered here is
// reported and the run continues, because `section`'s own refusal is the
// backstop that catches the absence at the moment it matters — and a driver
// that could fail `resolve` would make a template read gate the run's start.
function driveNextPacket(brief, args, ws) {
  const lang = langOf(args);
  const next = brief.legs.find((s) => !existsSync(join(sectionsDir(ws, lang), `${s.leg_id}.md`)));
  if (!next) return null;
  const r = renderAndStorePacket(brief, next.leg_id, args, ws);
  if (r.error) {
    process.stderr.write(`draft: the Packet for the next Leg (${next.leg_id}) was not rendered — ${r.error}\n`);
    process.stderr.write(`draft: run \`packet --leg ${next.leg_id}\` to see the failure in full; \`section\` will refuse this Leg until its Packet exists\n`);
    return null;
  }
  process.stderr.write(`packet ${next.leg_id}: ${r.out}\n`);
  process.stderr.write(`packet sha256: ${r.sha}\n`);
  return next.leg_id;
}

function cmdSection(args) {
  const brief = loadBrief(args);
  const id = argString(args, "leg", "section needs --leg <leg_id>");
  // `--file` IS REMOVED, not ignored (kogaki#1237, Fresh Call): prose handed in
  // by the invoking session is prose that session wrote from something it
  // read, and the Packet is the writer's entire input only if nobody else
  // writes. Named as removed so a caller on the old entry point is told the
  // route rather than shown a silent change of author.
  if (Object.prototype.hasOwnProperty.call(args, "file")) {
    fail(`section no longer takes --file — the realization is written by the declared writer (src/draft-workflow.json) from the Packet and recorded here; \`section --leg ${id}\` is the whole invocation (kogaki#1237, Fresh Call)`);
  }
  const leg = brief.legs.find((s) => s.leg_id === id);
  if (!leg) {
    fail(`no leg "${id}" in this Brief's Reader Path (${brief.legs.map((s) => s.leg_id).join(", ")}) — the path is the Brief's, and /draft never re-opens it`);
  }
  // ONE NAME FOR THE WORKSPACE (PR #814 round 1, finding 3). The backstop's
  // refusal depends on this path, so a second binding for the same value is a
  // divergence hazard in exactly the function that must not drift.
  const ws = workspaceFor(args, brief.slug);
  const lang = langOf(args);
  // THE BACKSTOP (kogaki#811, the Packet architecture). Render-within supplies the Packet;
  // this catches what render-within structurally cannot see — a Packet deleted
  // or gone stale between the render and the realization. Checked BEFORE the
  // section file is read, so a run that owes a Packet is told that rather than
  // a read error about prose it should not be recording yet.
  //
  // STALENESS IS THE SHA, not the timestamp: run.json records the sha the
  // Packet was served with, so a file edited after the render disagrees with
  // its own record. A Packet whose record is missing is the SAME refusal —
  // "rendered" means recorded, and an unrecorded file cannot be shown to be
  // the one this Leg was realized from.
  const packetPath = join(packetsDir(ws, lang), `${id}.md`);
  if (!existsSync(packetPath)) {
    fail(`leg ${id} has no rendered Packet at ${packetPath} — the Packet is a Leg's ENTIRE input, so realizing one without it means the prose was written from something else. `
      + `The Harness renders it at \`resolve\` and after each \`section\`; if it was deleted, \`packet --leg ${id}\` restores it`);
  }
  let recordedSha = null;
  try { recordedSha = (JSON.parse(readFileSync(join(ws, "run.json"), "utf8"))[packetsRecordKey(lang)] || {})[id]?.sha256 || null; }
  catch { /* no run record — handled as unrecorded below */ }
  const packetText = readFileSync(packetPath, "utf8");
  const onDiskSha = sha256(packetText);
  if (recordedSha === null) {
    fail(`leg ${id} has a Packet file at ${packetPath} that no run record accounts for — a Packet is "rendered" when the run records its sha, and an unrecorded file cannot be shown to be the one this Leg was realized from. Re-render with \`packet --leg ${id}\``);
  }
  if (recordedSha !== onDiskSha) {
    fail(`leg ${id}'s Packet changed after it was rendered — recorded ${recordedSha.slice(0, 12)}, on disk ${onDiskSha.slice(0, 12)}. `
      + `The prose may have been realized from either, and nothing here can tell which. Re-render with \`packet --leg ${id}\` and realize again`);
  }

  // THE WRITER IS CALLED WITH THE PACKET AS ITS ENTIRE STDIN, and the response
  // is judged by the SAME refusals the file route carried (foreign Strand,
  // record as structure, a drawn figure, a heading) plus emptiness, each a
  // re-ask up to the declared retries and then a failure naming the Leg.
  const settings = writerSettings();
  const written = callWriter({ settings, act: "section", legId: id, input: packetText,
    refuse: (text) => sectionProseRefusal(text, id, brief) });
  const content = written.text;
  mkdirSync(sectionsDir(ws, lang), { recursive: true });
  let seq = 0;
  try { seq = readdirSync(join(ws, "snapshots")).length; } catch { /* first snapshot */ }
  snapshotDraft(ws, `before-${id}`, seq, assembleBody(brief, ws, lang).body);
  writeFileSync(join(sectionsDir(ws, lang), `${id}.md`), content);
  snapshotDraft(ws, `after-${id}`, seq + 1, assembleBody(brief, ws, lang).body);
  process.stdout.write(`section ${id} recorded (${brief.legs.findIndex((s) => s.leg_id === id) + 1} of ${brief.legs.length} legs)\n`);
  // THE FIGURE IS DESIGNED FROM THE TEXT (the figure record, kogaki#878). A Leg carrying
  // `figure:` gets its figure input here — after its prose is recorded and
  // before the next Leg's Packet — so the ordering the hub ruled is the
  // HARNESS'S, not a step a session may remember to take. The next Packet is
  // driven by `figure`, not here: two inputs printed at once would leave the
  // realizer choosing which to answer.
  if (leg.figure !== undefined && leg.figure !== null) {
    const form = figureFormFor(leg);
    if (form.error) fail(form.error);
    const tplPath = join(dirname(fileURLToPath(import.meta.url)), "packet-template.md");
    let template;
    try { template = readFileSync(tplPath, "utf8"); }
    catch (e) { fail(`the Packet template at ${tplPath} cannot be read (${e.message}) — the figure block lives in it and the command has no built-in fallback`); }
    const split = splitPacketTemplate(template);
    if (split.error) fail(split.error);
    // THE FIGURE INPUT IS RENDERED HERE ONLY TO REFUSE EARLY: it is not
    // printed. `figure --leg <id>` renders the same input from the same stored
    // Packet and prose and hands it to the writer; nothing reaches the session.
    const r = renderFigureInput({ figureTemplate: split.figure, packetText, leg, form, prose: content });
    if (r.error) fail(r.error);
    process.stdout.write(`leg ${id} carries a figure — record it with \`figure --leg ${id}\`; the next Leg's Packet follows that\n`);
    return;
  }
  const nextId = driveNextPacket(brief, args, ws);
  if (nextId) process.stdout.write(`next: ${nextId} — its Packet is rendered to the run's packets directory, never printed here; realize it with \`section --leg ${nextId}\`\n`);
}

// the figure record's entry point (kogaki#878). ONE LEG, ONE RECORD, AFTER ITS PROSE.
function cmdFigure(args) {
  const brief = loadBrief(args);
  const id = argString(args, "leg", "figure needs --leg <leg_id>");
  if (Object.prototype.hasOwnProperty.call(args, "file")) {
    fail(`figure no longer takes --file — the record is written by the declared writer (src/draft-workflow.json) from the figure input and recorded here; \`figure --leg ${id}\` is the whole invocation (kogaki#1237, Fresh Call)`);
  }
  const leg = brief.legs.find((s) => s.leg_id === id);
  if (!leg) {
    fail(`no leg "${id}" in this Brief's Reader Path (${brief.legs.map((s) => s.leg_id).join(", ")}) — the path is the Brief's, and /draft never re-opens it`);
  }
  if (leg.figure === undefined || leg.figure === null) {
    fail(`leg ${id} declares no figure: — the default is NONE (the figure decision), so there is no form for a record to be an instance of. `
      + `A figure enters at composition, on the Brief, and never here`);
  }
  const ws = workspaceFor(args, brief.slug);
  const lang = langOf(args);
  // THE PROSE FIRST, AND THE REFUSAL SAYS WHY. The record's caption is stated
  // in what the reader holds after reading this Leg, and its elements are
  // worded against prose that must already exist — the hub's third moment.
  // A record filled before the text is a figure the text then has to match.
  const sectionFile = join(sectionsDir(ws, lang), `${id}.md`);
  if (!existsSync(sectionFile)) {
    fail(`leg ${id} has no realized prose at ${sectionFile} — the figure is designed FROM the text (the figure record), so the record cannot be filled before \`section --leg ${id}\` records it`);
  }
  const form = figureFormFor(leg);
  if (form.error) fail(form.error);

  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "figure-schema.json");
  let schema;
  try { schema = JSON.parse(readFileSync(schemaPath, "utf8")); }
  catch (e) { fail(`the figure schema at ${schemaPath} cannot be read (${e.message}) — it is a runtime-read carrier and this command has no built-in fallback, deliberately: a fallback schema would be a second copy nobody maintains`); }

  // THE FIGURE INPUT: the stored Packet, as served, plus the filled figure block
  // (the figure record, kogaki#878), rendered here from the run's own files and
  // handed to the writer as its ENTIRE stdin (Fresh Call, kogaki#1237). The
  // response is the record; its mechanical validation is the re-ask condition.
  const packetPath = join(packetsDir(ws, lang), `${id}.md`);
  if (!existsSync(packetPath)) {
    fail(`leg ${id} has no rendered Packet at ${packetPath} — the figure input is the served Packet plus the figure block, and a Packet that is gone cannot be served again as the one the prose was realized from; \`packet --leg ${id}\` restores it`);
  }
  const packetText = readFileSync(packetPath, "utf8");
  const prose = readFileSync(sectionFile, "utf8");
  const tplPath = join(dirname(fileURLToPath(import.meta.url)), "packet-template.md");
  let template;
  try { template = readFileSync(tplPath, "utf8"); }
  catch (e) { fail(`the Packet template at ${tplPath} cannot be read (${e.message}) — the figure block lives in it and the command has no built-in fallback`); }
  const split = splitPacketTemplate(template);
  if (split.error) fail(split.error);
  const rendered = renderFigureInput({ figureTemplate: split.figure, packetText, leg, form, prose });
  if (rendered.error) fail(rendered.error);

  const settings = writerSettings();
  let record = null;
  callWriter({ settings, act: "figure", legId: id, input: rendered.input,
    refuse: (text) => {
      const parsed = parseWriterRecord(text);
      if (parsed.error) return parsed.error;
      const bad = figureRecordRefusal(parsed.record, leg, form, schema);
      if (bad) return bad;
      record = parsed.record;
      return null;
    } });

  // STORED IN THE SCHEMA'S FIELD ORDER, not the input file's. The record is
  // read back by `emit` and by kogaki#880's review, and a stored artifact whose
  // bytes depend on how the model happened to order its keys is one whose sha
  // moves without its content moving.
  const ordered = {};
  for (const k of [...schema.required, ...(schema.optional || [])]) {
    if (Object.prototype.hasOwnProperty.call(record, k)) ordered[k] = record[k];
  }
  const dir = join(ws, "figures");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${id}.json`);
  const text = JSON.stringify(ordered, null, 2) + "\n";
  writeFileSync(out, text);
  const sha = sha256(text);
  // THE SAME ARRANGEMENT THE PACKET RECORD HAS, and for the same reason: a
  // print is read by whoever is watching and a record is read by whoever comes
  // after. `emit` reads this, never the directory — an unrecorded file cannot
  // be shown to be the one this Leg's figure was validated from.
  const runFile = join(ws, "run.json");
  try {
    let rec = {};
    if (existsSync(runFile)) rec = JSON.parse(readFileSync(runFile, "utf8"));
    rec.figures = { ...(rec.figures || {}), [id]: { path: out, sha256: sha, kind: form.kind, position: ordered.position } };
    writeFileSync(runFile, JSON.stringify(rec, null, 2) + "\n");
  } catch (e) {
    process.stderr.write(`draft: the figure record's path and sha were not recorded in ${runFile} (${e.message}) — the record itself is written; the record is the trace, and the trace never gates the write it traces\n`);
  }
  process.stdout.write(`figure ${id} recorded (${form.kind}, position ${ordered.position}) — ${out}\n`);
  const nextId = driveNextPacket(brief, args, ws);
  if (nextId) process.stdout.write(`next: ${nextId} — its Packet is rendered to the run's packets directory, never printed here; realize it with \`section --leg ${nextId}\`\n`);
}

function cmdEmit(args) {
  const brief = loadBrief(args);
  const ws = workspaceFor(args, brief.slug);
  const lang = langOf(args);
  const { body, missing, ranges, figureRanges, figures, figureErrors } = assembleBody(brief, ws, lang);
  if (missing.length) {
    fail(`the run is not at completion: leg(s) ${missing.join(", ")} have no realized section${lang !== "en" ? ` in lang ${lang}` : ""} — a /draft run ends when the CanonicalDraft exists, and these are what it still owes (SPEC-draft-command, the read-not-invented rule)`);
  }
  // A FIGURE-CARRYING LEG OWES ITS RECORD, exactly as every Leg owes its
  // prose (the figure record, kogaki#878). The Brief declared the figure; a Draft emitted
  // without it would silently drop a decision the owner made at the Candidate
  // gate, and nothing downstream would report the drop — which is the shape
  // this repository refuses everywhere else it appears.
  let figureRecords = {};
  try { figureRecords = JSON.parse(readFileSync(join(ws, "run.json"), "utf8")).figures || {}; }
  catch { /* no run record — every figure-carrying Leg reports its absence below */ }
  const owedFigures = figureLegs(brief.legs)
    .filter((s) => !(figureRecords[s.leg_id] && existsSync(figureRecords[s.leg_id].path)))
    .map((s) => s.leg_id);
  if (owedFigures.length) {
    fail(`the run is not at completion: leg(s) ${owedFigures.join(", ")} declare figure: and have no recorded figure record — `
      + `the record is filled after that Leg's prose and recorded with \`figure --leg <id> --file <record.json>\` (the figure record)`);
  }
  // A RECORDED FIGURE THAT WILL NOT RENDER STOPS THE ARTIFACT (the renderer and the anchor). The
  // guard above answers "is a record owed"; this answers "does it render", and
  // the two are separable — a record can exist, resolve and validate, and still
  // name a kind this runtime has no seat for. Emitting the Draft with the block
  // silently absent is the drop-with-no-report shape the figure record refuses one act
  // earlier, so it is refused here for the same reason.
  if (figureErrors.length) {
    fail(`the figure(s) this run recorded do not render: ${figureErrors.join("; ")} — the markup is the Harness's (the renderer and the anchor), so this is a renderer or a record defect and never prose to be written around`);
  }
  // THE RESERVED-NAME RECONCILIATION (SPEC-draft-command "The name is reserved,
  // and the reservation precedes the collision", kogaki#1158): a
  // non-English realization writes `draft.<lang>.md`, sibling to the reserved
  // `draft.md` and never colliding with it — `draft.md` is reserved for the
  // English CanonicalDraft alone, unchanged.
  const outPath = lang === "en" ? join(dirname(brief.path), "draft.md") : join(dirname(brief.path), `draft.${lang}.md`);
  // `generated_by` is an immutable birth record: an overwrite keeps the
  // artifact's original one, and this run's identity goes to the workspace.
  let generatedBy = {
    at: new Date().toISOString(),
    by: "src/draft.mjs (story 1.80, kogaki#587)",
    brief_sha: sha256(brief.text),
  };
  if (existsSync(outPath)) {
    const prior = readFileSync(outPath, "utf8").match(/^generated_by: (\{.*\})\s*$/m);
    if (prior) { try { generatedBy = JSON.parse(prior[1]); } catch { /* keep fresh */ } }
  }
  const cites = brief.strands.flatMap((s) =>
    s.cites.map((c) => ({ strand: s.id, slug: s.slug, kind: c.kind, cite: c.cite })));
  // THE TRACE MAPS EACH LEG TO ITS SECTION, not to its own ordinal
  // (kogaki#823). `section: i + 1` numbered the Legs and called the result a
  // section, which was true only while the two units were the same one — after
  // the Section grouping it asserted a one-to-one mapping that the Brief may not declare, so a
  // reader of the trace could not tell which Legs shared a heading.
  const secOf = sectionOfLeg(brief.legs);
  const trace = brief.legs.map((s) => {
    const sec = secOf.get(s.leg_id);
    return { leg_id: s.leg_id, section: sec.index, ...(sec.title !== undefined ? { section_title: sec.title } : {}) };
  });
  // THE PACKET RECORD IS READ, NEVER RE-DERIVED (kogaki#868). `cmdPacket` wrote
  // path and sha to run.json at the render; recomputing a sha here would answer
  // for the file as it stands rather than for the input that produced the
  // prose, which is the whole of what the trace is for.
  let packets = {};
  try { packets = JSON.parse(readFileSync(join(ws, "run.json"), "utf8"))[packetsRecordKey(lang)] || {}; }
  catch { /* no run record, or unreadable — every Leg reports its absence below */ }
  // The artifact is owner-visible and machine-independent (round 1 finding 3):
  // the Brief is named relative to the draft that realizes it — always its
  // sibling — so two machines emit identical bytes. The absolute path is
  // machine identity and stays in run.json / last-emit.json.
  // terms_sha_at_generation (acceptance item 1; the Terminology List
  // Decision): sha256 of terms/prh.yml as it stood when this run's Packets
  // were rendered — read fresh here rather than threaded through run.json,
  // because a `--lang` run renders every Packet against the same file in one
  // sitting and `emit` is its last act. WRITES NOTHING ELSE NEW: this is the
  // one field acceptance item 1 names, plus `lang:` so a reader (and this
  // Draft's own reconciliation with the reserved-name clause) can tell which
  // realization produced it without parsing the filename.
  let termsShaAtGeneration = null;
  if (lang !== "en") {
    const termsPath = typeof args["terms-path"] === "string" && args["terms-path"] !== "" ? args["terms-path"] : DEFAULT_TERMS_PATH;
    try { termsShaAtGeneration = sha256Terms(readFileSync(termsPath, "utf8")); }
    catch (e) { fail(`the term list at ${termsPath} cannot be read (${e.message}) — terms_sha_at_generation cannot be recorded without it`); }
  }
  const head = [
    "---",
    `brief: ${relative(dirname(outPath), brief.path)}`,
    `brief_pin: sha256:${sha256(brief.text)}`,
    `survey_pin: ${brief.surveyPin}`,
    `generated_by: ${JSON.stringify(generatedBy)}`,
    ...(lang !== "en" ? [`lang: ${lang}`, `terms_sha_at_generation: ${termsShaAtGeneration}`] : []),
    "cites:",
    ...cites.map((c) => `  - ${JSON.stringify(c)}`),
    "trace:",
  ];
  // THE NUMBERS ARE WHAT AN EDITOR SHOWS: 1-based over the file as written,
  // frontmatter included. The offset is countable before the entries are
  // filled because an entry renders as exactly ONE line whatever it carries —
  // head lines, then one per trace entry, then the closing `---`, then the
  // blank line the `\n\n` join leaves. So body line 1 is file line
  // `bodyOffset + 1`, and the count cannot circle back on the values below.
  const bodyOffset = head.length + trace.length + 2;
  for (const t of trace) {
    const span = ranges.get(t.leg_id);
    if (span) t.lines = [span[0] + bodyOffset, span[1] + bodyOffset];
    const rec = packets[t.leg_id];
    if (rec && typeof rec.path === "string" && typeof rec.sha256 === "string") {
      // Relative to the draft, the same convention `brief:` uses above: the sha
      // identifies the input, the path is repo-relative, and neither is machine
      // identity (DESIGN.md, "Lifetimes: what is owner state and what is machine state").
      t.packet = relative(dirname(outPath), rec.path);
      t.packet_sha = rec.sha256;
    } else {
      // The trace never gates the write it traces — the same rule `snapshotDraft`
      // and `cmdPacket`'s own record write already hold.
      process.stderr.write(`draft: leg ${t.leg_id} has no readable packet record in ${join(ws, "run.json")} — its trace entry carries no packet fields; the trace never gates the write it traces\n`);
    }
    // THE FIGURE ENTRY (the renderer and the anchor, kogaki#879). `record` is relative to the draft,
    // the convention `brief:` and `packet:` already use — two machines emit
    // identical bytes — and `record_sha` is the sha `figure` recorded at
    // validation, READ rather than recomputed. `lines` is the block's own span,
    // beside the Leg's prose range and never inside it: a reader joining a
    // rendered figure back to the record it came from needs both, and a single
    // range carrying both would answer for neither.
    const fig = figures.get(t.leg_id);
    if (fig) {
      const span = figureRanges.get(t.leg_id);
      t.figure = {
        position: fig.position,
        record: relative(dirname(outPath), fig.path),
        record_sha: fig.sha256,
        ...(span ? { lines: [span[0] + bodyOffset, span[1] + bodyOffset] } : {}),
      };
    }
  }
  const fm = [
    ...head,
    ...trace.map((t) => `  - ${JSON.stringify(t)}`),
    "---",
  ].join("\n");
  writeFileSync(outPath, fm + "\n\n" + body + "\n");
  writeFileSync(join(ws, "last-emit.json"), JSON.stringify({
    out: outPath, at: new Date().toISOString(), body_sha: sha256(body),
  }, null, 2) + "\n");
  process.stdout.write(`CanonicalDraft: ${outPath} (one per Brief, fixed human name, overwritten on re-run)\n`);
}

// THIS FILE IS BOTH A COMMAND AND A LIBRARY, AND THE GUARD IS WHAT MAKES THE
// SECOND POSSIBLE (kogaki#1014). ReviewDraft and the checks import this
// module's exports, so it has to be importable. Without the guard the dispatch below ran at import, read the
// IMPORTER's argv, matched no subcommand and exited 1: `review-draft open`
// died on draft.mjs's usage line before writing anything.
//
// The check is the module's own URL against the process entry point, so
// `node src/draft.mjs …` still runs the CLI and every import is silent.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  switch (args._cmd) {
    case "resolve": cmdResolve(args); break;
    case "material": cmdMaterial(args); break;
    case "packet": cmdPacket(args); break;
    case "section": cmdSection(args); break;
    case "figure": cmdFigure(args); break;
    case "emit": cmdEmit(args); break;
    default: fail("usage: draft.mjs resolve|material|packet|section|figure|emit --brief <path> [--workspace <dir>] [--strand <L-id>] [--leg <id>]");
  }
}
