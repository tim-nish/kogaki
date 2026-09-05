// disclosure — the ONE reader of src/disclosure-fields.json, the closed table
// of Candidate-level disclosure-class fields and the owner surface each
// reaches (SPEC-draft-pipeline §4.11 and §6; kogaki#909, owner ruling
// 2026-09-06).
//
// WHY A MODULE OF ITS OWN. `src/assemble.mjs` already imports `src/review.mjs`,
// so a table sited in either is reachable from one side only, and a table
// duplicated on both sides is the two-carriers-of-one-rule shape — they agree
// until one is edited. This is `runs.mjs`'s arrangement: a pure resolver both
// callers import, with no cycle and no second derivation.
//
// WHAT THE TABLE DECIDES, stated here because a reader arriving at the code
// meets the mechanism before the spec. Each disclosure-class field carries a
// GRADE, and the grade names the surface:
//
//   decision  -> the selection gate. The evidence bears on the choice the
//                owner is making, and a pending human verdict's carrier is the
//                render layer — the owner acts on what they SEE, not on what
//                the record contains.
//   post-hoc  -> the minted Brief's disclosure slot (kogaki#866). The evidence
//                is a report or an approval about what was ADOPTED, so nothing
//                is owed about a path that was not taken.
//
// consulted: product-lab@172ede395a5d74ef9a8b2c7b2031f79fda2fc930 topics/archive/knowledge-architecture.md:172
//
// THE BOUND IS STATED RATHER THAN LEFT TO BE TRUSTED PAST. This table binds
// the fields the HARNESS writes onto a Candidate. A composer inventing a key
// that nothing renders is outside its reach: no reading of this file's output
// bears on a field nobody declared. What it does close is the defect the class
// was found by — a DECLARED piece of evidence with no surface — and it closes
// it at the write rather than at a later audit, so field N+1 fails the same
// assertion instead of earning a check member of its own.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TABLE_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "disclosure-fields.json");

// Read once at module load, the way the lane's other declared sets are read.
// A malformed table is a REFUSAL rather than an empty default: a table that
// degrades to "no fields are disclosure-class" would make every surface
// obligation vacuous on a bad read, which is the damaged-ledger shape §4.11
// already refuses one field over.
function loadTable() {
  let raw;
  try {
    raw = JSON.parse(readFileSync(TABLE_PATH, "utf8"));
  } catch (e) {
    throw new Error(`src/disclosure-fields.json is unreadable or unparseable (${e.message}) — `
      + `the disclosure table is REFUSED rather than defaulted to empty, because an empty table `
      + `makes every surface obligation vacuous and reads exactly like a Candidate that owed none`);
  }
  return raw;
}

const TABLE = loadTable();

export const DISCLOSURE_GRADES = Object.freeze({ ...(TABLE.grades || {}) });
export const DISCLOSURE_FIELDS = Object.freeze({ ...(TABLE.fields || {}) });

// Pure; exported for the check. Returns { error } naming the offending entry,
// or {} when the table itself is well formed. BOTH DIRECTIONS, because a table
// asserted one way is green about the half somebody happened to write: every
// declared field must name a grade the table knows, and every declared grade
// must name a surface and be claimed by at least one field — an unclaimed
// grade is a surface nobody reaches, which reads as coverage.
export function validateDisclosureTable(table = TABLE) {
  const grades = table.grades || {};
  const fields = table.fields || {};
  if (Object.keys(grades).length === 0) {
    return { error: "the disclosure table declares no grades — a table with no grade names no surface, and every field in it would be undeliverable" };
  }
  if (Object.keys(fields).length === 0) {
    return { error: "the disclosure table declares no fields — an empty table makes every surface obligation vacuous, which is indistinguishable from a Candidate that owed none" };
  }
  for (const [g, surface] of Object.entries(grades)) {
    if (typeof surface !== "string" || surface.trim() === "") {
      return { error: `disclosure grade ${JSON.stringify(g)} names no surface — a grade IS the mapping from evidence to the place the owner reads it, so a grade with no surface declares nothing` };
    }
  }
  const claimed = new Set();
  for (const [name, entry] of Object.entries(fields)) {
    if (!entry || typeof entry !== "object") {
      return { error: `disclosure field ${JSON.stringify(name)} carries no entry — a bare name declares no surface` };
    }
    if (!Object.prototype.hasOwnProperty.call(grades, entry.grade)) {
      return { error: `disclosure field ${JSON.stringify(name)} names grade ${JSON.stringify(entry.grade)}, which the table does not declare — the known grades are ${Object.keys(grades).join(", ")}` };
    }
    if (typeof entry.why !== "string" || entry.why.trim() === "") {
      return { error: `disclosure field ${JSON.stringify(name)} states no reason for its grade — the grade is a judgment about whether the evidence bears on the choice, and a judgment with no ground is a preference` };
    }
    claimed.add(entry.grade);
  }
  for (const g of Object.keys(grades)) {
    if (!claimed.has(g)) {
      return { error: `disclosure grade ${JSON.stringify(g)} is declared and claimed by no field — a surface nothing reaches reads as coverage while delivering nothing` };
    }
  }
  return {};
}

// The surface a declared field reaches, or null where the field is not
// disclosure-class. Null is the honest answer for an undeclared key and is
// never an error here: this function answers about the TABLE, and the refusal
// belongs at the site that composes the surface.
export function disclosureSurface(field, table = TABLE) {
  const entry = (table.fields || {})[field];
  if (!entry) return null;
  return (table.grades || {})[entry.grade] || null;
}

// Every declared field of one grade that is actually PRESENT on a Candidate.
// This is what a composing site asks before it decides whether it owes a
// rendering: the obligation is generated by the evidence existing, not by a
// caller remembering to look.
export function disclosureFieldsPresent(candidate, grade, table = TABLE) {
  const fields = table.fields || {};
  return Object.keys(fields)
    .filter((name) => fields[name].grade === grade)
    .filter((name) => candidate && candidate[name] !== undefined && candidate[name] !== null);
}
