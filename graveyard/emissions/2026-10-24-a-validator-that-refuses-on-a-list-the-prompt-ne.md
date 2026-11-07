<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

The Goal 1 two-Leg Proof Sheet (run leg-run-2026-10-23T17-04-29-141Z, --reuse the 4-Leg run --from brief --legs 2) stopped once in the Leg Brief composer on Leg 2 after its three attempts and completed on a resume. In both the stopped and the resumed composition, and in the earlier 4-Leg run's Leg 4, the FIRST attempt on a later Leg was refused for reusing the id leg-1 that an earlier Leg already carries. The composer validates the id against taken_leg_ids, but that list is never rendered into the composer's prompt, so the model cannot know which ids are taken and spends one of its three attempts finding out. The remaining two attempts then have to clear two further word-level rules (a Claim word absent from the Segment content, a Claim word the Waypoint point drops), and in the stopped run the third attempt was the first to see the new Claim-to-point validator (kogaki#1547).

## The learning

When a stage refuses an answer against a fact the stage holds but the prompt does not show, every first attempt that trips it is a lost attempt by construction, not a model slip: the model is being asked to guess a value the harness already knows. A fixed attempt bound then counts that guess against the real work. Either render the fact into the prompt (here: the ids the earlier Legs carry, as a list the composer must not reuse) or do not spend an attempt on a refusal the model had no way to avoid. Observed three times out of three on later Legs of multi-Leg Proof Sheet runs.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
