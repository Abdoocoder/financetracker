# Flutter Audit Remediation Tasks

## Overview
Tasks from the Fajrak Flutter app technical quality audit (score: 11/20).
All paths are relative to `mobile/fajrak_flutter/`.

---

## Task 1: Add Semantics and Tooltips — full accessibility pass

The Flutter app has zero Semantics widgets across 114 Dart files. This is a complete screen-reader failure on TalkBack (Android) and VoiceOver (iOS).

Required changes:
- Add `tooltip:` parameter to every `IconButton` in the app — use localized strings from `AppLocalizations`, not hardcoded text. Key files: `lib/widgets/main_screen/nav_item_widget.dart`, `lib/screens/accounts/accounts_screen.dart` (lines 59-67), all screens with icon-only action buttons.
- Add `semanticLabel:` to every `Image.asset()` call. Key files: `lib/screens/auth/login_screen.dart:109-116`, `lib/screens/splash_screen.dart:122-129`.
- Add `Semantics` wrapper with `label:` and `value:` on complex financial data widgets (balance cards, progress bars, investment values).
- Add `aria-expanded` equivalent: use `Semantics(expanded: isExpanded)` on all collapsible sections.

Priority order: navigation items → action buttons → images → financial data widgets.

## Task 2: Refactor dashboard_screen.dart — break up 500-line build method

`lib/screens/dashboard/dashboard_screen.dart` has a 500+ line `build()` method with 8 levels of nesting. Every `setState()` call rebuilds the entire tree.

Required changes:
- Extract each dashboard card into its own `StatelessWidget` with `const` constructor:
  - `HeroBalanceSectionWidget` (current balance hero)
  - `MonthSummaryWidget` (income/expense month comparison)
  - `QuickLinksWidget` (debts/investments/goals shortcuts)
  - `ChartsWidget` (bar/pie charts — already has `RepaintBoundary`, keep it)
  - `RecentTransactionsWidget` (last 5 transactions)
  - `BudgetProgressWidget` (budget cards)
  - `ChallengesWidget` (gamification)
- Each extracted widget receives its data as constructor parameters (no BuildContext drilling).
- After extraction, the main build method should be under 100 lines.
- Do NOT change behavior or visual output — this is a structural refactor only.

## Task 3: Fix expensive operations inside build() methods

Three performance hotspots where heavy computation runs on every render:

1. `lib/screens/dashboard/dashboard_screen.dart:141` — `.startsWith()` check on every transaction in a loop. Move this filter to `_loadData()` / `initState()` and cache the result.
2. `lib/widgets/investments/portfolio_chart_card.dart:47-61` — `.indexOf()` called inside a loop = O(n²). Replace with a `Map` lookup built once outside the loop.
3. `lib/screens/goals/goals_screen.dart:141-142` — `.fold()` aggregations on the goals list computed on every render. Move to `initState()` or `didUpdateWidget()` and cache in a local variable.

Also add `RepaintBoundary` around the three `AnimatedSwitcher` widgets in `dashboard_screen.dart` at lines 358, 368, 388.

## Task 4: Replace all Colors.* violations with AppColors constants

Replace 8 instances of direct Flutter color usage with the centralized `AppColors` system defined in `lib/utils/app_colors.dart`:

- `lib/screens/accounts/accounts_screen.dart:109` — `Colors.red` → `AppColors.error`
- `lib/screens/auth/register_screen.dart:235` — `Colors.green.shade400` → `AppColors.success`
- `lib/screens/transactions/recurring_screen.dart:264,269` — `Colors.red.shade700` → `AppColors.error`
- `lib/widgets/debts/add_debt_dialog.dart:104` — `Colors.red.shade700` → `AppColors.error`
- `lib/widgets/transactions/transaction_list_item.dart:28` — `Colors.red` → `AppColors.error`
- `lib/widgets/transactions/transaction_list_item.dart:33` — `Colors.red[400]` → `AppColors.errorLight`
- `lib/widgets/transactions/transaction_list_item.dart:38` — `Colors.orange[600]` → `AppColors.warning`

If `AppColors.errorLight` or `AppColors.warning` constants don't exist yet, add them to `lib/utils/app_colors.dart` first.

## Task 5: Move hard-coded Arabic strings to i18n files

Several files contain Arabic text strings outside the `AppLocalizations` / easy_localization system. These strings will NOT update when the user switches to English.

Files and strings to migrate:
- `lib/screens/dashboard/dashboard_screen.dart:343-346` — Arabic month names array. Replace with localized month names from `assets/i18n/ar.json` and `en.json`.
- `lib/widgets/investments/investment_cash_card.dart:134` — Arabic error message. Add key to both i18n files.
- `lib/widgets/transactions/transaction_list_item.dart:26-39` — Tooltip strings in Arabic. Replace with `context.tr('key')` calls and add keys to both i18n files.
- `lib/widgets/debts/add_debt_dialog.dart` — Any hard-coded Arabic validation messages.

For each string: (1) add the key to `assets/i18n/ar.json`, (2) add the English translation to `assets/i18n/en.json`, (3) replace the hard-coded string with `context.tr('key')`.

## Task 6: Add cacheWidth/cacheHeight to all Image.asset() calls

Flutter loads images at full resolution into memory regardless of display size. Add memory constraints to all image widgets:

- `lib/screens/auth/login_screen.dart:109-116` — App icon displayed at 72×72: add `cacheWidth: 144, cacheHeight: 144` (2× for retina).
- `lib/screens/splash_screen.dart:122-129` — App icon displayed at 100×100: add `cacheWidth: 200, cacheHeight: 200`.
- Audit any other `Image.asset()` calls in the codebase and apply the same pattern.

Formula: `cacheWidth` and `cacheHeight` should be the display size × the device pixel ratio (use 2× as safe default for all fixed assets).

## Task 7: Extract accounts_screen.dart dialogs to separate widget files

`lib/screens/accounts/accounts_screen.dart` is 350+ lines because all dialog/bottom sheet content is inline. This makes the file unmaintainable and causes the same large-setState problem as the dashboard.

Required changes:
- Extract the "Add Account" dialog content to `lib/widgets/accounts/add_account_dialog.dart`
- Extract the "Transfer" dialog content to `lib/widgets/accounts/transfer_dialog.dart`
- Extract the account detail view to `lib/widgets/accounts/account_detail_sheet.dart`
- The screen file should shrink to under 100 lines after extraction.
- Do NOT change behavior or visual output.

## Task 8: Replace Curves.elasticOut in debt_celebration_dialog.dart

`lib/widgets/debts/debt_celebration_dialog.dart:144` uses `Curves.elasticOut` which produces an overshoot/bounce animation. While the context is celebratory (debt paid off), elastic easing looks dated.

Replace with `Curves.easeOutBack` — it provides a subtle, satisfying overshoot (like `elasticOut` but controlled and modern) without the multiple oscillations. If a more energetic feel is desired for the confetti/celebration, `Curves.easeOutExpo` is the clean alternative.
