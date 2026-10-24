// review-draft/declared-side — the comparison's declared side: reading a rendered Packet back out, and the mechanical string facts.
// Cut from src/review-draft.mjs at its named section (kogaki#1458); the
// design and its rulings are stated at the entry and in the Issues each
// block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   the renderer
//       SPEC-draft-pipeline "The renderer and the anchor — markup from the record, at the Leg"
//
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseYaml } from "../yaml.mjs";
import { fail } from "./draft-reader.mjs";

// ---------------------------------------------------------------------------
// THE COMPARISON (kogaki#872): the join between what a Packet DECLARED and
// what the Blind Reader read out of the prose it produced.
// THE ITEM TABLE IS FIXED IN THE HARNESS AND READ FROM `src/review-items.json`
// — classes, preserved or best-effort, mechanical or judged; amending it is
// one edit, the arrangement `src/packet-template.md` has with `src/draft.mjs`.
// THE MODEL NEVER ASSIGNS SEVERITY: it sees ONE pair, answers ONE question,
// returns one of three tokens with one sentence, and what a `fails` COSTS is
// the table's. `cannot-decide` IS NEVER ROUNDED — it is a third answer,
// listed with its pair for a person to look at.

function readItems() {
  const p = join(dirname(fileURLToPath(import.meta.url)), "..", "review-items.json");
  if (!existsSync(p)) {
    fail(`the item table is absent — ${p}. It is the whole of what the comparison compares, so `
      + "this refuses rather than joining against a table it invented.");
  }
  let t;
  try { t = JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { fail(`the item table at ${p} is not readable JSON (${e.message})`); }
  if (!Array.isArray(t.items) || !t.items.length) fail(`the item table at ${p} declares no items`);
  return t;
}

// ---------------------------------------------------------------------------
// Reading the DECLARED side back out of a rendered Packet.
//
// THE PACKET IS PARSED AS THE TEMPLATE WRITES IT, never as general markdown —
// the same reading `readDraft` gives the trace, and for the same reason: a
// second grammar can disagree with the writer about what was written. Every
// block below is a form `src/packet-template.md` renders, and a block that is
// absent is a PACKET GAP rather than something to work around, per the owner's
// 2026-09-04 closed-input ruling. The refusal names the block, the item that
// needed it, and the file the gap is filed against.

// The stated-absence forms the Packet renderer writes where a value is empty.
// They are ANSWERS and not holes: a Packet saying "(nothing new)" has told the
// comparison there is nothing to compare, which is different from a Packet that
// never rendered the block at all.
const PACKET_ABSENCE = /^\((none|nothing)\b/i;

// A `- **label.** value` line, plus any continuation lines the renderer wrapped
// under it. The renderer puts multi-entry values (a term list, a knows list) on
// the lines below the label, so a reader that took only the label line would
// silently see the first entry and no others.
function packetBullet(text, label) {
  const lines = text.split("\n");
  const head = new RegExp(`^- \\*\\*${label}\\.\\*\\*\\s?(.*)$`);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(head);
    if (!m) continue;
    const out = m[1] === "" ? [] : [m[1]];
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (l.trim() === "" || l.startsWith("#") || /^- \*\*/.test(l)) break;
      out.push(l);
    }
    return out.join("\n").trim();
  }
  return null;
}

// A `- item` list read out of a bullet value — or a numbered `1. item` list,
// which is how the waypoints block renders its points in route order
// (kogaki#1326) — with the stated-absence forms
// answering as the empty list. `already knows` renders each entry as
// `term — anchor (introduced at <leg>)`; only the term is the join key, and the
// anchor is what the Packet carries FOR THE WRITER rather than for this reader.
function bulletList(value, { termOnly = false } = {}) {
  if (value === null) return null;
  if (PACKET_ABSENCE.test(value)) return [];
  const out = [];
  for (const l of value.split("\n")) {
    const m = l.match(/^\s*(?:-|\d+\.)\s+(.*\S)\s*$/);
    if (!m) continue;
    let t = m[1];
    if (termOnly) {
      t = t.split(" — ")[0].replace(/\s*\(introduced at [^)]*\)\s*$/, "").trim();
    }
    if (t) out.push(t);
  }
  return out;
}

