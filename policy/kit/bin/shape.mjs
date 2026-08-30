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
//
// THE DELTA STEP (`--delta`, kogaki#334; contract §3.4). §3.4 decides the host:
// the pre-step is THIS kit command, and `commands/spec-sitting.md` invokes it.
// It regenerates live, compares the VENDORED pin against the SERVED one, and
// presents the policy delta before the sitting's first act. Two properties are
// load-bearing and are asserted rather than described:
//
//   * IT REPORTS AND NEVER GATES. A stale pin, a vendored digest that records no
//     pin, and no vendored digest at all are three states, each rendered as
//     itself, all exiting 0. Only the seam being unreachable exits non-zero, and
//     that is the ratified one-line exit-11 degrade every kit tool owes — the
//     HOST treats it as non-gating, which is what §3.5's
//     enhancer-never-dependency property requires.
//   * IT RENDERS ON THE OWNER SURFACE, so §8 governs it: no `consulted:`, no
//     `request_id:`, no `@<sha>`. The delta therefore says THAT the surface
//     moved and never prints the pin it moved between. That is not a nicety —
//     §8.1 puts pins on the machine-facing side, and a delta is the one shape
//     read output an owner reads directly. It is guaranteed BY CONSTRUCTION
//     (the composer never interpolates a pin) and asserted in both the fixture
//     pass below and `policy/kit/test/install-test.sh` case 2i, over live text.
//
// ITS GRANULARITY IS NOT DECIDED HERE. §3.4 binds "present the policy delta"
// and fixes no resolution; story 1.51 carries that as an open question rather
// than a criterion. So this renders the MINIMAL reading of what the criterion
// binds — whether the served pin moved, plus which of the digest's own sections
// changed text — and nothing finer. A per-headline diff would be a fork this
// file is not licensed to close.

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
    // PARSE FROM THE FIRST BRACE TO THE END, never one line (kogaki#638). The
    // gateway PRETTY-PRINTS, so its first line starting with `{` is the bare
    // `{` — the old form handed that alone to JSON.parse, which threw, so
    // EVERY element degraded to a soft absence and the digest recorded
    // `pin: unknown` against a live seam. Slicing keeps the property the old
    // form was reaching for (tolerate a log line before the body) while
    // admitting a multi-line body, which is what the transport emits.
    const brace = text.indexOf("{");
    return { data: JSON.parse(brace >= 0 ? text.slice(brace) : text) };
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
  if (names.soft) return { rows: [], all: 0, read: 0, dropped: [], unestablished: names.soft };
  const all = flattenNames(names.data);
  if (!all.length) return { rows: [], all: 0, read: 0, dropped: [], note: "the served glossary enumeration came back empty" };
  const corpus = repoText(repo);
  // Word-bounded, like element 1's consumer match — the two scoping tests used
  // to disagree, and the looser one was a bare substring over four files, so a
  // short served name was admitted on any word containing it.
  const scoped = all.filter((n) => n.length > 2 && carriesConsumer(corpus, n));
  const rows = [];
  // THE PER-TERM DROP, counted and named (kogaki#334; §3.1's denominator clause
  // binds this case in terms). `if (e.soft) continue;` made a term whose own
  // `glossary_entry` read could not be parsed INDISTINGUISHABLE from one that
  // carries no state line: both vanished, and the section rendered the survivors
  // as if they were the whole in-scope set. That is the element-level defect
  // PR #335 fixed, surviving one level down at the per-term grain — which is why
  // §3.1 names the per-term case rather than restating the general rule.
  const dropped = [];
  const considered = scoped.slice(0, 40);
  for (const name of considered) {
    const e = served(consumer, "glossary_entry", { name }, gateway);
    if (e.fatal) return e;
    if (e.soft) { dropped.push(name); continue; }
    const state = collectLines(e.data).find((l) => isStateLine(l.text));
    if (state) rows.push({ name, cite: state.cite, text: state.text });
  }
  return { rows, dropped, read: considered.length, all: all.length, scoped: scoped.length, capped: scoped.length > 40 };
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
  if (r.soft) return { rows: [], all: 0, unestablished: r.soft };
  const lines = collectLines(r.data);
  const rows = lines.filter((l) => carriesConsumer(l.text, consumer));
  // The denominator this element's zero is counted against (§3.1): how many
  // served lines the lookup returned, so "none found" can be told from "the
  // lookup returned nothing to search".
  return { rows, all: lines.length, pin: r.data?.pin, coverage: r.data?.coverage };
}

