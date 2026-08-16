<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

A change added a test that binds a call's argument rather than its text, because the old test matched the call by searching the source for its name and so passed however the call was argued. The record submitted with the change listed four mutations and the test that catches each. Three had been run. The fourth was written down from reasoning about what would happen, in the same table and the same format as the three that were executed, with nothing marking the difference. A reviewer checked it and found the unrun row was wrong: it named one catcher and the mutation actually trips two, which also falsified a sentence elsewhere in the record claiming a particular branch was covered by nothing.

## The learning

A table of mutation evidence is a claim that each row was executed, so a row you reasoned out instead of running is an inference wearing evidence's clothes — and it sits in the one artifact a reader consults precisely because they cannot re-run it themselves. The failure is not that the reasoning was sloppy; the entry was plausible and nearly right. It is that the format erased the distinction between what was observed and what was predicted, so a reader had no way to weight them differently. Two habits fix it. Run every row before the table ships, which is usually cheap because the harness is already open from running the others. Where a row genuinely cannot be run, mark it as predicted and say why it was not run, so it is read as the weaker thing it is. The tell that you are about to do this is a row that feels obvious: the rows that get written from reasoning are exactly the ones whose outcome you are confident about, which is why nobody thinks to check them.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
