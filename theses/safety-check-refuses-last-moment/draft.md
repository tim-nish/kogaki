---
brief: brief.md
brief_pin: sha256:e95e14ba29f8801fec0b30759d1c6da67e60868e96ef828deb2a5d4254e98c65
survey_pin: product-lab@4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d
generated_by: {"at":"2026-09-07T12:02:49.144Z","by":"src/draft.mjs (story 1.80, kogaki#587)","brief_sha":"e95e14ba29f8801fec0b30759d1c6da67e60868e96ef828deb2a5d4254e98c65"}
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
  - {"step_id":"c1","section":1,"section_title":"Four questions to ask while you are installing a check","lines":[27,45],"packet":"../../runs/draft/safety-check-refuses-last-moment/packets/c1.md","packet_sha":"7ea8dbe9453a333e4683ff6bc7f8b4a25689b53dd7cb3ef9c0c03e5650c274ab"}
  - {"step_id":"c2","section":2,"section_title":"Whether the check can fire, and what kind it is","lines":[49,57],"packet":"../../runs/draft/safety-check-refuses-last-moment/packets/c2.md","packet_sha":"99b6c3c0e068c57487ad14c7839a398eaab62a93e47b833503f73ecf35a05a86"}
  - {"step_id":"c3","section":2,"section_title":"Whether the check can fire, and what kind it is","lines":[59,67],"packet":"../../runs/draft/safety-check-refuses-last-moment/packets/c3.md","packet_sha":"9020af3c6c61eafb128c3c043b58f92a7a205416aa3731beb041f02d7295fa40"}
  - {"step_id":"c4","section":3,"section_title":"Where the refusal sits in the process","lines":[71,83],"packet":"../../runs/draft/safety-check-refuses-last-moment/packets/c4.md","packet_sha":"d738b86e19ae09995de69fdfbe536defbf0c92f02a473bc871ff3ba61c4d459f"}
  - {"step_id":"c5","section":3,"section_title":"Where the refusal sits in the process","lines":[85,97],"packet":"../../runs/draft/safety-check-refuses-last-moment/packets/c5.md","packet_sha":"d12682ec552e0d7c2eccd7d1b0e5c1684e07c514e2527169593caefb523107ec"}
---

## Four questions to ask while you are installing a check

A short set of questions has to be attached to the act of installing a check. It cannot be attached to your intention to be careful. That is the finding this article is built on, and it is worth having before the argument for it.

The reason is that attention follows the line already being pursued. Someone installing a check is pursuing the rule the check enforces. A question that waits to be remembered is waiting on attention that is committed elsewhere.

Two disciplines already work this way. Industrial hazard studies apply about seven fixed prompts at every step of a process. Aviation checklists trigger on the action rather than on the subject — the list runs because you are about to do the thing, not because you judged this instance worth a list.

So here is the set this article argues for, put in front of you before its case is made:

Can this check actually fire?

Is this a fact the acting code can compute, or a judgment nobody has made yet?

Whose effort does this refusal spend?

Does any earlier step revoke something a later step still needs?

Four questions, and one rule for adding a fifth: add only when something that was genuinely available got missed. The list is meant to stay small enough to be asked every time.

The rest of the article is the case for each question. If you stop reading here you have the practice. What follows is the reason to trust it.

## Whether the check can fire, and what kind it is

You are holding the four questions now, weighing each one against the others to see whether it earns its place on a list this short. Start with the first, because it looks like the one to cut. The check runs; someone merged it; a configuration entry names its file. That entry records only that a check was set up. It does not show that the check can reach the moment it is supposed to judge.

That gap opens in more than one place, and the places do not resemble each other.

Take the inputs first. A check reads things — a variable, a stored key, a file on disk. If nothing in the system ever writes one of those things, the check cannot fire, no matter how correct its rule is. Ordinary discipline does not catch this. A team can test that every component it ships is called from somewhere, and the version that can never fire passes that test unchanged.

