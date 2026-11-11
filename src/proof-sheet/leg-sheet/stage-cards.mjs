// proof-sheet/leg-sheet/stage-cards — the run-conditions line, the comparison table, the Segments
// table and the stage cards. Cut from src/proof-sheet/leg-sheet.mjs along its headed sections
// (kogaki#1800); the design and its rulings are stated at the entry's header and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES, and the spec each one names:
//   The paragraph unit
//       passages/FORMAT.md
import { join, resolve } from "node:path";
import { settingValue } from "../../workflow/judge.mjs";
import { REPO, relFromRepo } from "../../workflow/run-record.mjs";
import { roundsFileIn, roundsOf } from "../../workflow/call-record.mjs";
import { EXTRACTION_TABLE } from "../extract.mjs";
import { MOVE_RECORD_EXT } from "../../compose.mjs";
import { contentHash, editedSegments, extractionParagraphs, packetPathOf, planBindings, planLeg } from "./run-data.mjs";
import {
  COPY_BUTTON,
  anchorId,
  briefAnchored,
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
  readCalls,
  readJson,
  stageNote,
  sub,
} from "./frame.mjs";
import { planRounds, pwItem, roundId, unitRefusals } from "./plan-card.mjs";
import {
  legPoint,
  moveBreaks,
  moveConstraintLines,
  moveDescription,
  moveStates,
  moveStatesBreaks,
  sourceBadge,
} from "./move-blocks.mjs";

// THE RUN-CONDITIONS LINE: the Audience, the settings, the model command and the run
// directory, each with its path and content hash. The Audience's text and the settings'
// values open from here -- and nowhere else (kogaki#1401).
export function runConditionsLine(r) {
  const relRun = relFromRepo(r.runDir, REPO);
  // THE AUDIENCE READS FROM THE RECORD ALONE (kogaki#1396): `run.json`'s own `audience` is
  // the path the run resolved and used, once, at its start. A record without it (an older
  // run, from before the run named the path it used) shows the cell as unreadable rather
  // than resolving a substitute from the live setting, which could have moved since.
  const audienceRel = r.run.audience || null;
  const audiencePath = audienceRel ? resolve(REPO, audienceRel) : null;
  const audience = audiencePath ? read(audiencePath) : null;
  const audienceLabel = audiencePath
    ? relFromRepo(audiencePath, REPO)
    : "(unreadable: the run record names no audience)";

  const settingsPath = resolve(REPO, "kogaki.settings.json");
  const table = readJson(EXTRACTION_TABLE);
  const settingsText = [
    `Round bound (brief.unit_rounds): ${table ? settingValue(table.job.unit_rounds) : "(unreadable)"}`,
    `call limit, seconds (brief.call_limit_s): ${table ? settingValue(table.job.call_limit_s) : "(unreadable)"}`,
    `audience file (brief.audience_file): ${settingValue({ setting: "brief.audience_file" })}`,
  ].join("\n");

  const modelCommand = r.run.model_command || "(not recorded)";
  const runText = read(join(r.runDir, "run.json"));

  return (
    `<div class="run-conditions" id="run-conditions"><b>Run conditions</b><ul>` +
    `<li>Audience: <span class="meta">${esc(audienceLabel)} · sha ${contentHash(audience)}</span> ${sub("Audience text", pre(audience || "(cannot be read)"))}</li>` +
    `<li>Settings: <span class="meta">${esc(relFromRepo(settingsPath, REPO))} · sha ${contentHash(settingsText)}</span> ${sub("Settings values", pre(settingsText))}</li>` +
    `<li>Model command: <span class="meta">${esc(modelCommand)} · sha ${contentHash(modelCommand)}</span></li>` +
    `<li>Run directory: <span class="meta">${esc(relRun)} · sha ${contentHash(runText)}</span></li>` +
    `</ul></div>`
  );
}

