// compose/figure — the figure decision, its roles and its forms
// (cut from src/compose.mjs at its named section, kogaki#1465; the entry
// re-exports every name src/compose.mjs exported before the cut).

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the figure decision; the judgment rule;
//       the Candidate gate; the Move library
//
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MOVE_RECORD_EXT, isPlainMap, readMoveRecord } from "./render.mjs";

// ---- the figure decision's `figure:` — the Brief's figure decision (kogaki#877) ----
//
// A Leg MAY declare a figure; THE DEFAULT IS NONE, and a Leg without
// `figure:` composes unchanged. Two conditions are mechanical — the Leg's
// Move carries a `figure`, and every role of that form binds to one of THIS
// Leg's claims; whether the figure carries something is the composer's one
// judgment, never read for meaning here (the judgment rule).
// `figureRefusal` and the claim binding are PURE and run inside
// `validateLegs`; whether the Move carries a form needs the library and runs
// in `resolveFigureForms`, beside `resolveMoveIds` at adoption.

// `g<n>` addresses the Leg's own claim lines IN ORDER, 1-based. A role bound
// to a claim of another Leg is unreachable by construction rather than
// refused by a rule: the address space is this Leg's claims and has no
// syntax for anyone else's.
const CLAIM_ADDRESS = /^g([1-9][0-9]*)$/;

let FIGURE_KINDS = null;
export function figureKinds() {
  if (FIGURE_KINDS) return FIGURE_KINDS;
  const p = join(dirname(fileURLToPath(import.meta.url)), "..", "figure-kinds.json");
  // REFUSED RATHER THAN DEFAULTED TO EMPTY, the arrangement
  // src/disclosure-fields.json already has: an empty kind set would make every
  // form check vacuous while reading exactly like a corpus that declares no
  // forms, which is the degrades-to-zero shape this lane refuses elsewhere.
  FIGURE_KINDS = JSON.parse(readFileSync(p, "utf8"));
  return FIGURE_KINDS;
}

// The SERIALIZED form of `figure_roles`, and its reader. One round trip, two
// functions that cannot disagree about what an entry is — the arrangement
// `introduces` and `opens_section` already have, for the reason they have it:
// a writer and a reader disagreeing about a value fails silently at exactly
// the field whose value reaches the rendered figure.
export function renderFigureRoles(roles) {
  return Object.entries(roles).map(([r, g]) => `${r}=${g}`).join(", ");
}
// The READER of that form. Its consumer today is the round-trip assertion in
// checks/check-brief-compose.sh — a writer whose output nothing can parse is a
// format nobody has verified — and kogaki#878, which owns the `src/draft.mjs`
// read-back, is the next one. It is here rather than there because the writer
// is here: one grammar, two ends, never two definitions that agree until one is
// edited.
export function parseFigureRoles(text) {
  const out = {};
  for (const part of String(text).split(",")) {
    const t = part.trim();
    if (t === "") continue;
    const eq = t.indexOf("=");
    if (eq === -1) return { error: `"${t}" is not a role binding — the form is role=g<n>` };
    const role = t.slice(0, eq).trim();
    const addr = t.slice(eq + 1).trim();
    if (role === "" || addr === "") return { error: `"${t}" is not a role binding — the form is role=g<n>` };
    if (Object.prototype.hasOwnProperty.call(out, role)) return { error: `role "${role}" is bound twice` };
    out[role] = addr;
  }
  return { roles: out };
}

// THE GRAMMAR HALF. Pure over the two values, so the composition side and the
// Brief read-back side share ONE definition of what a declaration is.
export function figureRefusal(figure, figure_roles, at) {
  const has = figure !== undefined && figure !== null;
  const hasRoles = figure_roles !== undefined && figure_roles !== null;
  if (!has && !hasRoles) return null;
  // THE TWO TRAVEL TOGETHER. A `figure:` with no bindings declares a figure
  // nothing can be rendered from, and bindings with no `figure:` carry no
  // statement of what the figure is for — the composer's one judgment. Either
  // alone is a half-declaration, and a half-declaration reaching #878 would be
  // a record with no form or a form with no reason.
  if (has && !hasRoles) {
    return `${at}: figure: is declared with no figure_roles — every role of the Move's figure binds to one of this Leg's claims (the figure decision), and a figure with no bindings names nothing to render`;
  }
  if (!has && hasRoles) {
    return `${at}: figure_roles are declared with no figure: — the figure: line is the composer's statement of what the figure lets the reader hold, and bindings without it record a form nobody said carries anything (the figure decision)`;
  }
  if (typeof figure !== "string" || figure.trim() === "") {
    return `${at}: figure:, when present, is one line — what the figure lets the reader hold that the prose alone leaves hard to hold (the figure decision)`;
  }
  if (typeof figure_roles !== "object" || Array.isArray(figure_roles)) {
    return `${at}: figure_roles is a flat mapping of the Move figure's roles to this Leg's claims, role=g<n> (the figure decision)`;
  }
  const entries = Object.entries(figure_roles);
  if (entries.length === 0) {
    return `${at}: figure_roles is empty — every role of the Move's figure binds to one of this Leg's claims (the figure decision)`;
  }
  for (const [role, addr] of entries) {
    if (role === "kind") {
      // `kind` is the selector in the Move's own block and can never be a role
      // there (src/figure-kinds.json). Refusing it here too keeps the two
      // vocabularies from disagreeing about what a role name may be.
      return `${at}: figure_roles binds "kind", which is the form's selector and never a role (src/figure-kinds.json)`;
    }
    if (typeof addr !== "string" || !CLAIM_ADDRESS.test(addr)) {
      return `${at}: figure_roles binds role "${role}" to ${JSON.stringify(addr)} — a binding addresses one of this Leg's own claims as g<n>, numbered from 1 in the order they are declared (the figure decision)`;
    }
  }
  return null;
}

