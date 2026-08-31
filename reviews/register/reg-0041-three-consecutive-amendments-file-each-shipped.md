---
id: reg-0041
status: pending
observed_at_pr: 366
observed_at_head: 4cc496b39be1d7641aaaaf678668fb64eda35f17
class:
recorded: 2026-08-11
source_comment: 5255914995
---
## Three consecutive amendments to one file each shipped a file-wide assertion contradicted inside it

Observed by the review lane on PR #366 (`out-of-dimension`), and registered rather than repaired — owner selection 2026-08-12, no suite member added.

**The instances, all in `specs/spec-terrain/SPEC.md`, 2026-08-11 to 2026-08-12:**

| PR | the assertion | what contradicted it |
|---|---|---|
| #363 (v15) | the slot is unfilled / nothing bounds expansion | the same amendment's later paragraph, ~110 lines on |
| #364 | *"v13's own statement follows"* | the text that followed, which was edited |
| #366 | *"deferred slots: none — §13.3 held the last one"* | §14.6's open slot, which §13.7 says comes due in this very issue |

**The class:** an amendment declaring a **whole-file state** from a search the amendment itself scoped. Each search was real and each was scoped to the thing the author was editing; the assertion then reached past that scope. Note the third is subtler than the first two — `**deferred slots: none.**` is a *per-amendment* declaration by convention (two other Status blocks use it that way), and the defect was an appended clause that silently promoted it to file-wide.

**The named instrument, from the review:** a check comparing `deferred slots:` declarations against the file's own `deferred-slot:` tokens. Mechanically decidable, one file, no judgment.

**Why no check yet, and the counter-argument recorded so it is not lost.** Two prior calls this session went the other way on the one-member-per-incident tell — PR #364's detector was removed and kogaki#305's grep check was declined — and adding a third member for a third incident is the growth curve those decisions refused.

The counter is genuinely strong and is recorded rather than dismissed: `constrain-generation-not-post-hoc-detection` **exempts irreducibly free composition** — *"detection survives only where free composition is irreducible, and there the correct move is to shrink that surface rather than police it better"* — and spec prose is exactly that surface. So a check here is better-founded than either of the two refused. What tips it is that three instances in one file over two days may be a property of **this amendment sequence** — an unusually dense run of corrections on one section — rather than of a standing class.

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 LESSONS.md:61`

**What would change the call, stated so the next reader has a threshold rather than a judgment:** a fourth instance **in a different file**, or any instance arising outside a correction-of-a-correction chain. Either would show the class is about amendments generally rather than about this sequence, and at that point the check's admission record writes itself — the defect it catches is already demonstrated three times over.
