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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

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

  console.log("emit self-test: five-field format, candidate statement, slug and register cases pass");
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
const out = join(dir, `${date}-${slug(title)}.md`);
writeFileSync(out, render({ date, repo: repoName, trigger, learning, grain }));

// The in-session receipt: the path, printed. A durable artifact whose location
// the sitting never learns is one the sitting cannot cite.
console.log(`emission: wrote ${out}`);

const terms = hubInternalTerms(`${trigger} ${learning}`);
if (terms.length) {
  console.log(
    `emission: plain-register note — this text uses hub-internal vocabulary (${terms.join(", ")}). ` +
    "§4.4 makes plain register part of the format because the reader does not hold these terms. " +
    "Reported, not refused: rewriting is yours.",
  );
}
