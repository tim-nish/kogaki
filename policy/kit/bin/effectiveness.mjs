#!/usr/bin/env node
// The born-labeled consultation-effectiveness ledger, and its stats reader
// (kogaki#608, escalated from tsurezure-gateway#92 — the source issue is the
// design record; the owner's 2026-08-22 ruling is its acceptance frame).
//
// ONE WRITER: the kit's receipt path (`gateway-query.mjs`), which calls
// `recordConsultation` at the moment a receipt block is actually emitted —
// the one moment when request facts and outcome co-exist. The gateway is
// untouched: a transport cannot know outcomes, and adding an inbound report
// capability to the read-only surface would be a type change nobody proposed.
//
// WRITE REFUSAL IS THE VALIDITY INSTRUMENT. A row missing `outcome` or `axis`
// is refused — born labeled or not written. There is no repair pass and no
// post-hoc detector: the constraint is on what the path can PRODUCE, which is
// the shape the served surface asks remedies to take (the access.jsonl
// failure, gw#91: 28,605 rows, zero outcome fields, discovered unlabelable).
// A refusal is announced on stderr so the absence is observable, and it NEVER
// gates the receipt it measures — the kit is an enhancer, never a dependency.
//
// BOUNDED AT BIRTH (the same-change declarations the source issue requires):
//   * size-capped rotation: ROTATE_AT_BYTES below; one prior generation kept
//     as `effectiveness.jsonl.1`, the older one overwritten;
//   * declared need: the four statistics `stats` computes below, no others;
//   * removal signal: the stats report goes unread (owner-observable) — when
//     that fires, this file and its wire-in are the removal surface.
//
// MACHINE-LOCAL, never git-tracked, never stored in the answer archive:
// per-request telemetry is a machine record (the source issue's 2026-08-22
// boundary rule). The path is resolved here and nowhere else; the env
// override exists for tests, not for configuration drift.

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const ROTATE_AT_BYTES = 5_000_000;

export function ledgerPath() {
  return process.env.TSUREZURE_EFFECTIVENESS_PATH
    ?? join(homedir(), ".tsurezure", "effectiveness.jsonl");
}

// The outcome families the statistics are defined over — a row outside them
// cannot serve the statistics and is refused at write time. `uncovered-after-N`
// is a family, not a literal: receipts carry the count the transport emitted
// (`uncovered-after-2-framings`), and the token is stored as given, bucketed
// by prefix. `not-applied` is the source schema's fourth value: a consult
// whose answer was never brought to bear on the act.
const OUTCOME_FAMILIES = [
  /^discriminating$/,
  /^covered-after-reframing$/,
  /^uncovered-after-/,
  /^not-applied$/,
];
export function outcomeFamily(token) {
  if (OUTCOME_FAMILIES[0].test(token)) return "discriminating";
  if (OUTCOME_FAMILIES[1].test(token)) return "covered-after-reframing";
  if (OUTCOME_FAMILIES[2].test(token)) return "uncovered";
  if (OUTCOME_FAMILIES[3].test(token)) return "not-applied";
  return null;
}

// Validates, rotates, appends. Throws with the refusal reason — the CALLER
// (the receipt path) turns that into one stderr line and proceeds, because
// the ledger never gates the emission it measures.
export function recordConsultation({ ts, consumer, request_ids, tool, pin, axis, queries, outcome, act }) {
  if (typeof outcome !== "string" || !outcome.trim() || outcomeFamily(outcome.trim()) === null)
    throw new Error(
      `row refused: \`outcome\` is ${JSON.stringify(outcome)} — a row is born labeled or not ` +
        "written, and the label must serve the four statistics " +
        "(discriminating | covered-after-reframing | uncovered-after-N | not-applied)",
    );
  if (typeof axis !== "string" || !axis.trim())
    throw new Error(
      `row refused: \`axis\` is ${JSON.stringify(axis)} — a row is born labeled or not written; ` +
        "the axis token rides the framing (kogaki#604) and the row carries the " +
        "same framing's axis whose request_id and outcome it records",
    );
  if (typeof consumer !== "string" || !consumer.trim())
    throw new Error("row refused: `consumer` is required");
  if (!Array.isArray(request_ids) || request_ids.length === 0)
    throw new Error("row refused: `request_ids` must name every gateway call the consultation made");
  const row = {
    ts: ts ?? new Date().toISOString(),
    consumer: consumer.trim(),
    request_ids,
    tool: tool ?? null,
    pin: pin ?? null,
    axis: axis.trim(),
    queries: Number.isInteger(queries) && queries > 0 ? queries : request_ids.length,
    outcome: outcome.trim(),
    // The consuming act's carrier (issue/PR#), when the caller declared one.
    // Deliberately NOT in the refusal set: the source schema's refusal names
    // `outcome` and `axis` only, and an act is not always known at emission.
    act: typeof act === "string" && act.trim() ? act.trim() : null,
  };
  const path = ledgerPath();
  mkdirSync(dirname(path), { recursive: true });
  // Rotation before the append, so the cap bounds the live file rather than
  // being a threshold someone reads about after it is passed.
  try {
    if (existsSync(path) && statSync(path).size >= ROTATE_AT_BYTES) {
      renameSync(path, `${path}.1`);
    }
  } catch {
    // A failed rotation loses boundedness, never the row: the append below
    // still lands, and the next write retries the rotation.
  }
  appendFileSync(path, `${JSON.stringify(row)}\n`);
  return row;
}

