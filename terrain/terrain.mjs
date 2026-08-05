#!/usr/bin/env node
// Terrain — the survey/selection surface (manifest item 1, specs/SPEC.md §5;
// kogaki#14 umbrella, kogaki#17 story 1.8; governing spec
// specs/spec-terrain/SPEC.md).
//
// Terrain reads SERVED RENDERINGS only, through the seam (element_survey),
// and composes the survey under its three contracts:
//   §2.1 completeness is a cover counted in placements, AFTER composition,
//        with every figure naming which family it counted;
//   §2.2 grouping is presentation-only — navigation narrows nothing;
//   §2.3 the second-proposer boundary — rank/trim/hide are proposals routed
//        through the item-3 record contract; enumerate/sort/filter-by-owner
//        are navigation; an act in neither list is a report.
//
// Terrain validates a survey record BEFORE writing it, with the same rules
// checks/check-terrain-composition.sh applies after — constrain generation,
// then detect what generation cannot promise.
//
// Run state (survey records, proposal records, gate declarations, captures)
// lives in the machine-local run workspace (default ~/.kogaki/runs/...),
// never in the repository (specs/SPEC.md §4 rider 3).
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, openSync, closeSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const SURVEY_SCHEMA = readJson(join(REPO, "specs/spec-terrain/survey-schema.json"));
const RECORD_SCHEMA = readJson(join(REPO, "specs/spec-proposal-contract/record-schema.json"));
const GATE_SCHEMA = readJson(join(REPO, "specs/spec-gate-carrier/gate-schema.json"));
const GATES_REGISTRY = readJson(join(REPO, "gates/registry.json"));

