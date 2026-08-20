import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

class LevelCard extends StatelessWidget {
  final int level;
  final String levelTitle;
  final int points;
  final int nextLevel;
  final ColorScheme colorScheme;

  const LevelCard({
    super.key,
    required this.level,
    required this.levelTitle,
    required this.points,
    required this.nextLevel,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    final progress = nextLevel < 9999 ? points / nextLevel : 1.0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
            colors: [colorScheme.surfaceContainerHighest, colorScheme.surface],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colorScheme.primary.withValues(alpha: 0.3)),
      ),
      child: Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(levelTitle,
                style: TextStyle(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w900,
                    fontSize: 22)),
            Text('المستوى $level',
                style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 13)),
          ]),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
                color: colorScheme.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: colorScheme.primary)),
            child: Text('$points نقطة',
                style: TextStyle(
                    color: colorScheme.primary,
                    fontWeight: FontWeight.w900)),
          ),
        ]),
        const SizedBox(height: 16),
        Semantics(
          value: '${(progress.clamp(0.0, 1.0) * 100).toStringAsFixed(0)}%',
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress.clamp(0.0, 1.0),
              backgroundColor: colorScheme.outlineVariant,
              valueColor: AlwaysStoppedAnimation(colorScheme.primary),
              minHeight: 8,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('$points نقطة',
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 11)),
          if (nextLevel < 9999)
            Text('gamif_points_to_next'.tr(namedArgs: {'points': nextLevel.toString()}),
                style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 11)),
        ]),
      ]),
    );
  }
}
