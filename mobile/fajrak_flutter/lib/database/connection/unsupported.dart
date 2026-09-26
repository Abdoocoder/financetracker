// Unsupported platform database connection (fallback)
import 'package:drift/drift.dart';

QueryExecutor buildDatabaseConnection(String encryptionKey) {
  throw UnsupportedError('Database not supported on this platform');
}