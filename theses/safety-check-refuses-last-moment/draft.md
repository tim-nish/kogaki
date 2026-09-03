---
brief: brief.md
brief_pin: sha256:e95e14ba29f8801fec0b30759d1c6da67e60868e96ef828deb2a5d4254e98c65
survey_pin: product-lab@4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d
generated_by: {"at":"2026-08-31T13:00:48.861Z","by":"draft/draft.mjs (story 1.80, kogaki#587)","brief_sha":"163b1a4fedd118e76824dac67b3808cf95b35d839b67c85663a5fadbf50bb9ae"}
cites:
  - {"strand":"L148","slug":"force-the-missing-axis-at-the-acts-own-trigger","kind":"cite","cite":"gloss/ELEMENTS.jsonl slug=force-the-missing-axis-at-the-acts-own-trigger kind=lesson @4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d"}
  - {"strand":"L96","slug":"authenticate-facts-mechanically-gate-judgments","kind":"cite","cite":"gloss/ELEMENTS.jsonl slug=authenticate-facts-mechanically-gate-judgments kind=lesson @4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d"}
  - {"strand":"L96","slug":"authenticate-facts-mechanically-gate-judgments","kind":"journey cite","cite":"gloss/ELEMENTS.jsonl slug=authenticate-facts-mechanically-gate-judgments kind=journey @4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d"}
  - {"strand":"L32","slug":"a-gate-failing-after-ratification-bills-the-scarcest-input","kind":"cite","cite":"gloss/ELEMENTS.jsonl slug=a-gate-failing-after-ratification-bills-the-scarcest-input kind=lesson @4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d"}
  - {"strand":"L31","slug":"a-gate-enforces-only-what-its-arguments-name","kind":"cite","cite":"gloss/ELEMENTS.jsonl slug=a-gate-enforces-only-what-its-arguments-name kind=lesson @4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d"}
  - {"strand":"L31","slug":"a-gate-enforces-only-what-its-arguments-name","kind":"journey cite","cite":"gloss/ELEMENTS.jsonl slug=a-gate-enforces-only-what-its-arguments-name kind=journey @4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d"}
  - {"strand":"L7","slug":"a-carrier-is-not-installed-until-its-inputs-have-writers","kind":"cite","cite":"gloss/ELEMENTS.jsonl slug=a-carrier-is-not-installed-until-its-inputs-have-writers kind=lesson @4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d"}
  - {"strand":"L7","slug":"a-carrier-is-not-installed-until-its-inputs-have-writers","kind":"journey cite","cite":"gloss/ELEMENTS.jsonl slug=a-carrier-is-not-installed-until-its-inputs-have-writers kind=journey @4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d"}
  - {"strand":"L173","slug":"order-self-revoking-steps-by-restriction","kind":"cite","cite":"gloss/ELEMENTS.jsonl slug=order-self-revoking-steps-by-restriction kind=lesson @4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d"}
  - {"strand":"L173","slug":"order-self-revoking-steps-by-restriction","kind":"journey cite","cite":"gloss/ELEMENTS.jsonl slug=order-self-revoking-steps-by-restriction kind=journey @4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d"}
trace:
  - {"step_id":"c1","section":1,"section_title":"Four questions to ask while you are installing a check"}
  - {"step_id":"c2","section":2,"section_title":"Whether the check can fire, and what kind it is"}
  - {"step_id":"c3","section":2,"section_title":"Whether the check can fire, and what kind it is"}
  - {"step_id":"c4","section":3,"section_title":"Where the refusal sits in the process"}
  - {"step_id":"c5","section":3,"section_title":"Where the refusal sits in the process"}
---

## Four questions to ask while you are installing a check

There is a familiar way to finish an article about a class of defect. You read it, you recognise the shape, and you expect to recognise the shape again when it turns up in your own work. That expectation is the thing this article is written against, and it is worth saying so before anything else, because if it holds then everything after this paragraph is decoration.

It does not hold. People concentrating on a task ask questions along the line they are already following. Asking them to be more careful does not move that line — it asks the line to move itself, using the attention that is already committed elsewhere. The person installing a check is concentrating on the rule the check enforces. That is the line they are following, and it is a good line. It simply does not pass through any of the places where checks fail.

The disciplines that have solved this did not solve it by raising the standard of attention. Industrial hazard studies apply a short fixed set of prompts — about seven of them — at every step of a process, whether or not the step looks like it needs them. Aviation checklists are triggered by the action rather than by the subject: the checklist runs because you are about to do the thing, not because you judged that this instance warranted a checklist. Both methods work by attaching a small number of questions to a moment. Neither works by asking anyone to think harder.

Two properties of those sets matter more than their contents. The set is small, and it is triggered by the act. A long set gets skipped under pressure, and a set triggered by your own judgment that this case is risky has been triggered by exactly the attention it was supposed to replace.

So here is the set this article argues for, stated before the argument, so you can carry it away now and let the rest of the article earn it:

