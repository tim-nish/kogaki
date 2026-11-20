#!/usr/bin/env bash
# check-structure-mapping-playground -- the Structure-Mapping Playground's check of the structure a proposition file is read with, `validateStructure`, and of a Mapping Record table, each called directly with no Trial run and no model call:
#   (b) a structure whose `context` shares a word with the `proposition:` ("rule") is accepted (kogaki#1707).
#   (l) a `context` carrying a listed word as a word ("The reader must hold...", "you", ...) is refused naming the Role and the word, in group `context` (kogaki#1720).
#   (m) a relation's `holds` missing `{<id>}` for a Role its `between` names is refused naming the relation and the Role, and a `higher_order` `holds` carrying none of its Roles is refused (kogaki#1720).
#   (n) a `context` carrying a listed word only inside a longer word ("youths", "readers'", "typewriter") is accepted (kogaki#1720).
#   (o) a Mapping Record `table.yaml`, `{ move, case, base, correspondences }`, is accepted by `validateCorrespondenceTable`, and an empty `case` is refused (kogaki#1733).
# Cases (a) and (e) to (j), the runs of the long Trial and of the Mapper's structure reading, left with both.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

process.env.KOGAKI_JOB_HEARTBEAT_MS = "100";
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const repo = resolve(".");
const { parseYaml } = await import(pathToFileURL(join(repo, "src/yaml.mjs")).href);
const { validateStructure, parseProposition } = await import(pathToFileURL(join(repo, "src/structure-mapping-playground/structure.mjs")).href);
const { validateCorrespondenceTable } = await import(pathToFileURL(join(repo, "src/structure-mapping-playground/rbs.mjs")).href);
const root = mkdtempSync(join(tmpdir(), "structure-mapping-playground-"));
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

// ---- the fixture proposition file and RelationalStructure ----
const CITE = "coding::lesson/a-fixture-strand@0123456789abcdef";
const strand = join(root, "strand.md");
writeFileSync(strand, `cite: ${CITE}\nproposition: A rule set applies automatically only to the files the walker sees.\n`);
const structureText = (crewContext) => [
  `strand: "${CITE}"`,
  "roles:",
  `  - id: crew`,
  `    context: "${crewContext}"`,
  "    attributes: []",
  "  - id: list",
  `    context: "The written list names the rooms the crew was told about at the door."`,
  "    attributes: []",
  "  - id: room",
  `    context: "A room nobody wrote down stays dusty, even when it is next door."`,
  "    attributes: []",
  "relations:",
  "  - id: cleans",
  "    between: [crew, list]",
  `    holds: "{crew} cleans each room {list} names."`,
  "  - id: missed",
  "    between: [list, room]",
  `    holds: "{room} missing from {list} is never reached."`,
  "higher_order:",
  "  relates: [cleans, missed]",
  `  holds: "Because {crew} follows {list}, what {list} leaves out stays dusty."`,
  "",
].join("\n");
const structure = join(root, "structure.yaml");
writeFileSync(structure, structureText("A cleaning crew arrives at a house with a written list of rooms."));
const ruleStructure = join(root, "structure-rule.yaml");
writeFileSync(ruleStructure, structureText("A cleaning crew arrives with a rule about which rooms to clean."));

// A structure as a record, its first Role's `context` given.
const mapped = (crewContext) => ({ strand: CITE,
  roles: [{ id: "crew", context: crewContext, attributes: [] },
    { id: "list", context: "The written list names the rooms the crew was told about at the door.", attributes: [] },
    { id: "room", context: "A room nobody wrote down stays dusty, even when it is next door.", attributes: [] }],
  relations: [{ id: "cleans", between: ["crew", "list"], holds: "{crew} cleans each room {list} names." },
    { id: "missed", between: ["list", "room"], holds: "{room} missing from {list} is never reached." }],
  higher_order: { relates: ["cleans", "missed"], holds: "Because {crew} follows {list}, what {list} leaves out stays dusty." } });
// (b) a structure whose context carries "rule", a word of the proposition, is accepted
const b = validateStructure(parseYaml(readFileSync(ruleStructure, "utf8")), parseProposition(readFileSync(strand, "utf8")));
ok(!b.error, `(b) the structure carrying "rule" was refused: ${JSON.stringify(b)}`);

// (l) a context addressed to the reader is refused naming the Role and the word
const propRec = parseProposition(readFileSync(strand, "utf8"));
const base = mapped("A cleaning crew arrives at a house with a written list of rooms.");
const l = validateStructure({ ...base, roles: [{ ...base.roles[0], context: "The reader must hold that a crew works from a list." }, ...base.roles.slice(1)] }, propRec);
ok(l.group === "context" && /the Role "crew"/.test(l.error || "") && /"reader"/.test(l.error || ""),
  `(l) a context reading "The reader must hold" was not refused naming the Role and the word: ${JSON.stringify(l)}`);
// every word of the refused family, not only the one the Trial met
const withContext = (context) => validateStructure({ ...base, roles: [{ ...base.roles[0], context }, ...base.roles.slice(1)] }, propRec);
for (const [word, context] of [["you", "A crew you hire to clean a house."], ["must hold", "A crew that must hold to a list."],
  ["must come to", "A crew one must come to see as bound by a list."], ["Persona", "A crew the persona knows from home."],
  ["writer", "A crew the writer names first."]]) {
  const v = withContext(context);
  ok(v.group === "context" && v.error.includes(JSON.stringify(word)), `(l) a context carrying "${word}" was not refused naming the word: ${JSON.stringify(v)}`);
}

// (n) a listed word inside a longer word is no listed word
const lw = withContext("A crew of youths and readers' helpers with a typewriter.");
ok(!lw.error, `(n) a context carrying a listed word only inside a longer word was refused: ${JSON.stringify(lw)}`);

// (m) a holds missing a related Role's placeholder is refused naming the relation and the Role
const m1 = validateStructure({ ...base, relations: [{ ...base.relations[0], holds: "{crew} cleans each room the list names." }, base.relations[1]] }, propRec);
ok(m1.group === "shape" && /the relation "cleans"/.test(m1.error || "") && /\{list\}/.test(m1.error || ""),
  `(m) a holds missing {list} was not refused naming the relation and the Role: ${JSON.stringify(m1)}`);
const m2 = validateStructure({ ...base, higher_order: { ...base.higher_order, holds: "What is left out stays dusty." } }, propRec);
ok(m2.group === "shape" && /higher_order/.test(m2.error || "") && /\{crew\}/.test(m2.error || ""),
  `(m) a higher_order holds carrying no Role was not refused: ${JSON.stringify(m2)}`);

// (o) a Mapping Record table carries its move and case beside the correspondence table (kogaki#1733)
const recTable = { move: "a_move", case: "apart", base: { domain: "a crew" }, correspondences: [{ role: "crew", expression: "the crew" }] };
const o1 = validateCorrespondenceTable(recTable);
ok(!o1.error, `(o) a table.yaml carrying case was refused: ${JSON.stringify(o1)}`);
const o2 = validateCorrespondenceTable({ ...recTable, case: "" });
ok(o2.group === "shape" && /`case`/.test(o2.error || ""), `(o) a table.yaml carrying an empty case was not refused naming it: ${JSON.stringify(o2)}`);

rmSync(root, { recursive: true, force: true });
if (fails.length) { for (const f of fails) console.log(`FAIL: ${f}`); process.exit(1); }
console.log("check-structure-mapping-playground: ok");
JS
