# Fixture: a DUPLICATE anchor (kogaki#635, acceptance item 2, direction 2)

This file exists to FAIL. Its anchor names a token the target contains more
than once, so the pointer identifies nothing: a citation resolving to whichever
copy is found first is not a binding, which is why presence is not the test and
uniqueness is.

  `checks/fixtures/anchor-resolve/duplicate-anchor.md::this line appears twice`

this line appears twice
this line appears twice

The anchor above must be refused as DUPLICATE. A check refusing only the
dangling direction would pass an ambiguous pointer, which is the defect the
exactly-once rule exists to remove.
