---
name: project
description: Realize a Dev.to-ready Article from a reviewed Draft. Use when the owner wants the reviewed Draft turned into something they can paste into the Dev.to editor — "project the draft", "run /project", "build the dev.to article for <slug>". Reads only theses/<slug>/draft.reviewed.md, its sibling review.md and projection.md. Never rewrites prose, title or lede for a platform audience.
---

# Projection — invoking the Harness

Projection is a **content-neutral transformation**, in the owner's own words:
*"Projection is a content-neutral transformation; editing based on reader
personas or style is outside its boundary."* It selects and maps fields,
changes dialect and asset locations, and adds no content. Persona and style
are settled at the Brief boundary, if anywhere — never here.

## The closed input set

The Harness reads `theses/<slug>/draft.reviewed.md` (ReviewDraft's output —
never `draft.md`, and never a reviewed Draft with no `review.md` beside it: an
unreviewed Draft is not projected) and `theses/<slug>/projection.md`, the
owner-supplied field file. **It reads no Brief, no Packet, no Move file and no
Strand.**

`projection.md` carries `title` and `description` (required; the model's
wording, validated only for presence and cap), and optionally `tags` (at most
four, alphanumeric), `cover_image`, `series` and `canonical_url`. Every field
file line is written as `key: <value as JSON>` — the same convention
`draft.mjs` uses for `generated_by:` — so a hand-edited file and one `propose`
writes parse under one grammar.

## Entry points

                       node src/project.mjs run     --draft <draft.reviewed.md> --profile dev.to
                       node src/project.mjs verify  --draft <draft.reviewed.md> --profile dev.to
    [<reply JSON>]   | node src/project.mjs propose --draft <draft.reviewed.md> --profile dev.to

**This file names entry points and carries no flow ordering** — the same
convention `.claude/skills/review-draft/SKILL.md` states for its own acts.
`run` and `verify` need no model and can run in either order any number of
times; `propose` is the one act that needs a model, and nothing else does
(the Removal Test, owner amendment 2026-09-18 item 3).

`propose` renders the schema and the reviewed Draft's body to standard output
when nothing is piped in; pipe a JSON reply — `{"title": "...", "description":
"..."}` — back in to record it. The Harness owns only that both fields exist
and fit their declared caps; it owns nothing about their wording.

`run` validates `projection.md` against the `dev.to` profile, applies the
profile's declared reversible converters where the body carries their
construct, and writes `theses/<slug>/article.dev.to.md` — frontmatter carrying
exactly the profile's fields plus `published: false`, body unchanged except
for what a converter fired. It rewrites `projection.md`'s `## Record` section
with the source body sha, the profile, every converter that fired and its
count, and the verify result, on every run.

`verify` strips the Article's frontmatter, reverses the profile's converters,
and refuses on any difference from the reviewed Draft's body — recoverability
is the acceptance instrument for every transformation in this pipeline, and a
converter that cannot be reversed is not admitted to a profile.

## Where it stops

The command ends when the Article and its record exist. **Publishing is the
owner's act**: paste `article.dev.to.md` into the Dev.to editor and press
publish. No Dev.to API call is made here, and nothing is written to the
`articles` repository — that workflow stays inside kogaki.
