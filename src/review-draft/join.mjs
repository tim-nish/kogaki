// review-draft/join — the join Packet, verdict recording and the join itself.
// Cut from src/review-draft.mjs at its named section (kogaki#1458); the
// design and its rulings are stated at the entry and in the Issues each
// block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   the figure decision
//       SPEC-draft-pipeline "The figure decision — `figure:` and `figure_roles` on a Leg"
//   the figure record
//       SPEC-draft-pipeline "The figure record — the form's instance, filled after the prose"
//   the renderer
//       SPEC-draft-pipeline "The renderer and the anchor — markup from the record, at the Leg"
//
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { labelledEntryParagraph, legOpeningSentence, declaredFor, contentWords, MECHANICAL } from "./declared-side.mjs";
import { fail, STDIN_LABEL, resolveInputs } from "./draft-reader.mjs";
import { quotedPassage } from "./reverse-outline.mjs";
import { requirePass, passPathAt } from "./workspace.mjs";

// ---------------------------------------------------------------------------
// Rendering one join Packet, and recording the verdict that comes back.

// ---------------------------------------------------------------------------
// THE FIGURE'S DECLARED SIDE (kogaki#880). Read from the validated record the
// trace pins, never from the Packet: the record IS the declaration for a figure
// — the Brief bound each role to a claim and the record worded it — and the
// Packet carries no figure block at all (the figure record keeps the figure input behind
// its own marker, outside the Packet the reviewer's items read).
//
// A ROW NAMING BOTH SIDES IS REFUSED. Two declared carriers on one row is two
// questions, and this table holds one per row; a runtime that picked one
// silently would make which carrier answered a fact about the reading order.
function figureDeclared(leg, item) {
  if (item.declared_block && item.record_field) {
    fail(`the item table declares \`${item.id}\` with both a Packet block and a figure record `
      + "field. One row asks one question of one declared side; a row with two would be answered "
      + "against whichever the runtime happened to read first");
  }
  const rec = leg.figure.record_json;
  const v = rec[item.record_field];
  if (v === undefined) {
    fail(`leg ${leg.leg_id}: item \`${item.id}\` reads the figure record's `
      + `\`${item.record_field}\`, and the record at ${leg.figure.record_path} carries no such `
      + "field. The record was validated against src/figure-schema.json when it was written, so a "
      + "field absent now means the schema and the item table disagree about the record's field list");
  }
  return v;
}

// The record's elements as a reader-facing list: the role and the wording, and
// NEVER the claim address. The claim is what the element is judged against
// and appears on its own side of the mechanical check below; rendering it here
// would put the answer into the question.
function renderElements(elements) {
  return Object.entries(elements)
    .map(([role, el]) => `- **${role}.** ${el && el.text}`).join("\n");
}

// The one figure row the Harness decides alone. EVERY ELEMENT'S TEXT IS
// ENTAILED BY ITS BOUND CLAIM: containment against the claim the record's
// address POINTS AT, with its own declared floor. THE BINDING ITSELF IS NOT
// WHAT THIS CHECKS — the figure record already refuses a role moved to a claim
// the Brief did not bind; what no earlier act can ask is whether the WORDING
// is carried by the material it was licensed from. STRING CONTAINMENT FIRST,
// JUDGED SECOND: no model is asked here, and a fail sends the Leg to
// `correct --figure`, where a reader sees the element beside its claim.
// THE ADDRESS IS `g<n>` OVER THE LEG'S OWN CLAIMS, 1-based, the figure
// decision's grammar; one outside the Leg's claim count is refused by name,
// since the figure decision refuses it at composition.
function claimAt(address, claims) {
  const m = /^g(\d+)$/.exec(String(address ?? ""));
  if (!m) return { error: `is bound to ${renderSide(address ?? null)}, which is not a claim `
    + "address — a role binds to `g<n>` over the Leg's own claims" };
  const i = Number(m[1]);
  if (i < 1 || i > claims.length) {
    return { error: `is bound to ${address} and this Leg declares `
      + `${claims.length} claim${claims.length === 1 ? "" : "s"} — the address points past them` };
  }
  return { claim: claims[i - 1] };
}

