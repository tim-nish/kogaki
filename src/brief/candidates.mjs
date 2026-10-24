// brief/candidates — the Thesis candidates, the slug, and the `enter`, `adopt`
// and `mint` commands. Cut from src/brief.mjs at its named sections
// (kogaki#1466); the design and its rulings are stated in the Issues each
// block below names.

// THE ORDER IS THE CONTRACT (v9, owner ruling 2026-08-17): entry resolves the
// settled Strand set → the thesis-determination gate → the mint. Nothing lands
// under theses/ before a Thesis is adopted: pre-Thesis state is a machine-local
// run record, and no code path below writes into theses/ except `mint`, which
// refuses without an adopted Thesis.

// THERE IS NO SECOND ASK (v11, kogaki#518): every option of the one gate is a
// (Thesis, slug) pair, the slug rendered as its own element, and `adopt` takes
// the owner's override of that half without restating the Thesis.
// OUTSIDE TERRAIN (the 2026-08-09 boundary correction): this runtime never
// surveys, widens or fetches a set; growing it routes back through Terrain.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the read-not-invented rule; the prose-at-the-surface
//       rule; the durable home and the entry point
//   SPEC-terrain: the Full Report; location and naming; the display-ID rule;
//       the served-renderings input rule; the rendering rule
//
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { findInternalVocabulary } from "../assemble.mjs";
import {
  BRIEF_RECORD_FILE, briefRecordDeclaration, briefRecordText, briefSlotKeys,
  definedTermsRefusal, ownerGateDigest, snapshotBrief, validateOwnerAnswer,
} from "../compose.mjs";
import { glossFor, resolveHeadlines, resolveStrandAddresses } from "../workflow/strands.mjs";
import {
  argString, briefComposePathDefault, defaultRunState, fail, readRunState, strandClaims,
} from "./run-state.mjs";

// The inputs the mint reads, and no others: an input it does not name is
// refused by name rather than ignored (kogaki#1571 retired the
// external-authority switch, and a caller still passing it learns so here).
const COMPOSE_BRIEF_INPUTS = Object.freeze(["slug", "strands", "thesis", "composePath", "definedTerms", "claims"]);

