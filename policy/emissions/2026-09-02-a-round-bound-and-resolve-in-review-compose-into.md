<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-02
repo: Kogaki
grain: lesson

## Trigger — what happened

A review process bounds each change at two review rounds, and separately requires that defects found inside the change's own text be fixed before it merges rather than deferred. A third rule says a change merges only when its current version carries a review report. Each is individually sound. In one sitting they combined three times: the final round returned small in-text defects — two blank lines left inside a comment, a one-line classifier reading the wrong variable — and fixing any of them would have changed the version under review, leaving no round available to re-certify it and stranding a change that was otherwise complete and passing. So each trivial fix was written up and deferred, and the sitting's reviewers had correctly routed them to a deferred list on their own initiative, which is the tell that the composition was already understood locally by everyone except the rules.

## The learning

Three rules that each terminate work can compose into one that cannot. A bound on rounds terminates review; a requirement to fix in place terminates deferral; a requirement that the reviewed version be the merged version terminates drift. Put together they produce a state where the only two moves are to ship a known defect or to spend a round the bound does not have, and neither is what any of the three rules was written to produce.

The state is reached specifically at the LAST round, and only for defects found there — which is why it survives design review. Every earlier round has slack, so the composition is invisible in the common case and appears exactly when the process is closest to done and least willing to reopen anything. It also looks, from inside, like the rules working: the defect was found, it was recorded, the change shipped. Nothing failed. What is lost is only the difference between a defect fixed and a defect written down, and that difference is invisible unless someone counts the write-ups.

The counting is the practical move. A deferred-defect list that records WHY each entry was deferred makes the composition observable: entries deferred for judgment are one population, entries deferred because the bound was spent are another, and the second population growing is a fact about the rules rather than about the work. Three entries in one sitting, each citing the same interaction, is not three small decisions — it is one structural finding that no individual round could have reported.

What does not work is raising the bound. The bound exists because unbounded review does not converge, and a bound of three relocates the same state to the third round. What the composition actually asks for is an exit whose cost is less than a round — a way to land a one-line fix without re-certifying everything, or an explicit class of defect the certification is allowed to not cover. Choosing which is a real decision with real risk; noticing that one is owed is the cheap part, and it is what a count of deferrals buys.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
