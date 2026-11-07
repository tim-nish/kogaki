<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

A reviewer found that a new rule contradicted an older one it had cited as support. The fix was done properly: the older rule was named, its scope narrowed, and precedence written down. In the same edit, the paragraph doing that fixing introduced the identical contradiction against a different old rule — naming the wrong one as its source and asserting it was unaffected. The next review found it in the very text written to answer the first finding.

## The learning

After repairing a contradiction, do not move on: search for every other rule the change touches the same way, because you have just been shown the shape and are least likely to look again. The repair feels like closure, and closure is what stops the search. What makes this specific rather than general caution is that a fix has a signature you can grep for -- here, the sentence the new rule replaced could be searched for verbatim, and it was still sitting in two other places, one of them the exact section the next person to build on this would open. Do that search inside the repair, not as a follow-up, and check it against the sentences the change makes false rather than against the rule you happened to be arguing with. A claim that another rule is unaffected is a claim, and it is the one most worth checking, because it is usually written to avoid having to check.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