// THE BRIEF IS ONE YAML RECORD (kogaki#1328, owner decision 2026-10-10), and
// the mint writes its first version: the header fields, the closed Strand set
// and the adopted Thesis FILLED, and every field downstream of the Thesis
// present as `null` — a TYPED UNFILLED SLOT. An absent field and a field
// awaiting composition are different silences, and only the second lets a
// later sitting resume (the durable home and the entry point). The key set and
// its captions are `src/candidate-schema.json`'s `brief_record`.
//
// Exported and pure over its inputs, so the check exercises the record
// without a filesystem. `thesis` is required: at v9 no document exists
// without one. Returns the record's text.
export function composeBrief(input) {
  const unread = Object.keys(input).find((k) => !COMPOSE_BRIEF_INPUTS.includes(k));
  if (unread !== undefined) {
    throw new Error(`composeBrief: \`${unread}\` is not an input the mint reads (${COMPOSE_BRIEF_INPUTS.join(", ")}) — the Brief header carries \`slug\` and \`compose_path\` only, and an introduced term crosses as \`- <term> — <meaning>\` (kogaki#1571)`);
  }
  const { slug, strands, thesis, composePath, definedTerms = [], claims = [] } = input;
  if (typeof thesis !== "string" || thesis === "") {
    throw new Error("composeBrief: a Brief cannot be composed without an adopted thesis (the durable home and the entry point v9)");
  }
  // THE AUDIENCE'S PATH, RECORDED AT MINT (kogaki#1262, carrying kogaki#1251
  // item 1). `compose_path` names the Audience file the `compose_path` workflow
  // state will author the Brief's Reader start from — so the Packet can read
  // the Audience's `register` from the same path the Brief itself names,
  // rather than from the workflow table a Packet has no reach into.
  if (typeof composePath !== "string" || composePath === "") {
    throw new Error("composeBrief: a Brief cannot be composed without the Persona's path recorded at `compose_path` (kogaki#1262) — the mint's caller resolves it from src/brief-workflow.json's `compose_path` state and passes it here.");
  }
  // THE DEFINED TERMS, WRITTEN HERE AND NEVER AGAIN (kogaki#1331, owner
  // decision 2026-10-10). The classification is the judge's, asked by the
  // `mint` state before this runs; what is checked here is the entries' shape
  // and that each term occurs in the Thesis or in one of the Strand claims it
  // was read from. A caller with no list composes a Brief that defines nothing.
  const termsErr = definedTermsRefusal(definedTerms, { thesis, claims });
  if (termsErr) throw new Error(`composeBrief: ${termsErr}`);
  const record = {
    slug,
    compose_path: composePath,
    strands: strands.map((s) => {
      const e = { id: s.display_id, slug: s.slug, cite: s.cite ?? "none recorded" };
      // THE TWO JOURNEY STATES ARE RECORDED DIFFERENTLY, AND THAT IS THE POINT
      // (kogaki#507). A Journey with a served cite and a Journey with none are
      // different facts: the first is composable material and is cited at its
      // pin; the second is a fault to clear, DISCLOSED rather than dropped —
      // terrain tallies it as an abnormality, so a composition sitting is owed
      // the fact that a Journey exists whose cite the served record does not
      // carry. Only the first makes the Strand Journey-bearing.
      if (s.journey) {
        if (s.journey.cite) e.journey_cite = s.journey.cite;
        else {
          e.journey_uncited = "This Strand has a Journey the served record carries no cite for, so it cannot be "
            + "cited at the pin and is not material to compose from. It is a fault to clear rather than material.";
        }
      }
      return e;
    }),
    thesis,
    defined_terms: definedTerms.map((e) => ({ term: e.term.trim(), class: e.class })),
  };
  for (const key of briefSlotKeys()) record[key] = null;
  // THE TRIPWIRE, OVER THIS COMPOSER'S OWN TEXT (kogaki#526, kogaki#537). The
  // owner reads the file directly, so the captions and the header — the text
  // this composer authors — carry no internal key and no pointer into a spec
  // they do not hold. It THROWS rather than returning a refusal because a
  // caller cannot usefully proceed with a half-composed Brief. The adopted
  // Thesis and the Strand material are NOT checked: they are the owner's words
  // and the substrate's, and a rule is enforced at the layer where it can be
  // broken. The record's KEYS are machine-facing names and are not captions.
  const decl = briefRecordDeclaration();
  for (const line of [decl.header, ...Object.values(decl.keys).map((d) => d.caption).filter(Boolean),
    ...record.strands.map((e) => e.journey_uncited).filter(Boolean)]) {
    const leak = findInternalVocabulary(line);
    if (leak) {
      throw new Error(
        `the minted Brief leaks spec-internal vocabulary: ${leak.kind} `
        + `${JSON.stringify(leak.token)} in composer-authored text — `
        + `${JSON.stringify(line.trim().slice(0, 80))}. theses/<slug>/brief.yaml is a tracked `
        + `document the owner reads directly, so an internal key or a pointer into a spec they `
        + `do not hold has no rendering path here (kogaki#526). This REFUSES rather than `
        + `rewrites, as the gate's own tripwire does.`);
    }
  }
  return briefRecordText(record);
}

// THE SURVEY-RECORD RESOLVER IS DELETED, NOT KEPT AS A FALLBACK (kogaki#1116).
// It resolved `L<n>` display ids against a Terrain survey record, which is the
// one reading of a Terrain artifact this lane had. The addresses a run is
// started with are resolved by `resolveStrandAddresses` against the served
// enumeration instead, and the human-facing tokens this function refused by
// name — G, and now L and D — are refused there, by the same discipline, at the
// one place a set now enters. Keeping this beside it would be a second answer
// to what a Strand is, reachable whenever the first refused.

// Compose 2–3 Thesis candidates FROM THE SETTLED STRAND SET ONLY (the
// read-not-invented rule, story 1.72 AC2), from the set's served gloss
// renderings rather than its slugs (kogaki#519/#528). Never widened and never
// fetched here: Terrain resolves the renderings (the served-renderings input
// rule and the rendering rule), and an absent rendering is disclosed as
// Terrain's NO_HEADLINE marker, never substituted. The candidates differ in
// which member LEADS, each carrying its round-trip concession. Plain register
// is defined in src/packet-template.md, not here (kogaki#749).

// PROSE AT THE SURFACE, SCHEMA IN THE RECORD (the prose-at-the-surface rule
// v20, kogaki#566): the owner reads prose with no field label. `claim` is what
// the owner adopts; `thesis` is `claim` plus gate scaffolding the mint drops.
// Each candidate also carries the slug its own Thesis derives (v11,
// kogaki#518), so the gate's every option is a (Thesis, slug) pair.

