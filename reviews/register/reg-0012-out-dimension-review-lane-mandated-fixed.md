---
id: reg-0012
status: pending
observed_at_pr: 276
observed_at_head: 8e23ae7
class: out-of-dimension
recorded: 2026-08-08
source_comment: 5224937888
---
out-of-dimension: the review lane's mandated fixed first move — an unscoped tier-1 `gloss_index` survey — is unperformable in context as served. The tier-1 index returns 73,485 characters on a single line; the tier-2 `lessons/knowledge-architecture` shard returns 126,754. Both exceed the readable output limit, and because each is ONE line neither is chunkable by `Read` offset/limit — the harness itself suggests byte slicing, which `.claude/skills/review-lane/SKILL.md` puts out of scope for a per-PR review. The working path this sitting was a targeted `Grep -o` against the saved tool-result file for the specific served sentence, which verifies content but not line position: the report for PR #276 carries a `cannot-determine:` on the line offsets of `gloss/lessons/knowledge-architecture.md:287` and `:209` for exactly this reason.

Every sitting of this lane pays the same cost and improvises the same workaround, so this is an instrument gap rather than a per-review task — the same class as kogaki#65 item 3, where the sweep got a denial extractor instead of each reviewer re-deriving one. What would close it: a line-addressed or paginated read of a gloss shard (or a survey mode returning headlines only, which is what the fixed first move actually needs).

Observed on PR #276 (head `8e23ae7`).
