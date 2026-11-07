<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1018 restored the figure half of ReviewDraft's Round Trip against the figure record's own fields. The five rows came back and every acceptance case passed. Round 2 of the review then found the figure validator floors its repeated-line field at 'at least one entry' and never refuses a blank one, while the passage validator — the half being copied — refuses a blank entry by name on a stated ground; and that the figure validator reaches its refusal wording by array index where the passage validator iterates the declaration and switches on the field's declared kind.

## The learning

When one half of a matched pair is rebuilt to match the other, the cases get written against the ROWS that came back and not against the RULES the sibling enforces, so the restatement reproduces the surface and silently drops the refusals underneath it. Both defects were in the same shape: the figure half declared its fields with kinds, exactly as the passage half does, and then read them positionally instead of iterating them. The declaration was there; nothing read it. The cheap guard is to make the restated half consume the sibling's declaration through the sibling's own loop rather than writing a second reader over the same data — then a field added or reordered cannot attach the wrong refusal, and a disposition the declaration names cannot go unenforced. Where that is too large, the acceptance for a restatement should name the sibling's refusals as things to re-assert, not just the sibling's fields as things to re-collect.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
