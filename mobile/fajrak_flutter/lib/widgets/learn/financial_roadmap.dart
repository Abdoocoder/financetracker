import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

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
      {'id': 'awareness', 'icon': Icons.spa, 'title': 'roadmap_awareness'.tr()},
      {'id': 'debt', 'icon': Icons.credit_card, 'title': 'roadmap_debt'.tr()},
      {'id': 'emergency', 'icon': Icons.shield, 'title': 'roadmap_emergency'.tr()},
      {'id': 'investing', 'icon': Icons.show_chart, 'title': 'roadmap_investing'.tr()},
      {'id': 'wealth', 'icon': Icons.workspace_premium, 'title': 'roadmap_wealth'.tr()},
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
                      ? (Theme.of(context).brightness == Brightness.dark ? AppColors.success : AppColors.successDark)
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
                                  color: color.withValues(alpha: 0.3),
                                  blurRadius: 10)
                            ]
                          : null,
                    ),
                    child: Center(
                        child: Icon(s['icon'] as IconData, size: 20, color: color)),
                  ),
                  const SizedBox(height: 6),
                  Text(s['title'] as String,
                      style: TextStyle(
                          color: color,
                          fontSize: 10,
                          fontWeight:
                              isCurrent ? FontWeight.w900 : FontWeight.w500)),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }
}
