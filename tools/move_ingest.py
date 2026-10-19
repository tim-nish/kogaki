#!/usr/bin/env python3
"""Move ingestion — the mechanical half of SPEC-draft-pipeline §6.9.

This command and its package `move_ingest_modules/` (kogaki#1463) own what
§6.9 makes MECHANICAL: parsing records under §6.9.0's grammar, validating each
through the Adapter's contract (`validate_move`, kogaki#1418), rendering a
saved file, the near-duplicate check and regenerating moves/INDEX.md. An
Extraction is untrusted input, refused rather than repaired.

It owns NOTHING §6.9 makes JUDGMENT: `save_accepted()` is called with the ids
the owner selected at the question. §6.9: "ADMISSION IS THE OWNER'S ACT AT
THAT QUESTION, never the command's."
"""

import argparse
import os
import re
import sys

# The four modules under tools/move_ingest_modules/ (kogaki#1463). Names the
# checks and src/proof-sheet/leg-run.mjs read from this module stay bound here.
from move_ingest_modules.records import (
    Refusal, validate_move, yaml_write,
)
from move_ingest_modules.library import (
    Proposal, merge_into, read_proposals, save_accepted, write_index,
)
from move_ingest_modules.passage import (
    _cell, build_passage_prompt, near_duplicates, read_saved_segments,
    render_passage_screen, spawn_model,
)
from move_ingest_modules.extraction import (
    check_extraction_dimensions, check_extraction_split_note, check_segments,
    check_subject_nouns, derive_from_extraction, read_extraction,
    run_from_extraction, write_none_question,
)


def run_passage(passage_path, contract_path, moves_dir, command, model,
                 out_dir, timeout_s, select=None):
    """The whole path, minus the write, unless `select` carries the owner's
    already-obtained choice.

    The model is spawned AT MOST ONCE PER `out_dir`: a `raw.txt` already
    there is read back rather than re-asked, so the two-call shape a
    selection needs — one call to produce the screen, a second carrying
    `--select` once the owner has chosen — never spends the authorship step
    twice on one Passage.
    """
    passage_text, record = read_extraction(passage_path)
    with open(contract_path, encoding="utf-8") as handle:
        contract_text = handle.read()

    # BEFORE the model is called (kogaki#1319): both checks read the
    # Extraction as given, and a defect in it is never the extraction step's
    # to catch.
    dimension_refusal = check_extraction_dimensions(record)
    if dimension_refusal is not None:
        raise dimension_refusal
    split_refusal = check_extraction_split_note(record)
    if split_refusal is not None:
        raise split_refusal

    os.makedirs(out_dir, exist_ok=True)
    out_dir = os.path.abspath(out_dir)
    raw_path = os.path.join(out_dir, "raw.txt")

    if os.path.isfile(raw_path):
        with open(raw_path, encoding="utf-8") as handle:
            raw = handle.read()
    else:
        index_path = os.path.join(moves_dir, "INDEX.md")
        index_text = ""
        if os.path.isfile(index_path):
            with open(index_path, encoding="utf-8") as handle:
                index_text = handle.read()
        prompt = build_passage_prompt(contract_text, passage_text, index_text)
        raw = spawn_model(command, model, prompt, timeout_s, cwd=out_dir)
        with open(raw_path, "w", encoding="utf-8") as handle:
            handle.write(raw)

    proposals = read_proposals(raw)
    if len(proposals) != 1:
        raise Refusal(
            "passage",
            "the model returned %d record(s); the Passage-to-Move path admits "
            "exactly one" % len(proposals),
        )
    proposal = proposals[0]

    if proposal.admitted:
        # BEFORE anything else (kogaki#1284): a record naming a subject noun
        # the Extraction lists is not merely rewritten, it is refused outright.
        subject_refusal = check_subject_nouns(
            proposal.mapping, record, proposal.line_no)
        if subject_refusal is not None:
            proposal = Proposal(proposal.line_no, refusal=subject_refusal)

    if proposal.admitted:
        # The Extraction's ordered Segments, copied into the record itself
        # (kogaki#1320) — never asked of the model.
        segments_refusal, segments = check_segments(
            proposal.mapping, record, proposal.line_no)
        if segments_refusal is not None:
            proposal = Proposal(proposal.line_no, refusal=segments_refusal)
        else:
            proposal.mapping["segments"] = segments

    if proposal.admitted:
        # The Extraction's `description`, copied the same way (kogaki#1412),
        # then the whole record validated through the Adapter (kogaki#1418).
        description = _cell((record or {}).get("description"))
        proposal.mapping.pop("description", None)
        if description:
            proposal.mapping["description"] = description
        try:
            validate_move(proposal.mapping, proposal.line_no)
        except Refusal as refusal:
            proposal = Proposal(proposal.line_no, refusal=refusal)

    duplicates = []
    rewritten = []
    if proposal.admitted:
        # BEFORE the screen and before any near-duplicate read (kogaki#1216):
        # the owner accepts the rewritten record, and the rewrite is named on
        # the screen rather than applied in silence.
        rewritten = write_none_question(proposal.mapping, record)
        duplicates = near_duplicates(proposal.mapping.get("segments"),
                                      read_saved_segments(moves_dir))

    screen_path = os.path.join(out_dir, "PassageScreen.md")
    with open(screen_path, "w", encoding="utf-8") as handle:
        handle.write(render_passage_screen(proposal, duplicates, rewritten))

    result = {
        "raw": raw_path, "screen": screen_path, "proposal": proposal,
        "duplicates": duplicates, "written": None,
    }

    if select is None:
        return result

    if not proposal.admitted:
        raise Refusal(
            "passage",
            "the proposed record was refused (%s); nothing to select against"
            % proposal.refusal,
        )

    if select == "accept":
        result["written"] = save_accepted(moves_dir, [proposal])
        return result
    if select == "decline":
        return result
    if select.startswith("merge:"):
        target_id = select[len("merge:"):]
        result["written"] = [merge_into(moves_dir, target_id, proposal)]
        return result
    raise Refusal(
        "passage",
        "--select must be `accept`, `decline`, or `merge:<id>` — got %r" % select,
    )


