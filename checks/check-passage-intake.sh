#!/usr/bin/env bash
# check-passage-intake — the Passage intake puts a source Passage into the store, keeps the
# book's order in ORDER.md and regenerates INDEX.md (kogaki#1535, owner decision 2026-10-23).
# Driven through `node src/proof-sheet/passage-intake.mjs` on a fixture store under a
# temporary directory, never the real `corpus/passages/`:
#   (a) a new file writes `<slug>.md` (three header lines, the text verbatim), appends the
#       slug to ORDER.md and prints the Extractor's paragraph and sentence counts;
#   (b) `--before <slug>` inserts before the named slug; earlier files are unchanged;
#   (c) a slug already in the store is refused by name, the store unchanged;
#   (d) a `--before` slug absent from the order is refused by name, the store unchanged;
#   (e) INDEX.md holds one row per slug in ORDER.md's order, with position and counts;
#   (f) `passageBody` strips the header, so the counts are over the Passage text alone.
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"
exec node --input-type=module - "$repo" <<'JS'
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
const repo = process.argv[2];
const { passageBody, passageCounts } = await import(join(repo, "src/proof-sheet/passage-intake.mjs"));
const fails = [];
const ok = (cond, label) => { if (!cond) fails.push(label); };
const root = mkdtempSync(join(tmpdir(), "passage-intake-"));
const store = join(root, "passages");
const intake = (...args) => spawnSync(process.execPath, [join(repo, "src/proof-sheet/passage-intake.mjs"), ...args, "--store", store],
  { cwd: repo, encoding: "utf8" });
const input = (name, text) => { const p = join(root, name); writeFileSync(p, text); return p; };
const order = () => readFileSync(join(store, "ORDER.md"), "utf8");
const snapshot = () => readdirSync(store).sort().map((n) => `${n}\n${readFileSync(join(store, n), "utf8")}`).join("\n");

// (a) a new file
const middle = input("Middle Passage.txt", "One sentence. Two sentences!\n\nA second paragraph?\n");
let r = intake(middle, "--section", "Section 4");
ok(r.status === 0, `(a) the intake of a new file exited ${r.status}: ${r.stderr}`);
ok(/^middle-passage: 2 paragraph\(s\), 3 sentence\(s\), position 1 in ORDER\.md$/m.test(r.stdout), `(a) the counts line reads: ${r.stdout.trim()}`);
const written = readFileSync(join(store, "middle-passage.md"), "utf8");
ok(written === "slug: middle-passage\nsection: Section 4\nsource: not given\n\nOne sentence. Two sentences!\n\nA second paragraph?\n",
  `(a) the store file is not the three header lines and the text verbatim: ${JSON.stringify(written)}`);
ok(order() === "middle-passage\n", `(a) ORDER.md does not hold the one slug: ${JSON.stringify(order())}`);

// (b) insert before a named slug
const early = input("early.md", "Earlier material arrives later.\n");
r = intake(early, "--slug", "opening", "--before", "middle-passage");
ok(r.status === 0, `(b) the --before intake exited ${r.status}: ${r.stderr}`);
ok(/position 1 in ORDER\.md/.test(r.stdout), `(b) the inserted slug is not at position 1: ${r.stdout.trim()}`);
ok(order() === "opening\nmiddle-passage\n", `(b) --before did not insert before the named slug: ${JSON.stringify(order())}`);
ok(readFileSync(join(store, "middle-passage.md"), "utf8") === written, "(b) the earlier store file changed");
const late = input("late.md", "The last one.\n");
ok(intake(late).status === 0, "(b) a plain intake after an insert failed");
ok(order() === "opening\nmiddle-passage\nlate\n", `(b) a plain intake did not append: ${JSON.stringify(order())}`);

// (c) a duplicate slug
let before = snapshot();
r = intake(late);
ok(r.status !== 0 && /the slug `late` is already in the store/.test(r.stderr), `(c) a duplicate slug was not refused by name: ${r.status} ${r.stderr}`);
ok(snapshot() === before, "(c) the duplicate slug's refusal changed the store");

// (d) an unknown --before slug
r = intake(input("other.md", "Text.\n"), "--before", "no-such-slug");
ok(r.status !== 0 && /the --before slug `no-such-slug` is not in ORDER\.md/.test(r.stderr), `(d) an unknown --before slug was not refused by name: ${r.status} ${r.stderr}`);
ok(snapshot() === before, "(d) the unknown --before refusal changed the store");

// (e) the index
const index = readFileSync(join(store, "INDEX.md"), "utf8");
const rows = index.split("\n").filter((l) => /^\| \d/.test(l));
ok(JSON.stringify(rows) === JSON.stringify(["| 1 | opening | 1 | 1 |", "| 2 | middle-passage | 2 | 3 |", "| 3 | late | 1 | 1 |"]),
  `(e) INDEX.md is not the order's rows with their counts: ${JSON.stringify(rows)}`);

// (f) the header is not counted
ok(JSON.stringify(passageCounts(passageBody(written))) === JSON.stringify({ paragraphs: 2, sentences: 3 }),
  "(f) passageBody did not strip the header");

rmSync(root, { recursive: true, force: true });
if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log("check-passage-intake: PASS (6 cases)");
JS
