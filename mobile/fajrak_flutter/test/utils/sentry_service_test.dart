import 'package:flutter_test/flutter_test.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'package:fajrak/services/sentry_service.dart';

// Tests for the Sentry wrapper: graceful skip without a DSN and PII
// scrubbing in beforeSend (CLAUDE.md Critical Rule #12).
void main() {
  group('SentryService.init graceful skip', () {
    test('shouldEnable is false for empty or whitespace DSN', () {
      expect(SentryService.shouldEnable(''), isFalse);
      expect(SentryService.shouldEnable('   '), isFalse);
    });

    test('shouldEnable is true for a real DSN', () {
      expect(
        SentryService.shouldEnable('https://key@o0.ingest.sentry.io/1'),
        isTrue,
      );
    });

    test('init without a DSN still starts the app (dev never crashes)', () async {
      // `flutter test` runs with no SENTRY_DSN dart-define, matching a
      // dev `flutter run` without defines.
      expect(SentryService.isEnabled, isFalse);
      var appStarted = false;
      await SentryService.init(appRunner: () => appStarted = true);
      expect(appStarted, isTrue);
    });
  });

  group('SentryService.beforeSend PII scrubbing', () {
    SentryEvent eventWith({
      SentryUser? user,
      SentryRequest? request,
      List<Breadcrumb>? breadcrumbs,
    }) =>
        SentryEvent(
          user: user,
          request: request,
          breadcrumbs: breadcrumbs,
        );

    test('drops the whole event when an Authorization header is present', () {
      final event = eventWith(
        request: SentryRequest(
          url: 'https://api.example.com/rpc/sync',
          headers: {'Authorization': 'Bearer secret-jwt'},
        ),
      );
      expect(SentryService.beforeSend(event, null), isNull);
    });

    test('Authorization header match is case-insensitive', () {
      final event = eventWith(
        request: SentryRequest(headers: {'authorization': 'Bearer x'}),
      );
      expect(SentryService.beforeSend(event, null), isNull);
    });

    test('strips user email and IP but keeps id for grouping', () {
      final event = eventWith(
        user: SentryUser(
          id: 'uuid-1',
          email: 'user@example.com',
          ipAddress: '203.0.113.7',
        ),
      );
      final result = SentryService.beforeSend(event, null);
      expect(result, isNotNull);
      expect(result!.user?.id, 'uuid-1');
      expect(result.user?.email, isNull);
      expect(result.user?.ipAddress, isNull);
    });

    test('redacts password and anon_key fields in request data', () {
      final event = eventWith(
        request: SentryRequest(
          url: 'https://api.example.com/auth/v1/token',
          data: '{"password":"hunter2","anon_key":"eyJhbGciOi","note":"ok"}',
        ),
      );
      final result = SentryService.beforeSend(event, null);
      expect(result, isNotNull);
      expect(result!.request?.data, '[redacted]');
    });

    test('removes sensitive header values but keeps the event', () {
      final event = eventWith(
        request: SentryRequest(
          url: 'https://api.example.com/rest/v1/tx',
          headers: {'apikey': 'anon-key-value', 'content-type': 'application/json'},
        ),
      );
      final result = SentryService.beforeSend(event, null);
      expect(result, isNotNull);
      expect(result!.request?.headers.containsKey('apikey'), isFalse);
      expect(result.request?.headers['content-type'], 'application/json');
    });

    test('redacts email addresses in breadcrumb messages and data', () {
      final event = eventWith(
        breadcrumbs: [
          Breadcrumb(
            category: 'http',
            message: 'request failed for user a@b.com',
            data: {'contact': 'x@y.io', 'status': 404},
          ),
        ],
      );
      final result = SentryService.beforeSend(event, null);
      expect(result, isNotNull);
      final crumb = result!.breadcrumbs!.single;
      expect(crumb.message, isNot(contains('a@b.com')));
      expect(crumb.message, contains('[redacted-email]'));
      expect(crumb.data?['contact'], '[redacted-email]');
      expect(crumb.data?['status'], 404);
    });

    test('clean events pass through unchanged', () {
      final event = eventWith(
        user: SentryUser(id: 'u1'),
        breadcrumbs: [
          Breadcrumb(category: 'navigation', message: 'to /dashboard'),
        ],
      );
      final result = SentryService.beforeSend(event, null);
      expect(result, isNotNull);
      expect(result!.user?.id, 'u1');
      expect(result.breadcrumbs!.single.message, 'to /dashboard');
    });
  });

  group('SentryService.captureReport', () {
    test('is a no-op outside release mode (debug sends nothing)', () {
      // flutter test runs in debug mode: kReleaseMode is false, so the
      // call must return without touching the Sentry hub.
      expect(
        () => SentryService.captureReport(
          Exception('handled error'),
          stackTrace: StackTrace.current,
          screen: '/dashboard',
        ),
        returnsNormally,
      );
    });
  });
}
