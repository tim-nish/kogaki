<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A review round could not be spawned because the tool refused with '1 spawn(s) live against a bound of 1'. I wrote a wait that blocked until the other job's marker file disappeared. The directory turned out to hold about 140 such marker files going back three weeks — the tool never deletes them. It reads the process id inside the file and asks whether that process is still alive. The wait I wrote would have run forever, and it looked exactly like a job that was simply taking a long time.

## The learning

Before waiting on a file to disappear, check that something actually deletes it. A marker file that a tool writes to say 'this job is running' is not always removed when the job ends — often the tool decides liveness by reading what is inside the file instead, and leaves the file itself lying around forever. The two look identical from outside: in both designs the file exists while the job runs. The difference only shows up afterwards, and by then the wait is already stuck. The cheap check is to list the directory: if it holds old files for work that plainly finished long ago, absence is not the signal, and the wait has to read the file's contents and ask the same question the tool asks.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
