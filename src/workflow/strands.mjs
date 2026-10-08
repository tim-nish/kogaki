// The workflow engine — served shard addresses, headlines and Gloss, and the Brief's Strand set.
// Shared by every command that runs a workflow table, so it lives outside every command
// directory (kogaki#1259, kogaki#1302).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gatewayQuery } from "./run-record.mjs";

// ---- VIEW -----------------------------------------------------------------
// view — navigation. Narrows nothing; the record is never rewritten.
// A tier-2 gloss shard, parsed into slug → { headline, cite }. The headline is
// the SERVED rendering's first sentence, quoted at the cite the seam returned —
// never re-parsed from a file and never composed here (SPEC.md, the served-renderings input rule, the rendering rule).
function parseGlossShard(resp) {
  const out = new Map();
  const lines = resp.lines || [];
  let slug = null;
  for (const line of lines) {
    const t = line.text;
    if (t.startsWith("## ")) { slug = t.slice(3).trim(); continue; }
    if (!slug) continue;
    if (t.trim() === "" || t.startsWith("Source:") || t.startsWith("---")) continue;
    const sentence = t.match(/^.*?[.!?](?=\s|$)/);
    out.set(slug, { headline: (sentence ? sentence[0] : t).trim(), cite: line.cite });
    slug = null;
  }
  return out;
}

