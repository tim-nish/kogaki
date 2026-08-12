<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

A review found two instances of one class: a rule declared but never evaluated, and a format description that did not match what the code produced. I fixed the first by writing the missing evaluator — and the evaluator could not fail, because it only inspected lines that had already matched a pattern containing the very thing it was checking. Same defect, one layer deeper. It surfaced only because I had added a case to make the fix demonstrate itself working, and the case reported the wrong rule firing. Then the review's next round found that my fix for the SECOND instance had done the same thing: I described one rendering and the code had two, the second being a deliberate legacy path.

## The learning

Repairing a defect puts you in the worst position to notice you are repeating it. You have just read the description of the failure, you are working in the same file under the same assumptions, and your attention is on making the symptom go away rather than on the shape that produced it. Both of my repairs reintroduced the class they were repairing, in different places, in consecutive rounds. Two things help, and only one of them is a habit of care. Make the repair demonstrate itself: a fix for 'this rule never fires' has to be accompanied by evidence of it firing, and a fix for 'this description does not match' has to be checked against every path that produces the thing described, not the one path the report quoted. The stronger move is to ask what the ORIGINAL defect's mechanism was and whether your fix has it too — mine was 'a declaration nothing evaluates', and my evaluator was a declaration nothing could falsify, which is the same sentence with a word changed. Also worth stating: when a reviewer offers two remedies, the cheaper one is sometimes the honest one. I wrote the evaluator when the alternative — recording where the guarantee actually lived — turned out to be the truth, and the truth was that it lived somewhere else entirely and covered one surface rather than two.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
