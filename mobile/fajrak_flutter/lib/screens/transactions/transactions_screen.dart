import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../database/app_database.dart';
import '../../services/analytics_service.dart';
import '../../services/pdf_report_service.dart';
import '../../services/sync_service.dart';
import '../../utils/error_handler.dart';
import '../../app_state.dart';
import 'package:provider/provider.dart';
import '../../widgets/transactions/add_transaction_dialog.dart';
import '../../widgets/transactions/month_year_picker_dialog.dart';
import '../../widgets/transactions/transaction_filters.dart';
import '../../widgets/transactions/transaction_summary.dart';
import '../../widgets/common/skeleton_loader.dart';
import '../../widgets/transactions/transaction_list_item.dart';
import 'recurring_screen.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  List<Map<String, dynamic>> _transactions = [];
  List<Map<String, dynamic>> _allTransactions = [];
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasError = false;
  bool _saving = false;
  int _limit = 20;
  bool _hasMore = true;

  // Sync queue monitoring
  StreamSubscription<List<TransactionsTableData>>? _syncSubscription;
  Map<String, String> _syncStatuses = {}; // txId → syncStatus
  int _pendingCount = 0;

  String _filter = 'all';
  String _search = '';
  String _currency = 'JOD';
  String _userName = '';
  bool _generatingPdf = false;
  int? _filterMonth = DateTime.now().month;
  int? _filterYear = DateTime.now().year;

  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    AnalyticsService.logScreenView('Transactions');
    _load();
    _watchSyncQueue();
  }

  void _watchSyncQueue() {
    final db = AppDatabase.instance;
    _syncSubscription = (db.select(db.transactionsTable)
          ..where((t) => t.syncStatus.isNotValue('synced')))
        .watch()
        .listen((rows) {
      if (!mounted) return;
      setState(() {
        _syncStatuses = {for (final r in rows) r.id: r.syncStatus};
        _pendingCount = rows.length;
      });
    });
  }

  Future<void> _triggerSync() async {
    await SyncService.fullSync();
    if (mounted) _load(reset: true);
  }

  @override
  void dispose() {
    _syncSubscription?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      if (!_loading && !_loadingMore && _hasMore) {
        _load(reset: false);
      }
    }
  }

  Future<void> _load({bool reset = true}) async {
    if (reset) {
      if (mounted) {
        setState(() {
          _limit = 20;
          _loading = true;
          _hasError = false;
          _transactions = [];
        });
      }
    } else {
      if (mounted) setState(() => _loadingMore = true);
    }

    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }

    try {
      // Build date range strings once (used by both paged + totals queries)
      final String? start = (_filterMonth != null && _filterYear != null)
          ? DateTime(_filterYear!, _filterMonth!, 1).toIso8601String().split('T')[0]
          : null;
      final String? end = (_filterMonth != null && _filterYear != null)
          ? DateTime(_filterYear!, _filterMonth! + 1, 0).toIso8601String().split('T')[0]
          : null;

      // Build paged transactions query
      var baseQ = Supabase.instance.client
          .from('transactions')
          .select('*')
          .eq('user_id', user.id);
      if (_filter != 'all') baseQ = baseQ.eq('type', _filter);
      final rangedQ = (start != null && end != null)
          ? baseQ.gte('transaction_date', start).lte('transaction_date', end)
          : baseQ;
      final pagedFuture = rangedQ
          .order('transaction_date', ascending: false)
          .range(reset ? 0 : _transactions.length,
              (reset ? 0 : _transactions.length) + _limit - 1);

      // Parallel: profile (only on reset — we already have it on load-more)
      // + paged transactions + totals (only on reset)
      if (reset) {
        var totalsQ = Supabase.instance.client
            .from('transactions')
            .select('type, amount') // minimal fields for summary calculation
            .eq('user_id', user.id);
        final totalsFuture = (start != null && end != null)
            ? totalsQ.gte('transaction_date', start).lte('transaction_date', end)
            : totalsQ;

        final results = await Future.wait<dynamic>([
          Supabase.instance.client.from('profiles').select('currency, full_name').eq('id', user.id).single(),
          pagedFuture,
          totalsFuture,
        ]);

        final profile = results[0] as Map<String, dynamic>;
        final data = results[1] as List;
        final allDataForSummary = (results[2] as List).cast<Map<String, dynamic>>();

        if (mounted) {
          _currency = profile['currency'] as String? ?? 'JOD';
          _userName = (profile['full_name'] as String? ?? '').split(' ').first;
          setState(() {
            _allTransactions = allDataForSummary;
            _transactions = List<Map<String, dynamic>>.from(data);
            _hasMore = data.length == _limit;
          });
        }
      } else {
        // Load-more: only need the next page of transactions
        final data = await pagedFuture;
        if (mounted) {
          setState(() {
            _transactions.addAll(List<Map<String, dynamic>>.from(data));
            _hasMore = data.length == _limit;
          });
        }
      }
    } catch (e) {
      if (mounted) setState(() => _hasError = true);
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'Transactions Load');
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
          _loadingMore = false;
        });
      }
    }
  }

  Future<void> _exportCSV() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
          content: Text('settings_exporting'.tr(),
              style: const TextStyle()),
          duration: const Duration(seconds: 2)),
    );

    try {
      final data = await Supabase.instance.client
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('transaction_date', ascending: false);

      final list = data as List;
      if (list.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text('settings_no_export'.tr(),
                    style: const TextStyle())),
          );
        }
        return;
      }

      String csvField(dynamic value) {
        final str = (value ?? '').toString().replaceAll('\n', ' ');
        final safe = RegExp(r'^[=+\-@\t\r]').hasMatch(str) ? "'$str" : str;
        return '"${safe.replaceAll('"', '""')}"';
      }

      final buffer = StringBuffer();
      buffer.writeln([
        csvField('trans_date'.tr()),
        csvField('inv_type'.tr()),
        csvField('${'trans_amount'.tr()} ($_currency)'),
        csvField('trans_category'.tr()),
        csvField('trans_description'.tr()),
      ].join(','));
      for (final tx in list) {
        final type = tx['type'] == 'income' ? 'trans_income'.tr() : 'trans_expense'.tr();
        final amount = (tx['amount'] as num? ?? 0).toStringAsFixed(2);
        buffer.writeln([
          csvField(tx['transaction_date']),
          csvField(type),
          csvField(amount),
          csvField(tx['category']),
          csvField(tx['description']),
        ].join(','));
      }

      final dir = await getTemporaryDirectory();
      final ts = DateTime.now().millisecondsSinceEpoch;
      final file = File('${dir.path}/fajrak_transactions_$ts.csv');
      await file.writeAsString('\u{feff}${buffer.toString()}', encoding: utf8);

      await SharePlus.instance.share(ShareParams(
        files: [XFile(file.path, mimeType: 'text/csv')],
        subject: 'trans_title'.tr(),
      ));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('error_export'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  Future<void> _generatePdf() async {
    if (_generatingPdf) return;
    setState(() => _generatingPdf = true);
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;

      final now = DateTime.now();
      final month = _filterMonth ?? now.month;
      final year  = _filterYear  ?? now.year;

      // Fetch active debts for the report
      final debtsRes = await Supabase.instance.client
          .from('debts')
          .select('name, remaining_amount, monthly_payment, auto_deduct')
          .eq('user_id', user.id)
          .eq('is_paid', false);

      const debtCats = ['ديون', 'debts_title', 'Debts'];
      final income = _allTransactions
          .where((t) => t['type'] == 'income')
          .fold(0.0, (a, t) => a + (t['amount'] as num).toDouble());
      final expenses = _allTransactions
          .where((t) => t['type'] == 'expense')
          .fold(0.0, (a, t) => a + (t['amount'] as num).toDouble());
      final debtPayments = _allTransactions
          .where((t) => t['type'] == 'expense' && debtCats.contains(t['category'] as String?))
          .fold(0.0, (a, t) => a + (t['amount'] as num).toDouble());

      await PdfReportService.shareMonthlyReport(
        data: ReportData(
          userName: _userName,
          currency: _currency,
          month: month,
          year: year,
          income: income,
          expenses: expenses,
          debtPayments: debtPayments,
          transactions: _allTransactions,
          debts: List<Map<String, dynamic>>.from(debtsRes),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('حدث خطأ أثناء إنشاء التقرير',
              style: const TextStyle()),
          backgroundColor: Theme.of(context).colorScheme.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _generatingPdf = false);
    }
  }

  List<Map<String, dynamic>> get _filtered {
    if (_search.isEmpty) return _transactions;
    return _transactions.where((tx) {
      final desc = (tx['description'] ?? '').toString().toLowerCase();
      final cat = (tx['category'] ?? '').toString().toLowerCase();
      return desc.contains(_search) || cat.contains(_search);
    }).toList();
  }

  Future<void> _delete(String id) async {
    if (_saving) return;
    _saving = true;
    setState(() {});
    try {
      await Supabase.instance.client.from('transactions').delete().eq('id', id);
      if (mounted) {
        setState(() => _transactions.removeWhere((t) => t['id'] == id));
        context.read<AppState>().notifyTransactionChanged();
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showAddDialog({Map<String, dynamic>? existing}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => AddTransactionDialog(
        existing: existing,
        onSaved: () => _load(reset: true),
        baseCurrency: _currency,
      ),
    );
  }

  void _showMonthYearPicker() {
    showModalBottomSheet(
      context: context,
      useSafeArea: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => MonthYearPickerDialog(
        initialMonth: _filterMonth,
        initialYear: _filterYear,
        onApplied: (m, y) {
          setState(() {
            _filterMonth = m;
            _filterYear = y;
          });
          _load(reset: true);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final filtered = _filtered;

    const debtCategories = ['ديون', 'debts_title', 'Debts'];
    final income = _allTransactions
        .where((t) => t['type'] == 'income')
        .fold(0.0, (a, t) => a + (t['amount'] as num).toDouble());
    final expenses = _allTransactions
        .where((t) => t['type'] == 'expense')
        .fold(0.0, (a, t) => a + (t['amount'] as num).toDouble());
    final debtPayments = _allTransactions
        .where((t) => t['type'] == 'expense' && debtCategories.contains(t['category'] as String?))
        .fold(0.0, (a, t) => a + (t['amount'] as num).toDouble());

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('trans_title'.tr(),
                style: TextStyle(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w900,
                    fontSize: 18)),
            Text('trans_count'.tr(args: [filtered.length.toString()]),
                style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 12)),
          ],
        ),
        actions: [
          if (_pendingCount > 0)
            Tooltip(
              message: '$_pendingCount قيد المزامنة — اسحب للتحديث',
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Badge(
                  label: Text(_pendingCount.toString(),
                      style: const TextStyle(fontSize: 10)),
                  backgroundColor: Colors.orange[600],
                  child: IconButton(
                    onPressed: _triggerSync,
                    icon: const Icon(Icons.cloud_upload_outlined),
                    color: Colors.orange[600],
                    tooltip: 'tooltip_sync'.tr(),
                  ),
                ),
              ),
            ),
          IconButton(
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RecurringScreen())),
            icon: Icon(Icons.repeat, color: colorScheme.onSurfaceVariant),
            tooltip: 'recurring_title'.tr(),
          ),
          IconButton(
            onPressed: _exportCSV,
            icon: Icon(Icons.download, color: colorScheme.onSurfaceVariant),
            tooltip: 'tooltip_export_csv'.tr(),
          ),
          _generatingPdf
              ? Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: SizedBox(
                    width: 20, height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: colorScheme.primary),
                  ),
                )
              : IconButton(
                  onPressed: _generatePdf,
                  icon: Icon(Icons.picture_as_pdf, color: colorScheme.primary),
                  tooltip: 'tooltip_export_pdf'.tr(),
                ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          TransactionSummary(
            income: income,
            expenses: expenses,
            debtPayments: debtPayments,
            currency: _currency,
            colorScheme: colorScheme,
          ),
          TransactionFilters(
            currentFilter: _filter,
            currentSearch: _search,
            onSearchChanged: (v) {
              setState(() => _search = v.toLowerCase());
            },
            onFilterChanged: (v) {
              setState(() {
                _filter = v;
                _transactions = [];
                _loading = true;
              });
              _load(reset: true);
            },
            onShowDatePicker: _showMonthYearPicker,
            colorScheme: colorScheme,
            filterMonth: _filterMonth ?? DateTime.now().month,
            filterYear: _filterYear ?? DateTime.now().year,
            onMonthYearChanged: (m, y) {
              setState(() {
                _filterMonth = m;
                _filterYear = y;
              });
              _load(reset: true);
            },
          ),
          Expanded(
            child: _hasError && _transactions.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.wifi_off_rounded, size: 56, color: colorScheme.onSurface.withValues(alpha: 0.3)),
                        const SizedBox(height: 16),
                        Text('error_load_failed'.tr(), style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: colorScheme.onSurface), textAlign: TextAlign.center),
                        const SizedBox(height: 8),
                        Text('error_check_connection'.tr(), style: TextStyle(fontSize: 13, color: colorScheme.onSurfaceVariant), textAlign: TextAlign.center),
                        const SizedBox(height: 24),
                        FilledButton.icon(
                          onPressed: () => _load(reset: true),
                          icon: const Icon(Icons.refresh_rounded),
                          label: Text('btn_retry'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
                        ),
                      ]),
                    ),
                  )
                : _loading && _transactions.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(16.0),
                    child: ListSkeleton(count: 8),
                  )
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.payments_outlined, size: 48, color: colorScheme.onSurfaceVariant),
                            const SizedBox(height: 16),
                            Text('trans_empty'.tr(),
                                style: TextStyle(
                                    color: colorScheme.onSurface,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _triggerSync,
                        child: ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                          itemCount: filtered.length + (_hasMore && _loadingMore ? 1 : 0),
                          itemBuilder: (context, index) {
                            if (index == filtered.length) {
                              return Center(
                                  child: Padding(
                                      padding: const EdgeInsets.all(8.0),
                                      child: CircularProgressIndicator(
                                          color: colorScheme.primary)));
                            }
                            final tx = filtered[index];
                            return TransactionListItem(
                              key: ValueKey(tx['id']),
                              transaction: tx,
                              currency: _currency,
                              colorScheme: colorScheme,
                              onDelete: _delete,
                              onTap: (t) => _showAddDialog(existing: t),
                              syncStatus: _syncStatuses[tx['id']],
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddDialog,
        backgroundColor: colorScheme.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}
