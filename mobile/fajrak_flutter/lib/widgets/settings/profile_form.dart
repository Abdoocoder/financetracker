import 'package:flutter/material.dart';
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
    _jobTitleCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    setState(() => _savingProfile = true);
    try {
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
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('toast_saved'.tr(), style: const TextStyle(fontFamily: 'Cairo')),
          backgroundColor: const Color(0xFF10B981),
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
                      colors: [Color(0xFF3B7EF6), Color(0xFF8B5CF6)],
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
                        fontFamily: 'Cairo',
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
                          fontFamily: 'Cairo',
                        ),
                      ),
                      Text(
                        widget.userEmail,
                        style: TextStyle(
                          color: colorScheme.onSurfaceVariant,
                          fontSize: 11,
                          fontFamily: 'Cairo',
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
                        color: Color(0xFF64748B),
                        fontSize: 9,
                        fontFamily: 'Cairo',
                      ),
                    ),
                    Text(
                      widget.memberSince,
                      style: TextStyle(
                        color: colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w800,
                        fontSize: 11,
                        fontFamily: 'Cairo',
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
                      fontFamily: 'Cairo',
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
          const SizedBox(height: 12),
          Text(
            'settings_currency'.tr(),
            style: TextStyle(
              color: colorScheme.onSurfaceVariant,
              fontFamily: 'Cairo',
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
                    style: TextStyle(color: colorScheme.onSurface, fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  Text(
                    _currency,
                    style: TextStyle(color: colorScheme.onSurfaceVariant, fontFamily: 'monospace', fontSize: 11),
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
                backgroundColor: const Color(0xFF3B7EF6),
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
                      style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 15),
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
          fontFamily: 'Cairo',
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
      style: TextStyle(color: colorScheme.onSurface, fontFamily: 'Cairo'),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo'),
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
