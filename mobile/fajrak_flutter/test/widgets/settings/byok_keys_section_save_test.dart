import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:fajrak/services/byok/byok_service.dart';
import 'package:fajrak/services/byok/chat.dart';
import 'package:fajrak/services/byok/envelope.dart';
import 'package:fajrak/services/llm_service.dart';
import 'package:fajrak/widgets/settings/byok_keys_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/byok/fixtures/byok_test_keys.dart';

/// Coverage for `_handleSave` — the path that persists a key only after the
/// proxy has actually validated it.
///
/// Regression context (2026-10-29): the validator used to POST to
/// `https://fajrak.app` (a host with no `/api/*` routes), and called
/// `buildEnvelope(rawKey)` with no config. Mobile builds carry no
/// `--dart-define=BYOK_*` values and `.env` is not an asset, so the build threw
/// `ByokConfigException` on every attempt and the catch-all silently reported
/// `ok: true`. Validation therefore never validated anything, and a rejected
/// key was saved as if it worked.

class _MapAssetLoader extends AssetLoader {
  _MapAssetLoader(this._data);
  final Map<String, Map<String, dynamic>> _data;

  @override
  Future<Map<String, dynamic>?> load(String path, Locale locale) async {
    return _data[locale.languageCode] ?? _data[locale.toString()];
  }
}

late Map<String, Map<String, dynamic>> _translations;

const _nvidiaLabel = 'NVIDIA NIM — nvidia/nemotron-3-super-120b-a12b';

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

/// Records every request the widget's validation client makes.
class _ValidationRecorder {
  final List<http.Request> requests = [];

  http.Request? get validateRequest => requests
      .where((r) => r.url.path == '/api/byok/validate')
      .cast<http.Request?>()
      .firstWhere((_) => true, orElse: () => null);
}

