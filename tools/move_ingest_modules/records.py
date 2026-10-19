"""The record reader and validator of the Move ingest (kogaki#1463): the
§6.9.0 grammar, the YAML calls through `src/yaml.mjs`, and `validate_move`,
which asks the Adapter and carries no type check of its own."""

import json
import os
import re
import subprocess


# §4.2's five fields, in §4.2's order (kogaki#1175 rebuilt this schema from
# the eight-field one; the prior FIELDS tuple named id, status, intent,
# requires, effect, constraints, failure_modes, excerpt). This is a RENDER
# order and a round-trip set, never the admission rule: which fields a Move
# must carry is the Adapter's (`validateMoveRecord` in src/compose.mjs, over
# `moves/ROLES.json`), reached through `validate_move` below (kogaki#1418) —
# a key's presence here says only that a mapped value renders in this
# position.
FIELDS = (
    "id",
    "description",
    "before",
    "after",
    "breaks",
)

# The keys whose value is a nested mapping. The value model stays
# deliberately small (§6.9.0): scalars, `>-` folded scalars, column-0
# sequences — and these nestings, admitted by NAME rather than by shape, so
# an accidentally-indented `key: value` under any other field is still the
# scalar it has always been. `before` and `after` joined `figure` at
# kogaki#1413: a Move's state is a map keyed by dimension, one sentence per
# changed dimension, and a state written as one joined line is refused by
# name — by the Adapter, through `validate_move` (kogaki#1418).
NESTED_FIELDS = ("figure", "before", "after")

# The two state fields and the five reader dimensions they are keyed by, in
# passages/FORMAT.md's order (kogaki#1413).
STATE_FIELDS = ("before", "after")
DIMENSIONS = ("knowledge", "question", "expectation", "orientation", "trust")

# The saved Move record is a `.yaml` file, written and read by the Brief's own
# YAML module, `src/yaml.mjs`, so the record the ingest writes is the record
# the composer reads, through one reader (kogaki#1413).
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))
YAML_MODULE = os.path.join(REPO_ROOT, "src", "yaml.mjs")
MOVE_RECORD_EXT = ".yaml"
RECORD_WIDTH = 80

# `kind` selects the schema; every other key in the block is a role. The block
# is FLAT, so a kind declaring a role named `kind` would make the two
# indistinguishable — refused when the set is loaded, never at a Move.
KIND_SELECTOR = "kind"

# An indented `key: value` line inside a nested block.
NESTED_KEY = re.compile(r"^\s+([A-Za-z_][A-Za-z0-9_]*):(.*)$")

# §6.9: the draft fields excluded from the proposal. Stripped BEFORE the
# Adapter validates the record, so their presence routes to the strip step
# rather than to a refusal.
EXCLUDED_DRAFT_FIELDS = (
    "material_roles",
    "compatible_previous_moves",
    "compatible_next_moves",
    "examples",
)

# §6.9.0: a record begins at a column-0 `id:` key. The blank line between
# records is NOT what the grammar binds to.
RECORD_ANCHOR = re.compile(r"^id:")

# A column-0 key line. YAML permits far more, but §6.9.0's grammar is over the
# shape the owner actually authors, and condition 4 refuses whatever is foreign.
COLUMN0_KEY = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*):(.*)$")

# A block-sequence item token: `-` followed by a space or end of line. This is
# what makes a `---` rule foreign to a sequence rather than an item of it, and
# keeps that catch on the RULE instead of on the parser (§6.9.0 condition 4).
SEQUENCE_ITEM = re.compile(r"^-(?: |$)")


class Refusal(Exception):
    """A record or file refused by §6.9.0. Carries the offending line."""

    def __init__(self, condition, message, line_no=None, line=None):
        self.condition = condition
        self.message = message
        self.line_no = line_no
        self.line = line
        detail = message
        if line_no is not None:
            detail = "line %d: %s" % (line_no, message)
            if line is not None:
                detail += "\n    %s" % line.rstrip("\n")
        super().__init__("condition %s — %s" % (condition, detail))


# --------------------------------------------------------------------------
# The YAML bridge (kogaki#1413): `src/yaml.mjs` is the one reader and the one
# writer of the Brief, the Move and the Extraction, so the ingest calls it
# rather than carrying a Python parser that could read a record differently.
# --------------------------------------------------------------------------

def _yaml_call(args, stdin=None):
    try:
        r = subprocess.run(["node", YAML_MODULE] + list(args), input=stdin,
                           capture_output=True, text=True)
    except OSError as exc:
        raise Refusal("yaml", "node could not be run to read or write a YAML "
                      "record through src/yaml.mjs: %s" % exc)
    if r.returncode != 0:
        raise Refusal("yaml", (r.stderr or "").strip() or
                      "src/yaml.mjs exited %d" % r.returncode)
    return r.stdout


