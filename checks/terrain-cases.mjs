#!/usr/bin/env node
// checks/terrain-cases.mjs — the Terrain runtime's fixture pass (kogaki#612,
// kogaki#659), moved here from `src/terrain.mjs self-test` under kogaki#1238:
// a Test lives only under the declared Check root. The cases are the same
// cases, verbatim; the runtime exports what they drive and keeps none of them.
// Run by checks/check-terrain-runtime.sh, which reads the count this file
// prints against the registry's `case_floor`.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join, resolve, sep } from "node:path";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { FormatRefusal, classMatchers, loadGrammar, refuseUnlessConformant, validateSurface } from "../src/format-guard.mjs";
import { laneDir } from "../src/runs.mjs";
import {
  COMPOSED_INPUT_FLAGS,
  DISPLAY_WRAP_COLUMNS,
  FIXTURE_PAYLOAD,
  FIXTURE_RECORD_KEY_VALUE,
  FIXTURE_STATE_PREFIX,
  GATES_REGISTRY,
  GATE_CALL_SUFFIX,
  GATE_SCHEMA,
  GATE_WORK,
  JUDGMENT_DECLARED,
  JUDGMENT_OBSERVED,
  JudgmentRefusal,
  NO_HEADLINE,
  NO_JUDGE,
  NO_SEAM,
  NO_SHARD_ADDRESSED,
  NO_SHARD_NAME,
  NO_SHARD_SERVED,
  NO_TARGET,
  REPO,
  REPORT_FORMAT,
  RUN_RECORD_FILE,
  SKILL_EXPANSION_EXECUTOR,
  STATE_WORK,
  TERRAIN_WORKFLOW_TABLE,
  classifyWriteOutcome,
  composeGateCall,
  composeIdentityCite,
  composedInputDelta,
  composedInputDigests,
  derivedBaseline,
  displayIdAbnormalLine,
  emitGateDeclaration,
  glossFor,
  harnessJudgeInvocation,
  intersectUnaddressable,
  judgeBinaryCandidates,
  judgePinLine,
  judgedEmptyNoticeLines,
  judgmentProvenance,
  loadWorkflowTable,
  neighborhoodDisplay,
  neighborhoodJudgmentsFrom,
  ownerGateDigest,
  parseShardName,
  priorPredatesCandidateIds,
  provenanceOf,
  questionShapeCommand,
  questionShapeRefusal,
  readJson,
  readOpenRunPointer,
  readRunRecord,
  readThesisCandidates,
  refreshWrittenGateCall,
  refuseTargetsOutsideCandidates,
  renderTagDisplay,
  reportJudgeLine,
  reportsDestination,
  resetQuestionShapeSupported,
  resolveJudgeBinary,
  resolveReportTargets,
  runCounts,
  runDir,
  sameIdentity,
  selectShardNames,
  setOpenedBy,
  shouldReplayPrior,
  surveyEmptinessRefusal,
  tagRow,
  thesisCandidatesSection,
  wrapDisplayLine,
  writeOpenGatePointer,
} from "../src/terrain.mjs";

