#!/usr/bin/env bash
# The Home marker — ONE implementation, two callers (kogaki#799, resolving
# PR #798 round 2's finding 5).
#
# `install.sh` asks whether a tree is the kit's SOURCE (and so owes no stamp);
# `checks/check-kit-currency.sh` asks the same question to decide between the
# `home` verdict and the consumer deny. Until this file existed they asked it
# with DIFFERENT SEMANTICS: the installer grepped `"role": "home"` anywhere in
# consumers.json, the check parsed JSON and required the key at the TOP LEVEL.
#
# WHAT THAT COST, stated because the divergence was silent in the worst
# direction: a consumers.json carrying that pair anywhere but the top level —
# inside a `consumers[]` entry, for one — made the install skip the stamp as a
# Home while the check read a consumer with no stamp and DENIED. A tree its own
# installer had just reported clean, red on its own registered member, with each
# side individually behaving as written.
#
# This is the same failure `kit-manifest.sh` exists to prevent, one layer over,
# and it is fixed the same way: the question has one implementation and neither
# caller restates it.
#
# usage: kit-role.sh <kit-dir>
# prints: `home` when this tree declares itself the kit's source; nothing
#         otherwise. Exit 0 either way — ABSENCE IS AN ANSWER here, not an
#         error, and a caller distinguishes the two by the output.
#
# THE MARKER IS TOP-LEVEL BY DECISION (kogaki#795, SPEC-client-kit §10.2). A
# nested occurrence is NOT the declaration: `consumers[]` holds entries about
# OTHER repositories, and a rule that read a role from one of those would let a
# consumer listed by name declare its own home-ness from inside the Home's list.
set -euo pipefail

KIT="${1:-}"
[[ -n "$KIT" && -d "$KIT" ]] && [[ -f "$KIT/consumers.json" ]] || exit 0

python3 - "$KIT/consumers.json" <<'PY' 2>/dev/null || exit 0
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    raise SystemExit(0)
if isinstance(d, dict) and d.get("role") == "home":
    print("home")
PY