// The block between a heading and the next one, with the template's own fixed
// instruction paragraph dropped — what is left is the rendered VALUE. Matched
// on the heading's text rather than its level, because the level is the
// template's business and the block's identity is its name.
function packetBlock(text, heading, { after = null } = {}) {
  const lines = text.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#+\s+(.*\S)\s*$/);
    if (m && m[1] === heading) { start = i + 1; break; }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (/^#+\s+\S/.test(lines[i])) { end = i; break; }
  }
  let body = lines.slice(start, end).join("\n");
  // THE FIXED INSTRUCTION PARAGRAPH IS MATCHED AS A WORD SEQUENCE, never as a
  // literal: the template wraps its prose, and a literal that carried the
  // template's own line breaks would stop matching the moment somebody rewrapped
  // a paragraph — which changes nothing and would silently hand the whole
  // instruction paragraph back as the block's VALUE.
  if (after) {
    const m = body.match(after);
    if (m) body = body.slice(m.index + m[0].length);
  }
  return body.trim();
}

// ONE READER PER BLOCK KIND, and every label, heading and fixed sentence it
// keys on comes from `packet_blocks` in the item table. The runtime therefore
// carries no literal that happens to equal a field name somewhere else —
// `claims`, `purpose` and `reader_state_after` are each a Packet label AND an
// item id AND (for two of them) a Reverse Outline field, and a runtime
// spelling them out cannot be told apart from one restating the table or the
// schema.
const PACKET_READERS = {
  // A LIST UNDER ITS OWN HEADING (kogaki#1215 decision 3). The claims, the
  // `already knows` terms and the `introduce here` terms each render as a flat
  // `- ` list in a block of their own, in the Packet's one list convention, so
  // no list sits under a bulleted field label and no item carries a `key:`
  // prefix. The region runs from the heading to the next one; its fixed
  // instruction prose carries no `- ` line, so only the items are read.
  //
  // A STATED ABSENCE IN THE REGION IS AN ANSWER — this Leg declares none (PR
  // #895 round 1, finding 2): it is only a hole when the heading, and so the
  // region, is absent altogether, or when the region carries neither an item
  // nor an absence.
  heading_list: (t, spec) => {
    const block = packetBlock(t, spec.heading);
    if (block === null) return null;
    const items = bulletList(block, { termOnly: !!spec.term_only });
    if (items.length) return items;
    if (block.split("\n").some((l) => PACKET_ABSENCE.test(l.trim()))) return [];
    return null;
  },
  bullet: (t, spec) => packetBullet(t, spec.label),
  bullets: (t, spec) => {
    const out = {};
    for (const label of spec.labels) {
      const v = packetBullet(t, label);
      if (v === null) return null;
      out[label] = v;
    }
    return out;
  },
  block: (t, spec) => {
    const b = packetBlock(t, spec.heading, { after: wordSequence(spec.after_words) });
    if (b === null) return null;
    return PACKET_ABSENCE.test(b) ? "" : b;
  },
  // ONE LABELLED LINE PER PARAGRAPH, NUMBERED BY ITS PARAGRAPH (kogaki#1447). The
  // waypoints block renders the ParagraphPlan's join as an indented `*Opens from:*` line
  // under its numbered Leg Waypoint, and `heading_list` drops it because it is no list
  // item. This reads each such line under the numbered line it sits beneath, so an entry
  // names the paragraph it opens; a block carrying none answers the empty list.
  labelled_lines: (t, spec) => {
    const block = packetBlock(t, spec.heading);
    if (block === null) return null;
    const out = [];
    let n = null;
    for (const l of block.split("\n")) {
      const top = l.match(/^(\d+)\.\s/);
      if (top) { n = Number(top[1]); continue; }
      const line = l.trim();
      if (n !== null && line.startsWith(spec.label)) {
        out.push(spec.entry.split("{n}").join(String(n)).split("{line}").join(line.slice(spec.label.length).trim()));
      }
    }
    return out;
  },
  // ONE ITALIC SUB-LINE PER `performs` PARAGRAPH WAYPOINT, NUMBERED BY ITS PARAGRAPH
  // (kogaki#1556). The renderer writes the entry as the indented `<j>. *<operation>*` and
  // nothing after it (kogaki#1585); this reads that line whole under the numbered line it
  // sits beneath, and a block carrying none answers the empty list.
  italic_lines: (t, spec) => {
    const block = packetBlock(t, spec.heading);
    if (block === null) return null;
    const out = [];
    let n = null;
    for (const l of block.split("\n")) {
      const top = l.match(/^(\d+)\.\s/);
      if (top) { n = Number(top[1]); continue; }
      const m = l.match(/^\s+\d+\.\s+\*([^*]+)\*\s*$/);
      if (n !== null && m) out.push(spec.entry.split("{n}").join(String(n)).split("{line}").join(m[1].trim()));
    }
    return out;
  },
  paragraph: (t, spec) => {
    const i = t.indexOf(spec.opens_with);
    if (i === -1) return null;
    const rest = t.slice(i);
    const end = rest.indexOf("\n\n");
    return (end === -1 ? rest : rest.slice(0, end)).trim();
  },
};

