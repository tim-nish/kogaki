<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-20
repo: Kogaki
grain: lesson

## Trigger — what happened

A design document asserted that nothing was left to the implementation, and one load-bearing question — where the artifact it specifies is written — went unstated. Everything around it was fixed: the file's frontmatter, its citation form, its internal trace, and that intermediate state stays in a scratch area. The one thing left open was the durable location.

## The learning

A no-deferrals claim is the sentence that most needs auditing, because writing it is what stops you looking. The reliable audit is not to re-read the document for gaps — you will re-read the parts you wrote, which are the parts you decided — but to ask what the first implementer must choose before writing a line. Whatever they must pick that the document does not say is a deferral, named or not, and an unnamed one gets settled by whoever implements first and becomes the contract by accident. The tell in this case was a paragraph that fixed everything about an artifact except where it goes: high specificity around an absence reads as thoroughness, and is the opposite.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
