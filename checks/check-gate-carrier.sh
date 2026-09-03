#!/usr/bin/env bash
# The gate carrier, made checkable (manifest item 4, specs/SPEC.md:99-101;
# kogaki#16, umbrella kogaki#14).
#
# Validates the declared gate registry (gates/registry.json) and every gate
# capture file (*.gate-capture.json, anywhere in the tree) against
# src/gate-schema.json — the single carrier, whose field
# lists this check READS rather than restates.
#
# Three properties are this check's alone and overlap nothing in
# check-proposal-contract.sh (which binds a proposal RECORD and by its own
# §4 delivers no rendering):
#   1. the medium binding — in a Claude Code host a gate renders through the
#      selector affordance (AskUserQuestion) and never as prose;
#   2. AskUserQuestion tool-use evidence beside every captured answer;
#   3. the coverage claim — a fraction OF the registry, stated as such.
#
# Its reporting obeys the three-part remedy the served instance names: guard
# the crash, report a crash AS a crash (CANNOT-DETERMINE, never a finding),
# and disclose repetition so identical output cannot be read as accumulating
# evidence.
#
# What this check does NOT carry is stated in its own output: the comparison
# obligation's SUFFICIENCY half is judgment and routes to the review lane
# (kogaki#13, story 1.5). An unstated omission reads as coverage.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'EOF'
import json, pathlib, sys
from collections import Counter

root = pathlib.Path(".")
schema = json.loads((root / "src/gate-schema.json").read_text())
fixtures = root / "checks/fixtures/gate-carrier"

# Every violation code this validator can emit. Each one owes a fixture.
CODES = {
    "GATE_MISSING_FIELD",
    "GATE_HOST_UNKNOWN",
    "GATE_MEDIUM_FORBIDDEN",
    "GATE_MEDIUM_VIOLATES_HOST_BINDING",
    "GATE_OPTIONS_EMPTY",
    "GATE_OPTION_MISSING_FIELD",
    "GATE_OPTION_PRESELECTED",
    "GATE_FREE_TEXT_NOT_OFFERED",
    "COMPARISON_ABSENT",
    "COMPARISON_MISSING_FIELD",
    "COMPARISON_RECOMMENDED_NOT_AN_OPTION",
    "COMPARISON_OPTION_EVIDENCE_ABSENT",
    "CAPTURE_MISSING_FIELD",
    "CAPTURE_GATE_UNREGISTERED",
    "CAPTURE_EVIDENCE_NOT_ASKUSERQUESTION",
    "CAPTURE_PAYLOAD_MISSING_FIELD",
    "CAPTURE_PAYLOAD_FREE_TEXT_NOT_OFFERED",
    "CAPTURE_PAYLOAD_OPTIONS_MISMATCH",
    "CAPTURE_GATELESS_MISSING_REASON",
    "CAPTURE_GATELESS_CARRIES_PAYLOAD",
}
# Declared, not silent.
CODES_WITHOUT_FIXTURE = {"MALFORMED_JSON": "a fixture would not parse as JSON"}

CRASH = schema["reporting"]["crash_code"]


