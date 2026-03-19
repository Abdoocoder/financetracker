import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../alerts/alerts_screen.dart';
import '../investments/investments_screen.dart';
import '../goals/goals_screen.dart';
import '../settings/settings_screen.dart';
import '../learn/learn_screen.dart';
import '../achievements/achievements_screen.dart';

class MoreScreen extends StatefulWidget {
  const MoreScreen({super.key});
  @override
  State<MoreScreen> createState() => _MoreScreenState();
}

class _MoreScreenState extends State<MoreScreen> {
  int _unreadAlerts = 0;
  int _streak = 0;
  int _points = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    final results = await Future.wait([
      Supabase.instance.client.from('alerts').select('id').eq('user_id', user.id).eq('is_read', false).count(),
      Supabase.instance.client.from('profiles').select('lesson_streak').eq('id', user.id).single(),
      Supabase.instance.client.from('user_stats').select('points').eq('id', user.id).maybeSingle(),
    ]);

    final alertRes = results[0] as dynamic;
    final profile = results[1] as Map<String, dynamic>;
    final stats = results[2] as Map<String, dynamic>?;

    if (mounted) setState(() {
      _unreadAlerts = alertRes.count ?? 0;
      _streak = (profile['lesson_streak'] as num?)?.toInt() ?? 0;
      _points = (stats?['points'] as num?)?.toInt() ?? 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          color: const Color(0xFF3B7EF6),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                const Text('المزيد', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
                const SizedBox(height: 16),

                // Stats Row
                Row(children: [
                  Expanded(child: _statCard('🔥', '$_streak يوم', 'السلسلة', const Color(0xFFF59E0B))),
                  const SizedBox(width: 10),
                  Expanded(child: _statCard('⭐', '$_points', 'النقاط', const Color(0xFF3B7EF6))),
                  const SizedBox(width: 10),
                  Expanded(child: _statCard('🔔', '$_unreadAlerts', 'تنبيهات', const Color(0xFFEF4444))),
                ]),
                const SizedBox(height: 20),

                // الرئيسية
                _sectionTitle('الرئيسية'),
                _menuItem(context, '🔔', 'التنبيهات', 'تنبيهاتك الذكية', const Color(0xFF3B7EF6),
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AlertsScreen())).then((_) => _load()),
                  badge: _unreadAlerts),
                _menuItem(context, '📚', 'درس اليوم', 'تعلم خطوة كل يوم', const Color(0xFF8B5CF6),
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LearnScreen())).then((_) => _load())),
                _menuItem(context, '🏆', 'الإنجازات', 'نقاطك وشاراتك', const Color(0xFFF59E0B),
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AchievementsScreen())).then((_) => _load())),
                const SizedBox(height: 12),

                // المالية
                _sectionTitle('المالية'),
                _menuItem(context, '📈', 'الاستثمارات', 'محفظتك الاستثمارية', const Color(0xFF10B981),
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InvestmentsScreen()))),
                _menuItem(context, '🎯', 'الأهداف', 'أهداف الادخار', const Color(0xFF8B5CF6),
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const GoalsScreen()))),
                const SizedBox(height: 12),

                // الحساب
                _sectionTitle('الحساب'),
                _menuItem(context, '⚙️', 'الإعدادات', 'إعدادات التطبيق', const Color(0xFF94A3B8),
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()))),
                _menuItem(context, '🚪', 'تسجيل الخروج', '', const Color(0xFFEF4444), () async {
                  await Supabase.instance.client.auth.signOut();
                  if (context.mounted) Navigator.pushReplacementNamed(context, '/login');
                }),
                const SizedBox(height: 20),

                // Footer
                const Center(child: Text('فجرك 🌅 v3.4.0', style: TextStyle(color: Color(0xFF334155), fontSize: 12, fontFamily: 'Cairo'))),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _statCard(String icon, String value, String label, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Text(icon, style: const TextStyle(fontSize: 20)),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 14, fontFamily: 'Cairo')),
        Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo')),
      ]),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(title, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w700, fontFamily: 'Cairo', letterSpacing: 1)),
    );
  }

  Widget _menuItem(BuildContext context, String icon, String title, String subtitle, Color color, VoidCallback onTap, {int badge = 0}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF0F1629),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF1E293B)),
        ),
        child: Row(children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(11)),
            child: Center(child: Text(icon, style: const TextStyle(fontSize: 20))),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.w700)),
            if (subtitle.isNotEmpty) Text(subtitle, style: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo', fontSize: 11)),
          ])),
          if (badge > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: const Color(0xFFEF4444), borderRadius: BorderRadius.circular(10)),
              child: Text('$badge', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900)),
            )
          else
            const Icon(Icons.arrow_forward_ios, color: Color(0xFF334155), size: 14),
        ]),
      ),
    );
  }
}
