import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class TransactionSummary extends StatelessWidget {
  final double income;
  final double expenses;
  final String currency;
  final ColorScheme colorScheme;

  const TransactionSummary({
    super.key,
    required this.income,
    required this.expenses,
    required this.currency,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        border: Border(bottom: BorderSide(color: colorScheme.outlineVariant)),
      ),
      child: Row(
        children: [
          Expanded(
              child: _statCard('trans_total_net'.tr(), income - expenses,
                  income - expenses >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                  isNet: true)),
          const SizedBox(width: 8),
          Expanded(
              child: _statCard('trans_total_expenses'.tr(), expenses, const Color(0xFFEF4444))),
          const SizedBox(width: 8),
          Expanded(
              child: _statCard('trans_total_income'.tr(), income, const Color(0xFF10B981))),
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
                  fontSize: 15,
                  fontFamily: 'Cairo'),
            ),
          ),
          Text(label,
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 10,
                  fontFamily: 'Cairo')),
        ],
      ),
    );
  }
}
