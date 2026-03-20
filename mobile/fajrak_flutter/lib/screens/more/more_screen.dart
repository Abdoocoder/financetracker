import 'package:flutter/material.dart';
import '../debts/debts_screen.dart';
import '../budgets/budgets_screen.dart';
import '../goals/goals_screen.dart';
import '../investments/investments_screen.dart';
import '../learn/learn_screen.dart';
import '../alerts/alerts_screen.dart';
import '../settings/settings_screen.dart';
import '../help/help_screen.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(top: 24, left: 16, right: 16, bottom: 40),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0F1629),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Column(
              children: [
                // Top handle (like a bottom sheet)
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 24),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),

                // Menu items matching the screenshot
                _menuItem(context, Icons.credit_card_outlined, 'الديون', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DebtsScreen()))),
                _menuItem(context, Icons.pie_chart_outline, 'الميزانية', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BudgetsScreen()))),
                _menuItem(context, Icons.track_changes, 'الأهداف', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const GoalsScreen()))),
                _menuItem(context, Icons.trending_up, 'الاستثمارات', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InvestmentsScreen()))),
                _menuItem(context, Icons.menu_book_outlined, 'التعلم', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LearnScreen()))),
                _menuItem(context, Icons.notifications_none, 'الإشعارات', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AlertsScreen()))),
                _menuItem(context, Icons.settings_outlined, 'الإعدادات', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()))),
                _menuItem(context, Icons.help_outline, 'المساعدة', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpScreen()))),
                
                const SizedBox(height: 16),

                // Language toggle button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E293B),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.language, color: Color(0xFF3B7EF6), size: 20),
                        SizedBox(width: 8),
                        Text('English', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 15, color: Color(0xFF93C5FD))),
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

  Widget _menuItem(BuildContext context, IconData icon, String title, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: const Color(0xFF070B14).withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF1E293B)),
        ),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFF94A3B8), size: 22),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontFamily: 'Cairo',
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const Icon(Icons.arrow_back_ios_new, color: Color(0xFF334155), size: 14),
          ],
        ),
      ),
    );
  }
}
