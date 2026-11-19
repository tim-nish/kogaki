// The ParagraphPlanPlayground (kogaki#1762, kogaki#1884): one Candidate of a Brief compose run, read from the run
// directory alone, one block per Round, every Round holding the same blocks in the same order.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The ParagraphPlanPlayground, Round, Submission, Comment, Call, the Call Record, the Candidate sheet
//       specs/spec-draft-pipeline/SPEC.md
//
import { existsSync, writeFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { relFromRepo, REPO } from "../workflow/run-record.mjs";
import { callRows, callsRoot, readCallRecord, firstCallSecondsOf } from "../workflow/call-record.mjs";
import { readReaderPathJob, readerPathJobPath } from "../workflow/detached-job.mjs";
import { proofSheetCss } from "../structure-mapping-playground/sheet.mjs";
import { movePassage, NO_RECORD } from "./provenance.mjs";

// THE ONLY HEADINGS A TABLE ON THE SHEET STANDS UNDER (specs/spec-draft-pipeline/SPEC.md §"The ParagraphPlanPlayground").
export const TABLE_HEADINGS = ["Submission", "Comment", "Calls"];
export const CANDIDATE_ROUND_BLOCKS = ["Submission", "Comment", "Calls"];
export const CANDIDATE_ROUND_DEFINITION =
  "A Round is one Candidate composed by one compose Call, the Judge's fit verdict on each of its " +
  "Legs and, where a Leg does not fit its Move, the Comment it drew. A Call is one model call under this unit: compose or judge.";
export { NO_RECORD };
const ACCENT =
  ':root[data-theme="dark"]{--accent:#e0a458;--off:#3d2c14}h1,h2{color:var(--accent)}' +
  ".tag{display:inline-block;padding:1px 8px;border-radius:4px;font-weight:600}" +
  ".tag-passed{background:#1f4d2b}.tag-refused{background:#6b1d1d}.tag-stopped{background:#5a3a12}.tag-not-reached{background:#2a2a2a}" +
  "tr.named td,td.named{background:#4a3a12}.refusal{white-space:pre-wrap}.line{margin:.15em 0}td p{margin:.1em 0}" +
  "h3.round{font-size:1.05em;margin:1.4em 0 .3em;border-top:1px solid #444;padding-top:.6em}" +
  "h4.th{font-size:.8em;text-transform:uppercase;letter-spacing:.05em;margin:.8em 0 .2em;color:#9aa}";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const part = (id, title, body) => `<section class="card" id="${id}"><h2>${esc(title)}</h2>${body}</section>`;
const none = (what) => `<p class="muted">${esc(what)}</p>`;
const line = (text, cls = "line") => `<p class="${cls}">${esc(text)}</p>`;
const tag = (t, text = t) => `<span class="tag tag-${t.replace(/ /g, "-")}">${esc(text)}</span>`;
const heading = (name) => {
  if (!TABLE_HEADINGS.includes(name))
    throw new Error(`the ParagraphPlanPlayground has no heading ${JSON.stringify(name)}`);
  return `<h4 class="th">${esc(name)}</h4>`;
};
const link = (outDir, path, text) => `<a href="${esc(relative(outDir, path).split("\\").join("/"))}">${esc(text)}</a>`;

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}

// The unit's status, a `running` unit whose supervisor is gone read as `stopped`.
export function unitStatus(job, unit) {
  if (!unit) return "not started";
  return unit.status === "running" && !pidAlive(job.supervisor_pid) ? "stopped" : unit.status;
}

const roundHead = (number) => `<h3 class="round">Round ${number}</h3>`;
const isStopped = (rec) => Boolean(rec.refusal && /\bper-call limit\b/.test(String(rec.refusal.text)));

// THE MOVE LINE: the id linking to its file in the library, and its Corpus passage where an extraction record on
// this machine names the Move (kogaki#1762).
const moveHead = (move, { library, outDir }, unchanged) =>
  !move
    ? line("Move: none read")
    : `<p class="line">Move: ${link(outDir, resolve(REPO, library, `${move}.yaml`), move)}${unchanged ? " (unchanged)" : ""}</p>`;
function moveLine(move, { library, outDir, corpusDir }, unchanged = false) {
  if (!move) return line("Move: none read");
  const p = movePassage(move, corpusDir ? { corpusDir } : {});
  const passage = !p
    ? esc(NO_RECORD)
    : !p.file
      ? esc(`passage ${p.passage}, paragraph ${p.paragraph} — no passage file on this machine`)
      : p.span
        ? `${link(outDir, p.file, `${relFromRepo(p.file)}:${p.line}`)} ${esc(`lines ${p.span.first}–${p.span.last}`)}`
        : esc(`${relFromRepo(p.file)} holds no paragraph ${p.paragraph}`);
  return `${moveHead(move, { library, outDir }, unchanged)}<p class="line">passage: ${passage}</p>`;
}

