#!/usr/bin/env python3
"""checks/derive_schema_cases.py — tools/derive_schema.py's fixture pass, moved here from
`tools/derive_schema.py --self-test` under kogaki#1238: a Test lives only under the
declared Check root. The cases are the same cases, verbatim, run against the
tool's own module namespace; the tool keeps none of them. Run by
checks/check-derive-schema.sh, which reads the count this file prints against the
registry's `case_floor`."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
import derive_schema as _m  # noqa: E402

# The cases were written inside the module and name its functions bare; the
# module namespace is brought in whole so they read exactly as they did.
globals().update({k: v for k, v in vars(_m).items() if not k.startswith("__")})


def self_test():
    failures = []
    ran = []

    def check(label, fn):
        ran.append(label)
        try:
            fn()
        except AssertionError as exc:
            failures.append("%s: %s" % (label, exc))
        except Exception as exc:  # noqa: BLE001 — a crash is a failure too
            failures.append("%s: unexpected %s: %s"
                             % (label, type(exc).__name__, exc))

    def refuses(fn, needle, label):
        def go():
            try:
                fn()
            except Refusal as refusal:
                assert needle in str(refusal), (
                    "wrong refusal: %s" % refusal)
                return
            raise AssertionError("did not refuse")
        check(label, go)

    def corpus_below_minimum_refuses():
        with tempfile.TemporaryDirectory() as d:
            _write_corpus(d, MIN_CORPUS - 1)
            paths = list_corpus(d)
            refuse_below_minimum(paths)

    refuses(corpus_below_minimum_refuses, "below the minimum",
            "a Corpus below the minimum size refuses, naming the count")

    def corpus_at_minimum_does_not_refuse():
        with tempfile.TemporaryDirectory() as d:
            _write_corpus(d, MIN_CORPUS)
            paths = list_corpus(d)
            refuse_below_minimum(paths)  # must not raise
            assert len(paths) == MIN_CORPUS

    check("a Corpus exactly at the minimum size is accepted",
          corpus_at_minimum_does_not_refuse)

    def strip_analysis_removes_the_passage():
        text = ANALYSIS_TEMPLATE.format(
            slug="x", passage_line="THE SECRET SOURCE TEXT LINE")
        stripped_text, stripped_lines = strip_analysis(text)
        assert "THE SECRET SOURCE TEXT LINE" not in stripped_text
        assert "THE SECRET SOURCE TEXT LINE" in stripped_lines
        assert "## Answers" in stripped_text
        assert "## 1. What the Passage does" in stripped_text

    check("strip_analysis removes the ## Passage section and reports it",
          strip_analysis_removes_the_passage)

    def a_figure_inside_the_passage_keeps_structure_drops_labels():
        text = ("# Passage analysis: x\n\nsource: not given\n\n"
                "## Passage\n\nTHE SECRET PROSE LINE\n\n"
                "## Figure\n\nkind: pyramid\nreferred to as: not named\n\n"
                "positions:\n  - top level: THE PRINTED LABEL\n\n"
                "relations:\n  - the top level is joined against the middle\n\n"
                "encoding:\n  - ranking \u2014 vertical position: higher is higher\n\n"
                "## Answers\n\nQ1 Purpose\n")
        stripped_text, stripped_lines = strip_analysis(text)
        assert "THE SECRET PROSE LINE" not in stripped_text
        assert "THE PRINTED LABEL" not in stripped_text
        assert "kind: pyramid" in stripped_text
        assert "  - top level: (label removed)" in stripped_text
        assert "  - the top level is joined against the middle" in stripped_text
        assert "vertical position: higher is higher" in stripped_text
        assert "THE SECRET PROSE LINE" in stripped_lines
        assert any("THE PRINTED LABEL" in ln for ln in stripped_lines)

    check("a Figure spec inside the Passage keeps kind, roles, relations and "
          "encoding and loses only its printed labels",
          a_figure_inside_the_passage_keeps_structure_drops_labels)

    def assembled_prompt_carries_no_passage_line():
        with tempfile.TemporaryDirectory() as d:
            _write_corpus(d, MIN_CORPUS, passage_line="ANOTHER SECRET LINE")
            paths = list_corpus(d)
            analyses, stripped_lines, _ = load_and_strip(paths)
            derivation_text = "DERIVATION INSTRUCTIONS\n"
            prompt = assemble_prompt(derivation_text, analyses)
            assert "ANOTHER SECRET LINE" not in prompt
            check_no_leak(prompt, stripped_lines)  # must not raise

    check("the assembled prompt carries no line the Corpus stripped",
          assembled_prompt_carries_no_passage_line)

    def a_leaked_passage_line_in_the_output_is_caught():
        check_no_leak("some text\nTHE LEAKED LINE\nmore text\n",
                       ["THE LEAKED LINE"])

    refuses(a_leaked_passage_line_in_the_output_is_caught, "reached the output",
            "a stripped Passage line reaching the output is refused")

    def a_glossed_quotation_keeps_its_gloss_only():
        line = ('1. \u201c\u5730\u653f\u5b66\u306e\u672c\u201d [books on geopolitics] '
                '\u2014 advances \u2014 places the author; and \u300c\u8ecd\u62e1\u7af6\u4e89\u300d')
        out, fragments = strip_quotations(line)
        assert "\u5730\u653f" not in out and "\u8ecd\u62e1" not in out, out
        assert "(quote removed) [books on geopolitics]" in out, out
        assert "advances" in out
        assert "\u5730\u653f\u5b66\u306e\u672c" in fragments

    check("a glossed quotation keeps its gloss and loses the source words; "
          "a bare source-script run is removed",
          a_glossed_quotation_keeps_its_gloss_only)

    def a_removed_quotation_reaching_the_output_refuses():
        check_no_fragment_leak("the reply quotes \u5730\u653f\u5b66\u306e\u672c here",
                               ["\u5730\u653f\u5b66\u306e\u672c"])

    refuses(a_removed_quotation_reaching_the_output_refuses, "reached the output",
            "a removed quotation reaching the output as a substring refuses")

    def a_wordless_stripped_line_never_false_positives():
        check_no_leak("\n\n---\nsome text\n* * *\n",
                      ["", "   ", "---", "* * *"])  # must not raise

    check("a blank or wordless stripped line (`---`) is not checked",
          a_wordless_stripped_line_never_false_positives)

    def a_heading_inside_the_passage_is_stripped():
        text = ("## Passage\n\n## A SOURCE HEADING\nprose\n\n"
                "## Answers\n\nQ1\n")
        stripped_text, stripped_lines = strip_analysis(text)
        assert "A SOURCE HEADING" not in stripped_text
        assert "## A SOURCE HEADING" in stripped_lines
        assert "## Answers" in stripped_text

    check("a `## ` heading inside the Passage is stripped as source prose",
          a_heading_inside_the_passage_is_stripped)

    def an_unclosed_passage_refuses():
        strip_analysis("## Passage\n\nprose\n\n## 1. What it does\n")

    refuses(an_unclosed_passage_refuses, "never reaches",
            "a Passage section with no `## Answers` after it refuses")

    def a_missing_disagreement_line_refuses():
        validate_questions(VALID_QUESTIONS.split("\n", 2)[2])

    refuses(a_missing_disagreement_line_refuses, "disagreement line",
            "a questions.md not opening with the disagreement line refuses")

    def a_named_disagreement_validates():
        validate_questions(VALID_QUESTIONS.replace(": none", ": 2, 10", 1))

    check("a disagreement line naming ruled answers by number validates",
          a_named_disagreement_validates)

    def valid_questions_pass():
        validate_questions(VALID_QUESTIONS)  # must not raise

    check("a conforming questions.md validates clean", valid_questions_pass)

    def too_many_questions_refuses():
        blocks = "Disagreements with the ruled answers: none\n\n" + "".join(
            "%d. Q?\n\n   1. Yes. (Recommended)\n   2. No.\n\n" % i
            for i in range(1, MAX_QUESTIONS + 2))
        validate_questions(blocks)

    refuses(too_many_questions_refuses, "above the bound",
            "more than the maximum number of questions refuses")

    def a_too_long_question_refuses():
        body = "\n".join("   line %d" % i for i in range(MAX_QUESTION_LINES + 2))
        text = (HEAD + "1. Q?\n\n%s\n\n   1. Yes. (Recommended)\n   2. No.\n"
                % body)
        validate_questions(text)

    refuses(a_too_long_question_refuses, "runs",
            "a question exceeding the twelve-line bound refuses")

    def a_question_missing_recommended_refuses():
        text = HEAD + "1. Q?\n\n   1. Yes.\n   2. No.\n"
        validate_questions(text)

    refuses(a_question_missing_recommended_refuses, "Recommended",
            "a question with no option marked Recommended refuses")

    def a_question_with_two_recommended_refuses():
        text = HEAD + "1. Q?\n\n   1. Yes. (Recommended)\n   2. No. (Recommended)\n"
        validate_questions(text)

    refuses(a_question_with_two_recommended_refuses, "Recommended",
            "a question with two options marked Recommended refuses")

    def a_question_with_one_option_refuses():
        text = HEAD + "1. Q?\n\n   1. Only option. (Recommended)\n"
        validate_questions(text)

    refuses(a_question_with_one_option_refuses, "option",
            "a question with only one option refuses")

    def split_model_output_needs_both_markers():
        split_model_output("no markers here at all")

    refuses(split_model_output_needs_both_markers, "marker",
            "a response with neither marker refuses rather than guessing a split")

    def split_model_output_splits_correctly():
        raw = ("preamble\n%s\nWORKING BODY\n%s\nQUESTIONS BODY\n"
               % (WORKING_MARKER, QUESTIONS_MARKER))
        working, questions = split_model_output(raw)
        assert "WORKING BODY" in working
        assert "QUESTIONS BODY" in questions
        assert "preamble" not in working

    check("a response carrying both markers splits into the two bodies",
          split_model_output_splits_correctly)

    def a_missing_model_command_refuses_rather_than_crashing():
        spawn_model("/no/such/command/anywhere", "some-model", "prompt", 5)

    refuses(a_missing_model_command_refuses_rather_than_crashing, "could not be run",
            "a model command that cannot be spawned refuses by name")

    # The stub is invoked as `stub -p --model n/a --output-format text` (the
    # same argv shape `spawn_model` builds for the real command) and ignores
    # every flag, reading only stdin — standing in for a model that answers
    # correctly regardless of how it is invoked.
    def a_full_run_over_a_stub_model_produces_two_valid_files():
        with tempfile.TemporaryDirectory() as d:
            corpus_dir = os.path.join(d, "corpus")
            os.makedirs(corpus_dir)
            _write_corpus(corpus_dir, MIN_CORPUS, passage_line="STUB SECRET LINE 2")
            derivation_path = os.path.join(d, "DERIVATION.md")
            with open(derivation_path, "w", encoding="utf-8") as handle:
                handle.write("DERIVATION INSTRUCTIONS\n")
            stub = os.path.join(d, "stub_model")
            with open(stub, "w", encoding="utf-8") as handle:
                handle.write(
                    "#!/usr/bin/env python3\n"
                    "import sys\n"
                    "sys.stdin.read()\n"
                    "sys.stdout.write(%r + '\\n' + '%s' + '\\n' + "
                    "'working body\\n' + %r + '\\n' + '''%s''')\n"
                    % (WORKING_HEADER, WORKING_MARKER, QUESTIONS_MARKER,
                       VALID_QUESTIONS))
            os.chmod(stub, 0o755)
            out = os.path.join(d, "run")
            result = run(corpus_dir, derivation_path, stub, "n/a", out, 30,
                         post_issue=None)
            questions = open(result["questions"], encoding="utf-8").read()
            assert "STUB SECRET LINE 2" not in questions
            working = open(result["working"], encoding="utf-8").read()
            assert working.startswith(WORKING_HEADER)
            assert os.path.isfile(os.path.join(out, "raw.txt"))

    check("a full run over a stub model command produces two bound-conforming files",
          a_full_run_over_a_stub_model_produces_two_valid_files)

    def a_post_model_refusal_keeps_the_reply_on_disk():
        with tempfile.TemporaryDirectory() as d:
            corpus_dir = os.path.join(d, "corpus")
            os.makedirs(corpus_dir)
            _write_corpus(corpus_dir, MIN_CORPUS)
            derivation_path = os.path.join(d, "DERIVATION.md")
            with open(derivation_path, "w", encoding="utf-8") as handle:
                handle.write("DERIVATION INSTRUCTIONS\n")
            stub = os.path.join(d, "stub_model")
            with open(stub, "w", encoding="utf-8") as handle:
                handle.write("#!/bin/sh\ncat >/dev/null\n"
                             "echo 'a reply with no markers'\n")
            os.chmod(stub, 0o755)
            out = os.path.join(d, "run")
            try:
                run(corpus_dir, derivation_path, stub, "n/a", out, 30)
            except Refusal:
                pass
            else:
                raise AssertionError("did not refuse")
            raw = open(os.path.join(out, "raw.txt"), encoding="utf-8").read()
            assert "a reply with no markers" in raw

    check("a refusal after the model call keeps the reply as raw.txt",
          a_post_model_refusal_keeps_the_reply_on_disk)

    for failure in failures:
        sys.stderr.write("FAIL  %s\n" % failure)
    print("derive_schema self-test: %d checks, %d failed" % (len(ran), len(failures)))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(self_test())
