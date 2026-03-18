import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';


class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _loading = true;
  double _income = 0, _expenses = 0, _net = 0;
  String _currency = 'JOD';
  String _name = '';
  List<Map<String, dynamic>> _recentTx = [];

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
      Supabase.instance.client.from('profiles').select('full_name, monthly_income, currency').eq('id', user.id).single(),
      Supabase.instance.client.from('transactions').select('type, amount').eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', lastDay),
      Supabase.instance.client.from('transactions').select('id, type, amount, category, description, transaction_date').eq('user_id', user.id).order('transaction_date', ascending: false).limit(5),
    ]);

    final profile = results[0] as Map<String, dynamic>;
    final txs = results[1] as List<dynamic>;
    final recent = results[2] as List<dynamic>;

    double txIncome = 0, txExpenses = 0;
    for (final tx in txs) {
      if (tx['type'] == 'income') txIncome += (tx['amount'] as num).toDouble();
      else txExpenses += (tx['amount'] as num).toDouble();
    }

    final profileIncome = (profile['monthly_income'] as num?)?.toDouble() ?? 0;

    setState(() {
      _name = (profile['full_name'] as String?)?.split(' ').first ?? '';
      _currency = profile['currency'] as String? ?? 'JOD';
      _income = txIncome > 0 ? txIncome : profileIncome;
      _expenses = txExpenses;
      _net = _income - _expenses;
      _recentTx = recent.cast<Map<String, dynamic>>();
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
            : RefreshIndicator(
                onRefresh: _load,
                color: const Color(0xFF3B7EF6),
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildHeader(),
                      const SizedBox(height: 24),
                      _buildStatCards(),
                      const SizedBox(height: 20),
                      _buildRecentTransactions(),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildHeader() {
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور';
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$greeting $_name 👋', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
            const Text('ملخص هذا الشهر', style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
          ],
        ),
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF3B7EF6), Color(0xFF8B5CF6)]),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Center(child: Text('ف', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo'))),
        ),
      ],
    );
  }

  Widget _buildStatCards() {
    return Row(
      children: [
        Expanded(child: _statCard('الدخل', _income, const Color(0xFF10B981), const Color(0xFF064E3B), '↑')),
        const SizedBox(width: 8),
        Expanded(child: _statCard('المصاريف', _expenses, const Color(0xFFEF4444), const Color(0xFF7F1D1D), '↓')),
        const SizedBox(width: 8),
        Expanded(child: _statCard('الصافي', _net, _net >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444), _net >= 0 ? const Color(0xFF064E3B) : const Color(0xFF7F1D1D), '=')),
      ],
    );
  }

  Widget _statCard(String label, double value, Color color, Color bg, String icon) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Text(icon, style: TextStyle(color: color, fontSize: 14)),
          const SizedBox(height: 4),
          FittedBox(child: Text('${value.toStringAsFixed(0)}+', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 18, fontFamily: 'Cairo'))),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontFamily: 'Cairo')),
        ],
      ),
    );
  }

  Widget _buildRecentTransactions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('آخر المعاملات', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white, fontFamily: 'Cairo')),
        const SizedBox(height: 12),
        ..._recentTx.map((tx) => _txItem(tx)),
        if (_recentTx.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            alignment: Alignment.center,
            child: const Text('لا توجد معاملات بعد', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
          ),
      ],
    );
  }

  Widget _txItem(Map<String, dynamic> tx) {
    final isIncome = tx['type'] == 'income';
    final amount = (tx['amount'] as num).toDouble();
    return Container(
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
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: isIncome ? const Color(0xFF064E3B) : const Color(0xFF7F1D1D),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(child: Text(isIncome ? '💰' : '💸', style: const TextStyle(fontSize: 18))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tx['description'] ?? tx['category'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontFamily: 'Cairo', fontSize: 13)),
                Text(tx['category'] ?? '', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontFamily: 'Cairo')),
              ],
            ),
          ),
          Text(
            '${isIncome ? '+' : '−'}${amount.toStringAsFixed(0)} $_currency',
            style: TextStyle(color: isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444), fontWeight: FontWeight.w900, fontFamily: 'Cairo'),
          ),
        ],
      ),
    );
  }
}
