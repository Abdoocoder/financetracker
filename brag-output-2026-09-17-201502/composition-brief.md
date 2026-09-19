# Hyperframes Composition Brief: Fajrak

## Objective
Create a short launch-style brag video for Fajrak (فجرك) — the first fully Arabic personal finance manager.

## Output
- Composition directory: `brag-output-2026-09-17-201502/composition/`
- Rendered video: `brag-output-2026-09-17-201502/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 18 seconds

## Source Material
- Project root: `/home/abdullah/Projects/financetracker`
- Primary files read:
  - `app/page.tsx` + `components/landing/LandingPageClient.tsx` (landing structure)
  - `components/landing/hero/HeroSection.tsx` (hero copy, animations)
  - `components/landing/dashboard/DashboardPreview.tsx` (dashboard preview UI)
  - `components/landing/journey/JourneyRoadmap.tsx` (5-stage roadmap)
  - `app/(dashboard)/dashboard/page.tsx` (working dashboard flow)
  - `app/globals.css` (design system: colors, fonts, animations)
  - `lib/locales/en/landing.ts` (all landing copy)
  - `package.json` (project metadata)
- Product name: Fajrak (فجرك)
- Tagline / strongest claim: "كل شهر نفس السؤال... أين ذهب الراتب؟" / "Where did the salary go? Fajrak has the answer — by numbers, not guessing 🌅"
- Key UI or visual moment to recreate:
  1. Hero title typing + HeroBalanceCard count-up (١٢,٤٥٠ KWD)
  2. Journey Roadmap 5-step horizontal stagger reveal
  3. QuickAdd FAB → modal → Arabic categories → save → stat updates
  4. Zakat Calculator auto-fill rows (cash, liabilities, investments, metals, nisab, haul)
  5. Final logo slam: فجرك / Fajrak
- Copy that must appear verbatim:
  - "كل شهر نفس السؤال... أين ذهب الراتب؟"
  - "فجرك" / "Fajrak"
  - "Your dawn toward financial freedom"
  - "fajrak.com · Free forever · No credit card"

## Creative Direction
- Tone preset: `yc-parody`
- Creative direction: "fake Series A launch from a region everyone ignores"
- Interpretation: Deadpan delivery. Structured pacing (5 scenes). Heavy typography (Cairo fw-black headlines). Hard cuts/minimal crossfade. Claims stated as facts. No winking.
- Angle: YNAB and Mint were built for Seattle. We built Fajrak for Amman, Riyadh, Cairo. Centralized RPC engine, dual-API pricing, MCP server, Zakat auto-fill — all free.
- Hook: Arabic text types out "كل شهر نفس السؤال... أين ذهب الراتب؟" → hard cut to HeroBalanceCard counting up ١٢,٤٥٠ KWD
- Outro / punchline: فجرك slams in. Tagline. URL. Bell ring. Cut to black.
- Avoid:
  - Generic SaaS language ("streamline your workflow")
  - Abstract filler visuals (color washes, generic motion graphics)
  - Unrelated visual redesign (must use project's actual dark luxury design system)

## Visual Identity
- Background: #070B14 (--bg-primary dark)
- Text: #F0F4FF (--text-primary)
- Accent: #3B7EF6 (--accent-blue) + glow rgba(59,126,246,0.25)
- Display font: Cairo (Google Fonts) — weight 900 headlines, 600 subheads
- Body font: Cairo — weight 500
- Visual references from the project:
  - HeroBalanceCard count-up animation (42px, cubic ease-out 900ms)
  - Glassmorphism panels (--bg-glass, backdrop-filter blur(8px))
  - Dashboard Preview net worth cards with Arabic numerals
  - Journey Roadmap horizontal stepper with icons
  - QuickAdd FAB + modal with Arabic category chips
  - Radial gradient background: radial-gradient(ellipse 80% 40% at 50% -10%, rgba(59,126,246,0.06) 0%, transparent 60%)

## Storyboard
Use the storyboard in `brag-output-2026-09-17-201502/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 2.5s — Arabic title types out → HeroBalanceCard counts up ١٢,٤٥٠ KWD
2. Journey Roadmap — 4s — 5 steps stagger in left-to-right (Pen→Search→Target→BarChart→Rocket)
3. QuickAdd Flow — 5s — FAB tap → modal → Arabic categories → keypad ١٥ → save → stats update
4. Zakat Auto-fill — 3.5s — 6 rows appear sequentially (cash, liabilities, investments, metals, nisab, haul)
5. Outro / Logo — 3s — فجرك / Fajrak slams in, tagline, URL, bell ring, cut to black

