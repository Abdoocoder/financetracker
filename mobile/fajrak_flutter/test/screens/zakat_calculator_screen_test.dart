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

// ── Live-price endpoint fixtures, matching what the REAL endpoints serve ──

/// gold-api.com XAU/XAG: a single JSON object, USD per troy ounce.
/// The XAU `price` is deliberately a JSON **String** so the parse at the new
/// call site goes through `_parsePrice` (the historical String/num bug class).
const String _goldApiXauBody = '{"currency":"USD","name":"Gold",'
    '"price":"4161.299805","symbol":"XAU"}';
const String _goldApiXagBody = '{"currency":"USD","name":"Silver",'
    '"price":57.643002,"symbol":"XAG"}';

/// freegoldapi.com/data/latest.json: the REAL shape is a JSON **Array** of
/// {date, price, source} history records — never a {"gold","silver"} map.
/// This fixture reproduces the production crash: `fb['gold']` on a List threw
/// `TypeError: "gold": type 'String' is not a subtype of type 'int'`.
const String _freeGoldApiRealBody = '[{"date":"1258-01-01","price":0.89,'
    '"source":"measuringworth_british (GBP)"},'
    '{"date":"2026-02-20","price":5059.3,"source":"yahoo_finance"}]';

/// Simulates the `make run-web` (Chrome) failure mode reported in production:
///  - Yahoo Finance: CORS-blocked in the browser → the request **throws**
///  - gold-api.com: live gold+silver objects (USD/oz), CORS-enabled
///  - freegoldapi: real array shape (kept as a route so the pre-fix crash
///    path stays reproducible)
///  - exchange-rate API: JOD rate ≠ 1.0 so a discarded rate is detectable
Future<http.Response> _livePricesHandler(http.Request request) async {
  final url = request.url.toString();
  if (url.contains('query1.finance.yahoo.com')) {
    // Browser CORS failure rejects the request; it does not return a status.
    throw http.ClientException('Blocked by CORS');
  }
  if (url.contains('api.gold-api.com/price/XAU')) {
    return http.Response(
      _goldApiXauBody,
      200,
      headers: {'content-type': 'application/json'},
    );
  }
  if (url.contains('api.gold-api.com/price/XAG')) {
    return http.Response(
      _goldApiXagBody,
      200,
      headers: {'content-type': 'application/json'},
    );
  }
  if (url.contains('freegoldapi.com')) {
    return http.Response(
      _freeGoldApiRealBody,
      200,
      headers: {'content-type': 'application/json'},
    );
  }
  if (url.contains('open.er-api.com')) {
    return http.Response(
      jsonEncode({'result': 'success', 'rates': {'JOD': 0.709}}),
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
    'live prices: web CORS mode — gold-api fallback fills gold/silver per gram, exchange rate preserved',
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

        // Regression lock for two production bugs at once:
        //  1. freegoldapi serves a List — `fb['gold']` threw a TypeError and
        //     the fields silently kept their defaults ('30' / '0.35').
        //  2. Yahoo's CORS failure rejected the whole Future.wait and the
        //     catchError replaced the real JOD rate with 1.0.
        // Expected values mirror the endpoint contract: USD per troy ounce
        // ÷ 31.1035 g/oz × JOD rate — computed independently of the code.
        const double troyOzToGram = 31.1035;
        const double jodRate = 0.709;
        final expectedGold = (4161.299805 / troyOzToGram) * jodRate;
        final expectedSilver = (57.643002 / troyOzToGram) * jodRate;

        expect(
          find.text(expectedGold.toStringAsFixed(2)),
          findsOneWidget,
          reason: 'gold must come from gold-api XAU ÷ g/oz × JOD rate — '
              'not stay at the default and not use a discarded rate of 1.0',
        );
        expect(
          find.text(expectedSilver.toStringAsFixed(2)),
          findsOneWidget,
          reason: 'silver must come from gold-api XAG ÷ g/oz × JOD rate — '
              'the old freegoldapi endpoint has no silver data at all',
        );
      }, () => MockClient(_livePricesHandler));
    },
  );
}
