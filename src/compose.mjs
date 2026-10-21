#!/usr/bin/env node
// compose — the Leg-record runtime over the Brief's settled materials
// (SPEC-draft-pipeline; kogaki#489, story 1.73). It validates the SHAPE of
// the Leg records a sitting composes, fills the Brief's typed slots and
// counts Strand placements after composition, disclosing an unplaced Strand
// rather than dropping it (the read-not-invented rule). THIS RUNTIME RECORDS;
// IT NEVER JUDGES AND NEVER COMPOSES: a missing field is refused and a weak
// rationale is not (the judgment rule, story 1.74).

// A CLAIM IS ONE PROPOSITION DERIVED FROM A STRAND (kogaki#1095): the claim
// type set and its line serialization live in this library, which makes a
// non-Strand claim UNWRITABLE; claims are recorded for review, never
// verdict-ed (story 1.73 SQ2). `move` is REQUIRED on every Leg
// (the Leg's shape v18, kogaki#642), a recorded field and never a generator.
//
// The modules under src/compose/ are cut at this file's former named
// sections (kogaki#1465); this entry keeps the argument parser and the
// retired-`fill` refusal.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the read-not-invented rule; the Leg's shape;
//       the judgment rule; the durable home and the entry point;
//       the Candidate gate
//
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fail } from "./compose/leg-schema.mjs";

// THE NAMES THIS ENTRY EXPORTED BEFORE THE CUT (kogaki#1465), re-exported so
// no importer and no check changes when the modules move.
export {
  snapshotBrief, legschema, requiredLegFields, pathRules, pathRule,
  journeysRefusal, budgetRefusal, waypointsRefusal, READ_ALONE_OPENERS,
  RETIRED_WAYPOINT_MOVE_FIELDS, READER_STATE_DIMENSIONS,
  readerStateShapeRefusal, readerStateDimensionLine, validateLegs,
  deriveReaderStatesBefore, readerStartThesisRefusal,
} from "./compose/leg-schema.mjs";
export {
  figureKinds, renderFigureRoles, parseFigureRoles, figureRefusal,
  figureClaimRefusal, figureOf, resolveFigureForms, figureLegs,
  FIGURE_SOFT_WARNING_AT, figureClause,
} from "./compose/figure.mjs";
export {
  loadMoveIds, resolveMoveIds, MOVE_RECORD_EXT, MOVE_STATE_DIMENSIONS,
  moveStateRefusal, moveStateLines, readMoveRecord, dischargeRows,
} from "./compose/render.mjs";
export {
  moveRoles, moveContract, validateMoveRecord, RETIRED_MOVE_FIELDS,
  MOVE_CARRIED_FIELDS, MOVE_DESCRIPTION_MAX,
} from "./compose/moves.mjs";
export {
  audienceRecord, READER_PERSONA_FIELDS, READER_PERSONA_OPTIONAL_FIELDS,
  readerPersona, PERSONA_PRIOR_KNOWLEDGE_ABSENT, personaPriorKnowledgeLine,
  readerProse, audienceLanguage, loadMoveContracts, moveContractsForLegs,
} from "./compose/audience.mjs";
export {
  specializationSchema, gateSchema, gateRegistry, validateSpecialization,
  specializationFailures, specializationDigest, ownerGateDigest,
  validateOwnerAnswer,
} from "./compose/specialization.mjs";
export {
  parseIntroducesEntry, introducedMeaning, introducedTermInReaderStart, opensSectionRefusal,
  opensSectionIntroducedTermRefusal, sectionHeadingsWithLastAfterState,
  sectionGroupingRefusal, targetLegIndex, closureLedgerRefusal,
  readerTargetLegRefusal, readerTargetNamesRefusal, introducesRefusal,
  introducesNearestRefusal, parseReactivateEntry, reactivateRefusal,
  reactivateSemanticRefusal, readerKnowledgeLedger, introducerOf,
} from "./compose/sections.mjs";
export {
  DEFINED_TERM_CLASSES, definedTermsRefusal, definedTermsOf,
  definedTermBeforeIntroductionRefusal,
} from "./compose/defined-terms.mjs";
export {
  RENDERING_KEYS, renderingsRefusal, renderingsOf, renderedTermIntroducedRefusal,
  FUNCTION_WORDS, wordsOf, wordForms, recoverabilityOf,
} from "./compose/renderings.mjs";
export {
  BRIEF_RECORD_FILE, briefRecordDeclaration, briefRecordKeys, briefSlotKeys,
  readerStateMap, readerStateText, legRecord, briefLegs, PARAGRAPH_PLAN_FILE,
  sha256, paragraphPlanPathFor, paragraphPlanRecord, paragraphPlanRecordText,
  undeclaredKey, readParagraphPlanBeside, paragraphPlanShapeRefusal,
  joinRefusal, paragraphWaypointsRefusal, briefStrandIds, briefJourneyStrands,
  briefRecordText, parseBriefRecord, readBriefRecord, unfilledSlots, fillSlot,
  thesisClosureRow, thesisClosureLeg, CONCEDED_ROW_FIELDS, closureRowsOf,
  placements, journeyPlacements,
} from "./compose/record.mjs";
export { fillBrief } from "./compose/fill.mjs";

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

// `cmdFill` IS GONE with its route (kogaki#551, PR #557 round 1). The first
// cut left the function defined and uncalled — a retired route whose body
// survives reads as a route that could be switched back on, which is the
// demotion-not-a-retirement shape this change exists to end. `fillBrief`,
// the composer it called, is exported and untouched.


const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  switch (args._cmd) {
    // `fill` IS RETIRED (the durable home and the entry point v17, kogaki#551):
    // it wrote a Brief's sequence from one composed path, bypassing assembly
    // and the Candidate gate, so its output was a path nobody chose. REMOVED
    // rather than demoted, because a demotion is not a retirement. `fillBrief`
    // is untouched and exported: `adopt-candidate` and the checks fill a
    // sequence through it.
    case "fill":
      fail("`fill` no longer exists — a Brief's sequence is filled by adopting "
        + "a Candidate at the selection gate (SPEC-draft-pipeline, the Candidate gate; retired "
        + "at the durable home and the entry point v17, kogaki#551). Run `assemble.mjs assemble` to build the "
        + "selection payload, raise the gate, then `assemble.mjs "
        + "adopt-candidate --brief <path> --reviewed <json> --candidate <id>`.");
      break;
    default: fail("usage: compose.mjs — no subcommand; `fillBrief` is exported for the composition path, and the retired `fill` subcommand is replaced by assemble.mjs adopt-candidate (the Candidate gate, kogaki#551)");
  }
}
