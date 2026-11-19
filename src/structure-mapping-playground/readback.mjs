// THE READBACK AND THE SAMPLE OF EACH PART (kogaki#1882): what one call says the plan tells the Writer to do in each part,
// and the one sentence it would write there. The answer is shown on the Trial's sheet and never handed to the Writer.
import { renderPromptFile } from "../prompt-file.mjs";

export const READBACK_STAGE = "readback";
export const READBACK_FILE = "readback.json";
export const READBACK_PROMPT = "structure-mapping-playground/read-back-parts";
export const PLAN_HEADING = "## The plan of this paragraph";

// The Writer's plan block, byte for byte: from its heading up to the line before the next line opening "## ".
export function planBlock(packet) {
  const lines = String(packet).split("\n");
  const at = lines.indexOf(PLAN_HEADING);
  if (at < 0) return { error: `the Writer's input carries no line "${PLAN_HEADING}"` };
  const next = lines.findIndex((l, i) => i > at && l.startsWith("## "));
  return { block: lines.slice(at, next < 0 ? lines.length : next).join("\n") };
}

// Each part's line of the plan, as the Writer is handed it, in order.
export const partLines = (block) => block.split("\n").filter((l) => /^\d+\. /.test(l));

export const readbackPrompt = (block) => renderPromptFile(READBACK_PROMPT, { plan: block });

const isText = (v) => typeof v === "string" && v.trim() !== "";
const isMap = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** The answer as one record, or why it is not one. @param {string} text */
export function readbackAnswer(text) {
  const stripped = String(text)
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/, "");
  try {
    return { record: JSON.parse(stripped) };
  } catch (e) {
    return { refusal: `the answer is not one JSON record (${e.message})` };
  }
}

/** Why the answer is refused for a plan of `count` parts, or null. */
export function readbackRefusal(answer, count) {
  if (!isMap(answer) || Object.keys(answer).join() !== "parts")
    return 'the answer is not the record { "parts": [...] } and nothing else';
  const { parts } = answer;
  if (!Array.isArray(parts) || parts.length !== count)
    return `\`parts\` is not one entry for each of the plan's ${count} parts`;
  for (const [i, p] of parts.entries()) {
    const n = i + 1;
    if (!isMap(p) || Object.keys(p).sort().join() !== "part,readback,sample")
      return `entry ${n} is not { "part", "readback", "sample" }`;
    if (p.part !== n) return `entry ${n} names part ${JSON.stringify(p.part)}, and the parts are in order`;
    for (const key of ["readback", "sample"])
      if (p[key] !== null && !isText(p[key])) return `part ${n}'s \`${key}\` is neither one non-empty text nor null`;
    if (p.readback === null && p.sample !== null) return `part ${n} has a \`sample\` and no \`readback\``;
  }
  return null;
}
