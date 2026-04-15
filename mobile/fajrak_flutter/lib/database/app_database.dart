import 'package:drift/drift.dart';

// Conditional import: native (Android/iOS/desktop) vs web.
import 'connection/unsupported.dart'
    if (dart.library.ffi) 'connection/native.dart'
    if (dart.library.html) 'connection/web.dart';

part 'app_database.g.dart';

// ─────────────────────────────────────────────────────────────
// TABLES — mirror Supabase schema exactly
// Extra columns (sync_status, local_version) are local-only.
// ─────────────────────────────────────────────────────────────

/// Matches public.transactions + multi-currency + accounts migrations.
class TransactionsTable extends Table {
  @override
  String get tableName => 'transactions';

  TextColumn get id => text()();
  TextColumn get userId => text()();
  TextColumn get type => text()(); // 'income' | 'expense' | 'transfer'
  TextColumn get category => text()();
  RealColumn get amount => real()();
  TextColumn get description => text().nullable()();
  DateTimeColumn get transactionDate => dateTime()();
  BoolColumn get isRecurring => boolean().withDefault(const Constant(false))();
  IntColumn get recurringDay => integer().nullable()();
  TextColumn get accountId => text().nullable()();
  TextColumn get transferToAccountId => text().nullable()();
  TextColumn get transferPairId => text().nullable()();
  TextColumn get sourceRecurringId => text().nullable()();
  // multi-currency
  RealColumn get originalAmount => real().nullable()();
  TextColumn get originalCurrency => text().nullable()();
  RealColumn get exchangeRate => real().nullable()();
  DateTimeColumn get createdAt => dateTime()();

  // ── Sync bookkeeping (local-only, never sent to Supabase) ──
  TextColumn get syncStatus => text().withDefault(
        const Constant('synced'),
      )(); // 'synced' | 'pending_create' | 'pending_update' | 'pending_delete'
  IntColumn get localVersion => integer().withDefault(const Constant(1))();

  @override
  Set<Column> get primaryKey => {id};
}

/// Matches public.debts.
class DebtsTable extends Table {
  @override
  String get tableName => 'debts';

  TextColumn get id => text()();
  TextColumn get userId => text()();
  TextColumn get name => text()();
  RealColumn get originalAmount => real()();
  RealColumn get remainingAmount => real()();
  RealColumn get monthlyPayment => real().withDefault(const Constant(0))();
  DateTimeColumn get dueDate => dateTime().nullable()();
  IntColumn get priority => integer().withDefault(const Constant(3))();
  TextColumn get notes => text().nullable()();
  BoolColumn get isPaid => boolean().withDefault(const Constant(false))();
  // multi-currency
  RealColumn get originalAmountForeign => real().nullable()();
  RealColumn get remainingAmountForeign => real().nullable()();
  TextColumn get currency => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  TextColumn get syncStatus =>
      text().withDefault(const Constant('synced'))();
  IntColumn get localVersion => integer().withDefault(const Constant(1))();

  @override
  Set<Column> get primaryKey => {id};
}

/// Matches public.savings_goals.
class SavingsGoalsTable extends Table {
  @override
  String get tableName => 'savings_goals';

  TextColumn get id => text()();
  TextColumn get userId => text()();
  TextColumn get name => text()();
  RealColumn get targetAmount => real()();
  RealColumn get currentAmount => real().withDefault(const Constant(0))();
  DateTimeColumn get targetDate => dateTime().nullable()();
  TextColumn get icon => text().withDefault(const Constant('🎯'))();
  TextColumn get color =>
      text().withDefault(const Constant('#2E75B6'))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  TextColumn get syncStatus =>
      text().withDefault(const Constant('synced'))();
  IntColumn get localVersion => integer().withDefault(const Constant(1))();

  @override
  Set<Column> get primaryKey => {id};
}

/// Matches public.accounts.
class AccountsTable extends Table {
  @override
  String get tableName => 'accounts';

  TextColumn get id => text()();
  TextColumn get userId => text()();
  TextColumn get name => text()();
  TextColumn get type => text()(); // 'cash' | 'bank' | 'savings' | 'credit_card'
  RealColumn get openingBalance => real().withDefault(const Constant(0))();
  TextColumn get currency => text().withDefault(const Constant('KWD'))();
  TextColumn get color =>
      text().withDefault(const Constant('#3B7EF6'))();
  TextColumn get icon => text().withDefault(const Constant('🏦'))();
  BoolColumn get isDefault =>
      boolean().withDefault(const Constant(false))();
  BoolColumn get isArchived =>
      boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  TextColumn get syncStatus =>
      text().withDefault(const Constant('synced'))();
  IntColumn get localVersion => integer().withDefault(const Constant(1))();