// ONE TERMINAL PERIOD, AND NEVER TWO (the prose-at-the-surface rule,
// kogaki#566): trim the served sentence's own ending and add one period back.
function sentence(text) {
  const t = String(text).trim().replace(/[.\s]+$/, "");
  if (t === "") return "";
  // A question mark or an exclamation is ALREADY terminal, so it keeps its own
  // punctuation rather than collecting a period behind it. The trim above takes
  // periods and whitespace only, which is why this second test is needed and is
  // not the same test twice: served prose is prose, and nothing guarantees it
  // ends the way the common case does.
  return /[?!]$/.test(t) ? t : `${t}.`;
}

// THE CLAIM IS A PREFIX OF WHAT THE GATE RENDERS (the prose-at-the-surface
// rule; kogaki#572): the mint records `claim` and the gate shows `thesis`, so
// both are built from ONE claim and the Brief holds less than the owner read,
// never something else. The name derives from the served sentence alone
// (`nameFrom`), never the composer's own words.
function buildCandidate({ id, claim, extra, concession, nameFrom }) {
  const c = sentence(claim);
  return { id, claim: c, thesis: extra ? `${c} ${extra}` : c, concession,
           name_source: sentence(nameFrom || String(c).split(/(?<=[.?!])\s+/)[0] || c) };
}

export function composeThesisCandidates(strands, headlines = new Map(), resolved = {}) {
  const phrase = (s) => {
    const e = headlines.get(s.slug);
    // READ `found`, NEVER TRUTHINESS OF THE ENTRY (kogaki#1106). `resolveHeadlines`
    // stamps a MARKER into `headline` on a miss, so `e.headline` was truthy for
    // every member of a fully-missing set and this returned the bare marker —
    // the same string for all of them. That is what made three Thesis
    // candidates byte-identical on 2026-09-11 and left the determination gate
    // with nothing to choose between: the member-naming branch below, added for
    // exactly this case at PR #534 round 1, was unreachable from this caller.
    // The `found` flag PR #693 round 2 added for this defect class is what
    // separates the two, and this lane was not reading it.
    if (e && e.found) return e.headline;
    // WHICH MARKER, DECIDED BY TERRAIN RATHER THAN HERE. `glossFor` holds the
    // six-state vocabulary and the order the states resolve in; a second
    // reading of the same question, sited in the consumer, is how this lane
    // came to render a marker terrain had already ruled out.
    // NO `|| NO_RENDERING` DISJUNCT (PR #1107 round 1, nit). `glossFor` returns
    // one of six non-empty string constants on every path, so the right-hand
    // side could only ever be unreachable — the identical residue PR #694
    // round 2 removed one seam over, where the comment it left reads: in a
    // function whose whole point is that each marker states exactly one fact, a
    // branch that cannot fire states a second one. Here it would state that
    // `glossFor` might decline to answer, which it may not.
    const marker = glossFor(s, e, resolved.seam, resolved.namespaces,
      resolved.unaddressable);
    // THE MARKER CARRIES ITS MEMBER. An unresolved rendering is the same text
    // for every member, so a bare marker made all 2-3 candidates byte-identical
    // — one option presented three times, at the moment the owner most needed
    // to see that something was wrong (PR #534 round 1). The display_id is the
    // token the display-ID rule already renders on owner surfaces, so naming it here keeps
    // the options distinguishable AND says which member is missing material.
    return `${s.display_id} ${marker}`;
    // KNOWN AND BOUNDED, stated rather than left: on a FULLY degraded set the
    // derived slugs still collide, because `deriveSlugCandidate` drops tokens of
    // two characters or fewer and every display_id is one. Three abnormally
    // marked options sharing a name is a wart on a state the owner must clear,
    // not the defect that mattered — which was three options that were
    // indistinguishable as PROSE. Left alone deliberately: widening the
    // derivation to keep short tokens would change every slug on the healthy
    // path to fix a cosmetic on the broken one.
  };
  const candidates = [];
  if (strands.length === 1) {
    const p = sentence(phrase(strands[0]));
    // THE TWO OPTIONS MUST ADOPT DIFFERENTLY, NOT ONLY READ DIFFERENTLY (PR
    // #571 round 1): with one member there is no lead to vary, so the second
    // option's claim carries its own commitment about what the article does
    // with THIS claim. The owner reads every word of it (kogaki#572): `thesis`
    // extends `claim` and never rewords it, a property `buildCandidate` holds.
    const one = (id, claim, extra, concession) => buildCandidate({ id, claim, extra, concession });
    candidates.push(one("thesis-1", p,
      `The article states that claim, shows where it came from, and defends it.`,
      `Argued on its own, it has no second member to test it against.`));
    candidates.push(one("thesis-2",
      `${p} The article reaches that claim by retracing how it was arrived at, rather than stating it and defending it.`,
      `The reader follows the route before being asked to accept the destination.`,
      `The flat statement of the claim arrives late, so a reader who wants the rule first waits for the story to finish.`));
  } else {
    const leads = strands.slice(0, 3);
    const supporting = strands.length - 1;
    const others = supporting === 1 ? "the other settled member shows" : `the other ${supporting} settled members each show`;
    const become = supporting === 1 ? "the other member reads" : "the other members read";
    for (let i = 0; i < leads.length; i++) {
      const lead = sentence(phrase(leads[i]));
      // BY INDEX, NEVER BY VALUE. Filtering `names` for inequality against the
      // lead's TEXT collapses whenever two members share a phrase — and they all
      // do on the degraded path, where every phrase is NO_RENDERING. `rest` then
      // emptied for every lead, so all 2-3 candidates rendered byte-identical
      // with an empty member list and the same derived slug: the gate offered
      // three options that were one option, exactly when the owner most needed
      // to see that something was wrong (PR #534 round 1).
      candidates.push(buildCandidate({
        id: `thesis-${i + 1}`,
        claim: lead,
        extra: `That is what the article argues, and ${others} one place where it holds.`,
        concession: `Adopting it means ${become} as support rather than as claims of equal weight.`,
      }));
    }
  }
  // NO FALLBACK TO THE WHOLE CLAIM (PR #579 round 1). `buildCandidate` sets
  // `name_source` on every branch, so a `|| c.claim` disjunct could never fire —
  // and what it would do if it did is derive the name from the whole claim, the
  // precise behaviour kogaki#572 exists to remove, silently and reporting
  // nothing. That is the reading `cmdAdopt` already refuses by name thirty lines
  // down: two adjacent readings of one question, and this was the rejected one.
  for (const c of candidates) c.slug = deriveSlugCandidate(c.name_source);
  return candidates;
}

