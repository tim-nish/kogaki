#!/usr/bin/env bash
# `tools/run-registered-checks.sh --ci-shape` IS A DECLARED SHAPE, EXERCISED
# HERE (kogaki#1182). The issue's own concrete event was a session guessing
# the CI shape by hand and getting it wrong once before getting it right;
# this member is what keeps the declared shape from silently drifting back
# into a guess. Three cases, matching the issue's three acceptance items:
#
#   1. `claude` resolves nowhere under the `--ci-shape` PATH.
#   2. an UNGUARDED fixture member that needs `claude` fails under
#      `--ci-shape` and passes on the identical PATH plus a `claude` stub —
#      isolating the declared shape from whether THIS machine happens to
#      have the real binary, which every other host running this suite will
#      disagree about.
#   3. one full run and one `--ci-shape` run of an isolated sandbox suite,
#      at the same head, record two distinct verdict-store keys.
#
# CASE 3 RUNS IN A SANDBOX GIT REPOSITORY, never this one, so that a run of
# this check under `--ci-shape` (it is itself a registered member, so a suite
# run under that flag reaches it) never recurses into a second run of THIS
# suite.
set -euo pipefail
cd "$(dirname "$0")/.."

WORK="$(mktemp -d "${TMPDIR:-/tmp}/kogaki-check-ci-shape.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

# --- setup: the declared shape's own PATH, built exactly as --ci-shape
#     builds it, in a SUBSHELL so this check's own PATH is untouched. ---
CI_SHAPE_DIR="$(
  source tools/ci-shape-env.sh
  ci_shape_apply
)"
trap 'rm -rf "$WORK" "$CI_SHAPE_DIR"' EXIT

# --- case 1: claude resolves nowhere under the ci-shape PATH ---
if PATH="$CI_SHAPE_DIR" command -v claude >/dev/null 2>&1; then
  echo "FAIL: claude resolved under the declared --ci-shape PATH ($CI_SHAPE_DIR); it must not be a declared binary (kogaki#1182 acceptance 1)"
  exit 1
fi
if (source tools/ci-shape-env.sh; printf '%s\n' "${CI_SHAPE_BINARIES[@]}") | grep -qx claude; then
  echo "FAIL: claude is listed in CI_SHAPE_BINARIES in tools/ci-shape-env.sh; the declared shape must never provide it"
  exit 1
fi
echo "ok: which claude prints nothing under the declared --ci-shape PATH"

