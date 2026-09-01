---
id: reg-0200
status: pending
observed_at_pr: 756
observed_at_head: 51b440e
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #756 round 2 — kogaki#741 widened the Full Report identity from a
triple to a quadruple, and the vocabulary keeps outliving its repairs. Round 1
named two stale `triple` sites; both were fixed; round 2 found three more, two
of them in the very file the fix commit edited:

- `terrain/terrain.mjs` — "It stays exported and valid in the identity triple —
  §12.1's uniform arity is untouched and `(pin, query, none)` is still
  constructible", in the same file whose identity header now reads "The identity
  QUADRUPLE (§12.1, widened from the triple at kogaki#741)";
- `checks/check-terrain-composition.sh` — "a triple according to its own
  content, so a request could not form the key";
- `checks/check-terrain-composition.sh` — "The identity is the triple and the
  composed inputs are NOT in it".

The registered `terrain-retired-vocabulary` check carries eleven terms and
`triple` is not among them, so nothing mechanical catches these and each round
finds the residue one site further out. That is the value of this record: the
**accretion**, not these three sites. This is the fourth consecutive round in
the #741 chain to find surviving instances of a term its own supersession
retired — the earlier three are recorded at reg-0197.

**Why this is here rather than on an issue.** ACCRETION-CLASS: its only claim
on durability is counting toward a threshold someone else reads, which
`specs/spec-issue-creation/SPEC.md` routes to the register rather than to a
`schedules:` filing. The act that would discharge it is admitting `triple` to
`terrain-retired-vocabulary`'s term list — cheap, and owed a decision rather
than an assumption, since a retired term admitted while a legitimate historical
use remains turns the check red on quotation.
