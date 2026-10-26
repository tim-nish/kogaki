<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-21
repo: Kogaki
grain: lesson

## Trigger — what happened

Two Leg runs on 2026-10-20, three hours apart, with two small changes merged between them (a sheet-rendering change and the removal of one register paragraph from the Writer's input), produced prose of visibly different quality in every paragraph, and the owner read it as a regression caused by the changes. Stage-by-stage diff showed the Extractor's prompt byte-identical across the runs, the Brief's prompt differing only by the Extraction's content, and the Writer's prompt differing by the removed paragraph plus a Packet whose claims, term kinds and waypoint wording the Brief had written differently this time. Re-running the Writer on the old Packet without the paragraph gave the old quality; re-running it on the new Packet with the paragraph restored gave the new quality.

## The learning

When output quality moves across two runs of a multi-stage model pipeline and a change landed between them, do not attribute until each stage's input has been diffed against the earlier run's. A stage whose prompt is byte-identical and whose output differs is run-to-run variance, and a downstream stage inherits that variance through its input. The decisive test is cheap: re-run the last stage on the earlier run's input with the change applied, and on the later run's input with the change reverted. If the quality follows the input and not the change, the change is cleared and the variance is the finding. A judgment the pipeline leaves to the model with no fixed answer, such as whether a term is the author's coinage or an established one, is a point where that variance enters and then reaches every paragraph at once.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
