// proof-sheet/leg-sheet/frame — what every card is drawn with: the helpers, the folded blocks, the
// badges, the prompts, the diagram, the scripts and the stylesheet. Cut from
// src/proof-sheet/leg-sheet.mjs along its headed sections (kogaki#1800); the design and its rulings
// are stated at the entry's header and in the Issues each block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseYaml } from "../../yaml.mjs";
import { JUDGE_INPUT_MARKER } from "../../workflow/judge.mjs";

// What each card is titled on the sheet: the pipeline's nouns and nothing else (kogaki#1400,
// #1401), in pipeline order.
export const SHEET_TITLES = {
  extraction: "Extraction",
  move: "Move",
  brief: "Brief",
  paragraphPlan: "ParagraphPlan",
  packet: "Packet",
  draft: "Draft",
  runRecord: "Run record",
};

// Every card carries one badge, production or Proof Sheet substitute (kogaki#1400, carried
// onto the seven cards by #1401). A substitute's note, where it has one, goes in the badge's
// title attribute.
export const SHEET_CELL_BADGE = {
  extraction: { type: "substitute" },
  move: { type: "production", note: "production code, written into this run's own library" },
  brief: { type: "substitute", note: "production rows with declared substitutions" },
  paragraphPlan: { type: "production" },
  packet: { type: "production" },
  draft: { type: "production" },
  runRecord: { type: "production" },
};

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const read = (p) => {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
};
export const readJson = (p) => {
  const t = read(p);
  if (t === null) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
};
export const readCalls = (p) =>
  (read(p) || "")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
export const pre = (t) => `<pre>${esc(t)}</pre>`;
export const json = (o) => JSON.stringify(o, null, 2);

export function stageNote(r, name) {
  const s = r.stage(name);
  if (s.state === "done") return "";
  return `<p class="stop">${esc(name)}: ${esc(s.state)}${s.stopped ? ` — ${esc(s.stopped)}` : ""}</p>`;
}

export const sub = (title, body) => `<details class="sub"><summary>${esc(title)}</summary>${body}</details>`;
export const subOpen = (title, body) => `<details class="sub" open><summary>${esc(title)}</summary>${body}</details>`;

// A call's stdin against the prompts the sheet already shows (`shown`, as [where, text]
// pairs): the same text byte for byte, or the same text with one block inserted -- a retry,
// whose refusal sits between the instruction and the input (src/workflow/judge.mjs
// `judgeRefusalBlock`) -- or neither.
export function againstShown(stdin, shown) {
  const text = String(stdin);
  for (const [where, prompt] of shown) {
    if (prompt === text) return { where, inserted: null };
  }
  for (const [where, prompt] of shown) {
    if (text.length <= prompt.length) continue;
    let a = 0;
    while (a < prompt.length && prompt[a] === text[a]) a++;
    const b = prompt.length - a;
    if (!text.endsWith(prompt.slice(a))) continue;
    // The common prefix can run into the block where the block opens as the input does (both
    // with `-----`); slide the cut back to the nearest line start it can stand at (kogaki#1437).
    const len = text.length - prompt.length;
    let at = a;
    while (at > 0 && text[at - 1] === text[at - 1 + len] && text[at - 1] !== "\n") at--;
    if (at > 0 && text[at - 1] !== "\n") at = a;
    return { where, inserted: text.slice(at, at + len) };
  }
  return null;
}

