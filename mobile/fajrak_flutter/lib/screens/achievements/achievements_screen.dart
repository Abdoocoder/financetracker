import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';

import '../../services/byok/byok_service.dart';
import '../../widgets/achievements/level_card.dart';
import '../../widgets/achievements/badge_grid.dart';

class AchievementsScreen extends StatefulWidget {
  const AchievementsScreen({super.key});
  @override
  State<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends State<AchievementsScreen> {
  bool _loading = true;
  int _points = 0;
  int _level = 1;
  String _levelTitle = 'مبتدئ';
  int _nextLevel = 50;
  List<String> _badges = [];

  final _badgeInfo = {
    'first_tx': (Icons.bolt, 'الخطوة الأولى', '10 نقاط'),
    'streak_3': (Icons.local_fire_department, '3 أيام متواصلة', '20 نقطة'),
    'streak_7': (Icons.fitness_center, 'أسبوع كامل', '50 نقطة'),
    'streak_30': (Icons.emoji_events, 'شهر بدون توقف', '200 نقطة'),
    'tx_50': (Icons.edit_note, 'مسجّل نشيط', '30 نقطة'),
    'tx_100': (Icons.bar_chart, 'محترف التتبع', '75 نقطة'),
    'saver_10': (Icons.account_balance_wallet, 'مدخر مبتدئ', '25 نقطة'),
    'saver_20': (Icons.diamond, 'مدخر ذكي', '75 نقطة'),
    'saver_30': (Icons.workspace_premium, 'مدخر محترف', '150 نقطة'),
    'debt_paid': (Icons.celebration, 'محارب الديون', '100 نقطة'),
    'debt_free': (Icons.flight_takeoff, 'حر من الديون', '500 نقطة'),
    'investor': (Icons.show_chart, 'مستثمر مبتدئ', '100 نقطة'),
    'inv_profit': (Icons.rocket_launch, 'استثمار رابح', '150 نقطة'),
    'emergency': (Icons.shield, 'صندوق الطوارئ', '200 نقطة'),
    'net_positive': (Icons.trending_up, 'صافي إيجابي', '50 نقطة'),
    'lesson_3': (Icons.menu_book, '3 دروس متواصلة', '15 نقطة'),
    'lesson_7': (Icons.school, 'أسبوع تعلم', '40 نقطة'),
    'lesson_30': (Icons.psychology, 'شهر من التعلم', '150 نقطة'),
  };

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Achievements');
    _load();
  }

  Future<void> _load() async {
    final auth = Supabase.instance.client.auth;
    final user = auth.currentUser;
    if (user == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }

    int points = 0;
    List<String> badges = [];
    int level = 1;
    String levelTitle = 'مبتدئ';
    int nextLevel = 50;

    try {
      // 1) Try the real gamification API (POST triggers a recompute).
      final base = ByokService.defaultProxyBaseUrl()
          .replaceAll(RegExp(r'/+$'), '');
      final token = auth.currentSession?.accessToken;
      final resp = await http
          .post(
            Uri.parse('$base/api/gamification'),
            headers: {
              'Content-Type': 'application/json',
              if (token != null) 'Authorization': 'Bearer $token',
            },
            body: jsonEncode({'user_id': user.id}),
          )
          .timeout(const Duration(seconds: 10));

      if (resp.statusCode == 200) {
        final json = jsonDecode(resp.body) as Map<String, dynamic>;
        points = (json['points'] as num?)?.toInt() ?? 0;
        badges = (json['badges'] as List?)?.cast<String>() ?? [];
        final lvl = json['level'] as Map<String, dynamic>?;
        if (lvl != null) {
          level = (lvl['level'] as num?)?.toInt() ?? 1;
          levelTitle = (lvl['title_ar'] ?? lvl['title_en'] ?? 'مبتدئ') as String;
          nextLevel = (lvl['next'] as num?)?.toInt() ?? 50;
        }
        if (mounted) {
          setState(() {
            _points = points;
            _badges = badges;
            _level = level;
            _levelTitle = levelTitle;
            _nextLevel = nextLevel;
            _loading = false;
          });
        }
        return;
      }
      // else: fall through to the user_stats fallback below.
    } catch (_) {
      // Network/parse failure — fall through to fallback.
    }

    // 2) Fallback: read user_stats directly + compute level locally.
    try {
      final stats = await Supabase.instance.client
          .from('user_stats')
          .select('total_points, badges')
          .eq('id', user.id)
          .maybeSingle();

      if (stats != null && mounted) {
        points = (stats['total_points'] as num?)?.toInt() ?? 0;
        badges = (stats['badges'] as List?)?.cast<String>() ?? [];

        // Keep the existing local level ladder (50/150/350/700/1200).
        if (points >= 1200) {
          level = 6;
          levelTitle = 'حر مالياً';
          nextLevel = 9999;
        } else if (points >= 700) {
          level = 5;
          levelTitle = 'ثري مبتدئ';
          nextLevel = 1200;
        } else if (points >= 350) {
          level = 4;
          levelTitle = 'مستثمر';
          nextLevel = 700;
        } else if (points >= 150) {
          level = 3;
          levelTitle = 'مدخر';
          nextLevel = 350;
        } else if (points >= 50) {
          level = 2;
          levelTitle = 'متتبع';
          nextLevel = 150;
        }

        setState(() {
          _points = points;
          _badges = badges;
          _level = level;
          _levelTitle = levelTitle;
          _nextLevel = nextLevel;
        });
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.handle(e,
            context: context,
            developerMessage: 'Achievements Load');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    if (_loading) {
      return Scaffold(
          backgroundColor: theme.scaffoldBackgroundColor,
          body: Center(child: CircularProgressIndicator(color: colorScheme.primary)));
    }

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        title: const Text('الإنجازات',
            style: TextStyle(fontWeight: FontWeight.w900)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          LevelCard(
            level: _level,
            levelTitle: _levelTitle,
            points: _points,
            nextLevel: _nextLevel,
            colorScheme: colorScheme,
          ),
          const SizedBox(height: 20),
          BadgeGrid(
            earnedBadges: _badges,
            badgeInfo: _badgeInfo,
            colorScheme: colorScheme,
          ),
        ]),
      ),
    );
  }
}
