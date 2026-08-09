# The ONE head-resolution unit — specs/SPEC.md §4 clause 7 v2 (kogaki#308).
#
# WHY THIS FILE EXISTS. `decide()` in `tools/review-sweep.sh` and the merge
# gate in `checks/check-review-report.sh` ask the SAME question — is this head
# reviewed? — and answered it with two different units: the sweep by SHA
# IDENTITY, the gate by DIFF HASH. When a head moves without changing content
# the two disagree, and the one that disagrees is the one that spends the
# bounded resource: with rounds remaining the sweep returns `spawn-round-N` and
# pays an owner grant and a review round to re-read a byte-identical diff.
# Live specimen: PR #307, head ae9d85f, merged 2026-08-09 on a green gate while
# the sweep reported `PARKED — 2 rounds spent and ae9d85f is still unreviewed`.
#
# Clause 7 v2 mandates a PROPERTY, not a mechanism — "one definition and an
# agreement fixture" — and names the fork it left open as
# `deferred-slot: the shared head-resolution unit's CARRIER`. THIS FILE FILLS
# THAT SLOT with the third-carrier arm: a module both consumers load, rather
# than a source string one file reads out of the other.
#
# WHY THE THIRD CARRIER RATHER THAN THE `TERMINAL_KEY_SRC` SHAPE. That
# precedent (`tools/review-sweep.sh`) embeds one rule as a source STRING
# because its second consumer is a GENERATED PROGRAM written to a temp file —
# there is no importable module at the other end. Here both consumers are
# ordinary files on disk in one repository, so a string would buy the same
# single-definition property while adding an extraction step that can fail
# silently. The property is what clause 7 v2 mandates; the mechanism is chosen
# per site, and the slot said so.
#
# WHY IT IS NOT UNDER `checks/`. `checks/check-registry-conformance.sh:465`
# fails an unregistered file directly inside `checks/` as dead code. A
# subdirectory would escape that scan, but siting a unit BOTH lanes consume
# under one lane's directory misreports its ownership — the gate does not own
# it any more than the sweep does.
#
# WHY THE SEGMENT PARSER IS INJECTED RATHER THAN SHARED. The two consumers
# have SEPARATE `segments()` implementations whose records differ (the sweep
# carries `bad_disp`, the gate carries `cannot`). Unifying those is a strictly
# larger change than clause 7 v2 mandates, and doing it here would smuggle a
# second decision into a slot that named one. `carry_forward` therefore takes
# the caller's parser and reads only the keys both records carry: `sha` and
# `base`.
#
# THE GIT READS ARE INJECTED, and that is a constraint rather than a
# consequence — clause 7 v2 states it explicitly. `decide()` is fixtured with
# no repository and no network, so an implementation reaching for git in here
# would break the caller's testability even where it computes the right answer.
#
# THE SERVED POSITIONS THIS DESIGN RESTS ON. That the unit is NAMED rather
# than merely shared is a requirement rather than a preference:
#
#   > The DETECTOR'S UNIT must match the PROPERTY'S UNIT, and the unit of
#   > enforcement is derived from the policy's violation, never inherited from
#   > the gate family the policy joins.
#
#   consulted: product-lab@ce945eb129fd98c5f568256513fc081443eb0a5e topics/knowledge-architecture.md:98
#
# The sweep's unit was INHERITED — sha identity, from the segmenter it shares
# with the round counter — rather than derived from clause 7's violation,
# which is a CONTENT equality. And the failure mode of two closed answers
# under one question is itself served:
#
#   > When two or more closed value sets share one field name, every
#   > definition passes its own check and nothing is positioned to observe
#   > that the NAME is overloaded.
#
#   consulted: product-lab@ce945eb129fd98c5f568256513fc081443eb0a5e LESSONS.md:16
#
# Here the overloaded name was "this head", and the two definitions each
# passed their own file's fixtures for months.

import hashlib


