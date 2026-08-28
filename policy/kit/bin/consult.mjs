#!/usr/bin/env node
// The consult entry point — the query discipline as an affordance rather than
// prose (kogaki#66, story 1.21; specs/SPEC.md §4 "Consult evidence is sided").
//
// Usage: consult.mjs --consumer <name> --claim '<claim>' [--claim '<claim 2>']
//        --outcome <token> [--restate '<claim>' …] [--tool <tool>]
//        [--args '<json>' …]   one per --claim, in order; for a prescription
//                              whose tool is not `policy_lookup`
//        [--disposition <auto-resolved-FYI | escalated>]
//                              this consult was raised at a FORK GATE and this
//                              is what the gate did with it. Omit for every
//                              consult that was not a gate (kogaki#268)
//        [--gateway <path-to-dist/index.js>]
//
// A SIBLING of gateway-query.mjs, never a rewrite of it. Every consult this
// file performs is one `gateway-query.mjs --receipt` invocation: the lookup,
// the wire, and the receipt composition all stay there, so there is exactly
// one receipt composer in the kit and this file contains none of it. What this
// file adds is the discipline AROUND the call, which until now lived only in
// `.claude/skills/consult-first/SKILL.md` as sentences a session had to
// remember:
//
//   * a VERDICT-SHAPED question is corrected at the point of use (AC 2). The
//     seam is never asked for a verdict — the review supplies the claims, the
//     seam supplies the positions — and that rule was stated in the spec and
//     enforced nowhere, while the verdict phrasing ("were there any problems
//     with this PR?") is the natural one. The correction is an AFFORDANCE:
//     `--restate` re-submits the corrected claim in the same act.
//   * the TWO-FRAMINGS FLOOR is carried here rather than remembered (AC 3). A
//     non-discriminating outcome owes exactly one re-framing along a different
//     axis before it is recordable.
//   * the framing COUNT and every framing's `query:` line are emitted (AC 3,
//     AC 4), bounded at one re-framing — one axis, a fixed bound, never a
//     search loop.
//
// THE `outcome` TOKEN IS THE CALLER'S, AND THIS TOOL NEVER DERIVES IT.
// `deferred-slot: consult-outcome-token-assignment` is FILLED (owner decision
// 2026-08-06, specs/SPEC.md §4, kogaki#66): the operator supplies the token;
// the tool emits only what it observed as fact — the `request_id`, every
// `query:` line, and the framing count — and fails rather than guessing when
// none is supplied. So `--outcome` is required here exactly as it is on the
// transport, and the checks below only ever compare the caller's token against
// observed facts (the framing count) and against the hub's ratified triple.
// They refuse a disagreement; they never repair one, because repairing it
// would be this tool assigning the token by the back door.
//
// THE GATE HALF, AND WHY IT IS A SECOND KEY (kogaki#268). `outcome` above
// answers ONE question — did the served surface discriminate what was asked.
// A fork gate asks a different one — what did the gate DO with the answer —
// and its ratified vocabulary (`auto-resolved-FYI | escalated`) is not a member
// of the triple, so putting it in `outcome` is refused by the clause directly
// above and by `checks/check-consult-receipts.sh`'s ratified-triple rule. The
// two vocabularies are mutually exclusive in one slot, which is exactly why the
// resolution is ONE FIELD PER AXIS rather than a widened field:
//
//   "A consumer owns the SHAPE of its own record and NEVER the VALUES of a
//    field that exists to join across the boundary … a field read by one side
//    is that side's, a field read by both is the boundary's, and the
//    boundary's owner is the hub."
//   `topics/knowledge-architecture.md:50@4cc496b` (re-verified live 2026-08-11; the rule moved from :31, where different text now sits — kogaki#336)
//
// So `--disposition` fixes the KEY here and ADOPTS the values verbatim from the
// ratified amendment (spec-policy-fork-consultation §"Amended 2026-07-21
// (triage, #519)": a closed two-value set, no consumer-local extension).
//
// ASKING IS EMITTING, one layer out. The hub's own amendment states the reason:
// the server-side access log proves a consultation OCCURRED and cannot observe
// its DISPOSITION, so a demoted fork was mechanically uncountable. The gate
// produces no event anything can hook, so the act must leave its own record —
// written AT the gate, by the act, which is primary capture. It is not the
// forbidden second ledger: nothing here stores a derived count, and the digest
// is assembled on demand by grepping the receipts (the same amendment: "counts
// assembled on demand … never a stored second ledger").
//
// OPTIONAL, AND NEVER DERIVED. Most consults in this repository are not fork
// gates, and this tool has no reading of whether one was — the disposition is
// the caller's assertion on exactly the terms `--outcome` already is (the
// `consult-outcome-token-assignment` fill). Omitted means "not a gate consult";
// it never means "a gate whose disposition went unrecorded", and this tool
// cannot tell those apart, which is stated rather than papered over.
//
// WHO PERFORMS THE RE-FRAMING is an OPEN STORY QUESTION and the slot's fill did
// not settle it. This entry point PROMPTS: it refuses a non-discriminating
// outcome that carries fewer than two framings and names what the second one
// owes, rather than composing a second framing itself. The reason is the same
// fact/judgment split the fill applies — an axis-VARIED re-framing is a
// judgment about meaning (`checks/check-consult-receipts.sh` says so where it
// declines to detect rephrasing), and this tool holds no reading of the return.
// The other shape stays reachable without restructuring: a caller that DOES
// compose the second framing passes it as a second `--claim` and every check
// below is satisfied, so "perform" is today's two-`--claim` invocation and
// "prompt" is the one-`--claim` refusal. Whichever way the question is settled,
// the change is which of these two paths the SKILL recommends, not this file's
// shape.
//
// Exit codes:
//   0  the consult ran and the receipt was emitted (the transport's block)
//   2  malformed invocation — no consumer, no claim, no --outcome, a framing
//      that is not one line, more framings than the bound, or a token that
//      disagrees with an observed fact
//   3  VERDICT-SHAPED input — the fixed correction, re-submittable with
//      --restate. Its own code because it is not a typo: the caller asked a
//      well-formed question of the wrong kind.
//   4  the two-framings floor — exactly one re-framing along a different axis
//      is owed. Its own code for the same reason.
//   11 the gateway was unreachable — the transport's one line, plus the
//      DEGRADED PATH stated rather than left silent (AC 5)
//   12 the consult happened and the wire did not carry what a receipt asserts
//      (the transport's refusal, passed through unchanged)

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// The transport is this file's SIBLING IN THE KIT, which is a different thing
// from the gateway's own location: the gateway is machine-local configuration
// and is never resolved by adjacency (kogaki#9), and it is not resolved here at
// all — `--gateway` is forwarded untouched and the transport applies its own
// three-source order.
const TRANSPORT = fileURLToPath(new URL("./gateway-query.mjs", import.meta.url));