// THE ORIGINAL-BESIDE-WRITTEN TABLE: one row per paragraph, original paragraph beside written Leg
// (one Brief Leg is one paragraph, kogaki#1784; the original is cut as The paragraph unit cuts it).
// Every written-paragraph cell links down to that paragraph's own row in each per-paragraph
// card -- Extraction, Move, ParagraphPlan, Packet and Draft -- so a reader reading the problem
// in a row can reach its evidence without reconstructing the pipeline (kogaki#1402).
export function comparisonTable(
  r,
  idx,
  { sectionPath, written, writtenParas, draftStop, original = "Original Paragraph" },
) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const n = Math.max(r.paragraphs.length, writtenParas.length);
  const anchorLinks = (i) =>
    `<p class="anchors">` +
    [
      ["Extraction", "extraction"],
      ["Move", "move"],
      ["ParagraphPlan", "planwp"],
      ["Packet", "packetwp"],
      ["Draft", "draft"],
    ]
      .map(([label, card]) => `<a href="#${anchorId(card, i, idx)}">${esc(label)}</a>`)
      .join(" · ") +
    `</p>`;
  const { planText, pl } = planLeg(r);
  const pwCell = (i) => {
    const w = pl && (pl.waypoints || []).find((x) => x.waypoint === i + 1);
    return w ? `<ol>${(w.paragraph_waypoints || []).map(pwItem).join("")}</ol>` : "";
  };
  const pairs = [];
  for (let i = 0; i < n; i++) {
    const writtenCell = written
      ? `${esc(writtenParas[i] || "")}${anchorLinks(i + 1)}`
      : i === 0
        ? `<span class="stop">${esc(draftStop || "not written")}</span>`
        : "";
    pairs.push(
      `<tr><th>${i + 1}</th><td>${esc(r.paragraphs[i] || "")}</td><td class="pws">${pwCell(i)}</td><td>${writtenCell}</td></tr>`,
    );
  }
  return (
    `<table class="pair" id="comparison-${idx}"><thead><tr><th></th><th>${esc(original)} <span class="meta">${esc(rel(join(r.runDir, r.legCopy || "leg.md")))} · sha ${contentHash(r.legText)}</span></th>` +
    `<th>Waypoints <span class="meta">${esc(rel(r.planPath))} · sha ${contentHash(planText)}</span></th>` +
    `<th>Written Leg <span class="meta">${esc(rel(sectionPath))} · sha ${contentHash(written)}</span></th></tr></thead>` +
    `<tbody>${pairs.join("")}</tbody></table>`
  );
}

// CARD 1 — EXTRACTION. Output: one collapsible block per paragraph, closed by default except
// paragraph 1 (kogaki#1410, owner 2026-10-17: "having all of them expanded makes navigation
// cumbersome"), each with its path and hash, opening on its Segments table, then its Move's
// open `takes / leaves / breaks` table (kogaki#1534, owner 2026-10-23; kogaki#1699), with the record's
// rendering and the record file folded beneath them (kogaki#1479, owner 2026-10-20). Inputs:
// none drawn as a card (the original paragraph is in the comparison table above, the Audience
// is in the run-conditions line). Prompt: one per paragraph. Calls: one group per paragraph,
// with its Round count.

// A paragraph's Segments table, the one renderer the Extraction card and the paragraph tables
// share. `edited` is the set of Segment numbers the run record names as edited by the owner
// (kogaki#1512); each such row carries the badge, with the edited fields in its title.
export const EDITED_BADGE = "edited by owner";
// `bound` is the record's `content_bound` (kogaki#1614): a Segment judged unbound carries its
// verdict's reason beside its content clause, and a bound one carries nothing.
const unboundNote = (bound, j) => {
  const v = Array.isArray(bound) ? bound[j] : null;
  return v && v.bound === false ? ` <span class="unbound">not bound: ${esc(v.why || "")}</span>` : "";
};
const rowAttrs = (edited, n) => (edited.has(n) ? ` class="edited"` : "");
export const segmentsTable = (segs, edited = new Map(), bound = null) =>
  segs.length
    ? `<table><thead><tr><th>#</th><th>content clause</th><th>operation</th><th>relation</th><th>manner</th></tr></thead><tbody>` +
      segs
        .map(
          (s, j) =>
            `<tr${rowAttrs(edited, j + 1)}><td>${j + 1}${
              edited.has(j + 1)
                ? ` <span class="badge edited" title="${esc(edited.get(j + 1).join(", "))}">${EDITED_BADGE}</span>`
                : ""
            }</td>` +
            `<td>${esc(s.content || "")}${unboundNote(bound, j)}</td><td>${esc(s.operation || "")}</td><td>${esc(s.relation || "")}</td>` +
            `<td>${esc(s.manner || "")}</td></tr>`,
        )
        .join("") +
      `</tbody></table>`
    : `<p class="muted">No Segments.</p>`;

