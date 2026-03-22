import 'package:flutter/material.dart';

class DashboardStats extends StatelessWidget {
  final double income;
  final double expenses;
  final double net;
  final ColorScheme colorScheme;

  const DashboardStats({
    super.key,
    required this.income,
    required this.expenses,
    required this.net,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(child: _statCard('dash_income'.tr(), income, const Color(0xFF10B981), '↑', colorScheme)),
      const SizedBox(width: 8),
      Expanded(child: _statCard('dash_expenses'.tr(), expenses, const Color(0xFFEF4444), '↓', colorScheme)),
      const SizedBox(width: 8),
      Expanded(child: _statCard('dash_net'.tr(), net, net >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444), '=', colorScheme)),
    ]);
  }

  Widget _statCard(String label, double value, Color color, String icon, ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Text(icon, style: TextStyle(color: color, fontSize: 12)),
        const SizedBox(height: 4),
        FittedBox(child: Text(value.abs().toStringAsFixed(0), style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 16, fontFamily: 'Cairo'))),
        Text(label, style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 10, fontFamily: 'Cairo')),
      ]),
    );
  }
}

import 'package:easy_localization/easy_localization.dart';
