#!/usr/bin/env bash
# Consult-receipt reporting: counts the branch's `consulted:` receipts and
# reports them. A REPORT, never a gate on the count — an absent consultation
# generates no event to hook, so the remedy is making the absence observable.
# Zero renders as an explicit zero.
#
# Reads only git-resident text (commit messages, and the PR body when CI
# supplies it). It never reads ~/.tsurezure/ or any gateway state: the
# substrate's access log is the SERVER's record, Kogaki's receipts are the
# consumer's (specs/SPEC.md §4 sided-evidence clause;
# policy/consultation-map.md entry 2). kogaki#7, story 1.3.
#
# Fails only on a malformed receipt, never on a count. Malformed means a pin
# that is not `<repo>@<sha> <file:line[,line…]>` shaped, or — for a v2 receipt
# (kogaki#28, story 1.10) — a CONFORMANCE defect in what the receipt asserts:
# an outcome outside the ratified triple, an `uncovered-after-N` whose N
# disagrees with the query lines or falls below the re-ask floor, a receipt
# carrying some continuation fields and not the rest, or — kogaki#160 finding 4
# — a `query:` line holding a serialized tool argument rather than a question.
# All of those are claims the receipt makes about itself; none of them is a
# count of receipts, so the "never gates on the count" contract is untouched.
#
# BACKWARD COMPATIBILITY of the finding-4 clause, stated rather than assumed.
# This check scans the BRANCH's own commit range (merge-base..HEAD) plus the PR
# body CI supplies — never a file on the default branch and never the whole
# history — so the receipts already merged, including `208fd83`'s, are outside
# every future scan window and no branch fails on work it did not author. The
# receipt GRAMMAR is unchanged: no field is added, renamed, or reordered, and a
# v1 receipt (no continuation lines) has no query lines for the clause to read,
# so it stays valid exactly as before. What narrows is the admissible VALUE of
# a field that already existed, on emissions made from here on.
#
# USE vs MENTION (kogaki#41): a `consulted:` line inside a fenced code block
# is a QUOTATION of the format, not an emission of a receipt — the scanned
# population is receipts, and a spec or PR body documenting the grammar is
# the one text guaranteed to contain non-receipt matches (PR #40, the first
# false positive: the grammar template's literal `<repo>@<sha>` placeholders
# flagged as malformed). Fenced regions are stripped before scanning; an
# unclosed fence strips to end of text, since a half-open quotation cannot
# be safely read as emission either. The embedded fixture pass below is the
# discrimination evidence, run on every invocation.
set -euo pipefail
cd "$(dirname "$0")/.."

# Commit range: CI supplies the base; locally fall back to the default branch.
BASE="${CONSULT_BASE_SHA:-}"
HEAD_REF="${CONSULT_HEAD_SHA:-HEAD}"
if [ -z "$BASE" ]; then
  BASE="$(git merge-base origin/master "$HEAD_REF" 2>/dev/null \
          || git merge-base master "$HEAD_REF" 2>/dev/null || true)"
fi

if [ -n "$BASE" ]; then
  commits="$(git log --format='%B' "$BASE..$HEAD_REF" 2>/dev/null || true)"
  range_desc="$(git rev-list --count "$BASE..$HEAD_REF" 2>/dev/null || echo 0) commit(s)"
else
  commits="$(git log -1 --format='%B' "$HEAD_REF")"
  range_desc="1 commit (no merge base found)"
fi

# The PR body, when CI provides it — receipts often ride there rather than in
# a commit message.
body="${CONSULT_PR_BODY:-}"

CONSULT_SOURCE="$commits
$body" CONSULT_RANGE="$range_desc" python3 <<'EOF'
import json, os, re, sys

# A receipt's line one: `consulted: <repo>@<sha> <file:line[,line][, file:line…]>`
RECEIPT = re.compile(r'^\s*consulted:\s*(.+)$', re.MULTILINE)
PIN = re.compile(r'^(\S+)@([0-9a-f]{7,40})\s+(\S.*)$')
# A fenced code block is quotation (mention), never emission (use).
# An unclosed fence strips to end of text.
FENCE = re.compile(r'^[ \t]*(`{3,}|~{3,}).*?(?:^[ \t]*\1[ \t]*$|\Z)',
                   re.MULTILINE | re.DOTALL)