const MECHANICAL_FIGURE = {
  "figure-element-claim": ({ leg, declared, items, item }) => {
    const floor = items.thresholds.figure_element_claim_containment;
    if (typeof floor !== "number") {
      fail("the item table declares no `thresholds.figure_element_claim_containment`, and the "
        + "element-to-claim check is containment against a floor. With none every element would "
        + "pass, which is the silent `holds` this comparison exists to refuse");
    }
    const claims = declared.claims || [];
    const elements = figureDeclared(leg, item);
    for (const [role, el] of Object.entries(elements)) {
      const r = claimAt(el && el.claim, claims);
      if (r.error) {
        return {
          verdict: "fails",
          reason: "an element's claim address does not resolve against this Leg's claims",
          evidence: [`${role} ${r.error}`],
          span: leg.figure.lines,
        };
      }
      const cw = contentWords(el && el.text);
      const gs = new Set(contentWords(r.claim));
      const share = cw.length ? cw.filter((w) => gs.has(w)).length / cw.length : 0;
      if (share < floor) {
        return {
          verdict: "fails",
          reason: "an element is worded in terms its bound claim does not carry",
          evidence: [`${role} — ${renderSide(el && el.text)}`, `its claim — ${r.claim}`],
          span: leg.figure.lines,
        };
      }
    }
    return {
      verdict: "holds",
      reason: "every element is worded in the terms of the claim it is bound to",
      span: leg.figure.lines,
    };
  },
};

// THE PASS IS THE CALLER'S, NOT THE RUN RECORD'S (PR #1004 round 1, finding 1).
// `compare` IS pass one whatever pass the run has since reached — the record it
// writes is named `pass-1/join.json` for exactly that reason — so the pair
// inputs that record indexes must land beside it. Reading the pass off the run
// record here put a `compare` run made after `check` into `pass-2/join/`, over
// the inputs pass two was judging, and the ledger could not refuse it because
// the writing pass read as the owning one.
function renderJoinPacket(ws, run, pass, draft, leg, item, pair, declaredText, outlineText) {
  const tplPath = join(dirname(fileURLToPath(import.meta.url)), "..", "join-template.md");
  if (!existsSync(tplPath)) {
    fail(`the join template is absent — ${tplPath}. It is the judging model's entire input, so a `
      + "missing template is a hole the model fills by invention; this refuses rather than asking "
      + "a question with no form.");
  }
  let out = readFileSync(tplPath, "utf8").replace(/^<!--[\s\S]*?-->\n*/, "");
  const fields = {
    leg_id: leg.leg_id,
    item: item.id,
    item_class: item.class,
    declared: declaredText,
    reverse: outlineText,
    span: `${leg.lines[0]}–${leg.lines[1]}`,
    // THE JUDGING READER IS TOLD WHICH CARRIER DECLARED THE LINE. It is not the
    // blind reader — it sees both sides by design — and a figure record's line
    // rendered under a heading saying `Packet` would name the wrong artifact in
    // every finding a reader of the join record goes on to repair.
    declared_source: item.declared_source ?? "Packet",
    quoted: quotedPassage(leg),
    question: item.question,
    record_command: `<verdicts.json> | node src/review-draft.mjs compare --draft ${relative(process.cwd(), draft.path) || draft.path}`,
  };
  for (const [k, v] of Object.entries(fields)) out = out.split(`{{${k}}}`).join(v);
  const left = out.match(/\{\{(\w+)\}\}/);
  if (left) {
    fail(`the join template's slot {{${left[1]}}} was not filled — the renderer and the template `
      + "disagree about the slot set, which is the round trip failing silently");
  }
  const name = pair === null ? `${leg.leg_id}.${item.id}.md` : `${leg.leg_id}.${item.id}.${pair}.md`;
  const dest = passPathAt(ws, run, pass, "join", name);
  writeFileSync(dest, out.endsWith("\n") ? out : out + "\n");
  return dest;
}

const verdictKey = (leg_id, item, pair) => (pair === null || pair === undefined
  ? `${leg_id}/${item}` : `${leg_id}/${item}#${pair}`);

// WHAT JUDGED THIS PASS, READ BACK FROM THE RECORDED VERDICTS (kogaki#997).
// ReviewDraft pins a different model per role, and the Harness invokes none of
// them, so this line is a RENDERING OF A DECLARATION and says so — the same
// form terrain took for its judge pin, where naming it as an observation
// claimed a check nobody performed.
//
// SEVERAL IDS RENDER AS SEVERAL, never as one summary. A pass whose pair
// judgments ran on the pinned Haiku and whose corrections ran on the
// stronger model is the intended split; a pass showing a THIRD id, or the
// interactive default, is a pin that slipped, and that is exactly the reading
// this line exists to make possible.
const judgedByLine = (...callSets) => {
  const ids = [...new Set(callSets.flat().map((c) => c && c.model).filter(Boolean))].sort();
  return ids.length
    ? `judged by DECLARED model(s) — ${ids.join(", ")}; the Harness invoked no model and verified none.\n`
    : "";
};

