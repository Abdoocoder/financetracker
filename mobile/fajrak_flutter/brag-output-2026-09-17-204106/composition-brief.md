# Hyperframes Composition Brief: Fajrak Flutter

## Objective
Create a short launch-style brag video for Fajrak Flutter — a native Android finance tracker built with Flutter, Arabic-first, with Islamic finance features, sharing Supabase + Firebase backend with a Next.js web app for real-time sync.

## Output
- Composition directory: `brag-output-2026-09-17-204106/composition/`
- Rendered video: `brag-output-2026-09-17-204106/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `/home/abdullah/Projects/financetracker/mobile/fajrak_flutter`
- Primary files read: `README.md`, `lib/main.dart`, `lib/app_state.dart`, `pubspec.yaml`, `assets/images/app_icon.png`
- Product name: Fajrak (فجرك)
- Tagline / strongest claim: "Your dawn. Your wealth." / "فجرَك. ثروتك."
- Key UI or visual moment to recreate: Dashboard with Health Score card + sparkline charts, Zakat Calculator with Hawl counter, FIRE Calculator sliders, real-time sync between phone and web
- Copy that must appear verbatim:
  - "Health Score · Real-time"
  - "Swipe · Delete · Done"
  - "Zakat · Auto-calculated"
  - "FIRE · Your way"
  - "One brain. Two screens. Zero lag."
  - "Zakat. FIRE. Lessons. Built-in."
  - "Smart alerts. Your privacy. Your rules."
  - "Your dawn. Your wealth. فجرَك."

## Creative Direction
- Tone preset: `polished` (serious, elegant — for projects that are not jokes)
- Creative direction: "Premium Arabic finance app that feels native, not translated"
- Interpretation: Clean, deliberate pacing. Gold accents on deep navy. Glassmorphism cards. No flashy effects — every motion serves clarity. Arabic typography (Cairo font) leads. English is secondary. Respectful of Islamic finance context.
- Angle: Fajrak isn't just a finance app — it's a native Arabic financial companion with Islamic finance built in (Zakat, FIRE, daily lessons), sharing a brain with its web counterpart via Supabase real-time. The video shows the product, not promises.
- Hook: Gold Arabic calligraphy "فجرك" on dark with glassmorphism card rising — 2 seconds
- Outro / punchline: App icon + badges + "Your dawn. Your wealth. فجرَك." + fajrak.com/download
- Avoid:
  - Generic SaaS language ("streamline", "optimize", "seamless")
  - Abstract filler visuals (particles, gradients without purpose)
  - Unrelated visual redesign (stick to the app's actual glassmorphism Material 3 look)

## Visual Identity
- Background: Deep navy `#0A1628` (from AppTheme.dark)
- Text (primary): Gold `#D4A843` (brand gold from app)
- Text (secondary): White `#FFFFFF` at 0.87 opacity
- Accent: Emerald `#10B981` (success/positive), Amber `#F59E0B` (warnings)
- Display font: Cairo Bold (Arabic + Latin) — `assets/fonts/Cairo-Bold.ttf`
- Body font: Cairo Regular — `assets/fonts/Cairo-Regular.ttf`
- Visual references from the project:
  - Glassmorphism dashboard cards (`BackdropFilter` blur 20px)
  - Health Score card with circular progress
  - Sparkline charts (fl_chart)
  - Zakat Calculator with Hawl countdown
  - FIRE Calculator with 3 sliders (Lean/Full/Fat)
  - Arabic RTL layout throughout
  - App icon (gold crescent on navy)

## Storyboard
Use the storyboard in `brag-output-2026-09-17-204106/brag-plan.md` as the creative contract.

