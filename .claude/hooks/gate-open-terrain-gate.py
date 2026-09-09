#!/usr/bin/env python3
"""While a Terrain gate is open, the only admissible act is the question the
Harness wrote (kogaki#1028).

Design and licence: kogaki#1028. Contract: specs/spec-gate-carrier/SPEC.md.
Read them there -- this file restates neither.

THE EVENT THIS EXISTS FOR. On 2026-09-09, with the tag gate open, the session
called two MCP tools, wrote an emission file, declined to render the gate, and
answered the typed tag "agents" by calling `ListAgents`. Nothing refused any of
it. The gate was a declaration on disk and an instruction in prose, and a
session that simply did something else was indistinguishable, at every carrier,
from one that had not reached the gate yet.

SO THE GATE IS AN INTERVAL, NOT A MESSAGE. Between the executor writing the
open-gate pointer and the harness writing the capture row, exactly one act is
admissible: sending the `AskUserQuestion` payload the executor already composed
into `gate-call.json`. This file makes that interval real at three events:

  PreToolUse        deny every tool call that is not that exact payload
  Stop              refuse to end the turn until the capture row exists
  UserPromptSubmit  refuse a typed prompt, because typed text is never an answer

WHY ALL THREE, AND WHY NONE ALONE. PreToolUse alone leaves the session free to
say something and stop, which is the same outcome by another route -- the gate
unrendered and the run silently abandoned. Stop alone leaves it free to do
twenty other things first. UserPromptSubmit is the third: an owner who types
the answer instead of clicking it produces text the model reads and could
re-transcribe, and a re-transcribed answer is the model's account of the
owner's, which is the class `write-gate-capture.py` exists to close. The
owner's answer enters through the question's own free-text row and is written by
PostToolUse under the pointer's `gate_instance_id`, or it does not enter.

AND THE INTERVAL ONCE CLOSED OVER ITS OWN OPENING (kogaki#1051). On 2026-09-09
at 13:01 UTC the owner typed `/terrain` in two sessions. The skill's `!` line
ran first and opened the gate at 13:01:50.331; the harness ran UserPromptSubmit
on that same prompt 133ms later; the arm below refused it as typed text at an
open gate; and the session ended the turn with no model call at all -- one
system line, zero usage, and no Stop hook, because no turn ran. Every later
prompt was refused the same way. THE RECOVERY WAS FROM OUTSIDE THE SESSION: the
pointers were moved out of `~/.claude/kogaki-open-gates/` by hand, which is not
a recovery this file offers and not one a session can perform. A gate whose
only admissible act is unreachable is a wedged run, and the fix is the
`skill-expansion` mark below, not a wider refusal.

SCOPED TO THIS SESSION, ALWAYS. A pointer names the session that opened it. A
machine runs several sessions, and a deny keyed on "some pointer exists" would
freeze every session on the machine because one of them is at a gate -- which is
the fail-closed refusal that relocates the choice rather than preventing
anything. A pointer with no `session_id` is a pre-kogaki#1028 pointer or a run
started outside a session: it is matched to NO session rather than to every one.

FAILS OPEN ON AN UNREADABLE PAYLOAD, AND THAT IS THE OPPOSITE OF
`gate-terrain-executor.py`. That hook closes a route to an act that must never
happen, so an unreadable payload leaves the prohibition standing. This one holds
a session inside an interval, and a bug here with the other polarity denies
every tool call in every session on the machine with no way to type the fix. The
cost of failing open is that one gate goes unenforced and its run refuses at
re-entry, which is the recoverable direction.
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# The one tool that may run while a gate is open.
GATE_TOOL = "AskUserQuestion"

# THE HARNESS'S OWN BOUND ON Stop BLOCKING, STATED RATHER THAN HIDDEN. Claude
# Code stops honouring a Stop-hook block after eight consecutive blocks and lets
# the turn end. That is not a number this hook can change, so what it does
# instead is write it onto the run record beside the failure -- a run that ended
# with the gate unrendered says so, and says how it got past the block.
STOP_BLOCK_BOUND = 8

# THE SAME EXPIRY THE CAPTURE READS (PR #1043 round 3, finding 4). The two
# readers of one pointer schema disagreed: `write-gate-capture.py` reaps a
# pointer older than its `POINTER_TTL` and refuses to write for it, while this
# hook read no expiry at all -- so a pointer past its TTL still denied every
# tool call for its session, and the only way out was to send the gate
# question so PostToolUse could reap it. The value is copied rather than
# imported because a hook is one file the harness runs by path; the sibling's
# constant is the one to change alongside this.
POINTER_TTL = timedelta(hours=12)


def expired(pointer):
    """Is this pointer past the TTL the capture hook reaps at?

    An unreadable timestamp is NOT expired, for the sibling's reason: reaping
    on a field this hook failed to parse would drop live gates on a formatting
    change, which is the expensive direction of this trade.
    """
    opened = pointer.get("opened_at")
    try:
        when = datetime.fromisoformat(str(opened).replace("Z", "+00:00"))
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
    except Exception:                                             # noqa: BLE001
        return False
    return datetime.now(timezone.utc) - when > POINTER_TTL


def pointer_dir():
    return Path(os.environ.get("KOGAKI_OPEN_GATES")
                or os.path.expanduser("~/.claude/kogaki-open-gates"))


def note(msg):
    print(f"gate-open-terrain-gate: {msg}", file=sys.stderr)


def canonical(obj):
    """The comparison form for a tool_input.

    Sorted keys and no separator whitespace, so a payload that differs only in
    key order or formatting is the same payload -- and one that differs in a
    label, a description, an option's position within the list, or a byte of the
    tag table is not. Option ORDER is deliberately significant: the list is
    ordered in the declaration and a reordered question is a different question
    to the person reading it.
    """
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def open_pointers(session_id):
    """Every live pointer belonging to THIS session.

    Unreadable pointers are reported and skipped rather than treated as open: a
    file this hook cannot parse names no session, and denying on it would be a
    deny nobody can clear.
    """
    d = pointer_dir()
    if not d.is_dir():
        return []
    out = []
    for p in sorted(d.glob("*.json")):
        try:
            with open(p, encoding="utf-8") as f:
                doc = json.load(f)
        except Exception:                                         # noqa: BLE001
            note(f"pointer {p.name} is unreadable and was skipped")
            continue
        # STRICT ON BOTH SIDES, and the same rule `write-gate-capture.py` uses.
        # An empty id on either side matches nothing: a pointer that never
        # learned its session must not gate every session on the machine, and a
        # payload without one must not be gated by a pointer it cannot be shown
        # to own.
        mine = str(doc.get("session_id") or "")
        theirs = str(session_id or "")
        if not mine or not theirs or mine != theirs:
            continue
        if expired(doc):
            note(f"pointer {p.name} is past its {POINTER_TTL} TTL and gates nothing; "
                 f"the capture hook reaps it at the next raising")
            continue
        doc["_pointer_path"] = p
        out.append(doc)
    return out


def has_capture(pointer):
    """Has the harness already written this raising's row?

    Read from the capture the pointer names, matched on the instance id. The
    pointer is normally REMOVED by `write-gate-capture.py` the moment it writes,
    so this is the belt to that braces: a row written where the pointer could
    not be unlinked must not hold the turn open forever.
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


