import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';

class PaidDebtItem extends StatelessWidget {
  final Map<String, dynamic> debt;
  final String currency;

  const PaidDebtItem({super.key, required this.debt, required this.currency});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: AppColors.success.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: AppColors.success.withValues(alpha: 0.15))),
      child: Row(children: [
        const Icon(Icons.check_circle, size: 24, color: AppColors.success),
        const SizedBox(width: 12),
        Expanded(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
              Text(debt['name'] ?? '',
                  style: TextStyle(
                      color: cs.onSurface,
                      fontWeight: FontWeight.w700,
                      fontSize: 13)),
              if (debt['updated_at'] != null)
                Text(debt['updated_at'].toString().substring(0, 10),
                    style: TextStyle(
                        color: cs.onSurfaceVariant,
                        fontSize: 11)),
            ])),
        Text(
            '${(debt['original_amount'] as num).toStringAsFixed(0)} $currency',
            style: const TextStyle(
                color: AppColors.successLight,
                fontWeight: FontWeight.w900)),
      ]),
    );
  }
}