def same_head(a, b):
    """Do these two shas name the same head? Abbreviations match either way.

    The same predicate `head_segments()` applies, lifted out so the cycle
    count and the presence side cannot drift apart on what "this head" means.
    """
    return bool(a) and bool(b) and (a.startswith(b) or b.startswith(a))


def head_segments(segs, head, carried=()):
    """The segments naming THIS head — abbreviated shas match either way.

    `carried` holds the shas of segments PROVEN to have reviewed this head's
    content (§4 clause 7): a carried segment is this head's segment for every
    purpose below — presence, open-blocking, completeness and scope — because
    the clause admits a second instrument for the same pin, not a second class
    of report. Default empty, so a caller that does not ask for a
    carry-forward behaves exactly as it did before this unit existed.
    """
    return [s for s in segs
            if same_head(head, s['sha']) or s['sha'] in carried]


def digest(text):
    """A short, re-computable name for a diff — `sha256:<12 hex>`.

    The record names the RANGES and this digest rather than pasting two diffs
    into a gate's output: the ranges are what a reader re-runs, and the digest
    is what they compare their own result against. `sha256(git diff output)` is
    reproducible by anyone holding the repository.
    """
    return "sha256:" + hashlib.sha256(text.encode('utf-8')).hexdigest()[:12]


def carry_forward(bodies, head, base_b, diff_at, merge_base, segments):
    """§4 clause 7: which segments PROVABLY reviewed this head's content.

    Returns (carried, record) — the shas that carry forward, and the lines that
    NAME what was compared. The equality is RECOMPUTED AND RECORDED, never
    assumed: `record` carries each `base..rev` range and its digest for both
    sides, so a later reader re-runs the comparison instead of trusting it. A
    carry-forward that left no record is the silent re-derivation clause 7
    forbids at its pin.

    Both git reads are INJECTED rather than called here — `diff_at(base, rev)`
    returning the diff text or None, `merge_base(a, b)` returning a sha or None
    — so a fixture pass exercises every branch with no repository and no
    network. `segments` is injected for the same reason and one more: the two
    consumers parse segments differently, and clause 7 v2 shares the
    RESOLUTION, never the parser.

    A's base is READ from its `review-base:` line whenever it recorded one
    (resolution (c)). A base-less report — every report written before the
    field shipped — falls back to the MERGE-BASE at A (resolution (b)) and
    never to the PR's current base (resolution (a)): (a) takes both diffs
    against one base, which makes a base move invisible, and a fallback that
    fails open on this clause's own counter-example is worse than no
    carry-forward at all. The fallback is transitional and keyed on the line's
    absence alone.

    A CONSUMER WHOSE SEGMENTS CARRY NO `base` KEY GETS THE TRANSITIONAL
    FALLBACK, never a crash — `seg.get('base')` rather than `seg['base']`.
    That is not defensive coding: `tools/review-sweep.sh` shipped for months
    with a parser that never read `review-base:` at all, and a unit that
    raised on such a record would make adopting it a flag day.

    Anything uncomputable — an unresolvable base, an unreadable revision — is
    NOT a carry-forward. It leaves `carried` empty, the caller keeps the
    existing `stale` state, and the reason is still named in `record`.
    """
    record, carried = [], []
    diff_b = diff_at(base_b, head) if base_b else None
    if base_b is None:
        record.append("carry-forward NOT computed: the PR's current base could "
                      "not be resolved, so there is nothing to compare against "
                      "— stale, failing toward the reviewed side")
        return carried, record
    if diff_b is None:
        record.append(f"carry-forward NOT computed: the diff "
                      f"{base_b[:7]}..{head[:7]} could not be read — stale, "
                      "failing toward the reviewed side")
        return carried, record
    record.append(f"carry-forward candidate: this head's diff is "
                  f"{base_b[:7]}..{head[:7]} [{digest(diff_b)}]")
    for seg in segments(bodies):
        a = seg['sha']
        if head.startswith(a) or a.startswith(head):
            continue                      # already this head's own segment
        if seg.get('base') is not None:
            base_a, how = seg['base'], "recorded `review-base:` (resolution c)"
        else:
            base_a = merge_base(base_b, a)
            how = ("merge-base at A — the report records no base, so clause 7's "
                   "TRANSITIONAL fallback (resolution b)")
            if base_a is None:
                record.append(f"  {a[:7]}: no carry-forward — the report records "
                              "no base and the merge-base could not be resolved")
                continue
        diff_a = diff_at(base_a, a)
        if diff_a is None:
            record.append(f"  {a[:7]}: no carry-forward — the diff "
                          f"{base_a[:7]}..{a[:7]} could not be read ({how})")
            continue
        same = diff_a == diff_b
        record.append(f"  {a[:7]}: reviewed {base_a[:7]}..{a[:7]} "
                      f"[{digest(diff_a)}] via {how} — "
                      f"{'IDENTICAL, carries forward' if same else 'DIFFERS, stale'}")
        if same:
            carried.append(a)
    return carried, record


