#!/usr/bin/env bash
# Registry meta-check: asserts checks/registry.json and the checks/ tree
# agree, both ways. An unregistered check file is dead code (registry note);
# a registered file that does not exist is a dangling entry. Standalone by
# design — no suite runner exists yet, and this check must not depend on one
# that postdates it (kogaki#2, story 1.1).
#
# Removal-instrument validation and tripwire (kogaki#113): every removal
# signal names its observing instrument — `act: …`, `none: …`, or
# `probe: <tree-local shell predicate>` — and a missing or malformed field
# FAILS, the same strictness as the kogaki#6 admission-shape widening. The
# `probe:` entries are the decidable subset: each probe is executed here,
# on every invocation, and exit 0 renders a `removal-candidate:` row —
# REPORT-ONLY, never a deny, because removal is a judgment (never-fired
# members are review candidates, never auto-deletions). Exit 1 is "not
# yet", rendered so a silent pass is distinguishable from a probe that did
# not run — and it is reserved for a decided negative: a probe whose own
# inputs are absent owes exit 2, never the healthy-looking not-yet an
# absent-reads-as-false coercion produces (kogaki#116). Any other exit, or a
# timeout, is COULD-NOT-ESTABLISH in the probe's own words, flattened onto
# one line because this row is line-oriented and so are its readers — a
# crash is never spent as a finding — and it FAILS, because probes are
# declared tree-local, so a probe that cannot run is a defect in the
# declaration rather than a fact about the world. `none:`
# entries render as greppable residue rows: an unobservable signal is
# evidence when typed and an omission when not. The embedded fixture pass
# below exercises every branch on synthetic registries, every invocation.
#
# Efficacy validation (kogaki#243): every admission record additionally
# carries `efficacy` — `case: <path>::<verbatim label>` or `none: <why>` —
# and a `case:` is RESOLVED against the tree, failing unless the path exists
# and contains the label literally. This is the inward half of the evidence
# discipline: the record's claim about the defect the check CATCHES was
# previously self-attested prose, and constrain-generation had been applied
# to check EXISTENCE but never to check EFFICACY. Shape and resolution are
# gated because they are computable facts about a committed artifact;
# whether the cited counterfactual is a GOOD one stays judgment and is never
# gated, the same split `probe:` runs under.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'EOF'
import json, os, pathlib, re, subprocess, sys, tempfile

INSTRUMENT = re.compile(r'^(act|none|probe): \S', re.DOTALL)
EFFICACY = re.compile(r'^(case|none): \S', re.DOTALL)
PROBE_TIMEOUT_S = 10

# The DELEGATING CLASS (kogaki#661), DETECTED rather than enumerated. A member
# that spawns another artifact's fixture pass owes a `case_floor`, and the
# thing that makes it such a member is the DISPATCH — so the dispatch is what
# is matched, and member N+1 is covered by the match rather than by a list
# somebody remembered to extend.
#
# Why a dispatch shape rather than the words `self-test`: the looser match
# reaches checks/check-anchor-resolve.sh, whose two occurrences are a comment
# and its own failure label. Verified at authoring (2026-08-26): this pattern
# matches exactly the four delegating members and nothing else in checks/.
#
# DECLARED LIMIT, and it bit this file first. The match is over TEXT, so a
# file that merely CONTAINS the dispatch shape is indistinguishable from one
# that runs it — and THIS check's own fixtures need such a string, which put
# the observer inside the set it searches. That is the boundary `efficacy`
# already declares (it cannot tell code from a comment) and the same refusal:
# a language-aware parser for it would be a lint over judgment. So the remedy
# is at the WRITER rather than at the pattern — a fixture needing the shape
# splits the literal, as the block below does, with this paragraph as the
# reason. The near-miss fixture beside it needs no split: it carries the words
# WITHOUT the dispatch, which is the distinction being asserted. A member that
# genuinely delegates through a variable is out of reach here and is caught at
# admission review.
DELEGATES = re.compile(r'\b(?:node|bash|python3)\s+\S+\s+(?:--)?self-test\b')