# --------------------------------------------------------------------------
# Gate validation
# --------------------------------------------------------------------------
def validate_gate(gate):
    """Return a list of (code, detail). Empty list = conforming."""
    v = []
    spec = schema["gate"]
    for field in spec["required"]:
        if field not in gate or gate[field] in (None, "", []):
            v.append(("GATE_MISSING_FIELD", f"gate.{field}"))

    # The medium binding. Prose is never a medium, in any host — the general
    # form is unfalsifiable, so the named affordance is what makes it
    # checkable (topics/claude-code-ops.md:61@5f769dfe).
    host = gate.get("host")
    medium = gate.get("medium")
    if medium in schema["media_forbidden_in_every_host"]:
        v.append(("GATE_MEDIUM_FORBIDDEN",
                  f"medium={medium!r}: a gate rendered in the surrounding "
                  "narration register is scrolled past however complete it is"))
    if host is not None:
        binding = schema["hosts"].get(host)
        if binding is None:
            v.append(("GATE_HOST_UNKNOWN",
                      f"host={host!r} has no declared medium binding; a host "
                      "gets its own binding rather than inheriting one"))
        elif medium != binding["medium_must_be"]:
            v.append(("GATE_MEDIUM_VIOLATES_HOST_BINDING",
                      f"host={host!r} binds medium to "
                      f"{binding['medium_must_be']!r} ({binding['affordance']}); "
                      f"got {medium!r}"))

    opt_spec = spec["options"]
    options = gate.get("options") or []
    if len(options) < opt_spec["min"]:
        v.append(("GATE_OPTIONS_EMPTY",
                  "a gate presents machine-proposed selectable options"))
    for i, option in enumerate(options):
        for field in opt_spec["required_per_option"]:
            if not str(option.get(field, "")).strip():
                v.append(("GATE_OPTION_MISSING_FIELD", f"options[{i}].{field}"))
        preselected = sorted(set(option) & set(opt_spec["preselection_keys_forbidden"]))
        if preselected:
            v.append(("GATE_OPTION_PRESELECTED",
                      f"options[{i}] carries {', '.join(preselected)} — nothing is "
                      "pre-selected; a rank is not a pre-selection"))

    if gate.get("free_text_offered") is not spec["free_text_offered_must_be"]:
        v.append(("GATE_FREE_TEXT_NOT_OFFERED",
                  "the free-form override is the owner's authority and rides "
                  "every gate"))

    # The machine's own comparison — item 4's, decided here (SPEC.md §5).
    c_spec = schema["comparison"]
    comparison = gate.get("comparison")
    if gate.get("fork") is True and c_spec["required_when_fork"]:
        if not comparison:
            v.append(("COMPARISON_ABSENT",
                      "a fork gate owes a ranked recommendation with per-option "
                      "evidence; withholding the machine's judgment moves it "
                      "off-screen, not away"))
        else:
            for field in c_spec["required"]:
                if field not in comparison or comparison[field] in (None, "", []):
                    v.append(("COMPARISON_MISSING_FIELD",
                              f"comparison.{field}"
                              + ("  — a recommendation without its overturning "
                                 "evidence is a default in disguise"
                                 if field == "overturned_by" else "")))
            recommended = comparison.get("recommended")
            if (c_spec["recommended_must_be_option_id"] and recommended
                    and recommended not in [o.get("id") for o in options]):
                v.append(("COMPARISON_RECOMMENDED_NOT_AN_OPTION",
                          f"recommended={recommended!r} is not an offered option id"))
            field = c_spec["per_option_evidence_field"]
            for i, option in enumerate(options):
                if not str(option.get(field, "")).strip():
                    v.append(("COMPARISON_OPTION_EVIDENCE_ABSENT",
                              f"options[{i}].{field}: each option carries the "
                              "evidence bearing on it"))
    return v


# --------------------------------------------------------------------------
# Capture validation. Every row is guarded: a row that cannot be judged is
# reported as CANNOT-DETERMINE and never as a finding.
# --------------------------------------------------------------------------
def declared_options(gate_id, registered_options, decl_dir):
    """The comparison target for a capture row's `options_offered`, per
    specs/spec-gate-carrier/SPEC.md §4.1 (v4, kogaki#818).

    The run's OWN declaration where one sits beside the capture; the registry
    entry otherwise. The defect this resolves was a homonym on "the tree": the
    registry's `dynamic_options` prose meant the COMMITTED tree (`/runs/*` is
    ignored), while this check reads the WORKING DIRECTORY — so a run that
    composed its options per run, exactly as the registry says it does, could
    never pass.

    Returns `(options, source)` — and None options where no target is
    resolvable, which is the pre-existing "gate is in no registry" path,
    reported by its own code and never here. The source travels WITH the
    options rather than being re-derived by the caller: a second `is_file()`
    probe would be a second answer to a question this one already answered,
    free to disagree with it.
    A sibling that exists and will not parse RAISES: the row guard turns that
    into a CANNOT-DETERMINE, because an unreadable declaration is a defect in
    this checker's inputs and not a finding against the gate (§7).
    """
    if decl_dir is not None:
        sibling = decl_dir / f"{gate_id}{schema['capture']['run_declaration_suffix']}"
        if sibling.is_file():
            doc, error = load(sibling)
            if error:
                raise ValueError(
                    f"{sibling.name} sits beside the capture and will not parse "
                    f"({error[1]}) — the run's declaration is the comparison "
                    f"target and an unreadable one cannot be compared against")
            opts = doc.get("options")
            if not isinstance(opts, list):
                raise ValueError(
                    f"{sibling.name} carries no readable 'options' list")
            return [o.get("id") for o in opts], (
                f"{sibling.name}, the declaration this run raised")
    return registered_options.get(gate_id), "gates/registry.json"


