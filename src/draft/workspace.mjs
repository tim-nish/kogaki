// draft/workspace — the workspace, the language, the snapshot and the body assembly.
// Cut from src/draft.mjs at its named section (kogaki#1461); the design and
// its rulings are stated at the entry and in the Issues each block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-command: the three-layer boundary
//   SPEC-draft-pipeline: the Section grouping; the figure record; the
//       renderer and the anchor
//
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { waypointsRefusal, readParagraphPlanBeside } from "../compose.mjs";
import { renderFigure } from "../render-figure.mjs";
import { enterRun, laneDir } from "../runs.mjs";
import { fail, argString, readBrief } from "./brief-reader.mjs";

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
// lane act performed by a leg that owns no run.
export function workspaceFor(args, slug) {
  const base = typeof args.workspace === "string" && args.workspace !== ""
    ? args.workspace
    : laneDir("draft");
  return join(base, slug);
}

// The lane entry point, called by `resolve` alone: `resolve` is the run's first
// act, so the keep-last-K prune belongs there and nowhere else. A `--workspace`
// caller prunes nothing — they named the directory, so they hold it.
export function enterWorkspace(args, slug) {
  if (typeof args.workspace === "string" && args.workspace !== "") {
    const ws = workspaceFor(args, slug);
    mkdirSync(ws, { recursive: true });
    return ws;
  }
  return enterRun("draft", slug);
}

// ---------------------------------------------------------------------------
// THE JAPANESE REALIZATION (kogaki#1158; owner ruling 2026-09-19/20). A second
// realization of the SAME Brief Legs from the SAME Packet, with one added
// language block, never a translation of the reviewed English Draft. `--lang`
// defaults to `en`, and at `en` every path below resolves to exactly the string
// it always did, so the English path's behaviour is unchanged.
// The language a `--lang` track names on the Packet's language line (kogaki#1417), in
// place of the Audience's: the track's language block is written for that language.
export const REALIZATION_LANGUAGES = { ja: "Japanese" };
export function langOf(args) {
  const v = args.lang;
  return typeof v === "string" && v !== "" ? v : "en";
}

// A SECOND LANGUAGE GETS ITS OWN SUBDIRECTORY, never a second filename
// scheme in the same one: `sections/<id>.md` and `packets/<id>.md` are the
// English track's own paths, untouched, and a Japanese Leg's realized prose
// and Packet live at `sections/ja/<id>.md` / `packets/ja/<id>.md` instead of
// colliding with the English Leg of the same id.
export function sectionsDir(ws, lang) { return lang === "en" ? join(ws, "sections") : join(ws, "sections", lang); }
export function packetsDir(ws, lang) { return lang === "en" ? join(ws, "packets") : join(ws, "packets", lang); }
// run.json's packet-record key, for the SAME reason: `packets` is the
// English track's own key, untouched, and a non-English track's records live
// under `packets_<lang>` instead of overwriting the English Leg's record of
// the same id.
export function packetsRecordKey(lang) { return lang === "en" ? "packets" : `packets_${lang}`; }

