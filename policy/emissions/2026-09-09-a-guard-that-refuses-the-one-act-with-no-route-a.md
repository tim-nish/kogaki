<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1063: a PreToolUse deny matched a file's bare name anywhere in a shell command, and a separate rule required every Issue to declare its file footprint with no opt-out. An Issue whose work was in that file could not be admitted at all -- the footprint cell naming the path was refused as though it were an invocation, and omitting it was refused as an undeclared footprint. The deny's own message told readers to route around it by reading the file instead, which named the two cheap costs it had priced in (a comment, a grep) and missed the one that had no route.

## The learning

When a text-matching guard accepts over-refusal, price it against the acts that MUST name the thing, not the acts that merely mention it. A mention has alternatives -- read the file, rephrase the comment -- so refusing one costs a detour. A typed declaration has one spelling and no substitute, so refusing it costs the act entirely, and if a second rule also requires that act, the two carriers deadlock and the work becomes unreachable rather than inconvenient. The test at design time is not 'how often will this over-refuse?' but 'is there an act inside the match that has no other spelling?'. The repair is usually available and is a narrowing rather than a loosening: anchor on the SHAPE of the act being prohibited -- here, the path standing in command position -- instead of on a token that appears in both the act and its description. Naming is not doing, and a guard that cannot tell them apart will eventually refuse the only way to say what it is guarding.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
