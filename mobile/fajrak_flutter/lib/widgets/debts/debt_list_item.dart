import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../utils/error_handler.dart';
import '../../services/currency_service.dart';

class DebtListItem extends StatefulWidget {
  final Map<String, dynamic> debt;
  final String currency;
  final List<Color> priorityColors;
  final List<String> priorityLabels;
  final Function(Map<String, dynamic>) onEdit;
  final Function(String) onDelete;
  final Function(String debtId, double newRemaining, bool isPaid) onPaymentDone;
  final Function(String) onCelebration;

  const DebtListItem({
    super.key,
    required this.debt,
    required this.currency,
    required this.priorityColors,
    required this.priorityLabels,
    required this.onEdit,
    required this.onDelete,
    required this.onPaymentDone,
    required this.onCelebration,
  });

  @override
  State<DebtListItem> createState() => _DebtListItemState();
}

class _DebtListItemState extends State<DebtListItem> {
  bool _isPaying = false;
  bool _payingSaving = false;
  final _paymentCtrl = TextEditingController();
  
  String _paymentCurrency = '';
  double _paymentExchangeRate = 1.0;

  @override
  void initState() {
    super.initState();
    _paymentCurrency = widget.currency;
  }

  Future<void> _updatePaymentRate() async {
    if (_paymentCurrency == widget.currency) {
      if (mounted) setState(() => _paymentExchangeRate = 1.0);
      return;
    }
    final rate = await CurrencyService.fetchExchangeRate(_paymentCurrency, widget.currency);
    if (mounted) setState(() => _paymentExchangeRate = rate ?? 1.0);
  }

  @override
  void dispose() {
    _paymentCtrl.dispose();
    super.dispose();
  }

