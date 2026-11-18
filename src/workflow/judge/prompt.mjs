// workflow/judge/prompt — the judge prompt: its markers, its refusal block, its record example and
// its text. Cut from src/workflow/judge.mjs along its headed sections (kogaki#1800); the design and
// its rulings are stated at the entry and in the Issues each block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { REPO, fail, flow } from "../run-record.mjs";
import { renderPromptFile } from "../../prompt-file.mjs";

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

// SHARED TEXT (kogaki#1452): a criterion two rows of one table must say identically is
// written ONCE, under the table's `shared_text`, and each row's text names it as
// `{{shared:<name>}}`. The row declares the table it reads that text from in
// `shared_text_file`, because this renderer is handed the row and never the table.
// An unknown name, or a reference with no file declared, fails rather than rendering
// the token: a criterion the model never sees is a criterion nobody enforces.
export const SHARED_TEXT_TOKEN = /\{\{shared:([A-Za-z0-9_]+)\}\}/g;
export const SHARED_TEXT_FIELDS = Object.freeze(["judgment_point", "input_shape", "refusal"]);

export function sharedTextOf(st) {
  const refs = SHARED_TEXT_FIELDS.some(
    (f) => typeof st[f] === "string" && new RegExp(SHARED_TEXT_TOKEN.source).test(st[f]),
  );
  if (!st.shared_text_file) {
    if (refs)
      fail(`${st.id}: the row names shared text and declares no \`shared_text_file\` to read it from (kogaki#1452).`);
    return null;
  }
  const sp = join(REPO, String(st.shared_text_file));
  if (!existsSync(sp))
    fail(`${st.id}: \`shared_text_file\` ${JSON.stringify(st.shared_text_file)} names no file (kogaki#1452).`);
  // A FOLDER UNDER prompts/ (kogaki#1855): `{{shared:<name>}}` is its file `_<name>.prompt`, underscores as hyphens.
  if (String(st.shared_text_file).startsWith("prompts/") && statSync(sp).isDirectory()) {
    const passages = readdirSync(sp).filter((f) => f.startsWith("_") && f.endsWith(".prompt"));
    return Object.fromEntries(
      passages.map((f) => [
        f.slice(1, -".prompt".length).replace(/-/g, "_"),
        readFileSync(join(sp, f), "utf8").replace(/\n$/, ""),
      ]),
    );
  }
  const shared = JSON.parse(readFileSync(sp, "utf8")).shared_text;
  if (!shared || typeof shared !== "object") {
    fail(`${st.id}: ${st.shared_text_file} declares no \`shared_text\` block (kogaki#1452).`);
  }
  return shared;
}

// THE AXES (kogaki#1533): a row whose criteria are a registry of one-sentence axes names
// that file in `axes_file`, and `{{axes}}` in its judgment point renders one
// `- <ID>: <sentence>` line per axis, in the registry's order. The criteria are written once,
// beside the fixtures and the bench run that justify each; a row naming the file without the
// token, or the token without the file, fails rather than rendering a judge with no criteria.
export const AXES_TOKEN = "{{axes}}";

export function axesOf(axesFile) {
  const p = resolve(REPO, String(axesFile));
  if (!existsSync(p)) fail(`\`axes_file\` ${JSON.stringify(axesFile)} names no file (kogaki#1533).`);
  const axes = JSON.parse(readFileSync(p, "utf8")).axes;
  if (!Array.isArray(axes) || !axes.length) fail(`${axesFile} declares no \`axes\` (kogaki#1533).`);
  return axes.map((a) => ({ id: String(a.id), sentence: String(a.sentence) }));
}

function withAxes(st) {
  const jp = typeof st.judgment_point === "string" ? st.judgment_point : "";
  const named = jp.includes(AXES_TOKEN);
  if (!st.axes_file && !named) return st;
  if (!st.axes_file)
    fail(`${st.id}: the judgment point names ${AXES_TOKEN} and the row declares no \`axes_file\` (kogaki#1533).`);
  if (!named)
    fail(`${st.id}: the row declares \`axes_file\` and its judgment point carries no ${AXES_TOKEN} (kogaki#1533).`);
  const lines = axesOf(st.axes_file)
    .map((a) => `- ${a.id}: ${a.sentence}`)
    .join("\n");
  // The rendered row drops `axes_file`, so a row rendered twice renders the same text.
  const { axes_file: _, ...rest } = st;
  return { ...rest, judgment_point: jp.replace(AXES_TOKEN, () => lines) };
}

