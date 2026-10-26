<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-22
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1520 widened one planner instruction and one judge criterion. The planner instruction was 3 words under the limit on its whole prompt, and the check asserted two exact phrases inside the text being rewritten. The first rewording failed both limits, and the second dropped both pinned phrases.

## The learning

Before rewording an instruction that has a word limit, read two things: how many words are left under each limit, and which exact phrases a check quotes from that text. Together they set the budget. Each new clause has to be paid for by cutting words that no check quotes, so read the pinned phrases first and cut only around them.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