  Future<void> _makePayment() async {
    if (_payingSaving) return; // منع الضغط المزدوج قبل إعادة البناء
    final amount = double.tryParse(_paymentCtrl.text);
    if (amount == null || amount <= 0) return;
    _payingSaving = true; // تعيين فوري قبل أي await
    setState(() {});
    
    try {
      final user = Supabase.instance.client.auth.currentUser!;
      final amountInBaseCurrency = _paymentCurrency == widget.currency ? amount : (amount * _paymentExchangeRate);

      final currentRemaining = (widget.debt['remaining_amount'] as num).toDouble();
      final newRemaining = (currentRemaining - amountInBaseCurrency).clamp(0.0, double.infinity);
      final today = DateTime.now().toIso8601String().split('T')[0];
      final sb = Supabase.instance.client;

      // ── 3 operations بالتوازي (~600ms → ~200ms) ──
      await Future.wait([
        sb.from('debts').update({
          'remaining_amount': newRemaining,
          'remaining_amount_foreign': _paymentCurrency == widget.debt['currency']
              ? ((widget.debt['remaining_amount_foreign'] as num?)?.toDouble() ?? currentRemaining) - amount
              : null,
          'is_paid': newRemaining == 0,
        }).eq('id', widget.debt['id']),
        sb.from('debt_payments').insert({
          'debt_id': widget.debt['id'],
          'user_id': user.id,
          'amount': amountInBaseCurrency,
          'original_amount': amount,
          'original_currency': _paymentCurrency,
          'exchange_rate': _paymentExchangeRate,
          'payment_date': DateTime.now().toIso8601String(),
        }),
        sb.from('transactions').insert({
          'user_id': user.id,
          'type': 'expense',
          'amount': amountInBaseCurrency,
          'original_amount': amount,
          'original_currency': _paymentCurrency,
          'exchange_rate': _paymentExchangeRate,
          'category': 'debts_title'.tr(),
          'description': '${'debts_paid'.tr()}: ${widget.debt['name']}',
          'transaction_date': today,
        }),
      ]);

      _paymentCtrl.clear();
      setState(() {
        _payingSaving = false;
        _isPaying = false;
      });
      
      if (newRemaining == 0) {
        widget.onCelebration(widget.debt['name'] as String);
      }
      widget.onPaymentDone(widget.debt['id'] as String, newRemaining, newRemaining == 0);
    } catch (e) {
      if (mounted) {
        setState(() => _payingSaving = false);
        ErrorHandler.handle(e, context: context, developerMessage: 'Debt Payment');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final original = (widget.debt['original_amount'] as num).toDouble();
    final remaining = (widget.debt['remaining_amount'] as num).toDouble();
    final pct = original > 0 ? ((original - remaining) / original * 100) : 0.0;
    final priorityIndex = ((widget.debt['priority'] as int?) ?? 3) - 1;
    final prioColor = widget.priorityColors[priorityIndex.clamp(0, 4)];

    final paymentDay = widget.debt['payment_day'] as int?;
    final dueDate = widget.debt['due_date'] as String?;
    final autoDeduct = widget.debt['auto_deduct'] == true;
    final now = DateTime.now();
    final dueDateParsed = dueDate != null ? DateTime.tryParse(dueDate) : null;
    final isOverdue = dueDateParsed != null && dueDateParsed.isBefore(now);
    int? daysUntil;
    if (paymentDay != null) {
      final today = now.day;
      daysUntil = today <= paymentDay
          ? paymentDay - today
          : DateTime(now.year, now.month + 1, paymentDay)
              .difference(DateTime(now.year, now.month, now.day))
              .inDays;
    }

    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: cs.outlineVariant),
      ),
      child: Stack(
        children: [
          PositionedDirectional(
            start: 0,
            top: 0,
            bottom: 0,
            child: Container(width: 4, color: prioColor),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
                color: prioColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8)),
            child: Center(
                child: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: prioColor,
                        boxShadow: [
                          BoxShadow(
                              color: prioColor.withValues(alpha: 0.5), blurRadius: 6)
                        ]))),
          ),
          const SizedBox(width: 10),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(widget.debt['name'] ?? '',
                    style: TextStyle(
                        color: cs.onSurface,
                        fontWeight: FontWeight.w900,
                        fontSize: 14)),
                if (widget.debt['notes'] != null &&
                    (widget.debt['notes'] as String).isNotEmpty)
                  Text(widget.debt['notes'],
                      style: TextStyle(
                          color: cs.onSurfaceVariant,
                          fontSize: 11),
                      overflow: TextOverflow.ellipsis),
                if (autoDeduct || isOverdue)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Wrap(spacing: 4, children: [
                      if (autoDeduct)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(5)),
                          child: const Text('⚡ تلقائي',
                              style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w700)),
                        ),
                      if (isOverdue)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                              color: AppColors.error.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(5)),
                          child: const Text('🔴 متأخر',
                              style: TextStyle(color: AppColors.error, fontSize: 11, fontWeight: FontWeight.w700)),
                        ),
                    ]),
                  ),
              ])),
          Text('${remaining.toStringAsFixed(0)} ${widget.currency}',
              style: const TextStyle(
                  color: AppColors.error,
                  fontWeight: FontWeight.w900,
                  fontSize: 15)),
          const SizedBox(width: 8),
          GestureDetector(
              onTap: () => widget.onEdit(widget.debt),
              child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(7),
                      border: Border.all(
                          color: AppColors.primary.withValues(alpha: 0.2))),
                  child: const Icon(Icons.edit,
                      color: AppColors.primary, size: 14))),
          const SizedBox(width: 6),
          GestureDetector(
              onTap: () => widget.onDelete(widget.debt['id'].toString()),
              child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(7),
                      border: Border.all(
                          color: AppColors.error.withValues(alpha: 0.2))),
                  child: const Icon(Icons.close,
                      color: AppColors.error, size: 14))),
        ]),
        const SizedBox(height: 10),
        Semantics(
          value: '${pct.toStringAsFixed(0)}%',
          child: ClipRRect(
              borderRadius: BorderRadius.circular(5),
              child: LinearProgressIndicator(
                  value: (pct / 100).clamp(0.0, 1.0),
                  backgroundColor: cs.outlineVariant,
                  color: AppColors.success,
                  minHeight: 8)),
        ),
        const SizedBox(height: 8),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('debts_paid_pct'.tr(args: [pct.toStringAsFixed(0)]),
              style: TextStyle(
                  color: cs.onSurfaceVariant, fontSize: 11)),
          Row(children: [
            if ((widget.debt['monthly_payment'] as num).toDouble() > 0)
              Text('${(widget.debt['monthly_payment'] as num).toStringAsFixed(0)}${'debts_per_month'.tr()}',
                  style: TextStyle(
                      color: cs.onSurfaceVariant,
                      fontSize: 11)),
            if (widget.debt['payment_day'] != null) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6)),
                child: Text('debts_day_label'.tr(args: [widget.debt['payment_day'].toString()]),
                    style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 10,
                        fontWeight: FontWeight.w700)),
              ),
              if (daysUntil != null) ...[
                const SizedBox(width: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                      color: daysUntil == 0
                          ? AppColors.warning.withValues(alpha: 0.15)
                          : AppColors.textSecondary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6)),
                  child: Text(
                    daysUntil == 0 ? '🔔 اليوم!' : 'بعد $daysUntil يوم',
                    style: TextStyle(
                        color: daysUntil == 0 ? AppColors.warning : AppColors.textSecondary,
                        fontSize: 10,
                        fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ],
            if (widget.debt['due_date'] != null) ...[
              const SizedBox(width: 6),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.calendar_today, size: 10, color: AppColors.warning),
                    const SizedBox(width: 4),
                    Text(
                        (widget.debt['due_date'] as String).substring(0, 10),
                        style: const TextStyle(
                            color: AppColors.warning,
                            fontSize: 10,
                            fontWeight: FontWeight.w700)),
                  ],
                ),
            ],
          ]),
        ]),
        const SizedBox(height: 8),
        
        // Payment row
        if (_isPaying)
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Expanded(
                  flex: 3,
                  child: TextField(
                    controller: _paymentCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: TextStyle(color: cs.onSurface, fontSize: 13),
                    textAlign: TextAlign.center,
                    decoration: InputDecoration(
                        hintText: 'trans_amount'.tr(),
                        hintStyle: TextStyle(color: cs.onSurfaceVariant),
                        filled: true,
                        fillColor: cs.surfaceContainerHigh,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                    autofocus: true,
                  ),
                ),
                const SizedBox(width: 8),
                  Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(color: cs.surfaceContainerHigh, borderRadius: BorderRadius.circular(8)),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _paymentCurrency,
                      dropdownColor: cs.surface,
                      style: TextStyle(color: cs.onSurface, fontSize: 11, fontWeight: FontWeight.bold),
                      items: ['JOD','USD','SAR','AED','EGP','TRY','EUR'].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                      onChanged: (v) { if (v != null) { setState(() => _paymentCurrency = v); _updatePaymentRate(); } },
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: _payingSaving ? null : _makePayment,
                  child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(color: AppColors.success, borderRadius: BorderRadius.circular(8)),
                      child: _payingSaving
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.check, color: Colors.white, size: 14)),
                ),
                const SizedBox(width: 4),
                GestureDetector(
                  onTap: () { setState(() { _isPaying = false; _paymentCtrl.clear(); }); },
                  child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      decoration: BoxDecoration(color: cs.surfaceContainerHigh, borderRadius: BorderRadius.circular(8)),
                      child: Icon(Icons.close, color: cs.onSurfaceVariant, size: 14)),
                ),
              ]),
              if (_paymentCurrency != widget.currency)
                Padding(
                  padding: const EdgeInsets.only(top: 4, left: 4),
                  child: Text(
                    'Rate: ${_paymentExchangeRate.toStringAsFixed(4)} | ≈ ${((double.tryParse(_paymentCtrl.text) ?? 0) * _paymentExchangeRate).toStringAsFixed(2)} ${widget.currency}',
                    style: TextStyle(color: AppColors.textMuted.withValues(alpha: 0.7), fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
            ],
          )
        else
          Align(
            alignment: Alignment.centerLeft,
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _isPaying = true;
                  _paymentCtrl.clear();
                });
              },
              child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: AppColors.success.withValues(alpha: 0.2))),
                  child: Text('debts_add_payment_btn'.tr(),
                      style: TextStyle(
                          color: AppColors.successLight,
                          fontSize: 12,
                          fontWeight: FontWeight.w700))),
            ),
          ),
            ]),
          ),
        ],
      ),
    );
  }
}
