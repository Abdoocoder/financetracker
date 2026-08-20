import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:easy_localization/easy_localization.dart';

class AddAmountDialog extends StatefulWidget {
  final Map<String, dynamic> goal;
  final VoidCallback onSaved;

  const AddAmountDialog({
    super.key,
    required this.goal,
    required this.onSaved,
  });

  @override
  State<AddAmountDialog> createState() => _AddAmountDialogState();
}

class _AddAmountDialogState extends State<AddAmountDialog> {
  final TextEditingController _amountCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving) return;
    final amount = double.tryParse(_amountCtrl.text) ?? 0;
    if (amount <= 0) return;
    _saving = true;
    setState(() {});
    HapticFeedback.mediumImpact();
    final current = (widget.goal['current_amount'] as num).toDouble();
    try {
      await Supabase.instance.client
          .from('savings_goals')
          .update({'current_amount': current + amount}).eq('id', widget.goal['id']);
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
        Text('goals_add_amount_to'.tr(args: [widget.goal['name']]),
            style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: colorScheme.onSurface)),
        const SizedBox(height: 20),
        TextField(
          controller: _amountCtrl,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          textAlign: TextAlign.right,
          style: TextStyle(color: colorScheme.onSurface),
          decoration: InputDecoration(
            hintText: 'goals_amount_to_add'.tr(),
            hintStyle: TextStyle(color: colorScheme.onSurfaceVariant),
            filled: true,
            fillColor: colorScheme.outlineVariant,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
              child: Text('goals_save'.tr(),
                  style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 15)),
            )),
        const SizedBox(height: 16),
      ]),
    );
  }
}
