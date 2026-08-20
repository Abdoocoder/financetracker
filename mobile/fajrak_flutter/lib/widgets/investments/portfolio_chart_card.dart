import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

class PortfolioChartCard extends StatelessWidget {
  final List<Map<String, dynamic>> investments;
  final double totalValue;

  const PortfolioChartCard({
    super.key,
    required this.investments,
    required this.totalValue,
  });

  static const List<Color> _colors = [
    AppColors.primary,
    AppColors.success,
    AppColors.warning,
    AppColors.purple,
    AppColors.error
  ];

  @override
  Widget build(BuildContext context) {
    if (investments.isEmpty || totalValue <= 0) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: AppColors.surface0,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.surface2)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('inv_portfolio_chart'.tr(),
            style: TextStyle(
                color: colorScheme.onSurface,
                fontWeight: FontWeight.w900,
                fontSize: 14)),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: Row(
              children: investments.map((inv) {
            final val = (inv['shares'] as num).toDouble() *
                (inv['current_price'] as num).toDouble();
            final pct = val / totalValue * 100;
            final color = _colors[investments.indexOf(inv) % _colors.length];
            return Expanded(
                flex: pct.round() == 0 ? 1 : pct.round(),
                child: Container(
                    height: 10,
                    decoration: BoxDecoration(
                        color: color,
                        border: Border(
                            right: BorderSide(
                                color: colorScheme.surface, width: 2)))));
          }).toList()),
        ),
        const SizedBox(height: 12),
        ...investments.map((inv) {
          final val = (inv['shares'] as num).toDouble() *
              (inv['current_price'] as num).toDouble();
          final pct = totalValue > 0 ? (val / totalValue * 100) : 0.0;
          final color = _colors[investments.indexOf(inv) % _colors.length];
          return Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(children: [
              Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                      color: color, borderRadius: BorderRadius.circular(3))),
              const SizedBox(width: 8),
              Expanded(
                  child: Text(inv['symbol'] ?? '',
                      style: TextStyle(
                          color: colorScheme.onSurface,
                          fontWeight: FontWeight.w700,
                          fontSize: 13))),
              Text('${pct.toStringAsFixed(1)}%',
                  style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 12)),
              const SizedBox(width: 8),
              Text('\$${val.toStringAsFixed(0)}',
                  style: TextStyle(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w900,
                      fontSize: 13)),
            ]),
          );
        }),
      ]),
    );
  }
}
