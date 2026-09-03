#!/usr/bin/env bash
# Kit currency — an installed copy knows it is behind (kogaki#795; contract
# specs/spec-client-kit/SPEC.md §10, cited here and restated nowhere).
#
# WHAT THIS REFUSES, and it is exactly one thing: a kit copy with no usable
# provenance. §10.2's deny condition is a stamp that is absent, malformed, or
# disagreeing with its manifest, IN A CONSUMER — every one of those is a fact
# about this tree, so the denial cannot fire on someone else's availability.
# Currency itself is REPORTED AND NEVER GATED: `behind` and `cannot-determine`
# both exit 0, because blocking a consumer's suite on the Home's revision is
# the release-cadence coupling the eventual dedicated repository exists to
# remove.
#
# FOUR VERDICTS, ALL RENDERED. `home`, `current`, `behind <n>`,
# `cannot-determine`. `cannot-determine` is NEVER rendered as `current`, and
# `home` is rendered rather than silent — a reader who cannot see that the
# check ran and exempted cannot tell it from a check that never looked, which
# is the disclosure discipline §4.5 already carries.
#
# ---------------------------------------------------------------------------
# THE HOME EXEMPTION'S POSITIVE MARKER — the choice §10.2 left to this
# implementation, decided at kogaki#795 and stated back here.
#
# The marker is `policy/kit/consumers.json` carrying a top-level
# `"role": "home"`. Three properties earn it:
#
#   * POSITIVE. §10.2 requires a positive fact. The declined reading is
#     absence-of-stamp: a Home and a consumer whose `.kit-version` was deleted
#     present IDENTICALLY under it — `policy/kit/` present, no stamp — so it
#     would make this check's one deny condition unreachable and invert the
#     clause. `--self-test` case 4 is that exact inversion, asserted to FAIL.
#   * NOT A NAME. Keying on `tim-nish/kogaki` would break at the very event
#     §10.4 names as this check's removal signal, and the Home is interim by §0.
#   * ALREADY OWED. §10.2 sites `consumers.json` in the Home regardless, so
#     this mints no carrier; it reads one the clause already requires.
#
# AND THE TWO STATES ARE MUTUALLY EXCLUSIVE, not merely distinguishable: a tree
# carrying BOTH the declaration and a `.kit-version` is contradictory and
# FAILS. Without that guard a mis-installed copy could declare itself the Home
# and silently stop being checked, which is the same inversion one step over.
#
# ---------------------------------------------------------------------------
# HOW THE HOME IS REACHED IS **NOT DECIDED HERE**, and `--home` is a TEST SEAM
# rather than that decision. `specs/spec-client-kit/SPEC.md` §10.7 names
# `kit-currency-home-resolution` as a deferred slot whose filling is its own
# decision act with its own consult and receipt. Production passes no `--home`,
# so PRODUCTION'S EXPECTED READING IS `cannot-determine` — stated in §10.2 and
# repeated here so a reader meeting that verdict in CI recognises a named slot
# rather than a bug. The fixture passes `--home` at a temp repository purely to
# exercise `current` and `behind`, which would otherwise be unreachable code.
set -uo pipefail

SELF_TEST=0
HOME_PATH=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --self-test) SELF_TEST=1; shift;;
    --home) HOME_PATH="${2:-}"; shift 2;;
    --root) ROOT_OVERRIDE="${2:-}"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done

# REPO ROOT, RESOLVED BY GIT RATHER THAN BY DEPTH (kogaki#724), and ANCHORED AT
# THE SCRIPT rather than the caller — the same resolution its four sibling kit
# checks use, and for the same two reasons stated there.
if [[ -n "${ROOT_OVERRIDE:-}" ]]; then
  ROOT="$ROOT_OVERRIDE"
else
  ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null)" || {
    echo "FAIL: cannot resolve the repository root from this script's location"
    exit 1
  }
fi

MANIFEST_TOOL="$(dirname "$0")/../bin/kit-manifest.sh"

