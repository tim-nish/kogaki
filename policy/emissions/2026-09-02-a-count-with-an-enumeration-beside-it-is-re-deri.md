<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-02
repo: Kogaki
grain: lesson

## Trigger — what happened

A change repointed every reference to a file it was deleting. A review round found one reference the sweep had counted but the repointing had skipped, and — worse — found that the record describing the work claimed that reference among those already repointed. The correction repointed the missed file, rewrote the claim, and added a paragraph explaining that the count had been written from the sweep rather than from the diff. The next review round found that the corrected headline number was itself wrong: the missed file had always been inside the original count, so repointing it made the two figures agree rather than raising either, and the enumeration printed three lines below the headline still summed to the original number. The wrong figure had propagated to three files. It had been introduced one commit after the paragraph confessing the earlier miscount, in that same paragraph.

## The learning

Counts in prose come in two shapes and only one of them is safe. A bare figure is an assertion nobody can check without redoing the work. A figure with its enumeration printed beside it is evidence — and the moment both exist, the figure stops being something you edit and becomes something you re-derive by reading the list. Editing it is guessing at a sum that is sitting right there.

The failure mode is specific and it is not carelessness about arithmetic. It is that a change to the world gets translated into a change to the number without going back through the list. Here the translation was 'one more file repointed, so one more referrer' — a plausible sentence that is false, because the file was already a member of the set being counted; what changed was its state, not the membership. Any edit to a count is really a claim about set membership, and membership questions are answered by the enumeration and by nothing else.

What makes this worth naming rather than filing as a slip is where it landed. The wrong number was introduced into the paragraph whose entire subject was a previous wrong number, one commit after that confession was written. Writing about a failure produces a strong feeling of having handled it, and that feeling is at its peak exactly while you are still editing the same paragraph — so the confession does not protect the text it sits in. If anything it does the opposite: the passage now looks maintained, so it invites less scrutiny than a passage nobody has touched.

The practical rule is small enough to follow every time. Never edit a count that has an enumeration near it; re-read the enumeration and write down what it sums to. Where the two disagree, the enumeration wins, because it is the evidence and the headline is a summary of it. And treat a paragraph that discusses its own accuracy as higher-risk than an ordinary one rather than lower — it is the passage most likely to be edited under the impression that its problem has already been solved.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
