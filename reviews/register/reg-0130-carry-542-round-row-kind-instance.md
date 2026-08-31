---
id: reg-0130
status: pending
observed_at_pr: 542
observed_at_head: 8906f20752e27d1935c62f24c8ba41ea1d55dba0
class:
recorded: 2026-08-19
source_comment: 5340504313
---
**Carry from PR #542, round 1.** Row kind: **instance-class** (kogaki#374) — a latent, non-gating finding in the diff's own neighbourhood, not an `out-of-dimension:` observation, and not counted toward rule 3's three-of-a-class widening trigger.

Head `5a7eeab`, base `03b2768`, licensing issue kogaki#539.

**`replaceSlot` interpolates its `heading` argument UNESCAPED into a regex.**

`brief/compose.mjs`:

```js
const re = new RegExp(`## ${heading}\\n\\n\\*\\(awaiting composition\\)\\*`);
```

A heading containing a regex metacharacter — `.`, `(`, `[`, `+`, `?` — is compiled as **pattern** rather than matched as text. Today every caller passes a plain-word heading from `SLOT_CAPTIONS` ("Reader start", "Thesis closure", …), so nothing is broken and this is latent rather than live.

**It is the same defect class PR #542 just fixed, on the other argument.** #542 stops `body` being reinterpreted as a *replacement string*; `heading` is still reinterpreted as a *pattern*. One function, two string arguments, both flowing into machinery that reads syntax — and only one of them now inserts literally.

**Carried rather than fixed because kogaki#539 declares the slot regex OUT OF SCOPE by name.** Repairing it under #539 would be the unlicensed-scope shape this session has already taken a blocking finding for (PR #534 round 1), so it takes the register instead.

**Remedy when it earns a carrier:** escape the heading before interpolation, or build the matcher without a regex at all — the second removes the class rather than enumerating what to escape, which is the same argument #539 accepted for `body`.

**Why the pair is worth recording together rather than as two rows a year apart:** the fix for `body` was chosen *because* enumerating dangerous patterns is a denial list that goes stale. That reasoning applies unchanged to `heading`, and the next reader of `replaceSlot` will see one argument hardened and one not, with no note saying the second was seen.

consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/testing.md:173
