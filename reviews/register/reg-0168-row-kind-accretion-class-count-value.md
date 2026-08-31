---
id: reg-0168
status: pending
observed_at_pr: 609
observed_at_head: 957d206
class:
recorded: 2026-08-22
source_comment: 5378627076
---
**Row kind: accretion-class** (`out-of-dimension:` — the count is the value, and this row is what rule 3's three-of-a-class trigger reads over). Not a spent-bound latent carry.

out-of-dimension: PR #609 (head `957d206`) — the entry-2 boundary guard is form-dependent, and this one PR demonstrates it failing in both directions at once.

`policy/kit/test/install-test.sh:415-417` greps `$KIT_DIR/bin` for `\.tsurezure/\|access\.jsonl\|diagnostics\.jsonl\|TSUREZURE_STATE_DIR`.

- **False positive.** It denied on `policy/kit/bin/effectiveness.mjs:15`, where `access.jsonl` appears inside a comment explaining *why* the ledger is born labeled. A mention, not a use — the check turned the registry-driven suite red on a sentence.
- **False negative.** The same diff's actual composed path into the gateway's own state directory — `join(homedir(), ".tsurezure", "effectiveness.jsonl")` at `effectiveness.mjs:36-39` — matches none of the four patterns, because the directory name is never adjacent to a `/` in the source text.

So the guard catches the mention and misses the construction: the use-vs-mention class kogaki#41 fixed once, one surface over, on a check rather than on a report token. Recorded rather than filed — the value here is the count of guards whose coverage turns on the literal form a path happens to be written in.
