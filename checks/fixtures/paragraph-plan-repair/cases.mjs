// checks/fixtures/paragraph-plan-repair/cases — the Findings and Repair cases of checks/check-paragraph-plan-site-retry.sh
// (kogaki#1815), kept in their own file by .claude/rules/checks-language.md; each member hands in
// its own harness and records its failures in its own list.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stringifyYaml } from "../../../src/yaml.mjs";
import { PARAGRAPH_PLAN_REPAIRS_FILE } from "../../../src/paragraph-plan/findings.mjs";
import { writeCallRecord } from "../../../src/workflow/call-record.mjs";
import { renderFlp } from "../../../src/paragraph-plan-playground/sheet.mjs";
import {
  paragraphPlanSiteInput,
  paragraphPlanSiteRepair,
  validateParagraphPlanSite,
} from "../../../src/paragraph-plan/site-retry.mjs";

const rowsAt = (dir) =>
  existsSync(join(dir, PARAGRAPH_PLAN_REPAIRS_FILE))
    ? readFileSync(join(dir, PARAGRAPH_PLAN_REPAIRS_FILE), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];

export async function siteRepairCases({ run, pwOf, point, fails }) {
  const repairs = (r) => rowsAt(r.runDir);
  // (s3) A SITE ANSWER BINDS NO MOVE: THE LEG'S MOVE IS HELD AT EVERY PARAGRAPH (kogaki#1777), and the key is a
  // shape Finding the program removes with no second call (kogaki#1815).
  {
    const r = run(
      "s3",
      `export const site = (i, n) => siteEntry(i, n === 1 ? { move: "p2", tag: "-site1" } : { tag: "-site2" });
export const judge = (i, n, l) => verdicts(i, (w) => l === "s1" && n === 1 && w === 2);`,
    );
    const rows = repairs(r).filter((x) => x.site === 2);
    if (r.of("site").length !== 1)
      fails.push(
        `(s3) a site answer carrying \`move\` was asked again of the model: ${r.of("site").length} site call(s)`,
      );
    if (
      !rows.some(
        (x) =>
          x.arm === "keep_points" &&
          x.findings.some((f) => f.class === "shape" && f.key === "move") &&
          x.refusal.includes('the answer carries `move` — the Leg\'s Move "p1" is held'),
      )
    ) {
      fails.push(
        `(s3) no keep_points Repair names the \`move\` shape Finding beside the refusal: ${JSON.stringify(rows)}`,
      );
    }
    if (r.of("judge").length !== 2)
      fails.push(
        `(s3) the judge was called ${r.of("judge").length} times for Leg s1, not twice -- a site's Move reaches no judge`,
      );
    if (
      !r.plan ||
      r.plan.legs.find((x) => x.leg_id === "s1").move !== "p1" ||
      !point(pwOf(r.plan, "s1", 2)).includes("-site1") ||
      Object.hasOwn(pwOf(r.plan, "s1", 2), "move")
    ) {
      fails.push(
        `(s3) the plan file does not hold Leg s1 under p1 with the site answer, less its \`move\`, at paragraph 2: ${r.plan ? JSON.stringify(r.plan.legs[0]) : r.out.slice(0, 600)}`,
      );
    }
  }

  // (s14) A REFUSAL CARRYING ONLY A SHAPE FINDING MAKES NO MODEL CALL: the program removes the key and every point
  // stands (kogaki#1815; leg-1/3 of the guard run carried a `join` on a first paragraph).
  {
    const r = run(
      "s14",
      `export const plan = (i, n) => { const p = legPlan(i.leg_you_must_plan.leg_id);
  if (i.leg_you_must_plan.leg_id === "s1" && n === 1) p.paragraphs[0].join = "consequence";
  return p; };
export const judge = (i) => verdicts(i, () => false);`,
    );
    const rows = repairs(r).filter((x) => x.unit === "leg-1");
    if (r.of("site").length || r.of("suffix").length || r.of("plan").length !== 1) {
      fails.push(
        `(s14) a shape-only refusal made a model call: ${r.of("plan").length} plan, ${r.of("site").length} site, ${r.of("suffix").length} suffix call(s)`,
      );
    }
    if (
      rows.length !== 1 ||
      rows[0].arm !== "keep_points" ||
      rows[0].chosen_by !== "program" ||
      rows[0].findings.some((f) => f.class !== "shape") ||
      !rows[0].grounds.startsWith("the shape Finding at paragraph 1 (the key `join`)")
    ) {
      fails.push(
        `(s14) the Repair is not one program keep_points over the \`join\` shape Finding: ${JSON.stringify(rows)}`,
      );
    }
    const p1 = pwOf(r.plan, "s1", 1);
    if (!p1 || Object.hasOwn(p1, "join") || !point(p1).startsWith("PW-s1-1 "))
      fails.push(
        `(s14) the plan file does not carry paragraph 1's points less its \`join\`: ${JSON.stringify(p1) || r.out.slice(0, 600)}`,
      );
  }
}

