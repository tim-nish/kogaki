#!/usr/bin/env node
// Minimal stdio MCP client for the tsurezure gateway — the kit's one transport.
// Usage: gateway-query.mjs --consumer <name> --tool <tool> --args '<json>'
//        [--args '<json>' …]             one --args per FRAMING, in order
//        [--question '<q>' …]            one --question per --args, SAME ORDER
//        [--receipt --outcome <token>]   emit the consult receipt block
//        [--disposition <token>]         the gate half, carried onto the block
//                                        as a second continuation key when the
//                                        consult was raised at a fork gate;
//                                        omitted otherwise (kogaki#268)
//        [--gateway <path-to-dist/index.js>]
//
// Contract (client-kit README): on ANY failure to reach or converse with the
// gateway, print exactly one `policy_source unavailable: <reason>` line and
// exit 11 — the caller logs it once and proceeds without policy interaction.
// On success, print the tool result's text content to stdout and exit 0.
//
// RECEIPT MODE (kogaki#66, story 1.20; specs/SPEC.md §4 "the receipt is
// EMITTED BY THE TOOL THAT PERFORMED THE CONSULT"). With --receipt the
// transport prints, after the tool results it prints today, one v2 receipt
// block in the grammar SPEC §4 fixes. It composes that block ONLY from what
// it observed on the wire:
//   * line one is the gateway's OWN `consulted:` rendering, copied whole for a
//     single framing and merged across framings for several — never re-derived;
//   * `request_id:` is the id the gateway returned;
//   * one `query:` line per framing ACTUALLY RUN, verbatim as sent.
// Nothing here is remembered, so the transcription defects the clause exists
// to prevent (kogaki#32's coined vocabulary, kogaki#75's copied request_id)
// are unproducible on this path.
//
// THE QUESTION TRAVELS WITH THE CALL (kogaki#160 finding 4). Until this
// change the `query:` line was DERIVED: `policy_lookup`'s framing has a
// `question` argument and was recorded from it, and every other tool had its
// `--args` JSON recorded instead — so a `gloss_index` consult emitted
// `query: {"tag":"lessons/testing"}`, a serialized tool argument in the field
// `the consultation map's Miss-postmortem field` defines as "**The question, verbatim**".
// There was no field in which such a consult COULD record its question, which
// made the omission a seam gap rather than an authoring slip.
//
// `--question` closes it by construction: one per `--args`, in the SAME ORDER,
// and REQUIRED in receipt mode. It is bound to A CALL, never to the invocation
// — `framings[i]`, `--question i`, and the response to call i are one record
// (`observed[i]`), and `composeReceipt` reads that record rather than three
// parallel lists. So the `request_id` the receipt carries (the LAST framing's,
// the answer the outcome is a reading of) and the LAST `query:` line are the
// same gateway call's, and cannot be recombined by hand afterwards. Ships
// against three shipped failures where a receipt was self-consistent on its
// face and wrong; see specs/SPEC.md §4 for the record.
//
// A `--question` that disagrees with a `policy_lookup` framing's own
// `question` argument is REFUSED rather than reconciled: one of the two is not
// what ran, and the transport asserts only what it observed.
//
// The `outcome` token is NOT the transport's to assign. It is a READING of
// whether the answer discriminated, and SPEC §4 assigns it to the OPERATOR —
// `deferred-slot: consult-outcome-token-assignment` is FILLED (owner decision
// 2026-08-06 on kogaki#66: A2, the caller supplies the token; A1, the tool
// assigning mechanically, was declined). So --outcome is REQUIRED in receipt
// mode and there is no default and no inference: the transport refuses
// (exit 2) rather than guessing. The refusal predates the fill and coincides
// with it — see the ordering disclosure in specs/SPEC.md §4 — so nothing here
// changed when the slot closed except that the behaviour is now decided
// rather than interim.
//
// THE ANSWER MUST EVIDENCE THE ADDRESS THE FRAMING SENT (kogaki#181). This is
// the ANSWER-field twin of kogaki#160, and it is a DIFFERENT defect at the same
// seam: `--question` makes the recorded query provably the query that ran, and
// says nothing about whether the call reached the artifact the arguments named.
// An unrecognized address FORM was DROPPED rather than refused by the gateway
// UNTIL tsurezure-gateway#88 (merged 2026-08-09) — it answered the broader call
// and returned a well-formed response to a query it did not run, so the receipt
// was honest about every field it held and its answer was another artifact's.
// gw#88 refuses such a key instead; the past tense is deliberate, and the
// client-side refusal below is what this kit stands behind against EITHER
// version, since the served catalogue does not carry the gateway's version
// (kogaki#328). Four such receipts shipped in one session (PR #170's
// lane): well-formed, citing real lines, their arguments never in effect.
//
// MEASURED ON THE WIRE, at product-lab@98195e0a, rather than assumed. Every
// served tool answers an unrecognized address one of exactly two ways:
//
//   * a tool whose address argument is REQUIRED (`policy_lookup.question`,
//     `glossary_entry.name`, `topic_thread.topic`, `surface_names.kind`)
//     rejects the call at schema validation — an MCP -32602 the wire loop below
//     already turns into the exit-11 degrade. Unreachable by construction.
//   * a tool whose address argument is OPTIONAL (`gloss_index.tag`,
//     `lessons_index.tags`, `element_survey.kind`/`.tag`) SILENTLY DROPS the
//     key and serves the unfiltered artifact: `gloss_index` returns
//     `gloss/INDEX.md` instead of `gloss/lessons/testing.md`, `element_survey`
//     returns 814 ELEMENTS lines instead of 146. `miss: false`, a real
//     `request_id`, a real `consulted:` line. This is the defect, entire.
//
// So "evidences the address" resolves to TWO checks, and both read only the
// wire:
//   (a) THE FORM, checked where the ambiguity is CREATED. Every key a framing
//       sends must be one the served `tools/list` schema declares for that
//       tool. This is the served ruling applied at the only layer Kogaki owns:
//       "where identity is derived by discarding a component, the discarding
//       step is the only place the collision is visible … gate where the
//       ambiguity is created" — and the discarding step reachable from here is
//       the argument object this transport composes, checked before its answer
//       is believed.
//   (b) THE ECHO, where the gateway gives one. A MISS response carries `tool`
//       and `request`, so the served answer names the address it answered; the
//       transport requires them to be the address it sent. Only the keys the
//       framing SENT are compared — a normalized `null` the gateway adds for an
//       absent optional key is the gateway's business, not a contradiction.
//
// WHAT IS NOT DECIDABLE CONSUMER-SIDE, declared rather than left silent. On the
// HIT path the gateway echoes NOTHING: a `gloss_index` hit and an unfiltered
// `gloss_index` hit differ only in the served path, and an `element_survey` hit
// differs only in a line COUNT the transport has no corpus knowledge to judge.
// After (a) and (b) the residual claim — that a DECLARED, well-formed address
// was actually applied — rests on an inference about the producer's behaviour
// and not on an observation, and the transport does not assert it. Deriving it
// back out of the `consulted:` path is exactly the re-derivation the same
// served ruling forbids ("must QUOTE ratified renderings rather than re-derive
// them", `topics/articles.md:102`), so it is NOT done here. That half is routed
// to the gateway repository as its own item: echo `tool` and `request` on the
// HIT path as the MISS path already does, and (b) becomes total. See
// specs/SPEC.md §4 condition 5.
//
// Exit 12 — `receipt not composable: <reason>`. The consult happened and its
// results are printed, but the wire did not carry what a receipt asserts (a
// non-JSON result, an absent request_id or `consulted:` line, framings whose
// pins disagree, a framing that is not one line, an address form the served
// tool does not declare, or a served echo naming a different call). Refusing
// beats emitting a block the transport cannot stand behind.
//
// The gateway's location is MACHINE-LOCAL CONFIGURATION, never a committed
// path and never directory adjacency (kogaki#9). Resolution order:
//   1. --gateway <path>
//   2. $TSUREZURE_GATEWAY_JS
//   3. the machine-local MCP registration (~/.claude.json), this project first
// Exhausting all three is a degradation, not a crash — same one-line contract.

