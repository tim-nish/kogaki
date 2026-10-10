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
# NOT COVERED, stated rather than implied: `adopt-candidate` is not driven end
# to end here — src/assemble.mjs's half of (c) is the source read alone. The
# end-to-end run, over a fixture gate answer and specialization record, is
# checks/check-adopt-candidate.sh's (kogaki#1317). Whether the prose a
# writer produces from the waypoints is any good is ReviewDraft's judgment and
# never linted here.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const fails = [];
const repo = resolve(".");

// Reads a Persona file's `prose: |` block the same way src/compose.mjs's
// `readerProse` does, so a fixture built here matches what the Packet
// actually renders (kogaki#1321).
function readerProseOf(text) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^prose:[ \t]*(.*)$/);
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
// policy/kit/bin/gateway-query.mjs is answered here with one served record
// for the fixture Journey named by $FAKE_JOURNEY_CITE, its prose already
// carried in $FAKE_JOURNEY_PROSE -- every other spawnSync call (the stub
// writer included) passes through to the real implementation untouched.
const origSpawnSync = cp.spawnSync;
cp.spawnSync = function (cmd, args, opts) {
  const isGatewayQuery = Array.isArray(args)
    && args.some((a) => typeof a === "string" && a.endsWith("gateway-query.mjs"));
  if (isGatewayQuery && process.env.FAKE_JOURNEY_CITE) {
    const cite = process.env.FAKE_JOURNEY_CITE;
    const slug = (cite.split("slug=")[1] || "").split(" ")[0];
    const kind = (cite.split("kind=")[1] || "").split(" ")[0];
    const rec = { slug, kind, body: process.env.FAKE_JOURNEY_PROSE };
    const payload = JSON.stringify({ lines: [{ text: JSON.stringify(rec) }] });
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
const W = [
  { point: "The installer writes into a tree the consumer thought was theirs alone.", serves: ["L1"] },
  { point: "A copy that a later run may rewrite is not a copy the consumer can edit.", serves: ["L1", "L2"] },
  { point: "The next run overwrites any edit made to the copy.", serves: ["L2"] },
];
const briefText = (legs) => [
  "# Brief — packet-brief", "",
  "*Survey pin:* `product-lab@0000000000000000000000000000000000000000`", "",
  "## Strands", "",
  "### L1 — first-strand", "", "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
  "### L2 — second-strand", "", "- cite: `gloss/ELEMENTS.jsonl slug=second-strand kind=lesson @0000000000000000000000000000000000000000`", "",
  "## Thesis", "", "The fixture claim.", "",
  "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
  "## Sequence", "", ...legs,
].join("\n");
const leg = (id, move, lines) => [
  "```leg", `leg_id: ${id}`, `move: ${move}`, `purpose: purpose of ${id}`,
  `reader_state_before: knowledge: before ${id}.`, `reader_state_after: knowledge: after ${id}.`,
  "materials: L1, L2", `rationale: rationale for ${id}.`, ...lines, "```", "",
];
const goodLegs = [
  ...leg("s1", "name_a_paradox_after_removing_aggressive_intent", [
    `claim (strand L1): ${C1}`, `claim (strand L2): ${C2}`,
    ...W.map((w) => `waypoint (serves ${w.serves.join(", ")}): ${w.point}`)]),
  ...leg("s2", "a_move_no_library_holds", [
    `claim (strand L1): ${C1}`, "waypoint (serves L1): The copy is settled once installed."]),
];
const briefDir = join(root, "theses", "packet-brief");
mkdirSync(briefDir, { recursive: true });
const briefPath = join(briefDir, "brief.md");
writeFileSync(briefPath, briefText(goodLegs));
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
  }
}

