#!/usr/bin/env node
// draft — the /draft runtime and the CanonicalDraft it writes
// (SPEC-draft-command v1, kogaki#573; story 1.80, kogaki#587).
//
// THE THREE-LAYER BOUNDARY IS THE FILE'S OWN STRUCTURE (§5). This module is
// the HARNESS and the SCHEMA half: it resolves the adopted Brief and refuses
// a template, establishes the closed reference set, iterates the Reader
// Path's Steps in their recorded order, keeps per-block snapshots
// machine-local, and writes the CanonicalDraft with its record half. The LLM
// layer — the prose realizing each Step's reader_state_before →
// reader_state_after transition — arrives through `section` and is judged
// nowhere here: when a Draft comes out strange the first suspect is the Step
// it realized or the judgment realizing it (§6), and neither is reachable by
// this harness.
//
// Five commands, one per harness act:
//   resolve  — parse the Brief; refuse a template BY FIELD NAME (a template
//              is not an input); print the plan (closed Strand set, Steps in
//              order); write the machine-local run record.
//   material — hand back the Brief's own material for one settled Strand.
//              A Strand outside the closed set refuses BY NAME, the same
//              shape `fillBrief` refuses a foreign L-id with: the set closed
//              at mint, and growing it routes back through Terrain (§4).
//   section  — accept one Step's realized prose. Refusals: an unknown
//              step_id names both sides; prose naming a Strand outside the
//              closed set refuses by name. Snapshots the assembled state
//              into the run workspace — no per-block commit and no tracked
//              diff artifact (the kogaki#523 constraint, §5).
//   packet   — render the Section Packet: the model's ENTIRE input for one
//              Step (§4.14, kogaki#749), deterministic and stored as served.
//   emit     — assemble the CanonicalDraft: body = the sections in the
//              Reader Path's recorded order, prose only; frontmatter = the
//              record half (§5). Repo-visible under a fixed human name
//              derived from the Brief — theses/<slug>/draft.md — one per
//              Brief, overwritten on re-run, `generated_by` immutable across
//              overwrites. Machine identity stays in the run workspace.
//
// THE COMPLETION CONTRACT LIVES IN THE FLOW, NOT HERE (§3): a run ends when
// the CanonicalDraft exists, and the only legitimate earlier stop is a NAMED
// inspection-need. This runtime's half of it is mechanical: `emit` refuses
// while any Step lacks its section, so a flow cannot end "done" short of the
// artifact without the refusal saying exactly which Steps are owed.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join, resolve, relative, dirname, basename, sep } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
// §4.12's mechanical half is ONE function shared with the composition side
// (src/compose.mjs), never a second copy here: two resolvers are two things
// that can disagree about what a dangling move id is, and the refusal a
// composer sees would stop matching the one a realizer sees.
import { resolveMoveIds, introducesRefusal, readerKnowledgeLedger, opensSectionRefusal } from "./compose.mjs";
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

// The typed unfilled slot brief.mjs mints (§5.3). Its literal presence is
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
    const body = m[1];
    const idM = body.match(/^step_id:\s*(\S+)\s*$/m);
    if (!idM) { refusals.push(`the Brief at ${path} carries a step block with no step_id`); continue; }
    // `move:` IS READ (§4.12, kogaki#747). It was parsed for `step_id` only
    // and the Move binding sat here as uninterpreted dead input, so a typo'd
    // or renamed id rode a minted Brief in silence until the Section Packet
    // assembler joined Step.move → moves/<id>.md and failed mid-draft. Read
    // here, refused at `resolve` below — at the entry to realization rather
    // than partway through it.
    const moveM = body.match(/^move:\s*(\S+)\s*$/m);
    // §4.13's `introduces:` (kogaki#751), read back from the serialized form.
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
      if (bad) { refusals.push(bad); continue; }
    }
    // §4.15's `opens_section:` (kogaki#823), read back from the serialized form
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
      if (bad) { refusals.push(bad); continue; }
      opens_section = opensM[1].trim();
    }
    steps.push({ step_id: idM[1], move: moveM ? moveM[1] : null, introduces, opens_section, body });
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
  return `${id} is not in this Brief's settled set (${set}) — the set closed at mint; growing it is an owner act routed back through Terrain, never a /draft fetch (SPEC-draft-command §4)`;
}

