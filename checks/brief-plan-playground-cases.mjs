// The cases of checks/check-brief-plan-playground.sh but (m): the check of the structure a Brief is read into, the Legs
// derived from it and the BriefPlanPlayground, each with no model call. Run from the repository root.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

const fails = [];
const ok = (cond, msg) => {
  if (!cond) fails.push(msg);
};
const repo = resolve(".");
const load = (p) => import(pathToFileURL(join(repo, p)).href);
const { parseYaml, stringifyYaml } = await load("src/yaml.mjs");
const { mintStructure, validateReadSet, asOneList, oneListIds, ID_PREFIX } = await load("src/sme/structure.mjs");
const { withReach, structureLegs } = await load("src/compose/structure.mjs");
const { writeBriefFiles } = await load("src/compose/brief-files.mjs");
const root = mkdtempSync(join(tmpdir(), "brief-plan-playground-"));

// ---- the fixture claims and the structure ----
const CLAIMS = [
  "A rule set applies automatically only to the files its walker visits.",
  "A file the walker skips is never checked by any rule.",
  "A team reads a green run as covering every file.",
];
const THESIS = "A green automatic run says nothing about the files its walker never visited.";
const fixtureClaims = CLAIMS.map((claim, i) => ({ id: `c${i + 1}`, claim }));
// THE STRUCTURE AS A READ ANSWERS IT: every element by its `name`, the references by name, the relations among Roles
// and the higher-order relations in the one list `relations`; MINTED is it with the ids.
const STRUCTURE = {
  roles: [
    {
      name: "rules",
      context: "A set of checks that runs without anyone choosing what it reads.",
      attributes: ["automatic"],
      claims: ["c1", "c2"],
    },
    { name: "walk", context: "The list of files a tool visits when it runs.", attributes: [], claims: ["c1", "c2"] },
    { name: "file", context: "One file in a repository.", attributes: ["skipped"], claims: ["c2", "c3"] },
    { name: "team", context: "The people who read the result of a run.", attributes: [], claims: ["c3"] },
  ],
  relations: [
    { name: "p1", between: ["rules", "walk"], holds: "{rules} applies only to what {walk} visits.", from: "c1" },
    { name: "p2", between: ["walk", "file"], holds: "{file} left off {walk} is never checked.", from: "c2" },
    {
      name: "p3",
      between: ["team", "rules"],
      holds: "{team} reads a pass of {rules} as covering every file.",
      from: "c3",
    },
    {
      name: "h1",
      relates: ["p1", "p2"],
      holds: "Because {rules} reads only {walk}, {file} off it is unchecked.",
      holds_over_relations: "{p1} is why {p2} holds.",
      from: ["c2"],
    },
    { name: "h2", relates: ["h1", "p3"], holds: "{team} trusts a pass that never reached {file}." },
  ],
  attains_thesis: "h2",
};
const MINTED = mintStructure(STRUCTURE).structure;
const readSet = (s, claims) => {
  const m = mintStructure(s);
  return m.text ? m : validateReadSet(m.structure, claims);
};
// THE FIVE LEGS the structure derives, in post-order: [leg_id, relation, text].
const WANT = [
  ["L1", "c_1", "rules applies only to what walk visits."],
  ["L2", "c_2", "file left off walk is never checked."],
  ["L3", "c_4", "Because rules reads only walk, file off it is unchecked."],
  ["L4", "c_3", "team reads a pass of rules as covering every file."],
  ["L5", "c_5", "team trusts a pass that never reached file."],
];

// (c) the structure's refusals
const without = (f) => {
  const s = JSON.parse(JSON.stringify(STRUCTURE));
  f(s);
  return s;
};
const refusals = [
  [
    "a non-apex higher-order relation with no from",
    without((s) => {
      s.relations[3].from = [];
    }),
    '"h1"',
  ],
  [
    "a from naming no claim",
    without((s) => {
      s.relations[3].from = ["c9"];
    }),
    '"h1"',
  ],
  [
    "a higher-order relation relating itself through another",
    without((s) => {
      s.relations[3].relates = ["p1", "h2"];
    }),
    '"h1"',
  ],
  [
    "a written reach",
    without((s) => {
      s.reach = ["h2"];
    }),
    "reach",
  ],
  [
    "a Role in no relation",
    without((s) => {
      s.roles.push({ name: "idle", context: "A thing nothing relates.", attributes: [], claims: ["c1"] });
    }),
    '"idle"',
  ],
  [
    "a higher-order relation relating one relation",
    without((s) => {
      s.relations[3].relates = ["p1"];
    }),
    '"h1"',
  ],
  [
    "a relation naming three Roles",
    without((s) => {
      s.relations[0].between = ["rules", "walk", "file"];
    }),
    '"p1" (c_1)\'s `between` does not name exactly two Roles',
  ],
  [
    "a non-apex higher-order relation relating three",
    without((s) => {
      s.relations[3].relates = ["p1", "p2", "p3"];
    }),
    '"h1" (c_4) does not relate exactly two relations',
  ],
  [
    "a higher-order relation whose holds_over_relations writes one of its two relations",
    without((s) => {
      s.relations[3].holds_over_relations = "{p1} is why the other holds.";
    }),
    "writes no {p2}",
  ],
  [
    "a higher-order relation whose holds_over_relations writes a Role in braces",
    without((s) => {
      s.relations[3].holds_over_relations = "{p1} is why {p2} holds of {file}.";
    }),
    "writes {file}",
  ],
  [
    "a missing attains_thesis",
    without((s) => {
      delete s.attains_thesis;
    }),
    "attains_thesis",
  ],
  [
    "an answer writing an id",
    without((s) => {
      s.relations[1].id = "c_2";
    }),
    "relations[1]",
  ],
  [
    "an apex carrying from",
    without((s) => {
      s.relations[4].from = [];
    }),
    "the apex, relations[4]",
  ],
  [
    "an apex whose holds_over_relations writes one of the relations it relates",
    without((s) => {
      s.relations[4].holds_over_relations = "{h1} is what the team overlooks.";
    }),
    '"h2" (c_5)\'s `holds_over_relations` writes no {p3}',
  ],
  [
    "an apex whose holds_over_relations writes a Role in braces",
    without((s) => {
      s.relations[4].holds_over_relations = "{p3} overlooks what {h1} says of {file}.";
    }),
    '"h2" (c_5)\'s `holds_over_relations` writes {file}',
  ],
  [
    "a relation carrying both between and relates",
    without((s) => {
      s.relations[0].relates = ["p2", "p3"];
    }),
    'the relation "p1" (c_1), carries both `between` and `relates`',
  ],
  [
    "a relation carrying neither between nor relates",
    without((s) => {
      delete s.relations[3].relates;
    }),
    'the relation "h1" (c_4), carries neither `between` nor `relates`',
  ],
  [
    "a written higher_order list",
    without((s) => {
      s.higher_order = [];
    }),
    "the structure carries `higher_order`, which it does not declare",
  ],
  [
    "a list with no relation among Roles",
    without((s) => {
      s.relations = s.relations.slice(3);
    }),
    "carries no relation with `between`",
  ],
  [
    "a list with no higher-order relation",
    without((s) => {
      s.relations = s.relations.slice(0, 3);
      s.attains_thesis = "p3";
    }),
    "carries no relation with `relates`",
  ],
];
for (const [what, s, word] of refusals) {
  const v = readSet(s, fixtureClaims);
  ok(v.text && v.text.includes(word), `(c) ${what} was not refused naming ${word}: ${JSON.stringify(v)}`);
}
const minted = (f) => {
  const s = JSON.parse(JSON.stringify(MINTED));
  f(s);
  return s;
};
for (const [what, s, word] of [
  [
    "a Role with no name",
    minted((s) => {
      delete s.roles[2].name;
    }),
    "roles[2]",
  ],
  [
    "a relation id out of order",
    minted((s) => {
      s.relations[1].id = "c_7";
    }),
    "relations[1]",
  ],
  [
    "a higher-order relation id of another kind",
    minted((s) => {
      s.relations[3].id = "r_1";
    }),
    "relations[3]",
  ],
]) {
  const v = validateReadSet(s, fixtureClaims);
  ok(v.text && v.text.includes(word), `(c) ${what} was not refused naming ${word}: ${JSON.stringify(v)}`);
}
ok(
  JSON.stringify([
    MINTED.roles.map((r) => [r.id, r.name]),
    MINTED.relations.map((r) => [r.id, r.name, r.between ?? r.relates]),
    MINTED.attains_thesis,
  ]) ===
    JSON.stringify([
      [
        ["r_1", "rules"],
        ["r_2", "walk"],
        ["r_3", "file"],
        ["r_4", "team"],
      ],
      [
        ["c_1", "p1", ["r_1", "r_2"]],
        ["c_2", "p2", ["r_2", "r_3"]],
        ["c_3", "p3", ["r_4", "r_1"]],
        ["c_4", "h1", ["c_1", "c_2"]],
        ["c_5", "h2", ["c_4", "c_3"]],
      ],
      "c_5",
    ]) &&
    MINTED.relations[0].holds === "{r_1} applies only to what {r_2} visits." &&
    JSON.stringify(ID_PREFIX) === '{"roles":"r","relations":"c"}' &&
    !Object.hasOwn(MINTED, "higher_order") &&
    MINTED.relations[3].holds_over_relations === "{c_1} is why {c_2} holds." &&
    !Object.hasOwn(MINTED.relations[4], "holds_over_relations") &&
    !Object.hasOwn(MINTED.relations[4], "from"),
  `(c) the runner did not mint r_/c_ ids in order of appearance over the one list of relations: ${JSON.stringify(MINTED)}`,
);
ok(
  !readSet(STRUCTURE, fixtureClaims).text,
  "(c) the valid structure, its apex with no `from` and h2 relating h1, was refused",
);
const apexOver = readSet(
  without((s) => {
    s.relations[4].holds_over_relations = "{p3} overlooks what {h1} says.";
  }),
  fixtureClaims,
);
ok(
  !apexOver.text,
  `(c) an apex carrying a holds_over_relations that writes each relation it relates was refused: ${JSON.stringify(apexOver)}`,
);
ok(
  JSON.stringify(withReach(MINTED, fixtureClaims).reach) ===
    JSON.stringify(
      withReach(
        minted((s) => {
          s.relations[4].from = [];
        }),
        fixtureClaims,
      ).reach,
    ),
  "(c) withReach over the apex with no `from` is not the reach of the apex with `from: []`",
);
ok(
  !readSet(
    without((s) => {
      s.relations[2].from = "c2";
    }),
    fixtureClaims,
  ).text,
  "(c) a claim no relation is from was refused rather than reported",
);

