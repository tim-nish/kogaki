<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A check was added that refuses internal jargon on a document people read directly. It scans every line. Separately, and earlier the same day, that document started carrying prose fetched from another system rather than written locally. So the check now inspects text its authors never wrote, and can reject a document because of a word that arrived from outside — after the person has already answered the one question they were asked, spending it.

## The learning

When you install a guard over a whole artifact, you are binding it to whatever that artifact will contain later, not to what it contains now. The guard's purpose was to catch OUR jargon; its reach is anything shaped like jargon. Those coincide only while every word in the artifact is locally authored, and that stops being true the moment the artifact starts carrying imported material - which is a change nobody makes while thinking about the guard. What makes this expensive is where the refusal lands: the guard fires at the last step, after the irreversible or costly part is done, so the failure consumes the person's input and gives back nothing. The check to run when installing a guard is not just what it catches but whose text it will be reading in six months, and whether it can tell one from the other. Shape-based tests cannot: they read form, not provenance. So either bind the guard to the fields you actually author, or move the refusal earlier than the point of no return, or convert it to something the person can see and overrule. Choosing among those is a real decision and it is cheapest to make before the first person loses an answer to it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
