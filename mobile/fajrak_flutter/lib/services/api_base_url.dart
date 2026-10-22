import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Origin of the Next.js app that serves the `/api/*` route handlers.
///
/// Resolution order:
/// 1. `--dart-define=API_BASE_URL=…` — the only channel that reaches a running
///    build. `make run-web-with-proxy` points it at `dev_proxy.dart` so the
///    browser never needs production CORS.
/// 2. `dotenv.env['API_BASE_URL']` — kept for parity with
///    `byok_service.dart`'s `defaultProxyBaseUrl()`. Inert in this app today:
///    `.env` is not a declared asset (pubspec.yaml) and `dotenv.load()` is
///    never called, so the read throws [NotInitializedError].
/// 3. `https://fajrak.com` — production.
const String _compiledApiBaseUrl = String.fromEnvironment('API_BASE_URL');
const String _fallbackApiBaseUrl = 'https://fajrak.com';

String defaultApiBaseUrl() {
  if (_compiledApiBaseUrl.isNotEmpty) {
    return _trimTrailingSlashes(_compiledApiBaseUrl);
  }
  try {
    final configured = dotenv.env['API_BASE_URL'];
    if (configured != null && configured.trim().isNotEmpty) {
      return _trimTrailingSlashes(configured.trim());
    }
  } on NotInitializedError {
    // dotenv not loaded (no `.env` asset) — fall through to production.
  }
  return _fallbackApiBaseUrl;
}

String _trimTrailingSlashes(String url) {
  var out = url;
  while (out.endsWith('/')) {
    out = out.substring(0, out.length - 1);
  }
  return out;
}
