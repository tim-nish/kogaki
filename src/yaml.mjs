// yaml — the one writer and the one reader of the Brief record (kogaki#1328).
//
// WHY A MODULE OF OUR OWN, AND NOT A PACKAGE. The suite runs in CI with no
// `npm install` (`.github/workflows/checks.yml`), and `package.json` states
// that nothing outside the Japanese Lint carries an npm dependency. A Brief
// reader that imported a package would load in this checkout and fail in CI,
// and every command that reads the Brief — the Draft, the review, the Packet —
// would fail with it.
//
// WHAT IT COVERS. The writer emits a fixed, small subset: block maps and
// sequences, plain scalars, double-quoted scalars, folded block scalars, flow
// sequences of short scalars, and full-line comments. The reader reads that
// subset and what a person editing the file by hand is likely to write beside
// it: literal block scalars, single-quoted scalars, plain scalars continued on
// the next line, trailing comments. Anything else — an anchor, an alias, a tag,
// a complex key, a second document, a tab in indentation, a flow map with
// content — is REFUSED BY NAME with its line number, never read as something
// it is not.
//
// THE LINE BOUND. `stringifyYaml` takes a `width` and writes no line longer
// than it: a long string is folded at spaces, and a run of characters with no
// space that does not fit (a served address at its content hash) is written
// double-quoted and broken with YAML's escaped line break, which joins with
// nothing. `stringifyYaml(v)` read back by `parseYaml` is `v`.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const INDENT = 2;

// ---------------------------------------------------------------------------
// The writer.

