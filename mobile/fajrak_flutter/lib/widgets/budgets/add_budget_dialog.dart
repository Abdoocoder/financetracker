import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:easy_localization/easy_localization.dart';

class AddBudgetDialog extends StatefulWidget {
  final Map<String, dynamic>? existing;
  final List<Map<String, dynamic>> localizedCategories;
  final String currency;
  final int month;
  final int year;
  final List<Map<String, dynamic>> currentBudgets;
  final VoidCallback onSaved;

  const AddBudgetDialog({
    super.key,
    this.existing,
    required this.localizedCategories,
    required this.currency,
    required this.month,
    required this.year,
    required this.currentBudgets,
    required this.onSaved,
  });

  @override
  State<AddBudgetDialog> createState() => _AddBudgetDialogState();
}

class _AddBudgetDialogState extends State<AddBudgetDialog> {
  late String _selectedCat;
  late final TextEditingController _limitCtrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _selectedCat = widget.existing?['category'] as String? ??
        widget.localizedCategories[0]['key'] as String;
    _limitCtrl = TextEditingController(
        text: widget.existing?['monthly_limit']?.toString() ?? '');
  }

  @override
  void dispose() {
    _limitCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving) return;
    if (_limitCtrl.text.isEmpty) return;
    _saving = true;
    setState(() {});
    final user = Supabase.instance.client.auth.currentUser!;
    HapticFeedback.mediumImpact();
    
    final limit = double.tryParse(_limitCtrl.text) ?? 0;
    
    try {
      if (widget.existing != null) {
        await Supabase.instance.client.from('budgets').update({
          'monthly_limit': limit
        }).eq('id', widget.existing!['id']);
      } else {
        final exists =
            widget.currentBudgets.any((b) => b['category'] == _selectedCat);
        if (exists) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                content: Text('budget_category_exists'.tr(),
                    style: const TextStyle()),
                backgroundColor: const Color(0xFFF59E0B)));
          }
          return;
        }
        await Supabase.instance.client.from('budgets').insert({
          'user_id': user.id,
          'category': _selectedCat,
          'monthly_limit': limit,
          'month': widget.month,
          'year': widget.year
        });
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
    final colorScheme = Theme.of(context).colorScheme;
    
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
                color: colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 16),
        Text(widget.existing != null ? 'budget_edit'.tr() : 'budget_new'.tr(),
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: colorScheme.onSurface)),
        const SizedBox(height: 20),
        if (widget.existing == null) ...[
          Align(
              alignment: Alignment.centerRight,
              child: Text('budget_category'.tr(),
                  style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 12))),
          const SizedBox(height: 8),
          GridView.count(
              crossAxisCount: 4,
              shrinkWrap: true,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: 1,
              children: widget.localizedCategories.map((cat) {
                final isSelected = cat['key'] == _selectedCat;
                return GestureDetector(
                  onTap: () => setState(() => _selectedCat = cat['key'] as String),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected
                          ? colorScheme.primary.withValues(alpha: 0.15)
                          : colorScheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: isSelected
                              ? colorScheme.primary
                              : colorScheme.outlineVariant),
                    ),
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(cat['icon'] as String,
                              style: const TextStyle(fontSize: 20)),
                          const SizedBox(height: 4),
                          Text(cat['label'] as String,
                              style: TextStyle(
                                  color: isSelected
                                      ? colorScheme.primary
                                      : colorScheme.onSurfaceVariant,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700),
                              textAlign: TextAlign.center),
                        ]),
                  ),
                );
              }).toList()),
          const SizedBox(height: 12),
        ],
        TextField(
          controller: _limitCtrl,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          textAlign: TextAlign.right,
          style: TextStyle(color: colorScheme.onSurface),
          decoration: InputDecoration(
            labelText: 'budget_monthly_limit'.tr(args: [widget.currency]),
            labelStyle: TextStyle(
                color: colorScheme.onSurfaceVariant),
            filled: true,
            fillColor: colorScheme.surface,
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: colorScheme.outlineVariant)),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                  backgroundColor: colorScheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12))),
              child: Text(widget.existing != null ? 'save'.tr() : 'add'.tr(),
                  style: const TextStyle(
                      fontWeight: FontWeight.w900)),
            )),
        const SizedBox(height: 16),
      ]),
    );
  }
}
