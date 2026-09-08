import 'package:fajrak/services/llm_service.dart';

/// Device-local BYOK provider key vault (AD-3: Zero-Server Storage).
///
/// Keys live only in the platform secure store (Keychain / Android Keystore)
/// and never leave the device. The [SecureStore] is injectable so tests can
/// substitute an in-memory implementation without touching the keystore.
class ByokVault {
  ByokVault([SecureStore? store]) : _store = store ?? SecureKeyStore();

  static const String _keyPrefix = 'byok_key_';

  final SecureStore _store;

  /// Persist a raw provider API key under [keyId] (provider id / record id).
  Future<void> saveProviderKey(String keyId, String raw) =>
      _store.write(key: '$_keyPrefix$keyId', value: raw);

  /// Read a saved provider key, or null when none is stored.
  Future<String?> getProviderKey(String keyId) =>
      _store.read(key: '$_keyPrefix$keyId');

  /// Delete a stored provider key (no-op when absent).
  Future<void> deleteProviderKey(String keyId) =>
      _store.delete(key: '$_keyPrefix$keyId');

  /// Whether a provider key is currently stored for [keyId].
  Future<bool> hasProviderKey(String keyId) async =>
      (await getProviderKey(keyId)) != null;
}