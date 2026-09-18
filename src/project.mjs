#!/usr/bin/env node
// project — Projection: theses/<slug>/draft.reviewed.md -> a platform Article
// (kogaki#1149; owner decision 2026-09-06, amended 2026-09-18).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982). See
// `src/SPEC-REFERENCES.md` for what a copy is and what the markers mean.
//
// THE BOUNDARY, in the owner's words: "Projection is a content-neutral
// transformation; editing based on reader personas or style is outside its
// boundary." This file selects and maps fields and applies only DECLARED,
// REVERSIBLE converters — it writes no prose and rewrites none. The one
// exception is `propose`, which is the sole act that asks a model for
// anything (a Title and a Description), and even there the Harness owns only
// that the two fields EXIST and FIT their caps — nothing about their content.
//
// RECOVERABILITY IS THE ACCEPTANCE INSTRUMENT (the owner's general mission for
// every transformation in this pipeline). `verify` strips the Article's
// frontmatter, reverses the profile's converters in reverse order, and must
// recover the reviewed Draft's body byte for byte. A converter this file
// cannot reverse is not admitted to a profile.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { resolve, dirname, basename, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

function fail(msg) {
  process.stderr.write(`project: ${msg}\n`);
  process.exit(1);
}

// THE PROJECT LANE'S OWN RETENTION, SELF-CONTAINED rather than routed through
// `src/runs.mjs`'s shared lane machinery. `src/runs.json` still carries the
// bound under a `project` key — the one config `runs/README.md` already
// documents every lane against — but this file reads it directly rather than
// widening `runs.mjs`'s `LANES` closed set, which this issue does not license.
// The prune-oldest-beyond-K arithmetic below is a smaller copy of
// `runs.mjs`'s `pruneWithin`/`entriesByAge`, kept local for the same reason.
const HERE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE_DIR, "..");
const PROJECT_LANE_ROOT = join(REPO, "runs", "project");
const RUNS_CONFIG = join(REPO, "src", "runs.json");

function projectKeepLast() {
  let cfg;
  try { cfg = JSON.parse(readFileSync(RUNS_CONFIG, "utf8")); }
  catch (e) { fail(`${RUNS_CONFIG} cannot be read (${e.message}) — it carries the project lane's keep-last bound`); }
  const k = cfg && cfg.lanes && cfg.lanes.project && cfg.lanes.project.keep_last;
  if (!Number.isInteger(k) || k < 1) {
    fail(`${RUNS_CONFIG} declares no positive integer \`lanes.project.keep_last\``);
  }
  return k;
}

function entriesByAge(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      let mtime = 0;
      try { mtime = statSync(join(dir, d.name)).mtimeMs; } catch { mtime = 0; }
      return { name: d.name, mtime };
    })
    .sort((a, b) => (b.mtime - a.mtime) || a.name.localeCompare(b.name));
}

