#!/usr/bin/env python3
"""Move-schema derivation — the mechanical carrier for `passages/DERIVATION.md`
(kogaki#1173).

`DERIVATION.md` is the authorship instruction: what the model is asked to do
with the Corpus and what it returns. This module owns everything around that
authorship act that is ORCHESTRATION rather than composition (kogaki#1173,
Admission comment 6): counting the Corpus and refusing below the minimum it
declares; stripping every `## Passage` section and every Figure spec's
printed `positions:` content before anything reaches the model, since the
derivation reads Analyses and never Passages (`passages/FORMAT.md`, the
source-text boundary); spawning the model once with a pinned model id;
writing the two files `DERIVATION.md` describes; checking the owner-facing
one against the bounds it states; and posting it on the Issue that asked for
the run, in one call, or refusing and naming the bound that failed.

It owns NOTHING `DERIVATION.md` makes the model's: no schema proposal, no
Property values, no sequence reading, no judgment about what the Corpus
supports. Nothing here reads an Analysis's content beyond what stripping and
validation need — the FACT that a line was a Passage line, never its
meaning.
"""

import argparse
import os
import re
import subprocess
import sys
import tempfile

MIN_CORPUS = 10
MAX_QUESTIONS = 10
MAX_QUESTION_LINES = 12
RECOMMENDED_TOKEN = "(Recommended)"

WORKING_HEADER = "NOT READ BY A PERSON — working file"

PASSAGE_HEADING = "## Passage"
ANSWERS_HEADING = "## Answers"
FIGURE_HEADING = "## Figure"

WORKING_MARKER = "=== WORKING.MD ==="
QUESTIONS_MARKER = "=== QUESTIONS.MD ==="

# A question begins at column 0; an option sits indented under it. That is
# the one structural fact this module trusts to tell the two apart, since
# both are rendered as numbered lines (`DERIVATION.md`'s worked example).
# The owner's file names, on its first line, which ruled answers the Corpus
# contradicted (`passages/DERIVATION.md`, "The ruled answers this run
# confirms") — so the post itself carries any disagreement, not only the
# working file no person reads.
DISAGREEMENT_LINE = re.compile(
    r"^Disagreements with the ruled answers: (none|\d+(, ?\d+)*)\s*$")

QUESTION_START = re.compile(r"^\d+\.\s")
OPTION_START = re.compile(r"^\s+\d+\.\s")


WORD = re.compile(r"\w")


class Refusal(Exception):
    """Something this module was asked to do could not be done. The message
    names the bound that failed, never only that one did."""


# --------------------------------------------------------------------------
# Counting and refusing below the minimum.
# --------------------------------------------------------------------------

def list_corpus(corpus_dir):
    """Every `.md` file directly under `corpus_dir`, sorted. Sorted so the
    assembled prompt — and therefore what a model given the same Corpus twice
    sees — does not depend on directory-listing order."""
    if not os.path.isdir(corpus_dir):
        raise Refusal("the Corpus directory %r does not exist" % (corpus_dir,))
    names = sorted(
        n for n in os.listdir(corpus_dir)
        if n.endswith(".md") and not n.startswith(".")
    )
    return [os.path.join(corpus_dir, n) for n in names]


def refuse_below_minimum(paths):
    if len(paths) < MIN_CORPUS:
        raise Refusal(
            "the Corpus holds %d Analysis file(s), below the minimum of %d "
            "`passages/DERIVATION.md` declares. Each proposed field needs two "
            "Analyses that fill it differently and the sequence reading needs "
            "names that recur — neither is meaningful below the minimum."
            % (len(paths), MIN_CORPUS))


# --------------------------------------------------------------------------
# Stripping the source text boundary (`passages/FORMAT.md`).
# --------------------------------------------------------------------------

def redact_position(line):
    """A Figure spec `positions:` entry is `  - <role>: <label as printed>`
    (`passages/FIGURE.md`). The role is structure and stays; the label is
    content and goes. Returns the redacted line, or None when the entry
    carries no label to remove."""
    m = re.match(r"^(\s*-\s*)([^:]+?)\s*:\s*\S", line)
    if not m:
        return None
    return "%s%s: (label removed)" % (m.group(1), m.group(2))


