#!/usr/bin/env python3
"""PostToolUse carrier for a Terrain gate's captured answer (kogaki#890).

Design: kogaki#890, and the owner's selection at the /ship-cycle gate on
2026-09-05. Contract: specs/spec-gate-carrier/SPEC.md §10. Read them there —
this file restates neither.

WHAT THIS IS. The owner's answer at a declared gate is written HERE, by the
harness, at the moment the question is answered. It is not written by the
model, and `src/terrain.mjs` no longer accepts one: `--capture-option`,
`--capture-free-text` and `--tool-use-id` are removed and refused by name.

WHY IT IS A HOOK AND NOT AN ARGUMENT. The 2026-09-04 ruling (product-lab,
`q_a/staging/2026-09-04-a-harness-must-not-consume-model-output-as-control-input.md`)
separates SELECTORS from EVIDENCE: the model may say which thing to look at,
and may not supply the fact. *Which option the owner chose* and *that a
rendering happened* are facts about the world, so a run that reads them from
an argument reads the model's account of them. The failure is the dangerous
one rather than the loud one — a mis-transcribed option is admitted, the wait
completes, and the run advances on an answer the owner never gave: the right
act with the guard silently disabled.

THE JOIN IS ON A NONCE, NEVER ON CONTENT. Every raising of a gate mints a
`gate_instance_id` and writes an OPEN-GATE POINTER naming it. This hook
matches a payload to a pointer and writes the row under that id. The
alternative — matching a question to a declaration by its text and options —
was rejected on this repository's own evidence: a binding computed from
content identifies the content and never the instance, so it separates two
runs exactly when they differ and fails exactly when they are alike, which is
the pair a reader is least able to tell apart. Two entries over one settled
input compose identical options and therefore an identical digest.

AND WHERE THE MATCH IS STILL AMBIGUOUS, NOTHING IS WRITTEN. The pointer's
question text is used only to NARROW, never to choose: if two outstanding
pointers both match, this hook writes no row and says so. Picking one would be
the same silent misattribution one layer in, and the executor's own refusal —
"the harness recorded no answer for this gate" — is a stop the owner can act
on, which a row written against the wrong run is not.

WHERE IT WRITES. Into the capture path the pointer names, beside the run's own
declaration in the machine-local run workspace, which never enters the
committed tree. `KOGAKI_OPEN_GATES` overrides the pointer directory for tests;
the default is `~/.claude/kogaki-open-gates`.

EVERY FAILURE PATH RETURNS 0 AND SAYS SO ON STDERR. PostToolUse cannot deny
the call that already happened and cannot speak to the model, so this hook has
no way to turn its own failure into a refusal — and it does not need one: the
absence of a row IS the refusal, raised by the executor at the next re-entry.
A hook that crashed the session on a write it could not make would convert a
recoverable stop into a lost run.
"""

import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


def pointer_dir():
    return Path(os.environ.get("KOGAKI_OPEN_GATES")
                or os.path.expanduser("~/.claude/kogaki-open-gates"))


def note(msg):
    print(f"write-gate-capture: {msg}", file=sys.stderr)


