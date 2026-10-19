"""The Move library (kogaki#1463): the figure kinds, proposals, rendering a
saved record, and the save, merge and INDEX writers."""

import json
import os

from .records import (
    DIMENSIONS, FIELDS, KIND_SELECTOR, MOVE_RECORD_EXT, REPO_ROOT, Refusal,
    STATE_FIELDS, check_column0_shape, parse_record, split_records,
    strip_excluded, validate_move, yaml_read, yaml_write,
)


# --------------------------------------------------------------------------
# §6.9.3 — the visual form
# --------------------------------------------------------------------------

# Resolved from this module's own location, never from the caller's cwd: the
# set is repository material, and a Move ingested from any directory must be
# judged against the same closed set.
FIGURE_KINDS_PATH = os.path.join(REPO_ROOT, "src", "figure-kinds.json")

_KINDS_CACHE = {}


def load_figure_kinds(path=None):
    """The closed kind set, as `{kind: [role, ...]}`.

    Two properties of the FILE are asserted rather than trusted: no kind
    declares a role named `kind` (the flat block would let the selector win
    and drop the role), and no kind declares zero roles (every form naming it
    would validate vacuously). A malformed set is this repository's defect,
    so it raises rather than refusing the owner's Move.
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


# §6.9.0's precondition — `id` MUST be the record's first key — has NO guard
# here, deliberately: records are split AT a column-0 `id:`, so a guard could
# never fire (a mutation deleting it killed no test). A record with `before:`
# above `id:` is absorbed into the record above and caught twice: condition 2
# sees the duplicate `before`, and the Adapter (`validate_move`, kogaki#1418)
# sees the absorbed record missing a required field. Both are exercised.


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
# `attach_derivation_pointer` is GONE: the ingestion string it appended was
# not source text, was redundant with git, and changed a record AFTER the
# owner accepted it. Nothing may change a record between the owner's act and
# the write. The field is `excerpt` (kogaki#751, owner ruling 2026-09-02): the
# author's account of the reader movement observed, and a `sources` key
# beside it would be a design error.

# --------------------------------------------------------------------------
# Save and regenerate
# --------------------------------------------------------------------------

def save_accepted(moves_dir, accepted):
    """Write one file per accepted Move, then regenerate INDEX.

    `accepted` is the set the OWNER selected; nothing here decides membership.
    An id collision is raised rather than overwritten (§6.9.1a: "never as a
    silent overwrite"). The walk is TWO passes: every id clears the collision
    set before ANY file is created, so a refused batch leaves `moves/` and its
    INDEX as it found them, and a retry cannot collide with its own partial
    write (kogaki#419).
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
