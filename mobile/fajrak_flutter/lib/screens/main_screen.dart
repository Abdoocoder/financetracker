import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';

import 'dashboard/dashboard_screen.dart';
import 'transactions/transactions_screen.dart';
import 'debts/debts_screen.dart';
import 'accounts/accounts_screen.dart';
import 'more/more_screen.dart';
import '../widgets/main_screen/main_bottom_nav_bar.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 4; // Default to Dashboard

  // Track which tabs have been visited — only build a screen on first visit.
  late final List<bool> _visited;

  static const List<Widget> _screens = [
    MoreScreen(),
    AccountsScreen(),
    DebtsScreen(),
    TransactionsScreen(),
    DashboardScreen(),
  ];

  @override
  void initState() {
    super.initState();
    // Mark only the initial tab as visited.
    _visited = List.generate(_screens.length, (i) => i == _currentIndex);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<AppState>().loadUnreadAlerts();
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map && args['tab'] is int) {
      final tab = args['tab'] as int;
      if (tab != _currentIndex) {
        setState(() {
          _currentIndex = tab;
          _visited[tab] = true;
        });
      }
    }
  }

  void _onTabSelected(int index) {
    setState(() {
      _currentIndex = index;
      _visited[index] = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: IndexedStack(
        index: _currentIndex,
        children: List.generate(_screens.length, (i) {
          // Render a blank box until the tab is first visited — avoids
          // initializing all 5 screens on startup.
          if (!_visited[i]) return const SizedBox.shrink();
          return _screens[i];
        }),
      ),
      bottomNavigationBar: MainBottomNavBar(
        currentIndex: _currentIndex,
        onTabSelected: _onTabSelected,
      ),
    );
  }
}
