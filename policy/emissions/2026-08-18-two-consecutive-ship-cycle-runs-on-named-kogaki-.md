<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-18
repo: Kogaki
grain: lesson

## Trigger — what happened

Two consecutive ship-cycle runs on named kogaki issues (#492, #494) found the licensed work fully landed and the issue still open. The cause is mechanical and was verified rather than inferred: both spec amendments reached master as single-parent direct commits with no pull request (8bc3b41, eb451f0), so the tracker's Closes-#N keyword — which lives in a PR body — never fired. The story lane never shows this, because its work always goes through a PR. The same repository's third amendment went through a PR this sitting and its issue closed by itself.

## The learning

A lane that lands work by direct commit inherits none of the tracker automation that closes the record, and the gap is invisible because the OTHER lanes in the same repository do close correctly — so the pipeline looks like it closes its issues, and the exceptions read as individual oversights rather than as one missing carrier. Ask of each lane separately: what act closes the record here, and does that act actually run on this lane's normal path. Where the answer is a keyword that only exists in a pull request, a lane that commits directly has no closing act at all, and every issue it discharges will accumulate open. The repair is to give that lane a closing act, not to remember harder; a discharge nobody records is indistinguishable from work nobody did, and the next run will re-derive it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
