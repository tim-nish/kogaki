#!/usr/bin/env bash
# check-adopt-candidate — `node src/assemble.mjs adopt-candidate` runs end to
# end over a fixture run directory with a captured Candidate-gate answer
# (kogaki#1317).
#
# a938f2a (#1311) removed the Move-resolving step from `adoptCandidate` and
# with it its local `resolved`, but left two reads of it dangling — the
# return's `checked: resolved.checked` and the closing summary's
# Move-library count — so every LIVE /brief candidate-adoption run crashed
# with `ReferenceError: resolved is not defined`. check-draft-packet.sh names
# this exact gap in its own "NOT COVERED" note: no fixture in this repository
# drove `adopt-candidate` end to end, so the crash reached a live run before
# it reached a check.
#
# WHAT THIS COVERS: a fixture Brief (one Strand, two unfilled slots' worth of
# the mint skeleton), a fixture reviewed-Candidates JSON (one Candidate, two
# Legs), a fixture specialization record (both Legs `consistent`), and a
# Candidate-selection capture whose `option_set_digest` is computed HERE, from
# the same `selectionOptionIds`/`ownerGateDigest` functions `adoptCandidate`
# itself calls, against this fixture's own Brief and reviewed set — so the
# capture binds to this check's own option set rather than a digest typed in
# that would silently stop matching the day either fixture changes.
#
#   (a) adopt-candidate over the fixture exits 0 and writes every slot of the
#       Brief — the dangling `resolved` read crashed before this write ever
#       completed on a live run;
#   (b) the closing summary names no Move-library count (acceptance item 2)
#       and does name the Leg specialization verdicts read from the record;
#   (c) a run with no --specialization still refuses, by name, rather than
#       silently filling a default — so a check that only drove the
#       passing path could not itself pass on a composer that stopped
#       refusing there.
#
# NOT COVERED: whether the fixture's own waypoints, claims or reasoning are
# GOOD prose is nobody's judgment here — every value below is written only to
# clear the shape refusals `adoptCandidate` and its validators raise.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const fails = [];
const repo = resolve(".");
const root = mkdtempSync(join(tmpdir(), "adopt-candidate-"));

const fixtureDir = join(repo, "checks", "fixtures", "adopt-candidate");
const briefFixture = readFileSync(join(fixtureDir, "brief.md"), "utf8");
const reviewedPath = join(fixtureDir, "reviewed.json");
const reviewed = JSON.parse(readFileSync(reviewedPath, "utf8"));
const specializationPath = join(fixtureDir, "specialization.json");

// `adoptCandidate` WRITES the Brief it is pointed at, so the checked-in
// fixture is copied into the scratch dir rather than edited in place — every
// future run of this check reads the same unfilled Brief.
const briefPath = join(root, "brief.md");
writeFileSync(briefPath, briefFixture);

// THE SELECTION CAPTURE BINDS TO THE OPTION SET `selectionOptionIds` DERIVES
// from THIS Brief and THIS reviewed set (the Candidate gate, kogaki#891) —
// computed here from the functions `adoptCandidate` itself calls, never
// hand-typed.
const { selectionOptionIds } = await import(pathToFileURL(join(repo, "src", "assemble.mjs")).href);
const { ownerGateDigest } = await import(pathToFileURL(join(repo, "src", "compose.mjs")).href);
const candidateId = reviewed.candidates[0].candidate_id;
const offered = selectionOptionIds(reviewed, briefFixture);
if (offered.error) {
  console.log("FAIL check-adopt-candidate");
  console.log(`  - the fixture's own Candidate-selection option set cannot be composed: ${offered.error}`);
  rmSync(root, { recursive: true, force: true });
  process.exit(1);
}
const digest = ownerGateDigest("brief-candidate-selection", offered.ids);
const selection = {
  rows: [{
    gate_id: "brief-candidate-selection",
    evidence: { tool: "AskUserQuestion", tool_use_id: "toolu_fixture_0001" },
    answers_over: { option_set_digest: digest },
    payload: { answer: { option: candidateId } },
  }],
};
const selectionPath = join(root, "selection.json");
writeFileSync(selectionPath, JSON.stringify(selection));

const run = (args) => spawnSync(process.execPath,
  [join(repo, "src", "assemble.mjs"), "adopt-candidate", ...args],
  { cwd: root, encoding: "utf8" });

// (a) and (b): the acceptance case.
const full = ["--brief", briefPath, "--reviewed", reviewedPath, "--candidate", candidateId,
  "--specialization", specializationPath, "--selection", selectionPath];
const r = run(full);
if (r.status !== 0) {
  fails.push(`(a) adopt-candidate exited ${r.status} over the fixture: ${(r.stderr || r.stdout || "").slice(0, 2000)}`);
} else {
  const after = readFileSync(briefPath, "utf8");
  if (/awaiting composition/.test(after)) {
    fails.push("(a) the written Brief still carries an unfilled `(awaiting composition)` slot");
  }
  if (/move id\(s\) resolved against the Move library/i.test(r.stdout || "") || /move library/i.test(r.stdout || "")) {
    fails.push("(b) the closing summary still names a Move-library count — acceptance item 2 is unmet");
  }
  if (!/Leg specialization verdict\(s\) read from the record/.test(r.stdout || "")) {
    fails.push("(b) the closing summary does not report the Leg specialization verdict(s) read from the record");
  }
}

// (c): the specialization record is a mandatory occasion, never a default —
// a check that drove only the passing path could not itself notice a
// composer that stopped refusing its absence.
writeFileSync(briefPath, briefFixture);
const noSpec = run(["--brief", briefPath, "--reviewed", reviewedPath, "--candidate", candidateId,
  "--selection", selectionPath]);
if (noSpec.status === 0) {
  fails.push("(c) adopt-candidate with no --specialization exited 0 — a mandatory judgment occasion was silently skipped");
} else if (!/specialization record/i.test(noSpec.stderr || "")) {
  fails.push(`(c) adopt-candidate with no --specialization refused, but not by naming the missing specialization record: ${(noSpec.stderr || "").slice(0, 500)}`);
}

rmSync(root, { recursive: true, force: true });
if (fails.length) {
  console.log("FAIL check-adopt-candidate");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-adopt-candidate — adopt-candidate over a fixture Brief, reviewed Candidate, specialization record and a selection capture digested against the fixture's own option set exits 0 and fills every slot; its closing summary names no Move-library count and does report the Leg specialization verdict(s) read from the record; and a run with no --specialization still refuses, naming the record (kogaki#1317)");
JS
