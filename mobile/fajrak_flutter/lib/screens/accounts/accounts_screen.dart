import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/accounts_service.dart';
import '../../widgets/common/skeleton_loader.dart';

const _accountTypes = [
  {'type': 'bank',        'icon': '🏦', 'labelKey': 'acc_type_bank',   'color': AppColors.primary},
  {'type': 'cash',        'icon': '💵', 'labelKey': 'acc_type_cash',   'color': AppColors.success},
  {'type': 'savings',     'icon': '🏛️', 'labelKey': 'acc_type_savings','color': AppColors.purple},
  {'type': 'credit_card', 'icon': '💳', 'labelKey': 'acc_type_credit', 'color': AppColors.error},
];

const _presetColors = [
  AppColors.primary, AppColors.success, AppColors.purple,
  AppColors.warning, AppColors.error, AppColors.cyan,
];

Map<String, dynamic> _typeInfo(String type) =>
    _accountTypes.firstWhere((t) => t['type'] == type, orElse: () => _accountTypes[0]);

class AccountsScreen extends StatefulWidget {
  const AccountsScreen({super.key});
  @override
  State<AccountsScreen> createState() => _AccountsScreenState();
}

class _AccountsScreenState extends State<AccountsScreen> {
  List<Map<String, dynamic>> _accounts = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final data = await AccountsService.fetchAccounts();
    if (mounted) setState(() { _accounts = data; _loading = false; });
  }

  double get _totalBalance => _accounts.fold(0.0, (a, acc) => a + (acc['balance'] as double? ?? 0));
  String get _currency => (_accounts.isNotEmpty ? _accounts.first['currency'] as String? : null) ?? 'JOD';

  String _fmt(double n) => n.abs() % 1 == 0 ? n.abs().toStringAsFixed(0) : n.abs().toStringAsFixed(2);

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('accounts_title'.tr(), style: const TextStyle(fontWeight: FontWeight.w900)),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        actions: [
          if (_accounts.length >= 2)
            TextButton.icon(
              onPressed: () => _showTransferDialog(),
              icon: const Icon(Icons.swap_horiz, size: 18),
              label: Text('accounts_transfer'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'accounts_add'.tr(),
            onPressed: () => _showAccountDialog(),
          ),
        ],
      ),
      body: _loading
          ? const Padding(
              padding: EdgeInsets.all(16),
              child: ListSkeleton(count: 3),
            )
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: _totalBalance >= 0 ? AppColors.success.withValues(alpha: 0.08) : AppColors.error.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: _totalBalance >= 0 ? AppColors.success.withValues(alpha: 0.25) : AppColors.error.withValues(alpha: 0.25)),
                    ),
                    child: Column(children: [
                      Text('accounts_total_balance'.tr(), style: TextStyle(color: cs.onSurfaceVariant, fontSize: 12, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      Text(
                        '${_totalBalance >= 0 ? '+' : '-'}${_fmt(_totalBalance)} $_currency',
                        style: TextStyle(
                          color: _totalBalance >= 0 ? AppColors.success : AppColors.error, fontSize: 32, fontWeight: FontWeight.w900,
                        ),
                      ),
                    ]),
                  ),
                  const SizedBox(height: 16),
                  ..._accounts.map((acc) => _AccountCard(
                    acc: acc, currency: _currency,
                    onEdit: () => _showAccountDialog(account: acc),
                    onDelete: acc['is_default'] == true ? null : () async {
                      final ok = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
                        title: Text('accounts_archive_title'.tr(), style: const TextStyle()),
                        content: Text('accounts_archive_confirm'.tr(), style: const TextStyle()),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(context, false), child: Text('accounts_archive_cancel'.tr(), style: const TextStyle())),
                          TextButton(onPressed: () => Navigator.pop(context, true), child: Text('accounts_archive'.tr(), style: const TextStyle(color: Colors.red))),
                        ],
                      ));
                      if (ok == true) { await AccountsService.archiveAccount(acc['id'] as String); _load(); }
                    },
                  )),
                ],
              ),
            ),
    );
  }

  void _showAccountDialog({Map<String, dynamic>? account}) {
    showModalBottomSheet(
      context: context, isScrollControlled: true, useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _AccountFormSheet(account: account, onSaved: _load),
    );
  }

  void _showTransferDialog() {
    showModalBottomSheet(
      context: context, isScrollControlled: true, useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _TransferSheet(accounts: _accounts, onSaved: _load),
    );
  }
}

