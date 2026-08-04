# Kogaki — operating rules

The policy seam is provided by the **tsurezure client kit** — the managed
block below is its contract, installed and refreshed by
`client-kit/install.sh` (in the gateway repo); the wiring itself is
machine-local and never committed. Kogaki's presence toggle lives in
`config/kogaki.yaml`.

**Issue-first.** Implementation work begins only after its Issue exists.
Issues are filed through the typed path (`story-sync file-issue`), carry
their policy pins, and are re-checked against the served surface at pickup.

**Boundary.** Repositories are invisible to Kogaki — article material is
quoted from served renderings at pins (`specs/SPEC.md` §2). Kogaki
guarantees citations; the substrate guarantees facts.

<!-- tsurezure-client-kit:begin (managed block — edits here are overwritten by install.sh) -->
## Policy seam (tsurezure client kit)

Policy questions go to the **tsurezure gateway tool before AskUserQuestion**.
A proposal touching a boundary listed in `policy/consultation-map.md`
consults **before acting**; the map names the occasions, the substrate holds
the answers. See `CAPABILITIES.md` for the served tools and
`skills/consult-first.md` (in the kit) for the discipline.

The gateway is **read-only**; this repo holds no write path to the policy
hub — insights are staged as proposals through the hub's own intake. Every
served quote carries its pin (`file:line@commit`). The substrate is an
enhancer, never a dependency: an **unreachable gateway is not a config
error** — one logged `policy_source unavailable:` line, then proceed without
policy interaction. The presence toggle is a config declaration
(`policy_source.enabled`), presence only — no path; the gateway owns the hub
location.

Issues carry their **policy pins** at authoring
(`client-kit/bin/issue-pins.mjs --validate-body`), and are re-checked at
pickup (`--recheck`) — a moved pin refuses with the delta.
<!-- tsurezure-client-kit:end -->
