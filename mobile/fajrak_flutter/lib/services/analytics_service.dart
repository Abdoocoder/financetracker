import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:developer' as dev;

class AnalyticsService {
  static final SupabaseClient _client = Supabase.instance.client;

  /// Logs a custom event to the `app_events` table in Supabase.
  static Future<void> logEvent(String name, [Map<String, dynamic>? properties]) async {
    final user = _client.auth.currentUser;
    if (user == null) return;

    try {
      await _client.from('app_events').insert({
        'user_id': user.id,
        'event_name': name,
        'properties': properties ?? {},
        'created_at': DateTime.now().toIso8601String(),
      });
      dev.log('Analytics Event: $name', name: 'Analytics');
    } catch (e) {
      dev.log('Error logging analytics event: $e', name: 'Analytics', error: e);
    }
  }

  /// Specialized method for screen tracking.
  static Future<void> logScreenView(String screenName) async {
    await logEvent('screen_view', {'screen_name': screenName});
  }

  /// Specialized method for tracking errors.
  static Future<void> logError(String errorType, String message, [Map<String, dynamic>? extra]) async {
    await logEvent('app_error', {
      'type': errorType,
      'message': message,
      ...?extra,
    });
  }
}
