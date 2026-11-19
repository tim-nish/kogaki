// The sheet of a Leg's Senses (kogaki#1849): one page in plain words, asking the reader whether each Edge candidate
// holds between its two sentences, and, where a Move of moves/ was named, reporting whether the Move's Edges are met
// under each filling of its bound Segments (kogaki#1851).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   A Leg's Senses
//       specs/spec-draft-pipeline/SPEC.md
//
import { proofSheetCss } from "./sheet.mjs";

export const PAIR_ASKS = "This table asks one thing: whether each Sense shown holds between the two sentences.";
export const COMPARISON_ASKS = "This part asks nothing; it only reports.";
const ACCENT =
  ':root[data-theme="dark"]{--accent:#6cc3d5;--off:#163a42}h1,h2{color:var(--accent)}' +
  ".meaning{display:block;opacity:.8}";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const part = (id, title, body) => `<section class="card" id="${id}"><h2>${esc(title)}</h2>${body}</section>`;
const pre = (t) => `<pre>${esc(t)}</pre>`;
const sameAnswer = (a, b) => a.sense === b.sense && a.played_by === b.played_by;

function senseCell(a, names) {
  const n = names.get(a.sense);
  return `${esc(a.sense)}<span class="meaning">${esc(n ? n.meaning : "")}</span>`;
}

function partCell(a, names) {
  const n = names.get(a.sense);
  if (!n || !n.part) return "no part";
  return `sentence ${a.played_by}: ${esc(n.plays)}`;
}

function joinedCell(pair, a, joins, sentences) {
  const j = joins.find((r) => JSON.stringify(r.pair) === JSON.stringify(pair) && sameAnswer(r, a));
  if (!j) return "not joined";
  return `${esc(sentences[pair[0] - 1].sentence)} <b>${esc(j.word)}</b> ${esc(j.second)}`;
}

function pairTable(p, { names, joins, sentences, readingCount }) {
  const kept = p.answers.filter((a) => a.candidate);
  const rows = kept
    .map(
      (a) =>
        `<tr><td>${senseCell(a, names)}</td><td>${partCell(a, names)}</td>` +
        `<td>named in ${a.named} of ${readingCount}</td><td>${joinedCell(p.pair, a, joins, sentences)}</td></tr>`,
    )
    .join("");
  const body = kept.length
    ? `<table><thead><tr><th>Sense</th><th>Which sentence plays which part</th><th>In the ${readingCount} readings</th>` +
      `<th>The two sentences joined</th></tr></thead><tbody>${rows}</tbody></table>`
    : "<p>No reading named a Sense for this pair.</p>";
  const left = p.answers.filter((a) => !a.candidate);
  const rest = left.length
    ? `<p>Named but not kept: ${left.map((a) => `${esc(a.sense)} (named in ${a.named} of ${readingCount})`).join(", ")}.</p>`
    : "";
  return `<h3>Sentences ${p.pair[0]} and ${p.pair[1]}</h3><p>${PAIR_ASKS}</p>${body}${rest}`;
}

const answerText = (a) => (a.played_by === null ? a.sense : `${a.sense}, played by sentence ${a.played_by}`);

// Which sentence each bound Segment is given, and which Segment states the CentralClaim.
function fillingText(f, segments) {
  const given = segments
    .map((s, k) => (s.bind === null ? null : `Segment ${k + 1} = sentence ${f.filling[s.bind]}`))
    .filter(Boolean);
  const central =
    f.central_claim === null
      ? "no Segment states the CentralClaim"
      : `Segment ${f.central_claim} states the CentralClaim`;
  return `${given.length ? `${given.join(", ")}; ` : ""}${central}`;
}

function notComparedList(comparison, segments) {
  if (!comparison.not_compared.length) return "";
  const unbound = (e) =>
    [e.segment, e.to[0]]
      .filter((k) => segments[k - 1].bind === null)
      .map((k) => `Segment ${k}`)
      .join(" and ");
  const lines = comparison.not_compared
    .map(
      (e) =>
        `<li>Segment ${e.segment}: ${esc(e.sense)} to Segment ${e.to.join(", ")} — ${unbound(e)} has nothing bound</li>`,
    )
    .join("");
  return `<p>Edges not compared, under any filling:</p><ul>${lines}</ul>`;
}

