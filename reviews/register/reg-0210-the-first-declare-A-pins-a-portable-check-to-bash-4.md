---
id: reg-0210
status: pending
observed_at_pr: 771
observed_at_head: 4fb415c
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #771 round 2 — `checks/check-draft-cites.sh` introduces the
repository's **first** `declare -A`. `git grep -ln 'declare -A' -- checks tools
src .claude` returns that file alone.

That pins the member to bash 4+ where every other check in `checks/` is
portable. The script runs under `set -uo pipefail` with no `-e`, so on a bash 3.2
host — stock macOS — the `declare` errors, `${SWEEP_KNOWN[$f]+set}` reads an
unset index-0 element for every path, and all three anchored sites are reported
as surviving literals.

**The failure direction is the benign one** — a loud false failure rather than a
silent pass — but it is a false failure in the member that gates the rename, and
it would meet a contributor before CI does. CI is `ubuntu-latest` and the run at
this head is green, so nothing is broken today; what is new is an **undeclared
dependency**.

Two shapes would close it: an associative array is not required — two parallel
indexed arrays, or a single `file:count` string list parsed on `:`, carry the
same anchor portably. Whichever is chosen, the dependency should be stated where
the member declares its other preconditions rather than left to be discovered by
the first person on the wrong bash.

**Not fixed at the head that produced it**, for the reason reg-0209 records: the
bound was spent and the report certified `4fb415c`.
