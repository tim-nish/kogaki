<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A gate call was refused four times in a row. The first two refusals were for a missing declaration block the harness had redacted from the transcript, so the block was written to a sidecar file the gate consumes instead. The third refusal was for an unrelated reason — one option's preview ran two lines over a length bound — and the fourth reported the declaration missing again. The sidecar reader deletes the file as it reads it, so the call that failed on the preview bound had already consumed the declaration it never got to use.

## The learning

A read that deletes what it reads must not run before the checks that can still refuse the call. When a validator consumes a single-use record and a later validator in the same pass rejects the call for something else, the retry starts from a state the first attempt silently destroyed — and the second failure names the consumed record as missing, which points the repairer back at a problem they had already fixed. The two failures are indistinguishable at the point of failure: 'you never wrote the declaration' and 'you wrote it and the previous attempt ate it' produce the same message. Either move the destructive read after every refusal the pass can raise, or make it non-destructive and delete on success only. The general form: a single-use resource consumed during validation makes every unrelated validation failure destructive, and the cost lands on the retry rather than on the attempt that caused it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
