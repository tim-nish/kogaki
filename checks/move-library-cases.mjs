// The cases of `checks/check-move-library.sh` on a Segment's `bind` and `edges` (kogaki#1871).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = process.cwd();
const imp = (p) => import(pathToFileURL(join(REPO, p)).href);
const { parseYaml } = await imp("src/yaml.mjs");
const { validateMoveRecord } = await imp("src/compose/moves.mjs");
const { loadSenses, loadOwnSenses, sensesText } = await imp("src/sme/edges.mjs");
const SENSES_FILE = JSON.parse(readFileSync(join(REPO, "src/sme/senses.json"), "utf8"));
const SENSES = [
  ...SENSES_FILE.senses.flatMap((s) => (s.parts.length ? s.parts.map((p) => `${s.sense}.${p.part}`) : [s.sense])),
  ...SENSES_FILE.own.map((s) => s.sense),
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
  segments: [{}, {}, {}],
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
const EDGED = { ...BARE, segments: EDGES };
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

// (c10g) a Segment that carries one of the two retired prose fields is refused naming the Segment and the field
// (kogaki#1926).
for (const [k, n] of [
  ["operation", 1],
  ["relation", 2],
]) {
  const mixed = {
    ...EDGED,
    segments: EDGED.segments.map((s, i) => (i === n - 1 ? { ...s, [k]: "says a thing." } : s)),
  };
  ok(
    refusal(mixed).includes(`\`segments\` Segment ${n} carries \`${k}\``),
    `(c10g) a Segment with bind, edges and ${k} is not refused naming the Segment and the field: ${refusal(mixed)}`,
  );
}

// (c10f) a record of one Segment with nothing bound and no Edge is refused naming Segment 1 (kogaki#1902).
const LONE = { ...EDGED, segments: [{ ...EDGED.segments[0], bind: null, edges: [] }] };
ok(
  /`segments` Segment 1 has no Bind target, carries no Edge and no Edge points to it/.test(refusal(LONE)),
  `(c10f) a lone Segment with nothing bound is not refused naming Segment 1: ${refusal(LONE)}`,
);

// (c11) every entry of the file's `own`, as `loadOwnSenses` returns it, carries exactly `sense`, `meaning`,
// `rationale` and `parts`, its `meaning` and its `rationale` each one non-empty line (kogaki#1881).
for (const [i, s] of loadOwnSenses().entries())
  ok(
    s !== null &&
      typeof s === "object" &&
      JSON.stringify(Object.keys(s).sort()) === JSON.stringify(["meaning", "parts", "rationale", "sense"]) &&
      [s.meaning, s.rationale].every((x) => typeof x === "string" && x.trim() !== "" && !x.includes("\n")),
    `(c11) \`own\` entry ${i + 1} does not carry exactly \`sense\`, \`meaning\`, \`rationale\` and \`parts\` with a one-line \`meaning\` and \`rationale\`: ${JSON.stringify(s)}`,
  );

// (c12) the text a reading is handed holds the 22 Senses of the manual and neither of Kogaki's own (kogaki#1881).
const handed = sensesText(loadSenses());
const ownNamed = SENSES_FILE.own.map((s) => s.sense).filter((n) => handed.some((l) => l.includes(n)));
ok(
  handed.length === 22 && ownNamed.length === 0,
  `(c12) the text a reading is handed holds ${handed.length} entries and names ${ownNamed.join(", ") || "no own Sense"}`,
);
// The line of Condition holds its two part words, each with what the sentence playing it does, and Condition's
// rationale after them (kogaki#1938).
const conditionLine = handed.find((l) => l.startsWith("Condition."));
ok(
  conditionLine ===
    "Condition.Cond / Condition.Consequent: one presents a situation as not yet real which, once real, would lead to the situation the other describes. Cond: this sentence is the condition. Consequent: this sentence is what follows once the condition is real. The reader sees a situation that is not yet real and what follows once it is, so they can apply it to cases the text does not name.",
  `(c12) the line of Condition a reading is handed is not its two parts, each with its text, and its rationale: ${conditionLine}`,
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
console.log(`move-library: ${cases} case(s) pass, (c10) to (c12) and (e) over ${names.length} Move file(s)`);