// The hub's ratified triple, quoted rather than coined — the same set
// `checks/check-consult-receipts.sh` admits. A bare `miss` is inadmissible: it
// collapses the distill-bug and query-defect causes the 2026-08-02 correction
// separated (topics/knowledge-architecture.md:59).
const UNCOVERED = /^uncovered-after-(\d+)-framings$/;
const RATIFIED = new Set(["discriminating", "covered-after-reframing"]);
// A miss is not recordable as `uncovered` until it has been re-asked along at
// least one ALTERNATIVE axis. Same constant, same value, as the checker's
// MIN_FRAMINGS — asserted there over emitted text, carried here at the call.
const MIN_FRAMINGS = 2;
// The gate half's closed set, ADOPTED rather than coined (kogaki#268) — the
// same set `checks/check-consult-receipts.sh` admits, and the same set
// writing-assistant's `scripts/fork-consult.py:89` has enforced since #519.
const DISPOSITIONS = new Set(["auto-resolved-FYI", "escalated"]);
// The predictable wrong values, separated from a typo because they route to a
// different answer rather than to a correction: these are gate CLASSIFICATIONS
// from the other taxonomy, and two of them name states that emit no receipt at
// all — so no value in a receipt can ever record them.
const GATE_CLASSIFICATIONS = {
  covered:
    "a coverage state, not a disposition — a covered fork is either demoted " +
    "(auto-resolved-FYI) or overridden and re-raised (escalated)",
  "consult-miss":
    "a fork nobody consulted emits NO receipt at all, so no field in a receipt " +
    "can record it — it is not substantiable from receipts under any schema",
  degraded:
    "a degraded consult emits NO receipt by design (policy_source unavailable:, " +
    "exit 11), so zero-degraded and zero-consults are indistinguishable",
};
// The axis value set, ADOPTED rather than coined (kogaki#602). The shape-only
// window (owner selection 2026-08-11 — "the price of not minting") is CLOSED:
// tim-nish/product-lab#172 ratified the set, so admitting free text here would
// no longer be declining to mint, it would be declining to read. A refusal
// over free text invites respelling; a refusal over a closed set ends there.
const RATIFIED_AXES = new Set(["subject", "conduct"]);
// The SEARCH FACETS (kogaki#640) — the hub's `act | artifact | decision`,
// COPIED and never minted here, under the same boundary-field rule the axis set
// above is quoted under. This is NOT the axis set and neither imports the other:
// `axis:` answers *what kind of thing is this consultation about*, `facet:`
// answers *how has this recall query been framed*. Two value sets, two jobs
// (product-lab@9b0ea254 topics/knowledge-architecture.md:103). Extension is the
// hub's named observer, never a kit edit.
const RATIFIED_FACETS = new Set(["act", "artifact", "decision"]);
// Bates' TERM TACTICS (kogaki#669), adopted as the CLASSIFIER for a re-framing
// and copied at their pin (product-lab@9b0ea254 topics/knowledge-architecture.md:101).
// The 29-tactic catalogue is deliberately NOT imported: these classify, they
// never schedule, so there is no checklist and no ordering anywhere below.
const RATIFIED_TACTICS = new Set(["SUPER", "SUB", "RELATE", "NEIGHBOR", "TRACE", "VARY"]);
// The LEXICAL CLASS that does not discharge a re-framing. §5.2 names
// VARY/FIX/REARRANGE/RESPELL/RESPACE, and `VARY` is the SOLE INTERSECTION with
// the adopted six — the other four are not writable `tactic:` values at all, so
// this set is deliberately a subset of RATIFIED_TACTICS and not a peer of it.
// The value set and the refusal set are different sets; conflating them would
// either admit four unratified tokens or refuse five ratified ones.
const LEXICAL_TACTICS = new Set(["VARY"]);
// One re-framing, and one only. AC 4's "a fixed bound, never a search loop":
// widening the read until something comes back is the failure mode the bounded
// question exists to prevent, and a bound that lives in prose is a bound a
// session negotiates with itself. A consult that genuinely needs more framings
// still has the transport, which takes as many `--args` as it is given; what it
// does not have is this entry point's discipline claiming to cover it.
const MAX_FRAMINGS = 2;

// The ONE fixed correction, quoted at its point of use. Fixed rather than
// generated: a correction that varies is one a reader learns to skim.
const CORRECTION =
  "the seam serves positions, not verdicts; state the claim the decision turns on";

// --- verdict shape ----------------------------------------------------------
//
// A READING OF THE INPUT, and deliberately the cheapest one that discriminates.
// Whether verdict-shape detection should be a deterministic pattern or a model
// judgment is UNRESOLVED — no served position on it was consulted, so the story
// records it as a question rather than a criterion. This is therefore a
// pattern, sited in one function with one caller so a model judgment can
// replace it without touching anything else, and tuned for PRECISION over
// recall: a false positive costs a `--restate`, a false negative costs a
// verdict-shaped question reaching the seam, and only the second is the failure
// AC 2 names. The fixtures below carry real framings from this repository's own
// merged receipts as the negative cases, because a detector that flags the
// questions the seam is actually asked is worse than none.
const INTERROGATIVE =
  /^(is|are|was|were|do|does|did|can|could|should|would|will|shall|has|have|had|am|any|anything|what|why|how|which|who|whether)\b/i;
// Verdict vocabulary: asking whether a thing is acceptable, correct, or
// problematic. NOT included, on purpose: "safe", "good", "best", "valid" and
// their neighbours, each of which appears in real served framings about
// defaults and trade-offs without asking for a verdict on anything.
const VERDICT =
  /\b(ok|okay|acceptable|unacceptable|problematic|correct|incorrect|wrong|fine|approved?|blocking|lgtm|good enough|looks? good|any (?:problems?|issues?|concerns?|mistakes?|bugs?)|problems?|issues?|concerns?|mistakes?|should (?:i|we|this|it|the)\b)\b/i;

// Both halves are required. A DECLARATIVE sentence is never verdict-shaped
// however much verdict vocabulary it carries — "the review found problems with
// the carrier" is a claim, which is exactly what AC 2 asks the caller for.
export function verdictShaped(text) {
  const t = String(text).trim();
  const asks = t.endsWith("?") || INTERROGATIVE.test(t);
  return asks && VERDICT.test(t);
}

