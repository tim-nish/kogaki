// draft/writer — the writer settings, the fresh call, the refusal readers and the writer record.
// Cut from src/draft.mjs at its named section (kogaki#1461); the design and
// its rulings are stated at the entry and in the Issues each block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the Leg Packet; the Section grouping; the figure
//       decision; the figure record; the renderer and the anchor; the
//       Brief's centre and its obligations ledger
//
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { MERMAID_FENCE } from "../render-figure.mjs";
import { resolveJudgeBinary } from "../workflow/judge.mjs";
import { fail, foreignStrandRefusal, scanForeignStrands, findTraceStructure } from "./brief-reader.mjs";

// ---------------------------------------------------------------------------
// FRESH CALL (kogaki#1237, owner decision 2026-09-30). `section` and `figure`
// render their input -- the Leg Packet; the Packet plus the figure block -- and
// hand it, as the ENTIRE stdin, to the command `src/draft-workflow.json`'s
// `writer` block declares, then record the response. The invoking session
// never sees the Packet and never writes the prose.
// THE TABLE IS HARNESS-OWNED AND REFUSES A MISSING KEY BY NAME: the keys are
// `src/brief-workflow.json`'s `judge` keys, none defaulted (kogaki#1030).
const DRAFT_TABLE = join(dirname(fileURLToPath(import.meta.url)), "..", "draft-workflow.json");
const WRITER_KEYS = ["command", "model", "effort", "output_format", "timeout_s", "retries"];
const WRITER_ACTS = ["section", "figure"];

// The refusal over a parsed table, or null. EXPORTED AND PURE so a check can
// drive it over a table it builds, without a file seam into the runtime.
function writerSettingsRefusal(table) {
  const at = "src/draft-workflow.json";
  const w = table && table.writer;
  if (!w || typeof w !== "object" || Array.isArray(w)) {
    return `${at} declares no \`writer\` block — Fresh Call runs the realization through a Harness-declared command, and a table without the block has no writer to call`;
  }
  for (const k of WRITER_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(w, k)) {
      return `${at}'s writer block declares no \`${k}\` — the block carries ${WRITER_KEYS.join(", ")}, each required rather than defaulted, so a missing one refuses the act by name`;
    }
  }
  for (const k of ["command", "model", "effort", "output_format"]) {
    if (typeof w[k] !== "string" || w[k] === "") return `${at}'s writer block's \`${k}\` is not a non-empty string`;
  }
  if (!Number.isFinite(w.timeout_s) || w.timeout_s <= 0) {
    return `${at}'s writer block declares no positive numeric \`timeout_s\` — the writer call is bounded per call, and an unbounded child is what the bound exists to refuse`;
  }
  if (!w.retries || typeof w.retries !== "object" || Array.isArray(w.retries)) {
    return `${at}'s writer block's \`retries\` is not an object keyed by act (${WRITER_ACTS.join(", ")})`;
  }
  for (const act of WRITER_ACTS) {
    const n = w.retries[act];
    if (!Number.isInteger(n) || n < 0) return `${at}'s writer block declares no non-negative integer \`retries.${act}\` — how many times a refused response is re-asked before the act fails naming the Leg`;
  }
  return null;
}

export function writerSettings() {
  let table;
  try { table = JSON.parse(readFileSync(DRAFT_TABLE, "utf8")); }
  catch (e) { fail(`the draft workflow table at ${DRAFT_TABLE} cannot be read (${e.message}) — it is a runtime-read carrier and the act has no built-in fallback, deliberately: a fallback writer would be a second copy nobody maintains`); }
  const bad = writerSettingsRefusal(table);
  if (bad) fail(bad);
  const w = table.writer;
  // `KOGAKI_JUDGE_CLI` REPLACES THE BINARY, FOR FIXTURES, and is resolved like
  // any other command (kogaki#1076): a stub that cannot answer `--version` is
  // a fixture running something the shipped path would refuse.
  const declared = process.env.KOGAKI_JUDGE_CLI || w.command;
  const binary = resolveJudgeBinary(String(declared), process.env.PATH);
  return { ...w, binary, stubbed: !!process.env.KOGAKI_JUDGE_CLI };
}

// The response's TEXT. `claude -p --output-format json` wraps the answer in an
// envelope whose `result` carries it; `text` is the answer itself.
function writerText(stdout, outputFormat) {
  if (outputFormat !== "json") return String(stdout);
  let env;
  try { env = JSON.parse(stdout); } catch (e) { return { error: `the writer's json response does not parse (${e.message})` }; }
  if (typeof env === "string") return env;
  if (env && typeof env === "object" && typeof env.result === "string") return env.result;
  return { error: "the writer's json response carries no string `result`" };
}

