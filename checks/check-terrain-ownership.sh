#!/usr/bin/env bash
# The Harness-ownership defect class, owned by two checks (kogaki#1031).
#
# THE ONE QUESTION THE OWNERSHIP RULE ASKS IS "WHO EXECUTED THE ACT". Across
# kogaki#17 to #890 every implementation satisfied the words "Harness-
# controlled" while the model drove the workflow: it typed the start command,
# pasted the listing, chose to call the question UI, chose to re-enter. A test
# that asks for a table, or a question, fails on a symptom; this one fails on
# the architecture, in milliseconds, with no integration matrix.
#
#   1. EXECUTOR ATTRIBUTION. Every transition a run record carries names what
#      executed it -- a hook event with its `hook_event_name`, `session_id` and
#      `tool_use_id`, or the harness's skill expansion for the start act -- and
#      the executor refuses to write a transition that has none. Two fixtures:
#      the executor invoked with no hook payload on stdin refuses before any
#      write; the committed golden record (the first live run in which the
#      harness executed every transition, 2026-09-09) carries attribution on
#      every transition. The 2026-09-09 runs before that fix would have failed
#      here on their first transition, because `survey` was executed by a
#      model-typed Bash command with no payload behind it.
#   2. THE EXECUTOR-INVOCATION DENY. Attribution read from stdin is forgeable if
#      the model can run the executor through Bash with a fabricated payload,
#      so the PreToolUse hook that refuses `terrain.mjs run` is driven here over
#      a synthesized Bash payload. Without it the first check is a guard after a
#      model-constructed input, the shape the 2026-09-04 control-input
#      direction forbids.
#   3. THE EXPORT SURFACE HAS A PRODUCTION READER (kogaki#1257). Every name the
#      runtime module exports is imported by a tracked module outside it that is
#      not under `checks/`, so the surface cannot grow unused again silently.
#   4. NO COMMENT BLOCK IN THE RUNTIME MODULE EXCEEDS TWELVE LINES (kogaki#1258).
#      A long comment is a pointer plus what the next editor needs; the
#      retelling lives in the Issue or Decision it cites.
#
# EACH FIXTURE CARRIES ITS OWN COUNTERFACTUAL (acceptance 2): the golden record
# with one `advanced_by` removed fails; a Bash payload naming `--status`, the
# one read-only verb, is admitted. Nothing else is registered under kogaki#1031:
# the Removal Test and the live run are acceptance and close conditions on the
# implementing issues, and would be the first thing removed for being slow.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
cases=0
note() { printf '%s\n' "$*"; }
bad() { printf 'FAIL — %s\n' "$*"; fail=1; }
pass() { cases=$((cases + 1)); }

DENY=.claude/hooks/gate-terrain-executor.py
GOLD=checks/fixtures/terrain-ownership/golden-run-record.json
started=$(date +%s%N)

# ---- 1a. NO PAYLOAD, NO TRANSITION. The executor is handed an empty stdin and
# a fresh workspace; it must refuse before writing anything into it.
tmp=$(mktemp -d) || { bad "no temp directory — CANNOT-DETERMINE, never a pass"; exit 1; }
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/rd"
out=$(KOGAKI_OPEN_GATES="$tmp/gates" node src/terrain.mjs run --run-dir "$tmp/rd" </dev/null 2>&1); rc=$?
# Pinned to the attribution refusal's own words: any other refusal — an
# unreadable table, an unusable gates directory — is the wrong refusal here.
if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -qF "no hook payload carrying hook_event_name, session_id and tool_use_id was readable on stdin"; then pass; else
  bad "the executor advanced with no hook payload on stdin (rc=$rc): $(printf '%s' "$out" | tail -2 | tr '\n' ' ') — a transition nobody executed is exactly the record the attribution field exists to make impossible"
fi
if [ -z "$(ls -A "$tmp/rd" 2>/dev/null)" ]; then pass; else
  bad "the refused advance still wrote into the workspace: $(ls "$tmp/rd" | tr '\n' ' ')"
fi