# v2 continuation lines (kogaki#28, story 1.10): INDENTED `key: value` lines
# belonging to the `consulted:` line above them. Line one is unchanged from
# v1, which is why every receipt already in git history still parses and why
# PIN needed no change — the parsing that is new is association, not matching.
CONT = re.compile(r'^[ \t]+(request_id|outcome|query):[ \t]*(.*)$')
# The hub's ratified triple. A bare `miss` is INADMISSIBLE: it collapses the
# distill-bug and query-defect causes the 2026-08-02 correction separated, in
# the one field meant to make them harvestable
# (topics/knowledge-architecture.md:59@ed47fbd; specs/SPEC.md §4).
OUTCOMES = {'discriminating', 'covered-after-reframing'}
UNCOVERED = re.compile(r'^uncovered-after-(\d+)-framings$')
# A miss is not recordable as `uncovered` until it has been re-asked along at
# least one ALTERNATIVE axis, so two framings is the floor and the token cannot
# claim fewer. Stated as its own constant and checked as its own clause: the
# floor is currently also implied by the >=2 query rule below, and an implied
# invariant is one a later refactor drops without any test noticing.
MIN_FRAMINGS = 2


def outcome_ok(value):
    return value in OUTCOMES or bool(UNCOVERED.match(value))


def args_shaped(value):
    """True when a `query:` value is a serialized TOOL ARGUMENT, not a question.

    kogaki#160 finding 4. `policy/consultation-map.md :67@a3b635d (the Miss-postmortem field)` defines the field as
    "**The question, verbatim** — the query that would have found the served
    line … situation-specific keys for reaching a particular ruling", and the
    grammar accepted any non-empty value, so this shipped and passed:

        query: {"tag":"lessons/claude-code-ops"}

    Its cause was a SEAM GAP, not an authoring slip: `gateway-query.mjs` read
    the query off `policy_lookup`'s `question` argument and fell back to the
    raw `--args` JSON for every other tool, so a `gloss_index` consult had no
    field in which to record its question. The transport now takes `--question`
    per call and REFUSES without it, which makes this emission unproducible on
    the tool path. This clause is the floor under the marked-exception path —
    the same division condition 2 already draws — and it is deliberately the
    narrowest rule that discriminates: a JSON object or array literal is a tool
    argument in a field reserved for prose, and nothing else is judged.

    A question is not disqualified for containing braces or quotes; only a
    value that IS a JSON object/array from end to end fails. Ordinary prose
    starting with `{` and parsing as JSON is not a shape this field produces.
    """
    v = value.strip()
    if not (v.startswith('{') or v.startswith('[')):
        return False
    try:
        return isinstance(json.loads(v), (dict, list))
    except ValueError:
        return False


