// A WAYPOINT-COMPOSING JOB UNIT, AS A FIXTURE (kogaki#1775): the Brief's `compose_path` composed Waypoints through a
// Detached Job unit until kogaki#1775 derived its Legs with no Call. The supervisor's declared validator and its
// per-Round fit judge (src/workflow/detached-job.mjs) are still production code, read by `review_path` and by
// `/paragraph-plan`; these checks drive them with the unit that retired, kept here as their specimen.
import { reachOf } from "../../../src/compose/structure.mjs";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";
const shape = (text) => ({ group: "shape", text });
const listOf = (v) => (Array.isArray(v) && v.length ? v : null);
function keysRefusal(obj, keys, at) {
  if (!isMap(obj)) return `${at} is not a map`;
  const extra = Object.keys(obj).find((k) => !keys.includes(k));
  if (extra) return `${at} carries \`${extra}\`, which it does not declare — it carries ${keys.join(", ")}`;
  const missing = keys.find((k) => !(k in obj));
  return missing ? `${at} carries no \`${missing}\`` : null;
}

// ONE WAYPOINT, refused naming it or `null`.
function waypointRefusal(w, n, known, reached) {
  const at = `Waypoint ${n}`;
  if (isMap(w) && Object.hasOwn(w, "serves"))
    return { group: "shape", text: `${at} carries \`serves\` — it is derived from \`carries\`, never written` };
  const b = keysRefusal(w, ["point", "carries"], at);
  if (b) return { group: "shape", text: b };
  if (!isText(w.point)) return { group: "shape", text: `${at}'s \`point\` is empty` };
  if (!listOf(w.carries)) return { group: "carries", text: `${at}'s \`carries\` is empty` };
  const stray = w.carries.find((id) => !known.has(id));
  if (stray !== undefined)
    return {
      group: "carries",
      text: `${at} carries ${JSON.stringify(stray)}, which names no relation or higher-order relation of the structure`,
    };
  const outside = w.carries.find((id) => !reached.has(id));
  if (outside !== undefined)
    return {
      group: "carries",
      text: `${at} carries ${JSON.stringify(outside)}, which the higher-order relation that attains the thesis does not reach — the article leaves it`,
    };
  return null;
}

// THE WAYPOINT SET, refused `{ group, text }` or `{}`.
export function validateWaypoints(answer, structure) {
  const b = keysRefusal(answer, ["waypoints"], "the answer");
  if (b) return shape(b);
  const ws = listOf(answer.waypoints);
  if (!ws) return shape("the answer's `waypoints` is not a non-empty list");
  const known = new Set([...structure.relations.map((r) => r.id), ...structure.higher_order.map((h) => h.id)]);
  const reach = reachOf(structure);
  const reached = new Set(reach);
  for (const [i, w] of ws.entries()) {
    const r = waypointRefusal(w, i + 1, known, reached);
    if (r) return r;
  }
  const carried = new Set(ws.flatMap((w) => w.carries));
  const idle = reach.find((id) => !carried.has(id));
  if (idle)
    return {
      group: "coverage",
      text: `${JSON.stringify(idle)} is carried by no Waypoint — the Waypoints together carry every relation and higher-order relation the one that attains the thesis reaches`,
    };
  if (!ws[ws.length - 1].carries.includes(structure.attains_thesis)) {
    return {
      group: "coverage",
      text: `Waypoint ${ws.length}, the last, does not carry ${JSON.stringify(structure.attains_thesis)}, the higher-order relation that attains the thesis`,
    };
  }
  return {};
}

// THE GROUNDED VERDICT, refused `{ group, text }` or `{}`.
export function validateGrounded(answer, waypoints) {
  const b = keysRefusal(answer, ["verdict", "sites"], "the verdict");
  if (b) return shape(b);
  if (!["fits", "does-not-fit"].includes(answer.verdict))
    return shape(`\`verdict\` ${JSON.stringify(answer.verdict)} is neither \`fits\` nor \`does-not-fit\``);
  if (!Array.isArray(answer.sites)) return shape("`sites` is not a list");
  if ((answer.verdict === "fits") !== (answer.sites.length === 0))
    return shape(`\`sites\` is ${answer.sites.length ? "non-empty under `fits`" : "empty under `does-not-fit`"}`);
  for (const [i, s] of answer.sites.entries()) {
    const sb = keysRefusal(s, ["waypoint", "phrase", "why"], `sites[${i}]`);
    if (sb) return shape(sb);
    const w = waypoints[Number(s.waypoint) - 1];
    if (!w) return shape(`sites[${i}] names Waypoint ${JSON.stringify(s.waypoint)}, which the input does not carry`);
    if (!isText(s.phrase) || !w.point.includes(s.phrase))
      return shape(`sites[${i}]'s \`phrase\` is not words of Waypoint ${s.waypoint}'s \`point\``);
  }
  return {};
}

// A GROUNDED SITE AS THE COMMENT ITS WAYPOINT IS HANDED: the judge's text, verbatim.
export const siteComment = (s) => `Waypoint ${s.waypoint}: the judge quoted "${s.phrase}" and wrote: ${s.why}`;

// THE DECLARED PER-UNIT VALIDATOR (kogaki#1240, kogaki#1768): the `compose_path`
// job's one unit answers the `lpp_waypoints` row's record, `{ waypoints }`, and
// `validateWaypoints` (src/compose/structure.mjs) refuses it against the Brief's
// adopted structure, handed over at the job's boundary. A breach classifies the
// unit `refused` and gets the unit's own re-ask. Pure and `{error}`-returning.
export function validateFixtureWaypoints(record, inputs) {
  const v = validateWaypoints(record, inputs.structure);
  return v.text ? { error: v.text } : null;
}

// THE GROUNDED JUDGMENT, PER ROUND (kogaki#1768): once the unit's Waypoints pass
// the validator, the supervisor runs one more headless session over them with the
// `lpp_grounded` row. `inputs.promptHead` is that row rendered by `judgePrompt`
// in `compose_path`, ending at the input marker; this appends the input.
export function groundedInput(record, structure) {
  return {
    structure,
    waypoints: record.waypoints.map((w, i) => ({ waypoint: i + 1, point: w.point, carries: w.carries })),
  };
}

export function groundedPrompt(record, inputs) {
  return `${inputs.promptHead}${JSON.stringify(groundedInput(record, inputs.structure), null, 2)}`;
}

// THE JUDGE'S ANSWER, READ BACK: a verdict whose own shape is wrong is the
// judge's malformed output and is asked again; `does-not-fit` is the unit's
// schema refusal, each site the judge's own words, so the next Round composes
// the whole Waypoint set again under them.
export function groundedVerdict(answer, record) {
  const v = validateGrounded(answer, record.waypoints);
  if (v.text) return { error: v.text };
  if (answer.verdict === "fits") return {};
  return { refusal: groundedRefusal(answer.sites) };
}

export function groundedRefusal(sites) {
  return [
    "THE WAYPOINTS WERE JUDGED, AND THESE ARE NOT GROUNDED IN THE RELATIONS THEY CARRY:",
    ...sites.map(siteComment),
    "Compose the Waypoints again so that every assertion a point makes is stated by a relation it carries.",
  ].join("\n");
}
