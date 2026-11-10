// A table row's copies (kogaki#1764): each `{{copy:<name>}}` in a row's `judgment_point` replaced by the span of
// another table's field its `copies` entry names, so one text keeps one origin. Read by the Brief, the Leg-Planning
// Playground, the Proof Sheet and the Mapping Playground (kogaki#1768).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "./run-record.mjs";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);

// A ROW'S COPIES: each `{{copy:<name>}}` in its judgment point replaced by the text its `copies` entry names.
export function resolvedRow(table, id) {
  const row = table[id];
  if (!isMap(row)) return { error: `the table declares no \`${id}\` row` };
  let text = String(row.judgment_point);
  for (const [name, c] of Object.entries(row.copies || {})) {
    const source = JSON.parse(readFileSync(join(REPO, c.file), "utf8"));
    const field = String(((source[c.row] || {})[c.field]) ?? "");
    const open = field.indexOf(c.opens);
    const close = open < 0 ? -1 : field.indexOf(c.closes, open + c.opens.length);
    if (close < 0) return { error: `\`${id}\`'s copy \`${name}\`: ${c.file}'s \`${c.row}.${c.field}\` no longer carries ${JSON.stringify(c.opens)} … ${JSON.stringify(c.closes)}` };
    const token = `{{copy:${name}}}`;
    if (!text.includes(token)) return { error: `\`${id}\` declares the copy \`${name}\`, and its judgment point carries no ${token}` };
    text = text.split(token).join(field.slice(open, close + c.closes.length));
  }
  const left = /\{\{copy:([^}]+)\}\}/.exec(text);
  if (left) return { error: `\`${id}\`'s judgment point carries ${left[0]}, which its \`copies\` does not declare` };
  return { row: { ...row, id, judgment_point: text } };
}