// (d) the five Legs, derived with no Call
const legs = structureLegs(withReach(MINTED, fixtureClaims), fixtureClaims);
ok(
  JSON.stringify(legs.map((l) => [l.leg_id, l.relation, l.text])) === JSON.stringify(WANT),
  `(d) the five Legs are not derived in post-order, each saying its relation's holds: ${JSON.stringify(legs.map((l) => [l.leg_id, l.relation, l.text]))}`,
);
ok(
  legs.map((l) => l.reaches_target === true).join(",") === "false,false,false,false,true",
  "(d) the apex's Leg is not alone marked `reaches_target`",
);
ok(
  JSON.stringify(legs[2] && legs[2].claims.map((g) => g.strand)) === '["c2"]',
  "(d) a higher-order relation's Leg does not carry the claims its `from` names",
);

// (j) a fourth claim the apex does not reach
const CLAIM4 = "A team keeps the run's log for ninety days.";
const claims4Ids = [...fixtureClaims, { id: "c4", claim: CLAIM4 }];
const S4 = without((s) => {
  s.roles.push({ name: "log", context: "The record a run leaves behind.", attributes: [], claims: ["c4"] });
  s.relations.push({ name: "p4", between: ["team", "log"], holds: "{team} keeps {log} for ninety days.", from: "c4" });
  s.relations.push({
    name: "h3",
    relates: ["p4", "p3"],
    holds: "{team} keeps {log} of a pass of {rules}.",
    holds_over_relations: "{p4} outlasts {p3}.",
    from: ["c4"],
  });
});
ok(
  !readSet(S4, claims4Ids).text,
  `(j) the four-claim structure was refused: ${JSON.stringify(readSet(S4, claims4Ids))}`,
);
const sy = withReach(mintStructure(S4).structure, claims4Ids);
const l4 = structureLegs(sy, claims4Ids);
ok(
  JSON.stringify(l4.map((l) => l.relation)) === '["c_1","c_2","c_4","c_3","c_5"]',
  `(j) a Leg serves a relation the apex does not reach: ${JSON.stringify(l4.map((l) => l.relation))}`,
);
const un = sy.unreached || { relations: [], claims: [] };
ok(
  JSON.stringify(Object.keys(un)) === '["relations","claims"]' &&
    JSON.stringify(un.relations) ===
      JSON.stringify([
        { id: "c_6", reached_by: ["c_7"] },
        { id: "c_7", reached_by: [] },
      ]) &&
    JSON.stringify(un.claims) === JSON.stringify([{ id: "c4", reached_by: ["c_6", "c_7"] }]),
  `(j) the structure does not carry p4, h3 and c4 under unreached, the relations of both sorts in one list: ${JSON.stringify(sy.unreached)}`,
);
ok(
  JSON.stringify(sy.reach) === JSON.stringify(["c_1", "c_2", "c_3", "c_4", "c_5"]),
  `(j) the structure's reach is not the apex's closure: ${JSON.stringify(sy.reach)}`,
);
// (j) a structure stored before the one list, under `relations` and `higher_order` with `h_<n>` ids, is read as one
// list: the higher-order relations appended, each `h_<n>` renamed `c_<R+n>`, and every reference renamed with it.
const ANSWER4 = {
  ...STRUCTURE,
  roles: [
    ...STRUCTURE.roles,
    { name: "log", context: "The record a run leaves behind.", attributes: [], claims: ["c4"] },
  ],
  relations: [
    ...STRUCTURE.relations.slice(0, 3),
    { name: "p4", between: ["team", "log"], holds: "{team} keeps {log} for ninety days.", from: "c4" },
    ...STRUCTURE.relations.slice(3),
    {
      name: "h3",
      relates: ["p4", "h1"],
      holds: "{team} keeps {log} of a run of {rules}.",
      holds_over_relations: "{p4} outlasts {h1}.",
      from: ["c4"],
    },
  ],
  considered: [
    { relations: ["p1", "p2"], criterion: ["c2"], verdict: "connected", why: "The walk is what the rules read." },
    { relations: ["h1", "p3"], criterion: ["c3"], verdict: "connected", why: "The team trusts the run." },
    { relations: ["p4", "h1"], criterion: ["c4"], verdict: "connected", why: "The log outlasts the run." },
  ],
};
const NEW4 = withReach(mintStructure(ANSWER4).structure, claims4Ids);
const OLD4 = {
  roles: NEW4.roles,
  relations: NEW4.relations.slice(0, 4),
  higher_order: [
    {
      id: "h_1",
      name: "h1",
      relates: ["c_1", "c_2"],
      holds: "Because {r_1} reads only {r_2}, {r_3} off it is unchecked.",
      holds_over_relations: "{c_1} is why {c_2} holds.",
      from: ["c2"],
    },
    { id: "h_2", name: "h2", relates: ["h_1", "c_3"], holds: "{r_4} trusts a pass that never reached {r_3}." },
    {
      id: "h_3",
      name: "h3",
      relates: ["c_4", "h_1"],
      holds: "{r_4} keeps {r_5} of a run of {r_1}.",
      holds_over_relations: "{c_4} outlasts {h_1}.",
      from: ["c4"],
    },
  ],
  attains_thesis: "h_2",
  considered: [
    { relations: ["c_1", "c_2"], criterion: ["c2"], verdict: "connected", why: "The walk is what the rules read." },
    { relations: ["h_1", "c_3"], criterion: ["c3"], verdict: "connected", why: "The team trusts the run." },
    { relations: ["c_4", "h_1"], criterion: ["c4"], verdict: "connected", why: "The log outlasts the run." },
  ],
  reach: ["c_1", "c_2", "c_3", "h_1", "h_2"],
  unreached: {
    relations: [{ id: "c_4", reached_by: ["h_3"] }],
    higher_order: [{ id: "h_3", reached_by: [] }],
    claims: [{ id: "c4", reached_by: ["c_4", "h_3"] }],
  },
};
const OLD4_TEXT = JSON.stringify(OLD4);
const one4 = asOneList(OLD4);
ok(
  JSON.stringify([...oneListIds(OLD4)]) === '[["h_1","c_5"],["h_2","c_6"],["h_3","c_7"]]' &&
    oneListIds(NEW4).size === 0,
  `(j) the ids of a structure stored under two lists are not renamed h_<n> to c_<R+n>: ${JSON.stringify([...oneListIds(OLD4)])}`,
);
ok(
  isDeepStrictEqual(one4, NEW4) &&
    !Object.hasOwn(one4, "higher_order") &&
    !Object.hasOwn(one4.unreached, "higher_order") &&
    !/\bh_\d/.test(JSON.stringify(one4)) &&
    one4.relations[6].holds_over_relations === "{c_4} outlasts {c_5}." &&
    JSON.stringify(one4.unreached.relations) === '[{"id":"c_4","reached_by":["c_7"]},{"id":"c_7","reached_by":[]}]' &&
    JSON.stringify(one4.considered.map((c) => c.relations)) === '[["c_1","c_2"],["c_5","c_3"],["c_4","c_5"]]',
  `(j) a structure stored under two lists is not read as the one list the same reading mints: ${JSON.stringify(one4)}`,
);
ok(
  JSON.stringify(OLD4) === OLD4_TEXT && asOneList(NEW4) === NEW4,
  "(j) reading a stored structure as one list changed the record in hand, or changed a structure already in one list",
);
ok(
  !validateReadSet(
    Object.fromEntries(Object.entries(one4).filter(([key]) => key !== "reach" && key !== "unreached")),
    claims4Ids,
    { considered: true },
  ).text,
  "(j) a structure stored under two lists, read as one, is refused by the check of the one list",
);
// (k) the BriefPlanPlayground: a Brief over the four-claim structure and its Legs, rendered with no model call
const { BRIEF_PARTS, BRIEF_RETIRED_WORDS } = await load("src/brief-plan-playground/sheet.mjs");
const kRoot = join(root, "brief-plan-playground");
mkdirSync(join(kRoot, "theses", "fixture"), { recursive: true });
const kBrief = join(kRoot, "theses", "fixture", "brief.yaml");
// An adopted Brief is three files (kogaki#1955), each written here from one whole record.
const ADOPTED = {
  compose_path: "audiences/dev-to-zenn.md",
  strand_coverage: [],
  journey_coverage: [],
  tradeoffs: {},
  bridged: {},
};
const kTexts = writeBriefFiles(kBrief, {
  slug: "fixture",
  ...ADOPTED,
  thesis: THESIS,
  strands: claims4Ids.map((c) => ({ id: c.id, slug: c.id })),
  structure: sy,
  reader_path: l4.map((l, i) => (i ? l : { ...l, claims: [{ strand: "c1", proposition: CLAIMS[0] }] })),
});
const k = spawnSync(
  process.execPath,
  ["src/brief-plan-playground/sheet.mjs", "brief", "--brief", kBrief, "--out", join(kRoot, "out")],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: join(root, "no-model") }, timeout: 60000 },
);
const kSheet = existsSync(join(kRoot, "out", "sheet.html"))
  ? readFileSync(join(kRoot, "out", "sheet.html"), "utf8")
  : "";
