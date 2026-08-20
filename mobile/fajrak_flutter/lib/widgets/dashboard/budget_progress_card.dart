import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

class BudgetProgressCard extends StatelessWidget {
  final double income;
  final double expenses;
  final String currency;

  const BudgetProgressCard({
    super.key,
    required this.income,
    required this.expenses,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final double remaining = income - expenses;
    final double percentage =
        income > 0 ? (expenses / income).clamp(0.0, 1.0) : 0.0;
    final isDark = theme.brightness == Brightness.dark;
    final Color progressColor = percentage > 0.9
        ? (isDark ? AppColors.error : const Color(0xFFDC2626))
        : percentage > 0.7
            ? (isDark ? AppColors.warning : const Color(0xFFD97706))
            : (isDark ? AppColors.success : AppColors.successDark);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('dash_summary_month'.tr(),
                  style: TextStyle(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w900,
                      fontSize: 14)),
              Text(
                  '${percentage >= 1 ? 0 : remaining.toStringAsFixed(0)} $currency ${"goals_remaining".tr()}',
                  style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 12)),
            ],
          ),
          const SizedBox(height: 16),
          Semantics(
            value: '${(percentage * 100).toStringAsFixed(0)}%',
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: percentage,
                backgroundColor: colorScheme.outlineVariant,
                color: progressColor,
                minHeight: 10,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${"trans_expense".tr()}: ${expenses.toStringAsFixed(0)} $currency',
                  style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 11)),
              Text('${"trans_income".tr()}: ${income.toStringAsFixed(0)} $currency',
                  style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }
}
