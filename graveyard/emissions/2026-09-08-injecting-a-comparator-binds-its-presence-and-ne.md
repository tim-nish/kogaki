<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-08
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#974: case 14 injected a stub through shouldReplayPrior's sameIdentityFn parameter on all six of its calls, so the identity conjunct's presence in the decision was bound while sameIdentity and its reportIdentityKey had no reader in any case; dropping a component from that key left the pass green.

## The learning

Injecting a dependency into the function under test binds that the call happens, never what the callee computes. The repair for a case that binds a proxy is often a second injected value that discriminates — and that repair leaves the real callee exactly as unreached as before, one layer down, because the injection is what keeps it out of reach. So a suite that injects a collaborator owes a second case driving the shipped default, and the two are not redundant: the injected one binds the call site's structure, the default one binds the collaborator. The way to tell which you have is to mutate the collaborator and watch the count, not to read the case.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
