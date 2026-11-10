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
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { findInternalVocabulary } from "../assemble.mjs";
import { parseYaml } from "../yaml.mjs";
import {
  BRIEF_RECORD_FILE, briefRecordDeclaration, briefRecordText, briefSlotKeys,
  definedTermsRefusal, ownerGateDigest, snapshotBrief, validateOwnerAnswer,
} from "../compose.mjs";
import { resolveHeadlines, resolveStrandAddresses } from "../workflow/strands.mjs";
import { withApex } from "../compose/structure.mjs";
import {
  argString, briefComposePathDefault, defaultRunState, fail, readRunState, strandClaims,
} from "./run-state.mjs";

// The inputs the mint reads, and no others: an input it does not name is
// refused by name rather than ignored (kogaki#1571 retired the
// external-authority switch, and a caller still passing it learns so here).
const COMPOSE_BRIEF_INPUTS = Object.freeze(["slug", "strands", "thesis", "composePath", "definedTerms", "claims", "structure"]);

// One `strand_coverage` entry per claim the adopted structure leaves unreached:
// `{ strand, not_carried }`, the reason naming what would have reached it.
export function unreachedCoverage(structure) {
  return ((structure.unreached && structure.unreached.claims) || []).map((c) => ({
    strand: c.id,
    not_carried: (c.reached_by || []).length
      ? `The Thesis does not reach this Strand: it states ${c.reached_by.join(", ")}, which the adopted apex does not relate.`
      : "The Thesis does not reach this Strand: the structure reads no relation from it.",
  }));
}

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
  const { slug, strands, thesis, composePath, definedTerms = [], claims = [], structure = null } = input;
  if (typeof thesis !== "string" || thesis === "") {
    throw new Error("composeBrief: a Brief cannot be composed without an adopted thesis (the durable home and the entry point v9)");
  }
  // THE AUDIENCE'S PATH, RECORDED AT MINT (kogaki#1262, carrying kogaki#1251
  // item 1). `compose_path` names the Audience file the `compose_path` workflow
  // state reads the Persona from — so the Packet can read
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
  // THE ADOPTED STRUCTURE AND THE CLAIMS IT LEAVES (kogaki#1768): `structure` is
  // written beside the Thesis it is the apex of, and every Strand whose claim
  // the apex does not reach is recorded under `strand_coverage` as not carried,
  // with the reason. The Strands it reaches are added at adoption, with the
  // Legs that carry them. A mint with no structure writes neither.
  if (structure) {
    record.structure = structure;
    record.strand_coverage = unreachedCoverage(structure);
  } else record.strand_coverage = [];
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

// THE THESIS CANDIDATES ARE THE STRUCTURE'S CONNECTED COMPONENTS (kogaki#1768, owner decision 2026-11-10): one
// candidate per component `componentsOf` computes, its Thesis the apex the `apex` judgment wrote for it, and its
// claim ids the component's. The read-not-invented rule (story 1.72 AC2) holds through the apex's own refusal: it
// relates exactly the component's top-level relations, so the Thesis is the connection those relations make.
// `reaches` and `leaves` are the settled Strands' display ids the component is and is not read from; the gate renders
// both on the option.

// PROSE AT THE SURFACE, SCHEMA IN THE RECORD (the prose-at-the-surface rule
// v20, kogaki#566): the owner reads prose with no field label. `claim` is what
// the owner adopts and the mint records. Each candidate also carries the slug
// its own Thesis derives (v11, kogaki#518), so the gate's every option is a
// (Thesis, slug) pair.

// ONE TERMINAL PERIOD, AND NEVER TWO (the prose-at-the-surface rule,
// kogaki#566): trim the sentence's own ending and add one period back.
function sentence(text) {
  const t = String(text).trim().replace(/[.\s]+$/, "");
  if (t === "") return "";
  // A question mark or an exclamation is ALREADY terminal, so it keeps its own
  // punctuation rather than collecting a period behind it.
  return /[?!]$/.test(t) ? t : `${t}.`;
}

export function composeThesisCandidates(apexes, components, claims) {
  const ids = claims.map((c) => c.id);
  return components.map((k) => {
    const apex = apexes.find((a) => a.component === k.component);
    if (!apex) throw new Error(`composeThesisCandidates: the component ${k.component} carries no apex — \`validateApex\` refuses that before this runs`);
    const claim = sentence(apex.holds);
    return {
      id: `thesis-${k.component}`,
      claim,
      thesis: claim,
      component: k.component,
      apex: { id: apex.id, relates: [...apex.relates], holds: apex.holds, from: [] },
      claims: [...k.claims],
      reaches: ids.filter((id) => k.claims.includes(id)),
      leaves: ids.filter((id) => !k.claims.includes(id)),
      slug: deriveSlugCandidate(String(claim).split(/(?<=[.?!])\s+/)[0] || claim),
    };
  });
}

