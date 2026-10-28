import 'dart:convert';

import 'package:easy_localization/easy_localization.dart' hide TextDirection;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:fajrak/app_state.dart';
import 'package:fajrak/screens/alerts/alerts_screen.dart';
import 'package:fajrak/services/alerts_service.dart';
import 'package:fajrak/widgets/alerts/alert_list_item.dart';

/// Same loader pattern as alerts_screen_test.dart
class _MapAssetLoader extends AssetLoader {
  _MapAssetLoader(this._data);
  final Map<String, Map<String, dynamic>> _data;

  @override
  Future<Map<String, dynamic>?> load(String path, Locale locale) async {
    return _data[locale.languageCode] ?? _data[locale.toString()];
  }
}

late Map<String, Map<String, dynamic>> _translations;

Widget _app(Widget child, {Locale locale = const Locale('en')}) {
  return EasyLocalization(
    supportedLocales: const [Locale('en'), Locale('ar')],
    path: 'assets/i18n',
    startLocale: locale,
    useOnlyLangCode: true,
    assetLoader: _MapAssetLoader(_translations),
    child: Builder(
      builder: (context) => ChangeNotifierProvider<AppState>(
        create: (_) => AppState(),
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          localizationsDelegates: context.localizationDelegates,
          supportedLocales: context.supportedLocales,
          locale: context.locale,
          theme: ThemeData(useMaterial3: true),
          home: child,
        ),
      ),
    ),
  );
}

/// Every named route [normalizeRouteWithArgs] can emit. Registering them keeps
/// `pushNamed` from throwing, so the recorder observes the real target instead
/// of a failed lookup.
const _normalisableRoutes = <String>[
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

/// Same shell as [_app], plus stubbed route targets and a push recorder.
Widget _appWithNavigator(Widget child, NavigatorObserver observer) {
  return EasyLocalization(
    supportedLocales: const [Locale('en'), Locale('ar')],
    path: 'assets/i18n',
    startLocale: const Locale('en'),
    useOnlyLangCode: true,
    assetLoader: _MapAssetLoader(_translations),
    child: Builder(
      builder: (context) => ChangeNotifierProvider<AppState>(
        create: (_) => AppState(),
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          localizationsDelegates: context.localizationDelegates,
          supportedLocales: context.supportedLocales,
          locale: context.locale,
          theme: ThemeData(useMaterial3: true),
          navigatorObservers: [observer],
          routes: {
            for (final route in _normalisableRoutes)
              route: (_) => Scaffold(body: Text('stub:$route')),
          },
          home: child,
        ),
      ),
    ),
  );
}

class _PushRecorder extends NavigatorObserver {
  final List<RouteSettings> pushes = [];

  RouteSettings? get last => pushes.isEmpty ? null : pushes.last;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    // Ignore the initial `home:` route ('/'); record only explicit pushes.
    if (route.settings.name != null && route.settings.name != '/') {
      pushes.add(route.settings);
    }
    super.didPush(route, previousRoute);
  }
}

class _FakeAlertsService extends AlertsService {
  _FakeAlertsService(this._alerts);

  final List<Map<String, dynamic>> _alerts;

  @override
  Future<List<Map<String, dynamic>>> fetchAlerts() async =>
      List<Map<String, dynamic>>.from(_alerts);

  @override
  Future<void> markRead(String id) async {}

  @override
  Future<void> markAllRead() async {}

  @override
  Future<void> deleteAlert(String id) async {}

  @override
  Future<void> deleteAll() async {}
}

Map<String, dynamic> _alertWithUrl(String? actionUrl, String title) => {
      'id': 'alert-1',
      'title': title,
      'message': 'message',
      'type': 'warning',
      // Read on purpose: keeps the test free of async read/decrement calls.
      'is_read': true,
      'created_at': '2026-10-27T10:00:00.000Z',
      if (actionUrl != null) 'action_url': actionUrl,
    };

