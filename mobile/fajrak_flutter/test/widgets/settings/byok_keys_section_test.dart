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

/// Loads i18n JSON from disk once per `setUp` (real async zone) and returns it
/// synchronously so the fake-async `testWidgets` zone resolves translations.
class _MapAssetLoader extends AssetLoader {
  _MapAssetLoader(this._data);
  final Map<String, Map<String, dynamic>> _data;

  @override
  Future<Map<String, dynamic>?> load(String path, Locale locale) async {
    return _data[locale.languageCode] ?? _data[locale.toString()];
  }
}

late Map<String, Map<String, dynamic>> _translations;

/// Fake: subclass of [ByokService] whose ctor performs no IO; records calls and
/// can throw a controlled error.
class _FakeByokService extends ByokService {
  _FakeByokService();

  int chatCalls = 0;
  String? capturedProviderId;
  String? capturedKeyId;
  String? capturedModel;
  List<ChatMsg>? capturedMessages;
  String errorCode = '';

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
    Duration stallTimeout = const Duration(seconds: 20),
  }) async {
    chatCalls++;
    capturedProviderId = providerId;
    capturedKeyId = keyId;
    capturedMessages = messages;
    capturedModel = model;
    if (errorCode.isNotEmpty) {
      throw ByokChatException(errorCode);
    }
  }
}

/// In-memory secure store so vault reads never touch the platform keystore.
class _InMemStore implements SecureStore {
  final _data = <String, String>{};
  @override
  Future<void> write({required String key, required String value}) async =>
      _data[key] = value;
  @override
  Future<String?> read({required String key}) async => _data[key];
  @override
  Future<void> delete({required String key}) async => _data.remove(key);
}

/// In-memory table backing the fake Supabase HTTP transport.
final List<Map<String, dynamic>> _table = [];

/// Fake Supabase REST transport (routed through a [MockClient]) answering
/// `/rest/v1/user_byok_keys` with the in-memory [_table]. Auth endpoints are
/// stubbed so `currentUser` resolves to a fixed user.
Future<http.Response> _handler(http.Request req) async {
  final path = req.url.path;

  if (path.endsWith('/user_byok_keys')) {
    switch (req.method) {
      case 'GET':
      case 'HEAD':
        return http.Response(
          jsonEncode(List<Map<String, dynamic>>.from(_table)),
          200,
          headers: {'content-type': 'application/json'},
        );
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
        return http.Response(jsonEncode([row]), 201,
            headers: {'content-type': 'application/json'});
      case 'DELETE':
        final id = req.url.queryParameters['id'];
        _table.removeWhere((r) => r['id'] == id);
        return http.Response('[]', 204);
      case 'PATCH':
        final id = req.url.queryParameters['id'];
        final body = jsonDecode(req.body) as Map<String, dynamic>;
        for (final r in _table) {
          if (r['id'] == id) {
            r.addAll(body);
          }
        }
        return http.Response('[]', 204);
    }
  }

  // Auth: /auth/v1/user returns a fixed user when a session is "present".
  if (path.contains('/auth/v1/user')) {
    return http.Response(
      jsonEncode({'id': 'test-user-id', 'email': 't@t.com'}),
      200,
      headers: {'content-type': 'application/json'},
    );
  }

  return http.Response('{"message":"not found"}', 404);
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

ByokKeysSection _section() => ByokKeysSection(
      vault: ByokVault(_InMemStore()),
      service: _FakeByokService(),
    );

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

    _table.clear();
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'https://test.supabase.co',
      publishableKey: 'anon-key',
      httpClient: MockClient(_handler),
      authOptions: const FlutterAuthClientOptions(persistSession: false),
    );
  });

  setUp(() {
    _table.clear();
  });

  testWidgets('renders empty state and the add form when there are no keys',
      (tester) async {
    await _pumpApp(tester, _section());

    expect(find.textContaining('No BYOK keys added yet'), findsOneWidget);
    expect(find.text('Add New BYOK Key'), findsOneWidget);
    expect(find.text('+ Add Key'), findsOneWidget);
  });

  testWidgets('empty state and provider chips are visible', (tester) async {
    await _pumpApp(tester, _section());

    expect(find.textContaining('OpenAI'), findsWidgets);
    expect(find.textContaining('Anthropic'), findsWidgets);
  });
}
