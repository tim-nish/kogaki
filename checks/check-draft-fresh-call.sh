#!/usr/bin/env bash
# check-draft-fresh-call — Fresh Call at the draft runtime's realization entry
# points (kogaki#1237, owner decision 2026-09-30).
#
# WHAT THIS COVERS. `section --leg <id>` and `figure --leg <id>` take no
# `--file`: each renders its input and hands it, as the ENTIRE stdin, to the
# command `src/draft-workflow.json`'s `writer` block declares, and records the
# response. Driven end to end through the real entry points over a Brief built
# here and a stub writer (`KOGAKI_JUDGE_CLI`), because the defect this closes
# was in WHO WROTE the prose, which no assertion over a function can see.
#   (a) `--file` is refused by name on both acts, naming the route.
#   (b) the prose recorded for a Leg equals the writer's output byte for
#       byte, and the writer's stdin equals the Packet rendered for that Leg
#       byte for byte; the Packet's bytes do not appear on `section`'s stdout.
#   (c) a response the act's refusals reject is re-asked with the SAME input
#       up to the declared `retries.section`, then the act fails naming the
#       Leg and the spent bound; a response accepted on the re-ask records.
#   (d) `writerSettingsRefusal` refuses a table missing any of the six keys
#       or a per-act retries count, naming the key; the shipped table passes.
#   (e) `figure --leg <id>`: the writer's stdin is the served Packet plus the
#       figure block carrying the Leg's prose, the response parses as the
#       record (fenced JSON admitted), and a record that fails the mechanical
#       validation is re-asked.
#
# NOT COVERED, stated rather than implied: whether the prose the writer
# returns is any good — the Packet's MUSTs stay judgment, read by ReviewDraft's
# Round Trip and never linted here.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { writerSettingsRefusal, WRITER_KEYS, WRITER_ACTS, parseWriterRecord } from "./src/draft.mjs";

const fails = [];
const root = mkdtempSync(join(tmpdir(), "draft-fresh-call-"));

// ---- the fixture Brief and Move library, the self-test's own shape ----
const movesDir = join(root, "moves");
mkdirSync(movesDir, { recursive: true });
const moveRecord = (id, extra = []) => [
  `id: ${id}`,
  "technique: >-", `  what ${id} does to the reader.`,
  "before: >-", "  the state this move depends on.",
  "after: >-", "  the state this move produces.",
  "question: >-", "  holds: none",
  "order: >-", "  the segment sequence and why it runs that way.",
  "presupposes: >-", "  background the reader must already hold.",
  "breaks: >-", "  what a correct performance must not do.",
  ...extra,
].join("\n") + "\n";
writeFileSync(join(movesDir, "open_the_claim.md"), moveRecord("open_the_claim"));
writeFileSync(join(movesDir, "close_the_claim.md"), moveRecord("close_the_claim"));
writeFileSync(join(movesDir, "place_on_the_axis.md"), moveRecord("place_on_the_axis", [
  "figure:", "  kind: axis",
  "  endpoint_a: the state the reader starts in",
  "  endpoint_b: the state the reader ends in",
  "  criterion: what the two are being compared on",
]));
const briefText = (legs) => [
  "# Brief — fixture-brief", "",
  "*Survey pin:* `product-lab@0000000000000000000000000000000000000000`", "",
  "## Strands", "", "### L1 — first-strand", "",
  "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
  "## Thesis", "", "The fixture claim.", "",
  "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
  "## Reader target", "", "The reader can say why the fixture claim is not obvious.", "",
  "## Sequence", "", ...legs,
].join("\n");
const leg = (id, move, extra = []) => [
  "```leg", `leg_id: ${id}`, `move: ${move}`, `purpose: purpose of ${id}`,
  `reader_state_before: before ${id}.`, `reader_state_after: after ${id}.`,
  "materials: L1", `rationale: rationale for ${id}.`, ...extra, "```", "",
];
const briefDir = join(root, "theses", "fixture-brief");
mkdirSync(briefDir, { recursive: true });
writeFileSync(join(briefDir, "brief.md"), briefText([
  ...leg("s1", "open_the_claim", ["claim (strand L1): the material states the claim."]),
  ...leg("s2", "close_the_claim", ["claim (strand L1): the material states why the claim holds."]),
]));