/// Pumps AlertsScreen with a single alert and returns the push recorder.
Future<_PushRecorder> _pumpSingleAlert(
  WidgetTester tester,
  Map<String, dynamic> alert,
) async {
  final recorder = _PushRecorder();
  await tester.pumpWidget(
    _appWithNavigator(
      AlertsScreen(service: _FakeAlertsService([alert])),
      recorder,
    ),
  );
  await tester.pumpAndSettle();
  return recorder;
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    final en = jsonDecode(await rootBundle.loadString('assets/i18n/en.json'))
        as Map<String, dynamic>;
    final ar = jsonDecode(await rootBundle.loadString('assets/i18n/ar.json'))
        as Map<String, dynamic>;
    _translations = {'en': en, 'ar': ar};
    SharedPreferences.setMockInitialValues({});

    await Supabase.initialize(
      url: 'https://alerts-test.supabase.co',
      publishableKey: 'test-publishable-key',
      authOptions: const FlutterAuthClientOptions(
        persistSession: false,
        detectSessionInUri: false,
      ),
    );

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('flutter_app_badge_control'),
      (call) async => true,
    );
  });

  group('AlertListItem — Button tap conflict', () {
    testWidgets('View Details button calls onActionTap (not swallowed by GestureDetector)', (WidgetTester tester) async {
      bool actionTapped = false;
      bool cardTapped = false;

      await tester.pumpWidget(
        _app(
          AlertListItem(
            alert: {
              'id': '1',
              'title': 'Budget Warning',
              'message': 'Budget exceeded',
              'type': 'warning',
              'action_url': '/dashboard/budgets',
              'is_read': false,
            },
            actionType: AlertActionType.viewDetails,
            color: Colors.red,
            icon: Icons.warning_outlined,
            colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
            onTap: () => cardTapped = true,
            onActionTap: () => actionTapped = true,
            onDelete: () {},
          ),
        ),
      );

      await tester.pump(); // Just pump, not pumpAndSettle

      // Find the View Details button (localized)
      final viewDetailsButton = find.text('View Details');
      expect(viewDetailsButton, findsOneWidget, reason: 'Button should be visible');

      // Tap the button
      await tester.tap(viewDetailsButton);
      await tester.pump();

      // Verify: action callback fired, card callback did NOT fire
      expect(actionTapped, isTrue, reason: 'Action button must fire onActionTap');
      expect(cardTapped, isFalse, reason: 'Card tap must NOT fire when button tapped');
    });

    testWidgets('Add Transaction button calls onActionTap', (WidgetTester tester) async {
      bool actionTapped = false;
      bool cardTapped = false;

      await tester.pumpWidget(
        _app(
          AlertListItem(
            alert: {
              'id': '2',
              'title': 'Reminder: Add Transaction',
              'message': 'Record your expense',
              'type': 'reminder',
              'action_url': '/dashboard/transactions',
              'is_read': false,
            },
            actionType: AlertActionType.addTransaction,
            color: Colors.blue,
            icon: Icons.add_outlined,
            colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
            onTap: () => cardTapped = true,
            onActionTap: () => actionTapped = true,
            onDelete: () {},
          ),
        ),
      );

      await tester.pump();

      final addTransactionButton = find.text('Add Transaction');
      expect(addTransactionButton, findsOneWidget);

      await tester.tap(addTransactionButton);
      await tester.pump();

      expect(actionTapped, isTrue, reason: 'Action button must fire onActionTap');
      expect(cardTapped, isFalse, reason: 'Card tap must NOT fire when button tapped');
    });

    testWidgets('Card tap calls onTap when no action button present', (WidgetTester tester) async {
      bool cardTapped = false;

      await tester.pumpWidget(
        _app(
          AlertListItem(
            alert: {
              'id': '3',
              'title': 'Motivation',
              'message': 'Keep going!',
              'type': 'motivation',
              'action_url': '',
              'is_read': false,
            },
            actionType: AlertActionType.none,
            color: Colors.green,
            icon: Icons.lightbulb_outlined,
            colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
            onTap: () => cardTapped = true,
            onActionTap: null,
            onDelete: () {},
          ),
        ),
      );

      await tester.pump();

      // Tap the card (title area)
      await tester.tap(find.text('Motivation'));
      await tester.pump();

      expect(cardTapped, isTrue, reason: 'Card tap should fire when no action button');
    });
  });

  group('AlertsScreen — backend action_url navigation', () {
    testWidgets('/dashboard/alerts opens the Alerts screen, not the Dashboard',
        (tester) async {
      final recorder =
          await _pumpSingleAlert(tester, _alertWithUrl('/dashboard/alerts', 'AI insight'));

      await tester.tap(find.text('AI insight'));
      await tester.pumpAndSettle();

      expect(recorder.last?.name, equals('/alerts'),
          reason: '203 production alerts carry /dashboard/alerts; the old '
              'normaliser fell through to /dashboard');
    });

    testWidgets('/dashboard?quick=1 opens /main with quickAdd', (tester) async {
      final recorder = await _pumpSingleAlert(
          tester, _alertWithUrl('/dashboard?quick=1', 'Morning reminder'));

      await tester.tap(find.text('Morning reminder'));
      await tester.pumpAndSettle();

      expect(recorder.last?.name, equals('/main'));
      expect(
        (recorder.last?.arguments as Map?)?['quickAdd'],
        isTrue,
        reason: '159 production alerts carry /dashboard?quick=1; the query '
            'parameter used to be dropped',
      );
    });

    testWidgets('/dashboard?tab=spending forwards the tab argument',
        (tester) async {
      final recorder = await _pumpSingleAlert(
          tester, _alertWithUrl('/dashboard?tab=spending', 'Spending spike'));

      await tester.tap(find.text('Spending spike'));
      await tester.pumpAndSettle();

      expect(recorder.last?.name, equals('/main'));
      expect((recorder.last?.arguments as Map?)?['tab'], equals('spending'));
    });

    testWidgets('/dashboard/zakat opens the Zakat calculator', (tester) async {
      final recorder = await _pumpSingleAlert(
          tester, _alertWithUrl('/dashboard/zakat', 'Zakat due'));

      await tester.tap(find.text('Zakat due'));
      await tester.pumpAndSettle();

      expect(recorder.last?.name, equals('/zakat-calculator'));
    });

    testWidgets('/transactions/add opens the add sheet via /transactions',
        (tester) async {
      final recorder = await _pumpSingleAlert(
          tester, _alertWithUrl('/transactions/add', 'Add a transaction'));

      await tester.tap(find.text('Add a transaction'));
      await tester.pumpAndSettle();

      expect(recorder.last?.name, equals('/transactions'),
          reason: '/transactions/add is not a registered route');
      expect((recorder.last?.arguments as Map?)?['addTransaction'], isTrue,
          reason: 'the screen owns the add dialog; the route alone is not enough');
      expect(tester.takeException(), isNull);
    });

    testWidgets('alert with no action_url still infers the route from Arabic text',
        (tester) async {
      final recorder = await _pumpSingleAlert(
        tester,
        {
          'id': 'alert-2',
          'title': 'تذكير بدين',
          'message': 'لديك قسط مستحق',
          'type': 'warning',
          'is_read': true,
          'created_at': '2026-10-27T10:00:00.000Z',
        },
      );

      await tester.tap(find.text('تذكير بدين'));
      await tester.pumpAndSettle();

      expect(recorder.last?.name, equals('/debts'),
          reason: 'keyword inference must survive the normaliser refactor');
    });

    testWidgets('reminder without action_url → Add Transaction opens /transactions',
        (tester) async {
      final recorder = await _pumpSingleAlert(
        tester,
        {
          'id': 'alert-3',
          'title': 'تذكير بتسجيل معاملة',
          'message': 'سجل مصاريفك اليوم',
          'type': 'reminder',
          'is_read': true,
          'created_at': '2026-10-27T10:00:00.000Z',
        },
      );

      await tester.tap(find.text('Add Transaction'));
      await tester.pumpAndSettle();

      expect(recorder.last?.name, equals('/transactions'),
          reason: 'the Add Transaction action used to push the unregistered '
              'route /transactions/add');
      expect(tester.takeException(), isNull);
    });

    testWidgets('unrecognised URL with no keyword match shows a snackbar, no push',
        (tester) async {
      final recorder = await _pumpSingleAlert(
          tester, _alertWithUrl('/unknown/path', 'Mystery alert'));

      await tester.tap(find.text('Mystery alert'));
      await tester.pumpAndSettle();

      expect(recorder.pushes, isEmpty);
      expect(find.byType(SnackBar), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