# ---- 1b. THE GOLDEN RECORD IS ATTRIBUTED ON EVERY TRANSITION.
attributed() {  # attributed <record path>  -> exit 0 when every transition is attributed
  python3 - "$1" <<'PY'
import json, sys
rec = json.load(open(sys.argv[1]))
ts = rec.get("transitions") or []
if not ts:
    print("no transitions"); sys.exit(1)
for t in ts:
    by = t.get("advanced_by") or {}
    kind = by.get("executor")
    if kind == "hook":
        missing = [k for k in ("hook_event_name", "session_id", "tool_use_id") if not by.get(k)]
        if missing:
            print(f"{t.get('state')}: hook transition missing {missing}"); sys.exit(1)
    elif kind == "skill-expansion":
        if t.get("state") != "survey":
            print(f"{t.get('state')}: skill-expansion may execute only the start act"); sys.exit(1)
    else:
        print(f"{t.get('state')}: executor is {kind!r}, neither a hook event nor the skill expansion"); sys.exit(1)
sys.exit(0)
PY
}
if [ -f "$GOLD" ]; then pass; else bad "$GOLD is missing — the golden record is the fixture, and a check with no fixture asserts nothing"; fi
if msg=$(attributed "$GOLD"); then pass; else
  bad "the golden run record has an unattributed transition: $msg"
fi
# The counterfactual: one attribution removed, and the same reader refuses.
python3 - "$GOLD" "$tmp/mutant.json" <<'PY'
import json, sys
rec = json.load(open(sys.argv[1]))
rec["transitions"][-1].pop("advanced_by", None)
json.dump(rec, open(sys.argv[2], "w"))
PY
if attributed "$tmp/mutant.json" >/dev/null; then
  bad "the golden record with one advanced_by removed still passes — the attribution reader asserts nothing"
else pass; fi

# ---- 2. THE EXECUTOR-INVOCATION DENY, over the payload shape the dispatcher
# hands the hook. `run` is refused; `--status`, the one read-only verb, rides.
verdict() {  # stdout AND stderr, so a hook that crashes on a payload cannot read as an admit
  python3 "$DENY" <<PY 2>&1
{"tool_name": "Bash", "tool_input": {"command": $(python3 -c "import json,sys;print(json.dumps(sys.argv[1]))" "$1")}}
PY
}
if verdict "node src/terrain.mjs run --run-dir /tmp/x" | grep -q '"permissionDecision": "deny"'; then pass; else
  bad "a Bash payload naming \`terrain.mjs run\` was not denied — a model can run the executor with a fabricated payload, and the attribution above is then a guard after a model-constructed input"
fi
admitted=$(verdict "node src/terrain.mjs run --status --run-dir /tmp/x"); admitted_rc=$?
if [ "$admitted_rc" -eq 0 ] && [ -z "$admitted" ]; then pass; else
  bad "a Bash payload naming \`terrain.mjs run --status\` was not admitted cleanly (rc=$admitted_rc, output: ${admitted:-none}) — the one read-only route into a stuck run is closed, or the hook fails on it"
fi

