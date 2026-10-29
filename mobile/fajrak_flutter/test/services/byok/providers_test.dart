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

  group('nvidia-nim catalogue', () {
    // Live evidence 2026-10-29: GET https://integrate.api.nvidia.com/v1/models
    // no longer lists the three previous entries, and calling
    // meta/llama-3.1-8b-instruct returns HTTP 410 (end of life 2026-08-26).
    const liveSlugs = [
      'nvidia/nemotron-3-super-120b-a12b',
      'nvidia/nemotron-3-ultra-550b-a55b',
      'nvidia/nemotron-3.5-lightning-30b-a3b',
      'nvidia/nemotron-3.5-bolt-e4b',
      'nvidia/nemotron-nano-3-30b-a3b',
      'openai/gpt-oss-20b',
      'deepseek-ai/deepseek-v4.1-flash',
      'moonshotai/kimi-k2.6',
      'z-ai/glm-5.3-flash',
      'mistralai/mistral-large',
      'nvidia/llama-3.1-nemotron-70b-instruct',
      'google/gemma-4-31b-it',
    ];
    const retiredSlugs = [
      'meta/llama-3.1-8b-instruct',
      'meta/llama-3.1-70b-instruct',
      'mistralai/mixtral-8x7b-instruct-v0.1',
    ];

    test('offers the live catalogue and no retired models', () {
      final nvidia = SUPPORTED_PROVIDERS['nvidia-nim']!;
      expect(nvidia.availableModels, liveSlugs);
      for (final retired in retiredSlugs) {
        expect(nvidia.availableModels, isNot(contains(retired)));
      }
    });

    test('defaults to a model it offers', () {
      final nvidia = SUPPORTED_PROVIDERS['nvidia-nim']!;
      expect(nvidia.defaultModel, 'nvidia/nemotron-3-ultra-550b-a55b');
      expect(nvidia.availableModels, contains(nvidia.defaultModel));
    });

    test('has no duplicate models', () {
      final nvidia = SUPPORTED_PROVIDERS['nvidia-nim']!;
      expect(
        nvidia.availableModels.toSet().length,
        nvidia.availableModels.length,
      );
    });

    test('claims no free models it cannot verify', () {
      expect(SUPPORTED_PROVIDERS['nvidia-nim']!.freeModels, isEmpty);
    });

    test('matches the web catalogue slugs', () {
      // Mirrored by hand from lib/byok/providers.ts — both clients switch models
      // through the same proxy, so drift means one client calls a dead slug.
      expect(SUPPORTED_PROVIDERS['nvidia-nim']!.availableModels, liveSlugs);
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