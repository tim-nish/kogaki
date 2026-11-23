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
import { readerProse, audienceLanguage } from "../compose.mjs";
import { parseTermsYaml, sha256 as sha256Terms, DEFAULT_TERMS_PATH } from "../lint-ja.mjs";
import { sha256, readerTargetCase } from "./brief-reader.mjs";
import { renderPromptFile, promptFilePath } from "../prompt-file.mjs";
import { resolveLegJourneys, packetPersonaPath, personaPriorKnowledge } from "./journeys.mjs";
import { sectionPlacement, priorProseInSection } from "./packet.mjs";
import { legSentences, legRows } from "../sme/arguments.mjs";
import { SENSES_FILE, senseNames, loadSenses, loadOwnSenses, loadHypophora } from "../sme/edges.mjs";
import {
  REALIZATION_LANGUAGES,
  langOf,
  sectionsDir,
  packetsDir,
  packetsRecordKey,
  sectionsOf,
  sectionOfLeg,
} from "./workspace.mjs";

// THE PLAN BLOCK (kogaki#1859, kogaki#1865, kogaki#1901): `rows`, the Leg's structure as `legRows` reads it at the
// Leg's `relation` in the Brief's `structure`, then the symbols of its CentralClaim and of its Arguments, and one part
// per Segment where the Leg carries `segments` -- each `{ bind, edges }`, `bind` naming entry k of `legSentences`. A
// part carries `bound`, the symbol of that entry, `stands`, one text of the Senses file for each Edge, toward the
// parts that Edge names taken together and ending in its rationale, and `pointed`, the later parts whose Edges point
// to it; no Sense name is handed on. `{ error }` names a Sense the Senses file does not hold. Null where the Brief carries no `structure` or the Leg
// names no relation.
export function planValues(structure, leg) {
  if (!structure || typeof leg.relation !== "string") return null;
  const whole = { roles: structure.roles || [], relations: structure.relations || [] };
  if (!whole.relations.some((r) => r.id === leg.relation)) return null;
  const sentences = legSentences(whole, leg.relation);
  const label = (s) => `{${s.id}}`;
  const segs = leg.segments || [];
  const names = senseNames([...loadSenses(), ...loadOwnSenses()]);
  const hypophora = loadHypophora();
  const unknown = segs
    .flatMap((g) => g.edges || [])
    .find((e) => e.sense !== null && e.sense !== undefined && !names.has(e.sense));
  if (unknown)
    return { error: `the text of the Sense ${JSON.stringify(unknown.sense)}, which ${SENSES_FILE} does not hold` };
  const standsOf = (e) => {
    const to = [...e.to].sort((a, b) => a - b);
    const parts = { to, parts: listOf(to.map((number) => ({ number }))), ...(to.length > 1 ? { together: true } : {}) };
    const n = e.sense === null || e.sense === undefined ? null : names.get(e.sense);
    return [
      ...(n ? [{ ...parts, meaning: n.meaning, ...(n.plays ? { plays: n.plays } : {}), rationale: n.rationale }] : []),
      ...(e.hypophora
        ? [{ ...parts, meaning: hypophora[e.hypophora].meaning, rationale: hypophora[e.hypophora].rationale }]
        : []),
    ];
  };
  const stands = segs.map((g) => (g.edges || []).flatMap(standsOf));
  const segments = segs.map((g, i) => {
    const b = Number.isInteger(g.bind) ? sentences[g.bind - 1] : null;
    const pointed = stands.flatMap((st, k) =>
      k > i && st.some((x) => x.to.includes(i + 1)) ? [{ number: k + 1 }] : [],
    );
    return {
      number: i + 1,
      ...(b ? { bound: label(b) } : {}),
      stands: stands[i],
      ...(pointed.length ? { pointed: listOf(pointed) } : {}),
    };
  });
  return {
    rows: legRows(whole, leg.relation),
    arguments: listOf(sentences.slice(0, -1).map((s) => ({ symbol: label(s) }))),
    central_claim: label(sentences[sentences.length - 1]),
    ...(segments.length ? { segments } : {}),
  };
}

// A list whose items but the last carry `more`, so the file writes what stands between two items.
export const listOf = (items) => items.map((item, i) => (i < items.length - 1 ? { ...item, more: true } : item));