  @override
  Set<Column> get primaryKey => {id};
}

/// Matches public.budgets.
class BudgetsTable extends Table {
  @override
  String get tableName => 'budgets';

  TextColumn get id => text()();
  TextColumn get userId => text()();
  TextColumn get category => text()();
  RealColumn get monthlyLimit => real()();
  IntColumn get month => integer()();
  IntColumn get year => integer()();
  DateTimeColumn get createdAt => dateTime()();

  TextColumn get syncStatus =>
      text().withDefault(const Constant('synced'))();
  IntColumn get localVersion => integer().withDefault(const Constant(1))();

  @override
  Set<Column> get primaryKey => {id};
}

/// Matches public.recurring_transactions.
class RecurringTransactionsTable extends Table {
  @override
  String get tableName => 'recurring_transactions';

  TextColumn get id => text()();
  TextColumn get userId => text()();
  TextColumn get name => text()();
  RealColumn get amount => real()();
  TextColumn get category => text()();
  TextColumn get type => text()(); // 'income' | 'expense'
  TextColumn get frequency => text()(); // 'daily' | 'weekly' | 'monthly' | 'yearly'
  DateTimeColumn get nextDate => dateTime()();
  TextColumn get currency => text().withDefault(const Constant('KWD'))();
  TextColumn get notes => text().nullable()();
  BoolColumn get isActive =>
      boolean().withDefault(const Constant(true))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  TextColumn get syncStatus =>
      text().withDefault(const Constant('synced'))();
  IntColumn get localVersion => integer().withDefault(const Constant(1))();

  @override
  Set<Column> get primaryKey => {id};
}

// ─────────────────────────────────────────────────────────────
// SYNC QUEUE — durable operation log, survives app kills
// ─────────────────────────────────────────────────────────────

class SyncQueueTable extends Table {
  @override
  String get tableName => 'sync_queue';

  IntColumn get id => integer().autoIncrement()();
  TextColumn get operationType => text()(); // 'create' | 'update' | 'delete'
  TextColumn get entityType => text()(); // 'transaction' | 'debt' | 'goal' | 'account' | 'budget' | 'recurring'
  TextColumn get entityId => text()();
  TextColumn get payload => text()(); // JSON snapshot
  DateTimeColumn get createdAt => dateTime()();
  IntColumn get attemptCount =>
      integer().withDefault(const Constant(0))();
  DateTimeColumn get lastAttemptAt => dateTime().nullable()();
  TextColumn get lastError => text().nullable()();
  BoolColumn get isProcessing =>
      boolean().withDefault(const Constant(false))();
}

// ─────────────────────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────────────────────

@DriftDatabase(tables: [
  TransactionsTable,
  DebtsTable,
  SavingsGoalsTable,
  AccountsTable,
  BudgetsTable,
  RecurringTransactionsTable,
  SyncQueueTable,
])
class AppDatabase extends _$AppDatabase {
  AppDatabase._(super.e);

  // ── Singleton ──────────────────────────────────────────────
  static AppDatabase? _instance;

  /// Must be called once after Supabase.initialize() with the
  /// user's encryption key (derived from auth session).
  static Future<AppDatabase> initialize({required String encryptionKey}) async {
    if (_instance != null) return _instance!;
    _instance = AppDatabase._(buildDatabaseConnection(encryptionKey));
    return _instance!;
  }

  /// Returns the existing instance. Throws if [initialize] was not called.
  static AppDatabase get instance {
    assert(_instance != null,
        'AppDatabase.initialize() must be called before accessing instance.');
    return _instance!;
  }

  /// Closes the database and clears the singleton (useful in tests / logout).
  static Future<void> disposeInstance() async {
    await _instance?.close();
    _instance = null;
  }

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) => m.createAll(),
        onUpgrade: (m, from, to) async {
          // Add schema upgrades here as new migrations are needed.
          // Example: if (from < 2) await m.addColumn(transactionsTable, transactionsTable.newColumn);
        },
        beforeOpen: (details) async {
          // Enable foreign keys.
          await customStatement('PRAGMA foreign_keys = ON');
        },
      );
}

// Connection is provided by the platform-specific file imported above.
