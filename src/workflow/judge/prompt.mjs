// workflow/judge/prompt — the judge prompt: its markers, its refusal block, its record example and
// its text. Cut from src/workflow/judge.mjs along its headed sections (kogaki#1800); the design and
// its rulings are stated at the entry and in the Issues each block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { INSTRUCTION_KEYS, REPO, fail, flow } from "../run-record.mjs";
import { promptFileSource, renderPromptFile } from "../../prompt-file.mjs";

// Everything after this line in a judge prompt is the input file, verbatim.
export const JUDGE_INPUT_MARKER = "----- INPUT (JSON) -----";

// AND EVERYTHING BETWEEN THESE LINES IS A PRIOR CALL'S ANSWER AND ITS REFUSAL,
// verbatim (kogaki#1059, the answer since kogaki#1438). They appear only on a re-ask, and
// BEFORE the input marker, because the input marker's own contract is that everything
// after it is the input file — a refusal appended past it would be read as input by any
// reader keying on position, which is the one thing that marker promises. The block's text is
// prompts/_judge-reask.prompt; these stay here so `readJudgePrompt` can read a prompt back.
const JUDGE_REFUSAL_MARKER = "----- IT WAS REFUSED -----";

// The reach of a refusal: kogaki#1708.
export const REFUSAL_REACHES = ["part", "record", "stop"];

// A refusal's group and reach under its row: kogaki#1708.
export function refusalReach(row, refusal) {
  const grouped = refusal && typeof refusal === "object";
  const text = grouped ? String(refusal.text) : String(refusal);
  const group = grouped ? (refusal.group ?? null) : null;
  const declared = row && row.refusal_reach;
  if (!declared) return { group, reach: null, text };
  if (!Object.hasOwn(declared, group)) return { group, reach: "stop", text, undeclared: true };
  if (!REFUSAL_REACHES.includes(declared[group])) {
    throw new Error(
      `the row's refusal_reach maps ${JSON.stringify(group)} to ${JSON.stringify(declared[group])}; a reach is one of ${REFUSAL_REACHES.join(", ")} (kogaki#1708).`,
    );
  }
  return { group, reach: declared[group], text };
}

// EVERY CALL, OLDEST FIRST, AS ITS ANSWER AND ITS REFUSAL (kogaki#1395, the answer since
// kogaki#1438): `history` is an array of `{ answer, refusal }`, and a bare string -- the
// shape before kogaki#1438 -- is REFUSED BY NAME, so no caller silently renders a refusal
// about a record the model cannot see. `judgePrompt` below is this block's only renderer,
// and the detached job supervisor's retry prompt (`readerPathUnitRetryPrompt`,
// `detached-job.mjs`) splices this SAME text rather than re-rendering it, which is what
// keeps a unit's retry and a synchronous judge's own re-ask byte-identical over the same
// row, input and history (`checks/check-brief-reader-path-job.sh` assertion (k)).
export function judgeRefusalBlock(history) {
  return `\n${withoutLineEnd(renderPromptFile("_judge-reask", reaskValues(historyList(history))))}`;
}

function historyList(history) {
  const list = Array.isArray(history) ? history : [history];
  const bare = list.findIndex((h) => !h || typeof h !== "object" || Array.isArray(h) || typeof h.refusal !== "string");
  if (bare >= 0) {
    throw new Error(
      `judgeRefusalBlock: entry ${bare + 1} is ${JSON.stringify(list[bare])}, not a ` +
        "`{ answer, refusal }` pair. A retry carries the refused answer beside its refusal (kogaki#1438); " +
        "a bare refusal string is the retired shape and is refused rather than rendered without its answer.",
    );
  }
  return list;
}

// The values of prompts/_judge-reask.prompt: each call's answer and refusal, and which sentence follows them.
// The sentence follows the latest refusal's reach (kogaki#1708); an entry with no reach is `part`.
function reaskValues(list) {
  const reach = list[list.length - 1].reach ?? "part";
  if (reach !== "part" && reach !== "record") {
    throw new Error(
      `judgeRefusalBlock: the latest refusal's reach is ${JSON.stringify(reach)}; a retry renders only ` +
        "`part` or `record`, and a `stop` refusal is never put back (kogaki#1708).",
    );
  }
  return {
    history: list.map((h, i) => ({
      call: i + 1,
      answer: h.answer === undefined || h.answer === null ? null : JSON.stringify(h.answer, null, 2),
      refusal: h.refusal,
    })),
    ...(reach === "record" ? { whole_new_record: true } : {}),
  };
}

