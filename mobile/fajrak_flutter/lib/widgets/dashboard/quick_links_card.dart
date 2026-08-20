import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

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
            child: _buildCard(context, 'nav_debts'.tr(), Icons.credit_card, totalDebt,
                AppColors.error, '/debts')),
        const SizedBox(width: 8),
        Expanded(
            child: _buildCard(context, 'nav_investments'.tr(), Icons.show_chart, invValue,
                AppColors.success, '/investments')),
        const SizedBox(width: 8),
        Expanded(
            child: _buildCard(context, 'nav_goals'.tr(), Icons.track_changes, goalsSaved,
                AppColors.primary, '/goals')),
      ],
    );
  }

  Widget _buildCard(BuildContext context, String title, IconData icon,
      double value, Color color, String route) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, route),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isDark ? color.withValues(alpha: 0.1) : color.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: isDark ? 0.2 : 0.15)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(height: 6),
            FittedBox(
              child: Text(
                '${value.toStringAsFixed(0)} $currency',
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w900,
                    fontSize: 14),
              ),
            ),
            Text(title,
                style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 10)),
          ],
        ),
      ),
    );
  }
}
