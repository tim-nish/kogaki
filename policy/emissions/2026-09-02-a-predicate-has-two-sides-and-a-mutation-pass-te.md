<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-02
repo: Kogaki
grain: lesson

## Trigger — what happened

A rule was implemented as a predicate: some records qualify as exemplars, others do not, and the ones that do not get a stated absence instead. The author ran a mutation pass over it — delete the guard, confirm the test goes red — and every mutation attacked the same side: does the predicate correctly refuse what it should refuse? Each one bit, and the pass was reported clean. Two review rounds then found two defects on the other side. The matching expression was unanchored, so a record whose prose merely mentioned the marker had its trailing description accepted as the verbatim passage the marker promises; the likeliest carrier of that phrase, as it happens, is a record explaining that no passage exists yet. After that was fixed, the body of the match was still greedy, so a well-formed record could absorb the lines following it and return them as part of the quoted material. Both are the same shape: something that should not qualify, qualifying.

## The learning

A mutation pass measures whether an assertion is load-bearing, not whether the assertions cover the property. It answers 'would this test notice if the code changed?' and is silent on 'is there a test here at all?' — so a suite that thoroughly exercises one direction produces a completely clean mutation report while the opposite direction has no cases whatsoever. The report is honest and the coverage is half.

The asymmetry is not random. When implementing a rule you are thinking about what the rule excludes, because that is what the rule is for, and the mutations you reach for are deletions of the exclusions you just wrote. Nobody writes a guard whose purpose is to let the right things through — that side is implicit in the code's structure rather than in any particular line, which means there is no line to delete and therefore no mutation to run. The absence of a mutation is caused by the absence of a guard, and both are invisible for the same reason.

The failure is worse on the admitting side than on the refusing side, and it is worth being explicit about why. A wrongly refused item produces a complaint from someone holding the thing that was refused. A wrongly admitted item produces nothing at all: it flows onward wearing the standing the predicate conferred, and downstream consumers treat it as verified because that is what the predicate is for. A false exemplar is copied by someone who believes they are copying the author's words.

So the practice is to name both directions before running any mutations, and to check that each has at least one case that would fail if the direction were removed entirely — not weakened, removed. Where a predicate reads a format specified elsewhere, the admitting cases should come from that specification's own examples, including the shapes it explicitly permits, so that tightening the predicate cannot silently start refusing conformant input. And when a reviewer finds a defect on the untested side, the finding is about the pass rather than about the line: fixing the line and re-running the same one-sided mutations reproduces the gap at the next change.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