def strip_analysis(text):
    """Remove the Passage's prose and every Figure spec's printed labels,
    and return the stripped text together with every line removed or
    redacted, so a later check can assert none of them reached the model's
    input or the model's output.

    `passages/FORMAT.md` places the Figure spec INSIDE the `## Passage`
    section, after the verbatim text and before `## Answers`. The prose is
    source text and is removed whole. The Figure spec is not: its `kind`,
    `positions` roles, `relations` and `encoding` are the structure the
    ruled `figure` field carries (kogaki#1173, schema question 10), so the
    block is kept and only each `positions:` entry's printed label — the
    spec's `content`, in FIGURE.md's own vocabulary — is redacted. A
    `## Figure` block outside the Passage section is redacted the same way.

    An Analysis with no `## Passage` heading is returned with its prose
    unchanged: an Analysis that left the Corpus keeps no Passage
    (`FORMAT.md`'s source-text boundary)."""
    out = []
    stripped = []
    in_passage = False
    in_figure = False
    in_positions = False
    for line in text.splitlines():
        heading = line.strip()
        if heading == PASSAGE_HEADING:
            in_passage, in_figure, in_positions = True, False, False
            out.append(line)
            out.append("")
            out.append("(passage text removed before this reached the model)")
            continue
        if heading.startswith("## "):
            # Inside the Passage only `## Figure` and `## Answers` are
            # structure; any other `## ` line is the source's own heading and
            # is stripped like the rest of its prose.
            if in_passage and heading not in (FIGURE_HEADING, ANSWERS_HEADING):
                stripped.append(line)
                continue
            if heading == ANSWERS_HEADING:
                in_passage = False
            in_figure = heading == FIGURE_HEADING
            in_positions = False
            out.append(line)
            continue
        if in_figure:
            if re.match(r"^[a-z][a-z ]*:", line):
                in_positions = line.startswith("positions:")
            elif in_positions and re.match(r"^\s*-\s", line):
                redacted = redact_position(line)
                if redacted is not None:
                    stripped.append(line)
                    line = redacted
            out.append(line)
            continue
        if in_passage:
            stripped.append(line)
            continue
        out.append(line)
    if in_passage:
        raise Refusal(
            "an Analysis opens a `## Passage` section and never reaches `%s`, "
            "so where its source text ends cannot be told — `FORMAT.md` "
            "requires that heading after the Passage" % ANSWERS_HEADING)
    return "\n".join(out), stripped


# `passages/FORMAT.md` lets an Analysis keep short quotations of its source,
# "a few words each with a gloss", in the evidence line and section 3. They
# are Passage text all the same, and the derivation reads the account, never
# the source (kogaki#1173: "No Passage text leaves the Corpus"). So a quoted
# span followed by its `[gloss]` keeps the gloss and loses the quotation, and
# any run of CJK script left anywhere else is removed as source wording.
QUOTED_WITH_GLOSS = re.compile(
    r"(?:\u201c[^\u201d]*\u201d|\"[^\"\n]*\"|\u300c[^\u300d]*\u300d|`[^`\n]*`)"
    r"(\s*\[)")
CJK_RUN = re.compile(
    r"[\u3000-\u30ff\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]"
    r"[\u3000-\u30ff\u3400-\u9fff\uf900-\ufaff\uff00-\uffef\w\u30fb\u2026・]*")
QUOTE_REMOVED = "(quote removed)"
SOURCE_REMOVED = "(source wording removed)"
MIN_FRAGMENT = 3


def strip_quotations(text):
    """Returns the text with every glossed quotation and every CJK run
    removed, and the list of removed fragments at least `MIN_FRAGMENT`
    characters long, for the substring leak check."""
    fragments = []

    def glossed(m):
        quoted = m.group(0)[:-len(m.group(1))]
        if len(quoted) - 2 >= MIN_FRAGMENT:
            fragments.append(quoted[1:-1])
        return QUOTE_REMOVED + m.group(1)

    def run(m):
        if len(m.group(0)) >= MIN_FRAGMENT:
            fragments.append(m.group(0))
        return SOURCE_REMOVED

    text = QUOTED_WITH_GLOSS.sub(glossed, text)
    text = CJK_RUN.sub(run, text)
    return text, fragments


