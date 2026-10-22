"""The Extraction step of the Move ingest (kogaki#1463): the Extraction reader,
its checks, and the mechanical derivation of a Move from it."""

import os
import re

from .records import (
    DIMENSIONS, Refusal, validate_move, yaml_read,
)
from .library import (
    Proposal, merge_into, save_accepted,
)
from .passage import (
    WORD, _cell, near_duplicates, read_saved_segments, render_passage_screen,
)


# --------------------------------------------------------------------------
# THE EXTRACTION IS A YAML RECORD (kogaki#1413). passages/FORMAT.md's sections
# are its keys: `reader` a map of dimension rows, `segments` a list of
# Segment maps, `breaks` a list of prose
# tests. Every reader below takes the PARSED record, read by `src/yaml.mjs`;
# none scans Markdown, so no file-specific hierarchy rule survives here. A
# Markdown Extraction is refused by name.
# --------------------------------------------------------------------------

EXTRACTION_EXT = ".yaml"
# The heading every Markdown Extraction opened with — what tells a retired
# Extraction from a bare Passage handed to the Passage path.
MARKDOWN_EXTRACTION_SIGN = re.compile(r"^#\s*Extraction:", re.M)


def read_extraction(path):
    """`(text, record)` for the file at `path`: an Extraction `.yaml` file
    parsed to its record, or a bare Passage with `record` None. A Markdown
    Extraction is refused by name, as is a `.yaml` file that is not a map."""
    with open(path, encoding="utf-8") as handle:
        text = handle.read()
    if path.endswith(EXTRACTION_EXT):
        record = yaml_read(path)
        if not isinstance(record, dict):
            raise Refusal("extraction-form", "%s is not an Extraction record — "
                          "a map of passages/FORMAT.md's fields" % path)
        return text, record
    if MARKDOWN_EXTRACTION_SIGN.search(text):
        raise Refusal(
            "extraction-form",
            "%s is a Markdown Extraction — an Extraction is a YAML record "
            "(passages/FORMAT.md \"The Extraction\", kogaki#1413), read by the "
            "Brief's YAML reader, and the Markdown form is refused by name "
            "rather than scanned" % path,
        )
    return text, None


def extraction_rows(record):
    """Section 2's rows, `{dimension: (before, after, segment)}`, in the
    dimensions' order, for each dimension the record carries."""
    reader = (record or {}).get("reader")
    if not isinstance(reader, dict):
        return {}
    rows = {}
    for dim in DIMENSIONS:
        row = reader.get(dim)
        if not isinstance(row, dict):
            continue
        rows[dim] = (_cell(row.get("before")), _cell(row.get("after")),
                     _cell(row.get("segment")))
    return rows


def _is_unchanged(cell):
    return cell.strip().lower() == "unchanged"


# --------------------------------------------------------------------------
# The question BEFORE the passage, read off the Extraction (kogaki#1216).
# --------------------------------------------------------------------------
#
# Where the Extraction's `reader` `question` row reads `none` BEFORE (alone or
# followed by a hedge), the proposal's `before.question` is written
# `holds: none.` -- never a composed question. Applied before the screen
# renders, and the screen names the rewrite so it is never silent.
NONE_QUESTION = re.compile(r"^\s*none\b", re.I)


def extraction_question_before(record):
    """The BEFORE cell of the Extraction's `question` row, stripped, or None
    where there is no record or no such row (a bare Passage)."""
    row = extraction_rows(record).get("question")
    return row[0] if row else None


def write_none_question(mapping, record):
    """Where the Extraction records the question before the passage as none,
    write `holds: none.` into the proposal's `before.question` and return the
    fields rewritten; otherwise leave the mapping untouched and return []."""
    before_cell = extraction_question_before(record)
    if before_cell is None or not NONE_QUESTION.match(before_cell):
        return []
    before = mapping.get("before")
    if isinstance(before, dict) and "question" in before and before["question"] != "holds: none.":
        before["question"] = "holds: none."
        return ["before"]
    return []


# --------------------------------------------------------------------------
# Subject nouns, read off the Extraction (kogaki#1284).
# --------------------------------------------------------------------------
#
# specs/move-extraction-contract.md requires `breaks` to be subject-free.
# The Extraction lists its own `subject_nouns` — the nouns naming what the
# Passage is about, offered by the model and confirmed or edited by the
# human — and this is the mechanical half: a record whose `breaks` contains
# one of them is refused, naming the noun and the field.
# The deny list is PER PASSAGE; no global word list exists, and an
# Extraction that lists none refuses nothing.
SUBJECT_NOUN_FIELDS = ("breaks",)


def extraction_subject_nouns(record):
    """The Extraction's `subject_nouns`, lower-cased, or `[]` where there is
    no record or the list is absent or empty."""
    nouns = (record or {}).get("subject_nouns")
    if not isinstance(nouns, list):
        return []
    return [str(n).strip().lower() for n in nouns if str(n).strip()]


