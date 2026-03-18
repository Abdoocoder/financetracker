import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _nameCtrl = TextEditingController();
  final _incomeCtrl = TextEditingController();
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
    if (user == null) return;
    final data = await Supabase.instance.client.from('profiles').select('full_name, monthly_income, currency').eq('id', user.id).single();
    setState(() {
      _nameCtrl.text = data['full_name'] as String? ?? '';
      _incomeCtrl.text = data['monthly_income']?.toString() ?? '';
      _currency = data['currency'] as String? ?? 'JOD';
      _loading = false;
    });
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final user = Supabase.instance.client.auth.currentUser!;
    await Supabase.instance.client.from('profiles').update({
      'full_name': _nameCtrl.text,
      'monthly_income': double.tryParse(_incomeCtrl.text) ?? 0,
      'currency': _currency,
    }).eq('id', user.id);
    setState(() => _saving = false);
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم الحفظ ✅', style: TextStyle(fontFamily: 'Cairo')), backgroundColor: Color(0xFF10B981)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('الإعدادات')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('المعلومات الشخصية', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 13)),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _nameCtrl,
                    style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                    decoration: const InputDecoration(labelText: 'الاسم الكامل', prefixIcon: Icon(Icons.person_outlined, color: Color(0xFF94A3B8))),
                  ),
                  const SizedBox(height: 24),
                  const Text('الإعدادات المالية', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 13)),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _incomeCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                    decoration: const InputDecoration(labelText: 'الراتب الشهري', prefixIcon: Icon(Icons.account_balance_wallet_outlined, color: Color(0xFF94A3B8))),
                  ),
                  const SizedBox(height: 16),
                  const Text('العملة', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 13)),
                  const SizedBox(height: 8),
                  Row(
                    children: ['JOD', 'USD', 'SAR', 'AED'].map((c) => Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: GestureDetector(
                          onTap: () => setState(() => _currency = c),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _currency == c ? const Color(0xFF3B7EF6) : const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(c, textAlign: TextAlign.center, style: TextStyle(color: _currency == c ? Colors.white : const Color(0xFF94A3B8), fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 13)),
                          ),
                        ),
                      ),
                    )).toList(),
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('حفظ التغييرات'),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('منطقة الخطر', style: TextStyle(color: Color(0xFFEF4444), fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: () async {
                              await Supabase.instance.client.auth.signOut();
                              if (context.mounted) Navigator.pushReplacementNamed(context, '/login');
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFFEF4444),
                              side: const BorderSide(color: Color(0xFFEF4444)),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: const Text('تسجيل الخروج', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
