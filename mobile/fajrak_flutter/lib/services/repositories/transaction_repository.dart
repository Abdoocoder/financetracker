import 'dart:convert';

import 'package:drift/drift.dart';

import '../../database/app_database.dart';

class TransactionRepository {
  final AppDatabase _db;

  TransactionRepository(this._db);

  Future<void> enqueueCreate({
    required String entityId,
    required Map<String, dynamic> payload,
  }) async {
    final pendingDeletes = await (_db.select(_db.syncQueueTable)
          ..where((t) => t.entityId.equals(entityId))
          ..where((t) => t.operationType.equals('delete')))
        .get();

    if (pendingDeletes.isNotEmpty) {
      for (final del in pendingDeletes) {
        await (_db.delete(_db.syncQueueTable)..where((t) => t.id.equals(del.id)))
            .go();
      }
    }

    await _enqueueOperation(
      entityId: entityId,
      operationType: 'create',
      payload: payload,
    );
  }

  Future<void> enqueueUpdate({
    required String entityId,
    required Map<String, dynamic> payload,
  }) async {
    await _enqueueOperation(
      entityId: entityId,
      operationType: 'update',
      payload: payload,
    );
  }

  Future<void> enqueueDelete({
    required String entityId,
    Map<String, dynamic>? payload,
  }) async {
    final pendingCreates = await (_db.select(_db.syncQueueTable)
          ..where((t) => t.entityId.equals(entityId))
          ..where((t) => t.operationType.equals('create')))
        .get();

    if (pendingCreates.isNotEmpty) {
      for (final create in pendingCreates) {
        await (_db.delete(_db.syncQueueTable)..where((t) => t.id.equals(create.id)))
            .go();
      }
      return;
    }

    await _enqueueOperation(
      entityId: entityId,
      operationType: 'delete',
      payload: payload ?? {},
    );
  }

  Future<void> _enqueueOperation({
    required String entityId,
    required String operationType,
    required Map<String, dynamic> payload,
  }) async {
    final existing = await (_db.select(_db.syncQueueTable)
          ..where((t) => t.entityId.equals(entityId))
          ..where((t) => t.operationType.equals(operationType)))
        .get();

    if (existing.isNotEmpty) {
      final merged = _mergePayload(
        jsonDecode(existing.first.payload) as Map<String, dynamic>,
        payload,
      );

      await (_db.update(_db.syncQueueTable)
            ..where((t) => t.id.equals(existing.first.id)))
          .write(SyncQueueTableCompanion(
        payload: Value(jsonEncode(merged)),
        attemptCount: const Value(0),
        lastError: const Value(null),
        lastAttemptAt: const Value(null),
      ));
    } else {
      await _db.into(_db.syncQueueTable).insert(SyncQueueTableCompanion.insert(
        entityId: entityId,
        operationType: operationType,
        entityType: 'transaction',
        payload: jsonEncode(payload),
        createdAt: DateTime.now(),
        attemptCount: const Value(0),
        isProcessing: const Value(false),
      ));
    }
  }

  Map<String, dynamic> _mergePayload(
    Map<String, dynamic> existing,
    Map<String, dynamic> update,
  ) {
    final merged = Map<String, dynamic>.from(existing);
    for (final entry in update.entries) {
      if (entry.value is Map && merged[entry.key] is Map) {
        merged[entry.key] = _mergePayload(
          merged[entry.key] as Map<String, dynamic>,
          entry.value as Map<String, dynamic>,
        );
      } else {
        merged[entry.key] = entry.value;
      }
    }
    return merged;
  }

  Future<List<SyncQueueTableData>> getPendingOperations() async {
    return (_db.select(_db.syncQueueTable)
          ..where((t) => t.isProcessing.equals(false))
          ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
        .get();
  }

  Future<void> markProcessing(int id) async {
    await (_db.update(_db.syncQueueTable)..where((t) => t.id.equals(id)))
        .write(SyncQueueTableCompanion(
      isProcessing: const Value(true),
      lastAttemptAt: Value(DateTime.now()),
    ));
  }

  Future<void> markCompleted(int id) async {
    await (_db.delete(_db.syncQueueTable)..where((t) => t.id.equals(id))).go();
  }

  Future<void> markFailed(int id, String error, int currentAttemptCount) async {
    await (_db.update(_db.syncQueueTable)..where((t) => t.id.equals(id)))
        .write(SyncQueueTableCompanion(
      isProcessing: const Value(false),
      lastError: Value(error),
      attemptCount: Value(currentAttemptCount + 1),
    ));
  }

  Future<List<SyncQueueTableData>> getOrderedOperations() async {
    final operations = await (_db.select(_db.syncQueueTable)
          ..where((t) => t.isProcessing.equals(false))
          ..orderBy([
            (t) => OrderingTerm.asc(t.operationType),
            (t) => OrderingTerm.asc(t.createdAt),
          ]))
        .get();

    const order = {'create': 0, 'update': 1, 'delete': 2};
    operations.sort((a, b) {
      final aOrder = order[a.operationType] ?? 3;
      final bOrder = order[b.operationType] ?? 3;
      return aOrder.compareTo(bOrder);
    });

    return operations;
  }

  Duration getBackoffDuration(int attemptCount) {
    final baseDelay = Duration(seconds: 1);
    final maxDelay = Duration(minutes: 5);
    final delay = baseDelay * (1 << attemptCount.clamp(0, 5));
    return delay > maxDelay ? maxDelay : delay;
  }
}