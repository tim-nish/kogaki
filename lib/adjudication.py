# The ONE adjudication unit — specs/SPEC.md §4 clause 12's grammar and its
# join (kogaki#269), lent to tools/review-sweep.sh's state machine (kogaki#288).
#
# WHY THIS FILE EXISTS. Clause 12 denies a merge when a justified `blocking
# open` at an earlier counted segment is named by no `adjudicates:` line in any
# later counted segment. That deny landed in `checks/check-review-report.sh`
# and nowhere else, so `tools/review-sweep.sh`'s `decide()` — which reads only
# the CURRENT head's segments — returned `done` on a PR the merge gate was
# refusing: no round spawned, no `author-owes`, nothing for the author to push,
# and the sweep's own output announcing a terminal state the merge layer
# contradicted (kogaki#288).
#
# THE PRECEDENT IS `lib/head_resolution.py` AND `lib/disposition.py`, AND IT IS
# FOLLOWED RATHER THAN RE-ARGUED. Same two consumers, same repository, same
# failure mode one clause over. Clause 7 v2's rule bounds what may move: it
# shares the RESOLUTION, never the parser — so each consumer keeps its own
# `segments()` loop on its own ratified grounds, and what lives here is the
# GRAMMAR both loops must read identically plus the JOIN both consumers ask.
#
# WHY THE JOIN AND NOT ONLY THE GRAMMAR. `lib/disposition.py` moved a grammar
# because two regexes that agree today drift on the next amendment with nothing
# failing when they do. The join is the sharper case: a divergent regex misreads
# a line, while a divergent join returns NOTHING — "two vocabularies do not
# merely disagree, they make the join return NOTHING, which reads as no data
# rather than as a conflict" (`consulted: product-lab@8906f20752e27d1935c62f24c
# 8ba41ea1d55dba0 topics/knowledge-architecture.md:50`). A sweep that computed
# the predicate its own way and returned an empty list would report exactly the
# false `done` kogaki#288 was filed about, having "implemented" the fix.
#
# WHY IT IS NOT UNDER `checks/`. Inherited verbatim from both siblings:
# `checks/check-registry-conformance.sh` fails an unregistered file directly
# inside `checks/` as dead code, and a unit BOTH lanes consume is not a check.
#
# THE FUNCTIONS BELOW RESOLVE `segments`, `head_segments`, `counted` AND
# `same_head` FROM THEIR CONSUMER, at call time, because this file is loaded by
# `exec(compile(...))` into the consumer's own globals — the same loading both
# siblings use. That is deliberate and is what keeps the parser local: each
# consumer's own `segments()` answers, and only the join is shared.
#
# THE AGREEMENT FIXTURE IS EACH CONSUMER'S OWN. Loading is not agreement — a
# consumer that loads this and then re-derives the same answer its own way has
# the divergence back. Each consumer asserts it reaches these names only
# through this module and defines none of them locally.

import re

# Clause 12's adjudication line. ANCHORED WHOLE, on the same ground as its
# siblings: `adjudicates` is ordinary review vocabulary and a finding's prose
# discussing an adjudication is a mention, never a declaration (kogaki#41).
#
# GROUNDS ARE REQUIRED AND NON-EMPTY — `(\S.*?)` rather than `(.*?)`. A line
# revising a severity without saying why is the silent re-grade clause 12
# exists to end, wearing the grammar's clothes.
ADJUDICATES = re.compile(
    r'^\s*adjudicates:\s*([0-9a-f]{7,40})\s+finding\s+([0-9]+)\s+(\S.*?)\s*$',
    re.MULTILINE)


def bind_adjudication(current, line):
    """Bind one `adjudicates:` line into the segment being built, or report
    that the line is not one. Returns True when the line WAS an adjudication —
    the caller's loop then continues, exactly as it does for its siblings.

    THE TWO BINDING RULES ARE CLAUSE 12'S OWN, and they live here rather than
    in each consumer's loop because they are the grammar rather than the
    parse: which finding an adjudication names is what makes the three-way
    distinction readable at all, so a consumer binding it differently would
    read a different record from the same text.

      IT BINDS TO THE IMMEDIATELY PRECEDING `finding:` LINE in its segment.
      A segment-level list would discharge the earlier finding and be unable
      to say what answered it.

      FIRST DECLARATION PER FINDING WINS — a later line never revises an
      earlier claim about the same finding, the rule scope, completeness and
      disposition already follow.

    A LINE BEFORE ANY `finding:` IN ITS SEGMENT BINDS TO NOTHING and declares
    nothing — the same shape a declaration written before any report line
    already has. It is not an error and invalidates nothing; there is simply no
    finding for it to revise.
    """
    aj = ADJUDICATES.match(line)
    if not aj:
        return False
    if current['findings']:
        idx = len(current['findings']) - 1
        if idx not in current['adjudicates']:
            # The ordinal is an int so `finding 03` and `finding 3` name the
            # same finding: the writer is copying an ordinal out of a gate's
            # own output, and a join disagreeing with itself on leading zeros
            # would fail in the one direction nobody would think to test.
            current['adjudicates'][idx] = (
                aj.group(1), int(aj.group(2)), aj.group(3))
    return True