// Every recorded call, folded: argv, then its prompt and answer. A call whose stdin is a
// prompt the sheet already shows names where rather than showing it again, and a retry
// shows only the block it inserted (kogaki#1401, "no prompt text appears in more than one
// place on the sheet"); a call whose stdin is shown nowhere else is shown whole.
export function callsBlock(calls, label = "recorded model calls", shown = []) {
  if (!calls.length) return `<p class="muted">No ${esc(label)}.</p>`;
  return calls
    .map((c, i) => {
      const m = againstShown(c.stdin, shown);
      const prompt = !m
        ? sub("prompt (stdin)", pre(c.stdin))
        : m.inserted === null
          ? `<p class="muted">prompt (stdin): the prompt shown under ${esc(m.where)}, byte for byte.</p>`
          : `<p class="muted">prompt (stdin): the prompt shown under ${esc(m.where)}, with this block inserted before its input:</p>${pre(m.inserted)}`;
      return sub(
        `${label}: call ${i + 1} of ${calls.length} — exit ${c.exit}, at ${c.at}`,
        pre(`argv: ${JSON.stringify(c.argv)}`) +
          prompt +
          sub("answer (stdout)", pre(c.stdout)) +
          (c.stderr ? sub("stderr", pre(c.stderr)) : ""),
      );
    })
    .join("");
}

// THE ANCHORED BRIEF (kogaki#1495). A Brief whose Leg was judged recoverable from the
// Extraction's Segment content reads "Proof Sheet substitute, anchored". The mark is read from
// the run's own Leg Brief composer record (`brief.json`'s `anchored`), never from the live
// code, so an older run's sheet, composed before the criterion, still reads unanchored.
export const ANCHORED_SUFFIX = ", anchored";
export function briefAnchored(legBriefRun) {
  const rec = legBriefRun ? readJson(join(legBriefRun, "brief.json")) : null;
  return !!(rec && rec.anchored === true);
}

// Every card carries one badge: production, or Proof Sheet substitute with a coloured left
// border and the note (if any) in the badge's title attribute.
function badgeSpan(key, anchored = false) {
  const b = SHEET_CELL_BADGE[key];
  if (!b) return "";
  const label = (b.type === "substitute" ? "Proof Sheet substitute" : "production") + (anchored ? ANCHORED_SUFFIX : "");
  return ` <span class="badge ${b.type}"${b.note ? ` title="${esc(b.note)}"` : ""}>${esc(label)}</span>`;
}

// A STAGE COPIED FROM AN EARLIER RUN (kogaki#1512) carries a second badge naming that run, read
// from the stage's own record; its Rounds and refusals are the earlier run's, never re-judged.
export const COPIED_BADGE = "copied from";
function copiedBadge(source) {
  return source ? ` <span class="badge copied">${COPIED_BADGE} ${esc(source)}</span>` : "";
}

// A list of Inputs entries, each a link to another card on the same page and the path of
// what the stage read (kogaki#1401 acceptance: "every Inputs entry is a link to another
// card"). No input's content is repeated here.
export function inputsList(entries, idx = 0) {
  if (!entries.length) return `<p class="muted">None drawn as a card.</p>`;
  return `<ul>${entries.map(([key, path]) => `<li><a href="#card-${idx}-${key}">${esc(SHEET_TITLES[key])}</a>${path ? ` <span class="meta">${esc(path)}</span>` : ""}</li>`).join("")}</ul>`;
}

// One card: Output (folded, kogaki#1559 -- the anchor script below opens it on its link), Inputs,
// Prompt, Calls, in that order -- and Rounds between Output and Inputs where the card has one (the
// ParagraphPlan card, kogaki#1437).
export function cardWrap(key, { output, rounds, inputs, prompt, calls, anchored = false, copiedFrom = null }, idx = 0) {
  const name = SHEET_TITLES[key];
  const b = SHEET_CELL_BADGE[key];
  const cls = b && b.type === "substitute" ? "pcard substitute" : "pcard";
  return (
    `<section class="${cls}" id="card-${idx}-${key}"><h3><b>${esc(name)}</b>${badgeSpan(key, anchored)}${copiedBadge(copiedFrom)}</h3>` +
    `<details class="part out"><summary>Output</summary>${output}</details>` +
    (rounds !== undefined ? `<details class="part rounds"><summary>Rounds</summary>${rounds}</details>` : "") +
    `<details class="part in"><summary>Inputs</summary>${inputs}</details>` +
    `<details class="part prompt"><summary>Prompt</summary>${prompt}</details>` +
    `<details class="part calls"><summary>Calls</summary>${calls}</details>` +
    `</section>`
  );
}

