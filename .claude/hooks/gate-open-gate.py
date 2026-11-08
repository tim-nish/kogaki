#!/usr/bin/env python3
"""While any lane's gate is open, the only admissible act is the question the
Harness wrote (kogaki#1028). Named for no lane: it holds every flow's gate
(kogaki#1741).

PreToolUse denies every tool call that is not that exact payload, byte for byte.
Stop blocks once; on a second Stop the gate is recorded `gate-unrendered` and its
pointer abandoned (kogaki#1199). A pointer gates only the session that opened it.
Fails OPEN on an unreadable payload, unlike gate-executor-invocation.py: a wrong
deny here would freeze every session on the machine. History: kogaki#1051,
#1057, #1081, #1199, #1629, #1740. Contract: specs/spec-gate-carrier/SPEC.md.
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# The one tool that may run while a gate is open.
GATE_TOOL = "AskUserQuestion"

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
    print(f"gate-open-gate: {msg}", file=sys.stderr)


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
    pointer = outstanding[0]
    where = gate_line(pointer)
    if tool != GATE_TOOL:
        deny(
            f"A gate is OPEN for this session — {where} — and while it is "
            f"open the only admissible act is the one question the Harness wrote "
            f"(kogaki#1028).\n\n"
            f"`{tool}` is not that act, and no tool is exempt: MCP tools, "
            f"ListAgents, Bash, Write and Edit are all refused here.\n\n"
            f"Send the payload at {pointer.get('gate_call_path') or '(none composed — see the pointer)'} "
            f"as an {GATE_TOOL} tool_input, byte-for-byte."
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
        f"reading this gate owes the owner (the tag listing, or the composed "
        f"grouping) is already inside the question text, and a reading that "
        f"arrives missing or paraphrased is exactly what this compares for."
    )
    return 0


# --------------------------------------------------------------------------
# An answered raising, re-asked by hand (kogaki#1740)

GATE_CALL_SUFFIX = ".gate-call.json"
RUN_DECLARATION_SUFFIX = ".run-declaration.json"
CAPTURE_SUFFIX = ".gate-capture.json"
RUN_DIR_ENVS = ("KOGAKI_RUN_DIR", "KOGAKI_BRIEF_RUN_DIR")


def run_dirs():
    """Every run directory a gate call can sit in: the pinned ones, then the lanes'."""
    dirs = [Path(os.environ[e]) for e in RUN_DIR_ENVS if os.environ.get(e)]
    runs = Path(__file__).resolve().parents[2] / "runs"
    try:
        dirs += sorted(p for p in runs.glob("*/*") if p.is_dir())
    except OSError:
        pass
    return dirs


def answering_row(run_dir, gate_id):
    """The capture row that already answers this run's current raising of `gate_id`, or None."""
    try:
        with open(run_dir / f"{gate_id}{RUN_DECLARATION_SUFFIX}", encoding="utf-8") as f:
            instance = json.load(f).get("gate_instance_id")
    except Exception:                                             # noqa: BLE001
        return None
    if not instance:
        return None
    for cap in sorted(run_dir.glob(f"*{CAPTURE_SUFFIX}")):
        try:
            with open(cap, encoding="utf-8") as f:
                rows = json.load(f).get("rows") or []
        except Exception:                                         # noqa: BLE001
            continue
        for row in rows:
            if isinstance(row, dict) and str(row.get("gate_instance_id")) == str(instance):
                return row
    return None


def live_pointers_any_session():
    """Every readable, unexpired pointer, whatever session it names."""
    d = pointer_dir()
    out = []
    try:
        paths = sorted(d.glob("*.json")) if d.is_dir() else []
    except OSError:
        return out
    for p in paths:
        try:
            with open(p, encoding="utf-8") as f:
                doc = json.load(f)
        except Exception:                                         # noqa: BLE001
            continue
        if isinstance(doc, dict) and not expired(doc):
            out.append(doc)
    return out


def answered_reask(payload, pointers):
    """Deny a question byte-equal to a gate call whose raising is already answered.

    The capture hook writes no row for it and no advance reads it, so the
    owner's second answer would go nowhere. A live unanswered raising whose call
    is this payload, in any session, is never denied here.
    """
    got = canonical(payload.get("tool_input") or {})
    # ANY SESSION'S LIVE RAISING WITH THESE BYTES IS ADMITTED: two runs refusing
    # alike compose byte-equal calls, and a gate may be clicked in another session.
    for p in list(pointers) + live_pointers_any_session():
        want = expected_call(p)
        if want is not None and not has_capture(p) and canonical(want) == got:
            return False
    for run_dir in run_dirs():
        try:
            calls = sorted(run_dir.glob(f"*{GATE_CALL_SUFFIX}"))
        except OSError:
            continue
        for call in calls:
            try:
                with open(call, encoding="utf-8") as f:
                    if canonical(json.load(f)) != got:
                        continue
            except Exception:                                     # noqa: BLE001
                continue
            row = answering_row(run_dir, call.name[: -len(GATE_CALL_SUFFIX)])
            if row is None:
                continue
            earlier = (row.get("evidence") or {}).get("tool_use_id")
            deny(
                f"This {GATE_TOOL} call is the gate call at {call}, and that "
                f"raising was already answered by {GATE_TOOL} {earlier} "
                f"(kogaki#1740). No hook reads a second answer to it, so the "
                f"owner's click would go nowhere. The run's next stop is "
                f"printed by the advance that answer drove; re-ask nothing "
                f"by hand."
            )
            return True
    return False


