import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

/// Sentry crash reporting — PII-safe wrapper (CLAUDE.md Critical Rule #12).
///
/// - [init] is skipped entirely when no `SENTRY_DSN` dart-define is present,
///   so a dev `flutter run` without defines never crashes and never sends.
/// - [beforeSend] drops events carrying Authorization/Cookie headers and
///   strips the user's email/IP plus password/anon_key-style fields from
///   request bodies, headers, and breadcrumbs.
/// - [captureReport] is the single entry point for handled errors
///   (ErrorHandler). It only fires in release mode; uncaught errors are
///   captured once by the SentryFlutter.init error handlers, so nothing is
///   reported twice.
class SentryService {
  SentryService._();

  /// Injected at build time by the Makefile (`--dart-define=SENTRY_DSN=…`,
  /// read from `.env`). Empty in dev runs without defines.
  static const String dsn = String.fromEnvironment('SENTRY_DSN');

  /// Fallback release tag when PackageInfo cannot be read in time.
  /// Keep in sync with `pubspec.yaml` version.
  static const String _fallbackRelease = 'com.fajrak.app@3.45.0+64';

  static bool get isEnabled => shouldEnable(dsn);

  @visibleForTesting
  static bool shouldEnable(String value) => value.trim().isNotEmpty;

  /// Request header keys whose presence drops the whole event.
  static const List<String> _dropEventHeaderKeys = ['authorization', 'cookie'];

  /// Key fragments whose values are redacted wherever they appear
  /// (header names, body fields, breadcrumb data keys).
  static const List<String> _sensitiveKeyFragments = [
    'password',
    'passwd',
    'anon_key',
    'anonkey',
    'apikey',
    'api_key',
    'authorization',
    'access_token',
    'refresh_token',
    'secret',
  ];

  static final RegExp _emailPattern = RegExp(r'[\w.+-]+@[\w-]+\.[\w.-]+');

  static String _redactEmails(String input) =>
      input.replaceAll(_emailPattern, '[redacted-email]');

  static bool _isSensitiveKey(String key) {
    final lower = key.toLowerCase();
    return _sensitiveKeyFragments.any(lower.contains);
  }

  static Map<String, dynamic>? _scrubMap(Map<String, dynamic>? data) {
    if (data == null) return null;
    return data.map((key, value) {
      if (_isSensitiveKey(key)) return MapEntry(key, '[redacted]');
      if (value is String) return MapEntry(key, _redactEmails(value));
      return MapEntry(key, value);
    });
  }

  /// Boots the app, initializing Sentry first when a DSN is present so
  /// init-time crashes (Firebase/Supabase) are captured too. Without a
  /// DSN the app boots normally and nothing is ever sent.
  static Future<void> init({
    required FutureOr<void> Function() appRunner,
  }) async {
    if (!isEnabled) {
      await appRunner();
      return;
    }
    final release = await _resolveRelease();
    await SentryFlutter.init(
      (options) {
        options.dsn = dsn;
        options.release = release;
        options.environment = kReleaseMode ? 'production' : 'development';
        options.tracesSampleRate = kReleaseMode ? 0.1 : 1.0;
        options.attachStacktrace = true;
        // Never let the SDK attach a default IP or other PII automatically.
        options.sendDefaultPii = false;
        options.beforeSend = beforeSend;
      },
      appRunner: () => appRunner(),
    );
  }

  /// Release tag `com.fajrak.app@<version>+<build>` read from the platform
  /// (pubspec) with a bounded wait and a hardcoded fallback.
  static Future<String> _resolveRelease() async {
    try {
      final info =
          await PackageInfo.fromPlatform().timeout(const Duration(seconds: 3));
      return 'com.fajrak.app@${info.version}+${info.buildNumber}';
    } catch (_) {
      return _fallbackRelease;
    }
  }

