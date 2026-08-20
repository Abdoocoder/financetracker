import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../widgets/common/skeleton_loader.dart';

class RecurringScreen extends StatefulWidget {
  const RecurringScreen({super.key});

  @override
  State<RecurringScreen> createState() => _RecurringScreenState();
}

class _RecurringScreenState extends State<RecurringScreen> {
  List<Map<String, dynamic>> _list = [];
  bool _loading = true;
  bool _saving = false;
  String _currency = 'JOD';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) { setState(() => _loading = false); return; }
    final profile = await Supabase.instance.client
        .from('profiles').select('currency').eq('id', user.id).single();
    final data = await Supabase.instance.client
        .from('recurring_transactions')
        .select('*').eq('user_id', user.id)
        .order('next_date');
    if (mounted) {
      setState(() {
        _currency = profile['currency'] as String? ?? 'JOD';
        _list = List<Map<String, dynamic>>.from(data as List);
        _loading = false;
      });
    }
  }

  Future<void> _toggleActive(Map<String, dynamic> rec) async {
    if (_saving) return;
    _saving = true;
    setState(() {});
    try {
      final newVal = !(rec['is_active'] as bool? ?? true);
      await Supabase.instance.client
          .from('recurring_transactions')
          .update({'is_active': newVal}).eq('id', rec['id']);
      if (mounted) {
        setState(() {
          final idx = _list.indexWhere((r) => r['id'] == rec['id']);
          if (idx >= 0) _list[idx] = {...rec, 'is_active': newVal};
        });
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete(String id) async {
    if (_saving) return;
    _saving = true;
    setState(() {});
    try {
      await Supabase.instance.client
          .from('recurring_transactions').delete().eq('id', id);
      if (mounted) {
        setState(() => _list.removeWhere((r) => r['id'] == id));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('toast_deleted'.tr(), style: const TextStyle())),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showForm({Map<String, dynamic>? existing}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => _RecurringForm(
        existing: existing,
        baseCurrency: _currency,
        onSaved: () { Navigator.pop(ctx); _load(); },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('recurring_title'.tr(), style: TextStyle(color: cs.onSurface, fontWeight: FontWeight.w900, fontSize: 18)),
          Text('recurring_subtitle'.tr(args: [_list.length.toString()]), style: TextStyle(color: cs.onSurfaceVariant, fontSize: 12)),
        ]),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showForm(),
        backgroundColor: cs.primary,
        foregroundColor: cs.onPrimary,
        icon: const Icon(Icons.add),
        label: Text('recurring_add'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: _loading
          ? const Padding(
              padding: EdgeInsets.fromLTRB(16, 12, 16, 100),
              child: ListSkeleton(count: 5),
            )
          : _list.isEmpty
              ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.repeat, size: 48, color: cs.onSurfaceVariant),
                  const SizedBox(height: 12),
                  Text('recurring_empty'.tr(), style: TextStyle(color: cs.onSurfaceVariant, fontSize: 15), textAlign: TextAlign.center),
                ]))
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                  itemCount: _list.length,
                  itemBuilder: (ctx, i) {
                    final rec = _list[i];
                    final isIncome = rec['type'] == 'income';
                    final isActive = rec['is_active'] as bool? ?? true;
                    final color = isIncome ? cs.primary : cs.error;
                    final freqLabel = _freqLabel(rec['frequency'] as String? ?? 'monthly');
                    return Opacity(
                      opacity: isActive ? 1 : 0.5,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: cs.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border(
                            top: BorderSide(color: cs.outlineVariant),
                            left: BorderSide(color: cs.outlineVariant),
                            bottom: BorderSide(color: cs.outlineVariant),
                            right: BorderSide(color: color, width: 3),
                          ),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          leading: CircleAvatar(
                            backgroundColor: color.withValues(alpha: 0.12),
                            child: Icon(isIncome ? Icons.trending_up : Icons.trending_down, color: color, size: 20),
                          ),
                          title: Text(rec['name'] ?? '', style: TextStyle(color: cs.onSurface, fontWeight: FontWeight.w800, fontSize: 14)),
                          subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('${rec['category']} · $freqLabel', style: TextStyle(color: cs.onSurfaceVariant, fontSize: 11)),
                            Text('${'recurring_next'.tr()}: ${rec['next_date'] ?? ''}', style: TextStyle(color: cs.onSurfaceVariant, fontSize: 10)),
                          ]),
                          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                            Text(
                              '${(rec['amount'] as num? ?? 0).toStringAsFixed(0)} ${rec['currency'] ?? _currency}',
                              style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 14),
                            ),
                            const SizedBox(width: 6),
                            PopupMenuButton<String>(
                              color: cs.surface,
                              onSelected: (action) {
                                if (action == 'toggle') _toggleActive(rec);
                                if (action == 'edit') _showForm(existing: rec);
                                if (action == 'delete') _delete(rec['id'] as String);
                              },
                              itemBuilder: (_) => [
                                PopupMenuItem(value: 'toggle', child: Text(isActive ? 'recurring_pause'.tr() : 'recurring_resume'.tr(), style: const TextStyle())),
                                PopupMenuItem(value: 'edit', child: Text('btn_edit'.tr(), style: const TextStyle())),
                                PopupMenuItem(value: 'delete', child: Text('btn_delete'.tr(), style: TextStyle(color: cs.error))),
                              ],
                            ),
                          ]),
                        ),
                      ),
                    );
                  },
                ),
    );
  }

  String _freqLabel(String freq) {
    switch (freq) {
      case 'daily':   return 'recurring_daily'.tr();
      case 'weekly':  return 'recurring_weekly'.tr();
      case 'monthly': return 'recurring_monthly'.tr();
      case 'yearly':  return 'recurring_yearly'.tr();
      default: return freq;
    }
  }
}

