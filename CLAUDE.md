# Kogaki — operating rules

The policy seam is provided by the **tsurezure client kit** — the managed
block below is its contract, installed and refreshed by
`client-kit/install.sh` (in the gateway repo); the wiring itself is
machine-local and never committed. The consumer package lives under
`policy/` (kogaki#3).

**Issue-first.** Implementation work begins only after its Issue exists.
Issues are filed through the typed path (`story-sync file-issue`), carry
their policy pins, and are re-checked against the served surface at pickup.

**Boundary.** Repositories are invisible to Kogaki — article material is
quoted from served renderings at pins (`specs/SPEC.md` §2). Kogaki
guarantees citations; the substrate guarantees facts.

<!-- tsurezure-client-kit:begin (managed block — edits here are overwritten by install.sh) -->
## Policy seam (tsurezure client kit)

Policy questions go to the **tsurezure gateway tool before AskUserQuestion**;
a proposal touching a mapped boundary consults **before acting**. The
gateway is **read-only** — insights are staged as proposals through the
hub's own intake, never written directly — and the substrate is an enhancer,
never a dependency. Issues carry their **policy pins** at authoring
(`client-kit/bin/issue-pins.mjs --validate-body`) and are re-checked at
pickup (`--recheck`) — a moved pin refuses with the delta.

The consumer package lives in `policy/`: served tools and degradation
routing in `policy/CAPABILITIES.md`, consultation occasions in
`policy/consultation-map.md`, presence toggle in `policy/source.yaml`.
`skills/consult-first.md` (in the kit) carries the discipline.
<!-- tsurezure-client-kit:end -->
