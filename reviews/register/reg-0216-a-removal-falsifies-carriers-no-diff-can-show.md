---
id: reg-0216
status: pending
observed_at_pr: 778
observed_at_head: f6af63f
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #778 round 2 — the removed-filename sweep **did not reach
`.gitignore`**, and two of its rationale blocks are falsified there.

1. **`.gitignore:83-89`** states the tracking criterion for the two re-included
   `SKILL.md` files as *"the check is the enforcement: `check-brief-entry.sh:796`
   asserts /brief's completion stages against its skill … and
   `check-terrain-composition.sh:473` asserts the co-tag step is named in
   terrain's"*. **Both enforcers are deleted.** The criterion still holds under
   different members — `check-brief-compose.sh` reads the brief skill as the
   re-homed case (n), and `check-terrain-retired-vocabulary.sh` carries
   `.claude/skills/terrain` in its asserted root list — so the re-includes are
   **not wrong; their justification is.** This is a tracked file whose whole
   purpose is to record why an exception to the ignore exists.

2. **`.gitignore:119-127`** is now **dead configuration**: six lines justifying
   `/.gate-path-check-*` entirely by *"check-terrain-workflow.sh mints ONE run
   workspace at the repository root, on purpose"*. `git grep gate-path-check`
   returns that line and nothing else. The minter is gone, so the window the
   ignore was written to close cannot open.

**The class, one step further out than the four instances the PR already
records.** A removal falsifies every carrier that *named* the removed member,
and none of those carriers appears in a deletion diff. The PR found four by
grepping the removed filenames across `checks/`, `src/` and `tools/` — and
stated that grep as the method in its own round-1 response. **The method was
right and its ROOT SET was short.** `.gitignore` is not a code path, carries no
check, and is read by nobody mechanically, which is exactly why it was not in
the roots and exactly why nothing will ever report it.

The sharper form: *a sweep's roots are chosen from where the author expects
references to live, and a configuration file's rationale prose is the last place
anyone looks for a reference to a check.*

**Neither is visible to any registered check.** `.gitignore` prose is read by
nobody, and `check-terrain-retired-vocabulary` does not scan it.

**Not fixed at the head that produced it, and NOT routed where the reviewer
routed it.** Round 2 carried both to kogaki#770 — which **this merge closes**,
so an append there would land on a closed carrier, the kogaki#13 shape the
vitality gate's closed-carrier prong exists for. The bound was spent and the
round-2 report certified `f6af63f`, so the register is the route:
`consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154`.

**Worth keeping on its own:** a finding routed to the issue the PR closes is a
defect in the ROUTING, not in the finding. The carrier's state at merge is
knowable when the route is chosen.

Tenth instance in the 2026-09-02 sitting of that composition; see reg-0206 to
reg-0215.
