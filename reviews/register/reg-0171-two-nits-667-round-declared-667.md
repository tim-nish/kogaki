---
id: reg-0171
status: pending
observed_at_pr: 667
observed_at_head:
class:
recorded: 2026-08-26
source_comment: 5424545956
---
**Two nits from PR #667 round 1, declared `carried: register`.** PR #667 is kogaki#665's implementation; both are recorded here because this repository declares no `observation_register` in `.claude/story-sync.json`, and promotion to a full-cost carrier is an explicit act rather than the default sink.

**1 — the per-state grammar binding is satisfied by a naming coincidence.**

> `terrain/terrain.mjs:3814` and `:3828` — `writeScreenSurface(args, st.id, text)` passes the STATE ID where the table declares a separate field for the binding: `workflow.json`'s `grammar_surface` ("Names the report-format.json surface whose line_class allowlist governs THIS state's render. This is the per-state binding v3 introduces"). The two agree only because `tag_screen` and `tag_row_view` happen to be named identically on both sides, so v3's per-state binding is satisfied by a naming coincidence rather than read.

Correct, and worth the row: the field's value is a phrase (`"tag_screen in report-format.json"`) rather than a bare surface name, which is presumably why it was not read. Reading it would need either a parse of that phrase or a schema change to carry a bare name beside it — a decision, not a repair, which is why it is a row here rather than a change in that PR.

**2 — a retained generator for output the artifact declares removed.**

> `terrain/terrain.mjs:634-673` — `composeScreenText` retains the untagged generator whose output `report-format.json` v10 declares "removed with `view`" (the `if (!tags)` branches, the `"no relation"` fallback at :659, the tag-scoped-headlines line at :672). Both callers pass a tag, so it is unreachable rather than emitting — but §15.7's own consulted ground is source-removal precisely because "a retained generator regenerates what a ban forbids", and the artifact now asserts a removal the source only makes unreachable.

Also correct, and it is the sharper of the two: §15.7 declined a debug-only flag on exactly this reasoning, and an unreachable branch is a weaker form of the same retention. The reason it is a row rather than a repair is that removing the branches changes `composeScreenText`'s shape while `renderTagRowView` is its only caller, so the honest move is to collapse the two — which is a refactor with its own review surface, not a line edit inside a round-1 repair.

**Ranking, so the rows can be ordered rather than only counted.** (2) is the more reachable: a future caller passing no tag would emit output the artifact declares removed, and nothing would refuse it — the grammar guard fires on the line classes, and the untagged branches produce lines `tag_row_view` does not admit, so it would refuse *late* rather than not at all. (1) cannot produce wrong output today; it produces a binding that is right for a reason nobody chose, and it breaks the first time a surface and a state are named differently.
