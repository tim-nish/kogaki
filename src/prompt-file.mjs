// The one renderer of a file under prompts/: kogaki#1855.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const PROMPTS = join(dirname(fileURLToPath(import.meta.url)), "..", "prompts");
const BLOCKS = new Set(["each", "if"]);
const require = createRequire(import.meta.url);

function promptFiles(dir = PROMPTS) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? promptFiles(join(dir, e.name)) : e.name.endsWith(".prompt") ? [join(dir, e.name)] : [],
  );
}

function passageName(file) {
  const rel = relative(PROMPTS, file).split(sep).join("/");
  const at = rel.lastIndexOf("/");
  return `${rel.slice(0, at + 1)}${rel.slice(at + 2, -".prompt".length)}`;
}

function fileText(file) {
  const text = readFileSync(file, "utf8");
  return text.endsWith("\n") ? text.slice(0, -1) : text;
}

function marksRefused(Handlebars, source, at, names) {
  const refused = [];
  const visit = (node) => {
    const mark = source.slice(node.loc ? lineOffset(source, node.loc.start) : 0).split("}}")[0] + "}}";
    switch (node.type) {
      case "Program":
        node.body.forEach(visit);
        return;
      case "ContentStatement":
        return;
      case "CommentStatement":
        if (!/^\{\{!--/.test(mark)) refused.push(mark);
        return;
      case "MustacheStatement":
        if (!node.escaped || node.params.length || node.hash || !plainPath(node.path) || /^\{\{~|~\}\}$/.test(mark))
          refused.push(mark);
        return;
      case "BlockStatement":
        if (
          node.path.type !== "PathExpression" ||
          !BLOCKS.has(node.path.original) ||
          node.params.length !== 1 ||
          node.hash ||
          !plainPath(node.params[0]) ||
          (node.path.original === "each" && node.inverse) ||
          node.openStrip.open ||
          node.openStrip.close ||
          node.closeStrip.open ||
          node.closeStrip.close ||
          (node.inverseStrip && (node.inverseStrip.open || node.inverseStrip.close))
        )
          refused.push(mark);
        if (node.program) visit(node.program);
        if (node.inverse) visit(node.inverse);
        return;
      case "PartialStatement":
        if (node.params.length || node.hash || node.name.type !== "PathExpression" || /^\{\{~|~\}\}$/.test(mark))
          refused.push(mark);
        else if (!names.has(node.name.original)) refused.push(`${mark} (no such shared passage)`);
        return;
      default:
        refused.push(mark);
    }
  };
  visit(Handlebars.parse(source));
  return refused.map((m) => `${at}: ${m}`);
}

function plainPath(p) {
  return p.type === "PathExpression" && !p.data && p.depth === 0 && !p.this_ && /^[A-Za-z_][\w.]*$/.test(p.original);
}

function lineOffset(source, { line, column }) {
  let at = 0;
  for (let n = 1; n < line; n++) at = source.indexOf("\n", at) + 1;
  return at + column;
}

/** @param {string} name @param {Record<string, unknown>} values @returns {string} */
export function renderPromptFile(name, values) {
  const file = join(PROMPTS, `${name}.prompt`);
  if (!existsSync(file)) throw new Error(`prompts/${name}.prompt: no such prompt file`);
  const passages = new Map(
    promptFiles()
      .filter((f) => f.split(sep).pop().startsWith("_"))
      .map((f) => [passageName(f), f]),
  );
  const names = new Set(passages.keys());
  const Handlebars = require("handlebars");
  const hb = Handlebars.create();
  const refused = [];
  for (const [n, f] of passages) {
    const text = fileText(f);
    refused.push(...marksRefused(Handlebars, text, relative(join(PROMPTS, ".."), f), names));
    hb.registerPartial(n, text);
  }
  const source = fileText(file);
  refused.push(...marksRefused(Handlebars, source, `prompts/${name}.prompt`, names));
  if (refused.length) throw new Error(`a prompt file uses a mark outside the six it may use: ${refused.join("; ")}`);
  try {
    return hb.compile(source, { noEscape: true, strict: true, knownHelpersOnly: true })(values);
  } catch (e) {
    throw new Error(`prompts/${name}.prompt: ${e.message}`, { cause: e });
  }
}

/** The path of a file under prompts/. @param {string} name @returns {string} */
export const promptFilePath = (name) => join(PROMPTS, `${name}.prompt`);

/** The text of a file under prompts/, its marks unrendered. @param {string} name @returns {string} */
export function promptFileSource(name) {
  const file = promptFilePath(name);
  if (!existsSync(file)) throw new Error(`prompts/${name}.prompt: no such prompt file`);
  return fileText(file);
}

// One sentence: it ends at its only full stop.
const oneSentence = (text) => /[.]$/.test(text) && !/[.;!?]\s/.test(text);

// ONE RESPONSIBILITY, ONE SENTENCE (kogaki#1858): no `;`, `:` or ` — `, and no second finite clause
// joined by "and". Declared limit: the clause test is lexical -- `and` followed within
// two words by a verb from `AND_CLAUSE_VERBS`, or `, and` anywhere.
const AND_CLAUSE_VERBS =
  "is|are|was|were|has|have|holds?|states?|carries|carry|gives?|leaves?|runs?|bears?|stands?|survives?|performs?|names?|says?|takes?";
const AND_CLAUSE = new RegExp(`,\\s*and\\b|\\band\\s+(?:\\S+\\s+){0,2}(?:${AND_CLAUSE_VERBS})\\b`, "i");

/** Why a line of a prompt file is not one sentence with one job, or null. @param {string} sentence @returns {string | null} */
export function sentenceRefusal(sentence) {
  const t = String(sentence || "").trim();
  if (!t) return "carries no sentence";
  if (/[;:]/.test(t)) return "carries `;` or `:`";
  if (t.includes(" — ")) return "carries ` — `";
  if (!oneSentence(t)) return "is not one sentence";
  if (AND_CLAUSE.test(t)) return 'joins a second clause with "and"';
  return null;
}
