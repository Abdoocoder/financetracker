import 'package:flutter/material.dart';
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
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final profile = await Supabase.instance.client.from('profiles').select('currency').eq('id', user.id).single();
    _currency = profile['currency'] as String? ?? 'JOD';
    final data = await Supabase.instance.client.from('savings_goals').select('*').eq('user_id', user.id);
    setState(() { _goals = List<Map<String, dynamic>>.from(data); _loading = false; });
  }

  Future<void> _showAddDialog() async {
    final nameCtrl = TextEditingController();
    final targetCtrl = TextEditingController();

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1629),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            const Text('هدف ادخار جديد', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
            const SizedBox(height: 20),
            TextFormField(controller: nameCtrl, style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'), decoration: const InputDecoration(labelText: 'اسم الهدف')),
            const SizedBox(height: 12),
            TextFormField(controller: targetCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'), decoration: const InputDecoration(labelText: 'المبلغ المستهدف')),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () async {
                final user = Supabase.instance.client.auth.currentUser!;
                await Supabase.instance.client.from('savings_goals').insert({
                  'user_id': user.id,
                  'name': nameCtrl.text,
                  'target_amount': double.tryParse(targetCtrl.text) ?? 0,
                  'current_amount': 0,
                });
                if (context.mounted) Navigator.pop(context);
                _load();
              },
              child: const Text('إضافة'),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الأهداف'),
        actions: [IconButton(icon: const Icon(Icons.add, color: Color(0xFF3B7EF6)), onPressed: _showAddDialog)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
          : _goals.isEmpty
              ? const Center(child: Text('لا توجد أهداف بعد', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 16)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _goals.length,
                  itemBuilder: (context, i) {
                    final goal = _goals[i];
                    final target = (goal['target_amount'] as num).toDouble();
                    final current = (goal['current_amount'] as num).toDouble();
                    final pct = target > 0 ? (current / target).clamp(0.0, 1.0) : 0.0;

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
                              Text(goal['name'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontFamily: 'Cairo', fontSize: 15)),
                              Text('${(pct * 100).toStringAsFixed(0)}%', style: const TextStyle(color: Color(0xFF3B7EF6), fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: pct,
                              backgroundColor: const Color(0xFF1E293B),
                              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF3B7EF6)),
                              minHeight: 8,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('${current.toStringAsFixed(0)} $_currency', style: const TextStyle(color: Color(0xFF3B7EF6), fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                              Text('من ${target.toStringAsFixed(0)} $_currency', style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 12)),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
