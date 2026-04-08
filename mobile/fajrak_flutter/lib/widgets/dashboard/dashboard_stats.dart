import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class DashboardStats extends StatelessWidget {
  final double income;
  final double expenses;
  final double net;
  final double totalBalance;
  final double monthlyDebtCommitments;
  final ColorScheme colorScheme;

  const DashboardStats({
    super.key,
    required this.income,
    required this.expenses,
    required this.net,
    required this.totalBalance,
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
    final balColor = totalBalance >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final monthlyNet = income - expenses;
    final monthlyNetColor = monthlyNet >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final hasCommitments = monthlyDebtCommitments > 0;
    final netAfterDebts = monthlyNet - monthlyDebtCommitments;
    final netAfterColor = netAfterDebts >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: balColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: balColor.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Text('🏦', style: TextStyle(color: balColor, fontSize: 12)),
        const SizedBox(height: 4),
        FittedBox(child: Text(
          (totalBalance < 0 ? '-' : '') + totalBalance.abs().toStringAsFixed(0),
          style: TextStyle(color: balColor, fontWeight: FontWeight.w900, fontSize: 16, fontFamily: 'Cairo'),
        )),
        Text('dash_net'.tr(), style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 10, fontFamily: 'Cairo')),
        const SizedBox(height: 4),
        // صافي الشهر كمعلومة إضافية صغيرة
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
          decoration: BoxDecoration(
            color: monthlyNetColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Column(children: [
            Text('${'dash_monthly'.tr()}: ${monthlyNet >= 0 ? '+' : '-'}${monthlyNet.abs().toStringAsFixed(0)}',
              style: TextStyle(color: monthlyNetColor, fontSize: 8, fontFamily: 'Cairo', fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            if (hasCommitments) ...[
              Text('⚡ ${'dash_after_debts'.tr()}: ${netAfterDebts >= 0 ? '+' : '-'}${netAfterDebts.abs().toStringAsFixed(0)}',
                style: TextStyle(color: netAfterColor, fontSize: 8, fontFamily: 'Cairo', fontWeight: FontWeight.w700),
                textAlign: TextAlign.center,
              ),
            ],
          ]),
        ),
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
