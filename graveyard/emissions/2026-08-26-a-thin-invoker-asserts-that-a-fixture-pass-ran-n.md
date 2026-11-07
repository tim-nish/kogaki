<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-26
repo: Kogaki
grain: lesson

## Trigger — what happened

Registering terrain's runtime fixture pass (kogaki#659) meant writing a thin invoker on the template the already-registered check-draft-runtime.sh sets: run the runtime's self-test, require exit 0, and grep the output for the pass's own token. Mutation-testing that invoker before declaring its efficacy showed the token guard passing on a pass that reported '0 case(s) pass' — exit 0, token present, check green, zero assertions made. The sibling that supplied the template has the same hole, and the issue being closed was itself filed because eighteen assertions were present, correct and observed by nothing.

## The learning

A check that delegates its assertions to another artifact's fixture pass can verify that the pass RAN CLEAN and cannot, by the same evidence, verify that the pass STILL ASSERTS ANYTHING. Those are different claims and the usual guards — exit code, plus an output token proving the right program produced the output — establish only the first. Both survive the deletion of every case, because a pass with nothing to run succeeds trivially and announces its success in exactly the same words.

What makes this durable rather than a slip is the direction of the failure. Cases are lost by ordinary means: a refactor drops a block, a merge resolves against the fixtures, a helper stops being called. Nothing about that emits an error, because the artifact is a COUNTER of successes and losing a case lowers a number nobody compares against anything. So the invoker keeps reporting green, and it reports green with more confidence than before — fewer cases run faster and fail less.

The general shape: where one artifact vouches for another's evidence, the vouching must bind a property that DEGRADES when the evidence is removed. 'It exited zero' and 'it printed its own name' both improve as evidence disappears. A case COUNT, floored at one, is the cheapest property with the right polarity, and reading it costs the invoker one line because the pass already prints it. State the floor rather than the number: asserting the exact count turns every legitimate new case into a failing check, which is the pressure that gets the assertion deleted.

The recursive form is worth naming, because it is what this sitting walked into. An invoker with no such floor is itself a verification artifact observed by nothing — it will report the presence of evidence long after the evidence is gone, and it is the LAST thing anyone would think to check, precisely because it is green.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
