import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

class GoalListItem extends StatelessWidget {
  final Map<String, dynamic> goal;
  final String currency;
  final ColorScheme colorScheme;
  final Function(Map<String, dynamic>) onAddAmount;
  final Function(Map<String, dynamic>) onEdit;
  final Function(String) onDelete;

  const GoalListItem({
    super.key,
    required this.goal,
    required this.currency,
    required this.colorScheme,
    required this.onAddAmount,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final target = (goal['target_amount'] as num).toDouble();
    final current = (goal['current_amount'] as num).toDouble();
    final progress = target > 0 ? (current / target).clamp(0.0, 1.0) : 0.0;
    final remaining = target - current;
    final isDone = current >= target;
    
    final color = isDone
        ? AppColors.success
        : progress >= 0.7
            ? colorScheme.primary
            : colorScheme.secondary;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          if ((goal['icon'] as String?) != null)
            Icon(_getIconData(goal['icon'] as String), size: 22, color: color),
          if ((goal['icon'] as String?) != null) const SizedBox(width: 8),
          Expanded(
              child: Text(goal['name'] ?? '',
                  style: TextStyle(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w900,
                      fontSize: 15))),
          if (isDone) Icon(Icons.check_circle_outline, size: 18, color: color),
          const SizedBox(width: 8),
          GestureDetector(
              onTap: () => onEdit(goal),
              child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                      color: colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(7),
                      border: Border.all(
                          color: colorScheme.primary.withValues(alpha: 0.2))),
                  child: Icon(Icons.edit, color: colorScheme.primary, size: 14))),
          const SizedBox(width: 6),
          GestureDetector(
              onTap: () => onDelete(goal['id'].toString()),
              child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(7),
                      border: Border.all(
                          color: AppColors.error.withValues(alpha: 0.2))),
                  child: const Icon(Icons.close,
                      color: AppColors.error, size: 14))),
        ]),
        const SizedBox(height: 12),
        Semantics(
          value: '${(progress * 100).toStringAsFixed(0)}%',
          child: ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: progress,
                backgroundColor: colorScheme.outlineVariant,
                valueColor: AlwaysStoppedAnimation(color),
                minHeight: 10,
              )),
        ),
        const SizedBox(height: 8),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('goals_progress_percent'.tr(args: [(progress * 100).toStringAsFixed(0)]),
              style: TextStyle(
                  color: color,
                  fontSize: 12,
                  fontWeight: FontWeight.w700)),
          Text('goals_remaining_value'.tr(args: [remaining.toStringAsFixed(0), currency]),
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 12)),
        ]),
        if (!isDone) ...[
          const SizedBox(height: 12),
          SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => onAddAmount(goal),
                style: OutlinedButton.styleFrom(
                    foregroundColor: color,
                    side: BorderSide(color: color.withValues(alpha: 0.4)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10))),
                child: Text('goals_add_saving'.tr(),
                    style: const TextStyle(
                        fontWeight: FontWeight.w700)),
              )),
        ],
      ]),
    );
  }

  IconData _getIconData(String? iconString) {
    final codePoint = int.tryParse(iconString ?? '') ?? Icons.track_changes.codePoint;
    const icons = [
      Icons.track_changes, Icons.directions_car, Icons.home, Icons.diamond, Icons.diamond_outlined,
      Icons.flight, Icons.laptop, Icons.phone_android, Icons.school, Icons.workspace_premium,
      Icons.public, Icons.cast_for_education, Icons.work, Icons.fitness_center, Icons.favorite,
      Icons.eco, Icons.rocket_launch, Icons.star, Icons.energy_savings_leaf, Icons.bar_chart,
      Icons.calendar_today, Icons.account_balance_wallet, Icons.card_giftcard, Icons.shield, Icons.bolt,
      Icons.local_fire_department, Icons.lightbulb, Icons.inventory_2, Icons.attach_money, Icons.beach_access,
    ];
    for (final icon in icons) {
      if (icon.codePoint == codePoint) return icon;
    }
    return Icons.track_changes;
  }
}
