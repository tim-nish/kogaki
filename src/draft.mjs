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
// Four commands, one per harness act:
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
import { join, resolve, relative, dirname, basename } from "node:path";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
// §4.12's mechanical half is ONE function shared with the composition side
// (src/compose.mjs), never a second copy here: two resolvers are two things
// that can disagree about what a dangling move id is, and the refusal a
// composer sees would stop matching the one a realizer sees.
import { resolveMoveIds, introducesRefusal, readerKnowledgeLedger } from "./compose.mjs";

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
    steps.push({ step_id: idM[1], move: moveM ? moveM[1] : null, introduces, body });
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
// prose at all is the style contract's question, not the closed set's.
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
// per-block snapshots, section files. Default under ~/.kogaki/draft-runs/;
// --workspace overrides for the fixture pass, which never touches the home
// directory.
function workspaceFor(args, slug) {
  const base = typeof args.workspace === "string" && args.workspace !== ""
    ? args.workspace
    : join(homedir(), ".kogaki", "draft-runs");
  return join(base, slug);
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

function assembleBody(brief, ws) {
  const parts = [];
  const missing = [];
  for (const step of brief.steps) {
    const f = join(ws, "sections", `${step.step_id}.md`);
    if (!existsSync(f)) { missing.push(step.step_id); continue; }
    parts.push(readFileSync(f, "utf8").trim());
  }
  return { body: parts.join("\n\n"), missing };
}

// ---------------------------------------------------------------------------
// Commands.
function cmdResolve(args) {
  const brief = loadBrief(args);
  const ws = workspaceFor(args, brief.slug);
  mkdirSync(join(ws, "sections"), { recursive: true });
  // Machine identity: run record in the workspace, never in the artifact.
  writeFileSync(join(ws, "run.json"), JSON.stringify({
    brief: brief.path,
    brief_sha: sha256(brief.text),
    survey_pin: brief.surveyPin,
    strands: brief.strands.map((s) => s.id),
    steps: brief.steps.map((s) => s.step_id),
    resolved_at: new Date().toISOString(),
  }, null, 2) + "\n");
  process.stdout.write(`brief: ${brief.path}\n`);
  process.stdout.write(`survey pin: ${brief.surveyPin}\n`);
  process.stdout.write(`closed set: ${brief.strands.map((s) => s.id).join(", ")} — the Brief's own text plus these Strands' served renderings at the pin; nothing else is reachable\n`);
  process.stdout.write(`reader path: ${brief.steps.map((s) => s.step_id).join(" → ")} (recorded order; realized in this order and no other)\n`);
  // §4.13's ledger is DERIVED here and rendered, never stored: no field is
  // written to the Brief and no key is added to the run record above. A Brief
  // whose path introduces nothing renders the empty ledger AS an empty ledger
  // — that is a true reading of the path, not a failure to compute one.
  const ledger = readerKnowledgeLedger(brief.steps);
  const introduced = ledger.length ? ledger[ledger.length - 1].reader_already_knows.length
    + (brief.steps[brief.steps.length - 1].introduces || []).length : 0;
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

function cmdSection(args) {
  const brief = loadBrief(args);
  const id = argString(args, "step", "section needs --step <step_id>");
  const file = argString(args, "file", "section needs --file <path to the realized prose>");
  const step = brief.steps.find((s) => s.step_id === id);
  if (!step) {
    fail(`no step "${id}" in this Brief's Reader Path (${brief.steps.map((s) => s.step_id).join(", ")}) — the path is the Brief's, and /draft never re-opens it`);
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
  const ws = workspaceFor(args, brief.slug);
  mkdirSync(join(ws, "sections"), { recursive: true });
  let seq = 0;
  try { seq = readdirSync(join(ws, "snapshots")).length; } catch { /* first snapshot */ }
  snapshotDraft(ws, `before-${id}`, seq, assembleBody(brief, ws).body);
  writeFileSync(join(ws, "sections", `${id}.md`), content);
  snapshotDraft(ws, `after-${id}`, seq + 1, assembleBody(brief, ws).body);
  process.stdout.write(`section ${id} recorded (${brief.steps.findIndex((s) => s.step_id === id) + 1} of ${brief.steps.length} steps)\n`);
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
  const trace = brief.steps.map((s, i) => ({ step_id: s.step_id, section: i + 1 }));
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
    "## Sequence", "",
    "```step", "step_id: s1", "move: open_the_claim", "purpose: open", "```", "",
    "```step", "step_id: s2", "move: close_the_claim", "purpose: close", "```", "",
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
    writeFileSync(join(movesDir, `${id}.md`), `id: ${id}\nstatus: observed\n`);
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
    ok("resolve states the ledger it derived, including the empty reading",
      r0.status === 0 && /reader-knowledge ledger: 0 term\(s\)/.test(r0.stdout) && /not an error/.test(r0.stdout));
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
  const w2 = drive("section", "--step", "s2", "--file", sec2);
  const w1 = drive("section", "--step", "s1", "--file", sec1);
  ok("sections land", w1.status === 0 && w2.status === 0);
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
    case "section": cmdSection(args); break;
    case "emit": cmdEmit(args); break;
    default: fail("usage: draft.mjs resolve|material|section|emit --brief <path> [--workspace <dir>] [--moves-dir <dir>] [--strand <L-id>] [--step <id> --file <f>] | --self-test");
  }
}
