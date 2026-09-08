#!/usr/bin/env node
// draft — the /draft runtime and the CanonicalDraft it writes
// (SPEC-draft-command v1, kogaki#573; story 1.80, kogaki#587).
//
// THE THREE-LAYER BOUNDARY IS THE FILE'S OWN STRUCTURE. This module is
// the HARNESS and the SCHEMA half: it resolves the adopted Brief and refuses
// a template, establishes the closed reference set, iterates the Reader
// Path's Steps in their recorded order, keeps per-block snapshots
// machine-local, and writes the CanonicalDraft with its record half. The LLM
// layer — the prose realizing each Step's reader_state_before →
// reader_state_after transition — arrives through `section` and is judged
// nowhere here: when a Draft comes out strange the first suspect is the Step
// it realized or the judgment realizing it (the sole mechanical instrument on
// grounding), and neither is reachable by
// this harness.
//
// Six commands, one per harness act:
//   resolve  — parse the Brief; refuse a template BY FIELD NAME (a template
//              is not an input); print the plan (closed Strand set, Steps in
//              order); write the machine-local run record.
//   material — hand back the Brief's own material for one settled Strand.
//              A Strand outside the closed set refuses BY NAME, the same
//              shape `fillBrief` refuses a foreign L-id with: the set closed
//              at mint, and growing it routes back through Terrain (the closed reference set).
//   section  — accept one Step's realized prose. Refusals: an unknown
//              step_id names both sides; prose naming a Strand outside the
//              closed set refuses by name. Snapshots the assembled state
//              into the run workspace — no per-block commit and no tracked
//              diff artifact (the kogaki#523 constraint).
//   packet   — render the Step Packet: the model's ENTIRE input for one
//              Step (the Step Packet, kogaki#749), deterministic and stored as served.
//   figure   — accept one Step's figure record: the INSTANCE of its Move's
//              visual_form, filled after that Step's prose is recorded
//              (kogaki#878). Validated against src/figure-schema.json, the
//              kind's role set, and the BRIEF's own role→ground binding; a
//              record that moved a role to another ground refuses by role.
//   emit     — assemble the CanonicalDraft: body = the sections in the
//              Reader Path's recorded order, prose only; frontmatter = the
//              record half. Repo-visible under a fixed human name
//              derived from the Brief — theses/<slug>/draft.md — one per
//              Brief, overwritten on re-run, `generated_by` immutable across
//              overwrites. Machine identity stays in the run workspace.
//
// THE COMPLETION CONTRACT LIVES IN THE FLOW, NOT HERE: a run ends when
// the CanonicalDraft exists, and the only legitimate earlier stop is a NAMED
// inspection-need. This runtime's half of it is mechanical: `emit` refuses
// while any Step lacks its section, so a flow cannot end "done" short of the
// artifact without the refusal saying exactly which Steps are owed.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
// already drifted into eight variants, which is what kogaki#982 collapsed.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   the closed reference set
//       SPEC-draft-command
//   the three-layer boundary
//       SPEC-draft-command
//   the read-not-invented rule
//       SPEC-draft-pipeline
//   the Step and the Move it binds
//       SPEC-draft-pipeline
//   the Step's shape
//       SPEC-draft-pipeline
//   the Step-Move instantiation contract
//       SPEC-draft-pipeline
//   the mechanical half of move id resolution
//       SPEC-draft-pipeline
//   the reader-knowledge ledger
//       SPEC-draft-pipeline
//   the Move exemplar predicate
//       SPEC-draft-pipeline
//   the Step Packet
//       SPEC-draft-pipeline
//   the runtime-read template
//       SPEC-draft-pipeline
//   the Section grouping
//       SPEC-draft-pipeline
//   the figure decision
//       SPEC-draft-pipeline
//   the figure record
//       SPEC-draft-pipeline
//   the renderer and the anchor
//       SPEC-draft-pipeline
//   the judgment rule
//       SPEC-draft-pipeline
//   the Brief's centre and its obligations ledger
//       SPEC-draft-pipeline
//   the durable home and the entry point
//       SPEC-draft-pipeline
//   the closed kind set and the Move's visual_form
//       SPEC-draft-pipeline
//   the Move library
//       SPEC-draft-pipeline
//
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join, resolve, relative, dirname, basename, sep } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
// the Step-Move instantiation contract's mechanical half is ONE function shared with the composition side
// (src/compose.mjs), never a second copy here: two resolvers are two things
// that can disagree about what a dangling move id is, and the refusal a
// composer sees would stop matching the one a realizer sees.
import { resolveMoveIds, introducesRefusal, readerKnowledgeLedger, opensSectionRefusal,
  figureRefusal, parseFigureRoles, figureKinds, visualFormOf, figureSteps } from "./compose.mjs";
import { renderFigure, checkMermaid, MERMAID_FENCE } from "./render-figure.mjs";
import { enterRun, laneDir } from "./runs.mjs";

function fail(msg) {
  process.stderr.write(`draft: ${msg}\n`);
  process.exit(1);
}

// The omitted-value guard brief.mjs carries (PR #484 round 1 finding 1),
// inherited unchanged: a bare `--brief` parses as boolean true and String(true)
// reaches readFileSync as a filename.
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

// The typed unfilled slot brief.mjs mints (the durable home and the entry point). Its literal presence is
// what makes "template" decidable by field rather than by judgment.
const SLOT = "*(awaiting composition)*";

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// ---------------------------------------------------------------------------
// Brief parsing — pure over the document text, exported for the fixture pass.
//
// The parse reads exactly what the runtime consumes: slug, survey pin, the
// settled Strand set with its cite lines, and the Sequence's step blocks in
// document order. Everything else in the Brief is reachable material, not
// structure this harness interprets.
// ONE PARSER, AND THIS IS IT (kogaki#1014). A `step` block's fields are read
// HERE and nowhere else: `parseBrief` calls it once per fenced block, and the
// Reverse Outline a Blind Reader hands back is validated by the same call. A
// second reader for the same block is exactly the two-copy divergence the
// Reverse Outlining rebuild exists to remove — the Reverse Outline is a Brief
// Step block, so it is parsed by the Brief parser or it is not one.
//
// Returns `{ step }` or `{ refusal }`. The caller decides what a refusal costs:
// `parseBrief` collects it and keeps reading the document, while a Reverse
// Outline has one block and refuses on it.
export function parseStepBlockBody(body, path) {
  const idM = body.match(/^step_id:\s*(\S+)\s*$/m);
  if (!idM) return { refusal: `the Brief at ${path} carries a step block with no step_id` };
  // `move:` IS READ (the Step-Move instantiation contract, kogaki#747). It was parsed for `step_id` only
  // and the Move binding sat here as uninterpreted dead input, so a typo'd
  // or renamed id rode a minted Brief in silence until the Step Packet
  // assembler joined Step.move → moves/<id>.md and failed mid-draft. Read
  // here, refused at `resolve` below — at the entry to realization rather
  // than partway through it.
  const moveM = body.match(/^move:\s*(\S+)\s*$/m);
  // the reader-knowledge ledger's `introduces:` (kogaki#751), read back from the serialized form.
  // ONE LINE PER ENTRY, matching `renderStep`'s writer — a term may contain
  // a comma and its anchor almost always does, so a comma-joined field could
  // not be parsed back at all. Absent entirely is the ordinary case and is
  // not an absence to report: a Step that introduces nothing carries no
  // line, and the ledger below simply has nothing to fold in from it.
  const introduces = [...body.matchAll(/^introduces:\s*(.*)$/gm)].map((x) => x[1]);
  // A MALFORMED ENTRY REFUSES NAMING THE STEP (acceptance). The shape
  // grammar is the composition side's, imported rather than re-expressed:
  // the writer and the reader disagreeing about what an entry is would be
  // the round trip failing silently at exactly the field whose value is an
  // accumulation nobody re-derives by hand.
  if (introduces.length) {
    const bad = introducesRefusal(introduces, `the Brief at ${path}, step ${idM[1]}`);
    if (bad) return { refusal: bad };
  }
  // the Section grouping's `opens_section:` (kogaki#823), read back from the serialized form
  // `renderStep` writes. THE PARSE-BACK IS WHAT MAKES THE DECLARATION LIVE:
  // kogaki#822 landed the field, its four grouping rules and its writer, and
  // nothing on this side read it — so a Brief could declare its Sections
  // perfectly and the Draft would still render one heading per Step, with
  // every check green. The round trip is asserted at both ends through ONE
  // shared shape grammar, imported rather than re-expressed, for the reason
  // `introduces` is: a writer and a reader disagreeing about what a value is
  // fails silently at exactly the field whose value reaches an owner-facing
  // heading.
  // `[ \t]*` and NOT `\s*`: `\s` matches a newline, so a blank value would
  // eat the line break and capture the NEXT field's line as the title — a
  // Section silently headed "purpose: ..." instead of refusing. Caught by the
  // blank-value fixture below; the same idiom `stepField` already uses.
  const opensM = body.match(/^opens_section:[ \t]*(.*)$/m);
  let opens_section;
  if (opensM) {
    const bad = opensSectionRefusal(opensM[1].trim(), `the Brief at ${path}, step ${idM[1]}`);
    if (bad) return { refusal: bad };
    opens_section = opensM[1].trim();
  }
  // the figure decision's `figure:`/`figure_roles:` (kogaki#877), read back from the
  // serialized form `renderStep` writes. THE PARSE-BACK IS WHAT MAKES THE
  // DECLARATION REACH THE PAGE: #877 landed the field, its grammar and its
  // writer, and nothing on this side read it — so a Brief could declare a
  // figure perfectly and the Draft would render none, with every check green.
  // The same round-trip arrangement `introduces` and `opens_section` have,
  // through the SAME shared grammar imported from the composition side: a
  // writer and a reader disagreeing about what a binding is fails silently at
  // exactly the field whose value reaches a rendered figure.
  //
  // `[ \t]*` and not `\s*`, for the reason `opens_section` states: `\s`
  // spans a newline, so a blank `figure:` would capture the NEXT field's line
  // as the figure's reason instead of refusing.
  const figM = body.match(/^figure:[ \t]*(.*)$/m);
  const rolesM = body.match(/^figure_roles:[ \t]*(.*)$/m);
  let figure, figure_roles;
  if (figM || rolesM) {
    let parsedRoles;
    if (rolesM) {
      const r = parseFigureRoles(rolesM[1]);
      if (r.error) return { refusal: `the Brief at ${path}, step ${idM[1]}: figure_roles — ${r.error} (the figure decision)` };
      parsedRoles = r.roles;
    }
    // THE GRAMMAR IS THE COMPOSITION SIDE'S, not a second expression of it.
    // A blank `figure:` reaches here as the empty string, which is what the
    // shared refusal already calls a half-declaration.
    const bad = figureRefusal(figM ? figM[1].trim() : undefined, parsedRoles,
      `the Brief at ${path}, step ${idM[1]}`);
    if (bad) return { refusal: bad };
    figure = figM[1].trim();
    figure_roles = parsedRoles;
  }
  return { step: { step_id: idM[1], move: moveM ? moveM[1] : null, introduces, opens_section, figure, figure_roles, body } };
}

// The fenced form. A Reverse Outline is ONE `step` block and this is what
// unwraps it: the fence grammar is `parseBrief`'s own, so a Blind Reader who
// writes a block the Brief could not carry is refused here rather than
// downstream at a field nobody declared.
export function parseStepBlock(text, path = "<reverse-outline>") {
  const m = /^```step\n([\s\S]*?)\n```/m.exec(text);
  if (!m) {
    return { refusal: `${path} carries no fenced \`step\` block — a Reverse Outline IS a Brief Step block, `
      + "written in the Brief's own field names, so there is nothing here to compare against the Forward Artifact" };
  }
  const rest = text.slice(m.index + m[0].length);
  if (/^```step\n/m.test(rest)) {
    return { refusal: `${path} carries more than one fenced \`step\` block — a Reverse Outline is the reading of ONE passage, `
      + "and two blocks leave the Harness to pick which one the reader meant" };
  }
  return parseStepBlockBody(m[1], path);
}

export function parseBrief(text, path = "<brief>") {
  const lines = text.split("\n");
  const refusals = [];

  // A template is refused BY FIELD (AC1): the slot token's nearest preceding
  // heading names the field the refusal carries.
  let heading = "(document head)";
  for (const ln of lines) {
    const h = ln.match(/^##\s+(.+?)\s*$/);
    if (h) heading = h[1];
    if (ln.includes(SLOT)) {
      refusals.push(`the Brief at ${path} is a template, not an input: the field "${heading}" still reads as an unfilled slot (${SLOT})`);
      break;
    }
  }

  const slugM = text.match(/^# Brief — (.+?)\s*$/m);
  const slug = slugM ? slugM[1] : basename(dirname(resolve(path)));

  const pinM = text.match(/\*Survey pin:\*\s*`([^`]+)`/);
  const surveyPin = pinM ? pinM[1] : null;
  if (!surveyPin) refusals.push(`the Brief at ${path} carries no survey pin line — the closed set has no pin to be read at`);

  // Strands: "### L<n> — <slug>" with their cite lines.
  const strands = [];
  const strandRe = /^### (L\d+) — (\S+)\s*$/gm;
  let m;
  while ((m = strandRe.exec(text)) !== null) {
    const tail = text.slice(m.index);
    const block = tail.slice(0, tail.indexOf("\n###", 1) === -1 ? tail.length : tail.indexOf("\n###", 1));
    const cites = [...block.matchAll(/^- (journey cite|cite): `([^`]+)`\s*$/gm)]
      .map((c) => ({ kind: c[1], cite: c[2] }));
    strands.push({ id: m[1], slug: m[2], cites });
  }
  if (strands.length === 0) refusals.push(`the Brief at ${path} settles no Strands — nothing is reachable`);

  // Steps: fenced ```step blocks, in document order. The order IS the Reader
  // Path (AC3); nothing below re-sorts it.
  const steps = [];
  const stepRe = /^```step\n([\s\S]*?)\n```/gm;
  while ((m = stepRe.exec(text)) !== null) {
    const parsed = parseStepBlockBody(m[1], path);
    if (parsed.refusal) { refusals.push(parsed.refusal); continue; }
    steps.push(parsed.step);
  }
  if (steps.length === 0 && refusals.length === 0) {
    refusals.push(`the Brief at ${path} carries no Reader Path steps — there is nothing to realize`);
  }

  return { slug, surveyPin, strands, steps, refusals, text };
}

// The closed-set refusal, in `fillBrief`'s own shape: name the foreign id AND
// the set it is not in, and say where growing the set belongs.
export function foreignStrandRefusal(id, strands) {
  const set = strands.map((s) => s.id).join(", ");
  return `${id} is not in this Brief's settled set (${set}) — the set closed at mint; growing it is an owner act routed back through Terrain, never a /draft fetch (SPEC-draft-command, the Step and the Move it binds)`;
}

// Scan LLM-authored prose for Strand tokens outside the closed set (AC2's
// assertion shape: a run whose material names a foreign Strand refuses by
// name). In-set tokens pass — whether internal vocabulary belongs in reader
// prose at all is a register question — carried by src/packet-template.md and
// grounded at specs/spec-brief-draft-design/DESIGN.md, "Plain register, and the round trip" — not the closed set's.
export function scanForeignStrands(content, strands) {
  const set = new Set(strands.map((s) => s.id));
  const seen = new Set();
  for (const t of content.matchAll(/\bL\d+\b/g)) {
    if (!set.has(t[0])) seen.add(t[0]);
  }
  return [...seen];
}

// The trace never renders as visible structure in the article body (AC6):
// refuse a section that carries a step key line or a heading that is a bare
// step_id — those are record, and the record's home is the frontmatter.
export function findTraceStructure(content, stepIds) {
  const bad = [];
  if (/^\s*step_id\s*:/m.test(content)) bad.push("a `step_id:` key line");
  for (const id of stepIds) {
    if (new RegExp(`^#{1,6}\\s*${id}\\s*$`, "m").test(content)) {
      bad.push(`a heading that is the bare step id ${id}`);
    }
  }
  return bad;
}

// ---------------------------------------------------------------------------
// Workspace — machine identity lives here and only here (the three-layer boundary): run record,
// per-block snapshots, section files, Packets. Default under `runs/draft/`
// since kogaki#750 (`~/.kogaki/draft-runs/` before it); --workspace overrides
// for the fixture pass, which never touches either.
//
// PURE: this RESOLVES a destination and creates nothing. Preparing the
// workspace, and pruning the lane before doing so, is `enterWorkspace` below —
// the split `runs.mjs` and `terrain.mjs` both make, and it matters here because
// four of the five commands call this one mid-run, when pruning would be a
// lane act performed by a step that owns no run.
function workspaceFor(args, slug) {
  const base = typeof args.workspace === "string" && args.workspace !== ""
    ? args.workspace
    : laneDir("draft");
  return join(base, slug);
}

// The lane entry point, called by `resolve` alone: `resolve` is the run's first
// act, so the keep-last-K prune belongs there and nowhere else. A `--workspace`
// caller prunes nothing — they named the directory, so they hold it.
function enterWorkspace(args, slug) {
  if (typeof args.workspace === "string" && args.workspace !== "") {
    const ws = workspaceFor(args, slug);
    mkdirSync(ws, { recursive: true });
    return ws;
  }
  return enterRun("draft", slug);
}

// Per-block snapshot (kogaki#523 shape): the FULL assembled state, into
// the run workspace, before-and-after per section landing. A snapshot failure
// WARNS AND CONTINUES — the trace never gates the write it traces.
function snapshotDraft(ws, phase, seq, content) {
  try {
    const dir = join(ws, "snapshots");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${String(seq).padStart(3, "0")}-${phase}.md`), content);
  } catch (e) {
    process.stderr.write(`draft: snapshot ${phase} skipped (${e.message}) — the trace never gates the write\n`);
  }
}

function loadBrief(args) {
  const path = argString(args, "brief", "this command needs --brief <path to theses/<slug>/brief.md>");
  let text;
  try { text = readFileSync(path, "utf8"); }
  catch (e) { fail(`the Brief at ${path} cannot be read (${e.message})`); }
  const brief = parseBrief(text, path);
  if (brief.refusals.length) fail(brief.refusals[0]);
  // the Step-Move instantiation contract's MECHANICAL HALF at the realization entry: `resolve` refuses an
  // EXISTING Brief carrying a move id that resolves to no record, naming the
  // Step and the id. The composition-side seat (assemble.mjs adopt-candidate)
  // stops one entering a Brief; this one stops a Brief whose library moved
  // underneath it — a Move renamed or withdrawn after the Brief was composed
  // dangles without the Brief changing at all, so neither seat subsumes the
  // other. The judged half is NOT re-run here: it was rendered at composition
  // by a sitting reading the material, and re-deriving it at realization
  // would be this runtime composing a verdict, which the Step-Move instantiation contract forbids.
  // THE STORE DEFAULT IS WORKING-DIRECTORY-RELATIVE, and this entry is shared
  // by resolve, material, section and emit — so all four gain a cwd dependency
  // this runtime did not have before (a Brief arrives as a path; the workspace
  // default is home-relative). Driven from outside the repository root they
  // refuse as a STORE fault naming `--moves-dir`, which is legible rather than
  // silent. Not made Brief-relative on purpose: inferring a repository root
  // from a Brief's path guesses at a layout the spec does not govern, and a
  // wrong guess resolves SILENTLY against the wrong library (the mechanical half of move id resolution).
  const resolved = resolveMoveIds(brief.steps, args["moves-dir"]);
  if (resolved.error) fail(resolved.error);
  return { ...brief, path: resolve(path), movesChecked: resolved.checked };
}

// the Section grouping's SECTION GROUPING, derived from the Brief and from nothing else
// (kogaki#823). ONE derivation, shared by the renderer, the frontmatter trace
// and the Packet: a Section is a run of Steps beginning at a Step that declares
// `opens_section` and continuing until the next one does. The Brief is the only
// input, so what the Draft renders and what a Packet says about where a Step
// sits cannot disagree — two derivations of the same grouping is two things
// that can drift about which Section a Step is in.
//
// A path declaring no `opens_section` at all is the pre-Section-grouping corpus, and it
// derives ONE untitled Section rather than refusing. The refusal for that shape
// is rule 3's and it lives at COMPOSITION (`sectionGroupingRefusal`), where the
// Brief is being authored and can still be fixed; refusing here as well would
// make every Brief minted before this issue unrenderable, which is a migration
// this issue has no licence for and did not ask for.
export function sectionsOf(steps) {
  const sections = [];
  for (const s of steps) {
    if (s.opens_section !== undefined || sections.length === 0) {
      sections.push({ index: sections.length + 1, title: s.opens_section, step_ids: [] });
    }
    sections[sections.length - 1].step_ids.push(s.step_id);
  }
  return sections;
}

// The per-Step view of the same derivation: step_id -> its Section, and whether
// this Step is the one that OPENS it. Both consumers need the mapping keyed
// this way and neither should re-walk the runs to get it.
export function sectionOfStep(steps) {
  const map = new Map();
  for (const sec of sectionsOf(steps)) {
    for (const id of sec.step_ids) {
      map.set(id, { index: sec.index, title: sec.title, opens: id === sec.step_ids[0], step_ids: sec.step_ids });
    }
  }
  return map;
}

// THE FIGURE BLOCKS THIS BODY PLACES (the renderer and the anchor, kogaki#879). Read from the run
// record `figure` wrote, rendered by src/render-figure.mjs, and keyed by Step.
//
// READ, NEVER RE-DERIVED — the same rule the Packet record already holds two
// functions down. `cmdFigure` recorded the path, the sha and the position at
// the moment the record was validated; recomputing any of them here would
// answer for the file as it stands rather than for the record the figure was
// validated as, which is the whole of what the pin is for.
//
// A RENDER FAILURE IS COLLECTED, NEVER THROWN. This function runs inside
// `snapshotDraft` on every `section`, where a half-filled run is the ORDINARY
// state and a throw would take the snapshot down with it. `cmdEmit` is what
// refuses on the collected errors — the trace never gates the write it traces,
// and the artifact does gate.
function figureBlocks(ws) {
  const out = new Map();
  const errors = [];
  let records = {};
  try { records = JSON.parse(readFileSync(join(ws, "run.json"), "utf8")).figures || {}; }
  catch { return { blocks: out, errors }; }
  for (const id of Object.keys(records).sort()) {
    const rec = records[id];
    if (!rec || typeof rec.path !== "string" || !existsSync(rec.path)) continue;
    let record;
    try { record = JSON.parse(readFileSync(rec.path, "utf8")); }
    catch (e) { errors.push(`step ${id}: the figure record at ${rec.path} is not readable JSON (${e.message}) — it was written by \`figure\` and validated then, so a record unreadable now was edited outside the Harness`); continue; }
    const r = renderFigure(record);
    if (r.error) { errors.push(`step ${id}: ${r.error}`); continue; }
    out.set(id, { markup: r.markup, position: rec.position === "before" ? "before" : "after", path: rec.path, sha256: rec.sha256 });
  }
  return { blocks: out, errors };
}

