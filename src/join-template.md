<!--
The JOIN PACKET template (kogaki#872) — the judging model's ENTIRE input for
ONE (Step, item) pair.

Runtime-read, like src/packet-template.md and src/recovery-template.md:
`review-draft compare` fills the {{...}} slots and writes the result into the
run workspace, and the written result is everything the judging model reads.

ONE PAIR, ONE QUESTION, THREE TOKENS. The item table decides which pairs exist
and what each one asks; this file decides only how a pair is put in front of a
reader. A template that carried a second question, or a scale, would be the
place a score got back in after the item table refused to hold one.

THE JUDGING MODEL IS NOT THE RECOVERING ONE. The recovering reviewer is blind
to the Packet by design (kogaki#871) and this reader is not: it sees the
declared line, the recovered line and the quoted prose together, because
judging whether they agree is the whole act. The blindness that matters here is
of a different kind — this reader sees ONE pair and never the others, so it
cannot rank, weigh or aggregate across a Step.

NO NUMBERS BUT LINE NUMBERS. The reason sentence is refused when it carries a
digit: line numbers belong in the span the Harness already renders, and every
other number in a review is a score by another name.
-->

# Judge one pair

You are judging **one** pair — one declared line against one line recovered from
the prose. Answer the question below and nothing else. Do not look for other
problems, do not rank this against anything, and do not weigh how bad it is.

## The pair

- **Step.** {{step_id}}
- **Item.** {{item}} ({{item_class}})

### What the Packet DECLARED

{{declared}}

### What was RECOVERED from the prose

{{recovered}}

### The prose itself — draft lines {{span}}

{{quoted}}

## The question

{{question}}

## How to answer

Return one JSON object:

    {"verdict": "holds" | "fails" | "cannot-decide", "reason": "one sentence"}

- **`holds`** — the pair agrees.
- **`fails`** — it does not. Say in one sentence what does not agree.
- **`cannot-decide`** — you cannot tell from what is above. This is a real
  answer and it is never rounded to either neighbour; it is listed with its
  pair so a person can look.

**One sentence, and no digits in it.** Write any number as a word. Line numbers
are the Harness's and are already rendered above; every other number in a
review is a score, and this comparison has none.

Record it with:

    {{record_command}}
