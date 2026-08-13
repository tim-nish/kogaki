#!/usr/bin/env python3
"""Move ingestion — the mechanical half of SPEC-draft-pipeline §6.9.

This module owns everything §6.9 makes MECHANICAL: locating records, admitting
them under §6.9.0's four conditions, normalizing to §4.2's eight fields,
rendering a saved file, and regenerating moves/INDEX.md.

It owns NOTHING §6.9 makes JUDGMENT. There is no scoring, no verdict, and no
lint here, and nothing in this file admits a Move: `save_accepted()` is called
with the ids the owner selected at the screen, and it is the caller's business
to have obtained them. §6.9: "ADMISSION IS THE OWNER'S ACT AT THAT SCREEN,
never the command's."

The division of labour §6.9.0 states, kept: condition 4 catches what the parser
accepts silently, and the parser catches what is not YAML. Neither is asked to
do the other's job, and neither is left resting on the other.
"""

import argparse
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
    "sources",
)

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

    def flush():
        nonlocal current, buffer, folded, seq
        if current is None:
            return
        if seq is not None:
            mapping[current] = seq
        elif folded:
            # A `>-` folded scalar: lines join with single spaces, trailing
            # newlines stripped. This is what makes the round trip in §6.9.1a
            # byte-identical in FORM to what the owner authored.
            mapping[current] = " ".join(p.strip() for p in buffer if p.strip())
        else:
            mapping[current] = "\n".join(buffer).strip()
        current, buffer, folded, seq = None, [], False, None

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
    extra = sorted(have - want)
    if missing or extra:
        parts = []
        if missing:
            parts.append("missing %s" % ", ".join("`%s`" % k for k in missing))
        if extra:
            parts.append("unexpected %s" % ", ".join("`%s`" % k for k in extra))
        raise Refusal(
            "3",
            "record does not carry exactly §4.2's eight keys — " + "; ".join(parts),
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
    stopping the run: the owner sees the whole file at one screen, and a single
    malformed record does not hide the other twenty-one.
    """
    proposals = []
    for first_line_no, lines in split_records(text):
        try:
            check_column0_shape(first_line_no, lines)
            mapping, _order = parse_record(first_line_no, lines)
            stripped = strip_excluded(mapping)
            check_field_set(mapping, first_line_no)
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
# AC8 — the derivation pointer (§6.9.4, form decided at kogaki#417 D1)
# --------------------------------------------------------------------------

def attach_derivation_pointer(mapping, provenance):
    """Write the accepted Move's derivation pointer INSIDE `sources`.

    §6.9.4 fills the `move-sources-derivation-vehicle` slot with the ingestion
    run: it is the only moment holding the accepted Move and its served ruling
    line together, and a follow-up pass would re-derive that link by guess.

    The FORM is prose provenance, decided by the owner at kogaki#417 D1 over a
    `path:line@sha` pin. Grounds: the corpus's own survival measurement — 148
    unpinned file:line citations broke repeatedly against 1,127 issue anchors
    of which every one survived every relocation — plus the specimen already
    writing `sources` this way, with zero occurrences of `path:line@sha`.

    NO NINTH FIELD is added: the pointer joins the existing `sources` value.
    """
    if not provenance:
        return mapping
    existing = str(mapping.get("sources", "")).strip()
    if provenance in existing:
        return mapping
    mapping["sources"] = ("%s %s" % (existing, provenance)).strip()
    return mapping


# --------------------------------------------------------------------------
# Save and regenerate
# --------------------------------------------------------------------------

def save_accepted(moves_dir, accepted, provenance=None):
    """Write one file per accepted Move, then regenerate INDEX.

    `accepted` is the set of proposals the OWNER selected. Nothing in this
    module decides membership — admission is the owner's act at the screen.

    An id collision is refused rather than overwritten: §6.9.1a puts that
    collision at the selection screen as review's dedupe judgment, "never as a
    silent overwrite", so reaching this function with two of them is a bug in
    the caller and is raised rather than absorbed.
    """
    if not os.path.isdir(moves_dir):
        os.makedirs(moves_dir)

    # The collision set is seeded from what is ALREADY on disk, not only from
    # this batch. A per-call `seen` catches two accepted twins in one run and
    # silently overwrites an id saved by an EARLIER run — and the very first
    # live run is kogaki#177's backfill over ~20 already-admitted Moves, which
    # is precisely that path. `write_index` would then regenerate an INDEX
    # showing nothing lost.
    seen = set()
    if os.path.isdir(moves_dir):
        seen = {
            name[:-3]
            for name in os.listdir(moves_dir)
            if name.endswith(".md") and name != "INDEX.md"
        }
    written = []
    for proposal in accepted:
        move_id = proposal.id
        if move_id in seen:
            raise Refusal(
                "1a",
                "the id `%s` is already taken — by another Move accepted in this "
                "batch, or by one saved in an earlier run. The collision belongs "
                "at the selection screen as review's dedupe judgment, never here" % move_id,
            )
        seen.add(move_id)
        mapping = dict(proposal.mapping)
        attach_derivation_pointer(mapping, provenance)
        path = move_path(moves_dir, move_id)
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

def render_screen(proposals):
    """The count line §6.9.0 requires, plus one line per proposal.

    The PARSED RECORD COUNT is the only instrument that can catch `1` where the
    owner wrote `22`, and it is arithmetic the command already holds, displayed
    rather than withheld. It is printed FIRST and unconditionally.
    """
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
        else:
            lines.append("  line %-5d REFUSED %s" % (proposal.line_no, proposal.refusal))
    return "\n".join(lines)


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Move ingestion: split, admit, normalize. Saves nothing — "
        "admission is the owner's act at the selection screen."
    )
    parser.add_argument("input", nargs="?", help="the owner-authored Moves file")
    parser.add_argument("--self-test", action="store_true")
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

    print(render_screen(proposals))
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
sources: >-
  a passage somewhere
"""


def _record(move_id="a-move"):
    return EIGHT.format(id=move_id)


def self_test():
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
        screen = render_screen(proposals)
        assert screen.startswith("parsed records: 22"), (
            "the count must be the first thing on the screen; got %r" % screen[:40]
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
        _record().replace("sources: >-", "status: observed\nsources: >-"),
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

    # ---- AC8: the derivation pointer, prose, no ninth field --------------
    def pointer_written_in_the_saving_act():
        with tempfile.TemporaryDirectory() as tmp:
            moves = os.path.join(tmp, "moves")
            proposal = read_proposals(_record("p"))[0]
            save_accepted(moves, [proposal], provenance="derived from the 2026-08-06 rulings")
            body = open(move_path(moves, "p")).read()
            assert "derived from the 2026-08-06 rulings" in body, body
            keys = [ln.split(":")[0] for ln in body.splitlines() if ln and not ln[:1].isspace()]
            assert keys == list(FIELDS), "a ninth field was added: %s" % keys
            saved = read_saved(move_path(moves, "p"))
            assert "a passage somewhere" in saved["sources"], "the existing sources value was lost"
            assert "derived from the 2026-08-06 rulings" in saved["sources"], (
                "the pointer is not inside `sources`"
            )

    check("AC8 pointer written inside `sources`, no ninth field", pointer_written_in_the_saving_act)

    # AC8's pointer FORM has no assertion here, and the absence is deliberate.
    #
    # One was written and REMOVED as vacuous: it passed a prose string into
    # `attach_derivation_pointer`, which only concatenates its argument, then
    # asserted the result was not a pin. No implementation of that function
    # could fail it — a pin appears in `sources` only if the caller passes one,
    # and the caller was the test. The fixture supplied the value under test,
    # which is kogaki#243's class, standing one check below the AC5 guard where
    # this file records catching it twice already. The mutation table having no
    # mutant for AC8's form was the corroborating tell.
    #
    # The real property — that nothing ever COMPOSES a `path:line@sha` — is not
    # this function's to hold. It lives in the caller, and the caller is
    # `.claude/skills/move-ingest/SKILL.md` step 4, which is prose. What IS
    # mechanical here is that the pointer is appended verbatim and nothing is
    # synthesized, and that is asserted below.
    def pointer_is_appended_verbatim_and_nothing_synthesized():
        mapping = attach_derivation_pointer({"sources": "a passage"}, "PROVENANCE")
        assert mapping["sources"] == "a passage PROVENANCE", repr(mapping["sources"])
        assert set(mapping) == {"sources"}, "a field was synthesized: %s" % sorted(mapping)

    check(
        "AC8 the pointer is appended verbatim, nothing synthesized",
        pointer_is_appended_verbatim_and_nothing_synthesized,
    )

    def pointer_is_idempotent():
        mapping = {"sources": "a passage"}
        attach_derivation_pointer(mapping, "the ruling")
        attach_derivation_pointer(mapping, "the ruling")
        assert mapping["sources"].count("the ruling") == 1, mapping["sources"]

    check("AC8 re-running does not duplicate the pointer", pointer_is_idempotent)

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
            name for name in defined if any(word in name.lower() for word in forbidden)
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

    for failure in failures:
        sys.stderr.write("FAIL  %s\n" % failure)
    print("move_ingest self-test: %d checks, %d failed" % (len(ran), len(failures)))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
