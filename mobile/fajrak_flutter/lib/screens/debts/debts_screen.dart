import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DebtsScreen extends StatefulWidget {
  const DebtsScreen({super.key});

  @override
  State<DebtsScreen> createState() => _DebtsScreenState();
}

class _DebtsScreenState extends State<DebtsScreen> {
  List<Map<String, dynamic>> _debts = [];
  bool _loading = true;
  String _currency = 'JOD';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final profile = await Supabase.instance.client.from('profiles').select('currency').eq('id', user.id).single();
    _currency = profile['currency'] as String? ?? 'JOD';
    final data = await Supabase.instance.client.from('debts').select('*').eq('user_id', user.id).eq('is_paid', false).order('created_at');
    setState(() { _debts = List<Map<String, dynamic>>.from(data); _loading = false; });
  }

  Future<void> _showAddDialog({Map<String, dynamic>? existing}) async {
    final nameCtrl = TextEditingController(text: existing?['name'] ?? '');
    final totalCtrl = TextEditingController(text: existing?['total_amount']?.toString() ?? '');
    final remainingCtrl = TextEditingController(text: existing?['remaining_amount']?.toString() ?? '');
    final monthlyCtrl = TextEditingController(text: existing?['monthly_payment']?.toString() ?? '');
    final dayCtrl = TextEditingController(text: existing?['payment_day']?.toString() ?? '1');

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1629),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 16),
              Text(existing != null ? 'تعديل الدين' : 'إضافة دين', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
              const SizedBox(height: 20),
              TextFormField(controller: nameCtrl, style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'), decoration: const InputDecoration(labelText: 'اسم الدين')),
              const SizedBox(height: 12),
              TextFormField(controller: totalCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'), decoration: const InputDecoration(labelText: 'المبلغ الإجمالي')),
              const SizedBox(height: 12),
              TextFormField(controller: remainingCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'), decoration: const InputDecoration(labelText: 'المبلغ المتبقي')),
              const SizedBox(height: 12),
              TextFormField(controller: monthlyCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'), decoration: const InputDecoration(labelText: 'القسط الشهري')),
              const SizedBox(height: 12),
              TextFormField(controller: dayCtrl, keyboardType: TextInputType.number, style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'), decoration: const InputDecoration(labelText: 'يوم الدفع (1-28)')),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () async {
                  final user = Supabase.instance.client.auth.currentUser!;
                  final data = {
                    'user_id': user.id,
                    'name': nameCtrl.text,
                    'total_amount': double.tryParse(totalCtrl.text) ?? 0,
                    'remaining_amount': double.tryParse(remainingCtrl.text) ?? 0,
                    'monthly_payment': double.tryParse(monthlyCtrl.text) ?? 0,
                    'payment_day': int.tryParse(dayCtrl.text) ?? 1,
                    'is_paid': false,
                    'auto_deduct': true,
                  };
                  if (existing != null) {
                    await Supabase.instance.client.from('debts').update(data).eq('id', existing['id']);
                  } else {
                    await Supabase.instance.client.from('debts').insert(data);
                  }
                  if (context.mounted) Navigator.pop(context);
                  _load();
                },
                child: Text(existing != null ? 'حفظ التعديل' : 'إضافة'),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalDebt = _debts.fold(0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());
    final totalMonthly = _debts.fold(0.0, (a, d) => a + (d['monthly_payment'] as num).toDouble());

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        title: const Text('الديون'),
        actions: [IconButton(icon: const Icon(Icons.add, color: Color(0xFF3B7EF6)), onPressed: () => _showAddDialog())],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
          : RefreshIndicator(
              onRefresh: _load,
              color: const Color(0xFF3B7EF6),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(children: [
                      Expanded(child: _summaryCard('إجمالي الديون', totalDebt, const Color(0xFFEF4444))),
                      const SizedBox(width: 8),
                      Expanded(child: _summaryCard('الأقساط الشهرية', totalMonthly, const Color(0xFFF59E0B))),
                    ]),
                    const SizedBox(height: 16),
                    ..._debts.map((d) => _debtCard(d)),
                    if (_debts.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(40),
                        alignment: Alignment.center,
                        child: const Text('لا توجد ديون 🎉', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 16)),
                      ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _summaryCard(String label, double value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontFamily: 'Cairo')),
        const SizedBox(height: 4),
        Text('${value.toStringAsFixed(0)} $_currency', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 18)),
      ]),
    );
  }

  Widget _debtCard(Map<String, dynamic> debt) {
    final total = (debt['total_amount'] as num).toDouble();
    final remaining = (debt['remaining_amount'] as num).toDouble();
    final progress = total > 0 ? (total - remaining) / total : 0.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1629),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(child: Text(debt['name'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontFamily: 'Cairo', fontSize: 15))),
              GestureDetector(
                onTap: () => _showAddDialog(existing: debt),
                child: const Icon(Icons.edit_outlined, color: Color(0xFF3B7EF6), size: 18),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress.clamp(0.0, 1.0),
              backgroundColor: const Color(0xFF1E293B),
              valueColor: AlwaysStoppedAnimation<Color>(
                progress > 0.7 ? const Color(0xFF10B981) : progress > 0.4 ? const Color(0xFFF59E0B) : const Color(0xFFEF4444),
              ),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('متبقي: ${remaining.toStringAsFixed(0)} $_currency', style: const TextStyle(color: Color(0xFFEF4444), fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w700)),
              Text('قسط: ${(debt['monthly_payment'] as num).toStringAsFixed(0)} $_currency/شهر', style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 12)),
            ],
          ),
          const SizedBox(height: 4),
          Text('✅ سيتم الخصم تلقائياً كل شهر في اليوم ${debt['payment_day']}', style: const TextStyle(color: Color(0xFF10B981), fontSize: 11, fontFamily: 'Cairo')),
        ],
      ),
    );
  }
}
