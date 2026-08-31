---
id: reg-0129
status: pending
observed_at_pr: 538
observed_at_head: 8906f20752e27d1935c62f24c8ba41ea1d55dba0
class:
recorded: 2026-08-19
source_comment: 5340110258
---
**Spent-bound carry from PR #538, round 2.** Row kind: **instance-class** (kogaki#374) — a latent non-gating in-diff finding, not an `out-of-dimension:` observation, and not counted toward rule 3's three-of-a-class widening trigger.

Head `f1536f7`, base `567d675`, licensing issue kogaki#537.

**nit — a comment asserts coverage the code does not have, in the check whose purpose is refusing exactly that.**

`checks/check-brief-entry.sh:456` builds the Brief-name poison as:

```js
slug: `owner_name-${POISON_SEC.replace(/\W/g, "")}`
```

`POISON_SEC` is `§4.1`, and `/\W/g` strips both the section sign and the dot — so the value carries `41`, not a section reference. The comment above the block says each position is *"poisoned with BOTH shapes at once"*; the Brief-name position carries one.

**No discrimination is lost**, which is why it is a nit: exemption is per *line*, not per shape, so the Brief-name path is still fully asserted by the identifier shape alone, and the six mutations still each fail. What is wrong is the claim, not the coverage.

**Why it is worth a row anyway.** This check exists to refuse text that overstates what it carries, and the overstatement is in its own commentary. It is also the fourth instance in one sitting of an assertion or claim of mine covering less than its own words said — the earlier three were caught by mutation (a guard whose deletion left the suite green, an em-dash test the template always satisfies, one exempt path of six asserted).

**Remedy:** strip only the section sign, or poison the Brief name with a token carrying both shapes, or narrow the comment to what the value holds.

Carried rather than fixed because PR #538's two-round bound was spent at this report and auto-merge was unarmed, so no later round could read a fix.

consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/testing.md:173