# ---- 3. THE EXPORT SURFACE HAS A PRODUCTION READER (kogaki#1257). Every name
# `src/terrain.mjs` exports is imported by at least one tracked module outside
# it that is not under `checks/`. At 9ae8592 the module exported 192 names and
# 156 of them had no such reader: 81 nothing imported, 75 only the checks
# reached into. An export a check alone reads is a test seam wearing a module
# surface, and the split that follows this issue cuts along what the surface
# says the runtime is made of. The reader counts IMPORT BINDINGS rather than
# words, so a spec naming a function in prose does not stand in for a caller.
# ONE READER PROCESS FOR BOTH READINGS, because this member bounds its own
# runtime: the module as committed, then the same text with one export nothing
# imports appended -- the counterfactual -- each printed on its own line as
# `<label>:<unread names, space-separated>`. The import bindings are read once.
surface=$(python3 - src/terrain.mjs <<'PY'
import re, subprocess, sys
module = sys.argv[1]
src = open(module).read()
def exports(text):
    names = re.findall(r'^export\s+(?:async\s+)?(?:function\*?|const|let|class|var)\s+([A-Za-z_$][\w$]*)', text, re.M)
    for m in re.finditer(r'^export\s*\{([^}]*)\}', text, re.M):
        names += [n.strip().split(' as ')[-1].strip() for n in m.group(1).split(',') if n.strip()]
    return names
files = subprocess.run(["git", "ls-files", "*.mjs", "*.js"], capture_output=True, text=True).stdout.split()
imported = set()
for f in files:
    if f == module or f.startswith("checks/"):
        continue
    try:
        t = open(f).read()
    except OSError:
        continue
    for m in re.finditer(r'import\s*\{([^}]*)\}\s*from\s*["\'][^"\']*/terrain\.mjs["\']', t):
        imported |= {n.strip().split(' as ')[0].strip() for n in m.group(1).split(',') if n.strip()}
for label, text in (("real", src), ("mutant", src + "\nexport function kogaki1257UnreadFixture() { return null; }\n")):
    names = exports(text)
    # NO EXPORT READ AT ALL is CANNOT-DETERMINE, never a pass.
    print(f"{label}:" + (" ".join(n for n in names if n not in imported) if names else "<no export read>"))
# Case 4 (kogaki#1258), in this same process: comment blocks over twelve lines,
# as `<first>-<last>` line ranges. A block is a run of `//` lines, or one `/* */`.
def long_blocks(text):
    lines, out, i = text.split("\n"), [], 0
    while i < len(lines):
        s, j = lines[i].strip(), i
        if s.startswith("/*"):
            while j < len(lines) - 1 and "*/" not in lines[j][(lines[j].find("/*") + 2) if j == i else 0:]:
                j += 1
        elif s.startswith("//"):
            while j + 1 < len(lines) and lines[j + 1].strip().startswith("//"):
                j += 1
        else:
            i += 1
            continue
        if j - i + 1 > 12:
            out.append(f"{i + 1}-{j + 1}")
        i = j + 1
    return out
for label, text in (("blocks-real", src), ("blocks-mutant", src + "\n" + "// kogaki1258 fixture\n" * 13)):
    print(f"{label}:" + " ".join(long_blocks(text)))
PY
)
real_unread=$(printf '%s\n' "$surface" | sed -n 's/^real://p')
mutant_unread=$(printf '%s\n' "$surface" | sed -n 's/^mutant://p')
if printf '%s\n' "$surface" | grep -q '^real:' && [ -z "$real_unread" ]; then pass; else
  bad "src/terrain.mjs exports names no module outside it and outside checks/ imports: ${real_unread:-the reader printed nothing} — drop the export, or import it where the runtime uses it (kogaki#1257)"
fi
# The counterfactual: the same module with one added export nothing imports,
# and the same reader names it.
if [ -z "$mutant_unread" ]; then
  bad "an export nothing imports was admitted by the surface reader — it asserts nothing"
elif printf '%s\n' $mutant_unread | grep -qx 'kogaki1257UnreadFixture'; then pass; else
  bad "the surface reader refused the mutant without naming its added export: ${mutant_unread}"
fi

# ---- 4. NO COMMENT BLOCK IN `src/terrain.mjs` EXCEEDS TWELVE LINES
# (kogaki#1258). Read by case 3's process above; the counterfactual appends a
# thirteen-line block and the same reader must name it.
long_real=$(printf '%s\n' "$surface" | sed -n 's/^blocks-real://p')
long_mutant=$(printf '%s\n' "$surface" | sed -n 's/^blocks-mutant://p')
if printf '%s\n' "$surface" | grep -q '^blocks-real:' && [ -z "$long_real" ]; then pass; else
  bad "src/terrain.mjs has comment blocks over twelve lines at ${long_real:-<the reader printed nothing>} — cut each to its Issue pointer and what the next editor needs (kogaki#1258)"
fi
if [ -n "$long_mutant" ] && [ "${long_mutant##* }" != "${long_real##* }" ]; then pass; else
  bad "a thirteen-line comment block appended to the module was not named by the block reader — it asserts nothing"
fi

# ---- THE BOUND (acceptance 1): under one second on this machine run alone
# (639 ms measured at kogaki#1031). The self-check fails at two seconds rather
# than one because the suite runs eight members in contention and a bound at
# the standalone figure would fail on load rather than on growth; a test that
# becomes slow is a test the owner deletes, and this line is where that shows.
elapsed_ms=$(( ($(date +%s%N) - started) / 1000000 ))
if [ "$elapsed_ms" -lt 2000 ]; then pass; else
  bad "the check took ${elapsed_ms}ms against its bound of 2000ms (measured 639 ms alone; the suite runs eight members in contention) — kogaki#1031's own removal condition"
fi

if [ "$fail" -eq 0 ]; then
  note "ok: $cases case(s) pass in ${elapsed_ms}ms — the executor refuses a transition with no hook payload, the golden record is attributed on every transition and its mutant is refused, and the Bash route into the executor is denied with --status admitted (kogaki#1031), and every export has a reader outside checks/ (kogaki#1257), and no comment block in src/terrain.mjs exceeds twelve lines (kogaki#1258)"
fi
exit "$fail"
