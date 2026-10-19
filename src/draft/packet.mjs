// draft/packet — the Section Packet template, claim lines, the figure input and the figure record refusal.
// Cut from src/draft.mjs at its named section (kogaki#1461); the design and
// its rulings are stated at the entry and in the Issues each block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the Leg Packet; the Section grouping; the figure
//       decision; the figure record; the judgment rule
//
import { figureKinds } from "../compose.mjs";

// ---------------------------------------------------------------------------
// THE SECTION PACKET (the Leg Packet, kogaki#749; owner rulings 2026-09-01).
//
// The harness-assembled input from which the model realizes ONE Leg's prose —
// the one LLM judgment of the Draft lane. `packet --leg <id>` renders it
// DETERMINISTICALLY from the template plus the Brief plus
// the workspace's realized Sections plus the derived ledger; the session
// realizes the prose; `section` validates it as before.
//
// THE PACKET IS THE MODEL'S ENTIRE INPUT. Nothing outside it is read, which is
// why every block opens with a fixed usage header saying what the block is FOR:
// a block whose use is not stated gets used for whatever it resembles.
//
// DETERMINISTIC means the same inputs render the same bytes. No timestamp, no
// run id, no ordering that depends on a directory read: the Sections come in
// the Brief's recorded order and the ledger is recomputed from the path.

// NO MOVE FIELD IS RENDERED (kogaki#1311, owner decision 2026-10-09). The
// Packet carried the bound Move's `technique`, `question` and `breaks` until
// this issue, and the writer instantiated the Move's general route alone —
// the instantiation the 2026-10-05 and 2026-10-08 runs refused at Leg 2 and
// Leg 4. The Leg now carries that instantiation itself, as `waypoints`
// written at composition and judged there against the Move, and the Packet
// renders the waypoints in the Move block's place. No Move file is opened
// to render a Packet.

// ---------------------------------------------------------------------------
// the figure record — its realization-side machinery (kogaki#878).
//
// THE PACKET IS THE MODEL'S ENTIRE INPUT, AND THE FIGURE INPUT IS THAT PACKET
// PLUS ONE BLOCK. The block is appended only for a Leg carrying `figure:`,
// and only AFTER that Leg's prose is recorded — the hub's third moment,
// concrete design after the text. It travels in the same template file as the
// Packet, behind a marker the Packet render splits away, because a second
// template file would be a second carrier for one model-facing surface.

const FIGURE_INPUT_MARKER = "<!-- FIGURE-INPUT -->";

// ONE SPLIT, TWO CONSUMERS. `renderPacket` takes the first half and would
// otherwise refuse on the figure block's unfilled slots; `renderFigureInput`
// takes the second. Both read the same file, so the marker cannot drift out
// from under one of them.
export function splitPacketTemplate(text) {
  const at = text.indexOf(FIGURE_INPUT_MARKER);
  if (at === -1) {
    return { error: `the Packet template carries no ${FIGURE_INPUT_MARKER} marker — the figure block lives behind it (the figure record), and a template without it cannot say where the Packet ends` };
  }
  return { packet: text.slice(0, at).trimEnd() + "\n", figure: text.slice(at + FIGURE_INPUT_MARKER.length) };
}

// The Leg's claim lines, in the order they are declared. `g<n>` addresses
// this list 1-based (the figure decision), and the address space is THIS Leg's claims —
// which is what makes a role bound to another Leg's claim unreachable rather
// than refused by a rule.
function claimLines(leg) {
  return (leg.claims || []).map((g) => `claim (strand ${g.strand}): ${g.proposition}`);
}
// VERBATIM, THE WHOLE LINE. The binding block quotes what the Brief recorded,
// including which Strand or Leg effect licensed it: an element is that claim
// worded for the reader, and a reader of the record who cannot see the licence
// cannot tell a wording from an invention.
function claimAt(leg, addr) {
  const m = /^g([1-9][0-9]*)$/.exec(String(addr));
  if (!m) return null;
  return claimLines(leg)[Number(m[1]) - 1] ?? null;
}

