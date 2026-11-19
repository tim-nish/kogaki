// A RECORD-COMPOSING JOB UNIT, AS A FIXTURE (kogaki#1884): the shared supervisor's declared validator and its
// per-Round fit judge (src/workflow/detached-job.mjs) are production code; these checks drive them with a unit
// whose record is `{ rows: [ { relation, roles } ] }` and holds no sentence.

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";

// ONE ROW, refused naming it, or null.
function rowRefusal(row, n) {
  const at = `Row ${n}`;
  if (!isMap(row)) return `${at} is not a map`;
  if (!isText(row.relation)) return `${at} carries no \`relation\``;
  if (!Array.isArray(row.roles) || !row.roles.length) return `${at} carries no \`roles\``;
  return null;
}

// THE DECLARED PER-UNIT VALIDATOR (kogaki#1240): `{error}`-returning, or null where the record passes.
export function validateFixtureRecord(record) {
  if (!isMap(record) || !Array.isArray(record.rows) || !record.rows.length)
    return { error: "the answer's `rows` is not a non-empty list" };
  for (const [i, row] of record.rows.entries()) {
    const r = rowRefusal(row, i + 1);
    if (r) return { error: r };
  }
  return null;
}

// THE FIXTURE JUDGE'S PROMPT: `inputs.promptHead`, then the record's rows, each by its number.
export function fixtureJudgePrompt(record, inputs) {
  const rows = record.rows.map((r, i) => ({ row: i + 1, relation: r.relation, roles: r.roles }));
  return `${inputs.promptHead}${JSON.stringify({ rows }, null, 2)}`;
}

// THE FIXTURE JUDGE'S ANSWER, READ BACK: `{ verdict, sites }`, each site `{ row, why }` naming a row by its number.
// A verdict whose own shape is wrong is malformed and asked again; `does-not-fit` is the unit's refusal.
export function fixtureJudgeVerdict(answer, record) {
  if (!isMap(answer) || !["fits", "does-not-fit"].includes(answer.verdict) || !Array.isArray(answer.sites))
    return { error: "the verdict is not `{ verdict, sites }`" };
  if ((answer.verdict === "fits") !== (answer.sites.length === 0))
    return { error: `\`sites\` is ${answer.sites.length ? "non-empty under `fits`" : "empty under `does-not-fit`"}` };
  for (const [i, s] of answer.sites.entries()) {
    if (!isMap(s) || !Number.isInteger(s.row) || !record.rows[s.row - 1] || !isText(s.why))
      return { error: `sites[${i}] does not name a row of the record by its number with a \`why\`` };
  }
  if (answer.verdict === "fits") return {};
  return {
    refusal: [
      "THE ROWS WERE JUDGED, AND THESE DO NOT FIT:",
      ...answer.sites.map((s) => `Row ${s.row}: ${s.why}`),
      "Compose the rows again.",
    ].join("\n"),
  };
}