// ---------------------------------------------------------------- element 4
// One line per consultation-map boundary. A LOCAL read: the map is
// consumer-authored by contract, so the seam is not the place to ask for it.
function boundaries(repo) {
  const p = join(repo, "policy/consultation-map.md");
  if (!existsSync(p)) return { rows: [], lines: 0, note: "no policy/consultation-map.md in this repository" };
  const rows = [];
  let inEntries = false;
  const all = readFileSync(p, "utf8").split("\n");
  for (const line of all) {
    if (/^##\s+Entries\s*$/.test(line)) { inEntries = true; continue; }
    if (inEntries && /^###\s+\d+\.\s/.test(line)) rows.push(line.replace(/^###\s+/, "").trim());
  }
  // The denominator for this element's zero (§3.1). A local read still owes it:
  // "declares no entries" over a file that was never opened and over a file that
  // was read in full are the same sentence and different facts.
  return { rows, lines: all.length };
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
    L.push("");
    L.push(`_${g.rows.length} of ${g.read ?? g.rows.length} in-scope term(s) read carry a served state line (of ${g.all ?? 0} served glossary names)._`);
    if (g.capped) L.push(`\n_Capped at 40 of ${g.scoped} in-scope terms._`);
  } else if (g.unestablished) {
    L.push(`**Could not establish.** ${g.unestablished}`);
    L.push("");
    L.push("Not a statement that no term is in scope — the enumeration did not complete.");
  } else {
    // `g.note` carries the parsed-but-empty-extraction case (mutation M7's own
    // state). The rewrite that split `unestablished` out dropped this read and
    // left its producer unreachable, so a successful read whose EXTRACTION
    // yielded nothing claimed something about this repository's scoping.
    L.push(`**None.** ${g.note ?? `No served glossary term (of ${g.all ?? 0} read) is mentioned in this repository's own policy surface.`}`);
  }
  // THE PER-TERM DENOMINATOR, rendered in the POPULATED case as well as the
  // empty one (§3.1, kogaki#334). It belongs here rather than inside either
  // branch because a populated section is exactly where a dropped term hides
  // best: rows are present, the section looks answered, and the terms whose
  // reads failed are the ones a reader would never think to miss.
  if (g.dropped?.length) {
    L.push("");
    L.push(
      `**${g.dropped.length} of ${g.read ?? g.dropped.length} term(s) read could not be established** — ` +
        "the served entry came back in a body this composer could not parse, so their state is " +
        `unknown rather than absent: ${g.dropped.map((n) => `\`${n}\``).join(", ")}.`,
    );
  } else if (g.read) {
    L.push("");
    L.push(`_All ${g.read} in-scope term(s) read were established; no term was dropped unread._`);
  }
  L.push("");

  L.push("## 3. Role-assigned obligations");
  L.push("");
  if (o.rows?.length) {
    for (const r of o.rows) L.push(`- ${oneLine(r.text)}\n  \`${r.cite}\``);
  } else if (o.unestablished) {
    // The element the layer exists for is the LAST place a false "none found"
    // should survive, and it was the last place it did: the paragraph below
    // asserts the successor is reading a finding of none, which is exactly
    // false over a read that never completed.
    L.push(`**Could not establish.** ${o.unestablished}`);
    L.push("");
    L.push("Not a finding that no obligation is assigned — the read did not complete,");
    L.push("so none was looked for. A successor MUST NOT read this as an empty inventory:");
    L.push("that is the state this element exists to make impossible.");
  } else {
    L.push(`**None found.** ${o.note ?? `No served line (of ${o.all ?? 0} read) names an obligation assigned to this consumer as a role.`}`);
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
  else L.push(`**None declared.** ${b.note ?? `policy/consultation-map.md was read (${b.lines ?? 0} lines) and declares no entries under its \`## Entries\` heading.`}`);
  L.push("");
  L.push("Consult before acting at any of these. The map triggers consultation and");
  L.push("carries no verdicts — the answer stays in the substrate.");
  L.push("");
  return L.join("\n");
}

// ---------------------------------------------------------------- the delta
// §3.4's act, and §8's register. Everything below is a pure function of two
// digest bodies, so the fixture pass can assert what an owner actually reads.

const pinOf = (body) => (/^pin:\s*(\S+)\s*$/m.exec(String(body ?? "")) ?? [])[1];
const generatedOf = (body) => (/^generated:\s*(\S+)\s*$/m.exec(String(body ?? "")) ?? [])[1];

// The digest's own numbered sections, keyed by number. Split on the rendered
// headings rather than on line offsets so a section growing by a line does not
// report every later section as changed.
function sectionsOf(body) {
  const out = new Map();
  let cur = null;
  let buf = [];
  for (const line of String(body ?? "").split("\n")) {
    const m = /^##\s+(\d+)\.\s+(.*)$/.exec(line);
    if (m) {
      if (cur) out.set(cur.n, { title: cur.title, text: buf.join("\n").trim() });
      buf = [];
      cur = { n: m[1], title: m[2].trim() };
      continue;
    }
    if (cur) buf.push(line);
  }
  if (cur) out.set(cur.n, { title: cur.title, text: buf.join("\n").trim() });
  return out;
}

// THE OWNER-REGISTER RENDERING (§8, via AC2). No pin, no `request_id:`, no
// `consulted:` — not by filtering afterwards, which would be a deny that a
// re-worded line walks past, but because no pin value is ever interpolated into
// this text at all. What moved is stated; what it moved between stays on the
// machine-facing side where §8.1 puts it.
//
// It is deliberately NOT rendered as §8.1's Question/Answer/Conclusion. That
// shape is the owner-facing rendering of a CONSULTATION, and §3.5 says in terms
// that a shape read is not one; dressing a digest refresh in a consultation's
// clothes would assert exactly the thing the section forbids.
function renderDelta({ consumer, vendoredPath, vendored, live, date }) {
  const L = [];
  L.push(`Shape read — policy delta for ${consumer} (${date})`);
  L.push("");

  if (!vendored.found) {
    L.push(`No vendored digest was found at ${vendoredPath}, so there is nothing to compare against.`);
    L.push("One has been generated now. This is stated rather than passed over in silence: an");
    L.push("absent digest and an unchanged one are the same quiet and different facts.");
  } else if (!vendored.pin) {
    L.push(`The vendored digest at ${vendoredPath} records no generation pin, so whether the served`);
    L.push("surface has moved since it was written CANNOT BE ESTABLISHED. That is not a finding");
    L.push("that nothing changed — nothing was comparable.");
  } else if (!live.pin) {
    L.push("The regenerated digest carries no pin of its own, so the comparison could not be made.");
    L.push("Reported rather than resolved either way.");
  } else if (vendored.pin !== live.pin) {
    L.push(`**The served policy surface HAS MOVED** since the vendored digest was generated${
      vendored.generated ? ` on ${vendored.generated}` : ""
    }.`);
  } else {
    L.push(`The served policy surface has NOT moved since the vendored digest was generated${
      vendored.generated ? ` on ${vendored.generated}` : ""
    }.`);
  }
  L.push("");

  const before = sectionsOf(vendored.body);
  const after = sectionsOf(live.body);
  const keys = [...new Set([...before.keys(), ...after.keys()])].sort();
  L.push("What changed in the digest, section by section:");
  if (!keys.length) {
    L.push("  (no numbered section on either side — nothing to compare)");
  }
  let changedCount = 0;
  for (const k of keys) {
    const b = before.get(k);
    const a = after.get(k);
    const title = (a ?? b).title;
    let state;
    if (!b) state = "new";
    else if (!a) state = "no longer rendered";
    else if (a.text === b.text) state = "unchanged";
    else state = "changed";
    if (state !== "unchanged") changedCount += 1;
    L.push(`  ${k}. ${title} — ${state}`);
  }
  L.push("");
  L.push(
    changedCount
      ? `${changedCount} of ${keys.length} section(s) differ from the vendored digest. Read those before relying on them.`
      : `0 of ${keys.length} section(s) differ from the vendored digest.`,
  );
  L.push("");
  L.push("This is awareness, not a consultation. Nothing above is a receipt, and a headline that");
  L.push("becomes load-bearing for a decision still owes its boundary consult, receipted as normal.");
  L.push("Nothing is withheld: this step reports and never gates. A stale digest, an unreachable");
  L.push("seam, or no digest at all each leave the sitting free to proceed.");
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
  // ELEMENT 3 in both directions (PR #332 round 2, finding 6). The round-1 fix
  // repaired elements 1 and 2 and left this one asserting a finding of none over
  // a read that never completed — in the element the layer exists for. The soft
  // case above passed `o: {rows: []}` with no marker, so element 3's soft path
  // was never rendered in any assertion: the fixture's own blind spot is what
  // let the collapse survive the commit that removed it.
  const soft3 = render({
    consumer: "kogaki", pin: "hub@abc1234", date: "2026-01-01",
    h: { rows: [], all: 5 }, g: { rows: [], all: 5 },
    o: { rows: [], unestablished: "policy_lookup returned a body this composer could not parse" },
    b: { rows: [] },
  });
  if (!/Could not establish[\s\S]*could not parse/.test(soft3)) fail("element 3 must render an unestablished read as unestablished");
  if (soft3.includes("nothing was found rather")) fail("element 3 must not assert a finding of none over a read that did not complete");
  const none3 = render({
    consumer: "kogaki", pin: "hub@abc1234", date: "2026-01-01",
    h: { rows: [], all: 5 }, g: { rows: [], all: 5 }, o: { rows: [] }, b: { rows: [] },
  });
  if (!none3.includes("**None found.**")) fail("element 3 must still render a genuine zero as a zero");
  // The parsed-but-empty EXTRACTION case (finding 7): a disclosure whose
  // producer survives while its reader is deleted is a silent regression.
  const emptyExtraction = render({
    consumer: "kogaki", pin: "hub@abc1234", date: "2026-01-01",
    h: { rows: [], all: 5 },
    g: { rows: [], all: 0, note: "the served glossary enumeration came back empty" },
    o: { rows: [] }, b: { rows: [] },
  });
  if (!emptyExtraction.includes("came back empty")) fail("a parsed-but-empty enumeration must render its own reason, not a scoping claim");
  // And the converse, which is the half a one-directional fixture would miss: a
  // GENUINELY empty read must still render as a zero, not as an unestablished
  // one. Collapsing the two in either direction defeats the distinction.
  if (!empty.includes("**None.**")) fail("a genuine zero must still render as a zero");
  if (empty.includes("Could not establish")) fail("a genuine zero must not be reported as an unestablished read");
  if (/No served tier-1 line carries `kogaki` \(0 lines read\)/.test(soft)) {
    fail("a soft read must not render as a successful read that matched nothing");
  }

  // THE PER-TERM DENOMINATOR, BOTH DIRECTIONS (story 1.51 AC5/AC6; §3.1). One
  // direction alone passes while the collapse runs the other way — the fixture
  // blind spot PR #332 round 2 was earned by, applied to the case that blind
  // spot's own fix left open. So: a dropped term must be COUNTED AND NAMED, and
  // a genuinely complete read must NOT be reported as if terms were dropped.
  const droppedTerm = render({
    consumer: "kogaki", pin: "hub@abc1234", date: "2026-01-01",
    h: { rows: [], all: 5 },
    g: {
      rows: [{ name: "Kept", cite: "GLOSSARY.md:1@abc1234", text: "state: adopted" }],
      dropped: ["Zarvox"], read: 2, all: 9, scoped: 2,
    },
    o: { rows: [] }, b: { rows: [] },
  });
  if (!droppedTerm.includes("Zarvox")) fail("a term whose own read could not be parsed must be NAMED, never skipped");
  if (!/1 of 2 term\(s\) read could not be established/.test(droppedTerm)) {
    fail("a dropped term must be counted against the terms actually read");
  }
  if (droppedTerm.includes("no term was dropped unread")) {
    fail("a section that dropped a term must not claim a complete read");
  }
  const wholeRead = render({
    consumer: "kogaki", pin: "hub@abc1234", date: "2026-01-01",
    h: { rows: [], all: 5 },
    g: { rows: [{ name: "Kept", cite: "GLOSSARY.md:1@abc1234", text: "state: adopted" }], dropped: [], read: 1, all: 9, scoped: 1 },
    o: { rows: [] }, b: { rows: [] },
  });
  if (!wholeRead.includes("no term was dropped unread")) {
    fail("a complete per-term read must say so — the zero is rendered, not omitted");
  }
  if (wholeRead.includes("could not be established")) {
    fail("a genuinely complete read must not be reported as a dropped one");
  }
  // The GENUINELY-EMPTY direction at the section grain: zero in-scope terms is a
  // finding, and must not read as a failed set of reads.
  const emptyScope = render({
    consumer: "kogaki", pin: "hub@abc1234", date: "2026-01-01",
    h: { rows: [], all: 5 }, g: { rows: [], dropped: [], read: 0, all: 9 },
    o: { rows: [] }, b: { rows: [] },
  });
  if (!/No served glossary term \(of 9 read\)/.test(emptyScope)) fail("an empty element 2 must carry its denominator");
  if (emptyScope.includes("could not be established")) fail("an empty scope must not be reported as a dropped read");

  // EVERY ZERO CARRIES ITS DENOMINATOR (AC5), across elements and not only in
  // element 2 — the criterion says per element AND per term.
  const zeros = render({
    consumer: "kogaki", pin: "hub@abc1234", date: "2026-01-01",
    h: { rows: [], all: 7 }, g: { rows: [], dropped: [], read: 0, all: 9 },
    o: { rows: [], all: 4 }, b: { rows: [], lines: 120 },
  });
  if (!/\(7 lines read\)/.test(zeros)) fail("element 1's zero must carry its denominator");
  if (!/No served line \(of 4 read\)/.test(zeros)) fail("element 3's zero must carry its denominator");
  if (!/was read \(120 lines\)/.test(zeros)) fail("element 4's zero must say what it was counted against");

  // ---- the delta step (story 1.51 AC1/AC2/AC4) ----------------------------
  const vendoredBodyFx = render({
    consumer: "kogaki", pin: "hub@aaaaaaa", date: "2026-01-01",
    h: { rows: [{ cite: "LESSONS.md:1@aaaaaaa", text: "old headline" }], all: 3 },
    g: { rows: [], dropped: [], read: 0, all: 2 }, o: { rows: [], all: 0 }, b: { rows: [] },
  });
  const liveBodyFx = render({
    consumer: "kogaki", pin: "hub@bbbbbbb", date: "2026-01-02",
    h: { rows: [{ cite: "LESSONS.md:1@bbbbbbb", text: "new headline" }], all: 3 },
    g: { rows: [], dropped: [], read: 0, all: 2 }, o: { rows: [], all: 0 }, b: { rows: [] },
  });
  const moved = renderDelta({
    consumer: "kogaki", vendoredPath: "policy/shape.md", date: "2026-01-02",
    vendored: { found: true, pin: "hub@aaaaaaa", generated: "2026-01-01", body: vendoredBodyFx },
    live: { pin: "hub@bbbbbbb", body: liveBodyFx },
  });
  if (!/HAS MOVED/.test(moved)) fail("a moved pin must be reported as moved");
  if (!/1\. Tier-1 headlines carrying this consumer — changed/.test(moved)) fail("a changed section must be named as changed");
  if (!/4\. Consultation-map boundaries — unchanged/.test(moved)) fail("an unchanged section must be named as unchanged");

  const still = renderDelta({
    consumer: "kogaki", vendoredPath: "policy/shape.md", date: "2026-01-02",
    vendored: { found: true, pin: "hub@aaaaaaa", generated: "2026-01-01", body: vendoredBodyFx },
    live: { pin: "hub@aaaaaaa", body: vendoredBodyFx },
  });
  if (!/has NOT moved/.test(still)) fail("an unmoved pin must be reported as unmoved");
  if (/HAS MOVED/.test(still)) fail("an unmoved pin must not be reported as moved");
  if (!/0 of 4 section\(s\) differ/.test(still)) fail("an unchanged digest must render its zero with a denominator");

  const absent = renderDelta({
    consumer: "kogaki", vendoredPath: "policy/shape.md", date: "2026-01-02",
    vendored: { found: false, pin: undefined, generated: undefined, body: "" },
    live: { pin: "hub@bbbbbbb", body: liveBodyFx },
  });
  if (!/No vendored digest was found/.test(absent)) fail("an absent vendored digest must be stated, never passed over");
  if (/HAS MOVED|has NOT moved/.test(absent)) fail("an absent digest must not be reported as a comparison");

  const pinless = renderDelta({
    consumer: "kogaki", vendoredPath: "policy/shape.md", date: "2026-01-02",
    vendored: { found: true, pin: undefined, generated: "2026-01-01", body: liveBodyFx },
    live: { pin: "hub@bbbbbbb", body: liveBodyFx },
  });
  if (!/CANNOT BE ESTABLISHED/.test(pinless)) fail("a vendored digest with no pin must render as unestablished, not as unchanged");

  // AC2 — the delta is an OWNER surface (§8): no pin-shaped token, in ANY state.
  // Asserted over all four, because the state that leaks is the state nobody
  // wrote an assertion for.
  for (const [name, textOut] of [["moved", moved], ["unmoved", still], ["absent", absent], ["pinless", pinless]]) {
    if (/consulted:/.test(textOut)) fail(`the ${name} delta rendered a \`consulted:\` token on an owner surface`);
    if (/request_id:/.test(textOut)) fail(`the ${name} delta rendered a \`request_id:\` token on an owner surface`);
    if (/@[0-9a-f]{7,}/.test(textOut)) fail(`the ${name} delta rendered a pin on an owner surface`);
    if (!/reports and never gates/.test(textOut)) fail(`the ${name} delta does not state that it never gates`);
  }
  // And the converse, so the assertion above is evidence rather than decoration:
  // the DIGEST still carries its pin and its cites. Stripping them everywhere
  // would pass every deny above and destroy the digest.
  if (!/@abc1234/.test(zeros)) fail("the digest itself must keep its cites — the deny is scoped to the owner surface");

  console.log("shape self-test: rendering, empty-statement, soft-read, per-term denominator (both directions), delta (four states, pin-free), cite-carrying, word-bound and walk cases pass");
  process.exit(0);
}

