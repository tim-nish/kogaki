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
  - {"step_id":"c3","section":2,"section_title":"Whether the check can fire, and what kind it is","lines":[58,70],"packet":"../../runs/draft/safety-check-refuses-last-moment/packets/c3.md","packet_sha":"2cf985013669e27c4fd5d85e481eb10f9981bb672801764553c6f14684e86ad9"}
  - {"step_id":"c4","section":3,"section_title":"Where the refusal sits in the process","lines":[74,94],"packet":"../../runs/draft/safety-check-refuses-last-moment/packets/c4.md","packet_sha":"9ab0666408e875feae634ffa56e0f47ad61da3e38e69e064974cc804abe4f50a"}
  - {"step_id":"c5","section":3,"section_title":"Where the refusal sits in the process","lines":[96,110],"packet":"../../runs/draft/safety-check-refuses-last-moment/packets/c5.md","packet_sha":"45e12c226a5423ea13ad5f9e6754a6e438c94e2055e921f4d632a95b5675dc04"}
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

Asked in the abstract, that question does not go anywhere. Nearly any property can be described either way — you can always say a person should decide it, and you can usually write something that computes an approximation. Sitting at the keyboard, staring at the property, you will not resolve it by thinking harder about the property.

You can resolve it from behaviour, because each of the two wrong routings fails in its own way, and the two failures do not look alike.

Take the first. A property that actually requires a judgment gets routed as something the acting code computes, which in practice means the code reads a flag, and the flag is set by whoever is doing the thing. Now watch what happens when that person is wrong. They believe the property holds; they set the flag; the check reads the flag and passes. The check did exactly what it was built to do. The error walked through it, because the check's only source of truth was an assertion by the party whose mistake it existed to catch. That is the signature: refusals stop happening at precisely the moments they were meant for, and the check's record looks clean. If you see a check that has never refused anything and the acting side supplies its input, you are probably looking at a judgment wearing mechanical clothes.

Now the other direction. A property the acting code could have computed gets routed to a person instead, as a confirmation to read and approve. The first few times, they read it. But the fact was always computable, which means it is the same fact, in the same words, arriving on every occasion — including all the occasions where it is fine. A person who reads the same sentence a hundred times and finds it fine a hundred times stops reading it; that is not laziness, it is what repetition does. By the time the sentence matters, the reading has stopped. The signature here is approvals that arrive faster than the text could be read, and people who cannot tell you what the confirmation said.

The two signatures are worth keeping apart, because they point opposite ways. Clean record plus actor-supplied input says the property needed a person and did not get one. Instant approvals plus a prompt nobody can quote says the property could have been computed and a person was asked instead.

Neither signature is proof on its own, and it is worth being honest about that. A check that has never refused anything might be guarding something that has genuinely never gone wrong. A confirmation clicked quickly might be clicked by someone who already knows the answer from elsewhere. What makes the signature diagnostic is the pairing — the empty record *together with* the acting side owning the input, the fast approval *together with* nobody being able to say what was on the screen. Where you find the pair, the routing is the simplest thing that explains it, and the fix is the one this question was asking about: move the property to the side that can actually establish it.

Both of these presuppose the check is live at all, which is why the previous question comes first. A dead check has no signature; it produces no refusals and no approvals, and reading its empty record as evidence about its category is reading a blank page.

## Where the refusal sits in the process

Everything so far has been about getting a check to work. It is easy to read the first two questions as a route to a finish line: make it fire, route it to the side that can establish the fact, and you are done. You are not done, and the way to see it is to notice what does not change while you fix those things.

Watch one particular cost across the repairs. A check refuses something a person has already read and approved. That reading was real work — attention spent going through the item line by line, deciding it was acceptable, and saying so. When the refusal lands, that work is gone. It cannot be recovered, and it cannot be re-spent cheaply either: the person has to come back to an item they had already finished with, and go through it again with the same attention they gave it the first time. Meanwhile the fault the check caught was not introduced by them. It came from whatever produced the item — the process, the tool, the earlier step that generated what they were asked to approve.

Now run the repairs and see whether that cost moves.

