# UI-SPEC — Fajrak Flutter App

**Phase:** 1 - Existing App Audit
**Status:** draft
**Created:** 2026-09-25

---

## 1. Copywriting Contract

### Primary CTAs (verb + noun)
| Screen | Current Label | Required Fix |
|--------|---------------|--------------|
| Add Transaction | "Save Transaction" / "Save Changes" | ✅ Specific |
| Add Debt | "Add" / "Save Changes" | **BLOCK**: "Add" → "Add Debt" |
| Add Goal | "Add" / "Save Changes" | **BLOCK**: "Add" → "Add Goal" |
| Add Budget | "Add" / "Save Changes" | **BLOCK**: "Add" → "Add Budget" |
| Add Investment | "Add" / "Save Changes" | **BLOCK**: "Add" → "Add Investment" |
| Generic dialogs | "Save" / "Cancel" | **BLOCK**: "Save" → context-specific |
| Delete confirmations | "Delete" | **BLOCK**: "Delete" → "Delete Transaction"/"Delete Debt" |
| Settings actions | "Apply" | **BLOCK**: "Apply" → "Save Settings" |
| Onboarding | "Start Free" | ✅ Specific |
| Auth | "Login" / "Register" | ✅ Specific |

### Empty States
| Screen | Current Copy | Required Fix |
|--------|--------------|--------------|
| Transactions | "No transactions yet" | ✅ Specific + action hint missing |
| Debts | "No active debts. Good job!" | ✅ Specific |
| Goals | "No goals yet" (inferred) | **BLOCK**: Missing empty state |
| Investments | "No investments yet" (inferred) | **BLOCK**: Missing empty state |
| Alerts | "No alerts" (inferred) | **BLOCK**: Missing empty state |
| Budgets | "No budgets set" (inferred) | **BLOCK**: Missing empty state |

### Error States
| Context | Current Copy | Required Fix |
|---------|--------------|--------------|
| Network error | "Check your internet connection and try again." | ✅ Has solution path |
| Generic error | "Something went wrong. Please try again." | **BLOCK**: No solution path |
| Save failure | "Error: {exception}" | **BLOCK**: Raw exception shown |
| Sync failure | Handled in service, not surfaced | **BLOCK**: Missing user-facing copy |

### Destructive Actions
| Action | Confirmation Approach |
|--------|----------------------|
| Delete transaction | `ConfirmDialog` with "Are you sure? This cannot be undone." | ✅ Declared |
| Delete debt | Same pattern | ✅ Declared |
| Delete goal | Same pattern | ✅ Declared |
| Logout | Not explicitly confirmed | **FLAG**: No confirmation declared |

---

## 2. Visuals Contract

### Primary Focal Points (per screen)
| Screen | Declared Focal Point | Status |
|--------|---------------------|--------|
| Dashboard | Net Worth / Hero Balance Card | **FLAG**: Not explicitly declared |
| Transactions | Transaction List + Quick Add FAB | **FLAG**: Not explicitly declared |
| Debts | Debt Summary Section + Progress | **FLAG**: Not explicitly declared |
| Investments | Portfolio Chart Card | **FLAG**: Not explicitly declared |
| Goals | Overall Progress Card | **FLAG**: Not explicitly declared |
| Accounts | Account Balance Cards | **FLAG**: Not explicitly declared |
| Settings | Profile Form (top) | **FLAG**: Not explicitly declared |

### Icon-Only Actions (accessibility)
| Location | Icon | Label Fallback |
|----------|------|----------------|
| Bottom Nav (5 tabs) | Icons only: more_horiz, account_balance_wallet, credit_card, swap_vert, dashboard | ✅ Labels via `NavItemWidget.label` |
| Dashboard customize | `Icons.tune_rounded` | ✅ Text "Customize" alongside |
| Quick Add | FAB with `Icons.add` | ✅ "Quick Add" label in `DashboardQuickAdd` |
| Transaction filters | `Icons.filter_list` | ✅ "Filter" label |
| Debt celebration | `Icons.celebration` | ✅ Text in dialog |

---

## 3. Color Contract

### 60/30/10 Split
| Role | Color | Usage % | Status |
|------|-------|---------|--------|
| **60% Neutral** | Light: `#F8FAFC` (bg) / `#FFFFFF` (card)<br>Dark: `#070B14` (bg) / `#131C31` (card) | 60% | ✅ Declared |
| **30% Primary** | Light: `#1A5F8A` (Islamic Blue)<br>Dark: `#2B7BB5` | 30% | ✅ Declared |
| **10% Accent** | Gold: `#D4A843` / `#F5D980` | 10% | ✅ Declared |

### Accent Reserved For (specific elements only)
- Primary CTA buttons (ElevatedButton)
- Active navigation item (bottom nav)
- Focus rings on inputs
- Health score indicator (dashboard)
- Gold badges (gamification)
- **NOT** for all interactive elements

