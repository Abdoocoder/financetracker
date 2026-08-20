import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

class BudgetRuleCard extends StatelessWidget {
  final double available;
  final String currency;
  final ColorScheme colorScheme;
  final VoidCallback onApply;

  const BudgetRuleCard({
    super.key,
    required this.available,
    required this.currency,
    required this.colorScheme,
    required this.onApply,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [
          colorScheme.primary.withValues(alpha: 0.08),
          colorScheme.secondary.withValues(alpha: 0.06)
        ]),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.primary.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Icon(Icons.balance, size: 18, color: colorScheme.primary),
            const SizedBox(width: 8),
            Expanded(
                child: Text('dash_rule_503020'.tr(),
                    style: TextStyle(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.w900,
                        fontSize: 13))),
            GestureDetector(
              onTap: onApply,
              child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                      color: colorScheme.primary,
                      borderRadius: BorderRadius.circular(8)),
                  child: Text('dash_rule_apply'.tr(),
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w700))),
            ),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
          child: Row(children: [
            Expanded(
                child: _rule502030Item(
                    '50%',
                    'dash_rule_necessities'.tr(),
                    (available * 0.5).round().toDouble(),
                    colorScheme.primary)),
            const SizedBox(width: 8),
            Expanded(
                child: _rule502030Item(
                    '30%',
                    'dash_rule_wants'.tr(),
                    (available * 0.3).round().toDouble(),
                    colorScheme.secondary)),
            const SizedBox(width: 8),
            Expanded(
                child: _rule502030Item(
                    '20%',
                    'dash_rule_savings'.tr(),
                    (available * 0.2).round().toDouble(),
                    AppColors.success)),
          ]),
        ),
      ]),
    );
  }

  Widget _rule502030Item(String pct, String label, double amount, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
          color: color.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.15))),
      child: Column(children: [
        Text(pct,
            style: TextStyle(
                color: color,
                fontWeight: FontWeight.w900,
                fontSize: 16)),
        Text(amount.toStringAsFixed(0),
            style: TextStyle(
                color: colorScheme.onSurface,
                fontWeight: FontWeight.w800,
                fontSize: 10)),
        Text(label,
            style: TextStyle(
                color: colorScheme.onSurfaceVariant.withValues(alpha: 0.8),
                fontSize: 11),
            textAlign: TextAlign.center),
      ]),
    );
  }
}
