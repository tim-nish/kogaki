// The site loop of a Detached Job unit (kogaki#1642, owner decision 2026-10-31).
// A job that declares `site_retry` keeps a refused attempt's record as the unit's standing
// record and repairs it at the Leg Waypoint the refusal named, one call at a time, rather
// than asking the unit's whole call again. This file holds the loop's state and decides
// the next call; the supervisor (detached-job.mjs) spawns it and hands its answer back.
// Like the supervisor it knows nothing of Legs or Moves: the prompts and the readers of
// the answers are the declaring module's exports, named in its job table.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO } from "./run-record.mjs";

const SITE_EXPORTS = ["site_prompt_export", "site_validator_export", "suffix_prompt_export", "suffix_validator_export"];

// THE DECLARED SITE LOOP, LOADED HERE AND NOWHERE ELSE, on the validator's own terms
// (kogaki#1240): the units file names the module and its four exports. Absent, a job has no
// site loop and every refusal asks the unit's whole call again.
export async function loadSiteRetry(declared) {
  if (declared === undefined || declared === null) return null;
  const missing = ["module", ...SITE_EXPORTS].filter((k) => !declared[k]);
  if (missing.length) throw new Error(`the units file's \`site_retry\` names no ${missing.join(", ")} (kogaki#1642).`);
  const legAttempts = Number(declared.leg_attempts);
  if (!Number.isInteger(legAttempts) || legAttempts <= 0) {
    throw new Error("the units file's `site_retry` carries no positive integer `leg_attempts` (kogaki#1642).");
  }
  const modulePath = String(declared.module);
  const mod = await import(pathToFileURL(resolve(REPO, modulePath)).href);
  const [sitePrompt, siteAccept, suffixPrompt, suffixAccept] = SITE_EXPORTS.map((k) => {
    const fn = mod[String(declared[k])];
    if (typeof fn !== "function") throw new Error(`${modulePath} exports no function named ${JSON.stringify(declared[k])}.`);
    return fn;
  });
  const inputs = declared.inputs || {};
  return {
    legAttempts,
    sitePrompt: (ctx, unitId) => sitePrompt(ctx, inputs, unitId),
    siteAccept: (answer, ctx, unitId) => siteAccept(answer, ctx, inputs, unitId) || {},
    suffixPrompt: (ctx, unitId) => suffixPrompt(ctx, inputs, unitId),
    suffixAccept: (answer, ctx, unitId) => suffixAccept(answer, ctx, inputs, unitId) || {},
  };
}

// ONE UNIT'S SITE LOOP. Every method returns the next act: `{ kind: "site" | "suffix", prompt }`
// to ask, `{ kind: "judge", scope }` to judge the entries that changed, `{ done }` with the
// record every verdict passed, or `{ refused }` naming the Waypoint whose budget is spent.
// THE BUDGET BELONGS TO THE SITE: `unitAttempts` per Leg Waypoint, the unit's first call
// counting at each, and `legAttempts` over every retry of the unit together.
export class SiteLoop {
  constructor(hooks, unitId, unitAttempts) {
    this.h = hooks;
    this.unitId = unitId;
    this.unitAttempts = unitAttempts;
    this.verdicts = new Map();
    this.pending = new Map();
    this.spent = new Map();
    this.history = new Map();
    this.retries = 0;
    this.log = [];
    this.call = null;
  }

  // The refused record becomes the standing record. `failures` are `{ waypoint, refusal }`;
  // after a judgment every other Leg Waypoint passed.
  open(standing, failures, { byJudge }) {
    this.standing = standing;
    if (byJudge) for (const [i] of (standing.waypoints || []).entries()) this.verdicts.set(i + 1, "fits");
    this.refuse(failures, byJudge);
    return this.next();
  }

  refuse(failures, byJudge) {
    for (const f of failures) {
      const n = f.waypoint;
      this.verdicts.set(n, "does-not-fit");
      this.pending.set(n, f.refusal);
      this.spent.set(n, Math.max(this.spent.get(n) || 0, 1));
      this.at(n).push({ entry: (this.standing.waypoints || [])[n - 1] ?? null, refusal: f.refusal, by_judge: byJudge });
    }
  }

  at(n) {
    if (!this.history.has(n)) this.history.set(n, []);
    return this.history.get(n);
  }

  // The refusals since the last drain, for the unit's row.
  drain() {
    const out = this.log;
    this.log = [];
    return out;
  }

