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
  void dispose() {
    _nameCtrl.dispose();
    _incomeCtrl.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final data = await Supabase.instance.client
        .from('profiles')
        .select('full_name, monthly_income, currency')
        .eq('id', user.id)
        .single();
    if (mounted) setState(() {
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
      'full_name': _nameCtrl.text.trim(),
      'monthly_income': double.tryParse(_incomeCtrl.text) ?? 0,
      'currency': _currency,
    }).eq('id', user.id);
    if (mounted) {
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم الحفظ ✅', style: TextStyle(fontFamily: 'Cairo')), backgroundColor: Color(0xFF10B981)),
      );
    }
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo'),
      prefixIcon: Icon(icon, color: const Color(0xFF64748B), size: 20),
      filled: true,
      fillColor: const Color(0xFF1E293B),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF3B7EF6))),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF070B14),
        title: const Text('الإعدادات', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

                // المعلومات الشخصية
                _sectionTitle('👤 المعلومات الشخصية'),
                TextField(
                  controller: _nameCtrl,
                  style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                  decoration: _inputDecoration('الاسم الكامل', Icons.person_outlined),
                  textAlign: TextAlign.right,
                ),
                const SizedBox(height: 24),

                // الإعدادات المالية
                _sectionTitle('💰 الإعدادات المالية'),
                TextField(
                  controller: _incomeCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                  decoration: _inputDecoration('الراتب الشهري', Icons.account_balance_wallet_outlined),
                  textAlign: TextAlign.right,
                ),
                const SizedBox(height: 16),

                // العملة
                const Text('العملة', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 13)),
                const SizedBox(height: 8),
                Row(
                  children: ['JOD', 'USD', 'SAR', 'AED'].map((c) => Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: GestureDetector(
                        onTap: () => setState(() => _currency = c),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: _currency == c ? const Color(0xFF3B7EF6) : const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: _currency == c ? const Color(0xFF3B7EF6) : Colors.transparent),
                          ),
                          child: Text(c, textAlign: TextAlign.center, style: TextStyle(
                            color: _currency == c ? Colors.white : const Color(0xFF94A3B8),
                            fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 13,
                          )),
                        ),
                      ),
                    ),
                  )).toList(),
                ),
                const SizedBox(height: 32),

                // زر الحفظ
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF3B7EF6),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _saving
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('حفظ التغييرات', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 15)),
                  ),
                ),
                const SizedBox(height: 24),

                // معلومات التطبيق
                _sectionTitle('ℹ️ عن التطبيق'),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF1E293B))),
                  child: Column(children: [
                    _infoRow('الإصدار', 'v3.4.0'),
                    const Divider(color: Color(0xFF1E293B), height: 16),
                    _infoRow('الموقع', 'fajrak.com'),
                    const Divider(color: Color(0xFF1E293B), height: 16),
                    _infoRow('التواصل', 'abdooraf3@gmail.com'),
                  ]),
                ),
                const SizedBox(height: 24),

                // منطقة الخطر
                _sectionTitle('⚠️ منطقة الخطر'),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.2)),
                  ),
                  child: Column(children: [
                    SizedBox(width: double.infinity, child: OutlinedButton(
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
                    )),
                  ]),
                ),
                const SizedBox(height: 32),
                const Center(child: Text('فجرك 🌅 — فجرك المالي يبدأ اليوم', style: TextStyle(color: Color(0xFF334155), fontSize: 12, fontFamily: 'Cairo'))),
              ]),
            ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(title, style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w700)),
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo', fontSize: 13)),
      Text(value, style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w600)),
    ]);
  }
}
