<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-28
repo: Kogaki
grain: lesson

## Trigger — what happened

A branch ran the repository's full check loop locally: all eighteen green, including a check that verifies a consultation receipt is present whenever the change touches a mapped policy boundary. CI then failed that same check on the same commit. The check reads four sources — changed file paths, commit messages, the pull request body, and the linked issue body — and only the first two exist on a developer's machine. Locally it found no boundary match and printed 'no mapped boundary matched this branch'. In CI, with the other two sources supplied, it matched three and refused. The check was not silent about this: its own output line names each source and marks the missing ones 'NOT SUPPLIED (normal on a push event and on a local run)'. Nobody read that line, because the summary above it said the run was clean.

## The learning

A verification step that draws on inputs which exist in one environment and not another has two different meanings for the same exit code, and the ordinary rendering collapses them. Locally the green means 'over the inputs I could see, nothing matched'; in CI it means 'over all inputs, nothing matched'. Those are different claims, and only the second is what a developer believes they have when the suite passes. The failure is not that the local run is wrong — it is correct about what it read — but that its result is rendered in the vocabulary of the complete check, so the partial reading is indistinguishable from the total one at the only place anyone looks. Two properties make this durable. The environment-only inputs tend to be the CONTEXTUAL ones — the pull request body, the linked issue, the review thread — because those are exactly what a local shell has no handle on, and contextual inputs are where the interesting matches live: a diff that touches nothing sensitive can still be described in a body that does. And the check usually DOES disclose its sources, one line above the verdict, which converts the problem from missing information into unread information — a strictly harder thing to fix by adding more output. The remedy is at the verdict rather than in the detail: a check whose input set was incomplete should not render the same token as one whose input set was whole. Say 'clean over 2 of 4 sources' and the reader either accepts a partial pass or reaches for the missing inputs. The corollary is what to hand the developer along with it: the command that reproduces the complete shape, which is usually one environment variable away and which nobody constructs unprompted because they do not know they are missing anything.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
