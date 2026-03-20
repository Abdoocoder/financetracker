import 'package:flutter/material.dart';

class BudgetProgressCard extends StatelessWidget {
  final double income;
  final double expenses;
  final String currency;

  const BudgetProgressCard({
    super.key,
    required this.income,
    required this.expenses,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    final double remaining = income - expenses;
    final double percentage = income > 0 ? (expenses / income).clamp(0.0, 1.0) : 0.0;
    final Color progressColor = percentage > 0.9 ? const Color(0xFFEF4444) : 
                                percentage > 0.7 ? const Color(0xFFF59E0B) : const Color(0xFF10B981);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1629),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('الميزانية الشهرية', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 14)),
              Text('${percentage >= 1 ? 0 : remaining.toStringAsFixed(0)} $currency متبقي', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontFamily: 'Cairo')),
            ],
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: percentage,
              backgroundColor: const Color(0xFF1E293B),
              color: progressColor,
              minHeight: 10,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('مصروف: ${expenses.toStringAsFixed(0)} $currency', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontFamily: 'Cairo')),
              Text('دخل: ${income.toStringAsFixed(0)} $currency', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontFamily: 'Cairo')),
            ],
          ),
        ],
      ),
    );
  }
}
