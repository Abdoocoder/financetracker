import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  List<Map<String, dynamic>> _transactions = [];
  bool _loading = true;
  String _filter = 'all';
  String _search = '';
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

    var query = Supabase.instance.client.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', ascending: false);

    final data = await query;
    setState(() {
      _transactions = List<Map<String, dynamic>>.from(data);
      _loading = false;
    });
  }

  List<Map<String, dynamic>> get _filtered {
    return _transactions.where((tx) {
      if (_filter != 'all' && tx['type'] != _filter) return false;
      if (_search.isNotEmpty) {
        final desc = (tx['description'] ?? '').toString().toLowerCase();
        final cat = (tx['category'] ?? '').toString().toLowerCase();
        if (!desc.contains(_search) && !cat.contains(_search)) return false;
      }
      return true;
    }).toList();
  }

  Future<void> _delete(String id) async {
    await Supabase.instance.client.from('transactions').delete().eq('id', id);
    setState(() => _transactions.removeWhere((t) => t['id'] == id));
  }

  Future<void> _showAddDialog({Map<String, dynamic>? existing}) async {
    final typeController = ValueNotifier<String>(existing?['type'] ?? 'expense');
    final amountController = TextEditingController(text: existing?['amount']?.toString() ?? '');
    final descController = TextEditingController(text: existing?['description'] ?? '');
    final catController = TextEditingController(text: existing?['category'] ?? '');

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
            Text(existing != null ? 'تعديل المعاملة' : 'إضافة معاملة', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
            const SizedBox(height: 20),
            ValueListenableBuilder<String>(
              valueListenable: typeController,
              builder: (_, type, __) => Row(
                children: [
                  Expanded(child: GestureDetector(
                    onTap: () => typeController.value = 'income',
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: type == 'income' ? const Color(0xFF10B981).withValues(alpha: 0.2) : const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: type == 'income' ? const Color(0xFF10B981) : Colors.transparent),
                      ),
                      child: const Center(child: Text('💰 دخل', style: TextStyle(color: Colors.white, fontFamily: 'Cairo', fontWeight: FontWeight.w700))),
                    ),
                  )),
                  const SizedBox(width: 8),
                  Expanded(child: GestureDetector(
                    onTap: () => typeController.value = 'expense',
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: type == 'expense' ? const Color(0xFFEF4444).withValues(alpha: 0.2) : const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: type == 'expense' ? const Color(0xFFEF4444) : Colors.transparent),
                      ),
                      child: const Center(child: Text('💸 مصروف', style: TextStyle(color: Colors.white, fontFamily: 'Cairo', fontWeight: FontWeight.w700))),
                    ),
                  )),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
              decoration: const InputDecoration(labelText: 'المبلغ'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: catController,
              style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
              decoration: const InputDecoration(labelText: 'الفئة'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: descController,
              style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
              decoration: const InputDecoration(labelText: 'الوصف (اختياري)'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () async {
                final user = Supabase.instance.client.auth.currentUser!;
                final data = {
                  'user_id': user.id,
                  'type': typeController.value,
                  'amount': double.tryParse(amountController.text) ?? 0,
                  'category': catController.text,
                  'description': descController.text.isEmpty ? null : descController.text,
                  'transaction_date': DateTime.now().toIso8601String().split('T')[0],
                };
                if (existing != null) {
                  await Supabase.instance.client.from('transactions').update(data).eq('id', existing['id']);
                } else {
                  await Supabase.instance.client.from('transactions').insert(data);
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
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    final income = filtered.where((t) => t['type'] == 'income').fold(0.0, (a, t) => a + (t['amount'] as num).toDouble());
    final expenses = filtered.where((t) => t['type'] == 'expense').fold(0.0, (a, t) => a + (t['amount'] as num).toDouble());

    return Scaffold(
      appBar: AppBar(
        title: Column(children: [
          const Text('المعاملات', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
          Text('${filtered.length} معاملة', style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
        ]),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: Color(0xFF3B7EF6)),
            onPressed: () => _showAddDialog(),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
          : RefreshIndicator(
              onRefresh: _load,
              color: const Color(0xFF3B7EF6),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Row(children: [
                          Expanded(child: _statCard('الدخل', income, const Color(0xFF10B981))),
                          const SizedBox(width: 8),
                          Expanded(child: _statCard('المصاريف', expenses, const Color(0xFFEF4444))),
                          const SizedBox(width: 8),
                          Expanded(child: _statCard('الصافي', income - expenses, income >= expenses ? const Color(0xFF10B981) : const Color(0xFFEF4444))),
                        ]),
                        const SizedBox(height: 12),
                        TextFormField(
                          onChanged: (v) => setState(() => _search = v.toLowerCase()),
                          style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                          decoration: const InputDecoration(
                            hintText: 'ابحث عن معاملة...',
                            prefixIcon: Icon(Icons.search, color: Color(0xFF94A3B8)),
                            contentPadding: EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(children: [
                          _filterBtn('all', 'الكل'),
                          const SizedBox(width: 8),
                          _filterBtn('income', '💰 دخل'),
                          const SizedBox(width: 8),
                          _filterBtn('expense', '💸 مصروف'),
                        ]),
                      ],
                    ),
                  ),
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: filtered.length,
                      itemBuilder: (context, i) => _txItem(filtered[i]),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _statCard(String label, double value, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        FittedBox(child: Text('${value.toStringAsFixed(0)}', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 16))),
        Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo')),
      ]),
    );
  }

  Widget _filterBtn(String value, String label) {
    final isSelected = _filter == value;
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF3B7EF6) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label, style: TextStyle(color: isSelected ? Colors.white : const Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _txItem(Map<String, dynamic> tx) {
    final isIncome = tx['type'] == 'income';
    final amount = (tx['amount'] as num).toDouble();
    return Dismissible(
      key: Key(tx['id']),
      direction: DismissDirection.endToStart,
      background: Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(color: const Color(0xFFEF4444), borderRadius: BorderRadius.circular(12)),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      confirmDismiss: (_) async {
        return await showDialog<bool>(
          context: context,
          builder: (c) => AlertDialog(
            backgroundColor: const Color(0xFF0F1629),
            title: const Text('حذف المعاملة', style: TextStyle(color: Colors.white, fontFamily: 'Cairo')),
            content: const Text('هل أنت متأكد؟', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
            actions: [
              TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('إلغاء', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo'))),
              TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('حذف', style: TextStyle(color: Color(0xFFEF4444), fontFamily: 'Cairo'))),
            ],
          ),
        );
      },
      onDismissed: (_) => _delete(tx['id']),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF0F1629),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF1E293B)),
        ),
        child: Row(
          children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: isIncome ? const Color(0xFF064E3B) : const Color(0xFF7F1D1D),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(child: Text(isIncome ? '💰' : '💸', style: const TextStyle(fontSize: 18))),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(tx['description'] ?? tx['category'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontFamily: 'Cairo', fontSize: 13)),
                Text('${tx['category']} · ${tx['transaction_date']}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontFamily: 'Cairo')),
              ]),
            ),
            GestureDetector(
              onTap: () => _showAddDialog(existing: tx),
              child: Container(
                padding: const EdgeInsets.all(6),
                margin: const EdgeInsets.only(right: 8),
                decoration: BoxDecoration(color: const Color(0xFF3B7EF6).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.edit_outlined, color: Color(0xFF3B7EF6), size: 16),
              ),
            ),
            Text(
              '${isIncome ? '+' : '−'}${amount.toStringAsFixed(0)} $_currency',
              style: TextStyle(color: isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444), fontWeight: FontWeight.w900, fontFamily: 'Cairo'),
            ),
          ],
        ),
      ),
    );
  }
}
