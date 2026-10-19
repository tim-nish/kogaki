// draft/journeys — Journey text resolution, the gateway call, the Persona path and the introduce line.
// Cut from src/draft.mjs at its named section (kogaki#1461); the design and
// its rulings are stated at the entry and in the Issues each block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES: none.
//
import { readFileSync, rmSync, openSync, closeSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { parseReactivateEntry, parseIntroducesEntry, audienceRecord } from "../compose.mjs";
import { settingValue } from "../workflow/judge.mjs";

// ---------------------------------------------------------------------------
// JOURNEY TEXT RESOLUTION (kogaki#1250, owner ruling 2026-10-04). Since
// kogaki#1111 the Packet rendered a Journey as an ADDRESS ONLY — "Its prose
// is the served record at `<cite>`" — and handed the writer nothing to read.
// Since Fresh Call (kogaki#1237) the writer is a separate `claude -p` process
// with no permission grant of its own, so that address was never reachable
// FROM INSIDE the realization: the writer had no Journey, and said so in the
// article, which is the defect this issue closes. The Packet now carries the
// Journey's served TEXT, resolved through the kit's gateway query BEFORE any
// writer is called — and a Journey that does not resolve refuses the whole
// Packet build, naming the Leg and the address, rather than reaching the
// writer as a hole for it to fill by invention.
//
// THIS IS A STATED EXCEPTION to "the gateway is an enhancer, never a
// dependency" (policy/CAPABILITIES.md): every OTHER seam in this repository
// degrades and continues on an unreachable gateway. A Journey the writer
// cannot read is not a degraded instruction, it is a Leg the Harness cannot
// build — so resolution here fails the build rather than falling back.

// The identity a journey cite addresses — the SAME two forms a Draft's own
// cites are judged against (kogaki#1116/#600 — src/cite-check.mjs): the
// address form `<package>::journey/<local-name>@<content_hash>` and the
// identity form `gloss/ELEMENTS.jsonl slug=<slug> kind=journey @<sha>`. A
// local copy rather than an import: cite-check.mjs is not among this issue's
// licensed files.
const JOURNEY_IDENTITY_RE = /^gloss\/ELEMENTS\.jsonl slug=([A-Za-z0-9._-]+) kind=(lesson|journey) @([0-9a-f]{7,40})$/;
const JOURNEY_ADDRESS_RE = /^([A-Za-z0-9._-]+)::(lesson|journey)\/([A-Za-z0-9._-]+)@([0-9a-f]{7,64})$/;

function parseJourneyCiteRef(cite) {
  const m = (cite ?? "").match(JOURNEY_IDENTITY_RE);
  if (m) return { slug: m[1], kind: m[2] };
  const a = (cite ?? "").match(JOURNEY_ADDRESS_RE);
  return a ? { slug: a[3], kind: a[2] } : null;
}

export function journeyIdentityKey(slug, kind) { return `${kind} ${slug}`; }

// THE PURE HALF: cite × served survey → the Journey's text, or why it does
// not resolve. `served` is Map<journeyIdentityKey(slug, kind), record>,
// exactly as `fetchJourneySurvey` below builds it — kept separate from the
// transport so a fixture can drive every resolution outcome without spawning
// anything (`checks/check-brief-compose.sh` is a light member: pure calls and
// text reads, no runtime spawn).
export function journeyTextFromSurvey(cite, served) {
  const ref = parseJourneyCiteRef(cite);
  if (!ref) {
    return { error: `the cite \`${cite ?? "(none recorded)"}\` is in neither the address form `
      + `<package>::journey/<local-name>@<content_hash> nor the identity form `
      + `gloss/ELEMENTS.jsonl slug=<slug> kind=journey @<sha>` };
  }
  const rec = served.get(journeyIdentityKey(ref.slug, ref.kind));
  if (!rec) return { error: `resolves nowhere — the served survey holds no record slug=${ref.slug} kind=${ref.kind}` };
  const body = typeof rec.body === "string" && rec.body.trim() !== ""
    ? rec.body
    : (typeof rec.text === "string" ? rec.text : null);
  if (body === null || body.trim() === "") {
    return { error: `no Gloss shard the record's renderings name carries prose for slug=${ref.slug} kind=${ref.kind}` };
  }
  return { text: body.trim() };
}

// ONE REFUSAL, naming the Leg and the address (acceptance). Shared by the
// live path and the check fixture, so the wording a reader sees for a
// dangling Journey is asserted in one place.
export function journeyResolutionRefusal(legId, journey, cite, result) {
  if (!result || !result.error) return null;
  return `leg ${legId}'s Journey ${journey.strand} (${cite || "(no journey cite recorded in the Brief)"}) does not resolve: ${result.error} — `
    + `a Journey the writer cannot read is a refusal to the Harness, never a sentence in the Draft (kogaki#1250), `
    + `so the Packet is not built and no writer is called`;
}

// THE SHARD READ, pure. `element_survey` serves MANIFESTS only — slug, kind,
// tags, `renderings`, `content_hash` — never prose: a Journey's text lives in
// the Gloss shards its record's `renderings` name, each served by
// `gloss_index` as `{cite, text}` lines, one record after another. A record's
// lines are its `## <slug>` heading, its prose, and a closing `Source:` line;
// the prose is what lies between. Kept pure so a fixture drives it with
// shard-shaped lines and spawns nothing.
export function journeyProseFromShardLines(lines, slug, kind) {
  const own = (lines || []).filter((l) => {
    const ref = parseJourneyCiteRef(typeof l?.cite === "string" ? l.cite : "");
    return ref && ref.slug === slug && ref.kind === kind;
  }).map((l) => (typeof l.text === "string" ? l.text : ""));
  if (own.length && own[0].trim() === `## ${slug}`) own.shift();
  while (own.length && own[own.length - 1].trim() === "") own.pop();
  if (own.length && /^Source: /.test(own[own.length - 1])) own.pop();
  const prose = own.join("\n").trim();
  return prose === "" ? null : prose;
}

// THE TRANSPORT — the only function in this section that spawns, following
// the same capture-through-a-file-descriptor discipline src/terrain.mjs's own
// `gatewayQuery` uses (kogaki#23/kogaki#597): a pipe would work under the
// kit's drain guarantee, but a file write does not depend on it.
function gatewayCall(tool, args) {
  const bin = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "policy", "kit", "bin", "gateway-query.mjs");
  const outPath = join(tmpdir(), `draft-${tool}-${process.pid}-${Date.now()}.json`);
  const fd = openSync(outPath, "w");
  let res;
  try {
    res = spawnSync(process.execPath,
      [bin, "--consumer", "kogaki", "--tool", tool, "--args", JSON.stringify(args)],
      { stdio: ["ignore", fd, "pipe"], encoding: "utf8" });
  } finally { closeSync(fd); }
  let stdout = "";
  try { stdout = readFileSync(outPath, "utf8"); } catch { /* nothing captured */ }
  try { rmSync(outPath, { force: true }); } catch { /* best effort cleanup */ }
  if (res.error) return { ok: false, reason: `the gateway query could not be run (${res.error.code || "spawn failed"}: ${res.error.message})` };
  if (res.status !== 0) {
    const detail = [res.stderr, stdout].map((x) => (x || "").trim()).filter(Boolean).join(" | ");
    return { ok: false, reason: detail || `gateway-query exited ${res.status}` };
  }
  let payload;
  try { payload = JSON.parse(stdout); }
  catch (e) { return { ok: false, reason: `the ${tool} payload is not readable JSON (${e.message})` }; }
  if (!Array.isArray(payload.lines)) return { ok: false, reason: `miss-shaped ${tool} payload — no lines array` };
  return { ok: true, lines: payload.lines };
}

