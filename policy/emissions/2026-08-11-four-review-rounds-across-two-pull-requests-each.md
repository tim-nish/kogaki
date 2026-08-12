<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

Four review rounds across two pull requests, each repairing the previous one's leftovers. Each fix satisfied its finding and stopped one clause short: the sweep for a corrected assertion ran over the three phrasings the finding named and missed a fourth worded differently; a marker narrowed once needed narrowing again; a re-wrap left a word orphaned; and the paragraph written to correct an altered quotation altered a quotation. The relevant lesson had already been emitted twice in the same session and quoted in one of the commit messages.

## The learning

A finding is an instance of a property, and fixing the instance is not fixing the property — but the instance is what you are holding, it is concrete, and the fix for it is verifiable, so it feels like completion. That is why the pattern survives being written down: knowing the rule does not change which of the two is in front of you at the moment you act. What changes it is converting the finding into a predicate before touching anything — not 'this line is wrong' but 'this document asserts X' — and then searching for the predicate. If you cannot state the predicate, you are about to fix an instance. Expect this most strongly on the repair of a repair, where the surrounding text is already known-good and attention narrows to the named spot.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