// Derive ONE slug from a Thesis (story 1.72 AC4; paired into the gate at
// v11, kogaki#518): the slug is thesis-derived and owner-decided, never
// machine identity — location and naming's no-machine-identity repair kept by this route
// exactly as v9 kept it by its own. THIS IS THE ONE DERIVATION: every
// candidate's paired slug comes from here.
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

// The directory Briefs are minted into: `--theses-dir` when given, else `theses`.
export function thesesDirOf(args) {
  return resolve(typeof args["theses-dir"] === "string" && args["theses-dir"] !== "" ? args["theses-dir"] : "theses");
}

// The address half of a cite, which is `<address>@<content hash>`.
function citeAddress(cite) {
  const s = String(cite ?? "");
  const at = s.lastIndexOf("@");
  return at > 0 ? s.slice(0, at) : s;
}

// THE HOME'S CLASSIFICATION (kogaki#1742): an existing `theses/<slug>` read
// against one candidate, by the Thesis it carries and by each Strand's cite at
// its content hash. A home whose Brief cannot be read carries no Thesis, so it
// is never the same Thesis and is never replaced.
export function classifyHome(home, { thesis, strands }) {
  if (!existsSync(home)) return { exists: false };
  let record = null;
  try { record = parseYaml(readFileSync(join(home, BRIEF_RECORD_FILE), "utf8"), home); }
  catch { record = null; }
  const theirThesis = record && typeof record.thesis === "string" ? record.thesis.trim() : null;
  const theirs = new Map((record && Array.isArray(record.strands) ? record.strands : [])
    .map((e) => [citeAddress(e && e.cite), String((e && e.cite) ?? "")]));
  const ours = new Map(strands.map((s) => [s.address || citeAddress(s.cite), String(s.cite ?? "")]));
  const moved = [...ours].filter(([a, c]) => theirs.has(a) && theirs.get(a) !== c).map(([a]) => a);
  const added = [...ours.keys()].filter((a) => !theirs.has(a));
  const removed = [...theirs.keys()].filter((a) => !ours.has(a));
  return {
    exists: true,
    same_thesis: theirThesis !== null && theirThesis === String(thesis ?? "").trim(),
    same_pins: moved.length === 0 && added.length === 0 && removed.length === 0,
    moved, added, removed,
    downstream: readdirSync(home).filter((f) => f !== BRIEF_RECORD_FILE).sort(),
  };
}

// The first of `<slug>-2`, `<slug>-3`, ... with no home and not already taken
// by this run (kogaki#1742).
export function freeSlug(thesesDir, slug, taken = new Set()) {
  for (let n = 2; ; n++) {
    const next = `${slug}-${n}`;
    if (!existsSync(join(thesesDir, next)) && !taken.has(next)) return next;
  }
}

// THE ARCHIVE MOVE (kogaki#1742): a home is moved whole to
// `<theses>/.archive/<slug>@<UTC>/` and never deleted. Returns the new path.
export function archiveHome(home) {
  const stamp = new Date().toISOString().replace(/\.\d+Z$/, "Z").replace(/:/g, "-");
  const archive = join(dirname(home), ".archive");
  mkdirSync(archive, { recursive: true });
  const name = `${basename(home)}@${stamp}`;
  let to = join(archive, name);
  for (let n = 2; existsSync(to); n++) to = join(archive, `${name}-${n}`);
  renameSync(home, to);
  return to;
}

// Each candidate's home, classified in place (kogaki#1742): a home holding a
// different Thesis gives the candidate the first free name, and a home holding
// the same Thesis is recorded for the `HOME_COLLISION` wait.
export function classifyHomes(candidates, strands, thesesDir) {
  const named = new Set();
  for (const c of candidates) {
    let home = classifyHome(join(thesesDir, c.slug), { thesis: c.claim, strands });
    if ((home.exists && !home.same_thesis) || named.has(c.slug)) {
      c.slug = freeSlug(thesesDir, c.slug, named);
      home = { exists: false };
    }
    named.add(c.slug);
    c.home = home.exists ? { ...home, path: join(thesesDir, c.slug) } : home;
  }
  return candidates;
}

// THE NAME RIDES THE LABEL (kogaki#567): one Thesis-gate option per candidate,
// its name set off as its own element after the Thesis and the Strands its
// component reaches and leaves (kogaki#1768).
export function thesisGateOptions(candidates) {
  return candidates.map((c) => ({ id: c.id,
    label: `${c.thesis} — reaches ${c.reaches.join(", ")}; leaves ${c.leaves.length ? c.leaves.join(", ") : "none"} — Brief: ${c.slug}` }));
}

