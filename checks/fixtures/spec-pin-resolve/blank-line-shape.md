# Fixture: a quotation a blank line above its pointer

Constructs the corpus's dominant citation shape — quote / blank line / pin —
with a wrong pointer, so the window's blank-skip is exercised by a fixture
rather than assumed (PR #586 round 1, finding 4: no fixture varied the
quote–pointer distance, so any window width passed the original three).

"this quoted sentence sits a blank line above its pointer and is at no line of the target"

checks/check-spec-pin-resolve.sh:1