const RESERVED_PLAIN = /^(?:~|null|Null|NULL|true|True|TRUE|false|False|FALSE|y|Y|yes|Yes|YES|n|N|no|No|NO|on|On|ON|off|Off|OFF)$/;
const NUMBERISH = /^[-+]?(?:\.?[0-9][0-9_]*(?:\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\.(?:inf|Inf|INF|nan|NaN|NAN)|0x[0-9a-fA-F]+|0o[0-7]+)$/;

function plainSafe(s) {
  if (s === "" || s !== s.trim()) return false;
  if (/[\n\r\t\u0000-\u001f\u007f]/.test(s)) return false;
  if (RESERVED_PLAIN.test(s) || NUMBERISH.test(s)) return false;
  if (/^[-?:,[\]{}#&*!|>'"%@`]/.test(s)) return false;
  if (/: |:$| #/.test(s)) return false;
  if (/^(?:---|\.\.\.)/.test(s)) return false;
  return true;
}

// The flow form is narrower still: a comma or a bracket ends a flow item.
function flowSafe(s) {
  return typeof s === "string" && plainSafe(s) && !/[,[\]{}]/.test(s);
}

function quote(s) {
  let out = "\"";
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch === "\"") out += "\\\"";
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\t") out += "\\t";
    else if (ch === "\r") out += "\\r";
    else if (c < 0x20 || c === 0x7f) out += `\\x${c.toString(16).padStart(2, "0")}`;
    else out += ch;
  }
  return out + "\"";
}

function scalarInline(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error(`stringifyYaml: ${v} has no YAML form here`);
    return String(v);
  }
  if (typeof v === "string") return plainSafe(v) ? v : quote(v);
  throw new Error(`stringifyYaml: a ${typeof v} is not a scalar`);
}

// Words of a paragraph, broken only at a single space between two non-space
// characters: that space is what a fold puts back, and a break anywhere else
// would read back as a different string.
function wrapAtSpaces(text, avail) {
  const lines = [];
  let rest = text;
  while (rest.length > avail) {
    let at = -1;
    for (let k = Math.min(avail, rest.length - 1); k > 0; k--) {
      if (rest[k] === " " && rest[k - 1] !== " " && rest[k + 1] !== undefined && rest[k + 1] !== " ") { at = k; break; }
    }
    if (at === -1) return null;
    lines.push(rest.slice(0, at));
    rest = rest.slice(at + 1);
  }
  lines.push(rest);
  return lines;
}

// A folded block (`>-`) reads back exactly when no paragraph starts or ends
// with whitespace, none carries a tab or a doubled space, and none is empty.
function foldedLines(s, avail) {
  if (s.endsWith("\n") || /[\t\r\u0000-\u0008\u000b-\u001f\u007f]/.test(s)) return null;
  const paras = s.split("\n");
  const out = [];
  for (const [i, p] of paras.entries()) {
    if (p === "" || p !== p.trim() || p.includes("  ")) return null;
    const wrapped = wrapAtSpaces(p, avail);
    if (!wrapped) return null;
    if (i > 0) out.push("");
    out.push(...wrapped);
  }
  return out;
}

// A double-quoted string broken across lines: at a single space where one
// exists (the fold puts the space back), otherwise with an escaped line break
// (`\` at the end of the line), which YAML joins with nothing.
function quotedLines(s, firstAvail, avail) {
  const q = quote(s);
  const lines = [];
  let rest = q;
  let width = firstAvail;
  while (rest.length > width) {
    let at = -1;
    for (let k = Math.min(width, rest.length - 1); k > 0; k--) {
      if (rest[k] === " " && rest[k - 1] !== " " && rest[k + 1] !== undefined && rest[k + 1] !== " "
        && !escapedAt(rest, k)) { at = k; break; }
    }
    if (at !== -1) {
      lines.push(rest.slice(0, at));
      rest = rest.slice(at + 1);
    } else {
      // A hard break: never inside an escape sequence, never before a space
      // (leading whitespace on a continuation line is dropped on read).
      let k = width - 1;
      while (k > 1 && (escapedAt(rest, k) || rest[k] === " " || rest[k - 1] === "\\")) k--;
      lines.push(`${rest.slice(0, k)}\\`);
      rest = rest.slice(k);
    }
    width = avail;
  }
  lines.push(rest);
  return lines;
}

// Whether position `k` of a quoted rendering sits inside an escape sequence.
function escapedAt(s, k) {
  let i = 1;
  while (i < k) {
    if (s[i] === "\\") {
      const n = s[i + 1];
      const len = n === "x" ? 4 : n === "u" ? 6 : n === "U" ? 10 : 2;
      if (k > i && k < i + len) return true;
      i += len;
    } else i++;
  }
  return false;
}

function emitString(s, prefix, indent, width, out) {
  const inline = scalarInline(s);
  if (prefix.length + inline.length <= width) { out.push(prefix + inline); return; }
  const pad = " ".repeat(indent);
  const folded = foldedLines(s, width - indent);
  if (folded) {
    out.push(`${prefix}>-`);
    for (const l of folded) out.push(l === "" ? "" : pad + l);
    return;
  }
  const lines = quotedLines(s, width - prefix.length, width - indent);
  out.push(prefix + lines[0]);
  for (const l of lines.slice(1)) out.push(pad + l);
}

function isMap(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }

function keyText(k) {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(k) && !RESERVED_PLAIN.test(k) ? k : quote(k);
}

function commentLines(text, indent, width) {
  const pad = " ".repeat(indent);
  const out = [];
  for (const para of String(text).split("\n")) {
    const wrapped = wrapAtSpaces(para.replace(/\s+/g, " ").trim(), width - indent - 2) || [para];
    for (const l of wrapped) out.push(`${pad}# ${l}`.trimEnd());
  }
  return out;
}

function emitValue(v, prefix, indent, width, out) {
  if (Array.isArray(v)) {
    if (v.length === 0) { out.push(`${prefix}[]`); return; }
    if (v.every(flowSafe)) {
      const flow = `${prefix}[${v.join(", ")}]`;
      if (flow.length <= width) { out.push(flow); return; }
    }
    out.push(prefix.trimEnd());
    emitSeq(v, indent, width, out);
    return;
  }
  if (isMap(v)) {
    const keys = Object.keys(v).filter((k) => v[k] !== undefined);
    if (keys.length === 0) { out.push(`${prefix}{}`); return; }
    out.push(prefix.trimEnd());
    emitMap(v, indent, width, out);
    return;
  }
  if (typeof v === "string") { emitString(v, prefix, indent, width, out); return; }
  out.push(prefix + scalarInline(v));
}

function emitMap(m, indent, width, out, comments = null) {
  const pad = " ".repeat(indent);
  for (const k of Object.keys(m)) {
    if (m[k] === undefined) continue;
    if (comments && comments.has(k)) out.push(...commentLines(comments.get(k), indent, width));
    emitValue(m[k], `${pad}${keyText(k)}: `, indent + INDENT, width, out);
  }
}

function emitSeq(a, indent, width, out) {
  const pad = " ".repeat(indent);
  for (const item of a) {
    if (isMap(item) && Object.keys(item).some((k) => item[k] !== undefined)) {
      // The compact form: the first key on the dash's own line, the rest
      // aligned under it.
      const sub = [];
      emitMap(item, indent + INDENT, width, sub);
      sub[0] = `${pad}- ${sub[0].slice(indent + INDENT)}`;
      out.push(...sub);
    } else if (Array.isArray(item) && item.length > 0 && !item.every(flowSafe)) {
      out.push(`${pad}-`);
      emitSeq(item, indent + INDENT, width, out);
    } else {
      emitValue(item, `${pad}- `, indent + INDENT, width, out);
    }
  }
}

// `comments` maps a TOP-LEVEL key to the comment written above it; a reader
// skips comments, so they carry nothing a reader of the record depends on.
export function stringifyYaml(value, { width = 120, comments = null, header = null } = {}) {
  const out = [];
  if (header) out.push(...commentLines(header, 0, width), "");
  if (isMap(value)) emitMap(value, 0, width, out, comments instanceof Map ? comments : null);
  else if (Array.isArray(value)) emitSeq(value, 0, width, out);
  else emitValue(value, "", INDENT, width, out);
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// The reader.

export class YamlError extends Error {}

function resolvePlain(s) {
  if (s === "" || s === "~" || /^(?:null|Null|NULL)$/.test(s)) return null;
  if (/^(?:true|True|TRUE)$/.test(s)) return true;
  if (/^(?:false|False|FALSE)$/.test(s)) return false;
  if (/^[-+]?[0-9]+$/.test(s)) return Number(s);
  if (/^[-+]?(?:[0-9]+\.[0-9]*|\.[0-9]+)(?:[eE][-+]?[0-9]+)?$/.test(s)) return Number(s);
  return s;
}

const ESCAPES = { "0": "\0", a: "\x07", b: "\b", t: "\t", "\t": "\t", n: "\n", v: "\v", f: "\f", r: "\r",
  e: "\x1b", " ": " ", "\"": "\"", "/": "/", "\\": "\\", N: "\u0085", _: "\u00a0", L: "\u2028", P: "\u2029" };

function indentOf(line) { return line.length - line.trimStart().length; }
function blankOrComment(line) { return /^\s*(?:#.*)?$/.test(line); }

// Strip a trailing ` #` comment from the text after a plain scalar or a
// closing quote.
function stripComment(s) {
  const m = /(^|\s)#/.exec(s);
  return (m ? s.slice(0, m.index) : s).trimEnd();
}

export function parseYaml(text, where = "<yaml>") {
  const lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/);
  // The newline that ends the last line is not a blank line of its own.
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  let i = 0;
  const fail = (msg, at = i) => { throw new YamlError(`${where}:${at + 1}: ${msg}`); };

  for (const [n, l] of lines.entries()) {
    if (/^ *\t/.test(l) && !blankOrComment(l)) fail("a tab in indentation — YAML indents with spaces only", n);
  }

  const skipBlank = () => { while (i < lines.length && blankOrComment(lines[i])) i++; };

  // A document-start marker on the first line is admitted; a second document
  // is not, because a reader of one record has no rule for which to read.
  skipBlank();
  if (i < lines.length && /^---\s*(?:#.*)?$/.test(lines[i])) i++;

  const refuseIndicators = (s) => {
    if (s.startsWith("&")) fail("an anchor (`&`) — the record is read without anchors");
    if (s.startsWith("*")) fail("an alias (`*`) — the record is read without aliases");
    if (s.startsWith("!")) fail("a tag (`!`) — the record is read without tags");
    if (s.startsWith("? ") || s === "?") fail("a complex key (`?`) — every key here is a plain or quoted word");
    if (s.startsWith("%")) fail("a directive (`%`)");
  };

  // The key of a block-map line, or null where the line is not one.
  const splitKey = (c) => {
    let key, rest;
    if (c[0] === "\"" || c[0] === "'") {
      const q = c[0];
      let k = 1;
      for (; k < c.length; k++) {
        if (q === "\"" && c[k] === "\\") { k++; continue; }
        if (c[k] === q) {
          if (q === "'" && c[k + 1] === "'") { k++; continue; }
          break;
        }
      }
      if (k >= c.length) return null;
      const after = c.slice(k + 1);
      const m = /^\s*:(?:\s|$)/.exec(after);
      if (!m) return null;
      key = q === "\"" ? unescapeDouble(c.slice(1, k), i) : c.slice(1, k).replace(/''/g, "'");
      rest = after.slice(m[0].length);
      return { key, rest };
    }
    const m = /^([^#\s][^\n]*?)\s*:(?:\s+|$)/.exec(c);
    if (!m) return null;
    if (/^[-[\]{},&*!|>%@`]/.test(m[1]) && !/^-[^\s]/.test(m[1])) return null;
    key = m[1];
    rest = c.slice(m[0].length);
    return { key, rest };
  };

  function unescapeDouble(s, at) {
    let out = "";
    for (let k = 0; k < s.length; k++) {
      const ch = s[k];
      if (ch !== "\\") { out += ch; continue; }
      const n = s[++k];
      if (n === undefined) fail("a backslash ends a double-quoted string", at);
      if (n === "x" || n === "u" || n === "U") {
        const len = n === "x" ? 2 : n === "u" ? 4 : 8;
        const hex = s.slice(k + 1, k + 1 + len);
        if (!new RegExp(`^[0-9a-fA-F]{${len}}$`).test(hex)) fail(`a malformed \\${n} escape`, at);
        out += String.fromCodePoint(parseInt(hex, 16));
        k += len;
      } else if (Object.prototype.hasOwnProperty.call(ESCAPES, n)) out += ESCAPES[n];
      else fail(`an unknown escape \\${n} in a double-quoted string`, at);
    }
    return out;
  }

  // Joins the lines of a multi-line flow scalar the way YAML folds them: one
  // line break between two lines reads as a space, and each blank line in
  // between reads as a newline.
  function foldFlowLines(parts) {
    let out = parts[0].text;
    let blanks = 0;
    for (const p of parts.slice(1)) {
      if (p.text === "" && !p.last) { blanks++; continue; }
      if (p.joinBare) out += p.text;
      else out += (blanks ? "\n".repeat(blanks) : " ") + p.text;
      blanks = 0;
    }
    return out;
  }

  function readQuoted(c, startLine) {
    const q = c[0];
    const parts = [];
    let line = c.slice(1);
    let first = true;
    let pendingBare = false;
    for (;;) {
      let k = 0;
      let closed = -1;
      for (; k < line.length; k++) {
        if (q === "\"" && line[k] === "\\") { k++; continue; }
        if (line[k] === q) {
          if (q === "'" && line[k + 1] === "'") { k++; continue; }
          closed = k; break;
        }
      }
      if (closed !== -1) {
        let seg = line.slice(0, closed);
        if (!first) seg = seg.trimStart();
        parts.push({ raw: seg, joinBare: pendingBare, last: true });
        const after = line.slice(closed + 1);
        if (stripComment(after) !== "") fail(`text after a closing quote: ${JSON.stringify(after.trim())}`);
        break;
      }
      let seg = first ? line : line.trimStart();
      let bare = false;
      const trail = /(\\+)\s*$/.exec(seg);
      if (q === "\"" && trail && trail[1].length % 2 === 1) {
        seg = seg.slice(0, seg.length - trail[0].length) + trail[1].slice(0, -1);
        bare = true;
      } else seg = seg.trimEnd();
      parts.push({ raw: seg, joinBare: pendingBare, last: false });
      pendingBare = bare;
      first = false;
      i++;
      if (i >= lines.length) fail("a quoted string never closes", startLine);
      line = lines[i];
    }
    i++;
    const conv = (s) => (q === "\"" ? unescapeDouble(s, startLine) : s.replace(/''/g, "'"));
    return foldFlowLines(parts.map((p) => ({ text: conv(p.raw), joinBare: p.joinBare, last: p.last })));
  }

  function readBlockScalar(header, parentIndent) {
    const m = /^([|>])([1-9]?)([+-]?)([1-9]?)\s*(?:#.*)?$/.exec(header);
    if (!m) fail(`a malformed block scalar header ${JSON.stringify(header)}`);
    const literal = m[1] === "|";
    const chomp = m[3] || "";
    const explicit = Number(m[2] || m[4] || 0);
    const start = i;
    i++;
    let contentIndent = explicit ? parentIndent + explicit : -1;
    const body = [];
    while (i < lines.length) {
      const l = lines[i];
      if (l.trim() === "") { body.push(contentIndent !== -1 && l.length > contentIndent ? l.slice(contentIndent) : ""); i++; continue; }
      const ind = indentOf(l);
      if (contentIndent === -1) {
        if (ind <= parentIndent) break;
        contentIndent = ind;
      }
      if (ind < contentIndent) break;
      body.push(l.slice(contentIndent));
      i++;
    }
    if (contentIndent === -1) contentIndent = parentIndent + 1;
    let trailing = 0;
    while (body.length && body[body.length - 1] === "") { body.pop(); trailing++; }
    let out;
    if (literal) out = body.join("\n");
    else {
      out = "";
      let blanks = 0;
      let prevMore = false;
      let started = false;
      for (const l of body) {
        if (l === "") { blanks++; continue; }
        const more = /^\s/.test(l);
        if (!started) out += "\n".repeat(blanks);
        else if (more || prevMore) out += "\n".repeat(blanks + 1);
        else out += blanks ? "\n".repeat(blanks) : " ";
        out += l;
        blanks = 0;
        prevMore = more;
        started = true;
      }
      if (!started) out = "";
    }
    if (body.length === 0) return chomp === "+" ? "\n".repeat(trailing) : "";
    if (chomp === "-") return out;
    if (chomp === "+") return `${out}\n${"\n".repeat(trailing)}`;
    void start;
    return `${out}\n`;
  }

  function readFlowSeq(c) {
    const s = stripComment(c);
    if (!s.endsWith("]")) fail("a flow sequence must close on its own line");
    const inner = s.slice(1, -1).trim();
    if (inner === "") { i++; return []; }
    const items = [];
    let k = 0;
    while (k <= inner.length) {
      while (inner[k] === " ") k++;
      let item;
      if (inner[k] === "\"" || inner[k] === "'") {
        const q = inner[k];
        let e = k + 1;
        for (; e < inner.length; e++) {
          if (q === "\"" && inner[e] === "\\") { e++; continue; }
          if (inner[e] === q) { if (q === "'" && inner[e + 1] === "'") { e++; continue; } break; }
        }
        const raw = inner.slice(k + 1, e);
        item = q === "\"" ? unescapeDouble(raw, i) : raw.replace(/''/g, "'");
        k = e + 1;
      } else {
        let e = inner.indexOf(",", k);
        if (e === -1) e = inner.length;
        const raw = inner.slice(k, e).trim();
        if (/^[[{]/.test(raw)) {
          if (raw === "[]") item = [];
          else if (raw === "{}") item = {};
          else fail("a nested flow collection — write it as a block sequence");
        } else {
          refuseIndicators(raw);
          item = resolvePlain(raw);
        }
        k = e;
      }
      items.push(item);
      while (inner[k] === " ") k++;
      if (k >= inner.length) break;
      if (inner[k] !== ",") fail(`an unexpected ${JSON.stringify(inner[k])} in a flow sequence`);
      k++;
    }
    i++;
    return items;
  }

  // The value written after `key:` or `- ` on line `i`, reading as many
  // following lines as it spans. `parentIndent` is the indentation a
  // continuation line must exceed.
  function readInline(c, parentIndent) {
    refuseIndicators(c);
    if (c[0] === "|" || c[0] === ">") return readBlockScalar(c, parentIndent);
    if (c[0] === "\"" || c[0] === "'") return readQuoted(c, i);
    if (c[0] === "[") return readFlowSeq(c);
    if (c[0] === "{") {
      if (stripComment(c) !== "{}") fail("a flow map with content — write it as a block map");
      i++;
      return {};
    }
    let text = stripComment(c);
    const hadComment = text !== c.trimEnd();
    i++;
    if (hadComment) return resolvePlain(text);
    let blanks = 0;
    let multi = false;
    while (i < lines.length) {
      const l = lines[i];
      if (l.trim() === "") { blanks++; i++; continue; }
      if (/^\s*#/.test(l) || indentOf(l) <= parentIndent) break;
      const t = stripComment(l.trim());
      text += blanks ? "\n".repeat(blanks) : ` ${t}`;
      if (blanks) text += t;
      blanks = 0;
      multi = true;
      i++;
      if (t !== l.trim()) break;
    }
    return multi ? text : resolvePlain(text);
  }

  function readNode(minIndent, parentIndent = minIndent - 1) {
    skipBlank();
    if (i >= lines.length) return null;
    const ind = indentOf(lines[i]);
    if (ind < minIndent) return null;
    const c = lines[i].slice(ind);
    if (/^-(?:\s|$)/.test(c)) return readSeq(ind);
    if (splitKey(c)) return readMap(ind);
    return readInline(c, Math.min(parentIndent, ind - 1));
  }

  function readMap(ind) {
    const out = {};
    for (;;) {
      skipBlank();
      if (i >= lines.length) break;
      if (/^(?:---|\.\.\.)\s*(?:#.*)?$/.test(lines[i])) break;
      const li = indentOf(lines[i]);
      if (li < ind) break;
      if (li > ind) fail("a line indented deeper than the key above it, with no key of its own");
      const c = lines[i].slice(ind);
      if (/^-(?:\s|$)/.test(c)) break;
      const kv = splitKey(c);
      if (!kv) fail(`expected \`key: value\`, read ${JSON.stringify(c.trim())}`);
      if (Object.prototype.hasOwnProperty.call(out, kv.key)) fail(`the key \`${kv.key}\` appears twice in one map`);
      const rest = kv.rest.trim();
      if (rest === "" || rest.startsWith("#")) {
        i++;
        skipBlank();
        if (i < lines.length) {
          const ni = indentOf(lines[i]);
          const nc = lines[i].slice(ni);
          if (ni > ind) { out[kv.key] = readNode(ni); continue; }
          if (ni === ind && /^-(?:\s|$)/.test(nc)) { out[kv.key] = readSeq(ind); continue; }
        }
        out[kv.key] = null;
        continue;
      }
      out[kv.key] = readInline(rest, ind);
    }
    return out;
  }

  function readSeq(ind) {
    const out = [];
    for (;;) {
      skipBlank();
      if (i >= lines.length) break;
      const li = indentOf(lines[i]);
      if (li !== ind) {
        if (li > ind) fail("a line indented deeper than the sequence entry above it");
        break;
      }
      const c = lines[i].slice(ind);
      if (!/^-(?:\s|$)/.test(c)) break;
      const rest = c.slice(1);
      if (rest.trim() === "" || rest.trim().startsWith("#")) {
        i++;
        skipBlank();
        const ni = i < lines.length ? indentOf(lines[i]) : -1;
        out.push(ni > ind ? readNode(ni) : null);
        continue;
      }
      // The compact form: the entry's content is read as though it stood on
      // its own line at the column it starts in.
      const col = ind + 1 + (rest.length - rest.trimStart().length);
      lines[i] = " ".repeat(col) + rest.trimStart();
      out.push(readNode(col, ind));
    }
    return out;
  }

  const value = readNode(0);
  skipBlank();
  if (i < lines.length && /^\.\.\.\s*(?:#.*)?$/.test(lines[i])) { i++; skipBlank(); }
  if (i < lines.length) {
    if (/^---/.test(lines[i])) fail("a second document — a record file holds one");
    fail(`unread text: ${JSON.stringify(lines[i].trim())}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// THE COMMAND LINE (kogaki#1413). The ingest, `tools/move_ingest.py`, writes
// and reads the Move record and reads the Extraction record through this
// module rather than through a Python parser of its own, so one reader and
// one writer hold every record the pipeline carries:
//
//   node src/yaml.mjs parse <file>      the file's value as JSON on stdout
//   node src/yaml.mjs stringify [width] JSON on stdin, the YAML on stdout
//
// A refusal is one line on stderr naming the file and line, exit 1.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (cmd === "parse" && arg) {
      process.stdout.write(`${JSON.stringify(parseYaml(readFileSync(arg, "utf8"), arg))}\n`);
    } else if (cmd === "stringify") {
      const width = arg === undefined ? 120 : Number(arg);
      process.stdout.write(stringifyYaml(JSON.parse(readFileSync(0, "utf8")), { width }));
    } else {
      process.stderr.write("usage: node src/yaml.mjs parse <file> | stringify [width] < value.json\n");
      process.exitCode = 2;
    }
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exitCode = 1;
  }
}