// The form for one figure-carrying Leg, with its roles in the CLOSED SET'S
// declared order rather than the record's key order — the same record must
// render the same bytes, and object key order is an accident of how the file
// was written.
//
// THE KIND IS READ OFF THE LEG, NOT THE MOVE (kogaki#1311). Every kind in
// src/figure-kinds.json has its own role set, and the Leg's `figure_roles`
// binds exactly the roles of its Move's form — composition refused anything
// else while the Move was still in reach (`resolveFigureForms`). So the kind
// whose role set equals the Leg's bound roles IS that form's kind, and the
// figure is designed without opening the Move. What a role means is the
// kind's `relation` line and the claim it is bound to; the Move's own wording
// for a role stays with the Move, whose responsibility ends at the Candidate.
export function figureFormFor(leg) {
  const kinds = figureKinds().kinds || {};
  const bound = Object.keys(leg.figure_roles || {}).sort();
  const matches = Object.entries(kinds).filter(([, k]) => {
    const roles = [...(k.roles || [])].sort();
    return roles.length === bound.length && roles.every((r, i) => r === bound[i]);
  });
  if (matches.length !== 1) {
    return { error: `leg ${leg.leg_id}: figure_roles binds ${bound.length ? bound.map((r) => `"${r}"`).join(", ") : "no role"}, `
      + `which is ${matches.length ? "the role set of more than one kind" : "the role set of no kind"} in src/figure-kinds.json `
      + `(${Object.entries(kinds).map(([n, k]) => `${n}: ${(k.roles || []).join(", ")}`).join("; ")}) — composition binds exactly `
      + `one form's roles, so this Brief has been edited since it was adopted` };
  }
  const [kind, decl] = matches[0];
  const roles = decl.roles || [];
  return { kind, roles, relation: decl.relation, lines: Object.fromEntries(roles.map((x) => [x, decl.relation])) };
}

// The figure input: the stored Packet, unchanged, plus the filled block. The
// Packet is passed in as the BYTES THAT WERE SERVED rather than re-rendered,
// for the reason `cmdSection`'s backstop already gives — the record is what the
// prose was realized from, and a fresh render answers for the file as it stands.
export function renderFigureInput({ figureTemplate, packetText, leg, form, prose }) {
  const missing = form.roles.filter((r) => !form.lines[r]);
  if (missing.length) {
    return { error: `leg ${leg.leg_id}: the ${form.kind} form carries no line for ${missing.map((x) => `"${x}"`).join(", ")} — src/figure-kinds.json declares a relation for every kind, so the file has been edited since` };
  }
  const binding = [];
  for (const role of form.roles) {
    const addr = (leg.figure_roles || {})[role];
    const g = claimAt(leg, addr);
    if (g === null) {
      return { error: `leg ${leg.leg_id}: figure_roles binds "${role}" to ${JSON.stringify(addr ?? null)} and this Leg has no such claim — composition refuses this (the figure decision), so the Brief has been edited since it was adopted` };
    }
    binding.push(`- **${role}** — bound to \`${addr}\`:\n\n  ${g}`);
  }
  const fields = {
    figure_kind: form.kind,
    figure_form_roles: form.roles.map((r) => `- **${r}**`).join("\n") + `\n\nWhat holds between them: ${form.relation}.`,
    figure_binding: binding.join("\n"),
    figure_reason: leg.figure,
    figure_prose: prose.trim(),
  };
  let out = figureTemplate;
  for (const [k, v] of Object.entries(fields)) out = out.split(`{{${k}}}`).join(v);
  const left = out.match(/\{\{(\w+)\}\}/);
  if (left) return { error: `the figure block's slot {{${left[1]}}} was not filled — the renderer and the template disagree about the slot set, which is the round trip failing silently (the figure record)` };
  return { input: packetText.trimEnd() + "\n" + out };
}

