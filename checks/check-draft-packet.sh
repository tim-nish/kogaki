#!/usr/bin/env bash
# check-draft-packet — the Leg Packet renders the Leg's waypoints and no Move,
# and the Draft stages open no Move file (kogaki#1311).
#
# THE OWNER'S DECISION THIS HOLDS (2026-10-09): "Information that belongs to
# Move has responsibility only up to CandidatePath creation." A Leg carries its
# own route as `waypoints`, written and judged at composition; everything after
# the Candidate reads the Leg. Before this, `technique` was read at four sites
# with four co-inputs, and the writer instantiated the Move alone — the
# instantiation the 2026-10-05 and 2026-10-08 /draft runs refused at Leg 2 and
# Leg 4.
#
# WHAT THIS COVERS:
#   (a) a Packet rendered by `draft.mjs packet` carries no `technique`,
#       `question` or `breaks` field of any Move, and carries the waypoints
#       block with every waypoint's point, once and numbered, and the claim
#       each serves — and neither "effect" nor "does to the reader" anywhere
#       in it (kogaki#1326);
#   (b) `draft.mjs resolve` on a Brief whose Leg carries no waypoint line
#       refuses, naming the field and the Leg; and `--moves-dir` is refused by
#       name rather than ignored;
#   (c) src/draft.mjs, src/review-draft.mjs and src/assemble.mjs open no file
#       under moves/ — driven, for the first two, under a filesystem trap that
#       records every path a `moves` directory segment names, with a control arm
#       proving the trap records such a read; and read, for all three, as source:
#       none of them names a Move reader exported by src/compose.mjs.
#
#   (i) THE 2026-10-09 BRIEF, CARRIED INTO THE RECORD (kogaki#1328): the Brief
#       `theses/check-only-good-what-given/brief.md` as written on 2026-10-09,
#       converted to the record at checks/fixtures/brief-2026-10-09/brief.yaml,
#       renders a Packet per Leg whose waypoints, claims, Journey text, Section
#       lines, crossing lines and Closure rows are the ones the Markdown Brief's
#       Packets carried, compared field for field against
#       `packet-fields.json` -- the fields of the four Packets the pre-record
#       code rendered from the Markdown file, captured once with the served
#       Journey prose in `journeys.json`. The one row that differs is the one
#       the Issue changes: the Thesis row of Closure, which is now derived from
#       the Strand coverage and reaches the Leg marked `reaches_target` alone.
#       THE REFERENCE IS RE-DERIVABLE, not self-attested: the Markdown Brief it
#       was rendered from is committed beside it as `source-brief.md`, and the
#       pre-record code is master at e5988c4. To regenerate `packet-fields.json`,
#       check out that commit into a scratch worktree, copy `source-brief.md` to
#       `theses/check-only-good-what-given/brief.md` there, run its
#       `src/draft.mjs resolve` and then `packet --leg <id>` for leg1..leg4 with
#       the gateway reachable, and apply `packetFields` below to each Packet.
#       `brief.yaml` is that file converted once -- its Legs read by e5988c4's
#       `parseBrief`, its adoption sections taken whole -- and written through
#       `legRecord`/`briefRecordText`; `journeys.json` is the two served
#       Journey records the Brief cites, as `element_survey` returned them.
#   (j) NO READER OF THE BRIEF READS PROSE (kogaki#1328): src/draft.mjs,
#       src/review-draft.mjs, src/assemble.mjs and src/compose.mjs, read as
#       source with comments stripped, name none of the three retired
#       parsers (`parseBrief`, `parseLegBlockBody`, `closureRowsForLeg`) nor
#       `concededRowFields`, and none of the Markdown Brief's line grammar --
#       its section headings, a regex over `claim (strand` or `waypoint
#       (serves` (the figure input still WRITES the first form), the
#       `*compose_path:*` header form or the Closure row's
#       `established_by_legs`. A control arm runs the same scan over the
#       pre-record grammar and finds it. The fenced `leg` block review-draft
#       still reads is the Reverse Outline a reader writes, not the Brief.
#   (k) NOTHING OF THE DEFINED TERMS REACHES THE PACKET (kogaki#1331): the
#       2026-10-09 record given a `defined_terms` list renders every Leg's
#       Packet byte for byte as the same record without one -- no
#       `defined_terms`, and no `ordinary` beyond the fixture's own prose.
#
# NOT COVERED, stated rather than implied: `adopt-candidate` is not driven end
# to end here — src/assemble.mjs's half of (c) is the source read alone. The
# end-to-end run, over a fixture gate answer and specialization record, is
# checks/check-adopt-candidate.sh's (kogaki#1317). Whether the prose a
# writer produces from the waypoints is any good is ReviewDraft's judgment and
# never linted here. The `## Write` block is not compared in (i): it is the
# template's and the Persona's, and (d) and (f) hold it.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const fails = [];
const repo = resolve(".");
const { legRecord, briefRecordText, readerStateMap, thesisClosureRow, parseBriefRecord, briefLegs } =
  await import(pathToFileURL(join(repo, "src", "compose.mjs")).href);
const { paragraphPlanRecord, paragraphPlanRecordText, paragraphPlanPathFor } =
  await import(pathToFileURL(join(repo, "src", "paragraph-plan.mjs")).href);