const withoutLineEnd = (text) => (text.endsWith("\n") ? text.slice(0, -1) : text);

// A JUDGE PROMPT, READ BACK (kogaki#1756): its judgment point, its input, and on a re-ask each refusal it was
// handed and the sentence appended after them, all verbatim. `null` for a part the prompt does not carry.
export function readJudgePrompt(prompt) {
  const p = String(prompt ?? "");
  const at = p.lastIndexOf(`${JUDGE_INPUT_MARKER}\n`);
  let input = null;
  if (at >= 0) {
    try {
      input = JSON.parse(p.slice(at + JUDGE_INPUT_MARKER.length + 1));
    } catch {
      input = null;
    }
  }
  const head = at >= 0 ? p.slice(0, at) : p;
  const jp = /^JUDGMENT POINT: ([\s\S]*?)\nREQUIRED RECORD SHAPE: /m.exec(head);
  const parts = head.split(`\n${JUDGE_REFUSAL_MARKER}\n`);
  const instruction = parts.length < 2 ? null : (head.trimEnd().split("\n\n").pop() ?? null);
  const ends = [/\n\n----- YOUR PREVIOUS ANSWER \(call \d+\) -----\n/, ...(instruction ? [`\n\n${instruction}`] : [])];
  const refusals =
    parts.length < 2
      ? []
      : parts.slice(1).map((seg) => {
          const cuts = ends.map((e) => (typeof e === "string" ? seg.indexOf(e) : seg.search(e))).filter((i) => i >= 0);
          return cuts.length ? seg.slice(0, Math.min(...cuts)) : seg;
        });
  return { judgmentPoint: jp ? jp[1] : null, input, refusals, instruction };
}

// THE FILLED RECORD EXAMPLE (kogaki#1059): built from the run's own composed input
// (`composition_pin`, the composed group names), never a hand-written literal.
// Table-driven; two directives, each refused by name:
//   "$input:<key>"          the composed input's top-level <key>, verbatim
//   "$per-group:<text>"     an object mapping each composed group's name to <text>
// Any other value is a literal; any other `$`-prefixed string is a REFUSAL.
function judgeRecordExample(st, input) {
  const tpl = st.record_example;
  if (tpl === undefined || tpl === null) return null;
  if (typeof tpl !== "object" || Array.isArray(tpl)) {
    fail(
      `${st.id}: \`record_example\` must be a JSON object whose values are literals or one of the ` +
        "two directives `$input:<key>` and `$per-group:<text>` (kogaki#1059).",
    );
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail(
      `${st.id}: \`record_example\` is declared and this state's composed input is not a JSON ` +
        "object, so the example cannot be filled from the run's own material. An example filled from " +
        "anything else would put a shape in front of the judge that this run never composed " +
        "(kogaki#1059).",
    );
  }
  // `$per-group` AS THE SOLE KEY, WHOSE VALUE IS THE TEMPLATE (kogaki#1062).
  // This is the SAME directive as the string form below, not a third one: what
  // widens is WHERE it may stand. `J1_claims`' record wraps its per-group map
  // under a `claims` key, so the string form under an ordinary key expresses it;
  // `J2_subdivision`'s record IS the per-group map, and its entries are OBJECTS
  // rather than sentences. Neither is expressible as a value under a key, so a
  // state whose whole record is the map had no way to bind its shape by example
  // and stayed bound by prose — which is the defect kogaki#1059 closed for its
  // sibling and this state still carried.
  const soleKeys = Object.keys(tpl);
  if (soleKeys.length === 1 && soleKeys[0] === "$per-group") {
    if (!Array.isArray(input.groups)) {
      fail(
        `${st.id}: \`record_example\` is the per-group map itself, and the composed input carries ` +
          "no `groups` array to name its keys (kogaki#1062).",
      );
    }
    return Object.fromEntries(input.groups.map((g) => [String(g && g.name), tpl["$per-group"]]));
  }
  const out = {};
  for (const [key, value] of Object.entries(tpl)) {
    if (typeof value !== "string" || !value.startsWith("$")) {
      out[key] = value;
      continue;
    }
    const at = value.indexOf(":");
    const directive = at < 0 ? value : value.slice(0, at);
    const arg = at < 0 ? "" : value.slice(at + 1).trim();
    if (directive === "$input") {
      if (!Object.prototype.hasOwnProperty.call(input, arg)) {
        fail(
          `${st.id}: \`record_example\` fills \`${key}\` from the composed input's \`${arg}\`, and ` +
            "the input carries no such key. The example binds the shape the validator reads, so an " +
            "example filled from a key that is not there is worse than none (kogaki#1059).",
        );
      }
      out[key] = input[arg];
    } else if (directive === "$per-group") {
      if (!Array.isArray(input.groups)) {
        fail(
          `${st.id}: \`record_example\` fills \`${key}\` with one entry per composed group, and the ` +
            "composed input carries no `groups` array to name them (kogaki#1059).",
        );
      }
      out[key] = Object.fromEntries(input.groups.map((g) => [String(g && g.name), arg]));
    } else {
      fail(
        `${st.id}: \`record_example\` names the unknown directive \`${directive}\`. The two are ` +
          "`$input:<key>` and `$per-group:<text>`, and a third is added by ruling rather than by " +
          "spelling (kogaki#1059).",
      );
    }
  }
  return out;
}

