import 'package:flutter/material.dart';

class FinancialRoadmap extends StatelessWidget {
  final String currentStage;

  const FinancialRoadmap({
    super.key,
    required this.currentStage,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final stages = [
      {'id': 'awareness', 'icon': '🌱', 'title': 'الوعي'},
      {'id': 'debt', 'icon': '💳', 'title': 'ديون'},
      {'id': 'emergency', 'icon': '🛡️', 'title': 'طوارئ'},
      {'id': 'investing', 'icon': '📈', 'title': 'استثمار'},
      {'id': 'wealth', 'icon': '👑', 'title': 'الثروة'},
    ];

    int currentIndex = stages.indexWhere((s) => s['id'] == currentStage);
    if (currentIndex == -1) currentIndex = 0;

    return Container(
      height: 100,
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Connecting Line
          Positioned(
            left: 40,
            right: 40,
            top: 25,
            child: Container(
              height: 2,
              color: colorScheme.outlineVariant,
            ),
          ),
          // Stages
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(stages.length, (index) {
              final s = stages[index];
              final bool isPast = index < currentIndex;
              final bool isCurrent = index == currentIndex;
              final Color color = isCurrent
                  ? colorScheme.primary
                  : (isPast
                      ? (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF10B981) : const Color(0xFF059669))
                      : colorScheme.onSurfaceVariant);

              return Column(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: isCurrent
                          ? color.withValues(alpha: 0.1)
                          : colorScheme.surface,
                      shape: BoxShape.circle,
                      border:
                          Border.all(color: color, width: isCurrent ? 2 : 1),
                      boxShadow: isCurrent
                          ? [
                              BoxShadow(
                                  color: color.withOpacity(0.3),
                                  blurRadius: 10)
                            ]
                          : null,
                    ),
                    child: Center(
                        child: Text(s['icon'] as String,
                            style: const TextStyle(fontSize: 20))),
                  ),
                  const SizedBox(height: 6),
                  Text(s['title'] as String,
                      style: TextStyle(
                          color: color,
                          fontSize: 10,
                          fontWeight:
                              isCurrent ? FontWeight.w900 : FontWeight.w500,
                          fontFamily: 'Cairo')),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }
}
