// runs — the ONE home for run intermediates, and the ONE reader of the
// retention bound (kogaki#750, owner rulings 2026-09-01).
//
// Every lane's machine state — survey records, proposal records, gate
// declarations, captures, Brief and Draft workspaces, snapshots, packets, run
// records — lands under `runs/<lane>/` in the working tree. That is a MOVE and
// not a reclassification: the state is still machine-facing and still
// uncommitted (`specs/SPEC.md` §4 rider 3), and `.gitignore` keeps it so. What
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
export const LANES = Object.freeze(["terrain", "brief", "draft"]);

// Entries a lane's pruning never removes, by name. `runs/terrain/reports/` is
// the report RECORD store, whose home is stable by §12.2's own argument — the
// same identity run twice is ONE report, which a timestamped-and-pruned
// directory would make false by construction. It sits inside the lane rather
// than beside it because the ruling names three lane directories and no fourth
// sibling, so the exemption is stated here rather than the layout bent to
// avoid stating it.
const ALWAYS_EXEMPT = Object.freeze({ terrain: ["reports"], brief: [], draft: [] });

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
  if (typeof entry !== "string" || entry === "" || entry.includes("/") || entry.includes("\\")) {
    refuse(`a run entry name must be a single path segment — got \`${entry}\``);
  }
  return join(laneDir(lane, root), entry);
}

export function terrainRunEntry(now = new Date()) {
  return `terrain-${now.toISOString().replace(/[:.]/g, "-")}`;
}

// THE BOUND'S ONE READER (owner selection 2026-09-03 at the #750 pickup). Every
// lane's K comes from here and none is restated at a call site.
//
// A MISSING OR MALFORMED BLOCK FAILS LOUDLY rather than returning a permissive
// default, exactly as `subdivisionLimits` does for §8's caps: a default here
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
  const k = keep === null ? keepLast(lane, configPath) : keep;
  if (!Number.isInteger(k) || k < 1) {
    refuse(`keep-last must be a positive integer — got ${k}`);
  }
  const dir = laneDir(lane, root);
  const exempt = new Set([...ALWAYS_EXEMPT[lane], ...(entry ? [entry] : [])]);
  const candidates = entriesByAge(dir).filter((e) => !exempt.has(e.name));
  // The run's own entry occupies one of the K slots, so K-1 remain for the
  // others. This is what makes the K+1th run's start remove exactly the oldest.
  const room = entry ? k - 1 : k;
  const doomed = candidates.slice(Math.max(room, 0));
  for (const e of doomed) removeWithin(dir, e.name);
  return doomed.map((e) => e.name);
}

