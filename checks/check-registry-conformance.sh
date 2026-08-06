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
# not run. Any other exit, or a timeout, is COULD-NOT-ESTABLISH in the
# probe's own words — a crash is never spent as a finding — and it FAILS,
# because probes are declared tree-local, so a probe that cannot run is a
# defect in the declaration rather than a fact about the world. `none:`
# entries render as greppable residue rows: an unobservable signal is
# evidence when typed and an omission when not. The embedded fixture pass
# below exercises every branch on synthetic registries, every invocation.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'EOF'
import json, pathlib, re, subprocess, sys

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
            return subprocess.run(
                ["bash", "-c", cmd], capture_output=True,
                timeout=PROBE_TIMEOUT_S).returncode
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
            code = runner(payload)
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
            failures.append(
                f"FAIL probe could not establish: {entry['id']} — the probe "
                f"exited {code}; this is the probe's own failure, not a "
                f"finding about the check")
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

    rows, f = run_probes([entry("probe: fires")], runner=lambda c: 0)
    cases.append(("probe exit 0 renders candidate, never fails",
                  any(x.startswith("removal-candidate:") for x in rows)
                  and not f))
    rows, f = run_probes([entry("probe: quiet")], runner=lambda c: 1)
    cases.append(("probe exit 1 renders not-yet",
                  any(x.startswith("probe-not-yet:") for x in rows)
                  and not f))
    rows, f = run_probes([entry("probe: broken")], runner=lambda c: 3)
    cases.append(("probe crash is could-not-establish and fails",
                  any("could not establish" in x for x in f)
                  and not any(x.startswith("removal-candidate:")
                              for x in rows)))
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


if not fixture_pass():
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
