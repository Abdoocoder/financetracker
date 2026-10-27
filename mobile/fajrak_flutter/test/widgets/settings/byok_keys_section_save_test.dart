import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:fajrak/services/byok/byok_service.dart';
import 'package:fajrak/services/byok/chat.dart';
import 'package:fajrak/services/llm_service.dart';
import 'package:fajrak/widgets/settings/byok_keys_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Success-path coverage for `_handleSave` (authenticated user + working vault)
/// — the path the previous tests never reached.

class _MapAssetLoader extends AssetLoader {
  _MapAssetLoader(this._data);
  final Map<String, Map<String, dynamic>> _data;

  @override
  Future<Map<String, dynamic>?> load(String path, Locale locale) async {
    return _data[locale.languageCode] ?? _data[locale.toString()];
  }
}

late Map<String, Map<String, dynamic>> _translations;

const _user = {
  'id': 'test-user-id',
  'email': 't@t.com',
  'aud': 'authenticated',
  'role': 'authenticated',
  'app_metadata': <String, dynamic>{},
  'user_metadata': <String, dynamic>{},
};

class _InMemStore implements SecureStore {
  final data = <String, String>{};
  @override
  Future<void> write({required String key, required String value}) async =>
      data[key] = value;
  @override
  Future<String?> read({required String key}) async => data[key];
  @override
  Future<void> delete({required String key}) async => data.remove(key);
}

class _FakeByokService extends ByokService {
  _FakeByokService();
  @override
  Future<void> chat({
    required String providerId,
    String? keyId,
    String systemPrompt = '',
    required List<ChatMsg> messages,
    String? model,
    void Function(String)? onDelta,
    bool Function()? isStopped,
    bool stream = true,
    Duration? stallTimeout,
  }) async {}
}

final List<Map<String, dynamic>> _table = [];

/// A real HTTP client attaches the originating request to every response
/// (`Response.fromStream` copies `request`), and `postgrest` relies on it
/// (`response.request!`). `MockClient` does not do this for us, so we mirror
/// production here — otherwise the insert throws a *test-only* null-check
/// error inside `postgrest` instead of exercising the real save path.
http.Response _resp(http.Request req, String body, int status) => http.Response(
      body,
      status,
      request: req,
      headers: {'content-type': 'application/json'},
    );

Future<http.Response> _handler(http.Request req) async {
  final path = req.url.path;

  if (path.endsWith('/auth/v1/token')) {
    return _resp(
      req,
      jsonEncode({
        'access_token': 'header.payload.sig',
        'token_type': 'bearer',
        'expires_in': 3600,
        'refresh_token': 'refresh-token',
        'user': _user,
      }),
      200,
    );
  }
  if (path.contains('/auth/v1/user')) {
    return _resp(req, jsonEncode(_user), 200);
  }

  if (path.endsWith('/user_byok_keys')) {
    switch (req.method) {
      case 'GET':
      case 'HEAD':
        return _resp(req, jsonEncode(_table), 200);
      case 'POST':
        final body = jsonDecode(req.body) as Map<String, dynamic>;
        final row = {
          'id': body['id'],
          'provider_id': body['provider_id'],
          'key_name': body['key_name'],
          'key_prefix': body['key_prefix'],
          'is_active': body['is_active'],
          'created_at': DateTime.now().toUtc().toIso8601String(),
          'last_used_at': null,
        };
        _table.insert(0, row);
        return _resp(req, jsonEncode([row]), 201);
    }
  }

  return _resp(req, '{}', 200);
}

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

Future<void> _pumpApp(WidgetTester tester, Widget child) async {
  await tester.pumpWidget(_app(child));
  for (var i = 0; i < 20; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
  await tester.pumpAndSettle();
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
      url: 'https://test.supabase.co',
      publishableKey: 'anon-key',
      httpClient: MockClient(_handler),
    );
  });

  setUp(() async {
    _table.clear();
    // Establish an authenticated session so `_handleSave` clears the auth
    // guard and takes the real save path.
    await Supabase.instance.client.auth.setSession('refresh-token');
  });

  testWidgets('adds a key: stores it, persists metadata and shows the card',
      (tester) async {
    final store = _InMemStore();
    await _pumpApp(
      tester,
      ByokKeysSection(
        vault: ByokVault(store),
        service: _FakeByokService(),
      ),
    );

    // Pick the NVIDIA NIM provider.
    await tester.tap(find.byType(DropdownButtonFormField<String>));
    await tester.pumpAndSettle();
    await tester.tap(
      find.text('NVIDIA NIM — meta/llama-3.1-8b-instruct'),
    );
    await tester.pumpAndSettle();

    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), 'NVIDIA key');
    await tester.enterText(fields.at(1), 'nvapi-abcdef0123456789');
    await tester.pumpAndSettle();

    // Scroll to the Add Key button (it may be off-screen due to the Get API Key button)
    await tester.ensureVisible(find.text('+ Add Key'));
    await tester.tap(find.text('+ Add Key'));
    await tester.pumpAndSettle();

    // No uncaught error escaped the save.
    expect(tester.takeException(), isNull);

    // The key is listed and the generic error never appeared.
    expect(find.text('NVIDIA key'), findsOneWidget);
    expect(find.textContaining('Something went wrong'), findsNothing);

    // Metadata was persisted and the raw key lives only in the local vault.
    expect(_table, hasLength(1));
    expect(_table.first['provider_id'], 'nvidia-nim');
    expect(store.data.values, contains('nvapi-abcdef0123456789'));
  });
}
