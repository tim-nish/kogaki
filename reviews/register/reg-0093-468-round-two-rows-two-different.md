---
id: reg-0093
status: pending
observed_at_pr: 468
observed_at_head:
class:
recorded: 2026-08-15
source_comment: 5300790537
---
**From PR #468, round 2.** Two rows, of the two different kinds this ledger carries.

---

**Row 1 — `out-of-dimension:`, ACCRETION-CLASS.** Counts toward rule 3's three-of-a-class trigger.

> The review lane loses one dimension per round to a grant that is not in `KOGAKI_REVIEW_TOOLS`. `bash tools/review-sweep.sh --dry-run` is the only command that exercises a change to `tools/review-sweep.sh`, and PRs changing the sweep are a recurring class here. PR #468 lost it in round 1 (recorded as a denial in that round's spawn notice) and again in round 2, in a fresh spawn — so it is a standing gap in the grant set, not a per-spawn terminal-key artifact. Both rounds reported `cannot-determine: the sweep's own fixture pass` and read the new fixture cases statically instead.

The value here is the count of rounds spent blind, not this instance. kogaki#65 and kogaki#74 are the grant-set carriers; exercise the shape headless before adding it, per this lane's own note that three of eight harvested labels named allowed shapes.

---

**Row 2 — `carried: register`, INSTANCE-CLASS.** Not counted toward any widening; its value is the defect it names.

> `tools/review-sweep.sh:5068` — case 4c's `if _self_pb.count("owed_disposition_tail(") < 3` cannot fail. The counted substring occurs six times in the file independently of either call site (the `def` at `:2101`, case 4b's two calls at `:5037` and `:5043`, the count literal at `:5068` itself, and the two failure messages at `:5065` and `:5069`). Total is 8; deleting both call sites leaves 6, so the guard stays green on exactly the state it claims to detect, at any threshold up to 6.

Not a coverage hole: the `re.search` loop immediately above binds both call sites by their exact argument shapes and is the mutation-verified half. What is owed is either a count that excludes the fixture's own references, or the line's removal — the commit message's claim that "three references exist (the def plus two calls)" is what the line does not establish. kogaki#230's class one layer in: a fixture line adding a coverage claim rather than coverage.

Latent and non-gating, in the diff's own added text, found at a spent two-round bound — `carried: register` per kogaki#374 rather than minting an issue or a successor.