// The row with its axes rendered and every `{{shared:<name>}}` in its three prompt fields
// replaced by the text the table declares once. Exported so a check reads the same text the
// model is shown.
export function withSharedText(row) {
  if (row.prompt_file) return withPromptFileText(row);
  const st = withAxes(row);
  const shared = sharedTextOf(st);
  if (!shared) return st;
  const out = { ...st };
  for (const f of SHARED_TEXT_FIELDS) {
    if (typeof st[f] !== "string") continue;
    out[f] = st[f].replace(SHARED_TEXT_TOKEN, (_, name) => {
      if (typeof shared[name] !== "string") {
        fail(
          `${st.id}: \`${f}\` names shared text ${JSON.stringify(name)}, which ${st.shared_text_file} does not declare (kogaki#1452).`,
        );
      }
      return shared[name];
    });
  }
  return out;
}

// A row carrying `prompt_file` (kogaki#1855): its three texts read from that file, each shared passage written in --
// each the text after its label up to the next label, and the refusal up to the shared passage `judge-closing`.
const PROMPT_FILE_LABELS = [
  ["judgment_point", "JUDGMENT POINT: "],
  ["input_shape", "\nREQUIRED RECORD SHAPE: "],
  ["refusal", "\nWHAT IS REFUSED: "],
];
function withPromptFileText(row) {
  const text = renderPromptFile(String(row.prompt_file), { flow_label: "", row_id: String(row.id), input: "" });
  const closing = text.lastIndexOf(`\n\n${renderPromptFile("_judge-closing", {})}`);
  const at = PROMPT_FILE_LABELS.map(([field, label]) => {
    const i = text.indexOf(label);
    if (i < 0)
      fail(
        `${row.id}: prompts/${row.prompt_file}.prompt carries no label ${JSON.stringify(label.trim())} for \`${field}\` (kogaki#1855).`,
      );
    return i + label.length;
  });
  if (closing < 0)
    fail(`${row.id}: prompts/${row.prompt_file}.prompt does not name the shared passage judge-closing (kogaki#1855).`);
  const ends = [at[1] - PROMPT_FILE_LABELS[1][1].length, at[2] - PROMPT_FILE_LABELS[2][1].length, closing];
  return { ...row, ...Object.fromEntries(PROMPT_FILE_LABELS.map(([field], i) => [field, text.slice(at[i], ends[i])])) };
}

