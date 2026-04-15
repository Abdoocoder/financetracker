import 'package:drift/drift.dart';
import 'package:drift/wasm.dart';

/// Web uses an in-memory WASM database — no persistence, no encryption.
/// Offline-first features are disabled on web; Supabase is used directly.
QueryExecutor buildDatabaseConnection(String encryptionKey) {
  return DatabaseConnection.delayed(Future(() async {
    final result = await WasmDatabase.open(
      databaseName: 'fajrak_offline',
      sqlite3Uri: Uri.parse('sqlite3.wasm'),
      driftWorkerUri: Uri.parse('drift_worker.dart.js'),
    );
    return result.resolvedExecutor;
  }));
}
