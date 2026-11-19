// The cases of `checks/check-move-library.sh` on a Segment's `bind` and `edges` (kogaki#1871).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = process.cwd();
const imp = (p) => import(pathToFileURL(join(REPO, p)).href);
const { parseYaml } = await imp("src/yaml.mjs");
const { validateMoveRecord, MOVE_OWN_SENSES } = await imp("src/compose/moves.mjs");
const SENSES = [
  ...JSON.parse(readFileSync(join(REPO, "src/structure-mapping-playground/pdtb3-senses.json"), "utf8")).senses.flatMap(
    (s) => (s.parts.length ? s.parts.map((p) => `${s.sense}.${p.part}`) : [s.sense]),
  ),
  ...MOVE_OWN_SENSES,
];
const fails = [];
let cases = 0;
const ok = (cond, msg) => {
  cases++;
  if (!cond) fails.push(msg);
};

// What a Move record lacks of its Bind targets and Edges, one line per Segment or Sense, or an empty list.
function edgeFailures(record) {
  const out = [];
  for (const [i, s] of (Array.isArray(record.segments) ? record.segments : []).entries()) {
    if (s === null || typeof s !== "object" || !("bind" in s) || !Array.isArray(s.edges)) {
      out.push(`Segment ${i + 1} carries no \`bind\` and \`edges\``);
      continue;
    }
    for (const e of s.edges)
      if (e && e.sense !== null && !SENSES.includes(e.sense))
        out.push(`Segment ${i + 1} keeps the Sense ${JSON.stringify(e.sense)}, which is not in the list of Senses`);
  }
  return out;
}

const LIB = join(REPO, "moves");
const BARE = {
  id: "p1",
  description: "a fixture Move.",
  before: { knowledge: "before.", question: "holds: none." },
  after: { knowledge: "after." },
  breaks: ["breaks if the point is dropped."],
  segments: [
    { operation: "states the point once, plainly." },
    { operation: "gives its reason.", relation: "gives the reason for the Segment before it" },
    { operation: "frames what follows.", relation: "sets the frame after the reason" },
  ],
  takes: [],
  leaves: [],
};
const EDGES = [
  { bind: 1, edges: [] },
  { bind: null, edges: [{ sense: "Cause.Reason", to: [1] }] },
  {
    bind: 2,
    edges: [
      { sense: "FrameSetting", to: [2] },
      { sense: null, to: [1], hypophora: true },
    ],
  },
];
const EDGED = { ...BARE, segments: BARE.segments.map((s, i) => ({ ...s, ...EDGES[i] })) };
const second = (edges) => ({ ...EDGED, segments: EDGED.segments.map((s, i) => (i === 1 ? { ...s, edges } : s)) });
const refusal = (rec) => validateMoveRecord(rec, LIB, "p1.yaml").error || "";

// (c10) a record carrying neither field is admitted by the Adapter and named by this check; a record carrying both
// with listed Senses passes both; a Sense outside the list, an Edge to a later Segment and an Edge to its own Segment
// are each named.
ok(
  refusal(BARE) === "" && edgeFailures(BARE).includes("Segment 1 carries no `bind` and `edges`"),
  `(c10a) a record carrying no \`bind\` and \`edges\` is not admitted by the Adapter and named here: ${refusal(BARE)}`,
);
ok(
  refusal(EDGED) === "" && edgeFailures(EDGED).length === 0,
  `(c10b) a record carrying both fields with listed Senses does not pass: ${[refusal(EDGED), ...edgeFailures(EDGED)].join(" | ")}`,
);
ok(
  edgeFailures(second([{ sense: "Because", to: [1] }])).includes(
    'Segment 2 keeps the Sense "Because", which is not in the list of Senses',
  ),
  "(c10c) a Sense outside the list is not named with its Segment",
);
ok(
  /`segments` Segment 2: `edges` entry 1: `to` names 3/.test(refusal(second([{ sense: "Cause.Reason", to: [3] }]))),
  `(c10d) an Edge that points to a later Segment is not refused naming the Segment: ${refusal(second([{ sense: "Cause.Reason", to: [3] }]))}`,
);
ok(
  /`segments` Segment 2: `edges` entry 1: `to` names 2/.test(refusal(second([{ sense: "Cause.Reason", to: [2] }]))),
  `(c10e) an Edge that points to its own Segment is not refused naming the Segment: ${refusal(second([{ sense: "Cause.Reason", to: [2] }]))}`,
);

// (e) every Move file under `moves/` carries both fields on every Segment, with listed Senses.
const names = readdirSync(LIB)
  .filter((n) => n.endsWith(".yaml"))
  .sort();
const lacking = names.flatMap((n) =>
  edgeFailures(parseYaml(readFileSync(join(LIB, n), "utf8"), n)).map((l) => `${n}: ${l}`),
);
ok(names.length > 0 && lacking.length === 0, `(e) ${names.length} Move file(s) under moves/: ${lacking.join(" | ")}`);

if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log(`move-library: ${cases} case(s) pass, (c10) and (e) over ${names.length} Move file(s)`);
