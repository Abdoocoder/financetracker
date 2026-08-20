import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

class GoalSummaryCards extends StatelessWidget {
  final int totalGoals;
  final int completedGoals;
  final double totalSaved;
  final String currency;
  final ColorScheme colorScheme;

  const GoalSummaryCards({
    super.key,
    required this.totalGoals,
    required this.completedGoals,
    required this.totalSaved,
    required this.currency,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(
          child: _statCard(Icons.track_changes, '$totalGoals', 'goals_count_label'.tr(),
              colorScheme.primary)),
      const SizedBox(width: 8),
      Expanded(
          child: _statCard(Icons.check_circle_outline, '$completedGoals', 'goals_completed_label'.tr(),
              AppColors.success)),
      const SizedBox(width: 8),
      Expanded(
          child: _statCard(Icons.account_balance_wallet, totalSaved.toStringAsFixed(0),
              'goals_saved_label'.tr(), colorScheme.secondary)),
    ]);
  }

  Widget _statCard(IconData icon, String value, String label, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.2))),
      child: Column(children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(height: 4),
        Text(value,
            style: TextStyle(
                color: color,
                fontWeight: FontWeight.w900,
                fontSize: 16)),
        Text(label,
            style: TextStyle(
                color: colorScheme.onSurfaceVariant,
                fontSize: 10)),
      ]),
    );
  }
}
