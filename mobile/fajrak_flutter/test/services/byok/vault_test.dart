import 'package:fajrak/services/byok/vault.dart';
import 'package:fajrak/services/llm_service.dart';
import 'package:flutter_test/flutter_test.dart';

/// In-memory [SecureStore] so the device keystore isn't needed in tests
/// (mirrors the one in llm_service_test.dart).
class InMemorySecureStore implements SecureStore {
  final Map<String, String> _data = {};

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

void main() {
  group('ByokVault', () {
    late InMemorySecureStore store;
    late ByokVault vault;

    setUp(() {
      store = InMemorySecureStore();
      vault = ByokVault(store);
    });

    test('round-trips a saved provider key', () async {
      await vault.saveProviderKey('openai', 'sk-test-123');
      expect(await vault.getProviderKey('openai'), 'sk-test-123');
    });

    test('hasProviderKey is false before any save and true after', () async {
      expect(await vault.hasProviderKey('anthropic'), isFalse);
      await vault.saveProviderKey('anthropic', 'anthropic-key');
      expect(await vault.hasProviderKey('anthropic'), isTrue);
    });

    test('deleteProviderKey removes the key', () async {
      await vault.saveProviderKey('gemini', 'gemini-key');
      await vault.deleteProviderKey('gemini');
      expect(await vault.hasProviderKey('gemini'), isFalse);
      expect(await vault.getProviderKey('gemini'), isNull);
    });

    test('getProviderKey returns null for an unknown keyId', () async {
      expect(await vault.getProviderKey('ollama'), isNull);
    });

    test('keys are namespaced per provider', () async {
      await vault.saveProviderKey('openai', 'openai-key');
      await vault.saveProviderKey('anthropic', 'anthropic-key');
      expect(await vault.getProviderKey('openai'), 'openai-key');
      expect(await vault.getProviderKey('anthropic'), 'anthropic-key');
      await vault.deleteProviderKey('openai');
      expect(await vault.getProviderKey('openai'), isNull);
      expect(await vault.getProviderKey('anthropic'), 'anthropic-key');
    });

    test('deleting an absent key is a no-op', () async {
      await vault.deleteProviderKey('gemini');
      expect(await vault.hasProviderKey('gemini'), isFalse);
    });

    test('overwrites an existing key on re-save', () async {
      await vault.saveProviderKey('openai', 'old-key');
      await vault.saveProviderKey('openai', 'new-key');
      expect(await vault.getProviderKey('openai'), 'new-key');
    });
  });
}