def expected_call(pointer):
    """The byte-fixed payload for this gate, or None where none was composed."""
    path = pointer.get("gate_call_path")
    if not path:
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:                                      # noqa: BLE001
        note(f"gate call {path} is unreadable ({exc}); the question is admitted "
             "unchecked rather than denied — there is nothing to compare against")
        return None


def gate_line(pointer):
    return (f"{pointer.get('gate_id')} (instance {pointer.get('gate_instance_id')}), "
            f"declared at {pointer.get('opened_at')}")


# --------------------------------------------------------------------------
# THE PROMPT THAT OPENED THE GATE (kogaki#1051)
#
# THE ORDER THE INTERVAL DESIGN ASSUMED IS REVERSED FOR THE START ACT. The
# interval was designed around a pointer a model turn opens, with the owner's
# typed text arriving later -- and there, typed text is never an answer. The
# terrain skill's `!` line runs BEFORE the harness runs UserPromptSubmit on the
# prompt that invoked the skill, so for the start act the gate is already open
# when the prompt that opened it is judged, and the arm below refused it.
#
# So the mark, and the one thing it says. `skill-expansion` on a pointer says
# no model turn can yet have run for it: the start act wrote it during the
# expansion of the prompt now being judged. A prompt is admitted for exactly
# that state, and for nothing else -- the first PreToolUse event of the session,
# or the Stop ending a turn that called no tool, is evidence a turn ran, and it
# stamps `turn_seen_at`, after which the arm refuses as before. Both sources are
# named because one alone leaves a turn shape unspent: PreToolUse never fires
# for a text-only turn, and Stop fires too late for a turn that goes on to act.
#
# THE MARK IS STAMPED, NOT ERASED. Clearing `opened_by` itself would also erase
# WHICH executor opened the gate, which is the provenance the field was added to
# carry; a second field says the same thing without spending the first.

SKILL_EXPANSION = "skill-expansion"