// --- the four statistics, computable from row 1 ------------------------------
// Defined WITH the schema and shipped in the same act — no statistic is
// promised that this subcommand does not compute, and none is computed that
// the source issue did not declare.
export function computeStats(rows) {
  const applied = rows.filter((r) => outcomeFamily(r.outcome) !== "not-applied");
  const byFamily = (set) => {
    const out = { discriminating: 0, "covered-after-reframing": 0, uncovered: 0 };
    for (const r of set) {
      const f = outcomeFamily(r.outcome);
      if (f in out) out[f] += 1;
    }
    return out;
  };
  const rate = (n, d) => (d === 0 ? null : n / d);
  const group = (set, key) => {
    const m = new Map();
    for (const r of set) {
      const k = key(r) ?? "(none)";
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    }
    return m;
  };
  const isoWeek = (ts) => {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "(invalid ts)";
    const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dow = day.getUTCDay() || 7;
    day.setUTCDate(day.getUTCDate() + 4 - dow);
    const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((day - yearStart) / 86_400_000 + 1) / 7);
    return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  };
  // 1. Effectiveness rate — share of consultations with outcome=discriminating,
  //    by consumer / tool / axis / week.
  const effectivenessBy = {};
  for (const [name, key] of [
    ["consumer", (r) => r.consumer],
    ["tool", (r) => r.tool],
    ["axis", (r) => r.axis],
    ["week", (r) => isoWeek(r.ts)],
  ]) {
    effectivenessBy[name] = Object.fromEntries(
      [...group(applied, key)].map(([k, set]) => {
        const f = byFamily(set);
        return [k, { n: set.length, discriminating: f.discriminating, rate: rate(f.discriminating, set.length) }];
      }),
    );
  }
  const total = byFamily(applied);
  // 2. Re-framing yield — covered-after-reframing ÷ (covered-after-reframing +
  //    uncovered): does the second framing pay?
  const reframingYield = rate(
    total["covered-after-reframing"],
    total["covered-after-reframing"] + total.uncovered,
  );
  // 3. Axis hit distribution — which axis discriminates. The hub-side join to
  //    the incident records (product-lab#174) is the hub's own read over these
  //    rows; this reader renders the kit-side half.
  const axisHits = Object.fromEntries(
    [...group(applied, (r) => r.axis)].map(([k, set]) => {
      const f = byFamily(set);
      return [k, { n: set.length, discriminating: f.discriminating }];
    }),
  );
  // 4. Miss rate — uncovered-after-N share: the facet-extension evidence channel.
  return {
    rows: rows.length,
    applied: applied.length,
    "not-applied": rows.length - applied.length,
    effectiveness_rate: { overall: rate(total.discriminating, applied.length), by: effectivenessBy },
    reframing_yield: reframingYield,
    axis_hit_distribution: axisHits,
    miss_rate: rate(total.uncovered, applied.length),
  };
}

export function readLedger(path = ledgerPath()) {
  if (!existsSync(path)) return [];
  const rows = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      // A malformed line cannot exist through the one writer; a hand-edited
      // one is skipped rather than crashing the reader.
    }
  }
  return rows;
}

// --- CLI ---------------------------------------------------------------------
function main(argv) {
  const cmd = argv[0];
  if (cmd === "stats") {
    const rows = readLedger();
    const stats = computeStats(rows);
    console.log(JSON.stringify(stats, null, 2));
    if (rows.length === 0) {
      console.error(`(ledger empty or absent at ${ledgerPath()} — statistics are defined from row 1; ` +
        "zeros above are readings over an empty ledger, not placeholders)");
    }
    return 0;
  }
  if (cmd === "--self-test") return selfTest();
  console.error("usage: effectiveness.mjs stats | --self-test");
  return 2;
}

