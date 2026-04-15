import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../database/app_database.dart';
import 'repositories/transaction_repository.dart';

enum SyncDirection { pull, push }

enum SyncStatus { idle, syncing, error }

class SyncResult {
  final int pulled;
  final int pushed;
  final int conflicts;
  final String? error;

  SyncResult({
    this.pulled = 0,
    this.pushed = 0,
    this.conflicts = 0,
    this.error,
  });

  bool get isSuccess => error == null;
}

class SyncService {
  static final _supabase = Supabase.instance.client;

  static TransactionRepository? _txRepo;
  static AppDatabase? _localDb;

  static DateTime? _lastSyncTime;
  static SyncStatus _status = SyncStatus.idle;
  static String? _lastError;

  static DateTime? get lastSyncTime => _lastSyncTime;
  static SyncStatus get status => _status;
  static String? get lastError => _lastError;

  static TransactionRepository get txRepo {
    assert(_txRepo != null, 'SyncService.initialize() must be called first');
    return _txRepo!;
  }

  static void initialize(AppDatabase localDb) {
    _localDb = localDb;
    _txRepo = TransactionRepository(localDb);
  }

  static AppDatabase get localDb {
    assert(_localDb != null, 'SyncService.initialize() must be called first');
    return _localDb!;
  }

  static Future<SyncResult> pullWithPagination({
    int pageSize = 1000,
    void Function(int current, int total)? onProgress,
  }) async {
    _status = SyncStatus.syncing;
    _lastError = null;

    int totalPulled = 0;
    int totalConflicts = 0;

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        throw Exception('Not authenticated');
      }

      final tables = ['transactions', 'debts', 'savings_goals', 'budgets'];
      final since = _lastSyncTime ?? DateTime.fromMillisecondsSinceEpoch(0);

      for (final table in tables) {
        int offset = 0;
        bool hasMore = true;

        while (hasMore) {
          final records = await _fetchPage(
            userId: userId,
            table: table,
            since: since,
            pageSize: pageSize,
            offset: offset,
          );

          if (records.isEmpty) {
            hasMore = false;
          } else {
            for (final record in records) {
              final result = await _mergeRecord(table, record);
              if (result == MergeResult.conflict) {
                totalConflicts++;
              }
              totalPulled++;
            }

            offset += pageSize;
            onProgress?.call(totalPulled, -1);

            if (records.length < pageSize) {
              hasMore = false;
            }
          }
        }
      }

      final deletedRecords = await _fetchDeletedRecords(userId, since);
      for (final deleted in deletedRecords) {
        await _applyDelete(deleted['table'], deleted['id']);
      }

      _lastSyncTime = DateTime.now();
      _status = SyncStatus.idle;

