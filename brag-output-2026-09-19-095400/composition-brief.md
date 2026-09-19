# Hyperframes Composition Brief: Fajrak (فجرك)

## Objective
Create a short launch-style brag video for Fajrak — the first Arabic-first financial operating system.

## Output
- Composition directory: `brag-output-2026-09-19-095400/composition/`
- Rendered video: `brag-output-2026-09-19-095400/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `/home/ubuntu/financetracker`
- Primary files read: `app/page.tsx`, `components/landing/LandingPageClient.tsx`, `components/landing/hero/HeroSection.tsx`, `components/landing/hero/HeroSection.module.css`, `app/globals.css`, `lib/locales/en/landing.ts`, `app/(dashboard)/dashboard/page.tsx`, `components/dashboard/HeroBalanceCard.tsx`, `components/dashboard/Cards.tsx`, `PRODUCT.md`
- Product name: Fajrak (فجرك = "Your Dawn")
- Tagline / strongest claim: "Where did the salary go? Fajrak has the answer — by numbers, not guessing 🌅"
- Key UI or visual moment to recreate: Hero Balance Card (phone frame) with live net worth counter, Debt Payments card with cascading checkmarks, 5-stage Wealth Roadmap horizontal scroll
- Copy that must appear verbatim:
  - "أين راتبك؟" (Arabic hook)
  - "Where did the salary go?"
  - "Fajrak has the answer — by numbers, not guessing 🌅"
  - "Your finances deserve better than Excel 💡"
  - "Fajrak — فجرِك"
  - "Start free • No card • Built for the Arab world"

## Creative Direction
- Tone preset: `polished`
- Creative direction: "Quiet premium product film for a culturally-specific tool that earns its decoration"
- Interpretation: Restrained pacing. Longer holds on numbers. No chaotic cuts. Audio is a warm bed with sparse, purposeful SFX (tap, chime, counter tick). The gradient text IS the visual effect — no extra motion graphics. Arabic-first typography respected throughout.
- Angle: "Where did the salary go?" — The universal Arab world pain point, answered not with generic budgeting but with a culturally-native financial operating system. Dawn metaphor: Fajrak = "Your Dawn" — every feature moves you from financial darkness to first light. The video doesn't show a dashboard; it shows the *moment the answer appears*.
- Hook: Black screen. White Arabic text types out character-by-character with subtle key ticks: "أين راتبك؟" → Hard cut to: The hero gradient title "Where did the salary go?" in the app's gradient (blue → green), resolving from the Arabic. The answer lands: "Fajrak has the answer — by numbers, not guessing 🌅"
- Outro / punchline: Phone frame pulls back. Dark navy background. Gradient text: "Your finances deserve better than Excel 💡" → Logo mark (dawn icon) + "Fajrak — فجرِك" → Small: "Start free • No card • Built for the Arab world"
- Avoid:
  - Generic SaaS language ("streamline your workflow", "all-in-one platform")
  - Abstract filler visuals (color washes, generic particles)
  - Unrelated visual redesign (use the project's actual dark navy, Cairo font, gradient text)

## Visual Identity
- Background: `#070B14` (--bg-primary, deep navy)
- Text: `#F0F4FF` (--text-primary) / `#8B9CC8` (--text-secondary)
- Accent: `#3B7EF6` (--accent-blue) + `#10B981` (--accent-green) + `#F59E0B` (--accent-amber/gold for freedom stage)
- Display font: `Cairo` (Google Fonts, Arabic-first, used for all headings)
- Body font: `Cairo` (same family, variable weights)
- Visual references from the project:
  - Hero gradient: `linear-gradient(135deg, var(--text-primary) 0%, var(--accent-blue-light) 50%, var(--accent-green-light) 100%)`
  - Phone frame with Hero Balance Card (from DashboardPreview)
  - Debt Payments card with green checkmarks
  - Wealth Roadmap 5-stage horizontal cards
  - Zakat / FIRE / Halal badges

## Storyboard (from brag-plan.md)
1. **Hook: The Question** — 3.0s — Black screen, Arabic "أين راتبك؟" types out character-by-character (RTL, Cairo, 48px). Sequential: types out over ~2.2s, holds 0.8s.
2. **Reveal: The Answer** — 2.5s — Hard cut. Hero gradient title "Where did the salary go?" resolves from Arabic (crossfade). Subtitle fades in. Music bed starts.
3. **Centerpiece: Hero Balance Card (Phone Frame)** — 4.0s — iPhone frame. Net Worth ١٢,٤٥٠ KWD counts up (1.2s). Monthly Income ٨,٢٠٠ counts up (0.8s). Savings Rate ٢٨% counts up (0.6s). Mini bar chart staggers (0.08s stagger).
4. **Debt Never Surprises You** — 3.5s — Tap simulation on Debt Payments card → expands → 3 checkmarks cascade (stagger 0.15s). "Auto-deduction active ✓"
5. **Wealth Roadmap: 5 Stages** — 3.5s — 5 cards unlock sequentially every ~0.55s (beat grid). Awareness → Debt Freedom → Safety Net → Invest & Grow → Financial Freedom (amber glow). Quote: "The upper hand is better than the lower hand"
6. **Cultural Power Trio** — 2.5s — 3 cards swipe: Zakat Calculator (auto-filled) → FIRE Calculator ("Lean FIRE in 7.2 years") → Halal Investing (badge pulses)
7. **Outro: Logo + Tagline** — 1.5s — Phone pulls back. Gradient text "Your finances deserve better than Excel 💡". Logo + "Fajrak — فجرِك". Tagline. Music fades.

