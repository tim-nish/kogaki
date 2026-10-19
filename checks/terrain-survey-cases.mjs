#!/usr/bin/env node
// checks/terrain-survey-cases.mjs — the identity cite, the shard address, the address fault, the empty survey and the abbreviated form.
// One section of the Terrain runtime's fixture pass, cut from the one case file
// by kogaki#1459. Run by checks/check-terrain-runtime.sh, which sums every case
// file's count line against the registry's `case_floor`; the shared fixtures
// are checks/fixtures/terrain-cases/helpers.mjs.
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FormatRefusal, loadGrammar, refuseUnlessConformant } from "../src/format-guard.mjs";
import { glossFor } from "../src/workflow/strands.mjs";
import {
  REPO, readJson, REPORT_FORMAT, NO_HEADLINE, NO_SEAM, NO_SHARD_NAME,
  NO_SHARD_SERVED, gateway, terrain, drive, servedLine, SCRATCH, ok, once,
  tagStopFixture, finish,
} from "./fixtures/terrain-cases/helpers.mjs";
const { rd } = tagStopFixture();

// ---- THE IDENTITY CITE IS COMPOSED BY `survey` (kogaki#612), and these
// cases read it off the survey record the command writes over what the seam
// served. A refused composition is a refused survey: the act exits and
// writes no record, which is the refusal the composer's `null` was for.
const surveyOver = (name, pin, recs) => {
  const d = join(SCRATCH, `survey-${name}`);
  const served = { lines: recs.map(servedLine) };
  if (pin !== undefined) served.pin = pin;
  const r = terrain(["survey", "--run-dir", join(d, "rd")], { env: gateway(d, { element_survey: served }) });
  const rd = join(d, "rd");
  const files = existsSync(rd) ? readdirSync(rd).filter((f) => f.endsWith(".terrain-survey.json")) : [];
  return { ...r, record: files.length ? readJson(join(rd, files[0])) : null };
};
const alpha = [{ kind: "lesson", slug: "alpha", tags: ["agents"] }, { kind: "journey", slug: "alpha", tags: ["agents"] }];
// Read by the cite block and the empty-survey block, so made by the first
// that asks (kogaki#1425).
const pinnedOnce = once(() => surveyOver("pinned", "product-lab@aaaaaaa", alpha));
{
  const pinned = pinnedOnce();
  ok("a lesson cite composes in the identity form from the record's own fields",
    !!pinned.record && pinned.record.candidates[0].cite === "gloss/ELEMENTS.jsonl slug=alpha kind=lesson @aaaaaaa");
  ok("a journey cite carries its own kind in the join key",
    !!pinned.record && pinned.record.journeys[0].cite === "gloss/ELEMENTS.jsonl slug=alpha kind=journey @aaaaaaa");
  const bare = surveyOver("bare", "bbbbbbb", alpha);
  ok("the pin's sha segment is taken as served — a bare sha pin composes too",
    !!bare.record && bare.record.candidates[0].cite === "gloss/ELEMENTS.jsonl slug=alpha kind=lesson @bbbbbbb");
  ok("an absent or empty pin refuses composition rather than minting an unpinned cite",
    [surveyOver("no-pin", undefined, alpha), surveyOver("empty-pin", "", alpha), surveyOver("sha-less-pin", "product-lab@", alpha)]
      .every((r) => r.status !== 0 && /cannot compose an identity cite for lesson alpha/.test(r.stderr) && r.record === null));
  ok("the positional form is not producible by this composer",
    !!pinned.record && [...pinned.record.candidates, ...pinned.record.journeys].every((c) => !/ELEMENTS\.jsonl:\d/.test(c.cite)));
}
{
  // ---- THE SHARD ADDRESS IS SELECTED FROM THE SERVED ENUMERATION, NEVER
  // COMPOSED (kogaki#1106). The property is about ADDRESS SELECTION, so each
  // case reads the addresses the runtime actually REQUESTED: `resolveHeadlines`
  // (the export the Brief lane calls) runs against the fixture gateway, which
  // serves the enumeration below and logs every `gloss_index` call. What
  // stayed green through the whole drift was a seam that answered; what these
  // assert is which names were asked for, which is what drifted.
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
  // Each entry of `calls` is one `resolveHeadlines` call; the answer is, per
  // call, the `gloss_index` addresses it requested, its seam state and the
  // tags it found unaddressable. ONE PROCESS PER ENUMERATION, because the
  // runtime reads the enumeration once per process.
  const asked = (name, served, calls) => {
    const d = join(SCRATCH, `shards-${name}`);
    const env = gateway(d, { surface_names: { lines: served.map((t) => ({ text: t })) } });
    return drive(`
import { existsSync, readFileSync } from "node:fs";
const log = process.env.KOGAKI_FAKE_GATEWAY_LOG;
const seen = () => existsSync(log) ? readFileSync(log, "utf8").split("\\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const out = [];
for (const c of ${JSON.stringify(calls)}) {
  const before = seen().length;
  const r = rt.resolveHeadlines(c.members, { namespaces: c.namespaces });
  out.push({
    asked: seen().slice(before).filter((x) => x.tool === "gloss_index").map((x) => x.args.tag),
    seam: r.seam, unaddressable: [...r.unaddressable].sort(),
  });
}
console.log(JSON.stringify(out));`, env);
  };
  const row = (tags, family = "lesson") => [{ slug: "m1", family, tags }];
  const sel = asked("served", ["lessons/agents", ...SERVED], [
    { members: row(["method"]), namespaces: ["lessons"] },
    { members: row(["agents"]), namespaces: ["lessons"] },
    { members: row(["agents"], "journey"), namespaces: ["journeys"] },
    { members: row(["product-design"]), namespaces: ["lessons"] },
    { members: row(["articles"]), namespaces: ["decisions"] },
    { members: row(["knowledge-architecture"]), namespaces: ["lessons"] },
  ]);
  const askedAt = (i) => (Array.isArray(sel) && sel[i] ? sel[i].asked.join("|") : `(no answer: ${JSON.stringify(sel).slice(0, 160)})`);
  ok("a served name parses into its namespace and the axis=value pairs of its cell",
    // The tag axis is read out of a three-pair cell, beside `window` and
    // `date`, and only within its own namespace.
    askedAt(0) === "lessons/tag=method,window=2026-08,date=2026-08-16");
  // THE CONTROL THAT KEEPS THE FAULT VISIBLE. If the retired one-axis form
  // parsed as a cell carrying `tag=agents`, the selector would match the very
  // address the surface stopped serving, the fetch would form it again, and
  // the miss would be invisible exactly as it was for six days. The retired
  // name is served FIRST here, so a parse that admitted it would ask for it.
  ok("the retired one-axis form does not parse as a cell carrying that tag",
    Array.isArray(sel) && !sel[1].asked.includes("lessons/agents"));
  ok("a tag selects EVERY served cell carrying it, in the order the surface served them",
    askedAt(1) === "lessons/tag=agents,window=2026-07|lessons/tag=agents,window=2026-08|lessons/tag=agents,window=undated");
  ok("selection is namespace-scoped, and a cell with no window is selected like any other",
    askedAt(2) === "journeys/tag=agents,window=2026-08"
    && askedAt(3) === "lessons/tag=product-design"
    // The `decisions` namespace shards by `thread`, so no `tag` addresses it
    // — the discriminator that selection reads the CELL rather than the path.
    && Array.isArray(sel) && sel[4].asked.length === 0 && sel[4].unaddressable.includes("articles"));
  ok("a tag the enumeration names no shard for selects nothing rather than composing an address for it",
    Array.isArray(sel) && sel[5].asked.length === 0 && sel[5].seam === "address-fault"
    && sel[5].unaddressable.join(",") === "knowledge-architecture");

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
  // intersection answers the question the row arm asks. Driven over two
  // namespaces through `resolveHeadlines`, whose unaddressable set is the one
  // `glossFor`'s row arm is handed.
  ok("a tag unaddressable in ONE namespace but named in another is not unaddressable for the pull",
    (() => {
      const lessonsOnly = ["lessons/tag=agents,window=2026-08", "lessons/tag=testing,window=2026-08"];
      const three = row(["knowledge-architecture", "agents", "testing"]);
      const both = asked("intersection", lessonsOnly, [{ members: three, namespaces: ["lessons", "journeys"] }]);
      const one = asked("one-namespace", lessonsOnly, [{ members: three, namespaces: ["journeys"] }]);
      const none = asked("no-tag", lessonsOnly, [{ members: row([]), namespaces: ["lessons", "journeys"] }]);
      return Array.isArray(both) && both[0].unaddressable.join(",") === "knowledge-architecture"
        // THE CONTROL that this is an intersection rather than a first-wins
        // read: the single-namespace answer is that namespace's set itself,
        // and no namespace read at all establishes nothing about any tag.
        && Array.isArray(one) && one[0].unaddressable.length === 3
        && Array.isArray(none) && none[0].unaddressable.length === 0;
    })());
  ok("a row whose every tag is unaddressable renders the address marker even when the pull as a whole answered",
    glossFor({ slug: "bravo", family: "lesson", tags: ["knowledge-architecture"] },
      missEntry, "answered", ["lessons"], new Set(["knowledge-architecture"])) === NO_SHARD_NAME
    // THE CONTROL: a row with an addressed tag keeps the read-and-empty
    // marker, so the arm above is about the ROW and not a blanket downgrade.
    && glossFor(addrRow, missEntry, "answered", ["lessons"], new Set(["knowledge-architecture"])) === NO_HEADLINE);
}
{
  const pinned = pinnedOnce();
  // ---- AN EMPTY SURVEY IS A REFUSAL (kogaki#1026). The cases drive `survey`
  // itself over what the fixture gateway serves, and read the refusal off the
  // act: a non-zero exit, the refusal text on stderr, and no survey record
  // written. The composer answering correctly while the caller printed and
  // carried on is exactly the state the 2026-09-09 runs were in, so the act is
  // what is asserted rather than the composer.
  //
  // THESE ARE THE REMOVAL TEST TOO (acceptance 3). Nothing here reads the
  // skill file or the Spec, so the cases pass with both absent from the tree,
  // which is what makes the refusal the executor's own code path rather than
  // a rule carried in prose beside it.
  const journeyOnly = Array.from({ length: 12 }, (_, i) => ({ kind: "journey", slug: `j${i}`, tags: ["agents"] }));
  const callMiss = surveyOver("empty-call", "product-lab@0f31c3b", []);
  const corpusMiss = surveyOver("empty-corpus", "product-lab@0f31c3b", journeyOnly);
  ok("the miss shape refuses as a statement about the CALL, naming 0 served lines and the pin",
    callMiss.status !== 0 && callMiss.record === null
    && /0 served line\(s\)/.test(callMiss.stderr)
    && callMiss.stderr.includes("pin product-lab@0f31c3b")
    && /about the CALL/.test(callMiss.stderr));
  ok("a served response with records and no Lesson refuses as a statement about the CORPUS, naming the count and the pin",
    corpusMiss.status !== 0 && corpusMiss.record === null
    && corpusMiss.stderr.includes("12 served record(s)")
    && corpusMiss.stderr.includes("pin product-lab@0f31c3b")
    && /about the CORPUS/.test(corpusMiss.stderr));
  ok("an absent pin is NAMED rather than elided — the operator is told which pin was read, or that none was",
    (() => {
      const r = surveyOver("empty-no-pin", undefined, []);
      return r.status !== 0 && r.stderr.includes("pin absent");
    })());
  ok("a survey with candidates is not a refusal, so the ordinary path is untouched",
    pinned.status === 0 && !!pinned.record
    && (() => {
      const nine = [
        ...Array.from({ length: 4 }, (_, i) => ({ kind: "lesson", slug: `l${i}`, tags: ["agents"] })),
        // Each Journey shares a Lesson's slug: an orphan Journey is its own
        // refusal (JOURNEY_ORPHAN), which is not the one under test.
        ...Array.from({ length: 5 }, (_, i) => ({ kind: "journey", slug: `l${i % 4}`, tags: ["agents"] })),
      ];
      const r = surveyOver("nine-four", "product-lab@0f31c3b", nine);
      return r.status === 0 && !!r.record && r.record.candidates.length === 4;
    })());
  ok("the two refusals are DISTINGUISHABLE — the whole point is telling the call apart from the corpus",
    callMiss.stderr.trim() !== "" && callMiss.stderr !== corpusMiss.stderr);
}
{
  // ---- THE ABBREVIATED-FORM COMPILER (kogaki#653). A `…` in a `form` makes the
  // class match as a PREFIX. The compiler truncated per split-part, and the form is
  // split on digit runs, so a tail CONTAINING DIGITS was demanded as literal text.
  //
  // THE ASSERTION IS OVER THE BEHAVIOUR: for each surface declaring
  // `abnormal_display_id`, the line the runtime ACTUALLY EMITS must be admitted,
  // which had never been true because nothing exercised the abnormal path. So it
  // is exercised: `cotags` over a survey predating the display-ID rule, whose
  // display the emit-time guard refuses whole if any line fails its class.
  {
    const grammar = loadGrammar(REPORT_FORMAT);
    const lone = readJson(join(REPO, "checks", "fixtures", "survey", "lone-tag-member.json"));
    const predating = { ...lone, candidates: lone.candidates.map(({ display_id, ...c }) => c) };
    const predatingPath = join(SCRATCH, "survey-predating-display-ids.json");
    writeFileSync(predatingPath, JSON.stringify(predating));
    const shown = terrain(["cotags", "--survey", predatingPath, "--tag", "testing",
      "--rendering-dir", join(SCRATCH, "cotags-predating")]);
    // ONE DECLARING SURFACE. `cotag_groups` is the only surface an emit site
    // renders this line into (the two call sites in the co-tag group
    // renderer), so it is the only surface asserted here — a surface no emit
    // site reaches would be admitted against nothing.
    for (const surface of ["cotag_groups"]) {
      ok(`${surface} admits the line displayIdAbnormalLine actually emits`,
        shown.status === 0 && /^ABNORMAL: \d+ of \d+ member\(s\) on this surface carry no display_id\. /m.test(shown.stdout));
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
}

finish("terrain-survey-cases.mjs");