// The thesis-determination gate's declaration, carried WITH the ask (story
// 1.72 AC3): the record-shape fields of specs/spec-proposal-contract/SPEC.md,
// the premise's negation as a first-class option routing back through
// Terrain, and the registered gate id `brief-thesis-adoption`. This is the
// only owner question before the mint (v11, kogaki#518): each option carries
// its Thesis, the Strands it reaches and leaves, and the bare name that Thesis
// derives. Composed by the `apex` state once the apexes stand (kogaki#1768).
export function thesisGate(candidates, strands) {
  return {
    gate_id: "brief-thesis-adoption",
    // THE PROVENANCE BLOCK (kogaki#1116, acceptance item 4): the SERVED
    // ADDRESSES THE RUN WAS STARTED WITH, paired with the within-document id
    // each one took — the catch point for a Model mis-resolution.
    where: "the settled Strand set, supplied on the command line and resolved against the "
      + `served enumeration: ${strands.map((s) => `${s.display_id} = ${s.address}`).join(", ")}`,
    why: "the machine's premise, rendered: the settled set's claims, read as one structure, connect into the parts below — each candidate is the Thesis one connected part argues, composed from that part's own claims and from nothing else (the read-not-invented rule), and carries the Strands it reaches and leaves and the name it would give the Brief",
    label: "Adopting a Thesis starts the Brief: the mint runs next and the Brief's durable home is created under the adopted name, carrying the adopted Thesis and the structure it is the apex of",
    options: [
      ...thesisGateOptions(candidates),
      {
        id: "back-to-terrain",
        label: "The settled set is what should change — go back through Terrain and re-settle; no Brief is started and nothing is written (a Brief never fetches)",
        negates_premise: true,
      },
    ],
  };
}

// The first candidate whose home holds the same Thesis and whose answer at the
// home-collision gate is not yet recorded, in candidate order (kogaki#1742).
export function pendingHomeCollision(state) {
  const answered = state.home_answers || {};
  return (state.thesis_candidates || [])
    .find((c) => c.home && c.home.exists && c.home.same_thesis && !(c.id in answered)) || null;
}

// ---- enter: resolve the set and write run state. ----
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
  const { headlines } = resolveHeadlines(r.strands);
  const runPath = typeof args["run-state"] === "string" && args["run-state"] !== ""
    ? args["run-state"] : defaultRunState();
  mkdirSync(dirname(runPath), { recursive: true });

  // NO THESIS CANDIDATE IS COMPOSED HERE (kogaki#1768): the candidates are the
  // connected components of the structure `read_structure` reads from the
  // claims recorded below, and the `apex` state composes them and the gate.
  const state = {
    stage: "entered",
    entered_addresses: entered,
    settled_set_via: "supplied on the command line",
    strands: r.strands,
    // WHAT WAS RESOLVED, AND FROM WHERE (kogaki#528). Recorded because the
    // structure is read FROM these claims (kogaki#1768), and a later reader
    // cannot otherwise tell served prose from an abnormal marker, nor which pin
    // the prose came from. `found` is false on a marker, and a marker is never
    // read as a claim (`strandClaims`).
    strand_renderings: Object.fromEntries(
      [...headlines].map(([slug, e]) => [slug, { headline: e.headline, cite: e.cite, found: e.found === true }])),
  };
  writeFileSync(runPath, JSON.stringify(state, null, 2) + "\n");
  console.log(JSON.stringify({ run_state: runPath, strands: r.strands.map((s) => `${s.display_id} = ${s.address}`) }, null, 2));
  console.log(`# entry resolved ${r.strands.length} member(s); nothing written under theses/ — pre-Thesis state is machine-local (the durable home and the entry point v9).`);
}

// ---------------------------------------------------------------------------
// `gate-thesis` IS DELETED, AND IT LEAVES NO STUB (kogaki#1108): under
// `src/brief-workflow.json` the executor composes the declaration at the
// `THESIS_ADOPTION` wait, `.claude/hooks/write-gate-capture.py` records the
// click and `.claude/hooks/advance-brief.py` re-enters the executor. The
// option set survives where it always was: `enter` writes `state.gate`, the
// GATE_WORK composer reads it, and `adopt` digests over the same option ids.

