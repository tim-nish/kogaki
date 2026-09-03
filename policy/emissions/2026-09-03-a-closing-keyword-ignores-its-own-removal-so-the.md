<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

A review round found a pull request carrying 'Closes #787' while the same body recorded one of that issue's acceptance criteria as not met. The keyword was withdrawn from every carrier before merging: the commit message was amended, the body was edited until grep found nothing and the platform's own linked-issues field returned empty, and the squash commit carried no keyword. The issue closed anyway at the merge, attributed to the merge commit. Every disclosure this repository runs had named the shortfall - the PR body, two registry notes, the commit message - and the closing act read none of them.

## The learning

A closing keyword is not a statement the merge re-reads; it is a link the platform registers when it first sees it, and removing the text afterwards does not reliably remove the link. So the keyword is not a claim that can be corrected in flight, and treating it as one is what makes the failure silent: every surface a session can read agrees the keyword is gone. The decision belongs earlier. Before opening a pull request, answer whether this work closes its issue - if any part of the acceptance will remain unmet, open it without the keyword and add nothing later, because adding one is cheap and removing one is not symmetric with it. The general shape is worth carrying past this platform: where an act is triggered by a side effect registered at write time rather than evaluated at execution time, the correction window closes at the write, and a system that lets you edit the text afterwards is offering a repair it cannot perform.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
