import 'package:easy_localization/easy_localization.dart';
import '../../services/currency_service.dart';

class AddTransactionDialog extends StatefulWidget {
  final Map<String, dynamic>? existing;
  final VoidCallback onSaved;
  final String baseCurrency;

  const AddTransactionDialog({
    super.key,
    this.existing,
    required this.onSaved,
    this.baseCurrency = 'JOD',
  });

  @override
  State<AddTransactionDialog> createState() => _AddTransactionDialogState();
}

class _AddTransactionDialogState extends State<AddTransactionDialog> {
  late final ValueNotifier<String> _typeController;
  late final TextEditingController _amountController;
  late final TextEditingController _descController;
  late final TextEditingController _catController;
  late final ValueNotifier<DateTime> _dateController;
  
  String _selectedCurrency = '';
  double _exchangeRate = 1.0;
  final _exchangeRateController = TextEditingController(text: '1.0');
  bool _isRateManual = false;

  @override
  void initState() {
    super.initState();
    _typeController = ValueNotifier<String>(widget.existing?['type'] ?? 'expense');
    _amountController = TextEditingController(text: widget.existing?['amount']?.toString() ?? '');
    _descController = TextEditingController(text: widget.existing?['description'] ?? '');
    _catController = TextEditingController(text: widget.existing?['category'] ?? '');
    _dateController = ValueNotifier<DateTime>(widget.existing != null
        ? DateTime.parse(widget.existing!['transaction_date'])
        : DateTime.now());
    
    _selectedCurrency = widget.existing?['original_currency'] ?? widget.baseCurrency;
    _exchangeRate = (widget.existing?['exchange_rate'] as num?)?.toDouble() ?? 1.0;
    _exchangeRateController.text = _exchangeRate.toString();
    if (_selectedCurrency != widget.baseCurrency && widget.existing == null) {
      _fetchRate();
    }
  }

  Future<void> _fetchRate() async {
    if (_selectedCurrency == widget.baseCurrency) {
      setState(() {
        _exchangeRate = 1.0;
        _exchangeRateController.text = '1.0';
      });
      return;
    }
    final rate = await CurrencyService.fetchExchangeRate(_selectedCurrency, widget.baseCurrency);
    if (mounted && !_isRateManual) {
      setState(() {
        _exchangeRate = rate;
        _exchangeRateController.text = rate.toString();
      });
    }
  }

  @override
  void dispose() {
    _typeController.dispose();
    _amountController.dispose();
    _descController.dispose();
    _catController.dispose();
    _dateController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final user = Supabase.instance.client.auth.currentUser!;
    final origAmount = double.tryParse(_amountController.text) ?? 0;
    final rate = double.tryParse(_exchangeRateController.text) ?? 1.0;
    final baseAmount = _selectedCurrency == widget.baseCurrency ? origAmount : (origAmount * rate);

    final data = {
      'user_id': user.id,
      'type': _typeController.value,
      'amount': baseAmount,
      'original_amount': origAmount,
      'original_currency': _selectedCurrency,
      'exchange_rate': rate,
      'category': _catController.text,
      'description': _descController.text.isEmpty ? null : _descController.text,
      'transaction_date': _dateController.value.toIso8601String().split('T')[0],
    };

    if (widget.existing != null) {
      await Supabase.instance.client
          .from('transactions')
          .update(data)
          .eq('id', widget.existing!['id']);
    } else {
      await Supabase.instance.client.from('transactions').insert(data);
    }
    widget.onSaved();
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 20,
          right: 20,
          top: 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
              child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 16),
          Center(
              child: Text(
                  widget.existing != null ? 'trans_edit'.tr() : 'trans_new'.tr(),
                  style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      fontFamily: 'Cairo'))),
          const SizedBox(height: 20),
          ValueListenableBuilder<String>(
            valueListenable: _typeController,
            builder: (_, type, __) => Row(
              children: [
                Expanded(
                    child: GestureDetector(
                  onTap: () => _typeController.value = 'income',
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: type == 'income'
                          ? const Color(0xFF10B981).withValues(alpha: 0.2)
                          : const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: type == 'income'
                              ? const Color(0xFF10B981)
                              : Colors.transparent),
                    ),
                    child: Center(
                        child: Text('trans_income'.tr(),
                            style: const TextStyle(
                                color: Colors.white,
                                fontFamily: 'Cairo',
                                fontWeight: FontWeight.w700))),
                  ),
                )),
                const SizedBox(width: 8),
                Expanded(
                    child: GestureDetector(
                  onTap: () => _typeController.value = 'expense',
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: type == 'expense'
                          ? const Color(0xFFEF4444).withValues(alpha: 0.2)
                          : const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: type == 'expense'
                              ? const Color(0xFFEF4444)
                              : Colors.transparent),
                    ),
                    child: Center(
                        child: Text('trans_expense'.tr(),
                            style: const TextStyle(
                                color: Colors.white,
                                fontFamily: 'Cairo',
                                fontWeight: FontWeight.w700))),
                  ),
                )),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ValueListenableBuilder<DateTime>(
            valueListenable: _dateController,
            builder: (_, date, __) => GestureDetector(
              onTap: () async {
                final picked = await showDatePicker(
                    context: context,
                    initialDate: date,
                    firstDate: DateTime(2000),
                    lastDate: DateTime(2100));
                if (picked != null) _dateController.value = picked;
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(10)),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_today,
                        color: Color(0xFF94A3B8), size: 18),
                    const SizedBox(width: 12),
                    Text(date.toIso8601String().split('T')[0],
                        style: const TextStyle(
                            color: Colors.white, fontFamily: 'Cairo')),
                  ],
                ),
              ),
            ),
          ),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: TextFormField(
                  controller: _amountController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                  decoration: InputDecoration(labelText: 'trans_amount'.tr()),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 1,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedCurrency,
                      dropdownColor: const Color(0xFF1E293B),
                      style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                      items: ['JOD','USD','SAR','AED','EGP','TRY','EUR'].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                      onChanged: (v) {
                        if (v != null) {
                          setState(() => _selectedCurrency = v);
                          _fetchRate();
                        }
                      },
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (_selectedCurrency != widget.baseCurrency) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B).withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF334155), width: 1),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _exchangeRateController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'Cairo'),
                          decoration: InputDecoration(
                            labelText: 'trans_exchange_rate'.tr(),
                            labelStyle: const TextStyle(fontSize: 12),
                            isDense: true,
                          ),
                          onChanged: (v) => _isRateManual = true,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('trans_equivalent'.tr(), style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo')),
                            const SizedBox(height: 4),
                            Text(
                              '${((double.tryParse(_amountController.text) ?? 0) * (double.tryParse(_exchangeRateController.text) ?? 1.0)).toStringAsFixed(2)} ${widget.baseCurrency}',
                              style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          TextFormField(
            controller: _catController,
            style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
            decoration: InputDecoration(labelText: 'trans_category'.tr()),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _descController,
            style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
            decoration: InputDecoration(labelText: 'trans_description'.tr()),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _save,
              style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3B7EF6),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10))),
              child: Text(widget.existing != null ? 'trans_save_edit'.tr() : 'trans_save'.tr(),
                  style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontFamily: 'Cairo',
                      color: Colors.white)),
            ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}
