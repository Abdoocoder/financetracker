import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:webcrypto/webcrypto.dart';

/// BYOK wire-format envelope (AD-4).
///
/// `payload` is `base64([12-byte IV][AES-256-GCM ciphertext||tag])` of the
/// provider key; `env` is `base64(RSA-OAEP-SHA256(ephemeral 256-bit AES key))`
/// encrypted to the BYOK public key with no label. Compatible with the web
/// implementation in `lib/byok/client.ts`.
typedef Envelope = ({String env, String payload, String keyId});

/// Build a BYOK [Envelope] for [providerKey].
///
/// The ephemeral AES key and IV are random per call unless supplied via
/// [fixedKey]/[fixedIv] (test-only). [keyId] falls back to `BYOK_KEK_ID` and
/// [publicKeyPem] to `BYOK_PUBLIC_KEY` from the environment; throws
/// [ByokConfigException] when either is missing.
Future<Envelope> buildEnvelope(
  String providerKey, {
  String? keyId,
  String? publicKeyPem,
  @visibleForTesting List<int>? fixedIv,
  @visibleForTesting List<int>? fixedKey,
}) async {
  final resolvedKeyId = keyId ?? _envValue('BYOK_KEK_ID');
  final resolvedPublicKeyPem = publicKeyPem ?? _envValue('BYOK_PUBLIC_KEY');

  if (resolvedKeyId == null || resolvedKeyId.isEmpty) {
    throw const ByokConfigException('BYOK KEK ID is not configured');
  }
  if (resolvedPublicKeyPem == null || resolvedPublicKeyPem.isEmpty) {
    throw const ByokConfigException('BYOK public key is not configured');
  }

  final iv = fixedIv != null ? Uint8List.fromList(fixedIv) : _randomBytes(12);
  final rawKey = fixedKey != null ? Uint8List.fromList(fixedKey) : _randomBytes(32);

  var encodedKey = Uint8List(0);
  var ciphertext = Uint8List(0);
  try {
    final publicKey =
        await RsaOaepPublicKey.importSpkiKey(pemToDer(resolvedPublicKeyPem), Hash.sha256);
    final envBytes = await publicKey.encryptBytes(rawKey);

    encodedKey = Uint8List.fromList(utf8.encode(providerKey));
    final aesKey = await AesGcmSecretKey.importRawKey(rawKey);
    ciphertext = await aesKey.encryptBytes(encodedKey, iv);

    return (
      env: base64Encode(envBytes),
      payload: base64Encode([...iv, ...ciphertext]),
      keyId: resolvedKeyId,
    );
  } finally {
    iv.fillRange(0, iv.length, 0);
    rawKey.fillRange(0, rawKey.length, 0);
    encodedKey.fillRange(0, encodedKey.length, 0);
    ciphertext.fillRange(0, ciphertext.length, 0);
  }
}

/// Strip PEM armor (BEGIN/END labels and whitespace) returning raw DER bytes.
Uint8List pemToDer(String pem) =>
    base64Decode(pem.replaceAll(RegExp(r'-----(?:BEGIN|END) [A-Z0-9 ]+-----|\s'), ''));

/// Resolved BYOK envelope configuration: the server KEK id and its RSA
/// (SPKI PEM) public key. Both are public values served by `GET
/// /api/byok/config`.
class ByokEnvelopeConfig {
  const ByokEnvelopeConfig({required this.keyId, required this.publicKeyPem});

  final String keyId;
  final String publicKeyPem;
}

/// Raised when no BYOK envelope config source is available (compile-time
/// `--dart-define`, `/api/byok/config`, or dotenv). Callers can surface a
/// specific "configuration missing" message instead of a generic failure.
class ByokConfigException implements Exception {
  const ByokConfigException(this.reason);

  /// Short, redaction-safe label — never contains key material.
  final String reason;

  @override
  String toString() => 'ByokConfigException($reason)';
}

/// Compile-time BYOK config, populated only when the build supplies
/// `--dart-define=BYOK_KEK_ID=... --dart-define=BYOK_PUBLIC_KEY=...`.
const String _compileTimeKekId = String.fromEnvironment('BYOK_KEK_ID');
const String _compileTimePublicKey = String.fromEnvironment('BYOK_PUBLIC_KEY');