function callList(runDir, unitId, outDir, calls) {
  const rows = callRows(callsRoot(runDir)).filter((r) => r.unit === unitId || r.unit.startsWith(`${unitId}/`));
  if (!rows.length) return none(`No Call Record of the unit ${unitId} is under ${relFromRepo(runDir)}.`);
  const kind = (r) =>
    r.unit === unitId ? (calls.find((c) => c.n === r.n) || {}).kind || "call" : r.unit.slice(unitId.length + 1);
  return (
    heading("Calls") +
    "<table><thead><tr><th>unit</th><th>Call</th><th>kind</th><th>refusal</th><th>files</th></tr></thead><tbody>" +
    rows
      .map(
        (r) =>
          `<tr><td>${esc(r.unit)}</td><td>${r.n}</td><td>${esc(kind(r))}</td><td>${r.refusal === null ? "passed" : esc(r.refusal)}</td>` +
          `<td>${r.files.map((f) => link(outDir, join(r.dir, f), f)).join(" ")}</td></tr>`,
      )
      .join("") +
    "</tbody></table>"
  );
}

// THE BAND a unit's section opens on: its status, its Calls by kind, its first Call's seconds, the Round definition
// and its stop in full.
function bandHtml({ unitId, status, calls, unit, definition, stop, extra = "" }) {
  const kinds = [...new Set(calls.map((c) => c.kind))].map((k) => `${k} ${calls.filter((c) => c.kind === k).length}`);
  const firstS = firstCallSecondsOf(unit);
  const chip = status === "done" ? "passed" : status === "refused" || status === "died" ? "refused" : "stopped";
  return (
    `<p class="line">unit ${esc(unitId)}</p><p class="line">status ${tag(chip, status)}</p>` +
    line(`${calls.length} Call(s)${kinds.length ? `: ${kinds.join(", ")}` : ""}`) +
    line(`first Call: ${firstS !== undefined ? `${firstS}s` : "not timed"}`) +
    line(definition, "meta") +
    (stop ? line("Stop:") + line(stop, "stop refusal") : "") +
    extra
  );
}

const unitStop = (unit, status) =>
  unit && unit.failure && (status === "refused" || status === "died" || status === "stopped")
    ? String(unit.failure.stderr_tail ?? unit.failure.class ?? "")
    : null;

const page = (title, body) =>
  `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<title>ParagraphPlanPlayground — ${esc(title)}</title><style>${proofSheetCss()}\n${ACCENT}</style></head><body>` +
  `<h1>ParagraphPlanPlayground — ${esc(title)}</h1>${body}</body></html>\n`;

// THE CANDIDATE SHEET (kogaki#1762): one compose unit of a Brief run. A compose Call opens a Round; the fit Call
// that follows it gives every Leg its verdict and is the Round's Comment; a compose Call with no fit Call after it
// is `not judged`.
export function candidateRounds(runDir, unitId, status) {
  const calls = callRows(callsRoot(runDir))
    .filter((r) => r.unit === unitId)
    .map((r) => {
      const rec = readCallRecord(r.dir);
      const phase = rec.row && rec.row.phase;
      return {
        n: r.n,
        dir: r.dir,
        phase,
        kind: isStopped(rec) ? "stopped" : phase === "fit" ? "judge" : "compose",
        answer: rec.answer,
        refusal: rec.refusal,
      };
    });
  const rounds = [];
  for (const c of calls) {
    const open = rounds[rounds.length - 1];
    if (c.phase === "fit") {
      if (!open || open.fit) continue;
      open.fit = c;
      open.calls.push({ label: `Call ${c.n}`, kind: c.kind });
      continue;
    }
    rounds.push({ number: rounds.length + 1, compose: c, fit: null, calls: [{ label: `Call ${c.n}`, kind: c.kind }] });
  }
  for (const r of rounds) {
    if (r.fit) continue;
    r.notJudged =
      r.compose.kind === "stopped" || !r.compose.answer
        ? "No Submission reached the Judge."
        : r !== rounds[rounds.length - 1]
          ? `Call ${rounds[r.number].compose.n} composed the next Candidate before the Judge read this one.`
          : status === "done"
            ? "No judge Call of this unit follows this compose Call."
            : status === "running"
              ? "The Judge has not read this Submission yet."
              : "The unit stopped before the Judge read this Submission.";
  }
  return { calls, rounds };
}