// Prune the lane back to keep-last, exempting the slug this run is about to
// write, then create and return its destination — the same order `runs.mjs`'s
// `enterRun` states: pruning is the run's first act, before anything is
// written.
function enterProjectWorkspace(slug, root = PROJECT_LANE_ROOT) {
  const keep = projectKeepLast();
  const candidates = entriesByAge(root).filter((e) => e.name !== slug);
  const doomed = candidates.slice(Math.max(keep - 1, 0));
  for (const e of doomed) {
    const target = resolve(join(root, e.name));
    if (!target.startsWith(resolve(root) + sep)) continue; // never reached from readdirSync names
    rmSync(target, { recursive: true, force: true });
  }
  if (doomed.length) {
    process.stderr.write(`project: pruned ${doomed.length} run(s) beyond keep-last from ${root} `
      + `(${doomed.map((e) => e.name).join(", ")})\n`);
  }
  const dest = join(root, slug);
  mkdirSync(dest, { recursive: true });
  return dest;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function argString(args, key, usage) {
  const v = args[key];
  if (typeof v !== "string" || v === "") fail(usage);
  return v;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else { args[key] = next; i++; }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

// AN ABSENT REPLY IS THE EMPTY STRING, NEVER A BLOCKED READ — the same
// discipline `src/review-draft.mjs` states at its own `readReply`: a terminal
// leaves fd 0 open, so a two-phase act typed by hand must not wait forever on
// a reply nobody is piping.
function readReply() {
  if (process.stdin.isTTY) return "";
  try { return readFileSync(0, "utf8"); }
  catch (e) {
    if (e.code === "EOF") return "";
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Frontmatter — read as a line scan, never as general YAML, for the reason
// `src/review-draft.mjs`'s `readDraft` states: the writer here controls the
// grammar, and a general parser would be a second grammar that can disagree
// with it about what was written.

// Splits `---\n...\n---\n\n<body>` and returns the frontmatter lines (between
// the two `---` markers) and the body (everything after, minus the join's
// trailing blank line). Used for both the reviewed Draft (frontmatter
// discarded entirely — Projection carries none of the kogaki record forward)
// and the Article (frontmatter discarded to recover the body at `verify`).
function splitFrontmatter(text, path) {
  const lines = text.split("\n");
  if (lines[0] !== "---") {
    fail(`${path} opens with no frontmatter — every kogaki and Article record carries one`);
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") { end = i; break; }
  }
  if (end === -1) fail(`${path} has an unterminated frontmatter block`);
  const bodyLines = lines.slice(end + 2);
  if (bodyLines.length && bodyLines[bodyLines.length - 1] === "") bodyLines.pop();
  return { fmLines: lines.slice(1, end), body: bodyLines.join("\n") };
}

// The owner-supplied field file is FRONTMATTER ONLY (the issue's own words),
// and every value is written as JSON on its line — the same convention
// `draft.mjs` uses for `generated_by:` and `cites:` entries, chosen so a field
// file this tool writes (`propose`) and one an owner hand-edits parse under
// one grammar with no ambiguity about whether a bare word is a string.
function parseFieldFile(text, path) {
  const lines = text.split("\n");
  if (lines[0] !== "---") fail(`${path} opens with no frontmatter — it is a frontmatter-only field file`);
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") { end = i; break; }
  }
  if (end === -1) fail(`${path} has an unterminated frontmatter block`);
  const fields = {};
  for (let i = 1; i < end; i++) {
    const l = lines[i];
    if (l.trim() === "") continue;
    const m = l.match(/^([a-z_]+): (.*)$/);
    if (!m) fail(`${path}: line ${i + 1} is not \`key: <json>\` — every field file line is a `
      + `frontmatter key followed by its value AS JSON: ${JSON.stringify(l)}`);
    const [, key, raw] = m;
    let value;
    try { value = JSON.parse(raw); }
    catch (e) {
      fail(`${path}: field \`${key}\` is not readable as JSON (${e.message}) — every field file `
        + `value is written as JSON, so a bare word or an unquoted sentence is malformed here`);
    }
    fields[key] = value;
  }
  // Anything after the closing `---` is the Harness's own `## Record` — owner
  // prose never lives in this file (the issue's own "frontmatter only"), so
  // it is carried through verbatim by callers that preserve it and is never
  // read as a field.
  const recordBody = lines.slice(end + 2).join("\n").replace(/\n+$/, "");
  return { fields, recordBody };
}

function readFieldFile(path) {
  if (!existsSync(path)) return { fields: {}, recordBody: "" };
  return parseFieldFile(readFileSync(path, "utf8"), path);
}

function writeFieldFile(path, fields, order, recordBody) {
  const lines = ["---"];
  for (const key of order) {
    if (fields[key] === undefined) continue;
    lines.push(`${key}: ${JSON.stringify(fields[key])}`);
  }
  lines.push("---");
  let out = lines.join("\n") + "\n";
  if (recordBody && recordBody.trim() !== "") out += "\n" + recordBody.trim() + "\n";
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, out);
}

// ---------------------------------------------------------------------------
// The reviewed Draft — the one input that closes the refusal surface named in
// the issue: a `draft.md` is refused by name, and so is a reviewed Draft with
// no `review.md` beside it (an unreviewed Draft is not projected).
const REVIEWED_BASENAME = "draft.reviewed.md";

function readReviewedDraft(draftPath) {
  const resolved = resolve(draftPath);
  if (!existsSync(resolved)) fail(`no Draft at ${resolved}`);
  if (basename(resolved) === "draft.md") {
    fail(`${resolved} is \`draft.md\` — Projection reads only \`${REVIEWED_BASENAME}\`, ReviewDraft's `
      + "output. A CanonicalDraft that has not been through ReviewDraft is not projected.");
  }
  if (basename(resolved) !== REVIEWED_BASENAME) {
    fail(`${resolved} is not named \`${REVIEWED_BASENAME}\` — Projection reads exactly that basename, `
      + "the reviewed Draft ReviewDraft's `close` writes beside its Draft");
  }
  const dir = dirname(resolved);
  const reviewPath = join(dir, "review.md");
  if (!existsSync(reviewPath)) {
    fail(`no review.md beside ${resolved} — Projection refuses a reviewed Draft with no review record: `
      + "an unreviewed Draft is not projected");
  }
  const text = readFileSync(resolved, "utf8");
  const { body } = splitFrontmatter(text, resolved);
  return { path: resolved, dir, slug: basename(dir), body, body_sha: sha256(body) };
}

// ---------------------------------------------------------------------------
// Converters — declared per profile, each one a forward/reverse pair over the
// body text, applied only where the body carries the construct (`applies`).
// EVERY CONVERTER ADMITTED HERE IS PROVEN REVERSIBLE BY THE SELF-TEST — a
// converter that cannot be reversed is not admitted to a profile (the issue's
// own rule).
//
// `image-absolute-url` is the first of the three the issue names ("figure
// images to absolute URLs, callout and fence dialects, footnotes"). The other
// two are not implemented: today's Drafts carry plain prose with no callouts,
// fences beyond the ones the Reader Path itself never emits at Projection's
// boundary, and no footnotes, so there is no live case to build a reversible
// converter against yet — adding one on spec rather than against a case is
// exactly the invention this Harness refuses everywhere else.
function imageAbsoluteUrlConverter(ctx) {
  const prefix = `https://raw.githubusercontent.com/tim-nish/kogaki/master/theses/${ctx.slug}/`;
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const FORWARD_RE = /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g;
  const REVERSE_RE = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedPrefix}([^)]+)\\)`, "g");
  return {
    name: "image-absolute-url",
    applies(body) { return new RegExp(FORWARD_RE).test(body); },
    forward(body) {
      let count = 0;
      const out = body.replace(new RegExp(FORWARD_RE), (m, alt, path) => {
        count++;
        return `![${alt}](${prefix}${path})`;
      });
      return { body: out, count };
    },
    reverse(body) {
      return body.replace(new RegExp(REVERSE_RE), (m, alt, path) => `![${alt}](${path})`);
    },
  };
}

// ---------------------------------------------------------------------------
// Profiles — the frontmatter keys a platform reads, their caps, and the
// converter list. A profile is DATA; a second platform is a profile, never a
// redesign (the issue's own words).
const PROFILES = {
  "dev.to": {
    id: "dev.to",
    requiredFields: ["title", "description"],
    optionalFields: ["tags", "cover_image", "series", "canonical_url"],
    // `description`'s cap is PROVISIONAL (owner amendment 2026-09-18) —
    // revisited after the first manual publish; `title`'s 128 is Dev.to's own
    // hard cap and is not revisited on the same schedule.
    caps: { title: 128, description: 160 },
    frontmatterOrder: ["title", "description", "tags", "cover_image", "series", "canonical_url", "published"],
    converters: [imageAbsoluteUrlConverter],
  },
};

// `--workspace` REDIRECTS THE LANE'S RUN, exactly the split `draft.mjs`'s
// `workspaceFor`/`enterWorkspace` makes: a caller naming a directory prunes
// nothing and holds it themselves, so the self-test can drive this runtime
// end to end under a scratch root without touching this repository's own
// `runs/project/`.
function enterWorkspace(args, slug) {
  if (typeof args.workspace === "string" && args.workspace !== "") {
    const ws = join(args.workspace, slug);
    mkdirSync(ws, { recursive: true });
    return ws;
  }
  return enterProjectWorkspace(slug);
}

function profileFor(args) {
  const name = argString(args, "profile", "a --profile is required");
  const profile = PROFILES[name];
  if (!profile) {
    fail(`no such profile \`${name}\` — declared profiles are ${Object.keys(PROFILES).join(", ")}`);
  }
  return profile;
}