// THE VERDICT FILE IS VALIDATED AGAINST WHAT THE RUN ACTUALLY OWES, and every
// refusal names what it saw: a pair nobody was asked about, a token outside
// the closed three, and a reason carrying a digit. A DIGIT IN THE REASON IS
// REFUSED because a number in the sentence is where a score comes back in;
// line numbers are the Harness's and already sit in the span. THE VERDICTS
// ARRIVE AS TEXT, not as a path (kogaki#1100), and every refusal names the
// stream.
function recordVerdicts(run, text, owed, items) {
  let doc;
  try { doc = JSON.parse(text); }
  catch (e) {
    fail(`the verdicts on ${STDIN_LABEL} are not readable JSON (${e.message}) — a verdicts reply is `
      + `one JSON object carrying \`verdicts\`: [{leg_id, item, pair?, verdict, reason, model}]`);
  }
  const list = doc && !Array.isArray(doc) && Array.isArray(doc.verdicts) ? doc.verdicts : null;
  if (!list) {
    fail(`the reply on ${STDIN_LABEL} carries no \`verdicts\` array — it is one JSON object of the form `
      + `{"verdicts": [{"leg_id": ..., "item": ..., "verdict": ..., "reason": ..., "model": ...}]}`);
  }
  // A PAIR ALREADY ANSWERED IS STILL ANSWERABLE (PR #895 round 1, finding 5).
  // `owed` shrinks as verdicts land, so validating against it alone refused a
  // re-submitted file — and a reviewer correcting an answer they got wrong met
  // "which this run did not ask about", which is false: the run did ask, and was
  // answered. A revision overwrites; only a pair the run never asked about, and
  // a mechanical item, are refused.
  const askable = new Map(owed.map((o) => [o.key, o]));
  for (const k of Object.keys(run.verdicts || {})) if (!askable.has(k)) askable.set(k, { key: k });
  const owedBy = askable;
  const problems = [];
  const accepted = [];
  list.forEach((v, i) => {
    const at = `\`verdicts\`[${i}]`;
    if (v === null || typeof v !== "object" || Array.isArray(v)) { problems.push(`${at} must be an object`); return; }
    const key = verdictKey(v.leg_id, v.item, v.pair === undefined ? null : v.pair);
    if (!owedBy.has(key)) {
      const mech = items.items.find((it) => it.id === v.item && it.mode === "mechanical");
      problems.push(mech
        ? `${at} answers \`${key}\`, which is a MECHANICAL item — the Harness decides it `
          + "from string facts about the Draft and the Packet, and a recorded judgment over one would "
          + "silently replace a computed fact"
        : `${at} answers \`${key}\`, which this run did not ask about — the pairs it owes are `
          + `${owed.length ? owed.map((o) => o.key).join(", ") : "(none)"}`
          + `${Object.keys(run.verdicts || {}).length
            ? `, and the pairs it has already answered, which a revision may overwrite, are `
              + `${Object.keys(run.verdicts).join(", ")}` : ""}`);
      return;
    }
    if (!items.verdicts.includes(v.verdict)) {
      problems.push(`${at} carries the verdict \`${v.verdict}\` — the closed set is `
        + `${items.verdicts.join(", ")}, and there is no fourth answer`);
      return;
    }
    if (typeof v.reason !== "string" || v.reason.trim() === "") {
      problems.push(`${at} carries no \`reason\` — one sentence saying what does or does not agree`);
      return;
    }
    if (/[0-9]/.test(v.reason)) {
      problems.push(`${at}'s reason carries a digit — line numbers are rendered in the span and `
        + "every other number in a review is a score by another name; write it as a word");
      return;
    }
    // THE MODEL THAT PRODUCED THE VERDICT IS PART OF THE VERDICT (kogaki#997).
    // ReviewDraft pins a different model per role — a pair judgment is one
    // fixed question with a three-token answer, the outlines and the
    // corrections write evidence and prose —
    // and a record that does not say which one answered cannot be read back to
    // check that the pin held. The 2026-09-07 run is the case: a hundred and
    // more model calls, and nothing in `join.json` says what ran any of them.
    if (typeof v.model !== "string" || v.model.trim() === "") {
      problems.push(`${at} carries no \`model\` — the id of the model that produced this verdict, `
        + "as passed to `--model` at the spawn. It is a DECLARATION: the Harness invokes no judge and "
        + "verifies nothing about it, which is exactly why it must be written down rather than inferred");
      return;
    }
    if (/\s/.test(v.model.trim())) {
      problems.push(`${at}'s \`model\` carries whitespace — it is one model id, the value \`--model\` `
        + `took, and \`${v.model.trim()}\` is not one`);
      return;
    }
    accepted.push({ key, leg_id: v.leg_id, item: v.item, pair: v.pair === undefined ? null : v.pair,
      verdict: v.verdict, reason: v.reason.trim(), model: v.model.trim() });
  });
  if (problems.length) {
    fail(`the verdicts on ${STDIN_LABEL} were not recorded:\n  - ${problems.join("\n  - ")}`);
  }
  run.verdicts = run.verdicts || {};
  for (const a of accepted) run.verdicts[a.key] = a;
  return accepted.length;
}