// The performs criteria bound (kogaki#1555).
const DRAFT_TABLE = join(dirname(fileURLToPath(import.meta.url)), "..", "draft-workflow.json");
const CRITERION_LINE = /^- ([A-Z][A-Z ]*[A-Z]): (.+)$/;
export function templateCriteriaFailures(template, criteria = JSON.parse(readFileSync(DRAFT_TABLE, "utf8")).criteria) {
  const wordsMax = Number(criteria?.words_max);
  if (!Number.isInteger(wordsMax) || wordsMax <= 0)
    return ["src/draft-workflow.json's `criteria` declares no positive `words_max`"];
  const fails = [];
  String(template)
    .split("\n")
    .forEach((line, i) => {
      const m = CRITERION_LINE.exec(line);
      if (!m) return;
      const at = `line ${i + 1} \`${line}\``;
      const n = line.slice(2).trim().split(/\s+/).length;
      if (n >= wordsMax) fails.push(`${at} runs ${n} words, not under the bound of ${wordsMax}`);
      const joint = [": ", "; ", " -- "].find((s) => m[2].includes(s));
      if (joint) fails.push(`${at} joins two requirements with \`${joint}\``);
    });
  return fails;
}

export const WRITER_PROMPT = "draft/write-leg";
// The shared passage holding the Packet's blocks, which the Writer's and the Readback's prompt files name (kogaki#1904).
export const PACKET_PASSAGE = "draft/_packet";

export function renderPacket({
  brief,
  leg,
  priorSections,
  section,
  sections,
  language: languageOverride = null,
  languageBlock = null,
}) {
  const unbounded = [WRITER_PROMPT, PACKET_PASSAGE].flatMap((name) =>
    templateCriteriaFailures(readFileSync(promptFilePath(name), "utf8")).map((f) => `prompts/${name}.prompt ${f}`),
  );
  if (unbounded.length) {
    return {
      error:
        `the Packet template's criteria break the bound src/draft-workflow.json declares: ${unbounded.join("; ")} -- ` +
        `one requirement per line, so a joined or grown line never reaches a Writer (kogaki#1555)`,
    };
  }
  const missing = [];
  const need = (label, v) => {
    if (v === null || v === undefined || v === "") missing.push(label);
    return v;
  };

  // THE STRAND ID IS THE BRIEF'S, NOT THE PACKET'S (kogaki#1094): a claim line is the proposition alone.
  // A FLAT LIST, ONE LINE PER CLAIM (kogaki#1215).
  const claimTexts = (leg.claims || []).map((g) => ({ text: g.proposition }));
  // THE AUDIENCE'S REGISTER (kogaki#1261, kogaki#1370), refused by name where it cannot be read.
  const personaPath = packetPersonaPath(brief);
  const register = typeof personaPath === "string" ? readerProse(personaPath) : personaPath;
  if (register.error) missing.push(`the Audience's register (${register.error})`);
  // THE READER'S OWN WORLD (kogaki#1285): an absent `prior_knowledge` renders no line (kogaki#1911).
  const priorKnowledge = typeof personaPath === "string" ? personaPriorKnowledge(personaPath) : null;
  // THE ARTICLE'S LANGUAGE (kogaki#1417); a second-language realization names its own (kogaki#1158).
  const language = languageOverride
    ? { language: languageOverride }
    : typeof personaPath === "string"
      ? audienceLanguage(personaPath)
      : personaPath;
  if (language.error) missing.push(`the Audience's language (${language.error})`);

  // THE JOURNEY A LEG DRAWS ON (kogaki#1111) as its served TEXT, the address beside it (kogaki#1250); a caller
  // that skipped resolution gets the same `need()` refusal as any absent block.
  const plan = planValues(brief.record?.structure ?? null, leg);
  if (plan?.error) missing.push(plan.error);
  const journeys = leg.journeys || [];
  const unresolved = journeys.some((j) => typeof j.resolvedText !== "string" || j.resolvedText.trim() === "");
  if (unresolved) need(`${leg.leg_id}'s Journey text`, null);
  const values = {
    ...(plan && !plan.error ? { plan } : {}),
    claims: claimTexts.length ? { lines: claimTexts } : {},
    journeys:
      journeys.length && !unresolved
        ? {
            entries: listOf(
              journeys.map((j) => {
                const cite = (brief.strands.find((st) => st.id === j.strand)?.cites || []).find(
                  (c) => c.kind === "journey cite",
                );
                return { strand: j.strand, ...(cite ? { cite: cite.cite } : {}), text: j.resolvedText.trim() };
              }),
            ),
          }
        : {},
    section_placement: sectionPlacement(section),
    // THE READER TARGET LINE (kogaki#1231, kogaki#1247): the marked Leg's, a closing Leg's, or nothing.
    reader_target_line: readerTargetCase(brief.legs, leg.leg_id),
    // SCOPED TO THE CURRENT SECTION ONLY (kogaki#1282, owner ruling 2026-10-06).
    prior_sections: priorProseInSection(priorSections, sections || [], section?.index ?? 1, leg.leg_id),
    // `budget` -- a LIMIT the writer sees, never a target.
    ...(leg.budget !== undefined && leg.budget !== null ? { budget: String(leg.budget) } : {}),
    language: language.error ? "" : language.language,
    ...(priorKnowledge ? { reader_own_world: priorKnowledge } : {}),
    register: register.error ? "" : register.register,
    ...(languageBlock ? { language_block: languageBlock } : {}),
  };
  if (missing.length) {
    return {
      error:
        `the Packet for ${leg.leg_id} cannot be rendered: ${missing[0]} is absent. ` +
        `A Packet is the model's entire input, so a missing block is a hole the model fills by invention — ` +
        `it refuses by NAME rather than rendering an empty slot (the Leg Packet).`,
    };
  }
  return { packet: renderPromptFile(WRITER_PROMPT, values), values };
}