def yaml_read(path):
    """The value of the YAML file at `path`, read by `src/yaml.mjs`."""
    return json.loads(_yaml_call(["parse", path]))


def yaml_write(value):
    """`value` as YAML, written by `src/yaml.mjs`."""
    return _yaml_call(["stringify", str(RECORD_WIDTH)], stdin=json.dumps(value))


# --------------------------------------------------------------------------
# AC2 — the whole-file parse is refused BY NAME.
# --------------------------------------------------------------------------

def refuse_whole_file_parse():
    """§6.9.0 correction 3, stated as an act rather than as a convention.

    A whole-file YAML parse SUCCEEDS and returns ONE mapping: the specimen's 22
    records share eight key names, collide key-for-key, last wins, and 21 Moves
    are lost with no error. The parser cannot see this from its return value —
    it gets a well-formed Move.

    So the split precedes the parse, and this function exists to be the thing a
    future edit has to delete rather than a comment it can drift past.
    """
    raise Refusal(
        "0",
        "the whole file is never submitted to a single parse — "
        "it succeeds, returns one mapping, and loses every record but the last",
    )


# --------------------------------------------------------------------------
# The split (§6.9.0 correction 1)
# --------------------------------------------------------------------------

def split_records(text):
    """Locate records by column-0 `id:`. Returns [(first_line_no, [lines])].

    Markdown is NOT required: no heading, fence or rule is sought, because the
    specimen contains zero markdown constructs and a normalizer seeking them
    finds nothing in the first file it is ever handed.

    Condition 1 is checked here because it is the only file-level one: it
    catches an out-of-order FIRST record, which no per-record check can see.
    """
    lines = text.splitlines()
    anchors = [i for i, ln in enumerate(lines) if RECORD_ANCHOR.match(ln)]

    if not anchors:
        raise Refusal("1", "no record found — the file carries no column-0 `id:` key")

    # Condition 1: nothing precedes the file's first `id:`.
    for i in range(anchors[0]):
        if lines[i].strip():
            raise Refusal(
                "1",
                "text precedes the file's first `id:`",
                line_no=i + 1,
                line=lines[i],
            )

    records = []
    for n, start in enumerate(anchors):
        end = anchors[n + 1] if n + 1 < len(anchors) else len(lines)
        records.append((start + 1, lines[start:end]))
    return records


# --------------------------------------------------------------------------
# Condition 4 (§6.9.0) — the sequence-membership state machine
# --------------------------------------------------------------------------

def check_column0_shape(first_line_no, lines):
    """Condition 4: every column-0 non-blank line is a `<key>:` line, or a
    block-sequence item belonging to an OPEN sequence.

    Membership needs state (§6.9.0 records three one-line inferences that
    failed): a sequence OPENS at a column-0 key with no value, stays open
    across its items and their indented continuations, and CLOSES at the next
    column-0 key, or before its first item if an indented line comes first.
    This is the condition that sees a column-0 `#` heading, which YAML
    discards silently as a comment.
    """
    sequence_open = False
    sequence_has_item = False

    for offset, line in enumerate(lines):
        line_no = first_line_no + offset

        if not line.strip():
            continue

        indented = line[:1].isspace()
        if indented:
            # A continuation. If a sequence was opened but has not yet taken an
            # item, this indented line IS the key's value — no sequence was ever
            # opened, so it closes before its first item.
            if sequence_open and not sequence_has_item:
                sequence_open = False
            continue

        key_match = COLUMN0_KEY.match(line)
        if key_match:
            value = key_match.group(2).strip()
            # A key closes any open sequence and may open a new one.
            sequence_open = value == ""
            sequence_has_item = False
            continue

        if SEQUENCE_ITEM.match(line):
            if not sequence_open:
                raise Refusal(
                    "4",
                    "block-sequence item with no open sequence",
                    line_no=line_no,
                    line=line,
                )
            sequence_has_item = True
            continue

        # Anything else at column 0 is foreign to the record: a heading, a
        # fence, a `---` rule, a `***`, a blockquote, a bullet after a scalar.
        # Refused BY POSITION, so a construct is caught wherever it appears
        # rather than only where it happens to break something.
        raise Refusal(
            "4",
            "line at column 0 is neither a `<key>:` line nor an item of an open sequence",
            line_no=line_no,
            line=line,
        )


# --------------------------------------------------------------------------
# Conditions 2 and 3, and the parse
# --------------------------------------------------------------------------

