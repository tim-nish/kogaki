<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #797 round 1 reported that a once-per-head CI verdict lookup could never hit on a pull_request run: the workflow checks out refs/pull/N/merge, so HEAD is the merge commit while the run-list query filters on the PR head. It concluded the failure was inert — an unhit lookup just runs the suite in full — and suggested keying the lookup on the PR head instead. Measuring the query before implementing that suggestion showed the premise was right and the consequence inverted. A workflow run's head_sha IS the PR head, so the lookup matched; the run it matched had checked out the merge tree. The live risk was not a lookup that never hits but one that hits and attests a different tree, letting a run at the PR head skip its checks on evidence from a tree containing commits that head does not have. Implementing the suggested fix would have made the unsound reuse the intended behaviour.

## The learning

A finding names an observation and a consequence, and the two have different truth conditions: the observation is usually something the reporter saw, while the consequence is a prediction about what the system then does. A reporter who has seen the discrepancy still has to guess which side of it the system lands on, and a guess stated in the same sentence as the observation inherits its authority. The failure mode is specific and costly: the suggested remedy is derived from the wrong consequence, so applying it faithfully entrenches the defect while producing a diff that closes the finding. So the act a finding licenses is verification, never implementation of its remedy. Run the query, execute the path, print the value the finding reasons about, and let the measurement pick the consequence. It is cheap where the finding is precise enough to be worth acting on at all, because a finding that names the mechanism also names the observation that settles it. And when the measurement reverses the consequence, the fix that follows is usually not the one proposed and often points the opposite way, which is the signal that the verification was load-bearing rather than ceremonial.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
