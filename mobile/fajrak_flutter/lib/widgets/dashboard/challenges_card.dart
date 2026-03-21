import 'package:flutter/material.dart';

class ChallengesCard extends StatefulWidget {
  final double expensesFood;
  final double expectedFoodLimit;
  final double income;
  final double net;
  final double prevExpenses;
  final double currentExpenses;
  final double expensesEntertainment;
  final String currency;

  const ChallengesCard({
    super.key,
    required this.expensesFood,
    required this.income,
    required this.net,
    required this.prevExpenses,
    required this.currentExpenses,
    required this.expensesEntertainment,
    required this.currency,
    this.expectedFoodLimit = 50.0,
  });

  @override
  State<ChallengesCard> createState() => _ChallengesCardState();
}

class _ChallengesCardState extends State<ChallengesCard> {
  int? _activeChallenge;

  double _getProgress(int id) {
    if (id == 1) {
      if (widget.expensesFood == 0) return 100.0;
      return (100.0 - (widget.expensesFood / widget.expectedFoodLimit * 100))
          .clamp(0.0, 100.0);
    }
    if (id == 2) {
      final target = widget.income * 0.1;
      if (target <= 0) return 0.0;
      return ((widget.net / target) * 100).clamp(0.0, 100.0);
    }
    if (id == 3) {
      final p = widget.prevExpenses;
      if (p <= 0) return 0.0;
      return (((p - widget.currentExpenses) / p) * 100).clamp(0.0, 100.0);
    }
    if (id == 4) {
      return widget.expensesEntertainment == 0 ? 100.0 : 0.0;
    }
    return 0.0;
  }

  final _challenges = [
    {'id': 1, 'icon': '🍔', 'title': 'أسبوع بدون مطاعم', 'days': 7},
    {'id': 2, 'icon': '💰', 'title': 'وفّر 10% من دخلك', 'days': 30},
    {'id': 3, 'icon': '📉', 'title': 'أنفق أقل من الشهر الماضي', 'days': 30},
    {'id': 4, 'icon': '🎯', 'title': 'صفر مصاريف غير ضرورية', 'days': 14},
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1629),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('🏆 تحديات الادخار',
                  style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'Cairo',
                      fontSize: 14)),
              if (_activeChallenge != null)
                GestureDetector(
                  onTap: () => setState(() => _activeChallenge = null),
                  child: Text('الكل',
                      style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 12,
                          fontFamily: 'Cairo')),
                )
            ],
          ),
          const SizedBox(height: 16),
          _activeChallenge != null ? _buildActiveChallenge() : _buildGrid(),
        ],
      ),
    );
  }

  Widget _buildActiveChallenge() {
    final active = _challenges.firstWhere((c) => c['id'] == _activeChallenge);
    final pct = _getProgress(active['id'] as int);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        children: [
          Text(active['icon'] as String, style: const TextStyle(fontSize: 36)),
          const SizedBox(height: 8),
          Text(active['title'] as String,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Cairo')),
          const SizedBox(height: 4),
          Text('${active['days']} يوم',
              style: const TextStyle(
                  color: Color(0xFF94A3B8), fontSize: 12, fontFamily: 'Cairo')),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct / 100,
              backgroundColor: const Color(0xFF1E293B),
              color: const Color(0xFF3B7EF6),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 6),
          Text('${pct.toStringAsFixed(0)}%',
              style: const TextStyle(
                  color: Color(0xFF93C5FD),
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'monospace')),
        ],
      ),
    );
  }

  Widget _buildGrid() {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 0.85,
      children: _challenges.map((c) {
        final pct = _getProgress(c['id'] as int);
        final isCompleted = pct >= 100;
        final color =
            isCompleted ? const Color(0xFF10B981) : const Color(0xFF3B7EF6);

        return GestureDetector(
          onTap: () => setState(() => _activeChallenge = c['id'] as int),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(c['icon'] as String, style: const TextStyle(fontSize: 22)),
                const SizedBox(height: 6),
                Expanded(
                  child: Text(
                    c['title'] as String,
                    style: const TextStyle(
                        color: Color(0xFFCBD5E1),
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'Cairo',
                        height: 1.3),
                    textAlign: TextAlign.right,
                  ),
                ),
                ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(
                    value: pct / 100,
                    backgroundColor: const Color(0xFF1E293B),
                    color: color,
                    minHeight: 4,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${isCompleted ? '✅ ' : ''}${pct.toStringAsFixed(0)}%',
                  style: TextStyle(
                      color: isCompleted
                          ? const Color(0xFF6EE7B7)
                          : const Color(0xFF93C5FD),
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'monospace'),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
