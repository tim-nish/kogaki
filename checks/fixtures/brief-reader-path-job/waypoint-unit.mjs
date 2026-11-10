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
  if (isMap(w) && Object.hasOwn(w, "serves")) return { group: "shape", text: `${at} carries \`serves\` — it is derived from \`carries\`, never written` };
  const b = keysRefusal(w, ["point", "carries"], at);
  if (b) return { group: "shape", text: b };
  if (!isText(w.point)) return { group: "shape", text: `${at}'s \`point\` is empty` };
  if (!listOf(w.carries)) return { group: "carries", text: `${at}'s \`carries\` is empty` };
  const stray = w.carries.find((id) => !known.has(id));
  if (stray !== undefined) return { group: "carries", text: `${at} carries ${JSON.stringify(stray)}, which names no relation or higher-order relation of the structure` };
  const outside = w.carries.find((id) => !reached.has(id));
  if (outside !== undefined) return { group: "carries", text: `${at} carries ${JSON.stringify(outside)}, which the higher-order relation that attains the thesis does not reach — the article leaves it` };
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
  if (idle) return { group: "coverage", text: `${JSON.stringify(idle)} is carried by no Waypoint — the Waypoints together carry every relation and higher-order relation the one that attains the thesis reaches` };
  if (!ws[ws.length - 1].carries.includes(structure.attains_thesis)) {
    return { group: "coverage", text: `Waypoint ${ws.length}, the last, does not carry ${JSON.stringify(structure.attains_thesis)}, the higher-order relation that attains the thesis` };
  }
  return {};
}


// THE GROUNDED VERDICT, refused `{ group, text }` or `{}`.
export function validateGrounded(answer, waypoints) {
  const b = keysRefusal(answer, ["verdict", "sites"], "the verdict");
  if (b) return shape(b);
  if (!["fits", "does-not-fit"].includes(answer.verdict)) return shape(`\`verdict\` ${JSON.stringify(answer.verdict)} is neither \`fits\` nor \`does-not-fit\``);
  if (!Array.isArray(answer.sites)) return shape("`sites` is not a list");
  if ((answer.verdict === "fits") !== (answer.sites.length === 0)) return shape(`\`sites\` is ${answer.sites.length ? "non-empty under `fits`" : "empty under `does-not-fit`"}`);
  for (const [i, s] of answer.sites.entries()) {
    const sb = keysRefusal(s, ["waypoint", "phrase", "why"], `sites[${i}]`);
    if (sb) return shape(sb);
    const w = waypoints[Number(s.waypoint) - 1];
    if (!w) return shape(`sites[${i}] names Waypoint ${JSON.stringify(s.waypoint)}, which the input does not carry`);
    if (!isText(s.phrase) || !w.point.includes(s.phrase)) return shape(`sites[${i}]'s \`phrase\` is not words of Waypoint ${s.waypoint}'s \`point\``);
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
  return { structure, waypoints: record.waypoints.map((w, i) => ({ waypoint: i + 1, point: w.point, carries: w.carries })) };
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
  return ["THE WAYPOINTS WERE JUDGED, AND THESE ARE NOT GROUNDED IN THE RELATIONS THEY CARRY:",
    ...sites.map(siteComment),
    "Compose the Waypoints again so that every assertion a point makes is stated by a relation it carries."].join("\n");
}


// THE TWO ROWS THE RETIRED UNIT ASKED, as src/brief-workflow.json carried them before kogaki#1775.
export const WAYPOINT_ROW = Object.freeze({
  "id": "lpp_waypoints",
  "judgment_point": "THE ARTICLE'S LANGUAGE (kogaki#1417): `language` in the input is the one language the article is written in, declared by the Audience file; write every proposition you compose in it, and keep in English only the keys and ids the record's shape fixes. compose the Leg Waypoints of ONE article from the RelationalStructure in the input, `structure`, for the Persona in `persona`, ending on `thesis` in the input: an ordered list of Waypoints, each one paragraph's point. EACH WAYPOINT IS A POINT (kogaki#1326): its `point` is the proposition its paragraph makes, in the article's subject, one sentence -- it names what the paragraph establishes, never how the reader is to feel or what they are handed or receive, and it is never the Move's specialized-by-the-Leg role with the subject filled in. A WAYPOINT'S POINT IS READ ALONE (kogaki#1449): a later stage reads each waypoint's `point` by itself, never beside the other waypoints, so the point names what it refers to in full -- it carries no \"this\", \"that\", \"these\", \"those\", \"it\" or bare definite noun whose referent is another waypoint -- and uses no term that is not in its Claim's served material or the Persona's prior knowledge, since a Leg introduces no term (kogaki#1768); a point opening with one of those words, or carrying \"this <noun>\" or \"these <noun>\" whose noun is in no Claim it serves, is refused. Each Waypoint names in `carries` the ids of the relations or higher-order relations of `structure` its `point` states, one or more, and its `point` states only what those relations' `holds`, and their Roles' `context` and `attributes`, state. Every id of `structure.reach` is carried by some Waypoint, no Waypoint carries an id `structure.unreached` lists, and the last Waypoint carries `structure.attains_thesis`. Write no `serves`: it is derived from `carries`.",
  "input_shape": "ONE record AT THE RECORD'S OWN ROOT: `waypoints` -- an ordered, non-empty list of `{ \"point\": <one sentence>, \"carries\": [<one or more relation or higher-order relation ids>] }`.",
  "refusal": "a key the record or a Waypoint does not declare, or a declared key missing; a `serves` written on a Waypoint; an empty `carries`, or a `carries` id that names no relation or higher-order relation of `structure`; a `carries` id outside `structure.reach`, refused naming the Waypoint and the id; a relation or higher-order relation of `structure.reach` no Waypoint carries; and a last Waypoint not carrying `structure.attains_thesis` -- each refused naming the Waypoint or the relation. The refusal is put back into your next round verbatim with your answer.",
  "refusal_reach": {
    "shape": "part",
    "carries": "part",
    "coverage": "part"
  }
});
export const GROUNDED_ROW = Object.freeze({
  "id": "lpp_grounded",
  "judgment_point": "judge the Leg Waypoints in the input, `waypoints`, each a `point` beside the ids it `carries`, against the RelationalStructure in the input, `structure`, on ONE criterion. GROUNDED: every assertion a Waypoint's `point` makes is stated by a relation or higher-order relation it carries, read in that relation's `holds` and in its Roles' `context` and `attributes`. An assertion stated by none of them -- a comparison, a kind, a history, a quantity or a consequence no carried relation states -- is not grounded, whatever else the structure states. Answer `fits` where every Waypoint is grounded, with `sites` empty. Answer `does-not-fit` otherwise, with one site per Waypoint not grounded: its `waypoint` number, its `phrase`, the words of its `point` that assert what no carried relation states, quoted verbatim, and `why`, one sentence naming what the carried relations state instead.",
  "input_shape": "ONE record AT THE RECORD'S OWN ROOT carrying exactly these keys: `verdict` -- `fits` or `does-not-fit`; and `sites` -- a list of `{ \"waypoint\": <a Waypoint number>, \"phrase\": <words of its point, verbatim>, \"why\": <one sentence> }`, empty under `fits` and non-empty under `does-not-fit`.",
  "refusal": "a key the record or a site does not declare, or a declared key missing; a `verdict` other than `fits` or `does-not-fit`; `sites` non-empty under `fits` or empty under `does-not-fit`; and a site naming no Waypoint of the input, or whose `phrase` is not words of that Waypoint's `point`, refused naming the site. A malformed verdict is asked again with the same input.",
  "refusal_reach": {
    "shape": "part"
  }
});