// `kind: "journey"` is the one filter declared — the manifest of every
// Journey, bounded to the one family this Packet ever renders, never the
// whole ELEMENTS manifest. Each record a Leg needs then has its prose read
// from the shards its `renderings` name, first one carrying it wins, each
// shard fetched at most once per build.
function fetchJourneySurvey() {
  const r = gatewayCall("element_survey", { kind: "journey" });
  if (!r.ok) return r;
  const served = new Map();
  for (const l of r.lines) {
    try {
      const rec = JSON.parse(l.text);
      if (typeof rec?.slug === "string" && typeof rec?.kind === "string") {
        served.set(journeyIdentityKey(rec.slug, rec.kind), rec);
      }
    } catch { /* an unparseable line resolves nowhere for any cite naming it, which journeyTextFromSurvey already reports */ }
  }
  return { ok: true, served };
}

function withServedProse(served, cite, shardCache) {
  const ref = parseJourneyCiteRef(cite);
  const rec = ref && served.get(journeyIdentityKey(ref.slug, ref.kind));
  if (!rec || (typeof rec.body === "string" && rec.body.trim() !== "")) return;
  for (const shard of Array.isArray(rec.renderings) ? rec.renderings : []) {
    if (!shardCache.has(shard)) shardCache.set(shard, gatewayCall("gloss_index", { tag: shard }));
    const got = shardCache.get(shard);
    const prose = got.ok ? journeyProseFromShardLines(got.lines, ref.slug, ref.kind) : null;
    if (prose) { rec.body = prose; return; }
  }
}