// ---------------------------------------------------------------------------
// Field validation — the Harness's whole obligation over `projection.md`: that
// the required fields exist and fit their caps, and that the optional ones,
// where present, are shaped as declared. It invents no value anywhere here.
const TAG_RE = /^[A-Za-z0-9]+$/;

function validateFields(fields, profile, fieldFilePath) {
  const out = {};
  for (const key of profile.requiredFields) {
    const v = fields[key];
    if (typeof v !== "string" || v.trim() === "") {
      fail(`${fieldFilePath} carries no non-empty \`${key}\` — ${profile.id} requires it, and the `
        + "Harness invents no value for a field it owns only the presence and cap of");
    }
    const cap = profile.caps[key];
    if (cap && v.length > cap) {
      fail(`${fieldFilePath}'s \`${key}\` is ${v.length} character(s), over ${profile.id}'s cap of `
        + `${cap}`);
    }
    out[key] = v;
  }
  if (fields.tags !== undefined) {
    const tags = fields.tags;
    if (!Array.isArray(tags)) fail(`${fieldFilePath}'s \`tags\` is not an array`);
    if (tags.length > 4) {
      fail(`${fieldFilePath} carries ${tags.length} tags — ${profile.id} allows at most 4`);
    }
    for (const t of tags) {
      if (typeof t !== "string" || !TAG_RE.test(t)) {
        fail(`${fieldFilePath}'s tag ${JSON.stringify(t)} is not alphanumeric — ${profile.id} tags `
          + "carry no punctuation or spaces");
      }
    }
    out.tags = tags;
  }
  for (const key of ["cover_image", "series", "canonical_url"]) {
    if (fields[key] === undefined) continue;
    if (typeof fields[key] !== "string" || fields[key].trim() === "") {
      fail(`${fieldFilePath}'s \`${key}\` is present and not a non-empty string`);
    }
    out[key] = fields[key];
  }
  return out;
}

