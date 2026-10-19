import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:fajrak/screens/more/zakat_calculator_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Same i18n loader pattern as zakat_hawl_card_test.dart: loads the real
/// en/ar JSON once so `.tr()` resolves inside the fake-async testWidgets zone.
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
        home: Scaffold(body: child),
      ),
    ),
  );
}

/// Simulates the `make run-web` (Chrome) failure mode reported in production:
///  - Yahoo Finance: CORS-blocked in the browser → request fails (here: non-200)
///  - FreeGoldAPI fallback: 200, but numeric fields arrive as JSON **Strings**
///    ("gold": "3012.45") — the historical `as num` cast threw
///    `TypeError: "gold": type 'String' is not a subtype of type 'num'`
///  - exchange-rate API: success, JOD = 1.0 for deterministic expectations
Future<http.Response> _livePricesHandler(http.Request request) async {
  final url = request.url.toString();
  if (url.contains('query1.finance.yahoo.com')) {
    return http.Response('{"chart":null}', 404);
  }
  if (url.contains('freegoldapi.com')) {
    return http.Response(
      jsonEncode({'gold': '3012.45', 'silver': '36.12'}),
      200,
      headers: {'content-type': 'application/json'},
    );
  }
  if (url.contains('open.er-api.com')) {
    return http.Response(
      jsonEncode({'result': 'success', 'rates': {'JOD': 1.0}}),
      200,
      headers: {'content-type': 'application/json'},
    );
  }
  return http.Response('{"message":"not found"}', 401);
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
    // No stored session → auth.currentUser is null → _load() exits early and
    // only the explicit "Fetch Live Prices" tap drives the code under test.
    await Supabase.initialize(
      url: 'https://test.supabase.co',
      publishableKey: 'anon-key',
      httpClient: MockClient((_) async => http.Response('{"message":"no session"}', 401)),
    );
  });

  testWidgets(
    'live prices: FreeGoldAPI String prices fill gold/silver fields when Yahoo is CORS-blocked',
    (tester) async {
      await http.runWithClient(() async {
        await tester.pumpWidget(_app(const ZakatCalculatorScreen()));
        await tester.pumpAndSettle();

        // The fetch control is the only TextButton with a refresh icon on this
        // screen (the other refresh affordance is a GestureDetector).
        final fetchButton = find.widgetWithIcon(TextButton, Icons.refresh);
        await tester.ensureVisible(fetchButton);
        await tester.pumpAndSettle();
        await tester.tap(fetchButton);
        await tester.pumpAndSettle();

        // Regression lock: before the defensive `_parsePrice` fix the
        // `(fb['gold'] as num)` cast threw a TypeError, the catch swallowed it,
        // and these fields silently kept their defaults ('30' / '0.35').
        expect(
          find.text('3012.45'),
          findsOneWidget,
          reason: 'gold price String "3012.45" must parse, not crash the fetch',
        );
        expect(
          find.text('36.12'),
          findsOneWidget,
          reason: 'silver price String "36.12" must parse, not crash the fetch',
        );
      }, () => MockClient(_livePricesHandler));
    },
  );
}
