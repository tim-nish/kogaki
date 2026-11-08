#!/usr/bin/env python3
"""Delegates to `gate-executor-invocation.py`, this hook's name since kogaki#1741.

A session keeps the hook paths it loaded at start, so one started before the
rename still runs this path; without it every Bash call there is refused.
Remove once no session predating kogaki#1741 runs (PR #1744 round 1).
"""
import os
import runpy

runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), "gate-executor-invocation.py"),
               run_name="__main__")
