#!/usr/bin/env python3
"""Move ingestion — the mechanical half of SPEC-draft-pipeline §6.9.

This module owns everything §6.9 makes MECHANICAL: locating records, admitting
them under §6.9.0's four conditions, normalizing to §4.2's five fields,
rendering a saved file, and regenerating moves/INDEX.md.

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

# §4.2's five required fields, in §4.2's order (kogaki#1175 rebuilt this
# schema from the eight-field one; the prior FIELDS tuple named id, status,
# intent, requires, effect, constraints, failure_modes, excerpt). `order`,
# `presupposes` (kogaki#1247), `draws_on` (kogaki#1280) and `question`
# (kogaki#1324) retired by owner ruling: no composer reads any of the four —
# `question` was read only by path review, which judged a Candidate against a
# field the composer was never given — and a record still carrying one is
# refused by condition 3 as an unexpected key, naming it — the same path an
# unknown key has always taken, with no new admission rule needed. §6.9.1a fixes the order; a saved file renders in it, and
# condition 3 admits exactly this set plus at most OPTIONAL_FIELDS.
FIELDS = (
    "id",
    "before",
    "after",
    "technique",
    "breaks",
)

# §4.2's three optional fields. None is part of §4.2's five and none becomes
# one — condition 3 admits the five, plus any of these three and nothing
# else. Each is absent by default.
OPTIONAL_FIELDS = ("continues_from", "evidence", "figure")

# The only key whose value is a nested mapping. The value model stays
# deliberately small (§6.9.0): scalars, `>-` folded scalars, column-0
# sequences — and this one nesting, admitted by NAME rather than by shape, so
# an accidentally-indented `key: value` under any other field is still the
# scalar it has always been.
NESTED_FIELDS = ("figure",)

# `kind` selects the schema; every other key in the block is a role. The block
# is FLAT, so a kind declaring a role named `kind` would make the two
# indistinguishable — refused when the set is loaded, never at a Move.
KIND_SELECTOR = "kind"

# An indented `key: value` line inside a nested block.
NESTED_KEY = re.compile(r"^\s+([A-Za-z_][A-Za-z0-9_]*):(.*)$")

# §6.9: the draft fields excluded from the proposal. Stripped BEFORE condition 3
# runs, so their presence routes to the strip step rather than to a refusal.
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


def check_field_set(mapping, first_line_no):
    """Condition 3: after the strip step, exactly §4.2's five keys — no more
    and no fewer.

    The ordering matters and is not incidental: the excluded draft fields are
    stripped FIRST, so their presence routes to the strip step rather than to a
    refusal. What a short or long field set then means is a genuine defect —
    a record that absorbed its neighbour's `before` leaves that neighbour with
    FOUR, and this is the condition that catches it. `order` and
    `presupposes` take this same route (kogaki#1247), `draws_on` takes it
    too (kogaki#1280), and so does `question` (kogaki#1324): none of the four
    is required nor optional, so a record still carrying one is refused here,
    by name, as unexpected.
    """
    have = set(mapping)
    want = set(FIELDS)
    missing = sorted(want - have)
    # §4.2: the three optional fields are admitted here and NOWHERE ELSE widens
    # the set. A record carrying any of them still has exactly the five
    # required keys plus those; a record carrying anything else is still
    # refused, so the condition keeps its catch — a short-of-five absorbed
    # neighbour is unaffected either way.
    extra = sorted(have - want - set(OPTIONAL_FIELDS))
    if missing or extra:
        parts = []
        if missing:
            parts.append("missing %s" % ", ".join("`%s`" % k for k in missing))
        if extra:
            parts.append("unexpected %s" % ", ".join("`%s`" % k for k in extra))
        raise Refusal(
            "3",
            "record does not carry exactly §4.2's five required keys "
            "(plus at most %s) — " % ", ".join("`%s`" % f for f in OPTIONAL_FIELDS)
            + "; ".join(parts),
            line_no=first_line_no,
        )


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


def check_figure(mapping, first_line_no, kinds=None):
    """§6.9.3: validate the optional `figure` block, or do nothing.

    Renamed from `check_visual_form` (kogaki#1175); the mechanism is
    unchanged. Exactly three things, named in the refusal:

      1. the block is a mapping naming one `kind` from the closed set;
      2. every role of that kind is mapped;
      3. no role outside that kind is mapped.

    It judges NO WORDING. Whether a role's line is a good reading of the Move's
    vocabulary is the admission act's judgment, and a rule over prose here
    would be the lint §6.9.2 excludes.

    Absence is not a finding: a Move without the block is untouched, which is
    what makes every existing record pass unchanged.
    """
    if "figure" not in mapping:
        return

    form = mapping["figure"]
    if not isinstance(form, dict):
        raise Refusal(
            "figure",
            "`figure` is not a block of `kind:` plus one line per role",
            line_no=first_line_no,
        )

    kinds = kinds if kinds is not None else load_figure_kinds()

    kind = form.get(KIND_SELECTOR)
    if not kind:
        raise Refusal(
            "figure",
            "`figure` names no `kind`; the closed set is %s"
            % ", ".join("`%s`" % k for k in sorted(kinds)),
            line_no=first_line_no,
        )
    if kind not in kinds:
        raise Refusal(
            "figure",
            "`figure` names unknown kind `%s`; the closed set is %s"
            % (kind, ", ".join("`%s`" % k for k in sorted(kinds))),
            line_no=first_line_no,
        )

    want = set(kinds[kind])
    have = set(form) - {KIND_SELECTOR}
    missing = sorted(want - have)
    extra = sorted(have - want)
    if missing or extra:
        parts = []
        if missing:
            parts.append("unmapped %s" % ", ".join("`%s`" % r for r in missing))
        if extra:
            parts.append("not a role of `%s`: %s" % (kind, ", ".join("`%s`" % r for r in extra)))
        raise Refusal(
            "figure",
            "`figure` does not map exactly kind `%s`'s roles — " % kind
            + "; ".join(parts),
            line_no=first_line_no,
        )

    blank = sorted(r for r in want if not str(form[r]).strip())
    if blank:
        raise Refusal(
            "figure",
            "`figure` maps %s to nothing; a role carries one line in the "
            "Move's own vocabulary" % ", ".join("`%s`" % r for r in blank),
            line_no=first_line_no,
        )


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
# condition 2 sees the duplicate `before` in the absorbing record, and
# condition 3 sees the absorbed one left with SIX keys. Both are exercised.
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
            check_field_set(mapping, first_line_no)
            check_figure(mapping, first_line_no)
        except Refusal as r:
            proposals.append(Proposal(first_line_no, refusal=r))
            continue
        proposals.append(Proposal(first_line_no, mapping=mapping, stripped=stripped))
    return proposals


# --------------------------------------------------------------------------
# Rendering (§6.9.1a)
# --------------------------------------------------------------------------

PLAIN_FIELDS = ("id", "continues_from")

# §4.2's optional non-nested fields, rendered after the five required ones
# and before `figure` (which renders LAST, per §6.9.1a) — in this fixed order,
# so two records differ only where their content differs.
OPTIONAL_SCALAR_FIELDS = ("continues_from", "evidence")


def render_move(mapping):
    """The §4.2 mapping in §4.2's order AS the file body.

    No fence and no `---` delimiters: front-matter delimiters imply a document
    below the metadata, and here the block IS the document. A field whose value
    is genuinely a paragraph is a `>-` folded scalar, as the specimen already
    writes them.
    """
    def render_field(field, value):
        if isinstance(value, list):
            out.append("%s:" % field)
            for item in value:
                # COLUMN 0, not indented. The indented form was written first and
                # the parser could not read it back: `SEQUENCE_ITEM` matches an
                # item at column 0 only, so `  - one` fell through to the scalar
                # buffer and a list-valued field came back as the string
                # "- one\n- two". `write_index` reads every file through that
                # same path, so the breakage reached the INDEX row too.
                #
                # Column 0 is also the form §6.9.0's `-` exemption exists FOR:
                # a YAML block sequence may legally sit there under its own key,
                # and refusing it "would reject valid input on a purely
                # typographic axis, and would falsify §6.9.1a's promise that a
                # saved file is byte-identical in form to what the owner
                # authored". Rendering at column 0 is what makes that promise
                # true rather than merely asserted.
                out.append("- %s" % item)
            return
        if field in PLAIN_FIELDS:
            out.append("%s: %s" % (field, value))
            return
        out.append("%s: >-" % field)
        for chunk in _wrap(str(value), 74):
            out.append("  %s" % chunk)

    out = []
    for field in FIELDS:
        render_field(field, mapping.get(field, ""))

    # §4.2: the optional scalar fields render after the five, each only when
    # present — a record carrying none of them renders byte-identically to
    # what a record under the five-field schema always did.
    for field in OPTIONAL_SCALAR_FIELDS:
        if field in mapping:
            render_field(field, mapping[field])

    # §6.9.3: `figure` renders LAST and only when present, so a Move without
    # one is byte-identical to what it has always been.
    form = mapping.get("figure")
    if isinstance(form, dict) and form:
        out.append("figure:")
        out.append("  %s: %s" % (KIND_SELECTOR, form.get(KIND_SELECTOR, "")))
        roles = load_figure_kinds().get(form.get(KIND_SELECTOR), [])
        # The kind's own role ORDER, never the mapping's insertion order: the
        # file is the record, and two records of one kind that differ only in
        # the order their roles were typed would otherwise render differently.
        for role in roles:
            out.append("  %s: %s" % (role, form.get(role, "")))
    return "\n".join(out) + "\n"


def _wrap(text, width):
    words = text.split()
    if not words:
        return [""]
    lines, line = [], words[0]
    for word in words[1:]:
        if len(line) + 1 + len(word) <= width:
            line += " " + word
        else:
            lines.append(line)
            line = word
    lines.append(line)
    return lines


def move_path(moves_dir, move_id):
    """`moves/<id>.md`, the id as the WHOLE stem — derived, never composed.

    A review that renames a Move renames its file, and nothing else has to be
    updated to agree, because nothing else stores the name.
    """
    return os.path.join(moves_dir, "%s.md" % move_id)


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
    seen = {
        name[:-3]
        for name in os.listdir(moves_dir)
        if name.endswith(".md") and name != "INDEX.md"
    }

    # Pass 1 — validate the whole batch. Nothing is written until every id has
    # cleared, which is what makes a refusal leave no residue.
    for proposal in accepted:
        move_id = proposal.id
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
    """Read one saved Move file back to a mapping, for INDEX regeneration."""
    with open(path) as handle:
        text = handle.read()
    records = split_records(text)
    mapping, _ = parse_record(records[0][0], records[0][1])
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
    if not os.path.isfile(path):
        raise Refusal(
            "passage",
            "merge target `%s` names no saved Move at %s" % (target_id, path),
        )
    merged = dict(read_saved(path))
    merged.update(proposal.mapping)
    merged["id"] = target_id
    check_field_set(merged, 0)
    with open(path, "w") as handle:
        handle.write(render_move(merged))
    write_index(moves_dir)
    return path


def write_index(moves_dir):
    """Rewrite moves/INDEX.md WHOLE from the files on disk, sorted by id.

    Columns are `id | technique`, and EVERY COLUMN IS READ OFF A FILE — none
    is composed. That is the property arm (b) could not have, and it is why
    the regeneration contract binds FRESHNESS ONLY: a stale INDEX is a run
    that did not happen rather than a derivation that drifted.

    Nothing reads INDEX to decide anything. It is a reader's table of contents.
    """
    rows = []
    for name in sorted(os.listdir(moves_dir)):
        if not name.endswith(".md") or name == "INDEX.md":
            continue
        mapping = read_saved(os.path.join(moves_dir, name))
        rows.append(
            (
                str(mapping.get("id", "")),
                str(mapping.get("technique", "")),
            )
        )
    rows.sort(key=lambda row: row[0])

    out = [
        "# Moves",
        "",
        "Regenerated whole from `moves/` at each ingestion run "
        "(SPEC-draft-pipeline §6.9.1a). Every column is read off a file; none is "
        "composed. Nothing reads this file to decide anything.",
        "",
        "| id | technique |",
        "| --- | --- |",
    ]
    for move_id, technique in rows:
        out.append("| %s | %s |" % (move_id, technique.replace("|", "\\|")))
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


def read_index_rows(moves_dir):
    """`(id, technique)` pairs read off `moves/INDEX.md`'s own two columns —
    the same table `write_index` renders, read back rather than re-derived."""
    path = os.path.join(moves_dir, "INDEX.md")
    if not os.path.isfile(path):
        return []
    rows = []
    with open(path) as handle:
        for line in handle:
            if not line.startswith("|"):
                continue
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) != 2 or cells[0] in ("id", "---"):
                continue
            rows.append((cells[0], cells[1]))
    return rows


WORD = re.compile(r"[a-z]+")

# A near-duplicate is NAMED, never decided, here (§6.9's own division): word
# overlap on `technique` is a cheap, deterministic signal that puts a
# candidate in front of the owner's one confirmation (thread comment
# 2026-09-23, "one confirmation is asked of the owner per suspected
# duplicate and none otherwise") — it is not a verdict, and a false positive
# costs one extra line on the screen rather than a silently skipped check.
DUPLICATE_THRESHOLD = 0.34


def near_duplicates(proposed_technique, index_rows):
    words = set(WORD.findall(str(proposed_technique).lower()))
    hits = []
    if not words:
        return hits
    for move_id, technique in index_rows:
        other = set(WORD.findall(technique.lower()))
        if not other:
            continue
        overlap = len(words & other) / len(words | other)
        if overlap >= DUPLICATE_THRESHOLD:
            hits.append((move_id, overlap))
    hits.sort(key=lambda hit: -hit[1])
    return hits


# --------------------------------------------------------------------------
# The question BEFORE the passage, read off the Analysis (kogaki#1216).
# --------------------------------------------------------------------------
#
# A model fills the schema it is given and is poor at deciding a field is
# absent, so where an Analysis recorded the reader's question before the
# passage as `none` the authored Move still carried a composed one -- the
# exemplar's Analysis reads `none, or "should I read this?"` and the Move
# ingested from it read `holds an unanswered question about why so many such
# works are appearing now`. The consequence downstream was a library with no
# Move whose `before` holds no question, so the opening the owner wants
# (`holds: none`) was legal and unreachable. The Analysis is the RECORD here:
# its `## 2. Reader before and after` table carries a `question` row whose
# BEFORE cell is the owner-answered fact, and where that cell reads `none`
# (alone or followed by a hedge), the proposal's `before` field's `question:`
# line is written `holds: none` -- never a composed question. (The Move's own
# `question` field, which this rewrote too, retired at kogaki#1324.)
# Applied BEFORE the screen renders, so what the owner accepts is what is
# saved; the screen names the rewrite so it is never silent.
ANALYSIS_QUESTION_ROW = re.compile(
    r"^\|\s*question\s*\|(?P<before>[^|]*)\|(?P<after>[^|]*)\|\s*$", re.M)
NONE_QUESTION = re.compile(r"^\s*none\b", re.I)
_OTHER_DIMENSIONS = r"(?:knowledge|expectation|orientation|trust):"


def analysis_question_before(passage_text):
    """The BEFORE cell of the Analysis's `question` row, stripped, or None
    where the text carries no such row (a bare Passage with no Analysis)."""
    match = ANALYSIS_QUESTION_ROW.search(passage_text)
    return match.group("before").strip() if match else None


def write_none_question(mapping, passage_text):
    """Where the Analysis records the question before the passage as none,
    write `holds: none` into the proposal and return the fields rewritten;
    otherwise leave the mapping untouched and return an empty list."""
    before_cell = analysis_question_before(passage_text)
    if before_cell is None or not NONE_QUESTION.match(before_cell):
        return []
    changed = []
    before = mapping.get("before")
    if isinstance(before, str):
        rewritten, count = re.subn(
            r"question:\s*.*?(?=\s+%s|$)" % _OTHER_DIMENSIONS,
            "question: holds: none.", before, count=1, flags=re.S)
        if count and rewritten != before:
            mapping["before"] = rewritten
            changed.append("before")
    return changed


# --------------------------------------------------------------------------
# Subject nouns, read off the Analysis (kogaki#1284).
# --------------------------------------------------------------------------
#
# specs/move-extraction-contract.md requires `technique` to be subject-free,
# and nothing enforced it: a Move derived from a Passage about one domain
# carried that domain's own words forward into `technique` and `breaks`,
# unnoticed until the owner read the saved file. `passages/FORMAT.md` now
# has the Analysis list its own `subject nouns` — the nouns naming what the
# Passage is about, offered by the model and confirmed or edited by the
# human — and this is the mechanical half: a record whose `technique` or
# `breaks` contains one of them is refused, naming the noun and the field.
# The deny list is PER PASSAGE, written by that Passage's own Analysis; no
# global word list exists, and an Analysis that lists none refuses nothing.
ANALYSIS_SUBJECT_NOUNS_ROW = re.compile(r"^subject nouns:\s*(?P<nouns>.*)$", re.M)

SUBJECT_NOUN_FIELDS = ("technique", "breaks")


def analysis_subject_nouns(passage_text):
    """The Analysis's `subject nouns` field, lower-cased and split on
    commas, or `[]` where the field is absent or reads "none"."""
    match = ANALYSIS_SUBJECT_NOUNS_ROW.search(passage_text)
    if match is None:
        return []
    raw = match.group("nouns").strip()
    if not raw or raw.lower().startswith("none"):
        return []
    return [noun.strip().lower() for noun in raw.split(",") if noun.strip()]


def check_subject_nouns(mapping, passage_text, line_no):
    """A record whose `technique` or `breaks` names a noun the Analysis
    lists under `subject nouns` is refused, naming the noun and the field.
    Returns a `Refusal`, or `None` where nothing is refused."""
    nouns = analysis_subject_nouns(passage_text)
    if not nouns:
        return None
    for field in SUBJECT_NOUN_FIELDS:
        value = mapping.get(field)
        if not isinstance(value, str):
            continue
        words = set(WORD.findall(value.lower()))
        for noun in nouns:
            if noun in words:
                return Refusal(
                    "subject-noun",
                    "`%s` names subject noun `%s`, which the Analysis lists "
                    "under `subject nouns`" % (field, noun),
                    line_no=line_no,
                )
    return None


# --------------------------------------------------------------------------
# Section 2's dimension/Segment pairing, and section 8's split note
# (kogaki#1319). Both read the Analysis as given, before the model is
# spawned: a defect in the Analysis itself, never a defect the extraction
# step could have caused.
# --------------------------------------------------------------------------
ANALYSIS_DIMENSION_ROW = re.compile(
    r"^\|\s*(?P<dim>knowledge|question|expectation|orientation|trust)\s*\|"
    r"(?P<before>[^|]*)\|(?P<after>[^|]*)\|(?P<segment>[^|]*)\|\s*$", re.M)


def check_analysis_dimensions(passage_text, line_no=None):
    """`passages/FORMAT.md` §2: every cell of the reader-dimension table
    defaults to "unchanged"; a row that records a change on either side
    names the Segment, by number, that moved it. A changed row with no
    Segment named is refused, naming the dimension. Returns a `Refusal`,
    or `None` where every row is unchanged or names its Segment."""
    for match in ANALYSIS_DIMENSION_ROW.finditer(passage_text):
        before = match.group("before").strip()
        after = match.group("after").strip()
        if before.lower() == "unchanged" and after.lower() == "unchanged":
            continue
        if not match.group("segment").strip():
            return Refusal(
                "dimension-segment",
                "the `%s` row of section 2 records a change naming no "
                "Segment" % match.group("dim"),
                line_no=line_no,
            )
    return None


ANALYSIS_SPLIT_NOTE = re.compile(r"^split:\s*(?P<note>.+?)\s*$")
ANALYSIS_DISMISSED_NOTE = re.compile(r"^dismissed:\s*(?P<note>.+?)\s*$")


def check_analysis_split_note(passage_text, line_no=None):
    """`passages/FORMAT.md` §8: a `split:` note names a second unit inside
    the Passage and refuses ingestion, naming the note, until it is
    dismissed by repeating it verbatim on a later line as `dismissed: <the
    same text>`. Returns a `Refusal`, or `None` where no split note is left
    undismissed."""
    lines = passage_text.splitlines()
    for i, line in enumerate(lines):
        match = ANALYSIS_SPLIT_NOTE.match(line.strip())
        if not match:
            continue
        note = match.group("note").strip()
        dismissed = False
        for later in lines[i + 1:]:
            stripped = later.strip()
            if not stripped:
                continue
            dmatch = ANALYSIS_DISMISSED_NOTE.match(stripped)
            dismissed = bool(dmatch and dmatch.group("note").strip() == note)
            break
        if not dismissed:
            return Refusal(
                "split-note",
                "section 8 carries an undismissed split note: %r" % note,
                line_no=line_no,
            )
    return None


def render_passage_screen(proposal, duplicates, rewritten=()):
    """The one screen the owner sees: accept as new / merge into the named
    Move / decline. An artifact (kogaki#474's precedent), never retyped."""
    if not proposal.admitted:
        return "refused: %s\n" % proposal.refusal

    lines = ["proposed Move: %s" % proposal.id, ""]
    if rewritten:
        lines.append("the Analysis records the question before the passage as none: "
                     "`holds: none` written into %s, never a composed question (kogaki#1216)"
                     % " and ".join(rewritten))
        lines.append("")
    if duplicates:
        lines.append("suspected near-duplicate(s) in moves/INDEX.md:")
        for move_id, overlap in duplicates:
            lines.append("  - %s (technique word overlap %.2f)" % (move_id, overlap))
    else:
        lines.append("no near-duplicate found in moves/INDEX.md")
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
    with open(passage_path, encoding="utf-8") as handle:
        passage_text = handle.read()
    with open(contract_path, encoding="utf-8") as handle:
        contract_text = handle.read()

    # BEFORE the model is called (kogaki#1319): both checks read the
    # Analysis as given, and a defect in it is never the extraction step's
    # to catch.
    dimension_refusal = check_analysis_dimensions(passage_text)
    if dimension_refusal is not None:
        raise dimension_refusal
    split_refusal = check_analysis_split_note(passage_text)
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
        # the Analysis lists is not merely rewritten, it is refused outright.
        subject_refusal = check_subject_nouns(
            proposal.mapping, passage_text, proposal.line_no)
        if subject_refusal is not None:
            proposal = Proposal(proposal.line_no, refusal=subject_refusal)

    duplicates = []
    rewritten = []
    if proposal.admitted:
        # BEFORE the screen and before any near-duplicate read (kogaki#1216):
        # the owner accepts the rewritten record, and the rewrite is named on
        # the screen rather than applied in silence.
        rewritten = write_none_question(proposal.mapping, passage_text)
        duplicates = near_duplicates(proposal.mapping.get("technique", ""),
                                      read_index_rows(moves_dir))

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


def main_passage(argv):
    parser = argparse.ArgumentParser(
        prog="move_ingest.py passage",
        description="The Passage-to-Move path (kogaki#1175): a Passage in, one "
        "Move authored against specs/move-extraction-contract.md, checked "
        "against moves/INDEX.md for a near-duplicate, offered at one selection "
        "screen. Nothing is written to moves/ before --select accept.",
    )
    parser.add_argument("passage", nargs="?", help="the Passage text file")
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
    parser.add_argument("--moves-dir", default="moves", help="the Move library directory")
    parser.add_argument("--out", help="the run directory (raw.txt, PassageScreen.md)")
    parser.add_argument("--timeout", type=int, default=600, help="per-call bound in seconds")
    parser.add_argument("--select", help="the owner's recorded choice: accept, decline, or merge:<id>")
    args = parser.parse_args(argv)

    if not args.passage or not args.model or not args.out:
        parser.error("a Passage file, --model and --out are required")

    try:
        result = run_passage(args.passage, args.contract, args.moves_dir,
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
