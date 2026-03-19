import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class InvestmentsScreen extends StatefulWidget {
  const InvestmentsScreen({super.key});

  @override
  State<InvestmentsScreen> createState() => _InvestmentsScreenState();
}

class _InvestmentsScreenState extends State<InvestmentsScreen> {
  List<Map<String, dynamic>> _investments = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final data = await Supabase.instance.client.from('investments').select('*').eq('user_id', user.id);
    setState(() { _investments = List<Map<String, dynamic>>.from(data); _loading = false; });
  }

  double get _totalValue => _investments.fold(0.0, (a, i) => a + (i['shares'] as num).toDouble() * (i['current_price'] as num).toDouble());
  double get _totalCost => _investments.fold(0.0, (a, i) => a + (i['shares'] as num).toDouble() * (i['avg_buy_price'] as num).toDouble());

  @override
  Widget build(BuildContext context) {
    final gain = _totalValue - _totalCost;
    final gainPct = _totalCost > 0 ? (gain / _totalCost * 100) : 0.0;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(title: const Text('الاستثمارات')),
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
                        gradient: LinearGradient(
                          colors: [const Color(0xFF3B7EF6).withValues(alpha: 0.2), const Color(0xFF8B5CF6).withValues(alpha: 0.2)],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF3B7EF6).withValues(alpha: 0.2)),
                      ),
                      child: Column(
                        children: [
                          const Text('قيمة المحفظة', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
                          const SizedBox(height: 8),
                          Text('\$${_totalValue.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900, fontFamily: 'Cairo')),
                          const SizedBox(height: 8),
                          Text(
                            '${gain >= 0 ? '+' : ''}${gain.toStringAsFixed(2)} (${gainPct.toStringAsFixed(1)}%)',
                            style: TextStyle(color: gain >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444), fontFamily: 'Cairo', fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    ..._investments.map((inv) => _invCard(inv)),
                    if (_investments.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(40),
                        child: const Text('لا توجد استثمارات بعد', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
                      ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _invCard(Map<String, dynamic> inv) {
    final shares = (inv['shares'] as num).toDouble();
    final avgPrice = (inv['avg_buy_price'] as num).toDouble();
    final currentPrice = (inv['current_price'] as num).toDouble();
    final value = shares * currentPrice;
    final cost = shares * avgPrice;
    final gain = value - cost;
    final gainPct = cost > 0 ? (gain / cost * 100) : 0.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1629),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Row(
        children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: const Color(0xFF3B7EF6).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
            child: Center(child: Text(inv['symbol']?.toString().substring(0, 1) ?? '?', style: const TextStyle(color: Color(0xFF3B7EF6), fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 18))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(inv['symbol'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontFamily: 'Cairo')),
              Text('${shares.toStringAsFixed(4)} سهم', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontFamily: 'Cairo')),
            ]),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('\$${value.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontFamily: 'Cairo')),
            Text('${gain >= 0 ? '+' : ''}${gainPct.toStringAsFixed(1)}%', style: TextStyle(color: gain >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444), fontSize: 12, fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
          ]),
        ],
      ),
    );
  }
}
