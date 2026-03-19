import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class BudgetsScreen extends StatefulWidget {
  const BudgetsScreen({super.key});
  @override
  State<BudgetsScreen> createState() => _BudgetsScreenState();
}

class _BudgetsScreenState extends State<BudgetsScreen> {
  bool _loading = true;
  double _income = 0, _expenses = 0;
  String _currency = 'JOD';
  Map<String, double> _spending = {};
  List<Map<String, dynamic>> _budgets = [];
  bool _showRule = false;

  final _categoryCtrl = TextEditingController();
  final _limitCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() { _categoryCtrl.dispose(); _limitCtrl.dispose(); super.dispose(); }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final now = DateTime.now();
    final firstDay = DateTime(now.year, now.month, 1).toIso8601String().split('T')[0];
    final lastDay = DateTime(now.year, now.month + 1, 0).toIso8601String().split('T')[0];

    final results = await Future.wait<dynamic>([
      Supabase.instance.client.from('profiles').select('monthly_income, currency').eq('id', user.id).single(),
      Supabase.instance.client.from('transactions').select('type, amount, category').eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', lastDay),
      Supabase.instance.client.from('budgets').select('*').eq('user_id', user.id).eq('month', '${now.year}-${now.month.toString().padLeft(2, '0')}'),
    ]);

    final profile = results[0] as Map<String, dynamic>;
    final txs = results[1] as List;
    final budgets = results[2] as List;

    double income = 0, expenses = 0;
    final Map<String, double> cats = {};
    for (final tx in txs) {
      if (tx['type'] == 'income') income += (tx['amount'] as num).toDouble();
      else {
        expenses += (tx['amount'] as num).toDouble();
        final cat = tx['category'] as String? ?? 'أخرى';
        cats[cat] = (cats[cat] ?? 0) + (tx['amount'] as num).toDouble();
      }
    }

