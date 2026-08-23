<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-18
repo: Kogaki
grain: lesson

## Trigger — what happened

A Brief was carried from mint through composition to Candidate adoption. Two runtimes can fill the same three slots in the Brief — brief/compose.mjs fill takes one authored path directly, and brief/assemble.mjs adopt-candidate lands the owner-selected Candidate's path through the same fill. Nothing in either file says they are alternatives, and the slot-replacer refuses an already-filled section, so running the single-path route first would have made the Candidate route refuse at the end of a long sitting, after the review and the owner's gate had already been spent.

## The learning

When two entry points write the same one-shot slots, the exclusivity has to be stated at the entry points, not left to be inferred from the shared writer they call. Here the writer is correct on its own terms: it refuses to overwrite a filled section, because filling twice would mean composition resumed by overwrite rather than by judgment. But that refusal arrives at the END of the expensive route — after per-candidate review has run and after the owner has answered a selection gate — and it names the filled section rather than the earlier choice that filled it. The cost of the mistake is paid entirely in work already done. The reader who is about to use such a pair cannot see the conflict from either file, because each one describes only what it writes; the conflict is visible only from the shared writer, which is the file neither entry point's user has any reason to open. So when a shared one-shot writer sits under two routes, say at each route which other route it forecloses, and prefer to refuse at the cheap end — before the work whose loss is the actual damage.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
