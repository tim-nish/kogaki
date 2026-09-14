#!/usr/bin/env bash
# EVERY COMPOSABLE GATE CALL, PUT THROUGH THE SHARED QUESTION-SHAPE CHECK
# (kogaki#1118, acceptance 3).
#
# WHAT THIS CARRIES. `src/terrain.mjs` now calls the toolkit's one named
# question-shape command at COMPOSE time, so a gate whose label the delivery
# channel refuses is refused by the program instead of deadlocking a session.
# That repair fires per RUN. This member fires per PUSH, over every gate the
# Brief and Terrain workflow tables can compose, so a label edit that the hook
# would refuse fails here rather than on the owner's screen — which is the
# difference between a check and an incident report.
#
# THE ENUMERATION IS THE REGISTRY, NOT A LIST HERE. `src/gate-registry.json` is
# what the workflow tables' `gate_id`s resolve against and what
# `emitGateDeclaration` reads, so a gate added there is covered by this member
# without a line being written in it. Gates are composed through
# `composeGateCall` itself — the payload judged is the payload sent, free-text
# row and folded reading included, never the declaration's bare labels.
#
# A DYNAMIC OPTION IS NOT INVENTED HERE. Four of the five registered gates take
# options composed at run time from served material this check has none of, so
# what it judges is each gate's STANDING options — the ones committed in the
# registry and edited by hand, which is the class the 2026-09-14 deadlock came
# from. Run-time options are judged by the compose-time call, at the run that
# composes them; that is stated in the output rather than left to be assumed
# covered.
#
# AND AN ABSENT COMMAND IS COULD-NOT-ESTABLISH, NEVER A PASS AND NEVER A FAIL.
# The command is machine-local and outside this repository
# (`src/deps-registry.json`; SPEC-external-deps "Report, never gate"), so a
# machine without it cannot answer this question — and a read that did not
# complete is not an absence. It exits 0 with the state named, because failing a
# diff over a fact about the world outside it is noise; a silent pass would be
# indistinguishable from a check that ran and found nothing, which is the one
# reading this file must never produce.
set -uo pipefail
cd "$(dirname "$0")/.."

CMD="${KOGAKI_QUESTION_SHAPE_CMD:-$HOME/.claude/tools/issue-sync}"

echo "check-gate-call-shape: every composable gate call, against the shared question-shape command"
echo "  command   $CMD lint-question"

printf '{"questions":[]}' | "$CMD" lint-question >/dev/null 2>&1
RC=$?
if [ "$RC" -ne 0 ]; then
  if [ "$RC" -ne 1 ]; then
    echo "  state     COULD-NOT-ESTABLISH — the command did not answer (exit $RC)."
    echo "            It is machine-local and installed by \`issue-sync install-hooks\`, outside this"
    echo "            repository and uninstallable from it. Nothing is asserted about the gates here;"
    echo "            the compose-time call in src/terrain.mjs degrades the same way, so a machine"
    echo "            without the command renders gates and is guarded at delivery by the hook alone."
    echo "check-gate-call-shape: 0 gate(s) judged, COULD-NOT-ESTABLISH"
    exit 0
  fi
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# One node process composes every gate and writes one payload file per gate;
# the shell then puts each through the command. The composer is imported rather
# than reimplemented — a second composer here would judge a payload nothing
# sends, which is the two-carriers shape this whole issue removes.
node -e '
import("./src/terrain.mjs").then(async (m) => {
  const { readFileSync, writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const out = process.argv[1];
  const reg = JSON.parse(readFileSync("src/gate-registry.json", "utf8"));
  const rows = [];
  for (const g of (reg.gates || [])) {
    const call = m.composeGateCall(g);
    if (call.tool_input) {
      writeFileSync(join(out, `${g.id}.json`), JSON.stringify(call.tool_input));
      rows.push(`${g.id}\tcomposed`);
    } else if (call.refused) {
      writeFileSync(join(out, `${g.id}.refused`), call.refused);
      rows.push(`${g.id}\trefused-at-compose`);
    } else {
      rows.push(`${g.id}\tno-standing-payload\t${(call.unavailable || call.over_bound || "").slice(0, 120)}`);
    }
  }
  writeFileSync(join(out, "rows.tsv"), rows.join("\n") + "\n");
});
' "$TMP" || { echo "  state     COULD-NOT-ESTABLISH — the composer did not run"; exit 1; }

JUDGED=0; FAILED=0; SKIPPED=0
while IFS=$'\t' read -r ID STATE NOTE; do
  [ -z "${ID:-}" ] && continue
  case "$STATE" in
    composed)
      JUDGED=$((JUDGED + 1))
      if OUT=$("$CMD" lint-question < "$TMP/$ID.json" 2>&1); then
        echo "  pass      $ID"
      else
        FAILED=$((FAILED + 1))
        echo "  FAIL      $ID — the shared check refuses this gate's composed call:"
        echo "$OUT" | sed 's/^/            /'
      fi
      ;;
    refused-at-compose)
      JUDGED=$((JUDGED + 1)); FAILED=$((FAILED + 1))
      echo "  FAIL      $ID — refused at compose, so no run can raise it:"
      sed 's/^/            /' "$TMP/$ID.refused"; echo
      ;;
    *)
      SKIPPED=$((SKIPPED + 1))
      echo "  skip      $ID — composes no standing payload: ${NOTE:-unstated}"
      ;;
  esac
done < "$TMP/rows.tsv"

# THE INSTRUMENT'S OWN CASE (kogaki#1118). Every assertion above is relative to
# the registry as it currently stands, so a member that judged only those would
# report a clean sweep on a day the command silently stopped discriminating. The
# case below is absolute: it composes `brief-thesis-adoption` with the exact
# label of the 2026-09-14 incident restored and requires a refusal. Green here
# with the live gates green is the member working; green here with the case
# silent is the member measuring nothing.
#
# case: brief-thesis-adoption -- refused while the bracketed clause stands
node -e '
import("./src/terrain.mjs").then(async (m) => {
  const { readFileSync, writeFileSync } = await import("node:fs");
  const reg = JSON.parse(readFileSync("src/gate-registry.json", "utf8"));
  const g = JSON.parse(JSON.stringify((reg.gates || []).find((x) => x.id === "brief-thesis-adoption")));
  const opt = (g.options || []).find((o) => o.id === "back-to-terrain");
  opt.label = `${opt.label} (a Brief never fetches)`;
  const call = m.composeGateCall(g);
  writeFileSync(process.argv[1], call.refused ? "refused" : "admitted");
});
' "$TMP/incident-case" || echo "admitted" > "$TMP/incident-case"
if [ "$(cat "$TMP/incident-case" 2>/dev/null)" = "refused" ]; then
  echo "  pass      instrument case: the 2026-09-14 label is refused by the composer"
else
  FAILED=$((FAILED + 1))
  echo "  FAIL      instrument case: the 2026-09-14 label is ADMITTED by the composer"
  echo "            the composer admitted the exact label the 2026-09-14 deadlock came from, so"
  echo "            every green above is a measurement this member did not take"
fi

echo "  note      run-time options are judged by the compose-time call in src/terrain.mjs, at the run"
echo "            that composes them; this member judges the standing options the registry commits."
echo "check-gate-call-shape: $JUDGED gate(s) judged, $FAILED failure(s), $SKIPPED without a standing payload"
[ "$FAILED" -eq 0 ]