// Derive ONE slug from a Thesis (story 1.72 AC4; paired into the gate at
// v11, kogaki#518): the slug is thesis-derived and owner-decided, never
// machine identity — location and naming's no-machine-identity repair kept by this route
// exactly as v9 kept it by its own. THIS IS THE ONE DERIVATION: the paired
// candidate slugs and a free-form Thesis's slug both come from here.
// Exported for the check's thesis-derived-slug case.
export function deriveSlugCandidate(thesis) {
  const words = thesis.toLowerCase().replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  let slug = "";
  for (const w of words) {
    const next = slug ? `${slug}-${w}` : w;
    if (next.length > 40) break;
    slug = next;
    if (slug.split("-").length >= 5) break;
  }
  return slug || "brief";
}
const STOP = new Set(["the", "article", "articles", "makes", "one", "claim",
  "this", "that", "every", "each", "and", "with", "spine", "other", "its",
  "own", "show", "shows", "where", "story", "behind", "reader", "follows",
  "how", "was", "reached", "before", "being", "asked", "accept", "exists",
  "state", "came", "from", "defend", "section", "settled", "members",
  "place", "does", "work", "tells"]);

// The slug grammar, in ONE place: the owner's override at the gate and the
// paired derivation are the same class of value and are refused the same way
// (the slug names a directory the owner enumerates).
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