// THE PARAGRAPHPLAN FILE BESIDE EVERY FIXTURE BRIEF (kogaki#1375): /draft reads the
// Paragraph Waypoints from `paragraph-plan.yaml` next to the Brief and refuses a Brief
// without one, so every Brief a case resolves is written with its plan, made by the
// stage's own writer over the Brief's own text. `pwFor(leg, waypoint, i)` gives one Leg
// Waypoint's Paragraph Waypoints; the default is one paragraph serving what it serves.
const defaultPw = (leg, w, i) => [{ point: `Paragraph ${i + 1} of ${leg.leg_id} makes its point.`, serves: [...w.serves] }];
function writeBriefWithPlan(path, text, pwFor = defaultPw) {
  writeFileSync(path, text);
  const legs = briefLegs(parseBriefRecord(text, path).record)
    .map((l) => ({ leg_id: l.leg_id, waypoints: l.waypoints.map((w, i) => pwFor(l, w, i)) }));
  writeFileSync(paragraphPlanPathFor(path), paragraphPlanRecordText(paragraphPlanRecord({ briefPath: path, briefText: text, legs })));
}

// Reads an Audience file's `register: |` block the same way src/compose.mjs's
// `readerProse` does, so a fixture built here matches what the Packet
// actually renders (kogaki#1321, kogaki#1370).
function registerOf(text) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^register:[ \t]*(.*)$/);
    if (!m) continue;
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (l.trim() === "") { body.push(""); continue; }
      if (!/^[ \t]/.test(l)) break;
      body.push(l.trim());
    }
    while (body.length && body[body.length - 1] === "") body.pop();
    return body.join("\n").trim();
  }
  return "";
}
const root = mkdtempSync(join(tmpdir(), "draft-packet-"));
// THE WORKING DIRECTORY HOLDS NO `moves/`, so a default-path Move read has
// nothing to find and the trap below sees any attempt whatever it resolves to.
const cwd = join(root, "cwd");
mkdirSync(cwd, { recursive: true });

// ---- the filesystem trap (c) ----
// Patches every node:fs entry point a reader opens a path through and
// re-syncs the ESM named exports, so `import { readFileSync } from "node:fs"`
// in the module under test reaches the patched function. Any path with a
// `moves` directory segment is appended to $MOVES_TRAP_LOG.
const trap = join(root, "trap.mjs");
writeFileSync(trap, `
import fs from "node:fs";
import cp from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
const log = process.env.MOVES_TRAP_LOG;
const hit = (p) => typeof p === "string" || p instanceof URL ? /(^|[\\\\/])moves([\\\\/]|$)/.test(String(p)) : false;
for (const name of ["readFileSync", "openSync", "readdirSync", "existsSync", "statSync", "lstatSync", "accessSync", "createReadStream"]) {
  const orig = fs[name];
  if (typeof orig !== "function") continue;
  fs[name] = function (p, ...rest) {
    if (hit(p)) fs.appendFileSync(log, String(p) + "\\n");
    return orig.call(fs, p, ...rest);
  };
}
// THE GATEWAY STUB (kogaki#1323): this worktree cannot reach a live gateway,
// so the one spawn \`fetchJourneySurvey\` makes against
// policy/kit/bin/gateway-query.mjs is answered here with the served records
// in $FAKE_JOURNEYS -- a JSON list of \`{ slug, kind, body }\`, the prose
// already carried -- and every other spawnSync call (the stub writer
// included) passes through to the real implementation untouched.
const origSpawnSync = cp.spawnSync;
cp.spawnSync = function (cmd, args, opts) {
  const isGatewayQuery = Array.isArray(args)
    && args.some((a) => typeof a === "string" && a.endsWith("gateway-query.mjs"));
  if (isGatewayQuery && process.env.FAKE_JOURNEYS) {
    const recs = JSON.parse(process.env.FAKE_JOURNEYS);
    const payload = JSON.stringify({ lines: recs.map((rec) => ({ text: JSON.stringify(rec) })) });
    const fd = opts && opts.stdio ? opts.stdio[1] : undefined;
    if (typeof fd === "number") fs.writeSync(fd, payload);
    return { status: 0, stdout: "", stderr: "", signal: null, pid: 0 };
  }
  return origSpawnSync.call(cp, cmd, args, opts);
};
syncBuiltinESMExports();
`);
const trapLog = join(root, "trap.log");
const trapped = (args, env = {}) => {
  writeFileSync(trapLog, "");
  const r = spawnSync(process.execPath, ["--import", trap, ...args],
    { cwd, encoding: "utf8", env: { ...process.env, MOVES_TRAP_LOG: trapLog, ...env } });
  return { ...r, opened: readFileSync(trapLog, "utf8").split("\n").filter(Boolean) };
};

// CONTROL ARM: the trap records a read it is meant to catch. Without it an
// empty log below would be indistinguishable from a trap that records nothing.
{
  mkdirSync(join(cwd, "moves"), { recursive: true });
  writeFileSync(join(cwd, "moves", "probe.md"), "id: probe\n");
  const probe = join(root, "probe.mjs");
  writeFileSync(probe, 'import { readFileSync } from "node:fs"; readFileSync("moves/probe.md", "utf8");\n');
  const r = trapped([probe]);
  if (r.status !== 0 || !r.opened.some((p) => p.includes("moves/probe.md"))) {
    fails.push(`(c) control: the trap did not record a read under moves/ — ${JSON.stringify(r.opened)} ${(r.stderr || "").slice(0, 200)}`);
  }
  rmSync(join(cwd, "moves"), { recursive: true, force: true });
}

