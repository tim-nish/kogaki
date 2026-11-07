<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-11
repo: Kogaki
grain: lesson

## Trigger — what happened

An import allowlist in kogaki's review-draft harness scans the file's text for 'from "…"'. A prose line in a rendered template was reworded to end with the word 'from', and the next quoted string began on the following line, so the scanner read it as an import of ',\n    ' and the allowlist refused it by name.

## The learning

A text scanner that enforces a rule about code will also read the prose the same file carries, and a natural sentence can satisfy a code pattern by accident. The failure is not that the scanner is wrong about its own subject but that it has no way to tell code from a string literal, so the guard fires on an edit that changed no code at all — and the message it prints names an import nobody wrote, which sends the reader looking for a dependency rather than a sentence. Where such a scanner is kept deliberately simple, say in the check itself that it reads prose too and that a false positive is a wording collision rather than a violation, so the next person to meet one spends a minute rather than an hour. The general form: a guard that matches over raw text owes its reader the sentence that says what else lives in the text it matches over.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
