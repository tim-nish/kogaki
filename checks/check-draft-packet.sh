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
#       block with every waypoint's effect and the claim each serves;
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
# to end here — its inputs are an owner's recorded gate answer and a judged
# specialization record, which no fixture in this repository builds — so
# src/assemble.mjs's half of (c) is the source read alone. Whether the prose a
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
  { effect: "The reader sees the copy land where they did not expect a write.", serves: ["L1"] },
  { effect: "The reader starts to doubt that the copy stays as written.", serves: ["L1", "L2"] },
  { effect: "The reader expects the next run to overwrite their edit.", serves: ["L2"] },
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
    ...W.map((w) => `waypoint (serves ${w.serves.join(", ")}): ${w.effect}`)]),
  ...leg("s2", "a_move_no_library_holds", [
    `claim (strand L1): ${C1}`, "waypoint (serves L1): The reader holds the copy as settled."]),
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
    const lines = block.split("\n").filter((l) => l.startsWith("- "));
    if (lines.length !== W.length) fails.push(`(a) the waypoints block carries ${lines.length} line(s), not one per waypoint (${W.length})`);
    const claimOf = { L1: C1, L2: C2 };
    W.forEach((w, i) => {
      const l = lines[i] || "";
      if (!l.includes(w.effect)) fails.push(`(a) waypoint ${i + 1}'s effect is not on its line: ${l}`);
      for (const s of w.serves) {
        if (!l.includes(claimOf[s])) fails.push(`(a) waypoint ${i + 1}'s line does not carry the claim it serves (${s}): ${l}`);
      }
    });
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
    "figureOf", "resolveFigureForms", "questionChainPairs", "moveQuestionField", "moveScalarField"];
  for (const f of ["src/draft.mjs", "src/review-draft.mjs", "src/assemble.mjs"]) {
    const code = readFileSync(f, "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
    for (const name of readers) {
      if (new RegExp(`\\b${name}\\b`).test(code)) fails.push(`(c) ${f} names the Move reader \`${name}\``);
    }
    if (/join\([^)]*["'`]moves["'`]/.test(code) || /["'`]moves\//.test(code)) fails.push(`(c) ${f} builds a path under moves/`);
  }
}

rmSync(root, { recursive: true, force: true });
if (fails.length) {
  console.log("FAIL check-draft-packet");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-draft-packet — a rendered Packet carries the waypoints block, one line per waypoint with its effect and the claim it serves in the claim's own words, and no technique, question or breaks of any Move; resolve refuses a Leg with no waypoint naming the Leg and the field, and refuses --moves-dir by name; resolve, packet, section and emit and review-draft open open no path under moves/ under a trap whose control arm records such a read; and src/draft.mjs, src/review-draft.mjs and src/assemble.mjs name no Move reader and build no moves/ path (kogaki#1311)");
JS
