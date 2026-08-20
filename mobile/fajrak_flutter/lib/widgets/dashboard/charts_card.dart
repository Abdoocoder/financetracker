import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:fl_chart/fl_chart.dart';

class ChartsCard extends StatelessWidget {
  final List<Map<String, dynamic>> months6Data;
  final List<Map<String, dynamic>> categoryData;
  final String currency;

  const ChartsCard({
    super.key,
    required this.months6Data,
    required this.categoryData,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (months6Data.isNotEmpty) _buildBarChart(theme, colorScheme),
        if (categoryData.isNotEmpty) ...[
          const SizedBox(height: 16),
          _buildCategoryBreakdown(theme, colorScheme),
        ],
      ],
    );
  }

  Widget _buildBarChart(ThemeData theme, ColorScheme colorScheme) {
    final isDark = theme.brightness == Brightness.dark;
    final incomeColor = isDark ? AppColors.success : colorScheme.primary;
    final expenseColor = isDark ? AppColors.error : colorScheme.error;

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
          Text('dash_overview_6m'.tr(),
              style: TextStyle(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w900,
                  fontSize: 14)),
          const SizedBox(height: 24),
          RepaintBoundary(
          child: SizedBox(
            height: 200,
            child: BarChart(
               BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: _getMaxY(),
                barTouchData: BarTouchData(enabled: false),
                titlesData: FlTitlesData(
                  show: true,
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        if (value.toInt() >= 0 &&
                            value.toInt() < months6Data.length) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 8.0),
                            child: Text(
                              months6Data[value.toInt()]['month'],
                              style: TextStyle(
                                  color: colorScheme.onSurfaceVariant,
                                  fontSize: 10),
                            ),
                          );
                        }
                        return const Text('');
                      },
                    ),
                  ),
                  leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                ),
                gridData: const FlGridData(show: false),
                borderData: FlBorderData(show: false),
                barGroups: months6Data.asMap().entries.map((e) {
                  return BarChartGroupData(
                    x: e.key,
                    barRods: [
                      BarChartRodData(
                        toY: (e.value['income'] as num?)?.toDouble() ?? 0.0,
                        color: incomeColor,
                        width: 10,
                        borderRadius: BorderRadius.circular(3),
                      ),
                      BarChartRodData(
                        toY: (e.value['expenses'] as num?)?.toDouble() ?? 0.0,
                        color: expenseColor,
                        width: 10,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          ),
          ), // RepaintBoundary
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildLegend(incomeColor, 'dash_income'.tr(), colorScheme),
              const SizedBox(width: 16),
              _buildLegend(expenseColor, 'dash_expenses'.tr(), colorScheme),
            ],
          )
        ],
      ),
    );
  }

  double _getMaxY() {
    double maxVal = 0;
    for (var m in months6Data) {
      final inc = (m['income'] as num?)?.toDouble() ?? 0.0;
      final exp = (m['expenses'] as num?)?.toDouble() ?? 0.0;
      if (inc > maxVal) maxVal = inc;
      if (exp > maxVal) maxVal = exp;
    }
    return maxVal == 0 ? 100 : maxVal * 1.2;
  }

  Widget _buildLegend(Color color, String label, ColorScheme colorScheme) {
    return Row(
      children: [
        Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label,
            style: TextStyle(
                color: colorScheme.onSurfaceVariant, fontSize: 12)),
      ],
    );
  }

  Widget _buildCategoryBreakdown(ThemeData theme, ColorScheme colorScheme) {
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
          Text('dash_spent_from_categories'.tr(),
              style: TextStyle(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w900,
                  fontSize: 14)),
          const SizedBox(height: 16),
          ...categoryData.map((cat) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12.0),
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Text(cat['category'],
                        style: TextStyle(
                            color: colorScheme.onSurface,
                            fontSize: 13)),
                  ),
                  Expanded(
                    flex: 5,
                    child: Semantics(
                      value: '${((cat['percentage'] as double) * 100).toStringAsFixed(0)}%',
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: cat['percentage'],
                          backgroundColor: colorScheme.outlineVariant,
                          color: colorScheme.primary,
                          minHeight: 8,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(
                    width: 70,
                    child: Text(
                      '${cat['amount'].toStringAsFixed(0)} $currency',
                      style: TextStyle(
                          color: colorScheme.onSurface,
                          fontSize: 12,
                          fontWeight: FontWeight.w700),
                      textAlign: TextAlign.left,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
