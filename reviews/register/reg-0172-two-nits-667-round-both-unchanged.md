---
id: reg-0172
status: pending
observed_at_pr: 667
observed_at_head:
class:
recorded: 2026-08-26
source_comment: 5424735294
---
**Two nits from PR #667 round 2 — both unchanged from round 1, and one of them got worse.** PR #667 merged as `068f6c4`. Recorded here as `carried: register`; this repository declares no `observation_register`, so the register issue is the sink.

**1 — the grammar-surface coupling now has two spellings** (`terrain/terrain.mjs:3847`, `:3861`, `:1088`)

> `writeScreenSurface(args, st.id, text)` passes the STATE ID where `workflow.json` declares a separate `grammar_surface` field for the binding, and the two agree only because `tag_screen` and `tag_row_view` happen to be named identically on both sides. The `cotag_screen` site at `:1088` passes a **string literal** instead, so the tree now has two spellings of one coupling and neither reads the declared field.

Round 1 raised this with two call sites agreeing by coincidence. PR #667's fix for a *different* finding — routing `cmdCotags` through the one writer — added a third call site that passes a literal, so the coupling is now expressed two ways and read from the declared field zero ways. The blocker on reading it properly is unchanged: `grammar_surface`'s value is a phrase (`"tag_screen in report-format.json"`) rather than a bare surface name, so honouring it needs either a parse or a schema change — a decision, which is why this stays a row.

**2 — a retained generator for output the artifact declares removed** (`:659-685`)

> `composeScreenText` retains the untagged generator whose output `report-format.json` v10 declares "removed with `view`" — the `if (!tags)` branches, the `"no relation"` fallback at `:668` and the tag-scoped-headlines line at `:681`. It is now reachable from ONE caller (`renderTagRowView`, which always passes a tag), so it is dead rather than emitting, but §15.7's own consulted ground is source-removal precisely because "a retained generator regenerates what a ban forbids", and the artifact asserts a removal the source only makes unreachable.

Narrower than at round 1 — one caller rather than two — and the objection is unchanged: §15.7 declined a debug-only flag on exactly this reasoning, and an unreachable branch is a weaker form of the same retention. It stays a row because removing the branches means collapsing `composeScreenText` into its single caller, which is a refactor with its own review surface.

**Ranking.** (2) is the more reachable: a future caller passing no tag would emit output the artifact declares removed. It would refuse *late* — the untagged branches produce lines `tag_row_view` does not admit, so the format guard fires — but late is not never, and the artifact's claim would already be false. (1) cannot produce wrong output today; it produces a binding that is right for a reason nobody chose, and it now has two spellings to keep accidentally correct instead of one.
