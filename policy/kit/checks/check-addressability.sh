#!/usr/bin/env bash
# ADDRESSABILITY — the served names this consumer can actually reach
# (kogaki#1141; the kit's half of the address contract, whose gateway half is
# tsurezure-gateway#105, #106 and #107).
#
# WHAT IT REFUSES, and it is one thing: a name the served surface itself
# publishes that this consumer cannot then READ. The three reads it makes are
# the three the consultation map's addressing rule already prescribes — the
# enumeration, one cell from it, and the manifest's own worked addresses — so
# the check asserts nothing about the corpus and everything about whether the
# published address form and the served read agree.
#
# THE DEFECT IT CATCHES, because the case is not hypothetical. On 2026-09-17 a
# run enumerated the served cells correctly, read one of them under an argument
# key the tool does not declare, and received the uniform miss: exit 0, a real
# `request_id`, a real pin, and a well-formed answer to a call that never ran.
# The run concluded the surface held nothing. It held 325 lines. A misaddressed
# read and an empty cell are the same shape to every instrument the kit had,
# which is why this member reads a name the surface just published: a miss on
# THAT is not a fact about the corpus, it is a broken address, and there is no
# third explanation to weigh.
#
# EVERY MISS IS A FAILURE HERE, and the three kinds are named rather than
# merged, because they route to different repairs:
#   * a BARE MISS   — `miss: true` with no reason. The read reached the tool and
#                     matched nothing under an address the surface publishes.
#   * a REASONED MISS — `miss: true` carrying `reason`. The gateway says WHY
#                     (`no-such-cell`), which is tsurezure-gateway#106/#107's
#                     half landing: the address was understood and rejected.
#   * a REFUSAL     — the gateway refused the call outright (an rpc or tool
#                     error), or this kit refused the form before sending it.
# All three fail, each NAMING THE CALL, because all three mean the published
# name did not resolve.
#
# THE ADDRESS IS NEVER TYPED HERE. The cell read goes through
# `policy/kit/bin/consult.mjs --cell-args`, the kit's one address composer, so
# this check cannot prove an address form the consult path would not have sent
# — and cannot drift from it, because there is nothing here to drift. The two
# `element_survey` FILTER keys it does type (`kind`) are a different matter and
# are typed deliberately: the transport refuses an undeclared key before the
# wire (kogaki#368, exit 13), so a key that retires fails this check loudly by
# name instead of coming back as the uniform miss. That is the whole difference
# the address contract buys, exercised on this member itself.
#
# DEGRADED IS NOT GREEN, AND IT IS NOT A PASS DRESSED DOWN. With no reachable
# gateway the member prints the kit's one `policy_source unavailable:` line and
# exits 11 — the shape `policy/kit/README.md` fixes for every kit tool. It
# never renders `ok`, because "the seam was not there" and "the seam answered
# correctly" are exactly the two states this member exists to tell apart.
#
#   CONSEQUENCE, STATED RATHER THAN DISCOVERED IN CI. `tools/run-registered-checks.sh`
#   reads any non-zero exit as a failed member, so in an environment with no
#   configured gateway — kogaki's own GitHub Actions runners today, where every
#   other seam-touching member stubs the gateway instead of reaching one — this
#   member is RED, not skipped. That is the consequence of the kit's degrade
#   contract meeting a runner that has no vocabulary for it, and it is a
#   decision the owner owes rather than one this check can take: either the
#   runner learns that exit 11 from a kit member is the ratified degrade, or CI
#   gains a gateway, or this member is registered somewhere the suite is not.
#   The alternative — exiting 0 and printing that nothing was established — is
#   the arm kogaki#1141 acceptance 3 declines BY NAME, so it is not taken here.
#
# THE ADMISSION TERMS, per the served rule this member's own subject supplies:
#   "Automated checks are cheap to add and hard to remove … each check enters
#    with three things fixed: which stage of the workflow it runs at, what its
#    budget there is, and what evidence would justify removing it."
#   `coding::lesson/every-check-enters-with-a-budget-and-a-removal-signal@cdd6083e700c`
# Stage, budget and removal signal are in this member's `registry-entries.json`
# record; they are not restated here, because two carriers of one declaration
# drift and the registry is the one the runner reads.
set -uo pipefail

