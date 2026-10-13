#!/usr/bin/env bash
# `tools/run-registered-checks.sh --only <id>` IS EXERCISED HERE (kogaki#1353).
# The concrete event: a kogaki worker's plan admits exactly the single-check
# commands `checks run --only <id>` derives, and before this issue every one
# of them hit `run-registered-checks.sh: unrecognised flag: --only` -- no
# kogaki worker could run one member since tim-nish/claude-toolkit#1480
# narrowed `tools/checks run --only <id>` to assume the declared runner
# understands the flag. Four cases, matching the issue's own list:
#
#   (a) `--only a` runs member `a` and not member `b`.
#   (b) `--only nonesuch` exits 2 and names checks/registry.json.
#   (c) a `--only a` run writes no verdict file under CHECKS_RESULT_DIR; a
#       full run in the same sandbox does.
#   (d) `--only a --compare-base <ref>` is accepted.
#
# EACH CASE RUNS IN A SANDBOX GIT REPOSITORY, never this one, so that a run
# of this check under `--ci-shape` or `--only` (it is itself a registered
# member, so a suite run under either flag reaches it) never recurses into a
# second run of THIS suite, the same isolation checks/check-ci-shape.sh uses.
set -euo pipefail
cd "$(dirname "$0")/.."

WORK="$(mktemp -d "${TMPDIR:-/tmp}/kogaki-check-runner-only.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

sandbox="$WORK/sandbox"
mkdir -p "$sandbox/checks" "$sandbox/tools" "$sandbox/.claude"
git init -q "$sandbox"
git -C "$sandbox" config user.email "check-runner-only@example.invalid"
git -C "$sandbox" config user.name "check-runner-only"
cp tools/run-registered-checks.sh "$sandbox/tools/"
cat > "$sandbox/.claude/checks.json" <<'EOF'
{
  "registry": "checks/registry.json",
  "runner": "tools/run-registered-checks.sh",
  "check_root": "checks",
  "registry_list_key": "checks"
}
EOF
cat > "$sandbox/checks/registry.json" <<'EOF'
{"checks":[
  {"id":"a","file":"check-a.sh","admission":{
    "contract":"fixture-only member for checks/check-runner-only.sh; always passes",
    "license":"kogaki#1353","tier":"ci","removal_signal":"none: sandbox fixture",
    "removal_instrument":"none: sandbox fixture, never a live registry",
    "efficacy":"none: fixture-only member, asserts nothing of its own"}},
  {"id":"b","file":"check-b.sh","admission":{
    "contract":"fixture-only member for checks/check-runner-only.sh; always passes",
    "license":"kogaki#1353","tier":"ci","removal_signal":"none: sandbox fixture",
    "removal_instrument":"none: sandbox fixture, never a live registry",
    "efficacy":"none: fixture-only member, asserts nothing of its own"}}
]}
EOF
cat > "$sandbox/checks/check-a.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
: "${MARK_DIR:?MARK_DIR must be set by the caller}"
touch "$MARK_DIR/a-ran"
echo "ok: stub member a"
EOF
cat > "$sandbox/checks/check-b.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
: "${MARK_DIR:?MARK_DIR must be set by the caller}"
touch "$MARK_DIR/b-ran"
echo "ok: stub member b"
EOF
chmod +x "$sandbox/checks/check-a.sh" "$sandbox/checks/check-b.sh" "$sandbox/tools/run-registered-checks.sh"
git -C "$sandbox" add -A
git -C "$sandbox" commit -q -m "sandbox fixture for checks/check-runner-only.sh"
sandbox_head="$(git -C "$sandbox" rev-parse HEAD)"

mark_dir="$WORK/marks"
result_dir="$WORK/results"

run_sandbox() {
  # Isolated from this check's own run the same way checks/check-ci-shape.sh
  # isolates its sandbox legs: CI_SHAPE, CHECKS_FORCE and ONLY_IDS_JOINED are
  # never inherited from whatever invoked THIS member (it is itself
  # registered, reachable by a suite run under --only or --ci-shape).
  (cd "$sandbox" && env -u CI_SHAPE -u CHECKS_FORCE -u ONLY_IDS_JOINED -u TSUREZURE_GATEWAY_JS \
    MARK_DIR="$mark_dir" CHECKS_RESULT_DIR="$result_dir" bash tools/run-registered-checks.sh "$@")
}

# --- optionally, the same strings through tools/checks on the machine that
#     has it, so the worker's own invocation string is the one proven. ---
CHECKS_TOOL=""
for candidate in "${CLAUDE_TOOLKIT_CHECKS:-}" "/home/tomoya/work/claude-toolkit/tools/checks" "$(command -v checks 2>/dev/null || true)"; do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    CHECKS_TOOL="$candidate"
    break
  fi