// Per-block snapshot (kogaki#523 shape): the FULL assembled state, into
// the run workspace, before-and-after per section landing. A snapshot failure
// WARNS AND CONTINUES — the trace never gates the write it traces.
export function snapshotDraft(ws, phase, seq, content) {
  try {
    const dir = join(ws, "snapshots");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${String(seq).padStart(3, "0")}-${phase}.md`), content);
  } catch (e) {
    process.stderr.write(`draft: snapshot ${phase} skipped (${e.message}) — the trace never gates the write\n`);
  }
}

export function loadBrief(args) {
  const path = argString(args, "brief", "this command needs --brief <path to theses/<slug>/brief.yaml>");
  let text;
  try { text = readFileSync(path, "utf8"); }
  catch (e) { fail(`the Brief at ${path} cannot be read (${e.message})`); }
  const brief = readBrief(text, path);
  if (brief.refusals.length) fail(brief.refusals[0]);
  // THE LEG'S ROUTE AT THE REALIZATION ENTRY (kogaki#1311). A Leg carrying no
  // `waypoints` refuses by name through the composition side's own
  // `waypointsRefusal`, because the Packet renders the waypoints in place of the
  // Move. A Brief composed before the field is recomposed by `/brief`, never
  // patched here. NO MOVE ID IS RESOLVED HERE ANY MORE (kogaki#747 is retired):
  // the Move is read up to the Candidate and never again.
  if (args["moves-dir"] !== undefined) {
    fail("--moves-dir is no longer taken: /draft opens no Move file (kogaki#1311). A Leg carries its own "
      + "waypoints, written when the Brief was composed, and the Packet renders those");
  }
  for (const leg of brief.legs) {
    const strands = leg.claims.map((g) => g.strand);
    const bad = waypointsRefusal(leg.waypoints, strands, `the Brief at ${path}, leg ${leg.leg_id}`);
    if (bad) fail(bad);
  }
  // THE PARAGRAPH WAYPOINTS COME FROM THE PARAGRAPHPLAN FILE BESIDE THE BRIEF (kogaki#1375,
  // owner decision 2026-10-14): `/paragraph-plan` writes `paragraph-plan.yaml` next to
  // the Brief, naming the Brief's path and content hash, and /draft reads it here. A
  // missing file, and one made from a different Brief, are refused naming both files;
  // the Brief itself names nothing downstream. The file holds `point` and `serves` per
  // Paragraph Waypoint, or `performs` alone (kogaki#1448), and NOTHING OF A MOVE, so this
  // read opens no Move file either.
  const plan = readParagraphPlanBeside(path, text, brief.legs);
  if (plan.error) fail(plan.error);
  // THE JOIN RIDES BESIDE THEM (kogaki#1411): a Leg Waypoint after the first carries the
  // plan's `join`, which `waypointLines` renders as its Opens-from line. So do its Obligation
  // rows and its discharges (kogaki#1530), each discharge carrying the Brief row it names.
  const briefRows = Array.isArray(brief.record && brief.record.obligations) ? brief.record.obligations : [];
  const legs = brief.legs.map((leg) => ({ ...leg,
    waypoints: leg.waypoints.map((w, i) => {
      const join = plan.joins.get(leg.leg_id)[i];
      const obligations = plan.obligations.get(leg.leg_id)[i];
      const discharges = plan.discharges.get(leg.leg_id)[i].map((d) => ({ ...d, row: briefRows[d.obligation - 1] }));
      return { ...w, ...(join ? { join } : {}), paragraph_waypoints: plan.waypoints.get(leg.leg_id)[i],
        ...(obligations.length ? { obligations } : {}), ...(discharges.length ? { discharges } : {}) };
    }) }));
  return { ...brief, legs, path: resolve(path), paragraphPlanPath: plan.path };
}

// the Section grouping's SECTION GROUPING, derived from the Brief and from nothing
// else (kogaki#823): ONE derivation shared by the renderer, the frontmatter trace
// and the Packet. A Section is a run of Legs beginning at a Leg that declares
// `opens_section` and continuing until the next one does. A path declaring none
// derives ONE untitled Section rather than refusing; that refusal is
// composition's (`sectionGroupingRefusal`), where the Brief can still be fixed.
export function sectionsOf(legs) {
  const sections = [];
  for (const s of legs) {
    if (s.opens_section !== undefined || sections.length === 0) {
      sections.push({ index: sections.length + 1, title: s.opens_section, leg_ids: [] });
    }
    sections[sections.length - 1].leg_ids.push(s.leg_id);
  }
  return sections;
}

// The per-Leg view of the same derivation: leg_id -> its Section, and whether
// this Leg is the one that OPENS it. Both consumers need the mapping keyed
// this way and neither should re-walk the runs to get it.
export function sectionOfLeg(legs) {
  const map = new Map();
  for (const sec of sectionsOf(legs)) {
    for (const id of sec.leg_ids) {
      map.set(id, { index: sec.index, title: sec.title, opens: id === sec.leg_ids[0], leg_ids: sec.leg_ids });
    }
  }
  return map;
}

// THE FIGURE BLOCKS THIS BODY PLACES (the renderer and the anchor, kogaki#879),
// read from the run record `figure` wrote, rendered by src/render-figure.mjs,
// keyed by Leg. READ, NEVER RE-DERIVED: the pin answers for the record the
// figure was validated as. A RENDER FAILURE IS COLLECTED, NEVER THROWN, because
// this runs inside `snapshotDraft` on every `section`; `cmdEmit` refuses on the
// collected errors.
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
    catch (e) { errors.push(`leg ${id}: the figure record at ${rec.path} is not readable JSON (${e.message}) — it was written by \`figure\` and validated then, so a record unreadable now was edited outside the Harness`); continue; }
    const r = renderFigure(record);
    if (r.error) { errors.push(`leg ${id}: ${r.error}`); continue; }
    out.set(id, { markup: r.markup, position: rec.position === "before" ? "before" : "after", path: rec.path, sha256: rec.sha256 });
  }
  return { blocks: out, errors };
}

