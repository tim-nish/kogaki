<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-02
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#784's two pull requests reported the same file's line count three times and were wrong three times, each on a different end of the figure: 'still 5621' where the file was 5626; '274 to ...' where the base was 283; and '... to 216', which was true of no head at all. The third was written while repairing the second. All three post-date the rule this repository had just installed saying a count is re-derived and never edited, and all three were caught by review rather than by the author.

## The learning

The rule 'a count is re-derived, never edited' is not self-enforcing, because editing a count does not feel like editing a count. It feels like carrying a figure forward, or incrementing it by a diff stat, or adjusting the half that a reviewer did not mention. Each of those is arithmetic on a number rather than a measurement of the thing, and arithmetic produces a figure that is wrong in a new way every time: too high, too low, or true of nothing. The discipline that survives contact is mechanical and small: a figure about an artifact at a head is written by running the command that produces it against that head, at the moment of writing, and a figure that cannot name the head it is true of does not get written. The corollary is where the recurrences landed - in commit messages, pull request bodies and issue comments, which no check reads. A rule installed in a specification binds the file the specification governs; the surfaces around that file are where the same claim goes unchecked, and they are where a reader looks first.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