function candidateRoundHtml(round, ctx) {
  const { library, outDir, corpusDir } = ctx;
  const candidate = round.compose.answer;
  const legs = candidate && Array.isArray(candidate.legs) ? candidate.legs : null;
  const verdicts = new Map(
    round.fit && round.fit.answer && Array.isArray(round.fit.answer.verdicts)
      ? round.fit.answer.verdicts.map((v) => [String(v.leg_id), v])
      : [],
  );
  const refused = new Set(
    [...verdicts.values()].filter((v) => v.verdict !== "consistent").map((v) => String(v.leg_id)),
  );
  const submission = !legs
    ? none(
        `no Submission: ${round.compose.refusal ? round.compose.refusal.text : "the compose Call's answer did not parse"}`,
      )
    : "<table><thead><tr><th>Leg</th><th>Move</th><th>Purpose</th></tr></thead><tbody>" +
      legs
        .map(
          (l) =>
            `<tr${refused.has(String(l.leg_id)) ? ' class="named"' : ""}><td>${esc(l.leg_id)}</td><td>${moveLine(l.move, { library, outDir, corpusDir })}</td>` +
            `<td>${esc(l.purpose)}</td></tr>`,
        )
        .join("") +
      "</tbody></table>";
  const comment = round.fit
    ? "<table><thead><tr><th>Leg</th><th>verdict</th><th>why</th><th>source</th></tr></thead><tbody>" +
      [...verdicts.values()]
        .map(
          (v) =>
            `<tr><td>${esc(v.leg_id)}</td><td>${esc(v.verdict)}</td><td class="refusal">${esc(v.why)}</td><td>the Judge</td></tr>`,
        )
        .join("") +
      "</tbody></table>"
    : line(`not judged: ${round.notJudged}`);
  return (
    roundHead(round.number) +
    heading("Submission") +
    submission +
    heading("Comment") +
    comment +
    heading("Calls") +
    round.calls.map((c) => line(`${c.label}: ${c.kind}`)).join("")
  );
}

export function renderCandidate({ runDir, unitId, movesDir = "moves", outDir = process.cwd(), corpusDir = null }) {
  if (!existsSync(readerPathJobPath(runDir)))
    return {
      error: `the run directory ${relFromRepo(runDir)} holds no job record ${relative(runDir, readerPathJobPath(runDir))}`,
    };
  const job = readReaderPathJob(runDir);
  const units = Array.isArray(job.units) ? job.units : [];
  const unit = units.find((u) => u && u.id === unitId);
  if (!unit)
    return {
      error: `the job record of ${relFromRepo(runDir)} carries no unit ${unitId} — it carries ${units.map((u) => u && u.id).join(", ")}`,
    };
  const status = unitStatus(job, unit);
  const { calls, rounds } = candidateRounds(runDir, unitId, status);
  const band = bandHtml({
    unitId,
    status,
    calls,
    unit,
    definition: CANDIDATE_ROUND_DEFINITION,
    stop: unitStop(unit, status),
  });
  const body = rounds.length
    ? rounds.map((r) => candidateRoundHtml(r, { library: movesDir, outDir, corpusDir })).join("")
    : none("No compose Call of this unit left a record.");
  const html = page(
    `Candidate ${unitId}`,
    line(`run: ${relFromRepo(runDir)}`, "meta") +
      line(`job: ${job.state}`, "meta") +
      part(unitId, `Candidate ${unitId}`, band + body) +
      part("calls", "Calls", callList(runDir, unitId, outDir, calls)),
  );
  return { html, status, rounds: rounds.length };
}

function argsOf(argv) {
  const args = { _: [] };
  for (let k = 0; k < argv.length; k++) {
    if (argv[k].startsWith("--") && argv[k + 1] !== undefined && !argv[k + 1].startsWith("--"))
      args[argv[k].slice(2)] = argv[++k];
    else args._.push(argv[k]);
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = argsOf(process.argv.slice(2));
  const usage =
    "usage: node src/paragraph-plan-playground/sheet.mjs candidate --run <Brief run directory> --unit <candidate-N> [--moves-dir <dir>] [--out <file>]";
  const mode = args._[0];
  if (mode !== "candidate" || !args.run || !args.unit) {
    process.stderr.write(`${usage}\n`);
    process.exit(2);
  }
  const out = args.out ? resolve(args.out) : null;
  const outDir = out ? resolve(out, "..") : process.cwd();
  const r = renderCandidate({
    runDir: resolve(args.run),
    unitId: args.unit,
    movesDir: args["moves-dir"] || "moves",
    outDir,
  });
  if (r.error) {
    process.stderr.write(`paragraph-plan-playground: ${r.error}\n`);
    process.exit(1);
  }
  if (out) {
    writeFileSync(out, r.html);
    process.stderr.write(`paragraph-plan-playground: ${relFromRepo(out)}\n`);
  } else process.stdout.write(r.html);
}