// THE RECORD'S VALIDATION, and it is the MECHANICAL half only (the figure record). Every
// role present, no extra role, the kind equal to the form's, each element bound
// to the claim THE BRIEF bound that role to, a position from the closed pair,
// a non-empty caption and at least one relation. Whether an element's wording
// is fair to its claim, and whether the relations instantiate the kind's
// relation line, are judgments — the judgment rule's rule that a missing field is refused
// and a weak one is not, which is also why kogaki#880 reviews the figure by a
// round trip rather than by a lint here.
export function figureRecordRefusal(record, leg, form, schema) {
  const at = `the figure record for leg ${leg.leg_id}`;
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    return `${at} is not a JSON object — the record is the instance of the Leg's figure form, one object (src/figure-schema.json)`;
  }
  for (const key of schema.required) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      return `${at} carries no ${key} — src/figure-schema.json requires ${schema.required.join(", ")}`;
    }
  }
  const known = new Set([...schema.required, ...(schema.optional || [])]);
  const extra = Object.keys(record).filter((k) => !known.has(k)).sort();
  if (extra.length) {
    // REFUSED RATHER THAN IGNORED, the rule a closed key set states
    // for its own forbidden keys: an ignored field still shaped the reading
    // that produced the rest of the record.
    return `${at} carries ${extra.map((x) => `"${x}"`).join(", ")}, which src/figure-schema.json does not define — the record's fields are ${[...known].sort().join(", ")}`;
  }
  if (record.kind !== form.kind) {
    return `${at} declares kind ${JSON.stringify(record.kind)} and leg ${leg.leg_id}'s figure_roles bind the ${JSON.stringify(form.kind)} form — the record is the INSTANCE of that form (the figure decision), so its kind is the form's and never a choice made at realization`;
  }
  if (record.elements === null || typeof record.elements !== "object" || Array.isArray(record.elements)) {
    return `${at}: elements is one entry per role of the ${form.kind} form (${form.roles.join(", ")}), keyed by role`;
  }
  const have = new Set(Object.keys(record.elements));
  const missing = form.roles.filter((r) => !have.has(r));
  if (missing.length) {
    return `${at} leaves ${missing.map((x) => `"${x}"`).join(", ")} unfilled — every role of the ${form.kind} form carries an element (the form's roles are ${form.roles.join(", ")})`;
  }
  const surplus = [...have].filter((r) => !form.roles.includes(r)).sort();
  if (surplus.length) {
    return `${at} fills ${surplus.map((x) => `"${x}"`).join(", ")}, which is not a role of the ${form.kind} form — the form's roles are ${form.roles.join(", ")} (src/figure-kinds.json)`;
  }
  for (const role of form.roles) {
    const el = record.elements[role];
    if (el === null || typeof el !== "object" || Array.isArray(el)) {
      return `${at}: element "${role}" is an object carrying text and claim (src/figure-schema.json)`;
    }
    if (typeof el.text !== "string" || el.text.trim() === "") {
      return `${at}: element "${role}" carries no text — an element is its bound claim WORDED FOR THE READER, and an empty one is the position left open rather than filled`;
    }
    const want = (leg.figure_roles || {})[role];
    if (el.claim !== want) {
      // AC2. The Brief bound the role; the record may not move it. A swapped
      // claim is an element licensed by material the composer did not put
      // under that position, which is exactly the join kogaki#880 checks and
      // exactly the one nothing downstream could re-derive.
      return `${at}: element "${role}" is bound to ${JSON.stringify(el.claim ?? null)} and the Brief bound "${role}" to ${JSON.stringify(want ?? null)} — the binding is the Brief's decision (the figure decision), and a record that moves a role to another claim words it from material the composer did not put under that position`;
    }
  }
  if (!Array.isArray(record.relations) || record.relations.length === 0
      || record.relations.some((x) => typeof x !== "string" || x.trim() === "")) {
    return `${at}: relations is a non-empty list of lines — the kind's whole content is the relation it holds (${form.kind}: ${form.relation}), so a record asserting none is a list rather than a figure`;
  }
  if (typeof record.caption !== "string" || record.caption.trim() === "") {
    return `${at}: caption is one line in the terms of this Leg's reader_state_after — what the reader holds after looking`;
  }
  if (Object.prototype.hasOwnProperty.call(record, "emphasis")
      && !form.roles.includes(record.emphasis)) {
    return `${at}: emphasis is ${JSON.stringify(record.emphasis)}, which is not a role of the ${form.kind} form (${form.roles.join(", ")}) — emphasis names which element the figure leans on`;
  }
  const positions = schema.fields.position.one_of;
  if (!positions.includes(record.position)) {
    return `${at}: position is ${JSON.stringify(record.position ?? null)} and the closed pair is ${positions.join(", ")} — within its Leg a figure either sets the prose up or discharges it`;
  }
  return null;
}

