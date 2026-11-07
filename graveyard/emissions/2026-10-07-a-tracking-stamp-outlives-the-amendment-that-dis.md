<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1259 --session on 2026-10-08: the Issue was admitted and its pass started, the split was built and its checks passed, and the first commit was refused because #1259 still carries the tracking comment the worker lane posted when it split the Issue into three children on 2026-10-07. The owner's amendment that same day discharged the children and moved the work back onto #1259.

## The learning

Once an Issue carries a 'tracking: structural-carrier' comment, it can never license a commit again, even after an owner's amendment hands the work back to it. Admission still admits it, and a session pass can still be elected and started on it, so the refusal only arrives at the first commit, after the work is done. Nothing retires the stamp, and the licence check reads any stamp at all, without comparing the body it was written against. So when an amendment discharges an Issue's children and puts the work back on the parent, retiring the parent's tracking state is part of the amendment. Check for the stamp before starting a pass on an Issue whose children were discharged.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