// ── بطاقة حساب ──────────────────────────────────────
class _AccountCard extends StatelessWidget {
  final Map<String, dynamic> acc;
  final String currency;
  final VoidCallback onEdit;
  final VoidCallback? onDelete;
  const _AccountCard({required this.acc, required this.currency, required this.onEdit, this.onDelete});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final info = _typeInfo(acc['type'] as String? ?? 'bank');
    final bal = acc['balance'] as double? ?? 0;
    final color = Color(int.parse((acc['color'] as String? ?? '#3B7EF6').replaceFirst('#', '0xFF')));
    String fmt(double n) => n.abs() % 1 == 0 ? n.abs().toStringAsFixed(0) : n.abs().toStringAsFixed(2);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(children: [
        Container(
          width: 46, height: 46, decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(13),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Center(child: Text(acc['icon'] as String? ?? '🏦', style: const TextStyle(fontSize: 22))),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(acc['name'] as String? ?? '', style: TextStyle(color: cs.onSurface, fontWeight: FontWeight.w800, fontSize: 14)),
            if (acc['is_default'] == true) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(100), border: Border.all(color: color.withValues(alpha: 0.3))),
                child: Text('accounts_default'.tr(), style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
              ),
            ]
          ]),
          Text((info['labelKey'] as String).tr(), style: TextStyle(color: cs.onSurfaceVariant, fontSize: 11)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(
            '${bal >= 0 ? '+' : '-'}${fmt(bal)}',
            style: TextStyle(color: bal >= 0 ? AppColors.success : AppColors.error, fontWeight: FontWeight.w900, fontSize: 18),
          ),
          Text(currency, style: TextStyle(color: cs.onSurfaceVariant, fontSize: 11)),
        ]),
        const SizedBox(width: 8),
        Column(children: [
          GestureDetector(onTap: onEdit, child: Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(8)),
            child: Icon(Icons.edit_outlined, size: 16, color: cs.onSurfaceVariant),
          )),
          if (onDelete != null) ...[
            const SizedBox(height: 4),
            GestureDetector(onTap: onDelete, child: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: AppColors.error.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.archive_outlined, size: 16, color: AppColors.error),
            )),
          ],
        ]),
      ]),
    );
  }
}

// ── Form إنشاء/تعديل حساب ───────────────────────────
class _AccountFormSheet extends StatefulWidget {
  final Map<String, dynamic>? account;
  final VoidCallback onSaved;
  const _AccountFormSheet({this.account, required this.onSaved});
  @override State<_AccountFormSheet> createState() => _AccountFormSheetState();
}

class _AccountFormSheetState extends State<_AccountFormSheet> {
  late TextEditingController _nameCtrl;
  late TextEditingController _balanceCtrl;
  String _type = 'bank';
  Color _color = AppColors.primary;
  String _icon = '🏦';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final a = widget.account;
    _nameCtrl    = TextEditingController(text: a?['name']?.toString() ?? '');
    _balanceCtrl = TextEditingController(text: a?['opening_balance']?.toString() ?? '0');
    _type  = a?['type']  as String? ?? 'bank';
    _icon  = a?['icon']  as String? ?? '🏦';
    _color = a != null ? Color(int.parse((a['color'] as String).replaceFirst('#', '0xFF'))) : AppColors.primary;
  }

  @override
  void dispose() { _nameCtrl.dispose(); _balanceCtrl.dispose(); super.dispose(); }

  Future<void> _save() async {
    if (_saving) return;
    if (_nameCtrl.text.trim().isEmpty) return;
    _saving = true;
    setState(() {});
    try {
      final colorHex = '#${_color.toARGB32().toRadixString(16).substring(2).toUpperCase()}';
      if (widget.account == null) {
        await AccountsService.createAccount(
          name: _nameCtrl.text.trim(), type: _type,
          openingBalance: double.tryParse(_balanceCtrl.text) ?? 0,
          currency: 'JOD', color: colorHex, icon: _icon,
        );
      } else {
        await AccountsService.updateAccount(widget.account!['id'] as String, {
          'name': _nameCtrl.text.trim(), 'type': _type,
          'opening_balance': double.tryParse(_balanceCtrl.text) ?? 0,
          'color': colorHex, 'icon': _icon,
        });
      }
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('${'accounts_error_save'.tr()}: ${e.toString()}',
              style: const TextStyle(fontSize: 13)),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 20, right: 20, top: 20),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(widget.account == null ? 'accounts_new'.tr() : 'accounts_edit'.tr(),
          style: TextStyle(color: cs.onSurface, fontWeight: FontWeight.w900, fontSize: 17)),
        const SizedBox(height: 16),
        Text('accounts_type'.tr(), style: TextStyle(color: cs.onSurfaceVariant, fontSize: 12, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        GridView.count(crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), childAspectRatio: 3.5, crossAxisSpacing: 8, mainAxisSpacing: 8, children: _accountTypes.map((t) {
          final selected = _type == t['type'];
          final tColor = t['color'] as Color;
          return GestureDetector(
            onTap: () => setState(() { _type = t['type'] as String; _color = tColor; _icon = t['icon'] as String; }),
            child: Container(
              decoration: BoxDecoration(
                color: selected ? tColor.withValues(alpha: 0.12) : cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: selected ? tColor : Colors.transparent),
              ),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(t['icon'] as String, style: const TextStyle(fontSize: 16)),
                const SizedBox(width: 6),
                Text((t['labelKey'] as String).tr(), style: TextStyle(color: selected ? tColor : cs.onSurfaceVariant, fontWeight: FontWeight.w700, fontSize: 13)),
              ]),
            ),
          );
        }).toList()),
        const SizedBox(height: 12),
        TextField(
          controller: _nameCtrl,
          textAlign: TextAlign.right,
          autofocus: true,
          style: TextStyle(color: cs.onSurface),
          decoration: InputDecoration(
            labelText: 'accounts_name_hint'.tr(),
            labelStyle: TextStyle(color: cs.onSurfaceVariant),
            filled: true, fillColor: cs.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: cs.outlineVariant)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _balanceCtrl,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: TextStyle(color: cs.onSurface),
          decoration: InputDecoration(
            labelText: 'accounts_opening_balance'.tr(),
            labelStyle: TextStyle(color: cs.onSurfaceVariant),
            filled: true, fillColor: cs.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: cs.outlineVariant)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
        const SizedBox(height: 10),
        Wrap(spacing: 8, children: _presetColors.map((c) => GestureDetector(
          onTap: () => setState(() => _color = c),
          child: Container(width: 28, height: 28, decoration: BoxDecoration(color: c, shape: BoxShape.circle, border: Border.all(color: _color == c ? cs.onSurface : Colors.transparent, width: 2))),
        )).toList()),
        const SizedBox(height: 20),
        SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: _saving ? null : _save,
          style: ElevatedButton.styleFrom(backgroundColor: _color, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
          child: _saving
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text('accounts_save'.tr(), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
        )),
        const SizedBox(height: 12),
      ]),
    );
  }
}

