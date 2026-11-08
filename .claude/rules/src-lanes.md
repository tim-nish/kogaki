---
paths: ["src/**"]
---

A file or directory under `src/` named after a workflow holds that workflow's processes and imports no other workflow's files; shared code lives in `src/workflow/`, `src/compose/` or a top-level file, and only a playground (`proof-sheet`, `mapping-playground`) may import production files.
The rule is `.dependency-cruiser.cjs`, run by `checks/check-dependency-rules.sh` and by the edit hook; a crossing that predates it is a row in `.dependency-cruiser-known-violations.json`, and a new one is moved to a shared home rather than added there.
