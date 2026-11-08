# Sourced by checks/check-terrain-hook-invocation.sh and
# checks/check-brief-hook-invocation.sh (kogaki#1741): the one driver both
# lanes' deny cases run through, so the two checks cannot drift on how a
# verdict is read. The sourcing check sets PY, DENY and the pass/bad helpers.
#
# ONE PYTHON PROCESS DRIVES EVERY VERDICT (kogaki#1425). It loads the hook once
# and hands its `main` one payload per command, read NUL-terminated from this
# shell, writing back what the hook printed as one line: the deny's JSON, or an
# empty line where it admits. A hook that RAISES writes a line naming the
# exception, so a crash is never read as an admission.
DENY_DRIVER_SRC=$(cat <<'DRIVER'
import contextlib, importlib.util, io, json, sys
spec = importlib.util.spec_from_file_location("gate_executor_invocation", sys.argv[1])
hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook)
source, pending = sys.stdin.buffer, b""
def verdict(command):
    payload = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
    out, stdin = io.StringIO(), sys.stdin
    sys.stdin = io.StringIO(payload)
    try:
        with contextlib.redirect_stdout(out):
            hook.main()
        line = out.getvalue()
    except BaseException as e:  # noqa: BLE001
        line = f"the hook raised {e!r}"
    finally:
        sys.stdin = stdin
    sys.stdout.write(line.strip().replace("\n", " ") + "\n")
    sys.stdout.flush()
while chunk := source.read1(65536):
    pending += chunk
    while b"\0" in pending:
        raw, pending = pending.split(b"\0", 1)
        verdict(raw.decode("utf-8"))
DRIVER
)
coproc DENY_DRIVER { "$PY" -c "$DENY_DRIVER_SRC" "$DENY" 2>/dev/null; }
# `read_verdict` leaves the line in VERDICT, so the asserts below fork nothing;
# `deny_verdict` prints it, for the cases that read it as `out=$(...)`.
read_verdict() {
  printf '%s\0' "$1" >&"${DENY_DRIVER[1]}"
  IFS= read -r VERDICT <&"${DENY_DRIVER[0]}" || VERDICT="the deny driver exited"
}
deny_verdict() { read_verdict "$1"; printf '%s' "$VERDICT"; }
assert_denied() {
  local label=$1 cmd=$2
  read_verdict "$cmd"
  if [[ $VERDICT == *'"permissionDecision": "deny"'* ]]; then pass; else
    bad "the deny does not fire on $label: \`$cmd\` — a model-typed route into the executor makes the start attribution unfalsifiable"
  fi
}
assert_admitted() {
  local label=$1 cmd=$2
  read_verdict "$cmd"
  if [ -z "$VERDICT" ]; then pass; else
    bad "the deny fires on $label: \`$cmd\` — $ADMITTED_NOTE"
  fi
}
ADMITTED_NOTE="--status is read-only and is the one route by which a stuck run can be inspected"
