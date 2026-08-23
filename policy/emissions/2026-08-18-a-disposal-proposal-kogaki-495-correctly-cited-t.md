<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-18
repo: Kogaki
grain: lesson

## Trigger — what happened

A disposal proposal (kogaki#495) correctly cited the remove-the-generator-not-the-expression rule, then named the wrong thing as the generator. It identified a config key, .claude/story-sync.json's stories_dir, as what regenerates a directory of work-item files. Reading the resolver showed the key is only a preference: resolve_stories_dir falls back to the same hard-coded docs/stories twice, including a bare final default reached when no files exist at all — and that resolver lives in a different repository than the one filing the issue.

## The learning

Naming the generator is a separate act from invoking the rule about generators, and citing the rule makes the naming feel already done. A config key that selects a location reads like the source of the thing at that location, but a key with a default is a preference over a generator, not the generator — remove the key and the default answers instead. So open the resolver and read what happens when the key is absent, rather than reasoning from what the key is for. Two things fall out of that read and neither is visible from the config file: whether a fallback exists, and which repository owns it. When the owner turns out to be somewhere else, setting the key is the strongest available act rather than the weakest one, because a tracked config that short-circuits the lookup binds every clone while deleting the key hands control back to code you do not own.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
