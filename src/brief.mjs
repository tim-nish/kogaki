#!/usr/bin/env node
// brief — the Brief entry point (SPEC-draft-pipeline, the durable home and the entry point, v9 re-sequencing,
// kogaki#494; slug PAIRED INTO THE ONE GATE at v11, kogaki#518; entry point
// v7, kogaki#482; stories 1.71, 1.72 and 1.76).
//
// THE ORDER IS THE CONTRACT (v9, owner ruling 2026-08-17): entry resolves
// the settled Strand set → the thesis-determination gate → the mint. Nothing
// lands under theses/ before a Thesis is adopted — pre-Thesis state is a
// MACHINE-LOCAL RUN RECORD, legitimately machine-local per the served
// artifacts-live-where-human-works split (topics/knowledge-architecture.md:28
// at pin 8906f207). The owner artifact begins exactly when the first piece of
// substantive owner judgment — the Thesis — exists. A pre-Thesis Brief file
// is UNPRODUCIBLE here, not prohibited: no code path below writes into
// theses/ except `mint`, and `mint` refuses without an adopted Thesis.
//
// Three commands, one per block of the re-sequenced flow:
//   enter  — resolves LessonDisplayIDs against the survey record (refusals
//            unchanged from the durable home and the entry point: unknown id names both sides; G-ids refused
//            by name), composes 2–3 Thesis candidates FROM THE SETTLED SET
//            ONLY (the read-not-invented rule), DERIVES ONE SLUG PER
//            CANDIDATE from that candidate's own Thesis, and writes the
//            machine-local run state. Emits the thesis-determination gate's
//            declaration, whose every option is a (Thesis, slug) PAIR.
//   adopt  — records the owner's answer at THE ONE GATE: the adopted Thesis
//            and the slug it is paired with, or an override slug the owner
//            named in the same answer. Emits no ask of its own.
//   mint   — consumes the adopted (Thesis, slug) PAIR from the run state and
//            creates theses/<slug>/brief.md with `thesis` FILLED AT MINT BY
//            CONSTRUCTION and every downstream the settled structure section field a typed unfilled
//            slot. Idempotence by slug; a collision refuses (creator, never
//            an editor).
//
// THERE IS NO SECOND ASK (v11, kogaki#518, owner ruling 2026-08-17 recorded
// in kogaki#494's thread). The slug question does not exist as a code path:
// nothing below emits a `slug_gate` and no command carries a
// brief-slug-approval declaration, so a second slug ask is UNPRODUCIBLE
// rather than prohibited. The merge is admissible only under the served
// constraint the durable home and the entry point v11 binds it by — a gate may carry a second decision class
// only if that class is SEPARATELY RENDERED and SEPARATELY DECLINABLE — so
// each option renders its slug as its own element of the option body (the
// bare slug, never a `theses/` path), and `adopt --slug` declines that half
// without restating the Thesis or abandoning the option.
//
// OUTSIDE TERRAIN, by the 2026-08-09 boundary correction: this runtime never
// surveys, widens, or fetches a set — it receives one the owner settled. The
// closed-set invariant binds from the mint: growing the set is an owner act
// routing back through Terrain, never a Brief fetch (topics/articles.md:13
// at the same pin) — which is why the thesis gate's premise-negation option
// routes BACK THROUGH TERRAIN and never re-opens the set here.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
// already drifted into eight variants, which is what kogaki#982 collapsed.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   the read-not-invented rule
//       SPEC-draft-pipeline
//   the settled structure section
//       SPEC-draft-pipeline
//   the prose-at-the-surface rule
//       SPEC-draft-pipeline
//   the durable home and the entry point
//       SPEC-draft-pipeline
//   the Full Report
//       SPEC-terrain
//   location and naming
//       SPEC-terrain
//   the display-ID rule
//       SPEC-terrain
//   the served-renderings input rule
//       SPEC-terrain
//   the rendering rule
//       SPEC-terrain
//
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
// `NO_HEADLINE` IS NO LONGER IMPORTED AS A VALUE (PR #1107 round 1, nit). With
// the dead `|| NO_RENDERING` disjunct removed, `glossFor` is the only thing
// that names a marker here — which is the point of delegating the choice to it.
// The name survives in the comments below as the marker they discuss.
import { resolveHeadlines, glossFor } from "./terrain.mjs";
// ---- THE EXECUTOR, IMPORTED RATHER THAN REIMPLEMENTED (kogaki#1108).
// `runWorkflow` is `src/terrain.mjs`'s own advance loop entered with a FLOW
// BINDING; `judgedRecordPath` is the one route a judgment record reaches a state
// by; `persistPendingRun` is what makes a refusal raised in a Brief state persist
// the transitions the act completed before it. None of the three is copied here.
import {
  runWorkflow, judgedRecordPath, persistPendingRun, SKILL_EXPANSION_EXECUTOR,
  readHookPayload, advancedByFromPayload, relFromRepo, JudgmentRefusal,
  terrainRunRecord, settledStrandHandoff,
} from "./terrain.mjs";
import {
  SLOT_CAPTIONS, findInternalVocabulary, selectionOptionIds, READER_FIELDS,
  cmdAssemble, cmdAdoptCandidate,
} from "./assemble.mjs";
import { cmdAttach, attachReview, REVIEW_AREAS } from "./review.mjs";
import {
  snapshotBrief, ownerGateDigest, validateOwnerAnswer, gateSchema, gateRegistry,
  validateSteps, validateSpecialization, selectedStrands,
} from "./compose.mjs";
import { enterSubRun, enterRun, BRIEF_ENTRIES } from "./runs.mjs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

function fail(msg) {
  // THE PENDING RUN RECORD IS PERSISTED FIRST (kogaki#1108, carrying kogaki#808).
  // Every state of the Brief table runs inside the shared executor, which arms a
  // pending record at the top of an act and releases it at the loop's own write.
  // A refusal raised in this file exits the process, so without this the
  // transitions that act had already completed would sit on disk unnamed by the
  // record — the exact loss #808 closed one runtime over. It is a no-op outside
  // an advance, which is every standalone invocation.
  persistPendingRun();
  process.stderr.write(`brief: ${msg}\n`);
  process.exit(1);
}