def validate_row(row, registered_gate_ids, registered_options, decl_dir=None):
    v = []
    c = schema["capture"]
    for field in c["row_required"]:
        if field not in row:
            v.append(("CAPTURE_MISSING_FIELD", f"row.{field}"))

    gate_id = row.get("gate_id")

    # The gate-less row: legitimate, and the fixture no suite upstream held.
    if gate_id is None:
        g = c["gateless_row"]
        for field in g["required"]:
            if not str(row.get(field, "")).strip():
                v.append(("CAPTURE_GATELESS_MISSING_REASON",
                          f"gate-less row {row.get('stop_id')!r} states no "
                          f"{field}; a stop that raised no gate says so"))
        present = sorted(set(row) & set(g["forbidden"]))
        if present:
            v.append(("CAPTURE_GATELESS_CARRIES_PAYLOAD",
                      f"gate-less row {row.get('stop_id')!r} carries "
                      f"{', '.join(present)} with no gate to attribute it to"))
        return v

    if gate_id not in registered_gate_ids:
        v.append(("CAPTURE_GATE_UNREGISTERED",
                  f"gate_id={gate_id!r} is in no registry; an unregistered gate "
                  "is the uncovered-by-default shape"))

    for field in c["gate_row_required"]:
        if field not in row or row[field] in (None, "", []):
            v.append(("CAPTURE_MISSING_FIELD", f"row.{field}"))

    evidence = row.get("evidence")
    if evidence:
        for field in c["evidence_required"]:
            if not str(evidence.get(field, "")).strip():
                v.append(("CAPTURE_MISSING_FIELD", f"row.evidence.{field}"))
        if evidence.get("tool") != c["evidence_tool_must_be"]:
            v.append(("CAPTURE_EVIDENCE_NOT_ASKUSERQUESTION",
                      f"evidence.tool={evidence.get('tool')!r}; the rendering "
                      "evidence is the question UI's own tool use, not a claim "
                      "that it was used"))

    payload = row.get("payload")
    if payload:
        for field in c["payload_required"]:
            if field not in payload or payload[field] in (None, "", []):
                v.append(("CAPTURE_PAYLOAD_MISSING_FIELD", f"payload.{field}"))
        if payload.get("free_text_offered") is not c["payload_free_text_offered_must_be"]:
            v.append(("CAPTURE_PAYLOAD_FREE_TEXT_NOT_OFFERED",
                      "the payload must record that free text was offered"))
        offered = payload.get("options_offered")
        if c["payload_options_must_equal_declared_gate_options"] and offered is not None:
            target, source = declared_options(gate_id, registered_options,
                                              decl_dir)
            if target is not None and sorted(offered) != sorted(target):
                v.append(("CAPTURE_PAYLOAD_OPTIONS_MISMATCH",
                          f"the payload's options disagree with the options gate "
                          f"{gate_id!r} declares in {source}"))
    return v


def validate_capture_doc(doc, registered_gate_ids, registered_options, where,
                         decl_dir=None):
    """Return (violations, cannot_determines). Each row is guarded."""
    violations, crashes = [], []
    rows = doc.get(schema["capture"]["rows_key"])
    if not isinstance(rows, list):
        crashes.append((CRASH, f"{where}: no readable "
                               f"{schema['capture']['rows_key']!r} list"))
        return violations, crashes
    for row in rows:
        try:
            violations.extend(validate_row(row, registered_gate_ids,
                                           registered_options, decl_dir))
        except Exception as exc:              # the guard, on every write path
            # Keyed WITHOUT the row index, deliberately: a deterministic cause
            # produces the identical entry N times, and collapsing on that key
            # is what lets the rendering disclose the repetition instead of
            # printing N lines that read as N independent confirmations.
            crashes.append((CRASH, f"{where}: {type(exc).__name__}: {exc}"))
    return violations, crashes


