import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class FinancialAdvisorCard extends StatelessWidget {
  final List<Map<String, dynamic>> insights;
  final ColorScheme colorScheme;
  final Color Function(String) getInsightColor;

  const FinancialAdvisorCard({
    super.key,
    required this.insights,
    required this.colorScheme,
    required this.getInsightColor,
  });

  @override
  Widget build(BuildContext context) {
    if (insights.isEmpty) return const SizedBox.shrink();

    return Container(
      decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: colorScheme.outlineVariant)),
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Icon(Icons.smart_toy_outlined, size: 18, color: colorScheme.primary),
            const SizedBox(width: 8),
            Text('dash_financial_advisor'.tr(),
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    color: colorScheme.onSurface)),
          ]),
        ),
        Divider(color: colorScheme.outlineVariant, height: 1),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
              children: insights.map((ins) {
            final color = getInsightColor(ins['type']!);
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: color.withValues(alpha: 0.2))),
              child: Row(children: [
                Icon(ins['icon'] as IconData, size: 16, color: color),
                const SizedBox(width: 10),
                Expanded(
                    child: Text(ins['text']!,
                        style: TextStyle(
                            color: color,
                            fontSize: 12,
                            fontWeight: FontWeight.w700))),
              ]),
            );
          }).toList()),
        ),
      ]),
    );
  }
}