# --------------------------------------------------------------------------
# CLI — proposals only. It never saves; saving needs the owner's selection.
# --------------------------------------------------------------------------

# A verdict, score or status token arrives in one of two shapes: a bare token
# (`clean`, `PASS`, `7/10`) or a `key: value` pair (`judgment: clean` — the
# 2026-08-16 specimen). §6.9.2's construction constraint makes such a token
# UNRENDERABLE on a row rather than prohibited: a reading is a prose judgment
# ("this proposes a split", "these two are near-duplicates"), so a value in
# either token shape is refused at render. This is a FORM floor, not a content
# lint — the same class as the trim label's effect-stating floor — and the
# record half needs no check at all: no record field except `id` ever reaches
# a row, so a verdict smuggled into a field has no way into the rendering.
VERDICT_SHAPE = re.compile(r"^\s*(?:[\w./-]+|[\w-]+\s*:\s*[\w./-]+)\s*$")


def render_proposals(proposals, readings=None):
    """The count line §6.9.0 requires, plus one line per proposal.

    The PARSED RECORD COUNT is printed FIRST and unconditionally: it is the
    only instrument that catches `1` where the owner wrote `22`.

    `readings` is the review's typed input, id -> prose reading (story 1.70).
    A reading naming an id outside the parsed set REFUSES, since a dropped
    reading is the row loss §6.9.2's count line exists to show. An id with
    no reading renders no reading line.
    """
    readings = dict(readings or {})
    known = set(p.id for p in proposals if p.admitted and p.id)
    strangers = sorted(set(readings) - known)
    if strangers:
        raise Refusal(
            "stranger-reading",
            "readings name id(s) outside the parsed set: %s — parsed ids: %s"
            % (", ".join(strangers), ", ".join(sorted(known)) or "(none)"),
        )
    for move_id, value in sorted(readings.items()):
        if not isinstance(value, str) or VERDICT_SHAPE.match(value):
            raise Refusal(
                "verdict-shaped-reading",
                "the reading for %r is a bare token or key:value pair (%r) — a "
                "verdict, score or status shape. A reading is a prose judgment "
                "(\u00a76.9.2: readings, and silence "
                "where there is nothing to say)" % (move_id, value),
            )

    lines = [
        "parsed records: %d  (admitted %d, refused %d)"
        % (
            len(proposals),
            sum(1 for p in proposals if p.admitted),
            sum(1 for p in proposals if not p.admitted),
        ),
        "",
    ]
    for proposal in proposals:
        if proposal.admitted:
            note = ""
            if proposal.stripped:
                note = "  [stripped: %s]" % ", ".join(proposal.stripped)
            lines.append("  line %-5d ok      %s%s" % (proposal.line_no, proposal.id, note))
            reading = readings.get(proposal.id)
            if reading:
                # An em-dash continuation, deliberately not a `key: value`
                # line — the reading's own carrier must not wear the one
                # shape the floor above refuses.
                lines.append("            \u2014 %s" % reading.strip())
        else:
            lines.append("  line %-5d REFUSED %s" % (proposal.line_no, proposal.refusal))
    return "\n".join(lines)


