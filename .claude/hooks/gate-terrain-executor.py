#!/usr/bin/env python3
"""PreToolUse deny: a lane executor is not reachable from a Bash command.

Design and licence: kogaki#1027, item 2; widened to the Brief runtime by
kogaki#1116, acceptance item 5. Contract: specs/spec-terrain/SPEC.md §16. Read
them there -- this file restates neither.

WHAT THIS REFUSES. Any `Bash` command naming `terrain.mjs` OR `brief.mjs` with
any verb other than `--status` -- and, since kogaki#1314, any command in which
that `--status` invocation is not the WHOLE command (see `admitted`). That is the whole rule, and the allowance is
deliberately a FLAG rather than a subcommand list: `run --status` is read-only,
it is the one route by which a person can inspect a stuck run, and an inspection
route that was denied would leave the run unreadable by the one party able to
unstick it.

WHY THE SECOND EXECUTOR JOINS THIS ONE RATHER THAN GETTING ITS OWN HOOK. The
rule is identical in every part -- the same command-position anchor, the same
one admitted verb, the same fail-closed posture -- and the two runtimes now
share the executor itself: `src/brief.mjs` runs `src/terrain.mjs`'s own advance
loop under a flow binding. Two files carrying one rule drift; what is per-lane
is the skill file and the advance hook the reason names, and those are read off
the matched executor rather than written twice.

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

# The executors this hook covers, and the one verb admitted from a Bash command.
# Keyed by filename so the reason can name the LANE the matched file belongs to:
# the skill that starts it and the PostToolUse hook that advances it are per-lane
# facts, and a reason naming the wrong one sends the reader to the wrong file.
EXECUTORS = {
    "terrain.mjs": ("Terrain", "terrain", ".claude/hooks/advance-terrain.py"),
    "brief.mjs": ("Brief", "brief", ".claude/hooks/advance-brief.py"),
}
ADMITTED = "--status"

# THE EXACT SPELLING A RETRY COPIES (kogaki#1314). Per executor, because the
# Brief runtime's inspection route carries the `job` verbs and Terrain's does
# not; the reason prints these verbatim so the retry is a copy of a whole
# command rather than a composition around one.
SPELLINGS = {
    "terrain.mjs": ("node src/terrain.mjs run --status --run-dir <dir>",),
    "brief.mjs": ("node src/brief.mjs run --status --job await --run-dir <dir>",
                  "node src/brief.mjs run --status --job status --run-dir <dir>"),
}

REASON = (
    "`{cmd}` RUNS {executor} -- the path stands in command position -- and the "
    "{lane} executor is invoked by hooks only (kogaki#1027, widened to the Brief "
    "runtime by kogaki#1116).\n\n"
    "A run is STARTED by the {skill} skill's own `!` line, which the harness "
    "executes at invocation before you see anything, and ADVANCED inside the "
    "PostToolUse hook for the AskUserQuestion that answered its gate "
    "({advance}). There is no model-typed route to either, "
    "and there is no stub: `--input`, `--at` and `--enter` are deleted and the "
    "executor refuses them by name.\n\n"
    "The one verb admitted from a Bash command is `run {admitted}`, which is "
    "read-only, and it is admitted only as THE WHOLE COMMAND (kogaki#1314): no "
    "pipe, no redirection, no `2>&1`, no `$(...)`, no loop and no second "
    "command around it, because the executor's stdout is the only channel an "
    "open gate's bytes have and a filter composed around it decides what the "
    "owner sees. If you are inspecting a run, issue exactly this as the whole "
    "Bash command, and call it again rather than looping:\n\n"
    "{spellings}\n\n"
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
# `files=src/terrain.mjs,src/terrain-workflow.json` and `"terrain.mjs"` inside a longer
# `--plan-cell` value are not, because a token carrying `=` or `,` is a data
# cell rather than a command. That exclusion is what makes an Issue whose work
# is in the executor admissible at all.
PATH_TOKEN = re.compile(r"^[^\s=,]*(?:^|/)(?:terrain|brief)\.mjs$")

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
    interpreter behind a quote still read as an interpreter. A `$` is stripped
    with them (kogaki#1314), so the `$(node` a command substitution leaves
    attached reads as the interpreter it opens and the invocation inside it is
    found -- and then refused by `admitted`, which takes no substitution.
    """
    return (token or "").strip("\"'`()$")


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


