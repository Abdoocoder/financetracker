// Native platform database connection (Android, iOS, Linux, macOS, Windows)
import 'package:supabase_flutter/supabase_flutter.dart';

class NativeDatabaseConnection {
  static SupabaseClient get client => Supabase.instance.client;
}