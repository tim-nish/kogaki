<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-28
repo: Kogaki
grain: lesson

## Trigger — what happened

An issue proposed removing two command-line entry points that were writing owner artifacts outside the control plane. Its search declaration was genuinely thorough: the dispatcher's full case list, all four entry-point maps in the workflow table, both run directories on disk, and every open issue in the repository. The disposition was already ratified, the defect was real, and every claim in the body checked out in the tree. Performing the removal broke thirty of the forty-one process-spawn sites in the repository's largest check, which drives those same two entry points to build its fixtures. Nothing in the search had looked at what CALLED the things being removed — every item enumerated was a place that DEFINED or DECLARED them. The break was not subtle and was not far away; it was one grep in the other direction.

## The learning

An entry point is one end of a relation, and a search for it naturally walks the end you are standing on. When the act is REMOVAL, the relevant population is the other end — callers, consumers, dependents — and that population is invisible to every query phrased around the thing itself, because those files do not define it, declare it, or mention it in the vocabulary the definition uses. They just call it. So a search can be exhaustive over definitions and declarations, read as complete because it enumerated four maps and a full case list, and still have zero coverage of the set that determines whether the removal is possible. The asymmetry is what makes this durable rather than a slip: the defining side is a closed set the artifact can enumerate against itself, while the calling side points IN from files that have no other relationship to the subject and appear in no index of it. Two riders. First, a consumer's use is often not the defect: here the thirty broken sites redirected their output to a throwaway directory and wrote no owner artifact at all, so they were never instances of the harm — which means the removal was priced against the wrong population twice over, missing the consumers and then also mischaracterising them. Second, the honest form of the check is cheap and directional: for any act framed as REMOVING or RETIRING something, run one search for what invokes it, separately from and after the search for what defines it, and state the two counts apart. The tell that you have not is a search declaration whose items are all of one kind — maps, declarations, definitions, records — with nothing in it that would only appear if someone had asked who is using this.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
