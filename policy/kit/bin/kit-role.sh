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
# prints: `home` when this tree declares itself the kit's source; nothing when
#         it does not. Exit 0 for BOTH — absence is an answer, not an error.
#         Exit 2 when the question CANNOT BE ANSWERED, which is a third state
#         and never the second.
#
# THE THIRD STATE EXISTS BECAUSE ITS ABSENCE FAILED UNSAFELY (found reviewing
# this diff, before any round was spent on it). An earlier draft answered an
# unreadable declaration by printing nothing and exiting 0 — indistinguishable
# from "this is not the Home" — and BOTH callers fail toward danger on that
# reading: `install.sh` stamps the Home, which is precisely the contradictory
# state its own role branch exists to prevent, and the currency check denies
# the Home as a consumer without provenance. Demonstrated with `python3` shimmed
# to exit 127: the Home read as a consumer at both callers.
#
# The sibling settles the convention: `kit-manifest.sh` refuses when sha256sum
# is missing rather than returning an empty digest. Two tools added together for
# one purpose owe the same failure semantics, and the one that degrades quietly
# is the one that degrades toward the defect.
#
# THE MARKER IS TOP-LEVEL BY DECISION (kogaki#795, SPEC-client-kit §10.2). A
# nested occurrence is NOT the declaration: `consumers[]` holds entries about
# OTHER repositories, and a rule that read a role from one of those would let a
# consumer listed by name declare its own home-ness from inside the Home's list.
set -euo pipefail

KIT="${1:-}"
# No kit directory, or no declaration file: a definite "not the Home". The
# declaration is the positive marker, so its absence is an answer.
[[ -n "$KIT" && -d "$KIT" ]] && [[ -f "$KIT/consumers.json" ]] || exit 0

command -v python3 >/dev/null 2>&1 || {
  echo "kit-role: python3 not available — the Home declaration cannot be read" >&2
  exit 2
}

# A parse failure is CANNOT-ANSWER, not "not the Home": a corrupt declaration in
# the Home would otherwise read exactly like a consumer.
python3 - "$KIT/consumers.json" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception as e:
    print("kit-role: %s is not readable as JSON: %s" % (sys.argv[1], e), file=sys.stderr)
    raise SystemExit(2)
if isinstance(d, dict) and d.get("role") == "home":
    print("home")
PY