function comparisonSection(comparison, sentences, move) {
  const segments = move.segments;
  const bound = segments.filter((s) => s.bind !== null).length;
  const verdict = comparison.chosen
    ? "The Move can be chosen for this Leg: at least one filling meets every Edge compared."
    : comparison.none
      ? `The Move cannot be chosen for this Leg: ${comparison.none}.`
      : "The Move cannot be chosen for this Leg: no filling meets every Edge compared.";
  const opening =
    `<p>${COMPARISON_ASKS}</p><p>Every way of giving the Leg's ${sentences.length} sentences, its Arguments and its ` +
    `CentralClaim, to the Move's ${bound} bound Segments, no sentence twice, is tried.</p>` +
    "<p>A row is one Edge of the Move under one filling, compared with the Edge candidates of the pair of sentences it falls on.</p>" +
    `<p>${esc(verdict)}</p>`;
  const rows = comparison.fillings
    .flatMap((f) => {
      const fill = esc(fillingText(f, segments));
      return f.edges.map(
        (e) =>
          `<tr><td>${fill}</td><td>Segment ${e.segment}: ${esc(e.sense)} to Segment ${e.to.join(", ")}</td>` +
          `<td>sentences ${e.pair[0]} and ${e.pair[1]}, wanting ${esc(answerText(e.wanted))}</td>` +
          `<td>${e.candidates.length ? e.candidates.map((c) => esc(answerText(c))).join("; ") : "none"}</td>` +
          `<td>${e.met ? "met" : "not met"}</td></tr>`,
      );
    })
    .join("");
  const table = rows
    ? `<table><thead><tr><th>Filling</th><th>Edge</th><th>Pair it falls on</th><th>That pair's Edge candidates</th>` +
      `<th>Met</th></tr></thead><tbody>${rows}</tbody></table>`
    : "";
  return `${opening}${table}${notComparedList(comparison, segments)}`;
}

function foldedSection(readings, prompts) {
  const answers = readings
    .map(
      (r, k) => `<details class="part"><summary>reading ${k + 1}</summary>${pre(JSON.stringify(r, null, 2))}</details>`,
    )
    .join("");
  const sent = ["the readings", "the joining call"]
    .map(
      (what, k) =>
        `<details class="part"><summary>instruction of ${what}</summary>${pre(prompts[k] ?? "not recorded")}</details>`,
    )
    .join("");
  return `<details><summary>every answer as given, and the two instructions as sent</summary>${answers}${sent}</details>`;
}

export function renderLegSensesSheet({
  brief,
  legId,
  sentences,
  counted,
  comparison,
  move,
  joins,
  readings,
  prompts,
  names,
  readingCount,
}) {
  const opening = `<p>Read: the Leg ${esc(legId)} of the Brief ${esc(brief)}.</p>`;
  const sentenceRows = sentences
    .map((s) => `<tr><td>${s.number}</td><td>${s.kind}</td><td>${esc(s.sentence)}</td></tr>`)
    .join("");
  const ctx = { names, joins, sentences, readingCount };
  return (
    `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Leg Senses ${esc(legId)}</title><style>${proofSheetCss()}\n${ACCENT}</style></head><body>` +
    `<h1>A Leg's Senses — ${esc(legId)}</h1>${opening}` +
    part("sentences", "The sentences", `<table><tbody>${sentenceRows}</tbody></table>`) +
    part("pairs", "Senses per pair of sentences", counted.map((p) => pairTable(p, ctx)).join("")) +
    (comparison ? part("comparison", "The Move's Edges", comparisonSection(comparison, sentences, move)) : "") +
    part("folded", "Readings", foldedSection(readings, prompts)) +
    "</body></html>\n"
  );
}
