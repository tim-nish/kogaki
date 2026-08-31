---
id: reg-0040
status: pending
observed_at_pr: 363
observed_at_head: 3b8bd72
class: out-of-dimension
recorded: 2026-08-11
source_comment: 5255699374
---
out-of-dimension: three consecutive amendments to `specs/spec-terrain/SPEC.md` each shipped a file-wide assertion contradicted elsewhere in the same file — PR #363 (v15's self-contradiction across ~110 lines), PR #364 (a quotation altered inside the paragraph correcting altered quotations), and PR #366 (v16's `**deferred slots: none.** §13.3 held the last one.` at `:28`, while §14.6 carries an explicitly unfilled `deferred-slot: terrain-display-id-for-neighborhood-suggestions` that §13.7 says "comes due here"). The class: **an amendment declares a whole-file state from a search the amendment itself scoped.** Each author checked — #366's PR body says it checked "across the whole file, not just the head", found the `v16` token collision it was looking for, and missed the slot it was not. The instrument this points at is mechanical rather than judgment: a check comparing each `deferred slots:` declaration in a spec's Status block against that file's own live `deferred-slot:` tokens. Observed on PR #366, review round 1, head `3b8bd72`; report at https://github.com/tim-nish/kogaki/pull/366#issuecomment-5255692822.

Also carried here from that report: `finding: nit` — the v16 Status block and the §13.5 edit each leave orphaned one-word wrap lines (`:16-18`, `:3772-3773`), residue of the line-length pass whose measurement the PR body records as having been wrong all session. Accretion class; the count across amendments to this file is the value, not the instance.