// A recorded prompt's two halves: the instruction (above the judge's input marker, or the
// whole prompt where there is none), open, and the input, folded, with a note that they are
// two halves of one recorded file.
function promptHalves(promptText) {
  if (promptText === null || promptText === undefined) return `<p class="muted">No model call was recorded.</p>`;
  const at = promptText.indexOf(JUDGE_INPUT_MARKER);
  const instruction = at >= 0 ? promptText.slice(0, at) : promptText;
  const input = at >= 0 ? promptText.slice(at) : null;
  return (
    (input !== null
      ? `<p class="muted">The instruction and the input below are two halves of one recorded prompt file.</p>`
      : "") +
    `${subOpen("instruction", pre(instruction))}` +
    (input !== null ? sub("input", pre(input)) : "")
  );
}

// A stage's Prompt part: one prompt where the stage made one call (or one per paragraph),
// or one titled prompt per call where a stage makes two (the Brief composer's two calls, the
// ParagraphPlan's plan and judge calls), each titled by what it produced.
// Where every prompt carries the same instruction (the Extractor's, one per paragraph), the
// instruction is shown once and each prompt's input under its own title.
export function promptPart(named) {
  if (!named.length) return `<p class="muted">No model call was recorded.</p>`;
  if (named.length === 1) return promptHalves(named[0][1]);
  const halves = named.map(([title, text]) => {
    const at = text.indexOf(JUDGE_INPUT_MARKER);
    return { title, text, instruction: at >= 0 ? text.slice(0, at) : null, input: at >= 0 ? text.slice(at) : null };
  });
  if (halves.every((h) => h.instruction !== null && h.instruction === halves[0].instruction)) {
    return (
      `<p class="muted">Each recorded prompt file is this one instruction followed by its own input.</p>` +
      subOpen("instruction", pre(halves[0].instruction)) +
      halves.map((h) => sub(`${h.title} — input`, pre(h.input))).join("")
    );
  }
  // Prompts that share an instruction (the judge's Rounds, a site's retries, kogaki#1642) show
  // it once, each input under its own title, so no instruction appears twice on the page.
  const groups = [];
  for (const h of halves) {
    const g = h.instruction !== null ? groups.find((x) => x.instruction === h.instruction) : null;
    if (g) g.items.push(h);
    else groups.push({ instruction: h.instruction, items: [h] });
  }
  return groups
    .map((g) =>
      g.items.length === 1
        ? sub(g.items[0].title, promptHalves(g.items[0].text))
        : sub(
            g.items.map((h) => h.title).join(" / "),
            `<p class="muted">These recorded prompt files are this one instruction, each followed by its own input.</p>` +
              subOpen("instruction", pre(g.instruction)) +
              g.items.map((h) => sub(`${h.title} — input`, pre(h.input))).join(""),
          ),
    )
    .join("");
}

// A Move file's Segments, read off its YAML record (kogaki#1413); none where the file is
// absent or unreadable.
function moveSegments(moveText) {
  if (!moveText) return [];
  try {
    const rec = parseYaml(moveText);
    return rec && Array.isArray(rec.segments) ? rec.segments.map((s) => String((s && s.operation) || "").trim()) : [];
  } catch {
    return [];
  }
}
export function segmentCount(moveText) {
  return moveSegments(moveText).length;
}

// THE PER-PARAGRAPH ANCHOR IDS a written-paragraph cell links to, and every per-paragraph row
// carries (kogaki#1402): one id per card per paragraph number, scoped by the sheet's run index
// so two runs on one page never collide.
export const anchorId = (card, n, idx) => `${card}-p${n}-${idx}`;

