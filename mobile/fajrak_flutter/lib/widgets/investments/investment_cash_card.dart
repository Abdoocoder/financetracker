import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/currency_service.dart';

class InvestmentCashCard extends StatefulWidget {
  final double balance;
  final String currency;
  final String accountCurrency;
  final VoidCallback onTransferred;

  const InvestmentCashCard({
    super.key,
    required this.balance,
    required this.currency,
    required this.accountCurrency,
    required this.onTransferred,
  });

  @override
  State<InvestmentCashCard> createState() => _InvestmentCashCardState();
}

class _InvestmentCashCardState extends State<InvestmentCashCard> {
  final _amountCtrl = TextEditingController();
  bool _transferring = false;
  double? _exchangeRate;
  bool _loadingRate = false;

  bool get _needsConversion => widget.currency != widget.accountCurrency;

  Future<void> _fetchRate() async {
    if (!_needsConversion) return;
    setState(() => _loadingRate = true);
    final rate = await CurrencyService.fetchExchangeRate(
        widget.currency, widget.accountCurrency);
    if (mounted) {
      setState(() {
        _exchangeRate = rate;
        _loadingRate = false;
      });
    }
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _showTransferDialog() async {
    _amountCtrl.text = widget.balance.toStringAsFixed(2);
    await _fetchRate();

    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              left: 20,
              right: 20,
              top: 20),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: Theme.of(ctx).colorScheme.outlineVariant,
                    borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            Text('inv_cash_transfer_title'.tr(),
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: Theme.of(ctx).colorScheme.onSurface)),
            const SizedBox(height: 8),
            Text(
                '${'inv_cash_available'.tr()}: ${widget.balance.toStringAsFixed(2)} ${widget.currency}',
                style: TextStyle(
                    fontSize: 13,
                    color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
            const SizedBox(height: 20),
            TextField(
              controller: _amountCtrl,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              textAlign: TextAlign.center,
              onChanged: (_) => setModalState(() {}),
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: Theme.of(ctx).colorScheme.onSurface),
              decoration: InputDecoration(
                hintText: 'inv_cash_transfer_amount_hint'.tr(),
                hintStyle: TextStyle(
                    color: Theme.of(ctx).colorScheme.onSurfaceVariant),
                suffix: Text(widget.currency,
                    style: TextStyle(
                        fontSize: 14,
                        color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
                filled: true,
                fillColor: Theme.of(ctx).colorScheme.surfaceContainerHighest,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
            if (_needsConversion) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                    color: Theme.of(ctx).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(10)),
                child: _loadingRate
                    ? Center(child: SizedBox(width: 18, height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2,
                            color: Theme.of(ctx).colorScheme.primary)))
                    : _exchangeRate == null
                        ? Text('تعذر جلب سعر الصرف',
                            style: TextStyle(fontSize: 12,
                                color: Theme.of(ctx).colorScheme.error))
                        : () {
                            final enteredAmount = double.tryParse(_amountCtrl.text) ?? 0;
                            final converted = enteredAmount * _exchangeRate!;
                            return Column(children: [
                              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                                Text('سعر الصرف', style: TextStyle(fontSize: 12, color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
                                Text('1 ${widget.currency} = ${_exchangeRate!.toStringAsFixed(4)} ${widget.accountCurrency}',
                                    style: TextStyle(fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: Theme.of(ctx).colorScheme.onSurface)),
                              ]),
                              const SizedBox(height: 6),
                              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                                Text('ستستلم', style: TextStyle(fontSize: 12, color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
                                Text('${converted.toStringAsFixed(2)} ${widget.accountCurrency}',
                                    style: const TextStyle(fontSize: 14,
                                        fontWeight: FontWeight.w900, color: AppColors.success)),
                              ]),
                            ]);
                          }(),
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _transferring
                    ? null
                    : () => _doTransfer(ctx, setModalState),
                style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(ctx).colorScheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12))),
                child: _transferring
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : Text('inv_cash_transfer_confirm'.tr(),
                        style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 15)),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  Future<void> _doTransfer(
      BuildContext ctx, StateSetter setModalState) async {
    final amount = double.tryParse(_amountCtrl.text);
    if (amount == null || amount <= 0) return;
    if (amount > widget.balance) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('inv_cash_transfer_exceeds'.tr(),
              style: const TextStyle())));
      return;
    }

    setModalState(() => _transferring = true);
    final user = Supabase.instance.client.auth.currentUser!;

    try {
      final convertedAmount = _needsConversion && _exchangeRate != null
          ? amount * _exchangeRate!
          : amount;

      await Supabase.instance.client.from('transactions').insert({
        'user_id': user.id,
        'type': 'income',
        'category': 'استثمار',
        'amount': convertedAmount,
        'description':
            'تحويل من المحفظة الاستثمارية ($amount ${widget.currency}${_needsConversion && _exchangeRate != null ? ' ← ${convertedAmount.toStringAsFixed(2)} ${widget.accountCurrency}' : ''})',
        'transaction_date': DateTime.now().toIso8601String().split('T')[0],
      });

      await Supabase.instance.client.rpc('upsert_investment_cash', params: {
        'p_user_id': user.id,
        'p_currency': widget.currency,
        'p_amount': -amount,
      });

      if (ctx.mounted) Navigator.pop(ctx);
      widget.onTransferred();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('inv_cash_transfer_success'.tr(),
                style: const TextStyle()),
            backgroundColor: AppColors.success));
      }
    } catch (e) {
      setModalState(() => _transferring = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final hasBalance = widget.balance > 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: hasBalance
                  ? AppColors.success.withValues(alpha: 0.3)
                  : colorScheme.outlineVariant)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text('inv_cash_title'.tr(),
              style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 15,
                  color: colorScheme.onSurface)),
          const Spacer(),
          if (hasBalance)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8)),
              child: Text(widget.currency,
                  style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.success)),
            ),
        ]),
        const SizedBox(height: 10),
        if (!hasBalance)
          Text('inv_cash_empty'.tr(),
              style: TextStyle(
                  fontSize: 12,
                  color: colorScheme.onSurfaceVariant))
        else ...[
          Text('\$${widget.balance.toStringAsFixed(2)}',
              style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: AppColors.success)),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _showTransferDialog,
              icon: const Icon(Icons.arrow_forward, size: 16),
              label: Text('inv_cash_transfer_btn'.tr(),
                  style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13)),
              style: OutlinedButton.styleFrom(
                  foregroundColor: colorScheme.primary,
                  side: BorderSide(
                      color: colorScheme.primary.withValues(alpha: 0.4)),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10))),
            ),
          ),
        ],
      ]),
    );
  }
}
