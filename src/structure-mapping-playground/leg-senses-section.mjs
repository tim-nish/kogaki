// The short Trial's section "The Leg's Senses" (kogaki#1875): a finished reading of a Leg's Senses, read from the folder
// `leg-senses.mjs read` wrote, shown per pair of the Leg's sentences beside the Move's Edges that join two Segments bound
// to that pair. No model call is made here.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial, A Leg's Senses
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { relFromRepo } from "../workflow/run-record.mjs";
import { READINGS, loadSenses, senseNames } from "../sme/edges.mjs";
import { compareMove } from "../paragraph-plan/move-choice.mjs";

// The reading's files and usage line, which `leg-senses.mjs` writes and prints; held here so the Trial reads them
// without importing the command that imports the Trial.
export const RUN_FILE = "leg-senses-run.json";
export const COUNTS_FILE = "counts.json";
export const LEG_SENSES_USAGE =
  "usage: node src/structure-mapping-playground/leg-senses.mjs read --brief <Brief file> --leg <leg_id> " +
  "[--move <Move id>] --out <dir under runs/structure-mapping-playground/>";
export const LEG_SENSES_FLAG = "leg-senses";
export const NO_READING = "No reading of the Leg's Senses was given to this Trial.";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
};

// THE FOLDER, read and refused before any call: `{ reading }`, or `{ error }` naming the flag and the folder.
// `briefPath` and `legId` are the Trial's own; `renamed` the ids the Brief's reader renamed (kogaki#1937), each
// sentence of the reading read under the id its Brief now carries.
export function readLegSensesFolder(folder, briefPath, legId, renamed = new Map()) {
  const dir = resolve(folder);
  const at = `\`--${LEG_SENSES_FLAG} ${folder}\``;
  const run = existsSync(join(dir, RUN_FILE)) ? readJson(join(dir, RUN_FILE)) : null;
  if (!run || run.state !== "finished") return { error: `${at} holds no ${RUN_FILE} whose \`state\` is \`finished\`` };
  const brief = run.brief || {};
  if (brief.path !== relFromRepo(briefPath) || brief.leg !== legId)
    return {
      error: `${at} is a reading of the Leg ${brief.leg} of ${brief.path}, and this Trial's is the Leg ${legId} of ${relFromRepo(briefPath)}`,
    };
  const counts = existsSync(join(dir, COUNTS_FILE)) ? readJson(join(dir, COUNTS_FILE)) : null;
  if (!counts || !Array.isArray(counts.pairs)) return { error: `${at} holds no ${COUNTS_FILE} with \`pairs\`` };
  const sentences = Array.isArray(run.sentences)
    ? run.sentences.map((s) => (s && renamed.has(s.id) ? { ...s, id: renamed.get(s.id) } : s))
    : run.sentences;
  return { reading: { path: relFromRepo(dir), sentences, pairs: counts.pairs } };
}

// The Move's Segments as `compareMove` takes them: each Segment's `bind` and `edges`, from the Move file (kogaki#1880).
export function edgeSegments(contract) {
  return contract.segments.map((s) => ({ bind: s.bind ?? null, edges: s.edges || [] }));
}

// The Edges compared under the one filling the Trial's pairing gives: Bind target k given the sentence `pairing.binds`
// names for it.
export function trialEdges(segments, reading, pairing) {
  const names = senseNames(loadSenses());
  const numberOf = new Map(reading.sentences.map((s) => [s.id, s.number]));
  const filling = Object.fromEntries(pairing.binds.map((p) => [p.bind, numberOf.get(p.leg)]));
  const c = compareMove({ segments }, reading.pairs, reading.sentences.length, names);
  const f = c.fillings.find((x) => Object.entries(x.filling).every(([b, n]) => filling[b] === n));
  return f ? f.edges : [];
}

const sentenceName = (s) => `${s.kind} ${s.number}, ${s.id}`;

function answerHtml(a, names, sentenceOf) {
  const n = names.get(a.sense);
  const played = a.played_by === null ? "" : ` · played by ${esc(sentenceName(sentenceOf(a.played_by)))}`;
  return (
    `<b>${esc(a.sense)}</b> — ${esc(n ? n.meaning : "")}${played} · named ${esc(a.named)} of ${READINGS}` +
    (a.candidate ? "" : ' <span class="muted">not a candidate</span>')
  );
}

function edgeHtml(e, answers) {
  const hit = e.met ? answers.find((a) => a.sense === e.wanted.sense && a.played_by === e.wanted.played_by) : null;
  return (
    `Segment ${esc(e.segment)}: ${esc(e.sense)} → Segment ${esc(e.to[0])} · ` +
    (hit
      ? `among the candidates, named ${esc(hit.named)} of ${READINGS}`
      : '<span class="stop">not among the candidates</span>')
  );
}

// THE SECTION: one row per pair in the order of counts.json, or the one sentence and the usage line.
export function legSensesSection(reading, edges) {
  if (!reading) return `<p class="muted">${esc(NO_READING)}</p><pre>${esc(LEG_SENSES_USAGE)}</pre>`;
  const names = senseNames(loadSenses());
  const byNumber = new Map(reading.sentences.map((s) => [s.number, s]));
  const sentenceOf = (k) => byNumber.get(k);
  const rows = reading.pairs.map((p) => {
    const [i, j] = p.pair;
    const who = [i, j].map((k) => `${esc(sentenceName(sentenceOf(k)))}: ${esc(sentenceOf(k).sentence)}`).join("<br>");
    const joined = edges.filter((e) => e.pair[0] === i && e.pair[1] === j).map((e) => edgeHtml(e, p.answers));
    return (
      `<tr><td>${who}</td><td>${p.answers.map((a) => answerHtml(a, names, sentenceOf)).join("<br>") || "none"}</td>` +
      `<td>${joined.join("<br>") || '<span class="muted">none</span>'}</td></tr>`
    );
  });
  return (
    `<p class="meta">${esc(reading.path)}</p>` +
    `<table><thead><tr><th>pair</th><th>answers</th><th>the Move's Edges</th></tr></thead><tbody>${rows.join("")}</tbody></table>`
  );
}
