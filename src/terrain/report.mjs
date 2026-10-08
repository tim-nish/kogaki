// Terrain — the Full Report and judgment provenance.
// One stage of the Terrain command, imported only by Terrain's own modules (kogaki#1259).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JUDGE_INVOCATIONS } from "../workflow/judge.mjs";
import { fail, gatewayQuery } from "../workflow/run-record.mjs";
import { selectShardNames, servedShardNames } from "../workflow/strands.mjs";

export const NO_JUDGE = "none";

// THE TYPED SUBDIVISION ENTRY (the report identity v9, kogaki#199):
//   {"G": {"judged": true, "subgroups": [ … ]}}   judged, with a subdivision
//   {"G": {"judged": true, "subgroups": []}}      judged, EMPTY — conformant
//   key absent                                    not judged — refused on the co-tag path
// A BARE ARRAY IS REFUSED BY NAME: two encodings for one fact are never accepted.
// (`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/knowledge-architecture.md:154`).
// THE TYPED CLAIMS RECORD (the open-questions section, v10, kogaki#212): the pin lives in
// one artifact with the claims, so it cannot go stale beside them.
//   { "composition_pin": { "tag": …, "pin": …, "groups": { "<G>": ["lesson:…"] } },
//     "claims":         { "<G>": "…" } }
// A BARE MAP IS REFUSED BY NAME.
export function readClaimsRecord(raw, record) {
  if (raw === undefined || raw === null) return { claims: {}, pin: null };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    fail("--claims must be an object (SPEC.md, the open-questions section, v10)");
  }
  if (!("composition_pin" in raw) || !("claims" in raw)) {
    fail("--claims is a bare {group: claim} map, which is the withdrawn pre-v10 form. "
      + "A claim composed outside the bounded read is what this refuses, and a bare map "
      + "carries no evidence of where it was composed from. Write "
      + '{"composition_pin": {...}, "claims": {...}} — `compose-input` emits the pin '
      + "(SPEC.md, the open-questions section, v10)");
  }
  const pin = raw.composition_pin;
  if (!pin || typeof pin !== "object" || Array.isArray(pin)) {
    fail("--claims carries no usable `composition_pin` object (SPEC.md, the open-questions section, v10)");
  }
  if (!pin.groups || typeof pin.groups !== "object" || Array.isArray(pin.groups)) {
    fail("--claims `composition_pin` carries no `groups` map. It must hold the MEMBER "
      + "SET compose-input served, per group — a digest cannot support a subset check "
      + "and can name no offender (SPEC.md, the open-questions section, v10)");
  }
  // AC4 — THE PIN BINDS THE SURVEY RECORD IT WAS COMPUTED AGAINST. A stale pin
  // must not become a confident wrong acceptance: re-resolving it silently
  // against a different record is the shape where the guard passes and the
  // claim it admitted was composed from material this survey never served.
  if (record && pin.pin && record.pin && pin.pin !== record.pin) {
    fail(`--claims was composed against survey pin ${pin.pin}, and this run's survey is `
      + `${record.pin}. The bounded read it evidences is not this one — re-run `
      + "compose-input against this survey and recompose (SPEC.md, the open-questions section, v10)");
  }
  const claims = raw.claims;
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    fail("--claims `claims` must be a {group: claim} object (SPEC.md, the open-questions section, v10)");
  }
  return { claims, pin };
}

// AC3 — THE SUBSET CHECK, bound by CONTENT and naming what falls outside.
//
// This is the load-bearing half. A pin asserting only that `compose-input` RAN
// is satisfiable by a session that runs it, takes the pin, and composes from
// the whole survey anyway — existence evidence standing in for standing
// (`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:63`).
// The subset relation is what makes composing outside the bounded read
// UNPRODUCIBLE rather than discouraged.
//
// Returns the offending entries, so the caller can NAME them. An empty array is
// a pass. Pure over its inputs, so the fixtures can state both directions
// without a gateway.
export function claimsOutsideBound(claims, pin, groups) {
  const out = [];
  const served = pin && pin.groups ? pin.groups : {};
  for (const name of Object.keys(claims)) {
    // A claim naming a group the bounded read never served is outside it,
    // whatever its members are.
    if (!Object.prototype.hasOwnProperty.call(served, name)) {
      out.push({ group: name, reason: "no such group in the bounded read", members: [] });
      continue;
    }
    // And a group whose composed membership exceeds what was served is outside
    // it too — the subset direction. A NARROWER set is fine: composing a claim
    // over a subset of the served members is normal work, which is exactly why
    // this is a subset test and not equality.
    const g = groups.find((x) => x.name === name || x.cotag === name);
    if (!g) continue;
    const allowed = new Set(served[name] || []);
    const stray = g.members.filter((m) => !allowed.has(m));
    if (stray.length) {
      out.push({ group: name, reason: "members outside the bounded read", members: stray });
    }
  }
  return out;
}

