import '../../utils/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class BudgetSummaryCard extends StatelessWidget {
  final double income;
  final double totalDebtPayments;
  final double available;
  final double totalBudgeted;
  final double totalSpent;
  final String currency;
  final ColorScheme colorScheme;

  const BudgetSummaryCard({
    super.key,
    required this.income,
    required this.totalDebtPayments,
    required this.available,
    required this.totalBudgeted,
    required this.totalSpent,
    required this.currency,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: colorScheme.outlineVariant)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('dash_summary_month'.tr(),
            style: TextStyle(
                color: colorScheme.onSurfaceVariant,
                fontSize: 12,
                fontWeight: FontWeight.w900)),
        const SizedBox(height: 12),
        _summaryRow(
            'dash_income'.tr(),
            '+${income.toStringAsFixed(0)} $currency',
            AppColors.successLight),
        if (totalDebtPayments > 0)
          _summaryRow(
              'dash_debts_payment'.tr(),
              '-${totalDebtPayments.toStringAsFixed(0)} $currency',
              AppColors.errorLight),
        Divider(color: colorScheme.outlineVariant, height: 20),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('dash_available_spending'.tr(),
              style: TextStyle(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w900)),
          Text('${available.toStringAsFixed(0)} $currency',
              style: TextStyle(
                  color: available >= 0
                      ? AppColors.successLight
                      : AppColors.errorLight,
                  fontWeight: FontWeight.w900,
                  fontSize: 18)),
        ]),
        if (totalBudgeted > 0) ...[
          const SizedBox(height: 10),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('dash_spent_from_categories'.tr(),
                style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 11)),
            Text(
                '${totalSpent.toStringAsFixed(0)} / ${totalBudgeted.toStringAsFixed(0)} $currency',
                style: TextStyle(
                    color: totalSpent > totalBudgeted
                        ? colorScheme.error
                        : colorScheme.onSurfaceVariant,
                    fontSize: 11,
                    fontWeight: FontWeight.w700)),
          ]),
          const SizedBox(height: 6),
          Semantics(
            value: totalBudgeted > 0
                ? '${(totalSpent / totalBudgeted * 100).clamp(0.0, 100.0).toStringAsFixed(0)}%'
                : '0%',
            child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                    value: totalBudgeted > 0
                        ? (totalSpent / totalBudgeted).clamp(0.0, 1.0)
                        : 0,
                    backgroundColor: colorScheme.outlineVariant,
                    color: totalSpent > totalBudgeted
                        ? colorScheme.error
                        : colorScheme.primary,
                    minHeight: 8)),
          ),
        ],
      ]),
    );
  }

  Widget _summaryRow(String label, String value, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label,
            style: TextStyle(
                color: colorScheme.onSurfaceVariant,
                fontSize: 13)),
        Text(value,
            style: TextStyle(
                color: color,
                fontWeight: FontWeight.w700,
                fontSize: 13)),
      ]),
    );
  }
}
