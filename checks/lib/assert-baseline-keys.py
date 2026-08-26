# THE DECLARED KEY SET IS DERIVED, NEVER HAND-WRITTEN (kogaki#625, carried from
# PR #664 round 2).
#
# The assertion that a `counted_baseline` key is not silently omitted was itself
# an ENUMERATION: a four-name set written by hand, while `derivedBaseline`
# computed five. So deleting `grammared_writing_states` from a table disabled
# that key's comparison and PASSED — the exact route the assertion was added to
# close, surviving for a fifth of the denominator, in the assertion that closes
# it. And the admission record stated the guarantee unqualified.
#
# The repair is constrain-shaped rather than a longer list: the required set IS
# whatever the runtime derives, read from the runtime, so a key added to
# `derivedBaseline` is covered the moment it exists and a key removed stops
# being demanded. There is no list left to drift.
import json, subprocess, sys

table_path = sys.argv[1]
label = sys.argv[2]

derived = json.loads(subprocess.run(
    [ "node", "--input-type=module", "-e",
      'import { derivedBaseline } from "./terrain/terrain.mjs";'
      'import { readFileSync } from "node:fs";'
      f'process.stdout.write(JSON.stringify(derivedBaseline(JSON.parse(readFileSync({json.dumps(table_path)}, "utf8")))));' ],
    capture_output=True, text=True, check=True).stdout)

declared = json.load(open(table_path)).get("counted_baseline") or {}
missing = sorted(set(derived) - set(declared))
extra = sorted(set(declared) - set(derived))

bad = []
if missing:
    bad.append(
        "declares no " + ", ".join(missing) + " — the runtime DERIVES that key, and a key the table "
        "omits is not compared at all, so its absence disables the judgment rather than failing it")
if extra:
    bad.append(
        "declares " + ", ".join(extra) + ", which the runtime derives nothing for — a declared key with "
        "no derived counterpart is the same omission hole facing the other way")

if bad:
    print(f"FAIL: {label}'s counted_baseline " + "; and ".join(bad))
    raise SystemExit(1)
print(f"ok: {label} — counted_baseline declares exactly the {len(derived)} key(s) the runtime derives, "
      "read FROM the runtime rather than from a list this check maintains")
