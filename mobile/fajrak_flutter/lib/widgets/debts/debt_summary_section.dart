import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

class DebtSummarySection extends StatelessWidget {
  final double totalRemaining;
  final double totalOriginal;
  final double totalMonthly;
  final String currency;
  final double lifeTimePaid;
  final int paidCount;

  const DebtSummarySection({
    super.key,
    required this.totalRemaining,
    required this.totalOriginal,
    required this.totalMonthly,
    required this.currency,
    required this.lifeTimePaid,
    required this.paidCount,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final paidPct = totalOriginal > 0
        ? ((totalOriginal - totalRemaining) / totalOriginal * 100)
        : 0.0;

    return Column(
      children: [
        // Summary stats cards
        Row(children: [
          Expanded(
              child: _statCard(
                  'debts_total_remaining'.tr(),
                  '${totalRemaining.toStringAsFixed(0)} $currency',
                  AppColors.error,
                  cs)),
          const SizedBox(width: 8),
          Expanded(
              child: _statCard(
                  'debts_paid'.tr(),
                  '${paidPct.toStringAsFixed(0)}%',
                  AppColors.success,
                  cs)),
          const SizedBox(width: 8),
          Expanded(
              child: _statCard(
                  'debts_monthly_total'.tr(),
                  '${totalMonthly.toStringAsFixed(0)} $currency',
                  AppColors.warning,
                  cs)),
        ]),
        const SizedBox(height: 12),

        // Life-time paid badge
        if (lifeTimePaid > 0)
          Container(
            padding: const EdgeInsets.all(14),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: AppColors.success.withValues(alpha: 0.2))),
            child: Row(children: [
              const Icon(Icons.emoji_events, size: 28, color: AppColors.success),
              const SizedBox(width: 12),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('debts_total_paid_life'.tr(),
                    style: TextStyle(
                        color: cs.onSurfaceVariant,
                        fontSize: 12)),
                Text('${lifeTimePaid.toStringAsFixed(0)} $currency',
                    style: const TextStyle(
                        color: AppColors.successLight,
                        fontSize: 18,
                        fontWeight: FontWeight.w900)),
              ]),
              const Spacer(),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('debts_paid_count'.tr(),
                    style: TextStyle(
                        color: cs.onSurfaceVariant,
                        fontSize: 11)),
                Row(mainAxisSize: MainAxisSize.min, children: [
                  Text('$paidCount ',
                      style: const TextStyle(
                          color: AppColors.successLight,
                          fontSize: 16,
                          fontWeight: FontWeight.w900)),
                  const Icon(Icons.check_circle_outline, size: 16, color: AppColors.successLight),
                ]),
              ]),
            ]),
          ),

        // Overall progress
        Container(
          padding: const EdgeInsets.all(14),
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
              color: cs.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: cs.outlineVariant)),
          child: Column(children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('debts_overall_progress'.tr(),
                  style: TextStyle(
                      color: cs.onSurfaceVariant,
                      fontSize: 12,
                      fontWeight: FontWeight.w700)),
              Text('${paidPct.toStringAsFixed(1)}%',
                  style: const TextStyle(
                      color: AppColors.successLight,
                      fontSize: 12,
                      fontWeight: FontWeight.w900)),
            ]),
            const SizedBox(height: 8),
            Semantics(
              value: '${paidPct.toStringAsFixed(0)}%',
              child: ClipRRect(
                  borderRadius: BorderRadius.circular(5),
                  child: LinearProgressIndicator(
                      value: (paidPct / 100).clamp(0.0, 1.0),
                      backgroundColor: cs.outlineVariant,
                      color: AppColors.success,
                      minHeight: 10)),
            ),
            const SizedBox(height: 6),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(
                  'debts_paid_amount'.tr(args: [
                    (totalOriginal - totalRemaining).toStringAsFixed(0),
                    currency
                  ]),
                  style: TextStyle(
                      color: cs.onSurfaceVariant,
                      fontSize: 10)),
              Text(
                  'debts_original_amount_label'
                      .tr(args: [totalOriginal.toStringAsFixed(0), currency]),
                  style: TextStyle(
                      color: cs.onSurfaceVariant,
                      fontSize: 10)),
            ]),
          ]),
        ),
      ],
    );
  }

  Widget _statCard(String label, String value, Color color, ColorScheme cs) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
          color: cs.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: cs.outlineVariant)),
      child: Column(children: [
        Text(value,
            style: TextStyle(
                color: color,
                fontSize: 14,
                fontWeight: FontWeight.w900)),
        const SizedBox(height: 4),
        Text(label,
            style: TextStyle(
                color: cs.onSurfaceVariant, fontSize: 10),
            textAlign: TextAlign.center),
      ]),
    );
  }
}
