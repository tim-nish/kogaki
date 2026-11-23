// The cases of `checks/check-draft-packet.sh` on the table of the plan block, over the Writer's input rendered for a Leg
// on a HigherOrderRelation of a `structure` that holds more than the Leg's relation reaches, and on the Base a Leg
// takes (kogaki#1959).
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = process.cwd();
const imp = (p) => import(pathToFileURL(join(REPO, p)).href);
const { legRecord, briefRecordText } = await imp("src/compose.mjs");
const { readBriefText, renderPacket, sectionsOf, sectionOfLeg } = await imp("src/draft.mjs");
const { legSentences } = await imp("src/sme/arguments.mjs");
const { stringifyYaml } = await imp("src/yaml.mjs");
const fails = [];
let cases = 0;
const ok = (cond, msg) => {
  cases++;
  if (!cond) fails.push(msg);
};

// `caught` reaches `lost` and `audits`, and through them three Roles and two Relations. The Role `owner`, the Relation
// `signs` and the HigherOrderRelation `sealed` are in the structure and are not reached. `lost` carries a
// `holds_over_relations` and its row holds that sentence; `caught` carries none and its row holds its `holds`.
const STRUCTURE = {
  roles: [
    { id: "kit", name: "the kit", context: "The files the installer copies.", attributes: [] },
    { id: "tree", name: "the consumer's tree", context: "The directory the copy lands in.", attributes: [] },
    { id: "ledger", name: "the ledger", context: "The list of files the installer wrote.", attributes: [] },
    { id: "owner", name: "the owner", context: "The person who keeps the consumer's tree.", attributes: [] },
  ],
  relations: [
    { id: "writes", name: "writes", between: ["kit", "tree"], holds: "The installer writes {kit} into {tree}." },
    {
      id: "overwrites",
      name: "overwrites",
      between: ["kit", "tree"],
      holds: "The next run overwrites {kit} in {tree}.",
    },
    { id: "audits", name: "audits", between: ["ledger", "tree"], holds: "{ledger} names each file of {tree}." },
    { id: "signs", name: "signs", between: ["owner", "ledger"], holds: "{owner} signs {ledger}." },
    {
      id: "lost",
      name: "lost",
      relates: ["writes", "overwrites"],
      holds: "An edit to {kit} in {tree} is lost.",
      holds_over_relations: "{overwrites} undoes what {writes} left.",
    },
    {
      id: "caught",
      name: "caught",
      relates: ["lost", "audits"],
      holds: "{ledger} shows which edit to {kit} was lost.",
    },
    { id: "sealed", name: "sealed", relates: ["caught", "signs"], holds: "{owner} answers for what {ledger} shows." },
  ],
};
const ROWS = [
  "| {kit} | the kit | Role |  | The files the installer copies. |",
  "| {tree} | the consumer's tree | Role |  | The directory the copy lands in. |",
  "| {ledger} | the ledger | Role |  | The list of files the installer wrote. |",
  "| {writes} | writes | Relation | {kit}, {tree} | The installer writes {kit} into {tree}. |",
  "| {overwrites} | overwrites | Relation | {kit}, {tree} | The next run overwrites {kit} in {tree}. |",
  "| {audits} | audits | Relation | {ledger}, {tree} | {ledger} names each file of {tree}. |",
  "| {lost} | lost | Relation | {writes}, {overwrites} | {overwrites} undoes what {writes} left. |",
  "| {caught} | caught | Relation | {lost}, {audits} | {ledger} shows which edit to {kit} was lost. |",
];
const SEGMENTS = [
  { bind: 1, edges: [] },
  { bind: null, edges: [{ sense: "Conjunction", to: [1] }] },
  { bind: 2, edges: [{ sense: "Contrast", to: [1, 2] }] },
  { bind: 3, edges: [{ sense: null, to: [3], hypophora: "answer" }] },
];
const OPENERS = ["{lost}.", "Neither.", "{audits}.", "{caught}."];

const leg = {
  leg_id: "s1",
  text: "The ledger shows which edit to the kit was lost.",
  claims: [{ strand: "L1", proposition: "the installer keeps a ledger of what it wrote." }],
};
const read = readBriefText(
  briefRecordText({
    slug: "packet-brief",
    compose_path: "audiences/dev-to-zenn.md",
    strands: [{ id: "L1", slug: "first-strand", cite: `coding::lesson/first-strand@${"0".repeat(64)}` }],
    thesis: "The fixture claim.",
    reader_path: [legRecord(leg)],
    strand_coverage: [],
    journey_coverage: [],
    tradeoffs: {},
    bridged: {},
  }),
  "theses/packet-brief/brief.yaml",
);
const brief = { ...read, record: { ...read.record, structure: STRUCTURE } };
const planned = { ...brief.legs[0], relation: "caught", segments: SEGMENTS };
const r = renderPacket({
  brief,
  leg: planned,
  priorSections: [],
  section: sectionOfLeg(brief.legs).get(planned.leg_id),
  sections: sectionsOf(brief.legs),
});
const input = (r.packet || "").split("\n");
const from = input.indexOf("## The plan of this paragraph");
const to = input.findIndex((l, i) => i > from && l.startsWith("## "));
const plan = from < 0 ? [] : input.slice(from, to < 0 ? input.length : to);