def check_subject_nouns(mapping, record, line_no):
    """A record whose `breaks` names a noun the Extraction
    lists under `subject_nouns` is refused, naming the noun and the field.
    Returns a `Refusal`, or `None` where nothing is refused."""
    nouns = extraction_subject_nouns(record)
    if not nouns:
        return None
    for field in SUBJECT_NOUN_FIELDS:
        value = mapping.get(field)
        if isinstance(value, list):
            value = " ".join(str(v) for v in value)
        if not isinstance(value, str):
            continue
        words = set(WORD.findall(value.lower()))
        for noun in nouns:
            if noun in words:
                return Refusal(
                    "subject-noun",
                    "`%s` names subject noun `%s`, which the Extraction lists "
                    "under `subject_nouns`" % (field, noun),
                    line_no=line_no,
                )
    return None


# --------------------------------------------------------------------------
# `reader`'s dimension/Segment pairing, and the `split_notes` entries
# (kogaki#1319). Both read the Extraction as given, before the model is
# spawned: a defect in the Extraction itself, never a defect the extraction
# step could have caused.
# --------------------------------------------------------------------------

def check_extraction_dimensions(record, line_no=None):
    """`passages/FORMAT.md` §2: every cell of the reader-dimension rows
    defaults to "unchanged"; a row that records a change on either side
    names the Segment, by number, that moved it. A changed row with no
    Segment named is refused, naming the dimension. Returns a `Refusal`,
    or `None`."""
    for dim, (before, after, segment) in extraction_rows(record).items():
        if _is_unchanged(before) and _is_unchanged(after):
            continue
        if not segment:
            return Refusal(
                "dimension-segment",
                "the `%s` row of `reader` records a change naming no "
                "Segment" % dim,
                line_no=line_no,
            )
    return None


# --------------------------------------------------------------------------
# The paragraph unit (kogaki#1358, design on kogaki#1329): two levels, no
# more. A paragraph Extraction carries `unit: paragraph <N> of <M> in <slug>`;
# a Passage-level Extraction lists its paragraphs under `contains`. A
# `contains` on a paragraph Extraction would make a third level, so it is
# refused BEFORE anything is derived, naming the field.
# --------------------------------------------------------------------------

def check_paragraph_level(record):
    """`passages/FORMAT.md` "The paragraph unit": `contains` on a
    `unit: paragraph` Extraction is refused, naming the field. Returns a
    `Refusal`, or `None`."""
    record = record or {}
    if not _cell(record.get("unit")).startswith("paragraph"):
        return None
    if record.get("contains") in (None, "", []):
        return None
    return Refusal(
        "paragraph-contains",
        "a `unit: paragraph` Extraction carries `contains` — two levels, no "
        "more; only a Passage-level Extraction lists the paragraphs it contains",
    )


def check_extraction_split_note(record, line_no=None):
    """`passages/FORMAT.md` §8: an entry of `split_notes` names a second unit
    inside the Passage and refuses ingestion, naming the note, until it is
    dismissed by repeating it verbatim as its `dismissed`. Returns a
    `Refusal`, or `None`."""
    notes = (record or {}).get("split_notes")
    if not isinstance(notes, list):
        return None
    for entry in notes:
        note = _cell(entry.get("note") if isinstance(entry, dict) else entry)
        dismissed = _cell(entry.get("dismissed")) if isinstance(entry, dict) else ""
        if note and dismissed != note:
            return Refusal(
                "split-note",
                "`split_notes` carries an undismissed split note: %r" % note,
                line_no=line_no,
            )
    return None


# --------------------------------------------------------------------------
# `segments`, copied from the Extraction's `segments` (kogaki#1320, kogaki#1367,
# kogaki#1413, kogaki#1414).
# --------------------------------------------------------------------------
#
# Each Segment map carries `opening`, `content`, the subject-free `operation`
# (`does` until kogaki#1510), after the first `relation` in prose, and, where
# the Extractor found a technique the two cannot name, `manner`; no label set is
# read (kogaki#1414). `opening` and `content` are for the owner's reading and
# are not copied. Segment 1 carries no `relation` (kogaki#1510); one that does is
# copied as it stands, and the Adapter refuses it, since a Move carries no
# relation to what precedes it (kogaki#1411).