export function extractionCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const per = extractionParagraphs(r);
  const entries = (r.ingest && r.ingest.entries) || [];
  const output =
    stageNote(r, "extract") +
    per
      .map((p) =>
        prowBlock(
          "extraction",
          p.i + 1,
          idx,
          `paragraph ${p.i + 1}`,
          `<p class="meta">${p.file ? esc(rel(p.file)) : "(not written)"} · sha ${contentHash(p.text)}</p>` +
            (p.file
              ? segmentsTable(p.segs, editedSegments(r, p.i + 1), p.rec && p.rec.content_bound) +
                moveStatesBreaks(r, entries[p.i] && entries[p.i].move) +
                sub("rendering", pre(p.rendered || p.text || "(not written)")) +
                sub("record file", pre(p.text || "(not written)"))
              : ""),
        ),
      )
      .join("");

  // The Prompt is the recorded stdin of each paragraph's first call, not the judge's
  // `prompt.md`: the recorder's stdin carries the CLI preamble the model actually read.
  const promptEntries = per.filter((p) => p.calls.length).map((p) => [`paragraph ${p.i + 1}`, p.calls[0].stdin]);
  const callsHtml = per.some((p) => p.calls.length)
    ? per
        .map((p) =>
          sub(
            `paragraph ${p.i + 1} — rounds ${p.rounds ? roundsOf(p.rounds) : "?"}`,
            callsBlock(
              p.calls,
              `paragraph ${p.i + 1} calls`,
              promptEntries.map(([t, x]) => [`Prompt, ${t}`, x]),
            ),
          ),
        )
        .join("")
    : `<p class="muted">No recorded model calls.</p>`;

  return cardWrap(
    "extraction",
    {
      output,
      copiedFrom: r.stage("extract").copied_from || null,
      inputs: inputsList([], idx),
      prompt: promptPart(promptEntries),
      calls: callsHtml,
    },
    idx,
  );
}

// CARD 2 — MOVE. Output (folded, kogaki#1487): one collapsible block per paragraph, closed by
// default except paragraph 1 (kogaki#1410), its Move file's path, hash and content, with its ingest screen
// folded. Inputs: Extraction. No model call -- `tools/move_ingest.py` is mechanical.
export function moveCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const entries = (r.ingest && r.ingest.entries) || [];
  const n = r.paragraphs.length;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const e = entries[i] || {};
    const mp = e.move ? join(r.runDir, "moves", `${e.move}${MOVE_RECORD_EXT}`) : null;
    const mt = mp ? read(mp) : null;
    rows.push(
      prowBlock(
        "move",
        i + 1,
        idx,
        `paragraph ${i + 1}`,
        `<p class="meta">${mp ? esc(rel(mp)) : "(not written)"} · sha ${contentHash(mt)}</p>` +
          pre(mt || e.refusal || "(not written)") +
          (e.screen ? sub(`ingest entry — sha ${contentHash(e.screen)}`, pre(e.screen)) : ""),
      ),
    );
  }
  const output = stageNote(r, "ingest") + rows.join("");
  return cardWrap(
    "move",
    {
      output,
      inputs: inputsList([["extraction", relFromRepo(join(r.runDir, "extract"), REPO)]], idx),
      prompt: `<p class="muted">No model call: <code>tools/move_ingest.py</code> <code>run_from_extraction</code> derives the Move mechanically.</p>`,
      calls: `<p class="muted">No model call.</p>`,
    },
    idx,
  );
}