ok(
  k.status === 0 &&
    kSheet.includes("<title>BriefPlanPlayground fixture</title>") &&
    kSheet.includes("<h1>BriefPlanPlayground — fixture</h1>"),
  `(k) the brief command did not render a page titled and headed BriefPlanPlayground and the slug: ${k.stderr}`,
);
const kH2 = [...kSheet.matchAll(/<h2>([^<]*)<\/h2>/g)].map((m) => m[1]);
ok(
  JSON.stringify(kH2) === JSON.stringify(BRIEF_PARTS) &&
    JSON.stringify(BRIEF_PARTS) === JSON.stringify(["Thesis", "Claims", "Structure Mapping", "Legs"]),
  `(k) the BriefPlanPlayground's parts are not Thesis, Claims, Structure Mapping and Legs: ${JSON.stringify(kH2)}`,
);
const kMap = kSheet.slice(kSheet.indexOf("<h2>Structure Mapping</h2>"), kSheet.indexOf("<h2>Legs</h2>")),
  kH3 = (s) => [...s.matchAll(/<h3>([^<]*)<\/h3>/g)].map((m) => m[1]),
  kGraph = kMap.slice(0, kMap.indexOf("<h3>Roles</h3>"));
ok(
  JSON.stringify(kH3(kMap)) === JSON.stringify(["Roles", "Relations", "Higher-order relations"]) &&
    kH3(kSheet.replace(kMap, "")).length === 0,
  `(k) the Roles, Relations and Higher-order relations tables do not stand under Structure Mapping and nowhere else: ${JSON.stringify(kH3(kSheet))}`,
);
ok(
  kGraph.includes('class="mermaid"') &&
    kGraph.includes("rules (c1, c2)") &&
    kGraph.includes("c_5 ==&gt; c_4") &&
    kGraph.includes("class c_5 apex") &&
    /class [^\n]*c_6[^\n]* unreached/.test(kGraph) &&
    !/\d+ Roles?,/.test(kSheet),
  "(k) the graph does not label nodes by name, draw higher-order edges thick, the apex blue and the unreached red, with no counts line",
);
const kWord = BRIEF_RETIRED_WORDS.find((w) => new RegExp(`\\b${w}`).test(kSheet));
ok(kWord === undefined, `(k) the BriefPlanPlayground prints the retired word ${JSON.stringify(kWord)}`);
const kTables = [...kSheet.matchAll(/<table>([\s\S]*?)<\/table>/g)].map((m) => m[1]);
ok(
  kTables.length === 5 &&
    kTables.every((t) => {
      const head = /^<thead><tr>((?:<th>[^<]+<\/th>)+)<\/tr><\/thead>/.exec(t);
      const cols = head ? head[1].split("<th>").length - 1 : 0;
      return (
        head &&
        [...t.matchAll(/<tr[^>]*>((?:<td>[\s\S]*?<\/td>)+)<\/tr>/g)].every(
          (r) => r[1].split("<td>").length - 1 === cols,
        )
      );
    }),
  "(k) a table of the BriefPlanPlayground carries no <thead> with one heading per column",
);
const kClaims = kSheet.slice(kSheet.indexOf("<h2>Claims</h2>"), kSheet.indexOf("<h2>Structure Mapping</h2>"));
ok(
  kClaims.includes("<thead><tr><th>id</th><th>claim</th><th>reached</th></tr></thead>") &&
    !kClaims.includes("cite") &&
    kClaims.includes(CLAIMS[0]) &&
    /<tr class="unreached"><td>c4<\/td>/.test(kClaims),
  "(k) the Claims table is not id, claim and reached with the unreached claim marked",
);
const kHigher = kMap.slice(kMap.indexOf("<h3>Higher-order relations</h3>"));
ok(
  /<tr><td>c_5<\/td><td>h2<\/td><td>[^<]*<\/td><td><\/td><\/tr>/.test(kHigher),
  "(k) the apex's from column is not empty",
);
const kLegs = kSheet.slice(kSheet.indexOf("<h2>Legs</h2>"));
ok(
  kLegs.includes("<th>id</th><th>relation</th><th>text</th>") &&
    WANT.every(([id, , text]) => kLegs.includes(`<td>${id}</td>`) && kLegs.includes(text)),
  "(k) the Legs part does not list the five Legs with id, relation and text",
);
// A Brief stored before the one list renders the sheet of the same Brief stored after it, and is not written back.
const kBriefOf = (at, slug, structure, legs) =>
  writeBriefFiles(at, {
    slug,
    ...ADOPTED,
    thesis: THESIS,
    strands: claims4Ids.map((c) => ({ id: c.id, slug: c.id })),
    structure,
    reader_path: legs,
  });
