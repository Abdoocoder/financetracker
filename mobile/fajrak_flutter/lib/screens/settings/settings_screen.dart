import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../app_state.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';
import 'dart:io';
import '../../main.dart';
import '../../widgets/settings/testimonial_card.dart';

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

  // Preferences
  String _appLang = 'ar';
  bool _isDarkMode = true;

  String _userEmail = '';
  String _memberSince = '';

  // Net worth data
  double _cashBalance = 0, _savings = 0, _investments = 0, _totalDebt = 0;

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Settings');
    _load();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _incomeCtrl.dispose();
    _jobTitleCtrl.dispose();
    _phoneCtrl.dispose();
    _realEstateCtrl.dispose();
    _vehiclesCtrl.dispose();
    _jewelryCtrl.dispose();
    _otherAssetsCtrl.dispose();
    _deleteInputCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;
      _userEmail = user.email ?? '';
      final created = DateTime.tryParse(user.createdAt) ?? DateTime.now();
      _memberSince = '${created.month}/${created.year}';

      final profile = await Supabase.instance.client
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
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

      // Load preferences
      final prefs = await SharedPreferences.getInstance();
      _appLang = prefs.getString('lang') ?? 'ar';
      _isDarkMode = prefs.getBool('darkMode') ?? true;

      // Net worth
      final txRes = await Supabase.instance.client
          .from('transactions')
          .select('type,amount')
          .eq('user_id', user.id);
      final goalsRes = await Supabase.instance.client
          .from('savings_goals')
          .select('current_amount')
          .eq('user_id', user.id);
      final invRes = await Supabase.instance.client
          .from('investments')
          .select('shares,current_price')
          .eq('user_id', user.id);
      final debtsRes = await Supabase.instance.client
          .from('debts')
          .select('remaining_amount')
          .eq('user_id', user.id)
          .eq('is_paid', false);

      double income = 0, expenses = 0;
      for (final tx in txRes as List) {
        if (tx['type'] == 'income') {
          income += (tx['amount'] as num).toDouble();
        } else {
          expenses += (tx['amount'] as num).toDouble();
        }
      }
      _cashBalance = income - expenses;
      _savings = (goalsRes as List)
          .fold(0.0, (a, g) => a + (g['current_amount'] as num).toDouble());
      _investments = (invRes as List).fold(
          0.0,
          (a, i) =>
              a +
              (i['shares'] as num).toDouble() *
                  (i['current_price'] as num).toDouble());
      _totalDebt = (debtsRes as List)
          .fold(0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());

    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'Settings Load');
    } finally {
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
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('تم الحفظ ✅', style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: Color(0xFF10B981)));
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
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content:
              Text('تم حفظ الأصول ✅', style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: Color(0xFF10B981)));
    }
  }

  Future<void> _exportData() async {
    setState(() => _loading = true);
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    final txRes = await Supabase.instance.client
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', ascending: false);
    final data = txRes as List;
    if (data.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('لا توجد معاملات لتصديرها',
                style: TextStyle(fontFamily: 'Cairo'))));
      }
      setState(() => _loading = false);
      return;
    }

    final buffer = StringBuffer();
    buffer.writeln('التاريخ,النوع,المبلغ,الفئة,الوصف');
    for (final tx in data) {
      final type = tx['type'] == 'income' ? 'دخل' : 'مصروف';
      buffer.writeln(
          '${tx['transaction_date']},$type,${tx['amount']},${tx['category'] ?? ''},${tx['description'] ?? ''}');
    }

    final directory = await getTemporaryDirectory();
    final file = File(
        '${directory.path}/fajrak_export_${DateTime.now().millisecondsSinceEpoch}.csv');
    await file.writeAsString('\uFEFF${buffer.toString()}');

    await Share.shareXFiles([XFile(file.path)], text: 'تصدير معاملات فجرك 🌅');
    setState(() => _loading = false);
  }

  void _shareApp() {
    const text =
        'جربت فجرك؟ تطبيق مالي عربي مجاني يساعدك تتحكم في مصاريفك وتبني ثروتك 🌅\n\nhttps://fajrak.com';
    Share.share(text);
  }

  Future<void> _deleteAccount() async {
    if (_deleteInputCtrl.text.trim() != 'حذف حسابي') return;
    setState(() => _deleting = true);
    final user = Supabase.instance.client.auth.currentUser!;
    try {
      await Supabase.instance.client
          .rpc('delete_user_account', params: {'user_id': user.id});
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
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final netWorth =
        _cashBalance + _savings + _investments + _totalAssets - _totalDebt;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('الإعدادات',
            style: TextStyle(
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w900,
                color: colorScheme.onSurface)),
        iconTheme: IconThemeData(color: colorScheme.onSurface),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Profile section (Accordion)
                    _accordionCard(
                      icon: '👤',
                      title: 'معلومات الملف الشخصي',
                      initiallyExpanded: true,
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Profile header inside accordion
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                  color: colorScheme.surface,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                      color: colorScheme.outlineVariant)),
                              child: Row(children: [
                                Container(
                                  width: 50,
                                  height: 50,
                                  decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(14),
                                      gradient: const LinearGradient(colors: [
                                        Color(0xFF3B7EF6),
                                        Color(0xFF8B5CF6)
                                      ])),
                                  child: Center(
                                      child: Text(
                                          _nameCtrl.text.isNotEmpty
                                              ? _nameCtrl.text
                                                  .substring(
                                                      0,
                                                      _nameCtrl.text.length
                                                          .clamp(0, 2))
                                                  .toUpperCase()
                                              : _userEmail
                                                  .substring(0, 2)
                                                  .toUpperCase(),
                                          style: const TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w900,
                                              fontSize: 16,
                                              fontFamily: 'Cairo'))),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                    child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                      Text(
                                          _nameCtrl.text.isNotEmpty
                                              ? _nameCtrl.text
                                              : 'اسمك',
                                          style: TextStyle(
                                              color: colorScheme.onSurface,
                                              fontWeight: FontWeight.w900,
                                              fontSize: 14,
                                              fontFamily: 'Cairo')),
                                      Text(_userEmail,
                                          style: TextStyle(
                                              color: colorScheme.onSurfaceVariant,
                                              fontSize: 11,
                                              fontFamily: 'Cairo')),
                                    ])),
                                Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      const Text('عضو',
                                          style: TextStyle(
                                              color: Color(0xFF64748B),
                                              fontSize: 9,
                                              fontFamily: 'Cairo')),
                                      Text(_memberSince,
                                          style: TextStyle(
                                              color: colorScheme.onSurfaceVariant,
                                              fontWeight: FontWeight.w800,
                                              fontSize: 11,
                                              fontFamily: 'Cairo')),
                                    ]),
                              ]),
                            ),
                            const SizedBox(height: 20),
                            _inputField(_nameCtrl, 'الاسم الكامل',
                                Icons.person_outline),
                            const SizedBox(height: 10),
                            _inputField(_jobTitleCtrl, 'المسمى الوظيفي',
                                Icons.work_outline),
                            const SizedBox(height: 10),
                            _inputField(
                                _phoneCtrl, 'رقم الهاتف', Icons.phone_outlined,
                                type: TextInputType.phone),
                            const SizedBox(height: 10),
                            GestureDetector(
                              onTap: () async {
                                final date = await showDatePicker(
                                    context: context,
                                    initialDate: _birthDate.isNotEmpty
                                        ? DateTime.tryParse(_birthDate) ??
                                            DateTime(1990)
                                        : DateTime(1990),
                                    firstDate: DateTime(1940),
                                    lastDate: DateTime.now(),
                                    builder: (ctx, child) => Theme(
                                        data: ThemeData.dark(), child: child!));
                                if (date != null) {
                                  setState(() => _birthDate =
                                      date.toIso8601String().split('T')[0]);
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 14),
                                decoration: BoxDecoration(
                                    color: colorScheme.surface,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: colorScheme.outlineVariant)),
                                child: Row(children: [
                                  const Icon(Icons.cake_outlined,
                                      color: Color(0xFF64748B), size: 20),
                                  const SizedBox(width: 12),
                                  Text(
                                      _birthDate.isNotEmpty
                                          ? _birthDate
                                          : 'تاريخ الميلاد',
                                      style: TextStyle(
                                          color: _birthDate.isNotEmpty
                                              ? colorScheme.onSurface
                                              : colorScheme.onSurfaceVariant,
                                          fontFamily: 'Cairo')),
                                ]),
                              ),
                            ),
                            const SizedBox(height: 20),
                            _sectionTitle('💰 الإعدادات المالية'),
                            _inputField(_incomeCtrl, 'الراتب الشهري',
                                Icons.account_balance_wallet_outlined,
                                type: const TextInputType.numberWithOptions(
                                    decimal: true)),
                            const SizedBox(height: 12),
                            Text('العملة',
                                style: TextStyle(
                                    color: colorScheme.onSurfaceVariant,
                                    fontFamily: 'Cairo',
                                    fontSize: 13)),
                            const SizedBox(height: 8),
                            Row(
                                children: ['JOD', 'دولار', 'SAR', 'AED', 'KWD']
                                    .map((c) => Expanded(
                                            child: Padding(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 3),
                                          child: GestureDetector(
                                            onTap: () =>
                                                setState(() => _currency = c),
                                            child: Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      vertical: 10),
                                              decoration: BoxDecoration(
                                                  color: _currency == c
                                                      ? colorScheme.primary
                                                      : colorScheme.surface,
                                                  borderRadius:
                                                      BorderRadius.circular(9),
                                                  border: Border.all(
                                                      color: _currency == c
                                                          ? colorScheme.primary
                                                          : colorScheme.outlineVariant)),
                                              child: Text(c,
                                                  textAlign: TextAlign.center,
                                                  style: TextStyle(
                                                      color: _currency == c
                                                          ? Colors.white
                                                          : colorScheme.onSurfaceVariant,
                                                      fontFamily: 'Cairo',
                                                      fontWeight:
                                                          FontWeight.w700,
                                                      fontSize: 11)),
                                            ),
                                          ),
                                        )))
                                    .toList()),
                            const SizedBox(height: 24),
                            SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed:
                                      _savingProfile ? null : _saveProfile,
                                  style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF3B7EF6),
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(
                                          vertical: 14),
                                      shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(12))),
                                  child: _savingProfile
                                      ? const SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: Colors.white))
                                      : Text('حفظ',
                                          style: const TextStyle(
                                              fontFamily: 'Cairo',
                                              fontWeight: FontWeight.w900,
                                              fontSize: 15)),
                                )),
                          ]),
                    ),
                    const SizedBox(height: 12),

                    // Preferences (Language + Theme)
                    _accordionCard(
                      icon: '⚙️',
                      title: 'التفضيلات',
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('اللغة',
                                style: TextStyle(
                                    color: colorScheme.onSurfaceVariant,
                                    fontSize: 13,
                                    fontFamily: 'Cairo',
                                    fontWeight: FontWeight.w700)),
                            const SizedBox(height: 8),
                            Row(children: [
                              Expanded(
                                  child: GestureDetector(
                                onTap: () async {
                                  setState(() => _appLang = 'ar');
                                  final p =
                                      await SharedPreferences.getInstance();
                                  await p.setString('lang', 'ar');
                                  context.read<AppState>().setLocale(const Locale('ar'));
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                            content: Text(
                                                'تم حفظ الإعدادات',
                                                style: const TextStyle(
                                                    fontFamily: 'Cairo')),
                                            backgroundColor:
                                                const Color(0xFF10B981)));
                                  }
                                },
                                child: Container(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 10),
                                  decoration: BoxDecoration(
                                    color: _appLang == 'ar'
                                        ? colorScheme.primary
                                        : colorScheme.surface,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: _appLang == 'ar' ? colorScheme.primary : colorScheme.outlineVariant),
                                  ),
                                  child: Center(
                                      child: Text('🇦🇪 العربية',
                                          style: TextStyle(
                                              color: _appLang == 'ar'
                                                  ? Colors.white
                                                  : colorScheme.onSurfaceVariant,
                                              fontFamily: 'Cairo',
                                              fontWeight: FontWeight.w700))),
                                ),
                              )),
                              const SizedBox(width: 8),
                              Expanded(
                                  child: GestureDetector(
                                onTap: () async {
                                  setState(() => _appLang = 'en');
                                  final p =
                                      await SharedPreferences.getInstance();
                                  await p.setString('lang', 'en');
                                  context.read<AppState>().setLocale(const Locale('en'));
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                            content: Text(
                                                'تم حفظ الإعدادات',
                                                style: const TextStyle(
                                                    fontFamily: 'Cairo')),
                                            backgroundColor:
                                                const Color(0xFF10B981)));
                                  }
                                },
                                child: Container(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 10),
                                  decoration: BoxDecoration(
                                    color: _appLang == 'en'
                                        ? colorScheme.primary
                                        : colorScheme.surface,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: _appLang == 'en' ? colorScheme.primary : colorScheme.outlineVariant),
                                  ),
                                  child: Center(
                                      child: Text('🇬🇧 English',
                                          style: TextStyle(
                                              color: _appLang == 'en'
                                                  ? Colors.white
                                                  : colorScheme.onSurfaceVariant,
                                              fontFamily: 'Cairo',
                                              fontWeight: FontWeight.w700))),
                                ),
                              )),
                            ]),
                            const SizedBox(height: 20),
                            const Text('الثيم',
                                style: TextStyle(
                                    color: Color(0xFF94A3B8),
                                    fontSize: 13,
                                    fontFamily: 'Cairo',
                                    fontWeight: FontWeight.w700)),
                            const SizedBox(height: 8),
                            Row(children: [
                              Expanded(
                                  child: GestureDetector(
                                onTap: () async {
                                  setState(() => _isDarkMode = true);
                                  final p =
                                      await SharedPreferences.getInstance();
                                  await p.setBool('darkMode', true);
                                  if (mounted) {
                                    context.read<AppState>().setTheme(true);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                            content: Text(
                                                'تم تفعيل الوضع الداكن ✅',
                                                style: TextStyle(
                                                    fontFamily: 'Cairo')),
                                            backgroundColor:
                                                Color(0xFF10B981)));
                                  }
                                },
                                child: Container(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 10),
                                  decoration: BoxDecoration(
                                    color: _isDarkMode
                                        ? colorScheme.primaryContainer
                                        : colorScheme.surface,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                        color: _isDarkMode
                                            ? colorScheme.primary
                                            : colorScheme.outlineVariant,
                                        width: 1.5),
                                  ),
                                  child: Center(
                                      child: Text('الوضع الداكن',
                                          style: TextStyle(
                                              color: _isDarkMode
                                                  ? colorScheme.onPrimaryContainer
                                                  : colorScheme.onSurfaceVariant,
                                              fontFamily: 'Cairo',
                                              fontWeight: FontWeight.w700))),
                                ),
                              )),
                              const SizedBox(width: 8),
                              Expanded(
                                  child: GestureDetector(
                                onTap: () async {
                                  setState(() => _isDarkMode = false);
                                  final p =
                                      await SharedPreferences.getInstance();
                                  await p.setBool('darkMode', false);
                                  if (mounted) {
                                    context.read<AppState>().setTheme(false);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                            content: Text(
                                                'تم تفعيل الوضع الفاتح ✅',
                                                style: TextStyle(
                                                    fontFamily: 'Cairo')),
                                            backgroundColor:
                                                Color(0xFF10B981)));
                                  }
                                },
                                child: Container(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 10),
                                  decoration: BoxDecoration(
                                    color: !_isDarkMode
                                        ? colorScheme.primaryContainer
                                        : colorScheme.surface,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                        color: !_isDarkMode
                                            ? colorScheme.primary
                                            : colorScheme.outlineVariant,
                                        width: 1.5),
                                  ),
                                  child: Center(
                                      child: Text('الوضع الفاتح',
                                          style: TextStyle(
                                              color: !_isDarkMode
                                                  ? colorScheme.onPrimaryContainer
                                                  : colorScheme.onSurfaceVariant,
                                              fontFamily: 'Cairo',
                                              fontWeight: FontWeight.w700))),
                                ),
                              )),
                            ]),
                          ]),
                    ),
                    const SizedBox(height: 12),

                    // Assets section (Accordion)
                    _accordionCard(
                      icon: '💎',
                      title: 'الأصول الشخصية',
                      badge: 'صافي الثروة',
                      child: Column(children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                              gradient: LinearGradient(colors: [
                                const Color(0xFF3B7EF6).withOpacity(0.05),
                                const Color(0xFF10B981).withOpacity(0.03)
                              ]),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                  color: const Color(0xFF3B7EF6)
                                      .withOpacity(0.15))),
                          child: Column(children: [
                            Text('💎 صافي ثروتك',
                                style: TextStyle(
                                    color: colorScheme.onSurfaceVariant,
                                    fontSize: 12,
                                    fontFamily: 'Cairo',
                                    fontWeight: FontWeight.w700)),
                            const SizedBox(height: 6),
                            Text('${netWorth.toStringAsFixed(0)} $_currency',
                                style: TextStyle(
                                    color: netWorth >= 0
                                        ? const Color(0xFF10B981)
                                        : const Color(0xFFEF4444),
                                    fontSize: 24,
                                    fontWeight: FontWeight.w900,
                                    fontFamily: 'Cairo')),
                            const SizedBox(height: 12),
                            Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceAround,
                                children: [
                                  _netWorthStat('💵 رصيد', _cashBalance,
                                      const Color(0xFF3B7EF6)),
                                  _netWorthStat('🎯 مدخرات', _savings,
                                      const Color(0xFF8B5CF6)),
                                  _netWorthStat('📈 استثمار', _investments,
                                      const Color(0xFF10B981)),
                                  _netWorthStat('💳 ديون', -_totalDebt,
                                      const Color(0xFFEF4444)),
                                ]),
                          ]),
                        ),
                        const SizedBox(height: 20),
                        Row(children: [
                          Expanded(
                              child: _assetField(_realEstateCtrl, '🏠 عقارات')),
                          const SizedBox(width: 8),
                          Expanded(
                              child: _assetField(_vehiclesCtrl, '🚗 مركبات')),
                        ]),
                        const SizedBox(height: 8),
                        Row(children: [
                          Expanded(
                              child: _assetField(
                                  _jewelryCtrl, '👑 ذهب / مجوهرات')),
                          const SizedBox(width: 8),
                          Expanded(
                              child: _assetField(_otherAssetsCtrl, '📦 أخرى')),
                        ]),
                        const SizedBox(height: 16),
                        SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _savingAssets ? null : _saveAssets,
                              style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF10B981),
                                  foregroundColor: Colors.white,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12))),
                              child: _savingAssets
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2, color: Colors.white))
                                  : const Text('حفظ الأصول',
                                      style: TextStyle(
                                          fontFamily: 'Cairo',
                                          fontWeight: FontWeight.w900)),
                            )),
                      ]),
                    ),
                    const SizedBox(height: 12),

                    // Data Export (Accordion)
                    _accordionCard(
                      icon: '📥',
                      title: 'تصدير البيانات',
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                                'قم بتصدير جميع معاملاتك إلى ملف CSV لاستخدامه في برامج مثل Excel.',
                                style: TextStyle(
                                    color: Color(0xFF94A3B8),
                                    fontSize: 12,
                                    fontFamily: 'Cairo',
                                    height: 1.6)),
                            const SizedBox(height: 16),
                            SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  onPressed: _loading ? null : _exportData,
                                  icon: const Icon(Icons.file_download_outlined,
                                      size: 20),
                                  label: const Text('تصدير المعاملات (CSV)',
                                      style: TextStyle(
                                          fontFamily: 'Cairo',
                                          fontWeight: FontWeight.w900)),
                                  style: ElevatedButton.styleFrom(
                                      backgroundColor: colorScheme.surface,
                                      foregroundColor: colorScheme.onSurface,
                                      side: BorderSide(
                                          color: colorScheme.outlineVariant),
                                      padding: const EdgeInsets.symmetric(
                                          vertical: 12),
                                      shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(12))),
                                )),
                          ]),
                    ),
                    const SizedBox(height: 12),

                    // Share App (Accordion)
                    _accordionCard(
                      icon: '🔗',
                      title: 'مشاركة فجرك',
                      child: Column(children: [
                        const Text('🌅', style: TextStyle(fontSize: 40)),
                        const SizedBox(height: 10),
                        Text('ساعدنا في نشر الوعي المالي',
                            style: TextStyle(
                                color: colorScheme.onSurface,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'Cairo',
                                fontSize: 14)),
                        const SizedBox(height: 8),
                        Text(
                            'شارك التطبيق مع العائلة والأصدقاء لتبدأوا رحلة الثراء سوياً.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                color: colorScheme.onSurfaceVariant,
                                fontSize: 12,
                                fontFamily: 'Cairo')),
                        const SizedBox(height: 20),
                        SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _shareApp,
                              style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF3B7EF6),
                                  foregroundColor: Colors.white,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12))),
                              child: const Text('💡 شارك التطبيق الآن',
                                  style: TextStyle(
                                      fontFamily: 'Cairo',
                                      fontWeight: FontWeight.w900)),
                            )),
                      ]),
                    ),
                    const SizedBox(height: 12),
                    const TestimonialCard(),
                    const SizedBox(height: 12),

                    // Account & Danger Zone (Accordion)
                    _accordionCard(
                      icon: '⚠️',
                      title: 'الحساب ومنطقة الخطر',
                      child: Column(children: [
                        // Logout
                        SizedBox(
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: _loggingOut
                                  ? null
                                  : () async {
                                      setState(() => _loggingOut = true);
                                      await Supabase.instance.client.auth
                                          .signOut();
                                      if (mounted) {
                                        Navigator.pushReplacementNamed(
                                            context, '/login');
                                      }
                                    },
                              style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFFEF4444),
                                  side: const BorderSide(
                                      color: Color(0xFFEF4444)),
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12))),
                              child: Text(
                                  _loggingOut ? '⏳...' : 'تسجيل الخروج ←',
                                  style: const TextStyle(
                                      fontFamily: 'Cairo',
                                      fontWeight: FontWeight.w700)),
                            )),
                        const SizedBox(height: 20),
                        Divider(color: colorScheme.outlineVariant),
                        const SizedBox(height: 10),
                        // Delete account
                        if (!_showDeleteConfirm) ...[
                          SizedBox(
                              width: double.infinity,
                              child: TextButton(
                                onPressed: () =>
                                    setState(() => _showDeleteConfirm = true),
                                style: TextButton.styleFrom(
                                    foregroundColor: const Color(0xFFEF4444)
                                        .withOpacity(0.7),
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 12)),
                                child: const Text('🗑️ حذف حسابي نهائياً',
                                    style: TextStyle(
                                        fontFamily: 'Cairo',
                                        fontWeight: FontWeight.w700,
                                        fontSize: 12)),
                              )),
                        ] else ...[
                          const SizedBox(height: 8),
                          const Text('اكتب "حذف حسابي" للتأكيد:',
                              style: TextStyle(
                                  color: Color(0xFFFCA5A5),
                                  fontSize: 13,
                                  fontFamily: 'Cairo',
                                  fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _deleteInputCtrl,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                color: colorScheme.onSurface, fontFamily: 'Cairo'),
                            decoration: InputDecoration(
                                hintText: 'حذف حسابي',
                                hintStyle: TextStyle(
                                    color: colorScheme.onSurfaceVariant,
                                    fontFamily: 'Cairo'),
                                filled: true,
                                fillColor: colorScheme.surface,
                                border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: BorderSide(
                                        color: colorScheme.error, width: 0.5)),
                                contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 12)),
                          ),
                          const SizedBox(height: 10),
                          Row(children: [
                            Expanded(
                                child: ElevatedButton(
                              onPressed: (_deleteInputCtrl.text.trim() !=
                                          'حذف حسابي' ||
                                      _deleting)
                                  ? null
                                  : _deleteAccount,
                              style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFEF4444),
                                  foregroundColor: Colors.white,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10))),
                              child: _deleting
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2, color: Colors.white))
                                  : const Text('تأكيد الحذف',
                                      style: TextStyle(
                                          fontFamily: 'Cairo',
                                          fontWeight: FontWeight.w700)),
                            )),
                            const SizedBox(width: 8),
                            Expanded(
                                child: OutlinedButton(
                              onPressed: () {
                                setState(() {
                                  _showDeleteConfirm = false;
                                  _deleteInputCtrl.clear();
                                });
                              },
                              style: OutlinedButton.styleFrom(
                                  foregroundColor: colorScheme.onSurfaceVariant,
                                  side: BorderSide(
                                      color: colorScheme.outlineVariant),
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10))),
                              child: Text('إلغاء',
                                  style: const TextStyle(fontFamily: 'Cairo')),
                            )),
                          ]),
                        ],
                      ]),
                    ),

                    const SizedBox(height: 40),
                    Center(
                        child: Text('فجرك 🌅 — v3.4.0',
                            style: TextStyle(
                                color: colorScheme.outlineVariant,
                                fontSize: 12,
                                fontFamily: 'Cairo'))),
                    const SizedBox(height: 20),
                  ]),
            ),
    );
  }

  Widget _accordionCard(
          {required String icon,
          required String title,
          String? badge,
          required Widget child,
          bool initiallyExpanded = false}) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Container(
        margin: const EdgeInsets.only(bottom: 2),
        decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: colorScheme.outlineVariant)),
        clipBehavior: Clip.antiAlias,
        child: Theme(
          data: theme.copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            initiallyExpanded: initiallyExpanded,
            backgroundColor: Colors.transparent,
            collapsedBackgroundColor: Colors.transparent,
            iconColor: colorScheme.onSurfaceVariant,
            collapsedIconColor: colorScheme.onSurfaceVariant,
            title: Row(children: [
              Text(icon, style: const TextStyle(fontSize: 18)),
              const SizedBox(width: 10),
              Text(title,
                  style: TextStyle(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w800,
                      fontFamily: 'Cairo',
                      fontSize: 13)),
              if (badge != null) ...[
                const SizedBox(width: 8),
                Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                        color: colorScheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: colorScheme.primary.withOpacity(0.2))),
                    child: Text(badge,
                        style: TextStyle(
                            color: colorScheme.primary,
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            fontFamily: 'Cairo'))),
              ]
            ]),
            childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
            children: [child],
          ),
        ),
      );
  Widget _netWorthStat(String label, double value, Color color) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(children: [
        Text(value.toStringAsFixed(0),
            style: TextStyle(
                color: color,
                fontWeight: FontWeight.w900,
                fontSize: 12,
                fontFamily: 'Cairo')),
        Text(label,
            style: TextStyle(
                color: colorScheme.onSurfaceVariant, fontSize: 9, fontFamily: 'Cairo')),
      ]);
  }

  Widget _sectionTitle(String title) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(title,
            style: TextStyle(
                color: colorScheme.onSurfaceVariant,
                fontFamily: 'Cairo',
                fontSize: 13,
                fontWeight: FontWeight.w700)),
      );
  }

  Widget _inputField(TextEditingController ctrl, String label, IconData icon,
          {TextInputType type = TextInputType.text}) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextField(
        controller: ctrl,
        keyboardType: type,
        textAlign: TextAlign.right,
        style: TextStyle(color: colorScheme.onSurface, fontFamily: 'Cairo'),
        decoration: InputDecoration(
          labelText: label,
          labelStyle:
              TextStyle(color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo'),
          prefixIcon: Icon(icon, color: colorScheme.onSurfaceVariant, size: 20),
          filled: true,
          fillColor: colorScheme.surface,
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: colorScheme.outlineVariant)),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: colorScheme.primary)),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      );
  }

  Widget _assetField(TextEditingController ctrl, String label) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextField(
        controller: ctrl,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        textAlign: TextAlign.right,
        onChanged: (_) => setState(() {}),
        style: TextStyle(
            color: colorScheme.onSurface, fontFamily: 'Cairo', fontSize: 13),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: TextStyle(
              color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo', fontSize: 12),
          filled: true,
          fillColor: colorScheme.surface,
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: colorScheme.outlineVariant)),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        ),
      );
  }

  Widget _infoRow(String label, String value) {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label,
            style: TextStyle(
                color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo', fontSize: 13)),
        Text(value,
            style: TextStyle(
                color: colorScheme.onSurface,
                fontFamily: 'Cairo',
                fontSize: 13,
                fontWeight: FontWeight.w600)),
      ]);
  }
}