# THE WHOLE-COMMAND GRAMMAR (kogaki#1314). The arguments the inspection route
# takes, beyond `run` and `--status`: `--job` with one of its two read verbs,
# and `--run-dir` with a path. Anything else -- a redirection, a `2>&1`, a
# stray word -- is not part of that one invocation.
JOB_VERBS = {"status", "await"}
# Characters that mean the text is no longer one plain invocation: command
# substitution, a subshell or group, a redirection. A segment split already
# removed `;`, `|`, `&` and newlines; these are the rest of the shell around
# a command that the token read would otherwise strip and walk past.
COMPOSED = re.compile(r"[$`()<>{}]")


def _prefix_ok(tokens):
    """An optional transparent prefix -- never a loop or conditional keyword."""
    return all(_transparent(t) and t not in {"then", "do", "else"}
               for t in tokens)


def _args_ok(args):
    """`run`, `--status`, and at most `--job <verb>` and `--run-dir <path>`."""
    if not args or args[0] != "run":
        return False
    seen = set()
    k = 1
    while k < len(args):
        a = args[k]
        if a in seen:
            return False
        if a == ADMITTED:
            seen.add(a)
            k += 1
        elif a == "--job" and k + 1 < len(args) and args[k + 1] in JOB_VERBS:
            seen.add(a)
            k += 2
        elif (a == "--run-dir" and k + 1 < len(args)
              and not args[k + 1].startswith("-")):
            seen.add(a)
            k += 2
        else:
            return False
    return ADMITTED in seen


def admitted(command, segment, tokens, index):
    """Only `run --status` as THE WHOLE COMMAND rides through (kogaki#1314).

    THE WHOLE STRING, NOT THE SEGMENT. Admission read one segment's arguments,
    so `for i in ...; do out=$(node src/brief.mjs run --status --job await
    ...); echo "$out" | grep ... ; done` rode through on the loop body, and the
    filter around it dropped a gate's bytes on the one channel they had. A
    command is admitted only when it has exactly one segment, that segment
    carries no substitution, grouping or redirection, and its tokens are an
    optional transparent prefix, an interpreter, the executor path and the
    inspection grammar `_args_ok` reads -- in any order after `run`.

    READ FROM THE SAME TOKEN THE DENY ANCHORS ON (PR #1064 round 1): a data
    mention earlier in the segment cannot supply the verb for a later
    invocation, because everything before the path must be prefix and
    interpreter.

    `--status` is matched as a WHOLE TOKEN so `--status-key` does not admit; a
    bare `run` carries no verb and is denied; and the verb is `run` (PR #1040
    round 1): `start` opens a workspace and repoints the open run BEFORE it
    looks at `--status`.
    """
    if len(segments(command)) != 1 or COMPOSED.search(segment):
        return False
    if index < 1 or INTERPRETER.match(tokens[index - 1]) is None:
        return False
    if not _prefix_ok(tokens[:index - 1]):
        return False
    return _args_ok(tokens[index + 1:])


def offending(command):
    """The first segment that RUNS an executor without admitting itself.

    Returns `(segment, executor filename)` so the reason can name the lane the
    matched file belongs to, rather than naming one lane for both.
    """
    for seg in segments(command):
        tokens = _tokens(seg)
        index = command_index(tokens)
        if index is not None and not admitted(command, seg, tokens, index):
            return seg.strip(), tokens[index].rsplit("/", 1)[-1]
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
    hit = offending(command)
    if hit is None:
        return 0
    seg, executor = hit
    lane, skill, advance = EXECUTORS.get(executor, EXECUTORS["terrain.mjs"])
    spellings = "\n".join("    " + line for line in
                          SPELLINGS.get(executor, SPELLINGS["terrain.mjs"]))
    deny(REASON.format(cmd=seg[:200], executor=executor, lane=lane, skill=skill,
                       advance=advance, admitted=ADMITTED, spellings=spellings))
    return 0


if __name__ == "__main__":
    sys.exit(main())
