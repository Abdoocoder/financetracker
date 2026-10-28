import 'package:fajrak/main.dart' show navigatorKey;
import 'package:fajrak/services/notification_service.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Every route `handleMessage` can push, stubbed so `pushNamed` resolves.
const _routes = <String>[
  '/alerts',
  '/main',
  '/dashboard',
  '/accounts',
  '/debts',
  '/transactions',
  '/budgets',
  '/goals',
  '/investments',
  '/learn',
  '/chat',
  '/settings',
  '/more',
  '/fire-calculator',
  '/zakat-calculator',
];

class _PushRecorder extends NavigatorObserver {
  final List<RouteSettings> pushes = [];

  RouteSettings? get last => pushes.isEmpty ? null : pushes.last;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (route.settings.name != null && route.settings.name != '/') {
      pushes.add(route.settings);
    }
    super.didPush(route, previousRoute);
  }
}

/// Pumps the app shell on the production [navigatorKey] so
/// [NotificationService.handleMessage] has a live Navigator to push on.
Future<_PushRecorder> _pumpApp(WidgetTester tester) async {
  final recorder = _PushRecorder();
  await tester.pumpWidget(
    MaterialApp(
      navigatorKey: navigatorKey,
      navigatorObservers: [recorder],
      routes: {
        for (final route in _routes)
          route: (_) => Scaffold(body: Text('stub:$route')),
      },
      home: const Scaffold(body: Text('home')),
    ),
  );
  await tester.pumpAndSettle();
  return recorder;
}

void main() {
  group('NotificationService.handleMessage — FCM url payloads', () {
    testWidgets('/dashboard/alerts opens Alerts, not the Dashboard',
        (tester) async {
      final recorder = await _pumpApp(tester);

      NotificationService.handleMessage(
        RemoteMessage(data: {'url': '/dashboard/alerts'}),
      );
      await tester.pumpAndSettle();

      expect(recorder.last?.name, equals('/alerts'));
    });

    testWidgets('/dashboard?quick=1 lands on the Dashboard with quickAdd',
        (tester) async {
      final recorder = await _pumpApp(tester);

      NotificationService.handleMessage(
        RemoteMessage(data: {'url': '/dashboard?quick=1'}),
      );
      await tester.pumpAndSettle();

      expect(recorder.last?.name, equals('/main'));
      final args = recorder.last?.arguments as Map?;
      expect(args?['quickAdd'], isTrue);
      expect(args?.containsKey('tab'), isFalse,
          reason: 'MainScreen falls back to the Dashboard tab by itself; the '
              'handler must not invent a second argument shape');
    });

    testWidgets('/dashboard?tab=spending maps to the Transactions tab',
        (tester) async {
      final recorder = await _pumpApp(tester);

      NotificationService.handleMessage(
        RemoteMessage(data: {'url': '/dashboard?tab=spending'}),
      );
      await tester.pumpAndSettle();

      expect(recorder.last?.name, equals('/main'));
      expect((recorder.last?.arguments as Map?)?['tab'], equals('spending'),
          reason: 'MainScreen resolves the tab name to index 3');
    });

    testWidgets('/budgets opens Budgets (it used to land on Accounts)',
        (tester) async {
      final recorder = await _pumpApp(tester);

      NotificationService.handleMessage(
        RemoteMessage(data: {'url': '/budgets'}),
      );
      await tester.pumpAndSettle();

      expect(recorder.last?.name, equals('/budgets'),
          reason: 'the old mapper sent every /budgets push to tab 1 '
              '(Accounts) — Budgets is not even a bottom-nav tab');
    });

    testWidgets('/dashboard/debts opens the Debts screen', (tester) async {
      final recorder = await _pumpApp(tester);

      NotificationService.handleMessage(
        RemoteMessage(data: {'url': '/dashboard/debts'}),
      );
      await tester.pumpAndSettle();

      expect(recorder.last?.name, equals('/debts'));
    });

    testWidgets('bare /dashboard opens the Dashboard tab', (tester) async {
      final recorder = await _pumpApp(tester);

      NotificationService.handleMessage(
        RemoteMessage(data: {'url': '/dashboard'}),
      );
      await tester.pumpAndSettle();

      expect(recorder.last?.name, equals('/main'));
      expect(recorder.last?.arguments, isNull,
          reason: 'a bare /dashboard needs no arguments');
    });

    testWidgets('unknown url falls back to the Dashboard without throwing',
        (tester) async {
      final recorder = await _pumpApp(tester);

      NotificationService.handleMessage(
        RemoteMessage(data: {'url': '/api/something-weird'}),
      );
      await tester.pumpAndSettle();

      expect(recorder.last?.name, equals('/main'));
      expect(tester.takeException(), isNull);
    });

    testWidgets('message without a url navigates nowhere', (tester) async {
      final recorder = await _pumpApp(tester);

      NotificationService.handleMessage(RemoteMessage(data: const {}));
      NotificationService.handleMessage(null);
      await tester.pumpAndSettle();

      expect(recorder.pushes, isEmpty);
    });
  });
}