# REPO ROOT, RESOLVED BY GIT RATHER THAN BY DEPTH, and ANCHORED AT THE SCRIPT
# rather than the caller — the idiom the sibling kit checks state in full: a
# kit-held check must not bind to one directory depth, and must not resolve
# some other repository it happens to be invoked from.
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" || {
  echo "FAIL: cannot resolve the repository root from this script's location"
  exit 1
}

CONSUMER="" GATEWAY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --consumer) CONSUMER="${2:-}"; shift 2;;
    --gateway)  GATEWAY="${2:-}"; shift 2;;
    *) echo "usage: check-addressability.sh [--consumer <name>] [--gateway <path>]"; exit 2;;
  esac
done

# THE CONSUMER NAME IS DERIVED AND SAID OUT LOUD. The install takes it as an
# argument and persists it nowhere, so there is no file to read it from; the
# repository's own identity is the closest durable fact, and a wrong one shows
# up as an ungranted read rather than as a wrong answer. Printed on every run so
# a reader can tell "this consumer has no grant" from "this address is broken"
# without re-deriving anything.
if [[ -z "$CONSUMER" ]]; then
  ORIGIN=$(git remote get-url origin 2>/dev/null || true)
  CONSUMER=$(basename "${ORIGIN%.git}" 2>/dev/null || true)
  [[ -n "$CONSUMER" ]] || CONSUMER=$(basename "$PWD")
fi

GW_ARGS=()
[[ -n "$GATEWAY" ]] && GW_ARGS=(--gateway "$GATEWAY")

echo "== addressability: every name the served surface publishes resolves for consumer '$CONSUMER'"

FAIL=0

