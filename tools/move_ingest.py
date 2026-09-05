#!/usr/bin/env python3
"""Move ingestion — the mechanical half of SPEC-draft-pipeline §6.9.

This module owns everything §6.9 makes MECHANICAL: locating records, admitting
them under §6.9.0's four conditions, normalizing to §4.2's eight fields,
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
import sys

# §4.2's eight fields, in §4.2's order. §6.9.1a fixes the order; a saved file
# renders in it, and condition 3 admits exactly this set.
FIELDS = (
    "id",
    "status",
    "intent",
    "requires",
    "effect",
    "constraints",
    "failure_modes",
    "excerpt",
)

# §6.9.3: the ONE optional field. It is not part of §4.2's eight and never
# becomes one — condition 3 admits the eight, plus this and nothing else.
# Absent by default: a Move acquires a form only when its transformation has a
# relational shape, which is the admission act's judgment and not a rule here.
OPTIONAL_FIELDS = ("visual_form",)

# The only key whose value is a nested mapping. The value model stays
# deliberately small (§6.9.0): scalars, `>-` folded scalars, column-0
# sequences — and this one nesting, admitted by NAME rather than by shape, so
# an accidentally-indented `key: value` under any other field is still the
# scalar it has always been.
NESTED_FIELDS = ("visual_form",)

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
    MEASURED on the specimen (plain scalars for `id` and `status`, `>-` folded
    block scalars for the other six, plus legal column-0 sequences) — and
    anything outside it has already been refused by condition 4.
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
    """Condition 3: after the strip step, exactly §4.2's eight keys — no more
    and no fewer.

    The ordering matters and is not incidental: the excluded draft fields are
    stripped FIRST, so their presence routes to the strip step rather than to a
    refusal. What a short or long field set then means is a genuine defect —
    a record that absorbed its neighbour's `status` leaves that neighbour with
    SEVEN, and this is the condition that catches it.
    """
    have = set(mapping)
    want = set(FIELDS)
    missing = sorted(want - have)
    # §6.9.3: the optional field is admitted here and NOWHERE ELSE widens the
    # set. A record carrying it has nine keys and is still exact; a record
    # carrying anything else is still refused, so the condition keeps its
    # catch — the seven-key absorbed neighbour is unaffected either way.
    extra = sorted(have - want - set(OPTIONAL_FIELDS))
    if missing or extra:
        parts = []
        if missing:
            parts.append("missing %s" % ", ".join("`%s`" % k for k in missing))
        if extra:
            parts.append("unexpected %s" % ", ".join("`%s`" % k for k in extra))
        raise Refusal(
            "3",
            "record does not carry exactly §4.2's eight keys "
            "(plus at most `visual_form`) — " + "; ".join(parts),
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


def check_visual_form(mapping, first_line_no, kinds=None):
    """§6.9.3: validate the optional `visual_form` block, or do nothing.

    Exactly three things, named in the refusal:

      1. the block is a mapping naming one `kind` from the closed set;
      2. every role of that kind is mapped;
      3. no role outside that kind is mapped.

    It judges NO WORDING. Whether a role's line is a good reading of the Move's
    vocabulary is the admission act's judgment, and a rule over prose here
    would be the lint §6.9.2 excludes.

    Absence is not a finding: a Move without the block is untouched, which is
    what makes every existing record pass unchanged.
    """
    if "visual_form" not in mapping:
        return

    form = mapping["visual_form"]
    if not isinstance(form, dict):
        raise Refusal(
            "visual-form",
            "`visual_form` is not a block of `kind:` plus one line per role",
            line_no=first_line_no,
        )

    kinds = kinds if kinds is not None else load_figure_kinds()

    kind = form.get(KIND_SELECTOR)
    if not kind:
        raise Refusal(
            "visual-form",
            "`visual_form` names no `kind`; the closed set is %s"
            % ", ".join("`%s`" % k for k in sorted(kinds)),
            line_no=first_line_no,
        )
    if kind not in kinds:
        raise Refusal(
            "visual-form",
            "`visual_form` names unknown kind `%s`; the closed set is %s"
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
            "visual-form",
            "`visual_form` does not map exactly kind `%s`'s roles — " % kind
            + "; ".join(parts),
            line_no=first_line_no,
        )

    blank = sorted(r for r in want if not str(form[r]).strip())
    if blank:
        raise Refusal(
            "visual-form",
            "`visual_form` maps %s to nothing; a role carries one line in the "
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
# written with `status:` above `id:` is not seen as a boundary at all — it is
# absorbed into the record above, and the absorption is caught twice over:
# condition 2 sees the duplicate `status` in the absorbing record, and
# condition 3 sees the absorbed one left with SEVEN keys. Both are exercised.
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
            check_visual_form(mapping, first_line_no)
        except Refusal as r:
            proposals.append(Proposal(first_line_no, refusal=r))
            continue
        proposals.append(Proposal(first_line_no, mapping=mapping, stripped=stripped))
    return proposals


# --------------------------------------------------------------------------
# Rendering (§6.9.1a)
# --------------------------------------------------------------------------

PLAIN_FIELDS = ("id", "status")


def render_move(mapping):
    """The §4.2 mapping in §4.2's order AS the file body.

    No fence and no `---` delimiters: front-matter delimiters imply a document
    below the metadata, and here the block IS the document. A field whose value
    is genuinely a paragraph is a `>-` folded scalar, as the specimen already
    writes them.
    """
    out = []
    for field in FIELDS:
        value = mapping.get(field, "")
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
            continue
        if field in PLAIN_FIELDS:
            out.append("%s: %s" % (field, value))
            continue
        out.append("%s: >-" % field)
        for chunk in _wrap(str(value), 74):
            out.append("  %s" % chunk)

    # §6.9.3: the optional block renders LAST and only when present, so a Move
    # without a form is byte-identical to what it has always been — the
    # property that makes every existing record pass unchanged.
    form = mapping.get("visual_form")
    if isinstance(form, dict) and form:
        out.append("visual_form:")
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


def write_index(moves_dir):
    """Rewrite moves/INDEX.md WHOLE from the files on disk, sorted by id.

    Columns are `id | status | intent`, and EVERY COLUMN IS READ OFF A FILE —
    none is composed. That is the property arm (b) could not have, and it is
    why the regeneration contract binds FRESHNESS ONLY: a stale INDEX is a run
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
                str(mapping.get("status", "")),
                str(mapping.get("intent", "")),
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
        "| id | status | intent |",
        "| --- | --- | --- |",
    ]
    for move_id, status, intent in rows:
        out.append("| %s | %s | %s |" % (move_id, status, intent.replace("|", "\\|")))
    out.append("")

    path = os.path.join(moves_dir, "INDEX.md")
    with open(path, "w") as handle:
        handle.write("\n".join(out))
    return path


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
    parser = argparse.ArgumentParser(
        description="Move ingestion: split, admit, normalize. Saves nothing — "
        "admission is the owner's act at the accept/decline question."
    )
    parser.add_argument("input", nargs="?", help="the owner-authored Moves file")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--readings", help="JSON file mapping id -> prose reading "
                        "(the review's typed input; mirrors Terrain's --claims file pattern)")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()

    if not args.input:
        parser.error("an input file is required (or --self-test)")

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


