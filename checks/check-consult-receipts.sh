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
# carrying some continuation fields and not the rest, a `query:` line holding a
# serialized tool argument rather than a question (kogaki#160 finding 4), or —
# kogaki#268 — a `disposition:` outside the ratified two-value gate set.
# All of those are claims the receipt makes about itself; none of them is a
# count of receipts, so the "never gates on the count" contract is untouched.
#
# THE SECOND AXIS: `disposition:` (kogaki#268). There are THREE vocabularies in
# this seam called `outcome`, and two of them are mutually exclusive in one
# field. `outcome:` above is the HUB's ratified QUERY-LEVEL triple — did the
# served surface discriminate the question. The GATE DISPOSITION — what the gate
# did with the answer — is a different axis with its own closed set, and putting
# it in `outcome:` fails this check's own ratified-triple clause by
# construction. The resolution is one field per axis rather than one field
# carrying two: `disposition:` is a second, OPTIONAL continuation key.
#
#   * VALUES ARE ADOPTED, NEVER MINTED. `auto-resolved-FYI | escalated`,
#     verbatim from the ratified amendment (writing-assistant
#     `specs/spec-policy-fork-consultation/SPEC.md` §"Amended 2026-07-21
#     (triage, #519)": a covered fork demoted to an FYI, or an uncovered fork
#     presented as a gate — including an FYI the owner overrode, because "the
#     disposition, not the origin, is recorded" — declared "a closed two-value
#     set, no consumer-local extension"). The consumer owns the field's SHAPE
#     and never its VALUES:
#
#       "A consumer owns the SHAPE of its own record and NEVER the VALUES of a
#        field that exists to join across the boundary, and the test is WHO
#        MUST AGREE for the field to work: a field read by one side is that
#        side's, a field read by both is the boundary's, and the boundary's
#        owner is the hub."
#       `topics/knowledge-architecture.md:50@4cc496b` (re-verified live 2026-08-11; the rule moved from :31, where different text now sits — kogaki#336)
#
#     A gate disposition is read by the emitting consumer AND by the hub that
#     evaluates it (product-lab D7, 2026-07-31), so the value set is the
#     boundary's. Adding the key is this repository's to do; extending the set
#     is not, and this check refuses the extension.
#
#   * OPTIONAL, and its absence means "this consult was not raised at a fork
#     gate". Most consults in this repository are issue-authoring and spec
#     reads, not gates; requiring the field would force a value on them, which
#     is the fabrication class the whole receipt grammar exists to refuse. So
#     `disposition:` is deliberately NOT added to presence-implies-completeness'
#     owed set — a v2 receipt still owes request_id, outcome and one query, and
#     nothing more.
#
#   * WHAT THIS DOES NOT MAKE SUBSTANTIABLE, stated plainly rather than implied.
#     `consult-miss` and `degraded` are GATE CLASSIFICATIONS from a different
#     taxonomy, and neither becomes countable from receipts under this or any
#     schema: an unconsulted fork emits no receipt at all, and a degraded
#     consult emits no receipt BY DESIGN (`policy_source unavailable:`, exit
#     11), so zero-degraded and zero-consults are indistinguishable in the
#     trace. No value in a record can express that record's own absence. They
#     are therefore refused as `disposition:` values with that reason named,
#     rather than admitted to look like coverage this key does not provide.
#
#   * WHY THE KEY MUST BE RECOGNISED HERE AND NOT ONLY EMITTED. The continuation
#     scan stops at the first unrecognised indented key, so a receipt carrying
#     `disposition:` above its `query:` lines parsed on the PRE-#268 scanner as
#     a field-less v1 line with every later field silently dropped — the exact
#     hazard `gateway-query.mjs` documents at its unindented exception marker.
#     The fixture pass carries that case in both directions.
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
# THE HOLE IN THAT ARGUMENT, named rather than left for someone to find (PR
# #186 review, finding 3). The `merge-base..HEAD` half is range-bounded and
# holds. `CONSULT_PR_BODY` is NOT: a PR body that QUOTES a previously-merged
# defective receipt puts that receipt inside the scan window, and the clause
# fires on text the branch did not author. That is not a new hazard — it is
# the use-vs-mention rule above, and its discharge is the same one: a quoted
# receipt belongs in a fence, where it is a mention and is excluded. Stated
# here because "backward compatible" without this sentence is the kind of
# self-consistent-and-incomplete claim this whole clause exists to refuse.
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
CONT = re.compile(r'^[ \t]+(request_id|outcome|disposition|query|axis):[ \t]*(.*)$')
# THE THIRD AXIS: `axis:` (kogaki#336). Unlike every other continuation key,
# this one is PER-QUERY and binds UPWARD to the nearest preceding `query:`
# (owner selection 2026-08-11). That makes it this grammar's first
# POSITION-DEPENDENT key, which is a real cost and is taken deliberately: the
# per-axis grounding obligation is the property the issue exists to install,
# and a receipt-level key cannot express WHICH query grounded WHICH axis.
#
# THE VALUE SET IS NOT OURS AND IS NOT MINTED HERE. `subject | conduct` is the
# hub's to ratify under the boundary-field rule — "a consumer owns the SHAPE of
# its own record and NEVER the VALUES of a field that exists to join across the
# boundary" (product-lab@4cc496b topics/knowledge-architecture.md:50). So this
# check validates SHAPE ONLY: position, and a non-empty token. Any non-empty
# value passes and unknown values are REPORTED, never denied (owner selection
# 2026-08-11). There is deliberately no AXES set beside DISPOSITIONS below —
# writing one would mint the boundary values this repository does not own,
# which is the exact defect that pin names.
#
# The cost is stated rather than discovered: until the hub serves a value set,
# a typo'd axis is indistinguishable from a real one. That window is the price
# of not minting, and the reopen trigger is the hub ratifying the set.
AXIS_KEY = 'axis'
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
# THE SECOND AXIS (kogaki#268). Adopted verbatim from the ratified amendment,
# never re-minted here: the boundary's owner is the hub, so this repository
# fixes the KEY and copies the VALUES. A consumer-local extension of this set
# is the shape `topics/knowledge-architecture.md:50@4cc496b` names as a defect,
# and it is refused below rather than admitted.
DISPOSITIONS = {'auto-resolved-FYI', 'escalated'}
# The predictable wrong values, told apart from an ordinary typo because they
# route to a different answer: these are GATE CLASSIFICATIONS from
# spec-triage-gh's taxonomy, not dispositions, and two of them name states that
# emit no receipt at all — so the refusal names the reason rather than the set.
GATE_CLASSIFICATIONS = {
    'covered': 'a coverage state, not a disposition — a covered fork is either '
               'demoted (`auto-resolved-FYI`) or overridden and re-raised '
               '(`escalated`), and the disposition is what is recorded',
    'consult-miss': 'a fork nobody consulted emits NO receipt at all, so no '
                    'value in a receipt can record it; it is not substantiable '
                    'from receipts under any schema',
    'degraded': 'a degraded consult emits NO receipt by design '
                '(`policy_source unavailable:`, exit 11), so zero-degraded and '
                'zero-consults are indistinguishable in the trace; it is not '
                'substantiable after the fact',
}


