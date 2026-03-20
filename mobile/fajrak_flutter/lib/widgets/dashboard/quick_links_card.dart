import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

class QuickLinksCards extends StatelessWidget {
  final double totalDebt;
  final double invValue;
  final double goalsSaved;
  final double goalsTarget;
  final String currency;

  const QuickLinksCards({
    super.key,
    required this.totalDebt,
    required this.invValue,
    required this.goalsSaved,
    required this.goalsTarget,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
            child: _buildCard(context, 'ديون', '💳', totalDebt,
                const Color(0xFFEF4444), '/debts')),
        const SizedBox(width: 8),
        Expanded(
            child: _buildCard(context, 'استثمار', '📈', invValue,
                const Color(0xFF10B981), '/investments')),
        const SizedBox(width: 8),
        Expanded(
            child: _buildCard(context, 'ادخار', '🛡️', goalsSaved,
                const Color(0xFF3B7EF6), '/goals')),
      ],
    );
  }

  Widget _buildCard(BuildContext context, String title, String icon,
      double value, Color color, String route) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, route),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Text(icon, style: const TextStyle(fontSize: 18)),
            const SizedBox(height: 6),
            FittedBox(
                child: Text('${value.toStringAsFixed(0)} $currency',
                    style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.w900,
                        fontSize: 12,
                        fontFamily: 'Cairo'))),
            const SizedBox(height: 2),
            Text(title,
                style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 10,
                    fontFamily: 'Cairo')),
          ],
        ),
      ),
    );
  }
}
