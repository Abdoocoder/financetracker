import 'package:easy_localization/easy_localization.dart';
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
          child: Text('gamif_badges_title'.tr(namedArgs: {'earned': earnedBadges.length.toString(), 'total': badgeInfo.length.toString()}),
              style: TextStyle(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w900,
                  fontSize: 16))),
      const SizedBox(height: 12),
      Wrap(
        spacing: 10,
        runSpacing: 10,
        children: badgeInfo.entries.map((entry) {
          final key = entry.key;
          final info = entry.value;
          final earned = earnedBadges.contains(key);
          return SizedBox(
            width: (MediaQuery.sizeOf(context).width - 32 - 20) / 3,
            child: Container(
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
                            : colorScheme.outlineVariant.withValues(alpha: 0.5)),
                    const SizedBox(height: 6),
                    Text(info.$2,
                        style: TextStyle(
                            color: earned
                                ? colorScheme.onSurface
                                : colorScheme.onSurfaceVariant,
                            fontSize: 10,
                            fontWeight: FontWeight.w700),
                        textAlign: TextAlign.center,
                        maxLines: 2),
                    Text(info.$3,
                        style: TextStyle(
                            color: colorScheme.onSurfaceVariant,
                            fontSize: 11)),
                  ]),
            ),
          );
        }).toList(),
      ),
    ]);
  }
}
