<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

Three pull requests each needed a single-use authorization that a person grants by clicking. The contract said the question must carry exactly one machine-readable request line. I read that as a property of each question and asked all three in one batched prompt, one request line per question. The person clicked grant three times. The recording hook, which counts request lines across the WHOLE submitted payload rather than per question, saw three where it requires one, wrote nothing, and reported nothing to me. I only found out when the next step refused all three for want of an authorization that had in fact been given. The hook was behaving exactly as its own header documents.

## The learning

When a rule says a message must carry exactly one of something, find out what the counter's unit is before you batch. Per-item and per-call are both natural readings, the wording rarely distinguishes them, and the two are indistinguishable until you send more than one item — which is precisely when a batch is worth doing. What makes this expensive rather than annoying is the failure shape: the refusing side writes nothing and stays quiet, because from its position a malformed payload is exactly the case it must not act on, so silence is correct behaviour. The cost lands on the person, who has already spent the attention the batching was meant to save, and whose decision is now gone with no trace that it was ever made. Two things follow. Check the counter's unit by reading the code that counts, not the prose that describes it, whenever a rule guards an authorization — prose about 'exactly one' is where this ambiguity always lives. And when you re-request, say plainly that the earlier answer was lost to your own batching rather than to anything they decided; a second identical prompt with no explanation reads as the system doubting them, and they have no way to tell the difference.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
