<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-29
repo: Kogaki
grain: lesson

## Trigger — what happened

A disposition ruling that two CLI entry points 'cease to exist' was executed and found unexecutable: removing them breaks 34 fixture sites that drive them, and the surviving driver cannot be pointed at a fixture at all (it re-derives its input live, crosses a network seam, and refuses without records the fixtures do not have).

## The learning

A removal ruling is a purity criterion, and purity criteria are one-sided: they say what must not remain and are satisfied most cheaply by deleting behaviour, so they can be executed exactly as written and still be wrong. The tell is not that the removal is expensive — it is that the removal is UNREACHABLE, and the way to find that out is to attempt it and read what breaks rather than to enumerate what produces the thing being removed. The enumeration that licensed this ruling covered every producer of the two entry points and none of their consumers, which is why it looked complete. When the attempt shows the surviving route cannot reach the behaviour the deleted route reached, the honest repair is to narrow the CLAIM to the half a carrier can hold — here, the harmful WRITE rather than the whole callable surface — and to say in the same act which behaviours must survive and what test fails if each stops holding. A claim narrowed with a carrier is worth more than a claim asserted wide with none, and a spec sentence wider than any mechanism can make true will be re-asserted by every repair that reads it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
