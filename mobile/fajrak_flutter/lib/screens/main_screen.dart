import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dashboard/dashboard_screen.dart';
import 'transactions/transactions_screen.dart';
import 'debts/debts_screen.dart';
import 'budgets/budgets_screen.dart';
import 'more/more_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 4; // الرئيسية
  int _unreadAlerts = 0;

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
    _loadUnreadCount();
  }

  Future<void> _loadUnreadCount() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final res = await Supabase.instance.client
        .from('alerts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .count();
    if (mounted) setState(() => _unreadAlerts = res.count);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Color(0xFF0A0F1E),
          border: Border(top: BorderSide(color: Color(0xFF1E293B))),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _navItem(0, Icons.more_horiz, 'المزيد'),
                _navItem(1, Icons.pie_chart_outline, 'الميزانية'),
                _navItem(2, Icons.credit_card_outlined, 'الديون'),
                _navItem(3, Icons.swap_vert, 'المعاملات'),
                _navItem(4, Icons.dashboard_outlined, 'الرئيسية',
                    badge: _unreadAlerts),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navItem(int index, IconData icon, String label, {int badge = 0}) {
    final isSelected = _currentIndex == index;
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
                      ? const Color(0xFF3B7EF6).withValues(alpha: 0.15)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isSelected ? _filledIcon(icon) : icon,
                  color: isSelected
                      ? const Color(0xFF3B7EF6)
                      : const Color(0xFF64748B),
                  size: 24,
                ),
              ),
              if (badge > 0)
                Positioned(
                  top: 0,
                  right: 0,
                  child: Container(
                    width: 16,
                    height: 16,
                    decoration: const BoxDecoration(
                        color: Color(0xFFEF4444), shape: BoxShape.circle),
                    child: Center(
                        child: Text('$badge',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w900))),
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
                    ? const Color(0xFF3B7EF6)
                    : const Color(0xFF64748B),
              )),
          if (isSelected)
            Container(
              margin: const EdgeInsets.only(top: 3),
              width: 20,
              height: 3,
              decoration: BoxDecoration(
                color: const Color(0xFF3B7EF6),
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
