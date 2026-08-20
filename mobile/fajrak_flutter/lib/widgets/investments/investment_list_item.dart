import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/currency_service.dart';
import 'investment_transaction_history.dart';
import 'add_investment_dialog.dart';

class InvestmentListItem extends StatefulWidget {
  final Map<String, dynamic> inv;
  final Function(String id) onDelete;
  final VoidCallback onChanged;

  const InvestmentListItem({
    super.key,
    required this.inv,
    required this.onDelete,
    required this.onChanged,
  });

  @override
  State<InvestmentListItem> createState() => _InvestmentListItemState();
}

class _InvestmentListItemState extends State<InvestmentListItem> {
  bool _showBuyForm = false;
  bool _showSellForm = false;
  final _buySharesCtrl = TextEditingController();
  final _buyPriceCtrl = TextEditingController();
  final _buyCommCtrl = TextEditingController(text: '0.5');
  bool _savingBuy = false;

  final _sellSharesCtrl = TextEditingController();
  final _sellPriceCtrl = TextEditingController();
  final _sellCommCtrl = TextEditingController(text: '0.5');
  bool _savingSell = false;

  @override
  void dispose() {
    _buySharesCtrl.dispose();
    _buyPriceCtrl.dispose();
    _buyCommCtrl.dispose();
    _sellSharesCtrl.dispose();
    _sellPriceCtrl.dispose();
    _sellCommCtrl.dispose();
    super.dispose();
  }

