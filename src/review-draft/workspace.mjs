// review-draft/workspace — the workspace under `runs/review/<slug>/`, its split by pass and the run record.
// Cut from src/review-draft.mjs at its named section (kogaki#1458); the
// design and its rulings are stated at the entry and in the Issues each
// block below names.
//
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, dirname, basename, relative, sep } from "node:path";
import { enterRun } from "../runs.mjs";
import { fail } from "./draft-reader.mjs";

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
// Pass two used to overwrite pass one's outline inputs, outlines and join
// Packets in place, and `runs/` is gitignored, so the layout is the Harness's:
//   runs/review/<slug>/pass-1/{outline-input,outline,join,corrections,join.json}
//   runs/review/<slug>/pass-2/{outline-input,outline,join,check.json}
//   runs/review/<slug>/snapshots/     — before/after per corrected Leg
//   runs/review/<slug>/run.json
// A later third pass is `pass-3/` and NOTHING ELSE MOVES. `snapshots/` and
// `run.json` stay at the workspace root: a snapshot pair spans the correction
// between two passes, and the run record is the one file every pass writes.

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

export { slugOf, workspaceFor, readRun, writeRun, currentPass, requirePass, REVIEWED_BASENAME, passPath, passPathAt, passReadPath, requireCurrent };