import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const argv = process.argv.slice(2);
function opt(name, fallback = undefined) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
}
// Every occurrence, in order. `--args` repeats once per FRAMING and `--tool`
// may repeat alongside it; a single `--tool` covers every framing, which is
// the common case (one question re-framed against `policy_lookup`).
function opts(name) {
  const out = [];
  for (let i = 0; i < argv.length; i++) if (argv[i] === `--${name}`) out.push(argv[i + 1]);
  return out;
}
function flag(name) {
  return argv.includes(`--${name}`);
}

const consumer = opt("consumer");
const tool = opt("tool", "policy_lookup");
const rawArgsList = opts("args");
const toolList = opts("tool");
const questionList = opts("question");
const receiptMode = flag("receipt");
// THE OWNER-REGISTER RENDERING (kogaki#320; specs/spec-client-kit/SPEC.md §8).
// Independent of `--receipt` on purpose: §8 keeps the audit register and the
// owner register separate, and a flag that implied the other would re-merge the
// two registers this section exists to split. Opt-in, so every existing caller
// is byte-identical without it.
const ownerRenderMode = flag("owner-render");
const outcome = opt("outcome");
// THE GATE HALF (kogaki#268). CARRIED, never judged — the same standing the
// `outcome` token has here: this transport asserts only what it observed, and
// what the gate did with the answer is not something the wire can see. The
// value is validated at `consult.mjs`, which is where the discipline lives;
// admitting it here without judging it is what keeps exactly one receipt
// composer and exactly one place the vocabulary is enforced.
const disposition = opt("disposition");
// One framing per --args; no --args at all is the historical single empty call.
// `question` is positional against `--args`: framing i's question is
// `--question` i. Carried ON the framing rather than in a parallel array, so
// there is no index at which a question and a call can drift apart.
const framings = (rawArgsList.length ? rawArgsList : ["{}"]).map((raw, i) => ({
  raw,
  tool: toolList[i] ?? tool,
  args: JSON.parse(raw),
  question: questionList[i],
}));
const toolArgs = framings[0].args;

// `--self-test` exercises the receipt composition against synthetic responses
// and exits, touching no gateway. Sited here so it runs BEFORE any resolution
// or spawn: the properties it checks are pure functions of a served response,
// and a test that needed a live substrate could not run in CI at all. The
// function is a hoisted declaration defined with the composition it covers.
if (flag("self-test")) selfTest();
// Write to stdout and exit only once the write has drained.
//
// process.exit() discards whatever is still buffered in an asynchronous
// stdout — and stdout IS asynchronous whenever it is a pipe (a spawnSync
// capture, `| head`, a subshell). A file or a TTY writes synchronously, so
// the same code delivers the whole payload there and truncates on a pipe,
// which is why only a large response through a captured stdout ever showed
// it. Setting exitCode first keeps the code correct even if the callback
// has already fired and the process leaves on its own. kogaki#23.
function writeThenExit(text, code) {
  process.exitCode = code;
  process.stdout.write(`${text}\n`, () => process.exit(code));
}

// Deliberately NOT writeThenExit: every caller below depends on this not
// returning — two of them run before the try block and two inside async
// callbacks, so a deferred exit would fall through to `existsSync(undefined)`
// rather than degrade. The truncation class does not reach here in practice
// either: this writes one short line, where the payload path above writes
// ~500KB. If this ever has to drain, the halt has to be restructured with it
// — the two changes are one change, not two.
function unavailable(reason) {
  console.log(`policy_source unavailable: ${reason}`);
  process.exit(11);
}

// Source 3: the machine-local MCP registration. Reads the `tsurezure` stdio
// server's argv and returns the first `.js` argument. Never throws — an
// unreadable or absent registration is just an exhausted source.
function gatewayFromMcpRegistration() {
  try {
    const config = JSON.parse(
      readFileSync(join(homedir(), ".claude.json"), "utf8"),
    );
    const scopes = [
      config.projects?.[process.cwd()]?.mcpServers,
      ...Object.values(config.projects ?? {}).map((p) => p?.mcpServers),
      config.mcpServers,
    ];
    for (const servers of scopes) {
      const args = servers?.tsurezure?.args;
      const found = args?.find?.((a) => typeof a === "string" && a.endsWith(".js"));
      if (found) return found;
    }
  } catch {
    // fall through — an unreadable registration is an exhausted source
  }
  return undefined;
}

const gateway =
  opt("gateway") ?? process.env.TSUREZURE_GATEWAY_JS ?? gatewayFromMcpRegistration();

if (!gateway) {
  unavailable(
    "gateway location not configured (--gateway, $TSUREZURE_GATEWAY_JS, " +
      "or an MCP registration named tsurezure)",
  );
}

if (!consumer) {
  console.error("usage: gateway-query.mjs --consumer <name> --tool <tool> --args '<json>'");
  process.exit(2);
}
// A USAGE check, sited beside `!consumer` above and therefore ahead of the
// reachability probe below: an invocation that cannot produce a receipt is
// malformed whether or not the gateway answers, and reaching out first would
// spend a real consult on a call that was always going to refuse. The ordering
// costs the ratified degrade nothing — an UNCONFIGURED gateway is decided
// above this line and still exits 11, and a well-formed receipt-mode call
// against an unreachable gateway degrades exactly as before (AC 3).
if (receiptMode && !outcome) {
  console.error(
    "refusing to emit a receipt without --outcome: the token is a READING of " +
      "whether the answer discriminated, and specs/SPEC.md §4 assigns it to " +
      "the OPERATOR (the `consult-outcome-token-assignment` fill, kogaki#66). " +
      "The transport asserts only what it observed; it does not guess this. " +
      "Supply one of: discriminating | covered-after-reframing | " +
      "uncovered-after-N-framings",
  );
  process.exit(2);
}
// The same USAGE siting, and for the same reason: an invocation that cannot
// produce a truthful `query:` line is malformed whether or not the gateway
// answers, and reaching out first would spend a real consult on a call that
// was always going to refuse. Checked as a COUNT against the framings, because
// the defect this closes is a question bound to the invocation rather than to
// the call whose outcome is recorded (kogaki#160 finding 4).
if (receiptMode && questionList.length !== framings.length) {
  console.error(
    `refusing to emit a receipt with ${questionList.length} --question for ` +
      `${framings.length} framing(s): the \`query:\` line is THE QUESTION, ` +
      "VERBATIM (the consultation map's Miss-postmortem field), and one question per call is " +
      "what binds it to the call whose request_id and outcome the receipt " +
      "carries. Pass one --question per --args, in the same order. Before " +
      "this argument existed the transport recorded the --args JSON for any " +
      "tool but `policy_lookup`, which is a serialized tool argument and not " +
      "a question anyone can reuse (kogaki#160 finding 4).",
  );
  process.exit(2);
}
// A disagreement is refused, never reconciled: one of the two is not what ran.
for (const [i, f] of framings.entries()) {
  const embedded = f.args?.question;
  if (
    receiptMode &&
    typeof embedded === "string" &&
    embedded.trim() &&
    embedded.trim() !== String(f.question).trim()
  ) {
    console.error(
      `framing ${i + 1}: --question disagrees with the framing's own ` +
        `\`question\` argument.\n  --args: ${embedded.trim()}\n  ` +
        `--question: ${String(f.question).trim()}\n` +
        "One of these is not what ran. The transport asserts only what it " +
        "observed and does not choose between them.",
    );
    process.exit(2);
  }
}
if (!existsSync(gateway)) unavailable(`gateway not found at ${gateway}`);

