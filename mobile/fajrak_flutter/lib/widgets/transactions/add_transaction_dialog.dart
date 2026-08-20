import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
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

const _incomeCategories  = ['راتب','عمل حر','استثمار','مكافأة','هدية','أخرى'];
const _expenseCategories = ['طعام','مواصلات','فواتير','صحة','تعليم','ترفيه','ملابس','إيجار','اشتراكات','عناية','سفر','دين','ديون','أخرى'];

List<String> _categoriesFor(String type) =>
    type == 'income' ? _incomeCategories : _expenseCategories;

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

  bool _isRecurring = false;
  late int _recurringDay;

  @override
  void initState() {
    super.initState();
    _typeController = ValueNotifier<String>(widget.existing?['type'] ?? 'expense');
    _amountController = TextEditingController(text: widget.existing?['amount']?.toString() ?? '');
    _descController = TextEditingController(text: widget.existing?['description'] ?? '');
    _catController = TextEditingController(text: widget.existing?['category'] ?? '');

    // Only reset category for new transactions — when editing, keep the original value.
    if (widget.existing == null) {
      final cats = _categoriesFor(_typeController.value);
      if (!cats.contains(_catController.text)) _catController.text = cats.first;
    }

    _typeController.addListener(() {
      final cats = _categoriesFor(_typeController.value);
      if (!cats.contains(_catController.text)) {
        setState(() => _catController.text = cats.first);
      } else {
        setState(() {});
      }
    });

    _dateController = ValueNotifier<DateTime>(widget.existing != null
        ? DateTime.parse(widget.existing!['transaction_date'])
        : DateTime.now());

    _isRecurring = widget.existing?['is_recurring'] == true;
    _recurringDay = (widget.existing?['recurring_day'] as int?) ??
        (widget.existing != null
            ? DateTime.parse(widget.existing!['transaction_date']).day
            : DateTime.now().day);

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
        _exchangeRate = rate ?? 1.0;
        _exchangeRateController.text = (rate ?? 1.0).toString();
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

  bool _saving = false;

  Future<void> _save() async {
    if (_saving) return;
    _saving = true;
    setState(() {});
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
      'is_recurring': _isRecurring,
      'recurring_day': _isRecurring ? _recurringDay : null,
    };

    try {
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
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString(), style: const TextStyle())),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Container(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          left: 20,
          right: 20,
          top: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 5,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Center(
              child: Text(
                widget.existing != null ? 'trans_edit'.tr() : 'trans_new'.tr(),
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: theme.colorScheme.onSurface,
                ),
              ),
            ),
            const SizedBox(height: 28),
            
            // Toggle Type
            ValueListenableBuilder<String>(
              valueListenable: _typeController,
              builder: (context, type, _) => Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    _buildTypeToggle(
                      label: 'trans_income'.tr(),
                      isSelected: type == 'income',
                      activeColor: const Color(0xFF10B981),
                      onTap: () => _typeController.value = 'income',
                    ),
                    _buildTypeToggle(
                      label: 'trans_expense'.tr(),
                      isSelected: type == 'expense',
                      activeColor: const Color(0xFFEF4444),
                      onTap: () => _typeController.value = 'expense',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Date Picker Field
            _buildLabel('trans_date'.tr()),
            ValueListenableBuilder<DateTime>(
              valueListenable: _dateController,
              builder: (context, date, _) => GestureDetector(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: date,
                    firstDate: DateTime(2000),
                    lastDate: DateTime(2100),
                    builder: (context, child) => Theme(
                      data: Theme.of(context).copyWith(
                        colorScheme: theme.colorScheme.copyWith(
                          primary: const Color(0xFF3B7EF6),
                        ),
                      ),
                      child: child!,
                    ),
                  );
                  if (picked != null) _dateController.value = picked;
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.outlineVariant.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: theme.colorScheme.outlineVariant),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_month_rounded,
                          color: Color(0xFF3B7EF6), size: 20),
                      const SizedBox(width: 12),
                      Text(
                        DateFormat('yyyy-MM-dd').format(date),
                        style: TextStyle(
                          color: theme.colorScheme.onSurface, 
                          fontSize: 16,
                        ),
                      ),
                      const Spacer(),
                      const Icon(Icons.arrow_forward_ios_rounded, 
                          color: Color(0xFF475569), size: 14),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Amount & Currency
            _buildLabel('trans_amount'.tr()),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 3,
                  child: TextFormField(
                    controller: _amountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: TextStyle(
                      color: isDark ? const Color(0xFF38BDF8) : const Color(0xFF0F172A), 
                      fontSize: 24, 
                      fontWeight: FontWeight.w900
                    ),
                    decoration: InputDecoration(
                      hintText: '0.00',
                      hintStyle: TextStyle(color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.4)),
                      fillColor: theme.colorScheme.outlineVariant.withValues(alpha: isDark ? 0.3 : 0.6),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 1,
                  child: Container(
                    height: 58,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.outlineVariant.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: theme.colorScheme.outlineVariant),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedCurrency,
                        icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF94A3B8)),
                        dropdownColor: theme.colorScheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        isExpanded: true,
                        style: TextStyle(
                          color: isDark ? const Color(0xFF38BDF8) : const Color(0xFF0F172A), 
                          fontWeight: FontWeight.w900
                        ),
                        items: ['JOD','USD','SAR','AED','EGP','TRY','EUR']
                            .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                            .toList(),
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
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      theme.colorScheme.outlineVariant.withValues(alpha: 0.4),
                      theme.colorScheme.outlineVariant.withValues(alpha: 0.1),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: theme.colorScheme.outlineVariant),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _exchangeRateController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            style: TextStyle(
                              color: isDark ? const Color(0xFF38BDF8) : const Color(0xFF0F172A), 
                              fontSize: 16, 
                              fontWeight: FontWeight.bold
                            ),
                            decoration: InputDecoration(
                              labelText: 'trans_exchange_rate'.tr(),
                              labelStyle: TextStyle(
                                fontSize: 12, 
                                color: isDark ? const Color(0xFF38BDF8).withValues(alpha: 0.7) : const Color(0xFF0F172A).withValues(alpha: 0.7)
                              ),
                              isDense: true,
                              fillColor: Colors.transparent,
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                            ),
                            onChanged: (v) => _isRateManual = true,
                          ),
                        ),
                        Container(
                          width: 1,
                          height: 30,
                          color: theme.colorScheme.outlineVariant,
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('trans_equivalent'.tr(), 
                                  style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 10)),
                              const SizedBox(height: 4),
                              Text(
                                '${((double.tryParse(_amountController.text) ?? 0) * (double.tryParse(_exchangeRateController.text) ?? 1.0)).toStringAsFixed(2)} ${widget.baseCurrency}',
                                style: TextStyle(
                                  color: theme.colorScheme.secondary, 
                                  fontWeight: FontWeight.bold, 
                                  fontSize: 16,
                                ),
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
            const SizedBox(height: 20),

            _buildLabel('trans_category'.tr()),
            ValueListenableBuilder<String>(
              valueListenable: _typeController,
              builder: (ctx, type, _) {
                final base = _categoriesFor(type);
                // Include existing category even if not in the standard list (e.g. auto-added 'ديون').
                final categories = base.contains(_catController.text)
                    ? base
                    : [...base, _catController.text];
                final currentValue = categories.contains(_catController.text)
                    ? _catController.text
                    : categories.first;

                return Container(
                  height: 56,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.outlineVariant.withValues(alpha: isDark ? 0.3 : 0.7),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: currentValue,
                      icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF94A3B8)),
                      dropdownColor: theme.colorScheme.surface,
                      isExpanded: true,
                      style: TextStyle(
                        color: isDark ? const Color(0xFF38BDF8) : const Color(0xFF0F172A), 
                        fontWeight: FontWeight.bold
                      ),
                      items: categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                      onChanged: (v) {
                        if (v != null) {
                          setState(() => _catController.text = v);
                        }
                      },
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 20),

            _buildLabel('trans_description'.tr()),
            TextFormField(
              controller: _descController,
              maxLines: 2,
              style: TextStyle(
                color: isDark ? const Color(0xFF38BDF8) : const Color(0xFF0F172A), 
                fontWeight: FontWeight.bold
              ),
              decoration: InputDecoration(
                hintText: 'trans_add_note_hint'.tr(),
                hintStyle: TextStyle(
                  color: isDark ? const Color(0xFF38BDF8).withValues(alpha: 0.35) : const Color(0xFF0F172A).withValues(alpha: 0.35)
                ),
                fillColor: theme.colorScheme.outlineVariant.withValues(alpha: isDark ? 0.3 : 0.7),
              ),
            ),
            const SizedBox(height: 20),

            // Recurring Toggle
            GestureDetector(
              onTap: () => setState(() => _isRecurring = !_isRecurring),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: _isRecurring
                      ? const Color(0xFF3B7EF6).withValues(alpha: 0.12)
                      : theme.colorScheme.outlineVariant.withValues(alpha: isDark ? 0.3 : 0.6),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: _isRecurring
                        ? const Color(0xFF3B7EF6).withValues(alpha: 0.5)
                        : theme.colorScheme.outlineVariant,
                  ),
                ),
                child: Row(
                  children: [
                    const Text('📅', style: TextStyle(fontSize: 20)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'tx_recurring'.tr(),
                            style: TextStyle(
                              color: _isRecurring
                                  ? const Color(0xFF3B7EF6)
                                  : theme.colorScheme.onSurface,
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                            ),
                          ),
                          if (_isRecurring)
                            Text(
                              'tx_recurring_note'.tr(),
                              style: const TextStyle(
                                color: Color(0xFF3B7EF6),
                                fontSize: 12,
                              ),
                            ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _isRecurring,
                      onChanged: (v) => setState(() => _isRecurring = v),
                      activeThumbColor: const Color(0xFF3B7EF6),
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ],
                ),
              ),
            ),

            if (_isRecurring) ...[
              const SizedBox(height: 16),
              _buildLabel('tx_recurring_day'.tr()),
              Container(
                height: 56,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: theme.colorScheme.outlineVariant.withValues(alpha: isDark ? 0.3 : 0.7),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<int>(
                    value: _recurringDay,
                    icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF94A3B8)),
                    dropdownColor: theme.colorScheme.surface,
                    isExpanded: true,
                    style: TextStyle(
                      color: isDark ? const Color(0xFF38BDF8) : const Color(0xFF0F172A),
                      fontWeight: FontWeight.bold,
                    ),
                    items: List.generate(
                      28,
                      (i) => DropdownMenuItem(
                        value: i + 1,
                        child: Text('${i + 1}'),
                      ),
                    ),
                    onChanged: (v) {
                      if (v != null) setState(() => _recurringDay = v);
                    },
                  ),
                ),
              ),
            ],

            const SizedBox(height: 32),

            // Save Button with Gradient
            Container(
              width: double.infinity,
              height: 56,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: const LinearGradient(
                  colors: [Color(0xFF3B7EF6), Color(0xFF06B6D4)],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF3B7EF6).withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: Text(
                  widget.existing != null ? 'trans_save_edit'.tr() : 'trans_save'.tr(),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _buildLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8, right: 4),
      child: Text(
        label,
        style: const TextStyle(
          color: Color(0xFF94A3B8),
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildTypeToggle({
    required String label,
    required bool isSelected,
    required Color activeColor,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? activeColor : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            boxShadow: isSelected 
              ? [BoxShadow(color: activeColor.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 2))]
              : null,
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                fontSize: 16,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
