// Case (m) of checks/check-leg-planning-playground.sh (kogaki#1817): the connections the Brief's structure read weighed, refused by
// `validateReadSet` under `considered: true` and rendered by the Brief sheet. Run from the repository root.
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const fails = [];
let cases = 0;
const ok = (cond, msg) => {
  cases += 1;
  if (!cond) fails.push(msg);
};
const load = (p) => import(pathToFileURL(join(resolve("."), p)).href);
const { mintStructure, validateReadSet } = await load("src/compose/structure.mjs");
const { renderBriefSheet } = await load("src/brief-plan-playground/sheet.mjs");

const CLAIMS = [
  { id: "c1", claim: "A rule set applies automatically only to the files its walker visits." },
  { id: "c2", claim: "A file the walker skips is never checked by any rule." },
  { id: "c3", claim: "A team reads a green run as covering every file." },
  { id: "c4", claim: "A team keeps the run's log for ninety days." },
];
// THE BRIEF'S READ: four relations, two higher-order relations, and the connections weighed, by name.
const READ = {
  roles: [
    { name: "rules", context: "A set of checks that runs without anyone choosing.", attributes: [], claims: ["c1"] },
    { name: "walk", context: "The list of files a tool visits.", attributes: [], claims: ["c1", "c2"] },
    { name: "file", context: "One file in a repository.", attributes: ["skipped"], claims: ["c2"] },
    { name: "team", context: "The people who read a run's result.", attributes: [], claims: ["c3", "c4"] },
    { name: "log", context: "The record a run leaves behind.", attributes: [], claims: ["c4"] },
  ],
  relations: [
    { name: "p1", between: ["rules", "walk"], holds: "{rules} applies only to what {walk} visits.", from: "c1" },
    { name: "p2", between: ["walk", "file"], holds: "{file} left off {walk} is never checked.", from: "c2" },
    { name: "p3", between: ["team", "rules"], holds: "{team} reads a pass of {rules} as complete.", from: "c3" },
    { name: "p4", between: ["team", "log"], holds: "{team} keeps {log} for ninety days.", from: "c4" },
  ],
  higher_order: [
    {
      name: "h1",
      relates: ["p1", "p2"],
      holds: "Because {rules} reads only {walk}, {file} is unchecked.",
      from: ["c2"],
    },
    { name: "h2", relates: ["h1", "p3"], holds: "{team} trusts a pass that never reached {file}.", from: ["c3"] },
  ],
  considered: [
    { relations: ["p1", "p2"], criterion: ["c2"], verdict: "connected", why: "WHY-H1 the rules read only the walk." },
    { relations: ["h1", "p3"], criterion: ["c3"], verdict: "connected", why: "WHY-H2 the team trusts the run." },
    {
      relations: ["p4", "p3"],
      criterion: ["c4", "c3"],
      verdict: "not_connected",
      why: "WHY-NOT no claim ties the log to the pass.",
    },
  ],
};
const read = (f) => {
  const s = JSON.parse(JSON.stringify(READ));
  f(s);
  return s;
};
const verdict = (s) => {
  const m = mintStructure(s);
  return m.text ? m : validateReadSet(m.structure, CLAIMS, { thesis: false, considered: true });
};

const MINTED = mintStructure(READ).structure;
ok(!verdict(READ).text, `(m) a read carrying its considered rows was refused: ${JSON.stringify(verdict(READ))}`);
ok(
  JSON.stringify(MINTED.considered.map((c) => c.relations)) === '[["c_1","c_2"],["h_1","c_3"],["c_4","c_3"]]',
  `(m) the considered rows' names were not minted to ids: ${JSON.stringify(MINTED.considered)}`,
);
for (const [what, s, word] of [
  ["a read with no considered", read((s) => delete s.considered), "`considered`"],
  [
    "a higher-order relation with no connected row",
    read((s) => s.considered.splice(1, 1)),
    '"h2" (h_2) carries no `connected` row',
  ],
  ["a relation in no row", read((s) => s.considered.splice(2, 1)), '"p4" (c_4) stands in no row'],
  [
    "a connected row no higher-order relation relates",
    read((s) => (s.considered[2].verdict = "connected")),
    "considered[2] is `connected`",
  ],
  [
    "a not_connected row a higher-order relation relates",
    read((s) => (s.considered[0].verdict = "not_connected")),
    "considered[0] is `not_connected`",
  ],
  ["a verdict outside the two", read((s) => (s.considered[2].verdict = "maybe")), "considered[2]'s `verdict`"],
  ["a criterion naming no claim", read((s) => (s.considered[2].criterion = ["c9"])), "considered[2]'s `criterion`"],
]) {
  const v = verdict(s);
  ok(v.text && v.text.includes(word), `(m) ${what} was not refused naming ${word}: ${JSON.stringify(v)}`);
}

// THE BRIEF SHEET over a Brief carrying the minted read, and over the same Brief carrying no `considered`.
const brief = { slug: "fixture", thesis: "A green run says nothing of the files never visited.", reader_path: [] };
const sheet = renderBriefSheet({ brief: { ...brief, structure: MINTED }, claims: CLAIMS });
const map = sheet.slice(sheet.indexOf("<h2>Structure Mapping</h2>"), sheet.indexOf("<h2>Legs</h2>"));
const higher = map.slice(map.indexOf("<h3>Higher-order relations</h3>"), map.indexOf("<h3>Not connected</h3>"));
ok(
  /<tr><td>h_1<\/td><td>h1<\/td><td>[^<]*<\/td><td>c2<\/td><td>WHY-H1 the rules read only the walk\.<\/td><\/tr>/.test(
    higher,
  ) &&
    /<tr><td>h_2<\/td><td>h2<\/td><td>[^<]*<\/td><td>c3<\/td><td>WHY-H2 the team trusts the run\.<\/td><\/tr>/.test(
      higher,
    ),
  "(m) the Brief sheet does not render each connected row's why beside its higher-order relation",
);
const not = map.slice(map.indexOf("<h3>Not connected</h3>"));
ok(
  map.includes("<h3>Not connected</h3>") &&
    not.includes("<thead><tr><th>relations</th><th>claims</th><th>why</th></tr></thead>") &&
    not.includes("<td>p4 (c4), p3 (c3)</td>") &&
    not.includes(`c4: ${CLAIMS[3].claim}`) &&
    not.includes(`c3: ${CLAIMS[2].claim}`) &&
    not.includes("WHY-NOT no claim ties the log to the pass.") &&
    !not.includes("WHY-H"),
  "(m) the Brief sheet does not render the Not connected table naming the relations, the claims read and the why",
);
const { considered, ...bare } = MINTED;
const plain = renderBriefSheet({ brief: { ...brief, structure: bare }, claims: CLAIMS });
ok(
  considered && !plain.includes("Not connected") && !plain.includes("<th>why</th>"),
  "(m) a Brief carrying no `considered` renders a Not connected table or a why column",
);

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log(`check-leg-planning-playground (m): ok, ${cases} case(s)`);