def scan(source):
    """Return (receipts, malformed) over the emission text only.

    A receipt is line one plus the indented continuation lines under it.
    Continuations are OPTIONAL: their absence is a v1-form receipt, which is
    valid — the branch history is immutable, so a grammar change that
    invalidated past receipts would fail the suite on unrelated work.
    """
    emitted = FENCE.sub('', source)
    receipts, malformed = [], []
    lines = emitted.split('\n')
    i = 0
    while i < len(lines):
        m = RECEIPT.match(lines[i])
        if not m:
            i += 1
            continue
        pin = m.group(1).strip()
        fields = {'query': []}
        # ONE RULE FOR EMPTY VALUES, applied in the parse rather than inferred
        # later from truthiness. `saw_cont` records that a continuation line
        # was PRESENT — which is a fact about the text, not about what the
        # value happened to be — and an empty value is treated as ABSENT for
        # every field alike. Deriving presence from truthiness gave three
        # different behaviours for the same emptiness: an empty `outcome:`
        # made the receipt look like v1 and skipped every v2 clause, an empty
        # `request_id:` was correctly reported missing, and empty `query:`
        # lines COUNTED as recorded framings — so `uncovered-after-3-framings`
        # with three blank queries satisfied N == len(). That is weaker than
        # the rephrasing case disclosed below: rephrasing at least records two
        # questions, this recorded none (PR #43 review).
        saw_cont = False
        i += 1
        while i < len(lines):
            c = CONT.match(lines[i])
            if not c:
                break
            saw_cont = True
            key, value = c.group(1), c.group(2).strip()
            if value:
                fields['query'].append(value) if key == 'query' else \
                    fields.__setitem__(key, value)
            i += 1
        receipts.append((pin, fields))
        if not PIN.match(pin):
            malformed.append((pin, 'pin is not `<repo>@<sha> <file:line…>` shaped'))
            continue
        got = fields.get('outcome')
        # PRESENCE IMPLIES COMPLETENESS. Continuations stay optional so that a
        # v1 receipt — no continuation lines at all — is valid, which is
        # load-bearing for the history. But once ANY continuation is present
        # the receipt is v2 and owes all three fields SPEC §4 requires; without
        # this, `outcome: discriminating` alone passes while claiming to be a
        # v2 receipt.
        if saw_cont:
            missing = [k for k in ('request_id', 'outcome')
                       if not fields.get(k)]
            if not fields['query']:
                missing.append('query')
            if missing:
                malformed.append(
                    (pin, 'a v2 receipt (a continuation line is present) owes '
                          'request_id, outcome and at least one query; '
                          f'missing: {", ".join(missing)}'))
                continue
        # THE QUERY FIELD HOLDS A QUESTION, NEVER A TOOL ARGUMENT (kogaki#160
        # finding 4). Checked before the outcome clauses because a receipt
        # whose queries are argument blobs tells a reader nothing about what
        # was asked, and every clause below reasons about the query lines as
        # if they were questions — N naming them, the re-framing floor reading
        # them. Applied to v1 receipts too: a v1 receipt has no query lines at
        # all, so the clause is vacuous there and the history stays valid.
        blobs = [q for q in fields['query'] if args_shaped(q)]
        if blobs:
            malformed.append(
                (pin, f'query line {blobs[0]!r} is a serialized tool argument, '
                      'not a question. `policy/consultation-map.md :67@a3b635d (the Miss-postmortem field)` defines '
                      'this field as the question verbatim — a key a later '
                      'reader can reuse to reach the same ruling. Pass '
                      '`--question` to the transport, one per `--args`, in the '
                      'same order; it is required in receipt mode and binds '
                      'the question to the call whose request_id this receipt '
                      'carries'))
            continue
        if got is not None and not outcome_ok(got):
            malformed.append((pin, f'outcome {got!r} is not the ratified triple '
                                   '(discriminating | covered-after-reframing | '
                                   'uncovered-after-N-framings)'))
            continue
        # `uncovered-after-N-framings` ASSERTS a number. Validating its shape
        # only lets a receipt claim seven framings while recording two, which
        # is the field the AC exists to make readable saying something the
        # queries contradict.
        m = UNCOVERED.match(got) if got else None
        if m:
            n = int(m.group(1))
            if n < MIN_FRAMINGS:
                malformed.append((pin, f'outcome claims {n} framing(s); '
                                       f'`uncovered` is not recordable below '
                                       f'{MIN_FRAMINGS} — a miss owes a '
                                       're-ask along another axis first'))
                continue
            if n != len(fields['query']):
                malformed.append((pin, f'outcome claims {n} framing(s) but '
                                       f'{len(fields["query"])} query line(s) '
                                       'are recorded; N names the queries'))
                continue
        # Every re-framing gets its own query line: the token says WHICH of the
        # two miss-causes was found, and only the queries let a reader check
        # that the re-framing varied the axis rather than rephrasing it.
        #
        # WHAT THIS COUNT DOES NOT VERIFY, stated rather than implied. The
        # laziest conforming emission is two REPHRASINGS of one question: it
        # satisfies the count and defeats the point, and no count can tell the
        # two apart — axis-variation is a judgment about meaning, and the unit
        # that could observe it is a reader, not this check
        # (`match-the-detectors-unit-to-the-propertys-unit`, surveyed via the
        # consultation map's entry-1 read prescription). So this asserts that
        # the framings were RECORDED, never that they differed; whether they
        # did is the review lane's, and the queries are here so that lane has
        # something to read. Revisit if a receipt is ever found carrying two
        # rephrasings — that observation is what would earn a real detector.
        elif got and got != 'discriminating' and len(fields['query']) < 2:
            malformed.append((pin, f'outcome {got!r} records '
                                   f'{len(fields["query"])} query line(s); a '
                                   're-framed consult carries every framing'))

    # CROSS-RECEIPT REUSE — the one defect every per-receipt rule above misses
    # (kogaki#75). Each check so far validates a receipt AGAINST ITSELF: pin
    # shape, v2 completeness, the ratified outcome triple, N against the query
    # count. All of them passed on a receipt whose `request_id` was copied from
    # an earlier commit with the outcome REVERSED — `uncovered-after-2-framings`
    # became `discriminating` for the same query verbatim.
    #
    # ONE GATEWAY REQUEST CANNOT HAVE TWO OUTCOMES. The request_id is the
    # server's identity for a single call, so a second receipt bearing it must
    # agree with the first in every field or one of them is invented. Detecting
    # that needs a view across receipts, which nothing here had.
    #
    # The specimen is this repository's own merged history, authored by the
    # interactive session rather than by a spawned fixer — form validation
    # passed while the content was fabricated, which is why the durable fix is
    # tool-EMITTED receipts (kogaki#66 deliverable 1) and this is only the
    # consumer-side conformance floor. The server's access log remains the
    # canonical record, and this check's removal signal already names it.
    #
    # Identical full blocks are a DUPLICATE, not a fabrication: the same receipt
    # quoted twice is honest and is counted once rather than failed.
    by_id = {}
    for pin, fields in receipts:
        rid = fields.get('request_id')
        if not rid:
            continue
        sig = (fields.get('outcome'), tuple(fields['query']))
        prev = by_id.get(rid)
        if prev is None:
            by_id[rid] = (pin, sig)
            continue
        prev_pin, prev_sig = prev
        if prev_sig == sig:
            continue                      # honest duplicate; counted once below
        differs = []
        if prev_sig[0] != sig[0]:
            differs.append(f'outcome {prev_sig[0]!r} vs {sig[0]!r}')
        if prev_sig[1] != sig[1]:
            differs.append(f'{len(prev_sig[1])} query line(s) vs {len(sig[1])}')
        malformed.append(
            (pin, f'request_id {rid} is reused with a different reading '
                  f'({"; ".join(differs)}). One gateway request has one '
                  'outcome, so one of these receipts is fabricated — compare '
                  f'against the receipt at {prev_pin!r}'))

    return receipts, malformed


