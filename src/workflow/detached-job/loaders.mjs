// workflow/detached-job/loaders — the declared validator, Move-fit judge and mapper a units file
// names. Cut from src/workflow/detached-job.mjs along its headed sections (kogaki#1800); the design
// and its rulings are stated at the entry and in the Issues each block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { refusalReach } from "../judge.mjs";
import { REPO } from "../run-record.mjs";

// THE DECLARED VALIDATOR, LOADED HERE AND NOWHERE ELSE (kogaki#1240). This
// module knows nothing of Candidates, Legs or Briefs (kogaki#1193's own
// framing, carried forward) -- a checker inside a job is supplied concretely
// by the supervisor or not at all (the owner's 2026-09-25 principle), so the
// units file names the module and export to `import()` at runtime rather
// than this file statically importing anything Brief-specific. THROWS a
// plain `Error` (caught by `cmdJobSupervise`'s own catch-all, below) when the
// declaration or the named export is missing -- never `fail()`, which exits
// the process directly and would skip that catch entirely, leaving no job
// record behind for a refusal this function itself can fully describe.
export async function loadReaderPathUnitValidator(declared) {
  if (!declared || typeof declared !== "object") throw new Error("the units file carries no declared validator (kogaki#1240).");
  if (!declared.module) throw new Error("the declared validator names no `module`.");
  if (!declared.export) throw new Error("the declared validator names no `export`.");
  const modulePath = String(declared.module);
  const exportName = String(declared.export);
  const mod = await import(pathToFileURL(resolve(REPO, modulePath)).href);
  const fn = mod[exportName];
  if (typeof fn !== "function") throw new Error(`${modulePath} exports no function named ${JSON.stringify(exportName)}.`);
  const inputs = declared.inputs || {};
  // THE `{error}`-RETURNING CONVENTION (carried from `validateLegs` and
  // `resolveMoveIds`, which `validateReaderPathUnit` itself calls) is
  // unwrapped HERE, once, so `classifyDetachedJobUnit` deals only in a
  // plain string-or-falsy refusal regardless of which declared validator
  // supplied it. The unit's own id rides as the third argument (kogaki#1301),
  // so a job whose units each judge a different subject can resolve which one.
  // A refusal naming its sites rides as `{ text, sites }` for a job's site loop (kogaki#1642).
  // A refusal's group and reach: kogaki#1708.
  const reaches = declared.refusal_reach;
  return (candidate, unitId) => {
    const r = fn(candidate, inputs, unitId);
    if (reaches) {
      if (!r || !(r.text || r.error)) return null;
      const g = refusalReach({ refusal_reach: reaches }, { group: r.group, text: r.text ?? r.error });
      return { text: g.text, group: g.group, reach: g.reach, ...(g.undeclared ? { undeclared: true } : {}) };
    }
    if (!r || !r.error) return null;
    return Array.isArray(r.sites) && r.sites.length ? { text: r.error, sites: r.sites } : r.error;
  };
}

// THE DECLARED MOVE-FIT JUDGE, LOADED HERE AND NOWHERE ELSE (kogaki#1307), on the
// validator's own terms: the units file names the module and its two exports, and this
// file stays ignorant of Moves and Legs. `prompt` builds the fit call's prompt from a
// unit's validated record; `verdict` reads the judge's record back and returns `{error}`
// for a record whose own shape is wrong, `{refusal, failures}` for a Leg that does not
// fit its Move, and `{}` for a Candidate that fits. Absent, a unit is one call.
export async function loadReaderPathFitJudge(declared) {
  if (declared === undefined || declared === null) return null;
  if (typeof declared !== "object" || !declared.module || !declared.prompt_export || !declared.verdict_export) {
    throw new Error("the units file's `fit_judge` names no `module`, `prompt_export` and `verdict_export` (kogaki#1307).");
  }
  const modulePath = String(declared.module);
  const mod = await import(pathToFileURL(resolve(REPO, modulePath)).href);
  const promptFn = mod[String(declared.prompt_export)];
  const verdictFn = mod[String(declared.verdict_export)];
  if (typeof promptFn !== "function") throw new Error(`${modulePath} exports no function named ${JSON.stringify(declared.prompt_export)}.`);
  if (typeof verdictFn !== "function") throw new Error(`${modulePath} exports no function named ${JSON.stringify(declared.verdict_export)}.`);
  const inputs = declared.inputs || {};
  // THE ARRAY THE JUDGE'S ANSWER CARRIES (kogaki#1768): `verdicts` unless the declaration names another.
  return {
    recordArray: typeof declared.record_array === "string" && declared.record_array ? declared.record_array : "verdicts",
    prompt: (candidate, unitId, scope) => promptFn(candidate, inputs, unitId, scope),
    verdict: (record, candidate, unitId, scope) => verdictFn(record, candidate, inputs, unitId, scope) || {},
  };
}

// THE DECLARED MAPPER (kogaki#1734), on the validator's own terms: the units file names the module, the
// class it exports and its inputs, and this file stays ignorant of structures and tables. The class answers
// `begin`, `bound`, `answered` and `grounded` with an act: `{ call }`, `{ compose }`, `{ proceed }` or `{ stopped }`.
export async function loadMapper(declared, ctx) {
  if (declared === undefined || declared === null) return null;
  if (typeof declared !== "object" || !declared.module || !declared.export) {
    throw new Error("the units file's `mapper` names no `module` and `export` (kogaki#1734).");
  }
  const mod = await import(pathToFileURL(resolve(REPO, String(declared.module))).href);
  const Mapper = mod[String(declared.export)];
  if (typeof Mapper !== "function") throw new Error(`${declared.module} exports no class named ${JSON.stringify(declared.export)}.`);
  return new Mapper(declared.inputs || {}, ctx);
}
export const MAPPER_PHASES = ["reading", "grounding"];
