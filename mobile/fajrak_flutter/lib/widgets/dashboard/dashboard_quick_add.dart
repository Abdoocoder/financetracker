import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class DashboardQuickAdd extends StatefulWidget {
  final String currency;
  final Future<void> Function(String type, double amount, String category) onAdd;
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
  final _amountController = TextEditingController();
  bool _saving = false;

  final _categories = ['طعام','مواصلات','فواتير','صحة','ترفيه','تسوق','راتب','عمل حر','أخرى'];

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
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: widget.colorScheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: widget.colorScheme.outlineVariant)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('quick_add_title'.tr(), style: TextStyle(color: widget.colorScheme.onSurface, fontWeight: FontWeight.w900, fontSize: 14, fontFamily: 'Cairo')),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: GestureDetector(onTap: () => setState(() => _txType = 'income'),
            child: Container(padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(color: _txType == 'income' ? const Color(0xFF10B981).withValues(alpha: 0.2) : Colors.transparent, borderRadius: BorderRadius.circular(8), border: Border.all(color: _txType == 'income' ? const Color(0xFF10B981) : widget.colorScheme.outlineVariant)),
              child: Center(child: Text('trans_income'.tr(), style: const TextStyle(color: Color(0xFF10B981), fontFamily: 'Cairo', fontWeight: FontWeight.w700)))))),
          const SizedBox(width: 8),
          Expanded(child: GestureDetector(onTap: () => setState(() => _txType = 'expense'),
            child: Container(padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(color: _txType == 'expense' ? const Color(0xFFEF4444).withValues(alpha: 0.2) : Colors.transparent, borderRadius: BorderRadius.circular(8), border: Border.all(color: _txType == 'expense' ? const Color(0xFFEF4444) : widget.colorScheme.outlineVariant)),
              child: Center(child: Text('trans_expense'.tr(), style: const TextStyle(color: Color(0xFFEF4444), fontFamily: 'Cairo', fontWeight: FontWeight.w700)))))),
        ]),
        const SizedBox(height: 12),
        SizedBox(height: 40, child: ListView.builder(scrollDirection: Axis.horizontal, itemCount: _categories.length,
          itemBuilder: (_, i) { final cat = _categories[i]; final selected = cat == _selectedCategory;
            return GestureDetector(onTap: () => setState(() => _selectedCategory = cat),
              child: Container(margin: const EdgeInsets.only(left: 8), padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(color: selected ? widget.colorScheme.primary.withValues(alpha: 0.2) : widget.colorScheme.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: selected ? widget.colorScheme.primary : widget.colorScheme.outlineVariant)),
                child: Text(_getCategoryName(cat), style: TextStyle(color: selected ? widget.colorScheme.primary : widget.colorScheme.onSurfaceVariant, fontSize: 12, fontFamily: 'Cairo')))); })),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: TextField(controller: _amountController, keyboardType: TextInputType.number, textAlign: TextAlign.right,
            style: TextStyle(color: widget.colorScheme.onSurface, fontFamily: 'Cairo'),
            decoration: InputDecoration(hintText: 'trans_amount'.tr(), hintStyle: TextStyle(color: widget.colorScheme.onSurfaceVariant.withValues(alpha: 0.5), fontFamily: 'Cairo'), filled: true, fillColor: widget.colorScheme.surface, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: widget.colorScheme.outlineVariant)), enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: widget.colorScheme.outlineVariant)), contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12), suffixText: widget.currency, suffixStyle: TextStyle(color: widget.colorScheme.onSurfaceVariant, fontFamily: 'Cairo')))),
          const SizedBox(width: 8),
          GestureDetector(onTap: () async {
            final amount = double.tryParse(_amountController.text.trim());
            if (amount == null || amount <= 0) return;
            setState(() => _saving = true);
            await widget.onAdd(_txType, amount, _selectedCategory);
            _amountController.clear();
            if (mounted) setState(() => _saving = false);
          },
            child: Container(padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14), decoration: BoxDecoration(color: widget.colorScheme.primary, borderRadius: BorderRadius.circular(10)),
              child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : Text('add'.tr(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo')))),
        ]),
      ]),
    );
  }
}
