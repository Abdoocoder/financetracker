import 'package:flutter/material.dart';

class BadgeGrid extends StatelessWidget {
  final List<String> earnedBadges;
  final Map<String, dynamic> badgeInfo;
  final ColorScheme colorScheme;

  const BadgeGrid({
    super.key,
    required this.earnedBadges,
    required this.badgeInfo,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Align(
          alignment: Alignment.centerRight,
          child: Text('الشارات (${earnedBadges.length}/${badgeInfo.length})',
              style: TextStyle(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  fontFamily: 'Cairo'))),
      const SizedBox(height: 12),
      GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 0.9),
        itemCount: badgeInfo.length,
        itemBuilder: (_, i) {
          final key = badgeInfo.keys.elementAt(i);
          final info = badgeInfo[key]!;
          final earned = earnedBadges.contains(key);
          return Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: earned
                  ? colorScheme.primary.withValues(alpha: 0.1)
                  : colorScheme.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                  color: earned
                      ? colorScheme.primary.withValues(alpha: 0.4)
                      : colorScheme.outlineVariant),
            ),
            child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(info.$1 as IconData,
                      size: 28,
                      color: earned
                          ? colorScheme.primary
                          : colorScheme.outlineVariant
                              .withValues(alpha: 0.5)),
                  const SizedBox(height: 6),
                  Text(info.$2,
                      style: TextStyle(
                          color: earned
                              ? colorScheme.onSurface
                              : colorScheme.onSurfaceVariant,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'Cairo'),
                      textAlign: TextAlign.center,
                      maxLines: 2),
                  Text(info.$3,
                      style: TextStyle(
                          color: colorScheme.onSurfaceVariant,
                          fontSize: 9,
                          fontFamily: 'Cairo')),
                ]),
          );
        },
      ),
    ]);
  }
}