## Audio
- Audio role: sparse but present — warm bed, restrained cues
- Audio arc: Music fades in at 0s (0.18 vol) → steady through scenes 1-4 → ducks to 0.08 under final logo → fades out 1s over hold
- Music: happy-beats-business-moves-vol-11-by-ende-dot-app.mp3
- Music treatment: fade-in 0.5s, volume 0.18, duck to 0.08 at 15.5s (logo), fade-out 1s
- Music cue guidance: bundled preset at assets/music/cues/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json (tempo ~112 BPM). Strong cues at ~3.2s, ~8.7s, ~14.1s. Beat grid for sequential: Scene 2 (5 steps → 5 consecutive beats from ~3.2s), Scene 4 (6 rows → every other beat from ~9.5s).
- Audio-reactive treatment: subtle; use music RMS to make HeroBalanceCard glow breathe; background radial gradient warmth swells slightly. No waveform/equalizer visuals.
- Audio-coupled moments:
  - Scene 1: typed text → keyboard/keypress randomized per character
  - Scene 2: 5 steps arrive → casino/card-place-* per step; step 5 → impactBell_heavy_003 (low)
  - Scene 3: FAB tap → interface/click_001; category tap → interface/select_008; save → impactSoft_medium_001
  - Scene 4: 6 rows appear → interface/drop_001 (thinned, accent first/last only)
  - Scene 5: logo slam → impactBell_heavy_000 (0.85 vol)
- SFX selection guidance: Sparse, motion-matched, professional restraint. Prefer low HF-risk files from sfx-analysis.md for repeated moments. Keyboard SFX randomized per character. Card-place for journey steps. One authoritative bell for logo.
- SFX analysis guidance: skills/brag/assets/sfx/sfx-analysis.md — use lower high-frequency-risk sounds for repeated/polished moments.
- Exact SFX choice: Hyperframes should choose filenames, timestamps, density, and volume based on the implemented animation.
- Audio files: copy chosen music and any Hyperframes-selected SFX into `brag-output-2026-09-17-201502/composition/assets/`

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow.

Requirements:
- Show at least one real UI, copy, or visual element from the source project.
- Keep all text readable in the final render (reading-time floor: short label ~0.8s settled; sentence ~0.3s/word).
- Keep the video within 15-25 seconds (target 18s).
- Include the planned music/SFX layer.
- Treat /brag audio notes as guidance, not a fixed cue sheet. Choose SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints. Hyperframes decides exact animation timing and should ignore cues that hurt readability, scene pacing, or the product story.
- Major reveals may move toward nearby strong cues within ±0.15s. Smaller entrances may align to nearby beat points within ±0.10s. Use only 1-3 strong cue locks.
- Use SFX to support motion and interaction: card sounds for card-like reveals, short announcement cues for major payoffs, key/click sounds for text or user actions, restraint when the edit is already busy.
- Honor planned music treatment such as fade-outs, ducking, beat-aligned reveals, or letting a final SFX ring over the music, using the best Hyperframes-supported implementation.
- When music is present and treatment is not `none`, consider Hyperframes audio-reactive workflow: extract audio data and use RMS/frequency bands for subtle, brand-specific motion. Good targets: HeroBalanceCard glow, background radial gradient warmth, card presence. Avoid waveform/equalizer visuals, musical-note graphics, generic particle systems, strobing, or heavy pulsing.
- Use local assets for audio and any required runtime/media dependencies when possible.
- Run `hyperframes check` before render — it is brag's single gate.