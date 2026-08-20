import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:easy_localization/easy_localization.dart';

class InvestmentTxHistoryModal extends StatefulWidget {
  final String invId;
  final String symbol;

  const InvestmentTxHistoryModal(
      {super.key, required this.invId, required this.symbol});

  @override
  State<InvestmentTxHistoryModal> createState() =>
      _InvestmentTxHistoryModalState();
}

class _InvestmentTxHistoryModalState extends State<InvestmentTxHistoryModal> {
  List<Map<String, dynamic>> _txHistory = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final data = await Supabase.instance.client
        .from('investment_transactions')
        .select('*')
        .eq('investment_id', widget.invId)
        .order('transaction_date', ascending: false);

    if (mounted) {
      setState(() {
        _txHistory = List<Map<String, dynamic>>.from(data);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Container(
        height: 200,
        alignment: Alignment.center,
        child: CircularProgressIndicator(
            color: Theme.of(context).colorScheme.primary),
      );
    }

    return Padding(
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 20,
            right: 20,
            top: 20),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 16),
          Text('inv_tx_history_symbol'.tr(args: [widget.symbol]),
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(height: 20),
          if (_txHistory.isEmpty)
            Center(
                child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text('inv_empty'.tr(),
                        style: TextStyle(
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant))))
          else
            SizedBox(
              height: 300,
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _txHistory.length,
                itemBuilder: (ctx, i) {
                  final tx = _txHistory[i];
                  final isBuy = tx['type'] == 'buy';
                  final color = isBuy
                      ? (Theme.of(context).brightness == Brightness.dark
                          ? AppColors.success
                          : AppColors.success)
                      : (Theme.of(context).brightness == Brightness.dark
                          ? AppColors.error
                          : AppColors.error);
                  final shares = (tx['shares'] as num).toDouble();
                  final price = (tx['price'] as num).toDouble();
                  final comm = (tx['commission'] as num?)?.toDouble() ?? 0;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                        color: Theme.of(context)
                            .colorScheme
                            .surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(12)),
                    child: Row(children: [
                      Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10)),
                          child: Center(
                              child: Icon(isBuy ? Icons.trending_up : Icons.trending_down,
                                  size: 16, color: color))),
                      const SizedBox(width: 12),
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Text(
                                '${isBuy ? "inv_buy".tr() : "inv_sell".tr()} ${shares.toStringAsFixed(4)} ${"inv_unit".tr()}',
                                style: TextStyle(
                                    color:
                                        Theme.of(context).colorScheme.onSurface,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13)),
                            Text(
                                '${tx['transaction_date']} • ${"inv_price".tr()} \$${price.toStringAsFixed(2)}',
                                style: TextStyle(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                    fontSize: 11)),
                          ])),
                      Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                                '${isBuy ? "-" : "+"}\$${(shares * price).toStringAsFixed(0)}',
                                style: TextStyle(
                                    color: color,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 13)),
                            if (comm > 0)
                              Text(
                                  'inv_commission'
                                      .tr(args: [comm.toStringAsFixed(2)]),
                                  style: TextStyle(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurfaceVariant,
                                      fontSize: 10)),
                          ]),
                    ]),
                  );
                },
              ),
            ),
          const SizedBox(height: 16),
        ]));
  }
}
