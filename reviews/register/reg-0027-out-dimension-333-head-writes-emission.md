---
id: reg-0027
status: pending
observed_at_pr: 333
observed_at_head: 65bc4d84
class: out-of-dimension
recorded: 2026-08-09
source_comment: 5232273459
---
out-of-dimension: **PR #333** (head `65bc4d84`) — `policy/kit/bin/emit.mjs` writes its emission with `writeFileSync` to `policy/emissions/<date>-<slug(title)>.md` and makes no existence check, so a second emission on the same date whose title slugs identically silently overwrites the first. The channel's whole purpose is a durable candidate that survives to a sweep days later, and this loses one with no output saying so. Outside both review dimensions — not a licence question and no map boundary — so it is recorded here rather than raised as a finding on the PR.

Class: **silent-overwrite in a write-only accumulation surface.** Noted so a third instance of the class is visible if one arrives.

Two dispositions from the same report also carry `carried: register`, both accretion-class:

- **Missing mutation evidence for new fixtures** (kogaki#230, `specs/SPEC.md` §4). PR #333 adds five fixture blocks (`install-test.sh` 2e–2h and `emit.mjs --self-test`) and the PR record carries no mutation table — the word appears in neither the PR body, the commit message, the story nor the spec. The value of this one is the count: if the mutation-table obligation is being met on some PRs and not others, that rate is the finding, and minting an issue per PR would be the accretion shape the register exists to refuse.
- **Tool-driven whole-file reserialization inside a small licensed edit.** PR #333's `checks/registry.json` change is three substantive lines on one entry inside an 86-line diff, the rest being every `\u`-escaped section sign and em dash in all ten entries turning into its literal UTF-8 character. Semantically null and green in CI; the cost is that a three-line governance edit arrives unreadable. Recorded for recurrence: if a registry or JSON governance file reserializes wholesale a third time, the writer that does it is the thing to fix, not the diff.
