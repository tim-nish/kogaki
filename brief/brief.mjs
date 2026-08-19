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
const FIELDS = [
  ["Reader start", "reader_start — where the reader is before the article."],
  ["Reader target", "reader_target — where the article leaves them."],
  ["Opening question", "opening_question — the question the article's opening puts to the reader standing at reader_start."],
  ["Sequence", "sequence — the ordered steps of §4.1."],
  ["Strand coverage", "strand_coverage — per selected Strand: used_by_steps and role_in_thesis. The count check runs AFTER composition (§3's completeness rider)."],
  ["Unresolved obligations", "unresolved_obligations — the §5.2 ledger: authored judgments, recorded where their consumer reads them."],
  ["Thesis closure", "thesis_closure — explanation and established_by_steps."],
  ["Tradeoffs", "tradeoffs."],
];

// Exported and pure over its inputs, so the check exercises the composed
// document without a filesystem. `thesis` is required: at v9 no document
// exists without one.
export function composeBrief({ slug, pin, strands, thesis }) {
  if (typeof thesis !== "string" || thesis === "") {
    throw new Error("composeBrief: a Brief cannot be composed without an adopted thesis (§5.3 v9)");
  }
  const L = [];
  const say = (s = "") => L.push(s);
  say(`# Brief — ${slug}`);
  say();
  // The reader-facing definition, in the act that uses the term (§5.3).
  say("> A **brief** is the working plan for one article: the served");
  say("> material (Strands) the owner settled on, and the composition");
  say("> fields — thesis, sequence, coverage, obligations — filled in as");
  say("> composition proceeds. It is the durable document a drafting");
  say("> sitting resumes from.");
  say();
  say(`*Survey pin:* \`${pin}\``);
  say("*Strand set: CLOSED at mint — growing it is an owner act that routes back through Terrain, never a Brief fetch (SPEC-draft-pipeline §5.3).*");
  say();
  say("## Strands");
  say();
  for (const s of strands) {
    say(`### ${s.display_id} — ${s.slug}`);
    say();
    say(`- cite: \`${s.cite ?? "none recorded"}\``);
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
        say(`- journey cite: \`${s.journey.cite}\``);
      } else {
        say("- journey: PRESENT WITH NO SERVED CITE — abnormal; this Strand's Journey");
        say("  material cannot be cited at the pin, so it is not composable material");
        say("  (§6.1 MUST 2). Disclosed rather than dropped.");
      }
    }
    say();
  }
  say("## Thesis");
  say();
  say(thesis);
  say();
  say("*thesis — adopted at the thesis-determination gate and filled at mint by construction (§5.3 v9, kogaki#494); composed from the settled set, never invented (§3).*");
  say();
  for (const [heading, meaning] of FIELDS) {
    say(`## ${heading}`);
    say();
    say(`${SLOT}`);
    say();
    say(`*${meaning}*`);
    say();
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
// story 1.72 AC2): every content token below is derived from the record's
// own slugs — never fetched, never widened, never invented from outside the
// set. The candidates differ in which member LEADS, because that is a real
// composition fork the set itself carries; each is in plain register per
// SPEC-style-contract §4 (no unexplained term of art, one relation per
// sentence, a concrete subject acting) and carries its round-trip
// CONCESSION explicitly — a concession is part of the output, never a
// silent omission. Exported for the check's compose-from-settled-set case.
//
// PAIRED AT v11 (kogaki#518, story 1.76): each candidate also carries the
// slug its OWN Thesis derives — `deriveSlugCandidate` is the one derivation
// in this file, and it is applied here so the gate's every option is a
// (Thesis, slug) pair. Deriving it here rather than at adoption is what
// makes the second ask unproducible: the name is already on the table when
// the owner answers, so there is nothing left to ask afterwards.
export function composeThesisCandidates(strands) {
  const phrase = (s) => s.slug.replace(/-/g, " ");
  const names = strands.map(phrase);
  const candidates = [];
  if (strands.length === 1) {
    const p = names[0];
    candidates.push({
      id: "thesis-1",
      thesis: `The article makes one claim: ${p}. Every section exists to state that claim, show where it came from, and defend it.`,
      concession: `Concedes: the claim is argued on its own, without a second member to test it against.`,
    });
    candidates.push({
      id: "thesis-2",
      thesis: `The article tells the story behind one claim: ${p}. The reader follows how the claim was reached before being asked to accept it.`,
      concession: `Concedes: the claim's flat statement arrives late; a reader who wants the rule first must wait for the story to finish.`,
    });
  } else {
    const leads = strands.slice(0, 3);
    for (let i = 0; i < leads.length; i++) {
      const lead = phrase(leads[i]);
      const rest = names.filter((n) => n !== lead);
      candidates.push({
        id: `thesis-${i + 1}`,
        thesis: `The article's spine is this claim: ${lead}. The other settled members — ${rest.join("; ")} — each show one place where that claim does its work.`,
        concession: `Concedes: ${rest.join(" and ")} become supporting material rather than co-equal claims.`,
      });
    }
  }
  for (const c of candidates) c.slug = deriveSlugCandidate(c.thesis);
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

  const candidates = composeThesisCandidates(r.strands);
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
      ...candidates.map((c) => ({
        id: c.id,
        label: `${c.thesis} ${c.concession}`,
        rendering: [
          { label: "The name this Thesis gives the Brief", text: c.slug },
        ],
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
  const thesis = hit ? hit.thesis : answer;
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
  writeFileSync(out, composeBrief({
    slug, pin: state.pin, strands: state.strands, thesis: state.adopted_thesis,
  }));
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