const proc = spawn("node", [gateway, "--consumer", consumer], {
  stdio: ["pipe", "pipe", "pipe"],
});
proc.on("error", (e) => unavailable(String(e.message ?? e)));

const timer = setTimeout(() => {
  proc.kill();
  unavailable("timeout after 15s");
}, 15_000);

let buf = "";
const pending = new Map();
proc.stdout.on("data", (d) => {
  buf += d;
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl);
    buf = buf.slice(nl + 1);
    if (!line.trim()) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.id !== undefined && pending.has(msg.id)) pending.get(msg.id)(msg);
  }
});

function rpc(id, method, params) {
  return new Promise((resolve) => {
    pending.set(id, resolve);
    proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

// --- receipt composition (kogaki#66, story 1.20) ----------------------------
//
// Every function below reads the served response and NOTHING else. The one
// place a value could be invented is the `outcome` token, and it is not
// composed here at all — it arrives on the command line or the run refused
// before the gateway was reached.

// The question THIS CALL asked, as the caller stated it. Read off the framing
// record — the same object that carries the args that were sent — so the
// question and the call are one value and not two lists that could be zipped
// wrongly. `policy_lookup`'s embedded `question` argument is accepted as the
// question when `--question` repeats it (they are checked for agreement at the
// usage site above); every other tool has no question in its arguments at all,
// which is the gap `--question` exists to fill.
//
// NO FALLBACK TO THE ARGS JSON. That fallback is the defect: it produced a
// well-formed receipt whose `query:` line was `{"tag":"lessons/testing"}` —
// a transport fact recorded honestly in a field reserved for a question, so
// nothing on the path could tell a reader what was actually asked.
function framingText({ question, args }, i) {
  const q = typeof question === "string" && question.trim()
    ? question.trim()
    : typeof args?.question === "string" && args.question.trim()
      ? args.question.trim()
      : null;
  if (q === null)
    throw new Error(
      `framing ${i + 1} carries no --question; the \`query:\` line is the ` +
        "question verbatim and the transport does not derive one from --args",
    );
  return q;
}

// A served `consulted:` line is `consulted: <repo>@<sha> <file:spec[, file:spec…]>`.
// Groups are separated by comma-space, specs inside a group by bare commas —
// the gateway's own rendering, which is why line one is copied rather than
// rebuilt whenever there is only one framing to copy.
function splitServedPin(line, pin) {
  const prefix = `consulted: ${pin} `;
  return line.startsWith(prefix) ? line.slice(prefix.length).trim() : null;
}

// Merge several framings' file lists under one pin, preserving first-seen
// order for both files and their line specs. Union, never re-derivation: every
// entry here came off a served line.
function mergeTails(tails) {
  const byFile = new Map();
  for (const tail of tails) {
    for (const group of tail.split(/,\s+/)) {
      const i = group.indexOf(":");
      if (i < 0) continue;
      const file = group.slice(0, i);
      const specs = group.slice(i + 1).split(",").filter(Boolean);
      const seen = byFile.get(file) ?? [];
      for (const s of specs) if (!seen.includes(s)) seen.push(s);
      byFile.set(file, seen);
    }
  }
  return [...byFile].map(([f, s]) => `${f}:${s.join(",")}`).join(", ");
}

// THE ANSWER EVIDENCES THE ADDRESS THE FRAMING SENT, or the receipt refuses
// (kogaki#181; specs/SPEC.md §4 condition 5). Throws with the reason; the two
// limbs are (a) the address FORM against the served schema and (b) the address
// ECHO where the gateway serves one. Reads `declared` — the served
// `tools/list` properties for THIS framing's tool, observed on this same wire
// and carried on the framing's own record, so a schema and a call cannot drift
// apart any more than a question and a call can.
// (a) THE FORM, alone. Split out of `assertAddressEvidenced` at kogaki#368 so
// that the check can run BEFORE the calls go out and on EVERY path, not only
// where a receipt is composed. It is one function with two call sites, never
// two implementations: a second copy of this rule is the very defect the rule
// catches, one level up.
//
// It needs no response, which is what makes the earlier call site possible —
// the form of an address is decidable from the address and the served
// catalogue alone.
function assertAddressForm({ framing, declared, catalogue }, i) {
  const sent = framing.args ?? {};
  const keys = Object.keys(sent);

  // An undeclared key is the whole shipped defect. What the
  // GATEWAY does with one changed at tsurezure-gateway#88 — it dropped the key
  // and answered the broader call before, and refuses it after — which is
  // exactly why this refusal is stated on client-side ground and asserts
  // nothing about the server (kogaki#328).
  // Two DIFFERENT causes reach this refusal and the message names which:
  // the served catalogue was unreadable (the substrate failing), or it was
  // read and does not carry this tool (the framing addressing a tool that is
  // not served). Both are refusals — the transport cannot stand behind either
  // — but they route to different repairs, so they are not collapsed. A
  // `tools/list` that returns an rpc error never reaches here at all: it is
  // routed to the exit-11 degrade at the wire, like every other rpc error.
  if (!(declared instanceof Set))
    throw new Error(
      `framing ${i + 1} was not checked against \`${framing.tool}\`'s served ` +
        "argument schema, so the transport cannot establish that this " +
        "response answers the address it sent — " +
        (catalogue instanceof Map
          ? `the gateway's served catalogue does not carry \`${framing.tool}\` ` +
            `(it serves ${[...catalogue.keys()].map((k) => `\`${k}\``).join(", ") || "nothing"})`
          : "the gateway served no readable tool catalogue"),
    );
  const undeclared = keys.filter((k) => !declared.has(k));
  if (undeclared.length)
    throw new Error(
      `framing ${i + 1} addressed \`${framing.tool}\` with ` +
        `${undeclared.map((k) => `\`${k}\``).join(", ")}, which the served tool ` +
        "does not declare (it declares " +
        `${[...declared].map((k) => `\`${k}\``).join(", ") || "no arguments"}). ` +
        "The transport cannot stand behind a key the served tool does not " +
        "declare, so this framing is refused here rather than sent",
    );
}

// THE ANSWER EVIDENCES THE ADDRESS THE FRAMING SENT. Limb (a) is
// `assertAddressForm` above, called here so the receipt path's own refusals
// and messages are exactly what they were; limb (b) needs the response and so
// stays here.
function assertAddressEvidenced({ framing, declared, catalogue }, d, i) {
  const sent = framing.args ?? {};
  const keys = Object.keys(sent);
  assertAddressForm({ framing, declared, catalogue }, i);

  // (b) THE ECHO. Required to agree WHEREVER it is served, and never invented
  // where it is not. This used to return early on `d.miss !== true`, because
  // the gateway echoed the address only on the miss path and the hit path's
  // silence was the half routed upstream (kogaki#181 → tsurezure-gateway#85).
  // tsurezure-gateway#88 puts `tool` and `request` on EVERY envelope, so the
  // half that was routed upstream has come back — and the check that was
  // waiting for it is this one.
  //
  // THE VERSION GUARD IS THE PRESENCE TEST, NOT A VERSION READ. The two
  // conditions below already fire only when their field is present and
  // well-typed, so against an older gateway — which serves neither field on a
  // hit — this block does nothing and says nothing, which is the shipped rule:
  // absent fields stay silent, never guessed at. The served catalogue does not
  // carry the gateway's version, so a version comparison is not available to
  // ask for and is not what makes this safe.
  if (typeof d.tool === "string" && d.tool !== framing.tool)
    throw new Error(
      `framing ${i + 1} addressed \`${framing.tool}\` and the served response ` +
        `answers \`${d.tool}\``,
    );
  if (d.request && typeof d.request === "object")
    for (const k of keys)
      if (JSON.stringify(d.request[k]) !== JSON.stringify(sent[k]))
        throw new Error(
          `framing ${i + 1} sent \`${k}\`=${JSON.stringify(sent[k])} and the ` +
            `served response answers \`${k}\`=${JSON.stringify(d.request[k])}`,
        );
}