const textsAt = (at) =>
  ["brief.yaml", "structure.yaml", "reader-path.yaml"].map((f) => readFileSync(join(dirname(at), f), "utf8")).join("");
const kNewLegs = structureLegs(NEW4, claims4Ids);
const kOldId = new Map([...oneListIds(OLD4)].map(([was, now]) => [now, was]));
const kOldLegs = kNewLegs.map((l) => ({ ...l, relation: kOldId.get(l.relation) ?? l.relation }));
const kStored = {};
for (const [which, structure, legs] of [
  ["one-list", NEW4, kNewLegs],
  ["two-lists", OLD4, kOldLegs],
]) {
  const at = join(kRoot, "theses", which, "brief.yaml");
  mkdirSync(dirname(at), { recursive: true });
  const t = kBriefOf(at, "stored", structure, legs);
  const text = t.brief + t.structure + t.readerPath;
  const r = spawnSync(
    process.execPath,
    ["src/brief-plan-playground/sheet.mjs", "brief", "--brief", at, "--out", join(kRoot, `out-${which}`)],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: join(root, "no-model") }, timeout: 60000 },
  );
  const out = join(kRoot, `out-${which}`, "sheet.html");
  kStored[which] = {
    status: r.status,
    stderr: r.stderr,
    sheet: existsSync(out) ? readFileSync(out, "utf8") : "",
    kept: textsAt(at) === text,
  };
}
ok(
  JSON.stringify(kOldLegs.map((l) => l.relation)) === '["c_1","c_2","h_1","c_3","h_2"]' &&
    kStored["two-lists"].status === 0 &&
    kStored["one-list"].status === 0 &&
    kStored["one-list"].sheet.includes("<td>c_5</td><td>h1</td>") &&
    kStored["one-list"].sheet.includes("c_6 ==&gt; c_5") &&
    kStored["two-lists"].sheet === kStored["one-list"].sheet &&
    !/\bh_\d/.test(kStored["two-lists"].sheet),
  `(k) a Brief stored under two lists does not render the sheet of the same Brief stored under one, its ids renamed: ${kStored["two-lists"].stderr}`,
);
ok(kStored["two-lists"].kept, "(k) rendering a Brief stored under two lists wrote the Brief back");

// (l) the BriefPlanPlayground's `show` writes the sheet at the home read from the Brief's path; a retired Leg is refused
const lHome = join(kRoot, "runs", "brief-plan-playground", "fixture");
const sheetCmd = (args) =>
  spawnSync(process.execPath, ["src/brief-plan-playground/sheet.mjs", ...args], {
    encoding: "utf8",
    env: { ...process.env, KOGAKI_JUDGE_CLI: join(root, "no-model") },
    timeout: 60000,
  });
const l = sheetCmd(["show", "--brief", kBrief]);
const lSheet = existsSync(join(lHome, "sheet.html")) ? readFileSync(join(lHome, "sheet.html"), "utf8") : "";
const lSha = existsSync(join(lHome, "brief.sha256")) ? readFileSync(join(lHome, "brief.sha256"), "utf8") : "";
ok(
  l.status === 0 && l.stdout === `${pathToFileURL(join(lHome, "sheet.html")).href}\n`,
  `(l) show did not print the sheet's file:// URL as its one line: ${l.status} ${l.stdout} ${l.stderr}`,
);
ok(lSheet === kSheet, "(l) show's sheet is not the sheet the brief command renders over the same Brief");
ok(
  lSha ===
    `${createHash("sha256")
      .update(kTexts.brief + kTexts.structure + kTexts.readerPath)
      .digest("hex")}  theses/fixture/brief.yaml\n`,
  `(l) brief.sha256 does not name the Brief it rendered: ${JSON.stringify(lSha)}`,
);
const kParsed = parseYaml(kTexts.readerPath, "reader-path.yaml");
for (const [key, retire] of [
  ["waypoints", (g) => ({ ...g, waypoints: [] })],
  ["move", (g) => ({ ...g, move: "m" })],
  ["text", (g) => ({ ...g, text: "A sentence of the Leg's own." })],
]) {
  const rRoot = join(root, `retired-${key}`);
  const rBrief = join(rRoot, "theses", "old", "brief.yaml");
  mkdirSync(dirname(rBrief), { recursive: true });
  writeFileSync(rBrief, kTexts.brief);
  writeFileSync(join(dirname(rBrief), "structure.yaml"), kTexts.structure);
  writeFileSync(
    join(dirname(rBrief), "reader-path.yaml"),
    stringifyYaml({ reader_path: kParsed.reader_path.map((g, i) => (i === 1 ? retire(g) : g)) }),
  );
  const leg = kParsed.reader_path[1].leg_id;
  for (const args of [
    ["show", "--brief", rBrief],
    ["brief", "--brief", rBrief, "--out", join(rRoot, "out")],
  ]) {
    const r = sheetCmd(args);
    ok(
      r.status === 1 &&
        r.stderr.includes(key === "text" ? `leg ${leg}` : `Leg ${leg}`) &&
        r.stderr.includes(`\`${key}\``) &&
        r.stderr.includes(key === "text" ? "kogaki#1955" : "which is not a Leg field"),
      `(l) ${args[0]} over a Leg retired by \`${key}\` is not refused naming ${leg} and the key: ${r.status} ${r.stderr}`,
    );
  }
  ok(
    !existsSync(join(rRoot, "runs")) && !existsSync(join(rRoot, "out")),
    `(l) a Brief retired by \`${key}\` wrote a sheet`,
  );
}
// (l) show over a Brief whose structure.yaml holds a relation between three Roles exits 1 and writes no page
// (kogaki#1969).
{
  const tRoot = join(root, "three-roles");
  const tBrief = join(tRoot, "theses", "three", "brief.yaml");
  mkdirSync(dirname(tBrief), { recursive: true });
  const st = parseYaml(kTexts.structure, "structure.yaml");
  const three = st.roles.slice(0, 3).map((r) => r.id);
  st.relations = st.relations.map((r, i) => (i ? r : { ...r, between: three }));
  writeFileSync(tBrief, kTexts.brief);
  writeFileSync(join(dirname(tBrief), "structure.yaml"), stringifyYaml(st));
  writeFileSync(join(dirname(tBrief), "reader-path.yaml"), kTexts.readerPath);
  const r = sheetCmd(["show", "--brief", tBrief]);
  ok(
    r.status === 1 &&
      r.stdout === "" &&
      r.stderr.includes(JSON.stringify(st.relations[0].id)) &&
      r.stderr.includes("does not name exactly two Roles") &&
      !existsSync(join(tRoot, "runs")),
    `(l) show over a relation between three Roles did not exit 1 with the refusal and no page: ${r.status} ${r.stderr}`,
  );
}