// ---------------------------------------------------------------------------
// The join itself.

// The declared and reverse sides as the judging model reads them. An array
// renders as a list, an object as its own labelled lines, and a NULL outlined
// field means the reverse side IS THE PROSE — the negative items, which ask
// whether something is absent from the passage rather than whether two lines
// agree.
// A REVERSE SIDE IS ONE BRIEF LEG FIELD, AND THE PATH IS FLAT (kogaki#1014).
// The dotted one-level reach this function used to allow existed for
// `figure_reading`, the deleted record's one object field; a Brief Leg field
// is a line, so there is nothing left to reach into. A dotted path is refused
// by name rather than resolved to `undefined`, which is how a table naming a
// field nobody computes would otherwise read as a side that simply was not
// outlined.
function outlineField(rec, path) {
  if (String(path).includes(".")) {
    fail(`the item table names the reverse field \`${path}\`, and a reverse side is ONE `
      + "Brief Leg field, which is a line rather than an object. A dotted path would be a query "
      + "over a second schema beside the Brief's, which is what src/review-items.json's own note "
      + "records as declined");
  }
  return rec[path];
}

// The REVERSE side of one judged row, rendered. A row names its side on exactly
// one of two artifacts — `field` reads the passage's Reverse Outline in the
// Brief's names, `figure_field` reads the figure's in the RECORD's names — and a
// row naming neither is asking whether something is ABSENT from the prose, whose
// side is the prose itself.
//
// A ROW NAMING BOTH IS REFUSED. The two readings are separate artifacts written
// in separate vocabularies, and a row reading one line out of each would be the
// translation column kogaki#1014 deleted, arriving back as a pair of keys.
function reverseSide(item, rec, figRec) {
  if (item.field && item.figure_field) {
    fail(`the item table declares \`${item.id}\` with both \`field\` and \`figure_field\` — a row reads `
      + "ONE reading, and a row spanning both would be a translation between the Brief's field names "
      + "and the figure record's");
  }
  if (item.figure_field) {
    if (!figRec) {
      fail(`the item table declares \`${item.id}\` against the figure's reading, and this Leg has none `
        + "— a figure row is evaluated only on a Leg whose trace carries a figure");
    }
    return renderSide(outlineField(figRec, item.figure_field));
  }
  if (item.field) return renderSide(outlineField(rec, item.field));
  return "(the passage itself, quoted below — this item asks whether something is ABSENT from it)";
}

// The declared side of one judged row, rendered. THREE CARRIERS, and the row
// says which — the Packet block, the figure record's field, or the passage
// itself. `elements` is rendered by its own function because a bare object
// dump would carry each element's claim address into the question, and the
// claim is what the mechanical row already answers.
function declaredSide(leg, item, declared, items) {
  if (item.record_field) {
    const v = figureDeclared(leg, item);
    if (item.record_field === "elements") return renderElements(v);
    const also = (item.also_declared_blocks || [])
      .map((b) => `- **the Leg's ${b}.** ${renderSide(declared[b])}`);
    return also.length
      ? [`- **the record's ${item.record_field}.** ${renderSide(v)}`, ...also].join("\n")
      : renderSide(v);
  }
  if (item.declared_block) {
    // A BLOCK ROW MAY CARRY COMPANION BLOCKS (kogaki#1237). `already-knows`
    // judges reliance on held material while re-introducing re-activated
    // material is allowed, so the judge needs BOTH lists: each renders under
    // its own name, the row's own block first.
    const also = (item.also_declared_blocks || [])
      .map((b) => `- **the Leg's ${b}.** ${renderSide(declared[b])}`);
    return also.length
      ? [`- **the Leg's ${item.declared_block}.** ${renderSide(declared[item.declared_block])}`, ...also].join("\n")
      : renderSide(declared[item.declared_block]);
  }
  if (item.declared_source === "passage") {
    return "(the passage and the figure beside it, quoted below — both sides of this pair were "
      + "read from them)";
  }
  return renderSide(null);
}

