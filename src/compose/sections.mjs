// compose/sections — introduced terms, opens-section, the Section grouping and the target
// Leg
// (cut from src/compose.mjs at its named section, kogaki#1465; the entry
// re-exports every name src/compose.mjs exported before the cut).

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the reader-knowledge ledger; the Section grouping
//
import { pathRefusal, readerStateDimensionLine } from "./leg-schema.mjs";
import { INTRODUCES_SEP } from "./specialization.mjs";

// AN ENTRY IS A STRING (the Brief's own serialized form, round-tripped by
// `draft.mjs`) OR AN `introduces_item` OBJECT (the Candidate's own composed
// form, src/leg-schema.json `introduces_item`; kogaki#1263, kogaki#1260),
// whose `nearest` the path-level dedup (item 2 below) reads. THE BRIEF CARRIES
// THE ITEM AS ITS FIELDS (kogaki#1261, kogaki#1328), and a JSON line written
// before that parses back here to the object it was. AN ITEM CARRIES `term`
// AND `meaning` AND NO `kind` (kogaki#1529, SPEC-draft-pipeline "Obligations"
// rule 7): `kind` and an `established` term's `source` are refused by name,
// and a term named here and explained later is an Obligation.
const RETIRED_INTRODUCES_KEYS = Object.freeze({
  kind: "`kind`, which is retired (kogaki#1529): every introduced term is one the article gives its meaning to, so it carries `term` and `meaning`; a term the reader already holds is not introduced, and a term named here and explained by a later Leg is an Obligation",
  source: "`source`, which is retired with `kind` (kogaki#1529): it was an `established` term's outside home, and an introduced term's meaning is the article's own `meaning`",
});
export function parseIntroducesEntry(raw) {
  if (typeof raw === "string" && /^\s*\{[\s\S]*\}\s*$/.test(raw)) {
    let obj;
    try { obj = JSON.parse(raw); } catch { obj = null; }
    if (obj && typeof obj === "object" && !Array.isArray(obj)) return parseIntroducesEntry(obj);
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const term = typeof raw.term === "string" ? raw.term.trim() : "";
    if (term === "") return { error: "an introduces_item with no term" };
    const retired = Object.keys(RETIRED_INTRODUCES_KEYS).find((k) => Object.hasOwn(raw, k));
    if (retired) return { error: `"${term}" carries ${RETIRED_INTRODUCES_KEYS[retired]} (src/leg-schema.json, \`introduces_item\`)` };
    if (typeof raw.meaning !== "string" || raw.meaning.trim() === "") {
      return { error: `"${term}" carries no meaning — an introduced term is one the article gives its meaning to, in one sentence (src/leg-schema.json, \`introduces_item\`)` };
    }
    if (raw.differs !== undefined && (typeof raw.nearest !== "string" || raw.nearest === "")) {
      return { error: `"${term}" carries differs with no nearest — differs names how the term differs FROM nearest, so it names nothing without it (src/leg-schema.json, \`introduces_item\`)` };
    }
    return { term, anchor: null, typed: true, meaning: raw.meaning, nearest: raw.nearest, differs: raw.differs };
  }
  const line = String(raw).trim();
  if (line === "") return { error: "an empty entry" };
  const i = line.indexOf(INTRODUCES_SEP);
  if (i === -1) return { term: line, anchor: null };
  const term = line.slice(0, i).trim();
  const anchor = line.slice(i + INTRODUCES_SEP.length).trim();
  if (term === "") return { error: `an entry with no term before the ${INTRODUCES_SEP}` };
  if (anchor === "") return { error: `"${term}" carries a ${INTRODUCES_SEP} with no meaning anchor after it — write the term bare, or anchor it` };
  return { term, anchor };
}

// THE MEANING AN INTRODUCED TERM CARRIES (kogaki#1282, owner decision
// 2026-10-06; amended kogaki#1404 and kogaki#1529; moved here from
// src/draft/journeys.mjs by kogaki#1497, so the Packet's crossing line and the
// ParagraphPlan read it alike): a typed entry names its own `meaning`; the
// legacy bare/anchored form's anchor IS its meaning anchor (the form
// `parseIntroducesEntry` refuses with no text after the separator). A bare
// term with no anchor carries none, stated rather than invented.
export function introducedMeaning(p) {
  if (!p || p.error) return null;
  if (p.typed) return p.meaning || null;
  return p.anchor || null;
}

