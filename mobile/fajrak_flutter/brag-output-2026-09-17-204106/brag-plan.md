# Brag Plan: Fajrak Flutter

**Project:** Fajrak Flutter — Native Android Finance Tracker  
**Tone:** `polished` (serious, elegant — for projects that are not jokes)  
**Format:** `landscape` (16:9)  
**Duration:** 20 seconds  
**Music:** `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (upbeat, professional)  
**Voice:** No narration  

---

## The Hook (0–2s)

**Visual:** Dark screen → Sudden flash of gold Arabic calligraphy "فجرك" (Fajrak) with subtle glassmorphism card rising behind it  
**Audio:** Sharp "whoosh" + first beat drop  
**Text:** None — let the logo speak  

**Why:** The Arabic name "فجرك" (Your Dawn) is the brand. Starting with it in gold on dark with glassmorphism instantly signals: premium, Arabic-first, financial.

---

## The Reveal (2–5s)

**Visual:** Quick cuts (0.6s each):
1. Dashboard with live Health Score card + sparkline charts
2. Transactions list with swipe-to-delete gesture
3. Zakat Calculator auto-filling from accounts
4. FIRE Calculator with Lean/Full/Fat sliders

**Audio:** Music kicks in fully, subtle UI tap SFX on each cut  
**Text overlay (each cut, 0.8s hold):**
- "Health Score · Real-time"
- "Swipe · Delete · Done"
- "Zakat · Auto-calculated"
- "FIRE · Your way"

---

## Highlights (5–17s) — 3 Sharp Beats

### Beat 1: Shared Brain (5–9s)
**Visual:** Split screen — phone left, browser right. User adds transaction on phone → instantly appears on web. Supabase real-time badge pulses.
**Text:** "One brain. Two screens. Zero lag." (1.5s hold)
**SFX:** Sync "ping" on data transfer

### Beat 2: Islamic Finance, Native Code (9–13s)
**Visual:** 
- Zakat screen: Hawl counter ticking down, Nisab auto-fetch from gold API
- Learn screen: Daily Islamic lesson with streak counter
- Achievements: 20+ badges, 6 levels unlocking
**Text:** "Zakat. FIRE. Lessons. Built-in." (1.5s hold)
**SFX:** Confetti burst on achievement unlock

### Beat 3: Smart Notifications That Respect You (13–17s)
**Visual:** 
- Lock screen notification: "Budget alert" — amounts hidden (privacy toggle on)
- Settings: Notification channels (Budget/Debt/Goal) with per-channel toggle
- Morning/evening reminders at 6AM/6PM
**Text:** "Smart alerts. Your privacy. Your rules." (1.5s hold)
**SFX:** Gentle notification chime

---

## Punchline / Outro (17–20s)

**Visual:** 
- App icon (app_icon.png) centered, glassmorphism card behind
- "فجرك" Arabic + "Fajrak" English below
- Small badges: "22 Screens" · "100% Parity" · "On Google Play"
- CTA: "fajrak.com/download"

**Audio:** Music resolves on final chord  
**Text:** "Your dawn. Your wealth. فجرَك." (2s hold)

---

## Music Cue Guidance

**Track:** `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`  
**Cue file:** `assets/music/cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.md`

| Section | Time | Cue |
|---|---|---|
| Hook | 0:00 | Beat 1 (intro hit) |
| Reveal | 0:02 | Beat 2 (groove starts) |
| Beat 1 | 0:05 | Beat 4 (chorus energy) |
| Beat 2 | 0:09 | Beat 6 (build) |
| Beat 3 | 0:13 | Beat 8 (peak) |
| Outro | 0:17 | Beat 10 (resolve) |

---

## Creative Laws Checklist

- [x] **Short:** 20 seconds exactly
- [x] **Readable:** Every text holds 0.8s+ settled; fast-in then hold
- [x] **Specific:** Real UI, real features, real Arabic copy
- [x] **Show the thing:** 4+ actual screens shown
- [x] **No generic SaaS language:** Uses "Health Score", "Hawl", "Nisab", "Lean/Full/Fat"
- [x] **Hook is everything:** Gold Arabic calligraphy on dark + glassmorphism
- [x] **Funny earns its place:** N/A — polished tone, no forced humor

---

## Source Assets

| Asset | Path |
|---|---|
| App icon (dark) | `assets/images/app_icon.png` |
| App icon (light) | `assets/images/app_icon_light.jpg` |
| Cairo font | `assets/fonts/Cairo-Regular.ttf`, `Cairo-Bold.ttf` |
| Music | `.agents/skills/brag/assets/music/happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` |
| Music cues | `.agents/skills/brag/assets/music/cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.md` |

---

## Hyperframes Composition Notes

- Use `Cairo` font for all Arabic text (RTL auto via `dir="rtl"`)
- Glassmorphism cards: `backdrop-filter: blur(20px)` + semi-transparent white/black
- Color palette: Gold `#D4A843` (primary), Deep navy `#0A1628` (bg), Emerald `#10B981` (success)
- Transitions: Quick cuts (0.3s), sync "ping" = scale flash, confetti = particle burst
- Format: 1920×1080, 30fps, MP4 (H.264)
- Poster frame: Outro frame with icon + badges (baked as frame 0)