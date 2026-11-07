<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-02
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1120 admission, 2026-10-02: the Issue (filed 2026-09-15) asks for new assertions in policy/kit/test/install-test.sh and names policy/kit/checks/check-client-kit-install.sh as staying green. That check was removed on 2026-09-25 under the retention rule (#1196), and nothing now runs install-test.sh, which sits outside the checks/ folder.

## The learning

When a cleanup removes a check, every open Issue that names it, or that plans to add tests to the file it ran, becomes unbuildable as written. Admission reads this as a conflict with the rule that test code lives only in the declared checks folder, and the Issue goes back to its owner to be amended. Removing a check should come with a search of open Issue bodies for its name and its test file, so that the affected Issues are amended when the check is removed and not discovered later at admission.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
