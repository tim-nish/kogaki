// draft/render-packet — the Packet renderer and its store.
// Cut from src/draft.mjs at its named section (kogaki#1461); the design and
// its rulings are stated at the entry and in the Issues each block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the Leg Packet; the figure record
//
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { obligationRowsOf, parseReactivateEntry, parseIntroducesEntry, readerProse, audienceLanguage } from "../compose.mjs";
import { parseTermsYaml, renderLanguageBlock, sha256 as sha256Terms, DEFAULT_TERMS_PATH } from "../lint-ja.mjs";
import { obligationSaid, obligationTerms } from "../compose/sections.mjs";
import { sha256, readerTargetLine } from "./brief-reader.mjs";
import { resolveLegJourneys, packetPersonaPath, externalAuthorityOf, introduceLine, introducedMeaning, personaPriorKnowledge } from "./journeys.mjs";
import { splitPacketTemplate, sectionPlacement, priorProseInSection } from "./packet.mjs";
import { REALIZATION_LANGUAGES, langOf, sectionsDir, packetsDir, packetsRecordKey, sectionsOf, sectionOfLeg } from "./workspace.mjs";

// THE STATED ABSENCE (kogaki#1285 acceptance): rendered in place of
// `prior_knowledge` where the Persona declares none, so the Referents rule
// in `{{register}}` is never left pointing at a block the Packet does not
// carry, and nothing here refuses on the absence.
// A list row's terms render in the order they were raised, each quoted (kogaki#1549).
const quotedTerms = (o) => obligationTerms(o).map((t) => `"${t}"`).join(", ");
export const READER_OWN_WORLD_ABSENT =
  "(the Persona declares no prior knowledge; a referent comes from the Journey block alone)";

// The waypoints block's lines (kogaki#1311, kogaki#1326): a NUMBERED list,
// `<i>. <point> *Serves:* <claim>[; <claim>]`, one per Leg Waypoint, a `serves`
// entry resolved to this Leg's claim for that Strand; null on an empty route.
// Beneath each, an indented `*Opens from:* <join>` line where the ParagraphPlan
// carries a join (kogaki#1411) -- one relation word of its closed set (kogaki#1477) -- then its Paragraph Waypoints as a numbered
// sub-list (kogaki#1375) -- a `performs` entry as the italic `<j>. *<operation>*`
// with no point and no Serves (kogaki#1448) -- and a Paragraph Waypoint carrying its Segment's
// `manner` ends its line `*Manner:* <manner>` (kogaki#1510). Beneath the sub-list, a
// `*Promise:*` line per Paragraph-scale Obligation row and a `*Keeps:*` line per Brief row the
// paragraph discharges, each naming Paragraph Waypoints by their numbers -- material, asking
// for no sentence (kogaki#1530). Nothing else of a Move is rendered; a missing plan refuses at
// the realization entry (`loadBrief`), not here.
export const OPENS_FROM_LABEL = "*Opens from:*";
export const MANNER_LABEL = "*Manner:*";
export const PROMISE_LABEL = "*Promise:*";
export const KEEPS_LABEL = "*Keeps:*";
function promiseLine(o) {
  const said = o.kind !== "term" ? `${String(o.text).trim()} — raised at ${o.raised_by}`
    : Array.isArray(o.term) ? `the terms ${quotedTerms(o)}, named at ${o.raised_by} and explained in that order`
      : `the term "${o.term}", named at ${o.raised_by}`;
  if (o.conceded_by === undefined) return `   ${PROMISE_LABEL} ${said}, kept at ${o.discharged_by}.`;
  return `   ${PROMISE_LABEL} ${said}, left open at ${o.conceded_by}. Left open: ${o.open}. `
    + `Why not here: ${o.why_not_here}. What the reader keeps: ${o.reader_keeps}.`;
}
function keepsLine(d) {
  const said = d.row ? (d.row.kind === "term" ? `the meaning of ${quotedTerms(d.row)}` : String(d.row.text).trim()) : `the Brief's obligation ${d.obligation}`;
  return `   ${KEEPS_LABEL} ${said} — at ${d.by}.`;
}
export function waypointLines(leg) {
  const ws = leg.waypoints || [];
  if (!ws.length) return null;
  const byStrand = new Map((leg.claims || []).map((g) => [g.strand, String(g.proposition).trim()]));
  const line = (w, n) => `${n}. ${String(w.point).trim()} *Serves:* ${w.serves.map((x) => byStrand.get(x) ?? x).join("; ")}`;
  const joinOf = (w) => (typeof w.join === "string" && w.join.trim() !== "" ? [`   ${OPENS_FROM_LABEL} ${w.join.trim()}`] : []);
  const mannerOf = (p) => (typeof p.manner === "string" && p.manner.trim() !== "" ? ` ${MANNER_LABEL} ${p.manner.trim()}` : "");
  const sub = (p, n) => (Object.hasOwn(p, "performs") ? `${n}. *${String(p.performs).trim()}*` : line(p, n)) + mannerOf(p);
  return ws.map((w, i) => [line(w, i + 1), ...joinOf(w),
    ...(w.paragraph_waypoints || []).map((p, j) => `   ${sub(p, j + 1)}`),
    ...(w.obligations || []).map(promiseLine), ...(w.discharges || []).map(keepsLine)].join("\n")).join("\n");
}

