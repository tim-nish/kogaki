<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-28
repo: Kogaki
grain: lesson

## Trigger — what happened

Four new assertions were mutation-verified by breaking the code each was written to catch and confirming the named failure appeared. Three behaved. The fourth — that a fetched value must render quoted with the address it was read from — reported nothing when its mutation was applied. The obvious reading was that the assertion was too weak. The actual cause was that the test suite runs as a sequence of separate subprocesses under a shell that halts on the first non-zero exit, and the same mutation also invalidated a committed golden specimen checked several stages earlier. That earlier stage failed, the shell stopped, and the stage holding the assertion was never reached. Its silence was not a verdict. Regenerating the specimen under the mutation so the earlier stage passed let the run reach the assertion, which then failed exactly as written.

## The learning

A mutation test reasons from an absence: break the thing, see the guard complain, conclude the guard works. Invert it and you get the failure mode — no complaint is read as the guard being silent about a defect it should have caught. But a guard that was never executed is also silent, and the two silences are identical at the point of observation. Nothing in the output distinguishes them, because a stage that did not run prints nothing and a stage that ran and found nothing also prints nothing. The condition that produces this is ordinary rather than exotic. A test suite assembled as stages under a fail-fast runner has exactly this property, and a mutation aimed at behaviour is very likely to disturb some earlier stage too — a stored expected output, a snapshot, a schema, a fixture that encodes the old shape — precisely because those artifacts exist to be sensitive to the behaviour being mutated. So the more thoroughly a codebase is guarded, the more likely a mutation trips an earlier guard and hides the one under test. The operative correction is one step: before believing a mutation-verification, confirm the assertion RAN. The cheapest proof is a positive signal — the stage prints its own pass line, or the mutated run is checked for that stage's marker at all — rather than reasoning about which stages a mutation could have touched, which is the reasoning that fails. The stronger form is to make the guard reachable independently of the pipeline, so a single assertion can be exercised without every prior stage having to agree. What generalizes past mutation testing: any verification whose evidence is the absence of a complaint owes a separate check that the complainer was present and awake. Absence of a signal is evidence only against a background where the signal's producer is known to have run, and in a staged pipeline that background is exactly what is not established.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
