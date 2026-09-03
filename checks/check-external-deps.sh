#!/usr/bin/env bash
# The external-dependency registry, made checkable (specs/SPEC.md:861-874,
# specs/spec-external-deps/SPEC.md; kogaki#55, story 1.14).
#
# WHAT THIS CARRIES. `src/deps-registry.json` declares the capabilities this
# repository NEEDS but cannot install — a repository setting, an actor-level
# hook's install state, a spawned session's tool grants. The specimen is the
# held run on PR #51, where three obstacles were ONE defect: all assumed, none
# declared, so an unmet dependency presented as a stall or as a grant that was
# silently impossible to exercise. Both are indistinguishable at read time from
# a grant that has not been needed yet, which is what makes the class expensive.
#
# IT READS THE SCHEMA RATHER THAN RESTATING IT. Every field list below comes
# from specs/spec-external-deps/deps-schema.json — the single carrier, so
# amending the contract is one edit and never a two-copy divergence. Same
# arrangement as check-gate-carrier.sh against gate-schema.json.
#
# CONFORMANCE IS THE SUBJECT; THE WORLD IS A REPORT. It fails on a malformed or
# incomplete entry and NEVER on an unmet dependency — the schema's own
# `never_fails_on` list. Whether a setting elsewhere is currently flipped is a
# fact about the world outside this repository, which changes without anyone
# touching the diff under review; failing a PR over it would make the check a
# source of noise rather than of signal (SPEC.md §5, citing
# specs/spec-merge-eligibility/SPEC.md rather than re-deriving it).
#
# EVERY ROW IS RENDERED, INCLUDING THE ZEROES. A decidable verification's
# result is printed present or absent; a non-decidable entry's `reason` is
# printed as its own row rather than omitted, because a typed `none: <why>` is
# evidence and an omission is not (SPEC.md §3); and an empty registry's zero is
# printed rather than passing silently, because a silent pass is
# indistinguishable from a check that did not run.
#
# A READ THAT DID NOT COMPLETE IS NOT AN ABSENCE. A verification command that
# exits non-zero is reported COULD-NOT-ESTABLISH, on its own row, and never as
# "absent" — an instrument that reports absence without establishing it is the
# defect the review lane refuses one layer up (the check that used to carry that
# refusal here, check-review-report.sh, retired with the stack at kogaki#630;
# the refusal is the engine's now). The interpretation rule is
# stated in the output: the command owes an exit-0 read printing a value, and
# `true`/`false` is the shape both current decidable entries print.
#
# THE READS ARE EXECUTED, AND SO IS THE TIMEOUT. Each declared command runs
# under a hard per-command timeout, because this check sits in the pre-push loop
# and a hanging network read would cost the loop unboundedly
# (`a-checks-runtime-multiplies-by-its-loop-position`). Tier is `pre-push` on a
# measurement rather than a preference: the `gh api` read measured ~1.1s against
# a pre-push loop already costing ~6.8s, and the second decidable read is over
# the ACTOR's own settings file, which does not exist in CI at all — a CI tier
# would report could-not-establish for it on every run.
#
# THE NON-MEMBER FALLBACK IS THE LOAD-BEARING HALF (SPEC.md §4). A capability an
# act depended on and this registry does not declare is surfaced REPORT-ONLY
# WITH ITS REASON, never silently admitted. Its carrier is the registry's
# `observed_non_members` list, rendered here whether it is empty or not, and a
# recorded non-member that states no reason is a conformance failure — that is
# ADMIT-WITH-DISCLOSURE made checkable rather than promised.
#
# AND THE OBSERVATION HALF IS CARRIER-LESS, MARKED RATHER THAN OMITTED. Nothing
# in this repository detects mechanically that an act depended on an undeclared
# capability; the list is written by hand when a run meets one. Reopen trigger:
# one run that hit an undeclared capability and left no `observed_non_members`
# row, which is the evidence that the hand-written list is not a carrier.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'EOF'
import json, os, pathlib, subprocess, sys

root = pathlib.Path(".")
SCHEMA_PATH = "specs/spec-external-deps/deps-schema.json"
schema = json.loads((root / SCHEMA_PATH).read_text())

# The registry's location comes from the schema. The key holding the entries is
# this check's own (the schema names the file, never the key), so it is stated
# here rather than implied.
REGISTRY_PATH = schema["registry_path"]
ENTRIES_KEY = "dependencies"
NON_MEMBERS_KEY = "observed_non_members"

ENTRY = schema["entry"]
VERIFY = ENTRY["verification"]
FALLBACK = schema["fallback"]

