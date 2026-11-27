---
name: strand-search
description: Guidance for finding article material in the served record together with the maintainer. Use when the maintainer asks what the record holds on a topic for an article — "find material on X", "search the Strands for X", "what do we have on X". Saved guidance for a conversation; it starts no command and guarantees no order.
---

# Strand search

This is saved guidance, written down so that the maintainer does not have to
say it again in every conversation. It starts no command. Nothing checks that
it was followed. The judgments below are the Session's to make and the
maintainer's to choose between.

## What the search is for

An article is planned as RSs joined by relations of Rhetorical Structure
Theory. The search serves that plan in two ways, and the two are kept apart.

- **Units that say the same thing.** Lessons or Decisions that state one
  point about different cases. They are the material of one RS.
- **What came before and after.** Units joined to the first by cause and by
  date: why the work began, what was decided, what followed. They are the
  material of the RSs joined to that one, as its Background, its cause or
  its result. They are never merged into it.

A search by words returns both kinds mixed together. Say which kind each
Unit you bring up is.

## Search inside one Shard

- Take the Shard names from the list of names, and read one Shard at a time.
  A Shard answers a few dozen rows, each with the Unit's address, its Batch
  and its text.
- Do not guess a Shard name. An answer of no data means the name is wrong:
  look the name up.
- Do not read the whole list of Lessons or of glosses with no Shard named.
  It answers every Unit of the Package.

The two reads, through the kit:

    node policy/kit/bin/gateway-query.mjs --consumer kogaki --package coding --tool surface_names --args '{"kind":"topics"}'
    node policy/kit/bin/gateway-query.mjs --consumer kogaki --package coding --tool topic_thread --args '{"topic":"<a Shard name>"}'

## Start from one Unit

- Settle the topic with the maintainer, and find one Lesson or Decision on
  it. That Unit is where the search starts.
- Offer about three Units similar to it. Similar means the same point made
  about a different case. Sharing words is not enough. For each one, say in
  one line what is the same and what differs.
- The maintainer selects one or more. Several similar Units need not end in
  one RS over all of them.

## Read the Batch of that Unit, every kind

- The Units of one Batch carry the same Batch name. Look at its Lessons, its
  Journeys and its Decisions. The Decisions carry the dates and the causes
  an article needs, and a list of Lessons alone leaves them out.
- Where a Batch holds no Decision, say so, and look at the Batches of the
  days beside it.
- The Journey says what problem the Batch was about. Tell the maintainer what
  it was, and ask whether to search for other Batches about that problem. The
  maintainer decides.

## Say what was searched

When telling the maintainer what a search found, say which Shards were read,
how many Units of each kind they held, and what was looked for and not found.

## After the search

- The statements of the article are worked out in conversation with the
  maintainer. Each statement stands on its own and is approved in the
  maintainer's words.
- `node src/rs.mjs create --statement <file> <address> ...` reads one
  statement into an RS file, and the addresses name the Units it rests on.
- Where the record holds no Unit for something the article needs, say so.
  A Decision is recorded only on the maintainer's word.