// --- the discipline ---------------------------------------------------------
//
// One pure function over the invocation, returning either the framings to run
// or the refusal to print. Pure so the fixture pass below can fire every branch
// without a gateway, a child process, or a temp directory: every property this
// entry point adds is a property of the invocation, not of the wire.
export function discipline({ framings, restatements = [], outcome, disposition, argsList = [],
                             axisList = [], facetList = [], hitList = [], tacticList = [] }) {
  const refuse = (code, ...lines) => ({ ok: false, code, message: lines.join("\n") });

  if (!framings.length)
    return refuse(2, "usage: consult.mjs --consumer <name> --claim '<claim>' --outcome <token>");

  // `--args` is positional against `--claim`. A partial list would silently
  // send some framings as `policy_lookup` and some as the named tool, which is
  // the same shape of quiet mismatch this issue exists to close.
  if (argsList.length && argsList.length !== framings.length)
    return refuse(
      2,
      `--args given ${argsList.length} time(s) for ${framings.length} framing(s); ` +
        "`--args` is positional against `--claim` — one per framing, in order, " +
        "or none at all.",
    );
  for (const [i, a] of argsList.entries()) {
    try {
      JSON.parse(a);
    } catch {
      return refuse(2, `--args ${i + 1} is not valid JSON: ${a}`);
    }
  }

  // `--axis` is positional against `--claim`, exactly as `--args` is (kogaki
  // #601). A partial list would silently cover a prefix of the framings and
  // leave the rest axis-less without anyone having chosen that, so it is
  // refused with the count delta — one per framing, in order, or none at all.
  if (axisList.length && axisList.length !== framings.length)
    return refuse(
      2,
      `--axis given ${axisList.length} time(s) for ${framings.length} framing(s); ` +
        "`--axis` is positional against `--claim` — one per framing, in order, " +
        "or none at all.",
    );
  // The value set is the hub's and is STILL not minted here — it is QUOTED
  // (subject | conduct, ratified in tim-nish/product-lab#172), which closes the
  // shape-only window specs/SPEC.md §4 accepted as "the price of not minting"
  // (kogaki#602). `checks/check-consult-receipts.sh` stays shape-only on
  // purpose: its scope is the receipt RECORD, and this is the invocation.
  for (const [i, a] of axisList.entries()) {
    if (typeof a !== "string" || !a.trim())
      return refuse(2, `--axis ${i + 1} is empty; the \`axis:\` line carries a non-empty token`);
    if (a.includes("\n"))
      return refuse(2, `--axis ${i + 1} spans several lines; \`axis:\` is one line`);
    if (!RATIFIED_AXES.has(a))
      return refuse(
        2,
        `--axis ${i + 1} '${a}' is not the ratified axis set (subject | conduct, ` +
          "tim-nish/product-lab#172). The set is CLOSED and quoted, never minted " +
          "here: a refusal over free text invites respelling, so an unknown " +
          "token is refused with the set rather than passed through.",
      );
  }

  // --- the three per-query keys (kogaki#640, kogaki#669) ---------------------
  //
  // Each is positional against `--claim`, exactly as `--axis` and `--args` are,
  // and each refuses a PARTIAL list with the count delta for the same reason:
  // a prefix silently covers some framings and leaves the rest unmarked without
  // anyone having chosen that.
  //
  // THE OTHER CARRIER OF THESE RULES IS `checks/check-consult-receipts.sh`,
  // which recomputes every refusal below from the receipt's own lines and is
  // AUTHORITATIVE — it reaches receipts no writer mediated (hand-composed ones,
  // direct gateway-query.mjs calls, receipts edited into PR bodies) which this
  // file cannot see. This citation is not decoration: two carriers of one rule
  // that do not name each other drift silently, and the repair is a cite at the
  // point of the rule on BOTH sides (product-lab@9b0ea254 LESSONS.md:21). The
  // live specimen of not paying it is `axis:` itself — enforced here since
  // kogaki#602 and shape-only in the checker to this day (kogaki#673).
  for (const [flag, list] of [["facet", facetList], ["hit", hitList], ["tactic", tacticList]]) {
    if (list.length && list.length !== framings.length)
      return refuse(
        2,
        `--${flag} given ${list.length} time(s) for ${framings.length} framing(s); ` +
          `\`--${flag}\` is positional against \`--claim\` — one per framing, in ` +
          "order, or none at all.",
      );
    for (const [i, v] of list.entries()) {
      if (typeof v !== "string" || !v.trim())
        return refuse(2, `--${flag} ${i + 1} is empty; the \`${flag}:\` line carries a non-empty token`);
      if (v.includes("\n"))
        return refuse(2, `--${flag} ${i + 1} spans several lines; \`${flag}:\` is one line`);
    }
  }
  for (const [i, f] of facetList.entries())
    if (!RATIFIED_FACETS.has(f))
      return refuse(
        2,
        `--facet ${i + 1} '${f}' is not the ratified facet scheme ` +
          "(act | artifact | decision). The set is CLOSED and copied from the " +
          "hub, never minted here — extension is the hub's named observer, not " +
          "a kit edit. Note this is NOT the `--axis` set (subject | conduct): " +
          "two value sets, two jobs, neither importing the other.",
      );
  for (const [i, t] of tacticList.entries())
    if (!RATIFIED_TACTICS.has(t))
      return refuse(
        2,
        `--tactic ${i + 1} '${t}' is not the adopted six ` +
          "(SUPER | SUB | RELATE | NEIGHBOR | TRACE | VARY). The 29-tactic set " +
          "is deliberately NOT imported: the tactics classify a re-framing, they " +
          "never schedule one, so there is no checklist to work through.",
      );

  // `hit:` IS OWED WHEREVER `facet:` APPEARS, and `none` is a value that must be
  // TYPED. An omitted `hit:` and a `hit: none` are the same silence to a reader
  // and different silences to a check, and only the second distinguishes *this
  // facet was queried and returned nothing* from *nobody recorded what
  // happened* — which is the entire evidentiary content of a no-carrier-found
  // resolution. Without it the token asserts an absence nothing witnessed.
  if (facetList.length && !hitList.length)
    return refuse(
      2,
      "every framing carries a `--facet` and none carries a `--hit`: a query " +
        "line with a `facet:` and no `hit:` is malformed. Record what each " +
        "framing returned, and type `none` where it returned nothing — an " +
        "omitted `hit:` and a `hit: none` are the same silence to a reader and " +
        "different silences to a check.",
      "",
      "Re-submit with one --hit per framing, in the same order:",
      ...facetList.map((_, i) => `  --hit '<what framing ${i + 1} returned, or none>'`),
    );

  // AC 2 — corrected at the POINT OF USE, before the gateway is reached. A
  // verdict-shaped question that is forwarded and then apologised for has
  // already spent the consult.
  const flagged = framings.map((f, i) => [i, f]).filter(([, f]) => verdictShaped(f));
  const applied = [...framings];
  const spare = [...restatements];
  const unfixed = [];
  for (const [i, f] of flagged) {
    // `--restate` pairs with the flagged framings IN ORDER, so the correction
    // is discharged in the same act rather than in a second invocation the
    // caller has to remember to make.
    const r = spare.shift();
    if (r === undefined) {
      unfixed.push(f);
    } else if (verdictShaped(r)) {
      return refuse(
        3,
        `the restatement is verdict-shaped too: ${r}`,
        CORRECTION,
        "a restatement states what the seam should have a position ON; it does " +
          "not ask whether the thing is acceptable.",
      );
    } else {
      applied[i] = r;
    }
  }
  if (unfixed.length)
    return refuse(
      3,
      ...unfixed.map((f) => `verdict-shaped framing, not forwarded: ${f}`),
      CORRECTION,
      "",
      "Re-submit the corrected claim in the same act — add, in the order the " +
        "framings above appear:",
      ...unfixed.map(() => "  --restate '<the claim the decision turns on>'"),
    );
  if (spare.length)
    return refuse(2, `--restate given ${restatements.length} time(s) for ${flagged.length} verdict-shaped framing(s)`);

  // A framing that is not one line cannot become a `query:` line. Refused here
  // rather than at the transport's exit 12, so it costs no consult.
  for (const [i, f] of applied.entries())
    if (f.includes("\n")) return refuse(2, `framing ${i + 1} spans several lines; \`query:\` is one line`);

  // AC 4 — the bound.
  if (applied.length > MAX_FRAMINGS)
    return refuse(
      2,
      `${applied.length} framings; this entry point carries exactly one ` +
        `re-framing (a bound of ${MAX_FRAMINGS}), never a search loop`,
      "Widening until something comes back is the failure the bounded question " +
        "exists to prevent. If a consult genuinely owes more, run the transport " +
        "directly and say in the PR why the bound did not hold.",
    );

  // AC 3 — the token is the caller's and is never derived; what IS checked is
  // that it is admissible and that it does not contradict an observed fact.
  if (!outcome)
    return refuse(
      2,
      "refusing to consult without --outcome: the token is a READING of whether " +
        "the answer discriminated, and specs/SPEC.md §4 assigns it to the " +
        "OPERATOR (the `consult-outcome-token-assignment` fill, kogaki#66). " +
        "This tool emits what it observed — the framing count and every " +
        "`query:` line — and fails rather than guessing the rest.",
      "Supply one of: discriminating | covered-after-reframing | uncovered-after-N-framings",
    );
  const m = UNCOVERED.exec(outcome);
  if (!RATIFIED.has(outcome) && !m)
    return refuse(
      2,
      `outcome '${outcome}' is not the hub's ratified triple ` +
        "(discriminating | covered-after-reframing | uncovered-after-N-framings). " +
        "A bare `miss` is inadmissible: it collapses the distill-bug and " +
        "query-defect causes in the one field meant to tell them apart.",
    );

  // The floor, carried at the call. `discriminating` is the only token a single
  // framing can honestly wear; anything else says the first return did not
  // discriminate, and that is not recordable until it has been re-asked.
  if (outcome !== "discriminating" && applied.length < MIN_FRAMINGS)
    return refuse(
      4,
      `outcome '${outcome}' with ${applied.length} framing: a non-discriminating ` +
        `return owes exactly one re-framing along a DIFFERENT AXIS before it is ` +
        `recordable (the floor is ${MIN_FRAMINGS}).`,
      "",
      "Re-frame along another axis — not a rephrasing of the same question — and " +
        "re-submit with both framings, in the order you ran them:",
      "  --claim '<the first framing>' --claim '<the second, different axis>'",
      "",
      "Whether the axis really varied is a judgment no count can make, so this " +
        "tool asks for the second framing and the review lane reads it.",
    );
  // N NAMES THE QUERIES. The count is a transport fact; a token asserting a
  // different one is refused rather than rewritten — rewriting it would be this
  // tool assigning the token.
  if (m && Number(m[1]) !== applied.length)
    return refuse(
      2,
      `outcome claims ${m[1]} framing(s) and ${applied.length} were supplied; ` +
        "N names the queries. The count is this tool's to observe and the token " +
        "is yours to assign, so a disagreement is refused rather than repaired.",
    );

  // THE MECHANICAL HALF OF DID-THE-AXIS-VARY (kogaki#602). A non-discriminating
  // outcome claims the floor above was discharged by a re-framing along a
  // DIFFERENT axis. Identical tokens are provably the SAME axis — the one
  // negative this tool can read from facts the transport already holds (the
  // tokens the operator supplied, per framing) — so that claim is refused
  // rather than recorded. The refusal assigns no outcome token, composes no
  // re-framing, and judges no return; and the positive stays out of reach on
  // purpose: distinct tokens remain a judgment, not a proof, of varied axes.
  // Scoped exactly to the outcomes whose floor the pair claims to discharge:
  // a discriminating return claims no re-framing, and an axis-less invocation
  // keeps kogaki#601's optional-key behavior untouched.
  if (outcome !== "discriminating" && axisList.length >= MIN_FRAMINGS && new Set(axisList).size === 1) {
    const same = axisList[0];
    const owed = [...RATIFIED_AXES].find((a) => a !== same);
    return refuse(
      4,
      `outcome '${outcome}' with every framing on axis '${same}': identical ` +
        "tokens are provably the SAME axis, so the two-framings floor is not " +
        "discharged — a lexical rephrasing is not a re-framing. The second " +
        `framing owes the other axis: '${owed}'.`,
      "",
      "Re-submit the corrected pair in the same act:",
      `  --claim '<the first framing>' --axis ${same} --claim '<the second, ` +
        `re-framed along ${owed}>' --axis ${owed}`,
      "",
      "Distinct tokens remain a judgment, not a proof, of varied axes — this " +
        "tool refuses only the provable negative, and whether the axis really " +
        "varied stays the review lane's reading, never a count's.",
    );
  }

  // PLACED AFTER THE FLOOR, THE N-COUNT AND THE SAME-AXIS REFUSALS, AND THE
  // ORDER IS LOAD-BEARING: each of those is a refusal this path can still
  // usefully make about a negative-outcome invocation, and hoisting this one
  // above them would make all three unreachable for the entire token class
  // rather than merely changing what a well-formed invocation ends at.
  // specs/SPEC.md §4 fixes the coverage refusal ahead of MIN_FRAMINGS; that
  // clause bound the COVERAGE check, which no longer runs here at all, so it
  // does not govern this routing refusal.
  // THE NEGATIVE RESOLUTION DOES NOT FIT THIS ENTRY POINT, AND THE REFUSAL SAYS
  // SO RATHER THAN ASKING FOR SOMETHING UNREACHABLE (kogaki#640, owner
  // selection 2026-08-28).
  //
  // A `no-carrier-found` resolution — which in this grammar is the
  // `uncovered-after-N-framings` token, the open world's *unknown* — owes one
  // query per search facet across all three of act | artifact | decision. That
  // is three framings, and this entry point carries exactly one re-framing
  // (MAX_FRAMINGS = 2). The two obligations cannot both be met here, so the
  // token is not recordable through this path at any count.
  //
  // THE BOUND IS NOT LOOSENED TO ADMIT IT, and that is the ruling rather than
  // an oversight: "the remedy for a seam that keeps missing is never to loosen
  // the bound into exploration ... the remedy is a better lookup plus an
  // ESCALATION ROUTE" (product-lab@9b0ea254 topics/knowledge-architecture.md:148).
  // The bound is adopted deliberately for cost and discipline, and a per-outcome
  // exception is the first crack in a fixed-count discipline. So this refusal
  // routes to the transport, which the skill already names as the path for more
  // framings than this bound — an affordance, not a dead end.
  //
  // COVERAGE ITSELF IS NOT CHECKED HERE, because it cannot be satisfied here.
  // `checks/check-consult-receipts.sh` recomputes it from the receipt's own
  // `facet:` lines and is AUTHORITATIVE for it — the same split A1 fixes for
  // every rule in this pair, and the reason this file does not duplicate a
  // judgment it has no way to let the caller discharge.
  // THE TRIGGER IS A CONJUNCTION: a negative outcome AND at least one
  // `--facet`. The facet half is what separates a NO-CARRIER-FOUND resolution
  // from the ORDINARY MISS — "I asked twice along different axes and nothing
  // discriminated" — which is exactly what the ratified triple's third token is
  // for and which owes no facets at all. Without it this refusal would retire a
  // use the triple explicitly provides for. Presence is the only marker
  // available: the receipt carries no field saying *this resolution is a
  // no-carrier-found*, and minting one is a hub act, not a kit edit.
  if (m && facetList.length)
    return refuse(
      4,
      `outcome '${outcome}' is a NEGATIVE RESOLUTION, and this entry point ` +
        "cannot carry one. It owes a query per search facet across all three of " +
        `act | artifact | decision — three framings — and this path carries ` +
        `exactly one re-framing (a bound of ${MAX_FRAMINGS}).`,
      "",
      "The bound is not widened for it. Compose the act through the transport, " +
        "which takes as many framings as it is given:",
      "",
      "  policy/kit/bin/gateway-query.mjs --consumer <name> --tool policy_lookup \\",
      "    --args '{\"question\":\"<act framing>\"}'      --question '<act framing>'      --facet act      --hit '<or none>' \\",
      "    --args '{\"question\":\"<artifact framing>\"}' --question '<artifact framing>' --facet artifact --hit '<or none>' \\",
      "    --args '{\"question\":\"<decision framing>\"}' --question '<decision framing>' --facet decision --hit '<or none>' \\",
      "    --receipt --outcome uncovered-after-3-framings",
      "",
      "Coverage is counted over FACETS TOUCHED, never over wordings — two " +
        "queries on one facet are one framing, because facets are orthogonal. " +
        "`checks/check-consult-receipts.sh` recomputes that coverage from the " +
        "receipt and is what enforces it; going around this entry point costs " +
        "you its three rules, so say in the PR why the bound did not hold.",
    );

  // THE TACTIC CLASSIFIER (kogaki#669). A re-framing owes its tactic, and the
  // lexical class does not discharge the floor. Both clauses are scoped exactly
  // as the same-axis refusal above is — to the outcomes whose floor a re-framing
  // claims to discharge — so a `discriminating` return is untouched.
  //
  // `tactic:` IS OWED BY FRAMINGS 2..N AND NOT BY FRAMING ONE: framing one is
  // not a revision of anything, so it has no tactic to name. Requiring it on the
  // re-framings is what makes the discount below unskippable — a refusal a
  // caller can escape by writing less is not a refusal.
  if (outcome !== "discriminating" && tacticList.length) {
    for (let i = 1; i < applied.length; i++) {
      if (!tacticList[i])
        return refuse(
          4,
          `outcome '${outcome}' with no \`--tactic\` on framing ${i + 1}: a ` +
            "re-framing owes the name of the tactic that produced it, so " +
            '"is this a different axis?" is answered by naming the tactic ' +
            "rather than argued in prose.",
          "",
          `Supply one of: ${[...RATIFIED_TACTICS].join(" | ")} — framing one owes ` +
            "none, being a revision of nothing.",
        );
    }
    // THE LEXICAL-CLASS DISCOUNT. A re-framing whose tactic is in the lexical
    // class is a rewording, not a different axis, so it does not count toward
    // the floor. `VARY` is the SOLE member of that class inside the adopted six.
    const lexical = [];
    for (let i = 1; i < applied.length; i++)
      if (LEXICAL_TACTICS.has(tacticList[i])) lexical.push(i + 1);
    if (lexical.length && applied.length - lexical.length < MIN_FRAMINGS) {
      const discharging = [...RATIFIED_TACTICS].filter((t) => !LEXICAL_TACTICS.has(t));
      return refuse(
        4,
        `outcome '${outcome}' with framing(s) ${lexical.join(", ")} on tactic ` +
          "'VARY': the lexical class does not discharge the re-framing floor. " +
          `Discounting it leaves ${applied.length - lexical.length} discharging ` +
          `framing(s) against a floor of ${MIN_FRAMINGS}.`,
        "",
        "VARY is lexical variation — a rewording of the same question, which is " +
          "the one revision kind §5.2 names as not discharging. Re-frame along a " +
          `different axis and name the tactic that did it: ${discharging.join(" | ")}.`,
        "",
        "The tactics classify a re-framing; they never schedule one, so this is " +
          "not a checklist to work through.",
      );
    }
  }

  // THE SECOND AXIS (kogaki#268). Checked last because it is independent of
  // every clause above: the gate half neither constrains nor is constrained by
  // the framing count, and a consult that fails the floor has no disposition to
  // record yet. Absent is the common and correct case.
  if (disposition !== undefined && !DISPOSITIONS.has(disposition)) {
    const why = GATE_CLASSIFICATIONS[disposition];
    return refuse(
      2,
      `disposition '${disposition}' is not the ratified gate set ` +
        "(auto-resolved-FYI | escalated)." +
        (why ? `\n'${disposition}' is ${why}.` : ""),
      "The set is CLOSED with no consumer-local extension " +
        '(spec-policy-fork-consultation §"Amended 2026-07-21 (triage, #519)"): ' +
        "this repository owns the shape of its own record and never the values " +
        "of a field read across the boundary. If the consult was not raised at " +
        "a fork gate, omit --disposition entirely.",
    );
  }

  return { ok: true, framings: applied, disposition, axes: axisList,
           facets: facetList, hits: hitList, tactics: tacticList };
}

