<!-- tsurezure-client-kit:file (managed — replaced by install.sh while this marker is present) -->
# Gukan capabilities served to this repository

Served by the tsurezure gateway under the operator's grant (consumer
identity declared per request, logged server-side). All tools are
**read-only**; every response carries `pin: <source>@<commit>` and
line-level cites in `file:line@commit` grammar.

| tool | what it answers |
|---|---|
| `policy_lookup` | one bounded question → matched served lines (the default consultation path) |
| `glossary_entry` | one glossary entry (definition + state line) |
| `lessons_index` | the lessons headline index |
| `topic_thread` | a topic's decision thread |
| `gloss_index` | plain-register overview index (tier-1; tag-scoped tier-2 hop) |
| `surface_names` | bounded enumeration of served surfaces |
| `element_survey` | structured element manifest selection |

Routing rules: a `coverage: partial|low` marker routes to the miss path —
surface the miss with the question, never widen the read. A served miss is
an answer and a distill-bug signal, not a license to explore. An unreachable
gateway prints one `policy_source unavailable:` line and the work proceeds
without policy interaction.

**The entry point is `consult.mjs`; the transport underneath it is
`gateway-query.mjs`.** `consult.mjs --consumer <name> --claim '<claim>'
[--claim '<re-framing>'] --outcome <token>` runs the lookup and emits the
receipt through the transport (one receipt composer, no second one). It carries
the query discipline as an affordance: a **verdict-shaped** input is corrected
at the point of use and not forwarded (exit 3, re-submittable in the same act
with `--restate`); a non-discriminating outcome carrying a single framing is
refused with what the re-framing owes (exit 4); the framing count is emitted as
the transport fact it is, under a bound of one re-framing. Exits 11 and 12 come
from the transport unchanged, and on 11 the entry point prints the degraded
path rather than leaving it silent. Reach for the transport directly only for a
tool whose shape the entry point does not carry, or for more framings than the
bound.

**The receipt is emitted by the transport, not transcribed.** Every response
above carries the `request_id` and the served `consulted:` line the receipt
needs, so `gateway-query.mjs --receipt --outcome <token>` prints the complete
block after the tool results — one `--args` per framing, one `query:` line per
framing actually run. `--outcome` has no default: the token is a reading rather
than an observation and **the operator supplies it** — the
`consult-outcome-token-assignment` fill (owner decision 2026-08-06,
kogaki's specs/SPEC.md §4) — so both tools refuse (exit 2) rather than guessing, and
refuse a token contradicting an observed fact rather than repairing it.
**`--question` is required in receipt mode, one per `--args` and in the same
order** (kogaki#160 finding 4): the `query:` line is the question verbatim, and
before this argument existed the transport derived it — recording a non-
`policy_lookup` tool's `--args` JSON in the question field, which passed every
check while telling a reader nothing. The question is bound to a **call**, so
the receipt's `request_id` (the last framing's) and the last `query:` line are
the same gateway call's. `consult.mjs` also takes `--args` positionally against
`--claim`, so a prescription whose tool is not `policy_lookup` — the
consultation map's entry-1 `gloss_index` read — is mediated by the entry point
rather than requiring a bare transport call. A
degraded run emits **no** receipt — one
`policy_source unavailable:` line and exit 11, as above. Consulting through a
surface the kit does not mediate still owes a receipt; compose it by hand and
mark it `consult-receipt: hand-composed — <why>` on its own unindented line
above line one, so the exception rate is countable.
