<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #937 round 1 disposed a non-blocking finding `carried: register` — a destination this repository retired at kogaki#804. Reading that as 'the carry has no home, so file it', I filed it as its own issue (#938) before spawning the final round. The final round then carried the SAME finding to an existing issue, #879, on a better ground: #879 is the seat that reads the record back and pins its sha, so the companion field belongs beside that pin rather than as a second rule invented one act earlier. Two open carriers for one observation, and the fresh one had to be closed as superseded within four minutes of being opened.

## The learning

A review round's stated destination for a finding it does not resolve is a proposal, not a disposition, while a further round remains — because the next round re-reads the same finding against a changed head and may route it somewhere better. Acting on the earlier routing creates a carrier that the later routing then has to retract, and a retracted carrier is worse than a late one: it exists in the record, it was linked from somewhere, and closing it costs a reconciliation that filing later would not have cost. The asymmetry is the whole point — filing late costs nothing but a few minutes, filing early costs a duplicate and its cleanup. So the rule is to hold every unresolved carry until the terminal round has spoken, and only then file what is still unhoused. This holds even when the named destination is visibly broken (here, a register the repository had deleted): a broken destination proves the finding needs a home, never that THIS session must pick it, and picking it is exactly the act the later round is better placed to do — it has read the diff at its final head and it knows which seats are open.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
