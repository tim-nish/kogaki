# SPEC-external-deps — the capabilities this repository needs but cannot install

**Status:** v1, authored 2026-08-05 (kogaki#55).
**Governs:** the declared enumeration of external dependencies, its
verification reads where decidable, and its non-member fallback.

## 1. The defect this carrier answers

The specimen is the held run on PR #51. Three obstacles stopped the pipeline
and were **one defect**: capabilities the repository NEEDS but cannot install
— the spawned reviewer's tool grants, the repository's `allow_auto_merge`
setting, the merge deny's install state — were all **assumed, none declared**.

An unmet dependency therefore presented as a stall, or as a grant that was
silently impossible to exercise. Both are indistinguishable at read time from
a grant that simply has not been needed yet, which is the property that makes
the class expensive: the run fails in a way that looks like it is working.

The served surface names the general shape, and this spec is its instance at
the needed-capability layer:

> The four staged findings are ONE finding at four sites, and the delta over
> the corpus is a FOURTH RUNG: a carrier is not installed until every input it
> reads has a producing site, checkable by enumeration.

`consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece topics/claude-code-ops.md:36`

The rung this spec adds is the mirror image on the other side of the boundary:
an input whose producing site is **outside the repository**, which no
enumeration of this repository's own writers can ever reach. The check-registry
pattern is what makes it enumerable anyway — the suite runs only what is
registered, so an unregistered member is dead code rather than a policed
behaviour — and this spec applies that move to external dependencies.

## 2. The enumeration and its home

Every external capability this repository needs is declared in
`deps/registry.json`. The registry is the enumeration against which coverage
is measured, and an undeclared dependency is the thing that fails — rather
than a run that stalls.

**It is a separate artifact from `checks/registry.json` and from
`gates/registry.json`, and the argument is mechanical before it is
philosophical**, exactly as `specs/spec-gate-carrier/SPEC.md` §2 argues for
its own separation.

Every entry in the check registry names a `file` that must exist under
`checks/`, and `checks/check-registry-conformance.sh` fails any entry that does
not — an external dependency has no file in this repository by definition, so
a dependency row would be a dangling entry by construction. The admission
record there is check-loop economics (`tier`, `runtime_ms`, `removal_signal`;
`checks/registry.json:2-7`), and an external dependency has neither a runtime
nor a loop position. The gate registry's admission is medium and evidence, and
a dependency raises no gate.

What an external dependency's admission record *is*, and what neither sibling
carries: **the read that decides whether the capability is currently present**,
and **the signature its absence leaves behind**. Same coverage discipline,
different admission economics, so three artifacts.

**A fourth registry owes a harder argument than this one did.** Recorded here
rather than left implicit: the "each states its own mechanical why-separate"
answer is the discipline while the registries are few and each separation is
forced by a field the others cannot hold. It stops being a discipline the first
time a proposed separation cannot name such a field, and that is the trigger to
reconsider the shape rather than to add a member.

**`policy/CAPABILITIES.md` is not the home, and the reason is a boundary rather
than a preference.** It opens with `<!-- tsurezure-client-kit:file (managed —
replaced by install.sh while this marker is present) -->`: it is kit-owned and
carries the **served** half — capabilities the substrate offers this repository.
The needed half is repo-specific, and siting it in `policy/` would make the kit
the owner of a list about its consumer, which is the boundary `policy/kit/`
exists to keep.

## 3. The entry shape

The machine-readable shape is `specs/spec-external-deps/deps-schema.json`.
`checks/check-external-deps.sh` reads its field lists rather than restating
them, so amending the contract is one edit and never a two-copy divergence —
the same arrangement `specs/spec-gate-carrier/gate-schema.json` uses.

Each entry declares:

- **`capability`** — what is needed, named as the thing rather than as its
  consumer.
- **`needed_by`** — which acts break without it. Non-empty: a capability
  nothing needs is not a dependency, and the field is what makes a stale entry
  removable rather than permanent.
- **`verification`** — the read that decides presence, **where decidable**: a
  command whose output answers the question (`gh api repos/:owner/:repo --jq
  .allow_auto_merge`; a presence read over `~/.claude/settings.json` for the
  PreToolUse deny). Where no cheap read exists, the field carries
  `none: <why not decidable>` — a typed value that must be written, never an
  omission.
- **`absence_signature`** — what an unmet dependency *looks like* from inside a
  run ("the spawned session completes blocked at the permission wall and exits
  report-less"). This field is the one that answers §1's defect directly: it is
  what converts an unexplained stall into a recognised one.
- **`license`** — the issue that admitted the entry.

**`verification: none: <reason>` is a first-class value, not a failure.** The
discipline is the one `/ship-cycle`'s trust-environment line already states for
its own flags: a partial audit reporting only its positives is
indistinguishable from a complete one. An entry that says it cannot be checked
is evidence; an entry that quietly omits the field is not.

## 4. The non-member fallback

**The load-bearing half of this enumeration is not completeness, which is
unachievable, but the behaviour at a non-member.**

> For an enumeration of admissible kinds the load-bearing half is not
> completeness, which is unachievable, but the non-member fallback — surface
> anything outside the list as report-only with its reason, or declare it out
> of scope.

`consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece LESSONS.md:103`

So: a capability an act depends on and the registry does not declare is
**surfaced report-only with its reason**, never silently admitted and never
treated as present. The fallback is ADMIT-WITH-DISCLOSURE rather than
ADMIT-SILENTLY, which is the whole difference between this shape and the
prohibition-accretion shape it would otherwise become:

> Per-repo installation is the prohibition-accretion shape in mechanical form:
> it makes coverage an ENUMERATION OF REPOS, so repo N+1 is uncovered by
> default and each new consumer silently re-opens the hole.

`consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece topics/claude-code-ops.md:54`

Dependency N+1 is uncovered by this registry too — that is unavoidable for any
enumeration. What is avoidable is its being uncovered **silently**, and the
fallback is the whole remedy.

## 5. Report, never gate

**An unmet dependency is reported. It never fails the check and never withholds
a lane.**

The check fails only on a **malformed or incomplete registry entry** —
conformance — exactly as `check-consult-receipts.sh` "fails only on a
malformed receipt, never on the count" (`checks/registry.json`). Whether a
dependency is met is a fact about the world outside this repository, which
changes without anyone touching the diff under review; failing a PR because a
setting elsewhere flipped would make the gate a source of noise rather than of
signal.

This is the same resolution `specs/spec-merge-eligibility/SPEC.md` §"Why the
environment precondition is a report, not a gate" records, and it is cited
rather than re-derived. A future proposal to make an unmet dependency blocking
answers that section.

The report has two consumers, and both read the one registry:

1. **The pre-push check** — conformance of the registry itself, plus the
   decidable verifications run and rendered, including their `none:` rows.
2. **A run's preflight** — the reporting surface a driver already emits. In
   this repository that is the review sweep's route log; `/ship-cycle`'s
   trust-environment line is the same read one layer up, and it is why the
   toolkit-side half of kogaki#55 is filed separately rather than here.

## 6. What this spec does not govern

It does not govern **which** capabilities are declared — that is the registry's
content, admitted one entry at a time under its own licensing issue. It does
not govern the served half (`policy/CAPABILITIES.md`, kit-owned). It does not
govern the spawned session's grant list itself (kogaki#60 declares that
contract; this registry is where the declaration registers).
