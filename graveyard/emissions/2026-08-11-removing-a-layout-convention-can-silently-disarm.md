<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

A screen used indentation to show which claim belonged to which group. Wrapped lines destroyed it, so we replaced indentation with explicit IDs and moved every line flush left. A separate rule said 'refuse any line the format does not describe'. One of the described line kinds was 'free-form prose from the composer', and its only definition had been 'a line indented six spaces'. Flush left, that kind now matched every line, so the refuse-the-undescribed rule could never fire again. The change was presented as presentation-only and its preview showed nothing about this. It surfaced when a test that had been passing stopped.

## The learning

A formatting convention is often doing double duty: it is how the thing looks, and it is also what some rule elsewhere quietly uses to tell one kind of line from another. Remove the convention and the appearance changes on purpose while the rule loses its discriminator by accident, and the rule does not fail loudly — it keeps running and stops finding anything, which reads exactly like a clean result. Before changing a layout convention, search for what else keys on it, and include what those things lose in the description of the change; a preview showing only the new appearance is not a description of the change. The tell to look for afterwards is a rule that still runs and now never fires. Two second-order notes worth keeping. The fix is usually to give the ambiguous kind a small explicit marker, which restores the distinction without restoring the layout — but that is a new appearance decision and belongs back in front of whoever ruled on the appearance, not invented by the person who tripped over it. And a rule whose discriminator was never written down as a requirement was already fragile: it survived on a side effect, so the loss exposes an older gap rather than creating a new one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
