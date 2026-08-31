---
id: reg-0184
status: pending
observed_at_pr: 720
observed_at_head:
class:
recorded: 2026-08-31
source_comment: 5472763976
---
Two entries from PR #720 round 2 (kogaki#638, the kit's pin surfaces). Both are
`nit`, both non-blocking, both authored by the sitting that was repairing this
very class, and both verified before recording.

## 1. A guard placed beside its own subject cannot fail

`policy/kit/test/install-test.sh` — the sandbox assertion
`[[ "$HOME" == "$TMP/home" ]]` sits directly under `export HOME="$TMP/home"`,
with only a `mkdir` and comments between. Nothing can change `$HOME` in that
gap, so **the assertion is tautological**: it guards no install and reads as
coverage of the thing it names.

**The compounding half, and the reason this is worth the register rather than a
shrug.** Its break test was CIRCULAR. The mutation used to "prove" it fires was
`export HOME="/tmp/not-the-sandbox"` — editing the very line the assertion
compares against. A tautological assertion and a real one are indistinguishable
under a mutation that edits their own premise, so the break test reported a
pass and the commit message recorded that pass as evidence.

**What would discriminate**: capture the operator's real HOME *before* the
export and compare against that, or assert at the first install rather than at
the assignment — a site where a later edit could plausibly separate the two.

**The general shape.** A guard is only as good as the distance between it and
what it asserts about. Placed adjacent to its own premise it is a restatement,
and its mutation test inherits the same adjacency — so the usual evidence
(break it, watch it fire) cannot tell the two apart. **A break test must mutate
the SUBJECT, never the assertion's own premise**, and where those are the same
line the guard is in the wrong place.

## 2. A sandbox comment claiming more than the sandbox delivers

Same file — the comment states "the resolution finds nothing (so a bare install
takes the honest not-configured branch it is supposed to take under test)", but
only ONE of the gateway resolution's three sources is sandboxed.
`policy/kit/install.sh:28` reads `$TSUREZURE_GATEWAY_JS` *before* the
`~/.claude.json` read, and that variable is inherited from the operator's
environment, so on a machine exporting it the bare installs resolve and spawn
the real gateway.

**Inert, and stated anyway**: no config is mutated (the registration still lands
in the sandbox) and no assertion depends on the branch, so nothing flakes. The
defect is the claim, not the behaviour.

**Known locally, not hoisted** — cases at `:368`, `:390` and `:409` already
clear `TSUREZURE_GATEWAY_JS` explicitly, which is the tell: the gap was
understood at three sites and never lifted to the file-level sandbox that now
claims to cover it.

**What would discharge it**: clear the variable beside the `export HOME`, so
the sandbox covers every source the comment says it does.