// THE PACKET RENDER, FACTORED SO THE HARNESS CAN DRIVE IT (kogaki#811,
// DESIGN.md, "The Packet architecture"). `cmdPacket` prints it on demand; `resolve` and `section`
// call it to hand the NEXT Leg's input forward without the session asking.
// One implementation, so the on-demand and the driven renders cannot diverge
// in what they write or what they record.
export function renderAndStorePacket(brief, id, args, ws) {
  const lang = langOf(args);
  const leg = brief.legs.find((s) => s.leg_id === id);
  if (!leg)
    return {
      error: `no leg "${id}" in this Brief's Reader Path (${brief.legs.map((s) => s.leg_id).join(", ")}) — the path is the Brief's, and /draft never re-opens it`,
    };
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

  // THE LANGUAGE BLOCK (kogaki#1158): rendered into every Packet when realizing at a non-English `--lang`, and
  // nothing else added (owner ruling 2026-09-19). The term list is terms/prh.yml, the ONE repository-wide
  // carrier, parsed by the SAME reader lint-ja.mjs's Lint uses; fluency notes ride as a read-only reference.
  let languageBlock = null;
  if (lang !== "en") {
    const termsPath =
      typeof args["terms-path"] === "string" && args["terms-path"] !== "" ? args["terms-path"] : DEFAULT_TERMS_PATH;
    let termsText;
    try {
      termsText = readFileSync(termsPath, "utf8");
    } catch (e) {
      return {
        error: `leg ${id}'s Japanese Packet needs the term list at ${termsPath} and it cannot be read (${e.message})`,
      };
    }
    const parsedTerms = parseTermsYaml(termsText);
    if (parsedTerms.error)
      return { error: `the term list at ${termsPath} is not readable as the prh.yml shape: ${parsedTerms.error}` };
    const fluencyPath = join(dirname(brief.path), "fluency-notes.md");
    const notes = existsSync(fluencyPath) ? readFileSync(fluencyPath, "utf8").trim() : "";
    languageBlock = {
      lang,
      terms_sha: sha256Terms(termsText),
      rows: parsedTerms.rules.map((r) => ({
        expected: r.expected,
        ...(r.patterns.length ? { forbidden: listOf(r.patterns.map((text) => ({ text }))) } : {}),
      })),
      ...(notes ? { fluency: { slug: brief.slug, notes } } : {}),
    };
  }

  const r = renderPacket({
    brief,
    leg: journeysResolved.leg,
    priorSections: prior,
    section,
    sections,
    language: lang === "en" ? null : REALIZATION_LANGUAGES[lang] || lang,
    languageBlock,
  });
  if (r.error) return { error: r.error };
  const packetText = r.packet;

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
    // The plan the Packet was rendered from rides beside its own hash (kogaki#1645).
    rec[key] = {
      ...(rec[key] || {}),
      [id]: {
        path: out,
        sha256: sha,
        plan_sha256: brief.paragraphPlan?.sha256 ?? null,
      },
    };
    writeFileSync(runFile, JSON.stringify(rec, null, 2) + "\n");
  } catch (e) {
    process.stderr.write(
      `draft: the packet's path and sha were not recorded in ${runFile} (${e.message}) — the Packet itself is written and printed; the record is the trace, and the trace never gates the write it traces\n`,
    );
  }

  return { packet: packetText, out, sha };
}
