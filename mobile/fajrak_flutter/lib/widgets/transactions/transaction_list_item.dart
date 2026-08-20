import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';

class TransactionListItem extends StatelessWidget {
  final Map<String, dynamic> transaction;
  final String currency;
  final ColorScheme colorScheme;
  final Function(String) onDelete;
  final Function(Map<String, dynamic>) onTap;
  final String? syncStatus;

  const TransactionListItem({
    super.key,
    required this.transaction,
    required this.currency,
    required this.colorScheme,
    required this.onDelete,
    required this.onTap,
    this.syncStatus,
  });

  Widget? _buildSyncBadge() {
    switch (syncStatus) {
      case 'pending_create':
      case 'pending_update':
        return Tooltip(
          message: 'قيد المزامنة',
          child: Icon(Icons.cloud_upload_outlined, size: 14, color: Colors.orange[600]),
        );
      case 'pending_delete':
        return Tooltip(
          message: 'حذف قيد المزامنة',
          child: Icon(Icons.delete_outline, size: 14, color: Colors.red[400]),
        );
      case 'failed':
        return Tooltip(
          message: 'فشلت المزامنة',
          child: Icon(Icons.error_outline, size: 14, color: Colors.red),
        );
      default:
        return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isIncome = transaction['type'] == 'income';
    final amount = (transaction['amount'] as num).toDouble();
    final color = isIncome ? AppColors.success : AppColors.error;
    final syncBadge = _buildSyncBadge();

    return Dismissible(
      key: Key(transaction['id'].toString()),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.only(left: 20),
        decoration: BoxDecoration(
          color: AppColors.error,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) => onDelete(transaction['id'].toString()),
      child: Material(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: () => onTap(transaction),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: colorScheme.outlineVariant),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                      child: Icon(isIncome ? Icons.arrow_downward : Icons.arrow_upward,
                          size: 18, color: color)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(transaction['description'] ?? transaction['category'] ?? '',
                          style: TextStyle(
                              color: colorScheme.onSurface,
                              fontWeight: FontWeight.w700,
                              fontSize: 14)),
                      Text(transaction['category'] ?? '',
                          style: TextStyle(
                              color: colorScheme.onSurfaceVariant,
                              fontSize: 11)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (syncBadge != null) ...[
                          syncBadge,
                          const SizedBox(width: 4),
                        ],
                        Text(
                          '${isIncome ? '+' : '-'}${amount.toStringAsFixed(0)} $currency',
                          style: TextStyle(
                              color: color,
                              fontWeight: FontWeight.w900,
                              fontSize: 15),
                        ),
                        const SizedBox(width: 6),
                        Icon(Icons.edit_outlined, size: 14, color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5)),
                      ],
                    ),
                    if (transaction['original_currency'] != null && transaction['original_currency'] != currency)
                      Text(
                        '${(transaction['original_amount'] as num).toDouble().toStringAsFixed(0)} ${transaction['original_currency']}',
                        style: TextStyle(
                          color: color.withValues(alpha: 0.6),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    Text(
                      transaction['transaction_date'] ?? '',
                      style: TextStyle(
                          color: colorScheme.onSurfaceVariant,
                          fontSize: 10),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
