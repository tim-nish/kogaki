<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-19
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1457 asked for a registered check that runs the shared toolkit's policy-check executable from the user's home directory; the session found, before committing, that the repository's CI runner has no copy of the private toolkit and no local branch declaration, so the check would fail on every pull request.

## The learning

When an Issue tells one repository's check to call a tool that lives in another, private repository on the developer's machine, the check works locally and breaks in CI, because CI only has what its job installs. Before filing such an Issue, say where the tool comes from in CI, and what the check does when the tool is missing: fail, or skip with a visible note. Leaving it unsaid turns the implementation into a design decision nobody made.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