const NO_RELATION_SECTION = "No relation (no served tag)";
// The selector affordance (AskUserQuestion) holds at most 4 options; one is
// always the standing registry option, so at most 3 strands ride a gate.
const MAX_STRAND_OPTIONS = 3;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fail(msg) {
  process.stderr.write(`terrain: ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        args[key] = true;
      } else {
        // repeatable flags accumulate
        if (args[key] === undefined) args[key] = next;
        else args[key] = [].concat(args[key], next);
        i++;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

function runDir(args) {
  const dir = args["run-dir"]
    || process.env.KOGAKI_RUN_DIR
    || join(homedir(), ".kogaki", "runs", `terrain-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function gatewayQuery(tool, toolArgs) {
  const bin = join(REPO, "policy/kit/bin/gateway-query.mjs");
  // Capture stdout through a file descriptor, not a pipe: the kit flushes
  // stdout asynchronously and exits, so a pipe truncates large responses
  // (element_survey is ~500KB; observed cut at ~146KB) while a file write is
  // synchronous. Kit-side fix tracked in its own issue — this call must not
  // depend on it.
  const outPath = join(tmpdir(), `terrain-seam-${process.pid}-${Date.now()}.json`);
  const fd = openSync(outPath, "w");
  let res;
  try {
    res = spawnSync(process.execPath, [bin, "--consumer", "kogaki", "--tool", tool, "--args", JSON.stringify(toolArgs)], {
      stdio: ["ignore", fd, "pipe"],
      encoding: "utf8",
    });
  } finally {
    closeSync(fd);
  }
  res.stdout = readFileSync(outPath, "utf8");
  rmSync(outPath, { force: true });
  if (res.status === 11) {
    // The seam is an enhancer elsewhere; here it is the material itself.
    // Degrade with the one-line idiom and stop — Terrain without served
    // renderings has nothing to survey, and inventing material would cross
    // the repository-invisible boundary, not soften a failure.
    process.stderr.write("policy_source unavailable: Terrain has no material without the seam — no survey composed\n");
    process.exit(11);
  }
  if (res.status !== 0) fail(`gateway-query failed (${res.status}): ${res.stderr}`);
  return JSON.parse(res.stdout);
}

// --------------------------------------------------------------------------
// Survey validation — the same rules the check applies, run BEFORE writing.
// Returns a list of "CODE — detail" strings; empty = conforming.
// --------------------------------------------------------------------------
export function validateSurvey(record, schema = SURVEY_SCHEMA) {
  const v = [];
  const s = schema.survey;
  for (const f of s.required) {
    if (record[f] === undefined || record[f] === null || record[f] === "") {
      v.push(`SURVEY_MISSING_FIELD — survey.${f}`);
    }
  }
  const candidates = Array.isArray(record.candidates) ? record.candidates : [];
  const sections = Array.isArray(record.sections) ? record.sections : [];
  const ids = new Set();
  candidates.forEach((c, i) => {
    for (const f of s.candidate_required) {
      if (c[f] === undefined || c[f] === null || c[f] === "") {
        v.push(`CANDIDATE_MISSING_FIELD — candidates[${i}].${f}`);
      }
    }
    if (c.family !== undefined && !schema.families.includes(c.family)) {
      v.push(`FAMILY_UNKNOWN — candidates[${i}].family=${JSON.stringify(c.family)}; the served families are ${schema.families.join("|")}`);
    }
    if (c.id) {
      if (ids.has(c.id)) {
        v.push(`CANDIDATE_ID_DUPLICATE — ${JSON.stringify(c.id)} appears twice; a duplicate id silently merges two Strands and breaks the cover (a journey shares its lesson's slug — qualify by family)`);
      }
      ids.add(c.id);
    }
    narrowingKeys(c, s).forEach((k) =>
      v.push(`NAVIGATION_STATE_NARROWS — candidates[${i}] carries ${JSON.stringify(k)}: ${s.narrowing_rationale}`));
  });
  const placed = new Set();
  sections.forEach((sec, i) => {
    for (const f of s.section_required) {
      if (sec[f] === undefined || sec[f] === null || sec[f] === "") {
        v.push(`SECTION_MISSING_FIELD — sections[${i}].${f}`);
      }
    }
    narrowingKeys(sec, s).forEach((k) =>
      v.push(`NAVIGATION_STATE_NARROWS — sections[${i}] carries ${JSON.stringify(k)}: ${s.narrowing_rationale}`));
    for (const m of sec.members || []) {
      if (!ids.has(m)) {
        v.push(`PLACEMENT_UNKNOWN_STRAND — sections[${i}] places ${JSON.stringify(m)}, which is no candidate`);
      } else {
        placed.add(m);
      }
    }
  });
  for (const id of ids) {
    if (!placed.has(id)) {
      v.push(`COVER_STRAND_UNPLACED — ${JSON.stringify(id)} appears in no section; nothing is silently dropped`);
    }
  }
  const tagless = candidates.filter((c) => Array.isArray(c.tags) && c.tags.length === 0);
  if (tagless.length > 0) {
    const name = record.no_relation_section;
    const sec = sections.find((x) => x.name === name);
    if (!name || !sec) {
      v.push(`NO_RELATION_NOT_EXPLICIT — ${tagless.length} Strand(s) carry no served tag and no declared no-relation section holds them`);
    }
  }
  const comp = record.completeness;
  if (comp && typeof comp === "object") {
    const cs = s.completeness;
    for (const f of cs.required) {
      if (comp[f] === undefined || comp[f] === null || comp[f] === "") {
        v.push(`SURVEY_MISSING_FIELD — completeness.${f}`);
      }
    }
    if (comp.counted_over !== undefined && comp.counted_over !== cs.counted_over_must_be) {
      v.push(`FIGURE_NOT_OVER_PLACEMENTS — completeness.counted_over=${JSON.stringify(comp.counted_over)}: ${cs.counted_over_rationale}`);
    }
    if (comp.family !== undefined && comp.family !== "" && comp.family !== cs.family_must_name) {
      v.push(`FIGURE_FAMILY_UNNAMED — completeness.family=${JSON.stringify(comp.family)}: ${cs.family_rationale}`);
    }
    if (comp.family === "" || comp.family === null) {
      v.push(`FIGURE_FAMILY_UNNAMED — completeness.family is empty: ${cs.family_rationale}`);
    }
    // The figure is recomputed from the placements it claims to be counted
    // over. A stored figure that disagrees is a wrong number, not a view.
    const byFamily = { };
    for (const fam of schema.families) byFamily[fam] = 0;
    for (const id of placed) {
      const c = candidates.find((x) => x.id === id);
      if (c && byFamily[c.family] !== undefined) byFamily[c.family]++;
    }
    const mismatches = [];
    if (comp.placed !== undefined && comp.placed !== placed.size) {
      mismatches.push(`placed=${comp.placed} recomputed=${placed.size}`);
    }
    if (comp.of !== undefined && comp.of !== candidates.length) {
      mismatches.push(`of=${comp.of} candidates=${candidates.length}`);
    }
    if (comp.by_family && typeof comp.by_family === "object") {
      for (const fam of schema.families) {
        if (comp.by_family[fam] !== undefined && comp.by_family[fam] !== byFamily[fam]) {
          mismatches.push(`by_family.${fam}=${comp.by_family[fam]} recomputed=${byFamily[fam]}`);
        }
      }
    }
    if (mismatches.length) {
      v.push(`FIGURE_MISMATCH — ${mismatches.join("; ")}`);
    }
  }
  return v;
}

function narrowingKeys(obj, s) {
  return s.narrowing_keys_forbidden.filter((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

// --------------------------------------------------------------------------
// survey — read the seam, compose, validate, write.
// --------------------------------------------------------------------------
function cmdSurvey(args) {
  const dir = runDir(args);
  const resp = gatewayQuery("element_survey", { kinds: SURVEY_SCHEMA.families });
  const candidates = [];
  for (const line of resp.lines || []) {
    let rec;
    try {
      rec = JSON.parse(line.text);
    } catch {
      fail(`unparseable served record at ${line.cite} — surfaced, not skipped: a silently dropped record breaks the cover`);
    }
    if (!SURVEY_SCHEMA.families.includes(rec.kind)) continue;
    // A Strand is ONE Lesson or ONE Journey (the ratified family), and a
    // journey shares its lesson's slug — so the slug alone conflates two
    // Strands and the id is family-qualified. Caught live by the
    // generation-time refusal (FIGURE_MISMATCH, first run 2026-08-05).
    candidates.push({ id: `${rec.kind}:${rec.slug}`, slug: rec.slug, family: rec.kind, tags: rec.tags || [], cite: line.cite });
  }
  // Compose: one section per served tag (screen 1's axis is the served tag
  // vocabulary, SPEC.md §2.2); multi-tag Strands place in every section they
  // relate to — completeness is a COVER counted in placements, not a
  // partition (SPEC.md §2.1).
  const byTag = new Map();
  const tagless = [];
  for (const c of candidates) {
    if (c.tags.length === 0) { tagless.push(c.id); continue; }
    for (const t of c.tags) {
      if (!byTag.has(t)) byTag.set(t, []);
      byTag.get(t).push(c.id);
    }
  }
  const sections = [...byTag.keys()].sort().map((t) => ({ name: t, axis: "served-tag", members: byTag.get(t) }));
  if (tagless.length > 0) sections.push({ name: NO_RELATION_SECTION, axis: "served-tag", members: tagless });
  // The figure — counted AFTER composition, over placements.
  const placed = new Set(sections.flatMap((s) => s.members));
  const byFamily = {};
  for (const fam of SURVEY_SCHEMA.families) {
    byFamily[fam] = candidates.filter((c) => placed.has(c.id) && c.family === fam).length;
  }
  const id = `terrain-survey-${Date.now()}`;
  const record = {
    id,
    generated_by: "terrain/terrain.mjs",
    pin: resp.pin,
    candidates,
    sections,
    no_relation_section: NO_RELATION_SECTION,
    completeness: {
      placed: placed.size,
      of: candidates.length,
      family: SURVEY_SCHEMA.family_label,
      by_family: byFamily,
      counted_over: "placements",
    },
  };
  const violations = validateSurvey(record);
  if (violations.length) {
    fail(`refusing to write a non-conforming survey record:\n  ${violations.join("\n  ")}`);
  }
  const out = join(dir, `${id}.terrain-survey.json`);
  writeFileSync(out, JSON.stringify(record, null, 2) + "\n");
  // Rendering. The figure takes the first line here as a PRESENTATION choice;
  // whether it is contract is carried open at SPEC.md §5 and not decided by
  // this runtime.
  const c = record.completeness;
  console.log(`Completeness: ${c.placed} of ${c.of} ${c.family} placed (lesson ${c.by_family.lesson}, journey ${c.by_family.journey}); counted over placements.`);
  console.log(`Pin: ${record.pin}`);
  console.log(`Survey record: ${out}\n`);
  for (const s of sections) console.log(`  ${s.name} (${s.members.length})`);
  console.log(`\nNavigation (narrows nothing): view --survey ${out} [--tag T] [--family lesson|journey] [--sort slug|section]`);
}

// --------------------------------------------------------------------------
// view — navigation. Narrows nothing; the record is never rewritten.
// --------------------------------------------------------------------------
function cmdView(args) {
  const record = readJson(String(args.survey || fail("view needs --survey <file>")));
  const tags = args.tag ? [].concat(args.tag) : null;
  const family = args.family ? String(args.family) : null;
  let list = record.candidates;
  if (tags) list = list.filter((c) => tags.some((t) => c.tags.includes(t)));
  if (family) list = list.filter((c) => c.family === family);
  list = [...list].sort((a, b) => a.id.localeCompare(b.id));
  for (const c of list) console.log(`  ${c.id}  [${c.family}]  (${c.tags.join(", ") || "no relation"})  ${c.cite}`);
  console.log(`\n${list.length} of ${record.candidates.length} ${SURVEY_SCHEMA.family_label} in view — a view, not a narrowing: the survey record is unchanged and every Strand stays selectable (free text reaches all of them at the gate).`);
}

// --------------------------------------------------------------------------
// act — the second-proposer boundary, enforced by enumeration.
// --------------------------------------------------------------------------
function cmdAct(args) {
  const dir = runDir(args);
  const act = String(args.act || fail("act needs --act <name>"));
  const acts = RECORD_SCHEMA.acts;
  if (acts.navigation.includes(act)) {
    console.log(`${act} is NAVIGATION — use \`view\`; no record is written. A navigation act wrapped as a proposal is a contract violation from the other direction (record-schema.json acts).`);
    return;
  }
  if (!acts.proposal.includes(act)) {
    // The non-member fallback: a report, never a guess.
    const record = {
      id: `terrain-report-${Date.now()}`,
      kind: "report",
      act,
      reason: `act ${JSON.stringify(act)} is in neither the proposal list (${acts.proposal.join(", ")}) nor the navigation list (${acts.navigation.join(", ")}) — specs/spec-terrain/SPEC.md §2.3: an act not in either list is a report, not a choice`,
      narrows: false,
    };
    const out = join(dir, `${record.id}.proposal.json`);
    writeFileSync(out, JSON.stringify(record, null, 2) + "\n");
    console.log(`Unclassified act — report record written (narrows nothing): ${out}`);
    return;
  }
  // A proposal. Where/Why/effect-stating label are the caller's to state —
  // this runtime binds the record's shape, never the narrowing's computation.
  const where = String(args.where || fail(`--where is required: the material the ${act} applies to`));
  const why = String(args.why || fail("--why is required: the machine premise, rendered — an implicit premise is the recorded failure"));
  const label = String(args.label || fail("--label is required: state the effect of taking the proposal"));
  const members = args.ids ? String(args.ids).split(",").map((s) => s.trim()).filter(Boolean) : [];
  if (members.length === 0) fail("--ids is required: the Strand ids the proposal narrows to (comma-separated)");
  const record = {
    id: `terrain-${act}-${Date.now()}`,
    kind: "proposal",
    act,
    where,
    why,
    label,
    options: [
      // Not the record's own label: item 3's floor refuses an option label
      // identical to the record's (caught by check-proposal-contract at
      // first dogfood, 2026-08-05).
      { id: `apply-${act}`, label: `Apply the ${act}: ${members.length} named Strand(s) go forward, the rest stay in the survey`, members },
      {
        id: "decline",
        label: "No narrowing; the full candidate set stands",
        negates_premise: true,
      },
    ],
    free_text: {
      accepted: true,
      prompt: "State a different narrowing, or decline, in your own words",
    },
  };
  const floor = RECORD_SCHEMA.proposal.label_floor;
  if (label.trim().split(/\s+/).length < floor.min_words || label.trim() === act) {
    fail(`label fails the effect-stating floor (≥${floor.min_words} words, never the bare act token). The floor is form only; sufficiency is the review lane's.`);
  }
  const out = join(dir, `${record.id}.proposal.json`);
  writeFileSync(out, JSON.stringify(record, null, 2) + "\n");
  console.log(`Proposal record written (presented at gate terrain-trim-ratification, never as navigation): ${out}`);
}

// --------------------------------------------------------------------------
// gate — emit the per-run gate declaration for the skill to render through
// AskUserQuestion. The registry declares the gate CLASS; the run declaration
// carries the computed options, written beside the capture in the run
// workspace (the recorded consult miss: no served position was found on
// static declaration of run-computed option sets — surfaced, not silently
// resolved).
// --------------------------------------------------------------------------
function cmdGate(args) {
  const dir = runDir(args);
  const gateId = String(args.gate || fail("gate needs --gate <terrain-strand-selection|terrain-trim-ratification>"));
  const registered = (GATES_REGISTRY.gates || []).find((g) => g.id === gateId);
  if (!registered) fail(`${gateId} is not declared in gates/registry.json — an unregistered gate is the uncovered-by-default shape`);
  let strandOptions = [];
  if (args.proposal) {
    const p = readJson(String(args.proposal));
    strandOptions = (p.options || []).map((o) => ({ id: o.id, label: o.label }));
  } else {
    const ids = String(args.ids || fail("gate needs --ids a,b,c (the current view's Strands) or --proposal <record>")).split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length > MAX_STRAND_OPTIONS) {
      fail(`${ids.length} Strands exceed the selector affordance (${MAX_STRAND_OPTIONS} beside the standing option). Narrowing the view for the gate is a TRIM — run \`act --act trim\` and present it at terrain-trim-ratification; picking a subset here silently would be the refused minimal-form bundling.`);
    }
    strandOptions = ids.map((id) => ({ id: `strand:${id}`, label: id }));
  }
  // The registered standing option always rides; a proposal record that
  // already carries an option with the same id (the premise negation IS the
  // standing decline) is not doubled — a duplicated option id would make
  // options_offered unable to say which one was answered.
  const seen = new Set(strandOptions.map((o) => o.id));
  const standing = registered.options.filter((o) => !seen.has(o.id));
  const declaration = {
    ...registered,
    options: [...strandOptions, ...standing],
    declared_at: new Date().toISOString(),
    run_declaration: true,
  };
  delete declaration.dynamic_options;
  const out = join(dir, `${gateId}.run-declaration.json`);
  writeFileSync(out, JSON.stringify(declaration, null, 2) + "\n");
  console.log(JSON.stringify(declaration, null, 2));
  console.log(`\nRun declaration: ${out}`);
  console.log("Render through AskUserQuestion exactly as declared — options verbatim, nothing pre-selected, free text always on. Then record with `capture`.");
}

// --------------------------------------------------------------------------
// capture — record the answer with its payload and the rendering's own
// evidence (the AskUserQuestion tool_use_id).
// --------------------------------------------------------------------------
function cmdCapture(args) {
  const dir = runDir(args);
  const decl = readJson(String(args.declaration || fail("capture needs --declaration <run-declaration file>")));
  const toolUseId = String(args["tool-use-id"] || fail("capture needs --tool-use-id (the AskUserQuestion tool use — evidence, not a claim)"));
  const option = args.option ? String(args.option) : null;
  const freeText = args["free-text"] ? String(args["free-text"]) : null;
  if (!option && !freeText) fail("capture needs --option <id> or --free-text <answer>");
  if (option && !decl.options.some((o) => o.id === option)) {
    fail(`answer option ${JSON.stringify(option)} was not offered by the declaration`);
  }
  const row = {
    stop_id: `stop-${Date.now()}`,
    gate_id: decl.id,
    evidence: { tool: "AskUserQuestion", tool_use_id: toolUseId },
    payload: {
      options_offered: decl.options.map((o) => o.id),
      free_text_offered: true,
      answer: option ? { option } : { free_text: freeText },
    },
  };
  const out = join(dir, "terrain.gate-capture.json");
  const doc = existsSync(out) ? readJson(out) : { rows: [] };
  doc.rows.push(row);
  writeFileSync(out, JSON.stringify(doc, null, 2) + "\n");
  console.log(`Captured ${row.stop_id} (gate ${decl.id}) → ${out} — machine-local run state, never committed.`);
}

const [cmd, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
switch (cmd) {
  case "survey": cmdSurvey(args); break;
  case "view": cmdView(args); break;
  case "act": cmdAct(args); break;
  case "gate": cmdGate(args); break;
  case "capture": cmdCapture(args); break;
  case "validate": {
    const record = readJson(String(args.survey || fail("validate needs --survey <file>")));
    const v = validateSurvey(record);
    if (v.length) { v.forEach((line) => console.log(`FAIL ${line}`)); process.exit(1); }
    console.log("survey record conforms (the same rules the registered check applies)");
    break;
  }
  default:
    console.log(`usage: terrain.mjs <survey|view|act|gate|capture|validate> [--run-dir DIR] ...
  survey                                    compose the survey from the seam (element_survey)
  view --survey F [--tag T] [--family X]    navigation — narrows nothing
  act --act rank|trim|hide --where --why --label --ids a,b   proposal record (item 3 contract)
  act --act <other>                         report record — the non-member fallback
  gate --gate ID --ids a,b | --proposal F   per-run gate declaration (item 4 carrier)
  capture --declaration F --tool-use-id ID --option X | --free-text S
  validate --survey F                       run the composition rules on a record`);
    process.exit(cmd ? 1 : 0);
}