// ONE CALL, RE-ASKED WITH THE SAME INPUT UP TO THE DECLARED RETRIES. `refuse`
// is the act's own refusal over the response text (returning a message or
// null); a response it rejects is re-asked, and when the retries are spent the
// act fails NAMING THE LEG and the last refusal. The input is never changed
// between asks -- the Packet is the whole input, and re-reading the material is
// not what is wanted.
export function callWriter({ settings, act, legId, input, refuse }) {
  const attempts = 1 + settings.retries[act];
  const refused = [];
  for (let n = 1; n <= attempts; n++) {
    const r = spawnSync(settings.binary.path,
      ["-p", "--model", settings.model, "--output-format", settings.output_format,
        "--tools", "", "--disable-slash-commands", "--strict-mcp-config",
        "--setting-sources", "", "--no-session-persistence"],
      { input, encoding: "utf8", timeout: 1000 * settings.timeout_s, maxBuffer: 64 * 1024 * 1024 });
    if (r.error) {
      fail(`leg ${legId}: the writer (${settings.binary.path}) could not be run for \`${act}\` (${r.error.code || "spawn failed"}: ${r.error.message}) — attempt ${n} of ${attempts}`);
    }
    if (r.status !== 0) {
      const said = String(r.stderr || "").trim().split("\n")[0] || "(no stderr)";
      fail(`leg ${legId}: the writer exited ${r.status === null ? `on ${r.signal}` : r.status} for \`${act}\` — ${said}`);
    }
    const text = writerText(r.stdout, settings.output_format);
    // THE WRITER'S OWN REFUSAL (kogaki#1250, owner ruling 2026-10-04). A
    // response opening with `refusal: <reason>` is the writer declaring that
    // this waypoint cannot be reached from the material the Packet gave
    // it, or that material is missing — the act's FAILURE, never content, and
    // never a sentence of meta-commentary reaching the Draft in its place.
    // Checked ahead of `refuse` (which judges prose actually written) and
    // failed WITHOUT a retry: the Packet is the writer's whole input and is
    // not re-sent differently on the next ask, so an unchanged input cannot
    // turn a refusal into prose.
    const declaredRefusal = writerRefusal(text);
    if (declaredRefusal) {
      fail(`leg ${legId}: the writer refused \`${act}\` — ${declaredRefusal} — no ${act} is recorded, and this is not re-asked`);
    }
    const bad = (text && typeof text === "object" && text.error) ? text.error : refuse(text);
    if (!bad) return { text, attempts: n, refused };
    refused.push(bad);
  }
  fail(`leg ${legId}: the writer's \`${act}\` response was refused ${attempts} time(s) and the declared retries.${act}=${settings.retries[act]} are spent — the Leg is not recorded. Last refusal: ${refused[refused.length - 1]}`);
}

// THE DECLARED FORM, pure: a response whose FIRST LINE is `refusal: <reason>`
// is the writer's refusal of the act, not prose — the reason, or null if the
// response does not open with the form (kogaki#1250). First-line only: a
// refusal clause arriving later in otherwise-written prose is not this form,
// exactly as every other Packet field is read from the start of its own line.
export function writerRefusal(text) {
  if (typeof text !== "string") return null;
  const first = text.replace(/^﻿/, "").trimStart().split("\n")[0];
  const m = first.match(/^refusal:[ \t]*(\S.*?)\s*$/);
  return m ? m[1] : null;
}

// THE PROSE REFUSALS, one function, so the re-ask loop and a check read the
// same rule set: empty; a foreign Strand; record rendered as structure; a
// figure drawn in prose; a heading of the prose's own.
export function sectionProseRefusal(content, id, brief) {
  if (typeof content !== "string" || content.trim() === "") {
    return `the section for ${id} is empty — the writer returned no prose`;
  }
  const foreign = scanForeignStrands(content, brief.strands);
  if (foreign.length) return foreignStrandRefusal(foreign[0], brief.strands);
  const structural = findTraceStructure(content, brief.legs.map((s) => s.leg_id));
  if (structural.length) {
    return `the section for ${id} renders record as structure: ${structural[0]} — the per-Leg trace is frontmatter record, never visible structure in the body (SPEC-draft-command, the Brief's centre and its obligations ledger)`;
  }
  const quotable = content.replace(/^`{4,}[\s\S]*?^`{4,}[ \t]*$/gm, "");
  const drawn = quotable.match(new RegExp("^```[ \\t]*" + MERMAID_FENCE + "\\b", "mi"));
  if (drawn) {
    return `the section for ${id} draws its own figure (a \`\`\`${MERMAID_FENCE} fence) — after the renderer and the anchor a figure's markup is rendered by the Harness from the record \`figure --leg ${id}\` validated, and prose that draws one is a second author on a seat the Brief owns, exactly as a heading in the prose is (the Section grouping). `
      + `If this Leg should carry a figure, it is declared with \`figure:\` on the Brief (the figure decision) and designed after this prose; if it should not, remove the fence`;
  }
  const unfenced = content.replace(/^```[\s\S]*?^```[ \t]*$/gm, "");
  const heading = unfenced.match(/^(#{1,6})[ \t]+(\S.*?)[ \t]*$/m);
  if (heading) {
    return `the section for ${id} carries its own heading (${heading[0].trim()}) — after the Section grouping the heading is the Harness's, rendered once per Section at the Leg that declares opens_section, and prose that writes its own produces a second heading the Brief never declared. `
      + `Remove it: the Packet's write instruction says "No heading" for this reason`;
  }
  return null;
}

// A figure record out of a response: the JSON object, fences stripped, or the
// reason it is not one. The mechanical validation (`figureRecordRefusal`) runs
// on what this returns.
export function parseWriterRecord(text) {
  const stripped = String(text).trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  try { return { record: JSON.parse(stripped) }; }
  catch (e) { return { error: `the figure record is not readable JSON (${e.message}) — the record is one JSON object, the instance of the Leg's figure form` }; }
}