def main(argv=None):
    """Dispatches to the `passage` subcommand, or to the owner-authored-file
    ingestion path §6.9 has always run — `passage` is a sibling command, not
    a replacement, so an existing invocation with no first-token `passage` is
    unchanged."""
    argv = sys.argv[1:] if argv is None else list(argv)
    if argv and argv[0] == "passage":
        return main_passage(argv[1:])
    return main_ingest(argv)


# The flag's old spelling (kogaki#1369): the component it names is the
# Extraction, so `--from-analysis` is refused by name rather than kept as an
# alias, pointing at the one spelling that runs.
RETIRED_FROM_FLAG = "--from-analysis"


def main_passage(argv):
    for arg in argv:
        if arg == RETIRED_FROM_FLAG or arg.startswith(RETIRED_FROM_FLAG + "="):
            sys.stderr.write(
                "refused: %s is retired -- the record is the Extraction now; "
                "use --from-extraction\n" % RETIRED_FROM_FLAG)
            return 2
    parser = argparse.ArgumentParser(
        prog="move_ingest.py passage",
        description="The Passage-to-Move path (kogaki#1175): a Passage in, one "
        "Move authored against specs/move-extraction-contract.md, checked "
        "against moves/INDEX.md for a near-duplicate, offered at one selection "
        "screen. Nothing is written to moves/ before --select accept.",
    )
    parser.add_argument("passage", nargs="?", help="the Passage text file")
    parser.add_argument(
        "--from-extraction", nargs="+", metavar="EXTRACTION",
        help="one or more written Extractions (one Passage's paragraph "
        "Extractions, passages/FORMAT.md \"The paragraph unit\"): each record "
        "is read off its Extraction record -- id from `name`, before/after from "
        "`reader`'s changed rows, segments from `segments` -- and no model "
        "is called",
    )
    parser.add_argument("--model", help="the pinned model id for the authorship step")
    parser.add_argument("--command", default="claude",
                         help="the model command (default: claude)")
    parser.add_argument(
        "--contract",
        default=os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "specs", "move-extraction-contract.md",
        ),
        help="path to specs/move-extraction-contract.md",
    )
    parser.add_argument("--out", help="the run directory (raw.txt, PassageScreen.md)")
    parser.add_argument("--timeout", type=int, default=600, help="per-call bound in seconds")
    parser.add_argument("--select", help="the owner's recorded choice: accept, decline, or merge:<id>")
    args = parser.parse_args(argv)

    if args.from_extraction:
        if args.passage or not args.out:
            parser.error("--from-extraction takes no Passage file and requires --out")
        try:
            result = run_from_extraction(args.from_extraction, "moves",
                                       args.out, select=args.select)
        except Refusal as refusal:
            sys.stderr.write("refused: %s\n" % refusal)
            return 1
        print("proposals -- see %s" % result["screen"])
        if result["written"]:
            print("accepted -- wrote %s" % ", ".join(result["written"]))
        return 0

    if not args.passage or not args.model or not args.out:
        parser.error("a Passage file, --model and --out are required")

    try:
        result = run_passage(args.passage, args.contract, "moves",
                              args.command, args.model, args.out, args.timeout,
                              select=args.select)
    except Refusal as refusal:
        sys.stderr.write("refused: %s\n" % refusal)
        return 1

    print("proposal at %s -- see %s" % (result["raw"], result["screen"]))
    if result["written"]:
        print("accepted -- wrote %s" % ", ".join(result["written"]))
    return 0


def main_ingest(argv=None):
    parser = argparse.ArgumentParser(
        description="Move ingestion: split, admit, normalize. Saves nothing — "
        "admission is the owner's act at the accept/decline question."
    )
    parser.add_argument("input", nargs="?", help="the owner-authored Moves file")
    parser.add_argument("--readings", help="JSON file mapping id -> prose reading "
                        "(the review's typed input; mirrors Terrain's --claims file pattern)")
    args = parser.parse_args(argv)

    if not args.input:
        parser.error("an input file is required")

    with open(args.input) as handle:
        text = handle.read()

    try:
        proposals = read_proposals(text)
    except Refusal as refusal:
        sys.stderr.write("refused: %s\n" % refusal)
        return 1

    readings = None
    if args.readings:
        import json
        with open(args.readings) as handle:
            readings = json.load(handle)

    # The proposal list is SHOWN, and it is shown BEFORE the accept/decline
    # question rather than written to a file (owner ruling 2026-09-04). Its
    # first line is the parsed-record count, which is the only instrument that
    # can catch `1` where the owner wrote `22`, so the rendering carries its
    # own completeness evidence wherever it is read.
    try:
        rendering = render_proposals(proposals, readings)
    except Refusal as refusal:
        sys.stderr.write("refused: %s\n" % refusal)
        return 1
    print(rendering)
    return 0


if __name__ == "__main__":
    sys.exit(main())
