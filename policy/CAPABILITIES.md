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
