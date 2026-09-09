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

WHAT IT DOES NOT CLAIM. The match is over TEXT, and it is anchored on the
INVOCATION SHAPE rather than on the bare filename (kogaki#1063). A segment is
refused when the executor's path stands in COMMAND POSITION -- first in the
segment, or behind an interpreter token -- and not when the name merely appears
as data. This is a NARROWING, and the distinction is the whole of the repair:
the first cut matched `\\bterrain.mjs\\b` anywhere in a segment, which refused
the one act that MUST name the file and has no route around it. An Issue's
footprint declaration (`admit-issue verdict --plan-cell '...;files=src/
terrain.mjs,...'`) spells the path as data, with one spelling and no substitute,
so under the bare-literal match no Issue whose work is in this executor could be
truthfully admitted at all -- kogaki#1062 was the live case.

The over-refusal the first cut accepted was measured against a comment and a
grep pattern, and its message told the reader to route around both by reading
the file instead. Neither must name the file; the footprint cell must. So the
anchor moves, and what it moves to still catches every reachable invocation
spelling: `src/terrain.mjs`, `./src/terrain.mjs`, an absolute path, a worktree
path, a direct `./…` execution with no interpreter, and an interpreter reached
through `sudo`, `env`, `exec` or a `sh -c` string. The over-refusal direction is
kept where it is cheap -- a quoted `-c` payload and a leading env assignment are
both read as command position.

THE BOUNDARY IS DECLARED, and it is not a completeness claim. This reads TOKENS,
not a shell grammar: it splits on whitespace, resolves quoting by stripping
rather than parsing, and walks back over options and runners by shape. A command
constructed at runtime, reached through a variable, or assembled inside a
`$(...)` it never splits is outside it. That is a fact about this code, stated
here because a gate whose reach is unstated is read as total; what the
prohibition rests on is that the ordinary Bash route is closed, and the ordinary
route is what these tokens cover.
"""

import json
import re
import sys

# The executor's file, and the one verb admitted from a Bash command.
EXECUTOR = "terrain.mjs"
ADMITTED = "--status"

REASON = (
    "`{cmd}` RUNS {executor} -- the path stands in command position -- and the "
    "Terrain executor is invoked by hooks only (kogaki#1027).\n\n"
    "A run is STARTED by the terrain skill's own `!` line, which the harness "
    "executes at invocation before you see anything, and ADVANCED inside the "
    "PostToolUse hook for the AskUserQuestion that answered its gate "
    "(.claude/hooks/advance-terrain.py). There is no model-typed route to either, "
    "and there is no stub: `--input`, `--at` and `--enter` are deleted and the "
    "executor refuses them by name.\n\n"
    "The one verb admitted from a Bash command is `run {admitted}`, which is "
    "read-only. If you are inspecting a run, re-issue the command with "
    "`{admitted}`.\n\n"
    "NAMING the file is not running it: a grep pattern, a comment and an Issue's "
    "`files=` footprint cell all pass, because this deny anchors on the "
    "invocation shape rather than on the bare filename (kogaki#1063). If you are "
    "seeing this on a command that does not run the executor, the path is "
    "standing where a command goes."
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


# THE INVOCATION SHAPE (kogaki#1063).
#
# A PATH TOKEN is a token that IS a path ending in the executor's filename --
# not a token that merely contains it. `src/terrain.mjs`, `./src/terrain.mjs`,
# `/abs/wt1063/src/terrain.mjs` are path tokens; `files=src/terrain.mjs`,
# `files=src/terrain.mjs,src/workflow.json` and `"terrain.mjs"` inside a longer
# `--plan-cell` value are not, because a token carrying `=` or `,` is a data
# cell rather than a command. That exclusion is what makes an Issue whose work
# is in the executor admissible at all.
PATH_TOKEN = re.compile(r"^[^\s=,]*(?:^|/)terrain\.mjs$")

# INTERPRETERS. The tokens after which a path is being RUN. Node's own spellings
# plus the runners that reach it; the version-suffixed forms (`node20`) are
# covered by the pattern rather than by enumeration. The SHELLS are here so that
# `sh -c 'src/terrain.mjs run'` -- whose payload carries no interpreter of its
# own -- lands in command position; `sh <a .mjs file>` is not a real invocation,
# and refusing it is this hook's declared direction rather than a cost.
INTERPRETER = re.compile(
    r"^(?:node(?:js)?[\d.]*|npx|bun|deno|ts-node|tsx|sh|bash|zsh|dash|ksh)$")

# TRANSPARENT PREFIXES. Tokens that stand before a command without being one, so
# the command position is the token AFTER them. The runners that reach a direct
# execution are members because the path carries no interpreter of its own there
# and the prefix is the whole of what stands in front of it (PR #1064 round 1).
# Erring toward over-refusal is this hook's declared direction, and every member
# widens what counts as command position.
TRANSPARENT = {"sudo", "doas", "env", "exec", "nohup", "time", "timeout",
               "xargs", "setsid", "stdbuf", "nice", "ionice", "command",
               "builtin", "then", "do", "else"}
# ...and three transparent SHAPES, which is where the enumeration would
# otherwise have to guess: a leading `VAR=value` assignment, an OPTION and the
# ARGUMENT an option takes.
ASSIGNMENT = re.compile(r"^[A-Za-z_][A-Za-z_0-9]*=")
# `timeout 300`, `timeout 5m` -- a runner's duration argument, which is not an
# option and so is not caught by the option rule below.
DURATION = re.compile(r"^\d+(?:\.\d+)?[smhd]?$")


def _unquote(token):
    """Strip the shell quoting a split on whitespace leaves attached.

    A quote character is not part of a path, and `bash -c "node src/terrain.mjs
    start"` hands us `"node` as one token. Stripping is what lets the
    interpreter behind a quote still read as an interpreter.
    """
    return (token or "").strip("\"'`()")


def _transparent(token):
    return (token in TRANSPARENT
            or ASSIGNMENT.match(token) is not None
            or DURATION.match(token) is not None
            or token.startswith("-"))


def _tokens(segment):
    return [t for t in (_unquote(x) for x in (segment or "").split()) if t]


def command_index(tokens):
    """Index of the path token standing in COMMAND POSITION, or None.

    Command position is: first in the segment after any transparent prefix, or
    immediately behind an interpreter token. Anchored on the path's TAIL rather
    than one spelling, because the executor is reachable as `src/terrain.mjs`,
    `./src/terrain.mjs`, an absolute path or through a worktree -- and a matcher
    keyed to one spelling is a matcher a second spelling walks past.

    THE WALK BACK SKIPS AN OPTION AND THE ARGUMENT IT TAKES (PR #1064 round 1,
    blocking). Reading only a fixed prefix set stopped on `--no-warnings`, so
    `node --no-warnings src/terrain.mjs start` read as data and rode through --
    UNDER-refusal on the ordinary Bash route, which is the one direction this
    hook declares it never errs in. An option belongs to whatever precedes it,
    and so does the token after an option (`node -r foo <path>`), so both are
    walked past rather than treated as the command's neighbour.

    EVERY PATH TOKEN IS TRIED, not just the first: a data mention earlier in the
    same segment must not hide an invocation later in it.
    """
    for i, token in enumerate(tokens):
        if PATH_TOKEN.match(token) is None:
            continue
        j = i - 1
        while j >= 0:
            # An interpreter ENDS the walk. Tested first, because the
            # option-argument rule below would otherwise step over it: in
            # `... --status node <path>`, `node` follows an option and is not
            # its argument.
            if INTERPRETER.match(tokens[j]) is not None:
                break
            if _transparent(tokens[j]):
                j -= 1
                continue
            # An option's ARGUMENT: in `node -r foo <path>`, `foo` belongs to
            # `-r` and is not the token standing before the command.
            if j >= 1 and tokens[j - 1].startswith("-"):
                j -= 2
                continue
            break
        if j < 0 or INTERPRETER.match(tokens[j]) is not None:
            return i
    return None


def admitted(tokens, index):
    """Only `run --status`, on the INVOCATION's own arguments, rides through.

    READ FROM THE SAME TOKEN THE DENY ANCHORS ON (PR #1064 round 1). The first
    cut read the verb by searching the raw segment for the filename, so a data
    mention standing earlier in the segment supplied the verb for a later
    invocation: `NOTE=terrain.mjs run node src/terrain.mjs start --status` was
    denied by the anchor and then admitted by the verb read. The admission now
    takes the arguments of the command the anchor found, and nothing else.

    `--status` is matched as a WHOLE TOKEN so `--status-key` does not admit; and
    the absence of any other flag is not an admission -- a bare
    `node src/terrain.mjs run` carries no verb at all and is denied.

    THE VERB IS `run` (PR #1040 round 1, blocking finding): `start` opens a
    workspace and repoints the open run BEFORE it looks at `--status`, so the
    flag admitted an act that clobbers the owner's live run.
    """
    args = tokens[index + 1:]
    return bool(args) and args[0] == "run" and ADMITTED in args[1:]


def offending(command):
    """The first segment that RUNS the executor without admitting itself."""
    for seg in segments(command):
        tokens = _tokens(seg)
        index = command_index(tokens)
        if index is not None and not admitted(tokens, index):
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