// THE HEADING IS THE HARNESS'S, WRITTEN HERE AND NOWHERE ELSE (kogaki#823).
// `emit` used to concatenate the realized prose and write no heading at all,
// which left the heading to whatever the model happened to produce — five
// headings for five Steps in the 2026-09-03 specimen, the fragmentation half of
// the pair the owner rejected. Deriving them from the Brief's declaration is
// what makes a heading-per-Step draft UNPRODUCIBLE rather than detected: there
// is no input to this function from which one could come.
function assembleBody(brief, ws) {
  const parts = [];
  const missing = [];
  // THE RANGE RIDES THE WALK THAT PRODUCES THE PROSE (kogaki#868). Line
  // accounting computed anywhere else is a second derivation of where a Step
  // sits, and two derivations agree until one is edited; here the range and the
  // bytes it points at cannot disagree, because the same `push` produces both.
  // Body-relative and 1-based; `cmdEmit` offsets by the frontmatter it writes.
  const ranges = new Map();
  let line = 1;
  const push = (text) => {
    const span = [line, line + text.split("\n").length - 1];
    parts.push(text);
    // The `\n\n` join below leaves exactly one blank line between blocks, and
    // that blank line belongs to no Step.
    line = span[1] + 2;
    return span;
  };
  const sections = sectionsOf(brief.steps);
  const opensAt = new Map();
  for (const sec of sections) opensAt.set(sec.step_ids[0], sec);
  // THE FIGURE IS ANCHORED TO ITS STEP, INSIDE ITS SECTION (the renderer and the anchor, kogaki#879).
  // It is pushed by the same `push` the prose is, so its range and the bytes it
  // points at cannot disagree — the kogaki#868 property, extended to the one
  // element the body carries that no Step wrote.
  //
  // NO STEP STRUCTURE BECOMES VISIBLE. The block is a rendered element the
  // Brief declared, in the same standing as a heading: it carries no id, no
  // key line and no marker a reader could read the trace off, so
  // `findTraceStructure`'s subject is untouched by it.
  const { blocks: figures, errors: figureErrors } = figureBlocks(ws);
  const figureRanges = new Map();
  for (const step of brief.steps) {
    const f = join(ws, "sections", `${step.step_id}.md`);
    if (!existsSync(f)) { missing.push(step.step_id); continue; }
    const sec = opensAt.get(step.step_id);
    // An untitled Section renders no heading rather than an empty one. It is
    // reachable only on a pre-Section-grouping path, whose whole body is one Section.
    // A heading line belongs to the Section, never to the Step that opened it.
    if (sec && sec.title !== undefined) push(`## ${sec.title}`);
    const fig = figures.get(step.step_id);
    // `before` sets the prose up and `after` discharges it (the figure record's closed
    // pair). The heading is pushed above either way: a figure never precedes
    // the heading of the Section it sits in.
    if (fig && fig.position === "before") figureRanges.set(step.step_id, push(fig.markup));
    // THE STEP'S OWN `lines` SPAN THE PROSE ALONE (kogaki#868, restated at
    // the renderer and the anchor). The figure's bytes are the Brief's declaration realized by the
    // Harness, not the Step's realized prose, and kogaki#870's blind recovery
    // quotes a Step at exactly these lines — a range that swallowed the block
    // would hand the reviewer markup to re-derive prose from.
    ranges.set(step.step_id, push(readFileSync(f, "utf8").trim()));
    if (fig && fig.position === "after") figureRanges.set(step.step_id, push(fig.markup));
  }
  return { body: parts.join("\n\n"), missing, ranges, figureRanges, figures, figureErrors };
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
    steps: brief.steps.map((s) => s.step_id),
    resolved_at: new Date().toISOString(),
  }, null, 2) + "\n");
  process.stdout.write(`brief: ${brief.path}\n`);
  process.stdout.write(`survey pin: ${brief.surveyPin}\n`);
  driveNextPacket(brief, args, ws);
  process.stdout.write(`closed set: ${brief.strands.map((s) => s.id).join(", ")} — the Brief's own text plus these Strands' served renderings at the pin; nothing else is reachable\n`);
  process.stdout.write(`reader path: ${brief.steps.map((s) => s.step_id).join(" → ")} (recorded order; realized in this order and no other)\n`);
  // the reader-knowledge ledger's ledger is DERIVED here and rendered, never stored: no field is
  // written to the Brief and no key is added to the run record above. A Brief
  // whose path introduces nothing renders the empty ledger AS an empty ledger
  // — that is a true reading of the path, not a failure to compute one.
  // COUNTED FROM THE DERIVATION, never by adding the last Step's RAW entries
  // to the deduped union before it (PR #775 round 1). The first form
  // double-counted a term a later Step re-declares — and cross-Step
  // re-declaration is exactly what the reader-knowledge ledger legalizes, so the wrong case was the
  // one the field explicitly permits. Appending a terminal sentinel makes the
  // final row's snapshot the whole path's union, so the count comes from the
  // same function everything else reads and cannot disagree with it. This
  // line is the ONLY owner-facing rendering of the ledger, which is why a
  // wrong number here is the one a reader has no way to check.
  const ledger = readerKnowledgeLedger([...brief.steps, { step_id: "(end)" }]);
  const introduced = ledger[ledger.length - 1].reader_already_knows.length;
  process.stdout.write(`reader-knowledge ledger: ${introduced} term(s) introduced across ${brief.steps.length} step(s), derived from the path at read time and stored nowhere (the reader-knowledge ledger)${introduced === 0 ? " — this path introduces no terms, which is a reading of it and not an error" : ""}\n`);
  process.stdout.write(`move ids: ${brief.movesChecked} of ${brief.steps.length} step(s) resolved against the Move library (the Step-Move instantiation contract) — the specialization judgment was rendered at composition and is not re-derived here\n`);
  process.stdout.write(`workspace: ${ws} (machine-local; snapshots and run identity live here, never in the artifact)\n`);
}

function cmdMaterial(args) {
  const brief = loadBrief(args);
  const id = argString(args, "strand", "material needs --strand <L-id>");
  const strand = brief.strands.find((s) => s.id === id);
  if (!strand) fail(foreignStrandRefusal(id, brief.strands));
  process.stdout.write(`${strand.id} — ${strand.slug}\n`);
  for (const c of strand.cites) process.stdout.write(`${c.kind}: ${c.cite}\n`);
  // The Brief's own text is the material: every ground line naming this
  // Strand, quoted as the Brief carries it.
  const grounds = [...brief.text.matchAll(new RegExp(`^ground \\(strand ${id}\\): (.+)$`, "gm"))];
  for (const g of grounds) process.stdout.write(`ground: ${g[1]}\n`);
}

// ---------------------------------------------------------------------------
// THE SECTION PACKET (the Step Packet, kogaki#749; owner rulings 2026-09-01).
//
// The harness-assembled input from which the model realizes ONE Step's prose —
// the one LLM judgment of the Draft lane. `packet --step <id>` renders it
// DETERMINISTICALLY from the template plus the Brief plus the Move record plus
// the workspace's realized Sections plus the derived ledger; the session
// realizes the prose; `section` validates it as before.
//
// THE PACKET IS THE MODEL'S ENTIRE INPUT. Nothing outside it is read, which is
// why every block opens with a fixed usage header saying what the block is FOR:
// a block whose use is not stated gets used for whatever it resembles, and the
// Move exemplar is the one that fails worst — read as content rather than as
// form, it hands the article another article's subject matter.
//
// DETERMINISTIC means the same inputs render the same bytes. No timestamp, no
// run id, no ordering that depends on a directory read: the Sections come in
// the Brief's recorded order and the ledger is recomputed from the path.

// `requires`/`effect` are EXCLUDED from the rendered Move contract, and the
// exclusion is the ruling rather than an omission: the Step's own
// `reader_state_before`/`after` are the instance forms of exactly those two
// fields (the Step-Move instantiation contract), so rendering both would put the general and the specialized
// statement of one thing side by side and leave the model to pick. The Step's
// instantiated states win.
const MOVE_FIELDS_RENDERED = ["intent", "constraints", "failure_modes"];

// Read one field out of a Move record's folded-scalar form. The store is the
// same one the Step-Move instantiation contract's resolver reads, and this reads VALUES where that one reads
// only ids — the split is deliberate (the mechanical half of move id resolution: a resolver that parsed these
// would be one edit from comparing them), so this is a second reader with its
// own purpose rather than a widening of the first.
function moveField(text, field) {
  const m = text.match(new RegExp(`^${field}:\\s*(>-)?[ \\t]*\\n((?:[ \\t]+.*\\n?)*)`, "m"));
  // SPLIT ON A NEWLINE, not on the two-character sequence backslash-n (PR #780
  // round 1). The first form never split at all, so every real Move record —
  // which wraps intent/constraints/failure_modes/excerpt across lines — reached
  // the model's ENTIRE INPUT carrying its source newlines and two-space
  // indents. The self-test could not see it: its fixture records write
  // single-line folded scalars, so the fold was never exercised. Same
  // fixture-too-small class this file records three times against its own
  // cases, arriving here on the side a mutation cannot reach — there was no
  // guard to delete, only a fold that silently did nothing.
  if (m) return m[2].split("\n").map((l) => l.trim()).filter(Boolean).join(" ").trim();
  const inline = text.match(new RegExp(`^${field}:[ \\t]*(.+)$`, "m"));
  return inline ? inline[1].trim() : null;
}

// A Brief's global anchors, verbatim from the document. Read from the heading
// rather than re-derived, because "verbatim from the Brief" is the ruling.
function briefSection(text, heading) {
  const re = new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "m");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

// The step block's fields, read off the recorded form `renderStep` writes.
export function stepField(body, field) {
  const m = body.match(new RegExp(`^${field}:[ \\t]*(.*)$`, "m"));
  return m ? m[1].trim() : null;
}

// ---------------------------------------------------------------------------
// the figure record — its realization-side machinery (kogaki#878).
//
// THE PACKET IS THE MODEL'S ENTIRE INPUT, AND THE FIGURE INPUT IS THAT PACKET
// PLUS ONE BLOCK. The block is appended only for a Step carrying `figure:`,
// and only AFTER that Step's prose is recorded — the hub's third moment,
// concrete design after the text. It travels in the same template file as the
// Packet, behind a marker the Packet render splits away, because a second
// template file would be a second carrier for one model-facing surface.

const FIGURE_INPUT_MARKER = "<!-- FIGURE-INPUT -->";

// ONE SPLIT, TWO CONSUMERS. `renderPacket` takes the first half and would
// otherwise refuse on the figure block's unfilled slots; `renderFigureInput`
// takes the second. Both read the same file, so the marker cannot drift out
// from under one of them.
export function splitPacketTemplate(text) {
  const at = text.indexOf(FIGURE_INPUT_MARKER);
  if (at === -1) {
    return { error: `the Packet template carries no ${FIGURE_INPUT_MARKER} marker — the figure block lives behind it (the figure record), and a template without it cannot say where the Packet ends` };
  }
  return { packet: text.slice(0, at).trimEnd() + "\n", figure: text.slice(at + FIGURE_INPUT_MARKER.length) };
}

// The Step's ground lines, in the order they are declared. `g<n>` addresses
// this list 1-based (the figure decision), and the address space is THIS Step's grounds —
// which is what makes a role bound to another Step's ground unreachable rather
// than refused by a rule.
export function groundLines(step) {
  return step.body.split("\n").filter((l) => l.startsWith("ground "));
}
// VERBATIM, THE WHOLE LINE. The binding block quotes what the Brief recorded,
// including which Strand or Step effect licensed it: an element is that ground
// worded for the reader, and a reader of the record who cannot see the licence
// cannot tell a wording from an invention.
export function groundAt(step, addr) {
  const m = /^g([1-9][0-9]*)$/.exec(String(addr));
  if (!m) return null;
  return groundLines(step)[Number(m[1]) - 1] ?? null;
}

// The Move's form for one figure-carrying Step, with its roles in the CLOSED
// SET'S declared order rather than the record's key order — the same record
// must render the same bytes, and object key order is an accident of how the
// file was written.
export function figureFormFor(step, movesDir = "moves") {
  const r = visualFormOf(step.move, movesDir);
  if (r.error) return { error: `step ${step.step_id}: ${r.error}` };
  if (!r.form) {
    return { error: `step ${step.step_id} declares figure: and its move "${step.move}" carries no visual_form — a figure is the INSTANCE of its Move's form (the figure decision). Composition refuses this, so a Brief reaching realization with it has had its Move edited since` };
  }
  const kinds = figureKinds().kinds || {};
  const kind = r.form.kind;
  if (!kind || !Object.prototype.hasOwnProperty.call(kinds, kind)) {
    return { error: `step ${step.step_id}: move "${step.move}" declares visual_form kind ${JSON.stringify(kind ?? null)}, outside the closed set (${Object.keys(kinds).sort().join(", ")}) — src/figure-kinds.json is what admits a kind` };
  }
  const roles = kinds[kind].roles || [];
  return { kind, roles, relation: kinds[kind].relation, lines: Object.fromEntries(roles.map((x) => [x, r.form[x] ?? null])) };
}

// The figure input: the stored Packet, unchanged, plus the filled block. The
// Packet is passed in as the BYTES THAT WERE SERVED rather than re-rendered,
// for the reason `cmdSection`'s backstop already gives — the record is what the
// prose was realized from, and a fresh render answers for the file as it stands.
export function renderFigureInput({ figureTemplate, packetText, step, form, prose }) {
  const missing = form.roles.filter((r) => !form.lines[r]);
  if (missing.length) {
    return { error: `step ${step.step_id}: move "${step.move}"'s ${form.kind} form maps no vocabulary line for ${missing.map((x) => `"${x}"`).join(", ")} — ingestion refuses such a form (the closed kind set and the Move's visual_form), so the library record has been edited since` };
  }
  const binding = [];
  for (const role of form.roles) {
    const addr = (step.figure_roles || {})[role];
    const g = groundAt(step, addr);
    if (g === null) {
      return { error: `step ${step.step_id}: figure_roles binds "${role}" to ${JSON.stringify(addr ?? null)} and this Step has no such ground — composition refuses this (the figure decision), so the Brief has been edited since it was adopted` };
    }
    binding.push(`- **${role}** — bound to \`${addr}\`:\n\n  ${g}`);
  }
  const fields = {
    figure_kind: form.kind,
    figure_form_roles: form.roles.map((r) => `- **${r}** — ${form.lines[r]}`).join("\n"),
    figure_binding: binding.join("\n"),
    figure_reason: step.figure,
    figure_prose: prose.trim(),
  };
  let out = figureTemplate;
  for (const [k, v] of Object.entries(fields)) out = out.split(`{{${k}}}`).join(v);
  const left = out.match(/\{\{(\w+)\}\}/);
  if (left) return { error: `the figure block's slot {{${left[1]}}} was not filled — the renderer and the template disagree about the slot set, which is the round trip failing silently (the figure record)` };
  return { input: packetText.trimEnd() + "\n" + out };
}

// THE RECORD'S VALIDATION, and it is the MECHANICAL half only (the figure record). Every
// role present, no extra role, the kind equal to the form's, each element bound
// to the ground THE BRIEF bound that role to, a position from the closed pair,
// a non-empty caption and at least one relation. Whether an element's wording
// is fair to its ground, and whether the relations instantiate the kind's
// relation line, are judgments — the judgment rule's rule that a missing field is refused
// and a weak one is not, which is also why kogaki#880 reviews the figure by a
// round trip rather than by a lint here.
export function figureRecordRefusal(record, step, form, schema) {
  const at = `the figure record for step ${step.step_id}`;
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    return `${at} is not a JSON object — the record is the instance of the Move's form, one object (src/figure-schema.json)`;
  }
  for (const key of schema.required) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      return `${at} carries no ${key} — src/figure-schema.json requires ${schema.required.join(", ")}`;
    }
  }
  const known = new Set([...schema.required, ...(schema.optional || [])]);
  const extra = Object.keys(record).filter((k) => !known.has(k)).sort();
  if (extra.length) {
    // REFUSED RATHER THAN IGNORED, the rule src/recovered-schema.json states
    // for its own forbidden keys: an ignored field still shaped the reading
    // that produced the rest of the record.
    return `${at} carries ${extra.map((x) => `"${x}"`).join(", ")}, which src/figure-schema.json does not define — the record's fields are ${[...known].sort().join(", ")}`;
  }
  if (record.kind !== form.kind) {
    return `${at} declares kind ${JSON.stringify(record.kind)} and move "${step.move}"'s visual_form is ${JSON.stringify(form.kind)} — the record is the INSTANCE of that form (the figure decision), so its kind is the form's and never a choice made at realization`;
  }
  if (record.elements === null || typeof record.elements !== "object" || Array.isArray(record.elements)) {
    return `${at}: elements is one entry per role of the ${form.kind} form (${form.roles.join(", ")}), keyed by role`;
  }
  const have = new Set(Object.keys(record.elements));
  const missing = form.roles.filter((r) => !have.has(r));
  if (missing.length) {
    return `${at} leaves ${missing.map((x) => `"${x}"`).join(", ")} unfilled — every role of the ${form.kind} form carries an element (the form's roles are ${form.roles.join(", ")})`;
  }
  const surplus = [...have].filter((r) => !form.roles.includes(r)).sort();
  if (surplus.length) {
    return `${at} fills ${surplus.map((x) => `"${x}"`).join(", ")}, which is not a role of the ${form.kind} form — the form's roles are ${form.roles.join(", ")} (src/figure-kinds.json)`;
  }
  for (const role of form.roles) {
    const el = record.elements[role];
    if (el === null || typeof el !== "object" || Array.isArray(el)) {
      return `${at}: element "${role}" is an object carrying text and ground (src/figure-schema.json)`;
    }
    if (typeof el.text !== "string" || el.text.trim() === "") {
      return `${at}: element "${role}" carries no text — an element is its bound ground WORDED FOR THE READER, and an empty one is the position left open rather than filled`;
    }
    const want = (step.figure_roles || {})[role];
    if (el.ground !== want) {
      // AC2. The Brief bound the role; the record may not move it. A swapped
      // ground is an element licensed by material the composer did not put
      // under that position, which is exactly the join kogaki#880 checks and
      // exactly the one nothing downstream could re-derive.
      return `${at}: element "${role}" is bound to ${JSON.stringify(el.ground ?? null)} and the Brief bound "${role}" to ${JSON.stringify(want ?? null)} — the binding is the Brief's decision (the figure decision), and a record that moves a role to another ground words it from material the composer did not put under that position`;
    }
  }
  if (!Array.isArray(record.relations) || record.relations.length === 0
      || record.relations.some((x) => typeof x !== "string" || x.trim() === "")) {
    return `${at}: relations is a non-empty list of lines — the kind's whole content is the relation it holds (${form.kind}: ${form.relation}), so a record asserting none is a list rather than a figure`;
  }
  if (typeof record.caption !== "string" || record.caption.trim() === "") {
    return `${at}: caption is one line in the terms of this Step's reader_state_after — what the reader holds after looking`;
  }
  if (Object.prototype.hasOwnProperty.call(record, "emphasis")
      && !form.roles.includes(record.emphasis)) {
    return `${at}: emphasis is ${JSON.stringify(record.emphasis)}, which is not a role of the ${form.kind} form (${form.roles.join(", ")}) — emphasis names which element the figure leans on`;
  }
  const positions = schema.fields.position.one_of;
  if (!positions.includes(record.position)) {
    return `${at}: position is ${JSON.stringify(record.position ?? null)} and the closed pair is ${positions.join(", ")} — within its Step a figure either sets the prose up or discharges it`;
  }
  return null;
}

