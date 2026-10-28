/// Translates the web URLs the backend stores in `alerts.action_url` and sends
/// as the FCM `url` payload into Flutter named routes.
///
/// Why this exists: the Next.js client and the Flutter client disagree on what
/// a route is. The backend emits App Router paths (`/dashboard/alerts`) with
/// query parameters (`/dashboard?quick=1`); Flutter registers flat named routes
/// (`/alerts`, `/main`) and has no query-string routing. Anything that navigates
/// from a backend URL must come through here — that includes the alerts list and
/// the push-notification tap handler.
///
/// Contract sources (web repo, verified 2026-10-28): `app/api/alerts`,
/// `smart-notifications`, `daily-reminder`, `new-user-nudge`, `streak-alert`,
/// `evening-reminder`, `auto-recurring`, `auto-debt`, `budget-alerts`,
/// `zakat-reminder`, `weekly-report`, `agent/proactive`, `push-test` and
/// `confirm` routes. New backend URLs only need an entry in [_pathToRoute].
///
/// Every route emitted here must exist in `lib/main.dart`; that is enforced by
/// `test/utils/route_normalizer_test.dart` (the `/transactions/add` class of
/// bug: a mapping pointing at a route that was never registered).
library;

/// `MainScreen` bottom-navigation order — see `lib/screens/main_screen.dart`.
/// 0 = More, 1 = Accounts, 2 = Debts, 3 = Transactions, 4 = Dashboard.
const int kMoreTab = 0;
const int kAccountsTab = 1;
const int kDebtsTab = 2;
const int kTransactionsTab = 3;
const int kDashboardTab = 4;

/// A Flutter navigation target resolved from a backend URL.
class NormalizedRoute {
  const NormalizedRoute(
    this.route, [
    this.arguments = const <String, dynamic>{},
    this.isFallback = false,
  ]);

  /// Named route registered in `lib/main.dart`.
  final String route;

  /// Arguments for `Navigator.pushNamed` (e.g. `{'quickAdd': true}`).
  final Map<String, dynamic> arguments;

  /// True when [url] was not recognised. Callers may then try a cheaper
  /// heuristic (the alerts screen falls back to keyword matching) before
  /// settling for [_fallbackRoute].
  final bool isFallback;
}

const NormalizedRoute _fallbackRoute =
    NormalizedRoute('/main', <String, dynamic>{}, true);

/// First meaningful path segment (after an optional `/dashboard` prefix) →
/// Flutter route. Only routes that exist in `main.dart` belong here; the
/// contract test (`test/utils/route_normalizer_test.dart`) walks this map and
/// asserts every emitted route is registered there, so adding an entry is all
/// a new backend URL needs.
const Map<String, String> kBackendPathToRoute = <String, String>{
  'alerts': '/alerts',
  'zakat': '/zakat-calculator',
  'fire': '/fire-calculator',
  'budgets': '/budgets',
  'debts': '/debts',
  'goals': '/goals',
  'investments': '/investments',
  'transactions': '/transactions',
  'accounts': '/accounts',
  'learn': '/learn',
  'help': '/help',
  'chat': '/chat',
  'settings': '/settings',
  'more': '/more',
  // `pdf-report` is a web-only download; it falls back to `/main` (and, on the
  // alerts path, keyword inference) on purpose.
};

/// `?tab=` values → `MainScreen` index. `spending` is not a web tab either
/// (the proactive agent links to `/dashboard?tab=spending`, a dead link on
/// web too); the spending list lives in the Transactions tab on mobile.
const Map<String, int> _tabIndexByName = <String, int>{
  'more': kMoreTab,
  'accounts': kAccountsTab,
  'debts': kDebtsTab,
  'transactions': kTransactionsTab,
  'spending': kTransactionsTab,
  'dashboard': kDashboardTab,
  'main': kDashboardTab,
};

/// Route path only — use [normalizeRouteWithArgs] when the target needs
/// arguments (`/main` quick-add, tabs, the add-transaction sheet).
String normalizeRoute(String? url) => normalizeRouteWithArgs(url).route;

/// Resolves a backend URL (`/dashboard/alerts`, `/dashboard?quick=1`,
/// `https://fajrak.app/dashboard/zakat`, …) to a route plus its arguments.
///
/// Unknown or missing URLs resolve to `/main` with [NormalizedRoute.isFallback]
/// set, so navigation can never throw on bad data.
NormalizedRoute normalizeRouteWithArgs(String? url) {
  final raw = url?.trim() ?? '';
  if (raw.isEmpty) return _fallbackRoute;

  final uri = Uri.tryParse(raw);
  if (uri == null) return _fallbackRoute;

  final segments = uri.pathSegments
      .where((s) => s.isNotEmpty)
      .map((s) => s.toLowerCase())
      .toList();

  // `/dashboard?...` carries its target in the query string.
  final arguments = <String, dynamic>{};
  final quick = (uri.queryParameters['quick'] ?? '').toLowerCase();
  if (quick == '1' || quick == 'true') arguments['quickAdd'] = true;
  final tab = (uri.queryParameters['tab'] ?? '').trim().toLowerCase();
  if (tab.isNotEmpty) arguments['tab'] = tab;

  // `/dashboard/alerts` and `/alerts` address the same screen; the web prefix
  // is an artefact of the two clients sharing one URL space.
  final tail = (segments.isNotEmpty && segments.first == 'dashboard')
      ? segments.sublist(1)
      : segments;

  if (tail.isEmpty) {
    // `/dashboard` (bare, with or without `quick`/`tab`) → Dashboard tab.
    return NormalizedRoute('/main', arguments);
  }

  final route = kBackendPathToRoute[tail.first];
  if (route == null) return _fallbackRoute;

  // `/transactions/add` opens the Transactions screen's add sheet. The route
  // never existed as a named route; the screen owns the sheet.
  if (tail.first == 'transactions' && tail.length > 1 && tail[1] == 'add') {
    return NormalizedRoute('/transactions', <String, dynamic>{
      'addTransaction': true,
    });
  }

  // Query parameters only describe the dashboard entry point; a sub-path
  // target already identifies its screen.
  return NormalizedRoute(route);
}

/// Resolves `MainScreen` tab arguments to a bottom-nav index.
///
/// Accepts the legacy `{'tab': 3}` and the string form the normaliser emits
/// (`{'tab': 'spending'}`). Unknown values fall back to [fallback].
int resolveMainTabIndex(Object? args, {int fallback = kDashboardTab}) {
  if (args is! Map) return fallback;
  final tab = args['tab'];
  if (tab is int) return tab.clamp(0, kDashboardTab).toInt();
  if (tab is String) {
    return _tabIndexByName[tab.trim().toLowerCase()] ?? fallback;
  }
  return fallback;
}

/// Whether `MainScreen` route arguments ask for the dashboard quick-add card
/// to be revealed and focused.
bool routeArgsRequestQuickAdd(Object? args) =>
    args is Map && args['quickAdd'] == true;
