import 'dart:convert';

import 'package:easy_localization/easy_localization.dart' hide TextDirection;
import 'package:fajrak/app_state.dart';
import 'package:fajrak/providers/dashboard_layout_provider.dart';
import 'package:fajrak/screens/dashboard/dashboard_screen.dart';
import 'package:fajrak/screens/main_screen.dart';
import 'package:fajrak/screens/transactions/transactions_screen.dart';
import 'package:fajrak/widgets/transactions/add_transaction_dialog.dart';
import 'package:fajrak/widgets/dashboard/dashboard_quick_add.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Same loader pattern as the other widget tests: reads the real i18n JSON in
/// the real async zone and serves it to the fake-async test zone.
class _MapAssetLoader extends AssetLoader {
  _MapAssetLoader(this._data);
  final Map<String, Map<String, dynamic>> _data;

  @override
  Future<Map<String, dynamic>?> load(String path, Locale locale) async {
    return _data[locale.languageCode] ?? _data[locale.toString()];
  }
}

late Map<String, Map<String, dynamic>> _translations;

/// Pumps a MaterialApp whose `/main` route is the real [MainScreen], so a push
/// reproduces what the alerts screen and [NotificationService] do.
Widget _app() {
  return EasyLocalization(
    supportedLocales: const [Locale('en'), Locale('ar')],
    path: 'assets/i18n',
    startLocale: const Locale('en'),
    useOnlyLangCode: true,
    assetLoader: _MapAssetLoader(_translations),
    child: Builder(
      builder: (context) => MultiProvider(
        providers: [
          ChangeNotifierProvider<AppState>(create: (_) => AppState()),
          ChangeNotifierProvider<DashboardLayoutProvider>(
            create: (_) => DashboardLayoutProvider(),
          ),
        ],
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          localizationsDelegates: context.localizationDelegates,
          supportedLocales: context.supportedLocales,
          locale: context.locale,
          theme: ThemeData(useMaterial3: true),
          routes: {
            '/main': (_) => const MainScreen(),
            '/alerts': (_) => Scaffold(body: Text('stub:alerts')),
            '/transactions': (_) => const TransactionsScreen(),
          },
          home: const Scaffold(body: Text('home')),
        ),
      ),
    ),
  );
}

/// Index of the [IndexedStack] the top-most [MainScreen] is showing.
int _activeTab(WidgetTester tester) {
  final stack = tester.widget<IndexedStack>(
    find
        .descendant(
          of: find.byType(MainScreen).last,
          matching: find.byType(IndexedStack),
        )
        .first,
  );
  return stack.index ?? 0;
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
      url: 'https://main-screen-test.supabase.co',
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

  group('MainScreen — backend route arguments', () {
    testWidgets('opens on the Dashboard tab by default', (tester) async {
      await tester.pumpWidget(_app());
      await tester.pumpAndSettle();
      tester.state<NavigatorState>(find.byType(Navigator)).pushNamed('/main');
      await tester.pumpAndSettle();

      expect(_activeTab(tester), 4);
      expect(find.byType(DashboardScreen), findsOneWidget);
    });

    testWidgets('`?tab=spending` selects the Transactions tab', (tester) async {
      await tester.pumpWidget(_app());
      await tester.pumpAndSettle();
      tester.state<NavigatorState>(find.byType(Navigator)).pushNamed(
            '/main',
            arguments: <String, dynamic>{'tab': 'spending'},
          );
      await tester.pumpAndSettle();

      expect(_activeTab(tester), 3,
          reason: 'the web spending list is the mobile Transactions tab');
      expect(_activeTab(tester), isNot(4));
    });

    testWidgets('accepts the legacy integer tab form', (tester) async {
      await tester.pumpWidget(_app());
      await tester.pumpAndSettle();
      tester.state<NavigatorState>(find.byType(Navigator)).pushNamed(
            '/main',
            arguments: <String, dynamic>{'tab': 2},
          );
      await tester.pumpAndSettle();

      expect(_activeTab(tester), 2);
    });

    testWidgets('unknown tab values fall back to the Dashboard tab',
        (tester) async {
      await tester.pumpWidget(_app());
      await tester.pumpAndSettle();
      tester.state<NavigatorState>(find.byType(Navigator)).pushNamed(
            '/main',
            arguments: <String, dynamic>{'tab': 'not-a-tab'},
          );
      await tester.pumpAndSettle();

      expect(_activeTab(tester), 4);
    });

    testWidgets('`?quick=1` lands the caret in the Quick Add amount field',
        (tester) async {
      await tester.pumpWidget(_app());
      await tester.pumpAndSettle();
      tester.state<NavigatorState>(find.byType(Navigator)).pushNamed(
            '/main',
            arguments: <String, dynamic>{
              'tab': 'dashboard',
              'quickAdd': true,
            },
          );
      await tester.pumpAndSettle();

      final quickAdd = find.byType(DashboardQuickAdd);
      expect(quickAdd, findsOneWidget);
      final field = tester.widget<TextField>(
        find.descendant(of: quickAdd, matching: find.byType(TextField)),
      );
      expect(field.focusNode, isNotNull);
      expect(field.focusNode!.hasFocus, isTrue,
          reason: 'a `?quick=1` deep link must open the keyboard');
    });
  });

  testWidgets('quickAdd wins over a conflicting tab argument', (tester) async {
      await tester.pumpWidget(_app());
      await tester.pumpAndSettle();
      tester.state<NavigatorState>(find.byType(Navigator)).pushNamed(
            '/main',
            arguments: <String, dynamic>{
              'tab': 'spending',
              'quickAdd': true,
            },
          );
      await tester.pumpAndSettle();

      expect(_activeTab(tester), 4,
          reason: 'quick add only exists on the Dashboard, so it wins');
      final field = tester.widget<TextField>(
        find.descendant(
          of: find.byType(DashboardQuickAdd),
          matching: find.byType(TextField),
        ),
      );
      expect(field.focusNode!.hasFocus, isTrue);
    });

  group('TransactionsScreen — /transactions/add deep link', () {
    testWidgets('opens the add sheet instead of pushing a dead route',
        (tester) async {
      await tester.pumpWidget(_app());
      await tester.pumpAndSettle();
      tester.state<NavigatorState>(find.byType(Navigator)).pushNamed(
            '/transactions',
            arguments: <String, dynamic>{'addTransaction': true},
          );
      await tester.pumpAndSettle();

      expect(find.byType(AddTransactionDialog), findsOneWidget,
          reason: '`/transactions/add` must not silently land on the list');
    });

    testWidgets('plain /transactions does not open the sheet', (tester) async {
      await tester.pumpWidget(_app());
      await tester.pumpAndSettle();
      tester.state<NavigatorState>(find.byType(Navigator)).pushNamed(
            '/transactions',
          );
      await tester.pumpAndSettle();

      expect(find.byType(AddTransactionDialog), findsNothing);
    });
  });
}
