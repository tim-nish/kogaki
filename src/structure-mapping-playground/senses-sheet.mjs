// The sheet of a Move's Senses (kogaki#1847): one page in plain words, asking the reader which of each pair's three
// Senses fits the Move best, with each Sense's meaning beside it and the two sentences joined by a word for it.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   A Move's Senses
//       specs/spec-draft-pipeline/SPEC.md
//
import { proofSheetCss } from "./sheet.mjs";

const SHOWN = 3;
const ACCENT =
  ':root[data-theme="dark"]{--accent:#6cc3d5;--off:#163a42}h1,h2{color:var(--accent)}' +
  ".kept{font-weight:bold}.meaning{display:block;opacity:.8}.picture svg{max-width:100%;height:auto}";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const part = (id, title, body) => `<section class="card" id="${id}"><h2>${esc(title)}</h2>${body}</section>`;
const pre = (t) => `<pre>${esc(t)}</pre>`;
const sameAnswer = (a, b) => a && b && a.sense === b.sense && a.played_by === b.played_by;

function senseCell(a, names) {
  const n = names.get(a.sense);
  return `${esc(a.sense)}<span class="meaning">${esc(n ? n.meaning : "")}</span>`;
}

function partCell(a, names) {
  const n = names.get(a.sense);
  if (!n || !n.part) return "no part";
  return `sentence ${a.played_by}: ${esc(n.plays)}`;
}

function countCell(a, readingCount) {
  const places = a.places.map((n, k) => `${n} in place ${k + 1}`).join(", ");
  return `among the three in ${a.among} of ${readingCount} (${places}); judged to hold in ${a.held} of ${readingCount}`;
}

function joinedCell(pair, a, joins, sentences) {
  const j = joins.find((r) => JSON.stringify(r.pair) === JSON.stringify(pair) && sameAnswer(r, a));
  if (!j) return "not joined";
  return `${esc(sentences[pair[0] - 1])} <b>${esc(j.word)}</b> ${esc(j.second)}`;
}

function pairTable(p, { names, joins, sentences, readingCount }) {
  const rows = p.answers
    .slice(0, SHOWN)
    .map((a) => {
      const kept = sameAnswer(a, p.kept);
      return (
        `<tr${kept ? ' class="kept"' : ""}><td>${kept ? "kept: " : ""}${senseCell(a, names)}</td><td>${partCell(a, names)}</td>` +
        `<td>${countCell(a, readingCount)}</td><td>${joinedCell(p.pair, a, joins, sentences)}</td></tr>`
      );
    })
    .join("");
  const tie = p.tie
    ? `<p class="stop">No Sense is kept: ${p.tie.map((t) => esc(t.sense)).join(" and ")} tie for the most first places.</p>`
    : "";
  return (
    `<table><caption>Segments ${p.pair[0]} and ${p.pair[1]}</caption><thead><tr><th>Sense</th><th>Which sentence plays which part</th>` +
    `<th>In the ${readingCount} readings</th><th>The two sentences joined</th></tr></thead><tbody>${rows}</tbody></table>${tie}`
  );
}

function edgesSection(counts) {
  if (!counts.segments) return `<p class="stop">${esc(counts.none)}.</p>`;
  const rows = counts.segments
    .map((s) => {
      const r = s.discourse_relation;
      return `<tr><td>Segment ${s.segment}</td><td>${r ? `${esc(r.sense)} to Segment ${r.to.join(", ")}` : "no Edge"}</td></tr>`;
    })
    .join("");
  return `<table><thead><tr><th>Segment</th><th>Edge</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// The Segments in a row, one arrow per Edge from the Segment carrying it to the Segment in `to`.
function picture(counts, segmentCount) {
  const w = 120;
  const gap = 60;
  const width = segmentCount * w + (segmentCount - 1) * gap + 20;
  const x = (n) => 10 + (n - 1) * (w + gap) + w / 2;
  const boxes = Array.from(
    { length: segmentCount },
    (_, k) =>
      `<rect x="${x(k + 1) - w / 2}" y="90" width="${w}" height="40" rx="6" fill="none" stroke="currentColor"/>` +
      `<text x="${x(k + 1)}" y="115" text-anchor="middle" fill="currentColor">Segment ${k + 1}</text>`,
  ).join("");
  const arrows = (counts.segments || [])
    .filter((s) => s.discourse_relation)
    .map((s) => {
      const from = x(s.segment);
      const to = x(s.discourse_relation.to[0]);
      const mid = (from + to) / 2;
      return (
        `<path d="M ${from} 90 Q ${mid} 20 ${to} 90" fill="none" stroke="currentColor" marker-end="url(#head)"/>` +
        `<text x="${mid}" y="45" text-anchor="middle" fill="currentColor">${esc(s.discourse_relation.sense)}</text>`
      );
    })
    .join("");
  return (
    `<div class="picture"><svg viewBox="0 0 ${width} 140" width="${width}" role="img" aria-label="Segments and Edges">` +
    `<defs><marker id="head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">` +
    `<path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>${boxes}${arrows}</svg></div>`
  );
}

function foldedSection(readings, prompts) {
  const answers = readings
    .map(
      (r, k) => `<details class="part"><summary>reading ${k + 1}</summary>${pre(JSON.stringify(r, null, 2))}</details>`,
    )
    .join("");
  const sent = ["the ranked readings", "the joining call"]
    .map(
      (what, k) =>
        `<details class="part"><summary>instruction of ${what}</summary>${pre(prompts[k] ?? "not recorded")}</details>`,
    )
    .join("");
  return `<details><summary>every answer as given, and the two instructions as sent</summary>${answers}${sent}</details>`;
}

export function renderSensesSheet({
  moveId,
  paragraph,
  sentences,
  counts,
  joins,
  readings,
  prompts,
  names,
  readingCount,
}) {
  const opening =
    `<p>Read: the Move ${esc(moveId)}, from paragraph ${paragraph} of its source text. ` +
    "The tables below ask one thing: which of each pair's three Senses fits the Move best.</p>";
  const paragraphRows = sentences.map((s, k) => `<tr><td>${k + 1}</td><td>${esc(s)}</td></tr>`).join("");
  const ctx = { names, joins, sentences, readingCount };
  return (
    `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Move Senses ${esc(moveId)}</title><style>${proofSheetCss()}\n${ACCENT}</style></head><body>` +
    `<h1>A Move's Senses — ${esc(moveId)}</h1>${opening}` +
    part("paragraph", "The paragraph", `<table><tbody>${paragraphRows}</tbody></table>`) +
    part("pairs", "Senses per pair of Segments", counts.pairs.map((p) => pairTable(p, ctx)).join("")) +
    part("edges", "Segments and their Edges", edgesSection(counts)) +
    part("picture", "Picture", picture(counts, sentences.length)) +
    part("folded", "Readings", foldedSection(readings, prompts)) +
    "</body></html>\n"
  );
}
