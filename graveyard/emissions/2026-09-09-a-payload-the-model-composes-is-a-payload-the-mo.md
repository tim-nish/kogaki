<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1028: with a gate open, the session called two MCP tools, wrote a file, declined to render the gate, and answered the typed question by calling ListAgents. The gate existed as a declaration on disk plus an instruction in prose, and nothing refused any of it.

## The learning

A gate is an interval, not a message, and the interval needs three closures rather than one. Denying other tool calls still lets the session say something and stop, which ends the gate unrendered by another route; blocking the turn's end still lets it do twenty other things first; and both together still let a typed prompt stand in for the answer, which makes the record the model's transcription of the owner rather than the owner's own act. The enabling move underneath all three is that the payload stops being composed at render time and becomes an artifact the harness wrote and can compare byte-for-byte -- an instruction to render something as declared is checkable by nobody, while a file on disk is checkable by a hook. Two boundary conditions travel with it. First, the deny's polarity is the opposite of a prohibition's: a guard that holds a session inside an interval must fail OPEN, because a bug that fails closed denies every tool with no way to type the fix, whereas a guard closing a route to an act that must never happen fails closed. Second, extending the deterministic half by one step forces a decision the prose had left to judgment -- here, that the host's question tool requires two options where seven of eight declared gates offer one -- and that decision surfaces as an owner ruling at the moment of building rather than as a silent composition at every render.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