// the Section grouping's Section, as the Packet says it (kogaki#825). The Packet is the
// model's ENTIRE input, so "which Section am I in" is answerable only if the
// Packet answers it — an opening Leg is told the title it is opening, and a
// continuing Leg is told the heading it sits under. Both forms name a title
// that is ALREADY ON THE PAGE or about to be, so neither invites the model to
// write one.
//
// The untitled case is the pre-Section-grouping corpus, which derives one untitled
// Section: it is STATED rather than left blank, for the same reason every other
// absence in this renderer is stated — a hole in the model's whole world is not
// a gap the model notices, it is a hole the model fills by invention.
export function sectionPlacement(sec) {
  // DEFENSIVE ONLY, and said so rather than advertised as a rendered form (PR
  // #844 round 1, finding 3). No Packet render reaches it: `sectionsOf` derives
  // one untitled Section for a path declaring nothing, and
  // `renderAndStorePacket` refuses an unknown Leg before the lookup. It is
  // kept so the function is total and removed from the assertions and from the
  // admission record, because a contract field claiming unreachable behaviour
  // is re-read at every later judgment on the member.
  if (sec === undefined) return "(no Section could be derived for this Leg.)";
  if (sec.title === undefined) {
    // The untitled form STILL SAYS WHICH (finding 3, second half): the block
    // above it promises "the line below says which", and a form that says
    // neither breaks that promise for the whole pre-Section-grouping corpus, which is the
    // only corpus that reaches it.
    // NO ORDINAL HERE (PR #847 round 1, nit 2). The arm that built one was
    // dead: `sectionsOf` pushes a new Section only where `opens_section` is
    // declared or where none exists yet, so an UNTITLED Section is always the
    // first and only one — the "th" branch was unreachable, would have rendered
    // "2th" if it ran, and told a later reader that untitled Sections beyond
    // the first exist. The single Section is named as such instead.
    return sec.opens
      ? "- **This Leg OPENS the article's one Section.** This Brief declares no Section titles, so no heading is rendered above your prose."
      : "- **This Leg CONTINUES the article's one Section.** This Brief declares no Section titles, so no heading is rendered, and prose you are writing further into sits above.";
  }
  const others = sec.leg_ids.length - 1;
  return sec.opens
    ? `- **This Leg OPENS a Section.** Its heading is **"${sec.title}"**, rendered by the Harness immediately above your prose.\n`
      + `- **Your prose is what the heading promises.** ${others === 0
          ? "This Leg is the whole Section."
          : `${others} further Leg${others === 1 ? "" : "s"} continue${others === 1 ? "s" : ""} under it, so open the question rather than closing it.`}`
    : `- **This Leg CONTINUES the Section headed "${sec.title}".** That heading is already on the page, above prose you are writing further into.\n`
      + `- **No new heading is rendered here.** Develop what the Section has established; a new subject belongs to a Leg that opens its own.`;
}

// PRIOR PROSE, SCOPED TO THE CURRENT SECTION ONLY (kogaki#1282, owner ruling
// 2026-10-06). A Section is a closed discourse segment (Grosz & Sidner): a
// referent sitting in an earlier Section is not reachable from here by
// pronoun or demonstrative, so an earlier Section's prose is never carried
// into this block, not even verbatim. What this Leg may read is its own
// Section's prose so far, and nothing from before it.
export function priorProseInSection(priorSections, sections, currentIndex, currentLegId) {
  const sec = (sections || []).find((s) => s.index === currentIndex);
  if (!sec) return null;
  const have = new Map(priorSections.map((p) => [p.leg_id, p.text]));
  const parts = sec.leg_ids.filter((id) => have.has(id)).map((id) => have.get(id));
  // AN EMPTY SECTION DOES NOT MEAN THIS LEG OPENS IT (PR #847 round 1,
  // finding 1). It means the Legs above it in that Section are not realized
  // yet, and the two states are distinguished by the Section's own recorded
  // path — which is what stops the Packet contradicting its own
  // `section_placement` block, where a continuing Leg is told the heading is
  // already on the page above prose it is writing further into.
  const opensIt = sec.leg_ids[0] === currentLegId;
  if (parts.length) return parts.join("\n\n");
  return opensIt
    ? "(nothing yet — this Leg opens the Section, so its prose is the first in it.)"
    : "(nothing yet — the Legs that open this Section are not realized, so no prose stands under this heading. You are NOT opening it: write as the Section's heading and your own Leg promise.)";
}