def render(items, prefix):
    """Collapse identical entries and DISCLOSE the repetition. Identical
    output N times reads as N independent confirmations, which is precisely
    the inference a deterministic cause makes false."""
    lines = []
    for (code, detail), n in Counter(items).items():
        line = f"{prefix} {code} — {detail}".strip() if prefix else f"{code} — {detail}"
        if n > 1:
            line += (f"  ×{n} (identical output, one deterministic cause — "
                     "not {n} independent confirmations)".replace("{n}", str(n)))
        lines.append(line)
    return lines


def load(path):
    try:
        return json.loads(path.read_text()), None
    except json.JSONDecodeError as exc:
        return None, ("MALFORMED_JSON", str(exc))


failures = []
cannot_determine = []

# 1. The declared gate registry — the enumeration coverage is measured against.
registry_path = root / "gates/registry.json"
registry, error = load(registry_path)
if error:
    print(f"FAIL {registry_path}: {error[0]} — {error[1]}")
    sys.exit(1)
gates = registry.get("gates", [])
for gate in gates:
    for code, detail in validate_gate(gate):
        failures.append((code, f"{registry_path}[{gate.get('id')!r}]: {detail}"))
registered_ids = {g.get("id") for g in gates}
registered_options = {g.get("id"): [o.get("id") for o in (g.get("options") or [])]
                      for g in gates}

# 2. Capture files — the default carrier: any *.gate-capture.json in the tree.
captures = sorted(p for p in root.rglob("*.gate-capture.json")
                  if ".git" not in p.parts and fixtures not in p.parents)
capture_rows = 0
gateless_rows = 0
covered_gates = set()
for path in captures:
    doc, error = load(path)
    if error:
        failures.append(("MALFORMED_JSON", f"{path}: {error[1]}"))
        continue
    rows = doc.get("rows") or []
    capture_rows += len(rows) if isinstance(rows, list) else 0
    if isinstance(rows, list):
        for row in rows:
            if isinstance(row, dict):
                if row.get("gate_id") is None:
                    gateless_rows += 1
                else:
                    covered_gates.add(row.get("gate_id"))
    v, c = validate_capture_doc(doc, registered_ids, registered_options,
                                str(path), path.parent)
    failures.extend((code, f"{path}: {detail}") for code, detail in v)
    cannot_determine.extend(c)

# 3. Fixtures — this check's discrimination evidence.
fx_registry, error = load(fixtures / "fixture-registry.json")
if error:
    print(f"FAIL fixture registry unreadable: {error[1]}")
    sys.exit(1)
fx_ids = {g.get("id") for g in fx_registry["gates"]}
fx_options = {g.get("id"): [o.get("id") for o in (g.get("options") or [])]
              for g in fx_registry["gates"]}

covered_codes = set()


def fixture_paths(kind):
    """The fixtures in one directory.

    A `*.run-declaration.json` beside a capture fixture is that fixture's
    INPUT, not a fixture of its own — it is what §4.1 makes the comparison
    target, and the fixture directory is shaped like a real run workspace so
    that the filesystem lookup under test is the same one the production path
    performs. Excluding it here is what keeps that possible: this glob is
    `*.json` while the real capture scanner globs `*.gate-capture.json`, so
    only here could a declaration be mistaken for a subject.
    """
    suffix = schema["capture"]["run_declaration_suffix"]
    return sorted(p for p in (fixtures / kind).glob("*.json")
                  if not p.name.endswith(suffix))


def fixture_codes(path):
    """All codes a fixture provokes, whether it is a gate or a capture file."""
    doc, error = load(path)
    if error:
        return None, [("MALFORMED_JSON", error[1])], []
    if doc.get("_fixture") == "capture":
        v, c = validate_capture_doc(doc, fx_ids, fx_options, str(path),
                                    path.parent)
        return doc, v, c
    return doc, validate_gate(doc), []