// Prune, prepare, and hand back the destination — the ordinary lane entry
// point, in the order the ruling gives: pruning is the run's FIRST act, before
// anything is written.
export function enterRun(lane, entry, opts = {}) {
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


// ---------------------------------------------------------------------------
// The fixture pass (kogaki#750). Seam-free: every case builds its own lane tree
// under its OWN scratch root and the whole scratch is removed at the end, so
// the pass never touches this repository's `runs/` — a retention test that
// pruned the developer's live workspaces would be the isolate-the-test-not-the-
// invariant defect, and this is the one module where the failure would delete
// work rather than report it. That isolation is why `laneDir`,
// `pruneLaneForRun` and `enterRun` all take a `root`.
//
// A ROOT PER CASE, not a shared one: a case whose premise is what an earlier
// case left behind fails for reasons its own name does not describe, and the
// repair then silently changes what a third case was asserting.
function selfTest() {
  const fails = [];
  let cases = 0;
  const ok = (name, cond, detail = "") => {
    cases += 1;
    if (!cond) fails.push(`${name}${detail ? ` — ${detail}` : ""}`);
  };
  const refuses = (name, fn, ...needles) => {
    cases += 1;
    try {
      fn();
      fails.push(`${name} — no refusal was raised`);
    } catch (e) {
      if (!(e instanceof RunsRefusal)) {
        fails.push(`${name} — threw ${e && e.name} rather than RunsRefusal`);
        return;
      }
      for (const n of needles) {
        if (!e.message.includes(n)) {
          fails.push(`${name} — the refusal does not name ${JSON.stringify(n)}: ${e.message}`);
        }
      }
    }
  };

  const scratch = join(tmpdir(), `kogaki-runs-selftest-${process.pid}-${Date.now()}`);
  let n = 0;
  // A fresh root holding one lane populated oldest-first. Distinct mtimes are
  // set explicitly, so "the oldest" is a fact about the tree rather than about
  // the order readdir happens to return.
  const fixture = (lane, entries) => {
    const root = join(scratch, `r${++n}`);
    const dir = join(root, lane);
    mkdirSync(dir, { recursive: true });
    entries.forEach((e, i) => {
      const d = join(dir, e);
      mkdirSync(d, { recursive: true });
      const t = new Date(Date.now() - (entries.length - i) * 60000);
      utimesSync(d, t, t);
    });
    return { root, dir };
  };
  const names = (dir) => (existsSync(dir) ? readdirSync(dir).sort() : []);

  try {
    // (a) THE RESOLVERS ARE PURE — they create nothing. Asserted against a root
    // that does not exist: a resolver that prepared its destination would leave
    // it behind, which is the split terrain made at PR #702 finding 2.
    const virgin = join(scratch, "virgin");
    ok("(a) laneDir resolves under the root it is given",
      laneDir("draft", virgin) === join(virgin, "draft"), laneDir("draft", virgin));
    ok("(a) runDestination composes lane and entry",
      runDestination("draft", "some-slug", virgin) === join(virgin, "draft", "some-slug"));
    ok("(a) neither resolver creates anything", !existsSync(virgin));

    // (b) The lane set is CLOSED, and the refusal names both the member and the
    // set — a lane nobody listed is a directory nothing prunes.
    refuses("(b) an unlisted lane refuses by name",
      () => laneDir("terain", virgin), "terain", "terrain, brief, draft");

    // (c) An entry name is ONE path segment. A slug arriving with a separator
    // would write outside the lane it was pruned within.
    refuses("(c) an entry name carrying a separator refuses",
      () => runDestination("draft", "a/b", virgin), "single path segment");
    refuses("(c) an empty entry name refuses",
      () => runDestination("draft", "", virgin), "single path segment");

    // (d) KEEP-LAST, the arithmetic: five entries, K=3, one new entry — the
    // three oldest go, because the run's own entry occupies one of the slots.
    const d1 = fixture("draft", ["e1", "e2", "e3", "e4", "e5"]);
    const removed = pruneLaneForRun("draft", "e6", { keep: 3, root: d1.root });
    ok("(d) the three oldest are removed",
      JSON.stringify(removed.sort()) === JSON.stringify(["e1", "e2", "e3"]), JSON.stringify(removed));
    ok("(d) two survivors remain, leaving one slot for this run",
      JSON.stringify(names(d1.dir)) === JSON.stringify(["e4", "e5"]), JSON.stringify(names(d1.dir)));

    // (e) THE ACCEPTANCE CASE as the issue states it: with K configured, the
    // K+1th run's start removes THE OLDEST — exactly one, never a sweep.
    const b1 = fixture("brief", ["b1", "b2", "b3"]);
    const removed2 = pruneLaneForRun("brief", "b4", { keep: 3, root: b1.root });
    ok("(e) the K+1th run removes exactly the oldest",
      JSON.stringify(removed2) === JSON.stringify(["b1"]), JSON.stringify(removed2));
    ok("(e) and leaves the rest",
      JSON.stringify(names(b1.dir)) === JSON.stringify(["b2", "b3"]), JSON.stringify(names(b1.dir)));

    // (e2) A lane directory that does not exist yet prunes nothing and refuses
    // nothing — the first run of a lane is the ordinary case, not an error.
    const empty = pruneLaneForRun("draft", "first", { keep: 3, root: join(scratch, "nothing-here") });
    ok("(e2) an absent lane directory prunes nothing", empty.length === 0, JSON.stringify(empty));

    // (f) OVERWRITE-IN-PLACE: re-entering an entry that already exists is not a
    // new run for the bound's purposes, so a lane sitting at exactly K prunes
    // NOTHING. Without this, the second run of the same Brief would delete a
    // sibling Brief's workspace as the price of re-running itself.
    const b2 = fixture("brief", ["s1", "s2", "s3"]);
    const removed3 = pruneLaneForRun("brief", "s2", { keep: 3, root: b2.root });
    ok("(f) re-entering an existing entry prunes nothing", removed3.length === 0, JSON.stringify(removed3));
    ok("(f) and the lane is untouched",
      JSON.stringify(names(b2.dir)) === JSON.stringify(["s1", "s2", "s3"]), JSON.stringify(names(b2.dir)));

    // (g) A LANE NEVER PRUNES ANOTHER LANE (acceptance 3). The control is the
    // OTHER lane's contents being identical afterwards: an assertion over the
    // return value alone would pass while the tree was wrong.
    const g = fixture("draft", ["d1", "d2", "d3", "d4"]);
    const gTerrain = join(g.root, "terrain");
    mkdirSync(gTerrain, { recursive: true });
    for (const e of ["t1", "t2", "t3"]) mkdirSync(join(gTerrain, e), { recursive: true });
    const beforeOther = JSON.stringify(names(gTerrain));
    pruneLaneForRun("draft", "d5", { keep: 2, root: g.root });
    ok("(g) the pruned lane shrank to its bound",
      JSON.stringify(names(g.dir)) === JSON.stringify(["d4"]), JSON.stringify(names(g.dir)));
    ok("(g) the other lane is untouched",
      JSON.stringify(names(gTerrain)) === beforeOther, JSON.stringify(names(gTerrain)));

    // (h) `runs/terrain/reports/` survives its own lane's prune even as the
    // OLDEST entry. §12.1's same-identity-run-twice-is-ONE-report claim spans
    // runs, and a keep-last window would falsify it on the K+1th run rather
    // than at any review point.
    const h = fixture("terrain", ["reports", "v1", "v2", "v3"]);
    const removed4 = pruneLaneForRun("terrain", "v4", { keep: 2, root: h.root });
    ok("(h) reports is never a prune candidate", !removed4.includes("reports"), JSON.stringify(removed4));
    ok("(h) it is still on disk beside the newest run",
      names(h.dir).includes("reports") && names(h.dir).includes("v3"), JSON.stringify(names(h.dir)));
    ok("(h) and the ordinary entries were pruned to the bound",
      JSON.stringify(names(h.dir)) === JSON.stringify(["reports", "v3"]), JSON.stringify(names(h.dir)));

    // (i) THE CONTROL for (h): the exemption is per LANE and not a blanket on
    // the name. A directory called `reports` in the Brief lane is ordinary run
    // state and is pruned like any other.
    const i2 = fixture("brief", ["reports", "w1", "w2"]);
    const removed5 = pruneLaneForRun("brief", "w3", { keep: 1, root: i2.root });
    ok("(i) `reports` outside the terrain lane is prunable", removed5.includes("reports"), JSON.stringify(removed5));
    ok("(i) and it is gone", !names(i2.dir).includes("reports"), JSON.stringify(names(i2.dir)));

    // (j) THE CONTAINMENT GUARD, reached directly: every name it sees in
    // production comes from readdir, which cannot express either of these, so
    // the guard's condition never arises on the live path and its deletion
    // would leave no trace.
    refuses("(j) a name escaping the lane refuses",
      () => removeWithin(join(scratch, "draft"), ".."), "outside the lane directory");
    refuses("(j) the lane root itself refuses",
      () => removeWithin(join(scratch, "draft"), "."), "outside the lane directory");

    // (k) THE BOUND'S CARRIER fails LOUDLY. A missing lane, a zero and a
    // non-integer each refuse and name the lane; a permissive default here
    // would restore unbounded growth with every check still green.
    const cfg = (obj) => {
      const f = join(scratch, `cfg-${++n}.json`);
      mkdirSync(scratch, { recursive: true });
      writeFileSync(f, JSON.stringify(obj));
      return f;
    };
    const full = { terrain: { keep_last: 3 }, brief: { keep_last: 3 }, draft: { keep_last: 3 } };
    refuses("(k) a lanes block missing a lane refuses, naming it",
      () => keepLast("draft", cfg({ lanes: { terrain: full.terrain, draft: full.draft } })), "brief");
    refuses("(k) keep_last of 0 refuses",
      () => keepLast("draft", cfg({ lanes: { ...full, draft: { keep_last: 0 } } })), "draft");
    refuses("(k) a non-integer keep_last refuses",
      () => keepLast("draft", cfg({ lanes: { ...full, draft: { keep_last: "10" } } })), "draft");
    refuses("(k) an unreadable carrier refuses",
      () => keepLast("draft", join(scratch, "no-such-file.json")), "cannot be read");
    ok("(k) a complete block reads back", keepLast("brief", cfg({ lanes: full })) === 3);

    // (l) THE SHIPPED CARRIER, not a fixture: `src/runs.json` as it stands must
    // answer for all three lanes. A pass over fixtures alone stays green on a
    // repository whose real config is broken, which is the one state that
    // matters here.
    for (const lane of LANES) {
      const k = keepLast(lane);
      ok(`(l) src/runs.json declares a positive keep_last for ${lane}`,
        Number.isInteger(k) && k >= 1, String(k));
    }

    // (m) `enterRun` PRUNES BEFORE IT CREATES — the ruling's "first act". The
    // discriminator is that the destination exists AND the oldest is gone in
    // the same call: an existence assertion alone passes on a create-then-prune
    // that had already exceeded the bound.
    const m = fixture("draft", ["p1", "p2", "p3"]);
    const dest = enterRun("draft", "p4", { keep: 2, root: m.root });
    ok("(m) the destination exists", existsSync(dest), dest);
    ok("(m) and it is where the resolver said it would be",
      dest === runDestination("draft", "p4", m.root), dest);
    ok("(m) the prune ran in the same act",
      JSON.stringify(names(m.dir)) === JSON.stringify(["p3", "p4"]), JSON.stringify(names(m.dir)));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }

  if (fails.length) {
    process.stderr.write(`runs self-test: ${fails.length} failure(s)\n`);
    for (const f of fails) process.stderr.write(`  - ${f}\n`);
    process.exit(1);
  }
  console.log(`runs self-test: ${cases} case(s) pass`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  if (process.argv.includes("--self-test") || process.argv.includes("self-test")) {
    selfTest();
  } else {
    process.stderr.write("runs: this module is a library — its only command is `--self-test`\n");
    process.exit(1);
  }
}
