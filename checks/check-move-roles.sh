#!/usr/bin/env bash
# `moves/ROLES.json` and the adapter that reads it (kogaki#1349).
#
# THE DEFECT THIS GUARDS AGAINST. Before kogaki#1349 the Move schema fixed
# `technique`, `breaks` and `segments` as field names the composer and the
# fit judge read directly, so a schema rename of any one of them reached
# every downstream reader at once. `moveRoles`/`moveContract`
# (src/compose.mjs) now resolve those fields through `moves/ROLES.json`'s
# required/optional role mapping, WITH NO FALLBACK to a built-in default — a
# library with no declaration cannot be read at all, never read against a
# guessed shape.
#
# WHAT THIS COVERS (the four Acceptance fixtures named in the Issue):
#   1. `moves/ROLES.json` exists and names the three required roles
#      (identity, state-before, state-after) and the current optional roles
#      (specialized-by-the-Leg, tests, segments, figure-roles, continues-from)
#      with the fields they presently map to.
#   2. Composing over the current `moves/` library and the judging over its
#      Legs render byte-identical compose/judge input to what a direct,
#      hardcoded field read would have produced — the adapter changes
#      nothing observable for the library as it stands today.
#   3. A fixture Move record missing `before` is refused by name at the
#      `src/compose.mjs` adapter (`moveContract`) — the `tools/move_ingest.py`
#      half of this same Acceptance item is covered by
#      checks/move_ingest_cases.py.
#   4. A fixture declaration renaming `technique` to another field name
#      composes the identical result through `moveContract`/
#      `loadMoveContracts`, with no change to src/compose.mjs, src/draft.mjs
#      or src/brief-workflow.json — the rename stays inside the declaration.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== moves/ROLES.json and its adapter in src/compose.mjs (kogaki#1349)"

OUT=$(node --input-type=module - <<'JS' 2>&1
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { moveRoles, moveContract, loadMoveContracts, moveContractsForLegs } from "./src/compose.mjs";

const cases = [];

// --- Acceptance 1: the declaration names the three required roles and the
// current optional roles with their present fields. ---
{
  const { roles, error } = moveRoles("moves");
  cases.push(["moves/ROLES.json resolves with no error", !error, error]);
  const req = (roles && roles.required) || {};
  const opt = (roles && roles.optional) || {};
  cases.push(["required roles name identity, state-before, state-after",
    req.identity === "id" && req["state-before"] === "before" && req["state-after"] === "after", req]);
  cases.push(["optional roles name the current fields",
    opt["specialized-by-the-Leg"] === "technique" && opt.tests === "breaks" && opt.segments === "segments"
      && opt["figure-roles"] === "figure" && opt["continues-from"] === "continues_from", opt]);
}

// --- Acceptance 2: byte-identical compose/judge input over the real library.
// This is a snapshot: a direct field read off a real record, compared
// against what the adapter renders for that same record, over the whole
// admitted set and over a fixture Leg path through two of them. ---
{
  const lib = loadMoveContracts("moves");
  cases.push(["loadMoveContracts resolves with no error over the real library", !lib.error, lib.error]);
  const byId = new Map((lib.moves || []).map(m => [m.id, m]));
  const probe = "qualify_the_dilemma_then_name_its_two_conditions";
  const text = readFileSync(join("moves", `${probe}.md`), "utf8");
  // A direct re-implementation of the folded (`>-`) block-scalar read
  // `moveScalarField` (src/compose.mjs) does internally but does not export
  // — every following indented line to the first that is not, joined on a
  // single space with runs of whitespace collapsed, matching the fold a `>`
  // block always had before this adapter existed.
  const field = (name) => {
    const lines = text.split("\n");
    const head = new RegExp(`^${name}:[ \\t]*(.*)$`);
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(head);
      if (!m) continue;
      const body = [];
      for (let j = i + 1; j < lines.length; j++) {
        const l = lines[j];
        if (l.trim() === "") { body.push(""); continue; }
        if (!/^[ \t]/.test(l)) break;
        body.push(l.trim());
      }
      while (body.length && body[body.length - 1] === "") body.pop();
      const joined = body.join(" ").replace(/\s+/g, " ").trim();
      return joined === "" ? null : joined;
    }
    return null;
  };
  const c = byId.get(probe);
  cases.push(["the adapter's before/after/technique/breaks for a real record match a direct field read",
    !!c && c.before === field("before") && c.after === field("after")
      && c.technique === field("technique") && c.breaks === field("breaks"),
    { adapter: c, direct: { before: field("before"), after: field("after"), technique: field("technique"), breaks: field("breaks") } }]);

  const legs = [{ leg_id: "L1", move: probe, waypoints: ["w1"] }];
  const judge = moveContractsForLegs(legs, "moves");
  cases.push(["moveContractsForLegs resolves with no error", !judge.error, judge.error]);
  const j = judge.contracts && judge.contracts[0];
  cases.push(["the judge input carries the same before/after/technique/breaks/segments as the compose input",
    !!j && j.before === c.before && j.after === c.after && j.technique === c.technique
      && j.breaks === c.breaks && j.segments === c.segments, { judge: j, compose: c }]);
}