// THE WHOLE-WORD, CASE-INSENSITIVE MATCH ITSELF, shared by every mechanical
// introduced-term refusal (Reader start, kogaki#1225; a Section heading,
// kogaki#1327). The boundary is "not adjacent to a letter or digit" rather
// than `\b`, so a term ending in punctuation or a non-ASCII letter still
// bounds on both sides, and a one-character term matches only standing alone.
export function wholeWordMatch(term, text) {
  const t = String(term).trim().toLowerCase();
  if (t === "") return false;
  const haystack = String(text).toLowerCase();
  let from = 0;
  for (;;) {
    const i = haystack.indexOf(t, from);
    if (i === -1) return false;
    const before = i === 0 ? "" : haystack[i - 1];
    const after = haystack[i + t.length] ?? "";
    const wordish = (c) => c !== "" && /[\p{L}\p{N}_]/u.test(c);
    if (!wordish(before) && !wordish(after)) return true;
    from = i + 1;
  }
}

// THE MATCH READS EACH LINE'S CONTENT, NEVER ITS DIMENSION LABEL (PR #1228
// round 1): a Reader start is `dimension: value` lines, so matching the whole
// string let a Leg introducing "trust" or "question" refuse every Reader
// start on the label alone. The `<dimension>:` prefix is stripped per line
// the way `readerStateDimensionLine` reads it, and the values are searched.
export function introducedTermInReaderStart(term, readerStart) {
  const text = String(readerStart).split("\n")
    .map((line) => line.replace(/^\s*[a-z]+:\s*/i, ""))
    .join("\n");
  return wholeWordMatch(term, text);
}

// the Section grouping's `opens_section` (kogaki#822) — OPTIONAL, and shape-validated here for
// the reason `introduces` is: the title reaches an owner-facing heading, so an
// unvalidated value renders as a blank or as `undefined` above a Section.
export function opensSectionRefusal(value, at) {
  if (typeof value !== "string" || value.trim() === "") {
    return `${at}: opens_section, when present, states the Section's destination — a non-empty string (the Section grouping). Its PRESENCE marks the opening and its VALUE carries the destination, which is why an empty one has no meaning rather than meaning "opens with no destination"`;
  }
  return null;
}

// NO INTRODUCED TERM IN ANY HEADING (owner decision 2026-10-10, kogaki#1327).
// A Section heading states where the Section leaves the reader, in everyday
// words, and carries no term — whole-word, case-insensitive — that ANY Leg
// of the path lists under `introduces`, not just a term introduced within
// that Section: "I want readers to be able to skip directly to any Section
// and still understand its heading." Collected once over the whole path
// (a term introduced on a LATER Leg still refuses an earlier heading) and
// then checked against every `opens_section`, for the same reason
// `sectionGroupingRefusal` runs after the per-Leg loop rather than inside it.
export function opensSectionIntroducedTermRefusal(legs) {
  const terms = [];
  for (const s of legs) {
    if (!s || typeof s !== "object" || !Array.isArray(s.introduces)) continue;
    for (const raw of s.introduces) {
      const e = parseIntroducesEntry(raw);
      if (e.error) continue;
      terms.push({ term: e.term, leg_id: s.leg_id });
    }
  }
  for (const [i, s] of legs.entries()) {
    if (!s || typeof s !== "object" || typeof s.opens_section !== "string" || s.opens_section === "") continue;
    const at = `leg ${i + 1}${s.leg_id ? ` (${s.leg_id})` : ""}`;
    for (const { term, leg_id } of terms) {
      if (wholeWordMatch(term, s.opens_section)) {
        return pathRefusal("opens_section_no_introduced_term", at,
          `Its opens_section ${JSON.stringify(s.opens_section)} contains "${term}", a term leg ${JSON.stringify(leg_id)} lists under introduces.`);
      }
    }
  }
  return null;
}

// EACH SECTION'S HEADING BESIDE ITS LAST AFTER-STATE (owner decision
// 2026-10-10, kogaki#1327): one entry per Leg that opens a Section, the
// heading it carries and the `reader_state_after` of the LAST Leg of that
// Section — the destination SPEC-draft-pipeline §"The Thesis is the title,
// and a heading states a destination" rule 2 says the heading states, read
// here rather than left for the fit judge to walk the path and find the
// Section's end itself. A path opening no Section (shape rule 3's refusal
// handles that case) returns no entries.
export function sectionHeadingsWithLastAfterState(legs) {
  const opens = legs.map((s, i) => (typeof s.opens_section === "string" && s.opens_section !== "" ? i : -1)).filter((i) => i >= 0);
  return opens.map((i, k) => {
    const end = k + 1 < opens.length ? opens[k + 1] : legs.length;
    return { leg_id: legs[i].leg_id, heading: legs[i].opens_section, after_state: legs[end - 1].reader_state_after };
  });
}

