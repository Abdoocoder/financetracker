import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class DashboardStats extends StatelessWidget {
  final double income;
  final double expenses;
  final double net;
  final double monthlyDebtCommitments;
  final ColorScheme colorScheme;

  const DashboardStats({
    super.key,
    required this.income,
    required this.expenses,
    required this.net,
    required this.colorScheme,
    this.monthlyDebtCommitments = 0,
  });

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(child: _statCard('dash_income'.tr(), income, const Color(0xFF10B981), '↑', colorScheme)),
      const SizedBox(width: 8),
      Expanded(child: _statCard('dash_expenses'.tr(), expenses, const Color(0xFFEF4444), '↓', colorScheme)),
      const SizedBox(width: 8),
      Expanded(child: _netCard(colorScheme)),
    ]);
  }

  Widget _netCard(ColorScheme colorScheme) {
    final netColor = net >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final netAfterDebts = net - monthlyDebtCommitments;
    final netAfterColor = netAfterDebts >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final hasCommitments = monthlyDebtCommitments > 0;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: netColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: netColor.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Text('=', style: TextStyle(color: netColor, fontSize: 12)),
        const SizedBox(height: 4),
        FittedBox(child: Text(net.abs().toStringAsFixed(0), style: TextStyle(color: netColor, fontWeight: FontWeight.w900, fontSize: 16, fontFamily: 'Cairo'))),
        Text('dash_net'.tr(), style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 10, fontFamily: 'Cairo')),
        if (hasCommitments) ...[
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
            decoration: BoxDecoration(
              color: netAfterColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Column(children: [
              Text('⚡ ${'dash_after_debts'.tr()}', style: const TextStyle(color: Color(0xFF3B7EF6), fontSize: 8, fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
              FittedBox(child: Text(netAfterDebts.abs().toStringAsFixed(0), style: TextStyle(color: netAfterColor, fontWeight: FontWeight.w900, fontSize: 13, fontFamily: 'Cairo'))),
            ]),
          ),
        ],
      ]),
    );
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