# Every violation code this validator can emit. Each one owes a fixture, and
# the coverage assertion at the bottom is what keeps that true.
CODES = {
    "DEP_MISSING_FIELD",
    "DEP_NEEDED_BY_EMPTY",
    "DEP_VERIFICATION_NOT_AN_OBJECT",
    "DEP_VERIFICATION_MISSING_DECIDABLE",
    "DEP_VERIFICATION_SHAPE_DISAGREES",
    "DEP_VERIFICATION_REASON_EMPTY",
    "DEP_ABSENCE_SIGNATURE_EMPTY",
    "DEP_ID_DUPLICATE",
    "NON_MEMBER_MISSING_REASON",
}
# Declared, not silent.
CODES_WITHOUT_FIXTURE = {
    "MALFORMED_JSON": "a fixture would not parse as JSON; the live registry is "
                      "the only file this branch can reach"
}

# The read did not complete. Rendered on its own row and never as an absence.
CANNOT = "COULD-NOT-ESTABLISH"
# An exit-0 read whose output is one of these settles the question as ABSENT.
FALSY = {"", "false", "null", "0", "[]", "{}", "none"}
TIMEOUT_S = 20


# --------------------------------------------------------------------------
# Conformance — the check's subject. Nothing below reads the world.
# --------------------------------------------------------------------------
def validate_entry(entry):
    """Return a list of (code, detail). Empty list = conforming."""
    v = []
    if not isinstance(entry, dict):
        return [("DEP_MISSING_FIELD", f"entry is {type(entry).__name__}, not an object")]

    for field in ENTRY["required"]:
        value = entry.get(field)
        if field not in entry or value in (None, "", [], {}):
            v.append(("DEP_MISSING_FIELD", f"{field} — the schema's entry.required list"))

    needed_by = entry.get("needed_by")
    if isinstance(needed_by, list) and len(needed_by) < ENTRY["needed_by"]["min"]:
        v.append(("DEP_NEEDED_BY_EMPTY", ENTRY["needed_by"]["rationale"]))

    if ENTRY["absence_signature_must_be_nonempty"]:
        if not str(entry.get("absence_signature", "")).strip():
            v.append(("DEP_ABSENCE_SIGNATURE_EMPTY",
                      "what an unmet dependency LOOKS LIKE from inside a run is "
                      "the field that converts an unexplained stall into a "
                      "recognised one"))

    verification = entry.get("verification")
    if verification is None:
        return v                                   # already reported as missing
    if not isinstance(verification, dict):
        v.append(("DEP_VERIFICATION_NOT_AN_OBJECT",
                  f"verification is {type(verification).__name__}"))
        return v

    for field in VERIFY["required"]:
        if field not in verification:
            v.append(("DEP_VERIFICATION_MISSING_DECIDABLE",
                      f"verification.{field}: whether a cheap read exists is "
                      "itself declared, never inferred from which fields happen "
                      "to be present"))
            return v

    decidable = verification.get("decidable")
    if decidable is True:
        want = VERIFY["when_decidable"]["required"]
        for field in want:
            if not str(verification.get(field, "")).strip():
                v.append(("DEP_VERIFICATION_SHAPE_DISAGREES",
                          f"decidable=true but verification.{field} is absent or "
                          f"empty ({VERIFY['when_decidable']['answers_is']!r} is "
                          "what `answers` carries)"))
    elif decidable is False:
        for field in VERIFY["when_not_decidable"]["required"]:
            if field not in verification:
                v.append(("DEP_VERIFICATION_SHAPE_DISAGREES",
                          f"decidable=false but verification.{field} is absent — "
                          + VERIFY["when_not_decidable"]["rationale"]))
            elif (VERIFY["when_not_decidable"]["reason_must_be_nonempty"]
                    and not str(verification.get(field, "")).strip()):
                v.append(("DEP_VERIFICATION_REASON_EMPTY",
                          VERIFY["when_not_decidable"]["rationale"]))
        for field in VERIFY["when_decidable"]["required"]:
            if field in verification:
                v.append(("DEP_VERIFICATION_SHAPE_DISAGREES",
                          f"decidable=false but verification.{field} is present — "
                          "a `none:` entry that also carries a command claims two "
                          "answers to one question"))
    else:
        v.append(("DEP_VERIFICATION_SHAPE_DISAGREES",
                  f"verification.decidable={decidable!r} is not a boolean"))
    return v


