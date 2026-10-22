"""The passage step of the Move ingest (kogaki#1463): the authorship prompt,
the model call, Segment text, the near-duplicate check and the one screen."""

import os
import re
import subprocess

from .records import (
    MOVE_RECORD_EXT, Refusal,
)
from .library import (
    read_saved, render_move,
)


# --------------------------------------------------------------------------
# The Passage-to-Move path (kogaki#1175, thread comment "Passage-to-Move
# path: approved 2026-09-23, with a condition"). One command: a Passage in,
# `specs/move-extraction-contract.md` authors a proposal, the proposal is
# checked against `moves/INDEX.md` for a near-duplicate, a selection screen
# is written as an artifact, and the write happens on the owner's recorded
# choice — never on any other act. This is the SAME division of labour the
# rest of the module holds: nothing here admits a Move, `save_accepted()` is
# still the only writer, and `--select accept` is the caller having already
# obtained the owner's choice, exactly as the ingest CLI's `accepted` list is.
# --------------------------------------------------------------------------

def build_passage_prompt(contract_text, passage_text, index_text):
    """The whole authorship input: the contract, the Passage, and the
    existing library — nothing else, per the contract's own opening line
    ("no other context is needed or permitted")."""
    return (
        contract_text.strip() + "\n\n"
        "## The Passage\n\n" + passage_text.strip() + "\n\n"
        "## The existing library (moves/INDEX.md)\n\n"
        + (index_text.strip() or "(empty — no Move has been saved yet)") + "\n\n"
        "Return exactly one record in the format the contract above states, "
        "and nothing else — no prose before or after it, no fence.\n"
    )


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


def segments_text(segments):
    """A Move's `segments` as one string of its Segments' `operation` and
    `relation` clauses, in order — what the near-duplicate check compares."""
    if not isinstance(segments, list):
        return ""
    return " ".join(
        "%s %s" % (_cell(s.get("operation")), _cell(s.get("relation")))
        for s in segments if isinstance(s, dict)
    )


def read_saved_segments(moves_dir):
    """`(id, segments text)` pairs read off every saved `.yaml` Move's own
    `segments` (kogaki#1412) — the structure the Adapter reads, never
    `moves/INDEX.md`, which nothing reads to decide anything."""
    if not os.path.isdir(moves_dir):
        return []
    rows = []
    for name in sorted(os.listdir(moves_dir)):
        if not name.endswith(MOVE_RECORD_EXT):
            continue
        mapping = read_saved(os.path.join(moves_dir, name))
        rows.append((str(mapping.get("id", "")), segments_text(mapping.get("segments"))))
    return rows


WORD = re.compile(r"[a-z]+")

# A near-duplicate is NAMED, never decided, here (§6.9's own division): word
# overlap on `segments` (kogaki#1412) is a cheap, deterministic signal that puts a
# candidate in front of the owner's one confirmation (thread comment
# 2026-09-23, "one confirmation is asked of the owner per suspected
# duplicate and none otherwise") — it is not a verdict, and a false positive
# costs one extra line on the screen rather than a silently skipped check.
DUPLICATE_THRESHOLD = 0.34


def near_duplicates(proposed_segments, saved_rows):
    words = set(WORD.findall(segments_text(proposed_segments).lower()))
    hits = []
    if not words:
        return hits
    for move_id, text in saved_rows:
        other = set(WORD.findall(text.lower()))
        if not other:
            continue
        overlap = len(words & other) / len(words | other)
        if overlap >= DUPLICATE_THRESHOLD:
            hits.append((move_id, overlap))
    hits.sort(key=lambda hit: -hit[1])
    return hits


def render_passage_screen(proposal, duplicates, rewritten=()):
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
    if duplicates:
        lines.append("suspected near-duplicate(s) in moves/:")
        for move_id, overlap in duplicates:
            lines.append("  - %s (Segment word overlap %.2f)" % (move_id, overlap))
    else:
        lines.append("no near-duplicate found in moves/")
    lines.append("")
    lines.append(render_move(proposal.mapping))
    lines.append("")
    lines.append("accept as new / merge into <id> / decline")
    return "\n".join(lines) + "\n"
