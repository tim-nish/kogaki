#!/usr/bin/env node
// brief — the Brief entry point (SPEC-draft-pipeline §5.3, v9 re-sequencing,
// kogaki#494; slug PAIRED INTO THE ONE GATE at v11, kogaki#518; entry point
// v7, kogaki#482; stories 1.71, 1.72 and 1.76).
//
// THE ORDER IS THE CONTRACT (v9, owner ruling 2026-08-17): entry resolves
// the settled Strand set → the thesis-determination gate → the mint. Nothing
// lands under briefs/ before a Thesis is adopted — pre-Thesis state is a
// MACHINE-LOCAL RUN RECORD, legitimately machine-local per the served
// artifacts-live-where-human-works split (topics/knowledge-architecture.md:28
// at pin 8906f207). The owner artifact begins exactly when the first piece of
// substantive owner judgment — the Thesis — exists. A pre-Thesis Brief file
// is UNPRODUCIBLE here, not prohibited: no code path below writes into
// briefs/ except `mint`, and `mint` refuses without an adopted Thesis.
//
// Three commands, one per block of the re-sequenced flow:
//   enter  — resolves LessonDisplayIDs against the survey record (refusals
//            unchanged from §5.3: unknown id names both sides; G-ids refused
//            by name), composes 2–3 Thesis candidates FROM THE SETTLED SET
//            ONLY (§3's read-not-invented rule), DERIVES ONE SLUG PER
//            CANDIDATE from that candidate's own Thesis, and writes the
//            machine-local run state. Emits the thesis-determination gate's
//            declaration, whose every option is a (Thesis, slug) PAIR.
//   adopt  — records the owner's answer at THE ONE GATE: the adopted Thesis
//            and the slug it is paired with, or an override slug the owner
//            named in the same answer. Emits no ask of its own.
//   mint   — consumes the adopted (Thesis, slug) PAIR from the run state and
//            creates briefs/<slug>/brief.md with `thesis` FILLED AT MINT BY
//            CONSTRUCTION and every downstream §5.1 field a typed unfilled
//            slot. Idempotence by slug; a collision refuses (creator, never
//            an editor).
//
// THERE IS NO SECOND ASK (v11, kogaki#518, owner ruling 2026-08-17 recorded
// in kogaki#494's thread). The slug question does not exist as a code path:
// nothing below emits a `slug_gate` and no command carries a
// brief-slug-approval declaration, so a second slug ask is UNPRODUCIBLE
// rather than prohibited. The merge is admissible only under the served
// constraint §5.3 v11 binds it by — a gate may carry a second decision class
// only if that class is SEPARATELY RENDERED and SEPARATELY DECLINABLE — so
// each option renders its slug as its own element of the option body (the
// bare slug, never a `briefs/` path), and `adopt --slug` declines that half
// without restating the Thesis or abandoning the option.
//
// OUTSIDE TERRAIN, by the 2026-08-09 boundary correction: this runtime never
// surveys, widens, or fetches a set — it receives one the owner settled. The
// closed-set invariant binds from the mint: growing the set is an owner act
// routing back through Terrain, never a Brief fetch (topics/articles.md:13
// at the same pin) — which is why the thesis gate's premise-negation option
// routes BACK THROUGH TERRAIN and never re-opens the set here.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolveHeadlines, NO_HEADLINE as NO_RENDERING } from "../terrain/terrain.mjs";
import { SLOT_CAPTIONS, findInternalVocabulary } from "./assemble.mjs";
import { snapshotBrief } from "./compose.mjs";
import { join, resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

function fail(msg) {
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

// The §5.1 fields DOWNSTREAM OF THE THESIS, every one present as a TYPED
// UNFILLED SLOT — an absent field and a field awaiting composition are
// different silences, and only the second lets a later sitting resume
// (§5.3). The `thesis` field is NOT in this list at v9: it is filled at
// mint by construction, because the mint runs at Thesis adoption.
const SLOT = "*(awaiting composition)*";
// THE CAPTIONS ARE READ FROM ONE TABLE, NOT WRITTEN HERE (kogaki#526). Every
// caption used to carry its own field key and, in three cases, a section
// reference — `thesis_closure — explanation and established_by_steps.`,
// `sequence — the ordered steps of §4.1.` — on a TRACKED document the owner
// reads directly. kogaki#520 removed that vocabulary from the gate payload and
// installed a tripwire there; the tripwire reads the payload and had no reach
// into the minted document, which is why this was a separate carrier.
const fields = () => [...SLOT_CAPTIONS.entries()];

// Exported and pure over its inputs, so the check exercises the composed
// document without a filesystem. `thesis` is required: at v9 no document
// exists without one.
export function composeBrief({ slug, pin, strands, thesis }) {
  if (typeof thesis !== "string" || thesis === "") {
    throw new Error("composeBrief: a Brief cannot be composed without an adopted thesis (§5.3 v9)");
  }
  const L = [];
  // TWO EMITTERS, and the split IS the tripwire's reach (§5.3 v15, kogaki#537).
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
  // stale. It is small, it is all in this function, and §5.3 v15 names it — a
  // future line carrying external content goes through `material` or the guard
  // silently widens to text this codebase did not write.
  const guarded = [];
  const say = (s = "") => { L.push(s); guarded.push(s); };
  const material = (s = "") => { L.push(s); };
  material(`# Brief — ${slug}`);
  say();
  // The reader-facing definition, in the act that uses the term (§5.3).
  say("> A **brief** is the working plan for one article: the served");
  say("> material (Strands) the owner settled on, and the composition");
  say("> fields — thesis, sequence, coverage, obligations — filled in as");
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
      // (§5.3) — a cite the record holds and the document drops sends the
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
  // WHAT IS CHECKED, and it is no longer every line (§5.3 v15, kogaki#537).
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
        + `${JSON.stringify(line.trim().slice(0, 80))}. briefs/<slug>/brief.md is a tracked `
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
// contract's own (§5.3): an unknown id names BOTH sides, never a silent
// drop; a Group/SubGroup id is refused BY NAME as a per-report-identity
// token. Exported for the check's refusal cases. UNCHANGED at v9 — the
// re-sequencing moved the mint, not the entry refusals.
export function resolveStrandIds(record, entered) {
  const gids = entered.filter((x) => /^G[0-9]+(-[0-9]+)?$/.test(x));
  if (gids.length) {
    return { error:
      `${gids.join(", ")}: Group/SubGroup ids are per-REPORT-IDENTITY tokens `
      + "(SPEC-terrain §12.1) — they name a grouping, not the settled set, and "
      + "a pin advance renumbers them. Enter the LessonDisplayIDs (L<n>) that "
      + "stand in the report's member headings beside the grouping you "
      + "navigated by (SPEC-draft-pipeline §5.3)." };
  }
  const bad = entered.filter((x) => !/^L[0-9]+$/.test(x));
  if (bad.length) {
    return { error:
      `${bad.join(", ")}: not a LessonDisplayID. The input unit is L<n> and `
      + "nothing else (SPEC-draft-pipeline §5.3; SPEC-terrain §14.3)." };
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
      + `${held.join(", ") || "no display ids (the record predates §14.3)"}. `
      + "Nothing was dropped silently (§3's completeness rider at entry)." };
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

// Compose 2–3 Thesis candidates FROM THE SETTLED STRAND SET ONLY (§3,
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
// entry and this composes from its members and nothing else — the §5.3
// invariant is about GROWING the set, and resolving the material a settled
// member already names is not growth. The resolution itself is terrain's:
// `resolveHeadlines` is called there, bounded by the members' own tags, so the
// Brief lane gains no seam read of its own and terrain stays the one component
// that reads served renderings (§3, §9).
//
// AN ABSENT RENDERING IS DISCLOSED, NEVER SUBSTITUTED: the member's phrase
// becomes terrain's own NO_HEADLINE marker, which is loud at the gate and is
// the convention `cmdView` already follows. Composing around the gap would
// hide a fault the owner is the one who can clear. The candidates differ in which member LEADS, because that is a real
// composition fork the set itself carries; each is in plain register per
// SPEC-style-contract §4 (no unexplained term of art, one relation per
// sentence, a concrete subject acting) and carries its round-trip
// CONCESSION explicitly — a concession is part of the output, never a
// silent omission. Exported for the check's compose-from-settled-set case.
//
// PROSE AT THE SURFACE, SCHEMA IN THE RECORD (§5.1.3 v20, kogaki#566). What
// this function returns is a RECORD and keeps its fields; what the owner reads
// is prose composed from them, and it carries NO FIELD LABEL. The three frames
// that shipped before — "The article's spine is this claim:", "The article makes
// one claim:", "Concedes:" — handed the owner labelled fields at the one surface
// SPEC-style-contract §4 promises plain register to, so they are gone rather
// than reworded: the colon-framed shape was the defect, not the words inside it.
//
// AND `claim` IS SEPARATE FROM `thesis`, WHICH IS THE HALF THE MINT NEEDS.
// `claim` is what the owner adopts; `thesis` is `claim` plus the sentence saying
// how the other settled members serve it, and that second half is GATE
// SCAFFOLDING. Keeping them apart here is what lets the mint record the claim
// and drop the frame (§5.1.3) without the mint re-parsing prose it did not
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
// ONE TERMINAL PERIOD, AND NEVER TWO (§5.1.3, kogaki#566). A served headline is
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

// THE CLAIM IS A PREFIX OF WHAT THE GATE RENDERS (§5.1.3; kogaki#572). The mint
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

export function composeThesisCandidates(strands, headlines = new Map()) {
  const phrase = (s) => {
    const e = headlines.get(s.slug);
    if (e && e.headline) return e.headline;
    // THE MARKER CARRIES ITS MEMBER. An unresolved rendering is the same text
    // for every member, so a bare marker made all 2-3 candidates byte-identical
    // — one option presented three times, at the moment the owner most needed
    // to see that something was wrong (PR #534 round 1). The display_id is the
    // token §14.3 already renders on owner surfaces, so naming it here keeps
    // the options distinguishable AND says which member is missing material.
    return `${s.display_id} ${NO_RENDERING}`;
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
    // NOT the scaffolding §5.1.3 strips: scaffolding says how the OTHER settled
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
  for (const c of candidates) c.slug = deriveSlugCandidate(c.name_source || c.claim);
  return candidates;
}

// Derive ONE slug from a Thesis (story 1.72 AC4; paired into the gate at
// v11, kogaki#518): the slug is thesis-derived and owner-decided, never
// machine identity — §12.2's no-machine-identity repair kept by this route
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

function defaultRunState() {
  return join(homedir(), ".kogaki", "brief-runs", `run-${Date.now()}.json`);
}

function readRunState(args) {
  const p = argString(args, "run-state",
    "this command needs --run-state <path> — the machine-local run record "
    + "`enter` wrote (pre-Thesis state is machine-local, §5.3 v9)");
  if (!existsSync(p)) {
    fail(`run state ${p} does not exist — run \`brief.mjs enter\` first `
      + "(entry → thesis-determination gate → mint, §5.3 v9).");
  }
  return { path: p, state: JSON.parse(readFileSync(p, "utf8")) };
}

// ---- enter: resolve the set, compose candidates, write run state. ----
// WRITES NOTHING under briefs/ or any tracked path (story 1.72 AC1) — the
// run state is machine-local by default and the command has no briefs-dir
// concept at all.
function cmdEnter(args) {
  const record = JSON.parse(readFileSync(
    argString(args, "survey", "enter needs --survey <survey record> — the machine-local run-workspace JSON the terrain survey wrote (a value is required; a bare --survey flag is the omitted-value defect)"), "utf8"));
  const entered = argString(args, "ids",
    "enter needs --ids <L1,L2,...> — the settled Strand set as "
    + "LessonDisplayIDs (SPEC-draft-pipeline §5.3)")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (!entered.length) fail("--ids was empty. A Brief needs at least one settled Strand.");

  const r = resolveStrandIds(record, entered);
  if (r.error) fail(r.error);

  // Terrain resolves the settled members' served renderings — bounded by
  // their own tags, never the corpus (kogaki#528). This lane performs no seam
  // read of its own; it hands over the set it has already closed.
  const headlines = resolveHeadlines(r.strands);
  const candidates = composeThesisCandidates(r.strands, headlines);
  const runPath = typeof args["run-state"] === "string" && args["run-state"] !== ""
    ? args["run-state"] : defaultRunState();
  mkdirSync(dirname(runPath), { recursive: true });

  // The thesis-determination gate's declaration, carried WITH the ask
  // (story 1.72 AC3): the record-shape fields of
  // specs/spec-proposal-contract/SPEC.md (where/why/label/options/
  // free_text), the premise's negation as a FIRST-CLASS option routing back
  // through Terrain, and the registered gate id (gates/registry.json:
  // brief-thesis-adoption). The free-text channel does not discharge the
  // negation and carries no condition.
  //
  // THIS IS THE ONLY OWNER QUESTION BEFORE THE MINT (v11, kogaki#518): each
  // option carries its Thesis AND the name that Thesis derives. The slug
  // rides the option's `rendering` — the same body surface the composition
  // gate uses (kogaki#520) — so it is SEPARATELY RENDERED rather than hidden
  // inside the Thesis text, and it shows the BARE slug, never a `briefs/`
  // path (owner rendering ruling 2026-08-18; the option body is already
  // dense). Placement in the body rather than the label is a try-one-first
  // instruction: moving it to the label needs no amendment (§5.3 v11).
  const gate = {
    gate_id: "brief-thesis-adoption",
    where: `the settled Strand set: ${r.strands.map((s) => s.display_id).join(", ")} at pin ${record.pin}`,
    why: "the machine's premise, rendered: this settled set supports a Thesis — the candidates below are composed from the set's own members and from nothing else (§3), and each carries the name it would give the Brief",
    label: "Adopting a Thesis starts the Brief: the mint runs next and the Brief's durable home is created under the adopted name, carrying the adopted Thesis",
    options: [
      // THE NAME RIDES THE LABEL (kogaki#567). The slug was a `rendering` entry
      // in the option BODY, which §5.3 v11 declared a TRY-ONE-FIRST placement
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
      // The BARE name, never a `briefs/` path, exactly as the body entry carried
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
  console.log(`# entry resolved ${r.strands.length} member(s); nothing written under briefs/ — pre-Thesis state is machine-local (§5.3 v9).`);
}

// ---- adopt: record the owner's answer at THE ONE GATE — the pair. ----
// The answer has two halves and they arrive together (§5.3 v11, kogaki#518):
// `--thesis` is the adopted candidate id or the owner's own words, and the
// OPTIONAL `--slug` is the owner declining the paired name without declining
// the Thesis. Declining the slug half costs neither the Thesis nor the
// option: no restatement, no abandonment. This command emits NO ask.
function cmdAdopt(args) {
  const { path: runPath, state } = readRunState(args);
  const answer = argString(args, "thesis",
    "adopt needs --thesis <candidate id | free-form text> — the owner's "
    + "answer at the thesis-determination gate. With no owner answer the "
    + "gate blocks and nothing is written (story 1.72 AC6).");
  const hit = (state.thesis_candidates || []).find((c) => c.id === answer);
  if (answer === "back-to-terrain") {
    fail("the owner ruled the settled set is what should change — route back "
      + "through Terrain. No Brief is started (§5.3: never a Brief fetch).");
  }
  // THE MINT RECORDS THE CLAIM, NEVER THE FRAME (§5.1.3 v20, kogaki#566). What
  // the owner adopted at the gate is the claim; `thesis` also carries the
  // sentence about how the other settled members serve it, which is scaffolding
  // for the gate and has no business in a tracked document. A free-form answer
  // has no frame to strip — it is the owner's own words and is taken verbatim,
  // exactly as v9 took it and v11 kept it.
  // NO FALLBACK TO `thesis`. Every candidate carries a `claim` by construction
  // (`composeThesisCandidates` sets one on every branch), so a `hit.claim ||
  // hit.thesis` disjunct could only fire on a run state this file did not write
  // — and what it would do THERE is silently record the framed sentence the
  // strip exists to remove, reporting nothing. An absent claim refuses instead
  // (PR #571 round 1).
  if (hit && (typeof hit.claim !== "string" || hit.claim === "")) {
    fail(`candidate ${hit.id} carries no claim — the mint records the adopted claim `
      + "(§5.1.3), and a run state whose candidates predate that field cannot be "
      + "adopted from. Re-run `enter` to recompose the gate.");
  }
  const thesis = hit ? hit.claim : answer;
  // The slug half. An override is the owner's, taken as given; with none, the
  // adopted candidate's OWN paired slug stands — the one the owner read on
  // the option they chose. A free-form Thesis has no paired slug to stand,
  // so its slug derives from the owner's own words (v9 behaviour, unchanged).
  const override = args.slug;
  let slug, via;
  if (override !== undefined) {
    slug = argString(args, "slug",
      "adopt --slug needs a value — the name the owner wants instead of the "
      + "one paired with the adopted Thesis (a bare --slug flag is the "
      + "omitted-value defect).");
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
  writeFileSync(runPath, JSON.stringify(state, null, 2) + "\n");
  console.log(JSON.stringify({
    run_state: runPath,
    adopted: { thesis, slug, thesis_via: state.adopted_via, slug_via: via },
  }, null, 2));
  console.log("# The (Thesis, name) pair is adopted into machine-local run state — one gate, already answered. "
    + "Nothing exists under briefs/ until `mint` runs; no further question is raised (§5.3 v11, kogaki#518).");
}

// ---- mint: consume the adopted (Thesis, slug) PAIR. ----
function cmdMint(args) {
  const { state } = readRunState(args);
  if (state.stage !== "adopted" || typeof state.adopted_thesis !== "string" || state.adopted_thesis === "") {
    // THE GATE BLOCKS (story 1.72 AC6): no adopted Thesis, no writes — a
    // pre-Thesis Brief is unproducible, not prohibited (kogaki#494 remedy).
    fail("no Thesis has been adopted in this run — the thesis-determination "
      + "gate blocks and nothing is written under briefs/ (§5.3 v9; "
      + "kogaki#494: a pre-Thesis Brief is unproducible).");
  }
  // THE MINT CONSUMES THE ADOPTED PAIR (§5.3 v11, kogaki#518). The owner's
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
      + "owner's answer at the thesis-determination gate (§5.3 v11: the one "
      + "gate carries the Thesis and its name together; there is no separate "
      + "slug ask to answer).");
  }

  const briefsDir = resolve(typeof args["briefs-dir"] === "string" && args["briefs-dir"] !== "" ? args["briefs-dir"] : "briefs");
  const home = join(briefsDir, slug);
  // IDEMPOTENCE IS BY SLUG, AND A COLLISION REFUSES (§5.3): a Brief is owner
  // state from the moment it exists, and this runtime is a creator, never an
  // editor.
  if (existsSync(home)) {
    fail(`briefs/${slug}/ already exists. The entry point creates and never `
      + "overwrites — resume that Brief by opening its document, or re-answer "
      + "the thesis-determination gate naming a different name (`adopt "
      + "--thesis <id|text> --slug <name>`, SPEC-draft-pipeline §5.3 v11).");
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
  console.log(`Brief minted — READ THIS ONE (owner document, SPEC-draft-pipeline §5.3): ${out}`);
  console.log(`Strands: ${state.strands.map((s) => s.display_id).join(", ")} `
    + `(${state.strands.length} member(s), set closed at mint)`);
  console.log("The thesis field is FILLED at mint by construction (§5.3 v9); every downstream composition field is a typed unfilled slot — the next sitting resumes from the document.");
}

const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  switch (args._cmd) {
    case "enter": cmdEnter(args); break;
    case "adopt": cmdAdopt(args); break;
    case "mint": cmdMint(args); break;
    case "start":
      fail("`start` no longer exists — SPEC-draft-pipeline §5.3 was "
        + "re-sequenced at v9 (kogaki#494): entry → thesis-determination "
        + "gate → mint. Run `enter`, then `adopt`, then `mint`.");
      break;
    default: fail("usage: brief.mjs enter --survey <record> --ids <L1,L2,...> [--run-state <path>] | adopt --run-state <path> --thesis <id|text> [--slug <override>] | mint --run-state <path> [--briefs-dir <dir>] [--slug <caller-supplied home, never an owner question>]");
  }
}
