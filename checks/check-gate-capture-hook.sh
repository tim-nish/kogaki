#!/usr/bin/env bash
# The capture hook's seam (kogaki#890).
#
# WHAT THIS CHECKS THAT NOTHING ELSE CAN. `src/terrain.mjs`'s own `self-test`
# drives the hook end to end — it writes a row, it refuses to choose between
# two outstanding raisings, and the executor refuses the three removed flags by
# name — so the BEHAVIOUR is covered there, beside the code it belongs to.
# What that pass cannot show is the one thing this file exists for: the
# option-set digest is computed TWICE, once in Python inside the hook and once
# in JavaScript inside the runtime, because the two sit on opposite sides of a
# harness seam with no module to share. Two implementations of one value is a
# divergence waiting to happen, and a self-test that drives both at once would
# agree with itself even if both were wrong together — so this computes each
# one independently and compares them.
#
# The second half asserts the hook's INSTALLABILITY facts, which are the ones a
# reader would otherwise have to take on trust: the file exists, it parses, and
# the executor names it in the refusal an unanswered gate raises. Its
# REGISTRATION is deliberately not asserted — that wiring is machine-local and
# never committed, so a check asserting it would fail on every fresh clone and
# would be asserting a fact about a machine rather than about this repository.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
note() { printf '%s\n' "$*"; }
bad() { printf 'FAIL — %s\n' "$*"; fail=1; }

HOOK=.claude/hooks/write-gate-capture.py

[ -f "$HOOK" ] || { bad "$HOOK is missing — the owner's answer at a Terrain gate has no writer, and every declared gate refuses"; }
if [ -f "$HOOK" ]; then
  python3 -c "import ast,sys;ast.parse(open('$HOOK').read())" 2>/dev/null \
    || bad "$HOOK does not parse as Python — a hook that cannot load writes no row, and PostToolUse failures are silent to the model"
fi

# ---- THE DIGEST, COMPUTED ON BOTH SIDES OF THE SEAM.
# Deliberately over several shapes, including an empty option set and one whose
# ids need JSON escaping: the canonical form is a two-element array and the way
# two implementations drift is separator and escaping conventions, not the
# happy path.
# THE MULTI-ID SHAPE IS RE-POINTED, NOT DROPPED (kogaki#1087). It rode on
# `terrain-strand-selection|strand:a,strand:b,no-strand`, and that gate is
# deleted; the tag gate composes run options beside its standing one, so the
# three-id shape is carried there. A digest case is about the shape of the id
# list and not about which gate holds it, but a case naming a gate the registry
# no longer has reads as coverage of a surface that is gone.
# THE RUNTIME'S DIGEST IS READ OFF ITS OWN REFUSAL (kogaki#1257). The function
# is internal to `src/terrain.mjs`, so each case drives `run` re-entering a
# declared gate whose capture row binds a wrong digest: the refusal names the
# digest THIS declaration's options compose, which is the value the runtime
# compares a hook-written row against -- read where it is used rather than by
# importing the function that computes it.
probe_dir=$(mktemp -d "${TMPDIR:-/tmp}/gate-capture-digest-XXXXXX")
trap 'rm -rf "$probe_dir"' EXIT
probe="$probe_dir/digest-probe.mjs"
cat > "$probe" <<'JS'
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const repo = process.cwd();
const gate = process.env.GATE;
const ids = process.env.IDS.split(",").filter(Boolean);
const schema = JSON.parse(readFileSync(join(repo, "src/gate-schema.json"), "utf8"));
const d = mkdtempSync(join(process.env.PROBE_DIR, "run-"));
const declPath = join(d, `probe${schema.capture.run_declaration_suffix}`);
writeFileSync(declPath, JSON.stringify({ id: gate, question: "?", options: ids.map((id) => ({ id, label: id })),
  gate_instance_id: "probe-instance" }));
writeFileSync(join(d, `terrain${schema.capture.suffix}`), JSON.stringify({ rows: [{ gate_instance_id: "probe-instance",
  evidence: { tool: "AskUserQuestion", tool_use_id: "probe-tool-use" },
  answers_over: { option_set_digest: "not-a-digest" }, payload: { answer: {} } }] }));
