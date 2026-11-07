<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-30
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#708 minted a check that greps a retired vocabulary and fails on a survivor. In one sitting the member read green three separate times while being wrong, and each was caught only from outside the artifact that owned the property. Its scan exempted three lines because unrelated prose nearby quoted the marker token, and only an assert-by-breaking COUNT that came out 14 instead of 11 exposed it. Its removal probe could never fire, because it grepped a directory containing its own admission record, which quotes the vocabulary it guards; a review round found that. And when the probe was then broken outright by prose written into the executable field, the parse error returned exit 1 on the authoring machine, which the registry check reads as the legitimate 'condition not present', while CI's bash returned 2 and failed the run.

## The learning

A guard that passes can be passing for a reason unrelated to the property it asserts, and the three shapes this produced are worth telling apart because each needs a different vantage to see. FIRST, EXEMPTION BY PROXIMITY: any allow-marker matched by nearness rather than by reference will sooner or later exempt something it was never written about, so the count of what a guard exempts must be checked against the count of exemptions deliberately placed - equality is the assertion, and the numbers diverging is the only cheap signal. SECOND, A GUARD WHOSE SCOPE INCLUDES ITS OWN RECORD: an instrument that scans a tree containing its own admission or configuration will match the vocabulary that record must quote to describe the instrument, and the resulting condition is unsatisfiable by construction rather than merely unmet - which reads identically to 'not yet' at every surface. Repairing one instance of this is not repairing the class: the same defect was fixed in the scanner and shipped twelve lines away in the probe, because the repair was applied where it was found rather than to every consumer of the same scope. THIRD, AN EXIT CODE CARRYING TWO MEANINGS: a probe that can fail to RUN and can legitimately report NOT-YET needs those distinguished at the producer, because a shell parse error's exit status is not portable - 1 on one machine, 2 on another - so a broken instrument was indistinguishable from a working one reporting a true negative, and the local suite was green by luck. The practical rule is that a field which is EXECUTED carries executable content and nothing else, with its prose in a neighbouring field, and that it is verified by running it rather than by reading what it returned. Underneath all three: the more elaborate the evidence an artifact carries about its own rigour, the more places it has to be right, and the writing-up of that evidence is itself an edit that can break it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