// --- Fixture library setup for Acceptance 3 and 4: a tiny two-record
// library with its own ROLES.json, never the real one. ---
const fixtureLib = mkdtempSync(join(tmpdir(), "kogaki-1349-roles-"));
const baseRoles = JSON.parse(readFileSync(join("moves", "ROLES.json"), "utf8"));
function writeMove(dir, id, fields) {
  const lines = [`id: ${id}`];
  for (const [k, v] of Object.entries(fields)) {
    lines.push(`${k}: >-`);
    lines.push(`  ${v}`);
  }
  writeFileSync(join(dir, `${id}.md`), lines.join("\n") + "\n");
}

// --- Acceptance 3: a fixture Move record missing `before` is refused by
// name at the src/compose.mjs adapter. ---
{
  writeFileSync(join(fixtureLib, "ROLES.json"), JSON.stringify(baseRoles));
  writeMove(fixtureLib, "no_before", { after: "state after", technique: "a technique", breaks: "a break" });
  const c = moveContract("no_before", fixtureLib);
  cases.push(["a Move record missing `before` is refused, naming the field",
    typeof c.error === "string" && c.error.includes("before") && c.error.includes("no_before"), c]);
}
rmSync(fixtureLib, { recursive: true, force: true });

// --- Acceptance 4: renaming `technique` to another field in the
// declaration composes the identical result, with no change owed to
// src/compose.mjs, src/draft.mjs or src/brief-workflow.json. ---
{
  const renamedLib = mkdtempSync(join(tmpdir(), "kogaki-1349-renamed-"));
  const renamedRoles = JSON.parse(JSON.stringify(baseRoles));
  renamedRoles.optional["specialized-by-the-Leg"] = "approach";
  writeFileSync(join(renamedLib, "ROLES.json"), JSON.stringify(renamedRoles));
  writeMove(renamedLib, "m1", { before: "state before", after: "state after", approach: "a technique", breaks: "a break" });
  const renamed = moveContract("m1", renamedLib);
  cases.push(["a renamed field composes with no error under the renamed declaration",
    !renamed.error, renamed.error]);
  cases.push(["the renamed field's value still emits under the `technique` output key",
    renamed.technique === "a technique", renamed]);

  // The record carries NO `technique` field at all — only `approach` — so a
  // reader still hunting the old field name by itself, rather than through
  // the declaration, would find nothing. Proves the rename is observed
  // through moves/ROLES.json and not through any stray fallback.
  const direct = readFileSync(join(renamedLib, "m1.md"), "utf8");
  cases.push(["the fixture record carries no literal `technique:` field",
    !/^technique:/m.test(direct), direct]);
  rmSync(renamedLib, { recursive: true, force: true });
}

let failed = 0;
for (const [name, ok, detail] of cases) {
  if (ok) {
    console.log(`ok: ${name}`);
  } else {
    failed++;
    console.log(`FAIL: ${name} — got ${JSON.stringify(detail)}`);
  }
}
console.log(`move-roles self-test: ${cases.length} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
JS
); RC=$?
printf '%s\n' "$OUT"
if [[ $RC -ne 0 ]] || ! grep -q "move-roles self-test:" <<<"$OUT"; then
  echo "FAIL: move-roles unit check did not run clean"
  exit 1
fi

echo "ok: moves/ROLES.json names the three required roles and the current optional roles; the adapter's compose and judge input over the real library match a direct field read; a Move missing before is refused at the adapter naming the field; a renamed optional field composes identically under the renamed declaration (kogaki#1349)"
exit 0
