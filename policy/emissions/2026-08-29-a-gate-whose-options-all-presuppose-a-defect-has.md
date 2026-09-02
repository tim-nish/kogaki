<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-29
repo: Kogaki
grain: lesson

## Trigger — what happened

A pipeline carries a check that asks, before operating on a work item, whether that item is still a valid vessel for the work. It trips on countable facts — how many sittings have touched the item, whether a replacement appeared, whether the item is already closed — and on tripping it interrupts with a question offering four dispositions: split the item, close it as discharged naming successors, proceed anyway, or escalate to a design sitting. Invoked against an item that had been closed and fully completed the previous day, it tripped on two prongs at once and did exactly what it exists to do: it stopped the run before any act. But every one of its four options presupposes that the item is DEFECTIVE. This one was not defective, it was finished — its work merged, its review findings each resolved or explicitly declined with a reason. Splitting it, closing it, proceeding on it and escalating it were all inapplicable, and the disposition the situation actually called for — operate on nothing, report, stop — was not among them.

## The learning

A guard that fires on a condition and then offers remedies has quietly assumed that the condition implies a fault. Often it does. But a trip condition is a symptom, and symptoms are usually reachable by more than one path: an item can be closed because it was abandoned mid-flight, and it can be closed because it was completed correctly, and no count distinguishes those. When the remedy menu enumerates only the fault readings, the healthy reading becomes literally unsayable at the moment the system asks — so the operator must pick a wrong answer, or the machine must invent a fifth option nobody ratified, or the guard's output is quietly ignored, which is the worst of the three because it teaches everyone that the guard cries wolf. Two design consequences follow. First, a disposition menu owes a member for the benign path whenever the trigger admits one — often phrased as 'nothing is wrong here; the run declines to operate and says so' — and that member is not a no-op, because RECORDING that the guard fired and was correctly declined is what keeps the guard's own signal readable over time. Second, and more subtly: the guard was RIGHT, and its rightness is invisible if the only trace it leaves is an awkward question. It prevented exactly the failure it was built for — the founding specimen was a run that drove an item through a complete sitting while that item had been closed for days — and the correct outcome, doing nothing, produces no artifact at all unless the closing report is made to carry it. So the operative correction has two halves: give the menu its benign member, and make the null outcome leave a record. A guard that succeeds silently and fails loudly will, over enough iterations, be measured entirely by its failures.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
