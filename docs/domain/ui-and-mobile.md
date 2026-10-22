# Domain: UI and Mobile (Flutter, Web Components, Alerts, i18n)

> Layer 2 deep dive. Entry points: `AGENTS.md` → `PROJECT_CONTEXT.md` → this file.
> Last verified 2026-10-20.

## 1. Mobile structure (Flutter)

- **Screens**: `mobile/fajrak_flutter/lib/screens/` has one folder per feature
  (`alerts/`, `budgets/`, `debts/`, `goals/`, `investments/`, `transactions/`, `more/`,
  `chat/`, `achievements/`, `settings/`, ...). Each screen is a `StatefulWidget` that
  calls static service methods (`lib/services/*_service.dart`) which hit Supabase
  directly (tables or RPCs). Navigation is named routes registered in `main.dart`,
  plus an `IndexedStack` of 5 tabs in `widgets/main_screen/` (tab 4 = Dashboard).
- **Widgets**: `lib/widgets/` mirrors the screens folders (`widgets/alerts/`,
  `widgets/dashboard/`, `widgets/debts/`, ...). Reusable primitives live in
  `widgets/common/`. Feature widgets take their data and callbacks as constructor
  params so the screen owns all state and side effects.
- **`lib/app_state.dart`**: the single `ChangeNotifier` (Provider) for app-wide UI
  state: `themeMode`, `languageCode`, `unreadAlerts` (drives the launcher badge via
  `flutter_app_badge_control`, skipped on web), and a `transactionVersion` counter
  that screens bump with `notifyTransactionChanged()` to force a refetch after a write.
- **Theme**: `lib/core/theme/` holds `app_theme.dart` (Material 3, Cairo font, light
  and dark `ThemeData`) plus `app_colors.dart`, `app_typography.dart`,
  `app_spacing.dart`, `app_radius.dart`. Prefer these tokens over hardcoded colors.
- **Error handling**: every async catch calls `ErrorHandler.handle(e, context)`
  (`lib/utils/error_handler.dart`), which logs, reports to Analytics, and shows a
  localized SnackBar (network vs generic message) only when `context.mounted`.

## 2. The Alerts screen refactor (2026-10-20)

Commit `8d2f28cc` split `screens/alerts/alerts_screen.dart` (412 lines) into a thin
stateful screen plus 5 stateless widgets in `lib/widgets/alerts/`:

| Widget | Role |
|---|---|
| `AlertListItem` | One alert row: icon/color by `type`, unread dot + tinted background, date, optional action button |
| `AlertFilterTabs` | Tab row with counts: all, unread, warning, achievement, motivation |
| `AlertHeader` | Unread-count indicator shown only when unread > 0 |
| `AlertActions` | AppBar actions: mark all read, delete all |
| `AIGeneratorCard` (+ `AIGeneratorFAB`) | "Generate insights" banner, and a FAB shown when the list is empty |

- **Swipe to delete**: `AlertListItem` wraps its child in a Flutter `Dismissible`
  (`direction: endToStart`, red background, `confirmDismiss` calls `onDelete`). The
  screen's `_deleteAlert` deletes the row from `alerts` (RLS-scoped) and refreshes
  the unread count through `AppState`. The web mirror of this pattern is
  `components/ui/swipe-row.tsx` + `lib/use-swipe-delete.ts`.
- **Action buttons**: the screen classifies each alert into an `AlertActionType`
  (`viewDetails` | `addTransaction` | `none`) and renders a `TextButton` inside the
  list item. `viewDetails` routes to `/debts`, `/budgets`, `/goals`,
  `/investments`, `/transactions`, or `/learn`; `addTransaction` routes to
  `/transactions/add`.
- **Routing and classification match Arabic substrings** of the alert `title` and
  `message` (for example `ميزانية`, `دين`, `قسط`). English alert text falls through
  to `none` (no button) and no navigation. See §5.
- **AI generator**: `_generateAlerts` POSTs the user's session token to
  `${defaultApiBaseUrl()}/api/alerts` (`lib/services/api_base_url.dart`; the
  origin is overridable, see §5). The route (`app/api/alerts/route.ts`) is
  rule-based (income ratio, debt load, portfolio PnL, goal progress), not an LLM:
  it computes insights, then sends them through `sendPushToUser`, and the Edge
  Function writes them into `alerts`.

## 3. Web UI

- **`components/ui/`**: about 27 hand-rolled primitives (`modal.tsx`, `toast.tsx`,
  `fab.tsx`, `skeleton.tsx`, `empty-state.tsx`, `swipe-row.tsx`,
  `pull-to-refresh.tsx`, `onboarding-tour.tsx`, `push-prompt.tsx`,
  `confirm-dialog.tsx`, ...). Styling is **Tailwind CSS 3 only; the repo has no
  Radix or shadcn dependency** (verified in `package.json` 2026-10-20). Keep new
  primitives in this folder and style-consistent with the existing ones.