// ---- the stub writer: answers --version, captures its stdin, prints what it is told ----
const stub = join(root, "writer.sh");
writeFileSync(stub, [
  "#!/usr/bin/env bash",
  'if [ "${1:-}" = "--version" ]; then echo "stub-writer 1.0"; exit 0; fi',
  'cat > "$STUB_CAPTURE"',
  'n=0; [ -f "$STUB_COUNT" ] && n=$(cat "$STUB_COUNT"); n=$((n+1)); echo "$n" > "$STUB_COUNT"',
  'if [ -n "${STUB_BAD_UNTIL:-}" ] && [ "$n" -le "$STUB_BAD_UNTIL" ]; then printf "%s" "$STUB_BAD"; exit 0; fi',
  'printf "%s" "$STUB_PROSE"',
].join("\n") + "\n");
chmodSync(stub, 0o755);
const capture = join(root, "capture.txt");
const count = join(root, "count.txt");
const ws = join(root, "ws");
const envOf = (over = {}) => ({ ...process.env, KOGAKI_JUDGE_CLI: stub, STUB_CAPTURE: capture, STUB_COUNT: count, ...over });
const drive = (env, cmd, ...extra) => spawnSync(process.execPath,
  ["src/draft.mjs", cmd, "--brief", join(briefDir, "brief.md"), "--workspace", ws, "--moves-dir", movesDir, ...extra],
  { encoding: "utf8", env });
const resetCount = () => { try { rmSync(count); } catch { /* none yet */ } };

const PROSE = "The fixture prose for the Leg, written by the stub writer.\n\nA second paragraph, so the bytes are not trivial.\n";

// (a) --file is refused by name on both acts.
{
  const r0 = drive(envOf({ STUB_PROSE: PROSE }), "resolve");
  if (r0.status !== 0) fails.push(`(a) resolve failed: ${(r0.stderr || "").slice(0, 300)}`);
  const rf = drive(envOf({ STUB_PROSE: PROSE }), "section", "--leg", "s1", "--file", join(root, "x.md"));
  if (rf.status === 0 || !/no longer takes --file/.test(rf.stderr || "")) fails.push(`(a) section --file was not refused naming the removal: ${(rf.stderr || "").slice(0, 200)}`);
  if (!/section --leg s1/.test(rf.stderr || "")) fails.push(`(a) the section refusal did not name the route: ${(rf.stderr || "").slice(0, 200)}`);
  const rg = drive(envOf({ STUB_PROSE: PROSE }), "figure", "--leg", "s1", "--file", join(root, "x.json"));
  if (rg.status === 0 || !/no longer takes --file/.test(rg.stderr || "")) fails.push(`(a) figure --file was not refused naming the removal: ${(rg.stderr || "").slice(0, 200)}`);
}

