# Fixture: a DANGLING anchor (kogaki#635, acceptance item 2, direction 1)

This file exists to FAIL. It carries an anchor whose token the target does not
contain, which is the state a stale pointer reaches when the text it named is
edited away. Under the retired line-number form this was the invisible case:
the line still existed, so nothing could tell a right pointer from a wrong one.

  `checks/registry.json::a token this registry does not contain anywhere at all`

The anchor above must be refused as DANGLING. If it ever resolves, the fixture
has stopped asserting and the check's first refusing direction is unguarded.
