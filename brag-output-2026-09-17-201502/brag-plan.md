# Brag Plan: Fajrak (فجرك)

## What is this app?
Fajrak ("Your Dawn" فجرك) is the first fully Arabic personal finance manager — a dual-platform (Next.js 16 PWA + Flutter 3 Android) app that guides users through a 5-stage financial journey: Awareness → Debt Freedom → Safety Net → Invest & Grow → Financial Freedom. Centralized financial logic lives in Supabase RPC (PostgreSQL) for 100% mathematical consistency across web and mobile. Includes Islamic tools (Zakat calculator with auto-fill + haul countdown, Halal investment flag, FIRE calculator Lean/Full/Fat), AI assistant via BYOK chat + MCP server, dual-API live pricing (Yahoo + fallback), and smart notifications (FCM + Web Push + deep linking).

## The angle
"YNAB and Mint were built for Seattle. We built Fajrak for Amman, Riyadh, and Cairo." — a deadpan startup launch for a region everyone ignores. The joke is how seriously we deliver: centralized RPC engine, dual-API pricing with automatic failover, MCP server exposing `get_balances`/`create_transaction` to LLMs, Zakat auto-filled from real user data. No winking. The absurdity is the depth.

## Hook (first 2-3 seconds)
Black screen. White Arabic text types out character by character:
**"كل شهر نفس السؤال... أين ذهب الراتب؟"**
(Every month the same question... Where did the salary go?)
Subtle keyboard SFX per character. Hard cut to HeroBalanceCard counting up: **١٢,٤٥٠ KWD**.

## Key moments (the middle)
1. **Journey Roadmap reveal** — 5 horizontal steps slide in one by one (Awareness → Debt Freedom → Safety Net → Invest & Grow → Financial Freedom), each with a card-place SFX. The "Financial Freedom" step (Rocket icon) gets a subtle bell hit.
2. **QuickAdd in action** — Simulated thumb tap on the floating FAB. Transaction modal opens. Arabic category chips appear (مصاريف، نقل، طعام...). User picks "طعام", types "١٥", hits save. Monthly Stats grid updates instantly: Income ↑, Expenses ↑, Net recalculates. Debt Row appears if applicable.
3. **Zakat Calculator auto-fill** — Cut to Zakat screen. "Auto-fill from your data" badge pulses. Cash auto-filled from savings goals. Liabilities from debts. Assets from investments. Gold/Silver prices fetched live (dual-API). Nisab calculated. Haul countdown shows color-coded per investment. One tap → payment recorded.

## Outro / punchline
Product name slams in full-screen: **فجرك** (Arabic) / **Fajrak** (English).
Tagline: **"Your dawn toward financial freedom"**
Small line underneath: **"fajrak.com · Free forever · No credit card"**
Single bell ring. Cut to black.

## User flow worth showing
Entry → Key Action → Result:
1. User opens dashboard → HeroBalanceCard counts up with real net worth (accounts + investments + goals − debts)
2. Tap QuickAdd FAB → Record expense in Arabic categories with live currency (JOD/KWD/SAR 3-decimal precision)
3. Dashboard updates instantly: Monthly Stats, Debt Row, Financial Health Score, Recent Transactions list
This is the *working app* — not the landing page. The centerpiece scenes must show this flow.

## Tone
- Preset: `yc-parody`
- Creative direction: "fake Series A launch from a region everyone ignores"
- Interpretation: Deadpan delivery. Structured pacing (4-5 scenes). Heavy typography (Cairo font, fw-black for headlines). Hard cuts or minimal crossfade (0.2s). Claims stated as facts. No excitement in the voice — the product's depth is the punchline.

## Format: landscape — 1920x1080
## Duration: 18 seconds

## Visual identity (from the project)
- Background: #070B14 (--bg-primary dark mode)
- Accent: #3B7EF6 (--accent-blue) + glow rgba(59,126,246,0.25)
- Text: #F0F4FF (--text-primary)
- Display font: Cairo (Google Fonts, weight 900 for headlines, 600 for body)
- Body font: Cairo (same family, weight 500)
- Strongest visual element: HeroBalanceCard count-up animation (42px, cubic ease-out 900ms) + glassmorphism sidebar/panels + Arabic numerals in dashboard preview

## Share copy (draft)
We built Fajrak because YNAB doesn't speak Arabic. Centralized financial logic, halal investing, Zakat auto-fill, and an MCP server for your AI assistant — all free. fajrak.com

## Audio direction
- Role: sparse but present — warm bed, restrained cues
- Music: happy-beats-business-moves-vol-11-by-ende-dot-app.mp3 (1:28, warm business-y) at volume 0.18, fade-in 0.5s, duck to 0.08 under final logo, fade-out 1s
- Music cue guidance: bundled preset available at assets/music/cues/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json (tempo ~112 BPM). Strong cues at ~3.2s, ~8.7s, ~14.1s. Beat grid for sequential reveals (journey steps, stat cards).
- Audio-reactive treatment: subtle; use music RMS to make HeroBalanceCard glow breathe; background radial gradient warmth swells slightly. No waveform/equalizer visuals.
- SFX posture: sparse; motion-matched; professional restraint
- Audio-coupled moments:
  - Scene 1: Hero title types out → keyboard/keypress randomized per character
  - Scene 2: Journey steps slide in one by one → casino/card-place-* per step
  - Scene 3: QuickAdd modal opens → interface/click_001; save → impact/impactSoft_medium_001
  - Scene 4: Zakat auto-fill rows appear → interface/drop_001 per row
  - Scene 5: Final logo slam → impact/impactBell_heavy_000 (0.85 vol)
