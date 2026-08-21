# Fixture: an accurate quote over a pointer to different text

Constructs kogaki#583 instances 1 and 2 — the defect class of PR #580 round 1:
the quotation is accurate somewhere, the pointer resolves cleanly, and the two
never met. The resolver must refuse the pair, not the quote and not the
pointer alone.

"this sentence is quoted verbatim and appears at no line of the pointed-to file"
checks/check-spec-pin-resolve.sh:1