// Scan LLM-authored prose for Strand tokens outside the closed set (AC2's
// assertion shape: a run whose material names a foreign Strand refuses by
// name). In-set tokens pass — whether internal vocabulary belongs in reader
// prose at all is a register question — carried by src/packet-template.md and
// grounded at specs/spec-brief-draft-design/DESIGN.md §4 — not the closed set's.
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
// Workspace — machine identity lives here and only here (§5): run record,
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

// Per-block snapshot (kogaki#523 shape, §5): the FULL assembled state, into
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
  // §4.12's MECHANICAL HALF at the realization entry: `resolve` refuses an
  // EXISTING Brief carrying a move id that resolves to no record, naming the
  // Step and the id. The composition-side seat (assemble.mjs adopt-candidate)
  // stops one entering a Brief; this one stops a Brief whose library moved
  // underneath it — a Move renamed or withdrawn after the Brief was composed
  // dangles without the Brief changing at all, so neither seat subsumes the
  // other. The judged half is NOT re-run here: it was rendered at composition
  // by a sitting reading the material, and re-deriving it at realization
  // would be this runtime composing a verdict, which §4.12 forbids.
  // THE STORE DEFAULT IS WORKING-DIRECTORY-RELATIVE, and this entry is shared
  // by resolve, material, section and emit — so all four gain a cwd dependency
  // this runtime did not have before (a Brief arrives as a path; the workspace
  // default is home-relative). Driven from outside the repository root they
  // refuse as a STORE fault naming `--moves-dir`, which is legible rather than
  // silent. Not made Brief-relative on purpose: inferring a repository root
  // from a Brief's path guesses at a layout the spec does not govern, and a
  // wrong guess resolves SILENTLY against the wrong library (§4.12.1).
  const resolved = resolveMoveIds(brief.steps, args["moves-dir"]);
  if (resolved.error) fail(resolved.error);
  return { ...brief, path: resolve(path), movesChecked: resolved.checked };
}

// §4.15's SECTION GROUPING, derived from the Brief and from nothing else
// (kogaki#823). ONE derivation, shared by the renderer, the frontmatter trace
// and the Packet: a Section is a run of Steps beginning at a Step that declares
// `opens_section` and continuing until the next one does. The Brief is the only
// input, so what the Draft renders and what a Packet says about where a Step
// sits cannot disagree — two derivations of the same grouping is two things
// that can drift about which Section a Step is in.
//
// A path declaring no `opens_section` at all is the pre-§4.15 corpus, and it
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
  const sections = sectionsOf(brief.steps);
  const opensAt = new Map();
  for (const sec of sections) opensAt.set(sec.step_ids[0], sec);
  for (const step of brief.steps) {
    const f = join(ws, "sections", `${step.step_id}.md`);
    if (!existsSync(f)) { missing.push(step.step_id); continue; }
    const sec = opensAt.get(step.step_id);
    // An untitled Section renders no heading rather than an empty one. It is
    // reachable only on a pre-§4.15 path, whose whole body is one Section.
    if (sec && sec.title !== undefined) parts.push(`## ${sec.title}`);
    parts.push(readFileSync(f, "utf8").trim());
  }
  return { body: parts.join("\n\n"), missing };
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
  // §4.13's ledger is DERIVED here and rendered, never stored: no field is
  // written to the Brief and no key is added to the run record above. A Brief
  // whose path introduces nothing renders the empty ledger AS an empty ledger
  // — that is a true reading of the path, not a failure to compute one.
  // COUNTED FROM THE DERIVATION, never by adding the last Step's RAW entries
  // to the deduped union before it (PR #775 round 1). The first form
  // double-counted a term a later Step re-declares — and cross-Step
  // re-declaration is exactly what §4.13 legalizes, so the wrong case was the
  // one the field explicitly permits. Appending a terminal sentinel makes the
  // final row's snapshot the whole path's union, so the count comes from the
  // same function everything else reads and cannot disagree with it. This
  // line is the ONLY owner-facing rendering of the ledger, which is why a
  // wrong number here is the one a reader has no way to check.
  const ledger = readerKnowledgeLedger([...brief.steps, { step_id: "(end)" }]);
  const introduced = ledger[ledger.length - 1].reader_already_knows.length;
  process.stdout.write(`reader-knowledge ledger: ${introduced} term(s) introduced across ${brief.steps.length} step(s), derived from the path at read time and stored nowhere (§4.13)${introduced === 0 ? " — this path introduces no terms, which is a reading of it and not an error" : ""}\n`);
  process.stdout.write(`move ids: ${brief.movesChecked} of ${brief.steps.length} step(s) resolved against the Move library (§4.12) — the specialization judgment was rendered at composition and is not re-derived here\n`);
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
// THE SECTION PACKET (§4.14, kogaki#749; owner rulings 2026-09-01).
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
// fields (§4.12), so rendering both would put the general and the specialized
// statement of one thing side by side and leave the model to pick. The Step's
// instantiated states win.
const MOVE_FIELDS_RENDERED = ["intent", "constraints", "failure_modes"];

