// Unsupported platform database connection
import 'package:supabase_flutter/supabase_flutter.dart';

class UnsupportedDatabaseConnection {
  static SupabaseClient get client {
    throw UnsupportedError('Database not supported on this platform');
  }
}