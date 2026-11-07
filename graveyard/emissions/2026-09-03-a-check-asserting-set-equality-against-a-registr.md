<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki's gate-carrier check compares a captured gate's offered options for exact set equality against the options written in gates/registry.json. That registry entry also carries a dynamic_options field stating in its own words that the options are composed per run from the owner's current view. A completed terrain run therefore cannot pass: the registry says the set varies and the check says it must not. Found because the suite went red on a working tree whose only difference was a legitimate, machine-local run artifact.

## The learning

Two carriers describing one thing can disagree in a way no reader notices, because each is separately correct and only their conjunction is false. The tell here is a field on the very record the check reads that contradicts the check's rule — the declaration and the enforcement sat in the same directory and neither cited the other. When a check validates an artifact against a declaration, decide which fields of that declaration bind it, and say so at the check; a check that reads one field of a record and ignores a second field describing that same field's variability has bound a proxy. The cost is not the failing run, which is loud. It is that the failure is indistinguishable from a real violation, so the honest response and the lazy one look the same: move the artifact aside and continue.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
