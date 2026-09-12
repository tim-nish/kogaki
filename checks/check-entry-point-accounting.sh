#!/usr/bin/env bash
# check-entry-point-accounting — the reader for `entry_point_accounting`.
#
# THE CONTRACT WAS PROSE AND ITS ONLY READER WAS A PERSON WHO LOOKED
# (kogaki#986). `src/workflow.json`'s `entry_point_accounting` states an
# invariant over the runtime: EVERY case in `src/terrain.mjs`'s dispatcher
# appears in exactly one of the five maps beside it (`bound_to_a_state`,
# `removed_entry_points`, `retired_entry_points`, `non_flow_entry_points`,
# `owner_executed_entry_points`), and a case in none of them, or in two, is by
# that file's own sentence a defect against it.
#
# Nothing computed it. A `git grep` over all five map names at kogaki#986
# found no reader anywhere in the repository — only the declaration itself and
# one policy emission discussing it.
#
# THE SPECIMEN, which is why this is a member rather than an observation. At
# the head before kogaki#901 the invariant DID NOT HOLD: `run` was a dispatcher
# case in none of the five maps. It had stood through at least the #856 and
# #861 sittings, both of which edited these very maps, and it was found only
# because a pickup happened to compute the totality by hand while reading for
# something else. #901 repaired the gap; it did not give the invariant a
# reader. Arm (b) below reconstructs that exact specimen on every run.
#
#   "A contract carried in prose and tested by asserting the prose still says
#   it produces a suite that is green about the document and silent about every
#   run — it cannot observe behaviour or compute the quantity the contract is
#   defined over, so it is green in exactly the state the contract forbids; the
#   text guard is real work and the defect is that nothing else exists, so the
#   remedy adds the behavioural instrument and keeps the text guard."
#   consulted: product-lab@8ed77a7ceb59ee75d38ad8c46c5449de6898fcc6 LESSONS.md:76
#
# So the sentence STAYS in `entry_point_accounting` and now names this file.
# The text is the statement; this is the instrument.
#
# WHY A MEMBER OF ITS OWN RATHER THAN AN ASSERTION FOLDED INTO
# `src/terrain.mjs self-test`, which kogaki#986 left open as a fork. The
# fold-in arm's only argument is that a 25th member is itself a cost, and the
# served kernel strikes it:
#
#   "A check suite is admitted, priced and retired by record rather than by
#   count — every member enters declaring the loop position it runs at, the
#   budget it spends there, the removal signal that would justify deleting it,
#   and a re-executable case proving it refuses the defect it names; the
#   binding quantity is total cost per ship-cycle rather than member count,
#   because a count target rewards deleting cheap checks and keeping slow
#   ones."
#   consulted: product-lab@8ed77a7ceb59ee75d38ad8c46c5449de6898fcc6 LESSONS.md:119
#
# And `check-terrain-runtime.sh`'s own admission record already declined the
# fold-in for the reason that reaches this contract unchanged: it would "put
# two contracts behind one removal signal". This contract's removal signal is
# the `entry_point_accounting` sentence leaving the tree, which has nothing to
# do with the Terrain runtime's fixture pass, and a shared signal would mean
# neither could be retired on its own evidence.
#
# THE ENUMERATION BOUND IS STATED RATHER THAN DISCOVERED, which kogaki#986
# asks for by name. There is no language-aware parser here and none is wanted:
# a JavaScript parser for one switch statement is a dependency and a second
# thing to be wrong. What runs instead is a regex over `case "…":`, SCOPED to
# the dispatcher — from the line matching `switch (cmd) {` to the first
# `default:` line at or below it — and what that buys and does not buy:
#
#   L1. IT READS TEXT. A `case "x":` inside a string literal or a comment
#       within the dispatcher's span is indistinguishable from a real case.
#       None exists today and the check would report one as a case. THE SPAN
#       IS NOT SHORT, and that is the half of this limit worth stating: it
#       runs from `switch (cmd) {` to the FIRST `default:`, which at this head
#       is roughly 1,100 lines, because the `self-test` case body sits inside
#       it. That body is the region of `src/terrain.mjs` most likely to grow
#       fixture strings, so the exposure is a fixture line shaped like a case
#       label rather than a stray comment near the dispatcher.
#   L2. IT ASSUMES ONE DISPATCHER. `src/terrain.mjs` holds exactly one
#       `switch (`, asserted by arm (c) below rather than believed: a second
#       switch appearing inside the span would contribute its cases here, and
#       a second `switch (cmd)` would leave one of the two unscanned. (c) fails
#       on either.
#   L3. `default:` IS NOT A CASE. It is the unknown-command banner, and the
#       scan stops at it — it is the span's terminator, so it is excluded by
#       construction rather than by a filter someone could drop.
#   L4. THE REVERSE DIRECTION IS NOT ASSERTED, and that is a property of the
#       contract rather than a gap in the reader. `removed_entry_points` and
#       `retired_entry_points` hold entry points that are DELIBERATELY not
#       dispatcher cases any more — SPEC-terrain's "A removed entry point is
#       DELETED, and leaves no stub" is why both are empty at this head — so
#       "every map key is a case" is false by design for two of the five maps
#       and is never checked for any of them. The invariant is one-directional
#       and so is this file.
#   L5. IT DOES NOT JUDGE WHICH MAP IS RIGHT. A case bound to a state but
#       listed under `non_flow_entry_points` is exactly-once and passes here.
#       That is a judgment about meaning, and a matcher for it would be a lint
#       over judgment.
#   L6. IT READS THE PAIRS IT IS GIVEN AND DISCOVERS NONE. A third flow adds a
#       row to `PAIRS` below; until it does, its declaration has no reader. The
#       alternative -- globbing `src/*-workflow.json` and guessing which runtime
#       each belongs to -- would infer the binding this repository states, and a
#       guessed pairing that happened to be right would read as coverage.
#
# WIDENED TO EVERY (RUNTIME, DECLARATION) PAIR (kogaki#1108). The Brief now runs
# on its own Harness-owned workflow table, `src/brief-workflow.json`, whose
# `entry_point_accounting` states the same invariant over `src/brief.mjs`'s
# dispatcher. One reader over a list of pairs rather than a second copy of this
# file: the invariant is one rule, and two readers of it would drift in exactly
# the arms nobody reads twice -- which is the shape this member's own header
# argues about the CONTRACT, applied to its instrument.
#
# THE DISPATCHER DISCRIMINATOR IS PER PAIR, because the two runtimes spell it
# differently: `src/terrain.mjs` switches on `cmd`, `src/brief.mjs` on
# `args._cmd`. It is declared in the pair rather than pattern-matched, so a
# runtime whose dispatcher this reader cannot find fails loudly instead of
# scanning the wrong switch.
set -euo pipefail
# Repo-root-relative, so the member runs the same from the suite runner,
# from checks/, or from a linked worktree.
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

