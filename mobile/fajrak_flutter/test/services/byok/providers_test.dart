import 'package:fajrak/services/byok/providers.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('SUPPORTED_PROVIDERS', () {
    test('has the full web provider list (openai, anthropic, nvidia-nim, openrouter, gemini, ollama)', () {
      expect(
        SUPPORTED_PROVIDERS.keys.toSet(),
        {'openai', 'anthropic', 'nvidia-nim', 'openrouter', 'gemini', 'ollama'},
      );
    });

    test('every entry has a fixed non-empty baseUrl', () {
      for (final entry in SUPPORTED_PROVIDERS.entries) {
        expect(entry.value.baseUrl, isNotEmpty, reason: '${entry.key} baseUrl must be fixed');
      }
    });

    test('exactly one clientDirect provider: ollama', () {
      final clientDirect =
          SUPPORTED_PROVIDERS.values.where((p) => p.kind == 'clientDirect').toList();
      expect(clientDirect, hasLength(1));
      expect(clientDirect.single.id, 'ollama');
    });

    test('proxy providers match the web proxy list', () {
      final proxyIds = SUPPORTED_PROVIDERS.values
          .where((p) => p.kind == 'proxy')
          .map((p) => p.id)
          .toSet();
      expect(proxyIds, {'openai', 'anthropic', 'nvidia-nim', 'openrouter', 'gemini'});
    });

    test('mirror of auth kinds and authHeaderNames', () {
      final cases = {
        'openai': (ByokAuth.bearer, 'authorization'),
        'anthropic': (ByokAuth.xApiKey, 'x-api-key'),
        'nvidia-nim': (ByokAuth.bearer, 'authorization'),
        'openrouter': (ByokAuth.bearer, 'authorization'),
        'gemini': (ByokAuth.xGoogApiKey, 'x-goog-api-key'),
        'ollama': (ByokAuth.none, ''),
      };
      for (final entry in cases.entries) {
        final p = SUPPORTED_PROVIDERS[entry.key];
        expect(p, isNotNull, reason: '${entry.key} must be registered');
        expect(p!.auth, entry.value.$1, reason: '${entry.key} auth kind');
        expect(p.authHeaderName, entry.value.$2, reason: '${entry.key} authHeaderName');
      }
    });

    test('anthropic carries the required version header', () {
      final anthropic = SUPPORTED_PROVIDERS['anthropic'];
      expect(anthropic?.defaultHeaders, {'anthropic-version': '2023-06-01'});
    });

    test('proxy providers send no extra headers except anthropic version header', () {
      for (final p in SUPPORTED_PROVIDERS.values) {
        if (p.kind == 'proxy' && p.id != 'anthropic') {
          expect(p.defaultHeaders, isEmpty, reason: '${p.id} should not send extra headers');
        }
      }
    });
  });

  group('getProvider', () {
    test('returns the registered provider for "openai"', () {
      final p = getProvider('openai');
      expect(p, isNotNull);
      expect(p!.kind, 'proxy');
    });

    test('returns null for an unknown id', () {
      expect(getProvider('unknown'), isNull);
    });
  });
}