// Read one field out of a Move record's folded-scalar form. The store is the
// same one §4.12's resolver reads, and this reads VALUES where that one reads
// only ids — the split is deliberate (§4.12.1: a resolver that parsed these
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
function stepField(body, field) {
  const m = body.match(new RegExp(`^${field}:[ \\t]*(.*)$`, "m"));
  return m ? m[1].trim() : null;
}

export function renderPacket({ template, brief, step, moveText, priorSections, ledgerRow }) {
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
    // (§4.13.1) — an empty excerpt is not a missing input, it is a record that
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
      : "(nothing — this is the first Section to introduce anything, or the path introduces no terms)",
    introduces: intro.length ? intro.map((e) => `- ${e}`).join("\n") : "(nothing new)",
    prior_sections: priorSections.length
      ? priorSections.map((p) => p.text).join("\n\n")
      : "(nothing yet — this is the article's first Section)",
  };
  if (missing.length) {
    return { error: `the Packet for ${step.step_id} cannot be rendered: ${missing[0]} is absent. `
      + `A Packet is the model's entire input, so a missing block is a hole the model fills by invention — `
      + `it refuses by NAME rather than rendering an empty slot (§4.14).` };
  }
  let out = template;
  for (const [k, v] of Object.entries(fields)) out = out.split(`{{${k}}}`).join(v);
  // The HTML comment is authoring guidance for the template's maintainer and
  // is NOT part of the model's input — stripped here so the rendered Packet is
  // exactly what the ruling describes and nothing more.
  out = out.replace(/^<!--[\s\S]*?-->\n*/, "");
  const left = out.match(/\{\{(\w+)\}\}/);
  if (left) return { error: `the template slot {{${left[1]}}} was not filled — the renderer and the template disagree about the slot set, which is the round trip failing silently (§4.14)` };
  return { packet: out };
}

// THE PACKET RENDER, FACTORED SO THE HARNESS CAN DRIVE IT (kogaki#811,
// DESIGN.md §3). `cmdPacket` prints it on demand; `resolve` and `section`
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
      + `resolve refuses a dangling id before this point (§4.12.1), so this is the store rather than the Brief` };
  }
  const tplPath = join(dirname(fileURLToPath(import.meta.url)), "packet-template.md");
  let template;
  try { template = readFileSync(tplPath, "utf8"); }
  catch (e) { return { error: `the Packet template at ${tplPath} cannot be read (${e.message}) — it is a runtime-read carrier and the command has no built-in fallback, deliberately: a fallback template would be a second copy nobody maintains` }; }

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

  const r = renderPacket({ template, brief, step, moveText, priorSections: prior, ledgerRow: row });
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
  // which is the difference the ruling is about. §4.14 restated the ruling as
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
  process.stderr.write(`stored exactly as served — the file above is byte-identical to what was printed (§4.14)\n`);
  // The owed-path line is GONE rather than reworded (kogaki#750). It announced
  // a debt on every render, and the debt is paid: the workspace default IS
  // `runs/draft/<slug>/`. A line that keeps naming a discharged obligation is
  // the same defect as one that never named it — both leave a reader unable to
  // tell the current state from the state when the line was written.
}

