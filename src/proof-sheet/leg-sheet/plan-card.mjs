// proof-sheet/leg-sheet/plan-card — the ParagraphPlan's Rounds, its Rounds part and its card. Cut
// from src/proof-sheet/leg-sheet.mjs along its headed sections (kogaki#1800); the design and its
// rulings are stated at the entry's header and in the Issues each block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { REPO, relFromRepo } from "../../workflow/run-record.mjs";
import { roundsOf } from "../../workflow/call-record.mjs";
import { MOVE_RECORD_EXT } from "../../compose.mjs";
import { contentHash, planBindings, planLeg, planLegId } from "./run-data.mjs";
import {
  againstShown,
  callAnswer,
  callsBlock,
  cardWrap,
  esc,
  inputsList,
  json,
  pre,
  promptPart,
  prowBlock,
  read,
  readJson,
  segmentCount,
  stageNote,
  sub,
  subOpen,
} from "./frame.mjs";
import { legPoint } from "./move-blocks.mjs";

function planKind(text) {
  if (text.includes('"paragraph_you_must_plan"')) {
    return {
      kind: "site",
      legId: planLegId(text),
      at: Number((text.match(/"paragraph_you_must_plan": \{[^}]*?"paragraph": (\d+)/) || [])[1]),
    };
  }
  if (!text.includes('"leg_you_must_plan"')) return null;
  return { kind: "leg", legId: planLegId(text) };
}
const planTitle = (a) =>
  a.kind === "site"
    ? `ParagraphPlan, Leg ${a.legId}, the site call at paragraph ${a.at}`
    : `ParagraphPlan, Leg ${a.legId}, the plan call`;
const roundLabel = (a) => ` — Leg ${a.legId}${a.kind === "site" ? `, site retry at paragraph ${a.at}` : ""}`;

// The ParagraphPlan's Rounds, paired from its recorded calls by order of `at` (kogaki#1437):
// each planning call opens a Round, and the next judge call naming the same Leg is that Round's
// judge -- the last one, where an unreadable answer was asked again. Each Round carries its index
// among its own Leg's Rounds, which indexes that Leg's job unit's refusals.
export function planRounds(calls) {
  const sorted = calls
    .map((c, i) => [c, i])
    .sort((a, b) => String(a[0].at).localeCompare(String(b[0].at)) || a[1] - b[1])
    .map(([c]) => c);
  const rounds = [];
  const perLeg = new Map();
  for (const c of sorted) {
    const text = String(c.stdin);
    const k = planKind(text);
    if (k) {
      const nth = perLeg.get(k.legId) || 0;
      perLeg.set(k.legId, nth + 1);
      rounds.push({ ...k, legRound: nth, plan: c, judge: null });
    } else if (text.includes('"leg_you_must_judge"')) {
      const legId = planLegId(text);
      const open = [...rounds].reverse().find((x) => x.legId === legId);
      if (open) open.judge = c;
    }
  }
  return rounds;
}

// A Leg's job unit, `leg-<k>` for the Brief's k-th Leg (src/paragraph-plan.mjs `unitIdFor`).
function legUnit(r, job, legId) {
  const k = ((r.briefRecord && r.briefRecord.reader_path) || []).findIndex((l) => l && l.leg_id === legId);
  return k < 0 ? null : ((job && job.units) || []).find((u) => u && u.id === `leg-${k + 1}`) || null;
}
export const unitRefusals = (r, job, legId) => {
  const u = legUnit(r, job, legId);
  return u && Array.isArray(u.refusals) ? u.refusals : [];
};

// A Waypoint as a list item: a `point` entry as its text, a `performs` entry as its
// text in italics, as the Packet renders it (kogaki#1448), so no item is empty (kogaki#1479).
export const pwItem = (p) =>
  p && Object.hasOwn(p, "performs") ? `<li><i>${esc(p.performs)}</i></li>` : `<li>${esc((p && p.point) || "")}</li>`;