  /// PII scrubber wired as `options.beforeSend`. Runs after the scope is
  /// merged, so it sees every breadcrumb. Returns null to drop the event.
  @visibleForTesting
  static SentryEvent? beforeSend(SentryEvent event, Hint? hint) {
    // Drop expected BYOK chat cancellations/noise
    final exceptions = event.exceptions;
    if (exceptions != null) {
      for (final value in exceptions) {
        final type = value.type?.toLowerCase() ?? '';
        final message = value.value?.toLowerCase() ?? '';
        if (type.contains('byokchat') && message.contains('gone')) {
          return null;
        }
        if (message.contains('byokchat') && message.contains('(gone)')) {
          return null;
        }
        if (message.contains('stream closed')) {
          return null;
        }
      }
    }
    final throwable = event.throwable;
    if (throwable != null) {
      final type = throwable.runtimeType.toString().toLowerCase();
      final message = throwable.toString().toLowerCase();
      if (type.contains('byokchat') && message.contains('gone')) {
        return null;
      }
      if (message.contains('byokchat') && message.contains('(gone)')) {
        return null;
      }
      if (message.contains('stream closed')) {
        return null;
      }
    }

    // Auth material in request headers → drop the entire event.
    final headers = event.request?.headers;
    if (headers != null) {
      for (final key in headers.keys) {
        if (_dropEventHeaderKeys.contains(key.toLowerCase())) return null;
      }
    }

    // Keep only the opaque user id for crash grouping; strip email, IP,
    // username, name, and avatar.
    final user =
        event.user == null ? null : SentryUser(id: event.user!.id);

    // Scrub the request: sensitive headers removed, body redacted.
    SentryRequest? request = event.request;
    if (request != null) {
      final scrubbedHeaders = Map<String, String>.from(request.headers)
        ..removeWhere((key, _) => _isSensitiveKey(key));
      dynamic data = request.data;
      if (data is String && data.isNotEmpty) {
        final lower = data.toLowerCase();
        data = _sensitiveKeyFragments.any(lower.contains)
            ? '[redacted]'
            : _redactEmails(data);
      } else if (data is Map) {
        data = _scrubMap(data.cast<String, dynamic>());
      }
      // In sentry 10.x, SentryRequest doesn't have copyWith; create new instance
      request = SentryRequest(
        url: request.url,
        method: request.method,
        queryString: request.queryString,
        cookies: request.cookies,
        fragment: request.fragment,
        apiTarget: request.apiTarget,
        data: data,
        headers: scrubbedHeaders,
        env: request.env,
        unknown: request.unknown,
      );
    }

    // Scrub breadcrumbs (rebuilt, never mutated in place — scope instances
    // are shared across events).
    List<Breadcrumb>? breadcrumbs = event.breadcrumbs;
    if (breadcrumbs != null && breadcrumbs.isNotEmpty) {
      breadcrumbs = breadcrumbs
          .map((b) => Breadcrumb(
                timestamp: b.timestamp,
                category: b.category,
                type: b.type,
                message: b.message == null ? null : _redactEmails(b.message!),
                data: _scrubMap(b.data),
                level: b.level,
              ))
          .toList();
    }

    // In sentry 10.x, SentryEvent doesn't have copyWith; create new instance
    return SentryEvent(
      eventId: event.eventId,
      timestamp: event.timestamp,
      modules: event.modules,
      tags: event.tags,
      extra: event.extra,
      fingerprint: event.fingerprint,
      breadcrumbs: breadcrumbs,
      exceptions: event.exceptions,
      threads: event.threads,
      sdk: event.sdk,
      platform: event.platform,
      logger: event.logger,
      serverName: event.serverName,
      release: event.release,
      dist: event.dist,
      environment: event.environment,
      message: event.message,
      transaction: event.transaction,
      throwable: event.throwableMechanism,
      level: event.level,
      culprit: event.culprit,
      user: user,
      contexts: event.contexts,
      request: request,
      debugMeta: event.debugMeta,
      type: event.type,
      unknown: event.unknown,
    );
  }

  /// Reports a handled error (from ErrorHandler). Debug builds are skipped
  /// entirely to avoid noise; release builds with no DSN are a no-op too.
  static void captureReport(
    Object? error, {
    StackTrace? stackTrace,
    String? screen,
  }) {
    if (!kReleaseMode || !isEnabled) return;
    if (screen != null) {
      Sentry.addBreadcrumb(Breadcrumb(
        category: 'handler',
        message: 'screen: $screen',
        level: SentryLevel.info,
      ));
    }
    Sentry.captureException(error, stackTrace: stackTrace);
  }
}
