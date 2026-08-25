#!/usr/bin/env bash
# The owner-facing proposal contract, made checkable (manifest item 3,
# specs/SPEC.md:97-98; kogaki#15, umbrella kogaki#14).
#
# Validates every proposal record (*.proposal.json, anywhere in the tree)
# against specs/spec-proposal-contract/record-schema.json — the single
# carrier, whose field lists this check READS rather than restates.
#
# The fixtures under checks/fixtures/proposal-contract/ are this check's
# discrimination evidence: every non-conforming fixture declares the
# violation code it must produce, so the check is exercised for its ability
# to FAIL and not only to pass. A declared code with no fixture fails the
# run — an unexercised branch of a checker is the shape kogaki#6 was filed
# to end.
#
# What this check does NOT carry is stated in its own output: the
# effect-stating property's SUFFICIENCY half is judgment and routes to the
# review lane (kogaki#13, story 1.5). An unstated omission reads as
# coverage, which is the defect this repository repeatedly names.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'EOF'
import json, pathlib, re, sys

root = pathlib.Path(".")
schema_path = root / "specs/spec-proposal-contract/record-schema.json"
schema = json.loads(schema_path.read_text())

fixtures = root / "checks/fixtures/proposal-contract"

# Every violation code this validator can emit. Each one owes a fixture,
# except those declared unexerciseable-by-fixture below, with the reason.
CODES = {
    "MISSING_FIELD",
    "KIND_UNKNOWN",
    "ACT_NAVIGATION_AS_PROPOSAL",
    "ACT_PROPOSAL_AS_REPORT",
    "ACT_UNCLASSIFIED_NOT_REPORT",
    "REPORT_NARROWS",
    "OPTIONS_EMPTY",
    "OPTION_MISSING_FIELD",
    "PREMISE_NEGATION_ABSENT",
    "FREE_TEXT_NOT_ACCEPTED",
    "FREE_TEXT_CONDITIONAL",
    "LABEL_NOT_EFFECT_STATING",
    "ANSWER_WITHOUT_PAYLOAD",
    "PAYLOAD_MISSING_FIELD",
    "PAYLOAD_OPTIONS_MISMATCH",
    "PAYLOAD_FREE_TEXT_NOT_OFFERED",
}
# Declared, not silent: a fixture for this would be a file the fixture
# loader itself cannot read, so it is exercised on real records only.
CODES_WITHOUT_FIXTURE = {"MALFORMED_JSON": "a fixture would not parse as JSON"}


def validate(record):
    """Return a list of (code, detail) violations. Empty list = conforming."""
    v = []
    kind = record.get("kind")
    act = record.get("act")
    proposal_acts = schema["acts"]["proposal"]
    navigation_acts = schema["acts"]["navigation"]

    if kind not in schema["kinds"]:
        return [("KIND_UNKNOWN", f"kind={kind!r}; the contract has no third kind")]

    # §2.5 — the non-member fallback, both directions.
    if kind == "proposal" and act in navigation_acts:
        v.append(("ACT_NAVIGATION_AS_PROPOSAL",
                  f"{act!r} is navigation and carries no selection authority"))
    if kind == "report" and act in proposal_acts:
        v.append(("ACT_PROPOSAL_AS_REPORT",
                  f"{act!r} narrows the candidate set; it is a proposal"))
    if kind == "proposal" and act not in proposal_acts and act not in navigation_acts:
        v.append(("ACT_UNCLASSIFIED_NOT_REPORT",
                  f"{act!r} is in neither list; it is surfaced as a report with "
                  "its reason, never classified"))

    if kind == "report":
        spec = schema["report"]
        for field in spec["required"]:
            if field not in record or record[field] in (None, "", []):
                v.append(("MISSING_FIELD", f"report.{field}"))
        if record.get("narrows") is not spec["narrows_must_be"]:
            v.append(("REPORT_NARROWS",
                      "a report takes no narrowing action"))
        return v

    spec = schema["proposal"]
    for field in spec["required"]:
        if field not in record or record[field] in (None, "", []):
            v.append(("MISSING_FIELD", f"proposal.{field}"))

    # §2.3 — machine-proposed options, and the premise's negation among them.
    opt_spec = spec["options"]
    options = record.get("options") or []
    if len(options) < opt_spec["min"]:
        v.append(("OPTIONS_EMPTY", "a proposal offers machine-proposed options"))
    for i, option in enumerate(options):
        for field in opt_spec["required_per_option"]:
            if not str(option.get(field, "")).strip():
                v.append(("OPTION_MISSING_FIELD", f"options[{i}].{field}"))
    if opt_spec["premise_negation_required"] and options:
        flag = opt_spec["premise_negation_flag"]
        if not any(o.get(flag) is True for o in options):
            v.append(("PREMISE_NEGATION_ABSENT",
                      f"no option carries {flag}: true — a computed premise is "
                      "rendered WITH its negation as a first-class outcome"))

    # §2.3 — the free-text override, unconditional.
    ft_spec = spec["free_text"]
    free_text = record.get("free_text")
    if isinstance(free_text, dict):
        for field in ft_spec["required"]:
            if field not in free_text or free_text[field] in (None, ""):
                v.append(("MISSING_FIELD", f"free_text.{field}"))
        if free_text.get("accepted") is not ft_spec["accepted_must_be"]:
            v.append(("FREE_TEXT_NOT_ACCEPTED",
                      "the override is the owner's authority, always offered"))
        gating = sorted(set(free_text) & set(ft_spec["conditioning_keys_forbidden"]))
        if gating:
            v.append(("FREE_TEXT_CONDITIONAL",
                      f"gated by {', '.join(gating)}; the override is not "
                      "conditional on the options being inadequate"))

    # §2.2 — the effect-stating FORM floor. Sufficiency is not checked here.
    floor = spec["label_floor"]
    label = str(record.get("label", "")).strip()
    if label:
        lowered = label.lower()
        reasons = []
        if floor["reject_bare_act_token"] and lowered in [
                a.lower() for a in proposal_acts + navigation_acts]:
            reasons.append("a bare act token names the act, not its effect")
        if re.match(floor["reject_option_index_pattern"], lowered):
            reasons.append("an option index states nothing")
        if len(label.split()) < floor["min_words"]:
            reasons.append(f"fewer than {floor['min_words']} words")
        if floor["reject_identical_to_option_label"] and any(
                str(o.get("label", "")).strip().lower() == lowered for o in options):
            reasons.append("identical to an option's own label")
        if reasons:
            v.append(("LABEL_NOT_EFFECT_STATING", f"{label!r}: " + "; ".join(reasons)))

    # §2.4 — payload capture.
    answer = record.get("answer")
    if answer is not None:
        a_spec = schema["answer"]
        payload = answer.get("payload")
        if not payload:
            v.append(("ANSWER_WITHOUT_PAYLOAD",
                      "a recorded answer with no payload cannot be re-judged"))
        else:
            for field in a_spec["payload_required"]:
                if field not in payload or payload[field] in (None, "", []):
                    v.append(("PAYLOAD_MISSING_FIELD", f"payload.{field}"))
            offered = payload.get("options_offered")
            if a_spec["options_offered_must_equal_record_options"] and offered is not None:
                if sorted(offered) != sorted(o.get("id") for o in options):
                    v.append(("PAYLOAD_OPTIONS_MISMATCH",
                              "the payload disagrees with the options the record offered"))
            if payload.get("free_text_offered") is not a_spec["free_text_offered_must_be"]:
                v.append(("PAYLOAD_FREE_TEXT_NOT_OFFERED",
                          "the payload must record that free text was offered"))
    return v


