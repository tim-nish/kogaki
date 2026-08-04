<!-- tsurezure-client-kit:begin (managed block — edits here are overwritten by install.sh) -->
## Policy seam (tsurezure client kit)

Policy questions go to the **tsurezure gateway tool before AskUserQuestion**;
a proposal touching a mapped boundary consults **before acting**. The
gateway is **read-only** — insights are staged as proposals through the
hub's own intake, never written directly — and the substrate is an enhancer,
never a dependency. Issues carry their **policy pins** at authoring
(`policy/kit/bin/issue-pins.mjs --validate-body`) and are re-checked at
pickup (`--recheck`) — a moved pin refuses with the delta.

The consumer package lives in `policy/`: served tools and degradation
routing in `policy/CAPABILITIES.md`, consultation occasions in
`policy/consultation-map.md`, presence toggle in `policy/source.yaml`, and
the kit itself in `policy/kit/`. The discipline loads as a harness skill
from `.claude/skills/consult-first/`.

The gateway's location is **machine-local configuration** — `--gateway`,
`$TSUREZURE_GATEWAY_JS`, or the MCP registration — never a committed path
and never directory adjacency.
<!-- tsurezure-client-kit:end -->