// ---------------------------------------------------------------------------
// The Article — built once, forward, in `run`; recovered once, backward, in
// `verify`. Both read the SAME profile converter list, in opposite order,
// which is the whole of what "reverses the profile's converters" means.
function articleText(profile, fields, body, ctx) {
  const converters = profile.converters.map((mk) => mk(ctx));
  let out = body;
  const fired = [];
  for (const c of converters) {
    if (!c.applies(out)) continue;
    const { body: next, count } = c.forward(out);
    out = next;
    if (count > 0) fired.push({ name: c.name, count });
  }
  const fm = ["---"];
  for (const key of profile.frontmatterOrder) {
    if (key === "published") { fm.push("published: false"); continue; }
    if (fields[key] === undefined) continue;
    fm.push(`${key}: ${JSON.stringify(fields[key])}`);
  }
  fm.push("---");
  return { text: fm.join("\n") + "\n\n" + out + "\n", fired };
}

function articlePath(dir, profile) {
  return join(dir, `article.${profile.id}.md`);
}

function reverseArticleBody(profile, articleRaw, path, ctx) {
  const { body } = splitFrontmatter(articleRaw, path);
  let out = body;
  const converters = profile.converters.map((mk) => mk(ctx));
  for (let i = converters.length - 1; i >= 0; i--) {
    out = converters[i].reverse(out);
  }
  return out;
}

// ---------------------------------------------------------------------------
function cmdRun(args) {
  const usage = "usage: project.mjs run --draft <draft.reviewed.md> --profile <name>";
  const draftPath = argString(args, "draft", usage);
  const profile = profileFor(args);
  const draft = readReviewedDraft(draftPath);

  const fieldPath = join(draft.dir, "projection.md");
  const prior = readFieldFile(fieldPath);
  if (!existsSync(fieldPath)) {
    fail(`no projection.md beside ${draft.path} — the owner-supplied field file \`run\` reads. `
      + "The model may draft it (see `propose`); the Harness validates it and invents nothing in "
      + "the Article from it.");
  }
  const fields = validateFields(prior.fields, profile, fieldPath);

  const ctx = { slug: draft.slug };
  const { text, fired } = articleText(profile, fields, draft.body, ctx);
  const outPath = articlePath(draft.dir, profile);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, text);

  // RECOVERABILITY, checked in the same act it is produced (the issue's own
  // acceptance instrument) — never asserted and left for a separate `verify`
  // call to discover it broken.
  const recovered = reverseArticleBody(profile, text, outPath, ctx);
  const verifyOk = recovered === draft.body;

  // Staleness is REPORTED, never marked silently (the issue's own words): the
  // prior record's source sha, if any, is what tells a re-run over a moved
  // Draft from an ordinary re-run over the same one.
  const priorShaMatch = (prior.recordBody || "").match(/\*\*Source body sha\.\*\* `([0-9a-f]{64})`/);
  const priorSha = priorShaMatch ? priorShaMatch[1] : null;
  const moved = priorSha !== null && priorSha !== draft.body_sha;

  const recordLines = [
    "## Record",
    "",
    "Rewritten by `project.mjs run` on every run — machine state, not owner prose.",
    "",
    `- **Source body sha.** \`${draft.body_sha}\``,
    `- **Profile.** \`${profile.id}\``,
    `- **Converters fired.** ${fired.length ? fired.map((f) => `\`${f.name}\` (${f.count})`).join(", ") : "none"}`,
    `- **Verify.** ${verifyOk ? "recovers the reviewed Draft body byte for byte" : "DOES NOT recover the reviewed Draft body — the run wrote an unreversible Article"}`,
  ];
  writeFieldFile(fieldPath, fields, profile.frontmatterOrder.filter((k) => k !== "published"), recordLines.join("\n"));

  // THE WORKSPACE, machine state with the review lane's own lifetime rule
  // (`runs/review/<slug>/`'s own convention): overwritten in place, keyed on
  // the slug, pruned by `src/runs.json`'s `project` lane on entry.
  const ws = enterWorkspace(args, draft.slug);
  writeFileSync(join(ws, "run.json"), JSON.stringify({
    draft: draft.path, profile: profile.id, article: outPath,
    source_body_sha: draft.body_sha, converters_fired: fired,
    verify_ok: verifyOk, at: new Date().toISOString(),
  }, null, 2) + "\n");

  if (!verifyOk) {
    fail(`the Article at ${outPath} does not recover ${draft.path}'s body through ${profile.id}'s `
      + "converters, reversed — a converter admitted to this profile must be reversible, and this "
      + "run found one that is not. The Article was written; do not publish it.");
  }
  process.stdout.write(`Article: ${outPath}\n`
    + `  profile     ${profile.id}\n`
    + `  converters  ${fired.length ? fired.map((f) => `${f.name}(${f.count})`).join(", ") : "none fired"}\n`
    + `  verify      ok — recovers ${draft.path}'s body byte for byte\n`
    + (moved ? `  NOTE        the source Draft moved (was ${priorSha.slice(0, 16)}, now `
        + `${draft.body_sha.slice(0, 16)}) — this run OVERWROTE the Article at ${outPath}\n` : ""));
}

