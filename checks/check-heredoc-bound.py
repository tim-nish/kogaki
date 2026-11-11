#!/usr/bin/env python3
# No interpreter heredoc in a tracked .sh or .py file is longer than 20 lines
# outside the known-blocks baseline, and the baseline names no block that is
# gone or has grown (kogaki#1790). A block is `node`, `python3`, `python`,
# `bash` or `sh` on one line with `<<` and a tag, up to the tag's own line.
# The contract and the mutation evidence are this member's admission record
# in checks/registry.json. The fixture pass runs on every full scan.
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

BOUND = 20
BASELINE = ".heredoc-known-blocks.json"
HOOK = ".claude/hooks/lint-on-edit.py"
RULE_FILE = ".claude/rules/checks-language.md"
INTERPRETER = re.compile(r"(?:^|[\s(|;&/`])(node|python3|python|bash|sh)(?=\s|$)")
TAG = re.compile(r"(?<!<)<<(?!<)(-?)\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\2")


def blocks(text):
    """Every interpreter heredoc in `text` as (interpreter, body line count)."""
    found, lines, i = [], text.split("\n"), 0
    while i < len(lines):
        tag = TAG.search(lines[i])
        names = INTERPRETER.findall(lines[i][:tag.start()]) if tag else []
        if not names:
            i += 1
            continue
        end = i + 1
        while end < len(lines):
            line = lines[end].lstrip("\t") if tag.group(1) else lines[end]
            if line == tag.group(3):
                break
            end += 1
        found.append((names[-1], end - i - 1))
        i = end + 1
    return found


def judge(files, rows, whole=True):
    """Findings for {path: text} against the baseline rows; `whole` also
    refuses rows naming a file outside `files`."""
    have, want = {}, {}
    for path, text in files.items():
        for name, count in blocks(text):
            if count > BOUND:
                have.setdefault((path, name), []).append(count)
    for row in rows:
        if whole or row["file"] in files:
            want.setdefault((row["file"], row["interpreter"]), []).append(
                row["lines"])
    findings = []
    for key in sorted(set(have) | set(want)):
        got = sorted(have.get(key, []), reverse=True)
        listed = sorted(want.get(key, []), reverse=True)
        for n, count in enumerate(got):
            if n >= len(listed):
                findings.append("%s: a %s heredoc of %d lines is over the "
                                "%d-line bound; move it to its own file"
                                % (key[0], key[1], count, BOUND))
            elif count > listed[n]:
                findings.append("%s: a %s heredoc grew from %d to %d lines"
                                % (key[0], key[1], listed[n], count))
        for count in listed[len(got):]:
            findings.append("%s: the baseline row for a %s heredoc of %d "
                            "lines names no block over the bound; remove it"
                            % (key[0], key[1], count))
    return findings


def heredoc(name, count, tag="JS"):
    opener = "exec %s - <" % name + "<'%s'" % tag
    return "\n".join([opener] + ["x"] * count + [tag, ""])


def hook(root, count):
    """The edit hook's answer for a shell file carrying a `count`-line block,
    in a copied tree whose baseline is empty."""
    with tempfile.TemporaryDirectory() as tmp:
        tree = pathlib.Path(tmp)
        for rel in ("checks/check-heredoc-bound.py", HOOK):
            (tree / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(root / rel, tree / rel)
        (tree / BASELINE).write_text("[]\n")
        (tree / "a.sh").write_text(heredoc("node", count))
        payload = {"tool_name": "Edit",
                   "tool_input": {"file_path": str(tree / "a.sh")}}
        return subprocess.run([sys.executable, str(tree / HOOK)],
                              input=json.dumps(payload), capture_output=True,
                              text=True)


def fixtures(root):
    prelude = "#!/usr/bin/env bash\nset -eu\n"
    row = {"file": "a.sh", "interpreter": "node", "lines": 30}
    cases = [
        ("(c1) a 21-line node heredoc in a shell file fails naming file, interpreter and count",
         judge({"a.sh": prelude + heredoc("node", 21)}, [])
         == ["a.sh: a node heredoc of 21 lines is over the 20-line bound; "
             "move it to its own file"]),
        ("(c2) the same heredoc at 20 lines passes",
         judge({"a.sh": prelude + heredoc("node", 20)}, []) == []),
        ("(c3) a listed block that grew by one line fails",
         judge({"a.sh": prelude + heredoc("node", 31)}, [row])
         == ["a.sh: a node heredoc grew from 30 to 31 lines"]),
        ("(c4) a baseline row whose block is gone fails",
         judge({"a.sh": prelude}, [row])
         == ["a.sh: the baseline row for a node heredoc of 30 lines names "
             "no block over the bound; remove it"]),
        ("(c5) a listed block at its count passes, and a herestring or a "
         "non-interpreter heredoc is not a block",
         judge({"a.sh": prelude + heredoc("node", 30) + "cat <" + "<EOF\n"
                + "y\n" * 30 + "EOF\npython3 <<< x\n"}, [row]) == []),
        ("(c6) a single-file judgment ignores rows for other files",
         judge({"b.py": "pass\n"}, [row], whole=False) == []),
    ]
    ran = hook(root, 21)
    cases.append(("(c7) the edit hook returns the finding for an edited shell "
                  "file", ran.returncode == 2
                  and "a.sh: a node heredoc of 21 lines" in ran.stderr))
    ran = hook(root, 20)
    cases.append(("(c8) the edit hook passes the same file at 20 lines",
                  ran.returncode == 0 and not ran.stderr))
    cases.append(("(c9) the rule file names this member",
                  "checks/check-heredoc-bound.py"
                  in (root / RULE_FILE).read_text()))
    return [label for label, ok in cases if not ok]


def main(argv):
    root = pathlib.Path(__file__).resolve().parent.parent
    rows = json.loads((root / BASELINE).read_text())
    failed = []
    # `--file` is the edit hook's mode, which fixture (c7) itself runs.
    if argv[:1] == ["--file"]:
        files = {rel: (root / rel).read_text(errors="replace")
                 for rel in argv[1:] if (root / rel).is_file()}
        findings = judge(files, rows, whole=False)
    else:
        listed = subprocess.run(["git", "ls-files", "-z", "--", "*.sh",
                                 "*.py"], cwd=root, capture_output=True,
                                text=True, check=True).stdout
        files = {rel: (root / rel).read_text(errors="replace")
                 for rel in listed.split("\0") if rel and (root / rel).is_file()}
        findings = judge(files, rows)
        failed = fixtures(root)
    for label in failed:
        print("FAIL fixture %s" % label)
    for finding in findings:
        print("FAIL %s" % finding)
    if failed or findings:
        return 1
    print("check-heredoc-bound: PASS (%d known block(s), 9 fixture cases)"
          % len(rows))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
