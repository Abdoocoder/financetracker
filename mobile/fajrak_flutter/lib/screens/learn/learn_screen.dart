import 'package:easy_localization/easy_localization.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';
import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../widgets/learn/financial_roadmap.dart';
import 'dart:ui' as ui;
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

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
  bool _sharing = false;

  final _stageInfo = {
    'awareness': (Icons.eco, 'learn_stage_awareness'.tr(), AppColors.purple),
    'debt': (Icons.credit_card, 'learn_stage_debt'.tr(), AppColors.error),
    'emergency': (Icons.shield, 'learn_stage_emergency'.tr(), AppColors.warning),
    'investing': (Icons.trending_up, 'learn_stage_investing'.tr(), AppColors.success),
    'wealth': (Icons.workspace_premium, 'learn_stage_wealth'.tr(), AppColors.primary),
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
            .select('id')
            .eq('user_id', user.id),
      ]);

      final profile = (results[0] as Map<String, dynamic>?) ?? {};
      final debts = (results[1] as List?) ?? [];
      final invList = (results[2] as List?) ?? [];

      final income = (profile['monthly_income'] as num?)?.toDouble() ?? 0;
      final totalDebt = debts.fold(
          0.0, (a, d) => a + ((d['remaining_amount'] as num?)?.toDouble() ?? 0));
      final totalMonthly = debts.fold(
          0.0, (a, d) => a + ((d['monthly_payment'] as num?)?.toDouble() ?? 0));
      final hasInvestments = invList.isNotEmpty;

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

      if (!mounted) return;
      final cs = Theme.of(context).colorScheme;
      if (newStreak % 7 == 0) {
        showDialog(
            context: context,
            builder: (_) => AlertDialog(
                  backgroundColor: AppColors.surface0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20)),
                  content: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.local_fire_department, size: 56, color: AppColors.warning),
                    const SizedBox(height: 12),
                    Text('learn_streak_consecutive'.tr(args: [newStreak.toString()]),
                        style: TextStyle(
                            color: cs.primary,
                            fontWeight: FontWeight.w900,
                            fontSize: 22)),
                    const SizedBox(height: 8),
                    Text('learn_streak_congrats'.tr(),
                        style: TextStyle(
                            color: cs.onSurfaceVariant),
                        textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: cs.primary,
                          foregroundColor: cs.onPrimary,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12))),
                      child: Text('learn_streak_continue'.tr(),
                          style: const TextStyle(
                              fontWeight: FontWeight.w900)),
                    ),
                  ]),
                ));
      }
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'Learn MarkComplete');
    }
  }

  Future<void> _shareLesson() async {
    if (_lesson['title']?.isEmpty ?? true) return;
    if (_sharing) return;

    setState(() => _sharing = true);
    HapticFeedback.lightImpact();

    try {
      const double W = 1080;
      const double H = 1350;

      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder, Rect.fromLTWH(0, 0, W, H));

      // 1. Background
      final Rect bgRect = Rect.fromLTWH(0, 0, W, H);
      final Paint bgPaint = Paint()
        ..shader = ui.Gradient.linear(
          const Offset(0, 0),
          const Offset(0, H),
          [const Color(0xFF0A1628), const Color(0xFF162440)],
        );
      canvas.drawRect(bgRect, bgPaint);

      // 2. Glow
      final Paint glowPaint = Paint()
        ..shader = ui.Gradient.radial(
          const Offset(W / 2, 160),
          400,
          [
            AppColors.warning.withValues(alpha: 0.12),
            AppColors.warning.withValues(alpha: 0)
          ],
        );
      canvas.drawRect(bgRect, glowPaint);

      // 3. Logo
      final ByteData data = await rootBundle.load('assets/images/app_icon.png');
      final ui.Codec codec = await ui.instantiateImageCodec(
          data.buffer.asUint8List(),
          targetWidth: 120,
          targetHeight: 120);
      final ui.FrameInfo fi = await codec.getNextFrame();
      final ui.Image logo = fi.image;

      const double logoSize = 120;
      const double logoX = (W - logoSize) / 2;
      const double logoY = 50;

      canvas.save();
      canvas.clipRRect(RRect.fromRectAndRadius(
          Rect.fromLTWH(logoX, logoY, logoSize, logoSize),
          const Radius.circular(24)));
      canvas.drawImage(logo, const Offset(logoX, logoY), Paint());
      canvas.restore();

      // 4. App Name (Fajrak)
      final titleParagraphStyle = ui.ParagraphStyle(
        textAlign: TextAlign.center,
        fontSize: 52,
        fontWeight: FontWeight.bold,
        textDirection: ui.TextDirection.rtl,
      );
      final titleBuilder = ui.ParagraphBuilder(titleParagraphStyle)
        ..pushStyle(ui.TextStyle(color: AppColors.warning))
        ..addText('فجرك');
      final titleParagraph = titleBuilder.build()
        ..layout(const ui.ParagraphConstraints(width: W));
      canvas.drawParagraph(titleParagraph, const Offset(0, 225));

      // 5. Separator Line
      final Paint linePaint = Paint()
        ..shader = ui.Gradient.linear(
          const Offset(80, 0),
          const Offset(W - 80, 0),
          [
            const Color(0x00F59E0B),
            const Color(0xCCF59E0B),
            const Color(0x00F59E0B)
          ],
          [0.0, 0.5, 1.0],
        )
        ..strokeWidth = 2
        ..style = PaintingStyle.stroke;
      canvas.drawLine(
          const Offset(80, 250), const Offset(W - 80, 250), linePaint);

      // 6. Lesson Title
      final lessonTitleStyle = ui.ParagraphStyle(
        textAlign: TextAlign.center,
        fontSize: 52,
        fontWeight: FontWeight.bold,
        textDirection: ui.TextDirection.rtl,
      );
      final lessonTitleBuilder = ui.ParagraphBuilder(lessonTitleStyle)
        ..pushStyle(ui.TextStyle(color: const Color(0xFFFFFFFF)))
        ..addText(_lesson['title'] ?? '');
      final lessonTitleParagraph = lessonTitleBuilder.build()
        ..layout(const ui.ParagraphConstraints(width: W - 160));
      canvas.drawParagraph(lessonTitleParagraph, const Offset(80, 310));

      final double titleHeight = lessonTitleParagraph.height;

      // 7. Lesson Body
      final lessonBodyStyle = ui.ParagraphStyle(
        textAlign: TextAlign.center,
        fontSize: 36,
        textDirection: ui.TextDirection.rtl,
      );
      final lessonBodyBuilder = ui.ParagraphBuilder(lessonBodyStyle)
        ..pushStyle(ui.TextStyle(color: AppColors.textMuted))
        ..addText(_lesson['body'] ?? '');
      final lessonBodyParagraph = lessonBodyBuilder.build()
        ..layout(const ui.ParagraphConstraints(width: W - 160));
      canvas.drawParagraph(
          lessonBodyParagraph, Offset(80, 310 + titleHeight + 20));

      // 8. Bottom Line
      canvas.drawLine(
          const Offset(80, H - 120), const Offset(W - 80, H - 120), linePaint);

      // 9. Bottom Link
      final linkStyle = ui.ParagraphStyle(
        textAlign: TextAlign.center,
        fontSize: 34,
      );
      final linkBuilder = ui.ParagraphBuilder(linkStyle)
        ..pushStyle(ui.TextStyle(color: AppColors.textSecondary))
        ..addText('fajrak.com');
      final linkParagraph = linkBuilder.build()
        ..layout(const ui.ParagraphConstraints(width: W));
      canvas.drawParagraph(linkParagraph, const Offset(0, H - 65));

      // Save to Image
      final ui.Image pic =
          await recorder.endRecording().toImage(W.toInt(), H.toInt());
      final ByteData? byteData =
          await pic.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) throw Exception('Failed to encode image');

      final Uint8List pngBytes = byteData.buffer.asUint8List();

      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/fajrak-lesson.png');
      await file.writeAsBytes(pngBytes);

      if (!mounted) return;
      final isAr = context.locale.languageCode == 'ar';
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path)],
          text: isAr ? 'درس اليوم من فجرك' : "Today's lesson from Fajrak",
        ),
      );
    } catch (e, st) {
      if (mounted) {
        ErrorHandler.handle(e,
            st: st, context: context, developerMessage: 'Share Lesson Failure');
      }
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final bgColor = theme.scaffoldBackgroundColor;

    if (_loading) {
      return Scaffold(
          backgroundColor: bgColor,
          body: Center(
              child: CircularProgressIndicator(color: cs.primary)));
    }

    final info = _stageInfo[_stage]!;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: Text('learn_title'.tr()),
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
                Icon(info.$1, size: 22, color: info.$3),
                const SizedBox(width: 10),
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('learn_stage_label'.tr(),
                      style: TextStyle(
                          color: cs.onSurfaceVariant.withValues(alpha: 0.7),
                          fontSize: 10)),
                  Text(info.$2,
                      style: TextStyle(
                          color: info.$3,
                          fontWeight: FontWeight.w900,
                          fontSize: 13)),
                ]),
              ]),
            )),
            const SizedBox(width: 10),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                  color: (_completed || _streak == 0)
                      ? AppColors.warning.withValues(alpha: 0.08)
                      : AppColors.textDisabled.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: (_completed || _streak == 0)
                          ? AppColors.warning.withValues(alpha: 0.25)
                          : AppColors.textDisabled.withValues(alpha: 0.25))),
              child: Column(children: [
                Icon((!_completed && _streak > 0) ? Icons.ac_unit : Icons.local_fire_department,
                    size: 22, color: (!_completed && _streak > 0) ? AppColors.textDisabled : AppColors.warning),
                Text('$_streak',
                    style: TextStyle(
                        color: (!_completed && _streak > 0)
                            ? AppColors.textDisabled
                            : cs.primary,
                        fontWeight: FontWeight.w900,
                        fontSize: 18)),
                Text('learn_streak_day'.tr(),
                    style: TextStyle(
                        color: cs.onSurfaceVariant.withValues(alpha: 0.7),
                        fontSize: 10)),
              ]),
            ),
          ]),
          const SizedBox(height: 16),

          // Lesson Card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: cs.surface,
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
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: cs.onSurface,
                      height: 1.4)),
              const SizedBox(height: 16),
              Text(_lesson['body'] ?? '',
                  style: TextStyle(
                      fontSize: 14,
                      color: cs.onSurfaceVariant,
                      height: 1.7)),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: !_completed
                        ? ElevatedButton(
                            onPressed: _markComplete,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.success,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12)),
                            ),
                            child: Text('learn_complete_lesson'.tr(),
                                style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 15)),
                          )
                        : Container(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                                color: AppColors.success
                                    .withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                    color: AppColors.success
                                        .withValues(alpha: 0.3))),
                            child: Center(
                                child: Text('learn_completed_msg'.tr(),
                                    style: const TextStyle(
                                        color: AppColors.success,
                                        fontWeight: FontWeight.w900,
                                        fontSize: 15))),
                          ),
                  ),
                  const SizedBox(width: 10),
                  InkWell(
                    onTap: _sharing ? null : _shareLesson,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 11),
                      decoration: BoxDecoration(
                        color: _sharing
                            ? AppColors.warning.withValues(alpha: 0.05)
                            : AppColors.warning.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: AppColors.warning
                                .withValues(alpha: 0.3)),
                      ),
                      child: _sharing
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.warning))
                          : const Icon(Icons.file_upload_outlined, size: 18, color: AppColors.warning),
                    ),
                  )
                ],
              ),
            ]),
          ),
          const SizedBox(height: 16),

          // Did you know
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
                color: cs.primary.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: cs.primary.withValues(alpha: 0.15))),
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('learn_did_you_know'.tr(),
                      style: TextStyle(
                          color: cs.primary,
                          fontWeight: FontWeight.w800,
                          fontSize: 12)),
                  const SizedBox(height: 6),
                  Text('learn_did_you_know_msg'.tr(),
                      style: TextStyle(
                          color: cs.onSurfaceVariant,
                          fontSize: 12,
                          height: 1.6)),
                ]),
          ),
        ]),
      ),
    );
  }
}
