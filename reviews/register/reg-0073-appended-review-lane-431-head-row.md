---
id: reg-0073
status: pending
observed_at_pr: 431
observed_at_head: 091c432a9d647a0a756123c5307c0f7cbe288365
class:
recorded: 2026-08-13
source_comment: 5283613667
---
Appended from the review lane, PR #431 (head `091c432a9d647a0a756123c5307c0f7cbe288365`). Row classes declared per kogaki#374 — the trigger in rule 3 reads the accretion-class row only.

**accretion-class (`out-of-dimension:`, counts toward rule 3's three-of-a-class trigger)**

out-of-dimension: nothing in `checks/registry.json` runs `tools/review-sweep.sh`, so the sweep's large inline fixture pass — the evidentiary basis of PR #431 and of several before it — is exercised by no CI member and is verifiable only by a reviewer who can invoke the sweep. A reviewer whose invocation is refused cannot check it from CI at all. (PR #431.)

**instance-class (dispositions of non-gating findings left open; NOT counted toward any widening)**

These five are `carried: register` from PR #431's report. The primary path for each is resolution inside this review — rounds remain and every one lives in the diff's own text — so the register holds them only against the case where the PR merges with them open.

1. `should` — the stall announcement's else-arm tests `not _sub`, collapsing `""` (a terminal record with no `subtype`) into `None` (no terminal record) and printing "not recorded in the route log" about a record that is. This re-merges, one layer down and in the same commit, the distinction `terminal_subtype()` was written to keep and its fixtures assert. Remedy: one token.
2. `should` — the `deferred-slot: review-tier-size-threshold` decline cites "(owner selection 2026-08-13)" twice in `tools/review-sweep.sh`; kogaki#414's only comment records no such selection, and the PR's "Closes #414" retires the very issue the slot names as its fill-time carrier, with two of four acceptance items undischarged.
3. `nit` — `stall_lines()` takes `head`, discards it, and emits "escalate this head" without naming the head.
4. `nit` — `_stall_dir` (`tempfile.mkdtemp`) is never removed, unlike every other fixture temp dir in the file; one directory of five files leaks per sweep invocation, `--dry-run` included.
5. `nit` — consultation-map entry 1 prescribes two shards (`lessons/claude-code-ops` and `lessons/testing`); the branch's three receipts name only the first, while the commit prose asserts both were surveyed.
