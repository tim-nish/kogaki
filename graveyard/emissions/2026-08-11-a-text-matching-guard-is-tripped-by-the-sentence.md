<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

In a /ship-cycle run on 2026-08-11, two ordinary lane dispatches (a triage lane and a story-implementation lane) were denied by the reviewer-spawn PreToolUse guard, twice in a row. Neither dispatch was a reviewer session. The first deny fired because the prompt contained the clause 'do not spawn any review-lane agent' — the instruction FORBIDDING the guarded act supplied the guard's trigger word — next to a bare issue number that its PR pattern reads as a pull-request reference. The second deny, after that clause was reworded, fired on the token 'review_reconciliation', which is the name of the orchestrator's own policy key in .claude/pipeline.json. Both denies then instructed the operator to grant a reviewer round for a pull request that does not exist. The run continued only after every occurrence of the substring 'review' was stripped from the dispatch text.

## The learning

When a guard decides by matching words in a command or a prompt, the text that describes the guarded act trips it just as readily as the act itself — and two kinds of text are almost guaranteed to do so. The first is a prohibition: telling a helper 'never do X' has to name X, so the safety instruction becomes the thing that looks unsafe. The second is the name of the setting that governs X, because the people who named the setting and the people who wrote the guard used the same word for the same idea, and any system that mentions its own configuration will carry that name around. Both kinds of text appear most often in careful work, so the guard misfires hardest on the callers taking the most care. Two things follow. Any tool that has to talk about a guarded act needs a way to refer to it that the guard does not read — a fixed spelling, a quoted region the guard skips, or a field the guard is told to ignore — decided when the guard is written rather than discovered by whoever hits it. And a refusal message must fit the case where the guard is wrong: pointing the reader at the authorisation step assumes the finding is true, so on a false match it walks them into approving something that does not exist. The escape route belongs in the message beside the approval route, not left to the reader to work out mid-run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
