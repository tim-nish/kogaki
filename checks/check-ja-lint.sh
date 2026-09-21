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
# WHAT THE PASS ASSERTS (the Removal Test, acceptance item 6, kogaki#1162,
# carrying kogaki#1158's original a/b/c cases and kogaki#1161's d/e forward):
# (a) a fixture carrying a forbidden term (via the real textlint-rule-prh)
# lints IDENTICALLY on two runs, with no model invoked, and its finding is
# attributed to the Leg whose trace span covers the body line it sits on;
# (b) a fixture with a three-line code fence followed by a forbidden
# Latin-script run attributes that run to the Leg whose trace covers the
# line AFTER the fence — the line-attribution-after-a-fence defect kogaki#1161
# fixed; (c) a Japanese Draft with no English sibling is REFUSED, naming the
# missing sibling, with no terms_sha_at_lint written; (d) src/review-draft.mjs
# `open`, run from a directory other than the repository root, still reads
# the term list; (e) src/review-draft.mjs run on a fixture whose
# terms_sha_at_lint is stale is REFUSED, naming BOTH hashes; (f) the CONTROL
# ARM — a clean Draft PASSES, is written terms_sha_at_lint, and rewrites
# identical bytes on two runs; (g) a fixture written entirely in the
# prescribed forms, including "サーバー" and "アプリケーション", lints clean
# — the boundary-pattern fix (kogaki#1162, ja-term-list-substring) for the two
# forbidden short forms that are prefixes of their own prescribed form; (h) a
# sentence over the technical-writing preset's length bound is named with its
# Leg AND its rule id — proof the preset, not only prh, is wired in; (i) the
# `fix` subcommand rewrites a prh-fixable term and changes no other byte,
# leaving a preset finding in the same fixture untouched; (j) a forbidden
# term inside a code fence lints clean (textlint's Markdown parser checks
# text nodes only) while the same term in prose is named with its Leg — the
# ja-lint-scan-scope defect kogaki#1162 discharges.
#
# WHY (f) IS NOT OPTIONAL: (a), (b), (c), (d), (e), (g), (h) and (j) each
# drive a REFUSAL (or clean-but-unrelated) path that does not by itself prove
# a clean Draft can still pass, so without (f) a Lint that stopped writing
# terms_sha_at_lint, or wrote it non-deterministically, could ship while
# review-draft's precondition quietly stopped being satisfiable (PR #1166
# round 1).
#
# (m) THROUGH (p) ARE kogaki#1165's TERM-LIST CHANGE PATH, discharging
# kogaki#1160 acceptance item 3: `correct-terms` runs the mechanical fix
# FIRST and Lints the result to find which Legs, if any, still carry a
# deviation. (m) a fixture whose Lint names zero Legs leaves the Draft
# byte-identical, with nothing to correct and no model invoked -- asserted
# twice, once on the pure function (which is what carries "no model is
# invoked") and once THROUGH THE CLI on the file on disk, because the
# return-value form alone leaves `cmdCorrectTerms`'s own write branch out of
# the case's path (PR #1169 round 1); (n) a
# three-Leg fixture whose Lint names exactly two Legs is corrected on
# those two and no other; (o) the mechanical fix runs BEFORE the bounded
# correction, so a Leg it clears is never named; (p) `--regenerate` refuses
# BY NAME, naming the Terminology List Decision, and touches no file. The
# Round Trip half of item 2 -- that a Leg NOT named is never re-outlined or
# re-compared -- is asserted where the Round Trip lives, at
# src/review-draft.mjs `open --only-legs` (checks/check-review-draft-runtime.sh).
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== ja-lint fixture pass (kogaki#1158, kogaki#1162)"

# THE DEPENDENCY ITSELF (kogaki#1162 acceptance item 1). This member fails BY
# NAME when textlint, the technical-writing preset or textlint-rule-prh are
# absent, rather than letting the self-test below fail on an opaque
# `Cannot find module` — `npm ci` from the committed lockfile is what a fresh
# clone and CI both run to produce node_modules; this check only asserts the
# result, since installing is `checks.yml`'s job, not a registered check's.
MISSING=()
for pkg in textlint textlint-rule-preset-ja-technical-writing textlint-rule-prh; do
  [[ -d "node_modules/$pkg" ]] || MISSING+=("$pkg")
done
if (( ${#MISSING[@]} > 0 )); then
  echo "FAIL: node_modules is missing ${MISSING[*]} — run \`npm ci\` from the committed package-lock.json before the Lint can run (kogaki#1162 acceptance item 1)"
  exit 1
fi
echo "ok: node_modules carries textlint, textlint-rule-preset-ja-technical-writing and textlint-rule-prh"

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