# --- The diff FORM is part of the resolution, not part of the caller -------
#
# THIS IS THE HALF THAT WOULD HAVE FAILED SILENTLY. `carry_forward` compares
# two diffs for BYTE equality, so the flags used to render them are as
# load-bearing as the comparison itself: a consumer that omitted
# `--no-color`, or inherited a different `diff.context` from someone's git
# config, would produce a different string for identical content, every
# carry-forward would miss, and the unit would report "DIFFERS, stale" while
# being perfectly shared. That failure is invisible at every layer — the code
# is one definition, the fixtures pass, and the answer is quietly wrong.
#
# So the FORM lives here and only the RUNNER is injected. `make_git_readers`
# takes one `run_git(*args) -> str | None` — a read that returns stdout on
# success and None on any failure, which is clause 7's fail-toward-the-
# reviewed-side input — and returns the `(diff_at, merge_base)` pair
# `carry_forward` expects.

DIFF_ARGS = ("--no-color", "--unified=3")


def diff_range(base, rev):
    """The three-dot form, which is what a PR diff IS: the changes on `rev`
    since it diverged from `base`, never `base`'s own later commits."""
    return f"{base}...{rev}"


def make_git_readers(run_git):
    """(diff_at, merge_base) over one caller-supplied `run_git(*args)`.

    The caller owns HOW git is run — subprocess flags, error handling, whether
    a failure is logged — and this owns WHAT is run, because the what is the
    part the two consumers must agree on.
    """
    def diff_at(base, rev):
        return run_git("diff", *DIFF_ARGS, diff_range(base, rev))

    def merge_base(base, rev):
        out = run_git("merge-base", base, rev)
        return out.strip() if out and out.strip() else None

    return diff_at, merge_base


# --- How the two consumers reach this unit --------------------------------
#
# Both live in files named `*.sh` that run their Python under a
# `python3 - <<'EOF'` heredoc, so the ordinary import machinery is not
# available to them and `__file__` does not exist. Both also `cd` to the
# repository root before the heredoc, so a fixed relative path resolves. The
# recipe is four lines and is IDENTICAL in both, which is the point:
#
#     HEAD_RESOLUTION_PATH = "lib/head_resolution.py"
#     with open(HEAD_RESOLUTION_PATH, encoding="utf-8") as _fh:
#         exec(compile(_fh.read(), HEAD_RESOLUTION_PATH, "exec"))
#
# A consumer that hand-rolled a DIFFERENT reach — a copy, a re-declaration, a
# second path — would be the two-instruments shape reappearing one layer down,
# in the wiring rather than in the rule. The agreement fixture in each
# consumer is what makes that detectable rather than merely discouraged.

HEAD_RESOLUTION_EXPORTS = ("same_head", "head_segments", "digest",
                           "carry_forward")