// Returns the receipt block, or throws with the reason it is not composable.
// The throw is the point: a receipt the transport cannot stand behind is worse
// than none, because the marked-exception path exists for exactly that case.
// The OWNER register: Question and Answer, readable, and NO address.
//
// §8.1 fixes the three parts and assigns exactly two of them here — the
// Conclusion is the agent's, because only the agent holds it, so this composer
// deliberately stops short rather than inventing one. §8.3's pin-token rule
// binds this function's own output: no `consulted:`, no `request_id:`, no
// `@<sha>`. The address is not withheld from the owner out of tidiness; it is
// carried by the RECEIPT, whose destinations §8 leaves untouched.
//
// Bounded rather than complete. A served answer can run to tens of thousands of
// characters, and an owner rendering nobody finishes reading grounds nothing —
// so this takes the first few lines and says how many it did not show. The
// count is the denominator discipline §3.1 already binds the digest to, applied
// to this surface: a truncated answer that does not say it was truncated is the
// same silence one register over.
export function composeOwnerRender(observed, { maxLines = 3, maxChars = 400 } = {}) {
  const out = [];
  for (const [i, o] of observed.entries()) {
    let d;
    try {
      d = JSON.parse(o.text);
    } catch {
      // No answer was readable, and saying so beats rendering nothing: an
      // absent section and an unreadable one are different facts.
      out.push(`Question: ${framingText(o.framing, i)}`, "Answer: (the served response could not be read)", "");
      continue;
    }
    const lines = [];
    const walk = (n) => {
      if (Array.isArray(n)) return n.forEach(walk);
      if (n && typeof n === "object") {
        if (typeof n.text === "string" && typeof n.cite === "string") lines.push(n.text);
        Object.values(n).forEach(walk);
      }
    };
    walk(d);
    out.push(`Question: ${framingText(o.framing, i)}`);
    if (!lines.length) {
      out.push(`Answer: nothing matched — the surface was read and returned no line (miss: ${d.miss === true}).`);
    } else {
      for (const raw of lines.slice(0, maxLines)) {
        const one = String(raw).replace(/\s+/g, " ").trim().replace(/^-\s+/, "");
        out.push(`Answer: ${one.length > maxChars ? `${one.slice(0, maxChars)}…` : one}`);
      }
      if (lines.length > maxLines) {
        out.push(`        (${lines.length - maxLines} further line(s) not shown of ${lines.length}; the receipt carries the addresses)`);
      }
    }
    out.push("");
  }
  out.push("Conclusion: <the reading this session draws from the above — composed by the agent, never by the kit>");
  return out.join("\n");
}

function composeReceipt(observed, outcomeToken, dispositionToken) {
  const parsed = observed.map(({ text }, i) => {
    let d;
    try {
      d = JSON.parse(text);
    } catch {
      throw new Error(`framing ${i + 1} did not return a JSON response`);
    }
    if (!d?.request_id) throw new Error(`framing ${i + 1} carried no request_id`);
    if (typeof d?.consulted !== "string" || !d.consulted.startsWith("consulted: "))
      throw new Error(`framing ${i + 1} carried no served \`consulted:\` line`);
    if (typeof d?.pin !== "string") throw new Error(`framing ${i + 1} carried no pin`);
    return d;
  });
  // Per-framing, like the parse checks above and for the same reason: an
  // answer to another call is not repaired by anything the other framings say.
  for (const [i, o] of observed.entries()) assertAddressEvidenced(o, parsed[i], i);
  const pin = parsed[0].pin;
  if (parsed.some((d) => d.pin !== pin))
    throw new Error(
      "framings resolved against different substrate commits " +
        `(${[...new Set(parsed.map((d) => d.pin))].join(" vs ")}); ` +
        "one receipt carries one pin",
    );
  const queries = observed.map((o, i) => {
    const q = framingText(o.framing, i);
    if (q.includes("\n"))
      throw new Error(`framing ${i + 1} spans several lines; \`query:\` is one line`);
    return q;
  });
  // Line one: the gateway's own rendering when there is exactly one framing,
  // its union when there are several.
  let lineOne;
  if (parsed.length === 1) {
    lineOne = parsed[0].consulted;
  } else {
    const tails = parsed.map((d, i) => {
      const t = splitServedPin(d.consulted, pin);
      if (t === null) throw new Error(`framing ${i + 1}'s served line does not carry its own pin`);
      return t;
    });
    lineOne = `consulted: ${pin} ${mergeTails(tails)}`;
  }
  // ONE request_id, and it is the LAST framing's — the answer the outcome is a
  // reading of. Stated rather than left to the reader: a re-framed consult is
  // several gateway calls and the v2 grammar carries one id, so which one is a
  // choice, and the honest one is the call the recorded outcome refers to. The
  // earlier framings stay auditable through their own `query:` lines.
  //
  // WHICH CALL'S ID AND QUESTION TRAVEL TOGETHER, stated because leaving it
  // implicit is what shipped a wrong receipt: `parsed[i]` and `queries[i]` are
  // both read off `observed[i]`, so the LAST `query:` line is the question
  // asked of the call whose `request_id` is emitted, and every earlier
  // `query:` line names an earlier call in the order they ran. A caller
  // recomposing a receipt by hand can pair an id with another framing's
  // question; this composer cannot, because it never holds them apart.
  const requestId = parsed[parsed.length - 1].request_id;
  return [
    // The marked-exception axis (specs/SPEC.md §4 condition 2). A fixed,
    // greppable, UNINDENTED key, so the rate of hand-composed receipts is a
    // count rather than an inference. Unindented is load-bearing, not style:
    // `checks/check-consult-receipts.sh`'s continuation regex recognises only
    // request_id/outcome/query, and an unrecognised INDENTED key placed above
    // them ends the continuation scan — the receipt then parses as a v1 line
    // with every field silently dropped, and passes. Measured on the shipped
    // checker, story 1.20; this is the story's open question, closed.
    "consult-receipt: tool-emitted",
    lineOne,
    `  request_id: ${requestId}`,
    `  outcome: ${outcomeToken}`,
    // The second axis, beside the first and ABOVE the variable-length query
    // tail, so the two readings are read together and the block's shape stays
    // fixed-then-repeating (kogaki#268). Emitted only when the caller supplied
    // it: a non-gate consult's block is byte-for-byte what it was before, which
    // is what makes every receipt already in history and every fixture over
    // this composer unaffected. `checks/check-consult-receipts.sh` recognises
    // `disposition` as a continuation key — that is a REQUIREMENT and not a
    // convenience, because an unrecognised indented key here ends the
    // continuation scan and silently drops every field below it.
    ...(dispositionToken === undefined ? [] : [`  disposition: ${dispositionToken}`]),
    ...queries.map((q) => `  query: ${q}`),
  ].join("\n");
}