# AN ENTRY IS READ AS A SEGMENT OR REFUSED, NEVER DROPPED (kogaki#1416). Every
# entry of `segments` is copied into the Move, in order, so the Move never
# carries fewer Segments than the Extraction lists. An entry carrying a key
# outside SEGMENT_ENTRY_KEYS is refused by name rather than read in part; whether
# the copied `operation`, `relation` and `manner` are a Segment is the Adapter's question
# (`validateMoveRecord`, reached through `validate_move`, kogaki#1418), asked
# once, so the ingest carries no second reading of the Segment's shape. A
# `reader` row naming a Segment the list does not hold is the Extraction
# disagreeing with its own count, and is refused naming that Segment.
SEGMENT_ENTRY_KEYS = ("opening", "content", "operation", "relation", "manner")


def extraction_segments(record, line_no=None):
    """The ordered Segments of the Extraction's `segments` as the Move's own
    `segments` value: `[{"operation": ...}, {"operation": ..., "relation":
    ...}, ...]`, one per entry, each carrying `manner` where the entry fills
    one. Returns `None` where there is no record or it carries no
    `segments`, and raises `Refusal` naming the entry where it is not a map
    or carries a key a Segment entry does not, or naming the Segment where a
    `reader` row names one the list does not hold."""
    entries = (record or {}).get("segments")
    if entries is None:
        return None
    if not isinstance(entries, list):
        raise Refusal("segments", "`segments` is not a list of "
                      "Segment maps", line_no=line_no)
    segments = []
    for index, entry in enumerate(entries):
        number = index + 1
        if not isinstance(entry, dict):
            raise Refusal("segments", "Segment %d is not a map" % number, line_no=line_no)
        unknown = [k for k in entry if k not in SEGMENT_ENTRY_KEYS]
        if unknown:
            raise Refusal(
                "segments",
                "Segment %d carries `%s` — an entry of `segments` carries %s "
                "and nothing else, so it cannot be read as a Segment"
                % (number, unknown[0], ", ".join("`%s`" % k for k in SEGMENT_ENTRY_KEYS)),
                line_no=line_no,
            )
        segment = {"operation": _cell(entry.get("operation"))}
        if index > 0 or _cell(entry.get("relation")):
            segment["relation"] = _cell(entry.get("relation"))
        if _cell(entry.get("manner")):
            segment["manner"] = _cell(entry.get("manner"))
        segments.append(segment)
    check_reader_segment_numbers(record, len(segments), line_no)
    return segments


def check_reader_segment_numbers(record, count, line_no=None):
    """Every Segment number a `reader` row's `segment` cell names (`3`, or
    `4, 6`) is one of the `count` Segments `segments` lists; a row naming
    any other is refused, naming the row and the Segment."""
    for dim, (_before, _after, cell) in extraction_rows(record).items():
        for token in [t.strip() for t in cell.split(",") if t.strip()]:
            if not token.isdigit() or not 1 <= int(token) <= count:
                raise Refusal(
                    "segments",
                    "the `%s` row of `reader` names Segment %s, and `segments` "
                    "lists %d — the Extraction disagrees with its own Segment "
                    "count" % (dim, token, count),
                    line_no=line_no,
                )


def check_segments(mapping, record, line_no):
    """Copy the Extraction's ordered Segments into the record's own
    `segments`. Returns `(Refusal, None)` where the Extraction carries no
    `segments` to copy from, where `extraction_segments` refuses an entry
    or the count, or where the record already carried a
    `segments` value that disagrees with the copy — the model is never asked
    to write or reorder Segments, so a value it supplied anyway is a defect,
    not an alternative reading. Otherwise returns `(None, <the list>)`."""
    try:
        segments = extraction_segments(record, line_no=line_no)
    except Refusal as refusal:
        return refusal, None
    if segments is None:
        return Refusal(
            "segments",
            "the record carries no `segments` — the Extraction carries no "
            "`segments` for the tool to copy it from",
            line_no=line_no,
        ), None
    existing = mapping.get("segments")
    if existing is not None and existing != segments:
        return Refusal(
            "segments",
            "`segments` does not match the Extraction's `segments` — the "
            "model is never asked to write or reorder Segments, and this "
            "record's `segments` disagrees with the copy",
            line_no=line_no,
        ), None
    return None, segments


# --------------------------------------------------------------------------
# `--from-extraction` (kogaki#1358, design on kogaki#1329): the record is READ
# off a written Extraction, never authored by a model. Every Move field comes
# from one Extraction field, the table passages/FORMAT.md "Where each field
# goes" states: `id` is `name`, `before` and `after` are `reader`'s changed
# rows only, `description` is `description` (kogaki#1412) and `breaks` is
# `breaks` (kogaki#1377), and `segments` is the Extraction's `segments` exactly as `check_segments`
# copies it on the Passage path.
# --------------------------------------------------------------------------
MOVE_ID = re.compile(r"^[a-z0-9_]+$")


def changed_dimension_rows(record):
    """Section 2's rows whose `after` is not `unchanged`, in the dimensions'
    order, each `(dimension, before, after, segment)`."""
    return [(dim, before, after, segment)
            for dim, (before, after, segment) in extraction_rows(record).items()
            if after and not _is_unchanged(after)]


