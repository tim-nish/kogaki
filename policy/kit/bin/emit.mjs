#!/usr/bin/env node
// THE EMISSION WRITER — the consumer half of the durable-learning channel
// (kogaki#326; contract: specs/spec-client-kit/SPEC.md §4).
//
// THE DUTY. Any kit-installed sitting that produces a durable learning — an
// investigation finding, a reversal, a correction, a design decision — writes
// ONE staging-candidate emission in the same sitting, unasked. The hub has held
// the symmetric proactive-push duty since 2026-07-23; the consumer half had no
// owner until this file.
//
// EMISSION IS THE DUTY; PROMOTION IS UNTOUCHED (§4.2). This writes a file in the
// consumer's own tree and NOTHING ELSE. It makes no network call, touches no hub
// path, and writes no recall surface — the hub's own gate stays the sole
// promotion path. "One command closes the loop" is a correct requirement within
// a side and a contract violation across one.
//
// WHY THIS FILE EXISTS AT ALL, given the duty is behavioural. An obligation
// cannot be gated: an absence produces no event to hook. So the carrier is
// three-part — the managed CLAUDE.md block STATES the duty, this writer makes it
// CHEAP TO OBEY, and a lane read REPORTS the absence. This is the middle part.
// Making a duty cheap is not decoration: a duty whose discharge costs a blank
// page and a remembered format is discharged when convenient, which is the
// failure mode the channel exists to end.
//
// THE THIRD PART IS DEFERRED, AND DELIBERATELY NOT IMPROVISED HERE. Whether the
// lane read is one read or per-lane is open at §7 q2, and settling it inside an
// implementation is the unnamed-deferral defect running backwards. This file
// therefore builds two of the three parts and says so, rather than inventing a
// reader nobody ratified.
//
// PLAIN REGISTER IS PART OF THE FORMAT, not advice (§4.4). The consumer does not
// hold hub vocabulary, and hub policy drifting into internal terminology is a
// live defect this channel counteracts rather than imports. So the writer warns
// on hub-internal vocabulary at the point of writing — a REPORT, never a
// refusal, because a channel that rejects your words is a channel you stop using.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};
const flag = (n) => argv.includes(`--${n}`);

const GRAINS = ["lesson", "topic-line", "glossary-delta"];

// Vocabulary a consumer would not hold, and which the hub's own 2026-08-08
// legibility concern names as the drift to counteract. Reported, never refused.
const HUB_INTERNAL = [
  "distill gate", "sweep gate", "tier-1", "tier 1", "realm", "G2",
  "recall surface", "staging route", "L item", "N item", "qa-mine", "qa-distill",
];

const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

// THE BACKLOG DISCLOSURE (spec-client-kit §4.7, kogaki#498; carrier kogaki#505).
//
// §4.7 finds that NEITHER served arm of the report-only-row binary is available
// at this consumer: the executable home belongs to the hub's sweep, and an
// expiry needs a disposal authority §4.2 denies the consumer — an emission
// deleted here is material no gate ever saw. What is installed instead is a
// DISCLOSURE of that unsatisfiability, and this is it.
//
// SITED AT THE GROWTH EVENT. The observer is the emission act itself, so the
// report cannot be absent while the subject grows. Its blind spot is stated at
// §4.7 rather than papered over: a repository that stops emitting stops
// reporting, so the disclosure is silent in exactly one state — the directory
// stagnant and ageing. No second instrument is invented for it here.
//
// MEMBERSHIP IS BY CONSTRUCTION, not by a filter. Only `<YYYY-MM-DD>-<slug>.md`
// matches, so `README.md` is excluded because it cannot match rather than
// because a special case removes it.
//
// THE AGE IS READ FROM THE FILENAME DATE, never from mtime: mtime is a fact
// about this working copy that a fresh clone destroys, while the filename date
// is the emission's own declared date and travels with the file.
//
// DERIVED AT THE ACT, never stored. There is no tally to repair, migrate or
// garbage-collect — the D1 prohibition on a derived second ledger.
const EMISSION_FILE = /^(\d{4}-\d{2}-\d{2})-.+\.md$/;

function emissionBacklog(dir, todayISO) {
  if (!existsSync(dir)) return { count: 0, oldest: null, ageDays: null };
  const dates = readdirSync(dir)
    .map((f) => EMISSION_FILE.exec(f))
    .filter(Boolean)
    .map((m) => m[1])
    .sort();
  if (dates.length === 0) return { count: 0, oldest: null, ageDays: null };
  const oldest = dates[0];
  const ageDays = Math.round((Date.parse(`${todayISO}T00:00:00Z`) - Date.parse(`${oldest}T00:00:00Z`)) / 86400000);
  return { count: dates.length, oldest, ageDays };
}