def validate_non_member(observation):
    """The fallback made checkable: report-only, but never reason-less.

    ADMIT-WITH-DISCLOSURE is the whole difference between this shape and
    ADMIT-SILENTLY (schema fallback: %s / forbidden: %s).
    """
    if not isinstance(observation, dict):
        return [("NON_MEMBER_MISSING_REASON",
                 f"observation is {type(observation).__name__}, not an object")]
    if not str(observation.get("reason", "")).strip():
        return [("NON_MEMBER_MISSING_REASON",
                 f"{observation.get('capability', '<unnamed>')!r}: a non-member is "
                 f"{FALLBACK['non_member']} WITH ITS REASON; a reason-less row is "
                 f"{FALLBACK['forbidden']} wearing the fallback's name")]
    return []


def duplicate_ids(entries):
    seen, dupes = set(), []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        eid = entry.get("id")
        if eid in seen:
            dupes.append(("DEP_ID_DUPLICATE",
                          f"id={eid!r} declared twice; one capability, one row"))
        seen.add(eid)
    return dupes


# --------------------------------------------------------------------------
# The world — read, never gated.
# --------------------------------------------------------------------------
def run_verification(entry):
    """Return (state, detail). state in {'present','absent',CANNOT}.

    A non-zero exit is COULD-NOT-ESTABLISH and never 'absent': a read that did
    not complete establishes nothing, and an instrument that reports absence
    without establishing it is the defect this suite refuses one layer up.
    """
    command = entry["verification"]["command"]
    try:
        proc = subprocess.run(command, shell=True, capture_output=True,
                              text=True, timeout=TIMEOUT_S)
    except subprocess.TimeoutExpired:
        return CANNOT, f"the read did not return within {TIMEOUT_S}s"
    except OSError as exc:
        return CANNOT, f"the read could not be started: {exc}"
    out = (proc.stdout or "").strip()
    if proc.returncode != 0:
        err = " ".join((proc.stderr or "").split())[:160]
        return CANNOT, (f"exit {proc.returncode}"
                        + (f": {err}" if err else " with no stderr"))
    if out.lower() in FALSY:
        return "absent", f"the read returned {out!r}"
    return "present", f"the read returned {out!r}"


def registry_line(entries, path):
    """The registry's own count line. ONE function for both states, so the
    empty rendering is the same code path the live pass takes and can be
    asserted by a fixture rather than trusted."""
    if not entries:
        return (f"registry: 0 declared dependencies in {path} — none yet; the "
                "zero is rendered because a silent pass is indistinguishable "
                "from a check that did not run (SPEC.md §6 precedent: "
                "specs/spec-gate-carrier/SPEC.md:50-52)")
    return (f"registry: {len(entries)} declared dependency/dependencies in "
            f"{path}, all conforming")


# --------------------------------------------------------------------------
# Fixture pass — the discrimination evidence, run every invocation and needing
# no network. Conformant AND malformed entries both fire, because a validator
# whose rejecting path is never exercised is the orphan-guard shape kogaki#6
# was filed to end. The fixtures are synthetic so they do not move when the
# real registry gains an entry.
# --------------------------------------------------------------------------
def _conforming(**over):
    entry = {
        "id": "fixture-cap",
        "capability": "a capability named as the thing rather than as its consumer",
        "needed_by": ["an act that breaks without it"],
        "verification": {"decidable": True, "command": "echo true",
                         "answers": "is it there?"},
        "absence_signature": "the run stalls in a way that looks like it is working",
        "license": "kogaki#55",
    }
    entry.update(over)
    return entry


NONE_ENTRY = _conforming(
    verification={"decidable": False,
                  "reason": "the grant set belongs to a session that does not "
                            "exist until it is spawned"})

