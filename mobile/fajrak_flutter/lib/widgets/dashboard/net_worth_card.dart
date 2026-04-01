import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class NetWorthCard extends StatelessWidget {
  final double netWorth;
  final double invValue;
  final double goalsSaved;
  final double totalDebt;
  final double totalReceivable;
  final String currency;

  const NetWorthCard({
    super.key,
    required this.netWorth,
    required this.invValue,
    required this.goalsSaved,
    required this.totalDebt,
    required this.totalReceivable,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isPositive = netWorth >= 0;
    final mainColor = isPositive ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    String fmt(double n) => n.abs().toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    );

    final items = [
      (label: 'net_worth_investments'.tr(), value: invValue, color: const Color(0xFF3B7EF6), icon: '📈'),
      (label: 'net_worth_goals'.tr(), value: goalsSaved, color: const Color(0xFF10B981), icon: '🎯'),
      (label: 'net_worth_receivable'.tr(), value: totalReceivable, color: const Color(0xFF8B5CF6), icon: '💰'),
      (label: 'net_worth_debts'.tr(), value: -totalDebt, color: const Color(0xFFEF4444), icon: '💳'),
    ];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [mainColor.withOpacity(0.08), cs.surface],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: mainColor.withOpacity(0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Header
        Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('net_worth_title'.tr(), style: TextStyle(color: cs.onSurfaceVariant, fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Row(children: [
              Text(isPositive ? '+' : '-', style: TextStyle(color: mainColor, fontFamily: 'Cairo', fontSize: 22, fontWeight: FontWeight.w900)),
              Text(fmt(netWorth), style: TextStyle(color: mainColor, fontFamily: 'monospace', fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
              const SizedBox(width: 6),
              Text(currency, style: TextStyle(color: cs.onSurfaceVariant, fontFamily: 'Cairo', fontSize: 13)),
            ]),
          ])),
          Text(isPositive ? '🏦' : '⚠️', style: const TextStyle(fontSize: 36)),
        ]),
        const SizedBox(height: 14),

        // Breakdown grid
        Wrap(spacing: 8, runSpacing: 8, children: items.map((item) => SizedBox(
          width: (MediaQuery.of(context).size.width - 80) / 2,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
            decoration: BoxDecoration(
              color: cs.surfaceVariant,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(children: [
              Text(item.icon, style: const TextStyle(fontSize: 14)),
              const SizedBox(width: 8),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item.label, style: TextStyle(color: cs.onSurfaceVariant, fontFamily: 'Cairo', fontSize: 9, fontWeight: FontWeight.w600)),
                Text(
                  '${item.value >= 0 ? '+' : '-'}${fmt(item.value)}',
                  style: TextStyle(color: item.value >= 0 ? item.color : const Color(0xFFEF4444), fontFamily: 'monospace', fontSize: 13, fontWeight: FontWeight.w900),
                  overflow: TextOverflow.ellipsis,
                ),
              ])),
            ]),
          ),
        )).toList()),
      ]),
    );
  }
}
