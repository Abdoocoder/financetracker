import 'dart:convert';

import 'package:fajrak/services/byok/envelope.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// Fails the test if any HTTP request is attempted. Used to prove the
/// compile-time layer short-circuits before the network is ever touched.
class ThrowingClient extends http.BaseClient {
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    fail('HTTP must not be called when compile-time config is present');
  }
}

const _kekId = 'XF2-TEST-KEK';
const _publicKeyPem = '-----BEGIN PUBLIC KEY-----\n'
    'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEATESTKEYFORRESOLVERTESTS\n'
    '-----END PUBLIC KEY-----\n';
const _base = 'https://fajrak.example';

/// JSON body served by a healthy `GET /api/byok/config`.
String _configBody({String keyId = 'XF2-LIVE'}) =>
    jsonEncode({'keyId': keyId, 'publicKey': _publicKeyPem});

void main() {
  // The resolver caches statically for the life of the process; reset before
  // and after every test so cases never leak into one another.
  setUp(ByokConfigResolver.resetSessionCache);
  tearDown(ByokConfigResolver.resetSessionCache);

  group('compile-time config', () {
    // `String.fromEnvironment` is a compile-time constant and cannot be
    // overridden at runtime, so the constants `_compileTimeKekId` /
    // `_compileTimePublicKey` used by production are effectively fixed in a
    // test build (both empty). Otherwise we could not exercise this layer.
    //
    // `ByokConfigResolver` already exposes the compile-time values as
    // constructor parameters (`compileTimeKekId` / `compileTimePublicKey`)
    // that default to those constants — i.e. the "expose a seam" option was
    // designed in from the start, so no production change is required and the
    // precedence logic is fully covered.
    test('returns compile-time values and performs no HTTP', () async {
      final resolver = ByokConfigResolver(
        httpClient: ThrowingClient(),
        proxyBaseUrl: _base,
        compileTimeKekId: _kekId,
        compileTimePublicKey: _publicKeyPem,
      );

      final config = await resolver.resolve();

      expect(config.keyId, _kekId);
      expect(config.publicKeyPem, _publicKeyPem);
    });
  });

  group('HTTP /api/byok/config fallback', () {
    test('fetches the config once and parses keyId + publicKey', () async {
      var calls = 0;
      late Uri requested;
      final client = MockClient((req) async {
        calls++;
        requested = req.url;
        return http.Response(
          _configBody(),
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      final resolver = ByokConfigResolver(
        httpClient: client,
        proxyBaseUrl: _base,
      );

      final config = await resolver.resolve();

      expect(config.keyId, 'XF2-LIVE');
      expect(config.publicKeyPem, _publicKeyPem);
      expect(calls, 1);
      expect(requested.path, '/api/byok/config');
      expect(requested.origin, 'https://fajrak.example');
    });

    test('a second resolve() is served from cache (no new HTTP call)', () async {
      var calls = 0;
      final client = MockClient((req) async {
        calls++;
        return http.Response(_configBody(), 200);
      });
      final resolver = ByokConfigResolver(
        httpClient: client,
        proxyBaseUrl: _base,
      );

      final first = await resolver.resolve();
      final second = await resolver.resolve();

      expect(calls, 1);
      expect(identical(first, second), isTrue);
    });

    test('resetSessionCache() forces a fresh HTTP call', () async {
      var calls = 0;
      http.Client newClient() => MockClient((req) async {
            calls++;
            return http.Response(_configBody(), 200);
          });

      await ByokConfigResolver(
        httpClient: newClient(),
        proxyBaseUrl: _base,
      ).resolve();
      ByokConfigResolver.resetSessionCache();
      await ByokConfigResolver(
        httpClient: newClient(),
        proxyBaseUrl: _base,
      ).resolve();

      expect(calls, 2);
    });

    test('retries exactly once on a 500 then throws ByokConfigException',
        () async {
      var calls = 0;
      final client = MockClient((req) async {
        calls++;
        return http.Response('server error', 500);
      });
      final resolver = ByokConfigResolver(
        httpClient: client,
        proxyBaseUrl: _base,
        retryDelay: const Duration(milliseconds: 1),
      );

      await expectLater(
        resolver.resolve(),
        throwsA(isA<ByokConfigException>()),
      );
      expect(calls, 2);
    });

    test('does not retry on a 404 and throws ByokConfigException', () async {
      var calls = 0;
      final client = MockClient((req) async {
        calls++;
        return http.Response('not found', 404);
      });
      final resolver = ByokConfigResolver(
        httpClient: client,
        proxyBaseUrl: _base,
        retryDelay: const Duration(milliseconds: 1),
      );

      await expectLater(
        resolver.resolve(),
        throwsA(isA<ByokConfigException>()),
      );
      expect(calls, 1);
    });

    test('retries once on a network error then throws ByokConfigException',
        () async {
      var calls = 0;
      final client = MockClient((req) async {
        calls++;
        throw http.ClientException('connection refused');
      });
      final resolver = ByokConfigResolver(
        httpClient: client,
        proxyBaseUrl: _base,
        retryDelay: const Duration(milliseconds: 1),
      );

      await expectLater(
        resolver.resolve(),
        throwsA(isA<ByokConfigException>()),
      );
      expect(calls, 2);
    });
  });

  group('all sources missing', () {
    test('compile-time empty + 404 + dotenv uninitialized -> ByokConfigException',
        () async {
      // This test isolate never calls dotenv.load(), so the default env reader
      // hits NotInitializedError internally and reports "missing".
      var calls = 0;
      final client = MockClient((req) async {
        calls++;
        return http.Response('not found', 404);
      });
      final resolver = ByokConfigResolver(
        httpClient: client,
        proxyBaseUrl: _base,
        retryDelay: const Duration(milliseconds: 1),
      );

      await expectLater(
        resolver.resolve(),
        throwsA(isA<ByokConfigException>()),
      );
      expect(calls, 1);
    });
  });
}
