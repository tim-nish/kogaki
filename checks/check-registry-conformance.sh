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
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'EOF'
import json, pathlib, re, subprocess, sys, tempfile

INSTRUMENT = re.compile(r'^(act|none|probe): \S', re.DOTALL)
PROBE_TIMEOUT_S = 10


def validate_entries(entries):
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
    return failures


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
                "removal_signal": "s"}
        base.update(admission)
        if instrument is not None:
            base["removal_instrument"] = instrument
        return {"id": id_, "file": f"check-{id_}.sh", "admission": base}

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

rows, probe_failures = run_probes(entries)
failures += probe_failures
for row in rows:
    print(row)

for line in failures:
    print(line)
if failures:
    sys.exit(1)
print(f"ok: registry and checks/ tree agree ({len(present)} check(s)); "
      "every admission record complete; every removal signal instrumented")
EOF
