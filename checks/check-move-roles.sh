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
#   2. Composing over a YAML Move library and the judging over its Legs
#      render byte-identical compose/judge input to what a direct read
#      through the Brief's YAML reader produces (kogaki#1413); the committed
#      library loads, or is refused naming its retired `.md` form until
#      kogaki#1415 regenerates it.
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
import { parseYaml, stringifyYaml } from "./src/yaml.mjs";

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

// --- Acceptance 2: byte-identical compose/judge input. A direct read of a
// record through the Brief's own YAML reader (kogaki#1413), compared against
// what the adapter renders for that same record, and over a fixture Leg path
// through it. The committed library is the retired `.md` form until
// kogaki#1415 regenerates it, so the snapshot runs over a fixture library and
// the real one is held to loading or to the refusal naming that form. ---
{
  const real = loadMoveContracts("moves");
  cases.push(["the real library loads, or is refused naming the retired `.md` form",
    !real.error || (real.error.includes("retired `.md` form") && real.error.includes("kogaki#1415")), real.error]);

  const snapLib = mkdtempSync(join(tmpdir(), "kogaki-1349-snapshot-"));
  writeFileSync(join(snapLib, "ROLES.json"), readFileSync(join("moves", "ROLES.json")));
  const probe = "qualify_the_dilemma_then_name_its_two_conditions";
  writeFileSync(join(snapLib, `${probe}.yaml`), stringifyYaml({
    id: probe,
    before: { knowledge: "holds one mechanism.", trust: "rests on one case." },
    after: { knowledge: "the mechanism varies by condition.", question: "what determines the variation?" },
    technique: "Apply the mechanism to a second case, then qualify it.",
    breaks: ["dropping the qualification leaves the variables nothing to explain"],
    segments: [{ does: "applies the mechanism." }, { does: "qualifies it.", relation: "narrows the application." }],
  }));
  const lib = loadMoveContracts(snapLib);
  cases.push(["loadMoveContracts resolves with no error over a YAML library", !lib.error, lib.error]);
  const byId = new Map((lib.moves || []).map(m => [m.id, m]));
  const rec = parseYaml(readFileSync(join(snapLib, `${probe}.yaml`), "utf8"));
  const lines = (state) => Object.entries(state).map(([d, s]) => `${d}: ${s}`).join("\n");
  const c = byId.get(probe);
  cases.push(["the adapter's before/after/technique/breaks for a record match a direct field read",
    !!c && c.before === lines(rec.before) && c.after === lines(rec.after)
      && c.technique === rec.technique && JSON.stringify(c.breaks) === JSON.stringify(rec.breaks),
    { adapter: c, direct: rec }]);

  const legs = [{ leg_id: "L1", move: probe, waypoints: ["w1"] }];
  const judge = moveContractsForLegs(legs, snapLib);
  cases.push(["moveContractsForLegs resolves with no error", !judge.error, judge.error]);
  const j = judge.contracts && judge.contracts[0];
  cases.push(["the judge input carries the same before/after/technique/breaks/segments as the compose input",
    !!j && j.before === c.before && j.after === c.after && j.technique === c.technique
      && JSON.stringify(j.breaks) === JSON.stringify(c.breaks) && JSON.stringify(j.segments) === JSON.stringify(c.segments),
    { judge: j, compose: c }]);
  rmSync(snapLib, { recursive: true, force: true });
}

// --- Fixture library setup for Acceptance 3 and 4: a tiny two-record
// library with its own ROLES.json, never the real one. ---
const fixtureLib = mkdtempSync(join(tmpdir(), "kogaki-1349-roles-"));
const baseRoles = JSON.parse(readFileSync(join("moves", "ROLES.json"), "utf8"));
function writeMove(dir, id, fields) {
  writeFileSync(join(dir, `${id}.yaml`), stringifyYaml({ id, ...fields }));
}

// --- Acceptance 3: a fixture Move record missing `before` is refused by
// name at the src/compose.mjs adapter. ---
{
  writeFileSync(join(fixtureLib, "ROLES.json"), JSON.stringify(baseRoles));
  writeMove(fixtureLib, "no_before", { after: { knowledge: "state after" }, technique: "a technique", breaks: ["a break"] });
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
  writeMove(renamedLib, "m1", { before: { knowledge: "state before" }, after: { knowledge: "state after" }, approach: "a technique", breaks: ["a break"] });
  const renamed = moveContract("m1", renamedLib);
  cases.push(["a renamed field composes with no error under the renamed declaration",
    !renamed.error, renamed.error]);
  cases.push(["the renamed field's value still emits under the `technique` output key",
    renamed.technique === "a technique", renamed]);

  // The record carries NO `technique` field at all — only `approach` — so a
  // reader still hunting the old field name by itself, rather than through
  // the declaration, would find nothing. Proves the rename is observed
  // through moves/ROLES.json and not through any stray fallback.
  const direct = readFileSync(join(renamedLib, "m1.yaml"), "utf8");
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

echo "ok: moves/ROLES.json names the three required roles and the current optional roles; the adapter's compose and judge input over a YAML library match a direct field read; a Move missing before is refused at the adapter naming the field; a renamed optional field composes identically under the renamed declaration (kogaki#1349)"
exit 0