def resolve_efficacy_case(payload, opener=None):
    """Resolve a `case: <path>::<label>` payload against the tree.

    Returns (ok, detail). The binding this check exists to make mechanical
    is that the CITED CASE EXISTS: a `case:` naming a path that is gone, or
    a label the file no longer contains, is an admission record claiming an
    efficacy counterfactual that nothing carries — which is precisely the
    unbound-claim defect kogaki#243 names, rebuilt inside its own repair.
    So the path must exist AND contain the label literally AND exactly once.

    The label is matched as a LITERAL SUBSTRING, never a regex: these labels
    are prose written for humans and carry `(`, `)`, `:` and `—` freely, so
    regex-matching them would make the check's own behavior depend on
    punctuation nobody chose for that purpose.

    Split on the FIRST `::` only, because labels routinely contain `:`
    while paths in this tree never contain `::`.

    THE PAYLOAD IS `<path>::<label>` AND NOTHING ELSE. An earlier draft let
    the author append a prose gloss after ` — `, and this check stripped it
    before matching — which silently TRUNCATED every label that itself
    contains ` — ` (the `consult-receipts` label does). Renaming such a
    label's tail then did NOT break the claim citing it, falsifying the one
    property this field is sold on. Human prose moved to the sibling
    `efficacy_note`, on the convention `runtime_ms_note` already sets, and
    the machine-read field became unambiguous. Recorded because the defect
    was E′ one level down: the note asserted a binding the code did not
    enforce, inside the amendment that names E′ (PR #272 review).

    THE MATCH MUST BE UNIQUE. A label occurring more than once identifies
    nothing — a citation resolving to whichever copy is found first is not
    a binding — so a non-unique match is refused. This is also what refuses
    a single common word like `the`. What it deliberately does NOT do is
    decide that the cited text is a COMPLETE case label, or that its
    occurrence is code rather than a comment: both are judgments about
    meaning, and building a language-aware parser for them would be a lint
    over judgment. `checks/registry.json`'s note claims exactly this and no
    more.
    """
    if opener is None:
        def opener(path):
            return pathlib.Path(path).read_text(encoding="utf-8")
    if "::" not in payload:
        return False, ("no `::` separator — expected "
                       "`case: <path>::<verbatim label>`")
    path, _, label = payload.partition("::")
    path, label = path.strip(), label.strip()
    if not path:
        return False, "empty path before `::`"
    if not label:
        return False, "empty label after `::`"
    try:
        text = opener(path)
    except OSError as exc:
        return False, f"cited path unreadable: {path} ({exc.__class__.__name__})"
    hits = text.count(label)
    if hits == 0:
        return False, (f"cited case not found in {path}: "
                       f"{label[:60]!r} appears nowhere in the file")
    if hits > 1:
        return False, (f"cited case is not unique in {path}: "
                       f"{label[:60]!r} appears {hits} times, so it "
                       f"identifies no particular case")
    return True, f"{path} carries {label[:50]!r} exactly once"


def validate_entries(entries, opener=None):
    """Shape validation over registry data. Returns a list of failure lines."""
    failures = []
    for entry in entries:
        admission = entry.get("admission") or {}
        missing = []
        if not (str(admission.get("contract", "")).strip()
                or str(admission.get("defect", "")).strip()):
            missing.append("contract-or-defect")
        for field in ("license", "tier", "removal_signal"):
            if not str(admission.get(field, "")).strip():
                missing.append(field)
        if missing:
            failures.append(
                f"FAIL admission record incomplete: checks/{entry['file']} "
                f"missing {', '.join(missing)}")
        instrument = str(admission.get("removal_instrument", ""))
        if not instrument.strip():
            failures.append(
                f"FAIL removal signal has no observing instrument: "
                f"checks/{entry['file']} — declare `act: …`, `none: <why>`, "
                f"or `probe: <predicate>` (kogaki#113)")
        elif not INSTRUMENT.match(instrument):
            failures.append(
                f"FAIL removal_instrument malformed: checks/{entry['file']} "
                f"— must start `act: `, `none: `, or `probe: `, "
                f"got {instrument[:40]!r}")
        # Efficacy evidence (kogaki#243). Same strictness as the field above:
        # the admission record's claim about what the check CATCHES owes a
        # re-executable counterfactual, not prose.
        efficacy = str(admission.get("efficacy", ""))
        if not efficacy.strip():
            failures.append(
                f"FAIL admission record has no efficacy evidence: "
                f"checks/{entry['file']} — declare "
                f"`case: <path>::<verbatim label>` or `none: <why>` "
                f"(kogaki#243)")
        elif not EFFICACY.match(efficacy):
            failures.append(
                f"FAIL efficacy malformed: checks/{entry['file']} "
                f"— must start `case: ` or `none: `, "
                f"got {efficacy[:40]!r}")
        elif efficacy.startswith("case: "):
            ok, detail = resolve_efficacy_case(efficacy[len("case: "):], opener)
            if not ok:
                failures.append(
                    f"FAIL efficacy case does not resolve: "
                    f"checks/{entry['file']} — {detail}")
    return failures


