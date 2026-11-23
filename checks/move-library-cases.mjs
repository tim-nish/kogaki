// The cases of `checks/check-move-library.sh` on a Segment's `bind` and `edges` (kogaki#1871) and on its `domain`
// (kogaki#1946).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = process.cwd();
const imp = (p) => import(pathToFileURL(join(REPO, p)).href);
const { parseYaml } = await imp("src/yaml.mjs");
const { validateMoveRecord, SEGMENT_DOMAINS } = await imp("src/compose/moves.mjs");
const { HYPOPHORA_KINDS } = await imp("src/compose/record.mjs");
const { loadMoveContracts } = await imp("src/compose.mjs");
const { bindMoveInput } = await imp("src/structure-mapping-playground/short.mjs");
const { fittedSegments } = await imp("src/paragraph-plan/move-choice.mjs");
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
      { sense: null, to: [1], hypophora: "answer" },
    ],
  },
];
const EDGED = { ...BARE, segments: EDGES };
const second = (edges) => ({ ...EDGED, segments: EDGED.segments.map((s, i) => (i === 1 ? { ...s, edges } : s)) });
const refusal = (rec) => validateMoveRecord(rec, LIB, "p1.yaml").error || "";
// EDGED with `domain` on every Segment (kogaki#1946), and the same record with Segment `n` changed.
const VALUES = ["neither", "both", "apart"];
const valuedSegment = (s, i) => ({ bind: s.bind, domain: VALUES[i], edges: s.edges });
const VALUED = { ...EDGED, segments: EDGES.map(valuedSegment) };
const valuedWith = (n, change) =>
  refusal({ ...VALUED, segments: VALUED.segments.map((s, i) => (i === n - 1 ? change(s) : s)) });
const without = (s, ...keys) => Object.fromEntries(Object.entries(s).filter(([k]) => !keys.includes(k)));