exec python3 - <<'PY'
import json, pathlib, re, sys

MAPS = ("bound_to_a_state", "removed_entry_points", "retired_entry_points",
        "non_flow_entry_points", "owner_executed_entry_points")

# (runtime, declaration, dispatcher discriminator). The discriminator is the
# text that identifies THE dispatcher switch among the file's switches; see L6
# and the widening note in the header.
PAIRS = (
    (pathlib.Path("src/terrain.mjs"), pathlib.Path("src/workflow.json"), "(cmd)"),
    (pathlib.Path("src/brief.mjs"), pathlib.Path("src/brief-workflow.json"), "(args._cmd)"),
)

CASE = re.compile(r'^\s*case\s+"([^"]+)"\s*:')
SWITCH = re.compile(r'^\s*switch\s*\(')
DEFAULT = re.compile(r'^\s*default\s*:')

fails = []


def dispatcher_cases(text, discriminator):
    """Every `case "…":` in the dispatcher span, in source order.

    The span is the switch whose header carries `discriminator`, through the
    first following `default:`. Returns (cases, switch_count) — the count is
    arm (c)'s input, and it is computed here rather than beside it so both read
    one scan.
    """
    lines = text.splitlines()
    switch_count = sum(1 for l in lines if SWITCH.match(l))
    start = None
    for i, l in enumerate(lines):
        if SWITCH.match(l) and discriminator in l:
            start = i
            break
    if start is None:
        return None, switch_count
    cases = []
    for l in lines[start + 1:]:
        if DEFAULT.match(l):
            break
        m = CASE.match(l)
        if m:
            cases.append(m.group(1))
    return cases, switch_count


