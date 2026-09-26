// Unified database connection for all platforms
import 'package:supabase_flutter/supabase_flutter.dart';
import 'native.dart'
    if (dart.library.html) 'web.dart'
    if (dart.library.io) 'unsupported.dart';

class AppDatabase {
  static SupabaseClient get client {
    // On web, use the web-specific connection that reads from window.ENV
    // On native, use the Supabase.instance.client initialized in main.dart
    return NativeDatabaseConnection.client;
  }
  
  // Helper to check if we're on web
  static bool get isWeb => identical(0, 0.0);
}