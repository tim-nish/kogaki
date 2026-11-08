#!/usr/bin/env python3
"""PreToolUse deny: a lane executor is not reachable from a Bash command.

Refuses a Bash command whose executor path, from the `EXECUTORS` lane table,
stands in COMMAND POSITION, except `run --status` as the whole command
(kogaki#1027, #1063, #1116, #1314). Named for the act, not a lane (kogaki#1741).
The start act's self-declared executor kind is only worth reading because this
route is closed. Fails CLOSED (`hook-dispatch.py`'s family table). It reads
TOKENS, not a shell grammar: a command built at runtime or inside a `$(...)` it
never splits is outside it, and where it errs it errs toward refusing.
Contract: specs/spec-terrain/SPEC.md §16.
"""

import json
import re
import sys

# THE LANE TABLE (kogaki#1741): the one carrier of which paths this hook denies.
# One row per executor, keyed by filename -- the lane, the skill that starts it,
# the PostToolUse hook that advances it, and the exact spellings a retry copies
# (kogaki#1314). `PATH_TOKEN` below is built from these keys, so a lane joins
# the deny by adding its row and by nothing else.
EXECUTORS = {
    "terrain.mjs": ("Terrain", "terrain", ".claude/hooks/advance-terrain.py",
                    ("node src/terrain.mjs run --status --run-dir <dir>",)),
    "brief.mjs": ("Brief", "brief", ".claude/hooks/advance-brief.py",
                  ("node src/brief.mjs run --status --job await --run-dir <dir>",
                   "node src/brief.mjs run --status --job status --run-dir <dir>")),
}
ADMITTED = "--status"

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


# WHERE ONE COMMAND STOPS AND THE NEXT BEGINS (PR #1034 round 1, finding 2):
# admission is per segment, so a status read chained to a start is refused.
# Split on the shell's statement and pipeline operators, not parsed; a separator
# inside quotes over-splits, which refuses more.
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
PATH_TOKEN = re.compile(r"^[^\s=,]*(?:^|/)(?:"
                        + "|".join(re.escape(name) for name in EXECUTORS) + r")$")

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

    First after any transparent prefix, or right behind an interpreter, on any
    spelling of the path (kogaki#1063). The walk back skips an option and the
    argument it takes (PR #1064 round 1). Every path token is tried, so a data
    mention earlier in the segment cannot hide a later invocation.
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

    One segment, no substitution, grouping or redirection, and tokens that are
    a transparent prefix, an interpreter, the executor path and the grammar
    `_args_ok` reads. Read from the token the deny anchors on (PR #1064 round
    1); `--status` is a whole token, and the verb is `run` (PR #1040 round 1).
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
        deny("gate-executor-invocation could not read its payload, and this hook "
             "fails CLOSED: the lane executors' prohibition is not suspended "
             "by the hook's own failure (kogaki#1027).")
        return 0
    if payload.get("tool_name") != "Bash":
        return 0
    command = (payload.get("tool_input") or {}).get("command") or ""
    hit = offending(command)
    if hit is None:
        return 0
    seg, executor = hit
    lane, skill, advance, spelled = EXECUTORS[executor]
    spellings = "\n".join("    " + line for line in spelled)
    deny(REASON.format(cmd=seg[:200], executor=executor, lane=lane, skill=skill,
                       advance=advance, admitted=ADMITTED, spellings=spellings))
    return 0


if __name__ == "__main__":
    sys.exit(main())
