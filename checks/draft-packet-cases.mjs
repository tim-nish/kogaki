// The cases of `checks/check-draft-packet.sh` on the table of the plan block, over the Writer's input rendered for a Leg
// on a HigherOrderRelation of a `structure` that holds more than the Leg's relation reaches.
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = process.cwd();
const imp = (p) => import(pathToFileURL(join(REPO, p)).href);
const { legRecord, briefRecordText } = await imp("src/compose.mjs");
const { readBrief, renderPacket, sectionsOf, sectionOfLeg } = await imp("src/draft.mjs");
const { legSentences } = await imp("src/sme/arguments.mjs");
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
  ],
  higher_order: [
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
  { bind: 3, edges: [{ sense: null, to: [3], hypophora: true }] },
];
const OPENERS = ["{lost}.", "Neither.", "{audits}.", "{caught}."];

const leg = {
  leg_id: "s1",
  text: "The ledger shows which edit to the kit was lost.",
  claims: [{ strand: "L1", proposition: "the installer keeps a ledger of what it wrote." }],
};
const read = readBrief(
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
ok(
  JSON.stringify(parts.map((l) => (l.match(/^\d+\. (\{[^{} ]+\}\.|Neither\.)/) || [])[1] || l)) ===
    JSON.stringify(OPENERS) && labelled.length === 0,
  `(r) a part's line does not open with a symbol in braces or with \`Neither.\`, or a line of the input opens a part with \`Argument \` or \`CentralClaim.\`: ${JSON.stringify({ parts, labelled })}`,
);

if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log(`draft-packet: ${cases} case(s) pass, (q) and (r) over a Leg on a HigherOrderRelation`);
