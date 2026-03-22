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
  bool _receivedAmount = false;
  late bool _autoDeduct;
  late String _dueDate;

  String _selectedCurrency = '';
  final _exchangeRateCtrl = TextEditingController(text: '1.0');
  bool _isRateManual = false;

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

  Future<void> _save() async {
    if (_nameCtrl.text.isEmpty || _originalCtrl.text.isEmpty) {
      return;
    }
    final user = Supabase.instance.client.auth.currentUser!;
    final payDay = int.tryParse(_paymentDayCtrl.text);
    
    final origForeign = double.tryParse(_originalCtrl.text.replaceAll(',', '.')) ?? 0;
    final remForeign = double.tryParse(_remainingCtrl.text.replaceAll(',', '.')) ?? origForeign;
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
    };

    if (widget.existing != null) {
      await Supabase.instance.client
          .from('debts')
          .update(data)
          .eq('id', widget.existing!['id']);
    } else {
      await Supabase.instance.client.from('debts').insert(data);
      if (_receivedAmount) {
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
    }
    widget.onSaved();
    if (mounted) Navigator.pop(context);
  }

  TextField _field(
          TextEditingController ctrl, String hint, TextInputType type) =>
      TextField(
        controller: ctrl,
        keyboardType: type,
        textAlign: TextAlign.right,
        style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
        decoration: InputDecoration(
            hintText: hint,
            hintStyle:
                const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo'),
            filled: true,
            fillColor: const Color(0xFF1E293B),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
      );

  @override
  Widget build(BuildContext context) {
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
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 16),
        Text(widget.existing != null ? 'debts_edit'.tr() : 'debts_new'.tr(),
            style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                fontFamily: 'Cairo')),
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
            decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(10)),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedCurrency,
                dropdownColor: const Color(0xFF1E293B),
                style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontSize: 13),
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
                Text('trans_equivalent'.tr(), style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo')),
                const SizedBox(height: 4),
                Text(
                  '${((double.tryParse(_originalCtrl.text.replaceAll(',', '.')) ?? 0) * (double.tryParse(_exchangeRateCtrl.text) ?? 1.0)).toStringAsFixed(2)} ${widget.baseCurrency}',
                  style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'Cairo'),
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
                color: const Color(0xFF1E293B),
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
                        ? Colors.white
                        : const Color(0xFF64748B),
                    fontFamily: 'Cairo',
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
                style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 12,
                    fontFamily: 'Cairo'))),
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
                                : const Color(0xFF1E293B),
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
                                      fontSize: 9,
                                      fontFamily: 'Cairo',
                                      fontWeight: FontWeight.w700),
                                  textAlign: TextAlign.center)),
                        ),
                      ),
                    ))),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () => setState(() => _autoDeduct = !_autoDeduct),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _autoDeduct
                  ? const Color(0xFF10B981).withValues(alpha: 0.1)
                  : const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: _autoDeduct
                      ? const Color(0xFF10B981).withValues(alpha: 0.4)
                      : const Color(0xFF334155)),
            ),
            child: Row(children: [
              Icon(_autoDeduct ? Icons.toggle_on : Icons.toggle_off,
                  color: _autoDeduct
                      ? const Color(0xFF10B981)
                      : const Color(0xFF64748B),
                  size: 24),
              const SizedBox(width: 10),
              Text('debts_auto_deduct'.tr(),
                  style: TextStyle(
                      color: _autoDeduct
                          ? const Color(0xFF10B981)
                          : const Color(0xFF94A3B8),
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.w700)),
            ]),
          ),
        ),
        if (widget.existing == null) ...[
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () => setState(() => _receivedAmount = !_receivedAmount),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _receivedAmount
                    ? const Color(0xFF3B7EF6).withValues(alpha: 0.1)
                    : const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: _receivedAmount
                        ? const Color(0xFF3B7EF6).withValues(alpha: 0.4)
                        : const Color(0xFF334155)),
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
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.w700)),
                    ]),
                    if (_receivedAmount)
                      Padding(
                        padding: const EdgeInsets.only(top: 4, right: 30),
                        child: Text('debts_received_today_desc'.tr(),
                            style: const TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 11,
                                fontFamily: 'Cairo')),
                      ),
                  ]),
            ),
          ),
        ],
        const SizedBox(height: 20),
        SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _save,
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
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.w900,
                      fontSize: 15)),
            )),
        const SizedBox(height: 16),
      ])),
    );
  }
}
