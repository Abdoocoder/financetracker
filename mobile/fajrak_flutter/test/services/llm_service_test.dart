import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:fajrak/services/llm_service.dart';

/// In-memory [SecureStore] so the device keystore isn't needed in tests.
class InMemorySecureStore implements SecureStore {
  final Map<String, String> _store = {};

  @override
  Future<void> write({required String key, required String value}) async {
    _store[key] = value;
  }

  @override
  Future<String?> read({required String key}) async => _store[key];

  @override
  Future<void> delete({required String key}) async {
    _store.remove(key);
  }
}

void main() {
  group('LlmService.queryFinancialInsight (Ollama OpenAI-compatible)', () {
    test('posts a financial system prompt and returns choices[0].message.content',
        () async {
      final captured = <String, dynamic>{};
      final client = MockClient((request) async {
        captured['url'] = request.url.toString();
        captured['headers'] = request.headers;
        captured['body'] = json.decode(request.body) as Map<String, dynamic>;
        return http.Response(
          json.encode({
            'choices': [
              {'message': {'content': '25 د.ك'}}
            ]
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final service = LlmService(
        httpClient: client,
        secureStore: InMemorySecureStore(),
      );

      final result = await service.queryFinancialInsight(
        providerBaseUrl: 'http://localhost:11434/v1',
        model: 'llama3.1',
        prompt: 'كم أنفقت على الطعام الشهر الماضي؟',
      );

      expect(result, '25 د.ك');
      expect(captured['url'], 'http://localhost:11434/v1/chat/completions');
      final body = captured['body'] as Map<String, dynamic>;
      expect(body['model'], 'llama3.1');
      expect(body['temperature'], 0.2);
      expect(body['stream'], false);
      final messages = body['messages'] as List<dynamic>;
      expect(messages.first['role'], 'system');
      expect(messages.last['role'], 'user');
    });

    test('adds a Bearer token when a stored provider key exists', () async {
      String? authHeader;
      final client = MockClient((request) async {
        authHeader = request.headers['Authorization'];
        return http.Response('{"choices":[{"message":{"content":"x"}}]}', 200);
      });
      final storage = InMemorySecureStore();
      final service = LlmService(
        httpClient: client,
        secureStore: storage,
      );

      await service.saveProviderKey(providerId: 'ollama-local', apiKey: 'sk-dev-1');
      await service.queryFinancialInsight(
        providerBaseUrl: 'http://localhost:11434/v1',
        model: 'm',
        prompt: 'p',
        providerId: 'ollama-local',
      );

      expect(authHeader, 'Bearer sk-dev-1');
    });

    test('omits Authorization when no key is stored for the provider', () async {
      String? authHeader = 'SENTINEL';
      final client = MockClient((request) async {
        authHeader = request.headers['Authorization'];
        return http.Response('{"choices":[{"message":{"content":"x"}}]}', 200);
      });
      final service = LlmService(
        httpClient: client,
        secureStore: InMemorySecureStore(),
      );

      await service.queryFinancialInsight(
        providerBaseUrl: 'http://localhost:11434/v1',
        model: 'm',
        prompt: 'p',
        providerId: 'unknown-provider',
      );

      expect(authHeader, isNull);
    });

    test('returns null on a non-200 response', () async {
      final client = MockClient((request) async => http.Response('boom', 500));
      final service = LlmService(
        httpClient: client,
        secureStore: InMemorySecureStore(),
      );
      final result = await service.queryFinancialInsight(
        providerBaseUrl: 'http://localhost:11434/v1',
        model: 'm',
        prompt: 'p',
      );
      expect(result, isNull);
    });

    test('returns null when the response has no choices', () async {
      final client = MockClient((request) async => http.Response('{"choices":[]}', 200));
      final service = LlmService(
        httpClient: client,
        secureStore: InMemorySecureStore(),
      );
      final result = await service.queryFinancialInsight(
        providerBaseUrl: 'http://localhost:11434/v1',
        model: 'm',
        prompt: 'p',
      );
      expect(result, isNull);
    });
  });

  group('SecureKeyStore (BYOK key at rest)', () {
    test('round-trips and deletes a key', () async {
      final store = InMemorySecureStore();
      await store.write(key: 'llm_key_ollama-local', value: 'sk-secret');
      expect(await store.read(key: 'llm_key_ollama-local'), 'sk-secret');
      await store.delete(key: 'llm_key_ollama-local');
      expect(await store.read(key: 'llm_key_ollama-local'), isNull);
    });
  });

  group('defaultOllamaBaseUrl', () {
    test('uses 10.0.2.2 for the Android emulator and localhost otherwise', () {
      expect(LlmService.defaultOllamaBaseUrl(isAndroidEmulator: true),
          'http://10.0.2.2:11434/v1');
      expect(LlmService.defaultOllamaBaseUrl(isAndroidEmulator: false),
          'http://localhost:11434/v1');
    });
  });
}