// ---- the fixture Brief ----
const C1 = "the installer copies the kit into the consumer's tree.";
const C2 = "a second run refreshes the copy and its stamp.";
// A LEG WAYPOINT CARRIES `point` AND `serves` ONLY (kogaki#1375): its Paragraph Waypoints
// come from the ParagraphPlan file beside the Brief, and the Packet renders them under
// it. `PW` is the fixture plan for the first Leg's three Leg Waypoints.
const W = [
  { point: "The installer writes into a tree the consumer thought was theirs alone.", serves: ["L1"] },
  { point: "A copy that a later run may rewrite is not a copy the consumer can edit.", serves: ["L1", "L2"] },
  { point: "The next run overwrites any edit made to the copy.", serves: ["L2"] },
];
const PW = [
  [{ point: "The kit lands under the consumer's own directory.", serves: ["L1"] },
    { point: "Nothing marks the files as the installer's.", serves: ["L1"] }],
  [{ point: "The second run rewrites the copied files and their stamp.", serves: ["L1", "L2"] }],
  [{ point: "An edit to the copy is gone after the next run.", serves: ["L2"] }],
];
const fixturePw = (leg, w, i) => (leg.leg_id === "s1" ? PW[i] : defaultPw(leg, w, i));
// A Brief record (kogaki#1328): its Legs written by `legRecord` and the file
// by `briefRecordText`, so the fixture is read through the Draft's own reader.
const lessonCite = (slug) => `coding::lesson/${slug}@${"0".repeat(64)}`;
const briefText = (legs, keys = {}) => briefRecordText({
  slug: "packet-brief", compose_path: "audiences/dev-to-zenn.md", external_authority: "on",
  strands: [{ id: "L1", slug: "first-strand", cite: lessonCite("first-strand") },
    { id: "L2", slug: "second-strand", cite: lessonCite("second-strand") }],
  thesis: "The fixture claim.",
  reader_start: readerStateMap("knowledge: The reader believes the fixture claim is obvious."),
  reader_target: legs[legs.length - 1].leg_id,
  reader_path: legs.map(legRecord),
  strand_coverage: [], journey_coverage: [], closure: [], tradeoffs: {}, bridged: {},
  ...keys,
});
const leg = (id, move, claims, waypoints, extra = {}) => ({
  leg_id: id, move, purpose: `purpose of ${id}`, reader_state_after: `knowledge: after ${id}.`,
  materials: ["L1", "L2"], depends_on: [], rationale: `rationale for ${id}.`, claims, waypoints, ...extra,
});
const goodLegs = [
  leg("s1", "name_a_paradox_after_removing_aggressive_intent",
    [{ strand: "L1", proposition: C1 }, { strand: "L2", proposition: C2 }], W),
  leg("s2", "a_move_no_library_holds",
    [{ strand: "L1", proposition: C1 }], [{ point: "The copy is settled once installed.", serves: ["L1"] }]),
];
const briefDir = join(root, "theses", "packet-brief");
mkdirSync(briefDir, { recursive: true });
const briefPath = join(briefDir, "brief.yaml");
writeBriefWithPlan(briefPath, briefText(goodLegs), fixturePw);
const ws = join(root, "ws");

// ---- the stub writer, so `section` runs without a model ----
const stub = join(root, "writer.sh");
writeFileSync(stub, ["#!/usr/bin/env bash",
  'if [ "${1:-}" = "--version" ]; then echo "stub-writer 1.0"; exit 0; fi',
  "cat > /dev/null",
  'printf "%s" "The copy lands in the consumer tree.\n\nA later run writes it again."'].join("\n") + "\n");
chmodSync(stub, 0o755);
const draft = (args, env = {}) => trapped([join(repo, "src", "draft.mjs"), ...args,
  "--brief", briefPath, "--workspace", ws], { KOGAKI_JUDGE_CLI: stub, ...env });

