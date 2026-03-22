import 'package:flutter/material.dart';

class PaidDebtItem extends StatelessWidget {
  final Map<String, dynamic> debt;
  final String currency;

  const PaidDebtItem({super.key, required this.debt, required this.currency});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: const Color(0xFF10B981).withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: const Color(0xFF10B981).withValues(alpha: 0.15))),
      child: Row(children: [
        const Text('✅', style: TextStyle(fontSize: 24)),
        const SizedBox(width: 12),
        Expanded(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
              Text(debt['name'] ?? '',
                  style: const TextStyle(
                      color: Colors.white,
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.w700,
                      fontSize: 13)),
              if (debt['updated_at'] != null)
                Text(debt['updated_at'].toString().substring(0, 10),
                    style: const TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 11,
                        fontFamily: 'Cairo')),
            ])),
        Text(
            '${(debt['original_amount'] as num).toStringAsFixed(0)} $currency',
            style: const TextStyle(
                color: Color(0xFF6EE7B7),
                fontWeight: FontWeight.w900,
                fontFamily: 'Cairo')),
      ]),
    );
  }
}
