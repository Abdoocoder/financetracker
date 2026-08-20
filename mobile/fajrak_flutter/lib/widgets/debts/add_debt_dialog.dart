import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../services/currency_service.dart';

class AddDebtDialog extends StatefulWidget {
  final Map<String, dynamic>? existing;
  final VoidCallback onSaved;
  final List<Color> priorityColors;
  final List<String> priorityLabels;
  final String baseCurrency;

  const AddDebtDialog({
    super.key,
    this.existing,
    required this.onSaved,
    required this.priorityColors,
    required this.priorityLabels,
    this.baseCurrency = 'JOD',
  });

  @override
  State<AddDebtDialog> createState() => _AddDebtDialogState();
}

class _AddDebtDialogState extends State<AddDebtDialog> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _originalCtrl;
  late final TextEditingController _remainingCtrl;
  late final TextEditingController _monthlyCtrl;
  late final TextEditingController _notesCtrl;
  late final TextEditingController _paymentDayCtrl;
  late int _priority;
  bool _receivedAmount = true;
  bool _paidFromAccount = false;
  late bool _autoDeduct;
  late String _debtType;
  bool _saving = false;
  late String _dueDate;

  String _selectedCurrency = '';
  final _exchangeRateCtrl = TextEditingController(text: '1.0');
  final bool _isRateManual = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.existing?['name'] ?? '');
    _originalCtrl = TextEditingController(
        text: widget.existing?['original_amount_foreign']?.toString() ?? widget.existing?['original_amount']?.toString() ?? '');
    _remainingCtrl = TextEditingController(
        text: widget.existing?['remaining_amount_foreign']?.toString() ?? widget.existing?['remaining_amount']?.toString() ?? '');
    _monthlyCtrl = TextEditingController(
        text: widget.existing?['monthly_payment']?.toString() ?? '');
    _notesCtrl = TextEditingController(text: widget.existing?['notes'] ?? '');
    _paymentDayCtrl = TextEditingController(
        text: widget.existing?['payment_day']?.toString() ?? '');
    _priority = (widget.existing?['priority'] as int?) ?? 3;
    _autoDeduct = widget.existing?['auto_deduct'] as bool? ?? true;
    _debtType = widget.existing?['debt_type'] as String? ?? 'owed';
    _paidFromAccount = false;
    _dueDate = widget.existing?['due_date'] as String? ?? '';
    
    _selectedCurrency = widget.existing?['currency'] ?? widget.baseCurrency;
    final rate = (widget.existing?['exchange_rate'] as num?)?.toDouble() ?? 1.0;
    _exchangeRateCtrl.text = rate.toString();
    
    if (_selectedCurrency != widget.baseCurrency && widget.existing == null) {
      _fetchRate();
    }
  }

  Future<void> _fetchRate() async {
    if (_selectedCurrency == widget.baseCurrency) {
      setState(() {
        _exchangeRateCtrl.text = '1.0';
      });
      return;
    }
    // Note: We need to import the currency service but it might already be available or we use a static method
    final rate = await CurrencyService.fetchExchangeRate(_selectedCurrency, widget.baseCurrency);
    if (mounted && !_isRateManual) {
      setState(() {
        _exchangeRateCtrl.text = (rate ?? 1.0).toString();
      });
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _originalCtrl.dispose();
    _remainingCtrl.dispose();
    _monthlyCtrl.dispose();
    _notesCtrl.dispose();
    _paymentDayCtrl.dispose();
    _exchangeRateCtrl.dispose();
    super.dispose();
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red.shade700, duration: const Duration(seconds: 3)),
    );
  }

  Future<void> _save() async {
    if (_saving) return;
    if (_nameCtrl.text.trim().isEmpty) {
      _showError('debt_name_required'.tr());
      return;
    }
    if (_originalCtrl.text.trim().isEmpty) {
      _showError('debt_amount_required'.tr());
      return;
    }
    final origForeign = double.tryParse(_originalCtrl.text.replaceAll(',', '.')) ?? 0;
    if (origForeign <= 0) {
      _showError('debt_amount_positive'.tr());
      return;
    }
    _saving = true;
    setState(() {});
    final remForeign = double.tryParse(_remainingCtrl.text.replaceAll(',', '.')) ?? origForeign;
    if (remForeign < 0) {
      _showError('debt_remaining_negative'.tr());
      return;
    }
    if (remForeign > origForeign) {
      _showError('debt_remaining_exceeds'.tr());
      return;
    }
    final payDay = int.tryParse(_paymentDayCtrl.text);
    if (_paymentDayCtrl.text.isNotEmpty && (payDay == null || payDay < 1 || payDay > 28)) {
      _showError('debt_payment_day_range'.tr());
      return;
    }
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      _showError('error_not_logged_in'.tr());
      return;
    }
    final rate = double.tryParse(_exchangeRateCtrl.text) ?? 1.0;
    
    final origBase = _selectedCurrency == widget.baseCurrency ? origForeign : (origForeign * rate);
    final remBase = _selectedCurrency == widget.baseCurrency ? remForeign : (remForeign * rate);

    final data = {
      'user_id': user.id,
      'name': _nameCtrl.text,
      'original_amount': origBase,
      'remaining_amount': remBase,
      'original_amount_foreign': origForeign,
      'remaining_amount_foreign': remForeign,
      'currency': _selectedCurrency,
      'exchange_rate': rate,
      'monthly_payment': double.tryParse(_monthlyCtrl.text.replaceAll(',', '.')) ?? 0,
      'payment_day': (payDay != null && payDay >= 1 && payDay <= 28) ? payDay : null,
      'due_date': _dueDate.isEmpty ? null : _dueDate,
      'notes': _notesCtrl.text.isEmpty ? null : _notesCtrl.text,
      'priority': _priority,
      'is_paid': false,
      'auto_deduct': _autoDeduct,
      'debt_type': _debtType,
    };

    if (widget.existing != null) {
      await Supabase.instance.client
          .from('debts')
          .update(data)
          .eq('id', widget.existing!['id']);
    } else {
      await Supabase.instance.client.from('debts').insert(data);
      if (_receivedAmount && _debtType == 'owed') {
        await Supabase.instance.client.from('transactions').insert({
          'user_id': user.id,
          'type': 'income',
          'amount': origBase,
          'original_amount': origForeign,
          'original_currency': _selectedCurrency,
          'exchange_rate': rate,
          'category': 'debt_received_cat'.tr(),
          'description': 'debt_received_desc'.tr(args: [_nameCtrl.text]),
          'transaction_date': DateTime.now().toIso8601String().split('T')[0],
        });
      }
      if (_paidFromAccount && _debtType == 'receivable') {
        await Supabase.instance.client.from('transactions').insert({
          'user_id': user.id,
          'type': 'expense',
          'amount': origBase,
          'original_amount': origForeign,
          'original_currency': _selectedCurrency,
          'exchange_rate': rate,
          'category': 'debts_loan_given_cat'.tr(),
          'description': 'debts_loan_given_desc'.tr(args: [_nameCtrl.text]),
          'transaction_date': DateTime.now().toIso8601String().split('T')[0],
        });
      }
    }
    if (mounted) setState(() => _saving = false);
    widget.onSaved();
    if (mounted) Navigator.pop(context);
  }

  TextField _field(
          TextEditingController ctrl, String hint, TextInputType type) {
    final cs = Theme.of(context).colorScheme;
    return TextField(
        controller: ctrl,
        keyboardType: type,
        textAlign: TextAlign.right,
        style: TextStyle(color: cs.onSurface),
        decoration: InputDecoration(
            hintText: hint,
            hintStyle:
                TextStyle(color: cs.onSurfaceVariant.withValues(alpha: 0.6)),
            filled: true,
            fillColor: cs.surfaceContainerHigh,
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
      );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 20,
          right: 20,
          top: 20),
      child: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
                color: cs.outlineVariant,
                borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 16),
        Text(widget.existing != null ? 'debts_edit'.tr() : 'debts_new'.tr(),
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: cs.onSurface)),
        const SizedBox(height: 20),
        // نوع الدين
        Row(children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() { _debtType = 'owed'; if (widget.existing == null) _paidFromAccount = false; }),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: _debtType == 'owed' ? const Color(0x1AEF4444) : cs.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _debtType == 'owed' ? const Color(0xFFEF4444) : Colors.transparent),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.credit_card, size: 16, color: Color(0xFFEF4444)),
                    const SizedBox(width: 6),
                    Text('debts_tab_owed'.tr(),
                      style: TextStyle(color: _debtType == 'owed' ? const Color(0xFFEF4444) : const Color(0xFF94A3B8), fontWeight: FontWeight.w700, fontSize: 13)),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() { _debtType = 'receivable'; if (widget.existing == null) _paidFromAccount = false; }),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: _debtType == 'receivable' ? const Color(0x1A10B981) : cs.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _debtType == 'receivable' ? const Color(0xFF10B981) : Colors.transparent),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.account_balance_wallet, size: 16, color: Color(0xFF10B981)),
                    const SizedBox(width: 6),
                    Text('debts_tab_receivable'.tr(),
                      style: TextStyle(color: _debtType == 'receivable' ? const Color(0xFF10B981) : const Color(0xFF94A3B8), fontWeight: FontWeight.w700, fontSize: 13)),
                  ],
                ),
              ),
            ),
          ),
        ]),
        const SizedBox(height: 20),
        _field(_nameCtrl, 'debts_name_hint'.tr(), TextInputType.text),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
              child: _field(_originalCtrl, 'debts_original_amount'.tr(),
                  const TextInputType.numberWithOptions(decimal: true))),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(color: cs.outlineVariant, borderRadius: BorderRadius.circular(10)),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedCurrency,
                dropdownColor: cs.surface,
                style: TextStyle(color: cs.onSurface, fontSize: 13),
                items: ['JOD','USD','SAR','AED','EGP','TRY','EUR'].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (v) { if (v != null) { setState(() => _selectedCurrency = v); _fetchRate(); } },
              ),
            ),
          ),
        ]),
        const SizedBox(height: 10),
        if (_selectedCurrency != widget.baseCurrency) ...[
          Row(children: [
            Expanded(child: _field(_exchangeRateCtrl, 'trans_exchange_rate'.tr(), const TextInputType.numberWithOptions(decimal: true))),
            const SizedBox(width: 10),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('trans_equivalent'.tr(), style: TextStyle(color: cs.onSurfaceVariant, fontSize: 10)),
                const SizedBox(height: 4),
                Text(
                  '${((double.tryParse(_originalCtrl.text.replaceAll(',', '.')) ?? 0) * (double.tryParse(_exchangeRateCtrl.text) ?? 1.0)).toStringAsFixed(2)} ${widget.baseCurrency}',
                  style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ],
            )),
          ]),
          const SizedBox(height: 10),
        ],
        _field(_remainingCtrl, 'debts_remaining_amount'.tr(),
            const TextInputType.numberWithOptions(decimal: true)),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
              child: _field(_monthlyCtrl, 'debts_monthly_payment'.tr(),
                  const TextInputType.numberWithOptions(decimal: true))),
          const SizedBox(width: 10),
          Expanded(
              child: _field(_paymentDayCtrl, 'debts_payment_day'.tr(),
                  const TextInputType.numberWithOptions(decimal: false))),
        ]),
        const SizedBox(height: 10),
        GestureDetector(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: _dueDate.isNotEmpty
                  ? DateTime.tryParse(_dueDate) ??
                      DateTime.now().add(const Duration(days: 30))
                  : DateTime.now().add(const Duration(days: 30)),
              firstDate: DateTime.now(),
              lastDate: DateTime.now().add(const Duration(days: 365 * 10)),
              builder: (c, child) =>
                  Theme(data: ThemeData.dark(), child: child!),
            );
            if (picked != null) {
              setState(() => _dueDate = picked.toIso8601String().split('T')[0]);
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
                color: cs.outlineVariant,
                borderRadius: BorderRadius.circular(10)),
            child: Row(children: [
              const Icon(Icons.calendar_today_outlined,
                  color: Color(0xFF64748B), size: 18),
              const SizedBox(width: 10),
              Text(
                _dueDate.isNotEmpty
                    ? 'debts_due_date_value'.tr(args: [_dueDate])
                    : 'debts_due_date_hint'.tr(),
                style: TextStyle(
                    color: _dueDate.isNotEmpty
                        ? cs.onSurface
                        : cs.onSurfaceVariant,
                    fontSize: 13),
              ),
            ]),
          ),
        ),
        const SizedBox(height: 10),
        _field(_notesCtrl, 'debts_notes_hint'.tr(), TextInputType.text),
        const SizedBox(height: 12),
        Align(
            alignment: Alignment.centerRight,
            child: Text('debts_priority'.tr(),
                style: TextStyle(
                    color: cs.onSurfaceVariant,
                    fontSize: 12))),
        const SizedBox(height: 8),
        Row(
            children: List.generate(
                5,
                (i) => Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _priority = i + 1),
                        child: Container(
                          margin: const EdgeInsets.symmetric(horizontal: 2),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: _priority == i + 1
                                ? widget.priorityColors[i]
                                    .withValues(alpha: 0.25)
                                : cs.surfaceContainerHigh,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                                color: _priority == i + 1
                                    ? widget.priorityColors[i]
                                    : Colors.transparent),
                          ),
                          child: Center(
                              child: Text(widget.priorityLabels[i],
                                  style: TextStyle(
                                      color: widget.priorityColors[i],
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700),
                                  textAlign: TextAlign.center)),
                        ),
                      ),
                    ))),
        // auto_deduct: only meaningful for owed debts (you control when you pay).
        // For receivable debts, payments are tracked manually via the "Receive" button.
        if (_debtType == 'owed') ...[
          const SizedBox(height: 12),
          GestureDetector(
            onTap: () => setState(() => _autoDeduct = !_autoDeduct),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _autoDeduct
                    ? const Color(0xFF10B981).withValues(alpha: 0.1)
                    : cs.outlineVariant,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: _autoDeduct
                        ? const Color(0xFF10B981).withValues(alpha: 0.4)
                        : cs.outlineVariant),
              ),
              child: Row(children: [
                Icon(_autoDeduct ? Icons.toggle_on : Icons.toggle_off,
                    color: _autoDeduct
                        ? const Color(0xFF10B981)
                        : const Color(0xFF64748B),
                    size: 24),
                const SizedBox(width: 10),
                Expanded(child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('debts_auto_deduct'.tr(),
                        style: TextStyle(
                            color: _autoDeduct
                                ? const Color(0xFF10B981)
                                : const Color(0xFF94A3B8),
                            fontWeight: FontWeight.w700)),
                    Text('debts_auto_deduct_desc'.tr(),
                        style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 11)),
                  ],
                )),
              ]),
            ),
          ),
        ],
        if (widget.existing == null && _debtType == 'owed') ...[
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () => setState(() => _receivedAmount = !_receivedAmount),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _receivedAmount
                    ? cs.primary.withValues(alpha: 0.1)
                    : cs.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: _receivedAmount
                        ? cs.primary.withValues(alpha: 0.4)
                        : cs.outlineVariant),
              ),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Icon(
                          _receivedAmount
                              ? Icons.check_circle
                              : Icons.circle_outlined,
                          color: _receivedAmount
                              ? const Color(0xFF3B7EF6)
                              : const Color(0xFF64748B),
                          size: 20),
                      const SizedBox(width: 10),
                      Text('debts_received_today'.tr(),
                          style: TextStyle(
                              color: _receivedAmount
                                  ? const Color(0xFF3B7EF6)
                                  : const Color(0xFF94A3B8),
                              fontWeight: FontWeight.w700)),
                    ]),
                    if (_receivedAmount)
                      Padding(
                        padding: const EdgeInsets.only(top: 4, right: 30),
                        child: Text('debts_received_today_desc'.tr(),
                            style: const TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 11)),
                      ),
                  ]),
            ),
          ),
        ],
        if (widget.existing == null && _debtType == 'receivable') ...[
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () => setState(() => _paidFromAccount = !_paidFromAccount),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _paidFromAccount
                    ? const Color(0xFFEF4444).withValues(alpha: 0.08)
                    : cs.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: _paidFromAccount
                        ? const Color(0xFFEF4444).withValues(alpha: 0.35)
                        : cs.outlineVariant),
              ),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Icon(
                          _paidFromAccount
                              ? Icons.check_circle
                              : Icons.circle_outlined,
                          color: _paidFromAccount
                              ? const Color(0xFFEF4444)
                              : const Color(0xFF64748B),
                          size: 20),
                      const SizedBox(width: 10),
                      Text('debts_paid_from_account'.tr(),
                          style: TextStyle(
                              color: _paidFromAccount
                                  ? const Color(0xFFEF4444)
                                  : const Color(0xFF94A3B8),
                              fontWeight: FontWeight.w700)),
                    ]),
                    Padding(
                      padding: const EdgeInsets.only(top: 4, right: 30),
                      child: Text(
                        _paidFromAccount
                            ? 'debts_paid_from_account_desc'.tr()
                            : 'debts_not_paid_from_account_desc'.tr(),
                        style: TextStyle(
                            color: _paidFromAccount
                                ? const Color(0xFF64748B)
                                : const Color(0xFF94A3B8),
                            fontSize: 11),
                      ),
                    ),
                  ]),
            ),
          ),
        ],
        const SizedBox(height: 20),
        SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3B7EF6),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12))),
              child: Text(
                  widget.existing != null
                      ? 'debts_save_edit'.tr()
                      : 'debts_save'.tr(),
                  style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 15)),
            )),
        const SizedBox(height: 16),
      ])),
    );
  }
}