// the Section grouping's four rules, over the WHOLE path because each is
// about a Leg's NEIGHBOURS. Returns the first refusal or null. The rule text
// is `path_rules` in src/leg-schema.json, composed by `pathRefusal`
// (kogaki#1147). rule 1 (a Leg opens when it changes the reader's question)
// is judgment, and its violation is rule 2's refusal. rule 2: a Leg whose
// `depends_on` is exactly the preceding Leg AND whose `materials` overlap it
// is DEVELOPING it and may not open. rule 3: the first Leg always opens.
// rule 4: two consecutive one-Leg Sections refuse with the request-to-merge;
// its prose-length clause is a named deferred slot (no Brief holds prose).
export function sectionGroupingRefusal(legs) {
  const at = (i) => `leg ${i + 1} (${legs[i].leg_id})`;

  // rule 3 — the first Leg always opens.
  if (legs[0].opens_section === undefined) {
    return pathRefusal("section_rule_3", at(0), "This path opens none: give the first Leg an opens_section carrying that Section's title.");
  }

  // rule 2 — a Leg that develops its predecessor continues, so it may not open.
  for (let i = 1; i < legs.length; i++) {
    const s = legs[i], prev = legs[i - 1];
    if (s.opens_section === undefined) continue;
    const dependsOnlyOnPrev = s.depends_on.length === 1 && s.depends_on[0] === prev.leg_id;
    const overlaps = s.materials.some((m) => prev.materials.includes(m));
    if (dependsOnlyOnPrev && overlaps) {
      return pathRefusal("section_rule_2", at(i),
        `This Leg DEVELOPS ${prev.leg_id} — its depends_on is exactly that Leg, and its materials overlap it — so it continues that Section. Remove its opens_section, or change what the Leg stands on if the reader's question really does change here.`);
    }
  }

  // rule 4, Leg-count clause — two consecutive one-Leg Sections.
  const opens = legs.map((s, i) => (s.opens_section === undefined ? -1 : i)).filter((i) => i >= 0);
  for (let k = 0; k + 2 < opens.length + 1; k++) {
    const start = opens[k];
    const next = k + 1 < opens.length ? opens[k + 1] : legs.length;
    const after = k + 2 < opens.length ? opens[k + 2] : legs.length;
    if (next - start === 1 && after - next === 1) {
      return pathRefusal("section_rule_4", at(start),
        `The Section this Leg opens and the one opening at ${legs[next].leg_id} each hold exactly one Leg: merge the two, or give one of them a second Leg.`);
    }
  }
  return null;
}

// THE INDEX OF THE LEG MARKED `reaches_target`, or -1 where none carries it
// (kogaki#1231). Exported so src/assemble.mjs derives the Brief's Reader
// target and the Thesis row's `established_by_legs` from the SAME Leg
// `validateLegs` ratified, rather than a second search that could disagree
// with it. Not itself a refusal: a caller with zero or several marked Legs
// gets -1 or the FIRST marked index respectively, and `readerTargetLegRefusal`
// is what makes a path with anything but exactly one unwritable.
export function targetLegIndex(legs) {
  if (!Array.isArray(legs)) return -1;
  return legs.findIndex((s) => s && s.reaches_target === true);
}