    if (mounted) setState(() {
      _currency = profile['currency'] as String? ?? 'JOD';
      _income = income > 0 ? income : (profile['monthly_income'] as num?)?.toDouble() ?? 0;
      _expenses = expenses;
      _spending = Map.fromEntries(cats.entries.toList()..sort((a, b) => b.value.compareTo(a.value)));
      _budgets = List<Map<String, dynamic>>.from(budgets);
      _loading = false;
    });
  }

  Future<void> _addBudget() async {
    if (_categoryCtrl.text.isEmpty || _limitCtrl.text.isEmpty) return;
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    setState(() => _saving = true);
    HapticFeedback.mediumImpact();
    final now = DateTime.now();
    await Supabase.instance.client.from('budgets').upsert({
      'user_id': user.id,
      'category': _categoryCtrl.text,
      'limit_amount': double.tryParse(_limitCtrl.text) ?? 0,
      'month': '${now.year}-${now.month.toString().padLeft(2, '0')}',
    });
    _categoryCtrl.clear(); _limitCtrl.clear();
    setState(() => _saving = false);
    Navigator.pop(context);
    await _load();
  }

  void _showAddDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1629),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 16),
          const Text('إضافة ميزانية', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
          const SizedBox(height: 20),
          TextField(
            controller: _categoryCtrl,
            textAlign: TextAlign.right,
            style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
            decoration: _dec('الفئة (مثال: طعام، مواصلات)'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _limitCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            textAlign: TextAlign.right,
            style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
            decoration: _dec('الحد الأقصى'),
          ),
          const SizedBox(height: 20),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: _saving ? null : _addBudget,
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3B7EF6), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: _saving ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2) : const Text('حفظ', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900)),
          )),
          const SizedBox(height: 16),
        ]),
      ),
    );
  }

  InputDecoration _dec(String hint) => InputDecoration(
    hintText: hint, hintStyle: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo'),
    filled: true, fillColor: const Color(0xFF1E293B),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
  );

  @override
  Widget build(BuildContext context) {
    final available = _income - _expenses;
    final savingRate = _income > 0 ? (available / _income * 100) : 0.0;

    // قاعدة 50/30/20
    final needs = _income * 0.5;
    final wants = _income * 0.3;
    final savings = _income * 0.2;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF070B14),
        title: const Text('الميزانية', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [IconButton(icon: const Icon(Icons.add, color: Color(0xFF3B7EF6)), onPressed: _showAddDialog)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
          : RefreshIndicator(
              onRefresh: _load,
              color: const Color(0xFF3B7EF6),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(children: [

                  // ملخص الشهر
                  Row(children: [
                    Expanded(child: _summaryCard('الدخل', _income, const Color(0xFF10B981))),
                    const SizedBox(width: 8),
                    Expanded(child: _summaryCard('المصاريف', _expenses, const Color(0xFFEF4444))),
                    const SizedBox(width: 8),
                    Expanded(child: _summaryCard('المتاح', available, available >= 0 ? const Color(0xFF3B7EF6) : const Color(0xFFEF4444))),
                  ]),
                  const SizedBox(height: 12),

                  // شريط الادخار
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF1E293B))),
                    child: Column(children: [
                      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                        const Text('نسبة الادخار', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 12)),
                        Text('${savingRate.toStringAsFixed(1)}%', style: TextStyle(
                          color: savingRate >= 20 ? const Color(0xFF10B981) : savingRate >= 10 ? const Color(0xFFF59E0B) : const Color(0xFFEF4444),
                          fontWeight: FontWeight.w900, fontFamily: 'Cairo',
                        )),
                      ]),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: (savingRate / 100).clamp(0.0, 1.0),
                          backgroundColor: const Color(0xFF1E293B),
                          valueColor: AlwaysStoppedAnimation(savingRate >= 20 ? const Color(0xFF10B981) : savingRate >= 10 ? const Color(0xFFF59E0B) : const Color(0xFFEF4444)),
                          minHeight: 8,
                        ),
                      ),
                    ]),
                  ),
                  const SizedBox(height: 16),

                  // قاعدة 50/30/20
                  GestureDetector(
                    onTap: () => setState(() => _showRule = !_showRule),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF3B7EF6).withValues(alpha: 0.3))),
                      child: Row(children: [
                        const Text('📊', style: TextStyle(fontSize: 20)),
                        const SizedBox(width: 10),
                        const Expanded(child: Text('قاعدة 50/30/20', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo'))),
                        Icon(_showRule ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, color: const Color(0xFF64748B)),
                      ]),
                    ),
                  ),

                  if (_showRule) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF1E293B))),
                      child: Column(children: [
                        _ruleRow('🏠 الضروريات (50%)', needs, const Color(0xFF3B7EF6), _currency),
                        const SizedBox(height: 10),
                        _ruleRow('🎯 الرغبات (30%)', wants, const Color(0xFF8B5CF6), _currency),
                        const SizedBox(height: 10),
                        _ruleRow('💰 الادخار (20%)', savings, const Color(0xFF10B981), _currency),
                      ]),
                    ),
                  ],
                  const SizedBox(height: 16),

                  // الميزانيات المحددة
                  if (_budgets.isNotEmpty) ...[
                    const Align(alignment: Alignment.centerRight, child: Text('ميزانياتي', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 15))),
                    const SizedBox(height: 10),
                    ..._budgets.map((b) {
                      final cat = b['category'] as String;
                      final limit = (b['limit_amount'] as num).toDouble();
                      final spent = _spending[cat] ?? 0;
                      final progress = limit > 0 ? (spent / limit).clamp(0.0, 1.0) : 0.0;
                      final color = progress >= 1 ? const Color(0xFFEF4444) : progress >= 0.8 ? const Color(0xFFF59E0B) : const Color(0xFF10B981);
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withValues(alpha: 0.2))),
                        child: Column(children: [
                          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                            Text(cat, style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                            Text('${spent.toStringAsFixed(0)} / ${limit.toStringAsFixed(0)} $_currency', style: TextStyle(color: color, fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w700)),
                          ]),
                          const SizedBox(height: 8),
                          ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(value: progress, backgroundColor: const Color(0xFF1E293B), valueColor: AlwaysStoppedAnimation(color), minHeight: 8)),
                          if (progress >= 1) ...[
                            const SizedBox(height: 6),
                            const Text('⚠️ تجاوزت الميزانية!', style: TextStyle(color: Color(0xFFEF4444), fontFamily: 'Cairo', fontSize: 11)),
                          ],
                        ]),
                      );
                    }),
                    const SizedBox(height: 16),
                  ],

                  // الإنفاق حسب الفئة
                  if (_spending.isNotEmpty) ...[
                    const Align(alignment: Alignment.centerRight, child: Text('الإنفاق حسب الفئة', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 15))),
                    const SizedBox(height: 10),
                    ..._spending.entries.map((e) {
                      final pct = _expenses > 0 ? (e.value / _expenses * 100) : 0.0;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFF1E293B))),
                        child: Column(children: [
                          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                            Text(e.key, style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontSize: 13)),
                            Text('${e.value.toStringAsFixed(0)} $_currency (${pct.toStringAsFixed(0)}%)', style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 12)),
                          ]),
                          const SizedBox(height: 6),
                          ClipRRect(borderRadius: BorderRadius.circular(3), child: LinearProgressIndicator(value: pct / 100, backgroundColor: const Color(0xFF1E293B), valueColor: const AlwaysStoppedAnimation(Color(0xFF3B7EF6)), minHeight: 5)),
                        ]),
                      );
                    }),
                  ],
                ]),
              ),
            ),
    );
  }

  Widget _summaryCard(String label, double value, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withValues(alpha: 0.2))),
      child: Column(children: [
        FittedBox(child: Text('${value.toStringAsFixed(0)}', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 16, fontFamily: 'Cairo'))),
        Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo')),
      ]),
    );
  }

  Widget _ruleRow(String label, double amount, Color color, String currency) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 12)),
      Text('${amount.toStringAsFixed(0)} $currency', style: TextStyle(color: color, fontFamily: 'Cairo', fontWeight: FontWeight.w900)),
    ]);
  }
}
