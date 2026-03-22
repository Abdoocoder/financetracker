import 'package:easy_localization/easy_localization.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'dart:convert';

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

  Future<void> _showAddDialog({Map<String, dynamic>? existing}) async {
    final typeController =
        ValueNotifier<String>(existing?['type'] ?? 'expense');
    final amountController =
        TextEditingController(text: existing?['amount']?.toString() ?? '');
    final descController =
        TextEditingController(text: existing?['description'] ?? '');
    final catController =
        TextEditingController(text: existing?['category'] ?? '');
    final dateController = ValueNotifier<DateTime>(existing != null
        ? DateTime.parse(existing['transaction_date'])
        : DateTime.now());

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1629),
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 20,
            right: 20,
            top: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
                child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            Center(
                child: Text(
                    existing != null ? 'trans_edit'.tr() : 'trans_new'.tr(),
                    style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        fontFamily: 'Cairo'))),
            const SizedBox(height: 20),
            ValueListenableBuilder<String>(
              valueListenable: typeController,
              builder: (_, type, __) => Row(
                children: [
                  Expanded(
                      child: GestureDetector(
                    onTap: () => typeController.value = 'income',
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: type == 'income'
                            ? const Color(0xFF10B981).withValues(alpha: 0.2)
                            : const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: type == 'income'
                                ? const Color(0xFF10B981)
                                : Colors.transparent),
                      ),
                      child: Center(
                          child: Text('trans_income'.tr(),
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontFamily: 'Cairo',
                                  fontWeight: FontWeight.w700))),
                    ),
                  )),
                  const SizedBox(width: 8),
                  Expanded(
                      child: GestureDetector(
                    onTap: () => typeController.value = 'expense',
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: type == 'expense'
                            ? const Color(0xFFEF4444).withValues(alpha: 0.2)
                            : const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: type == 'expense'
                                ? const Color(0xFFEF4444)
                                : Colors.transparent),
                      ),
                      child: Center(
                          child: Text('trans_expense'.tr(),
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontFamily: 'Cairo',
                                  fontWeight: FontWeight.w700))),
                    ),
                  )),
                ],
              ),
            ),
            const SizedBox(height: 16),
            ValueListenableBuilder<DateTime>(
              valueListenable: dateController,
              builder: (_, date, __) => GestureDetector(
                onTap: () async {
                  final picked = await showDatePicker(
                      context: context,
                      initialDate: date,
                      firstDate: DateTime(2000),
                      lastDate: DateTime(2100));
                  if (picked != null) dateController.value = picked;
                },
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(10)),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today,
                          color: Color(0xFF94A3B8), size: 18),
                      const SizedBox(width: 12),
                      Text(date.toIso8601String().split('T')[0],
                          style: const TextStyle(
                              color: Colors.white, fontFamily: 'Cairo')),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: amountController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
              decoration: InputDecoration(labelText: 'trans_amount'.tr()),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: catController,
              style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
              decoration: InputDecoration(labelText: 'trans_category'.tr()),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: descController,
              style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
              decoration: InputDecoration(labelText: 'trans_description'.tr()),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  final user = Supabase.instance.client.auth.currentUser!;
                  final data = {
                    'user_id': user.id,
                    'type': typeController.value,
                    'amount': double.tryParse(amountController.text) ?? 0,
                    'category': catController.text,
                    'description': descController.text.isEmpty
                        ? null
                        : descController.text,
                    'transaction_date':
                        dateController.value.toIso8601String().split('T')[0],
                  };
                  if (existing != null) {
                    await Supabase.instance.client
                        .from('transactions')
                        .update(data)
                        .eq('id', existing['id']);
                  } else {
                    await Supabase.instance.client
                        .from('transactions')
                        .insert(data);
                  }
                  if (context.mounted) Navigator.pop(context);
                  _load(reset: true);
                },
                style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF3B7EF6),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10))),
                child: Text(existing != null ? 'trans_save_edit'.tr() : 'trans_save'.tr(),
                    style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontFamily: 'Cairo',
                        color: Colors.white)),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  void _showMonthYearPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F1629),
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('filter_date'.tr(),
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'Cairo')),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<int>(
                    dropdownColor: const Color(0xFF1E293B),
                    value: _filterMonth ?? DateTime.now().month,
                    style: const TextStyle(
                        color: Colors.white, fontFamily: 'Cairo'),
                    decoration: InputDecoration(
                        labelText: 'month'.tr(),
                        filled: true,
                        fillColor: const Color(0xFF1E293B)),
                    items: List.generate(
                        12,
                        (i) => DropdownMenuItem(
                            value: i + 1, child: Text('${i + 1}'))),
                    onChanged: (v) => setState(() => _filterMonth = v),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: DropdownButtonFormField<int>(
                    dropdownColor: const Color(0xFF1E293B),
                    value: _filterYear ?? DateTime.now().year,
                    style: const TextStyle(
                        color: Colors.white, fontFamily: 'Cairo'),
                    decoration: InputDecoration(
                        labelText: 'year'.tr(),
                        filled: true,
                        fillColor: const Color(0xFF1E293B)),
                    items: List.generate(5, (i) {
                      final year = DateTime.now().year - i;
                      return DropdownMenuItem(
                          value: year, child: Text('$year'));
                    }),
                    onChanged: (v) => setState(() => _filterYear = v),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () {
                      setState(() {
                        _filterMonth = null;
                        _filterYear = null;
                      });
                      Navigator.pop(ctx);
                      _load(reset: true);
                    },
                    child: Text('cancel_filter'.tr(),
                        style: const TextStyle(
                            color: Color(0xFFEF4444), fontFamily: 'Cairo')),
                  ),
                ),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _load(reset: true);
                    },
                    style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF3B7EF6)),
                    child: Text('apply'.tr(),
                        style: const TextStyle(
                            color: Colors.white, fontFamily: 'Cairo')),
                  ),
                ),
              ],
            ),
          ],
        ),
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
          _buildSummary(income, expenses, colorScheme),
          _buildFilters(colorScheme),
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
                            return _transactionItem(filtered[index], colorScheme);
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

  Widget _buildFilters(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  onChanged: (v) => setState(() => _search = v.toLowerCase()),
                  style: TextStyle(color: colorScheme.onSurface, fontFamily: 'Cairo'),
                  decoration: InputDecoration(
                    hintText: 'search_hint'.tr(),
                    prefixIcon: Icon(Icons.search, color: colorScheme.onSurfaceVariant),
                    filled: true,
                    fillColor: colorScheme.surface,
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: colorScheme.outlineVariant)),
                    contentPadding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: _showMonthYearPicker,
                icon: Icon(Icons.calendar_month, color: colorScheme.primary),
                style: IconButton.styleFrom(
                  backgroundColor: colorScheme.surface,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: colorScheme.outlineVariant)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _filterChip('all', 'trans_all'.tr(), colorScheme),
                const SizedBox(width: 8),
                _filterChip('income', 'trans_income'.tr(), colorScheme),
                const SizedBox(width: 8),
                _filterChip('expense', 'trans_expense'.tr(), colorScheme),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String value, String label, ColorScheme colorScheme) {
    final selected = _filter == value;
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? colorScheme.primary : colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: selected ? colorScheme.primary : colorScheme.outlineVariant),
        ),
        child: Text(label,
            style: TextStyle(
                color: selected ? Colors.white : colorScheme.onSurfaceVariant,
                fontFamily: 'Cairo',
                fontSize: 12,
                fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildSummary(double inc, double exp, ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        border: Border(bottom: BorderSide(color: colorScheme.outlineVariant)),
      ),
      child: Row(
        children: [
          Expanded(
              child: _statCard('trans_total_net'.tr(), inc - exp,
                  inc - exp >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                  colorScheme,
                  isNet: true)),
          const SizedBox(width: 8),
          Expanded(
              child: _statCard('trans_total_expenses'.tr(), exp, const Color(0xFFEF4444), colorScheme)),
          const SizedBox(width: 8),
          Expanded(
              child: _statCard('trans_total_income'.tr(), inc, const Color(0xFF10B981), colorScheme)),
        ],
      ),
    );
  }

  Widget _statCard(String label, double value, Color color, ColorScheme colorScheme,
      {bool isNet = false}) {
    String sign = "";
    if (isNet) {
      sign = value > 0 ? "+" : (value < 0 ? "-" : "");
    } else {
      sign = label == 'trans_total_income'.tr() ? "+" : "-";
    }

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          FittedBox(
            child: Text(
              '$sign${value.abs().toStringAsFixed(0)}',
              style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w900,
                  fontSize: 15,
                  fontFamily: 'Cairo'),
            ),
          ),
          Text(label,
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 10,
                  fontFamily: 'Cairo')),
        ],
      ),
    );
  }

  Widget _transactionItem(Map<String, dynamic> tx, ColorScheme colorScheme) {
    final isIncome = tx['type'] == 'income';
    final amount = (tx['amount'] as num).toDouble();
    final color = isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    return Dismissible(
      key: Key(tx['id']),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.only(left: 20),
        decoration: BoxDecoration(
          color: const Color(0xFFEF4444),
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) => _delete(tx['id']),
      child: GestureDetector(
        onTap: () => _showAddDialog(existing: tx),
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: colorScheme.outlineVariant),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                    child: Text(isIncome ? '💰' : '💸',
                        style: const TextStyle(fontSize: 18))),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(tx['description'] ?? tx['category'] ?? '',
                        style: TextStyle(
                            color: colorScheme.onSurface,
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            fontFamily: 'Cairo')),
                    Text(tx['category'] ?? '',
                        style: TextStyle(
                            color: colorScheme.onSurfaceVariant,
                            fontSize: 11,
                            fontFamily: 'Cairo')),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('${isIncome ? '+' : '-'}${amount.toStringAsFixed(0)}',
                      style: TextStyle(
                          color: color,
                          fontWeight: FontWeight.w900,
                          fontSize: 15,
                          fontFamily: 'Cairo')),
                  Text(tx['transaction_date'] ?? '',
                      style: TextStyle(
                          color: colorScheme.onSurfaceVariant,
                          fontSize: 10,
                          fontFamily: 'Cairo')),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
