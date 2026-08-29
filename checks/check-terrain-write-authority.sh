#!/usr/bin/env bash
# check-terrain-write-authority — the CALLER SET of the owner-artifact writers.
#
# THE HOP THAT HAD NO CARRIER (kogaki#681, successor to #680). SPEC-terrain
# §15.5 asserts that owner artifacts are written only from writing states of
# the workflow table. Two registered members sit on either side of that claim
# and neither reads it: `check-terrain-workflow.sh` counts run RECORDS against
# the table, and `check-terrain-composition.sh` checks screen CONFORMANCE and
# mutates `writeScreenSurface` to prove the grammar refusal reaches. Neither
# reads WHO MAY CALL the writers, which is the one thing §15.5 is about — so
# the claim was re-asserted by three successive repairs (kogaki#625, #665/#667,
# #680), each closing honestly against a different artifact.
#
#   "When the same defect recurs across several 'resolving' fixes, each
#   repairing a different artifact and each closing honestly, stop filing at
#   the symptom and ask WHICH HOP BETWEEN PRODUCER AND OBSERVER HAS NO CARRIER
#   AT ALL — re-slice the decomposition by hop, not by which artifact happened
#   to be wrong last time."
#   consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 LESSONS.md:81
#
# THE ISOLATION IS THE DESIGN, not a convenience. `repoRoot()` falls back to
# `cwd` outside a git checkout, so every case below runs with `cwd` set to a
# throwaway directory: the "owner location" under test is <tmp>/reports and the
# repository's own reports/ is never a candidate. A check that had to save and
# restore the owner's real rendering to assert a refusal would be one bad exit
# away from destroying it.
#
# Reporting obeys the three-part remedy: guard the crash, report a crash AS a
# crash (CANNOT-DETERMINE, never a finding), disclose repetition.
set -euo pipefail
cd "$(dirname "$0")/.."

RUNTIME="$(pwd)/terrain/terrain.mjs"
SRC_PATH="$(pwd)/terrain/terrain.mjs"
FIXTURE="$(pwd)/checks/fixtures/terrain/conforming/survey-two-strands.json"
TAG="architecture"
export RUNTIME SRC_PATH FIXTURE TAG

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, existsSync, mkdirSync, copyFileSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const RUNTIME = process.env.RUNTIME;
const FIXTURE = process.env.FIXTURE;
const TAG = process.env.TAG;
const SRC = readFileSync(process.env.SRC_PATH, "utf8");
const fails = [];
const notes = [];

// An isolated owner root: not a git checkout, so `repoRoot()` announces its
// fallback and resolves to this directory. Every "owner location" below is
// <root>/reports and belongs to nobody.
const ownerRoot = () => mkdtempSync(join(tmpdir(), "kogaki-write-authority-"));

// A run record seeded past `survey` — the state that would otherwise re-survey
// LIVE and ignore a fixture. Seeding is FIXTURE CONSTRUCTION, the same shape as
// the claims and subdivision records the composition check already builds:
// §15.5 governs a SESSION minting run state as an act, not a fixture standing
// one up so the executor can be driven at all. Without it the executor is
// undrivable against a fixture, which is the finding that refuted #680's
// disposition (kogaki#681).
function seedRun(dir, completed = ["survey"], extra = {}) {
  writeFileSync(join(dir, "run-record.json"), JSON.stringify({
    workflow: { path: "specs/spec-terrain/workflow.json", version: TABLE_VERSION },
    survey_record: FIXTURE,
    completed, waits_reached: [], conditional_entered: [], conditional_skipped: [],
    awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [], done: false, ...extra,
  }, null, 1));
  return dir;
}
// READ FROM THE TABLE, never pinned here: the executor refuses to resume a
// record written against another version, so a literal would make this check
// fail on the next table bump for a reason that is not the property.
const TABLE_VERSION = JSON.parse(
  readFileSync(join(process.cwd(), "specs/spec-terrain/workflow.json"), "utf8")).version;

const mds = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")) : []);
const REFUSAL = /is an OWNER ARTIFACT and is written only from a writing state/;

function drive(runtime, cwd, argv, env = {}) {
  return spawnSync(process.execPath, [runtime, ...argv],
    { encoding: "utf8", cwd, env: { ...process.env, ...env } });
}