// One `--args` per framing, in order — the transport's own contract, and the
// only place framings become a wire call.
//
// EVERY framing also carries its own `--question`, and it is the `--claim`
// itself (kogaki#160 finding 4). The claim IS the question here, which is
// precisely why this entry point never produced the defect and the transport
// did: `policy_lookup` embeds the question in its arguments, so nothing had to
// be carried alongside. Emitting `--question` anyway is not ceremony — it is
// what lets this entry point mediate a prescription whose tool is NOT
// `policy_lookup` (the consultation map's entry 1 prescribes `gloss_index`),
// which until now it could not do at all.
//
// `--args` is OPTIONAL and positional against `--claim`. When given, framing
// i's arguments are `argsList[i]` as typed and its question is claim i; when
// absent, the historical `policy_lookup` shape is unchanged. So a `gloss_index`
// consult states the shard it read AND the question it was reading for, and
// the receipt records the second.
export function transportArgv({ consumer, framings, outcome, disposition, act, tool, gateway, argsList = [],
                                axisList = [], facetList = [], hitList = [], tacticList = [], ownerRender = false }) {
  const argv = ["--consumer", consumer];
  for (const [i, f] of framings.entries()) {
    argv.push("--tool", tool ?? "policy_lookup");
    argv.push("--args", argsList[i] ?? JSON.stringify({ question: f }));
    argv.push("--question", f);
    // The axis rides WITH its framing, in the same per-framing group as
    // `--question`, so the transport's positional read pairs it with the call
    // it names (kogaki#601). Emitted only when supplied: an all-omitted
    // invocation's argv is byte-for-byte what it was before, which is what
    // keeps every existing fixture over this function exact.
    if (axisList[i] !== undefined) argv.push("--axis", axisList[i]);
    // The three per-query keys ride in the same group, on the same principle:
    // each is emitted only when supplied, so an invocation carrying none of
    // them produces the argv it always produced and every existing fixture
    // over this function keeps its exact expected string.
    if (facetList[i] !== undefined) argv.push("--facet", facetList[i]);
    if (hitList[i] !== undefined) argv.push("--hit", hitList[i]);
    if (tacticList[i] !== undefined) argv.push("--tactic", tacticList[i]);
  }
  argv.push("--receipt", "--outcome", outcome);
  // Forwarded only when the caller supplied it, so a non-gate consult's argv is
  // byte-for-byte what it was before kogaki#268 and every existing fixture over
  // this function keeps its exact expected string.
  if (disposition !== undefined) argv.push("--disposition", disposition);
  // THE CONSUMING ACT'S CARRIER (kogaki#608, PR #609 round-1 finding 5).
  // Forwarded only when supplied, on the same principle as `--disposition`:
  // the field was admitted with no producer on the sanctioned path, and every
  // consultation through this entry point wrote `act: null` — a nullable
  // field and an unreachable one being different facts. Argv is byte-for-byte
  // unchanged when absent, so every existing fixture keeps its exact string.
  if (act !== undefined) argv.push("--act", act);
  // §8.2 (kogaki#320). Forwarded only when asked, on the same principle as
  // `--disposition` above: every existing fixture over this function keeps its
  // exact expected string, and a consult that does not want the owner register
  // produces the argv it always produced.
  if (ownerRender) argv.push("--owner-render");
  if (gateway) argv.push("--gateway", gateway);
  return argv;
}

