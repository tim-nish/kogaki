# Fixture map — one resolved pin, one moved pin, one stale pin (kogaki#1142)

Not a consultation map. This file exists so `check-map-pins.sh` exercises all
three of its arms on every run, against the same live served surface the real
pass reads — a fixture over a stubbed manifest would exercise this checker's own
parsing while asserting nothing about resolution, which is the substitution
kogaki#1141 was filed about.

## 1. resolved — the unit is served, at the hash this pin carries

The address below is the SAME unit `policy/consultation-map.md` entry 1 cites
for its governing kernel. That coupling is deliberate: when the hub re-renders
that unit, this fixture and entry 1 go red together and the repair is one act
rather than two, and this file cannot drift into pinning a unit nothing else in
the repository depends on.

> "Automated checks are cheap to add and hard to remove, so a project ends up
> running a large number of them without anyone deciding to."

pin: coding::lesson/every-check-enters-with-a-budget-and-a-removal-signal@cdd6083e700c5a13e618017110b113c68ef8fb73d03f31575bfcf7234a20a70f

## 2. moved — the unit is served, at a DIFFERENT content hash

A real `unit_id` carrying a hash the surface does not hold. This is the arm that
matters most and the one a checker is likeliest to get wrong, because the
address resolves: nothing is missing, and only the hash says the content moved
underneath the quote. The hash below is sixty-four zeroes, which no content
produces.

pin: coding::lesson/every-check-enters-with-a-budget-and-a-removal-signal@0000000000000000000000000000000000000000000000000000000000000000

## 3. stale — the unit resolves to nothing

A well-formed address naming a unit the surface does not serve. The local name
is reserved for this fixture and is not a unit anyone may mint.

pin: coding::lesson/this-unit-is-a-fixture-and-is-never-served@1111111111111111111111111111111111111111111111111111111111111111

## Not read here, and each absence is the point

frozen: product-lab@dec0d568 topics/knowledge-architecture.md:44 — a column-0
`frozen:` line is provenance and is counted, never resolved (kogaki#603). If the
checker resolved it, this fixture's tally would not be `1 1 1`.

A legacy join key in indented prose —
    `consulted: product-lab@dec0d568 topics/knowledge-architecture.md gloss_sha=d11ac0f8ef5ef4c53d299c61b49ef032d7b91ca540da1d4bb6a2eed372e8f18f`
— is a MENTION, not an emission, and the legacy scan runs at column 0 on
unwrapped lines only. If the checker read it, this fixture's tally would not be
`1 1 1` either, so both exclusions are asserted by the same assertion rather
than trusted.