// THE ONE REFUSAL OF A FREE-TEXT ANSWER AT THE THESIS GATE (kogaki#1749), read
// by `adopt` and by the THESIS_ADOPTION wait so the two cannot drift.
export function thesisFreeTextRefusal(gateId) {
  return `the answer at the ${gateId} gate is typed text, not one of its options. The Thesis is chosen among the `
    + "composed candidates, or the settled set is changed through Terrain (back-to-terrain). Nothing was written; "
    + "the gate is offered again.";
}

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
      + "the row (kogaki#1108).");
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
  // THE GATE OFFERS NO FREE TEXT (kogaki#1749).
  if (verdict.option === undefined) fail(thesisFreeTextRefusal(gateId));
  const hit = (state.thesis_candidates || []).find((c) => c.id === verdict.option);
  if (!hit) {
    fail(`the captured answer names option ${JSON.stringify(verdict.option)}, which is offered by the gate but is not a Thesis candidate — `
      + "an option routed nowhere is not adopted (the durable home and the entry point). Nothing was written.");
  }
  // THE MINT RECORDS THE CLAIM, NEVER THE FRAME (the prose-at-the-surface rule
  // v20, kogaki#566). No fallback to `thesis`: every candidate carries a `claim`
  // by construction, so an absent claim refuses (PR #571 round 1) rather than
  // silently recording the framed sentence.
  if (typeof hit.claim !== "string" || hit.claim === "") {
    fail(`candidate ${hit.id} carries no claim — the mint records the adopted claim `
      + "(the prose-at-the-surface rule), and a run state whose candidates predate that field cannot be "
      + "adopted from. Re-run `enter` to recompose the gate.");
  }
  const thesis = hit.claim;
  // The slug half. An override is the owner's, taken as given AT THE GATE;
  // with none, the adopted candidate's OWN paired slug stands — the one the
  // owner read on the option they chose.
  let slug, via;
  if (verdict.slug !== undefined) {
    slug = verdict.slug;
    via = "owner-override";
  } else if (typeof hit.slug === "string" && hit.slug) {
    slug = hit.slug;
    via = "paired-with-adopted-candidate";
  } else {
    fail(`candidate ${hit.id} carries no paired name — \`enter\` derives one for every candidate it offers. Re-run \`enter\` to recompose the gate. Nothing was written.`);
  }
  if (!SLUG_RE.test(slug)) {
    fail(`slug ${JSON.stringify(slug)} — use lowercase words joined by hyphens; `
      + "the slug names a directory the owner enumerates.");
  }
  // THE ADOPTED STRUCTURE (kogaki#1768): the adopted component's apex appended to
  // `higher_order` and named `attains_thesis`, the other apexes discarded, and
  // `reach` and `unreached` derived from it.
  if (!state.structure || !hit.apex) {
    fail(`candidate ${hit.id} carries no apex, or the run state carries no structure — the \`apex\` state composes `
      + "both before the gate (kogaki#1768). Nothing was written.");
  }
  state.adopted_structure = withApex(state.structure, hit.apex, strandClaims(state));
  state.stage = "adopted";
  state.adopted_thesis = thesis;
  state.adopted_via = hit.id;
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

  const home = join(thesesDirOf(args), slug);
  // A HOME IS REPLACED ONLY ON THE OWNER'S `replace` (kogaki#1742), and only
  // here: the gate recorded the answer and this act moves the whole directory to
  // the archive in the same act that creates the new home. Any other existing
  // home refuses, naming the path that collided (PR #771 round 1).
  const replace = (state.thesis_candidates || [])
    .some((c) => c.slug === slug && (state.home_answers || {})[c.id] === "replace");
  if (existsSync(home) && !replace) {
    const same = classifyHome(home, { thesis: state.adopted_thesis, strands: state.strands || [] }).same_thesis;
    fail(`${home}/ already exists${same ? " and holds a Brief with this same Thesis" : ""}. The entry point creates and never `
      + `overwrites. Move that directory to ${join(dirname(home), ".archive")}/${slug}@<UTC time>/, then answer \"Retry the step\" `
      + "at the brief-state-retry gate this stop raises; the adopted Thesis is kept "
      + "(kogaki#1740, kogaki#1742).");
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
  if (existsSync(home)) {
    const archived = archiveHome(home);
    console.log(`The existing Brief at ${home}/ was moved to ${archived}/ (kogaki#1742).`);
  }
  mkdirSync(home, { recursive: true });
  const out = join(home, BRIEF_RECORD_FILE);
  const doc = composeBrief({
    slug, strands: state.strands, thesis: state.adopted_thesis,
    composePath: readerFile,
    definedTerms, claims: strandClaims(state).map((c) => c.claim),
    ...(state.adopted_structure ? { structure: state.adopted_structure } : {}),
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
  // that guard exists for. Every write renderer of every flow returns its path
  // for the same reason.
  return out;
}
