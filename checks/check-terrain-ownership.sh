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
#   3. THE EXPORT SURFACE HAS A PRODUCTION READER (kogaki#1257). Every name a
#      runtime module exports is imported from it by a tracked module that is
#      not under `checks/`, so the surface cannot grow unused again silently;
#      and no check imports the entry point (kogaki#1259).
#   4. NO COMMENT BLOCK IN A RUNTIME MODULE EXCEEDS TWELVE LINES (kogaki#1258).
#      A long comment is a pointer plus what the next editor needs; the
#      retelling lives in the Issue or Decision it cites.
#   5. NO MODULE UNDER `src/terrain/` OR `src/workflow/` EXCEEDS 1,500 LINES
#      (kogaki#1259).
#   6. NO COMMAND MODULE IMPORTS ANOTHER COMMAND'S (kogaki#1302).
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

# ---- 3. THE EXPORT SURFACE HAS A PRODUCTION READER (kogaki#1257), over every
# module the runtime is split into (kogaki#1259): `src/terrain.mjs`, and each
# module under `src/terrain/` and `src/workflow/`. Every name a module exports
# is imported FROM THAT MODULE by a tracked module outside `checks/`. At
# 9ae8592 the one module exported 192 names and 156 had no such reader. The
# reader counts IMPORT BINDINGS resolved to the file they name, so a spec
# naming a function in prose, or a second module exporting the same name, does
# not stand in for a caller. ONE READER PROCESS FOR EVERY CASE BELOW, because
# this member bounds its own runtime; each reading prints one
# `<label>:<findings, space-separated>` line, its counterfactual beside it.
# 3b. NO CHECK IMPORTS THE ENTRY POINT (kogaki#1259): a check reaches a stage
# through the module that exports it, or through the command surface.
surface=$(python3 - <<'PY'
import os, re, subprocess
tracked = subprocess.run(["git", "ls-files"], capture_output=True, text=True).stdout.split()
ENTRY = "src/terrain.mjs"
RUNTIME = [ENTRY] + sorted(f for f in tracked if re.fullmatch(r"src/(terrain|workflow)/[^/]+\.mjs", f))
IMPORT = re.compile(r'(?:import|export)\s*\{([^}]*)\}\s*from\s*["\']([^"\']+)["\']')
SPEC = re.compile(r'(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s*)["\'](\.[^"\']*)["\']', re.M)
def read(f):
    try:
        return open(f).read()
    except OSError:
        return ""
def resolve(f, spec):
    return os.path.normpath(os.path.join(os.path.dirname(f), spec)) if spec.startswith(".") else None
def bindings(f, text):
    for names, spec in IMPORT.findall(text):
        target = resolve(f, spec)
        if target:
            yield target, {n.strip().split(" as ")[0].strip() for n in names.split(",") if n.strip()}
def exports(text):
    names = re.findall(r'^export\s+(?:async\s+)?(?:function\*?|const|let|class|var)\s+([A-Za-z_$][\w$]*)', text, re.M)
    for m in re.finditer(r'^export\s*\{([^}]*)\}', text, re.M):
        names += [n.strip().split(' as ')[-1].strip() for n in m.group(1).split(',') if n.strip()]
    return names
sources = {f: read(f) for f in tracked if f.endswith((".mjs", ".js"))}
imported = {}
for f, t in sources.items():
    if f.startswith("checks/"):
        continue
    for target, names in bindings(f, t):
        if target != f:
            imported.setdefault(target, set()).update(names)
def unread(texts):
    out, seen = [], 0
    for m, t in texts.items():
        names = exports(t)
        seen += len(names)
        out += [f"{m}:{n}" for n in names if n not in imported.get(m, set())]
    # NO EXPORT READ AT ALL is CANNOT-DETERMINE, never a pass.
    return " ".join(out) if seen else "<no export read>"
texts = {m: sources.get(m, "") for m in RUNTIME}
mutant = dict(texts)
mutant["src/workflow/run-record.mjs"] = texts.get("src/workflow/run-record.mjs", "") + "\nexport function kogaki1257UnreadFixture() { return null; }\n"
print("real:" + unread(texts))
print("mutant:" + unread(mutant))
def entry_importers(files):
    return " ".join(sorted(f for f, t in files.items() if f.startswith("checks/")
                           and any(target == ENTRY for target, _ in bindings(f, t))))
checks = {f: t for f, t in sources.items() if f.startswith("checks/")}
print("entry-real:" + entry_importers(checks))
print("entry-mutant:" + entry_importers({**checks, "checks/kogaki1259-fixture.mjs": 'import { glossFor } from "../src/terrain.mjs";\n'}))
# Case 4 (kogaki#1258): comment blocks over twelve lines, as `<module>:<first>-<last>`.
# A block is a run of `//` lines, or one `/* */`.
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
def all_blocks(ts):
    return " ".join(f"{m}:{b}" for m, t in ts.items() for b in long_blocks(t))
print("blocks-real:" + all_blocks(texts))
print("blocks-mutant:" + all_blocks({**texts, ENTRY: texts[ENTRY] + "\n" + "// kogaki1258 fixture\n" * 13}))
# Case 5 (kogaki#1259): no module under src/terrain/ or src/workflow/ exceeds 1,500 lines.
BOUND = 1500
def over(ts):
    return " ".join(f"{m}={t.count(chr(10))}" for m, t in ts.items() if m != ENTRY and t.count("\n") > BOUND)
print(f"lines-modules:{len(RUNTIME) - 1}")
print("lines-real:" + over(texts))
print("lines-mutant:" + over({**texts, "src/terrain/kogaki1259-fixture.mjs": "x\n" * (BOUND + 1)}))
# Case 6 (kogaki#1302): no command module imports another command's. A command is a
# `src/<name>.mjs` whose skill `.claude/skills/<name>/SKILL.md` is tracked; its module
# set is that entry and everything under `src/<name>/`. Shared code lives outside both.
commands = sorted({m.group(1) for f in tracked for m in [re.fullmatch(r"\.claude/skills/([^/]+)/SKILL\.md", f)]
                   if m and f"src/{m.group(1)}.mjs" in tracked})
def command_of(path):
    for c in commands:
        if path == f"src/{c}.mjs" or path.startswith(f"src/{c}/"):
            return c
    return None
def crossings(files):
    out = set()
    for f, t in files.items():
        a = command_of(f)
        if a is None:
            continue
        for spec in SPEC.findall(t):
            b = command_of(resolve(f, spec))
            if b is not None and b != a:
                out.add(f"{f}->{resolve(f, spec)}")
    return out
src_files = {f: t for f, t in sources.items() if f.startswith("src/")}
# THE ONE EXEMPTION, ANCHORED BY COUNT: Draft's Leg parser is read by Review Draft, and
# moving it is not this split's (kogaki#1259 "Not in scope"). A new crossing fails, and so
# does this entry once its edge is gone.
EXEMPT = {"src/review-draft.mjs->src/draft.mjs"}
real = crossings(src_files)
print("boundary-commands:" + " ".join(commands))
print("boundary-real:" + " ".join(sorted(real - EXEMPT)))
print("boundary-stale-exempt:" + " ".join(sorted(EXEMPT - real)))
fixture = {**src_files, "src/brief.mjs": src_files.get("src/brief.mjs", "") + '\nimport { cotagGroups } from "./terrain/cotags.mjs";\n'}
print("boundary-mutant:" + " ".join(sorted(crossings(fixture) - EXEMPT)))
PY
)
field() { printf '%s\n' "$surface" | sed -n "s/^$1://p"; }
real_unread=$(field real)
mutant_unread=$(field mutant)
if printf '%s\n' "$surface" | grep -q '^real:' && [ -z "$real_unread" ]; then pass; else
  bad "the Terrain runtime exports names no module outside it and outside checks/ imports from it: ${real_unread:-the reader printed nothing} — drop the export, or import it where the runtime uses it (kogaki#1257)"