# --- The reading, as a function, so the fixture exercises THE SHIPPED PATH.
# A fixture that re-implemented the verdicts would assert its own copy of them,
# which is the writer/verifier drift `kit-manifest.sh` exists to prevent, one
# layer up.
read_currency() {
  local root="$1" home_path="$2"
  local kit="$root/policy/kit"
  local stamp="$kit/.kit-version"
  local consumers="$kit/consumers.json"

  # NOT A FIFTH VERDICT (PR #798 round 1, finding 1). §10.2 and #795 both say
  # "exactly one of" FOUR, and an earlier draft answered this case with a fifth,
  # `no-kit-copy`, which was undeclared by the clause and covered by no case.
  # It is a CALLER ERROR rather than a reading: this script lives at
  # `policy/kit/checks/`, so a tree with no `policy/kit/` has no copy of it to
  # run and the registry entry naming that path resolves to nothing. The state
  # is reachable only by pointing `--root` somewhere else, which is a mistake
  # about the argument and not a fact about a consumer. Exit 2, the same code
  # the argument parser uses, so it can never be read as a verdict.
  if [[ ! -d "$kit" ]]; then
    echo "error: no policy/kit/ under $root — this check ships INSIDE the kit, so a"
    echo "tree without one holds no copy of this script either. Check --root."
    return 2
  fi

  local declares_home=0
  if [[ -f "$consumers" ]]; then
    if python3 -c "
import json,sys
try: d=json.load(open('$consumers'))
except Exception: sys.exit(1)
sys.exit(0 if isinstance(d,dict) and d.get('role')=='home' else 1)
" 2>/dev/null; then declares_home=1; fi
  fi

  # CONTRADICTION FIRST. Checked before either single-state branch, because
  # whichever branch ran first would absorb this case and report a clean
  # verdict for a tree that is in two states at once.
  if [[ "$declares_home" -eq 1 && -f "$stamp" ]]; then
    echo "FAIL: contradictory tree — policy/kit/consumers.json declares role=home while policy/kit/.kit-version claims a derived copy. A tree is the kit's source or a copy of it, never both."
    return 1
  fi

  if [[ "$declares_home" -eq 1 ]]; then
    echo "verdict: home — this tree holds the kit as its source (policy/kit/consumers.json declares role=home) and owes no stamp"
    return 0
  fi

  # --- From here the tree is a CONSUMER, and the deny condition applies.
  if [[ ! -f "$stamp" ]]; then
    echo "FAIL: policy/kit/ is present with no policy/kit/.kit-version — a kit copy without provenance. The install writes the stamp; a copy that never ran one is an undeclared duplicate of the Home."
    return 1
  fi

  local missing=""
  local k
  for k in home home_revision installed manifest; do
    grep -qE "^${k}:[[:space:]]*[^[:space:]]" "$stamp" || missing="$missing $k"
  done
  if [[ -n "$missing" ]]; then
    echo "FAIL: policy/kit/.kit-version is malformed — missing or empty:$missing"
    return 1
  fi

  local stamped_manifest stamped_rev stamped_home
  stamped_manifest="$(sed -n 's/^manifest:[[:space:]]*//p' "$stamp" | head -1)"
  stamped_rev="$(sed -n 's/^home_revision:[[:space:]]*//p' "$stamp" | head -1)"
  stamped_home="$(sed -n 's/^home:[[:space:]]*//p' "$stamp" | head -1)"

  local actual_manifest
  actual_manifest="$(bash "$MANIFEST_TOOL" "$kit" 2>/dev/null)" || {
    echo "FAIL: cannot compute the kit manifest for $kit"
    return 1
  }
  if [[ "$actual_manifest" != "$stamped_manifest" ]]; then
    echo "FAIL: policy/kit/ disagrees with its stamp — manifest ${actual_manifest:0:12} does not match the stamped ${stamped_manifest:0:12}. The copy was edited after install, or the stamp was carried onto a different copy."
    return 1
  fi

  # --- Currency. From here nothing FAILS: every outcome is a report.
  if [[ -z "$home_path" ]]; then
    echo "verdict: cannot-determine — no Home was supplied to read. Home resolution is deferred slot kit-currency-home-resolution (SPEC-client-kit §10.7); this is the expected reading in CI, not a defect. Stamp: $stamped_home@${stamped_rev:0:12}"
    return 0
  fi
  if [[ ! -d "$home_path/.git" ]]; then
    echo "verdict: cannot-determine — the supplied Home ($home_path) is not readable as a git repository. Stamp: $stamped_home@${stamped_rev:0:12}"
    return 0
  fi

  local head_rev
  head_rev="$(git -C "$home_path" rev-parse HEAD 2>/dev/null)" || {
    echo "verdict: cannot-determine — the supplied Home ($home_path) has no resolvable HEAD. Stamp: $stamped_home@${stamped_rev:0:12}"
    return 0
  }
  if ! git -C "$home_path" cat-file -e "${stamped_rev}^{commit}" 2>/dev/null; then
    echo "verdict: cannot-determine — the stamped revision ${stamped_rev:0:12} is not present in the supplied Home, so no delta can be computed. Stamp: $stamped_home@${stamped_rev:0:12}"
    return 0
  fi

  if [[ "$head_rev" == "$stamped_rev" ]]; then
    echo "verdict: current — the copy is at $stamped_home@${stamped_rev:0:12}, the Home's current revision"
    return 0
  fi

  local n files
  n="$(git -C "$home_path" rev-list --count "${stamped_rev}..${head_rev}" -- policy/kit 2>/dev/null || echo 0)"
  files="$(git -C "$home_path" diff --name-only "$stamped_rev" "$head_rev" -- policy/kit 2>/dev/null | tr '\n' ' ')"
  if [[ "$n" -eq 0 && -z "$files" ]]; then
    echo "verdict: current — the Home moved to ${head_rev:0:12} but no kit file changed since ${stamped_rev:0:12}"
    return 0
  fi
  echo "verdict: behind $n — the Home is at ${head_rev:0:12}, the copy at ${stamped_rev:0:12}; kit files changed: ${files:-<none named>}"
  return 0
}

