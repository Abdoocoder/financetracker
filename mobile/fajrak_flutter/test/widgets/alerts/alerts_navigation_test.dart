import 'dart:convert';

import 'package:easy_localization/easy_localization.dart' hide TextDirection;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:fajrak/app_state.dart';
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
}