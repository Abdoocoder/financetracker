import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:fajrak/widgets/dashboard/zakat_hawl_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Loads i18n JSON from disk once per `setUpAll` and returns it synchronously
/// so the fake-async `testWidgets` zone resolves `.tr()` calls — same pattern
/// as gamification_card_test.dart.
class _MapAssetLoader extends AssetLoader {
  _MapAssetLoader(this._data);
  final Map<String, Map<String, dynamic>> _data;

  @override
  Future<Map<String, dynamic>?> load(String path, Locale locale) async {
    return _data[locale.languageCode] ?? _data[locale.toString()];
  }
}

late Map<String, Map<String, dynamic>> _translations;

Widget _app(Widget child) {
  return EasyLocalization(
    supportedLocales: const [Locale('en'), Locale('ar')],
    path: 'assets/i18n',
    startLocale: const Locale('en'),
    useOnlyLangCode: true,
    assetLoader: _MapAssetLoader(_translations),
    // The delegate must be registered on MaterialApp — otherwise EasyLocalization
    // never calls loadTranslations() and every .tr() falls back to the raw key.
    child: Builder(
      builder: (context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        localizationsDelegates: context.localizationDelegates,
        supportedLocales: context.supportedLocales,
        locale: context.locale,
        theme: ThemeData(useMaterial3: true),
        home: Scaffold(body: child),
      ),
    ),
  );
}

Future<void> _pumpCard(WidgetTester tester, Widget card) async {
  await tester.pumpWidget(_app(card));
  await tester.pump();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    final en = json.decode(await rootBundle.loadString('assets/i18n/en.json'));
    final ar = json.decode(await rootBundle.loadString('assets/i18n/ar.json'));
    _translations = {
      'en': Map<String, dynamic>.from(en),
      'ar': Map<String, dynamic>.from(ar),
    };
  });

  group('hawlToneFor', () {
    test('null → below (no nisab date)', () {
      expect(hawlToneFor(null), HawlTone.below);
    });

    test('<= 0 → overdue', () {
      expect(hawlToneFor(0), HawlTone.overdue);
      expect(hawlToneFor(-5), HawlTone.overdue);
    });

    test('1..7 → urgent', () {
      expect(hawlToneFor(1), HawlTone.urgent);
      expect(hawlToneFor(7), HawlTone.urgent);
    });

    test('8..60 → soon', () {
      expect(hawlToneFor(8), HawlTone.soon);
      expect(hawlToneFor(60), HawlTone.soon);
    });

    test('> 60 → safe', () {
      expect(hawlToneFor(61), HawlTone.safe);
      expect(hawlToneFor(150), HawlTone.safe);
    });
  });

  group('ZakatHawlCard', () {
    testWidgets('active hawl: shows countdown, due amount and progress ring',
        (tester) async {
      await _pumpCard(
        tester,
        const ZakatHawlCard(daysRemaining: 150, zakatDue: 125, currency: 'JOD'),
      );

      expect(find.text('Zakat Hawl Status'), findsOneWidget);
      expect(find.text('150 days remaining'), findsOneWidget);
      expect(find.text('Due: 125 JOD'), findsOneWidget);

      final ring = tester.widget<CircularProgressIndicator>(
        find.byType(CircularProgressIndicator),
      );
      // Elapsed fraction of the 354-day Hijri haul year.
      expect(ring.value, closeTo((354 - 150) / 354, 1e-9));
    });

    testWidgets('urgent band (<= 7 days): still shows the countdown',
        (tester) async {
      await _pumpCard(
        tester,
        const ZakatHawlCard(daysRemaining: 3, zakatDue: 40.5, currency: 'JOD'),
      );

      expect(find.text('3 days remaining'), findsOneWidget);
      expect(find.text('Due: 40.5 JOD'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('overdue (<= 0): shows the due-now message without a ring',
        (tester) async {
      await _pumpCard(
        tester,
        const ZakatHawlCard(daysRemaining: -2, zakatDue: 125, currency: 'JOD'),
      );

      expect(find.text('Your Zakat is due'), findsOneWidget);
      expect(find.text('Due: 125 JOD'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });

    testWidgets('below nisab (null): shows the calculate CTA and fires the callback',
        (tester) async {
      var tapped = false;
      await _pumpCard(
        tester,
        ZakatHawlCard(
          daysRemaining: null,
          zakatDue: 0,
          currency: 'JOD',
          onCalculateTap: () => tapped = true,
        ),
      );

      expect(find.text('Below Nisab'), findsOneWidget);
      expect(find.text('Calculate Zakat'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);

      await tester.tap(find.text('Calculate Zakat'));
      expect(tapped, isTrue);
    });
  });
}
