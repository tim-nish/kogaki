<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-22
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-09-22 a /ship-cycle run on kogaki#1181 dispatched an implementer that produced a correct, suite-green commit, and the repository's own boundary-receipt check then refused the branch: the commit message carried no consult receipt. The issue body carried one, but the check reads commit messages and only reaches an issue body through a PR body that did not yet exist, so the receipt the filing act had already recorded was invisible at the moment the branch was judged.

## The learning

A consultation receipt is not one record with one reader. The same obligation is checked at more than one place in a pipeline, and each place reads a different carrier: the filing gate reads the issue body, the branch check reads commit messages, and a third may read the pull request body. Satisfying the reader you happened to meet first leaves the others red, and the failure arrives late, at a gate whose message is about the missing receipt rather than about the carrier mismatch. So a work-producing step that must discharge a consultation writes the receipt into the carrier the NEXT reader consumes, not merely into the one the current step happens to hold. Where a step is delegated to a worker that does not know which readers follow it, the dispatching run owns the carry: it re-states the receipt on the artifact it is about to hand onward.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