def extraction_breaks(record):
    """`breaks`: a list of prose tests (kogaki#1414), each test
    one line. `None` where the record carries none or an empty list; raises
    `Refusal` where it is not a list of non-empty strings."""
    tests = (record or {}).get("breaks")
    if tests in (None, []):
        return None
    if not isinstance(tests, list) or any(not _cell(x) for x in tests):
        raise Refusal(
            "from-extraction",
            "`breaks` is not a list of prose tests -- one entry "
            "per test, each a change and what the reader loses",
        )
    return [_cell(x) for x in tests]


def derive_from_extraction(record, line_no=1):
    """The proposal `--from-extraction` offers for one Extraction record, as
    a `Proposal` carrying its `Refusal` where the Extraction cannot supply a
    field. Nothing here is judged: every value is a copy of a field."""
    try:
        # Not `check_extraction_dimensions`: under m2 rule 3 every `before`
        # cell is carried in full, so only an `after` other than `unchanged`
        # is a change, and only a change owes its Segment.
        for refusal in (check_paragraph_level(record),
                        check_extraction_split_note(record)):
            if refusal is not None:
                raise refusal
        move_id = _cell(record.get("name"))
        if not MOVE_ID.match(move_id):
            raise Refusal(
                "from-extraction",
                "`name` carries no Move id -- got %r" % move_id,
            )
        rows = changed_dimension_rows(record)
        for dim, _before, _after, segment in rows:
            if not segment:
                raise Refusal(
                    "dimension-segment",
                    "the `%s` row of `reader` records a change naming no "
                    "Segment" % dim,
                )
        if not rows:
            raise Refusal(
                "from-extraction",
                "`reader` records no changed row, so there is no `before` "
                "or `after` to read",
            )
        description = _cell(record.get("description"))
        if not description:
            raise Refusal(
                "from-extraction",
                "`description` carries no text",
            )
        breaks = extraction_breaks(record)
        if breaks is None:
            raise Refusal(
                "from-extraction",
                "`breaks` carries no test",
            )
        mapping = {
            "id": move_id,
            "before": {dim: before for dim, before, _a, _s in rows},
            "after": {dim: after for dim, _b, after, _s in rows},
            "description": description,
            "breaks": breaks,
        }
        segments_refusal, segments = check_segments(mapping, record, line_no)
        if segments_refusal is not None:
            raise segments_refusal
        if not segments:
            raise Refusal(
                "segments",
                "`segments` carries no Segment",
            )
        mapping["segments"] = segments
        validate_move(mapping, line_no)
    except Refusal as refusal:
        return Proposal(line_no, refusal=refusal)
    return Proposal(line_no, mapping=mapping)


def run_from_extraction(extraction_paths, moves_dir, out_dir, select=None):
    """The `--from-extraction` path: one proposal per Extraction, shown on one
    screen, written only on the owner's recorded choice. `accept` writes
    every admitted proposal, `decline` writes nothing, and `merge:<id>`
    is admitted only for a single Extraction."""
    proposals = []
    for path in extraction_paths:
        if not path.endswith(EXTRACTION_EXT):
            raise Refusal(
                "extraction-form",
                "%s is not an Extraction record -- `--from-extraction` reads a "
                "`.yaml` Extraction (kogaki#1413), and a Markdown Extraction is "
                "refused by name" % path,
            )
        _text, record = read_extraction(path)
        proposals.append(derive_from_extraction(record))

    saved_rows = read_saved_segments(moves_dir)
    screens = []
    for proposal in proposals:
        duplicates = []
        if proposal.admitted:
            duplicates = near_duplicates(proposal.mapping.get("segments"),
                                          saved_rows)
        screens.append(render_passage_screen(proposal, duplicates))

    os.makedirs(out_dir, exist_ok=True)
    screen_path = os.path.join(os.path.abspath(out_dir), "PassageScreen.md")
    with open(screen_path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(screens))

    result = {"screen": screen_path, "proposals": proposals, "written": None}
    if select is None:
        return result

    refused = [p for p in proposals if not p.admitted]
    if refused:
        raise Refusal(
            "from-extraction",
            "%d proposal(s) refused (%s); nothing to select against"
            % (len(refused), "; ".join(str(p.refusal) for p in refused)),
        )
    if select == "accept":
        result["written"] = save_accepted(moves_dir, proposals)
        return result
    if select == "decline":
        return result
    if select.startswith("merge:") and len(proposals) == 1:
        result["written"] = [merge_into(moves_dir, select[len("merge:"):], proposals[0])]
        return result
    raise Refusal(
        "from-extraction",
        "--select must be `accept`, `decline`, or (for one Extraction) "
        "`merge:<id>` — got %r" % select,
    )
