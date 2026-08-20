import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

class TransactionSummary extends StatelessWidget {
  final double income;
  final double expenses;
  final double debtPayments;
  final String currency;
  final ColorScheme colorScheme;

  const TransactionSummary({
    super.key,
    required this.income,
    required this.expenses,
    required this.currency,
    required this.colorScheme,
    this.debtPayments = 0,
  });

  @override
  Widget build(BuildContext context) {
    final realExpenses = expenses - debtPayments;
    final net = income - expenses;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        border: Border(bottom: BorderSide(color: colorScheme.outlineVariant)),
      ),
      child: Row(
        children: [
          Expanded(
              child: _statCard('trans_total_net'.tr(), net,
                  net >= 0 ? AppColors.success : AppColors.error,
                  isNet: true)),
          const SizedBox(width: 8),
          Expanded(
              child: _expensesCard(realExpenses, debtPayments)),
          const SizedBox(width: 8),
          Expanded(
              child: _statCard('trans_total_income'.tr(), income, AppColors.success)),
        ],
      ),
    );
  }

  Widget _expensesCard(double realExpenses, double debtPayments) {
    const color = AppColors.error;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          FittedBox(
            child: Text(
              '-${realExpenses.abs().toStringAsFixed(0)}',
              style: const TextStyle(
                  color: color,
                  fontWeight: FontWeight.w900,
                  fontSize: 15),
            ),
          ),
          Text('trans_total_expenses'.tr(),
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 10)),
          if (debtPayments > 0) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(5),
              ),
              child: Column(children: [
                Text('💳 ${'dash_debt_payments'.tr()}',
                    style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 11,
                        fontWeight: FontWeight.w700)),
                FittedBox(
                  child: Text(debtPayments.toStringAsFixed(0),
                      style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w900,
                          fontSize: 11)),
                ),
              ]),
            ),
          ],
        ],
      ),
    );
  }

  Widget _statCard(String label, double value, Color color, {bool isNet = false}) {
    String sign = "";
    if (isNet) {
      sign = value > 0 ? "+" : (value < 0 ? "-" : "");
    } else {
      sign = label == 'trans_total_income'.tr() ? "+" : "-";
    }

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          FittedBox(
            child: Text(
              '$sign${value.abs().toStringAsFixed(0)}',
              style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w900,
                  fontSize: 15),
            ),
          ),
          Text(label,
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 10)),
        ],
      ),
    );
  }
}
