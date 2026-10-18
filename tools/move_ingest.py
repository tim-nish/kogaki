#!/usr/bin/env python3
"""Move ingestion — the mechanical half of SPEC-draft-pipeline §6.9.

This module owns everything §6.9 makes MECHANICAL: locating records, parsing
them under §6.9.0's grammar, validating each candidate through the Adapter's
contract and nothing of its own (`validate_move`, kogaki#1418), rendering a
saved file, the near-duplicate check over `segments`, and regenerating
moves/INDEX.md. It is Kogaki's admission gate for Moves: an Extraction is
untrusted input, refused rather than repaired.

It owns NOTHING §6.9 makes JUDGMENT. There is no scoring, no verdict, and no
lint here, and nothing in this file admits a Move: `save_accepted()` is called
with the ids the owner selected at the question, and it is the caller's business
to have obtained them. §6.9: "ADMISSION IS THE OWNER'S ACT AT THAT QUESTION,
never the command's."

The division of labour §6.9.0 states, kept: condition 4 catches what the parser
accepts silently, and the parser catches what is not YAML. Neither is asked to
do the other's job, and neither is left resting on the other.
"""

import argparse
import json
import os
import re
import subprocess
import sys

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
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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

    The property is SEQUENCE MEMBERSHIP, and it needs state. §6.9.0 records
    three failed attempts that each tried to infer it from one line of context —
    no qualifier at all, `no inline value`, and adjacency — and states why each
    is the same defect from one side or the other. This tracks the state
    directly:

      · a sequence OPENS at a column-0 key carrying no value;
      · it stays open across its own items and their indented continuations;
      · it CLOSES at the next column-0 key — or before its first item, if an
        indented line arrives first, because that line is the key's value and
        no sequence was ever opened.

    This is the condition that sees a `#` markdown heading, which conditions
    1-3 and the parser all miss: `#` is YAML's comment character, so a heading
    at column 0 is silently discarded with no error and no line named.
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


# --------------------------------------------------------------------------
# §6.9.3 — the visual form
# --------------------------------------------------------------------------

# Resolved from this module's own location, never from the caller's cwd: the
# set is repository material, and a Move ingested from any directory must be
# judged against the same closed set.
FIGURE_KINDS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "src",
    "figure-kinds.json",
)

_KINDS_CACHE = {}


def load_figure_kinds(path=None):
    """The closed kind set, as `{kind: [role, ...]}`.

    Two properties of the FILE are asserted here rather than trusted, because
    both make a Move-level refusal unreachable or wrong if they fail:

      · a kind declaring a role named `kind` — the block is flat, so that role
        and the kind selector would be one key and the selector would always
        win, silently dropping a mapped role;
      · a kind declaring no roles at all — every form naming it would then
        validate vacuously, which is a check that never looked.

    A malformed set is a defect in this repository, so it raises rather than
    refusing a record: refusing the owner's Move for the tool's own broken
    input would name the wrong party.
    """
    path = path or FIGURE_KINDS_PATH
    if path in _KINDS_CACHE:
        return _KINDS_CACHE[path]
    with open(path) as handle:
        data = json.load(handle)
    kinds = {}
    for name, spec in sorted(data.get("kinds", {}).items()):
        roles = list(spec.get("roles", []))
        if not roles:
            raise ValueError("figure kind `%s` declares no roles" % name)
        if KIND_SELECTOR in roles:
            raise ValueError(
                "figure kind `%s` declares a role named `%s`, which the flat "
                "block cannot distinguish from the kind selector" % (name, KIND_SELECTOR)
            )
        kinds[name] = roles
    if not kinds:
        raise ValueError("%s declares no kinds" % path)
    _KINDS_CACHE[path] = kinds
    return kinds


