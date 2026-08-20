import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

class RecentTransactionsList extends StatelessWidget {
  final List<Map<String, dynamic>> transactions;
  final String currency;
  final ColorScheme colorScheme;

  const RecentTransactionsList({
    super.key,
    required this.transactions,
    required this.currency,
    required this.colorScheme,
  });

  String _getCategoryName(String key) {
    switch (key) {
      case 'طعام': return 'cat_food'.tr();
      case 'مواصلات': return 'cat_transport'.tr();
      case 'فواتير': return 'cat_bills'.tr();
      case 'صحة': return 'cat_health'.tr();
      case 'ترفيه': return 'cat_entertainment'.tr();
      case 'تسوق': return 'cat_shopping'.tr();
      case 'راتب': return 'cat_salary'.tr();
      case 'عمل حر': return 'cat_freelance'.tr();
      default: return 'cat_others'.tr();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (transactions.isEmpty) return const SizedBox();
    
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('dash_recent'.tr(), style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: colorScheme.onSurface)),
      const SizedBox(height: 10),
      ...transactions.map((tx) {
        final isIncome = tx['type'] == 'income';
        final amount = (tx['amount'] as num).toDouble();
        final color = isIncome ? AppColors.success : AppColors.error;
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: colorScheme.outlineVariant),
          ),
          child: Row(children: [
            Container(width: 38, height: 38, decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
              child: Center(child: Icon(isIncome ? Icons.arrow_downward : Icons.arrow_upward, size: 16, color: color))),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(tx['description'] ?? _getCategoryName(tx['category'] ?? ''), style: TextStyle(color: colorScheme.onSurface, fontWeight: FontWeight.w600, fontSize: 13)),
              Text(_getCategoryName(tx['category'] ?? ''), style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 11)),
            ])),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('${isIncome ? '+' : '−'}${amount.toStringAsFixed(0)} $currency', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 13)),
                if (tx['original_currency'] != null && tx['original_currency'] != currency)
                    Text(
                      '${(tx['original_amount'] as num).toDouble().toStringAsFixed(0)} ${tx['original_currency']}',
                      style: TextStyle(
                        color: color.withValues(alpha: 0.6),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
              ],
            ),
          ]),
        );
      }),
    ]);
  }
}
