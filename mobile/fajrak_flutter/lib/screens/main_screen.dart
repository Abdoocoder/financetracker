import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';

import 'dashboard/dashboard_screen.dart';
import 'transactions/transactions_screen.dart';
import 'debts/debts_screen.dart';
import 'budgets/budgets_screen.dart';
import 'more/more_screen.dart';
import '../widgets/main_screen/main_bottom_nav_bar.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 4; // Default to Dashboard

  final List<Widget> _screens = const [
    MoreScreen(),
    BudgetsScreen(),
    DebtsScreen(),
    TransactionsScreen(),
    DashboardScreen(),
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map && args['tab'] is int) {
      _currentIndex = args['tab'] as int;
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<AppState>().loadUnreadAlerts();
      }
    });
  }

  void _onTabSelected(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: MainBottomNavBar(
        currentIndex: _currentIndex,
        onTabSelected: _onTabSelected,
      ),
    );
  }
}