for kind, expect_clean in (("conforming", True), ("nonconforming", False)):
    paths = fixture_paths(kind)
    if not paths:
        print(f"FAIL fixtures/{kind} is empty: this check's discrimination "
              "is unevidenced")
        sys.exit(1)
    for path in paths:
        doc, v, c = fixture_codes(path)
        got = [code for code, _ in v]
        if expect_clean:
            for code, detail in v:
                failures.append(("FIXTURE", f"conforming fixture rejected: "
                                            f"{path}: {code} — {detail}"))
            if c and not doc.get("_expect_cannot_determine"):
                failures.append(("FIXTURE", f"conforming fixture crashed the "
                                            f"validator: {path}: {c}"))
            continue
        expected = doc.get("_expect") if doc else None
        expected_cd = (doc or {}).get("_expect_cannot_determine")
        if expected_cd:
            # The crash path: it must be reported AS a crash and never as a
            # finding. A fixture that produces a violation instead has failed.
            if not c:
                failures.append(("FIXTURE", f"{path}: expected a guarded "
                                            f"{CRASH}, validator produced none"))
            if got:
                failures.append(("FIXTURE", f"{path}: a crash was reported as a "
                                            f"finding ({got}) — the false-accusation shape"))
            want = doc.get("_expect_repetition")
            if want and len(c) != want:
                failures.append(("FIXTURE", f"{path}: expected {want} identical "
                                            f"{CRASH} entries, got {len(c)}"))
            if want:
                rendered = render(c, "")
                if len(rendered) != 1 or f"×{want}" not in rendered[0]:
                    failures.append(("FIXTURE", f"{path}: repetition not disclosed "
                                                f"in the rendered line: {rendered}"))
            covered_codes.add(CRASH)
            continue
        if not expected:
            failures.append(("FIXTURE", f"{path}: no _expect code declared"))
            continue
        if expected not in got:
            failures.append(("FIXTURE", f"{path}: expected {expected}, validator "
                                        f"emitted {got or 'nothing — the fixture CONFORMS'}"))
        else:
            covered_codes.add(expected)

for code in sorted(CODES - covered_codes - set(CODES_WITHOUT_FIXTURE)):
    failures.append(("FIXTURE", f"violation code {code} has no non-conforming "
                                "fixture (an unexercised branch of a checker)"))

# --------------------------------------------------------------------------
# The report. Findings and crashes are rendered SEPARATELY and labelled; a
# crash is never spent as a positive finding.
# --------------------------------------------------------------------------
for line in render(failures, "FAIL"):
    print(line)
for line in render(cannot_determine, ""):
    print(line)
if cannot_determine:
    print(f"CANNOT-DETERMINE: {len(cannot_determine)} row(s) could not be judged. "
          "This is a defect in this checker, not a finding against the audited "
          "gate — debug here, not there.")
if failures:
    sys.exit(1)

if gates:
    print(f"registry: {len(gates)} declared gate(s), all conforming "
          f"(gates/registry.json)")
    print(f"coverage: {len(covered_gates & registered_ids)}/{len(gates)} declared "
          "gate(s) have a capture row — a fraction OF the registry and of nothing "
          "else; an unregistered gate is uncovered by default")
else:
    print("registry: 0 declared gates in gates/registry.json — none yet; the "
          "carrier is ported ahead of its first consumer (Terrain, "
          "specs/SPEC.md:109-112)")
    print("coverage: 0/0 — vacuous by construction, stated rather than omitted; "
          "the registry is what would make the fraction mean anything")
print(f"captures: {len(captures)} *.gate-capture.json, {capture_rows} row(s), "
      f"{gateless_rows} of them gate-less (a legitimate row class, not a crash)")
print(f"fixtures: {len(fixture_paths('conforming'))} conforming "
      f"accepted, {len(fixture_paths('nonconforming'))} "
      f"non-conforming each rejected with its declared code "
      f"({len(covered_codes & CODES)}/{len(CODES)} violation codes exercised, plus "
      f"the guarded {CRASH} path and its repetition disclosure)")
for code, reason in sorted(CODES_WITHOUT_FIXTURE.items()):
    print(f"not fixture-exercised: {code} — {reason}; real files only")
print("the machine's own comparison: ranked recommendation, per-option evidence, "
      "and the evidence that would overturn it are carried HERE (item 4, not "
      "item 3 — see specs/spec-gate-carrier/SPEC.md §5), STRUCTURALLY only.")
print("  NOT carried here: whether the attached evidence is the evidence bearing "
      "on the option, whether the overturning evidence would overturn the "
      "recommendation, and whether the question reads as a gate beyond its named "
      "affordance — judgment, routed to the review lane (kogaki#13, story 1.5). "
      "A pass above is not a claim that a gate's comparison is adequate.")
print("ok: gate carrier enforced — declared registry, medium binding "
      "(selector, never prose), AskUserQuestion evidence, payload/answer "
      "capture, gate-less rows (specs/spec-gate-carrier/SPEC.md)")
EOF
