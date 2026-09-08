import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
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
/// [StateError] when either is missing.
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
    throw StateError('BYOK KEK ID is not configured');
  }
  if (resolvedPublicKeyPem == null || resolvedPublicKeyPem.isEmpty) {
    throw StateError('BYOK public key is not configured');
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

/// Read [key] from the environment, treating an uninitialized [dotenv] as
/// missing config so callers see a clear [StateError] instead.
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