// A flag whose value was omitted parses as boolean true, and String(true)
// is "true" — a string that passes the slug grammar and reaches
// readFileSync as a filename (PR #484 round 1 finding 1). So every consumer
// reads through this guard: a non-string value is the omitted-value defect,
// refused with the runtime's own refusal shape rather than leaking an
// ENOENT stack the skill's relay contract does not cover.
function argString(args, key, usage) {
  const v = args[key];
  if (typeof v !== "string" || v === "") fail(usage);
  return v;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else { args[key] = next; i++; }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

// The settled-structure fields DOWNSTREAM OF THE THESIS, every one present as a TYPED
// UNFILLED SLOT — an absent field and a field awaiting composition are
// different silences, and only the second lets a later sitting resume
// (the durable home and the entry point). The `thesis` field is NOT in this list at v9: it is filled at
// mint by construction, because the mint runs at Thesis adoption.
const SLOT = "*(awaiting composition)*";
// THE CAPTIONS ARE READ FROM ONE TABLE, NOT WRITTEN HERE (kogaki#526). Every
// caption used to carry its own field key and, in three cases, a section
// reference — `thesis_closure — explanation and established_by_steps.`,
// `sequence — the ordered steps of \u00a74.1.` (the caption's own words, quoted
// as the SPECIMEN it is and escaped so the kogaki#902 sweep does not read it
// as a reference) — on a TRACKED document the owner
// reads directly. kogaki#520 removed that vocabulary from the gate payload and
// installed a tripwire there; the tripwire reads the payload and had no reach
// into the minted document, which is why this was a separate carrier.
const fields = () => [...SLOT_CAPTIONS.entries()];

// Exported and pure over its inputs, so the check exercises the composed
// document without a filesystem. `thesis` is required: at v9 no document
// exists without one.
export function composeBrief({ slug, pin, strands, thesis }) {
  if (typeof thesis !== "string" || thesis === "") {
    throw new Error("composeBrief: a Brief cannot be composed without an adopted thesis (the durable home and the entry point v9)");
  }
  const L = [];
  // TWO EMITTERS, and the split IS the tripwire's reach (the durable home and the entry point v15, kogaki#537).
  // `say` emits text THIS COMPOSER AUTHORS and is guarded; `material` emits text
  // that arrived from the owner or from the served substrate and is not.
  //
  // WHY THE SPLIT RATHER THAN ONE GUARD OVER EVERYTHING. The rule being enforced
  // is "this codebase's vocabulary does not reach the owner", and a rule is
  // enforced at the layer where it CAN BE BROKEN — the composer. An owner typing
  // their own Thesis is not this system leaking; neither is a served rendering
  // quoted at its pin. The predicate reads SHAPE and cannot tell provenance, so
  // provenance is carried here, by which emitter the line goes through.
  //
  //   "grep the known internal vocabulary AT THE BOUNDARY … that grep covers
  //    only the coined-identifier sub-class"
  //   consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 LESSONS.md:63
  //   "a rule is enforced only at the layer where it can be broken"
  //   consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 LESSONS.md:103
  //
  // THE COST, STATED RATHER THAN LEFT: a leak written INTO a material line is
  // unguarded, and the set of material lines is an enumeration that can go
  // stale. It is small, it is all in this function, and the durable home and the entry point v15 names it — a
  // future line carrying external content goes through `material` or the guard
  // silently widens to text this codebase did not write.
  const guarded = [];
  const say = (s = "") => { L.push(s); guarded.push(s); };
  const material = (s = "") => { L.push(s); };
  material(`# Brief — ${slug}`);
  say();
  // The reader-facing definition, in the act that uses the term (the durable home and the entry point).
  say("> A **brief** is the working plan for one article: the served");
  say("> material (Strands) the owner settled on, and the composition");
  // THE THIRD OWNER-FACING SURFACE (PR #581 round 1). This definition names the
  // composition fields to an owner, and it carried `sequence` — so after
  // kogaki#574 a reader met a field name in the document's own opening and then
  // found no section by that name below it. Neither the heading the issue names
  // nor the record field it protects: a third surface, and the one place the
  // retired token was actively misleading once its section moved.
  say("> fields — thesis, Reader Path, coverage, obligations — filled in as");
  say("> composition proceeds. It is the durable document a drafting");
  say("> sitting resumes from.");
  say();
  material(`*Survey pin:* \`${pin}\``);
  say("*Strand set: CLOSED at mint. Adding a Strand is your act, taken by going back through Terrain — a Brief never reaches for material on its own.*");
  say();
  say("## Strands");
  say();
  for (const s of strands) {
    material(`### ${s.display_id} — ${s.slug}`);
    say();
    material(`- cite: \`${s.cite ?? "none recorded"}\``);
    if (s.journey) {
      // The served Journey cite is part of "their pins and served cites"
      // (the durable home and the entry point) — a cite the record holds and the document drops sends the
      // composition sitting back to the run workspace, which is what a
      // durable Brief exists to avoid (PR #484 round 1 finding 5).
      //
      // THE TWO STATES RENDER DIFFERENTLY, AND THAT IS THE POINT (kogaki#507).
      // A Journey with a served cite and a Journey with none are different
      // facts, and rendering them on the same line with only the value
      // differing made an absence indistinguishable from a presence to every
      // reader of the marker. That is not a reader's bug to fix one at a
      // time: this line is the PROJECTION the readers share, so the
      // distinction belongs here.
      //
      //   "a carrier owes an enumerated READER set rather than only a write
      //    contract, and where the readers share a projection the obligation
      //    belongs in the projection, because a per-reader fix repairs one
      //    reader and leaves the count unchanged."
      //
      // consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 LESSONS.md:57
      //
      // The uncited state is DISCLOSED rather than dropped: terrain tallies it
      // as an abnormality (`terrain.mjs`: `c.journey && !jg`), so a
      // composition sitting is owed the fact that a Journey exists whose cite
      // the served record does not carry.
      if (s.journey.cite) {
        material(`- journey cite: \`${s.journey.cite}\``);
      } else {
        say("- journey: PRESENT WITH NO SERVED CITE — abnormal; this Strand's Journey");
        say("  material cannot be cited at the pin, so it is not composable material");
        say("  Stated here rather than dropped, because a Journey nothing can cite is");
        say("  a fault to clear rather than material to compose from.");
      }
    }
    say();
  }
  say("## Thesis");
  say();
  material(thesis);
  say();
  say("*The claim this article makes. You adopted it when the Brief was named; it is composed from the settled Strands and never invented.*");
  say();
  for (const [heading, meaning] of fields()) {
    say(`## ${heading}`);
    say();
    say(`${SLOT}`);
    say();
    say(`*${meaning}*`);
    say();
  }
  // THE TRIPWIRE, LAST — the same predicate the gate rendering uses, now with
  // reach into the minted document (kogaki#526). It THROWS rather than
  // returning a refusal because a caller cannot usefully proceed with a
  // half-composed Brief, and because this is the same deny-not-rewrite stance
  // kogaki#520 took at the gate: a rewrite layer would let the leak keep being
  // written and the next term of art would arrive unlabelled.
  //
  // WHAT IS CHECKED, and it is no longer every line (the durable home and the entry point v15, kogaki#537).
  // kogaki#526 checked all of them, which was right about the captions — three
  // lines outside them carried a section reference, and narrowing to captions
  // would have satisfied #526's sentence while leaving the document leaking.
  // But the full reach also read the ADOPTED THESIS and the STRAND MATERIAL,
  // and refused the owner's own verbatim words at mint. So the guard now binds
  // the `say` set — this composer's own text — and the `material` set is exempt.
  for (const line of guarded) {
    const leak = findInternalVocabulary(line);
    if (leak) {
      throw new Error(
        `the minted Brief leaks spec-internal vocabulary: ${leak.kind} `
        + `${JSON.stringify(leak.token)} in composer-authored text — `
        + `${JSON.stringify(line.trim().slice(0, 80))}. theses/<slug>/brief.md is a tracked `
        + `document the owner reads directly, so an internal key or a pointer into a spec they `
        + `do not hold has no rendering path here (kogaki#526). This REFUSES rather than `
        + `rewrites, as the gate's own tripwire does. The adopted Thesis and the Strand `
        + `material are NOT checked (kogaki#537): they are the owner's words and the `
        + `substrate's, and a rule is enforced at the layer where it can be broken.`);
    }
  }
  return L.join("\n") + "\n";
}

// Resolve the entered ids against the survey record. Refusals are the
// contract's own (the durable home and the entry point): an unknown id names BOTH sides, never a silent
// drop; a Group/SubGroup id is refused BY NAME as a per-report-identity
// token. Exported for the check's refusal cases. UNCHANGED at v9 — the
// re-sequencing moved the mint, not the entry refusals.
export function resolveStrandIds(record, entered) {
  const gids = entered.filter((x) => /^G[0-9]+(-[0-9]+)?$/.test(x));
  if (gids.length) {
    return { error:
      `${gids.join(", ")}: Group/SubGroup ids are per-REPORT-IDENTITY tokens `
      + "— they name a grouping, not the settled set, and "
      + "a pin advance renumbers them. Enter the LessonDisplayIDs (L<n>) that "
      + "stand in the report's member headings beside the grouping you "
      + "navigated by." };
  }
  const bad = entered.filter((x) => !/^L[0-9]+$/.test(x));
  if (bad.length) {
    return { error:
      `${bad.join(", ")}: not a LessonDisplayID. The input unit is L<n> and `
      + "nothing else." };
  }
  const byDid = new Map((record.candidates || [])
    .filter((c) => c.display_id).map((c) => [c.display_id, c]));
  const missing = entered.filter((x) => !byDid.has(x));
  if (missing.length) {
    const held = [...byDid.keys()].sort(
      (a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    return { error:
      `${missing.join(", ")}: the survey record carries no such display id. `
      + `Entered: ${entered.join(", ")}. The record holds: `
      + `${held.join(", ") || "no display ids (the record predates the display-ID rule)"}. `
      + "Nothing was dropped silently — every entered id is placed or named." };
  }
  // Dedup preserving the entered order — the set is the unit, and a repeat
  // is not an error the owner should be stopped for.
  const seen = new Set();
  const strands = [];
  for (const id of entered) {
    if (seen.has(id)) continue;
    seen.add(id);
    strands.push(byDid.get(id));
  }
  return { strands };
}

// Compose 2–3 Thesis candidates FROM THE SETTLED STRAND SET ONLY (the read-not-invented rule,
// story 1.72 AC2), and from that set's SERVED GLOSS RENDERINGS rather than
// from its slugs (kogaki#519/#528).
//
// WHAT CHANGED AND WHY THE OLD FORM WAS A DEFECT. Every content token used to
// be a slug with its hyphens replaced by spaces ("derived view dogfood needs
// its join key"). With four members the three options shared everything except
// which member led, so they read ~80% identical and in machine language. The
// cause was mechanical rather than model drift: a slug is an identifier, and no
// amount of care at the composing step turns an identifier into prose.
//
// NEVER WIDENED, AND STILL NEVER FETCHED BY THIS LANE. The set is closed at
// entry and this composes from its members and nothing else — the durable home and the entry point
// invariant is about GROWING the set, and resolving the material a settled
// member already names is not growth. The resolution itself is terrain's:
// `resolveHeadlines` is called there, bounded by the members' own tags, so the
// Brief lane gains no seam read of its own and terrain stays the one component
// that reads served renderings (SPEC-terrain, the served-renderings input rule
// and the rendering rule).
//
// AN ABSENT RENDERING IS DISCLOSED, NEVER SUBSTITUTED: the member's phrase
// becomes terrain's own NO_HEADLINE marker, which is loud at the gate and is
// the convention `cmdView` already follows. Composing around the gap would
// hide a fault the owner is the one who can clear. The candidates differ in which member LEADS, because that is a real
// composition fork the set itself carries; each is in plain register and
// carries its round-trip CONCESSION explicitly — a concession is part of the
// output, never a silent omission.
//
// PLAIN REGISTER'S DEFINITION IS NOT RESTATED HERE (kogaki#749, reg-0220).
// Its carrier is src/packet-template.md, which the model reads at generation,
// and its ground is specs/spec-brief-draft-design/DESIGN.md, "Plain register, and the round trip". This comment
// used to spell the definition out inline beside a citation to
// the deleted SPEC-style-contract's own plain-register clause — a second
// carrier for a rule with one, and the same shape the design record struck
// from its own plain-register section one PR earlier. The spec is
// deleted; the restatement went with it rather than being repointed.
//
// Exported for the check's compose-from-settled-set case.
//
// PROSE AT THE SURFACE, SCHEMA IN THE RECORD (the prose-at-the-surface rule v20, kogaki#566). What
// this function returns is a RECORD and keeps its fields; what the owner reads
// is prose composed from them, and it carries NO FIELD LABEL. The three frames
// that shipped before — "The article's spine is this claim:", "The article makes
// one claim:", "Concedes:" — handed the owner labelled fields at the one surface
// the design record's plain-register section promises plain register to, so they are gone rather
// than reworded: the colon-framed shape was the defect, not the words inside it.
//
// AND `claim` IS SEPARATE FROM `thesis`, WHICH IS THE HALF THE MINT NEEDS.
// `claim` is what the owner adopts; `thesis` is `claim` plus the sentence saying
// how the other settled members serve it, and that second half is GATE
// SCAFFOLDING. Keeping them apart here is what lets the mint record the claim
// and drop the frame (the prose-at-the-surface rule) without the mint re-parsing prose it did not
// compose. The supporting members are NOT restated inline: splicing served
// sentences together with "; " produced one unreadable sentence, and the members
// are readable on the Full Report the ids came from and in the Brief's own
// Strands section.
//
// PAIRED AT v11 (kogaki#518, story 1.76): each candidate also carries the
// slug its OWN Thesis derives — `deriveSlugCandidate` is the one derivation
// in this file, and it is applied here so the gate's every option is a
// (Thesis, slug) pair. Deriving it here rather than at adoption is what
// makes the second ask unproducible: the name is already on the table when
// the owner answers, so there is nothing left to ask afterwards.
// ONE TERMINAL PERIOD, AND NEVER TWO (the prose-at-the-surface rule, kogaki#566). A served headline is
// a sentence and already ends in a period; the old templates appended their own,
// so every option read `…you already keep..` at the gate. Trimming first and
// adding one back is what makes the composer's output independent of how the
// served text happens to end — a template that assumed the absence of a period
// would fail the same way on the day a rendering ends in a question mark.
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

// THE CLAIM IS A PREFIX OF WHAT THE GATE RENDERS (the prose-at-the-surface rule; kogaki#572). The mint
// records `claim` and the gate shows `thesis`, and the strip is only honest while
// the first is contained in the second — the Brief then holds LESS than the owner
// read, never something else. That held for free while every `thesis` was its
// claim plus a sentence, and stopped holding the moment one branch reworded the
// claim instead of extending it. Building both halves from ONE claim is what makes
// it a property of the composer rather than a rule each branch remembers.
//
// AND THE NAME DERIVES FROM THE SERVED SENTENCE, NOT THE WHOLE CLAIM. A claim may
// run to two sentences, and `deriveSlugCandidate` walks until five tokens or forty
// characters — so a short served headline let the derivation run on into the
// composer's own words and name the Brief's directory after them. `nameFrom` is the
// served half, which is the only text the owner recognises as theirs.
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
    // THE TWO OPTIONS MUST ADOPT DIFFERENTLY, NOT ONLY READ DIFFERENTLY (PR #571
    // round 1). With one member there is no lead to vary, so both options carry
    // the same proposition — and when the mint began recording the CLAIM rather
    // than the framed thesis, whichever option the owner chose produced a
    // byte-identical Brief, with the choice surviving only as `adopted_via`. A
    // gate whose arms record the same string is a gate offering one option
    // twice, which is the defect PR #534 round 1 found in another form.
    //
    // SO THE SECOND OPTION'S CLAIM CARRIES ITS OWN COMMITMENT. That sentence is
    // NOT the scaffolding the prose-at-the-surface rule strips: scaffolding says how the OTHER settled
    // members serve the claim, and there are no other members here. This says
    // what the article does with THIS claim, which is part of what the owner
    // adopts — the same reason a free-form Thesis is taken verbatim however it
    // is phrased.
    //
    // AND THE OWNER READS EVERY WORD OF IT (kogaki#572). The first cut gave
    // thesis-2 a claim the gate never showed: `claim` ended "…earns that claim
    // by retracing how it was reached" while its `thesis` read "…tells the story
    // of how that claim was reached", so the Brief recorded a commitment that
    // appeared on no surface the owner answered. THE CONTAINMENT IS THE POINT of
    // the strip: what is recorded is LESS than what was read, never other than
    // it. Both options are built claim-first now — `thesis` extends `claim` and
    // never rewords it — which is a property `buildCandidate` holds rather than
    // a convention each branch remembers.
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

// Pre-Thesis run state, in the Brief lane's own `entries/` directory
// (kogaki#750). There is no slug yet — the slug is what the
// thesis-determination gate decides — so the entry is timestamped, and one
// arrives per `enter`. `enterSubRun` prunes to keep-last-K before creating it,
// which is `enter`'s first act by construction: this is the first thing the
// command writes.
//
// A SUB-DIRECTORY RATHER THAN THE LANE ROOT (PR #783 round 1, finding 3): the
// lane's other entries are slug workspaces that live as long as their Brief is
// being worked, and these die when their run adopts or is abandoned. Sharing a
// budget, ten invocations of the front door — the cheapest command to re-run
// after an abandoned start — would delete every Brief's snapshot trace.
//
// `--run-state` is unchanged and does NOT prune. A caller naming a path holds
// it, and a lane that pruned around a directory somebody else chose would be
// deleting entries it does not own.
function defaultRunState() {
  const entry = `entry-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  return join(enterSubRun("brief", BRIEF_ENTRIES, entry), "run.json");
}

function readRunState(args) {
  const p = argString(args, "run-state",
    "this command needs --run-state <path> — the machine-local run record "
    + "`enter` wrote (pre-Thesis state is machine-local, the durable home and the entry point v9)");
  if (!existsSync(p)) {
    fail(`run state ${p} does not exist — run \`brief.mjs enter\` first `
      + "(entry → thesis-determination gate → mint, the durable home and the entry point v9).");
  }
  return { path: p, state: JSON.parse(readFileSync(p, "utf8")) };
}

// ---- enter: resolve the set, compose candidates, write run state. ----
// WRITES NOTHING under theses/ or any tracked path (story 1.72 AC1) — the
// run state is machine-local by default and the command has no theses-dir
// concept at all.
function cmdEnter(args) {
  const record = JSON.parse(readFileSync(
    argString(args, "survey", "enter needs --survey <survey record> — the machine-local run-workspace JSON the terrain survey wrote (a value is required; a bare --survey flag is the omitted-value defect)"), "utf8"));
  const entered = argString(args, "ids",
    "enter needs --ids <L1,L2,...> — the settled Strand set as "
    + "LessonDisplayIDs")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (!entered.length) fail("--ids was empty. A Brief needs at least one settled Strand.");

  const r = resolveStrandIds(record, entered);
  if (r.error) fail(r.error);

  // Terrain resolves the settled members' served renderings — bounded by
  // their own tags, never the corpus (kogaki#528). This lane performs no seam
  // read of its own; it hands over the set it has already closed.
  // ONE NAMESPACE HERE, DELIBERATELY (kogaki#689). This lane's members are
  // settled Lessons by construction, so the neighborhood's `journeys/` widening
  // buys nothing here and would spend a shard per tag; `resolveHeadlines`
  // defaults to `lessons` and this call takes the default.
  // THE SEAM STATE IS CONSUMED, NOT DROPPED (kogaki#1106). This destructured
  // `{ headlines }` alone, so every state `resolveHeadlines` distinguishes —
  // an unreachable seam, an empty corpus, an address the served enumeration
  // does not name — arrived here as the same read-and-empty marker, which is
  // the one thing each of those markers exists to stop being said. The four
  // (now six) markers were built one seam over and this lane read past them.
  const { headlines, seam, namespaces, unaddressable } = resolveHeadlines(r.strands);
  const candidates = composeThesisCandidates(r.strands, headlines,
    { seam, namespaces, unaddressable });
  const runPath = typeof args["run-state"] === "string" && args["run-state"] !== ""
    ? args["run-state"] : defaultRunState();
  mkdirSync(dirname(runPath), { recursive: true });

  // The thesis-determination gate's declaration, carried WITH the ask
  // (story 1.72 AC3): the record-shape fields of
  // specs/spec-proposal-contract/SPEC.md (where/why/label/options/
  // free_text), the premise's negation as a FIRST-CLASS option routing back
  // through Terrain, and the registered gate id (src/gate-registry.json:
  // brief-thesis-adoption). The free-text channel does not discharge the
  // negation and carries no condition.
  //
  // THIS IS THE ONLY OWNER QUESTION BEFORE THE MINT (v11, kogaki#518): each
  // option carries its Thesis AND the name that Thesis derives. The slug
  // rides the option's `rendering` — the same body surface the composition
  // gate uses (kogaki#520) — so it is SEPARATELY RENDERED rather than hidden
  // inside the Thesis text, and it shows the BARE slug, never a `theses/`
  // path (owner rendering ruling 2026-08-18; the option body is already
  // dense). Placement in the body rather than the label is a try-one-first
  // instruction: moving it to the label needs no amendment (the durable home and the entry point v11).
  const gate = {
    gate_id: "brief-thesis-adoption",
    where: `the settled Strand set: ${r.strands.map((s) => s.display_id).join(", ")} at pin ${record.pin}`,
    why: "the machine's premise, rendered: this settled set supports a Thesis — the candidates below are composed from the set's own members and from nothing else (the read-not-invented rule), and each carries the name it would give the Brief",
    label: "Adopting a Thesis starts the Brief: the mint runs next and the Brief's durable home is created under the adopted name, carrying the adopted Thesis",
    options: [
      // THE NAME RIDES THE LABEL (kogaki#567). The slug was a `rendering` entry
      // in the option BODY, which the durable home and the entry point v11 declared a TRY-ONE-FIRST placement
      // with its own release condition — "if it reads badly in use, it moves to
      // the label, and that move needs no amendment". It read badly at the
      // 2026-08-20 dogfood: the body entry sinks the name below the fold of an
      // option that is already dense, so the owner answers a (Thesis, name) pair
      // having seen one half. The condition fired; this is the move it
      // pre-authorized, not an amendment.
      //
      // BOTH v11 CONDITIONS STILL HOLD, which is why the move is admissible at
      // all. SEPARATELY RENDERED: the name is its own visible element of the
      // label, set off by a dash and named, rather than folded into the Thesis
      // prose where it would read as part of the claim. SEPARATELY DECLINABLE is
      // untouched — the owner keeps the option and renames in the same answer.
      // The BARE name, never a `theses/` path, exactly as the body entry carried
      // it.
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
    pin: record.pin,
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
// `gate-thesis` IS DELETED, AND IT LEAVES NO STUB (kogaki#1108).
//
// It was the thesis-determination gate's one-act-two-modes executor: `--declare`
// wrote the run declaration from the gate `enter` had composed and printed every
// option; `--capture` recorded the owner's answer against THAT declaration. Both
// modes existed because a SESSION stood between the composed candidates and the
// owner — it ran the declare, rendered the options, asked the question, and ran
// the capture.
//
// Under the Brief workflow table (`src/brief-workflow.json`) nothing stands
// there. The executor composes the declaration at the `THESIS_ADOPTION` wait and
// stops; the harness renders the byte-fixed call written beside it;
// `.claude/hooks/write-gate-capture.py` records the click at the moment it
// happens; `.claude/hooks/advance-brief.py` re-enters the executor, which reads
// the row. A deprecated entry point is an entry point (SPEC-terrain, "A removed
// entry point is DELETED, and leaves no stub"), so this is a deletion and a
// leftover invocation fails as an unknown subcommand.
//
// WHAT SURVIVES IS THE OPTION SET, AND IT SURVIVES WHERE IT ALWAYS WAS. This
// command never composed the declaration: `enter` writes `state.gate`, and both
// modes carried it over rather than recomposing it, so that the thing the owner
// is shown and the thing the answer is judged against could not disagree. The
// GATE_WORK composer below reads that same `state.gate`, and `adopt` still
// digests over the same option ids. `thesisGatePaths` went with the command —
// it named a declaration and a capture BESIDE THE RUN STATE, and both now live
// in the executor's own run workspace, which is per run by construction and so
// needs no run-state-stem key to keep two entries apart.

// ---- adopt: CONSUME the owner's captured answer at THE ONE GATE. ----
//
// THE ANSWER IS READ, NEVER RECEIVED AS AN ARGUMENT (kogaki#891). This
// command used to take `--thesis <candidate id | free text>` and `--slug`,
// both composed by the model from the question-UI answer and neither carrying
// any evidence field: the Harness's most consequential write in this pipeline
// — the Brief's Thesis and the name it is minted under — was authorised by
// the model's account of what the owner chose, and a model that adopted a
// candidate the owner declined, or passed its own sentence as the owner's
// free text, minted a tracked `theses/<slug>/brief.md` with no refusal.
//
// The answer now arrives as a `*.gate-capture.json` row carrying the
// AskUserQuestion `tool_use_id`, bound to the option set it was offered
// against. `--thesis` is REMOVED rather than deprecated: a channel that still
// exists is a channel, and leaving it beside the capture would make the
// capture optional in exactly the runs that skip it.
//
// The answer still has two halves and they still arrive together (the durable home and the entry point v11,
// kogaki#518) — the adopted candidate (or the owner's own words) and the
// OPTIONAL name override — but both halves now ride the captured row rather
// than two arguments. This command emits NO ask.
function cmdAdopt(args) {
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
  // THE MINT RECORDS THE CLAIM, NEVER THE FRAME (the prose-at-the-surface rule v20, kogaki#566). What
  // the owner adopted at the gate is the claim; `thesis` also carries the
  // sentence about how the other settled members serve it, which is scaffolding
  // for the gate and has no business in a tracked document. A free-form answer
  // has no frame to strip — it is the owner's own words and is taken verbatim,
  // exactly as v9 took it and v11 kept it, and since kogaki#891 those words
  // reach here only through the captured answer.
  // NO FALLBACK TO `thesis`. Every candidate carries a `claim` by construction
  // (`composeThesisCandidates` sets one on every branch), so a `hit.claim ||
  // hit.thesis` disjunct could only fire on a run state this file did not write
  // — and what it would do THERE is silently record the framed sentence the
  // strip exists to remove, reporting nothing. An absent claim refuses instead
  // (PR #571 round 1).
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

function cmdMint(args) {
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
  mkdirSync(home, { recursive: true });
  const out = join(home, "brief.md");
  const doc = composeBrief({
    slug, pin: state.pin, strands: state.strands, thesis: state.adopted_thesis,
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

// ===========================================================================
// THE BRIEF FLOW (kogaki#1108, owner decision 2026-09-12).
//
// WHAT CHANGED, in one sentence: the Brief is a HARNESS-OWNED WORKFLOW TABLE on
// the Terrain pattern, and the Model's freedom is the FIELD VALUES of schemas
// the Harness declares.
//
// WHAT IT REPLACES. Before this, `.claude/skills/brief/SKILL.md` was 200-odd
// lines of conduct: it told the session which command to run, what to render,
// what to compose, when to ask, and what never to do. Every Act that mattered —
// composing the Reader Paths, reviewing them, raising two owner gates, judging
// the specialization record — was performed BY A SESSION READING PROSE. That is
// the defect `checks/check-terrain-skill-is-one-line.sh` was admitted over one
// lane across, measured rather than feared, and the same measurement holds here:
// prose is advisory to a system whose job is to satisfy instructions.
//
// WHAT A FLOW IS, and it is the whole of what this block adds: a TABLE
// (`src/brief-workflow.json`), a LANE, and the TWO MAPS a state id is looked up
// in. `runWorkflow` is `src/terrain.mjs`'s own advance loop — the one that reads
// the run record, executes states until the next declared wait or the terminal,
// composes the gate declaration and its byte-fixed call, reads the harness's
// capture, invokes the pinned judge and validates what comes back. None of it is
// reimplemented here, and the reason is stated rather than assumed: two
// implementations of `the re-entrant executor` drift in exactly the clauses
// nobody reads twice, and this file would be the copy that fell behind.
//
// WHERE THE MODEL STILL ACTS, stated plainly so the bound is checkable. At three
// states, as the JUDGE the executor CALLS — `compose_path`, `review_path`,
// `judge_specialization` — and nowhere else. Each of the three declares its
// judgment point, its record shape, its refusals and its re-ask count in the
// table; two of them declare a `schema_file` the executor renders into the
// prompt VERBATIM and the validator reads its field set back out of. The Model
// fills declared fields; it never decides what the fields are, when the state
// runs, whether the run advances, or what the owner is asked.
const BRIEF_HERE = dirname(fileURLToPath(import.meta.url));
const BRIEF_REPO = resolve(BRIEF_HERE, "..");
const BRIEF_TABLE = join(BRIEF_HERE, "brief-workflow.json");

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

// The lane entry name a START act opens a workspace under. Its shape is
// `terrainRunEntry`'s — the lane name, the ISO instant, path-safe — and it is
// composed here rather than imported because that helper names its own lane.
function briefRunEntry(now = new Date()) {
  return `brief-${now.toISOString().replace(/[:.]/g, "-")}`;
}

// The capture file the harness writes this run's answers into. ONE FILE PER RUN
// WORKSPACE, holding a row per raising of either gate: `readCapturedAnswer` in
// the executor composes exactly this path from the flow's lane and the gate
// schema's suffix, and `validateOwnerAnswer` filters it by `gate_id`, so the two
// gates share a file and never an answer.
function captureFile(rec) {
  return join(rec._dir, `brief${gateSchema().capture.suffix}`);
}

function needRunState(rec, st) {
  return rec.brief_run_state
    || fail(`${st.id} has no run state — the \`enter\` state writes it and precedes this state in `
      + "src/brief-workflow.json. Nothing was written.");
}

function needBrief(rec, st) {
  const written = (rec.artifacts_written || []).find((a) => a.state === "mint");
  return written
    ? resolve(BRIEF_REPO, written.path)
    : fail(`${st.id} has no minted Brief — the \`mint\` state creates it and precedes this state in `
      + "src/brief-workflow.json. Nothing was written.");
}

// A refusal a JUDGMENT state raises. Inside the executor's re-ask window this is
// what makes the judge try again with this exact text; outside it — the explicit
// `--candidates`/`--review`/`--specialization` path, which the fixture and the
// second-repository paths use — it is caught by `judged` below and becomes an
// ordinary refusal. ONE REFUSAL BODY FOR BOTH, which is `judgedRecordPath`'s own
// rule one file over: two copies of a refusal is two readings of one rule.
function refuseJudgment(msg) {
  throw new JudgmentRefusal(msg);
}

async function judged(rec, st, table, args, flag, composeInput, validate) {
  try {
    return await judgedRecordPath(rec, st, table, args, flag, composeInput, validate);
  } catch (e) {
    if (e instanceof JudgmentRefusal) fail(`${st.id}: ${e.message}`);
    throw e;
  }
}

function writeJudgeInput(rec, st, body) {
  const p = join(rec._dir, `brief-judge-input-${st.id}.json`);
  writeFileSync(p, JSON.stringify(body, null, 2) + "\n");
  return p;
}

// ---- THE TWO FACTS `enter` NEEDS, AND WHERE THEY COME FROM (kogaki#1108).
//
// `--survey` and `--ids` still win, and that is the fixture path and the
// second-repository path, unchanged. With neither, they are READ FROM TERRAIN'S
// OWN RUN RECORD: `survey_record` names the record that assigned the `L<n>` ids,
// and `owner_input.ID_SELECTION` holds what the OWNER answered at the
// `terrain-id-selection` gate. `settledStrandHandoff` resolves the second
// against the first the way the Terrain state that PRINTED those ids resolves
// them, which is why it lives in that runtime and not here.
//
// WHY THIS EXISTS AT ALL. The skill file is one `!` line now, and a line the
// harness runs carries no arguments — so a Brief started by the owner has no
// argv to put a settled set on. Before this the set reached the runtime as a
// comma-separated list the MODEL retyped off a Full Report it had read, which is
// exactly the class of input this issue removes: an id list a model retypes is
// an id list a model can retype wrong, and nothing downstream could tell.
function entryInputs(args) {
  const survey = typeof args.survey === "string" && args.survey !== "" ? args.survey : null;
  const ids = typeof args.ids === "string" && args.ids !== "" ? args.ids : null;
  if (survey && ids) return { survey, ids, via: "argv" };
  const t = terrainRunRecord();
  if (!t) {
    fail("`enter` has no settled Strand set: neither --survey/--ids were given nor is there a Terrain "
      + "run record to read one from. A Brief starts from a set the owner ALREADY settled at Terrain's "
      + "id-selection gate and never composes one of its own (SPEC-terrain: Terrain ends at Strand "
      + "exploration). Run Terrain first. Nothing was written.");
  }
  const h = settledStrandHandoff(t.record);
  if (h.error) {
    fail(`\`enter\` cannot read the settled Strand set from the Terrain run at ${t.dir}: ${h.error}. `
      + "Nothing was written.");
  }
  return {
    survey: survey || h.survey,
    ids: ids || h.displayIds.join(","),
    via: `the Terrain run at ${t.dir}`,
  };
}

// ---- THE RENDERER HALF. One entry per state the table declares, keyed by state
// id, exactly as `src/terrain.mjs`'s own STATE_WORK is: a new state is a table
// row PLUS a renderer, and the executor invents neither.
const STATE_WORK = {
  enter: (rec, st, args) => {
    const runState = join(rec._dir, "run.json");
    const inputs = entryInputs(args);
    cmdEnter({ ...args, survey: inputs.survey, ids: inputs.ids, "run-state": runState });
    rec.brief_run_state = runState;
    rec.settled_set_via = inputs.via;
    return null;
  },

  adopt_thesis: (rec, st, args) => {
    // THE ANSWER IS THE HARNESS'S ROW, AND `--capture` NAMES THE FILE IT IS IN.
    // `cmdAdopt` re-derives the option-set digest from the gate `enter`
    // composed and refuses a row that answers a different one — the same check
    // the deleted `gate-thesis --capture` performed, now performed once, at the
    // one act that consumes the answer.
    cmdAdopt({ ...args, "run-state": needRunState(rec, st), capture: captureFile(rec) });
    return null;
  },

  mint: (rec, st, args) => ({
    artifact: cmdMint({ ...args, "run-state": needRunState(rec, st) }),
  }),

  // ---- JUDGMENT POINT 1. The composition itself.
  //
  // THE SCHEMA IS RENDERED INTO THE PROMPT BY THE EXECUTOR, from this state's
  // `schema_file` row. What is validated here is the same file's field set, read
  // by `validateSteps` — so the text the Model composes against and the text the
  // refusal enforces are ONE FILE and cannot disagree. That property is the
  // reason `src/step-schema.json` exists; this state is its second reader.
  compose_path: async (rec, st, args, table) => {
    const briefPath = needBrief(rec, st);
    const doc = readFileSync(briefPath, "utf8");
    const strandIds = selectedStrands(doc);
    let composed = null;
    const validate = (p) => {
      let raw;
      try { raw = readJson(p); }
      catch (e) { refuseJudgment(`the record at ${p} is not JSON (${e.message}); ${st.input_shape}`); }
      const cands = raw && raw.candidates;
      if (!Array.isArray(cands)) {
        refuseJudgment(`the record carries no \`candidates\` array; ${st.input_shape}`);
      }
      // THE COUNT IS `assembleSelection`'s AND IS STATED HERE TOO, deliberately.
      // Two to three per article is the Candidate gate's own bound, and a
      // composition that breaks it is repairable by a re-ask — where the same
      // breach reaching `assemble_candidates` would fail the run after the
      // review state had already spent a judge call on every Candidate.
      if (cands.length < 2 || cands.length > 3) {
        refuseJudgment(`${cands.length} Candidate(s) — the Candidate gate presents two to three per `
          + "article, differing in reader experience; a single Candidate is a default in disguise "
          + "and four overruns the selector");
      }
      const seenId = new Set();
      const seenExp = new Set();
      for (const c of cands) {
        if (!c || typeof c.candidate_id !== "string" || c.candidate_id === "") {
          refuseJudgment("every Candidate carries a non-empty `candidate_id`");
        }
        if (seenId.has(c.candidate_id)) {
          refuseJudgment(`two Candidates carry the candidate_id ${JSON.stringify(c.candidate_id)} — `
            + "the id is what the owner's answer at the selection gate resolves through");
        }
        seenId.add(c.candidate_id);
        if (typeof c.reader_experience !== "string" || c.reader_experience.trim() === "") {
          refuseJudgment(`candidate ${c.candidate_id}: \`reader_experience\` is required and cannot be `
            + "blank — Candidates differ in READER EXPERIENCE, the difference must be stated to be "
            + "selectable, and the option label IS this prose");
        }
        const expKey = c.reader_experience.trim().toLowerCase();
        if (seenExp.has(expKey)) {
          refuseJudgment(`candidate ${c.candidate_id} states a reader experience another Candidate `
            + "already states — Candidates differ in reader experience, or they are one Candidate "
            + "presented twice");
        }
        seenExp.add(expKey);
        // THE STEP REFUSALS ARE `validateSteps`' OWN, re-implemented nowhere.
        // One-ground-per-Strand, the closed ground type set, every required
        // field and its description all come from `src/step-schema.json`
        // through that function.
        const v = validateSteps(c.steps);
        if (v.error) refuseJudgment(`candidate ${c.candidate_id}: ${v.error}`);
        // THE CLOSED STRAND SET, refused HERE rather than only at adoption. A
        // material outside the Brief's settled set is refused by `fillBrief`
        // at `adopt_candidate` — after the owner has chosen the path — so
        // raising it inside the re-ask window is what makes it repairable
        // instead of terminal. A Brief never fetches: the set closed at mint.
        for (const s of c.steps) {
          for (const m of s.materials) {
            if (!strandIds.includes(m)) {
              refuseJudgment(`candidate ${c.candidate_id}, step ${s.step_id}: material ${m} is outside `
                + `the Brief's closed Strand set (${strandIds.join(", ")}). The set closed at mint and a `
                + "Brief never fetches — compose from the settled Strands and from nothing else");
            }
          }
        }
        const reasoning = c.reasoning || {};
        for (const key of ["step_validity", "transition_continuity", "thesis_closure"]) {
          if (typeof reasoning[key] !== "string" || reasoning[key].trim() === "") {
            refuseJudgment(`candidate ${c.candidate_id}: \`reasoning.${key}\` is required — the Brief's `
              + "closing sections are filled from it at adoption, and adoption fills no default");
          }
        }
        for (const [key, heading] of READER_FIELDS) {
          if (typeof c[key] !== "string" || c[key] === "") {
            refuseJudgment(`candidate ${c.candidate_id}: ${heading} is unauthored — path composition `
              + "writes it per Candidate, and adoption fills no default");
          }
        }
      }
      composed = cands;
    };
    const composeInputFor = () => writeJudgeInput(rec, st, {
      state: st.id,
      brief: relFromRepo(briefPath),
      // THE BRIEF ITSELF, VERBATIM. It carries the adopted Thesis, the Reader
      // start, and the settled Strands with their served renderings — which is
      // the whole of what a path may be composed from (the read-not-invented
      // rule). Handing a summary instead would be this file deciding what the
      // composition stands on.
      brief_document: doc,
      strands_you_may_use: strandIds,
      candidates_required: "two or three, differing in reader experience",
    });
    const path = await judged(rec, st, table, args, "candidates", composeInputFor, validate);
    // THE BARE ARRAY, WRITTEN BESIDE THE RECORD. `src/review.mjs attach` reads
    // its `--candidates` as the Candidate array, and the judge's record is an
    // object wrapping it; writing the projection here is what keeps the two
    // readers from each unwrapping it their own way.
    const out = join(rec._dir, "brief-candidates.json");
    writeFileSync(out, JSON.stringify(composed, null, 2) + "\n");
    rec.brief_candidates = out;
    rec.judgments[st.id] = relFromRepo(resolve(path));
    return null;
  },

  // ---- JUDGMENT POINT 2. Path review, which is REASONING and never a verdict.
  //
  // `attachReview` is the validator and it is the same function the next state
  // writes through: a review record that would be unattachable is refused here,
  // inside the re-ask window, rather than at the attach where the round would
  // already be spent.
  review_path: async (rec, st, args, table) => {
    const cands = readJson(rec.brief_candidates
      || fail(`${st.id} has no composed Candidates — \`compose_path\` writes them and precedes this state.`));
    const validate = (p) => {
      let review;
      try { review = readJson(p); }
      catch (e) { refuseJudgment(`the record at ${p} is not JSON (${e.message}); ${st.input_shape}`); }
      // AGAINST AN EMPTY LEDGER, DELIBERATELY. This is a SHAPE check — every
      // Candidate reviewed, no verdict-shaped field anywhere — and the round
      // count is the ledger's, spent once, by the state that actually attaches.
      // Passing the live ledger here would let a refused judge response consume
      // the revise round the Candidate has not yet had.
      const r = attachReview(cands, review, {});
      if (r.error) refuseJudgment(r.error);
    };
    const composeInputFor = () => writeJudgeInput(rec, st, {
      state: st.id,
      review_areas: REVIEW_AREAS,
      candidates_you_must_review: cands,
    });
    const path = await judged(rec, st, table, args, "review", composeInputFor, validate);
    rec.brief_review = relFromRepo(resolve(path));
    rec.judgments[st.id] = relFromRepo(resolve(path));
    return null;
  },

  attach_review: (rec, st, args) => {
    const out = join(rec._dir, "brief-reviewed.json");
    cmdAttach({
      ...args,
      candidates: rec.brief_candidates,
      review: resolve(BRIEF_REPO, rec.brief_review
        || fail(`${st.id} has no review record — \`review_path\` writes it and precedes this state.`)),
      brief: needBrief(rec, st),
      out,
    });
    rec.brief_reviewed = out;
    return null;
  },

  assemble_candidates: (rec, st, args) => {
    const out = join(rec._dir, "brief-selection.json");
    cmdAssemble({
      ...args,
      reviewed: rec.brief_reviewed
        || fail(`${st.id} has no reviewed Candidates — \`attach_review\` writes them and precedes this state.`),
      brief: needBrief(rec, st),
      out,
    });
    rec.brief_selection = out;
    return null;
  },

  // ---- JUDGMENT POINT 3. The Step-Move instantiation contract's judged half,
  // over the SELECTED Candidate alone.
  //
  // SCOPED TO THE SELECTION, and the scoping is the point rather than an
  // economy: judging a record about a path nobody chose is wasted work ending in
  // a refusal that names the wrong thing, which is `adoptCandidate`'s own stated
  // ordering rule applied one state earlier.
  //
  // THE RECORD IS DISCLOSURE (kogaki#1108). A passing record no longer unlocks a
  // write by way of an owner's ratification; it is validated here, and
  // `adopt_candidate` renders it as one sentence in the closing summary. A
  // `contradicts` or `cannot-determine` verdict still refuses, in path order,
  // with the same message it always carried.
  judge_specialization: async (rec, st, args, table) => {
    const reviewed = readJson(rec.brief_reviewed
      || fail(`${st.id} has no reviewed Candidates — \`attach_review\` writes them and precedes this state.`));
    const chosen = selectedCandidateId(rec, st);
    const c = (reviewed.candidates || []).find((x) => x.candidate_id === chosen)
      || fail(`${st.id}: the owner selected ${JSON.stringify(chosen)} at the Candidate gate and no `
        + `Candidate carries that id (${(reviewed.candidates || []).map((x) => x.candidate_id).join(", ") || "empty"}). `
        + "Nothing was written.");
    const validate = (p) => {
      let record;
      try { record = readJson(p); }
      catch (e) { refuseJudgment(`the record at ${p} is not JSON (${e.message}); ${st.input_shape}`); }
      const v = validateSpecialization(record, c.steps, chosen);
      if (v.error) refuseJudgment(v.error);
    };
    const composeInputFor = () => writeJudgeInput(rec, st, {
      state: st.id,
      candidate_id: chosen,
      steps_you_must_judge: c.steps,
    });
    const path = await judged(rec, st, table, args, "specialization", composeInputFor, validate);
    rec.brief_specialization = relFromRepo(resolve(path));
    rec.judgments[st.id] = relFromRepo(resolve(path));
    return null;
  },

  adopt_candidate: (rec, st, args) => {
    const briefPath = needBrief(rec, st);
    cmdAdoptCandidate({
      ...args,
      brief: briefPath,
      reviewed: rec.brief_reviewed,
      candidate: selectedCandidateId(rec, st),
      specialization: resolve(BRIEF_REPO, rec.brief_specialization
        || fail(`${st.id} has no specialization record — \`judge_specialization\` writes it and precedes this state.`)),
      // THE SELECTION IS THE HARNESS'S OWN CAPTURE FILE, passed whole.
      // `validateOwnerAnswer` filters it by gate id and binds the answer to the
      // option set it was offered against, so the file holding both gates'
      // rows is read as this gate's answer and no other.
      selection: captureFile(rec),
    });
    return { artifact: briefPath };
  },

  done: () => null,
};

// The owner's answer at the Candidate gate, read from the run record the
// executor wrote it onto. A free-text answer carries no option and reaches
// `adoptCandidate`'s own refusal — free text at this gate is a COMMENT, not a
// selection — so it is passed through rather than reinterpreted here.
function selectedCandidateId(rec, st) {
  const chosen = (rec.owner_input || {}).CANDIDATE_SELECTION;
  if (typeof chosen !== "string" || chosen === "") {
    fail(`${st.id} has no answer at the Candidate-selection gate — the CANDIDATE_SELECTION wait `
      + "precedes this state in src/brief-workflow.json, and the answer is the OWNER's. Nothing was written.");
  }
  if (chosen === "none-of-these") {
    fail("the owner answered \"none-of-these\" at the Candidate-selection gate — the Thesis or the "
      + "selected set is what should change, and NO Reader Path lands in the Brief. Nothing was written.");
  }
  return chosen;
}

// ---- THE OPTION-COMPOSER HALF. A GATE state is a table row PLUS an option
// composer, and the executor invents neither options nor a judgment. Both
// composers below return only the RUN's options: the registry's standing
// premise-negation is merged in by `emitGateDeclaration` from
// `src/gate-registry.json`, after them and in that order — which is the order
// both digests are taken over.
const GATE_WORK = {
  // THE OPTIONS ARE `enter`'S, CARRIED OVER AND NOT RECOMPOSED. `enter` writes
  // `state.gate` — the 2-3 (Thesis, name) pairs, the premise negation, the
  // free-text prompt — and `adopt` digests over that same list. Recomposing here
  // would be a second answer to what the owner was shown.
  THESIS_ADOPTION: (rec) => {
    const state = readJson(rec.brief_run_state
      || fail("THESIS_ADOPTION has no run state to raise a gate from — `enter` writes it and precedes this wait."));
    const gate = state.gate;
    if (!gate || !Array.isArray(gate.options) || gate.options.length === 0) {
      fail("the run state carries no thesis-determination gate declaration — `enter` composes it, and an "
        + "answer is admitted only at the wait that declared it.");
    }
    return {
      options: gate.options
        .filter((o) => o.id !== "back-to-terrain")
        .map((o) => ({ id: o.id, label: o.label })),
      extra: {},
    };
  },

  // ONE COMPOSER FOR THE OPTION SET, CALLED BY THE GATE AND BY ADOPTION.
  // `selectionOptionIds` is what the deleted `gate-candidate` called and what
  // `adoptCandidate` still calls, so the set the owner is shown, the set the
  // digest is taken over, and the set adoption re-derives are one computation.
  CANDIDATE_SELECTION: (rec) => {
    const reviewed = readJson(rec.brief_reviewed
      || fail("CANDIDATE_SELECTION has no reviewed Candidates to offer — `attach_review` writes them and precedes this wait."));
    const doc = readFileSync(needBrief(rec, { id: "CANDIDATE_SELECTION" }), "utf8");
    const offered = selectionOptionIds(reviewed, doc);
    if (offered.error) {
      fail(`${offered.error}\n\nNo gate is raised: the Candidates cannot be presented, so there is nothing `
        + "to choose between. Repair the Candidates, not the gate.");
    }
    return {
      options: offered.options
        .filter((o) => o.id !== "none-of-these")
        .map((o) => ({ id: o.id, label: o.label })),
      extra: {},
    };
  },
};

// THE FLOW BINDING. Everything a second flow differs in, and nothing else —
// the shape `src/terrain.mjs` declares at `TERRAIN_FLOW` beside its own.
const BRIEF_FLOW = {
  lane: "brief",
  label: "Brief",
  startLine: "the brief skill's own `!` line (`node src/brief.mjs start`)",
  tablePath: BRIEF_TABLE,
  newRunDir: () => enterRun("brief", briefRunEntry()),
  stateWork: STATE_WORK,
  gateWork: GATE_WORK,
  // PER FLOW, so a fixture pinning one lane's workspace does not redirect the
  // other's. `KOGAKI_RUN_DIR` and `KOGAKI_OPEN_RUN` stay Terrain's.
  runDirEnv: "KOGAKI_BRIEF_RUN_DIR",
  openRunEnv: "KOGAKI_BRIEF_OPEN_RUN",
};

const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  switch (args._cmd) {
    case "enter": cmdEnter(args); break;
    case "adopt": cmdAdopt(args); break;
    case "mint": cmdMint(args); break;
    // ---- THE CONTROL PLANE'S ONE ADVANCE (kogaki#1108), entered once per act.
    //
    // THE PAYLOAD GATE, BEFORE ANY WRITE, is `src/terrain.mjs`'s own and is
    // reproduced here rather than shared for the reason it sits in that
    // dispatcher rather than inside `cmdRun`: it must refuse BEFORE a run
    // directory is opened, and the dispatcher is the only place before it.
    // `--status` is read-only and is exempt.
    case "run": {
      if (args.status) { runWorkflow(BRIEF_FLOW, args, null); break; }
      const advancedBy = advancedByFromPayload(readHookPayload());
      if (!advancedBy) {
        fail("the executor advances only inside a harness hook event, and no hook payload carrying "
          + "hook_event_name, session_id and tool_use_id was readable on stdin. Nothing was written. "
          + "A Brief run is STARTED by the brief skill's own `!` line (`node src/brief.mjs start`) and "
          + "ADVANCED inside the PostToolUse hook for the AskUserQuestion that answered its gate "
          + "(.claude/hooks/advance-brief.py); `run --status` is the only verb reachable from a Bash "
          + "command, and it is read-only.");
      }
      runWorkflow(BRIEF_FLOW, args, advancedBy);
      break;
    }
    // ---- THE START ACT. Executed by the harness's SKILL EXPANSION — the brief
    // skill file's one `!` line runs this before the model sees anything. It
    // opens the run, advances to its first wait, and stops; it refuses an
    // existing run record, so it never resumes one. Its transitions carry the
    // `skill-expansion` executor kind and no hook fields, because no hook event
    // produced them and inventing one would be a fabricated attribution.
    case "start": runWorkflow(BRIEF_FLOW, args, SKILL_EXPANSION_EXECUTOR, { stopAtFirstWait: true }); break;
    default: fail("usage: brief.mjs start | run [--status] | enter --survey <record> --ids <L1,L2,...> [--run-state <path>] | adopt --run-state <path> --capture <gate capture> | mint --run-state <path> [--theses-dir <dir>] [--slug <caller-supplied home, never an owner question>]");
  }
}
