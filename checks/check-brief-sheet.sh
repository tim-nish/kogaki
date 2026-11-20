#!/usr/bin/env bash
# check-brief-sheet -- the Brief sheet (kogaki#1776) and the check of the structure a Brief is read into, each called with no
# model call. Its cases are checks/brief-sheet-cases.mjs, and case (m)'s checks/brief-sheet-considered-cases.mjs.
# The file drove the Leg-Planning Playground's Trial until that Playground left; the cases kept carry the letters they
# had, and cases (a), (b), (f), (g) and (h), the runs of the Trial, left with it.

#   (c) validateReadSet refuses a non-apex higher-order relation with no `from` or a `from` naming no claim, a Role in no
#       relation, a higher-order relation relating one relation, a relation naming three Roles and a non-apex higher-order
#       relation relating three (kogaki#1874), one relating itself through another, a written `reach` and
#       a missing `attains_thesis`, naming each; the apex with no `from` and a higher-order relation relating a
#       higher-order relation pass. The ids are minted
#       (kogaki#1772): an answer writing an `id` is refused, every element carries its `name` and the id `r_<n>`, `c_<n>`
#       or `h_<n>` in order of appearance, an element with no `name` or an id out of that order is refused naming it, an
#       apex carrying `from` is refused naming the apex, and `withReach` over the apex with no `from` is the same reach.

#   (d) `structureLegs` derives five Legs in post-order -- each higher-order relation after what it relates -- each `text` its
#       relation's `holds` with the Role names substituted, the apex's Leg alone marked `reaches_target`.
#   (j) over four claims whose fourth is the `from` of a relation the apex does not reach, `withReach` lists that relation,
#       the higher-order relation over it and the claim under `unreached`, and no Leg serves the unreached relation.
#   (k) the Brief sheet (kogaki#1776): `sheet.mjs brief` over a Brief of that structure and its Legs renders with no model
#       call, the graph first labelled by name, the Legs last, no retired word, every table under a <thead> of one
#       heading per column, the Claims table id, claim and reached with no cite, and the apex's `from` empty.

#   (l) the Brief sheet's owner act (kogaki#1788): `sheet.mjs show` over the Brief of (k) writes
#       <root>/runs/brief-plan-playground/<slug>/sheet.html beside brief.sha256 and prints its file:// URL, the skill
#       .claude/skills/brief-sheet/SKILL.md runs that command, and a Leg carrying `waypoints`, `move` or no `text` is
#       refused naming the Leg and the key, with nothing written.
#   (m) the connections the Brief's read weighed (kogaki#1817): under `considered: true` a read carrying a `considered` row
#       per weighed connection passes with its names minted to ids, and a missing `considered`, a higher-order relation
#       with no `connected` row, a relation in no row, a `connected` row no higher-order relation relates, a
#       `not_connected` row one does, a verdict outside the two and a criterion naming no claim are refused naming each;
#       the Brief sheet renders each connected row's why beside its higher-order relation and a "Not connected" table
#       naming the relations, the claims read and the why, and a Brief carrying no `considered` renders neither. Its
#       cases are checks/brief-sheet-considered-cases.mjs.
# Cases (e) and (i), the GROUNDED re-ask and the no-fit stop, went with the Waypoint Call (kogaki#1775).
set -u
cd "$(dirname -- "${BASH_SOURCE[0]}")/.."

node checks/brief-sheet-cases.mjs
main=$?
# Case (m)'s pass is held to this member's `case_floor` in checks/registry.json, in both directions (kogaki#661, kogaki#970).
FLOOR=$(node -e 'const r = require("./checks/registry.json"); console.log(r.checks.find((t) => t.id === "brief-sheet").admission.case_floor)')
out=$(node checks/brief-sheet-considered-cases.mjs) || { echo "$out"; exit 1; }
echo "$out"
n=$(printf '%s\n' "$out" | sed -n 's/^check-brief-sheet (m): ok, \([0-9][0-9]*\) case(s)$/\1/p')
if [ -z "$n" ] || (( n < FLOOR )); then echo "FAIL: (m) ran ${n:-no} case(s), below its case_floor of $FLOOR — cases were lost"; exit 1; fi
if (( n > FLOOR )); then echo "FAIL: (m) ran $n case(s), above its case_floor of $FLOOR — set case_floor to $n in checks/registry.json"; exit 1; fi
exit "$main"