# ---------------------------------------------------------------------------
# Fixture pass — the discrimination evidence, run every invocation. Case (b)
# is the kogaki#41 false positive: it FAILS the pre-fix scanner, which is
# what makes this a discriminating fixture rather than a passing one.
# ---------------------------------------------------------------------------
GOOD = "consulted: product-lab@0123abc topics/example.md:1"
TEMPLATE_FENCED = ("Docs quoting the grammar:\n```\n"
                   "consulted: <repo>@<sha> <file:line[,line][, file:line…]>\n"
                   "```\nprose after.")
BAD_REAL = "consulted: this is not a pin"
# v2 fixtures (kogaki#28, story 1.10). Each fails a scanner that lacks the
# clause it names, which is what makes it discrimination evidence.
V2_FULL = (GOOD + "\n"
           "  request_id: abc-123\n"
           "  outcome: discriminating\n"
           "  query: the question as issued\n")
V2_REFRAMED = (GOOD + "\n  request_id: r\n"
               "  outcome: covered-after-reframing\n"
               "  query: first framing\n"
               "  query: second framing, different axis\n")
V2_BARE_MISS = GOOD + "\n  request_id: r\n  outcome: miss\n  query: q\n"
V2_REFRAMED_ONE_QUERY = (GOOD + "\n  request_id: r\n"
                         "  outcome: covered-after-reframing\n"
                         "  query: only one framing recorded\n")
