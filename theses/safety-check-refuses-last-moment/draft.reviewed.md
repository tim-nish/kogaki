---
brief: brief.md
brief_pin: sha256:e95e14ba29f8801fec0b30759d1c6da67e60868e96ef828deb2a5d4254e98c65
survey_pin: product-lab@4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d
generated_by: {"at":"2026-09-08T07:31:15.084Z","by":"src/draft.mjs (story 1.80, kogaki#587)","brief_sha":"e95e14ba29f8801fec0b30759d1c6da67e60868e96ef828deb2a5d4254e98c65"}
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
  - {"step_id":"c1","section":1,"section_title":"Four questions to ask while you are installing a check","lines":[27,42],"packet":"../../runs/draft/safety-check-refuses-last-moment/packets/c1.md","packet_sha":"7ea8dbe9453a333e4683ff6bc7f8b4a25689b53dd7cb3ef9c0c03e5650c274ab"}
  - {"step_id":"c2","section":2,"section_title":"Whether the check can fire, and what kind it is","lines":[46,56],"packet":"../../runs/draft/safety-check-refuses-last-moment/packets/c2.md","packet_sha":"0a9a1c8c0dcbaf0950a9a84aa8dd9d7c94eeb5e7972e7bf000120a8c087d814a"}
  - {"step_id":"c3","section":2,"section_title":"Whether the check can fire, and what kind it is","lines":[58,68],"packet":"../../runs/draft/safety-check-refuses-last-moment/packets/c3.md","packet_sha":"2cf985013669e27c4fd5d85e481eb10f9981bb672801764553c6f14684e86ad9"}
  - {"step_id":"c4","section":3,"section_title":"Where the refusal sits in the process","lines":[72,90],"packet":"../../runs/draft/safety-check-refuses-last-moment/packets/c4.md","packet_sha":"b409e698cbaa623b5b553d1d818c161287dcbbb15acf809d84ecb308cc010545"}
  - {"step_id":"c5","section":3,"section_title":"Where the refusal sits in the process","lines":[92,104],"packet":"../../runs/draft/safety-check-refuses-last-moment/packets/c5.md","packet_sha":"2619cc499b426eaf419fd735a47cf01d41be18ef0c9d36c4c8435f3ab5c5dcfe"}
---

## Four questions to ask while you are installing a check

You will not remember to be careful. That is not a character flaw, and no amount of reading about a class of defect fixes it. When you are installing a check, your attention is already committed to the line you are pursuing — getting the check written, getting it wired in, getting the thing to run — and a worry that lives outside that line does not interrupt it.

Two older trades have already settled on the same answer to this. Industrial hazard studies do not ask their engineers to be alert; they apply about seven fixed prompts to every step of the process, the same prompts every time. Aviation checklists are not attached to a pilot's state of mind either; they are triggered by the action — this manoeuvre, this phase of flight — so that the list arrives whether or not anyone thought to reach for it. The common mechanism is that attention follows the line already being pursued, so the way to reach it is to hang the questions on the act itself rather than on the person's intention to be thorough.

So here is a short set to hang on the act of installing a check. Four questions, asked at the moment you install it:

1. **Can this check actually fire?** Is there an occasion that reaches it, does every input it reads have something that writes it, and can it see the thing it is supposed to be judging?
2. **Is this a fact the acting code can compute, or a judgment?** Some properties can be established mechanically at the moment of acting. Others cannot, and have to be settled by a person before that moment.
3. **Whose effort does this refusal spend?** When the check says no, what work is thrown away, who did it, and can they do it again?
4. **Does any earlier step revoke what a later one needs?** Not whether each step is right on its own, but whether the sequence, run start to finish, still arrives where it is meant to.

That is the whole list, and its shortness is deliberate. Four questions asked every time beat twelve questions asked when you happen to feel careful, because the point is to survive the moment when you are not. The list grows only on evidence that something available at install time was missed — not on the general observation that more could go wrong.

This intervenes in one specific mechanism: attention that will not leave the line it is on. It does nothing about a hazard nobody at the keyboard could have named, and it will not make a check correct that you never thought to install at all. What it does is put the questions where your attention already is.

The rest of this article is the case for each of the four. Each section takes one question and shows the failure that put it on the list, so you can check whether it earns its place before you agree to run it every time.