// THE HARNESS HANDS THE NEXT STEP'S INPUT FORWARD (kogaki#811, DESIGN.md §3).
// `resolve` calls this at run start and `section` after recording a Step, so a
// Packet exists for the Step about to be realized WITHOUT the session running
// a command. That is the render-within arm: it makes §3's "one Step, one
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
  // THE BACKSTOP (kogaki#811, DESIGN.md §3). Render-within supplies the Packet;
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
    fail(`step ${id} has no rendered Packet at ${packetPath} — §3 makes the Packet a Step's ENTIRE input, so realizing one without it means the prose was written from something else. `
      + `The Harness renders it at \`resolve\` and after each \`section\`; if it was deleted, \`packet --step ${id}\` restores it`);
  }
  let recordedSha = null;
  try { recordedSha = (JSON.parse(readFileSync(join(ws, "run.json"), "utf8")).packets || {})[id]?.sha256 || null; }
  catch { /* no run record — handled as unrecorded below */ }
  const onDiskSha = sha256(readFileSync(packetPath, "utf8"));
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
    fail(`the section for ${id} renders record as structure: ${structural[0]} — the per-Step trace is frontmatter record, never visible structure in the body (SPEC-draft-command §5)`);
  }
  // THE PROSE CARRIES NO SECTION HEADING (§4.15, kogaki#823). The heading is
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
  const heading = content.match(/^(#{1,3})\s+(?!#)(.*\S)\s*$/m);
  if (heading) {
    fail(`the section for ${id} carries its own heading (${heading[0].trim()}) — after §4.15 the heading is the Harness's, rendered once per Section at the Step that declares opens_section, and prose that writes its own produces a second heading the Brief never declared. `
      + `Remove it: the Packet's write instruction says "No heading" for this reason`);
  }
  mkdirSync(join(ws, "sections"), { recursive: true });
  let seq = 0;
  try { seq = readdirSync(join(ws, "snapshots")).length; } catch { /* first snapshot */ }
  snapshotDraft(ws, `before-${id}`, seq, assembleBody(brief, ws).body);
  writeFileSync(join(ws, "sections", `${id}.md`), content);
  snapshotDraft(ws, `after-${id}`, seq + 1, assembleBody(brief, ws).body);
  process.stdout.write(`section ${id} recorded (${brief.steps.findIndex((s) => s.step_id === id) + 1} of ${brief.steps.length} steps)\n`);
  const nextId = driveNextPacket(brief, args, ws);
  if (nextId) process.stdout.write(`next: ${nextId} — its Packet is rendered above; realize from it and record with \`section --step ${nextId} --file <prose>\`\n`);
}

function cmdEmit(args) {
  const brief = loadBrief(args);
  const ws = workspaceFor(args, brief.slug);
  const { body, missing } = assembleBody(brief, ws);
  if (missing.length) {
    fail(`the run is not at completion: step(s) ${missing.join(", ")} have no realized section — a /draft run ends when the CanonicalDraft exists, and these are what it still owes (SPEC-draft-command §3)`);
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
  // §4.15 it asserted a one-to-one mapping that the Brief may not declare, so a
  // reader of the trace could not tell which Steps shared a heading.
  const secOf = sectionOfStep(brief.steps);
  const trace = brief.steps.map((s) => {
    const sec = secOf.get(s.step_id);
    return { step_id: s.step_id, section: sec.index, ...(sec.title !== undefined ? { section_title: sec.title } : {}) };
  });
  // The artifact is owner-visible and machine-independent (round 1 finding 3):
  // the Brief is named relative to the draft that realizes it — always its
  // sibling — so two machines emit identical bytes. The absolute path is
  // machine identity and stays in run.json / last-emit.json.
  const fm = [
    "---",
    `brief: ${relative(dirname(outPath), brief.path)}`,
    `brief_pin: sha256:${sha256(brief.text)}`,
    `survey_pin: ${brief.surveyPin}`,
    `generated_by: ${JSON.stringify(generatedBy)}`,
    "cites:",
    ...cites.map((c) => `  - ${JSON.stringify(c)}`),
    "trace:",
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
    // §4.14's global anchors (kogaki#749). The fixture carried a Thesis and
    // none of the other three, so the Packet refused by name — correctly, and
    // the fixture is what was short. Added here rather than defaulted in the
    // renderer: a default would be the renderer inventing an anchor, which is
    // exactly the hole the refusal exists to keep open.
    "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
    "## Reader target", "", "The reader can say why the fixture claim is not obvious.", "",
    "## Opening question", "", "What makes the fixture claim worth stating?", "",
    "## Sequence", "",
    // The step blocks carry the fields §4.14 RENDERS, not only the two earlier
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

  // §4.12's FIXTURE MOVE LIBRARY (kogaki#747). The fixture Brief binds Moves
  // because a Step without one is not a Step (§4.1 v18) and its id must
  // resolve (§4.12) — the pass drove a Brief whose step blocks carried no
  // `move:` at all, which is the same dead-input state this issue closes.
  // A fixture library rather than the repository's `moves/`: a self-test that
  // resolved against the real store would go red on a library edit it has
  // nothing to do with, and would force the fixture to adopt real Move ids it
  // does not mean. Records hold an id line only — the resolver reads the store
  // as a set of ids and nothing more.
  const movesDir = join(root, "moves");
  mkdirSync(movesDir, { recursive: true });
  for (const id of ["open_the_claim", "close_the_claim"]) {
    // §4.14 renders intent/constraints/failure_modes and the excerpt, so the
    // fixture records carry them — a store holding ids alone was enough for
    // §4.12's membership test and is not enough for a Packet.
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

  // 4a2 — §4.13's `introduces:` READ BACK (kogaki#751). The field is written
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

  // 4a3 — §4.14's SECTION PACKET (kogaki#749). The Packet is the model's
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

  // 4b — §4.12's MECHANICAL HALF at the realization entry (kogaki#747).
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
  // render-within explains rather than one it cannot see. #811 and DESIGN.md §3
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

  // 7 — §4.15's SECTION GROUPING, DRIVEN END TO END (kogaki#823). The cases
  // above run against a Brief that declares no `opens_section`, which is the
  // pre-§4.15 corpus and exercises exactly the fallback branch — so on their
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

  // Acceptance 4's CONTROL: the adjacent guard is unchanged. Asserted on this
  // Brief rather than trusted from the block above, because this is the issue
  // that put a second heading rule beside it.
  const badTrace = join(root, "prose-bad-trace.md");
  writeFileSync(badTrace, "step_id: t1\n\nprose.");
  ok("findTraceStructure's refusals still fire on a declared path",
    driveSec("section", "--step", "t1", "--file", badTrace).status !== 0);
  ok("a bare step id as a heading is still refused",
    findTraceStructure("# t1\n\nprose.", ["t1"]).length > 0);

  // The prose-side half of "no heading inside a Section": the Harness owns the
  // heading, so prose writing its own is refused at the act that records it.
  const ownHeading = join(root, "prose-own-heading.md");
  writeFileSync(ownHeading, "## A title the Brief never declared\n\nprose.");
  const rOwn = driveSec("section", "--step", "t1", "--file", ownHeading);
  ok("realized prose carrying its own heading refuses, naming the heading",
    rOwn.status !== 0 && rOwn.stderr.includes("A title the Brief never declared"), rOwn.stderr.trim().slice(0, 160));

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

  // The pre-§4.15 corpus is the CONTROL for the fallback: a path declaring
  // nothing derives one untitled Section and renders no heading, rather than
  // refusing or rendering `## undefined`. Without this, the migration cost of
  // this issue is invisible.
  ok("a path declaring no Section derives one untitled Section and renders no heading",
    sectionsOf([{ step_id: "s1" }, { step_id: "s2" }]).length === 1 &&
    !/^## /m.test(out.split("---\n").slice(2).join("---\n")));

  rmSync(root, { recursive: true, force: true });
  process.stdout.write(`draft self-test: ${passed} case(s) pass${failures.length ? `, FAILURES: ${failures.join(" | ")}` : ""}\n`);
  if (failures.length) process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
if (args["self-test"]) {
  await runSelfTest();
} else {
  switch (args._cmd) {
    case "resolve": cmdResolve(args); break;
    case "material": cmdMaterial(args); break;
    case "packet": cmdPacket(args); break;
    case "section": cmdSection(args); break;
    case "emit": cmdEmit(args); break;
    default: fail("usage: draft.mjs resolve|material|packet|section|emit --brief <path> [--workspace <dir>] [--moves-dir <dir>] [--strand <L-id>] [--step <id> [--file <f>]] | --self-test");
  }
}
