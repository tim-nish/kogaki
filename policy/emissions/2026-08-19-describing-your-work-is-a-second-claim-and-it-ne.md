<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-19
repo: Kogaki
grain: lesson

## Trigger — what happened

Across one long sitting the same author shipped several changes that were, in the end, correct. What kept being wrong was the description: a test comment saying it asserted something it did not, a commit message claiming two research surveys when both citations pointed at one source, a pull-request summary still describing an earlier attempt after the code had moved on, and an authorization request whose human-readable label and machine-readable line named different numbers, so the permission was never recorded. Every one was found by a reviewer or by a machine reading the claim against the artifact.

## The learning

Work and the account of the work are two artifacts, and only one of them usually gets checked. Tests, type systems and reviewers all read the thing you built; almost nothing reads the sentence you wrote about it. So the sentence drifts - it describes the version you meant, or the version before the last edit, or a slightly better version than the one that exists - and it drifts in a consistent direction, because the writer is the person least able to see the gap. This matters more than it sounds: descriptions are what later readers act on, and a claim that outruns its evidence is worse than no claim, because it stops the next person looking. The habit that closes it is to re-read every description against the artifact as a separate pass, after the work is final rather than while it is moving, and to treat any word like 'both', 'every', 'all' or 'replaced' as a specific assertion to verify rather than a summary. Where a description is read by a machine as well as a human - a label beside an identifier, a summary beside a structured field - check that the two halves agree, because when they disagree the machine's half wins silently and the human's half is what you will remember having said.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
