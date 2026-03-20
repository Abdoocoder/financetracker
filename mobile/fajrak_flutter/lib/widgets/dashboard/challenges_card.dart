import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ChallengesCard extends StatefulWidget {
  final String currency;
  const ChallengesCard({super.key, required this.currency});
  @override
  State<ChallengesCard> createState() => _ChallengesCardState();
}

class _ChallengesCardState extends State<ChallengesCard> {
  bool _loading = true;
  double _income = 0, _expenses = 0, _net = 0;
  double _foodSpending = 0, _entertainmentSpending = 0, _prevExpenses = 0;
  int? _activeChallenge;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    final now = DateTime.now();
    final firstDay = DateTime(now.year, now.month, 1).toIso8601String().split('T')[0];
    final lastDay = DateTime(now.year, now.month + 1, 0).toIso8601String().split('T')[0];
    final prevFirst = DateTime(now.year, now.month - 1, 1).toIso8601String().split('T')[0];
    final prevLast = DateTime(now.year, now.month, 0).toIso8601String().split('T')[0];

    final results = await Future.wait<dynamic>([
      Supabase.instance.client.from('transactions').select('type, amount, category')
          .eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', lastDay),
      Supabase.instance.client.from('transactions').select('type, amount')
          .eq('user_id', user.id).eq('type', 'expense')
          .gte('transaction_date', prevFirst).lte('transaction_date', prevLast),
      Supabase.instance.client.from('profiles').select('monthly_income').eq('id', user.id).single(),
    ]);

    final txs = results[0] as List;
    final prevTxs = results[1] as List;
    final profile = results[2] as Map<String, dynamic>;

    double income = 0, expenses = 0, food = 0, entertainment = 0;
    for (final tx in txs) {
      final amount = (tx['amount'] as num).toDouble();
      if (tx['type'] == 'income') income += amount;
      else {
        expenses += amount;
        final cat = tx['category'] as String? ?? '';
        if (cat.contains('طعام') || cat.contains('food')) food += amount;
        if (cat.contains('ترفيه') || cat.contains('entertain')) entertainment += amount;
      }
    }

    final profileIncome = (profile['monthly_income'] as num?)?.toDouble() ?? 0;
    final prevExp = prevTxs.fold(0.0, (a, t) => a + (t['amount'] as num).toDouble());

    if (mounted) setState(() {
      _income = income > 0 ? income : profileIncome;
      _expenses = expenses;
      _net = _income - expenses;
      _foodSpending = food;
      _entertainmentSpending = entertainment;
      _prevExpenses = prevExp;
      _loading = false;
    });
  }

  double _getProgress(int id) {
    switch (id) {
      case 1: return _foodSpending == 0 ? 100 : (100 - (_foodSpending / 50 * 100)).clamp(0, 100);
      case 2: final t = _income * 0.1; return t > 0 ? (_net / t * 100).clamp(0, 100) : 0;
      case 3: return _prevExpenses > 0 ? ((_prevExpenses - _expenses) / _prevExpenses * 100).clamp(0, 100) : 0;
      case 4: return _entertainmentSpending == 0 ? 100 : 0;
      default: return 0;
    }
  }

  final _challenges = [
    {'id': 1, 'icon': '🍔', 'title': 'أسبوع بدون مطاعم',         'days': 7},
    {'id': 2, 'icon': '💰', 'title': 'وفّر 10% من دخلك',          'days': 30},
    {'id': 3, 'icon': '📉', 'title': 'أنفق أقل من الشهر الماضي', 'days': 30},
    {'id': 4, 'icon': '🎯', 'title': 'صفر مصاريف غير ضرورية',     'days': 14},
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFF1E293B))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('🏆 تحديات الادخار', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 14)),
          if (_activeChallenge != null)
            GestureDetector(onTap: () => setState(() => _activeChallenge = null),
              child: const Text('الكل', style: TextStyle(color: Color(0xFF64748B), fontSize: 12, fontFamily: 'Cairo'))),
        ]),
        const SizedBox(height: 16),
        if (_loading)
          const Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6), strokeWidth: 2))
        else if (_activeChallenge != null) ...[
          // عرض التحدي المفصّل
          Builder(builder: (_) {
            final c = _challenges.firstWhere((c) => c['id'] == _activeChallenge);
            final pct = _getProgress(_activeChallenge!);
            return Column(children: [
              Text(c['icon'] as String, style: const TextStyle(fontSize: 40)),
              const SizedBox(height: 8),
              Text(c['title'] as String, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 14)),
              const SizedBox(height: 4),
              Text('${c['days']} يوم', style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 12)),
              const SizedBox(height: 12),
              ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(
                value: pct / 100, backgroundColor: const Color(0xFF1E293B),
                valueColor: AlwaysStoppedAnimation(pct >= 100 ? const Color(0xFF10B981) : const Color(0xFF3B7EF6)),
                minHeight: 10,
              )),
              const SizedBox(height: 6),
              Text('${pct.toStringAsFixed(0)}%', style: TextStyle(
                color: pct >= 100 ? const Color(0xFF10B981) : const Color(0xFF3B7EF6),
                fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 18,
              )),
            ]);
          }),
        ] else ...[
          // عرض شبكة التحديات
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 1.1),
            itemCount: _challenges.length,
            itemBuilder: (_, i) {
              final c = _challenges[i];
              final pct = _getProgress(c['id'] as int);
              final color = pct >= 100 ? const Color(0xFF10B981) : const Color(0xFF3B7EF6);
              return GestureDetector(
                onTap: () => setState(() => _activeChallenge = c['id'] as int),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withOpacity(0.2))),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(c['icon'] as String, style: const TextStyle(fontSize: 22)),
                    const SizedBox(height: 6),
                    Text(c['title'] as String, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700, fontFamily: 'Cairo'), maxLines: 2),
                    const Spacer(),
                    ClipRRect(borderRadius: BorderRadius.circular(2), child: LinearProgressIndicator(
                      value: pct / 100, backgroundColor: const Color(0xFF0F1629),
                      valueColor: AlwaysStoppedAnimation(color), minHeight: 4,
                    )),
                    const SizedBox(height: 4),
                    Text('${pct >= 100 ? '✅ ' : ''}${pct.toStringAsFixed(0)}%',
                      style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w900, fontFamily: 'Cairo')),
                  ]),
                ),
              );
            },
          ),
        ],
      ]),
    );
  }
}