// THE OBLIGATION LEDGER'S PATH RULES (kogaki#1529, kogaki#1568, SPEC-draft-pipeline
// "Obligations"; kogaki#1232 before it). An Obligation is `{item, raised_by, owed_by,
// discharged_by | conceded_by}`: `item` the list of one or more items -- terms or questions --
// the raising Leg leaves unexplained, in the order it names them. `obligations` is the
// Candidate's own ledger (src/candidate-schema.json); the Thesis row is derived and never
// reaches this function. Each refusal names the row and the Leg. Returns a string to refuse
// with, or null.
const CONCEDED_FIELDS = ["open", "why_not_here", "reader_keeps"];
// `kind`, `text` and `term` are the row's retired keys (kogaki#1568): a question and a term are
// the same expectation, that an item will be explained, and `item` carries either.
export const RETIRED_OBLIGATION_KEYS = Object.freeze(["kind", "text", "term"]);
export function obligationItems(o) {
  return (o && Array.isArray(o.item) ? o.item : [])
    .filter((t) => typeof t === "string" && t.trim() !== "").map((t) => t.trim());
}
export function obligationLine(o) {
  return obligationItems(o).join(", ");
}
export function obligationLabel(o) {
  return `obligation ${JSON.stringify(obligationLine(o))}`;
}
// The row's own shape: no retired key, and `item` a non-empty list of one-line strings naming no
// item twice. Returns the clause to refuse with, or null.
export function obligationItemRefusal(o) {
  const retired = RETIRED_OBLIGATION_KEYS.filter((k) => k in o);
  if (retired.length) {
    return `carries ${retired.map((k) => `\`${k}\``).join(", ")}, retired (kogaki#1568) — an Obligation carries \`item\`, the list of the items it leaves unexplained`;
  }
  if (!Array.isArray(o.item)) return "carries no `item` list — the items the raising unit leaves unexplained, in the order it names them";
  if (o.item.length === 0) return "carries an empty `item` list — a list names at least one item";
  const blank = o.item.findIndex((t) => typeof t !== "string" || t.trim() === "" || /[\r\n]/.test(t));
  if (blank >= 0) return `carries an \`item\` list whose entry ${blank + 1} is not one non-empty line`;
  const seen = new Set();
  for (const t of o.item) {
    const key = t.trim().toLowerCase();
    if (seen.has(key)) return `carries an \`item\` list that repeats ${JSON.stringify(t.trim())} — each item is named once`;
    seen.add(key);
  }
  return null;
}
export function obligationTerminal(o) {
  return o.discharged_by !== undefined ? o.discharged_by : o.conceded_by;
}
export function obligationLedgerRefusal(legs, obligations = []) {
  const at = (i) => `leg ${i + 1} (${legs[i].leg_id})`;
  const atId = (id) => (index.has(id) ? at(index.get(id)) : null);
  const list = Array.isArray(obligations) ? obligations : [];
  const legIds = legs.map((s) => s.leg_id);
  const index = new Map(legIds.map((id, i) => [id, i]));
  const legName = (id) => JSON.stringify(id);

  // THE RECORD (rules 1, 4 and 6): the item list, a raising
  // Leg, `owed_by` after it in path order, and exactly one terminal field
  // naming a Leg the row is owed to or raised by.
  for (const [n, o] of list.entries()) {
    const row = `obligation ${n + 1}`;
    if (!o || typeof o !== "object" || Array.isArray(o)) {
      return pathRefusal("obligation_row_terminal", null, `${row} is not a map.`);
    }
    if ("introduced_by" in o) {
      return pathRefusal("obligation_row_terminal", null,
        `${row} carries \`introduced_by\`, the Closure row's field — an Obligation names the Leg that raises it in \`raised_by\` (kogaki#1529).`);
    }
    const shape = obligationItemRefusal(o);
    if (shape) return pathRefusal("obligation_row_terminal", null, `${row} ${shape}.`);
    const label = obligationLabel(o);
    if (typeof o.raised_by !== "string" || !index.has(o.raised_by)) {
      return pathRefusal("obligation_row_terminal", null,
        `The ${label} row names raised_by ${legName(o.raised_by ?? null)}, which is not a Leg of this path.`);
    }
    const raisedAt = atId(o.raised_by);
    const raisedIdx = index.get(o.raised_by);
    if (!Array.isArray(o.owed_by)) {
      return pathRefusal("obligation_owed_in_order", raisedAt,
        `The ${label} row raised here carries no \`owed_by\` list — the Legs that keep it, after this one, in path order.`);
    }
    let prev = raisedIdx;
    for (const id of o.owed_by) {
      if (typeof id !== "string" || !index.has(id)) {
        return pathRefusal("obligation_owed_in_order", raisedAt,
          `The ${label} row raised here names owed_by ${legName(id)}, which is not a Leg of this path.`);
      }
      if (index.get(id) <= prev) {
        return pathRefusal("obligation_owed_in_order", atId(id),
          index.get(id) <= raisedIdx
            ? `The ${label} row raised at ${o.raised_by} names this Leg in owed_by, which does not come after the raising Leg.`
            : `The ${label} row raised at ${o.raised_by} names this Leg in owed_by after a later one — owed_by is in path order.`);
      }
      prev = index.get(id);
    }
    const hasD = o.discharged_by !== undefined;
    const hasC = o.conceded_by !== undefined;
    if (hasD === hasC) {
      return pathRefusal("obligation_row_terminal", raisedAt,
        `The ${label} row raised here carries ${hasD ? "BOTH discharged_by and conceded_by" : "NEITHER discharged_by nor conceded_by"}.`);
    }
    const end = obligationTerminal(o);
    if (hasD && (o.owed_by.length === 0 || end !== o.owed_by[o.owed_by.length - 1])) {
      return pathRefusal("obligation_row_terminal", raisedAt,
        `The ${label} row raised here ends discharged_by ${legName(end)}, which is not the last Leg in its owed_by ${JSON.stringify(o.owed_by)} — the promise is kept by the last Leg that owes it.`);
    }
    if (hasC && end !== o.raised_by && !o.owed_by.includes(end)) {
      return pathRefusal("obligation_row_terminal", raisedAt,
        `The ${label} row raised here ends conceded_by ${legName(end)}, which is neither the raising Leg nor a Leg in its owed_by.`);
    }
  }

  // AT MOST ONE CONCEDED ROW (kogaki#1232), each carrying `open`,
  // `why_not_here` and `reader_keeps` (kogaki#1263): a concession is not
  // silence, so the row says what stays unresolved, why this Leg is not the
  // one to close it, and what the reader is left holding in its place.
  const conceded = list.filter((o) => o.conceded_by !== undefined);
  if (conceded.length > 1) {
    return pathRefusal("obligation_one_conceded_row", null,
      `${conceded.length} rows end conceded_by: ${conceded.map((o) => obligationLabel(o)).join(", ")}.`);
  }
  for (const o of conceded) {
    const missing = CONCEDED_FIELDS.filter((k) => typeof o[k] !== "string" || o[k] === "");
    if (missing.length) {
      return pathRefusal("obligation_one_conceded_row", atId(o.raised_by),
        `The conceded ${obligationLabel(o)} row carries no ${missing.join(", ")} — `
        + "a conceded row ends conceded_by AND carries open, why_not_here and reader_keeps.");
    }
  }

  // CAPACITY (rule 3): a row is open on every Leg from its `raised_by` up to,
  // and NOT INCLUDING, the Leg that closes it; at most one row is
  // open at any Leg.
  const openPerLeg = new Map();
  for (const o of list) {
    for (let i = index.get(o.raised_by); i < index.get(obligationTerminal(o)); i++) {
      if (!openPerLeg.has(legIds[i])) openPerLeg.set(legIds[i], []);
      openPerLeg.get(legIds[i]).push(o);
    }
  }
  for (const [i, s] of legs.entries()) {
    const rows = openPerLeg.get(s.leg_id);
    if (rows && rows.length > 1) {
      return pathRefusal("obligation_one_open_per_unit", at(i),
        `${rows.length} rows are open here: ${rows.map((o) => obligationLabel(o)).join(", ")}.`);
    }
  }

  // SECTION (rule 5): no Leg owing an OPEN row carries `opens_section`.
  for (const o of list) {
    if (index.get(obligationTerminal(o)) <= index.get(o.raised_by)) continue; // open on no Leg
    const opener = o.owed_by.find((id) => legs[index.get(id)].opens_section !== undefined);
    if (opener) {
      return pathRefusal("obligation_owed_leg_opens_no_section", atId(opener),
        `This Leg owes the ${obligationLabel(o)} row raised at ${o.raised_by}, and carries opens_section.`);
    }
  }
  return null;
}

