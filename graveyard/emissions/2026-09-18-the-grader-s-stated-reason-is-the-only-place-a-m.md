<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-18
repo: Kogaki
grain: lesson

## Trigger — what happened

In a review pass, one of thirty-three graders returned an undecidable answer whose stated reason was that the input did not contain the material it needed to judge. The input did contain it, under its own heading. Every other grader in the batch answered normally, and the malformed answer was the same shape as the rest — one token plus one sentence — so nothing but the sentence marked it as given without reading.

## The learning

When a judging step returns a verdict plus a short reason, the reason is not decoration; it is the only part of the output that can contradict itself. A verdict alone is unfalsifiable — pass, fail and cannot-tell all look the same whether or not the judge read anything — while a reason that asserts something false about the input it was handed is a detectable failure. So require the reason, read it against the input rather than filing it, and treat a reason that misdescribes the input as a grading failure to be re-asked, not as a third verdict to be recorded. A batch is only as trustworthy as the weakest reason in it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
