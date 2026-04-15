import 'package:drift/drift.dart';

QueryExecutor buildDatabaseConnection(String encryptionKey) {
  throw UnsupportedError(
    'Offline database is not supported on this platform. '
    'Use a mobile or desktop build.',
  );
}