# §6.9.0's stated precondition — `id` MUST be the record's first key — has NO
# guard of its own here, and that is deliberate rather than an omission.
#
# A guard was written for it and removed as UNREACHABLE: records are split AT a
# column-0 `id:`, so a record's first key is `id` by construction and the guard
# could never fire. A mutation that deleted it killed no test, which is how it
# was found.
#
# What actually catches the failure is what §6.9.0 says catches it. A record
# written with `before:` above `id:` is not seen as a boundary at all — it is
# absorbed into the record above, and the absorption is caught twice over:
# condition 2 sees the duplicate `before` in the absorbing record, and the
# Adapter (`validate_move`, kogaki#1418) sees the absorbed one missing a
# required field. Both are exercised.
#
# The precondition is therefore stated (here) and enforced (there), which is
# the arrangement §6.9.0 describes. A third guard asserting it directly would
# be unreachable code wearing an assertion's clothes.


# --------------------------------------------------------------------------
# The pipeline over a file
# --------------------------------------------------------------------------

class Proposal(object):
    """One normalized record, plus whatever refused it. Never a verdict."""

    def __init__(self, line_no, mapping=None, refusal=None, stripped=None):
        self.line_no = line_no
        self.mapping = mapping
        self.refusal = refusal
        self.stripped = stripped or []

    @property
    def admitted(self):
        return self.refusal is None

    @property
    def id(self):
        return (self.mapping or {}).get("id", "<no id>")


def read_proposals(text):
    """Split, admit, normalize. Returns [Proposal] — one per located record.

    A refused record becomes a Proposal carrying its Refusal rather than
    stopping the run: the owner sees the whole file in one listing, and a single
    malformed record does not hide the other twenty-one.
    """
    proposals = []
    for first_line_no, lines in split_records(text):
        try:
            check_column0_shape(first_line_no, lines)
            mapping, _order = parse_record(first_line_no, lines)
            stripped = strip_excluded(mapping)
        except Refusal as r:
            proposals.append(Proposal(first_line_no, refusal=r))
            continue
        proposals.append(Proposal(first_line_no, mapping=mapping, stripped=stripped))
    return proposals


# --------------------------------------------------------------------------
# Rendering (§6.9.1a)
# --------------------------------------------------------------------------

# §4.2's optional fields, plus `segments` (kogaki#1320), rendered after the
# five required ones and before `figure` (which renders LAST, per §6.9.1a) —
# in this fixed order, so two records differ only where their content differs.
OPTIONAL_RENDER_FIELDS = ("continues_from", "evidence", "segments")


def ordered_record(mapping):
    """The §4.2 mapping in §4.2's order, as the value the record file holds:
    the five fields, the optional ones, then `figure` in its kind's own role
    order — and each state map in the dimensions' order, so two records that
    differ only in the order their entries were typed render identically."""
    record = {}
    for field in FIELDS:
        # A field `moves/ROLES.json` leaves optional and the record does not
        # carry renders nothing; the three required roles are always present
        # on a record the Adapter admitted.
        if field not in mapping and field not in ("id", "before", "after"):
            continue
        value = mapping.get(field, "")
        if field in STATE_FIELDS and isinstance(value, dict):
            value = {d: value[d] for d in DIMENSIONS if d in value}
        record[field] = value
    for field in OPTIONAL_RENDER_FIELDS:
        if field in mapping:
            record[field] = mapping[field]
    form = mapping.get("figure")
    if isinstance(form, dict) and form:
        roles = load_figure_kinds().get(form.get(KIND_SELECTOR), [])
        # The kind's own role ORDER, never the mapping's insertion order.
        block = {KIND_SELECTOR: form.get(KIND_SELECTOR, "")}
        for role in roles:
            block[role] = form.get(role, "")
        record["figure"] = block
    return record


def render_move(mapping):
    """The record file's text: `ordered_record` written as YAML by
    `src/yaml.mjs`, the writer the Brief record uses (kogaki#1413). No fence
    and no `---` delimiter: the mapping IS the document."""
    return yaml_write(ordered_record(mapping))


def move_path(moves_dir, move_id):
    """`moves/<id>.yaml`, the id as the WHOLE stem — derived, never composed.

    A review that renames a Move renames its file, and nothing else has to be
    updated to agree, because nothing else stores the name.
    """
    return os.path.join(moves_dir, "%s%s" % (move_id, MOVE_RECORD_EXT))


def retired_move_path(moves_dir, move_id):
    """`moves/<id>.md`, the retired record form (kogaki#1413)."""
    return os.path.join(moves_dir, "%s.md" % move_id)


