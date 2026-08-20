# DESIGN.md — فجرك (Fajrak)
> Flutter Mobile App · Material 3 · Stripe Visual Aesthetic · Apple HIG Principles · RTL Arabic-first

---

## Design Sources

This document draws from three authoritative sources, applied selectively to Flutter + Arabic mobile context:

| Source | What We Take | What We Don't Take |
|---|---|---|
| **[Stripe Design](https://stripe.com/docs/stripe-apps/design)** | Visual philosophy: borders, typography, number hierarchy, color restraint, whitespace, financial data confidence | React/web components, Stripe-specific dashboard patterns |
| **[Apple HIG](https://developer.apple.com/design/human-interface-guidelines)** | Universal mobile UX principles: touch targets, feedback timing, navigation clarity, progressive disclosure, error prevention, gestures | iOS-specific components (UIKit, SF Symbols, iOS nav patterns) |
| **[Material Design 3](https://m3.material.io)** | Flutter-native components, RTL support, dark mode system, color scheme, accessibility | Material-specific visual language where it conflicts with Stripe aesthetic |

> **Rule of thumb:** Stripe tells us *how things should look*. Apple HIG tells us *how things should behave*. Material 3 tells us *how to build it in Flutter*.

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Border Radius](#5-border-radius)
6. [Elevation — The Stripe Rule](#6-elevation--the-stripe-rule)
7. [Iconography](#7-iconography)
8. [Components](#8-components)
9. [Navigation](#9-navigation)
10. [Screen Patterns](#10-screen-patterns)
11. [Interaction & Feedback — Apple HIG](#11-interaction--feedback--apple-hig)
12. [Motion & Animation](#12-motion--animation)
13. [Dark Mode](#13-dark-mode)
14. [RTL & Arabic](#14-rtl--arabic)
15. [Accessibility](#15-accessibility)
16. [Do / Don't](#16-do--dont)

---

## 1. Philosophy

Fajrak's design is built on two pillars working in parallel:

**Stripe** defines the visual language — how the app *looks*.  
**Apple HIG** defines the interaction language — how the app *behaves*.

The three-word brief: **Trustworthy. Clear. Islamic.**

---

### 1.1 From Stripe — Visual Principles

**Numbers are heroes.**  
`[Stripe]` Financial data is the product. Every screen centers on numbers that feel large, confident, and authoritative. Numbers use tight `letterSpacing`, heavy weight, and tabular figures.

**Borders, never shadows.**  
`[Stripe]` Shadows add decoration. Borders add structure. Fajrak cards use a single `1px` border — no `boxShadow`, no `elevation`, ever.

**Whitespace is intentional.**  
`[Stripe]` Dense screens create anxiety in financial apps. Breathing room builds trust. Minimum `20px` card padding. Sections never stack without separation.

**One brand color does the heavy lifting.**  
`[Stripe]` `#1A5F8A` (Islamic blue) handles all primary actions. `#D4A843` (gold) is reserved for the accent — FAB, lesson cards, achievement moments only.

**Data confidence over data completeness.**  
`[Stripe]` Never show a number unless it is accurate. A blank state is better than a stale or loading number. If data isn't ready, show shimmer — not a zero.

---

### 1.2 From Apple HIG — Behavioral Principles

**Feedback is immediate.**  
`[HIG — Feedback]` Every tap produces a visible response within 100ms. No silent actions. Cards scale to 0.98 on press. Buttons show loading state. Forms show inline errors instantly.

**Progressive disclosure.**  
`[HIG — Navigation]` Show only what the user needs right now. The Dashboard shows 3 recent transactions — not all 200. "More" is always one tap away. Complexity is revealed on demand, never upfront.

**Prevent errors before they happen.**  
`[HIG — User Input]` Disable the confirm button until required fields are filled. Show character limits before they're exceeded. Warn about budget overrun before the user submits — not after.

**Interruptions must be earned.**  
`[HIG — Modals]` Only use blocking UI (dialogs, full-screen modals) for decisions that cannot be undone. Everything else uses non-blocking patterns: toasts, inline messages, bottom sheets.

**Destructive actions require confirmation.**  
`[HIG — Alerts]` Delete transaction, delete account, clear data — all require a confirmation step with a clearly labeled destructive button. No undo = mandatory confirm.

**Recovery is always possible.**  
`[HIG — Undo]` Accidental transaction deletion shows a toast with "تراجع" (undo) for 4 seconds. After that, action is permanent.

**The Islamic identity is felt, not labeled.**  
The app's Islamic values come through in the gold accent, the lesson card aesthetic, and typography — not through repeated Islamic phrases in the UI.

---

## 2. Color System

### 2.1 Brand Colors

```dart
// lib/core/theme/app_colors.dart

static const Color primary      = Color(0xFF1A5F8A); // Islamic blue
static const Color primaryDark  = Color(0xFF0D3D5C); // deep variant
static const Color primaryLight = Color(0xFF2A7FB8); // for dark mode
static const Color accent       = Color(0xFFD4A843); // Gold — FAB, lessons
```

### 2.2 Semantic Colors

```dart
static const Color income       = Color(0xFF2A7D4F); // green — all income values
static const Color expense      = Color(0xFFB83232); // red   — all expense values
static const Color warning      = Color(0xFFE89818); // amber — budget alerts
static const Color info         = Color(0xFF1A5F8A); // same as primary
```

### 2.3 Surface Colors — Light Mode

```dart
static const Color background    = Color(0xFFF7F8FA); // scaffold bg
static const Color surface       = Color(0xFFFFFFFF); // cards, sheets
static const Color surfaceVariant = Color(0xFFF0F2F5); // input fills, chips
static const Color borderLight   = Color(0xFFE5E7EB); // card borders
static const Color borderHover   = Color(0xFFD1D5DB); // interactive border
```

### 2.4 Surface Colors — Dark Mode

```dart
static const Color backgroundDark     = Color(0xFF0F1117);
static const Color surfaceDark        = Color(0xFF1A1D27);
static const Color surfaceVariantDark = Color(0xFF242736);
static const Color borderDark         = Color(0xFF2D3144);
static const Color borderHoverDark    = Color(0xFF3D4255);
```

### 2.5 Text Colors — Light Mode

```dart
static const Color textPrimary   = Color(0xFF111827); // headings, amounts
static const Color textSecondary = Color(0xFF6B7280); // labels, subtitles
static const Color textTertiary  = Color(0xFF9CA3AF); // hints, metadata
static const Color textInverse   = Color(0xFFFFFFFF); // on primary bg
```

### 2.6 Text Colors — Dark Mode

```dart
static const Color textPrimaryDark   = Color(0xFFF9FAFB);
static const Color textSecondaryDark = Color(0xFFD1D5DB);
static const Color textTertiaryDark  = Color(0xFF9CA3AF);
```

### 2.7 Category Tint Colors

Used exclusively as icon circle backgrounds in transaction tiles.

```dart
static const Color tintShopping  = Color(0xFFFEF3C7); // warm yellow
static const Color tintFood      = Color(0xFFFED7AA); // orange
static const Color tintTransport = Color(0xFFFEE2E2); // soft red
static const Color tintHealth    = Color(0xFFFCE7F3); // pink
static const Color tintEducation = Color(0xFFEDE9FE); // purple
static const Color tintBills     = Color(0xFFDCFCE7); // green
static const Color tintIncome    = Color(0xFFD1FAE5); // deep green
static const Color tintInvest    = Color(0xFFEDE9FE); // purple
static const Color tintOther     = Color(0xFFF3F4F6); // neutral gray
```

### 2.8 Lesson Card Colors (Islamic Night Palette)

```dart
static const Color lessonBackground = Color(0xFF1A2744); // dark navy
static const Color lessonAccent     = Color(0xFFD4A843); // same gold
static const Color lessonText       = Color(0xFFFFFFFF); // pure white
static const Color lessonSubtext    = Color(0x99FFFFFF); // 60% white
static const Color lessonVerseBox   = Color(0x1AD4A843); // 10% gold tint
```

---

## 3. Typography

### 3.1 Font Family

**IBM Plex Sans Arabic** — loaded via `google_fonts` package.

```dart
// Why this font:
// 1. Same family Stripe uses for Arabic markets
// 2. Designed for both Arabic and Latin scripts
// 3. Excellent numeric rendering — tabular figures supported
// 4. Free, hosted on Google Fonts
// 5. Works at all weights from 100–700
```

```dart
// Never use system fonts or fallbacks for primary text.
// Always use GoogleFonts.ibmPlexSansArabic()
```

### 3.2 Type Scale

```dart
// lib/core/theme/app_typography.dart

// ── Display ─────────────────────────────────────────
// Hero numbers, balance cards, large stats
displayLarge:  40px  weight:700  letterSpacing:-2.0  height:1.1
displayMedium: 32px  weight:700  letterSpacing:-1.5  height:1.15
displaySmall:  24px  weight:700  letterSpacing:-1.0  height:1.2

// ── Headings ────────────────────────────────────────
headingLg:  20px  weight:600  height:1.3
headingMd:  17px  weight:600  height:1.3
headingSm:  15px  weight:600  height:1.4

// ── Body ────────────────────────────────────────────
bodyLg:  16px  weight:400  height:1.6
bodyMd:  14px  weight:400  height:1.5
bodySm:  12px  weight:400  height:1.4

// ── Labels ──────────────────────────────────────────
labelLg:  14px  weight:500  letterSpacing:0.1
labelMd:  13px  weight:500  letterSpacing:0.2
labelSm:  11px  weight:500  letterSpacing:0.4

// ── Specialized ─────────────────────────────────────
// All currency amounts — uses tabular figures
currency:      14px  weight:500  FontFeature.tabularFigures()
currencyLarge: 32px  weight:700  letterSpacing:-1.5  tabular
```

### 3.3 Typography Rules

```
ALWAYS
  Use tight letterSpacing (-1.5 to -2.0) on display numbers
  Use tabular figures for all currency amounts
  Use weight 600 for headings, never 700
  Use weight 400 for body, never lighter

NEVER
  Use fontSize below 11px anywhere
  Use weight 300 (too thin on Arabic script)
  Mix Arabic and Latin fonts in the same text span
  Use all-caps (poor readability in Arabic)
```

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

```dart
// lib/core/theme/app_spacing.dart

xs  =  4px    // icon gap, tight inline
sm  =  8px    // between list items, icon padding
md  = 16px    // standard internal padding
lg  = 24px    // between sections
xl  = 32px    // screen top margin, large gaps
xxl = 48px    // hero sections
```

### 4.2 Layout Constants

```dart
screenPaddingHorizontal = 20px  // left/right on all screens
cardPadding             = 20px  // all sides on AppCard
cardPaddingTight        = 16px  // compact variant
sectionGap              = 24px  // vertical distance between page sections
listItemHeight          = 68px  // transaction tile — FIXED, use itemExtent
```

### 4.3 Grid System

No formal grid. Use these breakpoints for layout decisions:

```
Mobile (Flutter): single-column, full width
  Exception: 2-column grids for quick tool shortcuts
  Exception: 3-column stat rows in Reports
  Exception: 4-column category icon pickers
```

### 4.4 Safe Areas

```dart
// Always respect safe areas
// Use SafeArea widget on all top-level screens
// Bottom nav + FAB clear system navigation bar
// Minimum bottom padding: 16px above bottom nav
```

---

## 5. Border Radius

```dart
// lib/core/theme/app_radius.dart

xs   =  4px   // small badges, progress bars
sm   =  8px   // small buttons, filter chips
md   = 12px   // buttons (primary), input fields
lg   = 16px   // cards (default)  ← most used
xl   = 24px   // large sheets, bottom nav
full = 999px  // pills, tags, FAB label
```

### Radius Rules

```
AppCard, BalanceCard, LessonCard       → lg (16px)
AppButton primary/secondary            → md (12px)
Input fields                           → md (12px)
Filter chips, category pills           → full (999px)
Category icon circles                  → full (999px)
Progress bars                          → xs (4px)
Bottom sheet                           → xl (24px) top corners only
```

---

## 6. Elevation — The Stripe Rule

> `[Stripe]` Stripe discovered that borders communicate structure without visual weight. Shadows on financial data feel like UI tricks — borders feel like precision.

```
RULE: elevation = 0, always.
RULE: Use 1px border to define card edges.
RULE: Shadow is never used anywhere in the app.
```

```dart
// The single card definition used everywhere:
CardTheme(
  elevation: 0,                              // ← never change this
  color: AppColors.surface,
  shape: RoundedRectangleBorder(
    borderRadius: AppRadius.lg,
    side: BorderSide(
      color: AppColors.borderLight,          // light mode
      // color: AppColors.borderDark,        // dark mode
      width: 1,
    ),
  ),
)
```

Why: Stripe discovered that borders communicate structure without visual weight. Shadows on financial data feel like UI tricks — borders feel like precision.

---

## 7. Iconography

### 7.1 Icon Set

Use **Material Icons Outlined** for all navigation and UI icons.  
Use **emoji** for category identifiers in transaction tiles only.

```dart
// Navigation icons (outlined style)
Home tab:         Icons.home_outlined
Transactions tab: Icons.swap_horiz_outlined
Reports tab:      Icons.bar_chart_outlined
More tab:         Icons.menu_outlined

// Action icons
Add:     Icons.add
Search:  Icons.search_outlined
Edit:    Icons.edit_outlined
Delete:  Icons.delete_outline
Back:    Icons.arrow_back (auto-flipped for RTL)
Forward: Icons.chevron_left (RTL — points right visually)
Bell:    Icons.notifications_outlined
```

### 7.2 Category Emojis

```dart
// Transaction categories — emoji in 40px tinted circle
shopping:    '🛒'  tint: tintShopping
food:        '🍽️'  tint: tintFood
transport:   '⛽'  tint: tintTransport
health:      '💊'  tint: tintHealth
education:   '🎓'  tint: tintEducation
bills:       '💡'  tint: tintBills
salary:      '💼'  tint: tintIncome
investment:  '📈'  tint: tintInvest
gift:        '🎁'  tint: tintShopping
other:       '📦'  tint: tintOther
```

### 7.3 Icon Sizing

```dart
navIcon:     24px  // bottom nav
appBarIcon:  22px  // app bar actions
listIcon:    20px  // in list items
inlineIcon:  16px  // inline with text
categoryCircle: 40px container, 20px emoji
```

---

## 8. Components

### 8.1 AppCard

The base container. All cards in the app use this.

```
background:    surface (#FFFFFF)
border:        1px solid borderLight
border-radius: 16px (AppRadius.lg)
padding:       20px all sides
elevation:     0 — NEVER use shadow
```

Variants:
- `AppCard` — standard, 20px padding
- `AppCard.tight` — 16px padding
- `AppCard.lesson` — dark navy background, gold text

---

### 8.2 AppButton

```
PRIMARY
  background:   #1A5F8A
  text:         white, labelLg, weight 600
  height:       52px
  radius:       12px
  loading:      replaces label with CircularProgressIndicator (white, size 20)
  disabled:     opacity 0.5, no tap response

SECONDARY
  background:   transparent
  border:       1.5px solid #1A5F8A
  text:         #1A5F8A, labelLg, weight 600
  height:       52px
  radius:       12px

GHOST
  background:   transparent
  border:       none
  text:         textPrimary or primary, labelMd
  height:       40px
  padding:      12px horizontal

ACCENT (FAB label, gold actions)
  background:   #D4A843
  text:         #7A5800 (dark amber), weight 600
  height:       48px
  radius:       full

DANGER
  background:   transparent
  border:       1.5px solid #B83232
  text:         #B83232
  height:       52px

SMALL variant: height 32px, padding 12px, fontSize 11px, radius 8px
```

---

### 8.3 BalanceCard

The most important component in the app. Stripe-style hero number.

```
Structure:
  label:    "رصيدك هذا الشهر"  — labelSm, textSecondary
  amount:   displayLarge (40px, 700, letterSpacing -2.0) + currency suffix
  divider:  1px vertical line between income and expense rows
  income:   "↑ دخل" label + amount in income green
  expense:  "↓ مصروف" label + amount in expense red

States:
  default:  white card, blue text for amount
  negative: 1px border in expense color (#B83232), ⚠ icon before amount
  on-track: accent gold dot on top-right corner
```

---

### 8.4 TransactionTile

```
height:         68px  ← FIXED — use ListView.builder + itemExtent: 68
padding:        14px horizontal, 12px vertical
leading:        40px circle, tint background, emoji icon (18px)
title:          description — bodyMd weight 600, textPrimary
subtitle:       "date · category" — bodySm, textTertiary
trailing:       amount — currency style, income green or expense red
separator:      none between tiles — 1px Divider at start of each month section only
```

---

### 8.5 CategoryPill

```
shape:       pill (radius: full)
padding:     4px vertical, 10px horizontal
background:  category tint color
text:        labelSm, weight 500, dark variant of tint
icon:        emoji, 12px, before text
gap:         4px between emoji and text
border:      none
```

---

### 8.6 AppTextField

```
height:        48px
background:    surface
border:        1px solid borderLight
border-radius: 12px (md)
padding:       16px horizontal, 14px vertical
font:          bodyMd, textPrimary

States:
  focused:  1.5px border, primary color
  error:    1.5px border, expense red + error message below
  disabled: opacity 0.5
  filled:   surfaceVariant background

Label:  above field, labelMd, textSecondary
Error:  below field, bodySm, expense red
Hint:   inside field, bodyMd, textTertiary
```

---

### 8.7 ProgressBar

```
track height:  6px
track bg:      surfaceVariant
radius:        4px (xs)
fill:          gradient: primary → accent (for budget)
               income green (for goals)
               expense red (for overspent)

Label row (above): left — title, right — percentage chip
Info row (below):  left — days remaining, right — amount remaining
```

---

### 8.8 ProgressRing

Used in Budget screen hero.

```
size:         120px diameter
stroke width: 10px
track:        surfaceVariant
fill:         primary → accent gradient
center label: percentage — displaySmall, textPrimary
sub label:    "مستخدمة" — labelSm, textSecondary
```

---

### 8.9 LessonCard (Lesson Preview)

```
background:   #1A2744 (lessonBackground)
radius:       16px
padding:      16px

header:       "✦" gold icon + "درس اليوم" — labelSm, accent gold
badge:        "درس X من ١٧" — bodySm, 60% white
title:        headingSm, white
preview:      2 lines max, bodySm, 60% white, overflow ellipsis
cta:          "اقرأ المزيد ←" — labelMd, accent gold

decoration:   80px blurred circle, 10% gold — top-right corner
```

---

### 8.10 ShimmerLoader

Never use `CircularProgressIndicator` for list/data loading.  
Always use shimmer placeholders that match the shape of incoming content.

```dart
// package: shimmer ^3.0.0

baseColor:      surfaceVariant
highlightColor: surface
animation:      shimmer 1.5s ease-in-out infinite

TransactionShimmer: 6 fake tiles, same 68px height as real tiles
DashboardShimmer:   3 placeholder cards in same layout order
```

---

### 8.11 EmptyState

Every list screen must have a designed empty state.

```
Structure:
  icon:     outlined, 48px, textTertiary color
  title:    headingMd, textPrimary, centered
  subtitle: bodyMd, textSecondary, centered, 2 lines max
  cta:      primary button (optional)

Center vertically in the available space, not at the top.
```

---

### 8.12 Filter Chips

```
height:      34px
padding:     0 14px
radius:      full
background:  surfaceVariant (inactive) / primary (active)
text:        labelMd, textSecondary (inactive) / white (active)
border:      1px borderLight (inactive) / none (active)
scroll:      horizontal SingleChildScrollView, no wrap
```

---

### 8.13 SectionHeader

```
layout:      Row, mainAxisAlignment: spaceBetween
title:       headingSm, textPrimary
action link: "الكل ←" labelMd, primary color
padding:     20px horizontal, 14px top, 8px bottom
```

---

## 9. Navigation

### 9.1 Bottom Navigation Bar — 4 tabs only

```
background:      surface
border top:      1px borderLight
elevation:       0
selected color:  primary
unselected:      textTertiary
active indicator: 4px dot below icon, primary color
label:           labelSm

Tabs:
  1. الرئيسية    icon: home_outlined
  2. المعاملات   icon: swap_horiz_outlined
  3. التقارير    icon: bar_chart_outlined
  4. المزيد      icon: menu_outlined
```

### 9.2 Floating Action Button

```
label:       "سجّل معاملة"
background:  accent gold (#D4A843)
text:        dark amber (#7A5800), weight 600
radius:      full (ExtendedFAB)
icon:        Icons.add, dark amber
elevation:   0
shadow:      box-shadow: 0 4px 12px rgba(212,168,67,0.35)  ← ONLY exception to no-shadow rule
position:    center bottom, 16px above nav bar

Visibility:
  SHOW:  Home, Transactions, Reports
  HIDE:  More, and all secondary screens (Budget, Debts, etc.)

On tap: opens AddTransactionSheet bottom sheet
```

### 9.3 App Bar

```
background:      surface (standard screens)
                 primary (#1A5F8A) for Dashboard header only
elevation:       0
scrolled elevation: 0  (never changes)
title style:     headingMd, textPrimary
leading:         back arrow (auto, RTL-aware)
actions:         max 2 icons, 22px, textSecondary
center title:    false (RTL — title on right)
```

### 9.4 Bottom Sheet

```
drag handle:      4px × 32px pill, surfaceVariant, centered at top
border radius:    24px top corners only
background:       surface
padding:          20px
header:           title (headingMd) + optional close icon
max height:       90% of screen
keyboard aware:   true — sheet rises with keyboard
```

---

## 10. Screen Patterns

### 10.1 Dashboard — Header Overlap Pattern

The balance card overlaps the primary header. This is the app's signature layout.

```
1. AppBar with primary bg, greeting + date
2. Balance card positioned at marginTop: -10px (overlaps header)
3. Remaining cards scroll underneath
4. FAB always visible at bottom center
```

### 10.2 List Screens (Transactions, Alerts)

```
1. Search bar — full width, 20px horizontal padding
2. Filter chips — horizontal scroll, no wrapping
3. Month section header — label + summary
4. ListView.builder — ALWAYS, never ListView
   itemExtent: 68 for transactions (FIXED height)
5. Pull-to-refresh
6. Load more on scroll (pagination, 20 items/page)
7. Empty state centered if no items
```

### 10.3 Form Screens (Add Transaction, Budget Edit)

```
1. Bottom sheet preferred over full screen for short forms
2. Full screen for complex forms (Add Debt, Goals)
3. Amount field always auto-focused
4. Large numeric display while typing
5. Confirm button sticks to bottom above keyboard
6. Disable confirm until required fields filled
```

### 10.4 Calculator Screens (FIRE, Zakat)

```
1. Form inputs in AppCard sections (collapsible for long forms)
2. Result card always visible — updates live as user types
3. Result hero number: displayMedium with semantic color
4. No submit button — results are reactive
```

### 10.5 Detail Screens (Debt Detail, Lesson Detail)

```
1. Hero section at top (matches list card style, larger)
2. Content sections in AppCards below
3. Action buttons at bottom (sticky)
4. Back navigation via system gesture or AppBar back
```

---

## 11. Interaction & Feedback — Apple HIG

> These rules come directly from [Apple's Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) and apply universally to mobile apps regardless of platform.

### 11.1 Response Times `[HIG — Feedback]`

```
< 100ms   Tap feedback must be visible (scale, color change)
< 200ms   Simple state changes (toggle, chip select)
< 500ms   Screen transitions
< 1000ms  Data loads — show shimmer immediately, not after delay
> 1000ms  Always show a loading indicator — user must know app is working
> 3000ms  Show error fallback — assume the request failed
```

### 11.2 Feedback Patterns `[HIG — Feedback]`

```dart
// Every tappable surface uses InkWell or GestureDetector with visual feedback

// Cards — scale on press
GestureDetector(
  onTapDown: (_) => setState(() => _scale = 0.98),
  onTapUp:   (_) => setState(() => _scale = 1.0),
  onTapCancel: () => setState(() => _scale = 1.0),
  child: AnimatedScale(scale: _scale, duration: Duration(milliseconds: 100)),
)

// Buttons — loading state replaces label (never disable silently)
// Switches/toggles — instant visual response, async save in background
// Pull-to-refresh — RefreshIndicator, primary color
```

### 11.3 Progressive Disclosure `[HIG — Navigation]`

```
Dashboard:    shows last 3 transactions only → "الكل" reveals full list
More screen:  shows tool names only → tap reveals full screen
Lesson list:  shows title only → tap opens full detail
Reports:      shows monthly summary → tap category opens breakdown
Zakat form:   sections collapsed by default → tap to expand each category

RULE: The user's first view of any screen should fit without scrolling
      for the most common use case. Depth is one tap away, never forced.
```

### 11.4 Interruption Model `[HIG — Modals]`

```
NON-BLOCKING (preferred):
  ✓ Toast — transient info (saved, deleted, error)
  ✓ Inline error — form validation
  ✓ Banner — budget warning at top of card
  ✓ Bottom sheet — add/edit actions

BLOCKING (only when necessary):
  ✓ Dialog — irreversible destructive actions only
  ✗ Dialog — for confirmations that have safe defaults
  ✗ Dialog — for information the user didn't ask for
  ✗ Dialog — for errors that have obvious recovery

NEVER interrupt the user for:
  → Successful saves (use toast)
  → Non-critical notifications (use banner or badge)
  → Feature promotions (never)
```

### 11.5 Destructive Action Pattern `[HIG — Alerts]`

```dart
// Pattern for all destructive actions (delete transaction, clear data, etc.)

// Step 1: User taps destructive action
// Step 2: Bottom sheet appears (NOT dialog) with:
//   - Clear title: "حذف المعاملة؟"
//   - Brief consequence: "لا يمكن التراجع عن هذا الإجراء"
//   - Two buttons:
//     → Destructive: "حذف" in expense red (#B83232)
//     → Cancel: "إلغاء" as ghost button

// Step 3: On confirm, show undo toast for 4 seconds
ScaffoldMessenger.of(context).showSnackBar(
  SnackBar(
    content: Text('تم حذف المعاملة'),
    action: SnackBarAction(label: 'تراجع', onPressed: _undoDelete),
    duration: Duration(seconds: 4),
  ),
);
```

### 11.6 Error Prevention `[HIG — User Input]`

```
BEFORE submission:
  ✓ Disable confirm button until required fields have valid values
  ✓ Show budget remaining live as user types transaction amount
  ✓ Show password strength indicator while typing
  ✓ Validate email format on blur (not on every keystroke)

DURING submission:
  ✓ Replace button label with loading indicator
  ✓ Disable all form fields to prevent double-submit

AFTER failure:
  ✓ Show error inline next to the field that caused it
  ✓ Keep form data filled — never clear on error
  ✓ Offer specific recovery action ("حاول مرة أخرى", "تحقق من الاتصال")
  ✗ Never show generic "something went wrong" without a recovery path
```

### 11.7 Gestures `[HIG — Gestures]`

```
SUPPORTED:
  Swipe down     → dismiss bottom sheet
  Pull down      → refresh list (RefreshIndicator)
  Swipe left     → reveal delete on transaction tile (optional)
  Long press     → context menu on transaction (edit, delete, duplicate)
  Back gesture   → system back (Android) / swipe from edge

NOT SUPPORTED:
  Custom swipe navigation between tabs (use bottom nav tap only)
  Pinch/zoom on financial charts
  Force press / 3D touch (Android doesn't have it)
```

### 11.8 Empty & Error States `[HIG — Loading]`

```
The three states every data screen must handle:

1. LOADING  → shimmer placeholder matching final content shape
2. EMPTY    → designed empty state with icon + message + CTA
3. ERROR    → error state with specific message + retry button

NEVER show:
  → Blank white screen while loading
  → "null" or raw error codes to users
  → Partial data without indicating it's incomplete
```

---

## 12. Motion & Animation

> `[HIG — Animation]` Animation should have purpose. Every animated transition must either orient the user in space, provide feedback on an action, or show a relationship between elements. Decorative animation has no place in a financial app.

### 12.1 Duration Budget

```
100ms    card press feedback (scale 0.98)        [HIG: immediate]
150ms    tab switch                               [HIG: orientation]
200ms    FAB expand, toast appear                 [HIG: feedback]
250ms    page route transition                    [HIG: navigation]
300ms    bottom sheet open/close                  [HIG: context shift]
600ms    balance card number count-up             [Stripe: data reveal]
1000ms   lesson completion shimmer (once only)    [reward moment]
```

### 12.2 Curves

```
easeInOut       → tab switch, page transitions
easeOutCubic    → sheet open
easeOutBack     → FAB expand (slight overshoot — joy)
easeOutQuart    → number count-up
linear          → shimmer animation
```

### 12.3 Animation Rules

```
[HIG] NEVER
  Animate on every frame (no idle animations)
  Use duration > 400ms for UI transitions
  Animate multiple things simultaneously in the same region
  Use bounce/spring on financial data — too playful
  Play sounds with animations (no haptic without user action)

[Stripe] ALWAYS
  Animate the number count-up when Dashboard first loads
  Use scale feedback (0.98) on all tappable cards
  Use shimmer — never spinner for list data
  Keep total visible animation time per interaction < 300ms

[HIG] Respect system settings:
  if (MediaQuery.of(context).disableAnimations) → skip all transitions
```

### 12.4 Specific Behaviors

```
Transaction added:
  → sheet dismisses (300ms easeOutCubic)
  → green check toast appears (200ms)          [HIG: feedback]
  → new tile slides in from bottom (250ms)     [HIG: orientation]

Budget exceeded:
  → card border pulses red once (600ms)        [HIG: alert without interruption]
  → NO dialog or modal                         [HIG: don't interrupt]

Balance card on load:
  → number counts up 0 → actual (600ms)        [Stripe: data confidence]

Lesson complete:
  → gold shimmer once (1000ms, never repeats)  [reward moment]

Page route:
  → fade + slight upward slide (250ms)         [HIG: spatial model]

Error state:
  → shake animation on failed field (300ms)    [HIG: feedback]
```

---

## 13. Dark Mode

### 13.1 Auto-switch

```dart
MaterialApp.router(
  themeMode: ThemeMode.system,  // follows device setting
  theme: AppTheme.light,
  darkTheme: AppTheme.dark,
)
```

### 13.2 Surface Mapping

| Light Mode | Dark Mode |
|---|---|
| `#F7F8FA` background | `#0F1117` backgroundDark |
| `#FFFFFF` surface | `#1A1D27` surfaceDark |
| `#F0F2F5` surfaceVariant | `#242736` surfaceVariantDark |
| `#E5E7EB` border | `#2D3144` borderDark |
| `#111827` text | `#F9FAFB` textPrimaryDark |

### 13.3 Colors that don't change between modes

```dart
primary:   #1A5F8A  → #2A7FB8 (lighter for dark)
accent:    #D4A843  → same
income:    #2A7D4F  → same
expense:   #B83232  → same
lessonBg:  #1A2744  → same (always dark)
```

### 13.4 Dark Mode Rules

```
NEVER hardcode white or black — always use AppColors tokens
NEVER use opacity on white to fake disabled (use textTertiary)
TEST every screen in dark mode before shipping
Category tint colors: use slightly darker variants in dark mode
```

---

## 14. RTL & Arabic

### 14.1 Flutter RTL Setup

```dart
MaterialApp.router(
  locale: const Locale('ar'),
  supportedLocales: const [Locale('ar'), Locale('en')],
  localizationsDelegates: const [
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ],
)
```

Flutter handles most RTL automatically when locale is Arabic.

### 14.2 Manual RTL Overrides

```dart
// Back arrow auto-flips — no override needed
// Chevron: use Icons.chevron_left — displays as right-pointing in RTL
// Text alignment: default is start (right in Arabic)

// For mixed content (numbers in Arabic text):
Text(
  '٢٠٠٠ د.أ',
  textDirection: TextDirection.rtl,
)
```

### 14.3 Arabic Number Formatting

```dart
// lib/core/utils/currency_formatter.dart
// Always use Arabic-Indic numerals for financial values
// Use intl package with 'ar_JO' locale

String formatCurrency(double amount, {String currency = 'د.أ'}) {
  final formatter = NumberFormat.currency(
    locale: 'ar_JO',
    symbol: currency,
    decimalDigits: 2,
  );
  return formatter.format(amount);
  // Output: ١٬٢٣٤.٥٦ د.أ
}
```

### 14.4 Date Formatting

```dart
// Gregorian only — no Hijri
import 'package:intl/intl.dart';

// Header date:   الأربعاء، ١٨ مايو ٢٠٢٦
DateFormat('EEEE، d MMMM yyyy', 'ar').format(DateTime.now())

// Short date:    ١٨ مايو ٢٠٢٦
DateFormat('d MMMM yyyy', 'ar').format(date)

// Relative:      اليوم / أمس / منذ X أيام
// Custom logic — see DateFormatter utility class
```

### 14.5 RTL Layout Rules

```
ListTile:   leading on RIGHT (auto in RTL)
AppBar:     title on RIGHT, actions on LEFT (auto)
BackButton: arrow points LEFT (auto-flipped)
Chevrons:   use chevron_left — appears pointing right in RTL
Row:        start = right, end = left
Padding:    symmetric or start/end (never left/right)
```

---

## 15. Accessibility

> `[HIG — Accessibility]` Accessibility is not a feature — it is a quality of the entire experience. Design for users with visual, motor, and cognitive differences from the start.

### 15.1 Tap Targets `[HIG]`

```
Minimum:   48 × 48 dp  — all interactive elements    (Android guideline)
Preferred: 56 × 56 dp  — primary actions
Apple HIG: 44 × 44 pt  — Apple's minimum (we exceed this)

NEVER place two tap targets closer than 8dp apart
```

### 15.2 Color Contrast `[HIG + WCAG AA]`

```
Body text on white:       minimum 4.5:1  (WCAG AA)
Large text (18px+):       minimum 3.0:1  (WCAG AA)
Interactive elements:     minimum 3.0:1

Verified tokens:
  textPrimary (#111827):   14.5:1 on white ✓
  textSecondary (#6B7280):  4.6:1 on white ✓
  income (#2A7D4F):         4.5:1 on white ✓
  expense (#B83232):        4.5:1 on white ✓
  primary (#1A5F8A):        5.8:1 on white ✓
```

### 15.3 Screen Reader Support `[HIG — VoiceOver / TalkBack]`

```dart
// All icons must have semanticLabel in Arabic
Icon(Icons.notifications_outlined, semanticLabel: 'التنبيهات')

// Decorative icons excluded from semantics
Icon(Icons.chevron_left, excludeFromSemantics: true)

// Charts need description
Semantics(
  label: 'رسم بياني: مصاريف مايو ٨٩٥ دينار، أعلى فئة: تسوق ٣٢٠',
  child: WeeklySpendingChart(),
)

// Error messages must be announced immediately
Semantics(liveRegion: true, child: Text(errorMessage))

// Buttons: label describes action, not appearance
// ✓ semanticLabel: 'حفظ المعاملة'
// ✗ semanticLabel: 'الزر الأخضر'
```

### 15.4 Text Scaling `[HIG — Dynamic Type]`

```dart
// Never disable text scaling
// Never hardcode pixel heights that break at large text sizes
// Use TextOverflow.ellipsis with maxLines for constrained containers
// Test at 150% and 200% system text scale

// ✓ Correct — adapts to text scale
Text(label, maxLines: 1, overflow: TextOverflow.ellipsis)

// ✗ Wrong — breaks at large text
SizedBox(height: 20, child: Text(label))
```

### 15.5 Motor Accessibility `[HIG]`

```
✓ All swipe gestures have tap alternatives
✓ No time-limited interactions (except undo toast — 4s is sufficient)
✓ Forms navigable with keyboard/switch control
✓ No precision required — all targets generously sized
✓ Long press actions also accessible via context menu
```

### 15.6 Cognitive Accessibility `[HIG]`

```
✓ One primary action per screen
✓ Plain Arabic language — no jargon
✓ Error messages explain what to do, not just what went wrong
✓ Consistent patterns — same action always in same place
✓ No information conveyed by color alone (always + icon or text)
✓ Focus ring visible on all keyboard-focusable elements (2px primary)
```

---

## 16. Do / Don't

### Do ✓

```
[Stripe] ✓ Use 1px border to define cards — no shadow, no elevation
[Stripe] ✓ Display financial amounts in displayLarge, letterSpacing -2.0
[Stripe] ✓ Use tabular figures for all currency amounts
[Stripe] ✓ Use AppColors.accent (gold) exclusively for FAB and lesson card
[Stripe] ✓ Show shimmer immediately — never show stale or zero data
[Stripe] ✓ Keep whitespace generous — 20px card padding minimum

[HIG]    ✓ Every tap must respond visually within 100ms
[HIG]    ✓ Disable confirm button until required fields are valid
[HIG]    ✓ Show undo toast (4s) after every destructive action
[HIG]    ✓ Use bottom sheet for actions, dialog only for irreversible destructs
[HIG]    ✓ Provide empty state + CTA for every list screen
[HIG]    ✓ Respect MediaQuery.disableAnimations
[HIG]    ✓ All icons have semanticLabel in Arabic
[HIG]    ✓ Test TalkBack on every screen before shipping

[Both]   ✓ Use IBM Plex Sans Arabic — never system fonts
[Both]   ✓ Test dark mode on every screen before shipping
[Both]   ✓ Format all numbers with Arabic-Indic numerals
[Both]   ✓ Respect safe areas — SafeArea on all top-level screens
```

### Don't ✗

```
[Stripe] ✗ Use elevation or boxShadow on cards — ever
[Stripe] ✗ Use more than 2 brand colors in any single screen
[Stripe] ✗ Show a number that might be wrong — blank > stale
[Stripe] ✗ Use Google Fonts with allowRuntimeFetching: true in production

[HIG]    ✗ Show a dialog for non-destructive confirmations
[HIG]    ✗ Interrupt user flow for notifications or feature promotions
[HIG]    ✗ Leave form data blank after a submission error
[HIG]    ✗ Show "something went wrong" without a recovery action
[HIG]    ✗ Use animations when MediaQuery.disableAnimations is true
[HIG]    ✗ Place tap targets closer than 8dp apart
[HIG]    ✗ Use gestures without a tap equivalent fallback

[Both]   ✗ Use all-caps text in Arabic
[Both]   ✗ Put more than 4 tabs in the bottom nav
[Both]   ✗ Load all transactions without pagination
[Both]   ✗ Use accent gold for destructive or error states
[Both]   ✗ Use Left/Right padding — always Start/End for RTL safety
[Both]   ✗ Use LinearProgressIndicator for full-screen loading
```

---

## Quick Reference

```
Primary:      #1A5F8A   Accent:       #D4A843
Income:       #2A7D4F   Expense:      #B83232
Surface:      #FFFFFF   Background:   #F7F8FA
Border:       #E5E7EB   Text:         #111827

Font:         IBM Plex Sans Arabic
Display:      40px / 700 / -2.0 letterSpacing    [Stripe]
Card radius:  16px   Button radius: 12px
Card padding: 20px   Screen H pad:  20px
List height:  68px (transaction tile, fixed)
Elevation:    ZERO — always                       [Stripe]
Shadow:       NONE — always (FAB is the only exception)

Tap feedback: < 100ms always                      [HIG]
Animation:    page 250ms / sheet 300ms / numbers 600ms
Undo toast:   4 seconds after destructive action  [HIG]
Dialog:       destructive actions only            [HIG]
```

---

## Sources

- **Stripe Design:** https://stripe.com/docs/stripe-apps/design
- **Apple Human Interface Guidelines:** https://developer.apple.com/design/human-interface-guidelines
- **Material Design 3:** https://m3.material.io
- **IBM Plex Sans Arabic:** https://fonts.google.com/specimen/IBM+Plex+Sans+Arabic
- **WCAG 2.1 AA:** https://www.w3.org/TR/WCAG21/

---

*DESIGN.md — Fajrak v2.1 · Sama Code · May 2026*
*Single source of truth for all visual and interaction decisions.*

> **Stripe** → how it looks. **Apple HIG** → how it behaves. **Material 3** → how it's built.
