import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _priorityColors = [
  Color(0xFFEF4444),
  Color(0xFFF59E0B),
  Color(0xFF3B7EF6),
  Color(0xFF8B9CC8),
  Color(0xFF4A5568),
];
const _priorityLabels = ['عالية جداً', 'عالية', 'متوسطة', 'منخفضة', 'مؤجلة'];

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
  String? _paymentDebtId;
  final _paymentCtrl = TextEditingController();
  bool _payingSaving = false;
  double _totalPaidAmount = 0;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() { _paymentCtrl.dispose(); super.dispose(); }

  Future<void> _load() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;
      final profile = await Supabase.instance.client.from('profiles').select('currency').eq('id', user.id).single();
      _currency = profile['currency'] as String? ?? 'JOD';
      final active = await Supabase.instance.client.from('debts').select('*').eq('user_id', user.id).eq('is_paid', false).order('priority');
      final paid = await Supabase.instance.client.from('debts').select('*').eq('user_id', user.id).eq('is_paid', true).order('updated_at', ascending: false);
      final paidTotal = (paid as List).fold(0.0, (a, d) => a + (d['original_amount'] as num).toDouble());
      if (mounted) setState(() {
        _debts = List<Map<String, dynamic>>.from(active);
        _paidDebts = List<Map<String, dynamic>>.from(paid);
        _totalPaidAmount = paidTotal;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _makePayment(Map<String, dynamic> debt) async {
    final amount = double.tryParse(_paymentCtrl.text);
    if (amount == null || amount <= 0) return;
    setState(() => _payingSaving = true);
    final user = Supabase.instance.client.auth.currentUser!;
    final newRemaining = ((debt['remaining_amount'] as num).toDouble() - amount).clamp(0.0, double.infinity);
    await Supabase.instance.client.from('debts').update({
      'remaining_amount': newRemaining,
      'is_paid': newRemaining == 0,
    }).eq('id', debt['id']);
    _paymentCtrl.clear();
    setState(() { _payingSaving = false; _paymentDebtId = null; });
    if (newRemaining == 0 && mounted) {
      _showCelebration(debt['name'] as String);
    }
    await _load();
    if (user.id.isEmpty) return; // suppress unused warning
  }

  void _showCelebration(String name) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF0F1629),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('🎉', style: TextStyle(fontSize: 56)),
          const SizedBox(height: 12),
          const Text('أحرار من الدين!', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900, fontFamily: 'Cairo')),
          const SizedBox(height: 8),
          Text('"$name"', style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w700, fontFamily: 'Cairo')),
          const SizedBox(height: 12),
          const Text('تهانيّ! لقد سددت هذا الدين بالكامل 💪', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
          const SizedBox(height: 20),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            onPressed: () => Navigator.pop(context),
            child: const Text('شكراً 🙌', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
          ),
        ]),
      ),
    );
  }

  Future<void> _deleteDebt(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF0F1629),
        title: const Text('حذف الدين', style: TextStyle(color: Colors.white, fontFamily: 'Cairo')),
        content: const Text('هل أنت متأكد؟ لا يمكن التراجع.', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo'))),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('حذف', style: TextStyle(color: Color(0xFFEF4444), fontFamily: 'Cairo'))),
        ],
      ),
    );
    if (confirm == true) {
      await Supabase.instance.client.from('debts').delete().eq('id', id);
      await _load();
    }
  }

  Future<void> _showAddDialog({Map<String, dynamic>? existing}) async {
    final nameCtrl = TextEditingController(text: existing?['name'] ?? '');
    final originalCtrl = TextEditingController(text: existing?['original_amount']?.toString() ?? '');
    final remainingCtrl = TextEditingController(text: existing?['remaining_amount']?.toString() ?? '');
    final monthlyCtrl = TextEditingController(text: existing?['monthly_payment']?.toString() ?? '');
    final notesCtrl = TextEditingController(text: existing?['notes'] ?? '');
    int priority = (existing?['priority'] as int?) ?? 3;
    bool receivedAmount = false;
    bool autoDeduct = existing?['auto_deduct'] as bool? ?? true;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1629),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
          child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            Text(existing != null ? 'تعديل الدين' : 'دين جديد', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
            const SizedBox(height: 20),
            _field(nameCtrl, 'الاسم (مثال: بطاقة Visa)', TextInputType.text),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: _field(originalCtrl, 'المبلغ الأصلي', const TextInputType.numberWithOptions(decimal: true))),
              const SizedBox(width: 10),
              Expanded(child: _field(remainingCtrl, 'المتبقي', const TextInputType.numberWithOptions(decimal: true))),
            ]),
            const SizedBox(height: 10),
            _field(monthlyCtrl, 'القسط الشهري', const TextInputType.numberWithOptions(decimal: true)),
            const SizedBox(height: 10),
            _field(notesCtrl, 'ملاحظات (اختياري)', TextInputType.text),
            const SizedBox(height: 12),
            // Priority
            Align(alignment: Alignment.centerRight, child: const Text('الأولوية', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontFamily: 'Cairo'))),
            const SizedBox(height: 8),
            Row(children: List.generate(5, (i) => Expanded(
              child: GestureDetector(
                onTap: () => setS(() => priority = i + 1),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: priority == i + 1 ? _priorityColors[i].withOpacity(0.25) : const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: priority == i + 1 ? _priorityColors[i] : Colors.transparent),
                  ),
                  child: Center(child: Text(_priorityLabels[i], style: TextStyle(color: _priorityColors[i], fontSize: 9, fontFamily: 'Cairo', fontWeight: FontWeight.w700), textAlign: TextAlign.center)),
                ),
              ),
            ))),
            const SizedBox(height: 12),
            // Auto deduct toggle
            GestureDetector(
              onTap: () => setS(() => autoDeduct = !autoDeduct),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: autoDeduct ? const Color(0xFF10B981).withOpacity(0.1) : const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: autoDeduct ? const Color(0xFF10B981).withOpacity(0.4) : const Color(0xFF334155)),
                ),
                child: Row(children: [
                  Icon(autoDeduct ? Icons.toggle_on : Icons.toggle_off, color: autoDeduct ? const Color(0xFF10B981) : const Color(0xFF64748B), size: 24),
                  const SizedBox(width: 10),
                  Text('خصم تلقائي شهري', style: TextStyle(color: autoDeduct ? const Color(0xFF10B981) : const Color(0xFF94A3B8), fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                ]),
              ),
            ),
            // Received amount (only for new debts)
            if (existing == null) ...[
              const SizedBox(height: 10),
              GestureDetector(
                onTap: () => setS(() => receivedAmount = !receivedAmount),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: receivedAmount ? const Color(0xFF3B7EF6).withOpacity(0.1) : const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: receivedAmount ? const Color(0xFF3B7EF6).withOpacity(0.4) : const Color(0xFF334155)),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Icon(receivedAmount ? Icons.check_circle : Icons.circle_outlined, color: receivedAmount ? const Color(0xFF3B7EF6) : const Color(0xFF64748B), size: 20),
                      const SizedBox(width: 10),
                      Text('💳 استلمت هذا المبلغ اليوم', style: TextStyle(color: receivedAmount ? const Color(0xFF3B7EF6) : const Color(0xFF94A3B8), fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                    ]),
                    if (receivedAmount)
                      const Padding(
                        padding: EdgeInsets.only(top: 4, right: 30),
                        child: Text('سيُضاف تلقائياً كدخل في معاملاتك', style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontFamily: 'Cairo')),
                      ),
                  ]),
                ),
              ),
            ],
            const SizedBox(height: 20),
            SizedBox(width: double.infinity, child: ElevatedButton(
              onPressed: () async {
                if (nameCtrl.text.isEmpty || originalCtrl.text.isEmpty) return;
                final user = Supabase.instance.client.auth.currentUser!;
                final data = {
                  'user_id': user.id,
                  'name': nameCtrl.text,
                  'original_amount': double.tryParse(originalCtrl.text.replaceAll(',', '.')) ?? 0,
                  'remaining_amount': double.tryParse(remainingCtrl.text.replaceAll(',', '.')) ?? double.tryParse(originalCtrl.text.replaceAll(',', '.')) ?? 0,
                  'monthly_payment': double.tryParse(monthlyCtrl.text.replaceAll(',', '.')) ?? 0,
                  'notes': notesCtrl.text.isEmpty ? null : notesCtrl.text,
                  'priority': priority,
                  'is_paid': false,
                  'auto_deduct': autoDeduct,
                };
                if (existing != null) {
                  await Supabase.instance.client.from('debts').update(data).eq('id', existing['id']);
                } else {
                  await Supabase.instance.client.from('debts').insert(data);
                  if (receivedAmount) {
                    await Supabase.instance.client.from('transactions').insert({
                      'user_id': user.id, 'type': 'income',
                      'amount': double.tryParse(originalCtrl.text.replaceAll(',', '.')) ?? 0,
                      'category': 'قرض مستلم',
                      'description': 'قرض مستلم: ${nameCtrl.text}',
                      'transaction_date': DateTime.now().toIso8601String().split('T')[0],
                    });
                  }
                }
                if (ctx.mounted) Navigator.pop(ctx);
                await _load();
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3B7EF6), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: Text(existing != null ? 'حفظ التعديل' : 'إضافة', style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 15)),
            )),
            const SizedBox(height: 16),
          ])),
        ),
      ),
    );
  }

  TextField _field(TextEditingController ctrl, String hint, TextInputType type) => TextField(
    controller: ctrl, keyboardType: type, textAlign: TextAlign.right,
    style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
    decoration: InputDecoration(hintText: hint, hintStyle: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo'),
      filled: true, fillColor: const Color(0xFF1E293B),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
  );

  @override
  Widget build(BuildContext context) {
    final totalRemaining = _debts.fold(0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());
    final totalOriginal = _debts.fold(0.0, (a, d) => a + (d['original_amount'] as num).toDouble());
    final totalMonthly = _debts.fold(0.0, (a, d) => a + (d['monthly_payment'] as num).toDouble());
    final paidPct = totalOriginal > 0 ? ((totalOriginal - totalRemaining) / totalOriginal * 100) : 0.0;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF070B14),
        title: const Text('الديون', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [IconButton(icon: const Icon(Icons.add, color: Color(0xFF3B7EF6)), onPressed: () => _showAddDialog())],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
          : RefreshIndicator(
              onRefresh: _load, color: const Color(0xFF3B7EF6),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  // Summary stats
                  Row(children: [
                    Expanded(child: _statCard('إجمالي المتبقي', '${totalRemaining.toStringAsFixed(0)} $_currency', const Color(0xFFEF4444))),
                    const SizedBox(width: 8),
                    Expanded(child: _statCard('مسدد', '${paidPct.toStringAsFixed(0)}%', const Color(0xFF10B981))),
                    const SizedBox(width: 8),
                    Expanded(child: _statCard('أقساط شهرية', '${totalMonthly.toStringAsFixed(0)} $_currency', const Color(0xFFF59E0B))),
                  ]),
                  const SizedBox(height: 12),

                  // Paid total badge
                  if (_totalPaidAmount > 0) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.08), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2))),
                      child: Row(children: [
                        const Text('💪', style: TextStyle(fontSize: 28)),
                        const SizedBox(width: 12),
                        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('إجمالي ما سددته', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontFamily: 'Cairo')),
                          Text('${_totalPaidAmount.toStringAsFixed(0)} $_currency', style: const TextStyle(color: Color(0xFF6EE7B7), fontSize: 18, fontWeight: FontWeight.w900, fontFamily: 'Cairo')),
                        ]),
                        const Spacer(),
                        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                          const Text('ديون مسددة', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontFamily: 'Cairo')),
                          Text('${_paidDebts.length} 🎯', style: const TextStyle(color: Color(0xFF6EE7B7), fontSize: 16, fontWeight: FontWeight.w900, fontFamily: 'Cairo')),
                        ]),
                      ]),
                    ),
                  ],

                  // Overall progress
                  if (_debts.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF1E293B))),
                      child: Column(children: [
                        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                          const Text('التقدم الإجمالي', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                          Text('${paidPct.toStringAsFixed(1)}%', style: const TextStyle(color: Color(0xFF6EE7B7), fontSize: 12, fontWeight: FontWeight.w900, fontFamily: 'Cairo')),
                        ]),
                        const SizedBox(height: 8),
                        ClipRRect(borderRadius: BorderRadius.circular(5), child: LinearProgressIndicator(value: (paidPct / 100).clamp(0.0, 1.0), backgroundColor: const Color(0xFF1E293B), color: const Color(0xFF10B981), minHeight: 10)),
                        const SizedBox(height: 6),
                        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                          Text('مسدد: ${(totalOriginal - totalRemaining).toStringAsFixed(0)} $_currency', style: const TextStyle(color: Color(0xFF64748B), fontSize: 10, fontFamily: 'Cairo')),
                          Text('الأصل: ${totalOriginal.toStringAsFixed(0)} $_currency', style: const TextStyle(color: Color(0xFF64748B), fontSize: 10, fontFamily: 'Cairo')),
                        ]),
                      ]),
                    ),
                  ],

                  // Active debts list
                  if (_debts.isEmpty)
                    Container(padding: const EdgeInsets.all(40), child: const Column(children: [
                      Text('🎉', style: TextStyle(fontSize: 48)),
                      SizedBox(height: 12),
                      Text('لا ديون نشطة — أحسنت!', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 15)),
                    ]))
                  else
                    ..._debts.map((d) => _debtCard(d)),
                  const SizedBox(height: 16),

                  // Paid debts toggle
                  if (_paidDebts.isNotEmpty) ...[
                    GestureDetector(
                      onTap: () => setState(() => _showPaid = !_showPaid),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF1E293B))),
                        child: Row(children: [
                          const Expanded(child: Text('✅ الديون المسددة', style: TextStyle(color: Colors.white, fontFamily: 'Cairo', fontWeight: FontWeight.w700))),
                          Text('${_paidDebts.length}', style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w900, fontFamily: 'Cairo')),
                          const SizedBox(width: 8),
                          Icon(_showPaid ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, color: const Color(0xFF64748B)),
                        ]),
                      ),
                    ),
                    if (_showPaid) ...[
                      const SizedBox(height: 8),
                      ..._paidDebts.map((d) => Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.05), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF10B981).withOpacity(0.15))),
                        child: Row(children: [
                          const Text('✅', style: TextStyle(fontSize: 24)),
                          const SizedBox(width: 12),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(d['name'] ?? '', style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 13)),
                            if (d['updated_at'] != null) Text(d['updated_at'].toString().substring(0, 10), style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontFamily: 'Cairo')),
                          ])),
                          Text('${(d['original_amount'] as num).toStringAsFixed(0)} $_currency', style: const TextStyle(color: Color(0xFF6EE7B7), fontWeight: FontWeight.w900, fontFamily: 'Cairo')),
                        ]),
                      )),
                    ],
                  ],
                ]),
              ),
            ),
    );
  }

  Widget _statCard(String label, String value, Color color) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withOpacity(0.2))),
    child: Column(children: [
      FittedBox(child: Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 13, fontFamily: 'Cairo'))),
      const SizedBox(height: 2),
      Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo'), textAlign: TextAlign.center),
    ]),
  );

  Widget _debtCard(Map<String, dynamic> debt) {
    final original = (debt['original_amount'] as num).toDouble();
    final remaining = (debt['remaining_amount'] as num).toDouble();
    final pct = original > 0 ? ((original - remaining) / original * 100) : 0.0;
    final priorityIndex = ((debt['priority'] as int?) ?? 3) - 1;
    final prioColor = _priorityColors[priorityIndex.clamp(0, 4)];
    final isPayingThis = _paymentDebtId == debt['id'].toString();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1629),
        borderRadius: BorderRadius.circular(15),
        border: Border(
          left: BorderSide(color: prioColor, width: 3),
          top: BorderSide(color: const Color(0xFF1E293B)),
          right: BorderSide(color: const Color(0xFF1E293B)),
          bottom: BorderSide(color: const Color(0xFF1E293B)),
        ),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(width: 32, height: 32, decoration: BoxDecoration(color: prioColor.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
            child: Center(child: Container(width: 10, height: 10, decoration: BoxDecoration(shape: BoxShape.circle, color: prioColor, boxShadow: [BoxShadow(color: prioColor.withOpacity(0.5), blurRadius: 6)]))),
          ),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(debt['name'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 14)),
            if (debt['notes'] != null && (debt['notes'] as String).isNotEmpty)
              Text(debt['notes'], style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontFamily: 'Cairo'), overflow: TextOverflow.ellipsis),
          ])),
          Text('${remaining.toStringAsFixed(0)} $_currency', style: const TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 15)),
          const SizedBox(width: 8),
          GestureDetector(onTap: () => _showAddDialog(existing: debt), child: Container(width: 28, height: 28, decoration: BoxDecoration(color: const Color(0xFF3B7EF6).withOpacity(0.1), borderRadius: BorderRadius.circular(7), border: Border.all(color: const Color(0xFF3B7EF6).withOpacity(0.2))), child: const Icon(Icons.edit, color: Color(0xFF3B7EF6), size: 14))),
          const SizedBox(width: 6),
          GestureDetector(onTap: () => _deleteDebt(debt['id'].toString()), child: Container(width: 28, height: 28, decoration: BoxDecoration(color: const Color(0xFFEF4444).withOpacity(0.1), borderRadius: BorderRadius.circular(7), border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2))), child: const Icon(Icons.close, color: Color(0xFFEF4444), size: 14))),
        ]),
        const SizedBox(height: 10),
        ClipRRect(borderRadius: BorderRadius.circular(5), child: LinearProgressIndicator(value: (pct / 100).clamp(0.0, 1.0), backgroundColor: const Color(0xFF1E293B), color: const Color(0xFF10B981), minHeight: 8)),
        const SizedBox(height: 8),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('${pct.toStringAsFixed(0)}% مسدد', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontFamily: 'Cairo')),
          if ((debt['monthly_payment'] as num).toDouble() > 0)
            Text('${(debt['monthly_payment'] as num).toStringAsFixed(0)}/شهر', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontFamily: 'Cairo')),
        ]),
        const SizedBox(height: 8),
        // Payment row
        if (isPayingThis)
          Row(children: [
            Expanded(child: TextField(
              controller: _paymentCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'Cairo'),
              textAlign: TextAlign.center,
              decoration: InputDecoration(hintText: 'المبلغ', hintStyle: const TextStyle(color: Color(0xFF64748B)), filled: true, fillColor: const Color(0xFF1E293B), border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none), contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
              autofocus: true,
            )),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _payingSaving ? null : () => _makePayment(debt),
              child: Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8), decoration: BoxDecoration(color: const Color(0xFF10B981), borderRadius: BorderRadius.circular(8)), child: Text(_payingSaving ? '⏳' : '✓ دفع', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'Cairo'))),
            ),
            const SizedBox(width: 6),
            GestureDetector(
              onTap: () { setState(() { _paymentDebtId = null; _paymentCtrl.clear(); }); },
              child: Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8), decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(8)), child: const Text('✕', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12))),
            ),
          ])
        else
          Align(
            alignment: Alignment.centerLeft,
            child: GestureDetector(
              onTap: () { setState(() { _paymentDebtId = debt['id'].toString(); _paymentCtrl.clear(); }); },
              child: Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7), decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2))), child: const Text('+ دفعة', style: TextStyle(color: Color(0xFF6EE7B7), fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'Cairo'))),
            ),
          ),
      ]),
    );
  }
}