def load(path):
    try:
        return json.loads(path.read_text()), None
    except json.JSONDecodeError as exc:
        return None, ("MALFORMED_JSON", str(exc))


failures = []

# 1. Real records — the default carrier: any *.proposal.json in the tree.
records = sorted(p for p in root.rglob("*.proposal.json") if ".git" not in p.parts)
for path in records:
    record, error = load(path)
    if error:
        failures.append(f"FAIL {path}: {error[0]} — {error[1]}")
        continue
    for code, detail in validate(record):
        failures.append(f"FAIL {path}: {code} — {detail}")

# 2. Fixtures — the discrimination evidence.
conforming = sorted((fixtures / "conforming").glob("*.json"))
nonconforming = sorted((fixtures / "nonconforming").glob("*.json"))
if not conforming or not nonconforming:
    print("FAIL fixtures missing: this check's discrimination is unevidenced")
    sys.exit(1)

for path in conforming:
    record, error = load(path)
    if error:
        failures.append(f"FAIL fixture {path}: MALFORMED_JSON — {error[1]}")
        continue
    for code, detail in validate(record):
        failures.append(f"FAIL conforming fixture rejected: {path}: {code} — {detail}")

covered = set()
for path in nonconforming:
    record, error = load(path)
    if error:
        failures.append(f"FAIL fixture {path}: MALFORMED_JSON — {error[1]}")
        continue
    expected = record.get("_expect")
    if not expected:
        failures.append(f"FAIL fixture {path}: no _expect code declared")
        continue
    got = [code for code, _ in validate(record)]
    if expected not in got:
        failures.append(f"FAIL fixture {path}: expected {expected}, validator emitted "
                        f"{got or 'nothing — the fixture CONFORMS'}")
    else:
        covered.add(expected)

uncovered = sorted(CODES - covered - set(CODES_WITHOUT_FIXTURE))
for code in uncovered:
    failures.append(f"FAIL violation code {code} has no non-conforming fixture "
                    "(an unexercised branch of a checker)")

for line in failures:
    print(line)
if failures:
    sys.exit(1)

# The report. What is carried, and — explicitly — what is not.
if records:
    print(f"records: {len(records)} *.proposal.json, all conforming")
else:
    print("records: 0 *.proposal.json in the tree — none yet; the contract is "
          "ported ahead of its first consumer (Terrain, specs/SPEC.md:109-112)")
print(f"fixtures: {len(conforming)} conforming accepted, {len(nonconforming)} "
      f"non-conforming each rejected with its declared code "
      f"({len(covered)}/{len(CODES - set(CODES_WITHOUT_FIXTURE))} violation codes exercised)")
for code, reason in sorted(CODES_WITHOUT_FIXTURE.items()):
    print(f"not fixture-exercised: {code} — {reason}; real records only")
print("effect-stating: the FORM FLOOR is carried here (bare act token, option "
      "index, single word, option-label echo).")
print("  NOT carried here: whether the stated effect is the effect that occurs, "
      "and whether it is in plain register — judgment, routed to the review "
      "lane (kogaki#13, story 1.5). A pass above is not a claim that a label "
      "is effect-stating.")
print("ok: proposal contract enforced — Where/Why, premise negation, "
      "unconditional free text, payload capture, non-member fallback "
      "(specs/spec-proposal-contract/SPEC.md)")
EOF
