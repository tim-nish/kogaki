<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-31
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#638 filed two defects in a client kit's pin reporting. Fixing them required exercising the installer's round-trip branch, which no case had ever reached. The first run of that new case revealed the installer registering a gateway into the developer's own ~/.claude.json; measuring the residue found 1030 orphaned project entries, every one naming a temp directory the test had since deleted, 84 percent of the file. The cause predated the new case: the installer also RESOLVES a gateway out of that same file when none is named, so the test's ordinary installs had been finding the operator's real gateway and registering it against a throwaway repo since the test was written. CI never saw any of it, because the CLI that performs the registration is not installed there.

## The learning

A test that invokes a tool which CONFIGURES something inherits that tool's whole reach, including the parts of the machine the test never mentions - and configuration writes are the quietest possible side effect, because nothing downstream reads them and no assertion depends on them. The residue therefore accumulates at exactly the rate the suite is run, which is highest on the machine of whoever is working hardest on it, and it is invisible in CI precisely where CI is most trusted: the write needs a tool the runner does not install, so the runner is green and silent about a class it structurally cannot observe. Two consequences worth carrying. First, the containment belongs at the ENVIRONMENT the tool reads rather than at any call site: sandboxing HOME fixed the write and the resolution together, where a per-invocation flag would have fixed only the calls somebody remembered. Second, and this is the part that generalises past config files, a test's blast radius is not what it asserts about but what its subject can TOUCH, so the question to ask of any test that shells out is which files the invoked program may write and whether the test has bounded them - never whether the test passes. The tell that this had been happening for a long time was not a failure but an inventory: nothing was wrong, and a directory listing of the config's own keys showed the count.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