# One served read, classified. Sets READ_BODY on a hit; every other outcome is
# reported by this function and either fails the member or degrades it.
#
# THE DEGRADE AND THE REFUSAL BOTH ARRIVE AS EXIT 11 FROM THE TRANSPORT, and
# telling them apart is this function's one piece of real work. `gateway-query.mjs`
# routes an rpc or tool error to the same one-line degrade it uses for an
# unreachable server, so the CODE cannot discriminate and the REASON must: a
# line naming an rpc or tool error means the seam answered and refused, which is
# a failure; anything else means the seam was not there, which is the degrade.
# Read off the transport's own emitted text rather than asserted about it.
read_served() {
  local tool="$1" args="$2" label="$3" out status reason
  out=$(node policy/kit/bin/gateway-query.mjs --consumer "$CONSUMER" \
          --tool "$tool" --args "$args" "${GW_ARGS[@]}" 2>&1)
  status=$?
  READ_BODY=""
  if [[ $status -eq 11 ]]; then
    reason=$(printf '%s\n' "$out" | grep -m1 '^policy_source unavailable:' || true)
    if printf '%s\n' "$reason" | grep -qE 'rpc error|tool error'; then
      echo "FAIL: $label — the gateway REFUSED the call: ${reason#policy_source unavailable: }"
      FAIL=1
      return 1
    fi
    printf '%s\n' "${reason:-policy_source unavailable: the gateway did not answer}"
    echo "  addressability was not established: the seam is not reachable from here, so nothing below ran."
    exit 11
  fi
  if [[ $status -eq 13 ]]; then
    echo "FAIL: $label — the kit refused the address form before sending it: $(printf '%s\n' "$out" | grep -m1 'address refused:' || printf '%s' "$out")"
    FAIL=1
    return 1
  fi
  if [[ $status -ne 0 ]]; then
    echo "FAIL: $label — the transport exited $status: $(printf '%s\n' "$out" | tail -3)"
    FAIL=1
    return 1
  fi
  # The miss shapes, both of them, named apart.
  local verdict
  verdict=$(printf '%s' "$out" | python3 -c '
import json, sys
raw = sys.stdin.read()
start = raw.find("{")
try:
    d = json.loads(raw[start:]) if start >= 0 else None
except ValueError:
    d = None
if not isinstance(d, dict):
    print("unreadable\tthe served response was not readable as a response")
elif d.get("miss") is True:
    why = d.get("reason")
    if why:
        print("reasoned-miss\tthe gateway answered `%s` — the address was understood and rejected" % why)
    else:
        print("bare-miss\t`miss: true` with no reason — the read matched nothing under a name the surface publishes")
else:
    print("hit\t%d line(s)" % len(d.get("lines") or []))
')
  local kind="${verdict%%	*}" detail="${verdict#*	}"
  if [[ "$kind" != "hit" ]]; then
    echo "FAIL: $label — $kind: $detail"
    FAIL=1
    return 1
  fi
  READ_BODY="$out"
  echo "ok: $label — $detail"
  return 0
}

# ---------------------------------------------------------------- 1. the enumeration
# `surface_names(kind: "gloss")` is the served enumeration the consultation map's
# addressing rule prescribes, and it is the FLOOR of this whole member: every
# name checked below is one the surface itself just published, so a miss on one
# is never a fact about the corpus.
read_served surface_names '{"kind":"gloss"}' 'surface_names(kind: "gloss") — the served enumeration' || true

CELL=""
if [[ -n "${READ_BODY:-}" ]]; then
  CELL=$(printf '%s' "$READ_BODY" | python3 -c '
import json, sys
raw = sys.stdin.read(); raw = raw[raw.find("{"):]
d = json.loads(raw)
names = [l.get("text", "").strip() for l in (d.get("lines") or [])]
names = [n for n in names if n]
print(names[0] if names else "")
' 2>/dev/null || true)
fi

# ---------------------------------------------------------------- 2. one published cell
# Read through the kit's own composer, so the argument key is the served
# schema's and this file never types one.
if [[ -z "$CELL" ]]; then
  echo "FAIL: the enumeration returned no name to read, so the cell read could not be attempted"
  FAIL=1
else
  CELL_ARGS=$(node policy/kit/bin/consult.mjs --consumer "$CONSUMER" --cell-args "$CELL" "${GW_ARGS[@]}" 2>/dev/null)
  CA_STATUS=$?
  if [[ $CA_STATUS -ne 0 || -z "$CELL_ARGS" ]]; then
    echo "FAIL: gloss_index('$CELL') — the kit could not build the address (consult.mjs --cell-args exited $CA_STATUS); the served schema declares no single address key for it"
    FAIL=1
  else
    read_served gloss_index "$CELL_ARGS" "gloss_index('$CELL') — a name the enumeration just published" || true
  fi
fi

# ---------------------------------------------------------------- 3. the manifest's own examples
# WHY THE MANIFEST IS READ FROM A FILE AND NOT FROM THE WIRE: no served tool
# publishes the addressing block, and the examples are the package's own
# statement of what a well-formed address LOOKS LIKE — the exact fact that went
# stale in the shipped defect. Its location comes from the gateway's
# MACHINE-LOCAL OPERATOR CONFIG (`$TSUREZURE_CONFIG`, else
# `~/.tsurezure/gateway.json`), which is the same class of configuration the
# gateway's own location is (kogaki#9): never a committed path, never directory
# adjacency, and never the consumer reaching into a repository it knows the name
# of. An unreadable config or manifest is the same degrade as an unreachable
# seam — the fact was not established, and this member does not pretend it was.
HUB=""
CONFIG="${TSUREZURE_CONFIG:-$HOME/.tsurezure/gateway.json}"
if [[ -r "$CONFIG" ]]; then
  HUB=$(python3 -c '
import json, sys
try:
    print(json.load(open(sys.argv[1])).get("hubPath") or "")
except Exception:
    print("")
' "$CONFIG" 2>/dev/null || true)
fi
MANIFEST=""
[[ -n "$HUB" && -r "$HUB/PACKAGE-MANIFEST.json" ]] && MANIFEST="$HUB/PACKAGE-MANIFEST.json"

if [[ -z "$MANIFEST" ]]; then
  echo "policy_source unavailable: the served package's manifest was not readable (operator config $CONFIG)"
  echo "  the manifest's own addressing examples were not resolved: their location is machine-local configuration and it was not established here."
  exit 11
fi

EXAMPLES=$(python3 -c '
import json, sys
d = json.load(open(sys.argv[1]))
for e in (d.get("addressing") or {}).get("examples") or []:
    if isinstance(e, str) and e.strip():
        print(e.strip())
' "$MANIFEST" 2>/dev/null || true)

if [[ -z "$EXAMPLES" ]]; then
  echo "ok: the served package declares no addressing examples — nothing to resolve (the zero is rendered, not omitted)"
else
  declare -A SURVEYED=()
  while IFS= read -r EX; do
    [[ -n "$EX" ]] || continue
    if [[ "$EX" == *"::"* ]]; then
      # A UnitID address: `<package>::<kind>/<local-name>[@<content-hash>]`.
      # Resolved through `element_survey`, whose records carry `unit_id`
      # verbatim — so the comparison is against the served identity and never
      # against a path this file reconstructed.
      KIND="${EX#*::}"; KIND="${KIND%%/*}"
      WANT="${EX%%@*}"
      # ONE SURVEY PER KIND, cached. The manifest's examples cluster by Kind and
      # an element survey is the largest read this member makes; re-fetching it
      # per example would multiply the member's whole cost by the example count
      # for no assertion the first fetch does not already carry.
      if [[ -z "${SURVEYED[$KIND]:-}" ]]; then
        if read_served element_survey "$(printf '{"kind":"%s"}' "$KIND")" \
             "element_survey(kind: $KIND) — the Kind the manifest's examples address"; then
          SURVEYED[$KIND]="$READ_BODY"
        else
          SURVEYED[$KIND]="refused"
        fi
      fi
      if [[ "${SURVEYED[$KIND]}" == "refused" ]]; then
        continue
      fi
      # THE COMPARISON IS AGAINST THE SERVED IDENTITY. Each record's `cite` is
      # the UnitID at its content hash, which is what the manifest's own
      # `address` grammar declares — so the example is matched against the
      # identity the surface issued and never against a path reconstructed
      # here. The hash is compared only when the example carries one: it is
      # REQUIRED in a receipt and optional in a pointer, per the manifest's own
      # `hash_required_in`, so an example without one asks a question about the
      # Unit and not about its content. A supplied hash matches as a PREFIX: the
      # manifest's own example writes twelve characters where the served cite
      # carries the whole sha256, and that abbreviation is the form every
      # receipt and gate declaration in this repository uses — so requiring the
      # full string would fail every correctly written address.
      if printf '%s' "${SURVEYED[$KIND]}" | python3 -c '
import json, sys
raw = sys.stdin.read(); raw = raw[raw.find("{"):]
want = sys.argv[1]
d = json.loads(raw)
unit, _, want_hash = want.partition("@")
for line in d.get("lines") or []:
    cite = line.get("cite") or ""
    served_unit, _, served_hash = cite.partition("@")
    if served_unit != unit:
        continue
    if not want_hash or served_hash.startswith(want_hash):
        sys.exit(0)
sys.exit(1)
' "$EX" 2>/dev/null; then
        echo "ok: the manifest example $EX resolves to a served element record"
      else
        echo "FAIL: element_survey(kind: $KIND) served records and none is cited as $EX — the package's own worked address does not resolve on the surface serving it"
        FAIL=1
      fi
    else
      # Not a UnitID: the package is showing a cell address, which is a gloss
      # read and is composed by the kit exactly as a prescription's would be.
      EX_ARGS=$(node policy/kit/bin/consult.mjs --consumer "$CONSUMER" --cell-args "$EX" "${GW_ARGS[@]}" 2>/dev/null)
      if [[ -z "$EX_ARGS" ]]; then
        echo "FAIL: gloss_index('$EX') — the kit could not build an address for the manifest example"
        FAIL=1
      else
        read_served gloss_index "$EX_ARGS" "gloss_index('$EX') — the manifest's own worked address" || true
      fi
    fi
  done <<< "$EXAMPLES"
fi

# UNCONDITIONAL, on the disclosure discipline the sibling members already carry:
# a member that stated its reach only when it fired would be silent in exactly
# the state that misleads.
cat <<'EOF'
reach of this check, stated rather than implied: it proves that names the served
surface PUBLISHES resolve for this consumer — the enumeration, one cell from it,
and the package's own worked addresses. It says nothing about whether any other
address a session might compose is well formed, nothing about the CONTENT any of
these reads returned, and nothing about the grants of any consumer but the one
named above.
not carried here: the HIT-path echo. The gateway names the address it answered
on a miss and the transport requires the two to agree; on a hit a filtered and
an unfiltered read differ only in a line count nothing here can judge
(kogaki#181, and specs/SPEC.md §4 condition 5). So a read that hits is evidence
the address RESOLVED and not that it was applied.
EOF

exit $FAIL