def accounting(decl):
    """case -> the maps naming it. A dict per map, keyed by entry point."""
    where = {}
    for name in MAPS:
        m = decl.get(name)
        if not isinstance(m, dict):
            raise KeyError(name)
        for key in m:
            where.setdefault(key, []).append(name)
    return where


def totality(text, decl, discriminator):
    """The invariant, as failures. Empty means it holds.

    Shared by arm (a) over this tree and arm (b) over its mutants, so the two
    cannot drift into asserting different things.
    """
    out = []
    cases, _ = dispatcher_cases(text, discriminator)
    if cases is None:
        return [f"the dispatcher's `switch {discriminator} {{` was not found"]
    try:
        where = accounting(decl)
    except KeyError as e:
        return [f"`entry_point_accounting` names the map {e.args[0]!r}, "
                f"which the declaration does not carry as an object"]
    for c in cases:
        homes = where.get(c, [])
        if not homes:
            out.append(f"the dispatcher case {c!r} appears in NONE of the five "
                       f"maps — by `entry_point_accounting`'s own sentence, "
                       f"a defect against src/workflow.json. Add it to the map "
                       f"that describes it; the declaration states which map "
                       f"means what.")
        elif len(homes) > 1:
            out.append(f"the dispatcher case {c!r} appears in {len(homes)} of "
                       f"the five maps ({', '.join(homes)}) — the totality is "
                       f"exactly one. Drop the listing that no longer "
                       f"describes it.")
    return out


# ---- EVERY PAIR, THROUGH ONE READER. Each arm below names the runtime it is
# about, so a failure sends the editor at the file that holds the defect rather
# than at whichever pair happens to be first.
scanned = []

