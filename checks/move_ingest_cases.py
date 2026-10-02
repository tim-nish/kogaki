#!/usr/bin/env python3
"""checks/move_ingest_cases.py — tools/move_ingest.py's fixture pass, moved here from
`tools/move_ingest.py --self-test` under kogaki#1238: a Test lives only under the
declared Check root. The cases are the same cases, verbatim, run against the
tool's own module namespace; the tool keeps none of them. Run by
checks/check-move-ingest.sh, which reads the count this file prints against the
registry's `case_floor`."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
import move_ingest as _m  # noqa: E402

# The cases were written inside the module and name its functions bare; the
# module namespace is brought in whole so they read exactly as they did.
globals().update({k: v for k, v in vars(_m).items() if not k.startswith("__")})


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
        text = _record("m0").replace("after: >-\n", "after: >-\n\n") + _record("m1")
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
        _record().replace("breaks: >-", "before: >-\n  x\nbreaks: >-"),
        "2",
        "AC3 cond 2 duplicate key refused",
    )

    # ---- condition 3 -----------------------------------------------------
    refuses(
        _record().replace("presupposes: >-\n  the reader has read the prior Leg\n", ""),
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
        text = _record("first") + "before: >-\n  x\nid: second\ntechnique: >-\n  x\n"
        proposals = read_proposals(text)
        assert len(proposals) == 2, "expected 2 records, got %d" % len(proposals)
        assert not proposals[0].admitted, "the absorbing record was admitted"
        assert proposals[0].refusal.condition == "2", (
            "the absorbing record should carry a duplicate `before`: %s" % proposals[0].refusal
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
            "presupposes: >-\n  the reader has read the prior Leg\n",
            "presupposes:\n- one\n- two\n- three\n",
        )
        proposals = read_proposals(text)
        assert proposals[0].admitted, "legal column-0 sequence refused: %s" % proposals[0].refusal
        assert proposals[0].mapping["presupposes"] == ["one", "two", "three"], (
            proposals[0].mapping["presupposes"]
        )

    check("AC3 `-` exemption admits a legal column-0 sequence", legal_sequence_admitted)

    def sequence_closes_before_first_item():
        # A key with an indented value opens no sequence, so a later column-0
        # bullet has nothing to belong to. This is the `no inline value` failure
        # §6.9.0 records, and it must NOT pass.
        text = _record().replace(
            "presupposes: >-\n  the reader has read the prior Leg\n",
            "presupposes:\n  an indented scalar\n- stray\n",
        )
        proposals = read_proposals(text)
        assert not proposals[0].admitted, "a bullet after an indented value was admitted"
        assert proposals[0].refusal.condition == "4", proposals[0].refusal

    check("AC3 sequence closes before its first item", sequence_closes_before_first_item)

    def rule_is_not_a_sequence_item():
        # `---` starts with `-` but is NOT `- ` or bare `-`, so it is foreign to
        # a sequence rather than an item of it — the catch stays on the RULE.
        text = _record().replace(
            "presupposes: >-\n  the reader has read the prior Leg\n",
            "presupposes:\n- one\n---\n- two\n",
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
            "technique: >-\n  does a thing\n",
            "technique: >-\n  does a thing\n  across two lines\n",
        )
        mapping = read_proposals(text)[0].mapping
        assert mapping["technique"] == "does a thing across two lines", repr(mapping["technique"])
        assert "\n" not in mapping["technique"], "a folded scalar kept its newlines"
        # And it survives the save/read round trip unchanged.
        with tempfile.TemporaryDirectory() as tmp:
            moves = os.path.join(tmp, "moves")
            save_accepted(moves, read_proposals(text))
            back = read_saved(move_path(moves, "a-move"))
            assert back["technique"] == mapping["technique"], (
                "the folded value changed across the round trip: %r -> %r"
                % (mapping["technique"], back["technique"])
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
            "presupposes: >-\n  the reader has read the prior Leg\n",
            "presupposes:\n- one\n- two\n",
        )
        proposal = read_proposals(text)[0]
        assert proposal.mapping["presupposes"] == ["one", "two"], proposal.mapping["presupposes"]

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
            assert back["presupposes"] == ["one", "two"], (
                "a sequence did not survive the round trip: %r" % (back["presupposes"],)
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
            assert "does a thing" in rows[1], "technique column not read off the file: %s" % rows[1]

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

        tree = ast.parse(open(_m.__file__).read())
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
        bad = _record("broken").replace("breaks: >-\n  not always\n", "")
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

    # ---- #876/#1175: the closed kind set and the optional `figure` -------
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
        assert "figure" not in mapping, "a form appeared on a record that has none"
        rendered = render_move(mapping)
        assert "figure" not in rendered, "the renderer wrote a form that does not exist"
        back, _ = parse_record(1, rendered.split("\n"))
        assert back == mapping, "the plain round trip is no longer identity"

    check("#876 AC2 a record with no form is untouched, through the round trip",
          a_record_without_a_form_is_unchanged)

    def a_conforming_form_is_admitted_and_round_trips():
        proposals = read_proposals(_record("axied", AXIS_FORM))
        assert proposals[0].admitted, "a conforming form was refused: %s" % (
            proposals[0].refusal,)
        form = proposals[0].mapping["figure"]
        assert form["kind"] == "axis", form
        assert form["criterion"] == "the one axis both endpoints clarify", form
        rendered = render_move(proposals[0].mapping)
        back, _ = parse_record(1, rendered.split("\n"))
        assert back["figure"] == form, (
            "the form did not survive the round trip: %r vs %r" % (back.get("figure"), form))
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
            assert refusal.condition == "figure", (
                "expected condition figure, got %s (%s)" % (refusal.condition, refusal))
            assert fragment in str(refusal), (
                "the refusal does not name %r: %s" % (fragment, refusal))

        check(label, run)

    refuses_form(
        "figure:\n  kind: spiral\n  endpoint_a: x\n",
        "`spiral`",
        "#876 AC1 an unknown kind is refused, naming it")
    refuses_form(
        "figure:\n  kind: axis\n  endpoint_a: x\n  endpoint_b: y\n",
        "`criterion`",
        "#876 AC1 a missing role is refused, naming it")
    refuses_form(
        "figure:\n  kind: axis\n  endpoint_a: x\n  endpoint_b: y\n"
        "  criterion: z\n  midpoint: w\n",
        "`midpoint`",
        "#876 AC1 a role outside the kind is refused, naming it")
    refuses_form(
        "figure:\n  endpoint_a: x\n",
        "names no `kind`",
        "#876 AC1 a form with no kind is refused")
    refuses_form(
        "figure:\n  kind: axis\n  endpoint_a: x\n  endpoint_b: y\n  criterion:\n",
        "`criterion`",
        "#876 AC1 a role mapped to nothing is refused, naming it")

    def an_unknown_ninth_key_is_still_refused():
        """The optional set admits `draws_on`, `continues_from`, `evidence`,
        `figure` and NOTHING else — the catch condition 3 exists for is
        unchanged, which a widening is exactly the kind of change that can
        quietly remove."""
        proposals = read_proposals(_record("subject", "notes: >-\n  a ninth key\n"))
        bad = [p for p in proposals if not p.admitted]
        assert bad, "a key outside the optional set was admitted"
        assert bad[0].refusal.condition == "3", bad[0].refusal
        seven = _record("subject").replace("breaks: >-\n  not always\n", "")
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
            "technique: >-\n  does a thing", "technique:\n  caveat: does a thing")
        proposals = read_proposals(text)
        assert proposals[0].admitted, proposals[0].refusal
        value = proposals[0].mapping["technique"]
        assert isinstance(value, str) and "caveat: does a thing" in value, (
            "an indented `key: value` under `technique` became a mapping: %r" % (value,))

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
            assert back["figure"]["kind"] == "axis", back
            assert back == proposals[0].mapping, "the saved form did not read back"
            index = open(os.path.join(moves_dir, "INDEX.md")).read()
            assert "| axied |" in index, index
            assert "figure" not in index, "a form reached the INDEX row"

    check("#876 a saved form survives save -> read -> INDEX regeneration",
          a_saved_form_survives_index_regeneration)

    # ---- kogaki#1175: the Passage-to-Move path ----------------------------
    # Every case here constructs a stub `claude -p ...` (the argv shape
    # `spawn_model` builds) so the run touches no network and no real model,
    # and runs identically wherever `claude` is or is not on PATH.

    def _write_passage_stub(path, record_text, counter_path=None):
        lines = ["#!/usr/bin/env python3", "import sys", "sys.stdin.read()"]
        if counter_path:
            lines.append("open(%r, 'a').write('x')" % counter_path)
        lines.append("sys.stdout.write(%r)" % record_text)
        with open(path, "w") as handle:
            handle.write("\n".join(lines) + "\n")
        os.chmod(path, 0o755)

    def a_missing_passage_model_command_refuses_by_name():
        try:
            spawn_model("/no/such/command/anywhere", "n/a", "prompt", 5)
        except Refusal as refusal:
            assert "could not be run" in str(refusal), str(refusal)
            return
        raise AssertionError("spawn_model did not refuse a command that cannot be spawned")

    check("#1175 passage: a missing model command refuses by name",
          a_missing_passage_model_command_refuses_by_name)

    def a_full_run_writes_a_screen_and_saves_nothing_before_select():
        with tempfile.TemporaryDirectory() as d:
            passage_path = os.path.join(d, "passage.txt")
            with open(passage_path, "w") as handle:
                handle.write("A passage about persistent institutions.\n")
            contract_path = os.path.join(d, "contract.md")
            with open(contract_path, "w") as handle:
                handle.write("EXTRACTION CONTRACT\n")
            moves_dir = os.path.join(d, "moves")
            os.makedirs(moves_dir)
            stub = os.path.join(d, "stub_model")
            _write_passage_stub(stub, _record("derive_a_thing"))
            out = os.path.join(d, "run")
            result = run_passage(passage_path, contract_path, moves_dir,
                                  stub, "n/a", out, 30)
            assert os.path.isfile(result["screen"]), "no PassageScreen.md written"
            screen = open(result["screen"]).read()
            assert "accept as new / merge into <id> / decline" in screen, screen
            assert result["written"] is None, "a run with no --select wrote something"
            assert not os.path.isfile(os.path.join(moves_dir, "derive_a_thing.md")), (
                "a Move landed on disk before the owner's selection")

    check("#1175 passage: a full run writes the screen and saves nothing before --select",
          a_full_run_writes_a_screen_and_saves_nothing_before_select)

    def the_model_is_spawned_at_most_once_per_out_dir():
        with tempfile.TemporaryDirectory() as d:
            passage_path = os.path.join(d, "passage.txt")
            open(passage_path, "w").write("A passage.\n")
            contract_path = os.path.join(d, "contract.md")
            open(contract_path, "w").write("CONTRACT\n")
            moves_dir = os.path.join(d, "moves")
            os.makedirs(moves_dir)
            counter = os.path.join(d, "spawn_count")
            stub = os.path.join(d, "stub_model")
            _write_passage_stub(stub, _record("derive_a_thing"), counter_path=counter)
            out = os.path.join(d, "run")
            run_passage(passage_path, contract_path, moves_dir, stub, "n/a", out, 30)
            result = run_passage(passage_path, contract_path, moves_dir, stub, "n/a",
                                  out, 30, select="accept")
            spawns = len(open(counter).read()) if os.path.isfile(counter) else 0
            assert spawns == 1, "the model was spawned %d time(s) for one Passage" % spawns
            assert result["written"] == [os.path.join(moves_dir, "derive_a_thing.md")]

    check("#1175 passage: the model is spawned at most once per out_dir",
          the_model_is_spawned_at_most_once_per_out_dir)

    def select_accept_writes_and_regenerates_the_index():
        with tempfile.TemporaryDirectory() as d:
            passage_path = os.path.join(d, "passage.txt")
            open(passage_path, "w").write("A passage.\n")
            contract_path = os.path.join(d, "contract.md")
            open(contract_path, "w").write("CONTRACT\n")
            moves_dir = os.path.join(d, "moves")
            os.makedirs(moves_dir)
            stub = os.path.join(d, "stub_model")
            _write_passage_stub(stub, _record("derive_a_thing"))
            out = os.path.join(d, "run")
            run_passage(passage_path, contract_path, moves_dir, stub, "n/a", out, 30)
            result = run_passage(passage_path, contract_path, moves_dir, stub, "n/a",
                                  out, 30, select="accept")
            saved = os.path.join(moves_dir, "derive_a_thing.md")
            assert result["written"] == [saved]
            assert os.path.isfile(saved)
            index = open(os.path.join(moves_dir, "INDEX.md")).read()
            assert "| derive_a_thing |" in index, index

    check("#1175 passage: --select accept validates keys, writes the file, regenerates INDEX",
          select_accept_writes_and_regenerates_the_index)

    def decline_writes_nothing():
        with tempfile.TemporaryDirectory() as d:
            passage_path = os.path.join(d, "passage.txt")
            open(passage_path, "w").write("A passage.\n")
            contract_path = os.path.join(d, "contract.md")
            open(contract_path, "w").write("CONTRACT\n")
            moves_dir = os.path.join(d, "moves")
            os.makedirs(moves_dir)
            stub = os.path.join(d, "stub_model")
            _write_passage_stub(stub, _record("derive_a_thing"))
            out = os.path.join(d, "run")
            run_passage(passage_path, contract_path, moves_dir, stub, "n/a", out, 30)
            result = run_passage(passage_path, contract_path, moves_dir, stub, "n/a",
                                  out, 30, select="decline")
            assert result["written"] is None, "decline wrote something"
            assert os.listdir(moves_dir) == [], (
                "decline left a file in moves/: %s" % os.listdir(moves_dir))

    check("#1175 passage: --select decline writes nothing", decline_writes_nothing)

    def select_merge_rewrites_the_named_move_and_regenerates_the_index():
        with tempfile.TemporaryDirectory() as d:
            passage_path = os.path.join(d, "passage.txt")
            open(passage_path, "w").write("A passage.\n")
            contract_path = os.path.join(d, "contract.md")
            open(contract_path, "w").write("CONTRACT\n")
            moves_dir = os.path.join(d, "moves")
            os.makedirs(moves_dir)
            save_accepted(moves_dir, read_proposals(_record("existing_move")))
            stub = os.path.join(d, "stub_model")
            _write_passage_stub(stub, _record("proposed_move").replace(
                "technique: >-\n  does a thing\n",
                "technique: >-\n  does a merged thing\n"))
            out = os.path.join(d, "run")
            run_passage(passage_path, contract_path, moves_dir, stub, "n/a", out, 30)
            result = run_passage(passage_path, contract_path, moves_dir, stub, "n/a",
                                  out, 30, select="merge:existing_move")
            target = os.path.join(moves_dir, "existing_move.md")
            assert result["written"] == [target]
            assert not os.path.isfile(os.path.join(moves_dir, "proposed_move.md")), (
                "merge also wrote the proposal's own id")
            merged = read_saved(target)
            assert merged["id"] == "existing_move"
            assert merged["technique"] == "does a merged thing", merged["technique"]
            index = open(os.path.join(moves_dir, "INDEX.md")).read()
            assert "| existing_move | does a merged thing |" in index, index

    check("#1175 passage: --select merge:<id> rewrites the named Move and regenerates INDEX",
          select_merge_rewrites_the_named_move_and_regenerates_the_index)

    def select_merge_refuses_an_unknown_target():
        with tempfile.TemporaryDirectory() as d:
            passage_path = os.path.join(d, "passage.txt")
            open(passage_path, "w").write("A passage.\n")
            contract_path = os.path.join(d, "contract.md")
            open(contract_path, "w").write("CONTRACT\n")
            moves_dir = os.path.join(d, "moves")
            os.makedirs(moves_dir)
            stub = os.path.join(d, "stub_model")
            _write_passage_stub(stub, _record("derive_a_thing"))
            out = os.path.join(d, "run")
            run_passage(passage_path, contract_path, moves_dir, stub, "n/a", out, 30)
            try:
                run_passage(passage_path, contract_path, moves_dir, stub, "n/a", out, 30,
                             select="merge:no_such_move")
            except Refusal as refusal:
                assert "names no saved Move" in str(refusal), str(refusal)
                return
            raise AssertionError("merge into an unknown id was not refused")

    check("#1175 passage: --select merge:<id> refuses an unknown target",
          select_merge_refuses_an_unknown_target)

    def a_near_duplicate_is_named_from_the_index():
        with tempfile.TemporaryDirectory() as d:
            passage_path = os.path.join(d, "passage.txt")
            open(passage_path, "w").write("A passage.\n")
            contract_path = os.path.join(d, "contract.md")
            open(contract_path, "w").write("CONTRACT\n")
            moves_dir = os.path.join(d, "moves")
            os.makedirs(moves_dir)
            existing = _record("derive_mitigation_from_mechanism").replace(
                "technique: >-\n  does a thing\n",
                "technique: >-\n  derives a mitigation from an observed causal mechanism\n")
            save_accepted(moves_dir, read_proposals(existing))
            stub = os.path.join(d, "stub_model")
            proposal_text = _record("propose_a_mitigation_from_mechanism").replace(
                "technique: >-\n  does a thing\n",
                "technique: >-\n  derives a mitigation from an observed causal mechanism\n")
            _write_passage_stub(stub, proposal_text)
            out = os.path.join(d, "run")
            result = run_passage(passage_path, contract_path, moves_dir, stub, "n/a", out, 30)
            assert result["duplicates"], "an identical technique named no near-duplicate"
            assert result["duplicates"][0][0] == "derive_mitigation_from_mechanism"
            screen = open(result["screen"]).read()
            assert "derive_mitigation_from_mechanism" in screen, screen

    check("#1175 passage: a near-duplicate technique is named from moves/INDEX.md",
          a_near_duplicate_is_named_from_the_index)

    def a_refused_proposal_is_reported_and_never_selectable():
        with tempfile.TemporaryDirectory() as d:
            passage_path = os.path.join(d, "passage.txt")
            open(passage_path, "w").write("A passage.\n")
            contract_path = os.path.join(d, "contract.md")
            open(contract_path, "w").write("CONTRACT\n")
            moves_dir = os.path.join(d, "moves")
            os.makedirs(moves_dir)
            malformed = _record("broken").replace(
                "presupposes: >-\n  the reader has read the prior Leg\n", "")
            stub = os.path.join(d, "stub_model")
            _write_passage_stub(stub, malformed)
            out = os.path.join(d, "run")
            result = run_passage(passage_path, contract_path, moves_dir, stub, "n/a", out, 30)
            assert not result["proposal"].admitted, "a seven-key record was admitted"
            screen = open(result["screen"]).read()
            assert screen.startswith("refused:"), screen
            try:
                run_passage(passage_path, contract_path, moves_dir, stub, "n/a", out, 30,
                             select="accept")
            except Refusal as refusal:
                assert "nothing to select against" in str(refusal), str(refusal)
                return
            raise AssertionError("--select accept did not refuse a refused proposal")

    check("#1175 passage: a refused proposal is reported and never selectable",
          a_refused_proposal_is_reported_and_never_selectable)

    def select_rejects_an_unknown_token():
        with tempfile.TemporaryDirectory() as d:
            passage_path = os.path.join(d, "passage.txt")
            open(passage_path, "w").write("A passage.\n")
            contract_path = os.path.join(d, "contract.md")
            open(contract_path, "w").write("CONTRACT\n")
            moves_dir = os.path.join(d, "moves")
            os.makedirs(moves_dir)
            stub = os.path.join(d, "stub_model")
            _write_passage_stub(stub, _record("derive_a_thing"))
            out = os.path.join(d, "run")
            run_passage(passage_path, contract_path, moves_dir, stub, "n/a", out, 30)
            try:
                run_passage(passage_path, contract_path, moves_dir, stub, "n/a", out, 30,
                             select="approve")
            except Refusal as refusal:
                assert refusal.condition == "passage", refusal
                return
            raise AssertionError("an unknown --select token was not refused")

    check("#1175 passage: --select refuses an unrecognized token",
          select_rejects_an_unknown_token)

    # ---- kogaki#1216: the question before the passage, read off the Analysis
    NONE_ROW = ("## 2. Reader before and after\n\n"
                "| dimension   | before                         | after |\n"
                "|-------------|--------------------------------|-------|\n"
                "| knowledge   | little; may know the word      | one claim |\n"
                '| question    | none, or "should I read this?" | answered |\n'
                "| trust       | neutral                        | raised |\n")
    HELD_ROW = NONE_ROW.replace('none, or "should I read this?"', "holds a question about X")

    def _proposal_mapping():
        return {
            "id": "a_move",
            "before": "knowledge: has noticed a crowded shelf. question: holds an "
                      "unanswered question about why so many such works are appearing "
                      "now. expectation: anticipates a survey.",
            "question": "holds: why so many works are appearing now settles: whether "
                        "the wave is new raises: why worsening conditions renew interest",
        }

    def a_none_row_writes_holds_none_and_never_a_composed_question():
        mapping = _proposal_mapping()
        changed = write_none_question(mapping, NONE_ROW)
        assert changed == ["question", "before"], changed
        assert mapping["question"] == (
            "holds: none settles: whether the wave is new raises: why worsening "
            "conditions renew interest"), mapping["question"]
        assert mapping["before"] == (
            "knowledge: has noticed a crowded shelf. question: holds: none. "
            "expectation: anticipates a survey."), mapping["before"]
        assert "unanswered question" not in mapping["before"]
    check("#1216 passage: an Analysis whose question-before reads none writes "
          "`holds: none` into `question` and `before`, never a composed question",
          a_none_row_writes_holds_none_and_never_a_composed_question)

    def a_held_row_leaves_the_proposal_untouched():
        mapping = _proposal_mapping()
        original = dict(mapping)
        assert write_none_question(mapping, HELD_ROW) == []
        assert mapping == original
    check("#1216 passage: an Analysis whose question-before holds a question "
          "leaves the proposal untouched", a_held_row_leaves_the_proposal_untouched)

    def a_passage_with_no_analysis_row_leaves_the_proposal_untouched():
        mapping = _proposal_mapping()
        original = dict(mapping)
        assert analysis_question_before("just a passage, no table") is None
        assert write_none_question(mapping, "just a passage, no table") == []
        assert mapping == original
        # And the screen names the rewrite only where one happened.
        prop = Proposal(1, mapping=_proposal_mapping())
        assert "holds: none" not in render_passage_screen(prop, [])
        assert "never a composed question" in render_passage_screen(prop, [], ["question"])
    check("#1216 passage: a Passage carrying no Analysis row is left untouched, "
          "and the screen names a rewrite only where one happened",
          a_passage_with_no_analysis_row_leaves_the_proposal_untouched)

    for failure in failures:
        sys.stderr.write("FAIL  %s\n" % failure)
    print("move_ingest self-test: %d checks, %d failed" % (len(ran), len(failures)))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(self_test())
