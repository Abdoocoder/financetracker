import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:fajrak/widgets/dashboard/gamification_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Loads i18n JSON from disk once per `setUpAll` and returns it synchronously
/// so the fake-async `testWidgets` zone resolves `.tr()` calls — same pattern
/// as testimonial_card_test.dart.
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
    child: Builder(
      builder: (context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        localizationsDelegates: context.localizationDelegates,
        supportedLocales: context.supportedLocales,
        locale: context.locale,
        theme: ThemeData(useMaterial3: true),
        home: Scaffold(body: SingleChildScrollView(child: child)),
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
  });

  testWidgets('shows the user_stats ladder title for 800 points', (tester) async {
    await tester.pumpWidget(_app(const GamificationCard(points: 800)));
    await tester.pump();

    // Same display as Achievements' LevelCard for the same user.
    expect(find.textContaining('ثري مبتدئ'), findsOneWidget,
        reason: 'Dashboard must show the ladder title, not a health rank');
    expect(find.textContaining('المستوى 5'), findsOneWidget);
    expect(find.textContaining('800'), findsOneWidget,
        reason: 'points shown must be total_points, not health_score');

    final bar = tester.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator));
    expect(bar.value, closeTo(800 / 1200, 1e-9),
        reason: 'progress must follow the LevelCard formula');
  });

  testWidgets('maps low points to level 1, never to a health-based rank',
      (tester) async {
    await tester.pumpWidget(_app(const GamificationCard(points: 35)));
    await tester.pump();

    expect(find.textContaining('مبتدئ'), findsOneWidget);
    expect(find.textContaining('المستوى 1'), findsOneWidget);
    expect(find.textContaining('35'), findsOneWidget);
    expect(
      find.textContaining('Bronze'),
      findsNothing,
      reason: 'the old health_score ladder (bronze/silver/gold/diamond) '
          'must no longer be reachable from this card',
    );
  });

  testWidgets('max level renders a full bar', (tester) async {
    await tester.pumpWidget(_app(const GamificationCard(points: 1500)));
    await tester.pump();

    expect(find.textContaining('حر مالياً'), findsOneWidget);
    expect(find.textContaining('المستوى 6'), findsOneWidget);

    final bar = tester.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator));
    expect(bar.value, 1.0);
  });
}