// A fixed sentence from the template, as a pattern that ignores how it was
// wrapped. Every character is escaped and every run of whitespace becomes one
// `\s+`, so the pattern matches the sentence and never anything else.
// THE PARAGRAPH A `labelled_lines` ENTRY NAMES, read back by the block's own `entry` form
// rather than by a second spelling of it here (kogaki#1447).
function labelledEntryParagraph(items, blockName, entry) {
  const spec = (items.packet_blocks || {})[blockName] || {};
  const head = String(spec.entry || "").split("{n}")[0];
  const m = String(entry).match(new RegExp("^" + head.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\d+)"));
  return m ? Number(m[1]) : null;
}

// THE OPENING SENTENCE OF ONE PARAGRAPH OF A LEG (kogaki#1447): the Leg's prose split on
// blank lines, headings dropped, and the paragraph's first sentence as `firstSentenceOf`
// reads it -- a string fact, so what the judge is shown beside the Opens-from line is the
// sentence the paragraph actually opens on.
function legOpeningSentence(leg, n) {
  const paras = String(leg.prose).split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !p.startsWith("#"));
  const p = paras[n - 1];
  return p === undefined ? null : firstSentenceOf(p.replace(/\s+/g, " ")).trim();
}

function wordSequence(s) {
  return new RegExp(String(s).trim().split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"));
}

// ONE BLOCK, OUT OF ONE PACKET, refusing BY NAME on a block the Packet does not
// carry. Every item reads its declared side through here, so a Packet gap is one
// refusal with one wording however it was reached, and a second reader cannot
// grow beside this one and disagree with it about what the Packet's layout is.
function readPacketBlock(text, name, items, leg, wantedBy) {
  const spec = (items.packet_blocks || {})[name];
  const reader = spec && PACKET_READERS[spec.kind];
  if (!reader) {
    fail(`the item table names the Packet block \`${name}\`, which this Harness has no reader for `
      + "— the table and the runtime disagree about the Packet's layout, and a comparison run "
      + "against a block nobody reads would report agreement it never checked");
  }
  const v = reader(text, spec);
  if (v === null) {
    fail(`leg ${leg.leg_id}: its Packet carries no \`${name}\` block, which the item(s) `
      + `${wantedBy.join(", ")} compare against.\n  packet  ${leg.packet_path}\n`
      + "A block the comparison needs and the Packet does not carry is a PACKET GAP: file it "
      + "against src/packet-template.md. It is never satisfied by reading the Brief, the Move "
      + "or the Strand — the owner's 2026-09-04 ruling is that a need for those is evidence "
      + "the Packet is missing information.");
  }
  return v;
}

// The declared side for one Leg, read once and refusing BY NAME on the first
// block an item needs and the Packet does not carry.
function declaredFor(leg, items) {
  const text = readFileSync(leg.packet_path, "utf8");
  const need = new Set();
  for (const it of items.items) {
    // A ROW THIS LEG DOES NOT RUN ASKS FOR NO BLOCK (kogaki#880). Collecting a
    // figure row's Packet blocks on a figureless Leg would refuse that Leg as
    // a Packet gap for a block no item on it ever reads — a refusal naming a
    // repair nobody owes.
    if (it.figure_only && !leg.figure) continue;
    if (it.declared_block) need.add(it.declared_block);
    for (const b of it.also_declared_blocks || []) need.add(b);
  }
  const out = {};
  for (const name of need) {
    const wanted = items.items.filter((i) => i.declared_block === name
      || (i.also_declared_blocks || []).includes(name)).map((i) => i.id);
    out[name] = readPacketBlock(text, name, items, leg, wanted);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The mechanical half. Every check below is a STRING FACT about the Draft and
// its Packet — no model call is made for any of them, and the join record says
// so per item, which is what makes "decided mechanically" checkable rather than
// claimed.

// The literal below is wrapped so that no line ends on the preposition an
// import statement uses. The closed-input case reads this file's own text for
// import forms, and a stopword list is not an import. THE FORM IS NOT SPELLED
// OUT HERE, deliberately: a comment that writes the pattern it exists to avoid
// becomes the first hit of the reader looking for it, which is the use-versus-
// mention defect src/packet-template.md's own header records.
const STOPWORDS = new Set(("a an and are as at be been being but by can could did do does "
  + "for had has have how in into is it its may might must not of on or should so than the "
  + "that their from these they this those to was were what when which who will with would you your "
  + "them then there")
  .split(" "));

function wordsOf(s) { return (String(s).toLowerCase().match(/[a-z0-9']+/g) || []); }
function contentWords(s) { return wordsOf(s).filter((w) => !STOPWORDS.has(w)); }

// THE CLAIM MATCHER IS GONE, AND ITS ABSENCE IS THE RULING (owner 2026-09-17;
// kogaki#1132). `pairClaims` assigned each outlined claim to the declared claim
// it shared the most content words with, above a containment floor, and both
// rows that read the assignment have left the table. Whether a reader recovered
// a declared claim is the Judge's answer in words: a faithful realization can
// share no vocabulary at all with the line it realizes, and a shared-word count
// cannot tell that from a loss. `contentWords` stays — the figure's
// element-to-claim row is containment against a claim ADDRESS the record names,
// which is a different question and still the Harness's.

// The first N-word window of `line` that occurs verbatim in `haystack`.
// Normalized to a word sequence on both sides, so a wrap, a double space or a
// comma is not what decides it — the words are.
function verbatimWindow(line, haystacks, n) {
  const w = wordsOf(line);
  if (w.length < n) return null;
  const hays = haystacks.map((h) => " " + wordsOf(h).join(" ") + " ");
  for (let i = 0; i + n <= w.length; i++) {
    const win = w.slice(i, i + n).join(" ");
    if (hays.some((h) => h.includes(" " + win + " "))) return win;
  }
  return null;
}

// THE DRAFT'S OWN PARAGRAPHS, each a run of non-blank lines, tracked by its
// 1-based line range OVER THE FILE (frontmatter included, matching the trace's
// own convention) rather than over the body alone — so a span this reads back
// lines up with the one `comparisonLine` renders for every other item.
function paragraphsOf(draft) {
  const bodyStart = draft.frontmatterEnd + 2; // 0-based index of the body's first line
  const paras = [];
  let start = null;
  for (let i = bodyStart; i < draft.lines.length; i++) {
    if (draft.lines[i].trim() === "") {
      if (start !== null) { paras.push({ startLine: start + 1, endLine: i }); start = null; }
      continue;
    }
    if (start === null) start = i;
  }
  if (start !== null) paras.push({ startLine: start + 1, endLine: draft.lines.length });
  return paras;
}

// "DEMONSTRATIVE REFERENCE" IS THE SETTLED TERM for an expression such as "the
// first" or "the last one" — an ordinal or positional noun phrase that points
// at an earlier enumeration rather than naming its antecedent again. The list
// is curated rather than a general pronoun scan, because a general scan over
// "this"/"that" would fire on every use of either word, and most carry no
// antecedent to recover at all.
const DEMONSTRATIVE_REFERENCE = /\bthe (first|second|third|last|former|latter|previous|next|other|same)( one)?\b/gi;

// THE ANTECEDENT'S OWN FORM, MECHANICALLY: an enumeration is a run of items
// joined by a comma or by "and"/"or" — the form a list of candidates takes on
// the page, read as a string fact rather than as which candidate is meant.
const LIST_CANDIDATE = /,\s|\s(?:and|or)\s/i;

// THE PARAGRAPH-OPENER TEST (kogaki#1322, owner ruling 2026-10-10): a
// paragraph's first sentence names what it refers to in full. A STRING RULE,
// over the sentence's own text and nothing else — no antecedent search, so a
// demonstrative whose antecedent sits in the very same sentence also fails.
// The owner chose strictness at paragraph openers over the cost of a false
// flag there. The bare definite noun ("the result") cannot be told from a
// generic definite by a string and stays in the Persona's prose rule only.
const OPENER_DEMONSTRATIVE = /\b(this|that|these|those)\b/i;
const OPENER_THIRD_PERSON = /^(it|they|them)\b|^\S+\s+(it|they|them)\b/i;

// The paragraph's first sentence, as a string: up to the first sentence
// terminator, or the whole text when it carries none.
function firstSentenceOf(text) {
  const m = /^[\s\S]*?[.!?](?=\s|$)/.exec(text);
  return m ? m[0] : text;
}

// THE BRIEF'S DEFINED TERMS IN LEG ORDER (kogaki#1331): each `defined` term
// beside the position, in the Brief's Reader Path, of the first Leg whose
// `introduces` carries it (the path's length where none does), and each Leg's
// own position. Read once per Draft. An `introduces` entry is a map carrying
// `term`, or the string form `term — anchor`. Null where the Draft names no
// Brief; a Brief named and unreadable refuses, since a pass over it would be
// a pass over nothing.
const DEFINED_TERM_ORDER = new Map();
function definedTermOrder(draft) {
  if (!draft.brief) return null;
  if (DEFINED_TERM_ORDER.has(draft.path)) return DEFINED_TERM_ORDER.get(draft.path);
  const p = resolve(dirname(draft.path), draft.brief);
  let record;
  try { record = parseYaml(readFileSync(p, "utf8"), p); }
  catch (e) {
    fail(`the Brief this Draft names (${p}) cannot be read for its defined terms (${e.message}) — `
      + "the defined-term-order item reads the Brief's `defined_terms` and nothing else of it (kogaki#1331)");
  }
  const path = Array.isArray(record?.reader_path) ? record.reader_path : [];
  const termOf = (raw) => (raw && typeof raw === "object" ? String(raw.term ?? "") : String(raw ?? "").split("—")[0]).trim().toLowerCase();
  const position = new Map(path.map((s, i) => [s && s.leg_id, i]));
  const terms = (Array.isArray(record?.defined_terms) ? record.defined_terms : [])
    .filter((e) => e && e.class === "defined" && typeof e.term === "string" && e.term.trim() !== "")
    .map((e) => {
      const key = e.term.trim().toLowerCase();
      const i = path.findIndex((s) => Array.isArray(s?.introduces) && s.introduces.some((raw) => termOf(raw) === key));
      return { term: e.term.trim(), introducedAt: i === -1 ? path.length : i };
    });
  const order = { position, terms };
  DEFINED_TERM_ORDER.set(draft.path, order);
  return order;
}

// Whole-word and case-insensitive: the term not adjacent to a letter or digit
// on either side, the boundary composition's own refusal uses.
function wholeWord(term, text) {
  const t = term.toLowerCase();
  const hay = String(text).toLowerCase();
  const wordish = (c) => c !== undefined && c !== "" && /[\p{L}\p{N}_]/u.test(c);
  for (let i = hay.indexOf(t); i !== -1; i = hay.indexOf(t, i + 1)) {
    if (!wordish(hay[i - 1]) && !wordish(hay[i + t.length])) return true;
  }
  return false;
}

// ONE IMPLEMENTATION PER MECHANICAL ITEM, keyed by the item's own id. Each
// returns `{verdict, reason, span}` and never a score. The ids here are
// BINDINGS to the table's `mode: mechanical` rows — a table row whose id has no
// implementation is refused below rather than silently skipped, which is the
// half that keeps the two from drifting apart.
const MECHANICAL = {
  // THE HYGIENE ITEMS ARE GONE, AND THEIR ABSENCE IS A RULING RATHER THAN A
  // TRIM (owner 2026-09-09; kogaki#1013 item 3). `term-before-introduction`,
  // `restates-earlier-leg` and `packet-wording` each asked whether the prose
  // betrayed the material it was produced from. Prose hygiene is not part of
  // Reverse Outlining: a reader cannot infer the source a structure was
  // produced from, and being able to would be abnormal. Whether any of them
  // survives as a realization-time lint in `draft` is a separate question for
  // the owner, not this rebuild. Their rows left `src/review-items.json` in the
  // same act, and the binding check below is what makes a row with no
  // implementation refuse rather than silently skip — so the two cannot drift.

  // `claims-unused` LEFT WITH THE MATCHER IT READ (kogaki#1132): both halves
  // are the one preserved `claims` row, asked once per DECLARED claim.
  // `demonstrative-reference` IS READ FROM THE DRAFT ALONE (kogaki#1255 cell
  // 4): the antecedent is a STRING FACT — an enumeration's form, a comma or an
  // "and"/"or" run — never which candidate is right. THE WINDOW IS ONE
  // PARAGRAPH BACK (fixture: `checks/check-brief-review.sh`): the enumeration
  // sits in the reference's own paragraph, before it, or the one immediately
  // before. A SECOND TEST OVER A PARAGRAPH'S FIRST SENTENCE (kogaki#1322,
  // owner ruling 2026-10-10): a first sentence opening on a demonstrative or a
  // third-person pronoun fails by naming the line and the word, no lookback.
  "demonstrative-reference": ({ leg, draft }) => {
    const paras = paragraphsOf(draft);
    for (let pi = 0; pi < paras.length; pi++) {
      const p = paras[pi];
      if (p.startLine < leg.lines[0] || p.endLine > leg.lines[1]) continue;
      const text = draft.lines.slice(p.startLine - 1, p.endLine).join("\n");

      const opener = firstSentenceOf(text);
      const openerDem = OPENER_DEMONSTRATIVE.exec(opener);
      const openerPron = !openerDem && OPENER_THIRD_PERSON.exec(opener);
      const openerHit = openerDem || openerPron;
      if (openerHit) {
        const word = openerHit[1] || openerHit[2];
        const lineNo = p.startLine + opener.slice(0, openerHit.index).split("\n").length - 1;
        return {
          verdict: "fails",
          reason: "a paragraph's first sentence names what it refers to in full, and this one "
            + "reaches into the paragraph before it instead",
          evidence: [`The word '${word}' on line ${lineNo} opens its paragraph reaching into the `
            + "paragraph before it"],
          span: leg.lines,
        };
      }

      const re = new RegExp(DEMONSTRATIVE_REFERENCE);
      let m;
      while ((m = re.exec(text))) {
        const lineNo = p.startLine + text.slice(0, m.index).split("\n").length - 1;
        const prev = pi > 0 ? paras[pi - 1] : null;
        const prevText = prev ? draft.lines.slice(prev.startLine - 1, prev.endLine).join("\n") : "";
        const recoverable = LIST_CANDIDATE.test(text.slice(0, m.index)) || LIST_CANDIDATE.test(prevText);
        if (!recoverable) {
          return {
            verdict: "fails",
            reason: "a demonstrative reference's antecedent is not recoverable within the paragraph "
              + "it appears in or the one immediately before it",
            evidence: [`The antecedent of the demonstrative reference '${m[0]}' on line ${lineNo} `
              + "is not recoverable"],
            span: leg.lines,
          };
        }
      }
    }
    return {
      verdict: "holds",
      reason: "every demonstrative reference's antecedent is recoverable within the paragraph it "
        + "appears in or the one immediately before it",
      span: leg.lines,
    };
  },

  // A DEFINED TERM BEFORE ITS INTRODUCING LEG (kogaki#1331). A term the
  // Brief classifies `defined` occurring, whole-word and case-insensitive, in
  // the prose of a Leg that comes before the Leg whose `introduces` carries it
  // fails, naming the term and the line. A STRING MATCH OVER THE DRAFT'S LEG
  // TRACE, no judgment: within the introducing Leg itself the first
  // occurrence is the introduction by definition, so that Leg and every one
  // after it are not read. A defined term no Leg introduces is before every
  // Leg. A Draft naming no Brief defines no term.
  "defined-term-order": ({ leg, draft }) => {
    const order = definedTermOrder(draft);
    if (!order) {
      return { verdict: "holds", reason: "the Draft names no Brief, so it defines no term", span: leg.lines };
    }
    const here = order.position.get(leg.leg_id);
    if (here !== undefined) {
      for (const { term, introducedAt } of order.terms) {
        if (here >= introducedAt) continue;
        for (let n = leg.lines[0]; n <= leg.lines[1]; n++) {
          if (!wholeWord(term, draft.lines[n - 1] ?? "")) continue;
          return {
            verdict: "fails",
            reason: "a term the Brief defines reaches the prose before the Leg that introduces it",
            evidence: [`The defined term '${term}' on line ${n} is used before the Leg that introduces it`],
            span: leg.lines,
          };
        }
      }
    }
    return {
      verdict: "holds",
      reason: "no term the Brief defines reaches this Leg's prose before the Leg that introduces it",
      span: leg.lines,
    };
  },

  // THE MAP WAS EMPTY AT kogaki#1013 AND NOW CARRIES ONE ROW. A prose Leg's
  // other rows are all judged; the figure's element-to-claim row is mechanical
  // and lives in `MECHANICAL_FIGURE`. The dispatch below reads both, and a
  // table row with no implementation still refuses by name rather than
  // silently skipping.
};

export { readItems, labelledEntryParagraph, legOpeningSentence, declaredFor, contentWords, verbatimWindow, MECHANICAL };