export function renderPacket({ template, brief, leg, priorSections, section, sections, language: languageOverride = null }) {
  const missing = [];
  const need = (label, v) => { if (v === null || v === undefined || v === "") missing.push(label); return v; };

  // THE STRAND ID IS THE BRIEF'S, NOT THE PACKET'S (kogaki#1094). The Brief
  // serializes one form, `claim (strand L<n>): <proposition>` (kogaki#1095),
  // and the id in it addresses material the realizer cannot open. The Packet
  // renders the proposition alone, so every claim line it carries is a claim
  // and nothing else — which is also what keeps a Strand id's digits out of a
  // review comparison line.
  const claimTexts = (leg.claims || []).map((g) => g.proposition);
  // A FLAT LIST, ONE LINE PER CLAIM (kogaki#1215; the relations layer this
  // rendered as a tree is retired). No indentation carries meaning here: the
  // Leg's claims are unambiguous peers, and the writer's realization owes
  // every one of them a recoverable line rather than a fused clause. The list
  // convention is the Packet's ONE convention — a `- ` line under the block's
  // own heading, exactly as `already knows` and `introduce here` render — so no
  // `claim:` prefix sits under a bulleted field label for the reader to parse.
  const claims = claimTexts.map((text) => `- ${text}`).join("\n");
  const intro = (leg.introduces || []);
  // WHAT THIS LEG RE-ACTIVATES (kogaki#1237, owner decision 2026-09-30):
  // parsed the same way `validateLegs` parsed it before this Brief was
  // minted — a bad entry never reaches here, because `readBrief`
  // refused the Brief on it. Each valid entry resolves to the NAMED LEG's
  // own material: a `term` entry to that Leg's own `introduces` line,
  // crossing WITH ITS MEANING (kogaki#1282); a `claim` entry crosses as the
  // plain restatement composed at Brief time (`e.as`), never its own
  // proposition. Nothing here is composed — the composer already selected
  // the reference and, for a claim, the restatement; this only resolves it.
  const reactivateEntries = (leg["re-activate"] || [])
    .map((raw) => parseReactivateEntry(raw))
    .filter((e) => !e.error);
  const active = reactivateEntries.map((e) => {
    const target = (brief.legs || []).find((l) => l.leg_id === e.leg_id);
    // A RE-ACTIVATED JOURNEY RENDERS ITS SCENE (kogaki#1261): the served text
    // `resolveLegJourneys` fetched, under the Strand and the use the named
    // Leg drew on it for. A caller that skipped resolution gets the `need()`
    // refusal below rather than an address the writer cannot open.
    if (e.kind === "journey") {
      const j = (leg.reactivatedJourneys || []).find((x) => x.leg_id === e.leg_id && x.strand === e.value);
      if (!j || typeof j.resolvedText !== "string" || j.resolvedText.trim() === "") {
        need(`${leg.leg_id}'s re-activated Journey ${e.value} text`, null);
        return "";
      }
      const cite = (brief.strands.find((st) => st.id === e.value)?.cites || [])
        .find((c) => c.kind === "journey cite");
      return `- **${e.value}'s Journey** (re-activated from ${e.leg_id})${j.use ? ` — used there for: ${j.use}` : ""}. `
        + `Its scene, served at \`${cite ? cite.cite : "(no journey cite recorded in the Brief)"}\`:\n\n${j.resolvedText.trim()}`;
    }
    if (e.kind === "term") {
      const found = (target?.introduces || [])
        .map((raw) => parseIntroducesEntry(raw))
        .find((p) => !p.error && p.term === e.value);
      const meaning = found ? introducedMeaning(found) : null;
      const text = found ? `${found.term}${meaning ? ` — meaning: ${meaning}` : ""}` : e.value;
      return `- ${text} (re-activated from ${e.leg_id})`;
    }
    return `- ${e.as} (re-activated from ${e.leg_id}, strand ${e.value})`;
  });
  const authorityOn = externalAuthorityOf(brief);
  // THE AUDIENCE'S REGISTER (kogaki#1261, kogaki#1370): read from the
  // Audience the Brief was composed for, refused by name where it cannot be read.
  const personaPath = packetPersonaPath(brief);
  const register = typeof personaPath === "string" ? readerProse(personaPath) : personaPath;
  if (register.error) missing.push(`the Audience's register (${register.error})`);
  // THE READER'S OWN WORLD (kogaki#1285): read from the same Audience, on
  // the same path — but NEVER pushed onto `missing`, because an absent or
  // empty `prior_knowledge` is the stated case `READER_OWN_WORLD_ABSENT`
  // renders, not a hole in the Packet's input.
  const priorKnowledge = typeof personaPath === "string" ? personaPriorKnowledge(personaPath) : null;
  // THE ARTICLE'S LANGUAGE (kogaki#1417): the Audience's `language`, read from the
  // same Audience and refused by name where it is missing. A second-language
  // realization (`--lang`, kogaki#1158) names its own language instead, so the
  // line and that track's language block never disagree.
  const language = languageOverride ? { language: languageOverride }
    : typeof personaPath === "string" ? audienceLanguage(personaPath) : personaPath;
  if (language.error) missing.push(`the Audience's language (${language.error})`);
  const obligationRows = obligationRowsOf(brief.record, leg.leg_id);

  const fields = {
    // THE ROUTE (kogaki#1311, kogaki#1326): one numbered line per waypoint, in
    // the Leg's order, each the point and then the claim or claims it serves, quoted as this Leg's
    // claims block quotes them — the Strand id is the Brief's address and the
    // writer cannot open it, so the claim's own words stand in for it. A Leg
    // with no waypoint never reaches here (`loadBrief` refuses it), and
    // `need` refuses the render rather than leave the block empty.
    waypoints: need(`${leg.leg_id}'s waypoints`, waypointLines(leg)),
    // THE READER TARGET LINE (kogaki#1231; moved into the Section block at
    // kogaki#1247): the marked Leg's, a closing Leg's, or nothing — off the
    // Brief's own `reaches_target` mark, read by `readBrief` above.
    // Not passed through `need`: an earlier Leg renders the empty string here
    // by design, and that is a filled slot.
    reader_target_line: readerTargetLine(brief.legs, leg.leg_id),
    // `budget` — a LIMIT the writer sees, never a target: rendered in the
    // write instruction, and its absence states so rather than rendering a
    // blank the writer could read as zero.
    budget: leg.budget !== undefined && leg.budget !== null
      ? `${leg.budget} words. This is a ceiling, not a target — write what this Leg needs, up to it.`
      : "(none declared — no word bound applies to this Leg.)",
    claims: claims || "(none recorded)",
    reader_own_world: priorKnowledge || READER_OWN_WORLD_ABSENT,
    register: register.error ? "" : register.register,
    language: language.error ? "" : `Write this Leg in ${language.language}.`,
    // WHAT CROSSES INTO THIS LEG (kogaki#1282, owner ruling 2026-10-06):
    // LEG LINKING IS DEFAULT-DENY — the whole of what this Leg may speak of
    // as already available is this Leg's own introduced items (each with
    // its meaning) and what it explicitly re-activates (a term with its
    // meaning, a claim as its `as` restatement, a Journey as its served
    // text). Nothing the reader merely holds otherwise renders here. A
    // STATED ABSENCE, never an empty slot (acceptance item 2): a Leg that
    // introduces and re-activates nothing still gets the block, saying so,
    // on the same one-word-one-unit ground `obligation_rows` states.
    crosses_here: (intro.length || active.length)
      ? [...intro.map((raw) => introduceLine(raw, authorityOn)), ...active].join("\n")
      : "(nothing — this Leg introduces and re-activates nothing; speak of nothing as already available.)",
    // THE OBLIGATIONS (kogaki#1151, kogaki#1529): the rows this Leg is a party
    // to, read from the Brief record's `obligations` list, with the derived
    // Thesis row on the Leg marked `reaches_target` (`obligationRowsOf`,
    // kogaki#1328). Rendered as MATERIAL, never as a sentence to write
    // (kogaki#1496). EMPTY RENDERS EMPTY, NEVER ABSENT (acceptance item 3), on
    // the same one-word-one-unit ground `reader_already_knows` states.
    // THE ROW THIS LEG CONCEDES renders its three fields (kogaki#1261): what
    // stays open, why this article does not close it, and what the reader
    // keeps — the concession the prose makes, not a bare sentence.
    obligation_rows: obligationRows.length
      ? obligationRows.map((o) => {
        if (o.conceded_by === leg.leg_id) {
          return `- ${obligationSaid(o)} — conceded in this Leg. Left open: ${o.open ?? "(not recorded)"}. `
            + `Why this article does not close it: ${o.why_not_here ?? "(not recorded)"}. `
            + `What the reader keeps: ${o.reader_keeps ?? "(not recorded)"}.`;
        }
        if (o.kind !== "term") return `- ${o.text}`;
        if (Array.isArray(o.term)) {
          return o.raised_by === leg.leg_id
            ? `- ${obligationSaid(o)} — terms this Leg names and leaves for later Legs to explain, in that order.`
            : `- ${obligationSaid(o)} — terms an earlier Leg named, explained in that order; this Leg is one that gives their meaning.`;
        }
        return o.raised_by === leg.leg_id
          ? `- ${o.term} — a term this Leg names and leaves for a later Leg to explain.`
          : `- ${o.term} — a term an earlier Leg named; this Leg is one that gives its meaning.`;
      }).join("\n")
      : "(nothing — this Leg carries no obligation)",
    // the Journey a Leg draws on (kogaki#1111), rendered as its served TEXT with
    // the address beside it as citation (kogaki#1250). Resolution happens in
    // `renderAndStorePacket` before this runs, so every entry carries its
    // `resolvedText`; a caller that skips resolution gets the same `need()`
    // refusal as any absent block. A Journey-less Leg renders the heading and
    // the absence line only (kogaki#1224; owner decision 2026-09-29).
    journeys: need(`${leg.leg_id}'s Journey text`, (leg.journeys || []).length
      ? ((leg.journeys.some((j) => typeof j.resolvedText !== "string" || j.resolvedText.trim() === ""))
        ? null
        : "Material for a concrete example serving this Leg's waypoints — use as much or as "
          + "little of it as the waypoints need, in any form, from one clause to several "
          + "sentences. It is material, never a claim, and earns no paragraph of its own by "
          + "being present.\n\n"
          + "Material, not assertion. Each entry below names a Journey this Leg draws on, "
          + "and its served prose, quoted in full. **Edit it for "
          + "this Leg's waypoints**: cut it, compress it, use as much or as little as they need.\n\n"
          + "Nothing here is a claim. The claims above are the whole of what this Leg "
          + "asserts, and the round trip asks for those back and never for a fragment of a "
          + "Journey. A Journey you use well may leave almost none of its original wording "
          + "on the page.\n\n"
          + leg.journeys.map((j) => {
            const cite = (brief.strands.find((st) => st.id === j.strand)?.cites || [])
              .find((c) => c.kind === "journey cite");
            return `- **${j.strand}'s Journey**. `
              + `Served at \`${cite ? cite.cite : "(no journey cite recorded in the Brief)"}\`:\n\n`
              + `${j.resolvedText.trim()}`;
          }).join("\n\n")
      )
      : "(none — this Leg draws on no Journey material, and nothing here asks for any.)"),
    section_placement: sectionPlacement(section),
    // SCOPED TO THE CURRENT SECTION ONLY (kogaki#1282, owner ruling
    // 2026-10-06): `sectionsOf` always derives at least one Section, so this
    // always resolves through the Section path rather than a whole-article
    // fallback — the old "this is the article's first Leg" / "this is NOT
    // the article's opening" strings are retired with it, subsumed by
    // `priorProseInSection`'s own opens-it / continues-it absence messages.
    prior_sections: priorProseInSection(priorSections, sections || [], section?.index ?? 1, leg.leg_id)
      ?? "(nothing yet — this Leg opens the Section, so its prose is the first in it.)",
  };
  if (missing.length) {
    return { error: `the Packet for ${leg.leg_id} cannot be rendered: ${missing[0]} is absent. `
      + `A Packet is the model's entire input, so a missing block is a hole the model fills by invention — `
      + `it refuses by NAME rather than rendering an empty slot (the Leg Packet).` };
  }
  let out = template;
  for (const [k, v] of Object.entries(fields)) out = out.split(`{{${k}}}`).join(v);
  // The HTML comment is authoring guidance for the template's maintainer and
  // is NOT part of the model's input — stripped here so the rendered Packet is
  // exactly what the ruling describes and nothing more.
  out = out.replace(/^<!--[\s\S]*?-->\n*/, "");
  const left = out.match(/\{\{(\w+)\}\}/);
  if (left) return { error: `the template slot {{${left[1]}}} was not filled — the renderer and the template disagree about the slot set, which is the round trip failing silently (the Leg Packet)` };
  return { packet: out };
}