# --------------------------------------------------------------------------
# Stop

def record_unrendered(pointer, abandoned_path):
    """Mark the run failed on its own record, at the moment the bound is spent.

    WRITTEN ONCE, AND BESIDE THE RUN rather than in a ledger of this hook's own:
    the run record is what a later pass reads, and a gate that went unrendered is
    a property of the run and not of the hook that noticed. `abandoned_path` is
    written down with it so the record names where the pointer went, rather than
    just that it is gone.
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
        "abandoned_pointer_path": str(abandoned_path) if abandoned_path else None,
        "note": (f"The turn ended with this gate open and no capture row. The Stop "
                 f"hook released the turn after one continuation without a rendered "
                 f"question (kogaki#1199)."),
    }
    try:
        with open(rec, "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=2)
            f.write("\n")
    except Exception as exc:                                      # noqa: BLE001
        note(f"run record {rec} could not be written ({exc})")


def abandon_pointer(pointer):
    """Move the pointer to `abandoned/` and return where it went (kogaki#1199).

    The destination is the one a human used by hand (kogaki#1051, #1057, #1081).
    A failed move returns None rather than raising: the run record is written
    either way, and a pointer left in place keeps gating, the recoverable side.
    """
    path = pointer.get("_pointer_path")
    if path is None:
        return None
    dest_dir = pointer_dir() / "abandoned"
    try:
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / path.name
        path.rename(dest)
        return dest
    except Exception as exc:                                      # noqa: BLE001
        note(f"pointer {getattr(path, 'name', path)} could not be moved to "
             f"abandoned/ ({exc}); it stays in the live directory and keeps "
             f"denying this session's tools")
        return None


def stop(payload, pointers):
    outstanding = [p for p in pointers if not has_capture(p)]
    if not outstanding:
        return 0
    pointer = outstanding[0]
    if payload.get("stop_hook_active"):
        # THE ONE CONTINUATION IS SPENT (kogaki#1199). This is the second Stop
        # for this gate -- the first already blocked once below, and the turn
        # it bought did not render the question. There is no larger bound to
        # wait for: the hook abandons the gate itself, on the same recovery a
        # human performed by hand three times before, and lets the turn end.
        moved = abandon_pointer(pointer)
        record_unrendered(pointer, moved)
        decl = pointer.get("declaration_path")
        rec = str(Path(decl).parent / "run-record.json") if decl else "(no declaration_path on this pointer)"
        print(json.dumps({
            "systemMessage": (
                f"The gate {gate_line(pointer)} could not be rendered in "
                f"the one continuation the Stop hook grants (kogaki#1199). The run "
                f"record at {rec} now carries failure.cause = gate-unrendered, and "
                f"the pointer was moved to "
                f"{moved if moved is not None else '(could not be moved — see stderr)'}. "
                f"The gate is abandoned; the turn ends here."
            ),
        }))
        return 0
    print(json.dumps({
        "decision": "block",
        "reason": (
            f"A gate is OPEN for this session — {gate_line(pointer)} — and "
            f"the owner has not answered it (kogaki#1028).\n\n"
            f"The turn does not end here. Send the payload at "
            f"{pointer.get('gate_call_path') or '(none composed — see the pointer)'} "
            f"as an {GATE_TOOL} tool_input, byte-for-byte, and let the owner answer. "
            f"This is the one continuation the hook grants for rendering it: if the "
            f"question still cannot be rendered by the next Stop, the hook abandons "
            f"the gate itself and lets the turn end (kogaki#1199)."
        ),
    }))
    return 0


HANDLERS = {
    "PreToolUse": pre_tool_use,
    "Stop": stop,
}


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:                                             # noqa: BLE001
        # FAILS OPEN, per the docstring. See there for why this polarity is the
        # opposite of `gate-executor-invocation.py`'s and why that is deliberate.
        note("the payload could not be read; no gate was enforced for it")
        return 0
    event = payload.get("hook_event_name") or (sys.argv[1] if len(sys.argv) > 1 else None)
    handler = HANDLERS.get(event)
    if handler is None:
        return 0
    pointers = open_pointers(payload.get("session_id"))
    if event == "PreToolUse" and payload.get("tool_name") == GATE_TOOL:
        try:
            if answered_reask(payload, pointers):
                return 0
        except Exception as exc:                                  # noqa: BLE001
            note(f"the answered-raising read failed ({exc}); nothing was enforced by it")
    if not pointers:
        return 0
    try:
        return handler(payload, pointers) or 0
    except Exception as exc:                                      # noqa: BLE001
        note(f"failed while handling {event} ({exc}); nothing was enforced")
        return 0


if __name__ == "__main__":
    sys.exit(main())
