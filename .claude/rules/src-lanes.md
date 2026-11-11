---
paths: ["src/**"]
---

A file or directory under `src/` named after a workflow holds that workflow's processes and imports no other workflow's files; shared code lives in `src/workflow/`, `src/compose/` or a top-level file, and only a playground (`proof-sheet`, `mapping-playground`, `flp`, `leg-planning`) may import production files.
The rule is `.dependency-cruiser.cjs`, run by `checks/check-dependency-rules.sh` and by the edit hook; a crossing that predates it is a row in `.dependency-cruiser-known-violations.json`, and a new one is moved to a shared home rather than added there.
The JavaScript lint is `eslint.config.mjs`, run by `checks/check-eslint.sh` and by the edit hook; a finding that predates it is a row in `eslint-suppressions.json`, and a new one is fixed rather than added there.
The type check is `jsconfig.json`, run by `checks/check-types.py` and by the edit hook; a finding that predates it is a row in `tsc-baseline.json`, and a new one is fixed rather than added there.
The formatter is `.prettierrc.json`, run by `checks/check-format.py` and by the edit hook; a file that differs is fixed with `npx prettier --write <file>` and never hand-formatted.
