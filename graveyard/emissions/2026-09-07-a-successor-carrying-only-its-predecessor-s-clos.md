<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run on #855 found that its issue pair could not be closed in the order the owner named: #855's only remedy was closing its predecessor #801, while the chain coupling closes a predecessor only after its whole-remainder descendant closes. Each issue's discharge evidence was the other's close.

## The learning

When a successor issue is minted to carry the whole remainder of a predecessor, and that remainder is nothing more than closing the predecessor itself, the two issues stop being a chain and become a cycle. The coupling that makes chains safe -- a predecessor stays open until its descendant closes, so nothing is orphaned -- assumes the descendant carries work of its own that finishing it discharges. Where the descendant's work IS the predecessor's close, that assumption fails in both directions at once, and the deadlock is invisible at each issue read alone: each body names a plausible successor and neither says it is waiting on the other. Break it by asking what the successor would have to DO, not what it would have to close: here the real act was a typed approval (approve-close on the predecessor) that could be executed while both issues were still open, and once that act existed the descendant was dischargeable on its own terms and the ordinary coupling ran. So a minted successor owes an act, not just a target -- and a mint whose whole remainder is 'close the thing that minted me' should be recognised at the mint as a cycle rather than discovered at the close.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