// AN ENTRY OF A REVERSE OUTLINE LIST IS AN OBJECT CARRYING ITS OWN WORDS.
// `claims`, `introduces` and `concession` each read back as `{ text }` — the
// Brief's own line, verbatim. There is no span: a span was the outlined
// record's coordinate, and a Brief Leg field does not carry one, so an entry
// renders as what it says. `renderEntry` below still honours a `text`/`span`
// pair where one exists, because the figure half still writes them.
const ENTRY_KEY_PAIRS = [["text", "span"], ["claim", "span"], ["of", "span"]];
function entryKeyPairs() { return ENTRY_KEY_PAIRS; }

// ONE ENTRY OF A RENDERED LIST (kogaki#995). Interpolating the entry directly
// put `[object Object]` in front of the judging model, which answered
// `cannot-decide` — correctly, since it was shown nothing — and the run recorded
// that as a judgment about the article rather than as a defect in the tool. An
// entry renders as its own words AND the draft lines it was read from,
// because the span is the coordinate every other side of the join already cites.
function renderEntry(x) {
  if (x === null || x === undefined) return "(none)";
  if (typeof x !== "object") return String(x);
  for (const [textKey, spanKey] of entryKeyPairs()) {
    const span = x[spanKey];
    if (typeof x[textKey] !== "string") continue;
    if (Array.isArray(span) && span.length === 2) {
      return `${x[textKey]} (lines ${span[0]}\u2013${span[1]})`;
    }
    // NO SPAN IS THE ORDINARY CASE NOW (kogaki#1014). A Reverse Outline is a
    // Brief Leg block and a Brief field carries no draft coordinate, so the
    // entry renders as its own words rather than falling through to the
    // key-by-key dump, which is what put `[object Object]` noise in
    // front of the judging model before.
    return x[textKey];
  }
  // A form the schema does not declare still reads as its own keys and values.
  // Falling back to the stringification is what produced the defect above.
  return Object.entries(x).map(([k, v]) => `**${k}.** ${v}`).join("; ");
}

function renderSide(v) {
  if (v === null || v === undefined) return "(none)";
  if (Array.isArray(v)) {
    return v.length ? v.map((x) => `- ${renderEntry(x)}`).join("\n") : "(none)";
  }
  if (typeof v === "object") return Object.entries(v).map(([k, x]) => `- **${k}.** ${x}`).join("\n");
  return String(v);
}