// --- fixture pass -----------------------------------------------------------
// Discrimination evidence for the composition, over synthetic responses shaped
// like the gateway's own. Each case fails a composer that lacks the clause it
// names — the same standard `checks/check-consult-receipts.sh`'s embedded
// fixtures are held to. What it deliberately does NOT cover: the wire itself
// (spawn, rpc, degradation), which needs a live gateway and is exercised by
// `policy/kit/test/install-test.sh` cases 3, 7 and 8 instead.
function selfTest() {
  const PIN = "product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74";
  const served = (id, tail) => JSON.stringify({
    pin: PIN, request_id: id, consulted: `consulted: ${PIN} ${tail}`, lines: [],
  });
  // The served `tools/list` properties, as the gateway declares them at
  // product-lab@98195e0a — carried on every record because kogaki#181 makes an
  // unchecked address form a refusal rather than a pass.
  const LOOKUP = new Set(["question", "topic_hints"]);
  const GLOSS = new Set(["tag"]);
  const framing = (q) => ({
    raw: JSON.stringify({ question: q }), args: { question: q }, question: q,
    tool: "policy_lookup",
  });
  const one = [{ framing: framing("first framing"), text: served("id-1", "LESSONS.md:31"), declared: LOOKUP }];
  const two = [
    one[0],
    { framing: framing("second framing, another axis"), text: served("id-2", "LESSONS.md:40, topics/x.md:9"),
      declared: LOOKUP },
  ];
  const compose = (obs, tok, disp) => {
    try {
      return composeReceipt(obs, tok, disp);
    } catch (e) {
      return `THREW: ${e.message}`;
    }
  };
  const cases = [
    // AC 1 — the complete block, with line one copied whole from the server.
    ["single framing copies the served line one verbatim",
     () => compose(one, "discriminating").split("\n")[1] === `consulted: ${PIN} LESSONS.md:31`],
    ["the block leads with the fixed unindented marker",
     () => compose(one, "discriminating").split("\n")[0] === "consult-receipt: tool-emitted"],
    ["continuation lines are indented, in SPEC §4 order",
     () => compose(one, "discriminating").split("\n").slice(2).join("|") ===
       "  request_id: id-1|  outcome: discriminating|  query: first framing"],
    // AC 2 — every framing gets its own query line, not the last one only.
    ["two framings emit TWO query lines, verbatim as sent",
     () => compose(two, "uncovered-after-2-framings").split("\n").filter((l) => l.startsWith("  query: ")).join("|") ===
       "  query: first framing|  query: second framing, another axis"],
    ["two framings merge their served pins under one line one",
     () => compose(two, "uncovered-after-2-framings").split("\n")[1] ===
       `consulted: ${PIN} LESSONS.md:31,40, topics/x.md:9`],
    ["the request_id is the LAST framing's — the answer the outcome reads",
     () => compose(two, "uncovered-after-2-framings").includes("  request_id: id-2")],
    // AC 4 — the token is carried, never chosen.
    ["the outcome token is passed through untouched",
     () => compose(one, "covered-after-reframing").includes("  outcome: covered-after-reframing")],
    // --- kogaki#268: the gate half is CARRIED on its own key, never judged ---
    ["the disposition sits between the outcome and the query tail",
     () => compose(one, "discriminating", "auto-resolved-FYI").split("\n").slice(2).join("|") ===
       "  request_id: id-1|  outcome: discriminating|  disposition: auto-resolved-FYI|" +
       "  query: first framing"],
    ["an omitted disposition composes the pre-#268 block byte-for-byte",
     () => compose(one, "discriminating") === compose(one, "discriminating", undefined) &&
       !compose(one, "discriminating").includes("disposition")],
    ["the disposition is carried untouched, exactly as the outcome token is — the transport judges neither",
     () => compose(two, "uncovered-after-2-framings", "escalated").includes("  disposition: escalated")],
    ["every query line still follows the disposition — the tail is not truncated by the new key",
     () => compose(two, "uncovered-after-2-framings", "escalated").split("\n")
       .filter((l) => l.startsWith("  query: ")).length === 2],
    // Refusals: a receipt the transport cannot stand behind is never emitted.
    ["a non-JSON response refuses rather than composing",
     () => compose([{ framing: framing("q"), text: "not json" }], "discriminating")
       .startsWith("THREW: framing 1 did not return a JSON response")],
    ["a response without request_id refuses",
     () => compose([{ framing: framing("q"), text: JSON.stringify({ pin: PIN, consulted: `consulted: ${PIN} a.md:1` }) }],
       "discriminating").startsWith("THREW: framing 1 carried no request_id")],
    ["a response without a served `consulted:` line refuses",
     () => compose([{ framing: framing("q"), text: JSON.stringify({ pin: PIN, request_id: "r" }) }],
       "discriminating").startsWith("THREW: framing 1 carried no served")],
    ["framings resolved against different commits refuse — one receipt, one pin",
     () => compose([one[0], { framing: framing("q2"), declared: LOOKUP,
       text: JSON.stringify({ pin: "product-lab@0000000", request_id: "r", consulted: "consulted: product-lab@0000000 a.md:1" }) }],
       "uncovered-after-2-framings").startsWith("THREW: framings resolved against different substrate commits")],
    ["a multi-line framing refuses — `query:` is one line",
     () => compose([{ framing: framing("line one\nline two"), text: served("r", "a.md:1"), declared: LOOKUP }], "discriminating")
       .startsWith("THREW: framing 1 spans several lines")],
    // --- kogaki#160 finding 4: the question travels with the call ------------
    // The regression pin, inverted. This exact emission is what shipped:
    // a `gloss_index` consult whose `query:` line was its serialized --args.
    // It must now REFUSE rather than compose, because a receipt recording a
    // tool argument in the question field is self-consistent on its face and
    // tells a reader nothing about what was asked.
    ["a tool with no `question` argument and no --question REFUSES, never records the args",
     () => { const r = compose([{ framing: { raw: '{"tag":"lessons/testing"}', args: { tag: "lessons/testing" },
               tool: "gloss_index" }, declared: GLOSS,
               text: served("r", "gloss/lessons/testing.md:1-157") }], "discriminating");
             return r.startsWith("THREW: framing 1 carries no --question") &&
               !r.includes('{"tag":"lessons/testing"}'); }],
    ["a non-policy_lookup framing WITH --question records the question, not the args",
     () => compose([{ framing: { raw: '{"tag":"lessons/testing"}', args: { tag: "lessons/testing" },
         tool: "gloss_index",
         question: "does a served line discriminate how a check-suite member is admitted?" },
       declared: GLOSS,
       text: served("r", "gloss/lessons/testing.md:1-157") }], "discriminating")
       .includes("  query: does a served line discriminate how a check-suite member is admitted?")],
    // The BINDING property, and the one the three shipped failures turned on:
    // the emitted request_id and the LAST query line are the same call's.
    ["the carried request_id and the LAST query line come from the same call",
     () => { const b = compose(two, "uncovered-after-2-framings").split("\n");
             return b.includes("  request_id: id-2") &&
               b[b.length - 1] === "  query: second framing, another axis"; }],
    ["--question overrides nothing it disagrees with: it is read off the framing that ran",
     () => { const obs = [
               { framing: { raw: "{}", args: {}, question: "call one's question", tool: "policy_lookup" },
                 declared: LOOKUP, text: served("id-A", "a.md:1") },
               { framing: { raw: "{}", args: {}, question: "call two's question", tool: "policy_lookup" },
                 declared: LOOKUP, text: served("id-B", "a.md:2") }];
             const b = compose(obs, "uncovered-after-2-framings");
             return b.includes("  request_id: id-B") &&
               b.indexOf("  query: call one's question") < b.indexOf("  query: call two's question"); }],

    // --- kogaki#181: the ANSWER must evidence the ADDRESS the framing sent ---
    // The regression pin for the four receipts of PR #170's lane. Measured
    // against the served schemas at product-lab@98195e0a: `gloss_index`
    // declares `tag` and nothing else, so a framing sending `tags` is refused
    // HERE, before it is sent, and never composed into a receipt.
    //
    // THE REFUSAL IS CLIENT-SIDE AND ALWAYS WAS; only the explanation moved
    // (kogaki#328). This fixture used to assert the word DROPPED, which named
    // what the SERVER did with an undeclared key — true until
    // tsurezure-gateway#88, which refuses it instead. The kit cannot read the
    // gateway's version from the served catalogue, so it now asserts the
    // ground the transport can stand behind whatever version answers.
    ["an UNDECLARED address key REFUSES, on the ground the transport can stand behind",
     () => { const r = compose([{ framing: { raw: '{"tags":"lessons/testing"}',
               args: { tags: "lessons/testing" }, tool: "gloss_index", question: "a question" },
               declared: GLOSS, text: served("r", "gloss/INDEX.md:3-189") }], "discriminating");
             return r.startsWith("THREW: framing 1 addressed `gloss_index` with `tags`") &&
               r.includes("does not declare") &&
               r.includes("cannot stand behind") && !r.includes("DROPPED"); }],
    ["the same address DECLARED composes — the check bounds the form, it does not forbid the tool",
     () => compose([{ framing: { raw: '{"tag":"lessons/testing"}', args: { tag: "lessons/testing" },
         tool: "gloss_index", question: "a question" }, declared: GLOSS,
       text: served("r", "gloss/lessons/testing.md:1-157") }], "discriminating")
       .includes("  query: a question")],
    ["unobserved served schemas REFUSE rather than assuming the address landed",
     () => compose([{ framing: { raw: "{}", args: {}, tool: "gloss_index", question: "q" },
       text: served("r", "gloss/INDEX.md:3") }], "discriminating")
       .startsWith("THREW: framing 1 was not checked against `gloss_index`'s served argument schema")],
    // The two causes of that refusal route to different repairs, so the
    // message discriminates them rather than naming one for both.
    ["an unreadable catalogue and an unserved TOOL are told apart in the refusal",
     () => { const noCatalogue = compose([{ framing: { raw: "{}", args: {}, tool: "gloss_index", question: "q" },
               text: served("r", "a.md:1") }], "discriminating");
             const notServed = compose([{ framing: { raw: "{}", args: {}, tool: "no_such_tool", question: "q" },
               catalogue: new Map([["gloss_index", GLOSS]]), text: served("r", "a.md:1") }], "discriminating");
             return noCatalogue.includes("the gateway served no readable tool catalogue") &&
               notServed.includes("does not carry `no_such_tool`") &&
               notServed.includes("it serves `gloss_index`"); }],
    // The ECHO limb. A miss is the one path the gateway names its own address
    // on, and a miss is a legitimate answer — so it composes when it agrees and
    // refuses when it does not.
    ["a MISS echoing the address sent composes — a miss is an answer, not a defect",
     () => compose([{ framing: { raw: '{"tag":"zzz/nope"}', args: { tag: "zzz/nope" },
         tool: "gloss_index", question: "q" }, declared: GLOSS,
       text: JSON.stringify({ miss: true, tool: "gloss_index", request: { tag: "zzz/nope" },
         pin: PIN, request_id: "r", consulted: `consulted: ${PIN} miss` }) }], "discriminating")
       .includes("  request_id: r")],
    ["a MISS whose echoed request contradicts the address sent REFUSES",
     () => compose([{ framing: { raw: '{"tag":"lessons/testing"}', args: { tag: "lessons/testing" },
         tool: "gloss_index", question: "q" }, declared: GLOSS,
       text: JSON.stringify({ miss: true, tool: "gloss_index", request: { tag: "something/else" },
         pin: PIN, request_id: "r", consulted: `consulted: ${PIN} miss` }) }], "discriminating")
       .startsWith('THREW: framing 1 sent `tag`="lessons/testing" and the served response answers')],
    ["a MISS echoing a DIFFERENT TOOL REFUSES",
     () => compose([{ framing: { raw: "{}", args: {}, tool: "gloss_index", question: "q" }, declared: GLOSS,
       text: JSON.stringify({ miss: true, tool: "lessons_index", pin: PIN, request_id: "r",
         consulted: `consulted: ${PIN} miss` }) }], "discriminating")
       .startsWith("THREW: framing 1 addressed `gloss_index` and the served response answers `lessons_index`")],
    ["the echo compares only the keys the framing SENT — a normalized null the gateway adds is not a contradiction",
     () => compose([{ framing: { raw: '{"kind":"zzz"}', args: { kind: "zzz" },
         tool: "element_survey", question: "q" }, declared: new Set(["kind", "tag"]),
       text: JSON.stringify({ miss: true, tool: "element_survey", request: { kind: "zzz", tag: null },
         pin: PIN, request_id: "r", consulted: `consulted: ${PIN} miss` }) }], "discriminating")
       .includes("  request_id: r")],
    // THE BOUNDARY, pinned so it is not mistaken for an oversight. A HIT
    // carries no echo at all, and the transport does NOT re-derive one from the
    // served path — that is the half routed to the gateway repository.
    ["a HIT carries no echo and is not required to invent one — the undecidable half is silent, not guessed",
     () => compose([{ framing: { raw: '{"tag":"lessons/testing"}', args: { tag: "lessons/testing" },
         tool: "gloss_index", question: "q" }, declared: GLOSS,
       text: served("r", "gloss/INDEX.md:3-189") }], "discriminating").includes("  query: q")],
    // --- kogaki#328: tsurezure-gateway#88 echoes the address on EVERY envelope,
    // so the agreement the miss path has always been held to now binds hits.
    // The case above stays and is the version guard: a gateway that serves no
    // echo on a hit is still admitted, because the presence tests fire only on
    // a field that is there. These two are the same property on the other side.
    ["a HIT echoing the address sent composes — the gw#88 echo agrees",
     () => compose([{ framing: { raw: '{"tag":"lessons/testing"}', args: { tag: "lessons/testing" },
         tool: "gloss_index", question: "q" }, declared: GLOSS,
       text: JSON.stringify({ pin: PIN, request_id: "r", tool: "gloss_index",
         request: { tag: "lessons/testing" },
         consulted: `consulted: ${PIN} gloss/lessons/testing.md:1-157`, lines: [] }) }],
       "discriminating").includes("  query: q")],
    ["a HIT whose echoed request contradicts the address sent REFUSES",
     () => compose([{ framing: { raw: '{"tag":"lessons/testing"}', args: { tag: "lessons/testing" },
         tool: "gloss_index", question: "q" }, declared: GLOSS,
       text: JSON.stringify({ pin: PIN, request_id: "r", tool: "gloss_index",
         request: { tag: "lessons/SOMETHING-ELSE" },
         consulted: `consulted: ${PIN} gloss/lessons/testing.md:1-157`, lines: [] }) }],
       "discriminating").startsWith("THREW: framing 1 sent `tag`")],
    ["a HIT echoing a DIFFERENT TOOL REFUSES",
     () => compose([{ framing: { raw: '{"tag":"lessons/testing"}', args: { tag: "lessons/testing" },
         tool: "gloss_index", question: "q" }, declared: GLOSS,
       text: JSON.stringify({ pin: PIN, request_id: "r", tool: "policy_lookup",
         request: { tag: "lessons/testing" },
         consulted: `consulted: ${PIN} gloss/lessons/testing.md:1-157`, lines: [] }) }],
       "discriminating").startsWith("THREW: framing 1 addressed `gloss_index` and the served response answers `policy_lookup`")],
  ];
  const failures = cases.filter(([, f]) => f() !== true).map(([n]) => n);
  if (failures.length) {
    console.log("FAIL receipt composition fixtures:");
    for (const f of failures) console.log(`  ${f}`);
    process.exit(1);
  }
  console.log(`fixture pass: ${cases.length}/${cases.length} receipt-composition cases ` +
    "(line one copied from the server; one query line per framing; pins merged " +
    "under one commit; the outcome token carried, never chosen; the question " +
    "bound to the call whose request_id is emitted; the ANSWER bound to the " +
    "ADDRESS — an undeclared key and a contradicting served echo both refuse " +
    "ON EITHER PATH since tsurezure-gateway#88 (kogaki#328), while an ABSENT " +
    "echo is still left undecided rather than re-derived, which is what keeps " +
    "an older gateway admitted; " +
    "the gate disposition carried on its own key above the query tail and " +
    "absent from a non-gate block; ten refusals)");

  // THE OWNER REGISTER (kogaki#320, story 1.50). Sited with the composer it
  // covers, and gateway-free like every case above: the properties are pure
  // functions of a served response. `check-owner-surface-pins.sh` invokes this
  // pass rather than re-asserting them, the same arrangement
  // `check-client-kit-install.sh` uses for the kit's own test.
  const ownerObserved = [{
    framing: { question: "a question the owner asked", args: {} },
    text: JSON.stringify({
      miss: false,
      pin: "hub@abc1234",
      request_id: "11111111-2222-3333-4444-555555555555",
      consulted: "consulted: hub@abc1234 FILE.md:1",
      lines: [
        { cite: "FILE.md:1@abc1234", text: "- a served line, wrapped\n  across two" },
        { cite: "FILE.md:2@abc1234", text: "a second served line" },
        { cite: "FILE.md:3@abc1234", text: "a third" },
        { cite: "FILE.md:4@abc1234", text: "a fourth, beyond the bound" },
      ],
    }),
  }];
  const owner = composeOwnerRender(ownerObserved);
  const ownerFail = [];
  // §8.1 — the pin is machine-facing. Asserted on the EMITTED TEXT, because
  // the whole claim of this register is about what reaches a screen.
  for (const tok of ["consulted:", "request_id:", "@abc1234", "hub@"]) {
    if (owner.includes(tok)) ownerFail.push(`owner render emitted the pin-shaped token ${tok}`);
  }
  // …and the converse, so it cannot pass by rendering nothing: an empty block
  // satisfies every deny above and serves the owner less than the pin block it
  // replaced. One direction alone is the fixture blind spot PR #332 round 2
  // was earned by.
  if (!owner.includes("Question: a question the owner asked")) ownerFail.push("no Question line");
  if (!owner.includes("Answer: a served line, wrapped across two")) ownerFail.push("a wrapped served line was not flattened into a readable Answer");
  if (!/^Conclusion: /m.test(owner)) ownerFail.push("no Conclusion slot for the agent");
  if (/^Conclusion: \S.*[a-z]{4}/m.test(owner) && !owner.includes("composed by the agent")) {
    ownerFail.push("the kit composed a Conclusion, which §8.1 assigns to the agent");
  }
  // Bounded, and the truncation announces itself — the denominator discipline
  // §3.1 binds the digest to, applied to this surface.
  if (!owner.includes("(1 further line(s) not shown of 4")) ownerFail.push("a truncated answer did not state what it withheld");
  // A response that cannot be read renders as that, never as an empty answer.
  const unreadable = composeOwnerRender([{ framing: { question: "q", args: {} }, text: "not json" }]);
  if (!unreadable.includes("could not be read")) ownerFail.push("an unreadable response did not say so");
  // A genuine miss is a miss, not an unreadable one — both directions again.
  const missed = composeOwnerRender([{ framing: { question: "q", args: {} }, text: JSON.stringify({ miss: true, lines: [] }) }]);
  if (!missed.includes("nothing matched")) ownerFail.push("a genuine miss did not render as a miss");
  if (missed.includes("could not be read")) ownerFail.push("a genuine miss rendered as an unreadable response");
  if (ownerFail.length) {
    console.log("FAIL owner-register fixtures:");
    for (const f of ownerFail) console.log(`  ${f}`);
    process.exit(1);
  }
  console.log("fixture pass: 10/10 owner-register cases (no pin token on the owner surface; " +
    "Question present; a wrapped served line flattened readable; the Conclusion left to the agent; " +
    "truncation states its denominator; unreadable and genuine-miss render DIFFERENTLY, both directions)");
  process.exit(0);
}