// The five fixed fields, in the order §4.4 states them. Rendered as a stable
// shape so `/qa-mine`'s sweep reads one format rather than N.
function render({ date, repo, trigger, learning, grain }) {
  return [
    "<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->",
    `date: ${date}`,
    `repo: ${repo}`,
    `grain: ${grain}`,
    "",
    "## Trigger — what happened",
    "",
    trigger,
    "",
    "## The learning",
    "",
    learning,
    "",
    "---",
    "",
    "Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:",
    "nothing here is promoted, and nothing here writes any recall surface. The",
    "hub's own selection gate decides whether it becomes anything.",
    "",
  ].join("\n");
}

// Reported, never refused — see the header. Returns the terms found.
function hubInternalTerms(text) {
  const hay = String(text).toLowerCase();
  return HUB_INTERNAL.filter((t) => hay.includes(t));
}

function selfTest() {
  const fail = (m) => { console.error(`FAIL: ${m}`); process.exit(1); };
  const body = render({
    date: "2026-01-01", repo: "kogaki", grain: "lesson",
    trigger: "a thing happened", learning: "the thing means X",
  });
  for (const f of ["date: 2026-01-01", "repo: kogaki", "grain: lesson", "a thing happened", "the thing means X"]) {
    if (!body.includes(f)) fail(`the five-field format must render ${f}`);
  }
  if (!body.includes("Trigger")) fail("the trigger field must be labelled");
  // The promotion boundary, asserted on the emitted text rather than trusted to
  // the prose above it: this file's whole standing rests on it.
  if (!/sole promotion path/.test(body)) fail("an emission must state that it is a candidate, not a promotion");

  if (slug("A Long Title, With Punctuation!") !== "a-long-title-with-punctuation") fail("slug must normalise");
  if (slug("---x---") !== "x") fail("slug must trim separators");

  if (hubInternalTerms("we hit the distill gate").length !== 1) fail("hub-internal vocabulary must be detected");
  if (hubInternalTerms("plain words only").length !== 0) fail("plain register must not be flagged");

  // §4.7's backlog read (kogaki#505). Exercised over a real temp directory
  // rather than a stubbed listing, because the membership rule is the point:
  // it must exclude README.md BY CONSTRUCTION and read the age from the
  // FILENAME date, both of which a stub would assert about itself.
  {
    const td = mkdtempSync(join(tmpdir(), "emit-backlog-"));
    // the empty case — rendered explicitly, never omitted
    const z = emissionBacklog(td, "2026-08-18");
    if (z.count !== 0 || z.oldest !== null || z.ageDays !== null) fail("an empty emissions directory must read as 0 with a null oldest, not as an absence");
    const absent = emissionBacklog(join(td, "nope"), "2026-08-18");
    if (absent.count !== 0) fail("a directory that does not exist must read as 0 rather than throwing");

    writeFileSync(join(td, "2026-08-09-alpha.md"), "x");
    writeFileSync(join(td, "2026-08-18-bravo.md"), "x");
    writeFileSync(join(td, "README.md"), "x");
    writeFileSync(join(td, "notes.md"), "x");
    const b = emissionBacklog(td, "2026-08-18");
    if (b.count !== 2) fail(`membership is <YYYY-MM-DD>-<slug>.md only — README.md and a bare name must not count (got ${b.count})`);
    if (b.oldest !== "2026-08-09") fail(`the oldest must be the earliest FILENAME date (got ${b.oldest})`);
    if (b.ageDays !== 9) fail(`the age must be in days from the filename date (got ${b.ageDays})`);
    // the oldest is the earliest date, not the first listed
    writeFileSync(join(td, "2026-08-01-charlie.md"), "x");
    if (emissionBacklog(td, "2026-08-18").oldest !== "2026-08-01") fail("the oldest must be the earliest date whatever the listing order");
    // THE WRITE PATH IS ASSERTED AGAINST THE SHIPPED PREDICATE, NEVER A LOCAL
    // COPY OF IT (kogaki#509). An earlier form declared its own
    // `const DATE_OK = /^\d{4}-\d{2}-\d{2}$/` and asserted that literal against
    // literals, so it stayed green whatever the shipped guard did — a coverage
    // claim rather than coverage. These cases run `EMISSION_FILE`, the same
    // constant the guard and the backlog read both use, over the name the
    // writer actually composes.
    const composed = (d, t) => `${d}-${slug(t)}.md`;
    for (const [d, t, why] of [
      ["2026-8-18", "ok", "a single-digit month"],
      ["26-08-18", "ok", "a two-digit year"],
      ["2026/08/18", "ok", "slashes"],
      ["today", "ok", "a word"],
      ["", "ok", "an empty date"],
      ["2026-08-18", "ジャーニー素材", "a title with no ASCII alphanumerics — the kogaki#509 case"],
      ["2026-08-18", "—", "a punctuation-only title"],
      ["2026-08-18", "", "an empty title"],
    ]) {
      if (EMISSION_FILE.test(composed(d, t))) {
        fail(`${composed(d, t)} (${why}) must NOT be a backlog member: the writer would emit a file the read cannot see`);
      }
    }
    // …and the well-formed name on BOTH halves is accepted, so the guard is a
    // filter rather than a wall.
    if (!EMISSION_FILE.test(composed("2026-08-18", "a real title"))) fail("a well-formed date AND slug must compose an admissible name");
    if (!EMISSION_FILE.test(composed("2026-08-18", "2026年の学び"))) fail("a non-ASCII title that still yields some [a-z0-9] must be admissible — the guard bounds the NAME, never the language");
    rmSync(td, { recursive: true, force: true });
  }

  console.log("emit self-test: five-field format, candidate statement, slug and register cases pass; "
    + "the §4.7 backlog read counts <YYYY-MM-DD>-<slug>.md members only (README.md excluded by "
    + "construction), reads the oldest from the FILENAME date rather than mtime so it survives a "
    + "clone, renders the empty and absent-directory cases as 0 rather than as an absence, and "
    + "derives at the act with no stored tally; and the COMPOSED FILENAME \u2014 both variable halves "
    + "in one string \u2014 is asserted against EMISSION_FILE, the shipped constant and never a local "
    + "copy, so a malformed date and a title that slugs to nothing are refused by ONE condition "
    + "and a third field cannot open a third hole (kogaki#509). A non-ASCII title, which slugs to "
    + "nothing, is refused by that same predicate. WHICH LAYER HOLDS WHAT, stated because this "
    + "pass line is the artifact a reader consults for it (kogaki#513): what runs HERE is the "
    + "PREDICATE \u2014 that EMISSION_FILE composed with slug() rejects those names. That the write "
    + "path actually CONSULTS it, and consults it BEFORE writing, is asserted only by "
    + "policy/kit/test/install-test.sh \u2014 replacing the guard's condition with false leaves this "
    + "self-test GREEN and fails install-test's refusal case. Same two-layer split the RENDER SITE "
    + "below carries, and stated rather than repaired here: no assertion is added to this "
    + "self-test to make the claim true, because the guard's home is the layer that can observe a "
    + "write. "
    + "MUTATION EVIDENCE (assert-by-breaking-once, kogaki#505 + kogaki#509): EIGHT mutations, each run once and "
    + "restored — widening the membership pattern to any *.md let README.md count and failed the "
    + "membership case; taking the newest date as the oldest failed the oldest case; returning "
    + "undefined for an empty directory failed the empty case; removing the absent-directory guard "
    + "IS caught but as an UNCAUGHT ENOENT rather than by its assertion, so the case detects the "
    + "mutation while its message does not name the property — stated because a reader comparing "
    + "the four would otherwise read them as uniform; and removing the RENDER SITE leaves this "
    + "self-test GREEN and is caught only by policy/kit/test/install-test.sh, which is why the "
    + "read and the render are asserted at two layers rather than one. kogaki#509's three, each run "
    + "at the layer named above: removing the composed-filename guard let BOTH halves through and "
    + "failed install-test's refusal case \u2014 NOT this self-test, which stays green (kogaki#513); "
    + "replacing it with a per-field date-only guard \u2014 the LAZY REPAIR this fix refuses \u2014 let the "
    + "slug half through and failed the slug case, which is the evidence that a second per-field "
    + "guard would not have closed the class; and writing before the guard failed the "
    + "not-written-anyway assertion, so ORDER is asserted rather than assumed. PR #508's SIXTH "
    + "mutation is SUPERSEDED rather than dropped, stated because a superseded mutation and a "
    + "forgotten one read identically (kogaki#513): it removed the per-field --date guard, and "
    + "kogaki#509 replaced that guard outright, so it cannot be re-run at this head. Its successor "
    + "is kogaki#509's mutation 2, which re-instates a per-field date-only guard and breaks the "
    + "same artifact. Named, never counted \u2014 a tally listing a mutation no head can execute is "
    + "the defect this clause exists to avoid. Recorded with a note "
    + "on method: two of these first reported NOT CAUGHT \u2014 one because the fixture aborts at an "
    + "earlier assertion (so the grep, not the check, was wrong) and one because the mutation as "
    + "first written did not express the ordering property at all. Both were re-run correctly rather "
    + "than recorded as evidence the branch does not carry. "
    + "NOT COVERED, stated rather than implied: \u00a74.7's own blind spot — a repository that stops "
    + "emitting stops reporting, so this disclosure is silent exactly when the directory is "
    + "stagnant and ageing. No instrument here reaches that state and none is invented for it.");
  process.exit(0);
}

