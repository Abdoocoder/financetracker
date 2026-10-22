#!/usr/bin/env python3
"""Validate every command documented in docs/PROMPTS.md.

The doc is the source of truth: if a command in the "Command matrix" table, in
the "Verifying a quote against this repo" example, or in the Pitfall prose no
longer produces the exit code the doc claims, this script fails.

Run from anywhere:

    python3 scripts/validate_prompts.py

Exit codes: 0 = every documented command still behaves as documented,
1 = at least one claim drifted.

Four phases:
  1. Command-matrix rows, executed against the repo file + local fixtures.
  2. The same rows, executed through the setup block the doc itself ships
     (so a reader who copy-pastes the doc gets the same result).
  3. The "Verifying a quote against this repo" worked example.
  4. The prose claims made inside the three Pitfall sections.
"""
import os
import re
import subprocess
import sys
import tempfile

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
DOC = os.path.join(REPO, "docs", "PROMPTS.md")

# Repo file the doc quotes from.
F = "docs/domain/ui-and-mobile.md"

# A row may be delimited by one OR two backticks (double is required when the
# command itself contains a backtick).
ROW = re.compile(r"^\|\s*(\d+)\s*\|\s*(`+)(.*?)\2\s*\|\s*(\d+)\s*\|")

passed = failed = 0


def report(ok, label, got, expected, detail=""):
    global passed, failed
    if ok:
        print(f"PASS  {label:<54} exit={got}")
        passed += 1
    else:
        print(f"FAIL  {label:<54} exit={got} (doc says {expected})")
        if detail:
            print(f"      {detail}")
        failed += 1