V2_UNCOVERED = (GOOD + "\n  request_id: r\n"
                "  outcome: uncovered-after-2-framings\n"
                "  query: first\n  query: second\n")
# --- review fixtures (PR #43): each isolates one validation clause ---
# N over-claims: 7 framings asserted, 2 recorded.
V2_N_OVERCLAIMS = (GOOD + "\n  request_id: r\n"
                   "  outcome: uncovered-after-7-framings\n"
                   "  query: first\n  query: second\n")
# N below the floor, with N == the query count so only the floor clause fires.
V2_N_BELOW_FLOOR = (GOOD + "\n  request_id: r\n"
                    "  outcome: uncovered-after-1-framings\n"
                    "  query: only framing\n")
# A partial v2 receipt: outcome present, request_id and query absent.
V2_PARTIAL = GOOD + "\n  outcome: discriminating\n"
# Empty values, all three paths. An empty `outcome:` alone must not read as a
# v1 receipt, and empty `query:` lines must not count as recorded framings.
V2_EMPTY_QUERIES = (GOOD + "\n  request_id: r\n"
                    "  outcome: uncovered-after-3-framings\n"
                    "  query: \n  query:   \n  query:\n")
V2_EMPTY_OUTCOME_ALONE = GOOD + "\n  outcome:\n"
# --- kogaki#160 finding 4: the query field holds a question ------------------
# THE SPECIMEN, verbatim from `208fd83`'s merged receipt. It passed every
# clause above it: pin-shaped, v2-complete, ratified outcome, N absent. What it
# records is the transport's `--args`, which is an honest transport fact in the
# one field reserved for the question a later reader could reuse.
V2_ARGS_AS_QUERY = (GOOD + "\n  request_id: r\n"
                    "  outcome: discriminating\n"
                    '  query: {"tag":"lessons/claude-code-ops"}\n')
# The mixed case: one real question, one blob. One blob is enough to fail —
# a receipt that records what was asked for some of its calls and not others
# is exactly the self-consistent-on-its-face shape this closes.
V2_ONE_BLOB_AMONG_QUESTIONS = (GOOD + "\n  request_id: r\n"
                               "  outcome: uncovered-after-2-framings\n"
                               "  query: does a served line discriminate the admission of a check?\n"
                               '  query: {"tag":"lessons/testing"}\n')
# The NEGATIVES that make the clause discriminating rather than a brace ban.
# A question may contain braces, quotes, or JSON-looking fragments and still be
# a question; only a value that is a JSON object/array end to end is refused.
V2_BRACES_IN_A_QUESTION = (GOOD + "\n  request_id: r\n"
                           "  outcome: discriminating\n"
                           '  query: should a {"tag": …} argument ever stand in for the question?\n')
V2_JSON_SCALAR_IS_NOT_ARGS = (GOOD + "\n  request_id: r\n"
                              "  outcome: discriminating\n"
                              "  query: {not json at all\n")
