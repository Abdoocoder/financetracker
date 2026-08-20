import 'package:flutter/material.dart';

class CategorySpendingItem extends StatelessWidget {
  final String category;
  final double amount;
  final double percentage;
  final String currency;
  final ColorScheme colorScheme;

  const CategorySpendingItem({
    super.key,
    required this.category,
    required this.amount,
    required this.percentage,
    required this.currency,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: colorScheme.outlineVariant)),
      child: Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(category,
              style: TextStyle(
                  color: colorScheme.onSurface,
                  fontSize: 13)),
          Text(
              '${amount.toStringAsFixed(0)} $currency (${percentage.toStringAsFixed(0)}%)',
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 12)),
        ]),
        const SizedBox(height: 6),
        Semantics(
          value: '${percentage.toStringAsFixed(0)}%',
          child: ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                  value: percentage / 100,
                  backgroundColor: colorScheme.outlineVariant,
                  color: colorScheme.primary,
                  minHeight: 5)),
        ),
      ]),
    );
  }
}