// the Section grouping's Section, as the Packet says it (kogaki#825). The Packet is the
// model's ENTIRE input, so "which Section am I in" is answerable only if the
// Packet answers it — an opening Step is told the title it is opening, and a
// continuing Step is told the heading it sits under. Both forms name a title
// that is ALREADY ON THE PAGE or about to be, so neither invites the model to
// write one.
//
// The untitled case is the pre-Section-grouping corpus, which derives one untitled
// Section: it is STATED rather than left blank, for the same reason every other
// absence in this renderer is stated — a hole in the model's whole world is not
// a gap the model notices, it is a hole the model fills by invention.
export function sectionPlacement(sec) {
  // DEFENSIVE ONLY, and said so rather than advertised as a rendered form (PR
  // #844 round 1, finding 3). No Packet render reaches it: `sectionsOf` derives
  // one untitled Section for a path declaring nothing, and
  // `renderAndStorePacket` refuses an unknown Step before the lookup. It is
  // kept so the function is total and removed from the assertions and from the
  // admission record, because a contract field claiming unreachable behaviour
  // is re-read at every later judgment on the member.
  if (sec === undefined) return "(no Section could be derived for this Step.)";
  if (sec.title === undefined) {
    // The untitled form STILL SAYS WHICH (finding 3, second half): the block
    // above it promises "the line below says which", and a form that says
    // neither breaks that promise for the whole pre-Section-grouping corpus, which is the
    // only corpus that reaches it.
    // NO ORDINAL HERE (PR #847 round 1, nit 2). The arm that built one was
    // dead: `sectionsOf` pushes a new Section only where `opens_section` is
    // declared or where none exists yet, so an UNTITLED Section is always the
    // first and only one — the "th" branch was unreachable, would have rendered
    // "2th" if it ran, and told a later reader that untitled Sections beyond
    // the first exist. The single Section is named as such instead.
    return sec.opens
      ? "- **This Step OPENS the article's one Section.** This Brief declares no Section titles, so no heading is rendered above your prose."
      : "- **This Step CONTINUES the article's one Section.** This Brief declares no Section titles, so no heading is rendered, and prose you are writing further into sits above.";
  }
  const others = sec.step_ids.length - 1;
  return sec.opens
    ? `- **This Step OPENS a Section.** Its heading is **"${sec.title}"**, rendered by the Harness immediately above your prose.\n`
      + `- **Your prose is what the heading promises.** ${others === 0
          ? "This Step is the whole Section."
          : `${others} further Step${others === 1 ? "" : "s"} continue${others === 1 ? "s" : ""} under it, so open the question rather than closing it.`}`
    : `- **This Step CONTINUES the Section headed "${sec.title}".** That heading is already on the page, above prose you are writing further into.\n`
      + `- **No new heading is rendered here.** Develop what the Section has established; a new subject belongs to a Step that opens its own.`;
}

// PRIOR PROSE GROUPED BY SECTION (kogaki#825). The flat concatenation was
// well defined for an opening Step and not for a continuing one: "the article
// so far" had no boundary inside it, so a Step continuing a Section could not
// tell which prose was its own Section's and which belonged to earlier ones.
// Grouping under the headings the Draft will actually render is what bounds it,
// and the current Section comes LAST because it is the prose immediately above
// where the model writes.
export function priorProseBySection(priorSections, sections, currentIndex, currentStepId) {
  if (!priorSections.length) return null;
  const have = new Map(priorSections.map((p) => [p.step_id, p.text]));
  const out = [];
  for (const sec of sections) {
    if (sec.index > currentIndex) break;
    const parts = sec.step_ids.filter((id) => have.has(id)).map((id) => have.get(id));
    const current = sec.index === currentIndex;
    // AN EMPTY CURRENT SECTION IS STILL RENDERED, and that is the finding this
    // branch exists for (PR #844 round 1, finding 1). Skipping it made the
    // block END with the PREVIOUS Section for every Step that OPENS Section 2
    // or later — while the template promises the block "ends with this Step's
    // own Section so far", so the model was told the last group was its own
    // when it was the one before it.
    //
    // AN EARLIER SECTION WITH NO REALIZED PROSE IS STATED RATHER THAN SKIPPED
    // (PR #847 round 1, finding 1's second half). It used to be dropped, so the
    // block could run Section 1, Section 3 with nothing saying a Section had
    // been passed over — a silent hole in the model's only account of what is
    // above its prose, reachable from the same on-demand `packet --step <id>`
    // path as the first half. Every Section up to and including the current one
    // now appears, and one that holds nothing yet says so.
    const label = sec.title === undefined
      ? `### (untitled Section ${sec.index})`
      : `### ${sec.title}`;
    const mark = current ? " — THIS STEP'S OWN SECTION, so far" : "";
    // AN EMPTY SECTION DOES NOT MEAN THIS STEP OPENS IT (PR #847 round 1,
    // finding 1). It means the Steps above it in that Section are not realized
    // yet, and the two states are distinguished by the Section's own recorded
    // path — which is what stops the Packet contradicting its own
    // `section_placement` block, where a continuing Step is told the heading is
    // already on the page above prose it is writing further into.
    const opensIt = sec.step_ids[0] === currentStepId;
    const shown = parts.length
      ? parts.join("\n\n")
      : current && opensIt
        ? "(nothing yet — this Step opens the Section, so its prose is the first in it.)"
        : current
          ? "(nothing yet — the Steps that open this Section are not realized, so no prose stands under this heading. You are NOT opening it: write as the Section's heading and your own Step promise.)"
          : "(nothing yet — no Step of this Section is realized, so nothing stands under this heading.)";
    out.push(`${label}${mark}\n\n${shown}`);
  }
  return out.length ? out.join("\n\n") : null;
}

export function renderPacket({ template, brief, step, moveText, priorSections, ledgerRow, section, sections }) {
  const missing = [];
  const need = (label, v) => { if (v === null || v === undefined || v === "") missing.push(label); return v; };

  const grounds = step.body.split("\n").filter((l) => l.startsWith("ground ")).join("\n");
  const intro = (step.introduces || []);
  const known = (ledgerRow?.reader_already_knows || []);

  const fields = {
    thesis: need("the Brief's Thesis", briefSection(brief.text, "Thesis")),
    reader_start: need("the Brief's Reader start", briefSection(brief.text, "Reader start")),
    reader_target: need("the Brief's Reader target", briefSection(brief.text, "Reader target")),
    opening_question: need("the Brief's Opening question", briefSection(brief.text, "Opening question")),
    move_id: step.move,
    // DERIVED FROM THE CONSTANT rather than naming the three again (PR #780
    // round 1). The constant carried the exclusion's whole justification and
    // was read by nothing, so it was a second statement of the rendered field
    // set that could drift from the renderer with no check noticing.
    ...Object.fromEntries(MOVE_FIELDS_RENDERED.map((f) =>
      [`move_${f}`, need(`${step.move}'s ${f}`, moveField(moveText, f))])),
    // The exemplar renders its own STATED ABSENCE rather than a substitute
    // (the Move exemplar predicate) — an empty excerpt is not a missing input, it is a record that
    // cannot serve as an exemplar, and the Packet says so where the passage
    // would have gone.
    move_excerpt: moveField(moveText, "excerpt")
      || `(none — this Move record carries no excerpt, so it cannot serve as an exemplar. Perform the Move from its contract above.)`,
    step_id: step.step_id,
    purpose: need(`step ${step.step_id}'s purpose`, stepField(step.body, "purpose")),
    reader_state_before: need(`step ${step.step_id}'s reader_state_before`, stepField(step.body, "reader_state_before")),
    reader_state_after: need(`step ${step.step_id}'s reader_state_after`, stepField(step.body, "reader_state_after")),
    materials: stepField(step.body, "materials") || "(none)",
    rationale: need(`step ${step.step_id}'s rationale`, stepField(step.body, "rationale")),
    grounds: grounds || "(none recorded)",
    reader_already_knows: known.length
      ? known.map((k) => `- ${k.term}${k.anchor ? ` — ${k.anchor}` : ""} (introduced at ${k.introduced_by})`).join("\n")
      // "Step", not "Section" (PR #844 round 1, finding 2). A slot VALUE reaches
      // the model's entire input exactly as a block header does, so the
      // one-word-one-unit rule binds it too.
      : "(nothing — this is the first Step to introduce anything, or the path introduces no terms)",
    introduces: intro.length ? intro.map((e) => `- ${e}`).join("\n") : "(nothing new)",
    section_placement: sectionPlacement(section),
    // BOUNDED BY THE SECTION, not merely ordered (kogaki#825). Falls back to the
    // flat form only when no grouping is derivable, so a Brief that declares no
    // Sections reads exactly as it did before this issue.
    // THE EMPTY CASE DOES NOT ASSERT MORE THAN IT KNOWS (PR #844 round 2, nit
    // 3). An empty `priorSections` means no earlier Step has been REALIZED, not
    // that none exists: `packet --step <later id>` renders on demand before the
    // Steps above it are written, and the old string told that Step it was the
    // article's first. The two states are now distinguished by the Brief's own
    // path, which the renderer already holds.
    prior_sections: priorSections.length
      ? (priorProseBySection(priorSections, sections || [], section?.index ?? 1, step.step_id)
         || priorSections.map((p) => p.text).join("\n\n"))
      : (brief.steps[0] && brief.steps[0].step_id === step.step_id
          ? "(nothing yet — this is the article's first Step, so nothing precedes it.)"
          : "(nothing yet — the Steps before this one in the Reader Path are not realized, so no prose precedes it on the page. This is NOT the article's opening: do not write one.)"),
  };
  if (missing.length) {
    return { error: `the Packet for ${step.step_id} cannot be rendered: ${missing[0]} is absent. `
      + `A Packet is the model's entire input, so a missing block is a hole the model fills by invention — `
      + `it refuses by NAME rather than rendering an empty slot (the Step Packet).` };
  }
  let out = template;
  for (const [k, v] of Object.entries(fields)) out = out.split(`{{${k}}}`).join(v);
  // The HTML comment is authoring guidance for the template's maintainer and
  // is NOT part of the model's input — stripped here so the rendered Packet is
  // exactly what the ruling describes and nothing more.
  out = out.replace(/^<!--[\s\S]*?-->\n*/, "");
  const left = out.match(/\{\{(\w+)\}\}/);
  if (left) return { error: `the template slot {{${left[1]}}} was not filled — the renderer and the template disagree about the slot set, which is the round trip failing silently (the Step Packet)` };
  return { packet: out };
}

// THE PACKET RENDER, FACTORED SO THE HARNESS CAN DRIVE IT (kogaki#811,
// DESIGN.md, "The Packet architecture"). `cmdPacket` prints it on demand; `resolve` and `section`
// call it to hand the NEXT Step's input forward without the session asking.
// One implementation, so the on-demand and the driven renders cannot diverge
// in what they write or what they record.
function renderAndStorePacket(brief, id, args, ws) {
  const step = brief.steps.find((s) => s.step_id === id);
  if (!step) return { error: `no step "${id}" in this Brief's Reader Path (${brief.steps.map((s) => s.step_id).join(", ")}) — the path is the Brief's, and /draft never re-opens it` };
  const movesDir = typeof args["moves-dir"] === "string" && args["moves-dir"] !== "" ? args["moves-dir"] : "moves";
  let moveText;
  try { moveText = readFileSync(join(movesDir, `${step.move}.md`), "utf8"); }
  catch (e) {
    return { error: `step ${id} binds move "${step.move}" and its record cannot be read from ${movesDir} (${e.message}) — `
      + `resolve refuses a dangling id before this point (the mechanical half of move id resolution), so this is the store rather than the Brief` };
  }
  const tplPath = join(dirname(fileURLToPath(import.meta.url)), "packet-template.md");
  let template;
  try { template = readFileSync(tplPath, "utf8"); }
  catch (e) { return { error: `the Packet template at ${tplPath} cannot be read (${e.message}) — it is a runtime-read carrier and the command has no built-in fallback, deliberately: a fallback template would be a second copy nobody maintains` }; }
  // THE FIGURE BLOCK IS NOT PART OF A PACKET (the figure record, kogaki#878). Split before
  // the render: `renderPacket` refuses on any unfilled slot, so the block's own
  // slots would make every Packet refuse if it reached that check.
  const split = splitPacketTemplate(template);
  if (split.error) return { error: split.error };
  template = split.packet;

  // PRIOR SECTIONS IN THE BRIEF'S RECORDED ORDER, never a directory read —
  // the order is the Reader Path's and a readdir would make the Packet's bytes
  // depend on the filesystem.
  const prior = [];
  for (const s of brief.steps) {
    if (s.step_id === id) break;
    const f = join(ws, "sections", `${s.step_id}.md`);
    if (existsSync(f)) prior.push({ step_id: s.step_id, text: readFileSync(f, "utf8").trim() });
  }
  const ledger = readerKnowledgeLedger(brief.steps);
  const row = ledger.find((r) => r.step_id === id);

  // The SAME derivation the renderer and the trace use (kogaki#823's
  // `sectionsOf`/`sectionOfStep`), never a second one: what the Draft renders
  // and what the Packet says about where this Step sits cannot disagree.
  const sections = sectionsOf(brief.steps);
  const section = sectionOfStep(brief.steps).get(id);

  const r = renderPacket({ template, brief, step, moveText, priorSections: prior, ledgerRow: row, section, sections });
  if (r.error) return { error: r.error };

  // RETENTION: stored EXACTLY AS SERVED, overwritten on re-render, with the
  // path and sha announced beside the Section it will produce.
  //
  // THE PATH IS `runs/draft/<slug>/packets/` (kogaki#750, landed). #749 ruled
  // this destination and could not write it — there was no runs/ tree, and
  // minting one as a side effect of the Packet command would have built #750's
  // design at a seat that had no license for it. The expression is UNCHANGED:
  // the Packet has always joined the run record, the snapshots and the sections
  // in the workspace, and it is the WORKSPACE that moved. The debt is
  // discharged by the lane's default resolving there, not by a second path
  // expression here — a relocation that also re-routes its consumers changes
  // two things and can only be half-verified.
  const dir = join(ws, "packets");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${id}.md`);
  writeFileSync(out, r.packet);
  const sha = sha256(r.packet);

  // RECORDED IN THE RUN RECORD, not only printed (PR #780 round 1). #749 rules
  // "path+sha recorded in the run record beside the Section it produced", and
  // the first form wrote both to stderr and nothing to run.json — a print is
  // read by whoever is watching and a record is read by whoever comes after,
  // which is the difference the ruling is about. the Step Packet restated the ruling as
  // "announced", which substituted the printing for the recording without
  // saying it had.
  //
  // MERGED rather than overwritten: run.json is written at `resolve` and holds
  // the run's identity, so the packet entry joins it under its step id and a
  // re-render replaces that one entry. A missing or unreadable run.json is not
  // a failure of the render — the Packet is already written and printed — so it
  // warns, exactly as the snapshot path does.
  const runFile = join(ws, "run.json");
  try {
    let rec = {};
    if (existsSync(runFile)) rec = JSON.parse(readFileSync(runFile, "utf8"));
    rec.packets = { ...(rec.packets || {}), [id]: { path: out, sha256: sha } };
    writeFileSync(runFile, JSON.stringify(rec, null, 2) + "\n");
  } catch (e) {
    process.stderr.write(`draft: the packet's path and sha were not recorded in ${runFile} (${e.message}) — the Packet itself is written and printed; the record is the trace, and the trace never gates the write it traces\n`);
  }

  return { packet: r.packet, out, sha };
}

function cmdPacket(args) {
  const brief = loadBrief(args);
  const id = argString(args, "step", "packet needs --step <step_id>");
  const ws = workspaceFor(args, brief.slug);
  const r = renderAndStorePacket(brief, id, args, ws);
  if (r.error) fail(r.error);
  const { out, sha } = r;

  process.stdout.write(r.packet);
  process.stderr.write(`\npacket ${id}: ${out}\n`);
  process.stderr.write(`packet sha256: ${sha}\n`);
  process.stderr.write(`stored exactly as served — the file above is byte-identical to what was printed (the Step Packet)\n`);
  // The owed-path line is GONE rather than reworded (kogaki#750). It announced
  // a debt on every render, and the debt is paid: the workspace default IS
  // `runs/draft/<slug>/`. A line that keeps naming a discharged obligation is
  // the same defect as one that never named it — both leave a reader unable to
  // tell the current state from the state when the line was written.
}

// THE HARNESS HANDS THE NEXT STEP'S INPUT FORWARD (kogaki#811, DESIGN.md, "The Packet architecture").
// `resolve` calls this at run start and `section` after recording a Step, so a
// Packet exists for the Step about to be realized WITHOUT the session running
// a command. That is the render-within arm: it makes the Packet architecture's "one Step, one
// input" true by construction rather than by a session remembering.
//
// It never fails the act it rides on. A Packet that cannot be rendered here is
// reported and the run continues, because `section`'s own refusal is the
// backstop that catches the absence at the moment it matters — and a driver
// that could fail `resolve` would make a template read gate the run's start.
function driveNextPacket(brief, args, ws) {
  const next = brief.steps.find((s) => !existsSync(join(ws, "sections", `${s.step_id}.md`)));
  if (!next) return null;
  const r = renderAndStorePacket(brief, next.step_id, args, ws);
  if (r.error) {
    process.stderr.write(`draft: the Packet for the next Step (${next.step_id}) was not rendered — ${r.error}\n`);
    process.stderr.write(`draft: run \`packet --step ${next.step_id}\` to see the failure in full; \`section\` will refuse this Step until its Packet exists\n`);
    return null;
  }
  process.stderr.write(`packet ${next.step_id}: ${r.out}\n`);
  process.stderr.write(`packet sha256: ${r.sha}\n`);
  return next.step_id;
}

