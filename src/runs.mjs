// runs — the ONE home for run intermediates, and the ONE reader of the
// retention bound (kogaki#750, owner rulings 2026-09-01).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
// already drifted into eight variants, which is what kogaki#982 collapsed.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   Human-facing files live where the human works
//       specs/SPEC.md
//   Where machine state lives
//       specs/SPEC.md
//   Location and naming
//       SPEC-terrain
//   Identity — the quadruple
//       SPEC-terrain
//   Semantic subdivision — a judged substrate one level down
//       SPEC-terrain
//
// Every lane's machine state — survey records, proposal records, gate
// declarations, captures, Brief and Draft workspaces, snapshots, packets, run
// records — lands under `runs/<lane>/` in the working tree. That is a MOVE and
// not a reclassification: machine-readable intermediates, caches, journals and
// resumable run state live in machine-state directories, so the state is still
// machine-facing and still uncommitted, and `.gitignore` keeps it so. `runs/`
// is not a hidden path, so the separate rule that no owner-facing output prints
// a hidden path is untouched by the move.
// [implemented-against: specs/SPEC.md "Human-facing files live where the human
// works", and its "Where machine state lives" amendment, copied 2026-09-06]
// What
// changes is that it is now legible where a contributor works instead of
// accumulating unbounded in `~/.kogaki`, which nothing pruned and nobody read.
//
// THE DESTINATION IS RESOLVED PURELY AND PREPARING IT IS A SECOND ACT — the
// same split `terrain.mjs` makes between `renderingDestination` and
// `renderingsDir` (PR #702 round 1, finding 2). A caller that only wants to
// know WHERE a run would land must not create it, and a guard that reads a
// destination must not prune as a side effect of asking.
//
// PRUNING IS IN-BAND AND NEVER A SCHEDULE: a run prunes its OWN lane as its
// first act, so the mechanism runs exactly when a run runs and there is no
// recurring reader to install, supervise or fail silently. `product-lab`'s
// recurring-execution bar is the ground; a cron entry would also be a carrier
// nothing in this repository could see.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

// Resolved from THIS MODULE's location, never from the cwd a command happens
// to be invoked in. `terrain.mjs`'s `repoRoot()` shells out to `git rev-parse`
// and is right for the OWNER rendering, which must land at the root of
// whatever checkout the owner is standing in; run state is different — it
// belongs to the tree the code was loaded from, and a `runs/` directory minted
// in a subdirectory because that is where somebody stood is the
// location-picked-by-convenience defect one layer down.
export const RUNS_ROOT = join(REPO, "runs");

// The closed lane set. A lane outside it refuses BY NAME rather than minting a
// directory: `runs/` is enumerated by a human, and a typo that silently
// creates `runs/terain/` produces a lane nothing prunes.
export const LANES = Object.freeze(["terrain", "brief", "draft", "review"]);

// Entries a lane's pruning never removes, by name. `runs/terrain/reports/` is
// the report RECORD store, and its home is stable because identity and
// idempotence are carried by the machine record ALONE — the owner rendering is
// a fixed human name overwritten on every pull, and the machine record is
// identity-named, which is what identity-naming is for. Two runs matching on
// the report identity are ONE report, which a timestamped-and-pruned directory
// would make false by construction.
// [implemented-against: SPEC-terrain "Location and naming", for the
// machine-record-alone rule, and SPEC-terrain "Identity — the quadruple", for
// what makes two runs the same report; copied 2026-09-06. The section numbers
// this comment previously carried named only the first of the two.] It sits inside the lane rather
// than beside it because the ruling names three lane directories and no fourth
// sibling, so the exemption is stated here rather than the layout bent to
// avoid stating it.
// `runs/brief/entries/` holds the PRE-THESIS run records, which have no slug to
// key on — the slug is what the thesis-determination gate decides — so they are
// timestamped and one arrives per `brief enter`. They are exempt from the lane
// prune and bounded INSIDE their own directory, because the two kinds share a
// lane and not a lifetime: a slug workspace lives as long as its Brief is being
// worked, while an entry record is dead the moment its run adopts or is
// abandoned. Under one budget, ten entries — the front door, and the cheapest
// command to re-run after an abandoned start — evict every Brief's snapshot
// trace (PR #783 round 1, finding 3).
const ALWAYS_EXEMPT = Object.freeze({ terrain: ["reports"], brief: ["entries"], draft: [], review: [] });

// The one sub-directory carrying its own bound, named here rather than passed
// by a caller: a caller that could name any sub-directory could exempt any
// entry from its lane's prune by writing into it.
export const BRIEF_ENTRIES = "entries";

const CONFIG = join(REPO, "src/runs.json");

// REFUSALS THROW, they do not exit — the same arrangement `format-guard.mjs`
// uses for `FormatRefusal`, and for the same two reasons: a library that exits
// cannot be asserted against by a fixture pass in the same process, and a lane
// that knows how it wants to fail should not have that decided for it three
// imports away. Each lane entry point catches this and renders it as its own
// refusal; a bad LANE NAME is a programmer error rather than owner input and is
// deliberately left to propagate as a stack.
export class RunsRefusal extends Error {
  constructor(message) {
    super(message);
    this.name = "RunsRefusal";
  }
}