- Restraint rule: No SFX on stat number updates — let the count-up animation carry. Music never above 0.22 volume. Silence preferred over clutter.

## Storyboard

### Scene 1 — Hook — 2.5s
Black screen. Arabic text types out: **"كل شهر نفس السؤال... أين ذهب الراتب؟"** (Every month the same question... Where did the salary go?) Character-by-character with randomized keyboard SFX. Hard cut at 2.2s to HeroBalanceCard counting up **١٢,٤٥٠ KWD** (42px, fw-black, count-up 900ms cubic ease-out). Glassmorphism panel behind it.
Sequential/interaction: yes — typed text, then count-up animation
Audio intent: tension → resolution
Audio-coupled idea: typed text with keyboard SFX; count-up lands with soft drop
Music: warm bed fades in at 0.0s, 0.18 vol
Transition mood: hard cut → Scene 2

### Scene 2 — Journey Roadmap — 4s
5 horizontal steps slide in left-to-right, staggered 0.08s each (matching the landing page's `whileInView` stagger). Each step: number circle (1-5), icon (Pen/Search/Target/BarChart/Rocket), Arabic title, description. Step 5 (Financial Freedom / Rocket) gets subtle bell hit on arrival.
Sequential/interaction: yes — 5 steps arrive one by one on beat grid
Audio intent: structured build, deadpan confidence
Audio-coupled idea: card-place SFX per step (casino/card-place-1 through 5); step 5 gets impactBell_heavy_003 at low vol
Music: steady bed continues
Transition mood: hard cut → Scene 3

### Scene 3 — QuickAdd Flow — 5s
Dashboard wide shot. Thumb taps GlobalFAB (bottom-right floating button). QuickAdd modal scales in (spring). Arabic category chips render: مصاريف، نقل، طعام، صحة، تعليم، ترفيه، أخرى. Tap "طعام". Numeric keypad: type "١٥". Currency badge shows "JOD" (3 decimals). Hit save. Modal dismisses. Monthly Stats grid updates: Income card, Expenses card, Net card — numbers tick up. Debt Row appears if monthlyDebtCommitments > 0.
Sequential/interaction: yes — simulated tap → category pick → keypad → save → stat updates
Audio intent: tactile, satisfying
Audio-coupled idea: FAB tap → interface/click_001; category tap → interface/select_008; save → impactSoft_medium_001; stat ticks → no SFX (animation carries)
Music: bed continues
Transition mood: clean wipe → Scene 4

### Scene 4 — Zakat Auto-fill — 3.5s
Zakat Calculator screen. "Auto-fill from your data" badge pulses (animate-pulse-slow). Rows appear sequentially (0.15s apart): Cash (from savings goals) → Liabilities (from debts) → Investments (from portfolio) → Gold/Silver (live dual-API prices) → Nisab calculated → Haul countdown per investment (color chips: red/amber/green). Final line: "Zakat due: ٣١٢.٥٠٠ JOD". Pay button gets subtle glow.
Sequential/interaction: yes — 6 rows appear one by one
Audio intent: impressive automation, quiet awe
Audio-coupled idea: each row → interface/drop_001 (thinned, only first/last accented); final pay button glow pulse → no SFX
Music: bed continues, slight swell at 14s (strong cue)
Transition mood: slow crossfade (0.6s) → Scene 5

### Scene 5 — Outro / Logo — 3s
Full-screen centered: **فجرك** (Cairo, fw-black, 72px). Below: **Fajrak** (fw-semibold, 28px). Tagline: **"Your dawn toward financial freedom"** (text-secondary, 18px). Small: **"fajrak.com · Free forever · No credit card"** (text-muted, 14px). Logo slams in (scaleIn spring). Bell ring. Hold 1.5s. Cut to black.
Sequential/interaction: none — single reveal
Audio intent: finality, brand lock
Audio-coupled idea: logo slam → impactBell_heavy_000 at 0.85 vol; music ducks to 0.08, fades out
Music: fade-out 1s over hold
Transition mood: cut to black

**Music mood for this video:** warm business-y, steady, restrained
**Audio summary:** Single warm music bed runs throughout at low volume. Keyboard typing opens, card-place SFX mark journey steps, one tactile click/save for QuickAdd, soft drops for Zakat rows, one authoritative bell for the logo. Music ducks under final logo. RMS-reactive glow on HeroBalanceCard and background gradient throughout.

---

## Music cue guidance
- Track: happy-beats-business-moves-vol-11-by-ende-dot-app.mp3
- Preset: assets/music/cues/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json (tempo ~112 BPM)
- Strong cues to target:
  - ~3.2s → Scene 2 entry (Journey Roadmap starts)
  - ~8.7s → Scene 3 QuickAdd save moment
  - ~14.1s → Scene 4 Zakat final row / Scene 5 logo
- Beat grid for sequential events:
  - Scene 2: 5 steps → snap to 5 consecutive beats starting near 3.2s
  - Scene 4: 6 rows → snap to every other beat starting near 9.5s (reading-time floor)
- Restraint note: yc-parody tone demands quiet. Only 1-3 strong cue locks. Beat grid for non-text accents only (glows, dots).