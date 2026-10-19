#!/usr/bin/env node
// checks/terrain-neighborhood-cases.mjs — the neighborhood row, the fixed ids, the shipped comparator, the subdivision record's argument path and the judge's timeout and retry stops.
// One section of the Terrain runtime's fixture pass, cut from the one case file
// by kogaki#1459. Run by checks/check-terrain-runtime.sh, which sums every case
// file's count line against the registry's `case_floor`; the shared fixtures
// are checks/fixtures/terrain-cases/helpers.mjs.
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, join, sep } from "node:path";
import { tmpdir } from "node:os";
import { classMatchers, loadGrammar, validateSurface } from "../src/format-guard.mjs";
import { GATE_CALL_SUFFIX } from "../src/workflow/gate.mjs";
import { resolveJudgeBinary } from "../src/workflow/judge.mjs";
import {
  REPO, readJson, REPORT_FORMAT, RUN_RECORD_FILE, NO_HEADLINE,
  NO_SHARD_ADDRESSED, NO_SEAM, NO_TARGET, NO_JUDGE, FIXTURE_PAYLOAD, gateway,
  terrain, moduleUrl, SCRATCH, LONE_SUBDIVISIONS, ok, once, tagStopFixture,
  fixFixture, finish,
} from "./fixtures/terrain-cases/helpers.mjs";
const { rd, tp } = tagStopFixture();
const { FIX_GW, fixSurvey, FIX_SUBDIVISIONS, STUB_JUDGE, SHIPPED_TABLE } = fixFixture();