def check_no_fragment_leak(text, fragments):
    """Refuses if any removed quotation or source-script run appears as a
    substring of `text`."""
    for fragment in fragments:
        if fragment in text:
            raise Refusal(
                "a quotation the strip removed reached the output: %r"
                % (fragment,))


def load_and_strip(paths):
    """Returns `(slug, stripped_text)` pairs and the flat list of every
    stripped line, across the whole Corpus."""
    analyses = []
    all_stripped = []
    all_fragments = []
    for path in paths:
        slug = os.path.splitext(os.path.basename(path))[0]
        with open(path, encoding="utf-8") as handle:
            text = handle.read()
        try:
            text, stripped = strip_analysis(text)
        except Refusal as refusal:
            raise Refusal("%s: %s" % (os.path.basename(path), refusal))
        text, fragments = strip_quotations(text)
        analyses.append((slug, text))
        all_stripped.extend(stripped)
        all_fragments.extend(fragments)
    return analyses, all_stripped, all_fragments


# --------------------------------------------------------------------------
# Assembling the prompt.
# --------------------------------------------------------------------------

def assemble_prompt(derivation_text, analyses):
    parts = [derivation_text, "", "---", "",
             "## The Corpus (%d Analyses, cited by slug)" % len(analyses), ""]
    for slug, text in analyses:
        parts.append("### %s" % slug)
        parts.append("")
        parts.append(text)
        parts.append("")
    parts.append("---")
    parts.append("")
    parts.append(
        "Return exactly two blocks. First a line reading exactly `%s`, then "
        "the whole working file. Then a line reading exactly `%s`, then the "
        "whole owner-facing file. Nothing before the first marker and "
        "nothing after the second block." % (WORKING_MARKER, QUESTIONS_MARKER))
    return "\n".join(parts)


def check_no_leak(text, stripped_lines):
    """Refuses if any non-blank line the Corpus's Passage or Figure content
    carried appears verbatim anywhere in `text` — the assembled prompt, or
    the model's output. A line with no word character (blank, `---`, a rule
    of asterisks) is not checked: it carries no source text, and the prompt
    and any markdown reply carry such lines of their own."""
    leaked = {ln for ln in stripped_lines if WORD.search(ln)}
    if not leaked:
        return
    for line in text.splitlines():
        if line.strip() and line in leaked:
            raise Refusal(
                "a line the Corpus's source-text boundary requires stripped "
                "reached the output verbatim: %r" % (line,))


# --------------------------------------------------------------------------
# Spawning the model once.
# --------------------------------------------------------------------------

def spawn_model(command, model, prompt, timeout_s, cwd=None):
    """`cwd` is the run directory, outside the repository, so the model is
    not handed the repository's own CLAUDE.md, hooks or skills: its whole
    context is the prompt, as `DERIVATION.md` requires."""
    argv = [command, "-p", "--model", model, "--output-format", "text"]
    try:
        r = subprocess.run(
            argv, input=prompt, capture_output=True, text=True,
            timeout=timeout_s, cwd=cwd)
    except subprocess.TimeoutExpired:
        raise Refusal(
            "the model exceeded the %ds per-call bound" % timeout_s)
    except OSError as exc:
        raise Refusal("the model command %r could not be run: %s"
                       % (command, exc))
    if r.returncode != 0:
        # `claude -p` reports an API-side refusal of the INPUT on stdout with
        # an empty stderr, so both streams are named: an empty-stderr refusal
        # otherwise reads as no reason at all.
        raise Refusal(
            "the model exited %d. Its stderr, verbatim: %s. Its stdout, "
            "verbatim: %s. A refusal of the input itself is model-specific; "
            "another pinned model may accept the same prompt"
            % (r.returncode, (r.stderr or "").strip() or "(empty)",
               (r.stdout or "").strip()[:2000] or "(empty)"))
    return r.stdout


