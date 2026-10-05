import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:fajrak/widgets/settings/testimonial_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Loads i18n JSON from disk once per `setUpAll` and returns it synchronously so
/// the fake-async `testWidgets` zone resolves `.tr()` calls.
class _MapAssetLoader extends AssetLoader {
  _MapAssetLoader(this._data);
  final Map<String, Map<String, dynamic>> _data;

  @override
  Future<Map<String, dynamic>?> load(String path, Locale locale) async {
    return _data[locale.languageCode] ?? _data[locale.toString()];
  }
}

late Map<String, Map<String, dynamic>> _translations;

/// Stub transport: no existing testimonial, and a fixed signed-in user so
/// `TestimonialCard._loadExisting()` takes the query path instead of throwing.
Future<http.Response> _handler(http.Request req) async {
  final path = req.url.path;

  if (path.endsWith('/testimonials')) {
    return http.Response('[]', 200,
        headers: {'content-type': 'application/json'});
  }

  if (path.contains('/auth/v1/user')) {
    return http.Response(
      jsonEncode({'id': 'test-user-id', 'email': 't@t.com'}),
      200,
      headers: {'content-type': 'application/json'},
    );
  }

  return http.Response('{"message":"not found"}', 404);
}

/// Mirrors production layout: `Scaffold` supplies the nearest `Material` above
/// the card, which is what surfaced the hidden-background assertion.
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

    // Supabase.initialize persists session state via SharedPreferences; without
    // a mock the platform channel is absent and setUpAll throws
    // MissingPluginException (getAll). Same pattern as byok_keys_section_test.
    SharedPreferences.setMockInitialValues({});

    await Supabase.initialize(
      url: 'https://test.supabase.co',
      publishableKey: 'anon-key',
      httpClient: MockClient(_handler),
    );
  });

  testWidgets(
      'reports no hidden-background error when built or expanded (ListTile ink splash)',
      (tester) async {
    await tester.pumpWidget(_app(const TestimonialCard()));
    await tester.pump();

    expect(
      tester.takeException(),
      isNull,
      reason: 'mounting TestimonialCard must not report a ListTile whose '
          'background is hidden behind the decorated Container',
    );

    await tester.tap(find.byType(ExpansionTile));
    await tester.pumpAndSettle();

    expect(
      tester.takeException(),
      isNull,
      reason: 'expanding the testimonial tile must not report a ListTile whose '
          'background is hidden behind the decorated Container',
    );
  });

  testWidgets('places a Material between the decorated Container and the ExpansionTile',
      (tester) async {
    await tester.pumpWidget(_app(const TestimonialCard()));
    await tester.pump();

    Material? nearest;
    tester.element(find.byType(ExpansionTile)).visitAncestorElements((element) {
      if (element.widget is Material) {
        nearest = element.widget as Material;
        return false;
      }
      return true;
    });

    expect(nearest, isNotNull,
        reason: 'ink splashes paint on the nearest Material; without one the '
            'opaque Container decoration hides them');
  });
}