Now take the destination. A rule can name a place the check is supposed to send something to, or a place it is supposed to look at, while the arguments the check receives never carry that place. Then the check cannot enforce the rule. It can offer the rule as advice and nothing more. There is a tell, and it arrives while the requirement is still being written: you ask what should happen in some ordinary case, and every answer available to you is unattractive.

The third place is the plain one. The check sits on some occasions and not on the occasions where the work actually happens. It is worth naming so that the first two are not mistaken for it.

You can now settle whether a check reaches the moment it is meant to judge. That answer says nothing about what kind of check the property deserves, and it is the precondition for asking. So ask it next.

The question resists the abstract form. Whether a property is a fact the acting code can compute or a judgment nobody has made yet sounds like a distinction you either see at once or argue about all afternoon. The two wrong mechanisms are the shorter route, because each one fails in a way you can recognise on sight.

Consider a flag the calling code passes to declare itself allowed through. The code path that made the mistake is the code path that passes the flag. The check therefore consults the very actor it exists to catch, and the actor asserts its way past.

Consider a confirmation prompt placed over something the code could compute for itself. It puts the same question to a person on every pass, and the person gives the same answer nearly every time. That person learns to stop reading it.

Now run each signature backwards. A mechanism the acting code can assert its way past was carrying a fact the code could have computed, and you routed that fact through the actor instead of through the machine. A mechanism that asks a person to confirm what the code already knows was carrying no judgment at all, and you bought the click-through habit for nothing. The signature answers the question that the definition would not.

## Where the refusal sits in the process

Two things about this check are settled now. It reaches the moment it is meant to judge. The property it decides sits in the mechanism that suits it. What you are still holding is a check that refuses at the last moment.

That is the state the third question is for. It asks about something the first two questions leave untouched.

Follow what a late refusal lands on. The thing it rejects has already been read by a person. That person approved it. The reading is effort that has been spent. It will not be repeated cheaply. The fault in the thing came from whatever produced it, further back.

Now change the conditions the earlier questions govern. Give the check the occasion it was missing. The spent reading is still spent. Move the property off the actor and onto the machine. The spent reading is still spent. Neither repair reaches back to the moment the person read the thing, because neither repair is about that moment.

So the cost holds still while the rest of the check improves around it. That is the reason it earns a question of its own rather than a footnote to the other two.

It is also the claim this article is built on, and the weak form is the one to state. A safety check that refuses work at the last moment is not necessarily in the right place. That holds even where the refusal is correct. Not wrong — not necessarily right.

Which leaves the question this section opens. The refusal is late in the process. The fault entered the process earlier. What follows from the gap between those two points is the next thing to work out.

Everything so far has taken one check and turned it over. The list you are holding is settled and it works that way: you pick up a mechanism, you ask what it can reach, what it decides, whose effort it spends. Nothing in that habit gives you a reason to look at what sits between one step and the next. The fourth question is the one that sends you there, and the case for it is that the space between steps has to be reached deliberately, because everything already standing in the way of a defect there lets it through.

Follow what such a defect has to survive to reach the end. Each thing in its path would have to stop it, and each has to be got past before the next one matters.

The first is the reading. Someone goes over the sequence with the list in hand and audits the steps one at a time. A flaw that lives in the relation between two steps is not in either of them, so an audit conducted step by step passes over it. The reader is not being careless. They are looking where the list points.

Past that stands the per-step test. Each step gets its own coverage, and every one of those tests can pass, for the same reason the reading passed: what is being tested is the step, and the step is correct.

Past that stand the denial cases. These are the tests you write when you are thinking about what could go wrong — every case where the sequence is supposed to refuse. All of them can pass too.

What is left after those three is the single authorised path: everything permitted, the sequence running from its first step to its last. That path can have zero coverage. It is the one arrangement in which the relation between the steps is actually exercised, and it is the one the earlier instruments were never going to reach, because each of them was looking at a unit.

So a check applied to one step at a time cannot see this, and neither can a test written against one step at a time. That is why the question about ordering has to be asked separately, and why the thing that answers it is a run of the whole authorised path end to end rather than a further round of per-step review.