function cmdVerify(args) {
  const usage = "usage: project.mjs verify --draft <draft.reviewed.md> --profile <name>";
  const draftPath = argString(args, "draft", usage);
  const profile = profileFor(args);
  const draft = readReviewedDraft(draftPath);

  const outPath = articlePath(draft.dir, profile);
  if (!existsSync(outPath)) {
    fail(`no Article at ${outPath} — run \`run --draft ${draftPath} --profile ${profile.id}\` first`);
  }
  const raw = readFileSync(outPath, "utf8");
  const ctx = { slug: draft.slug };
  const recovered = reverseArticleBody(profile, raw, outPath, ctx);
  if (recovered !== draft.body) {
    const draftLines = draft.body.split("\n");
    const recLines = recovered.split("\n");
    let at = 0;
    while (at < draftLines.length && at < recLines.length && draftLines[at] === recLines[at]) at++;
    fail(`${outPath} does not recover ${draft.path}'s body byte for byte — they first differ at `
      + `body line ${at + 1}:\n  draft     ${JSON.stringify(draftLines[at] ?? "(end of file)")}\n`
      + `  recovered ${JSON.stringify(recLines[at] ?? "(end of file)")}`);
  }
  process.stdout.write(`ok: ${outPath} recovers ${draft.path}'s body byte for byte, through `
    + `${profile.id}'s converters reversed\n`);
}

// ---------------------------------------------------------------------------
// `propose` — the one act that asks a model for anything (owner amendment
// 2026-09-18, item 2). It renders the schema and the reviewed Draft's body
// when nothing is piped in, and records a reply when one is; it validates
// presence and cap and nothing about content, exactly as `run`'s field
// validation does, because they are the same rule applied at two doors.
function cmdPropose(args) {
  const usage = "usage: <reply JSON on stdin> | project.mjs propose --draft <draft.reviewed.md> --profile <name>";
  const draftPath = argString(args, "draft", usage);
  const profile = profileFor(args);
  const draft = readReviewedDraft(draftPath);
  const fieldPath = join(draft.dir, "projection.md");

  const reply = readReply();
  if (reply.trim() === "") {
    process.stdout.write(
      `project.mjs propose (${profile.id}): write a Title and a Description for the reviewed Draft `
      + `below, and reply on standard input as JSON: {"title": "...", "description": "..."}\n\n`
      + "The Harness owns only that both exist and fit their caps; their wording is yours, and "
      + "Persona and style are settled at the Brief boundary, not here.\n\n"
      + `  title        non-empty string, at most ${profile.caps.title} characters\n`
      + `  description  non-empty string, at most ${profile.caps.description} characters `
      + "(profile-declared, provisional)\n\n"
      + `--- reviewed Draft body (${draft.slug}) ---\n${draft.body}\n`);
    return;
  }
  let parsed;
  try { parsed = JSON.parse(reply); }
  catch (e) { fail(`the reply on standard input is not readable JSON (${e.message})`); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail("the reply on standard input is not a JSON object carrying `title` and `description`");
  }
  for (const key of ["title", "description"]) {
    const v = parsed[key];
    if (typeof v !== "string" || v.trim() === "") {
      fail(`the reply carries no non-empty \`${key}\` — propose refuses a reply missing it and `
        + "never invents a value");
    }
    const cap = profile.caps[key];
    if (cap && v.length > cap) {
      fail(`the reply's \`${key}\` is ${v.length} character(s), over ${profile.id}'s cap of ${cap}`);
    }
  }
  const prior = readFieldFile(fieldPath);
  const fields = { ...prior.fields, title: parsed.title, description: parsed.description };
  writeFieldFile(fieldPath, fields, PROFILES[profile.id].frontmatterOrder.filter((k) => k !== "published"),
    prior.recordBody);
  process.stdout.write(`projection.md: wrote title and description to ${fieldPath}\n`);
}