// A ROW'S INSTRUCTION IS ITS PROMPT FILE (kogaki#1862): a row carrying one of these keys is refused, naming the key.
export { INSTRUCTION_KEYS } from "../run-record.mjs";

function refuseInstruction(row) {
  const key = INSTRUCTION_KEYS.find((k) => Object.hasOwn(row, k));
  if (key)
    fail(`${row.id}: the row carries \`${key}\`; its instruction is its prompt file under prompts/ (kogaki#1862).`);
  if (!row.prompt_file) fail(`${row.id}: the row names no \`prompt_file\` under prompts/ (kogaki#1862).`);
}

// The shared passages a row's prompt file names, outside the judge's own, by name with `_` for `-`: kogaki#1862.
export function passagesOf(row) {
  const source = promptFileSource(String(row.prompt_file));
  const names = [...source.matchAll(/\{\{> ([\w/-]+)\}\}/g)].map((m) => m[1]).filter((n) => !n.startsWith("judge-"));
  return Object.fromEntries(
    [...new Set(names)].map((n) => [
      n.slice(n.lastIndexOf("/") + 1).replace(/-/g, "_"),
      renderPromptFile(passagePath(n), {}),
    ]),
  );
}

const passagePath = (name) => {
  const at = name.lastIndexOf("/") + 1;
  return `${name.slice(0, at)}_${name.slice(at)}`;
};

// The values of the schema passages (kogaki#1108, kogaki#1126, kogaki#1307): one file, whole or by its named blocks.
function schemaValues(st) {
  if (!st.schema_file) return {};
  const files = Array.isArray(st.schema_file) ? st.schema_file : [st.schema_file];
  if (files.length !== 1)
    fail(`${st.id}: a prompt file shows one schema file, and this row declares ${files.length} (kogaki#1862).`);
  const declared = String(files[0]);
  const sp = join(REPO, declared);
  if (!existsSync(sp)) {
    fail(
      `${st.id}: the table declares \`schema_file\` ${JSON.stringify(declared)} and no such file ` +
        `exists. A judgment state that names a shape the judge is never shown is the prose-only prompt ` +
        `wearing a declaration (kogaki#1108).`,
    );
  }
  if (!Array.isArray(st.schema_blocks)) return { schema_path: declared, schema_text: readFileSync(sp, "utf8") };
  const blocks = st.schema_blocks.map(String);
  const whole = JSON.parse(readFileSync(sp, "utf8"));
  const missing = blocks.filter((b) => !(b in whole));
  if (missing.length) {
    fail(
      `${st.id}: \`schema_blocks\` names ${JSON.stringify(missing)}, which ${declared} does not declare (kogaki#1307).`,
    );
  }
  return {
    schema_path: declared,
    schema_blocks: blocks.join(", "),
    schema_text: JSON.stringify(Object.fromEntries(blocks.map((b) => [b, whole[b]])), null, 2),
  };
}

