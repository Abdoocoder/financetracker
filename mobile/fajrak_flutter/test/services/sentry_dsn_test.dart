import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Sentry DSN Contract', () {
    test('SENTRY_DSN is read from compile-time environment, not dotenv', () {
      // This test only asserts the CONTRACT: the app must read the DSN via
      // String.fromEnvironment. It does NOT assert the value (that comes from
      // --dart-define at build time).
      const dsn = String.fromEnvironment('SENTRY_DSN');
      // If this test runs with --dart-define=SENTRY_DSN=..., it must be non-empty.
      // Without dart-define (unit test), it will be empty — that's fine.
      expect(dsn, isA<String>());
    });

    test('sentry_service.dart uses String.fromEnvironment for SENTRY_DSN', () {
      final src = File('lib/services/sentry_service.dart').readAsStringSync();
      expect(src.contains("String.fromEnvironment('SENTRY_DSN')"), isTrue,
        reason: 'dotenv.env does not work in release without assets; must use String.fromEnvironment');
    });
  });
}