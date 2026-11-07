<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-28
repo: Kogaki
grain: lesson

## Trigger — what happened

A review found that a rendering state was unassertable: the logic deciding which of three states a row was in sat inline in a long function, and every existing test drove a different layer, so a mutation collapsing two of the states failed nothing. The repair extracted the decision into a small pure function and asserted it directly over four cases, both collapse directions now failing. The next review round found that the extracted function's second branch was unreachable from the only caller that mattered. The resolver feeding it returned a populated record for every input, hit and miss alike, so the guard clause on the first line always took the hit path — the branch was tested in isolation, passed, and could not run in production. The rendered output was unchanged from before the repair, and the specification and the machine-readable grammar had both been amended to describe a rendering the pipeline could not emit.

## The learning

Extracting a decision to make it testable is the right move and it relocates the untested surface rather than removing it. Before extraction the risk is in the decision; after extraction the decision is covered and the risk is entirely in the WIRING — what the caller actually passes in, and whether the values it can pass ever reach each branch. The isolated test cannot see that, because it constructs its own inputs, and it constructs them from a reading of what the caller ought to supply rather than from what the caller does supply. That reading is exactly the thing under repair, so the test inherits the author's misunderstanding and confirms it. The failure is sharper than ordinary partial coverage because the extraction produces a strong and false signal of safety: a small pure function with cases for every branch looks finished, and its greenness is what stops the next person tracing the call. Two tells are worth learning to notice. First, a hand-built input in a test that mirrors a shape some other function produces is a duplicated contract — assert the producer's actual output, or build the input by calling the producer, but do not transcribe its shape into the test. Second, a guard clause of the form 'if the lookup returned something, use it' is only meaningful where the lookup can return nothing, and a lookup that resolves misses itself by substituting a placeholder never can. Where one layer decides a miss and a later layer also branches on it, the later branch is dead and both layers claim to own the decision. The operative correction: after extracting a decision, add ONE assertion that drives the real caller end to end and reads the real output, chosen to land on the branch that was previously unreachable. One such case is worth more than a complete table of isolated ones, because it is the only one testing the join. And the wider form, which is what makes this worth keeping: coverage of the pieces is not coverage of the composition, and a refactor undertaken specifically to improve testability should be expected to move the defect rather than to remove it — so the verification owed afterwards is of the seam that the refactor created, not of the piece it extracted.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