FIXTURES = [
    # (name, entry, expected codes)
    ("a conforming decidable entry is accepted", _conforming(), []),
    ("a conforming `none: <why>` entry is accepted — a typed none is evidence",
     NONE_ENTRY, []),
    ("NEVER FAILS ON THE WORLD: a conforming entry whose read reports ABSENT "
     "raises no violation",
     _conforming(verification={"decidable": True, "command": "echo false",
                               "answers": "is it there?"}), []),
    ("NEVER FAILS ON THE WORLD: nor when the read cannot be performed at all",
     _conforming(verification={"decidable": True,
                               "command": "exit 127", "answers": "is it there?"}), []),
    ("a missing required field is rejected",
     _conforming(license=""), ["DEP_MISSING_FIELD"]),
    ("an empty needed_by is rejected — a capability nothing needs is not a "
     "dependency",
     _conforming(needed_by=[]), ["DEP_MISSING_FIELD", "DEP_NEEDED_BY_EMPTY"]),
    ("a whitespace-only absence_signature is rejected — it passes the "
     "required-field test and is still no signature",
     _conforming(absence_signature="   "), ["DEP_ABSENCE_SIGNATURE_EMPTY"]),
    ("decidable=true with no command: the flag disagrees with the fields present",
     _conforming(verification={"decidable": True, "answers": "is it there?"}),
     ["DEP_VERIFICATION_SHAPE_DISAGREES"]),
    ("decidable=false with a command: two answers to one question",
     _conforming(verification={"decidable": False, "reason": "no cheap read",
                               "command": "echo true"}),
     ["DEP_VERIFICATION_SHAPE_DISAGREES"]),
    ("decidable=false with an EMPTY reason: the omission the typed none refuses",
     _conforming(verification={"decidable": False, "reason": "  "}),
     ["DEP_VERIFICATION_REASON_EMPTY"]),
    ("a missing `decidable` flag is rejected rather than inferred",
     _conforming(verification={"command": "echo true", "answers": "is it there?"}),
     ["DEP_VERIFICATION_MISSING_DECIDABLE"]),
    ("a non-object verification is rejected",
     _conforming(verification="gh api ..."), ["DEP_VERIFICATION_NOT_AN_OBJECT"]),
]

failures = []
for name, entry, want in FIXTURES:
    got = sorted({code for code, _ in validate_entry(entry)})
    if got != sorted(set(want)):
        failures.append(f"{name}: got {got or 'nothing — the fixture CONFORMS'}, "
                        f"want {sorted(set(want)) or 'nothing'}")

# The world half of the two never-fails-on fixtures: the states are asserted
# directly, so "it did not fail" is not the only evidence that they discriminate.
for command, want_state in (("echo true", "present"), ("echo false", "absent"),
                            ("echo", "absent"), ("exit 127", CANNOT)):
    state, _ = run_verification(_conforming(
        verification={"decidable": True, "command": command, "answers": "?"}))
    if state != want_state:
        failures.append(f"verification read {command!r}: got {state}, want {want_state}")

# Duplicate ids, and the non-member fallback's own discrimination.
if not duplicate_ids([_conforming(), _conforming(id="other")]):
    pass
else:
    failures.append("duplicate-id detector fired on two distinct ids")
if [c for c, _ in duplicate_ids([_conforming(), _conforming()])] != ["DEP_ID_DUPLICATE"]:
    failures.append("duplicate-id detector did not fire on two identical ids")
if validate_non_member({"capability": "x", "reason": "why it was met undeclared"}):
    failures.append("a non-member WITH its reason was rejected; the fallback is "
                    "report-only, not a violation")
if [c for c, _ in validate_non_member({"capability": "x"})] != ["NON_MEMBER_MISSING_REASON"]:
    failures.append("a reason-less non-member was admitted silently — the one "
                    "thing the fallback forbids")

# The empty registry renders its zero EXPLICITLY. Asserted here rather than
# left to prose, because the live registry is non-empty and this branch would
# otherwise never be exercised on any run — the shape that lets a rendering
# rot unnoticed until the day it is needed.
if "0 declared dependencies" not in registry_line([], "src/deps-registry.json"):
    failures.append("the empty registry does not render its zero explicitly; a "
                    "silent pass is indistinguishable from a check that did not run")
if "0 declared dependencies" in registry_line([_conforming()], "src/deps-registry.json"):
    failures.append("the zero rendering fired on a non-empty registry")

fixture_codes = set()
for _, entry, want in FIXTURES:
    fixture_codes |= set(want)
fixture_codes |= {"DEP_ID_DUPLICATE", "NON_MEMBER_MISSING_REASON"}
for code in sorted(CODES - fixture_codes - set(CODES_WITHOUT_FIXTURE)):
    failures.append(f"violation code {code} has no fixture (an unexercised "
                    "branch of a checker)")

if failures:
    print("FAIL fixture pass — the validator does not discriminate:")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
print(f"fixture pass: {len(FIXTURES)} entry-shape cases (conformant and "
      f"malformed both fired), 4 verification-read states "
      f"(present/absent/empty-output/{CANNOT}), duplicate ids, and both "
      f"directions of the non-member fallback — "
      f"{len(fixture_codes & CODES)}/{len(CODES)} violation codes exercised")
for code, reason in sorted(CODES_WITHOUT_FIXTURE.items()):
    print(f"not fixture-exercised: {code} — {reason}")

# --------------------------------------------------------------------------
# The live pass.
# --------------------------------------------------------------------------
registry_path = root / REGISTRY_PATH
try:
    registry = json.loads(registry_path.read_text())