// ---- THE NEIGHBORHOOD ROW NAMES ITS THESIS-CANDIDATE TARGET (kogaki#861,
// owner report 2026-09-04, rulings 2026-09-05). A suggested neighbor was related
// to nothing in the Thesis candidates beside it, and its rank came last. These
// cases assert the four fixed line classes, the judgment record's required
// field, and the ordering that makes a target checkable.
//
// THROUGH `report` (kogaki#1257): every case is a pull over the lone-tag
// fixture's G2 with the enumeration, the judgment record and the Thesis
// candidates, read off the pull's exit, refusal or rendering. An arm no pull
// reaches from its inputs is reached by re-rendering a stored record whose
// fields this pass edits between two pulls.
{
  const grammar = loadGrammar(REPORT_FORMAT);
  const admits = (surface, text) => validateSurface(surface, text, grammar)
    .every((v) => !/line_class_allowlist/.test(v));
  const GLOSS_ADDRESS = "lessons/tag=agents,window=2026-08";
  const NB_ANSWERS = {
    surface_names: { lines: [{ text: GLOSS_ADDRESS }, { text: "lessons/tag=testing,window=2026-08" }] },
    gloss_index: {
      [GLOSS_ADDRESS]: { lines: [{ text: "## a/b", cite: "gloss/x.md:11@aaaaaaa" },
        { text: "Binding claims at the refusing layer. More prose after the headline.", cite: "product-lab@aaaaaaa gloss/ELEMENTS.jsonl:12" }] },
      "*": { lines: [] },
    },
  };
  const suggestion = (over = {}) => ({
    nid: "N3", slug: "a/b", family: "decision", tags: ["agents"], seeds: ["bravo", "alpha"],
    reached_by: [{ substrate: "source_batch", instance: "q_a/2026-08-08" }], ...over,
  });
  const wellFormed = {
    "a/b": { level: "core", claim: "A decision from the thread that produced two of this group's members.",
      target: { candidate: "TC1", role: "Core" } },
  };
  const THREE_TC = [{ claim: "one", strands: ["L1", "L2"] }, { claim: "two", strands: ["L2", "L1"] },
    { claim: "three", strands: ["L1", "L2"] }];
  let nbSeq = 0;
  // One pull. `dir` names the report store, so two pulls handed the same
  // one are a pull and its rerun.
  const nbReport = ({ judgments = wellFormed, sug = suggestion(), tc = THREE_TC, dir = null,
    env = null, extra = [], files = null } = {}) => {
    const d = join(SCRATCH, `nb-${nbSeq += 1}`);
    mkdirSync(d, { recursive: true });
    const f = (name, body) => { const p = join(d, name); writeFileSync(p, JSON.stringify(body)); return p; };
    const paths = files || {
      cands: f("candidates.json", { neighborhood: { gids: ["G2"], suggestions: sug ? [sug] : [], unresolved: [],
        counts: { seeds: 2, suggested: sug ? 1 : 0, rendered: sug ? 1 : 0, unresolved: 0, by_family: {} } } }),
      judgments: judgments === null ? null : f("judgments.json", judgments),
      tc: tc === null ? null : f("thesis-candidates.json", tc),
    };
    const reports = dir || join(d, "reports");
    const rendering = join(d, "rendering");
    const r = terrain(["report", "--survey", join(REPO, "checks", "fixtures", "survey", "lone-tag-member.json"),
      "--tag", "testing", "--ids", "G2", "--judge-model", "m", "--judge-effort", "high",
      "--subdivisions", LONE_SUBDIVISIONS, "--neighborhood-candidates", paths.cands,
      ...(paths.judgments ? ["--neighborhood", paths.judgments] : []),
      ...(paths.tc ? ["--thesis-candidates", paths.tc] : []),
      "--report-dir", reports, "--rendering-dir", rendering, ...extra],
    { env: env || gateway(join(d, "gw"), NB_ANSWERS) });
    const out = join(rendering, "FullReport.md");
    const text = existsSync(out) ? readFileSync(out, "utf8") : "";
    const lines = text.split("\n");
    const at = lines.indexOf("## Provenance neighborhood");
    const recs = existsSync(reports) ? readdirSync(reports).filter((x) => x.endsWith(".json")) : [];
    return { ...r, paths, reports, text, section: at < 0 ? [] : lines.slice(at),
      recordPath: recs.length === 1 ? join(reports, recs[0]) : null };
  };
  // A stored record edited in place, then the same pull again.
  const rerenderEdited = (first, edit, again = {}) => {
    if (!first.recordPath) return { status: null, text: "", section: [] };
    const rec = readJson(first.recordPath);
    edit(rec);
    writeFileSync(first.recordPath, JSON.stringify(rec));
    return nbReport({ files: first.paths, dir: first.reports, ...again });
  };
  const refusedWith = (re, opts) => {
    const r = nbReport(opts);
    return r.status !== 0 && re.test(r.stderr) ? r.stderr : null;
  };
  // THE WELL-FORMED PULL AND ITS TARGETLESS RE-RENDER are read by two blocks,
  // so each is made by the first block that asks (kogaki#1425).
  const pulledOnce = once(() => nbReport());
  const noTargetOnce = once(() => rerenderEdited(nbReport(), (rec) => { delete rec.neighborhood.suggestions[0].target; }));

  {
    ok("a judgment carrying level and claim and NO target is refused — the row's TC-target line is a fixed class and has nothing else to render from",
      !!refusedWith(/carries no target/, { judgments: { "a/b": { level: "core", claim: "a claim" } } }));
    ok("a target that is not a Thesis-candidate id is refused, and so is one carrying no role — WHICH candidate and WHAT FOR are both owed",
      !!refusedWith(/is not a Thesis-candidate id/, { judgments: { "a/b": { level: "core", claim: "a claim", target: { candidate: "l15", role: "Core" } } } })
      && !!refusedWith(/and no role for it/, { judgments: { "a/b": { level: "core", claim: "a claim", target: { candidate: "TC1" } } } }));
    // THE CONTROL for the two above: the pre-existing refusals still fire and
    // a well-formed record still passes, so the new field is an addition
    // rather than a reader that refuses everything.
    const pulled = pulledOnce();
    const shown = pulled.section;
    const at = (re) => shown.findIndex((l) => re.test(l));
    ok("the level-with-no-claim refusal is untouched, and a well-formed record carries level, claim and target through the reader",
      !!refusedWith(/A level without a claim is a rank with no reason/, { judgments: { "a/b": { level: "core", target: { candidate: "TC1", role: "Core" } } } })
      && pulled.status === 0
      && /^- N3 \[core\] /.test(shown[at(/^- N3 /)] || "")
      && shown.includes("  A decision from the thread that produced two of this group's members.")
      && shown.includes("  serves: Core for TC1"));

    // A TARGET IS CHECKED AGAINST THE COMPOSED SET, not against its own shape:
    // `TC9` is a well-formed id naming nothing in a three-candidate pull.
    ok("a target naming a Thesis candidate the pull does not carry is refused, naming the row and the composed set; one inside the set passes",
      (() => {
        const msg = refusedWith(/TC9/, { judgments: { "a/b": { level: "core", claim: "c", target: { candidate: "TC9", role: "Core" } } } });
        return !!msg && msg.includes("a/b -> TC9") && msg.includes("TC1, TC2, TC3") && pulled.status === 0;
      })());

    // ---- THE ROW ITSELF. One judged suggestion, rendered through the display
    // the report section reuses, so what is asserted is what the owner reads.
    ok("the row states its level at the HEAD, beside the id and before the relation",
      /^- N3 \[core\] — from the same Batch as L1, L2/.test(shown[at(/^- N3 /)] || ""));
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
          && /^  “Binding claims at the refusing layer\.”/.test(shown[i + 2] || "")
          && /^  A decision from the thread/.test(shown[i + 3] || "");
      })(), JSON.stringify(shown.slice(-4)));
    const noTarget = noTargetOnce();
    ok("the TC-target line is a FIXED class: a row reaching the renderer with no target renders the typed absence marker rather than dropping the line",
      (() => {
        const l = noTarget.section;
        const i = l.findIndex((x) => /^- N3 /.test(x));
        return noTarget.status === 0 && i >= 0 && l[i + 1] === `  ${NO_TARGET}` && l.length === shown.length;
      })());

  }
  {
    const pulled = pulledOnce();
    const noTarget = noTargetOnce();
    // THE GLOSS LINE SURVIVES THE REFORMAT, absence markers included (owner
    // ruling 2026-09-05). A row whose shard carried nothing must still say so:
    // four clean lines over an unreported fault is the anti-correlated check.
    // Two markers are reached by the pull state they name: a row carrying no
    // tag, and a Lesson row whose shard was read and carried no rendering for
    // it. The seam marker is re-rendered from a stored row: a pull whose seam
    // cannot be reached is refused before its neighborhood, because the
    // members' own Gloss read is not soft.
    const unaddressed = nbReport({ sug: suggestion({ tags: [] }) });
    const seamless = rerenderEdited(nbReport(), (rec) => {
      Object.assign(rec.neighborhood.suggestions[0], { gloss: NO_SEAM, gloss_cite: null });
    });
    const unrendered = nbReport({ sug: suggestion({ slug: "a/c", family: "lesson" }), judgments: { "a/c": wellFormed["a/b"] } });
    const glossLine = (r) => r.section[r.section.findIndex((x) => /^- N3 /.test(x)) + 2];
    ok("the Gloss line still renders quoted at its cite, and each of the three typed absence markers still renders in its place",
      /^  “Binding claims at the refusing layer\.”  product-lab@aaaaaaa/.test(glossLine(pulled) || "")
      && [[unaddressed, NO_SHARD_ADDRESSED], [seamless, NO_SEAM], [unrendered, NO_HEADLINE]]
        .every(([r, marker]) => r.status === 0 && glossLine(r) === `  ${marker}`));

    // THE GRAMMAR ADMITS WHAT THE EMITTER PRODUCES — the direction PR #658's
    // defect ran in, where a class never admitted its own emitter's line and
    // nothing said so.
    ok("full_report admits every line the reformatted row emits, on the quoted-Gloss arm and on all four absence arms",
      [pulled, noTarget, unaddressed, seamless, unrendered]
        .every((r) => r.status === 0 && r.section.length > 1 && admits("full_report", r.section.slice(1).join("\n"))));

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
        const minted = pulled.text.split("\n").filter((l) => /^- TC\d+ — /.test(l));
        const handed = rerenderEdited(nbReport(), (rec) => {
          rec.thesis_candidates = rec.thesis_candidates.map((c, i) => ({ ...c, id: `TC${i + 7}` }));
          // The row's target is re-pointed with them, so the stored record
          // stays one the section and the row agree on.
          rec.neighborhood.suggestions[0].target.candidate = "TC7";
        });
        return minted.join("|") === "- TC1 — one|- TC2 — two|- TC3 — three"
          && handed.status === 0 && handed.text.split("\n").includes("- TC7 — one");
      })());
  }

  {
    // ---- A RECORD PREDATING THE ID MINT IS RECOMPUTED, NEVER REPLAYED AND NEVER
    // REFUSED (PR #923 round 1, finding 2). The section's refusal is for a caller
    // that bypassed the reader, not a record written before the field existed. The
    // CONTROL: a record whose candidates all carry ids still replays.
    //
    // REPLAY IS READ OFF A MARKER (kogaki#1257): the stored record's first claim is
    // rewritten before the rerun, so a replay carries the rewrite and a recompute
    // the input's claim. THE IDENTITY CONJUNCT: the same record with its stored pin
    // changed recomputes however well-formed its candidates are.
    ok("a stored report record whose Thesis candidates carry no id is recomputed rather than replayed, and one that carries them still replays",
      (() => {
        const MARK = "REPLAYED FROM THE STORED RECORD";
        const marked = (rec) => { rec.thesis_candidates[0].claim = MARK; };
        const replayed = (r) => r.status === 0 && r.text.includes(`- TC1 — ${MARK}`);
        const recomputed = (r) => r.status === 0 && r.text.includes("- TC1 — one") && !r.text.includes(MARK);
        const pre = rerenderEdited(nbReport(), (rec) => {
          marked(rec);
          rec.thesis_candidates = rec.thesis_candidates.map(({ id, ...c }) => c);
        });
        const post = rerenderEdited(nbReport(), marked);
        // The empty list: no candidates, and so no judgment over an empty
        // enumeration, so the marker is the stored section's group name instead.
        const noneFirst = nbReport({ judgments: null, tc: null, sug: null });
        const none = rerenderEdited(noneFirst, (rec) => { rec.sections[0].name = MARK; });
        const predatesKey = rerenderEdited(nbReport(), (rec) => { marked(rec); delete rec.identity.neighborhood_judgment; });
        const differs = rerenderEdited(nbReport(), (rec) => { marked(rec); rec.identity.pin = "product-lab@0000000"; });
        return recomputed(pre)
          && replayed(post)
          && none.status === 0 && none.text.includes(MARK)
          && recomputed(predatesKey)
          && recomputed(differs);
      })());

  }
  {
    // ---- THE SHIPPED COMPARATOR IS DRIVEN, NOT INJECTED (kogaki#974). The two
    // records differ ONLY in the neighborhood judgment component, so the comparator
    // is the only thing that can discriminate them. DRIVEN THROUGH THE STORE
    // (kogaki#1257): pull A's record is copied under the name pull B's identity
    // digests to, and B's rerun reads it.
    //
    // THE kogaki#741 ABSENCE-HASHING RULE IS NOT ASSERTED HERE: an identity with no
    // neighborhood component is recomputed by the predating guard (the case above)
    // before the comparator reads it, and every pulled identity carries the
    // component. The binary case below reaches the same rule for its own.
    const MARK2 = "REPLAYED FROM ANOTHER IDENTITY";
    const identityPair = (first, second) => {
      const a = nbReport(first);
      const b = nbReport({ ...second, dir: a.reports });
      const files = readdirSync(a.reports).filter((x) => x.endsWith(".json"));
      const bFile = files.find((x) => join(a.reports, x) !== a.recordPath);
      if (!a.recordPath || !bFile) return null;
      const rec = readJson(a.recordPath);
      rec.thesis_candidates[0].claim = MARK2;
      writeFileSync(a.recordPath, JSON.stringify(rec));
      const replaysAtItsOwnIdentity = nbReport({ files: a.paths, dir: a.reports, extra: first.extra || [] }).text.includes(MARK2);
      writeFileSync(join(a.reports, bFile), JSON.stringify(rec));
      const atB = nbReport({ files: b.paths, dir: a.reports, extra: second.extra || [] });
      return { a, replaysAtItsOwnIdentity, recomputesAtTheOther: atB.status === 0 && !atB.text.includes(MARK2) };
    };
    ok("shouldReplayPrior with the SHIPPED comparator recomputes two report identities differing only in neighborhood_judgment, and an absent component hashes as NO_JUDGE without collapsing the key",
      (() => {
        const pair = identityPair({}, { judgments: { "a/b": { ...wellFormed["a/b"], claim: "A second judgment of the same row." } } });
        return !!pair && pair.replaysAtItsOwnIdentity && pair.recomputesAtTheOther;
      })());

    // ---- AND THE SAME DISCRIMINATION OVER THE BINARY COMPONENT (kogaki#1076, PR
    // #1078 round 1 finding 1). Nothing drove the comparator over this component of
    // `reportIdentityKey`, so striking it back out left the pass green.
    //
    // The claim is SPEC-terrain §"THE JUDGE BINARY IS THE RUN'S, RESOLVED ONCE BY
    // THE SESSION THAT STARTS IT": equal `model_id` and `effort_tier` with
    // different executables are DIFFERENT identities. The absence control is the
    // kogaki#741 rule for this component (a pin predating the field hashes as
    // `NO_JUDGE`), with its own control that absence still discriminates against a
    // pin naming a binary.
    ok("two report identities differing ONLY in the judge pin's binary_version are not the same identity, and an absent component hashes as NO_JUDGE without collapsing the key",
      (() => {
        const pair = identityPair({ extra: ["--judge-binary-version", "claude 1.2.3"] },
          { extra: ["--judge-binary-version", "claude 4.5.6"] });
        if (!pair) return false;
        const bare = nbReport();
        const MARK3 = "REPLAYED WITH THE BINARY FIELD ABSENT";
        const absent = rerenderEdited(bare, (rec) => { rec.thesis_candidates[0].claim = MARK3; delete rec.identity.judge_pin.binary_version; });
        const absenceHashesAsNoJudge = absent.status === 0 && absent.text.includes(MARK3);
        writeFileSync(pair.a.recordPath, readFileSync(bare.recordPath));
        const atNamed = nbReport({ files: pair.a.paths, dir: pair.a.reports, extra: ["--judge-binary-version", "claude 1.2.3"] });
        const absenceStillDiscriminates = atNamed.status === 0 && !atNamed.text.includes(MARK3);
        return pair.replaysAtItsOwnIdentity && pair.recomputesAtTheOther
          && absenceHashesAsNoJudge && absenceStillDiscriminates;
      })());

    // ---- THE RESOLUTION'S TWO EXPORTS HAVE A READER (kogaki#1076, PR #1078
    // round 1 finding 2). `checks/check-terrain-judge-invocation.sh` drives
    // them through a whole start act, which is the property that matters and is
    // also the most expensive way to ask any single question about them.
    //
    // THE CANDIDATE WALK IS READ OFF `resolveJudgeBinary`'s REFUSAL
    // (kogaki#1257), which names every candidate it searched and every one it
    // ran, in order: with each PATH entry carrying a binary that refuses
    // `--version`, the refusal is the walk itself. Driven in a child, because
    // the refusal exits.
    ok("judgeBinaryCandidates walks PATH in its declared order and de-duplicates it, and treats a command carrying a separator as its own single candidate",
      (() => {
        const root = join(SCRATCH, "judge-walk");
        const dirs = ["a", "b", "c", "bin"].map((x) => join(root, x));
        for (const d of dirs) {
          mkdirSync(d, { recursive: true });
          writeFileSync(join(d, "claude"), "#!/bin/sh\nexit 3\n", { mode: 0o755 });
        }
        const [a, b, c, bin] = dirs;
        const refusal = (command, pathEnv) => spawnSync(process.execPath, ["--input-type=module", "-e",
          `import { resolveJudgeBinary } from ${JSON.stringify(moduleUrl("workflow/judge"))}; resolveJudgeBinary(${JSON.stringify(command)}, ${JSON.stringify(pathEnv)});`],
        { encoding: "utf8", cwd: root }).stderr || "";
        const ran = (text) => text.split("\n").filter((l) => /^    \//.test(l)).map((l) => l.trim());
        const walked = refusal("claude", [a, b, a, "", c].join(delimiter));
        const absolute = refusal(join(bin, "claude"), [a, b].join(delimiter));
        const relative = refusal("./bin/claude", [a, b].join(delimiter));
        return /searched 3 candidate\(s\) over PATH/.test(walked)
          && JSON.stringify(ran(walked)) === JSON.stringify([join(a, "claude"), join(b, "claude"), join(c, "claude")])
          && /searched 1 candidate\(s\)/.test(absolute) && JSON.stringify(ran(absolute)) === JSON.stringify([join(bin, "claude")])
          && /searched 1 candidate\(s\)/.test(relative) && ran(relative).length === 1 && ran(relative)[0].endsWith(`${sep}bin${sep}claude`);
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
  }

  {
    // ---- AN EDITED CANDIDATES FILE AT THE SAME IDENTITY IS NOT IDEMPOTENT
    // (kogaki#927). `--thesis-candidates` sat in neither the identity nor the
    // recorded set, so a rerun replayed the prior section and reported success. The
    // rerun is driven over REAL FILE BYTES, because the digest reads the file.
    //
    // FOUR CONJUNCTS, one per way the fix could be wrong: the flag is in the set;
    // an edited file is NAMED in the refusal; an UNCHANGED file still replays (the
    // control); and a record predating the field recomputes rather than refusing.
    ok("an edited --thesis-candidates file at the same identity is named in the composed-input delta, an unchanged one still replays, and a record predating the field recomputes",
      (() => {
        const first = nbReport();
        if (!first.recordPath) return false;
        const stored = readJson(first.recordPath).composed_inputs;
        const edited = [{ claim: "ONE, EDITED", strands: ["L1", "L2"] }, ...THREE_TC.slice(1)];
        const editedFile = join(SCRATCH, "nb-tc-edited.json");
        writeFileSync(editedFile, JSON.stringify(edited));
        const rerunWith = (tc) => nbReport({ files: { ...first.paths, tc }, dir: first.reports });
        const refusedEdit = rerunWith(editedFile);
        const same = rerunWith(first.paths.tc);
        const withoutFlag = nbReport({ judgments: null, tc: null, sug: null });
        // A PRE-#927 RECORD carries every other flag and not this one.
        const rec = readJson(first.recordPath);
        delete rec.composed_inputs["thesis-candidates"];
        writeFileSync(first.recordPath, JSON.stringify(rec));
        const preRecord = rerunWith(editedFile);
        return /^[0-9a-f]{16}$/.test(stored["thesis-candidates"] || "")
          && !!withoutFlag.recordPath && readJson(withoutFlag.recordPath).composed_inputs["thesis-candidates"] === NO_JUDGE
          && refusedEdit.status !== 0
          && /COMPOSED_INPUT_MISMATCH — this identity was already reported from different composed input\(s\): thesis-candidates\./.test(refusedEdit.stderr)
          && same.status === 0
          && preRecord.status === 0 && preRecord.text.includes("- TC1 — ONE, EDITED");
      })());

    // ---- THE ORDERING, read from the shipped carrier (the workflow table keeps the state
    // set there, so this is a property of the table and not of this file).
    ok("the shipped table composes the Thesis candidates as a judgment point AHEAD of J3_neighborhood, which is ahead of the full_report write",
      (() => {
        const ids = SHIPPED_TABLE.states.map((x) => x.id);
        const tc = SHIPPED_TABLE.states.find((x) => x.id === "thesis_candidates");
        return !!tc && tc.kind === "judgment"
          && ids.indexOf("thesis_candidates") < ids.indexOf("J3_neighborhood")
          && ids.indexOf("J3_neighborhood") < ids.indexOf("full_report");
      })());

  // ---- THE SUBDIVISION RECORD'S ARGUMENT PATH (kogaki#1085 fixture 3(b)).
  //
  // The states that RESOLVE an entered id now join the subdivision record from
  // the run record, because a hook-driven run supplies no argv and every
  // SubGroup id the display had just printed resolved to nothing. The join is
  // a FALLBACK ORDER and not a replacement: an explicit `--subdivisions` still
  // wins, which is what keeps the fixture and second-repository paths --
  // callers with a record on disk and no run record at all -- resolving
  // exactly the ids they resolve today. These two cases are that path and its
  // control, driven through `report` over the fix survey (kogaki#1257), whose
  // six-member `fix × wide` group is G2.
  {
    const subReport = (name, ids, extra) => {
      const d = join(SCRATCH, `subids-${name}`);
      const r = terrain(["report", "--survey", fixSurvey(), "--tag", "fix", "--ids", ids,
        "--judge-model", "m", "--judge-effort", "high", ...extra,
        "--report-dir", join(d, "reports"), "--rendering-dir", join(d, "rendering")], { env: FIX_GW });
      const f = join(d, "rendering", "FullReport.md");
      const text = existsSync(f) ? readFileSync(f, "utf8") : "";
      return { ...r, sections: text.split("\n").filter((l) => /^## G/.test(l)),
        members: text.split("\n").filter((l) => /^### /.test(l)) };
    };
    ok("a caller supplying --subdivisions resolves a SubGroup id to that SubGroup's members alone, with no run record in play",
      (() => {
        const sub = subReport("subgroup", "G2-1", ["--subdivisions", FIX_SUBDIVISIONS]);
        const other = subReport("other-subgroup", "G2-2", ["--subdivisions", FIX_SUBDIVISIONS]);
        const parent = subReport("parent", "G2", ["--subdivisions", FIX_SUBDIVISIONS]);
        return sub.status === 0
          && sub.sections.join("|") === "## G2-1 — the first half"
          // NARROWER THAN THE PARENT, which is the half that discriminates:
          // a resolver that quietly handed back the whole Group would render
          // the same report and pass a membership-free assertion. The two
          // halves render disjoint members, and the parent renders both.
          && sub.members.join(",") === "### L1,### L2,### L3"
          && other.status === 0 && other.members.join(",") === "### L4,### L5,### L6"
          && parent.status === 0 && parent.sections.join("|") === "## G2 — fix × wide"
          && parent.members.join("|") === "### G2-1 — the first half|### G2-2 — the second half";
      })());
    ok("the same display with no subdivisions record offers no SubGroup ids at all — the control that the case above is about the record rather than about the id",
      (() => {
        const r = subReport("no-record", "G2-1", []);
        return r.status !== 0
          && /names G2-1, which resolve to no Group or SubGroup on this display/.test(r.stderr)
          && /The ids that do resolve are: G1, G2\./.test(r.stderr);
      })());
  }
  }
}

{
  // A JUDGE CALL THAT OUTLIVES `timeout_s` ENDS THE RUN AS A REPORT (kogaki#1300).
  // The stub sleeps `STUB_SLEEP_MS` and then answers as STUB_JUDGE does; the
  // sleep is read from the environment because a re-entry runs the binary the
  // record already resolved. The open-run pointer and the open-gates directory
  // point into the scratch root, so nothing here touches a real lane. The
  // fixture bound is 0.3 s, not 1 s: two of these advances wait it out in full,
  // and `timeout_s` takes a fraction (kogaki#1425).
  {
    const SLOW_JUDGE = join(SCRATCH, "slow-judge.mjs");
    writeFileSync(SLOW_JUDGE, [
      "#!/usr/bin/env node",
      'import { readFileSync } from "node:fs";',
      'import { spawnSync } from "node:child_process";',
      'if (process.argv.includes("--version")) { console.log("slow-judge 1.0"); process.exit(0); }',
      'const input = readFileSync(0, "utf8");',
      "Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(process.env.STUB_SLEEP_MS || 0));",
      `const r = spawnSync(process.execPath, [${JSON.stringify(STUB_JUDGE)}], { input, encoding: "utf8" });`,
      "process.stdout.write(r.stdout || \"\");",
      "process.exit(r.status ?? 1);",
    ].join("\n") + "\n");
    chmodSync(SLOW_JUDGE, 0o755);
    const d = join(SCRATCH, "judge-timeout");
    const rd = join(d, "rd");
    mkdirSync(rd, { recursive: true });
    const tp = join(d, "table.json");
    writeFileSync(tp, JSON.stringify({
      version: SHIPPED_TABLE.version,
      judge: { ...SHIPPED_TABLE.judge, timeout_s: 0.3 },
      owner_artifacts: SHIPPED_TABLE.owner_artifacts,
      states: SHIPPED_TABLE.states.filter((st) => ["compose_input", "J2_subdivision", "cotag_groups", "full_report", "done"].includes(st.id)),
    }));
    writeFileSync(join(rd, RUN_RECORD_FILE), JSON.stringify({
      workflow: { path: tp, version: SHIPPED_TABLE.version }, judge_binary: null, survey_record: fixSurvey(),
      completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [], awaiting: null,
      owner_input: { TAG_SELECTION: "fix", ID_SELECTION: "G1,G2" }, artifacts_written: [], judgments: {},
      gate_declarations_owed: [], transitions: [], done: false,
    }));
    const ptr = join(d, "open-run");
    const gates = join(d, "open-gates");
    const advance = (sleepMs) => {
      writeFileSync(ptr, `${rd}\n`);
      const r = terrain(["run", "--run-dir", rd, "--workflow", tp, "--report-dir", join(d, "reports")], {
        input: FIXTURE_PAYLOAD,
        env: { ...FIX_GW, KOGAKI_JUDGE_CLI: SLOW_JUDGE, KOGAKI_REPORTS_DIR: join(d, "rendering"),
          KOGAKI_OPEN_RUN: ptr, KOGAKI_OPEN_GATES: gates, STUB_SLEEP_MS: String(sleepMs) },
      });
      return { ...r, rec: readJson(join(rd, RUN_RECORD_FILE)) };
    };
    const noGate = (rec) => rec.gate_declarations_owed.length === 0
      && !readdirSync(rd).some((f) => f.startsWith("terrain-judgment-retry"))
      && (!existsSync(gates) || readdirSync(gates).length === 0);
    const timedOut = advance(3000);
    const f = timedOut.rec.failure || {};
    ok("a judge call past `timeout_s` ends the run non-zero with a report naming the state, the bound, the measured time and the run directory, `failure.cause: judge-timeout` on the record, no gate and the open-run pointer cleared",
      timedOut.status !== 0
      && /FAILED at J2_subdivision/.test(timedOut.stderr) && /bound\s+0\.3s/.test(timedOut.stderr)
      && /measured\s+\d/.test(timedOut.stderr) && timedOut.stderr.includes(rd)
      && f.cause === "judge-timeout" && f.state === "J2_subdivision" && f.bound_s === 0.3 && f.measured_s >= 0.3
      && noGate(timedOut.rec) && !existsSync(ptr)
      && JSON.stringify(timedOut.rec.completed) === JSON.stringify(["compose_input"]));
    const again = advance(3000);
    ok("a re-entry after a judge timeout resumes at the failed state with `completed` unchanged, and keeps the earlier failure as history",
      again.status !== 0 && (again.rec.failure || {}).state === "J2_subdivision"
      && JSON.stringify(again.rec.completed) === JSON.stringify(timedOut.rec.completed)
      && Array.isArray(again.rec.prior_failures) && again.rec.prior_failures.length === 1 && noGate(again.rec));
    // THE ANSWERING RE-ENTRY RUNS UNDER A GENEROUS BOUND (kogaki#1425). The
    // case asserts that a judge answering inside the bound completes the
    // state, not how fast the stub starts: the stub is two Node starts,
    // which a loaded machine takes past 0.3 s, and that was this pass's one
    // standing flake (red at base on 2026-10-18 under a parallel suite).
    // The table is rewritten in place, so the record's `workflow.path`
    // still names it; the two timeout cases above keep the 0.3 s bound.
    writeFileSync(tp, JSON.stringify({ ...readJson(tp), judge: { ...SHIPPED_TABLE.judge, timeout_s: 30 } }));
    const resumed = advance(0);
    ok("a re-entry whose judge answers inside the bound completes the failed state after the kept ones, and leaves no `failure` standing",
      resumed.status === 0 && !resumed.rec.failure
      && resumed.rec.completed[0] === "compose_input" && resumed.rec.completed.includes("J2_subdivision")
      && resumed.rec.prior_failures.length === 2);

    // THE TABLE CHECK ON ONE ADVANCE'S JUDGE CALLS (kogaki#1300).
    const loadRefusal = (name, judge) => {
      const tp2 = join(d, `table-${name}.json`);
      writeFileSync(tp2, JSON.stringify({ ...SHIPPED_TABLE, judge }));
      const rd2 = join(d, `rd-${name}`);
      mkdirSync(rd2, { recursive: true });
      return terrain(["run", "--run-dir", rd2, "--workflow", tp2, "--status"], { env: { KOGAKI_OPEN_RUN: ptr } });
    };
    const over = loadRefusal("over", { ...SHIPPED_TABLE.judge, advance_timeout_s: 100, per_group_ceiling: 4 });
    ok("a table whose synchronous judge calls in one advance sum past `advance_timeout_s` is refused, naming the states and the sum",
      over.status !== 0 && /thesis_candidates 90s, J3_neighborhood 90s\) sum to 180s/.test(over.stderr)
      && /advance_timeout_s` of 100s/.test(over.stderr));
    const wide = loadRefusal("wide", { ...SHIPPED_TABLE.judge, per_group_ceiling: 24 });
    ok("a per-group judgment is priced at ceil(per_group_ceiling / concurrency) waves of `timeout_s`, so a ceiling past the bound is refused",
      wide.status !== 0 && /J2_subdivision 6x90s\) sum to 540s/.test(wide.stderr));
    const { advance_timeout_s: _dropped, ...noBound } = SHIPPED_TABLE.judge;
    const absent = loadRefusal("absent", noBound);
    ok("a `judge` block declaring no `advance_timeout_s` is refused rather than left to a hook constant",
      absent.status !== 0 && /declares no positive `advance_timeout_s`/.test(absent.stderr)
      // The shipped block loads: `--status` over an empty run directory
      // refuses for want of a record, never for the advance bound.
      && !/advance_timeout_s|sum to \d+s/.test(loadRefusal("shipped", SHIPPED_TABLE.judge).stderr));
  }

  // A JUDGMENT THAT EXHAUSTS ITS RETRIES PRINTS THE GATE CALL'S BYTES (kogaki#1299).
  // The 2026-10-07 Brief run stopped at the judgment-retry gate naming only its
  // declaration, and no tool could fetch the call while the gate was open. The
  // judge here answers a record no validator admits on every attempt, so the
  // state spends its declared `retries` and the stop raises
  // `terrain-judgment-retry`; the case asserts the fenced block on stdout is the
  // written call file byte-for-byte. The gate pointer, the open-run pointer and
  // the gate-declaration sidecar all point into the scratch root.
  {
    const REFUSING_JUDGE = join(SCRATCH, "refusing-judge.mjs");
    writeFileSync(REFUSING_JUDGE, [
      "#!/usr/bin/env node",
      'if (process.argv.includes("--version")) { console.log("refusing-judge 1.0"); process.exit(0); }',
      'process.stdout.write(JSON.stringify({ result: "not a record" }));',
    ].join("\n") + "\n");
    chmodSync(REFUSING_JUDGE, 0o755);
    const d = join(SCRATCH, "judgment-retry-stop");
    const rd = join(d, "rd");
    mkdirSync(rd, { recursive: true });
    const tp = join(d, "table.json");
    writeFileSync(tp, JSON.stringify({
      version: SHIPPED_TABLE.version,
      judge: SHIPPED_TABLE.judge,
      owner_artifacts: SHIPPED_TABLE.owner_artifacts,
      states: SHIPPED_TABLE.states.filter((st) => ["compose_input", "J2_subdivision", "cotag_groups", "full_report", "done"].includes(st.id)),
    }));
    writeFileSync(join(rd, RUN_RECORD_FILE), JSON.stringify({
      workflow: { path: tp, version: SHIPPED_TABLE.version }, judge_binary: null, survey_record: fixSurvey(),
      completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [], awaiting: null,
      owner_input: { TAG_SELECTION: "fix", ID_SELECTION: "G1,G2" }, artifacts_written: [], judgments: {},
      gate_declarations_owed: [], transitions: [], done: false,
    }));
    const ptr = join(d, "open-run");
    writeFileSync(ptr, `${rd}\n`);
    const r = terrain(["run", "--run-dir", rd, "--workflow", tp, "--report-dir", join(d, "reports")], {
      input: FIXTURE_PAYLOAD,
      env: { ...FIX_GW, KOGAKI_JUDGE_CLI: REFUSING_JUDGE, KOGAKI_REPORTS_DIR: join(d, "rendering"),
        KOGAKI_OPEN_RUN: ptr, KOGAKI_OPEN_GATES: join(d, "open-gates"),
        GATE_DECLARATION_SIDECAR_DIR: join(d, "gate-declarations"),
        CLAUDE_CODE_SESSION_ID: "terrain-selftest-retry-stop-session" },
    });
    const callPath = join(rd, `terrain-judgment-retry${GATE_CALL_SUFFIX}`);
    const fenced = r.stdout.match(/```json\n([\s\S]*?)\n```/);
    ok("a judgment state that exhausts its declared retries prints the gate-call file's bytes in a json fence, and the printed bytes equal the file",
      r.status === 0 && /exhausted its declared retries/.test(r.stdout)
        && existsSync(callPath) && !!fenced
        && fenced[1] === readFileSync(callPath, "utf8").replace(/\n+$/, ""),
      fenced ? `status=${r.status}` : `(no fenced block on the stop's stdout) ${r.out.trim().split("\n").slice(-3).join(" | ").slice(0, 200)}`);
  }
}

finish("terrain-neighborhood-cases.mjs");
