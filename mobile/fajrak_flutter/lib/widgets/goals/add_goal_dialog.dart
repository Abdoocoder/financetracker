import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../utils/error_handler.dart';

class AddGoalDialog extends StatefulWidget {
  final Map<String, dynamic>? existing;
  final List<String> goalIcons;
  final VoidCallback onSaved;

  const AddGoalDialog({
    super.key,
    this.existing,
    required this.goalIcons,
    required this.onSaved,
  });

  @override
  State<AddGoalDialog> createState() => _AddGoalDialogState();
}

class _AddGoalDialogState extends State<AddGoalDialog> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _targetCtrl;
  late final TextEditingController _currentCtrl;
  late String _selectedIcon;
  late String _deadlineDate;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.existing?['name'] ?? '');
    _targetCtrl = TextEditingController(text: widget.existing?['target_amount']?.toString() ?? '');
    _currentCtrl = TextEditingController(text: widget.existing?['current_amount']?.toString() ?? '0');
    _selectedIcon = widget.existing?['icon'] as String? ?? '🎯';
    _deadlineDate = widget.existing?['target_date'] as String? ?? '';
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _targetCtrl.dispose();
    _currentCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final user = Supabase.instance.client.auth.currentUser!;
    HapticFeedback.mediumImpact();
    final data = {
      'user_id': user.id,
      'name': _nameCtrl.text,
      'icon': _selectedIcon,
      'target_amount': double.tryParse(_targetCtrl.text) ?? 0,
      'current_amount': double.tryParse(_currentCtrl.text) ?? 0,
      'target_date': _deadlineDate.isEmpty ? null : _deadlineDate,
    };
    try {
      if (widget.existing != null) {
        await Supabase.instance.client
            .from('savings_goals')
            .update(data)
            .eq('id', widget.existing!['id']);
      } else {
        await Supabase.instance.client.from('savings_goals').insert(data);
      }
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'Goals Save');
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
      child: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
                color: colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 16),
        Text(widget.existing != null ? 'goals_edit'.tr() : 'goals_new'.tr(),
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: colorScheme.onSurface,
                fontFamily: 'Cairo')),
        const SizedBox(height: 20),
        Align(
            alignment: Alignment.centerRight,
            child: Text('goals_choose_icon'.tr(),
                style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 12,
                    fontFamily: 'Cairo'))),
        const SizedBox(height: 8),
        SizedBox(
          height: 120,
          child: GridView.builder(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 10, mainAxisSpacing: 4, crossAxisSpacing: 4),
            itemCount: widget.goalIcons.length,
            itemBuilder: (_, i) {
              final icon = widget.goalIcons[i];
              final selected = icon == _selectedIcon;
              return GestureDetector(
                onTap: () => setState(() => _selectedIcon = icon),
                child: Container(
                  decoration: BoxDecoration(
                    color: selected
                        ? colorScheme.primary.withValues(alpha: 0.25)
                        : colorScheme.outlineVariant,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                        color: selected ? colorScheme.primary : Colors.transparent),
                  ),
                  child: Center(
                      child: Text(icon, style: const TextStyle(fontSize: 18))),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        _field('goals_name_hint'.tr(), _nameCtrl, TextInputType.text),
        const SizedBox(height: 10),
        _field('goals_target_amount'.tr(), _targetCtrl,
            const TextInputType.numberWithOptions(decimal: true)),
        const SizedBox(height: 10),
        _field('goals_current_amount'.tr(), _currentCtrl,
            const TextInputType.numberWithOptions(decimal: true)),
        const SizedBox(height: 10),
        GestureDetector(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: _deadlineDate.isNotEmpty
                  ? DateTime.tryParse(_deadlineDate) ??
                      DateTime.now().add(const Duration(days: 180))
                  : DateTime.now().add(const Duration(days: 180)),
              firstDate: DateTime.now(),
              lastDate: DateTime.now().add(const Duration(days: 365 * 10)),
            );
            if (picked != null) {
              setState(() {
                _deadlineDate = picked.toIso8601String().split('T')[0];
              });
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
                color: colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(10)),
            child: Row(children: [
              Icon(Icons.calendar_today_outlined,
                  color: colorScheme.onSurfaceVariant, size: 18),
              const SizedBox(width: 10),
              Text(
                _deadlineDate.isNotEmpty
                    ? 'goals_deadline_value'.tr(args: [_deadlineDate])
                    : 'goals_deadline_hint'.tr(),
                style: TextStyle(
                    color: _deadlineDate.isNotEmpty
                        ? colorScheme.onSurface
                        : colorScheme.onSurfaceVariant,
                    fontFamily: 'Cairo',
                    fontSize: 13),
              ),
            ]),
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _save,
              style: ElevatedButton.styleFrom(
                  backgroundColor: colorScheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12))),
              child: Text(
                  widget.existing != null ? 'goals_save_edit'.tr() : 'goals_save'.tr(),
                  style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.w900,
                      fontSize: 15)),
            )),
        const SizedBox(height: 16),
      ])),
    );
  }

  Widget _field(String hint, TextEditingController ctrl, TextInputType type) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextField(
      controller: ctrl,
      keyboardType: type,
      textAlign: TextAlign.right,
      style: TextStyle(color: colorScheme.onSurface, fontFamily: 'Cairo'),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo'),
        filled: true,
        fillColor: colorScheme.outlineVariant,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }
}
