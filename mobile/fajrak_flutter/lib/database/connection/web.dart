// Web-specific database connection using Drift with IndexedDB
// TODO: Migrate to package:drift/wasm.dart (requires sqlite3.wasm + worker setup)
// See: https://drift.simonbinder.eu/web/#drift-wasm
// ignore: deprecated_member_use
import 'package:drift/drift.dart';
// ignore: deprecated_member_use
import 'package:drift/web.dart';

QueryExecutor buildDatabaseConnection(String encryptionKey) {
  // On web, we use WebDatabase with IndexedDB storage
  // The encryptionKey is ignored on web platform (no browser encryption support)
  // ignore: experimental_member_use
  final storage = DriftWebStorage.indexedDb('fajrak_offline_db');
  return WebDatabase.withStorage(
    storage,
    logStatements: false,
    readIntsAsBigInt: true,
  );
}