// --- fixture pass -------------------------------------------------------------
// Same arrangement as gateway-query.mjs's own: pure functions exercised against
// synthetic rows, no filesystem beyond a scratch ledger under $TMPDIR.
function selfTest() {
  const failures = [];
  const ok = (name, f) => {
    let r;
    try { r = f(); } catch (e) { r = `THREW: ${e.message}`; }
    if (r !== true) failures.push(`${name}${typeof r === "string" ? ` — ${r}` : ""}`);
  };
  const tmp = join(process.env.TMPDIR ?? "/tmp", `effectiveness-self-test-${process.pid}.jsonl`);
  process.env.TSUREZURE_EFFECTIVENESS_PATH = tmp;
  const base = {
    consumer: "kogaki", request_ids: ["r-1"], tool: "policy_lookup",
    pin: "product-lab@abc", axis: "subject", queries: 1, outcome: "discriminating",
    act: "kogaki#608", ts: "2026-08-22T00:00:00Z",
  };
  const refuses = (row, needle) => {
    try { recordConsultation(row); return `composed a row it owed a refusal: ${JSON.stringify(row)}`; }
    catch (e) { return e.message.includes(needle) || `wrong refusal: ${e.message}`; }
  };
  // AC 1 — a labeled row is written, complete, at the declared path.
  ok("a labeled row is appended with every schema field", () => {
    const row = recordConsultation(base);
    const read = readLedger(tmp);
    return read.length === 1 && read[0].axis === "subject" && read[0].outcome === "discriminating" &&
      read[0].act === "kogaki#608" && read[0].queries === 1 && row.consumer === "kogaki";
  });
  // AC 2 — born labeled or not written; the refusal is the instrument.
  ok("a row missing outcome is refused", () => refuses({ ...base, outcome: undefined }, "`outcome`"));
  ok("a row with an outcome outside the four families is refused",
    () => refuses({ ...base, outcome: "seemed-fine" }, "born labeled"));
  ok("a row missing axis is refused", () => refuses({ ...base, axis: "  " }, "`axis`"));
  ok("an uncovered-after-N token is admitted as its family",
    () => outcomeFamily("uncovered-after-2-framings") === "uncovered");
  ok("a refusal writes nothing", () => readLedger(tmp).length === 1);
  ok("act is nullable, never refused", () => recordConsultation({ ...base, act: undefined }).act === null);
  // AC 4 — the four statistics, from a synthetic ledger.
  const rows = [
    { ...base, outcome: "discriminating", axis: "subject", ts: "2026-08-17T00:00:00Z" },
    { ...base, outcome: "covered-after-reframing", axis: "conduct", queries: 2 },
    { ...base, outcome: "uncovered-after-2-framings", axis: "conduct", queries: 2 },
    { ...base, outcome: "not-applied", axis: "subject" },
  ];
  const s = computeStats(rows);
  ok("effectiveness rate excludes not-applied from its denominator",
    () => s.applied === 3 && s.effectiveness_rate.overall === 1 / 3);
  ok("effectiveness rate is grouped by consumer, tool, axis and week", () =>
    ["consumer", "tool", "axis", "week"].every((k) => k in s.effectiveness_rate.by) &&
    s.effectiveness_rate.by.week["2026-W34"].discriminating === 1);
  ok("re-framing yield is covered ÷ (covered + uncovered)", () => s.reframing_yield === 1 / 2);
  ok("axis hit distribution counts discriminating per axis", () =>
    s.axis_hit_distribution.subject.discriminating === 1 &&
    s.axis_hit_distribution.conduct.discriminating === 0);
  ok("miss rate is the uncovered share of applied rows", () => s.miss_rate === 1 / 3);
  ok("an empty ledger yields defined (null-rate) statistics from row 0", () => {
    const empty = computeStats([]);
    return empty.rows === 0 && empty.effectiveness_rate.overall === null && empty.miss_rate === null;
  });
  // AC 3 — rotation at the cap: one prior generation kept.
  ok("the ledger rotates at the byte cap before appending", () => {
    const pad = "x".repeat(1024);
    appendFileSync(tmp, `${JSON.stringify({ ...base, pad })}\n`.repeat(Math.ceil(ROTATE_AT_BYTES / 1100)));
    recordConsultation(base);
    return existsSync(`${tmp}.1`) && statSync(tmp).size < ROTATE_AT_BYTES;
  });
  try { unlinkSync(tmp); unlinkSync(`${tmp}.1`); } catch {}
  if (failures.length) {
    console.log("FAIL effectiveness-ledger fixtures:");
    for (const f of failures) console.log(`  ${f}`);
    return 1;
  }
  console.log("fixture pass: 14/14 effectiveness-ledger cases (a labeled row lands complete; " +
    "outcome and axis refusals fire and write nothing; the outcome vocabulary is the four " +
    "families and uncovered-after-N is a family, not a literal; act stays nullable; the four " +
    "statistics compute from a synthetic ledger with not-applied excluded from denominators; " +
    "an empty ledger reads as null rates, never invented zeros; rotation caps the live file " +
    "keeping one prior generation)");
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
