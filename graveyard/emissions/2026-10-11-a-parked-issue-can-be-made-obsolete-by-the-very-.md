<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-11
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#779 was parked on 2026-09-02 behind the Rules kind landing, with a design for deploying a Rule into a consumer as a JSON contract, a consumer adapter and a kit check. The trigger fired on 2026-09-05, but the owner ruling that accompanied the Rules kind settled that a consumer reaches policy only through consultation and selects no Rule itself, which removed the subject of the parked design. The issue was discharged on 2026-10-11 with zero runs.

## The learning

When an issue is parked behind a future change, the change can land in a shape that supersedes the parked design rather than enabling it. Unparking is therefore not the automatic act when the trigger fires: first read what actually landed against what the body assumed, and discharge when the assumption is gone. A park should be re-read at the trigger, not just released.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
