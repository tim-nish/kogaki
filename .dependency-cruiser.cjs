// The src/ lane rule (owner ruling 2026-11-08, kogaki#1746): a file named after
// a workflow holds that workflow's processes, a workflow does not use another
// workflow's files, shared functionality lives in a shared home, and a
// playground may use production executables. This file is the rule's only
// carrier; checks/check-dependency-rules.sh runs it.
const lane = (names) => `^src/(${names})(/|\\.mjs$|-[^/]*$)`;
const PRODUCTION = "terrain|brief|paragraph-plan|draft|review-draft";
const BENCHES = "proof-sheet|mapping-playground|flp";
const ALL = `${PRODUCTION}|${BENCHES}`;

module.exports = {
  forbidden: [
    {
      name: "lane-reaches-another-lane",
      comment: "A workflow does not use another workflow's files; shared functionality moves to a shared home (kogaki#1746).",
      severity: "error",
      from: { path: lane(PRODUCTION) },
      to: { path: lane(PRODUCTION), pathNot: "^src/$1(/|\\.mjs$|-[^/]*$)" },
    },
    {
      name: "shared-home-reaches-a-lane",
      comment: "A shared home serves every workflow and so reaches none of them (kogaki#1746).",
      severity: "error",
      from: { path: "^src/(workflow/|compose/|[^/]+$)", pathNot: lane(ALL) },
      to: { path: lane(ALL) },
    },
    {
      name: "bench-reached-from-outside",
      comment: "A playground may use production files, and nothing outside it uses the playground (kogaki#1746).",
      severity: "error",
      from: { path: "^src/", pathNot: lane("proof-sheet") },
      to: { path: lane("proof-sheet") },
    },
    {
      name: "bench-reached-from-outside",
      comment: "A playground may use production files, and nothing outside it uses the playground (kogaki#1746).",
      severity: "error",
      from: { path: "^src/", pathNot: lane("mapping-playground|flp") },
      to: { path: lane("mapping-playground") },
    },
    {
      name: "bench-reached-from-outside",
      comment: "The FLP is a playground: it may use production files and the Trial sheet's helpers, and nothing outside it uses it (kogaki#1752).",
      severity: "error",
      from: { path: "^src/", pathNot: lane("flp") },
      to: { path: lane("flp") },
    },
    {
      name: "no-circular",
      comment: "Two src/ files that reach each other are one workflow split across two homes (kogaki#1746).",
      severity: "error",
      from: { path: "^src/" },
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "node_modules" },
  },
};