if (flag("self-test")) selfTest();

const trigger = opt("trigger");
const learning = opt("learning");
const grain = opt("grain");
const title = opt("title", trigger);

if (!trigger || !learning || !grain) {
  console.error(
    "usage: emit.mjs --trigger <what happened> --learning <the learning, plain register>\n" +
    `                --grain <${GRAINS.join("|")}> [--title <t>] [--repo <path>] [--date <YYYY-MM-DD>]`,
  );
  process.exit(2);
}
if (!GRAINS.includes(grain)) {
  console.error(`--grain must be one of: ${GRAINS.join(", ")} (a closed set, like every other declaration in this repo)`);
  process.exit(2);
}

const repoPath = resolve(opt("repo", process.cwd()));
const date = opt("date", new Date().toISOString().slice(0, 10));

const repoName = (() => {
  const cm = join(repoPath, "CLAUDE.md");
  if (existsSync(cm)) {
    const m = readFileSync(cm, "utf8").match(/^#\s+(\S+)/m);
    if (m) return m[1].replace(/[^\w.-]/g, "");
  }
  return repoPath.split("/").filter(Boolean).pop() ?? "unknown";
})();

const dir = join(repoPath, "policy/emissions");
mkdirSync(dir, { recursive: true });
// THE COMPOSED FILENAME IS ASSERTED AGAINST THE READ'S OWN PATTERN, ONCE
// (kogaki#509). The name has TWO variable halves — the date and the slug —
// and PR #508 guarded only the date, while `slug()` maps any title with no
// `[a-z0-9]` to the empty string. `2026-08-18-.md` fails `EMISSION_FILE`, so
// the emission was written and the §4.7 disclosure could not see it: an empty
// backlog reported at the very act that grew it.
//
// A SECOND per-field guard was the lazy repair and is refused. The served
// test for a rule is to imagine the laziest implementation that obeys every
// word of it while defeating the point — guarding the slug obeys "guard the
// slug" and leaves a third field to open a third hole. Asserting the
// COMPOSED name is the one condition that cannot acquire a next hole:
//
//   "imagine the laziest implementation that obeys every word of it while
//    defeating the point, and ask what would notice."
//
// consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/testing.md:149
//
// One guard, and the message still names WHICH half failed — diagnostics are
// not the same thing as a second check.
const filename = `${date}-${slug(title)}.md`;
if (!EMISSION_FILE.test(filename)) {
  const why = !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ? `the date ${JSON.stringify(date)} is not YYYY-MM-DD`
    : `the title ${JSON.stringify(title)} slugs to nothing — it carries no [a-z0-9] characters, which a non-ASCII title routinely does not`;
  console.error(
    `emit: refusing to write ${JSON.stringify(filename)} — ${why}. This is the membership rule the ` +
    "backlog read declares, not a format preference: a name it cannot match writes an emission the " +
    "§4.7 disclosure cannot see, so the count would report an empty backlog at the act that grew it.",
  );
  process.exit(2);
}

const out = join(dir, filename);
writeFileSync(out, render({ date, repo: repoName, trigger, learning, grain }));

// The in-session receipt: the path, printed. A durable artifact whose location
// the sitting never learns is one the sitting cannot cite.
console.log(`emission: wrote ${out}`);

// §4.7's disclosure, rendered at the growth event. The count INCLUDES the
// emission just written — it is a reading of the directory as it now stands,
// so it is 1 or more here by construction and the zero case belongs to
// `emissionBacklog` rather than to this site (the self-test holds it).
//
// The population is stated rather than assumed: §4.7 specifies UNDISPOSITIONED
// emissions, the format carries no disposition marker, and nothing has ever
// been dispositioned — so the spec's subset and the directory total coincide
// at this head. Saying which is what stops a convenience total silently
// standing in for the spec's set if that ever stops being true.
{
  const b = emissionBacklog(dir, date);
  console.log(
    `emission: backlog — ${b.count} candidate(s) awaiting the hub's gate, oldest ${b.oldest} ` +
    `(${b.ageDays} day(s) old). Every member counts: the format carries no disposition marker, ` +
    "so §4.7's undispositioned set and this directory are the same set at this head. " +
    "Neither served arm — an executable home nor an expiry — is available to this consumer; " +
    "this line is the disclosure that stands in their place (spec-client-kit §4.7).",
  );
}

const terms = hubInternalTerms(`${trigger} ${learning}`);
if (terms.length) {
  console.log(
    `emission: plain-register note — this text uses hub-internal vocabulary (${terms.join(", ")}). ` +
    "§4.4 makes plain register part of the format because the reader does not hold these terms. " +
    "Reported, not refused: rewriting is yours.",
  );
}