// THE CLAIM-BINDING HALF, separated because it needs the Leg's claims and
// the read-back side has only the serialized block.
export function figureClaimRefusal(figure_roles, claimCount, at) {
  if (figure_roles === undefined || figure_roles === null) return null;
  for (const [role, addr] of Object.entries(figure_roles)) {
    const m = CLAIM_ADDRESS.exec(String(addr));
    if (!m) continue; // grammar is figureRefusal's; this half assumes it passed
    const n = Number(m[1]);
    if (n > claimCount) {
      return `${at}: figure_roles binds role "${role}" to ${addr}, and this Leg declares ${claimCount} claim(s) — a role binds to a claim of THIS Leg (the figure decision), so an address past the end names a claim that is not there`;
    }
  }
  return null;
}

// The Move's `figure` block, read from the record and NOTHING ELSE READ
// WITH IT. `loadMoveIds` states why the library is read as ids alone — a
// reader that parsed `before`/`after` would be one edit away from comparing
// them, which is the lint the judgment rule forbids. That reasoning bounds this reader
// rather than licensing it: `figure` is a SCHEMA OF ROLES carrying no
// words a reader sees (src/figure-kinds.json), so reading it compares nothing
// about the Move's prose, and this function extracts that block only.
export function figureOf(moveId, movesDir = "moves") {
  const r = readMoveRecord(moveId, movesDir);
  if (r.error) return { error: r.error };
  const block = r.record.figure;
  if (block === undefined || block === null) return { form: null };
  if (!isPlainMap(block)) {
    return { error: `move "${moveId}" carries a \`figure\` that is not a map of \`kind\` and one line per role (${movesDir}/${moveId}${MOVE_RECORD_EXT})` };
  }
  const form = {};
  for (const [k, v] of Object.entries(block)) form[k] = v === null || v === undefined ? "" : String(v).trim();
  return { form };
}

// THE MOVE-DEPENDENT HALF. Refuse the FIRST figure-carrying Leg whose Move
// declares no form, or whose bindings are not exactly that form's roles —
// naming the Leg, the Move and the role, which is the refusal shape this
// runtime uses everywhere.
export function resolveFigureForms(legs, movesDir = "moves") {
  const kinds = figureKinds().kinds || {};
  for (const s of legs) {
    if (s.figure === undefined || s.figure === null) continue;
    const at = `leg ${s.leg_id}`;
    const r = figureOf(s.move, movesDir);
    if (r.error) return { error: `${at}: ${r.error}` };
    if (!r.form) {
      return { error: `${at}: figure: is declared, and move "${s.move}" carries no figure — a figure is the INSTANCE of its Move's form (the figure decision), so a Move with no form leaves the declaration with nothing to be an instance of. Give the Move a form under its own issue (src/figure-kinds.json names the closed kind set), or drop the figure: from this Leg` };
    }
    const kind = r.form.kind;
    if (!kind || !Object.prototype.hasOwnProperty.call(kinds, kind)) {
      return { error: `${at}: move "${s.move}" declares figure kind ${JSON.stringify(kind ?? null)}, which is outside the closed set (${Object.keys(kinds).sort().join(", ")}) — the Move library is what admits a kind, and ingestion refuses this record` };
    }
    const want = new Set(kinds[kind].roles || []);
    const have = new Set(Object.keys(s.figure_roles || {}));
    const missing = [...want].filter((x) => !have.has(x)).sort();
    const extra = [...have].filter((x) => !want.has(x)).sort();
    if (missing.length) {
      return { error: `${at}: figure_roles leaves ${missing.map((x) => `"${x}"`).join(", ")} unbound — every role of move "${s.move}"'s ${kind} form binds to one of this Leg's claims (the figure decision). The form's roles are ${[...want].sort().join(", ")}` };
    }
    if (extra.length) {
      return { error: `${at}: figure_roles binds ${extra.map((x) => `"${x}"`).join(", ")}, which is not a role of move "${s.move}"'s ${kind} form — the form's roles are ${[...want].sort().join(", ")} (src/figure-kinds.json)` };
    }
  }
  return { ok: true, figures: legs.filter((s) => s.figure !== undefined && s.figure !== null).length };
}

// The figure-carrying Legs of a path, in path order. ONE derivation, so the
// Candidate label's count and the set it names cannot disagree.
export function figureLegs(legs) {
  return (legs || []).filter((s) => s && s.figure !== undefined && s.figure !== null);
}

// The gate's disclosure clause (the Candidate gate). THE SOFT WARNING HAS NO TARGET AND
// REFUSES NOTHING — topics/articles.md 2026-08-01 D11 — so above three it says
// so and the Candidate stays selectable. An empty set renders the explicit
// none rather than nothing: a Candidate that declares no figure and a clause
// that was never composed are the same silence to a reader and different
// silences to a check.
export const FIGURE_SOFT_WARNING_AT = 3;
export function figureClause(legs) {
  const figs = figureLegs(legs);
  if (figs.length === 0) return "no Leg carries a figure";
  const which = figs.map((s) => s.leg_id).join(", ");
  const head = `${figs.length} Leg(s) carry a figure — ${which}`;
  return figs.length > FIGURE_SOFT_WARNING_AT
    ? `${head}; above ${FIGURE_SOFT_WARNING_AT} figures a reader is being asked to hold more diagrams than prose, which is worth a second look — nothing here refuses it`
    : head;
}