// (q) the table holds the rows the Leg's relation reaches and no other, and no decoded sentence stands in the input.
const rows = plan.filter((l) => l.startsWith("| {"));
const decoded = [...new Set(["caught", "lost"].flatMap((id) => legSentences(STRUCTURE, id)).map((s) => s.sentence))];
const said = decoded.filter((s) => input.some((l) => l.includes(s)));
ok(
  !r.error && JSON.stringify(rows) === JSON.stringify(ROWS) && decoded.length === 5 && said.length === 0,
  `(q) the table is not one row for each Role, Relation and HigherOrderRelation the Leg's relation reaches and no other row, or a line of the input holds a Relation's sentence with a Role's name in place of its braces: ${r.error || JSON.stringify({ rows, said })}`,
);

// (r) each part's line opens with a symbol in braces or with `Neither.`, and none with the labels the symbols replaced.
const parts = plan.filter((l) => /^\d+\. /.test(l));
const labelled = input.filter((l) => /^\d+\. (Argument |CentralClaim\.)/.test(l));
// Inside (r) (kogaki#1950): part 4's Edge carries Hypophora of the kind `answer`, and its line holds that kind's text
// from src/sme/senses.json and not the other kind's; the same Leg with the kind `question` there holds that kind's.
const HYP = JSON.parse(readFileSync(join(REPO, "src/sme/senses.json"), "utf8")).hypophora;
const asking = SEGMENTS.map((g, i) => (i === 3 ? { ...g, edges: [{ ...g.edges[0], hypophora: "question" }] } : g));
const asked = renderPacket({
  brief,
  leg: { ...planned, segments: asking },
  priorSections: [],
  section: sectionOfLeg(brief.legs).get(planned.leg_id),
  sections: sectionsOf(brief.legs),
});
const part4 = (packet) => (packet || "").split("\n").find((l) => /^4\. /.test(l)) || "";
const holds = (line, kind) => line.includes(HYP[kind].meaning) && line.includes(HYP[kind].rationale);
const kinds =
  holds(part4(r.packet), "answer") &&
  !holds(part4(r.packet), "question") &&
  !asked.error &&
  holds(part4(asked.packet), "question") &&
  !holds(part4(asked.packet), "answer");
ok(
  JSON.stringify(parts.map((l) => (l.match(/^\d+\. (\{[^{} ]+\}\.|Neither\.)/) || [])[1] || l)) ===
    JSON.stringify(OPENERS) &&
    labelled.length === 0 &&
    kinds,
  `(r) a part's line does not open with a symbol in braces or with \`Neither.\`, or a line of the input opens a part with \`Argument \` or \`CentralClaim.\`, or part 4 does not hold the text of its Edge's kind of Hypophora and of no other: ${JSON.stringify({ parts, labelled, answer: part4(r.packet), question: asked.error || part4(asked.packet) })}`,
);

// THE BASE A LEG TAKES (kogaki#1959), read from analogy.yaml beside the Brief. b_1 and b_2 tell `caught`; b_3 does not.
const dir = mkdtempSync(join(tmpdir(), "draft-packet-base-"));
const BASE = (id, word, extra = {}) => ({
  id,
  name: `the ${word}`,
  description: `A ${word} the reader keeps.`,
  roles: { kit: `the ${word}'s list`, tree: `the ${word}'s shelf`, ledger: `the ${word}'s card` },
  relations: {
    caught: `The ${word}'s card shows which entry was lost.`,
    lost: `A ${word} entry is lost.`,
    audits: `The ${word}'s card names each thing on the shelf.`,
    ...extra,
  },
});
const BASES = [BASE("b_1", "pantry", { writes: "The list is copied onto the shelf." }), BASE("b_2", "library")];
const writeBases = (bases) => writeFileSync(join(dir, "analogy.yaml"), stringifyYaml({ bases }));
const placed = { ...brief, path: join(dir, "brief.yaml") };
const domains = (list) => SEGMENTS.map((g, i) => ({ bind: g.bind, domain: list[i], edges: g.edges }));
const renderLeg = (segments, extra = {}, b = placed) =>
  renderPacket({
    brief: b,
    leg: { ...planned, segments, ...extra },
    priorSections: [],
    section: sectionOfLeg(b.legs).get(planned.leg_id),
    sections: sectionsOf(b.legs),
  });