Can this check actually fire? Not whether it is correct — whether there is any occasion on which it runs, reads what it needs, and can see the thing it is deciding about.

Is this a fact the acting code can compute, or a judgment nobody has made yet? The two have different homes, and putting either in the other's home fails in a way you can recognise on sight.

Whose effort does this refusal spend? A refusal costs something, and what it costs depends entirely on where in the process it happens.

Does any earlier step revoke something a later step still needs? This one is not about a check at all. It is about the sequence the checks sit in.

Four questions, and one rule for growing the list: add to it only when something that was genuinely available got missed. Not when a new kind of failure is imagined, and not when a near-miss makes the list feel thin. The value of a short list is that it gets asked, and every addition is paid for out of that.

The rest of this article is the case for each question — where it came from, what it caught, and why the shorter version of it does not work. If you stop reading here you have the practice. What follows is why you should trust it.

## Whether the check can fire, and what kind it is

The first question looks like the weakest of the four. It reads as a formality — of course the check runs, it was merged, there is a configuration entry naming its file. That reading is the reason the question is on the list, and the reason it has to be fanned out into its separate routes rather than asked once. A single yes-or-no gets answered once, confidently, from the surface evidence, and then never asked again.

There are at least three different ways for the answer to be no, and they do not look alike.

The first is that the check has no occasion. A team had spent a long time fixing the same two bugs — twelve times, each time by adding a check at the outermost edge of their own code, and each time the bug came back. It kept coming back because it was happening one layer further out, in a place their code never touched. So the thirteenth attempt moved the check out to that layer, into a hook the surrounding tool provides. That was the right diagnosis and the right layer. It merged. The next day the owner hit the identical bug.

The hook was reading three things: an environment variable, a state key, and an evidence file. Not one of them was written by anything. Each missing piece made the hook quietly decline to judge rather than fail, so every surface said installed. The team had spent twelve attempts learning where the check belonged, and the thing that beat them was not the layer at all. Having the right layer had felt like the whole problem, and it turned out to be the easy half.

That is the shape to take from it: an input with no writer means the safeguard can never fire. The check to run is not a review of the code — it is to take every input the safeguard reads and find the thing that writes it. And the reason this route is invisible to ordinary discipline is that the standard test passes on the dead version. A check that every shipped component is called from somewhere will confirm the hook is wired in. Being called is only half of being able to run.

The second route is that the check cannot see what the rule is about. Consider a filing check that seemed to need one more option: a way to say "this is accumulating material" and have it appended to a project's observation notes instead of becoming a work item. Writing the requirement broke it. Someone asked what should happen when the project has no such notes file, and every available answer was unattractive — block the filing, file it anyway and defeat the point, or create the file inside someone else's project.

The reason none of the answers worked is structural rather than a matter of finding a better one. The check runs across every project one person works in; the notes file belongs to individual projects. The destination was simply not in what the check was handed. Where a rule names a destination the check cannot see in its arguments, that rule can only ever be advice, however carefully it is worded and wherever it is installed. And the tell arrives early: a requirement whose every available answer is unattractive is usually a rule being asked of the wrong component, not a rule that is underspecified. The companion rule adopted the same day pointed at another work item in the same project, which the check already receives, and that one was enforceable.

The third route is the plain one — the check is installed on some occasions and not on the occasions where the work actually happens — and it is worth naming only so the first two are not mistaken for it.

What ties the routes together is what they do to the surface. All three leave the system reading as safe. A configuration entry naming a real file, a merge commit, a green suite: each is evidence that something was set up, and none of them is evidence that it can run. So the first question is not answered by looking at the check. It is answered by replaying the original failure through it and watching it block.

Establishing that a check can fire tells you nothing about what kind of check it should be. That is the next question, and asked in the abstract it is close to useless: whether a property is a fact or a judgment sounds like a distinction you either see immediately or argue about forever. The useful route in is not the definition. It is the two failure signatures, because each wrong answer fails in a way you can recognise without knowing anything about the property in advance.

A work item was filed carrying an origin label it should not have had. The first fix proposed was a command-line flag that only the legitimate code path would pass. The owner declined that and offered the opposite mechanism instead: a human confirmation on every filing.

Both proposals were reasonable, and working through them showed they failed for opposite reasons.

The flag fails because it is asserted by the very actor that made the mistake. The code path that mislabelled the item is the code path that would be passing the flag, so the check consults the thing it exists to catch. Any mechanism where the actor supplies the evidence of its own correctness has this shape, and it always looks like a check while behaving like a preference.

The confirmation fails from the other side. It asks a person to verify something the machine already knows, on every single filing, where the answer is almost always the same. That trains people to click through — and in this case the point was already proven, because the bad label had just survived exactly such a human reading. A prompt that is almost always answered the same way is not a check on the rare case; it is a rehearsal of the common one.