// ---- enter: resolve the set, compose candidates, write run state. ----
// WRITES NOTHING under theses/ or any tracked path (story 1.72 AC1) — the
// run state is machine-local by default and the command has no theses-dir
// concept at all.
export function cmdEnter(args) {
  // THE SET IS THE ARGUMENT LIST (kogaki#1116). `--addresses` is the executor's
  // own hand-off from `entryInputs`; the string form is the standalone and
  // fixture path, and both land in the same resolver, so there is no second
  // reading of what an address is.
  const entered = Array.isArray(args.addresses)
    ? args.addresses
    : String(args.addresses === true ? "" : (args.addresses ?? ""))
      .split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
  if (!entered.length) {
    fail("enter needs the settled Strand set as served Lesson addresses — "
      + "`enter coding::lesson/<local-name> ...` or `--addresses <a> <b>`. A Brief needs at least "
      + "one settled Strand, and it never composes a set of its own.");
  }

  const r = resolveStrandAddresses(entered);
  if (r.error) fail(r.error);

  // Terrain resolves the settled members' served renderings, bounded by their
  // own tags (kogaki#528), in the `lessons` namespace alone (kogaki#689). The
  // seam state is consumed, never dropped (kogaki#1106): each marker
  // `resolveHeadlines` distinguishes reaches the gate as itself.
  const { headlines, seam, namespaces, unaddressable } = resolveHeadlines(r.strands);
  const candidates = composeThesisCandidates(r.strands, headlines,
    { seam, namespaces, unaddressable });
  const runPath = typeof args["run-state"] === "string" && args["run-state"] !== ""
    ? args["run-state"] : defaultRunState();
  mkdirSync(dirname(runPath), { recursive: true });

  // The thesis-determination gate's declaration, carried WITH the ask (story
  // 1.72 AC3): the record-shape fields of specs/spec-proposal-contract/SPEC.md,
  // the premise's negation as a first-class option routing back through
  // Terrain, and the registered gate id `brief-thesis-adoption`. This is the
  // only owner question before the mint (v11, kogaki#518): each option carries
  // its Thesis and the bare name that Thesis derives.
  const gate = {
    gate_id: "brief-thesis-adoption",
    // THE PROVENANCE BLOCK (kogaki#1116, acceptance item 4). What the owner is
    // shown here is the SERVED ADDRESSES THE RUN WAS STARTED WITH, marked as
    // supplied on the command line and paired with the within-document id each
    // one took. That pairing is the catch point for a Model mis-resolution: the
    // owner reads the addresses before answering, and nothing under `theses/`
    // exists until they do.
    //
    // NO PIN (the commit pin is deprecated, hub decision staged 2026-09-14). The
    // set is identified by address, and each member's cite carries its own
    // content hash on the Brief's Strands section — a single response-wide
    // commit said less than the per-member hashes already say.
    where: "the settled Strand set, supplied on the command line and resolved against the "
      + `served enumeration: ${r.strands.map((s) => `${s.display_id} = ${s.address}`).join(", ")}`,
    why: "the machine's premise, rendered: this settled set supports a Thesis — the candidates below are composed from the set's own members and from nothing else (the read-not-invented rule), and each carries the name it would give the Brief",
    label: "Adopting a Thesis starts the Brief: the mint runs next and the Brief's durable home is created under the adopted name, carrying the adopted Thesis",
    options: [
      // THE NAME RIDES THE LABEL (kogaki#567): the body placement the durable
      // home and the entry point v11 tried first read badly at the 2026-08-20
      // dogfood, and this is the move it pre-authorized. The name is still
      // separately rendered (its own dash-set element, the bare name) and
      // separately declinable.
      ...candidates.map((c) => ({
        id: c.id,
        label: `${c.thesis} ${c.concession} — Brief: ${c.slug}`,
      })),
      {
        id: "back-to-terrain",
        label: "The settled set is what should change — go back through Terrain and re-settle; no Brief is started and nothing is written (a Brief never fetches)",
        negates_premise: true,
      },
    ],
    free_text: { accepted: true, prompt: "Or state your own Thesis in your own words — it becomes the adopted Thesis verbatim, and its name is derived from it. Keeping an option's Thesis but naming the Brief differently is the same one answer: say which option, and say the name you want." },
  };

  const state = {
    stage: "entered",
    entered_addresses: entered,
    settled_set_via: "supplied on the command line",
    strands: r.strands,
    // WHAT WAS RESOLVED, AND FROM WHERE (kogaki#528). Recorded because the
    // candidates are composed FROM this and a later reader cannot otherwise
    // tell served prose from an abnormal marker, nor which pin the prose came
    // from. It also makes the dual-producer guard deterministic: the check
    // feeds the exported composer exactly what the command used, instead of
    // guessing and comparing two different inputs.
    strand_renderings: Object.fromEntries(
      [...headlines].map(([slug, e]) => [slug, { headline: e.headline, cite: e.cite }])),
    thesis_candidates: candidates,
    gate,
  };
  writeFileSync(runPath, JSON.stringify(state, null, 2) + "\n");
  console.log(JSON.stringify({ run_state: runPath, gate }, null, 2));
  console.log(`# entry resolved ${r.strands.length} member(s); nothing written under theses/ — pre-Thesis state is machine-local (the durable home and the entry point v9).`);
}

