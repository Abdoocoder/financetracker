#!/usr/bin/env python3
"""Render docs/PROMPTS.md with a CommonMark renderer and check its integrity.

Two failure modes are checked:

1. Every command-matrix table cell must render as exactly ONE code span
   containing the whole command, with no stray text — otherwise a reader
   cannot copy the command out of the table.
2. No paragraph may contain a literal backtick OUTSIDE a code span. That is
   the signature of a code span that terminated early because its content
   contained a backtick (CommonMark has no backslash escape inside a code
   span, so the cell must use double-backtick delimiters instead).

Run from anywhere:

    python3 scripts/render_check_prompts.py

Requires markdown-it-py (`pip install markdown-it-py`); without it the script
prints a SKIP notice and exits 0 so it never blocks a pipeline it cannot run.
"""
import os
import re
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
DOC = os.path.join(REPO, "docs", "PROMPTS.md")

try:
    from markdown_it import MarkdownIt
except ImportError:
    print("SKIP  markdown-it-py is not installed — "
          "`pip install markdown-it-py` to run the render check.")
    sys.exit(0)


def main():
    if not os.path.exists(DOC):
        print(f"FAIL  doc not found: {DOC}")
        return 1

    md = MarkdownIt("commonmark").enable("table")
    html = md.render(open(DOC).read())

    bad = 0

    # ---- 1. command matrix table ------------------------------------------
    tables = re.findall(r"<table>.*?</table>", html, re.S)
    if not tables:
        print("FAIL  no table found")
        return 1

    table = tables[-1]
    rows = re.findall(r"<tr>.*?</tr>", table, re.S)
    print(f"=== rendered command matrix: {len(rows) - 1} data rows ===")
    for row in rows[1:]:
        cells = re.findall(r"<td>(.*?)</td>", row, re.S)
        if len(cells) < 3:
            print(f"FAIL malformed row: {row[:120]}")
            bad += 1
            continue
        num = re.sub(r"<[^>]+>", "", cells[0]).strip()
        exitdoc = re.sub(r"<[^>]+>", "", cells[2]).strip()
        codes = re.findall(r"<code>(.*?)</code>", cells[1], re.S)
        stray = re.sub(r"<code>.*?</code>", "", cells[1], re.S)
        stray = re.sub(r"<[^>]+>", "", stray).strip()
        if len(codes) != 1 or stray:
            bad += 1
            print(f"FAIL row {num}: {len(codes)} code span(s), stray text {stray!r}")
            print(f"     cell: {cells[1][:240]}")
        else:
            cmd = (codes[0].replace("&quot;", '"').replace("&amp;", "&")
                         .replace("&lt;", "<").replace("&gt;", ">"))
            print(f"OK   row {num:<3} exit={exitdoc}  {cmd[:92]}")

    # ---- 2. no literal backtick left in prose ------------------------------
    print()
    print("=== prose paragraphs: no stray backtick outside code spans ===")
    prose = re.findall(r"<p>(.*?)</p>", html, re.S)
    checked = 0
    for p in prose:
        outside = re.sub(r"<code>.*?</code>", "", p, flags=re.S)
        outside = re.sub(r"<[^>]+>", "", outside)
        if "`" in outside:
            bad += 1
            print(f"FAIL stray backtick in prose: {outside.strip()[:200]}")
        checked += 1
    print(f"checked {checked} paragraphs")

    # ---- 3. fenced blocks keep their content verbatim -----------------------
    print()
    print("=== fenced code blocks: backslash-backtick preserved ===")
    fences = re.findall(r'<pre><code class="language-(\w+)">(.*?)</code></pre>', html, re.S)
    for lang, body in fences:
        if "\\`" not in body:
            continue
        if re.search(r"[^\\]\\`", body) is None:
            bad += 1
            print(f"FAIL [{lang}] fence lost its backslash-backtick escapes")
        else:
            print(f"OK   [{lang}] fence preserves \\` escapes")

    print()
    print(f"RESULT: {bad} problems")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
