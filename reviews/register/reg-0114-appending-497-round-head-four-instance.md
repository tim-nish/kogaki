---
id: reg-0114
status: pending
observed_at_pr: 497
observed_at_head: 4966afb1251a501d287cb4a645b24c1e6e9a492d
class:
recorded: 2026-08-17
source_comment: 5317022520
---
Appending from PR #497 round 1 (head `4966afb1251a501d287cb4a645b24c1e6e9a492d`) — four **instance-class** rows (latent, non-gating, in-diff findings carried here; kogaki#374). **None is an `out-of-dimension:` row**, so none counts toward rule 3's three-of-a-class widening trigger.

1. **instance-class** — `brief/compose.mjs:154`: composer-authored text is passed as `String.replace`'s replacement argument, so `$&`, `` $` ``, `$'`, `$$` and `$<n>` in a rationale, proposition, `role_in_thesis`, obligation text or unused-reason are substitution patterns and silently rewrite the owner Brief. All three fill slots share the path. Remedy: a function replacement.
2. **instance-class** — `brief/compose.mjs:103-123`: the fenced `key: value` Step serialization (story 1.73 SQ1's recorded form, read by story 1.74's path review) has no escaping and no stated value grammar; a newline renders as an unkeyed continuation line and a ``` fence terminates the record early.
3. **instance-class** — `brief/compose.mjs:44-54`: `validateSteps` guards the label with `s && s.step_id` and then dereferences `s.step_id` unguarded, so a null element throws a TypeError instead of the named §4.1 refusal.
4. **instance-class** — `brief/compose.mjs:40` vs `:148` vs `brief/brief.mjs:77`: the unfilled-slot literal exists three times with no shared source and the named constant is unused; a mint-side slot change leaves every Brief refused as "already filled".