// A row declaring a schema or a record example whose prompt file does not show it is refused: kogaki#1862.
function refuseUnshown(st, values) {
  const source = promptFileSource(String(st.prompt_file));
  const shows = (n) => source.includes(`{{> ${n}}}`);
  if (values.schema_text !== undefined && !shows(values.schema_blocks ? "judge-schema-blocks" : "judge-schema"))
    fail(
      `${st.id}: the row declares \`schema_file\` and prompts/${st.prompt_file}.prompt does not show it (kogaki#1862).`,
    );
  if (values.record_example !== undefined && !shows("judge-record-example"))
    fail(
      `${st.id}: the row declares \`record_example\` and prompts/${st.prompt_file}.prompt does not show it (kogaki#1862).`,
    );
}

// The row with its three texts read from its prompt file: each the text after its label, the refusal up to the first
// passage after it. Exported so a check reads the same text the model is shown.
const PROMPT_FILE_LABELS = [
  ["judgment_point", "JUDGMENT POINT: "],
  ["input_shape", "\nREQUIRED RECORD SHAPE: "],
  ["refusal", "\nWHAT IS REFUSED: "],
];
const AFTER_REFUSAL = ["_judge-schema", "_judge-schema-blocks", "_judge-record-example", "_judge-closing"];
const BLANK = { schema_path: "", schema_text: "", schema_blocks: "", record_example: "" };

export function withPromptText(row) {
  refuseInstruction(row);
  const text = renderPromptFile(String(row.prompt_file), {
    ...BLANK,
    flow_label: "",
    row_id: String(row.id),
    input: "",
  });
  const at = PROMPT_FILE_LABELS.map(([field, label]) => {
    const i = text.indexOf(label);
    if (i < 0)
      fail(
        `${row.id}: prompts/${row.prompt_file}.prompt carries no label ${JSON.stringify(label.trim())} for \`${field}\` (kogaki#1855).`,
      );
    return i + label.length;
  });
  const ends = AFTER_REFUSAL.map((p) => text.indexOf(`\n\n${renderPromptFile(p, BLANK).split("\n")[0]}`, at[2])).filter(
    (i) => i >= 0,
  );
  if (!ends.length)
    fail(`${row.id}: prompts/${row.prompt_file}.prompt does not name the shared passage judge-closing (kogaki#1855).`);
  const bounds = [at[1] - PROMPT_FILE_LABELS[1][1].length, at[2] - PROMPT_FILE_LABELS[2][1].length, Math.min(...ends)];
  return {
    ...row,
    ...Object.fromEntries(PROMPT_FILE_LABELS.map(([field], i) => [field, text.slice(at[i], bounds[i])])),
  };
}

// The prompt is the row's prompt file, rendered per call (kogaki#1855, kogaki#1862): its schema and record example are
// values of the file's passages, and `lastRefusal` -- the Call history, as `judgeRefusalBlock` takes it -- makes each
// re-ask a different ask. EXPORTED FOR THE DETACHED JOB (kogaki#1193): unit prompts use this one renderer.
export function judgePrompt(row, inputText, input, lastRefusal) {
  refuseInstruction(row);
  const asked = Array.isArray(lastRefusal) ? lastRefusal.length : lastRefusal;
  const example = judgeRecordExample(row, input);
  const values = {
    ...schemaValues(row),
    ...(example ? { record_example: JSON.stringify(example, null, 2) } : {}),
  };
  refuseUnshown(row, values);
  const reask = asked ? reaskValues(historyList(lastRefusal)) : {};
  return renderPromptFile(String(row.prompt_file), {
    flow_label: flow().label,
    row_id: row.id,
    ...values,
    ...reask,
    input: inputText,
  });
}
