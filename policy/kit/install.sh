#!/usr/bin/env bash
# Tsurezure client kit installer (tsurezure-gateway#78; relocated into Kogaki
# at kogaki#9). Idempotent.
#   install.sh --repo <consumer-repo-path> --consumer <name> [--gateway <js>]
#
# The gateway's location is MACHINE-LOCAL CONFIGURATION, never a committed
# path and never directory adjacency (kogaki#9). Resolution order:
#   1. --gateway <path>
#   2. $TSUREZURE_GATEWAY_JS
#   3. the machine-local MCP registration (~/.claude.json)
# Unresolved is not fatal: the MCP step reports what to run by hand and the
# install completes, because a degraded install is a valid install.
set -euo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

REPO="" CONSUMER="" GATEWAY_JS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="$2"; shift 2;;
    --consumer) CONSUMER="$2"; shift 2;;
    --gateway) GATEWAY_JS="$2"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done

if [[ -z "$GATEWAY_JS" ]]; then
  GATEWAY_JS="${TSUREZURE_GATEWAY_JS:-}"
fi
if [[ -z "$GATEWAY_JS" ]]; then
  GATEWAY_JS="$(python3 - <<'PYEOF' 2>/dev/null || true
import json, pathlib
try:
    config = json.loads((pathlib.Path.home() / ".claude.json").read_text())
except Exception:
    raise SystemExit(0)
scopes = [config.get("mcpServers") or {}]
scopes += [(p or {}).get("mcpServers") or {} for p in (config.get("projects") or {}).values()]
for servers in scopes:
    for arg in (servers.get("tsurezure") or {}).get("args") or []:
        if isinstance(arg, str) and arg.endswith(".js"):
            print(arg)
            raise SystemExit(0)
PYEOF
)"
fi
[[ -n "$REPO" && -n "$CONSUMER" ]] || { echo "usage: install.sh --repo <path> --consumer <name>" >&2; exit 2; }
[[ -d "$REPO" ]] || { echo "no such repo: $REPO" >&2; exit 2; }

say() { printf '%s\n' "$*"; }

# 1. CLAUDE.md managed block (replace between markers, else append).
BLOCK="$(cat "$KIT_DIR/templates/claude-md-block.md")"
CM="$REPO/CLAUDE.md"
if [[ -f "$CM" ]] && grep -q 'tsurezure-client-kit:begin' "$CM"; then
  python3 - "$CM" <<PYEOF
import re, sys, pathlib
p = pathlib.Path(sys.argv[1]); t = p.read_text()
block = pathlib.Path("$KIT_DIR/templates/claude-md-block.md").read_text().rstrip("\n")
t = re.sub(r"<!-- tsurezure-client-kit:begin.*?tsurezure-client-kit:end -->", block, t, flags=re.S)
p.write_text(t)
PYEOF
  say "CLAUDE.md: managed block refreshed"
else
  { [[ -f "$CM" ]] && printf '\n'; printf '%s\n' "$BLOCK"; } >> "$CM"
  say "CLAUDE.md: managed block appended"
fi

# 2. Consultation map — create only when absent (an existing map is the
#    repo's own grown state; the kit never overwrites it).
if [[ -f "$REPO/policy/consultation-map.md" ]]; then
  say "policy/consultation-map.md: exists, kept"
else
  mkdir -p "$REPO/policy"
  cp "$KIT_DIR/templates/consultation-map.md" "$REPO/policy/consultation-map.md"
  say "policy/consultation-map.md: installed (with the check-infrastructure seed entry)"
fi

# 3. CAPABILITIES.md — lives in the consumer package (policy/, kogaki#3);
#    kit-managed while it carries the marker; otherwise kept.
CAP="$REPO/policy/CAPABILITIES.md"
if [[ ! -f "$CAP" ]] || grep -q 'tsurezure-client-kit:file' "$CAP"; then
  mkdir -p "$REPO/policy"
  cp "$KIT_DIR/templates/CAPABILITIES.md" "$CAP"
  say "policy/CAPABILITIES.md: installed/refreshed (kit-managed)"
else
  say "policy/CAPABILITIES.md: exists and is not kit-managed, kept"
fi

# 4. Presence toggle — policy/source.yaml (kogaki#3); create only when absent
#    (an existing declaration is the repo's own; kept).
if [[ -f "$REPO/policy/source.yaml" ]]; then
  say "policy/source.yaml: exists, kept"
