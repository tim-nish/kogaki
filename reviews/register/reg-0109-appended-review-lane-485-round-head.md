---
id: reg-0109
status: pending
observed_at_pr: 485
observed_at_head: e708390daa9fe429f1a3d1976b1140771add0e09
class:
recorded: 2026-08-16
source_comment: 5308127129
---
Appended by the review lane, PR #485 round 1 (head `e708390daa9fe429f1a3d1976b1140771add0e09`).

**instance-class** (row kind declared per kogaki#374 — these two are the defect they name, not a count, and rule 3's three-of-a-class widening trigger does not read them):

1. `specs/spec-terrain/SPEC.md:2762` — the §11 `projects:`-as-fourth-substrate deferral declares "**Its trigger is §13.5's dogfooding gate** — a recorded miss whose Grain shares only `projects:` with the candidate set". PR #485 demoted that miss arm to one of two and unfired; the citing clause still names it unqualified as *the* trigger. Repair is one clause at the citing site (name the arm), not a re-decision.
2. `specs/spec-terrain/SPEC.md` §13.5 as landed at #485 — the section names a live entry arm ("this section re-points which arm *could* admit one") and in the next sentence declares "**none may arrive through this slot**". kogaki#481's triage explicitly declined closing the gate outright ("exceeds the ratified hub verdict, which demoted the arm and did not close the gate"), so the two readings are on the section's face.

**accretion-class** (rule 1's `out-of-dimension:` kind — value is the count):

`out-of-dimension:` PR #485 — `checks/check-boundary-receipts.sh` matched consultation-map entry 1 (Check/CI infrastructure) on the term `suite` occurring in the commit message's *provenance prose* ("suite green"), on a diff whose only changed path is a spec file. The matcher reads changed text including commit messages, so a sitting narrating its own verification fires a boundary whose act class (admitting, modifying or retiring a check, hook or CI surface) is not engaged. Counting the class rather than repairing it here.