// (b) the writer's output is the recorded prose, its stdin is the Packet, and the Packet is not echoed.
{
  resetCount();
  const r = drive(envOf({ STUB_PROSE: PROSE }), "section", "--leg", "s1");
  if (r.status !== 0) fails.push(`(b) section --leg s1 failed: ${(r.stderr || "").slice(0, 400)}`);
  const recorded = existsSync(join(ws, "fixture-brief", "sections", "s1.md")) ? readFileSync(join(ws, "fixture-brief", "sections", "s1.md"), "utf8") : null;
  if (recorded !== PROSE) fails.push(`(b) the recorded prose is not the writer's output byte for byte: ${JSON.stringify(recorded).slice(0, 120)}`);
  const packet = readFileSync(join(ws, "fixture-brief", "packets", "s1.md"), "utf8");
  const got = existsSync(capture) ? readFileSync(capture, "utf8") : null;
  if (got !== packet) fails.push(`(b) the writer's stdin is not the Packet byte for byte (stdin ${got === null ? "absent" : got.length + " bytes"}, Packet ${packet.length} bytes)`);
  const line = packet.split("\n").find((l) => /^## /.test(l));
  if (line && (r.stdout || "").includes(line)) fails.push(`(b) the Packet's bytes reached section's stdout: ${JSON.stringify(line)}`);
  if (!/next: s2/.test(r.stdout || "") || !/never printed here/.test(r.stdout || "")) fails.push(`(b) section did not name the next Leg without echoing its Packet: ${(r.stdout || "").slice(0, 200)}`);
  if (readFileSync(count, "utf8").trim() !== "1") fails.push("(b) an accepted response was asked for more than once");
}

// (c) a refused response is re-asked with the same input, up to retries.section, then fails naming the Leg.
{
  const table = JSON.parse(readFileSync("src/draft-workflow.json", "utf8"));
  const retries = table.writer.retries.section;
  const BAD = "# A heading the prose must not carry\n\nprose under it.\n";
  resetCount();
  const ok2 = drive(envOf({ STUB_PROSE: PROSE, STUB_BAD: BAD, STUB_BAD_UNTIL: String(retries) }), "section", "--leg", "s2");
  if (ok2.status !== 0) fails.push(`(c) a response accepted on the last re-ask did not record: ${(ok2.stderr || "").slice(0, 300)}`);
  if (readFileSync(count, "utf8").trim() !== String(retries + 1)) fails.push(`(c) the writer was asked ${readFileSync(count, "utf8").trim()} time(s), want ${retries + 1}`);
  const packet2 = readFileSync(join(ws, "fixture-brief", "packets", "s2.md"), "utf8");
  if (readFileSync(capture, "utf8") !== packet2) fails.push("(c) the re-ask did not carry the same Packet as its input");
  // Exhausted: a fresh workspace Leg s1, every response bad.
  rmSync(join(ws, "fixture-brief", "sections", "s1.md"));
  resetCount();
  const spent = drive(envOf({ STUB_PROSE: PROSE, STUB_BAD: BAD, STUB_BAD_UNTIL: String(retries + 5) }), "section", "--leg", "s1");
  if (spent.status === 0) fails.push("(c) a writer refused on every ask recorded a Leg");
  else {
    if (!/leg s1/.test(spent.stderr || "")) fails.push(`(c) the failure did not name the Leg: ${(spent.stderr || "").slice(0, 200)}`);
    if (!new RegExp(`retries\\.section=${retries}`).test(spent.stderr || "")) fails.push(`(c) the failure did not name the spent bound: ${(spent.stderr || "").slice(0, 300)}`);
    if (!/carries its own heading/.test(spent.stderr || "")) fails.push(`(c) the failure did not carry the last refusal: ${(spent.stderr || "").slice(0, 300)}`);
  }
  if (existsSync(join(ws, "fixture-brief", "sections", "s1.md"))) fails.push("(c) a refused Leg was recorded anyway");
  if (readFileSync(count, "utf8").trim() !== String(retries + 1)) fails.push(`(c) the spent run asked ${readFileSync(count, "utf8").trim()} time(s), want ${retries + 1}`);
}

// (d) the table refuses a missing key by name; the shipped table passes.
{
  const shipped = JSON.parse(readFileSync("src/draft-workflow.json", "utf8"));
  const r = writerSettingsRefusal(shipped);
  if (r) fails.push(`(d) the shipped table was refused: ${r}`);
  for (const k of WRITER_KEYS) {
    const t = JSON.parse(JSON.stringify(shipped)); delete t.writer[k];
    const bad = writerSettingsRefusal(t);
    if (!bad || !bad.includes(`\`${k}\``)) fails.push(`(d) a table missing ${k} was not refused naming it: ${bad}`);
  }
  for (const act of WRITER_ACTS) {
    const t = JSON.parse(JSON.stringify(shipped)); delete t.writer.retries[act];
    const bad = writerSettingsRefusal(t);
    if (!bad || !bad.includes(`retries.${act}`)) fails.push(`(d) a table missing retries.${act} was not refused naming it: ${bad}`);
  }
  const noBlock = writerSettingsRefusal({ version: 1 });
  if (!noBlock || !/writer/.test(noBlock)) fails.push(`(d) a table with no writer block was not refused: ${noBlock}`);
  const zero = JSON.parse(JSON.stringify(shipped)); zero.writer.timeout_s = 0;
  if (!/timeout_s/.test(writerSettingsRefusal(zero) || "")) fails.push("(d) a zero timeout_s was not refused");
}

// (e) figure: the writer's stdin is the Packet plus the figure block, the response is the record.
{
  const G = [
    "claim (strand L1): the material states the reader starts unconvinced.",
    "claim (strand L1): the material states the reader ends convinced.",
    "claim (strand L1): the material states conviction is the criterion.",
  ];
  const figDir = join(root, "theses", "figure-brief");
  mkdirSync(figDir, { recursive: true });
  writeFileSync(join(figDir, "brief.md"), briefText([
    ...leg("a1", "place_on_the_axis", [...G,
      "figure: what the prose leaves the reader unable to hold in one view.",
      "figure_roles: endpoint_a=g1, endpoint_b=g2, criterion=g3"]),
  ]).replace("# Brief — fixture-brief", "# Brief — figure-brief"));
  const figWs = join(root, "ws-figure");
  const driveFig = (env, cmd, ...extra) => spawnSync(process.execPath,
    ["src/draft.mjs", cmd, "--brief", join(figDir, "brief.md"), "--workspace", figWs, "--moves-dir", movesDir, ...extra],
    { encoding: "utf8", env });
  const record = {
    kind: "axis",
    elements: {
      endpoint_a: { text: "the reader, unconvinced", claim: "g1" },
      endpoint_b: { text: "the reader, convinced", claim: "g2" },
      criterion: { text: "conviction", claim: "g3" },
    },
    relations: ["the two endpoints sit on conviction"],
    caption: "what the reader holds after looking.",
    position: "after",
  };
  const FIG_PROSE = "The realized prose for a1, which the figure is designed from.\n";
  const r0 = driveFig(envOf({ STUB_PROSE: FIG_PROSE }), "resolve");
  if (r0.status !== 0) fails.push(`(e) resolve failed: ${(r0.stderr || "").slice(0, 300)}`);
  resetCount();
  const rs = driveFig(envOf({ STUB_PROSE: FIG_PROSE }), "section", "--leg", "a1");
  if (rs.status !== 0) fails.push(`(e) section on the figure Leg failed: ${(rs.stderr || "").slice(0, 400)}`);
  if (!/figure --leg a1/.test(rs.stdout || "") || /\*\*kind\.\*\*/.test(rs.stdout || "")) fails.push(`(e) section echoed the figure input or did not name the figure act: ${(rs.stdout || "").slice(0, 200)}`);
  // A record that moves a role to another claim is refused mechanically and re-asked; the good record then records.
  const swapped = { ...record, elements: { ...record.elements, endpoint_a: { text: "the reader, unconvinced", claim: "g2" } } };
  resetCount();
  const rf = driveFig(envOf({ STUB_PROSE: "```json\n" + JSON.stringify(record, null, 2) + "\n```\n", STUB_BAD: JSON.stringify(swapped), STUB_BAD_UNTIL: "1" }), "figure", "--leg", "a1");
  if (rf.status !== 0) fails.push(`(e) figure failed: ${(rf.stderr || "").slice(0, 400)}`);
  if (readFileSync(count, "utf8").trim() !== "2") fails.push(`(e) a mechanically refused record was not re-asked exactly once: asked ${readFileSync(count, "utf8").trim()}`);
  const packet = readFileSync(join(figWs, "figure-brief", "packets", "a1.md"), "utf8");
  const stdin = readFileSync(capture, "utf8");
  if (!stdin.startsWith(packet.trimEnd())) fails.push("(e) the figure input does not begin with the served Packet");
  if (!stdin.includes("**kind.** axis") || !G.every((g) => stdin.includes(g)) || !stdin.includes(FIG_PROSE.trim())) fails.push("(e) the figure input does not carry the kind, the bound claims and the Leg's prose");
  const stored = join(figWs, "figure-brief", "figures", "a1.json");
  if (!existsSync(stored)) fails.push("(e) the figure record was not stored");
  else {
    const back = JSON.parse(readFileSync(stored, "utf8"));
    if (back.elements.endpoint_a.claim !== "g1" || back.position !== "after") fails.push(`(e) the stored record is not the accepted one: ${JSON.stringify(back).slice(0, 200)}`);
  }
  const p = parseWriterRecord("```json\n{\"a\": 1}\n```");
  if (!p.record || p.record.a !== 1) fails.push("(e) parseWriterRecord does not admit fenced JSON");
  if (!parseWriterRecord("not json").error) fails.push("(e) parseWriterRecord admitted non-JSON");
}

if (fails.length > 0) {
  console.log("FAIL check-draft-fresh-call");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-draft-fresh-call — section and figure take no --file (refused by name); the recorded prose is the writer's output byte for byte and the writer's stdin is the Packet byte for byte, with no Packet bytes on stdout; a refused response is re-asked with the same input up to retries.section and then fails naming the Leg and the spent bound; the workflow table refuses a missing key by name; the figure input is the served Packet plus the figure block, a mechanically refused record is re-asked, and the accepted record is stored.");
JS
