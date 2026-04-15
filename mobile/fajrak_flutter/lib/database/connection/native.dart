import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

QueryExecutor buildDatabaseConnection(String encryptionKey) {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'fajrak_offline.db'));

    return NativeDatabase.createInBackground(
      file,
      setup: (rawDb) {
        rawDb.execute("PRAGMA key = '${encryptionKey.replaceAll("'", "''")}'");
        rawDb.execute('PRAGMA cipher_page_size = 4096');
        rawDb.execute('PRAGMA kdf_iter = 64000');
        rawDb.execute('PRAGMA cipher_hmac_algorithm = HMAC_SHA1');
        rawDb.execute('PRAGMA cipher_kdf_algorithm = PBKDF2_HMAC_SHA1');
      },
    );
  });
}
