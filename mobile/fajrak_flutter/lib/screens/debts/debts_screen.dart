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
import '../../widgets/common/skeleton_loader.dart';

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
  List<Map<String, dynamic>> _receivableDebts = [];
  List<Map<String, dynamic>> _paidDebts = [];
  List<Map<String, dynamic>> _debtAlerts = [];
  bool _loading = true;
  bool _showPaid = false;
  bool _showOwed = true;
  bool _showReceivable = true;
  String _currency = 'JOD';
  double _totalPaidAmount = 0;


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
      final sb = Supabase.instance.client;

      // ── 4 queries بالتوازي بدل التسلسل (~800ms → ~250ms) ──
      final results = await Future.wait([
        sb.from('profiles').select('currency').eq('id', user.id).maybeSingle(),
        sb.from('debts').select('*').eq('user_id', user.id).eq('is_paid', false).order('priority'),
        sb.from('debts').select('*').eq('user_id', user.id).eq('is_paid', true).order('updated_at', ascending: false),
        sb.from('alerts').select('*').eq('user_id', user.id).eq('is_read', false).eq('is_active', true)
            .or('title.ilike.%قسط%,title.ilike.%دين%,title.ilike.%سداد%')
            .order('created_at', ascending: false).limit(5),
      ]);

      final profile  = results[0] as Map<String, dynamic>?;
      final active   = results[1] as List;
      final paid     = results[2] as List;
      final alerts   = results[3] as List;

      final currency   = profile?['currency'] as String? ?? 'JOD';
      final paidTotal  = paid.fold(0.0, (a, d) => a + (d['original_amount'] as num).toDouble());
      final allActive  = List<Map<String, dynamic>>.from(active);

      if (mounted) {
        setState(() {
          _currency        = currency;
          _debts           = allActive.where((d) => (d['debt_type'] ?? 'owed') == 'owed').toList();
          _receivableDebts = allActive.where((d) => d['debt_type'] == 'receivable').toList();
          _paidDebts       = List<Map<String, dynamic>>.from(paid);
          _totalPaidAmount = paidTotal;
          _debtAlerts      = List<Map<String, dynamic>>.from(alerts);
          _loading         = false;
        });
      }
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'Debts Load');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // تحديث محلي فوري بعد الدفع — بدل إعادة تحميل كل شيء
  void _onDebtPaymentDone(String debtId, double newRemaining, bool isPaid) {
    setState(() {
      if (isPaid) {
        final debt = _debts.firstWhere((d) => d['id'] == debtId, orElse: () => {});
        if (debt.isNotEmpty) {
          _debts.removeWhere((d) => d['id'] == debtId);
          _paidDebts.insert(0, {...debt, 'is_paid': true, 'remaining_amount': 0});
          _totalPaidAmount += (debt['original_amount'] as num).toDouble();
        }
      } else {
        final idx = _debts.indexWhere((d) => d['id'] == debtId);
        if (idx != -1) _debts[idx] = {..._debts[idx], 'remaining_amount': newRemaining};
      }
    });
    // refresh خفيف في الخلفية لمزامنة البيانات
    Future.delayed(const Duration(seconds: 2), _load);
  }

  Future<void> _dismissAlert(String id) async {
    await Supabase.instance.client
        .from('alerts')
        .update({'is_read': true})
        .eq('id', id);
    if (mounted) setState(() => _debtAlerts.removeWhere((a) => a['id'] == id));
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

  Future<void> _receiveDebt(Map<String, dynamic> debt) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF0F1629),
        title: Text('debts_receive_btn'.tr(),
            style: const TextStyle(color: Colors.white, fontFamily: 'Cairo')),
        content: Text(
            '${'debts_tab_receivable'.tr()}: ${debt['name']}\n${(debt['remaining_amount'] as num).toStringAsFixed(0)} $_currency',
            style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('cancel'.tr(), style: const TextStyle(fontFamily: 'Cairo'))),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text('debts_receive_btn'.tr(),
                  style: const TextStyle(color: Color(0xFF10B981), fontFamily: 'Cairo'))),
        ],
      ),
    );
    if (confirm != true) return;

    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    await Supabase.instance.client.from('debts').update({'is_paid': true}).eq('id', debt['id']);
    await Supabase.instance.client.from('transactions').insert({
      'user_id': user.id,
      'type': 'income',
      'amount': debt['remaining_amount'],
      'category': 'دين مستلم',
      'description': 'استلام دين: ${debt['name']}',
      'transaction_date': DateTime.now().toIso8601String().split('T')[0],
    });

    if (mounted) {
      _showCelebration(debt['name']);
      await _load();
    }
  }

  void _showAddDialog({Map<String, dynamic>? existing, List<String>? labels}) {
    final defaultLabels = [
      'priority_very_high'.tr(),
      'priority_high'.tr(),
      'priority_medium'.tr(),
      'priority_low'.tr(),
      'priority_deferred'.tr(),
    ];
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => AddDebtDialog(
        existing: existing,
        onSaved: _load,
        priorityColors: _priorityColors,
        priorityLabels: labels ?? defaultLabels,
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
    final totalReceivable = _receivableDebts.fold(
        0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: Text('debts_title'.tr()),
        actions: [
          IconButton(
              icon: const Icon(Icons.add, color: Color(0xFF3B7EF6)),
              onPressed: () => _showAddDialog(labels: priorityLabels))
        ],
      ),
      body: _loading
          ? const PageSkeleton()
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

                  // ── تنبيهات الديون ──
                  if (_debtAlerts.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    ..._debtAlerts.map((alert) {
                      final type = alert['type'] as String? ?? 'info';
                      final isAchievement = type == 'achievement';
                      final isWarning = type == 'warning';
                      final color = isAchievement
                          ? const Color(0xFF10B981)
                          : isWarning
                              ? const Color(0xFFF59E0B)
                              : const Color(0xFF3B7EF6);
                      return Dismissible(
                        key: ValueKey(alert['id']),
                        direction: DismissDirection.endToStart,
                        onDismissed: (_) => _dismissAlert(alert['id'] as String),
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 20),
                        ),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.07),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: color.withValues(alpha: 0.25)),
                          ),
                          child: Row(children: [
                            Text(isAchievement ? '🎉' : isWarning ? '💳' : 'ℹ️',
                                style: const TextStyle(fontSize: 18)),
                            const SizedBox(width: 10),
                            Expanded(child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(alert['title'] ?? '',
                                    style: TextStyle(
                                        color: color,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        fontFamily: 'Cairo')),
                                if ((alert['message'] ?? '').toString().isNotEmpty)
                                  Text(alert['message'],
                                      style: const TextStyle(
                                          color: Color(0xFF94A3B8),
                                          fontSize: 11,
                                          fontFamily: 'Cairo'),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis),
                              ],
                            )),
                            GestureDetector(
                              onTap: () => _dismissAlert(alert['id'] as String),
                              child: Icon(Icons.close, size: 16, color: color.withValues(alpha: 0.6)),
                            ),
                          ]),
                        ),
                      );
                    }),
                  ],
                  const SizedBox(height: 12),

                  // ── ديون عليّ ──
                  if (_debts.isNotEmpty) ...[
                    GestureDetector(
                      onTap: () => setState(() => _showOwed = !_showOwed),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0x1AEF4444),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0x33EF4444)),
                        ),
                        child: Row(children: [
                          const Icon(Icons.credit_card, size: 16, color: Color(0xFFEF4444)),
                          const SizedBox(width: 6),
                          Expanded(child: Text('debts_tab_owed'.tr(),
                            style: const TextStyle(color: Color(0xFFEF4444), fontFamily: 'Cairo', fontWeight: FontWeight.w700))),
                          if (!_showOwed)
                            Text('${totalRemaining.toStringAsFixed(0)} $_currency',
                              style: const TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 13)),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0x26EF4444), borderRadius: BorderRadius.circular(6)),
                            child: Text('${_debts.length}', style: const TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 12)),
                          ),
                          const SizedBox(width: 6),
                          Icon(_showOwed ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, color: const Color(0xFFEF4444)),
                        ]),
                      ),
                    ),
                    if (_showOwed) ...[
                      const SizedBox(height: 8),
                      ..._debts.map((d) => DebtListItem(
                        key: ValueKey(d['id']),
                        debt: d,
                        currency: _currency,
                        priorityColors: _priorityColors,
                        priorityLabels: priorityLabels,
                        onEdit: (debt) => _showAddDialog(existing: debt, labels: priorityLabels),
                        onDelete: _deleteDebt,
                        onPaymentDone: _onDebtPaymentDone,
                        onCelebration: _showCelebration,
                      )),
                    ],
                    const SizedBox(height: 12),
                  ],

                  // ── ديون لي ──
                  if (_receivableDebts.isNotEmpty) ...[
                    GestureDetector(
                      onTap: () => setState(() => _showReceivable = !_showReceivable),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0x1A10B981),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0x3310B981)),
                        ),
                        child: Row(children: [
                          const Icon(Icons.account_balance_wallet, size: 16, color: Color(0xFF10B981)),
                          const SizedBox(width: 6),
                          Expanded(child: Text('debts_tab_receivable'.tr(),
                            style: const TextStyle(color: Color(0xFF10B981), fontFamily: 'Cairo', fontWeight: FontWeight.w700))),
                          if (!_showReceivable)
                            Text('${totalReceivable.toStringAsFixed(0)} $_currency',
                              style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 13)),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0x2610B981), borderRadius: BorderRadius.circular(6)),
                            child: Text('${_receivableDebts.length}', style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 12)),
                          ),
                          const SizedBox(width: 6),
                          Icon(_showReceivable ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, color: const Color(0xFF10B981)),
                        ]),
                      ),
                    ),
                    if (_showReceivable) ...[
                      const SizedBox(height: 8),
                      ..._receivableDebts.map((d) => _ReceivableDebtCard(
                        key: ValueKey(d['id']),
                        debt: d,
                        currency: _currency,
                        onEdit: () => _showAddDialog(existing: d, labels: priorityLabels),
                        onDelete: () => _deleteDebt(d['id']),
                        onReceive: () => _receiveDebt(d),
                      )),
                    ],
                    const SizedBox(height: 12),
                  ],

                  if (_debts.isEmpty && _receivableDebts.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(40),
                      child: Column(children: [
                        Icon(Icons.celebration, size: 48, color: const Color(0xFF10B981)),
                        const SizedBox(height: 12),
                        Text('debts_no_active'.tr(),
                          style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 15)),
                      ])),
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