// ── Transfer Sheet ────────────────────────────────────
class _TransferSheet extends StatefulWidget {
  final List<Map<String, dynamic>> accounts;
  final VoidCallback onSaved;
  const _TransferSheet({required this.accounts, required this.onSaved});
  @override State<_TransferSheet> createState() => _TransferSheetState();
}

class _TransferSheetState extends State<_TransferSheet> {
  late String _fromId;
  late String _toId;
  final _amountCtrl = TextEditingController();
  final _noteCtrl   = TextEditingController();
  final _date = DateTime.now().toIso8601String().split('T')[0];
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _fromId = widget.accounts.firstWhere((a) => a['is_default'] == true, orElse: () => widget.accounts[0])['id'] as String;
    _toId   = widget.accounts.firstWhere((a) => a['id'] != _fromId, orElse: () => widget.accounts[1])['id'] as String;
  }

  @override
  void dispose() { _amountCtrl.dispose(); _noteCtrl.dispose(); super.dispose(); }

  Future<void> _save() async {
    if (_saving) return;
    final amount = double.tryParse(_amountCtrl.text);
    if (amount == null || amount <= 0 || _fromId == _toId) return;
    _saving = true;
    setState(() {});
    try {
      await AccountsService.transfer(
        fromAccountId: _fromId, toAccountId: _toId,
        amount: amount, date: _date, note: _noteCtrl.text.isEmpty ? null : _noteCtrl.text,
      );
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('${'accounts_error_transfer'.tr()}: ${e.toString()}',
              style: const TextStyle(fontSize: 13)),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final avail = widget.accounts.where((a) => a['id'] != _fromId).toList();

    InputDecoration inputDec(String label) => InputDecoration(
      labelText: label, labelStyle: TextStyle(color: cs.onSurfaceVariant),
      filled: true, fillColor: cs.surface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: cs.outlineVariant)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    );

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 20, right: 20, top: 20),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('accounts_transfer_title'.tr(), style: TextStyle(color: cs.onSurface, fontWeight: FontWeight.w900, fontSize: 17)),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          initialValue: _fromId, decoration: inputDec('accounts_transfer_from'.tr()),
          items: widget.accounts.map((a) => DropdownMenuItem(value: a['id'] as String, child: Text('${a['icon']} ${a['name']}', style: const TextStyle()))).toList(),
          onChanged: (v) => setState(() { _fromId = v!; if (_toId == _fromId) _toId = widget.accounts.firstWhere((a) => a['id'] != _fromId)['id'] as String; }),
        ),
        const SizedBox(height: 10),
        DropdownButtonFormField<String>(
          initialValue: avail.any((a) => a['id'] == _toId) ? _toId : avail.first['id'] as String,
          decoration: inputDec('accounts_transfer_to'.tr()),
          items: avail.map((a) => DropdownMenuItem(value: a['id'] as String, child: Text('${a['icon']} ${a['name']}', style: const TextStyle()))).toList(),
          onChanged: (v) => setState(() => _toId = v!),
        ),
        const SizedBox(height: 10),
        TextField(controller: _amountCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), style: TextStyle(color: cs.onSurface), decoration: inputDec('accounts_transfer_amount'.tr())),
        const SizedBox(height: 10),
        TextField(controller: _noteCtrl, style: TextStyle(color: cs.onSurface), decoration: inputDec('accounts_transfer_note'.tr())),
        const SizedBox(height: 20),
        SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: _saving ? null : _save,
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
          child: _saving
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text('accounts_transfer'.tr(), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
        )),
        const SizedBox(height: 12),
      ]),
    );
  }
}