## Whether the check can fire, and what kind it is

The first question looks like it has one answer. You installed the check; the check is there; yes, it can fire. But "can it fire" is not one condition, it is three, and they fail independently. A check can be present, correct, and dead for a reason none of the others would have caught.

The first route is that nothing reaches it. There has to be an occasion — some path through the work that arrives at this check and asks it for a verdict. If no such path exists, the check is a piece of code that is never on anyone's way anywhere. This is the route people do look for, and it is the one route the ordinary tooling half-covers.

The second route is that the check runs but reads an input nothing writes. Follow it through: the check consults some value to make its decision, that value has a default, and no part of the system ever sets it to anything else. The check then evaluates the default forever. It fires no verdict because the condition it tests is never made true, so it is installed and live and still cannot refuse anything. What makes this route dangerous is what happens to the evidence. The standard test — every shipped component is called from somewhere — passes on this version, because the component *is* called. Reachability is real; the input is dead. The test was answering the first question and the reader reads its green result as an answer to the second.

The third route is that the check cannot see what the rule is about. A rule names something — a destination, a target, the thing that must be true of the work — and the check is handed a set of arguments. If the thing the rule names is not among them, and cannot be derived from them, then the check is looking at the wrong object. It will still return a verdict, and the verdict will still be about whatever it *can* see, which is not what you wrote the rule to protect. A rule in that position can only ever be advice: it describes what should happen, and nothing in the running system is in a position to insist. There is a tell for this one, and it is worth learning because it shows up before the check ships. When you sit down to satisfy the requirement and every available way of answering it is unattractive — each option either weakens the rule, or reaches for something the check has no business knowing, or costs more than the rule is worth — that discomfort is usually not a design failure on your part. It is the rule naming something the check was never given.

So three routes, and they do not overlap: nothing calls it, nothing writes what it reads, nothing hands it the thing it is about. A configuration entry that names a real file settles none of them. It shows the check exists and is registered. It says nothing about whether an occasion reaches it, whether the value it consults is ever written, or whether the object the rule cares about is inside its arguments.

Suppose you have run all three and the check is genuinely live — it fires, on a real occasion, over the thing the rule names. There is still a question underneath the first one, about what kind of check this ought to be, and it is not answered by anything above.

Asked in the abstract, that question does not go anywhere. Nearly any property can be described either way. You can always say a person should decide it. You can usually write something that computes an approximation. Sitting at the keyboard and staring at the property, you will not resolve it by thinking harder about the property.

You can resolve it from behaviour. Each of the two wrong routings leaves a signature, and the two signatures do not look alike, so the one you are looking at tells you which routing you have.

Take the first. A property that actually requires a judgment gets routed as something the acting code computes. In practice that means the code reads a flag. The flag is set by whoever is doing the thing. Now watch what happens when that person is wrong. They believe the property holds. They set the flag. The check reads the flag and passes. The check did exactly what it was built to do, and the error walked through it anyway, because the check's only source of truth was an assertion by the party whose mistake it existed to catch. That is the signature: the check's record is clean, and the acting side is what supplies its input. Read it and you have your answer — you are looking at a judgment wearing mechanical clothes.

Now the other direction. A property the acting code could have computed gets routed to a person instead, as a confirmation to read and approve. The first few times, they read it. But the fact was always computable, so it is the same fact, in the same words, arriving on every occasion — including all the occasions where it is fine. A person who reads that sentence a hundred times and finds it fine a hundred times stops reading it. That is not laziness; it is what repetition does to a reader. By the time the sentence matters, the reading has stopped. That is the second signature: approvals arrive faster than the text could be read, and nobody can tell you what the confirmation said. Read it and you have the opposite answer — the property could have been computed and a person was asked instead.

So the two signatures point opposite ways, and telling them apart is the whole diagnosis. Clean record, actor-supplied input: the property needed a person and did not get one. Instant approvals, a prompt nobody can quote: the property was computable and went to a person anyway. Either reading hands you the fix, which is to move the property to the side that can actually establish it.

One caveat, and it is about where you may run this. Both signatures presuppose that the check is live at all, and that is exactly what the previous question settled — you can now establish that a check fires, which is the precondition for asking what kind of check it should be. A dead check has no signature. It produces no refusals and no approvals, and its record is empty because nothing ever reached it, so reading that emptiness as a clean record is reading a blank page.

