// Web-specific database connection using Supabase
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:html' as html;
import 'dart:js_util' as js_util;

class WebDatabaseConnection {
  static SupabaseClient? _client;
  
  static SupabaseClient get client {
    if (_client == null) {
      // Read environment variables from window.ENV (set in index.html)
      final env = js_util.getProperty(html.window, 'ENV');
      
      String? url;
      String? anonKey;
      
      if (env != null) {
        url = js_util.getProperty(env, 'SUPABASE_URL') as String?;
        anonKey = js_util.getProperty(env, 'SUPABASE_ANON_KEY') as String?;
      }
      
      // Fallback to dart-define values
      url ??= const String.fromEnvironment('SUPABASE_URL');
      anonKey ??= const String.fromEnvironment('SUPABASE_ANON_KEY');
      
      if (url == null || url.isEmpty || anonKey == null || anonKey.isEmpty) {
        throw StateError('Supabase credentials not configured. '
            'Set SUPABASE_URL and SUPABASE_ANON_KEY via --dart-define or in web/index.html');
      }
      
      _client = SupabaseClient(url, anonKey);
    }
    return _client!;
  }
  
  // Allow re-initialization (useful for testing or config changes)
  static void reset() {
    _client = null;
  }
}