// AC 5 — the degraded path, STATED. The example is fenced because quoting the
// grammar is a mention rather than an emission (kogaki#41), and inside the
// fence the marker is UNINDENTED above line one: that placement is correctness,
// not style — `checks/check-consult-receipts.sh` recognises only
// request_id/outcome/query as continuation keys, so an unrecognised INDENTED
// key above them ends the continuation scan and the receipt parses as a
// field-less v1 line and passes with every field silently dropped.
export function degradedStatement(why) {
  return [
    "",
    "the degraded path (this entry point could not mediate the consult):",
    "  1. consult through the MCP tools directly — mcp__tsurezure__policy_lookup",
    "     and its neighbours in policy/CAPABILITIES.md — with the same bounded",
    "     claim and the same one re-framing.",
    "  2. compose the receipt BY HAND and MARK it. The marker is unindented, on",
    "     its own line above line one, so the exception rate stays a count:",
    "",
    "```",
    `consult-receipt: hand-composed — ${why}`,
    "consulted: <repo>@<sha> <file:line[,line][, file:line…]>",
    "  request_id: <the id the tool returned>",
    "  outcome: <discriminating | covered-after-reframing | uncovered-after-N-framings>",
    "  disposition: <auto-resolved-FYI | escalated>   ← ONLY if this was a fork gate; omit otherwise",
    "  query: <framing 1, verbatim>",
    "  query: <framing 2, verbatim>",
    "```",
    "",
    "The discipline degrades to prose; it does not degrade to nothing.",
  ].join("\n");
}