# --------------------------------------------------------------------------
# Self-test — every case CONSTRUCTS the defect and asserts the refusal.
# --------------------------------------------------------------------------

EIGHT = """id: {id}
status: observed
intent: >-
  does a thing
requires: >-
  a thing to do it to
effect: >-
  the thing is done
constraints: >-
  not always
failure_modes: >-
  sometimes not
excerpt: >-
  a passage somewhere
"""


AXIS_FORM = """visual_form:
  kind: axis
  endpoint_a: the first endpoint the Move presents
  endpoint_b: the opposing endpoint
  criterion: the one axis both endpoints clarify
"""


def _record(move_id="a-move", form=None):
    text = EIGHT.format(id=move_id)
    if form is not None:
        text += form
    return text


def self_test():
    import copy
    import tempfile

    failures = []
    ran = []

    def check(label, fn):
        # The total is DERIVED from what ran, never a literal. The first version
        # printed a hard-coded `total = 26` while the function made 30 calls, so
        # the self-report drifted the moment a case was added and moved only when
        # someone edited the number.
        #
        # That is the very class this module is built around: §6.9.0's whole
        # argument is that a displayed count is the only instrument that catches
        # `1` where the owner wrote `22`. A count nothing derives is the defect
        # wearing the instrument's clothes.
        ran.append(label)
        try:
            fn()
        except AssertionError as exc:
            failures.append("%s: %s" % (label, exc))
        except Exception as exc:  # noqa: BLE001 — a crash is a failure too
            failures.append("%s: unexpected %s: %s" % (label, type(exc).__name__, exc))

    def refuses(text, condition, label):
        def run():
            try:
                proposals = read_proposals(text)
            except Refusal as refusal:
                assert refusal.condition == condition, (
                    "expected condition %s, got %s (%s)" % (condition, refusal.condition, refusal)
                )
                return
            bad = [p for p in proposals if not p.admitted]
            assert bad, "expected a refusal, every record was admitted"
            assert bad[0].refusal.condition == condition, (
                "expected condition %s, got %s (%s)"
                % (condition, bad[0].refusal.condition, bad[0].refusal)
            )

        check(label, run)

    # ---- AC2: the record count is the instrument -------------------------
    def count_is_the_instrument():
        text = "\n".join(_record("m%d" % n) for n in range(22))
        proposals = read_proposals(text)
        assert len(proposals) == 22, "expected 22 records, got %d" % len(proposals)
        assert all(p.admitted for p in proposals), "some records refused"
        rendering = render_proposals(proposals)
        assert rendering.startswith("parsed records: 22"), (
            "the count must be the first thing rendered; got %r" % rendering[:40]
        )

    check("AC2 22 records split and counted", count_is_the_instrument)

    def whole_file_parse_is_refused_by_name():
        try:
            refuse_whole_file_parse()
        except Refusal as refusal:
            assert "one mapping" in str(refusal), str(refusal)
            return
        raise AssertionError("refuse_whole_file_parse() did not refuse")

    check("AC2 whole-file parse refused by name", whole_file_parse_is_refused_by_name)

    # ---- AC1/AC3: the boundary is the column-0 `id:` ---------------------
    def blank_line_is_not_the_boundary():
        text = _record("m0").replace("effect: >-\n", "effect: >-\n\n") + _record("m1")
        proposals = read_proposals(text)
        assert len(proposals) == 2, (
            "a blank line inside a record must not split it; got %d records" % len(proposals)
        )

    check("AC1 blank line is not the boundary", blank_line_is_not_the_boundary)

    def no_markdown_required():
        text = _record("m0")
        assert "#" not in text and "```" not in text
        proposals = read_proposals(text)
        assert len(proposals) == 1 and proposals[0].admitted

    check("AC3 zero markdown constructs still parses", no_markdown_required)

    # ---- condition 1 -----------------------------------------------------
    refuses("stray leading text\n\n" + _record(), "1", "AC3 cond 1 leading text refused")

    # ---- condition 2 -----------------------------------------------------
    refuses(
        _record().replace("excerpt: >-", "status: observed\nexcerpt: >-"),
        "2",
        "AC3 cond 2 duplicate key refused",
    )

    # ---- condition 3 -----------------------------------------------------
    refuses(
        _record().replace("constraints: >-\n  not always\n", ""),
        "3",
        "AC3 cond 3 seven keys refused",
    )
    refuses(
        _record() + "extra_field: >-\n  nope\n",
        "3",
        "AC3 cond 3 ninth key refused",
    )
    # §6.9.0's `id`-must-be-first precondition has no guard of its own (see the
    # note where one was removed as unreachable). What catches it is the
    # ABSORPTION, twice over, and both halves are exercised here.
    def id_not_first_is_caught_by_absorption():
        text = _record("first") + "status: observed\nid: second\nintent: >-\n  x\n"
        proposals = read_proposals(text)
        assert len(proposals) == 2, "expected 2 records, got %d" % len(proposals)
        assert not proposals[0].admitted, "the absorbing record was admitted"
        assert proposals[0].refusal.condition == "2", (
            "the absorbing record should carry a duplicate `status`: %s" % proposals[0].refusal
        )
        assert not proposals[1].admitted, "the absorbed record was admitted"
        assert proposals[1].refusal.condition == "3", (
            "the absorbed record should be short of §4.2's eight keys: %s" % proposals[1].refusal
        )

    check("AC3 id-not-first is caught by conditions 2 AND 3", id_not_first_is_caught_by_absorption)

    # ---- condition 4: the case conditions 1-3 and the parser ALL miss ----
    refuses(
        _record("m0") + "\n## notes\n\n" + _record("m1"),
        "4",
        "AC3 cond 4 mid-file `#` heading refused (YAML would silently comment it)",
    )
    refuses(_record() + "```\n", "4", "AC3 cond 4 fence refused")
    refuses(_record() + "> quoted\n", "4", "AC3 cond 4 blockquote refused")
    refuses(_record() + "***\n", "4", "AC3 cond 4 `***` rule refused")
    refuses(_record() + "- bullet after a scalar\n", "4", "AC3 cond 4 bullet after a scalar refused")

    # ---- condition 4's `-` exemption: legal column-0 sequences ADMITTED ---
    def legal_sequence_admitted():
        text = _record().replace(
            "constraints: >-\n  not always\n",
            "constraints:\n- one\n- two\n- three\n",
        )
        proposals = read_proposals(text)
        assert proposals[0].admitted, "legal column-0 sequence refused: %s" % proposals[0].refusal
        assert proposals[0].mapping["constraints"] == ["one", "two", "three"], (
            proposals[0].mapping["constraints"]
        )

    check("AC3 `-` exemption admits a legal column-0 sequence", legal_sequence_admitted)

    def sequence_closes_before_first_item():
        # A key with an indented value opens no sequence, so a later column-0
        # bullet has nothing to belong to. This is the `no inline value` failure
        # §6.9.0 records, and it must NOT pass.
        text = _record().replace(
            "constraints: >-\n  not always\n",
            "constraints:\n  an indented scalar\n- stray\n",
        )
        proposals = read_proposals(text)
        assert not proposals[0].admitted, "a bullet after an indented value was admitted"
        assert proposals[0].refusal.condition == "4", proposals[0].refusal

    check("AC3 sequence closes before its first item", sequence_closes_before_first_item)

    def rule_is_not_a_sequence_item():
        # `---` starts with `-` but is NOT `- ` or bare `-`, so it is foreign to
        # a sequence rather than an item of it — the catch stays on the RULE.
        text = _record().replace(
            "constraints: >-\n  not always\n",
            "constraints:\n- one\n---\n- two\n",
        )
        proposals = read_proposals(text)
        assert not proposals[0].admitted, "`---` was admitted as a sequence item"
        assert proposals[0].refusal.condition == "4", proposals[0].refusal

    check("AC3 `---` is foreign to an open sequence", rule_is_not_a_sequence_item)

    # ---- AC4: stripping is CONDITIONAL -----------------------------------
    def strip_when_present():
        text = _record() + "examples: >-\n  an example\nmaterial_roles: >-\n  a role\n"
        proposals = read_proposals(text)
        assert proposals[0].admitted, proposals[0].refusal
        assert set(proposals[0].stripped) == {"examples", "material_roles"}, proposals[0].stripped

    check("AC4 excluded draft fields stripped when present", strip_when_present)

    def absence_is_not_evidence_of_the_wrong_file():
        proposals = read_proposals(_record())
        assert proposals[0].admitted, proposals[0].refusal
        assert proposals[0].stripped == [], proposals[0].stripped

    check("AC4 absence of draft fields is not a refusal", absence_is_not_evidence_of_the_wrong_file)

    # ---- AC7: render, filename, INDEX ------------------------------------
    def render_has_no_fence_and_no_delimiter():
        body = render_move(read_proposals(_record("x"))[0].mapping)
        assert not body.startswith("---"), "a `---` delimiter was rendered"
        assert "```" not in body, "a fence was rendered"
        assert body.startswith("id: x\n"), body[:20]
        keys = [ln.split(":")[0] for ln in body.splitlines() if ln and not ln[:1].isspace()]
        assert keys == list(FIELDS), "fields not in §4.2's order: %s" % keys

    check("AC7 body is the §4.2 mapping, no fence, no delimiter", render_has_no_fence_and_no_delimiter)

    def folded_scalar_folds():
        """A `>-` block scalar folds its lines to SPACES — that is what `>`
        means, and it is what makes the round trip in §6.9.1a byte-identical in
        FORM to what the owner authored.

        Nothing asserted it until a mutation joining with newlines survived.
        """
        text = _record().replace(
            "intent: >-\n  does a thing\n",
            "intent: >-\n  does a thing\n  across two lines\n",
        )
        mapping = read_proposals(text)[0].mapping
        assert mapping["intent"] == "does a thing across two lines", repr(mapping["intent"])
        assert "\n" not in mapping["intent"], "a folded scalar kept its newlines"
        # And it survives the save/read round trip unchanged.
        with tempfile.TemporaryDirectory() as tmp:
            moves = os.path.join(tmp, "moves")
            save_accepted(moves, read_proposals(text))
            back = read_saved(move_path(moves, "a-move"))
            assert back["intent"] == mapping["intent"], (
                "the folded value changed across the round trip: %r -> %r"
                % (mapping["intent"], back["intent"])
            )

    check("AC7 a `>-` folded scalar folds, and round-trips", folded_scalar_folds)

    def sequence_survives_the_round_trip():
        """A list-valued field must survive save → read as a LIST.

        It did not. The renderer wrote `  - item` indented while the parser
        matches an item at column 0 only, so a saved sequence came back as the
        scalar string "- one\\n- two" — and `write_index` reads every file back
        through that same path, so a list-valued `intent` would have landed in
        the INDEX row as embedded newlines. The parser refused to read the file
        its own renderer wrote.

        The `-` exemption was exercised at the PARSE and the round trip only for
        a `>-` folded scalar; nothing crossed the two.
        """
        text = _record("seq").replace(
            "constraints: >-\n  not always\n",
            "constraints:\n- one\n- two\n",
        )
        proposal = read_proposals(text)[0]
        assert proposal.mapping["constraints"] == ["one", "two"], proposal.mapping["constraints"]

        body = render_move(proposal.mapping)
        for item_line in ("- one", "- two"):
            assert "\n%s\n" % item_line in body, (
                "sequence items must render at column 0 — the form §6.9.0's `-` "
                "exemption exists for; got:\n%s" % body
            )

        with tempfile.TemporaryDirectory() as tmp:
            moves = os.path.join(tmp, "moves")
            save_accepted(moves, [proposal])
            back = read_saved(move_path(moves, "seq"))
            assert back["constraints"] == ["one", "two"], (
                "a sequence did not survive the round trip: %r" % (back["constraints"],)
            )
            # And the saved file is re-admissible by the grammar that wrote it.
            reread = read_proposals(open(move_path(moves, "seq")).read())
            assert reread[0].admitted, (
                "the renderer produced a file its own parser refuses: %s" % reread[0].refusal
            )

    check("AC7 a sequence survives the round trip and re-admits", sequence_survives_the_round_trip)

    def collision_spans_earlier_runs():
        """The collision guard covers what is ALREADY on disk, not just the batch.

        A per-call `seen` catches two twins in one run and silently overwrites an
        id saved by an EARLIER one — and the first live run is kogaki#177's
        backfill over ~20 already-admitted Moves, which is exactly that path.
        """
        with tempfile.TemporaryDirectory() as tmp:
            moves = os.path.join(tmp, "moves")
            save_accepted(moves, [read_proposals(_record("dup"))[0]])
            try:
                save_accepted(moves, [read_proposals(_record("dup"))[0]])
            except Refusal:
                return
            raise AssertionError("a second run silently overwrote an existing Move")

    check("AC7 an id saved by an earlier run is not overwritten", collision_spans_earlier_runs)

    def filename_is_the_id_as_whole_stem():
        assert move_path("moves", "some-move") == os.path.join("moves", "some-move.md")

    check("AC7 filename is `moves/<id>.md`", filename_is_the_id_as_whole_stem)

    def index_columns_are_read_off_files():
        with tempfile.TemporaryDirectory() as tmp:
            moves = os.path.join(tmp, "moves")
            # The ids are chosen so that FILENAME order and ID order DIVERGE:
            # `-` (45) sorts below `.` (46), so `sorted(listdir)` yields
            # "a-b.md" before "a.md" while sorting by id yields "a" before
            # "a-b". A fixture of "alpha"/"zeta" agrees under both, so it could
            # not tell the explicit sort from an accident of directory order —
            # a mutation deleting `rows.sort` survived against it.
            accepted = [
                read_proposals(_record("a-b"))[0],
                read_proposals(_record("a"))[0],
            ]
            save_accepted(moves, accepted)
            index = open(os.path.join(moves, "INDEX.md")).read()
            rows = [ln for ln in index.splitlines() if ln.startswith("| ") and "---" not in ln]
            assert rows[0].startswith("| id |"), rows[0]
            assert rows[1].startswith("| a |"), "INDEX is not sorted by id: %s" % rows[1]
            assert rows[2].startswith("| a-b |"), rows[2]
            assert "does a thing" in rows[1], "intent column not read off the file: %s" % rows[1]

    check("AC7 INDEX rows are derived and sorted by id", index_columns_are_read_off_files)

    def index_is_rewritten_whole():
        with tempfile.TemporaryDirectory() as tmp:
            moves = os.path.join(tmp, "moves")
            save_accepted(moves, [read_proposals(_record("only"))[0]])
            with open(os.path.join(moves, "INDEX.md"), "a") as handle:
                handle.write("| ghost | observed | a row nothing backs |\n")
            write_index(moves)
            index = open(os.path.join(moves, "INDEX.md")).read()
            assert "ghost" not in index, "INDEX was appended to rather than rewritten whole"

    check("AC7 INDEX is rewritten whole, not appended", index_is_rewritten_whole)

    def id_collision_refuses_rather_than_overwrites():
        with tempfile.TemporaryDirectory() as tmp:
            moves = os.path.join(tmp, "moves")
            twins = [read_proposals(_record("same"))[0], read_proposals(_record("same"))[0]]
            try:
                save_accepted(moves, twins)
            except Refusal:
                return
            raise AssertionError("an id collision silently overwrote")

    check("AC7 id collision refuses, never silently overwrites", id_collision_refuses_rather_than_overwrites)

    def a_refused_batch_writes_nothing():
        """A collision in a LATER batch position leaves `moves/` untouched.

        Asserted on the DIRECTORY, never on the exception. The single-pass
        version raised the identical `Refusal` — after writing proposals one
        and two — so a case that only caught the raise passes against the
        defect. What discriminates is what is on disk afterwards.

        The retry is asserted too, because it is the half that made the
        failure unrecoverable rather than merely untidy: the collision set is
        seeded from `os.listdir`, so a partial write made the corrected batch
        collide with itself (kogaki#419).

        Admission (consultation-map entry 1, receipt in the commit):

        - *loop position:* this module's embedded `--self-test`, run on
          invocation. `move_ingest` is not a `checks/registry.json` member, so
          this adds no member to the registered family and no CI cost.
        - *budget:* one `TemporaryDirectory` and four `save_accepted` calls,
          inside a suite that runs in well under a second.
        - *removal signal:* repair 2 landing — `save_accepted` writing to a
          temp directory and moving into place after the loop. That
          construction makes the partial-write state unreachable rather than
          merely refused, at which point this case is a review candidate,
          **never an auto-deletion**. It is NOT removable merely for never
          having fired: the ablation below is what shows it can.

        The served rule this discharges, verbatim: "A safety check only proves
        itself on the code paths that actually reached it. … In one real case
        two different checks in the same command each turned out to cover only
        the path the other one missed."
        (`gloss/lessons/testing.md:173@8906f20`) — measured here rather than
        assumed: under the single-pass ablation the two pre-existing collision
        cases both PASS, because each asserts the raise and neither asserts the
        directory. This case is the write path they left uncovered.
        """
        with tempfile.TemporaryDirectory() as tmp:
            moves = os.path.join(tmp, "moves")
            save_accepted(moves, [read_proposals(_record("taken"))[0]])
            before = sorted(os.listdir(moves))
            index_before = open(os.path.join(moves, "INDEX.md")).read()

            # The collider is LAST, so a single-pass walk writes the two ahead
            # of it before refusing.
            batch = [
                read_proposals(_record("fresh-one"))[0],
                read_proposals(_record("fresh-two"))[0],
                read_proposals(_record("taken"))[0],
            ]
            try:
                save_accepted(moves, batch)
            except Refusal:
                pass
            else:
                raise AssertionError("a collision in a later batch position did not refuse")

            after = sorted(os.listdir(moves))
            assert after == before, "a refused batch left files behind: %s" % (
                sorted(set(after) - set(before)),
            )
            assert open(os.path.join(moves, "INDEX.md")).read() == index_before, (
                "a refused batch rewrote INDEX"
            )

            # And the corrected batch re-runs cleanly — the property the
            # partial write destroyed.
            save_accepted(moves, batch[:2])
            index = open(os.path.join(moves, "INDEX.md")).read()
            for move_id in ("taken", "fresh-one", "fresh-two"):
                assert "| %s |" % move_id in index, "INDEX does not list %s" % move_id

    check("AC7 a refused batch writes nothing, and the retry runs clean", a_refused_batch_writes_nothing)

    # ---- AC8: RETIRED, and what replaces it (kogaki#548) -----------------
    #
    # Consultation-map entry 1 (modifying a check surface) — surveyed before
    # this block was rewritten, because three registered cases are RETIRED here
    # and one is ADMITTED in their place. The line that governs the retiring
    # half, quoted at its pin:
    #
    #   "A check that cannot fail is not a lenient check; it is theatre, and it
    #   looks identical to a check that has been switched off."
    #   consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/testing.md:35
    #
    # It names re-POINTING a check at a new subject as the error and RETIRING it
    # as the correct move when its unit dissolves. That is exactly this case:
    # `attach_derivation_pointer` is gone, so its three cases have no subject,
    # and re-aiming them at `sources` generally would have produced cases that
    # cannot fail. They are deleted rather than re-pointed.
    #
    # The ADMITTING half is a separate act and carries its own admission below:
    # the new case has a named defect (the append after acceptance, kogaki#548's
    # third ground), it runs in this file's own self-test at the same loop
    # position as its siblings, and its removal signal is the acceptance-to-disk
    # write ceasing to exist as a distinct step.
    #
    # The three AC8 cases are GONE with the mechanism they covered. What
    # remains is the property the retirement creates, which nothing asserted
    # before: `save_accepted` must write the owner's accepted record UNCHANGED.
    #
    # That is the sharpest of the issue's three grounds — the pointer was
    # appended after acceptance, so what landed on disk was not what was
    # approved and the delta was never displayed. A retirement that removed the
    # append and left nothing watching would readmit the same class the next
    # time a field looked like a good place to record something.
    def saving_mutates_nothing_the_owner_accepted():
        with tempfile.TemporaryDirectory() as tmp:
            moves = os.path.join(tmp, "moves")
            proposal = read_proposals(_record("p"))[0]
            accepted = copy.deepcopy(proposal.mapping)
            save_accepted(moves, [proposal])
            saved = read_saved(move_path(moves, "p"))
            for field in FIELDS:
                assert saved.get(field, "") == accepted.get(field, ""), (
                    "save_accepted CHANGED %r between acceptance and disk: "
                    "accepted %r, wrote %r"
                    % (field, accepted.get(field, ""), saved.get(field, ""))
                )

    check("AC8 saving mutates nothing the owner accepted",
          saving_mutates_nothing_the_owner_accepted)

    # ---- AC5/AC6: what this module must NOT contain ----------------------
    def mechanical_half_holds_no_judgment_apparatus():
        """§6.9.2: no verdict machinery and no lint — asserted over the PARSED
        module, never over its characters.

        Two earlier drafts of this guard were themselves kogaki#243 instances,
        and both are recorded because the second is the one worth learning from.
        A substring scan over the whole file matched its own token list — the
        fixture supplying the value under test. Anchoring the scan above
        `def self_test(` fixed that and left a worse defect standing: the words
        still appeared in the docstrings DECLARING THEIR ABSENCE, so the guard
        bound a text proxy that a truthful module fails and a silent one passes.

        The property is "no verdict-shaped callable or attribute EXISTS here",
        so the assertion walks the AST for defined names and never reads prose.
        """
        import ast

        tree = ast.parse(open(__file__).read())
        forbidden = ("score", "verdict", "lint", "rank", "grade")
        # THE REFUSER POLARITY IS EXEMPT, BY NAME AND WITH ITS GROUND (story
        # 1.70, kogaki#474). §6.9.2 v2 re-reads "no verdict machinery" as a
        # CONSTRUCTION constraint: the renderer makes a verdict token
        # unrenderable. The carrier of that constraint necessarily names the
        # thing it refuses — VERDICT_SHAPE is the shape REFUSED at render,
        # and its test asserts the refusal. A producer of verdicts and a
        # refuser of them share vocabulary and have opposite polarity; this
        # walk guards against the first, and an exemption wider than these
        # two named refusers would gut it.
        refusers = ("VERDICT_SHAPE", "verdict_token_is_unwritable")
        defined = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                defined.append(node.name)
            elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
                defined.append(node.id)
            elif isinstance(node, ast.Attribute) and isinstance(node.ctx, ast.Store):
                defined.append(node.attr)

        assert defined, "the AST walk found no defined names — the guard is not reaching the module"
        assert "save_accepted" in defined, "the walk missed a known definition"

        offenders = [
            name for name in defined
            if any(word in name.lower() for word in forbidden)
            and name not in refusers
        ]
        assert not offenders, (
            "§6.9.2 excludes verdict machinery; these names exist: %s" % sorted(set(offenders))
        )

    check(
        "AC5 no judgment apparatus in the mechanical half",
        mechanical_half_holds_no_judgment_apparatus,
    )

    def nothing_here_admits_a_move():
        """The selection is HONOURED — asserted behaviourally, not by grepping
        for the parameter name.

        The first version read the source for `def save_accepted(moves_dir,
        accepted` — a proxy for "the accepted set is an argument", which a
        rename defeats while the module still behaves correctly, and which a
        module that quietly ingested everything could still satisfy. A mutation
        making `save_accepted` ingest all proposals survived against it.

        The property is that a proposal the owner did NOT select is not on
        disk, so that is what is checked.
        """
        with tempfile.TemporaryDirectory() as tmp:
            moves = os.path.join(tmp, "moves")
            offered = [
                read_proposals(_record("chosen"))[0],
                read_proposals(_record("declined"))[0],
            ]
            save_accepted(moves, offered[:1])
            on_disk = sorted(n for n in os.listdir(moves) if n != "INDEX.md")
            assert on_disk == ["chosen.md"], (
                "a Move the owner did not select reached moves/: %s" % on_disk
            )
            index = open(os.path.join(moves, "INDEX.md")).read()
            assert "declined" not in index, "a declined Move reached INDEX"

    check("AC6 admission is the caller's act, never this module's", nothing_here_admits_a_move)

    # ---- the proposal rendering: what the owner reads before deciding ------
    # THE ARTIFACT IS GONE (kogaki#858, owner ruling 2026-09-04) and with it the
    # two assertions whose whole subject was the file \u2014 that the name was a
    # fixed literal, and that a second render overwrote the first. Neither
    # property exists once nothing is written. The two content properties below
    # were merely SITED on the file and are retargeted onto the rendering, which
    # is where they were always about: a count the owner can check the row list
    # against, and a refusal that survives to be read.
    def rendering_carries_every_row():
        """N records -> the count line FIRST, then exactly N rows."""
        text = "\n".join(_record("m%d" % n) for n in range(22))
        body = render_proposals(read_proposals(text))
        assert body.startswith("parsed records: 22"), (
            "the count line must come first; got %r" % body[:40])
        rows = [ln for ln in body.splitlines() if ln.startswith("  line ")]
        assert len(rows) == 22, "expected 22 rows, got %d" % len(rows)

    check("the rendering carries the count first and every row",
          rendering_carries_every_row)

    def refusal_row_reaches_the_rendering():
        """A refused record's row carries its condition and line number
        verbatim."""
        bad = _record("broken").replace("excerpt: >-\n  a passage somewhere\n", "")
        proposals = read_proposals(_record("good") + bad)
        body = render_proposals(proposals)
        assert "REFUSED" in body, body
        refused = [p for p in proposals if not p.admitted][0]
        assert str(refused.refusal) in body, (
            "the refusal text must reach the rendering verbatim")

    check("a refusal row reaches the rendering verbatim",
          refusal_row_reaches_the_rendering)

    def readings_ride_as_data():
        """AC4: a reading renders under its row; a stranger id REFUSES naming
        it; an id with no reading renders no reading line."""
        proposals = read_proposals(_record("with-reading") + _record("without"))
        rendering = render_proposals(proposals, {
            "with-reading": "reads as one clean local transition and nothing more"})
        lines = rendering.splitlines()
        i = next(n for n, ln in enumerate(lines) if "with-reading" in ln)
        assert lines[i + 1].strip().startswith("\u2014"), (
            "the reading must render as a continuation under its row")
        j = next(n for n, ln in enumerate(lines) if ln.endswith("without"))
        assert j + 1 == len(lines) or lines[j + 1].startswith("  line "), (
            "an id with no reading must render no reading line")
        try:
            render_proposals(proposals, {"stranger": "some prose reading of it"})
        except Refusal as refusal:
            assert refusal.condition == "stranger-reading", refusal.condition
            assert "stranger" in str(refusal), str(refusal)
        else:
            raise AssertionError("a stranger reading id did not refuse")

    check("1.70 AC4 readings ride as data; a stranger id refuses by name",
          readings_ride_as_data)

    def verdict_token_is_unwritable():
        """AC5: a verdict, score or status token cannot reach a row. Two arms:
        the readings arm REFUSES both token shapes (the 2026-08-16 specimen
        `judgment: clean` literally among them), and the record arm is
        unwritable BY CONSTRUCTION \u2014 no record field but `id` is ever
        printed, so a verdict smuggled into a field has no path to the rendering,
        which is asserted by rendering exactly such a record."""
        proposals = read_proposals(_record("target"))
        for specimen in ("clean", "judgment: clean", "PASS", "7/10", "status: ok"):
            try:
                render_proposals(proposals, {"target": specimen})
            except Refusal as refusal:
                assert refusal.condition == "verdict-shaped-reading", (
                    "%r: %s" % (specimen, refusal.condition))
            else:
                raise AssertionError(
                    "verdict-shaped reading %r rendered instead of refusing" % specimen)
        smuggled = _record("smuggler").replace(
            "does a thing", "judgment: clean")
        rendering = render_proposals(read_proposals(smuggled))
        assert "judgment: clean" not in rendering, (
            "a record field reached a row \u2014 the construction constraint is broken")

    check("1.70 AC5 a verdict token is unwritable on a row, both arms",
          verdict_token_is_unwritable)

    # ---- #876: the closed kind set and the optional visual form ---------
    def the_set_is_closed_and_well_formed():
        """The FILE's own two properties, asserted rather than trusted: no kind
        may declare a role named `kind` (flat block — it would be the selector),
        and no kind may declare zero roles (every form naming it would then
        validate vacuously). Both make a Move-level refusal wrong if they fail,
        so they are caught at the set and never at a record."""
        kinds = load_figure_kinds()
        assert kinds, "the closed set is empty"
        for name, roles in kinds.items():
            assert roles, "kind %s declares no roles" % name
            assert KIND_SELECTOR not in roles, "kind %s declares a `kind` role" % name

        import tempfile as _tf

        for bad, why in (
            ({"kinds": {"k": {"roles": []}}}, "no roles"),
            ({"kinds": {"k": {"roles": ["kind"]}}}, "a `kind` role"),
            ({"kinds": {}}, "no kinds"),
        ):
            with _tf.NamedTemporaryFile("w", suffix=".json", delete=False) as handle:
                json.dump(bad, handle)
                path = handle.name
            try:
                load_figure_kinds(path)
            except ValueError:
                pass
            else:
                raise AssertionError("a set declaring %s was accepted" % why)

    check("#876 the closed kind set refuses its own two malformations",
          the_set_is_closed_and_well_formed)

    def a_record_without_a_form_is_unchanged():
        """AC2: the optional field changes NOTHING for the twenty-two records
        that carry no form — admitted, rendered and round-tripped exactly as
        before. This is the assertion the widening of condition 3 could break
        silently, because a record that still passes looks identical to one
        nothing touched."""
        proposals = read_proposals(_record("plain"))
        assert len(proposals) == 1 and proposals[0].admitted, "a plain record was refused"
        mapping = proposals[0].mapping
        assert "visual_form" not in mapping, "a form appeared on a record that has none"
        rendered = render_move(mapping)
        assert "visual_form" not in rendered, "the renderer wrote a form that does not exist"
        back, _ = parse_record(1, rendered.split("\n"))
        assert back == mapping, "the plain round trip is no longer identity"

    check("#876 AC2 a record with no form is untouched, through the round trip",
          a_record_without_a_form_is_unchanged)

    def a_conforming_form_is_admitted_and_round_trips():
        proposals = read_proposals(_record("axied", AXIS_FORM))
        assert proposals[0].admitted, "a conforming form was refused: %s" % (
            proposals[0].refusal,)
        form = proposals[0].mapping["visual_form"]
        assert form["kind"] == "axis", form
        assert form["criterion"] == "the one axis both endpoints clarify", form
        rendered = render_move(proposals[0].mapping)
        back, _ = parse_record(1, rendered.split("\n"))
        assert back["visual_form"] == form, (
            "the form did not survive the round trip: %r vs %r" % (back.get("visual_form"), form))
        # The kind's role ORDER, not the typing order.
        lines = [line.strip() for line in rendered.split("\n") if line.startswith("  ")]
        keys = [line.split(":", 1)[0] for line in lines if ":" in line]
        assert keys[keys.index("kind"):] == ["kind", "endpoint_a", "endpoint_b", "criterion"], keys

    check("#876 AC3 a conforming form is admitted and renders in role order",
          a_conforming_form_is_admitted_and_round_trips)

    # AC1, all three arms. Each is refused BY NAME — the condition token and
    # the offending kind or role appear in the refusal, because "refused" alone
    # sends the owner back to a file with no line to look at.
    def refuses_form(form, fragment, label):
        def run():
            proposals = read_proposals(_record("subject", form))
            bad = [p for p in proposals if not p.admitted]
            assert bad, "expected a refusal, the record was admitted"
            refusal = bad[0].refusal
            assert refusal.condition == "visual-form", (
                "expected condition visual-form, got %s (%s)" % (refusal.condition, refusal))
            assert fragment in str(refusal), (
                "the refusal does not name %r: %s" % (fragment, refusal))

        check(label, run)

    refuses_form(
        "visual_form:\n  kind: spiral\n  endpoint_a: x\n",
        "`spiral`",
        "#876 AC1 an unknown kind is refused, naming it")
    refuses_form(
        "visual_form:\n  kind: axis\n  endpoint_a: x\n  endpoint_b: y\n",
        "`criterion`",
        "#876 AC1 a missing role is refused, naming it")
    refuses_form(
        "visual_form:\n  kind: axis\n  endpoint_a: x\n  endpoint_b: y\n"
        "  criterion: z\n  midpoint: w\n",
        "`midpoint`",
        "#876 AC1 a role outside the kind is refused, naming it")
    refuses_form(
        "visual_form:\n  endpoint_a: x\n",
        "names no `kind`",
        "#876 AC1 a form with no kind is refused")
    refuses_form(
        "visual_form:\n  kind: axis\n  endpoint_a: x\n  endpoint_b: y\n  criterion:\n",
        "`criterion`",
        "#876 AC1 a role mapped to nothing is refused, naming it")

    def an_unknown_ninth_key_is_still_refused():
        """The widening admits `visual_form` and NOTHING else — the catch
        condition 3 exists for is unchanged, which a widening is exactly the
        kind of change that can quietly remove."""
        proposals = read_proposals(_record("subject", "notes: >-\n  a ninth key\n"))
        bad = [p for p in proposals if not p.admitted]
        assert bad, "a ninth key other than `visual_form` was admitted"
        assert bad[0].refusal.condition == "3", bad[0].refusal
        seven = _record("subject").replace("excerpt: >-\n  a passage somewhere\n", "")
        proposals = read_proposals(seven)
        assert not proposals[0].admitted, "a seven-key record was admitted"
        assert proposals[0].refusal.condition == "3", proposals[0].refusal

    check("#876 condition 3 still refuses a ninth key and a seventh",
          an_unknown_ninth_key_is_still_refused)

    def the_nesting_is_admitted_by_name_not_by_shape():
        """An indented `key: value` under any OTHER field is the scalar it has
        always been. Admitting the nesting by shape would silently retype every
        record whose prose happens to contain a colon at the start of a line."""
        text = _record("colonist").replace(
            "intent: >-\n  does a thing", "intent:\n  caveat: does a thing")
        proposals = read_proposals(text)
        assert proposals[0].admitted, proposals[0].refusal
        value = proposals[0].mapping["intent"]
        assert isinstance(value, str) and "caveat: does a thing" in value, (
            "an indented `key: value` under `intent` became a mapping: %r" % (value,))

    check("#876 the nested block is admitted by NAME, never by shape",
          the_nesting_is_admitted_by_name_not_by_shape)

    def a_saved_form_survives_index_regeneration():
        """`write_index` reads every file back through `parse_record`. A form
        that did not survive that path would corrupt the INDEX row's source
        mapping, which is how the column-0 sequence defect reached INDEX."""
        with tempfile.TemporaryDirectory() as moves_dir:
            proposals = read_proposals(_record("axied", AXIS_FORM))
            save_accepted(moves_dir, proposals)
            back = read_saved(os.path.join(moves_dir, "axied.md"))
            assert back["visual_form"]["kind"] == "axis", back
            assert back == proposals[0].mapping, "the saved form did not read back"
            index = open(os.path.join(moves_dir, "INDEX.md")).read()
            assert "| axied | observed |" in index, index
            assert "visual_form" not in index, "a form reached the INDEX row"

    check("#876 a saved form survives save -> read -> INDEX regeneration",
          a_saved_form_survives_index_regeneration)

    def the_shipped_record_carries_its_form():
        """AC3 against the repository rather than against a fixture: the one
        record the issue names is admitted at its shipped bytes."""
        path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "moves", "introduce_paired_conceptual_axis.md")
        if not os.path.exists(path):
            return
        mapping = read_saved(path)
        assert mapping.get("visual_form", {}).get("kind") == "axis", mapping.get("visual_form")
        check_visual_form(mapping, 1)

    check("#876 AC3 the shipped axis record is admitted at its bytes",
          the_shipped_record_carries_its_form)

    for failure in failures:
        sys.stderr.write("FAIL  %s\n" % failure)
    print("move_ingest self-test: %d checks, %d failed" % (len(ran), len(failures)))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