def unturned(pointer):
    """Opened by the skill's `!` line, with no model turn seen since?"""
    return pointer.get("opened_by") == SKILL_EXPANSION and not pointer.get("turn_seen_at")


def stamp_turn_seen(pointer):
    """Record that a turn has run for this pointer.

    CALLED FROM TWO ARMS, because no single event sees every turn shape: the
    first tool call (`pre_tool_use`), and the Stop that ends a turn which
    called none (`stop`). The write is idempotent under `unturned`, so a turn
    reaching both spends the mark once.

    THIS HOOK IS WHERE IT LANDS BECAUSE THIS HOOK IS WHAT SEES EVERY TOOL. The
    sibling `gate-terrain-executor.py` is a PreToolUse hook too, but it is
    matched to the Bash commands naming the executor; only this one asks for
    `"*"`, and a mark cleared by the first *Bash* call would leave a session
    that rendered the question first still marked.

    A failure to write is reported and not raised. The cost is one pointer that
    keeps admitting prompts for its session until the gate is answered -- the
    open direction, which is this file's polarity throughout.
    """
    path = pointer.get("_pointer_path")
    if path is None:
        return
    try:
        with open(path, encoding="utf-8") as f:
            doc = json.load(f)
        doc["turn_seen_at"] = datetime.now(timezone.utc).isoformat()
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=2)
            f.write("\n")
    except Exception as exc:                                      # noqa: BLE001
        note(f"pointer {getattr(path, 'name', path)} could not be stamped as "
             f"having seen a turn ({exc}); a typed prompt stays admitted for it")


# --------------------------------------------------------------------------
# PreToolUse

def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))


def pre_tool_use(payload, pointers):
    tool = payload.get("tool_name")
    # THE SAME FILTER THE OTHER TWO EVENTS APPLY (PR #1043 round 3, finding 3).
    # A row written where the pointer could not be unlinked must not deny every
    # tool call in the session until someone removes the file from outside it.
    outstanding = [p for p in pointers if not has_capture(p)]
    if not outstanding:
        return 0
    # A TOOL CALL IS THE EVIDENCE A TURN RAN (kogaki#1051), and it is evidence
    # whether or not the call is admitted below -- a denied call is still a turn
    # that saw the gate. Stamped before the decision for exactly that reason.
    for p in outstanding:
        if unturned(p):
            stamp_turn_seen(p)
    pointer = outstanding[0]
    where = gate_line(pointer)
    if tool != GATE_TOOL:
        deny(
            f"A Terrain gate is OPEN for this session — {where} — and while it is "
            f"open the only admissible act is the one question the Harness wrote "
            f"(kogaki#1028).\n\n"
            f"`{tool}` is not that act, and no tool is exempt: MCP tools, "
            f"ListAgents, Bash, Write and Edit are all refused here.\n\n"
            f"Send the payload at {pointer.get('gate_call_path') or '(none composed — see the pointer)'} "
            f"as an {GATE_TOOL} tool_input, byte-for-byte. The turn cannot end and "
            f"a typed prompt is not admitted until the owner has answered."
        )
        return 0
    want = expected_call(pointer)
    if want is None:
        # Nothing byte-fixed to compare against. The exclusivity still held --
        # every other tool was denied above -- and the question itself rides
        # through, because a deny here would leave the session no admissible act
        # at all.
        return 0
    got = payload.get("tool_input") or {}
    if canonical(got) == canonical(want):
        return 0
    deny(
        f"This {GATE_TOOL} call is not the question the Harness wrote for the open "
        f"gate — {where} (kogaki#1028).\n\n"
        f"The payload is composed by the executor and written to "
        f"{pointer.get('gate_call_path')}. Send that file's contents as the "
        f"tool_input with nothing added, dropped, reordered or reworded — the "
        f"reading (`tag_listing`) is already inside the question text, and a table "
        f"that arrives missing or paraphrased is exactly what this compares for."
    )
    return 0


# --------------------------------------------------------------------------
# Stop

