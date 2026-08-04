# Kogaki — operating rules

Policy questions go to the **tsurezure-gateway tool before AskUserQuestion**.
A proposal touching a boundary listed in `policy/consultation-map.md`
consults **before acting** — the map's entries name the occasions; the
answers live in the substrate, never in this repo.

**Seam contract.** The gateway is read-only and this repo holds **no write
path to the policy hub** — insights are staged as proposals through the
hub's own intake, never written directly. Every served quote carries its
pin (`file:line@commit`). The substrate is an enhancer, never a dependency:
an **unreachable gateway is not a config error** — log exactly one
degradation line, then proceed without policy interaction. The presence
toggle lives in `config/kogaki.yaml` (`policy_source.enabled`), presence
only — no path; the gateway owns the hub location.

**Wiring (machine-local, not committed).** The MCP server is registered
per-project in the operator's Claude config:
`node <tsurezure-gateway>/dist/index.js --consumer kogaki`. The absolute
path is a machine fact and stays out of this public repository
deliberately; this paragraph is the committed half of the wiring.

**Issue-first.** Implementation work begins only after its Issue exists.
Issues are filed through the typed path (`story-sync file-issue`), carry
their policy pins, and are re-checked against the served surface at pickup.

**Boundary.** Repositories are invisible to Kogaki — article material is
quoted from served renderings at pins (`specs/SPEC.md` §2). Kogaki
guarantees citations; the substrate guarantees facts.