function refuse(msg) {
  throw new RunsRefusal(`runs: ${msg}`);
}

export function isLane(lane) {
  return LANES.includes(lane);
}

function requireLane(lane) {
  if (!isLane(lane)) {
    refuse(`\`${lane}\` is not a lane — the lanes are ${LANES.join(", ")} `
      + "(kogaki#750). A lane is added by naming it here, never by a caller "
      + "passing a new string: an unlisted lane would be a directory nothing prunes.");
  }
  return lane;
}

// PURE. Creates nothing, reads nothing, prunes nothing.
export function laneDir(lane, root = RUNS_ROOT) {
  return join(root, requireLane(lane));
}

// PURE. The destination for one run entry in a lane — a slug for the Brief and
// Draft lanes, a timestamp for Terrain, which has no identity to overwrite in
// place.
export function runDestination(lane, entry, root = RUNS_ROOT) {
  requireEntryName(entry);
  return join(laneDir(lane, root), entry);
}

// THE GUARD IS THE CONTRACT ITS OWN REFUSAL STATES (PR #783 round 1). The first
// form rejected the empty string and the two separators, so `.` and `..` passed
// a check whose message reads "a single path segment" — and `..` resolves to the
// lane root's PARENT, which `removeWithin` would then have to catch on the way
// out rather than this refusing on the way in.
//
// AND IT IS CALLED BEFORE THE PRUNE, not after. `enterRun` used to prune with
// the entry as the exempt name and validate only when composing the
// destination, so a malformed entry matched nothing, pruned the lane to K-1,
// and only then refused: the refusal was real and so was the deletion. Neither
// half is reachable today — terrain and brief entries are generated timestamps
// and a draft slug is validated by SLUG_RE before it arrives — which is exactly
// the condition under which a guard's absence leaves no trace.
function requireEntryName(entry) {
  if (typeof entry !== "string" || entry === "" || entry === "." || entry === ".."
      || entry.includes("/") || entry.includes("\\")) {
    refuse(`a run entry name must be a single path segment — got \`${entry}\``);
  }
  return entry;
}

export function terrainRunEntry(now = new Date()) {
  return `terrain-${now.toISOString().replace(/[:.]/g, "-")}`;
}

// THE BOUND'S ONE READER (owner selection 2026-09-03 at the #750 pickup). Every
// lane's K comes from here and none is restated at a call site.
//
// A MISSING OR MALFORMED BLOCK FAILS LOUDLY rather than returning a permissive
// default, exactly as `subdivisionLimits` does for the subdivision caps
// [see: SPEC-terrain "Semantic subdivision — a judged substrate one level
// down"]: a default here
// would silently delete the bound the owner ruled, and unbounded growth is the
// condition this whole change exists to end — a silent K of Infinity would
// restore it while every check stayed green.
export function keepLast(lane, configPath = CONFIG) {
  requireLane(lane);
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (e) {
    refuse(`src/runs.json cannot be read (${e && e.message ? e.message : e}) — it carries `
      + "the keep-last bound for every lane (kogaki#750) and there is no default.");
  }
  const lanes = cfg && cfg.lanes;
  const missing = LANES.filter((l) => !lanes || !lanes[l]
    || !Number.isInteger(lanes[l].keep_last) || lanes[l].keep_last < 1);
  if (missing.length) {
    refuse("src/runs.json declares no complete `lanes` block, so the keep-last bound cannot "
      + `be read (kogaki#750); ${missing.join(", ")} carries no positive integer \`keep_last\`. `
      + "EVERY lane is checked rather than the one being asked for, because a lane whose bound "
      + "is deleted prunes nothing and grows without limit, and the run that would notice is "
      + "the one that never reads this key.");
  }
  return lanes[lane].keep_last;
}

// Prepare a lane's directory. The second act, kept apart from `laneDir`.
export function prepareLane(lane, root = RUNS_ROOT) {
  const dir = laneDir(lane, root);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function entriesByAge(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      let mtime = 0;
      try { mtime = statSync(join(dir, d.name)).mtimeMs; } catch { mtime = 0; }
      return { name: d.name, mtime };
    })
    // Newest first, name as the tiebreak so the order is total and a run that
    // mints two entries in the same millisecond still prunes deterministically.
    .sort((a, b) => (b.mtime - a.mtime) || a.name.localeCompare(b.name));
}

