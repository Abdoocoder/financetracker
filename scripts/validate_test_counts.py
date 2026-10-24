#!/usr/bin/env python3
"""Guard PROJECT_CONTEXT.md §4 test counts against silent drift.

PROJECT_CONTEXT.md §4 is the single source of truth for test counts. This script
re-runs both suites, parses the real totals, and compares them to the documented
numbers. It never writes: on drift it fails and a human decides what the change
means (a bot commit would rewrite history and could mask a deleted test file).

Usage:
    python3 scripts/validate_test_counts.py            # both suites (local)
    python3 scripts/validate_test_counts.py --web      # CI: web job (no Flutter)
    python3 scripts/validate_test_counts.py --flutter  # CI: mobile job (no node_modules)
    python3 scripts/validate_test_counts.py --doc=F   # compare against another file

Exit codes: 0 in sync, 1 drift / suite failure / toolchain missing.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOC = ROOT / "PROJECT_CONTEXT.md"
MOBILE = ROOT / "mobile" / "fajrak_flutter"

# Matches the §4 bullet:
#   - **Tests (re-run 2026-10-22):** **636 web tests / 71 Jest suites** ... **208 Flutter tests** ...
DOC_PATTERN = re.compile(
    r"\*\*(?P<web>\d+) web tests / (?P<suites>\d+) Jest suites\*\*"
    r".*?"
    r"\*\*(?P<flutter>\d+) Flutter tests\*\*"
)

ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


def fail(msg: str) -> None:
    print(f"❌ {msg}", file=sys.stderr)


def read_documented(doc: Path) -> tuple[int, int, int] | None:
    if not doc.is_file():
        fail(f"{doc} not found")
        return None
    text = doc.read_text(encoding="utf-8")
    match = DOC_PATTERN.search(text)
    if not match:
        fail(
            f"could not find the test-count bullet in {doc.name}. Expected a line "
            "like: **636 web tests / 71 Jest suites** ... **208 Flutter tests**"
        )
        return None
    return (
        int(match["web"]),
        int(match["suites"]),
        int(match["flutter"]),
    )


def measure_web() -> tuple[int, int] | None:
    if not shutil.which("npx"):
        fail("npx not found — cannot run Jest")
        return None
    if not (ROOT / "node_modules").is_dir():
        fail("node_modules missing — run `npm ci` first")
        return None

    with tempfile.TemporaryDirectory() as tmp:
        report = Path(tmp) / "jest.json"
        # --outputFile keeps the JSON off stdout, where jest's human-readable
        # reporter also writes and would corrupt the parse.
        proc = subprocess.run(
            ["npx", "jest", "--ci", "--json", f"--outputFile={report}"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        if not report.is_file():
            fail("Jest produced no JSON report")
            print(proc.stdout[-2000:], file=sys.stderr)
            print(proc.stderr[-2000:], file=sys.stderr)
            return None
        data = json.loads(report.read_text(encoding="utf-8"))

    total = data.get("numTotalTests", 0)
    suites = data.get("numTotalTestSuites", 0)
    failed = data.get("numFailedTests", 0)
    if failed:
        # A red suite is not "drift" — say so plainly instead of blaming the doc.
        fail(f"{failed} Jest test(s) failed — fix the suite before validating counts")
        return None
    print(f"   measured web: {total} tests / {suites} suites")
    return total, suites


def measure_flutter() -> int | None:
    if not shutil.which("flutter"):
        fail("flutter not found on PATH")
        return None
    if not (MOBILE / "pubspec.yaml").is_file():
        fail(f"{MOBILE} not found")
        return None

    proc = subprocess.run(
        ["flutter", "test"],
        cwd=MOBILE,
        capture_output=True,
        text=True,
    )
    # `flutter test` writes progress (and the final count) to stderr.
    output = ANSI.sub("", proc.stdout + proc.stderr)
    if proc.returncode != 0:
        fail(f"flutter test failed (exit {proc.returncode})")
        print("\n".join(output.splitlines()[-20:]), file=sys.stderr)
        return None

    # Two reporter formats:
    #   compact (local default): `00:06 +208: All tests passed!`
    #   github (auto-selected when GITHUB_ACTIONS=true): `🎉 208 tests passed.`
    # The github reporter omits the `+N:` prefix; the fallback counters below
    # also fail on it, so match the numeric phrase directly.
    # The negative lookahead rejects `N tests passed, M failed.` (failed runs
    # are already filtered by the returncode check, but this keeps the regex
    # honest if that ever changes).
    match = re.search(r"\+(\d+): All tests passed!", output)
    if not match:
        match = re.search(r"(\d+)\s+tests?\s+passed\.?(?!\s*,)", output)
    if not match:
        # Fallback: highest +N counter (compact reporter for partial output).
        counters = [int(n) for n in re.findall(r"\+(\d+):", output)]
        if not counters:
            fail("could not parse a test total from `flutter test` output")
            return None
        total = max(counters)
    else:
        total = int(match.group(1))
    print(f"   measured flutter: {total} tests")
    return total


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--web",
        action="store_true",
        help="only validate the Jest counts (web CI job)",
    )
    parser.add_argument(
        "--flutter",
        action="store_true",
        help="only validate the Flutter count (mobile CI job)",
    )
    parser.add_argument(
        "--doc",
        default=str(DOC),
        help="doc to read counts from (default: PROJECT_CONTEXT.md)",
    )
    args = parser.parse_args()

    run_web = args.web or not args.flutter
    run_flutter = args.flutter or not args.web

    doc = Path(args.doc)
    if not doc.is_absolute():
        doc = (ROOT / doc).resolve()

    documented = read_documented(doc)
    if documented is None:
        return 1
    doc_web, doc_suites, doc_flutter = documented
    print(f"   documented: {doc_web} web / {doc_suites} suites / {doc_flutter} flutter")

    drift: list[str] = []

    if run_web:
        measured = measure_web()
        if measured is None:
            return 1
        web, suites = measured
        if web != doc_web:
            drift.append(f"web tests:     documented {doc_web}, measured {web}")
        if suites != doc_suites:
            drift.append(f"Jest suites:   documented {doc_suites}, measured {suites}")

    if run_flutter:
        flutter = measure_flutter()
        if flutter is None:
            return 1
        if flutter != doc_flutter:
            drift.append(
                f"flutter tests: documented {doc_flutter}, measured {flutter}"
            )

    if drift:
        print("\n❌ DRIFT DETECTED — the doc disagrees with the code:", file=sys.stderr)
        for line in drift:
            print(f"   {line}", file=sys.stderr)
        print(
            f"\n   Update {doc.name} §4 to the measured numbers, or find out why "
            "tests disappeared. Do not paper over it by editing the validator.",
            file=sys.stderr,
        )
        return 1

    print("✅ Test counts are in sync.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
