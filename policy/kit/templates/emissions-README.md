# Emissions — staging candidates from this repository's own sittings

Written by `policy/kit/bin/emit.mjs`, under `specs/spec-client-kit/SPEC.md` §4.

**The duty.** Any sitting here that produces a durable learning — an
investigation finding, a reversal, a correction, a design decision — writes ONE
staging candidate in the same sitting, **unasked**. Not when someone remembers,
not when the owner notices and relays it: in the same sitting, as part of
producing the learning.

**Emission is the duty; promotion is untouched.** A file here is a *candidate*.
Nothing in this directory is promoted by writing it, nothing here writes any
recall surface, and the hub's own selection gate remains the sole promotion
path. A kit that closed the loop would violate the seam it exists to serve.

**Plain register, by contract.** Write for a reader who does not hold hub
vocabulary — because most readers do not, and because policy drifting into
internal terminology is a live defect this channel exists to counteract rather
than import. The writer reports hub-internal terms it recognises; it never
refuses your words.

## Why this directory is COMMITTED, when `policy/shape.md` is not

The two look like one decision and are two, and the discriminator is **source
sensitivity, not file kind**:

| artifact | derives from | committed |
|---|---|---|
| `policy/shape.md` | **hub**, owner-realm material | **no** — committing into a public repository would be a declassification act, and kogaki's `specs/SPEC.md` §2.5.2 grants no grounds for one |
| `policy/emissions/*` | **this repository's own** experience, in plain register | **yes** — already at this repository's own sensitivity, so committing declassifies nothing |

Committing also buys two things a run workspace cannot: survival of workspace
cleanup, and visibility in the pull request that carried the work. The served
position rules out only one location outright — the hub's own intake — and
between the two it permits, kogaki's `specs/SPEC.md` §2.5.1's **lifetime** discriminator
decides: an emission awaits a sweep that may be days away, so its lifetime is
the owner's and not the run's.

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 topics/archive/knowledge-architecture.md:202`

## Format — five fields, fixed

`date`, `repo`, `grain`, then **Trigger** (what happened) and **The learning**.
`grain` is one of `lesson`, `topic-line`, `glossary-delta` — a closed set,
proposed rather than decided here.

## Writing one

```
node policy/kit/bin/emit.mjs \
  --trigger '<what happened>' \
  --learning '<the learning, in plain register>' \
  --grain lesson
```
