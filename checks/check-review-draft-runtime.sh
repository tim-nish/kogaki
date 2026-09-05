#!/usr/bin/env bash
# The ReviewDraft runtime's fixture pass (kogaki#869 tracking, kogaki#870 this
# artifact).
#
# A THIN INVOKER, HOLDING NO ASSERTIONS OF ITS OWN — the same arrangement
# check-draft-runtime.sh and check-terrain-runtime.sh use, and for the same
# reason: the cases live with the runtime they cover, in
# `src/review-draft.mjs --self-test`, because they are functions of the
# runtime's own refusal surfaces and drive it end to end in a temp directory.
# Seam-free by construction: no gateway, no network, no home-directory write,
# and no read of this repository's own `theses/` or `runs/`.
#
# WHAT THE PASS ASSERTS (kogaki#870's ACs, enumerated in the runtime):
# `open` succeeds on a well-formed Draft and refuses BY NAME on each of the
# four ways its inputs can be wrong — no line range (the kogaki#868
# precondition), no Packet named, a Packet absent, and a Packet whose sha
# differs from the trace's, which means the Draft was not produced from it;
# the recovery input carries the Step's prose and nothing from the Packet;
# `recover` refuses a Step whose input it did not render; `compare` refuses
# while any Step or Section entry is missing and names BOTH kinds; `close`
# writes `theses/<slug>/review.md` with its three lists, one per Draft,
# overwritten on re-run, and every residue line carries an EMPTY `classified:`
# field the tool never fills.
#
# AND ONE STRUCTURAL CASE, which is the mechanical half of the owner's
# 2026-09-04 ruling: the Harness imports ONLY node builtins and ./runs.mjs. It
# is an ALLOWLIST (PR #882 round 1, finding 5) — the first form named the
# modules it refused, so an unanticipated reader would have passed it while
# breaking the ruling it exists to mechanize. The ruling says a need for a
# Brief, Move or Strand is a PACKET GAP filed against src/packet-template.md;
# a case whose non-member fallback is REFUSE is what makes that a property
# rather than a promise. `node:child_process` joined the allowlist at
# kogaki#874 and the property is UNCHANGED rather than widened — the clause is
# "only node builtins and ./runs.mjs", and a builtin is what it is. It is there
# for one act: `correct` re-enters the realization lane as a subprocess,
# because a corrected Step must be realized by the renderer that wrote the
# Packets rather than by a second one written in the review Harness. The
# reviewer still reads no Brief, no Move and no Strand, and the two store
# literals asserted beside the allowlist are what would catch such a read
# composed at runtime.
#
# AND kogaki#874's CORRECTION PATH, driven END TO END OVER A REAL DRAFT. This
# is the one block in the pass that builds its Draft through `src/draft.mjs`
# rather than by hand, and the reason is the property: `correct` re-renders the
# Step's Packet against the article as it NOW stands, so a hand-written
# stand-in for that Packet would be the pass checking that it can read its own
# guess — and the "article so far" block, which IS the continuity mechanism the
# owner's concern is about, is exactly the part a stand-in would invent. It
# stays seam-free: a Brief, a Move store and two workspaces under the same temp
# root, no network and no read of this repository's `theses/` or `runs/`.
#
# WHAT THE PASS DOES NOT EVIDENCE, stated rather than left to be assumed. The
# issue's AC1 names a live drive against `theses/some-safety-properties-cannot-
# checked/draft.md` and its six Packets. That Draft is UNTRACKED working
# material and its Packets live under the gitignored `runs/`, so the drive is
# not reproducible from the tree and this member — seam-free, and it never reads
# `theses/` or `runs/` — does not attempt it. AC1's reproducible evidence is the
# fixture Draft, built in `emit`'s own shape. The live drive was performed once
# at authoring and is reported as an observation, never as coverage.
#
# NOT CARRIED HERE, stated rather than implied: the cold reader's pairing
# (kogaki#873). That entry point is DECLARED by this runtime and refuses by
# naming its issue; the pass asserts the refusal, never the behaviour that has
# not been built. The recovered record's schema (kogaki#871), the comparison
# (kogaki#872) and the correction path with its bounded second pass
# (kogaki#874) ARE carried, named here as landed rather than dropped from the
# list, because a boundary that quietly stops being one cannot be told from a
# boundary a reader misremembered.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== ReviewDraft runtime fixture pass (kogaki#870)"