# EVERY LINK IN THE SHAPE RESOLVES TO A REAL FILE (PR #1183 round 1, finding 1).
# `command -v` answers for a bash BUILTIN with the bare word, so resolving the
# list that way linked `$dir/printf -> printf` — a link to itself, ELOOP for any
# member reaching it as an external command, while real CI resolves
# `/usr/bin/printf` and passes. That is a red suite caused by the shape rather
# than by the change, which is the class kogaki#1182 exists to retire, so the
# resolution rule is asserted here rather than left to the next member that
# happens to shell out to one of them.
dangling=()
for link in "$CI_SHAPE_DIR"/*; do
  [[ -e "$link" ]] || dangling+=("$(basename "$link")")
done
if ((${#dangling[@]})); then
  echo "FAIL: ${#dangling[@]} entr(y/ies) in the built --ci-shape directory do not resolve to a file: ${dangling[*]} — CI_SHAPE_BINARIES is being resolved with something that answers for shell builtins (use \`type -P\`); every one of these is ELOOP for a member that reaches it as an external command"
  exit 1
fi
echo "ok: every entry in the built --ci-shape directory resolves to a real file (no builtin linked to itself)"

# tools/run-registered-checks.sh calls `ci_shape_apply` DIRECTLY (never
# through `$(...)`) so its exports land in the runner's own process — that
# is the mechanism this case exercises, in a subshell so it still leaves
# THIS check's own PATH untouched.
(
  source tools/ci-shape-env.sh
  ci_shape_apply >/dev/null
  [[ "$PATH" == "$CI_SHAPE_DIR" ]] \
    || { echo "FAIL: calling ci_shape_apply directly did not put its built directory on PATH — a caller sourcing this file the way tools/run-registered-checks.sh does would run every member under its own unrestricted PATH instead (kogaki#1182)"; exit 1; }
  [[ "$TSUREZURE_GATEWAY_JS" == /nonexistent/* ]] \
    || { echo "FAIL: TSUREZURE_GATEWAY_JS was not set to a nonexistent path by ci_shape_apply"; exit 1; }
  [[ "$CHECKS_FORCE" == "1" && "$CI_SHAPE" == "1" ]] \
    || { echo "FAIL: CHECKS_FORCE=1 / CI_SHAPE=1 were not exported by ci_shape_apply"; exit 1; }
)
echo "ok: calling ci_shape_apply directly (not through a subshell) exports PATH, TSUREZURE_GATEWAY_JS, CHECKS_FORCE and CI_SHAPE into the caller's own shell"

# --- case 2: an unguarded claude-needing fixture, isolated from this host's
#     own claude installation by injecting a stub rather than relying on it ---
fixture="$WORK/fixture-needs-claude.sh"
cat > "$fixture" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
command -v claude >/dev/null 2>&1
echo "ok: claude present"
EOF
chmod +x "$fixture"

if PATH="$CI_SHAPE_DIR" bash "$fixture" >/dev/null 2>&1; then
  echo "FAIL: the fixture member (needs claude, unguarded) PASSED under --ci-shape; it should fail (kogaki#1182 acceptance 2)"
  exit 1
fi
echo "ok: the fixture member fails under --ci-shape"

withclaude="$WORK/with-claude"
mkdir -p "$withclaude"
cat > "$withclaude/claude" <<'EOF'
#!/usr/bin/env bash
echo "stub claude"
EOF
chmod +x "$withclaude/claude"

if ! PATH="$withclaude:$CI_SHAPE_DIR" bash "$fixture" >/dev/null 2>&1; then
  echo "FAIL: the same fixture member failed even with a claude stub on PATH — the comparison is not isolating the declared shape from a real claude installation"
  exit 1
fi
echo "ok: the identical fixture member passes on the same PATH plus a claude stub"

# --- case 3: two verdict-store keys for one head sha, in a sandbox repo ---
sandbox="$WORK/sandbox"
mkdir -p "$sandbox/checks" "$sandbox/tools"
git init -q "$sandbox"
git -C "$sandbox" config user.email "ci-shape-check@example.invalid"
git -C "$sandbox" config user.name "check-ci-shape"
cp tools/run-registered-checks.sh tools/ci-shape-env.sh "$sandbox/tools/"
cat > "$sandbox/checks/registry.json" <<'EOF'
{"checks":[{"id":"noop","file":"check-noop.sh","admission":{
  "contract":"fixture-only member for checks/check-ci-shape.sh; always passes",
  "license":"kogaki#1182","tier":"ci","removal_signal":"none: sandbox fixture",
  "removal_instrument":"none: sandbox fixture, never a live registry",
  "efficacy":"none: fixture-only member, asserts nothing of its own"}}]}
EOF
cat > "$sandbox/checks/check-noop.sh" <<'EOF'
#!/usr/bin/env bash
echo "ok: sandbox fixture check"
EOF
chmod +x "$sandbox/checks/check-noop.sh" "$sandbox/tools/run-registered-checks.sh"
git -C "$sandbox" add -A
git -C "$sandbox" commit -q -m "sandbox fixture for checks/check-ci-shape.sh"
sandbox_head="$(git -C "$sandbox" rev-parse HEAD)"

result_dir="$WORK/results"
# CI_SHAPE and CHECKS_FORCE are UNSET explicitly rather than left to
# whatever this check's own caller happened to export — a suite run under
# `--ci-shape` reaches this member with both already set, and inheriting
# them into the "full run" leg below would key it as a ci-shape run too,
# collapsing the two-key assertion this case exists to make.
(cd "$sandbox" && env -u CI_SHAPE -u CHECKS_FORCE -u TSUREZURE_GATEWAY_JS \
  CHECKS_RESULT_DIR="$result_dir" bash tools/run-registered-checks.sh >/dev/null)
(cd "$sandbox" && env -u CI_SHAPE -u CHECKS_FORCE -u TSUREZURE_GATEWAY_JS \
  CHECKS_RESULT_DIR="$result_dir" bash tools/run-registered-checks.sh --ci-shape >/dev/null)

if [[ -f "$result_dir/$sandbox_head.json" && -f "$result_dir/$sandbox_head-ci-shape.json" ]]; then
  echo "ok: the verdict store holds two keys for one head sha ($sandbox_head): a full-tool verdict and a --ci-shape verdict"
else
  echo "FAIL: expected both $result_dir/$sandbox_head.json and $result_dir/$sandbox_head-ci-shape.json (kogaki#1182 acceptance 3); found: $(ls "$result_dir" 2>/dev/null)"
  exit 1
fi

# THE KEY IS `CI_SHAPE`, NEVER `CHECKS_FORCE` ALONE -- ci_shape_apply sets
# both together, so the two runs above alone cannot tell the two readings
# apart. A PLAIN CHECKS_FORCE=1 run, with no --ci-shape, is the case that
# does: it must still write the ORDINARY key, because CHECKS_FORCE=1 forces
# execution for reasons that have nothing to do with the declared shape
# (kogaki#769's own escape hatch predates this issue).
rm -rf "$result_dir"
(cd "$sandbox" && env -u CI_SHAPE -u TSUREZURE_GATEWAY_JS \
  CHECKS_FORCE=1 CHECKS_RESULT_DIR="$result_dir" bash tools/run-registered-checks.sh >/dev/null)
if [[ -f "$result_dir/$sandbox_head.json" && ! -f "$result_dir/$sandbox_head-ci-shape.json" ]]; then
  echo "ok: a plain CHECKS_FORCE=1 run (no --ci-shape) still writes the ordinary key, not the ci-shape one"
else
  echo "FAIL: a plain CHECKS_FORCE=1 run (no --ci-shape) wrote the wrong key; found: $(ls "$result_dir" 2>/dev/null)"
  exit 1
fi

echo "ok: --ci-shape is a declared, re-exercised mode (kogaki#1182)"