def split_model_output(raw):
    if WORKING_MARKER not in raw or QUESTIONS_MARKER not in raw:
        raise Refusal(
            "the model's response carries neither or only one of the two "
            "required markers (%r, %r) — nothing to split into the two "
            "files; the response is kept as raw.txt in the run directory"
            % (WORKING_MARKER, QUESTIONS_MARKER))
    before, rest = raw.split(WORKING_MARKER, 1)
    working, questions = rest.split(QUESTIONS_MARKER, 1)
    return working.strip("\n") + "\n", questions.strip("\n") + "\n"


# --------------------------------------------------------------------------
# Validating the owner-facing file against `DERIVATION.md`'s bounds.
# --------------------------------------------------------------------------

def split_questions(questions_text):
    """Returns a list of (header_line, block_lines) per numbered question."""
    lines = questions_text.splitlines()
    blocks = []
    current = None
    for line in lines:
        if QUESTION_START.match(line):
            current = [line]
            blocks.append(current)
        elif current is not None:
            current.append(line)
    return blocks


def validate_questions(questions_text):
    first = next((ln for ln in questions_text.splitlines() if ln.strip()), "")
    if not DISAGREEMENT_LINE.match(first):
        raise Refusal(
            "questions.md does not open with the disagreement line "
            "`Disagreements with the ruled answers: none | <numbers>` "
            "`passages/DERIVATION.md` requires; its first line reads %r"
            % (first,))
    blocks = split_questions(questions_text)
    if not blocks:
        raise Refusal(
            "no numbered question was found in questions.md — the owner's "
            "file must be a numbered list of at most %d questions"
            % MAX_QUESTIONS)
    if len(blocks) > MAX_QUESTIONS:
        raise Refusal(
            "questions.md carries %d questions, above the bound of %d "
            "`passages/DERIVATION.md` states" % (len(blocks), MAX_QUESTIONS))
    for block in blocks:
        # Trailing blank lines are not charged against the twelve-line bound:
        # they separate one question from the next and carry no content.
        content = block
        while content and not content[-1].strip():
            content = content[:-1]
        if len(content) > MAX_QUESTION_LINES:
            raise Refusal(
                "question %r runs %d lines, above the bound of %d"
                % (block[0].strip(), len(content), MAX_QUESTION_LINES))
        options = [ln for ln in block if OPTION_START.match(ln)]
        if len(options) not in (2, 3):
            raise Refusal(
                "question %r carries %d option(s); `passages/DERIVATION.md` "
                "requires two or three" % (block[0].strip(), len(options)))
        recommended = [o for o in options if RECOMMENDED_TOKEN in o]
        if len(recommended) != 1:
            raise Refusal(
                "question %r marks %d option(s) %s; exactly one is required"
                % (block[0].strip(), len(recommended), RECOMMENDED_TOKEN))


# --------------------------------------------------------------------------
# Posting.
# --------------------------------------------------------------------------

def post_to_issue(questions_path, issue_number, repo=None, gh_command="gh"):
    argv = [gh_command, "issue", "comment", str(issue_number),
            "--body-file", questions_path]
    if repo:
        argv += ["--repo", repo]
    r = subprocess.run(argv, capture_output=True, text=True)
    if r.returncode != 0:
        raise Refusal(
            "posting questions.md to issue #%s failed: %s"
            % (issue_number, (r.stderr or r.stdout or "").strip()))


# --------------------------------------------------------------------------
# The run.
# --------------------------------------------------------------------------

