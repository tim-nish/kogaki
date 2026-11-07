<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

A spec section named a deferred design slot and said three shapes were visible and none decided. I read it, built a three-way fork from it, recommended one shape with a served-line receipt, and the owner chose it. The fork was not open. The decision had been made days earlier on the tracking issue, had chosen a DIFFERENT shape, had explicitly declined the one I recommended with a ground I never saw, and was already implemented in merged code whose comment said in as many words that the slot was filled. The spec file was the only record still carrying the pre-decision text, and it was the record I treated as authoritative. It was caught before anything was committed, by a consultation rule that required reading the tracking issue WHOLE rather than only its body.

## The learning

The record that states a question is usually not the record that answers it, and the asking record has no reason to ever update itself. A spec section saying 'none is decided here' is a claim about the past that nobody is assigned to falsify: the sitting that decides the question records the answer where the decision happened, which is the issue thread and then the code, and only remembers to walk back and amend the spec if something makes it. So the file most likely to be stale is precisely the one phrased as an open question, and its staleness is invisible because an open question looks the same whether or not it has been answered elsewhere. Two things follow. When you meet a named open slot, treat 'is this still open' as the first question rather than an assumption, and check it against the carrier and the shipped code before composing any alternatives from it. And when you present a fork to a person, the premise that the fork IS open is the part of the question that most needs verifying, because if it is false every option offered records their answer as ratifying a reversal they were never told they were making. The cheap reads all agreed with me here: the issue body, the ledger note, the spec, the story file. Only the full comment thread disagreed, which is the case for a rule that names a source also naming what a complete read of it includes, since every partial view otherwise counts as compliance.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
