import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'settings_accordion.dart';
import '../../services/currency_service.dart';
import '../common/currency_picker_sheet.dart';

class ProfileForm extends StatefulWidget {
  final Map<String, dynamic>? initialProfile;
  final String userEmail;
  final String memberSince;

  const ProfileForm({
    super.key,
    required this.initialProfile,
    required this.userEmail,
    required this.memberSince,
  });

  @override
  State<ProfileForm> createState() => _ProfileFormState();
}

class _ProfileFormState extends State<ProfileForm> {
  late TextEditingController _nameCtrl;
  late TextEditingController _incomeCtrl;
  late TextEditingController _openingBalanceCtrl;
  late TextEditingController _jobTitleCtrl;
  late TextEditingController _phoneCtrl;
  late String _currency;
  late String _birthDate;
  late String _salaryDay;

  bool _savingProfile = false;

  @override
  void initState() {
    super.initState();
    final p = widget.initialProfile ?? {};
    _nameCtrl = TextEditingController(text: p['full_name']?.toString() ?? '');
    _incomeCtrl = TextEditingController(text: p['monthly_income']?.toString() ?? '');
    _openingBalanceCtrl = TextEditingController(text: p['opening_balance']?.toString() ?? '');
    _jobTitleCtrl = TextEditingController(text: p['job_title']?.toString() ?? '');
    _phoneCtrl = TextEditingController(text: p['phone']?.toString() ?? '');
    // تنظيف legacy data: 'دولار' كانت bug قديم، نحوّلها إلى 'USD'
    final raw = p['currency']?.toString() ?? 'JOD';
    _currency = CurrencyService.findByCode(raw) != null ? raw : 'JOD';
    _birthDate = p['birth_date']?.toString() ?? '';
    _salaryDay = p['salary_day']?.toString() ?? '1';
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _incomeCtrl.dispose();
    _openingBalanceCtrl.dispose();
    _jobTitleCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (_savingProfile) return;
    _savingProfile = true;
    setState(() {});
    try {
      final user = Supabase.instance.client.auth.currentUser!;
      final newIncome = double.tryParse(_incomeCtrl.text) ?? 0;

      await Supabase.instance.client.from('profiles').upsert({
        'id': user.id,
        'full_name': _nameCtrl.text.trim(),
        'monthly_income': newIncome,
        'opening_balance': double.tryParse(_openingBalanceCtrl.text) ?? 0,
        'currency': _currency,
        'job_title': _jobTitleCtrl.text.isEmpty ? null : _jobTitleCtrl.text,
        'phone': _phoneCtrl.text.isEmpty ? null : _phoneCtrl.text,
        'birth_date': _birthDate.isEmpty ? null : _birthDate,
        'salary_day': int.tryParse(_salaryDay) ?? 1,
        'updated_at': DateTime.now().toIso8601String(),
      });

      // Sync the salary transaction for the current month with the new income
      final now = DateTime.now();
      final monthStart = '${now.year}-${now.month.toString().padLeft(2, '0')}-01';
      final nextMonth = DateTime(now.year, now.month + 1, 1);
      final nextMonthStart = '${nextMonth.year}-${nextMonth.month.toString().padLeft(2, '0')}-01';

      final existing = await Supabase.instance.client
          .from('transactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'income')
          .inFilter('category', ['راتب', 'Salary'])
          .gte('transaction_date', monthStart)
          .lt('transaction_date', nextMonthStart)
          .limit(1);

      if ((existing as List).isNotEmpty) {
        await Supabase.instance.client
            .from('transactions')
            .update({'amount': newIncome})
            .eq('id', existing[0]['id']);
      } else if (newIncome > 0) {
        // لا توجد معاملة راتب هذا الشهر — أنشئ واحدة
        await Supabase.instance.client.from('transactions').insert({
          'user_id': user.id,
          'type': 'income',
          'amount': newIncome,
          'category': 'cat_salary'.tr(),
          'description': 'onboarding_income_desc'.tr(),
          'transaction_date': '${now.year}-${now.month.toString().padLeft(2, '0')}-01',
        });
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('toast_saved'.tr(), style: const TextStyle()),
          backgroundColor: AppColors.success,
        ));
      }
    } finally {
      if (mounted) setState(() => _savingProfile = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return SettingsAccordion(
      icon: Icons.person_outline,
      title: 'settings_profile_info'.tr(),
      initiallyExpanded: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Profile header card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: colorScheme.outlineVariant),
            ),
            child: Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: const LinearGradient(
                      colors: [AppColors.primary, AppColors.purple],
                    ),
                  ),
                  child: Center(
                    child: Text(
                      _nameCtrl.text.isNotEmpty
                          ? _nameCtrl.text.substring(0, _nameCtrl.text.length.clamp(0, 2)).toUpperCase()
                          : widget.userEmail.length >= 2
                              ? widget.userEmail.substring(0, 2).toUpperCase()
                              : 'U',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _nameCtrl.text.isNotEmpty ? _nameCtrl.text : 'settings_your_name'.tr(),
                        style: TextStyle(
                          color: colorScheme.onSurface,
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        widget.userEmail,
                        style: TextStyle(
                          color: colorScheme.onSurfaceVariant,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'settings_member'.tr(),
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 11,
                      ),
                    ),
                    Text(
                      widget.memberSince,
                      style: TextStyle(
                        color: colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w800,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _inputField(_nameCtrl, 'settings_name'.tr(), Icons.person_outline, colorScheme),
          const SizedBox(height: 10),
          _inputField(_jobTitleCtrl, 'settings_job_title'.tr(), Icons.work_outline, colorScheme),
          const SizedBox(height: 10),
          _inputField(_phoneCtrl, 'settings_phone'.tr(), Icons.phone_outlined, colorScheme, type: TextInputType.phone),
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () async {
              final date = await showDatePicker(
                context: context,
                initialDate: _birthDate.isNotEmpty ? DateTime.tryParse(_birthDate) ?? DateTime(1990) : DateTime(1990),
                firstDate: DateTime(1940),
                lastDate: DateTime.now(),
                builder: (ctx, child) => Theme(data: ThemeData.dark(), child: child!),
              );
              if (date != null) {
                setState(() => _birthDate = date.toIso8601String().split('T')[0]);
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: colorScheme.outlineVariant),
              ),
              child: Row(
                children: [
                  Icon(Icons.cake_outlined, color: colorScheme.onSurfaceVariant, size: 20),
                  const SizedBox(width: 12),
                  Text(
                    _birthDate.isNotEmpty ? _birthDate : 'settings_birth_date'.tr(),
                    style: TextStyle(
                      color: _birthDate.isNotEmpty ? colorScheme.onSurface : colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const Spacer(),
                  Icon(Icons.calendar_today_outlined, color: colorScheme.onSurfaceVariant, size: 16),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          _sectionTitle('settings_financial'.tr(), colorScheme),
          _inputField(_incomeCtrl, 'settings_income'.tr(), Icons.account_balance_wallet_outlined, colorScheme, type: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: 10),
          _inputField(_openingBalanceCtrl, 'الرصيد الابتدائي (النقد قبل التطبيق)', Icons.account_balance_wallet_outlined, colorScheme, type: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: 12),
          Text(
            'settings_currency'.tr(),
            style: TextStyle(
              color: colorScheme.onSurfaceVariant,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () async {
              await showCurrencyPickerSheet(
                context: context,
                selectedCode: _currency,
                onSelected: (code) => setState(() => _currency = code),
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: colorScheme.outlineVariant),
              ),
              child: Row(children: [
                Text(
                  CurrencyService.findByCode(_currency)?['flag'] as String? ?? '🌐',
                  style: const TextStyle(fontSize: 22),
                ),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(
                    CurrencyService.findByCode(_currency)?['labelAr'] as String? ?? _currency,
                    style: TextStyle(color: colorScheme.onSurface, fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  Text(
                    _currency,
                    style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 11),
                  ),
                ])),
                Icon(Icons.arrow_drop_down, color: colorScheme.onSurfaceVariant),
              ]),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _savingProfile ? null : _saveProfile,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _savingProfile
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      'save'.tr(),
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title, ColorScheme colorScheme) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: TextStyle(
          color: colorScheme.onSurfaceVariant,
          fontSize: 13,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _inputField(
    TextEditingController ctrl,
    String label,
    IconData icon,
    ColorScheme colorScheme, {
    TextInputType type = TextInputType.text,
  }) {
    return TextField(
      controller: ctrl,
      keyboardType: type,
      textAlign: TextAlign.right,
      style: TextStyle(color: colorScheme.onSurface),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: colorScheme.onSurfaceVariant),
        prefixIcon: Icon(icon, color: colorScheme.onSurfaceVariant, size: 20),
        filled: true,
        fillColor: colorScheme.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: colorScheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: colorScheme.primary),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
