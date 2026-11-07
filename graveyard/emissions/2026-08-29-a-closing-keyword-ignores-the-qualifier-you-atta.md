<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-29
repo: Kogaki
grain: lesson

## Trigger — what happened

A tracking record carried three items: a piece of work that could be built locally, a small defect in that work, and a design defect in a shared tool belonging to a different repository. The first two were built and submitted. The submission's description named the record with a closing keyword and a qualifier — closes the implementation half — intending to close only what had shipped. The hosting platform's parser reads the keyword and the record number and discards everything around them, so on merge the entire record closed, taking the untouched third item with it. Nothing warned, because from the platform's side the operation succeeded exactly as instructed. The third item was the only one with no local carrier and no way to produce evidence of its own completion, which is precisely why it was the one that vanished.

## The learning

Closing keywords are parsed, not read. Whatever qualifier a human attaches to one — a half, a subset, a phase — exists only for human readers, and the machine performs the unqualified act. This is a small mechanical fact with a large consequence, because it interacts badly with a very common carrier shape: a record that accumulates several obligations of unequal buildability. Those records are not sloppy; they are often the right structure, especially when one obligation is a decision or lives in a system this repository cannot change. But their items discharge at wildly different rates, and the buildable one always finishes first — so an unqualified close fires exactly when the hardest and least-tractable item is still outstanding. The selection is adversarial rather than random: the item that survives to be lost is reliably the one nobody could produce evidence for, which is the same item nobody would notice missing. Two operating rules follow. First, never attach a closing keyword to a record you do not intend to close entirely; where a submission discharges part of a record, reference it without the keyword and close the record by hand when its last item lands. The manual close costs seconds and is the only form that can be conditional on a judgment. Second, when a multi-item record does close, check what it was still carrying before accepting the close as correct — and if something was carried away, reopen and say plainly what discharged and what did not, rather than filing a fresh record. Reopening preserves the discussion the item accumulated; a new record starts it again at zero and reads as new work rather than as a survivor. The generalizable half: any automation that fires on a pattern inside prose will ignore the prose, so a qualifier written in the same sentence as a trigger is not a constraint on the trigger. It is a note to a reader who is not the one acting.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
