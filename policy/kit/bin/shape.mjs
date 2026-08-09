#!/usr/bin/env node
// The SHAPE READ — a pinned, scoped policy digest, composed KIT-SIDE
// (kogaki#325; contract: specs/spec-client-kit/SPEC.md §3).
//
// WHY THIS IS A COMPOSER AND NOT A GATEWAY TOOL. §3.2 decides it: the digest is
// assembled from reads the gateway ALREADY serves — `gloss_index`,
// `surface_names`, `glossary_entry` and, for element 3 only, `policy_lookup` —
// so no gateway tool is added, no gateway invariant is touched, and the server
// stays read-only. `policy_lookup` is `policy/CAPABILITIES.md`'s default
// CONSULTATION path, and using it here does NOT make the digest a consultation:
// §3.5 is what settles that, and §3.2 now records the use rather than leaving a
// reader to reconcile the tool list with the code. `lessons_index` is NOT called
// — its content reaches the digest through the tier-1 index already. The
// declined alternative is a `shape <consumer>` endpoint, recorded there with
// its reopen trigger (a second kit-installing consumer). This file is that
// endpoint's specification if the trigger ever fires.
//
// WHAT IT IS FOR. A consumer design discussion runs unglossed until its first
// registered boundary, so policy the session does not suspect stays
// undiscovered until Issue-creation — the most expensive moment to redesign.
// The digest rides the managed CLAUDE.md block, which loads every session, so
// the grounding arrives by default rather than by anyone remembering.
//
// AWARENESS, NEVER SUBSTITUTION (§3.5). A shape read is NOT a consultation and
// emits NO receipt. When a headline becomes load-bearing the boundary consult
// fires exactly as today. A sitting that cites this digest where a receipt is
// owed has violated specs/SPEC.md §4 rather than satisfied it.
//
// THE ZERO IS RENDERED (story 1.48 AC2). Every element states its own emptiness
// explicitly rather than being omitted: an omitted section and an empty one are
// the same silence to a reader and different silences to a grep, and only the
// second lets the next run tell "nothing is in scope" from "this never ran".
// What a consumer with ZERO `projects:` matches should receive — an empty
// digest or the unscoped index — is open at §7 q1 and is NOT decided here; this
// file renders the zero and says the question is open.
//
// DEGRADED IS NOT AN ERROR. An unreachable gateway prints exactly one
// `policy_source unavailable: <reason>` line and exits 11, matching
// policy/kit/README.md's degradation contract. The install that contains it
// still completes — a degraded install is a valid install.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIT_BIN = dirname(fileURLToPath(import.meta.url));
const TRANSPORT = join(KIT_BIN, "gateway-query.mjs");

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};
const flag = (n) => argv.includes(`--${n}`);

// Exit 11 and one line — the whole degradation contract, kept identical to the
// transport's so a consumer logs one shape however deep the failure was.
function unavailable(reason) {
  console.log(`policy_source unavailable: ${reason}`);
  process.exit(11);
}

