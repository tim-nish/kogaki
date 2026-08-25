# Fixture: a HEADING anchor (kogaki#635, §3.1's heading exclusion)

This file exists to FAIL. §3.1 excludes headings and § numbers as anchors
because both renumber — anchoring to one reproduces, one level up, the very
instability the anchor form removes.

  `specs/SPEC.md::### 3.1 A cross-artifact pointer addresses an anchor, never a line number`

The anchor above resolves exactly once today and must STILL be refused: this is
the direction a proposer fails into, because a heading is the most distinctive
line in its neighbourhood and therefore the first unique literal any search
returns. The migration that introduced this form violated the rule thirteen
times before it had a carrier.
