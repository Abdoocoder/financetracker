import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../app_state.dart';
import 'settings_accordion.dart';

class PreferencesSection extends StatefulWidget {
  final String currentLang;
  final bool currentDarkMode;

  const PreferencesSection({
    super.key,
    required this.currentLang,
    required this.currentDarkMode,
  });

  @override
  State<PreferencesSection> createState() => _PreferencesSectionState();
}

class _PreferencesSectionState extends State<PreferencesSection> {
  late String _appLang;
  late bool _isDarkMode;

  @override
  void initState() {
    super.initState();
    _appLang = widget.currentLang;
    _isDarkMode = widget.currentDarkMode;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return SettingsAccordion(
      icon: Icons.settings,
      title: 'settings_preferences'.tr(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'settings_language'.tr(),
            style: TextStyle(
              color: colorScheme.onSurfaceVariant,
              fontSize: 13,
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => _changeLang('ar'),
                  child: _buildToggle(
                    selected: _appLang == 'ar',
                    theme: theme,
                    label: 'settings_lang_ar'.tr(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: GestureDetector(
                  onTap: () => _changeLang('en'),
                  child: _buildToggle(
                    selected: _appLang == 'en',
                    theme: theme,
                    label: 'settings_lang_en'.tr(),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            'settings_theme'.tr(),
            style: TextStyle(
              color: const Color(0xFF94A3B8),
              fontSize: 13,
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => _changeTheme(true),
                  child: _buildToggle(
                    selected: _isDarkMode,
                    theme: theme,
                    label: 'settings_dark'.tr(),
                    isThemeToggle: true,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: GestureDetector(
                  onTap: () => _changeTheme(false),
                  child: _buildToggle(
                    selected: !_isDarkMode,
                    theme: theme,
                    label: 'settings_light'.tr(),
                    isThemeToggle: true,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildToggle({
    required bool selected,
    required ThemeData theme,
    required String label,
    bool isThemeToggle = false,
  }) {
    final colorScheme = theme.colorScheme;
    final bgColor = selected
        ? (isThemeToggle ? colorScheme.primaryContainer : colorScheme.primary)
        : colorScheme.surface;
    final borderColor = selected ? colorScheme.primary : colorScheme.outlineVariant;
    final textColor = selected
        ? (isThemeToggle ? colorScheme.onPrimaryContainer : Colors.white)
        : colorScheme.onSurfaceVariant;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor, width: isThemeToggle ? 1.5 : 1.0),
      ),
      child: Center(
        child: Text(
          label,
          style: TextStyle(
            color: textColor,
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  Future<void> _changeLang(String langCode) async {
    setState(() => _appLang = langCode);
    if (mounted) {
      await context.setLocale(Locale(langCode));
      if (mounted) {
        context.read<AppState>().setLocale(Locale(langCode));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('toast_settings_saved'.tr(),
                style: const TextStyle(fontFamily: 'Cairo')),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      }
    }
  }

  Future<void> _changeTheme(bool isDark) async {
    setState(() => _isDarkMode = isDark);
    final p = await SharedPreferences.getInstance();
    await p.setBool('darkMode', isDark);
    if (mounted) {
      context.read<AppState>().setTheme(isDark);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isDark ? 'settings_dark_success'.tr() : 'settings_light_success'.tr(),
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: const Color(0xFF10B981),
        ),
      );
    }
  }
}