// THE HEADING IS THE HARNESS'S, WRITTEN HERE AND NOWHERE ELSE (kogaki#823).
// `emit` used to concatenate the realized prose and write no heading at all,
// which left the heading to whatever the model happened to produce — five
// headings for five Legs in the 2026-09-03 specimen, the fragmentation half of
// the pair the owner rejected. Deriving them from the Brief's declaration is
// what makes a heading-per-Leg draft UNPRODUCIBLE rather than detected: there
// is no input to this function from which one could come.
export function assembleBody(brief, ws, lang = "en") {
  const parts = [];
  const missing = [];
  // THE RANGE RIDES THE WALK THAT PRODUCES THE PROSE (kogaki#868). Line
  // accounting computed anywhere else is a second derivation of where a Leg
  // sits, and two derivations agree until one is edited; here the range and the
  // bytes it points at cannot disagree, because the same `push` produces both.
  // Body-relative and 1-based; `cmdEmit` offsets by the frontmatter it writes.
  const ranges = new Map();
  let line = 1;
  const push = (text) => {
    const span = [line, line + text.split("\n").length - 1];
    parts.push(text);
    // The `\n\n` join below leaves exactly one blank line between blocks, and
    // that blank line belongs to no Leg.
    line = span[1] + 2;
    return span;
  };
  // THE TITLE IS THE THESIS, RENDERED FIRST (kogaki#1327, design item 1). It
  // is pushed by the same `push` every other block is, so its line and the
  // bytes it points at cannot disagree — the kogaki#868 property, extended to
  // the one line the body carries that no Leg and no Section wrote.
  push(`# ${brief.thesis}`);
  const sections = sectionsOf(brief.legs);
  const opensAt = new Map();
  for (const sec of sections) opensAt.set(sec.leg_ids[0], sec);
  // THE FIGURE IS ANCHORED TO ITS LEG, INSIDE ITS SECTION (the renderer and the anchor, kogaki#879).
  // It is pushed by the same `push` the prose is, so its range and the bytes it
  // points at cannot disagree — the kogaki#868 property, extended to the one
  // element the body carries that no Leg wrote.
  //
  // NO LEG STRUCTURE BECOMES VISIBLE. The block is a rendered element the
  // Brief declared, in the same standing as a heading: it carries no id, no
  // key line and no marker a reader could read the trace off, so
  // `findTraceStructure`'s subject is untouched by it.
  const { blocks: figures, errors: figureErrors } = figureBlocks(ws);
  const figureRanges = new Map();
  for (const leg of brief.legs) {
    const f = join(sectionsDir(ws, lang), `${leg.leg_id}.md`);
    if (!existsSync(f)) { missing.push(leg.leg_id); continue; }
    const sec = opensAt.get(leg.leg_id);
    // An untitled Section renders no heading rather than an empty one. It is
    // reachable only on a pre-Section-grouping path, whose whole body is one Section.
    // A heading line belongs to the Section, never to the Leg that opened it.
    if (sec && sec.title !== undefined) push(`## ${sec.title}`);
    const fig = figures.get(leg.leg_id);
    // `before` sets the prose up and `after` discharges it (the figure record's closed
    // pair). The heading is pushed above either way: a figure never precedes
    // the heading of the Section it sits in.
    if (fig && fig.position === "before") figureRanges.set(leg.leg_id, push(fig.markup));
    // THE LEG'S OWN `lines` SPAN THE PROSE ALONE (kogaki#868, restated at
    // the renderer and the anchor). The figure's bytes are the Brief's declaration realized by the
    // Harness, not the Leg's realized prose, and kogaki#870's blind recovery
    // quotes a Leg at exactly these lines — a range that swallowed the block
    // would hand the reviewer markup to re-derive prose from.
    ranges.set(leg.leg_id, push(readFileSync(f, "utf8").trim()));
    if (fig && fig.position === "after") figureRanges.set(leg.leg_id, push(fig.markup));
  }
  return { body: parts.join("\n\n"), missing, ranges, figureRanges, figures, figureErrors };
}
