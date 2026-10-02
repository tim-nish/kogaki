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
    args = parser.parse_args(argv)

    if not args.corpus_dir or not args.model or not args.out:
        parser.error("corpus_dir, --model and --out are required")

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


if __name__ == "__main__":
    sys.exit(main())
