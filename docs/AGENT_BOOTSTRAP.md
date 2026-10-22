# AGENT_BOOTSTRAP.md — Session Initialization Protocol

> This is the permanent playbook for initializing ANY AI coding agent (opencode, Cursor, Claude Code, ChatGPT, etc.) on the Fajrak project. It forces the agent to load the "Project Brain" before doing any work.

---

## 1. The "Session Init Protocol" (Full Version)

*Copy and paste this block at the start of every new session with a capable agent.*

```text
# SESSION INITIALIZATION PROTOCOL

You are an AI coding agent working on Fajrak (repo: financetracker).
Before you write any code, answer any question, or propose any change, you MUST:

## Step 1: Load the Project Brain (in this exact order)
1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `docs/REPO_INDEX.md` (Optional — only if you need the exact file map)

## Step 2: Confirm understanding (MANDATORY)
Reply with this exact structured summary. DO NOT guess the numbers—extract them from `PROJECT_CONTEXT.md` §4 "Current State".

✅ PROJECT BRAIN LOADED
**Product:** [1-sentence summary]
**Stack:** [Web + Mobile + Backend]
**Current Version:** [Extract exactly from PROJECT_CONTEXT.md §4]
**Test Count:** [Extract exactly from PROJECT_CONTEXT.md §4]
**The 5 Gotchas I've internalized:**
1. DB drift (never `db reset` on prod)
2. Makefile unanchored grep (load-bearing)
3. Zakat centralization (RPCs only)
4. Mock reality (verify APIs before mocking)
5. Version drift (check HANDOFF_REPORT §9)

**Subsystem Router (I will read the relevant domain doc when needed):**
- Islamic Finance → `docs/domain/islamic-finance.md`
- BYOK/MCP → `docs/domain/byok-ai.md`
- Data Model → `docs/domain/data-model.md`
- UI/Mobile → `docs/domain/ui-and-mobile.md`
- Background/Jobs → `docs/domain/background-and-jobs.md`
- Observability/Security → `docs/domain/observability-and-security.md`

**I am ready. What task would you like me to do?**

## Step 3: Wait for my task
Do NOT propose code changes or improvements on your own.

## Step 4: Before ANY code change
State which domain doc you will read based on the task.
Read that domain doc.
State which of the 13 Golden Rules apply.
Only then start coding.
```

---

## 2. Quick, Medium, and Full Versions

*   🟢 **Quick:** (For simple questions) *"Read AGENTS.md and PROJECT_CONTEXT.md. Reply with a 3-line summary proving you understood what Fajrak is, the current version, and the 5 gotchas."*
*   🟡 **Medium:** (For small bug fixes) *"Read AGENTS.md, PROJECT_CONTEXT.md, and the relevant doc in docs/domain/ for my task. State which domain doc you read and which Golden Rules apply."*
*   🔴 **Full:** Use the Session Init Protocol block above (Section 1).

---

## 3. The "No-File-Access" Version (For ChatGPT / Claude Web)

If you are using a web interface that cannot read local files, paste this in your first message:

```text
Here's my project context (read carefully):
--- START OF AGENTS.md ---
[Paste AGENTS.md here]
--- END OF AGENTS.md ---
--- START OF PROJECT_CONTEXT.md ---
[Paste PROJECT_CONTEXT.md here]
--- END OF PROJECT_CONTEXT.md ---
Confirm you understood with a 5-line summary, then wait for my task.
```

---

## 4. Agent-Specific Cheat Sheet

| Agent | Auto-reads `AGENTS.md`? | What to do |
|---|---|---|
| opencode | ✅ Yes | It loads AGENTS.md → AGENT_BOOTSTRAP.md automatically. Paste Section 1 to force the structured confirmation. |
| Cursor | ⚠️ Sometimes | It reads `.cursor/rules/*.mdc` (already present). Paste Section 1; add the protocol as a rule if you want it always-on. |
| Claude Code (CLI) | ⚠️ Reads CLAUDE.md only | CLAUDE.md now opens with a STOP pointer to AGENTS.md / PROJECT_CONTEXT.md. Paste Section 1 if the session ignored it. |
| ChatGPT / Claude Web | ❌ No | Use the "No-File-Access" template (Section 3) |
| Aider | ⚠️ Via flags | Run: `aider --read AGENTS.md --read PROJECT_CONTEXT.md` (Unverified flag, but standard) |