So the diagnosis runs from the signature back to the category. If your proposed mechanism lets the acting code assert its way past the check, you were treating a computable fact as though it were a judgment, and you handed the judgment to the wrong party. If your proposed mechanism asks a person to confirm something the code could have computed, you were treating a judgment as though it needed one — and you have bought a click-through habit that will cost you on the day it matters.

The resolution in that case was neither mechanism. It was a routing rule: a property the acting code can compute gets checked mechanically at the moment of the act, by verifying the calling context rather than trusting anything the caller supplies. A genuine judgment does need a person, but it rides a confirmation step the workflow already has, with the relevant details surfaced there, rather than minting a second prompt.

The phrase "at the moment of the act" is doing real work in that sentence. Which code path is creating this record is a fact that exists while the record is being created and is often gone immediately afterwards. Deferring the check to a later stage does not make it harder; it makes it impossible, and then it gets replaced by the caller-supplied flag, which is where this section started.

## Where the refusal sits in the process

By now the check is in a good state. It has an occasion, its inputs have writers, it can see what the rule is about, and the property it decides has been routed to the mechanism that suits it. A reasonable person would stop here. The check fires, and when it fires it is right.

This is where the third question earns its place, because the cost it asks about does not go away when the earlier problems are fixed. It survives every one of them.

Consider a check that refuses at the last moment, and refuses correctly. The thing it rejects is genuinely faulty. Nothing about the refusal is wrong. But the item it rejects has already been read and approved by a person, and that person's effort is now spent and cannot be cheaply repeated. Meanwhile the fault was introduced much earlier, by whatever produced the item in the first place. The refusal is correct and the bill is sent to the wrong party — to the scarcest input in the process, at the point where it is least recoverable.

That is the claim this article is built around, and it is worth stating in its weak form rather than its strong one. A safety check that refuses work at the last moment is not necessarily in the right place, even when its refusal is correct. Not wrong — not necessarily right. The refusal being correct is simply not evidence about placement, and it is treated as evidence constantly, because a correct refusal feels like the system working.

The practical form of the question is: validate the shape of something when it is created rather than when it is finally used. Most of what a late check catches is a property the producing step could have been made to establish, and establishing it there costs the producer's attention rather than the reviewer's.

The diagnostic is a pattern rather than an instance. One late refusal on approved work tells you nothing — sometimes the fault genuinely could not have been seen earlier. A pattern of late refusals on already-approved work is evidence that the check is sited too far downstream, and it is the kind of evidence you have to go looking for, because each individual instance arrives looking like a success.

This is also where the earlier questions stop helping, and it is worth being clear about that. Everything in the previous two sections was about whether a check works. This question is about a check that works. You can pass the first three questions completely and still be holding a system that spends its most expensive resource on faults it was told about much earlier.

Three questions in, the list looks finished. Each one takes a check and asks something about that check: can it run, what kind is it, where does its refusal land. Applied one check at a time, they cover the ground — and that is exactly the assumption the fourth question exists to break.

A written procedure for closing out a reviewed batch of work said to lock the checklist first and to write the final index entry last. Both halves sounded right. Locking early protects the record; writing the index entry at the end is what an index entry is for. The order was treated as settled, and there was no reason to look at it again.

Running the documented order under the permission check produced a denial at the final step. Locking the checklist had revoked all write permission immediately — including the permission the last step still needed. The failure landed after the expensive, already-committed work had gone through, which is the worst possible place for it, and it landed on a sequence in which every individual step was correct.

That last property is what makes this a separate question rather than a corollary of the others. Every step reads as correct in isolation, so reviewers nod along line by line and the flaw lives only in the relation between steps. There is nothing wrong to see at any point where a reviewer is looking.

It defeats the obvious tests for the same reason. Unit tests of each step can all pass. Tests of every denial case can all pass. And the single authorised end-to-end path — the one where everything is permitted and the sequence actually runs to the end — can have zero coverage, because it is the only path nobody wrote a test for, on the grounds that it is the one that is supposed to work.

The question to ask, for each step in a teardown or close-out sequence: does any earlier step remove something a later step requires? The general form is to order such steps by increasing restriction, so that nothing revokes a permission a later step still needs. The check that carries weight is an end-to-end run of the whole sequence, because that is the only thing that exercises the relation the defect lives in.

The same shape turns up wherever a process dismantles its own authorisation. Credential rotation that revokes the old key before the new one has propagated. A privilege downgrade inside a transaction that still has work to commit. Feature-flag or sandbox teardown that removes the switch a later cleanup step reads. In each case the individual steps are defensible and the ordering is where the failure lives.

So the list is four questions, not three, and the fourth is different in kind from the others. The first three interrogate a check. The fourth interrogates the space between checks, which is precisely where the first three cannot look. That is the argument for keeping it on a list that is otherwise about single mechanisms — and it is also the model for anything you later add. Add a question when something that was genuinely available got missed, and when no question already on the list was standing anywhere it could have seen it.
