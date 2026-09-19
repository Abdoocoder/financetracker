---
format: 1920x1080
message: YNAB was built for Seattle. We built Fajrak for Amman, Riyadh, Cairo — centralized logic, halal investing, Zakat auto-fill, MCP server, all free.
arc: Problem → Journey → Working App → Islamic Tools → Brand Lock
audience: Arabic-speaking founders, fintech builders, users who want financial awareness in their language
---

## Frame 1 — Hook: The Question
- duration: 2.5s
- transition_in: hard_cut
- status: confirmed
- src: compositions/frames/01-hook.html

Black screen. Arabic text types out character-by-character: "كل شهر نفس السؤال... أين ذهب الراتب؟" (Every month the same question... Where did the salary go?) with subtle keyboard SFX per character. Hard cut at 2.2s to HeroBalanceCard counting up **١٢,٤٥٠ KWD** (42px, fw-black, 900ms cubic ease-out). Glassmorphism panel behind it with radial gradient glow. Music bed fades in (warm business-y, 0.18 vol).

## Frame 2 — Journey Roadmap: 5 Stages
- duration: 4s
- transition_in: hard_cut
- status: confirmed
- src: compositions/frames/02-journey.html

5 horizontal steps slide in left-to-right, staggered 0.08s each (matching landing page `whileInView` stagger). Each step: number circle (1-5), icon (✏️/🔍/🎯/📊/🚀), Arabic title, description. Step 5 (Financial Freedom / Rocket) gets subtle bell hit on arrival. Card-place SFX per step. Beat-grid synced to ~112 BPM starting ~3.2s.

## Frame 3 — QuickAdd Flow: The Working App
- duration: 5s
- transition_in: clean_wipe
- status: confirmed
- src: compositions/frames/03-quickadd.html

Dashboard wide shot. Thumb taps GlobalFAB (bottom-right). QuickAdd modal scales in (spring). Arabic category chips render: مصاريف، نقل، طعام، صحة، تعليم، ترفيه، أخرى. Tap "طعام". Numeric keypad: type "١٥". Currency badge shows "JOD" (3 decimals). Hit save. Modal dismisses. Monthly Stats grid updates: Income card, Expenses card, Net card — numbers tick up. Debt Row appears. FAB tap → click SFX; category tap → select SFX; save → soft impact; stat ticks (no SFX, animation carries).

## Frame 4 — Zakat Auto-fill: Islamic Automation
- duration: 3.5s
- transition_in: clean_wipe
- status: confirmed
- src: compositions/frames/04-zakat.html

Zakat Calculator screen. "Auto-fill from your data" badge pulses. Rows appear sequentially (0.15s apart): Cash (from savings goals) → Liabilities (from debts) → Investments (from portfolio) → Gold/Silver (live dual-API prices) → Nisab calculated → Haul countdown per investment (color chips: red/amber/green). Final line: "Zakat due: ٣١٢.٥٠٠ JOD". Pay button gets subtle glow pulse. Each row → soft drop SFX (thinned, accent first/last only). Music slight swell at ~14s (strong cue).

## Frame 5 — Outro: Brand Lock
- duration: 3s
- transition_in: slow_crossfade
- status: confirmed
- src: compositions/frames/05-outro.html

Full-screen centered: **فجرك** (Cairo, fw-black, 96px) slams in (scaleIn spring). Below: **Fajrak** (fw-semibold, 36px). Tagline: "Your dawn toward financial freedom" (text-secondary, 22px). Small: "fajrak.com · Free forever · No credit card" (text-secondary, 16px). Single authoritative bell ring (impactBell_heavy_000, 0.85 vol). Music ducks to 0.08, fades out 1s over hold. Hold 1.5s. Cut to black.