      return SyncResult(pulled: totalPulled, conflicts: totalConflicts);
    } catch (e) {
      _status = SyncStatus.error;
      _lastError = e.toString();
      return SyncResult(error: e.toString());
    }
  }

  static Future<List<Map<String, dynamic>>> _fetchPage({
    required String userId,
    required String table,
    required DateTime since,
    required int pageSize,
    required int offset,
  }) async {
    final response = await _supabase.rpc('get_changed_records', params: {
      'p_user_id': userId,
      'p_table_name': table,
      'p_since': since.toIso8601String(),
      'p_page_size': pageSize,
      'p_offset': offset,
    });

    return List<Map<String, dynamic>>.from(response as List);
  }

  static Future<List<Map<String, dynamic>>> _fetchDeletedRecords(
    String userId,
    DateTime since,
  ) async {
    final tables = ['transactions', 'debts', 'savings_goals', 'budgets'];
    final deleted = <Map<String, dynamic>>[];

    for (final table in tables) {
      final response = await _supabase.rpc('get_deleted_records', params: {
        'p_user_id': userId,
        'p_table_name': table,
        'p_since': since.toIso8601String(),
      });

      for (final record in response as List) {
        deleted.add({
          'table': table,
          'id': record['id'],
        });
      }
    }

    return deleted;
  }

  static Future<MergeResult> _mergeRecord(
    String table,
    Map<String, dynamic> remoteRecord,
  ) async {
    final id = remoteRecord['id'] as String;
    final operation = remoteRecord['operation'] as String;
    final data = remoteRecord['data'] as Map<String, dynamic>;

    switch (table) {
      case 'transactions':
        return _mergeTransaction(id, operation, data);
      case 'debts':
        return _mergeDebt(id, operation, data);
      case 'savings_goals':
        return _mergeGoal(id, operation, data);
      case 'budgets':
        return _mergeBudget(id, operation, data);
      default:
        return MergeResult.skip;
    }
  }

  static Future<MergeResult> _mergeTransaction(
    String id,
    String operation,
    Map<String, dynamic> data,
  ) async {
    final local = await (localDb.select(localDb.transactionsTable)
          ..where((t) => t.id.equals(id)))
        .getSingleOrNull();

    if (operation == 'delete') {
      if (local != null) {
        await (localDb.delete(localDb.transactionsTable)
              ..where((t) => t.id.equals(id)))
            .go();
      }
      return MergeResult.success;
    }

    final remoteVersion = (data['local_version'] as int?) ?? 1;
    final localVersion = local?.localVersion ?? 0;

    if (local == null) {
      await localDb.into(localDb.transactionsTable).insert(
        TransactionsTableCompanion.insert(
          id: id,
          userId: data['user_id'] ?? '',
          type: data['type'] ?? 'expense',
          category: data['category'] ?? '',
          amount: (data['amount'] as num).toDouble(),
          description: Value(data['description']),
          transactionDate: DateTime.parse(data['transaction_date']),
          isRecurring: Value(data['is_recurring'] ?? false),
          recurringDay: Value(data['recurring_day']),
          accountId: Value(data['account_id']),
          transferToAccountId: Value(data['transfer_to_account_id']),
          transferPairId: Value(data['transfer_pair_id']),
          sourceRecurringId: Value(data['source_recurring_id']),
          originalAmount: Value(data['original_amount']),
          originalCurrency: Value(data['original_currency']),
          exchangeRate: Value(data['exchange_rate']),
          createdAt: DateTime.parse(data['created_at']),
          syncStatus: const Value('synced'),
          localVersion: Value(remoteVersion),
        ),
      );
      return MergeResult.success;
    }

    if (remoteVersion > localVersion) {
      await (localDb.update(localDb.transactionsTable)
            ..where((t) => t.id.equals(id)))
          .write(TransactionsTableCompanion(
        type: Value(data['type']),
        category: Value(data['category']),
        amount: Value((data['amount'] as num).toDouble()),
        description: Value(data['description']),
        transactionDate: Value(DateTime.parse(data['transaction_date'])),
        isRecurring: Value(data['is_recurring']),
        accountId: Value(data['account_id']),
        syncStatus: const Value('synced'),
        localVersion: Value(remoteVersion),
      ));
      return MergeResult.success;
    }

    return MergeResult.conflict;
  }

  static Future<MergeResult> _mergeDebt(
    String id,
    String operation,
    Map<String, dynamic> data,
  ) async {
    final local = await (localDb.select(localDb.debtsTable)
          ..where((t) => t.id.equals(id)))
        .getSingleOrNull();

    if (operation == 'delete') {
      if (local != null) {
        await (localDb.delete(localDb.debtsTable)
              ..where((t) => t.id.equals(id)))
            .go();
      }
      return MergeResult.success;
    }

    final remoteVersion = (data['local_version'] as int?) ?? 1;
    final localVersion = local?.localVersion ?? 0;

    if (local == null) {
      await localDb.into(localDb.debtsTable).insert(
        DebtsTableCompanion.insert(
          id: id,
          userId: data['user_id'] ?? '',
          name: data['name'] ?? '',
          originalAmount: (data['original_amount'] as num).toDouble(),
          remainingAmount: (data['remaining_amount'] as num).toDouble(),
          monthlyPayment: Value(data['monthly_payment']),
          dueDate: Value(data['due_date'] != null
              ? DateTime.parse(data['due_date'])
              : null),
          priority: Value(data['priority'] ?? 3),
          notes: Value(data['notes']),
          isPaid: Value(data['is_paid'] ?? false),
          originalAmountForeign: Value(data['original_amount_foreign']),
          remainingAmountForeign: Value(data['remaining_amount_foreign']),
          currency: Value(data['currency']),
          createdAt: DateTime.parse(data['created_at']),
          updatedAt: DateTime.parse(data['updated_at'] ?? data['created_at']),
          syncStatus: const Value('synced'),
          localVersion: Value(remoteVersion),
        ),
      );
      return MergeResult.success;
    }

    if (remoteVersion > localVersion) {
      await (localDb.update(localDb.debtsTable)
            ..where((t) => t.id.equals(id)))
          .write(DebtsTableCompanion(
        name: Value(data['name']),
        originalAmount: Value((data['original_amount'] as num).toDouble()),
        remainingAmount: Value((data['remaining_amount'] as num).toDouble()),
        monthlyPayment: Value(data['monthly_payment']),
        dueDate: Value(data['due_date'] != null
            ? DateTime.parse(data['due_date'])
            : null),
        priority: Value(data['priority']),
        notes: Value(data['notes']),
        isPaid: Value(data['is_paid']),
        syncStatus: const Value('synced'),
        localVersion: Value(remoteVersion),
      ));
      return MergeResult.success;
    }

    return MergeResult.conflict;
  }

  static Future<MergeResult> _mergeGoal(
    String id,
    String operation,
    Map<String, dynamic> data,
  ) async {
    final local = await (localDb.select(localDb.savingsGoalsTable)
          ..where((t) => t.id.equals(id)))
        .getSingleOrNull();

    if (operation == 'delete') {
      if (local != null) {
        await (localDb.delete(localDb.savingsGoalsTable)
              ..where((t) => t.id.equals(id)))
            .go();
      }
      return MergeResult.success;
    }

    final remoteVersion = (data['local_version'] as int?) ?? 1;
    final localVersion = local?.localVersion ?? 0;

    if (local == null) {
      await localDb.into(localDb.savingsGoalsTable).insert(
        SavingsGoalsTableCompanion.insert(
          id: id,
          userId: data['user_id'] ?? '',
          name: data['name'] ?? '',
          targetAmount: (data['target_amount'] as num).toDouble(),
          currentAmount: Value((data['current_amount'] as num?)?.toDouble() ?? 0),
          targetDate: Value(data['target_date'] != null
              ? DateTime.parse(data['target_date'])
              : null),
          icon: Value(data['icon'] ?? '🎯'),
          color: Value(data['color'] ?? '#2E75B6'),
          createdAt: DateTime.parse(data['created_at']),
          updatedAt: DateTime.parse(data['updated_at'] ?? data['created_at']),
          syncStatus: const Value('synced'),
          localVersion: Value(remoteVersion),
        ),
      );
      return MergeResult.success;
    }

    if (remoteVersion > localVersion) {
      await (localDb.update(localDb.savingsGoalsTable)
            ..where((t) => t.id.equals(id)))
          .write(SavingsGoalsTableCompanion(
        name: Value(data['name']),
        targetAmount: Value((data['target_amount'] as num).toDouble()),
        currentAmount: Value((data['current_amount'] as num?)?.toDouble() ?? 0),
        targetDate: Value(data['target_date'] != null
            ? DateTime.parse(data['target_date'])
            : null),
        icon: Value(data['icon']),
        color: Value(data['color']),
        syncStatus: const Value('synced'),
        localVersion: Value(remoteVersion),
      ));
      return MergeResult.success;
    }

    return MergeResult.conflict;
  }

  static Future<MergeResult> _mergeBudget(
    String id,
    String operation,
    Map<String, dynamic> data,
  ) async {
    final local = await (localDb.select(localDb.budgetsTable)
          ..where((t) => t.id.equals(id)))
        .getSingleOrNull();

    if (operation == 'delete') {
      if (local != null) {
        await (localDb.delete(localDb.budgetsTable)
              ..where((t) => t.id.equals(id)))
            .go();
      }
      return MergeResult.success;
    }

    final remoteVersion = (data['local_version'] as int?) ?? 1;
    final localVersion = local?.localVersion ?? 0;

    if (local == null) {
      await localDb.into(localDb.budgetsTable).insert(
        BudgetsTableCompanion.insert(
          id: id,
          userId: data['user_id'] ?? '',
          category: data['category'] ?? '',
          monthlyLimit: (data['monthly_limit'] as num).toDouble(),
          month: data['month'] ?? 1,
          year: data['year'] ?? DateTime.now().year,
          createdAt: DateTime.parse(data['created_at']),
          syncStatus: const Value('synced'),
          localVersion: Value(remoteVersion),
        ),
      );
      return MergeResult.success;
    }

    if (remoteVersion > localVersion) {
      await (localDb.update(localDb.budgetsTable)
            ..where((t) => t.id.equals(id)))
          .write(BudgetsTableCompanion(
        category: Value(data['category']),
        monthlyLimit: Value((data['monthly_limit'] as num).toDouble()),
        month: Value(data['month']),
        year: Value(data['year']),
        syncStatus: const Value('synced'),
        localVersion: Value(remoteVersion),
      ));
      return MergeResult.success;
    }

    return MergeResult.conflict;
  }

  static Future<void> _applyDelete(String table, String id) async {
    switch (table) {
      case 'transactions':
        await (localDb.delete(localDb.transactionsTable)
              ..where((t) => t.id.equals(id)))
            .go();
        break;
      case 'debts':
        await (localDb.delete(localDb.debtsTable)
              ..where((t) => t.id.equals(id)))
            .go();
        break;
      case 'savings_goals':
        await (localDb.delete(localDb.savingsGoalsTable)
              ..where((t) => t.id.equals(id)))
            .go();
        break;
      case 'budgets':
        await (localDb.delete(localDb.budgetsTable)
              ..where((t) => t.id.equals(id)))
            .go();
        break;
    }
  }

  static Future<SyncResult> pushPendingChanges({
    void Function(int current, int total)? onProgress,
  }) async {
    _status = SyncStatus.syncing;
    _lastError = null;

    int totalPushed = 0;

    try {
      final pending = await txRepo.getOrderedOperations();

      for (int i = 0; i < pending.length; i++) {
        final item = pending[i];
        await txRepo.markProcessing(item.id);

        try {
          await _pushOperation(item);
          await txRepo.markCompleted(item.id);
          totalPushed++;
        } catch (e) {
          await txRepo.markFailed(item.id, e.toString(), item.attemptCount);
          
          final backoff = txRepo.getBackoffDuration(item.attemptCount);
          await Future.delayed(backoff);
          
          if (item.attemptCount >= 3) {
            await txRepo.markCompleted(item.id);
          }
        }

        onProgress?.call(i + 1, pending.length);
      }

      _status = SyncStatus.idle;
      return SyncResult(pushed: totalPushed);
    } catch (e) {
      _status = SyncStatus.error;
      _lastError = e.toString();
      return SyncResult(error: e.toString());
    }
  }

  static Future<void> _pushOperation(SyncQueueTableData item) async {
    final table = item.entityType;
    final id = item.entityId;
    final payload = jsonDecode(item.payload) as Map<String, dynamic>;

    switch (item.operationType) {
      case 'create':
        await _supabase.from(table).insert({...payload, 'id': id});
        break;
      case 'update':
        await _supabase.from(table).update(payload).eq('id', id);
        break;
      case 'delete':
        await _supabase.from(table).update({'deleted_at': DateTime.now().toIso8601String()}).eq('id', id);
        break;
    }
  }

  static Future<SyncResult> fullSync({
    void Function(int current, int total, SyncDirection direction)? onProgress,
  }) async {
    final pullResult = await pullWithPagination(
      onProgress: (current, total) {
        onProgress?.call(current, total, SyncDirection.pull);
      },
    );

    if (!pullResult.isSuccess) {
      return pullResult;
    }

    final pushResult = await pushPendingChanges(
      onProgress: (current, total) {
        onProgress?.call(current, total, SyncDirection.push);
      },
    );

    return SyncResult(
      pulled: pullResult.pulled,
      pushed: pushResult.pushed,
      conflicts: pullResult.conflicts,
      error: pushResult.error,
    );
  }

  static Future<void> setLastSyncTime(DateTime time) async {
    _lastSyncTime = time;
  }

  static void resetSyncState() {
    _lastSyncTime = null;
    _status = SyncStatus.idle;
    _lastError = null;
  }
}

enum MergeResult { success, conflict, skip }