const table = join(d, "table.json");
writeFileSync(table, JSON.stringify({ version: 1, states: [
  { id: "W", kind: "wait", owner_supplies: "x", renders_gate_declaration: true, gate_id: gate },
  { id: "done", kind: "terminal" }] }));
writeFileSync(join(d, "run-record.json"), JSON.stringify({ workflow: { path: table, version: 1 }, survey_record: null,
  completed: [], waits_reached: ["W"], conditional_entered: [], conditional_skipped: [], awaiting: "W",
  owner_input: {}, artifacts_written: [], judgments: {},
  gate_declarations_owed: [{ state: "W", gate_id: gate, declaration: declPath }], done: false }));
const r = spawnSync(process.execPath, [join(repo, "src", "terrain.mjs"), "run", "--run-dir", d, "--workflow", table],
  { encoding: "utf8", input: JSON.stringify({ hook_event_name: "PostToolUse", session_id: "s", tool_use_id: "probe-tool-use" }) });
const m = `${r.stdout}${r.stderr}`.match(/this declaration's options digest "([0-9a-f]+)"/);
if (!m) { process.stderr.write(`${r.stdout}${r.stderr}`); process.exit(1); }
console.log(m[1]);
JS
export PROBE_DIR="$probe_dir"

for case in 'terrain-tag-selection|other-method' \
            'terrain-tag-selection|agents,method,other-method' \
            'terrain-id-selection|enter-no-groups' \
            'brief-thesis-adoption|' \
            'x"y|a b,c/d'; do
  gate=${case%%|*}
  ids=${case#*|}
  py=$(GATE="$gate" IDS="$ids" python3 - <<'PY'
import os, sys
sys.path.insert(0, ".claude/hooks")
import importlib.util
spec = importlib.util.spec_from_file_location("wgc", ".claude/hooks/write-gate-capture.py")
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
ids = [i for i in os.environ["IDS"].split(",") if i]
print(m.option_set_digest(os.environ["GATE"], ids))
PY
) || { bad "the hook's digest could not be computed for $gate"; continue; }
  js=$(GATE="$gate" IDS="$ids" node "$probe" 2>/dev/null) || { bad "the runtime's digest could not be computed for $gate"; continue; }
  case "$js" in
    *[!0-9a-f]*|'') bad "the runtime's digest could not be read for $gate: $js"; continue ;;
  esac
  if [ "$py" != "$js" ]; then
    bad "the option-set digest DIVERGES across the harness seam for gate '$gate' with ids '$ids': hook=$py runtime=$js — a capture the hook writes would be refused by the runtime that reads it, on every gate, forever"
  fi
done

# ---- THE REFUSAL NAMES ITS CARRIER.
# A gate that refuses without naming the hook sends the owner round the
# render-the-question loop forever on a machine where the hook was never
# installed, which is the one state re-rendering cannot fix.
grep -q 'write-gate-capture\.py' src/terrain.mjs \
  || bad "src/terrain.mjs never names $HOOK — an unanswered gate's refusal must name the carrier that would answer it, because the un-installed machine is exactly the case re-rendering does not resolve"

for dead in capture-option capture-free-text tool-use-id; do
  grep -q "\"$dead\"" src/terrain.mjs \
    || bad "src/terrain.mjs no longer mentions --$dead — it must REFUSE it by name, not merely ignore it: an ignored flag is a session quietly getting a different act than it asked for"
done

if [ "$fail" -eq 0 ]; then
  note "ok: capture-hook seam enforced — one option-set digest across two implementations (5 shapes), the hook present and parsing, the removed flags refused by name, and the unanswered-gate refusal naming its carrier (kogaki#890)"
  note "not asserted here: that the hook is REGISTERED on this machine. That wiring is machine-local and never committed, so asserting it would fail on every fresh clone and would be a claim about a machine rather than about this repository — the executor's own refusal is what surfaces an uninstalled hook, at the moment it matters."
fi
exit "$fail"