// --- fixture pass -----------------------------------------------------------
// Discrimination evidence for everything above, over the invocation alone —
// same standard and same siting as the transport's own `--self-test`. What it
// deliberately does NOT cover: the wire (the transport owns it and carries its
// own fixtures) and the receipt block (this file composes none).
function selfTest() {
  const run = (inv) => discipline({ framings: [], ...inv });
  const cases = [
    // AC 2 — the correction, at the point of use.
    ["a verdict-shaped question is refused with code 3, not forwarded",
     () => { const r = run({ framings: ["were there any problems with this PR?"], outcome: "discriminating" });
             return r.ok === false && r.code === 3; }],
    ["the correction is the one fixed sentence",
     () => run({ framings: ["is this acceptable?"], outcome: "discriminating" }).message.includes(CORRECTION)],
    ["the refusal names the framing it refused",
     () => run({ framings: ["were there any problems with this PR?"], outcome: "discriminating" })
             .message.includes("verdict-shaped framing, not forwarded: were there any problems with this PR?")],
    ["the correction is an affordance: --restate re-submits in the same act",
     () => { const r = run({ framings: ["were there any problems with this PR?"],
                             restatements: ["a review report must name the head it reviewed"],
                             outcome: "discriminating" });
             return r.ok === true && r.framings[0] === "a review report must name the head it reviewed"; }],
    ["a restatement that is itself verdict-shaped is corrected again",
     () => { const r = run({ framings: ["is this ok?"], restatements: ["is that correct?"], outcome: "discriminating" });
             return r.ok === false && r.code === 3 && r.message.includes("verdict-shaped too"); }],
    ["--restate without a flagged framing is a malformed invocation, not a silent drop",
     () => run({ framings: ["the carrier belongs at the render layer"], restatements: ["x"],
                 outcome: "discriminating" }).code === 2],
    // Precision: real framings from this repository's own merged receipts, and
    // the skill's own occasion phrasings, must all reach the seam.
    ...[["which direction should an unrecognized class default to?", "merged receipt, PR #101"],
        ["fail toward the safe option or the cheap one?", "merged receipt, PR #101"],
        ["Should a marker distinguishing an automated record path from its hand-composed fallback live inside the record grammar or as a separate adjacent token?", "merged receipt, PR #101"],
        ["When an exception path stays admissible alongside an automated one, what must the exception carry so its rate is measurable rather than inferred?", "merged receipt, PR #101"],
        ["does a recorded position bear on this?", "the skill's own occasion"],
        ["the review found problems with the carrier", "a declarative claim carrying verdict vocabulary"],
       ].map(([q, why]) => [`not verdict-shaped (${why}): ${q.slice(0, 48)}…`, () => verdictShaped(q) === false]),
    ["verdict-shaped: is this correct?", () => verdictShaped("is this correct?") === true],
    ["verdict-shaped: any issues with the approach?", () => verdictShaped("any issues with the approach?") === true],
    // AC 3 — the token is the caller's; the floor and the count are the tool's.
    ["no --outcome fails rather than guessing, and names the operator",
     () => { const r = run({ framings: ["a claim"] });
             return r.code === 2 && r.message.includes("OPERATOR") && r.message.includes("fails rather than guessing"); }],
    // §8.2 SEPARABILITY (kogaki#320, story 1.50 AC2). The two registers must be
    // independently selectable, or §8's whole split — audit register apart from
    // owner register — collapses back into the one register it was filed about.
    // Both directions, because a forwarder that always forwarded would satisfy
    // the first assertion alone.
    ["--owner-render is forwarded when asked",
     () => transportArgv({ consumer: "k", framings: ["q"], outcome: "discriminating", ownerRender: true })
             .includes("--owner-render")],
    ["--owner-render does NOT leak into a consult that did not ask for it",
     () => !transportArgv({ consumer: "k", framings: ["q"], outcome: "discriminating" })
             .includes("--owner-render")],
    ["the receipt is still requested independently of the owner register",
     () => transportArgv({ consumer: "k", framings: ["q"], outcome: "discriminating" }).includes("--receipt")
        && transportArgv({ consumer: "k", framings: ["q"], outcome: "discriminating", ownerRender: true }).includes("--receipt")],
    ["a non-discriminating outcome with one framing prompts for exactly one re-framing",
     () => { const r = run({ framings: ["a claim"], outcome: "covered-after-reframing" });
             return r.code === 4 && r.message.includes("DIFFERENT AXIS"); }],
    ["uncovered with one framing hits the same floor",
     () => run({ framings: ["a claim"], outcome: "uncovered-after-1-framings" }).code === 4],
    ["two framings satisfy the floor",
     () => run({ framings: ["axis one", "axis two"], outcome: "covered-after-reframing" }).ok === true],
    ["one framing is enough when the return discriminated",
     () => run({ framings: ["a claim"], outcome: "discriminating" }).ok === true],
    ["N disagreeing with the observed count is refused, never repaired",
     () => { const r = run({ framings: ["axis one", "axis two"], outcome: "uncovered-after-7-framings" });
             return r.code === 2 && r.message.includes("N names the queries"); }],
    ["N agreeing with the observed count passes",
     () => run({ framings: ["axis one", "axis two"], outcome: "uncovered-after-2-framings" }).ok === true],
    ["a bare `miss` is inadmissible",
     () => run({ framings: ["a", "b"], outcome: "miss" }).message.includes("ratified triple")],
    // AC 4 — every framing is its own query line, under a fixed bound.
    ["one --args and one --question per framing, in order, with --receipt and the caller's token",
     () => transportArgv({ consumer: "kogaki", framings: ["first", "second"], outcome: "uncovered-after-2-framings" })
             .join(" ") === '--consumer kogaki --tool policy_lookup --args {"question":"first"} --question first ' +
             '--tool policy_lookup --args {"question":"second"} --question second --receipt --outcome uncovered-after-2-framings'],
    // --- kogaki#160 finding 4 ------------------------------------------------
    // The seam gap named: entry 1's prescription is `gloss_index`, which takes
    // a shard address and no question, so before this the entry point could not
    // mediate it and the transport recorded the address in the question field.
    ["a non-policy_lookup prescription sends the tool's args AND the claim as the question",
     () => transportArgv({ consumer: "kogaki", framings: ["does a served line discriminate check admission?"],
             argsList: ['{"tag":"lessons/testing"}'], tool: "gloss_index", outcome: "discriminating" })
             .join(" ") === '--consumer kogaki --tool gloss_index --args {"tag":"lessons/testing"} ' +
             '--question does a served line discriminate check admission? --receipt --outcome discriminating'],
    ["--args positional against --claim: a partial list is refused, never half-applied",
     () => { const r = run({ framings: ["a", "b"], argsList: ['{"tag":"x"}'], outcome: "covered-after-reframing" });
             return r.code === 2 && r.message.includes("positional against `--claim`"); }],
    ["--args that is not JSON is refused before a consult is spent",
     () => run({ framings: ["a"], argsList: ["not json"], outcome: "discriminating" }).code === 2],
    ["no --args at all leaves the policy_lookup shape untouched",
     () => transportArgv({ consumer: "k", framings: ["q"], outcome: "discriminating" })
             .includes("--question")],
    ["--gateway is forwarded untouched (the location stays machine-local)",
     () => transportArgv({ consumer: "k", framings: ["q"], outcome: "discriminating", gateway: "/g.js" })
             .slice(-2).join(" ") === "--gateway /g.js"],
    ["three framings exceed the bound — one re-framing, never a search loop",
     () => { const r = run({ framings: ["a", "b", "c"], outcome: "uncovered-after-3-framings" });
             return r.code === 2 && r.message.includes("never a search loop"); }],
    ["a multi-line framing is refused before a consult is spent",
     () => run({ framings: ["line one\nline two"], outcome: "discriminating" }).code === 2],
    // --- kogaki#601: the axis rides per framing, positionally --------------
    ["--axis positional against --claim: a full list is accepted and carried",
     () => { const r = run({ framings: ["a", "b"], axisList: ["subject", "conduct"],
                             outcome: "covered-after-reframing" });
             return r.ok === true && r.axes.join("|") === "subject|conduct"; }],
    ["--axis positional against --claim: a partial list is refused with the count delta, never a covered prefix",
     () => { const r = run({ framings: ["a", "b"], axisList: ["subject"],
                             outcome: "covered-after-reframing" });
             return r.code === 2 && r.message.includes("--axis given 1 time(s) for 2 framing(s)"); }],
    ["an empty --axis token is refused as shape — the value set stays unminted",
     () => run({ framings: ["a"], axisList: ["  "], outcome: "discriminating" }).code === 2],
    // --- kogaki#602: the ratified set, quoted; the same-token floor ---------
    ["an unknown axis token is refused NAMING the ratified set — the shape-only window is closed",
     () => { const r = run({ framings: ["a"], axisList: ["zzz-not-ratified"], outcome: "discriminating" });
             return r.code === 2 && r.message.includes("subject | conduct") &&
               r.message.includes("product-lab#172"); }],
    ["a same-token pair at covered-after-reframing is refused with the floor's own code",
     () => { const r = run({ framings: ["a", "b"], axisList: ["subject", "subject"],
                             outcome: "covered-after-reframing" });
             return r.ok === false && r.code === 4 && r.message.includes("provably the SAME axis"); }],
    ["a same-token pair at uncovered-after-2-framings hits the same refusal",
     () => { const r = run({ framings: ["a", "b"], axisList: ["conduct", "conduct"],
                             outcome: "uncovered-after-2-framings" });
             return r.code === 4 && r.message.includes("provably the SAME axis"); }],
    ["the refusal names which axis the second framing owes",
     () => run({ framings: ["a", "b"], axisList: ["subject", "subject"],
                 outcome: "covered-after-reframing" })
             .message.includes("The second framing owes the other axis: 'conduct'")],
    ["the refusal is an affordance: the corrected --claim/--axis pair re-submits in the same act",
     () => run({ framings: ["a", "b"], axisList: ["conduct", "conduct"],
                 outcome: "covered-after-reframing" })
             .message.includes("--claim '<the first framing>' --axis conduct")],
    ["the refusal states that distinct tokens remain a judgment, not a proof, of varied axes",
     () => run({ framings: ["a", "b"], axisList: ["subject", "subject"],
                 outcome: "uncovered-after-2-framings" })
             .message.includes("Distinct tokens remain a judgment, not a proof, of varied axes")],
    ["a distinct-token pair is accepted — the judgment half stays human",
     () => run({ framings: ["a", "b"], axisList: ["subject", "conduct"],
                 outcome: "covered-after-reframing" }).ok === true],
    // --- the three per-query keys (kogaki#640, kogaki#669) -------------------
    ["--facet is positional: a partial list is refused with the count delta",
     () => { const r = run({ framings: ["a", "b"], facetList: ["act"], outcome: "covered-after-reframing" });
             return r.code === 2 && r.message.includes("--facet given 1 time(s) for 2 framing(s)"); }],
    ["--hit is positional too, same refusal shape",
     () => run({ framings: ["a", "b"], hitList: ["x"], outcome: "covered-after-reframing" })
             .message.includes("--hit given 1 time(s) for 2 framing(s)")],
    ["--tactic is positional too, same refusal shape",
     () => run({ framings: ["a", "b"], tacticList: ["SUPER"], outcome: "covered-after-reframing" })
             .message.includes("--tactic given 1 time(s) for 2 framing(s)")],
    ["an out-of-set facet is refused naming the ratified scheme",
     () => { const r = run({ framings: ["a", "b"], facetList: ["act", "person"],
                             hitList: ["x", "y"], outcome: "covered-after-reframing" });
             return r.code === 2 && r.message.includes("act | artifact | decision"); }],
    ["the facet refusal says it is NOT the axis set — two value sets, two jobs",
     () => run({ framings: ["a", "b"], facetList: ["subject", "conduct"],
                 hitList: ["x", "y"], outcome: "covered-after-reframing" })
             .message.includes("NOT the `--axis` set")],
    ["an out-of-set tactic is refused naming the adopted six",
     () => { const r = run({ framings: ["a", "b"], tacticList: ["SUPER", "RESPELL"],
                             outcome: "covered-after-reframing" });
             return r.code === 2 && r.message.includes("SUPER | SUB | RELATE | NEIGHBOR | TRACE | VARY"); }],
    ["FIX/REARRANGE/RESPELL/RESPACE are NOT writable values — the refusal set is not the value set",
     () => ["FIX", "REARRANGE", "RESPELL", "RESPACE"].every((t) =>
             run({ framings: ["a", "b"], tacticList: ["SUPER", t], outcome: "covered-after-reframing" }).code === 2)],
    ["the tactic refusal states the 29-tactic set is not imported as a procedure",
     () => run({ framings: ["a", "b"], tacticList: ["SUPER", "BOGUS"], outcome: "covered-after-reframing" })
             .message.includes("never schedule")],
    ["a facet with no hit anywhere is malformed, and the refusal says `none` must be TYPED",
     () => { const r = run({ framings: ["a", "b"], facetList: ["act", "artifact"],
                             outcome: "covered-after-reframing" });
             return r.code === 2 && r.message.includes("type `none`"); }],
    ["a facet with its hit is accepted",
     () => run({ framings: ["a", "b"], facetList: ["act", "artifact"], hitList: ["found x", "none"],
                 axisList: ["subject", "conduct"], outcome: "covered-after-reframing" }).ok === true],
    ["a re-framing owes its tactic; framing one owes none",
     () => { const r = run({ framings: ["a", "b"], tacticList: ["SUPER", ""],
                             outcome: "covered-after-reframing" });
             return r.code === 2 || r.code === 4; }],
    ["framing one needs no tactic when the re-framings carry theirs",
     () => run({ framings: ["a", "b"], tacticList: ["SUPER", "RELATE"],
                 axisList: ["subject", "conduct"], outcome: "covered-after-reframing" }).ok === true],
    ["VARY on the re-framing does not discharge the floor — the lexical class is refused",
     () => { const r = run({ framings: ["a", "b"], tacticList: ["SUPER", "VARY"],
                             axisList: ["subject", "conduct"], outcome: "covered-after-reframing" });
             return r.code === 4 && r.message.includes("lexical class does not discharge"); }],
    ["the VARY refusal names the discharging tactics and never a checklist",
     () => { const r = run({ framings: ["a", "b"], tacticList: ["SUPER", "VARY"],
                             outcome: "covered-after-reframing" });
             return r.message.includes("SUPER | SUB | RELATE | NEIGHBOR | TRACE")
                    && r.message.includes("never schedule"); }],
    ["a discriminating return is untouched by the tactic rules — no floor was claimed",
     () => run({ framings: ["a", "b"], tacticList: ["SUPER", "VARY"], outcome: "discriminating" }).ok === true],
    ["a negative resolution CLAIMING THE FACET SCHEME is routed to the transport",
     () => { const r = run({ framings: ["a", "b"], facetList: ["act", "artifact"],
                             hitList: ["none", "none"], outcome: "uncovered-after-2-framings" });
             return r.code === 4 && r.message.includes("gateway-query.mjs")
                    && r.message.includes("act | artifact | decision"); }],
    ["the route refusal does not loosen the bound — it names the bound it is keeping",
     () => run({ framings: ["a", "b"], facetList: ["act", "artifact"], hitList: ["none", "none"],
                 outcome: "uncovered-after-2-framings" })
             .message.includes("The bound is not widened for it")],
    // THE ORDINARY MISS SURVIVES, and this is the case the conjunction exists
    // for: "I asked twice along different axes and nothing discriminated" is
    // what the triple's third token is FOR, owes no facets, and must stay
    // recordable on the primary path. A trigger keyed on the outcome alone
    // would have retired it.
    ["an ordinary miss with no facets is NOT routed away — it passes",
     () => run({ framings: ["a", "b"], axisList: ["subject", "conduct"],
                 outcome: "uncovered-after-2-framings" }).ok === true],
    ["N still names the queries for an ordinary miss",
     () => run({ framings: ["a", "b"], outcome: "uncovered-after-7-framings" })
             .message.includes("N names the queries")],
    ["three framings still hit the bound before anything else",
     () => run({ framings: ["a", "b", "c"], outcome: "uncovered-after-3-framings" }).code === 2],
    ["the three keys ride in their framing's own group in the transport argv",
     () => transportArgv({ consumer: "k", framings: ["first", "second"], outcome: "covered-after-reframing",
                           facetList: ["act", "artifact"], hitList: ["hx", "none"],
                           tacticList: ["SUPER", "RELATE"] }).join(" ")
             .includes("--question first --facet act --hit hx --tactic SUPER")],
    ["omitting all three leaves the transport argv byte-for-byte unchanged",
     () => transportArgv({ consumer: "k", framings: ["q"], outcome: "discriminating" }).join(" ")
             === transportArgv({ consumer: "k", framings: ["q"], outcome: "discriminating",
                                 facetList: [], hitList: [], tacticList: [] }).join(" ")],
    ["a discriminating return with same tokens is accepted — no floor was claimed",
     () => run({ framings: ["a", "b"], axisList: ["subject", "subject"],
                 outcome: "discriminating" }).ok === true],
    ["an axis-less two-framing invocation keeps #601's optional-key behavior",
     () => { const r = run({ framings: ["a", "b"], outcome: "covered-after-reframing" });
             return r.ok === true && r.axes.length === 0; }],
    ["each --axis rides in its framing's own group, after that framing's --question",
     () => transportArgv({ consumer: "k", framings: ["first", "second"],
             axisList: ["subject", "conduct"], outcome: "uncovered-after-2-framings" })
             .join(" ") === '--consumer k --tool policy_lookup --args {"question":"first"} ' +
             "--question first --axis subject " +
             '--tool policy_lookup --args {"question":"second"} --question second --axis conduct ' +
             "--receipt --outcome uncovered-after-2-framings"],
    ["no --axis at all leaves the transport argv byte-for-byte unchanged",
     () => transportArgv({ consumer: "k", framings: ["q"], outcome: "discriminating" })
             .join(" ") === '--consumer k --tool policy_lookup --args {"question":"q"} ' +
             "--question q --receipt --outcome discriminating"],
    // kogaki#608, PR #609 round-1 finding 5: the effectiveness row's `act`
    // field gains its producer on the sanctioned path.
    ["--act is forwarded to the transport when supplied",
     () => transportArgv({ consumer: "k", framings: ["q"], outcome: "discriminating", act: "kogaki#608" })
             .join(" ").endsWith("--receipt --outcome discriminating --act kogaki#608")],
    ["no --act leaves the transport argv byte-for-byte unchanged",
     () => !transportArgv({ consumer: "k", framings: ["q"], outcome: "discriminating" })
             .includes("--act")],
    // AC 5 — the degraded statement, in the shape the checker actually accepts.
    ["the degraded statement's marker is unindented and above line one",
     () => { const l = degradedStatement("the gateway was unreachable").split("\n");
             const i = l.findIndex((x) => x.startsWith("consult-receipt: hand-composed"));
             return i > 0 && l[i - 1] === "```" && l[i + 1].startsWith("consulted: "); }],
    ["the degraded example's continuation lines are indented under line one",
     () => degradedStatement("x").split("\n").filter((l) => /^ {2}(request_id|outcome|query):/.test(l)).length === 4],
    ["the degraded example is fenced — quoting the grammar is a mention",
     () => degradedStatement("x").split("\n").filter((l) => l === "```").length === 2],
    // --- kogaki#268: the gate disposition, a second and OPTIONAL axis --------
    ["the ratified two-value gate set is accepted and carried back to the caller",
     () => { const a = run({ framings: ["a claim"], outcome: "discriminating", disposition: "auto-resolved-FYI" });
             const b = run({ framings: ["a claim"], outcome: "discriminating", disposition: "escalated" });
             return a.ok === true && a.disposition === "auto-resolved-FYI" &&
               b.ok === true && b.disposition === "escalated"; }],
    ["OMITTED is the common case and stays valid — most consults are not fork gates",
     () => { const r = run({ framings: ["a claim"], outcome: "discriminating" });
             return r.ok === true && r.disposition === undefined; }],
    ["a locally coined disposition is refused — the set is CLOSED and adopted, never extended",
     () => { const r = run({ framings: ["a claim"], outcome: "discriminating", disposition: "overridden" });
             return r.code === 2 && r.message.includes("no consumer-local extension"); }],
    // The two states no schema can carry, refused with their REASON rather than
    // with the set — a caller reaching for them is asking for something the
    // evidence cannot supply, not mistyping a token.
    ["`consult-miss` is refused BY REASON: an unconsulted fork emits no receipt at all",
     () => { const r = run({ framings: ["a claim"], outcome: "discriminating", disposition: "consult-miss" });
             return r.code === 2 && r.message.includes("emits NO receipt at all"); }],
    ["`degraded` is refused BY REASON: a degraded consult emits no receipt by design",
     () => { const r = run({ framings: ["a claim"], outcome: "discriminating", disposition: "degraded" });
             return r.code === 2 && r.message.includes("indistinguishable"); }],
    ["`covered` is refused as a coverage state rather than a disposition",
     () => run({ framings: ["a"], outcome: "discriminating", disposition: "covered" })
             .message.includes("not a disposition")],
    ["a query-level token in the disposition slot is refused — one field per axis",
     () => run({ framings: ["a"], outcome: "discriminating", disposition: "discriminating" }).code === 2],
    ["a disposition token in the OUTCOME slot still fails the ratified triple",
     () => run({ framings: ["a"], outcome: "auto-resolved-FYI" }).message.includes("ratified triple")],
    ["the disposition rides to the transport as its own flag, after --outcome",
     () => transportArgv({ consumer: "k", framings: ["q"], outcome: "discriminating",
             disposition: "escalated" }).slice(-5).join(" ") ===
             "--receipt --outcome discriminating --disposition escalated"],
    ["a non-gate consult's transport argv is byte-for-byte what it was before #268",
     () => transportArgv({ consumer: "k", framings: ["q"], outcome: "discriminating" })
             .join(" ") === '--consumer k --tool policy_lookup --args {"question":"q"} ' +
             "--question q --receipt --outcome discriminating"],
    ["the degraded template carries the disposition line as OPTIONAL, inside the fence",
     () => { const s = degradedStatement("x");
             return s.includes("  disposition: <auto-resolved-FYI | escalated>") &&
               s.includes("ONLY if this was a fork gate"); }],
    ["the degraded statement routes to the MCP tools and says the discipline survives",
     () => { const s = degradedStatement("x");
             return s.includes("mcp__tsurezure__policy_lookup") &&
               s.includes("The discipline degrades to prose; it does not degrade to nothing."); }],
  ];
  const failures = cases.filter(([, f]) => f() !== true).map(([n]) => n);
  if (failures.length) {
    console.log("FAIL consult entry-point fixtures:");
    for (const f of failures) console.log(`  ${f}`);
    process.exit(1);
  }
  console.log(`fixture pass: ${cases.length}/${cases.length} entry-point cases ` +
    "(the verdict correction and its --restate affordance; six real framings " +
    "that must still reach the seam; the two-framings floor; the token refused " +
    "rather than derived; the bound; the claim forwarded as the call's own " +
    "--question, including for a non-policy_lookup prescription; the degraded " +
    "statement's unindented marker; the gate disposition adopted as a closed " +
    "set on its own axis, omittable, with consult-miss and degraded refused by " +
    "reason rather than by set; the per-query axis paired positionally with " +
    "its claim, partial lists refused, tokens held to the ratified set, and " +
    "same-token pairs refused at the floor with the judgment half left human)");
  process.exit(0);
}

