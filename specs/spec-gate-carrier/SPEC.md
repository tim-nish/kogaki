# SPEC-gate-carrier — the gate carrier

**Status:** v6, amended 2026-09-05 (kogaki#890, owner selection at the
/ship-cycle gate) — **§10 binds WHO WRITES a capture, which v1–v5 never said.**
Every clause before this one binds a capture's SHAPE — its rows, its evidence
fields, what `options_offered` is judged against — and a shape is satisfiable
by anyone. The Terrain runtime satisfied all of it while taking the answer from
the session: `--capture-option`, `--capture-free-text` and `--tool-use-id` were
composed by the model after it rendered the gate, and `tool_use_id` was stored
under the key `evidence` without ever being resolved against anything. §10 names
the writer, adds the `gate_instance_id` join key that makes a written row
belong to one raising, and states why that key is a nonce and not a digest.
**deferred slots minted by this amendment: one, and it is named at §10.4.**

**Status:** v5, amended 2026-09-05 (kogaki#891, PR #911 round 1) — **§4.1 says
WHICH sibling declaration is the target, not just that a sibling is.** v4 named
it `<gate_id>.run-declaration.json`, which holds only where a directory holds one
run. A capture keyed on its RUN — `<run-state stem>.<gate_id>.gate-capture.json`,
the name `src/brief.mjs` writes so that two entries over one settled Strand set
cannot share a declaration — was compared against a name that never matched, so
the check silently fell back to the registry and every conforming Brief run would
have reddened the local suite. **deferred slots minted by this amendment: none.**

**Status:** v4, amended 2026-09-03 (kogaki#818) — **§4 states what a capture's
`options_offered` is judged AGAINST.** The rule was real and unwritten: the
schema carried the flag, the check carried the comparison, and this contract
named `options_offered` only as a payload member. Its scope was asserted
nowhere but in one registry entry's own prose, which is why a conforming run
could redden the suite forever without contradicting any sentence in this file.
**deferred slots minted by this amendment: none.**

**Status:** v3, amended 2026-08-21 (kogaki#569) — **§3.1's one exception is
discharged.** v2 (same day, same issue) bound what the question carries —
four members, a fifth owes a stated reason, machine-facing text not among them —
and named one exception in force: the gate declaration block, mandated in the
question text by a clause and hook living in `tim-nish/claude-toolkit`, where
the reversal was filed as `tim-nish/claude-toolkit#402`. That repository ruled
the same day (`SPEC-triage-gh` §"The declaration rides in the transcript", v65,
its #402 closed; observed enforcing in this repository's own sittings), so the
exception is dropped and §3.1 now binds without one. **deferred slots minted by
this amendment: none.**

**Status:** v1, authored 2026-08-05 (kogaki#16, umbrella kogaki#14).
**Governs:** port manifest item 4 (`specs/SPEC.md` §5).

The manifest carries this subsystem's contract inline, as its admission
record:

> "4. **The gate carrier** (declared gate registry, AskUserQuestion evidence,
> payload/answer capture) — with rendering through the question UI as
> contract, not discretion."

`specs/SPEC.md:4806-4808`

Ported **with** its contract, ahead of Terrain, on the same ground as item 3
(`specs/SPEC.md:113-121`). Authored consumer-side, in the same shape as
`specs/spec-proposal-contract/SPEC.md` and `specs/spec-terrain/SPEC.md:6-15`.

## 1. What this contract binds, and what it does not

Item 3 binds a **record** and by its own decision delivers no rendering
(`specs/spec-proposal-contract/SPEC.md:137-139` puts the medium binding, the
gate registry and `AskUserQuestion` evidence here). This spec is the other
half: it binds the **gate** — the moment a decision reaches the owner — its
declared enumeration, its medium, and the evidence its answer leaves behind.

The two contracts share no machinery, deliberately. A proposal may be
presented at a gate and a gate may present something that is not a proposal;
neither validator reads the other's files.

## 2. The declared gate registry

Every gate this repository raises is declared in `src/gate-registry.json`. The
registry is the enumeration against which coverage is measured, and it exists
because the alternative is the uncovered-by-default shape: without an
enumeration, "all gates are covered" is a statement about the gates somebody
happened to remember.

**It is a separate artifact from `checks/registry.json`, and the argument is
mechanical before it is philosophical.** Every entry in the check registry
names a `file` that must exist under `checks/`, and
`checks/check-registry-conformance.sh:21-27` fails any entry that does not —
a gate row would be a dangling entry by construction. The admission record
there is check-loop economics (`tier`, `runtime_ms`, `removal_signal`;
`checks/registry.json:2-7`) and a gate has neither a runtime nor a loop
position, so merging would mean fabricating those fields or making them
optional — and an optional admission field is precisely the gap kogaki#6 was
filed to close. Same coverage discipline, different admission economics, so
two artifacts. The registry is currently **empty**, and the check renders
that zero explicitly rather than passing silently: the carrier ports ahead of
its first consumer, Terrain (`specs/SPEC.md:109-112`).

The machine-readable shape is `src/gate-schema.json`.
`checks/check-gate-carrier.sh` reads its field lists rather than restating
them, so amending the contract is one edit.

## 3. The medium binding

> "'In a Claude Code host, a gate renders through the selector affordance,
> never prose' is RATIFIED as the rule's first named MEDIUM BINDING, and it
> is what makes the rule checkable. The general form — visually distinct from
> the surrounding report — is unfalsifiable on its own, since every author
> believes their own gate is distinct; all seven observed failures were
> authored by someone who thought the gate was legible."

`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/claude-code-ops.md:61`

So a gate declares its `host` and its `medium`, and the host carries the
binding rather than the gate carrying a promise. `claude-code` binds `medium`
to `selector` — the `AskUserQuestion` affordance. `prose` is refused in every
host, named or not. **Additional hosts get their own bindings**, per the same
served line; a host with no declared binding fails rather than inheriting
one, because inheriting would restore the unfalsifiable general form under a
new name.

### 3.1 What the question carries (v2, kogaki#569; exception discharged at v3, kogaki#569)

§3 binds the **medium** — which affordance a gate renders through. This clause
binds what that affordance **carries**, which the manifest already admits as
contract rather than discretion:

> "with rendering through the question UI as contract, not discretion"

`specs/SPEC.md:4806-4808` — **repointed at v2.** This clause's first cut carried
`:99-101`, which is where the file's own header block still cites the item and
which resolves at this head to unrelated text on derived-artifact sensitivity.
The quote is the whole ground §3.1 rests on, and a pin that looks sound while
resolving elsewhere is the defect class `policy/consultation-map.md` records at
kogaki#266. The header's copy is outside this clause and is not repaired here.

**The owner ruling (2026-08-20).** The question carries the identifying
material the owner reads, the instruction, the question, and the options.
**Anything else on a gate question is added only with a stated reason**, and the
reason is stated where the element is added rather than assumed by whoever adds
it.

**The general clause is the load-bearing half, deliberately.** Naming the one
element that prompted the ruling would cover that element and leave the next one
uncovered by default — the enumeration shape this repository refuses elsewhere.
So the rule is composition-shaped: the question has four members, and a fifth owes
an argument.

**Machine-facing text is not one of the four.** This repository already classes
pins that way and says where they go instead:

> "**Pins do not go here.** `consulted:`, `request_id:` and `@<sha>` are
> machine-facing and belong in the receipt, whose destinations are unchanged —
> PR bodies, issue bodies, run records, spec amendments. …"

`policy/kit/skills/consult-first.md:97-101` (the kit SOURCE, which
`policy/kit/install.sh` copies to `.claude/skills/consult-first/SKILL.md`;
the source is authoritative and the installed copy derived — `checks/check-client-kit-install.sh` — and the install copy is machine-local
since kogaki#615, so a pointer into it resolves nowhere on a fresh clone)

**And that source licenses one narrower admission, scoped to the DECLARATION
surface and not to the question.** The sentence the excerpt cuts reads:
"One exception is not an exception: a gate declaration may carry an `outcome:`
line, which is a token and not a pin." A bare `outcome:` token is therefore
admissible on a gate declaration by the same source — and since v3 the
declaration itself rides the transcript (see the discharge below), so this
admission touches the question not at all: the four-member rule and
"no exception in force" stand together with it, not against it.

Rendering a machine-facing record into the question body is the record/rendering
confusion the payload design exists to prevent, applied to the gate's own chrome.
Where a consultation must be visible to the owner **before** a gate, the existing
owner-render block — Question / Answer / Conclusion, printed before the UI — is
the sanctioned surface and is unchanged.

**THE EXCEPTION IS DISCHARGED (v3).** v2 named one live exception: the gate
declaration block — `gate: <class>` with its `receipt:` and `outcome:` lines —
was mandated **in the question text** by a rule and an actor-level hook living
in `tim-nish/claude-toolkit`, neither reachable from here, so v2 named the
carrier and asserted nothing about its state. That repository ruled on
2026-08-21 (`SPEC-triage-gh` §"The declaration rides in the transcript", v65,
issue #402 there, closed): the block is emitted as **assistant text in the
transcript before the gate call**, keyed `gate-declaration (question N):`, and
`lint-gate-declaration.py` now REFUSES a question text carrying `gate:` —
observed enforcing in this repository's own sittings the same day. The two
contracts now agree, no element of the declaration block reaches the question
UI, and §3.1's four-member rule binds with no exception in force.

**The discharge is an observation dated 2026-08-21, not a self-maintaining
claim.** Nothing in this repository watches that repository (`instrument:
none`, unchanged below), so the state claims above are readings taken at the
discharge, and this clause states what reopens it rather than leaving the
reader to infer permanence: the hook's removal or staleness, or a
`SPEC-triage-gh` amendment moving the declaration off the transcript, reopens
v3 — the observing act is whoever meets a declaration back in question text,
exactly the event that filed kogaki#569.

**The carrier is NAMED and its state is not asserted**, which is the form the
served line this clause consults requires and the form
`policy/consultation-map.md` entry 4 already models — kept at v3 as the record
of HOW the exception was carried while it lived: the carrier named, its state
never asserted, `instrument: none` because nothing here watches that
repository. That form is why this clause could not rot between the toolkit's
ruling and this amendment — it claimed nothing the ruling falsified.

**The v2→v3 discharge is read from the carrier it named, not inferred.**
kogaki#569's cross-repo half, `tim-nish/claude-toolkit#402`, closed with the
transcript transport ratified and the hook's refusal observed live in this
repository. The paragraph below preserves v2's disposition record:

`consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 LESSONS.md:97`

**No gate is registered by this clause and no check is registered by it.** It
binds composition, which `src/gate-registry.json` already declares per gate, and a
check over question text would be a second reader of a surface the actor-level
hook already reads.

## 4. Payload and answer capture, with the gate-less row

Capture files are any `*.gate-capture.json` in the **working tree** — a
default carrier, not an enumerated directory, for the same reason item 3 chose
one. "Working tree" rather than "the tree", because that word is the homonym
§4.1 was written to resolve: a machine-local run workspace is in the working
tree and never in the committed one, and reading it the other way is what made
a conforming run fail.

A row for a gate carries `evidence` (the `AskUserQuestion` tool use itself,
by `tool` and `tool_use_id` — the rendering's own artifact, not a claim that
it rendered) and `payload` (`options_offered`, `free_text_offered`, `answer`).
An answer recorded without its payload cannot be re-judged.

A row whose `gate_id` is `null` is the **gate-less row**: a stop that raised
no gate. It states its `no_gate_reason` and carries neither evidence nor
payload. It is a legitimate row class, never a violation and never a crash:

> "no fixture held a gate-less row though every payload-capturing run
> produces them"

`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/claude-code-ops.md:14`

`checks/fixtures/gate-carrier/conforming/capture-gateless-row.json` and
`capture-mixed-run.json` are that fixture, written first rather than after the
incident.

### 4.1 What `options_offered` is judged against (v4, kogaki#818)

`options_offered` is compared for **exact set equality** against the options
the gate declared **for that run**. The comparison is unchanged from v1 in
strength; what v4 states is the thing v1 left to the reader — **which
declaration is the comparison target.**

- Where a run declaration sits beside the capture, it is the target. That file
  is the gate's declaration *as raised*, written by the executor at the wait
  that owed it, and it is the only artifact that can hold an option composed
  for that run.
- **Which sibling (v5, kogaki#891).** The declaration's name is derived from
  the capture's OWN name — the capture name with the `*.gate-capture.json`
  suffix replaced by `run_declaration_suffix` — and `<gate_id>` +
  `run_declaration_suffix` is tried second. v4's name assumed one run per
  directory. Where two can share a workspace the declaration and the capture
  are both keyed on the RUN STATE and not on the directory
  (`<run-state stem>.<gate_id>.…`, `src/brief.mjs`), because two entries over
  the same settled Strand set compose the same options and therefore the same
  digest — which is exactly when one run's declaration is least
  distinguishable from another's. A gate_id-only name gives those two runs ONE
  declaration between them, and the digest cannot catch it. The second name is
  the per-gate-directory form `src/assemble.mjs` writes, kept exactly. The name
  is DERIVED and never guessed from a directory listing: a listing holding two
  declarations would have to pick one, and picking wrong is the admission this
  keying exists to refuse.
- Where no sibling declaration exists, the target is the gate's entry in
  `src/gate-registry.json`. This is the pre-v4 behaviour, kept exactly: a capture
  that reached the tree with no run workspace around it is judged against the
  registry and fails on disagreement, **by design rather than by exemption.**

**Nothing is exempted and no rule is loosened.** A gate declaring
`dynamic_options` is not released from the equality rule — its declaration
simply names the run's options instead of the class's, and equality is then
decidable against something that can actually be equal to what was offered.
The capture population is untouched: `src/gate-schema.json`'s
`"scope": "anywhere in the repository"` still governs which files are looked
at, and the fix is entirely in what a capture is compared *to*.

**Why the rule needed its scope written down.** The registry's own
`dynamic_options` prose said the run declaration lives in "the machine-local
run workspace, which never enters the tree" — meaning the **committed** tree,
since `/runs/*` is ignored. `checks/check-gate-carrier.sh` reads the **working
directory**. Both readings of "the tree" are natural and only one was ever
implemented, so every conforming run left the local suite red on a legitimate
act, stably and forever:

> "If you write a rule like \"anything still marked unfinished\", say where the
> mark has to be — in the header field, not just somewhere in the file. …
> The wrong match is usually stable rather than intermittent, which makes it
> worse: an item that is always wrong quietly becomes something everyone
> learns to ignore. Write the rule with the one example that tells the two
> readings apart, so whoever implements it later gets a test and not just a
> description."

`consulted: product-lab@9e805ff15e94895582c1d99376339f4bfd4b610b gloss/lessons/testing.md:95`

**The exemption shape was declined on the served record**, not on taste. The
candidate direction that released `dynamic_options` gates from equality and
pattern-matched their ids instead would inherit forward to every gate that
later declares the field, without that gate restating the original reason in
its own terms:

> "the entire purpose of an exception is to skip a check, so a wrongly
> inherited one produces no error, no warning, and no failing test; the system
> is not failing to verify, it has been told not to."

`consulted: product-lab@9e805ff15e94895582c1d99376339f4bfd4b610b gloss/lessons/testing.md:173`

**The fixture pair is owed, per the quoted line's last sentence** — the one
example that tells the two readings apart. A conforming capture whose
`options_offered` match a sibling run declaration but **not** the registry
must be accepted, and a nonconforming capture whose options match **neither**
must still fail. A single fixture cannot discriminate the two readings, so
neither is admissible alone.

**v5 owes its own discriminating pair, and for the same reason.**
`conforming/entry-7f3a.terrain-dynamic.*` is a run-state-keyed capture and its
declaration, placed in the directory that already holds ANOTHER run's
`terrain-dynamic.run-declaration.json`, with options matching neither that
declaration nor the fixture registry. It is admitted only under the derived
name; under v4's it resolves the other run's declaration and reports
`CAPTURE_PAYLOAD_OPTIONS_MISMATCH`. A pair in a directory holding one
declaration would pass under both readings and evidence nothing.

## 5. The machine's own comparison — item 4's, decided here

Story 1.6 left undecided whether the served gate lesson's comparison half is
item 3's or item 4's (`specs/spec-proposal-contract/SPEC.md:151-156`). **It is
item 4's.** Three grounds, and the question is answered rather than returned:

1. The served lesson states the obligation of a gate's **input surface**, and
   closes "agent-fed inversion is incomplete until the presentation surface —
   including the comparison — is also fixed"
   (`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 LESSONS.md:99`).
   The comparison is a presentation-surface obligation, and item 3 delivers no
   presentation surface by its own §4.
2. The ratifying line types the duty by its bearer: "A fork gate owes a RANKED
   recommendation with per-option evidence; the discriminator against a
   forbidden default is FALSIFIABILITY … Admissible when nothing is
   pre-selected, each option carries the evidence bearing on it, and the
   recommendation carries **the evidence that would overturn it** — a
   recommendation without its overturning evidence stays forbidden as a
   default in disguise"
   (`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/archive/knowledge-architecture.md:15`).
   The bearer is the gate.
3. Sited in item 3, a gate that presents no proposal record would owe no
   comparison — the uncovered-by-default shape §2 exists to refuse.

So a gate declaring `fork: true` carries `comparison.recommended` (an offered
option id), `comparison.overturned_by`, and `evidence` on every option; and no
option may carry a pre-selection key, since rank is not pre-selection.

## 6. Where the mechanical/judgment line falls

Item 3 split the effect-stating property into a mechanical form floor and a
sufficiency half routed to the review lane. **This contract owes the same
split and takes it, on the same served ground**
(`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/claude-code-ops.md:46`
— "authenticate facts mechanically, gate judgments").

Carried **here**, mechanically:

- registry membership and gate-record completeness;
- the medium binding, which is checkable *only* because it names an
  affordance — this is the one place the split lands on the mechanical side
  where the general property could not;
- `AskUserQuestion` evidence present and identified;
- payload/answer completeness, and payload/registry option agreement;
- the comparison's **structural** presence: a recommendation that is a real
  option, overturning evidence non-empty, per-option evidence non-empty, no
  pre-selection.

Routed to the **review lane** (kogaki#13, story 1.5), as judgment:

- whether an option's attached evidence is the evidence bearing on it;
- whether the stated overturning evidence would in fact overturn the
  recommendation;
- whether the gate reads as a gate beyond its named affordance — the general
  form the served line calls unfalsifiable, which is exactly why it cannot be
  mechanized and exactly why it is not dropped.

The check states this split in its own output. A pass is not a claim that a
gate's comparison is adequate; an unstated omission reads as coverage.

## 7. Reporting: a crash is not a finding

> "A checker whose fallback message is phrased as its positive finding
> converts every internal error into a FALSE ACCUSATION, and the misreport is
> worse than silence because it aims the debugger away from the auditor. …
> the remedy has three parts and the third is the one that gets forgotten:
> guard the crash, report a crash AS a crash, and **disclose repetition** so
> identical output cannot be read as accumulating evidence."

`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/claude-code-ops.md:14`

All three are implemented:

1. **Guard.** Every capture row is validated inside its own guard; an
   unreadable rows list is guarded too.
2. **Report as a crash.** Crashes render under `CANNOT-DETERMINE`, in a block
   separate from `FAIL`, closing with "This is a defect in this checker, not a
   finding against the audited gate — debug here, not there." A crash is never
   spent as a positive finding.
3. **Disclose repetition.** Identical entries collapse to one line with
   `×N (identical output, one deterministic cause — not N independent
   confirmations)`. The crash key deliberately omits the row index, because a
   deterministic cause producing the identical entry N times is the case the
   disclosure exists for.

`checks/fixtures/gate-carrier/nonconforming/capture-row-uncheckable.json` and
`capture-row-uncheckable-repeated.json` exercise parts 1–3, and the fixture
pass **fails the check** if a crash is emitted as a violation instead.

## 8. Out of scope, by decision

The proposal record's shape (Where/Why, premise negation, the free-text
override's unconditionality, the effect-stating floor) — item 3, kogaki#15.
Also out: any gate-raising runtime. This contract binds how a gate is
*declared, rendered and recorded*, never what raises one or when.

## 9. Open — carried as questions, never as contract

- **Zero declared gates.** The registry is empty at authoring and the check
  says so rather than reporting a vacuous pass. The first consumer (Terrain,
  kogaki#14) is the evaluation of this shape.
- **One host binding.** `claude-code` is the only host with a declared
  binding, as the served line intends ("Additional hosts get their own
  bindings"). A second host is an amendment to `hosts` in the schema, not a
  weakening of the rule.

## 10. Who writes a capture (v6, kogaki#890)

§4 binds what a capture row **is**. This binds who may **write** one, and it
exists because the two are independent: every field §4 requires can be filled
in by the party whose answer the row is supposed to constrain.

**The owner ruling this executes.** The 2026-09-04 ruling (product-lab,
`q_a/staging/2026-09-04-a-harness-must-not-consume-model-output-as-control-input.md`)
separates **selectors** from **evidence** — the model may say which thing to
look at, and may not supply the fact. *Which option the owner chose* and *that
a rendering happened* are facts about the world. The ruling on the identical
channel elsewhere (product-lab#307, closed) is the **Harness-recorded click**:
a hook writes the confirmation record and the typed operation refuses without
it. The owner selected that arm for this repository on 2026-09-05.

### 10.1 The writer is a harness carrier, and the flags are removed

A capture row for a Terrain gate is written by
`.claude/hooks/write-gate-capture.py`, a PostToolUse carrier on
`AskUserQuestion`, at the moment the owner answers — from the harness's own
payload, which carries the real `tool_use_id` and the label the owner actually
clicked.

`src/terrain.mjs`'s `--capture-option`, `--capture-free-text` and
`--tool-use-id` are **REMOVED and refused by name**. Removed rather than
deprecated: a deprecated channel is a channel, and the finding was that this
one existed at all. Refused **by name** rather than ignored, because an ignored
flag is a session quietly getting a different act than the one it asked for.

**What was already real, and why it was not enough.** The option bound — an
answer naming an option the declaration did not offer is refused — was genuine
and is kept. It was also the only genuine thing: a mis-transcribed option that
*was* offered, or a capture issued with no gate ever rendered, was admitted,
the wait completed, and the run advanced on an answer the owner never gave.
That is the right act with the guard silently disabled, which is the failure
the ruling's own test separates from the loud one.

### 10.2 The join key is a NONCE, and that is the load-bearing choice

Every **raising** of a gate mints a `gate_instance_id`, written into the run
declaration and echoed onto the row. The executor joins a declaration to an
answer on that id **and on nothing else**.

**The row requirement is PER GATE, not global, and the scoping is a decision
rather than a weakening (round 1, finding 2).** A gate declares
`requires_gate_instance_id` in its own registry row and the check reads that
flag; the first cut put the field in `gate_row_required`, which is enforced
against every row found anywhere in the working tree. The brief lane's three
writers emit no nonce and its run state lands *inside* the working tree, which
the capture scanner reaches because it does not consult `.gitignore` — so the
first `/brief` run on any working copy would have reddened the local suite
against captures no writer in the tree could make conforming. That is precisely
the class §4.1 v4 was filed to repair, rebuilt inside a later repair. **A
requirement binds the gates whose writer emits it**, and a gate joins by
declaring the flag rather than by an edit to the check.

It is a nonce rather than anything computed, and the reason is this
repository's own:

> "A binding computed from content identifies the content, never the instance.
> So it separates two instances exactly when they differ and fails exactly when
> they are alike — which is the case you need it for, because two runs over the
> same input are the pair a reader is least able to tell apart by eye."

That is not hypothetical here. Two entries over one settled input compose the
same question and the same option set, and therefore the same
`option_set_digest` — so `answers_over` alone cannot stop one run's answer
advancing the other's wait. **`answers_over` is unchanged and is not
replaced**: it binds *what was offered*, and this binds *which raising offered
it*. The two axes are both required because they fail on different things.

### 10.3 The pointer, and what it is not

The hook sees a question and an answer; it has no way to know which run raised
the question, because a run workspace is machine-local and may sit anywhere.
So each raising writes an **open-gate pointer** — instance id, gate id,
question, declaration path, capture path — into `KOGAKI_OPEN_GATES` (default
`~/.claude/kogaki-open-gates`), removed when the row is written or the wait
advances.

**It carries no answer and grants nothing.** Nothing downstream believes a
pointer: the executor reads the *capture* and refuses without a matching row,
so deleting the whole directory costs a re-render and never an admitted
answer, and a forged pointer can only cause a row to be written where no gate
is outstanding — which the instance-id join then refuses. That is what keeps
this file off the trust surface.

**Where two outstanding pointers carry one question, the hook writes nothing
and says so.** The question text is used to *narrow*, never to *choose*.
Choosing would be the same silent misattribution the nonce exists to prevent,
arriving one step earlier; and the executor's own refusal — the harness
recorded no answer for this gate — is a stop the owner can act on, which a row
written against the wrong run is not.

**An unconsumed pointer is reaped, and that is load-bearing rather than
housekeeping (round 1, finding 3).** The two removers above — the hook after a
write, the executor at the advance — are both reached only by a run that
*finishes* the gate. A run abandoned at an outstanding one reaches neither, and
that is the ordinary outcome rather than the exotic one: it is what the
unrouted-option refusal leaves behind every time, and what a deleted run
directory or a retention prune leaves behind without touching this directory at
all. Because a gate's question is a constant string in the registry, **one
orphan makes every later raising of that gate class ambiguous**, and the
ambiguity rule above then writes nothing — so a single abandoned run would wedge
that gate on the machine until someone cleaned the directory by hand. So: a
pointer whose declaration no longer exists is dead **by observation** and is
reaped first; an age bound is the backstop for the run that still exists and was
walked away from, deliberately long because it is the reaper that could discard
a live gate, and a discarded live gate costs a re-render while an orphan costs
the class. **A re-raising also supersedes its own previous pointer**, without
which the recovery this contract prescribes — re-render after a refusal —
accumulates exactly the orphans that then block it.

**A label that neither matches nor clearly differs is UNRESOLVED, never free
text (round 1, finding 4).** The harness reports the label the owner saw, and
the row is keyed on the option id, so the hook maps one to the other. Options
here carry full-sentence labels, so a label arriving truncated or decorated
would fall through an exact comparison and be recorded as the owner's *own
words* — which is worse than a refusal in a specific way: a standing option
routed nowhere would then skip its refusal and land as a tag name or an id
list, the wedge that refusal exists to close, returning by another route. The
comparison is therefore made on collapsed whitespace, since a re-wrapped label
is the same answer; and a near-miss — either string a prefix of the other — is
recorded as unresolved and **refused by the executor**. The payload alone
cannot separate a mangled label from genuine free text, so naming the
ambiguity is the honest act where picking a reading is not.

**The refusal names its carrier**, and that is a requirement rather than a
courtesy. An un-installed hook is the one state in which re-rendering the
question changes nothing, so a refusal that does not name the hook and the
pointer sends the owner round that loop forever. The wiring is machine-local
and never committed, so a fresh clone reads as uncaptured until it is
installed — the same machine-local hold the review-lane declaration already
carries, stated rather than self-healing.

### 10.4 What this does NOT close, stated so the class is not read as shut

**Numbered 10 rather than 5, deliberately.** §5 is already this contract's
comparison clause and `checks/registry.json` cites it by that number; a second
§5 would be a synonym in a join key, which is the defect this repository refuses
one layer down from where it usually meets it.

This binds the **Terrain** gates. The brief lane's three gates
(`brief-thesis-adoption`, `brief-candidate-selection`,
`brief-specialization-ratification`) still take `--capture --tool-use-id`
composed by the session: kogaki#891 and kogaki#893 closed on the structural
half — the option-set digest and the two-axis ratification binding — and the
writer there is still the model. So the same channel is open one design over,
and a reader who takes §10 as closing the class would be wrong.

**deferred slot: the brief lane's writer.** Routing those three gates through
this same carrier is its own decision act on its own licensing issue — it is
not a mechanical extension, because the brief lane keys its declaration on the
run state rather than on a directory (§4.1 v5) and the pointer's shape has to
answer that before any format embeds a reading of it. Named here rather than
left, per the decide-or-name discipline.