except FileNotFoundError:
    print(f"FAIL MALFORMED_JSON {registry_path}: the registry named by "
          f"{SCHEMA_PATH} does not exist. A registry that cannot be read is not "
          "an empty one.")
    sys.exit(1)
except json.JSONDecodeError as exc:
    print(f"FAIL MALFORMED_JSON {registry_path}: {exc}")
    sys.exit(1)

entries = registry.get(ENTRIES_KEY)
if not isinstance(entries, list):
    print(f"FAIL MALFORMED_JSON {registry_path}: no readable {ENTRIES_KEY!r} "
          "list — an unparseable enumeration is not an empty one")
    sys.exit(1)

live = list(duplicate_ids(entries))
for i, entry in enumerate(entries):
    eid = entry.get("id") if isinstance(entry, dict) else f"[{i}]"
    for code, detail in validate_entry(entry):
        live.append((code, f"{registry_path}[{eid!r}]: {detail}"))

non_members = registry.get(NON_MEMBERS_KEY)
if non_members is None:
    non_members = []
elif not isinstance(non_members, list):
    live.append(("NON_MEMBER_MISSING_REASON",
                 f"{registry_path}: {NON_MEMBERS_KEY!r} is not a list"))
    non_members = []
for observation in non_members:
    for code, detail in validate_non_member(observation):
        live.append((code, f"{registry_path}[{NON_MEMBERS_KEY}]: {detail}"))

if live:
    for code, detail in live:
        print(f"FAIL {code} — {detail}")
    print(f"Conformance is this check's subject: the entry shape is "
          f"{SCHEMA_PATH}'s, and it is the ONLY thing that fails here. An unmet "
          "dependency below would have been reported, never failed.")
    sys.exit(1)

print(f"schema: {SCHEMA_PATH} v{schema['version']} — field lists READ, never "
      "restated")

# The zero, rendered rather than passed over silently — the same code path the
# fixture above asserts.
print(registry_line(entries, registry_path))

decidable = [e for e in entries if e["verification"].get("decidable") is True]
typed_none = [e for e in entries if e["verification"].get("decidable") is False]

print(f"verification: {len(decidable)} decidable read(s) executed, "
      f"{len(typed_none)} typed `none:` row(s) — a read is PRESENT when its "
      f"command exits 0 with an output outside {sorted(FALSY)}, ABSENT when it "
      f"exits 0 with one of them, and {CANNOT} when it does not exit 0 at all; "
      "a read that did not complete never counts as an absence")
for entry in decidable:
    state, detail = run_verification(entry)
    print(f"  [{state}] {entry['id']} — {entry['capability']}")
    print(f"      read: {entry['verification']['command']}")
    print(f"      {detail}; answers: {entry['verification']['answers']}")
    if state != "present":
        print(f"      absence signature: {entry['absence_signature']}")
for entry in typed_none:
    print(f"  [none: not decidable] {entry['id']} — {entry['capability']}")
    print(f"      reason: {entry['verification']['reason']}")
    print(f"      absence signature: {entry['absence_signature']}")

if non_members:
    print(f"non-members observed: {len(non_members)}, "
          f"{FALLBACK['non_member']} with their reasons "
          f"({FALLBACK['forbidden']} is what this forbids)")
    for observation in non_members:
        print(f"  [report-only] {observation.get('capability')} — "
              f"{observation.get('reason')}")
else:
    print(f"non-members observed: 0 — rendered rather than omitted. A capability "
          f"an act depended on and this registry does not declare is "
          f"{FALLBACK['non_member']} with its reason and never "
          f"{FALLBACK['forbidden']}; {FALLBACK['rationale']}")

print("REPORT, NEVER GATE: an unmet or unestablished dependency above did not "
      "fail this check and withholds no lane (SPEC.md §5). What fails here is "
      f"only the schema's fails_on list: {'; '.join(schema['check_semantics']['fails_on'])}.")
print("not carried here, stated rather than implied: nothing in this repository "
      f"DETECTS an undeclared capability — {NON_MEMBERS_KEY} is written by hand "
      "when a run meets one, so the fallback's observation half is carrier-less. "
      "Reopen trigger: one run that hit an undeclared capability and left no row.")
print("also not carried here: whether a declared read actually answers the "
      "question its `answers` line claims, and whether an absence_signature is "
      "the signature the absence really leaves — judgment, routed to the review "
      "lane (kogaki#13).")
print("ok: external-dependency registry enforced — declared enumeration, "
      "decidable reads executed and rendered, typed `none:` rows rendered, "
      "non-member fallback report-only (specs/spec-external-deps/SPEC.md)")
EOF