/// Stubs `/api/byok/config` (real fixture key, so the envelope really builds)
/// and `/api/byok/validate` (the verdict under test).
http.Client _validationClient(
  _ValidationRecorder recorder, {
  int status = 200,
  String body = '{"ok":true}',
}) {
  return MockClient((req) async {
    recorder.requests.add(req);
    if (req.url.path == '/api/byok/config') {
      return http.Response(
        jsonEncode({'keyId': 'test-kek-v1', 'publicKey': fixtureBPublicPem}),
        200,
        headers: {'content-type': 'application/json'},
      );
    }
    if (req.url.path == '/api/byok/validate') {
      return http.Response(
        body,
        status,
        headers: {'content-type': 'application/json'},
      );
    }
    return http.Response('{}', 404);
  });
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

/// Fills the add-key form for NVIDIA NIM and taps Add Key.
Future<void> _submitNvidiaKey(WidgetTester tester, String rawKey) async {
  await tester.tap(find.byType(DropdownButtonFormField<String>));
  await tester.pumpAndSettle();
  await tester.tap(find.text(_nvidiaLabel));
  await tester.pumpAndSettle();

  final fields = find.byType(TextField);
  await tester.enterText(fields.at(0), 'NVIDIA key');
  await tester.enterText(fields.at(1), rawKey);
  await tester.pumpAndSettle();

  // The Get API Key button can push the submit button off-screen.
  await tester.ensureVisible(find.text('+ Add Key'));
  await tester.tap(find.text('+ Add Key'));
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
    // The resolver caches the config process-wide; each test stubs its own.
    ByokConfigResolver.resetSessionCache();
    // Establish an authenticated session so `_handleSave` clears the auth
    // guard and takes the real save path.
    await Supabase.instance.client.auth.setSession('refresh-token');
  });

  testWidgets('validates a real envelope against fajrak.com, then saves',
      (tester) async {
    final store = _InMemStore();
    final recorder = _ValidationRecorder();
    await _pumpApp(
      tester,
      ByokKeysSection(
        vault: ByokVault(store),
        service: _FakeByokService(),
        httpClient: _validationClient(recorder),
      ),
    );

    await _submitNvidiaKey(tester, 'nvapi-abcdef0123456789');

    // No uncaught error escaped the save.
    expect(tester.takeException(), isNull);

    // The key is listed and no error appeared.
    expect(find.text('NVIDIA key'), findsOneWidget);
    expect(find.textContaining('Something went wrong'), findsNothing);

    // Validation hit the production origin that actually serves /api/*.
    final validate = recorder.validateRequest!;
    expect(validate.url.host, 'fajrak.com');
    expect(validate.url.path, '/api/byok/validate');
    expect(validate.headers['authorization'], 'Bearer header.payload.sig');
    final sent = jsonDecode(validate.body) as Map<String, dynamic>;
    expect(sent['providerId'], 'nvidia-nim');
    expect(sent['keyId'], 'test-kek-v1');
    // Only the envelope travels — never the plaintext key.
    expect(sent.containsKey('apiKey'), isFalse);
    expect(validate.body, isNot(contains('nvapi-abcdef0123456789')));

    // Metadata was persisted and the raw key lives only in the local vault.
    expect(_table, hasLength(1));
    expect(_table.first['provider_id'], 'nvidia-nim');
    expect(store.data.values, contains('nvapi-abcdef0123456789'));
  });

  testWidgets('a rejected key is not saved and surfaces the provider message',
      (tester) async {
    final store = _InMemStore();
    final recorder = _ValidationRecorder();
    await _pumpApp(
      tester,
      ByokKeysSection(
        vault: ByokVault(store),
        service: _FakeByokService(),
        httpClient: _validationClient(
          recorder,
          body: '{"ok":false,"code":"auth","error":"Invalid key"}',
        ),
      ),
    );

    await _submitNvidiaKey(tester, 'nvapi-bad-key');

    expect(recorder.validateRequest, isNotNull);
    expect(_table, isEmpty);
    expect(store.data, isEmpty);
    expect(
      find.text(
        'The provider rejected this key. Check that it was copied in full '
        'and is still active.',
      ),
      findsOneWidget,
    );
    // The raw English `error` field from the API must never reach the UI.
    expect(find.text('Invalid key'), findsNothing);
  });

  testWidgets('a dead model slug is reported as a model problem',
      (tester) async {
    final store = _InMemStore();
    final recorder = _ValidationRecorder();
    await _pumpApp(
      tester,
      ByokKeysSection(
        vault: ByokVault(store),
        service: _FakeByokService(),
        httpClient: _validationClient(
          recorder,
          body: '{"ok":false,"code":"model-not-found","error":"Model not found"}',
        ),
      ),
    );

    await _submitNvidiaKey(tester, 'nvapi-abcdef0123456789');

    expect(_table, isEmpty);
    expect(
      find.text(
        'Your key could not reach the model this app tests with. Try again '
        'later, or use another provider.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('an expired session is not mistaken for an invalid key',
      (tester) async {
    final store = _InMemStore();
    final recorder = _ValidationRecorder();
    await _pumpApp(
      tester,
      ByokKeysSection(
        vault: ByokVault(store),
        service: _FakeByokService(),
        // The validate route answers 200 for key verdicts; a 401 here is the
        // session, never the provider key.
        httpClient: _validationClient(recorder, status: 401, body: '{}'),
      ),
    );

    await _submitNvidiaKey(tester, 'nvapi-abcdef0123456789');

    expect(_table, isEmpty);
    expect(
      find.text('Your session expired or was rejected. Sign in again, then retry.'),
      findsOneWidget,
    );
  });

  testWidgets('a provider outage blocks the save with an actionable message',
      (tester) async {
    final store = _InMemStore();
    final recorder = _ValidationRecorder();
    await _pumpApp(
      tester,
      ByokKeysSection(
        vault: ByokVault(store),
        service: _FakeByokService(),
        httpClient: _validationClient(
          recorder,
          body: '{"ok":false,"code":"provider-down","error":"Provider unavailable"}',
        ),
      ),
    );

    await _submitNvidiaKey(tester, 'nvapi-abcdef0123456789');

    expect(_table, isEmpty);
    expect(
      find.text('The provider is unavailable right now. Try again in a moment.'),
      findsOneWidget,
    );
  });

  testWidgets('a rate-limited verdict does not block the save', (tester) async {
    final store = _InMemStore();
    final recorder = _ValidationRecorder();
    await _pumpApp(
      tester,
      ByokKeysSection(
        vault: ByokVault(store),
        service: _FakeByokService(),
        // Matches web `classifyValidationResponse`: rate limiting is temporary
        // and inconclusive, so the key is saved and can be tested later.
        httpClient: _validationClient(
          recorder,
          body: '{"ok":true,"code":"rate-limited","warning":"rate_limited"}',
        ),
      ),
    );

    await _submitNvidiaKey(tester, 'nvapi-abcdef0123456789');

    expect(recorder.validateRequest, isNotNull);
    expect(_table, hasLength(1));
    expect(store.data.values, contains('nvapi-abcdef0123456789'));
  });

  testWidgets('an HTTP 429 from an edge limiter does not block the save',
      (tester) async {
    final store = _InMemStore();
    final recorder = _ValidationRecorder();
    await _pumpApp(
      tester,
      ByokKeysSection(
        vault: ByokVault(store),
        service: _FakeByokService(),
        httpClient: _validationClient(
          recorder,
          status: 429,
          body: 'Too Many Requests',
        ),
      ),
    );

    await _submitNvidiaKey(tester, 'nvapi-abcdef0123456789');

    expect(_table, hasLength(1));
    expect(
      find.text(
        'The provider rejected this key. Check that it was copied in full '
        'and is still active.',
      ),
      findsNothing,
    );
  });
}
