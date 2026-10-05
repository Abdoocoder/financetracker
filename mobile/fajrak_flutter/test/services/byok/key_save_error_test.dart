import 'package:fajrak/services/byok/key_save_error.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('redactSecrets', () {
    test('masks nvidia keys', () {
      expect(
        redactSecrets('failed with nvapi-abcdef0123456789abcdef'),
        isNot(contains('abcdef0123456789')),
      );
    });

    test('masks sk- style keys', () {
      expect(
        redactSecrets('bad key sk-proj-AAAABBBBCCCCDDDDEEEE'),
        isNot(contains('AAAABBBBCCCCDDDDEEEE')),
      );
    });

    test('masks long opaque tokens', () {
      expect(
        redactSecrets('token abcdefghij0123456789abcdefghij0123456789xyz'),
        isNot(contains('abcdefghij0123456789abcdefghij0123456789')),
      );
    });

    test('leaves short benign text untouched', () {
      expect(redactSecrets('relation "user_byok_keys" does not exist'),
          'relation "user_byok_keys" does not exist');
    });

    test('truncates very long details', () {
      expect(redactSecrets('x' * 500).length, lessThan(220));
    });
  });

  group('classifyByokSaveError', () {
    test('missing plugin maps to secureStore', () {
      final e = classifyByokSaveError(
        MissingPluginException(
          'No implementation found for method write on channel plugins.flutter.io/flutter_secure_storage',
        ),
      );
      expect(e.kind, ByokSaveFailure.secureStore);
    });

    test('webcrypto secure-context failure maps to secureStore', () {
      final e = classifyByokSaveError(
        StateError('Operation failed: crypto.subtle is unavailable in a secure context'),
      );
      expect(e.kind, ByokSaveFailure.secureStore);
    });

    test('socket failure maps to network', () {
      final e = classifyByokSaveError(
        const SocketFailure('Failed host lookup: \'test.supabase.co\''),
      );
      expect(e.kind, ByokSaveFailure.network);
    });

    test('CORS rejection maps to network', () {
      final e = classifyByokSaveError(
        StateError(
            'Access-Control-Allow-Origin missing in response — CORS blocked'),
      );
      expect(e.kind, ByokSaveFailure.network);
    });

    test('RLS denial maps to auth', () {
      final e = classifyByokSaveError(
        StateError(
            'new row violates row-level security policy for table "user_byok_keys" (code 42501)'),
      );
      expect(e.kind, ByokSaveFailure.auth);
    });

    test('missing relation maps to database', () {
      final e = classifyByokSaveError(
        StateError('PostgrestException: relation "user_byok_keys" does not exist'),
      );
      expect(e.kind, ByokSaveFailure.database);
    });

    test('unknown errors stay unknown but keep a sanitised detail', () {
      final e = classifyByokSaveError(
        StateError('totally unexpected with nvapi-abcdef0123456789'),
      );
      expect(e.kind, ByokSaveFailure.unknown);
      expect(e.detail, isNot(contains('abcdef0123456789')));
      expect(e.detail, contains('***'));
    });
  });
}

/// Minimal stand-in for `SocketException` that only carries a message, so the
/// suite stays `dart:io`-free (compiles for web) while still exercising the
/// message-based network branch.
class SocketFailure implements Exception {
  const SocketFailure(this.message);
  final String message;
  @override
  String toString() => 'SocketException: $message';
}