def retired_record_refusal(path):
    return Refusal(
        "record-form",
        "%s is a Move record in the retired `.md` form — a Move record is a "
        "`.yaml` file carrying `before` and `after` as maps keyed by dimension "
        "(kogaki#1413), and a `.md` Move is refused by name rather than read; "
        "regenerate it from its Extraction (kogaki#1415)" % path,
    )


def saved_ids(moves_dir):
    """Every id a file in `moves_dir` already holds, in either record form —
    a `.md` record still holds its id, so a new Move cannot take it."""
    out = set()
    for name in os.listdir(moves_dir):
        if name.endswith(MOVE_RECORD_EXT):
            out.add(name[:-len(MOVE_RECORD_EXT)])
        elif name.endswith(".md") and name != "INDEX.md":
            out.add(name[:-3])
    return out


# --------------------------------------------------------------------------
# AC8 — RETIRED: the derivation pointer (kogaki#548, owner ruling 2026-08-19)
# --------------------------------------------------------------------------
#
# `attach_derivation_pointer` and its `provenance` parameter are GONE, and the
# 22 saved Moves have had the ingestion string stripped from their `sources`
# (the field renamed to `excerpt` 2026-09-02, kogaki#751 — see below).
#
# §6.9.4 filled the `move-sources-derivation-vehicle` slot with the ingestion
# run and marked that placement as the author's judgment, with the fork
# RETURNING TO OPEN on disagreement. This is that disagreement, by owner
# ruling, on three independently sufficient grounds:
#
#   * NOT SOURCE TEXT. `sources` means "what text this Move came from". The
#     appended string located no passage and explained no derivation — it
#     recorded an ingestion event and a batch outcome, which §4.7's own rule
#     already excludes.
#   * REDUNDANT WITH GIT. `git log moves/<id>.md` carries the ingestion date,
#     batch and source commit; the string stored in a semantic field what
#     version history already holds.
#   * MUTATION AFTER ACCEPTANCE. It was appended AFTER the owner accepted at
#     the accept/decline question, so what landed on disk was not what was approved
#     and the delta was never displayed. That is the sharpest of the three:
#     nothing may now change a record between the owner's act and the write.
#
# kogaki#417 D1's form decision (prose over `path:line@sha`) is MOOTED rather
# than reversed — with no pointer there is no form to decide. No Source vs
# Provenance schema split is defined, because nothing demands one.
#
# THE FIELD IS `excerpt` (kogaki#751, owner ruling 2026-09-02). What the
# cleanup above left behind was never a "source" in the sense of a document
# locator: it is the author's few-line account of the reader movement they
# observed when they identified the Move — which is the Excerpt the 2026-09-01
# ruling asked for. The name `sources` was the last trace of the contaminated
# design, so the field is renamed rather than joined by a second one. No
# separate place for the publication or the source document exists in a
# record; a `sources` key surviving beside `excerpt` would be a design error.

# --------------------------------------------------------------------------
# Save and regenerate
# --------------------------------------------------------------------------