def run(corpus_dir, derivation_path, command, model, out_dir, timeout_s,
        post_issue=None, repo=None):
    with open(derivation_path, encoding="utf-8") as handle:
        derivation_text = handle.read()

    paths = list_corpus(corpus_dir)
    refuse_below_minimum(paths)
    analyses, stripped_lines, fragments = load_and_strip(paths)

    prompt = assemble_prompt(derivation_text, analyses)
    check_no_leak(prompt, stripped_lines)
    check_no_fragment_leak(prompt, fragments)

    # The run directory exists before the call and every output lands in it
    # BEFORE any post-model check: a refusal keeps its refusal AND the
    # evidence, since the model call is the expensive, one-shot step. The
    # directory is outside git by the caller's choice; what lands in it is
    # the model's reply, which the prompt check above already proved carries
    # no stripped line in its input.
    os.makedirs(out_dir, exist_ok=True)
    out_dir = os.path.abspath(out_dir)
    raw = spawn_model(command, model, prompt, timeout_s, cwd=out_dir)
    raw_path = os.path.join(out_dir, "raw.txt")
    with open(raw_path, "w", encoding="utf-8") as handle:
        handle.write(raw)
    working_text, questions_text = split_model_output(raw)

    if not working_text.startswith(WORKING_HEADER):
        working_text = WORKING_HEADER + "\n\n" + working_text

    working_path = os.path.join(out_dir, "working.md")
    questions_path = os.path.join(out_dir, "questions.md")
    with open(working_path, "w", encoding="utf-8") as handle:
        handle.write(working_text)
    with open(questions_path, "w", encoding="utf-8") as handle:
        handle.write(questions_text)

    check_no_leak(working_text, stripped_lines)
    check_no_leak(questions_text, stripped_lines)
    check_no_fragment_leak(working_text, fragments)
    check_no_fragment_leak(questions_text, fragments)
    validate_questions(questions_text)

    if post_issue is not None:
        post_to_issue(questions_path, post_issue, repo=repo)

    return {"corpus_size": len(paths), "working": working_path,
            "questions": questions_path}


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Move-schema derivation: strip, spawn, validate, post. "
        "Composing the proposal is the model's; everything around it is "
        "this command's (kogaki#1173).")
    parser.add_argument("corpus_dir", nargs="?",
                         help="the private Corpus directory of Analyses")
    parser.add_argument("--model", help="the pinned model id")
    parser.add_argument("--out", help="the run directory to write into")
    parser.add_argument("--command", default="claude",
                         help="the model command (default: claude)")
    parser.add_argument("--derivation",
                         default=os.path.join(
                             os.path.dirname(os.path.dirname(
                                 os.path.abspath(__file__))),
                             "passages", "DERIVATION.md"),
                         help="path to passages/DERIVATION.md")
    parser.add_argument("--timeout", type=int, default=600,
                         help="per-call bound in seconds")
    parser.add_argument("--post-issue", type=int,
                         help="post questions.md to this Issue number")
    parser.add_argument("--repo", help="owner/repo for --post-issue")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()

    if not args.corpus_dir or not args.model or not args.out:
        parser.error("corpus_dir, --model and --out are required (or --self-test)")

    try:
        result = run(args.corpus_dir, args.derivation, args.command,
                     args.model, args.out, args.timeout,
                     post_issue=args.post_issue, repo=args.repo)
    except Refusal as refusal:
        sys.stderr.write("refused: %s\n" % refusal)
        return 1

    print("derived a schema proposal from %d Analyses -> %s, %s"
          % (result["corpus_size"], result["working"], result["questions"]))
    return 0


# --------------------------------------------------------------------------
# Self-test — every case constructs the defect and asserts the refusal.
# --------------------------------------------------------------------------

ANALYSIS_TEMPLATE = """# Passage analysis: {slug}

source: not given
functions: advances, raises, settles
prior text: not assumed
length: 3 sentences, 1 paragraphs
language: English

## Passage

{passage_line}

## Answers

Q1 Purpose
  answer: model — does a thing to the reader.

## 1. What the Passage does

Does a thing to the reader.

## 2. Reader before and after

| dimension   | before | after |
|-------------|--------|-------|
| knowledge   | little | more  |

Strongest change: knowledge. Second: none.
"""


def _write_corpus(dirpath, n, passage_line="THE SECRET SOURCE TEXT LINE"):
    for i in range(n):
        slug = "analysis_%02d" % i
        with open(os.path.join(dirpath, slug + ".md"), "w",
                   encoding="utf-8") as handle:
            handle.write(ANALYSIS_TEMPLATE.format(
                slug=slug, passage_line=passage_line))


VALID_QUESTIONS = """Disagreements with the ruled answers: none

1. Should `requires` be replaced by `question`?

   Every Analysis's Q2 answer names a question, never only knowledge.

   1. Yes, add `question`, keep `requires`. (Recommended)
   2. No, keep `requires` as it is.

2. Should `visual_form` become `figure`?

   The Corpus supports it with one Analysis.

   1. Yes. (Recommended)
   2. No.
   3. Defer.
"""


HEAD = "Disagreements with the ruled answers: none\n\n"


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
    sys.exit(main())