fi
if [ -z "$mutant_unread" ]; then
  bad "an export nothing imports was admitted by the surface reader — it asserts nothing"
elif printf '%s\n' $mutant_unread | grep -qx 'src/workflow/run-record.mjs:kogaki1257UnreadFixture'; then pass; else
  bad "the surface reader refused the mutant without naming its added export: ${mutant_unread}"
fi
entry_real=$(field entry-real)
entry_mutant=$(field entry-mutant)
if printf '%s\n' "$surface" | grep -q '^entry-real:' && [ -z "$entry_real" ]; then pass; else
  bad "checks import src/terrain.mjs for internals: ${entry_real:-the reader printed nothing} — import the stage module that exports the name, or run the command surface (kogaki#1259)"
fi
if [ "$entry_mutant" = "checks/kogaki1259-fixture.mjs" ]; then pass; else
  bad "a check importing the entry point was not named by the entry reader (got: ${entry_mutant:-nothing}) — it asserts nothing"
fi

# ---- 4. NO COMMENT BLOCK IN ANY RUNTIME MODULE EXCEEDS TWELVE LINES
# (kogaki#1258, over every module since kogaki#1259). Read by case 3's process
# above; the counterfactual appends a thirteen-line block and the same reader
# must name it.
long_real=$(field blocks-real)
long_mutant=$(field blocks-mutant)
if printf '%s\n' "$surface" | grep -q '^blocks-real:' && [ -z "$long_real" ]; then pass; else
  bad "runtime modules have comment blocks over twelve lines at ${long_real:-<the reader printed nothing>} — cut each to its Issue pointer and what the next editor needs (kogaki#1258)"
