// workflow/judge/limits — the coherence labels, the subdivision limits and the limits put in front
// of the judge. Cut from src/workflow/judge.mjs along its headed sections (kogaki#1800); the design
// and its rulings are stated at the entry and in the Issues each block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { REPORT_FORMAT, fail, readJson } from "../run-record.mjs";

// THE COHERENCE LABEL: three affinity labels plus the residual `other`, ordered by
// decreasing coherence (kogaki#683 disposition 5; kogaki#738).
// `other` is the residual: named separately (`RESIDUAL_LABEL`), carries no affinity claim, has
// no `limits.subgroup_member_cap` row, and is bounded by its own limit — never unlimited.
// Consumer-owned values: rendered only on kogaki's own display, so no hub ratification.
// consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 topics/knowledge-architecture.md:198
export const COHERENCE_LABELS = Object.freeze(["tight", "related", "loose", "other"]);
// The residual, named once so no reader has to infer it from the cap map's gaps.
export const RESIDUAL_LABEL = "other";

// The JUDGMENT half of subdivision, shared by the co-tag display and `subdivide`: one
// implementation, so the two surfaces cannot drift (kogaki#133).
// THE LIMITS' ONE READER (kogaki#738 ruling 5, owner amendment 2's five config keys).
// Every number the subdivision judgment enforces is read here and restated nowhere else.
// A missing block FAILS LOUDLY; a permissive default would silently delete a ruled refusal.
const CAPPED_LABELS = Object.freeze(COHERENCE_LABELS.filter((l) => l !== RESIDUAL_LABEL));

export function subdivisionLimits(grammarPath = REPORT_FORMAT) {
  const limits = readJson(grammarPath).limits;
  const caps = limits && limits.subgroup_member_cap;
  // EVERY PER-LABEL KEY IS CHECKED, not just the map's presence (PR #758 round
  // 1). `subgroupMemberCap` returns `null` for a label the map does not carry,
  // and `null` is this design's own signal for "deliberately uncapped, this is
  // the residual" — so an owner who deletes or misspells `loose` in an
  // owner-editable file would silently lose that cap's refusal, with an
  // oversized `loose` SubGroup admitted and indistinguishable from the residual
  // convention. That is the outcome this function's header says it exists to
  // prevent, reachable through the one case the block-level guard missed.
  const missingCap = caps ? CAPPED_LABELS.filter(
    (l) => !Object.prototype.hasOwnProperty.call(caps, l)) : [];
  if (!caps || missingCap.length || limits.min_subgroup_members === undefined
      || limits.max_residual_members === undefined) {
    fail("report-format.json declares no complete `limits` block, so semantic subdivision's subdivision limits "
      + "cannot be read (kogaki#738 ruling 5, owner amendment 2)"
      + (missingCap.length ? `; no cap is declared for ${missingCap.join(", ")}` : "")
      + ". The five keys live in the carrier by design — a cap for each of "
      + `${CAPPED_LABELS.join(", ")}, plus \`min_subgroup_members\` and \`max_residual_members\` — `
      + "and defaulting any of them here would silently delete a ruled refusal.");
  }
  return {
    caps,
    min: Number(limits.min_subgroup_members),
    maxResidual: Number(limits.max_residual_members),
  };
}

// THE LIMITS PUT IN FRONT OF THE JUDGE (kogaki#1068 item 2).
// Every number comes through `subdivisionLimits`, so the ask and the refusal cannot disagree.
// Keyed on the state's own declaration; an unknown block name is refused BY NAME.
const JUDGE_LIMIT_BLOCKS = Object.freeze({
  subdivision: () => {
    const { caps, min, maxResidual } = subdivisionLimits();
    return {
      _read_from: "report-format.json `limits` — the one carrier of these numbers; this ask restates none of them",
      subgroup_member_cap: Object.fromEntries(CAPPED_LABELS.map((l) => [l, Number(caps[l])])),
      min_subgroup_members: min,
      max_residual_members: maxResidual,
      every_member_must_be_placed: `Every member of this group appears in exactly one SubGroup. The engine composes no catch-all: a member you place nowhere is a refusal naming it, and a member you place twice is a refusal too. Place a member you find no affinity for in a SubGroup labelled ${JSON.stringify(RESIDUAL_LABEL)} — the residual, which carries no minimum and is bounded at ${maxResidual}.`,
      _refused: `A SubGroup over its label's cap, or under ${min} members, is refused and you are asked again with the refusal. A SubGroup holding the WHOLE group is exempt from the minimum alone — it divided nothing — and never from the cap.`,
    };
  },
});

export function judgeLimits(st) {
  if (st.limits === undefined || st.limits === null) return null;
  const key = String(st.limits);
  if (!Object.prototype.hasOwnProperty.call(JUDGE_LIMIT_BLOCKS, key)) {
    fail(`${st.id}: the workflow table declares \`limits\` ${JSON.stringify(key)}, which names no known limit `
      + `block. The known one is ${Object.keys(JUDGE_LIMIT_BLOCKS).map((k) => JSON.stringify(k)).join(", ")}; `
      + "a second is added by ruling rather than by spelling, exactly as `record_example`'s directives are "
      + "(kogaki#1068).");
  }
  return JUDGE_LIMIT_BLOCKS[key]();
}
