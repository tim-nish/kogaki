<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-02
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1120, 2026-10-02: the Issue carried 'consult: receipt: kogaki@6154165… specs/spec-client-kit/SPEC.md:913'. The implementer supervisor copied it into a commit as 'consulted: kogaki@6154165…' with the file and line dropped. The worker's own change was complete, but the suite refused the head on the two receipt checks (malformed receipt, and a mapped boundary with no valid receipt), so the run ended suite-failed.

## The learning

The supervisor step that copies an Issue's consult receipts into a commit reads only the first word after 'receipt:'. That is enough for the newer single-word receipt form, but the older form is a repository pin followed by a file and line, and copying only the pin produces a receipt the checks reject. An Issue whose receipt uses the older form therefore gets a red suite no matter how good the implementation is, and the fault looks like the worker's. The copy should keep the whole rest of the line, or admission should refuse the older form before a worker is paid for.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