def unadjudicated_blocking(bodies, head, carried=()):
    """§4 clause 12 (kogaki#269): EARLIER-head justified `blocking open`
    findings that no later counted segment adjudicates.

    Returns a list of (sha, ordinal, finding, suggestion) — the suggestion
    being the `adjudicates:` line that would discharge it, PASTE-READY,
    because the remedy is one line and a gate that names a defect without
    naming its repair spends the reader's time computing an ordinal the gate
    already has.

    `finding` IS THE CONSUMER'S OWN FINDING TUPLE, HANDED BACK UNREAD PAST ITS
    FIRST THREE FIELDS, and that is a contract rather than an accident
    (kogaki#288). The two consumers' segmenters agree on `(severity, state,
    justification)` and DISAGREE on the fourth slot: the merge gate stores the
    finding's line text there, the sweep stores its clause-8 disposition. A
    shared predicate that read slot 4 would silently return a disposition
    where one consumer expected prose. So the predicate reads only the three
    fields both parsers mean the same thing by, and each consumer renders the
    fourth itself. This is clause 7 v2's share-the-resolution-never-the-parser
    rule biting at the one place it is easy to miss — the shapes are close
    enough to unpack without error and different enough to be wrong.

    THE FIVE-PART PREDICATE, in the clause's own order. A finding is
    unadjudicated when ALL of:

      1. its segment does not name the current head and is not carried onto it
         — `head_segments()` decides both, so this and the presence side
         cannot drift apart on what "this head" means;
      2. its segment COUNTS (clause 6) — a fragment counts as nothing here
         exactly as it does everywhere else, so a half-posted round-1 report
         cannot hold a later head red;
      3. it is `blocking` and still `open`;
      4. it carries its `[policy:|harm:]` justification — kogaki#72's budget
         is untouched, and an UNJUSTIFIED blocking already fails toward merge
         as a `should`, so admitting one here would let it gate by the back
         door after failing to gate at its own head;
      5. no LATER counted segment carries an `adjudicates:` line naming its
         sha and ordinal. Only this part is new.

    THIS GATES THE SILENCE AND NEVER THE SEVERITY. `should` and `nit` appear
    nowhere above: the predicate never reads the later finding's severity, so
    no `should` gates as a `should`, an adjudicated downgrade passes exactly
    as before, and a PR that writes no lower-severity finding at all is caught
    identically — the case has nothing to do with downgrading and everything
    to do with an earlier blocking that no later segment ever answered. The
    served ground is that a check denies on a block's ABSENCE and never judges
    its CONTENT (`consulted: product-lab@dec0d568
    topics/claude-code-ops.md:19`).

    LATER IS DOCUMENT ORDER, and that is the whole ordering available: comment
    bodies arrive concatenated in the order the PR holds them, and a segment
    cannot adjudicate a finding written after it. Reading the adjudications of
    EVERY counted segment instead — earlier ones included — would let a
    round-1 segment discharge a round-2 blocking, which is the direction the
    clause exists to refuse.

    BOTH CONSUMERS ASK THIS SAME FUNCTION and neither restates it (kogaki#288).
    The merge gate branches on a non-empty result and denies; the sweep's
    `decide()` returns its `unadjudicated` reporting state on the same
    non-empty result and spawns nothing.
    """
    segs = segments(bodies)                                        # noqa: F821
    this_head = {id(s) for s in head_segments(segs, head, carried)}  # noqa: F821
    out = []
    for i, seg in enumerate(segs):
        if id(seg) in this_head or not counted(seg):               # noqa: F821
            continue                                    # parts 1 and 2
        # Part 5's evidence, gathered over the segments AFTER this one only.
        answered = set()
        for later in segs[i + 1:]:
            if not counted(later):                                 # noqa: F821
                continue
            for _i, (sha, n, _grounds) in later['adjudicates'].items():
                if same_head(sha, seg['sha']):                     # noqa: F821
                    answered.add(n)
        for ordinal, finding in enumerate(seg['findings'], 1):
            sev, state, just = finding[0], finding[1], finding[2]
            if sev != 'blocking' or state != 'open' or not just:
                continue                                # parts 3 and 4
            if ordinal in answered:
                continue                                # part 5
            # THE SUGGESTION CARRIES THE GROUNDS SLOT, and carries it as an
            # unmistakable placeholder rather than as empty space. A remedy
            # printed without it is a remedy the predicate refuses, and the
            # earlier form of this line printed exactly that — the gate would
            # have taught a malformed line to every reviewer who pasted its
            # output.
            out.append((seg['sha'], ordinal, finding,
                        f"adjudicates: {seg['sha']} finding {ordinal}  "
                        f"<why this severity is being revised>"))
    return out


def adjudication_states(bodies, head, carried=()):
    """The THREE-WAY DISTINCTION clause 12 requires to be renderable, read off
    the record rather than inferred: for every earlier-head finding that a
    later counted segment adjudicates, which of the three states answered it.

    Returns a list of (sha, ordinal, state, grounds) where state is:

      `resolved`         the adjudicating finding is `blocking resolved`
      `adjudicated-down` it is `should` or `nit`
      `re-declared`      it is still `blocking open`

    The fourth state — SILENTLY RE-GRADED — is the absence of all three, and
    is exactly what `unadjudicated_blocking()` denies on. It is not a value
    here because it is not a thing the record says; it is the record saying
    nothing.

    THIS READS THE ADJUDICATING FINDING'S SEVERITY AND THE DENY DOES NOT, and
    the split is the whole of kogaki#72's safety here: the gate decides on
    identity alone, so no `should` ever gates as a `should`, while the human
    reading the gate's output still gets told which of the three happened.
    """
    segs = segments(bodies)                                        # noqa: F821
    out = []
    for seg in segs:
        if not counted(seg):                                       # noqa: F821
            continue
        for idx, (sha, n, grounds) in sorted(seg['adjudicates'].items()):
            sev, state = seg['findings'][idx][0], seg['findings'][idx][1]
            if sev == 'blocking' and state == 'resolved':
                what = 'resolved'
            elif sev == 'blocking':
                what = 're-declared'
            else:
                what = 'adjudicated-down'
            out.append((sha, n, what, grounds))
    return out
