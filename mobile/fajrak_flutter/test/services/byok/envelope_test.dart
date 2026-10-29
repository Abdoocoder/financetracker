import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:fajrak/services/byok/envelope.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:webcrypto/webcrypto.dart';

import 'fixtures/byok_test_keys.dart';

Uint8List hexToBytes(String hex) => Uint8List.fromList([
      for (var i = 0; i < hex.length; i += 2)
        int.parse(hex.substring(i, i + 2), radix: 16),
    ]);

// === Fixture A (AES-GCM determinism) — captured from web WebCrypto ===
const fixtureAKeyHex = '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
const fixtureAIvHex = '101112131415161718191a1b';
const fixtureAPlaintext = 'sk-test-123-provider-key';
const fixtureAPayload = 'EBESExQVFhcYGRobwYCXbO4IaIh6Yqy2Fri5HOTufOv6VJCgG2+NjZGdjFQ8ZoX2qQK+Ow==';

// === Fixture B (RSA-AES interop) — captured from web WebCrypto ===
const fixtureBKeyHex = 'a0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebf';
const fixtureBPlaintext = 'sk-ant-cross-audit-key';
const fixtureBEnv = 'HHDOHjkG9xM4P4nkdXDB8Udo5AOBE6uSxJkfq/poVrxi4bkBRZ8rf1wvT7fecT6esVQUFM89AHbR8FloAyuepXfITRB0XgU1MXvjhLr5T2ONAOAYoKK2GekRIeFOY/JbyPSNd1MpD5j/f+3hFAbDbh0y96yoBzWEdMgUYgMM4Ws24LNOTNRPzNicK81lFusWQNdIP4VLFYdMUh5W6A+bUAEFTHjMkR3M5DOGXZmhnBVymAAhXK3xc3NpzfRx1TJyZJYDfn81F9A6eXV9h2B0kN4u1s1BEUsislM5UyCrCU6ACg/YvpfRmvVgFBdV64PwoPp8n057L2SkbbusY/KkNw==';
const fixtureBPayload2 = 'ICEiIyQlJicoKSorb7H54K8Ct7nZ+fPkH6O+6RSM8Lamd3UNe4V8vl2MV6Ugb4sWwf8=';
void main() {
  final fixtureAKey = hexToBytes(fixtureAKeyHex);
  final fixtureAIv = hexToBytes(fixtureAIvHex);
  final fixtureBKey = hexToBytes(fixtureBKeyHex);

  group('buildEnvelope — Fixture A (deterministic AES-GCM)', () {
    test('payload is byte-identical to the captured WebCrypto fixture', () async {
      final envelope = await buildEnvelope(
        fixtureAPlaintext,
        keyId: 'test-kek-v1',
        publicKeyPem: fixtureBPublicPem,
        fixedKey: fixtureAKey,
        fixedIv: fixtureAIv,
      );

      expect(envelope.keyId, 'test-kek-v1');
      expect(envelope.payload, fixtureAPayload);
    });

    test('payload begins with the 12-byte IV, then ciphertext', () async {
      final envelope = await buildEnvelope(
        fixtureAPlaintext,
        keyId: 'test-kek-v1',
        publicKeyPem: fixtureBPublicPem,
        fixedKey: fixtureAKey,
        fixedIv: fixtureAIv,
      );

      final bytes = base64Decode(envelope.payload);
      expect(bytes.sublist(0, 12), fixtureAIv);
    });

    test('env is RSA-2048 OAEP: 256 bytes that decrypt to the fixed key', () async {
      final envelope = await buildEnvelope(
        fixtureAPlaintext,
        keyId: 'test-kek-v1',
        publicKeyPem: fixtureBPublicPem,
        fixedKey: fixtureAKey,
        fixedIv: fixtureAIv,
      );

      final envBytes = base64Decode(envelope.env);
      expect(envBytes, hasLength(256));

      final privateKey =
          await RsaOaepPrivateKey.importPkcs8Key(pemToDer(fixtureBPrivatePem), Hash.sha256);
      final recovered = await privateKey.decryptBytes(envBytes);
      expect(recovered, orderedEquals(fixtureAKey));
    });
  });

  group('buildEnvelope — RSA-OAEP interop with a generated keypair', () {
    test('env decrypts with the generated private key; payload stays deterministic', () async {
      final pair = await RsaOaepPrivateKey.generateKey(2048, BigInt.from(65537), Hash.sha256);
      final spki = await pair.publicKey.exportSpkiKey();
      final publicPem = '-----BEGIN PUBLIC KEY-----\n${base64Encode(spki)}\n-----END PUBLIC KEY-----\n';

      final envelope = await buildEnvelope(
        fixtureAPlaintext,
        keyId: 'test-kek-v1',
        publicKeyPem: publicPem,
        fixedKey: fixtureAKey,
        fixedIv: fixtureAIv,
      );

      expect(envelope.payload, fixtureAPayload,
          reason: 'AES-GCM must not depend on the RSA key');
      final recovered = await pair.privateKey.decryptBytes(base64Decode(envelope.env));
      expect(recovered, orderedEquals(fixtureAKey));
    });

    test('env is randomized across calls; payload is not', () async {
      final pair = await RsaOaepPrivateKey.generateKey(2048, BigInt.from(65537), Hash.sha256);
      final spki = await pair.publicKey.exportSpkiKey();
      final publicPem = '-----BEGIN PUBLIC KEY-----\n${base64Encode(spki)}\n-----END PUBLIC KEY-----\n';

      final first = await buildEnvelope(
        fixtureAPlaintext,
        keyId: 'test-kek-v1',
        publicKeyPem: publicPem,
        fixedKey: fixtureAKey,
        fixedIv: fixtureAIv,
      );
      final second = await buildEnvelope(
        fixtureAPlaintext,
        keyId: 'test-kek-v1',
        publicKeyPem: publicPem,
        fixedKey: fixtureAKey,
        fixedIv: fixtureAIv,
      );

      expect(first.env, isNot(second.env), reason: 'RSA-OAEP must be randomized');
      expect(first.payload, second.payload);
    });
  });

  group('pemToDer + Fixture B cross-decrypt (web WebCrypto interop)', () {
    test('pemToDer strips PEM armor to the raw SPKI DER bytes', () {
      expect(pemToDer(fixtureBPublicPem), orderedEquals(base64Decode(fixtureBSpki)));
    });

    test('env decrypts to the captured 32-byte AES key', () async {
      final privateKey =
          await RsaOaepPrivateKey.importPkcs8Key(pemToDer(fixtureBPrivatePem), Hash.sha256);
      final keyBytes = await privateKey.decryptBytes(base64Decode(fixtureBEnv));

      expect(keyBytes, orderedEquals(fixtureBKey));
    });

    test('payload2 decrypts with the recovered key to the captured plaintext', () async {
      final privateKey =
          await RsaOaepPrivateKey.importPkcs8Key(pemToDer(fixtureBPrivatePem), Hash.sha256);
      final keyBytes = await privateKey.decryptBytes(base64Decode(fixtureBEnv));

      final data = base64Decode(fixtureBPayload2);
      final iv = data.sublist(0, 12);
      final sealed = data.sublist(12);

      final aesKey = await AesGcmSecretKey.importRawKey(keyBytes);
      final plaintext = await aesKey.decryptBytes(sealed, iv);

      expect(utf8.decode(plaintext), fixtureBPlaintext);
    });
  });

  group('browser_envelope.json — decrypt a real browser-generated envelope', () {
    test('recovers the ephemeral key and provider key end-to-end', () async {
      final jsonFile = File('test/services/byok/fixtures/browser_envelope.json');
      final fixture = jsonDecode(jsonFile.readAsStringSync()) as Map<String, dynamic>;

      final privateKey = await RsaOaepPrivateKey.importPkcs8Key(
        pemToDer(fixture['privateKeyPem'] as String),
        Hash.sha256,
      );
      final keyBytes = await privateKey.decryptBytes(base64Decode(fixture['env'] as String));

      expect(keyBytes, orderedEquals(base64Decode(fixture['ephemKeyB64'] as String)));

      final data = base64Decode(fixture['payload'] as String);
      final iv = data.sublist(0, 12);
      expect(iv, orderedEquals(base64Decode(fixture['ivB64'] as String)));

      final aesKey = await AesGcmSecretKey.importRawKey(keyBytes);
      final plaintext = await aesKey.decryptBytes(data.sublist(12), iv);

      expect(utf8.decode(plaintext), fixture['providerKey']);
    });
  });

  group('buildEnvelope — missing config', () {
    test('throws StateError when keyId is absent and BYOK_KEK_ID is unset', () {
      expectLater(
        buildEnvelope('sk-x', publicKeyPem: fixtureBPublicPem),
        throwsA(isA<ByokConfigException>()),
      );
    });

    test('throws StateError when publicKeyPem is absent and BYOK_PUBLIC_KEY is unset', () {
      expectLater(
        buildEnvelope('sk-x', keyId: 'test-kek-v1'),
        throwsA(isA<ByokConfigException>()),
      );
    });

    test('throws StateError when both are absent', () {
      expectLater(buildEnvelope('sk-x'), throwsA(isA<ByokConfigException>()));
    });
  });
}