// (n) the structures added beside the Brief (kogaki#1964): a Brief of three Legs over three Roles, with no satellites.yaml,
// then one entry before its first Leg, then two, then an entry whose `before` names no Leg.
const { ADDED_PART, FIRST_USED_LINE } = await load("src/brief-plan-playground/sheet.mjs");
const { rolesFirstUsed, satellitesPathFor } = await load("src/compose/satellites.mjs");
const nClaims = [
  { id: "c1", claim: "A cache keeps the last build's outputs." },
  { id: "c2", claim: "A key names what a cached output was built from." },
];
const nStructure = withReach(
  mintStructure({
    roles: [
      { name: "cache", context: "Where outputs are kept.", attributes: [], claims: ["c1"] },
      { name: "build", context: "One run of the compiler.", attributes: [], claims: ["c1", "c2"] },
      { name: "key", context: "What an output was built from.", attributes: [], claims: ["c2"] },
    ],
    relations: [
      { name: "keeps", between: ["cache", "build"], holds: "{cache} keeps what {build} made.", from: "c1" },
      { name: "names", between: ["build", "key"], holds: "{key} names what {build} read.", from: "c2" },
      { name: "reuse", relates: ["keeps", "names"], holds: "{cache} is reused where {key} is unchanged." },
    ],
    attains_thesis: "reuse",
  }).structure,
  nClaims,
);
const nLegs = structureLegs(nStructure, nClaims);
const nRoot = join(root, "added");
const nBrief = join(nRoot, "theses", "added", "brief.yaml");
mkdirSync(dirname(nBrief), { recursive: true });
const nTexts = writeBriefFiles(nBrief, {
  slug: "added",
  ...ADOPTED,
  thesis: "A cache is safe to reuse only where its key is unchanged.",
  strands: nClaims.map((c) => ({ id: c.id, slug: c.id })),
  structure: nStructure,
  reader_path: nLegs,
});
const SOURCES = [
  { id: "U1", cite: "coding::decision/keys-hash-inputs@0123456789ab", claim: "A key hashes every input file." },
  {
    id: "U2",
    cite: "coding::lesson/a-stale-key-reuses-a-wrong-output@ba9876543210",
    claim: "A stale key reuses a wrong output.",
  },
];
const entryOf = (id, rst, before) => {
  const structure = withReach(
    mintStructure({
      roles: [
        { name: "input", context: "A file a build reads.", attributes: [], claims: ["U1"] },
        { name: "hash", context: "A digest of the inputs.", attributes: [], claims: ["U1", "U2"] },
        { name: "output", context: "What a build writes.", attributes: [], claims: ["U2"] },
      ],
      relations: [
        { name: "digest", between: ["input", "hash"], holds: "{hash} is read over every {input}.", from: "U1" },
        { name: "stale", between: ["hash", "output"], holds: "An old {hash} returns a wrong {output}.", from: "U2" },
        { name: "why", relates: ["digest", "stale"], holds: "Only a full {hash} keeps {output} right." },
      ],
      attains_thesis: "why",
    }).structure,
    SOURCES,
  );
  return {
    id,
    rst_relation: rst,
    before,
    sources: SOURCES,
    structure,
    reader_path: structureLegs(structure, SOURCES).map((l, i) => ({ leg_id: `${id}.L${i + 1}`, relation: l.relation })),
  };
};
const unesc = (t) =>
  t
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
const nRun = (args) =>
  spawnSync(process.execPath, ["src/brief-plan-playground/sheet.mjs", ...args], {
    encoding: "utf8",
    env: { ...process.env, KOGAKI_JUDGE_CLI: join(root, "no-model") },
    timeout: 60000,
  });
const nSheet = (label, satellites) => {
  const path = satellitesPathFor(nBrief);
  if (satellites) writeFileSync(path, stringifyYaml({ satellites }));
  else rmSync(path, { force: true });
  const out = join(nRoot, `out-${label}`);
  const r = nRun(["brief", "--brief", nBrief, "--out", out]);
  const html = existsSync(join(out, "sheet.html")) ? readFileSync(join(out, "sheet.html"), "utf8") : "";
  const pre = /<summary>Graph as text<\/summary><pre>([\s\S]*?)<\/pre>/.exec(html);
  const legs = html.slice(html.indexOf("<h2>Legs</h2>"));
  const legRows = [...legs.matchAll(/<tr><td>([^<]*)<\/td>((?:<td>[\s\S]*?<\/td>)*)<\/tr>/g)].map((m) => [
    m[1],
    ...[...m[2].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) => c[1]),
  ]);
  return { r, html, graph: pre ? unesc(pre[1]) : "", legs, legRows };
};

// No file: the graph has no subgraph or dotted edge, no Added structures part, no structure column; the Roles first used.
const n0 = nSheet("none", null);
const nFirst = rolesFirstUsed(nStructure, nLegs);
ok(
  n0.r.status === 0 &&
    n0.graph.startsWith("flowchart TB\n  r_1[") &&
    !n0.graph.includes("subgraph") &&
    !n0.graph.includes(" -. ") &&
    n0.graph.includes("class c_3 apex") &&
    !n0.html.includes(`<h2>${ADDED_PART}</h2>`) &&
    !n0.legs.includes("<th>structure</th>"),
  `(n) over a Brief with no satellites.yaml the sheet draws a subgraph, an Added structures part or a structure column: ${n0.r.stderr}`,
);
ok(
  isDeepStrictEqual(
    nLegs.map((l) => l.relation),
    ["c_1", "c_2", "c_3"],
  ) &&
    isDeepStrictEqual(Object.fromEntries(nFirst), {
      [nLegs[0].leg_id]: ["r_1", "r_2"],
      [nLegs[1].leg_id]: ["r_3"],
      [nLegs[2].leg_id]: [],
    }),
  `(n) rolesFirstUsed does not give r_1 and r_2 to the first Leg, r_3 to the second and none to the third: ${JSON.stringify(Object.fromEntries(nFirst))}`,
);
ok(
  n0.legs.includes(`<p class="line">${FIRST_USED_LINE}</p>`) &&
    n0.legs.includes("<th>id</th><th>relation</th><th>text</th><th>Roles first used here</th>") &&
    isDeepStrictEqual(
      n0.legRows.map((r) => [r[0], r[r.length - 1]]),
      [
        [nLegs[0].leg_id, "cache, build"],
        [nLegs[1].leg_id, "key"],
        [nLegs[2].leg_id, ""],
      ],
    ),
  `(n) the Legs table does not name cache and build on the first Leg, key on the second and nothing on the third: ${JSON.stringify(n0.legRows)}`,
);

