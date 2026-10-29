import 'dart:async';
import 'dart:convert';

import 'package:fajrak/services/llm_service.dart';
import 'package:fajrak/services/byok/byok_service.dart';
import 'package:fajrak/services/byok/chat.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:webcrypto/webcrypto.dart';

const testKekId = 'XF2-TEST-KEK';
const testProxyBase = 'https://fajrak.example';

/// Secure-store fake so vault reads never touch the platform keystore.
class InMemorySecureStore implements SecureStore {
  final _data = <String, String>{};

  @override
  Future<void> write({required String key, required String value}) async {
    _data[key] = value;
  }

  @override
  Future<String?> read({required String key}) async => _data[key];

  @override
  Future<void> delete({required String key}) async {
    _data.remove(key);
  }
}

/// Returns an SSE response whose body never emits — used to prove the 20s
/// silent-stall protection surfaces as a `timeout` error (S1) and that a stop
/// flag swallows it (T5.3).
class StallingClient extends http.BaseClient {
  StallingClient({this.statusCode = 200});

  final int statusCode;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    return http.StreamedResponse(StreamController<List<int>>().stream, statusCode);
  }
}

/// Returns a streamed response split across real network chunk boundaries.
class ChunkedClient extends http.BaseClient {
  ChunkedClient(this.statusCode, this.chunks);

  final int statusCode;
  final List<List<int>> chunks;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    return http.StreamedResponse(
      Stream.fromIterable(chunks),
      statusCode,
      headers: {'content-type': 'text/event-stream; charset=utf-8'},
    );
  }
}

String _openaiSse(List<String> tokens) =>
    '${tokens.map((t) => 'data: ${jsonEncode({'choices': [{'delta': {'content': t}}]})}\n\n').join()}data: [DONE]\n\n';

String _anthropicSse(List<String> tokens) => tokens
    .map((t) => 'data: ${jsonEncode({
          'type': 'content_block_delta',
          'index': 0,
          'delta': {'type': 'text_delta', 'text': t},
        })}\n\n')
    .join();

