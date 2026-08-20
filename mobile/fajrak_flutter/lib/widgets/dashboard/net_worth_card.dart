import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

class NetWorthCard extends StatefulWidget {
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
  State<NetWorthCard> createState() => _NetWorthCardState();
}

class _NetWorthCardState extends State<NetWorthCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isPositive = widget.netWorth >= 0;
    final mainColor = isPositive ? AppColors.success : AppColors.error;

    String fmt(double n) => n.abs().toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},',
    );

    final items = [
      (label: 'net_worth_investments'.tr(), value: widget.invValue,      color: AppColors.primary, icon: Icons.trending_up),
      (label: 'net_worth_goals'.tr(),       value: widget.goalsSaved,    color: AppColors.success, icon: Icons.flag_outlined),
      (label: 'net_worth_receivable'.tr(),  value: widget.totalReceivable, color: AppColors.purple, icon: Icons.account_balance_wallet_outlined),
      (label: 'net_worth_debts'.tr(),       value: -widget.totalDebt,    color: AppColors.error, icon: Icons.credit_card_outlined),
    ];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft, end: Alignment.bottomRight,
          colors: [mainColor.withValues(alpha: 0.07), cs.surface],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: mainColor.withValues(alpha: 0.18)),
      ),
      child: Column(children: [
        // ── Header ──
        Semantics(
          button: true,
          expanded: _expanded,
          child: InkWell(
          onTap: () => setState(() => _expanded = !_expanded),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            child: Row(children: [
              Icon(isPositive ? Icons.account_balance : Icons.warning_amber_rounded, color: mainColor, size: 18),
              const SizedBox(width: 8),
              Text('net_worth_title'.tr(), style: TextStyle(color: cs.onSurfaceVariant, fontSize: 11, fontWeight: FontWeight.w600)),
              const Spacer(),
              RichText(text: TextSpan(children: [
                TextSpan(
                  text: '${isPositive ? '+' : '-'}${fmt(widget.netWorth)} ',
                  style: TextStyle(color: mainColor, fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.5),
                ),
                TextSpan(
                  text: widget.currency,
                  style: TextStyle(color: cs.onSurfaceVariant, fontSize: 11),
                ),
              ])),
              const SizedBox(width: 8),
              AnimatedRotation(
                turns: _expanded ? 0.5 : 0,
                duration: const Duration(milliseconds: 200),
                child: Icon(Icons.keyboard_arrow_down, color: cs.onSurfaceVariant, size: 18),
              ),
            ]),
          ),
        )),

        // ── Breakdown ──
        AnimatedSize(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeInOut,
          child: _expanded
              ? Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                  child: Wrap(spacing: 8, runSpacing: 8, children: items.map((item) => SizedBox(
                    width: (MediaQuery.sizeOf(context).width - 80) / 2,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
                      decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(10)),
                      child: Row(children: [
                        Icon(item.icon, size: 16, color: item.value >= 0 ? item.color : AppColors.error),
                        const SizedBox(width: 8),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(item.label, style: TextStyle(color: cs.onSurfaceVariant, fontSize: 11, fontWeight: FontWeight.w600)),
                          Text(
                            '${item.value >= 0 ? '+' : '-'}${fmt(item.value)}',
                            style: TextStyle(color: item.value >= 0 ? item.color : AppColors.error, fontSize: 13, fontWeight: FontWeight.w900),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ])),
                      ]),
                    ),
                  )).toList()),
                )
              : const SizedBox.shrink(),
        ),
      ]),
    );
  }
}
