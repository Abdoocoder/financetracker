import 'package:flutter/services.dart';

/// Why a BYOK provider key could not be saved.
///
/// The BYOK "Add Key" flow previously funnelled every failure through
/// `ErrorHandler.handle`, which shows a single generic "Something went wrong"
/// message. That hid the real cause (CORS, unavailable secure storage, expired
/// session, RLS, ...) and left the user with no solution path. These categories
/// map failures onto an actionable message instead.
enum ByokSaveFailure {
  /// Server / network unreachable, or blocked by CORS.
  network,

  /// Platform secure storage unavailable (e.g. web without a secure context).
  secureStore,

  /// Missing or rejected session (401/403, RLS denial).
  auth,

  /// Supabase/PostgREST rejected the metadata row.
  database,

  /// Anything not recognised — still surfaced with a sanitised detail.
  unknown,
}

/// A save failure with an actionable category and a redacted diagnostic detail.
class ByokSaveException implements Exception {
  const ByokSaveException(this.kind, this.detail);

  final ByokSaveFailure kind;

  /// Sanitised diagnostic text. Never contains the provider API key.
  final String detail;

  @override
  String toString() => 'ByokSaveException(${kind.name}): $detail';
}

/// Patterns that look like a provider secret and must never reach a SnackBar,
/// a log line, or analytics.
final List<RegExp> _secretPatterns = <RegExp>[
  RegExp(r'nvapi-[A-Za-z0-9_\-]{4,}'),
  RegExp(r'sk-[A-Za-z0-9_\-]{8,}'),
  RegExp(r'[A-Za-z0-9_\-]{40,}'),
];

const int _maxDetailLength = 200;

/// Masks anything that resembles an API key and truncates long text.
///
/// Guards the invariant required by AD-3: the raw BYOK key never leaves the
/// device vault, not even inside an error message.
String redactSecrets(String input) {
  var out = input;
  for (final pattern in _secretPatterns) {
    out = out.replaceAllMapped(pattern, (match) {
      final token = match.group(0)!;
      final keep = token.length > 4 ? 4 : token.length;
      return '${token.substring(0, keep)}***';
    });
  }
  if (out.length > _maxDetailLength) {
    out = '${out.substring(0, _maxDetailLength)}…';
  }
  return out;
}

bool _hasAny(String haystack, List<String> needles) {
  for (final n in needles) {
    if (haystack.contains(n)) return true;
  }
  return false;
}

/// Classifies an arbitrary error thrown while saving a BYOK key.
///
/// Web-safe: matches on message text and Flutter's [MissingPluginException]
/// rather than importing `dart:io`, so it compiles for `flutter build web`.
ByokSaveException classifyByokSaveError(Object error) {
  final raw = error.toString();
  final msg = raw.toLowerCase();
  final detail = redactSecrets(raw);

  if (error is MissingPluginException ||
      _hasAny(msg, const [
        'missingpluginexception',
        'no implementation found for method',
        'webcrypto',
        'subtlecrypto',
        'crypto.subtle',
        'secure context',
        'flutter_secure_storage',
        'is not supported on this platform',
        'unimplementederror',
      ])) {
    return ByokSaveException(ByokSaveFailure.secureStore, detail);
  }

  if (_hasAny(msg, const [
    'socketexception',
    'failed host lookup',
    'no address associated',
    'network is unreachable',
    'connection refused',
    'connection closed',
    'connection terminated',
    'clientexception',
    'handshakeexception',
    'xmlhttprequest',
    'failed to fetch',
    'access-control-allow-origin',
    'cors',
    'cross-origin',
    'timeout',
    'timed out',
  ])) {
    return ByokSaveException(ByokSaveFailure.network, detail);
  }

  if (_hasAny(msg, const [
    '42501',
    '401',
    '403',
    'jwt',
    'rbac',
    'row-level security',
    'row level security',
    'permission denied',
    'not authenticated',
    'invalid login credentials',
    'no active session',
  ])) {
    return ByokSaveException(ByokSaveFailure.auth, detail);
  }

  if (_hasAny(msg, const [
    'posterror',
    'posgrestexception',
    'postgrestexception',
    'duplicate key',
    '23505',
    '42p01',
    '42703',
    'pgrst',
    'violates row-level security',
  ])) {
    return ByokSaveException(ByokSaveFailure.database, detail);
  }

  return ByokSaveException(ByokSaveFailure.unknown, detail);
}