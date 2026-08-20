import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

class PortfolioSummaryCard extends StatelessWidget {
  final double totalValue;
  final double totalCost;
  final bool showInUsd;
  final double jodRate;
  final int assetsCount;
  final int halalCount;

  const PortfolioSummaryCard({
    super.key,
    required this.totalValue,
    required this.totalCost,
    required this.showInUsd,
    required this.jodRate,
    required this.assetsCount,
    required this.halalCount,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final gain = totalValue - totalCost;
    final gainPct = totalCost > 0 ? (gain / totalCost * 100) : 0.0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [
          colorScheme.primary.withValues(alpha: 0.15),
          colorScheme.secondary.withValues(alpha: 0.15)
        ]),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.primary.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Text('inv_total_value'.tr(),
            style: TextStyle(
                color: colorScheme.onSurfaceVariant,
                fontSize: 13)),
        const SizedBox(height: 8),
        Text(
          showInUsd
              ? '\$${totalValue.toStringAsFixed(2)}'
              : '${(totalValue * jodRate).toStringAsFixed(2)} JOD',
          style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 32,
              fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 8),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(gain >= 0 ? Icons.trending_up : Icons.trending_down,
              color:
                  gain >= 0 ? AppColors.success : AppColors.error,
              size: 18),
          const SizedBox(width: 6),
          Text(
              '${gain >= 0 ? '+' : ''}\$${gain.toStringAsFixed(2)} (${gainPct.toStringAsFixed(1)}%)',
              style: TextStyle(
                  color: gain >= 0
                      ? AppColors.success
                      : AppColors.error,
                  fontWeight: FontWeight.w700)),
        ]),
        const SizedBox(height: 12),
        Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
          _miniStat(
              context,
              'inv_cost'.tr(),
              '\$${totalCost.toStringAsFixed(0)}',
              colorScheme.onSurfaceVariant),
          _miniStat(
              context, 'inv_assets'.tr(), '$assetsCount', colorScheme.primary),
          _miniStat(context, 'inv_halal'.tr(), '$halalCount',
              AppColors.success),
        ]),
      ]),
    );
  }

  Widget _miniStat(
      BuildContext context, String label, String value, Color color) {
    return Column(children: [
      Text(value,
          style: TextStyle(
              color: color,
              fontWeight: FontWeight.w900,
              fontSize: 16)),
      Text(label,
          style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontSize: 11)),
    ]);
  }
}