  // The site's first refusal and its last, so the stop names why it was opened and where it ended.
  spentRefusal(n, what, why) {
    const first = (this.at(n)[0] || {}).refusal;
    return { refused: `Waypoint ${n}: ${what} (kogaki#1642); `
      + `${first && first !== why ? `the first refusal: ${first}; ` : ""}the last refusal: ${why}` };
  }

  // THE NEXT ACT: the lowest Leg Waypoint still refused, or with none, a judgment of every
  // entry no verdict covers and the join of the entry after each.
  next() {
    if (!this.pending.size) {
      const total = this.standing.waypoints.length;
      const judge = [];
      for (let n = 1; n <= total; n++) if (!this.verdicts.has(n)) judge.push(n);
      if (!judge.length) return { done: this.standing };
      const joinOnly = judge.map((n) => n + 1).filter((m) => m <= total && !judge.includes(m));
      this.call = { kind: "judge", scope: { judge, join_only: joinOnly } };
      return this.call;
    }
    const n = Math.min(...this.pending.keys());
    const why = this.pending.get(n);
    if (this.spent.get(n) >= this.unitAttempts) return this.spentRefusal(n, `its ${this.unitAttempts} attempts are spent`, why);
    if (this.retries >= this.h.legAttempts) return this.spentRefusal(n, `the Leg's ${this.h.legAttempts} site retries are spent`, why);
    this.spent.set(n, this.spent.get(n) + 1);
    this.retries += 1;
    const ctx = { standing: this.standing, site: n, retry: this.spent.get(n) - 1, history: this.at(n) };
    this.call = { kind: "site", site: n, ctx, prompt: this.h.sitePrompt(ctx, this.unitId) };
    return this.call;
  }

  suffix(from, history) {
    const ctx = { standing: this.standing, from, history };
    this.call = { kind: "suffix", ctx, prompt: this.h.suffixPrompt(ctx, this.unitId) };
    return this.call;
  }

  // A site or suffix call's answer; `failText` where none was read, as for a call past its limit.
  answered(answer, failText = null) {
    const c = this.call;
    if (c.kind === "suffix") return this.suffixAnswered(c, answer, failText);
    const r = failText ? { error: failText } : this.h.siteAccept(answer, c.ctx, this.unitId);
    if (r.error) {
      this.log.push(r.error);
      this.at(c.site).push({ entry: answer ?? null, refusal: r.error, by_judge: false });
      this.pending.set(c.site, r.error);
      return this.next();
    }
    this.standing = r.record;
    this.pending.delete(c.site);
    for (const m of r.changed || []) this.verdicts.delete(m);
    // AN ENDPOINT MOVED: the entries after the site no longer begin where they were planned to.
    if (r.suffixFrom) {
      for (const m of [...this.verdicts.keys()]) if (m >= r.suffixFrom) this.verdicts.delete(m);
      for (const m of [...this.pending.keys()]) if (m >= r.suffixFrom) this.pending.delete(m);
      return this.suffix(r.suffixFrom, []);
    }
    if (r.sites) this.refuse(r.sites.map((s) => ({ waypoint: s.waypoint, refusal: s.why })), false);
    return this.next();
  }

  suffixAnswered(c, answer, failText) {
    const r = failText ? { error: failText } : this.h.suffixAccept(answer, c.ctx, this.unitId);
    if (r.error) {
      this.log.push(r.error);
      if (this.retries >= this.h.legAttempts) {
        return this.spentRefusal(c.ctx.from, `the Leg's ${this.h.legAttempts} site retries are spent while the entries from it were composed again`, r.error);
      }
      this.retries += 1;
      return this.suffix(c.ctx.from, [...c.ctx.history, { answer: answer ?? null, refusal: r.error }]);
    }
    this.standing = r.record;
    for (const m of r.changed || []) this.verdicts.delete(m);
    return this.next();
  }

  // The judge's verdicts on the scope: `failures` as `{ waypoint, refusal }`; `failText` where
  // the call returned none, and the same judgment is asked again inside the Leg's retries.
  judged(failures, failText = null) {
    const c = this.call;
    if (failText) {
      this.log.push(failText);
      const n = c.scope.judge[0];
      if (this.retries >= this.h.legAttempts) return this.spentRefusal(n, `the Leg's ${this.h.legAttempts} site retries are spent`, failText);
      this.retries += 1;
      return c;
    }
    const failed = new Set(failures.map((f) => f.waypoint));
    for (const n of [...c.scope.judge, ...c.scope.join_only]) if (!failed.has(n)) this.verdicts.set(n, "fits");
    for (const f of failures) this.log.push(f.refusal);
    this.refuse(failures, true);
    return this.next();
  }
}
