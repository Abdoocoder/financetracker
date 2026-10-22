# PROMPTS.md — Agent verification lessons

> **Verified:** 2026-10-21. Every command below was executed against
> `docs/domain/ui-and-mobile.md` and against throwaway fixtures. The observed exit
> codes are recorded inline and repeated in the command matrix below.
> **Audience:** agents and reviewers working in this repo.
> **Purpose:** record verification traps that produce false accusations, so a failed
> tool call is never mistaken for a fabricated quote.

Lessons are appended here as they are learned. Each section names the tool call that
returns a false negative, the call that replaces it, and the observable that
separates the two.

---

## Quote Test — Verification Pitfalls

> ⚠️ **Two recipes originally suggested for this section were WRONG when
> executed** (`tr -d '\n'` glues words; `grep -F "AppState through"` fails
> because backticks are literal). They are preserved below as examples of
> anti-patterns. **Only commands in the
> [Command matrix](#command-matrix) table are safe to copy** — and those are
> validated by `scripts/validate_prompts.py`.

### Pitfall 1: grep -F is line-based

A multi-line quote (wrapped paragraph) will ALWAYS fail `grep -F`, even when
verbatim. This is a false negative, NOT fabrication.

**Correct verification:**

```bash
# 1. Locate the line number, then read the range — always works.
grep -n -F "Alerts mutations must update" file.md   # → 107
sed -n '107,108p' file.md                            # eyeball the range

# 2. Or match across the break in one call. -z makes the file one record,
#    -P enables PCRE, and [ \t]*\n[ \t]* bridges exactly one line break
#    while absorbing the indentation of the continuation line.
#    Escape the parens: in PCRE "()" is an empty capture group, not a literal paren.
grep -Pzo "Alerts mutations must update \`AppState\` through[ \t]*\n[ \t]*\`loadUnreadAlerts\(\)\`" file.md
```

**Observed:** this quote is verbatim in `docs/domain/ui-and-mobile.md` but spans
lines 107-108:

```text
Alerts mutations must update `AppState` through `loadUnreadAlerts()`
```

```bash
grep -Fq "Alerts mutations must update \`AppState\` through \`loadUnreadAlerts()\`" docs/domain/ui-and-mobile.md
```

exits **1**. It is a false negative, not a fabrication.

**`tr -d '\n'` does NOT fix this.** Deleting the newline glues the adjacent words
together (`the shared` + `state` becomes `the sharedstate`), so the search still
exits 1. Translate the newline to a space instead — but note that a plain
`tr '\n' ' '` is only a *partial* fix: it preserves the continuation line's
indentation, so the joined text carries **three** spaces between `through` and
the backtick-quoted `loadUnreadAlerts()`. A one-space pattern exits 1; the
three-space pattern exits 0.

`tr -s '[:space:]' ' '` collapses every run of whitespace, so it does match — but it
also collapses **paragraph breaks**, so it can bridge two unrelated paragraphs and
report a match that is not in the file. Verified false positive: on a file
containing `alpha beta.` / blank line / `gamma delta.`, `tr -s '[:space:]' ' '`
matches `alpha beta. gamma delta.` (exit 0), and Perl's `\s+` does the same. Only the
`[ \t]*\n[ \t]*` form is paragraph-safe: it requires exactly one line break and
rejects the paragraph gap (exit 1).

**`rg -U -F` has the same trap.** The `-U` flag allows the *pattern* to contain a
newline; it does not join lines for you. `rg -U -F "one continuous sentence"` against
a wrapped quote exits 1. It matches only when the pattern itself carries the
newline: `rg -U -F $'line one\nline two'` exits 0.

### Pitfall 2: backticks and formatting

Agents may add backticks around code identifiers when quoting. This is
markdown-correct, not paraphrase. Strip backticks before comparing if needed:

```bash
# The backtick is a literal character — search for it, don't search past it.
grep -Fq "Alerts mutations must update \`AppState\` through" file.md   # exit 0

# Or strip the backticks from the file first (\140 is octal for a backtick).
tr -d '\140' < file.md | grep -Fq "Alerts mutations must update AppState through"

# Or make the backtick optional in a PCRE pattern.
grep -Pzo "Alerts mutations must update [\x60]?AppState[\x60]? through" file.md
```

**Observed:** a file containing `` `AppState` through `` is NOT matched by
`grep -Fq "AppState through"`, which exits **1**. The backtick sits literally
between `AppState` and `through` and breaks the substring match. Searching the plain
form works only when the source itself is unformatted.

**The two pitfalls compose.** Stripping backticks does not repair a line wrap, and
collapsing lines does not repair a backtick. The quote

```text
Alerts mutations must update `AppState` through `loadUnreadAlerts()`
```

needs both fixes at once.

### Pitfall 3: partial-line context

If the quote starts mid-line (e.g. after a bullet or another clause), `grep -F` on the
full sentence fails. Search on the distinctive fragment:

```bash
grep -n -F "Alerts mutations must update" file.md
```

**Observed:** `grep -n -F "Alerts mutations must update" docs/domain/ui-and-mobile.md`
exits **0** and prints:

```text
107:  (unread badge, theme, language). Alerts mutations must update `AppState` through
```

The fragment sits at the tail of a longer line that also carries a bullet prefix.
The `-n` variant returns the line number, so the surrounding range can be read
directly with `sed -n '107,108p'`.

### Rule of thumb

Before accusing an agent of fabrication:

1. Did the quote span multiple lines? → use `sed`, not `grep -F`.
2. Did it add backticks/quotes? → strip them.
3. Did it start mid-line? → search the fragment.

Only after all three checks fail → confront the agent.

Cost of skipping this: one wasted round-trip, damaged trust, and an agent that learns
the wrong lesson.

---

## Command matrix

Verified 2026-10-21 against `docs/domain/ui-and-mobile.md` (the quote spans lines
107-108) and against the fixtures described below. Every row is copy-pasteable and
was executed; the exit code in the third column is the observed one.

> Run `python3 scripts/validate_prompts.py` after editing this file.
> Non-zero exit = a documented command no longer produces its
> documented exit code.
>
> The same script re-checks the Pitfall commands and the worked example at the
> end of this file, so a stale command anywhere in the document fails the run.

| # | Command | Exit | Meaning |
|---|---|---|---|
| 1 | ``grep -Fq "Alerts mutations must update \`AppState\` through \`loadUnreadAlerts()\`" "$F"`` | 1 | **False negative** — quote is verbatim but wrapped |
| 2 | ``grep -Pzo "Alerts mutations must update \`AppState\` through[ \t]*\n[ \t]*\`loadUnreadAlerts\(\)\`" "$F"`` | 0 | Correct match across one line break |
| 3 | `grep -Pzo "alpha beta\.[ \t]*\n[ \t]*gamma delta" "$GAP"` | 1 | Correctly rejects a paragraph gap |
| 4 | `grep -Fq "Alerts mutations must update AppState through" "$F"` | 1 | **False negative** — backticks are literal |
| 5 | `tr -d '\140' < "$F" \| grep -Fq "Alerts mutations must update AppState through"` | 0 | Backticks stripped, single-line fragment |
| 6 | `grep -n -F "Alerts mutations must update" "$F"` | 0 | Fragment search, prints line `107` |
| 7 | ``rg -U -F "Alerts mutations must update \`AppState\` through \`loadUnreadAlerts()\`" "$F"`` | 1 | `-U` does not join lines |
| 8 | `rg -U -F $'Alerts mutations must update \x60AppState\x60 through\n  \x60loadUnreadAlerts()\x60' "$F"` | 0 | Matches when the pattern carries the newline |
| 9 | ``tr '\n' ' ' < "$F" \| grep -Fq "Alerts mutations must update \`AppState\` through \`loadUnreadAlerts()\`"`` | 1 | Translate keeps the indent: 3 spaces, not 1 |
| 10 | ``tr -s '[:space:]' ' ' < "$F" \| grep -Fq "Alerts mutations must update \`AppState\` through \`loadUnreadAlerts()\`"`` | 0 | Matches, but bridges paragraph gaps — unsafe |
| 11 | `tr -s '[:space:]' ' ' < "$GAP" \| grep -Fq "alpha beta. gamma delta."` | 0 | **False positive** — bridges a paragraph gap |
| 12 | `tr -d '\n' < "$NOINDENT" \| grep -Fq "the shared state before rendering"` | 1 | **Wrong** — delete glues words into `the sharedstate` |
| 13 | `grep -Pzo "Alerts mutations must update [\x60]?AppState[\x60]? through[ \t]*\n[ \t]*[\x60]?loadUnreadAlerts\(\)[\x60]?" "$F"` | 0 | Both pitfalls at once — optional backticks + line break |

Run the matrix with these set. The two fixtures are created on the spot — the
matrix needs a paragraph-gap file and a no-indent file to prove the false-positive
cases:

```bash
F=docs/domain/ui-and-mobile.md

# "alpha beta." / blank line / "gamma delta." — the paragraph-gap false positive.
GAP=$(mktemp)
printf 'alpha beta.\n\ngamma delta.\n' > "$GAP"

# "the shared" / "state before rendering" — no indentation, the tr -d '\n' case.
NOINDENT=$(mktemp)
printf 'the shared\nstate before rendering\n' > "$NOINDENT"
```

`"$F"` is quoted on purpose: `< F` reads a file literally named `F`, it does not
expand the variable.

---

## Verifying a quote against this repo

The worked example above uses a real line from this repo: `docs/domain/ui-and-mobile.md`,
section 5, "Provider rebuilds". The source reads:

```text
106: - **Provider rebuilds**: `AppState.notifyListeners()` rebuilds every consumer
107:   (unread badge, theme, language). Alerts mutations must update `AppState` through
108:   `loadUnreadAlerts()` / `decrementUnreadAlerts()` / `clearUnreadAlerts()` after the
```

The full sentence has all three pitfalls at once — it wraps across 107-108, it
carries backticks around `AppState` and `loadUnreadAlerts()`, and its first clause is
preceded by a bullet prefix on line 106. That makes it a good regression case.

```bash
F=docs/domain/ui-and-mobile.md

# Pitfall 1 — exits 1: the sentence is wrapped across lines 107-108
grep -Fq "Alerts mutations must update \`AppState\` through \`loadUnreadAlerts()\`" "$F"

# Pitfall 1 corrected — exits 0
grep -Pzo "Alerts mutations must update \`AppState\` through[ \t]*\n[ \t]*\`loadUnreadAlerts\(\)\`" "$F"

# Pitfall 2 — exits 1: the source carries literal backticks around AppState
grep -Fq "Alerts mutations must update AppState through" "$F"

# Pitfall 2 corrected — exits 0
tr -d '\140' < "$F" | grep -Fq "Alerts mutations must update AppState through"

# Both pitfalls at once, corrected — exits 0
grep -Pzo "Alerts mutations must update [\x60]?AppState[\x60]? through[ \t]*\n[ \t]*[\x60]?loadUnreadAlerts\(\)[\x60]?" "$F"

# Pitfall 3 — exits 0, prints the line number so the range can be read
grep -n -F "Alerts mutations must update" "$F"
sed -n '107,108p' "$F"
```