### Semantic Colors (declared)
| Role | Color | Used For |
|------|-------|----------|
| Success (Income) | `#10B981` | Income amounts, positive net, health score ≥80 |
| Error (Expense) | `#EF4444` | Expense amounts, negative net, delete actions |
| Warning (Budget) | `#F59E0B` | Budget near-limit, health score 40-60 |
| Info | `#3B82F6` | Neutral informational |
| Purple (Savings) | `#8B5CF6` | Savings goals, investments |
| Cyan (Transfers) | `#06B6D4` | Transfers, misc |

### Destructive Color
- **Declared**: `AppColors.error = #EF4444`
- **Used**: Delete buttons, expense amounts, negative balances
- **Status**: ✅ Declared and used

---

## 4. Typography Contract

### Font Stack
- **Primary**: `IBMPlexSansArabic` (Variable: Regular, Medium, SemiBold, Bold)
- **Fallback**: `Cairo` → `Roboto` → `Noto Color Emoji` → `Noto Sans Arabic` → `sans-serif`

### Declared Font Sizes (14 total — **EXCEEDS 4 MAX**)
| Name | Size | Weight | Use Case |
|------|------|--------|----------|
| largeTitle | 34 | w700 | — (unused) |
| title1 | 28 | w700 | — (unused) |
| title2 | 22 | w700 | Screen titles |
| title3 | 20 | w600 | Section headers |
| headline | 17 | w600 | Button labels, card titles |
| body | 17 | w400 | Body text |
| callout | 16 | w400 | Secondary text, labels |
| subheadline | 15 | w400 | — (unused) |
| footnote | 13 | w400 | Metadata, timestamps |
| caption1 | 12 | w400 | Chip labels, nav labels |
| caption2 | 11 | w400 | — (unused) |

### Currency Styles (5 additional — **EXCEEDS 4 MAX**)
| Name | Size | Weight | Use Case |
|------|------|--------|----------|
| amountXl | 36 | w700 | Net worth hero |
| amountLg | 28 | w700 | Dashboard totals |
| amount | 20 | w700 | Card balances |
| amountSm | 16 | w600 | List item amounts |
| amountXs | 13 | w600 | Small metadata |

### Font Weights Used
- w400 (Regular), w500 (Medium), w600 (SemiBold), w700 (Bold), w900 (ExtraBold in widgets)
- **Total: 5 weights** — **EXCEEDS 2 MAX**

### Line Heights
- body: 1.5 ✅
- footnote: 1.5 ✅
- Others: default (not explicitly declared) — **FLAG**

---

## 5. Spacing Contract

### Base Scale (8-pt grid — all multiples of 4 ✅)
| Token | Value | Use Case |
|-------|-------|----------|
| xs | 4 | Icon gaps, tight spacing |
| sm | 8 | Standard gaps, icon↔label |
| md | 16 | Card padding, page horizontal |
| lg | 24 | Section gaps, item gaps |
| xl | 32 | Large section separation |
| xxl | 48 | Major section breaks |
| xxxl | 64 | Screen-level padding |

### Semantic Spacings
| Token | Value | Use Case |
|-------|-------|----------|
| cardPadding | 20 | Inner card padding (Stripe-style) |
| pageHorizontal | 20 | Screen edge padding |
| sectionGap | 24 | Between major sections |
| itemGap | 12 | Between list items |
| iconGap | 8 | Icon ↔ label |
| inputHeight | 52 | Text field / button height |
| tapTarget | 44 | Minimum tap area (Apple HIG) |
| navBarHeight | 64 | Bottom navigation bar |

### Exceptions (none declared)
- All values are multiples of 4 ✅
- No non-standard values found ✅

---

## 6. Registry Safety Contract

### Third-Party Registries
- **None used** — Pure Flutter/Material 3 + custom design system
- **shadcn**: Not initialized
- **Magic UI / Aceternity / other**: Not used

### Component Library
- **Base**: Flutter Material 3 (built-in)
- **Custom**: `GlassPanel`, `SkeletonLoader`, `ConfirmDialog`, `CurrencyPickerSheet`
- **Charts**: `fl_chart` (data viz only, not UI components)
- **Icons**: Material Icons (built-in)

### Safety Gate
- **Status**: N/A — No third-party UI registries
- **Verdict**: PASS (no attack surface from external component registries)

---

## Verification Notes

**Source of Truth**: This spec was reverse-engineered from the shipped codebase:
- `lib/core/theme/app_theme.dart` — Complete M3 theme
- `lib/core/theme/app_colors.dart` — Full color palette
- `lib/core/theme/app_typography.dart` — 11-level + 5 currency styles
- `lib/core/theme/app_spacing.dart` — 8-pt grid + semantic tokens
- `lib/core/theme/app_radius.dart` — Radius scale
- `assets/i18n/en.json` + `ar.json` — 979 keys each
- 22 screens across `lib/screens/`
- 100+ widgets across `lib/widgets/`

**No CONTEXT.md exists** — No locked decisions to respect.
**No RESEARCH.md exists** — Standard stack: Flutter 3.x, Material 3, Provider, Supabase, Firebase.