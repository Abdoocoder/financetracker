import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ChallengesCard extends StatefulWidget {
  final String currency;
  const ChallengesCard({super.key, required this.currency});
  @override
  State<ChallengesCard> createState() => _ChallengesCardState();
}

class _ChallengesCardState extends State<ChallengesCard> {
  List<Map<String, dynamic>> _challenges = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final data = await Supabase.instance.client
        .from('saving_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('created_at')
        .limit(3);
    if (mounted) setState(() { _challenges = List<Map<String, dynamic>>.from(data); _loading = false; });
  }

  void _showAddDialog() {
    final titleCtrl = TextEditingController();
    final targetCtrl = TextEditingController();
    final endDateCtrl = TextEditingController();

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
          const Text('تحدي ادخار جديد', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
          const SizedBox(height: 20),
          _field(titleCtrl, 'اسم التحدي (مثال: تحدي القهوة)', TextInputType.text),
          const SizedBox(height: 10),
          _field(targetCtrl, 'المبلغ المستهدف', const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: 10),
          _field(endDateCtrl, 'تاريخ الانتهاء (YYYY-MM-DD)', TextInputType.datetime),
          const SizedBox(height: 20),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () async {
              final user = Supabase.instance.client.auth.currentUser!;
              HapticFeedback.mediumImpact();
              await Supabase.instance.client.from('saving_challenges').insert({
                'user_id': user.id,
                'title': titleCtrl.text,
                'target_amount': double.tryParse(targetCtrl.text) ?? 0,
                'current_amount': 0,
                'end_date': endDateCtrl.text.isEmpty ? null : endDateCtrl.text,
              });
              if (ctx.mounted) Navigator.pop(ctx);
              await _load();
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('إضافة التحدي', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900)),
          )),
          const SizedBox(height: 16),
        ]),
      ),
    );
  }

  void _addAmount(Map<String, dynamic> challenge) {
    final ctrl = TextEditingController();
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
          Text('تقدم في "${challenge['title']}"', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
          const SizedBox(height: 20),
          _field(ctrl, 'المبلغ الموفر', const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: 20),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () async {
              final amount = double.tryParse(ctrl.text) ?? 0;
              if (amount <= 0) return;
              HapticFeedback.mediumImpact();
              final current = (challenge['current_amount'] as num).toDouble();
              final target = (challenge['target_amount'] as num).toDouble();
              final newAmount = current + amount;
              await Supabase.instance.client.from('saving_challenges').update({
                'current_amount': newAmount,
                'is_completed': newAmount >= target,
              }).eq('id', challenge['id']);
              if (ctx.mounted) Navigator.pop(ctx);
              await _load();
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3B7EF6), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('تسجيل التقدم', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900)),
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
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFF1E293B))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('🎯 تحديات الادخار', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 14)),
          GestureDetector(onTap: _showAddDialog, child: const Text('+ إضافة', style: TextStyle(color: Color(0xFF3B7EF6), fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'Cairo'))),
        ]),
        const SizedBox(height: 16),
        if (_loading)
          const Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6), strokeWidth: 2))
        else if (_challenges.isEmpty)
          GestureDetector(
            onTap: _showAddDialog,
            child: Container(
              padding: const EdgeInsets.all(20),
              alignment: Alignment.center,
              decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF10B981).withOpacity(0.15))),
              child: const Column(children: [
                Text('🎯', style: TextStyle(fontSize: 32)),
                SizedBox(height: 8),
                Text('ابدأ تحديك الأول!', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 13)),
              ]),
            ),
          )
        else
          ..._challenges.map((c) {
            final target = (c['target_amount'] as num).toDouble();
            final current = (c['current_amount'] as num).toDouble();
            final progress = target > 0 ? (current / target).clamp(0.0, 1.0) : 0.0;
            final color = progress >= 0.8 ? const Color(0xFF10B981) : progress >= 0.5 ? const Color(0xFF3B7EF6) : const Color(0xFF8B5CF6);
            return GestureDetector(
              onTap: () => _addAmount(c),
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                child: Row(children: [
                  Container(width: 40, height: 40, decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                    child: const Center(child: Text('🎯', style: TextStyle(fontSize: 18)))),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(c['title'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'Cairo')),
                    const SizedBox(height: 6),
                    ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(value: progress, backgroundColor: const Color(0xFF1E293B), color: color, minHeight: 6)),
                    const SizedBox(height: 4),
                    Text('${current.toStringAsFixed(0)} / ${target.toStringAsFixed(0)} ${widget.currency}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo')),
                  ])),
                ]),
              ),
            );
          }),
      ]),
    );
  }
}