// THE DERIVED CROSS-LEG FIELDS of a several-Leg Brief (kogaki#1532), one row each, marked
// `derived`, from the composer's `brief.json`; nothing for one Leg.
export const DERIVED_BADGE = "derived";
function derivedTable(r) {
  if (!(r.run.legs && r.run.legs.length > 1)) return "";
  const rows = ((r.legBriefRun && readJson(join(r.legBriefRun, "brief.json"))) || {}).derived || [];
  return (
    `<table class="derived"><caption>Cross-Leg fields</caption><thead><tr><th>Leg</th><th>field</th><th>value</th><th>rule</th></tr></thead><tbody>` +
    (rows.length
      ? rows
          .map(
            (d) =>
              `<tr><td>${esc(d.leg_id)}</td><td>${esc(d.field)} <span class="badge derived">${DERIVED_BADGE}</span></td>` +
              `<td>${esc(Array.isArray(d.value) ? d.value.join(", ") : String(d.value))}</td><td>${esc(d.rule)}</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="4" class="muted">(no derived field recorded)</td></tr>`) +
    `</tbody></table>`
  );
}

// CARD 3 — BRIEF. Output (folded, kogaki#1487): the Brief file, whole, with its path and hash. Inputs: Extraction (the claims the Leg Brief composer reads).
// Prompt/Calls: the composer's Leg path call, one per Leg, each titled by what it produced. The
// Reader start call is retired (kogaki#1699).
export function briefCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const output =
    (r.briefText ? "" : stageNote(r, "brief")) +
    derivedTable(r) +
    `<p class="meta">${esc(rel(r.briefPath))} · sha ${contentHash(r.briefText)}</p>` +
    pre(r.briefText || "(not written)");

  const legPathMarker = "`leg_path_unit` judgment point";
  const legs = r.run.legs && r.run.legs.length > 1 ? r.run.legs : null;
  // Several Legs' Leg calls are told apart by the first Strand each Leg's input names.
  const strandKey = (k) => `"claim_strand": "L${legs.slice(0, k).reduce((a, l) => a + l.paragraphs, 0) + 1}"`;
  const rowsFor = legs
    ? legs.map((l, k) => [`leg-path-${k + 1}`, [legPathMarker, strandKey(k)], `Brief, Brief Waypoint, Leg ${k + 1}`])
    : [["leg-path", [legPathMarker], "Brief, Brief Waypoint"]];
  const named = [];
  let callsHtml = "";
  for (const [sub_, markers, title] of rowsFor) {
    const d = r.legBriefRun ? join(r.legBriefRun, sub_) : null;
    const answer = d ? readJson(join(d, "answer.json")) : null;
    const rounds = d ? readJson(roundsFileIn(d)) : null;
    const calls = r.briefCalls.filter((c) => markers.every((m) => String(c.stdin).includes(m)));
    if (calls.length) named.push([title, calls[0].stdin]);
    callsHtml += sub(
      `${title} — rounds ${rounds ? roundsOf(rounds) : "?"}`,
      sub(`answer — sha ${contentHash(answer && json(answer))}`, pre(answer ? json(answer) : "(none)")) +
        pre(rounds ? json(rounds) : "(no rounds record)") +
        callsBlock(
          calls,
          `${title} calls`,
          named.map(([t, x]) => [`Prompt, ${t}`, x]),
        ),
    );
  }
  return cardWrap(
    "brief",
    {
      output,
      anchored: briefAnchored(r.legBriefRun),
      copiedFrom: r.stage("brief").copied_from || null,
      inputs: inputsList([["extraction", relFromRepo(join(r.runDir, "extract"), REPO)]], idx),
      prompt: promptPart(named),
      calls: callsHtml,
    },
    idx,
  );
}

// CARD 5 — PACKET. Output: one row per original paragraph, its Leg's Packet file whole
// (kogaki#1784), so the lines the Writer received for paragraph N are readable beside paragraph N
// (kogaki#1402). Inputs: Brief, ParagraphPlan. No model call -- `/draft` renders it mechanically.
export function packetCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const ids = r.legIds || [];
  const n = Math.max(r.paragraphs.length, ids.length);
  const rows = [];
  let any = false;
  for (let i = 1; i <= n; i++) {
    const id = ids[i - 1];
    const path = id ? packetPathOf(r, id) : null;
    const packet = path ? read(path) : null;
    if (packet !== null) any = true;
    rows.push(
      prowBlock(
        "packetwp",
        i,
        idx,
        `Leg ${i}${id ? ` — ${id}` : ""}`,
        `<p class="meta">${path && packet !== null ? esc(rel(path)) : "(not rendered)"} · sha ${contentHash(packet)}</p>` +
          pre(packet || "(not rendered)"),
      ),
    );
  }
  const output = (any ? "" : stageNote(r, "draft")) + rows.join("");
  return cardWrap(
    "packet",
    {
      output,
      inputs: inputsList(
        [
          ["brief", rel(r.briefPath)],
          ["paragraphPlan", rel(r.planPath)],
        ],
        idx,
      ),
      prompt: `<p class="muted">No model call: rendered by <code>/draft</code> from the Brief and the ParagraphPlan file.</p>`,
      calls: `<p class="muted">No model call.</p>`,
    },
    idx,
  );
}

