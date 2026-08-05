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
# disagrees with the query lines or falls below the re-ask floor, or a receipt
# carrying some continuation fields and not the rest. All of those are claims
# the receipt makes about itself; none of them is a count of receipts, so the
# "never gates on the count" contract is untouched.
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
import os, re, sys

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
        i += 1
        while i < len(lines):
            c = CONT.match(lines[i])
            if not c:
                break
            key, value = c.group(1), c.group(2).strip()
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
        has_cont = bool(fields.get('request_id') or got or fields['query'])
        if has_cont:
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
# Each fixture asserts (receipts, malformed, total query lines, outcomes).
# The last two fields are not decoration: a (count, malformed) assertion alone
# cannot observe whether the continuation fields were parsed at all, so six of
# the eight v2 cases below would pass a scanner that ignored them entirely —
# measured, not assumed. Asserting the parsed fields is what makes them
# discrimination evidence rather than fixtures that look like it.
FIXTURES = [
    ("real receipt counted", GOOD, 1, 0, 0, ()),
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
    ("uncovered-after-N-framings is accepted for any N",
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
      "v2 fields parsed, bare `miss` and an under-recorded re-framing fail)")
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
