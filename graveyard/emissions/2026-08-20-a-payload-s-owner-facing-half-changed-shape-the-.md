<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-20
repo: Kogaki
grain: lesson

## Trigger — what happened

A payload's owner-facing half changed shape. The runtime guard that inspects that half was updated to follow it; a second, independent check that inspects the same half for the same problem was not, and one of its two arms silently stopped covering while its summary line kept claiming both.

## The learning

A belt-and-braces pair is two readers of one surface, and reshaping the surface updates whichever reader you were looking at. The one you forget keeps running, keeps passing, and keeps printing its coverage claim — and it is hard to notice precisely because the other reader still catches everything, so nothing ever fails. Two consequences worth acting on. First: when a shape changes, grep for every reader of that shape rather than fixing the one the failure pointed at. Second: proving the forgotten reader is repaired needs the primary one disabled, because on the ordinary path the primary shadows it — a mutation that leaves both in place cannot tell a working belt from a vacuous one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