// A PER-PARAGRAPH (OR PER-BRIEF-WAYPOINT) ROW, folded (kogaki#1410, owner 2026-10-17): closed by
// default, open only for the first. The anchor id the comparison table links to sits on a
// `div` INSIDE the details, never on the details itself: a browser navigating to a fragment
// opens the closed details that are the target's ancestors, not a details that is the target.
export const prowBlock = (card, n, idx, summary, body, cls = "") =>
  `<details class="prow${cls ? ` ${cls}` : ""}"${n === 1 ? " open" : ""}><summary>${esc(summary)}</summary><div id="${anchorId(card, n, idx)}">${body}</div></details>`;

// The sheet's legend sentence (kogaki#1559): every stage card is folded on load, and a link into a
// card opens it.
export const FOLD_LEGEND = "Stage cards are folded; a link opens the card it points into.";
// The one line that opens a folded card on its link (kogaki#1559): on load and on every hash
// change, every `details` enclosing the link's target is opened, and so is the Output part of a
// target that is a card itself (a `#card-<idx>-<key>` link lands on the section, whose Output
// `details` is a descendant, not an ancestor); then the target is scrolled to.
// A `copy table` button copies the first table after its heading, header row first, one line per
// row and a tab between cells, leaving out each row's badge.
export const COPY_BUTTON = `<button type="button" class="copy-table">copy table</button>`;
export const COPY_SCRIPT = `<script>addEventListener("click",(e)=>{const b=e.target.closest("button.copy-table");if(!b)return;let t=b.closest("h4").nextElementSibling;while(t&&t.tagName!=="TABLE"&&t.tagName!=="H4")t=t.nextElementSibling;if(!t||t.tagName!=="TABLE")return;const cell=(c)=>{const k=c.cloneNode(true);k.querySelectorAll(".badge").forEach((x)=>x.remove());return k.textContent.trim().replace(/\\s+/g," ");};navigator.clipboard.writeText([...t.rows].map((r)=>[...r.cells].map(cell).join("\\t")).join("\\n")).then(()=>{b.textContent="copied";setTimeout(()=>{b.textContent="copy table";},1200);});});</script>`;
export const ANCHOR_SCRIPT = `<script>const openTo=()=>{const t=location.hash&&document.getElementById(decodeURIComponent(location.hash.slice(1)));if(!t)return;for(let d=t.closest("details");d;d=d.parentElement&&d.parentElement.closest("details"))d.open=true;const o=t.querySelector("details.part.out");if(o)o.open=true;t.scrollIntoView();};addEventListener("hashchange",openTo);openTo();</script>`;

// The diagram's three provenance classes, by node name (kogaki#1410 design: "Three classes...
// owner-authored input... model-written... mechanically derived with no model call").
const DIAGRAM_CLASSES = {
  ownerInput: ["Passage", "Audience"],
  modelWritten: ["Extraction", "Brief", "ParagraphPlan", "Draft"],
  mechanical: ["Move", "Packet"],
};
const DIAGRAM_CLASS_LABELS = {
  ownerInput: "owner-authored input",
  modelWritten: "model-written",
  mechanical: "mechanically derived, no model call",
};
// The production/substitute border rides the dashed style (kogaki#1400), on Extraction and
// Brief only -- ParagraphPlan and Draft are production and stay solid.
const DIAGRAM_DASHED = ["Extraction", "Brief"];

