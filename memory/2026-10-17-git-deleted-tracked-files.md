# DEBUG REPORT — Untracked working-tree deletions blocking fast-forward

**Date:** 2026-10-17
**Status:** DONE

## Symptom
`git status` showed 185 files as unstaged deletions (`.opencode/`, `.taskmaster/`, `skills-lock.json`) while `main` was 4 commits behind `origin/main` (fast-forwardable).

## Root cause
The directories were deleted from disk by an external process (likely an agent/config cleanup session — no matching `rm` in recent shell history, reflog showed no git operations that would explain it). Since git still tracked the files, this left the working tree dirty and would have blocked `git pull` (fast-forward would refuse to overwrite the deletions, since `origin/main` modifies `.opencode/opencode.json` in `a644caab`).

## Fix
1. `git checkout -- .opencode .taskmaster skills-lock.json` — restored all 185 files from HEAD; working tree clean.
2. `git pull --ff-only` — fast-forwarded `d2bb3b7e..7de5b4f6` (4 commits: gamification unification fix, MCP dart timeout 90s, secure_configs gitignore, HANDOFF_REPORT.md).

## Evidence
- Pre-fix: `git diff HEAD --stat` showed 185 files / 90307 deletions (all unstaged).
- Post-fix: `git status` → "working tree clean", branch up to date with `origin/main`.
- Files confirmed present on disk after restore (`ls .opencode` succeeded via checkout output).

## Regression test
N/A (git state repair, not code).

## Related
- `.opencode/opencode.json` is actively modified on origin (`a644caab`). If a cleanup tool keeps deleting `.opencode/`, consider adding it to a protected list in that tool or gitignoring it instead of tracking it.
- No prior bugs in this area found in reflog/history.

## Lessons
- Deleting tracked files from disk (instead of `git rm`) creates a "dirty deletions" state that silently blocks the next `git pull --ff-only`.
- Cleanup tools should check `git ls-files` before removing directories inside a repo.