def run(cmd, env):
    proc = subprocess.run(
        ["bash", "-c", cmd], cwd=REPO, env=env,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    return proc.returncode, proc.stdout.decode(), proc.stderr.decode()


def main():
    global passed, failed

    if not os.path.exists(DOC):
        print(f"FAIL  doc not found: {DOC}")
        return 1

    tmpdir = tempfile.mkdtemp(prefix="validate_prompts_")
    gap = os.path.join(tmpdir, "gap.md")
    noindent = os.path.join(tmpdir, "noindent.md")
    with open(gap, "w") as fh:
        fh.write("alpha beta.\n\ngamma delta.\n")
    with open(noindent, "w") as fh:
        fh.write("the shared\nstate before rendering\n")

    env = dict(os.environ, F=F, GAP=gap, NOINDENT=noindent)
    text = open(DOC).read()

    rows = []
    for line in text.splitlines():
        m = ROW.match(line)
        if m:
            rows.append((m.group(1), m.group(3).replace(r"\|", "|"), m.group(4)))

    if not rows:
        print("FAIL  no command-matrix rows parsed from the doc")
        return 1

    # ---- phase 1: matrix rows against the repo file + fixtures ---------------
    print(f"=== phase 1: {len(rows)} command-matrix rows (repo file + fixtures) ===")
    for num, cmd, exp in rows:
        expected = int(exp)
        got, _, err = run(cmd, env)
        report(got == expected, f"row {num}", got, expected, cmd if got != expected else "")

    # ---- phase 2: the same rows through the doc's own setup block -----------
    setup = ""
    if "Run the matrix with these set" in text:
        seg = text.split("Run the matrix with these set", 1)[1]
        setup = seg.split("```bash", 1)[1].split("```", 1)[0]
    if "GAP=" not in setup or "NOINDENT=" not in setup:
        print("FAIL  the doc's setup block no longer defines GAP/NOINDENT")
        failed += 1
    else:
        print()
        print(f"=== phase 2: {len(rows)} rows re-run through the doc's own setup block ===")
        for num, cmd, exp in rows:
            expected = int(exp)
            got, _, err = run(setup + "\n" + cmd + "\n", env)
            report(got == expected, f"row {num} (doc setup)", got, expected,
                   cmd if got != expected else "")

    # ---- phase 3: the worked example ---------------------------------------
    print()
    print("=== phase 3: worked-example block ===")
    block = text.split("## Verifying a quote against this repo", 1)[1]
    block = block.split("```bash", 1)[1].split("```", 1)[0]

    claims = []
    pending = None
    for raw in block.splitlines():
        line = raw.strip()
        if not line or line.startswith("F="):
            continue
        m = re.match(r"^#\s*(.*?)\s*—\s*exits\s*(\d+)\b", line)
        if m:
            pending = (m.group(1), m.group(2))
            continue
        if pending:
            claims.append((pending[0], pending[1], line))
            pending = None

    for label, exp, cmd in claims:
        expected = int(exp)
        got, _, _ = run(cmd, env)
        report(got == expected, f"example: {label}", got, expected,
               cmd if got != expected else "")

    # ---- phase 4: prose claims ---------------------------------------------
    print()
    print("=== phase 4: prose claims in the Pitfall sections ===")

    def claim(label, expected, cmd, stdout_has=None):
        expected = int(expected)
        got, out, err = run(cmd, env)
        ok = got == expected and (stdout_has is None or stdout_has in out)
        report(ok, label, got, expected,
               (cmd if stdout_has is None or stdout_has not in out else ""))

    # Pitfall 1 prose
    claim("P1 quote as-written is a false negative", "1",
          'grep -Fq "Alerts mutations must update \\`AppState\\` through \\`loadUnreadAlerts()\\`" "$F"')
    claim("P1 tr '\\n' ' ' one-space pattern fails", "1",
          "tr '\\n' ' ' < \"$F\" | grep -Fq \"Alerts mutations must update \\`AppState\\` through \\`loadUnreadAlerts()\\`\"")
    claim("P1 tr '\\n' ' ' three-space pattern works", "0",
          "tr '\\n' ' ' < \"$F\" | grep -Fq \"Alerts mutations must update \\`AppState\\` through   \\`loadUnreadAlerts()\\`\"")
    claim("P1 tr -s bridges the paragraph gap (false positive)", "0",
          "tr -s '[:space:]' ' ' < \"$GAP\" | grep -Fq 'alpha beta. gamma delta.'")
    claim("P1 perl \\s+ bridges the paragraph gap (false positive)", "0",
          "perl -0777 -ne 'print \"MATCH\\n\" if /alpha beta\\.\\s+gamma delta/' \"$GAP\" | grep -q MATCH")
    claim("P1 perl [ \\t]*\\n[ \\t]* rejects the paragraph gap", "1",
          "perl -0777 -ne 'print \"MATCH\\n\" if /alpha beta\\.[ \\t]*\\n[ \\t]*gamma delta/' \"$GAP\" | grep -q MATCH")
    claim("P1 perl [ \\t]*\\n[ \\t]* matches the real file", "0",
          "perl -0777 -ne 'print \"MATCH\\n\" if /Alerts mutations must update `AppState` through[ \\t]*\\n[ \\t]*`loadUnreadAlerts\\(\\)`/' \"$F\" | grep -q MATCH")
    claim("P1 rg -U -F single-line pattern fails", "1",
          'rg -U -F "Alerts mutations must update \\`AppState\\` through \\`loadUnreadAlerts()\\`" "$F"')
    claim("P1 rg -U -F with newline in pattern works", "0",
          "rg -U -F $'Alerts mutations must update \\x60AppState\\x60 through\\n  \\x60loadUnreadAlerts()\\x60' \"$F\"")

    # Pitfall 2 prose
    claim("P2 backtick pattern matches", "0",
          'grep -Fq "Alerts mutations must update \\`AppState\\` through" "$F"')
    claim("P2 plain pattern fails", "1",
          'grep -Fq "Alerts mutations must update AppState through" "$F"')
    claim("P2 tr -d 140 strips backticks", "0",
          "tr -d '\\140' < \"$F\" | grep -Fq 'Alerts mutations must update AppState through'")
    claim("P2 optional-backtick PCRE matches", "0",
          'grep -Pzo "Alerts mutations must update [\\x60]?AppState[\\x60]? through" "$F"')

    # Pitfall 3 prose
    claim("P3 fragment matches and prints line 107", "0",
          'grep -n -F "Alerts mutations must update" "$F"',
          stdout_has="107:  (unread badge, theme, language). Alerts mutations must update `AppState` through")
    claim("P3 sed range reads 107-108", "0",
          "sed -n '107,108p' \"$F\"", stdout_has="`loadUnreadAlerts()` / `decrementUnreadAlerts()`")

    print()
    print(f"RESULT: {passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
