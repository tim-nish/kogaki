<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

A cleanup step in one file was registered five separate times, each registration listing the temporary things created up to that point, and each new registration replacing the previous one entirely. A reviewer found one listing that had missed an entry. I added it. A second review found the next one. I added that. Then a small script I wrote to check the property across all five found a third. At that point I stopped adding entries and made every temporary thing live under a single parent, cleaned by one registration made before anything is created. A new case now adds nothing to any list.

## The learning

When the same omission is found twice in different places of one construct, stop repairing places and remove the requirement to remember. The tell is precise and worth watching for: a rule that must be restated at each site, where restating replaces rather than adds, so each new item silently owes an edit at every site created after it. Fixing the site you were shown leaves the count of possible omissions unchanged, and the next one will be found by someone else later. Two practical moves: write the small check that asks whether the property holds at every site rather than the one you were told about -- it is usually a few lines and it found one more here -- and then prefer the arrangement where the property holds by construction, so a future addition cannot forget. Note also that the second review found the second instance and my own check found the third, which is the argument for writing the check even when a reviewer is already looking.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