export function readSubdivisionEntry(name, entry) {
  if (entry === undefined || entry === null) return null;   // absent: not judged
  if (Array.isArray(entry)) {
    fail(`--subdivisions entry for ${JSON.stringify(name)} is a bare array, which is the `
      + `withdrawn pre-v9 form. Judged-empty and never-judged are different states and a `
      + `bare array cannot say which: write {"judged": true, "subgroups": [...]}, or omit `
      + `the key if the group was not judged (SPEC.md, the report identity v9)`);
  }
  if (typeof entry !== "object") {
    fail(`--subdivisions entry for ${JSON.stringify(name)} must be an object `
      + `{"judged": true, "subgroups": [...]} (SPEC.md, the report identity v9)`);
  }
  if (entry.judged !== true) {
    fail(`--subdivisions entry for ${JSON.stringify(name)} does not declare "judged": true. `
      + `The judgment is what the entry attests; an entry that does not state it is `
      + `indistinguishable from a run that never asked (SPEC.md, the report identity v9, the SubGroup threshold)`);
  }
  if (!Array.isArray(entry.subgroups)) {
    fail(`--subdivisions entry for ${JSON.stringify(name)} needs a "subgroups" array — `
      + `[] states JUDGED AND EMPTY, which is conformant and is not the same as absent `
      + `(SPEC.md, the report identity v9)`);
  }
  return { judged: true, subgroups: entry.subgroups };
}

// ---- JUDGMENT PROVENANCE (kogaki#892) -------------------------------------
// What the HARNESS OBSERVED about a judgment, held apart from what the RECORD DECLARES
// (owner ruling 2026-09-04: model output is never authoritative control input).
//   `observed`  the Harness invoked the judge itself (producer since kogaki#1030).
//   `declared`  no such record; the pin names what the COMPOSER says judged the split.
// In both states the `--subdivisions` sha is taken by the Harness from disk; it binds a
// rendering to a record and is NOT evidence a judgment ran — the text must say so.
// Never read back a model-composed record (e.g. a `judgment-record.json`).
const JUDGMENT_OBSERVED = "observed";
const JUDGMENT_DECLARED = "declared";

// The Harness's own judgment-invocation record. `null` where this process
// invoked no judge — the one honest value, and the state every pre-#1030 run is
// in. A FUNCTION rather than a bare constant so that the site is named and
// reachable, and so the two renderers below read one source rather than each
// testing a literal.
//
// THE DEFAULT ARGUMENT IS THE SUBDIVISION STATE because the two renderers that
// read this are the subdivision display's, and `judgmentProvenance` is called
// with the `--subdivisions` artifact. A caller naming another state gets that
// state's invocation.
function harnessJudgeInvocation(stateId = "J2_subdivision") {
  return JUDGE_INVOCATIONS.get(stateId) || null;
}

export function judgmentProvenance(subdivisionsPath) {
  const invocation = harnessJudgeInvocation();
  return {
    state: invocation ? JUDGMENT_OBSERVED : JUDGMENT_DECLARED,
    // Taken from the bytes on disk BY THIS LAYER. A sha the composer supplied
    // would be one more declaration, which is the whole of what this removes.
    artifact_sha: subdivisionsPath
      ? createHash("sha256").update(readFileSync(String(subdivisionsPath))).digest("hex").slice(0, 16)
      : null,
    invocation,
  };
}

// WHAT NAMES ONE INVOCATION RECORD (kogaki#1257). Both renderers read `.id`,
// a field `recordJudgeInvocation` never writes, so every OBSERVED line a real
// run produced named its record `undefined`; the cases fed a record carrying an
// `id` and saw nothing. The state and the moment of the call are written on
// every invocation record and together name one call; the response sha does
// not, since on the per-group arm it is the subdivisions record's own sha,
// which the same line already names.
function invocationRef(invocation) {
  return `${invocation.state}@${invocation.at}`;
}