# Each fixture asserts (receipts, malformed, total query lines, outcomes).
# The last two fields are not decoration: a (count, malformed) assertion alone
# cannot observe whether the continuation fields were parsed at all, so six of
# the eight v2 cases below would pass a scanner that ignored them entirely —
# measured, not assumed. Asserting the parsed fields is what makes them
# discrimination evidence rather than fixtures that look like it.
FIXTURES = [
    ("real receipt counted", GOOD, 1, 0, 0, ()),
    # --- cross-receipt reuse (kogaki#75) -----------------------------------
    # Both directions, because the honest case is the one a naive "same id
    # twice = fail" rule would break: a receipt quoted twice is not a lie.
    ("request_id reused with the outcome REVERSED — the merged-history specimen",
     "consulted: product-lab@f918c515 LESSONS.md:40\n"
     "  request_id: 9442a05f-e1e6\n"
     "  outcome: uncovered-after-2-framings\n"
     "  query: which direction should an unrecognized class default to?\n"
     "  query: fail toward the safe option or the cheap one?\n"
     "\n"
     "consulted: product-lab@f918c515 LESSONS.md:40\n"
     "  request_id: 9442a05f-e1e6\n"
     "  outcome: discriminating\n"
     "  query: which direction should an unrecognized class default to?\n",
     2, 1, 3, ('uncovered-after-2-framings', 'discriminating')),
    ("request_id reused with a DIFFERENT query set",
     "consulted: product-lab@f918c515 LESSONS.md:40\n"
     "  request_id: aaaa1111\n"
     "  outcome: discriminating\n"
     "  query: first question\n"
     "\n"
     "consulted: product-lab@f918c515 LESSONS.md:41\n"
     "  request_id: aaaa1111\n"
     "  outcome: discriminating\n"
     "  query: a different question entirely\n",
     2, 1, 2, ('discriminating', 'discriminating')),
    ("the SAME receipt quoted twice is an honest duplicate, never a failure",
     "consulted: product-lab@f918c515 LESSONS.md:40\n"
     "  request_id: bbbb2222\n"
     "  outcome: discriminating\n"
     "  query: one question\n"
     "\n"
     "consulted: product-lab@f918c515 LESSONS.md:40\n"
     "  request_id: bbbb2222\n"
     "  outcome: discriminating\n"
     "  query: one question\n",
     2, 0, 2, ('discriminating', 'discriminating')),
    ("two DISTINCT request_ids never collide",
     "consulted: product-lab@f918c515 LESSONS.md:40\n"
     "  request_id: cccc3333\n"
     "  outcome: discriminating\n"
     "  query: q one\n"
     "\n"
     "consulted: product-lab@f918c515 LESSONS.md:41\n"
     "  request_id: dddd4444\n"
     "  outcome: discriminating\n"
     "  query: q two\n",
     2, 0, 2, ('discriminating', 'discriminating')),
    ("a v1 receipt carries no request_id and cannot collide",
     GOOD + "\n" + GOOD, 2, 0, 0, ()),
    ("fenced template is a mention: not counted, not malformed",
     TEMPLATE_FENCED, 0, 0, 0, ()),
    ("real receipt beside a fenced template: exactly one counted",
     GOOD + "\n" + TEMPLATE_FENCED, 1, 0, 0, ()),
    ("malformed real receipt outside a fence still fails",
     BAD_REAL, 1, 1, 0, ()),
    ("unclosed fence strips to end", "```\n" + GOOD, 0, 0, 0, ()),
    # --- v2 (kogaki#28, story 1.10) ---
    ("v2 receipt: request_id, outcome and query are parsed off line one",
     V2_FULL, 1, 0, 1, ('discriminating',)),
    ("v1 receipt with no continuation lines stays valid and field-less",
     GOOD, 1, 0, 0, ()),
    ("a bare `miss` outcome is malformed — it collapses the two causes",
     V2_BARE_MISS, 1, 1, 1, ('miss',)),
    ("a re-framed outcome carrying every framing passes, both queries kept",
     V2_REFRAMED, 1, 0, 2, ('covered-after-reframing',)),
    ("a re-framed outcome with one query line is malformed",
     V2_REFRAMED_ONE_QUERY, 1, 1, 1, ('covered-after-reframing',)),
    ("uncovered-after-N: N matching its queries and at or above the floor passes",
     V2_UNCOVERED, 1, 0, 2, ('uncovered-after-2-framings',)),
    ("two v2 receipts are two receipts, not one with merged fields",
     V2_FULL + V2_REFRAMED, 2, 0, 3,
     ('discriminating', 'covered-after-reframing')),
    ("a fenced v2 block is a mention: its continuations do not leak out",
     "```\n" + V2_FULL + "```\n" + GOOD, 1, 0, 0, ()),
    # --- PR #43 review fixtures ---
    ("N over-claims: 7 framings asserted, 2 recorded",
     V2_N_OVERCLAIMS, 1, 1, 2, ('uncovered-after-7-framings',)),
    ("N below the floor: `uncovered` needs a re-ask on another axis",
     V2_N_BELOW_FLOOR, 1, 1, 1, ('uncovered-after-1-framings',)),
    ("a partial v2 receipt is malformed: outcome without request_id or query",
     V2_PARTIAL, 1, 1, 0, ('discriminating',)),
    ("a v1 receipt is untouched by presence-implies-completeness",
     GOOD, 1, 0, 0, ()),
    ("empty query lines are absent, not recorded framings",
     V2_EMPTY_QUERIES, 1, 1, 0, ('uncovered-after-3-framings',)),
    ("an empty outcome alone stays malformed (regression pin: was already caught by the triple clause, now by completeness — the verdict is invariant, only the reason improved)",
     V2_EMPTY_OUTCOME_ALONE, 1, 1, 0, ()),
    # --- kogaki#160 finding 4 ---
    ("the merged specimen: a serialized tool argument in the query field fails",
     V2_ARGS_AS_QUERY, 1, 1, 1, ('discriminating',)),
    ("one argument blob among real questions is enough to fail",
     V2_ONE_BLOB_AMONG_QUESTIONS, 1, 1, 2, ('uncovered-after-2-framings',)),
    ("a question CONTAINING braces and quotes is still a question",
     V2_BRACES_IN_A_QUESTION, 1, 0, 1, ('discriminating',)),
    ("a value that opens a brace but is not JSON is not judged an argument",
     V2_JSON_SCALAR_IS_NOT_ARGS, 1, 0, 1, ('discriminating',)),
]
fixture_failures = []
for name, src, want_count, want_bad, want_q, want_out in FIXTURES:
    got, bad = scan(src)
    q = sum(len(f['query']) for _, f in got)
    outs = tuple(f['outcome'] for _, f in got if f.get('outcome'))
    if (len(got), len(bad), q, outs) != (want_count, want_bad, want_q, want_out):
        fixture_failures.append(
            f"{name}: got ({len(got)} receipts, {len(bad)} malformed, "
            f"{q} queries, outcomes={outs}), want "
            f"({want_count}, {want_bad}, {want_q}, {want_out})")
