#!/usr/bin/env bash
# The review lane's opening survey, served LINE-SHAPED (kogaki#541, spec sitting
# 2026-08-19).
#
# WHAT WAS BROKEN, AND IT WAS NOT THE CORPUS. The review lane makes an unscoped
# tier-1 `gloss_index` survey its fixed opening move. (The artifact that said so
# here, `.claude/skills/review-lane/SKILL.md`, was retired by kogaki#630; the
# opening move travels with the method port, claude-toolkit#479 — kogaki#632.)
# Through the MCP tool that call returns ~77,000 characters on ONE line, which
# the harness refuses before any of it reaches the reviewer; the offered fallback
# is byte-slicing a spill file, which the retired skill put out of scope for a per-PR
# review. Measured 2026-08-19: 76,962 characters, 2 raw lines, and **192 bounded
# records inside it, none over 570 characters**. The content was already
# structured. The JSON envelope flattened it.
#
# WHY AN INSTRUMENT RATHER THAN A NARROWER QUESTION. Substituting a scoped
# `policy_lookup` is the arm the served surface refuses:
#
#   "EXISTENCE-AWARENESS IS AN INDEX-SHAPED NEED, NOT A QUERY-SHAPED ONE ... a
#    boundary consult answers questions the asker knows to ask; the failure class
#    here is policy whose EXISTENCE is unknown, so additional consulting cannot
#    reach it by construction"
#   consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/knowledge-architecture.md:21
#
# the retired skill said the same from its own side — "where to look is an OUTPUT of the
# survey, not a heading you supply" — so narrowing the move would trade the one
# property it exists for.
#
# WHY HERE AND NOT AT THE SEAM. `terrain/terrain.mjs` has read this same surface
# without trouble since it shipped, because the kit's transport captures to a
# FILE and never crosses the harness's result boundary. The reviewer cannot use
# that path: its executable grant is DERIVED over `tools/` and `checks/`, and
# carries nothing for `policy/kit/` or `node`. So the working transport existed
# and was unreachable to the one caller that needed it.
#
# Siting the helper in `tools/` is what makes it reachable: `tool_grants()`
# grants every `tools/*.sh` that does not mark itself a spawner, so this file
# enters the reviewer's grant by derivation rather than by anyone listing it.
# That was the retired skill's own prescription — "a reviewer that finds itself needing a
# parser has found a gap in the sweep's own instruments" — discharged rather
# than restated.
#
#   "the stronger move being to serve structure so there is nothing to parse at all"
#   consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 LESSONS.md:59
#
# The structure is served here rather than at the gateway because the gateway is
# another repository's surface and this defect is one consumer's transport
# choice. Fixing the envelope there remains the wider repair and is NOT closed
# by this file; it is named in kogaki#541 as the arm that would serve every
# consumer.
#
# Usage:
#   tools/gloss-survey.sh                 # unscoped tier-1 index (the opening move)
#   tools/gloss-survey.sh --tag lessons/testing   # one tier-2 shard
#
# `$GLOSS_SURVEY_GATEWAY`, when set, is passed through as the kit's `--gateway`.
# It exists so the DEGRADED path can be exercised — pointing it at a missing
# file is how the unavailable-seam branch below is tested — and it keeps the
# gateway's location machine-local (kogaki#9), naming no committed path.
#
# Output: one record per line, `<cite>\t<text>`. Degradation is the kit's own —
# an unavailable seam prints `policy_source unavailable: <reason>` and exits 11,
# so a reviewer declares `cannot-determine:` on evidence rather than on silence.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARGS='{}'
if [ "${1:-}" = "--tag" ]; then
  [ -n "${2:-}" ] || { echo "gloss-survey: --tag needs a value (a kind-qualified shard, e.g. lessons/testing)" >&2; exit 2; }
  ARGS="$(printf '{"tag":"%s"}' "$2")"
fi

OUT="$(mktemp)"; ERR="$(mktemp)"
trap 'rm -f "$OUT" "$ERR"' EXIT
if ! node "$REPO/policy/kit/bin/gateway-query.mjs" \
      --consumer kogaki --tool gloss_index --args "$ARGS" ${GLOSS_SURVEY_GATEWAY:+--gateway "$GLOSS_SURVEY_GATEWAY"} > "$OUT" 2>"$ERR"; then
  # THE REASON IS CARRIED, NOT SWALLOWED (PR #544 round 1). An earlier form sent
  # the transport's stderr to /dev/null and printed a reasonless line, while the
  # header above promised `policy_source unavailable: <reason>` — suppressing
  # exactly the evidence this file argues a `cannot-determine:` should rest on.
  # The kit already emits its own one-line idiom; where it does, that line is
  # passed through verbatim rather than restated.
  # BOTH STREAMS, and STDOUT FIRST — measured rather than assumed. The kit emits
  # its idiom with `console.log` (`policy/kit/bin/gateway-query.mjs:219`), so the
  # reason lands on STDOUT, which is the stream this script captures for JSON.
  # A first attempt at this repair read only stderr and reported "nothing on
  # either stream" against a transport that had said exactly why — the same
  # suppression one layer over, which is why the stream is now probed rather
  # than reasoned about.
  if grep -qs '^policy_source unavailable:' "$OUT"; then
    grep -m1 '^policy_source unavailable:' "$OUT"
  elif grep -qs '^policy_source unavailable:' "$ERR"; then
    grep -m1 '^policy_source unavailable:' "$ERR"
  else
    reason="$(cat "$OUT" "$ERR" 2>/dev/null | tr '\n' ' ' | sed 's/  */ /g; s/^ *//; s/ *$//' | cut -c1-300)"
    echo "policy_source unavailable: gloss_index could not be served — ${reason:-(the transport reported nothing on either stream)}"
  fi
  exit 11
fi

python3 - "$OUT" <<'PY'
import json, signal, sys
# `| head` IS THE INTENDED USE, so a closed pipe must not print a traceback.
# Python turns SIGPIPE into BrokenPipeError by default; restoring the default
# disposition makes `tools/gloss-survey.sh | head -50` exit quietly, which is
# how a reviewer reads a 192-record survey in the first place.
signal.signal(signal.SIGPIPE, signal.SIG_DFL)
d = json.load(open(sys.argv[1]))
lines = d.get("lines") or []
# The pin first, so a quoted line can be cited without a second call.
print(f"# pin: {d.get('pin', '(none)')}\t{len(lines)} record(s)")
for x in lines:
    text = (x.get("text") or "").replace("\t", " ").replace("\n", " ")
    print(f"{x.get('cite', '(no cite)')}\t{text}")
PY
