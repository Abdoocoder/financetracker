import 'package:flutter/material.dart';
import 'dashboard/dashboard_screen.dart';
import 'transactions/transactions_screen.dart';
import 'debts/debts_screen.dart';
import 'budgets/budgets_screen.dart';
import 'more/more_screen.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';
class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 4; // Dashboard

  final List<Widget> _screens = [
    const MoreScreen(),
    const BudgetsScreen(),
    const DebtsScreen(),
    const TransactionsScreen(),
    const DashboardScreen(),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppState>().loadUnreadAlerts();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: colorScheme.surface,
          border: Border(top: BorderSide(color: colorScheme.outlineVariant)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _navItem(0, Icons.more_horiz, 'nav_settings'.tr()),
                _navItem(1, Icons.pie_chart_outline, 'nav_budgets'.tr()),
                _navItem(2, Icons.credit_card_outlined, 'nav_debts'.tr()),
                _navItem(3, Icons.swap_vert, 'nav_transactions'.tr()),
                _navItem(4, Icons.dashboard_outlined, 'nav_home'.tr()),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navItem(int index, IconData icon, String label) {
    final isSelected = _currentIndex == index;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? colorScheme.primary.withValues(alpha: 0.15)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isSelected ? _filledIcon(icon) : icon,
                  color: isSelected
                      ? colorScheme.primary
                      : colorScheme.onSurfaceVariant,
                  size: 24,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(label,
              style: TextStyle(
                fontSize: 10,
                fontFamily: 'Cairo',
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w400,
                color: isSelected
                    ? colorScheme.primary
                    : colorScheme.onSurfaceVariant,
              )),
          if (isSelected)
            Container(
              margin: const EdgeInsets.only(top: 3),
              width: 20,
              height: 3,
              decoration: BoxDecoration(
                color: colorScheme.primary,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
        ],
      ),
    );
  }

  IconData _filledIcon(IconData icon) {
    final map = {
      Icons.more_horiz: Icons.more_horiz,
      Icons.pie_chart_outline: Icons.pie_chart,
      Icons.credit_card_outlined: Icons.credit_card,
      Icons.swap_vert: Icons.swap_vert,
      Icons.dashboard_outlined: Icons.dashboard,
    };
    return map[icon] ?? icon;
  }
}