// THE READER TARGET LEG (kogaki#1231, owner decision 2026-09-30, reversing
// kogaki#1225's last-Leg derivation): exactly one Leg is marked
// `reaches_target`, never the first, and every Leg after it is a CLOSING
// Leg — held to the three rules this function raises. Run after every Leg
// is known to be well formed, for the reason `sectionGroupingRefusal` runs
// there: this is a statement about a Leg's position relative to the whole
// path, not about one Leg alone. `obligations` is the Candidate's own
// ledger (src/candidate-schema.json), OPTIONAL for the same reason
// `readerStart` is — a bare shape check over legs alone hands none, and an
// absent ledger is read as empty rather than invented. Returns a string to
// refuse with, or null.
export function readerTargetLegRefusal(legs, obligations = []) {
  const at = (i) => `leg ${i + 1} (${legs[i].leg_id})`;
  const marked = legs.map((s, i) => (s && s.reaches_target === true ? i : -1)).filter((i) => i >= 0);
  if (marked.length !== 1) {
    return pathRefusal("reaches_target_marked", null,
      marked.length === 0
        ? "No Leg of this path carries `reaches_target: true`."
        : `${marked.length} Legs carry it: ${marked.map((i) => at(i)).join(", ")}.`);
  }
  const targetIdx = marked[0];
  if (targetIdx === 0) {
    return pathRefusal("reaches_target_marked", at(0), "The first Leg carries it, leaving no Leg free to reach the target from anywhere.");
  }
  const targetLeg = legs[targetIdx];
  const obligationList = Array.isArray(obligations) ? obligations : [];
  for (let i = targetIdx + 1; i < legs.length; i++) {
    const s = legs[i];
    if (Array.isArray(s.introduces) && s.introduces.length > 0) {
      return pathRefusal("closing_leg_introduces_nothing", at(i),
        `This closing Leg (after ${targetLeg.leg_id}, which reaches the Reader target) still carries introduces: ${JSON.stringify(s.introduces)}.`);
    }
    const raised = obligationList.find((o) => o && o.raised_by === s.leg_id);
    if (raised) {
      return pathRefusal("closing_leg_introduces_nothing", at(i),
        `This closing Leg (after ${targetLeg.leg_id}) is named raised_by on the ${obligationLabel(raised)} row.`);
    }
    for (const dim of ["orientation", "knowledge"]) {
      const wantLine = readerStateDimensionLine(targetLeg.reader_state_after, dim);
      const gotLine = readerStateDimensionLine(s.reader_state_after, dim);
      if (gotLine !== wantLine) {
        return pathRefusal("closing_leg_state_fixed", at(i),
          `Its ${dim} line reads ${JSON.stringify(gotLine)}; the target Leg ${targetLeg.leg_id}'s reads ${JSON.stringify(wantLine)}.`);
      }
    }
  }
  return null;
}

