<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #944's review round reported two 'should' findings and declined to carry either, on the stated ground that the fix belonged inside the diff's own text. The PR then merged as instructed, and a fix commit after a landed round would have moved the head and made the PR unmergeable — so both findings became uncarried at the moment of merge, with no register in this repository to hold them.

## The learning

A reviewer's decision not to carry a finding is conditional on the diff still being open, but nothing re-examines it when the diff closes. 'The contributor can fix this here' is a true statement about an open PR and a false one about a merged one, and the transition between the two is a merge that the declination does not observe. Either the declination has to be re-read at merge time — which is what happened here, by hand — or the reviewer should say what becomes of the finding if the PR merges unchanged. The cheap repair is a habit: before merging, re-read every declined finding and ask whether its ground survives the merge; the ones that do not become the carried set.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