// The prompt is composed FROM THE TABLE (judgment point, input shape, refusal text).
// COMPOSED PER CALL (kogaki#1059): `lastRefusal` -- the Call history, as
// `judgeRefusalBlock` takes it -- makes each re-ask a different ask.
// EXPORTED FOR THE DETACHED JOB (kogaki#1193): unit prompts use this one renderer.
export function judgePrompt(row, inputText, input, lastRefusal) {
  const asked = Array.isArray(lastRefusal) ? lastRefusal.length : lastRefusal;
  const head = { flow_label: flow().label, row_id: row.id };
  // A ROW CARRYING `prompt_file` IS THAT FILE (kogaki#1855): rendered through it and nothing else.
  if (row.prompt_file) {
    const reask = asked ? reaskValues(historyList(lastRefusal)) : {};
    return renderPromptFile(String(row.prompt_file), { ...head, ...reask, input: inputText });
  }
  const st = withSharedText(row);
  const L = [];
  L.push(withoutLineEnd(renderPromptFile("_judge-opening", head)));
  L.push("");
  L.push(`JUDGMENT POINT: ${st.judgment_point || st.id}`);
  L.push(`REQUIRED RECORD SHAPE: ${st.input_shape || "the typed record this state declares"}`);
  if (st.refusal) L.push(`WHAT IS REFUSED: ${st.refusal}`);
  // THE DECLARED SCHEMA, RENDERED VERBATIM (kogaki#1108). The validator reads its field
  // set from the same file, so the prompt and the refusal cannot disagree.
  // It stands ABOVE the input marker; everything past the marker is the composed input.
  // ONE ROW, ONE OR MANY FILES (kogaki#1126): each file whole, in order; a bare string
  // is the one-element list, so every pre-#1126 row reads unchanged.
  // Never fold two schemas into one file.
  // `schema_blocks` (kogaki#1307) names the top-level blocks of a ONE-file row to render,
  // each verbatim, for a row asking for one part of a file that also declares a shape this
  // judge is never asked for -- the per-unit Move-fit judge answers ONE specialization
  // record, and the file's `set` envelope is the adoption-level carrier, not its answer.
  const blocks = Array.isArray(st.schema_blocks) ? st.schema_blocks.map(String) : null;
  if (blocks && Array.isArray(st.schema_file)) {
    fail(`${st.id}: \`schema_blocks\` names blocks of ONE schema file, and this row declares several (kogaki#1307).`);
  }
  for (const declared of Array.isArray(st.schema_file) ? st.schema_file : st.schema_file ? [st.schema_file] : []) {
    const sp = join(REPO, String(declared));
    if (!existsSync(sp)) {
      fail(
        `${st.id}: the table declares \`schema_file\` ${JSON.stringify(declared)} and no such file ` +
          `exists. A judgment state that names a shape the judge is never shown is the prose-only prompt ` +
          `wearing a declaration (kogaki#1108).`,
      );
    }
    L.push("");
    if (blocks) {
      const whole = JSON.parse(readFileSync(sp, "utf8"));
      const missing = blocks.filter((b) => !(b in whole));
      if (missing.length) {
        fail(
          `${st.id}: \`schema_blocks\` names ${JSON.stringify(missing)}, which ${declared} does not declare (kogaki#1307).`,
        );
      }
      L.push(
        `THE SCHEMA THE ELEMENTS OF YOUR RECORD ARE FILLED AGAINST -- the blocks ${blocks.join(", ")} of ${declared}, verbatim.`,
      );
      L.push("Every field they declare, and what each one means. The refusals that judge your answer read");
      L.push("their field set from these same blocks, so what you are asked for and what is checked are one");
      L.push("text. Read them before composing.");
      L.push(JSON.stringify(Object.fromEntries(blocks.map((b) => [b, whole[b]])), null, 2));
      continue;
    }
    L.push(`THE SCHEMA THE ELEMENTS OF YOUR RECORD ARE FILLED AGAINST -- ${declared}, verbatim.`);
    L.push("Every field it declares, and what each one means. The refusals that judge your answer read");
    L.push("their field set from this same file, so what you are asked for and what is checked are one");
    L.push("text. Read it before composing.");
    L.push(readFileSync(sp, "utf8"));
  }
  const example = judgeRecordExample(st, input);
  if (example) {
    L.push("");
    L.push("THE LITERAL RECORD SHAPE, filled from THIS run's own composed input. Answer with a record");
    L.push("of exactly this shape: the same keys, the same nesting, and the same group names, with");
    L.push("each placeholder replaced by your judgment. The sentence above DESCRIBES the record; this");
    L.push("is the record.");
    L.push(JSON.stringify(example, null, 2));
  }
  L.push("");
  L.push(withoutLineEnd(renderPromptFile("_judge-closing", {})));
  if (asked) {
    L.push(judgeRefusalBlock(lastRefusal));
  }
  L.push("");
  // THE MARKER IS PART OF THE CONTRACT, not decoration. Everything after it is
  // the input file verbatim, so a reader — the judge, or a fixture stub standing
  // in for one — can find the input by position rather than by scanning for a
  // brace that the state's own `input_shape` text might also contain.
  L.push(JUDGE_INPUT_MARKER);
  L.push(inputText);
  return L.join("\n");
}
