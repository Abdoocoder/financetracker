import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class ChallengesCard extends StatefulWidget {
  final double expensesFood;
  final double expectedFoodLimit;
  final double income;
  final double net;
  final double prevExpenses;
  final double currentExpenses;
  final double expensesEntertainment;
  final String currency;

  const ChallengesCard({
    super.key,
    required this.expensesFood,
    required this.income,
    required this.net,
    required this.prevExpenses,
    required this.currentExpenses,
    required this.expensesEntertainment,
    required this.currency,
    this.expectedFoodLimit = 50.0,
  });

  @override
  State<ChallengesCard> createState() => _ChallengesCardState();
}

class _ChallengesCardState extends State<ChallengesCard> {
  int? _activeChallenge;

  double _getProgress(int id) {
    if (id == 1) {
      if (widget.expensesFood == 0) return 100.0;
      return (100.0 - (widget.expensesFood / widget.expectedFoodLimit * 100))
          .clamp(0.0, 100.0);
    }
    if (id == 2) {
      final target = widget.income * 0.1;
      if (target <= 0) return 0.0;
      return ((widget.net / target) * 100).clamp(0.0, 100.0);
    }
    if (id == 3) {
      final p = widget.prevExpenses;
      if (p <= 0) return 0.0;
      return (((p - widget.currentExpenses) / p) * 100).clamp(0.0, 100.0);
    }
    if (id == 4) {
      return widget.expensesEntertainment == 0 ? 100.0 : 0.0;
    }
    return 0.0;
  }

  final _challenges = [
    {'id': 1, 'icon': Icons.restaurant, 'title': 'challenge_1_title'.tr(), 'days': 7},
    {'id': 2, 'icon': Icons.savings, 'title': 'challenge_2_title'.tr(), 'days': 30},
    {'id': 3, 'icon': Icons.trending_down, 'title': 'challenge_3_title'.tr(), 'days': 30},
    {'id': 4, 'icon': Icons.track_changes, 'title': 'challenge_4_title'.tr(), 'days': 14},
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('dash_challenges'.tr(),
                  style: TextStyle(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'Cairo',
                      fontSize: 14)),
              if (_activeChallenge != null)
                GestureDetector(
                  onTap: () => setState(() => _activeChallenge = null),
                  child: Text('trans_all'.tr(),
                      style: TextStyle(
                          color: colorScheme.onSurfaceVariant,
                          fontSize: 12,
                          fontFamily: 'Cairo')),
                )
            ],
          ),
          const SizedBox(height: 16),
          _activeChallenge != null ? _buildActiveChallenge(colorScheme) : _buildGrid(colorScheme),
        ],
      ),
    );
  }

  Widget _buildActiveChallenge(ColorScheme colorScheme) {
    final active = _challenges.firstWhere((c) => c['id'] == _activeChallenge);
    final pct = _getProgress(active['id'] as int);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        children: [
          Icon(active['icon'] as IconData, size: 36, color: colorScheme.primary),
          const SizedBox(height: 8),
          Text(active['title'] as String,
              style: TextStyle(
                  color: colorScheme.onSurface,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Cairo')),
          const SizedBox(height: 4),
          Text('${active['days']} ${"learn_streak_day".tr()}',
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant, fontSize: 12, fontFamily: 'Cairo')),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct / 100,
              backgroundColor: colorScheme.outlineVariant,
              color: colorScheme.primary,
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 6),
          Text('${pct.toStringAsFixed(0)}%',
              style: TextStyle(
                  color: isDark ? const Color(0xFF10B981) : colorScheme.primary,
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'monospace')),
        ],
      ),
    );
  }

  Widget _buildGrid(ColorScheme colorScheme) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 0.85,
      children: _challenges.map((c) {
        final pct = _getProgress(c['id'] as int);
        final isCompleted = pct >= 100;
        final color = isCompleted
            ? (isDark ? const Color(0xFF10B981) : colorScheme.primary)
            : colorScheme.primary;

        return GestureDetector(
          onTap: () => setState(() => _activeChallenge = c['id'] as int),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: colorScheme.outlineVariant),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Icon(c['icon'] as IconData, size: 22, color: color),
                const SizedBox(height: 6),
                Expanded(
                  child: Text(
                    c['title'] as String,
                    style: TextStyle(
                        color: colorScheme.onSurface,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'Cairo',
                        height: 1.3),
                    textAlign: TextAlign.right,
                  ),
                ),
                ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(
                    value: pct / 100,
                    backgroundColor: colorScheme.outlineVariant,
                    color: color,
                    minHeight: 4,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${isCompleted ? '✓ ' : ''}${pct.toStringAsFixed(0)}%',
                  style: TextStyle(
                      color: isCompleted
                          ? (isDark ? const Color(0xFF6EE7B7) : colorScheme.primary)
                          : (isDark ? colorScheme.secondary : colorScheme.primary),
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'monospace'),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
