import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../services/currency_service.dart';

class DashboardQuickAdd extends StatefulWidget {
  final String currency;
  final Future<void> Function(String type, double amount, String category, {double? originalAmount, String? originalCurrency, double? exchangeRate}) onAdd;
  final ColorScheme colorScheme;

  const DashboardQuickAdd({
    super.key,
    required this.currency,
    required this.onAdd,
    required this.colorScheme,
  });

  @override
  State<DashboardQuickAdd> createState() => _DashboardQuickAddState();
}

class _DashboardQuickAddState extends State<DashboardQuickAdd> {
  String _txType = 'expense';
  String _selectedCategory = 'طعام';
  String _selectedCurrency = '';
  double _exchangeRate = 1.0;
  final _amountController = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _selectedCurrency = widget.currency;
    _updateRate();
  }

  Future<void> _updateRate() async {
    if (_selectedCurrency == widget.currency) {
      if (mounted) setState(() => _exchangeRate = 1.0);
      return;
    }
    final rate = await CurrencyService.fetchExchangeRate(_selectedCurrency, widget.currency);
    if (mounted) setState(() => _exchangeRate = rate ?? 1.0);
  }

  final _incomeCategories = ['راتب', 'عمل حر', 'استثمار', 'مكافأة', 'أخرى'];
  final _expenseCategories = ['طعام', 'مواصلات', 'فواتير', 'صحة', 'ترفيه', 'تسوق', 'إيجار', 'اشتراكات', 'عناية', 'سفر', 'دين', 'أخرى'];

  List<String> get _currentCategories => 
      _txType == 'income' ? _incomeCategories : _expenseCategories;

  String _getCategoryName(String key) {
    switch (key) {
      case 'طعام': return 'cat_food'.tr();
      case 'مواصلات': return 'cat_transport'.tr();
      case 'فواتير': return 'cat_bills'.tr();
      case 'صحة': return 'cat_health'.tr();
      case 'ترفيه': return 'cat_entertainment'.tr();
      case 'تسوق': return 'cat_shopping'.tr();
      case 'راتب': return 'cat_salary'.tr();
      case 'عمل حر': return 'cat_freelance'.tr();
      case 'استثمار': return 'cat_investments'.tr();
      case 'مكافأة': return 'cat_gifts'.tr();
      case 'إيجار': return 'cat_rent'.tr();
      case 'اشتراكات': return 'cat_subs'.tr();
      case 'عناية': return 'cat_personal'.tr();
      case 'سفر': return 'cat_travel'.tr();
      case 'دين': return 'cat_debt_pay'.tr();
      default: return 'cat_others'.tr();
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final categories = _currentCategories;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: widget.colorScheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: widget.colorScheme.outlineVariant)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('quick_add_title'.tr(), style: TextStyle(color: widget.colorScheme.onSurface, fontWeight: FontWeight.w900, fontSize: 14)),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: GestureDetector(onTap: () {
            setState(() {
              _txType = 'income';
              if (!_incomeCategories.contains(_selectedCategory)) {
                _selectedCategory = 'راتب';
              }
            });
          },
            child: Container(padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(color: _txType == 'income' ? AppColors.success.withValues(alpha: 0.2) : Colors.transparent, borderRadius: BorderRadius.circular(8), border: Border.all(color: _txType == 'income' ? AppColors.success : widget.colorScheme.outlineVariant)),
              child: Center(child: Text('trans_income'.tr(), style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w700)))))),
          const SizedBox(width: 8),
          Expanded(child: GestureDetector(onTap: () {
            setState(() {
              _txType = 'expense';
              if (!_expenseCategories.contains(_selectedCategory)) {
                _selectedCategory = 'طعام';
              }
            });
          },
            child: Container(padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(color: _txType == 'expense' ? AppColors.error.withValues(alpha: 0.2) : Colors.transparent, borderRadius: BorderRadius.circular(8), border: Border.all(color: _txType == 'expense' ? AppColors.error : widget.colorScheme.outlineVariant)),
              child: Center(child: Text('trans_expense'.tr(), style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.w700)))))),
        ]),
        const SizedBox(height: 12),
        SizedBox(height: 40, child: ListView.builder(scrollDirection: Axis.horizontal, itemCount: categories.length,
          itemBuilder: (_, i) { final cat = categories[i]; final selected = cat == _selectedCategory;
            return GestureDetector(onTap: () => setState(() => _selectedCategory = cat),
              child: Container(margin: const EdgeInsets.only(left: 8), padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(color: selected ? widget.colorScheme.primary.withValues(alpha: 0.2) : widget.colorScheme.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: selected ? widget.colorScheme.primary : widget.colorScheme.outlineVariant)),
                child: Text(_getCategoryName(cat), style: TextStyle(color: selected ? widget.colorScheme.primary : widget.colorScheme.onSurfaceVariant, fontSize: 12)))); })),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: TextField(controller: _amountController, keyboardType: TextInputType.number, textAlign: TextAlign.right,
            style: TextStyle(color: widget.colorScheme.onSurface),
            decoration: InputDecoration(hintText: 'trans_amount'.tr(), hintStyle: TextStyle(color: widget.colorScheme.onSurfaceVariant.withValues(alpha: 0.5)), filled: true, fillColor: widget.colorScheme.surface, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: widget.colorScheme.outlineVariant)), enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: widget.colorScheme.outlineVariant)), contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12)))),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(10), border: Border.all(color: widget.colorScheme.outlineVariant)),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedCurrency,
                items: ['JOD', 'USD', 'SAR', 'AED', 'EGP', 'TRY', 'EUR'].map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)))).toList(),
                onChanged: (v) { if (v != null) { setState(() => _selectedCurrency = v); _updateRate(); } },
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(onTap: () async {
            if (_saving) return;
            final val = double.tryParse(_amountController.text.trim());
            if (val == null || val <= 0) return;
            _saving = true;
            setState(() {});

            final isMulti = _selectedCurrency != widget.currency;
            final baseAmount = isMulti ? (val * _exchangeRate) : val;

            try {
              await widget.onAdd(_txType, baseAmount, _selectedCategory,
                originalAmount: val,
                originalCurrency: _selectedCurrency,
                exchangeRate: _exchangeRate);
              _amountController.clear();
            } catch (_) {
              // onAdd error is handled upstream
            } finally {
              if (mounted) setState(() => _saving = false);
            }
          },
            child: Container(padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14), decoration: BoxDecoration(color: widget.colorScheme.primary, borderRadius: BorderRadius.circular(10)),
              child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : Text('add'.tr(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)))),
        ]),
        if (_selectedCurrency != widget.currency) 
          Padding(padding: const EdgeInsets.only(top: 4), child: Text('Rate: ${_exchangeRate.toStringAsFixed(4)} | ≈ ${(double.tryParse(_amountController.text) ?? 0 * _exchangeRate).toStringAsFixed(2)} ${widget.currency}', style: TextStyle(fontSize: 10, color: widget.colorScheme.onSurfaceVariant.withValues(alpha: 0.6), fontWeight: FontWeight.bold))),
      ]),
    );
  }
}
