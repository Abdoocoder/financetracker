import 'package:flutter/material.dart';

class TransactionListItem extends StatelessWidget {
  final Map<String, dynamic> transaction;
  final String currency;
  final ColorScheme colorScheme;
  final Function(String) onDelete;
  final Function(Map<String, dynamic>) onTap;

  const TransactionListItem({
    super.key,
    required this.transaction,
    required this.currency,
    required this.colorScheme,
    required this.onDelete,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isIncome = transaction['type'] == 'income';
    final amount = (transaction['amount'] as num).toDouble();
    final color = isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    return Dismissible(
      key: Key(transaction['id'].toString()),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.only(left: 20),
        decoration: BoxDecoration(
          color: const Color(0xFFEF4444),
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) => onDelete(transaction['id'].toString()),
      child: GestureDetector(
        onTap: () => onTap(transaction),
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: colorScheme.surface,
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
                    child: Text(isIncome ? '💰' : '💸',
                        style: const TextStyle(fontSize: 18))),
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
                            fontSize: 14,
                            fontFamily: 'Cairo')),
                    Text(transaction['category'] ?? '',
                        style: TextStyle(
                            color: colorScheme.onSurfaceVariant,
                            fontSize: 11,
                            fontFamily: 'Cairo')),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${isIncome ? '+' : '-'}${amount.toStringAsFixed(0)} $currency',
                    style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                        fontFamily: 'Cairo'),
                  ),
                  Text(
                    transaction['transaction_date'] ?? '',
                    style: TextStyle(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: 10,
                        fontFamily: 'Cairo'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
