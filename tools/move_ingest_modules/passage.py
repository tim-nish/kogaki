"""The passage step of the Move ingest (kogaki#1463): the authorship prompt,
the model call and the one screen."""

import json
import os
import re
import subprocess

from .records import (
    Refusal,
)
from .library import (
    render_move,
)


# --------------------------------------------------------------------------
# The Passage-to-Move path (kogaki#1175, thread comment "Passage-to-Move
# path: approved 2026-09-23, with a condition"). One command: a Passage in,
# `specs/move-extraction-contract.md` authors a proposal, a selection screen
# is written as an artifact, and the write happens on the owner's recorded
# choice — never on any other act. This is the SAME division of labour the
# rest of the module holds: nothing here admits a Move, `save_accepted()` is
# still the only writer, and `--select accept` is the caller having already
# obtained the owner's choice, exactly as the ingest CLI's `accepted` list is.
# --------------------------------------------------------------------------

def build_passage_prompt(contract_text, passage_text, index_text):
    """The whole authorship input: the contract, the Passage, and the
    existing library — nothing else, per the contract's own opening line
    ("no other context is needed or permitted"). Its text is
    prompts/move-ingest/read-passage.prompt (kogaki#1863)."""
    return render_prompt_file("move-ingest/read-passage", {
        "contract": contract_text.strip(),
        "passage": passage_text.strip(),
        "library": index_text.strip(),
    })


def render_prompt_file(name, values):
    """A file under prompts/, rendered by src/prompt-file-cli.mjs."""
    cli = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                       "src", "prompt-file-cli.mjs")
    r = subprocess.run(["node", cli, name], input=json.dumps(values), capture_output=True, text=True)
    if r.returncode != 0:
        raise Refusal("passage", "the prompt file %s did not render: %s" % (name, (r.stderr or "").strip()))
    return r.stdout


def spawn_model(command, model, prompt, timeout_s, cwd=None):
    """The pinned-model authorship step, the same argv shape
    `src/terrain.mjs`'s `judgeAttempts` already runs `claude -p` with."""
    argv = [command, "-p", "--model", model, "--output-format", "text"]
    try:
        r = subprocess.run(
            argv, input=prompt, capture_output=True, text=True,
            timeout=timeout_s, cwd=cwd)
    except subprocess.TimeoutExpired:
        raise Refusal("passage", "the model exceeded the %ds per-call bound" % timeout_s)
    except OSError as exc:
        raise Refusal("passage", "the model command %r could not be run: %s" % (command, exc))
    if r.returncode != 0:
        raise Refusal(
            "passage",
            "the model exited %d. Its stderr, verbatim: %s. Its stdout, verbatim: %s"
            % (r.returncode, (r.stderr or "").strip() or "(empty)",
               (r.stdout or "").strip()[:2000] or "(empty)"),
        )
    return r.stdout


def _cell(value):
    """A record cell as one stripped line: a number written bare (`segment:
    2`) reads as its digits."""
    if value is None:
        return ""
    return " ".join(str(value).split())


WORD = re.compile(r"[a-z]+")


def render_passage_screen(proposal, rewritten=()):
    """The one screen the owner sees: accept as new / merge into the named
    Move / decline. An artifact (kogaki#474's precedent), never retyped."""
    if not proposal.admitted:
        return "refused: %s\n" % proposal.refusal

    lines = ["proposed Move: %s" % proposal.id, ""]
    if rewritten:
        lines.append("the Extraction records the question before the passage as none: "
                     "`holds: none` written into %s, never a composed question (kogaki#1216)"
                     % " and ".join(rewritten))
        lines.append("")
    lines.append(render_move(proposal.mapping))
    lines.append("")
    lines.append("accept as new / merge into <id> / decline")
    return "\n".join(lines) + "\n"