if fixture_failures:
    print("FAIL fixture pass — the scanner does not discriminate:")
    for f in fixture_failures:
        print(f"  {f}")
    sys.exit(1)

# ---------------------------------------------------------------------------
# The real scan.
# ---------------------------------------------------------------------------
source = os.environ["CONSULT_SOURCE"]
range_desc = os.environ["CONSULT_RANGE"]
receipts, malformed = scan(source)

for pin, why in malformed:
    print(f"FAIL malformed receipt — {why}:\n  consulted: {pin}")
if malformed:
    sys.exit(1)

pins = [f"{m.group(1)}@{m.group(2)[:7]}"
        for m in (PIN.match(p) for p, _ in receipts) if m]
# Reported, never gated on: the count of receipts already carrying v2 fields.
# This check reports and never gates on a COUNT (its admission record), so a
# branch whose receipts are all v1 is not a failure — it is a measurement.
v2 = sum(1 for _, f in receipts if f.get('outcome') or f.get('request_id'))
queries = sum(len(f['query']) for _, f in receipts)

# The report. Zero is stated, never silent.
print(f"fixture pass: {len(FIXTURES)}/{len(FIXTURES)} discrimination cases "
      "(mention-in-fence excluded; malformed-outside-fence still fails; "
      "v2 fields parsed, bare `miss` and an under-recorded re-framing fail; "
      "request_id reuse with a changed reading fails, an identical "
      "duplicate does not; a serialized tool argument in the query field "
      "fails while a question containing braces does not)")
print(f"v2 receipts: {v2} of {len(receipts)} carry request_id/outcome, "
      f"{queries} query line(s) recorded — reported, never gated")
distinct = sorted(set(pins))
print(f"consultations this branch: {len(receipts)} "
      f"(receipt-verified, over {range_desc})")
if distinct:
    print(f"distinct pins: {', '.join(distinct)}")
else:
    print("distinct pins: none — no consultation receipt on this branch")
EOF