// EVERY (Leg, item) PAIR, computed fresh: mechanical items are decided here,
// judged items are rendered as join Packets and answered from the run record,
// and nothing is cached across a call. `opts.bound` and `opts.carry` ARE THE
// SECOND PASS'S WHOLE MECHANISM (kogaki#874): with no bound every pair is
// computed; with one, a pair outside it is CARRIED from `opts.carry` and is
// neither rendered nor logged, which is what makes the bound checkable in
// `check.json`. `opts.pass` is REQUIRED and is the pass the CALLING COMMAND
// is — `compare` passes 1 and `check` passes 2 — never defaulted.
function buildJoin(draft, run, items, ws, opts = {}) {
  const pass = requirePass(opts.pass, "buildJoin");
  // SCOPED TO `run.legs`, NEVER TO THE WHOLE TRACE (kogaki#1165). An
  // ordinary run's `run.legs` already names every Leg `open` found, so this
  // filter is a no-op there; a term-list change path's run names only the
  // Legs Lint named, and this is the one site that used to re-derive the
  // whole Draft's Leg set straight from the trace and silently widen a
  // scoped run back out to every Leg at the join.
  const { legs: allLegs } = resolveInputs(draft);
  const scopedIds = new Set(run.legs.map((s) => s.leg_id));
  const legs = allLegs.filter((s) => scopedIds.has(s.leg_id));
  const bound = typeof opts.bound === "function" ? opts.bound : null;
  const carry = opts.carry || [];
  const results = [];
  const owed = [];
  const modelCalls = [];
  const mechanicalLog = [];
  const verdicts = run.verdicts || {};

  legs.forEach((leg, si) => {
    const declared = declaredFor(leg, items);
    let rec;
    try { rec = JSON.parse(readFileSync(run.outlineFields[leg.leg_id], "utf8")); }
    catch (e) { fail(`the Reverse Outline for ${leg.leg_id} is not readable (${e.message})`); }
    // THE FIGURE'S READING, WHERE THE READER MET ONE. Absent on a figureless
    // Leg, and the figure rows are not evaluated there at all — never as a
    // vacuous `holds`, which would put a figure line in a figureless Draft's log.
    let figRec = null;
    if (leg.figure) {
      const fp = (run.figureOutlineFields || {})[leg.leg_id];
      if (!fp || !existsSync(fp)) {
        fail(`leg ${leg.leg_id} renders a figure and its Reverse Outline carries no reading of it — `
          + "re-file the Leg's outline with its `figure` block, which `outline` validates and records "
          + "in the same act");
      }
      try { figRec = JSON.parse(readFileSync(fp, "utf8")); }
      catch (e) { fail(`the figure's Reverse Outline for ${leg.leg_id} is not readable (${e.message})`); }
    }
    const earlier = legs.slice(0, si);

    for (const item of items.items) {
      // A FIGURE ROW ON A FIGURELESS LEG IS NOT EVALUATED, NOT RENDERED AND
      // NOT LOGGED (kogaki#880), and the skip is FIRST — before the bound, so
      // pass two neither carries it nor demands a pass-one answer for it. A
      // vacuous `holds` would be the cheaper implementation and the wrong one:
      // it puts an answer about nothing beside answers about something, and it
      // makes the mechanical arm of the second pass's bound report coverage of
      // Legs that have no figure to cover.
      if (item.figure_only && !leg.figure) continue;
      // OUT OF BOUND: CARRIED, AND THE CHECK IS FIRST. Placed before the
      // mechanical dispatch and before any join Packet is rendered, so an
      // out-of-bound pair costs no model call and appears in neither log. A
      // carried row keeps pass one's verdict, class, reason and span and is
      // marked `carried` — a reader of the pass-two record can tell a re-judged
      // answer from a preserved one, which an unmarked copy would not allow.
      if (bound && !bound(leg.leg_id, item.id)) {
        const prev = carry.find((r) => r.leg_id === leg.leg_id && r.item === item.id);
        if (!prev) {
          fail(`the bounded second pass carries ${leg.leg_id}/${item.id} from pass one and pass `
            + "one recorded no answer for it. A carried pair with nothing to carry would render as "
            + "a verdict this run never reached; re-run `compare --draft <draft.md>` so the pair is "
            + "answered before it is carried.");
        }
        // THE SPAN IS RE-ANCHORED TO THE LEG'S CURRENT RANGE (PR #906 round 1,
        // finding 2). A carried row keeps pass one's verdict, class and reason
        // — those are readings of prose that has not moved — but NOT its
        // coordinates: a correction changes the Draft's line count, so a
        // pre-correction range rendered under the post-correction body sha
        // names whatever now sits at those numbers. That is the drifting-range
        // defect this Harness's own outline cases are built to catch, one
        // layer out. A leg-level range is coarser than the pair-level one it
        // replaces and it is TRUE, which is the trade: a true coarse
        // coordinate beats a false precise one. Pass one's own is kept beside
        // it, named as pass one's, so nothing is lost — only re-labelled.
        const reanchored = { ...prev, span: leg.lines, pass_one_span: prev.span, carried: true };
        if (Array.isArray(prev.pairs)) {
          reanchored.pairs = prev.pairs.map((x) => ({ ...x, span: leg.lines, pass_one_span: x.span }));
        }
        results.push(reanchored);
        continue;
      }
      const ctx = { declared, rec, leg, draft, earlier, items, item };

      if (item.mode === "mechanical") {
        const impl = MECHANICAL[item.id] || MECHANICAL_FIGURE[item.id];
        if (!impl) {
          fail(`the item table declares \`${item.id}\` mechanical and this Harness has no `
            + "implementation for it — a mechanical item with no check would report `holds` for "
            + "every Draft, which is the silent pass this whole comparison exists to refuse");
        }
        const r = impl(ctx);
        results.push({ leg_id: leg.leg_id, item: item.id, class: item.class,
          judged: false, ...r });
        mechanicalLog.push({ leg_id: leg.leg_id, item: item.id });
        continue;
      }

      // A declared side the Packet renders as a stated absence can leave an
      // item with nothing to ask about: a negative item goes vacuous (there is
      // no exemplar, so nothing of one can leak) and a positive one quantifies
      // over an empty list (`claims`, and since kogaki#1016 `introduces`).
      // Either way the answer is a FACT about the declared side, so the table
      // says so per item and NO Packet is rendered — the runtime never decides
      // it, and never pays a judge for a question about nothing.
      const dv = item.declared_block ? declared[item.declared_block] : null;
      if (item.when_declared_absent
          && (dv === "" || (Array.isArray(dv) && dv.length === 0))) {
        results.push({ leg_id: leg.leg_id, item: item.id, class: item.class,
          judged: false, verdict: item.when_declared_absent.verdict,
          reason: item.when_declared_absent.sentence, span: leg.lines });
        mechanicalLog.push({ leg_id: leg.leg_id, item: item.id });
        continue;
      }

      const subs = [];
      if (item.mode === "per-declared") {
        // ONE PACKET PER DECLARED ENTRY, AND THE QUESTION IS RECOVERY
        // (kogaki#1132): the pair index is the DECLARED side's, the reverse
        // side is everything the reader wrote for the field, and surplus is
        // not judged — a correctly realized passage asserts MORE than its
        // declared claim by design. EACH ENTRY CARRIES THE DECLARED TEXT IT
        // WAS ASKED ABOUT, so the correction can name the lost claim.
        const declaredEntries = declared[item.declared_block] || [];
        const reverseWhole = renderSide(rec[item.field] || []);
        // THE REVERSE SIDE OF AN OPENING ROW IS THE PARAGRAPH'S OWN FIRST SENTENCE
        // (kogaki#1447), read from the prose for the paragraph the declared entry names,
        // never the reader's outline: whether an opening reproduces its line is a question
        // about the sentence on the page.
        const reverseFor = (declaredText) => {
          if (item.reverse_source !== "opening_sentence") return reverseWhole;
          const n = labelledEntryParagraph(items, item.declared_block, declaredText);
          const sentence = n === null ? null : legOpeningSentence(leg, n);
          return sentence === null ? item.reverse_absent.split("{n}").join(String(n))
            : item.reverse_entry.split("{n}").join(String(n)).split("{sentence}").join(sentence);
        };
        declaredEntries.forEach((declaredText, i) => {
          const key = verdictKey(leg.leg_id, item.id, i);
          const file = renderJoinPacket(ws, run, pass, draft, leg, item, i,
            renderSide(declaredText), reverseFor(declaredText));
          // THE VERDICT IS READ BEFORE THE CALL IS LOGGED, so the log can name
          // the model that answered it. An unanswered call carries `model:
          // null` — owed, not judged by nobody.
          const v = verdicts[key];
          modelCalls.push({ leg_id: leg.leg_id, item: item.id, pair: i, packet: file,
            model: v ? v.model ?? null : null });
          subs.push(v
            ? { pair: i, declared: declaredText, verdict: v.verdict, reason: v.reason,
                model: v.model ?? null, span: leg.lines, judged: true }
            // AN UNANSWERED PAIR IS `judged: false` AND CARRIES NO `model`: a
            // Packet was rendered for it, and nothing has come back. `judged`
            // says a Judge ANSWERED, never that one was owed a question — an
            // owed pair that read `true` would be a claim about a call that has
            // not happened, which is the claim the missing `model` key already
            // refuses one field over.
            : { pair: i, declared: declaredText, owed: true, judged: false,
                key, packet: file, span: leg.lines });
          if (!v) owed.push({ key, leg_id: leg.leg_id, item: item.id, pair: i, packet: file });
        });
      } else {
        const key = verdictKey(leg.leg_id, item.id, null);
        const file = renderJoinPacket(ws, run, pass, draft, leg, item, null,
          declaredSide(leg, item, declared, items),
          reverseSide(item, rec, figRec));
        const v = verdicts[key];
        modelCalls.push({ leg_id: leg.leg_id, item: item.id, pair: null, packet: file,
          model: v ? v.model ?? null : null });
        subs.push(v
          ? { pair: null, verdict: v.verdict, reason: v.reason, model: v.model ?? null,
              span: leg.lines, judged: true }
          : { pair: null, owed: true, judged: false, key, packet: file, span: leg.lines });
        if (!v) owed.push({ key, leg_id: leg.leg_id, item: item.id, pair: null, packet: file });
      }

      if (!subs.length) {
        results.push({ leg_id: leg.leg_id, item: item.id, class: item.class, judged: false,
          verdict: "holds", reason: "the reverse side carries nothing for this item to disagree with",
          span: leg.lines });
        mechanicalLog.push({ leg_id: leg.leg_id, item: item.id });
        continue;
      }
      if (subs.some((s) => s.owed)) {
        results.push({ leg_id: leg.leg_id, item: item.id, class: item.class, owed: true,
          judged: false, span: leg.lines });
        continue;
      }
      // THE ITEM'S LINE RENDERS THE STRONGEST NON-`holds` ANSWER AMONG ITS
      // PAIRS AND NAMES IT — a SELECTION, never an aggregate. Every pair's own
      // verdict is written to the join record, so nothing is summed, averaged
      // or scored on the way to one line; `fails` wins over `cannot-decide`
      // because a fail is the answer that has a consequence, and neither is
      // rounded into `holds`.
      const chosen = subs.find((s) => s.verdict === "fails")
        || subs.find((s) => s.verdict === "cannot-decide") || subs[0];
      const rowJudged = subs.some((s) => s.judged);
      // THE ROW'S EVIDENCE IS THE DECLARED TEXT OF EVERY ENTRY THAT DID NOT HOLD
      // (kogaki#1132). The comparison line carries one pair's reason and no
      // quoted material — that is the no-numbers rule, and a declared claim can
      // carry a digit — so the quoted side goes where quoted material already
      // goes: the finding's evidence, which the owner record and the correction
      // input both render in full. `cannot-decide` is included and never
      // rounded: a declared claim the reader could not settle is exactly what a
      // person is being asked to look at.
      const lost = subs.filter((s) => s.declared !== undefined && s.verdict && s.verdict !== "holds")
        .map((s) => s.declared);
      results.push({ leg_id: leg.leg_id, item: item.id, class: item.class,
        judged: rowJudged,
        // THE CHOSEN PAIR IS NAMED ON THE ROW (PR #1004 round 2, finding 5). The
        // row's verdict, reason and span are one pair's, and the owner record's
        // pointer to the Packet that pair was judged on cannot be composed from a
        // row that does not say which — `pairs` holds every pair, and the
        // selection is what this line is.
        pair: chosen.pair,
        verdict: chosen.verdict, reason: chosen.reason,
        // THE KEY IS PRESENT EXACTLY WHERE `judged` IS TRUE, and its VALUE is
        // the chosen pair's (PR #1001 round 1). `judged` REPLACED `decided_by`
        // AT kogaki#1134: the boolean says whether a Judge was asked at all
        // and `model` says which. On a HYBRID row (some pairs Harness-decided,
        // some judged) `judged` is a fact about the row's pairs while every
        // other field is the CHOSEN pair's, so presence answers "was a model
        // asked here at all" and `null` answers "not for this line". No row in
        // the shipped table is hybrid since kogaki#1132; the rule is kept
        // rather than retired. The truth per pair is in `pairs`.
        ...(rowJudged ? { model: chosen.model ?? null } : {}),
        ...(lost.length ? { evidence: lost } : {}),
        span: chosen.span, pairs: subs });
    }
  });

  return { results, owed, modelCalls, mechanicalLog, legs };
}

