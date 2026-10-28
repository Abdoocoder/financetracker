import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';

import 'dashboard/dashboard_screen.dart';
import 'transactions/transactions_screen.dart';
import 'debts/debts_screen.dart';
import 'accounts/accounts_screen.dart';
import 'more/more_screen.dart';
import '../utils/route_normalizer.dart';
import '../widgets/main_screen/main_bottom_nav_bar.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key, this.initialTab = kDashboardTab});

  final int initialTab;

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  late int _currentIndex;

  // Track which tabs have been visited — only build a screen on first visit.
  late final List<bool> _visited;

  /// Lets this shell ask the Dashboard to reveal and focus Quick Add when a
  /// `/dashboard?quick=1` deep link arrives.
  final GlobalKey<DashboardScreenState> _dashboardKey =
      GlobalKey<DashboardScreenState>();

  late final List<Widget> _screens = <Widget>[
    const MoreScreen(),
    const AccountsScreen(),
    const DebtsScreen(),
    const TransactionsScreen(),
    DashboardScreen(key: _dashboardKey),
  ];

  /// Last argument map applied, so a rebuild triggered by locale/theme/Provider
  /// changes cannot re-run a one-shot navigation (e.g. re-focusing Quick Add).
  Object? _handledArgs;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialTab.clamp(0, _screens.length - 1);
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
    if (identical(args, _handledArgs)) return;
    _handledArgs = args;
    if (args == null) return;
    _applyRouteArguments(args);
  }

  /// Handles `{'tab': 'spending', 'quickAdd': true}` style arguments produced by
  /// [normalizeRouteWithArgs] (and the legacy integer form).
  void _applyRouteArguments(Object args) {
    final wantsQuickAdd = routeArgsRequestQuickAdd(args);
    // Quick Add lives on the Dashboard, so an explicit request wins over a
    // conflicting `tab` (`/dashboard?quick=1&tab=spending`).
    final tab = wantsQuickAdd
        ? kDashboardTab
        : resolveMainTabIndex(args, fallback: widget.initialTab);
    setState(() {
      _currentIndex = tab;
      _visited[tab] = true;
    });
    if (!wantsQuickAdd) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _dashboardKey.currentState?.openQuickAdd();
    });
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