const lines = (packet) => (packet || "").split("\n");
const partOpen = (packet, n) =>
  ((lines(packet).find((l) => l.startsWith(`${n}. `)) || "").match(/^\d+\. [^.]*/) || [""])[0];
writeBases([...BASES, { ...BASE("b_3", "garden"), relations: { audits: "The card names each bed." } }]);

// (s) a Leg with an `apart` and a `both` Segment and a Base that tells it holds the second table with that Base's
// description, things and sentences, and those parts' lines open with their marks.
const mixed = renderLeg(domains(["own", "apart", "both", "neither"]));
const want = [
  "### The same structure in a situation the reader knows",
  "The situation is this: A pantry the reader keeps.",
  "| symbol | in the situation |",
  "| {kit} | the pantry's list |",
  "| {ledger} | the pantry's card |",
  "| {writes} | The list is copied onto the shelf. |",
  "| {caught} | The pantry's card shows which entry was lost. |",
];
const opens = [1, 2, 3, 4].map((n) => partOpen(mixed.packet, n));
ok(
  !mixed.error &&
    want.every((w) => lines(mixed.packet).includes(w)) &&
    !lines(mixed.packet).some((l) => l.startsWith("| {overwrites} | The")) &&
    JSON.stringify(opens) ===
      JSON.stringify([
        "1. {lost}",
        "2. Neither, in the situation",
        "3. {audits}, in the article's subject and in the situation",
        "4. {caught}",
      ]),
  `(s) the Packet of a Leg with an apart and a both Segment does not hold the Base's table, or its parts do not open with their marks: ${mixed.error || JSON.stringify(opens)}`,
);

// (t) a Leg whose Segments are all `own` or `neither` renders, with analogy.yaml there and with none, the Packet the same
// Leg renders with no `domain` on its Segments, as a plan written before kogaki#1959 has them.
const plain = renderLeg(domains(["own", "neither", "own", "own"]));
const undomained = renderLeg(SEGMENTS);
rmSync(join(dir, "analogy.yaml"));
const bare = renderLeg(domains(["own", "neither", "own", "own"]));
ok(
  !plain.error &&
    plain.packet === undomained.packet &&
    bare.packet === undomained.packet &&
    plain.packet === r.packet &&
    !plain.packet.includes("in the situation"),
  `(t) a Leg of own and neither Segments does not render the Packet it renders with no domain, with and without analogy.yaml: ${plain.error || bare.error || "the bytes differ"}`,
);

// (u) a Leg with an `apart` Segment and no Base that tells it is refused naming the Leg: with no analogy.yaml, with one
// whose Bases do not tell it, and with a `base` naming a Base that does not tell it.
const none = renderLeg(domains(["apart", "own", "own", "own"]));
writeBases([{ ...BASE("b_3", "garden"), relations: { audits: "The card names each bed." } }]);
const untold = renderLeg(domains(["apart", "own", "own", "own"]));
writeBases([...BASES, { ...BASE("b_3", "garden"), relations: { audits: "The card names each bed." } }]);
const wrong = renderLeg(domains(["apart", "own", "own", "own"]), { base: "b_3" });
const refusedNaming = (x) => typeof x.error === "string" && x.error.includes("Leg s1") && !x.packet;
ok(
  refusedNaming(none) &&
    none.error.includes("node src/analogy.mjs propose") &&
    refusedNaming(untold) &&
    refusedNaming(wrong) &&
    wrong.error.includes("b_3") &&
    [untold, wrong].every((x) => x.error.includes("node src/analogy.mjs propose")),
  `(u) a Leg with an apart Segment and no Base that tells it is not refused naming the Leg: ${JSON.stringify([none.error, untold.error, wrong.error])}`,
);

// (v) where two Bases tell the Leg, its `base` decides, and with none the first in the file is taken.
const first = renderLeg(domains(["apart", "own", "own", "own"]));
const second = renderLeg(domains(["apart", "own", "own", "own"]), { base: "b_2" });
const situation = (x) => lines(x.packet).find((l) => l.startsWith("The situation is this: ")) || x.error;
ok(
  situation(first) === "The situation is this: A pantry the reader keeps." &&
    situation(second) === "The situation is this: A library the reader keeps." &&
    first.base.id === "b_1" &&
    second.base.id === "b_2",
  `(v) the Leg's \`base\` does not decide between two Bases, or with none the first is not taken: ${JSON.stringify([situation(first), situation(second)])}`,
);
rmSync(dir, { recursive: true, force: true });

if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log(
  `draft-packet: ${cases} case(s) pass, (q) and (r) over a Leg on a HigherOrderRelation, (s) to (v) on its Base`,
);
