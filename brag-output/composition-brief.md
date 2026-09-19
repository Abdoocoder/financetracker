# Hyperframes Composition Brief: Fajrak (فجرك)

## Objective
Create a short launch-style brag video for Fajrak, the first fully Arabic personal finance manager — tracing a night-to-dawn arc from "Where did the salary go?" to financial freedom.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 19.5 seconds

## Source Material
- Project root: `/home/abdullah/Projects/financetracker`
- Primary files read: `app/(landing)/page.tsx`, `app/(dashboard)/page.tsx`, `lib/locales/en/landing.ts`, `lib/locales/en/dashboard.ts`, `lib/locales/ar/landing.ts`, `app/globals.css`, `DESIGN.md`, `README.md`
- Product name: Fajrak (فجرك)
- Tagline / strongest claim: "Your financial dawn starts today 🌅" — know where every dinar goes, plan to pay off debts, watch investments, reach financial freedom, all in one place. First fully Arabic financial tool (Jordan / GCC first).
- Key UI or visual moment to recreate: the dashboard's **Financial Health Score** (counting 0 → 82 in green) with the tagline glowing beneath; the **Zakat haul countdown**; the **5-stage financial roadmap** (Stage 2: Debt Payment) with debt-payoff confetti and FIRE years-to-freedom countdown.
- Copy that must appear verbatim:
  - Badge: `🇯🇴🇸🇦🇦🇪 First fully Arabic financial tool`
  - Tease: `Every month the same question...`
  - Hero title: `Where did the salary go?`
  - Hero answer: `Fajrak has the answer — by numbers, not guessing 🌅`
  - Hero desc: `Know where every dinar goes · Plan to pay off your debts · Watch your investments · And achieve financial freedom — all in one place.`
  - CTA: `Start Free ←`
  - Secondary CTA: `Watch how it works ↓`
  - Roadmap stage 2: `Stage 2: Debt Payment`
  - Roadmap next step: `Pay off the smallest debt first 🎯`
  - Dashboard subtitle: `Your financial dawn starts today 🌅`
  - Punchline: `From first transaction to financial freedom. فجرك — Your dawn.`
  - Trust lines: `Free Forever` · `No Credit Card Required` · `Halal Investments`

## Creative Direction
- Tone preset: cinematic
- Creative direction: the arc of a dawn — the film opens in deep night-sky blues (`#070B14` → `#162032`) and gradually warms to gold-blue `#3B7EF6`/`#6BA3FF` light as financial clarity arrives. Big Cairo typography, rhythmic motion, counting metrics doing the talking.
- Interpretation: wide cinematic reveals — screen-scale type entrances, metric counters as the heartbeat, soft glow blooms, a single confident payoff frame. Slow, deliberate entrances with occasional fast accents on the counting metrics. Restraint in color until the dawn arrives.
- Angle: Finance apps show spreadsheets. Fajrak is a journey — from the confusion of "Where did the salary go?" to the relief of watching your financial health score rise. Regional resonance: 🇯🇴🇸🇦🇦🇪 badge, Zakat countdown, free forever, halal investments.
- Hook: Wide, dark night-sky screen. A small teal line whispers "Every month the same question…", then the question arrives in huge Cairo type: **"Where did the salary go?"** A beat of silence, then the sky begins to dawn as the answer fades in: **"Fajrak has the answer — by numbers, not guessing 🌅"**
- Outro / punchline: Full dawn breaks. **"From first transaction to financial freedom. فجرك — Your dawn."** with logo, `Start Free ←`, and trust lines.
- Avoid:
  - Generic SaaS language / feature listicle
  - Abstract filler visuals (orbiting shapes, stock city skylines)
  - Unrelated visual redesign of the actual product UI