// The runtime file the subprocess cases spawn, named here because the file's
// own URL is this case file now, not the runtime.
const TERRAIN_SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "src", "terrain.mjs");

    // The composed-form fixture pass (kogaki#612): pure, seam-free — every
    // case constructs its own inputs, so the trial runs with no gateway.
    let n = 0; const bad = [];
    const ok = (name, cond) => { if (cond) n++; else bad.push(name); };
    // THE ANSWERS KEY IS THE QUESTION AS SENT (PR #1048 round 1, finding 1). A
    // fixture answering with the bare declaration question would pass against a
    // pointer that also carries the bare question, and both are wrong together.
    const sentQ = (rd, decl) => {
      const p = join(rd, `${decl.id}${GATE_CALL_SUFFIX}`);
      if (!existsSync(p)) return decl.question;
      const q = readJson(p);
      return q.questions[0].question;
    };
    ok("a lesson cite composes in the identity form from the record's own fields",
      composeIdentityCite("alpha", "lesson", "product-lab@aaaaaaa") === "gloss/ELEMENTS.jsonl slug=alpha kind=lesson @aaaaaaa");
    ok("a journey cite carries its own kind in the join key",
      composeIdentityCite("alpha", "journey", "product-lab@aaaaaaa") === "gloss/ELEMENTS.jsonl slug=alpha kind=journey @aaaaaaa");
    ok("the pin's sha segment is taken as served — a bare sha pin composes too",
      composeIdentityCite("alpha", "lesson", "bbbbbbb") === "gloss/ELEMENTS.jsonl slug=alpha kind=lesson @bbbbbbb");
    ok("an absent or empty pin refuses composition rather than minting an unpinned cite",
      composeIdentityCite("alpha", "lesson", undefined) === null
      && composeIdentityCite("alpha", "lesson", "") === null
      && composeIdentityCite("alpha", "lesson", "product-lab@") === null);
    ok("the positional form is not producible by this composer",
      !/ELEMENTS\.jsonl:\d/.test(composeIdentityCite("alpha", "lesson", "product-lab@aaaaaaa")));

    // ---- THE SHARD ADDRESS IS SELECTED FROM THE SERVED ENUMERATION, NEVER
    // COMPOSED (kogaki#1106). Seam-free by construction, and that is the point
    // rather than a convenience: the property is about ADDRESS SELECTION, so a
    // case that had to reach a gateway to drive it would be asserting the seam
    // — which is exactly what was already monitored and exactly what stayed
    // green through the whole drift.
    //
    // THE SERVED NAMES BELOW ARE A TRANSCRIPT, not an invention:
    // `surface_names(kind: "gloss")` at product-lab@7e109c8c serves 132 names
    // in these six cell shapes.
    const SERVED = [
      "lessons/tag=agents,window=2026-07",
      "lessons/tag=agents,window=2026-08",
      "lessons/tag=agents,window=undated",
      "lessons/tag=method,window=2026-08,date=2026-08-16",
      "lessons/tag=product-design",
      "journeys/tag=agents,window=2026-08",
      "decisions/thread=articles,window=2026-08",
    ];
    ok("a served name parses into its namespace and the axis=value pairs of its cell",
      (() => {
        const sn = parseShardName("lessons/tag=method,window=2026-08,date=2026-08-16");
        return sn.namespace === "lessons"
          && sn.cell.get("tag") === "method"
          && sn.cell.get("window") === "2026-08"
          && sn.cell.get("date") === "2026-08-16";
      })());
    // THE CONTROL THAT KEEPS THE FAULT VISIBLE. If the retired one-axis form
    // parsed as a cell carrying `tag=agents`, the selector would match the very
    // address the surface stopped serving, the fetch would form it again, and
    // the miss would be invisible exactly as it was for six days.
    ok("the retired one-axis form does not parse as a cell carrying that tag",
      (() => {
        const sn = parseShardName("lessons/agents");
        return sn.namespace === "lessons" && sn.cell.get("tag") === undefined;
      })());
    ok("a tag selects EVERY served cell carrying it, in the order the surface served them",
      selectShardNames(SERVED, "lessons", "agents").join("|")
        === "lessons/tag=agents,window=2026-07|lessons/tag=agents,window=2026-08|lessons/tag=agents,window=undated");
    ok("selection is namespace-scoped, and a cell with no window is selected like any other",
      selectShardNames(SERVED, "journeys", "agents").join("|") === "journeys/tag=agents,window=2026-08"
      && selectShardNames(SERVED, "lessons", "product-design").join("|") === "lessons/tag=product-design"
      // The `decisions` namespace shards by `thread`, so no `tag` addresses it
      // — the discriminator that selection reads the CELL rather than the path.
      && selectShardNames(SERVED, "decisions", "articles").length === 0);
    ok("a tag the enumeration names no shard for selects nothing rather than composing an address for it",
      selectShardNames(SERVED, "lessons", "knowledge-architecture").length === 0);

    // ---- AND THE FAULT IS REPORTED AS AN ADDRESS FAULT (kogaki#1106). Every
    // case below drives `glossFor`, because the marker is what a reader sees and
    // the seam token is what a caller reads; asserting the token alone would
    // leave the row rendering whatever it rendered before.
    const addrRow = { slug: "alpha", family: "lesson", tags: ["agents"] };
    const missEntry = { headline: NO_HEADLINE, cite: null, found: false };
    ok("a total address fault renders the address marker, never the read-and-empty one",
      glossFor(addrRow, missEntry, "address-fault", ["lessons"]) === NO_SHARD_NAME);
    // THE TWO ARE SEPARATE BECAUSE A CORPUS THAT LOST EVERY ENTRY AND A SCHEME
    // THAT RENAMED EVERY ENTRY ARE OTHERWISE THE SAME OBSERVATION, and a reader
    // who cannot tell them apart repairs the wrong one.
    ok("an empty corpus renders its own marker, distinct from the address fault and from the seam",
      glossFor(addrRow, missEntry, "empty-corpus", ["lessons"]) === NO_SHARD_SERVED
      && NO_SHARD_SERVED !== NO_SHARD_NAME
      && NO_SHARD_SERVED !== NO_SEAM);
    // THE PARTIAL ARM, which the aggregate cannot answer: one tag was named and
    // read, another was not, so the pull is `answered` while this row was never
    // addressed at all.
    // THE QUANTIFIER, ASSERTED (PR #1107 round 1, blocking). The report path
    // reads two namespaces, and a tag served under `lessons` alone is a tag the
    // `journeys` pass names no shard for — so the union answers "unaddressable"
    // for a tag whose shard was selected, requested and read. Only the
    // intersection answers the question the row arm asks.
    ok("a tag unaddressable in ONE namespace but named in another is not unaddressable for the pull",
      (() => {
        const lessons = new Set(["knowledge-architecture"]);
        const journeys = new Set(["knowledge-architecture", "agents", "testing"]);
        const both = intersectUnaddressable([lessons, journeys]);
        return both.size === 1 && both.has("knowledge-architecture")
          // THE CONTROL that this is an intersection rather than a first-wins
          // read: the single-namespace answer is the set itself, and no
          // namespace read at all establishes nothing about any tag.
          && intersectUnaddressable([journeys]).size === 3
          && intersectUnaddressable([]).size === 0;
      })());
    ok("a row whose every tag is unaddressable renders the address marker even when the pull as a whole answered",
      glossFor({ slug: "bravo", family: "lesson", tags: ["knowledge-architecture"] },
        missEntry, "answered", ["lessons"], new Set(["knowledge-architecture"])) === NO_SHARD_NAME
      // THE CONTROL: a row with an addressed tag keeps the read-and-empty
      // marker, so the arm above is about the ROW and not a blanket downgrade.
      && glossFor(addrRow, missEntry, "answered", ["lessons"], new Set(["knowledge-architecture"])) === NO_HEADLINE);

    // ---- AN EMPTY SURVEY IS A REFUSAL (kogaki#1026). The cases drive the
    // composer the refusal is made of, and the ACT is asserted beside it in
    // `checks/check-terrain-runtime.sh`'s sibling arm — the composer answering
    // correctly while the caller printed and carried on is exactly the state
    // the 2026-09-09 runs were in.
    //
    // THESE ARE THE REMOVAL TEST TOO (acceptance 3). Nothing here reads the
    // skill file or the Spec: `surveyEmptinessRefusal` is a pure function of
    // this module, so the cases pass with both absent from the tree, which is
    // what makes the refusal the executor's own code path rather than a rule
    // carried in prose beside it.
    ok("the miss shape refuses as a statement about the CALL, naming 0 served lines and the pin",
      (() => {
        const r = surveyEmptinessRefusal(0, 0, "product-lab@0f31c3b");
        return typeof r === "string"
          && /0 served line\(s\)/.test(r)
          && r.includes("pin product-lab@0f31c3b")
          && /about the CALL/.test(r);
      })());
    ok("a served response with records and no Lesson refuses as a statement about the CORPUS, naming the count and the pin",
      (() => {
        const r = surveyEmptinessRefusal(12, 0, "product-lab@0f31c3b");
        return typeof r === "string"
          && r.includes("12 served record(s)")
          && r.includes("pin product-lab@0f31c3b")
          && /about the CORPUS/.test(r);
      })());
    ok("an absent pin is NAMED rather than elided — the operator is told which pin was read, or that none was",
      surveyEmptinessRefusal(0, 0, undefined).includes("pin absent"));
    ok("a survey with candidates is not a refusal, so the ordinary path is untouched",
      surveyEmptinessRefusal(0, 1, "product-lab@0f31c3b") === null
      && surveyEmptinessRefusal(9, 4, "product-lab@0f31c3b") === null);
    ok("the two refusals are DISTINGUISHABLE — the whole point is telling the call apart from the corpus",
      surveyEmptinessRefusal(0, 0, "p@a") !== surveyEmptinessRefusal(12, 0, "p@a"));
    // ---- THE ABBREVIATED-FORM COMPILER (kogaki#653). A `…` in a `form`
    // abbreviates the rest of a long fixed line, so the class matches as a
    // PREFIX. The compiler truncated per split-part, and the masked form is
    // split on digit runs to find placeholder indices — so an abbreviated tail
    // CONTAINING DIGITS was scattered across parts the truncation never
    // reached, and every later fragment was demanded as literal prefix text.
    //
    // THE ASSERTION IS OVER THE BEHAVIOUR, not over the compiler's text: for
    // each surface declaring `abnormal_display_id`, the line
    // `displayIdAbnormalLine` ACTUALLY EMITS must be admitted. That is the
    // class's whole purpose — the display-ID rule's absence case reaching the owner surface —
    // and it had never once been true, on either surface, because the failure
    // fires only on the abnormal path nothing exercised.
    {
      const grammar = loadGrammar(REPORT_FORMAT);
      const emitted = displayIdAbnormalLine(2, 3);
      const admits = (surface) => {
        try { refuseUnlessConformant(surface, emitted, grammar); return true; }
        catch (e) { if (e instanceof FormatRefusal) return false; throw e; }
      };
      // ONE DECLARING SURFACE. `cotag_groups` is the only surface an emit site
      // renders this line into (the two call sites above, in the co-tag group
      // renderer), so it is the only surface asserted here — a surface no emit
      // site reaches would be admitted against nothing.
      for (const surface of ["cotag_groups"]) {
        ok(`${surface} admits the line displayIdAbnormalLine actually emits`, admits(surface));
      }
      // The control: an abbreviated form whose tail carries NO digit worked
      // before this repair and must still work, so the fix is not a widening.
      ok("an abbreviated form with a digit-free tail still matches (classification)",
        (() => {
          try {
            refuseUnlessConformant("cotag_groups",
              "Classification: NAVIGATION (SPEC.md, the second-proposer boundary — it ranks nothing, narrows nothing and hides nothing.)",
              grammar);
            return true;
          } catch (e) { if (e instanceof FormatRefusal) return false; throw e; }
        })());
    }

    // ---- the control plane CONTROL PLANE (story 1.89). Seam-free: every case below either
    // reads the shipped table or constructs a synthetic one, and no case
    // reaches the gateway. AC8: this pass needs no run record and emits no
    // owner surface.
    const shipped = loadWorkflowTable(TERRAIN_WORKFLOW_TABLE);
    // The write-outcome classifier's three directions (PR #667 round 1 finding
    // 2). The executor's guard reads this, so these are the cases that separate
    // "wrote nothing deliberately" from "wrote and did not say where".
    ok("a renderer that names its artifact is `wrote`",
      classifyWriteOutcome({ artifact: "reports/FullReport.md" }) === "wrote");
    ok("a renderer that RAN and deliberately wrote nothing is `wrote-nothing`, not a refusal — --no-render and the idempotent rerun are both this",
      classifyWriteOutcome({ artifact: null }) === "wrote-nothing");
    ok("a renderer returning nothing at all is `named-nothing` — the case the guard was built for",
      classifyWriteOutcome(null) === "named-nothing");
    ok("an outcome object with no `artifact` KEY is `named-nothing` too, so a renderer cannot pass the guard by omitting the field",
      classifyWriteOutcome({ something_else: 1 }) === "named-nothing");

    ok("the shipped workflow table loads under the structural rules",
      Array.isArray(shipped.states) && shipped.states.length > 0);
    {
      // ACCEPTANCE ITEM 2's DENOMINATOR AGREES WITH ITSELF. The baseline this
      // executor counts against is DERIVED from the states array; the table
      // also carries a hand-written `counted_baseline`. They are two readings
      // of one array and a disagreement is a defect in the table, so the
      // fixture asserts they agree rather than trusting either alone.
      const d = derivedBaseline(shipped);
      const c = shipped.counted_baseline || {};
      const disagree = Object.keys(d).filter((k) =>
        Object.prototype.hasOwnProperty.call(c, k) && c[k] !== d[k]);
      ok(`the table's counted_baseline agrees with the baseline derived from its own states array${disagree.length ? ` (disagrees on: ${disagree.map((k) => `${k} declared ${c[k]} derived ${d[k]}`).join(", ")})` : ""}`,
        disagree.length === 0);
    }
    ok("run counts read from a record alone, with conditional entries counted separately",
      (() => {
        const c = runCounts({
          waits_reached: ["A", "B"],
          artifacts_written: [{ state: "x" }, { state: "y" }],
          judgments: { J1: "p", J2: "q" },
          conditional_entered: ["z"],
        });
        return c.waits === 2 && c.owner_artifact_writes === 2
          && c.judgment_points === 2 && c.conditional_states_entered === 1;
      })());

    {
      // THE REFUSING DIRECTIONS, each against a fixture that exists to fail.
      // `fail()` exits the process, so these run as subprocesses — the same
      // shape the registered checks use, and the only one that can observe an
      // exit code from inside a fixture pass.
      const selfPath = TERRAIN_SCRIPT;
      const scratch = join(tmpdir(), `terrain-selftest-${process.pid}`);
      mkdirSync(scratch, { recursive: true });
      const refuses = (name, table, extra = []) => {
        const tp = join(scratch, `${name.replace(/[^a-z0-9]+/gi, "-")}.json`);
        const rd = join(scratch, `rd-${name.replace(/[^a-z0-9]+/gi, "-")}`);
        mkdirSync(rd, { recursive: true });
        if (table !== null) writeFileSync(tp, JSON.stringify(table));
        const r = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rd, "--workflow", table === null ? TERRAIN_WORKFLOW_TABLE : tp, ...extra],
          { input: FIXTURE_PAYLOAD, encoding: "utf8" });
        return r.status !== 0;
      };
      const terminal = { id: "done", kind: "terminal" };

      // A REFUSAL IS NOT A ROLLBACK (kogaki#808). The specimen was
      // `J3_neighborhood`: `neighborhood_input` writes the candidate
      // enumeration into the run directory, the judgment state then refuses for
      // want of `--neighborhood`, and `fail()` exited before the loop's own
      // write — so the enumeration was on disk and the record did not name it.
      //
      // THE ARM DRIVES THE PROPERTY, NOT THE SPECIMEN, and that is a choice
      // rather than a shortcut: `neighborhood_input` reads the seam, and this
      // pass is seam-free by construction. What makes the substitution faithful
      // is that the specimen's loss had nothing to do with the neighborhood —
      // it was a completed transition discarded by a later refusal in the same
      // act, which is exactly what this fixture stages.
      //
      // THE REFUSAL MUST FIRE INSIDE THE LOOP, and the first cut of this arm did
      // not: it used an uninterpretable KIND, which `loadWorkflowTable` refuses
      // at load, before any state runs. Nothing had completed, so nothing was
      // lost, and the arm passed against the unfixed runtime for a reason that
      // had nothing to do with the property. The fixture below refuses at the
      // renderer binding instead — a check the loop makes per state, after the
      // states before it have completed.
      {
        const tp = join(scratch, "refusal-persists.json");
        const rd = join(scratch, "rd-refusal-persists");
        mkdirSync(rd, { recursive: true });
        writeFileSync(tp, JSON.stringify({ version: 1, states: [
          { id: "a", kind: "compute" },
          // THE CONDITIONAL STATE IS NOW SKIPPED RATHER THAN ENTERED
          // (kogaki#1027). `--enter` was the selector that entered one and it is
          // deleted, so the loop-bookkeeping FIELD this arm needs beside
          // `completed` is `conditional_skipped` instead of
          // `conditional_entered`. The property under test is unchanged — a
          // refusal persists what the act completed, fields included — and it
          // is asserted over the field the loop still writes.
          { id: "cond", kind: "compute", conditional: "never entered: the selector that entered a conditional state is deleted (kogaki#1027)" },
          { id: `${FIXTURE_STATE_PREFIX}sets_record_key`, kind: "compute" },
          { id: "unrendered", kind: "write", writes: "display" },
          terminal,
        ] }));
        const r = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rd, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8" });
        const persisted = readRunRecord(rd);
        ok("a refusal raised inside a run still refuses — exit is non-zero and the message is the refusal's own",
          r.status !== 0 && /no renderer bound to it/.test(r.stderr || ""), (r.stderr || "").trim().slice(0, 120));
        ok("a refusal PERSISTS the run record, so the transitions the same act completed survive it (kogaki#808)",
          persisted !== null, "no run record was written at all");
        ok("the persisted record names the state that completed before the refusal — a refusal stops being a rollback of what preceded it",
          !!persisted && Array.isArray(persisted.completed) && persisted.completed.includes("a"),
          persisted ? JSON.stringify(persisted.completed) : "(no record)");
        // A FIELD BESIDE THE COMPLETION LIST (PR #821 round 1). The loss #808
        // names is a FIELD — `neighborhood_candidates` on disk and unnamed by
        // the record — so a pass asserting `completed` alone stays green through
        // a later narrowing of what is persisted, and re-opens the specimen
        // while reporting nothing.
        //
        // `conditional_entered` IS LOOP BOOKKEEPING, AND THE COMMENT THAT SAID
        // OTHERWISE WAS FALSE (kogaki#824, shipped at 91b4947 and corrected
        // here). It read "a transition's own record effect rather than the
        // loop's bookkeeping of which states ran"; the executor writes it in the
        // advance loop three lines from `rec.completed.push(st.id)` and beside
        // `conditional_skipped`. So this case NARROWS the seam and does not
        // close it: it fails a persist reduced to `{completed}` alone, and
        // PASSES one reduced to control fields — which is the narrowing the
        // round-1 finding actually named. The case below is the one that binds
        // the property, and the two are kept apart so a later reader can tell
        // which assertion carries which claim.
        ok("the persisted record carries a FIELD the loop set — not only the list of what completed",
          !!persisted && Array.isArray(persisted.conditional_skipped) && persisted.conditional_skipped.includes("cond"),
          persisted ? JSON.stringify(persisted.conditional_skipped) : "(no record)");
        // THE CASE THAT BINDS THE PROPERTY (kogaki#824). `fixture_record_key` is
        // written by the fixture-only state's OWN RENDERER and by nothing else —
        // no loop touches it — so a persist reduced to control fields drops it
        // and this case alone goes red. That is the discrimination the case
        // above cannot make, and it is asserted on the VALUE rather than on
        // presence, so a persist that carried the key with its contents lost
        // fails too.
        ok("the persisted record carries a key written by a STATE'S OWN RENDERER, which is the shape of the loss #808 names — a persist narrowed to control fields drops this while keeping the case above green",
          !!persisted && persisted.fixture_record_key === FIXTURE_RECORD_KEY_VALUE,
          persisted ? JSON.stringify(persisted.fixture_record_key) : "(no record)");
        // THE FIXTURE-ONLY ADMISSION IS BOUNDED BY THIS CASE, never by the
        // comment in `STATE_WORK`. The workflow table puts the state set in the carrier, so
        // what makes the renderer above harmless is that its id never reaches
        // `src/terrain-workflow.json` — asserted here rather than trusted, because an
        // admission whose whole guarantee is a comment is the class kogaki#824
        // is a member of.
        {
          // THE UNREADABLE-CARRIER GUARD IS DECLINED, AND THE DECLINE IS
          // MEASURED (PR #852 round 1, out-of-dimension). The observation — that
          // an unreadable `src/terrain-workflow.json` would abort here with a parse
          // error rather than failing this case by name — is correct in
          // principle and UNREACHABLE at this head: the module reads the same
          // carrier at evaluation time, so a malformed table kills the process
          // at import and this case never runs. Verified by writing `{ not json`
          // into the carrier: the pass dies in ModuleJob.run and prints no case
          // at all. A try/catch here would be dead code, which is the shape this
          // PR exists to argue against.
          const shipped = readJson(TERRAIN_WORKFLOW_TABLE);
          const leaked = (shipped.states || []).map((x) => String(x.id))
            .filter((id) => id.startsWith(FIXTURE_STATE_PREFIX));
          ok("the shipped workflow table names no fixture-only state — the STATE_WORK admission is bounded by a case, not by a comment",
            Array.isArray(shipped.states) && shipped.states.length > 0 && leaked.length === 0,
            JSON.stringify(leaked));
        }
        ok("the persisted record carries no internal run-directory handle — the refusal path writes the same shape the loop's own write does",
          !!persisted && persisted._dir === undefined);
      }

      // ITEM 2 OF THE SAME ISSUE: the flag existed, the table named it, and the
      // one surface an owner reads did not. Asserted here because a usage block
      // is exactly the kind of prose that drifts from the argument it documents
      // with nothing observing the gap.
      {
        const r = spawnSync(process.execPath, [selfPath], { encoding: "utf8" });
        const usage = (r.stdout || "") + (r.stderr || "");
        ok("`run` usage names --neighborhood, the flag whose absence was previously discoverable only from a refusal",
          /run \[--run-dir[\s\S]{0,400}--neighborhood F/.test(usage));
        ok("`report` usage names the identity QUADRUPLE rather than the triple it was widened from at kogaki#741",
          /QUADRUPLE \(substrate pin/.test(usage) && !/identified by the TRIPLE/.test(usage));
      }

      ok("a table declaring no states is refused",
        refuses("no-states", { version: 1, states: [] }));
      ok("a duplicate state id is refused",
        refuses("dup-id", { version: 1, states: [{ id: "a", kind: "compute" }, { id: "a", kind: "compute" }, terminal] }));
      ok("a kind this executor does not interpret is refused, rather than skipped",
        refuses("bad-kind", { version: 1, states: [{ id: "a", kind: "sideways" }, terminal] }));
      ok("a write state naming no artifact is refused",
        refuses("write-no-artifact", { version: 1, states: [{ id: "a", kind: "write" }, terminal] }));
      ok("a table with no terminal state is refused — the end of a run is read from the table, never from position",
        refuses("no-terminal", { version: 1, states: [{ id: "a", kind: "compute" }] }));
      ok("a write state with no renderer bound to it is refused, never invented and never skipped",
        refuses("write-no-renderer", {
          version: 1,
          owner_artifacts: { display: { path: "reports/CoTagGroups.md", writer: "one" } },
          states: [{ id: "not_a_shipped_state", kind: "write", writes: "display" }, terminal],
        }));
      ok("an owner input arriving with no outstanding wait is refused — the WAIT is what admits it",
        refuses("input-no-wait", null, ["--input", "claude-code-ops"]));
      rmSync(scratch, { recursive: true, force: true });
    }

    // THE LANE BINDING (kogaki#750). Every case above drives an explicit
    // `--run-dir`, which is the path the relocation did NOT touch, so on their
    // own they are green about a runtime still writing to the retired home
    // directory. These read the DEFAULTS.
    {
      const laneRoot = laneDir("terrain");
      ok("the report record store defaults into the terrain lane",
        reportsDestination({}) === join(laneRoot, "reports"), reportsDestination({}));
      ok("the terrain lane resolves under the repository's runs/ directory",
        laneRoot === join(REPO, "runs", "terrain"), laneRoot);
      ok("no default record destination resolves under a home directory",
        !reportsDestination({}).includes(`${sep}.kogaki${sep}`));
      ok("an explicit --report-dir still wins over the lane default",
        reportsDestination({ "report-dir": "/tmp/elsewhere" }) === "/tmp/elsewhere");
      // NOT ASSERTED HERE, stated rather than left to look covered: `runDir`'s
      // DEFAULT branch. Exercising it calls `enterRun`, which prunes this
      // repository's own terrain lane — a fixture pass that evicts a
      // developer's run workspaces reports a defect by causing one. The
      // arithmetic it delegates to is asserted in `src/runs.mjs --self-test`
      // against a scratch root; what is unasserted here is one expression
      // naming the lane, and that is the honest size of the gap.
      ok("an explicit --run-dir is honoured and creates exactly it", (() => {
        const d = join(tmpdir(), `terrain-rundir-${process.pid}`);
        const got = runDir({ "run-dir": d });
        const fine = got === d && existsSync(d);
        rmSync(d, { recursive: true, force: true });
        return fine;
      })());
    }

    // ---- THE FIRST-TAG GATE CARRIES ITS LISTING (kogaki#856).
    //
    // THE DEFECT THESE ASSERT AGAINST. At `TAG_SELECTION` the executor printed
    // a block headed "READ FIRST, and run it YOURSELF" naming three commands
    // for the owner to type, and the listing itself never reached the screen.
    // The owner does not run commands, so the owner was asked to name a tag
    // with nothing to choose from and selected from memory. Two prior issues
    // (#737, #807) repaired this area and both closed on artifact diffs while
    // the hop stayed broken.
    //
    // WHY THESE REPLACE kogaki#807's EIGHT CASES RATHER THAN JOINING THEM. Those
    // asserted that every `owner_reads` key reached the stop output, and this
    // change removes the field. `checks/registry.json` names the retirement
    // condition in the member's own removal signal — "or when the table stops
    // declaring owner_reads at all" — so they are RETIRED, not re-pointed at
    // whatever now occupies the same structural position. A check whose unit a
    // redesign dissolved does not become a lenient check; it stops being one.
    // consulted: product-lab@7e1bba09ae982ffa7e322463fdb052379c77a77d LESSONS.md:133
    {
      const wf = readJson(join(REPO, "src", "terrain-workflow.json"));
      const states = wf.states || [];
      const ts = states.find((st) => st && st.id === "TAG_SELECTION");

      // THE CONCEPT IS GONE, not merely unused on one state. A schema key no
      // state declares is an invitation to declare one, and what would be
      // declared is the channel this issue removed.
      ok("no state in the shipped table declares an owner_reads hand-over — the field and its renderer are retired",
        states.every((st) => st && st.owner_reads === undefined)
          && (wf.field_semantics || {}).owner_reads === undefined,
        states.filter((st) => st && st.owner_reads).map((st) => st.id).join(", ") || "field_semantics still declares it");
      ok("no owner-executed entry point survives — the map is present and empty, so an empty set is stated rather than dropped",
        wf.owner_executed_entry_points !== undefined
          && Object.keys(wf.owner_executed_entry_points).length === 0,
        JSON.stringify(wf.owner_executed_entry_points));

      // THE WAIT MUST ACTUALLY REACH THE COMPOSER. Either half missing lands it
      // in the executor's "OWED AND UNWRITTEN" branch, where the run is not
      // stuck and the listing is never composed — which is the pre-fix
      // behaviour wearing a gate's clothes.
      ok("TAG_SELECTION declares a gate and names a gate_id the registry carries",
        !!ts && ts.renders_gate_declaration === true
          && (GATES_REGISTRY.gates || []).some((g) => g.id === ts.gate_id),
        ts ? JSON.stringify({ decl: ts.renders_gate_declaration, gate_id: ts.gate_id }) : "(no TAG_SELECTION state)");
      ok("an option composer is bound to TAG_SELECTION — without one the executor records the declaration as owed and unwritten",
        typeof GATE_WORK.TAG_SELECTION === "function");

      const surveyPath = join(REPO, "checks", "fixtures", "survey", "lone-tag-member.json");
      const surveyRec = readJson(surveyPath);
      const composed = GATE_WORK.TAG_SELECTION({ survey_record: surveyPath });

      // ACCEPTANCE ITEM 2, asserted as byte equality rather than as
      // containment: the declaration carries the `tag_listing` SURFACE over
      // this survey record, so no party composed, trimmed or re-rendered it.
      ok("the declaration's tag_listing is BYTE-EQUAL to the tag_listing surface over the same survey record",
        composed.extra.tag_listing === renderTagDisplay(surveyRec),
        JSON.stringify(composed.extra.tag_listing || "").slice(0, 140));

      // EXACTLY TWO WAYS TO ANSWER (owner rulings 1 and 2, 2026-09-04): the
      // standing option, and free text. The composer contributes none of its
      // own, and the standing one is the premise negation the gate owes.
      // TWO TO FOUR OPTIONS, because that is the selector's format (kogaki#1029,
      // the first live hook-driven run: one option was refused by the harness).
      // The run contributes the largest served tags, ids = tag names, and the
      // standing option rides beside them.
      const rankedNames = [...surveyRec.sections]
        .sort((a, b) => (((b.by_family || {}).lesson || 0) - ((a.by_family || {}).lesson || 0)) || String(a.name).localeCompare(String(b.name)))
        .slice(0, 3).map((x) => String(x.name));
      ok("the composer offers the largest served tags as options, ids equal to the tag names, at most three",
        Array.isArray(composed.options) && composed.options.length === Math.min(3, surveyRec.sections.length)
          && composed.options.every((o, i) => o.id === rankedNames[i] && o.label === tagRow(surveyRec.sections.find((x) => String(x.name) === o.id))),
        JSON.stringify(composed.options));

      // THE BYTES REACH THE ARTIFACT, not only the composer's return value.
      // The session renders the FILE, so a declaration that dropped the key on
      // the way to disk would leave the listing exactly as unreachable as
      // before.
      {
        const gd = join(tmpdir(), `terrain-selftest-gate-${process.pid}`);
        mkdirSync(gd, { recursive: true });
        // ISOLATED FROM THE MACHINE'S OWN SIDECAR DIRECTORY (kogaki#1153): this
        // in-process call runs inside whatever session invoked the self-test, and
        // `emitGateDeclaration` now writes a sidecar keyed by that session's id —
        // so without an override this case would write into the real
        // `~/.claude/gate-declarations/<session_id>.json` the invoking session
        // may itself depend on.
        const sidecarDir = join(tmpdir(), `terrain-selftest-sidecar-${process.pid}`);
        const savedSidecarDir = process.env.GATE_DECLARATION_SIDECAR_DIR;
        const savedSessionId = process.env.CLAUDE_CODE_SESSION_ID;
        process.env.GATE_DECLARATION_SIDECAR_DIR = sidecarDir;
        process.env.CLAUDE_CODE_SESSION_ID = "terrain-selftest-sidecar-session";
        let declPath;
        try {
          declPath = emitGateDeclaration(gd, "terrain-tag-selection", composed.options, composed.extra);
        } finally {
          if (savedSidecarDir === undefined) delete process.env.GATE_DECLARATION_SIDECAR_DIR;
          else process.env.GATE_DECLARATION_SIDECAR_DIR = savedSidecarDir;
          if (savedSessionId === undefined) delete process.env.CLAUDE_CODE_SESSION_ID;
          else process.env.CLAUDE_CODE_SESSION_ID = savedSessionId;
        }
        const decl = readJson(declPath);
        ok("the WRITTEN declaration carries the listing — the bytes reach the file the session renders, not only the composer's return",
          decl.tag_listing === renderTagDisplay(surveyRec));
        ok("the written declaration offers the tag options plus the standing option — between two and four, a shape the selector renders — and free text",
          decl.options.length >= 2 && decl.options.length <= 4
            && decl.options[decl.options.length - 1].id === "other-method"
            && decl.options.slice(0, -1).every((o, i) => o.id === rankedNames[i])
            && decl.free_text_offered === true,
          JSON.stringify(decl.options.map((o) => o.id)));

        // THE SIDECAR IS THE FIX (kogaki#1153): `emitGateDeclaration` writes
        // `~/.claude/gate-declarations/<session_id>.json` at the same moment it
        // writes `gate-call.json`, so `lint-gate-declaration.py`'s primary
        // carrier is populated before the open-gate interval ever denies a
        // write to it — no tool call, no assistant-text race.
        const sidecarPath = join(sidecarDir, "terrain-selftest-sidecar-session.json");
        const sidecar = readJson(sidecarPath);
        ok("emitGateDeclaration writes the gate-declaration sidecar keyed by the session id, at the same moment as gate-call.json",
          sidecar["1"] === "gate-declaration (question 1):\ngate: mechanical",
          JSON.stringify(sidecar));

        rmSync(gd, { recursive: true, force: true });
        rmSync(sidecarDir, { recursive: true, force: true });
      }

      // ACCEPTANCE ITEM 2's FIRST CLAUSE, AT THE SIZE IT NAMES (kogaki#1029;
      // PR #1061 round 1, finding 2). Everything above compares the composer
      // against `renderTagDisplay` over a THREE-section record, and the
      // hook-side cases in `checks/check-open-gate-exclusivity.sh` drive
      // payloads that check writes itself. So a renderer that dropped rows past
      // some N would satisfy both sides of the byte-equality above AND every
      // deny case over there, while the owner read a truncated table. The clause
      // is "a survey with 17 tags carries all 17 rows", and this is the only
      // case anywhere that reads a seventeen-section record.
      //
      // THE RECORD IS BUILT HERE RATHER THAN COMMITTED AS A FIXTURE. Seventeen
      // sections cloned from this survey's own differ from it in exactly one
      // field, the name, so a failure is about the COUNT and never about a
      // second record's shape having drifted from the first's.
      {
        const many = {
          ...surveyRec,
          sections: Array.from({ length: 17 }, (_, i) => ({
            ...surveyRec.sections[i % surveyRec.sections.length],
            name: `tag-${String(i + 1).padStart(2, "0")}`,
          })),
        };
        const manyPath = join(tmpdir(), `terrain-selftest-17tags-${process.pid}.json`);
        writeFileSync(manyPath, JSON.stringify(many));
        const listing17 = renderTagDisplay(many);
        const rows17 = listing17.split("\n").filter((l) => l.startsWith("  ") && l.trim());
        ok("a seventeen-tag survey renders seventeen tag rows — one per section, none dropped",
          rows17.length === 17 && many.sections.every((sec) => listing17.includes(tagRow(sec))),
          JSON.stringify({ rendered: rows17.length, sections: many.sections.length }));

        const composed17 = GATE_WORK.TAG_SELECTION({ survey_record: manyPath });
        ok("the declaration over a seventeen-tag survey carries that listing whole",
          composed17.extra.tag_listing === listing17,
          JSON.stringify((composed17.extra.tag_listing || "").length));

        // The end of the clause: the bytes the OWNER is shown. `composeGateCall`
        // is what puts the listing in front of the question, and this asserts
        // every one of the seventeen rows survives that composition.
        const call17 = composeGateCall({
          id: "terrain-tag-selection", question: "Which tag does the survey open on?",
          options: composed17.options, free_text_offered: true, ...composed17.extra,
        });
        const q17 = (call17.tool_input || { questions: [{}] }).questions[0].question || "";
        ok("the composed gate call for a seventeen-tag survey carries all seventeen rows in the question the owner reads",
          q17.startsWith(`${listing17}\n\n`) && many.sections.every((sec) => q17.includes(tagRow(sec))),
          JSON.stringify({ missing: many.sections.filter((sec) => !q17.includes(tagRow(sec))).map((sec) => sec.name) }));
        rmSync(manyPath, { force: true });
      }

      // THE ORDER IS THE DEFECT. A declaration carrying the bytes and a stop
      // that never says when to show them reproduces exactly what was filed:
      // the question rendered with the table nowhere on screen.
      {
        const selfPath = TERRAIN_SCRIPT;
        const gs = join(tmpdir(), `terrain-selftest-tagstop-${process.pid}`);
        const rd = join(gs, "rd");
        mkdirSync(rd, { recursive: true });
        // EVERY EXECUTOR SPAWN IN THIS CASE CARRIES THE TEST SEAM (kogaki#1046).
        // The two spawns below declare the tag gate, and a declaration writes an
        // open-gate pointer; without `KOGAKI_OPEN_GATES` that pointer lands in
        // the owner's live directory, where the capture hook's refuse-when-
        // ambiguous rule then drops the next real answer -- which is what
        // happened on 2026-09-09, three pointers per self-test run.
        //
        // AND THE SIDECAR IS THE SECOND SUCH DIRECTORY (kogaki#1153). The same
        // act now also writes `~/.claude/gate-declarations/<session_id>.json`,
        // which `lint-gate-declaration.py` reads as its PRIMARY carrier — so a
        // spawn isolating only the pointer would have this case declare a gate
        // on behalf of whatever session ran the suite. Isolated here on exactly
        // the terms the pointer is, and ASSERTED below rather than assumed.
        const execSidecar = join(gs, "gate-declarations", "exec");
        const execEnv = {
          ...process.env,
          KOGAKI_OPEN_GATES: join(gs, "open-gates", "exec"),
          GATE_DECLARATION_SIDECAR_DIR: execSidecar,
          CLAUDE_CODE_SESSION_ID: "terrain-selftest-tagstop-session",
        };
        const tp = join(gs, "table.json");
        writeFileSync(tp, JSON.stringify({ version: 1, states: [
          { id: "TAG_SELECTION", kind: "wait", owner_supplies: "one tag name, or the standing option",
            renders_gate_declaration: true, gate_id: "terrain-tag-selection" },
          { id: "done", kind: "terminal" },
        ] }));
        writeFileSync(join(rd, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        const r = spawnSync(process.execPath, [selfPath, "run", "--run-dir", rd, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: execEnv });
        const out = `${r.stdout || ""}${r.stderr || ""}`;
        ok("a run reaching TAG_SELECTION stops with its declaration WRITTEN rather than owed and unwritten",
          r.status === 0 && /run declaration is WRITTEN/.test(out) && !/OWED AND UNWRITTEN/.test(out),
          out.trim().split("\n").slice(-3).join(" | ").slice(0, 160));
        // THE ORDER IS NOW A PROPERTY OF THE PAYLOAD, NOT OF THE STOP TEXT
        // (kogaki#1028 item 1). kogaki#856's case asserted that the stop TOLD the
        // session to put the listing on screen before the question; the listing
        // now rides inside the question text of the call the executor composed,
        // so what is asserted is that the call exists, is named, and carries the
        // listing above the question line. An instruction the session could
        // decline to follow has become bytes the PreToolUse hook compares.
        ok("the stop names the WRITTEN AskUserQuestion call rather than instructing the session to compose one",
          /call is WRITTEN/.test(out) && /byte-for-byte/.test(out) && !/OWED AND UNWRITTEN/.test(out),
          out.split("\n").filter((l) => /call is WRITTEN|byte-for-byte/.test(l)).join(" | ").slice(0, 200));
        // AND THE BYTES ARE ON THE STDOUT, NOT ONLY THEIR ADDRESS (kogaki#1057
        // item 3, the fixture the issue asks for). This is the case that would
        // have failed on 2026-09-09: the stop named the call and printed none of
        // it, and the session's one admissible act needed bytes that no
        // admissible act could fetch. It asserts the delivery rather than the
        // wording -- the block is PARSED and canonicalised against the written
        // file, so a printed path, a summary, or a re-serialisation that dropped
        // or reordered a field is a failure, and a re-worded sentence around the
        // block is not.
        {
          const callPath = join(rd, `terrain-tag-selection${GATE_CALL_SUFFIX}`);
          // The same canonicalisation the PreToolUse hook compares with: key
          // order is not part of the payload, and everything else is.
          const canon = (v) => JSON.stringify(v, (_k, x) => (
            x && typeof x === "object" && !Array.isArray(x)
              ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]]))
              : x));
          const fenced = out.match(/```json\n([\s\S]*?)\n```/);
          let printed = null;
          try { printed = fenced ? JSON.parse(fenced[1]) : null; } catch { printed = null; }
          ok("the stop PRINTS the gate call's bytes, and the printed block canonicalises equal to the written file — the payload reaches the session on a channel the open-gate interval does not deny",
            !!fenced && printed !== null && existsSync(callPath)
              && canon(printed) === canon(readJson(callPath)),
            fenced ? `parsed=${printed !== null}` : "(no fenced block on the stop's stdout)");
        }
        // THE ISOLATION IS PROVEN ACROSS THE PROCESS BOUNDARY, NOT ASSUMED
        // (kogaki#1153). `tools/run-registered-checks.sh` supplies one sidecar
        // directory for the whole suite and `tools/open-gates-guard.sh`
        // refuses when none is set — both of which rest on the executor, in a
        // CHILD process, honouring the variable. This case is the replay of
        // the failure they exist to prevent: the spawn above carries a pinned
        // session id and a scratch directory, so the sidecar must land there
        // and the owner's live `~/.claude/gate-declarations/` must be
        // untouched. Asserting the FILE is what distinguishes a variable that
        // is read from one that is merely exported.
        ok("the executor writes its gate-declaration sidecar into GATE_DECLARATION_SIDECAR_DIR, in the spawned process — the isolation the suite runner and the guard both rest on",
          existsSync(join(execSidecar, "terrain-selftest-tagstop-session.json"))
            && readJson(join(execSidecar, "terrain-selftest-tagstop-session.json"))["1"]
              === "gate-declaration (question 1):\ngate: mechanical",
          existsSync(execSidecar) ? readdirSync(execSidecar).join(",") : "(no sidecar directory written)");
        {
          const callPath = join(rd, `terrain-tag-selection${GATE_CALL_SUFFIX}`);
          const call = existsSync(callPath) ? readJson(callPath) : null;
          const q = call && call.questions && call.questions[0];
          const listing = readJson(join(rd, "terrain-tag-selection.run-declaration.json")).tag_listing;
          ok("the call carries the tag listing VERBATIM and ABOVE the question line, so a missing or paraphrased table is a byte difference",
            !!q && typeof listing === "string" && q.question === `${listing}\n\n${"Which tag does the survey open on?"}`,
            q ? q.question.slice(0, 160) : "(no call written)");
          // THE CALL CARRIES THE DECLARATION'S OWN OPTIONS AND ADDS NOTHING.
          // kogaki#1029 landed the tag gate's dynamic options (the largest
          // served tags, plus the standing one) between this branch's first head
          // and its rebase, so this gate now declares two to four by itself and
          // the free-text fallback below is not reached for it. The case asserts
          // that: the composer transcribes, and only a gate that would otherwise
          // be UNRENDERABLE gets a row it did not declare.
          const declOptions = readJson(join(rd, "terrain-tag-selection.run-declaration.json")).options;
          ok("the call carries the declaration's own options unchanged, within AskUserQuestion's two-to-four bound",
            !!q && q.options.length === declOptions.length
              && q.options.length >= 2 && q.options.length <= 4
              && q.options.every((o, i) => o.label === declOptions[i].label)
              && q.multiSelect === false && q.header.length <= 12,
            q ? JSON.stringify({ n: q.options.length, header: q.header }) : "(no call written)");
          // AND THE FALLBACK IS STILL LIVE FOR THE GATES kogaki#1029 DID NOT
          // TOUCH — six of the eight still declare one option, so the arm the
          // owner ruled on is exercised directly rather than left unreached.
          const oneArm = composeGateCall({
            id: "fixture-one-option", question: "One arm?",
            options: [{ id: "only", label: "The only declared arm" }], free_text_offered: true,
          });
          ok("a gate still declaring ONE option gets the free-text row composed from its own `free_text_offered`, never an invented arm (owner ruling 2026-09-09)",
            !!oneArm.tool_input && oneArm.tool_input.questions[0].options.length === 2
              && oneArm.tool_input.questions[0].options[0].label === "The only declared arm",
            JSON.stringify((oneArm.tool_input || {}).questions || oneArm.unavailable));
          ok("a gate declaring one option and NO free text composes no call at all, and the reason is stated rather than an arm being invented",
            !composeGateCall({ id: "fixture-mute", question: "?", options: [{ id: "a", label: "A" }], free_text_offered: false }).tool_input,
            composeGateCall({ id: "fixture-mute", question: "?", options: [{ id: "a", label: "A" }], free_text_offered: false }).unavailable);
        }
        // THE SHARED QUESTION-SHAPE CHECK, AT COMPOSE (kogaki#1118).
        //
        // TWO CASES AND TWO COMMANDS, deliberately. The REAL command answers
        // acceptance 1 -- the payload this repository sends is one the channel
        // admits -- and can only be asked on a machine that has it, the command
        // being machine-local and outside this repository. The STUB answers the
        // refusal half, and is not a convenience: it exercises what the PROGRAM
        // does when the rule refuses, which is the behaviour this issue is
        // about, on every machine including the one where the real command is
        // absent. A fixture resting on the real command alone would be silent
        // in CI, which is exactly where a wedge would next be introduced.
        {
          const shapeDir = mkdtempSync(join(tmpdir(), "terrain-selftest-shape-"));
          const realCmd = questionShapeCommand();
          const probe = spawnSync(realCmd, ["lint-question"], { input: '{"questions":[]}', encoding: "utf8" });
          const realAnswers = !probe.error && (probe.status === 0 || probe.status === 1);

          // The thesis gate, composed as a run composes it -- two served
          // addresses in the settled set, the registry's own standing options
          // merged in beneath them by `emitGateDeclaration`'s own rule.
          const thesisGate = JSON.parse(JSON.stringify(
            (GATES_REGISTRY.gates || []).find((g) => g.id === "brief-thesis-adoption")));
          thesisGate.options = [
            { id: "adopt", label: "Adopt the Thesis as named above" },
            ...thesisGate.options,
          ];
          const thesisCall = composeGateCall(thesisGate);
          ok("the Brief's thesis gate composes a call at all, over a settled set of two served addresses",
            !!thesisCall.tool_input,
            JSON.stringify(thesisCall.refused || thesisCall.unavailable || thesisCall.over_bound || "composed"));
          if (realAnswers) {
            const verdict = spawnSync(realCmd, ["lint-question"],
              { input: JSON.stringify(thesisCall.tool_input), encoding: "utf8" });
            ok("that composed payload passes the toolkit's own question-shape command with exit 0 (kogaki#1118 acceptance 1)",
              verdict.status === 0,
              `exit=${verdict.status} ${(verdict.stderr || "").trim().slice(0, 200)}`);
          } else {
            ok("the toolkit's question-shape command does not answer on this machine, so acceptance 1 is typed CANNOT-ESTABLISH rather than reported clean — it is machine-local, outside this repository, and its absence degrades HOW the rule is applied and never WHETHER the gate composes",
              !thesisCall.refused, `${realCmd}: ${probe.error ? probe.error.code : `exit=${probe.status}`}`);
          }

          // THE REFUSING COMMAND, AND THE START ACT UNDER IT (acceptance 2).
          // Driven as a subprocess because the refusal is `fail()`, which exits
          // -- the same reason the survey-grammar guard above is driven that way.
          const stub = join(shapeDir, "refusing-issue-sync");
          // THE STUB DISCRIMINATES, because the real command does and because
          // the composer now asks whether the verb is supported before believing
          // an exit 1 (PR #1119 round 1). A stub refusing every payload fails
          // that probe and is read as a command that does not carry the verb —
          // which is the guard working, and which would leave this case
          // asserting nothing.
          writeFileSync(stub,
            "#!/usr/bin/env bash\n"
            + "payload=$(cat)\n"
            + "case \"$payload\" in\n"
            + "  *'(a note)'*)\n"
            + "    echo \"question 1: option label carries the marker \\\"(a note)\\\", which is not an accepted marker class.\" >&2\n"
            + "    exit 1 ;;\n"
            + "esac\n"
            + "exit 0\n");
          chmodSync(stub, 0o755);
          const emitDir = join(shapeDir, "emit");
          mkdirSync(emitDir, { recursive: true });
          const gatesDir = join(shapeDir, "open-gates");
          const driver = join(shapeDir, "driver.mjs");
          writeFileSync(driver,
            `import { emitGateDeclaration } from ${JSON.stringify(resolve("src/terrain.mjs"))};\n`
            + `emitGateDeclaration(${JSON.stringify(emitDir)}, "brief-thesis-adoption",\n`
            + `  [{ id: "adopt", label: "Adopt the Thesis as named above (a note)" }], {});\n`);
          const run = spawnSync(process.execPath, [driver], {
            encoding: "utf8",
            env: { ...process.env, KOGAKI_QUESTION_SHAPE_CMD: stub, KOGAKI_OPEN_GATES: gatesDir },
          });
          const emitted = existsSync(emitDir) ? readdirSync(emitDir) : [];
          const pointers = existsSync(gatesDir) ? readdirSync(gatesDir) : [];
          ok("the start act REFUSES a composed gate the shared check refuses, and carries the command's own text rather than a paraphrase of it (kogaki#1118 acceptance 2)",
            run.status !== 0 && /not an accepted marker class/.test(`${run.stderr || ""}${run.stdout || ""}`),
            `exit=${run.status} ${(run.stderr || "").trim().split("\\n").slice(-1)[0].slice(0, 200)}`);
          ok("and it writes NO gate-call.json and no run declaration — the refusal stands above every write in `emitGateDeclaration`, so there is no artifact to unwrite",
            emitted.length === 0, JSON.stringify(emitted));
          ok("and leaves NO open-gate pointer under the isolated `KOGAKI_OPEN_GATES` directory, so no session is held at a question that cannot be shown",
            pointers.length === 0, JSON.stringify(pointers));

          // AND THE ABSENT COMMAND ADMITS, which is the other half of the
          // degradation policy and is asserted rather than assumed: a
          // fail-closed arm here would wedge every gate on a machine that
          // merely lacks the toolkit, reintroducing this issue from the far side.
          const absent = spawnSync(process.execPath, [driver], {
            encoding: "utf8",
            env: {
              ...process.env,
              KOGAKI_QUESTION_SHAPE_CMD: join(shapeDir, "no-such-command"),
              KOGAKI_OPEN_GATES: join(shapeDir, "open-gates-absent"),
            },
          });
          ok("a machine with NO question-shape command renders the gate rather than refusing it — the early refusal is lost, the refusal is not, because the installed hook still guards delivery",
            absent.status === 0, `exit=${absent.status} ${(absent.stderr || "").trim().slice(0, 160)}`);

          // THE RUN THAT STALLED BEFORE THE REPAIR (acceptance 4). Re-entry
          // prints the call file the earlier stop WROTE, so a label repair that
          // reached only `composeGateCall` would reach every future run and none
          // of the runs this issue was filed for. Driven over a synthetic stop
          // rather than the 2026-09-14 directory itself: that run lives in the
          // ignored runs lane, which a fixture pass on another machine does not
          // have, and a case that silently skips where the artifact is absent is
          // the reading this repository refuses.
          {
            const stalled = join(shapeDir, "stalled-run");
            mkdirSync(stalled, { recursive: true });
            const decl = {
              ...thesisGate,
              options: thesisGate.options.map((o) => (
                o.id === "back-to-terrain"
                  ? { ...o, label: `${o.label} (a Brief never fetches)` }
                  : o)),
              declared_at: new Date().toISOString(),
              run_declaration: true,
              gate_instance_id: "fixture-instance-1118",
            };
            // STAGED BY THE REAL COMPOSER UNDER AN ADMITTING COMMAND, not by a
            // literal written here (PR #1119 round 1). What is being staged is a
            // file an OLDER runtime wrote — one with no compose-time check at
            // all — and the way to get those bytes is to mute the check, never
            // to hand-build the payload beside it: a second composer here would
            // omit the free-text row and the folded reading, so the refresh
            // would be driven over bytes no runtime ever wrote and the case
            // would be green either way.
            const admitting = join(shapeDir, "admitting-issue-sync");
            writeFileSync(admitting, "#!/usr/bin/env bash\ncat >/dev/null\nexit 0\n");
            chmodSync(admitting, 0o755);
            const savedCmd = process.env.KOGAKI_QUESTION_SHAPE_CMD;
            process.env.KOGAKI_QUESTION_SHAPE_CMD = admitting;
            resetQuestionShapeSupported();
            const stale = composeGateCall(decl);
            if (savedCmd === undefined) delete process.env.KOGAKI_QUESTION_SHAPE_CMD;
            else process.env.KOGAKI_QUESTION_SHAPE_CMD = savedCmd;
            resetQuestionShapeSupported();
            ok("the pre-repair payload is staged by the real composer, so the refresh is driven over the bytes a runtime actually wrote — free-text row and folded reading included",
              !!stale.tool_input, JSON.stringify(stale.refused || stale.unavailable || "composed"));
            writeFileSync(join(stalled, `brief-thesis-adoption${GATE_SCHEMA.capture.run_declaration_suffix}`),
              JSON.stringify(decl, null, 2) + "\n");
            writeFileSync(join(stalled, `brief-thesis-adoption${GATE_CALL_SUFFIX}`),
              JSON.stringify(stale.tool_input, null, 2) + "\n");
            const before = questionShapeRefusal(readJson(join(stalled, `brief-thesis-adoption${GATE_CALL_SUFFIX}`)));
            const did = refreshWrittenGateCall(stalled, "brief-thesis-adoption");
            const after = questionShapeRefusal(readJson(join(stalled, `brief-thesis-adoption${GATE_CALL_SUFFIX}`)));
            if (realAnswers) {
              ok("a gate call WRITTEN before the label repair is refused, refreshed from the registry's standing options at re-entry, and admissible afterwards — so the run that stalled on 2026-09-14 shows its gate rather than staying stalled across the fix (kogaki#1118 acceptance 4)",
                !!before && !!did && !after,
                `before=${!!before} refreshed=${!!did} after=${!!after}`);
              ok("and the refresh is a no-op on a call the check admits, so re-entry does not rewrite a payload nothing objected to",
                refreshWrittenGateCall(stalled, "brief-thesis-adoption") === null,
                "second call");
            } else {
              ok("the question-shape command does not answer here, so the re-entry refresh has nothing to judge and rewrites nothing — acceptance 4's assertion is typed CANNOT-ESTABLISH on this machine rather than reported clean",
                !before && did === null, `before=${!!before} refreshed=${!!did}`);
              ok("and the written call is left exactly as the earlier stop wrote it, which is what an unapplied rule owes",
                !after, "unchanged");
            }
            const declAfter = readJson(join(stalled, `brief-thesis-adoption${GATE_SCHEMA.capture.run_declaration_suffix}`));
            ok("the declaration is refreshed WITH the call and keeps its instance id — the answer's join key is the same raising of the same gate, and the capture's `options_offered` is judged against a declaration that matches what was shown",
              declAfter.gate_instance_id === "fixture-instance-1118"
                && declAfter.options.length === decl.options.length,
              `instance=${declAfter.gate_instance_id} options=${declAfter.options.length}`);
          }
          rmSync(shapeDir, { recursive: true, force: true });
        }
        ok("the stop prints no invocation for the owner to run — no READ FIRST block, and no `terrain.mjs tags` hand-over",
          !/READ FIRST/.test(out) && !/terrain\.mjs tags/.test(out),
          out.split("\n").filter((l) => /READ FIRST|terrain\.mjs tags/.test(l)).join(" | "));

        // THE GUARD IS THE SAME GUARD. A listing riding a declaration is judged
        // by the grammar that judged it when it was printed — otherwise moving
        // the surface to a new channel silently loosens its contract. Driven as
        // a subprocess because the refusal is `fail()`, which exits.
        const badSurvey = join(gs, "bad-survey.json");
        const badRec = readJson(surveyPath);
        badRec.sections = [{ ...badRec.sections[0], name: "a tag whose name\nbreaks the row grammar" }];
        writeFileSync(badSurvey, JSON.stringify(badRec));
        const rdBad = join(gs, "rd-bad");
        mkdirSync(rdBad, { recursive: true });
        writeFileSync(join(rdBad, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: badSurvey,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        const rBad = spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdBad, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: execEnv });
        const outBad = `${rBad.stdout || ""}${rBad.stderr || ""}`;
        {
          // The live directory holds no pointer this case minted (kogaki#1046
          // acceptance 1). Read only when it exists: a machine with no live
          // directory has nothing to leak into.
          const live = join(homedir(), ".claude", "kogaki-open-gates");
          const leaked = [];
          if (existsSync(live)) {
            for (const f of readdirSync(live)) {
              if (!f.endsWith(".json")) continue;
              try {
                const p = readJson(join(live, f));
                if (String(p.declaration_path || "").startsWith(gs)) leaked.push(f);
              } catch { /* an unreadable pointer is not this case's */ }
            }
          }
          ok("the self-test's executor spawns leave the live open-gate directory untouched (kogaki#1046)",
            leaked.length === 0, leaked.join(", "));
        }
        ok("a listing the tag_listing grammar refuses does not ride into a declaration — the gate refuses instead",
          rBad.status !== 0 && /refusing to emit tag_listing/.test(outBad),
          outBad.trim().split("\n")[0].slice(0, 140));


        // THE ANSWER NOW ARRIVES THROUGH THE HOOK, AND THESE CASES DRIVE IT
        // (kogaki#890). Every case below used to pass `--capture-option` /
        // `--capture-free-text` / `--tool-use-id`, which is precisely the
        // channel the issue removed — so re-pointing them at the harness path
        // is what keeps them evidence rather than a test of a dead flag. The
        // helper feeds `.claude/hooks/write-gate-capture.py` the payload shape
        // the harness sends, so the row under test is written by the same code
        // that writes it in a real run.
        //
        // EACH RUN GETS ITS OWN POINTER DIRECTORY, and that is a property of
        // the FIXTURE rather than of the design. In a real installation one
        // directory holds every outstanding raising on the machine, which is
        // exactly what makes the ambiguity case below possible; here the cases
        // must not collide with each other, because several of them
        // deliberately leave a gate unanswered and every one of them asks the
        // same question over the same survey. The last case opts back IN to a
        // shared directory, on purpose.
        const hookPath = join(REPO, ".claude", "hooks", "write-gate-capture.py");
        const gatesFor = (name) => join(gs, "open-gates", name);
        // THE SELF-TEST NAMES ITS OWN SESSION (kogaki#1028 item 5). The capture
        // hook joins a payload to a pointer on the nonce AND the session, and an
        // empty id on either side matches nothing — so a fixture inheriting the
        // ambient `CLAUDE_CODE_SESSION_ID` into the pointer while sending a
        // payload without one would write no row, and the fixture would be
        // reporting the join rather than what it means to cover. Pinned here so
        // the pass is the same inside a session and outside one.
        const SELF_TEST_SESSION = "terrain-self-test-session";
        // AND ITS OWN SIDECAR DIRECTORY, PER NAME (kogaki#1153), on the same
        // terms as the pointer directory beside it: these spawns reach
        // `emitGateDeclaration`, which now writes a gate-declaration sidecar
        // keyed by `CLAUDE_CODE_SESSION_ID` — pinned here to the fixture
        // session, so without a scratch directory every one of these cases
        // would write a `mechanical` declaration into the live carrier under
        // a session id no session owns.
        const envFor = (name) => ({
          ...process.env,
          KOGAKI_OPEN_GATES: gatesFor(name),
          GATE_DECLARATION_SIDECAR_DIR: join(gs, "gate-declarations", name),
          CLAUDE_CODE_SESSION_ID: SELF_TEST_SESSION,
        });
        // THE ADVANCE CARRIES THE PAYLOAD THAT PRODUCED THE ROW (kogaki#1075).
        // In an installation the capture hook and this hook read ONE harness
        // event, so the row's `evidence.tool_use_id` and the advancing
        // payload's are the same string by construction. The fixtures used to
        // decouple them -- answer under `toolu_test_*`, advance under
        // `fixture-tool-use` -- which was a shape no installation can produce
        // and which the executor now refuses by name. Composed here so a case
        // that means to drive an answered gate drives it the way the hook pair
        // does.
        const payloadAnswering = (toolUseId) => JSON.stringify({
          hook_event_name: "PostToolUse",
          session_id: "fixture-session",
          tool_use_id: toolUseId,
        });
        const answerThroughHook = (gatesName, questionText, label, toolUseId) => spawnSync(
          "python3", [hookPath],
          { encoding: "utf8", env: envFor(gatesName),
            input: JSON.stringify({
              tool_name: "AskUserQuestion",
              session_id: SELF_TEST_SESSION,
              tool_use_id: toolUseId,
              tool_input: { questions: [{ question: questionText, options: [] }] },
              tool_response: { answers: { [questionText]: label } },
            }) });

        // THE FLAGS ARE REFUSED BY NAME, not merely ignored. An ignored flag
        // is a session quietly getting a different act than it asked for; the
        // whole point of removing this channel is that reaching for it stops.
        const rdDead = join(gs, "rd-dead-flag");
        mkdirSync(rdDead, { recursive: true });
        writeFileSync(join(rdDead, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdDead, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("dead") });
        for (const dead of [["--capture-option", "other-method"], ["--capture-free-text", "x"], ["--tool-use-id", "t"]]) {
          const rDead = spawnSync(process.execPath,
            [selfPath, "run", "--run-dir", rdDead, "--workflow", tp, ...dead], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("dead") });
          const outDead = `${rDead.stdout || ""}${rDead.stderr || ""}`;
          ok(`${dead[0]} is REMOVED and refused by name — the model no longer has a channel for the owner's answer`,
            rDead.status !== 0 && outDead.includes(`${dead[0]} is REMOVED`),
            outDead.trim().split("\n")[0].slice(0, 140));
        }

        // ---- THE EXECUTOR IS INVOKED BY HOOKS ONLY (kogaki#1027) -----------
        //
        // Every Terrain run since kogaki#17 started when the model typed
        // `node src/terrain.mjs run` into Bash and advanced when the model chose
        // to re-enter; the run record recorded WHICH states completed and never
        // WHO executed the transition, so a run the model drove and a run the
        // Harness drove left identical records. These cases drive the two
        // halves of the repair: the payload refusal, and the attribution.

        // ITEM 5. The three deleted entry points, refused BY NAME rather than
        // ignored, on the same ground the three above are: an ignored flag is a
        // session quietly getting a different act than it asked for.
        for (const dead of [["--input", "some tag"], ["--at", "TAG_SELECTION"], ["--enter", "TAG_SELECTION"]]) {
          const rGone = spawnSync(process.execPath,
            [selfPath, "run", "--run-dir", rdDead, "--workflow", tp, ...dead], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("dead") });
          const outGone = `${rGone.stdout || ""}${rGone.stderr || ""}`;
          ok(`${dead[0]} is DELETED and refused by name — the model-typed route into the executor has no stub`,
            rGone.status !== 0 && outGone.includes(`${dead[0]} is DELETED`),
            outGone.trim().split("\n")[0].slice(0, 140));
        }

        // ACCEPTANCE 1. Invoking the executor with no payload on stdin refuses
        // and WRITES NOTHING. The run directory is named but never created,
        // which is the "before any write" half — a refusal that had already
        // made the directory would have pruned this lane's entries on the way.
        {
          const rdNone = join(gs, "rd-no-payload");
          const rNone = spawnSync(process.execPath,
            [selfPath, "run", "--run-dir", rdNone, "--workflow", tp], { input: "", encoding: "utf8", env: envFor("nopayload") });
          const outNone = `${rNone.stdout || ""}${rNone.stderr || ""}`;
          ok("the executor with NO hook payload on stdin refuses, and names the two acts that do carry one",
            rNone.status !== 0 && /no hook payload/.test(outNone)
              && /terrain\.mjs start/.test(outNone) && /advance-terrain\.py/.test(outNone),
            outNone.trim().split("\n")[0].slice(0, 160));
          ok("that refusal wrote NOTHING — the run directory it named does not exist, so the refusal precedes every write",
            !existsSync(rdNone), rdNone);
          // A payload MISSING ONE FIELD is not a payload. `advanced_by` with a
          // null tool_use_id records that a transition happened and not which
          // question executed it, which is the same silence the field ends.
          for (const missing of ["hook_event_name", "session_id", "tool_use_id"]) {
            const partial = JSON.parse(FIXTURE_PAYLOAD);
            delete partial[missing];
            const rPart = spawnSync(process.execPath,
              [selfPath, "run", "--run-dir", join(gs, `rd-partial-${missing}`), "--workflow", tp],
              { input: JSON.stringify(partial), encoding: "utf8", env: envFor("nopayload") });
            ok(`a payload with no ${missing} is refused — a partial attribution is not an attribution`,
              rPart.status !== 0, `exit ${rPart.status}`);
          }
          // `--status` is the ONE verb the PreToolUse deny admits from a Bash
          // command, so it must not need a payload: an inspection route that
          // required a hook event would leave a stuck run unreadable by the one
          // person able to unstick it.
          const rStatus = spawnSync(process.execPath,
            [selfPath, "run", "--run-dir", rdDead, "--workflow", tp, "--status"], { input: "", encoding: "utf8", env: envFor("dead") });
          ok("`run --status` needs no payload — the one verb reachable from a Bash command is read-only and stays reachable",
            rStatus.status === 0, `exit ${rStatus.status}`);
        }

        // ACCEPTANCE 2. A run driven by synthesized hook payloads ALONE reaches
        // its end, and every transition in its record carries `advanced_by`
        // with the three fields.
        //
        // THE TABLE IS THE FIXTURE'S, NOT THE SHIPPED ONE, and the substitution
        // is stated rather than quietly made: this pass is seam-free by
        // construction and the shipped table's first state reads the gateway,
        // so a drive of `full_report` itself is exactly the end-to-end member
        // `terrain-runtime`'s own removal signal names as not existing yet. What
        // is asserted here is the property that acceptance item names — payloads
        // alone carry a run from its start through a gate answer to its terminal
        // — over a table that reaches a terminal without a seam.
        {
          const rdDrive = join(gs, "rd-hook-driven");
          mkdirSync(rdDrive, { recursive: true });
          writeFileSync(join(rdDrive, RUN_RECORD_FILE), JSON.stringify({
            workflow: { path: tp, version: 1 }, survey_record: surveyPath,
            completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
            awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
            gate_declarations_owed: [], transitions: [], done: false,
          }));
          spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdDrive, "--workflow", tp],
            { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("driven") });
          const declDrive = readJson(join(rdDrive, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
          // THE FREE-TEXT ARM, because the fixture survey's tag options are not
          // guaranteed to include a routed one and a case that depends on which
          // tags a corpus happens to carry is a case that fails for the wrong
          // reason. Free text is the affordance every gate here declares on, and
          // it advances the wait exactly as a routed option does.
          answerThroughHook("driven", sentQ(rdDrive, declDrive), "a tag the owner typed", "fixture-tool-use");
          const rDrive = spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdDrive, "--workflow", tp],
            { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("driven") });
          const recDrive = readRunRecord(rdDrive);
          ok("a run driven by synthesized hook payloads alone advances through its gate to the terminal — no model-typed act anywhere on the path",
            rDrive.status === 0 && !!recDrive && recDrive.done === true && recDrive.completed.includes("done"),
            recDrive ? JSON.stringify({ done: recDrive.done, completed: recDrive.completed }) : "(no record)");
          const rows = (recDrive && recDrive.transitions) || [];
          ok("every transition in that record carries advanced_by with the three payload fields, copied from the payload rather than composed",
            rows.length > 0 && rows.every((t) => t.advanced_by
              && t.advanced_by.executor === "hook"
              && t.advanced_by.hook_event_name === "PostToolUse"
              && t.advanced_by.session_id === "fixture-session"
              && t.advanced_by.tool_use_id === "fixture-tool-use"),
            JSON.stringify(rows.map((t) => t.advanced_by)).slice(0, 200));
          ok("the transition list and the completed list name the same states in the same order — one writer, so they cannot disagree about what ran",
            rows.map((t) => t.state).join(",") === recDrive.completed.join(","),
            `${rows.map((t) => t.state).join(",")} vs ${recDrive.completed.join(",")}`);
        }

        // ITEM 1. The start act carries the `skill-expansion` executor kind and
        // NO hook fields, because no hook event produced it — and it refuses an
        // existing record, so it cannot walk states the hook route is supposed
        // to execute under an attribution that names no hook.
        {
          const rdStart = join(gs, "rd-start");
          mkdirSync(rdStart, { recursive: true });
          writeFileSync(join(rdStart, RUN_RECORD_FILE), JSON.stringify({
            workflow: { path: tp, version: 1 }, survey_record: surveyPath,
            completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
            awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
            gate_declarations_owed: [], transitions: [], done: false,
          }));
          const rStart = spawnSync(process.execPath, [selfPath, "start", "--run-dir", rdStart, "--workflow", tp],
            { input: "", encoding: "utf8", env: envFor("start") });
          const outStart = `${rStart.stdout || ""}${rStart.stderr || ""}`;
          ok("`start` refuses a run record that already exists — the start act opens a run and never resumes one",
            rStart.status !== 0 && /a resumption and not a start/.test(outStart),
            outStart.trim().split("\n")[0].slice(0, 160));

          const rdStart2 = join(gs, "rd-start-fresh");
          mkdirSync(rdStart2, { recursive: true });
          const startTable = join(gs, "start-table.json");
          writeFileSync(startTable, JSON.stringify({ version: 1, states: [
            { id: "a", kind: "compute" },
            { id: "W", kind: "wait", owner_supplies: "something" },
            { id: "done", kind: "terminal" },
          ] }));
          const rStart2 = spawnSync(process.execPath, [selfPath, "start", "--run-dir", rdStart2, "--workflow", startTable],
            { input: "", encoding: "utf8", env: envFor("start") });
          const recStart = readRunRecord(rdStart2);
          const startRows = (recStart && recStart.transitions) || [];
          ok("`start` runs with no payload on stdin — the skill's `!` line receives none, and the act is licensed rather than synthesized",
            rStart2.status === 0 && !!recStart, `exit ${rStart2.status}`);
          ok("the start act's transitions name the skill expansion and carry NO hook fields — an attribution no harness event supplied is never invented",
            startRows.length > 0 && startRows.every((t) => t.advanced_by
              && t.advanced_by.executor === "skill-expansion"
              && t.advanced_by.hook_event_name === undefined
              && t.advanced_by.session_id === undefined
              && t.advanced_by.tool_use_id === undefined),
            JSON.stringify(startRows.map((t) => t.advanced_by)).slice(0, 200));
          ok("the start act stops at the first wait — it produces one stop, not a walked run",
            !!recStart && recStart.awaiting === "W" && recStart.done === false,
            recStart ? JSON.stringify({ awaiting: recStart.awaiting, done: recStart.done }) : "(no record)");
        }

        // ---- WHICH RUN THE ADVANCE IS AN ADVANCE OF (PR #1034 round 1,
        // blocking). `--run-dir` was run identity, re-supplied by the session on
        // every re-entry; item 5 removed the session's route and left nothing in
        // its place, so `start` opened one workspace and the advance minted
        // another. The open-run pointer is the carrier that replaces it, and
        // these cases drive it over `KOGAKI_OPEN_RUN` so the real lane is never
        // touched.
        {
          const ptr = join(gs, "open-run-pointer");
          const envPtr = (extra = {}) => ({ ...process.env, KOGAKI_OPEN_RUN: ptr, ...extra });
          const startTable2 = join(gs, "pointer-table.json");
          writeFileSync(startTable2, JSON.stringify({ version: 1, states: [
            { id: "a", kind: "compute" },
            { id: "W", kind: "wait", owner_supplies: "something" },
            { id: "done", kind: "terminal" },
          ] }));

          // With no pointer and no --run-dir, an advance REFUSES and writes
          // nothing: an advance is an advance OF a run, and minting one here is
          // exactly the defect.
          const rNoRun = spawnSync(process.execPath, [selfPath, "run", "--workflow", startTable2],
            { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envPtr() });
          const outNoRun = `${rNoRun.stdout || ""}${rNoRun.stderr || ""}`;
          ok("an advance with no open run refuses and names the start act, rather than minting a fresh workspace per question",
            rNoRun.status !== 0 && /no Terrain run is open/.test(outNoRun) && /terrain\.mjs start/.test(outNoRun),
            outNoRun.trim().split("\n")[0].slice(0, 160));
          ok("that refusal wrote no pointer either — nothing about the lane changed",
            !existsSync(ptr), ptr);

          // `start` on the default branch WRITES the pointer, and the advance
          // that follows resolves the same workspace rather than a new one.
          const rdPtr = join(gs, "rd-pointer");
          const rStartPtr = spawnSync(process.execPath,
            [selfPath, "start", "--run-dir", rdPtr, "--workflow", startTable2],
            { input: "", encoding: "utf8", env: envPtr() });
          ok("an explicit --run-dir still wins for `start`, and writes NO pointer — a caller who named a directory holds it",
            rStartPtr.status === 0 && !existsSync(ptr), `exit ${rStartPtr.status}`);

          // The pointer's own round trip, driven the way the start act writes
          // it. Read IN PROCESS, so the override has to be set here too — the
          // spawns above carry it in the child's environment.
          const heldPtrEnv = process.env.KOGAKI_OPEN_RUN;
          process.env.KOGAKI_OPEN_RUN = ptr;
          writeFileSync(ptr, `${rdPtr}\n`);
          ok("an advance with the pointer set resolves the SAME workspace the start act opened — the run the answer belongs to",
            readOpenRunPointer() === resolve(rdPtr), String(readOpenRunPointer()));
          // A POINTER TO A WORKSPACE THAT IS GONE IS NOT A RUN. A `runs/` prune
          // or a hand-cleaned lane leaves the file behind, and resolving it
          // would advance into a directory with no record in it.
          writeFileSync(ptr, `${join(gs, "not-a-run")}\n`);
          ok("a pointer naming a workspace that no longer exists reads as NO open run, rather than resolving to an empty directory",
            readOpenRunPointer() === null, String(readOpenRunPointer()));
          if (heldPtrEnv === undefined) delete process.env.KOGAKI_OPEN_RUN;
          else process.env.KOGAKI_OPEN_RUN = heldPtrEnv;
        }

        // THE STANDING OPTION IS ROUTED NOWHERE, AND SAYS SO (PR #898 round 1).
        // Before this the option id was recorded where a tag name goes and the
        // run died two states later in `compose_input`, telling the owner that
        // "other-method" was not in the survey's vocabulary — a refusal that
        // misdescribes what they did, from a state that cannot know what they
        // were asked. One of exactly two ways to answer deserves one that names
        // it, and the wait must survive so the gate can be re-offered.
        const rdOpt = join(gs, "rd-unrouted");
        mkdirSync(rdOpt, { recursive: true });
        writeFileSync(join(rdOpt, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdOpt, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("opt") });
        const declOpt = readJson(join(rdOpt, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
        const standingLabel = declOpt.options.find((o) => o.id === "other-method").label;
        // THE GATE IS UNANSWERED UNTIL THE HARNESS SAYS OTHERWISE, and this is
        // the case the whole issue turns on: a re-entry with no recorded answer
        // refuses instead of advancing on something a session supplied.
        const rUnanswered = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rdOpt, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("opt") });
        const outUnanswered = `${rUnanswered.stdout || ""}${rUnanswered.stderr || ""}`;
        ok("an outstanding declared gate with NO harness-recorded answer refuses, and names the hook and the pointer rather than advancing",
          rUnanswered.status !== 0
            && /the harness has recorded no answer/.test(outUnanswered)
            && /write-gate-capture\.py/.test(outUnanswered)
            && /open-gate pointer/.test(outUnanswered),
          outUnanswered.trim().split("\n")[0].slice(0, 160));

        answerThroughHook("opt", sentQ(rdOpt, declOpt), standingLabel, "toolu_test_unrouted");
        const rOpt = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rdOpt, "--workflow", tp], { input: payloadAnswering("toolu_test_unrouted"), encoding: "utf8", env: envFor("opt") });
        const outOpt = `${rOpt.stdout || ""}${rOpt.stderr || ""}`;
        const recOpt = readRunRecord(rdOpt);
        ok("capturing the standing option REFUSES the advance and names the option, rather than letting it land where a tag name goes",
          rOpt.status !== 0 && /ROUTED NOWHERE/.test(outOpt) && /other-method/.test(outOpt),
          outOpt.trim().split("\n").slice(-1)[0].slice(0, 160));
        ok("that refusal leaves the wait OUTSTANDING and records no owner input — the gate can be re-offered rather than the run being wedged",
          !!recOpt && recOpt.awaiting === "TAG_SELECTION"
            && !recOpt.completed.includes("TAG_SELECTION")
            && recOpt.owner_input.TAG_SELECTION === undefined,
          recOpt ? JSON.stringify({ awaiting: recOpt.awaiting, completed: recOpt.completed, input: recOpt.owner_input }) : "(no record)");
        ok("the answer is still CAPTURED — it is evidence, and the gate carrier owes the row whether or not the run advances",
          existsSync(join(rdOpt, `terrain${GATE_SCHEMA.capture.suffix}`))
            && readJson(join(rdOpt, `terrain${GATE_SCHEMA.capture.suffix}`)).rows.some((x) => x.payload.answer.option === "other-method"));
        ok("the captured row carries the HARNESS'S OWN tool_use_id and the raising's instance id — the two fields no session supplied",
          readJson(join(rdOpt, `terrain${GATE_SCHEMA.capture.suffix}`)).rows.some((x) =>
            x.evidence.tool_use_id === "toolu_test_unrouted" && x.gate_instance_id === declOpt.gate_instance_id));

        // A FREE-TEXT TAG IS UNAFFECTED, so the refusal above discriminates
        // rather than refusing every answer to this gate.
        const rdFree = join(gs, "rd-freetext");
        mkdirSync(rdFree, { recursive: true });
        writeFileSync(join(rdFree, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdFree, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("free") });
        const declFree = readJson(join(rdFree, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
        answerThroughHook("free", sentQ(rdFree, declFree), "testing", "toolu_test_freetext");
        const rFree = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rdFree, "--workflow", tp], { input: payloadAnswering("toolu_test_freetext"), encoding: "utf8", env: envFor("free") });
        const recFree = readRunRecord(rdFree);
        ok("a free-text tag answer still advances — the unrouted refusal is bound to the declared option and not to the gate",
          rFree.status === 0 && !!recFree && recFree.owner_input.TAG_SELECTION === "testing"
            && recFree.completed.includes("TAG_SELECTION"),
          recFree ? JSON.stringify(recFree.owner_input) : `(no record) ${(rFree.stderr || "").slice(0, 120)}`);

        // AN ANSWER TO ANOTHER RAISING DOES NOT ANSWER THIS ONE, which is the
        // property the instance nonce exists for and the one a content-derived
        // key cannot have. Both runs are over the same survey, so both compose
        // the same question and the same option set and therefore the same
        // digest — the pair a digest is least able to tell apart.
        const rdTwin = join(gs, "rd-twin");
        mkdirSync(rdTwin, { recursive: true });
        writeFileSync(join(rdTwin, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdTwin, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("shared") });
        const declTwin = readJson(join(rdTwin, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
        ok("two raisings of one gate over one input compose an IDENTICAL option-set digest and DIFFERENT instance ids — so the nonce is doing work the digest cannot",
          ownerGateDigest(declTwin.id, declTwin.options.map((o) => o.id))
            === ownerGateDigest(declFree.id, declFree.options.map((o) => o.id))
            && declTwin.gate_instance_id !== declFree.gate_instance_id);
        // The twin's capture is handed the OTHER run's answered row verbatim.
        writeFileSync(join(rdTwin, `terrain${GATE_SCHEMA.capture.suffix}`),
          readFileSync(join(rdFree, `terrain${GATE_SCHEMA.capture.suffix}`), "utf8"));
        const rTwin = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rdTwin, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("shared") });
        const outTwin = `${rTwin.stdout || ""}${rTwin.stderr || ""}`;
        ok("a row answering a DIFFERENT raising does not advance this one — the join is on the instance id, never on the content two runs share",
          rTwin.status !== 0 && /none carries this raising's instance id/.test(outTwin),
          outTwin.trim().split("\n")[0].slice(0, 160));

        // TWO OUTSTANDING RAISINGS OF ONE QUESTION: the hook writes NOTHING
        // and says so, rather than choosing. Choosing would be the silent
        // misattribution the nonce exists to prevent, arriving one step earlier
        // through the narrowing that finds the pointer.
        const rdTwin2 = join(gs, "rd-twin-2");
        mkdirSync(rdTwin2, { recursive: true });
        writeFileSync(join(rdTwin2, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdTwin2, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("shared") });
        const rTwoOpen = answerThroughHook("shared", sentQ(rdTwin, declTwin), "testing", "toolu_test_ambiguous");
        ok("with two outstanding gates carrying one question the hook writes no row and names the ambiguity, rather than picking one",
          /does not choose between them/.test(`${rTwoOpen.stdout || ""}${rTwoOpen.stderr || ""}`),
          `${rTwoOpen.stderr || ""}`.trim().split("\n")[0].slice(0, 160));

        // A TRUNCATED LABEL IS REFUSED, NOT READ AS THE OWNER'S OWN WORDS
        // (PR #917 round 1, finding 4). The standing option's label is a full
        // sentence, so a label that arrives cut short would have fallen through
        // an exact comparison and been recorded as free text — landing a
        // declared option's text where a tag name goes and skipping the
        // unrouted refusal entirely, which is the wedge PR #898 closed
        // returning by another route.
        const rdTrunc = join(gs, "rd-truncated");
        mkdirSync(rdTrunc, { recursive: true });
        writeFileSync(join(rdTrunc, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdTrunc, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("trunc") });
        const declTrunc = readJson(join(rdTrunc, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
        const fullLabel = declTrunc.options.find((o) => o.id === "other-method").label;
        answerThroughHook("trunc", sentQ(rdTrunc, declTrunc), fullLabel.slice(0, 24), "toolu_test_truncated");
        const rTrunc = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rdTrunc, "--workflow", tp], { input: payloadAnswering("toolu_test_truncated"), encoding: "utf8", env: envFor("trunc") });
        const outTrunc = `${rTrunc.stdout || ""}${rTrunc.stderr || ""}`;
        const recTrunc = readRunRecord(rdTrunc);
        ok("a TRUNCATED option label is refused rather than recorded as free text — a near-miss is not silently read as the owner's own words",
          rTrunc.status !== 0 && /could not be resolved to an option or to free text/.test(outTrunc)
            && recTrunc.owner_input.TAG_SELECTION === undefined,
          outTrunc.trim().split("\n")[0].slice(0, 170));
        // A RE-WRAPPED label is still the same answer, so the refusal above
        // discriminates rather than refusing every label that is not byte-equal.
        const rdWrap = join(gs, "rd-rewrapped");
        mkdirSync(rdWrap, { recursive: true });
        writeFileSync(join(rdWrap, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdWrap, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("wrap") });
        const declWrap = readJson(join(rdWrap, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
        const wrapped = declWrap.options.find((o) => o.id === "other-method").label.replace(/ /g, "\n  ");
        answerThroughHook("wrap", sentQ(rdWrap, declWrap), wrapped, "toolu_test_rewrapped");
        const rWrap = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rdWrap, "--workflow", tp], { input: payloadAnswering("toolu_test_rewrapped"), encoding: "utf8", env: envFor("wrap") });
        ok("a RE-WRAPPED label still resolves to its option — whitespace is presentation, and the near-miss refusal is not a refusal of every inexact label",
          rWrap.status !== 0 && /ROUTED NOWHERE/.test(`${rWrap.stdout || ""}${rWrap.stderr || ""}`),
          `${rWrap.stdout || ""}${rWrap.stderr || ""}`.trim().split("\n").slice(-1)[0].slice(0, 150));

        // AN ORPHANED POINTER IS REAPED, so one abandoned run cannot wedge a
        // whole gate class on the machine (PR #917 round 1, finding 3). The
        // question is a constant string, so every later raising would otherwise
        // match the orphan and the ambiguity arm would write nothing forever.
        const rdOrphan = join(gs, "rd-orphan");
        mkdirSync(rdOrphan, { recursive: true });
        writeFileSync(join(rdOrphan, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdOrphan, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("orphan") });
        rmSync(rdOrphan, { recursive: true, force: true });   // the abandoned run
        const rdAfter = join(gs, "rd-after-orphan");
        mkdirSync(rdAfter, { recursive: true });
        writeFileSync(join(rdAfter, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdAfter, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("orphan") });
        const declAfter = readJson(join(rdAfter, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
        const rAfterHook = answerThroughHook("orphan", sentQ(rdAfter, declAfter), "a-tag", "toolu_test_after_orphan");
        const rAfter = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rdAfter, "--workflow", tp], { input: payloadAnswering("toolu_test_after_orphan"), encoding: "utf8", env: envFor("orphan") });
        const recAfter = readRunRecord(rdAfter);
        ok("a pointer whose run was deleted is REAPED, so the next raising of that gate is not wedged by the orphan",
          /is reaped: its declaration/.test(`${rAfterHook.stdout || ""}${rAfterHook.stderr || ""}`)
            && rAfter.status === 0 && recAfter.owner_input.TAG_SELECTION === "a-tag",
          `${rAfterHook.stderr || ""}`.trim().split("\n")[0].slice(0, 150));

        // ANOTHER QUESTION'S PAYLOAD DOES NOT ADVANCE THIS GATE (kogaki#1075).
        // The row is on disk and answers THIS raising, so every check above it
        // passes; what refuses is the payload, which answered something else.
        // This is the live shape of 2026-09-10: a parked run, a cleanup
        // question in another session, and an executor that read the last
        // capture and moved. The hook is the first reader and this is the
        // second, so a direct invocation reaches the same stop.
        {
          const rdOther = join(gs, "rd-other-question");
          mkdirSync(rdOther, { recursive: true });
          writeFileSync(join(rdOther, RUN_RECORD_FILE), JSON.stringify({
            workflow: { path: tp, version: 1 }, survey_record: surveyPath,
            completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
            awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
            gate_declarations_owed: [], transitions: [], done: false,
          }));
          spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdOther, "--workflow", tp],
            { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("other") });
          const declOther = readJson(join(rdOther, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
          answerThroughHook("other", sentQ(rdOther, declOther), "a-tag", "toolu_the_gates_own_question");
          const rElse = spawnSync(process.execPath,
            [selfPath, "run", "--run-dir", rdOther, "--workflow", tp],
            { input: payloadAnswering("toolu_some_other_sessions_cleanup_plan"), encoding: "utf8", env: envFor("other") });
          const outElse = `${rElse.stdout || ""}${rElse.stderr || ""}`;
          const recElse = readRunRecord(rdOther);
          ok("a payload from a question that did not answer this gate REFUSES the advance by name, however open the run is",
            rElse.status !== 0
              && /no captured row for gate/.test(outElse)
              && /toolu_some_other_sessions_cleanup_plan/.test(outElse),
            outElse.trim().split("\n")[0].slice(0, 170));
          ok("that refusal advances nothing and leaves the wait outstanding — the run is re-offered its gate rather than walked by someone else's question",
            !!recElse && recElse.awaiting === "TAG_SELECTION"
              && !recElse.completed.includes("TAG_SELECTION")
              && recElse.owner_input.TAG_SELECTION === undefined,
            recElse ? JSON.stringify({ awaiting: recElse.awaiting, completed: recElse.completed }) : "(no record)");
          // ...AND THE GATE'S OWN PAYLOAD STILL ADVANCES IT, so the refusal
          // discriminates rather than closing the route it guards.
          const rOwn = spawnSync(process.execPath,
            [selfPath, "run", "--run-dir", rdOther, "--workflow", tp],
            { input: payloadAnswering("toolu_the_gates_own_question"), encoding: "utf8", env: envFor("other") });
          const recOwn = readRunRecord(rdOther);
          ok("the gate's OWN question advances it — the payload check narrows to the question that answered, and refuses nothing else",
            rOwn.status === 0 && !!recOwn && recOwn.owner_input.TAG_SELECTION === "a-tag"
              && recOwn.completed.includes("TAG_SELECTION"),
            recOwn ? JSON.stringify(recOwn.owner_input) : `(no record) ${(rOwn.stderr || "").slice(0, 140)}`);
        }

        // A RE-RAISING SUPERSEDES ITS OWN POINTER, so the recovery this file
        // prescribes — re-render after a refusal — does not itself accumulate
        // the orphans that wedge the gate.
        const rdRe = join(gs, "rd-reraise");
        mkdirSync(rdRe, { recursive: true });
        writeFileSync(join(rdRe, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        for (let i = 0; i < 3; i++) {
          rmSync(join(rdRe, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`), { force: true });
          const rec = readRunRecord(rdRe);
          rec.gate_declarations_owed = [];
          writeFileSync(join(rdRe, RUN_RECORD_FILE), JSON.stringify(rec));
          spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdRe, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("reraise") });
        }
        ok("three raisings of one gate in one run leave exactly ONE pointer — the prescribed recovery does not accumulate the orphans it would then be blocked by",
          readdirSync(gatesFor("reraise")).filter((f) => f.endsWith(".json")).length === 1,
          `${readdirSync(gatesFor("reraise")).length} pointer(s)`);

        // THE POINTER NAMES WHO OPENED IT (kogaki#1051). The hook admits the
        // prompt that invoked the skill for a `skill-expansion` pointer and for
        // no other, so the field has to be on the file the start act writes --
        // and it has to be the OTHER value on the file an advance writes, or
        // every gate in every run would admit typed text.
        const readOnly = (name) => {
          const dir = gatesFor(name);
          if (!existsSync(dir)) return null;
          const f = readdirSync(dir).filter((x) => x.endsWith(".json"))[0];
          return f ? readJson(join(dir, f)) : null;
        };
        ok("a pointer written under a hook-attributed advance records `opened_by: hook` — the ordinary gate, where a turn has run by construction",
          (readOnly("reraise") || {}).opened_by === "hook",
          JSON.stringify((readOnly("reraise") || {}).opened_by));

        // AND THE START ATTRIBUTION WRITES THE OTHER VALUE. The case above is
        // the whole wiring — `hook` reaches the pointer only through `cmdRun`'s
        // `setOpenedBy(advancedBy)`, so a writer that ignored the attribution
        // would record null there and fail. What remains is the VALUE the start
        // act carries, and the case at ITEM 1 above already asserts that its
        // transitions carry `executor: "skill-expansion"` — the same object
        // this drives the writer with.
        //
        // DRIVEN AT THE WRITER RATHER THAN THROUGH `start` BECAUSE THE CLI
        // START CANNOT REACH A GATE HERE: the start act mints its own run
        // record, its first state is the survey, and the survey state runs
        // `cmdSurvey` against the gateway — which this pass, being seam-free by
        // construction, does not have. A fixture that pre-wrote the survey
        // record would be refused as a resumption, which is the start act's own
        // rule working correctly.
        {
          const startGates = gatesFor("startwriter");
          const rdSW = join(gs, "rd-start-writer");
          mkdirSync(rdSW, { recursive: true });
          const declSW = {
            id: "terrain-tag-selection", question: "Which tag does the survey open on?",
            gate_instance_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            declared_at: new Date().toISOString(),
          };
          const declPathSW = join(rdSW, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`);
          writeFileSync(declPathSW, JSON.stringify(declSW, null, 2) + "\n");
          const savedGates = process.env.KOGAKI_OPEN_GATES;
          process.env.KOGAKI_OPEN_GATES = startGates;
          try {
            setOpenedBy(SKILL_EXPANSION_EXECUTOR);
            writeOpenGatePointer(rdSW, declSW, declPathSW);
          } finally {
            setOpenedBy(null);
            if (savedGates === undefined) delete process.env.KOGAKI_OPEN_GATES;
            else process.env.KOGAKI_OPEN_GATES = savedGates;
          }
          ok("a pointer written under the START attribution records `opened_by: skill-expansion` — the one state in which no model turn can yet have run, and the one the prompt arm admits",
            (readOnly("startwriter") || {}).opened_by === "skill-expansion",
            JSON.stringify((readOnly("startwriter") || {}).opened_by));
        }

        rmSync(gs, { recursive: true, force: true });
      }

    }

    // ---- JUDGMENT PROVENANCE (kogaki#892). The subdivisions record's own
    // `judged: true` and its declared judge pin used to reach both owner
    // surfaces as an assertion the Harness stood behind. These cases assert
    // that what the Harness never observed is no longer rendered as though it
    // had been, and — the direction a provenance case is usually blind in —
    // that the observed form is still emittable, so the repair is a split and
    // not a blanket downgrade.
    {
      const grammar = loadGrammar(REPORT_FORMAT);
      const admits = (surface, text) => validateSurface(surface, text, grammar)
        .every((v) => !/line_class_allowlist/.test(v));
      const pin = { model_id: "a-model", effort_tier: "high" };
      const declared = { state: JUDGMENT_DECLARED, artifact_sha: "0123456789abcdef", invocation: null };
      const observed = { state: JUDGMENT_OBSERVED, artifact_sha: "0123456789abcdef", invocation: { id: "inv-1" } };

      // THE STATE, not the text: terrain invokes no judge, so the only
      // provenance a run can compute is `declared`. A future act that invokes
      // one flips `harnessJudgeInvocation` and this case with it.
      ok("terrain invokes no judge, so a computed provenance is DECLARED and carries no invocation record",
        judgmentProvenance(null).state === JUDGMENT_DECLARED
        && harnessJudgeInvocation() === null
        && judgmentProvenance(null).invocation === null);

      // The sha is taken by THIS layer from the bytes on disk — the one thing
      // about the judgment the Harness actually observed.
      {
        const dir = join(tmpdir(), `terrain-selftest-prov-${process.pid}`);
        mkdirSync(dir, { recursive: true });
        const f = join(dir, "subdivisions.json");
        writeFileSync(f, JSON.stringify({ G1: { judged: true, subgroups: [] } }));
        const expect = createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 16);
        ok("the provenance takes the subdivisions record's sha from the bytes on disk, not from anything the record declares",
          judgmentProvenance(f).artifact_sha === expect && expect.length === 16);
        rmSync(dir, { recursive: true, force: true });
      }

      // The display line. The pre-#892 text is the discriminator: a line that
      // still opens `judged by` under a DECLARED provenance is the defect.
      ok("under a declared provenance the display says the pin is DECLARED and does not say the judgment was observed",
        /^judge pin DECLARED — a-model \/ high\./.test(judgePinLine(pin, declared))
        && !/^judged by/.test(judgePinLine(pin, declared))
        && judgePinLine(pin, declared).includes("0123456789abcdef"));
      ok("the OBSERVED form is still composable and names the Harness's own invocation record — the repair is a split, not a blanket downgrade",
        /^judged by a-model \/ high — OBSERVED/.test(judgePinLine(pin, observed))
        && judgePinLine(pin, observed).includes("inv-1"));

      // Both forms must reach the surface: a grammar admitting only the one the
      // runtime happens to emit today would refuse the other the moment a
      // judge-invoking act existed, which is the amend-it-later shape the
      // superseded entry beside it records.
      ok("cotag_groups admits BOTH judge-pin lines judgePinLine actually composes",
        admits("cotag_groups", judgePinLine(pin, declared))
        && admits("cotag_groups", judgePinLine(pin, observed)));

      // Acceptance 2. `no split recorded` under a declaration; the judged-empty
      // wording only where the judgment was observed.
      ok("a judged-empty group renders NO SPLIT IS RECORDED under a declared provenance, and the judged-empty wording only under an observed one",
        judgedEmptyNoticeLines(declared)[0].startsWith("*NO SPLIT IS RECORDED")
        && !judgedEmptyNoticeLines(declared).join(" ").includes("this is a judged-empty outcome")
        && judgedEmptyNoticeLines(observed).join(" ").includes("this is a judged-empty outcome"));
      ok("full_report admits BOTH judged-empty notices judgedEmptyNoticeLines actually composes",
        admits("full_report", judgedEmptyNoticeLines(declared).join("\n"))
        && admits("full_report", judgedEmptyNoticeLines(observed).join("\n")));

      // A report record written before the field existed renders DECLARED. The
      // direction matters: the safe default for a record that cannot show an
      // observation is the state that claims none.
      // ---- kogaki#919. The display line was ONE unwrapped string of roughly
      // 450 characters, emitted once per subdivided group — on the terminal,
      // which is the surface kogaki#317 exists to keep readable under wrapping,
      // while the report's counterpart notice carrying the same content was
      // hand-wrapped. These cases bound the width rather than describe it.
      ok("both judge-pin arms render inside the display wrap column, and no line of either exceeds it",
        [judgePinLine(pin, declared), judgePinLine(pin, observed)]
          .every((text) => text.split("\n").length > 1
            && text.split("\n").every((l) => l.length <= DISPLAY_WRAP_COLUMNS)));
      // The column is TAKEN from the report notice, so the two surfaces cannot
      // wrap at two columns. This case is what binds them: widen one and the
      // other's own lines are measured against it.
      ok("the wrap column still fits the report notice it was taken from, on both of that notice's arms",
        [...judgedEmptyNoticeLines(declared), ...judgedEmptyNoticeLines(observed)]
          .every((l) => l.length <= DISPLAY_WRAP_COLUMNS));
      // A value the owner might copy is never split across lines.
      ok("wrapping breaks on spaces only — a token longer than the column is emitted whole rather than broken",
        judgePinLine(pin, declared).includes("`0123456789abcdef`")
        && judgePinLine(pin, observed).includes("`inv-1`")
        && wrapDisplayLine("a ".repeat(3) + "x".repeat(120), 20).some((l) => l.includes("x".repeat(120))));
      // Continuations are marked, and the grammar keys on the mark. A flush-left
      // continuation reads as a new statement, and would need a bare-placeholder
      // class to admit — which is what makes an allowlist inert.
      ok("continuation lines carry the hanging indent both arms' grammar class keys on",
        [judgePinLine(pin, declared), judgePinLine(pin, observed)]
          .every((text) => text.split("\n").slice(1).every((l) => l.startsWith("  "))
            && !text.split("\n")[0].startsWith(" ")));
      // ---- PR #921 round 1 finding 1. THE PIN IS COMPOSER-SUPPLIED AND
      // UNBOUNDED, and the wrap made its length reach the grammar. A form
      // abbreviating one space past the pin clause demands a further word on
      // the first rendered line, so a long enough `model_id` wrapped the clause
      // apart, no class matched line 1, and `emitOrRefuse` refused the WHOLE
      // cotag_groups surface — a display that destroys itself on an input the
      // owner typed. The fixtures carried short ids, which is why nothing saw
      // it. This case is stated over the LENGTH rather than over one id: it
      // sweeps the whole range through and past the width, so a later change to
      // the column, the head or the form is measured against every crossing
      // rather than against the one specimen that failed.
      ok("a long composer-supplied judge pin still classifies — the pin clause is never wrapped off the first line, at any id length",
        [1, 20, 45, 48, 52, 60, 80, 140].every((n) => {
          const long = { model_id: "m".repeat(n), effort_tier: "high" };
          return [judgePinLine(long, declared), judgePinLine(long, observed)]
            .every((text) => text.split("\n")[0].includes(`${long.model_id} / high`)
              && admits("cotag_groups", text));
        }));

      // ---- kogaki#918. The provenance clause was composed against EVERY pin,
      // including the typed literal `none` — so the absence of a pin rendered
      // as `pin DECLARED`, an absence asserted as a declaration, which is #892's
      // own class one step over and arrived in the change that closed it.
      ok("a `none` pin renders no declaration: the report's judge line asserts nothing was declared and never says DECLARED",
        reportJudgeLine({ judge_pin: NO_JUDGE }, declared).startsWith("*Judge:* `none` —")
        && !/declared/i.test(reportJudgeLine({ judge_pin: NO_JUDGE }, declared))
        && !/declared/i.test(reportJudgeLine({ judge_pin: NO_JUDGE }, observed)));
      // The direction a downgrade case is usually blind in: the two pinned arms
      // must still assert what they always did, or the repair is a blanket
      // silencing rather than a third arm.
      ok("a pinned report judge line still says DECLARED where the Harness observed nothing, and OBSERVED where it did",
        /pin DECLARED, no Harness invocation record/.test(reportJudgeLine({ judge_pin: pin }, declared))
        && /OBSERVED, Harness invocation record `inv-1`/.test(reportJudgeLine({ judge_pin: pin }, observed)));
      // Acceptance 2. The rerun path re-renders a PRIOR record through this
      // same composer, so the clause must describe the RECORD; `observed:` read
      // as a claim about the run that re-read it, and a pre-#892 record
      // re-rendered by a `--subdivisions` rerun said the rerun observed nothing.
      ok("the report judge line names what the RECORD holds and never what the run passed, on all three arms",
        [reportJudgeLine({ judge_pin: NO_JUDGE }, declared),
          reportJudgeLine({ judge_pin: pin }, declared),
          reportJudgeLine({ judge_pin: pin }, observed)]
          .every((line) => /the record holds:|over subdivisions record sha/.test(line)
            && !/observed: /.test(line)));
      ok("full_report admits all three judge lines reportJudgeLine actually composes",
        admits("full_report", reportJudgeLine({ judge_pin: NO_JUDGE }, declared))
        && admits("full_report", reportJudgeLine({ judge_pin: pin }, declared))
        && admits("full_report", reportJudgeLine({ judge_pin: pin }, observed)));

      ok("a report record carrying no judgment_provenance reads as DECLARED rather than as observed",
        provenanceOf({}).state === JUDGMENT_DECLARED
        && provenanceOf(undefined).state === JUDGMENT_DECLARED
        && provenanceOf({ judgment_provenance: observed }).state === JUDGMENT_OBSERVED);
    }

    // ---- THE NEIGHBORHOOD ROW NAMES ITS THESIS-CANDIDATE TARGET (kogaki#861,
    // owner report 2026-09-04, owner rulings 2026-09-05). The Provenance
    // neighborhood sat in the same file as the Thesis candidates and was
    // related to nothing in it: a reader could not tell what a suggested
    // neighbor was FOR, and the level that ranks the row arrived at the end of
    // the sentence it ranks. These cases assert the four fixed line classes,
    // the judgment record's new required field, and the ordering that makes a
    // target checkable at all.
    //
    // SEAM-FREE, like every case above: the reader, the display and the section
    // are pure over their inputs, and the refusals are asserted through
    // `neighborhoodJudgmentsFrom`/`refuseTargetsOutsideCandidates`, which THROW
    // rather than exiting — the arrangement `emitOrRefuse` uses for the format
    // guard, and the reason these refusals are assertable at all.
    {
      const grammar = loadGrammar(REPORT_FORMAT);
      const admits = (surface, text) => validateSurface(surface, text, grammar)
        .every((v) => !/line_class_allowlist/.test(v));
      const refused = (fn) => {
        try { fn(); return null; }
        catch (e) { return e instanceof JudgmentRefusal ? e.message : null; }
      };
      const wellFormed = {
        "a/b": { level: "core", claim: "A decision from the thread that produced two of this group's members.",
          target: { candidate: "TC1", role: "Core" } },
      };

      ok("a judgment carrying level and claim and NO target is refused — the row's TC-target line is a fixed class and has nothing else to render from",
        /carries no target/.test(refused(() => neighborhoodJudgmentsFrom({
          "a/b": { level: "core", claim: "a claim" } })) || ""));
      ok("a target that is not a Thesis-candidate id is refused, and so is one carrying no role — WHICH candidate and WHAT FOR are both owed",
        /is not a Thesis-candidate id/.test(refused(() => neighborhoodJudgmentsFrom({
          "a/b": { level: "core", claim: "a claim", target: { candidate: "l15", role: "Core" } } })) || "")
        && /and no role for it/.test(refused(() => neighborhoodJudgmentsFrom({
          "a/b": { level: "core", claim: "a claim", target: { candidate: "TC1" } } })) || ""));
      // THE CONTROL for the two above: the pre-existing refusals still fire and
      // a well-formed record still passes, so the new field is an addition
      // rather than a reader that refuses everything.
      ok("the level-with-no-claim refusal is untouched, and a well-formed record carries level, claim and target through the reader",
        /A level without a claim is a rank with no reason/.test(refused(() => neighborhoodJudgmentsFrom({
          "a/b": { level: "core", target: { candidate: "TC1", role: "Core" } } })) || "")
        && (() => {
          const j = neighborhoodJudgmentsFrom(wellFormed).get("a/b");
          return j.level === "core" && /A decision from the thread/.test(j.claim)
            && j.target.candidate === "TC1" && j.target.role === "Core";
        })());

      // A TARGET IS CHECKED AGAINST THE COMPOSED SET, not against its own shape:
      // `TC9` is a well-formed id naming nothing in a three-candidate pull.
      ok("a target naming a Thesis candidate the pull does not carry is refused, naming the row and the composed set; one inside the set passes",
        /TC9/.test(refused(() => refuseTargetsOutsideCandidates(
          neighborhoodJudgmentsFrom({ "a/b": { level: "core", claim: "c", target: { candidate: "TC9", role: "Core" } } }),
          ["TC1", "TC2", "TC3"], "J3_neighborhood")) || "")
        && refused(() => refuseTargetsOutsideCandidates(
          neighborhoodJudgmentsFrom(wellFormed), ["TC1", "TC2", "TC3"], "J3_neighborhood")) === null);

      // ---- THE ROW ITSELF. One judged suggestion, rendered through the display
      // the report section reuses, so what is asserted is what the owner reads.
      const row = (over = {}) => ({
        nid: "N3", slug: "a/b", level: "core",
        relation: "from the same Batch as L15, L97 (q_a/2026-08-08)",
        claim: "A decision from the thread that produced two of this group's members.",
        target: { candidate: "TC1", role: "Core" },
        gloss: "Binding claims at the refusing layer", gloss_cite: "product-lab@aaaaaaa gloss/ELEMENTS.jsonl:12",
        ...over,
      });
      const linesOf = (over) => neighborhoodDisplay({ tag: "t", gids: ["G1"], suggestions: [row(over)] });
      const shown = linesOf();
      const at = (re) => shown.findIndex((l) => re.test(l));

      ok("the row states its level at the HEAD, beside the id and before the relation",
        /^- N3 \[core\] — from the same Batch as L15, L97/.test(shown[at(/^- N3 /)] || ""));
      ok("the claim line carries NO trailing level — the level has one carrier and it is the row above",
        (() => {
          const claimLine = shown.find((l) => /A decision from the thread/.test(l));
          return claimLine === "  A decision from the thread that produced two of this group's members."
            && !/\[core\]/.test(claimLine);
        })());
      ok("the four line classes render in the ruled order: row, TC target, Gloss, claim",
        (() => {
          const i = at(/^- N3 /);
          return i >= 0 && shown[i + 1] === "  serves: Core for TC1"
            && /^  “Binding claims at the refusing layer”/.test(shown[i + 2] || "")
            && /^  A decision from the thread/.test(shown[i + 3] || "");
        })(), JSON.stringify(shown.slice(-4)));
      ok("the TC-target line is a FIXED class: a row reaching the renderer with no target renders the typed absence marker rather than dropping the line",
        (() => {
          const l = linesOf({ target: undefined });
          const i = l.findIndex((x) => /^- N3 /.test(x));
          return l[i + 1] === `  ${NO_TARGET}` && l.length === shown.length;
        })());

      // THE GLOSS LINE SURVIVES THE REFORMAT, absence markers included (owner
      // ruling 2026-09-05). A row whose shard carried nothing must still say so:
      // four clean lines over an unreported fault is the anti-correlated check.
      ok("the Gloss line still renders quoted at its cite, and each of the three typed absence markers still renders in its place",
        /^  “Binding claims at the refusing layer”  product-lab@aaaaaaa/.test(shown[at(/^- N3 /) + 2] || "")
        && [[{ gloss: null, gloss_cite: null }, NO_SHARD_ADDRESSED],
          [{ gloss: NO_SEAM, gloss_cite: null }, NO_SEAM],
          [{ gloss: "a headline with no address", gloss_cite: null }, NO_HEADLINE]]
          .every(([over, marker]) => {
            const l = linesOf(over);
            return l[l.findIndex((x) => /^- N3 /.test(x)) + 2] === `  ${marker}`;
          }));

      // THE GRAMMAR ADMITS WHAT THE EMITTER PRODUCES — the direction PR #658's
      // defect ran in, where a class never admitted its own emitter's line and
      // nothing said so.
      ok("full_report admits every line the reformatted row emits, on the quoted-Gloss arm and on all four absence arms",
        [shown, linesOf({ target: undefined }), linesOf({ gloss: null, gloss_cite: null }),
          linesOf({ gloss: NO_SEAM, gloss_cite: null }), linesOf({ gloss: "x", gloss_cite: null })]
          .every((l) => admits("full_report", l.slice(1).join("\n"))));

      // AND THE CLASSES THEMSELVES CARRY IT, which the surface-level case above
      // CANNOT assert. `neighborhood_suggestion_claim` lost its trailing level
      // and now pins no literal, so it admits any two-space-indented line —
      // deleting the target class outright leaves the surface admitting the
      // target line under the claim class, and `admits` stays green. Verified by
      // running that mutation, which is why this case reads the DECLARED class
      // by id and drives its own matcher.
      ok("the grammar's own classes carry the reformat: the target class admits the emitted line and refuses one naming no candidate, the absence marker has its own class, and the row class refuses the pre-#861 level-less row",
        (() => {
          const byId = (id) => {
            const e = ((grammar.surfaces.full_report || {}).line_classes || []).find((x) => x.id === id);
            return e ? classMatchers(e, grammar) : null;
          };
          const m = (res, line) => !!res && res.some((re) => re.test(line));
          return m(byId("neighborhood_suggestion_target"), "  serves: Core for TC1")
            && !m(byId("neighborhood_suggestion_target"), "  serves: Core for L1")
            && m(byId("neighborhood_suggestion_target_absent"), `  ${NO_TARGET}`)
            && m(byId("neighborhood_suggestion_row"), "- N3 [core] — from the same Batch as L15")
            && !m(byId("neighborhood_suggestion_row"), "- N3 — from the same Batch as L15");
        })());

      // ---- THE IDS ARE FIXED BEFORE THE JUDGMENT, which is what makes a target
      // checkable. Asserted from the OTHER side too: the section renders the id
      // it was handed, so a section that re-mints from its loop index fails.
      ok("readThesisCandidates mints the TC ids, and the Thesis candidates section renders the id it is handed rather than its own loop index",
        (() => {
          const composed = readThesisCandidates(
            [{ claim: "one", strands: ["L1", "L2"] }, { claim: "two", strands: ["L2", "L3"] },
              { claim: "three", strands: ["L1", "L3"] }],
            ["L1", "L2", "L3"], { thesis_candidates: 3 });
          const section = thesisCandidatesSection([{ id: "TC7", claim: "seven", strands: ["L1", "L2"] }]);
          return composed.map((c) => c.id).join(",") === "TC1,TC2,TC3"
            && section.some((l) => l === "- TC7 — seven");
        })());

      // ---- A RECORD PREDATING THE ID MINT IS RECOMPUTED, NEVER REPLAYED AND
      // NEVER REFUSED (PR #923 round 1, finding 2). The section's refusal is
      // right about a caller that bypassed the reader and wrong about a stored
      // record written before the field existed; the replay guard is what keeps
      // the second out of the first's reach. The CONTROL is the other half —
      // a record whose candidates all carry ids still replays, so this is a
      // guard on one shape and not a blanket disabling of the rerun path.
      ok("a stored report record whose Thesis candidates carry no id is recomputed rather than replayed, and one that carries them still replays",
        (() => {
          const pre = { thesis_candidates: [{ claim: "one", strands: ["L1"] }] };
          const post = { thesis_candidates: [{ id: "TC1", claim: "one", strands: ["L1"] }] };
          const none = { thesis_candidates: [] };
          // THE DECISION IS WHAT IS CALLED, never the conjunct alone: the
          // identity comparison is injected so this reaches the same function
          // `cmdReport` asks. ALL THREE CONJUNCTS ARE REACHED, and the third
          // one is why the injection takes two values rather than one
          // (kogaki#926): with `same` alone every assertion above was decided
          // by the two predating guards and the id predicate, so deleting
          // `sameIdentityFn(...)` from `shouldReplayPrior` left this case
          // GREEN — the case claimed the whole decision and bound two thirds
          // of it. `differs` is the discriminator: the records that replay
          // under a comparison returning true are RECOMPUTED under one
          // returning false, which no other conjunct can produce.
          const same = () => true;
          const differs = () => false;
          const idty = { neighborhood_judgment: "NO_JUDGE" };
          const wrap = (r) => ({ identity: idty, ...r });
          return priorPredatesCandidateIds(pre)
            && !priorPredatesCandidateIds(post)
            && !priorPredatesCandidateIds(none)
            && !priorPredatesCandidateIds({})
            && !shouldReplayPrior(wrap(pre), idty, same)
            && shouldReplayPrior(wrap(post), idty, same)
            && shouldReplayPrior(wrap(none), idty, same)
            && !shouldReplayPrior({ identity: {} }, idty, same)
            && !shouldReplayPrior(wrap(post), idty, differs)
            && !shouldReplayPrior(wrap(none), idty, differs);
        })());

      // ---- THE SHIPPED COMPARATOR IS DRIVEN, NOT INJECTED (kogaki#974). The
      // case above binds the identity conjunct's PRESENCE in the decision and
      // nothing else: all six of its `shouldReplayPrior` calls pass a stub
      // through `sameIdentityFn`, while `cmdReport` calls with the DEFAULT. So
      // `sameIdentity` and its `reportIdentityKey` had no reader in any case,
      // and dropping the `neighborhood_judgment` component from that key left
      // the pass green at 95 — the bind-a-proxy shape kogaki#926 repaired one
      // layer up, at the next seam in.
      //
      // The two records differ ONLY in that component, which is what makes the
      // comparator the thing being asserted: every other conjunct of the
      // decision is identical across the pair, so no predating guard and no id
      // predicate can produce the discrimination.
      //
      // THE kogaki#741 ABSENCE-HASHING RULE IS REACHED HERE RATHER THAN STATED
      // IN A COMMENT. It is unreachable through `shouldReplayPrior`, whose
      // `predatesJudgmentKey` guard short-circuits on exactly the record the
      // rule is about, so the rule is driven through the exported `sameIdentity`
      // directly — with a control that an absent component still discriminates
      // against a REAL judgment, so the case is not satisfied by a key that
      // hashes everything to `NO_JUDGE`.
      ok("shouldReplayPrior with the SHIPPED comparator recomputes two report identities differing only in neighborhood_judgment, and an absent component hashes as NO_JUDGE without collapsing the key",
        (() => {
          const identity = (nj) => ({
            pin: "product-lab@abc1234",
            query: { tag: "testing", ids: ["G1", "G2"] },
            judge_pin: NO_JUDGE,
            neighborhood_judgment: nj,
          });
          const a = identity("J-A");
          const b = identity("J-B");
          // NO THIRD ARGUMENT — this is the call `cmdReport` makes.
          const replaysAtItsOwnIdentity = shouldReplayPrior({ identity: a }, a);
          const recomputesAtTheOther = !shouldReplayPrior({ identity: a }, b);
          // the kogaki#741 rule, and its control.
          const absenceHashesAsNoJudge = sameIdentity(identity(undefined), identity(NO_JUDGE));
          const absenceStillDiscriminates = !sameIdentity(identity(undefined), a);
          return replaysAtItsOwnIdentity
            && recomputesAtTheOther
            && absenceHashesAsNoJudge
            && absenceStillDiscriminates;
        })());

      // ---- AND THE SAME DISCRIMINATION OVER THE BINARY COMPONENT (kogaki#1076,
      // PR #1078 round 1 finding 1). The component was added to
      // `reportIdentityKey` with nothing driving the comparator over it: the
      // registered fixture asserts the pin's COMPOSITION in a written report, so
      // striking the component back out of the key left both it and this pass
      // green -- the kogaki#974 defect one component over, arriving through the
      // same door and repaired with the same shape.
      //
      // THE CLAIM UNDER TEST IS THE ONE SPEC-terrain §"THE JUDGE BINARY IS THE
      // RUN'S, RESOLVED ONCE BY THE SESSION THAT STARTS IT" MAKES: two runs with equal
      // `model_id` and `effort_tier` that ran different executables are DIFFERENT
      // identities. So the pair differs only in `binary_version` and every other
      // conjunct is identical, which is what makes the comparator the thing being
      // asserted rather than some other guard. The absence control is the
      // kogaki#741 rule applied to this component -- a pin written before the
      // field existed hashes as `NO_JUDGE`, which is what it meant -- with its
      // own control that the absence still discriminates against a pin naming a
      // binary, so the case is not satisfied by a key that hashes everything.
      ok("two report identities differing ONLY in the judge pin's binary_version are not the same identity, and an absent component hashes as NO_JUDGE without collapsing the key",
        (() => {
          const identity = (bv) => ({
            pin: "product-lab@abc1234",
            query: { tag: "testing", ids: ["G1", "G2"] },
            judge_pin: { model_id: "m", effort_tier: "high", binary_version: bv },
            neighborhood_judgment: NO_JUDGE,
          });
          const a = identity("claude 1.2.3");
          const b = identity("claude 4.5.6");
          const sameAtItself = sameIdentity(a, a);
          const differsOnTheBinary = !sameIdentity(a, b);
          const absenceHashesAsNoJudge = sameIdentity(identity(undefined), identity(null));
          const absenceStillDiscriminates = !sameIdentity(identity(undefined), a);
          // AND THROUGH THE DECISION TOO, on the kogaki#974 case's own ground: the
          // comparator is what `cmdReport` reaches with NO third argument, so a
          // case that only called `sameIdentity` would leave the shipped call
          // path unread exactly as the six injected calls above it did.
          const replaysAtItsOwnIdentity = shouldReplayPrior({ identity: a }, a);
          const recomputesAtTheOther = !shouldReplayPrior({ identity: a }, b);
          return sameAtItself && differsOnTheBinary
            && absenceHashesAsNoJudge && absenceStillDiscriminates
            && replaysAtItsOwnIdentity && recomputesAtTheOther;
        })());

      // ---- THE RESOLUTION'S TWO EXPORTS HAVE A READER (kogaki#1076, PR #1078
      // round 1 finding 2). `checks/check-terrain-judge-invocation.sh` drives
      // them through a whole start act, which is the property that matters and is
      // also the most expensive way to ask any single question about them; these
      // are the two questions a fixture that builds a PATH and runs `node` cannot
      // ask cheaply, and an export offered to nobody reads as a case that was
      // intended and not written.
      ok("judgeBinaryCandidates walks PATH in its declared order and de-duplicates it, and treats a command carrying a separator as its own single candidate",
        (() => {
          const walked = judgeBinaryCandidates("claude", ["/a", "/b", "/a", "", "/c"].join(delimiter));
          const inOrder = JSON.stringify(walked)
            === JSON.stringify(["/a/claude", "/b/claude", "/c/claude"]);
          // A PATH LOOKUP IS WHAT A BARE WORD GETS, and nothing else does: an
          // absolute path and a relative one are each already the single
          // candidate this act exists to produce, so neither is searched for.
          const absolute = judgeBinaryCandidates("/opt/claude", ["/a", "/b"].join(delimiter));
          const relative = judgeBinaryCandidates("./bin/claude", ["/a", "/b"].join(delimiter));
          return inOrder
            && JSON.stringify(absolute) === JSON.stringify(["/opt/claude"])
            && relative.length === 1 && relative[0].endsWith("/bin/claude");
        })());

      // A SHIM AHEAD OF A WORKING BINARY, AT THE FUNCTION. The shim EXISTS and is
      // EXECUTABLE and fails only when it is run, so a resolution testing either
      // property picks it; this is the case that says the walk RUNS its
      // candidates. It asserts the rejected candidate is NAMED as well, because
      // the refusal is composed from that list and "the judge could not be run"
      // over a bare word is not something an operator can act on -- the refusal
      // itself is driven end to end by the registered fixture's case (b), which
      // is where a `process.exit` refusal can be observed.
      ok("resolveJudgeBinary runs each PATH candidate and takes the first that exits 0, naming the ones it rejected",
        (() => {
          const root = mkdtempSync(join(tmpdir(), "terrain-judge-resolve-"));
          const shimDir = join(root, "shim");
          const goodDir = join(root, "good");
          mkdirSync(shimDir, { recursive: true });
          mkdirSync(goodDir, { recursive: true });
          const shim = join(shimDir, "claude");
          const good = join(goodDir, "claude");
          writeFileSync(shim, '#!/bin/sh\nexec "$0.exe" "$@"\n', { mode: 0o755 });
          writeFileSync(good, "#!/bin/sh\necho 'fixture-judge 9.9.9'\n", { mode: 0o755 });
          const r = resolveJudgeBinary("claude", [shimDir, goodDir].join(delimiter));
          rmSync(root, { recursive: true, force: true });
          return r.path === good
            && r.version === "fixture-judge 9.9.9"
            && r.rejected.length === 1 && r.rejected[0].path === shim;
        })());

      // ---- AN EDITED CANDIDATES FILE AT THE SAME IDENTITY IS NOT IDEMPOTENT
      // (kogaki#927). The defect this binds reported SUCCESS: `--thesis-candidates`
      // decided the Thesis candidates and the `serves: … for TC<n>` rows while
      // sitting in neither the identity nor the recorded set, so the rerun
      // replayed the prior
      // section and printed that it was idempotent. The case drives the two
      // functions `cmdReport`'s replay branch actually asks — the digest
      // composer and the delta — over REAL FILE BYTES, because the digest is a
      // read of the file and asserting over hand-written digests would bind a
      // restatement rather than the act.
      //
      // FOUR CONJUNCTS, and each is one of the ways the fix could be wrong: the
      // flag is in the set at all; an edited file is NAMED in the delta rather
      // than merely counted; an UNCHANGED file still reports empty, which is the
      // control that this is not a blanket disabling of the rerun path; and a
      // record predating the field recomputes rather than refusing.
      ok("an edited --thesis-candidates file at the same identity is named in the composed-input delta, an unchanged one still replays, and a record predating the field recomputes",
        (() => {
          const d = join(tmpdir(), `terrain-selftest-tc-${process.pid}`);
          mkdirSync(d, { recursive: true });
          try {
            const write = (name, body) => {
              const f = join(d, name);
              writeFileSync(f, JSON.stringify(body, null, 2) + "\n");
              return f;
            };
            const claims = write("claims.json", { a: 1 });
            const before = write("tc-before.json", [{ claim: "one", strands: ["L1", "L2"] }]);
            const after = write("tc-after.json", [{ claim: "ONE, EDITED", strands: ["L1", "L2"] }]);
            const argsOf = (tc) => ({ claims, "thesis-candidates": tc });

            const prior = composedInputDigests(argsOf(before));
            const edited = composedInputDigests(argsOf(after));
            const same = composedInputDigests(argsOf(before));

            const namesIt = COMPOSED_INPUT_FLAGS.includes("thesis-candidates");
            const deltaEdited = composedInputDelta(prior, edited);
            const deltaSame = composedInputDelta(prior, same);
            // A PRE-#927 RECORD carries every other flag and not this one.
            const preRecord = { ...prior };
            delete preRecord["thesis-candidates"];

            return namesIt
              && prior["thesis-candidates"] !== NO_JUDGE
              && composedInputDigests({ claims })["thesis-candidates"] === NO_JUDGE
              && Array.isArray(deltaEdited) && deltaEdited.join(",") === "thesis-candidates"
              && Array.isArray(deltaSame) && deltaSame.length === 0
              && composedInputDelta(preRecord, edited) === null;
          } finally {
            rmSync(d, { recursive: true, force: true });
          }
        })());

      // ---- THE ORDERING, read from the shipped carrier (the workflow table keeps the state
      // set there, so this is a property of the table and not of this file).
      ok("the shipped table composes the Thesis candidates as a judgment point AHEAD of J3_neighborhood, which is ahead of the full_report write",
        (() => {
          const ids = shipped.states.map((x) => x.id);
          const tc = shipped.states.find((x) => x.id === "thesis_candidates");
          return !!tc && tc.kind === "judgment"
            && ids.indexOf("thesis_candidates") < ids.indexOf("J3_neighborhood")
            && ids.indexOf("J3_neighborhood") < ids.indexOf("full_report");
        })());
    }

    // ---- THE SUBDIVISION RECORD'S ARGUMENT PATH (kogaki#1085 fixture 3(b)).
    //
    // The states that RESOLVE an entered id now join the subdivision record from
    // the run record, because a hook-driven run supplies no argv and every
    // SubGroup id the display had just printed resolved to nothing. The join is
    // a FALLBACK ORDER and not a replacement: an explicit `--subdivisions` still
    // wins, which is what keeps the fixture and second-repository paths --
    // callers with a record on disk and no run record at all -- resolving
    // exactly the ids they resolve today. These two cases are that path and its
    // control, driven over `resolveReportTargets` itself.
    {
      const subdivDir = mkdtempSync(join(tmpdir(), "terrain-selftest-subids-"));
      try {
        const members = ["m1", "m2", "m3", "m4", "m5", "m6"];
        const record = { candidates: members.map((id) => ({ id, tags: ["fix", "wide"] })) };
        const groupName = "fix × wide";
        const subgroup = (name, ms) => ({
          name, claim: `A fixture claim over ${ms.length} member(s).`, members: ms,
          verdicts: { coherence: "tight", coherence_why: "a fixture reason" },
        });
        const subPath = join(subdivDir, "subdivisions.json");
        writeFileSync(subPath, JSON.stringify({
          [groupName]: {
            judged: true,
            subgroups: [subgroup("the first three", members.slice(0, 3)),
                        subgroup("the second three", members.slice(3))],
          },
        }) + "\n");
        ok("a caller supplying --subdivisions resolves a SubGroup id to that SubGroup's members alone, with no run record in play",
          (() => {
            const r = resolveReportTargets(record, "fix", ["G1-1"], { subdivisions: subPath });
            const t = r.targets[0];
            return r.targets.length === 1
              && t.kind === "subgroup"
              && t.gid === "G1-1"
              // NARROWER THAN THE PARENT, which is the half that discriminates:
              // a resolver that quietly handed back the whole Group would render
              // the same report and pass a membership-free assertion.
              && t.sg.members.join(",") === "m1,m2,m3"
              && t.group.members.length === 6;
          })());
        ok("the same display with no subdivisions record offers no SubGroup ids at all — the control that the case above is about the record rather than about the id",
          (() => {
            const r = resolveReportTargets(record, "fix", ["G1"], {});
            return r.subOf(r.groups[0]) === null
              && r.targets.length === 1
              && r.targets[0].kind === "group";
          })());
      } finally {
        rmSync(subdivDir, { recursive: true, force: true });
      }
    }

    console.log(`terrain self-test: ${n} case(s) pass${bad.length ? `, FAILURES: ${bad.join(" | ")}` : ""}`);
    if (bad.length) process.exit(1);