// THE PACKET RENDER, FACTORED SO THE HARNESS CAN DRIVE IT (kogaki#811,
// DESIGN.md, "The Packet architecture"). `cmdPacket` prints it on demand; `resolve` and `section`
// call it to hand the NEXT Leg's input forward without the session asking.
// One implementation, so the on-demand and the driven renders cannot diverge
// in what they write or what they record.
export function renderAndStorePacket(brief, id, args, ws) {
  const lang = langOf(args);
  const leg = brief.legs.find((s) => s.leg_id === id);
  if (!leg) return { error: `no leg "${id}" in this Brief's Reader Path (${brief.legs.map((s) => s.leg_id).join(", ")}) — the path is the Brief's, and /draft never re-opens it` };
  const tplPath = join(dirname(fileURLToPath(import.meta.url)), "..", "packet-template.md");
  let template;
  try { template = readFileSync(tplPath, "utf8"); }
  catch (e) { return { error: `the Packet template at ${tplPath} cannot be read (${e.message}) — it is a runtime-read carrier and the command has no built-in fallback, deliberately: a fallback template would be a second copy nobody maintains` }; }
  // THE FIGURE BLOCK IS NOT PART OF A PACKET (the figure record, kogaki#878). Split before
  // the render: `renderPacket` refuses on any unfilled slot, so the block's own
  // slots would make every Packet refuse if it reached that check.
  const split = splitPacketTemplate(template);
  if (split.error) return { error: split.error };
  template = split.packet;

  // PRIOR SECTIONS IN THE BRIEF'S RECORDED ORDER, never a directory read —
  // the order is the Reader Path's and a readdir would make the Packet's bytes
  // depend on the filesystem.
  const prior = [];
  for (const s of brief.legs) {
    if (s.leg_id === id) break;
    const f = join(sectionsDir(ws, lang), `${s.leg_id}.md`);
    if (existsSync(f)) prior.push({ leg_id: s.leg_id, text: readFileSync(f, "utf8").trim() });
  }
  // The SAME derivation the renderer and the trace use (kogaki#823's
  // `sectionsOf`/`sectionOfLeg`), never a second one: what the Draft renders
  // and what the Packet says about where this Leg sits cannot disagree.
  const sections = sectionsOf(brief.legs);
  const section = sectionOfLeg(brief.legs).get(id);

  // JOURNEY TEXT RESOLUTION (kogaki#1250) — BEFORE the render, and before any
  // writer is ever invoked: a Journey that does not resolve refuses the whole
  // Packet build, naming the Leg and the address, and `renderPacket` never
  // runs for it.
  const journeysResolved = resolveLegJourneys(leg, brief);
  if (journeysResolved.error) return { error: journeysResolved.error };

  const r = renderPacket({ template, brief, leg: journeysResolved.leg, priorSections: prior, section, sections,
    language: lang === "en" ? null : (REALIZATION_LANGUAGES[lang] || lang) });
  if (r.error) return { error: r.error };

  // THE LANGUAGE BLOCK (kogaki#1158): rendered into every Packet when
  // realizing at a non-English `--lang`, and nothing else added — the
  // owner's 2026-09-19 ruling is "the term list and the register, and
  // nothing else until a Round Trip failure names what is missing." The term
  // list is terms/prh.yml, the ONE repository-wide carrier (the Terminology
  // List Decision), parsed by the SAME reader lint-ja.mjs's Lint uses.
  let packetText = r.packet;
  if (lang !== "en") {
    const termsPath = typeof args["terms-path"] === "string" && args["terms-path"] !== "" ? args["terms-path"] : DEFAULT_TERMS_PATH;
    let termsText;
    try { termsText = readFileSync(termsPath, "utf8"); }
    catch (e) { return { error: `leg ${id}'s Japanese Packet needs the term list at ${termsPath} and it cannot be read (${e.message})` }; }
    const parsedTerms = parseTermsYaml(termsText);
    if (parsedTerms.error) return { error: `the term list at ${termsPath} is not readable as the prh.yml shape: ${parsedTerms.error}` };
    const termsSha = sha256Terms(termsText);
    let block = renderLanguageBlock(parsedTerms.rules, termsSha, lang);
    // FLUENCY NOTES (acceptance item 5): read, if present, into every
    // Japanese realization as a READ-ONLY REFERENCE NOTE. Nothing evaluates
    // it — it is appended to the model's input and never graded by any
    // automated pass, here or in lint-ja.mjs.
    const fluencyPath = join(dirname(brief.path), "fluency-notes.md");
    if (existsSync(fluencyPath)) {
      const notes = readFileSync(fluencyPath, "utf8").trim();
      if (notes) {
        block += `\n\n## Fluency notes (read-only reference — theses/${brief.slug}/fluency-notes.md; never graded by any automated pass)\n\n${notes}`;
      }
    }
    packetText = packetText.trimEnd() + "\n\n" + block.trimEnd() + "\n";
  }

  // RETENTION: stored EXACTLY AS SERVED, overwritten on re-render, with the
  // path and sha announced beside the Section it will produce.
  //
  // THE PATH IS `runs/draft/<slug>/packets/` (kogaki#750, landed). #749 ruled
  // this destination and could not write it — there was no runs/ tree, and
  // minting one as a side effect of the Packet command would have built #750's
  // design at a seat that had no license for it. The expression is UNCHANGED:
  // the Packet has always joined the run record, the snapshots and the sections
  // in the workspace, and it is the WORKSPACE that moved. The debt is
  // discharged by the lane's default resolving there, not by a second path
  // expression here — a relocation that also re-routes its consumers changes
  // two things and can only be half-verified.
  const dir = packetsDir(ws, lang);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${id}.md`);
  writeFileSync(out, packetText);
  const sha = sha256(packetText);

  // RECORDED IN THE RUN RECORD, not only printed (PR #780 round 1): #749 rules
  // "path+sha recorded in the run record beside the Section it produced".
  // MERGED rather than overwritten: run.json holds the run's identity from
  // `resolve`, so the entry joins it under its leg id. A missing or unreadable
  // run.json warns rather than failing the render, as the snapshot path does.
  const runFile = join(ws, "run.json");
  try {
    let rec = {};
    if (existsSync(runFile)) rec = JSON.parse(readFileSync(runFile, "utf8"));
    const key = packetsRecordKey(lang);
    rec[key] = { ...(rec[key] || {}), [id]: { path: out, sha256: sha } };
    writeFileSync(runFile, JSON.stringify(rec, null, 2) + "\n");
  } catch (e) {
    process.stderr.write(`draft: the packet's path and sha were not recorded in ${runFile} (${e.message}) — the Packet itself is written and printed; the record is the trace, and the trace never gates the write it traces\n`);
  }

  return { packet: packetText, out, sha };
}
