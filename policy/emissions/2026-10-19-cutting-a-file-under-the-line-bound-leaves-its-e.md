<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-19
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1463 cut tools/move_ingest.py from 1,764 lines to a 367-line entry and four modules. Review round 1 on PR #1473 found the file still listed in both exemption lists of .claude/policy-check.json, which had landed on master while the cut was in flight, so the one check holding files to the bound still skipped the file just cut.

## The learning

When a file is cut to get under a declared bound, removing it from the exemption list is part of the same change, not a follow-up. The exemption list was written while the cut was in flight, so neither the Issue's footprint nor its Acceptance named it, and the bound check stays green whether the entry is there or not. Two more things the cut changed without breaking anything: a check that scans one file's source for names that must not appear there now reads only the entry, and the measuring tool counts docstrings as comment blocks, so counting only '#' lines misses some over-long blocks.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
