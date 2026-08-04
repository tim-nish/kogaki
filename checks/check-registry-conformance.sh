#!/usr/bin/env bash
# Registry meta-check: asserts checks/registry.json and the checks/ tree
# agree, both ways. An unregistered check file is dead code (registry note);
# a registered file that does not exist is a dangling entry. Standalone by
# design — no suite runner exists yet, and this check must not depend on one
# that postdates it (kogaki#2, story 1.1).
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'EOF'
import json, pathlib, sys

checks_dir = pathlib.Path("checks")
registry = json.loads((checks_dir / "registry.json").read_text())

registered = {entry["file"] for entry in registry["checks"]}
present = {p.name for p in checks_dir.iterdir()
           if p.is_file() and p.name != "registry.json"}

unregistered = sorted(present - registered)
dangling = sorted(registered - present)

for name in unregistered:
    print(f"FAIL unregistered check file (dead code): checks/{name}")
for name in dangling:
    print(f"FAIL dangling registry entry (no such file): checks/{name}")

if unregistered or dangling:
    sys.exit(1)
print(f"ok: registry and checks/ tree agree ({len(present)} check(s))")
EOF
