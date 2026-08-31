#!/usr/bin/env bash
# The observation register's summary view (specs/SPEC.md §21, kogaki#624).
#
# IT WRITES NOTHING. §21 requires every summary view to be DERIVED and never
# authored, and the cheapest way to guarantee that is to have no stored summary
# at all: this renders to stdout from the records themselves, so there is no
# second artifact that can drift from the directory it describes. A file
# committed beside the records would be a conformance copy with no declared
# precedence — the exact defect the migration away from the issue carrier
# exists to end, rebuilt one directory over.
#
# WHY A HUMAN SURFACE EXISTS AT ALL. The records are the machine store, and a
# state stored only where a machine reads it is hidden rather than recorded
# (product-lab LESSONS.md:125). Suppressing an item from a queue and making its
# state legible to a person are two obligations, and shipping the first makes
# the second feel done — so this is the second one, and it is a rendering
# rather than a store.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

python3 - "$@" <<'PY'
import pathlib, re, sys
from collections import Counter, defaultdict

DIR = pathlib.Path("reviews/register")
if not DIR.is_dir():
    print("no reviews/register/ — this repository carries no observation register")
    sys.exit(0)

rows = []
for p in sorted(DIR.glob("reg-*.md")):
    fm = p.read_text(encoding="utf-8").split("---\n", 2)[1]
    f = dict((k.strip(), v.strip()) for k, _, v in
             (l.partition(":") for l in fm.splitlines() if ":" in l))
    body = p.read_text(encoding="utf-8").split("---\n", 2)[2].strip()
    first = next((l for l in body.splitlines() if l.strip()), "")
    first = re.sub(r'[*`_]', '', first)
    rows.append((f.get("id", ""), f.get("status", ""), f.get("observed_at_pr", ""),
                 f.get("class", ""), first[:96], p.name))

tally = Counter(r[1] for r in rows)
by_class = Counter(r[3] or "(unclassified)" for r in rows)

print(f"observation register — {len(rows)} record(s), rendered from "
      f"reviews/register/ at read time; nothing here is stored")
print("  status: " + ", ".join(f"{k}={v}" for k, v in sorted(tally.items())))
print("  class:  " + ", ".join(f"{k}={v}" for k, v in by_class.most_common(6)))
print()
want = sys.argv[1] if len(sys.argv) > 1 else "pending"
sel = [r for r in rows if r[1] == want]
print(f"--- status={want} ({len(sel)}) ---")
for rid, st, pr, cls, first, name in sel:
    print(f"  {rid}  PR#{pr or '-':<5} {cls or '-':<22} {first}")
PY