// ---------------------------------------------------------------------------
// `gate-thesis` IS DELETED, AND IT LEAVES NO STUB (kogaki#1108): under
// `src/brief-workflow.json` the executor composes the declaration at the
// `THESIS_ADOPTION` wait, `.claude/hooks/write-gate-capture.py` records the
// click and `.claude/hooks/advance-brief.py` re-enters the executor. The
// option set survives where it always was: `enter` writes `state.gate`, the
// GATE_WORK composer reads it, and `adopt` digests over the same option ids.

// ---- adopt: CONSUME the owner's captured answer at THE ONE GATE. ----
//
// THE ANSWER IS READ, NEVER RECEIVED AS AN ARGUMENT (kogaki#891): it arrives
// as a `*.gate-capture.json` row carrying the AskUserQuestion `tool_use_id`,
// bound to the option set it was offered against, and `--thesis` is removed
// rather than deprecated. Its two halves, the adopted candidate (or the
// owner's own words) and the optional name override, ride that one row (the
// durable home and the entry point v11, kogaki#518). This command emits no ask.
export function cmdAdopt(args) {
  const { path: runPath, state } = readRunState(args);
  // ACCEPTANCE ITEM 2 (kogaki#891): no declaration for this run state, no
  // adoption. A run state carrying no gate was never rendered to an owner.
  if (!state.gate || !Array.isArray(state.gate.options) || state.gate.options.length === 0) {
    fail("this run state carries no thesis-determination gate declaration — nothing was ever rendered to the owner, "
      + "so there is no answer to adopt (the durable home and the entry point; kogaki#891). Re-run `enter`. Nothing was written.");
  }
  if (typeof args.thesis === "string" || typeof args.slug === "string") {
    // THE REMOVED CHANNEL REFUSES LOUDLY rather than being ignored. A silently
    // dropped `--thesis` would adopt whatever the capture said while the
    // caller believed it had passed the answer, which is the same class of
    // failure one layer along.
    fail("`--thesis` and `--slug` are gone (kogaki#891). The owner's answer at the thesis-determination gate "
      + "is READ from the captured question-UI answer, never passed as an argument. Under the Brief workflow "
      + "table the executor composes the declaration at its `THESIS_ADOPTION` wait and stops, the harness "
      + "renders the question, `.claude/hooks/write-gate-capture.py` records the click, and this act reads "
      + "the row (kogaki#1108). A free-form Thesis is the owner's own words in that row, verbatim.");
  }
  const capPath = argString(args, "capture",
    "adopt needs --capture <path to the gate capture> — the owner's recorded answer at the thesis-determination gate, "
    + "written by `.claude/hooks/write-gate-capture.py` at the moment of the click and named for this run's "
    + "workspace by the executor (kogaki#1108). With no owner answer the gate blocks and nothing is written "
    + "(story 1.72 AC6; kogaki#891).");
  let capture;
  try { capture = JSON.parse(readFileSync(capPath, "utf8")); }
  catch (e) { fail(`the gate capture at ${capPath} cannot be read (${e.message}) — the owner's answer is an input to adoption, so an unreadable one is not an absent one and is not treated as one`); }
  const gateId = state.gate.gate_id;
  const digest = ownerGateDigest(gateId, state.gate.options.map((o) => o.id));
  const verdict = validateOwnerAnswer(capture, gateId, digest);
  if (verdict.error) fail(verdict.error);

  if (verdict.option === "back-to-terrain") {
    fail("the owner ruled the settled set is what should change — route back "
      + "through Terrain. No Brief is started (the durable home and the entry point: never a Brief fetch).");
  }
  const hit = (state.thesis_candidates || []).find((c) => c.id === verdict.option);
  if (verdict.option !== undefined && !hit) {
    fail(`the captured answer names option ${JSON.stringify(verdict.option)}, which is offered by the gate but is not a Thesis candidate — `
      + "an option routed nowhere is not adopted (the durable home and the entry point). Nothing was written.");
  }
  // THE MINT RECORDS THE CLAIM, NEVER THE FRAME (the prose-at-the-surface rule
  // v20, kogaki#566). A free-form answer is the owner's own words and is taken
  // verbatim. No fallback to `thesis`: every candidate carries a `claim` by
  // construction, so an absent claim refuses (PR #571 round 1) rather than
  // silently recording the framed sentence.
  if (hit && (typeof hit.claim !== "string" || hit.claim === "")) {
    fail(`candidate ${hit.id} carries no claim — the mint records the adopted claim `
      + "(the prose-at-the-surface rule), and a run state whose candidates predate that field cannot be "
      + "adopted from. Re-run `enter` to recompose the gate.");
  }
  const thesis = hit ? hit.claim : verdict.free_text;
  if (typeof thesis !== "string" || thesis.trim() === "") {
    fail("the captured answer carries neither an adopted candidate nor free-form Thesis text — nothing was written.");
  }
  // The slug half. An override is the owner's, taken as given AT THE GATE;
  // with none, the adopted candidate's OWN paired slug stands — the one the
  // owner read on the option they chose. A free-form Thesis has no paired slug
  // to stand, so its slug derives from the owner's own words (v9 behaviour,
  // unchanged).
  let slug, via;
  if (verdict.slug !== undefined) {
    slug = verdict.slug;
    via = "owner-override";
  } else if (hit && typeof hit.slug === "string" && hit.slug) {
    slug = hit.slug;
    via = "paired-with-adopted-candidate";
  } else {
    slug = deriveSlugCandidate(thesis);
    via = "derived-from-free-form-thesis";
  }
  if (!SLUG_RE.test(slug)) {
    fail(`slug ${JSON.stringify(slug)} — use lowercase words joined by hyphens; `
      + "the slug names a directory the owner enumerates.");
  }
  state.stage = "adopted";
  state.adopted_thesis = thesis;
  state.adopted_via = hit ? hit.id : "free-form";
  // The adopted PAIR — what the mint consumes. There is no slug_candidate
  // awaiting approval and no slug_gate, because there is no second ask.
  state.adopted_slug = slug;
  state.adopted_slug_via = via;
  // THE EVIDENCE, carried onto the run state so the mint's own record names
  // the question the harness asked rather than only the value it produced.
  state.adopted_by = { gate_id: gateId, tool_use_id: verdict.tool_use_id, capture: resolve(capPath) };
  writeFileSync(runPath, JSON.stringify(state, null, 2) + "\n");
  console.log(`thesis-determination answer (the durable home and the entry point): read from ${capPath} — the owner answered at the ${gateId} gate (AskUserQuestion ${verdict.tool_use_id}); no argument carried it`);
  console.log(JSON.stringify({
    run_state: runPath,
    adopted_thesis: thesis,
    adopted_via: state.adopted_via,
    adopted_slug: slug,
    adopted_slug_via: via,
    adopted_by: state.adopted_by,
  }, null, 2));
  console.log("# the pair is settled; `mint` consumes it and creates the Brief's durable home (the durable home and the entry point v11).");
}

