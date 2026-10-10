<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-30
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1229's implement worker was killed 92 seconds in, stamped verification-refused, after one refused Bash call: a python3 -c one-liner that parsed src/leg-schema.json. Two seconds later the worker read the same file with the Read tool and carried on; the poll stopped it anyway with recovered=0 standing=1.

## The learning

The refusal grader in issue-sync's worker store only credits a cross-tool recovery when the refused call has a read or write CLASS. A Bash command whose first word is python3 (or node, or anything outside the grep/cat/sed/head/tail/ls/find/wc set) has class None, so it can only be recovered by another Bash call with an identical target, and its target is the whole quoted script text because no operand exists on disk. The worker's admitted Read of the very file the script opened therefore counts for nothing, and with no commit since dispatch one standing refusal is enough to stop the cell. Two remedies: teach the allow list python3 -c so the refusal never happens, or teach the grader to read the paths a python3 -c / node -e script opens as its target and grade it read-class.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
