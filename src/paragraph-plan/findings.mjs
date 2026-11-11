// paragraph-plan/findings — a refusal read as Findings, and the Repair a retry is made under (kogaki#1815,
// owner ruling 2026-11-11: a correction is never made without the scope it took and the grounds for it).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { undeclaredKey } from "../compose.mjs";
import { BINDING_AXES, UNIT_PARAGRAPH_KEYS } from "./axes.mjs";

export const FINDING_CLASSES = ["shape", "vocabulary", "cast", "fit", "binding"];
// Widest first: where Findings disagree the widest Arm governs.
export const REPAIR_ARMS = ["change_move", "rewrite_all_points", "modify_points", "keep_points"];
// The one widening a site answer may name for itself: a `modify_points` Repair names its Waypoints, and its answer
// may rewrite every point instead; the narrowing has no Waypoints to name, so it is not offered.
export const MODEL_ARMS = ["rewrite_all_points", "modify_points"];
export const MODEL_WIDENING = { modify_points: "rewrite_all_points" };
export const PARAGRAPH_PLAN_REPAIRS_FILE = "paragraph-plan-repairs.jsonl";
export const repairsPath = (runDir) => join(runDir, PARAGRAPH_PLAN_REPAIRS_FILE);

const isMap = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const BINDING = new RegExp(`\\b(?:${BINDING_AXES.join("|")})\\b`);
const VOCABULARY = /Role id|Correspondence expression|Mapping Table|analogue/i;
const JUDGED = /the judge wrote:/;
const KEY_CARRIED = /carries `([^`]+)`/;

// One refusal line's class: a judge's line is never `shape`, since only a validator reads keys.
export function findingClass(text) {
  const t = String(text);
  if (JUDGED.test(t) && BINDING.test(t)) return "binding";
  if (!JUDGED.test(t) && KEY_CARRIED.test(t)) return "shape";
  if (VOCABULARY.test(t)) return "vocabulary";
  if (/\bcast\b/.test(t)) return "cast";
  return "fit";
}

const waypointOf = (t) => {
  const m = /\b(?:point|Waypoint) (\d+)\b/.exec(t);
  return m ? Number(m[1]) : null;
};
const evidenceOf = (t) => {
  const quoted = /"([^"]+)"/.exec(t);
  if (quoted) return quoted[1];
  const key = /`([^`]+)`/.exec(t);
  return key ? key[1] : t.trim();
};

// THE FINDINGS OF ONE REFUSAL TEXT, one per line, each with its criterion, site, evidence and class.
export function refusalFindings(text, { paragraph = null, axes = [] } = {}) {
  return String(text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^(?:Leg |Paragraph |paragraph |every )/.test(l) || l.includes(": "))
    .filter((l) => !/^[A-Z ,'—-]+:$/.test(l))
    .map((l) => {
      const cls = findingClass(l);
      const named = axes.filter((id) => new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(l));
      const key = cls === "shape" ? KEY_CARRIED.exec(l)[1] : null;
      const w = waypointOf(l);
      return {
        criterion: named.length
          ? named.join(", ")
          : JUDGED.test(l)
            ? "the judge"
            : key
              ? `the key \`${key}\``
              : "the validator",
        site: { paragraph, ...(w ? { waypoint: w } : {}) },
        evidence: key ?? evidenceOf(l),
        class: cls,
        ...(key ? { key } : {}),
      };
    });
}

// THE SHAPE FINDINGS THE PROGRAM READS FROM THE PARAGRAPH ITSELF: every key it may not carry, not only the
// first one a validator stopped at.
export function shapeFindings(entry, paragraph) {
  if (!isMap(entry)) return [];
  const out = [];
  const add = (key, why) =>
    out.push({ criterion: `the key \`${key}\``, site: { paragraph }, evidence: key, class: "shape", key, why });
  if (paragraph === 1 && Object.hasOwn(entry, "join")) add("join", "the first paragraph of a Leg carries no join");
  for (const key of ["move", "why"]) if (Object.hasOwn(entry, key)) add(key, "a paragraph carries no such key");
  let rest = entry;
  for (;;) {
    const k = undeclaredKey(rest, UNIT_PARAGRAPH_KEYS);
    if (!k) break;
    if (!out.some((f) => f.key === k)) add(k, "the paragraph does not declare it");
    rest = Object.fromEntries(Object.entries(rest).filter(([x]) => x !== k));
  }
  return out;
}

// THE ARM EACH FINDING FIXES: a `shape` Finding keeps the points, a `binding` Finding changes the Move, and the rest
// modify the points they name, or rewrite every point where one names none.
const armOf = (f) =>
  f.class === "shape"
    ? "keep_points"
    : f.class === "binding"
      ? "change_move"
      : f.site.waypoint
        ? "modify_points"
        : "rewrite_all_points";

const findingLine = (f) =>
  `the ${f.class} Finding ${f.site.paragraph ? `at paragraph ${f.site.paragraph}` : "at the Leg"}${f.site.waypoint ? `, Waypoint ${f.site.waypoint}` : ""} (${f.criterion}): ${f.evidence}`;

// THE REPAIR: the widest Arm the Findings fix, the Waypoints a `modify_points` names, and the one sentence naming the
// Finding that fixed the Arm. The narrower Findings ride the same retry.
export function repairOf(findings) {
  const fs = Array.isArray(findings) ? findings : [];
  /** @type {string[]} */
  const arms = fs.map(armOf);
  const arm = REPAIR_ARMS.find((a) => arms.includes(a)) || "rewrite_all_points";
  const fixer = fs[arms.indexOf(arm)];
  const waypoints =
    arm === "modify_points"
      ? [...new Set(fs.filter((f) => armOf(f) === "modify_points").map((f) => f.site.waypoint))].sort((a, b) => a - b)
      : null;
  return {
    arm,
    ...(waypoints ? { waypoints } : {}),
    grounds: fixer ? `${findingLine(fixer)} fixed the Arm ${arm}.` : `no Finding was read, so ${arm} was taken.`,
    findings: fs.map((f) => Object.fromEntries(Object.entries(f).filter(([k]) => k !== "why"))),
  };
}

// THE PROGRAM'S REPAIR OF THE SHAPE FINDINGS: the paragraph without the keys they name, its points untouched.
export function withoutShape(entry, findings) {
  if (!isMap(entry)) return entry;
  const keys = new Set(findings.filter((f) => f.class === "shape" && f.key).map((f) => f.key));
  return Object.fromEntries(Object.entries(entry).filter(([k]) => !keys.has(k)));
}

// One Repair record, appended to the run's repairs file before the retry it governs.
export function writeRepair(runDir, unitId, row) {
  if (!runDir) return;
  appendFileSync(repairsPath(runDir), JSON.stringify({ unit: unitId, ...row }) + "\n");
}
