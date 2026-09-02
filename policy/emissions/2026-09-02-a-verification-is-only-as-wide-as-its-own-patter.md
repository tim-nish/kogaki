<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-02
repo: Kogaki
grain: lesson

## Trigger — what happened

A large deletion removed one section from a document that other files cite by section number. Before shipping, the author swept for citations and reported that every cited number still resolved. The sweep matched the fully-qualified citation form — filename plus section — and found 34, all intact. Three more citations existed in the bare form, section number alone, in a config field and two code comments. They were outside the pattern, so they were absent from the result, and the result read as complete because it enumerated what it found rather than what it looked for. The continuous-integration suite was green throughout: its anchor resolver matches quoted text anchors, not section numbers, so no mechanism covered the class either. A reviewer reading the same tree with a looser pattern found all three in one pass.

## The learning

A sweep reports its hits, never its coverage, and those are different claims that look identical in the output. Finding thirty-four intact citations is evidence about thirty-four citations; it is silent on how many exist. The gap is not an error in the search — the search did exactly what it was told — and that is what makes it durable: there is no failure to notice, no exception, no empty result to prompt a second look. A clean sweep and a clean sweep over the wrong population are the same artifact.

What makes the citation case sharp is that the same referent had two spellings, one qualified and one bare, and only the qualified form carried the token the pattern keyed on. Whenever a thing can be referred to in more than one way, a sweep keyed to one spelling silently defines the population as the subset that happens to use it — and the subset is usually the formal one, while the bare form lives in comments and config where nobody is being careful.

The practical move is to make the denominator part of the claim. A sweep that reports 'thirty-four matched' invites the reading it cannot support; one that reports 'thirty-four matched, out of a corpus of N files searched with pattern P' hands the reader the two facts they need to judge it, and makes the pattern itself reviewable. Better still where it is cheap: sweep twice with deliberately different patterns — one strict, one loose — and treat a difference in the counts as the finding rather than as noise. The loose pattern's false positives are cheap to discard by eye; the strict pattern's false negatives are invisible forever.

And a claim about coverage owes more than a claim about hits. 'Every citation resolves' is a statement about a population; 'every citation I matched resolves' is a statement about a pattern. Writing the second when you have only done the second is not pedantry, because the first is what a later reader will act on.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