class _ReceivableDebtCard extends StatelessWidget {
  final Map<String, dynamic> debt;
  final String currency;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onReceive;

  const _ReceivableDebtCard({
    super.key,
    required this.debt,
    required this.currency,
    required this.onEdit,
    required this.onDelete,
    required this.onReceive,
  });

  @override
  Widget build(BuildContext context) {
    final amount = (debt['remaining_amount'] as num).toStringAsFixed(0);
    final dueDate = debt['due_date'] as String?;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0x0A10B981),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x2610B981)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.circle, color: Color(0xFF10B981), size: 10),
          const SizedBox(width: 10),
          Expanded(child: Text(debt['name'] ?? '',
            style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 15))),
          Text('$amount $currency',
            style: const TextStyle(color: Color(0xFF10B981), fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 16)),
        ]),
        if (debt['notes'] != null && (debt['notes'] as String).isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(debt['notes'], style: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo', fontSize: 12)),
        ],
        if (dueDate != null) ...[
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.calendar_today, size: 12, color: Color(0xFF10B981)),
              const SizedBox(width: 4),
              Text("${'debts_due_date'.tr()}: $dueDate",
                style: const TextStyle(color: Color(0xFF10B981), fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w600)),
            ],
          ),
        ],
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: GestureDetector(
              onTap: onReceive,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0x2610B981),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0x4D10B981)),
                ),
                child: Center(child: Text('debts_receive_btn'.tr(),
                  style: const TextStyle(color: Color(0xFF10B981), fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 13))),
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: onEdit,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.edit_outlined, color: Color(0xFF64748B), size: 18),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: onDelete,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: const Color(0x1AEF4444), borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 18),
            ),
          ),
        ]),
      ]),
    );
  }
}

