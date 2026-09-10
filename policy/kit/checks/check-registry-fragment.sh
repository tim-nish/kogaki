#!/usr/bin/env bash
# The registry fragment's conformance check — kit-held, so the installer's
# drift sentence holds in EVERY consumer rather than only where someone has
# written the comparison themselves (kogaki#732; contract
# `specs/spec-client-kit/SPEC.md` §7, cited here and restated nowhere).
#
# WHAT IT REFUSES, and it is exactly one thing: a divergence between
# `policy/kit/registry-entries.json` — the entries the kit ships for the
# checks it vendors — and this repository's own check registry, which is the
# file the runner actually reads. THE KIT IS THE SOURCE, so a divergence
# fails here naming the id, and the repair is to the consumer's copy.
#
# WHY THIS FILE EXISTS AT ALL, stated because the comparison already ran in
# this repository before it was written. `policy/kit/install.sh` told every
# consumer "the kit is the SOURCE for them: on divergence the registry
# conformance check fails naming the id, so the copy cannot drift" — and the
# instrument making that true was `checks/check-registry-conformance.sh`,
# kogaki's OWN file, absent from the kit. In any tree but this one the
# fragment was a copy with a declared source and NO enforcement: the advisory
# form the sentence claims to have escaped, said to the consumer at the moment
# of install. Vendoring the comparison is what makes the sentence
# unconditional, and it is the arm the owner selected at kogaki#732 over
# narrowing the wording to state its condition.
#
# AND THE COMPARISON MOVED RATHER THAN BEING COPIED. `check-registry-conformance.sh`
# no longer carries it. Two copies of a centrally-managed comparison, one in
# the kit and one in the consumer that hosts it, is the undeclared duplicate
# the kit's own relocation (kogaki#724) was filed to end — reproduced inside
# its own remedy, which is the shape kogaki#732 exists to refuse.
#
# WHAT IT DOES NOT CHECK, so the narrower claim is the true one: it compares
# the fragment against the registry and says nothing about whether the
# registry's OTHER entries are well-formed, whether the files they name
# exist, or whether any of them ever runs. Those are the host repository's
# own meta-check's, and this member neither duplicates nor replaces them.
set -euo pipefail

# REPO ROOT, RESOLVED BY GIT RATHER THAN BY DEPTH, and anchored at the script
# rather than the caller — the idiom `check-client-kit-install.sh` states in
# full, on the same ground: a kit-held check must not bind to one directory
# depth, and must not resolve some other repository it happens to be invoked
# from.
if [ "${1:-}" != "--self-test" ]; then
  cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" || {
    echo "FAIL: cannot resolve the repository root from this script's location"
    exit 1
  }
fi

python3 - "$@" <<'PY'
import json
import pathlib
import sys

FRAGMENT = "policy/kit/registry-entries.json"
DEFAULT_REGISTRY = "checks/registry.json"


def compare(fragment, registry):
    """The whole assertion, as a pure function of two registries.

    `fragment` is the kit's entry list, `registry` the consumer's — both the
    `checks` list, never the file. Returns a list of failure lines, empty on
    agreement.

    THE DIRECTION IS ONE-WAY BY DESIGN. Every id the kit ships must be in the
    consumer's registry and must match it; an id the CONSUMER holds and the
    kit does not is that repository's own check and is not this member's
    business. A both-ways comparison here would refuse every consumer that
    registers a check of its own, which is every consumer.
    """
    failures = []
    mine = {e["id"]: e for e in registry}
    for k in sorted(fragment, key=lambda e: e["id"]):
        local = mine.get(k["id"])
        if local is None:
            failures.append(
                f"FAIL kit check not registered: {k['id']} — the kit vendors "
                f"{k['file']} and this registry does not name it, so it runs "
                f"on zero occasions")
        elif local != k:
            differing = sorted(
                key for key in set(local) | set(k)
                if local.get(key) != k.get(key))
            failures.append(
                f"FAIL kit entry drifted: {k['id']} — this registry disagrees "
                f"with {FRAGMENT} on {', '.join(differing)}; the KIT is the "
                f"source, so repair the copy here rather than the fragment")
    return failures