fi
if [ -n "$long_mutant" ] && [ "${long_mutant##* }" != "${long_real##* }" ]; then pass; else
  bad "a thirteen-line comment block appended to the module was not named by the block reader — it asserts nothing"
fi

# ---- 5. NO MODULE UNDER `src/terrain/` OR `src/workflow/` EXCEEDS 1,500 LINES
# (kogaki#1259): a worker's cell is one module, and a module past the bound is
# the 11,019-line file arriving again one stage at a time. No module read at
# all is CANNOT-DETERMINE, never a pass.
modules=$(field lines-modules)
lines_real=$(field lines-real)
lines_mutant=$(field lines-mutant)
if [ "${modules:-0}" -gt 0 ] && printf '%s\n' "$surface" | grep -q '^lines-real:' && [ -z "$lines_real" ]; then pass; else
  bad "modules over the 1,500-line bound: ${lines_real:-none named, but ${modules:-no} module(s) were read} — cut the module at its own section markers (kogaki#1259)"
fi
if [ "$lines_mutant" = "src/terrain/kogaki1259-fixture.mjs=1501" ]; then pass; else
  bad "a 1,501-line module was not named by the line reader (got: ${lines_mutant:-nothing}) — it asserts nothing"
fi

# ---- 6. NO COMMAND MODULE IMPORTS ANOTHER COMMAND'S (kogaki#1302). For every
# command entry `src/<command>.mjs` and directory `src/<command>/`, no import
# resolves to another command's entry or directory; shared code lives outside
# every command directory, which is why the engine Brief runs on is
# `src/workflow/`. The counterfactual is Brief importing a Terrain stage.
commands=$(field boundary-commands)
boundary_real=$(field boundary-real)
boundary_stale=$(field boundary-stale-exempt)
boundary_mutant=$(field boundary-mutant)
if [ -n "$commands" ] && printf '%s\n' "$surface" | grep -q '^boundary-real:' && [ -z "$boundary_real" ]; then pass; else
  bad "a command module imports another command's: ${boundary_real:-no command read (commands: ${commands:-none})} — move what both read to a shared file outside every command directory (kogaki#1302)"
fi
if [ -z "$boundary_stale" ]; then pass; else
  bad "the boundary exemption names an import that no longer exists: ${boundary_stale} — drop it from the case (kogaki#1302)"
fi
if [ "$boundary_mutant" = "src/brief.mjs->src/terrain/cotags.mjs" ]; then pass; else
  bad "Brief importing a Terrain stage was not named by the boundary reader (got: ${boundary_mutant:-nothing}) — it asserts nothing"
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
  note "ok: $cases case(s) pass in ${elapsed_ms}ms — the executor refuses a transition with no hook payload, the golden record is attributed on every transition and its mutant is refused, and the Bash route into the executor is denied with --status admitted (kogaki#1031), and every export of every runtime module has a reader outside checks/ and no check imports the entry point (kogaki#1257, kogaki#1259), and no comment block in a runtime module exceeds twelve lines (kogaki#1258), and no module under src/terrain/ or src/workflow/ exceeds 1,500 lines (kogaki#1259), and no command module imports another command's (kogaki#1302)"
fi
exit "$fail"