def parse_record(first_line_no, lines):
    """Parse ONE record to a mapping, refusing duplicate keys (condition 2).

    Condition 2 is refused rather than resolved: the whole-file collapse of
    correction 3 is a record with 22 duplicates of every key, and it cannot be
    quiet under this rule even where the parser would allow it.

    The value model is deliberately small — it is over the shape §6.9.0
    MEASURED on the specimen (plain scalars for `id` and `continues_from`,
    `>-` folded block scalars for the rest, plus legal column-0 sequences) —
    and anything outside it has already been refused by condition 4.
    """
    mapping = {}
    order = []
    current = None
    buffer = []
    folded = False
    seq = None
    nested = None

    def flush():
        nonlocal current, buffer, folded, seq, nested
        if current is None:
            return
        if nested is not None:
            mapping[current] = nested
        elif seq is not None:
            mapping[current] = seq
        elif folded:
            # A `>-` folded scalar: lines join with single spaces, trailing
            # newlines stripped. This is what makes the round trip in §6.9.1a
            # byte-identical in FORM to what the owner authored.
            mapping[current] = " ".join(p.strip() for p in buffer if p.strip())
        else:
            mapping[current] = "\n".join(buffer).strip()
        current, buffer, folded, seq, nested = None, [], False, None, None

    for offset, line in enumerate(lines):
        line_no = first_line_no + offset
        key_match = COLUMN0_KEY.match(line) if line[:1] and not line[:1].isspace() else None

        if key_match:
            flush()
            key = key_match.group(1)
            if key in mapping or key in order:
                raise Refusal(
                    "2",
                    "duplicate key `%s` within one record" % key,
                    line_no=line_no,
                    line=line,
                )
            order.append(key)
            current = key
            nested = None
            inline = key_match.group(2).strip()
            if inline in (">-", ">", "|-", "|"):
                folded = inline.startswith(">")
                buffer = []
            elif inline:
                mapping[key] = inline
                current = None
            else:
                buffer = []
            continue

        if current is None:
            continue

        if current in NESTED_FIELDS and not folded and seq is None:
            # Admitted BY NAME, not by shape: only the fields named in
            # NESTED_FIELDS read an indented `key: value` line as a mapping
            # entry, so every other field's indented lines stay the scalar
            # continuation they have always been.
            nested_match = NESTED_KEY.match(line)
            if nested_match:
                if nested is None:
                    nested = {}
                nested_key = nested_match.group(1)
                if nested_key in nested:
                    raise Refusal(
                        "2",
                        "duplicate key `%s` within `%s`" % (nested_key, current),
                        line_no=line_no,
                        line=line,
                    )
                nested[nested_key] = nested_match.group(2).strip()
                continue

        if SEQUENCE_ITEM.match(line):
            if seq is None:
                seq = []
            seq.append(line[1:].strip())
            continue

        buffer.append(line)

    flush()
    return mapping, order


def strip_excluded(mapping):
    """§6.9 strips the excluded draft fields — and §6.9.0 correction 2 makes it
    CONDITIONAL: the specimen carries none of them, because the owner stripped
    them while authoring. Absence is NOT evidence of the wrong file.

    So this removes what is present and reports nothing when nothing is.
    """
    removed = [f for f in EXCLUDED_DRAFT_FIELDS if f in mapping]
    for f in removed:
        del mapping[f]
    return removed


# --------------------------------------------------------------------------
# THE ONE VALIDATOR (kogaki#1418): every candidate is validated through the
# Adapter's own contract, `validateMoveRecord` in src/compose.mjs, reached
# through `src/move-validate.mjs` — the function `moveContract` reads every
# saved Move through. The ingest carries no field-set, state, `breaks`,
# `segments`, `description` or `figure` check of its own: two validators of
# one contract that cannot see each other drift (kogaki#1416 was one), so a
# record the Adapter refuses is refused here in the Adapter's words.
# --------------------------------------------------------------------------

VALIDATE_MODULE = os.path.join(REPO_ROOT, "src", "move-validate.mjs")
MOVES_DIR = os.path.join(REPO_ROOT, "moves")


def validate_move(mapping, line_no=None, moves_dir=None):
    """Validate one candidate Move through the Adapter. Raises `Refusal`
    (condition `adapter`) carrying the Adapter's refusal verbatim; returns
    None where the Adapter admits it. `moves_dir` is the library whose
    `ROLES.json` the record is read against — this repository's `moves/`
    unless named."""
    try:
        r = subprocess.run(["node", VALIDATE_MODULE, moves_dir or MOVES_DIR],
                           input=json.dumps(mapping), capture_output=True, text=True)
    except OSError as exc:
        raise Refusal("adapter", "node could not be run to validate the "
                      "candidate through src/move-validate.mjs: %s" % exc,
                      line_no=line_no)
    if r.returncode == 0:
        return None
    if r.returncode == 1:
        raise Refusal("adapter", r.stdout.strip(), line_no=line_no)
    raise Refusal("adapter", (r.stderr or "").strip() or
                  "src/move-validate.mjs exited %d" % r.returncode, line_no=line_no)
