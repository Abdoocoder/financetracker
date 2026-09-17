# Brag Plan — Fajrak (فجرك)

## 9-Question Rubric

**1. What is the app?**
Fajrak (فجرك) — a personal finance tracker built for the Arab world. Tracks income, expenses, debts, investments, savings goals, and provides a 5-stage Wealth Roadmap with a Financial Health Score. Web (Next.js 16) + Mobile (Flutter) sharing Supabase backend with RLS.

**2. What is the funniest or most impressive claim?**
"Where did the salary go? Fajrak has the answer — by numbers, not guessing 🌅"
Also: "First fully Arabic financial tool" — regional currencies, halal investing, true RTL Arabic.

**3. What is the visual hook?**
Dark luxury design: #070B14 background, glass-morphism cards (#111827/rgba), blue/green/red accent glows, Cairo Arabic font, subtle geometric arabesque patterns. The dashboard cards have a premium fintech feel.

**4. What should be shown from the actual UI?**
- Hero: "Where did the salary go?" + Arabic/English toggle
- Dashboard preview: Net Worth card, Monthly Income/Expenses, Savings Rate
- Wealth Roadmap: 5 horizontal stages (Awareness → Debt Freedom → Safety Net → Invest & Grow → Financial Freedom)
- Financial Health Score (0-100 with breakdown)
- Transaction list with Arabic categories (راتب, مواصلات, فواتير, etc.)
- Download page for Android APK

**5. What is the shortest satisfying video?**
18 seconds. Hook (2s) → Reveal (3s) → 2 highlights (8s) → Outro (5s)

**6. What tone fits best?**
- Preset: **polished** (serious, elegant — real fintech for a cultural market)
- Creative direction: **"quiet premium Arab fintech launch"**

**7. What should the audio feel like?**
Warm corporate music bed (happy-beats-business-moves-vol-10). Subtle SFX: card reveal whoosh, tap click, swipe whoosh, number count-up tick. Music fades on final frame.

**8. What should the share caption say?**
"Built فجرK (Fajrak) — the first fully Arabic finance tracker that actually answers 'where did my salary go?' Web + Flutter + Supabase. 🌅"

**9. What's the user flow worth showing?**
Landing → Record expense (Arabic category) → Dashboard shows updated net worth + Wealth Roadmap stage + Health Score.

---

## Beat-by-Beat Storyboard (18s total)

| Beat | Time | Visual | Text | SFX | Transition |
|------|------|--------|------|-----|------------|
| **Hook** | 0.0–2.0 | Dark screen → Arabic text types out: "أين ذهب الراتب؟" → English fade-in: "Where did the salary go?" | (text is the visual) | Low ambient hum → subtle *typewriter tick* per character | Cut to black 0.2s |
| **Reveal** | 2.0–5.0 | Hero section slides up from bottom. Logo "فجرك" + "Fajrak" appears. CTA buttons pulse. | "Fajrak — Smart Finance" (subtitle) | *Card whoosh* on slide up, *soft pop* on logo | Crossfade |
| **Highlight 1** | 5.0–9.0 | Dashboard preview: Net Worth card counts up $12,450 → Monthly Income $3,200 → Expenses $1,800 → Savings Rate 44% | "One dashboard. All your money." | *Number count-up ticks* (4 per number), *swipe whoosh* between metrics | Match cut on blue accent line |
| **Highlight 2** | 9.0–14.0 | Wealth Roadmap horizontal scroll: 5 stages light up sequentially. Stage 2 "Debt Freedom" highlighted with pulse. Financial Health Score: 78/100 animates up. | "Know your stage. Get a plan." | *Stage light-up chime* ×5, *score count-up*, *pulse thrum* on Stage 2 | Match cut on green accent |
| **Highlight 3** | 14.0–16.5 | Mobile app: Flutter screen recording — add expense (category: مواصلات), save → dashboard updates instantly. Arabic RTL throughout. | "Web + Mobile. Same data. Synced." | *Tap click*, *swipe*, *sync sparkle* | Quick cut |
| **Outro** | 16.5–18.0 | Logo center screen. "فجرك" / "Fajrak". Tagline fades in: "كلنا نحلم بالثراء، هنا تبدأ الرحلة" / "We all dream of wealth — here the journey begins" | App name + tagline + fajrak.com/download | *Logo settle thud*, music fade to silence | Hold 1s on final frame |

---

## Music Cue Guidance

**Track:** `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`
- 0:00–0:02 (Hook): Low filtered pad only
- 0:02–0:05 (Reveal): Kick enters, warm bass
- 0:05–0:14 (Highlights): Full groove, sync card reveals to downbeats
- 0:14–0:16.5 (Mobile): Slight filter, focus on SFX
- 0:16.5–0:18 (Outro): Fade out over 1.5s, final chord rings

**Beat sync targets:**
- Net Worth count-up hits on beats 1, 3, 5, 7
- Stage light-ups on beats 1, 3, 5, 7, 9 of section
- Final logo on downbeat 1 of outro

---

## Visual Identity (from CSS)

**Colors:**
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

**Fonts:**
- Display: **Cairo** (Google Fonts, Arabic + Latin, weights 400/700)
- Body: **Cairo** (same)
- Fallback: system-ui

**Radius:** `--r-lg: 20px`, `--r-xl: 28px`
**Shadow:** `--shadow-card: 0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`

---

## Assets to Reference

- `/public/feature-graphic.png` — hero image for poster frame
- `/public/icon-512.png` — app icon
- `/mobile/fajrak_flutter/assets/images/app_icon.png` — Flutter icon
- Landing page HeroSection component for exact copy/animations
- Dashboard preview component for card layouts

---

## Format & Delivery

- **Format:** Landscape (1920×1080)
- **Duration:** 18 seconds
- **Output:** `brag-output-2026-09-17-134500/brag.mp4`
- **Poster:** `brag-output-2026-09-17-134500/brag.jpg` (best frame from 16.5–17.5s, baked as frame 0)
- **Share copy:** `brag-output-2026-09-17-134500/share-copy.txt`