<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

A report generator took a file that decided its rendered content and put it in neither the artifact's identity nor its recorded-input digest set. A rerun with that file edited matched the stored identity, found no recorded-input difference, replayed the stored section, and printed that the rerun was idempotent.

## The learning

Where a system separates the inputs that IDENTIFY an artifact from the inputs it merely RECORDS a digest of, an input in neither set is invisible to both instruments at once — and the two silences compose into a false positive rather than a gap. The identity does not separate it, so the rerun matches; the recorded-input comparison does not name it, so the rerun is pronounced idempotent. The result is not a missing check but a REPORT OF SUCCESS: the rerun renders content the invocation did not supply and says it did not have to. That is why the repair is written as a closed disjunction over inputs — every input that decides the rendered artifact is keyed or recorded, and never neither — rather than as a list of members that may simply be incomplete. A list invites a reader to check whether an input is present; a disjunction makes an absent one a stated violation. The cost of the omission is also worth separating from its cause: a later change that made every judged row cite an id from the unrecorded file raised what a stale replay could assert without creating the defect, so the instrument that finds this class is a reading of the input set against the rule, never an incident.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
