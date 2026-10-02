#!/usr/bin/env node
// checks/runs-cases.mjs — the run-retention module's fixture pass
// (kogaki#750), moved here from `src/runs.mjs --self-test` under kogaki#1238:
// a Test lives only under the declared Check root. Seam-free: every case
// builds its own lane tree under its own scratch root; the cases are the same
// cases, verbatim. Run by checks/check-runs-retention.sh, which reads the
// count this file prints against the registry's `case_floor`.
import { existsSync, mkdirSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BRIEF_ENTRIES, LANES, RunsRefusal, enterRun, enterSubRun, keepLast, laneDir, pruneLaneForRun, pruneWithin, removeWithin, runDestination } from "../src/runs.mjs";

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
    // `.` and `..` PASSED the first form of this guard while its own refusal
    // said "a single path segment" (PR #783 round 1): `..` resolves to the lane
    // root's parent, so the containment check had to catch on the way out what
    // this refuses on the way in.
    refuses("(c) a dot entry name refuses",
      () => runDestination("draft", ".", virgin), "single path segment");
    refuses("(c) a dot-dot entry name refuses",
      () => runDestination("draft", "..", virgin), "single path segment");
    // AND THE VALIDATION PRECEDES THE PRUNE. `enterRun` used to prune with the
    // entry as the exempt name and validate only when composing the
    // destination, so a malformed entry matched nothing, pruned the lane to
    // K-1, and only then refused — a real deletion behind a real refusal. The
    // discriminator is the TREE after the refusal, not the refusal itself.
    {
      const c2 = fixture("draft", ["x1", "x2", "x3"]);
      refuses("(c) a malformed entry refuses at enterRun",
        () => enterRun("draft", "a/b", { keep: 2, root: c2.root }), "single path segment");
      ok("(c) and nothing was pruned before the refusal",
        JSON.stringify(names(c2.dir)) === JSON.stringify(["x1", "x2", "x3"]), JSON.stringify(names(c2.dir)));
    }

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
    // OLDEST entry. Two runs matching on the report identity are ONE report,
    // and that claim spans runs, so a keep-last window would falsify it on the
    // K+1th run rather than at any review point.
    // [implemented-against: SPEC-terrain "Identity — the quadruple",
    // copied 2026-09-06]
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

    // (n) THE BRIEF LANE'S TWO ENTRY KINDS DO NOT COMPETE (PR #783 round 1,
    // finding 3). Pre-Thesis run records have no slug to key on, so they are
    // timestamped and one arrives per `brief enter`; slug workspaces live as
    // long as their Brief is worked. Under one budget the front door evicts the
    // work — ten entries and every Brief's snapshot trace is gone. The entries
    // live in their own bounded sub-directory, exempt from the lane prune.
    {
      const nf = fixture("brief", ["slug-a", "slug-b", "slug-c"]);
      // THE ENTRIES ARE AGED EXPLICITLY, exactly as `fixture` ages a lane's
      // workspaces, and for the same reason stated there: which entry is "the
      // oldest" must be a fact about the tree rather than about the order the
      // machine happened to run in. Four `enterSubRun` calls can land inside
      // one millisecond, and the prune's name tiebreak then keeps the LOWEST
      // names — so this case went red on a clean head roughly one run in two
      // (kogaki#788). The bound is what is under test here; the tiebreak is
      // asserted on its own, below, on entries whose mtimes are equal BY
      // CONSTRUCTION rather than by luck.
      let aged = 0;
      const age = (dest) => {
        const t = new Date(Date.now() - (10 - ++aged) * 60000);
        utimesSync(dest, t, t);
        return dest;
      };
      const e1 = age(enterSubRun("brief", BRIEF_ENTRIES, "entry-1", { keep: 2, root: nf.root }));
      ok("(n) the entry lands under the lane's entries directory",
        e1 === join(nf.dir, BRIEF_ENTRIES, "entry-1"), e1);
      for (const e of ["entry-2", "entry-3", "entry-4"]) {
        age(enterSubRun("brief", BRIEF_ENTRIES, e, { keep: 2, root: nf.root }));
      }
      ok("(n) four entries did not evict a single slug workspace",
        JSON.stringify(names(nf.dir)) === JSON.stringify(["entries", "slug-a", "slug-b", "slug-c"]),
        JSON.stringify(names(nf.dir)));
      ok("(n) and the entries are bounded inside their own directory",
        JSON.stringify(names(join(nf.dir, BRIEF_ENTRIES))) === JSON.stringify(["entry-3", "entry-4"]),
        JSON.stringify(names(join(nf.dir, BRIEF_ENTRIES))));
      // THE CONTROL: `entries` is a declared sub-directory of the Brief lane
      // and not a free parameter — a caller able to name any sub-directory
      // could park entries where the lane's prune never looks.
      refuses("(n) an undeclared sub-directory refuses",
        () => enterSubRun("draft", "somewhere", "e", { keep: 2, root: nf.root }),
        "is not a bounded sub-directory");
      // And a slug workspace prune still ignores the entries directory.
      const rm = pruneLaneForRun("brief", "slug-d", { keep: 2, root: nf.root });
      ok("(n) the lane prune never removes the entries directory", !rm.includes(BRIEF_ENTRIES), JSON.stringify(rm));

      // THE TIEBREAK, asserted directly (kogaki#788). Ageing the entries above
      // puts `entriesByAge`'s name tiebreak out of reach of every other
      // assertion in this pass — a fixture repaired by removing the tie stops
      // covering the rule the tie exists for, which is the repair paying for
      // itself with the coverage it was meant to protect. So the tie is built
      // rather than raced: three entries at one EXPLICIT mtime, where name
      // ASCENDING keeps the two lexically first. Invert the tiebreak and this
      // line goes red.
      const tf = fixture("brief", []);
      const ties = join(tf.dir, BRIEF_ENTRIES);
      const tied = new Date(Date.now() - 30 * 60000);
      for (const e of ["tie-c", "tie-a", "tie-b"]) mkdirSync(join(ties, e), { recursive: true });
      for (const e of ["tie-a", "tie-b", "tie-c"]) utimesSync(join(ties, e), tied, tied);
      pruneWithin(ties, null, 2);
      ok("(n) an mtime tie is broken by name ascending",
        JSON.stringify(names(ties)) === JSON.stringify(["tie-a", "tie-b"]), JSON.stringify(names(ties)));
    }

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
    // DERIVED FROM `LANES`, never transcribed: `keepLast` checks EVERY lane, so a
    // fixture block naming the lanes by hand goes red the moment a lane is added —
    // reporting the fixture's staleness as a defect in the module. Lane N+1 is
    // covered by the derivation rather than by a list somebody remembered to extend.
    const full = Object.fromEntries(LANES.map((l) => [l, { keep_last: 3 }]));
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
    // answer for every lane in LANES. A pass over fixtures alone stays green on a
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

selfTest();
