<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

At the pickup consult for kogaki#1032 the issue-pins emitter was asked to hash three LESSONS.md cites at the served commit. All three came back 'the content trial did not run — lessons_index({}) returned a miss', twice in a row. The recheck then exited 0 and reported 'content: NOT VERIFIED — 0 of 3 cited lines had their content checked; commit SHAs were compared, which is not line liveness'. A sibling issue admitted days earlier carries pin-quote hashes for the same file, so the capability existed and stopped working, and nothing between the two heads announced it.

## The learning

A verifier with two independent strengths — one cheap and structural, one expensive and semantic — reports a single verdict, and when the expensive half stops working the cheap half keeps the verdict looking healthy. Here the commit SHA still resolved, so the pin gate passed; only a line buried under the pass said no content was checked at all. The lesson is about the SHAPE of such a tool rather than this one index: a checker whose strong arm can go missing must make the missing arm change the EXIT, or at minimum must not let the weak arm's success occupy the summary line. Second half, and it is the part that costs something later: a capability that worked on Monday and misses on Wednesday with no error looks exactly like a capability that was never configured, so the reader's first move is to blame their own invocation. The cheap discriminator is an artifact from the working period — an earlier issue body carrying the hashes this run could not produce — which turns 'I am holding it wrong' into 'this regressed', and that artifact only exists if the successful runs leave one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
