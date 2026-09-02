<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-26
repo: Kogaki
grain: lesson

## Trigger — what happened

A change closed a class where check records asserted capabilities nothing had ever exercised. It shipped with mutation evidence — and every mutation exercised the new central validator, while the four per-member guards the change also added each carried a record asserting the guard fires, with nothing having made one fire. A reviewer named it as the defect class one level up, inside the diff that closes it. A second instance in the same change: a member's record asserted an unconditional property that the change had just made conditional, and the record was amended in the same pass that broke it.

## The learning

A change that closes an unbacked-claim defect writes new claims as part of closing it, and those arrive with the same backing as the ones being retired — none. The evidence effort goes where the change's INTEREST is, which is the new mechanism, and the per-instance guards read as applications of an already-verified thing rather than as separate assertions needing separate evidence. They are not: the central validator and each member's own comparison are different code, failing differently, and a mutation of one says nothing about the other.

The pattern that produces it is the record and the code being edited in one pass by one author with one belief. Where the belief is right the record is right by coincidence, and where the change has just falsified an existing claim, the amendment is written by the person least positioned to notice, in the same motion that broke it. Nothing in a passing suite distinguishes the two — a green run confirms the positive direction of every guard that RAN and is silent on every guard that never did.

Two practical consequences. Count the assertions a change ADDS to records and require a mutation per assertion rather than per mechanism, because assertions are what the defect class is about and mechanisms are what the author is thinking about. And when a change touches a file whose record states a property, re-derive that property from the changed file rather than from the record — the exception being inherited is the author's own memory of what the file did five minutes ago.

The generalization worth keeping: a remedy is not exempt from the class it remedies, and it is likelier than average to instantiate it, because the remedy's author is concentrating on the class as something OTHER code does.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