void main() {
  late String publicKeyPem;

  setUpAll(() async {
    final pair =
        await RsaOaepPrivateKey.generateKey(2048, BigInt.from(65537), Hash.sha256);
    final spki = await pair.publicKey.exportSpkiKey();
    publicKeyPem = '-----BEGIN PUBLIC KEY-----\n'
        '${base64Encode(spki)}\n'
        '-----END PUBLIC KEY-----\n';
  });

  final providerChat = [
    const ChatMsg(role: 'user', content: 'Hello'),
    const ChatMsg(role: 'assistant', content: 'Hi there'),
  ];

  ByokService service(
    http.Client client, {
    SecureStore? store,
    Future<String?> Function()? token,
  }) {
    final secureStore = store ?? InMemorySecureStore();
    return ByokService(
      httpClient: client,
      secureStore: secureStore,
      tokenProvider: token ?? () async => 'test-jwt',
      proxyBaseUrl: testProxyBase,
      publicKeyPem: publicKeyPem,
      kekId: testKekId,
    );
  }

  group('proxy path', () {
    test('POSTs envelope + Bearer JWT and surfaces SSE deltas', () async {
      late http.Request captured;
      final client = MockClient((req) async {
        captured = req;
        return http.Response(
          _anthropicSse(['Hel', 'lo']),
          200,
          headers: {'content-type': 'text/event-stream'},
        );
      });
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-ant-test');
      final svc = service(client, store: store);

      final out = <String>[];
      await svc.chat(
        providerId: 'anthropic',
        keyId: 'rec-1',
        systemPrompt: 'You are a helpful assistant.',
        messages: providerChat,
        model: 'claude-sonnet-4-6',
        onDelta: out.add,
      );

      expect(out, ['Hel', 'lo']);
      expect(captured.method, 'POST');
      expect(captured.url.toString(), '$testProxyBase/api/byok/proxy');
      expect(captured.headers['authorization'], 'Bearer test-jwt');
      expect(captured.headers.containsKey('x-api-key'), isFalse);

      final body = jsonDecode(captured.body) as Map<String, dynamic>;
      expect(body['providerId'], 'anthropic');
      expect(body['keyId'], testKekId);
      expect(body['env'], isNotEmpty);
      expect(body['payload'], isNotEmpty);
      expect(body['stream'], isTrue);
      expect(body['headers'], {'anthropic-version': '2023-06-01'});

      final inner =
          jsonDecode(utf8.decode(base64Decode(body['body'] as String)))
              as Map<String, dynamic>;
      expect(inner['model'], 'claude-sonnet-4-6');
      expect(inner['system'], 'You are a helpful assistant.');
      expect(inner['stream'], isTrue);
      expect(inner['messages'], isNotEmpty);
    });

    test('openai proxy body has no "headers" key (auth header stays request-level)',
        () async {
      late http.Request captured;
      final client = MockClient((req) async {
        captured = req;
        return http.Response(_openaiSse(['ok']), 200);
      });
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-openai');
      final svc = service(client, store: store);

      await svc.chat(
        providerId: 'openai',
        keyId: 'rec-1',
        systemPrompt: 's',
        messages: providerChat,
        model: 'gpt-5.4-mini',
        onDelta: (_) {},
      );

      final body = jsonDecode(captured.body) as Map<String, dynamic>;
      expect(body.containsKey('headers'), isFalse);
      expect(captured.headers['authorization'], 'Bearer test-jwt');
      expect(captured.headers.containsKey('x-api-key'), isFalse);
    });

    test('deltas split across network chunks are accumulated', () async {
      const a = 'data: {"choices":[{"delta":{"content":"t';
      const b = 'o"}}]}\n\ndata: [DONE]\n\n';
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-openai');
      final svc = service(
        ChunkedClient(200, [utf8.encode(a), utf8.encode(b)]),
        store: store,
      );

      final out = <String>[];
      await svc.chat(
        providerId: 'openai',
        keyId: 'rec-1',
        systemPrompt: 's',
        messages: providerChat,
        model: 'gpt-5.4-mini',
        onDelta: out.add,
      );
      expect(out, ['to']);
    });

    test('missing local key throws no-key without any HTTP', () async {
      var calls = 0;
      final client = MockClient((req) async {
        calls++;
        return http.Response('', 200);
      });
      final svc = service(client);

      await expectLater(
        svc.chat(
          providerId: 'anthropic',
          keyId: 'rec-missing',
          systemPrompt: 's',
          messages: providerChat,
          model: 'claude-sonnet-4-6',
          onDelta: (_) {},
        ),
        throwsA(isA<ByokChatException>()
            .having((e) => e.code, 'code', 'no-key')),
      );
      expect(calls, 0);
    });

    test('null session token throws unauthorized without any HTTP', () async {
      var calls = 0;
      final client = MockClient((req) async {
        calls++;
        return http.Response('', 200);
      });
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-ant-test');
      final svc = service(client, store: store, token: () async => null);

      await expectLater(
        svc.chat(
          providerId: 'anthropic',
          keyId: 'rec-1',
          systemPrompt: 's',
          messages: providerChat,
          model: 'claude-sonnet-4-6',
          onDelta: (_) {},
        ),
        throwsA(isA<ByokChatException>()
            .having((e) => e.code, 'code', 'unauthorized')),
      );
      expect(calls, 0);
    });

    for (final (status, code) in [(401, 'unauthorized'), (403, 'unauthorized')]) {
      test('proxy $status -> $code', () async {
        final store = InMemorySecureStore();
        await ByokVault(store).saveProviderKey('rec-1', 'sk-ant-test');
        final svc = service(
          MockClient((req) async => http.Response('{}', status)),
          store: store,
        );

        await expectLater(
          svc.chat(
            providerId: 'anthropic',
            keyId: 'rec-1',
            systemPrompt: 's',
            messages: providerChat,
            model: 'claude-sonnet-4-6',
            onDelta: (_) {},
          ),
          throwsA(isA<ByokChatException>()
              .having((e) => e.code, 'code', code)),
        );
      });
    }

    test('proxy 429 -> rate-limit', () async {
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-ant-test');
      final svc = service(
        MockClient((req) async => http.Response('{}', 429)),
        store: store,
      );

      await expectLater(
        svc.chat(
          providerId: 'anthropic',
          keyId: 'rec-1',
          systemPrompt: 's',
          messages: providerChat,
          model: 'claude-sonnet-4-6',
          onDelta: (_) {},
        ),
        throwsA(isA<ByokChatException>()
            .having((e) => e.code, 'code', 'rate-limit')),
      );
    });

    test('proxy 410 -> gone', () async {
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-ant-test');
      final svc = service(
        MockClient((req) async => http.Response('{}', 410)),
        store: store,
      );

      await expectLater(
        svc.chat(
          providerId: 'anthropic',
          keyId: 'rec-1',
          systemPrompt: 's',
          messages: providerChat,
          model: 'claude-sonnet-4-6',
          onDelta: (_) {},
        ),
        throwsA(isA<ByokChatException>()
            .having((e) => e.code, 'code', 'gone')),
      );
    });

    test('proxy 500 -> provider-down', () async {
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-ant-test');
      final svc = service(
        MockClient((req) async => http.Response('{}', 500)),
        store: store,
      );

      await expectLater(
        svc.chat(
          providerId: 'anthropic',
          keyId: 'rec-1',
          systemPrompt: 's',
          messages: providerChat,
          model: 'claude-sonnet-4-6',
          onDelta: (_) {},
        ),
        throwsA(isA<ByokChatException>()
            .having((e) => e.code, 'code', 'provider-down')),
      );
    });

    test('proxy 500 diagnostics redact secrets without throwing', () async {
      // Regression: _logProxyFailure -> _redactSecrets must not throw (an
      // invalid inline `(?i)` RegExp previously surfaced as FormatException
      // instead of ByokChatException).
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-ant-test');
      final svc = service(
        MockClient((req) async => http.Response(
              '{"error":"boom","authorization":"Bearer sk-leak-123456"}',
              500,
            )),
        store: store,
      );

      await expectLater(
        svc.chat(
          providerId: 'anthropic',
          keyId: 'rec-1',
          systemPrompt: 's',
          messages: providerChat,
          model: 'claude-sonnet-4-6',
          onDelta: (_) {},
        ),
        throwsA(isA<ByokChatException>()),
      );
    });

    test('silent stall without stop -> timeout', () async {
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-ant-test');
      final svc = service(StallingClient(), store: store);

      await expectLater(
        svc.chat(
          providerId: 'anthropic',
          keyId: 'rec-1',
          systemPrompt: 's',
          messages: providerChat,
          model: 'claude-sonnet-4-6',
          onDelta: (_) {},
          stallTimeout: const Duration(milliseconds: 50),
        ),
        throwsA(isA<ByokChatException>()
            .having((e) => e.code, 'code', 'timeout')),
      );
    });

    test('stop swallows a racing timeout (T5.3)', () async {
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-ant-test');
      final svc = service(StallingClient(), store: store);

      var stopped = false;
      Timer(const Duration(milliseconds: 10), () => stopped = true);

      await expectLater(
        svc.chat(
          providerId: 'anthropic',
          keyId: 'rec-1',
          systemPrompt: 's',
          messages: providerChat,
          model: 'claude-sonnet-4-6',
          onDelta: (_) {},
          isStopped: () => stopped,
          stallTimeout: const Duration(milliseconds: 200),
        ),
        completes,
      );
    });
  });

  group('clientDirect path', () {
    test('POSTs raw JSON to Ollama chat/completions with no auth header', () async {
      late http.Request captured;
      final client = MockClient((req) async {
        captured = req;
        return http.Response(_openaiSse(['Hi']), 200);
      });
      // No key stored, no session token — clientDirect needs neither.
      final svc = service(client, token: () async => null);

      final out = <String>[];
      await svc.chat(
        providerId: 'ollama',
        keyId: 'n/a',
        systemPrompt: 's',
        messages: providerChat,
        model: 'llama3.1',
        onDelta: out.add,
      );

      expect(out, ['Hi']);
      expect(captured.method, 'POST');
      expect(captured.url.toString(),
          'http://localhost:11434/v1/chat/completions');
      expect(captured.headers.containsKey('authorization'), isFalse);
      expect(captured.headers.containsKey('x-api-key'), isFalse);

      final body = jsonDecode(captured.body) as Map<String, dynamic>;
      expect(body['model'], 'llama3.1');
      expect(body['stream'], isTrue);
      expect(body['messages'], isNotEmpty);
      expect(body.containsKey('env'), isFalse);
      expect(body.containsKey('payload'), isFalse);
    });

    test('clientDirect non-200 -> ollama-cors', () async {
      final svc = service(
        MockClient((req) async => http.Response('{}', 502)),
        token: () async => null,
      );

      await expectLater(
        svc.chat(
          providerId: 'ollama',
          keyId: 'n/a',
          systemPrompt: 's',
          messages: providerChat,
          model: 'llama3.1',
          onDelta: (_) {},
        ),
        throwsA(isA<ByokChatException>()
            .having((e) => e.code, 'code', 'ollama-cors')),
      );
    });
  });

  group('agent path', () {
    // Response shapes follow `lib/agent/events.ts` (verified 2026-10-23 against
    // the route contract in `__tests__/api/byok-agent.test.ts`).
    String agentSse(List<Map<String, dynamic>> events) => events
        .map((e) => 'data: ${jsonEncode(e)}\n\n')
        .join();

    /// SSE bodies carry Arabic text, so they must be UTF-8 bytes — a plain
    /// `http.Response(String)` defaults to latin1 and throws on non-ASCII.
    http.Response agentResponse(List<Map<String, dynamic>> events) =>
        http.Response.bytes(
          utf8.encode(agentSse(events)),
          200,
          headers: {'content-type': 'text/event-stream; charset=utf-8'},
        );

    test('POSTs envelope + Bearer JWT to /api/byok/agent and streams events',
        () async {
      late http.Request captured;
      final client = MockClient((req) async {
        captured = req;
        return agentResponse([
          {'type': 'trace', 'tool': 'get_budget', 'status': 'running'},
          {'type': 'delta', 'text': 'ميزانيتك '},
          {'type': 'delta', 'text': 'جيدة'},
          {'type': 'trace', 'tool': 'get_budget', 'status': 'done'},
          {'type': 'tool_result', 'tool': 'get_budget', 'ok': true},
          {'type': 'done'},
        ]);
      });
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-ant-test');
      final svc = service(client, store: store);

      final events = <AgentEvent>[];
      await svc.chatAgent(
        providerId: 'anthropic',
        keyId: 'rec-1',
        systemPrompt: 'You are Fajrak.',
        messages: providerChat,
        model: 'claude-sonnet-4-6',
        onEvent: events.add,
      );

      expect(events.map((e) => e.type).toList(), [
        'trace',
        'delta',
        'delta',
        'trace',
        'tool_result',
        'done',
      ]);
      expect(events[1].text, 'ميزانيتك ');
      expect(captured.method, 'POST');
      expect(captured.url.toString(), '$testProxyBase/api/byok/agent');
      expect(captured.headers['authorization'], 'Bearer test-jwt');
      expect(captured.headers['accept'], 'text/event-stream');
      expect(captured.headers.containsKey('x-api-key'), isFalse);

      final body = jsonDecode(captured.body) as Map<String, dynamic>;
      expect(body['providerId'], 'anthropic');
      expect(body['keyId'], testKekId);
      expect(body['env'], isNotEmpty);
      expect(body['payload'], isNotEmpty);
      expect(body['model'], 'claude-sonnet-4-6');
      expect(body['systemPrompt'], 'You are Fajrak.');
      expect(body['messages'], [
        {'role': 'user', 'content': 'Hello'},
        {'role': 'assistant', 'content': 'Hi there'},
      ]);
      // The agent route builds the provider body server-side.
      expect(body.containsKey('body'), isFalse);
      expect(body.containsKey('stream'), isFalse);
      expect(body.containsKey('confirmation'), isFalse);
    });

    test('confirmation is passed through verbatim', () async {
      late http.Request captured;
      final client = MockClient((req) async {
        captured = req;
        return agentResponse([
          {'type': 'delta', 'text': 'تم'},
          {'type': 'done'},
        ]);
      });
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-openai');
      final svc = service(client, store: store);

      final confirmation = {
        'tool': 'create_transaction',
        'args': {'amount': 120.5, 'category': 'food', 'type': 'expense'},
      };
      final events = <AgentEvent>[];
      await svc.chatAgent(
        providerId: 'openai',
        keyId: 'rec-1',
        messages: providerChat,
        model: 'gpt-5.4-mini',
        confirmation: confirmation,
        onEvent: events.add,
      );

      final body = jsonDecode(captured.body) as Map<String, dynamic>;
      expect(body['confirmation'], confirmation);
      expect(events.map((e) => e.type).toList(), ['delta', 'done']);
    });

    test('confirmation_required surfaces tool + args', () async {
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-openai');
      final svc = service(
        MockClient((req) async => agentResponse([
              {
                'type': 'confirmation_required',
                'tool': 'create_transaction',
                'args': {'amount': 120.5, 'category': 'food'},
              },
              {'type': 'done'},
            ])),
        store: store,
      );

      final events = <AgentEvent>[];
      await svc.chatAgent(
        providerId: 'openai',
        keyId: 'rec-1',
        messages: providerChat,
        onEvent: events.add,
      );

      expect(events.first.type, 'confirmation_required');
      expect(events.first.tool, 'create_transaction');
      expect(events.first.args['amount'], 120.5);
    });

    test('clientDirect provider (ollama) is rejected without any HTTP', () async {
      var calls = 0;
      final svc = service(MockClient((req) async {
        calls++;
        return http.Response('', 200);
      }));

      await expectLater(
        svc.chatAgent(
          providerId: 'ollama',
          messages: providerChat,
          onEvent: (_) {},
        ),
        throwsA(isA<ByokChatException>()
            .having((e) => e.code, 'code', 'generic')),
      );
      expect(calls, 0);
    });

    test('unknown provider is rejected without any HTTP', () async {
      var calls = 0;
      final svc = service(MockClient((req) async {
        calls++;
        return http.Response('', 200);
      }));

      await expectLater(
        svc.chatAgent(
          providerId: 'nope',
          messages: providerChat,
          onEvent: (_) {},
        ),
        throwsA(isA<ByokChatException>()
            .having((e) => e.code, 'code', 'generic')),
      );
      expect(calls, 0);
    });

    test('missing local key throws no-key without any HTTP', () async {
      var calls = 0;
      final svc = service(MockClient((req) async {
        calls++;
        return http.Response('', 200);
      }));

      await expectLater(
        svc.chatAgent(
          providerId: 'openai',
          keyId: 'rec-missing',
          messages: providerChat,
          onEvent: (_) {},
        ),
        throwsA(isA<ByokChatException>()
            .having((e) => e.code, 'code', 'no-key')),
      );
      expect(calls, 0);
    });

    test('null session token throws unauthorized without any HTTP', () async {
      var calls = 0;
      final client = MockClient((req) async {
        calls++;
        return http.Response('', 200);
      });
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-openai');
      final svc = service(client, store: store, token: () async => null);

      await expectLater(
        svc.chatAgent(
          providerId: 'openai',
          keyId: 'rec-1',
          messages: providerChat,
          onEvent: (_) {},
        ),
        throwsA(isA<ByokChatException>()
            .having((e) => e.code, 'code', 'unauthorized')),
      );
      expect(calls, 0);
    });

    for (final (status, code) in [
      (401, 'unauthorized'),
      (404, 'model-not-found'),
      (410, 'gone'),
      (429, 'rate-limit'),
      (500, 'provider-down'),
    ]) {
      test('agent $status -> $code', () async {
        final store = InMemorySecureStore();
        await ByokVault(store).saveProviderKey('rec-1', 'sk-openai');
        final svc = service(
          MockClient((req) async => http.Response('{}', status)),
          store: store,
        );

        await expectLater(
          svc.chatAgent(
            providerId: 'openai',
            keyId: 'rec-1',
            messages: providerChat,
            onEvent: (_) {},
          ),
          throwsA(
              isA<ByokChatException>().having((e) => e.code, 'code', code)),
        );
      });
    }

    test('silent stall without stop -> timeout', () async {
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-openai');
      final svc = service(StallingClient(), store: store);

      await expectLater(
        svc.chatAgent(
          providerId: 'openai',
          keyId: 'rec-1',
          messages: providerChat,
          onEvent: (_) {},
          stallTimeout: const Duration(milliseconds: 50),
        ),
        throwsA(isA<ByokChatException>()
            .having((e) => e.code, 'code', 'timeout')),
      );
    });

    test('stop swallows a racing timeout', () async {
      final store = InMemorySecureStore();
      await ByokVault(store).saveProviderKey('rec-1', 'sk-openai');
      final svc = service(StallingClient(), store: store);

      var stopped = false;
      Timer(const Duration(milliseconds: 10), () => stopped = true);

      await expectLater(
        svc.chatAgent(
          providerId: 'openai',
          keyId: 'rec-1',
          messages: providerChat,
          onEvent: (_) {},
          isStopped: () => stopped,
          stallTimeout: const Duration(milliseconds: 200),
        ),
        completes,
      );
    });
  });
}