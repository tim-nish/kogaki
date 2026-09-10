#!/usr/bin/env python3
"""PostToolUse: the Terrain executor's advance, executed by the harness.

Design and licence: kogaki#1027, items 3 and 4. Contract:
specs/spec-terrain/SPEC.md §16. Read them there -- this file restates neither.

WHAT THIS IS. The advance after a gate answer. `write-gate-capture.py` writes
the owner's answer from this same payload; this hook then RUNS the executor,
which reads that answer and advances to the next wait or to `done`. The model
performs neither act and has no route to either: a Bash command naming
`terrain.mjs` with any verb but `--status` is denied by
`gate-terrain-executor.py`.

ORDER MATTERS, and it is the family table's rather than this file's.
`write-gate-capture.py` is registered before this hook, so the row exists by
the time this hook reads for it. Since kogaki#1075 that order is load-bearing
rather than merely convenient: the row is this hook's own PRECONDITION, and
`checks/check-terrain-hook-invocation.sh` asserts the registration order in
`.claude/settings.json` because of it.

AND THE ADVANCE IS KEYED TO THAT ROW, NOT TO THE POINTER (kogaki#1075). An
open-run pointer says a run exists; it does not say this question is the one
that answered its gate. See `main` for what that cost and what the key is.

THE PAYLOAD IS FORWARDED, NOT SUMMARISED. The executor is handed this hook's
own payload on stdin, verbatim, and copies `hook_event_name`, `session_id` and
`tool_use_id` out of it into every transition it writes. Composing those fields
here -- or letting the executor mint them -- would record an attribution no
harness event supplied, which is the defect the field exists to end.

THE TIMEOUT IS DECLARED RATHER THAN INHERITED (item 3). The harness's own
default for a hook is ten minutes; a Terrain advance crossing several states
reads the seam and can legitimately run for minutes, and a run killed halfway
leaves a record whose last transition is attributed to a hook event that did
not finish. So the bound is written here, once, next to the call it bounds.

EVERY FAILURE PATH RETURNS 0 AND SAYS SO ON STDERR, for its sibling's reason:
PostToolUse cannot deny the call that already happened, so this hook has no way
to turn its own failure into a refusal -- and it does not need one. The absence
of an advance IS the stop, and the next raising of the gate re-offers it.

AND STDERR IS WHERE THOSE NOTES DIE (kogaki#1081). A PostToolUse hook reaches the
model through exactly one channel -- the JSON `hookSpecificOutput.additionalContext`
field of its own stdout -- and everything else it writes goes nowhere. That was
survivable while this hook only ever had failures to report. It stopped being
survivable when the advance it runs began OPENING GATES: kogaki#1057 delivered
the tag gate's payload on the start act's stdout, which the skill expansion hands
to the session before any tool exists to deny, and every LATER gate is opened by
this hook instead. On 2026-09-10 the ID-selection gate opened at 12:45:43Z with
its `gate-call.json` written, and the session had no route to the bytes at all:
the open-gate hook denied `Read`, `Bash`, `Agent` and `Skill`, each correctly,
and a composed substitute failed the equality check, also correctly. The run
recorded `gate-unrendered` and was recovered from outside the session, by hand.

SO THE PAYLOAD RIDES OUT ON THAT ONE CHANNEL, AND THE FILE STAYS THE REFERENCE.
Where the advance leaves a gate outstanding for this run, `main` emits the
written call's bytes verbatim inside `additionalContext`, fenced, with the gate
id and the instance id beside them. `gate-open-terrain-gate.py` is UNCHANGED:
its PreToolUse equality check still compares the sent payload against the file
on disk, so a payload that arrives paraphrased is refused exactly as before, and
nothing here admits a second act into the interval.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

# The bound on one advance, in seconds, DECLARED (item 3) and set BELOW the
# harness's own default rather than at it (PR #1034 round 1, finding 3).
#
# The first cut used 600, which is the harness's hook default -- so it could
# never fire first: the hook starts before the subprocess, the harness kills the
# hook at ~600s, and the half-finished record this file's docstring names is
# reached by the same path as before. A bound that cannot fire is not a bound.
# 480 leaves two clear minutes for the relay message below to be written, which
# is the whole reason a child bound exists here at all.
#
# THE HOOK'S OWN TIMEOUT LIVES IN THE MACHINE-LOCAL REGISTRATION this repository
# deliberately does not commit, and item 3's subject is that one. What is
# declarable here is the child's, and the two are named apart rather than
# conflated: a repository that installs this hook should register it with a
# timeout above ADVANCE_TIMEOUT_S, and the constant is what tells the installer
# what "above" means.
ADVANCE_TIMEOUT_S = 480

# The open-run pointer the start act writes, read here for the SAME reason the
# executor reads it: an advance is an advance OF a run, and a hook that spawned
# the executor without one would mint a fresh workspace per question. Its
# absence is also this hook's narrowing -- see `main`.
LANE_POINTER = ("runs", "terrain", "open-run")

# The run workspace this advance belongs to. `KOGAKI_RUN_DIR` is the executor's
# own variable and is honoured here so a hook and a run agree about which
# workspace they are in; with neither, the executor resolves the open-run
# pointer above.
RUN_DIR_ENV = "KOGAKI_RUN_DIR"

# The capture file's suffix, `src/gate-schema.json`'s `capture.suffix`, copied
# here on the same ground `write-gate-capture.py` copies `POINTER_TTL`: a hook
# is one file with no module to import. `checks/check-terrain-hook-invocation.sh`
# compares this constant against the schema rather than trusting the two to
# agree by reading.
CAPTURE_SUFFIX = ".gate-capture.json"

# The open-gate pointer directory, `src/terrain.mjs`'s `openGateDir()`, copied
# here on the same ground `CAPTURE_SUFFIX` is copied: a hook is one file, with no
# module to import. `KOGAKI_OPEN_GATES` overrides it for tests, exactly as it
# does for the executor and for the two hooks that already read this directory.
#
# WHY THIS HOOK READS IT AT ALL. The pointer is written by `emitGateDeclaration`
# at every raising and removed by `write-gate-capture.py` when the answer's row
# lands -- which is the hook registered BEFORE this one. So by the time this hook
# runs, the pointer for the gate just answered is gone, and a pointer naming this
# run's capture is the raising the advance below has just opened. That is the
# whole read: no second convention, and no second reader of run identity.
OPEN_GATES_ENV = "KOGAKI_OPEN_GATES"


def open_gate_dir():
    env = os.environ.get(OPEN_GATES_ENV)
    if env:
        return Path(env)
    return Path.home() / ".claude" / "kogaki-open-gates"


def note(msg):
    print(f"advance-terrain: {msg}", file=sys.stderr)


def repo_root():
    """The repository this hook was installed beside.

    Resolved from this file's own location rather than from the cwd, for
    `terrain.mjs`'s own reason: the executor must not depend on the directory a
    session happens to stand in.
    """
    return Path(__file__).resolve().parent.parent.parent


def resolve_run_dir(pointer):
    """The workspace this advance would belong to, or None.

    RESOLVED THE WAY THE EXECUTOR RESOLVES IT, in the same order and with the
    same fallbacks: `KOGAKI_RUN_DIR` first, then the open-run pointer's
    contents. Two readers of run identity that could disagree is exactly the
    shape `readOpenRunPointer` was written to avoid, so this one is its copy
    rather than a second convention -- including the *pointer to a directory
    that is gone is not a run* rule, which a `runs/` prune reaches every time.

    NONE IS NOT A FAILURE HERE. A pointer this hook cannot resolve is a run it
    cannot show this question belongs to, and the absence of an advance IS the
    stop.
    """
    env_dir = os.environ.get(RUN_DIR_ENV)
    if env_dir:
        d = Path(env_dir)
        return d if d.is_dir() else None
    try:
        named = pointer.read_text(encoding="utf-8").strip()
    except OSError:
        return None
    if not named:
        return None
    d = Path(named)
    return d if d.is_dir() else None


def capture_names(run_dir, tool_use_id):
    """Whether this run's capture holds a row raised by THIS question.

    ONE FILE, AND ITS NAME IS THE EXECUTOR'S. `src/gate-schema.json` declares
    the suffix and `src/terrain.mjs` composes the path as `terrain` + it; the
    constant is copied here for the reason `POINTER_TTL` is copied into the
    capture hook -- a hook is one file, with no module to share.

    THE MATCH IS ON `evidence.tool_use_id`, which is the field
    `write-gate-capture.py` copies out of the harness's own payload and the
    field the executor reads back at its re-entry, so the two readers ask one
    question of one carrier. A row this hook cannot read is not a row that
    matches: an unreadable capture is named on stderr and stops the advance,
    because *cannot tell* is not *this question answered the gate*.
    """
    cap = run_dir / f"terrain{CAPTURE_SUFFIX}"
    if not cap.is_file():
        return False
    try:
        with open(cap, encoding="utf-8") as f:
            doc = json.load(f)
    except Exception as exc:                                      # noqa: BLE001
        note(f"the capture at {cap} is unreadable ({exc}); nothing was "
             "advanced, and the gate is re-offered at its next raising")
        return False
    rows = doc.get("rows")
    if not isinstance(rows, list):
        return False
    for row in rows:
        ev = row.get("evidence") if isinstance(row, dict) else None
        if isinstance(ev, dict) and ev.get("tool_use_id") == tool_use_id:
            return True
    return False


def outstanding_pointer(run_dir):
    """The gate this run has open, or None.

    MATCHED ON THE CAPTURE PATH, which is the field a pointer carries naming the
    run it belongs to -- the same key `writeOpenGatePointer` supersedes its own
    previous pointer on. A pointer is a forwarding address and grants nothing, so
    reading one here puts nothing new on the trust surface.

    AND WHERE SEVERAL MATCH, THE NEWEST RAISING IS TAKEN RATHER THAN REFUSED, and
    that is the OPPOSITE arm from `write-gate-capture.py`'s (which writes nothing
    when two pointers carry one question). The two acts differ in what a wrong
    choice costs. That hook writes a durable answer row, so choosing wrong is the
    misattribution the instance nonce exists to prevent. This one only puts BYTES
    on screen, and `gate-open-terrain-gate.py` compares whatever the session then
    sends against the file on disk: a payload chosen from the wrong pointer is
    refused at the equality check, and the reference is unmoved. So refusing here
    would buy nothing and would leave the session with no bytes at all, which is
    the wedge this whole file exists to close.

    NONE IS NOT A FAILURE. An advance that stopped at no gate has no pointer, and
    an unreadable directory is a gate this hook cannot name -- both leave the
    session exactly where it was before, with the executor's own stdout on the
    run record.
    """
    try:
        want = os.path.realpath(str(run_dir / f"terrain{CAPTURE_SUFFIX}"))
    except OSError:
        return None
    gd = open_gate_dir()
    try:
        entries = sorted(gd.iterdir())
    except OSError:
        return None
    mine = []
    for f in entries:
        if f.suffix != ".json":
            continue
        try:
            with open(f, encoding="utf-8") as fh:
                doc = json.load(fh)
        except Exception:                                         # noqa: BLE001
            # An unreadable pointer is the open-gate hook's to report; this
            # reader skips it rather than turning a stray file into a stop.
            continue
        if not isinstance(doc, dict):
            continue
        cap = doc.get("capture_path")
        if not isinstance(cap, str) or os.path.realpath(cap) != want:
            continue
        mine.append(doc)
    if not mine:
        return None
    # `opened_at` is the declaration's own `declared_at`, an ISO-8601 UTC string,
    # so lexical order IS chronological order and no parsing is owed.
    mine.sort(key=lambda d: str(d.get("opened_at") or ""))
    return mine[-1]


def gate_context(pointer):
    """The `additionalContext` block for an outstanding gate.

    THE BYTES, NOT THEIR ADDRESS (kogaki#1081, and kogaki#1057's own ground). A
    path is an instruction to read, and the open-gate interval closes over the
    read -- so a call named and unprinted is one nothing admissible can obtain.
    The gate id and the instance id ride BESIDE the fence rather than inside it,
    because what is fenced has to stay byte-equal to the file.

    AND WHERE NO CALL COULD BE COMPOSED, THE STATED REASON RIDES OUT INSTEAD. The
    pointer carries exactly one of `gate_call_path` and `gate_call_unavailable`,
    and the second is the arm `composeGateCall` takes rather than wedging the
    run; a session told nothing at that gate is left composing from a declaration
    it also cannot read.
    """
    gate_id = pointer.get("gate_id")
    instance = pointer.get("gate_instance_id")
    head = (f"A Terrain gate is open: {gate_id} (raising {instance}).")
    call_path = pointer.get("gate_call_path")
    if isinstance(call_path, str) and call_path:
        try:
            with open(call_path, encoding="utf-8") as f:
                payload = f.read()
        except OSError as exc:
            return (f"{head} Its AskUserQuestion call is at {call_path} and "
                    f"could not be read here ({exc}); no tool is admissible "
                    "inside the open-gate interval, so this gate cannot be "
                    "rendered until the pointer is recovered by hand.")
        return (
            f"{head} Send the payload below as the `AskUserQuestion` "
            "tool_input, byte-for-byte. Nothing is retyped, summarized, "
            "reformatted or pre-selected, and the reading it already carries "
            "stays above the question.\n"
            f"The file it was read from is {call_path}, and that file — not "
            "this copy — is what the PreToolUse equality check compares "
            "against.\n"
            "```json\n" + payload.rstrip("\n") + "\n```\n"
            "While this gate is open, every other tool call is DENIED and the "
            "turn cannot end until the answer is captured (kogaki#1028)."
        )
    reason = pointer.get("gate_call_unavailable")
    return (f"{head} No AskUserQuestion call could be composed for it: "
            f"{reason or 'no reason was recorded on the pointer'}. Render the "
            "declaration's options verbatim, nothing pre-selected, free text "
            "on.")


def emit_context(text):
    """The one channel a PostToolUse hook has to the model.

    Everything else this hook writes -- every `note` above -- reaches stderr and
    stops there. Written as the last act, after the executor's own output, so a
    malformed line can never truncate the payload block.
    """
    json.dump({"hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "additionalContext": text,
    }}, sys.stdout)
    sys.stdout.write("\n")


def main():
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw)
    except Exception:                                             # noqa: BLE001
        return 0
    if payload.get("tool_name") != "AskUserQuestion":
        return 0

    # A question with no answers is an interrupted one, and a question this
    # repository did not raise is answered here every day. Neither is a finding.
    resp = payload.get("tool_response")
    answers = resp.get("answers") if isinstance(resp, dict) else None
    if not isinstance(answers, dict) or not answers:
        return 0
    if not isinstance(payload.get("tool_use_id"), str) or not payload["tool_use_id"]:
        note("the payload carries no tool_use_id, so a transition written from "
             "it would name no question; the executor was not run")
        return 0

    # THE NARROWING, AND IT COSTS ONE FILE TEST (PR #1034 round 1, finding 1).
    #
    # This hook fires on every AskUserQuestion carrying answers, and most of
    # them are not Terrain gates. The first cut spawned `node terrain.mjs run`
    # for each one, which on the default branch minted a terrain workspace,
    # PRUNED the lane to keep-last on the way in, and read the gateway -- real
    # cost, and lane churn, paid by questions this hook is not for.
    #
    # An open Terrain run is exactly the precondition for an advance, and its
    # pointer is a file. No pointer, no open run, nothing to advance: return
    # before the subprocess rather than after it.
    root = repo_root()
    pointer = Path(os.environ["KOGAKI_OPEN_RUN"]) if os.environ.get("KOGAKI_OPEN_RUN") \
        else root.joinpath(*LANE_POINTER)
    if not os.environ.get(RUN_DIR_ENV) and not pointer.exists():
        return 0

    # THE SECOND NARROWING, AND IT IS THE ONE THAT MAKES THE FIRST HONEST
    # (kogaki#1075). An open-run pointer says a run exists; it does not say that
    # THIS question is the one that answered its gate. So while a run stayed
    # open, every question in every session rooted at this tree advanced it --
    # a cleanup plan, a filing gate, a review grant -- and the executor then
    # read whatever capture the gate had last received and moved. On
    # 2026-09-10 that walked a parked run through two states and three failed
    # judgments from a `/ship-cycle` cleanup question in another session. The
    # attribution written was correct in form and wrong in fact: the transition
    # named a `tool_use_id` that answered a different question.
    #
    # THE PRECONDITION IS THE CAPTURE ROW, NOT THE POINTER. `write-gate-capture.py`
    # runs before this hook and writes a row only for the question the gate
    # declared and only under the pointer's own session -- so a row carrying
    # this payload's `tool_use_id` is exactly the evidence that this question
    # was that gate's. Reading it costs one file read, and no question that
    # produced no row costs a subprocess.
    #
    # SILENT ON THE ORDINARY MISS. A question this repository did not raise is
    # answered here every day, and a note on each would be noise on the one
    # path this hook is on for every question in the session.
    run_dir = resolve_run_dir(pointer)
    if run_dir is None:
        return 0
    if not capture_names(run_dir, payload["tool_use_id"]):
        return 0

    executor = root / "src" / "terrain.mjs"
    if not executor.exists():
        note(f"{executor} does not exist; nothing was advanced")
        return 0

    # NO `--run-dir` IS PASSED. The executor resolves the open-run pointer
    # itself, so there is one reader of run identity rather than two that can
    # disagree; `KOGAKI_RUN_DIR` still reaches it through the environment, which
    # is inherited by the child.
    cmd = ["node", str(executor), "run"]

    try:
        # THE PAYLOAD GOES IN VERBATIM. `input=raw` rather than a re-serialised
        # dict: a round trip through this process is a chance for a field to
        # change shape, and the executor's attribution is supposed to be a copy.
        proc = subprocess.run(cmd, input=raw, capture_output=True, text=True,
                              timeout=ADVANCE_TIMEOUT_S, cwd=str(root))
    except subprocess.TimeoutExpired:
        note(f"the advance exceeded {ADVANCE_TIMEOUT_S}s and was stopped; the "
             "run record holds whatever transitions completed before that, and "
             "the gate is re-offered at the next raising")
        return 0
    except Exception as exc:                                      # noqa: BLE001
        note(f"the executor could not be run ({exc}); nothing was advanced")
        return 0

    if proc.returncode != 0:
        # NOT A FINDING BY ITSELF. The executor refuses for reasons the owner
        # acts on -- an unrouted option, an answer the harness did not record --
        # and its refusal is the message. Relaying it is all this hook can do.
        note("the executor refused this advance:\n" + (proc.stderr or "").strip())

    # THE GATE THIS ADVANCE OPENED, DELIVERED (kogaki#1081). Read AFTER the
    # executor and on EVERY exit code: a non-zero exit is the executor's account
    # of where it stopped, and a gate it raised before stopping is still a gate
    # the session must render. The pointer is the evidence that one is open, and
    # its absence -- an advance that reached a non-gate wait, or `done` -- is
    # exactly the case that emits no `additionalContext` at all.
    pointer = outstanding_pointer(run_dir)
    if pointer is not None:
        emit_context(gate_context(pointer))
    return 0


if __name__ == "__main__":
    sys.exit(main())