The check was dead — no occasion reached it. You fix it, an occasion reaches it, and now it fires. It fires after the reading. The cost is unchanged.

The check read an input nothing wrote. You find the writer, wire it up, and now the check evaluates a real condition. It evaluates it after the reading. The cost is unchanged.

The check could not see the object the rule named. You extend its arguments until it can, and now the rule is enforceable rather than advisory. It is enforced after the reading. The cost is unchanged.

The property was a judgment wearing mechanical clothes, or a computable fact handed to a person. You route it correctly, and the check now establishes what it claims to establish. It establishes it after the reading. The cost is unchanged.

Four repairs, four genuinely better checks, and one thing sitting still through all of them: the refusal arrives after a person has spent effort that the refusal destroys. That is what makes it worth its own question. Not that it lasts a long time — a thing can persist and be trivial — but that it survives every fix aimed at the other problems, which means none of those fixes was aimed at it. It is a property of where the check sits, not of how well it works, and the earlier questions do not ask about where.

So the third question is asked separately: whose effort does this refusal spend? Whoever it is, the answer tells you whether the check is early enough. A refusal that costs nobody anything except the machine that produced the item can be placed anywhere. A refusal that reaches back and voids somebody's finished reading is billing the scarcest input in the process for a fault introduced somewhere it had no control over — and it is doing that correctly, every single time, which is why nothing about its correctness will ever surface the problem.

This is the whole claim of this article, and it is deliberately a *not necessarily*: a check that refuses at the last moment may be exactly where it belongs. Sometimes the fact it needs does not exist until then. What is not available to you is the inference that because the refusal is correct, the position is right.

There is one more question after this, and it is not another way of asking about a single check.

The first three questions all point at one check. Pick the check, ask whether it fires, ask what kind it is, ask whose effort its refusal spends. Do that for every check you install and it feels exhaustive, because every check has been examined. The fourth question is different: it is about what happens between them, and no amount of care spent on the individual units reaches it.

Think about what a piece of work has to survive to actually get through. It does not pass one check. It passes a sequence of them, and each one narrows what is available to the next. The first step admits the work and, in doing so, fixes what kind of thing it now is. The second step reads that and narrows the permissions it will carry forward. The third reads what the second left and decides what it may still reach for. Each of these is a genuine bottleneck: the work cannot proceed without clearing it, and clearing it changes what is left for the step after. Every one of them can be right on its own terms and the sequence can still fail — because an early step revokes something a later step needs, and the later step is not wrong to need it. Neither step contains the defect. The defect is in the relation between them, which is not inside either unit.

Now the second sequence, the one that makes this hard to catch. To find the flaw you would have to clear these in order.

You would first have to have a test that exercises the steps at all. You probably do: each step has unit tests, and they pass, because each step does what it is specified to do. Clearing that bottleneck has told you nothing about the relation.

You would then have to have a test that goes past a single step. You probably have those too, and they are almost always denial cases — request without permission, request with the wrong shape, request out of order — because denials are cheap to write and are the cases people worry about. Every one of them passes. Every one of them stops early, at the step that denies. None of them ever reaches the later step whose need was revoked, because they are designed not to get that far.

Which leaves the last bottleneck, and it is a single path: the one run where everything is authorised and the work is supposed to go all the way through. That is the only path on which an early revocation meets a later need. It is one case out of the whole suite, it is the least interesting to write, and it is routinely the one that does not exist. So the count on your dashboard is high, the pass rate is green, and coverage on the path that matters is zero.

This is why the fourth question cannot be folded into the other three. Those ask about a unit; this one asks you to take the whole authorised path and run it end to end, in order, and confirm it arrives. Not each step reviewed. Not each denial tested. The one boring successful run.

That is the fourth question, and that is the list. Four questions, hung on the act of installing a check rather than on your intention to think carefully at the time: can it fire, what kind of thing is it, whose effort does its refusal spend, and does anything earlier revoke what something later needs. Each one is on the list because a failure that the other three could not see put it there. The list stays this short on purpose. Add to it when you find something you could have seen at install time and did not — and not before.