Scene summary:
1. **Hook** — 2s — Gold "فجرك" calligraphy on dark, glassmorphism card rises behind
2. **Reveal** — 3s — 4 quick cuts (0.6s each): Dashboard Health Score, Transactions swipe, Zakat auto-fill, FIRE sliders. Text labels hold 0.8s each.
3. **Beat 1: Shared Brain** — 4s — Split screen phone/web, transaction syncs instantly. "One brain. Two screens. Zero lag."
4. **Beat 2: Islamic Finance, Native Code** — 4s — Zakat Hawl counter, Learn streak, Achievements confetti. "Zakat. FIRE. Lessons. Built-in."
5. **Beat 3: Smart Notifications** — 4s — Lock screen with hidden amounts, notification channels toggles. "Smart alerts. Your privacy. Your rules."
6. **Outro** — 3s — App icon centered, badges, CTA. "Your dawn. Your wealth. فجرَك."

## Audio
- Audio role: warm bed (upbeat, professional, not dominant)
- Audio arc: Starts on beat drop at hook, builds through beats 1-2, peaks at beat 3, resolves on outro
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (1:00 compact loop, punchy)
- Music treatment: Volume 0.35. Fade in 0.5s at start, fade out 1s at end. Duck to 0.15 under major text reveals if needed for readability.
- Music cue guidance: Bundled preset at `.agents/skills/brag/assets/music/cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.json` — use strongCues for major scene transitions (hook, beat 1, beat 2, beat 3, outro), beats grid for sequential card reveals in Reveal scene
- Audio-reactive treatment: subtle; use music RMS/bass to make glassmorphism cards' glow and border warmth breathe. No waveform/equalizer visuals.
- Audio-coupled moments:
  - Hook logo rise — strongCue 1 (intro hit)
  - Reveal card sequence — consecutive beats from beat 2
  - Beat 1 sync ping — strongCue 3 (chorus)
  - Beat 2 confetti — strongCue 5 (build)
  - Beat 3 notification chime — strongCue 7 (peak)
  - Outro logo land — strongCue 9 (resolve)
- SFX selection guidance: Polished tone = minimal (2-3 SFX). Use `interface/drop_001.ogg` for gentle card reveals, `impactBell_heavy_000.ogg` for major payoffs (sync, confetti, outro), `interface/click_001.ogg` for simulated tap on notification toggle
- SFX analysis guidance: `.agents/skills/brag/assets/sfx/sfx-analysis.md` — prefer low HF risk files
- Exact SFX choice: Hyperframes should choose filenames, timestamps, density, and volume based on the implemented animation
- Audio files: copy the chosen music and any Hyperframes-selected SFX into `brag-output-2026-09-17-204106/composition/assets/`

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project.
- Keep all text readable in the final render.
- Keep the video within 15-25 seconds.
- Include the planned music/SFX layer unless audio was explicitly disabled or documented as intentionally silent.
- Treat `/brag` audio notes as guidance, not a fixed cue sheet. Choose SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints. Hyperframes decides exact animation timing and should ignore cues that hurt readability, scene pacing, or the product story.
- Major reveals may move toward nearby strong cues within about 0.15s. Smaller entrances may align to nearby beat points within about 0.10s. Use only 1-3 strong cue locks in a 15-25s video unless the edit clearly benefits from more.
- Use SFX to support motion and interaction: card sounds for card-like reveals, short announcement cues for major payoffs, key/click sounds for text or user actions, and restraint when the edit is already busy.
- Honor planned music treatment such as fade-outs, ducking, beat-aligned reveals, or letting a final SFX ring over the music, using the best Hyperframes-supported implementation.
- When music is present and the treatment is not `none`, consider Hyperframes audio-reactive workflow: extract audio data and use RMS/frequency bands for subtle, brand-specific motion. Good targets are glow, depth, background warmth, card presence, title emphasis, or other existing visual elements. Avoid waveform/equalizer visuals, musical-note graphics, generic particle systems, strobing, or heavy pulsing.
- Use local assets for audio and any required runtime/media dependencies when possible.
- Run `hyperframes check` before render — it is brag's single gate.