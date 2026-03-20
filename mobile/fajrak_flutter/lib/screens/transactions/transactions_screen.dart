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
      if (mounted) _currency = profile['currency'] as String? ?? 'inv_jod'.tr();

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
      if (mounted) {
        setState(() {
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
      const SnackBar(
          content: Text('جارِ تجهيز ملف CSV…',
              style: TextStyle(fontFamily: 'Cairo')),
          duration: Duration(seconds: 2)),
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
            const SnackBar(
                content: Text('لا توجد معاملات لتصديرها',
                    style: TextStyle(fontFamily: 'Cairo'))),
          );
        }
        return;
      }

      final buffer = StringBuffer();
      buffer.writeln('التاريخ,النوع,المبلغ ($_currency),الفئة,الوصف');
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
        text: 'معاملات فجرك 🌅',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('خطأ في التصدير: $e',
                  style: const TextStyle(fontFamily: 'Cairo'))),
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
                    existing != null ? 'تعديل المعاملة' : 'إضافة معاملة',
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
                      child: const Center(
                          child: Text('💰 دخل',
                              style: TextStyle(
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
                      child: const Center(
                          child: Text('💸 مصروف',
                              style: TextStyle(
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
              decoration: const InputDecoration(labelText: 'الوصف (اختياري)'),
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
                child: Text(existing != null ? 'trans_save_edit'.tr() : 'trans_add'.tr(),
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
            const Text('تصفية حسب التاريخ',
                style: TextStyle(
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
                    decoration: const InputDecoration(
                        labelText: 'الشهر',
                        filled: true,
                        fillColor: Color(0xFF1E293B)),
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
                    decoration: const InputDecoration(
                        labelText: 'السنة',
                        filled: true,
                        fillColor: Color(0xFF1E293B)),
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
                    child: const Text('إلغاء التصفية',
                        style: TextStyle(
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
                    child: const Text('تطبيق',
                        style: TextStyle(
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
    final filtered = _filtered;
    final income = filtered
        .where((t) => t['type'] == 'income')
        .fold(0.0, (a, t) => a + (t['amount'] as num).toDouble());
    final expenses = filtered
        .where((t) => t['type'] == 'expense')
        .fold(0.0, (a, t) => a + (t['amount'] as num).toDouble());

    final todayStr = DateTime.now().toIso8601String().split('T')[0];
    final completed = filtered
        .where(
            (t) => (t['transaction_date'] as String).compareTo(todayStr) <= 0)
        .toList();
    final upcoming = filtered
        .where((t) => (t['transaction_date'] as String).compareTo(todayStr) > 0)
        .toList();

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF070B14),
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('nav_transactions'.tr(),
              style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  fontFamily: 'Cairo')),
          Text('${filtered.length} معاملة',
              style: const TextStyle(
                  fontSize: 12, color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
        ]),
        actions: [
          IconButton(
              icon:
                  const Icon(Icons.download_rounded, color: Color(0xFF94A3B8)),
              onPressed: _exportCSV),
          GestureDetector(
            onTap: () => _showAddDialog(),
            child: Container(
              margin: const EdgeInsets.only(left: 16),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                  color: const Color(0xFF3B7EF6),
                  borderRadius: BorderRadius.circular(10)),
              child: const Text('+ إضافة',
                  style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'Cairo')),
            ),
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
          : RefreshIndicator(
              onRefresh: () => _load(reset: true),
              color: const Color(0xFF3B7EF6),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          Row(children: [
                            Expanded(
                                child: _statCard(
                                    'dash_income'.tr(), income, const Color(0xFF10B981))),
                            const SizedBox(width: 8),
                            Expanded(
                                child: _statCard('dash_expenses'.tr(), expenses,
                                    const Color(0xFFEF4444))),
                            const SizedBox(width: 8),
                            Expanded(
                                child: _statCard(
                                    'dash_net'.tr(),
                                    income - expenses,
                                    income - expenses >= 0
                                        ? const Color(0xFF10B981)
                                        : const Color(0xFFEF4444))),
                          ]),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  onChanged: (v) =>
                                      setState(() => _search = v.toLowerCase()),
                                  style: const TextStyle(
                                      color: Colors.white, fontFamily: 'Cairo'),
                                  decoration: InputDecoration(
                                    hintText: 'ابحث عن معاملة...',
                                    hintStyle: const TextStyle(
                                        color: Color(0xFF64748B),
                                        fontFamily: 'Cairo'),
                                    prefixIcon: const Icon(Icons.search,
                                        color: Color(0xFF94A3B8)),
                                    filled: true,
                                    fillColor: const Color(0xFF1E293B),
                                    border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                        borderSide: BorderSide.none),
                                    contentPadding: const EdgeInsets.symmetric(
                                        vertical: 12),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              GestureDetector(
                                onTap: _showMonthYearPicker,
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: _filterMonth != null
                                        ? const Color(0xFF3B7EF6)
                                            .withValues(alpha: 0.2)
                                        : const Color(0xFF1E293B),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                        color: _filterMonth != null
                                            ? const Color(0xFF3B7EF6)
                                            : Colors.transparent),
                                  ),
                                  child: Icon(Icons.date_range,
                                      color: _filterMonth != null
                                          ? const Color(0xFF3B7EF6)
                                          : const Color(0xFF94A3B8),
                                      size: 20),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            height: 36,
                            child: ListView(
                              scrollDirection: Axis.horizontal,
                              children: [
                                _filterBtn('all', 'trans_all'.tr()),
                                const SizedBox(width: 8),
                                _filterBtn('income', '💰 دخل'),
                                const SizedBox(width: 8),
                                _filterBtn('expense', '💸 مصروف'),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (filtered.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(40),
                        child: Column(
                          children: [
                            const Text('💸', style: TextStyle(fontSize: 48)),
                            const SizedBox(height: 16),
                            const Text('لا توجد معاملات!',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    fontFamily: 'Cairo')),
                            const SizedBox(height: 8),
                            ElevatedButton(
                              onPressed: () => _showAddDialog(),
                              style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF3B7EF6),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10))),
                              child: const Text('+ إضافة معاملة جديدة',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontFamily: 'Cairo')),
                            ),
                          ],
                        ),
                      )
                    else
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // ── المعاملات القادمة ──
                            if (upcoming.isNotEmpty) ...[
                              Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                    color: const Color(0xFFF59E0B)
                                        .withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                        color: const Color(0xFFF59E0B)
                                            .withValues(alpha: 0.2))),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Text('⏳',
                                        style: TextStyle(fontSize: 14)),
                                    const SizedBox(width: 8),
                                    Text('قادمة — ${upcoming.length}',
                                        style: const TextStyle(
                                            color: Color(0xFFFCD34D),
                                            fontWeight: FontWeight.w900,
                                            fontSize: 12,
                                            fontFamily: 'Cairo')),
                                  ],
                                ),
                              ),
                              ...upcoming
                                  .map((tx) => _txItem(tx, isScheduled: true)),
                              const SizedBox(height: 16),
                            ],

                            // ── المعاملات المنجزة ──
                            if (completed.isNotEmpty) ...[
                              if (upcoming.isNotEmpty)
                                Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 8),
                                  decoration: BoxDecoration(
                                      color: const Color(0xFF10B981)
                                          .withValues(alpha: 0.06),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(
                                          color: const Color(0xFF10B981)
                                              .withValues(alpha: 0.15))),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Text('✅',
                                          style: TextStyle(fontSize: 14)),
                                      const SizedBox(width: 8),
                                      Text('منجزة — ${completed.length}',
                                          style: const TextStyle(
                                              color: Color(0xFF6EE7B7),
                                              fontWeight: FontWeight.w900,
                                              fontSize: 12,
                                              fontFamily: 'Cairo')),
                                    ],
                                  ),
                                ),
                              ...completed
                                  .map((tx) => _txItem(tx, isScheduled: false)),
                            ],

                            if (_hasMore)
                              Padding(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 20),
                                child: Center(
                                  child: TextButton(
                                    onPressed: _loadingMore
                                        ? null
                                        : () {
                                            setState(() => _limit += 20);
                                            _load(reset: false);
                                          },
                                    style: TextButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 32, vertical: 12),
                                      backgroundColor: const Color(0xFF1E293B),
                                      shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(12)),
                                    ),
                                    child: _loadingMore
                                        ? const SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: Color(0xFF94A3B8)))
                                        : const Text('تحميل المزيد ↓',
                                            style: TextStyle(
                                                color: Color(0xFF94A3B8),
                                                fontFamily: 'Cairo',
                                                fontWeight: FontWeight.w700)),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _statCard(String label, double value, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        FittedBox(
            child: Text('${value.toStringAsFixed(0)}+',
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'Cairo',
                    fontSize: 16))),
        Text(label,
            style: const TextStyle(
                color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo')),
      ]),
    );
  }

  Widget _filterBtn(String value, String label) {
    final isSelected = _filter == value;
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF3B7EF6) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label,
            style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                fontFamily: 'Cairo',
                fontSize: 12,
                fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _txItem(Map<String, dynamic> tx, {bool isScheduled = false}) {
    final isIncome = tx['type'] == 'income';
    final amount = (tx['amount'] as num).toDouble();
    return Stack(
      children: [
        Dismissible(
          key: Key(tx['id']),
          direction: DismissDirection.endToStart,
          background: Container(
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
                color: const Color(0xFFEF4444),
                borderRadius: BorderRadius.circular(12)),
            alignment: Alignment
                .centerLeft, // Dismissing right-to-left in AR meaning it'll show icon on right logic but since we dismiss endToStart we should put content at the end.
            padding: const EdgeInsets.only(left: 20),
            child: const Icon(Icons.delete, color: Colors.white),
          ),
          confirmDismiss: (_) async {
            return await showDialog<bool>(
              context: context,
              builder: (c) => AlertDialog(
                backgroundColor: const Color(0xFF0F1629),
                title: const Text('حذف المعاملة',
                    style: TextStyle(
                        color: Colors.white,
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.w900)),
                content: const Text(
                    'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.',
                    style: TextStyle(
                        color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(c, false),
                      child: Text('trans_cancel'.tr(),
                          style: const TextStyle(
                              color: Color(0xFF94A3B8), fontFamily: 'Cairo'))),
                  TextButton(
                      onPressed: () => Navigator.pop(c, true),
                      child: Text('delete'.tr(),
                          style: const TextStyle(
                              color: Color(0xFFEF4444),
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.w900))),
                ],
              ),
            );
          },
          onDismissed: (_) => _delete(tx['id']),
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF0F1629),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isIncome
                        ? const Color(0xFF064E3B)
                        : const Color(0xFF7F1D1D),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                      child: Text(isIncome ? '💰' : '💸',
                          style: const TextStyle(fontSize: 20))),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(tx['description'] ?? tx['category'] ?? '',
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontFamily: 'Cairo',
                                fontSize: 14)),
                        const SizedBox(height: 2),
                        Text('${tx['category']} · ${tx['transaction_date']}',
                            style: const TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 11,
                                fontFamily: 'Cairo')),
                      ]),
                ),
                GestureDetector(
                  onTap: () => _showAddDialog(existing: tx),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    margin: const EdgeInsets.only(left: 8),
                    decoration: BoxDecoration(
                        color: const Color(0xFF3B7EF6).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.edit_outlined,
                        color: Color(0xFF3B7EF6), size: 16),
                  ),
                ),
                Text(
                  '${isIncome ? '+' : '−'}${amount.toStringAsFixed(0)} $_currency',
                  style: TextStyle(
                      color: isIncome
                          ? const Color(0xFF10B981)
                          : const Color(0xFFEF4444),
                      fontWeight: FontWeight.w900,
                      fontFamily: 'Cairo',
                      fontSize: 14),
                ),
              ],
            ),
          ),
        ),
        if (isScheduled)
          Positioned(
            top: 4,
            right: 4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                border: Border.all(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.25)),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text('مجدولة',
                  style: TextStyle(
                      color: Color(0xFFFCD34D),
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'Cairo')),
            ),
          ),
      ],
    );
  }
}