def save_accepted(moves_dir, accepted):
    """Write one file per accepted Move, then regenerate INDEX.

    `accepted` is the set of proposals the OWNER selected. Nothing in this
    module decides membership — admission is the owner's act at the question.

    An id collision is refused rather than overwritten: §6.9.1a puts that
    collision at the accept/decline question as review's dedupe judgment, "never as a
    silent overwrite", so reaching this function with two of them is a bug in
    the caller and is raised rather than absorbed.

    The walk is TWO passes, and the split is the contract: every id clears the
    collision set before ANY file is created, so a refused batch leaves
    `moves/` and its INDEX exactly as it found them. One pass wrote proposals
    one and two and then refused on the third, leaving a stale INDEX beside
    files it did not list — and, because the collision set is seeded from
    `os.listdir`, poisoning the retry, since the corrected batch then collided
    with its own partial write (kogaki#419).
    """
    if not os.path.isdir(moves_dir):
        os.makedirs(moves_dir)

    # The collision set is seeded from what is ALREADY on disk, not only from
    # this batch. A per-call `seen` catches two accepted twins in one run and
    # silently overwrites an id saved by an EARLIER run — and the very first
    # live run is kogaki#177's backfill over ~20 already-admitted Moves, which
    # is precisely that path. `write_index` would then regenerate an INDEX
    # showing nothing lost.
    # `makedirs` above guarantees the directory exists, so this read needs no
    # isdir guard and no empty-set fallback for a branch that cannot be taken.
    seen = saved_ids(moves_dir)

    # Pass 1 — validate the whole batch. Nothing is written until every id has
    # cleared, which is what makes a refusal leave no residue.
    for proposal in accepted:
        move_id = proposal.id
        # The Adapter's contract (kogaki#1418), held at the one writer every
        # admission path reaches: a Move is never saved that the Adapter
        # would refuse to read.
        validate_move(proposal.mapping, proposal.line_no, moves_dir)
        if move_id in seen:
            raise Refusal(
                "1a",
                "the id `%s` is already taken — by another Move accepted in this "
                "batch, or by one saved in an earlier run. The collision belongs "
                "at the accept/decline question as review's dedupe judgment, never here" % move_id,
            )
        seen.add(move_id)

    # Pass 2 — write.
    written = []
    for proposal in accepted:
        mapping = dict(proposal.mapping)
        path = move_path(moves_dir, proposal.id)
        with open(path, "w") as handle:
            handle.write(render_move(mapping))
        written.append(path)

    write_index(moves_dir)
    return written


def read_saved(path):
    """Read one saved Move file back to a mapping, through `src/yaml.mjs` —
    the reader the composer reads it with (kogaki#1413). A `.md` record is
    refused by name."""
    if path.endswith(".md"):
        raise retired_record_refusal(path)
    mapping = yaml_read(path)
    if not isinstance(mapping, dict):
        raise Refusal("record-form", "%s is not a map of fields" % path)
    return mapping


def merge_into(moves_dir, target_id, proposal):
    """Merge `proposal`'s fields into the Move `target_id` already names,
    validate the merged key set, rewrite that file in place and regenerate
    the index.

    The proposal's OWN id is discarded — this is a merge INTO the named Move,
    not a new one, so the target's id is what survives. `save_accepted()` is
    still the sole path that ever creates a new file; this is the other half
    of the same save step, over a file that already exists.
    """
    path = move_path(moves_dir, target_id)
    if not os.path.isfile(path) and os.path.isfile(retired_move_path(moves_dir, target_id)):
        raise retired_record_refusal(retired_move_path(moves_dir, target_id))
    if not os.path.isfile(path):
        raise Refusal(
            "passage",
            "merge target `%s` names no saved Move at %s" % (target_id, path),
        )
    merged = dict(read_saved(path))
    merged.update(proposal.mapping)
    merged["id"] = target_id
    validate_move(merged, 0, moves_dir)
    with open(path, "w") as handle:
        handle.write(render_move(merged))
    write_index(moves_dir)
    return path


def write_index(moves_dir):
    """Rewrite moves/INDEX.md WHOLE from the files on disk, sorted by id.

    Columns are `id | description` (kogaki#1412), and EVERY COLUMN IS READ OFF A FILE — none
    is composed. That is the property arm (b) could not have, and it is why
    the regeneration contract binds FRESHNESS ONLY: a stale INDEX is a run
    that did not happen rather than a derivation that drifted.

    Nothing reads INDEX to decide anything. It is a reader's table of contents.
    """
    rows = []
    for name in sorted(os.listdir(moves_dir)):
        # Only `.yaml` records are read: a `.md` record is the retired form,
        # refused at every read and listed nowhere (kogaki#1413).
        if not name.endswith(MOVE_RECORD_EXT):
            continue
        mapping = read_saved(os.path.join(moves_dir, name))
        rows.append(
            (
                str(mapping.get("id", "")),
                str(mapping.get("description", "")),
            )
        )
    rows.sort(key=lambda row: row[0])

    out = [
        "# Moves",
        "",
        "Regenerated whole from `%s/` at each ingestion run "
        "(SPEC-draft-pipeline §6.9.1a). Every column is read off a file; none is "
        "composed. Nothing reads this file to decide anything." % moves_dir.rstrip("/"),
        "",
        "| id | description |",
        "| --- | --- |",
    ]
    for move_id, description in rows:
        out.append("| %s | %s |" % (move_id, description.replace("|", "\\|")))
    out.append("")

    path = os.path.join(moves_dir, "INDEX.md")
    with open(path, "w") as handle:
        handle.write("\n".join(out))
    return path


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


