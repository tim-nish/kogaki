<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-28
repo: Kogaki
grain: lesson

## Trigger — what happened

A spec clause was written, gated with alternatives and a receipt, reviewed across four rounds on two pull requests, merged, and then falsified within an hour by the first attempt to implement it. The clause said every receipt carrying a particular negative outcome token owes coverage across three typed facets. Written down it was defensible and survived every reading. Implemented, it retired the ordinary case the same vocabulary exists to express — 'I asked twice and nothing discriminated' — which three existing fixtures encoded and which nobody had thought about, because the clause named the token and not the population of receipts that carry it. A second clause in the same block failed the same way in the same sitting: it required three framings from a tool whose stated bound is two, so the act it described was unreachable through the primary path at any count. Neither defect needed new information. Both were visible the moment code had to satisfy the words, and invisible while the words were only being read.

## The learning

A clause about a mechanism has two audiences and only one of them can refute it. A reader checks it for coherence, for grounding, for whether it contradicts its neighbours — and it can pass all of that while being unsatisfiable, because coherence is a property of the text and satisfiability is a property of the system the text describes. The implementer is the first party who must produce something the clause is true of, and that is a different and much harder test. So review rounds on prose systematically ratify a class of defect they cannot reach, and the ratification is not weak evidence but ZERO evidence about that class: adding rounds does not help, and adding reviewers does not help, because every one of them is running the test that passes. The tell is specific and cheap to look for: a clause that quantifies over a population ('every receipt whose outcome is X owes Y') is asserting something about members nobody has enumerated, and the falsifying member is usually the ordinary one rather than an exotic one — the common case is precisely what a clause author is not thinking about while writing the interesting case. A second tell is a clause that composes two independently-stated numbers, here a floor of three against a bound of two; each was correct where it was written and their product was unreachable, and nothing that reads one clause at a time can see it. The practical consequence is not to review prose harder. It is to treat a mechanism clause as PROVISIONAL until something implements it, and to say so in the clause — so that the implementation is understood as the first real test rather than as downstream execution of a settled decision, and so that a correction arriving from the implementer reads as the process working rather than as relitigating a merged spec. The corollary for what to write down: when the correction comes, record it AS a correction with the falsifying case named, because the next reader of the clause is otherwise being handed the same defensible-looking text that already failed once.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
