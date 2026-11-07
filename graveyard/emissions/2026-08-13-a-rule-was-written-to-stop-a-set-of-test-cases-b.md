<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

A rule was written to stop a set of test cases being chosen freely by the author, on the explicit ground that a freely chosen set can only name failures already imagined. The rule replaced that free choice with a requirement to derive the set from the change under test — and specified the derivation as a list of three kinds of thing to look for. A later sitting found seven cases that each caught a real defect, and none of them was any of the three kinds. The rule had swapped an enumeration chosen by the author for an enumeration chosen by the rule: narrower, no longer the author's, and still an enumeration whose unlisted members are silently absent. Its own reopen condition, written as an omission test over those same three kinds, could not have detected this.

## The learning

A rule that replaces free choice with derivation has to state the derivation as a CONSTRUCTION over the thing being derived from, not as a catalogue of what to look for in it. The catalogue is the tempting form because it is easier to check and reads as more precise, and it reproduces the exact failure the rule was written against one level down — the unlisted member is silently absent and the record still reads complete. The tell is that the rule can quote an argument against enumeration in one paragraph and enumerate in the next without anyone noticing, because the enumeration now belongs to the rule rather than to the person it constrains. Two consequences. Prefer wording that forces the reader to ask what changed rather than to scan for members, and accept that it is less checkable — the extra work is the work the rule wanted. And write the reopen condition over the same construction, never over the catalogue: a trigger phrased as an omission from a list inherits the list's blind spot, so the one failure it most needs to catch — the list being too short — is the one failure it cannot see.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
