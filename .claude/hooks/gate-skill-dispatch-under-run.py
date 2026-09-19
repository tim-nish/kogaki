#!/usr/bin/env python3
"""PreToolUse deny: a self-gating skill is not dispatchable under a run.

Design and licence: kogaki#1154. Contract: specs/spec-gate-carrier/SPEC.md,
`.claude/hooks/gate-open-terrain-gate.py`'s own docstring (kogaki#1028).

THE DEADLOCK THIS REFUSES BEFORE IT OPENS. Session 54a9804a, `/ship-cycle
1066`, 2026-09-19: the run dispatched `/terrain` inside itself. The start act
opened the tag gate and sent it as an `AskUserQuestion`; the toolkit's own
gate-set membership check refused it, because Terrain's gates are declared by
the Terrain workflow and no ship-cycle command declares them; and
`gate-open-terrain-gate.py` admits nothing else while that gate is open. There
was no act both hooks admitted, and the only way out was moving the pointer to
`~/.claude/kogaki-open-gates/abandoned/` by hand, from outside the session.

WHY THE REFUSAL BELONGS AT DISPATCH. Both hooks that met that session were
correct in what each refuses -- the membership check binds a run's declared
set, and the open-gate hook admits exactly one act by design (kogaki#1028).
Neither is the place to widen: widening the declared set admits Terrain's
gates into every run's vocabulary to serve one dispatch (the alternative arm
the issue names and declines), and narrowing the open-gate hook's exclusivity
defeats the property it exists to hold. The dispatch itself is the one act
that knows both facts at once -- that a run is in force for this session, and
that the skill about to run opens a gate interval no run declares -- so it is
the one place a refusal costs nothing already built.

THE SELF-GATING SET IS DATA HERE, NOT IMPORTED, for the reason
`gate-open-terrain-gate.py`'s own `POINTER_TTL` comment gives: a hook is one
file the harness runs by path, so the sibling's enumeration
(`gate-terrain-executor.py`'s `EXECUTORS`) is copied rather than reached for.
Both name the same two lanes -- Terrain and Brief -- because both open a gate
interval through the identical `gate-open-terrain-gate.py` pointer mechanism;
a third lane joins this table when it starts opening one, exactly as it would
join `EXECUTORS`.

THE RUN MARKER IS THE TOOLKIT'S OWN, READ RATHER THAN REDECLARED.
`~/.claude/ship-cycle-runs/runmark__<session>.json` is written by `issue-sync
preflight` as a lane run's first act (the same marker
`lint-gate-declaration.py` reads to bind a run's declared gate set), and the
same two keys are tried for the same reason that hook tries them: the marker
is keyed to the harness-supplied session id, and the transcript path's own
stem is evidence of the same session under a different spelling. Outside a
run there is no marker, dispatch is unaffected, and this hook does nothing --
which is acceptance item 3.

WHY THIS DENY LEAVES NO POINTER (acceptance item 2). The gate pointer is
written by the dispatched skill's own `!` line, which runs as part of the
Skill tool's own dispatch. PreToolUse fires before that dispatch, so a deny
here means the skill is never expanded and the `!` line never runs -- there is
no pointer to abandon because there is no run that opened one.

FAILS CLOSED on an unreadable payload, and that is the same polarity as
`gate-terrain-executor.py` and for the same reason: the failure mode this
guards is a session wedged past the point a session can recover from itself,
and reproducing that by failing open on a read error is the more expensive
direction here. A payload this hook cannot parse is a dispatch it cannot rule
out safe.
"""

import json
import re
import sys
from pathlib import Path

# THE SAME TWO LANES `gate-terrain-executor.py` NAMES, because both open a gate
# interval through `gate-open-terrain-gate.py`'s pointer mechanism. Keyed by
# skill name (the `Skill` tool's own `tool_input.skill`), not by executor
# filename -- this hook fires before any executor is reached.
SELF_GATING_SKILLS = {
    "terrain": "Terrain",
    "brief": "Brief",
}

RUN_MARK_DIR = Path.home() / ".claude" / "ship-cycle-runs"

REASON = (
    "Dispatching the `{skill}` skill is refused: this session is inside a "
    "ship-cycle run ({run_mark}), and {lane} opens its own gate interval "
    "(kogaki#1028) that no ship-cycle command declares in the run's gate "
    "set.\n\n"
    "Sending that gate's question would be refused by the run's own gate-set "
    "membership check, and once open, `gate-open-terrain-gate.py` admits no "
    "other act -- there is no act both hooks admit, which is the deadlock "
    "kogaki#1154 is filed against.\n\n"
    "Run `/{skill}` in its own session instead: outside a ship-cycle run it "
    "is unaffected. Widening the run's declared gate set to admit {lane}'s "
    "gates is a separate, declined alternative (kogaki#1154's proposed fix)."
)


def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))


def note(msg):
    print(f"gate-skill-dispatch-under-run: {msg}", file=sys.stderr)


def _session_slug(value):
    """The same slug `lint-gate-declaration.py`'s `run_mark` derives.

    Copied rather than imported, for the reason stated in the module
    docstring: a hook is one file the harness runs by path.
    """
    return re.sub(r"[^A-Za-z0-9_.-]", "_", str(value)) or "_unnamed"


def run_mark(payload):
    """The preflight's run marker for this call's session, or None.

    Tries the harness `session_id` and the transcript path's own stem, the
    same two keys `lint-gate-declaration.py` tries and for the same reason:
    the marker's key spelling is not guaranteed to be one or the other.
    """
    keys = []
    sid = payload.get("session_id")
    if sid:
        keys.append(str(sid))
    tpath = payload.get("transcript_path")
    if tpath:
        keys.append(Path(str(tpath)).stem)
    for key in keys:
        path = RUN_MARK_DIR / f"runmark__{_session_slug(key)}.json"
        try:
            with open(path, encoding="utf-8") as fh:
                rec = json.load(fh)
        except (OSError, ValueError):
            continue
        if isinstance(rec, dict):
            return path, rec
    return None, None


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:                                             # noqa: BLE001
        # FAILS CLOSED, per the docstring: an unreadable payload is a dispatch
        # this hook cannot rule out, and the deadlock this guards against is
        # the more expensive direction to reproduce by failing open.
        deny("gate-skill-dispatch-under-run could not read its payload, and "
             "this hook fails CLOSED: a self-gating skill dispatch is not "
             "admitted while the run state behind it is unreadable "
             "(kogaki#1154).")
        return 0
    if payload.get("tool_name") != "Skill":
        return 0
    skill = (payload.get("tool_input") or {}).get("skill")
    lane = SELF_GATING_SKILLS.get(skill)
    if lane is None:
        return 0
    mark_path, mark = run_mark(payload)
    if mark is None:
        # No run in force for this session -- acceptance item 3. A standalone
        # dispatch of a self-gating skill is exactly as unaffected as before.
        return 0
    deny(REASON.format(skill=skill, lane=lane, run_mark=mark_path))
    return 0


if __name__ == "__main__":
    sys.exit(main())