// (b) a Leg with no waypoint line is refused at the realization entry, naming
// the field and the Leg; `--moves-dir` is refused by name.
{
  const badDir = join(root, "theses", "no-waypoints");
  mkdirSync(badDir, { recursive: true });
  const badPath = join(badDir, "brief.md");
  writeFileSync(badPath, briefText([
    ...leg("s1", "open_the_claim", [`claim (strand L1): ${C1}`, "waypoint (serves L1): The reader sees the copy."]),
    ...leg("s2", "open_the_claim", [`claim (strand L1): ${C1}`]),
  ]).replace("# Brief — packet-brief", "# Brief — no-waypoints"));
  const r = spawnSync(process.execPath, [join(repo, "src", "draft.mjs"), "resolve", "--brief", badPath, "--workspace", join(root, "ws-bad")],
    { cwd, encoding: "utf8" });
  if (r.status === 0) fails.push("(b) resolve accepted a Brief whose Leg carries no waypoints");
  else if (!/leg s2/.test(r.stderr || "") || !/waypoints/.test(r.stderr || "")) fails.push(`(b) the refusal does not name the Leg and the field: ${(r.stderr || "").slice(0, 300)}`);
  const rm = draft(["resolve", "--moves-dir", join(root, "nowhere")]);
  if (rm.status === 0 || !/--moves-dir is no longer taken/.test(rm.stderr || "")) fails.push(`(b) --moves-dir was not refused by name: ${(rm.stderr || "").slice(0, 200)}`);
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

// ---- the style-rule split (kogaki#1321) ----
// The template carries no style rule of its own; every one lives in the
// Persona's `prose` block and reaches the Packet only through
// `{{prose_rules}}`. Each case below is an ABSENCE, so each owes a control
// arm proving the same search catches the thing when it IS there
// (kogaki#1321 thread comment, receipt
// coding::lesson/an-absence-catchers-silence-is-indistinguishable-from-its-success@ddef48a0b4e6f4dd07eac5d01167f192763a0bd58528a0142f585172fe342eb1).

const templateRaw = readFileSync(join(repo, "src", "packet-template.md"), "utf8");
const personaRaw = readFileSync(join(repo, "readers", "dev-to-zenn.md"), "utf8");

// (d) "states its point" appears nowhere outside the `{{prose_rules}}` block.
// Driven over the real pipeline: a Persona whose prose carries the phrase
// (the shipped dev-to-zenn.md does, in its Paragraphs rule) renders it inside
// the Packet; stripping that one injected span away leaves no other copy.
{
  const styleDir = join(root, "theses", "style-brief");
  mkdirSync(styleDir, { recursive: true });
  const stylePersona = join(root, "persona-with-rule.md");
  writeFileSync(stylePersona, personaRaw);
  const styleBriefPath = join(styleDir, "brief.md");
  writeFileSync(styleBriefPath, briefText(goodLegs).replace(
    "# Brief — packet-brief", `# Brief — style-brief\n\ncompose_path: ${stylePersona}`));
  const stylePacket = (args) => trapped([join(repo, "src", "draft.mjs"), ...args,
    "--brief", styleBriefPath, "--workspace", join(root, "ws-style")], { KOGAKI_JUDGE_CLI: stub });
  stylePacket(["resolve"]);
  const r = stylePacket(["packet", "--leg", "s1"]);
  if (r.status !== 0) fails.push(`(d) packet --leg s1 failed: ${(r.stderr || "").slice(0, 400)}`);
  const packet = r.stdout || "";
  const persona = readerProseOf(personaRaw);
  if (!persona.includes("states its point")) {
    fails.push("(d) control: the fixture Persona's prose does not carry \"states its point\" — the case below would pass vacuously");
  }
  if (!packet.includes(persona)) {
    fails.push("(d) control: the rendered Packet does not carry the Persona's prose verbatim — {{prose_rules}} did not fill");
  }
  const withoutProseRules = packet.split(persona).join("");
  if (withoutProseRules.includes("states its point")) {
    fails.push("(d) \"states its point\" appears in the Packet outside the {{prose_rules}} block");
  }
  if (templateRaw.includes("states its point")) {
    fails.push("(d) src/packet-template.md itself carries \"states its point\" — the rule has not left the template");
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

// (f) a Persona whose `prose` block is empty renders a Packet with no style
// rule at all. `{{prose_rules}}` is the template's only seam for a style
// rule, so substituting it with the empty string must leave no trace of any
// rule that lives in the Persona's prose (checked against the shipped
// dev-to-zenn.md's own rules). Control arm: the same substitution with the
// Persona's actual prose DOES surface those rules, so the search is not
// vacuous.
{
  const marker = "{{prose_rules}}";
  if (!templateRaw.includes(marker)) fails.push("(f) src/packet-template.md carries no {{prose_rules}} slot");
  const prose = readerProseOf(personaRaw);
  const emptyRender = templateRaw.split(marker).join("");
  const fullRender = templateRaw.split(marker).join(prose);
  const ruleMarkers = ["Prose style:", "Referents.", "Paragraphs.", "Enumerations", "Voice."];
  for (const m of ruleMarkers) {
    if (!fullRender.includes(m)) fails.push(`(f) control: substituting the Persona's actual prose does not surface its "${m}" rule — the empty-render case below would pass vacuously`);
    if (emptyRender.includes(m)) fails.push(`(f) the template carries the style rule "${m}" even with an empty {{prose_rules}}`);
  }
}

// (g) the Journey block renders material for a concrete example, in the
// fixture's own served prose (the control arm: resolution reached the
// renderer, so the check below is not vacuous), and none of the four words
// retired by kogaki#1323 (owner ruling 2026-10-10): a Journey is a Strand,
// never a narrative told merely because it is named one.
{
  const journeyProse = "The installer wrote the kit's manifest before the lockfile existed, and the second run found no lockfile to compare against.";
  const journeyBriefText = [
    "# Brief — journey-brief", "",
    "*Survey pin:* `product-lab@0000000000000000000000000000000000000000`", "",
    "## Strands", "",
    "### L1 — first-strand", "",
    "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`",
    "- journey cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=journey @1111111111111111111111111111111111111111`", "",
    "### L2 — second-strand", "", "- cite: `gloss/ELEMENTS.jsonl slug=second-strand kind=lesson @0000000000000000000000000000000000000000`", "",
    "## Thesis", "", "The fixture claim.", "",
    "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
    "## Sequence", "",
    ...leg("s1", "name_a_paradox_after_removing_aggressive_intent", [
      `claim (strand L1): ${C1}`, "waypoint (serves L1): The reader sees the copy land.",
      "journey: L1 — illustrate"]),
  ].join("\n");
  const journeyDir = join(root, "theses", "journey-brief");
  mkdirSync(journeyDir, { recursive: true });
  const journeyBriefPath = join(journeyDir, "brief.md");
  writeFileSync(journeyBriefPath, journeyBriefText);
  const journeyDraft = (args, env = {}) => trapped([join(repo, "src", "draft.mjs"), ...args,
    "--brief", journeyBriefPath, "--workspace", join(root, "journey-ws")],
    { KOGAKI_JUDGE_CLI: stub, FAKE_JOURNEY_CITE: "gloss/ELEMENTS.jsonl slug=first-strand kind=journey @1111111111111111111111111111111111111111", FAKE_JOURNEY_PROSE: journeyProse, ...env });

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

rmSync(root, { recursive: true, force: true });
if (fails.length) {
  console.log("FAIL check-draft-packet");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-draft-packet — a rendered Packet carries the waypoints block, one numbered line per waypoint with its point, listed once, and the claim it serves in the claim's own words, neither \"effect\" nor \"does to the reader\" anywhere in the Packet (kogaki#1326), and no technique, question or breaks of any Move; resolve refuses a Leg with no waypoint naming the Leg and the field, and refuses --moves-dir by name; resolve, packet, section and emit and review-draft open open no path under moves/ under a trap whose control arm records such a read; src/draft.mjs, src/review-draft.mjs and src/assemble.mjs name no Move reader and build no moves/ path (kogaki#1311); and the Journey block carries the fixture's served prose and none of retell, telling, narrative or narrated (kogaki#1323)");
JS