// THE NO-NUMBERS RULE, IN ONE PLACE (kogaki#1097). One rendering holds it since
// kogaki#1134 took the written comparison file away, and it stays a named
// function rather than an inline regex: a rule carried by copies of a regex is a
// rule that holds in one of them after the first repair, and the second
// rendering is one issue away at any time. The guard is scoped to the REASON, as
// it always was: the span is a coordinate, and a pinned model id or a pair index is
// the name of a thing rather than a reading that could be compared.
function refuseNumericReason(r, where) {
  if (/[0-9]/.test(r.reason)) {
    fail(`the comparison line for ${where} carries a digit in its reason `
      + `(${JSON.stringify(r.reason)}). A comparison line renders line numbers and nothing else `
      + "numeric — every other number in a review is a score by another name, and quoted material "
      + "belongs in the finding's evidence rather than in the line.");
  }
}

// ONE LINE PER (Leg, item), AND NO NUMBER IN IT THAT IS NOT A LINE NUMBER —
// ENFORCED HERE RATHER THAN PROMISED: the span is the only numeric field, and
// a reason carrying a digit refuses the whole emission by name. The first live
// drive broke it — `claims-unused` rendered `claim (strand L97)` into a line —
// so quoted material is EVIDENCE, for the join record and the owner record,
// and never for the line whose only numbers are coordinates.
function comparisonLine(r) {
  refuseNumericReason(r, `${r.leg_id}/${r.item}`);
  const w = (s, n) => String(s).padEnd(n, " ");
  return `${w(r.leg_id, 8)}${w(r.item, 26)}${w(r.verdict, 14)}`
    + `${w(`[${r.span[0]}-${r.span[1]}]`, 14)}${r.reason}`;
}

export { verdictKey, judgedByLine, recordVerdicts, buildJoin, comparisonLine };
