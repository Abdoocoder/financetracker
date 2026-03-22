import 'dart:convert';
import 'dart:io';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/analytics_service.dart';
import '../../utils/error_handler.dart';
import '../../widgets/transactions/add_transaction_dialog.dart';
import '../../widgets/transactions/month_year_picker_dialog.dart';
import '../../widgets/transactions/transaction_filters.dart';
import '../../widgets/transactions/transaction_list_item.dart';
import '../../widgets/transactions/transaction_summary.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  List<Map<String, dynamic>> _transactions = [];
  List<Map<String, dynamic>> _allTransactions = [];
  bool _loading = true;
  int _limit = 20;
  bool _hasMore = true;

  String _filter = 'all';
  String _search = '';
  String _currency = 'JOD';
  int? _filterMonth;
  int? _filterYear;

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Transactions');
    _load();
  }

  Future<void> _load({bool reset = true}) async {
    if (reset) {
      if (mounted) {
        setState(() {
          _limit = 20;
          _loading = true;
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
      final profile = await Supabase.instance.client
          .from('profiles')
          .select('currency')
          .eq('id', user.id)
          .single();
      if (mounted) _currency = profile['currency'] as String? ?? 'JOD';

      final baseQ = Supabase.instance.client
          .from('transactions')
          .select('*')
          .eq('user_id', user.id);
      
      List data;
      if (_filterMonth != null && _filterYear != null) {
        final start = DateTime(_filterYear!, _filterMonth!, 1)
            .toIso8601String()
            .split('T')[0];
        final end = DateTime(_filterYear!, _filterMonth! + 1, 0)
            .toIso8601String()
            .split('T')[0];
        data = await baseQ
            .gte('transaction_date', start)
            .lte('transaction_date', end)
            .order('transaction_date', ascending: false)
            .limit(_limit);
      } else {
        data = await baseQ
            .order('transaction_date', ascending: false)
            .limit(_limit);
      }

      // Fetch totals for summary
      PostgrestFilterBuilder<List<Map<String, dynamic>>> totalsQ = Supabase
          .instance.client
          .from('transactions')
          .select('*')
          .eq('user_id', user.id);

      List<Map<String, dynamic>> allDataForSummary;
      if (_filterMonth != null && _filterYear != null) {
        final start = DateTime(_filterYear!, _filterMonth!, 1)
            .toIso8601String()
            .split('T')[0];
        final end = DateTime(_filterYear!, _filterMonth! + 1, 0)
            .toIso8601String()
            .split('T')[0];
        allDataForSummary = await totalsQ
            .gte('transaction_date', start)
            .lte('transaction_date', end);
      } else {
        allDataForSummary = await totalsQ;
      }

      if (mounted) {
        setState(() {
          _allTransactions = allDataForSummary;
          if (reset) {
            _transactions = List<Map<String, dynamic>>.from(data);
          } else {
            _transactions.addAll(List<Map<String, dynamic>>.from(data));
          }
          _hasMore = data.length == _limit;
        });
      }
    } catch (e) {
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
              style: const TextStyle(fontFamily: 'Cairo')),
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
                    style: const TextStyle(fontFamily: 'Cairo'))),
          );
        }
        return;
      }

      final buffer = StringBuffer();
      buffer.writeln('${'trans_date'.tr()},${'inv_type'.tr()},${'trans_amount'.tr()} ($_currency),${'trans_category'.tr()},${'trans_description'.tr()}');
      for (final tx in list) {
        final type = tx['type'] == 'income' ? 'trans_income'.tr() : 'trans_expense'.tr();
        final amount = (tx['amount'] as num? ?? 0).toStringAsFixed(2);
        final cat = (tx['category'] ?? '').toString().replaceAll(',', '،');
        final desc = (tx['description'] ?? '')
            .toString()
            .replaceAll(',', '،')
            .replaceAll('\n', ' ');
        buffer.writeln('${tx['transaction_date']},$type,$amount,$cat,$desc');
      }

      final dir = await getTemporaryDirectory();
      final ts = DateTime.now().millisecondsSinceEpoch;
      final file = File('${dir.path}/fajrak_transactions_$ts.csv');
      await file.writeAsString('\u{feff}${buffer.toString()}', encoding: utf8);

      await Share.shareXFiles(
        [XFile(file.path, mimeType: 'text/csv')],
        text: 'trans_title'.tr(),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('error_export'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  List<Map<String, dynamic>> get _filtered {
    return _transactions.where((tx) {
      if (_filter != 'all' && tx['type'] != _filter) return false;
      if (_search.isNotEmpty) {
        final desc = (tx['description'] ?? '').toString().toLowerCase();
        final cat = (tx['category'] ?? '').toString().toLowerCase();
        if (!desc.contains(_search) && !cat.contains(_search)) return false;
      }
      return true;
    }).toList();
  }

  Future<void> _delete(String id) async {
    await Supabase.instance.client.from('transactions').delete().eq('id', id);
    setState(() => _transactions.removeWhere((t) => t['id'] == id));
  }

  void _showAddDialog({Map<String, dynamic>? existing}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1629),
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => AddTransactionDialog(
        existing: existing,
        onSaved: () => _load(reset: true),
      ),
    );
  }

  void _showMonthYearPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F1629),
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

    final income = _allTransactions
        .where((t) => t['type'] == 'income')
        .fold(0.0, (a, t) => a + (t['amount'] as num).toDouble());
    final expenses = _allTransactions
        .where((t) => t['type'] == 'expense')
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
                    fontFamily: 'Cairo',
                    fontSize: 18)),
            Text('trans_count'.tr(args: [filtered.length.toString()]),
                style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 12,
                    fontFamily: 'Cairo')),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _exportCSV,
            icon: Icon(Icons.download, color: colorScheme.onSurfaceVariant),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          TransactionSummary(
            income: income,
            expenses: expenses,
            currency: _currency,
            colorScheme: colorScheme,
          ),
          TransactionFilters(
            currentFilter: _filter,
            currentSearch: _search,
            onSearchChanged: (v) => setState(() => _search = v.toLowerCase()),
            onFilterChanged: (v) => setState(() => _filter = v),
            onShowDatePicker: _showMonthYearPicker,
            colorScheme: colorScheme,
          ),
          Expanded(
            child: _loading && _transactions.isEmpty
                ? Center(child: CircularProgressIndicator(color: colorScheme.primary))
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text('💸', style: TextStyle(fontSize: 48)),
                            const SizedBox(height: 16),
                            Text('trans_empty'.tr(),
                                style: TextStyle(
                                    color: colorScheme.onSurface,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    fontFamily: 'Cairo')),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () async {
                          await _load(reset: true);
                        },
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filtered.length + (_hasMore ? 1 : 0),
                          itemBuilder: (context, index) {
                            if (index == filtered.length) {
                              return Center(
                                  child: Padding(
                                      padding: const EdgeInsets.all(8.0),
                                      child: CircularProgressIndicator(
                                          color: colorScheme.primary)));
                            }
                            return TransactionListItem(
                              key: ValueKey(filtered[index]['id']),
                              transaction: filtered[index],
                              currency: _currency,
                              colorScheme: colorScheme,
                              onDelete: _delete,
                              onTap: (tx) => _showAddDialog(existing: tx),
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