// THE REACHING LEG'S `names` IS A SUBSET OF THE UNION OF EVERY LEG'S
// `introduces` (kogaki#1251 item 4, kogaki#1260): `names` is present, and
// means something, only on the Leg marked `reaches_target` (src/leg-schema.json,
// `names`) — the terms the path's own `introduces` entries have put in the
// reader's hands by the time the Reader target is reached. A name this path
// never introduces anywhere is refused naming the term; absence of `names`
// itself is a different check's job (required_when is not enforced here, to
// leave a path composed before this field unaffected). Run after every Leg is
// known to be well formed, the same reason `readerTargetLegRefusal` does. It
// reads `introduces` alone: no Obligation item counts toward `names`
// (kogaki#1568).
export function readerTargetNamesRefusal(legs) {
  const idx = targetLegIndex(legs);
  if (idx === -1) return null; // readerTargetLegRefusal names a missing or ambiguous mark
  const targetLeg = legs[idx];
  if (!Array.isArray(targetLeg.names)) return null;
  const introduced = new Set();
  for (const s of legs) {
    if (!s || typeof s !== "object" || !Array.isArray(s.introduces)) continue;
    for (const raw of s.introduces) {
      const e = parseIntroducesEntry(raw);
      if (e.error) continue; // introducesRefusal names this
      introduced.add(e.term);
    }
  }
  for (const name of targetLeg.names) {
    if (!introduced.has(name)) {
      return `leg ${idx + 1} (${targetLeg.leg_id}): names carries ${JSON.stringify(name)}, but no Leg of this path introduces it — `
        + "names is the union of every Leg's introduces entries by the time the Reader target is reached (src/leg-schema.json, `names`)";
    }
  }
  return null;
}

// Shape refusal over a whole `introduces` value. Returns a string to refuse
// with, or null. `at` is the caller's own way of naming the Leg, so one
// grammar serves the record side and the document side without either
// inventing wording the other does not use.
export function introducesRefusal(value, at) {
  if (!Array.isArray(value)) {
    return `${at}: introduces, when present, is an array of entries — a term the Leg puts in front of the reader for the first time, bare or with a one-line meaning anchor (the reader-knowledge ledger)`;
  }
  const seen = new Set();
  for (const raw of value) {
    const isItem = raw && typeof raw === "object" && !Array.isArray(raw);
    if (typeof raw !== "string" && !isItem) {
      return `${at}: introduces carries an entry that is neither a string nor an introduces_item object — each entry is one line, "term" or "term ${INTRODUCES_SEP} anchor", or a Candidate's own \`{term, meaning, ...}\` object (src/leg-schema.json, \`introduces_item\`)`;
    }
    const e = parseIntroducesEntry(raw);
    if (e.error) return `${at}: introduces carries ${e.error} (the reader-knowledge ledger)`;
    const key = e.term.toLowerCase();
    if (seen.has(key)) {
      return `${at}: introduces names "${e.term}" twice — a term is introduced once, and a Leg claiming it twice makes the ledger's own count wrong (the reader-knowledge ledger)`;
    }
    seen.add(key);
  }
  return null;
}