// (c10) a record carrying neither field is admitted by the Adapter and named by this check; a record carrying both
// with listed Senses passes both; a Sense outside the list, an Edge to a later Segment and an Edge to its own Segment
// are each named.
ok(
  refusal(BARE) === "" && edgeFailures(BARE).includes("Segment 1 carries no `bind` and `edges`"),
  `(c10a) a record carrying no \`bind\` and \`edges\` is not admitted by the Adapter and named here: ${refusal(BARE)}`,
);
// The same record with `domain` on every Segment passes too, and the record the Adapter returns holds it on each
// Segment (kogaki#1946).
const returned = validateMoveRecord(VALUED, LIB, "p1.yaml");
// Inside (c10b) (kogaki#1950): an Edge may carry Hypophora of the kind `question` as of the kind `answer`, with no
// Sense, and one that carries `true`, as a Move file written before did, is refused naming the two kinds.
const asks = refusal(second([{ sense: null, to: [1], hypophora: "question" }]));
const olden = refusal(second([{ sense: null, to: [1], hypophora: true }]));
ok(
  refusal(EDGED) === "" &&
    edgeFailures(EDGED).length === 0 &&
    asks === "" &&
    olden ===
      'move "p1" (p1.yaml): `segments` Segment 2: `edges` entry 1: `hypophora` is true — it is one of `answer`, `question`' &&
    !returned.error &&
    JSON.stringify(returned.segments) === JSON.stringify(EDGES.map(valuedSegment)),
  `(c10b) a record carrying both fields with listed Senses, or one carrying \`domain\` beside them, does not pass and come back whole, or an Edge's kind of Hypophora is not held to \`answer\` and \`question\`: ${[refusal(EDGED), ...edgeFailures(EDGED), asks || "question admitted", olden || "true admitted", returned.error || JSON.stringify(returned.segments)].join(" | ")}`,
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
// (kogaki#1926), and so is the same Segment carrying `manner` (kogaki#1940).
const carrying = (k, n) =>
  refusal({ ...EDGED, segments: EDGED.segments.map((s, i) => (i === n - 1 ? { ...s, [k]: "says a thing." } : s)) });
// Inside the same two cases (kogaki#1946), on that Segment of a record carrying `domain`: a value outside its set, and
// no `domain` while the other Segments carry one, are each refused naming the Move and the Segment.
for (const [k, n] of [
  ["operation", 1],
  ["relation", 2],
]) {
  const valued = [
    [
      valuedWith(n, (s) => ({ ...s, domain: "generic" })),
      `move "p1" (p1.yaml): \`segments\` Segment ${n}: \`domain\` is "generic" — it is one of \`own\`, \`apart\`, \`both\`, \`neither\``,
    ],
    [
      valuedWith(n, (s) => without(s, "domain")),
      `move "p1" (p1.yaml): \`segments\` Segment ${n} carries no \`domain\`, and Segment ${n === 1 ? 2 : 1} carries one — a record carries \`domain\` on every Segment or on none`,
    ],
  ];
  ok(
    carrying(k, n).includes(`\`segments\` Segment ${n} carries \`${k}\``) &&
      carrying("manner", n).includes(`\`segments\` Segment ${n} carries \`manner\``) &&
      valued.every(([got, want]) => got === want),
    `(c10g) a Segment with bind, edges and ${k}, or with manner, is not refused naming the Segment and the field, or a refusal on \`domain\` is not its sentence: ${[carrying(k, n), carrying("manner", n), ...valued.filter(([got, want]) => got !== want).map(([got]) => got || "admitted")].join(" | ")}`,
  );
}

// (c10f) a record of one Segment with nothing bound and no Edge is refused naming Segment 1 (kogaki#1902). Inside it
// (kogaki#1946): a later Segment with nothing bound that carries no Edge is admitted where a later Segment's Edge
// points to it, and refused naming it where none does.
const LONE = { ...EDGED, segments: [{ ...EDGED.segments[0], bind: null, edges: [] }] };
const POINTED = second([]);
const UNPOINTED = {
  ...EDGED,
  segments: EDGED.segments.map((s, i) => (i === 1 ? { ...s, edges: [] } : i === 2 ? { ...s, edges: [s.edges[1]] } : s)),
};
ok(
  /`segments` Segment 1 has no Bind target, carries no Edge and no Edge points to it/.test(refusal(LONE)) &&
    refusal(POINTED) === "" &&
    /`segments` Segment 2 has no Bind target, carries no Edge and no Edge points to it/.test(refusal(UNPOINTED)),
  `(c10f) a lone Segment with nothing bound is not refused naming Segment 1, or a later Segment that carries no Edge is not admitted where an Edge points to it and refused where none does: ${[refusal(LONE), refusal(POINTED) || "admitted", refusal(UNPOINTED) || "admitted"].join(" | ")}`,
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

// (c12) the text a reading is handed holds the 21 Senses of the list, Manner not among them (kogaki#1950), and neither
// of Kogaki's own (kogaki#1881).
const handed = sensesText(loadSenses());
const ownNamed = SENSES_FILE.own.map((s) => s.sense).filter((n) => handed.some((l) => l.includes(n)));
ok(
  handed.length === 21 &&
    !handed.some((l) => l.startsWith("Manner")) &&
    ownNamed.length === 0 &&
    JSON.stringify(Object.keys(SENSES_FILE.hypophora)) === JSON.stringify(HYPOPHORA_KINDS) &&
    HYPOPHORA_KINDS.every((k) =>
      [SENSES_FILE.hypophora[k].meaning, SENSES_FILE.hypophora[k].rationale].every(
        (x) => typeof x === "string" && x.trim() !== "" && !x.includes("\n"),
      ),
    ),
  `(c12) the text a reading is handed holds ${handed.length} entries, ${handed.some((l) => l.startsWith("Manner")) ? "Manner among them, " : ""}and names ${ownNamed.join(", ") || "no own Sense"}; the kinds of Hypophora the file holds: ${Object.keys(SENSES_FILE.hypophora).join(", ")}`,
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
// Inside (e) (kogaki#1946): every Move file carries `domain` on every Segment, written after `bind` and before
// `edges`; and over the library as the Adapter loads it, neither the input of the short Trial's `bind` stage nor the
// Segments the fitting writes into a plan hold the key.
const VALUED_KEYS = JSON.stringify(["bind", "domain", "edges"]);
const misvalued = names.flatMap((n) =>
  parseYaml(readFileSync(join(LIB, n), "utf8"), n).segments.flatMap((s, i) =>
    JSON.stringify(Object.keys(s)) === VALUED_KEYS
      ? []
      : [`${n}: Segment ${i + 1} carries ${Object.keys(s).join(", ")}`],
  ),
);
const loaded = loadMoveContracts(LIB).moves || [];
const unloaded = loaded.flatMap((m) =>
  m.segments.flatMap((s, i) =>
    SEGMENT_DOMAINS.includes(s.domain) ? [] : [`${m.id}: Segment ${i + 1} is loaded as ${JSON.stringify(s)}`],
  ),
);
const holding = (value) => ["domain"].filter((k) => JSON.stringify(value).includes(`"${k}"`));
const bindInput = bindMoveInput({}, { reader: "a reader.", prior_knowledge: "none." }, loaded, LIB);
const planned = loaded.map((m) => fittedSegments(m, { 1: 1, 2: 2, 3: 3 }));
ok(
  names.length > 0 &&
    lacking.length === 0 &&
    misvalued.length === 0 &&
    loaded.length === names.length &&
    unloaded.length === 0 &&
    bindInput.moves.length === names.length &&
    holding(bindInput).length === 0 &&
    holding(planned).length === 0,
  `(e) ${names.length} Move file(s) under moves/: ${[...lacking, ...misvalued, ...unloaded, ...holding(bindInput).map((k) => `the bind stage's input holds ${k}`), ...holding(planned).map((k) => `the plan's Segments hold ${k}`)].join(" | ")}`,
);

if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log(`move-library: ${cases} case(s) pass, (c10) to (c12) and (e) over ${names.length} Move file(s)`);