  void _showAddDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => AddInvestmentDialog(
        existing: widget.inv,
        onSaved: widget.onChanged,
      ),
    );
  }

  void _showTxHistory() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => InvestmentTxHistoryModal(
        invId: widget.inv['id'].toString(),
        symbol: widget.inv['symbol'],
      ),
    );
  }

  Future<void> _recordBuy() async {
    final shares = double.tryParse(_buySharesCtrl.text);
    final price = double.tryParse(_buyPriceCtrl.text);
    final commission = double.tryParse(_buyCommCtrl.text) ?? 0.0;
    if (shares == null || shares <= 0 || price == null || price <= 0) return;

    setState(() => _savingBuy = true);
    final user = Supabase.instance.client.auth.currentUser!;

    try {
      await Supabase.instance.client.from('investment_transactions').insert({
        'investment_id': widget.inv['id'],
        'user_id': user.id,
        'type': 'buy',
        'shares': shares,
        'price': price,
        'commission': commission,
        'transaction_date': DateTime.now().toIso8601String().split('T')[0],
      });

      final oldShares = (widget.inv['shares'] as num).toDouble();
      final oldAvg = (widget.inv['avg_buy_price'] as num).toDouble();
      final totalShares = oldShares + shares;
      final newAvg = totalShares > 0
          ? ((oldShares * oldAvg) + (shares * price)) / totalShares
          : price;

      await Supabase.instance.client.from('investments').update({
        'shares': totalShares,
        'avg_buy_price': newAvg,
        'current_price': price,
      }).eq('id', widget.inv['id']);

      _buySharesCtrl.clear();
      _buyPriceCtrl.clear();
      _buyCommCtrl.text = '0.5';

      setState(() {
        _showBuyForm = false;
        _savingBuy = false;
      });
      widget.onChanged();
    } catch (e) {
      if (mounted) setState(() => _savingBuy = false);
    }
  }

  Future<void> _recordSell() async {
    final shares = double.tryParse(_sellSharesCtrl.text);
    final price = double.tryParse(_sellPriceCtrl.text);
    final commission = double.tryParse(_sellCommCtrl.text) ?? 0.0;

    final ownedShares = (widget.inv['shares'] as num).toDouble();
    final avgBuyPrice = (widget.inv['avg_buy_price'] as num).toDouble();

    if (shares == null || shares <= 0 || price == null || price <= 0) return;
    if (shares > ownedShares) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('inv_sell_exceeds_shares'.tr(), style: const TextStyle())),
      );
      return;
    }

    final proceeds = (shares * price) - commission;
    final costBasis = shares * avgBuyPrice;
    final realizedPnl = proceeds - costBasis;
    final isGain = realizedPnl >= 0;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(ctx).colorScheme.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('inv_sell_confirm_btn'.tr(),
            style: TextStyle(fontWeight: FontWeight.w900,
                color: Theme.of(ctx).colorScheme.onSurface)),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          _summaryRow(ctx, 'inv_sell_avg_buy'.tr(),
              '\$${avgBuyPrice.toStringAsFixed(2)}',
              Theme.of(ctx).colorScheme.onSurfaceVariant),
          const SizedBox(height: 8),
          _summaryRow(ctx, 'inv_price'.tr(),
              '\$${price.toStringAsFixed(2)}',
              Theme.of(ctx).colorScheme.onSurfaceVariant),
          const SizedBox(height: 8),
          _summaryRow(ctx, 'inv_sell_proceeds'.tr(),
              '\$${proceeds.toStringAsFixed(2)}',
              Theme.of(ctx).colorScheme.onSurface),
          const Divider(height: 20),
          _summaryRow(
            ctx,
            isGain ? 'inv_sell_realized_gain'.tr() : 'inv_sell_realized_loss'.tr(),
            '${isGain ? '+' : ''}\$${realizedPnl.toStringAsFixed(2)}',
            isGain ? AppColors.success : AppColors.error,
          ),
        ]),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('inv_cancel'.tr(), style: const TextStyle()),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
            child: Text('inv_sell_confirm_btn'.tr(),
                style: const TextStyle(fontWeight: FontWeight.w900)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _savingSell = true);
    final user = Supabase.instance.client.auth.currentUser!;

    try {
      final today = DateTime.now().toIso8601String().split('T')[0];
      final currency = widget.inv['currency'] as String? ?? 'USD';

      await Supabase.instance.client.from('investment_transactions').insert({
        'investment_id': widget.inv['id'],
        'user_id': user.id,
        'type': 'sell',
        'shares': shares,
        'price': price,
        'commission': commission,
        'transaction_date': today,
      });

      final newShares = ownedShares - shares;
      await Supabase.instance.client.from('investments').update({
        'shares': newShares,
      }).eq('id', widget.inv['id']);

      // إضافة معاملة دخل تلقائياً عند البيع
      final profileRes = await Supabase.instance.client
          .from('profiles')
          .select('currency')
          .eq('id', user.id)
          .single();
      final userCurrency = profileRes['currency'] as String? ?? 'USD';

      double convertedProceeds = proceeds;
      if (currency != userCurrency) {
        final rate = await CurrencyService.fetchExchangeRate(currency, userCurrency);
        if (rate != null) convertedProceeds = proceeds * rate;
      }

      await Supabase.instance.client.from('transactions').insert({
        'user_id': user.id,
        'type': 'income',
        'category': 'استثمار',
        'amount': convertedProceeds,
        'description':
            'بيع $shares وحدة من ${widget.inv['symbol']} بسعر \$$price${currency != userCurrency ? ' (${proceeds.toStringAsFixed(2)} $currency)' : ''}',
        'transaction_date': today,
      });

      await Supabase.instance.client.rpc('upsert_investment_cash', params: {
        'p_user_id': user.id,
        'p_currency': currency,
        'p_amount': proceeds,
      });

      _sellSharesCtrl.clear();
      _sellPriceCtrl.clear();
      _sellCommCtrl.text = '0.5';

      setState(() {
        _showSellForm = false;
        _savingSell = false;
      });
      widget.onChanged();
    } catch (e) {
      if (mounted) setState(() => _savingSell = false);
    }
  }

  Widget _summaryRow(BuildContext ctx, String label, String value, Color valueColor) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: TextStyle(fontSize: 13,
          color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
      Text(value, style: TextStyle(fontSize: 13,
          fontWeight: FontWeight.w900, color: valueColor)),
    ]);
  }

  TextField _miniField(
      TextEditingController ctrl, String hint, TextInputType type) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextField(
      controller: ctrl,
      keyboardType: type,
      textAlign: TextAlign.center,
      style: TextStyle(
          color: colorScheme.onSurface, fontSize: 12),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(
            color: colorScheme.onSurfaceVariant,
            fontSize: 10),
        filled: true,
        fillColor: colorScheme.surface,
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final inv = widget.inv;
    final shares = (inv['shares'] as num).toDouble();
    final avgPrice = (inv['avg_buy_price'] as num).toDouble();
    final currentPrice = (inv['current_price'] as num).toDouble();
    final value = shares * currentPrice;
    final cost = shares * avgPrice;
    final gain = value - cost;
    final gainPct = cost > 0 ? (gain / cost * 100) : 0.0;
    final isHalal = inv['is_halal'] as bool? ?? false;

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: colorScheme.outlineVariant)),
      child: Column(children: [
        Row(children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
                color: colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12)),
            child: Center(
                child: Text(inv['symbol']?.toString().substring(0, 1) ?? '?',
                    style: TextStyle(
                        color: colorScheme.primary,
                        fontWeight: FontWeight.w900,
                        fontSize: 18))),
          ),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Row(children: [
                  Text(inv['symbol'] ?? '',
                      style: TextStyle(
                          color: colorScheme.onSurface,
                          fontWeight: FontWeight.w900,
                          fontSize: 14)),
                  if (isHalal) ...[
                    const SizedBox(width: 6),
                    Icon(Icons.mosque, size: 12, color: colorScheme.onSurfaceVariant)
                  ],
                ]),
                Text(
                    '${shares.toStringAsFixed(4)} ${"inv_shares_suffix".tr()} • \$${currentPrice.toStringAsFixed(2)}',
                    style: TextStyle(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: 11)),
              ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('\$${value.toStringAsFixed(2)}',
                style: TextStyle(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w900)),
            Text('${gain >= 0 ? '+' : ''}${gainPct.toStringAsFixed(1)}%',
                style: TextStyle(
                    color: gain >= 0
                        ? AppColors.success
                        : AppColors.error,
                    fontSize: 12,
                    fontWeight: FontWeight.w700)),
          ]),
          const SizedBox(width: 8),
          GestureDetector(
              onTap: _showAddDialog,
              child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                      color: colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(7),
                      border: Border.all(
                          color: colorScheme.primary.withValues(alpha: 0.2))),
                  child:
                      Icon(Icons.edit, color: colorScheme.primary, size: 14))),
          const SizedBox(width: 6),
          GestureDetector(
              onTap: () => widget.onDelete(inv['id'].toString()),
              child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                      color: colorScheme.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(7),
                      border: Border.all(
                          color: colorScheme.error.withValues(alpha: 0.2))),
                  child:
                      Icon(Icons.close, color: colorScheme.error, size: 14))),
        ]),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${"inv_sell_avg_buy".tr()}: \$${avgPrice.toStringAsFixed(2)}',
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 10),
            ),
            Text(
              '${'inv_roi_label'.tr()}: ${gain >= 0 ? "+" : ""}\$${gain.toStringAsFixed(2)}',
              style: TextStyle(
                  color: gain >= 0
                      ? AppColors.success
                      : AppColors.error,
                  fontSize: 10,
                  fontWeight: FontWeight.w700),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Semantics(
          value: cost > 0
              ? '${((value / cost - 1) * 100).toStringAsFixed(1)}%'
              : '0%',
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: cost > 0 ? (value / (cost * 2)).clamp(0.0, 1.0) : 0,
              backgroundColor: colorScheme.outlineVariant,
              valueColor: AlwaysStoppedAnimation(
                  gain >= 0 ? AppColors.success : colorScheme.error),
              minHeight: 4,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
              child: OutlinedButton(
            onPressed: _showTxHistory,
            style: OutlinedButton.styleFrom(
                foregroundColor: colorScheme.onSurfaceVariant,
                side: BorderSide(color: colorScheme.outlineVariant),
                padding: const EdgeInsets.symmetric(vertical: 8),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8))),
            child: Text('inv_tx_history'.tr(),
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700)),
          )),
          const SizedBox(width: 8),
          Expanded(
              child: OutlinedButton(
            onPressed: () => setState(() {
              _showBuyForm = !_showBuyForm;
              _showSellForm = false;
            }),
            style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.success,
                side: BorderSide(
                    color: AppColors.success.withValues(alpha: 0.3)),
                padding: const EdgeInsets.symmetric(vertical: 8),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8))),
            child: Text('inv_record_buy'.tr(),
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700)),
          )),
        ]),
        const SizedBox(height: 6),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: () => setState(() {
              _showSellForm = !_showSellForm;
              _showBuyForm = false;
            }),
            style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: BorderSide(
                    color: AppColors.error.withValues(alpha: 0.3)),
                padding: const EdgeInsets.symmetric(vertical: 8),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8))),
            child: Text('inv_record_sell'.tr(),
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700)),
          ),
        ),
        if (_showBuyForm) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(10)),
            child: Column(children: [
              Row(children: [
                Expanded(
                    child: _miniField(_buySharesCtrl, 'inv_shares_count_hint'.tr(),
                        const TextInputType.numberWithOptions(decimal: true))),
                const SizedBox(width: 8),
                Expanded(
                    child: _miniField(_buyPriceCtrl, 'inv_price_with_dollar_hint'.tr(),
                        const TextInputType.numberWithOptions(decimal: true))),
                const SizedBox(width: 8),
                Expanded(
                    child: _miniField(_buyCommCtrl, 'inv_comm_hint'.tr(),
                        const TextInputType.numberWithOptions(decimal: true))),
              ]),
              const SizedBox(height: 10),
              SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _savingBuy ? null : _recordBuy,
                    style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8))),
                    child: _savingBuy
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : Text('inv_submit_btn'.tr(),
                            style: TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 12)),
                  )),
            ]),
          ),
        ],
        if (_showSellForm) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.error.withValues(alpha: 0.2))),
            child: Column(children: [
              Row(children: [
                Expanded(
                    child: _miniField(_sellSharesCtrl, 'inv_shares_count_hint'.tr(),
                        const TextInputType.numberWithOptions(decimal: true))),
                const SizedBox(width: 8),
                Expanded(
                    child: _miniField(_sellPriceCtrl, 'inv_price_with_dollar_hint'.tr(),
                        const TextInputType.numberWithOptions(decimal: true))),
                const SizedBox(width: 8),
                Expanded(
                    child: _miniField(_sellCommCtrl, 'inv_comm_hint'.tr(),
                        const TextInputType.numberWithOptions(decimal: true))),
              ]),
              const SizedBox(height: 8),
              Text(
                '${'inv_sell_max_shares'.tr()}: ${shares.toStringAsFixed(4)} ${'inv_shares_suffix'.tr()}',
                style: TextStyle(
                    fontSize: 10,
                    color: colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 10),
              SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _savingSell ? null : _recordSell,
                    style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.error,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8))),
                    child: _savingSell
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : Text('inv_sell_confirm_btn'.tr(),
                            style: TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 12)),
                  )),
            ]),
          ),
        ],
      ]),
    );
  }
}
