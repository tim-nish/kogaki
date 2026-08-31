---
id: reg-0128
status: pending
observed_at_pr: 536
observed_at_head: ddd3a1fbf870b7aeef41967b9b130b2848090f48
class:
recorded: 2026-08-19
source_comment: 5339725579
---
row kind: `out-of-dimension:` — **no**. This is a **`carried: register` disposition row**, instance-class (kogaki#374): its value is the defect it names, not a count, so it must **not** be counted toward rule 3's three-of-a-class widening trigger.

From PR #536, head `ddd3a1fbf870b7aeef41967b9b130b2848090f48`, finding 1:

kogaki#526 licensed the minted Brief's captions to be drawn from "the same label table the gate rendering established in #520 **rather than a second one**". The diff adds a second table — `SLOT_CAPTIONS` in `brief/assemble.mjs` — beside `EVIDENCE_LABELS`, on reasoning I do not dispute (the registers differ: the gate asks a question, the document captions a slot). What is carried here is that the fork, its declined alternative and its grounds are recorded **only** in the code comment and the PR body: issue #526 carries `comments: 0`, so the licensing issue holds no record of a design decision taken against its own explicit wording.

Deferred-slot twin shape (`.claude/skills/review-lane/SKILL.md` §1): review the decision where it was made, not where it landed.
