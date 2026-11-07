<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-02
repo: Kogaki
grain: lesson

## Trigger — what happened

A runtime gained a mandatory step: an act would refuse unless a caller supplied a judgment record. The obligation was written twice without anyone intending two copies — once at the act, which refused when no record was supplied at all, and once inside the record validator, which refused a record missing its required fields. An undefined record satisfies the second condition too, so both fired on the same input. A test asserted the act refuses when no record is passed, and it passed. Then the act-level guard was deliberately deleted to check that the test would notice, and the test still passed: the validator had refused instead, for a different reason, and the assertion only asked whether some refusal happened. The mandatory step could have been removed entirely and the suite would have stayed green. A second instance of the same shape turned up minutes later in the same file, where a completeness pass and the loop after it both depended on the same lookup; deleting the completeness pass did not make the function refuse, it made it throw several lines later on an undefined value.

## The learning

Redundant enforcement is usually described as defence in depth, and in a running system it often is. In a tested system it is something else: it destroys the test's ability to discriminate. An assertion of the form 'this input is rejected' cannot tell which of two guards rejected it, so as long as one survives, the assertion reports health. The guard that gets deleted is then invisible precisely because the other one is doing its job — the redundancy that was supposed to be insurance is what hides the loss.

The tell is that the two guards refuse for different reasons while producing the same outcome. Here one meant 'you did not perform the required act' and the other meant 'the thing you handed me is malformed'; those are different facts about the world, and a caller needs to be told which. That difference is also what makes the assertion repairable — asserting against the specific refusal, its wording or its named cause rather than the mere fact of failure, restores the discrimination without removing either guard.

Two repairs are available and they are not equivalent. Tighten the assertion, and both guards stay, with the test now pinned to the one that carries the property. Or collapse to a single guard sited where the value is actually needed, which is stronger where the second guard was never a deliberate defence but an accident of ordering — as in the second instance, where the two were not even two refusals but a check and a silent dependency on that check having run. The second repair removes a coupling a later edit can break; the first preserves a genuine belt and braces. Choosing between them is a question about whether the redundancy was designed.

The general practice is that a mutation pass is not a formality to be run once and reported as clean. It is the only thing that distinguishes an assertion from a sentence about an assertion, and the mutations worth running are the ones that delete the mechanism the assertion names — not the ones that break it in some other way. A mutation that produces a green suite is a finding about the test, and it deserves to be recorded as one rather than quietly repaired, because the class recurs in any codebase where obligations are written at more than one layer.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