def segments_text(segments):
    """A Move's `segments` as one string of its Segments' `does` and
    `relation` clauses, in order — what the near-duplicate check compares."""
    if not isinstance(segments, list):
        return ""
    return " ".join(
        "%s %s" % (_cell(s.get("does")), _cell(s.get("relation")))
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


def _cell(value):
    """A record cell as one stripped line: a number written bare (`segment:
    2`) reads as its digits."""
    if value is None:
        return ""
    return " ".join(str(value).split())


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
# A model fills the schema it is given and is poor at deciding a field is
# absent, so where an Extraction recorded the reader's question before the
# passage as `none` the authored Move still carried a composed one. The
# Extraction is the RECORD here: its `reader` `question` row's BEFORE cell
# is the owner-answered fact, and where that cell reads `none` (alone or
# followed by a hedge), the proposal's `before.question` is written
# `holds: none.` -- never a composed question. Applied BEFORE the screen
# renders, so what the owner accepts is what is saved; the screen names the
# rewrite so it is never silent.
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
# `segments`, copied from the Extraction's `segments` (kogaki#1320, generalized clause
# kogaki#1367, two prose fields kogaki#1414, a list of maps kogaki#1413).
# --------------------------------------------------------------------------
#
# Section 3 is a list of Segment maps: the quoted `opening` words, the
# `content` clause stating what it does about THIS Passage's own content, the
# subject-free `does`, and -- on every Segment after the first -- `relation`,
# its relation to the Segment before it, in prose. Both fields are prose; no
# label set is read or admitted (kogaki#1414). `opening` and `content` locate
# and explain the Segment for the owner's reading and are not copied, since
# the content clause carries the source paragraph's own subject into every
# Move derived from it. Segment 1's `relation`, where the Extraction records
# one, is a fact about the source paragraph's predecessor and is not copied
# either: a Move carries no relation to what precedes it (kogaki#1411).

# AN ENTRY IS READ AS A SEGMENT OR REFUSED, NEVER DROPPED (kogaki#1416). Every
# entry of `segments` is copied into the Move, in order, so the Move never
# carries fewer Segments than the Extraction lists. An entry carrying a key
# outside SEGMENT_ENTRY_KEYS is refused by name rather than read in part; whether
# the copied `does` and `relation` are a Segment is the Adapter's question
# (`validateMoveRecord`, reached through `validate_move`, kogaki#1418), asked
# once, so the ingest carries no second reading of the Segment's shape. A
# `reader` row naming a Segment the list does not hold is the Extraction
# disagreeing with its own count, and is refused naming that Segment.
SEGMENT_ENTRY_KEYS = ("opening", "content", "does", "relation")


def extraction_segments(record, line_no=None):
    """The ordered Segments of the Extraction's `segments` as the Move's own
    `segments` value: `[{"does": ...}, {"does": ..., "relation": ...}, ...]`,
    one per entry. Returns `None` where there is no record or it carries no
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
        does = _cell(entry.get("does"))
        segments.append({"does": does} if index == 0
                        else {"does": does, "relation": _cell(entry.get("relation"))})
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

    The PARSED RECORD COUNT is the only instrument that can catch `1` where the
    owner wrote `22`, and it is arithmetic the command already holds, displayed
    rather than withheld. It is printed FIRST and unconditionally.

    `readings` is the review's typed input — id -> prose reading — riding the
    render as DATA so the reviewed listing is still the tool's own rendering
    (story 1.70; the CLI flag mirrors Terrain's `--claims` file pattern). A
    reading naming an id outside the parsed set REFUSES: a silently dropped
    reading is the row-loss defect §6.9.2's count-line rule exists to make
    visible, one input over. An
    id with no reading renders no reading line — absence is the normal case.
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
