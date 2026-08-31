---
id: reg-0053
status: pending
observed_at_pr: 393
observed_at_head:
class:
recorded: 2026-08-12
source_comment: 5266073281
---
**Row kind: `out-of-dimension:` — accretion-class** (kogaki#374's disambiguation; countable toward rule 3's three-of-a-class trigger, not a spent-bound in-diff carry).

out-of-dimension: PR #393, round 2 — `git check-ignore` is **ungranted** to the review lane, while `git log`, `git diff` and `git show` are granted. The refusal is only discoverable by spending a turn on it, and it arrived inside a compound command, so the whole compound died with it (the granted `git cat-file -e` members in the same line went with it, and `git cat-file -e` was then terminal for the session — which is the head-sha verification `.claude/skills/review-lane/SKILL.md` prescribes under *READ THE SHA AS A VALUE*).

Two things this costs a future reviewer, recorded once so nobody re-probes:

1. **The skill's own prescribed sha check is not reachable by its prescribed command.** `git cat-file -e <sha>^{commit}` is the substrate-establishment step the skill names; on this round it was denied. A granted substitute exists — a bare `git show <sha>` that resolves establishes the commit just as well — but the skill still names the denied form, so each round pays the discovery.
2. **Class of grant, not a one-off.** `check-ignore` sits with `log`/`diff`/`show` as a pure read; its absence looks like an allowlist gap rather than a design decision, in the same shape kogaki#310 recorded for shell `grep`. Stated as an observation, not a diagnosis — the allowlist is not readable from inside a review.

The per-review consequence was bounded: the finding it would have witnessed (round 1's `moves.md` anchoring nit) was resolvable from the pattern text, so the round lost a second witness rather than a dimension, and the report carries it as a `cannot-determine:` line.

*(Appended by the review lane per SKILL.md's "What a review reads" clause — the lane's second register-producing clause, binding to this carrier under rule 5.)*
