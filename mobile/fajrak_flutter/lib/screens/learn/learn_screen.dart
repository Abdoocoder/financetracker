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
    'awareness': ('🌱', 'مرحلة الوعي', const Color(0xFF8B5CF6)),
    'debt': ('💳', 'مرحلة سداد الديون', const Color(0xFFEF4444)),
    'emergency': ('🛡️', 'مرحلة الطوارئ', const Color(0xFFF59E0B)),
    'investing': ('📈', 'مرحلة الاستثمار', const Color(0xFF10B981)),
    'wealth': ('👑', 'مرحلة الثروة', const Color(0xFF3B7EF6)),
  };

  final _lessons = {
    'awareness': [
      {
        'title': '🌱 رحلة الثروة تبدأ بتسجيل أول معاملة',
        'body':
            'تتبع المصاريف يقلل الإنفاق غير الواعي بنسبة 20%. سجّل مصاريف اليوم الآن.'
      },
      {
        'title': '💡 ما لا يُقاس لا يُحسَّن',
        'body': 'الوعي المالي هو أول خطوات الثروة. أضف دخلك ومصاريفك هذا الشهر.'
      },
      {
        'title': '🧠 تأثير اللاتة',
        'body':
            'إنفاق 5 دنانير يومياً = 1,825 دينار سنوياً. المصاريف الصغيرة المتكررة هي أكبر عدو للثروة.'
      },
      {
        'title': '📊 قاعدة 50/30/20',
        'body':
            '50% للضروريات، 30% للرغبات، 20% للادخار. هذه النسب أثبتت نجاحها علمياً.'
      },
      {
        'title': '🎯 هدف مكتوب يرفع احتمال التحقق 42%',
        'body':
            'كتابة الأهداف المالية ترفع احتمال تحقيقها. ما هدفك المالي لهذا العام؟'
      },
    ],
    'debt': [
      {
        'title': '🎯 استراتيجية كرة الثلج',
        'body': 'ابدأ بأصغر دين للحصول على دافع نفسي فوري. كل دين تسدده انتصار!'
      },
      {
        'title': '💰 تكلفة الدين الخفية',
        'body':
            'دين 10,000 دينار بفائدة 20% = 23,000 دينار إجمالاً إذا دفعت الحد الأدنى فقط!'
      },
      {
        'title': '⚖️ نفس المؤمن معلقة بدينه',
        'body':
            'قال ﷺ: "نفس المؤمن معلقة بدينه حتى يُقضى عنه". من يسعى لسداد دينه بنية صادقة يُعينه الله.'
      },
      {
        'title': '🤲 دعاء الهم والدين',
        'body':
            '"اللهم إني أعوذ بك من الهم والحَزَن، والعجز والكسل، والجبن والبخل، وغلبة الدين وقهر الرجال". رواه البخاري.'
      },
      {
        'title': '💚 من أراد الأداء أدى الله عنه',
        'body':
            'قال ﷺ: "من أخذ أموال الناس يريد أداءها أدى الله عنه". النية الصادقة تستجلب عون الله.'
      },
    ],
    'emergency': [
      {
        'title': '🛡️ 65% لا يملكون 500 دولار',
        'body': 'صندوق الطوارئ ليس رفاهية — هو الفارق بين أزمة وكارثة.'
      },
      {
        'title': '🎯 3-6 أشهر من المصاريف',
        'body':
            'اجمع مصاريفك الضرورية الشهرية × 3 إذا كنت موظفاً، × 6 إذا كنت حراً.'
      },
      {
        'title': '💡 استراتيجية الـ 1%',
        'body':
            'ابدأ بادخار 1% من الراتب وارفعها 1% كل شهر. التغيير التدريجي أكثر فاعلية.'
      },
      {
        'title': '🛡️ حكمة يوسف عليه السلام',
        'body':
            '"تَزْرَعُونَ سَبْعَ سِنِينَ دَأَبًا فَمَا حَصَدتُّمْ فَذَرُوهُ فِي سُنبُلِهِ" (يوسف:47).'
      },
    ],
    'investing': [
      {
        'title': '📈 قاعدة 72',
        'body':
            '72 ÷ معدل العائد = سنوات المضاعفة. عائد 8%: أموالك تتضاعف كل 9 سنوات.'
      },
      {
        'title': '🕌 الاستثمار الحلال فرصة',
        'body':
            'مؤشر DJIM الإسلامي تفوق على S&P 500 في 7 من آخر 10 سنوات. SPUS خيار ممتاز.'
      },
      {
        'title': '🌍 التنويع وجبة مجانية',
        'body':
            'هاري ماركويتز: "التنويع هو الوجبة المجانية الوحيدة في الاستثمار".'
      },
      {
        'title': '🚫 إن الله طيب لا يقبل إلا طيباً',
        'body':
            'المال الحرام لا تُقبل معه صدقة ولا دعاء. احرص على مصادر دخل حلال.'
      },
      {
        'title': '📅 Dollar Cost Averaging',
        'body':
            'استثمر مبلغاً ثابتاً كل شهر بغض النظر عن السعر. الاستمرارية تتفوق على الذكاء.'
      },
    ],
    'wealth': [
      {
        'title': '👑 الثروة الحقيقية هي الحرية',
        'body':
            '"الثروة الحقيقية هي القدرة على الاستيقاظ صباح الاثنين وأن تقرر أنت ماذا تفعل."'
      },
      {
        'title': '🌅 اليد العليا خير من اليد السفلى',
        'body':
            'قال ﷺ: "اليد العليا خير من اليد السفلى". هدفك من بناء ثروتك أن تكون دائماً صاحب اليد العليا.'
      },
      {
        'title': '🤝 الصدقة لا تنقص المال',
        'body': 'قال ﷺ: "ما نقص مال من صدقة". الصدقة تبارك المال ولا تنقصه.'
      },
      {
        'title': '🏗️ بناء مصادر دخل متعددة',
        'body':
            'دراسة IRS: متوسط المليونيرين 7 مصادر دخل. ابدأ بمصدر ثانٍ بسيط.'
      },
      {
        'title': '🎓 رأس المال البشري',
        'body':
            'استثمار 1,000 دولار في مهارة مهنية يعود بـ 10x. استثمارك في نفسك هو الأضمن.'
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

    final now = DateTime.now();
    final today = now.toIso8601String().split('T')[0];

    final results = await Future.wait<dynamic>([
      Supabase.instance.client
          .from('profiles')
          .select('lesson_streak, last_lesson_date, monthly_income')
          .eq('id', user.id)
          .single(),
      Supabase.instance.client
          .from('debts')
          .select('remaining_amount, monthly_payment')
          .eq('user_id', user.id)
          .eq('is_paid', false),
      Supabase.instance.client
          .from('investments')
          .select('id')
          .eq('user_id', user.id)
          .count(),
    ]);

    final profile = results[0] as Map<String, dynamic>;
    final debts = results[1] as List;
    final invRes = results[2] as dynamic;

    final income = (profile['monthly_income'] as num?)?.toDouble() ?? 0;
    final totalDebt = debts.fold(
        0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());
    final totalMonthly = debts.fold(
        0.0, (a, d) => a + (d['monthly_payment'] as num? ?? 0).toDouble());
    final hasInvestments = (invRes.count ?? 0) > 0;

    String stage = 'awareness';
    if (totalDebt > 0 && income > 0 && totalMonthly / income > 0.3) {
      stage = 'debt';
    } else if (totalDebt == 0 && !hasInvestments)
      stage = 'emergency';
    else if (hasInvestments) stage = 'investing';

    final dayOfMonth = now.day;
    final lessons = _lessons[stage] ?? _lessons['awareness']!;
    final lesson = lessons[(dayOfMonth - 1) % lessons.length];

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
                    Text('$newStreak يوم متواصل!',
                        style: const TextStyle(
                            color: Color(0xFFF59E0B),
                            fontWeight: FontWeight.w900,
                            fontSize: 22,
                            fontFamily: 'Cairo')),
                    const SizedBox(height: 8),
                    const Text('مبروك! الاستمرارية هي سر النجاح 💪',
                        style: TextStyle(
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
                      child: const Text('🎯 واصل!',
                          style: TextStyle(
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
        title: const Text('درس اليوم',
            style: TextStyle(
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
                  Text('مرحلتك',
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
                const Text('يوم',
                    style: TextStyle(
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
                      child: const Text('✅ أتممت الدرس',
                          style: TextStyle(
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
                  child: const Center(
                      child: Text('✅ مكتمل — أحسنت!',
                          style: TextStyle(
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
            child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('💡 هل تعلم؟',
                      style: TextStyle(
                          color: Color(0xFF3B7EF6),
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          fontFamily: 'Cairo')),
                  SizedBox(height: 6),
                  Text(
                      'الدروس تتغير يومياً وتُخصَّص لمرحلتك المالية. كل 7 أيام درس إسلامي مرتبط بالرزق.',
                      style: TextStyle(
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
