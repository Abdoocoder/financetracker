import 'dart:io';

import 'package:fajrak/utils/route_normalizer.dart';
import 'package:flutter_test/flutter_test.dart';

/// Every `action_url` / FCM `url` value the backend actually produces today.
///
/// Source of truth (web repo, verified 2026-10-28):
///   app/api/alerts/route.ts                  → /dashboard/alerts
///   app/api/push-test/route.ts               → /dashboard/alerts
///   app/api/smart-notifications/route.ts     → /dashboard?quick=1, /dashboard,
///                                              /dashboard/transactions,
///                                              /dashboard/debts, /dashboard/goals,
///                                              /dashboard/investments
///   app/api/daily-reminder/route.ts          → /dashboard?quick=1
///   app/api/new-user-nudge/route.ts          → /dashboard?quick=1
///   app/api/streak-alert/route.ts            → /dashboard?quick=1
///   app/api/evening-reminder/route.ts        → /dashboard/transactions
///   app/api/auto-recurring/route.ts          → /dashboard/transactions
///   app/api/auto-debt/route.ts               → /dashboard/debts
///   app/api/budget-alerts/route.ts           → /dashboard/budgets
///   app/api/zakat-reminder/route.ts          → /dashboard/zakat
///   app/api/weekly-report/route.ts           → /dashboard
///   app/api/agent/proactive/route.ts         → /dashboard/budgets,
///                                              /dashboard/debts,
///                                              /dashboard?tab=spending
const _backendUrls = <String>[
  '/dashboard/alerts',
  '/dashboard?quick=1',
  '/dashboard?tab=spending',
  '/dashboard',
  '/dashboard/transactions',
  '/dashboard/debts',
  '/dashboard/goals',
  '/dashboard/investments',
  '/dashboard/budgets',
  '/dashboard/zakat',
  '/dashboard/fire',
  '/dashboard/accounts',
  '/dashboard/learn',
  '/dashboard/chat',
  '/dashboard/settings',
];