if (flag("self-test")) selfTest();

const consumer = opt("consumer");
if (!consumer) {
  console.error("usage: shape.mjs --consumer <name> [--repo <path>] [--out <path>] [--gateway <js>] [--stdout] [--delta]");
  process.exit(2);
}
const repo = resolve(opt("repo", process.cwd()));
const gateway = opt("gateway");
const out = opt("out", join(repo, "policy/shape.md"));

// Read the vendored digest BEFORE regenerating: the refresh overwrites it, and
// the delta is the only thing that ever needed the old body.
const vendoredBody = existsSync(out) ? readFileSync(out, "utf8") : null;

const h = headlines(consumer, gateway);
if (h.fatal) unavailable(h.fatal);
const g = glossary(consumer, gateway, repo);
if (g.fatal) unavailable(g.fatal);
const o = obligations(consumer, gateway);
if (o.fatal) unavailable(o.fatal);
const b = boundaries(repo);

// The date is read once, here, and passed in — render() stays pure so the
// fixture above can assert what it produces.
const today = new Date().toISOString().slice(0, 10);
const text = render({
  consumer,
  pin: h.pin ?? o.pin,
  date: today,
  h, g, o, b,
});

// THE DELTA STEP (§3.4). Refresh, then present the delta — in that order,
// because the sitting is entitled to the CURRENT digest whatever the comparison
// says. Exit 0 in every state below: the only non-zero exit on this path is the
// ratified degrade, taken above by `unavailable()` before anything is rendered.
if (flag("delta")) {
  const deltaText = renderDelta({
    consumer,
    vendoredPath: out,
    vendored: {
      found: vendoredBody !== null,
      pin: pinOf(vendoredBody),
      generated: generatedOf(vendoredBody),
      body: vendoredBody ?? "",
    },
    live: { pin: h.pin ?? o.pin, body: text },
    date: today,
  });
  // The refresh half of §3.4. `--stdout` keeps its meaning — do not touch the
  // tree — so a sitting that wants the delta without the write can have it.
  if (!flag("stdout")) writeFileSync(out, `${text}\n`);
  // Note what is NOT printed here: the `shape: wrote <path> at pin <pin>` line
  // the ordinary run ends with. It carries a pin, and this is an owner surface.
  process.stdout.write(`${deltaText}\n`);
  process.exit(0);
}

if (flag("stdout")) {
  process.stdout.write(`${text}\n`);
} else {
  writeFileSync(out, `${text}\n`);
  console.log(`shape: wrote ${out} at pin ${h.pin ?? "unknown"}`);
}