def outcome_ok(value):
    return value in OUTCOMES or bool(UNCOVERED.match(value))


def args_shaped(value):
    """True when a `query:` value is a serialized TOOL ARGUMENT, not a question.

    kogaki#160 finding 4. `the consultation map's Miss-postmortem field` defines the field as
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
        fields = {'query': [], 'axes': []}
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
                if key == 'query':
                    fields['query'].append(value)
                    # A query opens a slot for its own axis. Appended in step
                    # with `query` so the two lists are index-aligned by
                    # construction rather than by a later zip that could drift.
                    fields['axes'].append(None)
                elif key == AXIS_KEY:
                    # BINDS UPWARD to the nearest preceding `query:`. An
                    # `axis:` before any query has nothing to bind to and is
                    # recorded as orphaned rather than silently dropped — the
                    # same discipline `before-any-report` already gets
                    # elsewhere in this file, because a key that binds to
                    # nothing and vanishes is indistinguishable from one that
                    # was never written.
                    if fields['axes']:
                        # FIRST DECLARATION WINS, matching every other key in
                        # this grammar. A second `axis:` under one query is a
                        # respelling, not a second axis; two axes for one query
                        # would be the one-field-carrying-two shape the owner
                        # selection rejected by choosing one field per axis.
                        if fields['axes'][-1] is None:
                            fields['axes'][-1] = value
                        else:
                            fields['axis_dup'] = fields.get('axis_dup', 0) + 1
                    else:
                        fields['axis_orphan'] = fields.get('axis_orphan', 0) + 1
                else:
                    fields[key] = value
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
                      'not a question. The consultation map defines '
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
        # THE SECOND AXIS, checked against the set it ADOPTED (kogaki#268).
        # Optional by construction: `disp is None` is a consult that was not
        # raised at a fork gate, which is most of them, and it is silent rather
        # than reported — the alternative would be reporting an absence that
        # means nothing.
        disp = fields.get('disposition')
        if disp is not None and disp not in DISPOSITIONS:
            why = GATE_CLASSIFICATIONS.get(disp)
            malformed.append(
                (pin, f'disposition {disp!r} is not the ratified gate set '
                      '(auto-resolved-FYI | escalated)'
                      + (f' — {disp!r} is {why}' if why else '')
                      + '. The set is a CLOSED two-value set with no '
                        'consumer-local extension (spec-policy-fork-consultation '
                        '§"Amended 2026-07-21 (triage, #519)"): this repository '
                        'owns the shape of its record and never the values of a '
                        'field read across the boundary'))
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
        # The disposition joins the SIGNATURE rather than sitting outside it
        # (kogaki#268). The rule is unchanged in what it already failed and
        # already passed: an identical block quoted twice carries an identical
        # disposition and stays an honest duplicate, and a reused id under a
        # reversed outcome still fails for the outcome. What is added is that
        # one gateway request cannot have carried two DISPOSITIONS either —
        # leaving the field out of the signature would have made the newest
        # field the one place a reused id could disagree without being seen.
        sig = (fields.get('outcome'), fields.get('disposition'),
               tuple(fields['query']))
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
            differs.append(f'disposition {prev_sig[1]!r} vs {sig[1]!r}')
        if prev_sig[2] != sig[2]:
            differs.append(f'{len(prev_sig[2])} query line(s) vs {len(sig[2])}')
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
# --- kogaki#268: the gate disposition, a SECOND continuation key --------------
# THE REGRESSION SPECIMEN, and the case that fails a scanner without the clause.
# `disposition:` sits between `outcome:` and the `query:` lines, which is where
# the emitter puts it. On the pre-#268 scanner the continuation regex does not
# recognise the key, so the scan STOPS there: the receipt parses with
# request_id and outcome only, no query lines, and presence-implies-completeness
# reports it malformed for a `query` it was carrying all along.
V2_DISPOSITION_FYI = (GOOD + "\n  request_id: r\n"
                      "  outcome: discriminating\n"
                      "  disposition: auto-resolved-FYI\n"
                      "  query: does a served line discriminate this fork?\n")
V2_DISPOSITION_ESCALATED = (GOOD + "\n  request_id: r\n"
                            "  outcome: uncovered-after-2-framings\n"
                            "  disposition: escalated\n"
                            "  query: first framing\n  query: second, another axis\n")
# The values this repository may NOT mint. Each is a gate CLASSIFICATION from
# the other taxonomy, and two of them name states that emit no receipt at all.
V2_DISPOSITION_MISS = (GOOD + "\n  request_id: r\n"
                       "  outcome: discriminating\n"
                       "  disposition: consult-miss\n  query: q\n")
V2_DISPOSITION_DEGRADED = (GOOD + "\n  request_id: r\n"
                           "  outcome: discriminating\n"
                           "  disposition: degraded\n  query: q\n")
V2_DISPOSITION_COINED = (GOOD + "\n  request_id: r\n"
                         "  outcome: discriminating\n"
                         "  disposition: overridden\n  query: q\n")
# The two vocabularies stay in their own fields: a disposition token in the
# `outcome:` slot is still the ratified-triple failure it was before #268, and
# a query-level token in the `disposition:` slot is the mirror failure. Both
# directions, because a scanner that admitted either would have collapsed the
# axes this key exists to keep apart.
V2_DISPOSITION_IN_OUTCOME = (GOOD + "\n  request_id: r\n"
                             "  outcome: auto-resolved-FYI\n  query: q\n")
V2_TRIPLE_IN_DISPOSITION = (GOOD + "\n  request_id: r\n"
                            "  outcome: discriminating\n"
                            "  disposition: discriminating\n  query: q\n")
# A `disposition:` ALONE is a partial v2 receipt, exactly as a lone `outcome:`
# is: the new key joins the recognised set and does NOT join the owed set.
V2_DISPOSITION_ALONE = GOOD + "\n  disposition: escalated\n"
# The one rule for empty values reaches the new key too: an empty value is
# ABSENT for every field alike, so this is a non-gate consult and passes.
V2_DISPOSITION_EMPTY = (GOOD + "\n  request_id: r\n"
                        "  outcome: discriminating\n"
                        "  disposition:\n  query: q\n")
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
    # --- kogaki#268: the gate disposition ------------------------------------
    # The 7th field asserts the PARSED dispositions, for the reason the 5th and
    # 6th were added: a case asserting only (count, malformed) cannot observe
    # whether the new key was parsed at all, and the two positive cases below
    # would pass a scanner that recognised the key and threw the value away.
    ("a gate disposition rides beside the outcome and the query lines survive it",
     V2_DISPOSITION_FYI, 1, 0, 1, ('discriminating',), ('auto-resolved-FYI',)),
    ("`escalated` on a re-framed consult: both axes recorded, neither collapsed",
     V2_DISPOSITION_ESCALATED, 1, 0, 2, ('uncovered-after-2-framings',),
     ('escalated',)),
    ("`consult-miss` is refused: an unconsulted fork emits no receipt to carry it",
     V2_DISPOSITION_MISS, 1, 1, 1, ('discriminating',), ('consult-miss',)),
    ("`degraded` is refused: a degraded consult emits no receipt by design",
     V2_DISPOSITION_DEGRADED, 1, 1, 1, ('discriminating',), ('degraded',)),
    ("a locally coined disposition is refused — the set is closed and adopted",
     V2_DISPOSITION_COINED, 1, 1, 1, ('discriminating',), ('overridden',)),
    ("a disposition token in the `outcome:` slot still fails the ratified triple",
     V2_DISPOSITION_IN_OUTCOME, 1, 1, 1, ('auto-resolved-FYI',)),
    ("a query-level token in the `disposition:` slot fails the mirror clause",
     V2_TRIPLE_IN_DISPOSITION, 1, 1, 1, ('discriminating',), ('discriminating',)),
    ("a lone `disposition:` is a partial v2 receipt: the key joins the recognised set, never the owed set",
     V2_DISPOSITION_ALONE, 1, 1, 0, (), ('escalated',)),
    ("an empty disposition is ABSENT, not a claim — the one rule for empty values reaches the new key",
     V2_DISPOSITION_EMPTY, 1, 0, 1, ('discriminating',)),
    ("a v2 receipt with no disposition is a non-gate consult and stays valid",
     V2_FULL, 1, 0, 1, ('discriminating',)),
    # Cross-receipt reuse, extended to the new field and unchanged in the two
    # verdicts it already held.
    ("request_id reused with the DISPOSITION reversed — one request, one disposition",
     "consulted: product-lab@f918c515 LESSONS.md:40\n"
     "  request_id: eeee5555\n"
     "  outcome: discriminating\n"
     "  disposition: auto-resolved-FYI\n"
     "  query: one question\n"
     "\n"
     "consulted: product-lab@f918c515 LESSONS.md:40\n"
     "  request_id: eeee5555\n"
     "  outcome: discriminating\n"
     "  disposition: escalated\n"
     "  query: one question\n",
     2, 1, 2, ('discriminating', 'discriminating'),
     ('auto-resolved-FYI', 'escalated')),
    ("the same disposition-carrying receipt quoted twice is still an honest duplicate",
     V2_DISPOSITION_FYI + "\n" + V2_DISPOSITION_FYI, 2, 0, 2,
     ('discriminating', 'discriminating'),
     ('auto-resolved-FYI', 'auto-resolved-FYI')),
]
fixture_failures = []
# The 7th field (parsed dispositions) is OPTIONAL and defaults to `()`, so the
# cases predating kogaki#268 keep their exact tuples and are not restated — and
# the default is an assertion rather than a waiver: every one of them asserts
# that no disposition was parsed, which is what makes a leak from the new key
# into an old case visible.
for row in FIXTURES:
    name, src, want_count, want_bad, want_q, want_out = row[:6]
    want_disp = row[6] if len(row) > 6 else ()
    got, bad = scan(src)
    q = sum(len(f['query']) for _, f in got)
    outs = tuple(f['outcome'] for _, f in got if f.get('outcome'))
    disps = tuple(f['disposition'] for _, f in got if f.get('disposition'))
    if (len(got), len(bad), q, outs, disps) != \
            (want_count, want_bad, want_q, want_out, want_disp):
        fixture_failures.append(
            f"{name}: got ({len(got)} receipts, {len(bad)} malformed, "
            f"{q} queries, outcomes={outs}, dispositions={disps}), want "
            f"({want_count}, {want_bad}, {want_q}, {want_out}, {want_disp})")
if fixture_failures:
    print("FAIL fixture pass — the scanner does not discriminate:")
    for f in fixture_failures:
        print(f"  {f}")
    sys.exit(1)

# --- the third axis binds PER QUERY (kogaki#336) ---------------------------
# Its own block rather than a widened FIXTURES tuple, because what it asserts
# is ASSOCIATION — which query got which axis — and the 6-tuple above records
# only counts and receipt-level values. Widening it to carry a per-query
# structure would restate every one of the 40 cases above to say nothing new.
#
# BOTH DIRECTIONS, and the second is the load-bearing one: an OPTIONAL key
# tested only where it is present cannot tell "absent and fine" from "silently
# dropped", which is the whole failure mode of a key that binds by position.
_AXBASE = "consulted: product-lab@f918c515 LESSONS.md:40\n  request_id: x\n  outcome: discriminating\n"
_axfail = []
for _label, _src, _want_axes, _want_orphan, _want_dup in [
    ("one query, one axis -> bound to it",
     _AXBASE + "  query: q1\n  axis: subject\n", ['subject'], 0, 0),
    ("two queries, one axis each -> bound in order, not swapped",
     _AXBASE + "  query: q1\n  axis: subject\n  query: q2\n  axis: conduct\n",
     ['subject', 'conduct'], 0, 0),
    ("an axis-less query keeps its slot -> None, never a shift onto its neighbour",
     _AXBASE + "  query: q1\n  query: q2\n  axis: conduct\n",
     [None, 'conduct'], 0, 0),
    ("NO axis at all -> the key is optional and nothing is invented",
     _AXBASE + "  query: q1\n  query: q2\n", [None, None], 0, 0),
    ("an axis BEFORE any query is orphaned, not bound to a later one",
     _AXBASE + "  axis: subject\n  query: q1\n", [None], 1, 0),
    ("a SECOND axis under one query -> first wins, the respelling is counted",
     _AXBASE + "  query: q1\n  axis: subject\n  axis: conduct\n",
     ['subject'], 0, 1),
    ("an UNKNOWN token is bound exactly like a known one — shape only, and "
     "this is the case that proves no value set is enforced here",
     _AXBASE + "  query: q1\n  axis: zzz-not-ratified\n",
     ['zzz-not-ratified'], 0, 0),
    ("an EMPTY axis value is absent, matching this grammar's one empty rule",
     _AXBASE + "  query: q1\n  axis:\n", [None], 0, 0),
]:
    _g, _ = scan(_src)
    _axes_got = _g[0][1].get('axes') if _g else None
    _orph = sum(f.get('axis_orphan', 0) for _, f in _g)
    _dp = sum(f.get('axis_dup', 0) for _, f in _g)
    if (_axes_got, _orph, _dp) != (_want_axes, _want_orphan, _want_dup):
        _axfail.append(f"{_label}: got ({_axes_got}, orphan={_orph}, dup={_dp}), "
                       f"want ({_want_axes}, orphan={_want_orphan}, dup={_want_dup})")
# The key must not gate. Asserted rather than assumed: the whole owner
# selection is "shape only, any non-empty token passes", and a check that
# quietly started denying unknown axes would mint the boundary values this
# repository does not own — visible only here.
_g_unknown, _bad_unknown = scan(_AXBASE + "  query: q1\n  axis: zzz-not-ratified\n")
if _bad_unknown:
    _axfail.append("an unknown axis was reported MALFORMED — the value set is "
                   "the hub's and this check owns shape only (kogaki#336)")
if _axfail:
    print("FAIL axis fixture — the per-query binding does not discriminate:")
    for f in _axfail:
        print(f"  {f}")
    sys.exit(1)
print("axis pass: 8/8 per-query binding cases (bound / two in order / a "
      "gap keeps its slot / absent invents nothing / orphaned before any "
      "query / first-declaration-wins / an unknown token binds like a known "
      "one / empty is absent), plus the never-gates assertion")

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
# THE GATE HALF, reported on the same never-gated terms (kogaki#268). Two
# counts and no third, because a third would be a claim the evidence cannot
# carry: `consult-miss` and `degraded` emit no receipt at all, so this line
# says what it counted and names what nothing here can count.
gate = [f['disposition'] for _, f in receipts if f.get('disposition')]
fyi = sum(1 for d in gate if d == 'auto-resolved-FYI')
esc = sum(1 for d in gate if d == 'escalated')

# The report. Zero is stated, never silent.
print(f"fixture pass: {len(FIXTURES)}/{len(FIXTURES)} discrimination cases "
      "(mention-in-fence excluded; malformed-outside-fence still fails; "
      "v2 fields parsed, bare `miss` and an under-recorded re-framing fail; "
      "request_id reuse with a changed reading fails, an identical "
      "duplicate does not; a serialized tool argument in the query field "
      "fails while a question containing braces does not; a `disposition:` "
      "outside the adopted two-value gate set fails, and a receipt without "
      "one is a non-gate consult and passes)")
print(f"v2 receipts: {v2} of {len(receipts)} carry request_id/outcome, "
      f"{queries} query line(s) recorded — reported, never gated")
print(f"gate dispositions: {len(gate)} of {len(receipts)} receipt(s) were "
      f"raised at a fork gate — {fyi} auto-resolved-FYI, {esc} escalated. "
      "consult-miss and degraded are NOT counted here and are not countable "
      "from receipts: an unconsulted fork emits none, and a degraded consult "
      "emits none by design")
# THE THIRD AXIS, reported on the same never-gated terms (kogaki#336). Shape
# only: this counts axis-bearing queries and NAMES the distinct values without
# judging them, because the `subject | conduct` value set is the hub's to
# ratify and this repository owns the field's SHAPE alone. Naming the values
# rather than only counting them is what makes an unratified set observable
# while it is unratified — a count alone would hide a typo'd axis exactly as
# well as it hides a real one, and the window before ratification is precisely
# when somebody needs to see what is being written.
_axes = [a for _, f in receipts for a in f.get('axes', []) if a]
_orphan = sum(f.get('axis_orphan', 0) for _, f in receipts)
_dup = sum(f.get('axis_dup', 0) for _, f in receipts)
if _axes or _orphan or _dup:
    print(f"axes: {len(_axes)} of {queries} query line(s) declare one "
          f"({', '.join(sorted(set(_axes))) or 'none'}) — SHAPE ONLY, never "
          "gated: the value set is the hub's to ratify (boundary-field rule, "
          "product-lab topics/knowledge-architecture.md:50), so an unknown "
          "token is reported here and denied nowhere")
    if _orphan:
        print(f"  {_orphan} `axis:` line(s) bound to NO query — an axis binds "
              "upward to the nearest preceding `query:`, and one before any "
              "query is orphaned. Reported, not dropped silently")
    if _dup:
        print(f"  {_dup} query line(s) carry a SECOND `axis:` — first "
              "declaration wins, matching every other key in this grammar; a "
              "second axis under one query is a respelling, and one field per "
              "axis is what the grammar chose")
else:
    print(f"axes: 0 of {queries} query line(s) declare one — the key is "
          "OPTIONAL and its absence is not a finding (kogaki#336)")
distinct = sorted(set(pins))
print(f"consultations this branch: {len(receipts)} "
      f"(receipt-verified, over {range_desc})")
if distinct:
    print(f"distinct pins: {', '.join(distinct)}")
else:
    print("distinct pins: none — no consultation receipt on this branch")
EOF
