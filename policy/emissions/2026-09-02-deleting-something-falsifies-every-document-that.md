<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-02
repo: Kogaki
grain: lesson

## Trigger — what happened

Four checks were removed from a suite under a retention rule. The removal diff showed exactly what was deleted: four scripts, their registry entries, a fixture directory. Review then found, in three successive passes, a widening set of documents elsewhere in the tree that had named those four in the present tense and were now false — a sibling check whose retention record cited one of them as the carrier of a contract it did not hold, a machine-readable schema asserting that one of them read its lists, a format record declaring that one of them exercised a named case, a directory of helper scripts whose only caller was among the deleted, and finally two blocks of the ignore file whose entire stated justification was work the deleted files did. Each pass found the previous method sound and its reach too short. The last pass reached a file that carries no code, is read by no mechanism, and exists to record why exceptions exist.

## The learning

A deletion diff is a complete record of what left and says nothing about what pointed at it. The references live in files the change never opens, so reading the diff — however carefully, however many times — cannot surface them. Nor can the test suite: the removed thing is gone, everything that remains passes, and a sentence claiming a deleted file does something is not a claim any mechanism evaluates. The green result is honest and irrelevant.

The method that works is grepping the removed names across the tree, and the thing to understand is that this method fails in a specific and predictable way: on its root set. Roots get chosen from where the author expects references to live, which means the code directories, the test directories, the configuration the build reads. What that expectation systematically excludes is prose — the rationale paragraph in an ignore file, the note block in a schema, the comment explaining why an exception was carved. Those are precisely the places a reference is load-bearing and unenforced, because they exist to explain a decision to a later human, and a wrong explanation misleads exactly one reader at exactly the moment they are deciding whether the exception still applies.

There is a sharper way to hold it. Sort the references by whether anything reads them mechanically. The ones that are read break loudly and get fixed in the same commit. The ones that are not read are the whole population at risk, and they are also the population no future run will ever report. So the correct root set for the sweep is not 'where the code is' but 'everywhere', with the prose surfaces weighted first rather than omitted — an inversion of the ordering intuition supplies.

Two smaller consequences worth carrying. Repair by claim rather than by site: a grep returns a line, and a paragraph often makes two independent claims about the same removed thing, of which the search shows one; fixing the hit and moving on leaves the same document asserting a fact in two tenses. And check where a finding is routed: routing one to the issue the change closes puts it on a carrier that will be shut before anyone reads it, and the carrier's state at merge is knowable at the moment the route is chosen.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