// (u) kogaki#1815: over a one-Leg run whose first Call the validator refused for a `join` on paragraph 1, the ParagraphPlanPlayground
// renders the Round's Finding with its class and, once the run holds the Repair, its Arm and grounds; before, it says
// none was written.
export function flpRepairCase(fails) {
  const run = join(mkdtempSync(join(tmpdir(), "paragraph-plan-playground-repair-")), "run");
  mkdirSync(run, { recursive: true });
  const refusal = "Leg leg1, paragraph 1 carries `join` — the first paragraph of a Leg carries no join";
  const para = (n, extra = {}) => ({
    paragraph: n,
    materials: ["L1"],
    ...(n > 1 ? { join: "elaboration" } : {}),
    paragraph_waypoints: [{ point: `Alpha ${n}.`, serves: ["L1"], cast: {} }],
    ...extra,
  });
  const plan = (paragraphs) => ({
    version: "1",
    leg_id: "leg1",
    move: "set_a_second_instance_beside_the_first",
    rationale: "the Move carries the Leg.",
    paragraphs,
  });
  const record = (n, answer, refused = null) =>
    writeCallRecord(run, "leg-1", n, {
      prompt: "p",
      argv: [],
      cli: null,
      input: null,
      row: { phase: "compose" },
      raw: "",
      answer,
      refusal: refused,
    });
  record(1, plan([para(1, { join: "none" }), para(2)]), { text: refusal, sites: [1] });
  record(2, plan([para(1), para(2)]));
  writeFileSync(
    join(run, "paragraph-plan-start.json"),
    JSON.stringify({
      brief: "theses/fixture/brief.yaml",
      brief_sha256: "0",
      moves_dir: "moves",
      legs: [{ leg_id: "leg1", text: "The text of leg1.", claims: [] }],
    }),
  );
  writeFileSync(
    join(run, "reader-path-job.json"),
    JSON.stringify({
      state: "done",
      supervisor_pid: 0,
      units: [
        {
          id: "leg-1",
          status: "done",
          rounds: 2,
          call_1_s: 12,
          candidate: plan([para(1), para(2)]),
          refusals: [refusal],
        },
      ],
    }),
  );
  const comment = () => {
    const html = renderFlp({ runDir: run, legId: "leg1", outDir: run }).html || "";
    const w = (html.split('id="paragraph-1"')[1] || "").split('id="paragraph-')[0].split('id="calls"')[0];
    const r =
      w
        .split('<h3 class="round">')
        .slice(1)
        .find((x) => x.startsWith("Round 1</h3>")) || "";
    return (r.split('<h4 class="th">Comment</h4>')[1] || "").split('<h4 class="th">')[0];
  };
  const before = comment();
  if (!before.includes("finding: shape — the key `join`: join") || !before.includes("repair: none written")) {
    fails.push(
      `(u) a refused Round with no Repair does not render its shape Finding and say none was written: ${before}`,
    );
  }
  writeFileSync(
    join(run, PARAGRAPH_PLAN_REPAIRS_FILE),
    JSON.stringify({
      unit: "leg-1",
      site: 1,
      refusal,
      chosen_by: "program",
      arm: "keep_points",
      grounds: "the shape Finding at paragraph 1 (the key `join`): join fixed the Arm keep_points.",
      findings: [
        { criterion: "the key `join`", site: { paragraph: 1 }, evidence: "join", class: "shape", key: "join" },
      ],
    }) + "\n",
  );
  const after = comment();
  if (
    !after.includes("finding: shape — the key `join`: join") ||
    !after.includes("repair: keep_points, chosen by the program — the shape Finding at paragraph 1")
  ) {
    fails.push(`(u) the refused Round 1 does not render its shape Finding and its keep_points Repair: ${after}`);
  }
}