// ---- SHARD ADDRESSES ------------------------------------------------------
// Shard ADDRESSES are selected from the served enumeration, never composed here (kogaki#1106).
// An address is a cell of `axis=value` pairs in the Kind's declared order, and cell shapes vary
// (product-lab@7e109c8c views/lessons/tag=agents,window=2026-08.md:3-5); never render a path.
// `surface_names(kind: "gloss")` names every shard; a (namespace, tag) request resolves to the
// served names whose namespace matches and whose cell carries that tag.
// Establishes the ADDRESS conjunct from the DISCLOSURE one (product-lab@7e109c8c LESSONS.md:168);
// a shard `surface_names` stops enumerating reports as an address fault.
// A served name parsed into its namespace and its cell; null for a name that is not an address,
// which the selector's caller reports rather than skips.
function parseShardName(name) {
  if (typeof name !== "string") return null;
  const slash = name.indexOf("/");
  if (slash <= 0 || slash === name.length - 1) return null;
  const namespace = name.slice(0, slash);
  const cell = new Map();
  for (const pair of name.slice(slash + 1).split(",")) {
    const eq = pair.indexOf("=");
    // A SEGMENT WITH NO `=` IS NOT AN AXIS PAIR, and is kept under the empty
    // axis name rather than dropped: a name shaped `lessons/agents` — the form
    // this module used to compose — must not parse as a cell carrying
    // `tag=agents`, or the selector would match the very address the surface
    // stopped serving and the fault would be invisible again.
    if (eq <= 0) { cell.set("", pair); continue; }
    cell.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return { name, namespace, cell };
}

// The served names addressing (namespace, tag), in the order the surface served
// them. PURE, and separate from the read above it, because the property this
// change asserts is about ADDRESS SELECTION and a case that had to reach a
// gateway to drive it would be asserting the seam instead.
export function selectShardNames(names, namespace, tag) {
  const out = [];
  for (const n of names || []) {
    const p = parseShardName(n);
    if (!p || p.namespace !== namespace) continue;
    if (p.cell.get("tag") !== tag) continue;
    out.push(p.name);
  }
  return out;
}

// THE ENUMERATION IS READ ONCE PER PROCESS. It is one call for the whole run
// and it is what every address in this module is now derived from, so a
// per-caller read would spend the same request repeatedly to learn the same
// thing. `null` means the read did not happen — which is a seam state and not
// an empty corpus, and the two are kept apart by the caller.
let SERVED_SHARD_NAMES;
export function servedShardNames({ soft = false } = {}) {
  if (SERVED_SHARD_NAMES !== undefined) return SERVED_SHARD_NAMES;
  const resp = gatewayQuery("surface_names", { kind: "gloss" }, { soft });
  // A TRANSPORT FAILURE AND AN EMPTY ENUMERATION ARE DIFFERENT ANSWERS. The
  // first establishes nothing; the second is the surface saying it serves no
  // Gloss shard, which is a read and is the empty corpus.
  SERVED_SHARD_NAMES = resp ? (resp.miss ? [] : (resp.lines || []).map((l) => l.text.trim()).filter(Boolean)) : null;
  return SERVED_SHARD_NAMES;
}

// Tag-scoped and bounded: the shards the served enumeration names for the viewed tags, and
// nothing else (SPEC.md, the rendering rule). A tag may span several cells; read them all, since
// a cell not read is material silently absent.
// `stats` is an out-parameter; `resolveHeadlines` is its only injecting caller.
// `answered` counts seam responses, misses included, so "no rendering" and "no read" differ
// (kogaki#689); `unaddressable` counts tags the enumeration names no shard for (kogaki#1106).
function fetchHeadlines(kind, tags, { soft = false, stats = null } = {}) {
  const out = new Map();
  const names = servedShardNames({ soft });
  if (stats) {
    stats.namesRead = names !== null;
    stats.namesServed = names ? names.length : 0;
  }
  for (const t of tags) {
    if (stats) stats.tagsAsked += 1;
    const addresses = names ? selectShardNames(names, kind, t) : [];
    if (!addresses.length) {
      // NAMED AS UNADDRESSABLE RATHER THAN COUNTED AS A MISS. No request was
      // made for this tag, so reporting it as one would say the surface was
      // asked and answered nothing.
      if (stats) stats.unaddressable.add(t);
      continue;
    }
    if (stats) stats.tagsAddressed += 1;
    for (const address of addresses) {
      const resp = gatewayQuery("gloss_index", { tag: address }, { soft });
      if (stats) stats.calls += 1;
      if (!resp) continue;
      if (stats) stats.answered += 1;
      if (resp.miss) continue;
      for (const [slug, entry] of parseGlossShard(resp)) if (!out.has(slug)) out.set(slug, entry);
    }
  }
  return out;
}

export const NO_HEADLINE = "⟨no served Gloss rendering — ABNORMAL, a fault to clear, never substituted⟩";

// THE SECOND MISS STATE (kogaki#689, PR #693 round 1): `NO_HEADLINE` means a shard was READ and
// carried no rendering; a row whose shard was never ADDRESSED gets this marker instead.
// Covers both causes: the record carries no tag, or its family is outside every namespace the
// fetch was given. Tagged journeys are addressable (the fetch reads `journeys/` too).
// product-lab@b20d85ea topics/archive/knowledge-architecture.md:57
export const NO_SHARD_ADDRESSED = "⟨no Gloss shard carries this row — it carries no tag, or its family is outside the namespaces this path reads; a fault to clear, never substituted⟩";

// THE FOURTH STATE, DISTINGUISHED (kogaki#689, owner selection at the
// /ship-cycle 689 sitting). When the SEAM ITSELF is unreachable no shard is
// read at all, every entry comes back unfound, and a row that WOULD have been
// addressed rendered `NO_HEADLINE` — whose declared meaning is "a shard was
// READ and carried no rendering". That is false of a read that never happened,
// and it is the same conflation the other three markers exist to prevent, one
// layer further out. The shape is this repository's own degradation idiom: a
// seam-absent member reports CANNOT-DETERMINE rather than passing or failing.
export const NO_SEAM = "⟨no Gloss shard was read — the served seam was unreachable for this pull; a fault to clear, never substituted⟩";

// THE FIFTH AND SIXTH STATES (kogaki#1106): the ADDRESS itself is the fault, so `NO_HEADLINE`
// would wrongly claim the material is missing. A misaddressed corpus and an empty corpus are
// kept apart, matching the seam state's `address-fault` / `empty-corpus` split.
const NO_SHARD_NAME = "⟨the served enumeration names no Gloss shard for this row's tags — the address, not the material, is what is missing; a fault to clear, never substituted⟩";

const NO_SHARD_SERVED = "⟨the served enumeration names no Gloss shard at all — the corpus is empty rather than misaddressed; a fault to clear, never substituted⟩";

// A TAG IS UNADDRESSABLE ONLY WHERE **EVERY** NAMESPACE READ FAILED TO NAME A SHARD FOR IT
// (PR #1107 round 1, blocking) — an intersection, not a union, across namespaces.
// Pure and separate from the fetch loop so the quantifier is fixturable; no namespaces yields
// the empty set.
function intersectUnaddressable(sets) {
  const list = (sets || []).filter(Boolean);
  if (!list.length) return new Set();
  return new Set([...list[0]].filter((t) => list.every((s2) => s2.has(t))));
}

// WHICH FAMILY EACH SHARD NAMESPACE CARRIES. Addressability is derived from the
// namespaces a fetch was ACTUALLY GIVEN rather than from a second hard-coded
// list: `resolveHeadlines` takes its namespace set as a parameter, so a list
// here would let the two drift and would tell a caller resolving with the
// default that a tagged journey's miss was read-and-empty — a read that never
// happened, which is the conflation these markers exist to prevent (PR #711
// round 1).
const NAMESPACE_FAMILY = { lessons: "lesson", journeys: "journey" };
function familiesFor(namespaces) {
  return (namespaces || []).map((ns) => NAMESPACE_FAMILY[ns]).filter(Boolean);
}

// THE BOUNDED RESOLVER THE BRIEF LANE CALLS (kogaki#528): the Brief gets served prose through
// Terrain, the one seam reader (the served-renderings input rule, the rendering rule).
// Bounded by the members, never by the corpus: fetch only the union of the members' own tags.
// An absence is disclosed as NO_HEADLINE, never substituted.
export function resolveHeadlines(members, { namespaces = ["lessons"] } = {}) {
  const list = Array.isArray(members) ? members : [];
  const tags = [...new Set(list.flatMap((m) => m.tags || []))];
  // THE BOUND IS UNCHANGED BY THE SECOND NAMESPACE. The tag union is still a
  // function of the members handed in, so a namespace is a second shard per tag
  // ALREADY in that union and never a wider tag set — the corpus-wide prefetch
  // the rendering rule forbids stays unreachable from here.
  // SIX FIELDS, BECAUSE THE SEAM STATE IS NOW A SIX-WAY READ (kogaki#1106).
  // `namesRead`/`namesServed` answer whether the ENUMERATION was reachable and
  // whether it carries anything; `tagsAsked`/`tagsAddressed` and `unaddressable`
  // answer whether the tags this pull holds are names the surface serves. None
  // of the three questions is derivable from the other two.
  const stats = { calls: 0, answered: 0, namesRead: false, namesServed: 0,
                  tagsAsked: 0, tagsAddressed: 0, unaddressable: new Set() };
  // ONE SET PER NAMESPACE, INTERSECTED AFTER THE LOOP. `fetchHeadlines` reports
  // what ITS namespace could not name, which is a different question from what
  // the pull could not name; keeping one shared set answered the second with
  // the first (PR #1107 round 1).
  const perNamespace = [];
  const heads = new Map();
  if (tags.length) {
    for (const ns of namespaces) {
      stats.unaddressable = new Set();
      for (const [slug, e] of fetchHeadlines(ns, tags, { soft: true, stats })) {
        // FIRST NAMESPACE WINS on a slug present in both, which is the same
        // first-wins rule `fetchHeadlines` already applies across tags.
        //
        // STATED AND UNEXERCISED, and said so rather than left to read as
        // covered (PR #711 round 1, out-of-dimension). Slugs are family-scoped
        // in the served corpus, so no served record can reach this branch and
        // no case drives it — a fixture built to reach it would be asserting
        // against material the substrate cannot produce. What the statement
        // buys is that an implementation meeting the case cannot settle it
        // silently; what it does not buy is a check, and a reader counting this
        // as covered would be counting a comment.
        if (!heads.has(slug)) heads.set(slug, e);
      }
      perNamespace.push(stats.unaddressable);
    }
  }
  const unaddressable = intersectUnaddressable(perNamespace);
  const out = new Map();
  for (const m of list) {
    const e = heads.get(m.slug);
    // `found` SEPARATES A HIT FROM A MISS AT THIS BOUNDARY (kogaki#689, PR #693
    // round 2). Every member got an entry and a miss got `NO_HEADLINE` stamped
    // in, so a caller reading only the entry could not tell a shard that
    // answered from one that did not — the miss was resolved HERE and the
    // caller's own handling of it was dead code it could not detect. The
    // headline field keeps the marker so the disclosure contract this function
    // was built with is unchanged; the flag is added beside it.
    out.set(m.slug, e ? { headline: e.headline, cite: e.cite, found: true }
                      : { headline: NO_HEADLINE, cite: null, found: false });
  }
  // FIVE SEAM STATES, REPORTED RATHER THAN INFERRED FROM AN EMPTY MAP.
  // `not-attempted` is not a degraded seam: no row had a tag, so no address
  // could be formed and there was nothing to read. Collapsing it into
  // `unreachable` would blame the seam for a property of the rows.
  //
  // THE ORDER IS THE ORDER THE QUESTIONS BECOME ANSWERABLE (kogaki#1106).
  // Whether anything was asked for comes first; then whether the enumeration
  // this pull's addresses are derived from was reachable at all, because with
  // it unread nothing below it can be established; then whether it carries any
  // shard name (an empty corpus); then whether any of those names addresses a
  // tag this pull holds (an address fault); and only then the read states,
  // which presuppose that a request was actually made.
  const seam = stats.tagsAsked === 0 ? "not-attempted"
             : !stats.namesRead ? "unreachable"
             : stats.namesServed === 0 ? "empty-corpus"
             : stats.tagsAddressed === 0 ? "address-fault"
             : stats.answered > 0 ? "answered"
             : "unreachable";
  // THE NAMESPACE SET TRAVELS WITH THE RESULT, so `glossFor` decides
  // addressability against what was read rather than against a second list.
  //
  // AND SO DOES THE UNADDRESSABLE TAG SET, for the same reason one level in: a
  // PARTIAL address fault — some tags named, some not — leaves the aggregate
  // `answered`, and a row whose every tag is in this set would then be stamped
  // with a read that never happened. The aggregate answers for the pull; this
  // answers for the row.
  return { headlines: out, seam, namespaces, unaddressable };
}

// WHICH GLOSS STATE A ROW IS IN (kogaki#689, PR #693 round 1). Exported and pure so cases
// reach the state assignment, not the emitter's fallback. Four states, four answers:
//   * a shard was read and carried a rendering → the headline;
//   * a shard was READ and carried none for the slug → `NO_HEADLINE`;
//   * no shard could be addressed (no tag, or family outside the namespaces) → `NO_SHARD_ADDRESSED`;
//   * the seam itself never answered → `NO_SEAM`.
// Never render one miss state as another. `NO_SEAM` cannot arise on the report path today.
export function glossFor(sug, headline, seam, namespaces = ["lessons"], unaddressable = null) {
  // READ `found`, NEVER TRUTHINESS OF THE ENTRY. `resolveHeadlines` returns an
  // entry for every member it was handed, so `if (headline)` was true on every
  // miss and this function's whole second half was unreachable from the report
  // path — the branch existed, was asserted directly, and could not be reached
  // by the one caller that matters (PR #693 round 2). That is the same silence
  // one call site in from where round 1 looked: a branch that never ran and a
  // branch that ran correctly are indistinguishable from the suite.
  if (headline && headline.found) return headline.headline;
  // ADDRESSABILITY IS A PROPERTY OF THE ROW and is decided first, because a row
  // with no address has nothing to attribute to the seam however the seam
  // behaved. The family set is the one the namespaces above can carry.
  const addressable = ((sug && sug.tags) || []).length > 0
    && sug && familiesFor(namespaces).includes(sug.family);
  if (!addressable) return NO_SHARD_ADDRESSED;
  // THE SEAM ARM SITS BETWEEN THE TWO READ STATES. `unreachable` means no shard
  // answered at all, so `NO_HEADLINE` — which asserts a shard was read — would
  // be false of this row. A caller that passes no `seam` gets the pre-#689
  // behaviour rather than a silent new marker.
  if (seam === "unreachable") return NO_SEAM;
  // THE ADDRESS ARMS SIT ABOVE THE READ MARKER, because both are states in
  // which no request was made for this row (kogaki#1106). A caller that passes
  // neither the new seam states nor `unaddressable` gets the pre-#1106
  // behaviour, on the same rule the arm above it follows.
  if (seam === "empty-corpus") return NO_SHARD_SERVED;
  // THE ROW-LEVEL READ IS TRIED BEFORE THE AGGREGATE ONE and subsumes it: on a
  // total fault every row's tags are in the set, so the aggregate arm below is
  // reached only by a caller that passed the seam state without the set.
  const tags = (sug && sug.tags) || [];
  if (unaddressable && tags.length && tags.every((t) => unaddressable.has(t))) return NO_SHARD_NAME;
  if (seam === "address-fault") return NO_SHARD_NAME;
  return NO_HEADLINE;
}

// ---- THE BRIEF'S STRAND SET (kogaki#1116) ---------------------------------
// Resolves the Strand set Brief is started with against the served enumeration.
// Brief takes its set on its own command line and never reads a Terrain run.
// Records: kogaki#1108, kogaki#1090; product-lab#263 R1.
// An argument is the served address `<package>::<kind>/<local-name>`; an `L<n>` token is
// positional, so it is refused BY NAME. Lives here: this file is the one served reader.
const TERRAIN_TOKEN = /^(?:G[0-9]+(?:-[0-9]+)?|L[0-9]+|D[0-9]+)$/;

// The refusal every human-facing token takes, stated once so the three token
// families cannot drift into three readings of one rule.
function terrainTokenRefusal(tokens) {
  return `${tokens.join(", ")}: a Full Report coordinate, not a Strand address. `
    + "Terrain mints G/L/D tokens by position in the served enumeration at survey "
    + "time, so they name a row of one report rather than a Strand, and a pin "
    + "advance renumbers them. The MODEL resolves a report coordinate into served "
    + "addresses from the Full Report BEFORE invoking the brief skill, and the "
    + "skill is invoked with those addresses. Nothing was written.";
}

// The served address at its content hash — the cite every Brief output carries
// (kogaki#1116, acceptance item 6). THE COMMIT PIN IS DEPRECATED (hub decision
// staged 2026-09-14): the substrate pin dated a whole response, so two Strands
// cited at one pin were indistinguishable from two Strands that had both moved,
// and a reader holding the cite could not tell whether the material under it had
// changed. A content hash answers exactly that, per line, and the gateway
// already returns one — so the cite is the address the Package serves joined to
// the hash it serves beside it, and no kogaki artifact carries `@<commit>`.
function composeAddressCite(unitId, contentHash) {
  if (typeof unitId !== "string" || unitId === "") return null;
  if (typeof contentHash !== "string" || contentHash === "") return null;
  return `${unitId}@${contentHash}`;
}

// Resolve a Brief run's addresses against the served enumeration; returns `{ strands }`
// or `{ error }`. Refuses BY NAME and substitutes nothing; the refusal states the COUNT
// searched rather than listing ~1700 rows.
// The display id `L<n>` is minted here by argument order: a within-document token, while
// the identity on the command line and in every cite stays the served address.
export function resolveStrandAddresses(entered) {
  const list = (Array.isArray(entered) ? entered : []).map((x) => String(x).trim()).filter(Boolean);
  if (!list.length) {
    return { error: "no Strand address was given. A Brief is started with the served "
      + "Lesson addresses it composes from: `coding::lesson/<local-name>`, space-separated "
      + "(a bare local name resolves against the Lesson kind). Nothing was written." };
  }
  const terrainTokens = list.filter((x) => TERRAIN_TOKEN.test(x));
  if (terrainTokens.length) return { error: terrainTokenRefusal(terrainTokens) };

  // THE TRANSPORT AND THE RESOLUTION ARE SEPARABLE, which is what keeps the
  // Brief fixture pass SEAM-FREE (kogaki#1116). `KOGAKI_ELEMENTS_PAYLOAD` names
  // a RECORDED `element_survey` response — the same discipline
  // `src/cite-check.mjs` states one seam over, where the judge is pure over the
  // transport's text so a fixture can drive it with a recording. It is a fixture
  // route and not a second corpus: an unreadable recording REFUSES rather than
  // falling through to the live seam, because a fixture that silently reached
  // the network would be asserting against whatever the substrate served that
  // day.
  const recorded = process.env.KOGAKI_ELEMENTS_PAYLOAD;
  let resp;
  if (recorded) {
    try {
      resp = JSON.parse(readFileSync(recorded, "utf8"));
    } catch (e) {
      return { error: `KOGAKI_ELEMENTS_PAYLOAD names ${recorded}, which is not a readable `
        + `element_survey recording (${e.message}). A recorded enumeration that cannot be read is `
        + "not an empty enumeration, and falling through to the live seam would make this run's "
        + "answer depend on a substrate the caller asked it not to read." };
    }
  } else {
    resp = gatewayQuery("element_survey", {});
  }
  const byUnit = new Map();
  const lessonBySlug = new Map();
  const journeyBySlug = new Map();
  let served = 0;
  for (const line of resp.lines || []) {
    let rec;
    try {
      rec = JSON.parse(line.text);
    } catch {
      return { error: `unparseable served record at ${line.cite} — surfaced, not skipped: a silently `
        + "dropped record makes an address look unserved when it is the read that failed" };
    }
    served++;
    if (rec.unit_id) byUnit.set(rec.unit_id, rec);
    if (rec.kind === "lesson" && !lessonBySlug.has(rec.slug)) lessonBySlug.set(rec.slug, rec);
    if (rec.kind === "journey" && !journeyBySlug.has(rec.slug)) journeyBySlug.set(rec.slug, rec);
  }

  const strands = [];
  const seen = new Set();
  const missing = [];
  const wrongKind = [];
  for (const addr of list) {
    const rec = byUnit.get(addr) || (addr.includes("::") ? null : lessonBySlug.get(addr));
    if (!rec) { missing.push(addr); continue; }
    if (rec.kind !== "lesson") { wrongKind.push(`${addr} (kind ${rec.kind})`); continue; }
    // Dedup preserving the entered order — the set is the unit, and a repeat is
    // not an error the owner should be stopped for (the deleted resolver's rule,
    // kept).
    if (seen.has(rec.unit_id)) continue;
    seen.add(rec.unit_id);
    const cite = composeAddressCite(rec.unit_id, rec.content_hash);
    if (!cite) {
      return { error: `the served record for ${addr} carries no ${rec.unit_id ? "content hash" : "address"} — `
        + "a Strand whose cite cannot be composed is a fault to clear, never material to compose from" };
    }
    const j = journeyBySlug.get(rec.slug);
    strands.push({
      id: `lesson:${rec.slug}`,
      display_id: `L${strands.length + 1}`,
      slug: rec.slug,
      family: "lesson",
      address: rec.unit_id,
      tags: rec.tags || [],
      cite,
      journey: j ? { slug: j.slug, cite: composeAddressCite(j.unit_id, j.content_hash) } : null,
    });
  }
  if (wrongKind.length) {
    return { error: `${wrongKind.join(", ")}: served, but not a Lesson. A Brief composes from Lessons; `
      + "a Journey is a Lesson's own material and rides its Strand, and a Decision is not article "
      + "material at all. Nothing was written." };
  }
  if (missing.length) {
    return { error: `${missing.join(", ")}: the Package serves no such address. Searched ${served} served `
      + `record(s) at ${resp.pin ?? "an unnamed pin"}. An address is `
      + "`<package>::<kind>/<local-name>` as the Package serves it, or a bare local name resolved "
      + "against the Lesson kind. Nothing was dropped silently — every entered address is placed or "
      + "named. Nothing was written." };
  }
  return { strands };
}

// ---- REPORT ---------------------------------------------------------------
// report — the Full Report (SPEC.md): untruncated Claims and Glosses, so it parses the
// served shard whole rather than through `parseGlossShard`.
// A REPORT ranks, narrows and hides nothing; a RENDERING, so no report id is an address
// (topics/articles.md:64,71@f918c515).
export const NO_GLOSS_BODY = "⟨no served Gloss rendering — ABNORMAL, a fault to clear, never substituted⟩";
