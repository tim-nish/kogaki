# The ONE disposition unit — specs/SPEC.md §4 clause 8's grammar (kogaki#224),
# lent to clause 11 (kogaki#306, kogaki#357).
#
# WHY THIS FILE EXISTS. Clause 8 defines what happens to a non-gating finding a
# PR merges with: `carried: #<N>`, `carried: register`, or `declined: <reason>`.
# Clause 11 gives a SUCCESSOR the obligation to disposition every finding it
# inherits from the PR it supersedes — and says the grammar is **LENT, not
# restated**, because "a second vocabulary for what happened to a finding would
# be a synonym in a join key, which is the same defect as a divergence".
#
# Until this file, that grammar lived in exactly one place: `tools/review-sweep.sh`.
# Clause 11's carrier is `checks/check-review-report.sh`, a different file, so
# implementing clause 11 meant either a second copy of the pattern — the
# divergence clause 8 names by name — or a module both consumers load. This is
# the module.
#
# THE PRECEDENT IS `lib/head_resolution.py` AND IT IS FOLLOWED RATHER THAN
# RE-ARGUED. That file exists because `decide()` and the merge gate asked one
# question with two units and disagreed; the fix was a third carrier both load,
# chosen over a source string because both consumers are ordinary files on disk.
# Every word of that reasoning holds here: same two consumers, same repository,
# same failure mode one clause over. What is new is only that this unit is a
# GRAMMAR rather than a computation, which makes the divergence quieter — two
# regexes that agree today and drift on the next amendment, with nothing failing
# when they do.
#
# WHY IT IS NOT UNDER `checks/`. Inherited verbatim from the sibling:
# `checks/check-registry-conformance.sh` fails an unregistered file directly
# inside `checks/` as dead code, and a unit BOTH lanes consume is not a check.
#
# THE AGREEMENT FIXTURE IS EACH CONSUMER'S OWN. Loading is not agreement — a
# consumer that loads this and then re-derives the same answer its own way has
# the divergence back. Each consumer asserts it reaches the grammar only through
# these names.

import re

# Clause 8's disposition line. ANCHORED WHOLE, which matters more here than for
# its sibling declarations: `declined` is ordinary review vocabulary and appears
# inside finding prose constantly, so an unanchored match would read a mention
# as a declaration (kogaki#41).
DISPOSITION = re.compile(r'^\s*(?P<kind>carried|declined):\s*(?P<val>.*?)\s*$',
                         re.M)

# WELL-FORMEDNESS IS PART OF THE TOKEN, not a later judgment. `carried:` takes
# an issue number or the literal `register` — §4 clause 8 admits the review
# lane's register (kogaki#246) as a carrier so the clause does not mint one
# issue per nit, and the carrier is named in prose only, so this pattern matches
# the literal token and has never carried an issue number. `declined:` requires
# a non-empty reason: a bare `declined:` is the evaporation with a word in front
# of it.
CARRIER = re.compile(r'^(?:#\d+|register)$')


def disposition_ok(kind, val):
    """Is this a WELL-FORMED disposition? §4 clause 8's grammar, ONE reader.

    A malformed one is REPORTED by every consumer rather than silently read as
    absent, because the two are indistinguishable at the boundary otherwise and
    this repository has shipped that confusion three times.
    """
    return bool(CARRIER.match(val)) if kind == 'carried' else bool(val)


def carried_issue(kind, val):
    """The issue number a `carried:` names, or None.

    None covers every case that names no issue: a `declined:`, a
    `carried: register`, and anything malformed. Clause 11's AC2a needs this to
    ask whether a disposition's carrier survives the merge that reads it, and
    that question is meaningless for the other two.
    """
    if kind != 'carried' or not disposition_ok(kind, val):
        return None
    return int(val[1:]) if val.startswith('#') else None
