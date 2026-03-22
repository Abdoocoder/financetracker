import 'package:easy_localization/easy_localization.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../widgets/learn/financial_roadmap.dart';

class LearnScreen extends StatefulWidget {
  const LearnScreen({super.key});
  @override
  State<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends State<LearnScreen> {
  bool _loading = true;
  bool _completed = false;
  int _streak = 0;
  String _stage = 'awareness';
  Map<String, String> _lesson = {'title': '', 'body': '', 'url': ''};

  final _stageInfo = {
    'awareness': ('🌱', 'learn_stage_awareness'.tr(), const Color(0xFF8B5CF6)),
    'debt': ('💳', 'learn_stage_debt'.tr(), const Color(0xFFEF4444)),
    'emergency': ('🛡️', 'learn_stage_emergency'.tr(), const Color(0xFFF59E0B)),
    'investing': ('📈', 'learn_stage_investing'.tr(), const Color(0xFF10B981)),
    'wealth': ('👑', 'learn_stage_wealth'.tr(), const Color(0xFF3B7EF6)),
  };

  final _lessons = {
    'awareness': [
      {
        'title': 'learn_lesson_awareness_0_title',
        'body': 'learn_lesson_awareness_0_body',
        'url':
            'https://www.youtube.com/results?search_query=financial+awareness+tracking'
      },
      {
        'title': 'learn_lesson_awareness_1_title',
        'body': 'learn_lesson_awareness_1_body'
      },
      {
        'title': 'learn_lesson_awareness_2_title',
        'body': 'learn_lesson_awareness_2_body'
      },
      {
        'title': 'learn_lesson_awareness_3_title',
        'body': 'learn_lesson_awareness_3_body'
      },
      {
        'title': 'learn_lesson_awareness_4_title',
        'body': 'learn_lesson_awareness_4_body'
      },
    ],
    'debt': [
      {
        'title': 'learn_lesson_debt_0_title',
        'body': 'learn_lesson_debt_0_body'
      },
      {
        'title': 'learn_lesson_debt_1_title',
        'body': 'learn_lesson_debt_1_body'
      },
      {
        'title': 'learn_lesson_debt_2_title',
        'body': 'learn_lesson_debt_2_body'
      },
      {
        'title': 'learn_lesson_debt_3_title',
        'body': 'learn_lesson_debt_3_body'
      },
      {
        'title': 'learn_lesson_debt_4_title',
        'body': 'learn_lesson_debt_4_body'
      },
    ],
    'emergency': [
      {
        'title': 'learn_lesson_emergency_0_title',
        'body': 'learn_lesson_emergency_0_body'
      },
      {
        'title': 'learn_lesson_emergency_1_title',
        'body': 'learn_lesson_emergency_1_body'
      },
      {
        'title': 'learn_lesson_emergency_2_title',
        'body': 'learn_lesson_emergency_2_body'
      },
      {
        'title': 'learn_lesson_emergency_3_title',
        'body': 'learn_lesson_emergency_3_body'
      },
    ],
    'investing': [
      {
        'title': 'learn_lesson_investing_0_title',
        'body': 'learn_lesson_investing_0_body'
      },
      {
        'title': 'learn_lesson_investing_1_title',
        'body': 'learn_lesson_investing_1_body'
      },
      {
        'title': 'learn_lesson_investing_2_title',
        'body': 'learn_lesson_investing_2_body'
      },
      {
        'title': 'learn_lesson_investing_3_title',
        'body': 'learn_lesson_investing_3_body'
      },
      {
        'title': 'learn_lesson_investing_4_title',
        'body': 'learn_lesson_investing_4_body'
      },
    ],
    'wealth': [
      {
        'title': 'learn_lesson_wealth_0_title',
        'body': 'learn_lesson_wealth_0_body'
      },
      {
        'title': 'learn_lesson_wealth_1_title',
        'body': 'learn_lesson_wealth_1_body'
      },
      {
        'title': 'learn_lesson_wealth_2_title',
        'body': 'learn_lesson_wealth_2_body'
      },
      {
        'title': 'learn_lesson_wealth_3_title',
        'body': 'learn_lesson_wealth_3_body'
      },
      {
        'title': 'learn_lesson_wealth_4_title',
        'body': 'learn_lesson_wealth_4_body'
      },
    ],
  };

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Learn');
    _load();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    try {
      final now = DateTime.now();
      final today = now.toIso8601String().split('T')[0];

      final results = await Future.wait<dynamic>([
        Supabase.instance.client
            .from('profiles')
            .select('lesson_streak, last_lesson_date, monthly_income')
            .eq('id', user.id)
            .maybeSingle(),
        Supabase.instance.client
            .from('debts')
            .select('remaining_amount, monthly_payment')
            .eq('user_id', user.id)
            .eq('is_paid', false),
        Supabase.instance.client
            .from('investments')
            .select('id', const FetchOptions(count: CountOption.exact))
            .eq('user_id', user.id)
            .limit(1),
      ]);

      final profile = (results[0] as Map<String, dynamic>?) ?? {};
      final debts = (results[1] as List?) ?? [];
      final invRes = results[2] as PostgrestResponse;

      final income = (profile['monthly_income'] as num?)?.toDouble() ?? 0;
      final totalDebt = debts.fold(
          0.0, (a, d) => a + ((d['remaining_amount'] as num?)?.toDouble() ?? 0));
      final totalMonthly = debts.fold(
          0.0, (a, d) => a + ((d['monthly_payment'] as num?)?.toDouble() ?? 0));
      final hasInvestments = (invRes.count ?? 0) > 0;

      String stage = 'awareness';
      if (totalDebt > 0 && income > 0 && totalMonthly / income > 0.3) {
        stage = 'debt';
      } else if (totalDebt == 0 && !hasInvestments) {
        stage = 'emergency';
      } else if (hasInvestments) {
        stage = 'investing';
      }

      final lessons = _lessons[stage] ?? _lessons['awareness']!;
      final lessonRaw = lessons[(now.day - 1) % lessons.length];
      
      final Map<String, String> lesson = {
        'title': (lessonRaw['title'] ?? 'learn_title').tr(),
        'body': (lessonRaw['body'] ?? '').tr(),
        'url': lessonRaw['url'] ?? '',
      };

      final streak = (profile['lesson_streak'] as num?)?.toInt() ?? 0;
      final lastLesson = profile['last_lesson_date'] as String?;
      final completed = lastLesson == today;

      if (mounted) {
        setState(() {
          _stage = stage;
          _lesson = lesson;
          _streak = streak;
          _completed = completed;
          _loading = false;
        });
      }
    } catch (e, st) {
      if (mounted) {
        ErrorHandler.handle(e, st: st, context: context, developerMessage: 'Learn Load Failure');
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _markComplete() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    HapticFeedback.mediumImpact();

    final now = DateTime.now();
    final today = now.toIso8601String().split('T')[0];
    final yesterday = DateTime(now.year, now.month, now.day - 1)
        .toIso8601String()
        .split('T')[0];

    try {
      final profile = await Supabase.instance.client
          .from('profiles')
          .select('lesson_streak, last_lesson_date')
          .eq('id', user.id)
          .single();
      final lastLesson = profile['last_lesson_date'] as String?;
      final currentStreak = (profile['lesson_streak'] as num?)?.toInt() ?? 0;
      final newStreak = lastLesson == yesterday ? currentStreak + 1 : 1;

      await Supabase.instance.client.from('profiles').update({
        'lesson_streak': newStreak,
        'last_lesson_date': today,
      }).eq('id', user.id);

      setState(() {
        _completed = true;
        _streak = newStreak;
      });

      if (mounted && newStreak % 7 == 0) {
        showDialog(
            context: context,
            builder: (_) => AlertDialog(
                  backgroundColor: const Color(0xFF0F1629),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20)),
                  content: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Text('🔥', style: TextStyle(fontSize: 56)),
                    const SizedBox(height: 12),
                    Text('learn_streak_consecutive'.tr(args: [newStreak.toString()]),
                        style: const TextStyle(
                            color: Color(0xFFF59E0B),
                            fontWeight: FontWeight.w900,
                            fontSize: 22,
                            fontFamily: 'Cairo')),
                    const SizedBox(height: 8),
                    Text('learn_streak_congrats'.tr(),
                        style: const TextStyle(
                            color: Color(0xFF94A3B8), fontFamily: 'Cairo'),
                        textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF59E0B),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12))),
                      child: Text('learn_streak_continue'.tr(),
                          style: const TextStyle(
                              fontFamily: 'Cairo', fontWeight: FontWeight.w900)),
                    ),
                  ]),
                ));
      }
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'Learn MarkComplete');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
          backgroundColor: Color(0xFF070B14),
          body: Center(
              child: CircularProgressIndicator(color: Color(0xFF3B7EF6))));
    }

    final info = _stageInfo[_stage]!;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF070B14),
        title: Text('learn_title'.tr(),
            style: const TextStyle(
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w900,
                color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Roadmap
          FinancialRoadmap(currentStage: _stage),
          const SizedBox(height: 16),
          // Stage + Streak
          Row(children: [
            Expanded(
                child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                  color: info.$3.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: info.$3.withValues(alpha: 0.25))),
              child: Row(children: [
                Text(info.$1, style: const TextStyle(fontSize: 22)),
                const SizedBox(width: 10),
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('learn_stage_label'.tr(),
                      style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 10,
                          fontFamily: 'Cairo')),
                  Text(info.$2,
                      style: TextStyle(
                          color: info.$3,
                          fontWeight: FontWeight.w900,
                          fontSize: 13,
                          fontFamily: 'Cairo')),
                ]),
              ]),
            )),
            const SizedBox(width: 10),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.25))),
              child: Column(children: [
                const Text('🔥', style: TextStyle(fontSize: 22)),
                Text('$_streak',
                    style: const TextStyle(
                        color: Color(0xFFF59E0B),
                        fontWeight: FontWeight.w900,
                        fontSize: 18,
                        fontFamily: 'Cairo')),
                Text('learn_streak_day'.tr(),
                    style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 10,
                        fontFamily: 'Cairo')),
              ]),
            ),
          ]),
          const SizedBox(height: 16),

          // Lesson Card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF0F1629),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: info.$3.withValues(alpha: 0.2)),
              boxShadow: [
                BoxShadow(
                    color: info.$3.withValues(alpha: 0.05),
                    blurRadius: 20,
                    spreadRadius: 5)
              ],
            ),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(_lesson['title'] ?? '',
                  style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      fontFamily: 'Cairo',
                      height: 1.4)),
              const SizedBox(height: 16),
              Text(_lesson['body'] ?? '',
                  style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF94A3B8),
                      fontFamily: 'Cairo',
                      height: 1.7)),
              const SizedBox(height: 20),
              if (!_completed)
                SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _markComplete,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text('learn_complete_lesson'.tr(),
                          style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.w900,
                              fontSize: 15)),
                    ))
              else
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color:
                              const Color(0xFF10B981).withValues(alpha: 0.3))),
                  child: Center(
                      child: Text('learn_completed_msg'.tr(),
                          style: const TextStyle(
                              color: Color(0xFF10B981),
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.w900,
                              fontSize: 15))),
                ),
            ]),
          ),
          const SizedBox(height: 16),

          // Did you know
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
                color: const Color(0xFF3B7EF6).withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: const Color(0xFF3B7EF6).withValues(alpha: 0.15))),
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('learn_did_you_know'.tr(),
                      style: const TextStyle(
                          color: Color(0xFF3B7EF6),
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          fontFamily: 'Cairo')),
                  const SizedBox(height: 6),
                  Text('learn_did_you_know_msg'.tr(),
                      style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 12,
                          fontFamily: 'Cairo',
                          height: 1.6)),
                ]),
          ),
        ]),
      ),
    );
  }
}