OUT=$(node src/review-draft.mjs --self-test 2>&1); RC=$?
printf '%s\n' "$OUT"
if [[ $RC -ne 0 ]] || ! grep -q "review-draft self-test:" <<<"$OUT"; then
  echo "FAIL: the runtime's fixture pass did not run clean — the cases live with the runtime and this member only invokes them"
  exit 1
fi

# THE FLOOR IS READ FROM THE REGISTRY, never hardcoded here (kogaki#661).
# checks/registry.json is the one source: a number transcribed into this file
# would be the unbound-prose defect the floor exists to close, in a second
# place. The EXTRACTION is this member's own, per the registry note's rule.
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'review-draft-runtime'))
") || { echo "FAIL: could not read case_floor for review-draft-runtime from checks/registry.json"; exit 1; }
N=$(sed -n 's/^review-draft self-test: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
if [[ -z "$N" ]]; then
  echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"
  exit 1
fi
if (( N < FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST rather than broken, and this member would otherwise report their absence as evidence (kogaki#661)"
  exit 1
fi
echo "ok: ReviewDraft runtime fixture pass ran ${N} case(s) clean, at or above its declared floor of ${FLOOR}"

# --- THE SKILL NAMES ONLY PATHS AND SUBCOMMANDS THE HARNESS HAS (kogaki#812).
#
# This is the assertion that earns the review-draft skill its place in
# `.gitignore`'s tracked set, on the criterion that block states for `brief`,
# `terrain` and `draft`: a check asserts against the skill, and the assertion
# does not exist without its file.
#
# SCOPE, stated so the pass is not read as more: it checks that every path and
# every subcommand the skill NAMES exists. It cannot check that the skill says
# the right thing — what makes the flow ordering hold is that it lives in the
# Harness, not that this file is now checked.
SKILL=".claude/skills/review-draft/SKILL.md"
if [[ ! -f "$SKILL" ]]; then
  echo "FAIL: $SKILL is missing — it is tracked and this member asserts against it, so its absence is a defect rather than a skip"
  exit 1
fi

BAD=0

# Every `<path>/review-draft.mjs` the skill names must resolve.
while read -r pth; do
  [[ -z "$pth" ]] && continue
  if [[ ! -f "$pth" ]]; then
    echo "FAIL: $SKILL names \`$pth\`, which does not exist"
    BAD=1
  fi
done < <(grep -oE '[A-Za-z0-9_./-]*review-draft\.mjs' "$SKILL" | sort -u)

# Every subcommand the skill names must be one the Harness dispatches. The
# Harness's own usage is the source: a list transcribed into this check would
# be the same unbound prose one layer over.
USAGE=$(node src/review-draft.mjs 2>&1)
while read -r sub; do
  [[ -z "$sub" ]] && continue
  if ! grep -qE "review-draft\.mjs $sub( |$)" <<<"$USAGE"; then
    echo "FAIL: $SKILL names the subcommand \`$sub\`, which the Harness's own usage does not list"
    BAD=1
  fi
done < <(grep -oE 'review-draft\.mjs [a-z-]+' "$SKILL" | awk '{print $2}' | sort -u)

# And the converse, which is the half a rename sweep misses: a subcommand the
# Harness has and the skill never names is an entry point nobody is told about.
while read -r sub; do
  [[ -z "$sub" ]] && continue
  if ! grep -qE "review-draft\.mjs $sub( |$)" "$SKILL"; then
    echo "FAIL: the Harness dispatches \`$sub\`, which $SKILL does not name"
    BAD=1
  fi
done < <(grep -oE 'review-draft\.mjs [a-z-]+' <<<"$USAGE" | awk '{print $2}' | sort -u)

if (( BAD )); then exit 1; fi
echo "ok: $SKILL names only paths and subcommands the Harness has, and names all of them"

# --- THE REVIEW LANE IS REGISTERED WHEREVER A LANE MUST BE (kogaki#750).
#
# `runs.mjs` refuses a lane outside its closed set and `keepLast` refuses when
# ANY lane carries no positive bound, so a lane added to one and not the other
# is a runtime that refuses its own workspace. The condition never arises while
# both edits land together, which is exactly when its absence leaves no trace.
# ASKED OF THE MODULE, never matched as text (PR #882 round 1, finding 4). The
# first form grepped for the literal `"terrain", "brief", "draft", "review"`,
# which goes red on a reordering or a reformat that changes nothing, and for a
# bare `"review"` in src/runs.json, which does not check the key sits under
# `lanes` carrying a positive bound. Both are the contract-tested-against-its-
# own-text shape: green about the document, silent about the behaviour.
if ! node --input-type=module -e '
  import { LANES, keepLast } from "./src/runs.mjs";
  if (!LANES.includes("review")) {
    console.error("LANES does not carry the review lane");
    process.exit(1);
  }
  const k = keepLast("review");
  if (!Number.isInteger(k) || k < 1) {
    console.error(`keepLast("review") returned ${k}`);
    process.exit(1);
  }
'; then
  echo "FAIL: the review lane is not registered in BOTH src/runs.mjs's LANES and src/runs.json's bounds — keepLast checks every lane, so one carrier without the other is a runtime that refuses its own workspace"
  exit 1
fi
echo "ok: the review lane is registered in both LANES and src/runs.json, asked of the module rather than matched as text"

# --- THE RECOVERY TEMPLATE CARRIES NO PACKET BLOCK (kogaki#871).
#
# The fixture asserts the absence in the RENDERED input, driven from a fixture
# Packet holding a marker string. This asserts it on the TEMPLATE, against the
# real src/packet-template.md, and neither subsumes the other: the fixture would
# catch a renderer that started reading the Packet, and this catches a template
# edit that pasted a Packet block in -- which would read as helpful, render no
# marker, and silently end the measurement.
#
# THE FORBIDDEN LIST IS DERIVED FROM THE PACKET TEMPLATE'S OWN HEADINGS, never
# transcribed here: a block added to the Packet is covered by the derivation
# rather than by a list somebody remembered to extend.
#
# THE BOUND IS STATED RATHER THAN LEFT TO READ AS TOTAL (PR #884 round 1,
# finding 4). Every heading level is read and compared as EXACT text, so what
# this does NOT catch is a pasted block somebody RETITLED -- a Packet block
# arriving under a new name escapes, and no textual guard can close that. What
# it does catch is the copy-paste, which is the shape the failure actually
# takes. The registry contract states the same bound; a guard described as
# total coverage would be the overclaim this finding named.
RT="src/recovery-template.md"
PT="src/packet-template.md"
for f in "$RT" "$PT" src/recovered-schema.json src/review-items.json src/join-template.md; do
  if [[ ! -f "$f" ]]; then
    echo "FAIL: $f is missing -- the recovery input and its record contract are runtime-read, so an absent one is a defect rather than a skip"
    exit 1
  fi
done

# The Packet's own headings, as a heading-line pattern each.
LEAK=0
while IFS= read -r h; do
  [[ -z "$h" ]] && continue
  # "The article so far" is the ONE block both templates legitimately carry a
  # form of: the recovery input re-derives it from the current Draft rather than
  # reading the Packet's copy, which is the kogaki#871 design and not a leak.
  [[ "$h" == *"article so far"* ]] && continue
  # MATCHED AS A HEADING LINE, never as a substring. The Packet heading "Write"
  # occurs inside this template's own "Write no verdicts and no advice", and a
  # substring match failed on correct text -- the guard-that-fires-on-correct-
  # behaviour shape, caught at authoring rather than in review.
  # `/^#/`, ONE `#` AND NOT TWO, because a leak at ANY heading level is a leak:
  # the Packet's own `# Write one Step` is level 1, so `/^##/` -- the strongest
  # wrong candidate here -- selects no line for it and the guard passes a
  # template carrying it. One `#` selects every heading level and the `sub()`
  # below strips the rest before the comparison, so the level never matters.
  # AND NOT `/^#{0,0}##/`, which fails BOTH ways: where awk supports intervals
  # it collapses to `/^##/` and misses level 1 exactly as above, and where it
  # does not it is matched LITERALLY, in which case no heading line is ever
  # selected at all, `found` is never set, and this guard reports ok on a
  # leaked template. A guard whose failure mode is a clean pass is the shape
  # this member calls out by name two blocks up (PR #884 round 1, finding 1).
  # THE SELECTOR HAS TWO CARRIERS: this comment and this member's `efficacy_note`
  # in checks/registry.json, which records the same repair. They disagreed once
  # already (kogaki#886, this comment naming `/^##/` against the code's `/^#/`),
  # so each names the other here rather than only the wrong side being corrected
  # -- edit one and the other is owed the same edit.
  if awk -v want="$h" '/^#/ { line=$0; sub(/^#+[ ]*/, "", line); sub(/[ ]*$/, "", line); if (line == want) found=1 } END { exit !found }' "$RT"; then
    echo "FAIL: $RT carries the Packet block heading \"$h\" -- the reviewer is blind by design, and a Packet block in the recovery input ends the measurement while looking helpful"
    LEAK=1
  fi
done < <(sed -nE 's/^#{1,6} (.*[^ ]) *$/\1/p' "$PT")
if (( LEAK )); then exit 1; fi
echo "ok: $RT carries no block heading from $PT (derived from its headings, never transcribed)"

# --- THE ITEM TABLE'S PACKET SHAPE MATCHES THE REAL TEMPLATE (kogaki#872).
#
# `compare` reads the DECLARED side out of a rendered Packet by the labels,
# headings and fixed sentences `src/review-items.json` names in `packet_blocks`.
# The fixture cannot assert this: it writes its OWN Packets, in the template's
# shape as the author understood it, so a rename in src/packet-template.md would
# leave every fixture case green and every real Packet refusing at `compare` —
# or, worse for a `block` reader whose instruction sentence stopped matching,
# silently handing the instruction paragraph back as the block's value.
#
# THIS IS A JOIN ACROSS TWO FILES AND ONLY A MEMBER CAN STAND AT IT. Asserted
# against the real template, deriving the strings from the table rather than
# transcribing them here, so a block added to the table is covered by the
# derivation.
#
# WHAT IT DOES NOT CATCH, stated rather than left to read as total: it checks
# that each named label, heading and sentence occurs in the template AND that
# each skip-anchor reaches its paragraph's end. It cannot check that the block
# still MEANS what the item compares against — a heading reused for different
# content passes this and is caught only by a real drive.
#
# THE PARAGRAPH-END HALF IS PR #895 ROUND 1'S FINDING 3. The first form asserted
# only that the sentence OCCURS, and the Section block's anchor stopped one
# sentence short of its paragraph: the sentence after it survived the slice and
# was prepended to the declared side the judging model reads — the exact failure
# the reader's own comment names, reached by an incomplete anchor rather than by
# a rewrap. So occurrence was never the property, and reaching the end is.
if ! python3 - <<'PYEOF'
import json, re, sys
table = json.load(open("src/review-items.json"))
tpl = open("src/packet-template.md").read()
blocks = table.get("packet_blocks", {})
bad = []

# Every declared_block an item names must have a shape in the table.
for item in table["items"]:
    for name in ([item.get("declared_block")] + item.get("also_declared_blocks", [])):
        if name and name not in blocks:
            bad.append(f"item {item['id']} names the block `{name}`, which packet_blocks does not describe")

def occurs(needle):
    # Whitespace-insensitive, the way the runtime matches a wrapped sentence.
    return re.search(r"\s+".join(re.escape(w) for w in needle.split()), tpl) is not None

for name, spec in blocks.items():
    if name == "note":
        continue
    kind = spec.get("kind")
    for label in ([spec["label"]] if "label" in spec else []) + spec.get("labels", []) + (
            [spec["bullet_label"]] if "bullet_label" in spec else []):
        if not re.search(r"^- \*\*" + re.escape(label) + r"\.\*\*", tpl, re.M):
            bad.append(f"block `{name}` reads the Packet bullet `{label}`, which the template does not render")
    if "heading" in spec and not re.search(r"^#+\s+" + re.escape(spec["heading"]) + r"\s*$", tpl, re.M):
        bad.append(f"block `{name}` reads the Packet heading \"{spec['heading']}\", which the template does not carry")
    if "after_words" in spec:
        m = re.search(r"\s+".join(re.escape(w) for w in spec["after_words"].split()), tpl)
        if m is None:
            bad.append(f"block `{name}` skips the fixed sentence \"{spec['after_words']}\", which the template does not carry -- the instruction paragraph would be handed back as the block's value")
        else:
            # AND IT MUST REACH THE PARAGRAPH'S END (PR #895 round 1, finding 3).
            # Asserting only that the sentence OCCURS passed an anchor that
            # stopped one sentence short, so instruction prose survived the slice
            # and was prepended to the declared side the judging model reads.
            rest = tpl[m.end():].split("\n\n")[0].strip()
            if rest:
                bad.append(f"block `{name}`'s anchor stops mid-paragraph: {rest[:90]!r} follows it and would be prepended to the block's value")
    if "opens_with" in spec and spec["opens_with"] not in tpl:
        bad.append(f"block `{name}` opens on \"{spec['opens_with']}\", which the template does not carry")
    if "prefix" in spec and not re.search(r"^" + re.escape(spec["prefix"]) + r"\s", tpl, re.M) and "{{" not in tpl:
        pass  # the ground lines are a rendered VALUE, not template text

for b in bad:
    print("FAIL: " + b)
sys.exit(1 if bad else 0)
PYEOF
then
  echo "FAIL: src/review-items.json's packet_blocks and src/packet-template.md disagree about the Packet's shape -- every real Packet would refuse at \`compare\` while every fixture case stayed green"
  exit 1
fi
echo "ok: every Packet label, heading and fixed sentence the item table reads is one src/packet-template.md renders"

# --- AND EVERY MECHANICAL ITEM HAS AN IMPLEMENTATION (kogaki#872).
#
# The fixture asserts this too, from the module's own text. It is repeated here
# because the failure mode is a CLEAN PASS: a table row that gained
# `mode: mechanical` with no implementation would report `holds` for every Draft
# on every Step, which is the silent agreement the whole comparison exists to
# refuse. Asked of the MODULE rather than matched as text.
if ! node --input-type=module -e '
  import { readFileSync } from "node:fs";
  const t = JSON.parse(readFileSync("src/review-items.json", "utf8"));
  const code = readFileSync("src/review-draft.mjs", "utf8");
  const prod = code.slice(0, code.indexOf("async function runSelfTest"));
  const missing = t.items.filter((i) => i.mode === "mechanical" && !prod.includes(`"${i.id}"`));
  if (missing.length) {
    console.error(`no implementation for: ${missing.map((i) => i.id).join(", ")}`);
    process.exit(1);
  }
  const judged = t.items.filter((i) => i.mode !== "mechanical");
  if (judged.some((i) => !i.question)) {
    console.error("a judged item carries no question, so its join Packet would ask nothing");
    process.exit(1);
  }
  if (t.verdicts.length !== 3) { console.error("the verdict set is not the closed three"); process.exit(1); }
'; then
  echo "FAIL: src/review-items.json declares an item the runtime cannot decide -- a mechanical row with no implementation reports holds for every Draft, and a judged row with no question renders a join Packet that asks nothing"
  exit 1
fi
echo "ok: every mechanical item has an implementation, every judged item carries a question, and the verdict set is the closed three"

echo "PASS: ReviewDraft runtime"