// A record written before this field existed carries no provenance, and the
// honest reading of that is `declared` — an old record cannot show an
// observation it never made. Absent and declared are NOT collapsed elsewhere;
// they are collapsed HERE, once, at the one place the distinction has no
// consequence, so no renderer has to test for `undefined`.
export function provenanceOf(carrier) {
  const p = carrier && carrier.judgment_provenance;
  return p && p.state
    ? p
    : { state: JUDGMENT_DECLARED, artifact_sha: null, invocation: null };
}

// THE DISPLAY'S WRAP COLUMN, and it is TAKEN from the report notice rather
// than minted beside it (kogaki#919). The report's counterpart —
// `judgedEmptyNoticeLines`, transcribed line for line into
// `src/report-format.json`'s `judged_empty_notice_declared` — is hand-wrapped,
// and its widest line is this number. A second number chosen freely here is how
// two surfaces carrying the same provenance content come to wrap at two
// columns; the self-test asserts the notice's own lines still fit inside it, so
// the pair cannot drift apart in silence.
const DISPLAY_WRAP_COLUMNS = 77;

// Word wrap with a hanging indent marking a CONTINUATION (kogaki#317); the grammar's
// `judge_pin_continuation` class keys on that indent.
// A word longer than the column is emitted OVERLONG, never broken (shas, invocation ids).
// A `head` is emitted WHOLE on the first line (PR #921): the grammar classifies a wrapped
// line by its first line, so no input length may push the head onto a continuation.
function wrapDisplayLine(text, columns = DISPLAY_WRAP_COLUMNS, indent = "  ", head = null) {
  const words = String(text).split(/\s+/).filter((w) => w !== "");
  const out = [];
  let line = head === null ? "" : String(head);
  for (const w of words) {
    if (line === "") { line = w; continue; }
    if (`${line} ${w}`.length <= columns) { line = `${line} ${w}`; continue; }
    out.push(line);
    line = indent + w;
  }
  if (line !== "") out.push(line);
  return out.length ? out : [""];
}

// THE JUDGE LINE, composed ONCE for both owner surfaces (the SubGroup threshold, the report identity). Two
// renderers each writing their own sentence is how the display and the report
// would come to say different things about the same record — the second-carrier
// shape this file refuses everywhere else.
export function judgePinLine(pin, prov) {
  const p = prov || { state: JUDGMENT_DECLARED, artifact_sha: null, invocation: null };
  const seen = p.artifact_sha
    ? `the --subdivisions record it read, sha \`${p.artifact_sha}\``
    : "no --subdivisions record at all";
  // BOTH ARMS WRAP, by one rule (kogaki#919 acceptance 2; observed arm since kogaki#1030).
  // THE PIN CLAUSE IS THE HEAD on both arms (PR #921): each form abbreviates at exactly
  // the head's end, not one space later.
  if (p.state === JUDGMENT_OBSERVED) {
    return wrapDisplayLine(`the Harness holds its own `
      + `invocation record \`${invocationRef(p.invocation)}\`, taken over ${seen} (SPEC-terrain, the SubGroup threshold, the report identity)`,
    DISPLAY_WRAP_COLUMNS, "  ",
    `judged by ${pin.model_id} / ${pin.effort_tier} — OBSERVED:`).join("\n");
  }
  return wrapDisplayLine(`The Harness invoked no judge and holds `
    + `no invocation record, so this names what the composer says judged this split rather than something the `
    + `Harness saw happen; what it did observe is ${seen} (SPEC-terrain, the SubGroup threshold, the report identity — a judged surface with no `
    + `judge pin is the drift-undetectable shape; kogaki#892 — a declaration is not rendered as an observation)`,
  DISPLAY_WRAP_COLUMNS, "  ",
  `judge pin DECLARED — ${pin.model_id} / ${pin.effort_tier}.`).join("\n");
}