// (a) the Packet carries the waypoints and no Move field. The first Leg binds a
// real library Move id and the second an id no library holds: neither is read.
{
  const r0 = draft(["resolve"]);
  if (r0.status !== 0) fails.push(`(a) resolve failed: ${(r0.stderr || "").slice(0, 400)}`);
  const r = draft(["packet", "--leg", "s1"]);
  if (r.status !== 0) fails.push(`(a) packet --leg s1 failed: ${(r.stderr || "").slice(0, 400)}`);
  const packet = r.stdout || "";
  for (const field of ["technique", "question", "breaks"]) {
    if (new RegExp(`\\*\\*${field}\\.\\*\\*`).test(packet) || new RegExp(`\\{\\{move_${field}\\}\\}`).test(packet)) {
      fails.push(`(a) the Packet still carries the Move field \`${field}\``);
    }
  }
  if (/## The Move this Leg performs/.test(packet)) fails.push("(a) the Packet still carries the Move block");
  const head = "## The waypoints this Leg takes the reader through";
  const at = packet.indexOf(head);
  if (at === -1) fails.push("(a) the Packet carries no waypoints block");
  else {
    const block = packet.slice(at, packet.indexOf("\n## ", at + head.length));
    // A NUMBERED LIST, EACH POINT ONCE (kogaki#1326): line i is `i. <point>`.
    const lines = block.split("\n").filter((l) => /^\d+\. /.test(l));
    if (lines.length !== W.length) fails.push(`(a) the waypoints block carries ${lines.length} numbered line(s), not one per waypoint (${W.length})`);
    const claimOf = { L1: C1, L2: C2 };
    W.forEach((w, i) => {
      const l = lines[i] || "";
      if (!l.startsWith(`${i + 1}. ${w.point}`)) fails.push(`(a) waypoint ${i + 1}'s point is not on its line, numbered ${i + 1}: ${l}`);
      if (packet.split(w.point).length - 1 !== 1) fails.push(`(a) waypoint ${i + 1}'s point is not listed exactly once in the Packet`);
      for (const s of w.serves) {
        if (!l.includes(claimOf[s])) fails.push(`(a) waypoint ${i + 1}'s line does not carry the claim it serves (${s}): ${l}`);
      }
    });
    // THE EFFECT FORM IS GONE FROM THE PACKET (kogaki#1326): no instruction
    // tells the writer what a step does to the reader.
    for (const word of [/\beffect\b/i, /does to the reader/i]) {
      if (word.test(packet)) fails.push(`(a) the Packet still carries ${word}`);
    }
    if (/\(serves L\d/.test(block) || /\bL[12]\b/.test(block)) fails.push("(a) the waypoints block carries a Strand id the writer cannot open");
    // THE PARAGRAPH WAYPOINTS UNDER EACH LEG WAYPOINT (kogaki#1375): the lines between a
    // Leg Waypoint's line and the next are its Paragraph Waypoints from the ParagraphPlan
    // file, indented, numbered from 1, each with the claim it serves in the claim's own
    // words -- and nothing of a Move reaches the Packet: no Segment line and no Move id.
    const blockLines = block.split("\n");
    W.forEach((w, i) => {
      const from = blockLines.indexOf(lines[i]);
      const to = i + 1 < W.length ? blockLines.indexOf(lines[i + 1]) : blockLines.length;
      const under = blockLines.slice(from + 1, to).filter((l) => l.trim() !== "");
      if (under.length !== PW[i].length) fails.push(`(a) Leg Waypoint ${i + 1} carries ${under.length} Paragraph Waypoint line(s) under it, not ${PW[i].length}: ${JSON.stringify(under)}`);
      PW[i].forEach((p, j) => {
        const l = under[j] || "";
        if (!/^\s+\d+\. /.test(l) || !l.trim().startsWith(`${j + 1}. ${p.point}`)) fails.push(`(a) Leg Waypoint ${i + 1}'s Paragraph Waypoint ${j + 1} is not an indented numbered line under it: ${JSON.stringify(l)}`);
        for (const x of p.serves) if (!l.includes(claimOf[x])) fails.push(`(a) Paragraph Waypoint ${j + 1} under Leg Waypoint ${i + 1} does not carry the claim it serves (${x}): ${l}`);
      });
    });
    if (/segment/i.test(block) || / — [a-z ]+ — /.test(block)) fails.push("(a) the waypoints block carries a Segment line");
    for (const field of ["before", "after", "technique", "breaks"]) {
      if (new RegExp(`^\\s*\\*\\*${field}`, "m").test(block) || new RegExp(`\\b${field}:`, "i").test(block)) fails.push(`(a) the waypoints block carries the Move field \`${field}\``);
    }
  }
}

// (b) a Leg with no waypoint line is refused at the realization entry, naming
// the field and the Leg; `--moves-dir` is refused by name.
{
  const badDir = join(root, "theses", "no-waypoints");
  mkdirSync(badDir, { recursive: true });
  const badPath = join(badDir, "brief.yaml");
  writeFileSync(badPath, briefText([
    leg("s1", "open_the_claim", [{ strand: "L1", proposition: C1 }], [{ point: "The reader sees the copy.", serves: ["L1"] }]),
    leg("s2", "open_the_claim", [{ strand: "L1", proposition: C1 }], []),
  ], { slug: "no-waypoints" }));
  const r = spawnSync(process.execPath, [join(repo, "src", "draft.mjs"), "resolve", "--brief", badPath, "--workspace", join(root, "ws-bad")],
    { cwd, encoding: "utf8" });
  if (r.status === 0) fails.push("(b) resolve accepted a Brief whose Leg carries no waypoints");
  else if (!/leg s2/.test(r.stderr || "") || !/waypoints/.test(r.stderr || "")) fails.push(`(b) the refusal does not name the Leg and the field: ${(r.stderr || "").slice(0, 300)}`);
  const rm = draft(["resolve", "--moves-dir", join(root, "nowhere")]);
  if (rm.status === 0 || !/--moves-dir is no longer taken/.test(rm.stderr || "")) fails.push(`(b) --moves-dir was not refused by name: ${(rm.stderr || "").slice(0, 200)}`);
  // NO MOVE INFORMATION REACHES THE BRIEF, AND THE PLAN IS READ BESIDE IT (kogaki#1375).
  // A waypoint carrying `move` or `segments` is refused by name, naming the Leg and the
  // waypoint; a Brief with no ParagraphPlan file beside it, and one whose plan was made from
  // a different Brief, are refused naming both files. None of the four reads opens a path
  // under moves/.
  const twoLegs = (w) => briefText([
    leg("s1", "open_the_claim", [{ strand: "L1", proposition: C1 }], [{ point: "The copy lands.", serves: ["L1"] }]),
    leg("s2", "open_the_claim", [{ strand: "L1", proposition: C1 }], [{ point: "The copy is named.", serves: ["L1"] }, w]),
  ], { slug: "refused" });
  const plainW = { point: "The reader sees the copy.", serves: ["L1"] };
  const cases = [
    ["a waypoint carrying move", (p) => writeBriefWithPlan(p, twoLegs(plainW).replace("      - serves: [L1]\n        point: The reader sees the copy.",
      "      - serves: [L1]\n        point: The reader sees the copy.\n        move: p_fixture_point")),
      /leg s2.*waypoint 2 carries `move`, which is retired/],
    ["a waypoint carrying segments", (p) => writeBriefWithPlan(p, twoLegs(plainW).replace("      - serves: [L1]\n        point: The reader sees the copy.",
      "      - serves: [L1]\n        point: The reader sees the copy.\n        segments: 1. settles — elaboration — makes the point.")),
      /leg s2.*waypoint 2 carries `segments`, which is retired/],
    ["no ParagraphPlan file", (p) => writeFileSync(p, twoLegs(plainW)),
      /has no ParagraphPlan file beside it \(.*paragraph-plan\.yaml\)/],
    ["a ParagraphPlan made from a different Brief", (p) => { writeBriefWithPlan(p, twoLegs(plainW)); writeFileSync(p, twoLegs({ ...plainW, point: "The reader sees a different copy." })); },
      /ParagraphPlan file .*paragraph-plan\.yaml was made from a different Brief: it names .*brief\.yaml at sha256 [0-9a-f]{64}, and the Brief at .*brief\.yaml is sha256 [0-9a-f]{64}/],
  ];
  for (const [what, make, want] of cases) {
    const slug = `refused-${what.replace(/\W+/g, "-")}`;
    const dir = join(root, "theses", slug);
    mkdirSync(dir, { recursive: true });
    const p = join(dir, "brief.yaml");
    make(p);
    if ((what.includes("move") || what.includes("segments")) && !readFileSync(p, "utf8").includes(what.includes("move") ? "move: p_fixture_point" : "segments: ")) {
      fails.push(`(b) control: the fixture Brief for ${what} does not carry the field — the case would pass vacuously`);
    }
    const r = trapped([join(repo, "src", "draft.mjs"), "resolve", "--brief", p, "--workspace", join(root, `ws-${slug}`)]);
    if (r.status === 0) fails.push(`(b) resolve accepted a Brief with ${what}`);
    else if (!want.test(r.stderr || "")) fails.push(`(b) the refusal of a Brief with ${what} does not name what it refuses: ${(r.stderr || "").slice(0, 400)}`);
    if (r.opened.length) fails.push(`(b) resolve opened a path under moves/ while refusing: ${r.opened.join("; ")}`);
  }
}

// (c) driven: every /draft act and /review-draft's open, under the trap.
{
  const acts = [["resolve"], ["packet", "--leg", "s1"], ["section", "--leg", "s1"], ["section", "--leg", "s2"], ["emit"]];
  const opened = [];
  for (const a of acts) {
    const r = draft(a);
    if (r.status !== 0) fails.push(`(c) draft.mjs ${a.join(" ")} failed: ${(r.stderr || "").slice(0, 300)}`);
    opened.push(...r.opened.map((p) => `draft.mjs ${a[0]}: ${p}`));
  }
  const draftMd = join(briefDir, "draft.md");
  if (!existsSync(draftMd)) fails.push("(c) emit wrote no draft.md");
  else {
    const rv = trapped([join(repo, "src", "review-draft.mjs"), "open", "--draft", draftMd, "--workspace", join(root, "ws-review")]);
    if (rv.status !== 0) fails.push(`(c) review-draft.mjs open failed: ${(rv.stderr || "").slice(0, 300)}`);
    opened.push(...rv.opened.map((p) => `review-draft.mjs open: ${p}`));
  }
  if (opened.length) fails.push(`(c) a Draft stage opened a path under moves/: ${opened.join("; ")}`);
}

// (h) the Thesis is the article's title, verbatim (kogaki#1327): the
// assembled Draft's first line is `# ` followed by the Thesis exactly as the
// Brief record's own `thesis` key states it.
{
  const draftMd = join(briefDir, "draft.md");
  const text = readFileSync(draftMd, "utf8");
  const [, ...bodyParts] = text.split("\n\n");
  const bodyFirstLine = bodyParts.join("\n\n").split("\n")[0];
  if (bodyFirstLine !== "# The fixture claim.") {
    fails.push(`(h) the Draft's first body line is not "# " followed by the Thesis verbatim: ${JSON.stringify(bodyFirstLine)}`);
  }
}

// (c) read: none of the three files names a Move reader src/compose.mjs exports.
{
  const readers = ["resolveMoveIds", "loadMoveIds", "loadMoveContracts", "moveContract", "moveContractsForLegs",
    "figureOf", "resolveFigureForms", "moveScalarField"];
  for (const f of ["src/draft.mjs", "src/review-draft.mjs", "src/assemble.mjs"]) {
    const code = readFileSync(f, "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
    for (const name of readers) {
      if (new RegExp(`\\b${name}\\b`).test(code)) fails.push(`(c) ${f} names the Move reader \`${name}\``);
    }
    if (/join\([^)]*["'`]moves["'`]/.test(code) || /["'`]moves\//.test(code)) fails.push(`(c) ${f} builds a path under moves/`);
  }
}

// ---- the register split (kogaki#1321, kogaki#1370) ----
// The template carries no register rule of its own; every one lives in the
// Audience's `register` and reaches the Packet only through
// `{{register}}`. Each case below is an ABSENCE, so each owes a control
// arm proving the same search catches the thing when it IS there
// (kogaki#1321 thread comment, receipt
// coding::lesson/an-absence-catchers-silence-is-indistinguishable-from-its-success@ddef48a0b4e6f4dd07eac5d01167f192763a0bd58528a0142f585172fe342eb1).

const templateRaw = readFileSync(join(repo, "src", "packet-template.md"), "utf8");
const audienceRaw = readFileSync(join(repo, "audiences", "dev-to-zenn.md"), "utf8");

// (d) "no unexplained term of art" appears nowhere outside the
// `{{register}}` block. Driven over the real pipeline: an Audience whose
// register carries the phrase (the shipped dev-to-zenn.md does, in its
// Sentences rule) renders it inside the Packet; stripping that one injected
// span away leaves no other copy.
{
  const registerDir = join(root, "theses", "register-brief");
  mkdirSync(registerDir, { recursive: true });
  const registerAudience = join(root, "audience-with-rule.md");
  writeFileSync(registerAudience, audienceRaw);
  const registerBriefPath = join(registerDir, "brief.yaml");
  writeBriefWithPlan(registerBriefPath, briefText(goodLegs, { slug: "register-brief", compose_path: registerAudience }), fixturePw);
  const registerPacket = (args) => trapped([join(repo, "src", "draft.mjs"), ...args,
    "--brief", registerBriefPath, "--workspace", join(root, "ws-register")], { KOGAKI_JUDGE_CLI: stub });
  registerPacket(["resolve"]);
  const r = registerPacket(["packet", "--leg", "s1"]);
  if (r.status !== 0) fails.push(`(d) packet --leg s1 failed: ${(r.stderr || "").slice(0, 400)}`);
  const packet = r.stdout || "";
  const register = registerOf(audienceRaw);
  if (!register.includes("no unexplained term of art")) {
    fails.push("(d) control: the fixture Audience's register does not carry \"no unexplained term of art\" — the case below would pass vacuously");
  }
  if (!packet.includes(register)) {
    fails.push("(d) control: the rendered Packet does not carry the Audience's register verbatim — {{register}} did not fill");
  }
  const withoutRegister = packet.split(register).join("");
  if (withoutRegister.includes("no unexplained term of art")) {
    fails.push("(d) \"no unexplained term of art\" appears in the Packet outside the {{register}} block");
  }
  if (templateRaw.includes("no unexplained term of art")) {
    fails.push("(d) src/packet-template.md itself carries \"no unexplained term of art\" — the rule has not left the template");
  }
}

// (e) the "article so far" block's header is the one sentence and carries no
// imperative. Leg s2 depends on s1, so its Packet's block is non-empty — the
// control arm that keeps the no-imperative assertion from passing on a block
// with nothing in it to be imperative about.
{
  const r0 = draft(["resolve"]);
  if (r0.status !== 0) fails.push(`(e) resolve failed: ${(r0.stderr || "").slice(0, 400)}`);
  const rs1 = draft(["section", "--leg", "s1"]);
  if (rs1.status !== 0) fails.push(`(e) section --leg s1 failed: ${(rs1.stderr || "").slice(0, 400)}`);
  const r = draft(["packet", "--leg", "s2"]);
  if (r.status !== 0) fails.push(`(e) packet --leg s2 failed: ${(r.stderr || "").slice(0, 400)}`);
  const packet = r.stdout || "";
  const head = "## The article so far, up to this Leg:";
  const at = packet.indexOf(head);
  if (at === -1) fails.push("(e) the Packet carries no \"The article so far, up to this Leg:\" header");
  else {
    const block = packet.slice(at, packet.indexOf("\n## ", at + head.length));
    const body = block.slice(head.length).trim();
    if (body === "") fails.push("(e) control: the article-so-far block is empty — the no-imperative case below would pass vacuously");
    for (const imperative of ["Continue from", "match the voice", "do not repeat", "do not contradict", "nothing from an earlier Section"]) {
      if (block.includes(imperative)) fails.push(`(e) the article-so-far block still carries an imperative: "${imperative}"`);
    }
    const headLine = block.split("\n")[0];
    if (headLine !== head) fails.push(`(e) the header is not the one sentence: "${headLine}"`);
  }
}

// (f) an Audience whose `register` is empty renders a Packet with no
// register rule at all. `{{register}}` is the template's only seam for a
// register rule, so substituting it with the empty string must leave no trace
// of any rule that lives in the Audience's register (checked against the
// shipped dev-to-zenn.md's own rules). Control arm: the same substitution with
// the Audience's actual register DOES surface those rules, so the search is
// not vacuous.
{
  const marker = "{{register}}";
  if (!templateRaw.includes(marker)) fails.push("(f) src/packet-template.md carries no {{register}} slot");
  const register = registerOf(audienceRaw);
  const emptyRender = templateRaw.split(marker).join("");
  const fullRender = templateRaw.split(marker).join(register);
  const ruleMarkers = ["Sentences:", "Referents.", "Paragraphs.", "Voice."];
  for (const m of ruleMarkers) {
    if (!fullRender.includes(m)) fails.push(`(f) control: substituting the Audience's actual register does not surface its "${m}" rule — the empty-render case below would pass vacuously`);
    if (emptyRender.includes(m)) fails.push(`(f) the template carries the register rule "${m}" even with an empty {{register}}`);
  }
}

// (g) the Journey block renders material for a concrete example, in the
// fixture's own served prose (the control arm: resolution reached the
// renderer, so the check below is not vacuous), and none of the four words
// retired by kogaki#1323 (owner ruling 2026-10-10): a Journey is a Strand,
// never a narrative told merely because it is named one.
{
  const journeyProse = "The installer wrote the kit's manifest before the lockfile existed, and the second run found no lockfile to compare against.";
  const journeyBriefText = briefText([
    leg("s1", "name_a_paradox_after_removing_aggressive_intent", [{ strand: "L1", proposition: C1 }],
      [{ point: "The reader sees the copy land.", serves: ["L1"] }], { journeys: [{ strand: "L1", use: "illustrate" }] }),
  ], { slug: "journey-brief", strands: [
    { id: "L1", slug: "first-strand", cite: lessonCite("first-strand"), journey_cite: `coding::journey/first-strand@${"1".repeat(64)}` },
    { id: "L2", slug: "second-strand", cite: lessonCite("second-strand") }] });
  const journeyDir = join(root, "theses", "journey-brief");
  mkdirSync(journeyDir, { recursive: true });
  const journeyBriefPath = join(journeyDir, "brief.yaml");
  writeBriefWithPlan(journeyBriefPath, journeyBriefText);
  const journeyDraft = (args, env = {}) => trapped([join(repo, "src", "draft.mjs"), ...args,
    "--brief", journeyBriefPath, "--workspace", join(root, "journey-ws")],
    { KOGAKI_JUDGE_CLI: stub, FAKE_JOURNEYS: JSON.stringify([{ slug: "first-strand", kind: "journey", body: journeyProse }]), ...env });

  const r0 = journeyDraft(["resolve"]);
  if (r0.status !== 0) fails.push(`(g) resolve failed: ${(r0.stderr || "").slice(0, 400)}`);
  const r = journeyDraft(["packet", "--leg", "s1"]);
  if (r.status !== 0) fails.push(`(g) packet --leg s1 failed: ${(r.stderr || "").slice(0, 400)}`);
  const packet = r.stdout || "";
  const head = "## The Journey material this Leg edits";
  const at = packet.indexOf(head);
  if (at === -1) fails.push("(g) the Packet carries no Journey block");
  else {
    const block = packet.slice(at, packet.indexOf("\n## ", at + head.length));
    if (!block.includes(journeyProse)) fails.push("(g) control: the Journey block does not carry the fixture's served prose — the retired-word check below would pass vacuously");
    for (const w of ["retell", "telling", "narrative", "narrated"]) {
      if (new RegExp(w, "i").test(block)) fails.push(`(g) the Journey block still carries the retired word "${w}" (kogaki#1323)`);
    }
  }
}

// (i) the 2026-10-09 Brief, carried into the record: every Packet field the
// Markdown Brief's Packets carried, field for field, but the Thesis row.
{
  const fx = join(repo, "checks", "fixtures", "brief-2026-10-09");
  // The Packet's fields: per `## ` block, the lines the Brief supplies -- list
  // and numbered lines, the stated-absence lines, the Reader target line, and
  // a Journey's served prose -- never the template's own instruction text.
  const packetFields = (packet) => {
    const out = {};
    for (const part of packet.split(/\n(?=## )/).slice(1)) {
      const [head, ...rest] = part.split("\n");
      if (head === "## Write") continue;
      const lines = rest.filter((l) => l.trim() !== "");
      const journeyAt = lines.findIndex((l) => l.startsWith("- **"));
      out[head] = head.startsWith("## The Journey material") && journeyAt >= 0
        ? lines.slice(journeyAt)
        : lines.filter((l) => /^(- |\d+\. |\(none|\(nothing|This Leg )/.test(l));
    }
    return out;
  };
  const want = JSON.parse(readFileSync(join(fx, "packet-fields.json"), "utf8"));
  const briefYaml = readFileSync(join(fx, "brief.yaml"), "utf8");
  const record = parseBriefRecord(briefYaml, "brief.yaml").record;
  const dir = join(root, "theses", record.slug);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "brief.yaml");
  writeBriefWithPlan(path, briefRecordText(record));
  const run = (args) => trapped([join(repo, "src", "draft.mjs"), ...args, "--brief", path, "--workspace", join(root, "ws-1009")],
    { FAKE_JOURNEYS: readFileSync(join(fx, "journeys.json"), "utf8") });
  const r0 = run(["resolve"]);
  if (r0.status !== 0) fails.push(`(i) resolve over the 2026-10-09 record failed: ${(r0.stderr || "").slice(0, 400)}`);
  const thesisRow = `- ${thesisClosureRow(record)}`;
  const isOldThesisRow = (l) => l.startsWith("- The Thesis — ");
  for (const legId of Object.keys(want)) {
    const r = run(["packet", "--leg", legId]);
    if (r.status !== 0) { fails.push(`(i) packet --leg ${legId} failed: ${(r.stderr || "").slice(0, 400)}`); continue; }
    const got = packetFields(r.stdout || "");
    for (const head of new Set([...Object.keys(want[legId]), ...Object.keys(got)])) {
      let a = want[legId][head] || [];
      let b = got[head] || [];
      if (head === "## This Leg's Closure") {
        const reaches = legId === record.reader_target;
        if (reaches !== b.includes(thesisRow)) fails.push(`(i) ${legId}: the derived Thesis row is ${reaches ? "missing from" : "handed to"} its Packet`);
        if (reaches !== a.some(isOldThesisRow)) fails.push(`(i) ${legId}: the reference's Thesis row does not sit where the derived one does`);
        a = a.filter((l) => !isOldThesisRow(l));
        b = b.filter((l) => l !== thesisRow);
      }
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        const i = a.findIndex((l, k) => l !== b[k]);
        fails.push(`(i) ${legId} ${head}: line ${i + 1} differs from the 2026-10-09 Packet -- want ${JSON.stringify(a[i])}, got ${JSON.stringify(b[i])}`);
      }
    }
  }
}

// (j) no reader of the Brief reads prose.
{
  const retired = [/\bparseBrief\b/, /\bparseLegBlockBody\b/, /\bclosureRowsForLeg\b/, /\bconcededRowFields\b/,
    /## (Strands|Thesis|Reader start|Reader target|Reader Path|Sequence|Strand coverage|Closure|Tradeoffs)\b/,
    /claim \\\(strand/, /waypoint \\\(serves/, /\*compose_path:\*/, /established_by_legs/];
  const scan = (code) => retired.filter((re) => re.test(code)).map(String);
  const control = "const b = parseBrief(text); const m = /^claim \\(strand (L\\d+)\\)/.exec(line); x.indexOf('## Sequence');";
  if (scan(control).length < 3) fails.push(`(j) control: the scan does not find the pre-record grammar in a line that carries it: ${scan(control)}`);
  for (const f of ["src/draft.mjs", "src/review-draft.mjs", "src/assemble.mjs", "src/compose.mjs"]) {
    const code = readFileSync(join(repo, f), "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
    const hit = scan(code);
    if (hit.length) fails.push(`(j) ${f} still names the Markdown Brief's grammar or a retired parser: ${hit.join(", ")}`);
  }
}

// (k) nothing of the Brief's Defined Terms reaches the Packet (kogaki#1331, owner decision 2026-10-10:
// "I will not accept Defined Terms crossing into the Packet"). The 2026-10-09 record is written twice,
// once as it is and once given a list naming two of its Thesis words, one in each class, and every
// Leg's Packet from the second is the first's byte for byte: no field, line or classification of the
// list reaches the writer. The fixture's own prose uses "ordinary", so the word is counted against
// the Packet without the list rather than searched for alone.
{
  const fx = join(repo, "checks", "fixtures", "brief-2026-10-09");
  const record = parseBriefRecord(readFileSync(join(fx, "brief.yaml"), "utf8"), "brief.yaml").record;
  const words = record.thesis.match(/[A-Za-z]{4,}/g) || [];
  const withTerms = { ...record, defined_terms: [{ term: words[0], class: "defined" }, { term: words[1], class: "ordinary" }] };
  const write = (tag, rec) => {
    const dir = join(root, `theses-1331-${tag}`, rec.slug);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, "brief.yaml");
    writeBriefWithPlan(path, briefRecordText(rec));
    return path;
  };
  const plain = write("plain", record);
  const listed = write("listed", withTerms);
  const back = parseBriefRecord(readFileSync(listed, "utf8"), "brief.yaml");
  if (back.error || !Array.isArray(back.record.defined_terms) || back.record.defined_terms.length !== 2) {
    fails.push(`(k) the record does not carry defined_terms back: ${back.error || JSON.stringify(back.record.defined_terms)}`);
  }
  const run = (path, args) => trapped([join(repo, "src", "draft.mjs"), ...args, "--brief", path, "--workspace", join(root, `ws-1331-${path === plain ? "plain" : "listed"}`)],
    { FAKE_JOURNEYS: readFileSync(join(fx, "journeys.json"), "utf8") });
  for (const path of [plain, listed]) {
    const r0 = run(path, ["resolve"]);
    if (r0.status !== 0) fails.push(`(k) resolve over ${path} failed: ${(r0.stderr || "").slice(0, 400)}`);
  }
  const count = (text, re) => (text.match(re) || []).length;
  for (const leg of record.reader_path) {
    const a = run(plain, ["packet", "--leg", leg.leg_id]);
    const b = run(listed, ["packet", "--leg", leg.leg_id]);
    if (a.status !== 0 || b.status !== 0) { fails.push(`(k) packet --leg ${leg.leg_id} failed: ${((a.stderr || "") + (b.stderr || "")).slice(0, 400)}`); continue; }
    if (/defined_terms/.test(b.stdout)) fails.push(`(k) ${leg.leg_id}: the Packet names defined_terms`);
    if (count(b.stdout, /\bordinary\b/gi) !== count(a.stdout, /\bordinary\b/gi)) fails.push(`(k) ${leg.leg_id}: the Packet carries "ordinary" as a classification`);
    if (b.stdout !== a.stdout) fails.push(`(k) ${leg.leg_id}: the Packet rendered from a record carrying defined_terms differs from the one without`);
  }
}

rmSync(root, { recursive: true, force: true });
if (fails.length) {
  console.log("FAIL check-draft-packet");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-draft-packet — a rendered Packet carries the waypoints block, one numbered line per waypoint with its point, listed once, and the claim it serves in the claim's own words, neither \"effect\" nor \"does to the reader\" anywhere in the Packet (kogaki#1326), and no technique, question or breaks of any Move; resolve refuses a Leg with no waypoint naming the Leg and the field, and refuses --moves-dir by name; resolve, packet, section and emit and review-draft open open no path under moves/ under a trap whose control arm records such a read; src/draft.mjs, src/review-draft.mjs and src/assemble.mjs name no Move reader and build no moves/ path (kogaki#1311); and the Journey block carries the fixture's served prose and none of retell, telling, narrative or narrated (kogaki#1323); and the assembled Draft's first line is `# ` followed by the Thesis verbatim (kogaki#1327); and the 2026-10-09 Brief carried into the record renders every Leg's waypoints, claims, Journey text, Section, crossing and Closure lines exactly as its Markdown Packets did, the Thesis row alone derived and handed to the reaches_target Leg, and none of src/draft.mjs, src/review-draft.mjs, src/assemble.mjs or src/compose.mjs names a retired Brief parser or the Markdown Brief's line grammar (kogaki#1328); and a Brief record carrying defined_terms renders no Packet naming defined_terms or carrying the word ordinary (kogaki#1331); and each Leg Waypoint's Paragraph Waypoints from the ParagraphPlan file render under it as an indented numbered sub-list with the claims they serve and no Segment line, while resolve refuses a waypoint carrying move or segments by name, a Brief with no ParagraphPlan file and one whose plan was made from a different Brief naming both files, each opening no path under moves/ (kogaki#1375)");
JS
