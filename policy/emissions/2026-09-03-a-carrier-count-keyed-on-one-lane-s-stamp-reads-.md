<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

The vitality read on kogaki#772 returned '0 runs (0 issue stamp(s) + 0 PR-space touch(es): none)' at the start of a ship-cycle run. The day before, that same issue had absorbed an entire triage sitting: it was classified, a cross-repo handoff was filed to claude-toolkit#735, a pointer-pair comment was written on its thread, and it was parked with three declarations. The count was not wrong by its own definition — it counts policy-verdict stamps and PR-space touches, and the sitting had produced neither, because the verdict comment had never been posted and the work left the repository. It was the reading that was wrong: a carrier that had been worked to a terminal state read as untouched.

## The learning

A count that stands in for 'how much has been done to this carrier' must be keyed on the acts that DO things to it, not on one lane's record of having done them. Keying on a stamp measures the lane that writes the stamp; every other lane's acts — a park, a handoff, a classification, a disposition rewrite — pass through invisibly, and the carrier reads pristine at exactly the moment it has been most heavily handled. This is the same proxy-binding defect twice repaired: first when the count measured issue-side stamps and missed PR-space sittings, now when it measures stamps-plus-PR-touches and misses the triage lane's own writes. The repair that keeps being applied is widening the enumeration of counted surfaces, and the tell that it is the wrong repair is that each widening is discovered by a specimen the previous one could not have caught. The counted set should be derived from the acts the tool itself performs — every typed subcommand that mutates the carrier or its ledger entry already knows it touched it — rather than from an enumeration of the places touches are known to leave marks, because an enumeration of surfaces leaves surface N+1 uncounted by default, and an uncounted surface makes the gate read healthy rather than read nothing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
