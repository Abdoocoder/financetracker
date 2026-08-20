import '../../utils/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';
import '../../widgets/settings/testimonial_card.dart';

import '../../widgets/settings/profile_form.dart';
import '../../widgets/settings/assets_form.dart';
import '../../widgets/settings/preferences_section.dart';
import '../../widgets/settings/export_delete_section.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _loading = true;

  Map<String, dynamic>? _initialProfile;
  String _userEmail = '';
  String _memberSince = '';
  String _appVersion = 'v...';


  double _cashBalance = 0, _savings = 0, _investments = 0, _totalDebt = 0;
  String _currency = 'JOD';

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Settings');
    _load();
  }

  Future<void> _load() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;
      
      final packageInfo = await PackageInfo.fromPlatform();
      _appVersion = 'v${packageInfo.version}+${packageInfo.buildNumber}';

      _userEmail = user.email ?? '';
      final created = DateTime.tryParse(user.createdAt) ?? DateTime.now();
      _memberSince = '${created.month}/${created.year}';

      final profile = await Supabase.instance.client
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
      
      _initialProfile = profile;
      _currency = profile['currency'] as String? ?? 'JOD';


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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          'settings_title'.tr(),
          style: TextStyle(
            fontWeight: FontWeight.w900,
            color: colorScheme.onSurface,
          ),
        ),
        iconTheme: IconThemeData(color: colorScheme.onSurface),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ProfileForm(
                    initialProfile: _initialProfile,
                    userEmail: _userEmail,
                    memberSince: _memberSince,
                  ),
                  const PreferencesSection(),
                  AssetsForm(
                    initialProfile: _initialProfile,
                    netWorth: _cashBalance + _savings + _investments - _totalDebt,
                    cashBalance: _cashBalance,
                    savings: _savings,
                    investments: _investments,
                    totalDebt: _totalDebt,
                    currency: _currency,
                  ),
                  const ExportDeleteSection(),
                  const SizedBox(height: 12),
                  const TestimonialCard(),
                  const SizedBox(height: 40),
                  Center(
                    child: Text(
                      '🌄 — $_appVersion',
                      style: TextStyle(
                        color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
    );
  }
}