def record_unrendered(pointer, blocks):
    """Mark the run failed on its own record, at the moment the bound is spent.

    WRITTEN ONCE, AND BESIDE THE RUN rather than in a ledger of this hook's own:
    the run record is what a later pass reads, and a gate that went unrendered is
    a property of the run and not of the hook that noticed. The bound is written
    down with it, because a record saying "failed" without saying that the
    harness stopped honouring the block reads as though something chose to
    proceed.
    """
    decl = pointer.get("declaration_path")
    if not decl:
        return
    rec = Path(decl).parent / "run-record.json"
    try:
        with open(rec, encoding="utf-8") as f:
            doc = json.load(f)
    except Exception:                                             # noqa: BLE001
        note(f"no readable run record beside {decl}; the gate-unrendered failure "
             "could not be recorded, and the absence of a capture row is still "
             "the refusal the executor raises at re-entry")
        return
    if doc.get("failure", {}).get("cause") == "gate-unrendered":
        return
    doc["failure"] = {
        "cause": "gate-unrendered",
        "gate_id": pointer.get("gate_id"),
        "gate_instance_id": pointer.get("gate_instance_id"),
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "note": (f"The turn ended with this gate open and no capture row. The Stop "
                 f"hook blocked, and the harness stops honouring a Stop block after "
                 f"{blocks} consecutive blocks — so the turn ended on the harness's "
                 f"override, not on an answer."),
    }
    try:
        with open(rec, "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=2)
            f.write("\n")
    except Exception as exc:                                      # noqa: BLE001
        note(f"run record {rec} could not be written ({exc})")


def stop(payload, pointers):
    outstanding = [p for p in pointers if not has_capture(p)]
    if not outstanding:
        return 0
    # A STOP IS EVIDENCE A TURN RAN, and for a turn that called no tool it is
    # the ONLY such evidence. `pre_tool_use` stamps at the first tool call, so
    # a turn emitting text alone never reaches it: the block below fires,
    # writes nothing to the pointer, and `unturned` stays true -- which keeps
    # `user_prompt_submit` admitting typed text for this session until
    # POINTER_TTL reaps the pointer, and leaves a run recorded
    # `gate-unrendered` beside a pointer still claiming no turn has run.
    # Stamping here closes that; with both sites every turn shape spends the
    # mark exactly once, and the stamp precedes the block so it lands on the
    # turn that earned it rather than the next one.
    for p in outstanding:
        if unturned(p):
            stamp_turn_seen(p)
    pointer = outstanding[0]
    if payload.get("stop_hook_active"):
        record_unrendered(pointer, STOP_BLOCK_BOUND)
    print(json.dumps({
        "decision": "block",
        "reason": (
            f"A Terrain gate is OPEN for this session — {gate_line(pointer)} — and "
            f"the owner has not answered it (kogaki#1028).\n\n"
            f"The turn does not end here. Send the payload at "
            f"{pointer.get('gate_call_path') or '(none composed — see the pointer)'} "
            f"as an {GATE_TOOL} tool_input, byte-for-byte, and let the owner answer. "
            f"The harness stops honouring this block after {STOP_BLOCK_BOUND} "
            f"consecutive blocks; the run is then recorded `gate-unrendered` and "
            f"failed."
        ),
    }))
    return 0


# --------------------------------------------------------------------------
# UserPromptSubmit

def user_prompt_submit(payload, pointers):
    outstanding = [p for p in pointers if not has_capture(p)]
    if not outstanding:
        return 0
    # THE PROMPT THAT OPENED THE GATE RIDES THROUGH (kogaki#1051). Only where
    # EVERY outstanding pointer is one no turn has run for: an unmarked pointer
    # beside a marked one is a gate this session was already asked to render,
    # and admitting the prompt would admit typed text at that gate too.
    if all(unturned(p) for p in outstanding):
        return 0
    pointer = outstanding[0]
    print(json.dumps({
        "decision": "block",
        "reason": (
            f"A Terrain gate is OPEN — {gate_line(pointer)} — and typed text is "
            f"never an answer to it (kogaki#1028).\n\n"
            f"The owner's answer enters through the question's own free-text row, "
            f"where the harness writes it under this gate's instance id. A prompt "
            f"read from the transcript would be the model's transcription of the "
            f"owner's words, which is the substitution the gate carrier exists to "
            f"prevent.\n\n"
            f"Render the question first: send "
            f"{pointer.get('gate_call_path') or 'the declaration'} as an "
            f"{GATE_TOOL} tool_input."
        ),
    }))
    return 0


HANDLERS = {
    "PreToolUse": pre_tool_use,
    "Stop": stop,
    "UserPromptSubmit": user_prompt_submit,
}


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:                                             # noqa: BLE001
        # FAILS OPEN, per the docstring. See there for why this polarity is the
        # opposite of `gate-terrain-executor.py`'s and why that is deliberate.
        note("the payload could not be read; no gate was enforced for it")
        return 0
    event = payload.get("hook_event_name") or (sys.argv[1] if len(sys.argv) > 1 else None)
    handler = HANDLERS.get(event)
    if handler is None:
        return 0
    pointers = open_pointers(payload.get("session_id"))
    if not pointers:
        return 0
    try:
        return handler(payload, pointers) or 0
    except Exception as exc:                                      # noqa: BLE001
        note(f"failed while handling {event} ({exc}); nothing was enforced")
        return 0


if __name__ == "__main__":
    sys.exit(main())