// CARD 6 — DRAFT. Output: one row per paragraph, its Leg's written text (or the stop). Inputs:
// Packet. Each Leg's Writer prompt is its Packet, so the Prompt and Calls parts say so rather
// than showing it again (kogaki#1401).
export function draftCard(r, idx, { sectionPath, written, writtenParas, draftStop }) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const ids = r.legIds || [];
  const packets = ids.map((id) => [id, read(packetPathOf(r, id))]);
  const perLeg = ids.map((id) => [id, readCalls(join(r.runDir, "draft", `calls-${id}.jsonl`))]);
  const writerCalls = r.draftCalls;
  const same =
    writerCalls.length &&
    perLeg.every(([id, cs]) => {
      const packet = (packets.find(([x]) => x === id) || [])[1];
      return cs.length && packet !== null && packet !== undefined && cs.every((c) => c.stdin === packet);
    });
  const n = Math.max(r.paragraphs.length, writtenParas.length);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const cellText = written
      ? esc(writtenParas[i] || "")
      : i === 0
        ? `<span class="stop">${esc(draftStop || "not written")}</span>`
        : "";
    rows.push(prowBlock("draft", i + 1, idx, `paragraph ${i + 1}`, `<p>${cellText}</p>`));
  }
  const output =
    `<p class="meta">${sectionPath ? esc(rel(sectionPath)) : "(not written)"} · sha ${contentHash(written)}</p>` +
    rows.join("") +
    stageNote(r, "draft");

  const prompt = writerCalls.length
    ? `<p>${same ? "Each recorded prompt equals its Leg's Packet shown in the Packet card above, byte for byte." : `<span class="stop">A recorded prompt is not its Leg's Packet.</span>`}</p>`
    : `<p class="muted">No Draft call was recorded.</p>`;
  const calls = callsBlock(
    writerCalls,
    "recorded Draft calls",
    packets.filter(([, t]) => t !== null).map(([id, t]) => [`the Packet card's Output, Leg ${id}`, t]),
  );

  return cardWrap(
    "draft",
    {
      output,
      inputs: inputsList([["packet", ids.length ? rel(join(r.ws, "packets")) : null]], idx),
      prompt,
      calls,
    },
    idx,
  );
}

// CARD 7 — RUN RECORD. Output: `run.json` and each stage's `command.json`. Inputs: none; this
// card names what ran, not what it read.
export function runRecordCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const runText = read(join(r.runDir, "run.json"));
  const stages = ["extract", "ingest", "brief", "paragraph-plan", "draft"];
  const commands = stages
    .map((s) => {
      const cmd = readJson(join(r.runDir, s, "command.json")) || [];
      return sub(`${s} — command.json`, pre(json(cmd.map((c) => ({ name: c.name, argv: c.argv, exit: c.exit })))));
    })
    .join("");
  const output =
    `<p class="meta">${esc(rel(join(r.runDir, "run.json")))} · sha ${contentHash(runText)}</p>` +
    pre(runText || "(none)") +
    commands;
  return cardWrap(
    "runRecord",
    {
      output,
      inputs: inputsList([], idx),
      prompt: `<p class="muted">No model call: this card names what ran and how.</p>`,
      calls: `<p class="muted">No model calls of its own; see each card above for its stage's calls.</p>`,
    },
    idx,
  );
}

