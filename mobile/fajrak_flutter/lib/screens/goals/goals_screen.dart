import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class GoalsScreen extends StatefulWidget {
  const GoalsScreen({super.key});
  @override
  State<GoalsScreen> createState() => _GoalsScreenState();
}

class _GoalsScreenState extends State<GoalsScreen> {
  List<Map<String, dynamic>> _goals = [];
  bool _loading = true;
  String _currency = 'JOD';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final results = await Future.wait<dynamic>([
      Supabase.instance.client.from('profiles').select('currency').eq('id', user.id).single(),
      Supabase.instance.client.from('savings_goals').select('*').eq('user_id', user.id).order('created_at'),
    ]);
    if (mounted) setState(() {
      _currency = (results[0] as Map)['currency'] as String? ?? 'JOD';
      _goals = List<Map<String, dynamic>>.from(results[1] as List);
      _loading = false;
    });
  }

  void _showAddDialog({Map<String, dynamic>? existing}) {
    final nameCtrl = TextEditingController(text: existing?['name'] ?? '');
    final targetCtrl = TextEditingController(text: existing?['target_amount']?.toString() ?? '');
    final currentCtrl = TextEditingController(text: existing?['current_amount']?.toString() ?? '0');
    final deadlineCtrl = TextEditingController(text: existing?['deadline'] ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1629),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 16),
          Text(existing != null ? 'تعديل الهدف' : 'هدف ادخار جديد', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
          const SizedBox(height: 20),
          _field(nameCtrl, 'اسم الهدف (مثال: سيارة، حج، طوارئ)', TextInputType.text),
          const SizedBox(height: 10),
          _field(targetCtrl, 'المبلغ المستهدف', const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: 10),
          _field(currentCtrl, 'المبلغ المدخر حالياً', const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: 10),
          _field(deadlineCtrl, 'تاريخ الهدف (اختياري)', TextInputType.datetime),
          const SizedBox(height: 20),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () async {
              final user = Supabase.instance.client.auth.currentUser!;
              HapticFeedback.mediumImpact();
              final data = {
                'user_id': user.id,
                'name': nameCtrl.text,
                'target_amount': double.tryParse(targetCtrl.text) ?? 0,
                'current_amount': double.tryParse(currentCtrl.text) ?? 0,
                'deadline': deadlineCtrl.text.isEmpty ? null : deadlineCtrl.text,
              };
              if (existing != null) {
                await Supabase.instance.client.from('savings_goals').update(data).eq('id', existing['id']);
              } else {
                await Supabase.instance.client.from('savings_goals').insert(data);
              }
              if (ctx.mounted) Navigator.pop(ctx);
              await _load();
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3B7EF6), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: Text(existing != null ? 'حفظ التعديل' : 'إضافة الهدف', style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 15)),
          )),
          const SizedBox(height: 16),
        ])),
      ),
    );
  }

  void _showAddAmountDialog(Map<String, dynamic> goal) {
    final amountCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1629),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 16),
          Text('إضافة مبلغ لـ ${goal['name']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
          const SizedBox(height: 20),
          _field(amountCtrl, 'المبلغ المضاف', const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: 20),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () async {
              final amount = double.tryParse(amountCtrl.text) ?? 0;
              if (amount <= 0) return;
              HapticFeedback.mediumImpact();
              final current = (goal['current_amount'] as num).toDouble();
              await Supabase.instance.client.from('savings_goals').update({'current_amount': current + amount}).eq('id', goal['id']);
              if (ctx.mounted) Navigator.pop(ctx);
              await _load();
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('إضافة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 15)),
          )),
          const SizedBox(height: 16),
        ]),
      ),
    );
  }

  TextField _field(TextEditingController ctrl, String hint, TextInputType type) => TextField(
    controller: ctrl, keyboardType: type, textAlign: TextAlign.right,
    style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
    decoration: InputDecoration(
      hintText: hint, hintStyle: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo'),
      filled: true, fillColor: const Color(0xFF1E293B),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final totalTarget = _goals.fold(0.0, (a, g) => a + (g['target_amount'] as num).toDouble());
    final totalSaved = _goals.fold(0.0, (a, g) => a + (g['current_amount'] as num).toDouble());
    final completed = _goals.where((g) => (g['current_amount'] as num) >= (g['target_amount'] as num)).length;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF070B14),
        title: const Text('أهداف الادخار', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
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
                child: Column(children: [

                  // ملخص
                  Row(children: [
                    Expanded(child: _statCard('🎯', '${_goals.length}', 'أهداف', const Color(0xFF3B7EF6))),
                    const SizedBox(width: 8),
                    Expanded(child: _statCard('✅', '$completed', 'مكتمل', const Color(0xFF10B981))),
                    const SizedBox(width: 8),
                    Expanded(child: _statCard('💰', '${totalSaved.toStringAsFixed(0)}', 'مدخر', const Color(0xFF8B5CF6))),
                  ]),
                  const SizedBox(height: 16),

                  // شريط التقدم الكلي
                  if (_goals.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF1E293B))),
                      child: Column(children: [
                        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                          const Text('التقدم الكلي', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 12)),
                          Text('${totalSaved.toStringAsFixed(0)} / ${totalTarget.toStringAsFixed(0)} $_currency',
                            style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 12)),
                        ]),
                        const SizedBox(height: 8),
                        ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(
                          value: totalTarget > 0 ? (totalSaved / totalTarget).clamp(0.0, 1.0) : 0,
                          backgroundColor: const Color(0xFF1E293B),
                          valueColor: const AlwaysStoppedAnimation(Color(0xFF8B5CF6)),
                          minHeight: 10,
                        )),
                      ]),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // الأهداف
                  if (_goals.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(40),
                      decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF1E293B))),
                      child: Column(children: [
                        const Text('🎯', style: TextStyle(fontSize: 48)),
                        const SizedBox(height: 12),
                        const Text('لا توجد أهداف بعد', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 15)),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: () => _showAddDialog(), child: const Text('أضف هدفك الأول', style: TextStyle(fontFamily: 'Cairo'))),
                      ]),
                    )
                  else
                    ..._goals.map((goal) {
                      final target = (goal['target_amount'] as num).toDouble();
                      final current = (goal['current_amount'] as num).toDouble();
                      final progress = target > 0 ? (current / target).clamp(0.0, 1.0) : 0.0;
                      final remaining = target - current;
                      final isDone = current >= target;
                      final color = isDone ? const Color(0xFF10B981) : progress >= 0.7 ? const Color(0xFF3B7EF6) : const Color(0xFF8B5CF6);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F1629),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: color.withValues(alpha: 0.2)),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            Expanded(child: Text(goal['name'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 15))),
                            if (isDone) const Text('✅', style: TextStyle(fontSize: 18)),
                            const SizedBox(width: 8),
                            GestureDetector(onTap: () => _showAddDialog(existing: goal), child: const Icon(Icons.edit_outlined, color: Color(0xFF64748B), size: 18)),
                          ]),
                          const SizedBox(height: 12),
                          ClipRRect(borderRadius: BorderRadius.circular(6), child: LinearProgressIndicator(
                            value: progress,
                            backgroundColor: const Color(0xFF1E293B),
                            valueColor: AlwaysStoppedAnimation(color),
                            minHeight: 10,
                          )),
                          const SizedBox(height: 8),
                          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                            Text('${(progress * 100).toStringAsFixed(0)}% مكتمل', style: TextStyle(color: color, fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w700)),
                            Text('متبقي: ${remaining.toStringAsFixed(0)} $_currency', style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 12)),
                          ]),
                          if (!isDone) ...[
                            const SizedBox(height: 12),
                            SizedBox(width: double.infinity, child: OutlinedButton(
                              onPressed: () => _showAddAmountDialog(goal),
                              style: OutlinedButton.styleFrom(foregroundColor: color, side: BorderSide(color: color.withValues(alpha: 0.4)), padding: const EdgeInsets.symmetric(vertical: 10), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                              child: const Text('+ إضافة مبلغ', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                            )),
                          ],
                        ]),
                      );
                    }),
                ]),
              ),
            ),
    );
  }

  Widget _statCard(String icon, String value, String label, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withValues(alpha: 0.2))),
      child: Column(children: [
        Text(icon, style: const TextStyle(fontSize: 20)),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 16, fontFamily: 'Cairo')),
        Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo')),
      ]),
    );
  }
}
