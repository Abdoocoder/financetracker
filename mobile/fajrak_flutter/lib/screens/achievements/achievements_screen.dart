import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AchievementsScreen extends StatefulWidget {
  const AchievementsScreen({super.key});
  @override
  State<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends State<AchievementsScreen> {
  bool _loading = true;
  int _points = 0;
  int _level = 1;
  String _levelTitle = '🌱 مبتدئ';
  int _nextLevel = 50;
  List<String> _badges = [];

  final _badgeInfo = {
    'first_tx': ('⚡', 'الخطوة الأولى', '10 نقاط'),
    'streak_3': ('🔥', '3 أيام متواصلة', '20 نقطة'),
    'streak_7': ('💪', 'أسبوع كامل', '50 نقطة'),
    'streak_30': ('🏆', 'شهر بدون توقف', '200 نقطة'),
    'tx_50': ('📝', 'مسجّل نشيط', '30 نقطة'),
    'tx_100': ('📊', 'محترف التتبع', '75 نقطة'),
    'saver_10': ('💰', 'مدخر مبتدئ', '25 نقطة'),
    'saver_20': ('💎', 'مدخر ذكي', '75 نقطة'),
    'saver_30': ('👑', 'مدخر محترف', '150 نقطة'),
    'debt_paid': ('🎉', 'محارب الديون', '100 نقطة'),
    'debt_free': ('🦅', 'حر من الديون', '500 نقطة'),
    'investor': ('📈', 'مستثمر مبتدئ', '100 نقطة'),
    'inv_profit': ('🚀', 'استثمار رابح', '150 نقطة'),
    'emergency': ('🛡️', 'صندوق الطوارئ', '200 نقطة'),
    'net_positive': ('✨', 'صافي إيجابي', '50 نقطة'),
    'lesson_3': ('📖', '3 دروس متواصلة', '15 نقطة'),
    'lesson_7': ('🎓', 'أسبوع تعلم', '40 نقطة'),
    'lesson_30': ('🧠', 'شهر من التعلم', '150 نقطة'),
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    // استدعاء API الإنجازات
    try {
      final res = await Supabase.instance.client.functions.invoke(
        'gamification',
        body: {'user_id': user.id},
      );
      // إذا ما يشتغل الـ function، نجلب من user_stats مباشرة
    } catch (_) {}

    final stats = await Supabase.instance.client
        .from('user_stats')
        .select('points, badges')
        .eq('id', user.id)
        .maybeSingle();

    if (stats != null && mounted) {
      final points = (stats['points'] as num?)?.toInt() ?? 0;
      final badges = (stats['badges'] as List?)?.cast<String>() ?? [];

      String levelTitle = '🌱 مبتدئ';
      int level = 1;
      int nextLevel = 50;
      if (points >= 1200) {
        level = 6;
        levelTitle = '👑 حر مالياً';
        nextLevel = 9999;
      } else if (points >= 700) {
        level = 5;
        levelTitle = '💎 ثري مبتدئ';
        nextLevel = 1200;
      } else if (points >= 350) {
        level = 4;
        levelTitle = '📈 مستثمر';
        nextLevel = 700;
      } else if (points >= 150) {
        level = 3;
        levelTitle = '💪 مدخر';
        nextLevel = 350;
      } else if (points >= 50) {
        level = 2;
        levelTitle = '🔥 متتبع';
        nextLevel = 150;
      }

      setState(() {
        _points = points;
        _badges = badges;
        _level = level;
        _levelTitle = levelTitle;
        _nextLevel = nextLevel;
        _loading = false;
      });
    } else {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading)
      return const Scaffold(
          backgroundColor: Color(0xFF070B14),
          body: Center(
              child: CircularProgressIndicator(color: Color(0xFF3B7EF6))));

    final progress = _nextLevel < 9999 ? _points / _nextLevel : 1.0;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF070B14),
        title: const Text('الإنجازات',
            style: TextStyle(
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w900,
                color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Level Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                  colors: [Color(0xFF1E1B4B), Color(0xFF0F1629)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: const Color(0xFF3B7EF6).withValues(alpha: 0.3)),
            ),
            child: Column(children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(_levelTitle,
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 22,
                          fontFamily: 'Cairo')),
                  Text('المستوى $_level',
                      style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontFamily: 'Cairo',
                          fontSize: 13)),
                ]),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                      color: const Color(0xFF3B7EF6).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF3B7EF6))),
                  child: Text('$_points نقطة',
                      style: const TextStyle(
                          color: Color(0xFF3B7EF6),
                          fontWeight: FontWeight.w900,
                          fontFamily: 'Cairo')),
                ),
              ]),
              const SizedBox(height: 16),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress.clamp(0.0, 1.0),
                  backgroundColor: const Color(0xFF1E293B),
                  valueColor: const AlwaysStoppedAnimation(Color(0xFF3B7EF6)),
                  minHeight: 8,
                ),
              ),
              const SizedBox(height: 8),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text('$_points نقطة',
                    style: const TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 11,
                        fontFamily: 'Cairo')),
                if (_nextLevel < 9999)
                  Text('$_nextLevel للمستوى التالي',
                      style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 11,
                          fontFamily: 'Cairo')),
              ]),
            ]),
          ),
          const SizedBox(height: 20),

          // Badges
          Align(
              alignment: Alignment.centerRight,
              child: Text('الشارات (${_badges.length}/${_badgeInfo.length})',
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                      fontFamily: 'Cairo'))),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 0.9),
            itemCount: _badgeInfo.length,
            itemBuilder: (_, i) {
              final key = _badgeInfo.keys.elementAt(i);
              final info = _badgeInfo[key]!;
              final earned = _badges.contains(key);
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: earned
                      ? const Color(0xFF3B7EF6).withValues(alpha: 0.1)
                      : const Color(0xFF0F1629),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: earned
                          ? const Color(0xFF3B7EF6).withValues(alpha: 0.4)
                          : const Color(0xFF1E293B)),
                ),
                child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(info.$1,
                          style: TextStyle(
                              fontSize: 28,
                              color: earned
                                  ? null
                                  : const Color(0xFF334155)
                                      .withValues(alpha: 0.5))),
                      const SizedBox(height: 6),
                      Text(info.$2,
                          style: TextStyle(
                              color: earned
                                  ? Colors.white
                                  : const Color(0xFF334155),
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'Cairo'),
                          textAlign: TextAlign.center,
                          maxLines: 2),
                      Text(info.$3,
                          style: const TextStyle(
                              color: Color(0xFF64748B),
                              fontSize: 9,
                              fontFamily: 'Cairo')),
                    ]),
              );
            },
          ),
        ]),
      ),
    );
  }
}