// A LANE NEVER PRUNES ANOTHER LANE, and that is asserted rather than argued
// from the path expression: every removal target is resolved and required to
// sit strictly inside this lane's own directory. The expression is correct
// today; the guard is what makes it stay correct after an entry name arrives
// from somewhere else.
// EXPORTED so the containment guard is REACHABLE by a case (the same reason
// `terrain.mjs` exports `retireIdentityNamedRenderings`). Every name this
// function receives in production comes from `readdirSync`, which cannot yield
// `..` or an absolute path — so the guard's condition never arises on the live
// path, and a guard whose condition never arises leaves no trace of having been
// deleted. Exporting it costs nothing and buys the one case that runs.
export function removeWithin(laneRoot, name) {
  const target = resolve(join(laneRoot, name));
  const root = resolve(laneRoot);
  // ONE condition, not two. `target === root ||` stood here and no case could
  // tell it from its absence: `resolve` strips a trailing separator, so the
  // lane root itself already fails `startsWith(root + sep)`. A clause a
  // mutation cannot reach is a clause the next reader must re-derive.
  if (!target.startsWith(root + sep)) {
    refuse(`refusing to prune \`${name}\` — it resolves outside the lane directory ${root}. `
      + "A lane prunes its own runs and nothing else (kogaki#750 acceptance 3).");
  }
  rmSync(target, { recursive: true, force: true });
}

// The in-band prune. Called by a lane as its FIRST act, naming the entry this
// run is about to write — which is retained whether or not it exists yet, so
// the bound holds identically for a lane that mints a new directory each run
// (Terrain) and one that overwrites a slug in place (Brief, Draft).
//
// Returns the names removed, so a caller can say so once rather than leaving
// the owner to notice a directory gone.
export function pruneLaneForRun(lane, entry, { keep = null, configPath = CONFIG, root = RUNS_ROOT } = {}) {
  requireLane(lane);
  if (entry !== null && entry !== undefined) requireEntryName(entry);
  const k = keep === null ? keepLast(lane, configPath) : keep;
  return pruneWithin(laneDir(lane, root), entry, k, ALWAYS_EXEMPT[lane]);
}

// The prune, over ONE directory. Split out because the Brief lane holds two
// kinds of entry with two lifetimes (PR #783 round 1, finding 3) and each needs
// its own budget: a shared one lets ten `brief enter` invocations evict the
// snapshot workspaces of Briefs being actively worked.
export function pruneWithin(dir, entry, keep, alwaysExempt = []) {
  if (!Number.isInteger(keep) || keep < 1) {
    refuse(`keep-last must be a positive integer — got ${keep}`);
  }
  const exempt = new Set([...alwaysExempt, ...(entry ? [entry] : [])]);
  const candidates = entriesByAge(dir).filter((e) => !exempt.has(e.name));
  // The run's own entry occupies one of the K slots, so K-1 remain for the
  // others. This is what makes the K+1th run's start remove exactly the oldest.
  const room = entry ? keep - 1 : keep;
  const doomed = candidates.slice(Math.max(room, 0));
  for (const e of doomed) removeWithin(dir, e.name);
  return doomed.map((e) => e.name);
}

// Prune, prepare, and hand back the destination — the ordinary lane entry
// point, in the order the ruling gives: pruning is the run's FIRST act, before
// anything is written.
export function enterRun(lane, entry, opts = {}) {
  requireEntryName(entry);
  const removed = pruneLaneForRun(lane, entry, opts);
  if (removed.length) {
    // The DIRECTORY, not the string `runs/<lane>/`: a fixture pass drives this
    // against a scratch root, and a message naming the repository path while
    // deleting somewhere else is a true-sounding line about the wrong place.
    process.stderr.write(`runs: pruned ${removed.length} run(s) beyond keep-last from `
      + `${laneDir(lane, opts.root || RUNS_ROOT)} (${removed.join(", ")})\n`);
  }
  const dest = runDestination(lane, entry, opts.root || RUNS_ROOT);
  mkdirSync(dest, { recursive: true });
  return dest;
}

// The same act one level down: prune and create inside a lane's own bounded
// sub-directory. `sub` is not free — only the names this module declares can be
// used, since an arbitrary sub-directory would be a way to hold entries the
// lane's prune never sees.
export function enterSubRun(lane, sub, entry, opts = {}) {
  requireLane(lane);
  requireEntryName(entry);
  if (!ALWAYS_EXEMPT[lane].includes(sub)) {
    refuse(`\`${sub}\` is not a bounded sub-directory of the ${lane} lane — `
      + `the declared ones are ${ALWAYS_EXEMPT[lane].join(", ") || "(none)"}`);
  }
  const root = opts.root || RUNS_ROOT;
  const dir = join(laneDir(lane, root), sub);
  mkdirSync(dir, { recursive: true });
  const k = opts.keep === undefined || opts.keep === null
    ? keepLast(lane, opts.configPath || CONFIG) : opts.keep;
  const removed = pruneWithin(dir, entry, k);
  if (removed.length) {
    process.stderr.write(`runs: pruned ${removed.length} run(s) beyond keep-last from `
      + `${dir} (${removed.join(", ")})\n`);
  }
  const dest = join(dir, entry);
  mkdirSync(dest, { recursive: true });
  return dest;
}