// (s13): the repair hook, the site input and the site
// validator over one fixture paragraph, with no job and no model call.
export function repairHookCases(fails) {
  const root = mkdtempSync(join(tmpdir(), "paragraph-plan-repair-"));
  const leg = (id) => ({
    leg_id: id,
    text: `The relation of ${id} holds.`,
    claims: [{ strand: "L1", proposition: "the fixture claim holds." }],
  });
  // (s13) A SHAPE FINDING AND A VOCABULARY FINDING ON WAYPOINT 3: ONE modify_points REPAIR NAMING WAYPOINT 3 ON THE
  // VOCABULARY FINDING'S GROUNDS, THE join REMOVED BY THE PROGRAM, AND NO OTHER POINT CHANGED (kogaki#1815).
  {
    const dir = join(root, "s13");
    const m3 = join(dir, "moves");
    mkdirSync(m3, { recursive: true });
    writeFileSync(join(m3, "ROLES.json"), readFileSync("moves/ROLES.json"));
    writeFileSync(
      join(m3, "p3.yaml"),
      stringifyYaml({
        id: "p3",
        description: "a fixture Move.",
        breaks: ["breaks if a point is dropped."],
        segments: [1, 2, 3].map((k) => ({
          operation: `states step ${k} once, plainly.`,
          ...(k > 1 ? { relation: "follows from the step before." } : {}),
        })),
        takes: [],
        leaves: [],
      }),
    );
    const pw = (k, tag = "") => ({ point: `PW-${k}${tag} the paragraph makes step ${k}.`, serves: ["L1"], cast: {} });
    const entry = {
      paragraph: 1,
      materials: ["L1"],
      purpose: "brings the reader to the first step.",
      depends_on: [],
      rationale: "its takes are met by what the Leg is told.",
      "re-activate": [],
      join: "consequence",
      paragraph_waypoints: [pw(1), pw(2), pw(3)],
    };
    const inputs = {
      legs: [{ ...leg("s1"), the_reader_has_been_told: [] }],
      movesDir: m3,
      runDir: dir,
      axes: [],
      persona: {},
      bound: 2,
    };
    const refusal =
      'Leg s1, paragraph 1: Paragraph 1\'s point 3 carries the Role id "evidence" — a point says the structure in the Correspondence expressions';
    const ctx = {
      standing: {
        version: "1",
        leg_id: "s1",
        move: "p3",
        rationale: "the Move carries the relation.",
        paragraphs: [entry],
      },
      site: 1,
      retry: 1,
      history: [{ entry, refusal, by_judge: false }],
      refusal,
    };
    const { repair, answer } = paragraphPlanSiteRepair(ctx, inputs, "leg-1");
    const rows = existsSync(join(dir, PARAGRAPH_PLAN_REPAIRS_FILE))
      ? readFileSync(join(dir, PARAGRAPH_PLAN_REPAIRS_FILE), "utf8").split("\n").filter(Boolean)
      : [];
    const classes = (repair.findings || []).map((f) => f.class).sort();
    if (
      rows.length !== 1 ||
      repair.arm !== "modify_points" ||
      JSON.stringify(repair.waypoints) !== "[3]" ||
      answer !== undefined ||
      JSON.stringify(classes) !== JSON.stringify(["shape", "vocabulary"]) ||
      !/^the vocabulary Finding at paragraph 1, Waypoint 3 /.test(repair.grounds)
    ) {
      fails.push(
        `(s13) not one modify_points Repair naming Waypoint 3 on the vocabulary Finding's grounds, with a shape Finding beside it: ${rows.length} row(s), ${JSON.stringify(repair)}`,
      );
    }
    ctx.repair = repair;
    const input = paragraphPlanSiteInput(ctx, inputs, "leg-1");
    if (
      !input.repair ||
      JSON.stringify(input.repair.waypoints) !== "[3]" ||
      Object.hasOwn(input.paragraph_as_it_stands, "join") ||
      JSON.stringify(input.paragraph_as_it_stands.paragraph_waypoints) !== JSON.stringify(entry.paragraph_waypoints)
    ) {
      fails.push(
        `(s13) the retry's input does not name Waypoint 3 beside the paragraph less its \`join\`: ${JSON.stringify({ repair: input.repair, stands: input.paragraph_as_it_stands })}`,
      );
    }
    const kept = Object.fromEntries(Object.entries(entry).filter(([k]) => k !== "join"));
    const wrong = validateParagraphPlanSite(
      { ...kept, paragraph_waypoints: [pw(1), pw(2, "-new"), pw(3, "-new")] },
      ctx,
      inputs,
      "leg-1",
    );
    if (
      !wrong.error ||
      !wrong.error.includes("changes Waypoint 2") ||
      !wrong.error.includes("names Waypoint 3 alone")
    ) {
      fails.push(
        `(s13) an answer changing Waypoint 2 under a Repair naming Waypoint 3 was not refused by name: ${JSON.stringify(wrong)}`,
      );
    }
    const right = validateParagraphPlanSite(
      { ...kept, paragraph_waypoints: [pw(1), pw(2), pw(3, "-new")] },
      ctx,
      inputs,
      "leg-1",
    );
    const got = right.record && right.record.paragraphs[0];
    if (
      !got ||
      Object.hasOwn(got, "join") ||
      JSON.stringify(got.paragraph_waypoints.slice(0, 2)) !== JSON.stringify([pw(1), pw(2)]) ||
      !got.paragraph_waypoints[2].point.includes("-new")
    ) {
      fails.push(
        `(s13) an answer changing Waypoint 3 alone was not taken with Waypoints 1 and 2 as they stood: ${JSON.stringify(right)}`,
      );
    }
    // THE MODEL'S CHOICE IS WRITTEN BEFORE IT IS APPLIED.
    const chose = validateParagraphPlanSite(
      { ...kept, arm: "rewrite_all_points", paragraph_waypoints: [pw(1, "-a"), pw(2, "-a"), pw(3, "-a")] },
      ctx,
      inputs,
      "leg-1",
    );
    const last = JSON.parse(readFileSync(join(dir, PARAGRAPH_PLAN_REPAIRS_FILE), "utf8").trim().split("\n").pop());
    if (
      !chose.record ||
      Object.hasOwn(chose.record.paragraphs[0], "arm") ||
      last.arm !== "rewrite_all_points" ||
      last.chosen_by !== "model" ||
      !last.grounds.includes("over modify_points")
    ) {
      fails.push(
        `(s13) an answer naming rewrite_all_points was not written as the model's Repair before it was taken: ${JSON.stringify({ chose, last })}`,
      );
    }
    // (s13) A NARROWING IS NOT OFFERED: under rewrite_all_points an answer naming modify_points is refused by name; and a
    // Leg refused whole keeps each Finding's own class, its grounds naming the Leg rather than a paragraph (PR #1821 round 1).
    const wide = { ...ctx, repair: { arm: "rewrite_all_points", grounds: "g.", findings: [] } };
    const narrowed = validateParagraphPlanSite(
      { ...kept, arm: "modify_points", paragraph_waypoints: [pw(1, "-b"), pw(2), pw(3)] },
      wide,
      inputs,
      "leg-1",
    );
    if (
      !narrowed.error ||
      !narrowed.error.includes("may name rewrite_all_points only where the Repair took modify_points")
    ) {
      fails.push(
        `(s13) an answer narrowing a rewrite_all_points Repair to modify_points was not refused by name: ${JSON.stringify(narrowed)}`,
      );
    }
    const whole = paragraphPlanSiteRepair(
      {
        standing: ctx.standing,
        from: 1,
        history: [],
        refusal: "Leg s1: the plan record carries `waypoints` — the Leg is the unit",
      },
      inputs,
      "leg-1",
    ).repair;
    if (
      !whole ||
      whole.arm !== "change_move" ||
      whole.findings.map((f) => f.class).join() !== "shape" ||
      /paragraph null/.test(whole.grounds) ||
      !whole.grounds.includes("at the Leg")
    ) {
      fails.push(
        `(s13) the Repair of a Leg refused whole does not keep the shape class and name the Leg: ${JSON.stringify(whole)}`,
      );
    }
  }
}