// One entry s_1 before the first Leg: two subgraphs, the entry's nodes prefixed, one dotted labelled edge, both apexes blue.
const n1 = nSheet("one", [entryOf("s_1", "Background", nLegs[0].leg_id)]);
const nodeIds = (g, from, to) =>
  g
    .slice(g.indexOf(from), g.indexOf(to, g.indexOf(from)))
    .split("\n")
    .map((l) => /^\s+([A-Za-z0-9_]+)\[/.exec(l))
    .filter(Boolean)
    .map((m) => m[1]);
const sNodes = nodeIds(n1.graph, "subgraph s_1", "  end");
ok(
  n1.r.status === 0 &&
    n1.graph.includes('subgraph nucleus["Brief"]') &&
    n1.graph.includes(`subgraph s_1["s_1 · Background · before ${nLegs[0].leg_id}"]`) &&
    isDeepStrictEqual(sNodes, ["s_1__r_1", "s_1__r_2", "s_1__r_3", "s_1__c_1", "s_1__c_2", "s_1__c_3"]) &&
    isDeepStrictEqual(nodeIds(n1.graph, "subgraph nucleus", "  end"), ["r_1", "r_2", "r_3", "c_1", "c_2", "c_3"]) &&
    (n1.graph.match(/ -\. /g) || []).length === 1 &&
    n1.graph.includes('  s_1__c_3 -. "Background" .-> c_3') &&
    n1.graph.includes("class c_3,s_1__c_3 apex"),
  `(n) the graph over one entry is not two subgraphs joined by one dotted Background edge between the apexes: ${n1.graph}`,
);
const nAdded = n1.html.slice(n1.html.indexOf(`<h2>${ADDED_PART}</h2>`), n1.html.indexOf("<h2>Legs</h2>"));
ok(
  JSON.stringify([...n1.html.matchAll(/<h2>([^<]*)<\/h2>/g)].map((m) => m[1])) ===
    JSON.stringify(["Thesis", "Claims", "Structure Mapping", ADDED_PART, "Legs"]) &&
    nAdded.includes(`<h3>s_1: Background, before ${nLegs[0].leg_id}</h3>`) &&
    nAdded.includes("<th>id</th><th>cite</th><th>claim</th>") &&
    SOURCES.every((u) => nAdded.includes(`<tr><td>${u.id}</td><td>${u.cite}</td><td>${u.claim}</td></tr>`)) &&
    JSON.stringify([...nAdded.matchAll(/<h4>([^<]*)<\/h4>/g)].map((m) => m[1])) ===
      JSON.stringify(["Roles", "Relations", "Higher-order relations"]) &&
    ["input", "hash", "output", "digest", "stale", "why"].every((name) => nAdded.includes(`<td>${name}</td>`)),
  "(n) the Added structures part does not hold the entry's heading, its sources with cites and claims, and its three tables",
);
ok(
  n1.legs.includes("<th>id</th><th>structure</th><th>relation</th><th>text</th><th>Roles first used here</th>") &&
    isDeepStrictEqual(
      n1.legRows.map((r) => [r[0], r[1], r[r.length - 1]]),
      [
        ["s_1.L1", "s_1 (Background)", ""],
        ["s_1.L2", "s_1 (Background)", ""],
        ["s_1.L3", "s_1 (Background)", ""],
        [nLegs[0].leg_id, "Brief", "cache, build"],
        [nLegs[1].leg_id, "Brief", "key"],
        [nLegs[2].leg_id, "Brief", ""],
      ],
    ) &&
    n1.legRows[0][2] === "digest (U1)",
  `(n) the Legs table does not list the entry's Legs first, then the Brief's: ${JSON.stringify(n1.legRows)}`,
);

// Two entries before one Leg: their Legs in the order of the file.
const n2 = nSheet("two", [
  entryOf("s_2", "Circumstance", nLegs[1].leg_id),
  entryOf("s_1", "Background", nLegs[1].leg_id),
]);
ok(
  n2.r.status === 0 &&
    isDeepStrictEqual(
      n2.legRows.map((r) => r[0]),
      [nLegs[0].leg_id, "s_2.L1", "s_2.L2", "s_2.L3", "s_1.L1", "s_1.L2", "s_1.L3", nLegs[1].leg_id, nLegs[2].leg_id],
    ) &&
    (n2.graph.match(/ -\. /g) || []).length === 2,
  `(n) two entries before one Leg are not listed in the order of the file: ${JSON.stringify(n2.legRows.map((r) => r[0]))}`,
);

// show writes the same hash with and without the file; a `before` naming no Leg is refused by both verbs, nothing written.
const nHome = join(nRoot, "runs", "brief-plan-playground", "added");
const shaOf = (label, satellites) => {
  if (satellites) writeFileSync(satellitesPathFor(nBrief), stringifyYaml({ satellites }));
  else rmSync(satellitesPathFor(nBrief), { force: true });
  rmSync(nHome, { recursive: true, force: true });
  const r = nRun(["show", "--brief", nBrief]);
  return r.status === 0 && existsSync(join(nHome, "brief.sha256"))
    ? readFileSync(join(nHome, "brief.sha256"), "utf8")
    : `${label}: ${r.stderr}`;
};
const nShaNone = shaOf("none", null);
const nShaOne = shaOf("one", [entryOf("s_1", "Background", nLegs[0].leg_id)]);
ok(
  nShaNone === nShaOne &&
    nShaNone ===
      `${createHash("sha256")
        .update(nTexts.brief + nTexts.structure + nTexts.readerPath)
        .digest("hex")}  theses/added/brief.yaml\n`,
  `(n) show's brief.sha256 differs with satellites.yaml beside the Brief: ${JSON.stringify([nShaNone, nShaOne])}`,
);
writeFileSync(satellitesPathFor(nBrief), stringifyYaml({ satellites: [entryOf("s_1", "Background", "L9")] }));
rmSync(nHome, { recursive: true, force: true });
for (const args of [
  ["show", "--brief", nBrief],
  ["brief", "--brief", nBrief, "--out", join(nRoot, "out-bad")],
]) {
  const r = nRun(args);
  ok(
    r.status === 1 && r.stderr.includes("s_1") && r.stderr.includes('"L9"'),
    `(n) ${args[0]} over an entry whose before names no Leg is not refused naming it: ${r.status} ${r.stderr}`,
  );
}
ok(!existsSync(nHome) && !existsSync(join(nRoot, "out-bad")), "(n) a refused satellites.yaml wrote a sheet");

// (o) a DocumentPlan's page (kogaki#1977, kogaki#1982): `show --plan` over three RS files, `b` as evidence to `a` and `c`
// as background to `b`, `b` read from a statement and `a` and `c` from Units, one shared Role `reader` holding `a:r_1`
// and `b:r_1`, with a model binary that fails.
const { PLAN_PARTS, TOP_NUCLEUS, SHARED_COLOURS } = await load("src/brief-plan-playground/sheet.mjs");
const oRoot = join(root, "plan");
mkdirSync(join(oRoot, "rs"), { recursive: true });
mkdirSync(join(oRoot, "document-plans"));
const oCite = (n) => `coding::lesson/${n}@${"b".repeat(64)}`;
const oRole = (id, name, words = name, source = "S1") => ({
  id,
  name,
  context: `A kind of ${name}.`,
  in: [{ source, words, attributes: [] }],
});
const oA = {
  sources: [
    { id: "S1", cite: oCite("walker_skips"), text: "A walker skips a file." },
    { id: "S2", cite: oCite("team_reads_green"), text: "A team reads green as whole." },
  ],
  roles: [oRole("r_1", "walker"), oRole("r_2", "file"), oRole("r_3", "team", "team", "S2")],
  relations: [
    { id: "c_1", name: "skips", holds: "The {r_1} skips a {r_2}.", from: ["S1"], between: ["r_1", "r_2"] },
    { id: "c_2", name: "reads", holds: "The {r_3} reads the {r_1}.", from: ["S2"], between: ["r_3", "r_1"] },
    {
      id: "c_3",
      name: "misread",
      holds: "The {r_3} trusts a {r_2} no one read.",
      from: ["S1", "S2"],
      relates: ["c_1", "c_2"],
    },
  ],
};
const oStatement = "A check runs only where it is told to look, so a skipped file stays green.";
const oB = {
  sources: [{ id: "S1", text: oStatement }],
  roles: [
    oRole("r_1", "check", "A check"),
    oRole("r_2", "place", "where it is told to look"),
    oRole("r_3", "skipped", "a skipped file"),
  ],
  relations: [
    { id: "c_1", name: "looks", holds: "The {r_1} looks only at a {r_2}.", from: ["S1"], between: ["r_1", "r_2"] },
    { id: "c_2", name: "misses", holds: "The {r_1} never sees the {r_3}.", from: ["S1"], between: ["r_1", "r_3"] },
    { id: "c_3", name: "so", holds: "Looking only there is why it misses.", from: ["S1"], relates: ["c_1", "c_2"] },
  ],
  rests_on: [oCite("scope_lesson"), oCite("walk_lesson")],
};
const oC = {
  sources: [{ id: "S1", cite: oCite("suite_budget"), text: "A suite has a budget." }],
  roles: [oRole("r_1", "suite"), oRole("r_2", "budget")],
  relations: [
    { id: "c_1", name: "bounded", holds: "The {r_1} stays under its {r_2}.", from: ["S1"], between: ["r_1", "r_2"] },
  ],
};
for (const [n, r] of [
  ["a", oA],
  ["b", oB],
  ["c", oC],
])
  writeFileSync(join(oRoot, "rs", `${n}.yaml`), stringifyYaml(r));
const oPlan = join(oRoot, "document-plans", "p.yaml");
const oReader = {
  name: "reader",
  members: [
    { rs: "a", role: "r_1" },
    { rs: "b", role: "r_1" },
  ],
};
const oPlanOf = (order, shared) =>
  stringifyYaml({
    order,
    connections: [
      { satellite: "b", relation: "evidence", nucleus: "a" },
      { satellite: order[2], relation: "background", nucleus: "b" },
    ],
    ...(shared ? { shared_roles: shared } : {}),
  });
const oFailing = join(root, "failing.sh");
writeFileSync(oFailing, "#!/bin/sh\necho called >&2\nexit 3\n", { mode: 0o755 });
const oRun = (args) =>
  spawnSync(process.execPath, ["src/brief-plan-playground/sheet.mjs", ...args], {
    encoding: "utf8",
    env: { ...process.env, KOGAKI_JUDGE_CLI: oFailing },
    timeout: 60000,
  });
const oHome = join(oRoot, "runs", "brief-plan-playground", "plan-p");
const oShow = (shared) => {
  rmSync(oHome, { recursive: true, force: true });
  writeFileSync(oPlan, oPlanOf(["a", "b", "c"], shared));
  const r = oRun(["show", "--plan", oPlan]);
  const page = existsSync(join(oHome, "sheet.html")) ? readFileSync(join(oHome, "sheet.html"), "utf8") : "";
  return { r, page };
};
const { r: o, page: oPage } = oShow([oReader]);
ok(
  o.status === 0 && o.stdout === `${pathToFileURL(join(oHome, "sheet.html")).href}\n` && o.stderr === "",
  `(o) show --plan did not exit 0 printing the page's file:// URL as its one line: ${o.status} ${o.stdout} ${o.stderr}`,
);
const oH2 = [...oPage.matchAll(/<h2>([^<]*)<\/h2>/g)].map((m) => m[1]);
ok(
  isDeepStrictEqual(oH2, ["ReaderPath", "Shared Roles", "RS files"]) &&
    isDeepStrictEqual(PLAN_PARTS, oH2) &&
    !oPage.includes("Connections"),
  `(o) the page's parts are not ReaderPath, Shared Roles, RS files in order with no Connections: ${oH2}`,
);
const oPartOf = (page, name) => {
  const at = page.indexOf(`<h2>${name}</h2>`);
  const next = PLAN_PARTS[PLAN_PARTS.indexOf(name) + 1];
  return at < 0 ? "" : page.slice(at, next ? page.indexOf(`<h2>${next}</h2>`) : undefined);
};
const oPart = (name) => oPartOf(oPage, name);
const oUnesc = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
const oGraphs = (html) => [...html.matchAll(/<pre>([\s\S]*?)<\/pre>/g)].map((m) => oUnesc(m[1]));
const oPathGraph = oGraphs(oPart("ReaderPath"))[0] || "";
const oNodes = [...oPathGraph.matchAll(/^ {2}(p\d+)\["(\d+) · ([^"]*)"\]$/gm)].map((m) => ({ id: m[1], rs: m[3] }));
const oNode = (rs) => (oNodes.find((n) => n.rs === rs) || {}).id;
const oArrows = [...oPathGraph.matchAll(/^ {2}(p\d+) -- "([^"]*)" --> (p\d+)$/gm)].map((m) => m.slice(1).join(" "));
const oMarked = [...oPathGraph.matchAll(/^ {2}class (\S+) apex$/gm)].map((m) => m[1]);
ok(
  /^flowchart LR\n/.test(oPathGraph) &&
    isDeepStrictEqual(
      oNodes.map((n) => n.rs),
      ["a", "b", "c"],
    ) &&
    isDeepStrictEqual(
      oArrows.sort(),
      [`${oNode("b")} evidence ${oNode("a")}`, `${oNode("c")} background ${oNode("b")}`].sort(),
    ) &&
    isDeepStrictEqual(oMarked, [oNode("a")]),
  `(o) the ReaderPath graph is not three nodes, b evidence to a and c background to b, a alone marked: ${oPathGraph}`,
);
const oCells = (tr) => [...tr.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
const oRowsOf = (html) =>
  [...html.matchAll(/<tr( class="([^"]*)")?>(?!<th)([\s\S]*?)<\/tr>/g)].map((m) => ({
    cls: m[2] || "",
    cells: oCells(m[3]),
  }));
const oTables = (html) =>
  html
    .split("<table>")
    .slice(1)
    .map((t) => t.slice(0, t.indexOf("</table>")));
const oHeadOf = (t) => [...t.matchAll(/<th>([^<]*)<\/th>/g)].map((m) => m[1]);
const oPathTable = oTables(oPart("ReaderPath"))[0] || "";
const oRows = oRowsOf(oPathTable);
const oByRs = (n) => oRows.find((r) => r.cells[1].replace(/ <span[\s\S]*$/, "") === n) || { cls: "", cells: [] };
ok(
  isDeepStrictEqual(oHeadOf(oPathTable), ["position", "rs", "read from", "relation", "nucleus"]) &&
    !oPage.includes("<th>apex</th>"),
  `(o) the ReaderPath table's columns are not position, rs, read from, relation, nucleus: ${oHeadOf(oPathTable)}`,
);
ok(
  oRows.length === 3 &&
    oByRs("b").cells[2] === oStatement &&
    oByRs("b").cells[3] === "evidence" &&
    oByRs("b").cells[4] === "a" &&
    oByRs("a").cells[2] === oA.sources.map((s) => s.cite).join("<br>") &&
    oByRs("a").cls.split(" ").includes("top") &&
    oByRs("a").cells[1].includes(TOP_NUCLEUS),
  `(o) the ReaderPath table does not hold three rows, b's the statement, evidence and a: ${JSON.stringify(oRows)}`,
);
const [oSharedTable, oRestTable] = oTables(oPart("Shared Roles"));
const oColour = SHARED_COLOURS[0];
const oSharedRows = oRowsOf(oSharedTable || "");
ok(
  isDeepStrictEqual(oHeadOf(oSharedTable || ""), ["shared", "rs", "id", "name", "words"]) &&
    oSharedRows.length === 2 &&
    oSharedRows.every((r) => r.cells[0].includes("reader") && r.cells[0].includes(`background:${oColour}`)) &&
    isDeepStrictEqual(
      oSharedRows.map((r) => r.cells.slice(1)),
      [
        ["a", "r_1", "walker", "walker"],
        ["b", "r_1", "check", "A check"],
      ],
    ),
  `(o) the Shared Roles table is not two rows of reader in its colour: ${JSON.stringify(oSharedRows)}`,
);
const oRest = oRowsOf(oRestTable || "").map((r) => r.cells.slice(0, 2).join(":"));
ok(
  oPart("Shared Roles").includes("<h3>Roles not shared</h3>") &&
    isDeepStrictEqual(oRest, ["a:r_2", "a:r_3", "b:r_2", "b:r_3", "c:r_1", "c:r_2"]),
  `(o) the Roles not shared table does not hold every other Role and neither member: ${oRest}`,
);
const oCard = (page, n) => {
  const files = oPartOf(page, "RS files");
  const i = ["a", "b", "c"].indexOf(n);
  const at = files.indexOf(`<h3>${i + 1} · ${n}</h3>`);
  const end = files.indexOf("</article>", at);
  return at < 0 ? "" : files.slice(at, end);
};
const oCardB = oCard(oPage, "b");
const oMarks = [
  ...oCardB.matchAll(/<mark( style="background:([^"]*)"| class="plain") title="([^"]*)">([^<]*)<sub>/g),
].map((m) => ({ colour: m[2] || null, id: m[3], words: m[4] }));
ok(
  isDeepStrictEqual(
    oMarks.map((m) => `${m.id}=${m.words}`),
    ["r_1=A check", "r_2=where it is told to look", "r_3=a skipped file"],
  ) &&
    oMarks.find((m) => m.id === "r_1").colour === oColour &&
    oMarks.filter((m) => m.colour).length === 1,
  `(o) the card of b does not mark each Role's words with its id, r_1 in reader's colour: ${JSON.stringify(oMarks)}`,
);
const oBGraph = oGraphs(oCardB)[0] || "";
const oBNodes = [...oBGraph.matchAll(/^ {2}(\w+)(\[|\(\[)"/gm)].map((m) => m[1]);
const oBShared = [...oBGraph.matchAll(/^ {2}classDef (shared\d+) fill:([^,]+),/gm)];
ok(
  isDeepStrictEqual(oBNodes, ["r_1", "r_2", "r_3", "c_1", "c_2", "c_3"]) &&
    isDeepStrictEqual(
      [...oBGraph.matchAll(/^ {2}class (\S+) apex$/gm)].map((m) => m[1]),
      ["c_3"],
    ) &&
    oBShared.length === 1 &&
    oBShared[0][2] === oColour &&
    oBGraph.includes(`  class r_1 ${oBShared[0][1]}`),
  `(o) the graph of b's card is not one node per Role and Relation, c_3 marked and r_1 in reader's colour: ${oBGraph}`,
);
const oBRelations = oTables(oCardB).find((t) => oHeadOf(t).includes("over")) || "";
ok(
  isDeepStrictEqual(oHeadOf(oBRelations), ["id", "name", "over", "holds"]) &&
    oRowsOf(oBRelations)[0].cells[2] === "r_1, r_2" &&
    oRowsOf(oBRelations)[0].cells[3] === "The {r_1} looks only at a {r_2}.",
  `(o) in the card of b, the holds of a Relation between Roles is not the file's sentence with braces: ${oBRelations}`,
);
const oWord = BRIEF_RETIRED_WORDS.find((w) => new RegExp(`\\b${w}`).test(oPage));
ok(oWord === undefined, `(o) the page carries the word ${oWord}`);
const { r: oNone, page: oNonePage } = oShow(null);
ok(
  oNone.status === 0 &&
    oRowsOf(oTables(oPartOf(oNonePage, "Shared Roles"))[0] || "").length === 0 &&
    oRowsOf(oTables(oPartOf(oNonePage, "Shared Roles"))[1] || "").length === 8 &&
    !/classDef shared/.test(oNonePage) &&
    !SHARED_COLOURS.some((c) => oNonePage.includes(c)),
  `(o) with no shared_roles the Shared Roles table holds a row or a card carries a shared colour: ${oNone.stderr}`,
);
const oUnheld = oShow([
  {
    name: "reader",
    members: [
      { rs: "a", role: "r_1" },
      { rs: "b", role: "r_9" },
    ],
  },
]).r;
ok(
  oUnheld.status === 1 &&
    oUnheld.stdout === "" &&
    oUnheld.stderr.split("\n").filter(Boolean).length === 1 &&
    oUnheld.stderr.includes("reader") &&
    oUnheld.stderr.includes("b:r_9") &&
    !existsSync(oHome),
  `(o) a shared Role naming b:r_9 did not exit 1 naming reader and b:r_9 with no page: ${oUnheld.status} ${oUnheld.stderr}`,
);
rmSync(oHome, { recursive: true, force: true });
writeFileSync(oPlan, oPlanOf(["a", "b", "d"]));
const oMissing = oRun(["show", "--plan", oPlan]);
ok(
  oMissing.status === 1 &&
    oMissing.stdout === "" &&
    oMissing.stderr.split("\n").filter(Boolean).length === 1 &&
    oMissing.stderr.includes("the RS d") &&
    !existsSync(oHome),
  `(o) a plan naming an RS with no file did not exit 1 naming it with no page: ${oMissing.status} ${oMissing.stderr}`,
);

rmSync(root, { recursive: true, force: true });
if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("check-brief-plan-playground: ok");
