import 'package:easy_localization/easy_localization.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';
import 'package:flutter/material.dart';
import '../debts/debts_screen.dart';
import '../budgets/budgets_screen.dart';
import '../goals/goals_screen.dart';
import '../investments/investments_screen.dart';
import '../learn/learn_screen.dart';
import '../alerts/alerts_screen.dart';
import '../settings/settings_screen.dart';
import '../help/help_screen.dart';

class MoreScreen extends StatefulWidget {
  const MoreScreen({super.key});

  @override
  State<MoreScreen> createState() => _MoreScreenState();
}

class _MoreScreenState extends State<MoreScreen> {
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('More');
    _load();
  }

  void _load() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      // No explicit Supabase calls in this screen's initial load based on the provided context,
      // but if there were, they would be wrapped here.
      // Example: await Supabase.instance.client.from('table').select();
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'More Load');
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
      body: SafeArea(
        child: SingleChildScrollView(
          padding:
              const EdgeInsets.only(top: 24, left: 16, right: 16, bottom: 40),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: colorScheme.outlineVariant),
            ),
            child: Column(
              children: [
                // Top handle (like a bottom sheet)
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 24),
                  decoration: BoxDecoration(
                    color: colorScheme.outlineVariant,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),

                // Menu items matching the screenshot
                _menuItem(
                    context,
                    Icons.credit_card_outlined,
                    'nav_debts'.tr(),
                    () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const DebtsScreen())), colorScheme),
                _menuItem(
                    context,
                    Icons.pie_chart_outline,
                    'nav_budgets'.tr(),
                    () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const BudgetsScreen())), colorScheme),
                _menuItem(
                    context,
                    Icons.track_changes,
                    'nav_goals'.tr(),
                    () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const GoalsScreen())), colorScheme),
                _menuItem(
                    context,
                    Icons.trending_up,
                    'nav_investments'.tr(),
                    () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const InvestmentsScreen())), colorScheme),
                _menuItem(
                    context,
                    Icons.menu_book_outlined,
                    'nav_learn'.tr(),
                    () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const LearnScreen())), colorScheme),
                _menuItem(
                    context,
                    Icons.notifications_none,
                    'nav_alerts'.tr(),
                    () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const AlertsScreen())), colorScheme),
                _menuItem(
                    context,
                    Icons.settings_outlined,
                    'nav_settings'.tr(),
                    () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const SettingsScreen())), colorScheme),
                _menuItem(
                    context,
                    Icons.help_outline,
                    'nav_help'.tr(),
                    () => Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const HelpScreen())), colorScheme),

                const SizedBox(height: 16),

                // Language toggle button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.surface,
                      foregroundColor: colorScheme.onSurface,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: colorScheme.outlineVariant)),
                      elevation: 0,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.language,
                            color: colorScheme.primary, size: 20),
                        const SizedBox(width: 8),
                        Text('English',
                            style: TextStyle(
                                fontFamily: 'Cairo',
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                                color: colorScheme.onSurface)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _menuItem(
      BuildContext context, IconData icon, String title, VoidCallback onTap, ColorScheme colorScheme) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: colorScheme.outlineVariant),
        ),
        child: Row(
          children: [
            Icon(icon, color: colorScheme.onSurfaceVariant, size: 22),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  color: colorScheme.onSurface,
                  fontFamily: 'Cairo',
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            Icon(Icons.arrow_back_ios_new,
                color: colorScheme.outlineVariant, size: 14),
          ],
        ),
      ),
    );
  }
}
