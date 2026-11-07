<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

Implementing kogaki#877, a check case asserted that a figure declared on a Move with no visual_form is refused NAMING THE MOVE. It passed. The Move id in the fixture did not exist in the library at all, so the refusal that actually fired was the unreadable-record one — which also names the id. A mutation that made the formless branch accept everything left the case green: the branch it claimed to cover had never run.

## The learning

A negative test is bound by the SENTENCE it matches, not by the branch its author had in mind. When two different refusal paths can both mention the same token — an id, a filename, a field name — matching on that token alone cannot tell which one fired, and the test passes for whichever path the fixture happens to reach. The dangerous case is when the unintended path is the CHEAPER one to reach by accident: a name that does not exist, a file that is not there, an empty input. The fixture then never gets far enough to exercise the branch it names, and nothing says so, because a passing test reports the same way whether it proved something or nothing. Two things fix it together, and one alone is not enough: assert the REASON as well as the token, so the message must say why and not only what; and assert the OTHER path separately in the same case, which is what proves the two are distinguishable rather than assuming it. The general test to apply when writing any negative case: ask what else in the system could produce a message containing this token, and if the answer is not 'nothing', pin the assertion to something only the intended path emits.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
