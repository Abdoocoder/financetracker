import 'package:flutter/material.dart';

class BadgesGrid extends StatelessWidget {
  final int score;
  final int txCount;
  final int paidDebts;
  final int reachedGoals;
  final int streak;
  final bool hasInvestments;

  const BadgesGrid({
    super.key,
    required this.score,
    required this.txCount,
    required this.paidDebts,
    required this.reachedGoals,
    required this.streak,
    required this.hasInvestments,
  });

  @override
  Widget build(BuildContext context) {
    final badges = [
      {
        'id': 'first_step',
        'icon': Icons.flag,
        'title': 'الخطوة الأولى',
        'desc': 'أول معاملة',
        'done': txCount >= 1
      },
      {
        'id': 'saver',
        'icon': Icons.account_balance_wallet,
        'title': 'المدخر المثابر',
        'desc': '5 معاملات',
        'done': txCount >= 5
      },
      {
        'id': 'debt_crusher',
        'icon': Icons.gavel,
        'title': 'قاهر الديون',
        'desc': 'سداد أول دين',
        'done': paidDebts >= 1
      },
      {
        'id': 'investor',
        'icon': Icons.show_chart,
        'title': 'المستثمر الذكي',
        'desc': 'أول استثمار',
        'done': hasInvestments
      },
      {
        'id': 'goal_reacher',
        'icon': Icons.emoji_events,
        'title': 'محقق الأحلام',
        'desc': 'تحقيق أول هدف',
        'done': reachedGoals >= 1
      },
      {
        'id': 'scholar',
        'icon': Icons.menu_book,
        'title': 'المتعلم المواظب',
        'desc': '7 أيام متتالية',
        'done': streak >= 7
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          child: Text('الشارات المستحقة',
              style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontFamily: 'Cairo',
                  fontSize: 13)),
        ),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 0.85,
          ),
          itemCount: badges.length,
          itemBuilder: (context, index) {
            final b = badges[index];
            final bool isDone = b['done'] as bool;
            return Container(
              decoration: BoxDecoration(
                color: const Color(0xFF0F1629),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: isDone
                        ? const Color(0xFF10B981).withValues(alpha: 0.3)
                        : const Color(0xFF1E293B)),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Opacity(
                    opacity: isDone ? 1.0 : 0.2,
                    child: Icon(b['icon'] as IconData,
                        size: 28,
                        color: isDone ? const Color(0xFF10B981) : const Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 6),
                  Text(b['title'] as String,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color:
                              isDone ? Colors.white : const Color(0xFF64748B),
                          fontWeight: FontWeight.w700,
                          fontSize: 10,
                          fontFamily: 'Cairo')),
                  Text(b['desc'] as String,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          color: Color(0xFF475569),
                          fontSize: 8,
                          fontFamily: 'Cairo')),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}
