#!/usr/bin/env python3
"""PostToolUse: the Brief executor's advance, executed by the harness.

Design and licence: kogaki#1108, acceptance item 2. THE SIBLING IS
`.claude/hooks/advance-terrain.py` AND THIS IS ITS SECOND LANE, not a variant of
it: same structure, same two narrowings, same delivery point, same constants,
with the lane, the capture prefix, the run-directory variables and the executor
path changed and nothing else.

WHY A SECOND FILE RATHER THAN ONE HOOK TAKING A LANE ARGUMENT. A hook is one file
the harness runs by path, with no module to import from -- the ground on which
every constant in it is already a declared copy. A lane-parameterised hook would
have to carry its lane in the registration string, so the two lanes' wiring would
differ only in an argument that nothing reads back: a mis-typed lane would
silently narrow to a pointer that never exists and the advance would simply never
happen, which is the failure mode with no report. Two files fail loudly instead,
each naming its own executor.

WHAT THIS IS. The advance after a gate answer. `write-gate-capture.py` writes the
owner's answer from this same payload; this hook then RUNS the executor, which
reads that answer and advances to the next wait or to `done`. The model performs
neither act.

ORDER MATTERS, and it is the family table's rather than this file's.
`write-gate-capture.py` is registered before this hook, so the row exists by the
time this hook reads for it. That order is load-bearing rather than merely
convenient: the row is this hook's own PRECONDITION.

AND THE ADVANCE IS KEYED TO THAT ROW, NOT TO THE POINTER. An open-run pointer
says a run exists; it does not say this question is the one that answered its
gate. See `main` for what that cost in the Terrain lane and what the key is.

THE PAYLOAD IS FORWARDED, NOT SUMMARISED. The executor is handed this hook's own
payload on stdin, verbatim, and copies `hook_event_name`, `session_id` and
`tool_use_id` out of it into every transition it writes.

THE TIMEOUT IS DECLARED RATHER THAN INHERITED, and its derivation is this lane's
own rather than the sibling's -- see `ADVANCE_TIMEOUT_S` below.
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# The bound on one advance, in seconds, DECLARED (item 3), set BELOW the harness's
# own default (PR #1034 round 1, finding 3), and since kogaki#1062 item 4 DERIVED
# FROM MEASUREMENT rather than from the budget above it.
#
# THE NUMBER IS UNCHANGED AT 480 AND ITS GROUND IS NOT. The first cut used 600,
# the harness's hook default -- so it could never fire first: the hook starts
# before the subprocess, the harness kills the hook at ~600s, and the
# half-finished record this file's docstring names is reached by the same path as
# before. A bound that cannot fire is not a bound. 480 was then kept for two
# minutes of relay margin and for a six-call worst case that nobody had measured.
# The measurement arrived on 2026-09-10 and it supports the same number for a
# different reason, which is why this block is rewritten rather than the constant.
#
# THE BOUND, AND ITS DERIVATION IS THIS LANE'S OWN (kogaki#1108). It is the same
# NUMBER as the Terrain lane's and a different ARGUMENT, which is worth stating
# because a copied constant with a borrowed ground is a number nobody owns.
#
# WHAT AN ADVANCE IN THIS FLOW COSTS. Two advances cross judgment states. The one
# after `THESIS_ADOPTION` crosses `mint`, `compose_path`, `review_path`,
# `attach_review` and `assemble_candidates` -- TWO judge calls, each bounded at
# the table's `timeout_s` of 180s, so 360s of judge time plus a handful of file
# writes. The one after `CANDIDATE_SELECTION` crosses `judge_specialization` and
# `adopt_candidate` -- ONE judge call, 180s. Neither state declares `per_group`,
# so there is no fan-out and no sum hiding between the per-call bound and this
# one: the worst case is 360s and it is reached by addition of two declared
# bounds rather than by measurement of a variable-width loop.
#
# AND THE CEILING IS THE RELAY, NOT THE WORK. 480 must stay far enough below the
# harness's 600s default for the relay note below to be written, which is the
# whole reason a child bound exists here; 120s is that margin. So the bound is
# squeezed from both sides exactly as the sibling's is -- 360s of declared judge
# time beneath it, 120s of relay margin above it -- and the two lanes arriving at
# one number from two derivations is a coincidence this comment records rather
# than an inheritance.
#
# THE HOOK'S OWN TIMEOUT lives in the machine-local registration this repository
# deliberately does not commit. What is declarable here is the CHILD's, and the
# constant is what tells an installer what "above" means.
ADVANCE_TIMEOUT_S = 480

# The open-run pointer the start act writes, read here for the SAME reason the
# executor reads it: an advance is an advance OF a run, and a hook that spawned
# the executor without one would mint a fresh workspace per question. Its
# absence is also this hook's narrowing -- see `main`.
LANE_POINTER = ("runs", "brief", "open-run")

# The run workspace this advance belongs to. `KOGAKI_RUN_DIR` is the executor's
# own variable and is honoured here so a hook and a run agree about which
# workspace they are in; with neither, the executor resolves the open-run
# pointer above.
RUN_DIR_ENV = "KOGAKI_BRIEF_RUN_DIR"

# The capture file's suffix, `src/gate-schema.json`'s `capture.suffix`, copied
# here on the same ground `write-gate-capture.py` copies `POINTER_TTL`: a hook
# is one file with no module to import. `checks/check-terrain-hook-invocation.sh`
# compares this constant against the schema rather than trusting the two to
# agree by reading, and it reads THIS file's copy too (kogaki#1108).
CAPTURE_SUFFIX = ".gate-capture.json"

# The open-gate pointer directory, the executor's own `openGateDir()`, copied
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

# THE THIRD COPY OF ONE CONSTANT, and it is copied for the reason the second
# was: a hook is one file the harness runs by path, with no module to import
# from. `write-gate-capture.py` reaps a pointer older than this and
# `gate-open-terrain-gate.py` gates nothing on one -- so a reader here that
# read no expiry would deliver a payload for a raising both siblings have
# already written off. Change it in all three or in none.
POINTER_TTL = timedelta(hours=12)


def open_gate_dir():
    env = os.environ.get(OPEN_GATES_ENV)
    if env:
        return Path(env)
    return Path.home() / ".claude" / "kogaki-open-gates"


def note(msg):
    print(f"advance-brief: {msg}", file=sys.stderr)


def repo_root():
    """The repository this hook was installed beside.

    Resolved from this file's own location rather than from the cwd, for
    the executor's own reason: it must not depend on the directory a
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
    the suffix and the executor composes the path as its LANE + it -- `brief`
    here, `terrain` in the sibling, which is what keeps two concurrent runs of
    two flows from reading each other's answers; the
    constant is copied here for the reason `POINTER_TTL` is copied into the
    capture hook -- a hook is one file, with no module to share.

    THE MATCH IS ON `evidence.tool_use_id`, which is the field
    `write-gate-capture.py` copies out of the harness's own payload and the
    field the executor reads back at its re-entry, so the two readers ask one
    question of one carrier. A row this hook cannot read is not a row that
    matches: an unreadable capture is named on stderr and stops the advance,
    because *cannot tell* is not *this question answered the gate*.
    """
    cap = run_dir / f"brief{CAPTURE_SUFFIX}"
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


def pointer_expired(pointer):
    """Is this pointer past the TTL the capture hook reaps at?

    An unreadable timestamp is NOT expired, which is the sibling's arm and its
    reason: reaping on a field this reader failed to parse would drop live gates
    on a formatting change.
    """
    try:
        when = datetime.fromisoformat(
            str(pointer.get("opened_at")).replace("Z", "+00:00"))
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
    except Exception:                                             # noqa: BLE001
        return False
    return datetime.now(timezone.utc) - when > POINTER_TTL


def pointer_answered(pointer):
    """Has the harness already written this raising's row?

    `gate-open-terrain-gate.py`'s `has_capture` -- that hook is lane-agnostic
    and gates both flows' gates -- copied here because a hook has
    no module to share one from. The pointer is normally REMOVED by
    `write-gate-capture.py` the moment it writes the row -- but that hook has a
    named arm where the write succeeds and the unlink FAILS, and after such a
    miss an advance reaching `done` or a non-gate wait leaves the ANSWERED
    pointer as the only match here. Delivering it would announce a gate for a
    question already answered, while the open-gate hook -- which filters exactly
    this -- denies nothing and lets the re-ask through (PR #1082 round 1).
    """
    cap = pointer.get("capture_path")
    if not cap:
        return False
    try:
        with open(cap, encoding="utf-8") as f:
            doc = json.load(f)
    except Exception:                                             # noqa: BLE001
        return False
    for row in doc.get("rows") or []:
        if str(row.get("gate_instance_id")) == str(pointer.get("gate_instance_id")):
            return True
    return False


def outstanding_pointer(run_dir):
    """The gate this run has open, or None.

    MATCHED ON THE CAPTURE PATH, which is the field a pointer carries naming the
    run it belongs to -- the same key `writeOpenGatePointer` supersedes its own
    previous pointer on. A pointer is a forwarding address and grants nothing, so
    reading one here puts nothing new on the trust surface.

    AND WHERE SEVERAL MATCH, THE ONE THE OPEN-GATE HOOK WILL COMPARE AGAINST IS
    TAKEN -- not the newest, and that is the whole point (PR #1082 round 1).
    `pre_tool_use` there takes `outstanding[0]` of `sorted(dir.glob("*.json"))`,
    which is instance-nonce FILENAME order, after dropping pointers that are
    expired or already answered. A reader here keyed on `opened_at` can select a
    different file, and then a session that sends these bytes byte-for-byte is
    DENIED for sending "not the question the Harness wrote" -- the wedge this
    file exists to close, arriving through the repair. So the three filters and
    the order are the sibling's, copied deliberately: the delivered payload is
    by construction the one the equality check compares against.

    THE SESSION FILTER IS THE ONE THIS READER DOES NOT APPLY, and its absence is
    stated rather than left to look like an oversight. The sibling narrows to
    pointers naming the payload's own session because it DENIES on them, and
    gating a session that cannot be shown to own the gate is the failure with no
    recovery inside it. This reader only puts bytes on screen for the advance it
    just ran; a pointer naming another session is one the open-gate hook gates
    nothing on, so delivering it costs a paragraph and never an admissible act.

    NONE IS NOT A FAILURE. An advance that stopped at no gate has no pointer, and
    an unreadable directory is a gate this hook cannot name -- both leave the
    session exactly where it was before, with the executor's own stdout on the
    run record.
    """
    try:
        want = os.path.realpath(str(run_dir / f"brief{CAPTURE_SUFFIX}"))
    except OSError:
        return None
    try:
        entries = sorted(open_gate_dir().glob("*.json"))
    except OSError:
        return None
    for f in entries:
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
        if pointer_expired(doc) or pointer_answered(doc):
            continue
        return doc
    return None


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
    head = (f"A Brief gate is open: {gate_id} (raising {instance}).")
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


def refusal_context(text):
    """The executor's refusal, on the one channel that reaches the session.

    A REFUSAL RAISED INSIDE AN ADVANCE REACHED NOBODY (kogaki#1085). `note`
    writes to stderr, and a PostToolUse hook's stderr reaches the transcript
    nowhere -- so an advance that ended a run ended it silently, and the
    session's only reading was a run record naming one state fewer than it
    expected. kogaki#1081 opened `additionalContext` for gate payloads; this
    puts the refusal there beside them.

    IT IS RELAYED, NEVER INTERPRETED. The executor's stderr is the message, and
    the empty case is stated rather than dropped: an exit code with no text is
    itself the only thing there is to say.
    """
    body = text.strip() or ("the executor exited non-zero and wrote nothing to "
                            "stderr")
    return ("The Brief advance was refused by the executor; nothing further "
            "was advanced. Its refusal, verbatim:\n"
            "```\n" + body + "\n```")


def emit_context(text):
    """The one channel a PostToolUse hook has to the model.

    Everything else this hook writes -- every `note` above -- reaches stderr and
    stops there, which is why an executor refusal is relayed through here as
    well (kogaki#1085) rather than through the `note` that reports it. Written
    as the last act, after the executor's own output, so a malformed line can
    never truncate the payload block.
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
    # them are not Brief gates. The first cut spawned `node brief.mjs run`
    # for each one, which on the default branch minted a brief workspace,
    # PRUNED the lane to keep-last on the way in, and read the gateway -- real
    # cost, and lane churn, paid by questions this hook is not for.
    #
    # An open Brief run is exactly the precondition for an advance, and its
    # pointer is a file. No pointer, no open run, nothing to advance: return
    # before the subprocess rather than after it.
    root = repo_root()
    pointer = Path(os.environ["KOGAKI_BRIEF_OPEN_RUN"]) if os.environ.get("KOGAKI_BRIEF_OPEN_RUN") \
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

    executor = root / "src" / "brief.mjs"
    if not executor.exists():
        note(f"{executor} does not exist; nothing was advanced")
        return 0

    # NO `--run-dir` IS PASSED. The executor resolves the open-run pointer
    # itself, so there is one reader of run identity rather than two that can
    # disagree; `KOGAKI_RUN_DIR` still reaches it through the environment, which
    # is inherited by the child.
    cmd = ["node", str(executor), "run"]

    # THE DELIVERY IS ONE POINT AND EVERY POST-SPAWN EXIT PASSES THROUGH IT
    # (kogaki#1081, PR #1082 round 1). The first cut read the pointer on the two
    # `returncode` arms and returned above it on the other two -- so an executor
    # killed at ADVANCE_TIMEOUT_S *after* `emitGateDeclaration` had written the
    # call and the pointer left precisely the state this file exists to deliver,
    # undelivered, with its only note on the stderr this issue is about. `try`
    # around the spawn and the delivery in `finally` is what makes "on every exit
    # code" a property of where the read STANDS rather than of remembering to
    # repeat it on each arm.
    # THE REFUSAL IS HELD FOR THE DELIVERY POINT rather than emitted where it is
    # read (kogaki#1085): the `finally` below is the one place every post-spawn
    # exit passes through, and a gate payload and a refusal can both be
    # outstanding at once.
    refusal = None
    try:
        try:
            # THE PAYLOAD GOES IN VERBATIM. `input=raw` rather than a
            # re-serialised dict: a round trip through this process is a chance
            # for a field to change shape, and the executor's attribution is
            # supposed to be a copy.
            proc = subprocess.run(cmd, input=raw, capture_output=True, text=True,
                                  timeout=ADVANCE_TIMEOUT_S, cwd=str(root))
        except subprocess.TimeoutExpired:
            note(f"the advance exceeded {ADVANCE_TIMEOUT_S}s and was stopped; the "
                 "run record holds whatever transitions completed before that, and "
                 "the gate is re-offered at the next raising")
            return 0
        except Exception as exc:                                  # noqa: BLE001
            note(f"the executor could not be run ({exc}); nothing was advanced")
            return 0

        if proc.returncode != 0:
            # NOT A FINDING BY ITSELF. The executor refuses for reasons the owner
            # acts on -- an unrouted option, an answer the harness did not
            # record -- and its refusal is the message. Relaying it is all this
            # hook can do.
            refusal = (proc.stderr or "").strip()
            note("the executor refused this advance:\n" + refusal)
        return 0
    finally:
        # The pointer is the evidence a gate is open, and its absence -- an
        # advance that reached a non-gate wait, or `done`, or that never got far
        # enough to raise one -- emits no gate block. WITH NO REFUSAL BESIDE IT
        # that is the case that emits no `additionalContext` at all
        # (kogaki#1085); a refused advance with no gate open still speaks, which
        # is the whole repair. Written last, after the executor's own output, so
        # nothing can truncate the payload block.
        pointer = outstanding_pointer(run_dir)
        blocks = []
        if refusal is not None:
            blocks.append(refusal_context(refusal))
        if pointer is not None:
            blocks.append(gate_context(pointer))
        if blocks:
            emit_context("\n\n".join(blocks))


if __name__ == "__main__":
    sys.exit(main())
