# The capture row and the run record, asserted together (kogaki#625 item 1).
# Split out of check-terrain-workflow.sh because a python heredoc nested inside
# a shell heredoc inside this block is exactly the quoting that goes wrong
# silently — and a check whose assertions do not run is the failure class this
# block exists to close.
import json, os, sys

d = sys.argv[1]
cap = os.path.join(d, "terrain.gate-capture.json")
if not os.path.exists(cap):
    print("FAIL: a valid capture wrote no capture row — the answer is recorded nowhere a later reader can see it")
    raise SystemExit(1)

row = json.load(open(cap))["rows"][-1]
rec = json.load(open(os.path.join(d, "run-record.json")))
bad = []
if row.get("gate_id") != "terrain-strand-selection":
    bad.append("the row names gate_id %r rather than the gate the state declares" % (row.get("gate_id"),))
if (row.get("evidence") or {}).get("tool_use_id") != "tu_1":
    bad.append("the tool_use_id evidence is not carried into the row — evidence, not a claim")
if ((row.get("payload") or {}).get("answer") or {}).get("option") != "strand:a":
    bad.append("the answered option is not recorded")
if "strand:a" not in ((row.get("payload") or {}).get("options_offered") or []):
    bad.append("options_offered does not carry what the declaration offered, so the row cannot say which question was answered")
if (rec.get("owner_input") or {}).get("STRAND_SELECTION") != "strand:a":
    bad.append("the captured answer did not become the wait's owner input — adoption IS applying the captured answer, so a capture recording nothing on the run record leaves the wait unanswered")
if bad:
    print("FAIL: the capture row or the run record is incomplete:")
    for b in bad:
        print("    - " + b)
    raise SystemExit(1)
print("ok: gate path — declaration WRITTEN and named, bare --input refused, unoffered option refused, evidence required, and a valid capture records its row AND the wait's owner input")