export function cmdMint(args) {
  const { state } = readRunState(args);
  if (state.stage !== "adopted" || typeof state.adopted_thesis !== "string" || state.adopted_thesis === "") {
    // THE GATE BLOCKS (story 1.72 AC6): no adopted Thesis, no writes — a
    // pre-Thesis Brief is unproducible, not prohibited (kogaki#494 remedy).
    fail("no Thesis has been adopted in this run — the thesis-determination "
      + "gate blocks and nothing is written under theses/ (the durable home and the entry point v9; "
      + "kogaki#494: a pre-Thesis Brief is unproducible).");
  }
  // THE MINT CONSUMES THE ADOPTED PAIR (the durable home and the entry point v11, kogaki#518). The owner's
  // name reaches here one way only — through `adopt`, as the half of the one
  // gate's answer they settled — and the mint DERIVES NOTHING of its own: a
  // run whose pair carries no name refuses rather than inventing one, which
  // is what keeps the name an answered half rather than a machine identity.
  // `--slug` survives as a caller-supplied name for programmatic drivers
  // (a harness minting a fixture Brief under a fixed home); it is not a
  // question, is never passed by the skill, and the retired second ASK is
  // gone from this file entirely.
  const slug = typeof args.slug === "string" && args.slug !== ""
    ? args.slug : state.adopted_slug;
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) {
    fail("the run state carries no adopted name — re-run `adopt` with the "
      + "owner's answer at the thesis-determination gate (the durable home and the entry point v11: the one "
      + "gate carries the Thesis and its name together; there is no separate "
      + "slug ask to answer).");
  }

  const thesesDir = resolve(typeof args["theses-dir"] === "string" && args["theses-dir"] !== "" ? args["theses-dir"] : "theses");
  const home = join(thesesDir, slug);
  // IDEMPOTENCE IS BY SLUG, AND A COLLISION REFUSES (the durable home and the entry point): a Brief is owner
  // state from the moment it exists, and this runtime is a creator, never an
  // editor.
  if (existsSync(home)) {
    // THE REFUSAL NAMES THE PATH THAT ACTUALLY COLLIDED, not the default root
    // (PR #771 round 1). `home` honours `--theses-dir`, so under a check that
    // points the mint at a tmpdir the old message named a path that did not
    // collide — a refusal whose text is about a different file than the one it
    // refused over. Pre-existing shape, carried in at the rename and repaired
    // here rather than renamed forward.
    fail(`${home}/ already exists. The entry point creates and never `
      + "overwrites — resume that Brief by opening its document, or re-answer "
      + "the thesis-determination gate naming a different name (`adopt "
      + "--thesis <id|text> --slug <name>`).");
  }
  // THE PERSONA'S PATH (kogaki#1262). `--reader-file` survives as the same
  // class of caller override `--slug` already is: a harness minting a fixture
  // Brief under a fixed home, never an owner question. Without it, the
  // Persona's path is the one `src/brief-workflow.json`'s `compose_path` state
  // names — "no per-article selection" (kogaki#1216) means there is exactly
  // one to read. `--external-authority` is retired (kogaki#1571).
  if (args["external-authority"] !== undefined) {
    fail("`--external-authority` is retired (kogaki#1571, owner decision 2026-10-24) — an introduced term crosses as `- <term> — <meaning>`, so the Brief has no external-authority switch to set. Nothing was written.");
  }
  const readerFile = typeof args["reader-file"] === "string" && args["reader-file"] !== ""
    ? args["reader-file"] : briefComposePathDefault();
  // THE DEFINED TERMS ARE THE `defined_terms_unit` JUDGMENT'S (kogaki#1331):
  // handed over by the `mint` state as `definedTerms`, or read from the
  // record a caller names with `--defined-terms <file>`. A mint with neither
  // refuses — the list is written once, here, so a Brief minted without it
  // could never carry it.
  let definedTerms = Array.isArray(args.definedTerms) ? args.definedTerms : null;
  if (!definedTerms && typeof args["defined-terms"] === "string" && args["defined-terms"] !== "") {
    let r;
    try { r = JSON.parse(readFileSync(args["defined-terms"], "utf8")); }
    catch (e) { fail(`--defined-terms ${args["defined-terms"]} is not a readable JSON record (${e.message})`); }
    definedTerms = r && r.defined_terms;
  }
  if (!Array.isArray(definedTerms)) {
    fail("the mint writes the Brief's Defined Terms once and never again (kogaki#1331), and none were handed to it — "
      + "the `mint` state asks the `defined_terms_unit` judgment for them; a standalone mint names the record with "
      + "`--defined-terms <file>`. Nothing was written.");
  }
  mkdirSync(home, { recursive: true });
  const out = join(home, BRIEF_RECORD_FILE);
  const doc = composeBrief({
    slug, strands: state.strands, thesis: state.adopted_thesis,
    composePath: readerFile,
    definedTerms, claims: strandClaims(state).map((c) => c.claim),
  });
  writeFileSync(out, doc);
  // Per-block snapshot (kogaki#523): the mint's before-state is NO FILE —
  // the collision refusal above guarantees it — so the mint writes only its
  // `after` snapshot. Machine-local trace; a failure warns and never blocks.
  snapshotBrief(out, "mint", "after", doc);
  console.log(`Brief minted — READ THIS ONE (owner document): ${out}`);
  console.log(`Strands: ${state.strands.map((s) => s.display_id).join(", ")} `
    + `(${state.strands.length} member(s), set closed at mint)`);
  console.log("The thesis field is FILLED at mint by construction (the durable home and the entry point v9); every downstream composition field is a typed unfilled slot — the next sitting resumes from the document.");
  // THE PATH IS RETURNED, NOT ASSERTED BY THE CALLER (kogaki#1108). The `mint`
  // state is kind `write`, and the executor's write guard reads the artifact the
  // renderer NAMES — a state that wrote and did not say where is the one case
  // that guard exists for. Every sibling renderer in `src/terrain.mjs` returns
  // its path for the same reason.
  return out;
}