done
run_sandbox_via_checks_tool() {
  [[ -n "$CHECKS_TOOL" ]] || return 0
  (cd "$sandbox" && env -u CI_SHAPE -u CHECKS_FORCE -u ONLY_IDS_JOINED -u TSUREZURE_GATEWAY_JS \
    MARK_DIR="$mark_dir" CHECKS_RESULT_DIR="$result_dir" "$CHECKS_TOOL" run "$@")
}

# --- case (a): --only a runs member a and not member b ---
rm -rf "$mark_dir"; mkdir -p "$mark_dir"
if ! out="$(run_sandbox --only a 2>&1)"; then
  echo "FAIL: --only a exited non-zero: $out"
  exit 1
fi
if [[ ! -e "$mark_dir/a-ran" ]]; then
  echo "FAIL: --only a did not run member a: $out"
  exit 1
fi
if [[ -e "$mark_dir/b-ran" ]]; then
  echo "FAIL: --only a also ran member b, which it must filter out: $out"
  exit 1
fi
echo "ok: --only a runs member a and not member b"

if [[ -n "$CHECKS_TOOL" ]]; then
  rm -rf "$mark_dir"; mkdir -p "$mark_dir"
  if ! run_sandbox_via_checks_tool --only a >/dev/null 2>&1; then
    echo "FAIL: $CHECKS_TOOL run --only a exited non-zero against the sandbox"
    exit 1
  fi
  if [[ ! -e "$mark_dir/a-ran" || -e "$mark_dir/b-ran" ]]; then
    echo "FAIL: $CHECKS_TOOL run --only a did not reach member a alone"
    exit 1
  fi
  echo "ok: $CHECKS_TOOL run --only a reaches member a alone against the sandbox"
else
  echo "note: tools/checks not found on this machine; skipping its direct exercise (kogaki#1353)"
fi

# --- case (b): --only nonesuch exits 2 and names checks/registry.json ---
rm -rf "$mark_dir"; mkdir -p "$mark_dir"
set +e
out="$(run_sandbox --only nonesuch 2>&1)"
rc=$?
set -e
if [[ "$rc" -ne 2 ]]; then
  echo "FAIL: --only nonesuch exited $rc, expected 2: $out"
  exit 1
fi
if [[ "$out" != *"checks/registry.json"* ]]; then
  echo "FAIL: --only nonesuch's refusal did not name checks/registry.json: $out"
  exit 1
fi
echo "ok: --only nonesuch exits 2 naming checks/registry.json"

if [[ -n "$CHECKS_TOOL" ]]; then
  set +e
  run_sandbox_via_checks_tool --only nonesuch >/dev/null 2>&1
  tool_rc=$?
  set -e
  if [[ "$tool_rc" -eq 0 ]]; then
    echo "FAIL: $CHECKS_TOOL run --only nonesuch exited 0 against the sandbox; the unknown id must refuse"
    exit 1
  fi
  echo "ok: $CHECKS_TOOL run --only nonesuch refuses against the sandbox"
fi

# --- case (c): --only writes no verdict; a full run does ---
rm -rf "$result_dir" "$mark_dir"; mkdir -p "$mark_dir"
run_sandbox --only a >/dev/null
if [[ -e "$result_dir/$sandbox_head.json" ]]; then
  echo "FAIL: a --only run wrote a verdict file for head $sandbox_head; a one-member run must never produce one"
  exit 1
fi
echo "ok: a --only run writes no verdict file under CHECKS_RESULT_DIR"

rm -rf "$mark_dir"; mkdir -p "$mark_dir"
run_sandbox >/dev/null
if [[ ! -e "$result_dir/$sandbox_head.json" ]]; then
  echo "FAIL: a full run in the same sandbox did not write a verdict file for head $sandbox_head"
  exit 1
fi
echo "ok: a full run in the same sandbox writes a verdict file for head $sandbox_head"

# --- case (d): --only a --compare-base <ref> is accepted ---
rm -rf "$mark_dir"; mkdir -p "$mark_dir"
if ! out="$(run_sandbox --only a --compare-base "$sandbox_head" 2>&1)"; then
  echo "FAIL: --only a --compare-base $sandbox_head exited non-zero: $out"
  exit 1
fi
if [[ "$out" == *"unrecognised flag"* ]]; then
  echo "FAIL: --only a --compare-base $sandbox_head was refused as an unrecognised flag: $out"
  exit 1
fi
echo "ok: --only a --compare-base <ref> composes and is accepted"

if [[ -n "$CHECKS_TOOL" ]]; then
  rm -rf "$mark_dir"; mkdir -p "$mark_dir"
  if ! run_sandbox_via_checks_tool --only a --compare-base "$sandbox_head" >/dev/null 2>&1; then
    echo "FAIL: $CHECKS_TOOL run --only a --compare-base $sandbox_head exited non-zero against the sandbox"
    exit 1
  fi
  echo "ok: $CHECKS_TOOL run --only a --compare-base <ref> composes against the sandbox"
fi

echo "ok: --only is a declared, re-exercised mode of tools/run-registered-checks.sh (kogaki#1353)"