for RUNTIME, DECL, DISCRIMINATOR in PAIRS:
    where = f"{RUNTIME}/{DECL}"
    if not RUNTIME.exists():
        fails.append(f"(a) {RUNTIME} does not exist, and this reader's pair list "
                     f"names it beside {DECL}. A pair whose runtime is gone is a "
                     f"row to drop from PAIRS, not an invariant that passes.")
        continue
    if not DECL.exists():
        fails.append(f"(a) {DECL} does not exist, and this reader's pair list "
                     f"names it beside {RUNTIME}. A declaration nothing carries "
                     f"cannot state the totality this file computes.")
        continue
    runtime_text = RUNTIME.read_text()
    declaration = json.loads(DECL.read_text())
    cases, switch_count = dispatcher_cases(runtime_text, DISCRIMINATOR)

    # ---- (a) THE TOTALITY HOLDS ON THIS TREE.
    for f in totality(runtime_text, declaration, DISCRIMINATOR):
        fails.append(f"(a) {where}: {f}")

    if cases is None:
        continue

    # ---- (b) THE READER DISCRIMINATES, against the REAL specimen (kogaki#986
    # acceptance 2). Not a synthetic case name: the mutants below reconstruct the
    # pre-kogaki#901 tree, where `run` was a dispatcher case in none of the five
    # maps and stood across two sittings that edited these maps. Without this arm a
    # reader that computed nothing would report the same clean line it reports when
    # it is working — the failure mode the whole issue is about, one level up.
    #
    # THE BASELINE IS SYNTHESISED, NEVER THE LIVE DECLARATION, and that is the
    # arm's whole soundness rather than a convenience. Mutating the tree's own
    # accounting makes every mutant inherit whatever is already wrong with it: on a
    # tree where `run` is ALREADY in no map, dropping it changes nothing, planting
    # it into a second map yields exactly one, and the control arm re-reports (a)'s
    # defect as "the reader misfires" — so the three arms go silent or actively lie
    # in precisely the state they exist to be trusted in. The baseline here is
    # well-formed BY CONSTRUCTION — every dispatcher case in `bound_to_a_state`
    # exactly once — so (b) says the same thing about the reader whether (a) passes
    # or fails, which is what an assertion about the INSTRUMENT has to do.
    #
    # It is still the real specimen: the case names are read from the live
    # dispatcher, so `run` is the actual entry point kogaki#901 repaired, and a
    # dispatcher that renames or drops it changes this arm with it. AND IT IS A
    # LIVE SPECIMEN IN BOTH RUNTIMES (kogaki#1108): `src/brief.mjs` gained its own
    # `run` case at this issue, so the same specimen names a real entry point on
    # each side of the pair list rather than a synthetic one on the second.
    def baseline(cases=cases, declaration=declaration):
        """A well-formed accounting over the live dispatcher's cases."""
        m = {name: {} for name in MAPS}
        for c in cases:
            m["bound_to_a_state"][c] = {"note": "synthesised by arm (b)"}
        m["entry_point_accounting"] = declaration.get("entry_point_accounting", "")
        return m

    def mutate(drop=None, alias=None, baseline=baseline):
        m = json.loads(json.dumps(baseline()))
        if drop:
            for name in MAPS:
                m[name].pop(drop, None)
        if alias:
            key, into = alias
            m[into][key] = {"note": "planted by arm (b)"}
        return m

    control = totality(runtime_text, baseline(), DISCRIMINATOR)
    if control:
        fails.append(f"(b) {where}: THE BASELINE IS NOT WELL-FORMED: the synthesised "
                     "accounting — every dispatcher case in exactly one map — was "
                     "reported as defective, so the two arms below are mutations "
                     "of an already-broken tree and prove nothing: "
                     + "; ".join(control))

    # THE SPECIMEN'S OWN DRIFT IS DIAGNOSED, never reported as a reader failure.
    # `run` is hard-coded because it is the REAL pre-kogaki#901 defect and a
    # synthetic name would not be. But `run` may legitimately leave a dispatcher
    # — SPEC-terrain's "a removed entry point is DELETED" contemplates exactly
    # that — and then both mutants below become no-ops over a baseline that never
    # held it. Without this guard the arms would fire "THE READER DOES NOT
    # DISCRIMINATE", pointing the editor at the instrument when what actually
    # changed was the dispatcher. So the drift is named as itself.
    if "run" not in cases:
        fails.append(f"(b) {where}: THE SPECIMEN IS NO LONGER LIVE: `run` is not a "
                     "dispatcher case at this head, so the pre-kogaki#901 "
                     "specimen cannot be reconstructed and the two arms below "
                     "would pass vacuously. This is a change to the DISPATCHER, "
                     "not a defect in this reader: pick a live case as the "
                     "specimen here and say in the header which real defect it "
                     "stands for.")
    else:
        # efficacy case: the pre-kogaki#901 specimen, run in no map, must refuse
        specimen = totality(runtime_text, mutate(drop="run"), DISCRIMINATOR)
        if not any("'run'" in f and "NONE" in f for f in specimen):
            fails.append(f"(b) {where}: THE READER DOES NOT DISCRIMINATE: the "
                         "pre-kogaki#901 specimen — `run` present as a dispatcher "
                         "case and absent from all five maps — was not reported. "
                         "Every (a) pass is therefore unevidenced: a reader that "
                         "computes nothing is indistinguishable from a tree that "
                         "holds the invariant.")

        doubled = totality(runtime_text,
                           mutate(alias=("run", "non_flow_entry_points")),
                           DISCRIMINATOR)
        if not any("'run'" in f and "of the five maps" in f for f in doubled):
            fails.append(f"(b) {where}: THE `IN TWO` HALF IS NOT READ: `run` planted "
                         "into a second map was not reported, so half of the "
                         "sentence `entry_point_accounting` states — a case in none "
                         "of them, OR IN TWO — has no reader and the other half's "
                         "pass says nothing about it.")

    # ---- (c) THE SCOPE ASSUMPTION HOLDS (limit L2, asserted rather than
    # believed). The span from the dispatcher's switch to `default:` is the whole
    # dispatcher only while the runtime holds exactly one switch. A second one
    # inside the span would contribute cases that are not entry points; a second
    # one outside it would leave real cases unscanned. Either way (a)'s
    # population stops being the dispatcher's, and (a) would keep printing its ok
    # line — so the assumption fails loudly here instead.
    if switch_count != 1:
        fails.append(f"(c) {RUNTIME} holds {switch_count} `switch (` "
                     f"statements, and this reader's scope — `switch {DISCRIMINATOR} "
                     f"{{` through the first `default:` — is sound only for one. Its "
                     f"population is no longer the dispatcher's, so (a) is "
                     f"unevidenced. Scope the scan to the dispatcher explicitly, "
                     f"or state the new bound at limit L2.")

    # ---- (d) THE TEXT GUARD IS KEPT BESIDE THE INSTRUMENT, never replaced by it
    # (LESSONS.md:76, quoted in the header). `entry_point_accounting` must still
    # state the invariant AND must name this file, so a later editor of these maps
    # learns from the declaration itself that a reader exists — kogaki#986
    # acceptance 3. A reader nothing points at is one an editor works around.
    text = declaration.get("entry_point_accounting", "")
    if "exactly one of the 5 maps" not in text:
        fails.append(f"(d) {DECL}: `entry_point_accounting` no longer states the "
                     "totality this file computes. The sentence is the contract and "
                     "this file is only its reader: restore it, or retire both "
                     "together — see this member's removal signal.")
    if "check-entry-point-accounting" not in text:
        fails.append(f"(d) {DECL}: `entry_point_accounting` does not name its reader. "
                     "Add `check-entry-point-accounting.sh` to the declaration so "
                     "an editor of these maps knows the invariant is computed "
                     "(kogaki#986 acceptance 3).")

    scanned.append((RUNTIME, cases))

# ---- (e) EVERY DECLARED PAIR WAS ACTUALLY SCANNED. A pair that fell out of the
# loop on a `continue` has already appended its own failure; this refuses the
# remaining silence — a PAIRS list emptied by an edit would otherwise print the
# ok line below over zero runtimes.
if len(scanned) != len(PAIRS):
    fails.append(f"(e) {len(scanned)} of {len(PAIRS)} declared (runtime, "
                 f"declaration) pair(s) were scanned. A pair this reader could "
                 f"not read is not a pair that holds the invariant.")
if not PAIRS:
    fails.append("(e) PAIRS is empty, so this member computes nothing and its ok "
                 "line would be a green report about no tree at all.")

if fails:
    print("FAIL check-entry-point-accounting")
    for f in fails:
        print(f"  - {f}")
    sys.exit(1)

for RUNTIME, cases in scanned:
    print(f"ok: check-entry-point-accounting — {RUNTIME}: {len(cases)} dispatcher "
          f"case(s) ({', '.join(cases)}) each in exactly one of the {len(MAPS)} "
          f"maps; the pre-kogaki#901 `run` specimen and the in-two half both "
          f"refuse, the synthesised baseline passes, 1 switch scoped, the "
          f"declaration states the invariant and names this reader")
PY
