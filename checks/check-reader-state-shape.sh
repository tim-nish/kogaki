#!/usr/bin/env bash
# `readerStateShapeRefusal`'s own unit check (kogaki#1211).
#
# THE DEFECT THIS GUARDS AGAINST. `readerStateShapeRefusal` (src/compose.mjs)
# split a `reader_start` / `reader_state_before` / `reader_state_after` value
# on `"; "` and required every segment to begin with one of the five
# dimension names. Neither of the other two surfaces describing this shape
# agreed with that separator: the composition prompt
# (src/candidate-schema.json, src/leg-schema.json) tells the model to write
# "one `dimension: value` line per dimension", and the refusal's own error
# text already said "lines" while the code split on "; ". A dimension's
# value is ordinary prose and is free to carry a semicolon mid-sentence —
# `/brief` run brief-2026-09-27T06-40-12-204Z lost all three of its finished
# candidates to exactly this, split mid-sentence, refused because the second
# half of a cut sentence does not begin with a dimension name.
#
# THE REPAIR is a newline split, matching the shape the schemas ask for and
# the message already claimed. This member is a THIN INVOKER over three
# cases run through node, each asserting one direction so the fix is legible
# and a regression back to the semicolon split is caught immediately:
#   1. a semicolon INSIDE a dimension's own sentence, on one line per
#      dimension — must NOT be refused (the founding case).
#   2. a line beginning with a word outside the five dimensions — must be
#      refused, naming the line form ("lines") in its message.
#   3. several dimensions, each its own newline-separated line — must NOT be
#      refused (the shape the schemas ask for, exercised with more than one
#      dimension present).
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== readerStateShapeRefusal unit check (kogaki#1211)"

OUT=$(node --input-type=module - <<'JS' 2>&1
import { readerStateShapeRefusal } from "./src/compose.mjs";

const cases = [];

// Case 1: a semicolon inside a dimension's own sentence must not split the
// line — this is the exact shape of the run's three refused candidates.
{
  const value = "knowledge: holds that the system works; the reader does not yet know why.\n"
    + "question: holds no open question yet.";
  const got = readerStateShapeRefusal(value, "reader_start", "reader_start");
  cases.push(["semicolon inside a sentence is ordinary prose", got === null, got]);
}

// Case 2: a line whose leading token is not a dimension name is still
// refused, and the message names the line form.
{
  const value = "knowledge: holds a variable as announced.\nfoo: this line opens with no dimension name.";
  const got = readerStateShapeRefusal(value, "reader_start", "reader_start");
  const refusedAsLines = typeof got === "string" && got.includes("lines");
  cases.push(["a bad leading dimension is refused, naming lines", refusedAsLines, got]);
}

// Case 3: several dimensions, each its own newline-separated line.
{
  const value = "knowledge: holds a variable as announced.\n"
    + "question: holds an unanswered question about how it operates.\n"
    + "trust: holds no reason yet to doubt the source.";
  const got = readerStateShapeRefusal(value, "reader_start", "reader_start");
  cases.push(["multiple dimensions, one newline-separated line each", got === null, got]);
}

let failed = 0;
for (const [name, ok, detail] of cases) {
  if (ok) {
    console.log(`ok: ${name}`);
  } else {
    failed++;
    console.log(`FAIL: ${name} — got ${JSON.stringify(detail)}`);
  }
}
console.log(`readerStateShapeRefusal self-test: ${cases.length} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
JS
); RC=$?
printf '%s\n' "$OUT"
if [[ $RC -ne 0 ]] || ! grep -q "readerStateShapeRefusal self-test:" <<<"$OUT"; then
  echo "FAIL: readerStateShapeRefusal unit check did not run clean"
  exit 1
fi

# THE TWO SCHEMA SURFACES NO LONGER CLAIM THE MOVE LIBRARY'S OWN
# before/after SHAPE VERBATIM (the third disagreeing surface the issue
# named) — moves/*.md folds its dimensions into one YAML paragraph, and a
# value there is free to carry any punctuation mid-sentence. A claim that
# the shape here IS that folded paragraph is exactly what re-invites the
# semicolon split this member exists to keep out.
for f in src/candidate-schema.json src/leg-schema.json; do
  if grep -q "the same shape .*before.*and.*after.*are written in\|the same shape the bound Move" "$f"; then
    echo "FAIL: $f still claims the reader-state shape is the Move library's own before/after shape verbatim"
    exit 1
  fi
done

echo "ok: readerStateShapeRefusal splits on newlines, not on \"; \"; src/candidate-schema.json and src/leg-schema.json describe the line-per-dimension shape the check enforces rather than the Move library's own folded shape"
exit 0