// ── نموذج الإضافة/التعديل ──
class _RecurringForm extends StatefulWidget {
  final Map<String, dynamic>? existing;
  final String baseCurrency;
  final VoidCallback onSaved;

  const _RecurringForm({ this.existing, required this.baseCurrency, required this.onSaved });

  @override
  State<_RecurringForm> createState() => _RecurringFormState();
}

class _RecurringFormState extends State<_RecurringForm> {
  final _nameCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  String _type = 'expense';
  String _frequency = 'monthly';
  String _category = 'طعام';
  String _currency = 'JOD';
  DateTime _nextDate = DateTime.now();
  bool _saving = false;

  static const _expenseCats = ['طعام','مواصلات','فواتير','صحة','تعليم','ترفيه','ملابس','إيجار','اشتراكات','عناية','سفر','دين','أخرى'];
  static const _incomeCats  = ['راتب','عمل حر','استثمار','مكافأة','أخرى'];
  static const _currencies  = ['JOD','USD','EUR','SAR','AED','GBP','EGP','TRY'];
  static const _frequencies = ['daily','weekly','monthly','yearly'];

  @override
  void initState() {
    super.initState();
    _currency = widget.baseCurrency;
    final e = widget.existing;
    if (e != null) {
      _nameCtrl.text = e['name'] as String? ?? '';
      _amountCtrl.text = (e['amount'] as num? ?? 0).toString();
      _notesCtrl.text = e['notes'] as String? ?? '';
      _type = e['type'] as String? ?? 'expense';
      _frequency = e['frequency'] as String? ?? 'monthly';
      _category = e['category'] as String? ?? 'طعام';
      _currency = e['currency'] as String? ?? widget.baseCurrency;
      final nd = e['next_date'] as String?;
      if (nd != null) _nextDate = DateTime.parse(nd);
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _amountCtrl.dispose(); _notesCtrl.dispose();
    super.dispose();
  }

  List<String> get _cats => _type == 'income' ? _incomeCats : _expenseCats;

  String _freqLabel(String freq) {
    switch (freq) {
      case 'daily':   return 'recurring_daily'.tr();
      case 'weekly':  return 'recurring_weekly'.tr();
      case 'monthly': return 'recurring_monthly'.tr();
      case 'yearly':  return 'recurring_yearly'.tr();
      default: return freq;
    }
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('debt_name_required'.tr(), style: const TextStyle()), backgroundColor: Colors.red.shade700));
      return;
    }
    final amount = double.tryParse(_amountCtrl.text.replaceAll(',', '.')) ?? 0;
    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('debt_amount_positive'.tr(), style: const TextStyle()), backgroundColor: Colors.red.shade700));
      return;
    }
    if (_saving) return;
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    _saving = true;
    setState(() {});

    final payload = {
      'user_id': user.id,
      'name': _nameCtrl.text.trim(),
      'amount': amount,
      'category': _category,
      'type': _type,
      'frequency': _frequency,
      'next_date': _nextDate.toIso8601String().split('T')[0],
      'currency': _currency,
      'notes': _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
      'is_active': true,
    };

    try {
      final existing = widget.existing;
      if (existing != null) {
        await Supabase.instance.client
            .from('recurring_transactions').update(payload).eq('id', existing['id']);
      } else {
        await Supabase.instance.client
            .from('recurring_transactions').insert(payload);
      }
      widget.onSaved();
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
    final cs = Theme.of(context).colorScheme;
    final isEdit = widget.existing != null;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Center(child: Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16), decoration: BoxDecoration(color: cs.outlineVariant, borderRadius: BorderRadius.circular(2)))),
          Text(isEdit ? 'recurring_edit'.tr() : 'recurring_add'.tr(), style: TextStyle(color: cs.onSurface, fontSize: 18, fontWeight: FontWeight.w900), textAlign: TextAlign.center),
          const SizedBox(height: 20),

          // النوع
          Row(children: ['expense', 'income'].map((tp) {
            final selected = _type == tp;
            final color = tp == 'income' ? cs.primary : cs.error;
            return Expanded(child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: GestureDetector(
                onTap: () => setState(() { _type = tp; _category = _cats.first; }),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: selected ? color.withValues(alpha: 0.12) : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: selected ? color : cs.outlineVariant),
                  ),
                  child: Text(tp == 'income' ? '\u2191 ${'trans_income'.tr()}' : '\u2193 ${'trans_expense'.tr()}',
                    style: TextStyle(color: selected ? color : cs.onSurfaceVariant, fontWeight: FontWeight.w700, fontSize: 13),
                    textAlign: TextAlign.center),
                ),
              ),
            ));
          }).toList()),
          const SizedBox(height: 14),

          _field(_nameCtrl, 'recurring_name_hint'.tr(), cs),
          const SizedBox(height: 10),

          Row(children: [
            Expanded(child: _field(_amountCtrl, 'trans_amount'.tr(), cs, keyboard: TextInputType.number)),
            const SizedBox(width: 10),
            Expanded(child: _dropdown(_currency, _currencies, (v) => setState(() => _currency = v!), cs, label: 'trans_currency'.tr())),
          ]),
          const SizedBox(height: 10),

          _dropdown(_category, _cats, (v) => setState(() => _category = v!), cs, label: 'trans_category'.tr()),
          const SizedBox(height: 10),

          Row(children: [
            Expanded(child: _dropdown(_frequency, _frequencies, (v) => setState(() => _frequency = v!), cs, label: 'recurring_freq'.tr(), labelBuilder: _freqLabel)),
            const SizedBox(width: 10),
            Expanded(child: GestureDetector(
              onTap: () async {
                final picked = await showDatePicker(context: context, initialDate: _nextDate, firstDate: DateTime.now(), lastDate: DateTime(2030));
                if (picked != null) setState(() => _nextDate = picked);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(10), border: Border.all(color: cs.outlineVariant)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('recurring_next'.tr(), style: TextStyle(color: cs.onSurfaceVariant, fontSize: 10)),
                  const SizedBox(height: 2),
                  Text(_nextDate.toIso8601String().split('T')[0], style: TextStyle(color: cs.onSurface, fontSize: 13, fontWeight: FontWeight.w700)),
                ]),
              ),
            )),
          ]),
          const SizedBox(height: 10),

          _field(_notesCtrl, 'add_debt_notes'.tr(), cs),
          const SizedBox(height: 20),

          ElevatedButton(
            onPressed: _saving ? null : _save,
            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: _saving
                ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                : Text(isEdit ? 'btn_save'.tr() : 'recurring_add'.tr(), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ]),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String hint, ColorScheme cs, { TextInputType keyboard = TextInputType.text }) {
    return TextField(
      controller: ctrl,
      keyboardType: keyboard,
      style: TextStyle(color: cs.onSurface, fontSize: 14),
      decoration: InputDecoration(
        hintText: hint, hintStyle: TextStyle(color: cs.onSurfaceVariant),
        filled: true, fillColor: cs.surfaceContainerHighest,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
    );
  }

  Widget _dropdown(String value, List<String> items, ValueChanged<String?> onChanged, ColorScheme cs, { required String label, String Function(String)? labelBuilder }) {
    return DropdownButtonFormField<String>(
      initialValue: items.contains(value) ? value : items.first,
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label, labelStyle: TextStyle(color: cs.onSurfaceVariant, fontSize: 11),
        filled: true, fillColor: cs.surfaceContainerHighest,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      ),
      dropdownColor: cs.surface,
      style: TextStyle(color: cs.onSurface, fontSize: 13),
      items: items.map((v) => DropdownMenuItem(value: v, child: Text(labelBuilder != null ? labelBuilder(v) : v))).toList(),
    );
  }
}
