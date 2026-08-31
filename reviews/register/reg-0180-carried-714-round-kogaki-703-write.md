---
id: reg-0180
status: pending
observed_at_pr: 714
observed_at_head:
class:
recorded: 2026-08-30
source_comment: 5467717236
---
Carried from PR #714 round 1 (kogaki#703, the write-authority pointer repair).
One finding, non-blocking, assigned here by the round.

**A `§X.Y vN` pointer no longer resolves at the file it names.** PR #714
corrected three pointers to `§15.5 v28`, and after the #685 re-cut
`specs/spec-terrain/SPEC.md` holds no version ledger — the token `v28` appears
nowhere in it, and §15.5 sits unversioned. Every such pointer now resolves only
through git history and the issue threads.

**This is corpus-wide, not three sites.** `checks/*.sh` uses version tokens
throughout (`§4.1 v18`, `§5.3 v9`, `§5.1.3 v20`, `§5.3 v15`, and more), and
`terrain.mjs` carries six for §15.5 alone. The re-cut changed what the
destination holds without touching the pointers aimed at it, so the whole
population moved from resolvable to git-archaeological in one commit, silently.

**Why it was not decided at #714.** The run offered the convention question as
an arm at its scope gate and the owner selected the narrow repair, so #714
follows the surviving house convention rather than deciding against it for three
sites — which would have produced a split convention with nothing recording the
choice. Recorded here as the count rather than as this instance's defect.

**The served surface already names the shape.** `LESSONS.md:45` — a cross-system
reference is either re-resolved against current substrate, in which case it must
name a stable identity, or frozen at a named revision it is only ever read at,
in which case a positional form is valid provenance forever; the failure mode is
the third combination, positional AND live. A `vN` token against a file that
carries only the current contract is that third combination: the pointer asserts
a version the live file will never confirm.

**What would discharge it.** Either the operative specs regain a minimal version
stamp per section, or the convention drops the token and pointers name the
section alone (the form `workflow.json` already moved to at the re-cut). Both
are corpus-wide acts; neither is a #703-shaped repair.
