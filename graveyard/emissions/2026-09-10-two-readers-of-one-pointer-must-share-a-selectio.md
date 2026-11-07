<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1081 added a second reader of the open-gate pointer directory: an advance hook that delivers a gate's payload to the session, beside a PreToolUse hook that denies every act whose payload does not equal the file that same directory names. The first cut chose its pointer by newest opened_at while the sibling chose the first in filename order, and defended the divergence on the ground that a wrong choice would merely be refused at the equality check. Review round 1 showed the refusal is not harmless: a session sending the delivered bytes byte-for-byte is then denied for sending the wrong question, with no admissible act left, which is the wedge the delivery exists to close.

## The learning

Where one artifact is read by an act that OFFERS something and by an act that JUDGES what was offered, the two must select the same instance by the same key, not merely apply the same filters. Filters agreeing while ordering differs produces the worst failure available: the offered thing is correct by construction and refused anyway, and the refusal names the offer rather than the disagreement. The check is not 'do both readers drop the same rows' but 'given the same set, do both name the same row' — and where the two readers narrow the set differently (one by session, one by run), the claim of agreement must be scoped in words to the axis where it actually holds rather than stated whole.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