def validate_case_floor(entries, file_reader=None):
    """`case_floor` on every member that delegates to another artifact's pass.

    Required of the DETECTED class, never of a list: a member is in the class
    because its file spawns another artifact's fixture pass, so the file is
    what decides membership. A member outside the class may still declare a
    floor and is validated if it does — declaring one is never an error.

    The floor is an integer at or above 1. Zero is refused rather than
    admitted as "no floor": a floor of zero is exactly the vacuous pass the
    field exists to refuse, spelled as a declaration.
    """
    if file_reader is None:
        def file_reader(path):
            return pathlib.Path(path).read_text(encoding="utf-8")
    failures = []
    for entry in entries:
        admission = entry.get("admission") or {}
        floor = admission.get("case_floor")
        path = f"checks/{entry['file']}"
        try:
            delegates = bool(DELEGATES.search(file_reader(path)))
        except OSError:
            continue  # a missing file is the dangling-entry failure, reported above
        if delegates and floor is None:
            failures.append(
                f"FAIL admission record has no case_floor: {path} spawns "
                f"another artifact's fixture pass, so it can verify that the "
                f"pass RAN CLEAN and cannot, by the same evidence, verify "
                f"that the pass STILL ASSERTS ANYTHING — declare "
                f"`case_floor` (kogaki#661)")
        elif floor is not None and (isinstance(floor, bool)
                                    or not isinstance(floor, int)
                                    or floor < 1):
            failures.append(
                f"FAIL case_floor malformed: {path} — must be an integer at "
                f"or above 1, got {floor!r}; a floor of zero is the vacuous "
                f"pass the field refuses, spelled as a declaration")
    return failures


def check_floor_decrements(entries, base_reader=None):
    """Lowering a `case_floor` takes the admission review path (kogaki#661).

    Returns (rows, failures). A DECREMENT owes a paired `case_floor_note`
    naming the case retired, and an unpaired one FAILS — deny rather than
    report, at the strictness an incomplete admission record already draws,
    because the owner's ruling (2026-08-26) is that a decrement needs the same
    review path as admitting a member. Without this the field is the
    silent-shrinkage channel one hop removed: deleting a case goes red while
    decrementing the floor beside it goes green.

    An INCREMENT owes nothing. Adding cases is the direction the floor exists
    to protect, and a symmetric gate would tax exactly the edits worth
    encouraging.

    WHAT IS GATED IS THE PAIRING, NOT THE PROSE. Whether the note names the
    RIGHT case is judgment, and judgment is never gated here — the same split
    `probe:` and `efficacy` already run under.

    An unresolvable base renders CANNOT-DETERMINE and never a pass: an absent
    input owes could-not-establish rather than the healthy-looking answer an
    absent-reads-as-unchanged coercion produces (kogaki#116).
    """
    if base_reader is None:
        base_reader = _read_base_registry
    rows, failures = [], []
    try:
        base = base_reader()
    except Exception as exc:                      # noqa: BLE001 - reported, not raised
        rows.append(f"case-floor-decrements: CANNOT-DETERMINE — the base "
                    f"registry could not be read ({exc.__class__.__name__}); "
                    f"this is not a pass")
        return rows, failures
    if base is None:
        rows.append("case-floor-decrements: CANNOT-DETERMINE — no base commit "
                    "resolved, so no decrement could be observed; this is not "
                    "a pass")
        return rows, failures
    was = {e["id"]: (e.get("admission") or {}).get("case_floor")
           for e in base.get("checks", [])}
    decrements = 0
    for entry in entries:
        admission = entry.get("admission") or {}
        now, before = admission.get("case_floor"), was.get(entry["id"])
        if not isinstance(now, int) or not isinstance(before, int):
            continue
        if now >= before:
            continue
        decrements += 1
        if not str(admission.get("case_floor_note", "")).strip():
            failures.append(
                f"FAIL case_floor lowered without a retirement note: "
                f"checks/{entry['file']} {before} -> {now} — lowering a floor "
                f"is an admission-class change and owes a `case_floor_note` "
                f"naming the case(s) retired (kogaki#661, owner ruling "
                f"2026-08-26). Without the pairing this field is the "
                f"silent-shrinkage channel one hop removed")
        else:
            rows.append(f"case-floor-decrement: {entry['id']} {before} -> "
                        f"{now}, paired with a retirement note (accepted; "
                        f"whether it names the right case is judgment)")
    rows.append(f"case-floor-decrements: {decrements} observed against the "
                f"base")
    return rows, failures