// ---------------------------------------------------------------------------
// The fixture pass — seam-free, filesystem under a temp dir only. Every case
// CONSTRUCTS its defect and asserts this runtime refuses or produces by name.
async function runSelfTest() {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { execFileSync } = await import("node:child_process");
  const root = mkdtempSync(join(tmpdir(), "project-selftest-"));
  let passed = 0; const failures = [];
  const ok = (name, cond, detail) => {
    if (cond) passed++;
    else failures.push(detail !== undefined ? `${name} (${detail})` : name);
  };

  const HERE = fileURLToPath(import.meta.url);
  // `--workspace` REDIRECTS THE LANE'S RUN into this scratch root, the same
  // split `draft.mjs`'s self-test drives its own runtime through, so this
  // pass never touches this repository's own `runs/project/`.
  const ws = join(root, "ws");

  function cli(cmdArgs, input) {
    try {
      const out = execFileSync(process.execPath, [HERE, ...cmdArgs],
        { input: input ?? "", encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
      return { status: 0, stdout: out, stderr: "" };
    } catch (e) {
      return { status: e.status ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
    }
  }

  function doRun(draftFile, profile = "dev.to") {
    return cli(["run", "--draft", draftFile, "--profile", profile, "--workspace", ws]);
  }
  function doVerify(draftFile, profile = "dev.to") {
    return cli(["verify", "--draft", draftFile, "--profile", profile]);
  }
  function doPropose(draftFile, profile, input) {
    return cli(["propose", "--draft", draftFile, "--profile", profile ?? "dev.to"], input);
  }

  function thesis(slug) {
    const dir = join(root, "theses", slug);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  const BODY = "## Opening\n\nThe fixture claim, stated plainly.\n\n## Close\n\nWhy it holds.";

  function writeReviewed(dir, body = BODY) {
    const text = ["---", "brief: brief.md", "brief_pin: sha256:0000", "cites:", "trace:", "---", "",
      body, ""].join("\n");
    writeFileSync(join(dir, "draft.reviewed.md"), text);
    writeFileSync(join(dir, "review.md"), "# Review\n\n_None._\n");
    return body;
  }

  function writeProjection(dir, fields) {
    const lines = ["---"];
    for (const [k, v] of Object.entries(fields)) lines.push(`${k}: ${JSON.stringify(v)}`);
    lines.push("---", "");
    writeFileSync(join(dir, "projection.md"), lines.join("\n"));
  }

  // (a) run on a valid fixture writes the Article with exactly the profile's
  // keys, published: false, and a byte-identical body (no images present).
  {
    const dir = thesis("case-a");
    const body = writeReviewed(dir);
    writeProjection(dir, { title: "A Fixture Title", description: "A fixture description." });
    const r = doRun(join(dir, "draft.reviewed.md"));
    ok("(a) run exits 0 on a valid fixture", r.status === 0, r.stderr);
    const artPath = join(dir, "article.dev.to.md");
    ok("(a) it writes article.dev.to.md", existsSync(artPath));
    const art = existsSync(artPath) ? readFileSync(artPath, "utf8") : "";
    ok("(a) frontmatter carries exactly title, description, published",
      /^---\ntitle: "A Fixture Title"\ndescription: "A fixture description\.\"\npublished: false\n---\n\n/.test(art),
      JSON.stringify(art.slice(0, 200)));
    ok("(a) the body is byte-identical to the reviewed Draft's",
      art.endsWith("\n\n" + body + "\n"), JSON.stringify(art.slice(-80)));
    ok("(a) projection.md gains a Record with a Source body sha",
      readFileSync(join(dir, "projection.md"), "utf8").includes("**Source body sha.**"));
  }

  // (b) run refuses on draft.md (the unreviewed Draft), naming it.
  {
    const dir = thesis("case-b");
    writeFileSync(join(dir, "draft.md"), "---\n---\n\nbody\n");
    writeFileSync(join(dir, "review.md"), "# Review\n");
    writeProjection(dir, { title: "T", description: "D" });
    const r = doRun(join(dir, "draft.md"));
    ok("(b) run refuses on draft.md", r.status !== 0);
    ok("(b) naming draft.md by name", /draft\.md/.test(r.stderr));
  }

  // (c) run refuses when review.md is absent beside the reviewed Draft.
  {
    const dir = thesis("case-c");
    writeReviewed(dir);
    rmSync(join(dir, "review.md"));
    writeProjection(dir, { title: "T", description: "D" });
    const r = doRun(join(dir, "draft.reviewed.md"));
    ok("(c) run refuses with no review.md", r.status !== 0);
    ok("(c) naming review.md's absence", /review\.md/.test(r.stderr));
  }

  // (d) run refuses on a projection.md carrying five tags.
  {
    const dir = thesis("case-d");
    writeReviewed(dir);
    writeProjection(dir, { title: "T", description: "D", tags: ["a", "b", "c", "d", "e"] });
    const r = doRun(join(dir, "draft.reviewed.md"));
    ok("(d) run refuses on 5 tags", r.status !== 0);
    ok("(d) naming the tag count", /5 tags/.test(r.stderr));
  }

  // (e) run refuses on a non-alphanumeric tag.
  {
    const dir = thesis("case-e");
    writeReviewed(dir);
    writeProjection(dir, { title: "T", description: "D", tags: ["good", "not-ok"] });
    const r = doRun(join(dir, "draft.reviewed.md"));
    ok("(e) run refuses on a non-alphanumeric tag", r.status !== 0);
    ok("(e) naming the offending tag", /not-ok/.test(r.stderr));
  }

  // (f) run refuses on a 129-character title.
  {
    const dir = thesis("case-f");
    writeReviewed(dir);
    writeProjection(dir, { title: "x".repeat(129), description: "D" });
    const r = doRun(join(dir, "draft.reviewed.md"));
    ok("(f) run refuses on a 129-character title", r.status !== 0);
    ok("(f) naming the cap", /cap of 128/.test(r.stderr));
  }

  // (g) run refuses when a required field is absent, naming it, and invents
  // no value — the Removal Test's second half (owner amendment item 3).
  {
    const dir = thesis("case-g");
    writeReviewed(dir);
    writeProjection(dir, { title: "T" });
    const r = doRun(join(dir, "draft.reviewed.md"));
    ok("(g) run refuses with description absent", r.status !== 0);
    ok("(g) naming `description`", /`description`/.test(r.stderr));
    ok("(g) and writes no Article", !existsSync(join(dir, "article.dev.to.md")));
  }

  // (h) verify passes on the Article from a fresh valid run.
  {
    const dir = thesis("case-h");
    writeReviewed(dir);
    writeProjection(dir, { title: "T", description: "D" });
    doRun(join(dir, "draft.reviewed.md"));
    const r = doVerify(join(dir, "draft.reviewed.md"));
    ok("(h) verify passes on a fresh Article", r.status === 0, r.stderr);
  }

  // (i) verify refuses after a one-byte edit to the Article body.
  {
    const dir = thesis("case-i");
    writeReviewed(dir);
    writeProjection(dir, { title: "T", description: "D" });
    doRun(join(dir, "draft.reviewed.md"));
    const artPath = join(dir, "article.dev.to.md");
    writeFileSync(artPath, readFileSync(artPath, "utf8").replace("claim", "claiM"));
    const r = doVerify(join(dir, "draft.reviewed.md"));
    ok("(i) verify refuses after a one-byte body edit", r.status !== 0);
  }

  // (j) the Removal Test itself (owner amendment item 3): with no skill file
  // anywhere near this fixture root and no model invoked, run and verify
  // still produce the Article — every case above already runs with no
  // `.claude/skills/project/SKILL.md` under `root`, so this asserts the
  // absence directly rather than by omission.
  {
    ok("(j) the Removal Test's premise: no skill file exists under the fixture root",
      !existsSync(join(root, ".claude", "skills", "project", "SKILL.md")));
  }

  // (k) run refuses on an unknown profile, naming the declared set.
  {
    const dir = thesis("case-k");
    writeReviewed(dir);
    writeProjection(dir, { title: "T", description: "D" });
    const r = doRun(join(dir, "draft.reviewed.md"), "zenn");
    ok("(k) run refuses on an unknown profile", r.status !== 0);
    ok("(k) naming the declared profiles", /dev\.to/.test(r.stderr));
  }

  // (l) run refuses with no projection.md at all, naming it.
  {
    const dir = thesis("case-l");
    writeReviewed(dir);
    const r = doRun(join(dir, "draft.reviewed.md"));
    ok("(l) run refuses with no projection.md", r.status !== 0);
    ok("(l) naming projection.md", /projection\.md/.test(r.stderr));
  }

  // (m) THE REVERSIBLE CONVERTER, on its own fixture — a relative image link
  // that `run` turns into an absolute URL and `verify` recovers exactly. This
  // is what proves the converter FRAMEWORK is reversible; the acceptance item
  // asking for "one profile with a reversible converter on a fixture".
  {
    const dir = thesis("case-image-m");
    const body = "## Opening\n\n![a fixture figure](assets/fixture.png)\n\nProse after the figure.";
    writeReviewed(dir, body);
    writeProjection(dir, { title: "T", description: "D" });
    const r = doRun(join(dir, "draft.reviewed.md"));
    ok("(m) run exits 0 with an image present", r.status === 0, r.stderr);
    const art = readFileSync(join(dir, "article.dev.to.md"), "utf8");
    ok("(m) the image path is rewritten to an absolute URL",
      art.includes("](https://raw.githubusercontent.com/tim-nish/kogaki/master/theses/case-image-m/assets/fixture.png)"));
    ok("(m) the record names the converter and its count",
      readFileSync(join(dir, "projection.md"), "utf8").includes("`image-absolute-url` (1)"));
    const v = doVerify(join(dir, "draft.reviewed.md"));
    ok("(m) verify recovers the original relative path", v.status === 0, v.stderr);
  }

  // (n) a re-run over a moved Draft overwrites the Article and SAYS SO.
  {
    const dir = thesis("case-n");
    writeReviewed(dir, "## Opening\n\nOriginal body.");
    writeProjection(dir, { title: "T", description: "D" });
    doRun(join(dir, "draft.reviewed.md"));
    writeReviewed(dir, "## Opening\n\nA different body — the Draft moved.");
    const r = doRun(join(dir, "draft.reviewed.md"));
    ok("(n) the re-run exits 0", r.status === 0, r.stderr);
    ok("(n) and reports the Draft moved", /NOTE.*source Draft moved/.test(r.stdout));
    ok("(n) the Article body now matches the moved Draft",
      readFileSync(join(dir, "article.dev.to.md"), "utf8").includes("A different body"));
  }

  // (o) propose, with nothing piped in, renders the schema and the Draft's
  // body, and writes nothing.
  {
    const dir = thesis("case-o");
    writeReviewed(dir);
    const r = doPropose(join(dir, "draft.reviewed.md"), "dev.to");
    ok("(o) propose with no reply exits 0", r.status === 0, r.stderr);
    ok("(o) it renders the schema", /"title"/.test(r.stdout) && /"description"/.test(r.stdout));
    ok("(o) it renders the reviewed Draft's body", r.stdout.includes("The fixture claim, stated plainly."));
    ok("(o) it writes no projection.md", !existsSync(join(dir, "projection.md")));
  }

  // (p) propose with a valid reply writes title and description.
  {
    const dir = thesis("case-p");
    writeReviewed(dir);
    const reply = JSON.stringify({ title: "Proposed Title", description: "Proposed description." });
    const r = doPropose(join(dir, "draft.reviewed.md"), "dev.to", reply);
    ok("(p) propose with a valid reply exits 0", r.status === 0, r.stderr);
    const fm = readFileSync(join(dir, "projection.md"), "utf8");
    ok("(p) it writes the proposed title", fm.includes('title: "Proposed Title"'));
    ok("(p) it writes the proposed description", fm.includes('description: "Proposed description."'));
  }

  // (q) propose refuses a reply missing `title`.
  {
    const dir = thesis("case-q");
    writeReviewed(dir);
    const reply = JSON.stringify({ description: "Only a description." });
    const r = doPropose(join(dir, "draft.reviewed.md"), "dev.to", reply);
    ok("(q) propose refuses a reply missing title", r.status !== 0);
    ok("(q) naming `title`", /`title`/.test(r.stderr));
  }

  // (r) propose refuses a reply whose description exceeds the cap.
  {
    const dir = thesis("case-r");
    writeReviewed(dir);
    const reply = JSON.stringify({ title: "T", description: "x".repeat(161) });
    const r = doPropose(join(dir, "draft.reviewed.md"), "dev.to", reply);
    ok("(r) propose refuses a reply over the description cap", r.status !== 0);
    ok("(r) naming the cap", /cap of 160/.test(r.stderr));
  }

  // (s) run and verify still succeed with projection.md carrying a prior
  // `## Record` section — the field parser preserves and ignores it rather
  // than reading it as a field.
  {
    const dir = thesis("case-s");
    writeReviewed(dir);
    writeProjection(dir, { title: "T", description: "D" });
    writeFileSync(join(dir, "projection.md"),
      readFileSync(join(dir, "projection.md"), "utf8") + "\n## Record\n\nstale prose\n");
    const r = doRun(join(dir, "draft.reviewed.md"));
    ok("(s) run tolerates a pre-existing Record section", r.status === 0, r.stderr);
  }

  rmSync(root, { recursive: true, force: true });

  if (failures.length) {
    process.stderr.write(`project self-test: ${failures.length} failure(s)\n`);
    for (const f of failures) process.stderr.write(`  - ${f}\n`);
    process.exit(1);
  }
  console.log(`project self-test: ${passed} case(s) pass`);
}

const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (args["self-test"]) {
    runSelfTest();
  } else {
    switch (args._cmd) {
      case "run": cmdRun(args); break;
      case "verify": cmdVerify(args); break;
      case "propose": cmdPropose(args); break;
      default: fail("usage: project.mjs run|verify|propose --draft <draft.reviewed.md> --profile <name> "
        + "| --self-test");
    }
  }
}