// One served read through the EXISTING transport. Never a direct gateway call:
// §3.2 says the digest composes over the transport, and a second wire would be
// a second place the machine-local gateway location has to be resolved.
function served(consumer, tool, args, gateway) {
  const a = ["--consumer", consumer, "--tool", tool, "--args", JSON.stringify(args)];
  if (gateway) a.push("--gateway", gateway);
  const r = spawnSync("node", [TRANSPORT, ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { fatal: `transport failed to start: ${r.error.message}` };
  if (r.status === 11) return { fatal: (r.stdout || "").trim().replace(/^policy_source unavailable:\s*/, "") };
  const text = (r.stdout || "").trim();
  if (!text) return { fatal: `empty response from ${tool}` };
  try {
    return { data: JSON.parse(text.split("\n").find((l) => l.startsWith("{")) || text) };
  } catch {
    // A non-JSON body is not a degradation — the seam answered, unreadably.
    // Reported as a per-element absence so one bad tool cannot empty the digest.
    return { soft: `${tool} returned a body this composer could not parse` };
  }
}

// ---------------------------------------------------------------- element 1
// Tier-1 gloss headlines whose lessons carry this consumer in `projects:`.
//
// The unscoped tier-1 index is large (~77k characters at product-lab@4cc496b).
// That is fine HERE and is not fine through a harness tool call — the same
// read that overflows an agent's tool-output limit is an ordinary subprocess
// capture for this file, which is one concrete reason the composition belongs
// kit-side rather than in a session.
function headlines(consumer, gateway) {
  const r = served(consumer, "gloss_index", {}, gateway);
  if (r.fatal) return r;
  // A SOFT read is not an empty one. Walking `r.data` when it is undefined
  // yields zero rows, which render()s as "none of 0 lines" — a confident zero
  // over a read that failed, and the exact confusion this file's own AC2
  // rationale exists to prevent. Threaded rather than dropped.
  if (r.soft) return { all: 0, rows: [], unestablished: r.soft };
  const lines = collectLines(r.data);
  const mine = lines.filter((l) => carriesConsumer(l.text, consumer));
  return { pin: r.data?.pin, all: lines.length, rows: mine };
}

// A lesson carries a consumer when its `projects:` (or `tags:`) field names it.
// Matched on a word boundary so `kogaki` never matches `kogaki-adjacent`.
function carriesConsumer(text, consumer) {
  const re = new RegExp(`(^|[^A-Za-z0-9_-])${escapeRe(consumer)}([^A-Za-z0-9_-]|$)`);
  return re.test(String(text));
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The served payloads differ in shape by tool; every one of them ultimately
// carries `{cite, text}` records, so the walk is written once over the whole
// response rather than per tool.
function collectLines(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const n of node) collectLines(n, out);
    return out;
  }
  if (typeof node.cite === "string" && typeof node.text === "string") out.push({ cite: node.cite, text: node.text });
  for (const v of Object.values(node)) collectLines(v, out);
  return out;
}

// ---------------------------------------------------------------- element 2
// Glossary state lines for terms IN SCOPE.
//
// "In scope" is bounded deliberately: a term is in scope when the consumer's
// own tree mentions it. Fetching every entry would make the digest grow with
// the hub rather than with the consumer, and a digest nobody finishes reading
// grounds nothing.
function glossary(consumer, gateway, repo) {
  const names = served(consumer, "surface_names", { kind: "glossary" }, gateway);
  if (names.fatal) return names;
  // Same hole one field over, and worse: the old note asserted "the served
  // glossary enumeration came back empty" over a read that never parsed.
  if (names.soft) return { rows: [], all: 0, unestablished: names.soft };
  const all = flattenNames(names.data);
  if (!all.length) return { rows: [], all: 0, note: "the served glossary enumeration came back empty" };
  const corpus = repoText(repo);
  // Word-bounded, like element 1's consumer match — the two scoping tests used
  // to disagree, and the looser one was a bare substring over four files, so a
  // short served name was admitted on any word containing it.
  const scoped = all.filter((n) => n.length > 2 && carriesConsumer(corpus, n));
  const rows = [];
  for (const name of scoped.slice(0, 40)) {
    const e = served(consumer, "glossary_entry", { name }, gateway);
    if (e.fatal) return e;
    if (e.soft) continue;
    const state = collectLines(e.data).find((l) => isStateLine(l.text));
    if (state) rows.push({ name, cite: state.cite, text: state.text });
  }
  return { rows, all: all.length, scoped: scoped.length, capped: scoped.length > 40 };
}

// `surface_names` returns its identifiers as ordinary `{cite, text}` records —
// the same shape every other served read uses — so the enumeration rides the
// one walk rather than a second guess at the payload's layout. Writing this
// against an imagined `names` array is what emptied element 2 on the first run:
// the read succeeded, the extraction did not, and an empty section reads
// identically to "nothing is in scope".
// The served state line is stored FENCED — it begins with a backtick, not with
// `state:` — so anchoring on start-or-whitespace silently matches nothing and
// element 2 renders empty while the read succeeded. Matched on a non-word
// boundary instead, which admits the fence without admitting `restate:`.
// Named rather than inline so the fixture below can hold it.
const isStateLine = (text) => /(^|[^A-Za-z])state:/.test(String(text));

function flattenNames(data) {
  const names = collectLines(data).map((l) => l.text.trim());
  // A glossary NAME, not prose: starts with a letter, carries no sentence
  // punctuation, and is short.
  return [...new Set(names.filter((s) => /^[A-Za-z][^.;:|]*$/.test(s) && s.length < 60))];
}

// The consumer's own tree, as one string, for the scoping test above. Bounded
// to the files a policy digest could plausibly be about.
function repoText(repo) {
  const parts = [];
  for (const rel of ["CLAUDE.md", "policy/consultation-map.md", "policy/CAPABILITIES.md", "specs/SPEC.md"]) {
    const p = join(repo, rel);
    if (existsSync(p)) parts.push(readFileSync(p, "utf8"));
  }
  return parts.join("\n");
}

// ---------------------------------------------------------------- element 3
// The consumer's ROLE-ASSIGNED OBLIGATIONS — the load-bearing element.
//
// An obligation assigned to a role rather than to a named carrier dies silently
// with whoever happened to implement it (kogaki#268: hub decision D7's gate
// obligation, assigned to "the consumer", lost at succession because nothing a
// successor loads at founding carried it). A successor's FIRST shape read
// serves it, which is the whole reason §3.1 calls this element the one that
// makes the layer worth its cost.
function obligations(consumer, gateway) {
  const r = served(
    consumer,
    "policy_lookup",
    { question: `What obligations are assigned to ${consumer} as a consumer role, and which of them have no named carrier?` },
    gateway,
  );
  if (r.fatal) return r;
  if (r.soft) return { rows: [], note: r.soft };
  const rows = collectLines(r.data).filter((l) => carriesConsumer(l.text, consumer));
  return { rows, pin: r.data?.pin, coverage: r.data?.coverage };
}

// ---------------------------------------------------------------- element 4
// One line per consultation-map boundary. A LOCAL read: the map is
// consumer-authored by contract, so the seam is not the place to ask for it.
function boundaries(repo) {
  const p = join(repo, "policy/consultation-map.md");
  if (!existsSync(p)) return { rows: [], note: "no policy/consultation-map.md in this repository" };
  const rows = [];
  let inEntries = false;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (/^##\s+Entries\s*$/.test(line)) { inEntries = true; continue; }
    if (inEntries && /^###\s+\d+\.\s/.test(line)) rows.push(line.replace(/^###\s+/, "").trim());
  }
  return { rows };
}

// ---------------------------------------------------------------------------
function render({ consumer, pin, date, h, g, o, b }) {
  const L = [];
  L.push("<!-- tsurezure-client-kit:shape (generated — regenerate with policy/kit/bin/shape.mjs) -->");
  L.push(`# Policy shape — ${consumer}`);
  L.push("");
  L.push(`pin: ${pin ?? "unknown"}`);
  L.push(`generated: ${date}`);
  L.push("");
  L.push("**Awareness, never substitution.** This digest is not a consultation and");
  L.push("carries no receipt. When a headline below becomes load-bearing for a decision,");
  L.push("the boundary consult fires as normal and is receipted as normal");
  L.push("(`specs/spec-client-kit/SPEC.md` §3.5). A grounded answer displays the headline");
  L.push("verbatim with its pointer, separately from the session's own narrative.");
  L.push("");

  L.push("## 1. Tier-1 headlines carrying this consumer");
  L.push("");
  if (h.rows.length) {
    for (const r of h.rows) L.push(`- ${oneLine(r.text)}\n  \`${r.cite}\``);
    L.push("");
    L.push(`_${h.rows.length} of ${h.all} served tier-1 lines carry \`${consumer}\`._`);
  } else if (h.unestablished) {
    // NOT a zero. The read did not complete, and saying "none carry this
    // consumer" here would assert a search that never happened.
    L.push(`**Could not establish.** ${h.unestablished}`);
    L.push("");
    L.push("This is **not** a statement that nothing matched — the read did not complete,");
    L.push("so nothing was searched. The two are rendered differently on purpose.");
  } else {
    L.push(`**None.** No served tier-1 line carries \`${consumer}\` (${h.all} lines read).`);
    L.push("");
    L.push("This zero is rendered rather than omitted. What a consumer with no matches");
    L.push("*should* receive — an empty digest, or the unscoped tier-1 index — is an open");
    L.push("question at `specs/spec-client-kit/SPEC.md` §7 q1, and is not decided here.");
  }
  L.push("");

  L.push("## 2. Glossary state lines for terms in scope");
  L.push("");
  if (g.rows?.length) {
    for (const r of g.rows) L.push(`- **${r.name}** — ${oneLine(r.text)}\n  \`${r.cite}\``);
    if (g.capped) L.push(`\n_Capped at 40 of ${g.scoped} in-scope terms._`);
  } else if (g.unestablished) {
    L.push(`**Could not establish.** ${g.unestablished}`);
    L.push("");
    L.push("Not a statement that no term is in scope — the enumeration did not complete.");
  } else {
    L.push(`**None.** No served glossary term (of ${g.all ?? 0}) is mentioned in this repository's own policy surface.`);
  }
  L.push("");

  L.push("## 3. Role-assigned obligations");
  L.push("");
  if (o.rows?.length) {
    for (const r of o.rows) L.push(`- ${oneLine(r.text)}\n  \`${r.cite}\``);
  } else {
    L.push(`**None found.** ${o.note ?? "No served line names an obligation assigned to this consumer as a role."}`);
    L.push("");
    L.push("Stated rather than omitted, because this is the element the layer exists for:");
    L.push("an obligation assigned to a role dies with whoever implemented it, and a");
    L.push("successor who reads nothing here should know that nothing was found rather");
    L.push("than that nothing was looked for.");
  }
  L.push("");

  L.push("## 4. Consultation-map boundaries");
  L.push("");
  if (b.rows.length) for (const r of b.rows) L.push(`- ${r}`);
  else L.push(`**None declared.** ${b.note ?? "policy/consultation-map.md declares no entries."}`);
  L.push("");
  L.push("Consult before acting at any of these. The map triggers consultation and");
  L.push("carries no verdicts — the answer stays in the substrate.");
  L.push("");
  return L.join("\n");
}

// Flattened to one line, with a leading served list marker stripped: several
// served surfaces store their lines with the `- ` already on them, and
// rendering that inside this file's own bullet produces `- - `, which reads as
// a nested list that is not there.
const oneLine = (s) => String(s).replace(/\s+/g, " ").trim().replace(/^-\s+/, "");

// ---------------------------------------------------------------------------
// A pure fixture pass: the rendering properties, checked with no gateway. Sited
// like the transport's own --self-test so CI can run it at all.
function selfTest() {
  const fail = (m) => { console.error(`FAIL: ${m}`); process.exit(1); };
  const empty = render({
    consumer: "nobody", pin: "hub@abc1234", date: "2026-01-01",
    h: { rows: [], all: 12 }, g: { rows: [], all: 3 }, o: { rows: [] }, b: { rows: [] },
  });
  for (const token of ["## 1.", "## 2.", "## 3.", "## 4.", "**None", "§7 q1"]) {
    if (!empty.includes(token)) fail(`an all-empty digest must still render ${token}`);
  }
  if (!empty.includes("pin: hub@abc1234")) fail("the pin must be rendered");
  if (!empty.includes("generated: 2026-01-01")) fail("the generation date must be rendered");
  if (!/carries no receipt/.test(empty)) fail("the awareness-never-substitution clause must be rendered");

  const full = render({
    consumer: "kogaki", pin: "hub@abc1234", date: "2026-01-01",
    h: { rows: [{ cite: "LESSONS.md:1@abc1234", text: "a lesson\nwrapped" }], all: 12 },
    g: { rows: [{ name: "Gukan", cite: "GLOSSARY.md:1@abc1234", text: "state: x" }], all: 3, scoped: 1 },
    o: { rows: [{ cite: "topics/x.md:2@abc1234", text: "kogaki owes y" }] },
    b: { rows: ["1. Check/CI infrastructure"] },
  });
  if (full.includes("**None")) fail("a populated digest must render no empty statement");
  if (!full.includes("a lesson wrapped")) fail("a multi-line served line must be flattened, not truncated");
  if (!full.includes("LESSONS.md:1@abc1234")) fail("every rendered line must carry its cite");

  if (carriesConsumer("projects: kogaki-adjacent", "kogaki")) fail("consumer match must be word-bounded");
  if (!carriesConsumer("projects: tanuki, kogaki", "kogaki")) fail("consumer match must find a list member");

  const walked = collectLines({ a: [{ cite: "c:1", text: "t" }], b: { c: { cite: "c:2", text: "u" } } });
  if (walked.length !== 2) fail("the line walk must reach nested and arrayed records");

  // The two extraction defects that emptied element 2 on the first live run,
  // held as cases: the read succeeded both times and only the extraction was
  // wrong, which renders identically to "nothing is in scope".
  if (!isStateLine("`state: adopted 2026-08-06`")) fail("a FENCED state line must be recognised");
  if (!isStateLine("state: bare")) fail("an unfenced state line must be recognised");
  if (isStateLine("restate: not this")) fail("`restate:` must not be read as a state line");
  const names = flattenNames({ lines: [{ cite: "GLOSSARY.md:1@a", text: "Gukan" }, { cite: "GLOSSARY.md:2@a", text: "a: prose, with punctuation" }] });
  if (!names.includes("Gukan")) fail("glossary names must be read from the served {cite,text} records");
  if (names.some((n) => n.includes(":"))) fail("prose must not be admitted as a glossary name");

  // THE SOFT-READ CASES (PR #332 round 1, finding 1). A failed read must never
  // reach render() as a zero. Asserted on the rendered text, because the defect
  // was invisible in the data — `{all: 0, rows: []}` is what a genuine miss
  // looks like too.
  const soft = render({
    consumer: "kogaki", pin: "hub@abc1234", date: "2026-01-01",
    h: { rows: [], all: 0, unestablished: "gloss_index returned a body this composer could not parse" },
    g: { rows: [], all: 0, unestablished: "surface_names returned a body this composer could not parse" },
    o: { rows: [] }, b: { rows: [] },
  });
  if (!soft.includes("could not parse")) fail("a soft read must render its reason, never a bare zero");
  if (!soft.includes("Could not establish")) fail("a soft read must be labelled distinctly from a zero");
  // And the converse, which is the half a one-directional fixture would miss: a
  // GENUINELY empty read must still render as a zero, not as an unestablished
  // one. Collapsing the two in either direction defeats the distinction.
  if (!empty.includes("**None.**")) fail("a genuine zero must still render as a zero");
  if (empty.includes("Could not establish")) fail("a genuine zero must not be reported as an unestablished read");
  if (/No served tier-1 line carries `kogaki` \(0 lines read\)/.test(soft)) {
    fail("a soft read must not render as a successful read that matched nothing");
  }

  console.log("shape self-test: rendering, empty-statement, soft-read, cite-carrying, word-bound and walk cases pass");
  process.exit(0);
}

if (flag("self-test")) selfTest();

const consumer = opt("consumer");
if (!consumer) {
  console.error("usage: shape.mjs --consumer <name> [--repo <path>] [--out <path>] [--gateway <js>] [--stdout]");
  process.exit(2);
}
const repo = resolve(opt("repo", process.cwd()));
const gateway = opt("gateway");
const out = opt("out", join(repo, "policy/shape.md"));

const h = headlines(consumer, gateway);
if (h.fatal) unavailable(h.fatal);
const g = glossary(consumer, gateway, repo);
if (g.fatal) unavailable(g.fatal);
const o = obligations(consumer, gateway);
if (o.fatal) unavailable(o.fatal);
const b = boundaries(repo);

// The date is read once, here, and passed in — render() stays pure so the
// fixture above can assert what it produces.
const text = render({
  consumer,
  pin: h.pin ?? o.pin,
  date: new Date().toISOString().slice(0, 10),
  h, g, o, b,
});

if (flag("stdout")) {
  process.stdout.write(`${text}\n`);
} else {
  writeFileSync(out, `${text}\n`);
  console.log(`shape: wrote ${out} at pin ${h.pin ?? "unknown"}`);
}