- **`components/dashboard/`**: feature cards, each usually paired with a
  `.module.css`: `HeroBalanceCard`, `NetWorthCard`, `ZakatHawlCard`/`ZakatHawlBanner`,
  `GamificationCard`, `ChallengesCard`, `Charts`, `DashboardCustomizer`,
  `DashboardSkeleton`.
- Pages under `app/(dashboard)/dashboard/` are **Server Components by default**
  (golden rule 4); components opt into `'use client'` only when they need state,
  effects, or browser APIs.

## 4. i18n

- **Mobile**: `easy_localization`. Keys are flat strings in
  `assets/i18n/ar.json` and `assets/i18n/en.json`; usage is `'key_name'.tr()`.
  `test/i18n_keys_test.dart` asserts both files parse, have **identical key sets**,
  non-empty values, and exact BYOK wording.
- **Web**: TypeScript namespaces in `lib/locales/en/*.ts` and `lib/locales/ar/*.ts`
  (one file per feature plus `index.ts`), consumed through `lib/i18n.tsx` (client
  provider) and `lib/i18n-server.ts` (SSR locale detection) with `t('key')`.
- **Parity rule (golden rule 2)**: every new user-facing string is added to
  `ar.json` and `en.json` (mobile) **and** to both `lib/locales/en/` and
  `lib/locales/ar/` (web) in the same change. A key present in one locale only is a
  bug, not a TODO.
- Arabic is the Gulf-first default: check RTL layout and Cairo font rendering for
  any new component, and never concatenate translated fragments.

## 5. Gotchas

- **`currentUser!` force-unwraps**: all removed in v3.44.0; `grep -rn "currentUser!"
  lib/` returned nothing on 2026-10-20. Keep the existing guard pattern
  (`final user = ...currentUser; if (user == null) return;`) in new code.
- **Arabic keyword routing** in `alerts_screen.dart` (`_navigateAlert`,
  `_getActionType`) only matches Arabic text. New alert content in English, or a new
  alert category, will silently get no navigation and no action button. The durable
  fix is routing on a typed field instead of `title.contains(...)`; do not add more
  keyword branches without the owner's sign-off.
- **Configurable API origin, but the write is still production**: the mobile
  generator calls `${defaultApiBaseUrl()}/api/alerts`
  (`lib/services/api_base_url.dart`): `--dart-define=API_BASE_URL` first, then
  dotenv, then `https://fajrak.com`. `make run-web-with-proxy` sets it to
  `http://localhost:33964`, where `dev_proxy.dart` forwards `/api/*` to
  `https://fajrak.com` — the request travels through localhost but **still
  executes against production**. `app/api/alerts/route.ts` uses
  `createAdminClient()` + `generateAlerts(user.id)`, so pressing Generate in a
  dev build writes real `alerts` rows for the logged-in user. Be aware when
  testing the flow. (CORS header whitelist issue resolved in `7a900477`.)
- **Provider rebuilds**: `AppState.notifyListeners()` rebuilds every consumer
  (unread badge, theme, language). Alerts mutations must update `AppState` through
  `loadUnreadAlerts()` / `decrementUnreadAlerts()` / `clearUnreadAlerts()` after the
  DB write, and heavy computation does not belong in a consumer's `build`.

## 6. Where the code lives

| Piece | Location |
|---|---|
| Alerts screen + widgets | `mobile/fajrak_flutter/lib/screens/alerts/alerts_screen.dart`, `lib/widgets/alerts/` |
| App-wide UI state | `mobile/fajrak_flutter/lib/app_state.dart` |
| Theme tokens | `mobile/fajrak_flutter/lib/core/theme/` |
| i18n assets (mobile) | `mobile/fajrak_flutter/assets/i18n/{ar,en}.json` + `test/i18n_keys_test.dart` |
| i18n locales (web) | `lib/locales/{en,ar}/` + `lib/i18n.tsx`, `lib/i18n-server.ts` |
| Web UI primitives | `components/ui/` |
| Web dashboard cards | `components/dashboard/` |
| Swipe-to-delete (web) | `components/ui/swipe-row.tsx`, `lib/use-swipe-delete.ts` |
| Insight/alert generator | `app/api/alerts/route.ts`, `lib/insight-alerts.ts` |

## 7. Checklist before touching this domain

- [ ] New screen lives in `screens/<feature>/`, reusable pieces in `widgets/<feature>/`.
- [ ] Every new string added to mobile `ar.json` + `en.json` and web
      `lib/locales/en/` + `lib/locales/ar/` (parity).
- [ ] No new `currentUser!` or unguarded auth assumption; RLS still scoped by `auth.uid()`.
- [ ] Alerts mutations refresh `AppState` unread counts after the DB write.
- [ ] No hardcoded user-facing strings; colors/spacing come from `core/theme` tokens.
- [ ] `flutter test` and `npm test` green (i18n parity tests run in both).
