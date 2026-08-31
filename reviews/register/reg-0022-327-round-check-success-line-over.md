---
id: reg-0022
status: pending
observed_at_pr: 327
observed_at_head: 2cf2eee
class:
recorded: 2026-08-09
source_comment: 5231240795
---
**PR #327 round 2 — a check's success line over-claims what it observes (`carried: register`).**

The record vector added for kogaki#323 AC 2 calls `carry_forward(...)` **directly** and asserts the **unit's returned record**. Its success line, printed in both consumers, says:

> a consumer that stops DISCLOSING an uncomputable comparison fails here

**That is true of one consumer and false of the other.** Disclosure is the consumer's own *printing* of the record:

- **Sweep** — `for _line in record: print(f"  clause-7 {_line}")` inside `decide()`, covered by the stdout-asserting `carry-forward [unresolved base]` fixture.
- **Gate** — `for line in record: print(f"clause-7 {line}")` in `checks/check-review-report.sh`'s **main body**, not in any function. Its own suite cannot invoke it, and no fixture asserts its stdout. **Delete that loop and both suites stay green.**

So the vector proves both consumers *reach* the unit's record; it does not prove either one *prints* it, and it is asserted for neither on the gate side.

**Why this is register-class rather than a defect to repair in place.** The remedy is one clause of wording, and the underlying gap — a `print` in a script's main body being unreachable from that script's own fixture pass — is **structural to how these checks are written**, not local to this vector. It recurs wherever a check's output is produced outside a function, and counting those is what a register is for.

**The observation, stated for counting:** this is the **fourth** over-claim in this family inside three runs, all mine, all in the same subsystem, and each one caught by a *reader* rather than by a suite:

1. `"the allowlist does not deny shell grep"` — falsified by probe.
2. the terminal-key width, `"every later grep is refused"` — contradicted by `terminal_key`'s own three-word form.
3. the do-not-rephrase ground, `"cannot succeed"` — contradicted by the same section's own table.
4. this one — a fixture success line asserting a property the fixture does not test.

**The pattern is not carelessness about facts; it is a success line describing the INTENT of a check rather than its ASSERTIONS.** Each was written while the corresponding evidence was in hand, and each generalised one step past it. That step is invisible to every suite by construction — a check cannot detect that its own summary claims more than it verified — which is why all four needed a human or an adversarial reader.

**Instrument for whoever reads this next:** the checkable form is to require a success line to enumerate the vectors it ran rather than the property it hopes they establish. That is a proposal, not a decision, and it is recorded here rather than acted on.

`consulted: none — this is an observation about a class recurring inside one repository; no served position was brought to bear`

Source: PR #327 round 2, head `2cf2eee`, 2026-08-09. Licensing issues kogaki#323 / kogaki#324.