## Where the refusal sits in the process

You have now fixed the categorisation and the liveness. The check fires, on a real occasion, over the object the rule names, and it sits on the side that can establish what it claims. And you still have a check that refuses late. That is the position this passage starts from, and it is worth staying in rather than treating as a finish line.

So watch one particular cost, and watch whether the repairs move it. A refusal rejects an item that a person went through and signed off on. Going through it was real work: attention paid line by line, a decision that the item was acceptable, and the saying so. That effort is spent, and it is unrepeatable — the person cannot get it back, and coming to the item again is not the same act as reading it the first time. Meanwhile the fault the refusal names was not introduced by them. It was introduced by whatever produced the item.

Now run the repairs past it.

The check was dead — no occasion reached it. You fix that, an occasion reaches it, and now it fires. It fires after the sign-off. The cost is unchanged.

The check read an input nothing wrote. You find the writer, wire it up, and now the check evaluates a real condition. It evaluates it after the sign-off. The cost is unchanged.

The check could not see the object the rule named. You extend its arguments until it can, and now the rule is enforceable rather than advisory. It is enforced after the sign-off. The cost is unchanged.

The property was a judgment wearing mechanical clothes, or a computable fact handed to a person. You route it correctly, and the check now establishes what it claims to establish. It establishes it after the sign-off. The cost is unchanged.

Four repairs, four genuinely better checks, and one thing sitting still through all of them. The effort is still spent and still unrepeatable. The fault still came from whatever produced the item, not from the person the refusal reaches. Not one of the repairs touched either fact, and that is not because they were poor repairs — it is because none of them was aimed at where the refusal sits. Persistence alone would prove nothing; a thing can persist and be trivial. What it shows here is that this cost is not the same problem as the ones the earlier questions ask about.

Hence the third question, asked separately: whose effort does this refusal spend? Where the answer is nobody — where the only thing thrown away is what the machine produced — the refusal can go anywhere. Where the answer is a person whose sign-off it voids, the refusal is billing effort that is already spent, for a fault that entered before that person touched it. And it is doing that every time it fires correctly. Its correctness is not evidence about either half of that, so it cannot be the thing you check the placement with.

Which leaves a check that may still be exactly where it belongs. Sometimes the fact the refusal needs does not exist any earlier than this. What is unavailable is the step from the refusal being right to the position being right; those are two different properties, and only one of them has been established.

By now you are auditing individual checks with a settled list, and nothing on that list gives you a reason to look between them. Each question takes one check as its object. Pick the check, ask whether it fires, ask what kind it is, ask whose effort its refusal spends. Do that for every check and the audit feels finished, because every check has been examined. The last question has a different object. It is about the relation between steps, and no amount of care spent inside a single one reaches it.

Work does not pass one check. It passes a sequence of them, and each one narrows what is available to the next. The first step admits the work and fixes what kind of thing it now is. The second reads that and narrows the permissions carried forward. The third reads what the second left and decides what may still be reached for. Each is a genuine bottleneck: the work cannot proceed without clearing it, and clearing it changes what remains for the step after. Every one of them can be right on its own terms while the sequence fails, because an early step revokes something a later step needs, and the later step is not wrong to need it. Neither step contains the defect. The defect is in the relation between them, and a relation is not inside either of its ends.

That is also why it survives testing, and the surviving happens across a second sequence you would have to clear in order.

The first is the per-step test. Each step has unit tests and each one passes, because each step does what it is specified to do. Clearing that bottleneck tells you nothing about the relation, since no unit test has two steps in view.

The second is the denial case: a request without permission, a request in the wrong shape, a request out of order. Those pass too. Each of them stops at the step that denies, so none of them reaches the later step whose need was revoked.

Which leaves the last bottleneck, and it is a single path — the run where everything is authorised and the work goes all the way through. That is the only path on which an early revocation meets a later need. Every unit test can pass, every denial case can pass, and that one path can have zero coverage. The suite is green over exactly the path the flaw lives on.

So the last question is not another way of asking about a unit. It asks you to take the whole authorised path and run it end to end, in order, and confirm that it arrives. Not each step reviewed. Not each denial tested. The one successful run, from start to finish — because a per-step review cannot see this class, and neither can a denial case.
