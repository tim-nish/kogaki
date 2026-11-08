#!/usr/bin/env node
// THE DETACHED JOB'S SUPERVISOR ENTRY POINT (kogaki#1193; moved here by kogaki#1741).
// Reached only by `startDetachedJobSupervisor`'s own `spawn(process.execPath,
// [this file, ...])` in `./detached-job.mjs` -- never by a Bash command a session
// could type. Every lane that starts a Detached Job spawns this file, so it is
// named for no lane.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cmdJobSupervise } from "./detached-job.mjs";

// Every flag `startDetachedJobSupervisor` passes is a `--key value` pair.
export function parseSuperviseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[a.slice(2)] = true;
    else { args[a.slice(2)] = next; i++; }
  }
  return args;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cmdJobSupervise(parseSuperviseArgs(process.argv.slice(2)));
}