void main() {
  group('normalizeRoute — web path → Flutter named route', () {
    const cases = <String, String>{
      '/dashboard/alerts': '/alerts',
      '/dashboard/zakat': '/zakat-calculator',
      '/dashboard/budgets': '/budgets',
      '/dashboard/debts': '/debts',
      '/dashboard/goals': '/goals',
      '/dashboard/investments': '/investments',
      '/dashboard/transactions': '/transactions',
      '/dashboard/fire': '/fire-calculator',
      '/dashboard/learn': '/learn',
      '/dashboard/chat': '/chat',
      '/dashboard/settings': '/settings',
      '/dashboard/accounts': '/accounts',
    };

    cases.forEach((url, expected) {
      test('$url → $expected', () {
        expect(normalizeRoute(url), equals(expected));
      });
    });

    test('already-native Flutter routes pass through unchanged', () {
      expect(normalizeRoute('/alerts'), equals('/alerts'));
      expect(normalizeRoute('/transactions'), equals('/transactions'));
    });

    test('/transactions/add → /transactions + addTransaction', () {
      final result = normalizeRouteWithArgs('/transactions/add');
      expect(result.route, equals('/transactions'));
      expect(result.arguments['addTransaction'], isTrue,
          reason: 'the Transactions screen opens its add sheet for this flag');
      expect(result.isFallback, isFalse);
    });

    test('/dashboard/help → /help (screen exists, unlike the old comment said)',
        () {
      expect(normalizeRoute('/dashboard/help'), equals('/help'));
      expect(normalizeRoute('/help'), equals('/help'));
    });

    test('full absolute URL is handled', () {
      expect(
        normalizeRoute('https://fajrak.app/dashboard/alerts'),
        equals('/alerts'),
      );
    });

    test('trailing slash and parent segment are tolerated', () {
      expect(normalizeRoute('/dashboard/alerts/'), equals('/alerts'));
      expect(normalizeRoute('/dashboard/alerts/42'), equals('/alerts'));
    });
  });

  group('normalizeRouteWithArgs — query parameters', () {
    test('/dashboard?quick=1 → /main with quickAdd:true', () {
      final result = normalizeRouteWithArgs('/dashboard?quick=1');
      expect(result.route, equals('/main'));
      expect(result.arguments['quickAdd'], isTrue);
      expect(result.isFallback, isFalse);
    });

    test('/dashboard?quick=true → /main with quickAdd:true', () {
      final result = normalizeRouteWithArgs('/dashboard?quick=true');
      expect(result.route, equals('/main'));
      expect(result.arguments['quickAdd'], isTrue);
    });

    test('/dashboard?quick=0 does NOT request quick add', () {
      final result = normalizeRouteWithArgs('/dashboard?quick=0');
      expect(result.route, equals('/main'));
      expect(result.arguments.containsKey('quickAdd'), isFalse);
    });

    test('/dashboard?tab=spending → /main with tab:spending', () {
      final result = normalizeRouteWithArgs('/dashboard?tab=spending');
      expect(result.route, equals('/main'));
      expect(result.arguments['tab'], equals('spending'));
      expect(result.isFallback, isFalse);
    });

    test('/dashboard?quick=1&tab=spending keeps both signals', () {
      final result = normalizeRouteWithArgs('/dashboard?quick=1&tab=spending');
      expect(result.route, equals('/main'));
      expect(result.arguments['quickAdd'], isTrue);
      expect(result.arguments['tab'], equals('spending'),
          reason: 'MainScreen decides that an explicit quick-add wins');
    });

    test('/dashboard (bare) → /main, an explicit dashboard target', () {
      final result = normalizeRouteWithArgs('/dashboard');
      expect(result.route, equals('/main'));
      expect(result.arguments, isEmpty);
      expect(result.isFallback, isFalse,
          reason: 'a bare /dashboard is a real target, not an unknown URL');
    });

    test('query string on an absolute URL is parsed', () {
      final result = normalizeRouteWithArgs(
        'https://fajrak.app/dashboard?quick=1&utm_source=push',
      );
      expect(result.route, equals('/main'));
      expect(result.arguments['quickAdd'], isTrue);
    });
  });

  group('normalizeRouteWithArgs — safe fallback', () {
    test('unknown URL → /main flagged as fallback', () {
      final result = normalizeRouteWithArgs('/unknown/path');
      expect(result.route, equals('/main'));
      expect(result.isFallback, isTrue,
          reason: 'callers keep keyword inference for unrecognised URLs');
    });

    test('/dashboard/unknown-child → /main flagged as fallback', () {
      final result = normalizeRouteWithArgs('/dashboard/unknown-child');
      expect(result.route, equals('/main'));
      expect(result.isFallback, isTrue);
    });

    test('null and empty → /main flagged as fallback', () {
      expect(normalizeRouteWithArgs(null).route, equals('/main'));
      expect(normalizeRouteWithArgs(null).isFallback, isTrue);
      expect(normalizeRouteWithArgs('').isFallback, isTrue);
      expect(normalizeRoute(null), equals('/main'));
    });

    test('garbage input never throws', () {
      expect(() => normalizeRouteWithArgs('::::'), returnsNormally);
      expect(normalizeRouteWithArgs('::::').route, equals('/main'));
    });
  });

  group('resolveMainTabIndex — MainScreen tab contract', () {
    // MainScreen order: 0=More, 1=Accounts, 2=Debts, 3=Transactions, 4=Dashboard
    test('int tab passes through', () {
      expect(resolveMainTabIndex({'tab': 3}), equals(3));
      expect(resolveMainTabIndex({'tab': 0}), equals(0));
    });

    test('spending → Transactions tab (3), where spending is listed', () {
      expect(resolveMainTabIndex({'tab': 'spending'}), equals(3));
    });

    test('named tabs resolve to their indices', () {
      expect(resolveMainTabIndex({'tab': 'dashboard'}), equals(4));
      expect(resolveMainTabIndex({'tab': 'debts'}), equals(2));
      expect(resolveMainTabIndex({'tab': 'accounts'}), equals(1));
      expect(resolveMainTabIndex({'tab': 'more'}), equals(0));
    });

    test('out-of-range int is clamped into the tab range', () {
      expect(resolveMainTabIndex({'tab': 99}), equals(4));
      expect(resolveMainTabIndex({'tab': -3}), equals(0));
    });

    test('unknown string / null / non-map fall back to Dashboard', () {
      expect(resolveMainTabIndex({'tab': 'nope'}), equals(4));
      expect(resolveMainTabIndex(null), equals(4));
      expect(resolveMainTabIndex(<String, dynamic>{}), equals(4));
      expect(resolveMainTabIndex('not-a-map'), equals(4));
    });

    test('fallback is honoured', () {
      expect(resolveMainTabIndex(null, fallback: 1), equals(1));
    });
  });

  group('routeArgsRequestQuickAdd', () {
    test('true only when quickAdd is true', () {
      expect(routeArgsRequestQuickAdd({'quickAdd': true}), isTrue);
      expect(routeArgsRequestQuickAdd({'quickAdd': false}), isFalse);
      expect(routeArgsRequestQuickAdd({'tab': 4}), isFalse);
      expect(routeArgsRequestQuickAdd(null), isFalse);
      expect(routeArgsRequestQuickAdd('junk'), isFalse);
    });
  });

  group('contract: every normalised target exists in main.dart', () {
    // Strip comments first: a commented-out `'/x': ...` must not satisfy the
    // contract.
    String routesSource() => File('lib/main.dart')
        .readAsStringSync()
        .split('\n')
        .where((line) => !line.trimLeft().startsWith('//'))
        .join('\n');

    test('every kBackendPathToRoute entry resolves to a registered route', () {
      final source = routesSource();

      // Walk the mapping itself, so a new entry cannot slip past the guard.
      for (final key in kBackendPathToRoute.keys) {
        for (final url in ['/dashboard/$key', '/$key']) {
          final route = normalizeRoute(url);
          expect(
            source.contains("'$route':"),
            isTrue,
            reason: 'normalizeRoute("$url") → "$route", but main.dart has no '
                "such named route. This is the /transactions/add class of bug: "
                'a mapping to a route that was never registered.',
          );
        }
      }
    });

    test('no emitted argument-carrying target points at a missing route', () {
      final source = routesSource();

      for (final url in [
        ..._backendUrls,
        '/transactions/add',
        '/dashboard/alerts/42',
        '/unknown/path',
        '',
        'nonsense-url',
      ]) {
        final route = normalizeRoute(url);
        expect(
          source.contains("'$route':"),
          isTrue,
          reason: 'normalizeRoute("$url") → "$route", but main.dart has no '
              'such named route.',
        );
      }
    });
  });
}
