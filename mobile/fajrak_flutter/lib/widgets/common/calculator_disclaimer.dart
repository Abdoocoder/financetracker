import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:shared_preferences/shared_preferences.dart';

class CalculatorDisclaimer extends StatefulWidget {
  final String storageKey;
  const CalculatorDisclaimer({super.key, required this.storageKey});

  @override
  State<CalculatorDisclaimer> createState() => _CalculatorDisclaimerState();
}

class _CalculatorDisclaimerState extends State<CalculatorDisclaimer> {
  bool _dismissed = true; // hidden until prefs loaded

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final hidden = prefs.getBool(widget.storageKey) ?? false;
    if (mounted) setState(() => _dismissed = hidden);
  }

  Future<void> _dismiss({required bool permanent}) async {
    if (permanent) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(widget.storageKey, true);
    }
    if (mounted) setState(() => _dismissed = true);
  }

  @override
  Widget build(BuildContext context) {
    if (_dismissed) return const SizedBox.shrink();
    final colorScheme = Theme.of(context).colorScheme;
    final isAr = context.locale.languageCode == 'ar';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF3C7),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.5)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('⚠️', style: TextStyle(fontSize: 18)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isAr
                      ? 'النتائج تقديرية للتوعية المالية فقط وليست نصيحة مالية أو قانونية أو شرعية. استشر متخصصاً قبل اتخاذ أي قرار.'
                      : 'Results are estimates for financial awareness only — not financial, legal, or religious advice. Consult a professional before any decision.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.warningDark,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    GestureDetector(
                      onTap: () => _dismiss(permanent: true),
                      child: Text(
                        isAr ? 'لا تظهر مجدداً' : "Don't show again",
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.warningDark,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    GestureDetector(
                      onTap: () => _dismiss(permanent: false),
                      child: Text(
                        isAr ? '✕ إخفاء' : '✕ Dismiss',
                        style: TextStyle(
                          fontSize: 11,
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