## Audio
- Audio role: Warm bed with sparse professional accents
- Audio arc: Silence for Arabic hook → warm music bed enters under answer → sparse SFX on interactive moments (counter ticks, tap, checkmarks, card unlocks, flip) → music breathes with hero gradient presence → final bong on logo → fade to silence
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (upbeat, corporate-but-warm, ~110 BPM) — start at 0:08, volume -18dB (0.125), fade in 1.5s, fade out last 2s
- Music treatment: Low bed throughout. Beat sync only for 5-stage roadmap card unlocks (every 2nd beat ≈ 0.55s). No beat sync for number counters — they tick at their own readable pace.
- Music cue guidance: Using preset cues from vol-10 (assets/music/cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.json). Tempo: 109.96 BPM. Strong cues at ~3.55s, 4.10s, 6.28s, 12.56s, 14.73s, 15.82s, 18.01s, 18.55s for major reveals. Beat grid every ~0.55s for sequential roadmap cards. Lock roadmap unlocks to beats starting near 12.56s (5 cards × 0.55s = 2.75s window). Restraint: deadpan/yc-parody tone means fewer/quieter cues.
- Audio-reactive treatment: Subtle; use music RMS/bass to make the hero gradient text presence breathe (opacity 0.95→1.0), not waveform bars.
- Audio-coupled moments:
  - Scene 1: Arabic text types out → keyboard ticks (keypress-001.wav)
  - Scene 2: Title resolves → soft resolve chord (implicit via music fade-in)
  - Scene 3: Net worth counter counts up → counter ticks (interface/click_001.ogg, -24dB). Bar chart: soft pops (interface/switch_001.ogg, -28dB)
  - Scene 4: Tap → expand → checkmarks cascade → tap (interface/click_002.ogg), expand whoosh (interface/switch_001.ogg), each check: success chime (interface/select_008.ogg, -18dB)
  - Scene 5: 5 cards unlock sequentially → whoosh + glow per unlock (interface/switch_001.ogg, -22dB), beat-aligned
  - Scene 6: 3 cards flip → card flip whoosh (casino/card-slide-1.ogg, -20dB) per card. Halal badge: soft chime (interface/select_008.ogg)
  - Scene 7: Logo scale in → low bong (interface/bong_001.ogg, -12dB). Music fade out.
- SFX selection guidance: Use low HF-risk files for polished moments (interface/click, interface/switch, interface/select, interface/bong, casino/card-slide). Match sound to visible gesture. Exact filenames, timestamps, density, and volume chosen by Hyperframes based on implemented animation.
- SFX analysis guidance: `skills/brag/assets/sfx/sfx-analysis.md`
- Audio files: Already copied to `brag-output-2026-09-19-095400/composition/assets/`

## Hyperframes Instructions
Load the Hyperframes domain skills (`hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`) to create/update `brag-output-2026-09-19-095400/composition/`. /brag is its own workflow — do not enter the `hyperframes` entry-point intent interview or route into its generic promo/launch-video workflow.

Requirements:
- Show at least one real UI, copy, or visual element from the source project (Hero Balance Card, Debt card, Roadmap cards)
- Keep all text readable in final render (reading-time floor: short label ~0.8s settled; sentence ~0.3s/word)
- Keep video within 15-25 seconds (target 20s)
- Include music/SFX layer as specified
- Treat audio notes as guidance, not fixed cue sheet. Choose SFX after visual animation exists.
- Treat music cue metadata as optional timing hints. Hyperframes decides exact animation timing; ignore cues that hurt readability/scene pacing/product story.
- Major reveals may move toward nearby strong cues within ±0.15s. Sequential events may align to beat grid within ±0.10s.
- Use SFX to support motion and interaction: card sounds for card reveals, announcement cues for payoffs, key/click sounds for text/actions, restraint when edit is busy.
- Honor planned music treatment (fade-outs, ducking, beat-aligned reveals, final SFX over music).
- When music present and treatment not `none`, consider audio-reactive workflow: extract audio data and use RMS/frequency bands for subtle visual modulation (hero gradient glow, card presence).
- Use local assets for audio and any runtime/media dependencies.
- Run `hyperframes check` before render — it is brag's single gate.

## Self-review checklist
- [ ] `composition-brief.md` exists
- [ ] Brief clearly identifies exact product moments to show
- [ ] Composition uses current Hyperframes workflow, not hardcoded /brag template
- [ ] Music file copied to `composition/assets/music/`
- [ ] At least one visual element subtly reacts to music (audio-reactive present)
- [ ] At least 1 major tween beat-locked to strong cue within ±0.15s, marked `// beat-locked`
- [ ] Sequential events (roadmap cards) snap to consecutive beats (±0.10s), marked `// beat-grid`
- [ ] Composition shows at least one real UI from project
- [ ] Total duration 15-25 seconds
- [ ] `hyperframes check` passes