try {
  await rpc(1, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "tsurezure-client-kit", version: "0.1.0" },
  });
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n");
  // Results are BUFFERED, never streamed, so a run that degrades on framing 2
  // still prints exactly one `policy_source unavailable:` line and nothing
  // else — the one-line contract is over the whole invocation, not per call.
  // THE SERVED ADDRESS FORMS, read off the SAME wire as the calls (kogaki#181).
  //
  // REQUESTED ON EVERY PATH (kogaki#368). This was scoped to receipt mode on
  // the ground that "a non-receipt run asserts nothing", and that ground was
  // false in a way nothing could see: a non-receipt run asserts nothing about
  // a RECEIPT, while its caller composes artifacts from what it returns.
  // `terrain survey` sent `{kinds: [...]}` against a tool declaring `kind`,
  // received the miss shape, and wrote a survey with zero candidates at exit
  // zero — schema-conformant, and indistinguishable from a corpus that has
  // nothing. The guard that catches exactly this existed and was installed on
  // the one path that did not need it most.
  //
  // A gateway that lists no tools leaves `declared` undefined, and the form
  // check refuses on that rather than assuming the address landed.
  //
  // COST, stated because the earlier scoping was partly a cost decision: one
  // extra `tools/list` round trip per invocation on the non-receipt path.
  let declaredByTool = null;
  {
    timer.refresh();
    const listed = await rpc(2, "tools/list", {});
    // Routed exactly as the tools/call loop below routes its own rpc errors:
    // a gateway that cannot be conversed with is a DEGRADE (exit 11), never a
    // receipt refusal. Only a well-formed catalogue reaches the composer.
    // AN ERRORING `tools/list` DEGRADES ONLY THE RECEIPT PATH. Before this
    // change the query path never asked, so turning its error into an exit-11
    // degrade would stop calls that used to work — the same
    // enhancer-becomes-dependency polarity the no-catalogue branch below is
    // shaped to avoid, reached one step earlier. On the receipt path it stays
    // a degrade: a receipt cannot be stood behind without the catalogue.
    if (listed.error) {
      if (receiptMode) unavailable(`rpc error: ${listed.error.message ?? "unknown"}`);
    } else
    if (Array.isArray(listed.result?.tools))
      declaredByTool = new Map(
        listed.result.tools.map((t) => [
          t.name,
          new Set(Object.keys(t.inputSchema?.properties ?? {})),
        ]),
      );
  }
  // THE FORM IS CHECKED BEFORE ANYTHING IS SENT (kogaki#368). The refusal
  // message always said "refused here rather than sent" and, running inside
  // `composeReceipt`, that was not so — the calls had already gone out. It is
  // true now, and it is true on both paths.
  //
  // Its own exit code, because this is a CLIENT defect and not a substrate
  // failure. Exit 11 is the degrade a caller absorbs and proceeds through, and
  // absorbing this one is how the shipped defect stayed invisible; exit 13
  // makes it a hard error the caller cannot mistake for an empty corpus.
  //
  // THE TWO CAUSES SPLIT HERE, and only one of them is a refusal. The check
  // needs a catalogue; `assertAddressForm` already distinguishes "no catalogue
  // was served" from "the catalogue was read and does not declare this key",
  // and the transport must too:
  //
  //   * catalogue READ, key undeclared      -> REFUSE. A client defect.
  //   * catalogue READ, TOOL NOT IN IT      -> REFUSE. Also a client defect:
  //     MCP requires a server to list the tools it serves, so a tool absent
  //     from a catalogue that was read is a tool this gateway does not serve,
  //     and the call was never going to reach it. Named explicitly because the
  //     first version of this comment split two ways and this is a third case
  //     that lands in neither (round-1 finding on PR #372).
  //   * NO catalogue served, or `tools/list` ERRORED
  //                                        -> proceed UNCHECKED, saying so.
  //
  // The second is not softness. This kit is an ENHANCER, NEVER A DEPENDENCY,
  // and a gateway that serves no `tools/list` answered every non-receipt call
  // perfectly well before this change — refusing them, or degrading them,
  // would make a transport that used to work stop working, to enforce a check
  // it cannot perform. MCP requires `tools/list` of any server advertising
  // tools, so against a real gateway the unchecked branch is unreachable; it
  // exists for a minimal or older one.
  //
  // RESIDUE, stated rather than left to be discovered: on that branch an
  // undeclared key is still dropped and the broader artifact still served —
  // #368's defect, in the one place this repair cannot reach. It is announced
  // on stderr rather than silently, so it is observable rather than assumed;
  // it is NOT on stdout, which is the tool result the caller parses.
  // The RECEIPT path keeps refusing on both causes, unchanged: a receipt
  // asserts something and cannot be stood behind without the catalogue.
  for (const [i, framing] of framings.entries()) {
    if (!(declaredByTool instanceof Map)) {
      process.stderr.write(
        "address form unchecked: the gateway served no readable tool catalogue, " +
          "so an undeclared argument key cannot be detected on this call\n",
      );
      break;
    }
    try {
      assertAddressForm(
        { framing, declared: declaredByTool.get(framing.tool), catalogue: declaredByTool },
        i,
      );
    } catch (e) {
      // Synchronous exit, following `unavailable` rather than `writeThenExit`,
      // and for the reason stated there: this writes ONE SHORT LINE, so the
      // truncation class the deferred writer exists for does not reach it —
      // while a deferred exit here WOULD fall through into the call loop and
      // send the very framing just refused. The child is killed first: it is
      // already spawned at this point, where `unavailable`'s early callers are
      // not.
      proc.kill();
      clearTimeout(timer);
      // STDERR, not stdout. stdout is the TOOL RESULT the caller parses, and
      // Kogaki's own `gatewayQuery` redirects it to a temp file it reads only
      // on success and unlinks otherwise — so a refusal written there was
      // deleted unread and the operator saw `gateway-query failed (13):` with
      // an empty tail. The one surface that suffered the shipped defect could
      // not read its repair (round-1 finding on PR #372).
      process.stderr.write(`address refused: ${e.message}\n`);
      process.exit(13);
    }
  }

  const observed = [];
  for (const [i, framing] of framings.entries()) {
    timer.refresh();
    const res = await rpc(3 + i, "tools/call", { name: framing.tool, arguments: framing.args });
    if (res.error) unavailable(`rpc error: ${res.error.message ?? "unknown"}`);
    const text = (res.result?.content ?? []).map((c) => c.text ?? "").join("");
    if (res.result?.isError) unavailable(`tool error: ${text.slice(0, 200)}`);
    // The declared schema rides the framing's OWN record, exactly as its
    // question does — so the schema, the arguments and the response that
    // answered them are one value and cannot be zipped wrongly.
    observed.push({
      framing, text,
      declared: declaredByTool?.get(framing.tool),
      catalogue: declaredByTool,
    });
  }
  clearTimeout(timer);
  proc.kill();
  const results = observed.map((o) => o.text).join("\n");
  // writeThenExit RETURNS (it defers the exit until stdout drains), so every
  // branch below is exclusive rather than a fallthrough guarded by an early
  // return that does not exist.
  // §8.2: the kit EMITS the owner register. Appended after the results like the
  // receipt, so no existing parser moves; independent of receiptMode, so either
  // register can be taken without the other (story 1.50 AC2).
  const ownerBlock = ownerRenderMode ? `\n\n${composeOwnerRender(observed)}` : "";
  if (!receiptMode) {
    writeThenExit(`${results}${ownerBlock}`, 0);
  } else {
    let block = null;
    let why = null;
    try {
      block = composeReceipt(observed, outcome, disposition);
    } catch (e) {
      why = e.message;
    }
    if (block === null) {
      // The consult HAPPENED — its results are the caller's — but the wire did
      // not carry what a receipt asserts. Print the results, refuse the block.
      writeThenExit(`${results}${ownerBlock}\nreceipt not composable: ${why}`, 12);
    } else {
      writeThenExit(`${results}${ownerBlock}\n\n${block}`, 0);
    }
  }
} catch (e) {
  clearTimeout(timer);
  proc.kill();
  unavailable(String(e?.message ?? e));
}
