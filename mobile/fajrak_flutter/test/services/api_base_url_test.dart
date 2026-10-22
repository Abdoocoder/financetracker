import 'package:fajrak/services/api_base_url.dart';
import 'package:flutter_test/flutter_test.dart';

/// The override (`--dart-define=API_BASE_URL=…`) is compile-time and therefore
/// only observable in a build that passes it; see `make run-web-with-proxy`.
/// What is testable here is the default: a plain `flutter test` / `make run-web`
/// must never point the app at anything but production.
void main() {
  group('defaultApiBaseUrl', () {
    test('defaults to production when API_BASE_URL is not compiled in', () {
      expect(defaultApiBaseUrl(), 'https://fajrak.com');
    });

    test('returns an origin without a trailing slash', () {
      final url = defaultApiBaseUrl();
      expect(url.endsWith('/'), isFalse,
          reason: 'callers concatenate paths: "$url" + "/api/alerts"');
    });
  });
}