// A Round block's anchor id, inside its details as `prowBlock`'s is, so the review block's
// refused-rounds table can link to it (kogaki#1487).
export const roundId = (n, idx) => `round-${idx}-${n}`;

const paragraphsNamed = (text) =>
  [...new Set([...String(text || "").matchAll(/paragraph (\d+)/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);

// THE ROUNDS PART (kogaki#1437): one folded block per Round, in order, each holding the
// planner's record per paragraph of its Leg (a site retry's, its one paragraph, kogaki#1642), the
// judge's verdict per paragraph it judged with its `why` in full, and the refusal block the next
// Round received. No prompt is repeated: each block names where its prompts are shown, under
// Prompt or under Calls. The Leg's job record refusal for a Round is cross-checked against the
// judge's `does-not-fit` verdicts, and a mismatch is shown, never resolved.
function roundsPart(r, rounds, job, shown, judgeTitle, idx = 0) {
  if (!rounds.length) return `<p class="muted">No plan call was recorded.</p>`;
  return rounds
    .map((a, i) => {
      const n = i + 1;
      const refusal = unitRefusals(r, job, a.legId)[a.legRound];
      const plan = callAnswer(a.plan);
      const planRecord =
        plan.record && Array.isArray(plan.record.paragraphs)
          ? plan.record
          : plan.record && a.kind === "site" && Array.isArray(plan.record.paragraph_waypoints)
            ? { move: null, paragraphs: [{ ...plan.record, paragraph: a.at }] }
            : null;
      const planner = planRecord
        ? (a.kind === "site"
            ? ""
            : `<p class="meta">Leg ${esc(a.legId)} · bound Move: ${esc(planRecord.move === null ? "(none bound)" : planRecord.move || "?")}</p>`) +
          planRecord.paragraphs
            .map(
              (p, k) =>
                `<p class="meta">paragraph ${esc(p.paragraph ?? k + 1)}</p>` +
                (p.join ? `<p>join: ${esc(p.join)}</p>` : "") +
                `<ol>${(p.paragraph_waypoints || []).map(pwItem).join("")}</ol>`,
            )
            .join("")
        : `<p class="stop">(no readable record)</p>${pre(plan.record ? json(plan.record) : plan.raw)}`;

      let judge;
      let notFit = null;
      if (a.judge) {
        const v = callAnswer(a.judge);
        if (v.record && Array.isArray(v.record.verdicts)) {
          notFit = v.record.verdicts
            .filter((x) => x && x.verdict === "does-not-fit")
            .map((x) => Number(x.paragraph))
            .sort((p, q) => p - q);
          judge =
            `<ul>${v.record.verdicts.map((x) => `<li>paragraph ${esc(x && x.paragraph)}: <b>${esc(x && x.verdict)}</b> — ${esc((x && x.why) || "")}</li>`).join("")}</ul>` +
            `<p class="muted">The judge's prompt is shown under Prompt, ${esc(judgeTitle(a.judge))}.</p>`;
        } else {
          judge = `<p class="stop">(no readable record)</p>${pre(v.record ? json(v.record) : v.raw)}`;
        }
      } else if (a.plan.exit !== 0) {
        judge = `<p class="stop">No judge call: the plan call died (exit ${esc(a.plan.exit)}).</p>`;
      } else if (!planRecord) {
        judge = `<p class="stop">No judge call: the planner's answer carried no readable record.</p>`;
      } else {
        judge = `<p class="stop">No judge call: the validator refused the planner's record${refusal ? ` — ${esc(refusal)}` : ""}.</p>`;
      }

      let mismatch = "";
      if (notFit !== null) {
        const named = refusal !== undefined ? paragraphsNamed(refusal) : [];
        if (notFit.length && refusal === undefined) {
          mismatch = `The judge answered does-not-fit at paragraph ${notFit.join(", ")} of Leg ${a.legId}, and the job record holds no refusal for this round.`;
        } else if (!notFit.length && refusal !== undefined) {
          mismatch = `The judge answered fits at every paragraph of Leg ${a.legId}, and the job record holds a refusal for this round: ${refusal}`;
        } else if (notFit.length && !notFit.every((x) => named.includes(x))) {
          mismatch = `The judge answered does-not-fit at paragraph ${notFit.join(", ")} of Leg ${a.legId}; the job record's refusal for this round names paragraph ${named.join(", ") || "none"}.`;
        }
      }

      let next;
      const after = rounds.slice(i + 1).find((x) => x.legId === a.legId);
      if (after) {
        const m = againstShown(after.plan.stdin, shown);
        next = !m
          ? `<p class="stop">The next round's prompt matches no prompt shown on this card; it is shown under Calls.</p>`
          : m.inserted === null
            ? `<p class="muted">The next round's prompt is the one shown under ${esc(m.where)}, byte for byte.</p>`
            : `<p class="muted">The next round received the prompt shown under ${esc(m.where)}, with this block inserted before its input:</p>${pre(m.inserted)}`;
      } else {
        next = `<p>no further round: the job ended \`${esc(job ? job.state : "(no job record)")}\`</p>`;
      }

      const verdicts =
        notFit === null
          ? ""
          : notFit.length
            ? ` — does-not-fit at paragraph ${notFit.join(", ")}`
            : ` — fits at every paragraph${a.kind === "leg" ? "" : " judged"}`;
      const own = againstShown(a.plan.stdin, shown);
      const where = !own
        ? "Calls"
        : own.inserted === null
          ? own.where
          : `${own.where}, with the block shown under round ${i}'s "what the next round received" inserted`;
      return sub(
        `round ${n} of ${rounds.length}${roundLabel(a)}${verdicts}`,
        `<div id="${roundId(n, idx)}">` +
          `<p class="muted">The planner's prompt is shown under ${esc(where)}.</p>` +
          subOpen("the planner's record", planner) +
          subOpen("the judge's verdicts", judge) +
          (mismatch ? `<p class="stop">${esc(mismatch)}</p>` : "") +
          subOpen("what the next round received", next) +
          `</div>`,
      );
    })
    .join("");
}

// CARD 4 — PARAGRAPHPLAN. Output: the plan file, the check verdict as a line (not a card),
// and one row per original paragraph's Leg (kogaki#1784), its Waypoints counted against its bound
// Move's Segments, each row opening on the Leg's point from the Brief (kogaki#1487).
// Rounds: every Round's record, verdicts and the refusal block the next one received
// (kogaki#1437). Inputs: Brief, Move. Prompt/Calls: the plan call and the judge call, each
// titled by what it produced.
export function paragraphPlanCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const job = readJson(join(r.jobDir, "reader-path-job.json"));
  const candFile = existsSync(r.jobDir)
    ? readdirSync(r.jobDir).find((f) => /^reader-path-unit-.+\.candidate\.json$/.test(f))
    : null;
  const specFile = existsSync(r.jobDir)
    ? readdirSync(r.jobDir).find((f) => /^reader-path-unit-.+\.specialization\.json$/.test(f))
    : null;
  const verdict = specFile ? read(join(r.jobDir, specFile)) : null;
  const genCalls = r.planCalls.filter((c) => planKind(String(c.stdin)) !== null);
  const judgeCalls = r.planCalls.filter((c) => String(c.stdin).includes('"leg_you_must_judge"'));
  const { planText, pl } = planLeg(r);
  const bindings = planBindings(r);
  let verdictJson = null;
  try {
    verdictJson = verdict ? JSON.parse(verdict) : null;
  } catch {
    verdictJson = null;
  }
  const verdictLine =
    verdictJson && Array.isArray(verdictJson.verdicts)
      ? `Check verdict: ${verdictJson.verdicts.map((v) => `paragraph ${v.paragraph}: ${v.verdict}`).join("; ")}`
      : "Check verdict: (none recorded)";

  let countsTable = "";
  if (pl) {
    countsTable = pl.waypoints
      .map((w) => {
        const bnd = bindings.find((x) => x.waypoint === w.waypoint) || {};
        const segs = bnd.move ? segmentCount(read(join(r.runDir, "moves", `${bnd.move}${MOVE_RECORD_EXT}`))) : 0;
        const pws = w.paragraph_waypoints || [];
        return prowBlock(
          "planwp",
          w.waypoint,
          idx,
          `Leg ${w.waypoint} — ${w.leg_id}`,
          `<p>Point: ${esc(legPoint(r, w.waypoint))}</p>` +
            `<p class="meta">bound Move: ${esc(bnd.move || "?")} · Segments of the Move: ${segs}</p>` +
            (w.join ? `<p>join: ${esc(w.join)}</p>` : "") +
            `<ol>${pws.map(pwItem).join("")}</ol>`,
          pws.length !== segs ? "off" : "",
        );
      })
      .join("");
  }
  const output =
    (planText ? "" : stageNote(r, "paragraph-plan")) +
    `<p class="meta">${esc(rel(r.planPath))} · sha ${contentHash(planText)}</p>` +
    `<p>${esc(verdictLine)}</p>` +
    countsTable +
    sub("the file", pre(planText || "(not written)")) +
    sub(
      "bindings",
      pre(bindings.length ? json({ note: "read from the plan file's entries (kogaki#1639)", bindings }) : "(none)"),
    );

  // Every distinct planning prompt is shown once under Prompt -- the Leg call's, and each site
  // or suffix call's that is not a retry of one already shown (kogaki#1642) -- and every distinct
  // judge prompt, each Round's judge reading that Round's own record; prompts sharing one
  // instruction show it once.
  const rounds = planRounds(r.planCalls);
  const planNamed = [];
  for (const a of rounds) {
    if (againstShown(a.plan.stdin, planNamed)) continue;
    const kin = planNamed.filter(([t]) => t === planTitle(a) || t.startsWith(`${planTitle(a)}, call `)).length;
    planNamed.push([kin ? `${planTitle(a)}, call ${kin + 1}` : planTitle(a), a.plan.stdin]);
  }
  const judgeNamed = [];
  for (const a of rounds) {
    if (a.judge && !judgeNamed.some(([, x]) => x === a.judge.stdin)) {
      judgeNamed.push([
        `ParagraphPlan, the judge call${rounds.length > 1 ? `, round ${rounds.indexOf(a) + 1}` : ""}`,
        a.judge.stdin,
      ]);
    }
  }
  for (const c of judgeCalls)
    if (!judgeNamed.some(([, x]) => x === c.stdin))
      judgeNamed.push([`ParagraphPlan, the judge call ${judgeNamed.length + 1}`, c.stdin]);
  const named = [...planNamed, ...judgeNamed];
  const shown = named.map(([t, x]) => [`Prompt, ${t}`, x]);
  const judgeTitle = (c) => (judgeNamed.find(([, x]) => x === c.stdin) || ["ParagraphPlan, the judge call"])[0];
  const prompt = promptPart(named);

  const callsHtml =
    sub(
      "the plan call — rounds and refusals",
      pre(
        job
          ? json({
              state: job.state,
              units: (job.units || []).map((u) => ({
                id: u.id,
                status: u.status,
                rounds: roundsOf(u),
                refusals: u.refusals || [],
              })),
            })
          : "(none)",
      ) + callsBlock(genCalls, "plan calls", shown),
    ) + sub("the judge call", callsBlock(judgeCalls, "judge calls", shown));

  return cardWrap(
    "paragraphPlan",
    {
      output,
      rounds: roundsPart(r, rounds, job, shown, judgeTitle, idx),
      inputs: inputsList(
        [
          ["brief", rel(r.briefPath)],
          ["move", relFromRepo(join(r.runDir, "moves"), REPO)],
        ],
        idx,
      ),
      prompt,
      calls: callsHtml,
    },
    idx,
  );
}
