<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-28
repo: Kogaki
grain: lesson

## Trigger — what happened

A contract was flipped in one carrier and left asserting its opposite in four others. Review round 1 named three of them and called it blocking. The fix edited those three. Round 2 then swept the tree for further carriers and found a fourth — a template shipped to downstream consumers — and declared the sweep complete, listing the phrases it had searched. After the pull request merged, a fifth carrier was found by a grep run for a different reason: it sat twenty lines below a paragraph the same pull request had edited, in the same file, declaring the same slot open. Both review passes had searched for the phrase the blocking finding happened to quote; the fifth instance used the other phrasing the same idea has in that codebase, so no pass could see it. Nobody was careless. Every pass ran the search its own prompt named.

## The learning

A remediation sweep is a search, and a search needs a query. The query almost always comes from the finding that triggered the sweep — the exact string the reviewer quoted — because that string is the most concrete thing available and it is right there. But the finding quoted ONE INSTANCE, and an instance is a sample of the property, not a definition of it. So the sweep silently scopes itself to instances that happen to share surface form with the sample, and the population it reports as clean is the population that phrases the idea the same way. The failure is not incomplete effort; it is a query derived from the wrong thing, and it produces a confident all-clear that is stronger evidence than no sweep at all would have been. Two properties make it durable. The sample is chosen by whoever wrote the finding, for reasons of exposition rather than coverage — they quote the instance that best explains the defect, which is not the instance most representative of how it is written elsewhere. And the sweep's own report reads as a coverage claim while being a phrasing claim: 'swept the tree, three further hits, all quotations or past-tense' is true of what was searched and says nothing about what was not. The practical form: before sweeping, name the PROPERTY in the abstract and then list the distinct SURFACE FORMS it takes in this codebase, and search each — because a codebase that states one idea two ways will have exactly the instance you miss in the way you did not think of. And when reporting, state the query rather than the conclusion: 'grepped X and Y' invites the reader to notice that Z exists, while 'the tree is clean' forecloses it. The corollary is about where to look first: the nearest unexamined instance is usually inside the file you just edited, because editing one paragraph is what makes the rest of that file feel already reviewed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
