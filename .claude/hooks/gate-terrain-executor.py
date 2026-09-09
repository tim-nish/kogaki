#!/usr/bin/env python3
"""PreToolUse deny: the Terrain executor is not reachable from a Bash command.

Design and licence: kogaki#1027, item 2. Contract: specs/spec-terrain/SPEC.md
§16. Read them there -- this file restates neither.

WHAT THIS REFUSES. Any `Bash` command naming `terrain.mjs` with any verb other
than `--status`. That is the whole rule, and the allowance is deliberately a
FLAG rather than a subcommand list: `run --status` is read-only, it is the one
route by which a person can inspect a stuck run, and an inspection route that
was denied would leave the run unreadable by the one party able to unstick it.

WHY IT IS A DENY AND NOT A LINT. Every Terrain run since kogaki#17 started when
the model typed `node src/terrain.mjs run` into Bash and advanced when the model
chose to re-enter; the run record recorded which states completed and never who
executed the transition, so a run the model drove and a run the Harness drove
left identical records. kogaki#1027 makes the executor name its executor -- and
that field is only worth reading because THIS deny exists. The start act
attributes its own transitions to the skill expansion, with no hook payload
behind them, so a model able to type `terrain.mjs start` in Bash could mint a
start-attributed record at will. The self-declared executor kind and this
prohibition are one instrument, not a guard beside a convention.

FAILS CLOSED, and it is registered that way in `hook-dispatch.py`'s family
table. It reads the command string handed to it and nothing else, so there is
no environment that could be unreadable, and the act being unreachable is the
whole of what the guard buys.

WHAT IT DOES NOT CLAIM. The match is over TEXT. A command that merely mentions
`terrain.mjs` in a comment or a grep pattern is indistinguishable here from one
that runs it, and it is refused too -- the same boundary `check-registry-
conformance.sh` declares between code and comment, and the same refusal of a
language-aware parser as a lint over judgment. The cost is a refused `grep`,
whose recovery is in the message; the cost of the other direction is the
prohibition silently not applying.
"""

import json
import re
import sys

# The executor's file, and the one verb admitted from a Bash command.
EXECUTOR = "terrain.mjs"
ADMITTED = "--status"

REASON = (
    "`{cmd}` names {executor}, and the Terrain executor is invoked by hooks only "
    "(kogaki#1027).\n\n"
    "A run is STARTED by the terrain skill's own `!` line, which the harness "
    "executes at invocation before you see anything, and ADVANCED inside the "
    "PostToolUse hook for the AskUserQuestion that answered its gate "
    "(.claude/hooks/advance-terrain.py). There is no model-typed route to either, "
    "and there is no stub: `--input`, `--at` and `--enter` are deleted and the "
    "executor refuses them by name.\n\n"
    "The one verb admitted from a Bash command is `{admitted}`, which is read-only. "
    "If you are inspecting a run, re-issue the command with `{admitted}`; if you are "
    "searching the tree for the string rather than running it, this deny cannot tell "
    "the two apart and refuses both -- read the file instead."
)


def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))


# WHERE ONE COMMAND STOPS AND THE NEXT BEGINS (PR #1034 round 1, finding 2).
#
# The first cut read the WHOLE command string for `--status`, so
# `node src/terrain.mjs run --status; node src/terrain.mjs start` rode through
# on the first segment's flag and minted a skill-expansion-attributed record
# from a model-typed Bash command -- the one route the executor's self-declared
# kind is only trustworthy because it is closed. The declared trade in the
# docstring above is OVER-refusal, never under-refusal, and this was the
# opposite.
#
# SPLIT, NOT PARSED. The separators are the shell's own statement and pipeline
# operators; this is not a shell parser and does not claim to be one. A
# separator inside a quoted string splits a segment that should not have been
# split, which refuses MORE -- the direction this hook already declares it errs
# in.
SEGMENT_SPLIT = re.compile(r"(?:\|\||&&|;|\||\n|&)")


def segments(command):
    return [seg for seg in SEGMENT_SPLIT.split(command or "") if seg.strip()]


def names_executor(segment):
    """Does this segment name the executor file?

    Anchored on the bare filename rather than a path, because the executor is
    reachable as `src/terrain.mjs`, `./src/terrain.mjs`, an absolute path, or
    through a worktree -- and a matcher keyed to one spelling is a matcher a
    second spelling walks past.
    """
    return re.search(r"\bterrain\.mjs\b", segment or "") is not None


def admitted(segment):
    """Only `--status`, and only in the SAME segment, rides through.

    Read as a WHOLE WORD so `--status-key` and a path ending in `--status` do
    not admit; and the absence of any other flag is not an admission -- a bare
    `node src/terrain.mjs run` carries no verb at all and is denied.
    """
    return re.search(r"(?<![\w-])--status(?![\w-])", segment or "") is not None


def offending(command):
    """The first segment that names the executor without admitting itself."""
    for seg in segments(command):
        if names_executor(seg) and not admitted(seg):
            return seg.strip()
    return None


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:                                             # noqa: BLE001
        # FAILS CLOSED on an unreadable payload, per the family table. A
        # payload this hook cannot parse is a command it cannot rule out.
        deny("gate-terrain-executor could not read its payload, and this hook "
             "fails CLOSED: the Terrain executor's prohibition is not suspended "
             "by the hook's own failure (kogaki#1027).")
        return 0
    if payload.get("tool_name") != "Bash":
        return 0
    command = (payload.get("tool_input") or {}).get("command") or ""
    seg = offending(command)
    if seg is None:
        return 0
    deny(REASON.format(cmd=seg[:200], executor=EXECUTOR, admitted=ADMITTED))
    return 0


if __name__ == "__main__":
    sys.exit(main())
