---
paths: ["checks/**", "tools/**", ".claude/hooks/**"]
---

A check is a file in the language it is written in, run by the registry through its extension; a shell or Python file carries at most 20 lines of another language in a heredoc, and a longer block is moved to its own file.
The bound is `checks/check-heredoc-bound.py`, run by the registry and by the edit hook; a block that predates it is a row in `.heredoc-known-blocks.json`, and a new one is moved rather than added there.