else
  mkdir -p "$REPO/policy"
  cp "$KIT_DIR/templates/policy-source.yaml" "$REPO/policy/source.yaml"
  say "policy/source.yaml: installed"
fi

# 4b. Old-layout copies from a pre-kogaki#3 install are reported for removal,
#     never deleted — leaving two would be silent divergence.
if [[ -f "$REPO/CAPABILITIES.md" ]] && grep -q 'tsurezure-client-kit:file' "$REPO/CAPABILITIES.md"; then
  say "stale: CAPABILITIES.md at repo root is an old-layout kit copy — remove it (now policy/CAPABILITIES.md)"
fi
if [[ -f "$REPO/config/policy-source.yaml" ]] && grep -q 'tsurezure client kit' "$REPO/config/policy-source.yaml"; then
  say "stale: config/policy-source.yaml is an old-layout kit copy — remove it (now policy/source.yaml)"
fi

# 4c. The consult-first skill, installed where the harness loads it. A skill
#     the harness never loads is a dead pointer, which is what it was.
mkdir -p "$REPO/.claude/skills/consult-first"
cp "$KIT_DIR/skills/consult-first.md" "$REPO/.claude/skills/consult-first/SKILL.md"
say ".claude/skills/consult-first/SKILL.md: installed (harness-loadable)"

# 4d. The SHAPE READ (kogaki#325; specs/spec-client-kit/SPEC.md §3). Two acts,
#     and they are separate on purpose:
#       (i)  the .gitignore entry — the digest derives from hub owner-realm
#            material, so making it repo-VISIBLE is one decision and making it
#            COMMITTED is another (§2.5.2). The kit's default answers only the
#            first; committing would be a declassification act it does not
#            grant. A consumer whose repo is private may decide otherwise, in
#            its own tree.
#       (ii) generating it — best-effort. An unreachable gateway exits 11 with
#            one line and the install still completes.
if [[ -f "$REPO/.gitignore" ]] && grep -qx 'policy/shape.md' "$REPO/.gitignore"; then
  say ".gitignore: policy/shape.md already excluded"
else
  { [[ -f "$REPO/.gitignore" ]] && printf '\n'; cat <<'IGEOF'
# The shape read — a policy digest derived from hub owner-realm material
# (specs/spec-client-kit/SPEC.md §3.3). Repo-VISIBLE so every session and the
# owner read it where they work; NOT committed, because it inherits its
# sources' sensitivity and this repository may be public. Visibility and
# publication are two decisions; this line is the second one, made explicitly
# rather than by where the file landed.
policy/shape.md
IGEOF
  } >> "$REPO/.gitignore"
  say ".gitignore: policy/shape.md excluded (repo-visible, not committed)"
fi

if OUT=$(node "$KIT_DIR/bin/shape.mjs" --consumer "$CONSUMER" --repo "$REPO" \
      ${GATEWAY_JS:+--gateway "$GATEWAY_JS"} 2>&1); then
  say "policy/shape.md: $OUT"
else
  say "policy/shape.md: $OUT"
  say "(the shape read degrades like every other kit tool — the install still completes)"
fi

# 4e. THE EMISSION DUTY's directory (kogaki#326; specs/spec-client-kit/SPEC.md
#     §4). Created with its README, and deliberately NOT gitignored — the
#     opposite answer to 4d on the same axis, because the discriminator is
#     SOURCE SENSITIVITY rather than file kind: an emission is authored
#     consumer-side about consumer-side experience, already at this
#     repository's own sensitivity, so committing it declassifies nothing.
#     Reading 4d and 4e together is the point; either alone reads as arbitrary.
mkdir -p "$REPO/policy/emissions"
if [[ -f "$REPO/policy/emissions/README.md" ]]; then
  say "policy/emissions/: exists, kept"
else
  cp "$KIT_DIR/templates/emissions-README.md" "$REPO/policy/emissions/README.md"
  say "policy/emissions/: installed (committed — see 4d for why the shape read is not)"
fi

# 5. MCP registration (machine-local, per-project — never committed).
if (cd "$REPO" && claude mcp list 2>/dev/null | grep -q 'tsurezure'); then
  say "MCP: tsurezure already registered for this project"
