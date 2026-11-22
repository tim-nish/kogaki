// move-extraction-playground/leg-sheet/stage-cards — the run-conditions line, the Segments table and the
// stage cards. Cut from src/move-extraction-playground/leg-sheet.mjs along its headed sections
// (kogaki#1800); the design and its rulings are stated at the entry's header and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES, and the spec each one names:
//   The paragraph unit
//       passages/FORMAT.md
import { join, resolve } from "node:path";
import { settingValue } from "../../workflow/judge.mjs";
import { REPO, relFromRepo } from "../../workflow/run-record.mjs";
import { roundsOf } from "../../workflow/call-record.mjs";
import { EXTRACTION_TABLE } from "../extract.mjs";
import { MOVE_RECORD_EXT } from "../../compose.mjs";
import { contentHash, editedSegments, extractionParagraphs } from "./run-data.mjs";
import {
  COPY_BUTTON,
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
  stageNote,
  sub,
} from "./frame.mjs";
import { moveBreaks, moveConstraintLines, moveDescription, moveStatesBreaks } from "./move-blocks.mjs";

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

// CARD 1 — EXTRACTION. Output: one collapsible block per paragraph, closed by default except
// paragraph 1 (kogaki#1410, owner 2026-10-17: "having all of them expanded makes navigation
// cumbersome"), each with its path and hash, opening on its Segments table, then its Move's
// open `takes / leaves / breaks` table (kogaki#1534, owner 2026-10-23; kogaki#1699), with the record's
// rendering and the record file folded beneath them (kogaki#1479, owner 2026-10-20). Inputs:
// none drawn as a card (the Audience is in the run-conditions line). Prompt: one per paragraph. Calls: one group per paragraph,
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
    ? `<table><thead><tr><th>#</th><th>content clause</th></tr></thead><tbody>` +
      segs
        .map(
          (s, j) =>
            `<tr${rowAttrs(edited, j + 1)}><td>${j + 1}${
              edited.has(j + 1)
                ? ` <span class="badge edited" title="${esc(edited.get(j + 1).join(", "))}">${EDITED_BADGE}</span>`
                : ""
            }</td>` + `<td>${esc(s.content || "")}${unboundNote(bound, j)}</td></tr>`,
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

// CARD 3 — RUN RECORD. Output: `run.json` and each stage's `command.json`. Inputs: none; this
// card names what ran, not what it read.
export function runRecordCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const runText = read(join(r.runDir, "run.json"));
  const stages = ["extract", "ingest"];
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
// 2026-10-22): between the run-conditions line and the first card, every paragraph's Segments
// table (by the Extraction card's own renderer), nothing folded, so a reader reviews the
// Extraction without opening a card. Each paragraph's heading is followed by its Move's
// description (kogaki#1517).
export function reviewBlock(r, idx) {
  const entries = (r.ingest && r.ingest.entries) || [];
  const segments = extractionParagraphs(r)
    .map(
      (p) =>
        `<h4>paragraph ${p.i + 1} — ${esc((entries[p.i] && entries[p.i].move) || "(no Move)")}${COPY_BUTTON}</h4>` +
        moveDescription(r, entries[p.i] && entries[p.i].move) +
        moveConstraintLines(r, entries[p.i] && entries[p.i].move) +
        (p.file
          ? segmentsTable(p.segs, editedSegments(r, p.i + 1), p.rec && p.rec.content_bound) +
            moveBreaks(r, entries[p.i] && entries[p.i].move)
          : `<p class="muted">(not written)</p>`),
    )
    .join("");
  return `<section class="review" id="review-${idx}"><h3>Segments</h3><div class="rpart segments">${segments}</div></section>`;
}
