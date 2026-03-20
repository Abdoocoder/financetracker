import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  // Profile
  final _nameCtrl = TextEditingController();
  final _incomeCtrl = TextEditingController();
  final _jobTitleCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  String _currency = 'JOD';
  String _birthDate = '';
  String _salaryDay = '1';

  // Assets
  final _realEstateCtrl = TextEditingController();
  final _vehiclesCtrl = TextEditingController();
  final _jewelryCtrl = TextEditingController();
  final _otherAssetsCtrl = TextEditingController();

  bool _loading = true;
  bool _savingProfile = false;
  bool _savingAssets = false;
  bool _loggingOut = false;
  bool _showDeleteConfirm = false;
  final _deleteInputCtrl = TextEditingController();
  bool _deleting = false;

  String _userEmail = '';
  String _memberSince = '';

  // Net worth data
  double _cashBalance = 0, _savings = 0, _investments = 0, _totalDebt = 0;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() {
    _nameCtrl.dispose(); _incomeCtrl.dispose(); _jobTitleCtrl.dispose();
    _phoneCtrl.dispose(); _realEstateCtrl.dispose(); _vehiclesCtrl.dispose();
    _jewelryCtrl.dispose(); _otherAssetsCtrl.dispose(); _deleteInputCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;
      _userEmail = user.email ?? '';
      final created = DateTime.tryParse(user.createdAt) ?? DateTime.now();
      _memberSince = '${created.month}/${created.year}';

      final profile = await Supabase.instance.client.from('profiles').select('*').eq('id', user.id).single();
      if (profile != null) {
        _nameCtrl.text = profile['full_name'] as String? ?? '';
        _incomeCtrl.text = profile['monthly_income']?.toString() ?? '';
        _currency = profile['currency'] as String? ?? 'JOD';
        _birthDate = profile['birth_date'] as String? ?? '';
        _jobTitleCtrl.text = profile['job_title'] as String? ?? '';
        _phoneCtrl.text = profile['phone'] as String? ?? '';
        _salaryDay = profile['salary_day']?.toString() ?? '1';
        _realEstateCtrl.text = profile['asset_real_estate']?.toString() ?? '';
        _vehiclesCtrl.text = profile['asset_vehicles']?.toString() ?? '';
        _jewelryCtrl.text = profile['asset_jewelry']?.toString() ?? '';
        _otherAssetsCtrl.text = profile['asset_other']?.toString() ?? '';
      }

      // Net worth
      final txRes = await Supabase.instance.client.from('transactions').select('type,amount').eq('user_id', user.id);
      final goalsRes = await Supabase.instance.client.from('savings_goals').select('current_amount').eq('user_id', user.id);
      final invRes = await Supabase.instance.client.from('investments').select('shares,current_price').eq('user_id', user.id);
      final debtsRes = await Supabase.instance.client.from('debts').select('remaining_amount').eq('user_id', user.id).eq('is_paid', false);

      double income = 0, expenses = 0;
      for (final tx in txRes as List) {
        if (tx['type'] == 'income') income += (tx['amount'] as num).toDouble();
        else expenses += (tx['amount'] as num).toDouble();
      }
      _cashBalance = income - expenses;
      _savings = (goalsRes as List).fold(0.0, (a, g) => a + (g['current_amount'] as num).toDouble());
      _investments = (invRes as List).fold(0.0, (a, i) => a + (i['shares'] as num).toDouble() * (i['current_price'] as num).toDouble());
      _totalDebt = (debtsRes as List).fold(0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());

      if (mounted) setState(() => _loading = false);
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _savingProfile = true);
    final user = Supabase.instance.client.auth.currentUser!;
    await Supabase.instance.client.from('profiles').upsert({
      'id': user.id,
      'full_name': _nameCtrl.text.trim(),
      'monthly_income': double.tryParse(_incomeCtrl.text) ?? 0,
      'currency': _currency,
      'job_title': _jobTitleCtrl.text.isEmpty ? null : _jobTitleCtrl.text,
      'phone': _phoneCtrl.text.isEmpty ? null : _phoneCtrl.text,
      'birth_date': _birthDate.isEmpty ? null : _birthDate,
      'salary_day': int.tryParse(_salaryDay) ?? 1,
      'updated_at': DateTime.now().toIso8601String(),
    });
    if (mounted) {
      setState(() => _savingProfile = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم الحفظ ✅', style: TextStyle(fontFamily: 'Cairo')), backgroundColor: Color(0xFF10B981)));
    }
  }

  Future<void> _saveAssets() async {
    setState(() => _savingAssets = true);
    final user = Supabase.instance.client.auth.currentUser!;
    await Supabase.instance.client.from('profiles').upsert({
      'id': user.id,
      'asset_real_estate': double.tryParse(_realEstateCtrl.text) ?? 0,
      'asset_vehicles': double.tryParse(_vehiclesCtrl.text) ?? 0,
      'asset_jewelry': double.tryParse(_jewelryCtrl.text) ?? 0,
      'asset_other': double.tryParse(_otherAssetsCtrl.text) ?? 0,
      'assets_updated_at': DateTime.now().toIso8601String(),
    });
    if (mounted) {
      setState(() => _savingAssets = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم حفظ الأصول ✅', style: TextStyle(fontFamily: 'Cairo')), backgroundColor: Color(0xFF10B981)));
    }
  }

  Future<void> _deleteAccount() async {
    if (_deleteInputCtrl.text.trim() != 'حذف حسابي') return;
    setState(() => _deleting = true);
    final user = Supabase.instance.client.auth.currentUser!;
    try {
      await Supabase.instance.client.rpc('delete_user_account', params: {'user_id': user.id});
    } catch (_) {}
    await Supabase.instance.client.auth.signOut();
    if (mounted) Navigator.pushReplacementNamed(context, '/login');
  }

  double get _totalAssets =>
    (double.tryParse(_realEstateCtrl.text) ?? 0) +
    (double.tryParse(_vehiclesCtrl.text) ?? 0) +
    (double.tryParse(_jewelryCtrl.text) ?? 0) +
    (double.tryParse(_otherAssetsCtrl.text) ?? 0);

  @override
  Widget build(BuildContext context) {
    final netWorth = _cashBalance + _savings + _investments + _totalAssets - _totalDebt;

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
                // Profile header
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [const Color(0xFF3B7EF6).withOpacity(0.1), const Color(0xFF8B5CF6).withOpacity(0.08)]),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFF3B7EF6).withOpacity(0.2)),
                  ),
                  child: Row(children: [
                    Container(
                      width: 60, height: 60,
                      decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), gradient: const LinearGradient(colors: [Color(0xFF3B7EF6), Color(0xFF8B5CF6)])),
                      child: Center(child: Text(_nameCtrl.text.isNotEmpty ? _nameCtrl.text.substring(0, _nameCtrl.text.length.clamp(0, 2)).toUpperCase() : _userEmail.substring(0, 2).toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20, fontFamily: 'Cairo'))),
                    ),
                    const SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(_nameCtrl.text.isNotEmpty ? _nameCtrl.text : 'اسمك', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16, fontFamily: 'Cairo')),
                      if (_jobTitleCtrl.text.isNotEmpty) Text(_jobTitleCtrl.text, style: const TextStyle(color: Color(0xFF93C5FD), fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'Cairo')),
                      Text(_userEmail, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, fontFamily: 'Cairo')),
                    ])),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      const Text('عضو', style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontFamily: 'Cairo')),
                      Text(_memberSince, style: const TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.w800, fontSize: 12, fontFamily: 'Cairo')),
                    ]),
                  ]),
                ),
                const SizedBox(height: 20),

                // Net Worth Banner
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF1E293B))),
                  child: Column(children: [
                    const Text('💎 صافي ثروتك', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                    const SizedBox(height: 6),
                    Text('${netWorth.toStringAsFixed(0)} $_currency', style: TextStyle(color: netWorth >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444), fontSize: 28, fontWeight: FontWeight.w900, fontFamily: 'Cairo')),
                    const SizedBox(height: 8),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                      _netWorthStat('💵 رصيد', _cashBalance, const Color(0xFF3B7EF6)),
                      _netWorthStat('🎯 مدخرات', _savings, const Color(0xFF8B5CF6)),
                      _netWorthStat('📈 استثمار', _investments, const Color(0xFF10B981)),
                      _netWorthStat('💳 ديون', -_totalDebt, const Color(0xFFEF4444)),
                    ]),
                  ]),
                ),
                const SizedBox(height: 24),

                // Personal Info section
                _sectionTitle('👤 المعلومات الشخصية'),
                _inputField(_nameCtrl, 'الاسم الكامل', Icons.person_outline),
                const SizedBox(height: 10),
                _inputField(_jobTitleCtrl, 'المهنة / الوظيفة', Icons.work_outline),
                const SizedBox(height: 10),
                _inputField(_phoneCtrl, 'رقم الهاتف', Icons.phone_outlined, type: TextInputType.phone),
                const SizedBox(height: 10),
                // Birth date
                GestureDetector(
                  onTap: () async {
                    final date = await showDatePicker(context: context, initialDate: _birthDate.isNotEmpty ? DateTime.tryParse(_birthDate) ?? DateTime(1990) : DateTime(1990), firstDate: DateTime(1940), lastDate: DateTime.now(), builder: (ctx, child) => Theme(data: ThemeData.dark(), child: child!));
                    if (date != null) setState(() => _birthDate = date.toIso8601String().split('T')[0]);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                    child: Row(children: [
                      const Icon(Icons.cake_outlined, color: Color(0xFF64748B), size: 20),
                      const SizedBox(width: 12),
                      Text(_birthDate.isNotEmpty ? _birthDate : 'تاريخ الميلاد', style: TextStyle(color: _birthDate.isNotEmpty ? Colors.white : const Color(0xFF64748B), fontFamily: 'Cairo')),
                    ]),
                  ),
                ),
                const SizedBox(height: 24),

                // Financial settings
                _sectionTitle('💰 الإعدادات المالية'),
                _inputField(_incomeCtrl, 'الراتب الشهري', Icons.account_balance_wallet_outlined, type: const TextInputType.numberWithOptions(decimal: true)),
                const SizedBox(height: 12),
                // Currency
                const Text('العملة', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 13)),
                const SizedBox(height: 8),
                Row(children: ['JOD', 'USD', 'SAR', 'AED', 'KWD'].map((c) => Expanded(child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: GestureDetector(
                    onTap: () => setState(() => _currency = c),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(color: _currency == c ? const Color(0xFF3B7EF6) : const Color(0xFF1E293B), borderRadius: BorderRadius.circular(9), border: Border.all(color: _currency == c ? const Color(0xFF3B7EF6) : Colors.transparent)),
                      child: Text(c, textAlign: TextAlign.center, style: TextStyle(color: _currency == c ? Colors.white : const Color(0xFF94A3B8), fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 11)),
                    ),
                  ),
                ))).toList()),
                const SizedBox(height: 24),

                // Save profile button
                SizedBox(width: double.infinity, child: ElevatedButton(
                  onPressed: _savingProfile ? null : _saveProfile,
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3B7EF6), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  child: _savingProfile ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('حفظ التغييرات', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 15)),
                )),
                const SizedBox(height: 24),

                // Assets section
                _sectionTitle('💎 أصولي الشخصية'),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF3B7EF6).withOpacity(0.2))),
                  child: Column(children: [
                    const Text('أدخل قيمة أصولك لحساب صافي ثروتك بدقة أكبر', style: TextStyle(color: Color(0xFF64748B), fontSize: 12, fontFamily: 'Cairo'), textAlign: TextAlign.center),
                    if (_totalAssets > 0) ...[
                      const SizedBox(height: 10),
                      Text('إجمالي الأصول: ${_totalAssets.toStringAsFixed(0)} $_currency', style: const TextStyle(color: Color(0xFF93C5FD), fontWeight: FontWeight.w900, fontFamily: 'Cairo')),
                    ],
                    const SizedBox(height: 12),
                    Row(children: [
                      Expanded(child: _assetField(_realEstateCtrl, '🏠 عقارات')),
                      const SizedBox(width: 8),
                      Expanded(child: _assetField(_vehiclesCtrl, '🚗 مركبات')),
                    ]),
                    const SizedBox(height: 8),
                    Row(children: [
                      Expanded(child: _assetField(_jewelryCtrl, '👑 ذهب / مجوهرات')),
                      const SizedBox(width: 8),
                      Expanded(child: _assetField(_otherAssetsCtrl, '📦 أخرى')),
                    ]),
                    const SizedBox(height: 14),
                    SizedBox(width: double.infinity, child: ElevatedButton(
                      onPressed: _savingAssets ? null : _saveAssets,
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8B5CF6), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      child: _savingAssets ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('حفظ الأصول', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900)),
                    )),
                  ]),
                ),
                const SizedBox(height: 24),

                // App info
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

                // Danger zone
                _sectionTitle('⚠️ منطقة الخطر'),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withOpacity(0.05),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2)),
                  ),
                  child: Column(children: [
                    // Logout
                    SizedBox(width: double.infinity, child: OutlinedButton(
                      onPressed: _loggingOut ? null : () async {
                        setState(() => _loggingOut = true);
                        await Supabase.instance.client.auth.signOut();
                        if (mounted) Navigator.pushReplacementNamed(context, '/login');
                      },
                      style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFEF4444), side: const BorderSide(color: Color(0xFFEF4444)), padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      child: Text(_loggingOut ? '⏳...' : 'تسجيل الخروج ←', style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                    )),
                    const SizedBox(height: 10),
                    // Delete account
                    if (!_showDeleteConfirm) ...[
                      SizedBox(width: double.infinity, child: TextButton(
                        onPressed: () => setState(() => _showDeleteConfirm = true),
                        style: TextButton.styleFrom(foregroundColor: const Color(0xFFEF4444), padding: const EdgeInsets.symmetric(vertical: 12)),
                        child: const Text('🗑️ حذف حسابي نهائياً', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                      )),
                    ] else ...[
                      const SizedBox(height: 8),
                      const Text('اكتب "حذف حسابي" للتأكيد:', style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 13, fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _deleteInputCtrl,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                        decoration: InputDecoration(hintText: 'حذف حسابي', hintStyle: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo'), filled: true, fillColor: const Color(0xFF1E293B), border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFEF4444), width: 0.5)), contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
                      ),
                      const SizedBox(height: 10),
                      Row(children: [
                        Expanded(child: ElevatedButton(
                          onPressed: (_deleteInputCtrl.text.trim() != 'حذف حسابي' || _deleting) ? null : _deleteAccount,
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                          child: _deleting ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('تأكيد الحذف', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                        )),
                        const SizedBox(width: 8),
                        Expanded(child: OutlinedButton(
                          onPressed: () { setState(() { _showDeleteConfirm = false; _deleteInputCtrl.clear(); }); },
                          style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF94A3B8), side: const BorderSide(color: Color(0xFF1E293B)), padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                          child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo')),
                        )),
                      ]),
                    ],
                  ]),
                ),
                const SizedBox(height: 32),
                const Center(child: Text('فجرك 🌅 — فجرك المالي يبدأ اليوم', style: TextStyle(color: Color(0xFF334155), fontSize: 12, fontFamily: 'Cairo'))),
              ]),
            ),
    );
  }

  Widget _netWorthStat(String label, double value, Color color) => Column(children: [
    Text('${value.toStringAsFixed(0)}', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 12, fontFamily: 'Cairo')),
    Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 9, fontFamily: 'Cairo')),
  ]);

  Widget _sectionTitle(String title) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Text(title, style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w700)),
  );

  Widget _inputField(TextEditingController ctrl, String label, IconData icon, {TextInputType type = TextInputType.text}) => TextField(
    controller: ctrl, keyboardType: type, textAlign: TextAlign.right,
    style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
    decoration: InputDecoration(
      labelText: label, labelStyle: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo'),
      prefixIcon: Icon(icon, color: const Color(0xFF64748B), size: 20),
      filled: true, fillColor: const Color(0xFF1E293B),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF3B7EF6))),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
  );

  Widget _assetField(TextEditingController ctrl, String label) => TextField(
    controller: ctrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), textAlign: TextAlign.right,
    onChanged: (_) => setState(() {}),
    style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontSize: 13),
    decoration: InputDecoration(
      labelText: label, labelStyle: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo', fontSize: 12),
      filled: true, fillColor: const Color(0xFF1E293B),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    ),
  );

  Widget _infoRow(String label, String value) => Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
    Text(label, style: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo', fontSize: 13)),
    Text(value, style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w600)),
  ]);
}