# ---------------------------------------------------------------------------
# THE FIXTURE. §10.5 is the reason it is a fixture and not a live consumer:
# NO CONSUMER IS KIT-INSTALLED AT ITS COMMITTED STATE, so the reporting
# direction has no live subject and an acceptance claim asserting one would be
# false. Every case below builds its own tree; none reads this repository.
if [[ "$SELF_TEST" -eq 1 ]]; then
  echo "== kit-currency fixture"
  T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
  cases=0; bad=0
  expect() { # expect <label> <expected-exit> <expected-substring> <root> [home]
    local label="$1" want_rc="$2" want="$3" root="$4" home="${5:-}"
    local out rc
    out="$(read_currency "$root" "$home")"; rc=$?
    cases=$((cases+1))
    if [[ "$rc" -ne "$want_rc" ]]; then
      echo "  FAIL $label: exit $rc, wanted $want_rc — $out"; bad=$((bad+1)); return
    fi
    case "$out" in
      *"$want"*) echo "  ok   $label";;
      *) echo "  FAIL $label: wanted '$want', got: $out"; bad=$((bad+1));;
    esac
  }

  # A Home: a kit tree that declares role=home and carries no stamp.
  mk_home() { local d="$1"; mkdir -p "$d/policy/kit/bin"
    cp "$MANIFEST_TOOL" "$d/policy/kit/bin/kit-manifest.sh"
    echo 'kit payload v1' > "$d/policy/kit/payload.txt"
    printf '{"role":"home","consumers":[]}\n' > "$d/policy/kit/consumers.json"; }
  # A consumer: the same kit files, no home declaration, stamped.
  mk_consumer() { local d="$1" home_rev="$2"; mkdir -p "$d/policy/kit/bin"
    cp "$MANIFEST_TOOL" "$d/policy/kit/bin/kit-manifest.sh"
    echo 'kit payload v1' > "$d/policy/kit/payload.txt"
    { echo "home: example/home"; echo "home_revision: $home_rev";
      echo "installed: 2026-09-03";
      echo "manifest: $(bash "$MANIFEST_TOOL" "$d/policy/kit")"; } > "$d/policy/kit/.kit-version"; }

  # 1. The Home renders `home` and passes.
  mk_home "$T/home"
  expect "home renders and passes" 0 "verdict: home" "$T/home"

  # 2. A conforming consumer with no Home supplied reads cannot-determine,
  #    never current — production's expected reading.
  mk_consumer "$T/c_ok" "0000000000000000000000000000000000000000"
  expect "no Home supplied -> cannot-determine" 0 "verdict: cannot-determine" "$T/c_ok"
  out="$(read_currency "$T/c_ok" "")"
  cases=$((cases+1))
  case "$out" in *"verdict: current"*) echo "  FAIL cannot-determine leaked as current"; bad=$((bad+1));;
                 *) echo "  ok   cannot-determine is never rendered as current";; esac

  # 3. A copy with no stamp FAILS — the deny condition.
  mkdir -p "$T/c_bare/policy/kit"; echo x > "$T/c_bare/policy/kit/payload.txt"
  expect "no stamp -> FAIL" 1 "without provenance" "$T/c_bare"

  # 4. THE INVERSION CASE. A consumer whose .kit-version was DELETED must FAIL
  #    and must not read as `home`. This is the one case that would pass under
  #    the declined absence-of-stamp marker, and it is why the marker is
  #    positive.
  mk_consumer "$T/c_del" "0000000000000000000000000000000000000000"
  rm "$T/c_del/policy/kit/.kit-version"
  expect "deleted stamp still FAILS, never home" 1 "without provenance" "$T/c_del"
  out="$(read_currency "$T/c_del" "")"
  cases=$((cases+1))
  case "$out" in *"verdict: home"*) echo "  FAIL a stampless consumer read as home"; bad=$((bad+1));;
                 *) echo "  ok   a stampless consumer never reads as home";; esac

  # 5. A malformed stamp FAILS, naming the missing key.
  mk_consumer "$T/c_bad" "0000000000000000000000000000000000000000"
  grep -v '^manifest:' "$T/c_bad/policy/kit/.kit-version" > "$T/tmp" && mv "$T/tmp" "$T/c_bad/policy/kit/.kit-version"
  expect "malformed stamp -> FAIL" 1 "malformed" "$T/c_bad"

  # 6. A copy edited after install disagrees with its manifest and FAILS.
  mk_consumer "$T/c_drift" "0000000000000000000000000000000000000000"
  echo 'locally edited' >> "$T/c_drift/policy/kit/payload.txt"
  expect "manifest mismatch -> FAIL" 1 "disagrees with its stamp" "$T/c_drift"

  # 7. A tree in both states at once FAILS.
  mk_consumer "$T/c_both" "0000000000000000000000000000000000000000"
  printf '{"role":"home","consumers":[]}\n' > "$T/c_both/policy/kit/consumers.json"
  expect "home declaration + stamp -> FAIL" 1 "contradictory tree" "$T/c_both"

  # --- Cases 8-10 need a real git Home, and are the REPORTING DIRECTION.
  GH="$T/githome"; mk_home "$GH"
  git -C "$GH" init -q 2>/dev/null
  git -C "$GH" -c user.email=t@e -c user.name=t add -A >/dev/null 2>&1
  git -C "$GH" -c user.email=t@e -c user.name=t commit -qm one >/dev/null 2>&1
  REV1="$(git -C "$GH" rev-parse HEAD)"

  # 8. Stamped at the Home's current revision -> current.
  mk_consumer "$T/c_cur" "$REV1"
  expect "stamped at HEAD -> current" 0 "verdict: current" "$T/c_cur" "$GH"

  # 9. THE DELIBERATELY STALE FIXTURE (§10.5). The Home moves a kit file; the
  #    copy stays at the old revision and must say so, naming the delta.
  echo 'kit payload v2' > "$GH/policy/kit/payload.txt"
  git -C "$GH" -c user.email=t@e -c user.name=t add -A >/dev/null 2>&1
  git -C "$GH" -c user.email=t@e -c user.name=t commit -qm two >/dev/null 2>&1
  expect "stale copy -> behind, naming the delta" 0 "verdict: behind 1" "$T/c_cur" "$GH"
  out="$(read_currency "$T/c_cur" "$GH")"
  cases=$((cases+1))
  case "$out" in *"policy/kit/payload.txt"*) echo "  ok   behind names the changed file";;
                 *) echo "  FAIL behind did not name the changed file: $out"; bad=$((bad+1));; esac

  # 10. NOTHING FAILS MERELY BECAUSE THE HOME MOVED — the coupling the whole
  #     clause exists to avoid, asserted rather than assumed.
  read_currency "$T/c_cur" "$GH" >/dev/null; rc=$?
  cases=$((cases+1))
  if [[ "$rc" -eq 0 ]]; then echo "  ok   a behind copy exits 0 — the Home moving fails nothing"
  else echo "  FAIL a behind copy exited $rc"; bad=$((bad+1)); fi

  # 11. An unreachable Home degrades to cannot-determine, never current.
  expect "unreadable Home -> cannot-determine" 0 "verdict: cannot-determine" "$T/c_cur" "$T/nope"

  # 12. A tree with no kit copy is a CALLER ERROR, exit 2, and renders NO
  #     verdict — the branch finding 1 named as undeclared and unexercised.
  mkdir -p "$T/nokit"
  out="$(read_currency "$T/nokit" "")"; rc=$?
  cases=$((cases+1))
  if [[ "$rc" -eq 2 ]] && [[ "$out" != *"verdict:"* ]]; then
    echo "  ok   no kit copy -> exit 2, and renders no verdict"
  else
    echo "  FAIL no-kit-copy: exit $rc rendering: $out"; bad=$((bad+1))
  fi

  # 13. THE VERDICT SET IS EXACTLY FOUR, asserted over the shipped source
  #     rather than trusted — the assertion that would have caught finding 1.
  cases=$((cases+1))
  # `+` and not `*`: a zero-width match let a bare `verdict:` — the word in a
  # prose line — count as a fifth name, which is a detector reporting itself.
  declared="$(grep -Eo 'verdict: [a-z][a-z-]*' "$0" | sort -u | sed 's/^verdict: //')"
  wanted="$(printf 'behind\ncannot-determine\ncurrent\nhome\n')"
  if [[ "$declared" == "$wanted" ]]; then
    echo "  ok   the shipped source renders exactly four verdicts"
  else
    echo "  FAIL verdict set drifted from the four SPEC 10.2 names:"; echo "$declared" | sed 's/^/         /'
    bad=$((bad+1))
  fi

  echo "fixture: $cases case(s), $bad failure(s)"
  [[ "$bad" -eq 0 ]] || { echo "FAIL: kit-currency fixture"; exit 1; }
  echo "ok: kit-currency fixture pass ran $cases case(s) clean"
  exit 0
fi

echo "== kit currency (specs/spec-client-kit/SPEC.md §10)"
# THE FIXTURE RUNS ON EVERY INVOCATION, because this member's live reading in
# this repository is `home` — a single exempting line — and a check whose only
# executed path is its exemption is indistinguishable from one that never
# looked. The fixture is what exercises the other three verdicts and all four
# deny conditions.
"$0" --self-test || exit 1

OUT="$(read_currency "$ROOT" "$HOME_PATH")"; RC=$?
echo "$OUT"
if [[ "$RC" -ne 0 ]]; then exit 1; fi
echo "ok: kit currency — reported, never gated on currency; the only deny is a consumer's own missing, malformed or disagreeing stamp"
exit 0