// AT MOST ONE introduces_item ACROSS THE WHOLE PATH MAY NAME `nearest`
// (kogaki#1251 item 2, kogaki#1260): `nearest` is an introduced term's near
// existing neighbour, offered so a reader can place the coinage against what
// they already have a name for. Two such comparisons in one path leave the
// reader holding two near-neighbour claims with nothing to decide between
// them, so a second is refused rather than rendered — naming both terms and
// both `nearest` values, so the composer can see which one to keep. Run over
// the WHOLE path rather than per Leg, the same reason the Section grouping
// and Closure are: this is a statement about the path, not about one Leg.
export function introducesNearestRefusal(legs) {
  const found = [];
  for (const s of legs) {
    if (!s || typeof s !== "object" || !Array.isArray(s.introduces)) continue;
    for (const raw of s.introduces) {
      const e = parseIntroducesEntry(raw);
      if (e.error) continue; // introducesRefusal names this
      if (typeof e.nearest === "string" && e.nearest !== "") {
        found.push({ leg_id: s.leg_id, term: e.term, nearest: e.nearest });
      }
    }
  }
  if (found.length > 1) {
    return `This Brief carries ${found.length} introduces items naming \`nearest\`: `
      + found.map((f) => `${JSON.stringify(f.term)} (leg ${f.leg_id}) nearest ${JSON.stringify(f.nearest)}`).join(" and ")
      + " — at most one introduced term may be compared to a nearest existing term across the whole path (src/leg-schema.json, `introduces_item.nearest`).";
  }
  return null;
}

// The re-activate grammar (kogaki#1237, widened to a third form by kogaki#1263
// and kogaki#1260; the claim form's `as` sentence required by kogaki#1282), in
// one place for the same reason `introduces`'s is: the composition side
// validates records and `draft.mjs parseLegBlockBody` parses the serialized
// form back. One line, "<leg_id> term <exact introduces term>",
// "<leg_id> claim <strand id> as <one plain sentence>" or
// "<leg_id> journey <strand id>". THE `as` SENTENCE IS A PLAIN RESTATEMENT
// WRITTEN AT BRIEF TIME, NEVER THE CLAIM'S OWN PROPOSITION RENDERED VERBATIM
// (kogaki#1282, owner decision 2026-10-06) — a re-activated claim crosses as
// this sentence, not as the whole proposition the Leg it depends on asserted.
export function parseReactivateEntry(raw) {
  const line = String(raw).trim();
  if (line === "") return { error: "an empty entry" };
  const m = line.match(/^(\S+)\s+(term|claim|journey)\s+(.+)$/s);
  if (!m) {
    return { error: `"${line}" — a re-activate entry is "<leg_id> term <exact introduces term>", "<leg_id> claim <strand id> as <one plain sentence>" or "<leg_id> journey <strand id>"` };
  }
  const [, leg_id, kind, rest] = m;
  if (kind === "claim") {
    const am = rest.match(/^(\S+)\s+as\s+(.+)$/s);
    if (!am) {
      return { error: `"${line}" — a re-activate claim entry is "<leg_id> claim <strand id> as <one plain sentence>", and the as sentence is required` };
    }
    const [, strand, asSentence] = am;
    const value = strand.trim();
    const as = asSentence.trim();
    if (value === "") return { error: `"${line}" names no strand after claim` };
    if (as === "") return { error: `"${line}" carries an as with no sentence after it — a re-activated claim crosses as a plain restatement, not as its proposition` };
    return { leg_id, kind, value, as };
  }
  const value = rest.trim();
  if (value === "") {
    return { error: `"${line}" names no ${kind === "term" ? "term" : "strand"} after ${kind}` };
  }
  return { leg_id, kind, value };
}

// Shape refusal over a whole `re-activate` value — mirrors `introducesRefusal`.
export function reactivateRefusal(value, at) {
  if (!Array.isArray(value)) {
    return `${at}: re-activate, when present, is an array of entries — one reference per line, "<leg_id> term <exact introduces term>", "<leg_id> claim <strand id> as <one plain sentence>" or "<leg_id> journey <strand id>" (re-activate)`;
  }
  for (const raw of value) {
    if (typeof raw !== "string") {
      return `${at}: re-activate carries a non-string entry — each entry is one line, "<leg_id> term <...>", "<leg_id> claim <strand id> as <one plain sentence>" or "<leg_id> journey <strand id>" (re-activate)`;
    }
    const e = parseReactivateEntry(raw);
    if (e.error) return `${at}: re-activate carries ${e.error} (re-activate)`;
  }
  return null;
}

