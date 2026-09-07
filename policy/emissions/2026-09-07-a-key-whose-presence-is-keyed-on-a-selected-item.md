<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#997 added a per-verdict model id to a join record. A row renders one SELECTED pair's verdict, reason and span, while its decided_by field describes ALL the row's pairs. Keying the new key's PRESENCE on the selected pair produced, on a hybrid item, a row saying decided_by model and carrying no model key -- the exact shape the absence was documented to rule out. A reviewer found it; the self-test did not, because its cases asserted the key over harness-decided rows and over the per-pair list, never over a model-decided row.

## The learning

When a record gains a field, decide whether it describes the SET the row summarises or the MEMBER the row renders, and key its presence on the same thing its neighbours are keyed on -- a row usually carries both kinds of field at once, and the two agree on every homogeneous row, so the contradiction is invisible until a hybrid one appears. Where the new field is the member's and a sibling is the set's, presence should follow the SET (it answers 'was this kind of thing involved at all', which is what the sibling already says) and the VALUE carries the member's, null included, because null honestly says 'not for the line you are reading' while an absent key says 'never happened'. The test that would have caught it is the one nobody writes: the cases naturally reach for the pure cases at each end -- all-mechanical and all-judged -- and a hybrid row is neither, so an assertion set can be complete over both poles and empty over the only shape where the fields disagree.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
