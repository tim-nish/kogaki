#!/usr/bin/env bash
# The Japanese-realization Lint's fixture pass (kogaki#1158).
#
# A THIN INVOKER, holding no assertions of its own — the same arrangement
# check-draft-runtime.sh and check-review-draft-runtime.sh use: the cases
# live with the runtime they cover, in `src/lint-ja.mjs self-test`, because
# they are functions of that runtime's own refusal surfaces (plus, for case
# c, of src/review-draft.mjs's precondition) and drive both end to end in a
# temp directory. Seam-free by construction: no gateway, no network, no
# model invocation anywhere in the pass.
#
# WHAT THE PASS ASSERTS (the Removal Test, acceptance item 7, kogaki#1158):
# (a) an unmodified Japanese Draft fixture lints IDENTICALLY on two runs,
# with no model invoked — the determinism every check in lint-ja.mjs is
# built to have; (b) a fixture carrying a forbidden term (against
# terms/prh.yml) is named WITH ITS STEP, never a bare line number; (c)
# src/review-draft.mjs run on a fixture whose terms_sha_at_lint is stale is
# REFUSED, naming BOTH the recorded hash and the current term list's hash.
#
# NOT CARRIED HERE: the structure-identity check's cross-Draft comparison
# and the Latin-script language-confusion detector are exercised as pure
# functions inside the same self-test module but are not separately
# re-asserted by this invoker — this member's contract is "the self-test ran
# clean at its declared floor", on the same convention the delegating
# members already use.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== ja-lint fixture pass (kogaki#1158)"

OUT=$(node src/lint-ja.mjs self-test 2>&1); RC=$?
printf '%s\n' "$OUT"
if [[ $RC -ne 0 ]] || ! grep -q "lint-ja self-test:" <<<"$OUT"; then
  echo "FAIL: the runtime's fixture pass did not run clean — the cases live with the runtime and this member only invokes them"
  exit 1
fi

# THE FLOOR IS READ FROM THE REGISTRY, never hardcoded here (kogaki#661),
# following the convention check-draft-runtime.sh and
# check-review-draft-runtime.sh already set.
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'ja-lint'))
") || { echo "FAIL: could not read case_floor for ja-lint from checks/registry.json"; exit 1; }
N=$(sed -n 's/^lint-ja self-test: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
if [[ -z "$N" ]]; then
  echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"
  exit 1
fi
if (( N < FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST rather than broken (kogaki#661)"
  exit 1
fi
if (( N > FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were ADDED and the floor was not advanced in the same act (kogaki#970). Set case_floor to $N for 'ja-lint' in checks/registry.json, in this commit"
  exit 1
fi
echo "ok: ja-lint fixture pass ran ${N} case(s) clean, exactly at its declared floor of ${FLOOR}"

# terms/prh.yml must itself be readable in the shape lint-ja.mjs parses —
# a real, seeded term list is the licensed acceptance (item 2), and a file
# that regresses out of the parseable shape should fail loudly here rather
# than only inside whatever Draft next tries to lint against it.
if ! node -e "
  const { parseTermsYaml } = await import('./src/lint-ja.mjs');
  const fs = await import('node:fs');
  const r = parseTermsYaml(fs.readFileSync('terms/prh.yml', 'utf8'));
  if (r.error) { console.error('FAIL: terms/prh.yml: ' + r.error); process.exit(1); }
  if (!r.rules.length) { console.error('FAIL: terms/prh.yml parses with zero rules'); process.exit(1); }
  console.log('ok: terms/prh.yml parses with ' + r.rules.length + ' rule(s)');
" --input-type=module 2>&1; then
  exit 1
fi

exit 0