// --- invocation -------------------------------------------------------------

const argv = process.argv.slice(2);
function opt(name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}
function flagPresent(name) {
  return process.argv.slice(2).includes(`--${name}`);
}
function opts(name) {
  const out = [];
  for (let i = 0; i < argv.length; i++) if (argv[i] === `--${name}`) out.push(argv[i + 1]);
  return out;
}

if (argv.includes("--self-test")) selfTest();

const consumer = opt("consumer");
if (!consumer) {
  console.error("usage: consult.mjs --consumer <name> --claim '<claim>' --outcome <token>");
  process.exit(2);
}
const outcome = opt("outcome");
const disposition = opt("disposition");
const verdict = discipline({
  framings: opts("claim"),
  restatements: opts("restate"),
  outcome,
  disposition,
  argsList: opts("args"),
  axisList: opts("axis"),
  facetList: opts("facet"),
  hitList: opts("hit"),
  tacticList: opts("tactic"),
});
if (!verdict.ok) {
  console.error(verdict.message);
  process.exit(verdict.code);
}

// The framing COUNT is a transport fact and is emitted as one, on its own
// UNINDENTED line ahead of the transport's output — never inside the receipt
// block, whose grammar SPEC §4 fixes and which this file does not compose. The
// token beside it is the caller's, restated here so the two are read together.
console.log(
  `framings: ${verdict.framings.length} (observed) — outcome: ${outcome} (supplied by the caller)` +
    // Restated on the same line and on the same terms: observed fact, then the
    // caller's two readings. A non-gate consult says so rather than going
    // silent, because an unlabelled absence is the ambiguity kogaki#268 names.
    (disposition === undefined
      ? " — disposition: none (not a fork-gate consult)"
      : ` — disposition: ${disposition} (supplied by the caller)`),
);

