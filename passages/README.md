# passages/

An exceptional utility, not a live route. `FORMAT.md` is the interaction
contract that turns one hand-selected Passage of published prose into one
Analysis; a private, temporary Corpus of such Analyses is the evidence from
which a Move schema is derived (kogaki#1173, #1175). The Corpus itself is
never stored here and is deleted after the schema is settled, because each
Analysis carries copyrighted source text verbatim. This directory keeps only
the contract and this note, so the exercise can be repeated if a later
schema question needs it.

`DERIVATION.md` is the counterpart format: handed to a model together with
the whole Corpus (never the individual Passages) and returns a Move-schema
proposal. It is run by `tools/derive_schema.py <corpus_dir> --model <id>
--out <run_dir>`, which counts and strips the Corpus, spawns the model once,
checks the two files it writes against the bounds `DERIVATION.md` states,
and posts the owner-facing `questions.md` on the Issue that asked for the
run.

`FIGURE.md` is the companion prompt for a Passage that refers to a figure:
it recovers the figure's structure and encoding as a Figure spec, from
which a different figure of the same shape can be drawn, and stores no
image. Scope is conceptual explanatory figures; maps and statistical charts
are data, not form, and are outside it.
