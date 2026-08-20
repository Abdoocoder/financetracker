import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../utils/error_handler.dart';
import '../../utils/detect_currency.dart';
import '../../services/analytics_service.dart';
import '../../services/currency_service.dart';
import '../../widgets/common/currency_picker_sheet.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentStep = 0;

  final _incomeController = TextEditingController();
  int _salaryDay = 25;
  String _currency = 'JOD';
  bool _loading = false;
  DetectionResult? _detected;

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Onboarding');
    final result = DetectCurrency.detect();
    _currency = result.currency;
    _detected = result;
  }

  @override
  void dispose() {
    _pageController.dispose();
    _incomeController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _loading = true);
    try {
      final user = Supabase.instance.client.auth.currentUser!;
      final income = double.tryParse(_incomeController.text) ?? 0;

      await Supabase.instance.client.from('profiles').upsert({
        'id': user.id,
        'monthly_income': income,
        'salary_day': _salaryDay,
        'currency': _currency,
        'onboarding_done': true,
      });

      if (income > 0) {
        await Supabase.instance.client.from('transactions').insert({
          'user_id': user.id,
          'type': 'income',
          'amount': income,
          'category': 'cat_salary'.tr(),
          'description': 'onboarding_income_desc'.tr(),
          'transaction_date': DateTime.now().toIso8601String().split('T')[0],
        });
      }

      AnalyticsService.logEvent('onboarding_complete', {
        'income': income,
        'currency': _currency,
        'salary_day': _salaryDay,
      });

      if (mounted) Navigator.pushReplacementNamed(context, '/main');
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'Onboarding Save');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _nextPage() {
    if (_currentStep < 3) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      _save();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            // Progress dots
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(4, (index) => _buildDot(index, colorScheme)),
              ),
            ),
            
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (idx) => setState(() => _currentStep = idx),
                children: [
                  _slideIntro(colorScheme),
                  _slideIncome(colorScheme),
                  _slideSalaryDay(colorScheme),
                  _slideSummary(colorScheme),
                ],
              ),
            ),

            // Controls
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _nextPage,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: colorScheme.primary,
                        foregroundColor: colorScheme.onPrimary,
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 8,
                        shadowColor: colorScheme.primary.withValues(alpha: 0.4),
                      ),
                      child: _loading
                          ? SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: colorScheme.onPrimary, strokeWidth: 2))
                          : Text(
                              _currentStep == 3 
                                ? 'onboarding_start'.tr()
                                : 'continue'.tr(),
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                            ),
                    ),
                  ),
                  if (_currentStep > 0 && !_loading)
                    TextButton(
                      onPressed: () => _pageController.previousPage(
                        duration: const Duration(milliseconds: 400),
                        curve: Curves.easeInOut,
                      ),
                      child: Text('back'.tr(), style: TextStyle(color: colorScheme.onSurfaceVariant)),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDot(int index, ColorScheme colorScheme) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      margin: const EdgeInsets.symmetric(horizontal: 4),
      height: 8,
      width: _currentStep == index ? 24 : 8,
      decoration: BoxDecoration(
        color: _currentStep == index ? colorScheme.primary : colorScheme.outlineVariant,
        borderRadius: BorderRadius.circular(4),
      ),
    );
  }

  Widget _slideIntro(ColorScheme colorScheme) {
    return Padding(
      padding: const EdgeInsets.all(30),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(30),
            decoration: BoxDecoration(
              color: colorScheme.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.auto_awesome, size: 80, color: colorScheme.primary),
          ),
          const SizedBox(height: 40),
          Text(
            'onboarding_welcome_title'.tr(),
            textAlign: TextAlign.center,
            style: TextStyle(color: colorScheme.onSurface, fontSize: 32, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 16),
          Text(
            'onboarding_welcome_subtitle'.tr(),
            textAlign: TextAlign.center,
            style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 16, height: 1.6),
          ),
        ],
      ),
    );
  }

  Widget _slideIncome(ColorScheme colorScheme) {
    return _slideBase(
      colorScheme: colorScheme,
      icon: Icons.account_balance_wallet_outlined,
      title: 'settings_income'.tr(),
      subtitle: 'onboarding_income_subtitle'.tr(),
      child: TextFormField(
        controller: _incomeController,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        textAlign: TextAlign.center,
        style: TextStyle(color: colorScheme.onSurface, fontSize: 32, fontWeight: FontWeight.w900),
        decoration: InputDecoration(
          hintText: '0',
          hintStyle: TextStyle(color: colorScheme.outlineVariant),
          suffixText: _currency,
          suffixStyle: TextStyle(color: colorScheme.primary, fontSize: 16, fontWeight: FontWeight.bold),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 20),
        ),
      ),
    );
  }

  Widget _slideSalaryDay(ColorScheme colorScheme) {
    return _slideBase(
      colorScheme: colorScheme,
      icon: Icons.calendar_today_outlined,
      title: 'onboarding_payday_title'.tr(),
      subtitle: 'onboarding_payday_subtitle'.tr(),
      child: Column(
        children: [
          Text(
            'onboarding_day_value'.tr(args: [_salaryDay.toString()]),
            style: TextStyle(color: colorScheme.primary, fontSize: 40, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 20),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              trackHeight: 8,
              activeTrackColor: colorScheme.primary,
              inactiveTrackColor: colorScheme.outlineVariant,
              thumbColor: colorScheme.onPrimary,
              overlayColor: colorScheme.primary.withValues(alpha: 0.2),
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 14),
            ),
            child: Slider(
              value: _salaryDay.toDouble(),
              min: 1,
              max: 28,
              divisions: 27,
              onChanged: (v) => setState(() => _salaryDay = v.round()),
            ),
          ),
        ],
      ),
    );
  }

  Widget _slideSummary(ColorScheme colorScheme) {
    final info = CurrencyService.findByCode(_currency);
    return _slideBase(
      colorScheme: colorScheme,
      icon: Icons.public,
      title: 'settings_currency'.tr(),
      subtitle: 'onboarding_currency_subtitle'.tr(),
      child: Column(children: [
        // عرض العملة المكتشفة
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: colorScheme.primary.withValues(alpha: 0.3)),
          ),
          child: Row(children: [
            Text(info?['flag'] as String? ?? '🌐', style: const TextStyle(fontSize: 28)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(
                info?['labelAr'] as String? ?? _currency,
                style: TextStyle(color: colorScheme.onSurface, fontSize: 15, fontWeight: FontWeight.w700),
              ),
              Text(
                _currency,
                style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 12),
              ),
            ])),
            TextButton(
              onPressed: () async {
                await showCurrencyPickerSheet(
                  context: context,
                  selectedCode: _currency,
                  onSelected: (code) => setState(() => _currency = code),
                );
              },
              child: Text('تغيير', style: TextStyle(color: colorScheme.primary, fontWeight: FontWeight.w700)),
            ),
          ]),
        ),
        if (_detected?.confidence == 'high' && _detected!.countryName.isNotEmpty) ...[
          const SizedBox(height: 10),
          Text(
            '📍 اكتشفنا أنك في ${_detected!.countryName}',
            style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 12),
            textAlign: TextAlign.center,
          ),
        ],
      ]),
    );
  }

  Widget _slideBase({required ColorScheme colorScheme, required IconData icon, required String title, required String subtitle, required Widget child}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 30),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 50, color: colorScheme.primary),
          const SizedBox(height: 20),
          Text(title, style: TextStyle(color: colorScheme.onSurface, fontSize: 24, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text(subtitle, textAlign: TextAlign.center, style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14)),
          const SizedBox(height: 40),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: colorScheme.outlineVariant),
            ),
            child: child,
          ),
        ],
      ),
    );
  }
}
