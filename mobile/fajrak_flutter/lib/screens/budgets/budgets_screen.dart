import 'package:flutter/material.dart';
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
  Map<String, double> _categories = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    final now = DateTime.now();
    final firstDay = DateTime(now.year, now.month, 1).toIso8601String().split('T')[0];
    final lastDay = DateTime(now.year, now.month + 1, 0).toIso8601String().split('T')[0];

    final results = await Future.wait<dynamic>([
      Supabase.instance.client.from('profiles').select('monthly_income, currency').eq('id', user.id).single(),
      Supabase.instance.client.from('transactions').select('type, amount, category').eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', lastDay),
    ]);

    final profile = results[0] as Map<String, dynamic>;
    final txs = results[1] as List<dynamic>;

    double income = 0, expenses = 0;
    final Map<String, double> cats = {};

    for (final tx in txs) {
      if (tx['type'] == 'income') {
        income += (tx['amount'] as num).toDouble();
      } else {
        expenses += (tx['amount'] as num).toDouble();
        final cat = tx['category'] as String? ?? 'أخرى';
        cats[cat] = (cats[cat] ?? 0) + (tx['amount'] as num).toDouble();
      }
    }

    final profileIncome = (profile['monthly_income'] as num?)?.toDouble() ?? 0;

    setState(() {
      _currency = profile['currency'] as String? ?? 'JOD';
      _income = income > 0 ? income : profileIncome;
      _expenses = expenses;
      _categories = Map.fromEntries(cats.entries.toList()..sort((a, b) => b.value.compareTo(a.value)));
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final spent = _income > 0 ? (_expenses / _income * 100).clamp(0.0, 100.0) : 0.0;
    final remaining = _income - _expenses;

    return Scaffold(
      appBar: AppBar(backgroundColor: const Color(0xFF070B14), title: const Text('الميزانية', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, color: Colors.white)), iconTheme: const IconThemeData(color: Colors.white)),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
          : RefreshIndicator(
              onRefresh: _load,
              color: const Color(0xFF3B7EF6),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F1629),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('الميزانية الشهرية', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontFamily: 'Cairo', fontSize: 16)),
                              Text('${spent.toStringAsFixed(0)}% منفق', style: TextStyle(
                                color: spent > 90 ? const Color(0xFFEF4444) : spent > 70 ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
                                fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                              )),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: LinearProgressIndicator(
                              value: spent / 100,
                              backgroundColor: const Color(0xFF1E293B),
                              valueColor: AlwaysStoppedAnimation<Color>(
                                spent > 90 ? const Color(0xFFEF4444) : spent > 70 ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
                              ),
                              minHeight: 10,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('الدخل: ${_income.toStringAsFixed(0)} $_currency', style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 13)),
                              Text('المتبقي: ${remaining.toStringAsFixed(0)} $_currency', style: TextStyle(
                                color: remaining >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w700,
                              )),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Align(
                      alignment: Alignment.centerRight,
                      child: Text('توزيع المصاريف', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontFamily: 'Cairo', fontSize: 16)),
                    ),
                    const SizedBox(height: 12),
                    ..._categories.entries.map((e) => _categoryBar(e.key, e.value)),
                    if (_categories.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(40),
                        child: const Text('لا توجد مصاريف هذا الشهر', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
                      ),
                  ],
                ),
              ),
            ),
    );
  }

  final List<Color> _colors = [
    const Color(0xFF3B7EF6),
    const Color(0xFF8B5CF6),
    const Color(0xFFEF4444),
    const Color(0xFFF59E0B),
    const Color(0xFF10B981),
  ];

  Widget _categoryBar(String category, double amount) {
    final pct = _expenses > 0 ? (amount / _expenses) : 0.0;
    final colorIndex = _categories.keys.toList().indexOf(category) % _colors.length;
    final color = _colors[colorIndex];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(category, style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontSize: 13)),
              Text('${amount.toStringAsFixed(0)} $_currency', style: TextStyle(color: color, fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct.clamp(0.0, 1.0),
              backgroundColor: const Color(0xFF1E293B),
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }
}
