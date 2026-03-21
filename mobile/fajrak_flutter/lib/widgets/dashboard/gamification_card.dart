import 'package:flutter/material.dart';

class GamificationCard extends StatelessWidget {
  final int score;

  const GamificationCard({
    super.key,
    required this.score,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    String rank;
    String icon;
    Color color;
    double progress;

    if (score < 40) {
      rank = 'برونزي';
      icon = '🥉';
      color = const Color(0xFFCD7F32);
      progress = score / 40;
    } else if (score < 60) {
      rank = 'فضي';
      icon = '🥈';
      color = const Color(0xFFC0C0C0);
      progress = (score - 40) / 20;
    } else if (score < 80) {
      rank = 'ذهبي';
      icon = '🥇';
      color = const Color(0xFFFFD700);
      progress = (score - 60) / 20;
    } else {
      rank = 'ماسي';
      icon = '💎';
      color = colorScheme.primary;
      progress = score >= 100 ? 1.0 : (score - 80) / 20;
    }

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
                Center(child: Text(icon, style: const TextStyle(fontSize: 24))),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('المستوى $rank',
                        style: TextStyle(
                            color: color,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'Cairo',
                            fontSize: 13)),
                    Text('$score نقطة',
                        style: TextStyle(
                            color: colorScheme.onSurface,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            fontFamily: 'Cairo')),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    backgroundColor: colorScheme.outlineVariant,
                    color: color,
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                    score >= 100
                        ? 'أنت في أعلى مستوى، حافظ عليه!'
                        : 'تحكم بنفقاتك أكثر لرفع مستواك وفتح شارات جديدة 🏆',
                    style: TextStyle(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: 10,
                        fontFamily: 'Cairo')),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