// Semantic refusal over a whole `re-activate` value: THE CANDIDATE POPULATION
// IS CLOSED (kogaki#1237, owner decision 2026-09-30, widened by kogaki#1263
// and kogaki#1260) — everything explicitly represented in the Legs named in
// `depends_on`, specifically their `introduces` lines (exact strings), their
// `claims` (addressed by Strand) and, since the third form, their `journeys`
// (addressed by Strand). Obligation rows are never candidates. Refuses naming
// the entry: which Leg, which reference, and why it does not resolve.
export function reactivateSemanticRefusal(value, dependsOn, legs, at) {
  if (!Array.isArray(value)) return null; // reactivateRefusal names this
  const deps = new Set(dependsOn || []);
  const byId = new Map((legs || []).map((l) => [l.leg_id, l]));
  for (const raw of value) {
    const e = parseReactivateEntry(raw);
    if (e.error) continue; // reactivateRefusal names this
    if (!deps.has(e.leg_id)) {
      return `${at}: re-activate names ${JSON.stringify(raw.trim())}, but "${e.leg_id}" is not in this Leg's depends_on — a Leg may re-activate only material from a Leg it depends on`;
    }
    const target = byId.get(e.leg_id);
    if (!target) {
      return `${at}: re-activate names ${JSON.stringify(raw.trim())}, but no Leg in this path carries the id "${e.leg_id}"`;
    }
    if (e.kind === "term") {
      const found = (target.introduces || []).some((intro) => {
        const p = parseIntroducesEntry(intro);
        return !p.error && p.term === e.value;
      });
      if (!found) {
        return `${at}: re-activate names ${JSON.stringify(raw.trim())}, but "${e.leg_id}" does not introduce "${e.value}" — a re-activated term must match, verbatim, an entry in that Leg's introduces`;
      }
    } else if (e.kind === "claim") {
      const found = (target.claims || []).some((g) => g.strand === e.value);
      if (!found) {
        return `${at}: re-activate names ${JSON.stringify(raw.trim())}, but "${e.leg_id}" carries no claim for strand "${e.value}"`;
      }
    } else {
      const found = (target.journeys || []).some((j) => j && j.strand === e.value);
      if (!found) {
        return `${at}: re-activate names ${JSON.stringify(raw.trim())}, but "${e.leg_id}" carries no journey for strand "${e.value}" — a re-activated journey must match a Strand that Leg names in its journeys`;
      }
    }
  }
  return null;
}

// THE DERIVATION. For each Leg in path order, what the reader already knows
// arriving at it: the union of every EARLIER Leg's entries, first-introducer
// kept. Pure over the path — no store, no file, no I/O.
//
// FIRST INTRODUCER WINS, and that is the addressability property rather than a
// tie-break: where two Legs declare the same term, the reader met it at the
// earlier one, so that is the Leg a later question about the term resolves
// to. The second declaration is not an error — a composer may legitimately
// re-state a term — and it is not silently dropped either: it simply does not
// move the responsibility. No Obligation folds in (kogaki#1568): an Obligation
// and an `introduces` entry are two registers, and the ledger reads the second.
export function readerKnowledgeLedger(legs) {
  const known = new Map(); // term (lowercased) -> { term, anchor, introduced_by }
  const rows = [];
  for (const s of legs) {
    // The snapshot is taken BEFORE this Leg's own entries are folded in: a
    // Leg does not already know what it is itself introducing.
    rows.push({
      leg_id: s.leg_id,
      reader_already_knows: [...known.values()].map((v) => ({ ...v })),
    });
    for (const raw of s.introduces || []) {
      const e = parseIntroducesEntry(raw);
      if (e.error) continue; // validated upstream; a bad entry never reaches here
      const key = e.term.toLowerCase();
      if (!known.has(key)) {
        known.set(key, { term: e.term, anchor: e.anchor, introduced_by: s.leg_id });
      }
    }
  }
  return rows;
}

// Where responsibility for a term lies: the FIRST Leg that introduces it, or
// `null` — meaning the Brief itself — when no Leg does. The null case is the
// point of the function and not an error path: an article may legitimately
// rely on a term its path never introduces, and the ledger's job is to say
// SO, addressably, rather than to refuse.
export function introducerOf(term, legs) {
  const key = String(term).trim().toLowerCase();
  for (const s of legs) {
    for (const raw of s.introduces || []) {
      const e = parseIntroducesEntry(raw);
      if (!e.error && e.term.toLowerCase() === key) return s.leg_id;
    }
  }
  return null;
}