elif [[ -z "$GATEWAY_JS" ]]; then
  say "MCP: gateway location not configured — register it yourself from $REPO:"
  say "  claude mcp add -s local tsurezure -- node <path-to-gateway>/dist/index.js --consumer $CONSUMER"
  say "  (or re-run with --gateway <path>; a degraded install is a valid install)"
else
  if (cd "$REPO" && claude mcp add -s local tsurezure -- node "$GATEWAY_JS" --consumer "$CONSUMER" >/dev/null 2>&1); then
    say "MCP: registered (scope local, consumer $CONSUMER)"
  else
    say "MCP: could not register automatically — run from $REPO:"
    say "  claude mcp add -s local tsurezure -- node $GATEWAY_JS --consumer $CONSUMER"
  fi
fi

# 6. Round-trip check — degrades honestly, never fails the install.
say "--- seam check ---"
# THE ROUND-TRIP READS THE GATEWAY THIS INSTALL WAS POINTED AT (kogaki#638).
# `--gateway` was resolved into GATEWAY_JS and passed at the capability read
# above, and omitted here — so an operator naming a gateway got a round-trip
# against whatever ambient resolution found instead, and the pin on the next
# line described a seam nobody asked about. That is the same defect as the
# unmatched pattern one level out: the line reported something true of a
# gateway, and not of THIS one.
if OUT=$(node "$KIT_DIR/bin/gateway-query.mjs" --consumer "$CONSUMER" --tool policy_lookup \
      ${GATEWAY_JS:+--gateway "$GATEWAY_JS"} \
      --args '{"question":"client-kit install round-trip check"}' 2>/dev/null); then
  # THE GATEWAY PRETTY-PRINTS, so the pattern tolerates JSON spacing and the
  # capture is the PIN ITSELF rather than the key-value pair (kogaki#638).
  # The old pattern required `"pin":"…"` with no space and therefore never
  # matched: every install printed `round-trip: OK ` with a trailing space,
  # whatever pin it reached, so the one falsifiable part of the seam's
  # evidence was always absent.
  PIN=$(printf '%s' "$OUT" | sed -n 's/.*"pin"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1 || true)
  say "round-trip: OK ${PIN:+($PIN)}"
else
  say "round-trip: $OUT"
  say "(degraded install is a valid install — the seam is an enhancer)"
fi
# 7. The seam checks the kit vendors, and the registry entries they owe.
#
# THE KIT DOES NOT COPY THESE INTO THE CONSUMER'S `checks/` (kogaki#724). A
# copy under a path the consumer tracks is an undeclared duplicate of a
# centrally-managed artifact, and it drifts silently the moment the kit moves;
# the registry NAMES the kit's own file instead, so there is one copy of each
# check and nothing that can disagree with it.
#
# WHICH IS WHY THIS BLOCK EXISTS RATHER THAN BEING LEFT IMPLICIT. A check the
# kit vendors and the consumer never registers is installed on ZERO occasions
# — present, correct, and executed by nothing — and the served position is
# that this is strictly WORSE than an absent check, because the file's
# existence is what stops anyone asking whether it runs. So the installer
# ENUMERATES what it vendored and states the entry each one owes, and the
# kit's install test asserts this list against the vendored directory, so a
# check added to the kit and not announced here fails rather than passing.
say "--- seam checks ---"
if [ -d "$KIT_DIR/checks" ]; then
  COUNT=0
  for CHK in "$KIT_DIR/checks"/check-*.sh; do
    [ -e "$CHK" ] || continue
    COUNT=$((COUNT + 1))
    say "vendored: policy/kit/checks/$(basename "$CHK")"
  done
  if [ "$COUNT" -gt 0 ]; then
    say "$COUNT seam check(s) vendored, and NOT copied into $REPO/checks/."
    say "They run only once this repository's check registry names them, by"
    say "the path above — a vendored check nothing registers never executes."
    # NAMING WHAT IS OWED IS NOT DELIVERING IT. Telling a consumer to author
    # four admission records by hand is the advisory form the served test
    # refuses: a rule needing someone to remember or supervise it is not in
    # force, and its apparent coverage is an enumeration of the places
    # somebody happened to act. So the entries ship WITH the kit, ready to
    # merge, and their agreement with the consumer's registry is checked
    # rather than hoped for.
    if [ -f "$KIT_DIR/registry-entries.json" ]; then
      say "the entries they owe ship with the kit, ready to merge into"
      say "  <repo>/checks/registry.json  <-  policy/kit/registry-entries.json"
      say "the kit is the SOURCE for them: on divergence the registry"
      say "conformance check fails naming the id, so the copy cannot drift."
    else
      say "NO registry-entries.json ships with this kit — the entries these"
      say "checks owe must be authored by hand, which is the advisory form"
      say "this kit otherwise refuses."
    fi
  fi
else
  say "no seam checks vendored with this kit"
fi

# 7. THE KIT STAMP (kogaki#795; contract specs/spec-client-kit/SPEC.md §10.2).
#
# A copy without provenance cannot exist, because THE ACT THAT PRODUCES THE
# COPY IS THE ACT THAT STAMPS IT. That is the `constrains:` half of #633's
# remedy, and it is why this step lives in the installer rather than in a
# reminder: a rule needing someone to remember it is advisory, and its apparent
# coverage is an enumeration of the places somebody happened to act.
#
# STAMPED ONLY WHERE A COPY EXISTS, and the absence is DISCLOSED rather than
# silently skipped. `install.sh` does not vendor `policy/kit/` — it installs the
# kit's OUTPUT (the managed block, the map, the skill, the digest, the emissions
# directory) — so a consumer holds a kit copy only if one was placed there. With
# no copy there is nothing to be behind and no stamp is owed; saying so is what
# keeps this distinguishable from a stamp step that failed.
#
# COMMITTED, not gitignored — §10.3. A machine-local stamp is durable against a
# working copy only, so a fresh clone would inherit no provenance and the
# currency check would read `cannot-determine` on every clone, indistinguishable
# from an unreachable Home. Nothing here adds it to `.gitignore`, and that is
# the deliberate opposite of the shape read at step 4d.
say "--- kit stamp ---"
if [[ -d "$REPO/policy/kit" ]]; then
  # The `.git` suffix is stripped BEFORE the owner/name pair is extracted: doing
  # it in one expression lets the greedy path group swallow the suffix, which
  # stamped `owner/name.git` and made every slug wrong by four characters.
  HOME_SLUG="$(cd "$KIT_DIR/../.." && git config --get remote.origin.url 2>/dev/null \
    | sed -e 's#\.git$##' -e 's#.*[:/]\([^/]*/[^/]*\)$#\1#' || true)"
  [[ -n "$HOME_SLUG" ]] || HOME_SLUG="unknown-home"
  HOME_REV="$(cd "$KIT_DIR" && git rev-parse HEAD 2>/dev/null || true)"
  [[ -n "$HOME_REV" ]] || HOME_REV="unknown"
  # The digest comes from the ONE implementation both writer and verifier use,
  # so a mismatch is always a fact about the trees and never about two
  # algorithms disagreeing.
  KIT_MANIFEST="$(bash "$KIT_DIR/bin/kit-manifest.sh" "$REPO/policy/kit" 2>/dev/null || echo unavailable)"
  {
    printf 'home: %s\n' "$HOME_SLUG"
    printf 'home_revision: %s\n' "$HOME_REV"
    printf 'installed: %s\n' "$(date -u +%Y-%m-%d)"
    printf 'manifest: %s\n' "$KIT_MANIFEST"
    printf 'manifest_algorithm: policy/kit/bin/kit-manifest.sh\n'
  } > "$REPO/policy/kit/.kit-version"
  say "policy/kit/.kit-version: stamped $HOME_SLUG@${HOME_REV:0:12} (committed — see SPEC-client-kit 10.3)"
  # A stamped tree must not also declare itself the Home; the currency check
  # calls that contradictory and fails it. Removing a declaration the installer
  # did not write would be destroying repo-own state, so this REPORTS.
  if [[ -f "$REPO/policy/kit/consumers.json" ]] \
     && grep -q '"role"[[:space:]]*:[[:space:]]*"home"' "$REPO/policy/kit/consumers.json" 2>/dev/null; then
    say "WARNING: this repo also declares policy/kit/consumers.json role=home."
    say "A tree is the kit's source or a copy of it, never both — check-kit-currency FAILS this."
  fi
else
  say "no policy/kit/ in $REPO — the kit's OUTPUT is installed and no kit COPY is"
  say "vendored here, so no stamp is owed. Stated rather than skipped silently:"
  say "an absent stamp and a stamp step that failed read identically otherwise."
fi

say "install complete for consumer '$CONSUMER' at $REPO"
