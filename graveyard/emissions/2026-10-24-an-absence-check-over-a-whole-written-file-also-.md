<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1585: a new check asserted that a written plan file holds no 'manner'. It failed on correct code, because the plan file records the Brief's path, and the fixture's temporary directory was named 'draft-packet-manner-...'.

## The learning

When a check asserts that a word is absent from a whole written file, everything the fixture put into that file is part of the text being searched: temporary directory names, paths, ids. A fixture name that contains the searched word makes the check fail on correct code. A fixture that avoids it by luck still searches more than it means to. Either name fixtures so they cannot contain the word, or parse the file and check only the fields the rule covers. Then run the check against the old code to confirm it fails for the reason it names.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
