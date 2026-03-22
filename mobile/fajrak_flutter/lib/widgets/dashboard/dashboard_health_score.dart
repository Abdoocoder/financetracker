import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class DashboardHealthScore extends StatelessWidget {
  final int score;
  final ColorScheme colorScheme;

  const DashboardHealthScore({
    super.key,
    required this.score,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    final color = score >= 80 ? const Color(0xFF10B981) : score >= 60 ? colorScheme.primary : score >= 40 ? const Color(0xFFF59E0B) : const Color(0xFFEF4444);
    final label = score >= 80 ? 'health_excellent'.tr() : score >= 60 ? 'health_good'.tr() : score >= 40 ? 'health_fair'.tr() : 'health_poor'.tr();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: colorScheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: color.withValues(alpha: 0.3))),
      child: Row(children: [
        SizedBox(width: 64, height: 64, child: Stack(alignment: Alignment.center, children: [
          CircularProgressIndicator(value: score / 100, color: color, backgroundColor: colorScheme.outlineVariant, strokeWidth: 6),
          Text('$score', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 18, fontFamily: 'Cairo')),
        ])),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('health_score'.tr(), style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 11, fontFamily: 'Cairo')),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 16, fontFamily: 'Cairo')),
          Text('dash_points_per_100'.tr(), style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 11, fontFamily: 'Cairo')),
        ])),
      ]),
    );
  }
}
