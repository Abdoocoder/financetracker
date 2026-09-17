# Hyperframes Composition Brief: Fajrak (فجرك)

## Objective
Create a short launch-style brag video for Fajrak — the first fully Arabic personal finance tracker.

## Output
- Composition directory: `brag-output-2026-09-17-134500/composition/`
- Rendered video: `brag-output-2026-09-17-134500/brag.mp4`
- Format: landscape — 1920×1080
- Duration: 18 seconds

## Source Material
- Project root: `/home/ubuntu/financetracker`
- Primary files read:
  - `app/page.tsx` + `components/landing/LandingPageClient.tsx` (landing structure)
  - `components/landing/hero/HeroSection.tsx` (hero animations)
  - `lib/locales/en/landing.ts` (all copy — Arabic/English)
  - `app/globals.css` (design system: colors, fonts, shadows)
  - `mobile/fajrak_flutter/` (Flutter app exists, same backend)
- Product name: **Fajrak / فجرك**
- Tagline / strongest claim: **"Where did the salary go? Fajrak has the answer — by numbers, not guessing 🌅"**
- Key UI or visual moment to recreate:
  1. Hero section with Arabic/English headline
  2. Dashboard preview cards (Net Worth, Monthly Income, Expenses, Savings Rate)
  3. Wealth Roadmap 5-stage horizontal (Awareness → Debt Freedom → Safety Net → Invest & Grow → Financial Freedom)
  4. Financial Health Score (0-100)
  5. Mobile app RTL transaction entry
- Copy that must appear verbatim:
  - "أين ذهب الراتب؟" / "Where did the salary go?"
  - "فجرك" / "Fajrak"
  - "Smart Finance"
  - "كلنا نحلم بالثراء، هنا تبدأ الرحلة" / "We all dream of wealth — here the journey begins"

## Creative Direction
- Tone preset: **polished** (serious, elegant — real fintech for a cultural market)
- Creative direction: **"quiet premium Arab fintech launch"**
- Interpretation: Restrained energy. No bounce or overshoot. Premium card reveals with glass-morphism depth. Arabic typography honored (Cairo font). Motion serves clarity — every number/stat lands and holds for reading. No abstract filler.
- Angle: A finance app that speaks your language (literally). The hook is the universal question; the answer is a unified dashboard + a clear 5-stage path to freedom.
- Hook: Arabic text types out "أين ذهب الراتب؟" → English "Where did the salary go?" — the question everyone asks monthly.
- Outro / punchline: Logo + tagline "كلنا نحلم بالثراء، هنا تبدأ الرحلة" / "We all dream of wealth — here the journey begins" + fajrak.com/download
- Avoid:
  - Generic SaaS language ("streamline your workflow")
  - Abstract filler visuals (particles, waveforms)
  - Redesigning the UI — show the real thing

## Visual Identity
- Background: `#070B14` (near-black navy)
- Card: `#111827` (dark slate)
- Elevated: `#162032`
- Border: `rgba(255,255,255,0.07)`
- Primary Text: `#F0F4FF`
- Secondary Text: `#8B9CC8`
- Accent Blue: `#3B7EF6` / Light: `#6BA3FF` / Glow: `rgba(59,126,246,0.25)`
- Accent Green: `#10B981` / Light: `#34D399`
- Accent Red: `#EF4444` / Light: `#F87171`
- Accent Purple: `#8B5CF6` / Light: `#A78BFA`
- Display font: **Cairo** (Google Fonts, weights 400/700) — Arabic + Latin
- Body font: **Cairo** (same)
- Radius: 20px / 28px
- Shadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`

## Storyboard (from brag-plan.md)

| Scene | Duration | What Must Be Seen / Read |
|-------|----------|--------------------------|
| Hook | 2.0s | Arabic "أين ذهب الراتب؟" types out char-by-char → English "Where did the salary go?" fades in |
| Reveal | 3.0s | Hero slides up: "فجرك" / "Fajrak" logo, "Smart Finance" subtitle, CTA buttons, trust badges |
| Highlight 1: Dashboard | 4.0s | Dashboard preview: Net Worth $12,450 count-up → Monthly Income $3,200 → Expenses $1,800 → Savings Rate 44% |
| Highlight 2: Roadmap | 5.0s | Wealth Roadmap 5 stages light up sequentially (Awareness, Debt Freedom, Safety Net, Invest & Grow, Financial Freedom). Stage 2 pulses. Health Score 78/100 counts up. |
| Highlight 3: Mobile Sync | 2.5s | Flutter mobile: add expense (category: مواصلات) → save → dashboard updates instantly. RTL throughout. |
| Outro | 1.5s | Centered logo "فجرك" / "Fajrak". Tagline fades in (Arabic + English). fajrak.com/download |

Total: 18s

## Audio
- Audio role: Warm bed with sparse professional accents
- Audio arc: Low filtered pad (hook) → kick+bass enter (reveal) → full groove (highlights) → slight filter, SFX-forward (mobile) → fade to silence over final chord (outro)
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (copied to `composition/assets/music/`)
- Music treatment: Volume ~0.6, fade-in 0.5s, fade-out 1.5s on final frame. Duck to ~0.25 under any dense SFX moment.
- Music cue guidance: Bundled preset at `skills/brag/assets/music/cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.json`. Use `strongCues` for major reveals (hero slide-up, roadmap stage 2 pulse, health score, final logo). Use `beats` for sequential cards (Net Worth → Income → Expenses → Savings Rate).
- Audio-reactive treatment: **subtle** — RMS drives a slow pulse on card glow/box-shadow warmth. No waveform/equalizer visuals.
- Audio-coupled moments:
  - Hook typing: one `typewriter tick` SFX per character (beat-grid to music)
  - Hero slide-up: `card whoosh` on strong cue
  - Dashboard count-ups: `number tick` SFX (4 per number) on beat-grid
  - Roadmap stage light-ups: `stage chime` on strong cues (1 per stage)
  - Health score count-up: `counter tick` on beat-grid
  - Mobile tap/save: `tap click` + `swipe whoosh` + `sync sparkle`
  - Final logo: `logo thud` on strong cue, music fades, SFX rings out

## SFX Selection Guidance
- Use low high-frequency-risk sounds for repeated moments (ticks, clicks)
- Prefer from `skills/brag/assets/sfx/interface/` for UI interactions (click, switch)
- Prefer from `skills/brag/assets/sfx/ui/` for card/reveal motions (switch, rollover)
- Prefer from `skills/brag/assets/sfx/impact/` for major payoffs (punch, plate — low velocity)
- SFX analysis: `skills/brag/assets/sfx/sfx-analysis.md` / `.json`
- Hyperframes chooses exact filenames, timestamps, density, volume based on implemented animation.

## Hyperframes Instructions
Load: `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`.

Requirements:
- Show at least one real UI element from the source project (Hero, Dashboard cards, Roadmap, Mobile screen).
- Keep all text readable — hold each stat line ≥0.8s settled, each sentence ≥0.3s/word.
- Total duration 15-25s (target 18s).
- Include music/SFX layer.
- Treat music cues as optional timing hints — readability and scene pacing come first.
- At least 1 major tween beat-locked to strong cue (±0.15s), marked `// beat-locked`.
- Sequential events snap to consecutive beats (±0.10s), marked `// beat-grid`.
- Run `hyperframes check` before render — single gate.

## Assets
- Music: `composition/assets/music/happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`
- SFX: Hyperframes selects from skill assets, copies to `composition/assets/sfx/`