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
import 'fire_calculator_screen.dart';
import 'zakat_calculator_screen.dart';

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
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.only(top: 16, left: 16, right: 16, bottom: 24),
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 16, right: 4, left: 4),
            child: Text(
              'nav_more'.tr(),
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: colorScheme.onSurface,
              ),
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
              icon: Icons.local_fire_department_outlined,
              title: 'fire_title'.tr(),
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FIRECalculatorScreen())),
              colorScheme: colorScheme),
          MoreMenuItem(
              icon: Icons.cruelty_free_outlined,
              title: 'zakat_title'.tr(),
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ZakatCalculatorScreen())),
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
        ],
      ),
    );
  }
}
