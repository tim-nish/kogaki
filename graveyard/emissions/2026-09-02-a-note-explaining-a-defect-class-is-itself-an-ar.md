<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-02
repo: Kogaki
grain: lesson

## Trigger — what happened

A change added an obligation to a runtime and, in the same pass, found three places where an assertion had stopped discriminating because a second check was absorbing the failure. The author wrote all three up in a durable note whose stated purpose was to teach that class to later readers. A reviewer then read the note against the code and found it described the wrong mechanism: it said the second check fired first, so the assertion never reached its subject, when in fact the original check ran first and worked correctly, and the second one only caught the fall once the first was deliberately deleted. The conclusion the note drew was right and its diagnosis was wrong. Those are different shapes — one means the case was dead all along, the other means the case was live until something was removed — and only the second explains why nobody had noticed. A reader hunting the shape the note described would not have recognised the instance the note was written about.

## The learning

Explanatory notes get written at a specific moment: right after the fix, while the author is most confident and the material has had the least exposure. That is the same moment a specification written alongside its implementation is most likely to describe the intent rather than the behaviour. The note is not a summary of the investigation; it is a fresh claim about the code, made without rerunning the investigation, and it inherits none of the checking the fix itself received. The fix was tested. The sentence about the fix was not.

The failure has a particular flavour when the note is about a defect class, because the note is then an instance of the population it describes and can exhibit the very property it warns about. A paragraph explaining that an assertion failed to discriminate can itself fail to discriminate between two mechanisms. This is not merely ironic — it is predictable, because the same compression that produced the imprecise assertion produces the imprecise sentence, and the author has no more reason to slow down for the second than they did for the first.

What makes it durable is that the wrong diagnosis is more legible than the right one. 'The guard never fired' is a cleaner story than 'the guard fired correctly until the mutation removed its predecessor', and cleaner stories survive editing. Once such a note lands it reads as a supported account, and the next reader inherits a search pattern that will not match the next instance.

The practical remedy is cheap and specific: a claim about the order in which guards run is a claim about the code, so read the code and state the order, rather than reconstructing it from the shape of the failure you just observed. Where the observation came from a mutation, say which facts hold in the unmutated path and which appear only under the mutation — that single distinction is what carries the teaching, and it is exactly the clause a fluent summary drops. And treat a note explaining a class as owing the same verification as the fix, since it will outlive the fix and be read by people who cannot check it against a memory they never had.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
