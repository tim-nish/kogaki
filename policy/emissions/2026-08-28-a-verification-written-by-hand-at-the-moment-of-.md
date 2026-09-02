<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-28
repo: Kogaki
grain: lesson

## Trigger — what happened

One issue shipped the same defect three times. A machine-readable grammar declared the shape of each rendered line; a class whose declared form could not match any line it was supposed to describe was therefore covering nothing, and the surface's own fallback rule was inert, so a class matching nothing was invisible to a fully green suite. Occurrence one: a form carrying a literal escape sequence that no rendered line begins with. Occurrence two: the repair moved that form into a per-line array notation whose members are escaped whole, so placeholders and alternations in them matched nothing either — and it silently broke a neighbouring class that had been matching. Occurrence three: a third class's array held literal text that the same change had rewritten in the emitter, so the declaration and the rendering drifted apart. Each was found by a reviewer reading the two files side by side. After the second, the session verified its repair by running the matcher against sample lines in a one-off shell command, reported that all classes matched, and shipped the third occurrence in the same commit.

## The learning

A repair verified at the moment of repair is verified against the author's current understanding, which is the thing that was just wrong. The one-off check is run with the failure fresh in mind, over the cases the failure suggested, and it passes — so it produces the feeling of coverage and none of the substance, because it does not run again when the next edit moves the thing it checked. Worse, it consumes the attention that would otherwise notice the absence of a real case: having checked, nobody asks why the suite could not. The tell is a claim in a commit message or a review reply that takes the form 'verified that X' with no artifact a later run executes; the corresponding real act is adding the case and letting it fail once. Two properties make this specific instance recur rather than being a slip. The verification target was a MATCHING relation between two files, and a matching relation has no natural home in either — each file is internally consistent while the pair is broken, so neither file's own tests are the place it would fail. And the enclosing system had a fallback that admitted anything, which converts a broken relation from a loud failure into silence; a check family whose refusal is inert does not merely fail to catch this class, it makes the class invisible to every future reader who trusts the green run. The rider is about the case you finally write: it can carry the same defect one level in. The case written here filtered out the permissive classes using a list transcribed from a prose note in the grammar; the note said three and there were four, so nothing was ever filtered to empty and the case passed its own mutation. Computing that set from the grammar — a class is permissive exactly when it matches an arbitrary sentinel — is what turned it from an assertion about the grammar into a reading of it. Any case whose correctness depends on an enumeration somebody maintains inherits the maintenance failure it was written to catch.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