## Visual Identity
- Background: `#070B14` (night) → `#0D1221` / `#111827` / `#162032` (mid) → warming dawn (gold-blue mix toward `#3B7EF6`)
- Text: `#F0F4FF` (primary) / `#8B9CC8` (secondary/muted)
- Accent: `#3B7EF6` / `#6BA3FF` (dawn blue); success green `#10B981`; red `#EF4444` (sparing); amber `#F59E0B` (zakat); purple `#8B5CF6`
- Display font: Cairo (extreme 300 vs 900 weight contrast; compiler embeds via `font-family`)
- Body font: Cairo
- Visual references from the project: the actual landing hero (night-sky + dawn gradient), dashboard health-score card, Zakat countdown chip, 5-stage roadmap progress row, Fajrak wordmark/logo

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 3.5s — night sky → big title → dawn start. Tease "Every month the same question…" / "Where did the salary go?" then "Fajrak has the answer — by numbers, not guessing 🌅"
2. Reveal — 4.5s — dashboard appears; Financial Health Score counts 0 → 82 (green); hero balance settles; "Your financial dawn starts today 🌅" glows beneath
3. Highlight — 4s — Zakat haul countdown ticks toward due date; Quick Add drops a transaction in one tap
4. Highlight — 4s — 5-stage roadmap walks forward to Stage 2 "Debt Payment"; confetti when "Pay off the smallest debt first 🎯" clears; FIRE "years to financial freedom" counts down
5. Punchline — 3.5s — full dawn; "From first transaction to financial freedom. فجرك — Your dawn." + logo + `Start Free ←` + trust lines

## Audio
- Audio role: cinematic support — warm, steady bed under counting metrics and reveal moments
- Audio arc: opens soft and atmospheric under the night sky, swells as the dawn breaks, and resolves on a confident full-sky payoff with the final line and logo
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (steady + clean; the cinematic pick per audio.md)
- Music treatment: volume ~0.35, present but never above the motion; gentle fade-in over the first ~1s; keep steady through counters; let final SFX ring over the end rather than hard-cutting the bed
- Music cue guidance: bundled preset at `assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` (rich: `strongCues` + `beats`). Lock 1–3 major reveals to strong cues within ±0.15s; snap sequential counters/cards to beats within ±0.10s; ignore cues that hurt readability. Reads: score counter, Zakat countdown, roadmap-step pop-ins are sequential — do not outrun reading on label text.
- Audio-reactive treatment: subtle — hero glow / dawn warmth breathes with overall RMS; the health-score card and metric panels gain slight presence on bass; title and logo get a soft treble glow at strong moments. No waveform/equalizer visuals, no strobing, no pulsing orbs.
- Audio-coupled moments:
  - Score 0 → 82 counter — per-tick soft ticks synced with the counting (accent first and final tick)
  - Health score landing at 82 — success accent (impactSoft/impactBell family)
  - Zakat countdown arrival / due-date reveal — soft drop + chip placement
  - Quick Add tap — click/select interaction cue matching a visible tap
  - Roadmap Stage 2 arrival + confetti on payoff — announcement/celebration cue (impactBell_heavy on hero, impactSoft on reveals, chips/collide for celebratory beats)
  - Final logo landing — cinematic deep bell ring over the music
- SFX selection guidance: sound reinforces the edit, never calls attention. Cinematic palette: `impactBell_heavy_000/_003/_004` for hero moments, `impactSoft_medium_*` for reveals, `interface/drop_*`/`casino/chip-*` for counters and placements, `interface/click_*`/`select_008` for the Quick Add tap. Align each SFX to the start of the animation it accents, not the end.
- SFX analysis guidance: prefer low/medium high-frequency-risk files for repeated/polished moments (counters, cards). Guidance file: `skills/brag/assets/sfx/sfx-analysis.md`.
- Exact SFX choice: Hyperframes chooses filenames, timestamps, density, and volume based on the implemented animation. Keep it to 3–6 tasteful cues for a cinematic tone; don't score every micro-motion.
- Audio files: copy the chosen music and any Hyperframes-selected SFX into `brag-output/composition/assets/`

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project (the dashboard card, Zakat countdown, roadmap, and verbatim copy above).
- Keep all text readable in the final render.
- Keep the video within 15-25 seconds (plan: 19.5s).
- Include the planned music/SFX layer (music present, so audio-reactive treatment is expected).
- Treat the audio notes above as guidance, not a fixed cue sheet. Choose SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints. Ignore cues that hurt readability, pacing, or the product story.
- Use 1–3 strong cue locks. Snap counters/cards to beats only where it keeps labels readable.
- Use local assets for audio (already copied under `composition/assets/`).
- Run `hyperframes check` before render — it is brag's single gate.