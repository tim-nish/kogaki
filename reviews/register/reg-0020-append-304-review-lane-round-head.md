---
id: reg-0020
status: pending
observed_at_pr: 304
observed_at_head: e59904b4
class:
recorded: 2026-08-08
source_comment: 5226974494
---
## Append from PR #304 (review-lane round 1, head `e59904b4`)

Two accretion-class findings whose `carried: register` disposition this append makes real — clause 8 reads the presence of the line and never whether the carrier holds anything, so an unfiled carry is indistinguishable at the gate from a filed one.

- **Pins cited but not quoted at their pin, in normative spec text.** `specs/spec-terrain/SPEC.md` §13.3 v14 declines the surfacing-threshold alternative on `LESSONS.md:134`, paraphrased, in the same paragraph where `LESSONS.md:47` is quoted whole above its pin. Both are receipted by the commit (`LESSONS.md:47,134`); only one is transcribed. The value is the count of cited-but-unquoted pins across the spec files, not this instance.
- **Story frontmatter title encoding diverges, and the tool writes it.** 1.44's title was re-encoded to a \u2014 escape by `story-sync publish` while 1.45's kept a literal em dash. Identical under a YAML parser, different under any non-YAML frontmatter read. Corpus now stands at 11 literal / 6 escaped.