def self_test():
    """In-file cases over `compare`, each constructing one named defect.

    The cases are pure functions of two registries, so they spawn nothing and
    this member delegates to no other artifact's pass — it is outside the
    delegating class rather than exempted from it.
    """
    kit = [{"id": "a", "file": "policy/kit/checks/check-a.sh",
            "admission": {"tier": "fast"}}]
    cases = []

    cases.append((
        "an id the kit ships and the registry does not name is refused (kogaki#732)",
        lambda: any("kit check not registered: a" in f
                    for f in compare(kit, []))))

    cases.append((
        "kit entry drifted is refused, naming the id and the differing keys (kogaki#732)",
        lambda: any("kit entry drifted: a" in f and "admission" in f
                    for f in compare(
                        kit, [{"id": "a",
                               "file": "policy/kit/checks/check-a.sh",
                               "admission": {"tier": "pre-push"}}]))))

    cases.append((
        "an identical copy is silent (kogaki#732)",
        lambda: compare(kit, [dict(kit[0])]) == []))

    cases.append((
        "an entry the CONSUMER holds and the kit does not is not a divergence (kogaki#732)",
        lambda: compare(kit, [dict(kit[0]),
                              {"id": "z", "file": "checks/check-z.sh",
                               "admission": {}}]) == []))

    cases.append((
        "a file key that drifted is named as the differing key (kogaki#732)",
        lambda: any("file" in f for f in compare(
            kit, [{"id": "a", "file": "checks/check-a.sh",
                   "admission": {"tier": "fast"}}]))))

    failed = 0
    for label, run in cases:
        try:
            ok = run()
        except Exception as exc:                      # noqa: BLE001
            ok, label = False, f"{label} [raised {exc!r}]"
        if not ok:
            failed += 1
            print(f"FAIL self-test case: {label}")
    if failed:
        return 1
    print(f"registry-fragment self-test: {len(cases)} case(s) pass")
    return 0


args = sys.argv[1:]
if "--self-test" in args:
    sys.exit(self_test())

registry_path = pathlib.Path(DEFAULT_REGISTRY)
if "--registry" in args:
    registry_path = pathlib.Path(args[args.index("--registry") + 1])

fragment_path = pathlib.Path(FRAGMENT)

# ABSENT FRAGMENT IS NOT A FAILURE — a repository that vendors no kit owes
# nothing — but it is STATED, so "no fragment" and "fragment agrees" are
# distinguishable rather than both rendering as silence.
if not fragment_path.is_file():
    print(f"registry-fragment: no {FRAGMENT} — no kit vendored, nothing owed")
    sys.exit(0)

fragment = json.loads(fragment_path.read_text(encoding="utf-8"))["checks"]

# AN ABSENT REGISTRY IS A FAILURE, and the asymmetry with the clause above is
# the point: the kit IS vendored here, and its entries are owed to a registry
# that does not exist, so every check it ships runs on zero occasions. A
# repository that wants neither owes neither, and removes the kit.
if not registry_path.is_file():
    print(f"FAIL no check registry at {registry_path} — {FRAGMENT} ships "
          f"{len(fragment)} entry/entries that nothing here registers, so "
          f"every check the kit vendors runs on zero occasions")
    sys.exit(1)

registry = json.loads(registry_path.read_text(encoding="utf-8"))["checks"]

failures = compare(fragment, registry)
for line in failures:
    print(line)
if failures:
    print()
    print(f"THE KIT IS THE SOURCE. Repair {registry_path} against {FRAGMENT}, "
          f"never the other way: the fragment is what every consumer of this "
          f"kit reads, and editing it here would move the source to satisfy "
          f"one copy.")
    sys.exit(1)

print(f"ok: {len(fragment)} vendored entry/entries agree with {registry_path} "
      f"(kit is the source)")
PY
