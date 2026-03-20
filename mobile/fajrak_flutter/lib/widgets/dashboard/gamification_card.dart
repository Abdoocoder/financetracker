import 'package:flutter/material.dart';

class GamificationCard extends StatelessWidget {
  final int score;

  const GamificationCard({
    super.key,
    required this.score,
  });

  @override
  Widget build(BuildContext context) {
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
      color = const Color(0xFF3B7EF6);
      progress = score >= 100 ? 1.0 : (score - 80) / 20;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1629),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
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
                        style: const TextStyle(
                            color: Colors.white,
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
                    backgroundColor: const Color(0xFF1E293B),
                    color: color,
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                    score >= 100
                        ? 'أنت في أعلى مستوى، حافظ عليه!'
                        : 'تحكم بنفقاتك أكثر لرفع مستواك وفتح شارات جديدة 🏆',
                    style: const TextStyle(
                        color: Color(0xFF94A3B8),
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