// THE DRIVEN CALL: a Leg's declared Journeys × the Brief's own cite lines →
// the SAME Leg with each `journeys[].resolvedText` filled, or the FIRST
// refusal, named by Leg and address. Called once per Leg that declares any
// Journey, before `renderPacket` runs — resolution happens or the build never
// reaches the renderer, let alone the writer.
// A RE-ACTIVATED JOURNEY RESOLVES THE SAME WAY (kogaki#1261): each
// `<leg_id> journey <strand>` entry names a Journey the depended-on Leg drew
// on, and its scene is served text the writer restores under `Active here`,
// so it is fetched here, by the same survey, and carried on the Leg as
// `reactivatedJourneys` — `{leg_id, strand, use, resolvedText}` per entry.
function reactivatedJourneyEntries(leg, brief) {
  return (leg["re-activate"] || [])
    .map((raw) => parseReactivateEntry(raw))
    .filter((e) => !e.error && e.kind === "journey")
    .map((e) => {
      const target = (brief.legs || []).find((l) => l.leg_id === e.leg_id);
      const j = (target?.journeys || []).find((x) => x.strand === e.value);
      return { leg_id: e.leg_id, strand: e.value, use: j ? j.use : null };
    });
}

export function resolveLegJourneys(leg, brief) {
  const reactivated = reactivatedJourneyEntries(leg, brief);
  if (!(leg.journeys || []).length && !reactivated.length) return { leg };
  const survey = fetchJourneySurvey();
  const shardCache = new Map();
  const resolveOne = (j) => {
    const cite = (brief.strands.find((st) => st.id === j.strand)?.cites || [])
      .find((c) => c.kind === "journey cite");
    if (survey.ok) withServedProse(survey.served, cite?.cite, shardCache);
    const result = survey.ok
      ? journeyTextFromSurvey(cite?.cite, survey.served)
      : { error: `the gateway could not be read — ${survey.reason}` };
    const refusal = journeyResolutionRefusal(leg.leg_id, j, cite?.cite, result);
    return refusal ? { error: refusal } : { text: result.text };
  };
  const resolved = [];
  for (const j of leg.journeys || []) {
    const r = resolveOne(j);
    if (r.error) return { error: r.error };
    resolved.push({ ...j, resolvedText: r.text });
  }
  const reactivatedJourneys = [];
  for (const j of reactivated) {
    const r = resolveOne(j);
    if (r.error) return { error: r.error };
    reactivatedJourneys.push({ ...j, resolvedText: r.text });
  }
  return { leg: { ...leg, journeys: resolved, reactivatedJourneys } };
}