def _read_base_registry():
    """The registry as of the base commit, or None when no base resolves.

    The base resolution is checks/check-consult-receipts.sh's idiom, reused
    rather than re-derived: CI supplies it, and locally we fall back to the
    merge base with the default branch.
    """
    base = os.environ.get("CONSULT_BASE_SHA", "").strip()
    head = os.environ.get("CONSULT_HEAD_SHA", "").strip() or "HEAD"
    if not base:
        for ref in ("origin/master", "master"):
            r = subprocess.run(["git", "merge-base", ref, head],
                               capture_output=True, text=True)
            if r.returncode == 0 and r.stdout.strip():
                base = r.stdout.strip()
                break
    if not base:
        return None
    r = subprocess.run(["git", "show", f"{base}:checks/registry.json"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        return None
    return json.loads(r.stdout)


def run_probes(entries, runner=None):
    """Execute `probe:` instruments. Returns (rows, failures).

    Every entry renders a row — candidates, not-yets, nones — because a
    silent pass is indistinguishable from a probe that did not run.
    """
    if runner is None:
        def runner(cmd):
            # Returns (exit code, stderr tail): the could-not-establish row
            # quotes the probe's own words, not only its exit code (PR #114
            # review, finding 2).
            result = subprocess.run(
                ["bash", "-c", cmd], capture_output=True, text=True,
                timeout=PROBE_TIMEOUT_S)
            return result.returncode, result.stderr.strip()[-200:]
    rows, failures = [], []
    counts = {"act": 0, "none": 0, "probe": 0, "candidate": 0}
    for entry in entries:
        instrument = str((entry.get("admission") or {})
                         .get("removal_instrument", ""))
        if not INSTRUMENT.match(instrument):
            continue  # shape failures already reported by validate_entries
        kind, _, payload = instrument.partition(": ")
        counts[kind] += 1
        if kind == "none":
            rows.append(f"instrument-none: {entry['id']} — {payload}")
            continue
        if kind == "act":
            continue  # observed at the named act, nothing to run here
        try:
            code, words = runner(payload)
        except subprocess.TimeoutExpired:
            failures.append(
                f"FAIL probe could not establish: {entry['id']} — the probe "
                f"timed out after {PROBE_TIMEOUT_S}s; this is the probe's own "
                f"failure, not a finding about the check")
            continue
        if code == 0:
            counts["candidate"] += 1
            rows.append(
                f"removal-candidate: {entry['id']} — probe indicates the "
                f"removal signal's condition now holds; removal is a "
                f"judgment and routes to the gate (row is report-only)")
        elif code == 1:
            rows.append(f"probe-not-yet: {entry['id']} — condition not "
                        f"present")
        else:
            # The row is line-oriented and its readers are line-oriented (the
            # review lane greps `== |FAIL:`), so the probe's own words are
            # flattened onto one line before splicing — a traceback, the
            # likeliest crash, embeds newlines mid-line and would break every
            # such reader (kogaki#116).
            flat = " | ".join(x for x in str(words).splitlines() if x.strip())
            said = f", saying: {flat}" if flat else " and said nothing"
            failures.append(
                f"FAIL probe could not establish: {entry['id']} — the probe "
                f"exited {code}{said}; this is the probe's own failure, not "
                f"a finding about the check")
    rows.append(
        f"removal-instruments: {counts['act']} act, {counts['none']} none, "
        f"{counts['probe']} probe ({counts['candidate']} candidate)")
    return rows, failures


def fixture_pass():
    """Synthetic registries through the same functions the live path uses."""
    def entry(instrument, id_="fx", **admission):
        base = {"contract": "c", "license": "l", "tier": "ci",
                "removal_signal": "s", "efficacy": "none: fixture entry"}
        base.update(admission)
        if instrument is not None:
            base["removal_instrument"] = instrument
        return {"id": id_, "file": f"check-{id_}.sh", "admission": base}

    # A stand-in tree for the efficacy cases below, so they exercise
    # resolve_efficacy_case's real logic without depending on the live tree —
    # a fixture that reads the repository would pass for reasons the fixture
    # does not control, which is form A of kogaki#243's own taxonomy.
    TREE = {"real.sh": "prelude\n  cases.append((\"the label\", ok))\n",
            "colon.sh": "labelled x: y here\n",
            "double.sh": "a label carrying x::y inside it\n",
            "dash.sh": "REVERSED — the merged-history specimen here\n",
            "twice.sh": "the same words\nand again the same words\n",
            "meta.sh": "a b c\n"}

    def fake_open(path):
        if path not in TREE:
            raise FileNotFoundError(path)
        return TREE[path]

    def eff(payload, **kw):
        return validate_entries([entry("act: x", efficacy=payload, **kw)],
                                opener=fake_open)

    cases = []
    f = validate_entries([entry(None)])
    cases.append(("missing instrument fails",
                  any("no observing instrument" in x for x in f)))
    f = validate_entries([entry("someday maybe")])
    cases.append(("malformed prefix fails",
                  any("malformed" in x for x in f)))
    cases.append(("act accepted", not validate_entries([entry("act: x")])))
    cases.append(("none accepted", not validate_entries([entry("none: y")])))
    cases.append(("probe accepted", not validate_entries([entry("probe: z")])))
    f = validate_entries([entry("act: x", removal_signal="")])
    cases.append(("admission shape still enforced",
                  any("admission record incomplete" in x for x in f)))

    # Efficacy evidence (kogaki#243). Mutants derived from the diff that
    # introduced the field — each changed literal and branch is a mutant, and
    # the case catching it is named beside it in the PR record.
    f = validate_entries([entry("act: x", efficacy="")], opener=fake_open)
    cases.append(("missing efficacy fails",
                  any("no efficacy evidence" in x for x in f)))
    cases.append(("malformed efficacy prefix fails",
                  any("efficacy malformed" in x
                      for x in eff("somebody ran it once"))))
    cases.append(("an empty payload after `case: ` fails",
                  bool(eff("case: "))))
    cases.append(("efficacy `none: <why>` is accepted — a typed none is "
                  "evidence", not eff("none: no counterfactual exists")))
    cases.append(("a case resolving to a real path and label is accepted",
                  not eff('case: real.sh::cases.append(("the label", ok))')))
    cases.append(("a case citing a MISSING PATH fails",
                  any("does not resolve" in x
                      for x in eff("case: gone.sh::the label"))))
    cases.append(("a case whose label is ABSENT from the cited file fails — "
                  "the unbound claim this field exists to refuse",
                  any("appears nowhere in the file" in x
                      for x in eff("case: real.sh::a label nobody wrote"))))
    cases.append(("a case with no `::` separator fails",
                  any("no `::` separator" in x
                      for x in eff("case: real.sh the label"))))
    # The payload is `<path>::<label>` and NOTHING else. The earlier ` — `
    # gloss-stripping silently truncated every label containing ` — `, so
    # renaming such a label's tail did not break the claim citing it — the
    # property the field is sold on, falsified (PR #272 review).
    cases.append(("a label containing ` — ` is matched WHOLE, never truncated "
                  "at the dash", not eff("case: dash.sh::REVERSED — the "
                                         "merged-history specimen")))
    cases.append(("renaming the TAIL of a ` — ` label breaks the citing claim",
                  any("appears nowhere" in x
                      for x in eff("case: dash.sh::REVERSED — a tail nobody "
                                   "wrote"))))
    # Uniqueness: a label occurring more than once identifies no particular
    # case, which is also what refuses a single common word.
    cases.append(("a label occurring TWICE fails — it identifies no case",
                  any("not unique" in x
                      for x in eff("case: twice.sh::the same words"))))
    cases.append(("a single common word fails on the same rule",
                  any("not unique" in x for x in eff("case: twice.sh::the"))))
    # Derived from the diff and initially UNCAUGHT (PR #272 review): the
    # empty-label guard had no fixture, because the `case: ` case tests the
    # WHOLE payload empty, which the grammar refuses first.
    cases.append(("an empty label after `::` fails",
                  any("empty label" in x for x in eff("case: real.sh::"))))
    cases.append(("an empty path before `::` fails",
                  any("empty path" in x for x in eff("case: ::the label"))))
    # Also initially uncaught: every fixture SET the key, so `.get`'s default
    # was the sole guard for an entry omitting `efficacy` altogether.
    absent = {"id": "fx", "file": "check-fx.sh",
              "admission": {"contract": "c", "license": "l", "tier": "ci",
                            "removal_signal": "s",
                            "removal_instrument": "act: x"}}
    cases.append(("the efficacy KEY entirely absent fails, not only an empty "
                  "one", any("no efficacy evidence" in x
                             for x in validate_entries([absent],
                                                       opener=fake_open))))
    cases.append(("the split is on the FIRST `::`, so a label carrying `:` "
                  "survives", not eff("case: colon.sh::x: y")))
    # Derived from the diff and initially UNCAUGHT: the live registry holds no
    # label containing `::`, so first-vs-last split was unobservable and a
    # `rpartition` mutant survived the pass. The case is authored rather than
    # the mutant dropped.
    cases.append(("the split is on the FIRST `::` even when the LABEL carries "
                  "`::` too", not eff("case: double.sh::x::y")))
    # Also initially uncaught: an empty reason passes the non-empty test
    # (`\"none:\"` is truthy after strip) and is refused only by the grammar's
    # trailing `\\S`, which nothing exercised — the same omission
    # check-external-deps names as `the omission the typed none refuses`.
    cases.append(("an empty reason after `none: ` fails — a typed none with "
                  "no why is the omission it exists to refuse",
                  any("efficacy malformed" in x for x in eff("none: "))))
    cases.append(("the label is matched LITERALLY, never as a regex",
                  any("appears nowhere in the file" in x
                      for x in eff("case: meta.sh::a (b) c"))))

    rows, f = run_probes([entry("probe: fires")], runner=lambda c: (0, ""))
    cases.append(("probe exit 0 renders candidate, never fails",
                  any(x.startswith("removal-candidate:") for x in rows)
                  and not f))
    rows, f = run_probes([entry("probe: quiet")], runner=lambda c: (1, ""))
    cases.append(("probe exit 1 renders not-yet",
                  any(x.startswith("probe-not-yet:") for x in rows)
                  and not f))
    rows, f = run_probes([entry("probe: broken")],
                         runner=lambda c: (3, "its own words"))
    cases.append(("probe crash is could-not-establish and fails",
                  any("could not establish" in x for x in f)
                  and not any(x.startswith("removal-candidate:")
                              for x in rows)))
    cases.append(("could-not-establish quotes the probe's own words",
                  any("its own words" in x for x in f)))
    rows, f = run_probes([entry("probe: mute")], runner=lambda c: (2, ""))
    cases.append(("a wordless crash says so rather than quoting nothing",
                  any("said nothing" in x for x in f)))
    rows, f = run_probes([entry("probe: noisy")], runner=lambda c: (
        3, "Traceback (most recent call last):\n  File \"<stdin>\", line 4\n"
           "ValueError: nothing to decide"))
    cases.append(("multiline probe words render on one line",
                  any("could not establish" in x for x in f)
                  and all("\n" not in x for x in f + rows)))
    rows, f = run_probes([entry("none: unreachable")])
    cases.append(("none renders residue row",
                  any(x.startswith("instrument-none:") for x in rows)))
    rows, f = run_probes([entry("act: elsewhere")])
    cases.append(("summary row renders even with zero probes",
                  any(x.startswith("removal-instruments:") for x in rows)))

    # The delegating class and its floor (kogaki#661, story 1.92). Synthetic
    # registries and a stand-in tree, for the reason the block above states:
    # a fixture that reads the repository passes for reasons the fixture does
    # not control.
    # The literal is SPLIT so this file does not match its own pattern —
    # see the declared limit beside DELEGATES. Joined at runtime it is
    # exactly the dispatch shape a delegating member carries.
    DISPATCH = "OUT=$(node runtime/thing.mjs " + "--self" + "-test)\n"
    FILES = {"checks/check-fx.sh": DISPATCH,
             "checks/check-plain.sh": "echo no dispatch here\n",
             # The near-miss that the looser `self-test` grep would catch and
             # this pattern must not: the words in a comment and in a label.
             "checks/check-nearmiss.sh": ('# the self-test above asserts them\n'
                                          'print("FAIL thing — self-test:")\n')}

    def files(path):
        if path not in FILES:
            raise FileNotFoundError(path)
        return FILES[path]

    def floor(id_, **admission):
        return entry("act: x", id_=id_, **admission)

    f = validate_case_floor([floor("fx")], files)
    cases.append(("a delegating member with NO case_floor fails",
                  any("has no case_floor" in x for x in f)))
    cases.append(("a delegating member WITH a case_floor passes",
                  not validate_case_floor([floor("fx", case_floor=3)], files)))
    cases.append(("a NON-delegating member owes no case_floor",
                  not validate_case_floor([floor("plain")], files)))
    # Derived from the diff and initially UNCAUGHT: every fixture used the
    # dispatch form, so a `self-test`-anywhere mutant of DELEGATES survived.
    # The case is authored rather than the mutant dropped.
    cases.append(("the class is the DISPATCH, not the words — a comment and a "
                  "label do not make a member delegating",
                  not validate_case_floor([floor("nearmiss")], files)))
    for bad, why in ((0, "zero"), (-1, "negative"), ("3", "a string"),
                     (True, "a bool"), (2.5, "a float")):
        cases.append((f"a case_floor of {why} is refused",
                      any("case_floor malformed" in x for x in
                          validate_case_floor([floor("fx", case_floor=bad)],
                                              files))))
    # A member whose FILE is gone is the dangling-entry failure, reported by
    # the tree comparison; this validator must not double-report it.
    cases.append(("a missing check file is not reported here",
                  not validate_case_floor([floor("gone")], files)))

    def base(**floors):
        def reader():
            return {"checks": [{"id": k,
                                "admission": {"case_floor": v}}
                               for k, v in floors.items()]}
        return reader

    def dec(now, before, note=None):
        adm = {"case_floor": now}
        if note is not None:
            adm["case_floor_note"] = note
        return check_floor_decrements([floor("fx", **adm)], base(fx=before))

    rows, f = dec(2, 5)
    cases.append(("an UNPAIRED decrement FAILS",
                  any("lowered without a retirement note" in x for x in f)))
    cases.append(("the failure names both numbers",
                  any("5 -> 2" in x for x in f)))
    rows, f = dec(2, 5, "retired `the third widget case` at kogaki#999")
    cases.append(("a decrement PAIRED with a note is accepted",
                  not f and any("case-floor-decrement:" in x for x in rows)))
    rows, f = dec(2, 5, "   ")
    cases.append(("a whitespace-only note does not pair — the omission a "
                  "typed field refuses", any("lowered without" in x for x in f)))
    rows, f = dec(9, 5)
    cases.append(("an INCREMENT owes nothing", not f))
    rows, f = dec(5, 5)
    cases.append(("an unchanged floor owes nothing", not f))
    # A member that is NEW in this diff has no base floor to fall from.
    rows, f = check_floor_decrements([floor("fx", case_floor=1)], base(other=9))
    cases.append(("a member absent from the base is not a decrement", not f))

    rows, f = check_floor_decrements([floor("fx", case_floor=1)],
                                     lambda: None)
    cases.append(("no resolvable base renders CANNOT-DETERMINE, never a pass",
                  any("CANNOT-DETERMINE" in x for x in rows) and not f))
    def boom():
        raise OSError("no such object")
    rows, f = check_floor_decrements([floor("fx", case_floor=1)], boom)
    cases.append(("an unreadable base is CANNOT-DETERMINE too, and does not "
                  "crash the check",
                  any("CANNOT-DETERMINE" in x for x in rows) and not f))

    failed = [name for name, ok in cases if not ok]
    if failed:
        for name in failed:
            print(f"FAIL fixture: {name}")
        return False
    print(f"ok: fixture pass ({len(cases)} case(s)) — instrument grammar and "
          f"probe branches discriminate")
    return True


def probe_precondition_fixture():
    """The registered external-deps probe, run against stand-in dep trees.

    The synthetic runners above cannot reach this defect class: it lives in
    the probe's own text, not in the branch that dispatches on its exit
    code. So this fixture executes the registered probe itself, in a
    temporary tree, and asserts that a DROPPED `verification` block is
    could-not-establish (exit 2) rather than the healthy-looking not-yet
    (exit 1) an `or {}` coercion produced — asking what the predicate would
    answer if its input were empty, and refusing the answer that matches its
    normal healthy output (kogaki#116). Exit 1 stays reserved for a
    present-and-false `decidable`, which the third case pins.
    """
    reg = json.loads(pathlib.Path("checks/registry.json").read_text())
    entry = next((e for e in reg["checks"] if e["id"] == "external-deps"), None)
    instrument = str(((entry or {}).get("admission") or {})
                     .get("removal_instrument", ""))
    kind, _, probe = instrument.partition(": ")
    if kind != "probe":
        print("FAIL fixture: external-deps carries no `probe:` instrument — "
              "the probe-precondition fixture has nothing to exercise")
        return False

    def run(verification):
        dep = {"id": "spawned-session-tool-grants"}
        if verification is not None:
            dep["verification"] = verification
        with tempfile.TemporaryDirectory() as tmp:
            deps = pathlib.Path(tmp) / "deps"
            deps.mkdir()
            (deps / "registry.json").write_text(
                json.dumps({"dependencies": [dep]}))
            return subprocess.run(["bash", "-c", probe], cwd=tmp,
                                  capture_output=True, text=True,
                                  timeout=PROBE_TIMEOUT_S)

    cases = []
    r = run(None)
    cases.append(("an absent verification block is a precondition failure, "
                  "not a not-yet",
                  r.returncode == 2 and "precondition failed" in r.stderr))
    r = run({"reason": "no decidable key"})
    cases.append(("a verification block without `decidable` is also a "
                  "precondition failure",
                  r.returncode == 2 and "precondition failed" in r.stderr))
    cases.append(("a present-and-false decidable is the not-yet (exit 1)",
                  run({"decidable": False}).returncode == 1))
    cases.append(("a present-and-true decidable fires the signal (exit 0)",
                  run({"decidable": True}).returncode == 0))

    failed = [name for name, ok in cases if not ok]
    if failed:
        for name in failed:
            print(f"FAIL fixture: {name}")
        return False
    print(f"ok: probe-precondition fixture ({len(cases)} case(s)) — the "
          f"registered probe separates could-not-establish from not-yet")
    return True


fixtures_ok = fixture_pass()
fixtures_ok = probe_precondition_fixture() and fixtures_ok
if not fixtures_ok:
    sys.exit(1)

checks_dir = pathlib.Path("checks")
registry = json.loads((checks_dir / "registry.json").read_text())
entries = registry["checks"]

registered = {entry["file"] for entry in entries}
present = {p.name for p in checks_dir.iterdir()
           if p.is_file() and p.name != "registry.json"}

failures = []
for name in sorted(present - registered):
    failures.append(f"FAIL unregistered check file (dead code): checks/{name}")
for name in sorted(registered - present):
    failures.append(f"FAIL dangling registry entry (no such file): checks/{name}")

# Admission-shape validation (widened under kogaki#6, story 1.2; instrument
# grammar added under kogaki#113): an empty record passed the filename
# comparison above, which was the gap #6 names.
failures += validate_entries(entries)
# The delegating class and its floor (kogaki#661).
failures += validate_case_floor(entries)
floor_rows, floor_failures = check_floor_decrements(entries)
failures += floor_failures

rows, probe_failures = run_probes(entries)
failures += probe_failures
for row in floor_rows + rows:
    print(row)

for line in failures:
    print(line)
if failures:
    sys.exit(1)
print(f"ok: registry and checks/ tree agree ({len(present)} check(s)); "
      "every admission record complete; every removal signal instrumented; "
      "every efficacy case resolves to a label its cited file carries; "
      "every delegating member declares a case_floor and no floor was "
      "lowered unpaired")
EOF