// THE PIPELINE DIAGRAM (kogaki#1402, redrawn at kogaki#1410): one left-to-right flowchart, opening
// the run's section, laid out in two rows -- Extraction, Move, ParagraphPlan, Packet, Draft on the
// first, Brief under Move, fed by Extraction and Audience and feeding ParagraphPlan and Packet, on
// the second. Passage and Audience are the only sources; Segments and Persona are not drawn as
// nodes (Segments is section 3 of the Extraction, and Persona is a key of the Audience file).
// Audience also feeds Packet, for the Packet's prose rules. Every node is a link to where that
// material sits on the page, and carries one of three provenance classes -- owner-authored input,
// model-written or mechanically derived with no model call -- with the production/substitute
// distinction (kogaki#1400) riding a dashed border on Extraction and Brief. The artifact node names
// are the pipeline nouns SHEET_TITLES carries and nothing else (kogaki#1400). Mermaid is loaded
// from a pinned CDN; the diagram's own text is also written as a `<pre>` fallback inside a closed
// details element, so a sheet opened offline still shows the graph as text, collapsed by default.
export function pipelineDiagram(idx) {
  const cardHref = (key) => `#card-${idx}-${key}`;
  const nodes = [
    ["Passage", `#comparison-${idx}`],
    ["Audience", "#run-conditions"],
    ["Extraction", cardHref("extraction")],
    ["Move", cardHref("move")],
    ["Brief", cardHref("brief")],
    ["ParagraphPlan", cardHref("paragraphPlan")],
    ["Packet", cardHref("packet")],
    ["Draft", cardHref("draft")],
  ];
  const edges = [
    ["Passage", "Extraction"],
    ["Audience", "Extraction"],
    ["Extraction", "Move"],
    ["Extraction", "Brief"],
    ["Audience", "Brief"],
    ["Move", "ParagraphPlan"],
    ["Brief", "ParagraphPlan"],
    ["Brief", "Packet"],
    ["ParagraphPlan", "Packet"],
    ["Audience", "Packet"],
    ["Packet", "Draft"],
  ];
  const nodeId = (name) => `${name}_${idx}`;
  const lines = ["flowchart LR"];
  for (const [name] of nodes) lines.push(`  ${nodeId(name)}["${name}"]`);
  for (const [a, b] of edges) lines.push(`  ${nodeId(a)} --> ${nodeId(b)}`);
  for (const [name, href] of nodes) lines.push(`  click ${nodeId(name)} "${href}"`);
  lines.push("  classDef ownerInput fill:#e9e4d8,stroke:#8a3b12,color:#1d1d1b");
  lines.push("  classDef modelWritten fill:#dce8df,stroke:#2f6b45,color:#1d1d1b");
  lines.push("  classDef mechanical fill:#dbe3ef,stroke:#2b4f7a,color:#1d1d1b");
  lines.push("  classDef dashed stroke-dasharray: 5 5");
  for (const [cls, names] of Object.entries(DIAGRAM_CLASSES))
    lines.push(`  class ${names.map(nodeId).join(",")} ${cls}`);
  lines.push(`  class ${DIAGRAM_DASHED.map(nodeId).join(",")} dashed`);
  const text = lines.join("\n");
  const legend = `<ul class="legend">${Object.entries(DIAGRAM_CLASS_LABELS)
    .map(([cls, label]) => `<li><span class="swatch ${cls}"></span> ${esc(label)}</li>`)
    .join("")}</ul>`;
  return (
    `<div class="diagram"><div class="mermaid">${esc(text)}</div>${legend}<p class="muted fold-legend">${esc(FOLD_LEGEND)}</p>` +
    sub("Diagram text (shown for a sheet without network access to Mermaid)", pre(text)) +
    `</div>`
  );
}

// A recorded call's answer: the `result` of its last stream-json result line, parsed as JSON,
// or the text that would not parse (`raw`) -- the whole stdout where no result line is found.
export function callAnswer(c) {
  const lines = String((c && c.stdout) || "")
    .split("\n")
    .filter((l) => l.trim() !== "");
  for (let i = lines.length - 1; i >= 0; i--) {
    let obj;
    try {
      obj = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (!obj || typeof obj !== "object" || obj.type !== "result") continue;
    if (typeof obj.result !== "string")
      return obj.result && typeof obj.result === "object"
        ? { record: obj.result }
        : { raw: JSON.stringify(obj.result) };
    try {
      const rec = JSON.parse(obj.result);
      return rec && typeof rec === "object" && !Array.isArray(rec) ? { record: rec } : { raw: obj.result };
    } catch {
      return { raw: obj.result };
    }
  }
  return { raw: String((c && c.stdout) || "") };
}
