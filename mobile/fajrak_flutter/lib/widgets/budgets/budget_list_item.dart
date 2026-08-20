import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';

class BudgetListItem extends StatelessWidget {
  final Map<String, dynamic> budget;
  final double spent;
  final String currency;
  final List<Map<String, dynamic>> localizedCategories;
  final ColorScheme colorScheme;
  final Function(Map<String, dynamic>) onEdit;
  final Function(String) onDelete;

  const BudgetListItem({
    super.key,
    required this.budget,
    required this.spent,
    required this.currency,
    required this.localizedCategories,
    required this.colorScheme,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final cat = localizedCategories.firstWhere(
        (c) => c['key'] == budget['category'],
        orElse: () => {'key': budget['category'], 'icon': Icons.edit_note});
    final limit = (budget['monthly_limit'] as num).toDouble();
    final pct = limit > 0 ? (spent / limit).clamp(0.0, 1.0) : 0.0;
    final over = spent > limit;
    final warn = !over && pct > 0.8;
    final color = over
        ? AppColors.error
        : warn
            ? AppColors.warning
            : AppColors.success;
    final remaining = (limit - spent).clamp(0.0, double.infinity);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: over
                  ? colorScheme.error.withValues(alpha: 0.3)
                  : warn
                      ? Colors.orange.withValues(alpha: 0.2)
                      : colorScheme.outlineVariant)),
      child: Column(children: [
        Row(children: [
          Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12)),
              child: Center(
                  child: Icon(cat['icon'] as IconData,
                      size: 22, color: color))),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(budget['category'] as String,
                    style: TextStyle(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.w800,
                        fontSize: 14)),
                Text(
                    '${spent.toStringAsFixed(0)} / ${limit.toStringAsFixed(0)} $currency${over ? ' ⚠ تجاوزت!' : warn ? ' ◼ اقتربت' : ''}',
                    style: TextStyle(
                        color: color,
                        fontSize: 12,
                        fontWeight: FontWeight.w700)),
              ])),
          Text('${(pct * 100).round()}%',
              style: TextStyle(
                  color:
                      over ? AppColors.errorLight : AppColors.successLight,
                  fontWeight: FontWeight.w900,
                  fontSize: 16)),
          const SizedBox(width: 8),
          GestureDetector(
              onTap: () => onEdit(budget),
              child: Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                      color: colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: colorScheme.primary.withValues(alpha: 0.2))),
                  child: Icon(Icons.edit,
                      color: colorScheme.primary, size: 14))),
          const SizedBox(width: 6),
          GestureDetector(
              onTap: () => onDelete(budget['id'].toString()),
              child: Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: AppColors.error.withValues(alpha: 0.2))),
                  child: const Icon(Icons.close,
                      color: AppColors.error, size: 14))),
        ]),
        const SizedBox(height: 10),
        Semantics(
          value: '${(pct * 100).toStringAsFixed(0)}%',
          child: ClipRRect(
              borderRadius: BorderRadius.circular(5),
              child: LinearProgressIndicator(
                  value: pct,
                  backgroundColor: colorScheme.outlineVariant,
                  color: color,
                  minHeight: 8)),
        ),
        const SizedBox(height: 6),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Row(children: [
            Text('budget_remaining_label'.tr(),
                style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11)),
            Text('${remaining.toStringAsFixed(0)} $currency',
                style: TextStyle(
                    color: over
                        ? AppColors.errorLight
                        : AppColors.successLight,
                    fontWeight: FontWeight.w700,
                    fontSize: 11))
          ]),
          Text('budget_limit_label'.tr(namedArgs: {'amount': limit.toStringAsFixed(0), 'currency': currency}),
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 11)),
        ]),
      ]),
    );
  }
}