// THE PARAGRAPH TABLES (kogaki#1487, owner 2026-10-21; plain tables since kogaki#1512, owner
// 2026-10-22): between the comparison table and the first card, three tables under their own
// headings, with no heading above them and nothing folded -- every paragraph's Segments table
// (by the Extraction card's own renderer), every `does-not-fit` verdict across the plan's
// Rounds with the judge's `why` in full, and the bindings -- read from the plan file's own
// entries (kogaki#1639) -- with each bound Move's takes and leaves in its row -- so a reader
// completes a review without opening a card. The takes and leaves fold closed under
// `takes / leaves`, one row per Leg (kogaki#1516, kogaki#1784). Each paragraph's heading is followed
// by its bound Move's description (kogaki#1517).
export function reviewBlock(r, idx) {
  const entries = (r.ingest && r.ingest.entries) || [];
  const rows = planBindings(r);
  // With a library, the heading also names the Move bound at the paragraph's Leg and its source.
  const boundAt = (n) => {
    const b = r.run.library ? rows.find((x) => Number(x.waypoint) === n) : null;
    return b ? ` · bound ${esc(b.move || "(none bound)")}${sourceBadge(r.run, b.move)}` : "";
  };
  const segments = extractionParagraphs(r)
    .map(
      (p) =>
        `<h4>paragraph ${p.i + 1} — ${esc((entries[p.i] && entries[p.i].move) || "(no Move)")}${boundAt(p.i + 1)}${COPY_BUTTON}</h4>` +
        moveDescription(r, entries[p.i] && entries[p.i].move) +
        moveConstraintLines(r, entries[p.i] && entries[p.i].move) +
        (p.file
          ? segmentsTable(p.segs, editedSegments(r, p.i + 1), p.rec && p.rec.content_bound) +
            moveBreaks(r, entries[p.i] && entries[p.i].move)
          : `<p class="muted">(not written)</p>`),
    )
    .join("");

  // A Round with no readable judge verdict, or one the job record refused where the judge
  // named no does-not-fit, is a row too, carrying the job record's refusal: only a Round
  // both readers agree passed leaves no row, so "no Round was refused" is never a silence.
  const rounds = planRounds(r.planCalls);
  const job = readJson(join(r.jobDir, "reader-path-job.json"));
  const refused = [];
  rounds.forEach((a, i) => {
    const refusal = unitRefusals(r, job, a.legId)[a.legRound];
    const v = a.judge ? callAnswer(a.judge) : null;
    const verdicts = v && v.record && Array.isArray(v.record.verdicts) ? v.record.verdicts : null;
    const jobSays =
      refusal !== undefined ? `the job record's refusal: ${refusal}` : "the job record holds no refusal for this round";
    if (verdicts === null) {
      if (a.judge || refusal !== undefined)
        refused.push({
          n: i + 1,
          leg: a.legId,
          paragraph: "—",
          why: `${a.judge ? "the judge's answer carried no readable verdicts" : "no judge call was recorded"}; ${jobSays}`,
        });
      return;
    }
    const notFit = verdicts.filter((x) => x && x.verdict === "does-not-fit");
    for (const x of notFit) refused.push({ n: i + 1, leg: a.legId, paragraph: x.paragraph, why: x.why || "" });
    if (!notFit.length && refusal !== undefined)
      refused.push({
        n: i + 1,
        leg: a.legId,
        paragraph: "—",
        why: `the judge answered fits at every paragraph; ${jobSays}`,
      });
  });
  const refusedHtml = !rounds.length
    ? `<p class="muted">No plan call was recorded.</p>`
    : !refused.length
      ? `<p>no round was refused</p>`
      : `<table class="refused"><thead><tr><th>round</th><th>Leg</th><th>paragraph</th><th>the judge's why</th></tr></thead><tbody>` +
        refused
          .map(
            (x) =>
              `<tr><td><a href="#${roundId(x.n, idx)}">round ${x.n}</a></td><td>${esc(x.leg)}</td><td>${esc(x.paragraph)}</td><td>${esc(x.why)}</td></tr>`,
          )
          .join("") +
        `</tbody></table>`;

  const bindingsHtml = rows.length
    ? `<table class="bindings"><thead><tr><th>Leg</th><th>point</th><th>bound Move</th><th>rationale</th></tr></thead><tbody>` +
      rows
        .map(
          (b) =>
            `<tr><td>${esc(b.leg_id)}</td><td>${esc(legPoint(r, b.waypoint))}</td><td><a href="#card-${idx}-move">${esc(b.move || "(none bound)")}</a>${sourceBadge(r.run, b.move)}` +
            `<details class="states"><summary>takes / leaves</summary>${moveStates(r, b.move)}</details></td><td>${esc(b.rationale || "")}</td></tr>`,
        )
        .join("") +
      `</tbody></table>`
    : `<p class="muted">No plan file to read the bindings from.</p>`;

  return (
    `<section class="review" id="review-${idx}">` +
    `<h3>Segments</h3><div class="rpart segments">${segments}</div>` +
    `<h3>Refused rounds</h3><div class="rpart refused">${refusedHtml}</div>` +
    `<h3>Bindings</h3><div class="rpart bindings">${bindingsHtml}</div>` +
    `</section>`
  );
}