// stdio is INHERITED rather than captured: the transport's own output is the
// caller's, and re-printing a captured copy would put this file back in the
// business of composing what the transport emitted (and would reintroduce the
// pipe-truncation class gateway-query.mjs's writeThenExit exists to close).
const child = spawnSync(
  process.execPath,
  [TRANSPORT, ...transportArgv({
    consumer,
    framings: verdict.framings,
    outcome,
    disposition: verdict.disposition,
    act: opt("act"),
    tool: opt("tool"),
    gateway: opt("gateway"),
    argsList: opts("args"),
    axisList: verdict.axes,
    facetList: verdict.facets,
    hitList: verdict.hits,
    tacticList: verdict.tactics,
    ownerRender: flagPresent("owner-render"),
  })],
  { stdio: "inherit" },
);

const code = child.status ?? 1;
// AC 5. Exit 11 is the transport's degrade — it has already printed its one
// `policy_source unavailable:` line, and that line alone leaves the session
// with no route. The route is stated here rather than left to memory. The one-
// line contract belongs to the transport and is untouched: this is a different
// tool with a different promise.
if (code === 11 || child.error) {
  if (child.error) console.log(`policy_source unavailable: ${child.error.message}`);
  console.log(degradedStatement(
    child.error ? "the consult entry point could not run the transport" : "the gateway was unreachable",
  ));
  process.exit(11);
}
process.exit(code);
