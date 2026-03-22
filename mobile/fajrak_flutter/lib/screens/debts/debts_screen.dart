import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';

import '../../widgets/debts/debt_celebration_dialog.dart';
import '../../widgets/debts/debt_summary_section.dart';
import '../../widgets/debts/paid_debt_item.dart';
import '../../widgets/debts/debt_list_item.dart';
import '../../widgets/debts/add_debt_dialog.dart';

const _priorityColors = [
  Color(0xFFEF4444),
  Color(0xFFF59E0B),
  Color(0xFF3B7EF6),
  Color(0xFF8B9CC8),
  Color(0xFF4A5568),
];

class DebtsScreen extends StatefulWidget {
  const DebtsScreen({super.key});
  @override
  State<DebtsScreen> createState() => _DebtsScreenState();
}

class _DebtsScreenState extends State<DebtsScreen> {
  List<Map<String, dynamic>> _debts = [];
  List<Map<String, dynamic>> _paidDebts = [];
  bool _loading = true;
  bool _showPaid = false;
  String _currency = 'JOD';
  double _totalPaidAmount = 0;

  final List<String> _priorityLabels = [];

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Debts');
    _load();
  }

  Future<void> _load() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;
      
      final profile = await Supabase.instance.client
          .from('profiles')
          .select('currency')
          .eq('id', user.id)
          .maybeSingle();
      _currency = profile?['currency'] as String? ?? 'JOD';
      
      final active = await Supabase.instance.client
          .from('debts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_paid', false)
          .order('priority');
          
      final paid = await Supabase.instance.client
          .from('debts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_paid', true)
          .order('updated_at', ascending: false);
          
      final paidTotal = (paid as List)
          .fold(0.0, (a, d) => a + (d['original_amount'] as num).toDouble());
          
      if (mounted) {
        setState(() {
          _debts = List<Map<String, dynamic>>.from(active);
          _paidDebts = List<Map<String, dynamic>>.from(paid);
          _totalPaidAmount = paidTotal;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'Debts Load');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showCelebration(String name) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => DebtCelebrationDialog(name: name),
    );
  }

  Future<void> _deleteDebt(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF0F1629),
        title: Text('debts_delete_title'.tr(),
            style: const TextStyle(color: Colors.white, fontFamily: 'Cairo')),
        content: Text('confirm_delete'.tr(),
            style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child:
                  Text('cancel'.tr(), style: const TextStyle(fontFamily: 'Cairo'))),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text('delete'.tr(),
                  style: const TextStyle(
                      color: Color(0xFFEF4444), fontFamily: 'Cairo'))),
        ],
      ),
    );
    if (confirm == true) {
      await Supabase.instance.client.from('debts').delete().eq('id', id);
      await _load();
    }
  }

  void _showAddDialog({Map<String, dynamic>? existing, List<String>? labels}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => AddDebtDialog(
        existing: existing,
        onSaved: _load,
        priorityColors: _priorityColors,
        priorityLabels: labels ?? _priorityLabels,
        baseCurrency: _currency,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final bgColor = Theme.of(context).scaffoldBackgroundColor;

    final priorityLabels = [
      'priority_very_high'.tr(),
      'priority_high'.tr(),
      'priority_medium'.tr(),
      'priority_low'.tr(),
      'priority_deferred'.tr(),
    ];

    final totalRemaining = _debts.fold(
        0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());
    final totalOriginal = _debts.fold(
        0.0, (a, d) => a + (d['original_amount'] as num).toDouble());
    final totalMonthly = _debts.fold(
        0.0, (a, d) => a + (d['monthly_payment'] as num).toDouble());

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: Text('debts_title'.tr()),
        actions: [
          IconButton(
              icon: const Icon(Icons.add, color: Color(0xFF3B7EF6)),
              onPressed: () => _showAddDialog())
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
          : RefreshIndicator(
              onRefresh: _load,
              color: const Color(0xFF3B7EF6),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  DebtSummarySection(
                    totalRemaining: totalRemaining,
                    totalOriginal: totalOriginal,
                    totalMonthly: totalMonthly,
                    currency: _currency,
                    lifeTimePaid: _totalPaidAmount,
                    paidCount: _paidDebts.length,
                  ),
                  const SizedBox(height: 12),

                  if (_debts.isEmpty)
                    Container(
                        padding: const EdgeInsets.all(40),
                        child: Column(children: [
                          const Text('🎉', style: TextStyle(fontSize: 48)),
                          const SizedBox(height: 12),
                          Text('debts_no_active'.tr(),
                              style: const TextStyle(
                                  color: Color(0xFF94A3B8),
                                  fontFamily: 'Cairo',
                                  fontSize: 15)),
                        ]))
                  else
    ..._debts.map((d) => DebtListItem(
                          key: ValueKey(d['id']),
                          debt: d,
                          currency: _currency,
                          priorityColors: _priorityColors,
                          priorityLabels: priorityLabels,
                          onEdit: (debt) => _showAddDialog(existing: debt, labels: priorityLabels),
                          onDelete: _deleteDebt,
                          onPaymentComplete: _load,
                          onCelebration: _showCelebration,
                        )),
                  const SizedBox(height: 16),

                  if (_paidDebts.isNotEmpty) ...[
                    GestureDetector(
                      onTap: () => setState(() => _showPaid = !_showPaid),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                            color: cs.surface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: cs.outlineVariant)),
                        child: Row(children: [
                          Expanded(
                              child: Text('debts_show_paid'.tr(),
                                  style: TextStyle(
                                      color: cs.onSurface,
                                      fontFamily: 'Cairo',
                                      fontWeight: FontWeight.w700))),
                          Text('${_paidDebts.length}',
                              style: const TextStyle(
                                  color: Color(0xFF10B981),
                                  fontWeight: FontWeight.w900,
                                  fontFamily: 'Cairo')),
                          const SizedBox(width: 8),
                          Icon(
                              _showPaid
                                  ? Icons.keyboard_arrow_up
                                  : Icons.keyboard_arrow_down,
                              color: const Color(0xFF64748B)),
                        ]),
                      ),
                    ),
                    if (_showPaid) ...[
                      const SizedBox(height: 8),
                      ..._paidDebts.map((d) => PaidDebtItem(
                            key: ValueKey(d['id']),
                            debt: d,
                            currency: _currency,
                          )),
                    ],
                  ],
                ]),
              ),
            ),
    );
  }
}
