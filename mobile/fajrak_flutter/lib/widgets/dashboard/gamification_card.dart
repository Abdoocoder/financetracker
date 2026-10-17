import '../../utils/app_colors.dart';
import '../../utils/level_ladder.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

/// Gamification card for the Dashboard.
///
/// Driven by user_stats.total_points through the shared [levelForPoints]
/// ladder — the same source and formula as Achievements' LevelCard, so both
/// screens always show the same title/points/progress for a user.
/// (health_score belongs to DashboardHealthScore, not here.)
class GamificationCard extends StatelessWidget {
  final int points;

  const GamificationCard({
    super.key,
    required this.points,
  });

  /// Level → color tiers: (1,2) bronze, (3,4) silver, (5) gold, (6) primary.
  static Color _colorFor(int level, ColorScheme colorScheme) {
    if (level <= 2) return AppColors.bronze;
    if (level <= 4) return AppColors.silver;
    if (level == 5) return AppColors.gold;
    return colorScheme.primary;
  }

  static IconData _iconFor(int level) {
    switch (level) {
      case 1:
        return Icons.military_tech;
      case 2:
        return Icons.workspace_premium;
      case 3:
        return Icons.savings;
      case 4:
        return Icons.trending_up;
      case 5:
        return Icons.emoji_events;
      default:
        return Icons.diamond;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final info = levelForPoints(points);
    final color = _colorFor(info.level, colorScheme);
    final icon = _iconFor(info.level);
    final progress = info.progress(points);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: isDark ? 0.3 : 0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: color.withValues(alpha: isDark ? 0.1 : 0.08),
              shape: BoxShape.circle,
            ),
            child:
                Center(child: Icon(icon, size: 24, color: color)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${"learn_stage_label".tr()} ${info.title}',
                              style: TextStyle(
                                  color: color,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 13)),
                          Text('المستوى ${info.level}',
                              style: TextStyle(
                                  color: colorScheme.onSurfaceVariant,
                                  fontSize: 10)),
                        ],
                      ),
                    ),
                    Text('$points ${"gamif_points".tr()}',
                        style: TextStyle(
                            color: colorScheme.onSurface,
                            fontSize: 12,
                            fontWeight: FontWeight.w700)),
                  ],
                ),
                const SizedBox(height: 8),
                Semantics(
                  value: '${(progress * 100).toStringAsFixed(0)}%',
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor: colorScheme.outlineVariant,
                      color: color,
                      minHeight: 6,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                    info.isMax
                        ? 'gamif_max_level'.tr()
                        : 'gamif_points_to_next'
                            .tr(namedArgs: {'points': info.nextPoints.toString()}),
                    style: TextStyle(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: 10)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
