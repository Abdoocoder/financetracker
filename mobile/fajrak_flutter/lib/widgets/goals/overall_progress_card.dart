import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class OverallProgressCard extends StatelessWidget {
  final double totalSaved;
  final double totalTarget;
  final String currency;
  final ColorScheme colorScheme;

  const OverallProgressCard({
    super.key,
    required this.totalSaved,
    required this.totalTarget,
    required this.currency,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    final progress = totalTarget > 0 ? (totalSaved / totalTarget).clamp(0.0, 1.0) : 0.0;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: colorScheme.outlineVariant)),
      child: Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('goals_overall_progress'.tr(),
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 12)),
          Text(
              '${totalSaved.toStringAsFixed(0)} / ${totalTarget.toStringAsFixed(0)} $currency',
              style: TextStyle(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w700,
                  fontSize: 12)),
        ]),
        const SizedBox(height: 8),
        Semantics(
          value: '${(progress * 100).toStringAsFixed(0)}%',
          child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress,
                backgroundColor: colorScheme.outlineVariant,
                valueColor: AlwaysStoppedAnimation(colorScheme.secondary),
                minHeight: 10,
              )),
        ),
      ]),
    );
  }
}