/// Resolve the BYOK [ByokEnvelopeConfig] with a layered priority:
///
/// 1. compile-time `--dart-define` values (cheapest, safest; empty unless the
///    build opts in);
/// 2. `GET {proxyBaseUrl}/api/byok/config` — public, no session required —
///    cached for the life of the app and retried once on transient failure;
/// 3. `dotenv` values (local-dev fallback only).
///
/// Throws [ByokConfigException] when none of the three yields both a key id
/// and a public key.
class ByokConfigResolver {
  ByokConfigResolver({
    http.Client? httpClient,
    this.proxyBaseUrl,
    this.compileTimeKekId = _compileTimeKekId,
    this.compileTimePublicKey = _compileTimePublicKey,
    String? Function(String)? envReader,
    this.fetchTimeout = const Duration(seconds: 10),
    this.retryDelay = const Duration(seconds: 2),
  })  : _http = httpClient ?? http.Client(),
        _envReader = envReader ?? _envValue;

  /// Process-wide cache: the config is stable across an app launch.
  static ByokEnvelopeConfig? _sessionCache;

  final http.Client _http;
  final String? Function(String) _envReader;

  /// Base URL of the app proxy hosting `/api/byok/config`. When null/empty the
  /// remote layer is skipped.
  final String? proxyBaseUrl;

  /// Compile-time overrides (default to the `--dart-define` constants).
  final String compileTimeKekId;
  final String compileTimePublicKey;

  final Duration fetchTimeout;
  final Duration retryDelay;

  /// Drop the cached config (test-only).
  @visibleForTesting
  static void resetSessionCache() => _sessionCache = null;

  Future<ByokEnvelopeConfig> resolve() async {
    final cached = _sessionCache;
    if (cached != null) return cached;

    if (compileTimeKekId.isNotEmpty && compileTimePublicKey.isNotEmpty) {
      return _sessionCache = ByokEnvelopeConfig(
        keyId: compileTimeKekId,
        publicKeyPem: compileTimePublicKey,
      );
    }

    final remote = await _fetchRemote();
    if (remote != null) return _sessionCache = remote;

    final envKekId = _envReader('BYOK_KEK_ID');
    final envPublicKey = _envReader('BYOK_PUBLIC_KEY');
    if (envKekId != null &&
        envKekId.isNotEmpty &&
        envPublicKey != null &&
        envPublicKey.isNotEmpty) {
      return _sessionCache = ByokEnvelopeConfig(
        keyId: envKekId,
        publicKeyPem: envPublicKey,
      );
    }

    throw const ByokConfigException('no-config-source');
  }

  /// Fetch `/api/byok/config` with one retry on transient failure (network
  /// error, timeout, or 5xx). 4xx responses are permanent — no retry.
  Future<ByokEnvelopeConfig?> _fetchRemote() async {
    final base = proxyBaseUrl?.replaceAll(RegExp(r'/+$'), '');
    if (base == null || base.isEmpty) return null;
    final uri = Uri.parse('$base/api/byok/config');

    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        final res = await _http.get(uri).timeout(fetchTimeout);
        if (res.statusCode == 200) return _parseConfig(res.body);
        // 4xx is permanent — do not retry; 5xx falls through to the retry.
        if (res.statusCode >= 400 && res.statusCode < 500) return null;
      } catch (_) {
        // Network / timeout — transient; fall through to the single retry.
      }
      if (attempt == 0) await Future<void>.delayed(retryDelay);
    }
    return null;
  }

  ByokEnvelopeConfig? _parseConfig(String body) {
    try {
      final data = jsonDecode(body);
      if (data is! Map<String, dynamic>) return null;
      final keyId = data['keyId'];
      final publicKey = data['publicKey'];
      if (keyId is String &&
          keyId.isNotEmpty &&
          publicKey is String &&
          publicKey.isNotEmpty) {
        return ByokEnvelopeConfig(keyId: keyId, publicKeyPem: publicKey);
      }
    } catch (_) {
      // Malformed body — treat as unavailable and fall through.
    }
    return null;
  }
}

/// Read [key] from the environment, treating an uninitialized [dotenv] as
/// missing config so callers see a clear [ByokConfigException] instead.
String? _envValue(String key) {
  try {
    return dotenv.env[key];
  } on NotInitializedError {
    return null;
  }
}

Uint8List _randomBytes(int length) {
  final random = Random.secure();
  return Uint8List.fromList(
    List<int>.generate(length, (_) => random.nextInt(256)),
  );
}