function cmdSection(args) {
  const brief = loadBrief(args);
  const id = argString(args, "step", "section needs --step <step_id>");
  const file = argString(args, "file", "section needs --file <path to the realized prose>");
  const step = brief.steps.find((s) => s.step_id === id);
  if (!step) {
    fail(`no step "${id}" in this Brief's Reader Path (${brief.steps.map((s) => s.step_id).join(", ")}) — the path is the Brief's, and /draft never re-opens it`);
  }
  // ONE NAME FOR THE WORKSPACE (PR #814 round 1, finding 3). The backstop's
  // refusal depends on this path, so a second binding for the same value is a
  // divergence hazard in exactly the function that must not drift.
  const ws = workspaceFor(args, brief.slug);
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
  // the one this Step was realized from.
  const packetPath = join(ws, "packets", `${id}.md`);
  if (!existsSync(packetPath)) {
    fail(`step ${id} has no rendered Packet at ${packetPath} — the Packet is a Step's ENTIRE input, so realizing one without it means the prose was written from something else. `
      + `The Harness renders it at \`resolve\` and after each \`section\`; if it was deleted, \`packet --step ${id}\` restores it`);
  }
  let recordedSha = null;
  try { recordedSha = (JSON.parse(readFileSync(join(ws, "run.json"), "utf8")).packets || {})[id]?.sha256 || null; }
  catch { /* no run record — handled as unrecorded below */ }
  const packetText = readFileSync(packetPath, "utf8");
  const onDiskSha = sha256(packetText);
  if (recordedSha === null) {
    fail(`step ${id} has a Packet file at ${packetPath} that no run record accounts for — a Packet is "rendered" when the run records its sha, and an unrecorded file cannot be shown to be the one this Step was realized from. Re-render with \`packet --step ${id}\``);
  }
  if (recordedSha !== onDiskSha) {
    fail(`step ${id}'s Packet changed after it was rendered — recorded ${recordedSha.slice(0, 12)}, on disk ${onDiskSha.slice(0, 12)}. `
      + `The prose may have been realized from either, and nothing here can tell which. Re-render with \`packet --step ${id}\` and realize again`);
  }

  let content;
  try { content = readFileSync(file, "utf8"); }
  catch (e) { fail(`the section file ${file} cannot be read (${e.message})`); }
  const foreign = scanForeignStrands(content, brief.strands);
  if (foreign.length) fail(foreignStrandRefusal(foreign[0], brief.strands));
  const structural = findTraceStructure(content, brief.steps.map((s) => s.step_id));
  if (structural.length) {
    fail(`the section for ${id} renders record as structure: ${structural[0]} — the per-Step trace is frontmatter record, never visible structure in the body (SPEC-draft-command, the Brief's centre and its obligations ledger)`);
  }
  // THE PROSE CARRIES NO SECTION HEADING (the Section grouping, kogaki#823). The heading is
  // the Harness's, written by `assembleBody` from the Brief's declaration, so a
  // heading in the realized prose is a SECOND writer of the same structure —
  // and the two do not add up to the one-heading-per-Section the ruling asks
  // for. The template already instructs "No heading"; this is what makes the
  // instruction binding rather than advisory, which is the whole distance
  // between a rule and its enforcement.
  //
  // DISTINCT FROM `findTraceStructure` ABOVE, and stated so a reader meeting
  // both does not read one as a widening of the other: that guard refuses
  // RECORD rendered as structure (a step id, a key line) and is unchanged; this
  // refuses a TITLE the Brief did not declare, at a level the Harness owns.
  //
  // EVERY HEADING LEVEL, and `[ \t]` rather than `\s` (PR #843 round 1,
  // findings 3 and 5). The first form matched `#{1,3}` with a `(?!#)` guard, so
  // `#### A title` passed unrefused — the engine backtracks the hash run and
  // then fails on the whitespace, which means a model answering "No heading"
  // with a SUB-heading landed one in the body while acceptance 3, which counts
  // `##` only, stayed green. `findTraceStructure` beside it already reads
  // `#{1,6}`, so the two guards disagreed about what a heading is. And `\s`
  // spans newlines, so a lone `#` line reported a "heading" assembled across
  // three lines.
  //
  // FENCED BLOCKS ARE EXCLUDED (finding 5, second half). A `# install deps`
  // comment inside a code fence in realized prose is not a heading, and
  // refusing it is an over-refusal at composition time against prose the
  // article may legitimately need.
  // THE FIGURE SEAT IS THE BRIEF'S, AND PROSE IS NOT A SECOND AUTHOR ON IT
  // (the renderer and the anchor, kogaki#879). This sits beside the heading refusal below and is the
  // same defect one element over: after the figure record the figure's markup is produced
  // by src/render-figure.mjs from the record the Brief's declaration led to, so
  // a diagram drawn in the realized prose is a figure the Brief never declared,
  // rendered by nobody, pinned by no record, and invisible to kogaki#880's
  // round trip.
  //
  // REFUSED ON EVERY STEP, not only on figure-carrying ones. A Step that
  // declares no figure has the strongest claim of all to draw none — the
  // default is NONE (the figure decision) — and a Step that declares one already has its
  // block coming from the record. Neither seat is the prose's.
  //
  // KEYED ON THE FENCE LANGUAGE THE RENDERER EMITS, imported rather than
  // spelled here, so the guard and the emitter cannot drift about what a figure
  // fence is. An ordinary code fence is untouched: this refuses `mermaid` and
  // nothing else, and the Markdown table `matrix` renders as is deliberately
  // NOT refused — a table is prose the article may legitimately need, and
  // refusing every table to close this seat would be an over-refusal against
  // material that has nothing to do with figures.
  // AN OUTER FENCE MAKES THE INNER ONE A QUOTATION (PR #939 round 1, finding 3).
  // Blocks delimited by FOUR OR MORE backticks are stripped before the scan, so
  // prose that quotes a ```mermaid fence — an article about this very pipeline
  // is the obvious case — is not read as prose that drew a figure. This is the
  // same over-refusal PR #843 round 1 found for the heading scan and closed by
  // stripping fences, and the first form of this guard reintroduced it one
  // element over by matching the raw file.
  //
  // A BARE ```mermaid FENCE IS STILL REFUSED: only the outer-fenced case is
  // exempt, because an outer fence is an author saying "this is displayed text"
  // in the one way Markdown has of saying it.
  const quotable = content.replace(/^`{4,}[\s\S]*?^`{4,}[ \t]*$/gm, "");
  const drawn = quotable.match(new RegExp("^```[ \\t]*" + MERMAID_FENCE + "\\b", "mi"));
  if (drawn) {
    fail(`the section for ${id} draws its own figure (a \`\`\`${MERMAID_FENCE} fence) — after the renderer and the anchor a figure's markup is rendered by the Harness from the record \`figure --step ${id}\` validated, and prose that draws one is a second author on a seat the Brief owns, exactly as a heading in the prose is (the Section grouping). `
      + `If this Step should carry a figure, it is declared with \`figure:\` on the Brief (the figure decision) and designed after this prose; if it should not, remove the fence`);
  }
  const unfenced = content.replace(/^```[\s\S]*?^```[ \t]*$/gm, "");
  const heading = unfenced.match(/^(#{1,6})[ \t]+(\S.*?)[ \t]*$/m);
  if (heading) {
    fail(`the section for ${id} carries its own heading (${heading[0].trim()}) — after the Section grouping the heading is the Harness's, rendered once per Section at the Step that declares opens_section, and prose that writes its own produces a second heading the Brief never declared. `
      + `Remove it: the Packet's write instruction says "No heading" for this reason`);
  }
  mkdirSync(join(ws, "sections"), { recursive: true });
  let seq = 0;
  try { seq = readdirSync(join(ws, "snapshots")).length; } catch { /* first snapshot */ }
  snapshotDraft(ws, `before-${id}`, seq, assembleBody(brief, ws).body);
  writeFileSync(join(ws, "sections", `${id}.md`), content);
  snapshotDraft(ws, `after-${id}`, seq + 1, assembleBody(brief, ws).body);
  process.stdout.write(`section ${id} recorded (${brief.steps.findIndex((s) => s.step_id === id) + 1} of ${brief.steps.length} steps)\n`);
  // THE FIGURE IS DESIGNED FROM THE TEXT (the figure record, kogaki#878). A Step carrying
  // `figure:` gets its figure input here — after its prose is recorded and
  // before the next Step's Packet — so the ordering the hub ruled is the
  // HARNESS'S, not a step a session may remember to take. The next Packet is
  // driven by `figure`, not here: two inputs printed at once would leave the
  // realizer choosing which to answer.
  if (step.figure !== undefined && step.figure !== null) {
    const movesDir = typeof args["moves-dir"] === "string" && args["moves-dir"] !== "" ? args["moves-dir"] : "moves";
    const form = figureFormFor(step, movesDir);
    if (form.error) fail(form.error);
    const tplPath = join(dirname(fileURLToPath(import.meta.url)), "packet-template.md");
    let template;
    try { template = readFileSync(tplPath, "utf8"); }
    catch (e) { fail(`the Packet template at ${tplPath} cannot be read (${e.message}) — the figure block lives in it and the command has no built-in fallback`); }
    const split = splitPacketTemplate(template);
    if (split.error) fail(split.error);
    const r = renderFigureInput({ figureTemplate: split.figure, packetText, step, form, prose: content });
    if (r.error) fail(r.error);
    process.stdout.write(r.input.endsWith("\n") ? r.input : r.input + "\n");
    process.stdout.write(`\nstep ${id} carries a figure — fill the record above and record it with \`figure --step ${id} --file <record.json>\`; the next Step's Packet follows that\n`);
    return;
  }
  const nextId = driveNextPacket(brief, args, ws);
  if (nextId) process.stdout.write(`next: ${nextId} — its Packet is rendered above; realize from it and record with \`section --step ${nextId} --file <prose>\`\n`);
}

// the figure record's entry point (kogaki#878). ONE STEP, ONE RECORD, AFTER ITS PROSE.
function cmdFigure(args) {
  const brief = loadBrief(args);
  const id = argString(args, "step", "figure needs --step <step_id>");
  const file = argString(args, "file", "figure needs --file <path to the record JSON>");
  const step = brief.steps.find((s) => s.step_id === id);
  if (!step) {
    fail(`no step "${id}" in this Brief's Reader Path (${brief.steps.map((s) => s.step_id).join(", ")}) — the path is the Brief's, and /draft never re-opens it`);
  }
  if (step.figure === undefined || step.figure === null) {
    fail(`step ${id} declares no figure: — the default is NONE (the figure decision), so there is no form for a record to be an instance of. `
      + `A figure enters at composition, on the Brief, and never here`);
  }
  const ws = workspaceFor(args, brief.slug);
  // THE PROSE FIRST, AND THE REFUSAL SAYS WHY. The record's caption is stated
  // in what the reader holds after reading this Step, and its elements are
  // worded against prose that must already exist — the hub's third moment.
  // A record filled before the text is a figure the text then has to match.
  const sectionFile = join(ws, "sections", `${id}.md`);
  if (!existsSync(sectionFile)) {
    fail(`step ${id} has no realized prose at ${sectionFile} — the figure is designed FROM the text (the figure record), so the record cannot be filled before \`section --step ${id} --file <prose>\` records it`);
  }
  const movesDir = typeof args["moves-dir"] === "string" && args["moves-dir"] !== "" ? args["moves-dir"] : "moves";
  const form = figureFormFor(step, movesDir);
  if (form.error) fail(form.error);

  let raw;
  try { raw = readFileSync(file, "utf8"); }
  catch (e) { fail(`the figure record ${file} cannot be read (${e.message})`); }
  let record;
  try { record = JSON.parse(raw); }
  catch (e) { fail(`the figure record ${file} is not readable JSON (${e.message}) — the record is one JSON object, the instance of move "${step.move}"'s ${form.kind} form`); }

  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "figure-schema.json");
  let schema;
  try { schema = JSON.parse(readFileSync(schemaPath, "utf8")); }
  catch (e) { fail(`the figure schema at ${schemaPath} cannot be read (${e.message}) — it is a runtime-read carrier and this command has no built-in fallback, deliberately: a fallback schema would be a second copy nobody maintains`); }

  const bad = figureRecordRefusal(record, step, form, schema);
  if (bad) fail(bad);

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
  // be shown to be the one this Step's figure was validated from.
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
  if (nextId) process.stdout.write(`next: ${nextId} — its Packet is rendered above; realize from it and record with \`section --step ${nextId} --file <prose>\`\n`);
}

function cmdEmit(args) {
  const brief = loadBrief(args);
  const ws = workspaceFor(args, brief.slug);
  const { body, missing, ranges, figureRanges, figures, figureErrors } = assembleBody(brief, ws);
  if (missing.length) {
    fail(`the run is not at completion: step(s) ${missing.join(", ")} have no realized section — a /draft run ends when the CanonicalDraft exists, and these are what it still owes (SPEC-draft-command, the read-not-invented rule)`);
  }
  // A FIGURE-CARRYING STEP OWES ITS RECORD, exactly as every Step owes its
  // prose (the figure record, kogaki#878). The Brief declared the figure; a Draft emitted
  // without it would silently drop a decision the owner made at the Candidate
  // gate, and nothing downstream would report the drop — which is the shape
  // this repository refuses everywhere else it appears.
  let figureRecords = {};
  try { figureRecords = JSON.parse(readFileSync(join(ws, "run.json"), "utf8")).figures || {}; }
  catch { /* no run record — every figure-carrying Step reports its absence below */ }
  const owedFigures = figureSteps(brief.steps)
    .filter((s) => !(figureRecords[s.step_id] && existsSync(figureRecords[s.step_id].path)))
    .map((s) => s.step_id);
  if (owedFigures.length) {
    fail(`the run is not at completion: step(s) ${owedFigures.join(", ")} declare figure: and have no recorded figure record — `
      + `the record is filled after that Step's prose and recorded with \`figure --step <id> --file <record.json>\` (the figure record)`);
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
  const outPath = join(dirname(brief.path), "draft.md");
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
  // THE TRACE MAPS EACH STEP TO ITS SECTION, not to its own ordinal
  // (kogaki#823). `section: i + 1` numbered the Steps and called the result a
  // section, which was true only while the two units were the same one — after
  // the Section grouping it asserted a one-to-one mapping that the Brief may not declare, so a
  // reader of the trace could not tell which Steps shared a heading.
  const secOf = sectionOfStep(brief.steps);
  const trace = brief.steps.map((s) => {
    const sec = secOf.get(s.step_id);
    return { step_id: s.step_id, section: sec.index, ...(sec.title !== undefined ? { section_title: sec.title } : {}) };
  });
  // THE PACKET RECORD IS READ, NEVER RE-DERIVED (kogaki#868). `cmdPacket` wrote
  // path and sha to run.json at the render; recomputing a sha here would answer
  // for the file as it stands rather than for the input that produced the
  // prose, which is the whole of what the trace is for.
  let packets = {};
  try { packets = JSON.parse(readFileSync(join(ws, "run.json"), "utf8")).packets || {}; }
  catch { /* no run record, or unreadable — every Step reports its absence below */ }
  // The artifact is owner-visible and machine-independent (round 1 finding 3):
  // the Brief is named relative to the draft that realizes it — always its
  // sibling — so two machines emit identical bytes. The absolute path is
  // machine identity and stays in run.json / last-emit.json.
  const head = [
    "---",
    `brief: ${relative(dirname(outPath), brief.path)}`,
    `brief_pin: sha256:${sha256(brief.text)}`,
    `survey_pin: ${brief.surveyPin}`,
    `generated_by: ${JSON.stringify(generatedBy)}`,
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
    const span = ranges.get(t.step_id);
    if (span) t.lines = [span[0] + bodyOffset, span[1] + bodyOffset];
    const rec = packets[t.step_id];
    if (rec && typeof rec.path === "string" && typeof rec.sha256 === "string") {
      // Relative to the draft, the same convention `brief:` uses above: the sha
      // identifies the input, the path is repo-relative, and neither is machine
      // identity (DESIGN.md, "Lifetimes: what is owner state and what is machine state").
      t.packet = relative(dirname(outPath), rec.path);
      t.packet_sha = rec.sha256;
    } else {
      // The trace never gates the write it traces — the same rule `snapshotDraft`
      // and `cmdPacket`'s own record write already hold.
      process.stderr.write(`draft: step ${t.step_id} has no readable packet record in ${join(ws, "run.json")} — its trace entry carries no packet fields; the trace never gates the write it traces\n`);
    }
    // THE FIGURE ENTRY (the renderer and the anchor, kogaki#879). `record` is relative to the draft,
    // the convention `brief:` and `packet:` already use — two machines emit
    // identical bytes — and `record_sha` is the sha `figure` recorded at
    // validation, READ rather than recomputed. `lines` is the block's own span,
    // beside the Step's prose range and never inside it: a reader joining a
    // rendered figure back to the record it came from needs both, and a single
    // range carrying both would answer for neither.
    const fig = figures.get(t.step_id);
    if (fig) {
      const span = figureRanges.get(t.step_id);
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

// ---------------------------------------------------------------------------
// The fixture pass — seam-free, filesystem under a temp dir only. Each case
// CONSTRUCTS its defect and asserts this runtime refuses or produces by name.
async function runSelfTest() {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const root = mkdtempSync(join(tmpdir(), "draft-selftest-"));
  const briefDir = join(root, "theses", "fixture-brief");
  mkdirSync(briefDir, { recursive: true });
  const ws = join(root, "ws");
  let passed = 0; const failures = [];
  const ok = (name, cond) => { if (cond) passed++; else failures.push(name); };

  const goodBrief = [
    "# Brief — fixture-brief", "",
    "*Survey pin:* `product-lab@0000000000000000000000000000000000000000`", "",
    "## Strands", "",
    "### L1 — first-strand", "",
    "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
    "## Thesis", "", "The fixture claim.", "",
    // the Step Packet's global anchors (kogaki#749). The fixture carried a Thesis and
    // none of the other three, so the Packet refused by name — correctly, and
    // the fixture is what was short. Added here rather than defaulted in the
    // renderer: a default would be the renderer inventing an anchor, which is
    // exactly the hole the refusal exists to keep open.
    "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
    "## Reader target", "", "The reader can say why the fixture claim is not obvious.", "",
    "## Opening question", "", "What makes the fixture claim worth stating?", "",
    "## Sequence", "",
    // The step blocks carry the fields the Step Packet RENDERS, not only the two earlier
    // cases parse. Same correction as the anchors above: the Packet refused by
    // name and the fixture was what was short.
    "```step", "step_id: s1", "move: open_the_claim", "purpose: open",
    "reader_state_before: the reader has not met the claim.",
    "reader_state_after: the reader can state the claim.",
    "materials: L1", "rationale: the claim opens the article.",
    "ground (strand L1): the material states the claim.", "```", "",
    "```step", "step_id: s2", "move: close_the_claim", "purpose: close",
    "reader_state_before: the reader can state the claim.",
    "reader_state_after: the reader can say why it holds.",
    "materials: L1", "rationale: the close is what the opening owes.",
    "ground (step_effect s1): s1 leaves the claim stated.", "```", "",
  ].join("\n");
  writeFileSync(join(briefDir, "brief.md"), goodBrief);

  // the Step-Move instantiation contract's FIXTURE MOVE LIBRARY (kogaki#747). The fixture Brief binds Moves
  // because a Step without one is not a Step (the Step's shape v18) and its id must
  // resolve (the Step-Move instantiation contract) — the pass drove a Brief whose step blocks carried no
  // `move:` at all, which is the same dead-input state this issue closes.
  // A fixture library rather than the repository's `moves/`: a self-test that
  // resolved against the real store would go red on a library edit it has
  // nothing to do with, and would force the fixture to adopt real Move ids it
  // does not mean. Records hold an id line only — the resolver reads the store
  // as a set of ids and nothing more.
  const movesDir = join(root, "moves");
  mkdirSync(movesDir, { recursive: true });
  for (const id of ["open_the_claim", "close_the_claim"]) {
    // the Step Packet renders intent/constraints/failure_modes and the excerpt, so the
    // fixture records carry them — a store holding ids alone was enough for
    // the Step-Move instantiation contract's membership test and is not enough for a Packet.
    writeFileSync(join(movesDir, `${id}.md`), [
      `id: ${id}`, "status: observed",
      // THE FIXTURE RECORDS WRAP (PR #780 round 1). Single-line folded scalars
      // never exercised the fold, which is why a fold that did nothing shipped.
      "intent: >-", `  what ${id} does to the reader,`, "  stated across two lines.",
      "requires: >-", "  the state this move depends on.",
      "effect: >-", "  the state this move produces.",
      "constraints: >-", "  what a correct performance must not do.",
      "failure_modes: >-", "  how it goes wrong when imitated badly.",
      "excerpt: >-", "  the author's account of the movement they observed.",
    ].join("\n") + "\n");
  }

  // 1 — a template is not an input: the refusal names the field.
  const template = goodBrief.replace("The fixture claim.", SLOT);
  const t = parseBrief(template, "t.md");
  ok("template refused by field name",
    t.refusals.some((r) => r.includes('"Thesis"') && r.includes("template")));

  // 2 — a foreign Strand refuses by name, set quoted.
  const parsed = parseBrief(goodBrief, "g.md");
  ok("foreign strand named with the closed set",
    foreignStrandRefusal("L9", parsed.strands).includes("L9") &&
    foreignStrandRefusal("L9", parsed.strands).includes("(L1)"));
  ok("prose naming a foreign strand is caught",
    scanForeignStrands("as L9 shows", parsed.strands).includes("L9") &&
    scanForeignStrands("as L1 shows", parsed.strands).length === 0);

  // 3 — trace structure in a body is caught in both shapes.
  ok("step key line refused as structure",
    findTraceStructure("step_id: s1\nprose", ["s1"]).length === 1);
  ok("bare step-id heading refused as structure",
    findTraceStructure("## s1\nprose", ["s1"]).length === 1);
  ok("plain prose is not structure",
    findTraceStructure("## A real heading\nprose about s-things", ["s1"]).length === 0);

  // 4 — the flow end to end: sections land, emit assembles in RECORDED order
  // whatever order they arrived in, and re-emit preserves generated_by.
  const { spawnSync } = await import("node:child_process");
  const self = fileURLToPath(import.meta.url);
  const drive = (cmd, ...extra) => spawnSync(process.execPath,
    [self, cmd, "--brief", join(briefDir, "brief.md"), "--workspace", ws, "--moves-dir", movesDir, ...extra],
    { encoding: "utf8" });

  const r0 = drive("resolve");
  ok("resolve prints the recorded order", r0.status === 0 && r0.stdout.includes("s1 → s2"));

  // 4a2 — the reader-knowledge ledger's `introduces:` READ BACK (kogaki#751). The field is written
  // one line per entry by renderStep; this is the reader half of that round
  // trip, and a malformed entry refuses NAMING the Step (acceptance).
  {
    const withIntro = goodBrief.replace(
      "step_id: s1\nmove: open_the_claim",
      "step_id: s1\nmove: open_the_claim\nintroduces: opacity — what a state conceals, in practice\nintroduces: deterrence");
    const pi = parseBrief(withIntro, "i.md");
    ok("introduces is read off the step block, one line per entry",
      pi.refusals.length === 0 && pi.steps[0].introduces.length === 2);
    ok("an anchor carrying a comma survives the read",
      (pi.steps[0].introduces[0] || "").includes("conceals, in practice"));
    ok("a step with no introduces line reads as none, not as an absence to report",
      Array.isArray(pi.steps[1].introduces) && pi.steps[1].introduces.length === 0);
    const led = readerKnowledgeLedger(pi.steps);
    ok("the ledger derives from the PARSED path",
      led[0].reader_already_knows.length === 0 && led[1].reader_already_knows.length === 2);
    const bad = parseBrief(goodBrief.replace("move: open_the_claim", "move: open_the_claim\nintroduces: opacity — "), "b.md");
    ok("a malformed introduces entry refuses NAMING the step",
      bad.refusals.some((r) => r.includes("s1") && /meaning anchor/.test(r)));
    // A BRIEF WITH NO `introduces:` ANYWHERE RENDERS AN EMPTY LEDGER, NOT AN
    // ERROR (acceptance) — the state every Brief in the tree is in today.
    const plain = readerKnowledgeLedger(parseBrief(goodBrief, "p.md").steps);
    ok("a Brief introducing nothing derives an empty ledger rather than failing",
      plain.length === 2 && plain.every((r) => r.reader_already_knows.length === 0));
    // THE COUNT IS THE DERIVATION'S, and a re-declared term is counted ONCE
    // (PR #775 round 1). Driven end to end rather than asserted against the
    // function, because the defect was in the RENDERING and the function was
    // right — an assertion over readerKnowledgeLedger would have passed.
    const redecl = goodBrief
      .replace("step_id: s1\nmove: open_the_claim", "step_id: s1\nmove: open_the_claim\nintroduces: opacity")
      .replace("step_id: s2\nmove: close_the_claim", "step_id: s2\nmove: close_the_claim\nintroduces: opacity\nintroduces: deterrence");
    const rdDir = join(root, "theses", "redecl"); mkdirSync(rdDir, { recursive: true });
    writeFileSync(join(rdDir, "brief.md"), redecl);
    const rr = spawnSync(process.execPath,
      [self, "resolve", "--brief", join(rdDir, "brief.md"), "--workspace", join(root, "ws-r"), "--moves-dir", movesDir],
      { encoding: "utf8" });
    ok("a term two Steps declare is counted ONCE in the rendered ledger",
      rr.status === 0 && /reader-knowledge ledger: 2 term\(s\)/.test(rr.stdout));
    ok("resolve states the ledger it derived, including the empty reading",
      r0.status === 0 && /reader-knowledge ledger: 0 term\(s\)/.test(r0.stdout) && /not an error/.test(r0.stdout));
  }

  // 4a3 — the Step Packet's SECTION PACKET (kogaki#749). The Packet is the model's
  // ENTIRE input for one Step, so every property below is about what reaches
  // the model: determinism, byte-identity with what was stored, a refusal by
  // NAME rather than an empty slot, and the two exclusions the rulings make.
  {
    const pk = (step, extra = []) => spawnSync(process.execPath,
      [self, "packet", "--brief", join(briefDir, "brief.md"), "--workspace", ws, "--moves-dir", movesDir, "--step", step, ...extra],
      { encoding: "utf8" });
    const p1 = pk("s1");
    ok("packet renders", p1.status === 0 && p1.stdout.length > 0);
    // DETERMINISTIC: same inputs, same bytes. No timestamp, no run id, and the
    // prior Sections come in the Brief's recorded order rather than from a
    // directory read — a readdir would make the Packet depend on the filesystem.
    ok("packet is deterministic across renders", pk("s1").stdout === p1.stdout);
    // STORED EXACTLY AS SERVED, and asserted as BYTES rather than as a claim.
    // The runtime nests the workspace under the Brief's SLUG
    // (`workspaceFor(args, brief.slug)`), and `ws` here is the BASE the flag
    // names — so the assertion reads the same path the command writes rather
    // than the one the flag looks like it names. Found by the case failing:
    // a byte-identity assertion pointed at a file that was never written
    // reports a difference it never actually compared.
    const wsSlug = join(ws, "fixture-brief");
    const stored = join(wsSlug, "packets", "s1.md");
    ok("the stored packet is byte-identical to what was printed",
      existsSync(stored) && readFileSync(stored, "utf8") === p1.stdout);
    // RECORDED IN THE RUN RECORD, which is what the ruling asks for — a print
    // is read by whoever is watching, a record by whoever comes after.
    {
      const rf = join(wsSlug, "run.json");
      const rec = existsSync(rf) ? JSON.parse(readFileSync(rf, "utf8")) : {};
      ok("the packet's path and sha are recorded in the run record",
        rec.packets && rec.packets.s1 && rec.packets.s1.path === stored
        && /^[0-9a-f]{64}$/.test(rec.packets.s1.sha256 || ""));
      // A RE-RESOLVE DOES NOT ORPHAN THEM. run.json is overwritten at resolve by
      // design, so the recording this round added would have been erased by the
      // next resolve while the Packet files stayed on disk.
      const rr = spawnSync(process.execPath,
        [self, "resolve", "--brief", join(briefDir, "brief.md"), "--workspace", ws, "--moves-dir", movesDir],
        { encoding: "utf8" });
      const after = JSON.parse(readFileSync(rf, "utf8"));
      ok("a re-resolve preserves the packet records when the Brief has not moved",
        rr.status === 0 && after.packets?.s1?.sha256 === rec.packets?.s1?.sha256);
      ok("the recorded sha is the sha of what was actually stored",
        rec.packets?.s1?.sha256 === createHash("sha256").update(readFileSync(stored, "utf8")).digest("hex"));
    }
    // THE TEMPLATE POINTS AT NO SPEC (acceptance 3), asserted against the
    // RENDERED packet as well as the template file: a slot could carry one in.
    const tpl = readFileSync(join(dirname(self), "packet-template.md"), "utf8");
    const pointer = /specs\/|SPEC\.md|SPEC-|\u00a7[0-9]/;
    ok("the template carries no pointer to any spec", !pointer.test(tpl));
    ok("the rendered packet carries no pointer to any spec", !pointer.test(p1.stdout));
    // THE AUTHORING COMMENT IS NOT THE MODEL'S INPUT.
    ok("the template's authoring comment is stripped from the packet",
      tpl.startsWith("<!--") && !p1.stdout.includes("<!--"));
    // requires/effect EXCLUDED: the Step's instantiated states win, and
    // rendering both would put the general and the specialized statement of one
    // thing side by side for the model to choose between.
    // ASSERTED AGAINST THE MOVE RECORD'S OWN VALUES, not against a label. The
    // first form tested for the strings `**requires.**` / `**effect.**`, which
    // only a template edit could produce — so a renderer that leaked the values
    // under any other label passed. The fixture's requires/effect texts are
    // distinctive, and their ABSENCE from the rendered bytes is the property.
    const reqText = "the state this move depends on";
    const effText = "the state this move produces";
    ok("the Move's requires/effect values are excluded from the packet",
      !p1.stdout.includes(reqText) && !p1.stdout.includes(effText));
    ok("the fixture's requires/effect are non-empty, so the exclusion is not vacuous",
      readFileSync(join(movesDir, "open_the_claim.md"), "utf8").includes(reqText));
    ok("the Step's instantiated states ARE present",
      /reader_state_before/.test(p1.stdout) && /reader_state_after/.test(p1.stdout));
    // The exemplar's FORM-ONLY header is what stops the passage being read as
    // content — the block whose absence fails worst.
    // THE FOLD ACTUALLY FOLDS. The fixture's intent wraps across two lines, so
    // a fold that does nothing renders them as two — the defect PR #780 round 1
    // found, which no mutation could reach because there was no guard to break.
    ok("a multi-line Move field is folded to one line in the packet",
      /what open_the_claim does to the reader, stated across two lines\./.test(p1.stdout));
    ok("the exemplar carries its form-only usage header",
      /FORM ONLY/.test(p1.stdout) && /do not reuse its/i.test(p1.stdout));
    // A DANGLING INPUT REFUSES BY NAME rather than rendering an empty slot: a
    // hole in the model's entire input is a hole it fills by invention.
    const bad = pk("nope");
    ok("a step not in the path refuses naming it", bad.status !== 0 && /nope/.test(bad.stderr));
    // A MISSING BLOCK refuses BY NAME — the case the guard exists for, which
    // the complete fixture cannot reach. Driven against a Brief with one
    // anchor removed, because with nothing missing the guard never fires and
    // deleting it changes no output at all.
    {
      const holedDir = join(root, "theses", "holed"); mkdirSync(holedDir, { recursive: true });
      writeFileSync(join(holedDir, "brief.md"),
        goodBrief.replace(/## Reader target\n\n.*\n/, ""));
      const holed = spawnSync(process.execPath,
        [self, "packet", "--brief", join(holedDir, "brief.md"), "--workspace", join(root, "ws-holed"),
         "--moves-dir", movesDir, "--step", "s1"], { encoding: "utf8" });
      ok("a Brief missing an anchor refuses BY NAME rather than rendering an empty slot",
        holed.status !== 0 && /Reader target/.test(holed.stderr) && /is absent/.test(holed.stderr));
      ok("the refusal says why an empty slot would be worse",
        /fills by invention/.test(holed.stderr));
    }
    // The ledger and the prior Sections both reach the packet.
    // A SEPARATE WORKSPACE for the prior-Sections case. Writing s1.md into the
    // shared one landed a realized Section before the later emit case ran, and
    // that case's whole premise is that emit refuses SHORT of completion — so
    // this block silently discharged the condition a downstream assertion
    // exists to test. Found by that case going red. A fixture that mutates
    // shared state is a defect in the fixture, not in the case it breaks.
    const ws2 = join(root, "ws-packet");
    mkdirSync(join(ws2, "fixture-brief", "sections"), { recursive: true });
    writeFileSync(join(ws2, "fixture-brief", "sections", "s1.md"), "The already-written opening.");
    const p2 = spawnSync(process.execPath,
      [self, "packet", "--brief", join(briefDir, "brief.md"), "--workspace", ws2, "--moves-dir", movesDir, "--step", "s2"],
      { encoding: "utf8" });
    ok("prior Sections reach the packet verbatim", p2.stdout.includes("The already-written opening."));
    // IN THE BRIEF'S RECORDED ORDER, and this needs THREE Steps whose path
    // order differs from their filename order. With two, the single prior
    // Section is the same set either way — the orders coincide and a readdir
    // implementation passes. Found by running exactly that mutation twice:
    // the first fixture had two Steps and stayed green.
    //
    // Path order is c, a, b; filename sort is a, b, c. Rendering for `b`, the
    // recorded order gives [c, a] and a directory read gives [a, c], so the
    // RELATIVE POSITION of the two texts is what separates them.
    {
      const ws3 = join(root, "ws-order");
      // The slug comes from the Brief's own `# Brief — <slug>` line, which this
      // fixture inherits from goodBrief's head — NOT from the directory the file
      // sits in. Pointing at the directory name wrote the sections where the
      // runtime never looks, and the case failed unmutated.
      const secs = join(ws3, "fixture-brief", "sections");
      mkdirSync(secs, { recursive: true });
      writeFileSync(join(secs, "a.md"), "AAA-section.");
      writeFileSync(join(secs, "c.md"), "CCC-section.");
      const mk = (id) => ["```step", `step_id: ${id}`, "move: open_the_claim", `purpose: p${id}`,
        `reader_state_before: before ${id}.`, `reader_state_after: after ${id}.`,
        "materials: L1", `rationale: r${id}.`, "ground (strand L1): g.", "```", ""].join("\n");
      const head = goodBrief.split("## Sequence")[0];
      const b3 = head + "## Sequence\n\n" + mk("c") + mk("a") + mk("b");
      const od = join(root, "theses", "ordered"); mkdirSync(od, { recursive: true });
      writeFileSync(join(od, "brief.md"), b3);
      const p3 = spawnSync(process.execPath,
        [self, "packet", "--brief", join(od, "brief.md"), "--workspace", ws3, "--moves-dir", movesDir, "--step", "b"],
        { encoding: "utf8" });
      const body = (p3.stdout || "").split("article so far")[1] || "";
      const ic = body.indexOf("CCC-section."), ia = body.indexOf("AAA-section.");
      ok("both prior Sections reach the packet", p3.status === 0 && ic !== -1 && ia !== -1);
      ok("prior Sections render in the BRIEF's recorded order, not the directory's",
        ic !== -1 && ia !== -1 && ic < ia);
    }
    ok("a first Section states the absence of prior ones rather than rendering empty",
      /nothing yet/.test(p1.stdout));
    ok("the derived reader-knowledge ledger reaches the packet",
      /already knows/.test(p2.stdout));
  }

  // 4b — the Step-Move instantiation contract's MECHANICAL HALF at the realization entry (kogaki#747).
  // `move:` was parsed for nothing; it is read now, and `resolve` refuses an
  // EXISTING Brief whose binding resolves to no record. This seat does not
  // duplicate the composition-side one: a Move renamed or withdrawn after the
  // Brief was composed dangles without the Brief changing at all, so a Brief
  // that passed adoption can fail here and that is the case this covers.
  ok("the move binding is read off the step block",
    parsed.steps.length === 2 && parsed.steps[0].move === "open_the_claim");
  const danglingBrief = goodBrief.replace("move: close_the_claim", "move: close_the_clam");
  const dbDir = join(root, "theses", "dangling"); mkdirSync(dbDir, { recursive: true });
  writeFileSync(join(dbDir, "brief.md"), danglingBrief);
  const rd = spawnSync(process.execPath,
    [self, "resolve", "--brief", join(dbDir, "brief.md"), "--workspace", join(root, "ws-d"), "--moves-dir", movesDir],
    { encoding: "utf8" });
  ok("resolve refuses a dangling move id, naming the step and the id",
    rd.status !== 0 && /s2/.test(rd.stderr) && /close_the_clam/.test(rd.stderr));
  ok("resolve states what it resolved against the library",
    r0.status === 0 && /2 of 2 step\(s\) resolved/.test(r0.stdout));
  // AN UNREADABLE LIBRARY IS NOT AN EMPTY ONE — the refusal names the store,
  // never the Steps, so a composer is not sent to re-bind Moves that are fine.
  const rn = spawnSync(process.execPath,
    [self, "resolve", "--brief", join(briefDir, "brief.md"), "--workspace", join(root, "ws-n"), "--moves-dir", join(root, "no-library")],
    { encoding: "utf8" });
  ok("an unreadable Move library refuses as a store fault, naming no Step",
    rn.status !== 0 && /cannot be read/.test(rn.stderr) && !/step s1/.test(rn.stderr));

  const sec2 = join(root, "sec2.md"); writeFileSync(sec2, "The closing prose.");
  const sec1 = join(root, "sec1.md"); writeFileSync(sec1, "The opening prose.");
  const e0 = drive("emit");
  ok("emit refuses short of completion, naming the owed steps",
    e0.status !== 0 && e0.stderr.includes("s1, s2"));
  // THE BACKSTOP FIRES BEFORE ANY OF THESE (kogaki#811). Asserted first,
  // because every `section` below now presupposes a Packet and a fixture that
  // only exercised the happy path would pass whether or not the refusal exists.
  ok("section refuses a Step whose Packet was never rendered",
    (() => { const r = drive("section", "--step", "s2", "--file", sec2);
             return r.status !== 0 && /no rendered Packet/.test(r.stderr); })());

  // Render-within: `resolve` already handed s1's Packet forward, so s1 needs
  // no command here — which is the whole point. s2's is rendered explicitly to
  // reach it out of order.
  // The workspace resolves under the Brief's slug, so the Packet path is named
  // once here rather than rebuilt at each assertion below.
  const wsSlug = join(ws, "fixture-brief");
  ok("resolve rendered the first Step's Packet without being asked",
    existsSync(join(wsSlug, "packets", "s1.md")));
  drive("packet", "--step", "s2");
  const w2 = drive("section", "--step", "s2", "--file", sec2);
  const w1 = drive("section", "--step", "s1", "--file", sec1);
  ok("sections land", w1.status === 0 && w2.status === 0);

  // A PACKET DELETED AFTER ITS RENDER (PR #814 round 1, finding 2). This is the
  // backstop's OWN case and the one that distinguishes it from render-within:
  // the never-rendered case above reaches the same branch, but from a state
  // render-within explains rather than one it cannot see. #811 and the Packet architecture
  // both name delete-after-render specifically, so it is asserted specifically.
  ok("section refuses a Packet deleted after it was rendered",
    (() => { const pkt = join(wsSlug, "packets", "s1.md");
             const keep = readFileSync(pkt, "utf8");
             rmSync(pkt);
             const r = drive("section", "--step", "s1", "--file", sec1);
             writeFileSync(pkt, keep);
             return r.status !== 0 && /no rendered Packet/.test(r.stderr); })());

  // A Packet edited after its render disagrees with its own recorded sha, and
  // that is the second case render-within structurally cannot see.
  ok("section refuses a Packet that changed after it was rendered",
    (() => { const pkt = join(wsSlug, "packets", "s1.md");
             const keep = readFileSync(pkt, "utf8");
             writeFileSync(pkt, keep + "\nedited after the render\n");
             const r = drive("section", "--step", "s1", "--file", sec1);
             writeFileSync(pkt, keep);
             return r.status !== 0 && /changed after it was rendered/.test(r.stderr); })());

  // And a Packet file no run record accounts for is the same refusal, because
  // "rendered" means recorded — an unrecorded file cannot be shown to be the
  // one the prose was realized from.
  ok("section refuses a Packet file no run record accounts for",
    (() => { const runFile = join(wsSlug, "run.json");
             const keep = readFileSync(runFile, "utf8");
             const rec = JSON.parse(keep); delete rec.packets;
             writeFileSync(runFile, JSON.stringify(rec, null, 2));
             const r = drive("section", "--step", "s1", "--file", sec1);
             writeFileSync(runFile, keep);
             return r.status !== 0 && /no run record accounts for/.test(r.stderr); })());
  const wForeign = join(root, "foreign.md"); writeFileSync(wForeign, "But L9 says.");
  ok("a section naming a foreign strand refuses",
    drive("section", "--step", "s1", "--file", wForeign).status !== 0);
  ok("an unknown step names both sides",
    drive("section", "--step", "s3", "--file", sec1).stderr.includes("s1, s2"));
  const mForeign = drive("material", "--strand", "L9");
  ok("material refuses a foreign strand by driving the command",
    mForeign.status !== 0 && mForeign.stderr.includes("L9") && mForeign.stderr.includes("(L1)"));
  ok("material serves an in-set strand", drive("material", "--strand", "L1").status === 0);

  const e1 = drive("emit");
  const outPath = join(briefDir, "draft.md");
  ok("emit writes the fixed human name", e1.status === 0 && existsSync(outPath));
  const out = existsSync(outPath) ? readFileSync(outPath, "utf8") : "";
  ok("body is in the recorded order however sections arrived",
    out.indexOf("The opening prose.") > 0 &&
    out.indexOf("The opening prose.") < out.indexOf("The closing prose."));
  ok("frontmatter carries the record half",
    out.includes("brief_pin: sha256:") && out.includes("survey_pin: product-lab@") &&
    out.includes("generated_by: {") &&
    (out.includes('"step_id":"s1"') || out.includes('"step_id": "s1"')));
  ok("the artifact names its Brief machine-independently",
    /^brief: brief\.md$/m.test(out));
  const bodyHalf = out.split("---\n").slice(2).join("---\n");
  ok("the trace renders no visible structure in the body",
    !/^\s*step_id\s*:/m.test(bodyHalf) && !/^#{1,6}\s*s1\s*$/m.test(bodyHalf));
  const gb0 = out.match(/^generated_by: (\{.*\})$/m)?.[1];
  const e2 = drive("emit");
  const gb1 = readFileSync(outPath, "utf8").match(/^generated_by: (\{.*\})$/m)?.[1];
  ok("generated_by is immutable across overwrite", e2.status === 0 && gb0 === gb1);

  // 5 — snapshot locality: everything this flow wrote outside the Brief's own
  // directory lives under the workspace; the Brief dir gained exactly draft.md.
  const briefDirNow = readdirSync(briefDir).sort().join(",");
  ok("the owner tree gained exactly the CanonicalDraft", briefDirNow === "brief.md,draft.md");
  ok("snapshots exist and are machine-local",
    readdirSync(join(ws, "fixture-brief", "snapshots")).length >= 2);

  // 6 — THE LANE BINDING (kogaki#750). Every case above drives `--workspace`,
  // which is exactly the path that did NOT change, so on its own this pass is
  // green about a runtime that still writes to the retired home directory. The
  // DEFAULT is the thing the issue moved, and `workspaceFor` is pure, so it can
  // be asserted without writing anything: the destination is this lane's own
  // directory in the tree and the slug is its entry.
  ok("the default workspace is the draft lane's own directory",
    workspaceFor({}, "some-slug") === join(laneDir("draft"), "some-slug"),
    workspaceFor({}, "some-slug"));
  ok("an explicit --workspace still wins over the lane default",
    workspaceFor({ workspace: "/tmp/elsewhere" }, "some-slug") === join("/tmp/elsewhere", "some-slug"));
  // The CONTROL that the assertion above is about a MOVE and not about any
  // path: no run destination in this module resolves under a home directory
  // any more. Stated as a property of the resolved path rather than of the
  // source text, so a re-spelling that reintroduces the home directory fails.
  ok("no default run destination resolves under a home directory",
    !workspaceFor({}, "some-slug").includes(`${sep}.kogaki${sep}`));

  // 7 — the Section grouping's SECTION GROUPING, DRIVEN END TO END (kogaki#823). The cases
  // above run against a Brief that declares no `opens_section`, which is the
  // pre-Section-grouping corpus and exercises exactly the fallback branch — so on their
  // own they are green about a renderer that reads the declaration for nothing.
  // This block drives a Brief that DOES declare it: three Steps, two Sections,
  // so "fewer headings than Steps" is a property of the output rather than an
  // arithmetic identity that would hold for any grouping.
  const secDir = join(root, "theses", "section-brief");
  mkdirSync(secDir, { recursive: true });
  const secWs = join(root, "ws-sec");
  const stepBlock = (id, move, opens, extra = []) => [
    "```step", `step_id: ${id}`, `move: ${move}`,
    ...(opens ? [`opens_section: ${opens}`] : []),
    `purpose: purpose of ${id}`,
    `reader_state_before: before ${id}.`, `reader_state_after: after ${id}.`,
    "materials: L1", `rationale: rationale for ${id}.`,
    "ground (strand L1): the material states the claim.",
    ...extra, "```", "",
  ];
  const secBrief = (blocks) => [
    "# Brief — section-brief", "",
    "*Survey pin:* `product-lab@0000000000000000000000000000000000000000`", "",
    "## Strands", "", "### L1 — first-strand", "",
    "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
    "## Thesis", "", "The fixture claim.", "",
    "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
    "## Reader target", "", "The reader can say why the fixture claim is not obvious.", "",
    "## Opening question", "", "What makes the fixture claim worth stating?", "",
    "## Sequence", "", ...blocks,
  ].join("\n");
  writeFileSync(join(secDir, "brief.md"), secBrief([
    ...stepBlock("t1", "open_the_claim", "The first question"),
    ...stepBlock("t2", "close_the_claim", null),
    ...stepBlock("t3", "close_the_claim", "The second question"),
  ]));
  const driveSec = (cmd, ...extra) => spawnSync(process.execPath,
    [self, cmd, "--brief", join(secDir, "brief.md"), "--workspace", secWs, "--moves-dir", movesDir, ...extra],
    { encoding: "utf8" });

  driveSec("resolve");
  for (const id of ["t1", "t2", "t3"]) {
    const f = join(root, `prose-${id}.md`);
    writeFileSync(f, `The realized prose for ${id}.`);
    driveSec("section", "--step", id, "--file", f);
  }
  const eSec = driveSec("emit");
  const secOut = existsSync(join(secDir, "draft.md")) ? readFileSync(join(secDir, "draft.md"), "utf8") : "";
  const secBody = secOut.split("---\n").slice(2).join("---\n");
  const headings = [...secBody.matchAll(/^## (.+)$/gm)].map((m) => m[1]);

  ok("a declared path emits one heading per Section, at the opening Step",
    eSec.status === 0 && headings.join("|") === "The first question|The second question", headings.join("|"));
  // The issue's acceptance 1 and 3, asserted as the RELATION rather than as the
  // number: three Steps and two headings is what "fewer headings than Steps"
  // means, and equality with the Section count is what "none inside" means.
  ok("fewer headings than Steps, and exactly one per Section",
    headings.length === 2 && headings.length < 3 &&
    headings.length === sectionsOf([{ step_id: "t1", opens_section: "a" }, { step_id: "t2" }, { step_id: "t3", opens_section: "b" }]).length);
  // The continuing Step's prose sits under the heading its Section opened with
  // and gains none of its own — the "no heading inside a Section" half.
  ok("a continuing Step's prose renders under the open Section's heading, with no heading of its own",
    secBody.indexOf("The realized prose for t2.") > secBody.indexOf("## The first question") &&
    secBody.indexOf("The realized prose for t2.") < secBody.indexOf("## The second question"));

  // Acceptance 2: every Step in the trace, mapped to exactly one Section — and
  // t1/t2 sharing Section 1 is what the old `section: i + 1` could not say.
  const secTrace = [...secOut.matchAll(/^  - (\{"step_id".*\})$/gm)].map((m) => JSON.parse(m[1]));
  ok("every Step appears in the trace, mapped to exactly one Section",
    secTrace.length === 3 && new Set(secTrace.map((t) => t.step_id)).size === 3 &&
    secTrace.every((t) => typeof t.section === "number"));
  ok("Steps sharing a Section carry the SAME section number, and the title rides the trace",
    secTrace[0].section === 1 && secTrace[1].section === 1 && secTrace[2].section === 2 &&
    secTrace[0].section_title === "The first question" && secTrace[2].section_title === "The second question",
    JSON.stringify(secTrace));

  // kogaki#868 acceptance 1: the range is asserted by RESOLVING it against the
  // file as written, never by recomputing the arithmetic the emitter used — a
  // test that repeats the derivation is green exactly when the derivation is
  // wrong in both places.
  const secLines = secOut.split("\n");
  ok("every trace entry locates its Step's prose by line range, resolved against the written file",
    secTrace.length === 3 && secTrace.every((t) =>
      Array.isArray(t.lines) && t.lines.length === 2 && t.lines[0] <= t.lines[1] &&
      secLines.slice(t.lines[0] - 1, t.lines[1]).join("\n") === `The realized prose for ${t.step_id}.`),
    JSON.stringify(secTrace.map((t) => [t.step_id, t.lines])));
  // A heading line and the blank lines between blocks belong to no Step: t1
  // opens a Section, so its range must start BELOW the heading it opened with.
  ok("a Section heading line belongs to no Step's range",
    secLines[secTrace[0].lines[0] - 2] === "" &&
    secLines[secTrace[0].lines[0] - 3] === "## The first question");
  // Acceptance 1's other half: the Packet that produced the prose, by path and
  // by sha, with the sha checked against the file at the path it names.
  ok("every trace entry names its Packet, and packet_sha is the sha of the file at packet",
    secTrace.every((t) => typeof t.packet === "string" && /^[0-9a-f]{64}$/.test(t.packet_sha || "") &&
      t.packet_sha === createHash("sha256")
        .update(readFileSync(join(secDir, t.packet), "utf8")).digest("hex")),
    JSON.stringify(secTrace.map((t) => [t.step_id, t.packet])));
  // Acceptance 3: a missing `packets` entry drops the two fields for THAT Step
  // and nothing else — the draft is still written, the range still resolves,
  // and stderr names the Step. The trace never gates the write it traces.
  const secRunFile = join(secWs, "section-brief", "run.json");
  const secRunKeep = readFileSync(secRunFile, "utf8");
  const secRec = JSON.parse(secRunKeep); delete secRec.packets.t2;
  writeFileSync(secRunFile, JSON.stringify(secRec, null, 2) + "\n");
  const eGap = driveSec("emit");
  const gapTrace = [...readFileSync(join(secDir, "draft.md"), "utf8")
    .matchAll(/^  - (\{"step_id".*\})$/gm)].map((m) => JSON.parse(m[1]));
  ok("a Step whose packet record is absent emits no packet fields, warns by name, and does not gate the write",
    eGap.status === 0 && gapTrace.length === 3 &&
    gapTrace[1].packet === undefined && gapTrace[1].packet_sha === undefined &&
    Array.isArray(gapTrace[1].lines) &&
    gapTrace[0].packet !== undefined && gapTrace[2].packet !== undefined &&
    /step t2 has no readable packet record/.test(eGap.stderr),
    eGap.stderr.trim().split("\n").slice(-1)[0]);
  writeFileSync(secRunFile, secRunKeep);
  driveSec("emit");

  // Acceptance 4's CONTROL: the adjacent guard is unchanged. Asserted on this
  // Brief rather than trusted from the block above, because this is the issue
  // that put a second heading rule beside it.
  const badTrace = join(root, "prose-bad-trace.md");
  writeFileSync(badTrace, "step_id: t1\n\nprose.");
  // ASSERTS WHICH REFUSAL FIRED (PR #843 round 1, finding 4). `status !== 0`
  // alone stayed green if `findTraceStructure`'s call were removed and any
  // earlier guard — the Packet backstop, the foreign-strand scan — refused
  // instead, which is precisely the control acceptance 4 asks for failing to
  // control anything. Its two siblings already assert on stderr text; this one
  // is now their equal.
  const rTrace = driveSec("section", "--step", "t1", "--file", badTrace);
  ok("findTraceStructure's refusals still fire on a declared path, by name",
    rTrace.status !== 0 && rTrace.stderr.includes("renders record as structure") &&
    rTrace.stderr.includes("`step_id:` key line"), rTrace.stderr.trim().slice(0, 160));
  ok("a bare step id as a heading is still refused",
    findTraceStructure("# t1\n\nprose.", ["t1"]).length > 0);

  // The prose-side half of "no heading inside a Section": the Harness owns the
  // heading, so prose writing its own is refused at the act that records it.
  const ownHeading = join(root, "prose-own-heading.md");
  writeFileSync(ownHeading, "## A title the Brief never declared\n\nprose.");
  const rOwn = driveSec("section", "--step", "t1", "--file", ownHeading);
  ok("realized prose carrying its own heading refuses, naming the heading",
    rOwn.status !== 0 && rOwn.stderr.includes("A title the Brief never declared"), rOwn.stderr.trim().slice(0, 160));
  // EVERY LEVEL (PR #843 round 1, finding 3). The `##` case above passed under
  // the first form of the guard AND under the defect, because the defect was
  // at h4 and above — so the level sweep is the case that discriminates, and
  // its absence is why the hole shipped. `findTraceStructure` reads `#{1,6}`,
  // so h4 was refused as RECORD and unrefused as a TITLE by the same file.
  for (const level of ["#", "###", "####", "#####", "######"]) {
    const f = join(root, `prose-h${level.length}.md`);
    writeFileSync(f, `${level} A title the Brief never declared\n\nprose.`);
    const r = driveSec("section", "--step", "t1", "--file", f);
    ok(`realized prose carrying an h${level.length} heading refuses too`,
      r.status !== 0 && r.stderr.includes("A title the Brief never declared"), r.stderr.trim().slice(0, 120));
  }
  // THE OVER-REFUSALS, both directions (finding 5). A hash inside a fenced code
  // block is a comment and not a heading; a lone hash with no text is neither.
  const fenced = join(root, "prose-fenced.md");
  writeFileSync(fenced, "prose before.\n\n```sh\n# install deps\nnpm i\n```\n\nprose after.");
  const rFenced = driveSec("section", "--step", "t1", "--file", fenced);
  ok("a hash comment inside a fenced code block is not refused as a heading",
    rFenced.status === 0, rFenced.stderr.trim().slice(0, 160));
  const loneHash = join(root, "prose-lone-hash.md");
  writeFileSync(loneHash, "prose.\n\n#\n\nmore prose.");
  const rLone = driveSec("section", "--step", "t1", "--file", loneHash);
  ok("a lone hash with no text on its line is not read as a heading spanning later lines",
    rLone.status === 0, rLone.stderr.trim().slice(0, 160));

  // The round trip: the writer is `renderStep` and the reader is `parseBrief`,
  // through ONE shared shape grammar. A malformed value refuses NAMING the Step
  // rather than rendering a blank heading over a Section.
  const blankDir = join(root, "theses", "blank-brief");
  mkdirSync(blankDir, { recursive: true });
  writeFileSync(join(blankDir, "brief.md"), secBrief([
    ...stepBlock("t1", "open_the_claim", "   "),
    ...stepBlock("t2", "close_the_claim", null),
  ]));
  const rBlank = spawnSync(process.execPath,
    [self, "resolve", "--brief", join(blankDir, "brief.md"), "--workspace", join(root, "ws-blank"), "--moves-dir", movesDir],
    { encoding: "utf8" });
  ok("a blank opens_section refuses on read-back, naming the Step",
    rBlank.status !== 0 && rBlank.stderr.includes("t1") && rBlank.stderr.includes("opens_section"),
    rBlank.stderr.trim().slice(0, 160));

  // The pre-Section-grouping corpus is the CONTROL for the fallback: a path declaring
  // nothing derives one untitled Section and renders no heading, rather than
  // refusing or rendering `## undefined`. Without this, the migration cost of
  // this issue is invisible.
  ok("a path declaring no Section derives one untitled Section and renders no heading",
    sectionsOf([{ step_id: "s1" }, { step_id: "s2" }]).length === 1 &&
    !/^## /m.test(out.split("---\n").slice(2).join("---\n")));

  // 8 — the Section grouping IN THE PACKET (kogaki#825). Block 7 asserts what the DRAFT
  // renders; this asserts what the PACKET SAYS, which is a different artifact
  // with a different reader — the model, whose entire world it is. The two are
  // driven off the SAME Brief so the derivation they share is exercised once
  // rather than twice, which is the point of sharing it.
  const packSec = (step) => spawnSync(process.execPath,
    [self, "packet", "--brief", join(secDir, "brief.md"), "--workspace", secWs, "--moves-dir", movesDir, "--step", step],
    { encoding: "utf8" });
  const pT1 = packSec("t1"), pT2 = packSec("t2"), pT3 = packSec("t3");
  const bodyT1 = pT1.stdout, bodyT2 = pT2.stdout, bodyT3 = pT3.stdout;

  ok("every Packet names its Section",
    [bodyT1, bodyT2, bodyT3].every((b) => b.includes("## The Section this Step sits in")));
  ok("an opening Step's Packet carries the title it opens",
    bodyT1.includes("OPENS a Section") && bodyT1.includes('"The first question"'),
    bodyT1.split("## The Section this Step sits in")[1]?.slice(0, 200));
  ok("a continuing Step's Packet names the heading it sits under, and says no heading is rendered here",
    bodyT2.includes("CONTINUES the Section headed") && bodyT2.includes('"The first question"') &&
    bodyT2.includes("No new heading is rendered here"),
    bodyT2.split("## The Section this Step sits in")[1]?.slice(0, 200));
  // The discrimination, without which "names its Section" is satisfied by a
  // Packet that names the same thing for every Step.
  ok("the two forms discriminate: a Step that opens is not told it continues",
    !bodyT1.includes("CONTINUES the Section headed") && !bodyT2.includes("OPENS a Section"));
  ok("the second Section's opening Step names ITS title, not the first's",
    bodyT3.includes("OPENS a Section") && bodyT3.includes('"The second question"') &&
    !bodyT3.split("## The Section this Step sits in")[1].split("##")[0].includes("The first question"));

  // Acceptance 2 — the article-so-far block is BOUNDED. The flat form was well
  // defined for an opening Step and not for a continuing one; grouping under
  // the headings the Draft renders is what supplies the boundary.
  const soFar = (b) => b.split("## The article so far")[1]?.split("## Write")[0] ?? "";
  ok("the article-so-far block groups prior prose under its Section headings",
    soFar(bodyT2).includes("### The first question"));
  ok("a continuing Step's own Section so far is marked as its own",
    soFar(bodyT2).includes("THIS STEP'S OWN SECTION, so far"), soFar(bodyT2).trim().slice(0, 200));
  // REWRITTEN (PR #844 round 1, finding 1). The first form carried an
  // `Infinity` fallback that PASSED when the second heading was absent — and it
  // was absent, because t3's Section held only t3 and an empty Section was
  // skipped. The case asserted the "and its own" half of its own name by
  // nothing, which is how the defect shipped past a green fixture. Both indices
  // are now required to exist, and the ORDER is asserted between two facts
  // rather than between a fact and a fallback.
  const iEarlier = soFar(bodyT3).indexOf("### The first question");
  const iOwn = soFar(bodyT3).indexOf("### The second question");
  ok("a later Section's Packet carries the EARLIER Section and its own, in order",
    iEarlier >= 0 && iOwn >= 0 && iEarlier < iOwn, `earlier=${iEarlier} own=${iOwn}`);
  // The block ENDS with the Step's own Section, which is the template's
  // promise and the thing the skip broke: an opening Step of a later Section
  // has no prose in it yet and must still be shown its own, marked and last.
  ok("an opening Step of a LATER Section still ends the block with its own Section, marked",
    soFar(bodyT3).lastIndexOf("THIS STEP'S OWN SECTION, so far") > iEarlier &&
    soFar(bodyT3).includes("this Step opens the Section"),
    soFar(bodyT3).trim().slice(-220));
  ok("the first Step states the absence of prior prose rather than rendering empty",
    soFar(bodyT1).includes("nothing yet"));
  // THE EMPTY CASE IS DRIVEN ON BOTH ITS BRANCHES (PR #844 round 2, nit 3),
  // through the CLI and into a FRESH workspace, because the falsity was
  // reachable exactly there: `packet --step <later id>` before the Steps above
  // it are realized. The old single string told that Step it was the article's
  // first, so a case asserting only "nothing yet" passed over it — both
  // branches are therefore asserted to DISCRIMINATE.
  {
    const freshWs = join(root, "ws-sec-unrealized");
    const packFresh = (step) => spawnSync(process.execPath,
      [self, "packet", "--brief", join(secDir, "brief.md"), "--workspace", freshWs,
       "--moves-dir", movesDir, "--step", step],
      { encoding: "utf8" });
    const first = soFar(packFresh("t1").stdout), later = soFar(packFresh("t2").stdout);
    ok("with nothing realized, the article's FIRST Step is told it is the first",
      first.includes("this is the article's first Step"), first.trim().slice(0, 160));
    ok("with nothing realized, a LATER Step is NOT told it is the article's first",
      later.includes("nothing yet") && !later.includes("this is the article's first Step") &&
      later.includes("are not realized"), later.trim().slice(0, 200));
  }
  // AN EMPTY SECTION IS NOT AN OPENED ONE (PR #847 round 1, finding 1). The
  // fixture above cannot reach this: its second Section holds ONE Step, so no
  // continuing Step in a Section with an unrealized opener is ever driven. A
  // four-Step Brief in two Sections of two is what reaches it — realize the
  // FIRST Section's opener only, then render the LAST Step's Packet: its own
  // Section is empty, and the old placeholder told it that it opens the
  // Section while `section_placement` two blocks earlier told it it continues
  // one. The Packet contradicted itself about the one thing this issue exists
  // to make it say.
  {
    const twoDir = join(root, "theses", "two-by-two");
    mkdirSync(twoDir, { recursive: true });
    writeFileSync(join(twoDir, "brief.md"), secBrief([
      ...stepBlock("u1", "open_the_claim", "Alpha"),
      ...stepBlock("u2", "close_the_claim", null),
      ...stepBlock("u3", "close_the_claim", "Beta"),
      ...stepBlock("u4", "close_the_claim", null),
    ]));
    const twoWs = join(root, "ws-two-by-two");
    const driveTwo = (cmd, ...extra) => spawnSync(process.execPath,
      [self, cmd, "--brief", join(twoDir, "brief.md"), "--workspace", twoWs, "--moves-dir", movesDir, ...extra],
      { encoding: "utf8" });
    driveTwo("resolve");
    const f1 = join(root, "prose-u1.md");
    writeFileSync(f1, "The realized prose for u1.");
    driveTwo("section", "--step", "u1", "--file", f1);
    const bU4 = driveTwo("packet", "--step", "u4").stdout || "";
    const soFarU4 = soFar(bU4);
    ok("a continuing Step whose Section has an UNREALIZED opener is not told it opens it",
      soFarU4.includes("### Beta") && !soFarU4.includes("this Step opens the Section") &&
      soFarU4.includes("You are NOT opening it"), soFarU4.trim().slice(-260));
    // THE CONTRADICTION IS ASSERTED AS A CONJUNCTION, because each half was
    // individually true while the pair was the defect: the placement block says
    // CONTINUES and the article-so-far block said opens.
    ok("the placement block and the article-so-far block agree that the Step continues",
      /This Step CONTINUES the Section headed/.test(bU4) && !soFarU4.includes("opens the Section"));
    // AN EARLIER SECTION WITH NOTHING REALIZED IS STATED RATHER THAN DROPPED,
    // and the state that reaches it is a SECOND workspace: with only u3
    // realized, Alpha holds nothing and Beta holds prose, so the old skip made
    // the block open at Beta with nothing saying a Section had been passed
    // over. The first workspace cannot show this — Alpha holds u1's prose
    // there — which is the fixture-too-small class this suite has recorded
    // before.
    {
      const gapWs = join(root, "ws-two-by-two-gap");
      const driveGap = (cmd, ...extra) => spawnSync(process.execPath,
        [self, cmd, "--brief", join(twoDir, "brief.md"), "--workspace", gapWs, "--moves-dir", movesDir, ...extra],
        { encoding: "utf8" });
      driveGap("resolve");
      const f3 = join(root, "prose-u3.md");
      writeFileSync(f3, "The realized prose for u3.");
      // The Packet is rendered first because `section` refuses a Step that has
      // none — realizing OUT OF ORDER is permitted, which is exactly what makes
      // an earlier Section with nothing realized a reachable state rather than
      // a hypothetical one.
      driveGap("packet", "--step", "u3");
      driveGap("section", "--step", "u3", "--file", f3);
      const gap = soFar(driveGap("packet", "--step", "u4").stdout || "");
      const iA = gap.indexOf("### Alpha"), iB = gap.indexOf("### Beta");
      ok("an EARLIER Section with no realized prose is stated rather than skipped",
        iA >= 0 && iB >= 0 && iA < iB && gap.includes("no Step of this Section is realized"),
        gap.trim().slice(0, 260));
    }
    const bU2 = driveTwo("packet", "--step", "u2").stdout || "";
    ok("the CONTROL: a continuing Step whose Section HAS realized prose is shown it, not a placeholder",
      soFar(bU2).includes("The realized prose for u1.") &&
      !soFar(bU2).includes("You are NOT opening it"), soFar(bU2).trim().slice(-200));
  }

  // Acceptance 3 — one word, one unit. Asserted on the RENDERED Packet, which
  // is what the model reads, and not only on the template.
  ok("no rendered block header uses Section for the per-Step unit",
    !bodyT1.includes("# Write one Section") && !bodyT1.includes("This Section's Step") &&
    !bodyT1.includes("The Move this Section performs") &&
    bodyT1.includes("# Write one Step") && bodyT1.includes("## This Step"));
  // The CONTROL: "Section" still appears, because the grouping is a real unit
  // the Packet must name. A check asserting its absence would be asserting the
  // rename went too far.
  ok("Section survives in the rendered Packet as the GROUPING, not as the Step",
    bodyT1.includes("A Section is a grouping of Steps"));

  // the runtime-read template's standing prohibition, re-asserted because this issue rewrote the
  // template: the template and the rendered Packet both point at no spec.
  ok("neither the rewritten template nor the rendered Packet points at a spec",
    !/§\d/.test(readFileSync(join(dirname(self), "packet-template.md"), "utf8")) && !/§\d/.test(bodyT1));

  // The pre-Section-grouping CONTROL: a Brief declaring no Section renders the stated
  // absence rather than a blank or an invented title, and its article-so-far
  // block falls back to the flat form it always had.
  // REPLACED (PR #844 round 1, finding 3). The case it replaces asserted
  // `sectionPlacement(undefined)` — an input no Packet render can produce — and
  // so controlled a path the pre-Section-grouping corpus never takes. The corpus takes the
  // UNTITLED path, so that is what is controlled, and it is asserted to say
  // WHICH of opens/continues, because the block above it promises exactly that.
  ok("the untitled form an undeclared path actually gets says whether the Step opens or continues",
    sectionPlacement({ index: 1, title: undefined, opens: true, step_ids: ["s1", "s2"] }).includes("OPENS") &&
    sectionPlacement({ index: 1, title: undefined, opens: false, step_ids: ["s1", "s2"] }).includes("CONTINUES"));
  ok("the untitled form states that no title is declared rather than rendering a blank one",
    sectionPlacement({ index: 1, title: undefined, opens: true, step_ids: ["s1"] }).includes("declares no Section titles"));
  // THE ORDINAL IS GONE AND STAYS GONE (PR #847 round 1, nit 2). `sectionsOf`
  // can only produce an untitled Section at index 1, so any ordinal on this
  // branch is dead code that renders "2th" if it ever runs. Asserted rather
  // than left to the comment, because a dead arm is exactly what nothing
  // notices being reintroduced.
  ok("the untitled form carries no ordinal, the arm that built one being unreachable",
    !/\d(?:st|nd|rd|th)\b/.test(sectionPlacement({ index: 1, title: undefined, opens: true, step_ids: ["s1"] })) &&
    !/\d(?:st|nd|rd|th)\b/.test(sectionPlacement({ index: 1, title: undefined, opens: false, step_ids: ["s1"] })));
  // AND THE PREMISE IT RESTS ON, asserted rather than assumed: an untitled
  // Section is always the article's only one, so "the article's one Section"
  // is true wherever this branch is reached.
  ok("sectionsOf never produces an untitled Section past index 1",
    sectionsOf([{ step_id: "s1" }, { step_id: "s2" }, { step_id: "s3" }])
      .filter((x) => x.title === undefined).every((x) => x.index === 1));
  // The rendered Packet for a path declaring nothing takes that same branch —
  // asserted through the CLI, so the two cases above are about a form the
  // corpus really receives rather than about a pure function in isolation.
  const undeclared = spawnSync(process.execPath,
    [self, "packet", "--brief", join(briefDir, "brief.md"), "--workspace", ws, "--moves-dir", movesDir, "--step", "s1"],
    { encoding: "utf8" });
  ok("an undeclared path's RENDERED Packet takes the untitled form",
    undeclared.stdout.includes("declares no Section titles"),
    undeclared.stdout.split("## The Section this Step sits in")[1]?.slice(0, 160));

  // -------------------------------------------------------------------------
  // the figure record — THE FIGURE RECORD AT REALIZATION (kogaki#878). Driven end to end
  // through the real entry points, not against the functions: the ordering
  // this issue is about — prose, then figure, then the next Packet — is the
  // Harness's, and a case calling the validator directly would assert the
  // shape of a record while leaving the ordering unexercised.
  {
    // A fixture Move CARRYING A FORM. The repository's own `moves/` is not
    // read here for the reason the fixture library above states: a self-test
    // bound to the real store goes red on a library edit it has nothing to do
    // with, and would force the fixture to adopt a real Move id it does not
    // mean.
    writeFileSync(join(movesDir, "place_on_the_axis.md"), [
      "id: place_on_the_axis", "status: observed",
      "intent: >-", "  what place_on_the_axis does to the reader.",
      "requires: >-", "  the state this move depends on.",
      "effect: >-", "  the state this move produces.",
      "constraints: >-", "  what a correct performance must not do.",
      "failure_modes: >-", "  how it goes wrong when imitated badly.",
      "excerpt: >-", "  the author's account of the movement they observed.",
      "visual_form:",
      "  kind: axis",
      "  endpoint_a: the state the reader starts in",
      "  endpoint_b: the state the reader ends in",
      "  criterion: what the two are being compared on",
    ].join("\n") + "\n");

    const figDir = join(root, "theses", "figure-brief");
    mkdirSync(figDir, { recursive: true });
    const G = [
      "ground (strand L1): the material states the reader starts unconvinced.",
      "ground (strand L1): the material states the reader ends convinced.",
      "ground (strand L1): the material states conviction is the criterion.",
    ];
    const figBrief = (steps) => [
      "# Brief — figure-brief", "",
      "*Survey pin:* `product-lab@0000000000000000000000000000000000000000`", "",
      "## Strands", "", "### L1 — first-strand", "",
      "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
      "## Thesis", "", "The fixture claim.", "",
      "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
      "## Reader target", "", "The reader can say why the fixture claim is not obvious.", "",
      "## Opening question", "", "What makes the fixture claim worth stating?", "",
      "## Sequence", "", ...steps,
    ].join("\n");
    const a1Block = (extra) => [
      "```step", "step_id: a1", "move: place_on_the_axis",
      "purpose: purpose of a1",
      "reader_state_before: before a1.", "reader_state_after: after a1.",
      "materials: L1", "rationale: rationale for a1.",
      ...G, ...extra, "```", "",
    ];
    writeFileSync(join(figDir, "brief.md"), figBrief(a1Block([
      "figure: what the prose leaves the reader unable to hold in one view.",
      "figure_roles: endpoint_a=g1, endpoint_b=g2, criterion=g3",
    ])));
    const figWs = join(root, "ws-figure");
    const driveFig = (cmd, ...extra) => spawnSync(process.execPath,
      [self, cmd, "--brief", join(figDir, "brief.md"), "--workspace", figWs, "--moves-dir", movesDir, ...extra],
      { encoding: "utf8" });

    // The round trip the figure decision's writer opens and this issue closes: a Brief that
    // DECLARES a figure is read back as one. Asserted at the entry point,
    // because the failure it replaces was silent — the field parsed nowhere and
    // every check stayed green.
    const figParsed = parseBrief(readFileSync(join(figDir, "brief.md"), "utf8"), "f.md");
    ok("the Brief's figure: and figure_roles are read back off the step block",
      figParsed.refusals.length === 0 && figParsed.steps[0].figure.startsWith("what the prose leaves") &&
      figParsed.steps[0].figure_roles.endpoint_a === "g1" &&
      figParsed.steps[0].figure_roles.criterion === "g3",
      JSON.stringify(figParsed.refusals).slice(0, 200));
    // The half-declaration, through the SHARED grammar rather than a second
    // expression of it: bindings with no `figure:` line record a form nobody
    // said carries anything.
    const halfBrief = parseBrief(figBrief(a1Block(["figure_roles: endpoint_a=g1"])), "h.md");
    ok("a Brief binding roles with no figure: line refuses naming the Step",
      halfBrief.refusals.some((r) => r.includes("step a1") && r.includes("figure_roles are declared with no figure:")),
      JSON.stringify(halfBrief.refusals).slice(0, 200));

    driveFig("resolve");
    const proseA1 = join(root, "prose-a1.md");
    writeFileSync(proseA1, "The realized prose for a1, which the figure is designed from.");
    const secA1 = driveFig("section", "--step", "a1", "--file", proseA1);
    const figInput = secA1.stdout || "";
    // ACCEPTANCE 1 — the figure input carries the three bound grounds VERBATIM
    // and this Step's own prose. Asserted on the printed input, which is what
    // the model reads, and not on the template.
    ok("acceptance 1: section prints the figure input carrying every bound ground verbatim",
      G.every((g) => figInput.includes(g)) && figInput.includes("The realized prose for a1, which the figure is designed from."),
      figInput.slice(-400));
    ok("acceptance 1: the figure input names the form's kind and its roles, and the Brief's reason",
      figInput.includes("**kind.** axis") && figInput.includes("**endpoint_a**") &&
      figInput.includes("what the two are being compared on") &&
      figInput.includes("what the prose leaves the reader unable to hold in one view."),
      figInput.slice(-400));
    // AND THE NEXT PACKET DOES NOT FOLLOW IT. Two inputs printed at once would
    // leave the realizer choosing which to answer, which is the ordering defect
    // the Harness owns rather than the session.
    ok("a figure-carrying Step's section names the figure record as the next act",
      figInput.includes("figure --step a1 --file"), figInput.slice(-200));

    // ACCEPTANCE 3, FIRST HALF — emit refuses BY STEP while the record is owed.
    const emitOwed = driveFig("emit");
    ok("acceptance 3: emit before the figure record refuses naming the Step",
      emitOwed.status !== 0 && (emitOwed.stderr || "").includes("a1") &&
      (emitOwed.stderr || "").includes("declare figure: and have no recorded figure record"),
      (emitOwed.stderr || "").slice(0, 240));
    ok("acceptance 3: no CanonicalDraft is written while a figure record is owed",
      !existsSync(join(figDir, "draft.md")));

    // ACCEPTANCE 2 — a record that MOVES a role to another ground is refused by
    // role. The binding is the Brief's decision, and a swapped ground words the
    // element from material the composer did not put under that position.
    const recordOf = (over) => ({
      kind: "axis",
      elements: {
        endpoint_a: { text: "the reader, unconvinced", ground: "g1" },
        endpoint_b: { text: "the reader, convinced", ground: "g2" },
        criterion: { text: "conviction", ground: "g3" },
      },
      relations: ["the two endpoints sit on conviction"],
      caption: "what the reader holds after looking.",
      position: "after",
      ...over,
    });
    const writeRec = (name, rec) => { const f = join(root, name); writeFileSync(f, JSON.stringify(rec, null, 2)); return f; };
    const swapped = writeRec("fig-swapped.json", recordOf({
      elements: { ...recordOf({}).elements, endpoint_a: { text: "the reader, unconvinced", ground: "g2" } },
    }));
    const rSwap = driveFig("figure", "--step", "a1", "--file", swapped);
    ok("acceptance 2: a record binding endpoint_a to g2 where the Brief bound g1 refuses naming the role",
      rSwap.status !== 0 && (rSwap.stderr || "").includes('"endpoint_a"') &&
      (rSwap.stderr || "").includes("g2") && (rSwap.stderr || "").includes("g1"),
      (rSwap.stderr || "").slice(0, 260));
    // The CONTROL on that case: the refusal is about the BINDING and not about
    // records in general — the same record with the Brief's own address is
    // accepted. Without it the case above passes on a validator that refuses
    // everything.
    const missingRole = writeRec("fig-missing.json", (() => {
      const r = recordOf({}); delete r.elements.criterion; return r;
    })());
    const rMissing = driveFig("figure", "--step", "a1", "--file", missingRole);
    ok("a record leaving a role of the form unfilled refuses naming the role",
      rMissing.status !== 0 && (rMissing.stderr || "").includes('"criterion"'),
      (rMissing.stderr || "").slice(0, 240));
    const badPos = writeRec("fig-pos.json", recordOf({ position: "beside" }));
    const rPos = driveFig("figure", "--step", "a1", "--file", badPos);
    ok("a position outside the closed pair refuses naming both the value and the pair",
      rPos.status !== 0 && (rPos.stderr || "").includes("beside") &&
      (rPos.stderr || "").includes("before") && (rPos.stderr || "").includes("after"),
      (rPos.stderr || "").slice(0, 240));

    const good = writeRec("fig-good.json", recordOf({}));
    const rGood = driveFig("figure", "--step", "a1", "--file", good);
    ok("a well-formed record is accepted, naming its kind and position",
      rGood.status === 0 && (rGood.stdout || "").includes("figure a1 recorded (axis, position after)"),
      (rGood.stdout || "").slice(0, 200) + (rGood.stderr || "").slice(0, 200));
    const figHome = join(figWs, "figure-brief");
    const storedPath = join(figHome, "figures", "a1.json");
    ok("the record is stored under the run workspace and recorded in run.json with its sha",
      existsSync(storedPath) &&
      (() => {
        const rec = JSON.parse(readFileSync(join(figHome, "run.json"), "utf8")).figures || {};
        return rec.a1 && rec.a1.sha256 === sha256(readFileSync(storedPath, "utf8")) && rec.a1.kind === "axis";
      })());
    // STORED IN THE SCHEMA'S ORDER, not the input file's: a record whose bytes
    // depend on how the model ordered its keys has a sha that moves without its
    // content moving, and kogaki#879 pins that sha in the trace.
    ok("the stored record is serialized in the schema's field order, whatever the input's",
      Object.keys(JSON.parse(readFileSync(storedPath, "utf8"))).join(",") === "kind,elements,relations,caption,position",
      Object.keys(JSON.parse(readFileSync(storedPath, "utf8"))).join(","));

    // ACCEPTANCE 3, SECOND HALF — after the record, emit produces the artifact.
    const emitNow = driveFig("emit");
    ok("acceptance 3: emit succeeds once the figure record is recorded",
      emitNow.status === 0 && existsSync(join(figDir, "draft.md")),
      (emitNow.stderr || "").slice(0, 240));

    // The record is filled FROM the text, so it is unreachable before it.
    const fresh = join(root, "ws-figure-fresh");
    const early = spawnSync(process.execPath,
      [self, "figure", "--brief", join(figDir, "brief.md"), "--workspace", fresh,
       "--moves-dir", movesDir, "--step", "a1", "--file", good], { encoding: "utf8" });
    ok("a figure record filled before the Step's prose is refused, naming the prose as what is owed first",
      early.status !== 0 && (early.stderr || "").includes("has no realized prose") &&
      (early.stderr || "").includes("section --step a1"),
      (early.stderr || "").slice(0, 240));
    // And a Step that declared none has no record to fill: the default is NONE,
    // and `figure` on such a Step is a category error rather than a missing file.
    const noFig = spawnSync(process.execPath,
      [self, "figure", "--brief", join(briefDir, "brief.md"), "--workspace", ws,
       "--moves-dir", movesDir, "--step", "s1", "--file", good], { encoding: "utf8" });
    ok("figure on a Step that declares none refuses by that fact rather than by a missing file",
      noFig.status !== 0 && (noFig.stderr || "").includes("declares no figure:"),
      (noFig.stderr || "").slice(0, 200));

    // ACCEPTANCE 4's CONTROL — a Brief without `figure:` is untouched. Asserted
    // on the Packet's BYTES, because the figure block lives in the same
    // template file: a split that leaked would put it in every Packet.
    const plainPacket = readFileSync(join(ws, "fixture-brief", "packets", "s1.md"), "utf8");
    ok("acceptance 4: a Packet for a Step with no figure carries no figure block and no unfilled slot",
      !plainPacket.includes("The figure this Step carries") && !/\{\{\w+\}\}/.test(plainPacket) &&
      !plainPacket.includes("FIGURE-INPUT"),
      plainPacket.slice(-200));

    // -----------------------------------------------------------------------
    // the renderer and the anchor — THE RENDERER AND THE ANCHOR (kogaki#879). The cases above stop at
    // the RECORD; these carry it the rest of the way, to the markup a reader
    // meets and the trace entry that pins it.

    // ACCEPTANCE 1, FIRST HALF — SAME RECORD, SAME BYTES. Asserted on two
    // renders of one object rather than on a stored string, because the defect
    // it forecloses is an ordering that follows the record's own key order:
    // a `JSON.parse` of the same file can hand back keys in a different order,
    // and a golden string would agree with itself while the pin moved.
    const detRec = recordOf({ emphasis: "endpoint_b" });
    const detA = renderFigure(detRec), detB = renderFigure(JSON.parse(JSON.stringify(detRec)));
    ok("acceptance 1: rendering the same record twice yields identical bytes",
      !detA.error && !detB.error && detA.markup === detB.markup, detA.error || "");
    // And the key ORDER of `elements` does not reach the output: the kind's
    // declared `roles` order is what the renderer walks. Without this the case
    // above passes on a renderer that happens to be handed one order twice.
    const reordered = JSON.parse(JSON.stringify(detRec));
    reordered.elements = { criterion: reordered.elements.criterion, endpoint_b: reordered.elements.endpoint_b, endpoint_a: reordered.elements.endpoint_a };
    ok("acceptance 1: the record's own key order does not reach the rendered bytes",
      renderFigure(reordered).markup === detA.markup);

    // ACCEPTANCE 1, SECOND HALF — A FIXTURE RECORD PER KIND RENDERS, AND THE
    // MERMAID PARSES. Every member of the closed set, read from
    // src/figure-kinds.json rather than listed here: a kind admitted to that
    // file with no seat in the renderer must fail this case, and a hardcoded
    // list is exactly what would let it pass.
    const allKinds = figureKinds().kinds || {};
    const kindNames = Object.keys(allKinds).sort();
    ok("the closed kind set is non-empty, so the per-kind loop below asserts something",
      kindNames.length >= 5, kindNames.join(","));
    let kindsRendered = 0, kindsParsed = 0;
    const kindFailures = [];
    for (const k of kindNames) {
      const els = {};
      allKinds[k].roles.forEach((role, i) => { els[role] = { text: `text for ${role}`, ground: `g${i + 1}` }; });
      const r = renderFigure({ kind: k, elements: els, relations: [`the ${k} relation`], caption: `caption for ${k}`, position: "after" });
      if (r.error) { kindFailures.push(`${k}: ${r.error}`); continue; }
      kindsRendered++;
      const fenced = r.markup.startsWith("```" + MERMAID_FENCE + "\n");
      if (!fenced) { kindsParsed++; continue; }  // a table kind: nothing to parse
      const src = r.markup.slice(("```" + MERMAID_FENCE + "\n").length, r.markup.indexOf("\n```"));
      const bad = checkMermaid(src);
      if (bad) kindFailures.push(`${k}: ${bad}`); else kindsParsed++;
    }
    ok("acceptance 1: a fixture record for every kind in the closed set renders",
      kindsRendered === kindNames.length, kindFailures.join(" | "));
    ok("acceptance 1: every rendered Mermaid block passes the minimal grammar check",
      kindsParsed === kindNames.length, kindFailures.join(" | "));
    // THE GRAMMAR CHECK IS NOT VACUOUS. Without this the case above is green on
    // a `checkMermaid` that returns null for everything — the fixture-passes-on-
    // a-disabled-instrument class this suite's own efficacy notes record.
    ok("the grammar check rejects a block with no diagram header, by name",
      /first line/.test(checkMermaid('  n_a["x"]') || ""), String(checkMermaid('  n_a["x"]')));
    ok("the grammar check rejects an unbalanced node shape, by name",
      /unbalanced|against/.test(checkMermaid('flowchart LR\n  n_a["x"') || ""), String(checkMermaid('flowchart LR\n  n_a["x"')));
    ok("the grammar check rejects a header with no statement under it",
      /empty diagram|no statement/.test(checkMermaid("flowchart LR") || ""), String(checkMermaid("flowchart LR")));
    // A kind outside the closed set is refused by name rather than rendered as
    // an empty block — the seat rule the renderer and the anchor states.
    ok("a record naming a kind outside the closed set is refused by name",
      /not in the closed set/.test(renderFigure({ kind: "spiral", elements: {}, relations: ["x"], caption: "c", position: "after" }).error || ""));
    // EVERY RELATION REACHES THE OUTPUT. `axis` has two edges; a record with
    // three relations must render all three, because a renderer that dropped
    // one would drop the owner's design with no report.
    const threeRel = renderFigure(recordOf({ relations: ["rel one", "rel two", "rel three"] }));
    ok("a relation beyond the shape's edge count is joined rather than dropped",
      ["rel one", "rel two", "rel three"].every((x) => threeRel.markup.includes(x)), threeRel.markup);

    // ACCEPTANCE 2 — THE ANCHOR. A two-Step Brief whose first Step opens a
    // Section and carries a figure at `position: after`: the block lands after
    // a1's prose and before a2's, under Section 1's heading.
    const anchDir = join(root, "theses", "anchor-brief");
    mkdirSync(anchDir, { recursive: true });
    const anchStep = (id, extra) => [
      "```step", `step_id: ${id}`, "move: place_on_the_axis",
      `purpose: purpose of ${id}`,
      `reader_state_before: before ${id}.`, `reader_state_after: after ${id}.`,
      "materials: L1", `rationale: rationale for ${id}.`,
      ...G, ...extra, "```", "",
    ];
    // NO `pos` PARAMETER (PR #939 round 1, finding 4). The first form took one
    // and never read it, so the two call sites read as if the fixture BRIEF
    // differed between the acceptance-2 case and its `before` control when only
    // the RECORD does — a fixture whose shape a later reader would trust
    // wrongly. The Brief is one Brief; `position` lives in the record.
    const anchBrief = () => figBrief([
      ...anchStep("a1", ["opens_section: Section one",
        "figure: what the prose leaves the reader unable to hold in one view.",
        "figure_roles: endpoint_a=g1, endpoint_b=g2, criterion=g3"]),
      ...anchStep("a2", []),
    ]).replace("# Brief — figure-brief", "# Brief — anchor-brief");
    writeFileSync(join(anchDir, "brief.md"), anchBrief());
    const anchWs = join(root, "ws-anchor");
    const driveAnch = (cmd, ...extra) => spawnSync(process.execPath,
      [self, cmd, "--brief", join(anchDir, "brief.md"), "--workspace", anchWs, "--moves-dir", movesDir, ...extra],
      { encoding: "utf8" });
    const proseA2 = join(root, "prose-a2.md");
    writeFileSync(proseA1, "PROSE-A1 the realized prose for a1.");
    writeFileSync(proseA2, "PROSE-A2 the realized prose for a2.");
    driveAnch("resolve");
    driveAnch("section", "--step", "a1", "--file", proseA1);
    const anchRec = writeRec("anchor-good.json", recordOf({ caption: "CAPTION-LINE what the reader holds." }));
    driveAnch("figure", "--step", "a1", "--file", anchRec);
    driveAnch("section", "--step", "a2", "--file", proseA2);
    const anchEmit = driveAnch("emit");
    const anchDraft = existsSync(join(anchDir, "draft.md")) ? readFileSync(join(anchDir, "draft.md"), "utf8") : "";
    ok("acceptance 2: a two-Step Brief with a figure emits its CanonicalDraft",
      anchEmit.status === 0 && anchDraft !== "", (anchEmit.stderr || "").slice(0, 300));
    const iHead = anchDraft.indexOf("## Section one");
    const iA1 = anchDraft.indexOf("PROSE-A1");
    const iFence = anchDraft.indexOf("```" + MERMAID_FENCE);
    const iCap = anchDraft.indexOf("CAPTION-LINE");
    const iA2 = anchDraft.indexOf("PROSE-A2");
    ok("acceptance 2: the block sits after a1's prose and before a2's, under Section 1's heading",
      iHead >= 0 && iA1 > iHead && iFence > iA1 && iCap > iFence && iA2 > iCap,
      JSON.stringify({ iHead, iA1, iFence, iCap, iA2 }));
    // THE CAPTION IS THE LINE AFTER THE BLOCK, asserted on adjacency rather
    // than on order alone: order is satisfied by a caption anywhere later.
    const bodyLines = anchDraft.split("\n");
    const fenceEnd = bodyLines.findIndex((l, i) => l === "```" && i > bodyLines.findIndex((x) => x.startsWith("```" + MERMAID_FENCE)));
    ok("acceptance 2: the caption renders as the line after the block",
      bodyLines[fenceEnd + 1] === "" && bodyLines[fenceEnd + 2].includes("CAPTION-LINE"),
      JSON.stringify(bodyLines.slice(fenceEnd, fenceEnd + 3)));
    // THE TRACE ENTRY. A resolving record path, a matching sha, and a position.
    const anchTrace = (anchDraft.match(/^ {2}- (\{"step_id".*)$/gm) || []).map((l) => JSON.parse(l.replace(/^ {2}- /, "")));
    const t1 = anchTrace.find((t) => t.step_id === "a1");
    const recAbs = t1 && t1.figure ? join(anchDir, t1.figure.record) : null;
    ok("acceptance 2: a1's trace entry carries figure with a resolving record path and a matching sha",
      !!(t1 && t1.figure && t1.figure.position === "after" && recAbs && existsSync(recAbs) &&
         t1.figure.record_sha === sha256(readFileSync(recAbs, "utf8"))),
      JSON.stringify(t1 && t1.figure));
    // THE STEP'S `lines` SPAN THE PROSE ALONE, and the figure's own span is
    // `figure.lines` (kogaki#868, the renderer and the anchor). Asserted on the FILE's lines, which
    // is the surface kogaki#870's blind recovery quotes from.
    const fileLines = anchDraft.split("\n");
    const proseSpan = fileLines.slice(t1.lines[0] - 1, t1.lines[1]).join("\n");
    const figSpan = fileLines.slice(t1.figure.lines[0] - 1, t1.figure.lines[1]).join("\n");
    ok("acceptance 2: the Step's lines span the prose and not the figure",
      proseSpan.includes("PROSE-A1") && !proseSpan.includes("```" + MERMAID_FENCE), JSON.stringify(proseSpan));
    ok("acceptance 2: figure.lines span the block and its caption, and no prose",
      figSpan.includes("```" + MERMAID_FENCE) && figSpan.includes("CAPTION-LINE") && !figSpan.includes("PROSE-A1"),
      JSON.stringify(figSpan));
    // a2 declares no figure, so its entry carries no `figure` key at all — an
    // absent field rather than a null one, the shape every other optional
    // trace field already uses.
    ok("a Step declaring no figure carries no figure key in its trace entry",
      !("figure" in (anchTrace.find((t) => t.step_id === "a2") || {})));
    // NO STEP STRUCTURE BECAME VISIBLE. The block is a rendered element, so the
    // body must still carry no step id and no key line — the three-layer-boundary guard the
    // figure could have quietly broken by writing an id into the markup.
    ok("the figure block renders no visible trace structure in the body",
      findTraceStructure(anchDraft.slice(anchDraft.indexOf("## Section one")), ["a1", "a2"]).length === 0);

    // POSITION `before` puts the block between the heading and the prose. The
    // control on the case above: without it, a renderer that ignored `position`
    // and always appended would pass.
    const beforeDir = join(root, "theses", "before-brief");
    mkdirSync(beforeDir, { recursive: true });
    writeFileSync(join(beforeDir, "brief.md"), anchBrief().replace("# Brief — anchor-brief", "# Brief — before-brief"));
    const beforeWs = join(root, "ws-before");
    const driveBefore = (cmd, ...extra) => spawnSync(process.execPath,
      [self, cmd, "--brief", join(beforeDir, "brief.md"), "--workspace", beforeWs, "--moves-dir", movesDir, ...extra],
      { encoding: "utf8" });
    driveBefore("resolve");
    driveBefore("section", "--step", "a1", "--file", proseA1);
    driveBefore("figure", "--step", "a1", "--file",
      writeRec("before-good.json", recordOf({ position: "before", caption: "CAPTION-LINE what the reader holds." })));
    driveBefore("section", "--step", "a2", "--file", proseA2);
    driveBefore("emit");
    const beforeDraft = readFileSync(join(beforeDir, "draft.md"), "utf8");
    ok("a figure at position before sits between the Section heading and the Step's prose",
      beforeDraft.indexOf("## Section one") < beforeDraft.indexOf("```" + MERMAID_FENCE) &&
      beforeDraft.indexOf("```" + MERMAID_FENCE) < beforeDraft.indexOf("PROSE-A1"),
      beforeDraft.slice(beforeDraft.indexOf("## Section one"), beforeDraft.indexOf("PROSE-A1") + 20));

    // ACCEPTANCE 3 — PROSE THAT DRAWS ITS OWN FIGURE IS REFUSED, NAMING THE
    // STEP. Refused on a Step that declares NO figure, which is the harder half:
    // the seat is closed to prose whether or not the Brief opened one.
    const drawn = join(root, "prose-drawn.md");
    writeFileSync(drawn, "Prose for a2.\n\n```" + MERMAID_FENCE + "\nflowchart LR\n  a --- b\n```\n");
    const rDrawn = driveAnch("section", "--step", "a2", "--file", drawn);
    ok("acceptance 3: a section file containing a mermaid fence is refused naming the Step",
      rDrawn.status !== 0 && (rDrawn.stderr || "").includes("a2") &&
      (rDrawn.stderr || "").includes("draws its own figure"),
      (rDrawn.stderr || "").slice(0, 300));
    // THE CONTROL — an ordinary code fence is untouched. Without it the case
    // above passes on a guard that refuses every fenced block, which would
    // refuse prose the article may legitimately need.
    const plainFence = join(root, "prose-plain-fence.md");
    writeFileSync(plainFence, "Prose for a2.\n\n```js\nconst x = 1;\n```\n");
    const rPlain = driveAnch("section", "--step", "a2", "--file", plainFence);
    ok("an ordinary code fence in realized prose is not refused",
      rPlain.status === 0, (rPlain.stderr || "").slice(0, 240));
    // PR #939 ROUND 1, FINDING 3 — an outer fence makes the inner one a
    // QUOTATION. Prose about this pipeline is the case that produced the
    // finding, and it is the fixture here rather than a synthetic one.
    const quoted = join(root, "prose-quoted-fence.md");
    writeFileSync(quoted, "Prose for a2 about the renderer.\n\n````markdown\n```" + MERMAID_FENCE + "\nflowchart LR\n  a --- b\n```\n````\n");
    const rQuoted = driveAnch("section", "--step", "a2", "--file", quoted);
    ok("a mermaid fence QUOTED inside an outer four-backtick fence is not refused",
      rQuoted.status === 0, (rQuoted.stderr || "").slice(0, 300));

    // PR #939 ROUND 1, FINDING 1 — a bracket or paren in an element's own
    // wording is TEXT, not node syntax. The record validates, so the failure it
    // used to produce arrived at `emit`, the last act, with a message denying
    // that the record was where to look.
    // THE WORDING IS DELIBERATELY UNBALANCED — `(amortised` with no closing
    // paren — and that is the whole case. A BALANCED aside renders whether or
    // not the fix is present, so a case using one would pass on the defect: the
    // first form of this case did exactly that, and it is recorded here rather
    // than quietly corrected.
    const bracketed = renderFigure(recordOf({
      elements: { ...recordOf({}).elements, criterion: { text: "cost per unit (amortised", ground: "g3" } },
    }));
    ok("an UNBALANCED bracket inside an element's wording renders rather than failing the balance check",
      !bracketed.error && bracketed.markup.includes("cost per unit (amortised"),
      bracketed.error || "");
    // THE CONTROL, which is what stops that fix disabling the check: an
    // unbalanced shape OUTSIDE a quoted label still fails, and says so.
    ok("an unbalanced node shape outside the label still fails, naming it as syntax rather than wording",
      /outside its quoted label/.test(checkMermaid('flowchart LR\n  n_a["safe (text)"]([') || ""),
      String(checkMermaid('flowchart LR\n  n_a["safe (text)"]([')));

    // A RECORDED FIGURE THAT WILL NOT RENDER STOPS THE ARTIFACT. Constructed by
    // corrupting the stored record after validation — the only way to reach the
    // state, since `figure` refuses everything else, and exactly the state an
    // out-of-Harness edit produces.
    const anchHome = join(anchWs, "anchor-brief");
    const anchStored = join(anchHome, "figures", "a1.json");
    const goodBytes = readFileSync(anchStored, "utf8");
    writeFileSync(anchStored, "{ not json");
    const rBroken = driveAnch("emit");
    ok("emit refuses when a recorded figure record no longer renders, naming the Step",
      rBroken.status !== 0 && (rBroken.stderr || "").includes("a1") &&
      (rBroken.stderr || "").includes("do not render"),
      (rBroken.stderr || "").slice(0, 300));
    writeFileSync(anchStored, goodBytes);

    // ACCEPTANCE 4 — A BRIEF WITHOUT FIGURES EMITS BYTE-IDENTICAL OUTPUT.
    // Asserted as a re-emission over the no-figure fixture: the body bytes and
    // every trace entry are unchanged, and no entry gained a `figure` key. That
    // is the checkable form of "identical to today" — a golden string would
    // pin this issue's own output rather than the one it must not have moved.
    const plainBefore = readFileSync(join(briefDir, "draft.md"), "utf8");
    spawnSync(process.execPath, [self, "emit", "--brief", join(briefDir, "brief.md"),
      "--workspace", ws, "--moves-dir", movesDir], { encoding: "utf8" });
    const plainAfter = readFileSync(join(briefDir, "draft.md"), "utf8");
    ok("acceptance 4: a Brief with no figure re-emits byte-identical output",
      plainBefore === plainAfter, `${plainBefore.length} vs ${plainAfter.length}`);
    ok("acceptance 4: no trace entry of a figureless Brief carries a figure key, and its body carries no fence",
      !/"figure"/.test(plainAfter) && !plainAfter.includes("```" + MERMAID_FENCE),
      plainAfter.slice(0, 200));
  }

  rmSync(root, { recursive: true, force: true });
  process.stdout.write(`draft self-test: ${passed} case(s) pass${failures.length ? `, FAILURES: ${failures.join(" | ")}` : ""}\n`);
  if (failures.length) process.exit(1);
}

// THIS FILE IS BOTH A COMMAND AND A LIBRARY, AND THE GUARD IS WHAT MAKES THE
// SECOND POSSIBLE (kogaki#1014). `parseStepBlock` is the Brief's own reader for
// a `step` block and ReviewDraft's Reverse Outline is one — "parsed by the same
// function that parses a Brief Step" is the acceptance, so this module has to be
// importable. Without the guard the dispatch below ran at import, read the
// IMPORTER's argv, matched no subcommand and exited 1: `review-draft open`
// died on draft.mjs's usage line before writing anything.
//
// The check is the module's own URL against the process entry point, so
// `node src/draft.mjs …` still runs the CLI and every import is silent.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (args["self-test"]) {
    await runSelfTest();
  } else {
    switch (args._cmd) {
      case "resolve": cmdResolve(args); break;
      case "material": cmdMaterial(args); break;
      case "packet": cmdPacket(args); break;
      case "section": cmdSection(args); break;
      case "figure": cmdFigure(args); break;
      case "emit": cmdEmit(args); break;
      default: fail("usage: draft.mjs resolve|material|packet|section|figure|emit --brief <path> [--workspace <dir>] [--moves-dir <dir>] [--strand <L-id>] [--step <id> [--file <f>]] | --self-test");
    }
  }
}