def option_set_digest(gate_id, option_ids):
    """The option-set binding, byte-identical to src/compose.mjs's.

    Two writers of one digest is a divergence waiting to happen, and it is
    accepted here for the reason the seam forces: this side is Python in a
    harness hook and that side is JavaScript in the runtime, so there is no
    shared module to put it in. What removes the risk is that the canonical
    form is a two-element JSON array and nothing else, and that
    `checks/check-gate-capture-hook.sh` computes one and compares it to the
    other on a fixture rather than trusting the two to agree by reading.
    """
    canonical = json.dumps([gate_id, list(option_ids)], separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def answers_of(payload):
    """The owner's answers, verbatim, as {question text: answer label}.

    Verbatim is the point, and it is the same point `record-gate-disposition.py`
    makes one store over: a value the model summarised is a value that can
    disagree with what was clicked, which is the whole reason this lives in a
    hook.
    """
    resp = payload.get("tool_response")
    if isinstance(resp, dict):
        answers = resp.get("answers")
        if isinstance(answers, dict):
            return {str(k): str(v) for k, v in answers.items()}
    return {}


def load_pointers():
    d = pointer_dir()
    if not d.is_dir():
        return []
    out = []
    for p in sorted(d.glob("*.json")):
        try:
            with open(p, encoding="utf-8") as f:
                doc = json.load(f)
        except Exception:                                         # noqa: BLE001
            note(f"pointer {p.name} is unreadable and was skipped "
                 "(a finding, not a skip: its gate will refuse at re-entry)")
            continue
        doc["_pointer_path"] = p
        out.append(doc)
    return out


def resolve_answer(declaration, label):
    """Map the clicked LABEL back to the option id the declaration offered.

    The harness reports what the owner saw, which is the label; the record is
    keyed on the id. An answer matching no label is free text — that is the
    "Other" affordance, which every gate here declares on — and it is stored as
    free text rather than coerced into an id it does not name.
    """
    for opt in declaration.get("options") or []:
        if str(opt.get("label", "")) == label:
            return {"option": str(opt.get("id"))}
    return {"free_text": label}


def write_row(pointer, tool_use_id, label):
    decl_path = Path(pointer["declaration_path"])
    cap_path = Path(pointer["capture_path"])
    try:
        with open(decl_path, encoding="utf-8") as f:
            declaration = json.load(f)
    except Exception as exc:                                      # noqa: BLE001
        note(f"declaration {decl_path} is unreadable ({exc}); no row was "
             "written and the gate will refuse at re-entry")
        return False

    option_ids = [str(o.get("id")) for o in declaration.get("options") or []]
    row = {
        "stop_id": f"stop-{pointer['gate_instance_id']}",
        "gate_id": pointer["gate_id"],
        "gate_instance_id": pointer["gate_instance_id"],
        "evidence": {"tool": "AskUserQuestion", "tool_use_id": tool_use_id},
        "answers_over": {
            "option_set_digest": option_set_digest(pointer["gate_id"], option_ids),
        },
        "payload": {
            "options_offered": option_ids,
            "free_text_offered": True,
            "answer": resolve_answer(declaration, label),
        },
        "captured_at": datetime.now(timezone.utc).isoformat(),
    }

    doc = {"rows": []}
    if cap_path.exists():
        try:
            with open(cap_path, encoding="utf-8") as f:
                doc = json.load(f)
        except Exception as exc:                                  # noqa: BLE001
            note(f"capture {cap_path} exists and is unreadable ({exc}); "
                 "no row was written, and it is NOT replaced — overwriting a "
                 "capture would discard owner answers this hook cannot read")
            return False
    doc.setdefault("rows", []).append(row)
    try:
        cap_path.parent.mkdir(parents=True, exist_ok=True)
        with open(cap_path, "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=2)
            f.write("\n")
    except Exception as exc:                                      # noqa: BLE001
        note(f"capture {cap_path} could not be written ({exc}); the gate will "
             "refuse at re-entry")
        return False
    return True


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:                                             # noqa: BLE001
        return 0
    if payload.get("tool_name") != "AskUserQuestion":
        return 0

    answers = answers_of(payload)
    if not answers:
        # Not a finding: the owner may have interrupted, and a question this
        # repository did not raise is answered here every day.
        return 0
    tool_use_id = payload.get("tool_use_id")
    if not isinstance(tool_use_id, str) or not tool_use_id:
        note("the payload carries no tool_use_id — the one field tying a row "
             "to a question the harness actually asked — so no row was written")
        return 0

    pointers = load_pointers()
    if not pointers:
        return 0

    for question, label in answers.items():
        matching = [p for p in pointers if str(p.get("question", "")) == question]
        if not matching:
            continue
        if len(matching) > 1:
            # NOTHING IS WRITTEN, and the ambiguity is named. See the module
            # docstring: choosing here would be the misattribution the nonce
            # exists to prevent, arriving through the narrowing step instead.
            note(f"{len(matching)} outstanding gates carry the question "
                 f"{question!r} — this hook does not choose between them, so "
                 "no row was written for any of them. Their instance ids: "
                 + ", ".join(str(p.get("gate_instance_id")) for p in matching))
            continue
        pointer = matching[0]
        if write_row(pointer, tool_use_id, label):
            try:
                pointer["_pointer_path"].unlink()
            except OSError as exc:
                note(f"the row was written but pointer "
                     f"{pointer['_pointer_path']} could not be removed ({exc}); "
                     "a later question with the same text will read as ambiguous")
    return 0


if __name__ == "__main__":
    sys.exit(main())