// ---- BLOCK 1. THE FOUR DIRECTIONS, over the shipped runtime ---------------
// Each case is written against the DEFECT it discriminates, never against the
// feature. A check that only asserted the refusal would pass on a runtime that
// refused everything, which is why the two ALLOW directions are asserted in
// the same block rather than assumed.
function block1(runtime, label) {
  const local = [];

  // (a) STANDALONE INTO THE OWNER LOCATION — refused. This is #680's defect:
  //     a co-tag screen in front of the owner belonging to no run record.
  const rootA = ownerRoot();
  const a = drive(runtime, rootA, ["cotags", "--survey", FIXTURE, "--tag", TAG]);
  if (!REFUSAL.test(String(a.stdout) + String(a.stderr))) {
    local.push("a standalone `cotags` writing the DEFAULT owner location was not refused — §15.5's write authority is carried by nothing");
  }
  if (mds(join(rootA, "reports")).includes("Screen.md")) {
    local.push("the refused standalone run wrote Screen.md anyway — the refusal is downstream of the write it claims to gate");
  }
  // AND NOTHING REACHED THE TERMINAL EITHER. PR #667 round 2 established that a
  // refused screen reaches NEITHER the owner's terminal nor their artifact; a
  // refusal sited after the printer satisfies the artifact half alone, and that
  // half-property is invisible to an artifact-only assertion.
  if (/Select a group|in view \(/.test(String(a.stdout))) {
    local.push("the refused screen was printed to stdout before the refusal — §15.5's refusal must precede the printer, not only the write (PR #667 round 2's property, re-broken from the other end)");
  }

  // (b) STANDALONE, REDIRECTED — allowed. The composition is NOT refused: a
  //     rendering whose lifetime is the run is not an owner artifact (§2.5.1),
  //     and this is the direction the 34 composition-check sites depend on.
  const rootB = ownerRoot();
  const redirect = mkdtempSync(join(tmpdir(), "kogaki-redirect-"));
  const b = drive(runtime, rootB, ["cotags", "--survey", FIXTURE, "--tag", TAG],
                  { KOGAKI_REPORTS_DIR: redirect });
  if (b.status !== 0) {
    local.push(`a redirected standalone \`cotags\` failed (exit ${b.status}): ${(String(b.stderr)).trim().slice(0, 200)} — the refusal binds the OWNER destination, and widening it to every destination would take the composition check's whole fixture surface with it`);
  }
  if (!mds(redirect).includes("Screen.md")) {
    local.push("a redirected standalone `cotags` wrote no screen — the composition route is refused where §15.5 permits it");
  }

  // (c) A REDIRECT THAT RESOLVES TO THE OWNER LOCATION — refused. The
  //     discriminator is the RESOLVED destination and never the override's
  //     presence: keying on "was an override supplied" is the hole a caller
  //     closes by passing `--rendering-dir reports`, and §15.7 forecloses any
  //     switch-off-able escape ("a retained generator regenerates what a ban
  //     forbids").
  const rootC = ownerRoot();
  const c = drive(runtime, rootC, ["cotags", "--survey", FIXTURE, "--tag", TAG,
                                   "--rendering-dir", "reports"]);
  if (!REFUSAL.test(String(c.stdout) + String(c.stderr))) {
    local.push("`--rendering-dir reports` was NOT refused — the guard keys on the presence of an override rather than on where the write lands, so the owner artifact is one flag away");
  }

  // (d) THE EXECUTOR INTO THE OWNER LOCATION — allowed, and this is the
  //     direction that makes the other three a narrowing rather than a ban.
  const rootD = ownerRoot();
  const runD = seedRun(mkdtempSync(join(tmpdir(), "kogaki-run-")));
  const d = drive(runtime, rootD, ["run", "--run-dir", runD]);
  if (d.status !== 0) {
    local.push(`the executor failed writing the owner location (exit ${d.status}): ${(String(d.stderr)).trim().slice(0, 200)}`);
  } else if (!mds(join(rootD, "reports")).includes("Screen.md")) {
    local.push("the executor wrote no owner artifact — the authority it is supposed to hold for the duration of a writing state does not reach the writer");
  }

  return local.map((m) => `${label}: ${m}`);
}

fails.push(...block1(RUNTIME, "shipped"));

// ---- BLOCK 2. THE CALLER SET, read structurally --------------------------
// DECLARED LIMIT, in the check's own words: this reads TEXT. A file merely
// CONTAINING a call shape is indistinguishable from one that runs it, which is
// the same boundary `check-registry-conformance.sh` declares for its dispatch
// match and the same refusal of a language-aware parser as a lint over
// judgment. Block 1 is what binds the behaviour; this block is what makes a
// SECOND writer, added later, visible before it ships.
const writeScreenCalls = [...SRC.matchAll(/(^|[^A-Za-z0-9_.])writeScreen\s*\(/g)].length;
// One definition plus exactly one call, from `writeScreenSurface`.
if (writeScreenCalls !== 2) {
  fails.push(`\`writeScreen\` appears at ${writeScreenCalls} call/definition site(s); §15.5 admits exactly one caller (\`writeScreenSurface\`, the one private screen writer). A second caller is the two-writer class §14.4.1 admitted and §15.5 superseded`);
}
for (const [fn, why] of [
  ["writeScreenSurface", "the screen writer's own entry, which must refuse BEFORE the printer runs"],
  ["writeScreen", "the writer itself, so a future second caller is guarded at the write"],
]) {
  const body = SRC.slice(SRC.indexOf(`function ${fn}(`));
  const upto = body.slice(0, body.indexOf("\n}\n") + 1);
  if (!/refuseUnauthorizedOwnerWrite\s*\(/.test(upto)) {
    fails.push(`${fn} does not call refuseUnauthorizedOwnerWrite — ${why}`);
  }
}
if (!/refuseUnauthorizedOwnerWrite\(rdir, "FullReport\.md"\)/.test(SRC)) {
  fails.push("cmdReport's rendering write does not carry the write-authority refusal — the screen half of §15.5 would be guarded and the report half open, which is exactly how the claim survived three repairs");
}
// The authority is the executor's, and it is RESTORED rather than cleared: a
// renderer that fails must not leave it standing for whatever runs next in the
// same process.
const assigns = [...SRC.matchAll(/WRITING_STATE\s*=/g)].length;
if (assigns !== 3) {
  fails.push(`WRITING_STATE is assigned at ${assigns} site(s); §15.5 admits exactly three — the declaration, the set on entering a write state, and the restore in \`finally\``);
}
if (!/finally\s*\{\s*WRITING_STATE\s*=\s*held;\s*\}/.test(SRC)) {
  fails.push("the writing-state authority is not restored in a `finally` — a renderer that fails leaves it held, and the next standalone act in the same process inherits an authority nothing granted it");
}

// ---- BLOCK 3. MUTATION EVIDENCE ------------------------------------------
// Mutates BY RECORD: the admission record names the one defect this member
// uniquely carries, and this constructs it and asserts refusal. Asserted to
// have RUN before its absence is read — a mutant that crashes on entry kills
// every assertion for a reason that is not the property.
// THE MUTANT TREE IS THE COMPOSITION CHECK'S RECIPE, REUSED (PR #465 round 1).
// `terrain.mjs` resolves its schemas from ITS OWN location (`REPO =
// resolve(HERE, "..")`), never from cwd, so a mutant holding only the runtime
// dies at import — writing no artifact FOR THE WRONG REASON, which reads as a
// kill while asserting nothing. The sibling module travels with it and the
// sibling directories are linked, so the mutant resolves exactly what the
// shipped runtime resolves. Re-deriving this would have paid for the same
// finding twice.
const mutantDir = mkdtempSync(join(tmpdir(), "kogaki-write-authority-mutant-"));
mkdirSync(join(mutantDir, "terrain"), { recursive: true });
copyFileSync(join(process.cwd(), "terrain/format-guard.mjs"), join(mutantDir, "terrain", "format-guard.mjs"));
for (const dd of ["specs", "gates"]) symlinkSync(resolve(process.cwd(), dd), join(mutantDir, dd), "dir");
const mutantPath = join(mutantDir, "terrain", "terrain.mjs");
// THE MUTATION IS THE GUARD'S BODY, not its call sites. Deleting the calls
// would be caught by block 2 alone, which would make this case evidence about
// the text read rather than about the behaviour — the mutant must survive
// block 2 and die in block 1.
const mutated = SRC.replace(
  /(function refuseUnauthorizedOwnerWrite\(dir, artifact\) \{\n)(  if \(WRITING_STATE !== null\) return;)/,
  "$1  return;\n$2");
if (mutated === SRC) {
  notes.push("MUTATION CANNOT-DETERMINE — the guard's body did not match the mutation pattern, so no mutant was built and no kill is claimed");
} else {
  writeFileSync(mutantPath, mutated);
  const probeRoot = ownerRoot();
  const alive = drive(mutantPath, probeRoot, ["cotags", "--survey", FIXTURE, "--tag", TAG]);
  if (alive.status !== 0 && !REFUSAL.test(String(alive.stdout) + String(alive.stderr))) {
    notes.push(`MUTATION CANNOT-DETERMINE — the mutant exited ${alive.status} for a reason that is not the property: ${(String(alive.stderr)).trim().slice(0, 160)}`);
  } else {
    const killed = block1(mutantPath, "mutant");
    if (!killed.length) {
      fails.push("THE MUTANT SURVIVED: a runtime whose write-authority guard returns unconditionally passed every case in block 1, so block 1 is not bound to the guard it claims to verify");
    } else {
      notes.push(`MUTATION EVIDENCE: the always-return guard was KILLED by ${killed.length} assertion(s) in block 1 — including the standalone-into-owner-location direction (a) and the ${"`--rendering-dir reports`"} direction (c).`);
    }
  }
}

for (const n of notes) console.log(n);
if (fails.length) {
  console.error("check-terrain-write-authority FAILED:");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("§15.5 write authority: the owner-artifact writers' CALLER SET is read, not re-asserted — "
  + "four behavioural directions over the shipped runtime (standalone into the owner location REFUSED, "
  + "redirected ALLOWED, a redirect RESOLVING to the owner location REFUSED, the executor ALLOWED), the "
  + "refusal asserted to precede the PRINTER as well as the write, and the structural caller set read "
  + "(one caller of writeScreen, both writers guarded, cmdReport's rendering write guarded, the authority "
  + "restored in a finally). Every case runs in a throwaway non-checkout root, so the repository's own "
  + "reports/ is never a candidate destination and no save/restore of an owner rendering is performed.");
JS
