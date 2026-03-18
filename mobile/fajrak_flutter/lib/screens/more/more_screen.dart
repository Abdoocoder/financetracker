import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../alerts/alerts_screen.dart';
import '../investments/investments_screen.dart';
import '../goals/goals_screen.dart';
import '../settings/settings_screen.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('المزيد')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _menuItem(context, Icons.notifications_outlined, 'التنبيهات', const Color(0xFF3B7EF6), () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AlertsScreen()))),
          _menuItem(context, Icons.trending_up, 'الاستثمارات', const Color(0xFF10B981), () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InvestmentsScreen()))),
          _menuItem(context, Icons.flag_outlined, 'الأهداف', const Color(0xFF8B5CF6), () => Navigator.push(context, MaterialPageRoute(builder: (_) => const GoalsScreen()))),
          const Divider(color: Color(0xFF1E293B), height: 32),
          _menuItem(context, Icons.settings_outlined, 'الإعدادات', const Color(0xFF94A3B8), () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()))),
          _menuItem(context, Icons.logout, 'تسجيل الخروج', const Color(0xFFEF4444), () async {
            await Supabase.instance.client.auth.signOut();
            if (context.mounted) Navigator.pushReplacementNamed(context, '/login');
          }),
        ],
      ),
    );
  }

  Widget _menuItem(BuildContext context, IconData icon, String title, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF0F1629),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF1E293B)),
        ),
        child: Row(
          children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 14),
            Text(title, style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontSize: 15, fontWeight: FontWeight.w600)),
            const Spacer(),
            const Icon(Icons.arrow_forward_ios, color: Color(0xFF94A3B8), size: 14),
          ],
        ),
      ),
    );
  }
}
