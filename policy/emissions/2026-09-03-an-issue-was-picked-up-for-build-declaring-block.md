<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

An issue was picked up for build declaring 'Blocked by #822', and #822 was closed and merged. The real blocker was a sibling, #823: a spec clause written after the issue was filed assigned the shared mechanism the issue needed — reading a declared field back — to that sibling by name. Three of the issue's five acceptance items could not be built without it. The block was discoverable only by reading the spec clause; the issue's own dependency line, its pins and its ledger entry all read clean.

## The learning

A dependency line records what was known when the issue was written, and a specification amended afterwards can create a dependency the line never mentions. So an issue's stated blockers are a floor and not the set: where a spec clause assigns a mechanism to a named carrier, every issue needing that mechanism depends on that carrier whether or not any issue says so. Check the governing clause at pickup rather than trusting the dependency line, because the line is a record and the clause is the rule.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