// THE REPORT'S JUDGE LINE, composed ONCE (kogaki#918; see also kogaki#892).
// Kept beside `judgePinLine`, not folded in: two surfaces, one composer each.
// Three arms (#918 adds the third): a `none` pin is the ABSENCE of a pin,
// never rendered as `pin DECLARED`.
// The clause names the RECORD, never the run: the idempotent rerun re-renders a PRIOR (pre-#892)
// record through this same function, so fix wording here, not at the rerun site.
export function reportJudgeLine(identity, prov) {
  const p = prov || { state: JUDGMENT_DECLARED, artifact_sha: null, invocation: null };
  const held = p.artifact_sha
    ? `subdivisions record sha \`${p.artifact_sha}\``
    : "no subdivisions record";
  if (identity.judge_pin === NO_JUDGE) {
    return "*Judge:* `none` — this report names no judge, so there is nothing here to attribute "
      + `to one; the record holds: ${held}`;
  }
  const pinText = `\`${identity.judge_pin.model_id}/${identity.judge_pin.effort_tier}\``;
  return `*Judge:* ${pinText} — ${p.state === JUDGMENT_OBSERVED
    ? `OBSERVED, Harness invocation record \`${invocationRef(p.invocation)}\`, over ${held}`
    : `pin DECLARED, no Harness invocation record; the record holds: ${held}`}`;
}

// THE JUDGED-EMPTY NOTICE (kogaki#892 acceptance 2). Below the threshold a
// judged-empty outcome is conformant and renders; at or above it the pre-render
// refusal in `cmdReport` has already fired, which is why the size scoping this
// acceptance names is enforced upstream rather than re-tested here — a second
// size test would be a second carrier for one threshold.
export function judgedEmptyNoticeLines(prov) {
  if ((prov || {}).state === JUDGMENT_OBSERVED) {
    return ["*The judgment produced NO split — this is a judged-empty outcome,",
      "not an absent judgment. Members are listed below.*"];
  }
  return ["*NO SPLIT IS RECORDED for this group. The subdivisions record declares a",
    "judgment that produced none; the Harness invoked no judge and holds no",
    "invocation record, so it cannot show that a judgment RAN and does not say",
    "one did (kogaki#892). This is still not an absent record: `[]` and an absent",
    "key stay different states. Members are listed below.*"];
}


// The shard, parsed WHOLE. `parseGlossShard` above returns the first sentence
// because a display row is a headline; the Full Report forbids truncation anywhere, so the
// report cannot reuse it — the same shard read for two purposes needs two
// readers, not one reader with a flag.
function parseGlossFull(resp) {
  const out = new Map();
  let slug = null;
  let body = [];
  let cite = null;
  const flush = () => {
    if (slug && body.length) out.set(slug, { body: body.join("\n").trim(), cite });
    slug = null; body = []; cite = null;
  };
  for (const line of resp.lines || []) {
    const t = line.text;
    if (t.startsWith("## ")) { flush(); slug = t.slice(3).trim(); continue; }
    if (!slug) continue;
    // `Source:` closes an entry; `---` separates them. Everything between the
    // heading and those is the entry's body, kept WHOLE — no sentence match,
    // no cap, no ellipsis, because the Full Report forbids truncation anywhere.
    if (t.startsWith("Source:") || t.startsWith("---")) { flush(); continue; }
    if (t.trim() === "") { if (body.length) body.push(""); continue; }
    if (!body.length) cite = line.cite;
    body.push(t);
  }
  flush();
  return out;
}

// THE ADDRESS IS SELECTED HERE TOO (kogaki#1106) — see `fetchHeadlines` above
// for why no address in this module is composed any more. A tag resolves to
// every served cell carrying it, merged first-wins across cells in the order
// the surface served them, which is the same rule `fetchHeadlines` applies.
//
// AN UNADDRESSABLE TAG RETURNS AN EMPTY MAP, as a tag with no served rendering
// always did — and unlike the headline path this one has no marker vocabulary
// to report the difference through, because its callers render BODIES and a
// body's absence is disclosed by the surface that wanted it. What this path
// does not do is pretend a request was made: the empty map is reached without
// spending one.
export function fetchGlossBodies(kind, tag) {
  const names = servedShardNames();
  const out = new Map();
  for (const address of names ? selectShardNames(names, kind, tag) : []) {
    const resp = gatewayQuery("gloss_index", { tag: address });
    if (resp.miss) continue;
    for (const [slug, entry] of parseGlossFull(resp)) if (!out.has(slug)) out.set(slug, entry);
  }
  return out;
}
