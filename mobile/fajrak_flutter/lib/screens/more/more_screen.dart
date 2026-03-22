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

import '../../widgets/more/more_menu_item.dart';

class MoreScreen extends StatefulWidget {
  const MoreScreen({super.key});

  @override
  State<MoreScreen> createState() => _MoreScreenState();
}

class _MoreScreenState extends State<MoreScreen> {

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('More');
    _load();
  }

  void _load() async {
    if (!mounted) return;
    try {
      // No explicit Supabase calls in this screen's initial load
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'More Load');
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
          padding: const EdgeInsets.only(top: 24, left: 16, right: 16, bottom: 40),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: colorScheme.outlineVariant),
            ),
            child: Column(
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 24),
                  decoration: BoxDecoration(
                    color: colorScheme.outlineVariant,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),

                MoreMenuItem(
                    icon: Icons.credit_card_outlined,
                    title: 'nav_debts'.tr(),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DebtsScreen())),
                    colorScheme: colorScheme),
                MoreMenuItem(
                    icon: Icons.pie_chart_outline,
                    title: 'nav_budgets'.tr(),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BudgetsScreen())),
                    colorScheme: colorScheme),
                MoreMenuItem(
                    icon: Icons.track_changes,
                    title: 'nav_goals'.tr(),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const GoalsScreen())),
                    colorScheme: colorScheme),
                MoreMenuItem(
                    icon: Icons.trending_up,
                    title: 'nav_investments'.tr(),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InvestmentsScreen())),
                    colorScheme: colorScheme),
                MoreMenuItem(
                    icon: Icons.menu_book_outlined,
                    title: 'nav_learn'.tr(),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LearnScreen())),
                    colorScheme: colorScheme),
                MoreMenuItem(
                    icon: Icons.notifications_none,
                    title: 'nav_alerts'.tr(),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AlertsScreen())),
                    colorScheme: colorScheme),
                MoreMenuItem(
                    icon: Icons.settings_outlined,
                    title: 'nav_settings'.tr(),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen())),
                    colorScheme: colorScheme),
                MoreMenuItem(
                    icon: Icons.help_outline,
                    title: 'nav_help'.tr(),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpScreen())),
                    colorScheme: colorScheme),

                const SizedBox(height: 16),

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
                          side: BorderSide(color: colorScheme.outlineVariant)),
                      elevation: 0,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.language, color: colorScheme.primary, size: 20),
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
}