// THE AUDIENCE THE BRIEF WAS COMPOSED FOR (kogaki#1251 item 1, kogaki#1261,
// kogaki#1370). The Brief's own `compose_path:` line names it once the mint
// records it (kogaki#1262); a Brief minted before that line existed reads the
// one Audience the Brief workflow table names at its `compose_path` row's
// `reader_file`, which is the file every such Brief was composed with -- since
// kogaki#1307 the row names a setting, `brief.audience_file` since kogaki#1370, in
// `kogaki.settings.json`, read here as the workflow reads it. A relative path
// resolves against the repository root, as the workflow's does.
const DRAFT_REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export function packetPersonaPath(brief) {
  const named = brief?.record?.compose_path;
  if (typeof named === "string" && named !== "") return resolve(DRAFT_REPO, named);
  let table;
  try { table = JSON.parse(readFileSync(join(DRAFT_REPO, "src", "brief-workflow.json"), "utf8")); }
  catch (e) { return { error: `src/brief-workflow.json cannot be read (${e.message}) — the Brief names no compose_path, and the workflow's compose_path row names the Audience otherwise` }; }
  const row = (table.states || []).find((s) => s.id === "compose_path");
  const readerFile = row ? settingValue(row.reader_file) : undefined;
  if (typeof readerFile !== "string" || readerFile === "") {
    return { error: "the Brief names no compose_path and src/brief-workflow.json's compose_path row names no reader_file — the Packet has no Audience to render the register from (kogaki#1261, kogaki#1370)" };
  }
  return resolve(DRAFT_REPO, readerFile);
}

// The Brief header's `external_authority: on | off` (kogaki#1251 item 3,
// set at the mint by kogaki#1262). Absent reads as `on`, the mint's default.
export function externalAuthorityOf(brief) {
  return brief?.record?.external_authority !== "off";
}

// ONE `Introduce here` LINE (kogaki#1261, amended kogaki#1404). A typed item
// renders its kind, so the writer names a coined term as coined and brings
// an established one in under its name alone — never under the `source` that
// justifies the "established" kind, which is Brief-side material and has no
// home in the Writer's instruction (kogaki#1404); a coined term's authority
// line — `nearest` and `differs` — renders on the same line where the item
// carries it and the Brief has not switched the external authority off. A
// bare or anchored term renders as it always did.
export function introduceLine(raw, authorityOn) {
  const p = parseIntroducesEntry(raw);
  if (p.error || !p.kind) return `- ${typeof raw === "string" ? raw : JSON.stringify(raw)}`;
  if (p.kind === "established") {
    return `- ${p.term} — established: the term already has a home outside this article; bring it in under that name.`
      + (p.meaning ? ` meaning: ${p.meaning}` : "");
  }
  let line = `- ${p.term} — coined: this article names it for the first time; present it as a name this article gives. meaning: ${p.meaning}`;
  if (authorityOn && p.nearest) {
    line += ` nearest existing term: ${p.nearest}.`;
    if (p.differs) line += ` differs: ${p.differs}`;
  }
  return line;
}

// THE MEANING A CROSSING TERM CARRIES (kogaki#1282, owner decision
// 2026-10-06; amended kogaki#1404): a typed `coined` entry names its own
// `meaning`; a typed `established` entry's `source` is a Brief-side
// justification for the "established" kind and never the term's meaning
// (src/leg-schema.json, `introduces_item`) — an established entry carries a
// `meaning` only where the Brief gave it one, and none otherwise; the legacy
// bare/anchored form's anchor IS its meaning anchor (the form
// `parseIntroducesEntry` refuses with no text after the separator). A bare
// term with no anchor carries none, stated rather than invented.
export function introducedMeaning(p) {
  if (!p || p.error) return null;
  if (p.kind === "coined" || p.kind === "established") return p.meaning || null;
  return p.anchor || null;
}

// THE READER'S OWN WORLD (kogaki#1285, owner ruling 2026-10-06): the
// Audience's `persona.prior_knowledge` field, read directly here rather than
// through `readerProse` — that reader refuses by name on an absent register,
// and an absent or empty `prior_knowledge` is a STATED CASE this one must
// render, never a refusal. The file is read by `audienceRecord`, the YAML
// reader the Brief and the Move are read by (kogaki#1413).
export function personaPriorKnowledge(path) {
  const a = audienceRecord(path);
  if (a.error) return null;
  const persona = a.record.persona;
  if (!persona || typeof persona !== "object" || Array.isArray(persona)) return null;
  const v = persona.prior_knowledge;
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
